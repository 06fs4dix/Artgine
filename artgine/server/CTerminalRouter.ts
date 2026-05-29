import { spawn, spawnSync } from 'child_process';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { CServerMain, URLPatterns } from '../network/CServerMain.js';
import { CConsol } from '../basic/CConsol.js';
import { CFile } from '../system/CFile.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer, getToken, isValidToken } from './CAuthServer.js';
import { CAI } from '../util/CAI.js';

/*
claude :
git bash를 설치되어 있어야한다.
브라우져 인증(구독제) or api(종량제)넣어야함

ANTHROPIC_API_KEY
https://platform.claude.com/dashboard

gemini :
환경변수에 api를 넣으면 됌(종량제)
https://aistudio.google.com
GEMINI_API_KEY
*/

const IS_WIN = process.platform === 'win32';
let currentCwd = process.cwd();

// const DEBUG_LOG = path.resolve(process.cwd(), 'ttyd_debug.log');
// fs.writeFileSync(DEBUG_LOG, `=== ttyd debug log started ${new Date().toISOString()} ===\n`, 'utf8');
function dbg(_msg: string) { /* disabled */ }


// ttyd 바이너리 정보 및 다운로드 경로 설정
const TTYD_VERSION = "1.7.7";
const BIN_DIR = path.resolve(process.cwd(), 'artgine', 'external', 'bin');

function getTtydFileName() {
    if (IS_WIN) return 'ttyd.win32.exe';
    if (process.platform === 'darwin') return 'ttyd.macos';
    if (process.arch === 'arm64') return 'ttyd.aarch64';
    return 'ttyd.x86_64';
}

async function ensureTtydPath(): Promise<string | null> {
    const fileName = getTtydFileName();
    const fullPath = path.join(BIN_DIR, fileName);

    if (fs.existsSync(fullPath)) {
        return fullPath;
    }

    await CFile.FolderCreate(BIN_DIR);

    const downloadUrl = `https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/${fileName}`;
    console.log(`[TTYD] Downloading binary from: ${downloadUrl}`);

    const data = await CFile.Load(downloadUrl);

    if (data) {
        await CFile.Save(data, fullPath);
        if (process.platform !== 'win32') {
            fs.chmodSync(fullPath, 0o755);
        }
        console.log(`[TTYD] Download and save complete: ${fullPath}`);
        return fullPath;
    }

    return null;
}



// 포트 회전: 7681 ~ 7689 순환
const PORT_MIN = 7681;
const PORT_MAX = 7689;
// 포트는 startTtyd에서 빈 슬롯을 탐색하므로 gNextPort 불필요;
const MAX_BUFFER_SIZE = 2 * 1024 * 1024; // 2MB max buffer per session

function cleanPolicyFile(policyPath: string | undefined) {
    if (!policyPath) return;
    const files = policyPath.split(';');
    for (const f of files) {
        if (!f) continue;
        try { fs.unlinkSync(f); } catch {}
    }
}


type TtydEntry = {
    proc: ReturnType<typeof spawn>;
    mode: 'cmd' | CAI.eProvider;
    serverWs: WebSocket | null;     // persistent server→ttyd connection
    clients: Set<WebSocket>;        // connected browser clients (write access)
    readOnlyClients: Set<WebSocket>; // connected browser clients (read-only)
    buffer: Buffer[];               // output history
    bufferSize: number;
    lastActivity: number;
    lastLine: string;
    lastContent: string;
    lineChanged: boolean;
    createdAt: number;
    label?: string;
    workingDir?: string;
    policyFile?: string;            // gemini: temp policy toml path (cleaned up on kill)
    tempMd?: string;                // mdcopy: temp MD file copied from root (cleaned up on kill)
};
const gPortProcs = new Map<number, TtydEntry>();

function isCodexYesNoPrompt(entry: TtydEntry, content: string): boolean {
    if (entry.mode !== CAI.eProvider.codex) return false;
    const compact = content.replace(/\s+/g, ' ').toLowerCase();
    return /\b(?:yes|y)\b.{0,80}\b(?:no|n)\b/.test(compact)
        || /\b(?:no|n)\b.{0,80}\b(?:yes|y)\b/.test(compact)
        || /(?:\(|\[)?\s*y\s*\/\s*n\s*(?:\)|\])?/.test(compact)
        || /(?:\(|\[)?\s*n\s*\/\s*y\s*(?:\)|\])?/.test(compact);
}

function killOnPort(port: number) {
    const entry = gPortProcs.get(port);
    if (!entry) return;
    console.log(`[TTYD] Killing process on port ${port} (mode: ${entry.mode}, pid: ${entry.proc.pid})`);
    // Close persistent server WS
    if (entry.serverWs) {
        try { entry.serverWs.close(); } catch {}
        entry.serverWs = null;
    }
    // Close all client WS connections
    for (const client of entry.clients) {
        try { client.close(); } catch {}
    }
    entry.clients.clear();
    for (const client of entry.readOnlyClients) {
        try { client.close(); } catch {}
    }
    entry.readOnlyClients.clear();
    entry.buffer = [];
    entry.bufferSize = 0;
    // Kill the ttyd process (synchronous to ensure child tree is dead before returning)
    entry.proc.removeAllListeners('exit');
    try {
        if (IS_WIN) {
            spawnSync('taskkill', ['/F', '/T', '/PID', entry.proc.pid!.toString()], { windowsHide: true });
        } else {
            entry.proc.kill('SIGKILL');
        }
    } catch (e) {
        console.error('[TTYD] Error killing process:', e);
    }
    cleanPolicyFile(entry.policyFile);
    if (entry.tempMd)    { CAI.DeleteRole(entry.mode as CAI.eProvider, path.dirname(entry.tempMd)); }
    gPortProcs.delete(port);
}

async function startTtyd(mode: 'cmd' | CAI.eProvider, cwd?: string, allow?: string, mcp = true, mdcopy = false, label?: string): Promise<number | null> {
    // 빈 포트 슬롯 탐색 (PORT_MIN~PORT_MAX 중 사용 중이지 않은 첫 번째 포트)
    let port: number | null = null;
    for (let p = PORT_MIN; p <= PORT_MAX; p++) {
        if (!gPortProcs.has(p)) { port = p; break; }
    }
    if (port === null) return null;

    const ttydPath = await ensureTtydPath();
    if (!ttydPath) {
        console.error('[TTYD] Failed to ensure ttyd executable.');
        return null;
    }

    let args: string[] = [];
    const shellCmd = IS_WIN ? 'cmd.exe' : '/bin/sh';
    const shellArg = IS_WIN ? '/k' : '-c';

    const resolvedCwd = cwd ? path.resolve(currentCwd, cwd) : '';
    const existsCheck = resolvedCwd ? fs.existsSync(resolvedCwd) : false;
    console.log('[TTYD] cwd param:', cwd, '/ resolvedCwd:', resolvedCwd, '/ exists:', existsCheck);
    const spawnCwd = (resolvedCwd && existsCheck) ? resolvedCwd : currentCwd;

    const resolvedAllowDir = allow === '1' ? spawnCwd : '';

    let policyFile: string | undefined;

    let tempMd: string | undefined;
    if (mdcopy && mode !== 'cmd' && spawnCwd !== currentCwd) {
        const copied = CAI.CreateRole(mode as CAI.eProvider, spawnCwd);
        if (typeof copied === 'string') { tempMd = copied; console.log(`[TTYD] Copied MD to ${copied}`); }
    }

    if (mode !== 'cmd') {
        const built = await CAI.Terminal(mode, mcp, resolvedAllowDir, port);
        policyFile = built.policyFile;
        // Windows allow 케이스: ttyd가 shell을 통해 policy 파일을 실행
        if (IS_WIN && resolvedAllowDir && mode === CAI.eProvider.claude) {
            args = ['-p', String(port), '-i', '127.0.0.1', '--writable', '-t', 'scrollback=20000', shellCmd, shellArg, ...built.args];
        } else if (IS_WIN && mode !== CAI.eProvider.codex) {
            args = ['-p', String(port), '-i', '127.0.0.1', '--writable', '-t', 'scrollback=20000', shellCmd, shellArg, ...built.args];
        } else {
            args = ['-p', String(port), '-i', '127.0.0.1', '--writable', '-t', 'scrollback=20000', ...built.args];
        }
    } else {
        args = ['-p', String(port), '-i', '127.0.0.1', '--writable', '-t', 'scrollback=20000', shellCmd];
    }

    const spawnEnv: NodeJS.ProcessEnv = { ...process.env };
    delete spawnEnv.NODE_OPTIONS;
    const ttyd = spawn(ttydPath, args, { detached: false, stdio: 'ignore', cwd: spawnCwd, env: spawnEnv });

    ttyd.on('error', (e) => console.error('[TTYD ERROR]', e));
    ttyd.on('exit', (code) => {
        console.log(`ttyd(${mode}, port: ${port}, pid: ${ttyd.pid}) exited with code`, code);
        const cur = gPortProcs.get(port!);
        if (cur && cur.proc === ttyd) {
            if (cur.serverWs) { try { cur.serverWs.close(); } catch {} }
            for (const client of cur.clients) { try { client.close(); } catch {} }
            cur.clients.clear();
            for (const client of cur.readOnlyClients) { try { client.close(); } catch {} }
            cur.readOnlyClients.clear();
            cleanPolicyFile(cur.policyFile);
            if (cur.tempMd)    { CAI.DeleteRole(cur.mode as CAI.eProvider, path.dirname(cur.tempMd)); }
            gPortProcs.delete(port!);
        }
    });

    const now = Date.now();
    const entry: TtydEntry = {
        proc: ttyd, mode,
        serverWs: null,
        clients: new Set(),
        readOnlyClients: new Set(),
        buffer: [],
        bufferSize: 0,
        lastActivity: now,
        lastLine: '',
        lastContent: '',
        lineChanged: false,
        createdAt: now,
        workingDir: spawnCwd,
    };
    if (label)      entry.label     = label;
    if (policyFile) entry.policyFile = policyFile;
    if (tempMd)    entry.tempMd    = tempMd;
    gPortProcs.set(port, entry);
    console.log(`[TTYD] started (${mode}) on port ${port} using ${ttydPath}`);

    connectToTtyd(port);

    return port;
}

function connectToTtyd(port: number, retries = 20): void {
    const entry = gPortProcs.get(port);
    if (!entry) return;

    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, ['tty']);
    ws.binaryType = 'nodebuffer';

    ws.on('open', () => {
        console.log(`[TTYD] Server WS connected to ttyd on port ${port}`);
        entry.serverWs = ws;
    });

    ws.on('message', (data: Buffer) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any);

        // Buffer the message
        entry.buffer.push(buf);
        entry.bufferSize += buf.length;

        // Track last activity and last line (output messages: first byte 0x30 = '0')
        if (buf.length > 1 && buf[0] === 0x30) {
            entry.lastActivity = Date.now();
            const text = buf.slice(1).toString('utf8');
            const stripped = text
                .replace(/\x1b\[[?!>]?[0-9;]*[a-zA-Z]/g, '')   // CSI (incl. DEC private: ESC[?...h/l)
                .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '') // OSC
                .replace(/\x1b./g, '');                             // other 2-char ESC sequences
            const lines = stripped.split('\n').filter(l => l.trim());
            if (lines.length > 0) {
                const newContent = lines.map(l => l.trim()).join('\n').substring(0, 500);
                entry.lastLine = lines[lines.length - 1].trim().substring(0, 200);
                if (newContent !== entry.lastContent) {
                    dbg(`[${port}] content changed`);
                    entry.lastContent = newContent;
                    if (!isCodexYesNoPrompt(entry, newContent)) {
                        entry.lineChanged = true;
                    }
                } else {
                    dbg(`[${port}] content same`);
                }
            } else {
                dbg(`[${port}] ANSI-only, raw len=${buf.length}`);
            }
        }

        // Trim buffer if too large (keep removing oldest)
        while (entry.bufferSize > MAX_BUFFER_SIZE && entry.buffer.length > 1) {
            const removed = entry.buffer.shift()!;
            entry.bufferSize -= removed.length;
        }

        // Forward to all connected browser clients
        for (const client of [...entry.clients, ...entry.readOnlyClients]) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(buf);
            }
        }
    });

    ws.on('error', () => {
        if (retries > 0) {
            setTimeout(() => connectToTtyd(port, retries - 1), 500);
        } else {
            console.error(`[TTYD] Failed to connect server WS to ttyd on port ${port} after retries`);
        }
    });

    ws.on('close', () => {
        console.log(`[TTYD] Server WS disconnected from ttyd on port ${port}`);
        if (entry.serverWs === ws) {
            entry.serverWs = null;
        }
    });
}

const _termSvrDir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')));
const _cmdHtmlPath = path.resolve(process.cwd(), 'proj', 'Home', 'AI', 'Terminal.html');

const _termUiHtmlPath = path.join(_termSvrDir, 'terminal_ui.html');

function _loadSkills(): { name: string; content: string }[] {
    const skillDir = path.resolve(process.cwd(), 'ai', 'skill');
    if (!fs.existsSync(skillDir)) return [];
    return fs.readdirSync(skillDir)
        .filter(f => f.endsWith('.md'))
        .map(f => ({
            name: path.basename(f, '.md'),
            content: fs.readFileSync(path.join(skillDir, f), 'utf8'),
        }));
}

function buildTerminalUiInject(ttydMode: TtydEntry['mode']) {
    const modeStr = ttydMode === 'cmd' ? 'cmd' : ttydMode;
    const skills = _loadSkills();
    const terminalUi = fs.readFileSync(_termUiHtmlPath, 'utf8');
    return `<script>window.__TTYD_MODE=${JSON.stringify(modeStr)};window.__SKILLS__=${JSON.stringify(skills)};</script>\n` + terminalUi;
}

@URLPatterns(["/cmd", "/cmd/start-ttyd", "/cmd/sessions", "/cmd/kill-session", "/cmd/terminal-proxy", "/cmd/terminal-proxy/token"])
export class CTerminalRouter extends CAuthServer {
    constructor() {
        super();

        this.On("/cmd", async (_json: CJSON, _req: Request, _res: Response) => {
            _res.setHeader('Content-Type', 'text/html; charset=utf-8');
            _res.setHeader('Cache-Control', 'no-cache');
            let html = fs.readFileSync(_cmdHtmlPath, 'utf8');
            const jsPath = _cmdHtmlPath.replace(/\.html$/, '.js');
            if (fs.existsSync(jsPath)) {
                const js = fs.readFileSync(jsPath, 'utf8');
                html = html.replace(/<script type="module" src="\.\/Terminal\.js"><\/script>/, `<script type="module">\n${js}\n</script>`);
            }
            _res.send(html);
            return null;
        });

        this.On("/cmd/start-ttyd", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!isValidToken(getToken(_req))) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }
            const modeStr = (_req.query.mode as string) || 'cmd';
            const modeMap: Record<string, 'cmd' | CAI.eProvider> = {
                cmd:          'cmd',
                claude:       CAI.eProvider.claude,
                gemini:       CAI.eProvider.gemini,
                codex:        CAI.eProvider.codex,
                antigravity:  CAI.eProvider.antigravity,
            };
            if (!(modeStr in modeMap)) { _res.json({ ok: false, msg: 'Invalid mode' }); return null; }
            const mode = modeMap[modeStr];
            const cwd = (_req.query.workingDir || _req.query.cwd) as string | undefined;
            const allow = _req.query.allow as string | undefined;
            const mcp = _req.query.mcp !== '0';
            const mdcopy = _req.query.mdcopy === '1';
            const label = (_req.query.label as string | undefined) || undefined;
            const port = await startTtyd(mode, cwd, allow, mcp, mdcopy, label);
            if (port === null) { _res.json({ ok: false, msg: `최대 세션 수에 도달했습니다 (최대 ${PORT_MAX - PORT_MIN + 1}개)` }); return null; }
            _res.json({ ok: true, port });
            return null;
        });

        this.On("/cmd/sessions", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!isValidToken(getToken(_req))) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }
            const sessions: any[] = [];
            for (const [port, entry] of gPortProcs) {
                const lineChanged = entry.lineChanged;
                entry.lineChanged = false;
                dbg(`[${port}] POLL → lineChanged=${lineChanged}, lastLine="${entry.lastLine}"`);
                sessions.push({
                    port, mode: entry.mode, label: entry.label, lastLine: entry.lastLine,
                    lastActivity: entry.lastActivity, createdAt: entry.createdAt,
                    alive: entry.serverWs !== null && entry.serverWs.readyState === WebSocket.OPEN,
                    lineChanged, workingDir: entry.workingDir,
                });
            }
            _res.json({ ok: true, sessions });
            return null;
        });

        this.On("/cmd/kill-session", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!isValidToken(getToken(_req))) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }
            const port = parseInt(_req.query.port as string);
            if (!port || !gPortProcs.has(port)) { _res.json({ ok: false, msg: 'Session not found' }); return null; }
            killOnPort(port);
            _res.json({ ok: true });
            return null;
        });

        this.On("/cmd/terminal-proxy/token", async (_json: CJSON, _req: Request, _res: Response) => {
            _res.json({ TokenKey: '' });
            return null;
        });

        this.On("/cmd/terminal-proxy", async (_json: CJSON, _req: Request, _res: Response) => {
            const port = parseInt(_req.query.port as string || '');
            if (!port || !gPortProcs.has(port)) { _res.status(404).end('<p>Terminal session not found.</p>'); return null; }
            const ttydMode = gPortProcs.get(port)?.mode ?? 'cmd';
            let retries = 10;
            return new Promise<null>((resolve) => {
                function attempt() {
                    const proxyReq = http.request(
                        { hostname: 'localhost', port, path: '/', method: 'GET',
                          headers: { 'Accept-Encoding': 'identity' } },
                        (proxyRes) => {
                            let body = '';
                            proxyRes.setEncoding('utf8');
                            proxyRes.on('data', (chunk: string) => { body += chunk; });
                            proxyRes.on('end', () => {
                                const inject = buildTerminalUiInject(ttydMode);
                                const patched = body.includes('</head>')
                                    ? body.replace('</head>', inject + '</head>')
                                    : inject + body;
                                _res.setHeader('Content-Type', 'text/html; charset=utf-8');
                                _res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                                _res.setHeader('Pragma', 'no-cache');
                                _res.setHeader('Expires', '0');
                                _res.end(patched);
                                resolve(null);
                            });
                        }
                    );
                    proxyReq.on('error', () => {
                        if (retries-- > 0) { setTimeout(attempt, 500); }
                        else { _res.status(503).send('<p>ttyd failed to start.</p>'); resolve(null); }
                    });
                    proxyReq.end();
                }
                attempt();
            });
        });
    }

    override Connect() {
        super.Connect();
        console.log(`[CTerminalRouter] Connect() initialized`);
        const mPath = this.mPath;

        // --- 시작 시 잔존 ttyd/자식 프로세스 정리 ---
        if (IS_WIN) {
            try {
                const result = spawnSync('netstat', ['-ano'], { encoding: 'utf8', windowsHide: true });
                if (result.stdout) {
                    const lines = result.stdout.split('\n');
                    for (let p = PORT_MIN; p <= PORT_MAX; p++) {
                        const re = new RegExp(`:${p}\\s+.*LISTENING\\s+(\\d+)`);
                        for (const line of lines) {
                            const m = line.match(re);
                            if (m && m[1] !== '0') {
                                spawnSync('taskkill', ['/F', '/T', '/PID', m[1]], { windowsHide: true });
                                console.log(`[CTerminalRouter] Startup cleanup: killed orphan on port ${p} (pid: ${m[1]})`);
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('[CTerminalRouter] Startup cleanup failed:', e);
            }
        } else {
            for (let p = PORT_MIN; p <= PORT_MAX; p++) {
                try { spawnSync('fuser', ['-k', `${p}/tcp`], { windowsHide: true }); } catch {}
            }
        }

        // --- WebSocket 프록시 (ws 기반, 히스토리 재생 지원) ---
        const server = CServerMain.Main().GetServer();
        if (server) {
            const wss = new WebSocketServer({
                noServer: true,
                handleProtocols: (protocols: Set<string>) => {
                    return protocols.has('tty') ? 'tty' : false;
                }
            });

            server.on('upgrade', (req: any, socket: any, head: Buffer) => {
                const urlObj = new URL(req.url!, 'http://localhost');
                if (urlObj.pathname !== mPath + '/cmd/ttyd-ws') return;

                const portParam = parseInt(urlObj.searchParams.get('port') || '');
                const authToken = urlObj.searchParams.get('auth') || '';
                const readOnly = !isValidToken(authToken);

                if (!portParam || !gPortProcs.has(portParam)) {
                    socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
                    socket.destroy();
                    return;
                }
                const port = portParam;

                // serverWs가 아직 연결 중일 수 있으므로 최대 5초 대기
                const waitForReady = (attempts: number) => {
                    const entry = gPortProcs.get(port!);
                    if (!entry) {
                        socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
                        socket.destroy();
                        return;
                    }
                    if (entry.serverWs && entry.serverWs.readyState === WebSocket.OPEN) {
                        doUpgrade(entry);
                    } else if (attempts > 0) {
                        setTimeout(() => waitForReady(attempts - 1), 200);
                    } else {
                        socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
                        socket.destroy();
                    }
                };

                const doUpgrade = (entry: TtydEntry) => {
                wss.handleUpgrade(req, socket, head, (clientWs) => {
                    for (const msg of entry.buffer) {
                        if (clientWs.readyState === WebSocket.OPEN) clientWs.send(msg);
                    }
                    if (readOnly) {
                        entry.readOnlyClients.add(clientWs);
                        clientWs.on('message', () => {});
                        clientWs.on('close', () => { entry.readOnlyClients.delete(clientWs); });
                        clientWs.on('error', () => { entry.readOnlyClients.delete(clientWs); });
                    } else {
                        entry.clients.add(clientWs);
                        clientWs.on('message', (data) => {
                            if (entry.serverWs && entry.serverWs.readyState === WebSocket.OPEN)
                                entry.serverWs.send(data as Buffer);
                        });
                        clientWs.on('close', () => { entry.clients.delete(clientWs); });
                        clientWs.on('error', () => { entry.clients.delete(clientWs); });
                    }
                });
                };

                waitForReady(25);
            });
        }

        // --- 프로세스 정리 ---
        const killTtyd = () => { for (const port of [...gPortProcs.keys()]) killOnPort(port); };
        process.on('exit', killTtyd);
        process.on('SIGINT', () => { killTtyd(); process.exit(0); });
        process.on('SIGTERM', () => { killTtyd(); process.exit(0); });
    }
}

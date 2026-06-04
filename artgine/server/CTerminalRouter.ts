import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
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
import { CSchedule } from '../util/CSchedule.js';
import { CPath } from '../basic/CPath.js';

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
let currentCwd = CPath.WorkingPath();

const SCHEDULES_FILE = path.join(CAI.AIDir(), 'schedules.json');
function schedLog(msg: string) {
    process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`);
}
let gScheduleLoading = false;

function gScheduleSave() {
    if (gScheduleLoading) return;
    try {
        const data = Array.from(gSchedules.values()).map(e => ({
            name: e.name, terminalKey: e.terminalKey,
            mode: e.mode === null ? 'none' : e.mode === 'cmd' ? 'cmd' : String(e.mode),
            delay: e.delay, count: e.count, start: e.start, end: e.end,
            command: e.command,
            cwd: e.cwd, allow: e.allow, mcp: e.mcp, mdcopy: e.mdcopy,
        }));
        fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) { console.error('[Schedule] save error:', err); }
}

function gScheduleLoad() {
    try {
        if (!fs.existsSync(SCHEDULES_FILE)) return;
        const data = JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf8'));
        if (!Array.isArray(data)) return;
        gScheduleLoading = true;
        for (const item of data) gScheduleSet(item);
        gScheduleLoading = false;
        console.log(`[Schedule] loaded ${data.length} schedule(s) from file`);
    } catch (err) { gScheduleLoading = false; console.error('[Schedule] load error:', err); }
}

// const DEBUG_LOG = path.resolve(process.cwd(), 'ttyd_debug.log');
// fs.writeFileSync(DEBUG_LOG, `=== ttyd debug log started ${new Date().toISOString()} ===\n`, 'utf8');
function dbg(_msg: string) { /* disabled */ }


// ttyd 바이너리 정보 및 다운로드 경로 설정
const TTYD_VERSION = "1.7.7";
const BIN_DIR = path.resolve(CPath.ArtgineRootPath(), 'artgine', 'external', 'bin');

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
    updatedAt: number;
    lastMsg: string;
    _inputBuf: string;
    lastContent: string;
    busy: boolean;
    _cmdSent: boolean;
    createdAt: number;
    key?: string;
    workingDir?: string;
    policyFile?: string;            // gemini: temp policy toml path (cleaned up on kill)
    tempMd?: string;                // mdcopy: temp MD file copied from root (cleaned up on kill)
};
const gPortProcs = new Map<number, TtydEntry>();

// ---- Scheduler ----
const SCHEDULE_MODE_MAP: Record<string, 'cmd' | CAI.eProvider | null> = {
    none: null, cmd: 'cmd', claude: CAI.eProvider.claude, gemini: CAI.eProvider.gemini,
    codex: CAI.eProvider.codex, antigravity: CAI.eProvider.antigravity,
};

type ScheduleEntry = {
    name: string;
    terminalKey: string;
    mode: 'cmd' | CAI.eProvider | null;
    delay: number;
    count: number;
    start: number;
    end: number;
    command: string;
    cwd: string;
    allow: boolean;
    mcp: boolean;
    mdcopy: boolean;
    cschedule: CSchedule;
};
const gSchedules = new Map<string, ScheduleEntry>();

async function _schedTick(e: ScheduleEntry) {
    schedLog(`TICK name=${e.name} key=${e.terminalKey}`);
    let target: TtydEntry | null = null;
    for (const t of gPortProcs.values()) {
        if (t.key === e.terminalKey) { target = t; break; }
    }
    if (!target) {
        schedLog(`  → no terminal found, mode=${e.mode === null ? 'none' : e.mode}`);
        if (e.mode === null) return;
        await startTtyd(e.mode, e.cwd || undefined, e.allow ? '1' : undefined, e.mcp, e.mdcopy, e.terminalKey);
        schedLog(`  → startTtyd called`);
        return;
    }
    const wsState = target.serverWs ? target.serverWs.readyState : -1;
    const idle = Date.now() - target.updatedAt;
    schedLog(`  → terminal found wsState=${wsState}(OPEN=1) idleMs=${idle}`);
    if (!target.serverWs || target.serverWs.readyState !== WebSocket.OPEN) {
        schedLog(`  → SKIP: ws not open`);
        return;
    }
    if (idle < 2000) {
        schedLog(`  → SKIP: idle too short (${idle}ms < 2000ms)`);
        return;
    }
    // \x1b[I = Focus In — codex TUI가 입력 모드로 전환하는 데 ~500ms 필요
    // (브라우저 실측: focus-in 후 1.5s 뒤에 타이핑 시작)
    target.serverWs.send('0\x1b[I');
    await new Promise(r => setTimeout(r, 500));
    if (target.serverWs.readyState !== WebSocket.OPEN) return;
    target.serverWs.send('0' + e.command);
    await new Promise(r => setTimeout(r, 200));
    if (target.serverWs.readyState !== WebSocket.OPEN) return;
    target.serverWs.send('0\r');
    schedLog(`  → SENT focus+cmd+enter key=${e.terminalKey}`);

    // 전송 후 2초간 raw 출력 캡처
    const capture: string[] = [];
    const captureMsg = (data: Buffer | string) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        if (buf.length > 1 && buf[0] === 0x30) {
            const raw = buf.slice(1).toString('utf8');
            const stripped = raw.replace(/\x1b\[[^a-zA-Z]*[a-zA-Z]/g,'').replace(/\x1b./g,'').replace(/\r/g,'').trim();
            if (stripped) capture.push(stripped);
        }
    };
    target.serverWs.on('message', captureMsg);
    await new Promise(r => setTimeout(r, 2000));
    target.serverWs.removeListener('message', captureMsg);
    schedLog(`  → 2s output (${capture.length} lines): ${JSON.stringify(capture.join(' | ').slice(0, 500))}`);
}

function gScheduleSet(data: { name: string; terminalKey: string; mode: string; delay: number; count: number; start: number; end: number; command: string; cwd?: string; allow?: boolean; mcp?: boolean; mdcopy?: boolean }) {
    gSchedules.delete(data.name);
    const cs = new CSchedule();
    cs.mDelay = data.delay;
    cs.mCount = data.count;
    cs.mStart = data.start;
    cs.mEnd = data.end;
    const entry: ScheduleEntry = {
        name: data.name, terminalKey: data.terminalKey,
        mode: data.mode in SCHEDULE_MODE_MAP ? SCHEDULE_MODE_MAP[data.mode] : 'cmd',
        delay: data.delay, count: data.count, start: data.start, end: data.end,
        command: data.command,
        cwd: data.cwd ?? '', allow: data.allow ?? false, mcp: data.mcp ?? true, mdcopy: data.mdcopy ?? false,
        cschedule: cs,
    };
    gSchedules.set(data.name, entry);
    gScheduleSave();
}

function gScheduleDel(name: string): boolean {
    const result = gSchedules.delete(name);
    if (result) gScheduleSave();
    return result;
}

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

async function startTtyd(mode: 'cmd' | CAI.eProvider, cwd?: string, allow?: string, mcp = true, mdcopy = false, key?: string): Promise<number | null> {
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
        if (IS_WIN) {
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
        updatedAt: now,
        lastMsg: '',
        _inputBuf: '',
        lastContent: '',
        busy: false,
        _cmdSent: false,
        createdAt: now,
        workingDir: spawnCwd,
    };
    if (key)        entry.key       = key;
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
        // ttyd는 JSON_DATA init 메시지('{'로 시작)를 받아야 셸 프로세스를 spawn한다.
        // 브라우저 없이 생성되는 스케줄러 터미널은 여기서 직접 init을 보내 셸을 띄운다.
        // (브라우저가 나중에 접속해 보내는 init은 process!=null 이라 ttyd가 무시함)
        ws.send(Buffer.from(JSON.stringify({ AuthToken: '', columns: 220, rows: 50 })));
        // 초기 윈도우 사이즈 보정 (RESIZE_TERMINAL = '1')
        ws.send(Buffer.concat([Buffer.from('1'), Buffer.from(JSON.stringify({ columns: 220, rows: 50 }))]));
    });

    ws.on('message', (data: Buffer) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any);

        // Buffer the message
        entry.buffer.push(buf);
        entry.bufferSize += buf.length;

        // Track last activity and last line (output messages: first byte 0x30 = '0')
        if (buf.length > 1 && buf[0] === 0x30) {
            entry.updatedAt = Date.now();
            const text = buf.slice(1).toString('utf8');
            const stripped = text
                .replace(/\x1b\[[?!>]?[0-9;]*[a-zA-Z]/g, '')   // CSI (incl. DEC private: ESC[?...h/l)
                .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '') // OSC
                .replace(/\x1b./g, '');                             // other 2-char ESC sequences
            const lines = stripped.split('\n').filter(l => l.trim());
            if (lines.length > 0) {
                const newContent = lines.map(l => l.trim()).join('\n').substring(0, 500);
                if (newContent !== entry.lastContent) {
                    dbg(`[${port}] content changed`);
                    entry.lastContent = newContent;
                    if (entry._cmdSent && !isCodexYesNoPrompt(entry, newContent)) {
                        entry.busy = true;
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

const _termSvrDir = path.dirname(fileURLToPath(import.meta.url));
const _cmdHtmlPath = path.resolve(CPath.ArtgineRootPath(), 'proj', 'Home', 'AI', 'Terminal.html');

const _termUiHtmlPath = path.join(_termSvrDir, 'terminal_ui.html');

function _loadSkills(): { name: string; content: string }[] {
    const skillDir = path.join(CAI.AIDir(), 'skill');
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

@URLPatterns(["/cmd", "/cmd/start-ttyd", "/cmd/sessions", "/cmd/kill-session", "/cmd/terminal-proxy", "/cmd/terminal-proxy/token", "/cmd/schedules", "/cmd/schedule-set", "/cmd/schedule-del"])
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
            const key = (_req.query.key as string | undefined) || undefined;
            if (key) {
                for (const entry of gPortProcs.values()) {
                    if (entry.key === key) {
                        _res.json({ ok: false, msg: `키 '${key}'는 이미 사용 중입니다.` });
                        return null;
                    }
                }
            }
            const port = await startTtyd(mode, cwd, allow, mcp, mdcopy, key);
            if (port === null) { _res.json({ ok: false, msg: `최대 세션 수에 도달했습니다 (최대 ${PORT_MAX - PORT_MIN + 1}개)` }); return null; }
            _res.json({ ok: true, port });
            return null;
        });

        this.On("/cmd/schedules", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!isValidToken(getToken(_req))) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }
            _res.json({ ok: true, schedules: Array.from(gSchedules.values()).map(e => ({
                name: e.name, terminalKey: e.terminalKey,
                mode: e.mode === null ? 'none' : e.mode === 'cmd' ? 'cmd' : String(e.mode),
                delay: e.delay, count: e.count, start: e.start, end: e.end,
                command: e.command,
                cwd: e.cwd, allow: e.allow, mcp: e.mcp, mdcopy: e.mdcopy,
            }))});
            return null;
        });

        this.On("/cmd/schedule-set", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!isValidToken(getToken(_req))) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }
            const name        = _req.query.name as string;
            const terminalKey = _req.query.terminalKey as string;
            const mode        = (_req.query.mode as string) || 'cmd';
            const command     = (_req.query.command as string) || '';
            const delay = Math.max(0, parseInt(_req.query.delay as string) || 0);
            const count = Math.max(0, parseInt(_req.query.count as string) || 0);
            const start = Math.max(0, parseInt(_req.query.start as string) || 0);
            const end   = Math.max(0, parseInt(_req.query.end   as string) || 0);
            const cwd    = (_req.query.cwd as string) || '';
            const allow  = _req.query.allow === '1';
            const mcp    = _req.query.mcp !== '0';
            const mdcopy = _req.query.mdcopy === '1';
            if (!name || !terminalKey || !command) { _res.json({ ok: false, msg: '필수 항목 누락 (name, terminalKey, command)' }); return null; }
            if (delay === 0) { _res.json({ ok: false, msg: '딜레이는 1초 이상이어야 합니다' }); return null; }
            gScheduleSet({ name, terminalKey, mode, delay, count, start, end, command, cwd, allow, mcp, mdcopy });
            _res.json({ ok: true });
            return null;
        });

        this.On("/cmd/schedule-del", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!isValidToken(getToken(_req))) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }
            const name = _req.query.name as string;
            if (!name) { _res.json({ ok: false, msg: 'name 필요' }); return null; }
            _res.json({ ok: gScheduleDel(name) });
            return null;
        });

        this.On("/cmd/sessions", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!isValidToken(getToken(_req))) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }
            const sessions: any[] = [];
            for (const [port, entry] of gPortProcs) {
                const busy = entry.busy;
                entry.busy = false;
                if (!busy && Date.now() - entry.updatedAt >= 10_000) entry._cmdSent = false;
                dbg(`[${port}] POLL → busy=${busy}, lastMsg="${entry.lastMsg}"`);
                sessions.push({
                    port, mode: entry.mode, key: entry.key, lastMsg: entry.lastMsg,
                    updatedAt: entry.updatedAt, createdAt: entry.createdAt,
                    alive: entry.serverWs !== null && entry.serverWs.readyState === WebSocket.OPEN,
                    busy, workingDir: entry.workingDir,
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

        gScheduleLoad();

        // CSchedule 기반 스케줄 폴링 루프 (500ms마다 체크)
        setInterval(() => {
            for (const e of gSchedules.values()) {
                if (e.cschedule.Execute(e)) {
                    _schedTick(e).catch(err => console.error('[Schedule] tick error:', err));
                }
            }
        }, 500);

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
                            const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
                            if (entry.serverWs && entry.serverWs.readyState === WebSocket.OPEN)
                                entry.serverWs.send(buf);
                            // 유저 입력(0x30 prefix) 누적 → Enter 시 lastMsg 확정
                            if (buf.length > 1 && buf[0] === 0x30) {
                                const raw = buf.slice(1).toString('utf8');
                                // 이스케이프 시퀀스 제거 (CSI, SS3, 기타 2바이트)
                                const text = raw
                                    .replace(/\x1b\[[0-9;]*[a-zA-Z~]/g, '')
                                    .replace(/\x1bO[a-zA-Z]/g, '')
                                    .replace(/\x1b./g, '');
                                for (const ch of text) {
                                    if (ch === '\r' || ch === '\n') {
                                        const cmd = entry._inputBuf.trim();
                                        if (cmd) { entry.lastMsg = cmd.substring(0, 200); entry._cmdSent = true; }
                                        entry._inputBuf = '';
                                    } else if (ch === '\x7f' || ch === '\x08') {
                                        entry._inputBuf = entry._inputBuf.slice(0, -1);
                                    } else if (ch >= ' ') {
                                        entry._inputBuf += ch;
                                    }
                                }
                            }
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

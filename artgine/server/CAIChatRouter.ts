import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { CServerMain, URLPatterns } from '../network/CServerMain.js';
import { GetAppJSON } from '../../desktop/MainFunc.js';
import { CJSON } from '../basic/CJSON.js';
import { CConsol } from '../basic/CConsol.js';
import { Request, Response } from 'express';
import { CAuthServer, getToken, isValidToken, checkWsToken } from './CAuthServer.js';
import { CAI } from '../util/CAI.js';

/*
AI Chat Router
- /ai/chat                            GET    AI.html serve
- /ai/chat/sessions                   GET    session list
- /ai/chat/sessions/:id               GET    history.json
- /ai/chat/sessions/:id               DELETE remove session + workspace
- /ai/chat/session/config?id=         GET    세션 config 조회
- /ai/chat/session/config?id=         POST   세션 config 저장 (workingDir, mcp, allow)
- /ai/chat/sessions/:id/upload?name=  POST   raw body -> uploads/<safe>
- /ai/chat/ws                         WS     streaming chat

Workspace layout:
  proj/Home/AI/workspace/<sessionId>/
    ├── uploads/
    └── history.json

CLI invocation:
  Claude first  : claude -p "<msg>" --model <model> --session-id <uuid>
  Claude resume : claude -p "<msg>" --resume <uuid> --model <model>
  Gemini        : gemini -p "<full-history-or-msg>" -m <model>  (stateless; we seed)
  Codex first   : codex exec -m <model>
  Codex resume  : codex exec resume --last -m <model>  (cwd-scoped session)
*/

let AI_ROOT = '';
let WORKSPACE_ROOT = '';
// === Workspace 위치 설정 ===
// 빈 문자열이면 기본 경로(<rootPath>/ai/workspace) 사용.
// 특정 디스크/폴더로 옮기려면 절대경로 지정 (예: 'D:\\AIWorkspace' 또는 'D:/AIWorkspace').
// 폴더가 없으면 자동 생성됨.
const WORKSPACE_ROOT_OVERRIDE = '';

let _pathsPromise: Promise<void> | null = null;
function ensurePaths(): Promise<void> {
    if (!_pathsPromise) {
        _pathsPromise = GetAppJSON().then(cfg => {
            AI_ROOT = path.join(path.resolve(cfg.rootPath ?? './'), 'ai');
            WORKSPACE_ROOT = WORKSPACE_ROOT_OVERRIDE
                ? path.resolve(WORKSPACE_ROOT_OVERRIDE)
                : path.join(AI_ROOT, 'workspace');
        });
    }
    return _pathsPromise;
}
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB



type Role = 'user' | 'assistant';
type Provider = CAI.eProvider;

// ---- supported models per provider (server is source of truth) ----
interface IModelDef { value: string; label: string; }
const MODELS: Record<Provider, IModelDef[]> = {
    [CAI.eProvider.claude]: [
        { value: 'claude-opus-4-7',    label: 'Opus 4.7' },
        { value: 'claude-sonnet-4-6',  label: 'Sonnet 4.6' },
        { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
    ],
    [CAI.eProvider.gemini]: [
        { value: 'gemini-2.0-flash',       label: '2.0 Flash' },
        { value: 'gemini-2.0-flash-lite-preview-02-05', label: '2.0 Flash Lite' },
        { value: 'gemini-2.0-pro-exp-02-05', label: '2.0 Pro (Experimental)' },
        { value: 'gemini-1.5-pro',         label: '1.5 Pro' },
        { value: 'gemini-1.5-flash',       label: '1.5 Flash' },
    ],
    [CAI.eProvider.codex]: [
        { value: 'gpt-5.5',      label: 'GPT-5.5' },
        { value: 'gpt-5.4',      label: 'GPT-5.4' },
        { value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
    ],
    [CAI.eProvider.manus]:        [],
    [CAI.eProvider.gpt]:          [],
    [CAI.eProvider.antigravity]:  [],
};

// ---- CLI availability/version probe (cached at Connect) ----
import type { IProviderInfo } from '../util/CAI.js';
const gProviderInfo: IProviderInfo[] = [];
async function probeAllProviders(): Promise<void> {
    gProviderInfo.length = 0;
    const providers = [CAI.eProvider.claude, CAI.eProvider.gemini, CAI.eProvider.codex, CAI.eProvider.antigravity];
    const results = await Promise.all(providers.map(p => CAI.ProviderInfo(p)));
    for (const info of results) {
        info.models = MODELS[info.id] || [];
        gProviderInfo.push(info);
        CConsol.Log(`[CAIChatRouter] ${info.id}: ${info.available ? info.version || 'OK' : 'NOT FOUND'}`,
            info.available ? CConsol.eColor.green : CConsol.eColor.red);
    }
}

interface IAttachment { name: string; path: string; }
interface IMessage {
    role: Role; content: string;
    provider?: Provider; model?: string;
    attachments?: IAttachment[]; timestamp: number;
    senderIp?: string; senderUa?: string;
}
interface ISessionMeta {
    sessionId: string; title: string;
    provider: Provider; model: string;
    cliSessionId?: string;
    createdAt: number; updatedAt: number;
}
interface IHistory { meta: ISessionMeta; messages: IMessage[]; }

function ensureDir(p: string) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function safeSessionId(id: string): string | null {
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) return null;
    return id;
}
function sessionDir(id: string): string | null {
    const sid = safeSessionId(id);
    return sid ? path.join(WORKSPACE_ROOT, sid) : null;
}
function historyPath(id: string): string | null {
    const dir = sessionDir(id);
    return dir ? path.join(dir, 'history.json') : null;
}
function loadHistory(id: string): IHistory | null {
    const p = historyPath(id);
    if (!p || !fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function saveHistory(h: IHistory) {
    const dir = sessionDir(h.meta.sessionId);
    if (!dir) return;
    ensureDir(dir);
    fs.writeFileSync(historyPath(h.meta.sessionId)!, JSON.stringify(h, null, 2), 'utf8');
}

// ---- Session config (workingDir, mcp, allow) ----
interface ISessionConfig {
    workingDir?: string;
    mcp?: boolean;
    allow?: boolean;
    tempMd?: string;
}
function configPath(id: string): string | null {
    const dir = sessionDir(id);
    return dir ? path.join(dir, 'config.json') : null;
}
function loadConfig(id: string): ISessionConfig {
    const p = configPath(id);
    if (!p || !fs.existsSync(p)) return {};
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}
function saveConfig(id: string, cfg: ISessionConfig) {
    const dir = sessionDir(id);
    if (!dir) return;
    ensureDir(dir);
    fs.writeFileSync(configPath(id)!, JSON.stringify(cfg, null, 2), 'utf8');
}
const _legacyProviderMap: Record<number, CAI.eProvider> = {
    0: CAI.eProvider.claude, 1: CAI.eProvider.gemini, 2: CAI.eProvider.codex,
    3: CAI.eProvider.manus,  4: CAI.eProvider.gpt,    5: CAI.eProvider.antigravity,
};
function normalizeHistory(h: IHistory): IHistory {
    const p = h.meta.provider as unknown;
    if (typeof p === 'number') h.meta.provider = _legacyProviderMap[p as number] ?? CAI.eProvider.claude;
    return h;
}
function listSessions(limit?: number): (ISessionMeta & { busy: boolean; lastMsg?: string; workingDir?: string })[] {
    if (!fs.existsSync(WORKSPACE_ROOT)) return [];
    const out: (ISessionMeta & { lastMsg?: string; workingDir?: string })[] = [];
    for (const name of fs.readdirSync(WORKSPACE_ROOT)) {
        if (!safeSessionId(name)) continue;
        const h = loadHistory(name);
        if (!h?.meta) continue;
        const normalized = normalizeHistory(h);
        const lastMsg = gLastUserMsg.get(name) ?? (() => {
            const last = [...normalized.messages].reverse().find(m => m.role === 'user');
            return last ? last.content.slice(0, 80).replace(/\n+/g, ' ') : undefined;
        })();
        const cfg = loadConfig(name);
        out.push({ ...normalized.meta, lastMsg, workingDir: cfg.workingDir });
    }
    out.sort((a, b) => b.updatedAt - a.updatedAt);
    const sliced = limit ? out.slice(0, limit) : out;
    return sliced.map(s => ({ ...s, busy: gRoomLock.get(s.sessionId) === true }));
}
function deleteSession(id: string): boolean {
    const dir = sessionDir(id);
    if (!dir || !fs.existsSync(dir)) return false;
    const cfg = loadConfig(id);
    if (cfg.tempMd && fs.existsSync(cfg.tempMd)) fs.unlinkSync(cfg.tempMd);
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
}
// snapshot all files under workspace dir (relative paths, mtime+size key),
// excluding history.json so AI-modified files can be diffed across a turn.
function snapshotWorkspace(dir: string): Map<string, string> {
    const out = new Map<string, string>();
    if (!fs.existsSync(dir)) return out;
    const walk = (cur: string, rel: string) => {
        let entries: fs.Dirent[];
        try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { return; }
        for (const e of entries) {
            const childRel = rel ? `${rel}/${e.name}` : e.name;
            const childAbs = path.join(cur, e.name);
            if (e.isDirectory()) {
                walk(childAbs, childRel);
            } else if (e.isFile()) {
                if (rel === '' && e.name === 'history.json') continue;
                try {
                    const st = fs.statSync(childAbs);
                    out.set(childRel, `${st.mtimeMs}|${st.size}`);
                } catch {}
            }
        }
    };
    walk(dir, '');
    return out;
}
function diffWorkspace(before: Map<string, string>, after: Map<string, string>): IAttachment[] {
    const changed: IAttachment[] = [];
    for (const [rel, key] of after) {
        if (before.get(rel) !== key) {
            changed.push({ name: path.basename(rel), path: rel });
        }
    }
    return changed;
}

function safeAttachmentName(name: string): string {
    const base = path.basename(name).replace(/[^A-Za-z0-9._-]/g, '_');
    return `${Date.now()}_${base}`;
}
function randomUuid(): string {
    const c = (n: number) => Math.floor(Math.random() * n);
    const hex = (n: number) => c(16).toString(16);
    let s = '';
    for (let i = 0; i < 32; i++) s += hex(0);
    return `${s.slice(0,8)}-${s.slice(8,12)}-4${s.slice(13,16)}-${(8+c(4)).toString(16)}${s.slice(17,20)}-${s.slice(20,32)}`;
}

// ---- message serialization for seeding / Gemini stateless ----
function attachmentBlock(sid: string, atts: IAttachment[]): string {
    if (!atts || !atts.length) return '';
    const dir = sessionDir(sid);
    const lines: string[] = ['', '[첨부 파일 — 반드시 Read 도구로 읽어서 내용을 확인하세요]'];
    for (const a of atts) {
        const abs = dir ? path.resolve(dir, a.path) : a.path;
        lines.push(`- 절대경로: ${abs}  (원본 파일명: ${a.name})`);
    }
    lines.push('위 파일들의 절대경로를 그대로 Read 도구의 file_path 인자로 전달해서 읽으세요. 이미지면 비전으로 분석하세요.');
    return lines.join('\n');
}

function serializeHistoryForPrompt(sid: string, h: IHistory, newUserMsg: IMessage): string {
    const lines: string[] = [];
    lines.push('이전 대화 기록입니다. 이어서 답변해주세요.\n');
    for (const m of h.messages) {
        const role = m.role === 'user' ? 'User' : 'Assistant';
        lines.push(`### ${role}`);
        lines.push(m.content);
        if (m.attachments?.length) lines.push(attachmentBlock(sid, m.attachments));
        lines.push('');
    }
    lines.push('### User (현재 질문)');
    lines.push(newUserMsg.content);
    if (newUserMsg.attachments?.length) lines.push(attachmentBlock(sid, newUserMsg.attachments));
    return lines.join('\n');
}

function buildUserPromptOneShot(sid: string, msg: IMessage): string {
    const parts = [msg.content];
    if (msg.attachments?.length) parts.push(attachmentBlock(sid, msg.attachments));
    return parts.join('\n');
}


// ---- Room management ----
const gRooms = new Map<string, Set<WebSocket>>();  // sessionId → 연결된 클라이언트들
const gRoomLock = new Map<string, boolean>();       // sessionId → 전송 중 여부
const gLastUserMsg = new Map<string, string>();     // sessionId → 마지막 유저 메시지

function broadcastToRoom(sid: string, msg: object) {
    const room = gRooms.get(sid);
    if (!room) return;
    const data = JSON.stringify(msg);
    for (const client of room) {
        if (client.readyState === WebSocket.OPEN) client.send(data);
    }
}
function joinRoom(sid: string, ws: WebSocket) {
    if (!gRooms.has(sid)) gRooms.set(sid, new Set());
    gRooms.get(sid)!.add(ws);
}
function leaveRoom(sid: string, ws: WebSocket) {
    const room = gRooms.get(sid);
    if (!room) return;
    room.delete(ws);
    if (room.size === 0) { gRooms.delete(sid); gRoomLock.delete(sid); }
}

// ---- WS handling ----
interface IWsSendMsg {
    type: 'send';
    provider: Provider;
    model: string;
    content: string;
    attachments?: IAttachment[];
    title?: string;
    ua?: string;
    mcp?: boolean;
    workingDir?: string;
    mdcopy?: boolean;
}
interface IWsJoinMsg { type: 'join'; sessionId: string; ua?: string; }
type IWsClientMsg = IWsSendMsg | IWsJoinMsg;

interface IWsCtx { ip: string; }

async function handleSend(sid: string, msg: IWsSendMsg, ctx: IWsCtx) {
    const dir = sessionDir(sid)!;
    ensureDir(dir);
    ensureDir(path.join(dir, 'uploads'));
    const cfgFile = configPath(sid)!;
    const cfg = loadConfig(sid);
    // config 파일이 없으면 첫 메시지에서 생성
    if (!fs.existsSync(cfgFile)) {
        const newCfg: ISessionConfig = {};
        if (msg.workingDir) newCfg.workingDir = msg.workingDir;
        if (typeof msg.mcp === 'boolean') newCfg.mcp = msg.mcp;
        if (msg.mdcopy && msg.workingDir) {
            const copied = CAI.CreateRole(msg.provider as CAI.eProvider, msg.workingDir);
            if (typeof copied === 'string') { newCfg.tempMd = copied; CConsol.Log(`[AIChat] Copied MD to ${copied}`); }
        }
        saveConfig(sid, newCfg);
        if (msg.workingDir) cfg.workingDir = msg.workingDir;
    }
    const resolvedCwd = cfg.workingDir || msg.workingDir;
    const cwd = (resolvedCwd && fs.existsSync(resolvedCwd)) ? resolvedCwd : dir;

    let history = loadHistory(sid);
    const now = Date.now();
    const isNewSession = !history;
    const providerChanged = history && history.meta.provider !== msg.provider;
    const modelChanged = history && history.meta.model !== msg.model;
    const needNewCliSession = isNewSession || providerChanged || modelChanged;

    if (!history) {
        history = {
            meta: {
                sessionId: sid,
                title: (msg.title || msg.content.slice(0, 30) || 'New chat'),
                provider: msg.provider, model: msg.model,
                createdAt: now, updatedAt: now,
            },
            messages: [],
        };
    }

    const userMsg: IMessage = {
        role: 'user', content: msg.content,
        provider: msg.provider, model: msg.model,
        attachments: msg.attachments, timestamp: now,
        senderIp: ctx.ip || undefined,
        senderUa: (msg.ua || '').slice(0, 300) || undefined,
    };

    let prompt: string;
    let cliSessionId = history.meta.cliSessionId;
    let isFirstCall = false;
    if (msg.provider === CAI.eProvider.claude) {
        if (needNewCliSession) {
            cliSessionId = randomUuid();
            isFirstCall = true;
            prompt = history.messages.length > 0
                ? serializeHistoryForPrompt(sid, history, userMsg)
                : buildUserPromptOneShot(sid, userMsg);
        } else {
            prompt = buildUserPromptOneShot(sid, userMsg);
        }
    } else if (msg.provider === CAI.eProvider.gemini) {
        isFirstCall = needNewCliSession;
        if (needNewCliSession) {
            cliSessionId = undefined;
            prompt = history.messages.length > 0
                ? serializeHistoryForPrompt(sid, history, userMsg)
                : buildUserPromptOneShot(sid, userMsg);
        } else {
            prompt = buildUserPromptOneShot(sid, userMsg);
        }
    } else if (msg.provider === CAI.eProvider.antigravity) {
        isFirstCall = needNewCliSession;
        if (needNewCliSession) {
            cliSessionId = randomUuid();
            prompt = history.messages.length > 0
                ? serializeHistoryForPrompt(sid, history, userMsg)
                : buildUserPromptOneShot(sid, userMsg);
        } else {
            prompt = buildUserPromptOneShot(sid, userMsg);
        }
    } else {
        isFirstCall = needNewCliSession;
        prompt = history.messages.length > 0 && needNewCliSession
            ? serializeHistoryForPrompt(sid, history, userMsg)
            : buildUserPromptOneShot(sid, userMsg);
        cliSessionId = needNewCliSession ? randomUuid() : cliSessionId;
    }

    history.meta.provider = msg.provider;
    history.meta.model = msg.model;
    history.meta.cliSessionId = cliSessionId;
    history.meta.updatedAt = now;
    history.messages.push(userMsg);
    saveHistory(history);
    gLastUserMsg.set(sid, userMsg.content.slice(0, 80).replace(/\n+/g, ' '));

    // 룸 전체에 유저 메시지 + 시작 신호 broadcast
    broadcastToRoom(sid, { type: 'message', message: userMsg });
    broadcastToRoom(sid, { type: 'start', sessionId: sid });
    gRoomLock.set(sid, true);

    const snapBefore = snapshotWorkspace(dir);

    let child: ChildProcess;
    try {
        child = await CAI.Chat(msg.provider, msg.model, cwd, prompt, !!msg.mcp, cliSessionId, isFirstCall);
    } catch (e: any) {
        gRoomLock.delete(sid);
        broadcastToRoom(sid, { type: 'error', msg: `spawn failed: ${e.message}` });
        return;
    }

    let assistantBuf = '';
    let stderrBuf = '';
    let errored = false;

    child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        assistantBuf += text;
        broadcastToRoom(sid, { type: 'chunk', text });
    });
    child.stderr?.on('data', (data: Buffer) => {
        stderrBuf += data.toString('utf8');
    });
    child.on('error', (err) => {
        errored = true;
        broadcastToRoom(sid, { type: 'error', msg: `process error: ${err.message}` });
    });
    child.on('close', async (code) => {
        const finalText = assistantBuf.trim();
        const snapAfter = snapshotWorkspace(dir);
        const changedFiles = diffWorkspace(snapBefore, snapAfter);
        if (!errored && code !== 0 && finalText === '') {
            errored = true;
            const msgText = stderrBuf.trim() || `process exited with code ${code}`;
            broadcastToRoom(sid, { type: 'error', msg: msgText.slice(0, 1000) });
        }
        // Gemini 첫 호출 성공 시 세션 UUID 캡처 (이후 호출부터 --resume 사용)
        if (!errored && finalText !== '' && msg.provider === CAI.eProvider.gemini && isFirstCall) {
            const captured = await CAI.CaptureGeminiSessionId(dir);
            if (captured) cliSessionId = captured;
        }
        if (!errored && finalText !== '') {
            const cur = loadHistory(sid);
            if (cur) {
                cur.messages.push({
                    role: 'assistant', content: finalText,
                    provider: msg.provider, model: msg.model,
                    attachments: changedFiles.length ? changedFiles : undefined,
                    timestamp: Date.now(),
                });
                cur.meta.updatedAt = Date.now();
                cur.meta.cliSessionId = cliSessionId;
                saveHistory(cur);
            }
        }
        if (changedFiles.length) broadcastToRoom(sid, { type: 'files', changed: changedFiles });
        gRoomLock.delete(sid);
        broadcastToRoom(sid, { type: 'done', code, errored, stderr: stderrBuf.slice(0, 4000) });
    });
}

@URLPatterns(["/ai/chat/providers", "/ai/chat/sessions", "/ai/chat/session", "/ai/chat/session/config", "/ai/chat/session/upload", "/ai/chat/share", "/ai/chat/share/file", "/ai/chat/workspace"])
export class CAIChatRouter extends CAuthServer {
    constructor() {
        super();

        // GET /ai/chat/providers
        this.On("/ai/chat/providers", (_json: CJSON, _req: Request, _res: Response) => {
            if (!isValidToken(getToken(_req))) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }
            const providers = gProviderInfo.map(p => ({ ...p }));
            _res.json({ ok: true, providers });
            return null;
        });

        // GET /ai/chat/sessions
        this.On("/ai/chat/sessions", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!isValidToken(getToken(_req))) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }
            await ensurePaths();
            const limit = parseInt(_req.query.limit as string);
            _res.json({ ok: true, sessions: listSessions(isNaN(limit) ? undefined : limit) });
            return null;
        });

        // GET /ai/chat/session?id=  →  history
        // DELETE /ai/chat/session?id=  →  delete
        this.On("/ai/chat/session", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!isValidToken(getToken(_req))) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }
            await ensurePaths();
            const sid = safeSessionId((_req.query.id || _json['id']) as string);
            if (!sid) { _res.status(400).json({ ok: false, msg: 'invalid id' }); return null; }
            if (_req.method === 'DELETE') {
                _res.json({ ok: deleteSession(sid) });
            } else {
                const h = loadHistory(sid);
                if (!h) { _res.status(404).json({ ok: false, msg: 'not found' }); return null; }
                _res.json({ ok: true, history: normalizeHistory(h) });
            }
            return null;
        });

        // GET /ai/chat/session/config?id=   →  config 조회
        // POST /ai/chat/session/config?id=  →  config 저장
        this.On("/ai/chat/session/config", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!isValidToken(getToken(_req))) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }
            await ensurePaths();
            const sid = safeSessionId((_req.query.id || _json['id']) as string);
            if (!sid) { _res.json({ ok: false, msg: 'invalid id' }); return null; }
            if (_req.method === 'POST') {
                const cfg: ISessionConfig = {};
                if (typeof _json['workingDir'] === 'string') cfg.workingDir = _json['workingDir'];
                if (typeof _json['mcp'] === 'boolean')       cfg.mcp        = _json['mcp'];
                if (typeof _json['allow'] === 'boolean')     cfg.allow      = _json['allow'];
                saveConfig(sid, cfg);
                _res.json({ ok: true });
            } else {
                _res.json({ ok: true, config: loadConfig(sid) });
            }
            return null;
        });

        // POST /ai/chat/session/upload?id=<sid>&name=<filename>
        this.On("/ai/chat/session/upload", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!isValidToken(getToken(_req))) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }
            await ensurePaths();
            const sid = safeSessionId(_json['id'] as string);
            if (!sid) { _res.status(400).json({ ok: false, msg: 'invalid id' }); return null; }
            const rawName = (_json['name'] as string) || 'file';
            const safe = safeAttachmentName(rawName);
            const dir = sessionDir(sid)!;
            ensureDir(path.join(dir, 'uploads'));
            const dest = path.join(dir, 'uploads', safe);
            return new Promise<null>((resolve) => {
                let total = 0;
                const chunks: Buffer[] = [];
                _req.on('data', (c: Buffer) => {
                    total += c.length;
                    if (total > MAX_UPLOAD_BYTES) {
                        _res.status(413).json({ ok: false, msg: 'too large' });
                        _req.destroy();
                        resolve(null);
                        return;
                    }
                    chunks.push(c);
                });
                _req.on('end', () => {
                    if (_res.headersSent) { resolve(null); return; }
                    try {
                        fs.writeFileSync(dest, Buffer.concat(chunks));
                        _res.json({ ok: true, attachment: { name: rawName, path: `uploads/${safe}` } });
                    } catch (e: any) {
                        _res.status(500).json({ ok: false, msg: e.message });
                    }
                    resolve(null);
                });
                _req.on('error', (e: Error) => {
                    if (!_res.headersSent) _res.status(500).json({ ok: false, msg: e.message });
                    resolve(null);
                });
            });
        });

        // GET /ai/chat/share?id=<sid>  (public, no auth)
        this.On("/ai/chat/share", async (_json: CJSON, _req: Request, _res: Response) => {
            await ensurePaths();
            const sid = safeSessionId(_json.GetStr('id'));
            if (!sid) { _res.status(400).json({ ok: false, msg: 'invalid id' }); return null; }
            const h = loadHistory(sid);
            if (!h) { _res.status(404).json({ ok: false, msg: 'not found' }); return null; }
            _res.json({ ok: true, history: h });
            return null;
        });

        // GET /ai/chat/share/file?id=<sid>&path=<rel>  (public, no auth)
        this.On("/ai/chat/share/file", async (_json: CJSON, _req: Request, _res: Response) => {
            await ensurePaths();
            const sid = safeSessionId(_json.GetStr('id'));
            if (!sid) { _res.status(400).end('invalid id'); return null; }
            const dir = sessionDir(sid)!;
            const rel = _json.GetStr('path');
            if (!rel) { _res.status(400).end('missing path'); return null; }
            const abs = path.resolve(dir, rel);
            const rootWithSep = dir.endsWith(path.sep) ? dir : dir + path.sep;
            if (abs !== dir && !abs.startsWith(rootWithSep)) { _res.status(403).end('forbidden'); return null; }
            if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) { _res.status(404).end('not found'); return null; }
            return new Promise<null>((resolve) => { _res.sendFile(abs, () => resolve(null)); });
        });

        // GET /ai/chat/workspace?id=<sid>&path=<rel>
        this.On("/ai/chat/workspace", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!isValidToken(getToken(_req))) { _res.status(401).end('Authentication required'); return null; }
            await ensurePaths();
            const sid = safeSessionId(_json.GetStr('id'));
            if (!sid) { _res.status(400).end('invalid id'); return null; }
            const dir = sessionDir(sid)!;
            const rel = _json.GetStr('path');
            if (!rel) { _res.status(400).end('missing path'); return null; }
            const abs = path.resolve(dir, rel);
            const rootWithSep = dir.endsWith(path.sep) ? dir : dir + path.sep;
            if (abs !== dir && !abs.startsWith(rootWithSep)) { _res.status(403).end('forbidden'); return null; }
            if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) { _res.status(404).end('not found'); return null; }
            return new Promise<null>((resolve) => { _res.sendFile(abs, () => resolve(null)); });
        });
    }

    override Connect() {
        super.Connect();
        CConsol.Log('[CAIChatRouter] Connect()', CConsol.eColor.blue);
        ensurePaths().then(() => ensureDir(WORKSPACE_ROOT));
        probeAllProviders();

        const mPath = this.mPath;
        const wss = new WebSocketServer({ noServer: true });
        wss.on('connection', (ws: WebSocket, req: any) => {
            const rawIp = (req?.socket?.remoteAddress || '').toString();
            let ip = rawIp.replace(/^::ffff:/, '');
            if (ip === '::1') ip = '127.0.0.1';
            const ctx: IWsCtx = { ip };
            let joinedSid: string | null = null;

            ws.on('message', (raw) => {
                let msg: IWsClientMsg;
                try { msg = JSON.parse(raw.toString('utf8')); }
                catch { ws.send(JSON.stringify({ type: 'error', msg: 'bad json' })); return; }

                if (msg.type === 'join') {
                    const sid = safeSessionId(msg.sessionId);
                    if (!sid) { ws.send(JSON.stringify({ type: 'error', msg: 'invalid sessionId' })); return; }
                    if (joinedSid && joinedSid !== sid) leaveRoom(joinedSid, ws);
                    joinedSid = sid;
                    joinRoom(sid, ws);
                } else if (msg.type === 'send') {
                    if (!joinedSid) { ws.send(JSON.stringify({ type: 'error', msg: 'not joined' })); return; }
                    if (gRoomLock.get(joinedSid)) { ws.send(JSON.stringify({ type: 'busy' })); return; }
                    handleSend(joinedSid, msg, ctx);
                } else {
                    ws.send(JSON.stringify({ type: 'error', msg: 'unknown type' }));
                }
            });

            ws.on('close', () => {
                if (joinedSid) leaveRoom(joinedSid, ws);
            });
        });

        const server = CServerMain.Main().GetServer();
        if (server) {
            server.on('upgrade', (req: any, socket: any, head: Buffer) => {
                const urlObj = new URL(req.url!, 'http://localhost');
                if (urlObj.pathname !== mPath + '/ai/chat/ws') return;
                if (!checkWsToken(urlObj)) {
                    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
                    socket.destroy();
                    return;
                }
                wss.handleUpgrade(req, socket, head, (ws) => {
                    wss.emit('connection', ws, req);
                });
            });
        }
    }
}

export const _AIChat = {
    get AI_ROOT() { return AI_ROOT; },
    get WORKSPACE_ROOT() { return WORKSPACE_ROOT; },
    ensureDir, safeSessionId, sessionDir, historyPath,
    loadHistory, saveHistory, listSessions, deleteSession, safeAttachmentName,
};
export type { IMessage, ISessionMeta, IHistory, IAttachment, Provider, Role };

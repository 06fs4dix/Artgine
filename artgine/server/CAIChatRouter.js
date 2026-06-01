var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import * as path from 'path';
import * as fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { CServerMain, URLPatterns } from '../network/CServerMain.js';
import { GetAppJSON } from '../../desktop/MainFunc.js';
import { CConsol } from '../basic/CConsol.js';
import { CAuthServer, getToken, isValidToken, checkWsToken } from './CAuthServer.js';
import { CAI } from '../util/CAI.js';
let AI_ROOT = '';
let WORKSPACE_ROOT = '';
const WORKSPACE_ROOT_OVERRIDE = '';
let _pathsPromise = null;
function ensurePaths() {
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
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const MODELS = {
    [CAI.eProvider.claude]: [
        { value: 'claude-opus-4-7', label: 'Opus 4.7' },
        { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
        { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
    ],
    [CAI.eProvider.gemini]: [
        { value: 'gemini-2.0-flash', label: '2.0 Flash' },
        { value: 'gemini-2.0-flash-lite-preview-02-05', label: '2.0 Flash Lite' },
        { value: 'gemini-2.0-pro-exp-02-05', label: '2.0 Pro (Experimental)' },
        { value: 'gemini-1.5-pro', label: '1.5 Pro' },
        { value: 'gemini-1.5-flash', label: '1.5 Flash' },
    ],
    [CAI.eProvider.codex]: [
        { value: 'gpt-5.5', label: 'GPT-5.5' },
        { value: 'gpt-5.4', label: 'GPT-5.4' },
        { value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
    ],
    [CAI.eProvider.manus]: [],
    [CAI.eProvider.gpt]: [],
    [CAI.eProvider.antigravity]: [],
};
const gProviderInfo = [];
async function probeAllProviders() {
    gProviderInfo.length = 0;
    const providers = [CAI.eProvider.claude, CAI.eProvider.gemini, CAI.eProvider.codex, CAI.eProvider.antigravity];
    const results = await Promise.all(providers.map(p => CAI.ProviderInfo(p)));
    for (const info of results) {
        info.models = MODELS[info.id] || [];
        gProviderInfo.push(info);
        CConsol.Log(`[CAIChatRouter] ${info.id}: ${info.available ? info.version || 'OK' : 'NOT FOUND'}`, info.available ? CConsol.eColor.green : CConsol.eColor.red);
    }
}
function ensureDir(p) { if (!fs.existsSync(p))
    fs.mkdirSync(p, { recursive: true }); }
function safeSessionId(id) {
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id))
        return null;
    return id;
}
function sessionDir(id) {
    const sid = safeSessionId(id);
    return sid ? path.join(WORKSPACE_ROOT, sid) : null;
}
function historyPath(id) {
    const dir = sessionDir(id);
    return dir ? path.join(dir, 'history.json') : null;
}
function loadHistory(id) {
    const p = historyPath(id);
    if (!p || !fs.existsSync(p))
        return null;
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
    catch {
        return null;
    }
}
function saveHistory(h) {
    const dir = sessionDir(h.meta.sessionId);
    if (!dir)
        return;
    ensureDir(dir);
    fs.writeFileSync(historyPath(h.meta.sessionId), JSON.stringify(h, null, 2), 'utf8');
}
function configPath(id) {
    const dir = sessionDir(id);
    return dir ? path.join(dir, 'config.json') : null;
}
function loadConfig(id) {
    const p = configPath(id);
    if (!p || !fs.existsSync(p))
        return {};
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
    catch {
        return {};
    }
}
function saveConfig(id, cfg) {
    const dir = sessionDir(id);
    if (!dir)
        return;
    ensureDir(dir);
    fs.writeFileSync(configPath(id), JSON.stringify(cfg, null, 2), 'utf8');
}
const _legacyProviderMap = {
    0: CAI.eProvider.claude, 1: CAI.eProvider.gemini, 2: CAI.eProvider.codex,
    3: CAI.eProvider.manus, 4: CAI.eProvider.gpt, 5: CAI.eProvider.antigravity,
};
function normalizeHistory(h) {
    const p = h.meta.provider;
    if (typeof p === 'number')
        h.meta.provider = _legacyProviderMap[p] ?? CAI.eProvider.claude;
    return h;
}
function listSessions(limit) {
    if (!fs.existsSync(WORKSPACE_ROOT))
        return [];
    const out = [];
    for (const name of fs.readdirSync(WORKSPACE_ROOT)) {
        if (!safeSessionId(name))
            continue;
        const h = loadHistory(name);
        if (!h?.meta)
            continue;
        const normalized = normalizeHistory(h);
        const last = normalized.messages.length > 0 ? normalized.messages[normalized.messages.length - 1] : null;
        const lastMsg = last ? last.content.slice(0, 80).replace(/\n+/g, ' ') : undefined;
        const cfg = loadConfig(name);
        out.push({ ...normalized.meta, lastMsg, workingDir: cfg.workingDir });
    }
    out.sort((a, b) => b.updatedAt - a.updatedAt);
    const sliced = limit ? out.slice(0, limit) : out;
    return sliced.map(s => ({ ...s, busy: gRoomLock.get(s.sessionId) === true }));
}
function deleteSession(id) {
    const dir = sessionDir(id);
    if (!dir || !fs.existsSync(dir))
        return false;
    const cfg = loadConfig(id);
    if (cfg.tempMd && fs.existsSync(cfg.tempMd))
        fs.unlinkSync(cfg.tempMd);
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
}
function snapshotWorkspace(dir) {
    const out = new Map();
    if (!fs.existsSync(dir))
        return out;
    const walk = (cur, rel) => {
        let entries;
        try {
            entries = fs.readdirSync(cur, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const e of entries) {
            const childRel = rel ? `${rel}/${e.name}` : e.name;
            const childAbs = path.join(cur, e.name);
            if (e.isDirectory()) {
                walk(childAbs, childRel);
            }
            else if (e.isFile()) {
                if (rel === '' && e.name === 'history.json')
                    continue;
                try {
                    const st = fs.statSync(childAbs);
                    out.set(childRel, `${st.mtimeMs}|${st.size}`);
                }
                catch { }
            }
        }
    };
    walk(dir, '');
    return out;
}
function diffWorkspace(before, after) {
    const changed = [];
    for (const [rel, key] of after) {
        if (before.get(rel) !== key) {
            changed.push({ name: path.basename(rel), path: rel });
        }
    }
    return changed;
}
function safeAttachmentName(name) {
    const base = path.basename(name).replace(/[^A-Za-z0-9._-]/g, '_');
    return `${Date.now()}_${base}`;
}
function randomUuid() {
    const c = (n) => Math.floor(Math.random() * n);
    const hex = (n) => c(16).toString(16);
    let s = '';
    for (let i = 0; i < 32; i++)
        s += hex(0);
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-${(8 + c(4)).toString(16)}${s.slice(17, 20)}-${s.slice(20, 32)}`;
}
function attachmentBlock(sid, atts) {
    if (!atts || !atts.length)
        return '';
    const dir = sessionDir(sid);
    const lines = ['', '[첨부 파일 — 반드시 Read 도구로 읽어서 내용을 확인하세요]'];
    for (const a of atts) {
        const abs = dir ? path.resolve(dir, a.path) : a.path;
        lines.push(`- 절대경로: ${abs}  (원본 파일명: ${a.name})`);
    }
    lines.push('위 파일들의 절대경로를 그대로 Read 도구의 file_path 인자로 전달해서 읽으세요. 이미지면 비전으로 분석하세요.');
    return lines.join('\n');
}
function serializeHistoryForPrompt(sid, h, newUserMsg) {
    const lines = [];
    lines.push('이전 대화 기록입니다. 이어서 답변해주세요.\n');
    for (const m of h.messages) {
        const role = m.role === 'user' ? 'User' : 'Assistant';
        lines.push(`### ${role}`);
        lines.push(m.content);
        if (m.attachments?.length)
            lines.push(attachmentBlock(sid, m.attachments));
        lines.push('');
    }
    lines.push('### User (현재 질문)');
    lines.push(newUserMsg.content);
    if (newUserMsg.attachments?.length)
        lines.push(attachmentBlock(sid, newUserMsg.attachments));
    return lines.join('\n');
}
function buildUserPromptOneShot(sid, msg) {
    const parts = [msg.content];
    if (msg.attachments?.length)
        parts.push(attachmentBlock(sid, msg.attachments));
    return parts.join('\n');
}
const gRooms = new Map();
const gRoomLock = new Map();
function broadcastToRoom(sid, msg) {
    const room = gRooms.get(sid);
    if (!room)
        return;
    const data = JSON.stringify(msg);
    for (const client of room) {
        if (client.readyState === WebSocket.OPEN)
            client.send(data);
    }
}
function joinRoom(sid, ws) {
    if (!gRooms.has(sid))
        gRooms.set(sid, new Set());
    gRooms.get(sid).add(ws);
}
function leaveRoom(sid, ws) {
    const room = gRooms.get(sid);
    if (!room)
        return;
    room.delete(ws);
    if (room.size === 0) {
        gRooms.delete(sid);
        gRoomLock.delete(sid);
    }
}
async function handleSend(sid, msg, ctx) {
    const dir = sessionDir(sid);
    ensureDir(dir);
    ensureDir(path.join(dir, 'uploads'));
    const cfgFile = configPath(sid);
    const cfg = loadConfig(sid);
    if (!fs.existsSync(cfgFile)) {
        const newCfg = {};
        if (msg.workingDir)
            newCfg.workingDir = msg.workingDir;
        if (typeof msg.mcp === 'boolean')
            newCfg.mcp = msg.mcp;
        if (msg.mdcopy && msg.workingDir) {
            const copied = CAI.CreateRole(msg.provider, msg.workingDir);
            if (typeof copied === 'string') {
                newCfg.tempMd = copied;
                CConsol.Log(`[AIChat] Copied MD to ${copied}`);
            }
        }
        saveConfig(sid, newCfg);
        if (msg.workingDir)
            cfg.workingDir = msg.workingDir;
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
    const userMsg = {
        role: 'user', content: msg.content,
        provider: msg.provider, model: msg.model,
        attachments: msg.attachments, timestamp: now,
        senderIp: ctx.ip || undefined,
        senderUa: (msg.ua || '').slice(0, 300) || undefined,
    };
    let prompt;
    let cliSessionId = history.meta.cliSessionId;
    let isFirstCall = false;
    if (msg.provider === CAI.eProvider.claude) {
        if (needNewCliSession) {
            cliSessionId = randomUuid();
            isFirstCall = true;
            prompt = history.messages.length > 0
                ? serializeHistoryForPrompt(sid, history, userMsg)
                : buildUserPromptOneShot(sid, userMsg);
        }
        else {
            prompt = buildUserPromptOneShot(sid, userMsg);
        }
    }
    else if (msg.provider === CAI.eProvider.gemini) {
        isFirstCall = needNewCliSession;
        if (needNewCliSession) {
            cliSessionId = undefined;
            prompt = history.messages.length > 0
                ? serializeHistoryForPrompt(sid, history, userMsg)
                : buildUserPromptOneShot(sid, userMsg);
        }
        else {
            prompt = buildUserPromptOneShot(sid, userMsg);
        }
    }
    else if (msg.provider === CAI.eProvider.antigravity) {
        isFirstCall = needNewCliSession;
        if (needNewCliSession) {
            cliSessionId = randomUuid();
            prompt = history.messages.length > 0
                ? serializeHistoryForPrompt(sid, history, userMsg)
                : buildUserPromptOneShot(sid, userMsg);
        }
        else {
            prompt = buildUserPromptOneShot(sid, userMsg);
        }
    }
    else {
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
    broadcastToRoom(sid, { type: 'message', message: userMsg });
    broadcastToRoom(sid, { type: 'start', sessionId: sid });
    gRoomLock.set(sid, true);
    const snapBefore = snapshotWorkspace(dir);
    let child;
    try {
        child = await CAI.Chat(msg.provider, msg.model, cwd, prompt, !!msg.mcp, cliSessionId, isFirstCall);
    }
    catch (e) {
        gRoomLock.delete(sid);
        broadcastToRoom(sid, { type: 'error', msg: `spawn failed: ${e.message}` });
        return;
    }
    let assistantBuf = '';
    let stderrBuf = '';
    let errored = false;
    child.stdout?.on('data', (data) => {
        const text = data.toString('utf8');
        assistantBuf += text;
        broadcastToRoom(sid, { type: 'chunk', text });
    });
    child.stderr?.on('data', (data) => {
        stderrBuf += data.toString('utf8');
    });
    child.on('error', (err) => {
        errored = true;
        broadcastToRoom(sid, { type: 'error', msg: `process error: ${err.message}` });
    });
    child.on('close', async (code) => {
        gRoomLock.delete(sid);
        const finalText = assistantBuf.trim();
        const snapAfter = snapshotWorkspace(dir);
        const changedFiles = diffWorkspace(snapBefore, snapAfter);
        if (!errored && code !== 0 && finalText === '') {
            errored = true;
            const msgText = stderrBuf.trim() || `process exited with code ${code}`;
            broadcastToRoom(sid, { type: 'error', msg: msgText.slice(0, 1000) });
        }
        if (!errored && finalText !== '' && msg.provider === CAI.eProvider.gemini && isFirstCall) {
            const captured = await CAI.CaptureGeminiSessionId(dir);
            if (captured)
                cliSessionId = captured;
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
        if (changedFiles.length)
            broadcastToRoom(sid, { type: 'files', changed: changedFiles });
        broadcastToRoom(sid, { type: 'done', code, errored, stderr: stderrBuf.slice(0, 4000) });
    });
}
let CAIChatRouter = class CAIChatRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/ai/chat/providers", (_json, _req, _res) => {
            if (!isValidToken(getToken(_req))) {
                _res.status(401).json({ ok: false, msg: 'Authentication required' });
                return null;
            }
            const providers = gProviderInfo.map(p => ({ ...p }));
            _res.json({ ok: true, providers });
            return null;
        });
        this.On("/ai/chat/sessions", async (_json, _req, _res) => {
            if (!isValidToken(getToken(_req))) {
                _res.status(401).json({ ok: false, msg: 'Authentication required' });
                return null;
            }
            await ensurePaths();
            const limit = parseInt(_req.query.limit);
            _res.json({ ok: true, sessions: listSessions(isNaN(limit) ? undefined : limit) });
            return null;
        });
        this.On("/ai/chat/session", async (_json, _req, _res) => {
            if (!isValidToken(getToken(_req))) {
                _res.status(401).json({ ok: false, msg: 'Authentication required' });
                return null;
            }
            await ensurePaths();
            const sid = safeSessionId((_req.query.id || _json['id']));
            if (!sid) {
                _res.status(400).json({ ok: false, msg: 'invalid id' });
                return null;
            }
            if (_req.method === 'DELETE') {
                _res.json({ ok: deleteSession(sid) });
            }
            else {
                const h = loadHistory(sid);
                if (!h) {
                    _res.status(404).json({ ok: false, msg: 'not found' });
                    return null;
                }
                _res.json({ ok: true, history: normalizeHistory(h) });
            }
            return null;
        });
        this.On("/ai/chat/session/config", async (_json, _req, _res) => {
            if (!isValidToken(getToken(_req))) {
                _res.status(401).json({ ok: false, msg: 'Authentication required' });
                return null;
            }
            await ensurePaths();
            const sid = safeSessionId((_req.query.id || _json['id']));
            if (!sid) {
                _res.json({ ok: false, msg: 'invalid id' });
                return null;
            }
            if (_req.method === 'POST') {
                const cfg = {};
                if (typeof _json['workingDir'] === 'string')
                    cfg.workingDir = _json['workingDir'];
                if (typeof _json['mcp'] === 'boolean')
                    cfg.mcp = _json['mcp'];
                if (typeof _json['allow'] === 'boolean')
                    cfg.allow = _json['allow'];
                saveConfig(sid, cfg);
                _res.json({ ok: true });
            }
            else {
                _res.json({ ok: true, config: loadConfig(sid) });
            }
            return null;
        });
        this.On("/ai/chat/session/upload", async (_json, _req, _res) => {
            if (!isValidToken(getToken(_req))) {
                _res.status(401).json({ ok: false, msg: 'Authentication required' });
                return null;
            }
            await ensurePaths();
            const sid = safeSessionId(_json['id']);
            if (!sid) {
                _res.status(400).json({ ok: false, msg: 'invalid id' });
                return null;
            }
            const rawName = _json['name'] || 'file';
            const safe = safeAttachmentName(rawName);
            const dir = sessionDir(sid);
            ensureDir(path.join(dir, 'uploads'));
            const dest = path.join(dir, 'uploads', safe);
            return new Promise((resolve) => {
                let total = 0;
                const chunks = [];
                _req.on('data', (c) => {
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
                    if (_res.headersSent) {
                        resolve(null);
                        return;
                    }
                    try {
                        fs.writeFileSync(dest, Buffer.concat(chunks));
                        _res.json({ ok: true, attachment: { name: rawName, path: `uploads/${safe}` } });
                    }
                    catch (e) {
                        _res.status(500).json({ ok: false, msg: e.message });
                    }
                    resolve(null);
                });
                _req.on('error', (e) => {
                    if (!_res.headersSent)
                        _res.status(500).json({ ok: false, msg: e.message });
                    resolve(null);
                });
            });
        });
        this.On("/ai/chat/share", async (_json, _req, _res) => {
            await ensurePaths();
            const sid = safeSessionId(_json['id']);
            if (!sid) {
                _res.status(400).json({ ok: false, msg: 'invalid id' });
                return null;
            }
            const h = loadHistory(sid);
            if (!h) {
                _res.status(404).json({ ok: false, msg: 'not found' });
                return null;
            }
            _res.json({ ok: true, history: h });
            return null;
        });
        this.On("/ai/chat/share/file", async (_json, _req, _res) => {
            await ensurePaths();
            const sid = safeSessionId(_json['id']);
            if (!sid) {
                _res.status(400).end('invalid id');
                return null;
            }
            const dir = sessionDir(sid);
            const rel = _json['path'];
            if (!rel) {
                _res.status(400).end('missing path');
                return null;
            }
            const abs = path.resolve(dir, rel);
            const rootWithSep = dir.endsWith(path.sep) ? dir : dir + path.sep;
            if (abs !== dir && !abs.startsWith(rootWithSep)) {
                _res.status(403).end('forbidden');
                return null;
            }
            if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
                _res.status(404).end('not found');
                return null;
            }
            return new Promise((resolve) => { _res.sendFile(abs, () => resolve(null)); });
        });
        this.On("/ai/chat/workspace", async (_json, _req, _res) => {
            if (!isValidToken(getToken(_req))) {
                _res.status(401).end('Authentication required');
                return null;
            }
            await ensurePaths();
            const sid = safeSessionId(_json['id']);
            if (!sid) {
                _res.status(400).end('invalid id');
                return null;
            }
            const dir = sessionDir(sid);
            const rel = _json['path'];
            if (!rel) {
                _res.status(400).end('missing path');
                return null;
            }
            const abs = path.resolve(dir, rel);
            const rootWithSep = dir.endsWith(path.sep) ? dir : dir + path.sep;
            if (abs !== dir && !abs.startsWith(rootWithSep)) {
                _res.status(403).end('forbidden');
                return null;
            }
            if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
                _res.status(404).end('not found');
                return null;
            }
            return new Promise((resolve) => { _res.sendFile(abs, () => resolve(null)); });
        });
    }
    Connect() {
        super.Connect();
        CConsol.Log('[CAIChatRouter] Connect()', CConsol.eColor.blue);
        ensurePaths().then(() => ensureDir(WORKSPACE_ROOT));
        probeAllProviders();
        const mPath = this.mPath;
        const wss = new WebSocketServer({ noServer: true });
        wss.on('connection', (ws, req) => {
            const rawIp = (req?.socket?.remoteAddress || '').toString();
            let ip = rawIp.replace(/^::ffff:/, '');
            if (ip === '::1')
                ip = '127.0.0.1';
            const ctx = { ip };
            let joinedSid = null;
            ws.on('message', (raw) => {
                let msg;
                try {
                    msg = JSON.parse(raw.toString('utf8'));
                }
                catch {
                    ws.send(JSON.stringify({ type: 'error', msg: 'bad json' }));
                    return;
                }
                if (msg.type === 'join') {
                    const sid = safeSessionId(msg.sessionId);
                    if (!sid) {
                        ws.send(JSON.stringify({ type: 'error', msg: 'invalid sessionId' }));
                        return;
                    }
                    if (joinedSid && joinedSid !== sid)
                        leaveRoom(joinedSid, ws);
                    joinedSid = sid;
                    joinRoom(sid, ws);
                }
                else if (msg.type === 'send') {
                    if (!joinedSid) {
                        ws.send(JSON.stringify({ type: 'error', msg: 'not joined' }));
                        return;
                    }
                    if (gRoomLock.get(joinedSid)) {
                        ws.send(JSON.stringify({ type: 'busy' }));
                        return;
                    }
                    handleSend(joinedSid, msg, ctx);
                }
                else {
                    ws.send(JSON.stringify({ type: 'error', msg: 'unknown type' }));
                }
            });
            ws.on('close', () => {
                if (joinedSid)
                    leaveRoom(joinedSid, ws);
            });
        });
        const server = CServerMain.Main().GetServer();
        if (server) {
            server.on('upgrade', (req, socket, head) => {
                const urlObj = new URL(req.url, 'http://localhost');
                if (urlObj.pathname !== mPath + '/ai/chat/ws')
                    return;
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
};
CAIChatRouter = __decorate([
    URLPatterns(["/ai/chat/providers", "/ai/chat/sessions", "/ai/chat/session", "/ai/chat/session/config", "/ai/chat/session/upload", "/ai/chat/share", "/ai/chat/share/file", "/ai/chat/workspace"])
], CAIChatRouter);
export { CAIChatRouter };
export const _AIChat = {
    get AI_ROOT() { return AI_ROOT; },
    get WORKSPACE_ROOT() { return WORKSPACE_ROOT; },
    ensureDir, safeSessionId, sessionDir, historyPath,
    loadHistory, saveHistory, listSessions, deleteSession, safeAttachmentName,
};

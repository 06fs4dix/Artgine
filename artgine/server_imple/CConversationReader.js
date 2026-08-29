import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CSQLite } from '../network/CSQLite.js';
import { CAI } from '../util/CAI.js';
import { CWASM } from '../basic/CWASM.js';
CWASM.IsSIMD();
const SCAN_MS = 5000;
const HOT_MS = 60_000;
const gTracked = new Map();
const gHot = new Set();
let gNextScanAt = 0;
const gStartAt = Date.now();
function _listDir(dir, filter) {
    try {
        return fs.readdirSync(dir).filter(filter);
    }
    catch {
        return [];
    }
}
const _SYS_BLOCKS = [
    /<system-reminder>[\s\S]*?<\/system-reminder>/g,
    /<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g,
    /<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g,
    /<command-(?:name|message|args)>[\s\S]*?<\/command-(?:name|message|args)>/g,
    /<user_info>[\s\S]*?<\/user_info>/g,
    /<environment_context>[\s\S]*?<\/environment_context>/g,
];
function _cleanUserText(text) {
    let out = text;
    for (const re of _SYS_BLOCKS)
        out = out.replace(re, '');
    return out.trim();
}
const _textOf = (c, blockType = 'text') => typeof c === 'string' ? c
    : Array.isArray(c) ? c.filter((b) => b?.type === blockType).map((b) => String(b.text ?? '')).join('')
        : '';
const _FILE_KEYS = ['file_path', 'filePath', 'target_file', 'target_directory', 'path', 'file', 'filename', 'command', 'url'];
function _fileFromArgs(args) {
    if (args == null)
        return '';
    let obj = args;
    if (typeof args === 'string') {
        const s = args.trim();
        if (!s)
            return '';
        try {
            obj = JSON.parse(s);
        }
        catch {
            return '';
        }
    }
    if (typeof obj !== 'object')
        return '';
    for (const k of _FILE_KEYS) {
        const v = obj[k];
        if (typeof v === 'string' && v.trim())
            return v.trim();
        if (Array.isArray(v) && typeof v[0] === 'string' && v[0].trim())
            return v[0].trim();
    }
    return '';
}
function _toolChunk(name, args, model, iso) {
    return { role: 'tool', text: '', model, iso, tool: String(name || '?'), file: _fileFromArgs(args) };
}
function _normMatchText(text) {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t\u00a0]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
function _textsMatch(a, b) {
    if (a === b)
        return true;
    const na = _normMatchText(a);
    const nb = _normMatchText(b);
    if (!na || !nb)
        return false;
    if (na === nb)
        return true;
    const minLen = 12;
    if (na.length >= minLen && nb.length >= minLen) {
        if (na.includes(nb) || nb.includes(na))
            return true;
    }
    return false;
}
function _peersOf(provider, cwd, live) {
    const resolved = path.resolve(cwd);
    return live.filter(s => s.provider === provider && path.resolve(s.cwd) === resolved);
}
function _soleLiveKey(provider, cwd, live) {
    const peers = _peersOf(provider, cwd, live);
    return peers.length === 1 ? peers[0].key : '';
}
function _matchKey(provider, cwd, text, live) {
    const peers = _peersOf(provider, cwd, live);
    if (peers.length === 0)
        return '';
    const hits = [];
    for (const s of peers) {
        const input = s.inputs.find(i => !i.used && _textsMatch(i.text, text));
        if (input)
            hits.push({ key: s.key, input });
    }
    if (hits.length === 1) {
        hits[0].input.used = true;
        return hits[0].key;
    }
    if (hits.length > 1)
        return '';
    const withUnused = peers.filter(s => s.inputs.some(i => !i.used));
    if (withUnused.length === 1) {
        const input = withUnused[0].inputs.find(i => !i.used);
        if (input)
            input.used = true;
        return withUnused[0].key;
    }
    if (peers.length === 1)
        return peers[0].key;
    return '';
}
function _resolveKey(provider, cwd, text, live, prevKey) {
    if (text != null) {
        const k = _matchKey(provider, cwd, text, live);
        if (k)
            return k;
    }
    if (prevKey)
        return prevKey;
    return _soleLiveKey(provider, cwd, live);
}
function _readAppended(file, t) {
    let size;
    try {
        size = fs.statSync(file).size;
    }
    catch {
        return [];
    }
    if (size < t.offset)
        t.offset = 0;
    if (size === t.offset)
        return [];
    let fd;
    try {
        fd = fs.openSync(file, 'r');
    }
    catch {
        return [];
    }
    try {
        const len = size - t.offset;
        const buf = Buffer.alloc(len);
        fs.readSync(fd, buf, 0, len, t.offset);
        const text = buf.toString('utf8');
        const lastNl = text.lastIndexOf('\n');
        if (lastNl < 0)
            return [];
        t.offset += Buffer.byteLength(text.slice(0, lastNl + 1), 'utf8');
        return text.slice(0, lastNl).split('\n').filter(l => l.trim().length > 0);
    }
    catch {
        return [];
    }
    finally {
        try {
            fs.closeSync(fd);
        }
        catch { }
    }
}
function _claudeParse(line) {
    const rec = JSON.parse(line);
    if (rec?.isSidechain)
        return [];
    const msg = rec?.message;
    if (!msg)
        return [];
    const iso = typeof rec.timestamp === 'string' ? rec.timestamp : undefined;
    const model = typeof msg.model === 'string' ? msg.model : '';
    if (rec.type === 'user') {
        const text = _cleanUserText(_textOf(msg.content));
        return text ? [{ role: 'user', text, model, iso }] : [];
    }
    if (rec.type !== 'assistant')
        return [];
    const out = [];
    if (Array.isArray(msg.content)) {
        for (const b of msg.content) {
            if (b?.type === 'tool_use')
                out.push(_toolChunk(String(b.name ?? ''), b.input, model, iso));
        }
    }
    if (msg.stop_reason === 'end_turn') {
        const text = _textOf(msg.content).trim();
        if (text)
            out.push({ role: 'assistant', text, model, iso });
    }
    return out;
}
function _grokUnwrapQuery(text) {
    const m = text.match(/^<user_query>\r?\n?([\s\S]*?)\r?\n?<\/user_query>$/);
    return m ? m[1] : text;
}
function _grokParse(line) {
    const rec = JSON.parse(line);
    const model = typeof rec?.model_id === 'string' ? rec.model_id : '';
    if (rec?.type === 'user') {
        const text = _cleanUserText(_grokUnwrapQuery(_textOf(rec.content).trim()));
        return text ? [{ role: 'user', text, model }] : [];
    }
    if (rec?.type !== 'assistant')
        return [];
    const calls = Array.isArray(rec.tool_calls) ? rec.tool_calls : null;
    if (calls && calls.length) {
        const out = [];
        for (const t of calls) {
            const name = String(t?.name ?? t?.function?.name ?? '');
            const args = t?.arguments ?? t?.function?.arguments ?? t?.input ?? t?.args;
            out.push(_toolChunk(name, args, model));
        }
        return out;
    }
    const text = _textOf(rec.content).trim();
    return text ? [{ role: 'assistant', text, model }] : [];
}
function _codexParse(line) {
    const rec = JSON.parse(line);
    const p = rec?.payload;
    if (!p)
        return [];
    const iso = typeof rec.timestamp === 'string' ? rec.timestamp : undefined;
    if (rec.type === 'event_msg' && p.type === 'task_complete') {
        const text = String(p.last_agent_message ?? '').trim();
        return text ? [{ role: 'assistant', text, model: '', iso }] : [];
    }
    if (rec.type === 'response_item' && p.type === 'message' && p.role === 'user') {
        const text = _cleanUserText(_textOf(p.content, 'input_text'));
        return text ? [{ role: 'user', text, model: '', iso }] : [];
    }
    if (rec.type === 'response_item' && p.type === 'function_call') {
        const name = String(p.name ?? '');
        const full = p.namespace ? `${p.namespace}/${name}` : name;
        return [_toolChunk(full, p.arguments, '', iso)];
    }
    return [];
}
function _codexCandidates() {
    const base = path.join(os.homedir(), '.codex', 'sessions');
    const out = [];
    for (const off of [0, 1]) {
        const d = new Date(Date.now() - off * 86400000);
        const dir = path.join(base, String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0'));
        for (const n of _listDir(dir, x => x.startsWith('rollout-') && x.endsWith('.jsonl')))
            out.push(path.join(dir, n));
    }
    return out;
}
function _codexVerify(file, cwd, t) {
    try {
        const head = fs.readFileSync(file, 'utf8').split('\n')[0];
        const rec = JSON.parse(head);
        if (rec?.type !== 'session_meta')
            return false;
        const p = rec.payload ?? {};
        if (path.resolve(String(p.cwd ?? '')) !== path.resolve(cwd))
            return false;
        t.sessionId = String(p.session_id ?? '');
        t.model = String(p.model ?? '');
        return true;
    }
    catch {
        return false;
    }
}
const SPECS = {
    [CAI.eProvider.claude]: {
        candidates: cwd => {
            const dir = path.join(os.homedir(), '.claude', 'projects', cwd.replace(/[^a-zA-Z0-9]/g, '-'));
            return _listDir(dir, n => n.endsWith('.jsonl')).map(n => path.join(dir, n));
        },
        sessionIdOf: f => path.basename(f, '.jsonl'),
        parse: _claudeParse,
    },
    [CAI.eProvider.grok]: {
        candidates: cwd => {
            const dir = path.join(os.homedir(), '.grok', 'sessions', encodeURIComponent(cwd));
            return _listDir(dir, () => true).map(n => path.join(dir, n, 'chat_history.jsonl'));
        },
        sessionIdOf: f => path.basename(path.dirname(f)),
        parse: _grokParse,
    },
    [CAI.eProvider.codex]: {
        candidates: _codexCandidates,
        verify: _codexVerify,
        sessionIdOf: f => path.basename(f, '.jsonl'),
        parse: _codexParse,
    },
};
const _OPENCODE_DB = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');
let gOpencodeDb = null;
async function _opencodeDb() {
    if (gOpencodeDb)
        return gOpencodeDb;
    if (!fs.existsSync(_OPENCODE_DB))
        return null;
    const db = new CSQLite();
    db.mDatabase = _OPENCODE_DB;
    await db.Init();
    gOpencodeDb = db;
    return db;
}
async function _opencodeRead(t, live, out) {
    const db = await _opencodeDb();
    if (!db)
        return;
    const rows = await db.Recv('SELECT id, data, time_created, time_updated FROM message WHERE session_id = ? AND time_created > ? ORDER BY time_created ASC', [t.sessionId, t.lastSeen]);
    if (!rows || !rows.length)
        return;
    for (const r of rows) {
        const mid = String(r[0]);
        const tCreated = Number(r[2]);
        const tUpdated = Number(r[3]);
        let md;
        try {
            md = JSON.parse(String(r[1]));
        }
        catch {
            t.lastSeen = tCreated;
            continue;
        }
        const role = md?.role;
        if (role !== 'user' && role !== 'assistant') {
            t.lastSeen = tCreated;
            continue;
        }
        const partRows = await db.Recv('SELECT data FROM part WHERE message_id = ?', [mid]);
        const parts = (partRows ?? []).map((p) => { try {
            return JSON.parse(String(p[0]));
        }
        catch {
            return null;
        } })
            .filter((p) => p);
        const types = new Set(parts.map((p) => String(p.type)));
        if (role === 'assistant' && !types.has('step-finish') && Date.now() - tUpdated < 10_000)
            break;
        t.lastSeen = tCreated;
        t.activeAt = Date.now();
        const model = String(md?.modelID ?? '');
        const iso = new Date(tCreated).toISOString();
        if (role === 'assistant' && types.has('tool')) {
            t.currentKey = _resolveKey(t.provider, t.cwd, null, live, t.currentKey);
            for (const p of parts) {
                if (p.type !== 'tool')
                    continue;
                const name = String(p.tool ?? p.name ?? '');
                const input = p.state?.input ?? p.input;
                const chunk = _toolChunk(name, input, model, iso);
                out.push({ ...chunk, key: t.currentKey, provider: t.provider, sessionId: t.sessionId, cwd: t.cwd });
            }
            continue;
        }
        const raw = parts.filter((p) => p.type === 'text').map((p) => String(p.text ?? '')).join('');
        const text = role === 'user' ? _cleanUserText(raw) : raw.trim();
        if (!text)
            continue;
        t.currentKey = _resolveKey(t.provider, t.cwd, role === 'user' ? text : null, live, t.currentKey);
        out.push({
            key: t.currentKey, provider: t.provider, sessionId: t.sessionId, cwd: t.cwd,
            role, text, model, iso,
        });
    }
}
const AGY_BASE = path.join(os.homedir(), '.gemini', 'antigravity-cli');
const AGY_CONV_DIR = path.join(AGY_BASE, 'conversations');
const AGY_USER = 14, AGY_ASST = 15, AGY_TITLE = 23, AGY_START = 98;
const AGY_SETTLE_MS = 10_000;
const gAgyDb = new Map();
const gAgyCwd = new Map();
async function _agyDb(file) {
    let db = gAgyDb.get(file);
    if (db)
        return db;
    if (!fs.existsSync(file))
        return null;
    db = new CSQLite();
    db.mDatabase = file;
    try {
        await db.Init();
    }
    catch {
        return null;
    }
    gAgyDb.set(file, db);
    return db;
}
function _pbVarint(buf, p) {
    let result = 0, shift = 0, pos = p;
    while (pos < buf.length) {
        const b = buf[pos++];
        result += (b & 0x7f) * Math.pow(2, shift);
        if ((b & 0x80) === 0)
            return [result, pos];
        shift += 7;
        if (shift > 63)
            break;
    }
    return [0, -1];
}
function* _pbFields(buf, start = 0, end = buf.length) {
    let p = start;
    while (p < end) {
        const [tag, p1] = _pbVarint(buf, p);
        if (p1 < 0)
            return;
        const field = Math.floor(tag / 8), wire = tag & 7;
        p = p1;
        if (wire === 0) {
            const [v, p2] = _pbVarint(buf, p);
            if (p2 < 0)
                return;
            yield { field, wire, varint: v };
            p = p2;
        }
        else if (wire === 2) {
            const [len, p2] = _pbVarint(buf, p);
            if (p2 < 0 || p2 + len > end)
                return;
            yield { field, wire, bytes: buf.subarray(p2, p2 + len) };
            p = p2 + len;
        }
        else if (wire === 5)
            p += 4;
        else if (wire === 1)
            p += 8;
        else
            return;
    }
}
function _pbGetBytes(buf, field) {
    for (const f of _pbFields(buf))
        if (f.field === field && f.wire === 2)
            return f.bytes;
    return null;
}
function _pbGetVarint(buf, field) {
    for (const f of _pbFields(buf))
        if (f.field === field && f.wire === 0)
            return f.varint;
    return null;
}
function _agyProse(s) {
    const t = s.trim();
    if (t.length < 2)
        return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t))
        return false;
    if (/^(file:|https?:|[A-Za-z]:[\\/]|\/)/.test(t))
        return false;
    return /[A-Za-z가-힣]/.test(t);
}
function _agyFallbackText(buf, depth = 0) {
    let best = '';
    for (const f of _pbFields(buf)) {
        if (f.wire !== 2 || !f.bytes)
            continue;
        if (depth < 6) {
            const nested = _agyFallbackText(f.bytes, depth + 1);
            if (nested.length > best.length)
                best = nested;
        }
        const s = f.bytes.toString('utf8');
        if (Buffer.byteLength(s, 'utf8') !== f.bytes.length)
            continue;
        if (_agyProse(s) && s.length > best.length)
            best = s;
    }
    return best;
}
function _agyStepText(payload, stepType) {
    const [outer, inner] = stepType === AGY_USER ? [19, 2] : [20, 1];
    const content = _pbGetBytes(payload, outer);
    if (content) {
        const s = _pbGetBytes(content, inner);
        if (s && s.length) {
            const txt = s.toString('utf8');
            if (txt.trim())
                return txt;
        }
    }
    return _agyFallbackText(payload);
}
function _agyIso(payload) {
    const meta = _pbGetBytes(payload, 5);
    if (!meta)
        return undefined;
    const ts = _pbGetBytes(meta, 1);
    if (!ts)
        return undefined;
    const secs = _pbGetVarint(ts, 1);
    if (!secs)
        return undefined;
    const nanos = _pbGetVarint(ts, 2) ?? 0;
    return new Date(secs * 1000 + Math.floor(nanos / 1e6)).toISOString();
}
function _agyFindMarker(buf, prefix, depth = 0) {
    for (const f of _pbFields(buf)) {
        if (f.wire !== 2 || !f.bytes)
            continue;
        const s = f.bytes.toString('utf8');
        if (s.startsWith(prefix))
            return s;
        if (depth < 8) {
            const r = _agyFindMarker(f.bytes, prefix, depth + 1);
            if (r)
                return r;
        }
    }
    return null;
}
function _agyNormCwd(s) {
    let raw = s;
    try {
        raw = decodeURIComponent(s);
    }
    catch { }
    return path.resolve(raw.replace(/\//g, '\\')).toLowerCase();
}
async function _agyResolveCwd(file) {
    const cached = gAgyCwd.get(file);
    if (cached !== undefined)
        return cached;
    const db = await _agyDb(file);
    if (!db)
        return '';
    const rows = await db.Recv('SELECT step_payload FROM steps WHERE step_type = ? ORDER BY idx ASC LIMIT 1', [AGY_USER]);
    const raw = rows?.[0]?.[0];
    if (!raw)
        return '';
    const payload = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    const url = _agyFindMarker(payload, 'file:///');
    const cwd = url ? _agyNormCwd(url.slice('file:///'.length)) : '';
    if (cwd)
        gAgyCwd.set(file, cwd);
    return cwd;
}
async function _agyMaxIdx(file) {
    const db = await _agyDb(file);
    if (!db)
        return 0;
    const r = await db.Recv('SELECT MAX(idx) FROM steps', []);
    return Number(r?.[0]?.[0] ?? 0);
}
function _agyFlushPending(t, live, out) {
    if (!t.pendText)
        return;
    t.currentKey = _resolveKey(t.provider, t.cwd, null, live, t.currentKey);
    out.push({ key: t.currentKey, provider: t.provider, sessionId: t.sessionId, cwd: t.cwd,
        role: 'assistant', text: t.pendText, model: '', iso: t.pendIso });
    t.pendText = undefined;
    t.pendIso = undefined;
}
async function _agyRead(t, live, out) {
    if (!t.file)
        return;
    const db = await _agyDb(t.file);
    if (!db)
        return;
    const rows = await db.Recv('SELECT idx, step_type, step_payload FROM steps WHERE idx > ? ORDER BY idx ASC', [t.lastSeen]);
    for (const r of rows ?? []) {
        const idx = Number(r[0]);
        const stype = Number(r[1]);
        const raw = r[2];
        t.lastSeen = idx;
        t.activeAt = Date.now();
        if (raw == null)
            continue;
        const payload = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        if (stype === AGY_USER) {
            _agyFlushPending(t, live, out);
            const text = _cleanUserText(_agyStepText(payload, AGY_USER));
            if (!text)
                continue;
            t.currentKey = _resolveKey(t.provider, t.cwd, text, live, t.currentKey);
            out.push({ key: t.currentKey, provider: t.provider, sessionId: t.sessionId, cwd: t.cwd,
                role: 'user', text, model: '', iso: _agyIso(payload) });
        }
        else if (stype === AGY_ASST) {
            const text = _agyStepText(payload, AGY_ASST).trim();
            if (text) {
                t.pendText = text;
                t.pendIso = _agyIso(payload);
            }
        }
        else if (stype === AGY_TITLE || stype === AGY_START) {
        }
        else {
            t.pendText = undefined;
            t.pendIso = undefined;
        }
    }
    if (t.pendText && Date.now() - t.activeAt > AGY_SETTLE_MS)
        _agyFlushPending(t, live, out);
}
async function _scan(live) {
    const seen = new Set();
    for (const s of live) {
        const scope = `${s.provider}|${path.resolve(s.cwd)}`;
        if (seen.has(scope))
            continue;
        seen.add(scope);
        if (s.provider === CAI.eProvider.opencode) {
            const db = await _opencodeDb();
            if (!db)
                continue;
            const rows = await db.Recv('SELECT id FROM session WHERE directory = ?', [s.cwd.replace(/\\/g, '/')]);
            const sids = (rows ?? []).map((r) => String(r[0]));
            const coldIds = sids.filter(sid => { const k = gTracked.get(`opencode:${sid}`); return k && !gHot.has(`opencode:${sid}`); });
            const newIds = sids.filter(sid => !gTracked.has(`opencode:${sid}`));
            if (coldIds.length) {
                const ph = coldIds.map(() => '?').join(',');
                const mx = await db.Recv(`SELECT session_id, MAX(time_created) FROM message WHERE session_id IN (${ph}) GROUP BY session_id`, coldIds);
                const maxMap = new Map((mx ?? []).map((r) => [String(r[0]), Number(r[1])]));
                for (const sid of coldIds) {
                    const known = gTracked.get(`opencode:${sid}`);
                    const lastMax = maxMap.get(sid) ?? 0;
                    if (lastMax > known.lastSeen) {
                        gHot.add(`opencode:${sid}`);
                        known.activeAt = Date.now();
                    }
                }
            }
            if (newIds.length) {
                const ph = newIds.map(() => '?').join(',');
                const mm = await db.Recv(`SELECT session_id, MIN(time_created), MAX(time_created) FROM message WHERE session_id IN (${ph}) GROUP BY session_id`, newIds);
                const rangeMap = new Map((mm ?? []).map((r) => [String(r[0]), { min: Number(r[1]), max: Number(r[2]) }]));
                for (const sid of newIds) {
                    if (CAI.gHeadlessSessionIds.has(sid))
                        continue;
                    const range = rangeMap.get(sid) ?? { min: 0, max: 0 };
                    const fresh = (range.min === 0 || range.min >= gStartAt);
                    const id = `opencode:${sid}`;
                    gTracked.set(id, {
                        provider: s.provider, cwd: s.cwd, sessionId: sid,
                        offset: 0, lastSeen: fresh ? 0 : range.max, currentKey: '', activeAt: Date.now(),
                    });
                    if (fresh)
                        gHot.add(id);
                }
            }
            continue;
        }
        if (s.provider === CAI.eProvider.antigravity) {
            const wantCwd = _agyNormCwd(s.cwd);
            for (const name of _listDir(AGY_CONV_DIR, n => n.endsWith('.db'))) {
                const file = path.join(AGY_CONV_DIR, name);
                const known = gTracked.get(file);
                if (known) {
                    if (!gHot.has(file)) {
                        try {
                            const mt = fs.statSync(file).mtimeMs;
                            if (mt > (known.mtime ?? 0)) {
                                gHot.add(file);
                                known.activeAt = Date.now();
                                known.mtime = mt;
                            }
                        }
                        catch { }
                    }
                    continue;
                }
                const cwd = await _agyResolveCwd(file);
                if (!cwd || cwd !== wantCwd)
                    continue;
                const agySessionId = path.basename(file, '.db');
                if (CAI.gHeadlessSessionIds.has(agySessionId))
                    continue;
                const t = {
                    provider: s.provider, cwd: s.cwd, sessionId: agySessionId, file,
                    offset: 0, lastSeen: 0, currentKey: '', activeAt: Date.now(),
                };
                let fresh = false;
                try {
                    const st = fs.statSync(file);
                    const birth = st.birthtimeMs || st.mtimeMs;
                    fresh = birth >= gStartAt;
                    t.mtime = st.mtimeMs;
                }
                catch {
                    continue;
                }
                if (!fresh)
                    t.lastSeen = await _agyMaxIdx(file);
                gTracked.set(file, t);
                if (fresh)
                    gHot.add(file);
            }
            continue;
        }
        const spec = SPECS[s.provider];
        if (!spec)
            continue;
        for (const file of spec.candidates(s.cwd)) {
            const known = gTracked.get(file);
            if (known) {
                if (!gHot.has(file)) {
                    try {
                        if (fs.statSync(file).size > known.offset) {
                            gHot.add(file);
                            known.activeAt = Date.now();
                        }
                    }
                    catch { }
                }
                continue;
            }
            const t = {
                provider: s.provider, cwd: s.cwd, sessionId: '',
                offset: 0, lastSeen: 0, currentKey: '', activeAt: Date.now(),
            };
            if (spec.verify && !spec.verify(file, s.cwd, t))
                continue;
            if (!t.sessionId)
                t.sessionId = spec.sessionIdOf(file);
            if (CAI.gHeadlessSessionIds.has(t.sessionId))
                continue;
            t.file = file;
            let fresh = false;
            try {
                const st = fs.statSync(file);
                const birth = st.birthtimeMs || st.mtimeMs;
                fresh = birth >= gStartAt;
                t.offset = fresh ? 0 : st.size;
            }
            catch {
                continue;
            }
            gTracked.set(file, t);
            if (fresh)
                gHot.add(file);
        }
    }
}
function _readFile(t, live, out) {
    const spec = SPECS[t.provider];
    if (!spec || !t.file)
        return;
    const lines = _readAppended(t.file, t);
    if (!lines.length)
        return;
    t.activeAt = Date.now();
    for (const line of lines) {
        try {
            const chunks = spec.parse(line);
            for (const c of chunks) {
                if (!c.model && t.model)
                    c.model = t.model;
                t.currentKey = _resolveKey(t.provider, t.cwd, c.role === 'user' ? c.text : null, live, t.currentKey);
                out.push({ ...c, key: t.currentKey, provider: t.provider, sessionId: t.sessionId, cwd: t.cwd });
            }
        }
        catch { }
    }
}
export async function Poll(live) {
    const out = [];
    try {
        const now = Date.now();
        if (now >= gNextScanAt) {
            gNextScanAt = now + SCAN_MS;
            await _scan(live);
        }
        for (const id of [...gHot]) {
            const t = gTracked.get(id);
            if (!t) {
                gHot.delete(id);
                continue;
            }
            if (t.provider === CAI.eProvider.opencode)
                await _opencodeRead(t, live, out);
            else if (t.provider === CAI.eProvider.antigravity)
                await _agyRead(t, live, out);
            else
                _readFile(t, live, out);
            if (Date.now() - t.activeAt > HOT_MS)
                gHot.delete(id);
        }
    }
    catch { }
    return out;
}

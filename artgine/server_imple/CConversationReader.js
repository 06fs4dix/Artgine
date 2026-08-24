import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CSQLite } from '../network/CSQLite.js';
import { CAI } from '../util/CAI.js';
import { CWASM } from '../basic/CWASM.js';
CWASM.IsSIMD();
const SCAN_MS = 0x1388;
const HOT_MS = 0xea60;
const gTracked = new Map();
const gHot = new Set();
let gNextScanAt = 0x0;
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
        out = out.replace(re, "");
    return out.trim();
}
const _textOf = (c, blockType = "\x74\x65\x78\x74") => typeof c === "\x73\x74\x72\x69\x6e\x67" ? c
    : Array.isArray(c) ? c.filter((b) => b?.type === blockType).map((b) => String(b.text ?? "")).join("")
        : "";
const _FILE_KEYS = ["\x66\x69\x6c\x65\x5f\x70\x61\x74\x68", "\x66\x69\x6c\x65\x50\x61\x74\x68", "\x74\x61\x72\x67\x65\x74\x5f\x66\x69\x6c\x65", "\x74\x61\x72\x67\x65\x74\x5f\x64\x69\x72\x65\x63\x74\x6f\x72\x79", "\x70\x61\x74\x68", "\x66\x69\x6c\x65", "\x66\x69\x6c\x65\x6e\x61\x6d\x65", "\x63\x6f\x6d\x6d\x61\x6e\x64", "\x75\x72\x6c"];
function _fileFromArgs(args) {
    if (args == null)
        return "";
    let obj = args;
    if (typeof args === "\x73\x74\x72\x69\x6e\x67") {
        const s = args.trim();
        if (!s)
            return "";
        try {
            obj = JSON.parse(s);
        }
        catch {
            return "";
        }
    }
    if (typeof obj !== "\x6f\x62\x6a\x65\x63\x74")
        return "";
    for (const k of _FILE_KEYS) {
        const v = obj[k];
        if (typeof v === "\x73\x74\x72\x69\x6e\x67" && v.trim())
            return v.trim();
        if (Array.isArray(v) && typeof v[0x0] === "\x73\x74\x72\x69\x6e\x67" && v[0x0].trim())
            return v[0x0].trim();
    }
    return "";
}
function _toolChunk(name, args, model, iso) {
    return { role: "\x74\x6f\x6f\x6c", text: "", model, iso, tool: String(name || "\x3f"), file: _fileFromArgs(args) };
}
function _normMatchText(text) {
    return text
        .replace(/\r\n/g, "\x0a")
        .replace(/\r/g, "\x0a")
        .replace(/[ \t\u00a0]+/g, "\x20")
        .replace(/\n{3,}/g, "\x0a\x0a")
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
    const minLen = 0xc;
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
    return peers.length === 0x1 ? peers[0x0].key : "";
}
function _matchKey(provider, cwd, text, live) {
    const peers = _peersOf(provider, cwd, live);
    if (peers.length === 0x0)
        return "";
    const hits = [];
    for (const s of peers) {
        const input = s.inputs.find(i => !i.used && _textsMatch(i.text, text));
        if (input)
            hits.push({ key: s.key, input });
    }
    if (hits.length === 0x1) {
        hits[0x0].input.used = true;
        return hits[0x0].key;
    }
    if (hits.length > 0x1)
        return "";
    const withUnused = peers.filter(s => s.inputs.some(i => !i.used));
    if (withUnused.length === 0x1) {
        const input = withUnused[0x0].inputs.find(i => !i.used);
        if (input)
            input.used = true;
        return withUnused[0x0].key;
    }
    if (peers.length === 0x1)
        return peers[0x0].key;
    return "";
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
        t.offset = 0x0;
    if (size === t.offset)
        return [];
    let fd;
    try {
        fd = fs.openSync(file, "\x72");
    }
    catch {
        return [];
    }
    try {
        const len = size - t.offset;
        const buf = Buffer.alloc(len);
        fs.readSync(fd, buf, 0x0, len, t.offset);
        const text = buf.toString("\x75\x74\x66\x38");
        const lastNl = text.lastIndexOf("\x0a");
        if (lastNl < 0x0)
            return [];
        t.offset += Buffer.byteLength(text.slice(0x0, lastNl + 0x1), "\x75\x74\x66\x38");
        return text.slice(0x0, lastNl).split("\x0a").filter(l => l.trim().length > 0x0);
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
    const iso = typeof rec.timestamp === "\x73\x74\x72\x69\x6e\x67" ? rec.timestamp : undefined;
    const model = typeof msg.model === "\x73\x74\x72\x69\x6e\x67" ? msg.model : "";
    if (rec.type === "\x75\x73\x65\x72") {
        const text = _cleanUserText(_textOf(msg.content));
        return text ? [{ role: "\x75\x73\x65\x72", text, model, iso }] : [];
    }
    if (rec.type !== "\x61\x73\x73\x69\x73\x74\x61\x6e\x74")
        return [];
    const out = [];
    if (Array.isArray(msg.content)) {
        for (const b of msg.content) {
            if (b?.type === "\x74\x6f\x6f\x6c\x5f\x75\x73\x65")
                out.push(_toolChunk(String(b.name ?? ""), b.input, model, iso));
        }
    }
    if (msg.stop_reason === "\x65\x6e\x64\x5f\x74\x75\x72\x6e") {
        const text = _textOf(msg.content).trim();
        if (text)
            out.push({ role: "\x61\x73\x73\x69\x73\x74\x61\x6e\x74", text, model, iso });
    }
    return out;
}
function _grokUnwrapQuery(text) {
    const m = text.match(/^<user_query>\r?\n?([\s\S]*?)\r?\n?<\/user_query>$/);
    return m ? m[0x1] : text;
}
function _grokParse(line) {
    const rec = JSON.parse(line);
    const model = typeof rec?.model_id === "\x73\x74\x72\x69\x6e\x67" ? rec.model_id : "";
    if (rec?.type === "\x75\x73\x65\x72") {
        const text = _cleanUserText(_grokUnwrapQuery(_textOf(rec.content).trim()));
        return text ? [{ role: "\x75\x73\x65\x72", text, model }] : [];
    }
    if (rec?.type !== "\x61\x73\x73\x69\x73\x74\x61\x6e\x74")
        return [];
    const calls = Array.isArray(rec.tool_calls) ? rec.tool_calls : null;
    if (calls && calls.length) {
        const out = [];
        for (const t of calls) {
            const name = String(t?.name ?? t?.function?.name ?? "");
            const args = t?.arguments ?? t?.function?.arguments ?? t?.input ?? t?.args;
            out.push(_toolChunk(name, args, model));
        }
        return out;
    }
    const text = _textOf(rec.content).trim();
    return text ? [{ role: "\x61\x73\x73\x69\x73\x74\x61\x6e\x74", text, model }] : [];
}
function _codexParse(line) {
    const rec = JSON.parse(line);
    const p = rec?.payload;
    if (!p)
        return [];
    const iso = typeof rec.timestamp === "\x73\x74\x72\x69\x6e\x67" ? rec.timestamp : undefined;
    if (rec.type === "\x65\x76\x65\x6e\x74\x5f\x6d\x73\x67" && p.type === "\x74\x61\x73\x6b\x5f\x63\x6f\x6d\x70\x6c\x65\x74\x65") {
        const text = String(p.last_agent_message ?? "").trim();
        return text ? [{ role: "\x61\x73\x73\x69\x73\x74\x61\x6e\x74", text, model: "", iso }] : [];
    }
    if (rec.type === "\x72\x65\x73\x70\x6f\x6e\x73\x65\x5f\x69\x74\x65\x6d" && p.type === "\x6d\x65\x73\x73\x61\x67\x65" && p.role === "\x75\x73\x65\x72") {
        const text = _cleanUserText(_textOf(p.content, "\x69\x6e\x70\x75\x74\x5f\x74\x65\x78\x74"));
        return text ? [{ role: "\x75\x73\x65\x72", text, model: "", iso }] : [];
    }
    if (rec.type === "\x72\x65\x73\x70\x6f\x6e\x73\x65\x5f\x69\x74\x65\x6d" && p.type === "\x66\x75\x6e\x63\x74\x69\x6f\x6e\x5f\x63\x61\x6c\x6c") {
        const name = String(p.name ?? "");
        const full = p.namespace ? `${p.namespace}/${name}` : name;
        return [_toolChunk(full, p.arguments, "", iso)];
    }
    return [];
}
function _codexCandidates() {
    const base = path.join(os.homedir(), "\x2e\x63\x6f\x64\x65\x78", "\x73\x65\x73\x73\x69\x6f\x6e\x73");
    const out = [];
    for (const off of [0x0, 0x1]) {
        const d = new Date(Date.now() - off * 0x5265c00);
        const dir = path.join(base, String(d.getFullYear()), String(d.getMonth() + 0x1).padStart(0x2, "\x30"), String(d.getDate()).padStart(0x2, "\x30"));
        for (const n of _listDir(dir, x => x.startsWith("\x72\x6f\x6c\x6c\x6f\x75\x74\x2d") && x.endsWith("\x2e\x6a\x73\x6f\x6e\x6c")))
            out.push(path.join(dir, n));
    }
    return out;
}
function _codexVerify(file, cwd, t) {
    try {
        const head = fs.readFileSync(file, "\x75\x74\x66\x38").split("\x0a")[0x0];
        const rec = JSON.parse(head);
        if (rec?.type !== "\x73\x65\x73\x73\x69\x6f\x6e\x5f\x6d\x65\x74\x61")
            return false;
        const p = rec.payload ?? {};
        if (path.resolve(String(p.cwd ?? "")) !== path.resolve(cwd))
            return false;
        t.sessionId = String(p.session_id ?? "");
        t.model = String(p.model ?? "");
        return true;
    }
    catch {
        return false;
    }
}
const SPECS = {
    [CAI.eProvider.claude]: {
        candidates: cwd => {
            const dir = path.join(os.homedir(), "\x2e\x63\x6c\x61\x75\x64\x65", "\x70\x72\x6f\x6a\x65\x63\x74\x73", cwd.replace(/[^a-zA-Z0-9]/g, "\x2d"));
            return _listDir(dir, n => n.endsWith("\x2e\x6a\x73\x6f\x6e\x6c")).map(n => path.join(dir, n));
        },
        sessionIdOf: f => path.basename(f, "\x2e\x6a\x73\x6f\x6e\x6c"),
        parse: _claudeParse,
    },
    [CAI.eProvider.grok]: {
        candidates: cwd => {
            const dir = path.join(os.homedir(), "\x2e\x67\x72\x6f\x6b", "\x73\x65\x73\x73\x69\x6f\x6e\x73", encodeURIComponent(cwd));
            return _listDir(dir, () => true).map(n => path.join(dir, n, "\x63\x68\x61\x74\x5f\x68\x69\x73\x74\x6f\x72\x79\x2e\x6a\x73\x6f\x6e\x6c"));
        },
        sessionIdOf: f => path.basename(path.dirname(f)),
        parse: _grokParse,
    },
    [CAI.eProvider.codex]: {
        candidates: _codexCandidates,
        verify: _codexVerify,
        sessionIdOf: f => path.basename(f, "\x2e\x6a\x73\x6f\x6e\x6c"),
        parse: _codexParse,
    },
};
const _OPENCODE_DB = path.join(os.homedir(), "\x2e\x6c\x6f\x63\x61\x6c", "\x73\x68\x61\x72\x65", "\x6f\x70\x65\x6e\x63\x6f\x64\x65", "\x6f\x70\x65\x6e\x63\x6f\x64\x65\x2e\x64\x62");
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
    const rows = await db.Recv("\x53\x45\x4c\x45\x43\x54\x20\x69\x64\x2c\x20\x64\x61\x74\x61\x2c\x20\x74\x69\x6d\x65\x5f\x63\x72\x65\x61\x74\x65\x64\x2c\x20\x74\x69\x6d\x65\x5f\x75\x70\x64\x61\x74\x65\x64\x20\x46\x52\x4f\x4d\x20\x6d\x65\x73\x73\x61\x67\x65\x20\x57\x48\x45\x52\x45\x20\x73\x65\x73\x73\x69\x6f\x6e\x5f\x69\x64\x20\x3d\x20\x3f\x20\x41\x4e\x44\x20\x74\x69\x6d\x65\x5f\x63\x72\x65\x61\x74\x65\x64\x20\x3e\x20\x3f\x20\x4f\x52\x44\x45\x52\x20\x42\x59\x20\x74\x69\x6d\x65\x5f\x63\x72\x65\x61\x74\x65\x64\x20\x41\x53\x43", [t.sessionId, t.lastSeen]);
    if (!rows || !rows.length)
        return;
    for (const r of rows) {
        const mid = String(r[0x0]);
        const tCreated = Number(r[0x2]);
        const tUpdated = Number(r[0x3]);
        let md;
        try {
            md = JSON.parse(String(r[0x1]));
        }
        catch {
            t.lastSeen = tCreated;
            continue;
        }
        const role = md?.role;
        if (role !== "\x75\x73\x65\x72" && role !== "\x61\x73\x73\x69\x73\x74\x61\x6e\x74") {
            t.lastSeen = tCreated;
            continue;
        }
        const partRows = await db.Recv("\x53\x45\x4c\x45\x43\x54\x20\x64\x61\x74\x61\x20\x46\x52\x4f\x4d\x20\x70\x61\x72\x74\x20\x57\x48\x45\x52\x45\x20\x6d\x65\x73\x73\x61\x67\x65\x5f\x69\x64\x20\x3d\x20\x3f", [mid]);
        const parts = (partRows ?? []).map((p) => { try {
            return JSON.parse(String(p[0x0]));
        }
        catch {
            return null;
        } })
            .filter((p) => p);
        const types = new Set(parts.map((p) => String(p.type)));
        if (role === "\x61\x73\x73\x69\x73\x74\x61\x6e\x74" && !types.has("\x73\x74\x65\x70\x2d\x66\x69\x6e\x69\x73\x68") && Date.now() - tUpdated < 0x2710)
            break;
        t.lastSeen = tCreated;
        t.activeAt = Date.now();
        const model = String(md?.modelID ?? "");
        const iso = new Date(tCreated).toISOString();
        if (role === "\x61\x73\x73\x69\x73\x74\x61\x6e\x74" && types.has("\x74\x6f\x6f\x6c")) {
            t.currentKey = _resolveKey(t.provider, t.cwd, null, live, t.currentKey);
            for (const p of parts) {
                if (p.type !== "\x74\x6f\x6f\x6c")
                    continue;
                const name = String(p.tool ?? p.name ?? "");
                const input = p.state?.input ?? p.input;
                const chunk = _toolChunk(name, input, model, iso);
                out.push({ ...chunk, key: t.currentKey, provider: t.provider, sessionId: t.sessionId, cwd: t.cwd });
            }
            continue;
        }
        const raw = parts.filter((p) => p.type === "\x74\x65\x78\x74").map((p) => String(p.text ?? "")).join("");
        const text = role === "\x75\x73\x65\x72" ? _cleanUserText(raw) : raw.trim();
        if (!text)
            continue;
        t.currentKey = _resolveKey(t.provider, t.cwd, role === "\x75\x73\x65\x72" ? text : null, live, t.currentKey);
        out.push({
            key: t.currentKey, provider: t.provider, sessionId: t.sessionId, cwd: t.cwd,
            role, text, model, iso,
        });
    }
}
const AGY_BASE = path.join(os.homedir(), "\x2e\x67\x65\x6d\x69\x6e\x69", "\x61\x6e\x74\x69\x67\x72\x61\x76\x69\x74\x79\x2d\x63\x6c\x69");
const AGY_CONV_DIR = path.join(AGY_BASE, "\x63\x6f\x6e\x76\x65\x72\x73\x61\x74\x69\x6f\x6e\x73");
const AGY_USER = 0xe, AGY_ASST = 0xf, AGY_TITLE = 0x17, AGY_START = 0x62;
const AGY_SETTLE_MS = 0x2710;
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
    let result = 0x0, shift = 0x0, pos = p;
    while (pos < buf.length) {
        const b = buf[pos++];
        result += (b & 0x7f) * Math.pow(0x2, shift);
        if ((b & 0x80) === 0x0)
            return [result, pos];
        shift += 0x7;
        if (shift > 0x3f)
            break;
    }
    return [0x0, -0x1];
}
function* _pbFields(buf, start = 0x0, end = buf.length) {
    let p = start;
    while (p < end) {
        const [tag, p1] = _pbVarint(buf, p);
        if (p1 < 0x0)
            return;
        const field = Math.floor(tag / 0x8), wire = tag & 0x7;
        p = p1;
        if (wire === 0x0) {
            const [v, p2] = _pbVarint(buf, p);
            if (p2 < 0x0)
                return;
            yield { field, wire, varint: v };
            p = p2;
        }
        else if (wire === 0x2) {
            const [len, p2] = _pbVarint(buf, p);
            if (p2 < 0x0 || p2 + len > end)
                return;
            yield { field, wire, bytes: buf.subarray(p2, p2 + len) };
            p = p2 + len;
        }
        else if (wire === 0x5)
            p += 0x4;
        else if (wire === 0x1)
            p += 0x8;
        else
            return;
    }
}
function _pbGetBytes(buf, field) {
    for (const f of _pbFields(buf))
        if (f.field === field && f.wire === 0x2)
            return f.bytes;
    return null;
}
function _pbGetVarint(buf, field) {
    for (const f of _pbFields(buf))
        if (f.field === field && f.wire === 0x0)
            return f.varint;
    return null;
}
function _agyProse(s) {
    const t = s.trim();
    if (t.length < 0x2)
        return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t))
        return false;
    if (/^(file:|https?:|[A-Za-z]:[\\/]|\/)/.test(t))
        return false;
    return /[A-Za-z가-힣]/.test(t);
}
function _agyFallbackText(buf, depth = 0x0) {
    let best = "";
    for (const f of _pbFields(buf)) {
        if (f.wire !== 0x2 || !f.bytes)
            continue;
        if (depth < 0x6) {
            const nested = _agyFallbackText(f.bytes, depth + 0x1);
            if (nested.length > best.length)
                best = nested;
        }
        const s = f.bytes.toString("\x75\x74\x66\x38");
        if (Buffer.byteLength(s, "\x75\x74\x66\x38") !== f.bytes.length)
            continue;
        if (_agyProse(s) && s.length > best.length)
            best = s;
    }
    return best;
}
function _agyStepText(payload, stepType) {
    const [outer, inner] = stepType === AGY_USER ? [0x13, 0x2] : [0x14, 0x1];
    const content = _pbGetBytes(payload, outer);
    if (content) {
        const s = _pbGetBytes(content, inner);
        if (s && s.length) {
            const txt = s.toString("\x75\x74\x66\x38");
            if (txt.trim())
                return txt;
        }
    }
    return _agyFallbackText(payload);
}
function _agyIso(payload) {
    const meta = _pbGetBytes(payload, 0x5);
    if (!meta)
        return undefined;
    const ts = _pbGetBytes(meta, 0x1);
    if (!ts)
        return undefined;
    const secs = _pbGetVarint(ts, 0x1);
    if (!secs)
        return undefined;
    const nanos = _pbGetVarint(ts, 0x2) ?? 0x0;
    return new Date(secs * 0x3e8 + Math.floor(nanos / 0xf4240)).toISOString();
}
function _agyFindMarker(buf, prefix, depth = 0x0) {
    for (const f of _pbFields(buf)) {
        if (f.wire !== 0x2 || !f.bytes)
            continue;
        const s = f.bytes.toString("\x75\x74\x66\x38");
        if (s.startsWith(prefix))
            return s;
        if (depth < 0x8) {
            const r = _agyFindMarker(f.bytes, prefix, depth + 0x1);
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
    return path.resolve(raw.replace(/\//g, "\x5c")).toLowerCase();
}
async function _agyResolveCwd(file) {
    const cached = gAgyCwd.get(file);
    if (cached !== undefined)
        return cached;
    const db = await _agyDb(file);
    if (!db)
        return "";
    const rows = await db.Recv("\x53\x45\x4c\x45\x43\x54\x20\x73\x74\x65\x70\x5f\x70\x61\x79\x6c\x6f\x61\x64\x20\x46\x52\x4f\x4d\x20\x73\x74\x65\x70\x73\x20\x57\x48\x45\x52\x45\x20\x73\x74\x65\x70\x5f\x74\x79\x70\x65\x20\x3d\x20\x3f\x20\x4f\x52\x44\x45\x52\x20\x42\x59\x20\x69\x64\x78\x20\x41\x53\x43\x20\x4c\x49\x4d\x49\x54\x20\x31", [AGY_USER]);
    const raw = rows?.[0x0]?.[0x0];
    if (!raw)
        return "";
    const payload = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    const url = _agyFindMarker(payload, "\x66\x69\x6c\x65\x3a\x2f\x2f\x2f");
    const cwd = url ? _agyNormCwd(url.slice("\x66\x69\x6c\x65\x3a\x2f\x2f\x2f".length)) : "";
    if (cwd)
        gAgyCwd.set(file, cwd);
    return cwd;
}
async function _agyMaxIdx(file) {
    const db = await _agyDb(file);
    if (!db)
        return 0x0;
    const r = await db.Recv("\x53\x45\x4c\x45\x43\x54\x20\x4d\x41\x58\x28\x69\x64\x78\x29\x20\x46\x52\x4f\x4d\x20\x73\x74\x65\x70\x73", []);
    return Number(r?.[0x0]?.[0x0] ?? 0x0);
}
function _agyFlushPending(t, live, out) {
    if (!t.pendText)
        return;
    t.currentKey = _resolveKey(t.provider, t.cwd, null, live, t.currentKey);
    out.push({ key: t.currentKey, provider: t.provider, sessionId: t.sessionId, cwd: t.cwd,
        role: "\x61\x73\x73\x69\x73\x74\x61\x6e\x74", text: t.pendText, model: "", iso: t.pendIso });
    t.pendText = undefined;
    t.pendIso = undefined;
}
async function _agyRead(t, live, out) {
    if (!t.file)
        return;
    const db = await _agyDb(t.file);
    if (!db)
        return;
    const rows = await db.Recv("\x53\x45\x4c\x45\x43\x54\x20\x69\x64\x78\x2c\x20\x73\x74\x65\x70\x5f\x74\x79\x70\x65\x2c\x20\x73\x74\x65\x70\x5f\x70\x61\x79\x6c\x6f\x61\x64\x20\x46\x52\x4f\x4d\x20\x73\x74\x65\x70\x73\x20\x57\x48\x45\x52\x45\x20\x69\x64\x78\x20\x3e\x20\x3f\x20\x4f\x52\x44\x45\x52\x20\x42\x59\x20\x69\x64\x78\x20\x41\x53\x43", [t.lastSeen]);
    for (const r of rows ?? []) {
        const idx = Number(r[0x0]);
        const stype = Number(r[0x1]);
        const raw = r[0x2];
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
                role: "\x75\x73\x65\x72", text, model: "", iso: _agyIso(payload) });
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
            const rows = await db.Recv("\x53\x45\x4c\x45\x43\x54\x20\x69\x64\x20\x46\x52\x4f\x4d\x20\x73\x65\x73\x73\x69\x6f\x6e\x20\x57\x48\x45\x52\x45\x20\x64\x69\x72\x65\x63\x74\x6f\x72\x79\x20\x3d\x20\x3f", [s.cwd.replace(/\\/g, "\x2f")]);
            const sids = (rows ?? []).map((r) => String(r[0x0]));
            const coldIds = sids.filter(sid => { const k = gTracked.get(`opencode:${sid}`); return k && !gHot.has(`opencode:${sid}`); });
            const newIds = sids.filter(sid => !gTracked.has(`opencode:${sid}`));
            if (coldIds.length) {
                const ph = coldIds.map(() => "\x3f").join("\x2c");
                const mx = await db.Recv(`SELECT session_id, MAX(time_created) FROM message WHERE session_id IN (${ph}) GROUP BY session_id`, coldIds);
                const maxMap = new Map((mx ?? []).map((r) => [String(r[0x0]), Number(r[0x1])]));
                for (const sid of coldIds) {
                    const known = gTracked.get(`opencode:${sid}`);
                    const lastMax = maxMap.get(sid) ?? 0x0;
                    if (lastMax > known.lastSeen) {
                        gHot.add(`opencode:${sid}`);
                        known.activeAt = Date.now();
                    }
                }
            }
            if (newIds.length) {
                const ph = newIds.map(() => "\x3f").join("\x2c");
                const mm = await db.Recv(`SELECT session_id, MIN(time_created), MAX(time_created) FROM message WHERE session_id IN (${ph}) GROUP BY session_id`, newIds);
                const rangeMap = new Map((mm ?? []).map((r) => [String(r[0x0]), { min: Number(r[0x1]), max: Number(r[0x2]) }]));
                for (const sid of newIds) {
                    if (CAI.gHeadlessSessionIds.has(sid))
                        continue;
                    const range = rangeMap.get(sid) ?? { min: 0x0, max: 0x0 };
                    const fresh = (range.min === 0x0 || range.min >= gStartAt);
                    const id = `opencode:${sid}`;
                    gTracked.set(id, {
                        provider: s.provider, cwd: s.cwd, sessionId: sid,
                        offset: 0x0, lastSeen: fresh ? 0x0 : range.max, currentKey: "", activeAt: Date.now(),
                    });
                    if (fresh)
                        gHot.add(id);
                }
            }
            continue;
        }
        if (s.provider === CAI.eProvider.antigravity) {
            const wantCwd = _agyNormCwd(s.cwd);
            for (const name of _listDir(AGY_CONV_DIR, n => n.endsWith("\x2e\x64\x62"))) {
                const file = path.join(AGY_CONV_DIR, name);
                const known = gTracked.get(file);
                if (known) {
                    if (!gHot.has(file)) {
                        try {
                            const mt = fs.statSync(file).mtimeMs;
                            if (mt > (known.mtime ?? 0x0)) {
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
                const agySessionId = path.basename(file, "\x2e\x64\x62");
                if (CAI.gHeadlessSessionIds.has(agySessionId))
                    continue;
                const t = {
                    provider: s.provider, cwd: s.cwd, sessionId: agySessionId, file,
                    offset: 0x0, lastSeen: 0x0, currentKey: "", activeAt: Date.now(),
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
                provider: s.provider, cwd: s.cwd, sessionId: "",
                offset: 0x0, lastSeen: 0x0, currentKey: "", activeAt: Date.now(),
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
                t.offset = fresh ? 0x0 : st.size;
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
                t.currentKey = _resolveKey(t.provider, t.cwd, c.role === "\x75\x73\x65\x72" ? c.text : null, live, t.currentKey);
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

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CAIInfoRouter_1;
import { URLPatterns } from '../network/CServerMain.js';
import { CAuthServer, isAuthedReq, isValidToken } from './CAuthServer.js';
import { spawnSync } from 'child_process';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { CAI } from '../util/CAI.js';
import { CPath } from '../basic/CPath.js';
import { CConsol } from '../basic/CConsol.js';
import { CSQLite } from '../network/CSQLite.js';
import { GetAppJSON, GetRootPaths, SetRootPaths, GetLoadedSettingsFileName } from '../../desktop/MainFunc.js';
import { CUtilSystem } from '../system/CUtilSystem.js';
const SETTINGS_FILE = path.join(CAI.AIDir(), 'settings.json');
const _PROVIDER_STATE_LIST = Object.values(CAI.eProvider).filter(p => p !== CAI.eProvider.gpt);
let _modelsUpdateOnceDone = false;
const _COST_MODELS_DEV_API = 'https://models.dev/api.json';
const _COST_GROUP_TO_PROVIDER = { claude: 'anthropic', codex: 'openai', grok: 'xai' };
function _costAntigravityProviderFor(value) {
    if (value.startsWith('claude-'))
        return 'anthropic';
    if (value.startsWith('gemini-'))
        return 'google';
    if (value.startsWith('gpt-oss-'))
        return 'openai';
    return null;
}
function _costModelIdCandidates(value) {
    const out = [];
    let m = value.replace(/^(opencode\/|opencode-go\/)/, '');
    const noFree = m.replace(/-free$/, '');
    if (noFree !== m)
        out.push(noFree);
    const noThinking = m.replace(/-thinking$/, '');
    if (noThinking !== m && !out.includes(noThinking))
        out.push(noThinking);
    const noEffort = m.replace(/-(high|medium|low|max|xhigh)$/, '');
    if (noEffort !== m && !out.includes(noEffort))
        out.push(noEffort);
    if (m.startsWith('gemini-') && noEffort !== m) {
        const withPreview = noEffort + '-preview';
        if (!out.includes(withPreview))
            out.push(withPreview);
    }
    const noDate = m.replace(/-\d{8}$/, '');
    if (noDate !== m && !out.includes(noDate))
        out.push(noDate);
    if (!out.includes(m))
        out.push(m);
    return out;
}
function _costFindModel(providerBlock, candidates) {
    if (!providerBlock || !providerBlock.models)
        return null;
    for (const id of candidates) {
        const m = providerBlock.models[id];
        if (m)
            return { id, model: m };
    }
    const lowered = candidates.map(c => c.toLowerCase());
    for (const [key, m] of Object.entries(providerBlock.models)) {
        if (lowered.includes(key.toLowerCase()))
            return { id: key, model: m };
    }
    return null;
}
function _costFindModelGlobal(api, candidates) {
    const hits = [];
    for (const [pk, pv] of Object.entries(api)) {
        if (!pv || !pv.models)
            continue;
        for (const id of candidates) {
            const m = pv.models[id];
            if (m) {
                const c = m.cost || {};
                const hasPrice = typeof c.input === 'number' && c.input > 0;
                hits.push({ providerId: pk, id, model: m, hasPrice });
                break;
            }
        }
    }
    if (!hits.length)
        return null;
    hits.sort((a, b) => (b.hasPrice ? 1 : 0) - (a.hasPrice ? 1 : 0));
    return hits[0];
}
function _costExtractPrice(modelEntry) {
    if (!modelEntry || !modelEntry.cost)
        return { input: null, output: null, cachedRead: null, cachedWrite: null };
    const c = modelEntry.cost;
    const input = (typeof c.input === 'number') ? c.input : null;
    const output = (typeof c.output === 'number') ? c.output : null;
    const cachedRead = (typeof c.cache_read === 'number') ? c.cache_read : null;
    const cachedWrite = (typeof c.cache_write === 'number') ? c.cache_write : null;
    return { input, output, cachedRead, cachedWrite };
}
async function _fetchOpencodeGoOfficialPrices() {
    try {
        const res = await fetch('https://opencode.ai/docs/go/', { headers: { 'User-Agent': 'artgine-token-cost/1.0' }, signal: AbortSignal.timeout(15000) });
        if (!res.ok)
            throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const html = await res.text();
        const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
        const table = tableMatches.find(t => /Cached\s*Read/i.test(t));
        if (!table)
            throw new Error('pricing table not found (no "Cached Read" header)');
        const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim();
        const parseUsd = (s) => {
            const m = s.replace(/,/g, '').match(/[\d.]+/);
            return m ? parseFloat(m[0]) : null;
        };
        const rowsHtml = table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
        const out = {};
        for (const rowHtml of rowsHtml) {
            const cells = (rowHtml.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? []).map(stripTags);
            if (cells.length < 5)
                continue;
            const [rawName, rawInput, rawOutput, rawCachedRead, rawCachedWrite] = cells;
            const input = parseUsd(rawInput);
            const output = parseUsd(rawOutput);
            if (input == null || output == null)
                continue;
            const slug = rawName.replace(/\([^)]*\)/g, '').trim().toLowerCase().replace(/\s+/g, '-');
            if (!slug || slug in out)
                continue;
            out[slug] = { input, output, cachedRead: parseUsd(rawCachedRead), cachedWrite: parseUsd(rawCachedWrite) };
        }
        if (!Object.keys(out).length)
            throw new Error('pricing table parsed but empty');
        return out;
    }
    catch (e) {
        CConsol.Log(`[CAIInfoRouter] opencode.ai Go 단가표 크롤링 실패, models.dev로 폴백: ${e?.message ?? e}`, CConsol.eColor.yellow);
        return null;
    }
}
async function _annotateModelCosts(settings) {
    const groups = settings.models;
    if (!groups || typeof groups !== 'object')
        return;
    let api;
    try {
        const res = await fetch(_COST_MODELS_DEV_API, { headers: { 'User-Agent': 'artgine-token-cost/1.0' } });
        if (!res.ok)
            throw new Error(`HTTP ${res.status} ${res.statusText}`);
        api = await res.json();
    }
    catch (e) {
        CConsol.Log(`[CAIInfoRouter] modelsUpdate: models.dev fetch 실패, 비용 정보는 건너뜀: ${e?.message ?? e}`, CConsol.eColor.yellow);
        return;
    }
    const opencodeGoPrices = await _fetchOpencodeGoOfficialPrices();
    const rows = [];
    for (const [group, list] of Object.entries(groups)) {
        if (!Array.isArray(list))
            continue;
        for (const item of list) {
            const value = String(item.value ?? '');
            let providerId = null;
            let isLocal = false;
            if (group in _COST_GROUP_TO_PROVIDER) {
                providerId = _COST_GROUP_TO_PROVIDER[group];
            }
            else if (group === 'opencode') {
                if (value.startsWith('opencode-go/'))
                    providerId = 'opencode-go';
                else if (value.startsWith('opencode/'))
                    providerId = 'opencode';
                else if (/^ollama-[^/]+\//.test(value))
                    isLocal = true;
            }
            else if (group === 'antigravity') {
                providerId = _costAntigravityProviderFor(value);
            }
            else if (group === 'grok') {
                providerId = 'xai';
            }
            const officialSlug = (group === 'opencode' && value.startsWith('opencode-go/')) ? value.slice('opencode-go/'.length) : null;
            const official = (officialSlug && opencodeGoPrices) ? opencodeGoPrices[officialSlug] : null;
            let input = null, output = null;
            let cachedRead = null, cachedWrite = null;
            if (isLocal) {
                input = 0;
                output = 0;
                cachedRead = 0;
                cachedWrite = 0;
            }
            else if (official) {
                input = official.input;
                output = official.output;
                cachedRead = official.cachedRead;
                cachedWrite = official.cachedWrite;
            }
            else if (providerId) {
                const candidates = _costModelIdCandidates(value);
                const hit = _costFindModel(api[providerId], candidates);
                if (hit) {
                    const p = _costExtractPrice(hit.model);
                    input = p.input;
                    output = p.output;
                    cachedRead = p.cachedRead;
                    cachedWrite = p.cachedWrite;
                }
                else {
                    const g = _costFindModelGlobal(api, candidates);
                    if (g) {
                        const p = _costExtractPrice(g.model);
                        input = p.input;
                        output = p.output;
                        cachedRead = p.cachedRead;
                        cachedWrite = p.cachedWrite;
                    }
                }
            }
            item.costInputPer1M = input;
            item.costOutputPer1M = output;
            item.costCachedReadPer1M = cachedRead;
            item.costCachedWritePer1M = cachedWrite;
            rows.push({ group, item, input, output });
        }
    }
    const minInputByGroup = {}, minOutputByGroup = {};
    for (const r of rows) {
        if (r.input != null && r.input > 0 && (!(r.group in minInputByGroup) || r.input < minInputByGroup[r.group])) {
            minInputByGroup[r.group] = r.input;
        }
        if (r.output != null && r.output > 0 && (!(r.group in minOutputByGroup) || r.output < minOutputByGroup[r.group])) {
            minOutputByGroup[r.group] = r.output;
        }
    }
    for (const r of rows) {
        const bi = minInputByGroup[r.group], bo = minOutputByGroup[r.group];
        r.item.costRatioInput = (bi && r.input != null && r.input > 0) ? Math.round((r.input / bi) * 100) :
            (r.input === 0 ? 0 : null);
        r.item.costRatioOutput = (bo && r.output != null && r.output > 0) ? Math.round((r.output / bo) * 100) :
            (r.output === 0 ? 0 : null);
    }
    const avgCost = (item) => {
        const i = item.costInputPer1M, o = item.costOutputPer1M;
        if (i == null && o == null)
            return -1;
        return ((i ?? 0) + (o ?? 0)) / 2;
    };
    for (const list of Object.values(groups)) {
        if (!Array.isArray(list))
            continue;
        list.sort((a, b) => avgCost(b) - avgCost(a));
    }
}
const CLAUDE_WARMUP_COOLDOWN_MS = 5 * 60 * 1000;
let _lastClaudeWarmupAt = 0;
const AGY_USAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const AGY_USAGE_FAIL_CACHE_TTL_MS = 15 * 1000;
let _agyUsageCache = null;
async function _getAgyUsageCached() {
    if (_agyUsageCache) {
        const failed = _agyUsageCache.value.fiveHour < 0 && _agyUsageCache.value.weekly < 0;
        const ttl = failed ? AGY_USAGE_FAIL_CACHE_TTL_MS : AGY_USAGE_CACHE_TTL_MS;
        if (Date.now() - _agyUsageCache.at < ttl)
            return _agyUsageCache.value;
    }
    const value = await CAI.ProviderUsage(CAI.eProvider.antigravity);
    _agyUsageCache = { at: Date.now(), value };
    return value;
}
function _listFilesRecursive(dir, filter) {
    const out = [];
    const walk = (d) => {
        let entries;
        try {
            entries = fs.readdirSync(d, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const e of entries) {
            const full = path.join(d, e.name);
            if (e.isDirectory())
                walk(full);
            else if (e.isFile() && filter(e.name))
                out.push(full);
        }
    };
    walk(dir);
    return out;
}
function _pruneClaude(cutoffMs) {
    const dir = path.join(os.homedir(), '.claude', 'projects');
    let n = 0;
    for (const f of _listFilesRecursive(dir, name => name.endsWith('.jsonl'))) {
        try {
            if (fs.statSync(f).mtimeMs < cutoffMs) {
                fs.unlinkSync(f);
                n++;
            }
        }
        catch { }
    }
    return n;
}
function _pruneCodex(cutoffMs) {
    const dir = path.join(os.homedir(), '.codex', 'sessions');
    let n = 0;
    for (const f of _listFilesRecursive(dir, name => name.startsWith('rollout-') && name.endsWith('.jsonl'))) {
        try {
            if (fs.statSync(f).mtimeMs < cutoffMs) {
                fs.unlinkSync(f);
                n++;
            }
        }
        catch { }
    }
    return n;
}
function _pruneGrok(cutoffMs) {
    const base = path.join(os.homedir(), '.grok', 'sessions');
    let n = 0;
    let cwdDirs;
    try {
        cwdDirs = fs.readdirSync(base, { withFileTypes: true });
    }
    catch {
        return 0;
    }
    for (const cd of cwdDirs) {
        if (!cd.isDirectory())
            continue;
        const cwdPath = path.join(base, cd.name);
        let sessDirs;
        try {
            sessDirs = fs.readdirSync(cwdPath, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const sd of sessDirs) {
            if (!sd.isDirectory())
                continue;
            const sessPath = path.join(cwdPath, sd.name);
            let mtime;
            try {
                mtime = fs.statSync(path.join(sessPath, 'chat_history.jsonl')).mtimeMs;
            }
            catch {
                try {
                    mtime = fs.statSync(sessPath).mtimeMs;
                }
                catch {
                    continue;
                }
            }
            if (mtime < cutoffMs) {
                try {
                    fs.rmSync(sessPath, { recursive: true, force: true });
                    n++;
                }
                catch { }
            }
        }
    }
    return n;
}
async function _pruneOpencode(cutoffMs) {
    const dbPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');
    if (!fs.existsSync(dbPath))
        return 0;
    const db = new CSQLite();
    db.mDatabase = dbPath;
    await db.Init();
    const rows = await db.Recv('SELECT id FROM session WHERE time_updated < ?', [cutoffMs]);
    const ids = (rows ?? []).map((r) => String(r[0]));
    const CHUNK = 500;
    for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const ph = chunk.map(() => '?').join(',');
        await db.Send(`DELETE FROM part WHERE session_id IN (${ph})`, chunk);
        await db.Send(`DELETE FROM message WHERE session_id IN (${ph})`, chunk);
        await db.Send(`DELETE FROM session WHERE id IN (${ph})`, chunk);
    }
    return ids.length;
}
async function _pruneAntigravity(cutoffMs) {
    const base = path.join(os.homedir(), '.gemini', 'antigravity-cli');
    let n = 0;
    for (const f of _listFilesRecursive(path.join(base, 'conversations'), name => name.endsWith('.db'))) {
        try {
            if (fs.statSync(f).mtimeMs < cutoffMs) {
                fs.unlinkSync(f);
                n++;
            }
        }
        catch { }
    }
    const brainDir = path.join(base, 'brain');
    try {
        for (const e of fs.readdirSync(brainDir, { withFileTypes: true })) {
            if (!e.isDirectory())
                continue;
            const full = path.join(brainDir, e.name);
            try {
                if (fs.statSync(full).mtimeMs < cutoffMs) {
                    fs.rmSync(full, { recursive: true, force: true });
                    n++;
                }
            }
            catch { }
        }
    }
    catch { }
    const summariesPath = path.join(base, 'conversation_summaries.db');
    if (fs.existsSync(summariesPath)) {
        try {
            const cutoffStr = new Date(cutoffMs).toISOString().replace('T', ' ').slice(0, 19);
            const db = new CSQLite();
            db.mDatabase = summariesPath;
            await db.Init();
            const rows = await db.Recv('SELECT conversation_id FROM conversation_summaries WHERE last_modified_time < ?', [cutoffStr]);
            const ids = (rows ?? []).map((r) => String(r[0]));
            if (ids.length) {
                const ph = ids.map(() => '?').join(',');
                await db.Send(`DELETE FROM conversation_summaries WHERE conversation_id IN (${ph})`, ids);
                n += ids.length;
            }
        }
        catch { }
    }
    const historyPath = path.join(base, 'history.jsonl');
    try {
        const lines = fs.readFileSync(historyPath, 'utf8').split('\n');
        const kept = [];
        let dropped = 0;
        for (const line of lines) {
            if (!line.trim())
                continue;
            try {
                const rec = JSON.parse(line);
                if (typeof rec.timestamp === 'number' && rec.timestamp < cutoffMs) {
                    dropped++;
                    continue;
                }
            }
            catch { }
            kept.push(line);
        }
        if (dropped > 0) {
            fs.writeFileSync(historyPath, kept.join('\n') + '\n', 'utf8');
            n += dropped;
        }
    }
    catch { }
    return n;
}
function _cpuTimesSnapshot() {
    let idle = 0, total = 0;
    for (const c of os.cpus()) {
        const t = c.times;
        idle += t.idle;
        total += t.user + t.nice + t.sys + t.idle + t.irq;
    }
    return { idle, total };
}
async function _sampleServerLoad(sampleMs = 200) {
    const cpu0 = _cpuTimesSnapshot();
    await new Promise(r => setTimeout(r, sampleMs));
    const cpu1 = _cpuTimesSnapshot();
    const totalDiff = cpu1.total - cpu0.total;
    const idleDiff = cpu1.idle - cpu0.idle;
    const cpuPercent = totalDiff > 0 ? Math.max(0, Math.min(100, Math.round((1 - idleDiff / totalDiff) * 100))) : 0;
    return { cpuPercent };
}
const gInstanceId = randomUUID();
let CAIInfoRouter = CAIInfoRouter_1 = class CAIInfoRouter extends CAuthServer {
    IsAuth(_json, req) {
        const token = _json.GetStr('token');
        return token ? isValidToken(token) : isAuthedReq(req);
    }
    constructor() {
        super();
        this.On("/AIInfo/setting", this.onGetSettingJSON.bind(this));
        this.On("/AIInfo/provider-state", this.onProviderState.bind(this));
        this.On("/AIInfo/server-info", this.onServerInfo.bind(this));
        this.On("/AIInfo/opencode-pushLocal", this.onPushOpencodeModel.bind(this));
        this.On("/AIInfo/opencode-statusLocal", this.onOpencodeProviderStatus.bind(this));
        this.On("/AIInfo/prune-conversations", this.onPruneConversations.bind(this));
        this.On("/AIInfo/workfolder", this.onGetWorkFolder.bind(this));
        this.On("/AIInfo/workfolder-set", this.onSetWorkFolder.bind(this));
        this.On("/AIInfo/whoami", this.onWhoAmI.bind(this));
    }
    async onWhoAmI(_json, _req, _res) {
        _res.json({ ok: true, instanceId: gInstanceId });
        return null;
    }
    Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() {
        void CAIInfoRouter_1._maybeUpdateModelsOnStart();
    }
    static async _maybeUpdateModelsOnStart() {
        if (_modelsUpdateOnceDone)
            return;
        _modelsUpdateOnceDone = true;
        const settingsPath = path.join(CAI.AIDir(), 'settings.json');
        let settings;
        try {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        catch (e) {
            CConsol.Log(`[CAIInfoRouter] modelsUpdate: settings.json read failed: ${e?.message ?? e}`, CConsol.eColor.red);
            return;
        }
        if (!settings || typeof settings !== 'object')
            return;
        if (settings.modelsUpdate !== true)
            return;
        CConsol.Log('[CAIInfoRouter] modelsUpdate=true → refreshing models from providers…', CConsol.eColor.cyan);
        if (!settings.models || typeof settings.models !== 'object')
            settings.models = {};
        const providers = _PROVIDER_STATE_LIST;
        for (const p of providers) {
            try {
                const list = await CAI.ProviderModels(p);
                if (list.length > 0) {
                    settings.models[p] = list;
                    CConsol.Log(`[CAIInfoRouter] modelsUpdate ${p}: ${list.length} models`, CConsol.eColor.cyan);
                }
                else {
                    CConsol.Log(`[CAIInfoRouter] modelsUpdate ${p}: empty (keep existing)`, CConsol.eColor.yellow);
                }
            }
            catch (e) {
                CConsol.Log(`[CAIInfoRouter] modelsUpdate ${p} failed: ${e?.message ?? e}`, CConsol.eColor.red);
            }
        }
        await _annotateModelCosts(settings);
        try {
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
            CConsol.Log('[CAIInfoRouter] modelsUpdate done', CConsol.eColor.cyan);
        }
        catch (e) {
            CConsol.Log(`[CAIInfoRouter] modelsUpdate: settings.json write failed: ${e?.message ?? e}`, CConsol.eColor.red);
        }
    }
    async onGetSettingJSON(_json, _req, _res) {
        try {
            _res.json(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')));
        }
        catch {
            _res.json({});
        }
        return null;
    }
    async onGetWorkFolder(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        try {
            _res.json({ ok: true, rootPath: GetRootPaths(await GetAppJSON()) });
        }
        catch (e) {
            _res.status(500).json({ ok: false, msg: String(e?.message ?? e) });
        }
        return null;
    }
    async onSetWorkFolder(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        try {
            const arr = _json.GetArray('rootPath');
            const list = Array.isArray(arr?.mArray)
                ? arr.mArray.map((s) => String(s).trim()).filter(Boolean)
                : [];
            if (!list.length) {
                _res.status(400).json({ ok: false, msg: 'rootPath required' });
                return null;
            }
            SetRootPaths(list);
            _res.json({ ok: true, rootPath: GetRootPaths() });
            await CUtilSystem.Spawn('npm', ['run', 'start', '--', GetLoadedSettingsFileName()], 'ignore', process.cwd(), null, true, false);
        }
        catch (e) {
            if (!_res.headersSent)
                _res.status(500).json({ ok: false, msg: String(e?.message ?? e) });
        }
        return null;
    }
    async onProviderState(_json, _req, _res) {
        const filterRaw = String(_req.query?.providers ?? '').trim();
        const filter = filterRaw ? new Set(filterRaw.split(',').map(s => s.trim()).filter(Boolean)) : null;
        const targets = filter ? _PROVIDER_STATE_LIST.filter(p => filter.has(p)) : _PROVIDER_STATE_LIST;
        const list = await Promise.all(targets.map(async (p) => {
            const info = await CAI.ProviderInfo(p);
            const usage = (p === CAI.eProvider.antigravity && info.installed && info.authenticated)
                ? await _getAgyUsageCached()
                : await CAI.ProviderUsage(p);
            if (p === CAI.eProvider.opencode && info.authenticated && usage.fiveHour < 0 && usage.weekly < 0) {
                return { ...info, usage: { fiveHour: 1, weekly: 1 } };
            }
            if (p === CAI.eProvider.claude && info.installed && info.authenticated
                && usage.fiveHour < 0 && usage.weekly < 0
                && Date.now() - _lastClaudeWarmupAt > CLAUDE_WARMUP_COOLDOWN_MS) {
                _lastClaudeWarmupAt = Date.now();
                try {
                    const model = info.models[0]?.value ?? '';
                    await CAI.Chat(p, model, os.tmpdir(), 'usage check, no reply', false);
                    const retried = await CAI.ProviderUsage(p);
                    return { ...info, usage: retried };
                }
                catch { }
            }
            return { ...info, usage };
        }));
        const _nodeCheck = spawnSync('node', ['--version'], { encoding: 'utf8', windowsHide: true });
        const _nodeOk = _nodeCheck.status === 0 && !_nodeCheck.error;
        const node = { installed: _nodeOk, version: _nodeOk ? (_nodeCheck.stdout || '').trim().replace(/^v/, '') : '' };
        _res.json({ node, providers: list, all: _PROVIDER_STATE_LIST });
        return null;
    }
    async onServerInfo(_json, _req, _res) {
        try {
            const totalBytes = os.totalmem();
            const usedBytes = totalBytes - os.freemem();
            const load = await _sampleServerLoad();
            _res.json({
                ok: true,
                cpu: { percent: load.cpuPercent, cores: os.cpus().length },
                memory: { totalBytes, usedBytes, percent: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0 },
            });
        }
        catch (e) {
            _res.status(500).json({ ok: false, msg: String(e?.message ?? e) });
        }
        return null;
    }
    static _normalizeHost(raw) {
        let s = (raw || '').trim();
        if (!s)
            throw new Error('host is required');
        if (!/^https?:\/\//i.test(s))
            s = 'http://' + s;
        const u = new URL(s);
        const host = u.host;
        const root = `${u.protocol}//${host}`;
        return { root, baseURL: `${root}/v1`, host };
    }
    static _authHeaders(apiKey) {
        return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    }
    static async _tryOllama(root, apiKey) {
        try {
            const authHeaders = CAIInfoRouter_1._authHeaders(apiKey);
            const tagsRes = await fetch(`${root}/api/tags`, { headers: authHeaders, signal: AbortSignal.timeout(8000) });
            if (!tagsRes.ok)
                return null;
            const tagsJson = await tagsRes.json();
            const names = Array.isArray(tagsJson?.models)
                ? tagsJson.models.map((m) => m?.name).filter((n) => typeof n === 'string')
                : [];
            if (!names.length)
                return null;
            return await Promise.all(names.map(async (name) => {
                let tools = false;
                try {
                    const showRes = await fetch(`${root}/api/show`, {
                        method: 'POST',
                        headers: { 'content-type': 'application/json', ...authHeaders },
                        body: JSON.stringify({ name }),
                        signal: AbortSignal.timeout(8000),
                    });
                    if (showRes.ok) {
                        const showJson = await showRes.json();
                        tools = Array.isArray(showJson?.capabilities) && showJson.capabilities.includes('tools');
                    }
                }
                catch { }
                return { name, tools };
            }));
        }
        catch {
            return null;
        }
    }
    static async _tryOpenAIModels(root, apiKey) {
        try {
            const res = await fetch(`${root}/v1/models`, { headers: CAIInfoRouter_1._authHeaders(apiKey), signal: AbortSignal.timeout(8000) });
            if (!res.ok)
                return null;
            const json = await res.json();
            const names = Array.isArray(json?.data)
                ? json.data.map((m) => m?.id).filter((n) => typeof n === 'string')
                : [];
            if (!names.length)
                return null;
            return names.map(name => ({ name, tools: true }));
        }
        catch {
            return null;
        }
    }
    async onPushOpencodeModel(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const raw = (_json.GetStr('host') || _json.GetStr('url') || '').trim();
        const apiKey = (_json.GetStr('apiKey') || '').trim() || undefined;
        if (!raw) {
            _res.status(400).json({ ok: false, msg: 'host required' });
            return null;
        }
        try {
            const { root, baseURL, host } = CAIInfoRouter_1._normalizeHost(raw);
            let backend = 'ollama';
            let models = await CAIInfoRouter_1._tryOllama(root, apiKey);
            if (!models) {
                backend = 'lmstudio';
                models = await CAIInfoRouter_1._tryOpenAIModels(root, apiKey);
            }
            if (!models)
                throw new Error(`no models found at ${root} (tried Ollama /api/tags and LM Studio /v1/models)`);
            const key = `${backend}-` + host.replace(/[^a-zA-Z0-9]/g, '_');
            const label = backend === 'ollama' ? `Ollama (${host})` : `LM Studio (${host})`;
            const destDir = CPath.WorkingPath();
            const ocPath = path.join(destDir, 'opencode.json');
            if (!fs.existsSync(ocPath)) {
                CAI.CreateRole(CAI.eProvider.opencode);
                if (!fs.existsSync(ocPath)) {
                    fs.writeFileSync(ocPath, JSON.stringify({ '$schema': 'https://opencode.ai/config.json', permission: { '*': 'ask', read: 'allow' } }, null, 2), 'utf8');
                }
            }
            let config = {};
            try {
                config = JSON.parse(fs.readFileSync(ocPath, 'utf8'));
            }
            catch {
                config = {};
            }
            if (!config || typeof config !== 'object')
                config = {};
            if (!config.provider || typeof config.provider !== 'object')
                config.provider = {};
            const modelMap = {};
            for (const m of models)
                modelMap[m.name] = { name: m.name, tools: m.tools };
            config.provider[key] = {
                npm: '@ai-sdk/openai-compatible',
                name: label,
                options: apiKey
                    ? { baseURL, apiKey, timeout: 3000000, chunkTimeout: 3000000 }
                    : { baseURL, timeout: 3000000, chunkTimeout: 3000000 },
                models: modelMap,
            };
            fs.writeFileSync(ocPath, JSON.stringify(config, null, 2), 'utf8');
            try {
                let settings = {};
                try {
                    settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
                }
                catch {
                    settings = {};
                }
                if (!settings || typeof settings !== 'object')
                    settings = {};
                if (!settings.models || typeof settings.models !== 'object')
                    settings.models = {};
                if (!Array.isArray(settings.models.opencode))
                    settings.models.opencode = [];
                const list = settings.models.opencode;
                for (const m of models) {
                    const value = `${key}/${m.name}`;
                    const entryLabel = `${label} - ${m.name}`;
                    const existing = list.find(e => e.value === value);
                    if (existing)
                        existing.label = entryLabel;
                    else
                        list.push({ value, label: entryLabel });
                }
                fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
            }
            catch (e) {
                CConsol.Log(`[CAIInfoRouter] settings.json models.opencode upsert failed: ${e?.message ?? e}`, CConsol.eColor.red);
            }
            _res.json({ ok: true, provider: key, backend, baseURL, path: ocPath, models });
        }
        catch (e) {
            _res.status(500).json({ ok: false, msg: String(e?.message ?? e) });
        }
        return null;
    }
    async onOpencodeProviderStatus(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const ocPath = path.join(CPath.WorkingPath(), 'opencode.json');
        let config = {};
        try {
            config = JSON.parse(fs.readFileSync(ocPath, 'utf8'));
        }
        catch {
            config = {};
        }
        const providerMap = (config && typeof config === 'object' && config.provider && typeof config.provider === 'object') ? config.provider : {};
        const entries = Object.entries(providerMap).filter(([, v]) => v?.npm === '@ai-sdk/openai-compatible');
        const providers = await Promise.all(entries.map(async ([key, v]) => {
            const backend = key.startsWith('ollama-') ? 'ollama' : 'lmstudio';
            const baseURL = v?.options?.baseURL ?? '';
            const apiKey = v?.options?.apiKey;
            const root = baseURL.replace(/\/v1\/?$/, '');
            const host = root.replace(/^https?:\/\//i, '');
            const modelCount = Object.keys(v?.models ?? {}).length;
            const authHeaders = CAIInfoRouter_1._authHeaders(apiKey);
            let connected = false;
            let error = '';
            let running = [];
            try {
                if (backend === 'ollama') {
                    const psRes = await fetch(`${root}/api/ps`, { headers: authHeaders, signal: AbortSignal.timeout(5000) });
                    if (psRes.ok) {
                        connected = true;
                        const psJson = await psRes.json();
                        const models = Array.isArray(psJson?.models) ? psJson.models : [];
                        const latest = models.reduce((best, m) => {
                            const t = Date.parse(m?.expires_at ?? '') || 0;
                            const bestT = best ? (Date.parse(best?.expires_at ?? '') || 0) : -Infinity;
                            return t >= bestT ? m : best;
                        }, null);
                        running = latest
                            ? [{ name: latest?.name ?? latest?.model ?? '', vramBytes: typeof latest?.size_vram === 'number' ? latest.size_vram : undefined, sizeBytes: typeof latest?.size === 'number' ? latest.size : undefined }]
                            : [];
                    }
                    else {
                        const tagsRes = await fetch(`${root}/api/tags`, { headers: authHeaders, signal: AbortSignal.timeout(5000) });
                        connected = tagsRes.ok;
                        if (!connected)
                            error = `HTTP ${tagsRes.status}`;
                    }
                }
                else {
                    const modelsRes = await fetch(`${root}/v1/models`, { headers: authHeaders, signal: AbortSignal.timeout(5000) });
                    connected = modelsRes.ok;
                    if (!connected)
                        error = `HTTP ${modelsRes.status}`;
                    if (connected) {
                        try {
                            const v0Res = await fetch(`${root}/api/v0/models`, { headers: authHeaders, signal: AbortSignal.timeout(5000) });
                            if (v0Res.ok) {
                                const v0Json = await v0Res.json();
                                running = Array.isArray(v0Json?.data)
                                    ? v0Json.data.filter((m) => m?.state === 'loaded').map((m) => ({ name: m?.id ?? '' }))
                                    : [];
                            }
                        }
                        catch { }
                    }
                }
            }
            catch (e) {
                connected = false;
                error = String(e?.message ?? e);
            }
            return { key, label: v?.name ?? key, backend, host, connected, error, modelCount, running };
        }));
        _res.json({ providers });
        return null;
    }
    async onPruneConversations(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const monthsRaw = _json.GetInt('months');
        const months = (typeof monthsRaw === 'number' && monthsRaw > 0) ? monthsRaw : 1;
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);
        const cutoffMs = cutoffDate.getTime();
        const results = {};
        const runners = {
            [CAI.eProvider.claude]: () => _pruneClaude(cutoffMs),
            [CAI.eProvider.codex]: () => _pruneCodex(cutoffMs),
            [CAI.eProvider.grok]: () => _pruneGrok(cutoffMs),
            [CAI.eProvider.opencode]: () => _pruneOpencode(cutoffMs),
            [CAI.eProvider.antigravity]: () => _pruneAntigravity(cutoffMs),
        };
        for (const [provider, run] of Object.entries(runners)) {
            const info = await CAI.ProviderInfo(provider);
            if (!info.installed) {
                results[provider] = { installed: false, deleted: 0 };
                continue;
            }
            try {
                results[provider] = { installed: true, deleted: await run() };
            }
            catch (e) {
                results[provider] = { installed: true, deleted: 0, error: String(e?.message ?? e) };
                CConsol.Log(`[CAIInfoRouter] prune failed provider=${provider}: ${e?.message ?? e}`, CConsol.eColor.red);
            }
        }
        const totalDeleted = Object.values(results).reduce((sum, r) => sum + r.deleted, 0);
        _res.json({ ok: true, months, cutoff: cutoffDate.toISOString(), totalDeleted, results });
        return null;
    }
};
CAIInfoRouter = CAIInfoRouter_1 = __decorate([
    URLPatterns(["/AIInfo/setting", "/AIInfo/provider-state", "/AIInfo/server-info", "/AIInfo/opencode-pushLocal", "/AIInfo/opencode-statusLocal", "/AIInfo/prune-conversations", "/AIInfo/workfolder", "/AIInfo/workfolder-set", "/AIInfo/whoami"])
], CAIInfoRouter);
export { CAIInfoRouter };

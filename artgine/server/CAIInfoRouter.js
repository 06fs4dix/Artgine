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
import * as path from 'path';
import * as fs from 'fs';
import { CAI } from '../util/CAI.js';
import { CPath } from '../basic/CPath.js';
const SETTINGS_FILE = path.join(CAI.AIDir(), 'settings.json');
const _PROVIDER_STATE_LIST = Object.values(CAI.eProvider).filter(p => p !== CAI.eProvider.manus && p !== CAI.eProvider.gpt);
const CLAUDE_WARMUP_COOLDOWN_MS = 5 * 60 * 1000;
let _lastClaudeWarmupAt = 0;
const AGY_USAGE_CACHE_TTL_MS = 5 * 60 * 1000;
let _agyUsageCache = null;
async function _getAgyUsageCached() {
    if (_agyUsageCache && Date.now() - _agyUsageCache.at < AGY_USAGE_CACHE_TTL_MS)
        return _agyUsageCache.value;
    const value = await CAI.ProviderUsage(CAI.eProvider.antigravity);
    _agyUsageCache = { at: Date.now(), value };
    return value;
}
let CAIInfoRouter = CAIInfoRouter_1 = class CAIInfoRouter extends CAuthServer {
    IsAuth(_json, req) {
        const token = _json.GetStr('token');
        return token ? isValidToken(token) : isAuthedReq(req);
    }
    constructor() {
        super();
        this.On("/AIInfo/setting", this.onGetSettingJSON.bind(this));
        this.On("/AIInfo/provider-state", this.onProviderState.bind(this));
        this.On("/AIInfo/push-opencode-model", this.onPushOpencodeModel.bind(this));
    }
    Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() { }
    async onGetSettingJSON(_json, _req, _res) {
        try {
            _res.json(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')));
        }
        catch {
            _res.json({});
        }
        return null;
    }
    async onProviderState(_json, _req, _res) {
        const list = await Promise.all(_PROVIDER_STATE_LIST.map(async (p) => {
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
                    await CAI.Chat(p, model, process.cwd(), 'hi', false);
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
        _res.json({ node, providers: list });
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
            _res.json({ ok: true, provider: key, backend, baseURL, path: ocPath, models });
        }
        catch (e) {
            _res.status(500).json({ ok: false, msg: String(e?.message ?? e) });
        }
        return null;
    }
};
CAIInfoRouter = CAIInfoRouter_1 = __decorate([
    URLPatterns(["/AIInfo/setting", "/AIInfo/provider-state", "/AIInfo/push-opencode-model"])
], CAIInfoRouter);
export { CAIInfoRouter };

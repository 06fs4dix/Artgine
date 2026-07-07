import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer, isAuthedReq, isValidToken } from './CAuthServer.js';
import { spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { CAI } from '../util/CAI.js';
import { CPath } from '../basic/CPath.js';

const SETTINGS_FILE = path.join(CAI.AIDir(), 'settings.json');

// manus/gpt는 터미널 실행 모드에 연결되어 있지 않은 미사용 프로바이더라 제외한다.
const _PROVIDER_STATE_LIST = Object.values(CAI.eProvider).filter(p => p !== CAI.eProvider.manus && p !== CAI.eProvider.gpt);

@URLPatterns(["/AIInfo/setting", "/AIInfo/provider-state", "/AIInfo/push-opencode-model"])
export class CAIInfoRouter extends CAuthServer {
    // 토큰이 같이 오면 토큰 기준으로, 없으면 기존 세션 쿠키 기준으로 인증한다.
    // cross-origin(RDP로 전환된 원격 서버) 요청은 쿠키가 기본적으로 전달되지 않으므로 토큰이 필요하다.
    private IsAuth(_json: CJSON, req: Request): boolean {
        const token = _json.GetStr('token');
        return token ? isValidToken(token) : isAuthedReq(req);
    }

    constructor() {
        super();
        this.On("/AIInfo/setting", this.onGetSettingJSON.bind(this));
        this.On("/AIInfo/provider-state", this.onProviderState.bind(this));
        this.On("/AIInfo/push-opencode-model", this.onPushOpencodeModel.bind(this));
    }

    override Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() {}

    // GET /AIInfo/setting
    // ai/settings.json을 그대로 읽어서 노출한다 (인증 불필요).
    async onGetSettingJSON(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        try {
            _res.json(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')));
        } catch {
            _res.json({});
        }
        return null;
    }

    // GET /AIInfo/provider-state
    // 각 AI 프로바이더의 설치/인증/버전/모델/사용량(5시간·주간 잔여 비율) 현황을 반환한다 (인증 불필요).
    async onProviderState(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        const list = await Promise.all(_PROVIDER_STATE_LIST.map(async p => {
            const [info, usage] = await Promise.all([CAI.ProviderInfo(p), CAI.ProviderUsage(p)]);
            // opencode: 인증은 됐는데 최근 7일 내 사용 기록이 없어 -1,-1(조회 불가)이 나오는 경우,
            // "한 번도 안 써서 100% 남음"으로 간주한다 (미인증/조회 실패와 구분하기 위해 인증 상태에서만 적용).
            if (p === CAI.eProvider.opencode && info.authenticated && usage.fiveHour < 0 && usage.weekly < 0) {
                return { ...info, usage: { fiveHour: 1, weekly: 1 } };
            }
            return { ...info, usage };
        }));
        const _nodeCheck = spawnSync('node', ['--version'], { encoding: 'utf8', windowsHide: true });
        const _nodeOk    = _nodeCheck.status === 0 && !_nodeCheck.error;
        const node = { installed: _nodeOk, version: _nodeOk ? (_nodeCheck.stdout || '').trim().replace(/^v/, '') : '' };
        _res.json({ node, providers: list });
        return null;
    }

    // "1.220.132.130:11434", "http://1.220.132.130:11434", "http://.../v1/models" 등 다양한 입력에서
    // IP·포트만 뽑아 root(".../")와 OpenAI 호환 baseURL(".../v1")로 재조합한다. 경로/쿼리는 모두 버린다.
    private static _normalizeHost(raw: string): { root: string; baseURL: string; host: string } {
        let s = (raw || '').trim();
        if (!s) throw new Error('host is required');
        if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
        const u = new URL(s);
        const host = u.host; // ip:port
        const root = `${u.protocol}//${host}`;
        return { root, baseURL: `${root}/v1`, host };
    }

    // apiKey가 있으면 Authorization: Bearer 헤더를 얹는다(둘 다 표준 Bearer 토큰 방식을 따름).
    private static _authHeaders(apiKey?: string): Record<string, string> {
        return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    }

    // Ollama 네이티브 API로 모델 목록/툴 지원 여부를 조회한다. Ollama가 아니면(엔드포인트 없음) null.
    private static async _tryOllama(root: string, apiKey?: string): Promise<{ name: string; tools: boolean }[] | null> {
        try {
            const authHeaders = CAIInfoRouter._authHeaders(apiKey);
            const tagsRes = await fetch(`${root}/api/tags`, { headers: authHeaders, signal: AbortSignal.timeout(8000) });
            if (!tagsRes.ok) return null;
            const tagsJson: any = await tagsRes.json();
            const names: string[] = Array.isArray(tagsJson?.models)
                ? tagsJson.models.map((m: any) => m?.name).filter((n: any) => typeof n === 'string')
                : [];
            if (!names.length) return null;
            // 모델별 툴 사용 지원 여부: /api/show 의 capabilities 배열에 'tools' 포함 여부로 판별.
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
                        const showJson: any = await showRes.json();
                        tools = Array.isArray(showJson?.capabilities) && showJson.capabilities.includes('tools');
                    }
                } catch { /* 조회 실패 시 tools=false 로 둔다 */ }
                return { name, tools };
            }));
        } catch { return null; }
    }

    // LM Studio(및 OpenAI 호환 서버 일반)의 표준 /v1/models로 모델 목록을 조회한다.
    // 이 엔드포인트는 툴 사용 지원 여부를 알려주지 않아, 최근 로컬 모델 대부분이 지원하는 점을 감안해
    // tools=true로 낙관적으로 채운다(실제 미지원 모델이면 opencode.json에서 수동으로 false로 고치면 됨).
    private static async _tryOpenAIModels(root: string, apiKey?: string): Promise<{ name: string; tools: boolean }[] | null> {
        try {
            const res = await fetch(`${root}/v1/models`, { headers: CAIInfoRouter._authHeaders(apiKey), signal: AbortSignal.timeout(8000) });
            if (!res.ok) return null;
            const json: any = await res.json();
            const names: string[] = Array.isArray(json?.data)
                ? json.data.map((m: any) => m?.id).filter((n: any) => typeof n === 'string')
                : [];
            if (!names.length) return null;
            return names.map(name => ({ name, tools: true }));
        } catch { return null; }
    }

    // POST /AIInfo/push-opencode-model  body: { host | url: "1.220.132.130:11434" | "http://.../v1/models" 등, apiKey?: string }
    // Ollama 또는 LM Studio(OpenAI 호환) 서버의 모델 목록/툴 지원 여부를 조회해 opencode.json의 커스텀 provider로 등록한다.
    // apiKey가 주어지면 조회 요청에 Bearer 토큰으로 실어 보내고, opencode.json의 provider.options.apiKey에도 기록한다.
    // opencode.json이 없으면 CAI.CreateRole(opencode)로 먼저 생성한 뒤 병합한다(해당 provider만 교체).
    // 로컬 서버에 임의로 provider를 등록/실행시킬 수 있는 쓰기 작업이라 인증된 사용자만 호출 가능하다.
    async onPushOpencodeModel(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const raw = (_json.GetStr('host') || _json.GetStr('url') || '').trim();
        const apiKey = (_json.GetStr('apiKey') || '').trim() || undefined;
        if (!raw) { _res.status(400).json({ ok: false, msg: 'host required' }); return null; }

        try {
            const { root, baseURL, host } = CAIInfoRouter._normalizeHost(raw);

            let backend: 'ollama' | 'lmstudio' = 'ollama';
            let models = await CAIInfoRouter._tryOllama(root, apiKey);
            if (!models) {
                backend = 'lmstudio';
                models = await CAIInfoRouter._tryOpenAIModels(root, apiKey);
            }
            if (!models) throw new Error(`no models found at ${root} (tried Ollama /api/tags and LM Studio /v1/models)`);

            const key = `${backend}-` + host.replace(/[^a-zA-Z0-9]/g, '_');
            const label = backend === 'ollama' ? `Ollama (${host})` : `LM Studio (${host})`;

            // opencode.json 확보 (없으면 CreateRole → 그래도 없으면 최소 구성으로 생성)
            const destDir = CPath.WorkingPath();
            const ocPath  = path.join(destDir, 'opencode.json');
            if (!fs.existsSync(ocPath)) {
                CAI.CreateRole(CAI.eProvider.opencode);
                if (!fs.existsSync(ocPath)) {
                    fs.writeFileSync(ocPath, JSON.stringify({ '$schema': 'https://opencode.ai/config.json', permission: { '*': 'ask', read: 'allow' } }, null, 2), 'utf8');
                }
            }

            // provider 항목 갱신 (해당 provider만 통째로 교체, 다른 provider는 유지)
            let config: any = {};
            try { config = JSON.parse(fs.readFileSync(ocPath, 'utf8')); } catch { config = {}; }
            if (!config || typeof config !== 'object') config = {};
            if (!config.provider || typeof config.provider !== 'object') config.provider = {};

            const modelMap: Record<string, any> = {};
            for (const m of models) modelMap[m.name] = { name: m.name, tools: m.tools };
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
        } catch (e: any) {
            _res.status(500).json({ ok: false, msg: String(e?.message ?? e) });
        }
        return null;
    }
}

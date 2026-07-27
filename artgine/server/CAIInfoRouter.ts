import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer, isAuthedReq, isValidToken } from './CAuthServer.js';
import { spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { CAI } from '../util/CAI.js';
import type { IProviderUsage } from '../util/CAI.js';
import { CPath } from '../basic/CPath.js';
import { CConsol } from '../basic/CConsol.js';
import { CSQLite } from '../network/CSQLite.js';
import { GetAppJSON, GetRootPaths, SetRootPaths, GetLoadedSettingsFileName } from '../../desktop/MainFunc.js';
import { CUtilSystem } from '../system/CUtilSystem.js';

const SETTINGS_FILE = path.join(CAI.AIDir(), 'settings.json');

// gpt는 터미널 실행 모드에 연결되어 있지 않은 미사용 프로바이더라 제외한다.
const _PROVIDER_STATE_LIST = Object.values(CAI.eProvider).filter(p => p !== CAI.eProvider.gpt);

// Connect 시 modelsUpdate 갱신은 프로세스당 1회만 (true일 때만 실행 후 false로 저장).
let _modelsUpdateOnceDone = false;

// Claude 사용량 API는 최근 실제 호출 흔적이 있어야 값을 채워주는 것으로 보여, 설치·인증된 상태에서도
// 한동안 안 쓰면 -1(조회 불가)이 나온다. 이 경우 헤드리스로 한 번 짧게 호출해 실제 응답을 받은 뒤
// 사용량을 재조회하면 채워진다(실측 확인). 매 조회마다 반복 호출하지 않도록 최소 재시도 간격을 둔다.
const CLAUDE_WARMUP_COOLDOWN_MS = 5 * 60 * 1000;
let _lastClaudeWarmupAt = 0;

// antigravity 사용량 조회는 agy를 PTY로 띄워 /usage 화면을 파싱하는 방식이라 호출당 수 초가 걸린다
// (agy는 헤드리스에서 로컬 조회 API/캐시를 전혀 노출하지 않아 이 방법 외엔 값을 얻을 수 없음 — 실측 확인).
// 페이지 로드/폴링마다 매번 새 프로세스를 띄우지 않도록 짧게 캐시한다.
const AGY_USAGE_CACHE_TTL_MS = 5 * 60 * 1000;
// 조회 실패(-1,-1)는 짧게만 캐시한다. 실패 결과를 5분 붙들고 있으면 일시 오류 후에도 UI가 ?로 고착된다.
const AGY_USAGE_FAIL_CACHE_TTL_MS = 15 * 1000;
let _agyUsageCache: { at: number; value: IProviderUsage } | null = null;
async function _getAgyUsageCached(): Promise<IProviderUsage> {
    if (_agyUsageCache) {
        const failed = _agyUsageCache.value.fiveHour < 0 && _agyUsageCache.value.weekly < 0;
        const ttl = failed ? AGY_USAGE_FAIL_CACHE_TTL_MS : AGY_USAGE_CACHE_TTL_MS;
        if (Date.now() - _agyUsageCache.at < ttl) return _agyUsageCache.value;
    }
    const value = await CAI.ProviderUsage(CAI.eProvider.antigravity);
    _agyUsageCache = { at: Date.now(), value };
    return value;
}

// ---------------- 오래된 대화 삭제(prune-conversations) ----------------
// provider가 로컬 디스크에 스스로 남기는 세션 저장소를 개월 수 기준으로 정리한다. 이 컴퓨터에 있는
// 모든 프로젝트가 대상이다(특정 cwd로 좁히지 않음 — provider 저장소 자체가 프로젝트 경계 없이 쌓이는
// 구조라서, cwd 하나만 청소해도 나머지가 계속 쌓여 의미가 작다).
//
// 디렉토리를 재귀적으로 훑어 필터를 통과하는 파일 경로를 전부 모은다(prune 전용 — CAI_imple의
// listFilesRecursive는 모듈 비공개라 재사용할 수 없어 여기서 다시 둔다).
function _listFilesRecursive(dir: string, filter: (name: string) => boolean): string[] {
    const out: string[] = [];
    const walk = (d: string) => {
        let entries: fs.Dirent[];
        try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
        for (const e of entries) {
            const full = path.join(d, e.name);
            if (e.isDirectory()) walk(full);
            else if (e.isFile() && filter(e.name)) out.push(full);
        }
    };
    walk(dir);
    return out;
}

// claude: ~/.claude/projects/**/*.jsonl — 파일 mtime 기준 삭제.
function _pruneClaude(cutoffMs: number): number {
    const dir = path.join(os.homedir(), '.claude', 'projects');
    let n = 0;
    for (const f of _listFilesRecursive(dir, name => name.endsWith('.jsonl'))) {
        try { if (fs.statSync(f).mtimeMs < cutoffMs) { fs.unlinkSync(f); n++; } } catch {}
    }
    return n;
}

// codex: ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl — 파일 mtime 기준 삭제.
function _pruneCodex(cutoffMs: number): number {
    const dir = path.join(os.homedir(), '.codex', 'sessions');
    let n = 0;
    for (const f of _listFilesRecursive(dir, name => name.startsWith('rollout-') && name.endsWith('.jsonl'))) {
        try { if (fs.statSync(f).mtimeMs < cutoffMs) { fs.unlinkSync(f); n++; } } catch {}
    }
    return n;
}

// grok: ~/.grok/sessions/<enc-cwd>/<uuid>/ — 세션 디렉토리 통째로 삭제(내부 chat_history.jsonl의
// mtime 기준. 그 파일이 없으면 세션 디렉토리 자체의 mtime으로 대신 판단한다).
function _pruneGrok(cutoffMs: number): number {
    const base = path.join(os.homedir(), '.grok', 'sessions');
    let n = 0;
    let cwdDirs: fs.Dirent[];
    try { cwdDirs = fs.readdirSync(base, { withFileTypes: true }); } catch { return 0; }
    for (const cd of cwdDirs) {
        if (!cd.isDirectory()) continue;
        const cwdPath = path.join(base, cd.name);
        let sessDirs: fs.Dirent[];
        try { sessDirs = fs.readdirSync(cwdPath, { withFileTypes: true }); } catch { continue; }
        for (const sd of sessDirs) {
            if (!sd.isDirectory()) continue;
            const sessPath = path.join(cwdPath, sd.name);
            let mtime: number;
            try { mtime = fs.statSync(path.join(sessPath, 'chat_history.jsonl')).mtimeMs; }
            catch { try { mtime = fs.statSync(sessPath).mtimeMs; } catch { continue; } }
            if (mtime < cutoffMs) {
                try { fs.rmSync(sessPath, { recursive: true, force: true }); n++; } catch {}
            }
        }
    }
    return n;
}

// opencode: ~/.local/share/opencode/opencode.db(전역 SQLite) — session.time_updated 기준으로
// session/message/part를 계단식 삭제한다(FK 제약이 없어 자식부터 지운다). IN 절 파라미터 수가
// SQLite 한도를 넘지 않도록 청크로 나눠 지운다.
async function _pruneOpencode(cutoffMs: number): Promise<number> {
    const dbPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');
    if (!fs.existsSync(dbPath)) return 0;
    const db = new CSQLite();
    db.mDatabase = dbPath;
    await db.Init();
    const rows = await db.Recv('SELECT id FROM session WHERE time_updated < ?', [cutoffMs]);
    const ids = (rows ?? []).map((r: any[]) => String(r[0]));
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

// antigravity: 저장소가 4곳으로 흩어져 있다(실측) — 각각을 자기 자신의 시각 기준으로 독립적으로 정리한다.
//   conversations/<cid>.db      대화별 SQLite 파일 — 파일 mtime 기준 삭제
//   brain/<cid>/                대화별 부속 디렉토리 — 디렉토리 mtime 기준 삭제
//   conversation_summaries.db   요약 테이블(last_modified_time이 "YYYY-MM-DD HH:MM:SS.ffffff+00:00" UTC 텍스트로
//                                저장돼 있어 같은 포맷의 문자열과 사전식 비교가 그대로 시각 비교가 된다) — 행 삭제
//   history.jsonl                슬래시 명령·대화 시작 로그 한 줄씩(JSON) — timestamp(ms) 미만인 줄만 걸러서 재작성.
//                                파싱 실패하거나 timestamp가 없는 줄은 보수적으로 남겨둔다.
async function _pruneAntigravity(cutoffMs: number): Promise<number> {
    const base = path.join(os.homedir(), '.gemini', 'antigravity-cli');
    let n = 0;

    for (const f of _listFilesRecursive(path.join(base, 'conversations'), name => name.endsWith('.db'))) {
        try { if (fs.statSync(f).mtimeMs < cutoffMs) { fs.unlinkSync(f); n++; } } catch {}
    }

    const brainDir = path.join(base, 'brain');
    try {
        for (const e of fs.readdirSync(brainDir, { withFileTypes: true })) {
            if (!e.isDirectory()) continue;
            const full = path.join(brainDir, e.name);
            try { if (fs.statSync(full).mtimeMs < cutoffMs) { fs.rmSync(full, { recursive: true, force: true }); n++; } } catch {}
        }
    } catch {}

    const summariesPath = path.join(base, 'conversation_summaries.db');
    if (fs.existsSync(summariesPath)) {
        try {
            const cutoffStr = new Date(cutoffMs).toISOString().replace('T', ' ').slice(0, 19);   // "YYYY-MM-DD HH:MM:SS" UTC
            const db = new CSQLite();
            db.mDatabase = summariesPath;
            await db.Init();
            const rows = await db.Recv('SELECT conversation_id FROM conversation_summaries WHERE last_modified_time < ?', [cutoffStr]);
            const ids = (rows ?? []).map((r: any[]) => String(r[0]));
            if (ids.length) {
                const ph = ids.map(() => '?').join(',');
                await db.Send(`DELETE FROM conversation_summaries WHERE conversation_id IN (${ph})`, ids);
                n += ids.length;
            }
        } catch {}
    }

    const historyPath = path.join(base, 'history.jsonl');
    try {
        const lines = fs.readFileSync(historyPath, 'utf8').split('\n');
        const kept: string[] = [];
        let dropped = 0;
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const rec = JSON.parse(line);
                if (typeof rec.timestamp === 'number' && rec.timestamp < cutoffMs) { dropped++; continue; }
            } catch { /* 파싱 실패한 줄은 보수적으로 남긴다 */ }
            kept.push(line);
        }
        if (dropped > 0) { fs.writeFileSync(historyPath, kept.join('\n') + '\n', 'utf8'); n += dropped; }
    } catch {}

    return n;
}

type PruneOutcome = { installed: boolean; deleted: number; error?: string };

@URLPatterns(["/AIInfo/setting", "/AIInfo/provider-state", "/AIInfo/opencode-pushLocal", "/AIInfo/opencode-statusLocal", "/AIInfo/prune-conversations", "/AIInfo/workfolder", "/AIInfo/workfolder-set"])
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
        this.On("/AIInfo/opencode-pushLocal", this.onPushOpencodeModel.bind(this));
        this.On("/AIInfo/opencode-statusLocal", this.onOpencodeProviderStatus.bind(this));
        this.On("/AIInfo/prune-conversations", this.onPruneConversations.bind(this));
        this.On("/AIInfo/workfolder", this.onGetWorkFolder.bind(this));
        this.On("/AIInfo/workfolder-set", this.onSetWorkFolder.bind(this));
    }

    override Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() {
        // 서버 기동 직후 1회: ai/settings.json 의 modelsUpdate===true 이면
        // CAI.ProviderModels 로 models 를 채우고 플래그를 false 로 저장한다(블로킹하지 않음).
        void CAIInfoRouter._maybeUpdateModelsOnStart();
    }

    // ai/settings.json modelsUpdate 가 true 일 때만 프로바이더 모델 목록을 조회해 models 에 반영.
    // 조회 결과가 비어 있는 프로바이더는 기존 목록을 유지(CLI/인증 실패로 목록이 통째로 지워지지 않게).
    // 성공/실패와 관계없이 한 번 시도한 뒤에는 modelsUpdate 를 false 로 내려 다음 기동에서 반복하지 않는다.
    private static async _maybeUpdateModelsOnStart(): Promise<void> {
        if (_modelsUpdateOnceDone) return;
        _modelsUpdateOnceDone = true;

        const settingsPath = path.join(CAI.AIDir(), 'settings.json');
        let settings: any;
        try {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch (e: any) {
            CConsol.Log(`[CAIInfoRouter] modelsUpdate: settings.json read failed: ${e?.message ?? e}`, CConsol.eColor.red);
            return;
        }
        if (!settings || typeof settings !== 'object') return;
        if (settings.modelsUpdate !== true) return;

        CConsol.Log('[CAIInfoRouter] modelsUpdate=true → refreshing models from providers…', CConsol.eColor.cyan);
        if (!settings.models || typeof settings.models !== 'object') settings.models = {};

        const providers = _PROVIDER_STATE_LIST;
        for (const p of providers) {
            try {
                const list = await CAI.ProviderModels(p);
                if (list.length > 0) {
                    settings.models[p] = list;
                    CConsol.Log(`[CAIInfoRouter] modelsUpdate ${p}: ${list.length} models`, CConsol.eColor.cyan);
                } else {
                    CConsol.Log(`[CAIInfoRouter] modelsUpdate ${p}: empty (keep existing)`, CConsol.eColor.yellow);
                }
            } catch (e: any) {
                CConsol.Log(`[CAIInfoRouter] modelsUpdate ${p} failed: ${e?.message ?? e}`, CConsol.eColor.red);
            }
        }

        settings.modelsUpdate = false;
        try {
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
            CConsol.Log('[CAIInfoRouter] modelsUpdate done → saved modelsUpdate=false', CConsol.eColor.cyan);
        } catch (e: any) {
            CConsol.Log(`[CAIInfoRouter] modelsUpdate: settings.json write failed: ${e?.message ?? e}`, CConsol.eColor.red);
        }
    }

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

    // GET /AIInfo/workfolder
    // 현재 워킹 폴더(rootPath) 배열을 반환한다. 디스크 절대경로를 노출하므로 인증이 필요하다.
    async onGetWorkFolder(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }
        try {
            _res.json({ ok: true, rootPath: GetRootPaths(await GetAppJSON()) });
        } catch (e: any) {
            _res.status(500).json({ ok: false, msg: String(e?.message ?? e) });
        }
        return null;
    }

    // POST /AIInfo/workfolder-set  body: { rootPath: string[] }
    // 워킹 폴더(rootPath)를 Env.json(CStorage)에 저장하고 서버를 재시작한다(/RootN 재등록을 위해).
    // 파일시스템 서빙 경계를 바꾸는 쓰기 작업이라 인증된 사용자만 호출 가능하다.
    async onSetWorkFolder(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }
        try {
            const arr = _json.GetArray('rootPath');
            const list: string[] = Array.isArray(arr?.mArray)
                ? arr.mArray.map((s: any) => String(s).trim()).filter(Boolean)
                : [];
            if (!list.length) { _res.status(400).json({ ok: false, msg: 'rootPath required' }); return null; }
            SetRootPaths(list);
            _res.json({ ok: true, rootPath: GetRootPaths() });
            // 응답을 보낸 뒤, 현재 프로세스 트리와 분리된 독립 프로세스로 재실행한다(CFileServer.onRestart와 동일 방식).
            await CUtilSystem.Spawn('npm', ['run', 'start', '--', GetLoadedSettingsFileName()], 'ignore', process.cwd(), null, true, false);
        } catch (e: any) {
            if (!_res.headersSent) _res.status(500).json({ ok: false, msg: String(e?.message ?? e) });
        }
        return null;
    }

    // GET /AIInfo/provider-state
    // 각 AI 프로바이더의 설치/인증/버전/모델/사용량(5시간·주간 잔여 비율) 현황을 반환한다 (인증 불필요).
    async onProviderState(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        const list = await Promise.all(_PROVIDER_STATE_LIST.map(async p => {
            const info = await CAI.ProviderInfo(p);
            const usage = (p === CAI.eProvider.antigravity && info.installed && info.authenticated)
                ? await _getAgyUsageCached()
                : await CAI.ProviderUsage(p);
            // opencode: 인증은 됐는데 최근 7일 내 사용 기록이 없어 -1,-1(조회 불가)이 나오는 경우,
            // "한 번도 안 써서 100% 남음"으로 간주한다 (미인증/조회 실패와 구분하기 위해 인증 상태에서만 적용).
            if (p === CAI.eProvider.opencode && info.authenticated && usage.fiveHour < 0 && usage.weekly < 0) {
                return { ...info, usage: { fiveHour: 1, weekly: 1 } };
            }
            // claude: 설치·인증되어 있는데 usage가 -1이면, 쿨다운이 지난 경우에 한해 헤드리스로 한 번
            // 짧게 호출해서(실제 API 응답을 받아야 사용량 API도 값을 채워줌) 사용량을 재조회한다.
            // 웜업 자체가 실패하거나 재조회도 -1이면 원래 usage(-1)를 그대로 반환한다.
            if (p === CAI.eProvider.claude && info.installed && info.authenticated
                && usage.fiveHour < 0 && usage.weekly < 0
                && Date.now() - _lastClaudeWarmupAt > CLAUDE_WARMUP_COOLDOWN_MS) {
                _lastClaudeWarmupAt = Date.now();
                try {
                    const model = info.models[0]?.value ?? '';
                    await CAI.Chat(p, model, process.cwd(), 'hi', false);
                    const retried = await CAI.ProviderUsage(p);
                    return { ...info, usage: retried };
                } catch { /* 웜업 실패 시 원래 usage(-1)를 그대로 사용 */ }
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

    // POST /AIInfo/opencode-pushLocal  body: { host | url: "1.220.132.130:11434" | "http://.../v1/models" 등, apiKey?: string }
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

            // ai/settings.json의 models.opencode 목록에도 같은 모델들을 upsert한다.
            // opencode.json은 CLI 실행 시 참조하는 provider 정의이고, settings.json은 Chat/Memo/Control(서브에이전트)
            // 드롭다운이 읽는 목록이라 별개 파일 — 여기서 갱신해주지 않으면 새로 등록한 로컬 모델이 UI에 안 보인다.
            try {
                let settings: any = {};
                try { settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch { settings = {}; }
                if (!settings || typeof settings !== 'object') settings = {};
                if (!settings.models || typeof settings.models !== 'object') settings.models = {};
                if (!Array.isArray(settings.models.opencode)) settings.models.opencode = [];

                const list: { value: string; label: string }[] = settings.models.opencode;
                for (const m of models) {
                    const value = `${key}/${m.name}`;
                    const entryLabel = `${label} - ${m.name}`;
                    const existing = list.find(e => e.value === value);
                    if (existing) existing.label = entryLabel;
                    else list.push({ value, label: entryLabel });
                }
                fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
            } catch (e: any) {
                CConsol.Log(`[CAIInfoRouter] settings.json models.opencode upsert failed: ${e?.message ?? e}`, CConsol.eColor.red);
            }

            _res.json({ ok: true, provider: key, backend, baseURL, path: ocPath, models });
        } catch (e: any) {
            _res.status(500).json({ ok: false, msg: String(e?.message ?? e) });
        }
        return null;
    }

    // GET /AIInfo/opencode-statusLocal
    // opencode.json에 opencode-pushLocal로 등록해둔 커스텀 provider(Ollama/LM Studio)들에 실제로 접속해
    // 연결 여부와 현재 로드된 모델(가능하면 VRAM)을 조회한다. 등록된 원격 IP를 노출하는 조회라 인증이 필요하다.
    async onOpencodeProviderStatus(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const ocPath = path.join(CPath.WorkingPath(), 'opencode.json');
        let config: any = {};
        try { config = JSON.parse(fs.readFileSync(ocPath, 'utf8')); } catch { config = {}; }
        const providerMap = (config && typeof config === 'object' && config.provider && typeof config.provider === 'object') ? config.provider : {};

        // opencode-pushLocal이 만든 항목만 대상으로 한다(다른 표준 provider는 이 방식으로 조회할 API가 없음).
        const entries = Object.entries(providerMap).filter(([, v]: [string, any]) => v?.npm === '@ai-sdk/openai-compatible');

        const providers = await Promise.all(entries.map(async ([key, v]: [string, any]) => {
            const backend: 'ollama' | 'lmstudio' = key.startsWith('ollama-') ? 'ollama' : 'lmstudio';
            const baseURL: string = v?.options?.baseURL ?? '';
            const apiKey: string | undefined = v?.options?.apiKey;
            const root = baseURL.replace(/\/v1\/?$/, '');
            const host = root.replace(/^https?:\/\//i, '');
            const modelCount = Object.keys(v?.models ?? {}).length;
            const authHeaders = CAIInfoRouter._authHeaders(apiKey);

            let connected = false;
            let error = '';
            let running: { name: string; vramBytes?: number; sizeBytes?: number }[] = [];

            try {
                if (backend === 'ollama') {
                    // /api/ps: 현재 메모리에 로드된 모델 + VRAM/전체 메모리 사용량(size_vram/size)을 함께 준다.
                    // keep_alive 때문에 여러 모델이 동시에 로드된 채 남아있을 수 있어, expires_at(마지막 사용 시
                    // 갱신됨)이 가장 먼 미래인 것 하나만 "현재 활성" 모델로 골라 보여준다.
                    const psRes = await fetch(`${root}/api/ps`, { headers: authHeaders, signal: AbortSignal.timeout(5000) });
                    if (psRes.ok) {
                        connected = true;
                        const psJson: any = await psRes.json();
                        const models: any[] = Array.isArray(psJson?.models) ? psJson.models : [];
                        const latest = models.reduce((best: any, m: any) => {
                            const t = Date.parse(m?.expires_at ?? '') || 0;
                            const bestT = best ? (Date.parse(best?.expires_at ?? '') || 0) : -Infinity;
                            return t >= bestT ? m : best;
                        }, null);
                        running = latest
                            ? [{ name: latest?.name ?? latest?.model ?? '', vramBytes: typeof latest?.size_vram === 'number' ? latest.size_vram : undefined, sizeBytes: typeof latest?.size === 'number' ? latest.size : undefined }]
                            : [];
                    } else {
                        // 구버전 Ollama라 /api/ps가 없을 수 있으니 /api/tags로 연결 자체만 재확인한다.
                        const tagsRes = await fetch(`${root}/api/tags`, { headers: authHeaders, signal: AbortSignal.timeout(5000) });
                        connected = tagsRes.ok;
                        if (!connected) error = `HTTP ${tagsRes.status}`;
                    }
                } else {
                    const modelsRes = await fetch(`${root}/v1/models`, { headers: authHeaders, signal: AbortSignal.timeout(5000) });
                    connected = modelsRes.ok;
                    if (!connected) error = `HTTP ${modelsRes.status}`;
                    if (connected) {
                        // LM Studio 확장 API(/api/v0/models)가 있으면 현재 로드된 모델을 알 수 있다(표준 OpenAI 호환 API엔 없음).
                        try {
                            const v0Res = await fetch(`${root}/api/v0/models`, { headers: authHeaders, signal: AbortSignal.timeout(5000) });
                            if (v0Res.ok) {
                                const v0Json: any = await v0Res.json();
                                running = Array.isArray(v0Json?.data)
                                    ? v0Json.data.filter((m: any) => m?.state === 'loaded').map((m: any) => ({ name: m?.id ?? '' }))
                                    : [];
                            }
                        } catch { /* LM Studio 확장 API 미지원 서버는 무시(연결 자체는 이미 확인됨) */ }
                    }
                }
            } catch (e: any) {
                connected = false;
                error = String(e?.message ?? e);
            }

            return { key, label: v?.name ?? key, backend, host, connected, error, modelCount, running };
        }));

        _res.json({ providers });
        return null;
    }

    // POST /AIInfo/prune-conversations  body: { months?: number }
    // 각 provider가 로컬에 남기는 세션 저장소에서 months개월보다 오래된 것을 지운다(이 컴퓨터의 모든
    // 프로젝트 대상). 설치 안 된 provider는 건너뛴다(CAI.ProviderInfo로 확인). 파괴적 작업이라 인증 필요.
    async onPruneConversations(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const monthsRaw = _json.GetInt('months');
        const months = (typeof monthsRaw === 'number' && monthsRaw > 0) ? monthsRaw : 1;
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);
        const cutoffMs = cutoffDate.getTime();

        const results: Record<string, PruneOutcome> = {};
        const runners: Partial<Record<CAI.eProvider, () => number | Promise<number>>> = {
            [CAI.eProvider.claude]:      () => _pruneClaude(cutoffMs),
            [CAI.eProvider.codex]:       () => _pruneCodex(cutoffMs),
            [CAI.eProvider.grok]:        () => _pruneGrok(cutoffMs),
            [CAI.eProvider.opencode]:    () => _pruneOpencode(cutoffMs),
            [CAI.eProvider.antigravity]: () => _pruneAntigravity(cutoffMs),
        };

        for (const [provider, run] of Object.entries(runners) as [CAI.eProvider, () => number | Promise<number>][]) {
            const info = await CAI.ProviderInfo(provider);
            if (!info.installed) { results[provider] = { installed: false, deleted: 0 }; continue; }
            try {
                results[provider] = { installed: true, deleted: await run() };
            } catch (e: any) {
                results[provider] = { installed: true, deleted: 0, error: String(e?.message ?? e) };
                CConsol.Log(`[CAIInfoRouter] prune failed provider=${provider}: ${e?.message ?? e}`, CConsol.eColor.red);
            }
        }

        const totalDeleted = Object.values(results).reduce((sum, r) => sum + r.deleted, 0);
        _res.json({ ok: true, months, cutoff: cutoffDate.toISOString(), totalDeleted, results });
        return null;
    }
}

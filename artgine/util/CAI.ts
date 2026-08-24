export interface IAIInteractiveArgs {
    args: string[];
}

// ai/settings.json models.<provider>[] 항목과 동일한 형식.
export interface IProviderModel {
    value: string;
    label: string;
}

export interface IProviderInfo {
    id: CAI.eProvider;
    installed: boolean;
    authenticated: boolean;
    version: string;
    models: IProviderModel[];
}

// fiveHour/weekly: 남은 사용량 비율(1=가득 참, 0=소진). 조회 실패/미지원 시 -1.
export interface IProviderUsage {
    fiveHour: number;
    weekly: number;
}

export interface IChatResult {
    text: string;
    sessionId?: string;
}

export class CAI {
    static readonly IS_WIN: boolean = false;
    static readonly EMPTY_MCP_PATH: string = '';

    static AIDir(): string { return ''; }
    static CreateRole(_provider: CAI.eProvider, _targetDir?: string, _host?: string, _port?: number, _basePath?: string): boolean | string | null { return false; }
    static DeleteRole(_provider: CAI.eProvider, _targetDir: string): boolean { return false; }
    static ProviderInfo(_provider: CAI.eProvider): Promise<IProviderInfo> { return Promise.resolve({ id: _provider, installed: false, authenticated: false, version: '', models: [] }); }
    static ProviderInstall(_provider: CAI.eProvider): Promise<boolean> { return Promise.resolve(false); }
    static ProviderUsage(_provider: CAI.eProvider): Promise<IProviderUsage> { return Promise.resolve({ fiveHour: -1, weekly: -1 }); }
    /** 프로바이더가 현재 제공하는 모델 목록. ai/settings.json models 항목 형식({value,label}[])과 동일. 실패 시 []. */
    static ProviderModels(_provider: CAI.eProvider): Promise<IProviderModel[]> { return Promise.resolve([]); }
    static Chat(_provider: CAI.eProvider, _model: string, _cwd: string, _prompt: string, _mcp = true, _cliSessionId?: string, _isFirstCall = true, _write = true): Promise<IChatResult> { return Promise.reject(new Error('CAI_imple not loaded')); }
    /**
     * 셸 명령 1건을 cwd에서 실행하고 stdout+stderr를 IChatResult.text로 돌려준다.
     * CLI 프로바이더가 아닌 'cmd' 의사 프로바이더(채팅에서 순수 셸 실행) 전용 — 대화 맥락이 없어 sessionId도 없다.
     */
    static Cmd(_cwd: string, _command: string, _timeoutMs?: number): Promise<IChatResult> { return Promise.reject(new Error('CAI_imple not loaded')); }
    static Terminal(_provider: CAI.eProvider, _mcp: boolean, _model?: string): Promise<IAIInteractiveArgs> { return Promise.resolve({ args: [] }); }
}

export namespace CAI {
    export enum eProvider { claude='claude', codex='codex', gpt='gpt', antigravity='antigravity', opencode='opencode', grok='grok' }

    // CAI.Chat이 헤드리스로 spawn한 CLI 세션의 id(cwd 안 대화형 pty와 무관한 1회성 호출임을 표시).
    // CConversationReader가 같은 (provider,cwd)의 대화형 pty가 하나뿐일 때 새 트랜스크립트를 그 pty의
    // 것으로 오판(_soleLiveKey 폴백)하는 걸 막기 위해, 여기 등록된 sessionId는 추적 대상에서 제외한다.
    // value는 등록 시각(ms) — 오래된 항목은 등록 시점에 함께 청소해 무한정 자라지 않게 한다.
    export const gHeadlessSessionIds = new Map<string, number>();
}

import CAI_imple from "../util_imple/CAI.js";
CAI_imple();

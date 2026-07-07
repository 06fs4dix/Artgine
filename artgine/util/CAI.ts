export interface IAIInteractiveArgs {
    args: string[];
}

export interface IProviderInfo {
    id: CAI.eProvider;
    installed: boolean;
    authenticated: boolean;
    version: string;
    models: { value: string; label: string }[];
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
    static Chat(_provider: CAI.eProvider, _model: string, _cwd: string, _prompt: string, _mcp = true, _cliSessionId?: string, _isFirstCall = true): Promise<IChatResult> { return Promise.reject(new Error('CAI_imple not loaded')); }
    static Terminal(_provider: CAI.eProvider, _mcp: boolean, _model?: string): Promise<IAIInteractiveArgs> { return Promise.resolve({ args: [] }); }
    // ttyd 로컬 실행파일 경로(버전/원본 릴리즈 자산명과 무관하게 고정된 이름). 존재 여부는 보장하지 않는다.
    static TtydLocalPath(): string { return ''; }
    // 로컬에 없으면 지정 버전의 ttyd를 다운로드해 고정 파일명으로 저장 후 경로를 반환한다. macOS는 upstream에 바이너리가 없어 예외를 던진다.
    static EnsureTtyd(_version: string): Promise<string> { return Promise.reject(new Error('CAI_imple not loaded')); }
}

export namespace CAI {
    export enum eProvider { claude='claude', codex='codex', manus='manus', gpt='gpt', antigravity='antigravity', opencode='opencode' }
}

import CAI_imple from "../util_imple/CAI.js";
CAI_imple();

export interface IAIInteractiveArgs {
    args: string[];
}

export interface IProviderInfo {
    id: CAI.eProvider;
    available: boolean;
    version: string;
    models: { value: string; label: string }[];
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
    static ProviderInfo(_provider: CAI.eProvider): Promise<IProviderInfo> { return Promise.resolve({ id: _provider, available: false, version: '', models: [] }); }
    static ProviderInstall(_provider: CAI.eProvider): Promise<boolean> { return Promise.resolve(false); }
    static Chat(_provider: CAI.eProvider, _model: string, _cwd: string, _prompt: string, _mcp = true, _cliSessionId?: string, _isFirstCall = true): Promise<IChatResult> { return Promise.reject(new Error('CAI_imple not loaded')); }
    static Terminal(_provider: CAI.eProvider, _mcp: boolean, _model?: string): Promise<IAIInteractiveArgs> { return Promise.resolve({ args: [] }); }
}

export namespace CAI {
    export enum eProvider { claude='claude', codex='codex', manus='manus', gpt='gpt', antigravity='antigravity', opencode='opencode' }
}

import CAI_imple from "../util_imple/CAI.js";
CAI_imple();

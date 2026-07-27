export class CAI {
    static IS_WIN = false;
    static EMPTY_MCP_PATH = '';
    static AIDir() { return ''; }
    static CreateRole(_provider, _targetDir, _host, _port, _basePath) { return false; }
    static DeleteRole(_provider, _targetDir) { return false; }
    static ProviderInfo(_provider) { return Promise.resolve({ id: _provider, installed: false, authenticated: false, version: '', models: [] }); }
    static ProviderInstall(_provider) { return Promise.resolve(false); }
    static ProviderUsage(_provider) { return Promise.resolve({ fiveHour: -1, weekly: -1 }); }
    static ProviderModels(_provider) { return Promise.resolve([]); }
    static Chat(_provider, _model, _cwd, _prompt, _mcp = true, _cliSessionId, _isFirstCall = true, _write = true) { return Promise.reject(new Error('CAI_imple not loaded')); }
    static Cmd(_cwd, _command, _timeoutMs) { return Promise.reject(new Error('CAI_imple not loaded')); }
    static Terminal(_provider, _mcp, _model) { return Promise.resolve({ args: [] }); }
}
(function (CAI) {
    let eProvider;
    (function (eProvider) {
        eProvider["claude"] = "claude";
        eProvider["codex"] = "codex";
        eProvider["gpt"] = "gpt";
        eProvider["antigravity"] = "antigravity";
        eProvider["opencode"] = "opencode";
        eProvider["grok"] = "grok";
    })(eProvider = CAI.eProvider || (CAI.eProvider = {}));
})(CAI || (CAI = {}));
import CAI_imple from "../util_imple/CAI.js";
CAI_imple();

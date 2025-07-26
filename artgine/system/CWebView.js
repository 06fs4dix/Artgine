import { CJSON } from "../basic/CJSON.js";
import { CFile } from "./CFile.js";
var g_webViewType = null;
export class CWebView {
    static eType = {
        WPF: "WPF",
        CEF: "CEF",
        Flutter: "Flutter",
        Electron: "Electron",
        None: "None",
    };
    static IsWebView() {
        if (g_webViewType != null)
            return g_webViewType;
        if (window["chrome"] != null && window["chrome"].webview != null && window["chrome"].webview.hostObjects != null &&
            window["chrome"].webview.hostObjects)
            g_webViewType = CWebView.eType.WPF;
        else if (window["cefQuery"] != null)
            g_webViewType = CWebView.eType.CEF;
        else if (window["flutter_inappwebview"] != null || window["flutter"] != null)
            g_webViewType = CWebView.eType.Flutter;
        else if (window["electronAPI"]) {
            g_webViewType = CWebView.eType.Electron;
        }
        else
            g_webViewType = CWebView.eType.None;
        return g_webViewType;
    }
    static async Call(funcName, _dataToWV2 = null) {
        const data = (typeof _dataToWV2 === "object" ? JSON.stringify(_dataToWV2) : _dataToWV2);
        if (await CWebView.IsWebView() === CWebView.eType.WPF) {
            const bridge = window["cefQuery"].webview.hostObjects.bridge;
            if (_dataToWV2 != null) {
                return bridge[funcName](data);
            }
            else {
                return bridge[funcName]();
            }
        }
        else if (await CWebView.IsWebView() === CWebView.eType.CEF) {
            return new Promise((resolve, reject) => {
                window["cefQuery"]({
                    request: JSON.stringify({
                        func: funcName,
                        data: data
                    }),
                    onSuccess: function (response) {
                        try {
                            let parsed = response;
                            if ((response.startsWith("{") && response.endsWith("}")) ||
                                (response.startsWith("[") && response.endsWith("]"))) {
                                parsed = JSON.parse(response);
                            }
                            else if (!isNaN(Number(response))) {
                                parsed = Number(response);
                            }
                            else if (response === "true") {
                                parsed = true;
                            }
                            else if (response === "false") {
                                parsed = false;
                            }
                            resolve(parsed);
                        }
                        catch (e) {
                            resolve(response);
                        }
                    },
                    onFailure: function (code, msg) {
                        reject(new Error(`cefQuery failed [${code}]: ${msg}`));
                    }
                });
            });
        }
        else if (await CWebView.IsWebView() === CWebView.eType.Electron) {
            const ipcRenderer = window["electronAPI"].ipcRenderer;
            if (!ipcRenderer || typeof ipcRenderer.invoke !== "function") {
                console.warn("ipcRenderer가 제대로 연결되지 않았습니다.");
                return;
            }
            return ipcRenderer.invoke(funcName, _dataToWV2);
        }
        else if (await CWebView.IsWebView() === CWebView.eType.Flutter) {
            return window["flutter_inappwebview"].callHandler(funcName, _dataToWV2);
        }
        return Promise.reject("No WebView detected");
    }
    static JToWKeyUp(_key) {
        CWebView.Call("KeyUp", _key);
    }
    static async JToWConnect(_proj) {
        return await CWebView.Call("Connect", _proj);
    }
    static async JToWFileOpen(_multi = false, _ext = null) {
        var json = new CJSON(await CWebView.Call("FileOpen", { multi: _multi, _ext: _ext })).ToJSON({ name: [], data: [] });
        return json;
    }
    static async JToWFileSave(_type, _filename, _data) {
        if (CWebView.IsWebView() == CWebView.eType.None) {
            await CFile.Save(_data, _filename, true);
            return;
        }
        await CWebView.Call("FileSave", { type: _type, filename: _filename, data: _data });
    }
    static async JToWFileDroppedPath(_files) {
        if (await CWebView.IsWebView() === CWebView.eType.Electron) {
            let pathsStr = await CWebView.Call("FileDroppedPath");
            let paths = JSON.parse(pathsStr);
            return paths;
        }
        return new Array(_files.length);
    }
}

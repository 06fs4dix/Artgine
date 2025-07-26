import {CJSON} from "../basic/CJSON.js";
import { CFile } from "./CFile.js";

var g_webViewType : string=null;
export class CWebView
{
    /*
    //cs쪽에 아래와 같은 클래스 있어야 함.
    [ClassInterface(ClassInterfaceType.AutoDual)]
    [ComVisible(true)]
    public class Bridge
    {
        //Somethings
    }

    //아래 함수로 js에 등록 가능
    webView.CoreWebView2.AddHostObjectToScript("bridge", new Bridge());
    */
    //class명 무조건 bridge여야 함.

    static eType=
    {
        WPF:"WPF",
        CEF:"CEF",
        Flutter : "Flutter",
        Electron : "Electron",
        None:"None",
    }

    static IsWebView()
    {
        if(g_webViewType!=null) return g_webViewType;
        
        if(window["chrome"] != null && window["chrome"].webview != null && window["chrome"].webview.hostObjects != null &&
             window["chrome"].webview.hostObjects)
            g_webViewType=CWebView.eType.WPF;
            
        else if(window["cefQuery"] != null)
            g_webViewType=CWebView.eType.CEF;
        else if (window["flutter_inappwebview"] != null || window["flutter"] != null) 
            g_webViewType=CWebView.eType.Flutter;
        else if (window["electronAPI"])
        {
            g_webViewType=CWebView.eType.Electron;
        }
        else
            g_webViewType=CWebView.eType.None;
        
       
        
        return g_webViewType;
    }
    //리턴값은 무조건 string이고, 랩핑함수에서 오브젝트를 받아서 따로 변경해라
    static async Call(funcName: string, _dataToWV2 = null): Promise<string> 
    {
        const data = (typeof _dataToWV2 === "object" ? JSON.stringify(_dataToWV2) : _dataToWV2); 
    
        if (await CWebView.IsWebView() === CWebView.eType.WPF) 
        {
            const bridge = window["cefQuery"].webview.hostObjects.bridge;
            if (_dataToWV2 != null) {
                return bridge[funcName](data);
            } else {
                return bridge[funcName]();
            }
        } 
        else if (await CWebView.IsWebView() === CWebView.eType.CEF) 
        {
            return new Promise((resolve, reject) => {
                window["cefQuery"]({
                    request: JSON.stringify({
                        func: funcName,
                        data: data
                    }),
                    onSuccess: function(response) 
                    {
                        try {
                            let parsed: any = response;
            
                            // 1. JSON 형태라면 객체 or 배열
                            if ((response.startsWith("{") && response.endsWith("}")) ||
                                (response.startsWith("[") && response.endsWith("]"))) {
                                parsed = JSON.parse(response);
                            }
                            // 2. 숫자 판별 (정수 또는 실수)
                            else if (!isNaN(Number(response))) {
                                parsed = Number(response);
                            }
                            // 3. 불리언
                            else if (response === "true") {
                                parsed = true;
                            }
                            else if (response === "false") {
                                parsed = false;
                            }
            
                            resolve(parsed);
                        } catch (e) {
                            // JSON 파싱 에러 → 문자열 그대로 반환
                            resolve(response);
                        }
                    },
                    onFailure: function(code, msg) 
                    {
                        reject(new Error(`cefQuery failed [${code}]: ${msg}`));
                    }
                });
            });
        }
        else if (await CWebView.IsWebView() === CWebView.eType.Electron) 
        {
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
        // else if (CWebView.IsWebView() === CWebView.eType.Flutter) {
        //     return new Promise((resolve, reject) => {
        //         // window.flutter_call_handler는 dart에서 expose해야 함
        //         if (window.flutter_call_handler) {
        //             window.flutter_call_handler(funcName, data)
        //                 .then(resolve)
        //                 .catch(reject);
        //         } else {
        //             reject(new Error("Flutter bridge not available"));
        //         }
        //     });
        // }


        return Promise.reject("No WebView detected");
        
    }
    static JToWKeyUp(_key)
    {
        CWebView.Call("KeyUp",_key);
    }
    //프로젝트 보내서 다른 클라 막는용
    static async JToWConnect(_proj : string)
    {
        return await CWebView.Call("Connect",_proj);
    }
    static async JToWFileOpen(_multi=false,_ext=null)
    {
        var json=new CJSON(await CWebView.Call("FileOpen",{multi:_multi,_ext:_ext})).ToJSON({name:[],data:[]});
        return json;
    }
    static async JToWFileSave(_type : string,_filename,_data : string)
    {
        if(CWebView.IsWebView()==CWebView.eType.None)
        {
            await CFile.Save(_data,_filename,true);
            return;
        }
        await CWebView.Call("FileSave",{type:_type,filename:_filename,data:_data});
    }
    static async JToWFileDroppedPath(_files : FileList) : Promise<string[]>
    {
        if (await CWebView.IsWebView() === CWebView.eType.Electron) 
        {
            let pathsStr=await CWebView.Call("FileDroppedPath");
            let paths=JSON.parse(pathsStr);
            //let paths=await window["electronAPI"].handleDrop(_files);
            
            return paths;
        }
        
        

        return new Array(_files.length);
    }
}
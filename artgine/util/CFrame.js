import { CWindow } from "../system/CWindow.js";
import { CPreferences } from "../basic/CPreferences.js";
import { CRes } from "../system/CRes.js";
import { CTimer } from "../system/CTimer.js";
import { CWASM } from "../basic/CWASM.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CEvent } from "../basic/CEvent.js";
import { CCoroutine } from "./CCoroutine.js";
import { CConfirm, CModal } from "../basic/CModal.js";
import { CPWA } from "../system/CPWA.js";
import { CConsol } from "../basic/CConsol.js";
import { CModalChat, CModalFrameView, CFileViewer, CLoadingBack } from "./CModalUtil.js";
import { CAlert } from "../basic/CAlert.js";
import { CInput } from "../system/CInput.js";
import { CWebView } from "../system/CWebView.js";
import { CRendererGL } from "../render/CRenderer.js";
import { CDeviceGL } from "../render/CDevice.js";
import { CShaderInterpretGL } from "../render/CShaderInterpret.js";
import { CSoundMgr } from "../system/CSoundMgr.js";
import { CChecker } from "./CChecker.js";
import { CWebXR } from "./CWebXR.js";
import { CLoader } from "./CLoader.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CTexture } from "../render/CTexture.js";
import { CBatchMgrGL } from "../render/CBatchMgr.js";
import { CPalette } from "./CPalette.js";
import { CPlugin } from "./CPlugin.js";
import { CPath } from "../basic/CPath.js";
import { CString } from "../basic/CString.js";
import { CRollBack } from "./CRollBack.js";
const invisibleButton = document.createElement("div");
invisibleButton.style.position = "absolute";
invisibleButton.style.top = "0";
invisibleButton.style.left = "0";
invisibleButton.style.width = "32px";
invisibleButton.style.height = "32px";
invisibleButton.style.opacity = "0";
invisibleButton.style.zIndex = "9999";
invisibleButton.style.pointerEvents = "auto";
invisibleButton.style.background = "transparent";
document.body.appendChild(invisibleButton);
let gConsolChat = null;
var gFocus = null;
function CConsolModalInit() {
    gConsolChat = new CModalChat("ConsolChat", false);
    gConsolChat.SetCloseToHide(true);
    gConsolChat.Open();
    gConsolChat.On(CEvent.eType.Chat, (msg) => {
        msg = msg.toLowerCase();
        gConsolChat.ChatAdd(msg);
        if (["frame", "fps"].some(word => msg.includes(word)))
            new CModalFrameView();
        else if (["win", "window", "preferences"].some(word => msg.includes(word)) &&
            ["size"].some(word => msg.includes(word))) {
            gConsolChat.ChatAdd("win width : " + window.innerWidth + " height : " + window.innerHeight, "#00cc00");
        }
        else if (["pf", "cpreferences"].some(word => msg.includes(word)) &&
            ["size"].some(word => msg.includes(word))) {
            gConsolChat.ChatAdd("pf width : " + CFrame.Main().PF().mWidth + " height : " + CFrame.Main().PF().mHeight, "#00cc00");
        }
    });
    while (CConsol.GetLogQue().IsEmpty() == false)
        gConsolChat.ChatAdd(CConsol.GetLogQue().Dequeue(), "gray");
}
window.addEventListener('error', function (event) {
    if (event.message.indexOf("ResizeObserver") != -1)
        return;
    if (gConsolChat == null && gMainFramework == null)
        CConsolModalInit();
    CConsol.Log("📄 filename: " + event.filename);
    CConsol.Log("📌 lineno/colno: " + event.lineno + "/" + event.colno);
    if (event.error) {
        CConsol.Log("💬 message: " + event.error.message);
        CConsol.Log("🧵 stack:\n" + event.error.stack);
    }
    else {
        CConsol.Log("⚠️ message: " + event.message);
    }
});
window.addEventListener("unhandledrejection", function (event) {
    if (gConsolChat == null && gMainFramework == null)
        CConsolModalInit();
    CConsol.Log("💬 reason:" + event.reason);
});
CConsol.SetLogEvent((_msg, _color) => {
    if (gConsolChat != null && gConsolChat.IsShow()) {
        gConsolChat.ChatAdd(_msg, _color);
    }
    else
        return true;
    return false;
});
invisibleButton.addEventListener("dblclick", () => {
    if (gConsolChat == null) {
        CConsolModalInit();
    }
    else
        gConsolChat.Show();
    while (CConsol.GetLogQue().IsEmpty() == false)
        gConsolChat.ChatAdd(CConsol.GetLogQue().Dequeue(), "gray");
});
document.addEventListener("freeze", () => {
    if (CFrame.Main() == null)
        return;
    CFrame.EventCall(CFrame.Main().GetEvent(CEvent.eType.Freeze));
});
document.addEventListener("resume", () => {
    if (CFrame.Main() == null)
        return;
    CFrame.EventCall(CFrame.Main().GetEvent(CEvent.eType.Resume));
});
document.addEventListener("visibilitychange", () => {
    if (CFrame.Main() == null)
        return;
    if (document.hidden) {
        CFrame.EventCall(CFrame.Main().GetEvent(CEvent.eType.Freeze));
    }
    else {
        CFrame.EventCall(CFrame.Main().GetEvent(CEvent.eType.Resume));
    }
});
var g_offset = 0;
export class CFrame {
    mMainProcess;
    mSubProcess;
    mLoadProcess = null;
    mRenderProcess = null;
    mLoadChk = null;
    m_offset;
    mDevice;
    mRenderer;
    mBatchMgr;
    mWindow;
    mSoundMgr = null;
    mPreferences;
    mLoader;
    mRes = new CRes();
    mInput;
    m_palette = new CPalette();
    mIAutoRenderArr = new Array();
    mResizeList = new Array();
    mEventVec = new Array();
    mDelay = 0;
    Input() { return this.mInput; }
    Delay() { return this.mDelay; }
    Win() { return this.mWindow; }
    Dev() { return this.mDevice; }
    Ren() { return this.mRenderer; }
    BMgr() { return this.mBatchMgr; }
    Load() { return this.mLoader; }
    Res() { return this.mRes; }
    PF() { return this.mPreferences; }
    Pal() { return this.m_palette; }
    SMgr() { return this.mSoundMgr; }
    Off() { return this.m_offset; }
    static Main() { return gMainFramework; }
    static Sub() { return gSubFramework; }
    static CConsolModal() {
        if (gConsolChat == null)
            CConsolModalInit();
        else
            gConsolChat.Show();
    }
    IsInit() { return this.mLoadProcess == null; }
    constructor(_pf, _htmlObj = "") {
        this.m_offset = g_offset++;
        this.mPreferences = _pf;
        var canDummy = _htmlObj;
        if (typeof _htmlObj == "string") {
            canDummy = document.getElementById(_htmlObj);
            if (canDummy == null) {
                canDummy = document.createElement("canvas");
                canDummy.width = 640;
                canDummy.height = 480;
                if (_htmlObj == "")
                    canDummy.id = "can_" + CUniqueID.GetHash();
                else
                    canDummy.id = _htmlObj;
                document.body.append(canDummy);
                document.body.style.userSelect = 'none';
                document.body.style.backgroundColor = "black";
            }
            else {
                canDummy.id = _htmlObj;
            }
            canDummy.setAttribute("draggable", "true");
            canDummy.setAttribute("oncontextmenu", "return false");
            canDummy.setAttribute("ondragstart", "return false");
            canDummy.setAttribute("onselectstart", "return false");
            canDummy.setAttribute("onselectstart", "return false");
            canDummy.style.display = 'block';
            canDummy.style.backgroundColor = 'black';
            canDummy.style.userSelect = 'none';
            canDummy.style.outline = 'none';
            canDummy.style.webkitUserSelect = "none";
        }
        else if (_htmlObj instanceof HTMLCanvasElement) {
            CAlert.E("HTMLCanvasElement 구현 안함");
        }
        this.mSoundMgr = new CSoundMgr(this.mRes);
        this.mInput = new CInput(_pf, canDummy);
        if (gMainFramework == null) {
            window.addEventListener('DOMContentLoaded', (event) => {
                var inputList = document.querySelectorAll("input");
                for (var input of inputList) {
                    input.onfocus = () => {
                        this.mInput.SetFocus(false);
                    };
                    input.onblur = () => {
                        this.mInput.SetFocus(true);
                    };
                }
            });
            window.onkeydown = (e) => {
                if (e.keyCode >= 112 && e.keyCode <= 121) {
                    if (e.keyCode >= 112 && e.keyCode <= 115)
                        this.mInput.mKeyPress[e.keyCode] = true;
                    e.preventDefault();
                    return false;
                }
                if (e.keyCode == 123 && this.mPreferences.mDeveloper == false) {
                    e.preventDefault();
                    e.returnValue = false;
                    return false;
                }
                if (e.keyCode == 18) {
                    e.preventDefault();
                    return false;
                }
                if (e.keyCode == 13 && e.altKey) {
                    if (CWebView.IsWebView() == CWebView.eType.None)
                        CWindow.ScreenFull();
                    else
                        CWebView.JToWKeyUp("Alt+Enter");
                }
                if (e.keyCode == 90 && e.ctrlKey) {
                    if (CRollBack.Exe())
                        e.preventDefault();
                }
                if (e.altKey) {
                    e.preventDefault();
                    return false;
                }
            };
            window.onkeyup = (e) => {
                if (e.keyCode >= 112 && e.keyCode <= 115) {
                    this.mInput.mKeyPress[e.keyCode] = false;
                    e.preventDefault();
                }
                if (e.keyCode == 115 && (CWebView.IsWebView() == CWebView.eType.None || e.ctrlKey == true) && this.mPreferences.mDeveloper == true) {
                    let info = CString.ExtCut(CPath.FullPath());
                    let sv = new CFileViewer([info.name + ".ts", info.name + ".json", info.name + ".html"]);
                    sv.Open();
                }
            };
        }
        if (this.mPreferences.mIAuto) {
            this.PushEvent(CEvent.eType.Load, new CEvent(async () => {
                await this.m_palette.Load(this);
            }));
            this.PushEvent(CEvent.eType.Init, new CEvent(() => {
                this.m_palette.Init(this);
            }));
        }
        if (canDummy != null) {
            this.mWindow = new CWindow(this.mPreferences, canDummy, this.mInput);
            if (navigator.gpu && this.mPreferences.mRenderer == CPreferences.eRenderer.GPU) {
            }
            else if (this.mPreferences.mRenderer == CPreferences.eRenderer.GL) {
                this.mDevice = new CDeviceGL(this.mPreferences, canDummy);
                this.mRenderer = new CRendererGL(this.mDevice, new CShaderInterpretGL(), this.mRes, this.mPreferences);
                this.mBatchMgr = new CBatchMgrGL(this.mRenderer);
            }
            this.mLoader = new CLoader(this.mRenderer, this.mRes);
        }
        if (gMainFramework == null)
            gMainFramework = this;
        else
            gSubFramework = this;
    }
    PushIAuto(_any) {
        if (_any["Init"]) {
            this.mEventVec.push(new CEvent("Init", _any, CEvent.eType.Init));
        }
        if (_any["Update"]) {
            this.mEventVec.push(new CEvent("Update", _any, CEvent.eType.Update));
        }
        if (_any["Render"]) {
            if (this.mIAutoRenderArr.length == 0) {
                this.mRenderProcess = async () => {
                    this.Ren().Begin();
                    for (var each0 of this.mIAutoRenderArr) {
                        each0.RenderQue(true);
                    }
                    if (this.mIAutoRenderArr.length > 0)
                        this.mIAutoRenderArr[0].RenderQue(false);
                    await CFrame.EventCall(this.GetEvent(CEvent.eType.Render));
                    this.Ren().End();
                };
            }
            this.mIAutoRenderArr.push(_any);
        }
    }
    PushEvent(_type, _event) {
        this.mEventVec.push(CEvent.ToCEvent(_event, _type));
    }
    RemoveEvent(_event) {
        for (let i = 0; i < this.mEventVec.length; ++i) {
            if (this.mEventVec[i] === _event) {
                this.mEventVec.splice(i, 1);
                break;
            }
        }
    }
    RemoveIAuto(_IAuto) {
        for (let i = 0; i < this.mEventVec.length; ++i) {
            if (this.mEventVec[i].mClass == _IAuto) {
                this.mEventVec.splice(i, 1);
            }
        }
        for (let i = 0; i < this.mIAutoRenderArr.length; ++i) {
            if (this.mIAutoRenderArr[i] == _IAuto) {
                this.mIAutoRenderArr.splice(i, 1);
            }
        }
    }
    GetEvent(_key) {
        var earr = new Array();
        for (var each0 of this.mEventVec) {
            if (each0.mKey == _key) {
                earr.push(each0);
            }
        }
        return earr;
    }
    Update(_delay) {
        this.mDelay = _delay;
        if (document.visibilityState != "visible" || document.hidden == true)
            this.SetCurser(CFrame.eCurser.notAllowed);
        else if (gMainFramework.Win() != null && document.activeElement != gMainFramework.Win().Handle())
            this.SetCurser(CFrame.eCurser.help);
        else
            this.SetCurser(CFrame.eCurser.default);
        if (CFrame.Main() == this) {
            let mList = CModal.GetModalList();
            let conFocus = true;
            for (let m of mList) {
                if (m.IsPause() == false)
                    m.Update(_delay);
                if (m.mDebugMode != null) {
                    if (this.PF().mDebugMode && m.mShow && m.mDebugMode == true) {
                        m.Hide(0);
                        m.mDebugMode = false;
                    }
                    else if (this.PF().mDebugMode == false && m.mDebugMode == false) {
                        m.mDebugMode = true;
                        m.Show();
                    }
                }
                if (m instanceof CConfirm)
                    conFocus = false;
            }
            this.Input().SetFocus(conFocus);
            let cLoop = CCoroutine.GetLoopArr();
            for (let i = 0; i < cLoop.Size(); ++i) {
                cLoop.Find(i).Start();
            }
            cLoop.Clear();
        }
        this.mInput.Update(_delay);
        this.mSoundMgr.Update(_delay);
        if (this.mWindow != null) {
            this.mWindow.Update(_delay);
            if (this.mResizeList.length > 0) {
                for (let i = 0; i < this.mResizeList.length; ++i) {
                    let res = this.mRes.Find(this.mResizeList[i]);
                    if (res.m_depthBuf != null) {
                        var size = new CVec2(Math.trunc(res.GetRWidth() * this.PF().mWidth), Math.trunc(res.GetRHeight() * this.PF().mHeight));
                        if (size.IsZero())
                            continue;
                        if (res.GetWidth() != size.x || res.GetHeight() != size.y)
                            this.Ren().BuildRenderTarget(res.GetInfo(), size, this.mResizeList[i]);
                        var ntex = this.Res().Find(this.mResizeList[i]);
                        ntex.SetFilter(res.GetFilter());
                        this.mResizeList.splice(i, 1);
                        i--;
                    }
                }
            }
            if (this.mWindow.IsResize() || CWebXR.IsResize()) {
                let mList = CModal.GetModalList();
                for (let m of mList) {
                    if (m.mLimitPush)
                        m.LimitPushChk();
                }
                for (let key of this.mRes.Keys()) {
                    let res = this.mRes.Find(key);
                    if (res instanceof CTexture) {
                        if (res.GetAutoResize() && res.GetInfo()[0].mTarget == CTexture.eTarget.Sigle) {
                            if (res.mDepthBuf != null) {
                                var size = new CVec2(Math.trunc(res.GetRWidth() * this.PF().mWidth), Math.trunc(res.GetRHeight() * this.PF().mHeight));
                                if (size.IsZero())
                                    continue;
                                if (res.GetWidth() != size.x || res.GetHeight() != size.y)
                                    this.Ren().BuildRenderTarget(res.GetInfo(), size, key);
                                var ntex = this.Res().Find(key);
                                ntex.SetFilter(res.GetFilter());
                            }
                            else {
                                this.mResizeList.push(key);
                            }
                        }
                    }
                }
                CFrame.EventCall(this.GetEvent(CEvent.eType.Resize));
            }
        }
    }
    static async EventCall(_eventArr, _val = null) {
        if (_eventArr == null)
            return;
        for (var each0 of _eventArr) {
            if (each0.IsCall())
                await each0.CallAsync(_val);
        }
    }
    async Process() {
        new CLoadingBack("MainLoading", () => {
            return this.Load().mLoadSet.size;
        });
        if (this.mDevice)
            await this.mDevice.Init();
        let path = CPath.PHPC();
        if (this.mPreferences.mGitHub)
            path = "https://06fs4dix.github.io/Artgine/";
        await CWASM.Init(this.mPreferences.mWASM, path);
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller)
            await CPWA.IsOnline();
        if (CPlugin.sEventVec.length > 0 && gMainFramework == this) {
            for (let event of CPlugin.sEventVec) {
                this.PushEvent(event.mKey, event);
            }
        }
        var timer = new CTimer();
        var subCall = false;
        var subWDelay = 0;
        this.mMainProcess = async () => {
            if (this.mMainProcess == null)
                return;
            var time = timer.Delay() * 1000;
            if (time > 1000)
                time = 10;
            subWDelay += time;
            this.Update(time);
            await CFrame.EventCall(this.GetEvent(CEvent.eType.Update), time);
            if (this.mRenderProcess == null)
                await CFrame.EventCall(this.GetEvent(CEvent.eType.Render));
            else
                await this.mRenderProcess();
            requestAnimationFrame(this.mMainProcess);
            if (subCall == false || subWDelay > 1000 * 3) {
                CWASM.SetThread(true);
                CFrame.EventCall(this.GetEvent(CEvent.eType.SubUpdate));
                subWDelay = 0;
            }
            CWASM.SetThread(false);
        };
        this.mSubProcess = (deadline) => {
            CWASM.SetThread(true);
            if (this.mMainProcess == null)
                return;
            subWDelay = 0;
            subCall = true;
            CFrame.EventCall(this.GetEvent(CEvent.eType.SubUpdate), deadline);
            if ('requestIdleCallback' in window)
                requestIdleCallback(this.mSubProcess);
            CWASM.Checker(1);
        };
        await CFrame.EventCall(this.GetEvent(CEvent.eType.Load));
        CChecker.Exe(async () => {
            if (this.mMainProcess == null)
                return;
            if (this.Load().LoadCompleteChk())
                this.mLoadChk = true;
            if (this.mLoadChk) {
                await CFrame.EventCall(this.GetEvent(CEvent.eType.Init));
                requestAnimationFrame(this.mMainProcess);
                if ('requestIdleCallback' in window)
                    requestIdleCallback(this.mSubProcess);
                this.mLoadProcess = null;
            }
            else {
                this.mLoadChk = false;
                CFrame.EventCall(this.GetEvent(CEvent.eType.LoadUpdate));
                return true;
            }
            return false;
        });
    }
    Destroy() {
        this.mLoadProcess = null;
        this.mSubProcess = null;
        this.mMainProcess = null;
    }
    static eCurser = {
        default: "default",
        pointer: "pointer",
        wait: "wait",
        none: "none",
        help: "help",
        notAllowed: "not-allowed",
    };
    SetCurser(_type) {
        if (this.Win() != null && this.Win().Handle().style.cursor != _type)
            this.Win().Handle().style.cursor = _type;
    }
}
var gMainFramework = null;
var gSubFramework = null;

import { Bootstrap } from "../basic/Bootstrap.js";
import { CBlackBoard } from "../basic/CBlackBoard.js";
import { CDOM } from "../basic/CDOM.js";
import { CEvent } from "../basic/CEvent.js";
import { CModal, CConfirm } from "../basic/CModal.js";
import { CAlert } from "../basic/CAlert.js";
import { CStorage } from "../system/CStorage.js";
import { CObject } from "../basic/CObject.js";
import { CPath } from "../basic/CPath.js";
import { CString } from "../basic/CString.js";
import { CUtil } from "../basic/CUtil.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CFile } from "../system/CFile.js";
import { CChecker } from "./CChecker.js";
import { CUtilWeb } from "./CUtilWeb.js";
import { CFecth } from "../network/CFecth.js";
import { CAuthInfo } from "../network/CAuthInfo.js";
export class CModalBackGround extends CModal {
    constructor(_id = null, _zIndex = 2000) {
        super(_id);
        this.SetZIndex(CModal.eSort.Manual, _zIndex);
        this.SetBG(Bootstrap.eColor.transparent);
        this.SetTitle(CModal.eTitle.None);
        this.Open();
        this.FullSwitch();
        this.mDebugMode = true;
    }
}
export class CLoadingBack extends CModalBackGround {
    mProgressBar;
    mRemainingText;
    mRemainingFun;
    mUpdateInterval;
    constructor(_id, _remainingFun, _context = null) {
        super(_id, 5000);
        this.mRemainingFun = _remainingFun;
        this.SetBG(Bootstrap.eColor.dark);
        this.SetSize(window.innerWidth, window.innerHeight);
        this.SetPosition(0, 0);
        if (this.mCard && this.mCard.style.position != "fixed") {
            this.mCard.style.position = "fixed";
            this.mCard.style.top = "0";
            this.mCard.style.left = "0";
            this.mCard.style.width = "100vw";
            this.mCard.style.height = "100vh";
            this.mCard.style.maxWidth = "none";
            this.mCard.style.maxHeight = "none";
            this.mCard.style.margin = "0";
            this.mCard.style.borderRadius = "0";
            this.mCard.style.zIndex = "9999";
            this.mCard.style.pointerEvents = "auto";
            this.mCard.style.backgroundColor = "#212529";
            this.SetBody(`
                <div class="d-flex flex-column align-items-center justify-content-center" 
                        style="width: 100%; height: 100%;">
                    <div class="mb-4" id='${_id}_div'>
                        
                    </div>
                    <div class="w-50 mb-3">
                        <div class="progress" style="height: 30px;">
                            <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                                    role="progressbar" 
                                    style="width: 0%" 
                                    id="${this.Key()}_progress">
                            </div>
                        </div>
                    </div>
                    <div class="text-white h4" id="${this.Key()}_remaining">Remaining Load: ?개</div>
                </div>
            `);
        }
        else {
            this.mCard.innerHTML = `
            <div class="d-flex flex-column align-items-center justify-content-center" 
                style="width: 100%; height: 100%;">
                <div class="mb-4" id='${_id}_div'>
                
                </div>
                <div class="w-50 mb-3">
                    <div class="progress" style="height: 30px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                            role="progressbar" 
                            style="width: 0%" 
                            id="${this.Key()}_progress">
                        </div>
                    </div>
                </div>
                <div class="text-white h4" id="${this.Key()}_remaining">Remaining Load: ?개</div>
            </div>
        `;
        }
        if (_context == null)
            CDOM.ID(_id + "_div").append(CDOM.DataToDom(`<h2 class="text-white fw-bold">Loading...</h2>`));
        else
            CDOM.ID(_id + "_div").append(_context);
        this.mProgressBar = CDOM.ID(this.Key() + "_progress");
        this.mRemainingText = CDOM.ID(this.Key() + "_remaining");
        this.StartProgressUpdate();
    }
    StartProgressUpdate() {
        this.mUpdateInterval = window.setInterval(() => {
            this.UpdateProgress();
        }, 100);
    }
    UpdateProgress() {
        try {
            let remaining = 0;
            if (typeof this.mRemainingFun === 'function') {
                remaining = this.mRemainingFun();
            }
            else if (this.mRemainingFun instanceof CEvent) {
                const result = this.mRemainingFun.Call();
                if (result !== null && result !== undefined) {
                    remaining = result;
                }
            }
            remaining = Math.max(0, remaining);
            const progressPercent = remaining === 0 ? 100 : Math.max(0, 100 - (remaining * 10));
            const clampedProgress = Math.max(0, Math.min(100, progressPercent));
            this.mProgressBar.style.width = clampedProgress + "%";
            this.mRemainingText.textContent = `Remaining Load: ${remaining}`;
            if (remaining <= 0) {
                this.StopProgressUpdate();
                setTimeout(() => {
                    this.Close();
                }, 500);
            }
        }
        catch (error) {
            console.warn("로딩 진행률 업데이트 중 오류:", error);
        }
    }
    StopProgressUpdate() {
        if (this.mUpdateInterval) {
            clearInterval(this.mUpdateInterval);
            this.mUpdateInterval = 0;
        }
    }
    SetRemaining(remaining) {
        const clampedRemaining = Math.max(0, remaining);
        const progressPercent = clampedRemaining === 0 ? 100 : Math.max(0, 100 - (clampedRemaining * 10));
        const clampedProgress = Math.max(0, Math.min(100, progressPercent));
        this.mProgressBar.style.width = clampedProgress + "%";
        this.mRemainingText.textContent = `Remaining Load: ${clampedRemaining}`;
        if (clampedRemaining <= 0) {
            setTimeout(() => {
                this.Close();
            }, 500);
        }
    }
    Close() {
        this.StopProgressUpdate();
        super.Close();
    }
}
export class CBGAttachButton extends CModalBackGround {
    mModal;
    mSize;
    constructor(_id, _layer = 100, _size = new CVec2(600, 800)) {
        super(null, _layer);
        this.mKey = _id + "btn";
        this.SetBody(`<div class='d-flex justify-content-end' style='margin-top:5px;margin-right:10px;'>
                <button type='button' class='btn btn-success' style='pointer-events:auto;' id='${this.mKey}_jbox'>Button</button>
            </div>`);
        this.mSize = _size;
        this.mModal = new CModal(_id);
        this.mModal.SetBody("<div id='" + this.Key() + "_div'></div>");
        this.mModal.SetSize(this.mSize.x, this.mSize.y);
        this.mModal.SetHeader("<div id='" + this.Key() + "_jboxTitle'></div>");
        this.mModal.SetOverlay(true);
        this.mModal.SetCloseToHide(true);
        this.mModal.Hide();
        this.mModal.Open();
        CDOM.ID(this.Key() + "_jbox").onclick = () => {
            this.mModal.Show();
        };
    }
    SetContent(_data) {
        CDOM.ID(this.Key() + "_div").innerHTML = "";
        CDOM.ID(this.Key() + "_div").append(CDOM.DataToDom(_data));
    }
    SetTitleText(_name) {
        CDOM.ID(this.Key() + "_jboxTitle").innerText = _name;
        CDOM.ID(this.Key() + "_jbox").innerText = _name;
    }
}
export class CBGFadeEffect extends CModalBackGround {
    constructor(_id) {
        super();
        this.SetBody(`<div style="display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                width: 100vw;
                height: 100vh;
                opacity: 100;">
                <div style="font-size: 3rem;
                font-weight: bold;
                color: white;
                text-shadow: 
                    -2px -2px 0 black,  
                    2px -2px 0 black,  
                    -2px 2px 0 black,  
                    2px 2px 0 black,
                    0px 0px 4px black;
                transform: translateZ(0);" id="${_id}_div"></div>
            </div>`);
        this.Hide(0);
        this.mKey = _id;
        const style = document.createElement("style");
        style.innerHTML = `
            @keyframes fadeEffect_${_id} {
                0% { opacity: 0; }
                33.33% { opacity: 1; }
                66.66% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    AniStart(_text) {
        this.Show();
        let stage = CDOM.ID(this.mKey + "_div");
        stage.innerText = _text;
        stage.style.animation = "none";
        void stage.offsetWidth;
        stage.style.animation = `fadeEffect_${this.mKey} 3s ease-in-out forwards`;
    }
}
export class CModalEvent extends CModalBackGround {
    mEvent = "";
    mState = "";
    mLast = "";
    mChangeEvent = new CEvent();
    constructor(_id, _event = CEvent.eType.Click) {
        super(_id);
        this.SetPause(false);
        this.SetCloseToHide(true);
        this.mEvent = _event;
        this.mCard.addEventListener(_event, () => {
            this.mState = this.mEvent;
            this.mChangeEvent.Call();
        });
    }
    Update(_update) {
        if (this.mLast != "")
            this.mLast = "";
        if (this.mState != "") {
            this.mLast = this.mState;
            this.mState = "";
        }
    }
    GetState() {
        return this.mLast;
    }
    SetChangeEvent(_event) {
        this.mChangeEvent = CEvent.ToCEvent(_event);
    }
}
export class CModalFrameView extends CModalBackGround {
    mDeltaFrameTime = 0;
    mDeltaFrame = 0;
    mFixedFrameTime = 0;
    mFixedFrame = 0;
    mDeltaFrameSpan;
    mDeltaGraphDiv;
    mFixedFrameSpan;
    mFixedGraphDiv;
    mDeltaFrameLog = [];
    mFixedFrameLog = [];
    mMaxLog = 60;
    constructor() {
        super("CModalFrameView");
        this.SetBody(`
            <div class="row" style="width:115px;height:115px;margin:0px;text-align:center;cursor:move;overflow:hidden;background:rgba(0.07,0.09,0.21,0.8);box-sizing:border-box;position:fixed;left:0;top:0;opacity:0.9;z-index:10000;border:1px solid #aaa;">
                <span id="DeltaFrameSpan" style="color:green; font-size:12px;"></span>
                <span id="FixedFrameSpan" style="color:red; font-size:12px;"></span>
                <div id="DeltaFrameGraph" style="width:80px;height:35px;margin-top:5px;background-color:#000000;"></div>
                <div id="FixedFrameGraph" style="width:80px;height:35px;margin-top:5px;background-color:#000000;"></div>
            </div>
        `);
        this.SetPause(false);
        this.mDeltaFrameSpan = CDOM.ID("DeltaFrameSpan");
        this.mFixedFrameSpan = CDOM.ID("FixedFrameSpan");
        this.mDeltaGraphDiv = CDOM.ID("DeltaFrameGraph");
        this.mFixedGraphDiv = CDOM.ID("FixedFrameGraph");
        this.mDeltaFrameSpan.innerText = "Delta_FPS";
        this.mFixedFrameSpan.innerText = "Fixed_FPS";
        this.mDeltaGraphDiv.innerHTML = "";
        this.mFixedGraphDiv.innerHTML = "";
        for (let i = 0; i < this.mMaxLog; i++) {
            let bar = document.createElement("div");
            bar.style.width = "1px";
            bar.style.right = (this.mMaxLog - i) + "px";
            bar.style.backgroundColor = "#00ff00";
            bar.style.bottom = "0px";
            bar.style.height = "0px";
            bar.style.position = "absolute";
            bar.style.opacity = "50%";
            this.mDeltaGraphDiv.appendChild(bar);
            let bar2 = document.createElement("div");
            bar2.style.width = "1px";
            bar2.style.right = (this.mMaxLog - i) + "px";
            bar2.style.backgroundColor = "#ff0000";
            bar2.style.bottom = "0px";
            bar2.style.height = "0px";
            bar2.style.position = "absolute";
            bar2.style.opacity = "50%";
            this.mFixedGraphDiv.appendChild(bar2);
        }
    }
    Update(_update) {
        this.mDeltaFrameTime += _update.DeltaTime();
        this.mDeltaFrame++;
        if (this.mDeltaFrameTime > 1) {
            this.AddDeltaLog(this.mDeltaFrame);
            this.UpdateDeltaFrameDiv();
            this.mDeltaFrameTime -= 1;
            this.mDeltaFrame = 0;
        }
        this.mFixedFrameTime += _update.FixedTime();
        this.mFixedFrame++;
        if (this.mFixedFrameTime > 1) {
            this.AddFixedLog(this.mFixedFrame);
            this.UpdateFixedFrameDiv();
            this.mFixedFrameTime -= 1;
            this.mFixedFrame = 0;
        }
    }
    AddDeltaLog(_frame) {
        this.mDeltaFrameLog.push(_frame);
        if (this.mDeltaFrameLog.length > this.mMaxLog) {
            this.mDeltaFrameLog.splice(0, 1);
        }
    }
    AddFixedLog(_frame) {
        this.mFixedFrameLog.push(_frame);
        if (this.mFixedFrameLog.length > this.mMaxLog) {
            this.mFixedFrameLog.splice(0, 1);
        }
    }
    UpdateDeltaFrameDiv() {
        let min = Math.min(...this.mDeltaFrameLog);
        let max = Math.max(...this.mDeltaFrameLog);
        this.mDeltaFrameSpan.innerText = "Delta FPS : " + this.mDeltaFrame + "\n(" + min + "-" + max + ")";
        for (let i = 0; i < this.mDeltaFrameLog.length; i++) {
            let bar = this.mDeltaGraphDiv.children.item(this.mMaxLog - this.mDeltaFrameLog.length + i);
            bar.style.height = (max == 0 ? 0 : Math.floor(35 * (this.mDeltaFrameLog[i] / max))) + "px";
        }
    }
    UpdateFixedFrameDiv() {
        let min = Math.min(...this.mFixedFrameLog);
        let max = Math.max(...this.mFixedFrameLog);
        this.mFixedFrameSpan.innerText = "Fixed FPS : " + this.mFixedFrame + "\n(" + min + "-" + max + ")";
        for (let i = 0; i < this.mFixedFrameLog.length; i++) {
            let bar = this.mFixedGraphDiv.children.item(this.mMaxLog - this.mFixedFrameLog.length + i);
            bar.style.height = (max == 0 ? 0 : Math.floor(35 * (this.mFixedFrameLog[i] / max))) + "px";
        }
    }
}
export class CModalChat extends CModal {
    mChatList = new Array();
    mTranslucent;
    constructor(_key, _translucent = true) {
        super(_key);
        this.mTranslucent = _translucent;
        if (_translucent == false) {
            this.SetBody(`
                <div class="d-flex flex-column border rounded h-100">
                    <!-- 채팅 메시지 영역 -->
                    <div id="chatMessages${this.mKey}" class="flex-grow-1 overflow-auto p-2 bg-light" style='user-select:text;'>
                    </div>
        
                    <!-- 입력창 영역 -->
                    <div class="d-flex border-top gap-2 align-items-center">
                        <input type="text" class="form-control" id="chatInput${this.mKey}" placeholder="메시지를 입력하세요...">
                        <button class="btn btn-primary  text-nowrap flex-shrink-0" id="sendBtn${this.mKey}">전송</button>
                    </div>
                </div>
                    
                `);
        }
        else {
            this.SetTitle(CModal.eTitle.None);
            this.SetBG(Bootstrap.eColor.transparent);
            this.SetBody(`
                <div class="d-flex flex-column h-100">
                    <!-- 채팅 메시지 영역 -->
                    <div id="chatMessages${this.mKey}" class="flex-grow-1 rounded overflow-auto p-3 bg-light bg-opacity-25" style='pointer-events:auto;'>
                    </div>

                    <!-- 입력창 영역 -->
                    <div class="d-flex p-2 gap-2 align-items-center">
                        <input type="text" class="form-control form-control-sm" id="chatInput${this.mKey}" placeholder="메시지를 입력하세요..." 
                        style='pointer-events:auto;background-color: rgba(255,255,255,0.2);color: white; '>
                        <button class="btn btn-outline-primary btn-sm text-nowrap flex-shrink-0" id="sendBtn${this.mKey}" 
                        style='pointer-events:auto;'>전송</button>
                    </div>
                </div>
                    
                `);
        }
        this.SetSize(320, 320);
    }
    Open(_startPos) {
        super.Open(_startPos);
        const sendBtn = document.getElementById("sendBtn" + this.mKey);
        const chatInput = document.getElementById("chatInput" + this.mKey);
        const chatMessages = document.getElementById("chatMessages" + this.mKey);
        if (sendBtn && chatInput) {
            sendBtn.addEventListener("click", () => {
                const text = chatInput.value.trim();
                if (text) {
                    if (this.GetEvent(CEvent.eType.Chat) == null)
                        this.ChatAdd(text);
                    else
                        this.GetEvent(CEvent.eType.Chat).Call([text, this]);
                    chatInput.value = "";
                    chatInput.focus();
                }
            });
            chatInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendBtn.click();
                }
            });
        }
        if (this.mTranslucent && chatMessages) {
            let collapsed = false;
            let originalHeight = 0;
            chatMessages.addEventListener("click", () => {
                if (collapsed == false) {
                    collapsed = true;
                    originalHeight = this.mOH;
                    this.SetSize(this.mOW, originalHeight * 0.5);
                }
                else {
                    this.SetSize(this.mOW, originalHeight);
                    collapsed = false;
                }
            });
        }
    }
    ChatAdd(_text, _color = "#ff6600") {
        const chatMessages = document.getElementById("chatMessages" + this.mKey);
        if (!chatMessages)
            return;
        const messageDiv = document.createElement("div");
        if (this.mTranslucent) {
            messageDiv.style.color = _color;
        }
        else if (_color != "#ff6600")
            messageDiv.style.color = _color;
        messageDiv.innerHTML = _text;
        chatMessages.appendChild(messageDiv);
        this.mChatList.push(_text);
        const maxCount = 50;
        if (this.mChatList.length > maxCount) {
            this.mChatList.shift();
            if (chatMessages.firstChild) {
                chatMessages.removeChild(chatMessages.firstChild);
            }
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}
export class CFileViewer extends CModal {
    mEditer = null;
    mExeEvent;
    mFile;
    mGitHub = false;
    constructor(_file, _exeEvent = null, _github = false) {
        super();
        this.mGitHub = _github;
        this.mFile = _file;
        this.mExeEvent = CEvent.ToCEvent(_exeEvent);
        let id = this.Key();
        this.SetTitle(CModal.eTitle.TextFullClose);
        this.SetResize(true);
        const options = _file.map(item => `<option value="${item}">${item}</option>`).join("");
        this.SetHeader(`
        <div class="d-flex flex-column h-100">
            <div class="row mb-2 align-items-center">
                <div class="col">
                    <select id="${id}_select" class="form-select form-select-sm">${options}</select>
                </div>
                <div class="col-auto">
                    <button id="${id}_load" class="btn btn-sm btn-primary">Load</button>
                </div>
                <div class="col-auto">
                    <button id="${id}_exe" class="btn btn-sm btn-success">Execute</button>
                </div>
            </div>
        </div>
        `);
        this.SetBody(`
            <div id='${id}_body' class='h-100 d-flex align-items-center justify-content-center' style='min-height:640px;'>
                <div id='${id}_loading' class='text-center'>
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="h5 text-muted">Loading Editor...</div>
                </div>
            </div>
        `);
    }
    Open(_startPos) {
        super.Open(_startPos);
        let id = this.Key();
        if (this.mExeEvent.IsCall() == false)
            CDOM.ID(id + "_exe").hidden = true;
        let event = (editer) => {
            this.mEditer = editer;
        };
        let LoadFile = (_file) => {
            CFile.Load(_file, false, true).then((_buf) => {
                let source = CUtil.ArrayToString(_buf);
                let info = CString.ExtCut(_file);
                const language = CUtilWeb.sMonacoExtToLang[info.ext] ?? "plaintext";
                if (language === "typescript") {
                    CUtilWeb.MonacoEditer(CDOM.ID(id + "_body"), source, "typescript", "vs-dark", async (monacoEditer) => {
                        this.mEditer = monacoEditer;
                        if (monacoEditer != null) {
                            const model = monacoEditer.getModel();
                            const lastLine = model.getLineCount();
                            monacoEditer.revealLineInCenter(lastLine);
                        }
                    }, this.mGitHub, _file);
                }
                else
                    CUtilWeb.MonacoEditer(CDOM.ID(id + "_body"), source, language, "vs-dark", event);
            });
        };
        LoadFile(this.mFile[0]);
        const loadBtn = CDOM.ID(`${id}_load`);
        const exeBtn = CDOM.ID(`${id}_exe`);
        loadBtn?.addEventListener("click", async () => {
            LoadFile(CDOM.IDValue(`${id}_select`));
        });
        exeBtn?.addEventListener("click", () => {
            let newBufStr = this.mEditer.getModel().getValue();
            this.mExeEvent.Call(CDOM.IDValue(`${id}_select`), newBufStr);
        });
    }
    GetEditer() { return this.mEditer; }
}
export class CModalFlex extends CModal {
    m_flex = new Array();
    m_horizontal = true;
    m_dividerSyncFns = new Array();
    constructor(_percent, _key = null) {
        super(_key);
        this.m_flex = _percent;
    }
    FindFlex(_off) {
        return this.m_flex[_off];
    }
    Open(_startPos = CModal.ePos.Random) {
        super.Open(_startPos);
        this.mBody.classList = "card-body p-0 d-flex overflow-auto";
        this.mBody.classList.add(this.m_horizontal ? "flex-row" : "flex-column");
        this.mBody.style.width = "100%";
        this.mBody.style.height = "100%";
        this.mBody.style.position = "relative";
        this.mBody.innerHTML = "";
        let dividerList = new Array();
        for (let i = 0; i < this.m_flex.length; i++) {
            let div = document.createElement("div");
            div.className = "border position-relative";
            div.style.flex = "1";
            div.style.minWidth = "50px";
            div.style.minHeight = "50px";
            let newSize = 0;
            if (this.m_horizontal)
                newSize = this.mBody.clientWidth * this.m_flex[i];
            else
                newSize = this.mBody.clientHeight * this.m_flex[i];
            if (i != 0)
                newSize -= 4;
            if (i === this.m_flex.length - 1)
                div.style.flex = "1 1 auto";
            else
                div.style.flex = `0 0 ${newSize}px`;
            this.mBody.appendChild(div);
            this.m_flex[i] = div;
            if (i < this.m_flex.length - 1) {
                let divider = document.createElement("div");
                divider.style.cursor = this.m_horizontal ? "ew-resize" : "ns-resize";
                divider.style.pointerEvents = "auto";
                divider.style.position = "absolute";
                divider.style.zIndex = "10";
                divider.style.userSelect = "none";
                divider.style.backgroundColor = "rgba(108,117,125,0.35)";
                if (this.m_horizontal) {
                    divider.style.top = "0";
                    divider.style.width = "6px";
                    divider.style.height = "100%";
                }
                else {
                    divider.style.left = "0";
                    divider.style.width = "100%";
                    divider.style.height = "6px";
                }
                this.mBody.appendChild(divider);
                dividerList.push(divider);
            }
        }
        this.m_dividerSyncFns = [];
        for (let i = 0; i < this.m_flex.length - 1; i++) {
            this.m_dividerSyncFns.push(this.AttachResizeHandler(this.m_flex[i], this.m_flex[i + 1], dividerList[i]));
        }
        this.On(CEvent.eType.Resize, () => this.RelayoutFlex());
    }
    RelayoutFlex() {
        for (const sync of this.m_dividerSyncFns)
            sync();
    }
    AttachResizeHandler(divA, divB, divider) {
        let isDragging = false;
        let startPos = 0;
        let startSizeA = 0;
        let startSizeB = 0;
        const syncDivider = () => {
            if (this.m_horizontal) {
                divider.style.left = (divA.offsetLeft + divA.offsetWidth - 3) + "px";
                divider.style.top = "0";
                divider.style.height = "100%";
            }
            else {
                divider.style.left = "0";
                divider.style.top = (divA.offsetTop + divA.offsetHeight - 3) + "px";
                divider.style.width = "100%";
            }
        };
        syncDivider();
        setTimeout(syncDivider, 0);
        divider.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            startPos = this.m_horizontal ? e.clientX : e.clientY;
            startSizeA = this.m_horizontal ? divA.offsetWidth : divA.offsetHeight;
            startSizeB = this.m_horizontal ? divB.offsetWidth : divB.offsetHeight;
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });
        const onMouseMove = (e) => {
            if (!isDragging)
                return;
            let delta = (this.m_horizontal ? e.clientX : e.clientY) - startPos;
            let newSizeA = startSizeA + delta;
            let newSizeB = startSizeB - delta;
            if (newSizeA < 50 || newSizeB < 50)
                return;
            if (this.m_horizontal) {
                divA.style.flex = `0 0 ${newSizeA}px`;
                divB.style.flex = `0 0 ${newSizeB}px`;
                syncDivider();
            }
            else {
                divA.style.flex = `0 0 ${newSizeA}px`;
                divB.style.flex = `0 0 ${newSizeB}px`;
                syncDivider();
            }
        };
        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
        return syncDivider;
    }
    FullSwitch(_enable = null) {
        let size = new Array();
        for (let i = 0; i < this.m_flex.length; i++) {
            if (this.m_horizontal) {
                size.push(this.m_flex[i].clientWidth / this.mBody.clientWidth);
            }
            else
                size.push(this.m_flex[i].clientHeight / this.mBody.clientHeight);
        }
        super.FullSwitch(_enable);
        let allSize = 0;
        if (this.m_horizontal) {
            allSize = this.mBody.clientWidth;
            for (let i = 0; i < this.m_flex.length; i++) {
                let newSize = this.mBody.clientWidth * size[i];
                allSize -= newSize;
                if (i == this.m_flex.length - 1)
                    newSize += allSize - 4 * (this.m_flex.length - 1);
                if (i === this.m_flex.length - 1) {
                    this.m_flex[i].style.flex = "1 1 auto";
                    this.m_flex[i].style.marginRight = "2px";
                }
                else {
                    this.m_flex[i].style.flex = `0 0 ${newSize}px`;
                }
            }
        }
        else {
            allSize = this.mBody.clientHeight;
            for (let i = 0; i < this.m_flex.length; i++) {
                let newSize = this.mBody.clientHeight * size[i];
                allSize -= newSize;
                if (i == this.m_flex.length - 1)
                    newSize += allSize - 4 * (this.m_flex.length - 1);
                if (i === this.m_flex.length - 1) {
                    this.m_flex[i].style.flex = "1 1 auto";
                    this.m_flex[i].style.marginBottom = "2px";
                }
                else {
                    this.m_flex[i].style.flex = `0 0 ${newSize}px`;
                }
            }
        }
    }
}
export class CBlackboardModal extends CModal {
    constructor(_blackboard) {
        super();
        this.SetHeader("<div id='bbm_div'>BlackBoard Unit [<font color='red'>X</font>]Ctrl : ProxyMode</div>");
        this.SetTitle(CModal.eTitle.TextClose);
        this.SetZIndex(CModal.eSort.Manual, CModal.eSort.Auto + 10);
        this.SetSize(600, 400);
        const container = document.createElement("div");
        container.className = "d-flex flex-wrap justify-content-start p-2";
        _blackboard.forEach((key, i) => {
            const bb = CBlackBoard.Find(key);
            if (!bb) {
                return;
            }
            const durl = bb.CaptureTextureToDataURL();
            const box = document.createElement("div");
            box.className = "position-relative m-1 border rounded";
            box.style.width = "64px";
            box.style.height = "64px";
            box.style.cursor = "grab";
            box.style.overflow = "hidden";
            box.title = key;
            box.setAttribute("draggable", "true");
            box.addEventListener("dragstart", (event) => {
                if (!event.dataTransfer)
                    return;
                event.dataTransfer.setData("text", key);
                CObject.SetDrag("CObject", bb);
            });
            const img = document.createElement("img");
            img.src = durl;
            img.alt = key;
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";
            img.draggable = false;
            img.style.pointerEvents = "none";
            box.appendChild(img);
            container.appendChild(box);
        });
        this.SetBody(container);
        this.Open();
        window.addEventListener("keydown", (e) => {
            if (e.ctrlKey == true)
                CDOM.ID("bbm_div").innerHTML = "BlackBoard Unit [<font color='green'>O</font>]Ctrl : ProxyMode";
        });
        window.addEventListener("keyup", (e) => {
            if (e.ctrlKey == false)
                CDOM.ID("bbm_div").innerHTML = "BlackBoard Unit [<font color='red'>X</font>]Ctrl : ProxyMode";
        });
    }
}
export class CMonacoViewer extends CModal {
    mEditor = null;
    mGithub = false;
    mFilePath = null;
    constructor(_source, _fileName, _github = false) {
        super();
        this.SetHeader(_fileName);
        this.SetTitle(CModal.eTitle.TextFullClose);
        this.SetZIndex(CModal.eSort.Manual, CModal.eSort.Auto + 1);
        this.SetResize(true);
        this.SetSize(800, 600);
        this.mGithub = _github;
        let id = this.Key() + "_editer";
        this.SetBody(`
            <div id='${id}' class='h-100 d-flex align-items-center justify-content-center' >
                <div id='${id}_loading' class='text-center'>
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="h5 text-muted">Loading Editor...</div>
                </div>
            </div>
        `);
        this.Open();
        let languageType = "plaintext";
        if (_fileName) {
            const extension = _fileName.toLowerCase().split('.').pop() || "";
            languageType = CUtilWeb.sMonacoExtToLang[extension] ?? "plaintext";
        }
        this.mFilePath = CString.PathSub(CPath.FullPath()) + "/" + this.Key() + "_" + _fileName;
        CUtilWeb.MonacoEditer(CDOM.ID(id), _source, languageType, "vs-dark", async (monacoEditer) => {
            this.mEditor = monacoEditer;
        }, this.mGithub, this.mFilePath);
    }
    GetSource() {
        return this.mEditor.getModel().getValue();
    }
    async SetSource(_source) {
        _source = await CUtilWeb.TSImport(_source, true, this.mGithub, this.mFilePath, false);
        return this.mEditor.getModel().setValue(_source);
    }
}
export class CMDViewer extends CModal {
    constructor(_file, _title = CModal.eTitle.TextFullClose) {
        super();
        this.SetTitle(_title);
        this.SetHeader(_file);
        let lan = CUtil.Language();
        (async () => {
            const lan = CUtil.Language();
            let finalPath = _file;
            const base = _file.replace(/\.md$/i, '');
            const candidate = `${base}-${lan}.md`;
            try {
                const probed = await CFile.Load(candidate);
                if (probed)
                    finalPath = candidate;
            }
            catch {
            }
            this.SetBody(await CUtilWeb.MDReader(finalPath));
            this.Open();
        })().catch(err => console.error('CMDViewer init error:', err));
    }
}
export class CModalPDF extends CModal {
    static sLib = null;
    static sLoad = null;
    mFile;
    mPdf = null;
    mPage = 1;
    mPageCount = 0;
    mScale = 0;
    mFit = true;
    mRenderTask = null;
    mClosed = false;
    constructor(_file) {
        super();
        this.mFile = _file;
        this.SetTitle(CModal.eTitle.TextFullClose);
        this.SetResize(true);
        this.SetSize("90%", "85%");
        const name = (_file.split('?')[0].split('/').pop() ?? _file);
        this.SetHeader(name);
        const id = this.Key();
        this.SetBody(`
            <div class="d-flex flex-column h-100" style="min-height:0;">
                <div class="d-flex align-items-center gap-1 p-1 border-bottom flex-shrink-0">
                    <button id="${id}_prev" type="button" class="btn btn-sm btn-outline-secondary" title="Prev"><i class="bi bi-chevron-left"></i></button>
                    <span id="${id}_page" class="small text-nowrap">-</span>
                    <button id="${id}_next" type="button" class="btn btn-sm btn-outline-secondary" title="Next"><i class="bi bi-chevron-right"></i></button>
                    <button id="${id}_zoomout" type="button" class="btn btn-sm btn-outline-secondary">-</button>
                    <button id="${id}_zoomin" type="button" class="btn btn-sm btn-outline-secondary">+</button>
                    <button id="${id}_fit" type="button" class="btn btn-sm btn-outline-secondary">Fit</button>
                    <a id="${id}_dl" class="btn btn-sm btn-primary ms-auto" href="${_file}" download>Download</a>
                </div>
                <div id="${id}_view" class="flex-grow-1 overflow-auto text-center p-2" style="min-height:0;background:#525659;">
                    <div id="${id}_status" class="text-white-50 small py-4">Loading PDF...</div>
                    <canvas id="${id}_cv" style="display:none;max-width:100%;height:auto;"></canvas>
                </div>
            </div>`);
    }
    static PdfBaseUrl() {
        return CPath.WebRootArtgineUrl() + "artgine/external/legacy/pdfjs/";
    }
    static EnsureLib() {
        if (CModalPDF.sLib)
            return Promise.resolve(CModalPDF.sLib);
        if (CModalPDF.sLoad)
            return CModalPDF.sLoad;
        const take = () => {
            const pdfjs = window.pdfjsLib;
            if (!pdfjs?.getDocument)
                return null;
            const base = CModalPDF.PdfBaseUrl();
            if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc)
                pdfjs.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.mjs";
            CModalPDF.sLib = pdfjs;
            return pdfjs;
        };
        const now = take();
        if (now)
            return Promise.resolve(now);
        const start = Date.now();
        CModalPDF.sLoad = CChecker.Exe(async () => {
            if (take())
                return false;
            return Date.now() - start < 3000;
        }, 100).then(() => {
            CModalPDF.sLoad = null;
            if (CModalPDF.sLib)
                return CModalPDF.sLib;
            CAlert.W("pdfjs not import!");
            throw new Error("pdfjs not import");
        });
        return CModalPDF.sLoad;
    }
    Open(_startPos = CModal.ePos.Center) {
        super.Open(_startPos);
        const id = this.Key();
        CDOM.ID(id + "_prev")?.addEventListener("click", () => this.GoPage(this.mPage - 1));
        CDOM.ID(id + "_next")?.addEventListener("click", () => this.GoPage(this.mPage + 1));
        CDOM.ID(id + "_zoomout")?.addEventListener("click", () => this.Zoom(-0.2));
        CDOM.ID(id + "_zoomin")?.addEventListener("click", () => this.Zoom(0.2));
        CDOM.ID(id + "_fit")?.addEventListener("click", () => { this.mFit = true; this.RenderPage(); });
        this.LoadPdf();
    }
    Close(_delayTime = 0) {
        this.mClosed = true;
        try {
            this.mRenderTask?.cancel();
        }
        catch { }
        this.mRenderTask = null;
        try {
            this.mPdf?.destroy();
        }
        catch { }
        this.mPdf = null;
        super.Close(_delayTime);
    }
    SetStatus(_text) {
        const el = CDOM.ID(this.Key() + "_status");
        if (el)
            el.textContent = _text;
    }
    async LoadPdf() {
        const id = this.Key();
        try {
            const pdfjs = await CModalPDF.EnsureLib();
            if (this.mClosed)
                return;
            const buf = await CFile.Load(this.mFile, false, true);
            if (this.mClosed)
                return;
            if (!buf) {
                this.SetStatus("Failed to load PDF.");
                return;
            }
            const base = CModalPDF.PdfBaseUrl();
            const task = pdfjs.getDocument({
                data: new Uint8Array(buf),
                cMapUrl: base + "cmaps/",
                cMapPacked: true,
                standardFontDataUrl: base + "standard_fonts/",
                wasmUrl: base + "wasm/",
            });
            this.mPdf = await task.promise;
            if (this.mClosed) {
                try {
                    this.mPdf.destroy();
                }
                catch { }
                this.mPdf = null;
                return;
            }
            this.mPageCount = this.mPdf.numPages || 1;
            this.mPage = 1;
            this.mFit = true;
            const status = CDOM.ID(id + "_status");
            if (status)
                status.style.display = "none";
            const cv = CDOM.ID(id + "_cv");
            if (cv)
                cv.style.display = "";
            await this.RenderPage();
        }
        catch (e) {
            this.SetStatus("PDF.js error: " + (e instanceof Error ? e.message : String(e)));
        }
    }
    GoPage(_page) {
        if (!this.mPdf)
            return;
        const next = Math.max(1, Math.min(this.mPageCount, _page));
        if (next === this.mPage && this.mScale !== 0)
            return;
        this.mPage = next;
        this.RenderPage();
    }
    Zoom(_delta) {
        this.mFit = false;
        this.mScale = Math.max(0.4, Math.min(3, (this.mScale || 1) + _delta));
        this.RenderPage();
    }
    async RenderPage() {
        if (!this.mPdf || this.mClosed)
            return;
        const id = this.Key();
        const canvas = CDOM.ID(id + "_cv");
        const view = CDOM.ID(id + "_view");
        const pageEl = CDOM.ID(id + "_page");
        if (!canvas || !view)
            return;
        try {
            this.mRenderTask?.cancel();
        }
        catch { }
        this.mRenderTask = null;
        const page = await this.mPdf.getPage(this.mPage);
        if (this.mClosed)
            return;
        const baseVp = page.getViewport({ scale: 1 });
        if (this.mFit) {
            const avail = Math.max(80, view.clientWidth - 16);
            this.mScale = avail / baseVp.width;
        }
        const viewport = page.getViewport({ scale: this.mScale || 1 });
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const task = page.render({ canvas, canvasContext: ctx, viewport });
        this.mRenderTask = task;
        try {
            await task.promise;
        }
        catch (e) {
            if (e?.name === "RenderingCancelledException")
                return;
            throw e;
        }
        if (pageEl)
            pageEl.textContent = `${this.mPage} / ${this.mPageCount}`;
    }
}
export class CSheetViewer extends CModal {
    mFiles;
    mSaveEvent;
    mCurrentFile = '';
    mCurrentData = null;
    constructor(_file, _saveEvent = null) {
        super();
        this.mFiles = _file;
        this.mSaveEvent = CEvent.ToCEvent(_saveEvent);
        this.SetTitle(CModal.eTitle.TextFullClose);
        this.SetResize(true);
        this.SetSize("75%", "65%");
        const id = this.Key();
        const options = _file.map(item => `<option value="${item}">${item}</option>`).join('');
        this.SetHeader(`
            <div class="row align-items-center g-2">
                <div class="col">
                    <select id="${id}_select" class="form-select form-select-sm">${options}</select>
                </div>
                <div class="col-auto">
                    <button id="${id}_load" class="btn btn-sm btn-primary">Load</button>
                </div>
                <div class="col-auto">
                    <button id="${id}_save" class="btn btn-sm btn-success">Save</button>
                </div>
            </div>`);
        this.SetBody(`<div id="${id}_body" class="h-100 overflow-auto"></div>`);
    }
    Open(_startPos = CModal.ePos.Random) {
        super.Open(_startPos);
        const id = this.Key();
        if (this.mSaveEvent.IsCall() === false)
            CDOM.ID(id + '_save').hidden = true;
        const LoadFile = async (_file) => {
            this.mCurrentFile = _file;
            this.mCurrentData = null;
            const body = CDOM.ID(`${id}_body`);
            body.innerHTML = `
                <div class="d-flex justify-content-center align-items-center h-100">
                    <div class="text-center">
                        <div class="spinner-border text-primary mb-2" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <div class="text-muted small">Loading...</div>
                    </div>
                </div>`;
            const buf = await CFile.Load(_file, false, true);
            if (!buf) {
                body.innerHTML = `<div class="alert alert-warning m-3">파일을 불러올 수 없습니다.</div>`;
                return;
            }
            const info = CString.ExtCut(_file);
            if (info.ext !== 'csv' && info.ext !== 'xlsx' && info.ext !== 'xls') {
                body.innerHTML = `<div class="alert alert-secondary m-3">지원하지 않는 파일 형식입니다: .${info.ext}</div>`;
                return;
            }
            let data;
            if (info.ext === 'csv') {
                const str = CUtil.ArrayToString(buf);
                const lines = str.split(/\r?\n/).filter(l => l.trim());
                data = [{ name: 'Sheet1', rows: lines.map(l => this.ParseCSVLine(l)) }];
            }
            else {
                const XLSX = window['XLSX'];
                if (!XLSX) {
                    body.innerHTML = `<div class="alert alert-danger m-3">
                        xlsx 라이브러리가 로드되지 않았습니다.<br>
                        <small>HTML에 xlsx.mini.min.js 스크립트를 추가해주세요.</small>
                    </div>`;
                    return;
                }
                const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
                data = wb.SheetNames.map(name => {
                    const sheet = wb.Sheets[name];
                    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                    return { name, rows };
                });
            }
            this.mCurrentData = data;
            CUtilWeb.SheetEditor(body, data, true, (_action, _payload) => {
                this.ApplySheetAction(_action, _payload);
            });
        };
        LoadFile(this.mFiles[0]);
        CDOM.ID(`${id}_load`)?.addEventListener('click', () => {
            LoadFile(CDOM.IDValue(`${id}_select`));
        });
        CDOM.ID(`${id}_save`)?.addEventListener('click', () => {
            if (!this.mCurrentFile || !this.mCurrentData)
                return;
            const info = CString.ExtCut(this.mCurrentFile);
            if (info.ext === 'csv') {
                const csvStr = this.SerializeCSV(this.mCurrentData[0]?.rows ?? []);
                const base64 = btoa(unescape(encodeURIComponent(csvStr)));
                this.mSaveEvent.Call(this.mCurrentFile, base64);
            }
            else if (info.ext === 'xlsx' || info.ext === 'xls') {
                const XLSX = window['XLSX'];
                if (!XLSX)
                    return;
                const wb = XLSX.utils.book_new();
                this.mCurrentData.forEach(sheet => {
                    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
                    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
                });
                const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
                this.mSaveEvent.Call(this.mCurrentFile, base64);
            }
        });
    }
    ApplySheetAction(_action, _payload) {
        if (!this.mCurrentData)
            return;
        switch (_action) {
            case 'update':
                {
                    const sheet = this.mCurrentData.find(s => s.name === _payload.sheet);
                    if (!sheet)
                        break;
                    const rowIdx = _payload.row + 1;
                    if (!sheet.rows[rowIdx])
                        sheet.rows[rowIdx] = [];
                    sheet.rows[rowIdx][_payload.col] = _payload.value;
                    break;
                }
            case 'insert':
                {
                    const sheet = this.mCurrentData.find(s => s.name === _payload.sheet);
                    if (sheet)
                        sheet.rows.splice(_payload.row + 1, 0, _payload.values);
                    break;
                }
            case 'delete':
                {
                    const sheet = this.mCurrentData.find(s => s.name === _payload.sheet);
                    if (sheet)
                        sheet.rows.splice(_payload.row + 1, 1);
                    break;
                }
            case 'alter':
                {
                    const sheet = this.mCurrentData.find(s => s.name === _payload.sheet);
                    if (!sheet)
                        break;
                    if (!sheet.rows[0])
                        sheet.rows[0] = [];
                    sheet.rows[0][_payload.col] = _payload.name;
                    break;
                }
            case 'insertSheet':
                this.mCurrentData.splice(_payload.index, 0, { name: _payload.name, rows: [['']] });
                break;
            case 'deleteSheet':
                {
                    const idx = this.mCurrentData.findIndex(s => s.name === _payload.name);
                    if (idx >= 0)
                        this.mCurrentData.splice(idx, 1);
                    break;
                }
        }
    }
    ParseCSVLine(line) {
        const result = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuote && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                }
                else
                    inQuote = !inQuote;
            }
            else if (ch === ',' && !inQuote) {
                result.push(cur);
                cur = '';
            }
            else
                cur += ch;
        }
        result.push(cur);
        return result;
    }
    SerializeCSV(rows) {
        return rows.map(row => row.map(cell => {
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
                return '"' + cell.replace(/"/g, '""') + '"';
            return cell;
        }).join(',')).join('\r\n');
    }
}
export class CModalStackMsg extends CModal {
    static sGAP = 8;
    static sEDGE = 8;
    mStackCorner;
    constructor(_corner = CModal.ePos.BottomRight, _key = null) {
        super(_key);
        this.mStackCorner = _corner;
        this.SetTitle(CModal.eTitle.None);
        this.SetResize(false);
        this.SetLimitPush(false);
        this.mBodyStyle = "card-body p-0 overflow-hidden";
    }
    static GetStack(_corner) {
        return CModal.GetModalList().filter(m => m instanceof CModalStackMsg &&
            m.mStackCorner === _corner &&
            m.mCard != null &&
            m.IsShow());
    }
    static RefreshStack(_corner) {
        const list = CModalStackMsg.GetStack(_corner);
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isBottom = _corner === CModal.ePos.BottomLeft || _corner === CModal.ePos.BottomRight;
        const isRight = _corner === CModal.ePos.TopRight || _corner === CModal.ePos.BottomRight;
        let offset = CModalStackMsg.sEDGE;
        for (const modal of list) {
            const cardH = modal.mCard.offsetHeight || modal.mOH || 60;
            const cardW = modal.mCard.offsetWidth || modal.mOW || 300;
            const top = isBottom ? h - offset - cardH : offset;
            const left = isRight ? w - CModalStackMsg.sEDGE - cardW : CModalStackMsg.sEDGE;
            modal.mCard.style.transition = "top 0.3s ease, left 0.3s ease";
            modal.mCard.style.top = top + "px";
            modal.mCard.style.left = left + "px";
            modal.mOT = top;
            modal.mOL = left;
            offset += cardH + CModalStackMsg.sGAP;
        }
    }
    Open(_startPos) {
        super.Open(_startPos ?? this.mStackCorner);
        setTimeout(() => CModalStackMsg.RefreshStack(this.mStackCorner), 0);
    }
    Close(_delayTime = 0) {
        const corner = this.mStackCorner;
        super.Close(_delayTime);
        const delay = _delayTime > 0 ? _delayTime * 1000 + 50 : 0;
        setTimeout(() => CModalStackMsg.RefreshStack(corner), delay);
    }
    Hide(_animationTime = 300) {
        const corner = this.mStackCorner;
        super.Hide(_animationTime);
        setTimeout(() => CModalStackMsg.RefreshStack(corner), _animationTime + 50);
    }
    Show() {
        super.Show();
        setTimeout(() => CModalStackMsg.RefreshStack(this.mStackCorner), 16);
    }
}
export class CModalTerminal extends CModal {
    static msCount = 0;
    constructor() {
        super(null);
        CModalTerminal.msCount++;
        this.SetCloseToHide(false);
        this.SetResize(true);
        this.SetTitle(CModal.eTitle.TextMinFullClose);
        this.SetHeader("Terminal #" + CModalTerminal.msCount);
        const token = CStorage.Get("cmd_token");
        const src = token ? `/cmd?preauth=${token}` : '/cmd';
        this.SetBody(`<div style="position:relative;width:100%;height:100%;">` +
            `<iframe src="${src}" style="width:100%;height:100%;border:none;display:block;"></iframe>` +
            `<div class="modal-iframe-guard" style="position:absolute;top:0;left:0;width:100%;height:100%;display:none;z-index:1;"></div>` +
            `</div>`);
        this.SetSize("80%", "80%");
        this.Open(CModal.ePos.Center);
        const guard = this.mBody.querySelector('.modal-iframe-guard');
        if (guard) {
            document.addEventListener('mousedown', () => { guard.style.display = 'block'; });
            document.addEventListener('mouseup', () => { guard.style.display = 'none'; });
        }
    }
}
export class CModalMusic extends CModal {
    static sDefaultMediaImage = '512x512.png';
    mPaths;
    mSaveFn;
    mMediaImage;
    mAiEnabled;
    mAiSearchFn;
    mLyricsEnFn;
    mLastPlay = 0;
    mRandomPool = [];
    mAudio;
    mNowPlayingEl;
    mListEl;
    mRandomChk;
    mAiPanel;
    mAiInput;
    mAiGoBtn;
    mAiReasonEl;
    mLyricsBtn;
    mLyricsEl;
    mLyricsUrl = '';
    constructor(paths = [], saveFn, mediaImage, aiEnabled = false, aiSearchFn, lyricsEnFn) {
        super(null);
        this.mPaths = [...paths];
        this.mSaveFn = saveFn ?? ((p) => CStorage.Set("SoundList", JSON.stringify({ fullPath: p })));
        this.mMediaImage = mediaImage ?? CModalMusic.sDefaultMediaImage;
        this.mAiEnabled = aiEnabled;
        this.mAiSearchFn = aiSearchFn;
        this.mLyricsEnFn = lyricsEnFn;
        this.SetTitle(CModal.eTitle.TextClose);
        this.SetHeader('Music');
        this.SetCloseToHide(true);
        this.SetSize(400, 600);
        this.SetBody(`<div class="mm-wrap" style="display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;padding:4px;box-sizing:border-box;">
            <div class="mm-top" style="flex:0 0 auto;">
                <button type="button" class="btn btn-danger btn-sm" style="margin:4px;">Delete All</button>
                <button type="button" class="btn btn-warning btn-sm mm-save-list" style="margin:4px;">Save List</button>
                ${aiEnabled ? `<button type="button" class="btn btn-info btn-sm mm-ai-toggle" style="margin:4px;">AI</button>` : ''}
                ${lyricsEnFn ? `<button type="button" class="btn btn-success btn-sm mm-lyrics-en" style="margin:4px;">Lyrics</button>` : ''}
                <div class="mm-ai" style="display:none;padding:6px;border:1px solid #6c757d;border-radius:4px;margin:4px;">
                    <div class="d-flex gap-1">
                        <input type="text" class="form-control form-control-sm mm-ai-input" placeholder="찾을 음악 설명 입력 후 Enter">
                        <button type="button" class="btn btn-primary btn-sm mm-ai-go">검색</button>
                    </div>
                </div>
                <div class="mm-now" style="padding:6px;font-weight:bold;color:#0d6efd;"></div>
                <audio controls playsinline preload="auto" style="width:100%;"></audio>
                <div class="form-check" style="padding-left:2rem;">
                    <label class="form-check-label">
                        <input class="form-check-input" type="checkbox" checked> Random Play
                    </label>
                </div>
                <div class="mm-ai-reason small text-muted fst-italic" style="display:none;padding:2px 6px;"></div>
            </div>
            <div class="mm-lyrics" style="display:none;flex:0 0 140px;height:140px;max-height:140px;min-height:0;overflow-y:auto;overflow-x:hidden;white-space:pre-wrap;word-break:break-word;padding:6px;border:1px solid #6c757d;border-radius:4px;margin:4px 0;font-size:12px;line-height:1.4;"></div>
            <hr style="flex:0 0 auto;margin:4px 0;">
            <div class="mm-list" style="flex:1 1 auto;min-height:0;overflow-y:auto;"></div>
        </div>`);
        this.Open(CModal.ePos.Center);
        this.mBody.style.overflow = 'hidden';
        this.mBody.style.minHeight = '0';
        this.Hide();
        this.mAudio = this.mBody.querySelector('audio');
        this.mNowPlayingEl = this.mBody.querySelector('.mm-now');
        this.mListEl = this.mBody.querySelector('.mm-list');
        this.mRandomChk = this.mBody.querySelector('input[type="checkbox"]');
        this.mBody.querySelector('.btn-danger').addEventListener('click', () => this._ClearAll());
        this.mBody.querySelector('.mm-save-list')?.addEventListener('click', () => this.mSaveFn(this.mPaths));
        if (aiEnabled) {
            this.mAiPanel = this.mBody.querySelector('.mm-ai');
            this.mAiInput = this.mBody.querySelector('.mm-ai-input');
            this.mAiGoBtn = this.mBody.querySelector('.mm-ai-go');
            this.mAiReasonEl = this.mBody.querySelector('.mm-ai-reason');
            this.mBody.querySelector('.mm-ai-toggle').addEventListener('click', () => {
                this.mAiPanel.style.display = this.mAiPanel.style.display === 'none' ? '' : 'none';
            });
            this.mAiInput.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter')
                    return;
                e.preventDefault();
                this._AiSearch();
            });
            this.mAiGoBtn.addEventListener('click', () => this._AiSearch());
        }
        if (lyricsEnFn) {
            this.mLyricsEl = this.mBody.querySelector('.mm-lyrics');
            this.mLyricsBtn = this.mBody.querySelector('.mm-lyrics-en');
            this.mLyricsBtn.addEventListener('click', () => this._LyricsEn());
        }
        this.mAudio.addEventListener('ended', () => this._Next());
        this.mAudio.addEventListener('pause', () => { if ('mediaSession' in navigator)
            navigator.mediaSession.playbackState = 'paused'; });
        this.mAudio.addEventListener('play', () => { if ('mediaSession' in navigator)
            navigator.mediaSession.playbackState = 'playing'; });
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => this.mAudio.play());
            navigator.mediaSession.setActionHandler('pause', () => this.mAudio.pause());
            navigator.mediaSession.setActionHandler('nexttrack', () => this._Next());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.Play(this.mLastPlay > 0 ? this.mLastPlay - 1 : this.mPaths.length - 1));
        }
        this._RefreshList();
    }
    Add(url) {
        const list = Array.isArray(url) ? url : [url];
        let changed = false;
        for (const u of list) {
            if (this.mPaths.includes(u))
                continue;
            this.mPaths.push(u);
            changed = true;
        }
        if (changed)
            this._Persist();
    }
    SetList(paths) {
        this.mRandomPool = [];
        this.mPaths = [...paths];
        this.mLastPlay = 0;
        this.mAudio.pause();
        this.mNowPlayingEl.textContent = '';
        this._Persist();
    }
    Delete(target) {
        const list = Array.isArray(target) ? target : [target];
        const indices = new Set();
        for (const t of list) {
            const i = typeof t === 'number' ? t : this.mPaths.indexOf(t);
            if (i >= 0 && i < this.mPaths.length)
                indices.add(i);
        }
        if (indices.size === 0)
            return;
        for (const i of [...indices].sort((a, b) => b - a)) {
            this.mPaths.splice(i, 1);
            if (i < this.mLastPlay)
                this.mLastPlay--;
            else if (i === this.mLastPlay) {
                this.mAudio.pause();
                this.mLastPlay = 0;
                this.mNowPlayingEl.textContent = '';
            }
        }
        this._Persist();
    }
    GetList() { return [...this.mPaths]; }
    Play(index) {
        if (this.mPaths.length === 0)
            return;
        const items = this.mListEl.querySelectorAll('li');
        items[this.mLastPlay]?.classList.remove('list-group-item-dark');
        this.mLastPlay = index;
        items[index]?.classList.add('list-group-item-dark');
        if ('audioSession' in navigator)
            navigator.audioSession.type = 'playback';
        const path = this.mPaths[index];
        const name = CModalMusic._FileName(path);
        this.mAudio.src = path;
        if (this.mLyricsEl && this.mLyricsEl.style.display !== 'none' && this.mLyricsUrl !== path)
            this._LoadLyrics(path);
        this.mAudio.play()
            .then(() => {
            this.mNowPlayingEl.textContent = '♫ ' + name;
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: name,
                    artwork: [{ src: this.mMediaImage, sizes: '512x512', type: 'image/png' }]
                });
                navigator.mediaSession.playbackState = 'playing';
                if ('setPositionState' in navigator.mediaSession) {
                    try {
                        navigator.mediaSession.setPositionState({ duration: this.mAudio.duration, playbackRate: this.mAudio.playbackRate, position: this.mAudio.currentTime });
                    }
                    catch (e) { }
                }
            }
        })
            .catch(e => console.warn('CModalMusic.Play:', e));
    }
    static _FileName(path) {
        const clean = path.split('?')[0].split('#')[0];
        const base = clean.split('/').pop() || clean;
        try {
            return decodeURIComponent(base);
        }
        catch {
            return base;
        }
    }
    static _Truncate(path, max = 40) {
        let decoded = path;
        try {
            decoded = decodeURIComponent(path);
        }
        catch { }
        if (decoded.length <= max)
            return decoded;
        return '...' + decoded.slice(-(max - 3));
    }
    _Next() {
        if (this.mRandomChk.checked) {
            while (this.mPaths.length > 0) {
                if (this.mRandomPool.length === 0)
                    this.mRandomPool = [...this.mPaths];
                const sel = Math.trunc(Math.random() * this.mRandomPool.length);
                const key = this.mRandomPool.splice(sel, 1)[0];
                const i = this.mPaths.indexOf(key);
                if (i >= 0) {
                    this.Play(i);
                    return;
                }
            }
        }
        else {
            this.Play(this.mLastPlay + 1 >= this.mPaths.length ? 0 : this.mLastPlay + 1);
        }
    }
    _ClearAll() {
        this.mRandomPool = [];
        this.mPaths = [];
        this.mAudio.pause();
        this.mNowPlayingEl.textContent = '';
        this.mLastPlay = 0;
        this._Persist();
    }
    _Persist() {
        this.mSaveFn(this.mPaths);
        this._RefreshList();
    }
    _RefreshList() {
        this.mRandomPool = [];
        let html = '';
        for (let i = 0; i < this.mPaths.length; i++) {
            html += `<ul class="list-group">` +
                `<li class="list-group-item list-group-item-action" data-idx="${i}">` +
                `<i class="bi bi-file-music"></i> <font color="red">${CModalMusic._Truncate(this.mPaths[i])}</font>` +
                `<i class="bi bi-file-earmark-x float-right" data-del="${i}"></i>` +
                `</li></ul>`;
        }
        this.mListEl.innerHTML = html;
        this.mListEl.querySelectorAll('li').forEach((li, i) => {
            li.addEventListener('click', (e) => {
                const del = e.target.closest('[data-del]');
                if (del)
                    this.Delete(parseInt(del.dataset.del));
                else
                    this.Play(i);
            });
        });
        this.mListEl.querySelectorAll('li')[this.mLastPlay]?.classList.add('list-group-item-dark');
    }
    async _AiSearch() {
        const text = this.mAiInput.value.trim();
        if (!text || !this.mAiSearchFn)
            return;
        this.mAiGoBtn.disabled = true;
        this.mAiGoBtn.textContent = '검색 중...';
        try {
            const { urls, reason } = await this.mAiSearchFn([text]);
            if (reason) {
                this.mAiReasonEl.textContent = '💡 ' + reason;
                this.mAiReasonEl.style.display = '';
            }
            if (urls.length === 0) {
                CAlert.Info('검색 결과가 없습니다.');
            }
            else {
                this.Add(urls);
                this.mAiInput.value = '';
                this.mAiPanel.style.display = 'none';
            }
        }
        catch (e) {
            console.warn('CModalMusic._AiSearch:', e);
            CAlert.E('AI 검색 실패: ' + (e instanceof Error ? e.message : String(e)));
        }
        finally {
            this.mAiGoBtn.disabled = false;
            this.mAiGoBtn.textContent = '검색';
        }
    }
    _CurrentUrl() {
        if (this.mPaths.length === 0)
            return '';
        const idx = (this.mLastPlay >= 0 && this.mLastPlay < this.mPaths.length) ? this.mLastPlay : 0;
        return this.mPaths[idx];
    }
    async _LyricsEn() {
        if (!this.mLyricsEnFn)
            return;
        const url = this._CurrentUrl();
        if (!url) {
            CAlert.Info('재생 목록이 비어 있습니다.');
            return;
        }
        if (this.mLyricsEl.style.display !== 'none' && this.mLyricsUrl === url) {
            this.mLyricsEl.style.display = 'none';
            return;
        }
        await this._LoadLyrics(url);
    }
    async _LoadLyrics(url) {
        if (!this.mLyricsEnFn || !url)
            return;
        this.mLyricsEl.style.display = 'block';
        this.mLyricsEl.textContent = '가져오는 중...';
        if (this.mLyricsBtn) {
            this.mLyricsBtn.disabled = true;
            this.mLyricsBtn.textContent = 'Loading...';
        }
        try {
            const { lyrics } = await this.mLyricsEnFn(url);
            this.mLyricsUrl = url;
            this.mLyricsEl.textContent = lyrics || '영어 가사를 찾지 못했습니다.';
        }
        catch (e) {
            console.warn('CModalMusic._LoadLyrics:', e);
            this.mLyricsUrl = url;
            this.mLyricsEl.textContent = '가사 조회 실패: ' + (e instanceof Error ? e.message : String(e));
        }
        finally {
            if (this.mLyricsBtn) {
                this.mLyricsBtn.disabled = false;
                this.mLyricsBtn.textContent = 'Lyrics';
            }
        }
    }
}
export class CORMViewer extends CModal {
    static sPageSize = 100;
    mAuth;
    mDbType;
    mDatabase;
    mServerUrl;
    mToken;
    mCurTable = null;
    mOffset = 0;
    mHasNext = false;
    mSortCol = null;
    mSortAsc = true;
    mCurRows = [];
    constructor(_auth, _dbType, _database, _serverUrl, _token) {
        super();
        this.mAuth = _auth ?? new CAuthInfo();
        this.mDbType = _dbType ?? null;
        this.mDatabase = _database ?? '';
        this.mServerUrl = _serverUrl ?? '';
        this.mToken = _token ?? '';
        this.SetTitle(CModal.eTitle.TextFullClose);
        this.SetResize(true);
        this.SetSize("70%", "70%");
        if (this.mDbType && this.mDatabase) {
            this.SetHeader(`ORM Viewer - ${this.mDatabase}`);
            this.SetBody(this.RenderViewerLayout());
        }
        else {
            this.SetHeader(`ORM Viewer - Connection Info`);
            this.SetBody(this.RenderConnectForm());
        }
    }
    Open(_startPos) {
        super.Open(_startPos);
        if (this.mDbType && this.mDatabase)
            this.WireViewer();
        else
            this.WireConnectForm();
    }
    RenderConnectForm() {
        const id = this.Key();
        return `
            <div class="p-3" style="max-width:420px;">
                <div class="mb-2">
                    <label class="form-label small text-secondary mb-1">DB Type</label>
                    <select id="${id}_conn_dbType" class="form-select form-select-sm">
                        <option value="mysql">mysql</option>
                        <option value="mssql">mssql</option>
                        <option value="sqlite">sqlite</option>
                        <option value="ne">ne</option>
                        <option value="postgresql">postgresql</option>
                        <option value="mongodb">mongodb</option>
                    </select>
                </div>
                <div class="mb-2">
                    <label class="form-label small text-secondary mb-1">Connection location (database / file·folder path)</label>
                    <input id="${id}_conn_database" type="text" class="form-control form-control-sm">
                </div>
                <hr>
                <div class="small text-secondary mb-2">Auth info (mysql/mssql/postgresql/mongodb)</div>
                <div class="mb-2">
                    <label class="form-label small text-secondary mb-1">ID</label>
                    <input id="${id}_conn_id" type="text" class="form-control form-control-sm">
                </div>
                <div class="mb-2">
                    <label class="form-label small text-secondary mb-1">Password</label>
                    <input id="${id}_conn_pw" type="password" class="form-control form-control-sm">
                </div>
                <div class="mb-2">
                    <label class="form-label small text-secondary mb-1">Address</label>
                    <input id="${id}_conn_addres" type="text" class="form-control form-control-sm">
                </div>
                <div class="mb-3">
                    <label class="form-label small text-secondary mb-1">Port</label>
                    <input id="${id}_conn_port" type="text" class="form-control form-control-sm">
                </div>
                <button id="${id}_conn_ok" class="btn btn-primary btn-sm w-100">OK</button>
            </div>
        `;
    }
    WireConnectForm() {
        const id = this.Key();
        CDOM.ID(`${id}_conn_ok`).addEventListener('click', () => {
            const dbType = CDOM.ID(`${id}_conn_dbType`).value;
            const database = CDOM.ID(`${id}_conn_database`).value.trim();
            if (!database) {
                alert('Please enter a connection location.');
                return;
            }
            this.mDbType = dbType;
            this.mDatabase = database;
            this.mAuth.mID = CDOM.ID(`${id}_conn_id`).value;
            this.mAuth.mPW = CDOM.ID(`${id}_conn_pw`).value;
            this.mAuth.mAddres = CDOM.ID(`${id}_conn_addres`).value;
            this.mAuth.mPort = CDOM.ID(`${id}_conn_port`).value;
            this.UpdateHeaderTitle(`ORM Viewer - ${this.mDatabase}`);
            this.SetBody(this.RenderViewerLayout());
            this.WireViewer();
        });
    }
    UpdateHeaderTitle(_title) {
        const header = this.GetHeader();
        if (header != null) {
            const titleWrap = header.firstElementChild;
            if (titleWrap) {
                titleWrap.textContent = _title;
                return;
            }
        }
        this.SetHeader(_title);
    }
    RenderViewerLayout() {
        const id = this.Key();
        return `
            <div class="d-flex flex-column h-100">
                <div id="${id}_tables" class="d-flex border-bottom flex-shrink-0" style="overflow-x:auto;white-space:nowrap;"></div>
                <div class="d-flex align-items-center gap-2 p-2 border-bottom flex-shrink-0">
                    <button id="${id}_prev" class="btn btn-sm btn-outline-secondary">&lt;</button>
                    <span id="${id}_pageInfo" class="small text-secondary"></span>
                    <button id="${id}_next" class="btn btn-sm btn-outline-secondary">&gt;</button>
                </div>
                <div id="${id}_data" class="flex-grow-1 overflow-auto p-2"></div>
            </div>
        `;
    }
    WireViewer() {
        const id = this.Key();
        CDOM.ID(`${id}_prev`).addEventListener('click', () => this.ChangePage(-1));
        CDOM.ID(`${id}_next`).addEventListener('click', () => this.ChangePage(1));
        this.LoadTables();
    }
    async Exec(_func, _params = {}) {
        const url = this.mServerUrl ? this.mServerUrl.replace(/\/+$/, '') + '/ORM/Exec' : 'ORM/Exec';
        const res = await CFecth.Exe(url, {
            auth: this.mAuth,
            dbType: this.mDbType,
            database: this.mDatabase,
            token: this.mToken,
            func: _func,
            ..._params,
        }, 'json');
        if (!res.ok)
            throw new Error(res.msg || 'ORM request failed');
        return res.result;
    }
    async LoadTables() {
        const id = this.Key();
        const listEl = CDOM.ID(`${id}_tables`);
        listEl.innerHTML = `<div class="text-secondary small p-2">Loading...</div>`;
        try {
            const tables = await this.Exec('GetCollection');
            listEl.innerHTML = '';
            for (const table of tables) {
                const item = document.createElement('div');
                item.className = 'px-3 py-2 flex-shrink-0';
                item.style.cursor = 'pointer';
                item.style.borderBottom = '2px solid transparent';
                item.textContent = table;
                item.addEventListener('click', () => {
                    listEl.querySelectorAll('div').forEach(el => {
                        el.classList.remove('bg-primary-subtle');
                        el.style.borderBottom = '2px solid transparent';
                    });
                    item.classList.add('bg-primary-subtle');
                    item.style.borderBottom = '2px solid var(--bs-primary)';
                    this.mCurTable = table;
                    this.mOffset = 0;
                    this.mSortCol = null;
                    this.mSortAsc = true;
                    this.LoadTableData();
                });
                listEl.appendChild(item);
            }
        }
        catch (e) {
            listEl.innerHTML = `<div class="alert alert-danger m-1 p-2 small">${this.EscapeHtmlORM(e.message)}</div>`;
        }
    }
    ChangePage(_dir) {
        if (!this.mCurTable)
            return;
        if (_dir < 0 && this.mOffset === 0)
            return;
        if (_dir > 0 && !this.mHasNext)
            return;
        this.mOffset = Math.max(0, this.mOffset + _dir * CORMViewer.sPageSize);
        this.LoadTableData();
    }
    async LoadTableData() {
        const id = this.Key();
        const dataEl = CDOM.ID(`${id}_data`);
        dataEl.innerHTML = `<div class="text-secondary small p-2">Loading...</div>`;
        try {
            const rows = await this.Exec('Select', {
                collection: this.mCurTable, condition: [], projection: [],
                limit: {
                    mLimitOffset: this.mOffset, mLimit: CORMViewer.sPageSize + 1,
                    mOrderBy: this.mSortCol, mASC: this.mSortAsc,
                },
            });
            this.mHasNext = rows.length > CORMViewer.sPageSize;
            this.mCurRows = rows.slice(0, CORMViewer.sPageSize);
            const cols = this.mCurRows.length > 0 ? Object.keys(this.mCurRows[0]) : await this.Exec('GetProjection', { collection: this.mCurTable });
            dataEl.innerHTML = this.BuildTableORM(this.mCurRows, cols);
            this.AttachRowHandlers(dataEl);
            this.UpdatePageInfo();
        }
        catch (e) {
            dataEl.innerHTML = `<div class="alert alert-danger m-1 p-2 small">${this.EscapeHtmlORM(e.message)}</div>`;
        }
    }
    UpdatePageInfo() {
        const id = this.Key();
        const page = Math.floor(this.mOffset / CORMViewer.sPageSize) + 1;
        CDOM.ID(`${id}_pageInfo`).textContent = `${this.mCurTable} - page ${page}`;
        CDOM.ID(`${id}_prev`).disabled = this.mOffset === 0;
        CDOM.ID(`${id}_next`).disabled = !this.mHasNext;
    }
    BuildTableORM(rows, cols) {
        if (!cols || cols.length === 0)
            return `<div class="p-3 text-muted">No data.</div>`;
        const MIN_COL_WIDTH = 120;
        const ACTION_COL_WIDTH = 80;
        const tableWidth = cols.length * MIN_COL_WIDTH + ACTION_COL_WIDTH;
        const colgroupHtml = `<colgroup>${cols.map(() => `<col style="width:${MIN_COL_WIDTH}px;min-width:${MIN_COL_WIDTH}px">`).join('')}` +
            `<col style="width:${ACTION_COL_WIDTH}px;min-width:${ACTION_COL_WIDTH}px"></colgroup>`;
        const wrapStyle = `overflow-wrap:break-word;word-break:break-word;white-space:normal;min-width:${MIN_COL_WIDTH}px;`;
        const headerHtml = cols.map(c => {
            const arrow = c === this.mSortCol ? (this.mSortAsc ? ' ↑' : ' ↓') : '';
            return `<th class="px-2" data-col="${this.EscapeHtmlORM(c)}" style="${wrapStyle}cursor:pointer;user-select:none;">${this.EscapeHtmlORM(c)}${arrow}</th>`;
        }).join('');
        let html = `<table class="table table-sm table-bordered table-hover table-striped mb-0" style="font-size:0.85em;table-layout:fixed;width:${tableWidth}px;min-width:100%;">
            ${colgroupHtml}
            <thead class="table-dark sticky-top"><tr>${headerHtml}<th class="px-2 text-nowrap" style="min-width:${ACTION_COL_WIDTH}px;"></th></tr></thead>
            <tbody>`;
        rows.forEach((row, i) => {
            html += `<tr>${cols.map(c => `<td class="px-2 orm-cell" data-idx="${i}" data-col="${this.EscapeHtmlORM(c)}" style="${wrapStyle}cursor:pointer;">${this.EscapeHtmlORM(String(row[c] ?? ''))}</td>`).join('')}` +
                `<td class="px-2 text-nowrap" style="min-width:${ACTION_COL_WIDTH}px;"><button class="btn btn-sm btn-outline-danger orm-del-btn" data-idx="${i}">Delete</button></td></tr>`;
        });
        html += `<tr class="orm-add-row">${cols.map(c => `<td class="px-2" style="min-width:${MIN_COL_WIDTH}px;"><input type="text" class="form-control form-control-sm" data-newfield="${this.EscapeHtmlORM(c)}"></td>`).join('')}` +
            `<td class="px-2 text-nowrap" style="min-width:${ACTION_COL_WIDTH}px;"><button class="btn btn-sm btn-outline-success orm-add-btn">Add</button></td></tr>`;
        html += `</tbody></table>`;
        return html;
    }
    AttachRowHandlers(dataEl) {
        dataEl.querySelectorAll('th[data-col]').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.col;
                if (this.mSortCol === col)
                    this.mSortAsc = !this.mSortAsc;
                else {
                    this.mSortCol = col;
                    this.mSortAsc = true;
                }
                this.mOffset = 0;
                this.LoadTableData();
            });
        });
        dataEl.querySelectorAll('.orm-del-btn').forEach(btn => {
            btn.addEventListener('click', () => this.DeleteRow(this.mCurRows[parseInt(btn.dataset.idx)]));
        });
        dataEl.querySelector('.orm-add-btn')?.addEventListener('click', () => this.SubmitAddRow(dataEl));
        dataEl.querySelectorAll('.orm-cell').forEach(td => {
            td.addEventListener('dblclick', () => this.BeginEditCell(td));
        });
    }
    BeginEditCell(_td) {
        if (_td.querySelector('input'))
            return;
        const idx = parseInt(_td.dataset.idx);
        const col = _td.dataset.col;
        const row = this.mCurRows[idx];
        if (!row)
            return;
        const original = row[col];
        const originalStr = typeof original === 'object' && original !== null ? JSON.stringify(original) : String(original ?? '');
        const originalText = _td.textContent;
        _td.innerHTML = '';
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control form-control-sm p-0 px-1 border-0';
        input.value = originalStr;
        _td.appendChild(input);
        input.focus();
        input.select();
        let committed = false;
        const commit = async () => {
            if (committed)
                return;
            committed = true;
            if (input.value === originalStr) {
                _td.textContent = originalText;
                return;
            }
            const { value, error } = this.ConvertInputValue(input.value);
            if (error) {
                alert(`[${col}] ${error}`);
                _td.textContent = originalText;
                return;
            }
            const condition = Object.keys(row).map(k => ({ mKey: k, mCondition: '==', mValue: row[k] }));
            try {
                await this.Exec('Update', { collection: this.mCurTable, condition, data: [{ mKey: col, mValue: value }] });
                this.LoadTableData();
            }
            catch (e) {
                alert('Update failed: ' + e.message);
                _td.textContent = originalText;
            }
        };
        const cancel = () => {
            if (committed)
                return;
            committed = true;
            _td.textContent = originalText;
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter') {
                ke.preventDefault();
                commit();
            }
            else if (ke.key === 'Escape') {
                ke.preventDefault();
                cancel();
                input.blur();
            }
        });
    }
    async SubmitAddRow(dataEl) {
        const inputs = dataEl.querySelectorAll('input[data-newfield]');
        const data = [];
        for (const inp of Array.from(inputs)) {
            const field = inp.dataset.newfield;
            const { value, error } = this.ConvertInputValue(inp.value);
            if (error) {
                alert(`[${field}] ${error}`);
                return;
            }
            data.push({ mKey: field, mValue: value });
        }
        try {
            await this.Exec('Insert', { collection: this.mCurTable, data });
            this.LoadTableData();
        }
        catch (e) {
            alert('Insert failed: ' + e.message);
        }
    }
    DeleteRow(_row) {
        if (!_row)
            return;
        const confirm = new CConfirm();
        confirm.SetBody('Delete this row?');
        confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
            async () => {
                const condition = Object.keys(_row).map(k => ({ mKey: k, mCondition: '==', mValue: _row[k] }));
                try {
                    await this.Exec('Delete', { collection: this.mCurTable, condition });
                    this.LoadTableData();
                }
                catch (e) {
                    alert('Delete failed: ' + e.message);
                }
            },
            () => { },
        ], ['Delete', 'Cancel']);
        confirm.Open();
    }
    ConvertInputValue(_raw) {
        const trimmed = _raw.trim();
        if (trimmed === '')
            return { value: '' };
        if (/^-?\d+$/.test(trimmed)) {
            const n = parseInt(trimmed, 10);
            if (!Number.isSafeInteger(n))
                return { value: null, error: `Integer out of safe range: ${trimmed}` };
            return { value: n };
        }
        if (/^-?\d+\.\d+$/.test(trimmed)) {
            const n = parseFloat(trimmed);
            if (Number.isNaN(n))
                return { value: null, error: `Invalid number format: ${trimmed}` };
            return { value: n };
        }
        if (trimmed === 'true' || trimmed === 'false')
            return { value: trimmed === 'true' };
        const looksLikeJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
        if (looksLikeJson) {
            try {
                return { value: JSON.parse(trimmed) };
            }
            catch (e) {
                return { value: null, error: `Invalid JSON format: ${e.message}` };
            }
        }
        return { value: _raw };
    }
    EscapeHtmlORM(s) {
        return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
}

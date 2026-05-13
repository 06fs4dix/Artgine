import { Bootstrap } from "../basic/Bootstrap.js";
import { CBlackBoard } from "../basic/CBlackBoard.js";
import { CDOM } from "../basic/CDOM.js";
import { CEvent } from "../basic/CEvent.js";
import { CModal } from "../basic/CModal.js";
import { CObject } from "../basic/CObject.js";
import { CString } from "../basic/CString.js";
import { CUtil } from "../basic/CUtil.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CFile } from "../system/CFile.js";
import { CUtilWeb } from "./CUtilWeb.js";
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
    mFrameTime = 0;
    mFrame = 0;
    mFrameSpan;
    mGraphDiv;
    mFrameLog = [];
    mMaxLog = 60;
    constructor() {
        super("CModalFrameView");
        this.SetBody(`
            <div class="row" style="width:80px;height:80px;margin:0px;text-align:center;cursor:move;overflow:hidden;background:rgba(0.07,0.09,0.21,0.8);box-sizing:border-box;position:fixed;left:0;top:0;opacity:0.9;z-index:10000;border:1px solid #aaa;">
                <span id="frameSpan" style="color:white; font-size:12px;"></span>
                <div id="frameGraph" style="width:80px;height:35px;margin-top:5px;background-color:#000000;"></div>        
        `);
        this.SetPause(false);
        this.mFrameSpan = CDOM.ID("frameSpan");
        this.mGraphDiv = CDOM.ID("frameGraph");
        this.mFrameSpan.innerText = "FPS";
        this.mGraphDiv.innerHTML = "";
        for (let i = 0; i < this.mMaxLog; i++) {
            let bar = document.createElement("div");
            bar.style.width = "1px";
            bar.style.right = (this.mMaxLog - i) + "px";
            bar.style.backgroundColor = "#00ff00";
            bar.style.bottom = "0px";
            bar.style.height = "0px";
            bar.style.position = "absolute";
            this.mGraphDiv.appendChild(bar);
        }
    }
    Update(_update) {
        this.mFrameTime += _update.DeltaTime();
        this.mFrame++;
        if (this.mFrameTime > 1) {
            this.AddLog(this.mFrame);
            this.UpdateFrameDiv();
            this.mFrameTime -= 1;
            this.mFrame = 0;
        }
    }
    AddLog(_frame) {
        this.mFrameLog.push(_frame);
        if (this.mFrameLog.length > this.mMaxLog) {
            this.mFrameLog.splice(0, 1);
        }
    }
    UpdateFrameDiv() {
        let min = Math.min(...this.mFrameLog);
        let max = Math.max(...this.mFrameLog);
        this.mFrameSpan.innerText = "FPS : " + this.mFrame + "\n(" + min + "-" + max + ")";
        for (let i = 0; i < this.mFrameLog.length; i++) {
            let bar = this.mGraphDiv.children.item(this.mMaxLog - this.mFrameLog.length + i);
            bar.style.height = (max == 0 ? 0 : Math.floor(35 * (this.mFrameLog[i] / max))) + "px";
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
                if (info.ext == "ts") {
                    CUtilWeb.MonacoEditer(CDOM.ID(id + "_body"), source, "typescript", "vs-dark", async (monacoEditer) => {
                        this.mEditer = monacoEditer;
                        if (monacoEditer != null) {
                            const model = monacoEditer.getModel();
                            const lastLine = model.getLineCount();
                            monacoEditer.revealLineInCenter(lastLine);
                        }
                    }, this.mGitHub);
                }
                else if (info.ext == "js")
                    CUtilWeb.MonacoEditer(CDOM.ID(id + "_body"), source, "javascript", "vs-dark", event);
                else if (info.ext == "json")
                    CUtilWeb.MonacoEditer(CDOM.ID(id + "_body"), source, "json", "vs-dark", event);
                else if (info.ext == "html")
                    CUtilWeb.MonacoEditer(CDOM.ID(id + "_body"), source, "html", "vs-dark", event);
                else
                    CUtilWeb.MonacoEditer(CDOM.ID(id + "_body"), source, "plaintext", "vs-dark", event);
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
                if (this.m_horizontal) {
                    divider.style.right = "-2px";
                    divider.style.top = "0";
                    divider.style.width = "2px";
                    divider.style.height = "100%";
                }
                else {
                    divider.style.bottom = "-2px";
                    divider.style.left = "0";
                    divider.style.width = "100%";
                    divider.style.height = "2px";
                }
                this.mBody.appendChild(divider);
                dividerList.push(divider);
            }
        }
        for (let i = 0; i < this.m_flex.length - 1; i++) {
            this.AttachResizeHandler(this.m_flex[i], this.m_flex[i + 1], dividerList[i]);
        }
    }
    AttachResizeHandler(divA, divB, divider) {
        let isDragging = false;
        let startPos = 0;
        let startSizeA = 0;
        let startSizeB = 0;
        divider.addEventListener("mousedown", (e) => {
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
            }
            else {
                divA.style.flex = `0 0 ${newSizeA}px`;
                divB.style.flex = `0 0 ${newSizeB}px`;
            }
        };
        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
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
            const extension = _fileName.toLowerCase().split('.').pop();
            switch (extension) {
                case 'ts':
                    languageType = 'typescript';
                    break;
                case 'js':
                    languageType = 'javascript';
                    break;
                case 'json':
                    languageType = 'json';
                    break;
                case 'html':
                case 'htm':
                    languageType = 'html';
                    break;
                case 'wgsl':
                    languageType = 'wgsl';
                    break;
                case 'css':
                    languageType = 'css';
                    break;
                case 'xml':
                    languageType = 'xml';
                    break;
                case 'md':
                    languageType = 'markdown';
                    break;
            }
        }
        CUtilWeb.MonacoEditer(CDOM.ID(id), _source, languageType, "vs-dark", async (monacoEditer) => {
            this.mEditor = monacoEditer;
        }, this.mGithub);
    }
    GetSource() {
        return this.mEditor.getModel().getValue();
    }
    async SetSource(_source) {
        _source = await CUtilWeb.TSImport(_source, true, this.mGithub);
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
export class CSheetViewer extends CModal {
    mFiles;
    mSaveEvent;
    mCurrentFile = '';
    mSheetNames = [];
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
            if (info.ext === 'csv')
                this.RenderCSV(body, buf);
            else if (info.ext === 'xlsx' || info.ext === 'xls')
                this.RenderXLSX(body, buf);
            else
                body.innerHTML = `<div class="alert alert-secondary m-3">지원하지 않는 파일 형식입니다: .${info.ext}</div>`;
        };
        LoadFile(this.mFiles[0]);
        CDOM.ID(`${id}_load`)?.addEventListener('click', () => {
            LoadFile(CDOM.IDValue(`${id}_select`));
        });
        CDOM.ID(`${id}_save`)?.addEventListener('click', () => {
            if (!this.mCurrentFile)
                return;
            const body = CDOM.ID(`${id}_body`);
            const info = CString.ExtCut(this.mCurrentFile);
            if (info.ext === 'csv') {
                const table = body.querySelector('table');
                const rows = this.ReadTableDOM(table);
                const csvStr = this.SerializeCSV(rows);
                const base64 = btoa(unescape(encodeURIComponent(csvStr)));
                this.mSaveEvent.Call(this.mCurrentFile, base64);
            }
            else if (info.ext === 'xlsx' || info.ext === 'xls') {
                const XLSX = window['XLSX'];
                if (!XLSX)
                    return;
                const uid = this.Key();
                const wb = XLSX.utils.book_new();
                this.mSheetNames.forEach((name, i) => {
                    const pane = CDOM.ID(`${uid}_pane_${i}`);
                    const table = pane?.querySelector('table');
                    const rows = this.ReadTableDOM(table);
                    const ws = XLSX.utils.aoa_to_sheet(rows);
                    XLSX.utils.book_append_sheet(wb, ws, name);
                });
                const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
                this.mSaveEvent.Call(this.mCurrentFile, base64);
            }
        });
    }
    RenderCSV(container, buf) {
        const str = CUtil.ArrayToString(buf);
        const lines = str.split(/\r?\n/).filter(l => l.trim());
        if (lines.length === 0) {
            container.innerHTML = `<div class="p-3 text-muted">데이터가 없습니다.</div>`;
            return;
        }
        const rows = lines.map(l => this.ParseCSVLine(l));
        container.innerHTML = `<div class="overflow-auto h-100">${this.BuildTable(rows)}</div>`;
        this.AttachEditMode(container);
    }
    RenderXLSX(container, buf) {
        const XLSX = window['XLSX'];
        if (!XLSX) {
            container.innerHTML = `<div class="alert alert-danger m-3">
                xlsx 라이브러리가 로드되지 않았습니다.<br>
                <small>HTML에 xlsx.mini.min.js 스크립트를 추가해주세요.</small>
            </div>`;
            return;
        }
        const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
        const sheetNames = wb.SheetNames;
        if (sheetNames.length === 0) {
            container.innerHTML = `<div class="p-3 text-muted">시트가 없습니다.</div>`;
            return;
        }
        this.mSheetNames = sheetNames;
        const uid = this.Key();
        const tabsHtml = sheetNames.map((name, i) => `<li class="nav-item" role="presentation">
                <button class="nav-link${i === 0 ? ' active' : ''}"
                    id="${uid}_tab_${i}" type="button" role="tab"
                    data-sheet-idx="${i}">
                    ${this.EscapeHtml(name)}
                </button>
            </li>`).join('');
        const pagesHtml = sheetNames.map((name, i) => {
            const sheet = wb.Sheets[name];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            return `<div class="tab-pane${i === 0 ? ' show active' : ''} overflow-auto"
                        style="height:100%"
                        id="${uid}_pane_${i}" role="tabpanel">
                ${this.BuildTable(rows)}
            </div>`;
        }).join('');
        container.innerHTML = `
            <div class="d-flex flex-column h-100">
                <ul class="nav nav-tabs flex-shrink-0 px-1 pt-1 flex-wrap" role="tablist">
                    ${tabsHtml}
                </ul>
                <div class="tab-content flex-grow-1 overflow-hidden position-relative">
                    ${pagesHtml}
                </div>
            </div>`;
        container.querySelectorAll('.nav-link[data-sheet-idx]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.sheetIdx);
                container.querySelectorAll('.nav-link[data-sheet-idx]').forEach(b => b.classList.remove('active'));
                container.querySelectorAll(`[id^="${uid}_pane_"]`).forEach(p => {
                    p.classList.remove('show', 'active');
                });
                btn.classList.add('active');
                const pane = CDOM.ID(`${uid}_pane_${idx}`);
                if (pane)
                    pane.classList.add('show', 'active');
            });
        });
        this.AttachEditMode(container);
    }
    ReadTableDOM(table) {
        const rows = [];
        table?.querySelectorAll('tr').forEach(tr => {
            const row = [];
            tr.querySelectorAll('th, td').forEach(cell => row.push(cell.textContent ?? ''));
            rows.push(row);
        });
        const trimmedRows = rows.map(row => {
            let last = row.length - 1;
            while (last >= 0 && row[last].trim() === '')
                last--;
            return row.slice(0, last + 1);
        });
        let lastRow = trimmedRows.length - 1;
        while (lastRow >= 0 && trimmedRows[lastRow].every(c => c.trim() === ''))
            lastRow--;
        return trimmedRows.slice(0, lastRow + 1);
    }
    SerializeCSV(rows) {
        return rows.map(row => row.map(cell => {
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
                return '"' + cell.replace(/"/g, '""') + '"';
            return cell;
        }).join(',')).join('\r\n');
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
    BuildTable(rows) {
        if (!rows || rows.length === 0)
            return `<div class="p-3 text-muted">데이터가 없습니다.</div>`;
        const EXTRA_COLS = 5;
        const EXTRA_ROWS = 10;
        const colCount = Math.max(...rows.map(r => r.length));
        const totalCols = colCount + EXTRA_COLS;
        const maxLens = new Array(colCount).fill(0);
        for (const row of rows)
            for (let c = 0; c < row.length; c++) {
                const len = String(row[c] ?? '').length;
                if (len > maxLens[c])
                    maxLens[c] = len;
            }
        const widths = [
            ...maxLens.map(l => Math.max(40, l * 8 + 16)),
            ...new Array(EXTRA_COLS).fill(80)
        ];
        const colsHtml = widths.map(w => `<col style="width:${w}px">`).join('');
        const extraTh = new Array(EXTRA_COLS).fill(`<th class="px-2"></th>`).join('');
        const extraTd = new Array(EXTRA_COLS).fill(`<td class="px-2"></td>`).join('');
        let html = `<table class="table table-sm table-bordered table-hover table-striped mb-0"
            style="font-size:0.85em;white-space:nowrap;table-layout:fixed;width:auto">
            <colgroup>${colsHtml}</colgroup>
            <thead class="table-dark sticky-top">
                <tr>${rows[0].map(c => `<th class="px-2">${this.EscapeHtml(String(c ?? ''))}</th>`).join('')}${extraTh}</tr>
            </thead>
            <tbody>`;
        for (let i = 1; i < rows.length; i++)
            html += `<tr>${rows[i].map((c) => `<td class="px-2">${this.EscapeHtml(String(c ?? ''))}</td>`).join('')}${extraTd}</tr>`;
        const emptyRow = `<tr>${new Array(totalCols).fill(`<td class="px-2"></td>`).join('')}</tr>`;
        html += emptyRow.repeat(EXTRA_ROWS);
        html += `</tbody></table>`;
        return html;
    }
    AttachEditMode(container) {
        container.addEventListener('dblclick', (e) => {
            const td = e.target.closest('td, th');
            if (!td)
                return;
            const original = td.textContent ?? '';
            let committed = false;
            td.innerHTML = '';
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control form-control-sm p-0 px-1 border-0';
            input.style.cssText = 'width:100%;min-width:60px;font-size:inherit;';
            input.value = original;
            td.appendChild(input);
            input.focus();
            input.select();
            const commit = () => {
                if (committed)
                    return;
                committed = true;
                td.innerHTML = this.EscapeHtml(input.value);
            };
            const cancel = () => {
                if (committed)
                    return;
                committed = true;
                td.innerHTML = this.EscapeHtml(original);
            };
            input.addEventListener('blur', commit);
            input.addEventListener('keydown', (ke) => {
                if (ke.key === 'Enter') {
                    ke.preventDefault();
                    commit();
                }
                if (ke.key === 'Escape') {
                    ke.preventDefault();
                    cancel();
                    input.blur();
                }
                if (ke.key === 'Tab') {
                    ke.preventDefault();
                    commit();
                    const cells = Array.from(td.closest('table')?.querySelectorAll('td, th') ?? []);
                    const next = cells[cells.indexOf(td) + (ke.shiftKey ? -1 : 1)];
                    if (next)
                        next.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                }
            });
        });
    }
    EscapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

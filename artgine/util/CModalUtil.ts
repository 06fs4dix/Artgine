
import { CSubject } from "../app/subject/CSubject.js";
import { CUpdate } from "../basic/Basic.js";
import { Bootstrap } from "../basic/Bootstrap.js";
import { CBlackBoard } from "../basic/CBlackBoard.js";
import {CDOM} from "../basic/CDOM.js";
import {CEvent} from "../basic/CEvent.js";
import {CJSON} from "../basic/CJSON.js";
import {CModal, CConfirm} from "../basic/CModal.js";
import { CAlert } from "../basic/CAlert.js";
import { CStorage } from "../system/CStorage.js";
import { CObject } from "../basic/CObject.js";
import { CPath } from "../basic/CPath.js";
import { CString } from "../basic/CString.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";


import {CVec2} from "../geometry/CVec2.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CShaderInterpret, ExtractImportPaths, GetImportFile } from "../render/CShaderInterpret.js";
import { CFile } from "../system/CFile.js";
import { CChecker } from "./CChecker.js";
import { CUtilWeb, CSheetData } from "./CUtilWeb.js";
import { CFecth } from "../network/CFecth.js";
import { CAuthInfo } from "../network/CAuthInfo.js";




export class CModalBackGround extends CModal
{
    

    constructor(_id=null,_zIndex : number=2000)
    {
        super(_id);

        this.SetZIndex(CModal.eSort.Manual,_zIndex);
        this.SetBG(Bootstrap.eColor.transparent);
        this.SetTitle(CModal.eTitle.None);
        this.Open();
        this.FullSwitch();
        this.mDebugMode=true;
    }
}
export class CLoadingBack extends CModalBackGround
{
    private mProgressBar: HTMLElement;
    private mRemainingText: HTMLElement;
    private mRemainingFun: ((...args: any[]) => any) | CEvent<(...args: any[]) => any>;
    private mUpdateInterval: number;

    constructor(_id: string,_remainingFun: ((...args: any[]) => any) | CEvent<(...args: any[]) => any>,_context : HTMLElement=null)
    {
        super(_id,5000);

        this.mRemainingFun = _remainingFun;
        
        // 전체화면을 덮는 배경 설정
        this.SetBG(Bootstrap.eColor.dark);
        this.SetSize(window.innerWidth, window.innerHeight);
        this.SetPosition(0, 0);
        
        //this.mCard.innerHTML="";
         // 모달 카드 자체를 전체화면으로 설정
         if (this.mCard && this.mCard.style.position!="fixed") 
        {
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
            this.mCard.style.backgroundColor = "#212529"; // Bootstrap dark 색상
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
        else//미리 만들어둔거에 넣기
        {
            
            this.mCard.innerHTML=`
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
        
        // this.SetBody(`
        //     <div class="d-flex flex-column align-items-center justify-content-center" 
        //          style="width: 100%; height: 100%;">
        //         <div class="mb-4" id='${_id}_div'>
                   
        //         </div>
        //         <div class="w-50 mb-3">
        //             <div class="progress" style="height: 30px;">
        //                 <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
        //                      role="progressbar" 
        //                      style="width: 0%" 
        //                      id="${this.Key()}_progress">
        //                 </div>
        //             </div>
        //         </div>
        //         <div class="text-white h4" id="${this.Key()}_remaining">Remaining Load: ?개</div>
        //     </div>
        // `);
        if(_context==null)
            CDOM.ID(_id+"_div").append(CDOM.DataToDom(`<h2 class="text-white fw-bold">Loading...</h2>`));
        else
            CDOM.ID(_id+"_div").append(_context);

        // 요소 참조 저장
        this.mProgressBar = CDOM.ID(this.Key() + "_progress");
        this.mRemainingText = CDOM.ID(this.Key() + "_remaining");

        // 로딩 상태 업데이트 시작
        this.StartProgressUpdate();
    }

    private StartProgressUpdate(): void
    {
        this.mUpdateInterval = window.setInterval(() => {
            this.UpdateProgress();
        }, 100);
    }

    private UpdateProgress(): void
    {
        try {
            let remaining = 0;
            
            if (typeof this.mRemainingFun === 'function') {
                remaining = this.mRemainingFun();
            } else if (this.mRemainingFun instanceof CEvent) {
                const result = this.mRemainingFun.Call();
                if (result !== null && result !== undefined) {
                    remaining = result;
                }
            }

            remaining = Math.max(0, remaining);
            
            // 남은 개수에 따라 진행률 계산 (0개면 100%, 많을수록 0%에 가까움)
            const progressPercent = remaining === 0 ? 100 : Math.max(0, 100 - (remaining * 10)); // 예시: 10개 남으면 0%, 5개 남으면 50%
            const clampedProgress = Math.max(0, Math.min(100, progressPercent));

            this.mProgressBar.style.width = clampedProgress + "%";
            this.mRemainingText.textContent = `Remaining Load: ${remaining}`;

            if (remaining <= 0) {
                this.StopProgressUpdate();
                // 로드가 완료되면 모달 자동 종료
                setTimeout(() => {
                    this.Close();
                }, 500); // 0.5초 후 자동 종료
            }
        } catch (error) {
            console.warn("로딩 진행률 업데이트 중 오류:", error);
        }
    }

    private StopProgressUpdate(): void
    {
        if (this.mUpdateInterval) {
            clearInterval(this.mUpdateInterval);
            this.mUpdateInterval = 0;
        }
    }

    public SetRemaining(remaining: number): void
    {
        const clampedRemaining = Math.max(0, remaining);
        
        // 남은 개수에 따라 진행률 계산
        const progressPercent = clampedRemaining === 0 ? 100 : Math.max(0, 100 - (clampedRemaining * 10));
        const clampedProgress = Math.max(0, Math.min(100, progressPercent));
        
        this.mProgressBar.style.width = clampedProgress + "%";
        this.mRemainingText.textContent = `Remaining Load: ${clampedRemaining}`;
        
        // 로드가 완료되면 모달 자동 종료
        if (clampedRemaining <= 0) {
            setTimeout(() => {
                this.Close();
            }, 500); // 0.5초 후 자동 종료
        }
    }

    public override Close(): void
    {
        this.StopProgressUpdate();
        super.Close();
    }
}
export class CBGAttachButton extends CModalBackGround
{

    mModal : CModal;
    mSize : CVec2;
    constructor(_id : string,_layer : number=100,_size=new CVec2(600,800))
    {
        super(null,_layer);
        //this.mZIndex=_layer;
        this.mKey=_id+"btn";
        this.SetBody(`<div class='d-flex justify-content-end' style='margin-top:5px;margin-right:10px;'>
                <button type='button' class='btn btn-success' style='pointer-events:auto;' id='${this.mKey}_jbox'>Button</button>
            </div>`);
        

        this.mSize=_size;
        

        this.mModal=new CModal(_id);
        this.mModal.SetBody("<div id='"+this.Key()+"_div'></div>");
        this.mModal.SetSize(this.mSize.x,this.mSize.y);
        this.mModal.SetHeader("<div id='"+this.Key()+"_jboxTitle'></div>");
        this.mModal.SetOverlay(true);
        this.mModal.SetCloseToHide(true);
        this.mModal.Hide();
        this.mModal.Open();
        

        CDOM.ID(this.Key()+"_jbox").onclick=()=>{
            this.mModal.Show();
        };
        //this.m_jbox.open();
    }
   
    SetContent(_data : CJSON|string|object)
    {
        CDOM.ID(this.Key()+"_div").innerHTML="";
        CDOM.ID(this.Key()+"_div").append(CDOM.DataToDom(_data));
    }
    SetTitleText(_name : string)
    {
        CDOM.ID(this.Key()+"_jboxTitle").innerText=_name;
        CDOM.ID(this.Key()+"_jbox").innerText=_name;
        
        //this.m_modal.GetHeader().children.
        //this.m_modal.GetHeader().innerText="<div id='"+this.Key()+"_jboxTitle'>"+_name+"</div>";
    }
}

export class CBGFadeEffect extends CModalBackGround {

    constructor(_id: string) {
        super(
        );

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
            </div>`,);
        this.Hide(0);
        this.mKey=_id;
        // **애니메이션을 위한 스타일을 동적으로 추가**
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
        stage.innerText=_text;
        stage.style.animation = "none"; // 애니메이션 초기화
        void stage.offsetWidth; // 강제 리페인트 (트릭)
        stage.style.animation = `fadeEffect_${this.mKey} 3s ease-in-out forwards`; // 애니메이션 이름 적용
    }
}

export class CModalEvent extends CModalBackGround
{
    //m_eventID;
    mEvent="";
    mState="";
    mLast="";
    mChangeEvent : CEvent=new CEvent();
    constructor(_id,_event=CEvent.eType.Click)
    {
        super(_id);
        //this.SetBody(_html);
        //this.m_clickID=_clickID;
        this.SetPause(false);
        this.SetCloseToHide(true);
        this.mEvent=_event;
        this.mCard.addEventListener(_event,()=>{
            this.mState=this.mEvent;
            this.mChangeEvent.Call();
        });
        
    }
    override Update(_update : CUpdate): void 
    {
        if(this.mLast!="")
            this.mLast="";
        if(this.mState!="")
        {
            this.mLast=this.mState;
            this.mState="";
        }
    }
    GetState()
    {
        return this.mLast;
    }
  
    SetChangeEvent(_event : ((...args: any[]) => any) | CEvent<(...args: any[]) => any>)
    {
        this.mChangeEvent=CEvent.ToCEvent(_event);
    }
}

export class CModalFrameView extends CModalBackGround
{
    private mDeltaFrameTime : number = 0;
    private mDeltaFrame : number = 0;

    private mFixedFrameTime : number = 0;
    private mFixedFrame : number = 0;

    private mDeltaFrameSpan : HTMLSpanElement;
    private mDeltaGraphDiv : HTMLDivElement;

    private mFixedFrameSpan : HTMLSpanElement;
    private mFixedGraphDiv : HTMLDivElement;

    private mDeltaFrameLog : Array<number> = [];
    private mFixedFrameLog : Array<number> = [];

    private readonly mMaxLog : number = 60;

    constructor()
    {
        super("CModalFrameView");

        this.SetBody(`
            <div class="row" style="width:115px;height:115px;margin:0px;text-align:center;cursor:move;overflow:hidden;background:rgba(0.07,0.09,0.21,0.8);box-sizing:border-box;position:fixed;left:0;top:0;opacity:0.9;z-index:10000;border:1px solid #aaa;">
                <span id="DeltaFrameSpan" style="color:green; font-size:12px;"></span>
                <span id="FixedFrameSpan" style="color:red; font-size:12px;"></span>
                <div id="DeltaFrameGraph" style="width:80px;height:35px;margin-top:5px;background-color:#000000;"></div>
                <div id="FixedFrameGraph" style="width:80px;height:35px;margin-top:5px;background-color:#000000;"></div>
            </div>
        `);
        //this.Hide(0);
        this.SetPause(false);
        this.mDeltaFrameSpan = CDOM.ID("DeltaFrameSpan") as HTMLSpanElement;
        this.mFixedFrameSpan = CDOM.ID("FixedFrameSpan") as HTMLSpanElement;
        this.mDeltaGraphDiv = CDOM.ID("DeltaFrameGraph") as HTMLDivElement;
        this.mFixedGraphDiv = CDOM.ID("FixedFrameGraph") as HTMLDivElement;
        this.mDeltaFrameSpan.innerText = "Delta_FPS";
        this.mFixedFrameSpan.innerText = "Fixed_FPS";
        this.mDeltaGraphDiv.innerHTML = "";
        this.mFixedGraphDiv.innerHTML = "";
        for(let i = 0; i < this.mMaxLog; i++) {
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

    public override Update(_update : CUpdate) : void
    {
        this.mDeltaFrameTime += _update.DeltaTime();
        this.mDeltaFrame++;
        if(this.mDeltaFrameTime > 1) {
            this.AddDeltaLog(this.mDeltaFrame);
            this.UpdateDeltaFrameDiv();

            this.mDeltaFrameTime -= 1;
            this.mDeltaFrame = 0;
        }
        this.mFixedFrameTime += _update.FixedTime();
        this.mFixedFrame++;
        if(this.mFixedFrameTime > 1) {
            this.AddFixedLog(this.mFixedFrame);
            this.UpdateFixedFrameDiv();

            this.mFixedFrameTime -= 1;
            this.mFixedFrame = 0;
        }
    }

    private AddDeltaLog(_frame : number) {
        this.mDeltaFrameLog.push(_frame);
        if(this.mDeltaFrameLog.length > this.mMaxLog) {
            this.mDeltaFrameLog.splice(0, 1);
        }
    }

    private AddFixedLog(_frame : number) {
        this.mFixedFrameLog.push(_frame);
        if(this.mFixedFrameLog.length > this.mMaxLog) {
            this.mFixedFrameLog.splice(0, 1);
        }
    }

    private UpdateDeltaFrameDiv() {
        let min = Math.min(...this.mDeltaFrameLog);
        let max = Math.max(...this.mDeltaFrameLog);

        this.mDeltaFrameSpan.innerText = "Delta FPS : " + this.mDeltaFrame + "\n(" + min + "-" + max + ")";
        for(let i = 0; i < this.mDeltaFrameLog.length; i++) {
            let bar = this.mDeltaGraphDiv.children.item(this.mMaxLog - this.mDeltaFrameLog.length + i) as HTMLDivElement;
            bar.style.height = (max == 0? 0 : Math.floor(35 * (this.mDeltaFrameLog[i] / max))) + "px";
        }
    }

    private UpdateFixedFrameDiv() {
        let min = Math.min(...this.mFixedFrameLog);
        let max = Math.max(...this.mFixedFrameLog);

        this.mFixedFrameSpan.innerText = "Fixed FPS : " + this.mFixedFrame + "\n(" + min + "-" + max + ")";
        for(let i = 0; i < this.mFixedFrameLog.length; i++) {
            let bar = this.mFixedGraphDiv.children.item(this.mMaxLog - this.mFixedFrameLog.length + i) as HTMLDivElement;
            bar.style.height = (max == 0? 0 : Math.floor(35 * (this.mFixedFrameLog[i] / max))) + "px";
        }
    }
}


export class CModalChat extends CModal
{
    mChatList=new Array<string>();
    mTranslucent : boolean;
    //mChatEvent : CEvent=null;
    constructor(_key,_translucent=true)
    {
        super(_key);
        this.mTranslucent=_translucent;
        if(_translucent==false)
        {
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
        else
        {
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
        

        this.SetSize(320,320);

    }
    override Open(_startPos?: number): void {
        super.Open(_startPos);
        //this.m_body.className="card-body p-2 overflow-auto";
        //this.m_body.className="card-body pt-1 pl-2 pr2 pb-2 overflow-auto";
        
        //this.m_body.style.padding="4px";
        const sendBtn = document.getElementById("sendBtn"+this.mKey);
        const chatInput = document.getElementById("chatInput"+this.mKey) as HTMLInputElement;
        const chatMessages = document.getElementById("chatMessages"+this.mKey);

        if (sendBtn && chatInput) {
            sendBtn.addEventListener("click", () => {
                const text = chatInput.value.trim();
                if (text) {
                    if(this.GetEvent(CEvent.eType.Chat)==null)
                        this.ChatAdd(text);
                    else
                        this.GetEvent(CEvent.eType.Chat).Call([text,this]);

                    chatInput.value = "";
                    chatInput.focus();
                }
            });

            // 엔터 키 입력 시
            chatInput.addEventListener("keydown", (e: KeyboardEvent) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendBtn.click(); // 전송 버튼 강제 클릭
                }
            });
        }
        // ✅ translucent 모드일 때 클릭 시 height 토글
        if (this.mTranslucent && chatMessages) {
            let collapsed = false;
            let originalHeight = 0;
        
            chatMessages.addEventListener("click", () => {
                if (collapsed==false) {
                    
                    collapsed = true;
                    originalHeight=this.mOH;
                    this.SetSize(this.mOW,originalHeight*0.5);
                    
                } else {
                    this.SetSize(this.mOW,originalHeight);
                    collapsed = false;
                }
            });
        }
        
    }
    ChatAdd(_text: string,_color="#ff6600")
    {
        const chatMessages = document.getElementById("chatMessages"+this.mKey);
        if (!chatMessages) return;

        // 채팅 메시지 추가
        const messageDiv = document.createElement("div");
        //messageDiv.className = "mb-2";
        if (this.mTranslucent) {
            //messageDiv.classList.add("text-warning");
            messageDiv.style.color = _color;
        }
        else if(_color!="#ff6600")
            messageDiv.style.color = _color;

        messageDiv.innerHTML = _text;
        chatMessages.appendChild(messageDiv);

        // 내부 배열에도 기록
        this.mChatList.push(_text);

        // 최대 메시지 수 제한
        const maxCount = 50;
        if (this.mChatList.length > maxCount)
        {
            this.mChatList.shift(); // 배열에서 앞 제거
            if (chatMessages.firstChild) {
                chatMessages.removeChild(chatMessages.firstChild); // DOM에서 앞 제거
            }
        }

        // 스크롤 맨 아래로 이동
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    // SetChatEvent(_event : ((...args: any[]) => any) | CEvent<(...args: any[]) => any>)
    // {
    //     this.mChatEvent=CEvent.ToCEvent(_event);
    // }
}

export class CFileViewer extends CModal 
{
    mEditer=null;
    mExeEvent : CEvent;
    //mLoadEvent : CEvent;
    mFile : string[];
    mGitHub=false;
    constructor(_file : string[],_exeEvent: ((...args: any[]) => any) | CEvent<(...args: any[]) => any>=null,_github=false)
    {
        super();
        this.mGitHub=_github;
        this.mFile=_file;
        this.mExeEvent=CEvent.ToCEvent(_exeEvent);
        //this.mLoadEvent=CEvent.ToCEvent(_loadEvent);
        //this.SetHeader("Error");
        
        let id=this.Key();
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

        //this.SetBody("<div id='"+id+"_body' class='h-100' style='min-height:640px;'></div>");
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
    override Open(_startPos?: number): void 
    {

        super.Open(_startPos);
        

        let id=this.Key();

        if(this.mExeEvent.IsCall()==false)  CDOM.ID(id+"_exe").hidden=true;
        


        let event=(editer)=>{
            this.mEditer=editer;
        };
        let LoadFile=(_file)=>{
            //this.mLoadEvent.Call();
            CFile.Load(_file,false,true).then((_buf : ArrayBuffer)=>{
                let source=CUtil.ArrayToString(_buf);
                let info=CString.ExtCut(_file);
                const language = CUtilWeb.sMonacoExtToLang[info.ext] ?? "plaintext";
                // typescript만 TSImport/파일 URI 해석이 필요하므로 전용 경로 유지
                if(language === "typescript")
                {
                    CUtilWeb.MonacoEditer(CDOM.ID(id+"_body"),source,"typescript","vs-dark",async (monacoEditer)=>{
                        this.mEditer=monacoEditer;
                        if(monacoEditer!=null)
                        {
                            const model = monacoEditer.getModel();
                            const lastLine = model.getLineCount();
                            monacoEditer.revealLineInCenter(lastLine);
                        }
                    },this.mGitHub,_file);
                }
                else
                    CUtilWeb.MonacoEditer(CDOM.ID(id+"_body"),source,language,"vs-dark",event);
            });
        };
        LoadFile(this.mFile[0]);
        const loadBtn = CDOM.ID(`${id}_load`);
        const exeBtn = CDOM.ID(`${id}_exe`);
        loadBtn?.addEventListener("click", async () => {
            LoadFile(CDOM.IDValue(`${id}_select`));
        });

        exeBtn?.addEventListener("click", () => {
           let newBufStr=this.mEditer.getModel().getValue();
           this.mExeEvent.Call(CDOM.IDValue(`${id}_select`),newBufStr);
        });
    }
    GetEditer() {   return this.mEditer;    }
}


export class CModalFlex extends CModal 
{
    m_flex = new Array<any>();
    m_horizontal = true; // true: 가로 정렬, false: 세로 정렬
    m_dividerSyncFns = new Array<() => void>();

    constructor(_percent : Array<number>,_key : string=null)
    {
        super(_key);
        this.m_flex=_percent;
    }

    FindFlex(_off)
    {
        return this.m_flex[_off];
    }
    
    override Open(_startPos = CModal.ePos.Random) {
        super.Open(_startPos);
        
       
        this.mBody.classList = "card-body p-0 d-flex overflow-auto";
        this.mBody.classList.add(this.m_horizontal ? "flex-row" : "flex-column");
        this.mBody.style.width = "100%";
        this.mBody.style.height = "100%";
        this.mBody.style.position = "relative";
        
        this.mBody.innerHTML = ""; // 기존 내용 삭제
        let dividerList = new Array<HTMLDivElement>();
        for (let i = 0; i < this.m_flex.length; i++) {
            let div = document.createElement("div");
            div.className = "border position-relative";
            div.style.flex = "1";
            div.style.minWidth = "50px";
            div.style.minHeight = "50px";

            let newSize=0;
            if(this.m_horizontal)
                newSize=this.mBody.clientWidth*this.m_flex[i];
            else
                newSize=this.mBody.clientHeight*this.m_flex[i];
            if(i!=0)
                newSize-=4;

            //div.style.flex = `0 0 ${newSize}px`;
            //마지막만 붙이기
            if (i === this.m_flex.length - 1) 
                div.style.flex = "1 1 auto";
             else 
                div.style.flex = `0 0 ${newSize}px`;
            
            //div.style.overflow = "hidden";
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
                } else {
                    divider.style.left = "0";
                    divider.style.width = "100%";
                    divider.style.height = "6px";
                }
                
                this.mBody.appendChild(divider);
                dividerList.push(divider);
                //this.AttachResizeHandler(div, this.m_flex[i + 1], divider);
            }
        }
        this.m_dividerSyncFns = [];
        for (let i = 0; i < this.m_flex.length-1; i++)
        {
            this.m_dividerSyncFns.push(this.AttachResizeHandler(this.m_flex[i], this.m_flex[i + 1], dividerList[i]));
        }

        this.On(CEvent.eType.Resize, () => this.RelayoutFlex());
    }

    RelayoutFlex() {
        // 컨테이너 크기가 바뀌면 divider 위치만 다시 맞춘다.
        // 패널 크기(flex-basis)는 그대로 두고 마지막 auto 패널이 남는 공간을 흡수한다.
        for (const sync of this.m_dividerSyncFns)
            sync();
    }

    AttachResizeHandler(divA, divB, divider) {
        let isDragging = false;
        let startPos = 0;
        let startSizeA = 0;
        let startSizeB = 0;
        const syncDivider = () => {
            if(this.m_horizontal)
            {
                divider.style.left = (divA.offsetLeft + divA.offsetWidth - 3) + "px";
                divider.style.top = "0";
                divider.style.height = "100%";
            }
            else
            {
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
            if (!isDragging) return;
            let delta = (this.m_horizontal ? e.clientX : e.clientY) - startPos;
            let newSizeA = startSizeA + delta;
            let newSizeB = startSizeB - delta;
            
            if (newSizeA < 50 || newSizeB < 50) return;
            if(this.m_horizontal)
            {
                divA.style.flex = `0 0 ${newSizeA}px`;
                divB.style.flex = `0 0 ${newSizeB}px`;
                syncDivider();
                //divA.style.width = `${newSizeA}px`;
                //divB.style.width = `${newSizeB}px`;
            }
            else
            {
                divA.style.flex = `0 0 ${newSizeA}px`;
                divB.style.flex = `0 0 ${newSizeB}px`;
                syncDivider();
                //divA.style.height = `${newSizeA}px`;
                //divB.style.height = `${newSizeB}px`;
            }
            
        };
        
        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        return syncDivider;
    }
    override FullSwitch(_enable : boolean=null)
    {
        
        let size=new Array<number>();
        for (let i = 0; i < this.m_flex.length; i++) 
        {
            if(this.m_horizontal)
            {
                size.push(this.m_flex[i].clientWidth/this.mBody.clientWidth);
            }
            else
                size.push(this.m_flex[i].clientHeight/this.mBody.clientHeight);
        }
        super.FullSwitch(_enable);

        let allSize=0;
        if(this.m_horizontal)
        {
            allSize=this.mBody.clientWidth;
            for (let i = 0; i < this.m_flex.length; i++) 
            {
                let newSize=this.mBody.clientWidth*size[i];
                allSize-=newSize;
                if(i==this.m_flex.length-1)
                    newSize+=allSize-4*(this.m_flex.length-1);
                if (i === this.m_flex.length - 1) {
                    // 마지막 div는 자동 확장
                    this.m_flex[i].style.flex = "1 1 auto";
                    this.m_flex[i].style.marginRight = "2px"; 
                     
                } else {
                    this.m_flex[i].style.flex = `0 0 ${newSize}px`;
                }
                
                //this.m_flex[i].style.flex = `0 0 ${newSize}px`;
                //this.m_flex[i].style.width = `${newSize}px`;
            }
            
        }
        else
        {
            allSize=this.mBody.clientHeight;
            for (let i = 0; i < this.m_flex.length; i++) 
            {
                let newSize=this.mBody.clientHeight*size[i];
                allSize-=newSize;
                if(i==this.m_flex.length-1)
                    newSize+=allSize-4*(this.m_flex.length-1);
                //this.m_flex[i].style.flex = `0 0 ${newSize}px`;
                if (i === this.m_flex.length - 1) {
                    // 마지막 div는 자동 확장
                    this.m_flex[i].style.flex = "1 1 auto";
                    this.m_flex[i].style.marginBottom = "2px"; 
                } else {
                    this.m_flex[i].style.flex = `0 0 ${newSize}px`;
                }
                //this.m_flex[i].style.height = `${newSize}px`;
            }
        }

        
    }
}
export class CBlackboardModal extends CModal {
    constructor(
        _blackboard: Array<string>
    ) {
        super();

        this.SetHeader("<div id='bbm_div'>BlackBoard Unit [<font color='red'>X</font>]Ctrl : ProxyMode</div>");
        this.SetTitle(CModal.eTitle.TextClose);
        this.SetZIndex(CModal.eSort.Manual, CModal.eSort.Auto + 10);
        this.SetSize(600, 400);

        

        const container = document.createElement("div");
        container.className = "d-flex flex-wrap justify-content-start p-2";

        _blackboard.forEach((key, i) => {
            // 각 key마다 개별 블랙보드 찾기
            const bb = CBlackBoard.Find(key) as CSubject;
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
            box.title=key;

            box.setAttribute("draggable", "true");
            box.addEventListener("dragstart", (event: DragEvent) => {
                if (!event.dataTransfer) return;
                event.dataTransfer.setData("text", key);
                CObject.SetDrag("CObject", bb);
            });

            // === 썸네일 이미지 추가 부분 ===
            const img = document.createElement("img");
            img.src = durl;
            img.alt = key;

            // 박스(64x64)에 딱 맞게 고정
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover"; // 필요하면 "contain" 으로 바꿔도 됨

            // 드래그는 box가 담당하도록
            img.draggable = false;
            img.style.pointerEvents = "none";

            box.appendChild(img);
            // ==============================

            container.appendChild(box);
        });

        this.SetBody(container);
        this.Open();

        window.addEventListener("keydown",(e)=>{
            if(e.ctrlKey==true)
                CDOM.ID("bbm_div").innerHTML="BlackBoard Unit [<font color='green'>O</font>]Ctrl : ProxyMode";
                
            // else
            //     this.SetHeader("BlackBoard Unit [X]Ctrl : ProxyMode");
            
        });
        window.addEventListener("keyup",(e)=>{
            if(e.ctrlKey==false)
                CDOM.ID("bbm_div").innerHTML="BlackBoard Unit [<font color='red'>X</font>]Ctrl : ProxyMode";
                //this.SetHeader("BlackBoard Unit [X]Ctrl : ProxyMode");
            
        });
    }
}



export class CMonacoViewer extends CModal {

    mEditor: any = null;
    mGithub=false;
    mFilePath: string = null;

    constructor(_source: string, _fileName : string,_github=false)
    {
        
        super();
        this.SetHeader(_fileName);
        this.SetTitle(CModal.eTitle.TextFullClose);
        this.SetZIndex(CModal.eSort.Manual, CModal.eSort.Auto + 1);
        this.SetResize(true);
        this.SetSize(800, 600);
        this.mGithub=_github;
        


        // JSON 데이터를 문자열로 변환
        //const jsonString = typeof _jsonData === 'string' ? _jsonData : JSON.stringify(_jsonData, null, 2);
        
        // Monaco Editor를 위한 컨테이너 생성
        // const container = document.createElement("div");
        // container.id = "modal_editor";
        // container.style.width = "100%";
        // container.style.height = "100%";
        // container.style.border = "1px solid #ccc";

        // this.SetBody(container);
        let id=this.Key()+"_editer";
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

        // 파일 확장자에 따른 언어 타입 자동 설정 (CUtilWeb.sMonacoExtToLang 공유)
        let languageType = "plaintext";
        if (_fileName) {
            const extension = _fileName.toLowerCase().split('.').pop() || "";
            languageType = CUtilWeb.sMonacoExtToLang[extension] ?? "plaintext";
        }

        // Monaco Editor 초기화
        // 실제 파일이 없는 RunTime 스니펫이라도, 현재 페이지 위치를 기준으로 가상의 실제 경로를 만들어 넘기면
        // TS가 상대경로 import(../../../artgine/...)를 스스로 해석해 타입 정보/자동완성이 정상 동작한다.
        // 파일명에 인스턴스 고유 Key를 섞는 이유: InitDevToolScriptViewer()는 한 세션에서 여러 번(튜토리얼
        // 진행 중 1회, 종료 후 1회, RunTime 버튼 클릭마다 추가) 호출되어 CMonacoViewer가 여러 개 생성되는데,
        // CMonacoViewer는 Close() 시 Monaco 모델을 dispose하지 않는다. 경로가 매번 같으면 이전에 생성된
        // 모델의 URI와 충돌해 getModel/createModel 재사용 분기를 타게 되고, 그 과정에서 새 에디터가
        // 정상적으로 생성되지 못해 화면이 빈 채로 남는 문제가 있었다. 디렉토리(=import 해석 기준)는 같게
        // 유지하되 파일명만 인스턴스별로 유일하게 만들어 매번 새 모델을 생성하도록 한다.
        this.mFilePath = CString.PathSub(CPath.FullPath()) + "/" + this.Key() + "_" + _fileName;
        CUtilWeb.MonacoEditer(CDOM.ID(id), _source, languageType, "vs-dark",async (monacoEditer)=>{
            this.mEditor=monacoEditer;
        },this.mGithub, this.mFilePath);
    }
    GetSource()
    {
        return this.mEditor.getModel().getValue();
    }
    async SetSource(_source,)
    {
        //if(_language=="typescript")
		_source=await CUtilWeb.TSImport(_source,true,this.mGithub,this.mFilePath,false);
        return this.mEditor.getModel().setValue(_source);
    }
    
}


export class CMDViewer extends CModal 
{
    constructor(_file,_title=CModal.eTitle.TextFullClose)
    {
        super();
        //let id=this.Key();
        this.SetTitle(_title);
        //this.SetResize(true);
        this.SetHeader(_file);
        

        let lan=CUtil.Language();

        (async () => {
            const lan = CUtil.Language(); // ← 건드리지 않음(그대로 사용)
            let finalPath = _file;

            const base = _file.replace(/\.md$/i, '');
            const candidate = `${base}-${lan}.md`;
            try {
                const probed = await CFile.Load(candidate);
                // 존재하면 그걸 사용, 아니면 원본 유지
                if (probed) finalPath = candidate;
            } catch {
                // 로드 실패 → 원본(_file)로 fallback
            }
            

            //this.mBody.innerHTML = '';
            //this.mBody.append(await CUtilWeb.MDReader(finalPath));
            this.SetBody(await CUtilWeb.MDReader(finalPath));
            this.Open();
        })().catch(err => console.error('CMDViewer init error:', err));

        // let buf=CFile.Load("../../README-"+lan+".md").then(async ()=>{
        //     if(buf==null || lan=="en")  lan="";
        //     else lan="-"+lan;
        //     this.mBody.innerHTML="";
        //     this.mBody.append(await CUtilWeb.MDReader("../../README"+lan+".md"));
        // });



    }

}

/**
 * PDF 파일을 pdf.js로 렌더링하는 모달.
 * 브라우저 내장 뷰어가 없는 모바일/WebView에서도 canvas로 페이지를 그린다.
 *
 * 사용 예)
 *   new CModalPDF('docs/guide.pdf').Open();
 *
 * 라이브러리: artgine/external/legacy/pdfjs/ (pdfjs-dist 5.4.149 legacy)
 * HTML Include(개발자 모드 → pdfjs) 또는 File.html 등에서 window.pdfjsLib 를 먼저 로드해야 한다.
 */
export class CModalPDF extends CModal
{
    static sLib: any = null;
    static sLoad: Promise<any> = null;

    mFile: string;
    mPdf: any = null;
    mPage = 1;
    mPageCount = 0;
    mScale = 0;
    mFit = true;
    mRenderTask: any = null;
    mClosed = false;

    constructor(_file: string)
    {
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

    static PdfBaseUrl(): string
    {
        return CPath.WebRootArtgineUrl() + "artgine/external/legacy/pdfjs/";
    }

    static EnsureLib(): Promise<any>
    {
        if (CModalPDF.sLib) return Promise.resolve(CModalPDF.sLib);
        if (CModalPDF.sLoad) return CModalPDF.sLoad;

        const take = () => {
            const pdfjs = (window as any).pdfjsLib;
            if (!pdfjs?.getDocument) return null;
            const base = CModalPDF.PdfBaseUrl();
            if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc)
                pdfjs.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.mjs";
            CModalPDF.sLib = pdfjs;
            return pdfjs;
        };

        const now = take();
        if (now) return Promise.resolve(now);

        const start = Date.now();
        CModalPDF.sLoad = CChecker.Exe(async () => {
            if (take()) return false;
            return Date.now() - start < 3000;
        }, 100).then(() => {
            CModalPDF.sLoad = null;
            if (CModalPDF.sLib) return CModalPDF.sLib;
            CAlert.W("pdfjs not import!");
            throw new Error("pdfjs not import");
        });
        return CModalPDF.sLoad;
    }

    override Open(_startPos: CModal.ePos = CModal.ePos.Center): void
    {
        super.Open(_startPos);
        const id = this.Key();
        CDOM.ID(id + "_prev")?.addEventListener("click", () => this.GoPage(this.mPage - 1));
        CDOM.ID(id + "_next")?.addEventListener("click", () => this.GoPage(this.mPage + 1));
        CDOM.ID(id + "_zoomout")?.addEventListener("click", () => this.Zoom(-0.2));
        CDOM.ID(id + "_zoomin")?.addEventListener("click", () => this.Zoom(0.2));
        CDOM.ID(id + "_fit")?.addEventListener("click", () => { this.mFit = true; this.RenderPage(); });
        this.LoadPdf();
    }

    override Close(_delayTime = 0)
    {
        this.mClosed = true;
        try { this.mRenderTask?.cancel(); } catch {}
        this.mRenderTask = null;
        try { this.mPdf?.destroy(); } catch {}
        this.mPdf = null;
        super.Close(_delayTime);
    }

    private SetStatus(_text: string)
    {
        const el = CDOM.ID(this.Key() + "_status");
        if (el) el.textContent = _text;
    }

    private async LoadPdf()
    {
        const id = this.Key();
        try {
            const pdfjs = await CModalPDF.EnsureLib();
            if (this.mClosed) return;
            const buf = await CFile.Load(this.mFile, false, true);
            if (this.mClosed) return;
            if (!buf) {
                this.SetStatus("Failed to load PDF.");
                return;
            }
            const base = CModalPDF.PdfBaseUrl();
            const task = pdfjs.getDocument({
                data: new Uint8Array(buf as ArrayBuffer),
                cMapUrl: base + "cmaps/",
                cMapPacked: true,
                standardFontDataUrl: base + "standard_fonts/",
                wasmUrl: base + "wasm/",
            });
            this.mPdf = await task.promise;
            if (this.mClosed) { try { this.mPdf.destroy(); } catch {} this.mPdf = null; return; }
            this.mPageCount = this.mPdf.numPages || 1;
            this.mPage = 1;
            this.mFit = true;
            const status = CDOM.ID(id + "_status");
            if (status) status.style.display = "none";
            const cv = CDOM.ID(id + "_cv") as HTMLCanvasElement;
            if (cv) cv.style.display = "";
            await this.RenderPage();
        } catch (e) {
            this.SetStatus("PDF.js error: " + (e instanceof Error ? e.message : String(e)));
        }
    }

    private GoPage(_page: number)
    {
        if (!this.mPdf) return;
        const next = Math.max(1, Math.min(this.mPageCount, _page));
        if (next === this.mPage && this.mScale !== 0) return;
        this.mPage = next;
        this.RenderPage();
    }

    private Zoom(_delta: number)
    {
        this.mFit = false;
        this.mScale = Math.max(0.4, Math.min(3, (this.mScale || 1) + _delta));
        this.RenderPage();
    }

    private async RenderPage()
    {
        if (!this.mPdf || this.mClosed) return;
        const id = this.Key();
        const canvas = CDOM.ID(id + "_cv") as HTMLCanvasElement;
        const view = CDOM.ID(id + "_view");
        const pageEl = CDOM.ID(id + "_page");
        if (!canvas || !view) return;

        try { this.mRenderTask?.cancel(); } catch {}
        this.mRenderTask = null;

        const page = await this.mPdf.getPage(this.mPage);
        if (this.mClosed) return;

        const baseVp = page.getViewport({ scale: 1 });
        if (this.mFit) {
            const avail = Math.max(80, view.clientWidth - 16);
            this.mScale = avail / baseVp.width;
        }
        const viewport = page.getViewport({ scale: this.mScale || 1 });
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const task = page.render({ canvas, canvasContext: ctx, viewport });
        this.mRenderTask = task;
        try {
            await task.promise;
        } catch (e: any) {
            if (e?.name === "RenderingCancelledException") return;
            throw e;
        }
        if (pageEl) pageEl.textContent = `${this.mPage} / ${this.mPageCount}`;
    }
}

/**
 * CSV / Excel(.xlsx) 파일을 시트 형태로 보여주는 모달
 * - 파일(buf)을 CSheetData(JSON)로 1차 가공한 뒤 CUtilWeb.SheetEditor에 렌더링/편집을 위임한다.
 * - CSV  : 단일 시트([{name:'Sheet1', rows}])로 렌더링
 * - xlsx : 시트별 Bootstrap 5 탭(nav-tabs)으로 렌더링
 *
 * 사용 예)
 *   new CSheetViewer(['data/score.csv']).Open();
 *   new CSheetViewer(['data/report.xlsx']).Open();
 *
 * xlsx 지원을 위해 HTML에 아래 태그가 있어야 합니다.
 *   <script src=".../artgine/external/legacy/excel/xlsx.mini.min.js"></script>
 */
export class CSheetViewer extends CModal
{
    mFiles: string[];
    mSaveEvent: CEvent;
    mCurrentFile: string = '';
    mCurrentData: CSheetData = null;

    constructor(_file: string[], _saveEvent: ((...args: any[]) => any) | CEvent<(...args: any[]) => any> = null)
    {
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

    override Open(_startPos: CModal.ePos = CModal.ePos.Random): void
    {
        super.Open(_startPos);
        const id = this.Key();

        if (this.mSaveEvent.IsCall() === false)
            CDOM.ID(id + '_save').hidden = true;

        const LoadFile = async (_file: string) =>
        {
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

            const buf = await CFile.Load(_file,false,true);
            if (!buf)
            {
                body.innerHTML = `<div class="alert alert-warning m-3">파일을 불러올 수 없습니다.</div>`;
                return;
            }

            const info = CString.ExtCut(_file);
            if (info.ext !== 'csv' && info.ext !== 'xlsx' && info.ext !== 'xls')
            {
                body.innerHTML = `<div class="alert alert-secondary m-3">지원하지 않는 파일 형식입니다: .${info.ext}</div>`;
                return;
            }

            let data: CSheetData;
            if (info.ext === 'csv')
            {
                const str = CUtil.ArrayToString(buf as any);
                const lines = str.split(/\r?\n/).filter(l => l.trim());
                data = [{ name: 'Sheet1', rows: lines.map(l => this.ParseCSVLine(l)) }];
            }
            else
            {
                const XLSX = (window as any)['XLSX'];
                if (!XLSX)
                {
                    body.innerHTML = `<div class="alert alert-danger m-3">
                        xlsx 라이브러리가 로드되지 않았습니다.<br>
                        <small>HTML에 xlsx.mini.min.js 스크립트를 추가해주세요.</small>
                    </div>`;
                    return;
                }
                const wb = XLSX.read(new Uint8Array(buf as ArrayBuffer), { type: 'array' });
                data = (wb.SheetNames as string[]).map(name =>
                {
                    const sheet = wb.Sheets[name];
                    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                    return { name, rows };
                });
            }

            this.mCurrentData = data;
            CUtilWeb.SheetEditor(body, data, true, (_action, _payload) =>
            {
                this.ApplySheetAction(_action, _payload);
            });
        };

        LoadFile(this.mFiles[0]);

        CDOM.ID(`${id}_load`)?.addEventListener('click', () =>
        {
            LoadFile(CDOM.IDValue(`${id}_select`));
        });

        CDOM.ID(`${id}_save`)?.addEventListener('click', () =>
        {
            if (!this.mCurrentFile || !this.mCurrentData) return;
            const info = CString.ExtCut(this.mCurrentFile);

            if (info.ext === 'csv')
            {
                const csvStr = this.SerializeCSV(this.mCurrentData[0]?.rows ?? []);
                const base64 = btoa(unescape(encodeURIComponent(csvStr)));
                this.mSaveEvent.Call(this.mCurrentFile, base64);
            }
            else if (info.ext === 'xlsx' || info.ext === 'xls')
            {
                const XLSX = (window as any)['XLSX'];
                if (!XLSX) return;
                const wb = XLSX.utils.book_new();
                this.mCurrentData.forEach(sheet =>
                {
                    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
                    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
                });
                const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
                this.mSaveEvent.Call(this.mCurrentFile, base64);
            }
        });
    }

    /**
     * CUtilWeb.SheetEditor가 넘겨준 (action, payload)를 원본 메모리(mCurrentData)에 바로 반영한다.
     * 로컬 파일 편집은 전체 데이터를 서버로 보내지 않고 이 자리에서 직접 수정하면 된다.
     * DB용 에디터는 이 자리 대신 action/payload를 SQL(INSERT/DELETE/UPDATE/ALTER)로 변환해 전송하면 된다.
     */
    private ApplySheetAction(_action: string, _payload: any): void
    {
        if (!this.mCurrentData) return;

        switch (_action)
        {
            case 'update':
            {
                const sheet = this.mCurrentData.find(s => s.name === _payload.sheet);
                if (!sheet) break;
                const rowIdx = _payload.row + 1;
                if (!sheet.rows[rowIdx]) sheet.rows[rowIdx] = [];
                sheet.rows[rowIdx][_payload.col] = _payload.value;
                break;
            }
            case 'insert':
            {
                const sheet = this.mCurrentData.find(s => s.name === _payload.sheet);
                if (sheet) sheet.rows.splice(_payload.row + 1, 0, _payload.values);
                break;
            }
            case 'delete':
            {
                const sheet = this.mCurrentData.find(s => s.name === _payload.sheet);
                if (sheet) sheet.rows.splice(_payload.row + 1, 1);
                break;
            }
            case 'alter':
            {
                const sheet = this.mCurrentData.find(s => s.name === _payload.sheet);
                if (!sheet) break;
                if (!sheet.rows[0]) sheet.rows[0] = [];
                sheet.rows[0][_payload.col] = _payload.name;
                break;
            }
            case 'insertSheet':
                this.mCurrentData.splice(_payload.index, 0, { name: _payload.name, rows: [['']] });
                break;
            case 'deleteSheet':
            {
                const idx = this.mCurrentData.findIndex(s => s.name === _payload.name);
                if (idx >= 0) this.mCurrentData.splice(idx, 1);
                break;
            }
        }
    }

    /** RFC 4180 호환 CSV 한 줄 파싱 */
    private ParseCSVLine(line: string): string[]
    {
        const result: string[] = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++)
        {
            const ch = line[i];
            if (ch === '"')
            {
                if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
                else inQuote = !inQuote;
            }
            else if (ch === ',' && !inQuote) { result.push(cur); cur = ''; }
            else cur += ch;
        }
        result.push(cur);
        return result;
    }

    /** 2D 배열 → RFC 4180 CSV 문자열 */
    private SerializeCSV(rows: string[][]): string
    {
        return rows.map(row =>
            row.map(cell =>
            {
                if (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
                    return '"' + cell.replace(/"/g, '""') + '"';
                return cell;
            }).join(',')
        ).join('\r\n');
    }
}

export class CModalStackMsg extends CModal
{
    private static readonly sGAP = 8;
    private static readonly sEDGE = 8;

    mStackCorner: CModal.ePos;

    constructor(_corner: CModal.ePos = CModal.ePos.BottomRight, _key: string = null)
    {
        super(_key);
        this.mStackCorner = _corner;
        this.SetTitle(CModal.eTitle.None);
        this.SetResize(false);
        this.SetLimitPush(false);
        this.mBodyStyle = "card-body p-0 overflow-hidden";
    }

    static GetStack(_corner: CModal.ePos): CModalStackMsg[]
    {
        return CModal.GetModalList().filter(
            m => m instanceof CModalStackMsg &&
                 (m as CModalStackMsg).mStackCorner === _corner &&
                 m.mCard != null &&
                 m.IsShow()
        ) as CModalStackMsg[];
    }

    static RefreshStack(_corner: CModal.ePos)
    {
        const list = CModalStackMsg.GetStack(_corner);
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isBottom = _corner === CModal.ePos.BottomLeft || _corner === CModal.ePos.BottomRight;
        const isRight  = _corner === CModal.ePos.TopRight   || _corner === CModal.ePos.BottomRight;

        let offset = CModalStackMsg.sEDGE;

        for (const modal of list)
        {
            const cardH = modal.mCard.offsetHeight || modal.mOH || 60;
            const cardW = modal.mCard.offsetWidth  || modal.mOW || 300;

            const top  = isBottom ? h - offset - cardH : offset;
            const left = isRight  ? w - CModalStackMsg.sEDGE - cardW : CModalStackMsg.sEDGE;

            modal.mCard.style.transition = "top 0.3s ease, left 0.3s ease";
            modal.mCard.style.top  = top  + "px";
            modal.mCard.style.left = left + "px";
            modal.mOT = top;
            modal.mOL = left;

            offset += cardH + CModalStackMsg.sGAP;
        }
    }

    override Open(_startPos?: CModal.ePos): void
    {
        super.Open(_startPos ?? this.mStackCorner);
        setTimeout(() => CModalStackMsg.RefreshStack(this.mStackCorner), 0);
    }

    override Close(_delayTime: number = 0): void
    {
        const corner = this.mStackCorner;
        super.Close(_delayTime);
        const delay = _delayTime > 0 ? _delayTime * 1000 + 50 : 0;
        setTimeout(() => CModalStackMsg.RefreshStack(corner), delay);
    }

    override Hide(_animationTime: number = 300): void
    {
        const corner = this.mStackCorner;
        super.Hide(_animationTime);
        setTimeout(() => CModalStackMsg.RefreshStack(corner), _animationTime + 50);
    }

    override Show(): void
    {
        super.Show();
        setTimeout(() => CModalStackMsg.RefreshStack(this.mStackCorner), 16);
    }
}

export class CModalTerminal extends CModal
{
    private static msCount = 0;

    constructor()
    {
        super(null);
        CModalTerminal.msCount++;
        this.SetCloseToHide(false);
        this.SetResize(true);
        this.SetTitle(CModal.eTitle.TextMinFullClose);
        this.SetHeader("Terminal #" + CModalTerminal.msCount);

        const token = CStorage.Get("cmd_token");
        const src = token ? `/cmd?preauth=${token}` : '/cmd';

        this.SetBody(
            `<div style="position:relative;width:100%;height:100%;">` +
            `<iframe src="${src}" style="width:100%;height:100%;border:none;display:block;"></iframe>` +
            `<div class="modal-iframe-guard" style="position:absolute;top:0;left:0;width:100%;height:100%;display:none;z-index:1;"></div>` +
            `</div>`
        );
        this.SetSize("80%", "80%");
        this.Open(CModal.ePos.Center);

        // iframe이 마우스 이벤트를 가로채는 것을 방지
        const guard = this.mBody.querySelector('.modal-iframe-guard') as HTMLElement;
        if (guard) {
            document.addEventListener('mousedown', () => { guard.style.display = 'block'; });
            document.addEventListener('mouseup', () => { guard.style.display = 'none'; });
        }
    }
}

export class CModalMusic extends CModal
{
    static readonly sDefaultMediaImage = '512x512.png';

    private mPaths: string[];
    private mSaveFn: (paths: string[]) => void;
    private mMediaImage: string;
    private mAiEnabled: boolean;
    private mAiSearchFn: (queries: string[]) => Promise<{ urls: string[], reason: string }>;
    private mLyricsEnFn: (url: string) => Promise<{ lyrics: string }>;
    private mLastPlay = 0;
    private mRandomPool: string[] = [];
    private mAudio: HTMLAudioElement;
    private mNowPlayingEl: HTMLElement;
    private mListEl: HTMLElement;
    private mRandomChk: HTMLInputElement;
    private mAiPanel: HTMLElement;
    private mAiInput: HTMLInputElement;
    private mAiGoBtn: HTMLButtonElement;
    private mAiReasonEl: HTMLElement;
    private mLyricsBtn: HTMLButtonElement;
    private mLyricsEl: HTMLElement;
    private mLyricsUrl = '';

    constructor(paths: string[] = [], saveFn?: (paths: string[]) => void, mediaImage?: string,
                aiEnabled = false, aiSearchFn?: (queries: string[]) => Promise<{ urls: string[], reason: string }>,
                lyricsEnFn?: (url: string) => Promise<{ lyrics: string }>)
    {
        super(null);
        this.mPaths = [...paths];
        this.mSaveFn = saveFn ?? ((p: string[]) => CStorage.Set("SoundList", JSON.stringify({ fullPath: p })));
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

        this.mAudio        = this.mBody.querySelector('audio') as HTMLAudioElement;
        this.mNowPlayingEl = this.mBody.querySelector('.mm-now');
        this.mListEl       = this.mBody.querySelector('.mm-list');
        this.mRandomChk    = this.mBody.querySelector('input[type="checkbox"]') as HTMLInputElement;

        this.mBody.querySelector('.btn-danger').addEventListener('click', () => this._ClearAll());
        this.mBody.querySelector('.mm-save-list')?.addEventListener('click', () => this.mSaveFn(this.mPaths));

        if (aiEnabled) {
            this.mAiPanel    = this.mBody.querySelector('.mm-ai');
            this.mAiInput    = this.mBody.querySelector('.mm-ai-input') as HTMLInputElement;
            this.mAiGoBtn    = this.mBody.querySelector('.mm-ai-go') as HTMLButtonElement;
            this.mAiReasonEl = this.mBody.querySelector('.mm-ai-reason');

            this.mBody.querySelector('.mm-ai-toggle').addEventListener('click', () => {
                this.mAiPanel.style.display = this.mAiPanel.style.display === 'none' ? '' : 'none';
            });
            this.mAiInput.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                this._AiSearch();
            });
            this.mAiGoBtn.addEventListener('click', () => this._AiSearch());
        }

        if (lyricsEnFn) {
            this.mLyricsEl  = this.mBody.querySelector('.mm-lyrics');
            this.mLyricsBtn = this.mBody.querySelector('.mm-lyrics-en') as HTMLButtonElement;
            this.mLyricsBtn.addEventListener('click', () => this._LyricsEn());
        }

        this.mAudio.addEventListener('ended', () => this._Next());
        this.mAudio.addEventListener('pause', () => { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; });
        this.mAudio.addEventListener('play',  () => { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; });

        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play',          () => this.mAudio.play());
            navigator.mediaSession.setActionHandler('pause',         () => this.mAudio.pause());
            navigator.mediaSession.setActionHandler('nexttrack',     () => this._Next());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.Play(this.mLastPlay > 0 ? this.mLastPlay - 1 : this.mPaths.length - 1));
        }

        this._RefreshList();
    }

    /** 재생목록에 URL(단일 또는 배열)을 추가한다. 이미 있는 경로는 무시한다. */
    Add(url: string | string[]): void
    {
        const list = Array.isArray(url) ? url : [url];
        let changed = false;
        for (const u of list) {
            if (this.mPaths.includes(u)) continue;
            this.mPaths.push(u);
            changed = true;
        }
        if (changed) this._Persist();
    }

    /** 재생목록 전체를 새 URL 배열로 교체한다. */
    SetList(paths: string[]): void
    {
        this.mRandomPool = [];
        this.mPaths = [...paths];
        this.mLastPlay = 0;
        this.mAudio.pause();
        this.mNowPlayingEl.textContent = '';
        this._Persist();
    }

    /** 인덱스, URL, 또는 그 배열을 받아 재생목록에서 제거한다. */
    Delete(target: number | string | Array<number | string>): void
    {
        const list = Array.isArray(target) ? target : [target];
        const indices = new Set<number>();
        for (const t of list) {
            const i = typeof t === 'number' ? t : this.mPaths.indexOf(t);
            if (i >= 0 && i < this.mPaths.length) indices.add(i);
        }
        if (indices.size === 0) return;

        for (const i of [...indices].sort((a, b) => b - a)) {
            this.mPaths.splice(i, 1);
            if (i < this.mLastPlay) this.mLastPlay--;
            else if (i === this.mLastPlay) { this.mAudio.pause(); this.mLastPlay = 0; this.mNowPlayingEl.textContent = ''; }
        }
        this._Persist();
    }

    /** 재생목록의 full URL 경로 배열을 반환한다. */
    GetList(): string[] { return [...this.mPaths]; }

    Play(index: number): void
    {
        if (this.mPaths.length === 0) return;
        const items = this.mListEl.querySelectorAll('li');
        items[this.mLastPlay]?.classList.remove('list-group-item-dark');
        this.mLastPlay = index;
        items[index]?.classList.add('list-group-item-dark');

        if ('audioSession' in navigator) (navigator as any).audioSession.type = 'playback';
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
                        try { navigator.mediaSession.setPositionState({ duration: this.mAudio.duration, playbackRate: this.mAudio.playbackRate, position: this.mAudio.currentTime }); } catch(e) {}
                    }
                }
            })
            .catch(e => console.warn('CModalMusic.Play:', e));
    }

    /** 경로 끝의 파일명만 추출 (mediaSession 표시용). */
    private static _FileName(path: string): string
    {
        const clean = path.split('?')[0].split('#')[0];
        const base = clean.split('/').pop() || clean;
        try { return decodeURIComponent(base); } catch { return base; }
    }

    /** URL 인코딩된 경로를 디코딩한 뒤, 앞부분을 생략(...)해 뒤쪽 경로만 보이게 한다 (리스트 표시용). */
    private static _Truncate(path: string, max = 40): string
    {
        let decoded = path;
        try { decoded = decodeURIComponent(path); } catch {}
        if (decoded.length <= max) return decoded;
        return '...' + decoded.slice(-(max - 3));
    }

    private _Next(): void
    {
        if (this.mRandomChk.checked) {
            while (this.mPaths.length > 0) {
                if (this.mRandomPool.length === 0) this.mRandomPool = [...this.mPaths];
                const sel = Math.trunc(Math.random() * this.mRandomPool.length);
                const key = this.mRandomPool.splice(sel, 1)[0];
                const i   = this.mPaths.indexOf(key);
                if (i >= 0) { this.Play(i); return; }
            }
        } else {
            this.Play(this.mLastPlay + 1 >= this.mPaths.length ? 0 : this.mLastPlay + 1);
        }
    }

    private _ClearAll(): void
    {
        this.mRandomPool = [];
        this.mPaths = [];
        this.mAudio.pause();
        this.mNowPlayingEl.textContent = '';
        this.mLastPlay = 0;
        this._Persist();
    }

    private _Persist(): void
    {
        this.mSaveFn(this.mPaths);
        this._RefreshList();
    }

    private _RefreshList(): void
    {
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
                const del = (e.target as HTMLElement).closest('[data-del]');
                if (del) this.Delete(parseInt((del as HTMLElement).dataset.del));
                else     this.Play(i);
            });
        });
        this.mListEl.querySelectorAll('li')[this.mLastPlay]?.classList.add('list-group-item-dark');
    }

    private async _AiSearch(): Promise<void>
    {
        const text = this.mAiInput.value.trim();
        if (!text || !this.mAiSearchFn) return;

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
            } else {
                this.Add(urls);
                this.mAiInput.value = '';
                this.mAiPanel.style.display = 'none';
            }
        } catch (e) {
            console.warn('CModalMusic._AiSearch:', e);
            CAlert.E('AI 검색 실패: ' + (e instanceof Error ? e.message : String(e)));
        } finally {
            this.mAiGoBtn.disabled = false;
            this.mAiGoBtn.textContent = '검색';
        }
    }

    private _CurrentUrl(): string
    {
        if (this.mPaths.length === 0) return '';
        const idx = (this.mLastPlay >= 0 && this.mLastPlay < this.mPaths.length) ? this.mLastPlay : 0;
        return this.mPaths[idx];
    }

    private async _LyricsEn(): Promise<void>
    {
        if (!this.mLyricsEnFn) return;
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

    private async _LoadLyrics(url: string): Promise<void>
    {
        if (!this.mLyricsEnFn || !url) return;
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
        } catch (e) {
            console.warn('CModalMusic._LoadLyrics:', e);
            this.mLyricsUrl = url;
            this.mLyricsEl.textContent = '가사 조회 실패: ' + (e instanceof Error ? e.message : String(e));
        } finally {
            if (this.mLyricsBtn) {
                this.mLyricsBtn.disabled = false;
                this.mLyricsBtn.textContent = 'Lyrics';
            }
        }
    }
}

// 서버 CORMRouter(/ORM/Exec)에 연결해 테이블 목록/데이터를 보여주는 읽기 전용 뷰어.
// 생성자에 인증정보 + DB 정보만 넣으면 Open() 시 자동으로 테이블 목록을 불러온다.
export class CORMViewer extends CModal {
    private static readonly sPageSize = 100;

    private mAuth: CAuthInfo;
    private mDbType: string;
    private mDatabase: string;
    private mServerUrl: string;
    private mToken: string;
    private mCurTable: string = null;
    private mOffset = 0;
    private mHasNext = false;
    private mSortCol: string = null;
    private mSortAsc = true;
    private mCurRows: object[] = [];

    // _serverUrl: File/Memo 라우터와 동일하게, 원격 서버 브라우징 중이면 그 서버의 절대 URL(프로토콜 포함)을 넘겨
    // ORM/Exec도 로컬이 아닌 원격 서버로 가도록 한다. 비워두면 기존처럼 현재 접속된 서버(CPath.WebRootUrl())로 간다.
    // _token: 원격 서버는 세션 쿠키가 안 실리므로(cross-origin), 그 서버 기준 인증 토큰을 함께 넘겨야 CORMRouter의 IsAuth를 통과한다.
    constructor(_auth?: CAuthInfo, _dbType?: "mysql" | "mssql" | "sqlite" | "ne" | "postgresql" | "mongodb", _database?: string, _serverUrl?: string, _token?: string) {
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
        } else {
            this.SetHeader(`ORM Viewer - Connection Info`);
            this.SetBody(this.RenderConnectForm());
        }
    }

    override Open(_startPos?: number): void {
        super.Open(_startPos);
        if (this.mDbType && this.mDatabase) this.WireViewer();
        else this.WireConnectForm();
    }

    private RenderConnectForm(): string {
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

    private WireConnectForm(): void {
        const id = this.Key();
        CDOM.ID(`${id}_conn_ok`).addEventListener('click', () => {
            const dbType = (CDOM.ID(`${id}_conn_dbType`) as HTMLSelectElement).value as "mysql" | "mssql" | "sqlite" | "ne" | "postgresql" | "mongodb";
            const database = (CDOM.ID(`${id}_conn_database`) as HTMLInputElement).value.trim();
            if (!database) { alert('Please enter a connection location.'); return; }

            this.mDbType = dbType;
            this.mDatabase = database;
            this.mAuth.mID = (CDOM.ID(`${id}_conn_id`) as HTMLInputElement).value;
            this.mAuth.mPW = (CDOM.ID(`${id}_conn_pw`) as HTMLInputElement).value;
            this.mAuth.mAddres = (CDOM.ID(`${id}_conn_addres`) as HTMLInputElement).value;
            this.mAuth.mPort = (CDOM.ID(`${id}_conn_port`) as HTMLInputElement).value;

            // SetHeader는 열린 모달의 헤더 전체(innerHTML)를 덮어써서 X/전체화면 버튼이 사라진다.
            // 제목 텍스트 영역만 갱신한다.
            this.UpdateHeaderTitle(`ORM Viewer - ${this.mDatabase}`);
            this.SetBody(this.RenderViewerLayout());
            this.WireViewer();
        });
    }

    /** 모달이 이미 열린 뒤 제목만 바꿀 때 사용. 닫기 버튼 등 헤더 구조는 유지. */
    private UpdateHeaderTitle(_title: string): void {
        const header = this.GetHeader();
        if (header != null) {
            const titleWrap = header.firstElementChild as HTMLElement;
            if (titleWrap) {
                titleWrap.textContent = _title;
                return;
            }
        }
        this.SetHeader(_title);
    }

    private RenderViewerLayout(): string {
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

    private WireViewer(): void {
        const id = this.Key();
        CDOM.ID(`${id}_prev`).addEventListener('click', () => this.ChangePage(-1));
        CDOM.ID(`${id}_next`).addEventListener('click', () => this.ChangePage(1));
        this.LoadTables();
    }

    private async Exec(_func: string, _params: any = {}): Promise<any> {
        const url = this.mServerUrl ? this.mServerUrl.replace(/\/+$/, '') + '/ORM/Exec' : 'ORM/Exec';
        const res: any = await CFecth.Exe(url, {
            auth: this.mAuth,
            dbType: this.mDbType,
            database: this.mDatabase,
            token: this.mToken,
            func: _func,
            ..._params,
        }, 'json');
        if (!res.ok) throw new Error(res.msg || 'ORM request failed');
        return res.result;
    }

    private async LoadTables(): Promise<void> {
        const id = this.Key();
        const listEl = CDOM.ID(`${id}_tables`);
        listEl.innerHTML = `<div class="text-secondary small p-2">Loading...</div>`;
        try {
            const tables: string[] = await this.Exec('GetCollection');
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
                        (el as HTMLElement).style.borderBottom = '2px solid transparent';
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
        } catch (e: any) {
            listEl.innerHTML = `<div class="alert alert-danger m-1 p-2 small">${this.EscapeHtmlORM(e.message)}</div>`;
        }
    }

    private ChangePage(_dir: number): void {
        if (!this.mCurTable) return;
        if (_dir < 0 && this.mOffset === 0) return;
        if (_dir > 0 && !this.mHasNext) return;
        this.mOffset = Math.max(0, this.mOffset + _dir * CORMViewer.sPageSize);
        this.LoadTableData();
    }

    private async LoadTableData(): Promise<void> {
        const id = this.Key();
        const dataEl = CDOM.ID(`${id}_data`);
        dataEl.innerHTML = `<div class="text-secondary small p-2">Loading...</div>`;
        try {
            // 다음 페이지 존재 여부 확인용으로 1개 더 요청하고, 표시는 sPageSize개까지만 한다.
            const rows: object[] = await this.Exec('Select', {
                collection: this.mCurTable, condition: [], projection: [],
                limit: {
                    mLimitOffset: this.mOffset, mLimit: CORMViewer.sPageSize + 1,
                    mOrderBy: this.mSortCol, mASC: this.mSortAsc,
                },
            });
            this.mHasNext = rows.length > CORMViewer.sPageSize;
            this.mCurRows = rows.slice(0, CORMViewer.sPageSize);
            // 행이 없어도(빈 테이블) 추가 입력 행을 그리려면 컬럼 목록이 필요하다.
            const cols = this.mCurRows.length > 0 ? Object.keys(this.mCurRows[0]) : await this.Exec('GetProjection', { collection: this.mCurTable });
            dataEl.innerHTML = this.BuildTableORM(this.mCurRows, cols);
            this.AttachRowHandlers(dataEl);
            this.UpdatePageInfo();
        } catch (e: any) {
            dataEl.innerHTML = `<div class="alert alert-danger m-1 p-2 small">${this.EscapeHtmlORM(e.message)}</div>`;
        }
    }

    private UpdatePageInfo(): void {
        const id = this.Key();
        const page = Math.floor(this.mOffset / CORMViewer.sPageSize) + 1;
        CDOM.ID(`${id}_pageInfo`).textContent = `${this.mCurTable} - page ${page}`;
        (CDOM.ID(`${id}_prev`) as HTMLButtonElement).disabled = this.mOffset === 0;
        (CDOM.ID(`${id}_next`) as HTMLButtonElement).disabled = !this.mHasNext;
    }

    private BuildTableORM(rows: object[], cols: string[]): string {
        if (!cols || cols.length === 0) return `<div class="p-3 text-muted">No data.</div>`;
        // 컬럼 최소 폭을 두고 테이블 전체 폭이 넘치면 부모(overflow-auto)에서 좌우 스크롤.
        // 예전처럼 width:100% + table-layout:fixed로 n등분하면 컬럼이 너무 좁아져 글자가 세로로 길게 내려간다.
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
            html += `<tr>${cols.map(c => `<td class="px-2 orm-cell" data-idx="${i}" data-col="${this.EscapeHtmlORM(c)}" style="${wrapStyle}cursor:pointer;">${this.EscapeHtmlORM(String((row as any)[c] ?? ''))}</td>`).join('')}` +
                `<td class="px-2 text-nowrap" style="min-width:${ACTION_COL_WIDTH}px;"><button class="btn btn-sm btn-outline-danger orm-del-btn" data-idx="${i}">Delete</button></td></tr>`;
        });
        // 마지막 행: 빈 입력칸 + "추가" 버튼으로 새 레코드를 바로 입력할 수 있게 한다.
        html += `<tr class="orm-add-row">${cols.map(c => `<td class="px-2" style="min-width:${MIN_COL_WIDTH}px;"><input type="text" class="form-control form-control-sm" data-newfield="${this.EscapeHtmlORM(c)}"></td>`).join('')}` +
            `<td class="px-2 text-nowrap" style="min-width:${ACTION_COL_WIDTH}px;"><button class="btn btn-sm btn-outline-success orm-add-btn">Add</button></td></tr>`;
        html += `</tbody></table>`;
        return html;
    }

    private AttachRowHandlers(dataEl: HTMLElement): void {
        dataEl.querySelectorAll<HTMLElement>('th[data-col]').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.col;
                if (this.mSortCol === col) this.mSortAsc = !this.mSortAsc;
                else { this.mSortCol = col; this.mSortAsc = true; }
                this.mOffset = 0;
                this.LoadTableData();
            });
        });
        dataEl.querySelectorAll<HTMLButtonElement>('.orm-del-btn').forEach(btn => {
            btn.addEventListener('click', () => this.DeleteRow(this.mCurRows[parseInt(btn.dataset.idx)]));
        });
        dataEl.querySelector<HTMLButtonElement>('.orm-add-btn')?.addEventListener('click', () => this.SubmitAddRow(dataEl));
        dataEl.querySelectorAll<HTMLElement>('.orm-cell').forEach(td => {
            td.addEventListener('dblclick', () => this.BeginEditCell(td));
        });
    }

    private BeginEditCell(_td: HTMLElement): void {
        if (_td.querySelector('input')) return; // 이미 편집 중

        const idx = parseInt(_td.dataset.idx);
        const col = _td.dataset.col;
        const row: any = this.mCurRows[idx];
        if (!row) return;

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
            if (committed) return;
            committed = true;

            if (input.value === originalStr) { _td.textContent = originalText; return; }

            const { value, error } = this.ConvertInputValue(input.value);
            if (error) { alert(`[${col}] ${error}`); _td.textContent = originalText; return; }

            // PK를 모르므로 편집 전 행의 모든 컬럼값이 일치하는 레코드를 조건으로 갱신한다.
            const condition = Object.keys(row).map(k => ({ mKey: k, mCondition: '==', mValue: row[k] }));
            try {
                await this.Exec('Update', { collection: this.mCurTable, condition, data: [{ mKey: col, mValue: value }] });
                this.LoadTableData();
            } catch (e: any) {
                alert('Update failed: ' + e.message);
                _td.textContent = originalText;
            }
        };
        const cancel = () => {
            if (committed) return;
            committed = true;
            _td.textContent = originalText;
        };

        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter') { ke.preventDefault(); commit(); }
            else if (ke.key === 'Escape') { ke.preventDefault(); cancel(); input.blur(); }
        });
    }

    private async SubmitAddRow(dataEl: HTMLElement): Promise<void> {
        const inputs = dataEl.querySelectorAll<HTMLInputElement>('input[data-newfield]');
        const data: { mKey: string; mValue: any }[] = [];
        for (const inp of Array.from(inputs)) {
            const field = inp.dataset.newfield;
            const { value, error } = this.ConvertInputValue(inp.value);
            if (error) { alert(`[${field}] ${error}`); return; }
            data.push({ mKey: field, mValue: value });
        }
        try {
            await this.Exec('Insert', { collection: this.mCurTable, data });
            this.LoadTableData();
        } catch (e: any) {
            alert('Insert failed: ' + e.message);
        }
    }

    private DeleteRow(_row: object): void {
        if (!_row) return;
        const confirm = new CConfirm();
        confirm.SetBody('Delete this row?');
        confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
            async () => {
                // PK를 모르므로 행의 모든 컬럼값이 일치하는 레코드를 조건으로 삭제한다.
                const condition = Object.keys(_row).map(k => ({ mKey: k, mCondition: '==', mValue: (_row as any)[k] }));
                try {
                    await this.Exec('Delete', { collection: this.mCurTable, condition });
                    this.LoadTableData();
                } catch (e: any) {
                    alert('Delete failed: ' + e.message);
                }
            },
            () => {},
        ], ['Delete', 'Cancel']);
        confirm.Open();
    }

    // 입력창은 항상 문자열이므로, 정수/실수/불리언/JSON처럼 보이는 값은 실제 타입으로 변환해서 보낸다.
    // 변환 중 형식이 깨졌거나(JSON 파싱 실패) 범위를 벗어난 경우(안전 정수 초과)는 error를 채워 저장을 막는다.
    private ConvertInputValue(_raw: string): { value: any; error?: string } {
        const trimmed = _raw.trim();
        if (trimmed === '') return { value: '' };

        if (/^-?\d+$/.test(trimmed)) {
            const n = parseInt(trimmed, 10);
            if (!Number.isSafeInteger(n)) return { value: null, error: `Integer out of safe range: ${trimmed}` };
            return { value: n };
        }
        if (/^-?\d+\.\d+$/.test(trimmed)) {
            const n = parseFloat(trimmed);
            if (Number.isNaN(n)) return { value: null, error: `Invalid number format: ${trimmed}` };
            return { value: n };
        }
        if (trimmed === 'true' || trimmed === 'false') return { value: trimmed === 'true' };

        const looksLikeJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
        if (looksLikeJson) {
            try {
                return { value: JSON.parse(trimmed) };
            } catch (e: any) {
                return { value: null, error: `Invalid JSON format: ${e.message}` };
            }
        }

        return { value: _raw };
    }

    private EscapeHtmlORM(s: string): string {
        return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
    }
}

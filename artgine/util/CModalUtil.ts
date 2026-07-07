
import { CSubject } from "../app/subject/CSubject.js";
import { CUpdate } from "../basic/Basic.js";
import { Bootstrap } from "../basic/Bootstrap.js";
import { CBlackBoard } from "../basic/CBlackBoard.js";
import {CDOM} from "../basic/CDOM.js";
import {CEvent} from "../basic/CEvent.js";
import {CJSON} from "../basic/CJSON.js";
import {CModal, CConfirm} from "../basic/CModal.js";
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
import { CUtilWeb } from "./CUtilWeb.js";
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
    private mFrameTime : number = 0;
    private mFrame : number = 0;

    private mFrameSpan : HTMLSpanElement;
    private mGraphDiv : HTMLDivElement;

    private mFrameLog : Array<number> = [];

    private readonly mMaxLog : number = 60;

    constructor()
    {
        super("CModalFrameView");

        this.SetBody(`
            <div class="row" style="width:80px;height:80px;margin:0px;text-align:center;cursor:move;overflow:hidden;background:rgba(0.07,0.09,0.21,0.8);box-sizing:border-box;position:fixed;left:0;top:0;opacity:0.9;z-index:10000;border:1px solid #aaa;">
                <span id="frameSpan" style="color:white; font-size:12px;"></span>
                <div id="frameGraph" style="width:80px;height:35px;margin-top:5px;background-color:#000000;"></div>        
        `);
        //this.Hide(0);
        this.SetPause(false);
        this.mFrameSpan = CDOM.ID("frameSpan") as HTMLSpanElement;
        this.mGraphDiv = CDOM.ID("frameGraph") as HTMLDivElement;
        this.mFrameSpan.innerText = "FPS";
        this.mGraphDiv.innerHTML = "";
        for(let i = 0; i < this.mMaxLog; i++) {
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

    public override Update(_update : CUpdate) : void
    {
        this.mFrameTime += _update.DeltaTime();
        this.mFrame++;
        if(this.mFrameTime > 1) {
            this.AddLog(this.mFrame);
            this.UpdateFrameDiv();

            this.mFrameTime -= 1;
            this.mFrame = 0;
        }
    }

    private AddLog(_frame : number) {
        this.mFrameLog.push(_frame);
        if(this.mFrameLog.length > this.mMaxLog) {
            this.mFrameLog.splice(0, 1);
        }
    }

    private UpdateFrameDiv() {
        let min = Math.min(...this.mFrameLog);
        let max = Math.max(...this.mFrameLog);

        this.mFrameSpan.innerText = "FPS : " + this.mFrame + "\n(" + min + "-" + max + ")";
        for(let i = 0; i < this.mFrameLog.length; i++) {
            let bar = this.mGraphDiv.children.item(this.mMaxLog - this.mFrameLog.length + i) as HTMLDivElement;
            bar.style.height = (max == 0? 0 : Math.floor(35 * (this.mFrameLog[i] / max))) + "px";
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
                if(info.ext=="ts")    
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
                else if(info.ext=="js")    CUtilWeb.MonacoEditer(CDOM.ID(id+"_body"),source,"javascript","vs-dark",event);
                else if(info.ext=="json")    CUtilWeb.MonacoEditer(CDOM.ID(id+"_body"),source,"json","vs-dark",event);
                else if(info.ext=="html")    CUtilWeb.MonacoEditer(CDOM.ID(id+"_body"),source,"html","vs-dark",event);
                else    CUtilWeb.MonacoEditer(CDOM.ID(id+"_body"),source,"plaintext","vs-dark",event);
                
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

        // 파일 확장자에 따른 언어 타입 자동 설정
        let languageType  = "plaintext";
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
                case 'html':case 'htm':
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

        // Monaco Editor 초기화
        CUtilWeb.MonacoEditer(CDOM.ID(id), _source, languageType as any, "vs-dark",async (monacoEditer)=>{
            this.mEditor=monacoEditer;
        },this.mGithub);
    }
    GetSource()
    {
        return this.mEditor.getModel().getValue();
    }
    async SetSource(_source,)
    {
        //if(_language=="typescript")
		_source=await CUtilWeb.TSImport(_source,true,this.mGithub);
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
 * CSV / Excel(.xlsx) 파일을 시트 형태로 보여주는 모달
 * - CSV  : 단일 테이블로 렌더링
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
    mSheetNames: string[] = [];

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
            if (info.ext === 'csv')
                this.RenderCSV(body, buf);
            else if (info.ext === 'xlsx' || info.ext === 'xls')
                this.RenderXLSX(body, buf);
            else
                body.innerHTML = `<div class="alert alert-secondary m-3">지원하지 않는 파일 형식입니다: .${info.ext}</div>`;
        };

        LoadFile(this.mFiles[0]);

        CDOM.ID(`${id}_load`)?.addEventListener('click', () =>
        {
            LoadFile(CDOM.IDValue(`${id}_select`));
        });

        CDOM.ID(`${id}_save`)?.addEventListener('click', () =>
        {
            if (!this.mCurrentFile) return;
            const body = CDOM.ID(`${id}_body`);
            const info = CString.ExtCut(this.mCurrentFile);

            if (info.ext === 'csv')
            {
                const table = body.querySelector('table') as HTMLElement;
                const rows = this.ReadTableDOM(table);
                const csvStr = this.SerializeCSV(rows);
                const base64 = btoa(unescape(encodeURIComponent(csvStr)));
                this.mSaveEvent.Call(this.mCurrentFile, base64);
            }
            else if (info.ext === 'xlsx' || info.ext === 'xls')
            {
                const XLSX = (window as any)['XLSX'];
                if (!XLSX) return;
                const uid = this.Key();
                const wb = XLSX.utils.book_new();
                this.mSheetNames.forEach((name, i) =>
                {
                    const pane = CDOM.ID(`${uid}_pane_${i}`);
                    const table = pane?.querySelector('table') as HTMLElement;
                    const rows = this.ReadTableDOM(table);
                    const ws = XLSX.utils.aoa_to_sheet(rows);
                    XLSX.utils.book_append_sheet(wb, ws, name);
                });
                const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
                this.mSaveEvent.Call(this.mCurrentFile, base64);
            }
        });
    }

    private RenderCSV(container: HTMLElement, buf: ArrayBufferLike): void
    {
        const str = CUtil.ArrayToString(buf as any);
        const lines = str.split(/\r?\n/).filter(l => l.trim());
        if (lines.length === 0)
        {
            container.innerHTML = `<div class="p-3 text-muted">데이터가 없습니다.</div>`;
            return;
        }
        const rows = lines.map(l => this.ParseCSVLine(l));
        container.innerHTML = `<div class="overflow-auto h-100">${this.BuildTable(rows)}</div>`;
        this.AttachEditMode(container);
    }

    private RenderXLSX(container: HTMLElement, buf: ArrayBufferLike): void
    {
        const XLSX = (window as any)['XLSX'];
        if (!XLSX)
        {
            container.innerHTML = `<div class="alert alert-danger m-3">
                xlsx 라이브러리가 로드되지 않았습니다.<br>
                <small>HTML에 xlsx.mini.min.js 스크립트를 추가해주세요.</small>
            </div>`;
            return;
        }

        const wb = XLSX.read(new Uint8Array(buf as ArrayBuffer), { type: 'array' });
        const sheetNames: string[] = wb.SheetNames;
        if (sheetNames.length === 0)
        {
            container.innerHTML = `<div class="p-3 text-muted">시트가 없습니다.</div>`;
            return;
        }

        this.mSheetNames = sheetNames;
        const uid = this.Key();

        const tabsHtml = sheetNames.map((name, i) =>
            `<li class="nav-item" role="presentation">
                <button class="nav-link${i === 0 ? ' active' : ''}"
                    id="${uid}_tab_${i}" type="button" role="tab"
                    data-sheet-idx="${i}">
                    ${this.EscapeHtml(name)}
                </button>
            </li>`
        ).join('');

        const pagesHtml = sheetNames.map((name, i) =>
        {
            const sheet = wb.Sheets[name];
            const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
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

        container.querySelectorAll<HTMLElement>('.nav-link[data-sheet-idx]').forEach(btn =>
        {
            btn.addEventListener('click', () =>
            {
                const idx = parseInt(btn.dataset.sheetIdx);
                container.querySelectorAll('.nav-link[data-sheet-idx]').forEach(b => b.classList.remove('active'));
                container.querySelectorAll<HTMLElement>(`[id^="${uid}_pane_"]`).forEach(p =>
                {
                    p.classList.remove('show', 'active');
                });
                btn.classList.add('active');
                const pane = CDOM.ID(`${uid}_pane_${idx}`);
                if (pane) pane.classList.add('show', 'active');
            });
        });
        this.AttachEditMode(container);
    }

    /** DOM 테이블 → 2D 배열 (헤더 포함) */
    private ReadTableDOM(table: HTMLElement): string[][]
    {
        const rows: string[][] = [];
        table?.querySelectorAll('tr').forEach(tr =>
        {
            const row: string[] = [];
            tr.querySelectorAll('th, td').forEach(cell => row.push(cell.textContent ?? ''));
            rows.push(row);
        });

        // 각 행의 뒤쪽 빈 셀 제거
        const trimmedRows = rows.map(row =>
        {
            let last = row.length - 1;
            while (last >= 0 && row[last].trim() === '') last--;
            return row.slice(0, last + 1);
        });

        // 뒤쪽 빈 행 제거
        let lastRow = trimmedRows.length - 1;
        while (lastRow >= 0 && trimmedRows[lastRow].every(c => c.trim() === '')) lastRow--;
        return trimmedRows.slice(0, lastRow + 1);
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

    /** rows[0] = 헤더, rows[1..] = 데이터 */
    private BuildTable(rows: any[][]): string
    {
        if (!rows || rows.length === 0)
            return `<div class="p-3 text-muted">데이터가 없습니다.</div>`;

        const EXTRA_COLS = 5;
        const EXTRA_ROWS = 10;
        const colCount = Math.max(...rows.map(r => r.length));
        const totalCols = colCount + EXTRA_COLS;

        // 각 열의 최대 문자 길이 계산
        const maxLens: number[] = new Array(colCount).fill(0);
        for (const row of rows)
            for (let c = 0; c < row.length; c++)
            {
                const len = String(row[c] ?? '').length;
                if (len > maxLens[c]) maxLens[c] = len;
            }

        // 문자 길이 → 픽셀, 빈 확장 열은 80px 고정
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
            html += `<tr>${rows[i].map((c: any) => `<td class="px-2">${this.EscapeHtml(String(c ?? ''))}</td>`).join('')}${extraTd}</tr>`;

        // 빈 확장 행
        const emptyRow = `<tr>${new Array(totalCols).fill(`<td class="px-2"></td>`).join('')}</tr>`;
        html += emptyRow.repeat(EXTRA_ROWS);

        html += `</tbody></table>`;
        return html;
    }

    /** tbody/thead 셀 더블클릭 → 인라인 편집 */
    private AttachEditMode(container: HTMLElement): void
    {
        container.addEventListener('dblclick', (e) =>
        {
            const td = (e.target as HTMLElement).closest('td, th');
            if (!td) return;

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

            const commit = () =>
            {
                if (committed) return;
                committed = true;
                td.innerHTML = this.EscapeHtml(input.value);
            };
            const cancel = () =>
            {
                if (committed) return;
                committed = true;
                td.innerHTML = this.EscapeHtml(original);
            };

            input.addEventListener('blur', commit);
            input.addEventListener('keydown', (ke) =>
            {
                if (ke.key === 'Enter')  { ke.preventDefault(); commit(); }
                if (ke.key === 'Escape') { ke.preventDefault(); cancel(); input.blur(); }
                if (ke.key === 'Tab')
                {
                    ke.preventDefault();
                    commit();
                    const cells = Array.from(td.closest('table')?.querySelectorAll('td, th') ?? []);
                    const next = cells[cells.indexOf(td as HTMLElement) + (ke.shiftKey ? -1 : 1)] as HTMLElement;
                    if (next) next.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                }
            });
        });
    }

    private EscapeHtml(str: string): string
    {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
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
    private mNames: string[];
    private mPaths: string[];
    private mSaveFn: (names: string[], paths: string[]) => void;
    private mLastPlay = 0;
    private mRandomPool: string[] = [];
    private mAudio: HTMLAudioElement;
    private mNowPlayingEl: HTMLElement;
    private mListEl: HTMLElement;
    private mRandomChk: HTMLInputElement;

    constructor(names: string[], paths: string[], saveFn?: (names: string[], paths: string[]) => void)
    {
        super(null);
        this.mNames = [...names];
        this.mPaths = [...paths];
        this.mSaveFn = saveFn;

        this.SetTitle(CModal.eTitle.TextClose);
        this.SetHeader('Music');
        this.SetCloseToHide(true);
        this.SetSize(400, 600);
        this.SetBody(`<div style="padding:4px;">
            <button type="button" class="btn btn-danger btn-sm" style="margin:4px;">Delete All</button>
            ${saveFn ? `<button type="button" class="btn btn-warning btn-sm mm-save-list" style="margin:4px;">Save List</button>` : ''}
            <div class="mm-now" style="padding:6px;font-weight:bold;color:#0d6efd;"></div>
            <audio controls playsinline preload="auto" style="width:100%;"></audio>
            <div class="form-check" style="padding-left:2rem;">
                <label class="form-check-label">
                    <input class="form-check-input" type="checkbox" checked> Random Play
                </label>
            </div>
            <hr><div class="mm-list"></div>
        </div>`);
        this.Open(CModal.ePos.Center);
        this.Hide();

        this.mAudio        = this.mBody.querySelector('audio') as HTMLAudioElement;
        this.mNowPlayingEl = this.mBody.querySelector('.mm-now');
        this.mListEl       = this.mBody.querySelector('.mm-list');
        this.mRandomChk    = this.mBody.querySelector('input[type="checkbox"]') as HTMLInputElement;

        this.mBody.querySelector('.btn-danger').addEventListener('click', () => this._DeleteAll());
        if (saveFn) this.mBody.querySelector('.mm-save-list')?.addEventListener('click', () => saveFn(this.mNames, this.mPaths));

        this.mAudio.addEventListener('ended', () => this._Next());
        this.mAudio.addEventListener('pause', () => { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; });
        this.mAudio.addEventListener('play',  () => { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; });

        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play',          () => this.mAudio.play());
            navigator.mediaSession.setActionHandler('pause',         () => this.mAudio.pause());
            navigator.mediaSession.setActionHandler('nexttrack',     () => this._Next());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.Play(this.mLastPlay > 0 ? this.mLastPlay - 1 : this.mNames.length - 1));
        }

        this._RefreshList();
    }

    AddTrack(name: string, path: string): boolean
    {
        for (const p of this.mPaths) if (p === path) return false;
        this.mNames.push(name);
        this.mPaths.push(path);
        this._Persist();
        return true;
    }

    Play(index: number): void
    {
        if (this.mPaths.length === 0) return;
        const items = this.mListEl.querySelectorAll('li');
        items[this.mLastPlay]?.classList.remove('list-group-item-dark');
        this.mLastPlay = index;
        items[index]?.classList.add('list-group-item-dark');

        if ('audioSession' in navigator) (navigator as any).audioSession.type = 'playback';
        this.mAudio.src = this.mPaths[index];
        this.mAudio.play()
            .then(() => {
                this.mNowPlayingEl.textContent = '♫ ' + this.mNames[index];
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: this.mNames[index],
                        artwork: [{ src: '512x512.png', sizes: '512x512', type: 'image/png' }]
                    });
                    navigator.mediaSession.playbackState = 'playing';
                    if ('setPositionState' in navigator.mediaSession) {
                        try { navigator.mediaSession.setPositionState({ duration: this.mAudio.duration, playbackRate: this.mAudio.playbackRate, position: this.mAudio.currentTime }); } catch(e) {}
                    }
                }
            })
            .catch(e => console.warn('CModalMusic.Play:', e));
    }

    SetList(names: string[], paths: string[]): void
    {
        this.mRandomPool = [];
        this.mNames = [...names];
        this.mPaths = [...paths];
        this.mLastPlay = 0;
        this.mAudio.pause();
        this.mNowPlayingEl.textContent = '';
        this._Persist();
    }

    get Names(): string[] { return [...this.mNames]; }
    get Paths(): string[] { return [...this.mPaths]; }

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

    private _DeleteTrack(index: number): void
    {
        this.mNames.splice(index, 1);
        this.mPaths.splice(index, 1);
        this.mAudio.pause();
        if (index < this.mLastPlay)       this.mLastPlay--;
        else if (index === this.mLastPlay) { this.mLastPlay = 0; this.mNowPlayingEl.textContent = ''; }
        this._Persist();
    }

    private _DeleteAll(): void
    {
        this.mRandomPool = [];
        this.mNames = [];
        this.mPaths = [];
        this.mAudio.pause();
        this.mNowPlayingEl.textContent = '';
        this.mLastPlay = 0;
        this._Persist();
    }

    private _Persist(): void
    {
        this.mSaveFn?.(this.mNames, this.mPaths);
        this._RefreshList();
    }

    private _RefreshList(): void
    {
        this.mRandomPool = [];
        let html = '';
        for (let i = 0; i < this.mPaths.length; i++) {
            html += `<ul class="list-group">` +
                    `<li class="list-group-item list-group-item-action" data-idx="${i}">` +
                    `<i class="bi bi-file-music"></i> <font color="red">${this.mNames[i]}</font>` +
                    `<i class="bi bi-file-earmark-x float-right" data-del="${i}"></i>` +
                    `</li></ul>`;
        }
        this.mListEl.innerHTML = html;
        this.mListEl.querySelectorAll('li').forEach((li, i) => {
            li.addEventListener('click', (e) => {
                const del = (e.target as HTMLElement).closest('[data-del]');
                if (del) this._DeleteTrack(parseInt((del as HTMLElement).dataset.del));
                else     this.Play(i);
            });
        });
        this.mListEl.querySelectorAll('li')[this.mLastPlay]?.classList.add('list-group-item-dark');
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
    constructor(_auth?: CAuthInfo, _dbType?: "mysql" | "mssql" | "sqlite" | "ne", _database?: string, _serverUrl?: string, _token?: string) {
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
                    </select>
                </div>
                <div class="mb-2">
                    <label class="form-label small text-secondary mb-1">Connection location (database / file·folder path)</label>
                    <input id="${id}_conn_database" type="text" class="form-control form-control-sm">
                </div>
                <hr>
                <div class="small text-secondary mb-2">Auth info (mysql/mssql only)</div>
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
            const dbType = (CDOM.ID(`${id}_conn_dbType`) as HTMLSelectElement).value as "mysql" | "mssql" | "sqlite" | "ne";
            const database = (CDOM.ID(`${id}_conn_database`) as HTMLInputElement).value.trim();
            if (!database) { alert('Please enter a connection location.'); return; }

            this.mDbType = dbType;
            this.mDatabase = database;
            this.mAuth.mID = (CDOM.ID(`${id}_conn_id`) as HTMLInputElement).value;
            this.mAuth.mPW = (CDOM.ID(`${id}_conn_pw`) as HTMLInputElement).value;
            this.mAuth.mAddres = (CDOM.ID(`${id}_conn_addres`) as HTMLInputElement).value;
            this.mAuth.mPort = (CDOM.ID(`${id}_conn_port`) as HTMLInputElement).value;

            this.SetHeader(`ORM Viewer - ${this.mDatabase}`);
            this.SetBody(this.RenderViewerLayout());
            this.WireViewer();
        });
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
        // table-layout:fixed로 컬럼 폭을 고정하고, 액션 컬럼만 별도 폭을 줘서 버튼이 두 줄로
        // 안 깨지게 한다. 나머지 데이터 컬럼은 넘치는 내용을 옆으로 늘리지 않고 줄바꿈되게 처리.
        const ACTION_COL_WIDTH = 64;
        const colgroupHtml = `<colgroup>${cols.map(() => '<col>').join('')}<col style="width:${ACTION_COL_WIDTH}px"></colgroup>`;
        const wrapStyle = 'overflow-wrap:break-word;word-break:break-all;white-space:normal;';
        const headerHtml = cols.map(c => {
            const arrow = c === this.mSortCol ? (this.mSortAsc ? ' ↑' : ' ↓') : '';
            return `<th class="px-2" data-col="${this.EscapeHtmlORM(c)}" style="${wrapStyle}cursor:pointer;user-select:none;">${this.EscapeHtmlORM(c)}${arrow}</th>`;
        }).join('');
        let html = `<table class="table table-sm table-bordered table-hover table-striped mb-0" style="font-size:0.85em;table-layout:fixed;width:100%;">
            ${colgroupHtml}
            <thead class="table-dark sticky-top"><tr>${headerHtml}<th class="px-2"></th></tr></thead>
            <tbody>`;
        rows.forEach((row, i) => {
            html += `<tr>${cols.map(c => `<td class="px-2 orm-cell" data-idx="${i}" data-col="${this.EscapeHtmlORM(c)}" style="${wrapStyle}cursor:pointer;">${this.EscapeHtmlORM(String((row as any)[c] ?? ''))}</td>`).join('')}` +
                `<td class="px-2 text-nowrap"><button class="btn btn-sm btn-outline-danger orm-del-btn" data-idx="${i}">Delete</button></td></tr>`;
        });
        // 마지막 행: 빈 입력칸 + "추가" 버튼으로 새 레코드를 바로 입력할 수 있게 한다.
        html += `<tr class="orm-add-row">${cols.map(c => `<td class="px-2"><input type="text" class="form-control form-control-sm" data-newfield="${this.EscapeHtmlORM(c)}"></td>`).join('')}` +
            `<td class="px-2 text-nowrap"><button class="btn btn-sm btn-outline-success orm-add-btn">Add</button></td></tr>`;
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
            td.addEventListener('click', () => this.BeginEditCell(td));
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

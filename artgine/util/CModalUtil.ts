
import { CSubject } from "../app/subject/CSubject.js";
import { CUpdate } from "../basic/Basic.js";
import { Bootstrap } from "../basic/Bootstrap.js";
import { CBlackBoard } from "../basic/CBlackBoard.js";
import {CDOM} from "../basic/CDOM.js";
import {CEvent} from "../basic/CEvent.js";
import {CJSON} from "../basic/CJSON.js";
import {CModal} from "../basic/CModal.js";
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
                //divider.className = "position-absolute bg-secondary";
                divider.style.cursor = this.m_horizontal ? "ew-resize" : "ns-resize";
                divider.style.pointerEvents = "auto";
                
                if (this.m_horizontal) {
                    divider.style.right = "-2px";
                    divider.style.top = "0";
                    divider.style.width = "2px";
                    divider.style.height = "100%";
                } else {
                    divider.style.bottom = "-2px";
                    divider.style.left = "0";
                    divider.style.width = "100%";
                    divider.style.height = "2px";
                }
                
                this.mBody.appendChild(divider);
                dividerList.push(divider);
                //this.AttachResizeHandler(div, this.m_flex[i + 1], divider);
            }
        }
        for (let i = 0; i < this.m_flex.length-1; i++) 
        {
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
            if (!isDragging) return;
            let delta = (this.m_horizontal ? e.clientX : e.clientY) - startPos;
            let newSizeA = startSizeA + delta;
            let newSizeB = startSizeB - delta;
            
            if (newSizeA < 50 || newSizeB < 50) return;
            if(this.m_horizontal)
            {
                divA.style.flex = `0 0 ${newSizeA}px`;
                divB.style.flex = `0 0 ${newSizeB}px`;
                //divA.style.width = `${newSizeA}px`;
                //divB.style.width = `${newSizeB}px`;
            }
            else
            {
                divA.style.flex = `0 0 ${newSizeA}px`;
                divB.style.flex = `0 0 ${newSizeB}px`;
                //divA.style.height = `${newSizeA}px`;
                //divB.style.height = `${newSizeB}px`;
            }
            
        };
        
        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
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

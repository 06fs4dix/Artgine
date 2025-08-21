
import { Bootstrap } from "../basic/Bootstrap.js";
import { CBlackBoard } from "../basic/CBlackBoard.js";
import {CDomFactory} from "../basic/CDOMFactory.js";
import {CEvent} from "../basic/CEvent.js";
import {CJSON} from "../basic/CJSON.js";
import {CModal} from "../basic/CModal.js";
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
            CUtil.ID(_id+"_div").append(CDomFactory.DataToDom(`<h2 class="text-white fw-bold">Loading...</h2>`));
        else
            CUtil.ID(_id+"_div").append(_context);

        // 요소 참조 저장
        this.mProgressBar = CUtil.ID(this.Key() + "_progress");
        this.mRemainingText = CUtil.ID(this.Key() + "_remaining");

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

    public Close(): void
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
        

        CUtil.ID(this.Key()+"_jbox").onclick=()=>{
            this.mModal.Show();
        };
        //this.m_jbox.open();
    }
   
    SetContent(_data : CJSON|string|object)
    {
        CUtil.ID(this.Key()+"_div").innerHTML="";
        CUtil.ID(this.Key()+"_div").append(CDomFactory.DataToDom(_data));
    }
    SetTitleText(_name : string)
    {
        CUtil.ID(this.Key()+"_jboxTitle").innerText=_name;
        CUtil.ID(this.Key()+"_jbox").innerText=_name;
        
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
        let stage = CUtil.ID(this.mKey + "_div");
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
    Update(_delay: any): void 
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
        this.mFrameSpan = CUtil.ID("frameSpan") as HTMLSpanElement;
        this.mGraphDiv = CUtil.ID("frameGraph") as HTMLDivElement;
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

    public Update(_delay : number) : void
    {
        this.mFrameTime += _delay;
        this.mFrame++;
        if(this.mFrameTime > 1000) {
            this.AddLog(this.mFrame);
            this.UpdateFrameDiv();

            this.mFrameTime -= 1000;
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
    Open(_startPos?: number): void {
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
    Open(_startPos?: number): void 
    {

        super.Open(_startPos);
        

        let id=this.Key();

        if(this.mExeEvent.IsCall()==false)  CUtil.ID(id+"_exe").hidden=true;
        


        let event=(editer)=>{
            this.mEditer=editer;
        };
        let LoadFile=(_file)=>{
            //this.mLoadEvent.Call();
            CFile.Load(_file).then((_buf : ArrayBuffer)=>{
                let source=CUtil.ArrayToString(_buf);
                let info=CString.ExtCut(_file);
                if(info.ext=="ts")    
                {
                 

                    CUtilWeb.MonacoEditer(CUtil.ID(id+"_body"),source,"typescript","vs-dark",async (monacoEditer)=>{
                        this.mEditer=monacoEditer;
                       

                        if(monacoEditer!=null)
                        {
                            const model = monacoEditer.getModel();
                            const lastLine = model.getLineCount();

                           
                            monacoEditer.revealLineInCenter(lastLine);
                        }
                    },this.mGitHub);
                    
                    
                    


                    
                }
                else if(info.ext=="js")    CUtilWeb.MonacoEditer(CUtil.ID(id+"_body"),source,"javascript","vs-dark",event);
                else if(info.ext=="json")    CUtilWeb.MonacoEditer(CUtil.ID(id+"_body"),source,"json","vs-dark",event);
                else if(info.ext=="html")    CUtilWeb.MonacoEditer(CUtil.ID(id+"_body"),source,"html","vs-dark",event);
                else    CUtilWeb.MonacoEditer(CUtil.ID(id+"_body"),source,"plaintext","vs-dark",event);
                
            });
        };
        LoadFile(this.mFile[0]);
        const loadBtn = CUtil.ID(`${id}_load`);
        const exeBtn = CUtil.ID(`${id}_exe`);
        loadBtn?.addEventListener("click", async () => {
            LoadFile(CUtil.IDValue(`${id}_select`));
        });

        exeBtn?.addEventListener("click", () => {
           let newBufStr=this.mEditer.getModel().getValue();
           this.mExeEvent.Call(CUtil.IDValue(`${id}_select`),newBufStr);
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
    
    Open(_startPos = CModal.ePos.Random) {
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
    FullSwitch(_enable : boolean=null)
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
        _blackboard: Array<string>,
        _img: Array<string> = [],
        LeftTopRightBottom: Array<CVec4> = []
    ) {
        super();

        this.SetHeader("블랙보드 리스트");
        this.SetTitle(CModal.eTitle.TextClose);
        this.SetZIndex(CModal.eSort.Manual, CModal.eSort.Auto + 1);
        this.SetSize(600, 400);

        const container = document.createElement("div");
        container.className = "d-flex flex-wrap justify-content-start p-2";

        _blackboard.forEach((key, i) => {
            const imgPath = _img[i];
            const tex = LeftTopRightBottom[i];

            const box = document.createElement("div");
            box.className = "position-relative m-1 border rounded";
            box.style.width = "64px";
            box.style.height = "64px";
            box.style.cursor = "grab";
            box.style.overflow = "hidden";

            box.setAttribute("draggable", "true");
            box.addEventListener("dragstart", (event) => {
                event.dataTransfer.setData('text', key);
                CObject.SetDrag("CObject", CBlackBoard.Find(key));
            });

            if (imgPath && tex instanceof CVec4) {
                const img = new Image();
                img.src = imgPath;
                img.onload = () => {
                    const cutW = tex.z - tex.x;
                    const cutH = tex.w - tex.y;

                    const scaleX = 64 / cutW;
                    const scaleY = 64 / cutH;

                    const clipper = document.createElement("div");
                    clipper.style.position = "relative";
                    clipper.style.width = "64px";
                    clipper.style.height = "64px";
                    clipper.style.overflow = "hidden";

                    img.style.position = "absolute";
                    img.style.left = `-${tex.x * scaleX}px`;
                    img.style.top = `-${tex.y * scaleY}px`;
                    img.style.width = `${img.width * scaleX}px`;
                    img.style.height = `${img.height * scaleY}px`;
                    img.style.pointerEvents = "none";
                    img.draggable = false;

                    clipper.appendChild(img);
                    box.appendChild(clipper);

                    const label = document.createElement("div");
                    label.className = "position-absolute top-50 start-50 translate-middle text-white text-center fw-bold";
                    label.style.textShadow = `
                        -1px -1px 2px black,
                        1px -1px 2px black,
                        -1px 1px 2px black,
                        1px 1px 2px black`;
                    label.innerText = key;
                    label.draggable = false;

                    box.appendChild(label);
                };
            } else {
                box.classList.add("bg-secondary", "text-white", "d-flex", "align-items-center", "justify-content-center");
                box.style.fontWeight = "bold";
                box.innerText = key;
            }

            container.appendChild(box);
        });

        this.SetBody(container);
        this.Open();
    }
}


export class CMonacoViewer extends CModal {

    private mEditor: any = null;

    constructor(_source: string, _fileName : string )
    {
        super();
        this.SetHeader("CCodeViewer");
        this.SetTitle(CModal.eTitle.TextClose);
        this.SetZIndex(CModal.eSort.Manual, CModal.eSort.Auto + 1);
        this.SetSize(800, 600);

        


        // JSON 데이터를 문자열로 변환
        //const jsonString = typeof _jsonData === 'string' ? _jsonData : JSON.stringify(_jsonData, null, 2);
        
        // Monaco Editor를 위한 컨테이너 생성
        const container = document.createElement("div");
        container.id = "modal_editor";
        container.style.width = "100%";
        container.style.height = "500px";
        container.style.border = "1px solid #ccc";

        this.SetBody(container);
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
        CUtilWeb.MonacoEditer(CUtil.ID("modal_editor"), _source, languageType as any, "vs-dark");
    }

    
}
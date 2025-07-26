
import { Bootstrap } from "../basic/Bootstrap.js";
import {CDomFactory} from "../basic/CDOMFactory.js";
import {CEvent} from "../basic/CEvent.js";
import {CJSON} from "../basic/CJSON.js";
import {CModal} from "../basic/CModal.js";
import { CPath } from "../basic/CPath.js";
import { CString } from "../basic/CString.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";

import {CVec2} from "../geometry/CVec2.js";
import { CShaderInterpret, ExtractImportPaths, GetImportFile } from "../render/CShaderInterpret.js";
import { CFile } from "../system/CFile.js";
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
export class CBGAttachButton extends CModalBackGround
{

    mModal : CModal;
    mSize : CVec2;
    constructor(_id : string,_layer : number=100,_size=new CVec2(600,800))
    {
        super();
        this.SetBody(`<div class='d-flex justify-content-end' style='margin-top:5px;margin-right:10px;'>
                <button type='button' class='btn btn-success' style='pointer-events:auto;' id='${_id}_jbox'>Button</button>
            </div>`);
        

        this.mSize=_size;
        this.mKey=_id;

        this.mModal=new CModal("CHtmlModal");
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

export class CSourceViewer extends CModal 
{
    mEditer=null;
    mExeEvent : CEvent;
    mLoadEvent : CEvent;
    mFile : string[];
    constructor(_file : string[],_exeEvent: ((...args: any[]) => any) | CEvent<(...args: any[]) => any>=null,_loadEvent: ((...args: any[]) => any) | CEvent<(...args: any[]) => any>=null)
    {
        super();
        this.mFile=_file;
        this.mExeEvent=CEvent.ToCEvent(_exeEvent);
        this.mLoadEvent=CEvent.ToCEvent(_loadEvent);
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

        this.SetBody("<div id='"+id+"_body' class='h-100' style='min-height:640px;'></div>");
      
        
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
            this.mLoadEvent.Call();
            CFile.Load(_file).then((_buf : ArrayBuffer)=>{
                let source=CUtil.ArrayToString(_buf);
                let info=CString.ExtCut(_file);
                if(info.ext=="ts")    
                {
                    let eArr=ExtractImportPaths(source,false);
                    let full=CPath.FullPath();
                    let resolvedPaths: string[] = [];
                    for (let i = 0; i < eArr.length; ++i) {
                        const rel = eArr[i]; // 예: "../../../artgine/z_file/Shader"

                        // 기준 경로에서 현재 파일 이름 제거
                        let base = full.replace(/\\/g, "/").replace(/\/[^\/]*$/, "/"); // "Artgine/proj/Tutorial/ShaderEditer/"

                        // 상대 경로 처리
                        const parts = base.split("/").filter(p => p.length > 0);
                        const relParts = rel.split("/");

                        for (const part of relParts) 
                        {
                            if (part === "..") {
                                parts.pop(); // 상위 폴더로
                            } else if (part !== ".") {
                                parts.push(part); // 하위 경로 추가
                            }
                        }

                        let absPath = parts.join("/");
                        absPath=CString.ReplaceAll(absPath,"http:/","http://");
                        absPath=CString.ReplaceAll(absPath,"file:/","file://");
                        
                        if(absPath.indexOf(".js")!=-1)
                        {
                            absPath=absPath.substring(0,absPath.length-3);
                            //absPath+=".ts";
                        }
                        

                        resolvedPaths.push(absPath); // 예: "Artgine/artgine/z_file/Shader"
                        

                        source = source.replace(new RegExp(rel, 'g'), absPath);
                    }

                    CUtilWeb.MonacoEditer(CUtil.ID(id+"_body"),source,"typescript","vs-dark",async (monacoEditer)=>{
                        this.mEditer=monacoEditer;
                        
                        for (let i = 0; i < resolvedPaths.length; ++i) 
                        {
                            let fName=resolvedPaths[i];
                            if(fName.indexOf(".js")==-1)
                                fName+=".ts";
                            let buf=await CFile.Load(fName);
                            window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(
                                CUtil.ArrayToString(buf),
                                fName
                            );
                            // fName=resolvedPaths[i];
                            // if(fName.indexOf(".js")!=-1)
                            // {
                            //     fName+=fName.substring(0,fName.length-3);
                            //     fName+=".ts";
                            // }
                            // buf=await CFile.Load(fName);
                            // window["monaco"].languages.typescript.typescriptDefaults.addExtraLib(
                            //     CUtil.ArrayToString(buf),
                            //     fName
                            // );
                        }

                        if(monacoEditer!=null)
                        {
                            const model = monacoEditer.getModel();
                            const lastLine = model.getLineCount();

                           
                            monacoEditer.revealLineInCenter(lastLine);
                        }
                    });
                    
                    
                    


                    
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

class CUnitInfo
{
    mBlackBoardKey="";
    mImg="";
}
export class CUnitModal extends CModal 
{
    constructor()
    {
        super();
    }
}
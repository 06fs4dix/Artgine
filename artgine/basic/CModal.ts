import {  IAutoUpdate,  IListener } from "./Basic.js";
import { Bootstrap } from "./Bootstrap.js";
import { CClass } from "./CClass.js";
import {CDomFactory} from "./CDOMFactory.js";
import {CEvent} from "./CEvent.js";
import {CJSON} from "./CJSON.js";
import { CString } from "./CString.js";

export class CDrop
{
	// static eType={
	// 	File:0,
	// 	CObject:1,
	// 	Hash:2,
	// };
	mFiles :FileList;
    mPaths : Array<string>;
	mObject : any;
    mX;
    mY;
}

export class CModalTitleBar
{
    
    constructor(_parent : string,_key : string,_event: ((...args: any[]) => any) | CEvent<(...args: any[]) => any>=null)
    {
        this.mParent=_parent;
        this.mKey=_key;
        this.mEvent=CEvent.ToCEvent(_event);
       
    }
    mParent="";
    mKey="";
    mEvent : CEvent;
}
var gIndex=-1;
export class CModal implements IAutoUpdate , IListener
{
   
    static FindModal(_key) : CModal
    {
        return null;
    }
    static GetModalList() : Array<CModal>
    {
        return null;
    }
    static Index(){ return gIndex;  };
    
    mResizeObserver : ResizeObserver;
    mKey="";
    mSort=CModal.eSort.Auto;
    mZIndex=1000;

    private mCloseToHide=false;
    mOT=null;
    mOL=null;
    mOW=0;
    mOH=0;
    mCard : HTMLDivElement=null;
    mHeader : HTMLDivElement=null;
    mBody : HTMLDivElement=null;
    mFooter : HTMLElement=null;
    mOverlayDiv : HTMLDivElement=null;
    mBodyClose=false;

    mTitle=CModal.eTitle.TextFullClose;
    //타이틀이 있어야 드래그 가능
    mDrag=true;
    mLimitPush=false;
    mFull=false;
    mResize=true;
    mOverlay : boolean = false;

    mHeaderData=null;
    mBodyData=null;
    mFooterData=null;
    mBG:string=null;
    mWindow : WindowProxy=null;

    mEventMap=new Map<string,CEvent>();
    mShow=true;
    mDebugMode=null;
    mPause=true;

    constructor(_key : string=null)
    {
        //super();   
        this.mKey=_key;
        if(this.mKey==null)
        {
            this.mTitle=CModal.eTitle.None;
            this.mResize=false;
            this.mLimitPush=true;
        }
            
        
        this.mZIndex=gIndex;
        gIndex-=1;
    }

    Get<T>(_member: string | string[], _default?: T): T | undefined {
        let t: any = this;
        const path = Array.isArray(_member) ? _member : _member.split(".");

        for (let key of path) {
            if (key.includes("(")) {
                const fun = CString.FunctionAnalyze(key);
                if (t?.[fun.function] != null) {
                    t = CClass.Call(t, fun.function, fun.parameter);
                    if (Array.isArray(t) && t.length === 1) t = t[0];
                } else {
                    t = null;
                }
            } else if (key.includes("[")) {
                const index = Number(key.substring(key.indexOf("[") + 1, key.length - 1));
                t = t?.[index];
            } else {
                t = t?.[key];
            }
            if (t == null) break;
        }

        return t == null ? _default : (t as T);
    }
    Set(_member: Array<string> | string, _value: any) 
    {
        var t=this;
        if(_member instanceof Array)
        {
            if(_member.length==0)	return this;
            
        }
        else
        {
            _member=_member.split(".");
        }

        for(var i=0;i<_member.length-1;++i)
        {
            if(_member[i].indexOf("(")!=-1)
            {
                var fun=CString.FunctionAnalyze(_member[i]);
                if(t[fun.function]!=null)
                {
                    t=CClass.Call(t,fun.function,fun.parameter);
                    if(t instanceof Array && t.length==1)	t=t[0];
                }
            }
            else if(_member[i].indexOf("[")!=-1)
            {
                let off=_member[i].indexOf("[");
                let index=Number(_member[i].substring(off+1,_member[i].length-1));
                
                t=t[index];
            }
            else
                t=t[_member[i]];
            if(t==null)	break;
        }
        if(_member[_member.length-1].indexOf("[")!=-1)
        {
            let off=_member[i].indexOf("[");
            let index=Number(_member[i].substring(off+1,_member[i].length-1));
            
            t[index]=_value;
        }
        else
        {
            t[_member[_member.length-1]]=_value;
        }
        
        return this;
    }
    Call(_function: string, _para: Array<any>) 
    {
        CClass.Call(this,_function,_para);
    }
    static Get<T>(_member: string | string[], _default?: T): T | undefined {
        let t: any = this;
        const path = Array.isArray(_member) ? _member : _member.split(".");

        for (let key of path) {
            if (key.includes("(")) {
                const fun = CString.FunctionAnalyze(key);
                if (t?.[fun.function] != null) {
                    t = CClass.Call(t, fun.function, fun.parameter);
                    if (Array.isArray(t) && t.length === 1) t = t[0];
                } else {
                    t = null;
                }
            } else if (key.includes("[")) {
                const index = Number(key.substring(key.indexOf("[") + 1, key.length - 1));
                t = t?.[index];
            } else {
                t = t?.[key];
            }
            if (t == null) break;
        }

        return t == null ? _default : (t as T);
    }
 
    On(_key: CEvent.eType, _event : ((...args: any[]) => any) | CEvent<(...args: any[]) => any>, _target: any=null) 
    {
        this.mEventMap.set(_key,CEvent.ToCEvent(_event));
    }

    Off(_key: CEvent.eType, _target: any) {
        
    }
    GetEvent(_key: CEvent.eType, _target: any=null) {
        return this.mEventMap.get(_key);
    }
    IsShow()
    {
        return this.mShow;
    }
    SetCloseToHide(_enable)
    {
        this.mCloseToHide=_enable;
    }
    


    IsPause(): boolean {
        return this.mPause;
    }
    Update(_delay){}
    Key()   {   
        if(this.mKey==null)
            this.mKey=CUniqueID.Get();
        return this.mKey;  
    }
    SetPause(_enable)
    {
        this.mPause=_enable;
    }
    SetBG(_bg : keyof typeof Bootstrap.eColor | typeof Bootstrap.eColor[keyof typeof Bootstrap.eColor])
    {
        this.mBG = _bg;
    }
    SetBodyClose(_enable)
    {
        this.mBodyClose=_enable;
    }
    SetResize(_enable)
    {
        this.mResize=_enable;
    }
    SetBody(_data : HTMLElement|string|object|CJSON)
    {
        if(this.mBody==null)
        {
            this.mBodyData=_data;
        }
        else
        {
            this.mBody.innerHTML="";
            this.mBody.append(CDomFactory.DataToDom(_data));
        }
    }
    SetFooter(_data : HTMLElement|string|object|CJSON)
    {
        if(this.mFooter==null)
        {
            this.mFooterData=_data;
        }
        else
        {
            this.mFooter.innerHTML="";
            this.mFooter.append(CDomFactory.DataToDom(_data));
        }
    }
    SetHeader(_html:string|HTMLElement)
    {
        if(this.mHeader==null)
        {
            this.mHeaderData=_html;
        }
        else
        {
            if(typeof _html=="string")
                this.mHeader.innerHTML=_html;
            else
            {
                this.mHeader.innerHTML="";
                this.mHeader.append(_html);

            }
        }
    }
    
    SetZIndex(_sort : CModal.eSort,_index=1000)
    {
        this.mSort=_sort;
        switch(_sort)
        {
            case CModal.eSort.Manual:
                this.mZIndex=_index;
                break;
            case CModal.eSort.Auto:
                this.mZIndex=this.mZIndex;
                break;
            case CModal.eSort.Top:
                this.mZIndex=CModal.eSort.Top;
                break;
        }
            
        
    }
    FullSwitch(_enable : boolean=null)
    {
        

        
        
    }
    SetOverlay(_overlay : boolean)
    {
        this.mOverlay = _overlay;
    }
    SetSize(_width,_height)
    {
        if (typeof _width === "string" && _width.endsWith("%")) {
            const percent = parseFloat(_width) / 100;
            _width = window.innerWidth * percent;
        }
    
        if (typeof _height === "string" && _height.endsWith("%")) {
            const percent = parseFloat(_height) / 100;
            _height = window.innerHeight * percent;
        }



        this.mOW=_width;
        this.mOH=_height;

        if(this.mCard != null) {
            this.mCard.style.width=this.mOW+"px";
            this.mCard.style.maxWidth=this.mOW+"px";
            this.mCard.style.height=this.mOH+"px";
            this.mCard.style.maxHeight=this.mOH+"px";

            if(this.mLimitPush)
                this.LimitPushChk();
        }
    }
    GetBody()  {   return this.mBody; }
    GetHeader()  {   return this.mHeader; }
    SetTitle(_type : CModal.eTitle)
    {
        this.mTitle=_type;
    }
    Close(_delayTime=0)
    {
        
    }
    Hide(_animationTime : number = 300) {
        this.mShow=false;
        if(this.mOverlayDiv!=null) this.mOverlayDiv.style.display="none";
        if (this.mCard) {
            this.mCard.style.transition = `opacity ${_animationTime}ms ease-out, transform ${_animationTime}ms ease-out`;
            this.mCard.style.opacity = "0";
            this.mCard.style.transform = "scale(0.95)";
            if(_animationTime == 0) {
                this.mCard.style.display = "none";
            }
            else {
                setTimeout(() => {
                    this.mCard.style.display = "none";
                }, _animationTime); // 애니메이션 후 숨김
            }
        }
    }
    
    Show() {
        if(this.mShow) return;
        this.mShow=true;
        if(this.mOverlayDiv!=null) this.mOverlayDiv.style.display="";
        if (this.mCard) {
            this.mCard.style.display = "";
            //this.m_card.hidden=true;
            setTimeout(() => {
                if(this.mCard==null)    return;
                this.mCard.style.opacity = "1";
                this.mCard.style.transform = "scale(1)";
                this.mBody.style.width="100%";
                this.mBody.style.height="100%";
            }, 10); // 약간의 딜레이를 줘야 transition 적용됨
        }
    }
    Open(_startPos : CModal.ePos=CModal.ePos.Random)
    {
        
    }
    SetPosition(_x : number,_y : number);
    SetPosition(_pos : CModal.ePos);
    SetPosition(_x,_y=null)
    {
        
        
        
    }
    SetLimitPush(_push : boolean)
    {
        this.mLimitPush=_push;
    }
    LimitPushChk()
    {
        if(this.mOW==0 && this.mCard.offsetWidth!=0)
            this.mOW=this.mCard.offsetWidth+3;
        if(this.mOH==0 && this.mCard.offsetHeight!=0)
            this.mOH=this.mCard.offsetHeight;
        
        let w=window.innerWidth;
        let h=window.innerHeight;

        
        
        
        if(this.mOW>w)
        {
            this.mCard.style.width=w+"px";
            this.mCard.style.left="0px";
        }
        else
        {
            this.mCard.style.width=this.mOW+"px";

            let right=this.mCard.offsetLeft+this.mOW;
            if(w<right)
                this.mCard.style.left=(w-this.mOW)+"px";
            else if(0>this.mCard.offsetLeft)
            {
                this.mCard.style.left="0px";
            }
        }
        

        if(this.mOH>h)
        {
            this.mCard.style.height=h+"px";
            this.mCard.style.top="0px";
        }
            
        else
        {
            this.mCard.style.height=this.mOH+"px";
            let bottom=this.mCard.offsetTop+this.mOH;
            if(h<bottom)
                this.mCard.style.top=(h-this.mOH)+"px";
            else if(0>this.mCard.offsetTop)
            {
                this.mCard.style.top="0px";
    
            }
        }
            
        
        
        
            

        
            
        
        
        
            
        
    }
    Focus(_action : CModal.eAction)
    {
        
    }
    static ListShow(_div : HTMLDivElement=null)
    {
        
        
    }
    static PushTitleBar(_tb : CModalTitleBar)
    {
        
    }
}
export namespace CModal {
	 export enum eTitle {
		None = -1,
		Text=0,
        TextClose=1,
        TextFullClose=2,
        TextMinFullClose=3,
        //TextMin:4,//클로즈 버튼인데 누르면 숨기기로 처리됌
        Window=5
	}
    export enum eSort {
		Auto = 1000,
        Manual = 0,
        Top = 10000,
    }
    export enum ePos {
		Center=0,
        Stair=1,
        Random=2,
        TopLeft= 3,
        TopRight= 4,
        BottomLeft= 5,
        BottomRight= 6,
    }
    export enum eAction {
        None= 0,   // 아무 동작 없음
        Shake= 1,  // 좌우 흔들기
        FadeIn= 2, // 서서히 나타나기
        Bounce= 3, // 튕기면서 등장
        SlideUp= 4, //아래에서 위로 등장
        SlideDown= 5, //위에서 아래로 등장
    }
  
    
}

export class CConfirm extends CModal
{
    mEventList=new Array<CEvent>();
    mTextList=new Array<string>();
    mThemaList=new Array<string>();
    static List(_body,_eventList : Array<((...args: any[]) => any) | CEvent<(...args: any[]) => any>>,_text=new Array<string>())
    {

        let list=new CConfirm();
        list.SetBody(_body);
        if(_eventList.length==1)
            list.SetConfirm(CConfirm.eConfirm.OK,_eventList,_text);
        else if(_eventList.length==2)
            list.SetConfirm(CConfirm.eConfirm.YesNo,_eventList,_text);
        else 
            list.SetConfirm(CConfirm.eConfirm.List,_eventList,_text);
        list.SetZIndex(CModal.eSort.Top);
        list.Open();
        return list;
    }
   
    SetConfirm(_type : CConfirm.eConfirm,_eventList : Array<((...args: any[]) => any) | CEvent<(...args: any[]) => any>>,_text=new Array<string>())
    {
        if(_type==CConfirm.eConfirm.OK)
        {
            this.mEventList[0]=CEvent.ToCEvent(_eventList[0]);
            this.mTextList[0]=_text[0];
            if(this.mTextList[0]==null)
                this.mTextList[0]="OK";
            this.mThemaList[0]="btn btn-primary";
        }
        else if(_type==CConfirm.eConfirm.YesNo)
        {
            this.mEventList[0]=CEvent.ToCEvent(_eventList[0]);
            this.mTextList[0]=_text[0];
            if(this.mTextList[0]==null)
                this.mTextList[0]="Yes";
            this.mThemaList[0]="btn btn-primary";

            this.mEventList[1]=CEvent.ToCEvent(_eventList[1]);
            this.mTextList[1]=_text[1];
            if(this.mTextList[1]==null)
                this.mTextList[1]="No";
            this.mThemaList[1]="btn btn-danger";
        }
        else 
        {
            for(let i=0;i<_text.length;++i)
            {
                this.mEventList[i]=CEvent.ToCEvent(_eventList[i]);
                this.mTextList[i]=_text[i];
                this.mThemaList[i]="btn btn-success";
            }
        }
    }

    Open(_startPos: number = CModal.ePos.Center): void {
        this.mResize=false;
        this.mLimitPush=true;
        this.SetFooter("");
        super.Open(_startPos);

       
        // 버튼 컨테이너 생성 (부트스트랩 스타일 적용)
        // this.m_footer = document.createElement("div");
        // this.m_footer.className = "card-footer text-muted p-1"; 

        let buttonContainer = document.createElement("div");
        buttonContainer.className = "d-flex justify-content-between";


        for(let i=0;i<this.mTextList.length;++i)
        {
            let event=this.mEventList[i];
            let button = document.createElement("button");
            button.textContent = this.mTextList[i];
            button.className = this.mThemaList[i];
            if(i!=0)
                button.className+=button.className+" ms-2";

            button.onclick = () => {
                if (event)
                {
                    event.Call(this.mTextList[i]);
                }
                this.Close();
            };
            buttonContainer.appendChild(button);
            
        }

        
        this.mFooter.appendChild(buttonContainer);
        

        // 컨테이너를 모달 바디에 추가
        //this.mCard.appendChild(this.m_footer);
        this.SetPosition(CModal.ePos.Center);
    }
}
export namespace CConfirm
{
    export  enum eConfirm
    {
        OK=1,
        YesNo=2,
        List=3,
    }

    
}

import CModal_imple from "../basic_impl/CModal.js";
import { CUniqueID } from "./CUniqueID.js";
CModal_imple();

import { CUpdate } from "../../basic/Basic.js";
import { CEvent } from "../../basic/CEvent.js";
import {CJSON} from "../../basic/CJSON.js";
import { CObject, CPointer } from "../../basic/CObject.js";
import {CMat} from "../../geometry/CMat.js";
import {CMath} from "../../geometry/CMath.js";
import { CVec2 } from "../../geometry/CVec2.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CH5Canvas} from "../../render/CH5Canvas.js";
import {CInput} from "../../system/CInput.js";
import { CFrame } from "../../util/CFrame.js";
import { CPaintHTML } from "../component/paint/CPaint2D.js";
import {CSubject} from "./CSubject.js";
import {CUI,  CUIButtonRGBA, CUiHTML as CUIHTML } from "./CUI.js";



enum eStickType{
    Cross="Cross",//+
    Circle="Circle",
    Circle4="Circle4",
    Circle8="Circle8"
};
enum eButtonType{
    //Alphabet_Circle="Alphabet_Circle",
    Alphabet_Rectangle="Alphabet_Rectangle",
    //Number_Circle="Alphabet_Circle",
    Number_Rectangle="Number_Rectangle",
    HTML="HTML",
};
enum ePadType{
    None="None",
    NES="NES",
    Basic="Basic",
};
//키보드 어떤 타입되는지
enum eKeyType{
    Arrow="Arrow",//화살표만
    WASD="WASD",
    Both="Both"//둘다 가능
}
export class CPad extends CSubject
{
    
    static eStickType=eStickType;
    static eButtonType=eButtonType;
    static ePadType=ePadType;
    static eKeyType=eKeyType;
    mStick :  Array<CUI>=new Array();
    mButton : Array<CUI>=new Array();
    mButtonInput =Array<string>();
    mLockPos : CVec3=new CVec3();
    mPacketSend=false;
    // mPacketDir=new CVec3();
    // mPacketButtonInput=new Array<string>();
    // mPacketButtonDir=new Array<CVec3>();
    

    mDir : CVec3=new CVec3();
    mPadType : ePadType=CPad.ePadType.Basic;
    mStickType : eStickType=null;
    mPressOnStick=true;
    mPadScale=1;
    mKeyType : eKeyType = CPad.eKeyType.Arrow;

    
    constructor()
    {
        super();
        
        this.SetKey("pad");
        this.mPMatMul=false;
            
    }
    SetButtonImg(_off : number,_img : string=null)
    {
        let element = (this.mButton[_off].GetPt() as CPaintHTML).GetElement();
        let button = element;

        // element가 button이 아니면 자식에서 button을 찾음
        if(element.tagName !== 'BUTTON') {
            button = element.querySelector('button');
        }

        if(button) {
            if(_img == null || _img == '') {
                // 기존 버튼으로 복원 (인덱스 번호 표시)
                button.innerHTML = `${_off}`;
                button.style.backgroundImage = '';
                button.style.backgroundSize = '';
                button.style.backgroundPosition = '';
                button.style.backgroundRepeat = '';
            } else {
                // 이미지를 배경으로 설정 (더 깔끔함)
                button.innerHTML = '';
                button.style.backgroundImage = `url('${_img}')`;
                button.style.backgroundSize = '70% 70%';  // 이미지를 버튼 크기의 70%로 (여백 확보)
                button.style.backgroundPosition = 'center';
                button.style.backgroundRepeat = 'no-repeat';
            }
        }
    }
    SetButtonCoolTime(_off : number,_time : number)
    {
        if(_off >= this.mButton.length) return;

        let element = (this.mButton[_off].GetPt() as CPaintHTML).GetElement();
        let button = element;

        // element가 button이 아니면 자식에서 button을 찾음
        if(element.tagName !== 'BUTTON') {
            button = element.querySelector('button');
        }

        if(!button) return;

        // 기존 쿨타임 오버레이 제거
        const existingOverlay = button.querySelector('.cooltime-overlay');
        if(existingOverlay) {
            existingOverlay.remove();
        }

        // 쿨타임 오버레이 생성
        const overlay = document.createElement('div');
        overlay.className = 'cooltime-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            background: conic-gradient(
                rgba(0, 0, 0, 0.7) 0deg,
                rgba(0, 0, 0, 0.7) 0deg,
                transparent 0deg
            );
            z-index: 10;
        `;

        // 남은 시간 텍스트
        const timeText = document.createElement('div');
        timeText.className = 'cooltime-text';
        timeText.style.cssText = `
            color: white;
            font-weight: bold;
            font-size: 20px;
            text-shadow: 0 0 4px black;
            z-index: 11;
        `;
        overlay.appendChild(timeText);

        // button에 relative position 추가 (오버레이 위치 기준)
        if(getComputedStyle(button).position === 'static') {
            button.style.position = 'relative';
        }

        button.appendChild(overlay);

        // 버튼 비활성화
        button.style.filter = 'brightness(0.6)';
        (button as HTMLButtonElement).disabled = true;

        // 애니메이션
        const startTime = performance.now();
        const duration = _time * 1000; // 초를 밀리초로 변환

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const remaining = Math.max(0, duration - elapsed);
            const progress = remaining / duration;

            if(remaining > 0) {
                // 남은 시간 표시 (소수점 1자리)
                timeText.textContent = (remaining / 1000).toFixed(1);

                // 원형 프로그레스 업데이트 (360도 * 진행률)
                const degrees = 360 * progress;
                overlay.style.background = `conic-gradient(
                    rgba(0, 0, 0, 0.7) 0deg,
                    rgba(0, 0, 0, 0.7) ${degrees}deg,
                    transparent ${degrees}deg
                )`;

                requestAnimationFrame(animate);
            } else {
                // 쿨타임 종료
                overlay.remove();
                button.style.filter = '';
                (button as HTMLButtonElement).disabled = false;
            }
        };

        requestAnimationFrame(animate);
    }
    SetPadScale(_val)
    {
        this.mPadScale=_val;
        this.PadReset();
    }
    override IsShould(_member: string, _type: CObject.eShould) 
    {
        if(_member=="mStick" || _member=="mButton" || _member=="mButtonInput")
            return false;

        return super.IsShould(_member,_type);
    }
    IsOn()
    {
        
        for(let each0 of this.mStick)
        {
            if(each0.GetLastEvent()!=CEvent.eType.Null)
            {
                return true;
            }
        }
        for(let each0 of this.mButton)
        {
            if(each0.GetLastEvent()!=CEvent.eType.Null)
            {
                return true;
            }
        }
        return false;
    }
    GetDir()    {   return this.mDir;  }
    GetButtonEvent(_off)    
    {
        if(this.mButton.length>_off)
        {
            if(this.mButton[_off].GetLastEvent()!=CEvent.eType.Null)
                return this.mButton[_off].GetLastEvent();
            else
              return this.mButtonInput[_off];
        }
        return CEvent.eType.Null;
    }
    GetButtonPos(_off)    
    {
        let pos=this.mButton[_off].GetPressPos();
        if(pos==null)   pos=CVec3.Vec3(0,0,0);
        return pos;
    }
   
    Stick(_type : eStickType,_move)
    {
        this.mStickType=_type;
        //CMsg.E("Stick");
        if(_type==eStickType.Cross)
        {
            CH5Canvas.Init(50,50,true,false);
            let cmdList=[
                CH5Canvas.FillStyle('#5A86FF'),
                CH5Canvas.FillRect(0, 0, 50, 50),

                CH5Canvas.LineWidth(5),
                CH5Canvas.StrokeRect(0, 0, 50, 50),

                CH5Canvas.FillStyle('black'),
                CH5Canvas.FillText(25,23,"△",32),
            ];
            CH5Canvas.Draw(cmdList);
            let tex=CH5Canvas.GetNewTex();
            this.GetFrame().Res().Push("Pad/PadStickCrossUP.tex",tex);
            this.GetFrame().Ren().BuildTexture(tex);


            if(this.FindChilds("PadStickCrossUP").length==0)
            {
                let btn = new CUIButtonRGBA();
                btn.SetCamZoomResize(true);
                btn.Init("Pad/PadStickCrossUP.tex");
                btn.SetKey("PadStickCrossUP");
                btn.SetAnchorX(CUI.eAnchor.Min,30+50*this.mPadScale);
                btn.SetAnchorY(CUI.eAnchor.Min,30+100*this.mPadScale);
                btn.SetSize(50*this.mPadScale,50*this.mPadScale);
                this.PushChild(btn);
                this.mStick.push(btn);
                btn.GetPt().GetRenderPass()[0].mDepthTest=false;
                
            }
            

            cmdList=[
                CH5Canvas.FillStyle('#5A86FF'),
                CH5Canvas.FillRect(0, 0, 50, 50),

                CH5Canvas.LineWidth(5),
                CH5Canvas.StrokeRect(0, 0, 50, 50),

                CH5Canvas.FillStyle('black'),
                CH5Canvas.FillText(25,27,"▽",32),
            ];
            CH5Canvas.Draw(cmdList);
            tex=CH5Canvas.GetNewTex();
            this.GetFrame().Res().Push("Pad/PadStickCrossDown.tex",tex);
            this.GetFrame().Ren().BuildTexture(tex);

           

            if(this.FindChilds("PadStickCrossDown").length==0)
            {
                let btn = new CUIButtonRGBA();
                btn.SetCamZoomResize(true);
                btn.Init("Pad/PadStickCrossDown.tex");
                btn.SetKey("PadStickCrossDown");
                btn.SetAnchorX(CUI.eAnchor.Min,30+50*this.mPadScale);
                btn.SetAnchorY(CUI.eAnchor.Min,30+this.mPadScale);
                btn.SetSize(50*this.mPadScale,50*this.mPadScale);
            
                this.PushChild(btn);
                this.mStick.push(btn);
                btn.GetPt().GetRenderPass()[0].mDepthTest=false;
            }
            

            cmdList=[
                CH5Canvas.FillStyle('#5A86FF'),
                CH5Canvas.FillRect(0, 0, 50, 50),

                CH5Canvas.LineWidth(5),
                CH5Canvas.StrokeRect(0, 0, 50, 50),

                CH5Canvas.FillStyle('black'),
                CH5Canvas.FillText(23,25,"◁",32),
            ];
            CH5Canvas.Draw(cmdList);
            tex=CH5Canvas.GetNewTex();
            this.GetFrame().Res().Push("Pad/PadStickCrossLeft.tex",tex);
            this.GetFrame().Ren().BuildTexture(tex);


            if(this.FindChilds("PadStickCrossLeft").length==0)
            {
                let btn = new CUIButtonRGBA();
                btn.SetCamZoomResize(true);
                btn.Init("Pad/PadStickCrossLeft.tex");
                btn.SetKey("PadStickCrossLeft");
                btn.SetAnchorX(CUI.eAnchor.Min,30);
                btn.SetAnchorY(CUI.eAnchor.Min,30+50*this.mPadScale);
                btn.SetSize(50*this.mPadScale,50*this.mPadScale);
                this.PushChild(btn);
                this.mStick.push(btn);
                btn.GetPt().GetRenderPass()[0].mDepthTest=false;
            }
            

            cmdList=[
                CH5Canvas.FillStyle('#5A86FF'),
                CH5Canvas.FillRect(0, 0, 50, 50),

                CH5Canvas.LineWidth(5),
                CH5Canvas.StrokeRect(0, 0, 50, 50),

                CH5Canvas.FillStyle('black'),
                CH5Canvas.FillText(27,25,"▷",32),
            ];
            CH5Canvas.Draw(cmdList);
            tex=CH5Canvas.GetNewTex();
            this.GetFrame().Res().Push("Pad/PadStickCrossRight.tex",tex);
            this.GetFrame().Ren().BuildTexture(tex);

            if(this.FindChilds("PadStickCrossRight").length==0)
            {
                let btn = new CUIButtonRGBA();
                btn.SetCamZoomResize(true);
                btn.Init("Pad/PadStickCrossRight.tex");
                btn.SetKey("PadStickCrossRight");
                btn.SetAnchorX(CUI.eAnchor.Min,30+100*this.mPadScale);
                btn.SetAnchorY(CUI.eAnchor.Min,30+50*this.mPadScale);
                btn.SetSize(50*this.mPadScale,50*this.mPadScale);
                this.PushChild(btn);
                this.mStick.push(btn);
                btn.GetPt().GetRenderPass()[0].mDepthTest=false;
            }
            

            
        }
        else if(_type==eStickType.Circle || _type==eStickType.Circle4 || _type==eStickType.Circle8)
        {

            if(this.FindChilds("PadStickCircle").length==0)
            {
                let btn = new CUIHTML();
                btn.SetCamZoomResize(true);
                btn.Init(`  
    <button class="btn btn-secondary rounded-circle">
      <span class="position-absolute top-0 start-50 translate-middle-x fw-bold">↑</span>
      <span class="position-absolute bottom-0 start-50 translate-middle-x fw-bold">↓</span>
      <span class="position-absolute start-0 top-50 translate-middle-y fw-bold">←</span>
      <span class="position-absolute end-0 top-50 translate-middle-y fw-bold">→</span>
    </button>
                `
                ,new CVec2(100*this.mPadScale,100*this.mPadScale));
                //btn.Init("Pad/PadStickCircle.tex");
                btn.SetKey("PadStickCircle");
                btn.SetHover(true);
                btn.SetAnchorX(CUI.eAnchor.Min,40);
                btn.SetAnchorY(CUI.eAnchor.Min,40);
                
                
                //btn.SetSize(100*this.mPadScale,100*this.mPadScale);
                btn.SetPressTraking(true);
                this.PushChild(btn);
                this.mStick.push(btn);

            }
            
        }
    }
    Button(_type : eButtonType,_count)
    {
        if(_count>9)
            _count=9;
        if(_type==CPad.eButtonType.Alphabet_Rectangle || _type==CPad.eButtonType.Number_Rectangle)
        {
            for(let i=0;i<_count;++i)
            {
               
                    
                let ch5key="PadButton"+i;
                

               

                if(this.FindChilds(ch5key).length==0)
                {
                    

                    let btn = new CUIHTML();
                    btn.SetCamZoomResize(true);
                    btn.Init(`
                        <button class="btn btn-outline-danger rounded-circle fw-bold p-0">${i}</button>
                        `
                        ,new CVec2(50*this.mPadScale,50*this.mPadScale));
                    btn.SetKey(ch5key);
                    // btn.SetAnchorX(CUI.eAnchor.Max,20);
                    // btn.SetAnchorY(CUI.eAnchor.Min,40+i*60*this.mPadScale);
                    //btn.mBoundScale=2;
                    btn.SetAnchorX(CUI.eAnchor.Max,50);
                    btn.SetAnchorY(CUI.eAnchor.Min,100+i*100*this.mPadScale);
                    btn.SetHover(true);
                    btn.SetPressTraking(true);
                    
                    
                    
                    
                    this.PushChild(btn);
                    this.mButton.push(btn);
                    this.mButtonInput.push(CEvent.eType.Null);
                }
                
            }
        }
   
       
    }
    override Icon(){	
		return "bi bi-dpad";	
	}
    SetPad(_type : ePadType)
    {
        this.mPadType=_type;
    }
    override SubjectUpdate(_update: CUpdate): void 
    {
        super.SubjectUpdate(_update);

       



        if(this.mStick.length!=0 || this.mButton.length!=0)
        {
            this.mDir.Zero();
            if(this.mStickType==CPad.eStickType.Cross)
            {
                

                if(this.mStick[0].GetLastEvent()==CEvent.eType.Press)
                    CMath.V3AddV3(this.mDir,CVec3.Up(),this.mDir);
                if(this.mStick[1].GetLastEvent()==CEvent.eType.Press)
                    CMath.V3AddV3(this.mDir,CVec3.Down(),this.mDir);
                    
                if(this.mStick[2].GetLastEvent()==CEvent.eType.Press)
                    CMath.V3AddV3(this.mDir,CVec3.Left(),this.mDir);
                    
                if(this.mStick[3].GetLastEvent()==CEvent.eType.Press)
                    CMath.V3AddV3(this.mDir,CVec3.Right(),this.mDir);
                    
                
            }
            else if((this.mStickType==CPad.eStickType.Circle || this.mStickType==CPad.eStickType.Circle4 || this.mStickType==CPad.eStickType.Circle8) &&
                this.mStick[0].GetPressPos()!=null)
            {
                let len=CMath.V3Len(this.mStick[0].GetPressPos());
                if(this.mStick[0].GetLastEvent()==CEvent.eType.Press && len>16)
                {

                    this.mDir=CMath.V3Nor(this.mStick[0].GetPressPos());

                    const dir=[new CVec3(1,0,0),new CVec3(-1,0,0),new CVec3(0,1,0),new CVec3(0,-1,0),
                        new CVec3(1,-1,0),new CVec3(-1,-1,0),new CVec3(1,1,0),new CVec3(-1,-1,0)];
                    let matchVal=-1;
                    let matchOff=-1;
                    let count=0;

                    if(this.mStickType==CPad.eStickType.Circle4)   count=4;
                    else if(this.mStickType==CPad.eStickType.Circle8) count=8;
                   
                    for(let i=0;i<count;++i)
                    {
                        if(CMath.V3Dot(dir[i],this.mDir)>matchVal)
                        {
                            matchVal=CMath.V3Dot(dir[i],this.mDir);
                            matchOff=i;
                        }
                    }
                    if(matchOff!=-1)
                        this.mDir=dir[matchOff];


                }
                
                
            }
            let up = [], down = [], left = [], right = [];
            let space = [CInput.eKey.Space];
            let lctl = [CInput.eKey.LControl];

            if(this.mKeyType == CPad.eKeyType.Arrow || this.mKeyType == CPad.eKeyType.Both) {
                up.push(CInput.eKey.Up), down.push(CInput.eKey.Down);
                left.push(CInput.eKey.Left), right.push(CInput.eKey.Right);
            }
            if(this.mKeyType == CPad.eKeyType.WASD || this.mKeyType == CPad.eKeyType.Both) {
                up.push(CInput.eKey.W), down.push(CInput.eKey.S);
                left.push(CInput.eKey.A), right.push(CInput.eKey.D);
            }

            if(up.some((key => this.GetFrame().Input().KeyDown(key))))
                CMath.V3AddV3(this.mDir,CVec3.Up(),this.mDir);
            if(down.some((key => this.GetFrame().Input().KeyDown(key))))
                CMath.V3AddV3(this.mDir,CVec3.Down(),this.mDir);
            if(left.some((key => this.GetFrame().Input().KeyDown(key))))
                CMath.V3AddV3(this.mDir,CVec3.Left(),this.mDir);
            if(right.some((key => this.GetFrame().Input().KeyDown(key))))
                CMath.V3AddV3(this.mDir,CVec3.Right(),this.mDir);

            if(this.mButton.length>0)
            {
                if(space.some((key => this.GetFrame().Input().KeyDown(key))))
                {
                    this.mButtonInput[0]=CEvent.eType.Press;   
                }
                else if(space.some((key => this.GetFrame().Input().KeyUp(key))))
                {
                    this.mButtonInput[0]=CEvent.eType.Click;   
                }
                else
                    this.mButtonInput[0]=CEvent.eType.Null;

                if(lctl.some((key => this.GetFrame().Input().KeyDown(key))))
                {
                    this.mButtonInput[1]=CEvent.eType.Press;   
                }
                else if(lctl.some((key => this.GetFrame().Input().KeyUp(key))))
                {
                    this.mButtonInput[1]=CEvent.eType.Click;   
                }
                else
                    this.mButtonInput[1]=CEvent.eType.Null;
                
            }
            
            if(this.mDir.IsZero()==false)
                CMath.V3Nor(this.mDir,this.mDir);


            //if()

            return;
        }
        
        
        this.PadReset();


    }
    PadReset()
    {
        this.SetKey("pad");
        for(let c of this.mChild)
        {
            c.Destroy();
        }
        this.mStick=new Array();
        this.mButton=new Array();
        // if(CWindow.IsMobile())
        //     this.m_scale=1.5;
        if(this.mPadType==CPad.ePadType.NES)
        {
            this.Stick(CPad.eStickType.Cross,false);
            this.Button(CPad.eButtonType.Alphabet_Rectangle,2);
        }
        else if(this.mPadType==CPad.ePadType.Basic)
        {
            this.Stick(CPad.eStickType.Circle4,false);
            this.Button(CPad.eButtonType.Alphabet_Rectangle,2);
        }
    }
    override SetFrame(_fw : CFrame): void {
        super.SetFrame(_fw);
        if(_fw!=null)
        {
            this.PadReset();
        }
    }
    override ImportCJSON(_json: CJSON) 
    {
        super.ImportCJSON(_json);

        for(let ui of this.mChild)
        {
            if(ui.Key().indexOf("PadButton")!=-1)
                this.mButton.push(ui as CUI);
            else
                this.mStick.push(ui as CUI);
        }

        return this;
    }
    override EditChange(_pointer : CPointer,_child : boolean)
    {
        if(_pointer.member=="mPadType")
        {
            this.PadReset();
        }
        super.EditChange(_pointer,_child);
    }
}

// export class CPadComp extends CComponent
// {
//     m_pad : CPad=null;
//     MemberHide(_member: string, _form: any): boolean {
//         if(_member=="m_pad")
//             return;

//         return super.MemberHide(_member,_form);
//     }
//     Start(): void 
//     {
//         if(this.m_pad==null)
//         {
//             this.m_pad=new CPad();
//             this.GetOwner().PushChilde(this.m_pad);
//         }
            
//     }
//     public ParseJSON(_json: object | CJSON): CWatch {
//         super.ParseJSON(_json);
//         this.m_pad=this.GetOwner().GetChilde("pad")[0] as CPad;
//         return this;
//     }
// }
//var test=new CPad();
//test.Stick(CPad.eStickType.Circle,false);
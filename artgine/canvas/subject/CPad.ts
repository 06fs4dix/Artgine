
import { CEvent } from "../../basic/CEvent.js";
import {CJSON} from "../../basic/CJSON.js";
import { CObject, CPointer } from "../../basic/CObject.js";
import {CMat} from "../../geometry/CMat.js";
import {CMath} from "../../geometry/CMath.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CH5Canvas} from "../../render/CH5Canvas.js";
import {CInput} from "../../system/CInput.js";
import { CFrame } from "../../util/CFrame.js";
import {CSubject} from "./CSubject.js";
import {CUI,  CUIButtonRGBA } from "./CUI.js";



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
    SetPMat(_mat : CMat)
    {
        
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
            this.GetFrame().Res().Push("PadStickCrossUP.tex",tex);
            this.GetFrame().Ren().BuildTexture(tex);


            if(this.FindChilds("PadStickCrossUP").length==0)
            {
                let btn = new CUIButtonRGBA();
                btn.SetCamResize(true);
                btn.Init("PadStickCrossUP.tex");
                btn.SetKey("PadStickCrossUP");
                btn.SetAnchorX(CUI.eAnchor.Min,30+50*this.mPadScale);
                btn.SetAnchorY(CUI.eAnchor.Min,30+100*this.mPadScale);
                btn.SetSize(50*this.mPadScale,50*this.mPadScale);
                this.PushChilde(btn);
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
            this.GetFrame().Res().Push("PadStickCrossDown.tex",tex);
            this.GetFrame().Ren().BuildTexture(tex);

           

            if(this.FindChilds("PadStickCrossDown").length==0)
            {
                let btn = new CUIButtonRGBA();
                btn.SetCamResize(true);
                btn.Init("PadStickCrossDown.tex");
                btn.SetKey("PadStickCrossDown");
                btn.SetAnchorX(CUI.eAnchor.Min,30+50*this.mPadScale);
                btn.SetAnchorY(CUI.eAnchor.Min,30+this.mPadScale);
                btn.SetSize(50*this.mPadScale,50*this.mPadScale);
            
                this.PushChilde(btn);
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
            this.GetFrame().Res().Push("PadStickCrossLeft.tex",tex);
            this.GetFrame().Ren().BuildTexture(tex);


            if(this.FindChilds("PadStickCrossLeft").length==0)
            {
                let btn = new CUIButtonRGBA();
                btn.SetCamResize(true);
                btn.Init("PadStickCrossLeft.tex");
                btn.SetKey("PadStickCrossLeft");
                btn.SetAnchorX(CUI.eAnchor.Min,30);
                btn.SetAnchorY(CUI.eAnchor.Min,30+50*this.mPadScale);
                btn.SetSize(50*this.mPadScale,50*this.mPadScale);
                this.PushChilde(btn);
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
            this.GetFrame().Res().Push("PadStickCrossRight.tex",tex);
            this.GetFrame().Ren().BuildTexture(tex);

            if(this.FindChilds("PadStickCrossRight").length==0)
            {
                let btn = new CUIButtonRGBA();
                btn.SetCamResize(true);
                btn.Init("PadStickCrossRight.tex");
                btn.SetKey("PadStickCrossRight");
                btn.SetAnchorX(CUI.eAnchor.Min,30+100*this.mPadScale);
                btn.SetAnchorY(CUI.eAnchor.Min,30+50*this.mPadScale);
                btn.SetSize(50*this.mPadScale,50*this.mPadScale);
                this.PushChilde(btn);
                this.mStick.push(btn);
                btn.GetPt().GetRenderPass()[0].mDepthTest=false;
            }
            

            
        }
        else if(_type==eStickType.Circle || _type==eStickType.Circle4 || _type==eStickType.Circle8)
        {
            CH5Canvas.Init(128, 128,true,false);
            let cmdList=[
                CH5Canvas.FillLinearGradient(4,4,4,128-8,[{per:0,color:"gray"},{per:1,color:"red"}]),
                CH5Canvas.FillCircle(64,64,60),
                CH5Canvas.StrokeCircle(64,64,60,4),
                CH5Canvas.FillStyle("black"),
                CH5Canvas.FillText(20,62,"◁",32),
                CH5Canvas.FillText(108,62,"▷",32),
                CH5Canvas.FillText(66,22,"△",32),
                CH5Canvas.FillText(66,108,"▽",32),
            ];
            CH5Canvas.Draw(cmdList);
            let tex=CH5Canvas.GetNewTex();
            this.GetFrame().Res().Push("PadStickCircle.tex",tex);
            this.GetFrame().Ren().BuildTexture(tex);

            if(this.FindChilds("PadStickCircle").length==0)
            {
                
                let btn = new CUIButtonRGBA();
                btn.SetCamResize(true);
                //btn.m_updateScale=false;
                btn.Init("PadStickCircle.tex");
                btn.SetKey("PadStickCircle");
                // if(CWindow.IsMobile())
                // {
                //     btn.SetAnchorX(CUi.eAnchor.Min,60);
                //     btn.SetAnchorY(CUi.eAnchor.Min,60);
                // }
                // else
                {
                    btn.SetAnchorX(CUI.eAnchor.Min,30);
                    btn.SetAnchorY(CUI.eAnchor.Min,30);
                }
                
                btn.SetSize(100*this.mPadScale,100*this.mPadScale);
                btn.SetPressTraking(true);
                this.PushChilde(btn);
                this.mStick.push(btn);
                btn.GetPt().GetRenderPass()[0].mDepthTest=false;
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
                CH5Canvas.Init(50,50,true,false);
                let cmdList=[
                    CH5Canvas.FillStyle('#5A86FF'),
                    CH5Canvas.FillRect(0, 0, 50, 50),
    
                    CH5Canvas.LineWidth(5),
                    CH5Canvas.StrokeRect(0, 0, 50, 50),
    
                    CH5Canvas.FillStyle('black'),
                    
                ];
                if(_type==CPad.eButtonType.Alphabet_Rectangle)
                    cmdList.push(CH5Canvas.FillText(25,25,String.fromCharCode(65 + i),32));
                else
                    cmdList.push(CH5Canvas.FillText(25,25,String.fromCharCode(49 + i),32));

                    
                let ch5key="PadButton"+i;
                

                CH5Canvas.Draw(cmdList);
                let tex=CH5Canvas.GetNewTex();
                this.GetFrame().Res().Push(ch5key+".tex",tex);
                this.GetFrame().Ren().BuildTexture(tex);
                
               

                if(this.FindChilds(ch5key).length==0)
                {
                    let btn = new CUIButtonRGBA();
                    btn.SetCamResize(true);
                    btn.Init(ch5key+".tex");
                    btn.SetKey(ch5key);
                    btn.SetAnchorX(CUI.eAnchor.Max,20);
                    btn.SetAnchorY(CUI.eAnchor.Min,40+i*60*this.mPadScale);
                    //btn.SetPressTraking(true);
                    
                    
                    btn.SetSize(50*this.mPadScale,50*this.mPadScale);
                    this.PushChilde(btn);
                    this.mButton.push(btn);
                    btn.GetPt().GetRenderPass()[0].mDepthTest=false;
                }
                
            }
        }
        /*
        CH5Canvas.CreateCanvas(128, 128);
        CH5Canvas.StrokeRoundRect(5, 5, 118, 118, 60, 10);
        CH5Canvas.FillStyle("#5A86FF");
        CH5Canvas.FillRoundRect(5, 5, 118, 118, 60);
        */
       
    }

    SetPad(_type : ePadType)
    {
        this.mPadType=_type;
    }
    SubjectUpdate(_delay: number): void 
    {
        super.SubjectUpdate(_delay);

       



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

            return;
        }
        
        
        this.PadReset();
        // if(this.m_padType==CPad.ePadType.NES)
        // {
        //     this.Stick(CPad.eStickType.Cross,false);
        //     this.Button(CPad.eButtonType.Alphabet_Rectangle,2);
        // }
        // else if(this.m_padType==CPad.ePadType.Basic)
        // {
        //     this.Stick(CPad.eStickType.Circle,false);
        //     this.Button(CPad.eButtonType.Alphabet_Rectangle,2);
        // }

    }
    PadReset()
    {
        this.SetKey("pad");
        for(let c of this.mChilde)
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
    SetFrame(_fw : CFrame): void {
        super.SetFrame(_fw);
        if(_fw!=null)
        {
            this.PadReset();
        }
    }
    override ImportCJSON(_json: CJSON) 
    {
        super.ImportCJSON(_json);

        for(let ui of this.mChilde)
        {
            if(ui.Key().indexOf("PadButton")!=-1)
                this.mButton.push(ui as CUI);
            else
                this.mStick.push(ui as CUI);
        }

        return this;
    }
    override EditChange(_pointer : CPointer,_childe : boolean)
    {
        if(_pointer.member=="mPadType")
        {
            this.PadReset();
        }
        super.EditChange(_pointer,_childe);
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
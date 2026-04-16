import { CUpdate } from "../basic/Basic.js";
import {CAlert} from "../basic/CAlert.js";
import { CConsol } from "../basic/CConsol.js";
import {CObject } from "../basic/CObject.js";
import {CMath} from "../geometry/CMath.js";
import { CPoolGeo } from "../geometry/CPoolGeo.js";
import {CVec3} from "../geometry/CVec3.js";
import {CCamera,  ICamCon } from "../render/CCamera.js";

import {CInput} from "../system/CInput.js";

export class CCamCon extends CObject implements ICamCon
{
    constructor(_input : CInput)
    {
        super();
        this.mInput=_input;
        this.mCamera=null;
    }
    public mCamera : CCamera;
    public mInput : CInput;

    private mlX : number = -1;
	private mlY : number = -1;
    private mBfpos : CVec3 = null;
    private mBspos : CVec3 = null;

    private mMovX : number=0;
	private mMovY : number=0;
    private mMovLock : number = 0;

    public mPosSensitivity : number = 1;
    public mRotSensitivity : number = 1;
    public mZoomSensitivity : number = 1;

    public mLock : boolean = false;
    public mRotKey : number = CInput.eKey.LButton;
    public mRotXLock : boolean = false;
	public mRotYLock : boolean = false;
    public mPosKey : number = CInput.eKey.RButton;
    public mKeyboard : boolean = true;

    public mPause : boolean = false;
    
    protected mRotX:number=0;
    protected mRotY:number=0;
    protected mPosX:number=0;
    protected mPosY:number=0;
    protected mZoom:number=0;
    protected mUp:number=0;

    protected mRotXCur : number = 0;
    protected mRotYCur : number = 0;
  

    protected mReset:boolean=false;
    override IsShould(_member: string, _type: CObject.eShould): boolean {
        let hide = [
            "mCamera", "mInput", "mlX", "mlY", "mBfpos", "mBspos", "mMovX", "mMovY",
            "mMoveLock", "mRotX", "mRotY", "mPosX", "mPosY", "mZoom",
            "mUp", "mReset"
        ];
        if(hide.indexOf(_member) != -1) {
            return false;
        }
        return super.IsShould(_member, _type);
    }
    SetRotKey(_key)
	{
		this.mRotKey=_key;
	}
    SetPosKey(_key)
	{
		this.mPosKey=_key;
	}
	SetRotXLock(_enable)	{	this.mRotXLock=_enable;	}
	SetRotYLock(_enable)	{	this.mRotYLock=_enable;	}
	//정의된 키 조작으로 움직일수 있는지
	SetKeyboard(_enable)
	{
		this.mKeyboard=_enable;
	}
    SetPosSensitivity(_sensitivity : number) {
        this.mPosSensitivity = _sensitivity;
    }
    SetRotSensitivity(_sensitivity : number) {
        this.mRotSensitivity = _sensitivity;
    }
    SetZoomSensitivity(_sensitivity : number) {
        this.mZoomSensitivity = _sensitivity;
    }
    SetPause(_pause : boolean) {
        this.mPause = _pause;
    }

    InitCamera(_cam : CCamera)
    {
        if(this.mCamera==null)
            this.mCamera=_cam;
    }
    SetInput(_input)
    {
        this.mInput=_input;
    }
    Update(_update : CUpdate)
    {
        if(this.mCamera==null || this.mInput==null) return;
        if(this.mPause) return;
        var mosVec = this.mInput.Mouse();
        // [FIX] dt 클램프를 상단에서 한 번만 계산 — 전 블록에서 공유
        const dt = Math.min(Math.max(_update.DeltaTime(), 1 / 240), 1 / 10);
        // [FIX] 고정값 10 → dt 기반. 초당 600단위 = 60fps 기준 동일한 10/frame
        const move = 600 * dt;


		this.mRotX=0;
		this.mRotY=0;
		this.mPosX=0;
		this.mPosY=0;
		this.mUp=0;
        this.mZoom=0;


        this.mReset=false;
		this.mMovX=0;
		this.mMovY=0;

        if(this.mLock==false && this.mInput.GetUI()==null)
        {
            if(this.mInput.KeyDown(this.mRotKey) || this.mInput.KeyDown(this.mPosKey))
            {
                if(this.mlX!=-1)
                {
                    var dumX = this.mlX - mosVec.x;
                    var dumY = this.mlY - mosVec.y;
                    if(dumX!=0 || dumY!=0)
                        this.mMovLock+=1;
                    
                    
                    
                    if(this.mMovLock>4)
                    {
                        this.mMovX = this.mlX - mosVec.x;
                        this.mMovY = this.mlY - mosVec.y;
                    }
                    
                }
                
                
                this.mlX = mosVec.x;
                this.mlY = mosVec.y;
            }
            else
            {
                this.mlX=-1;
                this.mlY=-1;
                
                this.mMovLock=0;
            }

            let mVec=this.mInput.MouseVec();
            if(mVec.length==2)
            {
                //CMsg.Info(1);
                let fpos=new CVec3(mVec[0].x,mVec[0].y);
                let spos=new CVec3(mVec[1].x,mVec[1].y);
                //CConsol.Log(mVec[0].x+","+mVec[0].y+" / "+mVec[1].x+","+mVec[1].y);
                //CMsg.Info(fpos.toJSONStr()+" / "+spos.toJSONStr());
                //CMsg.Info(this.mBfpos+"/");
                if(this.mBfpos!=null)
                {
                    //CMsg.Info("mvec3");
                    
                    let len=CMath.V3Len(CMath.V3SubV3(fpos,spos));
                    let bLen=CMath.V3Len(CMath.V3SubV3(this.mBfpos,this.mBspos));
                    //CMsg.Info(len+"/"+bLen);

                    this.mZoom=len-bLen;
                    this.mReset=true;
                }
                
                
                
                this.mBfpos=fpos;
                this.mBspos=spos;
                this.mlX=-1;
                this.mlY=-1;
                
            }
            else
            {
                if(this.mBfpos!=null)
                {
                    this.mBfpos=null;
                    this.mBspos=null;
                }
                

                //mouse
                if(this.mInput.KeyDown(this.mRotKey))
                {
                    if(this.mRotXLock==false)
                        this.mRotX=this.mMovY;
                    if(this.mRotYLock==false)
                        this.mRotY=this.mMovX;
                    this.mReset=true;
                    //CConsol.Log("mRotKey");
                }
                else if(this.mInput.KeyDown(this.mPosKey))
                {
                    this.mPosX=-this.mMovY;
                    this.mPosY=this.mMovX;
                    this.mReset=true;
                    //CConsol.Log("mPosKey");
                }
                if (this.mInput.KeyUp(CInput.eKey.Wheel))
                {
                    var val=this.mInput.Wheel();
                    if(val>50)
                        val=50;	
                    else if(val<-50)
                        val=-50;
                        
                    this.mZoom=-val;
                    this.mReset=true;
                }
            }
        
            
            
            //keyboard
            if(this.mKeyboard)
            {
                if (this.mInput.KeyDown(CInput.eKey.W))
                {
                    if(this instanceof CCamCon2D) {
                        this.mPosX-=move;
                    }
                    else {
                        this.mPosX-=move;
                    }
                    this.mReset=true;
                }
                    
                if (this.mInput.KeyDown(CInput.eKey.S))
                {
                    if(this instanceof CCamCon2D) {
                        this.mPosX+=move;
                    }
                    else {
                        this.mPosX+=move;
                    }
                    this.mReset=true;
                }
                
                if (this.mInput.KeyDown(CInput.eKey.A))
                {
                    this.mPosY-=move;
                    this.mReset=true;
                }
                if (this.mInput.KeyDown(CInput.eKey.D))
                {
                    this.mPosY+=move;
                    this.mReset=true;
                }
                if (this.mInput.KeyDown(CInput.eKey.Q))
                {
                    this.mZoom=move;
                    this.mReset=true;
                }
                    
                if (this.mInput.KeyDown(CInput.eKey.E))
                {
                    this.mZoom=-move;
                    this.mReset=true;
                }
                if (this.mInput.KeyDown(CInput.eKey.Z))
                {
                    this.mUp=-move;
                    this.mReset=true;
                }
                if (this.mInput.KeyDown(CInput.eKey.X))
                {
                    this.mUp=move;
                    this.mReset=true;
                }
            }
        }//lock
        else
        {
            this.mlX=-1;
            this.mlY=-1;

            
            if(this.mBfpos!=null)
            {
                CAlert.Info("this.mBfpos!=null");
                this.mBfpos=null;
                this.mBspos=null;
            }
            
        }
        // 관성 감쇠:
        // - 드래그 중 (mRotX/Y != 0): mRotXCur에 직접 대입 → 누적 없이 픽셀 델타 그대로 추적
        // - 드래그 후 (mRotX/Y == 0): 지수 감쇠로 부드럽게 멈춤
        // 기존 += 누적 구조는 드래그 중에도 값이 쌓여 가속/미끄러짐 유발
        {
            const halfLife = 0.05;                          // 감쇠 속도 (낮을수록 빠르게 멈춤)
            const t = Math.pow(0.5, dt / halfLife);        // 프레임 독립 지수 감쇠

            if (this.mRotX !== 0) {
                this.mRotXCur = this.mRotX;                // 드래그 중: 직접 대입 (누적 X)
            } else {
                this.mRotXCur *= t;                        // 드래그 후: 감쇠
                this.mRotX = this.mRotXCur;
            }

            if (this.mRotY !== 0) {
                this.mRotYCur = this.mRotY;                // 드래그 중: 직접 대입 (누적 X)
            } else {
                this.mRotYCur *= t;                        // 드래그 후: 감쇠
                this.mRotY = this.mRotYCur;
            }

            if (Math.abs(this.mRotXCur) > 0.001 || Math.abs(this.mRotYCur) > 0.001) {
                this.mReset = true;
            }
        }
        

       

    }//Update
    

  


}

class CCamCon3D extends CCamCon
{
    override InitCamera(_cam: CCamera): void {
        super.InitCamera(_cam);
        
    }
}

export class CCamCon3DFirstPerson extends CCamCon3D
{
    override Update(_update : CUpdate): void
    {
        super.Update(_update);
        if(this.mReset==false) return;
        
        this.mCamera.FrontMove(this.mPosX * this.mPosSensitivity);
        this.mCamera.CrossMove(-this.mPosY * this.mPosSensitivity);
        this.mCamera.XAxisRotation(this.mRotX*0.005 * this.mRotSensitivity);
        this.mCamera.YAxisRotation(this.mRotY*0.005* this.mRotSensitivity);
        this.mCamera.ZAxisZoom(this.mZoom* this.mZoomSensitivity);
        this.mCamera.UpMove(this.mUp* this.mPosSensitivity);
        //this.mCamera.ResetPerspective();
    }
}
export class CCamCon3DThirdPerson extends CCamCon3D
{
    //줌 이전의 값
    public mPos : CVec3;
    //public m_follow : CBlackBoardRef<any> = new CBlackBoardRef();

    public mSZoom=1000;
    mReset3D=true;
    SetPos(_pos : CVec3) 
    {
        if(!this.mPos) {
            this.mPos = _pos.Export();
            this.mSZoom = CMath.V3Len(CMath.V3SubV3(this.mPos, this.mCamera.GetEye()));
        }
        else 
        {
            if(_pos.Equals(this.mPos)==false)   this.mReset3D=true;
            this.mPos.Import(_pos);
            

        }
    }
    SetZoom(_zoom : number) {
        this.mSZoom = _zoom;
    }
    override Update(_update : CUpdate): void
    {
        super.Update(_update);

        if(this.mReset==false && this.mReset3D==false) return;
        this.mReset3D=false;

        if(!this.mPos)
            this.mPos = this.mCamera.GetEye().Export();

        // [FIX] 마우스 픽셀 델타(mRotX/Y)는 물리적 이동거리에 비례하므로 이미 프레임 독립적
        // 마우스 픽셀 델타는 물리적 이동량에 비례 → 이미 프레임 독립적.
        // dt를 곱하면 고FPS일수록 느려지는 역효과 발생 (픽셀 내재 dt와 이중 반영).
        // → FirstPerson과 동일한 고정 스케일 상수(0.005) 사용, dt 제거
        const MOUSE_SCALE = 0.005;
        let rotX = this.mRotY * MOUSE_SCALE * this.mRotSensitivity;
        let rotY = this.mRotX * MOUSE_SCALE * this.mRotSensitivity;

        if (this.mZoom!=0)
            this.mSZoom=this.mSZoom-this.mZoom* this.mZoomSensitivity;

        // if(this.m_follow.Get() != null)
        //     this.mCamera.CharacterByRotation(this.m_follow.Get().GetPos(),rotY,rotX,this.m_zoom);
        // else
            this.mCamera.CharacterByRotation(this.mPos,rotY,rotX,this.mSZoom);

        //CConsol.Log(this.Key());
        //this.mCamera.ResetPerspective();
    }
}

class CCamCon2D extends CCamCon
{
    override InitCamera(_cam: CCamera): void {
        if(_cam.mOrthographic==false) { 
            CAlert.E("not orthographic cam!");
        }
        else super.InitCamera(_cam);
    }
    AddZoom(_val : number) {
        if(_val == 0) return;

        this.mCamera.mZoom *= 1 + _val / 1000;

        //viewMat이 안바뀌므로 updateMat이 안되서 수동으로 해줌
        this.mCamera.mUpdateMat = CUpdate.eType.Updated;
    }
}

export class CCamCon2DFreeMove extends CCamCon2D
{
    override Update(_update : CUpdate): void
    {
        super.Update(_update);
        if(this.mReset==false) return;

        this.AddZoom(-this.mZoom* this.mZoomSensitivity);
        let width = this.mCamera.mWidth;
        let height = this.mCamera.mHeight;
        if(width == 0) {
            width = this.mCamera.mPF.mWidth;
        }
        if(height == 0) {
            height = this.mCamera.mPF.mHeight;
        }
        let multiplier = CMath.Max(width, height) / 1000*this.mPosSensitivity * this.mCamera.mZoom;
        this.mCamera.CrossMove(-this.mPosY * multiplier);
        this.mCamera.UpMove(-this.mPosX * multiplier);
        this.mCamera.ResetOrthographic();
    }
}

export class CCamCon2DFollow extends CCamCon2D
{
    public mPos : CVec3;
    //public m_follow : CBlackBoardRef<CSubject> = new CBlackBoardRef();
    public m_offset : CVec3 = new CVec3();
    public m_smoothSpeed : number = 0.125;

    //계산용
    private m_tempVec3 : CVec3 = new CVec3();

    constructor(_input : CInput)
    {
        super(_input);
        // if(_follow) {
        //     if(!_follow.IsBlackBoard()) _follow.SetBlackBoard(true);
        //     this.m_follow = new CBlackBoardRef(_follow.Key());
        // }
    }
    SetPos(_pos)
    {
        this.mPos=_pos;
        //this.m_follow.Set(null);
    }
    override IsShould(_member: string, _type: CObject.eShould): boolean {
        if(_member == "m_tempVec3") 
            return false;
        
        return super.IsShould(_member, _type);
    }
    override Update(_update : CUpdate): void
    {
        super.Update(_update);

        this.AddZoom(-this.mZoom* this.mZoomSensitivity);

        if(!this.mPos)
            this.mPos = this.mCamera.GetEye().Export();

        let destination = this.m_tempVec3;
        // if(this.m_follow.Get() != null)
        //     CMath.V3AddV3(this.m_follow.Get().GetPos(), this.m_offset, destination);
        // else
        CMath.V3AddV3(this.mPos, this.m_offset, destination);

        let smoothedPos : CVec3=CPoolGeo.ProductV3();
        CMath.V3Interpolate(this.mCamera.GetEye(), destination, this.m_smoothSpeed,smoothedPos);
        smoothedPos.z = this.mCamera.GetEye().z;

        //카메라 초기화
        let look = this.m_tempVec3;
        CMath.V3AddV3(smoothedPos, CVec3.Vec3(0, 0, -1), look);
        this.mCamera.Init(smoothedPos, look);
        CPoolGeo.RecycleV3(smoothedPos);
        //카메라 업데이트
        this.mCamera.ResetOrthographic();


    }
}
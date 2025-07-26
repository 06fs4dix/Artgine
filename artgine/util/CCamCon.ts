


import { CUpdate } from "../basic/Basic.js";
import {CAlert} from "../basic/CAlert.js";
import {CObject } from "../basic/CObject.js";
import {CMath} from "../geometry/CMath.js";
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
    Update(_delay : number)
    {
        if(this.mCamera==null || this.mInput==null) return;
        if(this.mPause) return;
        var mosVec = this.mInput.Mouse();
        const move=10;


		this.mRotX=0;
		this.mRotY=0;
		this.mPosX=0;
		this.mPosY=0;
		this.mUp=0;
        this.mZoom=0;


        this.mReset=false;
		this.mMovX=0;
		this.mMovY=0;

        if(this.mLock==false)
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
                }
                else if(this.mInput.KeyDown(this.mPosKey))
                {
                    this.mPosX=-this.mMovY;
                    this.mPosY=this.mMovX;
                    this.mReset=true;
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
    }
    

  


}

class CCamCon3D extends CCamCon
{
    InitCamera(_cam: CCamera): void {
        super.InitCamera(_cam);
    }
}

export class CCamCon3DFirstPerson extends CCamCon3D
{
    Update(_delay: number): void
    {
        super.Update(_delay);
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

    public m_zoom=1000;

    SetPos(_pos : CVec3) {
        if(!this.mPos) {
            this.mPos = _pos.Export();
            this.m_zoom = CMath.V3Len(CMath.V3SubV3(this.mPos, this.mCamera.GetEye()));
        }
        else {
            this.mPos.Import(_pos);
        }
    }
    SetZoom(_zoom : number) {
        this.m_zoom = _zoom;
    }
    Update(_delay: number): void
    {
        super.Update(_delay);

        if(!this.mPos)
            this.mPos = this.mCamera.GetEye().Export();

        let rotX=this.mRotY* 0.001 * _delay* this.mRotSensitivity;
        let rotY=this.mRotX* 0.001 * _delay* this.mRotSensitivity;

        if (this.mZoom!=0)
            this.m_zoom=this.m_zoom-this.mZoom* this.mZoomSensitivity;

        // if(this.m_follow.Get() != null)
        //     this.mCamera.CharacterByRotation(this.m_follow.Get().GetPos(),rotY,rotX,this.m_zoom);
        // else
            this.mCamera.CharacterByRotation(this.mPos,rotY,rotX,this.m_zoom);

        //this.mCamera.ResetPerspective();
    }
}

class CCamCon2D extends CCamCon
{
    InitCamera(_cam: CCamera): void {
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
    Update(_delay: number): void
    {
        super.Update(_delay);
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
    Update(_delay: number): void
    {
        super.Update(_delay);

        this.AddZoom(-this.mZoom* this.mZoomSensitivity);

        if(!this.mPos)
            this.mPos = this.mCamera.GetEye().Export();

        let destination = this.m_tempVec3;
        // if(this.m_follow.Get() != null)
        //     CMath.V3AddV3(this.m_follow.Get().GetPos(), this.m_offset, destination);
        // else
            CMath.V3AddV3(this.mPos, this.m_offset, destination);

        let smoothedPos : CVec3 = CMath.V3Interpolate(this.mCamera.GetEye(), destination, this.m_smoothSpeed);
        smoothedPos.z = this.mCamera.GetEye().z;

        //카메라 초기화
        let look = this.m_tempVec3;
        CMath.V3AddV3(smoothedPos, new CVec3(0, 0, -1), look);
        this.mCamera.Init(smoothedPos, look);

        //카메라 업데이트
        this.mCamera.ResetOrthographic();


    }
}
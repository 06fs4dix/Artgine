import { CUpdate } from "../../basic/Basic.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CDevice} from "../../render/CDevice.js";
import {CBrushComp} from "./CBrushComp.js";
import {CComponent} from "./CComponent.js";

export class CWind extends CBrushComp
{
    //0,0,0이면 중심점 기준으로 바람
    public mDir : CVec3 = new CVec3(1,0,0);
    public mPower : number = 100;

    //최소범위,최대범위(중간지역은 점점 약해짐)
    public mInnerRadius : number = 0;
    public mOuterRadius : number = 0;

    //움직이는 반응속도
    public mFrequency : number = 0.6;
    //전체 웨이브에 반복 사이즈
    public mWaveLength : number = 1000;
    mUseWeight=true;

    constructor()
    {
        super(null);

        this.mSysc = CComponent.eSysn.Wind;
    }
    SetInnerOuter(_inner,_outer)
    {
        this.mInnerRadius=_inner;
        this.mOuterRadius=_outer;
    }
    //0,0,0이면 자기 위치기준으로 방향이 잡힌다
    SetDirect(_dir : CVec3=new CVec3())
    {
        this.mDir=_dir;
    }
    SetPower(_power)
    {
        this.mPower=_power;
    }
    SetFrequency(_f)
    {
        this.mFrequency=_f;
    }
    SetWave(_w)
    {
        this.mWaveLength=_w;
    }

    Icon()
    {
        return "bi bi-wind";
    }

    override Update(_update : CUpdate) : boolean
	{
        if(super.Update(_update))    return;

        
        //if(this.mBruch.mDoubleChk.has(this))	return;
		//this.mBruch.mDoubleChk.add(this);
        
        if(this.mBrush.mWindCount>CDevice.GetProperty(CDevice.eProperty.Sam2DSize))
            return;

        this.mBrush.mWindDir[this.mBrush.mWindCount * 4 + 0] = this.mDir.x;
        this.mBrush.mWindDir[this.mBrush.mWindCount * 4 + 1] = this.mDir.y;
        this.mBrush.mWindDir[this.mBrush.mWindCount * 4 + 2] = this.mDir.z;
        this.mBrush.mWindDir[this.mBrush.mWindCount * 4 + 3] = this.mPower;

        this.mBrush.mWindPos[this.mBrush.mWindCount * 4 + 0] = this.GetOwner().GetMat().x;
        this.mBrush.mWindPos[this.mBrush.mWindCount * 4 + 1] = this.GetOwner().GetMat().y;
        this.mBrush.mWindPos[this.mBrush.mWindCount * 4 + 2] = this.GetOwner().GetMat().z;
        //아마도 이후에 noise texture offset을 넣으면 좋을듯함
        this.mBrush.mWindPos[this.mBrush.mWindCount * 4 + 3] = this.mUseWeight ? 1.0 : 0.0;

        this.mBrush.mWindInfo[this.mBrush.mWindCount * 4 + 0] = this.mInnerRadius;
        this.mBrush.mWindInfo[this.mBrush.mWindCount * 4 + 1] = this.mOuterRadius;
        this.mBrush.mWindInfo[this.mBrush.mWindCount * 4 + 2] = this.mFrequency;
        this.mBrush.mWindInfo[this.mBrush.mWindCount * 4 + 3] = this.mWaveLength;

        this.mBrush.mWindCount++;
        return false;
	}
    


    
}
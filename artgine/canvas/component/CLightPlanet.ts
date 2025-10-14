import { CConsol } from "../../basic/CConsol.js";
import { CObject } from "../../basic/CObject.js";
import { CMat } from "../../geometry/CMat.js";
import { CMath } from "../../geometry/CMath.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CColor } from "./CColor.js";
import { CLight } from "./CLight.js";

export class CDayCycle extends CObject
{
    public mSkyTable : Array<CMat>=[new CMat,new CMat,new CMat];
	public mSunTable : Array<CMat>=[new CMat,new CMat,new CMat];

    mEmission=new CColor();
    mDirection=new CVec3();
    constructor(_dir : CVec3,_emission : CColor,
        _skyTable : Array<CMat>=[
            new CMat([0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02, 0.015, 0.01, 0.005]),
            new CMat([0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.06, 0.04, 0.02, 0.01]),
            new CMat([0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15]),
        ],
        
        _sunTable : Array<CMat>=[
            new CMat([1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25]),
            new CMat([0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95]),
            new CMat([0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85]),
        ])
    {
        super();
        if(_dir!=null)
        {
            this.mDirection=CMath.V3Nor(_dir);
            this.mEmission=_emission;
        }
        
        this.mSkyTable=_skyTable;
        this.mSunTable=_sunTable;
    }
}

export class CLightPlanet extends CLight
{
    mDCArr=new Array<CDayCycle>();
    mTempColor=new CColor();
    override IsShould(_member: string, _type: CObject.eShould): boolean {
        if(_member=="mTempColor")   return false;
        return super.IsShould(_member,_type);
    }
    Push(_dc : CDayCycle)
    {
        this.mDCArr.push(_dc);
    }
    Update(_delay: any) {

        if(this.mBruch!=null && this.mDCArr.length!=0)
        {
            let fOff = -1, sOff = -1;
            let fVal = -2, sVal = -2; // dot의 최소 가능값(-1)보다 더 작게 시작

            const dir = CPoolGeo.ProductV3();
            dir.mF32A[0] = this.mDirPos.mF32A[0];
            dir.mF32A[1] = this.mDirPos.mF32A[1];
            dir.mF32A[2] = this.mDirPos.mF32A[2];

            for (let i = 0; i < this.mDCArr.length; ++i) {
                const dot = CMath.V3Dot(this.mDCArr[i].mDirection, dir);

                if (dot > fVal) {
                    // 기존 1등을 2등으로 밀고, 새 값으로 1등 갱신
                    sVal = fVal;  sOff = fOff;
                    fVal = dot;   fOff = i;
                } else if (dot > sVal) {
                    // 1등은 그대로 두고 2등만 갱신
                    sVal = dot;   sOff = i;
                }
            }
            dir.Recycle();

            // 후보가 1개뿐인 경우 대비(옵션): sOff가 없으면 fOff로 대체
            if (sOff < 0) { sOff = fOff; sVal = fVal; }
            if(fOff>sOff)
            {
                let d=fOff;
                fOff=sOff;
                sOff=d;

                d=fVal;
                fVal=sVal;
                sVal=d;
            }

            

            for(let i=0;i<3;++i)
            {
                this.mBruch.mSkyTable[i].Import(this.mDCArr[fOff].mSkyTable[i]);
                this.mBruch.mSunTable[i].Import(this.mDCArr[fOff].mSunTable[i]);
            }
            // fVal, sVal ∈ [-1, 1], fVal ≥ sVal
            const eps = 1e-6;
            const denom = Math.max(eps, Math.abs(fVal) + Math.abs(sVal));

            // t: 0..1 (f가 우세할수록 1에 가까움, 비슷하면 0.5)
            //const t = 0.5 + 0.5 * ((fVal - sVal) / denom);
            const t = Math.min(1, Math.max(0, (fVal - sVal) / (1 - sVal)));
            // let r=(fVal - sVal)*0.5;
            // const t = (fVal-sVal)/r;


            //CConsol.Log(fOff+" / "+sOff+" t : "+t);
            this.mTempColor.x=CMath.FloatInterpolate(this.mDCArr[sOff].mEmission.x,this.mDCArr[fOff].mEmission.x,t);
            this.mTempColor.y=CMath.FloatInterpolate(this.mDCArr[sOff].mEmission.y,this.mDCArr[fOff].mEmission.y,t);
            this.mTempColor.z=CMath.FloatInterpolate(this.mDCArr[sOff].mEmission.z,this.mDCArr[fOff].mEmission.z,t);
            this.mTempColor.w=this.mDCArr[fOff].mEmission.w;

            this.mColor.xyz=this.mTempColor.ToRGBA().xyz;
            this.mDirPos.w=-1;
            //this.mColor.Import(this.mDCArr[maxOff].mEmission);
            


        }
        super.Update(_delay);
    }
}
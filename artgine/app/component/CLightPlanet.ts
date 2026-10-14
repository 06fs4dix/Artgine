import { CUpdate } from "../../basic/Basic.js";
import { CConsol } from "../../basic/CConsol.js";
import { CObject } from "../../basic/CObject.js";
import { CMat } from "../../geometry/CMat.js";
import { CMath } from "../../geometry/CMath.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CColor } from "../../render/CColor.js";

import { CLight } from "./CLight.js";

export class CDayCycle extends CObject
{
    //맑은 날 하늘 사진 기준. 인덱스는 천정각 (1-cos)/2*14 : 0=천정, 7=지평선, 8~=지평선 아래 연무
    static sSkyTable = [
        [0.24, 0.27, 0.30, 0.34, 0.38, 0.43, 0.50, 0.58, 0.56, 0.53, 0.50, 0.48, 0.47, 0.47, 0.47, 0.47],
        [0.47, 0.52, 0.56, 0.60, 0.64, 0.68, 0.73, 0.78, 0.75, 0.71, 0.67, 0.64, 0.63, 0.63, 0.63, 0.63],
        [0.84, 0.87, 0.90, 0.92, 0.94, 0.95, 0.96, 0.96, 0.92, 0.87, 0.82, 0.78, 0.76, 0.76, 0.76, 0.76],
    ];
    //석양 테이블 인덱스는 태양과의 각도(0=태양, 3=55도, 7=90도). 셰이더는 태양이 지평선에 가까울수록, 태양에 가까운 방향일수록 이 색을 강하게 섞는다.
    //빨강/자홍을 거치면 파란 하늘과 섞여 보라가 되므로 주황 -> 회청색으로 끝낸다
    //한낮: 태양 주변만 흰 빛무리, 나머지는 하늘 중간색이라 섞여도 티가 안 난다
    static sNoonTable = [
        [1.00, 0.72, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49],
        [0.97, 0.84, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72],
        [0.90, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95],
    ];
    //고도 8도 안팎(골든아워): 태양 주변 금색
    static sGoldTable = [
        [1.00, 0.94, 0.84, 0.72, 0.60, 0.52, 0.47, 0.44, 0.42, 0.44, 0.47, 0.49, 0.50, 0.50, 0.50, 0.50],
        [0.86, 0.80, 0.72, 0.64, 0.58, 0.55, 0.53, 0.51, 0.50, 0.49, 0.49, 0.48, 0.48, 0.48, 0.48, 0.48],
        [0.60, 0.58, 0.58, 0.60, 0.62, 0.64, 0.66, 0.66, 0.66, 0.64, 0.62, 0.59, 0.57, 0.56, 0.55, 0.55],
    ];
    //해가 지평선에 닿을 때: 진한 주황이 약 65도까지 퍼진다
    static sSunTable = [
        [1.00, 0.97, 0.90, 0.80, 0.68, 0.56, 0.48, 0.44, 0.42, 0.44, 0.47, 0.49, 0.50, 0.50, 0.50, 0.50],
        [0.50, 0.52, 0.52, 0.52, 0.52, 0.52, 0.52, 0.51, 0.50, 0.49, 0.49, 0.48, 0.48, 0.48, 0.48, 0.48],
        [0.18, 0.24, 0.30, 0.38, 0.46, 0.55, 0.62, 0.66, 0.66, 0.64, 0.62, 0.59, 0.57, 0.56, 0.55, 0.55],
    ];
    //태양 고도(도) -> 하늘 밝기. 맑은 날 하늘 휘도는 해가 낮아질수록 줄고 일몰 후엔 3도마다 대략 절반이 된다
    static sSkyLum : Array<[number, number]> = [[-18, 0.025], [-12, 0.04], [-9, 0.08], [-6, 0.16], [-3, 0.32], [0, 0.5], [5, 0.68], [10, 0.82], [20, 0.95], [35, 1]];
    static sGlowLum : Array<[number, number]> = [[-14, 0.03], [-10, 0.08], [-6, 0.25], [-3, 0.55], [0, 0.85], [5, 1]];
    static Key(_keys : Array<[number, number]>, _x : number) : number
    {
        if(_x <= _keys[0][0]) return _keys[0][1];
        for(let i = 1; i < _keys.length; i++)
        {
            if(_x <= _keys[i][0])
            {
                const a = _keys[i - 1], b = _keys[i];
                return a[1] + (b[1] - a[1]) * (_x - a[0]) / (b[0] - a[0]);
            }
        }
        return _keys[_keys.length - 1][1];
    }
    //태양 고도(도) -> 햇빛 색. 지평선 근처는 긴 대기 경로 때문에 붉고 어둡고, -8도 아래는 꺼진다
    static sSunColor : Array<[number, number, number, number]> = [[-8, 0, 0, 0], [-3, 0.28, 0.1, 0.07], [0, 0.85, 0.36, 0.14], [4, 1.0, 0.55, 0.26], [10, 1.0, 0.76, 0.52], [20, 1.08, 0.97, 0.8], [35, 1.15, 1.08, 0.94], [90, 1.18, 1.12, 1.0]];
    static SunColor(_elevDeg : number) : CColor
    {
        const k = CDayCycle.sSunColor;
        if(_elevDeg <= k[0][0]) return new CColor(k[0][1], k[0][2], k[0][3]);
        for(let i = 1; i < k.length; i++)
        {
            if(_elevDeg <= k[i][0])
            {
                const a = k[i - 1], b = k[i];
                const t = (_elevDeg - a[0]) / (b[0] - a[0]);
                return new CColor(a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t);
            }
        }
        const l = k[k.length - 1];
        return new CColor(l[1], l[2], l[3]);
    }
    //시간대별 기본 세트. CLightPlanet.TimeDir 과 같은 규칙(6시=_rise 방향 일출, 12시=정오, 18시=반대편 일몰, 0시=발밑)
    static Default(_stepHour : number = 0.25, _rise : CVec3 = new CVec3(-1, 0, 0)) : Array<CDayCycle>
    {
        const rise = CMath.V3Nor(_rise);
        const arr = new Array<CDayCycle>();
        for(let h = 0; h < 24; h += _stepHour)
        {
            const rad = (h - 6) / 12 * Math.PI;
            const c = Math.cos(rad), s = Math.sin(rad);
            const dir = new CVec3(rise.x * c, rise.y * c + s, rise.z * c);
            const elev = Math.asin(Math.min(1, Math.max(-1, CMath.V3Nor(dir).y))) * 180 / Math.PI;
            arr.push(new CDayCycle(dir, CDayCycle.SunColor(elev)));
        }
        return arr;
    }
    //태양 고도(도)에 맞는 하늘/석양 테이블. 밝기가 들어 있으므로 emission 배율을 곱하지 않는다
    static MakeTable(_elevDeg : number) : { sky : Array<CMat>, sun : Array<CMat> }
    {
        const e = _elevDeg;
        const sat = (_v : number) => Math.min(1, Math.max(0, _v));
        const lum = CDayCycle.Key(CDayCycle.sSkyLum, e);
        const glow = CDayCycle.Key(CDayCycle.sGlowLum, e);
        //박명(블루아워)으로 갈수록 붉은/초록 성분이 먼저 빠져 짙은 남색이 된다
        const tw = sat((6 - e) / 14);
        const tint = [1 - tw * 0.55, 1 - tw * 0.38, 1];
        const sw = sat((20 - e) / 14);
        const low = sat((8 - e) / 8);
        //해가 지면 태양 쪽 띠만 노을로 남고 바깥부터 박명 하늘색이 된다
        const dusk = sat(-e / 4);
        const sky = [new CMat(), new CMat(), new CMat()];
        const sun = [new CMat(), new CMat(), new CMat()];
        for(let c = 0; c < 3; c++)
        {
            const duskSky = CDayCycle.sSkyTable[c][6] * lum * tint[c] / Math.max(glow, 0.001);
            const ember = [0.9, 0.35, 0.12][c];
            for(let i = 0; i < 16; i++)
            {
                sky[c].mF32A[i] = CDayCycle.sSkyTable[c][i] * lum * tint[c];
                const gold = CDayCycle.sGoldTable[c][i] + (CDayCycle.sSunTable[c][i] - CDayCycle.sGoldTable[c][i]) * low;
                let v = CDayCycle.sNoonTable[c][i] + (gold - CDayCycle.sNoonTable[c][i]) * sw;
                if(i == 0) v += (ember - v) * dusk;
                else v += (duskSky - v) * dusk * sat(i / 4);
                sun[c].mF32A[i] = v * glow;
            }
        }
        return { sky : sky, sun : sun };
    }
    public mSkyTable : Array<CMat>=[new CMat,new CMat,new CMat];
	public mSunTable : Array<CMat>=[new CMat,new CMat,new CMat];

    mEmission=new CColor();
    mDirection=new CVec3();
    constructor(_dir : CVec3,_emission : CColor,_skyTable : Array<CMat>=null,_sunTable : Array<CMat>=null,_emissionSum=1)
    {
        super();
        if(_dir!=null)
        {
            this.mDirection=CMath.V3Nor(_dir);
            this.mEmission=_emission;
        }
        if(_skyTable==null && _sunTable==null && _dir!=null)
        {
            const elev = Math.asin(Math.min(1, Math.max(-1, this.mDirection.y))) * 180 / Math.PI;
            const table = CDayCycle.MakeTable(elev);
            this.mSkyTable=table.sky;
            this.mSunTable=table.sun;
            return;
        }
        if(_skyTable==null)
            _skyTable=CDayCycle.MakeTable(90).sky;
        if(_sunTable==null)
            _sunTable=CDayCycle.MakeTable(90).sun;
        if(_emission==null) return;
         // emission 색상의 평균값 계산 (0~1 범위)
        const emissionAvg = (_emission.x + _emission.y + _emission.z) / 3.0;
        
        // 최종 factor 계산 (emission이 (0,0,0)이면 0, (1,1,1)이면 _emissionSum)
        const factor = emissionAvg * _emissionSum;

        // skyTable의 모든 값에 factor 곱하기
        for(let i = 0; i < 3; i++) {
            for(let j = 0; j < _skyTable[i].mF32A.length; j++) {
                _skyTable[i].mF32A[j] *= factor;
            }
        }
        for(let i = 0; i < 3; i++) {
            for(let j = 0; j < _skyTable[i].mF32A.length; j++) {
                _sunTable[i].mF32A[j] *= factor;
            }
        }

        this.mSkyTable=_skyTable;
        this.mSunTable=_sunTable;
    }
}

export class CLightPlanet extends CLight
{
    mDCArr=new Array<CDayCycle>();
    // 등록된 라이트(가로등 등)의 시간대별 세기. emission 을 원본 색에 곱하므로 회색 계열이면 순수 세기 조절이 된다
    mPointDCArr=new Array<CDayCycle>();
    mTempColor=new CColor();
    mPointColor=new CColor();
    // SetTime 이 색을 갱신할 라이트와 등록 시점의 원본 색. 참조라서 저장하면 안 된다(IsShould 참고)
    mLightArr=new Array<CLight>();
    mLightColorArr=new Array<CVec3>();
    //Pick 이 고른 2등 인덱스와 2등->1등 보간 비율
    protected mPickS=0;
    protected mPickT=1;
    override IsShould(_member: string, _type: CObject.eShould): boolean {
        if(_member=="mTempColor")   return false;
        if(_member=="mPickS" || _member=="mPickT")   return false;
        if(_member=="mPointColor")   return false;
        if(_member=="mLightArr")   return false;
        if(_member=="mLightColorArr")   return false;
        return super.IsShould(_member,_type);
    }
    Push(_dc : CDayCycle)
    {
        this.mDCArr.push(_dc);
    }
    //CDayCycle.Default 세트를 넣는다. _rise 는 6시(일출) 방향, 태양은 _rise 와 위쪽이 이루는 평면을 돈다
    PushDefault(_stepHour : number = 0.25, _rise : CVec3 = new CVec3(-1, 0, 0))
    {
        for(const dc of CDayCycle.Default(_stepHour, _rise))
            this.mDCArr.push(dc);
    }
    PushPoint(_dc : CDayCycle)
    {
        this.mPointDCArr.push(_dc);
    }
    //초기화때 한번만 등록한다. 등록 시점의 색이 원본이 되므로 이후 SetColor 로 바꾸면 원본이 어긋난다
    PushLight(_light : CLight|Array<CLight>)
    {
        const arr = Array.isArray(_light) ? _light : [_light];
        for(const each of arr)
        {
            if(each==null || each==this as CLight)   continue;
            this.mLightArr.push(each);
            this.mLightColorArr.push(each.GetColor());
        }
    }
    //6시=일출(-1,0,0) 12시=정오(0,1,0) 18시=일몰(1,0,0) 0시=지평선아래(0,-1,0)
    static TimeDir(_hour : number) : CVec3
    {
        const rad = (_hour - 6) / 12 * Math.PI;
        return new CVec3(-Math.cos(rad), Math.sin(rad), 0);
    }
    SetTime(_hour : number)
    {
        const dir = CLightPlanet.TimeDir(_hour);

        const owner = this.GetOwner();
        if(owner!=null)     owner.SetPos(dir);

        if(this.mLightArr.length==0)    return;
        if(this.Pick(this.mPointDCArr, dir, this.mPointColor)<0)    return;

        const rate = this.mPointColor.ToRGB();
        const color = CPoolGeo.ProductV3();
        for(let i=0;i<this.mLightArr.length;++i)
        {
            const org = this.mLightColorArr[i];
            color.mF32A[0]=org.mF32A[0]*rate.mF32A[0];
            color.mF32A[1]=org.mF32A[1]*rate.mF32A[1];
            color.mF32A[2]=org.mF32A[2]*rate.mF32A[2];
            this.mLightArr[i].SetColor(color);
        }
        color.Recycle();
    }
    // dot 으로 1·2등 사이클을 고르고 그 사이를 보간한다. 반환값은 스카이/선 테이블을 가져올 인덱스(없으면 -1)
    protected Pick(_arr : Array<CDayCycle>, _dir : CVec3, _out : CColor) : number
    {
        if(_arr.length==0)  return -1;

        let fOff = -1, sOff = -1;
        let fVal = -2, sVal = -2; // dot의 최소 가능값(-1)보다 더 작게 시작

        for (let i = 0; i < _arr.length; ++i) {
            const dot = CMath.V3Dot(_arr[i].mDirection, _dir);

            if (dot > fVal) {
                // 기존 1등을 2등으로 밀고, 새 값으로 1등 갱신
                sVal = fVal;  sOff = fOff;
                fVal = dot;   fOff = i;
            } else if (dot > sVal) {
                // 1등은 그대로 두고 2등만 갱신
                sVal = dot;   sOff = i;
            }
        }

        // 후보가 1개뿐인 경우 대비(옵션): sOff가 없으면 fOff로 대체
        if (sOff < 0) { sOff = fOff; sVal = fVal; }

        // 2등 -> 1등 방향으로만 섞는다. 예전에는 여기서 배열 인덱스 순으로 둘을 뒤바꿨는데,
        // 그러면 1등 인덱스가 클 때 t 가 음수라 0으로 잘려 보간 없이 1등 색으로 스냅해 버렸다
        // (해뜰녘 방향이 노을 항목과 밤 항목 사이일 때 주황이 안 나오던 원인).
        //
        // 섞는 비율은 dot 차이가 아니라 각도 비율로 낸다. dot 차이로 내면 두 항목의 정중앙에서 t가 0이
        // 되는데, 그 지점을 넘는 순간 1·2등이 뒤바뀌면서 색이 반대쪽 항목으로 튀어버린다 — 해가 연속으로
        // 움직이면 항목을 지날 때마다 전환을 두 번 하고 중간에 되돌아가서 깜박인다.
        // 각도 비율은 정중앙에서 양쪽 모두 0.5라, 뒤바뀌어도 같은 색이 나와 이어진다.
        const fRad = Math.acos(Math.min(1, Math.max(-1, fVal)));
        const sRad = Math.acos(Math.min(1, Math.max(-1, sVal)));
        const t = sRad / Math.max(1e-6, sRad + fRad);

        _out.x=CMath.FloatInterpolate(_arr[sOff].mEmission.x,_arr[fOff].mEmission.x,t);
        _out.y=CMath.FloatInterpolate(_arr[sOff].mEmission.y,_arr[fOff].mEmission.y,t);
        _out.z=CMath.FloatInterpolate(_arr[sOff].mEmission.z,_arr[fOff].mEmission.z,t);
        _out.w=_arr[fOff].mEmission.w;

        this.mPickS=sOff;
        this.mPickT=t;
        return fOff;
    }
    override Update(_update : CUpdate) {

        if(this.mBrush!=null && this.mDCArr.length!=0)
        {
            const dir = CPoolGeo.ProductV3();
            dir.mF32A[0] = this.mDirPos.mF32A[0];
            dir.mF32A[1] = this.mDirPos.mF32A[1];
            dir.mF32A[2] = this.mDirPos.mF32A[2];

            const fOff = this.Pick(this.mDCArr, dir, this.mTempColor);
            dir.Recycle();

            if(fOff>=0)
            {
                //색과 같은 비율로 테이블도 섞는다. 1등 테이블만 쓰면 항목 경계에서 하늘색이 툭 바뀐다
                const s=this.mDCArr[this.mPickS], f=this.mDCArr[fOff], t=this.mPickT;
                for(let i=0;i<3;++i)
                {
                    const sky=this.mBrush.mSkyTable[i].mF32A, sun=this.mBrush.mSunTable[i].mF32A;
                    const sSky=s.mSkyTable[i].mF32A, fSky=f.mSkyTable[i].mF32A;
                    const sSun=s.mSunTable[i].mF32A, fSun=f.mSunTable[i].mF32A;
                    for(let j=0;j<16;++j)
                    {
                        sky[j]=sSky[j]+(fSky[j]-sSky[j])*t;
                        sun[j]=sSun[j]+(fSun[j]-sSun[j])*t;
                    }
                }

                let color=this.mTempColor.ToRGB();
                this.mColor.mF32A[0]=color.mF32A[0];
                this.mColor.mF32A[1]=color.mF32A[1];
                this.mColor.mF32A[2]=color.mF32A[2];
                this.mDirPos.w=-1;
            }
        }
        super.Update(_update);
    }
}
import { CLight } from "../../artgine/app/component/CLight.js";
import { CPaint } from "../../artgine/app/component/paint/CPaint.js";
import { CPaint3D } from "../../artgine/app/component/paint/CPaint3D.js";
import { CPaintMerge } from "../../artgine/app/component/paint/CPaintMerge.js";
import { CParticle, CParticlePaint } from "../../artgine/app/subject/CParticle.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CUpdate } from "../../artgine/basic/Basic.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CColor } from "../../artgine/render/CColor.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CSampList, CSampler } from "../../artgine/util/CSampler.js";
import { CSchedule } from "../../artgine/util/CSchedule.js";
import { SDF } from "../../artgine/z_file/SDF.js";
import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeScene } from "./CForgeScene.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";

//불꽃 한 곳. pos = 바닥(불 아래) 위치 m, r = 불 밑 반지름 m, h = 불이 솟는 높이 m
export interface IForgeFire { pos : number[]; r : number; h : number; rgb : number[]; }

//점광원 한 곳. pos = 위치 m, r = 빛 도달 반경 m
export interface IForgeLight { pos : number[]; r : number; rgb : number[]; }

interface IForgeFlame { pp : CParticlePaint; age : number; x : number; z : number; vx : number; vz : number; vy : number; }

//가로등·횃불 불꽃 파티클. 입자는 서브젝트가 아니라 페인트 머지 슬롯이라 입자마다 서브젝트·컴포넌트를 만들지 않는다.
//Emission·재질은 머지 단위라 색이 다른 샘플 3개를 두고, 입자 이동·축소·소멸은 SubjectUpdate에서 직접 갱신한다
export class CForgeFire extends CParticle
{
    static sKey = "forgeFlame.mesh";
    static sLife = 0.7;
    static sEmissive = 3;

    //가장자리는 광원 색 그대로, 불꽃 속은 같은 색을 밝게 띄운 색. 점광원·발광 메시와 같은 색을 쓴다
    private mColor : number[][];
    private mMergeColor = new Map<CPaintMerge, number[]>();
    private mFlame : IForgeFlame[] = [];
    private mScale : number;
    private mUp : number;
    private mSpread : number;

    static Mesh(_frame : CFrame)
    {
        if(_frame.Res().Find(CForgeFire.sKey) != null) return;
        const b = new CForgeMeshBuf();
        CForgeTowerGen.Lathe(b, 0, 0, [[0, -0.008], [0.006, -0.006], [0.01, 0], [0.008, 0.012], [0.004, 0.02], [0, 0.026]], 8);
        b.Commit(_frame, CForgeFire.sKey, _frame.Pal().GetBlackTex());
    }

    constructor(_frame : CFrame, _f : IForgeFire)
    {
        super();
        CForgeFire.Mesh(_frame);
        const U = CForgeScene.sUnit, k = _f.rgb;
        this.mScale = _f.r * U * 0.7;
        this.mUp = _f.h * U / CForgeFire.sLife;
        this.mSpread = _f.r * U * 0.35;
        this.SetPos(new CVec3(_f.pos[0] * U, _f.pos[1] * U, _f.pos[2] * U));
        this.mColor = [0, 0.5, 1].map(t => [k[0], k[1] + (1 - k[1]) * 0.5 * t, k[2] + (1 - k[2]) * 0.4 * t]);

        const samples = this.mColor.map(() =>
        {
            const pt = new CPaint3D(CForgeFire.sKey);
            pt.PushTag(CPaint.eTag.Light);
            return pt;
        });
        this.mSample = new CSampList<CSubject | string | CPaint>(samples);
        this.mCreateCount = new CSampler<number>(1);
        this.mTimer = new CSchedule(0.07, 0);
    }

    private Init(_merge : CPaintMerge) : void
    {
        const c = this.mColor[this.mMergeColor.size % this.mColor.length];
        this.mMergeColor.set(_merge, c);
        _merge.SetColorModel(new CColor(1, 1, 1, CColor.eModel.RGBAdd));
        _merge.SetMaterial(-1, -1, CForgeFire.sEmissive, 1);
        _merge.SetEmission(new CColor(c[0], c[1], c[2], SDF.eColorModel.RGBMul));
    }

    override LineUp(_objList : Array<CSubject | CParticlePaint>)
    {
        for(const obj of _objList)
        {
            if(obj instanceof CParticlePaint == false) continue;
            if(this.mMergeColor.has(obj.mMerge) == false) this.Init(obj.mMerge);
            const a = Math.random() * Math.PI * 2, d = Math.random() * this.mSpread, drift = this.mUp * 0.12;
            this.mFlame.push({ pp : obj, age : 0, x : Math.cos(a) * d, z : Math.sin(a) * d, vx : (Math.random() - 0.5) * drift, vz : (Math.random() - 0.5) * drift, vy : this.mUp * (0.8 + 0.4 * Math.random()) });
        }
    }

    override async SubjectUpdate(_update : CUpdate)
    {
        await super.SubjectUpdate(_update);
        const dt = _update.FixedTime(), life = CForgeFire.sLife, fl = this.mFlame;
        for(let i = fl.length - 1; i >= 0; i--)
        {
            const f = fl[i];
            f.age += dt;
            if(f.age >= life)
            {
                f.pp.Remove();
                fl[i] = fl[fl.length - 1];
                fl.pop();
                continue;
            }
            const s = this.mScale * (1 - 0.9 * f.age / life), m = f.pp.mMat.mF32A;
            m[0] = s; m[5] = s * 1.3; m[10] = s;
            f.pp.SetPos({ x : f.x + f.vx * f.age, y : f.vy * f.age, z : f.z + f.vz * f.age });
        }
    }
}

//가로등·횃불 점광원. 광원 색(rgb)과 도달 반경을 들고 있어 세기만 바꿔 켜고 끈다(SetEnable 대신 색 0 + 반경 최소)
export class CForgeLight extends CLight
{
    private mBase : number[];
    private mRange : number;
    private mShadow = false;
    private static sId = 0;
    private mId = ++CForgeLight.sId;

    constructor(_l : IForgeLight)
    {
        super();
        this.mBase = _l.rgb;
        this.mRange = _l.r * CForgeScene.sUnit;
    }

	SetShadow(_on : boolean)
    {
        if(this.mShadow == _on) return;
        this.mShadow = _on;
        if(_on) this.SetShadow3D("ForgeLamp" + this.mId, 0);
        else this.RemoveShadow();
    }
    SetPower(_k : number)
    {
        const b = this.mBase;
        this.SetColor(new CVec3(b[0] * _k, b[1] * _k, b[2] * _k));
        this.SetPoint(_k > 0 ? this.mRange : 1, this.mRange * 0.2);
    }
}

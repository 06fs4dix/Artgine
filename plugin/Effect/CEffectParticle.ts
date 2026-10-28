import { CAniFlow } from "../../artgine/app/component/CAniFlow.js";
import { CAnimation, CClipAlpha, CClipDestroy } from "../../artgine/app/component/CAnimation.js";
import { CForce } from "../../artgine/app/component/CForce.js";
import { CRigidBody } from "../../artgine/app/component/CRigidBody.js";
import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";
import { CParticleOut } from "../../artgine/app/subject/CParticle.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CPool } from "../../artgine/basic/CPool.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CAlpha } from "../../artgine/render/CAlpha.js";
import { CColor } from "../../artgine/render/CColor.js";
import { CSampler, CSampList } from "../../artgine/util/CSampler.js";
import { CSchedule } from "../../artgine/util/CSchedule.js";
import { CEffectMgr } from "./CEffectMgr.js";
import { CEffectPrim, TRGB } from "./CEffectPrim.js";
import { IEffectOption } from "./CEffectSubject.js";

const SPARK = [
    { key: "fxSparkS", life: 0.26, size: 1.6 },
    { key: "fxSparkM", life: 0.38, size: 2.6 },
    { key: "fxSparkL", life: 0.5, size: 3.6 },
];

// 버스트: 한 번에 여러 입자를 사방(또는 지정 방향 부채꼴)으로 뿌리고, 속도가 선형으로 줄며 사라진다
export class CBurstParticle extends CParticleOut
{
    mColor: TRGB = [1, 1, 1];
    mSpeedMax = 100;
    mAngle: number = null;
    mSpread = Math.PI * 2;

    override LineUp(_objList: Array<CSubject>)
    {
        super.LineUp(_objList);
        for (const obj of _objList)
        {
            const c = this.mColor;
            obj.FindComp(CPaint2D).SetColorModel(new CColor(c[0], c[1], c[2], CColor.eModel.RGBMul));
            const rb = obj.FindComp(CRigidBody);
            const force = rb.GetForceArr().find((f: CForce) => f.mKey == this.mMovementKey);
            const a = this.mAngle == null ? Math.random() * Math.PI * 2 : this.mAngle + (Math.random() - 0.5) * this.mSpread;
            const speed = this.mSpeedMax * (0.3 + 0.7 * Math.random());
            const begin = new CVec3(Math.cos(a), Math.sin(a), 0), end = new CVec3(Math.cos(a), Math.sin(a), 0);
            force.SetDirVel(begin, speed, end, 0);
            const info = SPARK.find(s => obj.GetRecycleType() == s.key);
            force.SetDelay(info ? info.life : 0.4);
        }
    }
}

let sPoolReady = false;

function InitPool()
{
    if (sPoolReady) return;
    sPoolReady = true;
    for (const s of SPARK)
    {
        CPool.On(s.key, () =>
        {
            const sub = new CSubject();
            sub.PushComp(CEffectPrim.Solid(s.size, s.size, false));
            const ani = new CAnimation();
            ani.mLoop = false;
            ani.Push(new CClipAlpha(0, s.life, new CAlpha(1), new CAlpha(0)));
            ani.Push(new CClipDestroy(s.life));
            sub.PushComp(new CAniFlow(ani));
            return sub;
        }, CPool.ePool.Product);
        CPool.On(s.key, (_r: any) =>
        {
            const pt = _r.FindComp(CPaint2D);
            if (pt != null) pt.SetAlphaModel(new CAlpha(1, 0.002));
        }, CPool.ePool.Recycle);
    }
}

CEffectMgr.OnInit(() => InitPool());

// 옵션: color, count(12), speed(90), scale, angle(방향, 없으면 사방), spread, small(작은 입자만)
CEffectMgr.Register("burst", (_o: IEffectOption) =>
{
    const par = new CBurstParticle();
    par.mColor = _o.color ?? [1, 1, 1];
    par.mSpeedMax = _o.speed ?? 90;
    par.mAngle = _o.angle ?? null;
    par.mSpread = _o.spread ?? Math.PI * 2;
    par.mSample = new CSampList<CSubject | string>(_o.small ? [SPARK[0].key] : SPARK.map(s => s.key));
    par.mCreateCount = new CSampler<number>(_o.count ?? 12);
    par.mTimer = new CSchedule(0, 1);
    return par;
});

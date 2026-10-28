import { CUpdate } from "../../artgine/basic/Basic.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CBound } from "../../artgine/geometry/CBound.js";
import { CColor } from "../../artgine/render/CColor.js";
import { CCanvas } from "../../artgine/app/canvas/CCanvas.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CComponent } from "../../artgine/app/component/CComponent.js";
import { CCollider } from "../../artgine/app/component/CCollider.js";
import { CPaint } from "../../artgine/app/component/paint/CPaint.js";
import { CPaint3D } from "../../artgine/app/component/paint/CPaint3D.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { SDF } from "../../artgine/z_file/SDF.js";
import { CForgeScene, ForgeV2, IForgeEntity, IForgeInterior } from "./CForgeScene.js";
import { CForgePoly } from "./CForgePoly.js";
import { CLODSwitch } from "../../artgine/app/component/CLODSwitch.js";
import { CLOD } from "../../artgine/app/component/CLOD.js";
import { CForgeAdjust, IForgeBuildingR } from "./CForgeAdjust.js";
import { CForgeGen } from "./CForgeGen.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeGround } from "./CForgeGround.js";
import { CForgeCollide } from "./CForgeCollide.js";
import { ForgeGround } from "./CForgeShape.js";
import { IForgePart, IForgeAnim } from "./CForgeMeshBuf.js";
import { CForgeFire, CForgeLight, IForgeLight } from "./CForgeFire.js";
import { CForgeHouseGen } from "./CForgeHouseGen.js";
import { CSubjectForge } from "./CSubjectForge.js";
//import { CForgeMerged, CForgeMergeOpt } from "./CForgeMerge.js";

//export { CForgeMerged, CForgeMergeOpt } from "./CForgeMerge.js";
export { CSubjectForge } from "./CSubjectForge.js";
export { CForgeScene } from "./CForgeScene.js";
export { CForgeHistory } from "./CForgeHistory.js";
export { CForgeAdjust } from "./CForgeAdjust.js";
export { CForgeWallGen } from "./CForgeWallGen.js";
export { CForgeGeoTest } from "./CForgeGeoTest.js";
export { CForgeSpline } from "./CForgeSpline.js";
import { CForgeTheme } from "./CForgeTheme.js";
export { CForgeTheme } from "./CForgeTheme.js";

//생성 옵션(모든 종류 공통). 0은 자동
export class CForgeOption
{
    mTheme = "europe_medieval_northwest";     //타입(CForgeTheme, "양식_시대[_지역]": europe_medieval_northwest·korea_earlymodern·china_earlymodern_north…)
    mSize = 0;              //벽 = 두께, 탑 = 반지름, 길·다리·계단·선착장 = 폭, 조형물 = 바닥 폭, 울타리 = 높이, 집 = 층수 (m, 집만 층)
    mStyle = 0;             //벽 = 1 민짜 · 2 성벽 · 3 정원담 / 탑 = 1 원뿔 · 2 평지붕 · 3 사각 원뿔 · 4 사각 평지붕 / 집 = 1 박공 · 2 모임 / 길 = 1 흙 · 2 돌 / 다리·계단·교회 = 1 돌 · 2 나무 / 조형물 = 1 낮은 탑(삼층) · 2 높은 탑(오층)
    mWall = -1;             //집 벽 재질 = -1 테마 · 0 회벽 · 1 널판 · 2 통나무 · 3 돌
    mRoof = -1;             //집 지붕 재질 = -1 테마 · 0 기와 · 1 초가 · 2 너와
    mInterior : IForgeInterior = null;   //집 실내(null이면 안 만든다). { enable, concept : modern·hanok·machiya·medieval, kitchen·bath : true·false·"auto", density : 0~1 }. 직각 평면의 회벽·판자·통나무·돌·벽돌집만 만들고, 가까운 단계(LOD 0)에서만 보인다
    mOverride : Partial<CForgeTheme> = null;   //이 오브젝트만 테마 항목을 덮어쓴다(예: { mShutter : [[0.6, 0.2, 0.2]] }). 재질 종류(mHouseWall·mRoofKind·mWallKind·mTowerKind)도 된다
    mAngle : number = null; //조형물(가로등·상점 포함) 정면 방향 라디안(엔진 x축 기준 atan2(z, x)). 없으면 가까운 길을 향하거나 나란히 선다
    mSeed = 0;              //변화용 시드. 0이면 처음 Push 때 무작위로 정해 이 옵션에 기록한다(같은 옵션 객체를 다시 넘기면 색·창 배치가 고정된다)
    mAffect = true;         //다른 오브젝트와 맞물림(벽-탑 접합, 벽에 기댄 집, 길에 문)
    mNormal = true;         //노말맵(텍스처 1장 더 읽음)
    mMaterial = true;       //재질맵: AO·거칠기(텍스처 1장 더 읽음)
    mParallax = true;       //패럴랙스(픽셀마다 수십 번 읽어 가장 비싸다. 노말맵이 켜져 있어야 동작)
    mPBR = false;           //재질맵을 PBR 값으로(낮은 거칠기·납선 금속·홈만 있는 AO). 램버트용 맵은 그대로 남는다
    mReal = false;          //실사 텍스처(색이 구워진 알베도·잔주름 노말·실사 재질). 끄면 밝기 무늬
    constructor(_init : Partial<CForgeOption> = null) { if(_init != null) Object.assign(this, _init); }
}

interface IForgeSurfOpt { nor : boolean; mat : boolean; px : boolean; pbr : boolean; real : boolean; }
interface IForgePushed { kind : string; ent : IForgeEntity; affect : boolean; surf : IForgeSurfOpt; }
interface IForgeOwn { kind : string; sig : string; r : any; keys : string[]; verts : number; hulls? : number[][][]; }

class CForgeFactoryTick extends CComponent
{
    mFactory : CForgeFactory;
    constructor(_f : CForgeFactory) { super(); this.mFactory = _f; }
    override Update(_update : CUpdate) : void { super.Update(_update); this.mFactory.ReleasePending(); }
}

//절차적 건물 공장. Push로 장면 전체를 넣고 Build 한 번으로 만든다.
//Build는 "이번에 Push한 것이 전체"로 본다: 자동 조정을 한 번에 해서 서로 맞물리게 하고, 결과가 이전과 같은 것은 서브젝트를 그대로 쓰며,
//다시 Push하지 않은 이전 오브젝트는 지운다. 점은 엔진 월드 좌표 CVec3이고 바닥 점의 y가 바닥 높이, 상단 점의 y가 윗높이다
export class CForgeFactory
{
    static eType = { House : "house", Wall : "wall", Tower : "tower", Fence : "fence", Path : "path", Bridge : "bridge", Stair : "stair", Church : "church", Dock : "dock", Monument : "monument", Lamp : "lamp", Shop : "shop" } as const;
    //가로등·상점은 조형물의 한 종류다. 타입의 조형물 형식을 이 값으로 덮어쓴다(양식·시대는 타입이 그대로 정한다)
    private static sMonument : Record<string, number> = { lamp : CForgeTheme.eMonument.Lamp, shop : CForgeTheme.eMonument.Shop };
    private static sKind : Record<string, string> = { house : CForgeScene.eKind.Building, wall : CForgeScene.eKind.Wall, tower : CForgeScene.eKind.Tower, fence : CForgeScene.eKind.Fence, path : CForgeScene.eKind.Path,
        bridge : CForgeScene.eKind.Bridge, stair : CForgeScene.eKind.Stair, church : CForgeScene.eKind.Church, dock : CForgeScene.eKind.Dock, monument : CForgeScene.eKind.Monument,
        lamp : CForgeScene.eKind.Monument, shop : CForgeScene.eKind.Monument };
    private static sCount = 0;
    //실내가 꺼지는 건물 중심과 카메라 사이 거리(m)와 경계 떨림 방지 비율
    static sInteriorLOD = 30;
    static sInteriorHys = 0.2;

    mCanvas : CCanvas;
    mPush : IForgePushed[] = [];
    mOwn = new Map<CSubject, IForgeOwn>();
    mCache = new Map<string, CSubject[]>();
    mPend : { keys : string[], wait : number }[] = [];
    mId : number;
    mVer = 0;
    mVerts = 0;
    mLastMs = 0;
    mLastCount = 0;
    mLayer = "forgebuild";
    mCollide : string[] = [];
    mEvent = CCollider.eEvent.Static;
    mCollider = true;
    //지형 높이 조회(엔진 좌표 x, z → y). 있으면 길·울타리·다리·계단이 점 사이도 실제 지형을 따라간다(없으면 넘겨준 점 높이를 직선 보간해 언덕에 묻힐 수 있다)
    mGround : (_x : number, _z : number) => number = null;

    constructor(_canvas : CCanvas, _unit : number = 100)
    {
        this.mCanvas = _canvas;
        this.mId = ++CForgeFactory.sCount;
        CForgeScene.sUnit = _unit;
        CForgeTex.Build(_canvas.GetFrame());
        _canvas.PushSub(new CSubject()).PushComp(new CForgeFactoryTick(this));
    }

    SetCollider(_layer : string, _collide : string[], _event : number = CCollider.eEvent.Static, _enable : boolean = true)
    {
        this.mLayer = _layer; this.mCollide = _collide; this.mEvent = _event; this.mCollider = _enable;
    }

    //데이터만 쌓는다. 반환값은 이번 Build 결과 배열의 위치
    Push(_type : string, _bottom : CVec3[], _top : CVec3[] = null, _opt : CForgeOption = null) : number
    {
        const kind = CForgeFactory.sKind[_type];
        if(kind == null || _bottom == null || _bottom.length == 0) return -1;
        const opt = _opt ?? new CForgeOption();
        const ent = this.ToEntity(kind, _bottom, _top, opt) as any, mon = CForgeFactory.sMonument[_type];
        if(mon != null) ent.over = { ...(ent.over ?? {}), mMonument : mon };
        this.mPush.push({ kind, ent, affect : opt.mAffect, surf : { nor : opt.mNormal, mat : opt.mMaterial, px : opt.mNormal && opt.mParallax, pbr : opt.mPBR, real : opt.mReal } });
        return this.mPush.length - 1;
    }

    //쌓인 전체를 한 번에 자동 조정·생성. Push 순서대로 서브젝트를 돌려준다(빈 입력이면 null)
    Build() : CSubject[]
    {
        const t0 = performance.now(), items = this.mPush;
        this.mPush = [];
        const scene = new CForgeScene(1);
        for(const it of items) if(it.affect) it.ent = scene.Push(it.kind, it.ent);
        const old = this.mCache, next = new Map<string, CSubject[]>(), out : CSubject[] = [];
        let built = 0;
        for(const it of items)
        {
            const r = CForgeAdjust.Run(it.kind, it.ent, scene);
            if(r == null) { out.push(null); continue; }
            const sig = JSON.stringify([it.kind, r, (it.ent as any).gy, it.kind == CForgeScene.eKind.Wall ? (it.ent as any).pts : null, it.surf]);
            let sub = old.get(sig)?.pop() ?? null;
            if(sub == null)
            {
                sub = this.mCanvas.PushSub(new CSubjectForge());
                (sub as CSubjectForge).mBlockEvent = this.mEvent;
                const g = this.Ground(it.kind, it.ent);
                const o : IForgeOwn = { kind : it.kind, sig, r, keys : [], verts : 0 };
                this.mOwn.set(sub, o);
                const inter = this.Attach(sub, o, CForgeGen.Build(it.kind, r, g), this.mCollider ? CForgeCollide.Build(it.kind, r, g) : [], it.surf);
                if(inter != null) this.InteriorLOD(sub, inter, r, it.ent);
                built++;
            }
            if(!next.has(sig)) next.set(sig, []);
            next.get(sig).push(sub);
            out.push(sub);
        }
        for(const subs of old.values())
            for(const sub of subs)
            {
                const o = this.mOwn.get(sub);
                if(o != null) this.Clear(sub, o);
                this.mOwn.delete(sub);
                sub.Destroy();
            }
        this.mCache = next;
        this.mLastCount = built;
        this.mLastMs = performance.now() - t0;
        return out;
    }

/*
    //움직이는 부품을 닫힌 자세(진행도 0) 그대로 월드 자리에 구운 정적 부품으로 바꾼다. 합친 메시는 부품을 따로 움직일 수 없다
    private static Bake(_p : IForgePart) : IForgePart
    {
        const a = _p.anim;
        return { buf : _p.buf.Moved(a.pivot[0], a.pivot[1], a.pivot[2]), rgb : _p.rgb, tex : _p.tex, glow : _p.glow, emit : _p.emit };
    }

    //넓은 맵용: 쌓인 전체를 거리 단계 3개로 만들어 타일·청크마다 한 메시로 합친다(집은 단계마다 따로 생성, 그 밖은 같은 모양을 모든 단계에).
    //개별 서브젝트·충돌체는 만들지 않는다. 결과의 Update(카메라 수평 위치 m)를 주기적으로 불러 단계를 바꾼다
    BuildMerged(_opt : CForgeMergeOpt = new CForgeMergeOpt()) : CForgeMerged
    {
        const t0 = performance.now(), items = this.mPush;
        this.mPush = [];
        const scene = new CForgeScene(1);
        for(const it of items) if(it.affect) it.ent = scene.Push(it.kind, it.ent);
        const out = new CForgeMerged(this.mCanvas, _opt);
        let n = 0;
        for(const it of items)
        {
            const r = CForgeAdjust.Run(it.kind, it.ent, scene);
            if(r == null) continue;
            const g = this.Ground(it.kind, it.ent);
            const lod = it.kind == CForgeScene.eKind.Building ? [0, 1, 2].map(_l => CForgeHouseGen.Build(r, g, _l).map(_p => _p.anim == null ? _p : CForgeFactory.Bake(_p))) : null;
            if(lod != null) CForgeHouseGen.sLod = 0;
            const parts = lod ?? [CForgeGen.Build(it.kind, r, g)];
            const bound = CForgeMerged.Bound(parts[parts.length - 1]);
            if(!(bound[0] <= bound[2])) continue;
            out.Add(bound, lod ?? [parts[0], parts[0], parts[0]]);
            n++;
        }
        out.Commit();
        this.mLastCount = n;
        this.mLastMs = performance.now() - t0;
        return out;
    }
*/

    //자동 조정 결과(높이·문 위치·지붕 종류 등). 편집기가 핸들 위치를 잡을 때 쓴다
    GetResolved(_sub : CSubject) : any { return this.mOwn.get(_sub)?.r ?? null; }

    //충돌 볼록체(점 3개씩 삼각형 목록, m)를 모아 돌려준다. 1인칭 걷기처럼 엔진 물리와 따로 삼각형 충돌을 하는 쪽이 쓴다.
    //움직이는 부품의 충돌체는 빠지니 CSubjectForge.GetBlockers를 함께 쓴다
    GetHulls() : number[][][]
    {
        const out : number[][][] = [];
        for(const o of this.mOwn.values()) if(o.hulls != null) out.push(...o.hulls);
        return out;
    }
    GetForgeSubs() : CSubjectForge[] { return [...this.mOwn.keys()].filter(_s => _s instanceof CSubjectForge) as CSubjectForge[]; }

    //──────────── 내부 ────────────

    //점 배열·옵션을 내부 의도 데이터로 바꾼다(m). 상단이 없으면 높이는 자동 규칙
    private ToEntity(_kind : string, _bottom : CVec3[], _top : CVec3[], _o : CForgeOption) : IForgeEntity
    {
        const U = CForgeScene.sUnit, K = CForgeScene.eKind;
        const p = _bottom.map(v => [v.x / U, v.z / U, v.y / U]);
        const xz = p.map(q => [q[0], q[1]] as ForgeV2), gy = p.map(q => q[2]);
        const top = _top != null && _top.length > 0 ? _top.map(v => v.y / U) : null;
        const Hof = (_i : number) => top == null ? null : Math.max(0.3, (top.length == p.length ? top[_i] : top[0]) - p[_i][2]);
        //시드를 위치로 정하면 점을 옮길 때마다 색·창 배치가 바뀐다. 없으면 한 번만 무작위로 정해 옵션에 남긴다
        if(!(_o.mSeed > 0)) _o.mSeed = 1 + Math.floor(Math.random() * 2147483646);
        const seed = _o.mSeed;
        const base = { id : 0, seed, theme : _o.mTheme, style : _o.mStyle, wall : _o.mWall, roofKind : _o.mRoof, over : _o.mOverride };
        if(_kind == K.Building)
        {
            const ob = CForgePoly.OBB(CForgePoly.Orient(xz)), w = ob.vMax - ob.vMin;
            let height = _o.mSize > 0 ? _o.mSize * 2.8 + 0.6 : w < 5.5 ? 3.4 : w < 8.5 ? 5.8 : 8.2;
            if(top != null) { let s = 0; for(let i = 0; i < p.length; i++) s += Hof(i); height = s / p.length; }
            const roof = _o.mStyle == 1 ? CForgeScene.eRoof.Gable : _o.mStyle == 2 ? CForgeScene.eRoof.Hip : CForgeScene.eRoof.Auto;
            return { ...base, poly : xz, height, roof, roofH : 0, glue : [], gy, interior : _o.mInterior ?? undefined } as IForgeEntity;
        }
        if(_kind == K.Wall)
        {
            let len = 0;
            for(let i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
            const ring = p.length >= 3 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 2;
            const auto = _o.mStyle == 3 ? 1.4 : ring ? 6.5 : len < 15 ? 2.2 : 4.5;
            return { ...base, pts : p.map((q, i) => [q[0], q[1], Hof(i) ?? auto, q[2]]), thick : _o.mSize } as IForgeEntity;
        }
        if(_kind == K.Tower)
        {
            const r = _o.mSize > 0 ? _o.mSize : p.length > 1 ? Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) : 2.5;
            const R = CForgeScene.eRoof, st = _o.mStyle;
            const roof = st == 1 || st == 3 ? R.Cone : st == 2 || st == 4 ? R.Flat : R.Auto;
            return { ...base, c : xz[0], r, height : Hof(0) ?? r * 3.2, roof, roofH : 0, shape : st >= 3 ? 1 : 0, gy : gy[0] } as IForgeEntity;
        }
        if(_kind == K.Path) return { ...base, pts : xz, width : _o.mSize > 0 ? _o.mSize : 2.2, gy } as IForgeEntity;
        if(_kind == K.Church) return { ...base, poly : xz, gy } as IForgeEntity;
        if(_kind == K.Monument) return { ...base, c : xz[0], size : _o.mSize > 0 ? _o.mSize : 2.2, gy : gy[0], ang : _o.mAngle } as IForgeEntity;
        if(_kind == K.Dock) return { ...base, pts : xz, width : _o.mSize > 0 ? _o.mSize : 2, gy, hy : top == null ? null : p.map(() => top[0]) } as IForgeEntity;
        if(_kind == K.Bridge) return { ...base, pts : xz, width : _o.mSize > 0 ? _o.mSize : 3, gy } as IForgeEntity;
        if(_kind == K.Stair) return { ...base, pts : xz, width : _o.mSize > 0 ? _o.mSize : 1.6, gy, hy : top == null ? gy : p.map((_q, _i) => top.length == p.length ? top[_i] : top[top.length - 1]) } as IForgeEntity;
        return { ...base, pts : xz, gy, height : Hof(0) ?? (_o.mSize > 0 ? _o.mSize : 1.05) } as IForgeEntity;
    }

    private Ground(_kind : string, _e : any) : ForgeGround
    {
        const K = CForgeScene.eKind;
        if(_kind == K.Wall) return CForgeGround.Line(_e.pts.map((q : number[]) => [q[0], q[1], q[3] ?? 0]));
        if(_kind == K.Tower || (_kind == K.Monument && this.mGround == null)) { const y = _e.gy ?? 0; return () => y; }
        if(_kind == K.Building) return CForgeGround.Points(_e.poly.map((q : ForgeV2, i : number) => [q[0], q[1], _e.gy?.[i] ?? 0]));
        if(_kind == K.Church && this.mGround == null) return CForgeGround.Points(_e.poly.map((q : ForgeV2, i : number) => [q[0], q[1], _e.gy?.[i] ?? 0]));
        if(this.mGround != null) { const f = this.mGround, U = CForgeScene.sUnit; return (_x : number, _z : number) => f(_x * U, _z * U) / U; }
        return CForgeGround.Line(_e.pts.map((q : ForgeV2, i : number) => [q[0], q[1], _e.gy?.[i] ?? 0]));
    }

    //가로등·횃불의 점광원 세기(0이면 사실상 끈다). 라이트는 만들 때부터 항상 켜 두고 세기(색)와 범위만 바꾼다.
    //꺼진 CLight를 나중에 켜는 길(SetEnable)은 쓰지 않는다. 이미 만든 라이트는 서브젝트 트리에서 CForgeLight를 찾아 갱신하므로 따로 기억해 둘 것이 없다
    mPointLight = 0;
    mPointShadow = false;
    //점광원 그림자(큐브맵 6면을 그려 무겁다). 기본 꺼짐
    SetPointShadow(_on : boolean)
    {
        this.mPointShadow = _on;
        for(const sub of this.mOwn.keys()) for(const l of sub.FindComps(CForgeLight, true)) l.SetShadow(_on);
    }
    SetPointLight(_k : number)
    {
        this.mPointLight = _k;
        for(const sub of this.mOwn.keys()) for(const l of sub.FindComps(CForgeLight, true)) l.SetPower(_k);
    }
    private PushLight(_sub : CSubject, _l : IForgeLight)
    {
        const U = CForgeScene.sUnit, sub = new CSubject(), lig = sub.PushComp(new CForgeLight(_l));
        sub.SetPos(new CVec3(_l.pos[0] * U, _l.pos[1] * U, _l.pos[2] * U));
        lig.SetPower(this.mPointLight);
        lig.SetShadow(this.mPointShadow);
        _sub.PushChild(sub);
    }

    //실내 부품(interior)은 자식 서브젝트 하나로 묶어 돌려준다. 실내가 없으면 null
    private Attach(_sub : CSubject, o : IForgeOwn, _parts : IForgePart[], _convex : number[][][], _so : IForgeSurfOpt) : CSubject
    {
        const frame = this.mCanvas.GetFrame(), U = CForgeScene.sUnit, ver = ++this.mVer;
        o.hulls = _convex;
        let inter : CSubject = null;
        const Under = (_p : IForgePart) : CSubject =>
        {
            if(_p.interior != true) return _sub;
            if(inter == null) { inter = new CSubject(); _sub.PushChild(inter); }
            return inter;
        };
        //움직이는 부품(anim)은 key마다 자식 서브젝트 하나로 묶는다. 닫힌 자세의 충돌 볼록체도 그 자식에 붙는다
        const kids = new Map<string, CSubject>();
        const Kid = (_a : IForgeAnim, _under : CSubject) : CSubject =>
        {
            let k = kids.get(_a.key);
            if(k != null) return k;
            k = new CSubject();
            _under.PushChild(k);
            const cols : CCollider[] = [];
            if(this.mCollider && _a.hull != null && _a.hull.length >= 4)
            {
                const b = new CBound();
                b.SetType(CBound.eType.GJK);
                b.InitBound(_a.hull.map(q => new CVec3(q[0] * U, q[1] * U, q[2] * U)));
                const col = k.PushComp(new CCollider(b));
                col.SetLayer(this.mLayer);
                if(this.mCollide.length > 0) col.PushCollisionLayer(this.mCollide);
                col.SetEvent(this.mEvent);
                cols.push(col);
            }
            (_sub as CSubjectForge).AddPart(_a, k, cols);
            kids.set(_a.key, k);
            return k;
        };
        _parts.forEach((_p, _i) => {
            if(_p.fire != null) { _sub.PushChild(new CForgeFire(frame, _p.fire)); return; }
            if(_p.light != null) { this.PushLight(_sub, _p.light); return; }
            const key = `forge${this.mId}_${o.kind}_${ver}_${_i}.mesh`;
            if(!_p.buf.Commit(frame, key, _p.tex ?? frame.Pal().GetBlackTex(), _p.tex != null && _so.nor, _p.tex != null && _so.mat, _so.pbr, _p.tex != null && _so.real)) return;
            o.keys.push(key);
            o.verts += _p.buf.Count();
            const under = Under(_p);
            const pt = (_p.anim != null ? Kid(_p.anim, under) : under).PushComp(new CPaint3D(key));
            const rgb = _p.tex != null && _so.real ? CForgeTex.Scale(_p.tex, _p.rgb) : _p.rgb;
            if(_p.tex == null) pt.SetColorModel(new CColor(_p.rgb[0], _p.rgb[1], _p.rgb[2], CColor.eModel.RGBAdd));
            else
            {
                pt.SetColorModel(new CColor(rgb[0], rgb[1], rgb[2], CColor.eModel.RGBMul));
                pt.SetTexCodi(new CVec4(1 / CForgeTex.sMeter, 1 / CForgeTex.sMeter, CForgeTex.sUVOff, CForgeTex.sUVOff));
                const surf = _so.nor || _so.mat ? CForgeTex.Surf(_p.tex) : null;
                if(surf != null && _so.mat) { pt.SetMaterial(-1, -1, 1, -1); pt.PushTag("forgeMat"); }
                if(surf != null && _so.nor)
                {
                    //기본 HalfLambert는 노말맵 음영을 거의 지워 Lambert로 바꾼다
                    pt.PushCShaderAttr(new CShaderAttr("ligStep0", SDF.eLightStep0.Lambert));
                    if(_so.px && surf.mParallax > 0) pt.ParallaxNormal(surf.mParallax, CForgeTex.sParallaxNear, CForgeTex.sParallaxFar, 0);
                }
            }
            if(_p.glow) pt.PushTag("forgeGlow");
            if(_p.emit != null) { pt.SetEmission(new CColor(_p.emit[0], _p.emit[1], _p.emit[2], SDF.eColorModel.RGBMul)); pt.PushTag("forgeEmit"); }
            pt.PushTag(CPaint.eTag.Light);
            pt.PushTag(CPaint.eTag.Shadow);
            pt.PushTag("shadowMulti");
            if(_p.noShadow) pt.PushTag(CPaint.eTag.ShadowReadOnly);
        });
        this.mVerts += o.verts;
        for(const pts of _convex)
        {
            const b = new CBound();
            b.SetType(CBound.eType.GJK);
            b.InitBound(pts.map(q => new CVec3(q[0] * U, q[1] * U, q[2] * U)));
            const col = _sub.PushComp(new CCollider(b));
            col.SetLayer(this.mLayer);
            if(this.mCollide.length > 0) col.PushCollisionLayer(this.mCollide);
            col.SetEvent(this.mEvent);
        }
        return inter;
    }

    //실내는 멀면 끈다. 건물 서브젝트는 원점에 있고 메시가 월드 좌표라서, 거리는 건물 중심에 둔 앵커 서브젝트로 잰다.
    //스위치를 실내 서브젝트 밖에 둬야 실내가 꺼져도 돈다. 처음에는 꺼 두고 스위치가 가까울 때 켠다
    private InteriorLOD(_sub : CSubject, _inter : CSubject, _r : IForgeBuildingR, _e : any)
    {
        const U = CForgeScene.sUnit, n = _r.poly.length, gy : number[] = _e.gy ?? [];
        let cx = 0, cz = 0, cy = 0;
        for(const q of _r.poly) { cx += q[0]; cz += q[1]; }
        for(const y of gy) cy += y;
        cx /= n; cz /= n; cy = (gy.length > 0 ? cy / gy.length : 0) + _r.height * 0.5;
        const anchor = new CSubject();
        anchor.SetPos(new CVec3(cx * U, cy * U, cz * U));
        _sub.PushChild(anchor);
        _inter.SetEnable(false);
        const R = CForgeFactory.sInteriorLOD * U;
        anchor.PushComp(new CLODSwitch()).AddLODLevel([
            new CLOD(null, 1, 0, 0, [], [], -1, _inter),
            new CLOD(null, 1, R, R * CForgeFactory.sInteriorHys),
        ]);
    }

    //페인트·콜라이더를 떼고 메시는 두 틱 뒤 GPU에서 내린다(같은 프레임에 아직 그려질 수 있다)
    private Clear(_sub : CSubject, o : IForgeOwn)
    {
        _sub.RemoveComps(CPaint3D);
        _sub.RemoveComps(CCollider);
        if(o.keys.length > 0) this.mPend.push({ keys : o.keys, wait : 2 });
        this.mVerts -= o.verts;
        o.keys = []; o.verts = 0;
    }

    ReleasePending()
    {
        if(this.mPend.length == 0) return;
        const frame = this.mCanvas.GetFrame(), keep : { keys : string[], wait : number }[] = [];
        for(const p of this.mPend)
        {
            if(--p.wait > 0) { keep.push(p); continue; }
            for(const key of p.keys)
            {
                const dm = "Artgine/DM/" + key;
                for(const [k, v] of [...frame.Res().mResMap])
                {
                    if(k.indexOf(dm) != 0) continue;
                    frame.Ren().ReleaseMeshDrawNode(v);
                    frame.Res().Remove(k);
                }
                frame.Res().Remove(key);
            }
        }
        this.mPend = keep;
    }
}

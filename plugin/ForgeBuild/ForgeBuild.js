import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CBound } from "../../artgine/geometry/CBound.js";
import { CColor } from "../../artgine/render/CColor.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CComponent } from "../../artgine/app/component/CComponent.js";
import { CCollider } from "../../artgine/app/component/CCollider.js";
import { CPaint } from "../../artgine/app/component/paint/CPaint.js";
import { CPaint3D } from "../../artgine/app/component/paint/CPaint3D.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { SDF } from "../../artgine/z_file/SDF.js";
import { CForgeScene } from "./CForgeScene.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeAdjust } from "./CForgeAdjust.js";
import { CForgeGen } from "./CForgeGen.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeGround } from "./CForgeGround.js";
import { CForgeCollide } from "./CForgeCollide.js";
import { CForgeHouseGen } from "./CForgeHouseGen.js";
import { CForgeMerged, CForgeMergeOpt } from "./CForgeMerge.js";
export { CForgeMerged, CForgeMergeOpt } from "./CForgeMerge.js";
export { CForgeScene } from "./CForgeScene.js";
export { CForgeHistory } from "./CForgeHistory.js";
export { CForgeAdjust } from "./CForgeAdjust.js";
export { CForgeWallGen } from "./CForgeWallGen.js";
export { CForgeGeoTest } from "./CForgeGeoTest.js";
export { CForgeSpline } from "./CForgeSpline.js";
import { CForgeTheme } from "./CForgeTheme.js";
export { CForgeTheme } from "./CForgeTheme.js";
export class CForgeOption {
    mTheme = "europe_medieval_northwest";
    mSize = 0;
    mStyle = 0;
    mWall = -1;
    mRoof = -1;
    mOverride = null;
    mAngle = null;
    mSeed = 0;
    mAffect = true;
    mNormal = true;
    mMaterial = true;
    mParallax = true;
    constructor(_init = null) { if (_init != null)
        Object.assign(this, _init); }
}
class CForgeFactoryTick extends CComponent {
    mFactory;
    constructor(_f) { super(); this.mFactory = _f; }
    Update(_update) { super.Update(_update); this.mFactory.ReleasePending(); }
}
export class CForgeFactory {
    static eType = { House: "house", Wall: "wall", Tower: "tower", Fence: "fence", Path: "path", Bridge: "bridge", Stair: "stair", Church: "church", Dock: "dock", Monument: "monument", Lamp: "lamp", Shop: "shop" };
    static sMonument = { lamp: CForgeTheme.eMonument.Lamp, shop: CForgeTheme.eMonument.Shop };
    static sKind = { house: CForgeScene.eKind.Building, wall: CForgeScene.eKind.Wall, tower: CForgeScene.eKind.Tower, fence: CForgeScene.eKind.Fence, path: CForgeScene.eKind.Path,
        bridge: CForgeScene.eKind.Bridge, stair: CForgeScene.eKind.Stair, church: CForgeScene.eKind.Church, dock: CForgeScene.eKind.Dock, monument: CForgeScene.eKind.Monument,
        lamp: CForgeScene.eKind.Monument, shop: CForgeScene.eKind.Monument };
    static sCount = 0;
    mCanvas;
    mPush = [];
    mOwn = new Map();
    mCache = new Map();
    mPend = [];
    mId;
    mVer = 0;
    mVerts = 0;
    mLastMs = 0;
    mLastCount = 0;
    mLayer = "forgebuild";
    mCollide = [];
    mEvent = CCollider.eEvent.Static;
    mCollider = true;
    mGround = null;
    constructor(_canvas, _unit = 100) {
        this.mCanvas = _canvas;
        this.mId = ++CForgeFactory.sCount;
        CForgeScene.sUnit = _unit;
        CForgeTex.Build(_canvas.GetFrame());
        _canvas.PushSub(new CSubject()).PushComp(new CForgeFactoryTick(this));
    }
    SetCollider(_layer, _collide, _event = CCollider.eEvent.Static, _enable = true) {
        this.mLayer = _layer;
        this.mCollide = _collide;
        this.mEvent = _event;
        this.mCollider = _enable;
    }
    Push(_type, _bottom, _top = null, _opt = null) {
        const kind = CForgeFactory.sKind[_type];
        if (kind == null || _bottom == null || _bottom.length == 0)
            return -1;
        const opt = _opt ?? new CForgeOption();
        const ent = this.ToEntity(kind, _bottom, _top, opt), mon = CForgeFactory.sMonument[_type];
        if (mon != null)
            ent.over = { ...(ent.over ?? {}), mMonument: mon };
        this.mPush.push({ kind, ent, affect: opt.mAffect, surf: { nor: opt.mNormal, mat: opt.mMaterial, px: opt.mNormal && opt.mParallax } });
        return this.mPush.length - 1;
    }
    Build() {
        const t0 = performance.now(), items = this.mPush;
        this.mPush = [];
        const scene = new CForgeScene(1);
        for (const it of items)
            if (it.affect)
                it.ent = scene.Push(it.kind, it.ent);
        const old = this.mCache, next = new Map(), out = [];
        let built = 0;
        for (const it of items) {
            const r = CForgeAdjust.Run(it.kind, it.ent, scene);
            if (r == null) {
                out.push(null);
                continue;
            }
            const sig = JSON.stringify([it.kind, r, it.ent.gy, it.kind == CForgeScene.eKind.Wall ? it.ent.pts : null, it.surf]);
            let sub = old.get(sig)?.pop() ?? null;
            if (sub == null) {
                sub = this.mCanvas.PushSub(new CSubject());
                const g = this.Ground(it.kind, it.ent);
                const o = { kind: it.kind, sig, r, keys: [], verts: 0 };
                this.mOwn.set(sub, o);
                this.Attach(sub, o, CForgeGen.Build(it.kind, r, g), this.mCollider ? CForgeCollide.Build(it.kind, r, g) : [], it.surf);
                built++;
            }
            if (!next.has(sig))
                next.set(sig, []);
            next.get(sig).push(sub);
            out.push(sub);
        }
        for (const subs of old.values())
            for (const sub of subs) {
                const o = this.mOwn.get(sub);
                if (o != null)
                    this.Clear(sub, o);
                this.mOwn.delete(sub);
                sub.Destroy();
            }
        this.mCache = next;
        this.mLastCount = built;
        this.mLastMs = performance.now() - t0;
        return out;
    }
    BuildMerged(_opt = new CForgeMergeOpt()) {
        const t0 = performance.now(), items = this.mPush;
        this.mPush = [];
        const scene = new CForgeScene(1);
        for (const it of items)
            if (it.affect)
                it.ent = scene.Push(it.kind, it.ent);
        const out = new CForgeMerged(this.mCanvas, _opt);
        let n = 0;
        for (const it of items) {
            const r = CForgeAdjust.Run(it.kind, it.ent, scene);
            if (r == null)
                continue;
            const g = this.Ground(it.kind, it.ent);
            const lod = it.kind == CForgeScene.eKind.Building ? [0, 1, 2].map(_l => CForgeHouseGen.Build(r, g, _l)) : null;
            if (lod != null)
                CForgeHouseGen.sLod = 0;
            const parts = lod ?? [CForgeGen.Build(it.kind, r, g)];
            const bound = CForgeMerged.Bound(parts[parts.length - 1]);
            if (!(bound[0] <= bound[2]))
                continue;
            out.Add(bound, lod ?? [parts[0], parts[0], parts[0]]);
            n++;
        }
        out.Commit();
        this.mLastCount = n;
        this.mLastMs = performance.now() - t0;
        return out;
    }
    GetResolved(_sub) { return this.mOwn.get(_sub)?.r ?? null; }
    ToEntity(_kind, _bottom, _top, _o) {
        const U = CForgeScene.sUnit, K = CForgeScene.eKind;
        const p = _bottom.map(v => [v.x / U, v.z / U, v.y / U]);
        const xz = p.map(q => [q[0], q[1]]), gy = p.map(q => q[2]);
        const top = _top != null && _top.length > 0 ? _top.map(v => v.y / U) : null;
        const Hof = (_i) => top == null ? null : Math.max(0.3, (top.length == p.length ? top[_i] : top[0]) - p[_i][2]);
        if (!(_o.mSeed > 0))
            _o.mSeed = 1 + Math.floor(Math.random() * 2147483646);
        const seed = _o.mSeed;
        const base = { id: 0, seed, theme: _o.mTheme, style: _o.mStyle, wall: _o.mWall, roofKind: _o.mRoof, over: _o.mOverride };
        if (_kind == K.Building) {
            const ob = CForgePoly.OBB(CForgePoly.Orient(xz)), w = ob.vMax - ob.vMin;
            let height = _o.mSize > 0 ? _o.mSize * 2.8 + 0.6 : w < 5.5 ? 3.4 : w < 8.5 ? 5.8 : 8.2;
            if (top != null) {
                let s = 0;
                for (let i = 0; i < p.length; i++)
                    s += Hof(i);
                height = s / p.length;
            }
            const roof = _o.mStyle == 1 ? CForgeScene.eRoof.Gable : _o.mStyle == 2 ? CForgeScene.eRoof.Hip : CForgeScene.eRoof.Auto;
            return { ...base, poly: xz, height, roof, roofH: 0, glue: [], gy };
        }
        if (_kind == K.Wall) {
            let len = 0;
            for (let i = 1; i < p.length; i++)
                len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
            const ring = p.length >= 3 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 2;
            const auto = _o.mStyle == 3 ? 1.4 : ring ? 6.5 : len < 15 ? 2.2 : 4.5;
            return { ...base, pts: p.map((q, i) => [q[0], q[1], Hof(i) ?? auto, q[2]]), thick: _o.mSize };
        }
        if (_kind == K.Tower) {
            const r = _o.mSize > 0 ? _o.mSize : p.length > 1 ? Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) : 2.5;
            const R = CForgeScene.eRoof, st = _o.mStyle;
            const roof = st == 1 || st == 3 ? R.Cone : st == 2 || st == 4 ? R.Flat : R.Auto;
            return { ...base, c: xz[0], r, height: Hof(0) ?? r * 3.2, roof, roofH: 0, shape: st >= 3 ? 1 : 0, gy: gy[0] };
        }
        if (_kind == K.Path)
            return { ...base, pts: xz, width: _o.mSize > 0 ? _o.mSize : 2.2, gy };
        if (_kind == K.Church)
            return { ...base, poly: xz, gy };
        if (_kind == K.Monument)
            return { ...base, c: xz[0], size: _o.mSize > 0 ? _o.mSize : 2.2, gy: gy[0], ang: _o.mAngle };
        if (_kind == K.Dock)
            return { ...base, pts: xz, width: _o.mSize > 0 ? _o.mSize : 2, gy, hy: top == null ? null : p.map(() => top[0]) };
        if (_kind == K.Bridge)
            return { ...base, pts: xz, width: _o.mSize > 0 ? _o.mSize : 3, gy };
        if (_kind == K.Stair)
            return { ...base, pts: xz, width: _o.mSize > 0 ? _o.mSize : 1.6, gy, hy: top == null ? gy : p.map((_q, _i) => top.length == p.length ? top[_i] : top[top.length - 1]) };
        return { ...base, pts: xz, gy, height: Hof(0) ?? (_o.mSize > 0 ? _o.mSize : 1.05) };
    }
    Ground(_kind, _e) {
        const K = CForgeScene.eKind;
        if (_kind == K.Wall)
            return CForgeGround.Line(_e.pts.map((q) => [q[0], q[1], q[3] ?? 0]));
        if (_kind == K.Tower || (_kind == K.Monument && this.mGround == null)) {
            const y = _e.gy ?? 0;
            return () => y;
        }
        if (_kind == K.Building)
            return CForgeGround.Points(_e.poly.map((q, i) => [q[0], q[1], _e.gy?.[i] ?? 0]));
        if (_kind == K.Church && this.mGround == null)
            return CForgeGround.Points(_e.poly.map((q, i) => [q[0], q[1], _e.gy?.[i] ?? 0]));
        if (this.mGround != null) {
            const f = this.mGround, U = CForgeScene.sUnit;
            return (_x, _z) => f(_x * U, _z * U) / U;
        }
        return CForgeGround.Line(_e.pts.map((q, i) => [q[0], q[1], _e.gy?.[i] ?? 0]));
    }
    Attach(_sub, o, _parts, _convex, _so) {
        const frame = this.mCanvas.GetFrame(), U = CForgeScene.sUnit, ver = ++this.mVer;
        _parts.forEach((_p, _i) => {
            const key = `forge${this.mId}_${o.kind}_${ver}_${_i}.mesh`;
            if (!_p.buf.Commit(frame, key, _p.tex ?? frame.Pal().GetBlackTex(), _p.tex != null && _so.nor, _p.tex != null && _so.mat))
                return;
            o.keys.push(key);
            o.verts += _p.buf.Count();
            const pt = _sub.PushComp(new CPaint3D(key));
            if (_p.tex == null)
                pt.SetColorModel(new CColor(_p.rgb[0], _p.rgb[1], _p.rgb[2], CColor.eModel.RGBAdd));
            else {
                pt.SetColorModel(new CColor(_p.rgb[0], _p.rgb[1], _p.rgb[2], CColor.eModel.RGBMul));
                pt.SetTexCodi(new CVec4(1 / CForgeTex.sMeter, 1 / CForgeTex.sMeter, CForgeTex.sUVOff, CForgeTex.sUVOff));
                const surf = _so.nor || _so.mat ? CForgeTex.Surf(_p.tex) : null;
                if (surf != null && _so.mat)
                    pt.SetMaterial(-1, -1, 1, -1);
                if (surf != null && _so.nor) {
                    pt.PushCShaderAttr(new CShaderAttr("ligStep0", SDF.eLightStep0.Lambert));
                    if (_so.px && surf.mParallax > 0)
                        pt.ParallaxNormal(surf.mParallax, CForgeTex.sParallaxNear, CForgeTex.sParallaxFar, 0);
                }
            }
            pt.PushTag(CPaint.eTag.Light);
            pt.PushTag(CPaint.eTag.Shadow);
        });
        this.mVerts += o.verts;
        for (const pts of _convex) {
            const b = new CBound();
            b.SetType(CBound.eType.GJK);
            b.InitBound(pts.map(q => new CVec3(q[0] * U, q[1] * U, q[2] * U)));
            const col = _sub.PushComp(new CCollider(b));
            col.SetLayer(this.mLayer);
            if (this.mCollide.length > 0)
                col.PushCollisionLayer(this.mCollide);
            col.SetEvent(this.mEvent);
        }
    }
    Clear(_sub, o) {
        _sub.RemoveComps(CPaint3D);
        _sub.RemoveComps(CCollider);
        if (o.keys.length > 0)
            this.mPend.push({ keys: o.keys, wait: 2 });
        this.mVerts -= o.verts;
        o.keys = [];
        o.verts = 0;
    }
    ReleasePending() {
        if (this.mPend.length == 0)
            return;
        const frame = this.mCanvas.GetFrame(), keep = [];
        for (const p of this.mPend) {
            if (--p.wait > 0) {
                keep.push(p);
                continue;
            }
            for (const key of p.keys) {
                const dm = "Artgine/DM/" + key;
                for (const [k, v] of [...frame.Res().mResMap]) {
                    if (k.indexOf(dm) != 0)
                        continue;
                    frame.Ren().ReleaseMeshDrawNode(v);
                    frame.Res().Remove(k);
                }
                frame.Res().Remove(key);
            }
        }
        this.mPend = keep;
    }
}

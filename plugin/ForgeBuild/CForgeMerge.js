import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CColor } from "../../artgine/render/CColor.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CPaint } from "../../artgine/app/component/paint/CPaint.js";
import { CPaint3D } from "../../artgine/app/component/paint/CPaint3D.js";
import { SDF } from "../../artgine/z_file/SDF.js";
import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeScene } from "./CForgeScene.js";
export class CForgeMergeOpt {
    mTile = 50;
    mChunk = 200;
    mNear = 60;
    mFar = 260;
    mHys = 12;
    mNormal = true;
    mParallax = true;
    mMaterial = true;
    mPBR = false;
    mReal = false;
    constructor(_init = null) { if (_init != null)
        Object.assign(this, _init); }
}
class CForgePack {
    static sMaxTex = 10;
    mPos = [];
    mUV = [];
    mNor = [];
    mRef = [];
    mIdx = [];
    mTex = [];
    mSlot = new Map();
    Count() { return this.mPos.length / 3; }
    Fits(_keys) {
        let add = 0;
        for (const k of new Set(_keys))
            if (k != null && !this.mSlot.has(k))
                add++;
        return this.mTex.length + add <= CForgePack.sMaxTex;
    }
    Slot(_k) {
        if (_k == null)
            return 0;
        let s = this.mSlot.get(_k);
        if (s == null) {
            s = this.mTex.length;
            this.mTex.push(_k);
            this.mSlot.set(_k, s);
        }
        return s;
    }
    Add(_b, _d, _n, _m) {
        const base = this.Count(), d = this.Slot(_d), n = this.Slot(_n), m = this.Slot(_m), c = _b.Count();
        for (let i = 0; i < _b.mPos.length; i++)
            this.mPos.push(_b.mPos[i]);
        for (let i = 0; i < _b.mUV.length; i++)
            this.mUV.push(_b.mUV[i]);
        for (let i = 0; i < _b.mNor.length; i++)
            this.mNor.push(_b.mNor[i]);
        for (let i = 0; i < c; i++)
            this.mRef.push(d, n, m);
        for (let i = 0; i < _b.mIdx.length; i++)
            this.mIdx.push(_b.mIdx[i] + base);
    }
}
class CForgeCell {
    mMin = [Infinity, Infinity];
    mMax = [-Infinity, -Infinity];
    mPack = new Map();
    mPaint = [];
    mOn = true;
    mNear = false;
    Grow(_b) { this.mMin[0] = Math.min(this.mMin[0], _b[0]); this.mMin[1] = Math.min(this.mMin[1], _b[1]); this.mMax[0] = Math.max(this.mMax[0], _b[2]); this.mMax[1] = Math.max(this.mMax[1], _b[3]); }
    Dist(_x, _z) {
        if (this.mMin[0] > this.mMax[0])
            return Infinity;
        return Math.hypot(Math.max(this.mMin[0] - _x, 0, _x - this.mMax[0]), Math.max(this.mMin[1] - _z, 0, _z - this.mMax[1]));
    }
    Show(_on) {
        if (this.mOn == _on)
            return;
        this.mOn = _on;
        for (const pt of this.mPaint)
            pt.SetEnable(_on);
    }
}
class CForgeChunk {
    mLod1 = new CForgeCell();
    mLod2 = new CForgeCell();
    mTile = new Map();
    mMixed = false;
    mFar = false;
}
export class CForgeMerged {
    static sCount = 0;
    mOpt;
    mCanvas;
    mChunk = new Map();
    mSub;
    mId;
    mVerts = [0, 0, 0];
    mMeshes = [0, 0, 0];
    constructor(_canvas, _opt) {
        this.mCanvas = _canvas;
        this.mOpt = _opt;
        this.mId = ++CForgeMerged.sCount;
        this.mSub = _canvas.PushSub(new CSubject());
    }
    Add(_bound, _lod) {
        const O = this.mOpt, cx = (_bound[0] + _bound[2]) * 0.5, cz = (_bound[1] + _bound[3]) * 0.5;
        const ck = Math.floor(cx / O.mChunk) + "_" + Math.floor(cz / O.mChunk), tk = Math.floor(cx / O.mTile) + "_" + Math.floor(cz / O.mTile);
        let ch = this.mChunk.get(ck);
        if (ch == null) {
            ch = new CForgeChunk();
            this.mChunk.set(ck, ch);
        }
        let t = ch.mTile.get(tk);
        if (t == null) {
            t = { l0: new CForgeCell(), l1: new CForgeCell() };
            ch.mTile.set(tk, t);
        }
        for (const c of [ch.mLod1, ch.mLod2, t.l0, t.l1])
            c.Grow(_bound);
        this.Put(t.l0, _lod[0], 0);
        this.Put(t.l1, _lod[1], 1);
        this.Put(ch.mLod1, _lod[1], 1);
        this.Put(ch.mLod2, _lod[2], 2);
    }
    Put(_c, _parts, _lod) {
        const O = this.mOpt;
        for (const p of _parts) {
            if (p.buf.mIdx.length == 0)
                continue;
            const surf = p.tex != null ? CForgeTex.Surf(p.tex) : null;
            const near = _lod == 0, ao = !near && surf != null && O.mMaterial ? CForgeTex.MeanAO(p.tex, O.mPBR, O.mReal) : 1;
            const d = p.tex != null ? CForgeTex.Tint(p.tex, p.rgb.map(_v => _v * ao), O.mReal) : CForgeTex.Solid(p.rgb);
            const n = near && O.mNormal && surf != null ? (O.mReal && surf.mNorR != null ? surf.mNorR : surf.mNor) : null;
            const mat = surf == null ? null : (O.mReal ? (O.mPBR ? surf.mMatPBRR : surf.mMatR) : (O.mPBR && surf.mMatPBR != null ? surf.mMatPBR : surf.mMat));
            const flat = O.mReal ? (O.mPBR ? CForgeTex.sFlatMatPBRR : CForgeTex.sFlatMatR) : (O.mPBR ? CForgeTex.sFlatMatPBR : CForgeTex.sFlatMat);
            const m = O.mMaterial ? (near && surf != null ? mat : flat) : null;
            const cls = n != null && O.mParallax && surf.mParallax > 0 ? "px" + surf.mParallax : "std";
            let list = _c.mPack.get(cls);
            if (list == null) {
                list = [];
                _c.mPack.set(cls, list);
            }
            let pk = list.find(_k => _k.Fits([d, n, m]));
            if (pk == null) {
                pk = new CForgePack();
                list.push(pk);
            }
            pk.Add(p.buf, d, n, m);
        }
    }
    Commit() {
        const frame = this.mCanvas.GetFrame();
        let k = 0;
        const Up = (_c, _lod) => {
            for (const [cls, list] of _c.mPack)
                for (const pk of list) {
                    if (pk.mIdx.length == 0)
                        continue;
                    const key = `forgemerge${this.mId}_${k++}.mesh`;
                    CForgeMeshBuf.ToMesh(frame, key, new Float32Array(pk.mPos), new Float32Array(pk.mUV), new Float32Array(pk.mNor), new Float32Array(pk.mRef), pk.mIdx, pk.mTex);
                    this.mVerts[_lod] += pk.Count();
                    this.mMeshes[_lod]++;
                    const pt = this.mSub.PushComp(new CPaint3D(key));
                    pt.SetColorModel(new CColor(1, 1, 1, CColor.eModel.RGBMul));
                    pt.SetTexCodi(new CVec4(1 / CForgeTex.sMeter, 1 / CForgeTex.sMeter, CForgeTex.sUVOff, CForgeTex.sUVOff));
                    if (this.mOpt.mMaterial)
                        pt.SetMaterial(-1, -1, 1, -1);
                    pt.PushCShaderAttr(new CShaderAttr("ligStep0", SDF.eLightStep0.Lambert));
                    if (this.mOpt.mPBR) {
                        pt.PushCShaderAttr(new CShaderAttr("ligStep1", SDF.eLightStep1.CookTorrance));
                        pt.Env();
                    }
                    if (cls.startsWith("px"))
                        pt.ParallaxNormal(Number(cls.slice(2)), CForgeTex.sParallaxNear, CForgeTex.sParallaxFar, 0);
                    pt.PushTag(CPaint.eTag.Light);
                    pt.PushTag(CPaint.eTag.Shadow);
                    _c.mPaint.push(pt);
                }
            _c.mPack = null;
        };
        for (const ch of this.mChunk.values()) {
            Up(ch.mLod1, 1);
            Up(ch.mLod2, 2);
            for (const t of ch.mTile.values()) {
                Up(t.l0, 0);
                Up(t.l1, 1);
            }
            ch.mLod1.Show(false);
            ch.mFar = true;
            for (const t of ch.mTile.values()) {
                t.l0.Show(false);
                t.l1.Show(false);
            }
        }
    }
    Update(_x, _z) {
        const O = this.mOpt;
        for (const ch of this.mChunk.values()) {
            const d = ch.mLod2.Dist(_x, _z);
            ch.mFar = ch.mFar ? d > O.mFar - O.mHys : d > O.mFar;
            let mixed = false;
            if (!ch.mFar)
                for (const t of ch.mTile.values()) {
                    const td = t.l0.Dist(_x, _z);
                    t.l0.mNear = t.l0.mNear ? td < O.mNear + O.mHys : td < O.mNear;
                    if (t.l0.mNear)
                        mixed = true;
                }
            ch.mLod2.Show(ch.mFar);
            ch.mLod1.Show(!ch.mFar && !mixed);
            for (const t of ch.mTile.values()) {
                t.l0.Show(mixed && t.l0.mNear);
                t.l1.Show(mixed && !t.l0.mNear);
            }
        }
    }
    Stat() {
        const on = [0, 0, 0], C = (_c, _l) => { if (_c.mOn)
            on[_l] += _c.mPaint.length; };
        for (const ch of this.mChunk.values()) {
            C(ch.mLod1, 1);
            C(ch.mLod2, 2);
            for (const t of ch.mTile.values()) {
                C(t.l0, 0);
                C(t.l1, 1);
            }
        }
        return { verts: this.mVerts, meshes: this.mMeshes, on };
    }
    static Bound(_parts) {
        const U = CForgeScene.sUnit, b = [Infinity, Infinity, -Infinity, -Infinity];
        for (const p of _parts) {
            const P = p.buf.mPos;
            for (let i = 0; i < P.length; i += 3) {
                const x = P[i] / U, z = P[i + 2] / U;
                if (x < b[0])
                    b[0] = x;
                if (z < b[1])
                    b[1] = z;
                if (x > b[2])
                    b[2] = x;
                if (z > b[3])
                    b[3] = z;
            }
        }
        return b;
    }
}

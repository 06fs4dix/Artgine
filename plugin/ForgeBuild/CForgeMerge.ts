import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CColor } from "../../artgine/render/CColor.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CCanvas } from "../../artgine/app/canvas/CCanvas.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CPaint } from "../../artgine/app/component/paint/CPaint.js";
import { CPaint3D } from "../../artgine/app/component/paint/CPaint3D.js";
import { SDF } from "../../artgine/z_file/SDF.js";
import { CForgeMeshBuf, IForgePart } from "./CForgeMeshBuf.js";
import { CForgeTex } from "./CForgeTex.js";
import { CForgeScene } from "./CForgeScene.js";

//합친 결과 옵션. 거리는 m(수평). 0단계는 타일, 1·2단계는 청크로 합친다
export class CForgeMergeOpt
{
    mTile = 50;
    mChunk = 200;
    mNear = 60;             //이 안의 타일은 0단계(전부)
    mFar = 260;             //청크가 이보다 멀면 2단계
    mHys = 12;              //경계에서 깜빡이지 않게 나갈 때 더 멀어져야 바뀐다
    mNormal = true;         //0단계 노말맵
    mParallax = true;       //0단계 패럴랙스
    mMaterial = true;       //재질맵(모든 단계, 단계가 바뀔 때 밝기가 튀지 않게)
    constructor(_init : Partial<CForgeMergeOpt> = null) { if(_init != null) Object.assign(this, _init); }
}

//메시 하나로 합칠 묶음. 정점마다 텍스처 칸 번호(기본·노말·재질)를 달아 색이 다른 집도 한 번에 그린다
class CForgePack
{
    static sMaxTex = 10;
    mPos : number[] = [];
    mUV : number[] = [];
    mNor : number[] = [];
    mRef : number[] = [];
    mIdx : number[] = [];
    mTex : string[] = [];
    mSlot = new Map<string, number>();
    Count() { return this.mPos.length / 3; }
    Fits(_keys : string[]) : boolean
    {
        let add = 0;
        for(const k of new Set(_keys)) if(k != null && !this.mSlot.has(k)) add++;
        return this.mTex.length + add <= CForgePack.sMaxTex;
    }
    Slot(_k : string) : number
    {
        if(_k == null) return 0;
        let s = this.mSlot.get(_k);
        if(s == null) { s = this.mTex.length; this.mTex.push(_k); this.mSlot.set(_k, s); }
        return s;
    }
    Add(_b : CForgeMeshBuf, _d : string, _n : string, _m : string)
    {
        const base = this.Count(), d = this.Slot(_d), n = this.Slot(_n), m = this.Slot(_m), c = _b.Count();
        for(let i = 0; i < _b.mPos.length; i++) this.mPos.push(_b.mPos[i]);
        for(let i = 0; i < _b.mUV.length; i++) this.mUV.push(_b.mUV[i]);
        for(let i = 0; i < _b.mNor.length; i++) this.mNor.push(_b.mNor[i]);
        for(let i = 0; i < c; i++) this.mRef.push(d, n, m);
        for(let i = 0; i < _b.mIdx.length; i++) this.mIdx.push(_b.mIdx[i] + base);
    }
}

//합친 칸(0단계 타일 / 1·2단계 청크·타일). 패럴랙스는 페인트 단위라 패럴랙스 재질은 따로 묶는다
class CForgeCell
{
    mMin = [Infinity, Infinity];
    mMax = [-Infinity, -Infinity];
    mPack = new Map<string, CForgePack[]>();
    mPaint : CPaint3D[] = [];
    mOn = true;
    mNear = false;
    Grow(_b : number[]) { this.mMin[0] = Math.min(this.mMin[0], _b[0]); this.mMin[1] = Math.min(this.mMin[1], _b[1]); this.mMax[0] = Math.max(this.mMax[0], _b[2]); this.mMax[1] = Math.max(this.mMax[1], _b[3]); }
    Dist(_x : number, _z : number) : number
    {
        if(this.mMin[0] > this.mMax[0]) return Infinity;
        return Math.hypot(Math.max(this.mMin[0] - _x, 0, _x - this.mMax[0]), Math.max(this.mMin[1] - _z, 0, _z - this.mMax[1]));
    }
    Show(_on : boolean)
    {
        if(this.mOn == _on) return;
        this.mOn = _on;
        for(const pt of this.mPaint) pt.SetEnable(_on);
    }
}
class CForgeChunk
{
    mLod1 = new CForgeCell();
    mLod2 = new CForgeCell();
    mTile = new Map<string, { l0 : CForgeCell, l1 : CForgeCell }>();
    mMixed = false;
    mFar = false;
}

//여러 오브젝트를 거리 단계별로 합친 결과. 세 단계를 전부 미리 만들고 Update에서 Enable만 바꾼다(만들고 지우는 순간 끊김이 없다)
export class CForgeMerged
{
    static sCount = 0;
    mOpt : CForgeMergeOpt;
    mCanvas : CCanvas;
    mChunk = new Map<string, CForgeChunk>();
    mSub : CSubject;
    mId : number;
    mVerts = [0, 0, 0];
    mMeshes = [0, 0, 0];

    constructor(_canvas : CCanvas, _opt : CForgeMergeOpt)
    {
        this.mCanvas = _canvas;
        this.mOpt = _opt;
        this.mId = ++CForgeMerged.sCount;
        this.mSub = _canvas.PushSub(new CSubject());
    }

    //_bound : [x0, z0, x1, z1] m. 오브젝트 하나의 단계별 부품(_lod[0..2])을 위치에 맞는 칸에 넣는다
    Add(_bound : number[], _lod : IForgePart[][])
    {
        const O = this.mOpt, cx = (_bound[0] + _bound[2]) * 0.5, cz = (_bound[1] + _bound[3]) * 0.5;
        const ck = Math.floor(cx / O.mChunk) + "_" + Math.floor(cz / O.mChunk), tk = Math.floor(cx / O.mTile) + "_" + Math.floor(cz / O.mTile);
        let ch = this.mChunk.get(ck);
        if(ch == null) { ch = new CForgeChunk(); this.mChunk.set(ck, ch); }
        let t = ch.mTile.get(tk);
        if(t == null) { t = { l0 : new CForgeCell(), l1 : new CForgeCell() }; ch.mTile.set(tk, t); }
        for(const c of [ch.mLod1, ch.mLod2, t.l0, t.l1]) c.Grow(_bound);
        this.Put(t.l0, _lod[0], 0);
        this.Put(t.l1, _lod[1], 1);
        this.Put(ch.mLod1, _lod[1], 1);
        this.Put(ch.mLod2, _lod[2], 2);
    }
    private Put(_c : CForgeCell, _parts : IForgePart[], _lod : number)
    {
        const O = this.mOpt;
        for(const p of _parts)
        {
            if(p.buf.mIdx.length == 0) continue;
            const surf = p.tex != null ? CForgeTex.Surf(p.tex) : null;
            //1·2단계는 재질맵 대신 평균 AO를 색에 곱하고 재질은 한 장(sFlatMat)으로 묶어, 한 메시에 색을 더 담는다
            const near = _lod == 0, ao = !near && surf != null && O.mMaterial ? CForgeTex.MeanAO(p.tex) : 1;
            const d = p.tex != null ? CForgeTex.Tint(p.tex, p.rgb.map(_v => _v * ao)) : CForgeTex.Solid(p.rgb);
            const n = near && O.mNormal && surf != null ? surf.mNor : null;
            const m = O.mMaterial ? (near && surf != null ? surf.mMat : CForgeTex.sFlatMat) : null;
            const cls = n != null && O.mParallax && surf.mParallax > 0 ? "px" + surf.mParallax : "std";
            let list = _c.mPack.get(cls);
            if(list == null) { list = []; _c.mPack.set(cls, list); }
            let pk = list.find(_k => _k.Fits([d, n, m]));
            if(pk == null) { pk = new CForgePack(); list.push(pk); }
            pk.Add(p.buf, d, n, m);
        }
    }

    //모든 칸을 메시로 올린다. 처음엔 2단계만 켜 두고 Update가 카메라 위치로 바꾼다
    Commit()
    {
        const frame = this.mCanvas.GetFrame();
        let k = 0;
        const Up = (_c : CForgeCell, _lod : number) => {
            for(const [cls, list] of _c.mPack)
                for(const pk of list)
                {
                    if(pk.mIdx.length == 0) continue;
                    const key = `forgemerge${this.mId}_${k++}.mesh`;
                    CForgeMeshBuf.ToMesh(frame, key, new Float32Array(pk.mPos), new Float32Array(pk.mUV), new Float32Array(pk.mNor), new Float32Array(pk.mRef), pk.mIdx, pk.mTex);
                    this.mVerts[_lod] += pk.Count();
                    this.mMeshes[_lod]++;
                    const pt = this.mSub.PushComp(new CPaint3D(key));
                    pt.SetColorModel(new CColor(1, 1, 1, CColor.eModel.RGBMul));
                    pt.SetTexCodi(new CVec4(1 / CForgeTex.sMeter, 1 / CForgeTex.sMeter, CForgeTex.sUVOff, CForgeTex.sUVOff));
                    if(this.mOpt.mMaterial) pt.SetMaterial(-1, -1, 1, -1);
                    pt.PushCShaderAttr(new CShaderAttr("ligStep0", SDF.eLightStep0.Lambert));
                    if(cls.startsWith("px")) pt.ParallaxNormal(Number(cls.slice(2)), CForgeTex.sParallaxNear, CForgeTex.sParallaxFar, 0);
                    pt.PushTag(CPaint.eTag.Light);
                    pt.PushTag(CPaint.eTag.Shadow);
                    _c.mPaint.push(pt);
                }
            _c.mPack = null;
        };
        for(const ch of this.mChunk.values())
        {
            Up(ch.mLod1, 1);
            Up(ch.mLod2, 2);
            for(const t of ch.mTile.values()) { Up(t.l0, 0); Up(t.l1, 1); }
            ch.mLod1.Show(false);
            ch.mFar = true;
            for(const t of ch.mTile.values()) { t.l0.Show(false); t.l1.Show(false); }
        }
    }

    //_x, _z : 카메라 수평 위치(m). 청크가 멀면 2단계, 가까운 타일이 없으면 청크 1단계, 있으면 타일마다 0/1단계
    Update(_x : number, _z : number)
    {
        const O = this.mOpt;
        for(const ch of this.mChunk.values())
        {
            const d = ch.mLod2.Dist(_x, _z);
            ch.mFar = ch.mFar ? d > O.mFar - O.mHys : d > O.mFar;
            let mixed = false;
            if(!ch.mFar)
                for(const t of ch.mTile.values())
                {
                    const td = t.l0.Dist(_x, _z);
                    t.l0.mNear = t.l0.mNear ? td < O.mNear + O.mHys : td < O.mNear;
                    if(t.l0.mNear) mixed = true;
                }
            ch.mLod2.Show(ch.mFar);
            ch.mLod1.Show(!ch.mFar && !mixed);
            for(const t of ch.mTile.values())
            {
                t.l0.Show(mixed && t.l0.mNear);
                t.l1.Show(mixed && !t.l0.mNear);
            }
        }
    }

    //지금 켜진 단계별 정점 수(확인용)
    Stat() : { verts : number[], meshes : number[], on : number[] }
    {
        const on = [0, 0, 0], C = (_c : CForgeCell, _l : number) => { if(_c.mOn) on[_l] += _c.mPaint.length; };
        for(const ch of this.mChunk.values())
        {
            C(ch.mLod1, 1); C(ch.mLod2, 2);
            for(const t of ch.mTile.values()) { C(t.l0, 0); C(t.l1, 1); }
        }
        return { verts : this.mVerts, meshes : this.mMeshes, on };
    }

    //부품 좌표(엔진 단위)에서 수평 경계 [x0, z0, x1, z1] m
    static Bound(_parts : IForgePart[]) : number[]
    {
        const U = CForgeScene.sUnit, b = [Infinity, Infinity, -Infinity, -Infinity];
        for(const p of _parts)
        {
            const P = p.buf.mPos;
            for(let i = 0; i < P.length; i += 3)
            {
                const x = P[i] / U, z = P[i + 2] / U;
                if(x < b[0]) b[0] = x; if(z < b[1]) b[1] = z; if(x > b[2]) b[2] = x; if(z > b[3]) b[3] = z;
            }
        }
        return b;
    }
}

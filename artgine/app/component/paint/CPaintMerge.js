import { CBound } from "../../../geometry/CBound.js";
import { CMeshCreateInfo } from "../../../render/CMeshCreateInfo.js";
import { CMeshDataNode } from "../../../render/CMeshDataNode.js";
import { CVertexFormat } from "../../../render/CShader.js";
import { CPaint } from "./CPaint.js";
export class CPaintMerge extends CPaint {
    static sRangeGap = 64;
    static sRangeMax = 16;
    mMeshDataNode = new CMeshDataNode();
    mSlotSize = 0;
    mSlotUse = new Uint8Array(0);
    mSlotKey = new Array();
    mSlotVS = new Int32Array(0);
    mSlotVC = new Int32Array(0);
    mSlotMat = new Float32Array(0);
    mSlotReady = false;
    mFree = new Map();
    mUseCount = 0;
    mVtxEnd = 0;
    mIdxEnd = 0;
    mVtxCap = 0;
    mPatKey = null;
    mPatV = 0;
    mPrefillKey = null;
    mPrefillDirty = false;
    mHetero = false;
    mVer = 0;
    mBuildID = 0;
    mDMKey = new Set();
    mBufCache = new Array(32);
    mBufStamp = -1;
    mPendMin = new Array();
    mPendMax = new Array();
    mPendAll = new Array();
    mPendCount = 0;
    mPendLast = -1;
    mSealMin = new Array();
    mSealMax = new Array();
    mSealAll = new Array();
    mSealCount = 0;
    mGen = 0;
    mShaderGen = new Map();
    mBatchValid = false;
    IsShould(_member, _type) {
        if (_member == "mMeshDataNode" || _member.startsWith("mSlot") || _member.startsWith("mPend") || _member.startsWith("mSeal") ||
            _member == "mFree" || _member == "mUseCount" || _member == "mVtxEnd" || _member == "mIdxEnd" || _member == "mVtxCap" ||
            _member == "mPatKey" || _member == "mPatV" || _member == "mPrefillKey" || _member == "mPrefillDirty" || _member == "mHetero" ||
            _member == "mVer" || _member == "mBuildID" || _member == "mDMKey" || _member == "mBufCache" || _member == "mBufStamp" || _member == "mGen" ||
            _member == "mShaderGen" || _member == "mBatchValid")
            return false;
        return super.IsShould(_member, _type);
    }
    Size() { return this.mUseCount; }
    IsUse(_slot) { return _slot >= 0 && _slot < this.mSlotSize && this.mSlotUse[_slot] == 1; }
    IsReady() { return this.mSlotReady; }
    GetBuildID() { return this.mBuildID; }
    Modify(_slot, _mat) {
        if (this.IsUse(_slot) == false)
            return;
        const s = this.mSlotMat, o = _slot * 16, m = _mat.mF32A;
        let rs = true;
        for (let i = 0; i < 12; ++i) {
            if (s[o + i] != m[i]) {
                rs = false;
                break;
            }
        }
        if (rs && s[o + 15] == m[15]) {
            this.ModifyPos(_slot, m[12], m[13], m[14]);
            return;
        }
        s.set(m, o);
        this.WriteSlot(_slot, false);
        this.Dirty(_slot);
    }
    ModifyPos(_slot, _x, _y, _z) {
        if (this.IsUse(_slot) == false)
            return;
        const s = this.mSlotMat, o = _slot * 16;
        const dx = _x - s[o + 12], dy = _y - s[o + 13], dz = _z - s[o + 14];
        if (dx == 0 && dy == 0 && dz == 0)
            return;
        if (s[o + 3] != 0 || s[o + 7] != 0 || s[o + 11] != 0 || s[o + 15] != 1) {
            s[o + 12] = _x;
            s[o + 13] = _y;
            s[o + 14] = _z;
            this.WriteSlot(_slot, false);
            this.Dirty(_slot);
            return;
        }
        s[o + 12] = _x;
        s[o + 13] = _y;
        s[o + 14] = _z;
        this.TranslateSlot(_slot, dx, dy, dz);
        this.DirtyPos(_slot);
    }
    Remove(_slot) {
        if (this.IsUse(_slot) == false)
            return;
        this.ZeroPos(this.mSlotVS[_slot], this.mSlotVC[_slot]);
        this.mSlotUse[_slot] = 0;
        this.mUseCount--;
        const key = this.mSlotKey[_slot];
        let free = this.mFree.get(key);
        if (free == null) {
            free = [];
            this.mFree.set(key, free);
        }
        free.push(_slot);
        this.DirtyPos(_slot);
    }
    Clear() {
        if (this.mSlotReady == false)
            return;
        const oldEnd = this.mVtxEnd;
        this.ZeroPos(0, oldEnd);
        this.mSlotUse.fill(0);
        this.mSlotSize = 0;
        this.mUseCount = 0;
        this.mVtxEnd = 0;
        this.mIdxEnd = 0;
        this.mFree.clear();
        this.mBound.Reset();
        this.mBound.SetType(CBound.eType.Box);
        if (this.mHetero || this.mPrefillDirty) {
            this.mHetero = false;
            this.mPrefillDirty = true;
            this.Restructure();
        }
        else if (oldEnd > 0) {
            this.DirtyRange(0, oldEnd - 1, false);
        }
    }
    CreateChannel() { }
    SlotVertex(_key) { return 0; }
    SlotIndex(_key) { return 0; }
    WriteIndex(_key, _iStart, _vStart) { }
    WriteSlot(_slot, _static) { }
    RenderAttr(_vf) { }
    GrowSlotData(_cap) { }
    TranslateSlot(_slot, _dx, _dy, _dz) {
        this.AddPos(this.mSlotVS[_slot], this.mSlotVC[_slot], _dx, _dy, _dz);
    }
    BuildSlot() {
        this.ReleaseDrawMesh();
        const ci = new CMeshCreateInfo();
        this.mMeshDataNode.ci = ci;
        this.mBufStamp = -1;
        this.CreateChannel();
        if (ci.GetVFType(CVertexFormat.eIdentifier.Index).length == 0)
            ci.Create(CVertexFormat.eIdentifier.Index);
        ci.vertexCount = 0;
        ci.indexCount = 0;
        this.mSlotUse.fill(0);
        this.mSlotSize = 0;
        this.mUseCount = 0;
        this.mVtxEnd = 0;
        this.mIdxEnd = 0;
        this.mVtxCap = 0;
        this.mFree.clear();
        this.mPatKey = null;
        this.mPatV = 0;
        this.mPrefillKey = null;
        this.mPrefillDirty = false;
        this.mHetero = false;
        this.mPendCount = 0;
        this.mPendLast = -1;
        this.mSealCount = 0;
        this.mBound.Reset();
        this.mBound.SetType(CBound.eType.Box);
        this.mSlotReady = true;
        this.mBuildID++;
        this.mVer++;
        this.InvalidBatch();
    }
    NewSlot(_key) {
        const free = this.mFree.get(_key);
        let slot = -1;
        if (free != null && free.length > 0) {
            slot = free.pop();
        }
        else {
            const v = this.SlotVertex(_key);
            const i = this.SlotIndex(_key);
            const vs = this.mVtxEnd;
            const is = this.mIdxEnd;
            slot = this.mSlotSize;
            this.GrowSlotArr(slot + 1);
            this.mSlotSize++;
            this.mSlotKey[slot] = _key;
            this.mSlotVS[slot] = vs;
            this.mSlotVC[slot] = v;
            if (vs + v > this.mVtxCap) {
                this.mPatKey = _key;
                this.mPatV = v;
                this.ReserveVertex(vs + v);
                this.Prefill();
                this.Restructure();
            }
            else if (this.mPrefillDirty || _key != this.mPrefillKey) {
                this.WriteIndex(_key, is, vs);
                if (_key != this.mPrefillKey)
                    this.mHetero = true;
                this.mPatKey = _key;
                this.mPatV = v;
                if (this.mPrefillDirty == false) {
                    this.mPrefillDirty = true;
                    this.Restructure();
                }
            }
            this.mVtxEnd += v;
            this.mIdxEnd += i;
        }
        this.mSlotUse[slot] = 1;
        this.mUseCount++;
        return slot;
    }
    SetSlotMat(_slot, _mat) {
        this.mSlotMat.set(_mat.mF32A, _slot * 16);
    }
    Dirty(_slot) {
        const vs = this.mSlotVS[_slot];
        this.DirtyRange(vs, vs + this.mSlotVC[_slot] - 1, true);
    }
    DirtyPos(_slot) {
        const vs = this.mSlotVS[_slot];
        this.DirtyRange(vs, vs + this.mSlotVC[_slot] - 1, false);
    }
    Buf(_type, _index = 0) {
        const ci = this.mMeshDataNode.ci;
        if (this.mBufStamp != ci.vertex.length) {
            this.mBufCache.fill(null);
            const count = new Array(16).fill(0);
            for (const buf of ci.vertex) {
                const n = count[buf.vfType]++;
                if (n < 2)
                    this.mBufCache[buf.vfType * 2 + n] = buf;
            }
            this.mBufStamp = ci.vertex.length;
        }
        return this.mBufCache[_type * 2 + _index];
    }
    F32(_type, _index = 0) {
        const buf = this.Buf(_type, _index);
        return buf != null ? buf.bufF.mF32A : null;
    }
    BoundPush(_x, _y, _z) {
        const mn = this.mBound.mMin.mF32A, mx = this.mBound.mMax.mF32A;
        let change = false;
        if (_x < mn[0]) {
            mn[0] = _x;
            change = true;
        }
        if (_y < mn[1]) {
            mn[1] = _y;
            change = true;
        }
        if (_z < mn[2]) {
            mn[2] = _z;
            change = true;
        }
        if (_x > mx[0]) {
            mx[0] = _x;
            change = true;
        }
        if (_y > mx[1]) {
            mx[1] = _y;
            change = true;
        }
        if (_z > mx[2]) {
            mx[2] = _z;
            change = true;
        }
        if (change) {
            this.mBW.mRadian = 0;
            this.UpdateLMat();
        }
    }
    AddPos(_vs, _vc, _dx, _dy, _dz) {
        const p = this.F32(CVertexFormat.eIdentifier.Position);
        for (let i = _vs * 3, e = (_vs + _vc) * 3; i < e; i += 3) {
            p[i] += _dx;
            p[i + 1] += _dy;
            p[i + 2] += _dz;
            this.BoundPush(p[i], p[i + 1], p[i + 2]);
        }
    }
    WriteBinormal(_vs, _vc) {
        const I = CVertexFormat.eIdentifier;
        const bib = this.Buf(I.Binormal);
        if (bib == null || this.mVtxCap == 0)
            return;
        const n = this.F32(I.Normal), t = this.F32(I.Tangent);
        if (n == null || t == null)
            return;
        const bs = Math.round(bib.bufF.mSize / this.mVtxCap);
        const b = bib.bufF.mF32A;
        for (let i = _vs; i < _vs + _vc; ++i) {
            const n3 = i * 3, t4 = i * 4, o = i * bs;
            const nx = n[n3], ny = n[n3 + 1], nz = n[n3 + 2];
            const tx = t[t4], ty = t[t4 + 1], tz = t[t4 + 2], tw = t[t4 + 3];
            b[o] = (ny * tz - nz * ty) * tw;
            b[o + 1] = (nz * tx - nx * tz) * tw;
            b[o + 2] = (nx * ty - ny * tx) * tw;
        }
    }
    Render(_vf) {
        var barr = this.RenderBatch(_vf, 1);
        if (barr == null)
            return;
        this.mBatchValid = true;
        if (this.mSlotReady == false || this.mUseCount == 0)
            return;
        if (this.mPrefillDirty)
            this.Prefill();
        if (this.mPendCount > 0)
            this.Seal();
        const frame = this.mOwner.GetFrame();
        frame.BMgr().BatchOn();
        this.Common(_vf);
        this.RenderAttr(_vf);
        frame.BMgr().SetBatchTex(this.mTextureKey);
        const key = this.DrawMeshKey();
        const resKey = key + _vf.ObjHash();
        let dm = frame.Res().Find(resKey);
        if (dm == null) {
            this.mMeshDataNode.ci.bound.Import(this.mBound);
            dm = this.GetDrawMesh(key, _vf, this.mMeshDataNode.ci);
            this.mDMKey.add(resKey);
        }
        else {
            const gen = this.mShaderGen.get(_vf);
            if (gen == null || gen < this.mGen - 1)
                frame.Ren().BuildMeshDrawNode(dm, this.mMeshDataNode.ci, _vf);
            else if (gen == this.mGen - 1)
                this.Upload(dm, _vf);
        }
        this.mShaderGen.set(_vf, this.mGen);
        dm.iNum = this.mIdxEnd;
        frame.BMgr().SetBatchMesh(dm);
        barr[0] = frame.BMgr().BatchOff();
    }
    Destroy() {
        this.ReleaseDrawMesh();
        super.Destroy();
    }
    Reset() {
        this.ReleaseDrawMesh();
        super.Reset();
        this.mSlotReady = false;
    }
    DrawMeshKey() { return "Artgine/DM/Merge/" + this.Key() + "/" + this.mVer; }
    DirtyRange(_min, _max, _all) {
        if (this.mBatchValid) {
            this.InvalidBatch();
            this.mBatchValid = false;
        }
        const gap = CPaintMerge.sRangeGap;
        const pMin = this.mPendMin, pMax = this.mPendMax, pAll = this.mPendAll;
        let hit = -1;
        const last = this.mPendLast;
        if (last >= 0 && pAll[last] == _all && _min <= pMax[last] + gap && _max >= pMin[last] - gap) {
            hit = last;
        }
        else {
            for (let i = 0; i < this.mPendCount; ++i) {
                if (pAll[i] == _all && _min <= pMax[i] + gap && _max >= pMin[i] - gap) {
                    hit = i;
                    break;
                }
            }
        }
        if (hit < 0 && this.mPendCount >= CPaintMerge.sRangeMax) {
            let best = Number.MAX_SAFE_INTEGER;
            for (let i = 0; i < this.mPendCount; ++i) {
                const d = (_min > pMax[i] ? _min - pMax[i] : pMin[i] - _max) + (pAll[i] == _all ? 0 : Number.MAX_SAFE_INTEGER / 2);
                if (d < best) {
                    best = d;
                    hit = i;
                }
            }
        }
        if (hit >= 0) {
            if (_min < pMin[hit])
                pMin[hit] = _min;
            if (_max > pMax[hit])
                pMax[hit] = _max;
            if (_all)
                pAll[hit] = true;
        }
        else {
            hit = this.mPendCount++;
            pMin[hit] = _min;
            pMax[hit] = _max;
            pAll[hit] = _all;
        }
        this.mPendLast = hit;
    }
    Seal() {
        const min = this.mSealMin, max = this.mSealMax, all = this.mSealAll;
        this.mSealMin = this.mPendMin;
        this.mPendMin = min;
        this.mSealMax = this.mPendMax;
        this.mPendMax = max;
        this.mSealAll = this.mPendAll;
        this.mPendAll = all;
        this.mSealCount = this.mPendCount;
        this.mPendCount = 0;
        this.mPendLast = -1;
        this.mGen++;
    }
    InvalidBatch() {
        for (let key of this.mBatchMap.keys())
            this.mBatchMap.set(key, null);
    }
    Restructure() {
        this.mVer++;
        this.ReleaseDrawMesh();
        this.InvalidBatch();
        this.mBatchValid = false;
        this.mPendCount = 0;
        this.mPendLast = -1;
        this.mSealCount = 0;
    }
    ReleaseDrawMesh() {
        if (this.mDMKey.size > 0 && this.mOwner != null && this.mOwner.GetFrame() != null) {
            const frame = this.mOwner.GetFrame();
            for (const key of this.mDMKey) {
                const dm = frame.Res().Find(key);
                if (dm == null)
                    continue;
                frame.Ren().ReleaseMeshDrawNode(dm);
                frame.Res().Remove(key);
            }
        }
        this.mDMKey.clear();
        this.mShaderGen.clear();
    }
    Upload(_dm, _vf) {
        if (this.mSealCount == 0)
            return;
        const ren = this.mOwner.GetFrame().Ren();
        const P = CVertexFormat.eIdentifier.Position;
        for (let j = 0; j < _vf.mVF.length; ++j) {
            const vf = _vf.mVF[j];
            if (vf.identifier == CVertexFormat.eIdentifier.Instance || vf.eachCount * vf.eachSize > 16)
                continue;
            const pos = (vf.identifier == P && vf.identifierCount == 0);
            const arr = this.F32(vf.identifier, vf.identifierCount);
            if (arr == null)
                continue;
            for (let r = 0; r < this.mSealCount; ++r) {
                if (pos == false && this.mSealAll[r] == false)
                    continue;
                const st = this.mSealMin[r] * vf.eachCount;
                const ed = Math.min((this.mSealMax[r] + 1) * vf.eachCount, arr.length);
                if (ed <= st)
                    continue;
                ren.RebuildMeshDrawNode(_dm, j, st * 4, arr.subarray(st, ed));
            }
        }
    }
    ZeroPos(_vs, _vc) {
        if (_vc <= 0)
            return;
        const p = this.F32(CVertexFormat.eIdentifier.Position);
        if (p == null)
            return;
        p.fill(0, _vs * 3, (_vs + _vc) * 3);
    }
    GrowSlotArr(_need) {
        const len = this.mSlotUse.length;
        if (_need <= len)
            return;
        const cap = Math.max(_need, len * 2, 16);
        const use = new Uint8Array(cap);
        use.set(this.mSlotUse);
        this.mSlotUse = use;
        const vs = new Int32Array(cap);
        vs.set(this.mSlotVS);
        this.mSlotVS = vs;
        const vc = new Int32Array(cap);
        vc.set(this.mSlotVC);
        this.mSlotVC = vc;
        const mat = new Float32Array(cap * 16);
        mat.set(this.mSlotMat);
        this.mSlotMat = mat;
        this.GrowSlotData(cap);
    }
    Stride(_buf) {
        if (this.mVtxCap > 0 && _buf.bufF.mSize > 0)
            return Math.round(_buf.bufF.mSize / this.mVtxCap);
        const I = CVertexFormat.eIdentifier;
        switch (_buf.vfType) {
            case I.UV: return 2;
            case I.Position:
            case I.Normal:
            case I.TexOff:
            case I.Binormal: return 3;
        }
        return 4;
    }
    ReserveVertex(_need) {
        const ci = this.mMeshDataNode.ci;
        const cap = Math.max(_need, this.mVtxCap * 2);
        for (const buf of ci.vertex) {
            if (buf.vfType == CVertexFormat.eIdentifier.Index)
                continue;
            const s = this.Stride(buf);
            const old = buf.bufF.mF32A;
            const arr = new Float32Array(cap * s);
            arr.set(old.subarray(0, Math.min(old.length, this.mVtxCap * s)));
            if (buf.vfType == CVertexFormat.eIdentifier.TexOff)
                arr.fill(-1, this.mVtxCap * s);
            buf.bufF.mF32A = arr;
            buf.bufF.mSize = cap * s;
        }
        this.mVtxCap = cap;
        ci.vertexCount = cap;
    }
    Prefill() {
        const ci = this.mMeshDataNode.ci;
        const inb = this.Buf(CVertexFormat.eIdentifier.Index);
        inb.bufI.length = this.mIdxEnd;
        if (this.mPrefillKey != null && this.mPrefillKey != this.mPatKey && this.mIdxEnd > 0)
            this.mHetero = true;
        this.mPrefillKey = this.mPatKey;
        if (this.mPatKey != null && this.mPatV > 0) {
            for (let vs = this.mVtxEnd; vs + this.mPatV <= this.mVtxCap; vs += this.mPatV)
                this.WriteIndex(this.mPatKey, inb.bufI.length, vs);
        }
        ci.indexCount = inb.bufI.length;
        this.mPrefillDirty = false;
    }
}

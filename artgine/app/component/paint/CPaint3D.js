import { CUpdate } from "../../../basic/Basic.js";
import { CAlert } from "../../../basic/CAlert.js";
import { CArray } from "../../../basic/CArray.js";
import { CHash } from "../../../basic/CHash.js";
import { CString } from "../../../basic/CString.js";
import { CTree } from "../../../basic/CTree.js";
import { CBound } from "../../../geometry/CBound.js";
import { CMat } from "../../../geometry/CMat.js";
import { CMath } from "../../../geometry/CMath.js";
import { CPoolGeo } from "../../../geometry/CPoolGeo.js";
import { CVec1 } from "../../../geometry/CVec1.js";
import { CVec2 } from "../../../geometry/CVec2.js";
import { CVec3 } from "../../../geometry/CVec3.js";
import { CVec4 } from "../../../geometry/CVec4.js";
import { CDevice } from "../../../render/CDevice.js";
import { CMesh } from "../../../render/CMesh.js";
import { CMeshCopyNode } from "../../../render/CMeshCopyNode.js";
import { CMeshCreateInfo } from "../../../render/CMeshCreateInfo.js";
import { CMeshPaint } from "../../../render/CMeshPaint.js";
import { CMeshTreeUpdate } from "../../../render/CMeshTreeUpdate.js";
import { CVertexFormat } from "../../../render/CShader.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { CTexture } from "../../../render/CTexture.js";
import { CUtilRender } from "../../../render/CUtilRender.js";
import { SDF } from "../../../z_file/SDF.js";
import { CPaint } from "./CPaint.js";
import { CPaintMerge } from "./CPaintMerge.js";
export class CPaint3D extends CPaint {
    mTree;
    mMesh;
    mMeshRes;
    mWeightMat;
    mCenterPos = false;
    mTargetScale = 0;
    mTreeNode = new CArray();
    mSkinType = SDF.eSkin.None;
    mCamCompSet = new Set();
    mBakedLight = null;
    mWindInfluence = new CVec1(0.0);
    mBrushCompArr = [];
    mTexLoad = false;
    constructor(_mesh = "Artgine/box.mesh", _centerPos = false, _targetScale = 0) {
        super();
        this.mCenterPos = _centerPos;
        this.mTargetScale = _targetScale;
        this.mTree = null;
        this.mMesh = _mesh;
        this.mWeightMat = new Float32Array(0);
    }
    SetOwner(_obj) {
        super.SetOwner(_obj);
        this.BuildMesh(this.mMesh);
    }
    Bake() { this.PushTag("bake"); }
    Env() { this.PushTag("env"); }
    Wind(_influence) {
        this.PushTag("wind");
        this.mWindInfluence.x = _influence;
    }
    ParallaxNormal(_value, _near = null, _far = null, _depth = null) {
        this.PushTag("parallax");
        this.PushCShaderAttr(new CShaderAttr("parallaxNormal", new CVec1(_value)));
        if (_near != null && _far != null)
            this.PushCShaderAttr(new CShaderAttr("parallaxDist", new CVec2(_near, _far)));
        if (_depth != null)
            this.PushCShaderAttr(new CShaderAttr("parallaxDepth", new CVec1(_depth)));
    }
    EditDrop(_object) {
        if (_object instanceof CMesh) {
            this.SetMesh(_object.Key());
        }
    }
    EditChange(_pointer, _child) {
        super.EditChange(_pointer, _child);
        if (_pointer.member == "mMesh") {
            this.SetMesh(this.mMesh);
        }
    }
    IsShould(_member, _type) {
        if (_member == "mWeightMat" || _member == "mTreeNode" || _member == "mTree" || _member == "mMeshRes" ||
            _member == "mCenterPos" || _member == "mTargetScale")
            return false;
        return super.IsShould(_member, _type);
    }
    InitChk() {
        super.InitChk();
        if (this.mTree == null) {
            if (this.BuildMesh(this.mMesh) == false)
                this.mInit = false;
        }
    }
    SetWeightMat(_off, _tar) {
        for (var x = 0; x < 16; ++x) {
            this.mWeightMat[_off * 16 + x] = _tar.mF32A[x];
        }
    }
    SetMesh(_mesh) {
        this.mTree = null;
        this.mTextureKey.length = 0;
        this.mMesh = _mesh;
        this.mWeightMat = new Float32Array(0);
        this.mBound.Reset();
        this.ClearBatch();
        this.mStartChk = true;
    }
    Prefab(_owner) {
        super.Prefab(_owner);
        if (this.mAutoLoad != null) {
            this.mMeshRes = _owner.GetFrame().Res().Find(this.mMesh);
            if (this.mMeshRes == null) {
                if (_owner.GetFrame().Load().IsLoad(this.mMesh) == false) {
                    this.mOwner.GetFrame().Load().Exe(this.mMesh, this.mAutoLoad);
                }
            }
        }
    }
    BuildMesh(_mesh) {
        this.mTexLoad = false;
        if (this.mOwner.GetFrame() == null)
            return false;
        if (this.mMesh == _mesh && this.mTree != null)
            return false;
        this.mMesh = _mesh;
        this.mMeshRes = this.mOwner.GetFrame().Res().Find(_mesh);
        if (this.mMeshRes == null) {
            if (this.mAutoLoad != null && this.mOwner.GetFrame().Load().IsLoad(_mesh) == false)
                this.mOwner.GetFrame().Load().Exe(_mesh, this.mAutoLoad);
            return false;
        }
        if (_mesh.indexOf(".zip") != -1) {
            var fileList = this.mOwner.GetFrame().Res().Find(_mesh);
            for (var each2 of fileList) {
                let ext = CString.ExtCut(each2);
                if (ext.ext == "fbx" || ext.ext == "gltf" || ext.ext == "glb") {
                    this.mMesh = each2;
                    this.mMeshRes = this.mOwner.GetFrame().Res().Find(this.mMesh);
                    if (this.mMeshRes == null)
                        return false;
                    break;
                }
            }
        }
        if (this.mTextureKey.length == 0) {
            this.SetTexture(this.mMeshRes.texture);
        }
        this.mWeightMat = new Float32Array(this.mMeshRes.skin.length * 4 * 4);
        for (var i = 0; i < this.mMeshRes.skin.length * 4 * 4; ++i) {
            if (i % 16 == 0 || i % 16 == 5 || i % 16 == 10 || i % 16 == 15)
                this.mWeightMat[i] = 1;
            else
                this.mWeightMat[i] = 0;
        }
        if (this.mMeshRes.skin.length > CDevice.GetProperty(CDevice.eProperty.Sam2DSize) / 4) {
            this.mWeightMat = new Float32Array(0);
            CAlert.W(_mesh + "skin bone max!" + CDevice.GetProperty(CDevice.eProperty.Sam2DSize) / 4 + "->" + this.mMeshRes.skin.length);
        }
        if (this.mMeshRes.skin.length > 0) {
            this.mSkinType = SDF.eSkin.Bone;
            this.PushTag("weightMat");
        }
        else
            this.mSkinType = SDF.eSkin.None;
        this.mTree = new CTree();
        this.mTree.mData = new CMeshCopyNode();
        CMeshTreeUpdate.TreeCopy(this.mMeshRes.meshTree, this.mTree, new CMat(), this.mBound);
        this.UpdateLMat();
        this.mBound.mType = CBound.eType.Box;
        this.mTreeNode.Clear();
        var node = this.mTreeNode;
        node.Push(new CMeshPaint(this.mMeshRes.meshTree, this.mTree, null));
        for (let nodeOff = 0; nodeOff < node.Size(); nodeOff++) {
            let nodemp = node.Find(nodeOff);
            if (nodemp.md.mColleague != null) {
                node.Push(new CMeshPaint(nodemp.md.mColleague, nodemp.mpi.mColleague, null));
            }
            if (nodemp.md.mChild != null) {
                node.Push(new CMeshPaint(nodemp.md.mChild, nodemp.mpi.mChild, null));
            }
        }
        this.ExeLocalMat(this.mCenterPos, this.mTargetScale);
        this.ClearBatch();
        this.mUpdateFMat = true;
        this.mBW.mRadian = 0;
        this.mBound.MatCoordi(this.mLMat);
        return true;
    }
    Update(_update) {
        super.Update(_update);
        if (this.mUpdateFMat == false)
            return;
        const node = this.mTreeNode;
        const nSize = node.Size();
        for (let nodeOff = 0; nodeOff < nSize; nodeOff++) {
            const nodemp = node.mArray[nodeOff];
            const mpiData = nodemp.mpi.mData;
            if (mpiData.updateMat !== CUpdate.eType.Not || mpiData.FMatAtt === false) {
                if (this.mSkinType != SDF.eSkin.None && nodemp.md.mData.ci != null) {
                    nodemp.sum.Import(this.GetFMat());
                }
                else if (this.mSkinType == SDF.eSkin.Bake) {
                }
                else if (mpiData.FMatAtt == false && mpiData.pst.IsUnit()) {
                    mpiData.FMatAtt = true;
                    nodemp.sumSA.mData = this.GetFMat();
                    nodemp.sumSA.mTag = null;
                }
                else if (mpiData.FMatAtt == true) {
                    if (mpiData.pst.IsUnit() == false) {
                        nodemp.sumSA.mData = nodemp.sum;
                        mpiData.FMatAtt = false;
                        nodemp.sumSA.mTag = null;
                        CMath.MatMul(mpiData.pst, this.GetFMat(), nodemp.sum, true);
                    }
                    else if (this.GetFMat() != nodemp.sumSA.mData) {
                        nodemp.sumSA.mData = this.GetFMat();
                    }
                }
                else {
                    CMath.MatMul(mpiData.pst, this.GetFMat(), nodemp.sum, true);
                }
                if (mpiData.updateMat == CUpdate.eType.Updated)
                    mpiData.updateMat = CUpdate.eType.Already;
                else if (mpiData.updateMat == CUpdate.eType.Already)
                    mpiData.updateMat = CUpdate.eType.Not;
            }
            if (this.mSkinType == SDF.eSkin.Bone) {
                for (var i = 0; i < this.mMeshRes.skin.length; ++i) {
                    if (nodemp.md.mData.IsSkinKey(this.mMeshRes.skin[i].key)) {
                        var all = new CMat();
                        all = CMath.MatMul(this.mMeshRes.skin[i].mat, mpiData.pst);
                        this.SetWeightMat(i, all);
                    }
                }
            }
        }
    }
    Render(_vf) {
        var barr = this.RenderBatch(_vf, this.mTreeNode.Size());
        if (barr == null)
            return;
        if (this.mTree == null) {
            this.ClearBatch();
            return;
        }
        this.mOwner.GetFrame().BMgr().BatchGlobalOn();
        if (this.mSkinType == SDF.eSkin.Bone) {
            if (this.mWeightMat.length == 0) {
                this.mWeightMat = new Float32Array(4 * 4);
                for (var i = 0; i < 4 * 4; ++i) {
                    if (i % 16 == 0 || i % 16 == 5 || i % 16 == 10 || i % 16 == 15)
                        this.mWeightMat[i] = 1;
                    else
                        this.mWeightMat[i] = 0;
                }
            }
            this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("weightArrMat", 16, this.mWeightMat));
        }
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("skin", this.mSkinType));
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("windInfluence", this.mWindInfluence));
        this.Common(_vf);
        this.mOwner.GetFrame().BMgr().BatchGlobalOff();
        var node = this.mTreeNode;
        const nSize = node.Size();
        for (let nodeOff = 0; nodeOff < nSize; nodeOff++) {
            let nodemp = node.Find(nodeOff);
            this.RenderMesh(_vf, nodemp, barr, nodeOff);
        }
        this.mOwner.GetFrame().BMgr().BatchGlobalClear();
    }
    RenderMesh(_vf, _node, _barr, _off) {
        if (_node.md.mData != null && _node.md.mData.ci != null && _node.md.mData.textureOff.length > 0) {
            this.mOwner.GetFrame().BMgr().BatchOn();
            switch (this.mWorldMatType) {
                case CMat.eType.PRS:
                    _node.sumSA.mKey = "worldMat";
                    break;
                case CMat.eType.Short3D:
                    _node.sumSA.mKey = "worldMatShort";
                    break;
            }
            _node.sumSA.mType = this.mWorldMatType;
            this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMatType", new CVec1(this.mWorldMatType)));
            this.mOwner.GetFrame().BMgr().SetBatchSA(_node.sumSA);
            if (_node.mpi.mData.color != null) {
                this.PushTag("CAModel");
                this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("colorModel", _node.mpi.mData.color));
                this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("alphaModel", _node.mpi.mData.alpha));
            }
            this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey, _node.mpi.mData.textureOff);
            if (_vf.mUniform.get("material") != null)
                this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("material", this.mMaterial));
            if (_vf.mUniform.get("part") != null)
                this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("part", CHash.HashCode(_node.md.mKey)));
            var dm = this.GetDrawMesh("Artgine/DM/" + this.mMesh + _node.md.mKey, _vf, _node.md.mData.ci);
            this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);
            _barr[_off] = this.mOwner.GetFrame().BMgr().BatchOff();
        }
        else {
            _barr[_off] = null;
        }
    }
    GetMesh() { return this.mMesh; }
    GetTree() { return this.mTree; }
    ExeLocalMat(_centerPos = false, _targetScale = 0) {
        if (this.mTargetScale != 0) {
            let size = this.mBound.GetSize();
            let maxSize = CMath.Max(CMath.Max(size.x, size.y), size.z);
            this.mLMat.mF32A[0] = this.mTargetScale / maxSize;
            this.mLMat.mF32A[5] = this.mTargetScale / maxSize;
            this.mLMat.mF32A[10] = this.mTargetScale / maxSize;
        }
        if (this.mCenterPos)
            this.mLMat.SetV3(3, CMath.V3MulV3(this.mBound.GetCenter(), new CVec3(-this.mLMat.mF32A[0], -this.mLMat.mF32A[5], -this.mLMat.mF32A[10])));
        this.mLMat.UnitCheck();
    }
}
export class CPaintCube extends CPaint3D {
    constructor(_cubeTex) {
        super();
        this.mTextureKey[0] = _cubeTex;
    }
    InitChk() {
        this.mMesh = this.GetOwner().GetFrame().Pal().GetBoxMesh();
        super.InitChk();
    }
    Sky(_table = false, _cloud = false, _light = false, _star = false, _aurora = false) {
        this.PushTag("sky");
        if (_table)
            this.PushTag("table");
        if (_cloud)
            this.PushTag("cloud");
        if (_aurora)
            this.PushTag("aurora");
        if (_star)
            this.PushTag("star");
        if (_light)
            this.PushTag("light");
    }
}
export class CPaint3DMerge extends CPaintMerge {
    constructor(_meshList = [], _matList = [], _centerPos = false, _targetScale = 0) {
        super();
        this.mMeshList = _meshList;
        this.mMatList = _matList;
        this.mCenterPos = _centerPos;
        this.mTargetScale = _targetScale;
    }
    mMeshList;
    mMatList;
    mWeightMat;
    mWeightMatArr = [];
    mCenterPos = false;
    mTargetScale = 0;
    mWindInfluence = new CVec1(0.0);
    mSkinMatCache = new Map();
    mTexOverride = null;
    mTemplate = new Map();
    mTemplateBuf = new Map();
    IsShould(_member, _type) {
        if (_member == "mSkinMatCache" || _member == "mTemplate" || _member == "mTemplateBuf")
            return false;
        return super.IsShould(_member, _type);
    }
    static SameMeshList(_a, _b) {
        if (_a == null || _b == null || _a.length != _b.length)
            return false;
        for (let i = 0; i < _a.length; ++i)
            if (_a[i] != _b[i])
                return false;
        return true;
    }
    InitChk() {
        super.InitChk();
        for (let i = 0; i < this.mMeshList.length; ++i) {
            let mesh = this.GetOwner().GetFrame().Res().Find(this.mMeshList[i]);
            if (mesh == null) {
                this.mInit = false;
                if (this.GetOwner().GetFrame().Load().IsLoad(this.mMeshList[i]) == false) {
                    this.GetOwner().GetFrame().Load().Exe(this.mMeshList[i]);
                }
            }
        }
    }
    Start() {
        this.BuildSlot();
        for (let i = 0; i < this.mMeshList.length; ++i)
            this.PushSlot(this.mMeshList[i], this.mMatList[i]);
    }
    Push(_mesh, _mat) {
        if (this.mSlotReady == false) {
            this.mMeshList.push(_mesh);
            this.mMatList.push(_mat);
            return this.mMeshList.length - 1;
        }
        return this.PushSlot(_mesh, _mat);
    }
    ResetMesh(_meshList, _matList) {
        this.mMeshList = _meshList;
        this.mMatList = _matList;
        if (this.mSlotReady == false)
            return;
        let same = (this.mSlotSize == _meshList.length && this.Size() == _meshList.length);
        for (let i = 0; same && i < _meshList.length; ++i)
            if (this.mSlotKey[i] != _meshList[i])
                same = false;
        if (same) {
            for (let i = 0; i < _meshList.length; ++i)
                this.Modify(i, _matList[i]);
            return;
        }
        this.Clear();
        for (let i = 0; i < _meshList.length; ++i)
            this.PushSlot(_meshList[i], _matList[i]);
    }
    GetSkinMat(_meshKey, _mesh) {
        let calcSkinMat = this.mSkinMatCache.get(_meshKey);
        if (calcSkinMat == null) {
            let identMat = CPoolGeo.ProductMat();
            identMat.Unit();
            calcSkinMat = this.SkinCalc(identMat, _mesh, _mesh.meshTree);
            CPoolGeo.RecycleMat(identMat);
            this.mSkinMatCache.set(_meshKey, calcSkinMat);
        }
        return calcSkinMat;
    }
    GetTemplate(_meshKey) {
        let tmp = this.mTemplate.get(_meshKey);
        if (tmp != null)
            return tmp;
        let frame = this.GetOwner().GetFrame();
        let mesh = frame.Res().Find(_meshKey);
        if (mesh == null) {
            if (frame.Load().IsLoad(_meshKey) == false)
                frame.Load().Exe(_meshKey);
            return null;
        }
        tmp = new CMeshCreateInfo();
        let dummyBound = CPoolGeo.ProductBound();
        dummyBound.SetType(CBound.eType.Box);
        let identMat = CPoolGeo.ProductMat();
        identMat.Unit();
        if (this.mTargetScale != 0 || this.mCenterPos) {
            const whole = new CBound();
            whole.SetType(CBound.eType.Box);
            const dummy = new CTree();
            dummy.mData = new CMeshCopyNode();
            CMeshTreeUpdate.TreeCopy(mesh.meshTree, dummy, new CMat(), whole);
            const size = whole.GetSize();
            const s = this.mTargetScale != 0 ? this.mTargetScale / CMath.Max(CMath.Max(size.x, size.y), size.z) : 1;
            identMat.mF32A[0] = s;
            identMat.mF32A[5] = s;
            identMat.mF32A[10] = s;
            if (this.mCenterPos) {
                const center = whole.GetCenter();
                identMat.mF32A[12] = -center.x * s;
                identMat.mF32A[13] = -center.y * s;
                identMat.mF32A[14] = -center.z * s;
            }
            identMat.UnitCheck();
        }
        this.Merge(identMat, mesh, mesh.meshTree, tmp, dummyBound, this.GetSkinMat(_meshKey, mesh));
        identMat.Unit();
        CPoolGeo.RecycleMat(identMat);
        CPoolGeo.RecycleBound(dummyBound);
        this.mTemplate.set(_meshKey, tmp);
        return tmp;
    }
    PushSlot(_mesh, _mat) {
        const t = this.GetTemplate(_mesh);
        if (t == null || t.vertexCount == 0)
            return -1;
        const slot = this.NewSlot(_mesh);
        this.SetSlotMat(slot, _mat);
        this.WriteSlot(slot, true);
        this.Dirty(slot);
        return slot;
    }
    CreateChannel() {
        const ci = this.mMeshDataNode.ci;
        const I = CVertexFormat.eIdentifier;
        ci.Create(I.Position);
        ci.Create(I.UV);
        ci.Create(I.Normal);
        ci.Create(I.TexOff);
        ci.Create(I.Weight);
        ci.Create(I.WeightIndex);
        ci.Create(I.Tangent);
    }
    SlotVertex(_key) { return this.GetTemplate(_key).vertexCount; }
    SlotIndex(_key) { return this.GetTemplate(_key).indexCount; }
    WriteIndex(_key, _iStart, _vStart) {
        const src = this.GetTemplateBuf(_key).mIdx;
        const ib = this.Buf(CVertexFormat.eIdentifier.Index).bufI;
        for (let i = 0; i < src.length; ++i)
            ib[_iStart + i] = src[i] + _vStart;
    }
    GetTemplateBuf(_key) {
        let tb = this.mTemplateBuf.get(_key);
        if (tb != null)
            return tb;
        const t = this.GetTemplate(_key);
        const I = CVertexFormat.eIdentifier;
        const pos = t.GetVFType(I.Position)[0].bufF.mF32A;
        let we = t.GetVFType(I.Weight)[0].bufF.mF32A;
        if (this.mWindInfluence.x > 0)
            we = CPaint3DMerge.WindWeight(pos, we, t.vertexCount);
        tb = {
            mPos: pos, mUV: t.GetVFType(I.UV)[0].bufF.mF32A,
            mNor: t.GetVFType(I.Normal)[0].bufF.mF32A, mTex: t.GetVFType(I.TexOff)[0].bufF.mF32A,
            mWe: we, mWi: t.GetVFType(I.WeightIndex)[0].bufF.mF32A,
            mTan: t.GetVFType(I.Tangent)[0].bufF.mF32A, mIdx: t.GetVFType(I.Index)[0].bufI,
            mCount: t.vertexCount,
        };
        this.mTemplateBuf.set(_key, tb);
        return tb;
    }
    WriteSlot(_slot, _static) {
        const tb = this.GetTemplateBuf(this.mSlotKey[_slot]);
        const I = CVertexFormat.eIdentifier;
        const n = tb.mCount;
        const vs = this.mSlotVS[_slot];
        const sPos = tb.mPos, sNor = tb.mNor, sTan = tb.mTan;
        const oPos = this.F32(I.Position), oNor = this.F32(I.Normal), oTan = this.F32(I.Tangent);
        const m = this.mSlotMat, mo = _slot * 16;
        const m0 = m[mo], m1 = m[mo + 1], m2 = m[mo + 2], m3 = m[mo + 3];
        const m4 = m[mo + 4], m5 = m[mo + 5], m6 = m[mo + 6], m7 = m[mo + 7];
        const m8 = m[mo + 8], m9 = m[mo + 9], m10 = m[mo + 10], m11 = m[mo + 11];
        const m12 = m[mo + 12], m13 = m[mo + 13], m14 = m[mo + 14], m15 = m[mo + 15];
        const c00 = m5 * m10 - m9 * m6, c01 = m9 * m2 - m1 * m10, c02 = m1 * m6 - m5 * m2;
        const c10 = m8 * m6 - m4 * m10, c11 = m0 * m10 - m8 * m2, c12 = m4 * m2 - m0 * m6;
        const c20 = m4 * m9 - m8 * m5, c21 = m8 * m1 - m0 * m9, c22 = m0 * m5 - m4 * m1;
        const det = m0 * c00 + m4 * c01 + m8 * c02;
        const inv = det != 0 ? 1 / det : 0;
        const f = Math.fround;
        for (let i = 0; i < n; ++i) {
            const i3 = i * 3, i4 = i * 4;
            const o3 = (vs + i) * 3, o4 = (vs + i) * 4;
            const vx = sPos[i3], vy = sPos[i3 + 1], vz = sPos[i3 + 2];
            const w = (m3 * vx) + (m7 * vy) + (m11 * vz) + m15;
            const px = ((m0 * vx) + (m4 * vy) + (m8 * vz) + m12) / w;
            const py = ((m1 * vx) + (m5 * vy) + (m9 * vz) + m13) / w;
            const pz = ((m2 * vx) + (m6 * vy) + (m10 * vz) + m14) / w;
            oPos[o3] = px;
            oPos[o3 + 1] = py;
            oPos[o3 + 2] = pz;
            this.BoundPush(px, py, pz);
            const nx = sNor[i3], ny = sNor[i3 + 1], nz = sNor[i3 + 2];
            let ax = f((c00 * nx + c01 * ny + c02 * nz) * inv);
            let ay = f((c10 * nx + c11 * ny + c12 * nz) * inv);
            let az = f((c20 * nx + c21 * ny + c22 * nz) * inv);
            if (ax != 0 || ay != 0 || az != 0) {
                const len = Math.sqrt(ax * ax + ay * ay + az * az);
                ax = ax / len;
                ay = ay / len;
                az = az / len;
            }
            oNor[o3] = ax;
            oNor[o3 + 1] = ay;
            oNor[o3 + 2] = az;
            const tx = sTan[i4], ty = sTan[i4 + 1], tz = sTan[i4 + 2];
            let bx = f((m0 * tx) + (m4 * ty) + (m8 * tz));
            let by = f((m1 * tx) + (m5 * ty) + (m9 * tz));
            let bz = f((m2 * tx) + (m6 * ty) + (m10 * tz));
            if (bx != 0 || by != 0 || bz != 0) {
                const len = Math.sqrt(bx * bx + by * by + bz * bz);
                bx = bx / len;
                by = by / len;
                bz = bz / len;
            }
            oTan[o4] = bx;
            oTan[o4 + 1] = by;
            oTan[o4 + 2] = bz;
            oTan[o4 + 3] = sTan[i4 + 3];
        }
        if (_static) {
            const o2 = vs * 2, o3 = vs * 3, o4 = vs * 4;
            this.F32(I.UV).set(tb.mUV.subarray(0, n * 2), o2);
            this.F32(I.TexOff).set(tb.mTex.subarray(0, n * 3), o3);
            this.F32(I.Weight).set(tb.mWe.subarray(0, n * 4), o4);
            this.F32(I.WeightIndex).set(tb.mWi.subarray(0, n * 4), o4);
        }
        this.WriteBinormal(vs, n);
    }
    RenderAttr(_vf) {
        let wsa = new CShaderAttr("worldMat", this.GetFMat());
        switch (this.mWorldMatType) {
            case CMat.eType.Short2D:
                wsa.mKey = "worldMatShort";
                break;
        }
        wsa.mType = this.mWorldMatType;
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMatType", new CVec1(this.mWorldMatType)));
        this.mOwner.GetFrame().BMgr().SetBatchSA(wsa);
        if (_vf.mUniform.get("material") != null) {
            this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("material", this.mMaterial));
        }
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("weightArrMat", 16, this.mWeightMat));
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("skin", SDF.eSkin.None));
        if (_vf.mUniform.get("windInfluence") != null)
            this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("windInfluence", this.mWindInfluence));
    }
    Wind(_influence) {
        this.PushTag("wind");
        this.mWindInfluence.x = _influence;
    }
    static WindWeight(_pos, _we, _count) {
        for (let i = 0; i < _count * 4; ++i)
            if (_we[i] > 0.5)
                return _we;
        let minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < _count; ++i) {
            const y = _pos[i * 3 + 1];
            if (y < minY)
                minY = y;
            if (y > maxY)
                maxY = y;
        }
        const out = new Float32Array(_count * 4);
        const h = maxY - minY;
        if (h <= 0)
            return out;
        for (let i = 0; i < _count; ++i) {
            const r = (_pos[i * 3 + 1] - minY) / h;
            out[i * 4] = 0.5 + 0.5 * r * Math.sqrt(r);
        }
        return out;
    }
    TexOffMap(_tMesh, _tNode) {
        const texOff = new Array();
        for (const ttexOff of _tNode.mData.textureOff) {
            const key = this.mTexOverride != null ? this.mTexOverride[ttexOff] : _tMesh.texture[ttexOff];
            if (this.mTexOverride != null && key == null) {
                texOff.push(-1);
                continue;
            }
            let i = this.mTextureKey.indexOf(key);
            if (i < 0) {
                i = this.mTextureKey.length;
                this.mTextureKey.push(key);
                const tex = this.GetOwner().GetFrame().Res().Find(key);
                if (this.mAlphaTex == false && tex instanceof CTexture && tex.GetAlpha()) {
                    this.mAlphaTex = true;
                    this.ClearBatch();
                }
            }
            texOff.push(i);
        }
        return texOff;
    }
    SkinCalc(_PMat, _tMesh, _tNode, _skinMatList = new Array(_tMesh.skin.length)) {
        let LMat = CMath.MatScale(_tNode.mData.sca);
        if (_tNode.mData.rot.w >= 100000)
            CMath.MatMul(LMat, CMath.MatRotation(_tNode.mData.rot), LMat);
        else
            CMath.MatMul(LMat, CMath.QutToMat(_tNode.mData.rot), LMat);
        LMat.SetV3(3, _tNode.mData.pos);
        let LPMat = CMath.MatMul(LMat, _PMat);
        for (let i = 0; i < _tMesh.skin.length; i++) {
            if (_tNode.mData.IsSkinKey(_tMesh.skin[i].key)) {
                _skinMatList[i] = CMath.MatMul(_tMesh.skin[i].mat, LPMat);
            }
        }
        if (_tNode.mColleague != null)
            this.SkinCalc(_PMat, _tMesh, _tNode.mColleague, _skinMatList);
        if (_tNode.mChild != null)
            this.SkinCalc(LPMat, _tMesh, _tNode.mChild, _skinMatList);
        return _skinMatList;
    }
    SourceTangent(_ci) {
        let tanb = _ci.GetVFType(CVertexFormat.eIdentifier.Tangent);
        if (tanb.length > 0 && tanb[0].bufF.IsEmpty() == false)
            return tanb[0].bufF;
        let posb = _ci.GetVFType(CVertexFormat.eIdentifier.Position)[0];
        let norb = _ci.GetVFType(CVertexFormat.eIdentifier.Normal)[0];
        let uvb = _ci.GetVFType(CVertexFormat.eIdentifier.UV)[0];
        let inb = _ci.GetVFType(CVertexFormat.eIdentifier.Index)[0];
        if (posb == null || norb == null || uvb == null || inb == null)
            return null;
        let out = tanb.length > 0 ? tanb[0] : _ci.Create(CVertexFormat.eIdentifier.Tangent);
        out.bufF.Resize(posb.bufF.Size(3) * 4);
        CUtilRender.TangentCalculate(posb.bufF, norb.bufF, uvb.bufF, inb.bufI, out.bufF);
        return out.bufF;
    }
    CanFastMerge(_src, _oCI) {
        const I = CVertexFormat.eIdentifier;
        const pos = _src.GetVFType(I.Position)[0], uv = _src.GetVFType(I.UV)[0], nor = _src.GetVFType(I.Normal)[0];
        const tex = _src.GetVFType(I.TexOff)[0], ind = _src.GetVFType(I.Index)[0];
        if (pos == null || uv == null || nor == null || tex == null || ind == null)
            return false;
        const n = pos.bufF.mSize / 3;
        if (n != Math.floor(n) || uv.bufF.mSize < n * 2 || nor.bufF.mSize < n * 3 || tex.bufF.mSize < n * 3)
            return false;
        const we = _src.GetVFType(I.Weight)[0], wi = _src.GetVFType(I.WeightIndex)[0];
        if (we != null && (wi == null || we.bufF.mSize < n * 4 || wi.bufF.mSize < n * 4))
            return false;
        const vc = _oCI.vertexCount;
        const outs = [[I.Position, 3], [I.UV, 2], [I.Normal, 3], [I.TexOff, 3], [I.Weight, 4], [I.WeightIndex, 4], [I.Tangent, 4]];
        for (const [id, k] of outs) {
            const b = _oCI.GetVFType(id)[0];
            if (b != null && b.bufF.mSize != vc * k)
                return false;
        }
        return true;
    }
    static GrowF32(_buf, _add) {
        const need = _buf.mSize + _add;
        if (need > _buf.mF32A.length) {
            const arr = new Float32Array(Math.max(need, _buf.mF32A.length * 2));
            arr.set(_buf.mF32A.subarray(0, _buf.mSize));
            _buf.mF32A = arr;
        }
        return _buf.mF32A;
    }
    Merge(_PMat, _tMesh, _tNode, _oCI, _bound, _skinMatList) {
        const src = _tNode.mData.ci;
        if (src != null && this.CanFastMerge(src, _oCI) == false) {
            this.MergeSlow(_PMat, _tMesh, _tNode, _oCI, _bound, _skinMatList);
            return;
        }
        let LMat = CMath.MatScale(_tNode.mData.sca);
        if (_tNode.mData.rot.w >= 100000)
            CMath.MatMul(LMat, CMath.MatRotation(_tNode.mData.rot), LMat);
        else
            CMath.MatMul(LMat, CMath.QutToMat(_tNode.mData.rot), LMat);
        LMat.SetV3(3, _tNode.mData.pos);
        let LPMat;
        if (src != null) {
            const I = CVertexFormat.eIdentifier;
            const sPos = src.GetVFType(I.Position)[0].bufF.mF32A;
            const sUV = src.GetVFType(I.UV)[0].bufF.mF32A;
            const sNor = src.GetVFType(I.Normal)[0].bufF.mF32A;
            const sTex = src.GetVFType(I.TexOff)[0].bufF.mF32A;
            const sIdx = src.GetVFType(I.Index)[0].bufI;
            const sWeB = src.GetVFType(I.Weight)[0], sWiB = src.GetVFType(I.WeightIndex)[0];
            const sWe = sWeB != null ? sWeB.bufF.mF32A : null, sWi = sWiB != null ? sWiB.bufF.mF32A : null;
            const sTanB = this.SourceTangent(src);
            const sTan = sTanB != null ? sTanB.mF32A : null;
            const n = src.GetVFType(I.Position)[0].bufF.mSize / 3;
            const texOff = this.TexOffMap(_tMesh, _tNode);
            const Out = (_id) => {
                let b = _oCI.GetVFType(_id)[0];
                if (b == null)
                    b = _oCI.Create(_id);
                return b;
            };
            const ovb = Out(I.Position), oub = Out(I.UV), onb = Out(I.Normal), otb = Out(I.TexOff);
            const oweb = Out(I.Weight), owib = Out(I.WeightIndex), oinb = Out(I.Index), otanb = Out(I.Tangent);
            LPMat = CMath.MatMul(LMat, _PMat);
            const nMat = CMath.MatTranspose(CMath.MatInvert(LPMat));
            const m = LPMat.mF32A, nm = nMat.mF32A;
            const base = _oCI.vertexCount;
            const oPos = CPaint3DMerge.GrowF32(ovb.bufF, n * 3), oUV = CPaint3DMerge.GrowF32(oub.bufF, n * 2);
            const oNor = CPaint3DMerge.GrowF32(onb.bufF, n * 3), oTex = CPaint3DMerge.GrowF32(otb.bufF, n * 3);
            const oWe = CPaint3DMerge.GrowF32(oweb.bufF, n * 4), oWi = CPaint3DMerge.GrowF32(owib.bufF, n * 4);
            const oTan = CPaint3DMerge.GrowF32(otanb.bufF, n * 4);
            const f = Math.fround;
            const skinV = new CVec3(), skinOut = new CVec3();
            for (let i = 0; i < n; ++i) {
                const i2 = i * 2, i3 = i * 3, i4 = i * 4;
                const o2 = (base + i) * 2, o3 = (base + i) * 3, o4 = (base + i) * 4;
                let vx = sPos[i3], vy = sPos[i3 + 1], vz = sPos[i3 + 2];
                if (sWe != null && _skinMatList.length > 0 && sWe[i4] + sWe[i4 + 1] + sWe[i4 + 2] + sWe[i4 + 3] > 0.0) {
                    var SkinMat = CMath.MatMulFloat(_skinMatList[sWi[i4]], sWe[i4]);
                    SkinMat = CMath.MatAdd(CMath.MatMulFloat(_skinMatList[sWi[i4 + 1]], sWe[i4 + 1]), SkinMat);
                    SkinMat = CMath.MatAdd(CMath.MatMulFloat(_skinMatList[sWi[i4 + 2]], sWe[i4 + 2]), SkinMat);
                    SkinMat = CMath.MatAdd(CMath.MatMulFloat(_skinMatList[sWi[i4 + 3]], sWe[i4 + 3]), SkinMat);
                    skinV.mF32A[0] = vx;
                    skinV.mF32A[1] = vy;
                    skinV.mF32A[2] = vz;
                    CMath.V3MulMatCoordi(skinV, SkinMat, skinOut);
                    vx = skinOut.mF32A[0];
                    vy = skinOut.mF32A[1];
                    vz = skinOut.mF32A[2];
                }
                const w = (m[3] * vx) + (m[7] * vy) + (m[11] * vz) + m[15];
                oPos[o3] = ((m[0] * vx) + (m[4] * vy) + (m[8] * vz) + m[12]) / w;
                oPos[o3 + 1] = ((m[1] * vx) + (m[5] * vy) + (m[9] * vz) + m[13]) / w;
                oPos[o3 + 2] = ((m[2] * vx) + (m[6] * vy) + (m[10] * vz) + m[14]) / w;
                oUV[o2] = sUV[i2];
                oUV[o2 + 1] = sUV[i2 + 1];
                const nx = sNor[i3], ny = sNor[i3 + 1], nz = sNor[i3 + 2];
                let ax = f((nm[0] * nx) + (nm[4] * ny) + (nm[8] * nz));
                let ay = f((nm[1] * nx) + (nm[5] * ny) + (nm[9] * nz));
                let az = f((nm[2] * nx) + (nm[6] * ny) + (nm[10] * nz));
                if (ax != 0 || ay != 0 || az != 0) {
                    const len = Math.sqrt(ax * ax + ay * ay + az * az);
                    ax = ax / len;
                    ay = ay / len;
                    az = az / len;
                }
                oNor[o3] = ax;
                oNor[o3 + 1] = ay;
                oNor[o3 + 2] = az;
                const tx = sTan != null ? sTan[i4] : 1, ty = sTan != null ? sTan[i4 + 1] : 0, tz = sTan != null ? sTan[i4 + 2] : 0, tw = sTan != null ? sTan[i4 + 3] : 1;
                let bx = f((m[0] * tx) + (m[4] * ty) + (m[8] * tz));
                let by = f((m[1] * tx) + (m[5] * ty) + (m[9] * tz));
                let bz = f((m[2] * tx) + (m[6] * ty) + (m[10] * tz));
                if (bx != 0 || by != 0 || bz != 0) {
                    const len = Math.sqrt(bx * bx + by * by + bz * bz);
                    bx = bx / len;
                    by = by / len;
                    bz = bz / len;
                }
                oTan[o4] = bx;
                oTan[o4 + 1] = by;
                oTan[o4 + 2] = bz;
                oTan[o4 + 3] = tw;
                const t0 = sTex[i3], t1 = sTex[i3 + 1], t2 = sTex[i3 + 2];
                oTex[o3] = t0 != -1 ? texOff[t0] : -1;
                oTex[o3 + 1] = t1 != -1 ? texOff[t1] : -1;
                oTex[o3 + 2] = t2 != -1 ? texOff[t2] : -1;
                if (sWe != null) {
                    oWe[o4] = sWe[i4];
                    oWe[o4 + 1] = sWe[i4 + 1];
                    oWe[o4 + 2] = sWe[i4 + 2];
                    oWe[o4 + 3] = sWe[i4 + 3];
                    oWi[o4] = sWi[i4];
                    oWi[o4 + 1] = sWi[i4 + 1];
                    oWi[o4 + 2] = sWi[i4 + 2];
                    oWi[o4 + 3] = sWi[i4 + 3];
                }
                else {
                    oWe[o4] = 0;
                    oWe[o4 + 1] = 0;
                    oWe[o4 + 2] = 0;
                    oWe[o4 + 3] = 0;
                    oWi[o4] = 0;
                    oWi[o4 + 1] = 0;
                    oWi[o4 + 2] = 0;
                    oWi[o4 + 3] = 0;
                }
            }
            ovb.bufF.mSize += n * 3;
            oub.bufF.mSize += n * 2;
            onb.bufF.mSize += n * 3;
            otb.bufF.mSize += n * 3;
            oweb.bufF.mSize += n * 4;
            owib.bufF.mSize += n * 4;
            otanb.bufF.mSize += n * 4;
            const oIdx = oinb.bufI;
            const bMin = _bound.mMin.mF32A, bMax = _bound.mMax.mF32A;
            for (let k = 0; k < sIdx.length; ++k) {
                const idx = sIdx[k] + base;
                oIdx.push(idx);
                const p = idx * 3;
                const px = oPos[p], py = oPos[p + 1], pz = oPos[p + 2];
                if (px < bMin[0])
                    bMin[0] = px;
                if (px > bMax[0])
                    bMax[0] = px;
                if (py < bMin[1])
                    bMin[1] = py;
                if (py > bMax[1])
                    bMax[1] = py;
                if (pz < bMin[2])
                    bMin[2] = pz;
                if (pz > bMax[2])
                    bMax[2] = pz;
            }
            if (sIdx.length > 0 && _bound.GetType() == CBound.eType.Null)
                _bound.SetType(CBound.eType.Box);
            _oCI.vertexCount += src.vertexCount;
            _oCI.indexCount += src.indexCount;
        }
        else {
            LPMat = CMath.MatMul(LMat, _PMat);
        }
        if (_tNode.mColleague != null)
            this.Merge(_PMat, _tMesh, _tNode.mColleague, _oCI, _bound, _skinMatList);
        if (_tNode.mChild != null)
            this.Merge(LPMat, _tMesh, _tNode.mChild, _oCI, _bound, _skinMatList);
    }
    MergeSlow(_PMat, _tMesh, _tNode, _oCI, _bound, _skinMatList) {
        let LMat = CMath.MatScale(_tNode.mData.sca);
        if (_tNode.mData.rot.w >= 100000)
            CMath.MatMul(LMat, CMath.MatRotation(_tNode.mData.rot), LMat);
        else
            CMath.MatMul(LMat, CMath.QutToMat(_tNode.mData.rot), LMat);
        LMat.SetV3(3, _tNode.mData.pos);
        let LPMat;
        if (_tNode.mData.ci != null) {
            let tvb = _tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.Position);
            let tub = _tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.UV);
            let tnb = _tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.Normal);
            let ttb = _tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.TexOff);
            let tweb = _tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.Weight);
            let twib = _tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.WeightIndex);
            let tinb = _tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.Index);
            let ttanb = this.SourceTangent(_tNode.mData.ci);
            const texOff = this.TexOffMap(_tMesh, _tNode);
            let ovb = _oCI.GetVFType(CVertexFormat.eIdentifier.Position);
            let oub = _oCI.GetVFType(CVertexFormat.eIdentifier.UV);
            let onb = _oCI.GetVFType(CVertexFormat.eIdentifier.Normal);
            let otb = _oCI.GetVFType(CVertexFormat.eIdentifier.TexOff);
            let oweb = _oCI.GetVFType(CVertexFormat.eIdentifier.Weight);
            let owib = _oCI.GetVFType(CVertexFormat.eIdentifier.WeightIndex);
            let oinb = _oCI.GetVFType(CVertexFormat.eIdentifier.Index);
            if (ovb.length == 0) {
                _oCI.Create(CVertexFormat.eIdentifier.Position);
                ovb = _oCI.GetVFType(CVertexFormat.eIdentifier.Position);
            }
            if (oub.length == 0) {
                _oCI.Create(CVertexFormat.eIdentifier.UV);
                oub = _oCI.GetVFType(CVertexFormat.eIdentifier.UV);
            }
            if (onb.length == 0) {
                _oCI.Create(CVertexFormat.eIdentifier.Normal);
                onb = _oCI.GetVFType(CVertexFormat.eIdentifier.Normal);
            }
            if (otb.length == 0) {
                _oCI.Create(CVertexFormat.eIdentifier.TexOff);
                otb = _oCI.GetVFType(CVertexFormat.eIdentifier.TexOff);
            }
            if (oweb.length == 0) {
                _oCI.Create(CVertexFormat.eIdentifier.Weight);
                oweb = _oCI.GetVFType(CVertexFormat.eIdentifier.Weight);
            }
            if (owib.length == 0) {
                _oCI.Create(CVertexFormat.eIdentifier.WeightIndex);
                owib = _oCI.GetVFType(CVertexFormat.eIdentifier.WeightIndex);
            }
            if (oinb.length == 0) {
                _oCI.Create(CVertexFormat.eIdentifier.Index);
                oinb = _oCI.GetVFType(CVertexFormat.eIdentifier.Index);
            }
            let otanb = _oCI.GetVFType(CVertexFormat.eIdentifier.Tangent);
            if (otanb.length == 0) {
                _oCI.Create(CVertexFormat.eIdentifier.Tangent);
                otanb = _oCI.GetVFType(CVertexFormat.eIdentifier.Tangent);
            }
            for (let i = 0; i < tvb[0].bufF.Size(3); ++i) {
                let v = tvb[0].bufF.V3(i);
                let u = tub[0].bufF.V2(i);
                let n = tnb[0].bufF.V3(i);
                let t = ttb[0].bufF.V3(i);
                ovb[0].bufF.Push(v);
                oub[0].bufF.Push(u);
                onb[0].bufF.Push(n);
                otanb[0].bufF.Push(ttanb != null ? ttanb.V4(i) : new CVec4(1, 0, 0, 1));
                let toff = new CVec3(-1, -1, -1);
                if (t.x != -1)
                    toff.x = texOff[t.x];
                if (t.y != -1)
                    toff.y = texOff[t.y];
                if (t.z != -1)
                    toff.z = texOff[t.z];
                otb[0].bufF.Push(toff);
                if (tweb.length > 0) {
                    let we = tweb[0].bufF.V4(i);
                    let wi = twib[0].bufF.V4(i);
                    oweb[0].bufF.Push(we);
                    owib[0].bufF.Push(wi);
                }
                else {
                    oweb[0].bufF.Push(new CVec4(0, 0, 0, 0));
                    owib[0].bufF.Push(new CVec4(0, 0, 0, 0));
                }
            }
            LPMat = CMath.MatMul(LMat, _PMat);
            if (tweb.length > 0) {
                let tempv = new CVec3();
                for (let i = 0; i < tvb[0].bufF.Size(3); ++i) {
                    let we = tweb[0].bufF.V4(i);
                    let wi = twib[0].bufF.V4(i);
                    let v = ovb[0].bufF.V3(_oCI.vertexCount + i);
                    if (_skinMatList.length > 0 && we.x + we.y + we.z + we.w > 0.0) {
                        var SkinMat = CMath.MatMulFloat(_skinMatList[wi.x], we.x);
                        SkinMat = CMath.MatAdd(CMath.MatMulFloat(_skinMatList[wi.y], we.y), SkinMat);
                        SkinMat = CMath.MatAdd(CMath.MatMulFloat(_skinMatList[wi.z], we.z), SkinMat);
                        SkinMat = CMath.MatAdd(CMath.MatMulFloat(_skinMatList[wi.w], we.w), SkinMat);
                        CMath.V3MulMatCoordi(v, SkinMat, tempv);
                        ovb[0].bufF.X3(_oCI.vertexCount + i, tempv.x);
                        ovb[0].bufF.Y3(_oCI.vertexCount + i, tempv.y);
                        ovb[0].bufF.Z3(_oCI.vertexCount + i, tempv.z);
                    }
                }
            }
            let tempv = new CVec3();
            for (let i = _oCI.vertexCount; i < ovb[0].bufF.Size(3); ++i) {
                let v = ovb[0].bufF.V3(i);
                CMath.V3MulMatCoordi(v, LPMat, tempv);
                ovb[0].bufF.X3(i, tempv.x);
                ovb[0].bufF.Y3(i, tempv.y);
                ovb[0].bufF.Z3(i, tempv.z);
            }
            let nMat = CMath.MatTranspose(CMath.MatInvert(LPMat));
            let tempn = new CVec3();
            for (let i = _oCI.vertexCount; i < onb[0].bufF.Size(3); ++i) {
                let n = onb[0].bufF.V3(i);
                CMath.V3MulMatNormal(n, nMat, tempn);
                CMath.V3Nor(tempn, tempn);
                onb[0].bufF.X3(i, tempn.x);
                onb[0].bufF.Y3(i, tempn.y);
                onb[0].bufF.Z3(i, tempn.z);
            }
            for (let i = _oCI.vertexCount; i < otanb[0].bufF.Size(4); ++i) {
                let t = otanb[0].bufF.V4(i);
                CMath.V3MulMatNormal(t.xyz, LPMat, tempn);
                CMath.V3Nor(tempn, tempn);
                otanb[0].bufF.V4(i, tempn.x, tempn.y, tempn.z, t.w);
            }
            for (let i = 0; i < tinb[0].bufI.length; ++i) {
                _bound.InitBound(ovb[0].bufF.V3(tinb[0].bufI[i] + _oCI.vertexCount));
                oinb[0].bufI.push(tinb[0].bufI[i] + _oCI.vertexCount);
            }
            _oCI.vertexCount += _tNode.mData.ci.vertexCount;
            _oCI.indexCount += _tNode.mData.ci.indexCount;
        }
        else {
            LPMat = CMath.MatMul(LMat, _PMat);
        }
        if (_tNode.mColleague != null)
            this.Merge(_PMat, _tMesh, _tNode.mColleague, _oCI, _bound, _skinMatList);
        if (_tNode.mChild != null)
            this.Merge(LPMat, _tMesh, _tNode.mChild, _oCI, _bound, _skinMatList);
    }
}

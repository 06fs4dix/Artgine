import { CUpdate } from "../../../basic/Basic.js";
import { CAlert } from "../../../basic/CAlert.js";
import { CArray } from "../../../basic/CArray.js";
import { CHash } from "../../../basic/CHash.js";
import { CString } from "../../../basic/CString.js";
import { CTree } from "../../../basic/CTree.js";
import { CWASM } from "../../../basic/CWASM.js";
import { CBound } from "../../../geometry/CBound.js";
import { CMat } from "../../../geometry/CMat.js";
import { CMath } from "../../../geometry/CMath.js";
import { CVec1 } from "../../../geometry/CVec1.js";
import { CVec3 } from "../../../geometry/CVec3.js";
import { CDevice } from "../../../render/CDevice.js";
import { CMesh } from "../../../render/CMesh.js";
import { CMeshCopyNode } from "../../../render/CMeshCopyNode.js";
import { CMeshCreateInfo } from "../../../render/CMeshCreateInfo.js";
import { CMeshDataNode } from "../../../render/CMeshDataNode.js";
import { CMeshPaint } from "../../../render/CMeshPaint.js";
import { CMeshTreeUpdate } from "../../../render/CMeshTreeUpdate.js";
import { CRenderPass } from "../../../render/CRenderPass.js";
import { CVertexFormat } from "../../../render/CShader.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { SDF } from "../../../z_file/SDF.js";
import { CRPAuto } from "../../CRPMgr.js";
import { CPaint } from "./CPaint.js";
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
    mCamCompLayer = [];
    mTexLoad = false;
    mFMatLink = false;
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
        this.InitMesh(this.mMesh);
    }
    Bake() { this.PushTag("bake"); }
    Env() { this.PushTag("env"); }
    Wind(_influence) {
        this.PushTag("wind");
        this.mWindInfluence.x = _influence;
    }
    ParallaxNormal(_value) {
        this.PushTag("parallax");
        this.PushCShaderAttr(new CShaderAttr("parallaxNormal", new CVec1(0.05)));
    }
    EditDrop(_object) {
        if (_object instanceof CMesh) {
            this.SetMesh(_object.Key());
        }
    }
    CubeMap(_camComp) {
        if (this.mTag.has(_camComp.mRead) == false)
            return;
        var len = CMath.V3Distance(this.mOwner.GetPos(), _camComp.GetOwner().GetPos());
        var play = this.mCamCompLayer[_camComp.mLayer];
        if (play == null) {
            if (_camComp.mReadLen > len) {
                this.PushCShaderAttr(new CShaderAttr(0, _camComp.GetTex()));
                this.mCamCompLayer[_camComp.mLayer] = _camComp;
            }
        }
        else if (play == _camComp) {
            if (_camComp.mReadLen < len) {
                this.mShaderAttrMap.delete(_camComp.GetTex());
                this.ClearBatch();
                this.mCamCompLayer[_camComp.mLayer] = null;
            }
        }
        else if (_camComp.mReadLen > len) {
            var len2 = CMath.V3Distance(this.mOwner.GetPos(), play.GetOwner().GetPos());
            if (len2 > len) {
                this.mCamCompLayer[_camComp.mLayer] = _camComp;
                this.mShaderAttrMap.get(_camComp.GetTex()).mKey = _camComp.GetTex();
            }
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
            if (this.InitMesh(this.mMesh) == false)
                this.mInit = false;
        }
    }
    EmptyRPChk() {
        if (this.mTree == null || this.mRenderPass.length == 0) {
            let sChk = true;
            for (let each0 of this.mRenderPass) {
                if (each0.mTag == "shadowWrite") {
                    continue;
                }
                sChk = false;
            }
            if (sChk)
                this.mRenderPass.push(new CRPAuto(this.mOwner.GetFrame().Pal().Sl3D().mKey));
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
    InitMesh(_mesh) {
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
        if (this.mMeshRes.skin.length > 0)
            this.mSkinType = SDF.eSkin.Bone;
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
        this.mBoundFMatR = 0;
        if (node.Size() == 1) {
            let ne = node.Find(0);
            if (ne.sum.IsUnit()) {
                ne.sumSA.mData = this.GetFMat();
                this.mFMatLink = true;
            }
        }
        return true;
    }
    Update(_update) {
        super.Update(_update);
        if (this.mUpdateFMat == false || this.mFMatLink)
            return;
        if (CWASM.IsWASM()) {
            this.mFMat.mF32A[3] = this.mFMat.mF32A[12];
            this.mFMat.mF32A[7] = this.mFMat.mF32A[13];
            this.mFMat.mF32A[11] = this.mFMat.mF32A[14];
        }
        const node = this.mTreeNode;
        const nSize = node.Size();
        for (let nodeOff = 0; nodeOff < nSize; nodeOff++) {
            const nodemp = node.mArray[nodeOff];
            const mpiData = nodemp.mpi.mData;
            if (mpiData.updateMat !== CUpdate.eType.Not || mpiData.FMatAtt === false) {
                if (this.mSkinType != SDF.eSkin.None && nodemp.md.mData.ci != null) {
                    nodemp.sum.Import(this.GetFMat());
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
                        CMath.MatMul(mpiData.pst, this.GetFMat(), nodemp.sum);
                    }
                    else if (this.GetFMat() != nodemp.sumSA.mData) {
                        nodemp.sumSA.mData = this.GetFMat();
                    }
                }
                else {
                    CMath.MatMul(mpiData.pst, this.GetFMat(), nodemp.sum);
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
            if (CWASM.IsWASM()) {
                _node.sumSA.mKey = "worldMat34";
                _node.sumSA.mType = 12;
            }
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
        if (this.mCenterPos)
            this.mLMat.SetV3(3, CMath.V3MulFloat(this.mBound.GetCenter(), -1));
        if (this.mTargetScale != 0) {
            let size = this.mBound.GetSize();
            let maxSize = CMath.Max(CMath.Max(size.x, size.y), size.z);
            this.mLMat.mF32A[0] = this.mTargetScale / maxSize;
            this.mLMat.mF32A[5] = this.mTargetScale / maxSize;
            this.mLMat.mF32A[10] = this.mTargetScale / maxSize;
        }
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
        this.mRenderPass[0] = new CRenderPass(this.GetOwner().GetFrame().Pal().SlCubeKey());
        if (this.mTag.has("sky") || this.mTag.has("table")) {
            this.mRenderPass[0].mPriority = CRenderPass.ePriority.BackGround;
            this.mRenderPass[0].mCullFace = CRenderPass.eCull.None;
            this.mRenderPass[0].mCullFrustum = false;
        }
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
export class CPaintMeshMerge extends CPaint {
    constructor(_meshList, _matList, _centerPos = false, _targetScale = 0) {
        super();
        this.mMeshList = _meshList;
        this.mMatList = _matList;
        this.mCenterPos = _centerPos;
        this.mTargetScale = _targetScale;
    }
    mMeshList;
    mMatList;
    mMeshDataNode = new CMeshDataNode();
    mHash = "";
    mCenterPos = false;
    mTargetScale = 0;
    IsShould(_member, _type) {
        if (_member == "mMeshDataNode")
            return false;
        return super.IsShould(_member, _type);
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
        this.mMeshDataNode.ci = new CMeshCreateInfo();
        this.mBound.Reset();
        this.mBound.SetType(CBound.eType.Box);
        this.mHash = "";
        for (let i = 0; i < this.mMeshList.length; ++i) {
            let mesh = this.GetOwner().GetFrame().Res().Find(this.mMeshList[i]);
            this.mHash += this.mMeshList[i];
            this.mHash += this.mMatList[i].ToStr();
            this.Merge(this.mMatList[i], mesh, mesh.meshTree, this.mMeshDataNode.ci, this.mBound);
        }
        this.mHash = CHash.HashCode(this.mHash) + "";
    }
    Render(_vf) {
        var barr = this.RenderBatch(_vf, 1);
        if (barr == null)
            return;
        this.mOwner.GetFrame().BMgr().BatchOn();
        this.Common(_vf);
        let wsa = new CShaderAttr("worldMat", this.mLMat);
        this.mOwner.GetFrame().BMgr().SetBatchSA(wsa);
        if (_vf.mUniform.get("material") != null) {
            this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("material", this.mMaterial));
        }
        this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey);
        var dm = this.GetDrawMesh("Artgine/DM/3DM" + this.mHash, _vf, this.mMeshDataNode.ci);
        this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);
        barr[0] = this.mOwner.GetFrame().BMgr().BatchOff();
    }
    Merge(_PMat, _mesh, _node, _ci, _bound) {
        let LMat = CMath.MatScale(_node.mData.sca);
        CMath.MatMul(LMat, CMath.MatRotation(_node.mData.rot), LMat);
        LMat.SetV3(3, _node.mData.pos);
        let LPMat = CMath.MatMul(LMat, _PMat);
        if (_node.mData.ci != null) {
            let tvb = _node.mData.ci.GetVFType(CVertexFormat.eIdentifier.Position);
            let tub = _node.mData.ci.GetVFType(CVertexFormat.eIdentifier.UV);
            let tnb = _node.mData.ci.GetVFType(CVertexFormat.eIdentifier.Normal);
            let ttb = _node.mData.ci.GetVFType(CVertexFormat.eIdentifier.TexOff);
            let texOff = [];
            for (let tex of _mesh.texture) {
                let push = true;
                for (let i = 0; i < this.mTextureKey.length; ++i) {
                    if (this.mTextureKey[i] == tex) {
                        push = false;
                        texOff.push(i);
                        break;
                    }
                }
                if (push) {
                    texOff.push(this.mTextureKey.length);
                    this.mTextureKey.push(tex);
                }
            }
            let ovb = _ci.GetVFType(CVertexFormat.eIdentifier.Position);
            let oub = _ci.GetVFType(CVertexFormat.eIdentifier.UV);
            let onb = _ci.GetVFType(CVertexFormat.eIdentifier.Normal);
            let otb = _ci.GetVFType(CVertexFormat.eIdentifier.TexOff);
            if (ovb.length == 0) {
                _ci.Create(CVertexFormat.eIdentifier.Position);
                ovb = _ci.GetVFType(CVertexFormat.eIdentifier.Position);
            }
            if (oub.length == 0) {
                _ci.Create(CVertexFormat.eIdentifier.UV);
                oub = _ci.GetVFType(CVertexFormat.eIdentifier.UV);
            }
            if (onb.length == 0) {
                _ci.Create(CVertexFormat.eIdentifier.Normal);
                onb = _ci.GetVFType(CVertexFormat.eIdentifier.Normal);
            }
            if (otb.length == 0) {
                _ci.Create(CVertexFormat.eIdentifier.TexOff);
                otb = _ci.GetVFType(CVertexFormat.eIdentifier.TexOff);
            }
            for (let i = 0; i < tvb[0].bufF.Size(3); ++i) {
                let v = tvb[0].bufF.V3(i);
                let u = tub[0].bufF.V2(i);
                let n = tnb[0].bufF.V3(i);
                let t = ttb[0].bufF.V3(i);
                ovb[0].bufF.Push(v);
                oub[0].bufF.Push(u);
                onb[0].bufF.Push(n);
                let toff = new CVec3(-1, -1, -1);
                if (t.x != -1)
                    toff.x = texOff[t.x];
                if (t.y != -1)
                    toff.y = texOff[t.y];
                if (t.z != -1)
                    toff.z = texOff[t.z];
                otb[0].bufF.Push(toff);
            }
            let mat = new CMat();
            if (this.mTargetScale != 0) {
                let size = _node.mData.ci.bound.GetSize();
                let maxSize = CMath.Max(CMath.Max(size.x, size.y), size.z);
                mat.mF32A[0] = this.mTargetScale / maxSize;
                mat.mF32A[5] = this.mTargetScale / maxSize;
                mat.mF32A[10] = this.mTargetScale / maxSize;
            }
            if (this.mCenterPos) {
                let center = _node.mData.ci.bound.GetCenter();
                mat.mF32A[12] = center.x * mat.mF32A[0];
                mat.mF32A[13] = center.y * mat.mF32A[5];
                mat.mF32A[14] = center.z * mat.mF32A[10];
            }
            mat.UnitCheck();
            LPMat = CMath.MatMul(mat, LPMat);
            let tempv = new CVec3();
            for (let i = _ci.vertexCount; i < ovb[0].bufF.Size(3); ++i) {
                let v = ovb[0].bufF.V3(i);
                CMath.V3MulMatCoordi(v, LPMat, tempv);
                ovb[0].bufF.X3(i, tempv.x);
                ovb[0].bufF.Y3(i, tempv.y);
                ovb[0].bufF.Z3(i, tempv.z);
            }
            let tiv = _node.mData.ci.index;
            for (let i = 0; i < tiv.length; ++i) {
                _bound.InitBound(ovb[0].bufF.V3(tiv[i] + _ci.vertexCount));
                _ci.index.push(tiv[i] + _ci.vertexCount);
            }
            _ci.vertexCount += _node.mData.ci.vertexCount;
            _ci.indexCount += _node.mData.ci.indexCount;
        }
        if (_node.mColleague != null)
            this.Merge(_PMat, _mesh, _node.mColleague, _ci, _bound);
        if (_node.mChild != null)
            this.Merge(LPMat, _mesh, _node.mChild, _ci, _bound);
    }
    EmptyRPChk() {
        if (this.mRenderPass.length == 0) {
            let sChk = true;
            for (let each0 of this.mRenderPass) {
                if (each0.mTag == "shadowWrite") {
                    continue;
                }
                sChk = false;
            }
            if (sChk)
                this.mRenderPass.push(new CRPAuto(this.mOwner.GetFrame().Pal().Sl3D().mKey));
        }
    }
}

import { CUpdate } from "../../../basic/Basic.js";
import { CAlert } from "../../../basic/CAlert.js";
import { CArray } from "../../../basic/CArray.js";
import { CHash } from "../../../basic/CHash.js";
import { CString } from "../../../basic/CString.js";
import { CTree } from "../../../basic/CTree.js";
import { CBound } from "../../../geometry/CBound.js";
import { CMat } from "../../../geometry/CMat.js";
import { CMath } from "../../../geometry/CMath.js";
import { CVec1 } from "../../../geometry/CVec1.js";
import { CVec3 } from "../../../geometry/CVec3.js";
import { CVec4 } from "../../../geometry/CVec4.js";
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
import { CRPAuto } from "../../canvas/CRPMgr.js";
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
    mBrushCompArr = [];
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
        this.BuildMesh(this.mMesh);
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
        if (this.mTag.has(_camComp.mReadTag) == false)
            return;
        var len = CMath.V3Distance(this.mOwner.GetPos(), _camComp.GetOwner().GetPos());
        var play = this.mBrushCompArr[_camComp.mTexOff];
        if (play == null) {
            if (_camComp.mReadLen > len) {
                this.PushCShaderAttr(new CShaderAttr(0, _camComp.GetTex()));
                this.PushCShaderAttr(new CShaderAttr("envmapOn", 1));
                this.mBrushCompArr[_camComp.mTexOff] = _camComp;
            }
        }
        else if (play == _camComp) {
            if (_camComp.mReadLen < len) {
                this.mShaderAttrMap.delete(_camComp.GetTex());
                this.ClearBatch();
                this.mBrushCompArr[_camComp.mTexOff] = null;
            }
        }
        else if (_camComp.mReadLen > len) {
            var len2 = CMath.V3Distance(this.mOwner.GetPos(), play.GetOwner().GetPos());
            if (len2 > len) {
                this.mBrushCompArr[_camComp.mTexOff] = _camComp;
                this.FindCShaderAttr(0).mKey = _camComp.GetTex();
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
            if (this.BuildMesh(this.mMesh) == false)
                this.mInit = false;
        }
    }
    EmptyRPChk() {
        if (this.mTree == null || this.mRenderPass.length == 0) {
            let sChk = true;
            for (let each0 of this.mRenderPass) {
                if (each0.mTag.has("shadowWrite") == true) {
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
        if (node.Size() == 1) {
            let ne = node.Find(0);
            if (ne.sum.IsUnit()) {
                ne.sumSA.mData = this.GetFMat();
                this.mFMatLink = true;
            }
        }
        this.mBound.MatCoordi(this.mLMat);
        return true;
    }
    Update(_update) {
        super.Update(_update);
        if (this.mUpdateFMat == false)
            return;
        if (this.mFMatLink)
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
export class CPaint3DMerge extends CPaint {
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
    mWeightMat;
    mWeightMatArr = [];
    mHash = "";
    mCenterPos = false;
    mTargetScale = 0;
    mWindInfluence = new CVec1(0.0);
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
            const calcSkinMat = this.SkinCalc(new CMat(), mesh, mesh.meshTree);
            this.Merge(this.mMatList[i], mesh, mesh.meshTree, this.mMeshDataNode.ci, this.mBound, calcSkinMat);
        }
        this.mHash = CHash.HashCode(this.mHash) + "";
    }
    Render(_vf) {
        var barr = this.RenderBatch(_vf, 1);
        if (barr == null)
            return;
        this.mOwner.GetFrame().BMgr().BatchOn();
        this.Common(_vf);
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
        this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey);
        var dm = this.GetDrawMesh("Artgine/DM/3DM" + this.mHash, _vf, this.mMeshDataNode.ci);
        this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);
        barr[0] = this.mOwner.GetFrame().BMgr().BatchOff();
    }
    Wind(_influence) {
        this.PushTag("wind");
        this.mWindInfluence.x = _influence;
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
    Merge(_PMat, _tMesh, _tNode, _oCI, _bound, _skinMatList) {
        let LMat = CMath.MatScale(_tNode.mData.sca);
        if (_tNode.mData.rot.w >= 100000)
            CMath.MatMul(LMat, CMath.MatRotation(_tNode.mData.rot), LMat);
        else
            CMath.MatMul(LMat, CMath.QutToMat(_tNode.mData.rot), LMat);
        LMat.SetV3(3, _tNode.mData.pos);
        let LPMat = CMath.MatMul(LMat, _PMat);
        if (_tNode.mData.ci != null) {
            let tvb = _tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.Position);
            let tub = _tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.UV);
            let tnb = _tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.Normal);
            let ttb = _tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.TexOff);
            let tweb = _tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.Weight);
            let twib = _tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.WeightIndex);
            let tinb = _tNode.mData.ci.GetVFType(CVertexFormat.eIdentifier.Index);
            let texOff = [];
            for (let ttexOff of _tNode.mData.textureOff) {
                let push = true;
                for (let i = 0; i < this.mTextureKey.length; ++i) {
                    if (this.mTextureKey[i] == _tMesh.texture[ttexOff]) {
                        push = false;
                        texOff.push(i);
                        break;
                    }
                }
                if (push) {
                    texOff.push(this.mTextureKey.length);
                    this.mTextureKey.push(_tMesh.texture[ttexOff]);
                }
            }
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
            let mat = new CMat();
            if (this.mTargetScale != 0) {
                let size = _tNode.mData.ci.bound.GetSize();
                let maxSize = CMath.Max(CMath.Max(size.x, size.y), size.z);
                mat.mF32A[0] = this.mTargetScale / maxSize;
                mat.mF32A[5] = this.mTargetScale / maxSize;
                mat.mF32A[10] = this.mTargetScale / maxSize;
            }
            if (this.mCenterPos) {
                let center = _tNode.mData.ci.bound.GetCenter();
                mat.mF32A[12] = center.x * mat.mF32A[0];
                mat.mF32A[13] = center.y * mat.mF32A[5];
                mat.mF32A[14] = center.z * mat.mF32A[10];
            }
            mat.UnitCheck();
            LPMat = CMath.MatMul(mat, LPMat);
            if (tweb.length > 0) {
                let tempv = new CVec3();
                for (let i = 0; i < tvb[0].bufF.Size(3); ++i) {
                    let we = tweb[0].bufF.V4(i);
                    let wi = twib[0].bufF.V4(i);
                    let v = ovb[0].bufF.V3(_oCI.vertexCount + i);
                    if (we.x + we.y + we.z + we.w > 0.0) {
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
            for (let i = 0; i < tinb[0].bufI.length; ++i) {
                _bound.InitBound(ovb[0].bufF.V3(tinb[0].bufI[i] + _oCI.vertexCount));
                oinb[0].bufI.push(tinb[0].bufI[i] + _oCI.vertexCount);
            }
            _oCI.vertexCount += _tNode.mData.ci.vertexCount;
            _oCI.indexCount += _tNode.mData.ci.indexCount;
        }
        if (_tNode.mColleague != null)
            this.Merge(_PMat, _tMesh, _tNode.mColleague, _oCI, _bound, _skinMatList);
        if (_tNode.mChild != null)
            this.Merge(LPMat, _tMesh, _tNode.mChild, _oCI, _bound, _skinMatList);
    }
    EmptyRPChk() {
        if (this.mRenderPass.length == 0) {
            let sChk = true;
            for (let each0 of this.mRenderPass) {
                if (each0.mTag.has("shadowWrite") == true) {
                    continue;
                }
                sChk = false;
            }
            if (sChk)
                this.mRenderPass.push(new CRPAuto(this.mOwner.GetFrame().Pal().Sl3D().mKey));
        }
    }
}

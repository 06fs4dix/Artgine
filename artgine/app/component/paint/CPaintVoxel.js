import { CObject } from "../../../basic/CObject.js";
import { CUtil } from "../../../basic/CUtil.js";
import { CBound } from "../../../geometry/CBound.js";
import { CVec2 } from "../../../geometry/CVec2.js";
import { CVec3 } from "../../../geometry/CVec3.js";
import { CVec4 } from "../../../geometry/CVec4.js";
import { CMeshCreateInfo } from "../../../render/CMeshCreateInfo.js";
import { CMeshDrawNode } from "../../../render/CMeshDrawNode.js";
import { CRenderPass } from "../../../render/CRenderPass.js";
import { CVertexFormat } from "../../../render/CShader.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { CRPAuto } from "../../canvas/CRPMgr.js";
import { CPaint } from "./CPaint.js";
export class CVoxPlane extends CObject {
    static eDir = {
        "Up": 0,
        "Down": 10,
        "Left": 20,
        "Right": 30,
        "Front": 40,
        "Back": 50,
        "Count": 60,
        "Null": 70,
    };
    constructor(_off, _pos = new CVec3(), _dir = CVoxPlane.eDir.Null) {
        super();
        this.mDir = _dir;
        this.mPos = _pos;
        this.mOff = _off;
    }
    mPos = new CVec3();
    mDir = CVoxPlane.eDir.Null;
    mUV = new CVec4(0, 0, 1, 1);
    mLight = new CVec2(1, 1);
    mOff;
}
export class CPaintVoxel extends CPaint {
    mMCI = new CMeshCreateInfo();
    mMD = new CMeshDrawNode();
    mSize = 100;
    constructor() {
        super();
        this.mMCI.Create(CVertexFormat.eIdentifier.Position);
        this.mMCI.Create(CVertexFormat.eIdentifier.UV);
        this.mMCI.Create(CVertexFormat.eIdentifier.Color);
        this.PushTag("alphaCut");
    }
    IsShould(_member, _type) {
        if (_member == "mMCI" || _member == "mMD")
            return false;
        return super.IsShould(_member, _type);
    }
    EmptyRPChk() {
        if (this.mRenderPass.length == 0) {
            var rp = new CRPAuto(this.mOwner.GetFrame().Pal().SlVoxelKey());
            rp.mPriority = CRenderPass.ePriority.BackGround;
            this.mRenderPass = [rp];
        }
    }
    Start() {
        if (CUtil.IsNode())
            return;
        this.mOwner.GetFrame().Ren().BuildMeshDrawNodeAutoFix(this.mMD, this.mOwner.GetFrame().Pal().SlVoxel().mShader[0], this.mMCI);
    }
    Rebuild(_arr) {
        let pbuf = new Float32Array(4 * 6);
        let ubuf = new Float32Array(4 * 6);
        let cbuf = new Float32Array(2 * 6);
        for (let i = 0; i < _arr.length; ++i) {
            for (let j = 0; j < 6; ++j) {
                pbuf[j * 4 + 0] = _arr[i].mPos.mF32A[0];
                pbuf[j * 4 + 1] = _arr[i].mPos.mF32A[1];
                pbuf[j * 4 + 2] = _arr[i].mPos.mF32A[2];
                pbuf[j * 4 + 3] = _arr[i].mDir + j;
                ubuf[j * 4 + 0] = _arr[i].mUV.mF32A[0];
                ubuf[j * 4 + 1] = _arr[i].mUV.mF32A[1];
                ubuf[j * 4 + 2] = _arr[i].mUV.mF32A[2];
                ubuf[j * 4 + 3] = _arr[i].mUV.mF32A[3];
                cbuf[j * 2 + 0] = _arr[i].mLight.mF32A[0];
                cbuf[j * 2 + 1] = _arr[i].mLight.mF32A[1];
            }
            this.mOwner.GetFrame().Ren().RebuildMeshDrawNode(this.mMD, 0, _arr[i].mOff * 4 * 6 * 4, pbuf);
            this.mOwner.GetFrame().Ren().RebuildMeshDrawNode(this.mMD, 1, _arr[i].mOff * 4 * 6 * 4, ubuf);
            this.mOwner.GetFrame().Ren().RebuildMeshDrawNode(this.mMD, 2, _arr[i].mOff * 2 * 6 * 4, cbuf);
        }
    }
    Build(_arr) {
        if (CUtil.IsNode())
            return;
        let pbuf = this.mMCI.GetVFType(CVertexFormat.eIdentifier.Position)[0].bufF;
        let ubuf = this.mMCI.GetVFType(CVertexFormat.eIdentifier.UV)[0].bufF;
        let cbuf = this.mMCI.GetVFType(CVertexFormat.eIdentifier.Color)[0].bufF;
        pbuf.Resize(_arr.length * 6 * 4);
        ubuf.Resize(_arr.length * 6 * 4);
        cbuf.Resize(_arr.length * 6 * 2);
        this.mBound.SetType(CBound.eType.Box);
        this.mBound.Reset();
        this.mMCI.vertexCount = _arr.length * 6;
        let i = 0;
        for (let each0 of _arr) {
            this.mBound.InitBound(each0.mPos);
            pbuf.V4(0 + i * 6, each0.mPos.mF32A[0], each0.mPos.mF32A[1], each0.mPos.mF32A[2], each0.mDir + 0);
            pbuf.V4(1 + i * 6, each0.mPos.mF32A[0], each0.mPos.mF32A[1], each0.mPos.mF32A[2], each0.mDir + 1);
            pbuf.V4(2 + i * 6, each0.mPos.mF32A[0], each0.mPos.mF32A[1], each0.mPos.mF32A[2], each0.mDir + 2);
            pbuf.V4(3 + i * 6, each0.mPos.mF32A[0], each0.mPos.mF32A[1], each0.mPos.mF32A[2], each0.mDir + 3);
            pbuf.V4(4 + i * 6, each0.mPos.mF32A[0], each0.mPos.mF32A[1], each0.mPos.mF32A[2], each0.mDir + 4);
            pbuf.V4(5 + i * 6, each0.mPos.mF32A[0], each0.mPos.mF32A[1], each0.mPos.mF32A[2], each0.mDir + 5);
            ubuf.V4(0 + i * 6, each0.mUV.mF32A[0], each0.mUV.mF32A[1], each0.mUV.mF32A[2], each0.mUV.mF32A[3]);
            ubuf.V4(1 + i * 6, each0.mUV.mF32A[0], each0.mUV.mF32A[1], each0.mUV.mF32A[2], each0.mUV.mF32A[3]);
            ubuf.V4(2 + i * 6, each0.mUV.mF32A[0], each0.mUV.mF32A[1], each0.mUV.mF32A[2], each0.mUV.mF32A[3]);
            ubuf.V4(3 + i * 6, each0.mUV.mF32A[0], each0.mUV.mF32A[1], each0.mUV.mF32A[2], each0.mUV.mF32A[3]);
            ubuf.V4(4 + i * 6, each0.mUV.mF32A[0], each0.mUV.mF32A[1], each0.mUV.mF32A[2], each0.mUV.mF32A[3]);
            ubuf.V4(5 + i * 6, each0.mUV.mF32A[0], each0.mUV.mF32A[1], each0.mUV.mF32A[2], each0.mUV.mF32A[3]);
            cbuf.V2(0 + i * 6, each0.mLight.mF32A[0], each0.mLight.mF32A[1]);
            cbuf.V2(1 + i * 6, each0.mLight.mF32A[0], each0.mLight.mF32A[1]);
            cbuf.V2(2 + i * 6, each0.mLight.mF32A[0], each0.mLight.mF32A[1]);
            cbuf.V2(3 + i * 6, each0.mLight.mF32A[0], each0.mLight.mF32A[1]);
            cbuf.V2(4 + i * 6, each0.mLight.mF32A[0], each0.mLight.mF32A[1]);
            cbuf.V2(5 + i * 6, each0.mLight.mF32A[0], each0.mLight.mF32A[1]);
            i++;
        }
        this.mBound.mMax.x += this.mSize;
        this.mBound.mMax.y += this.mSize;
        this.mBound.mMax.z += this.mSize;
        if (this.mOwner == null)
            return;
        this.mOwner.GetFrame().Ren().BuildMeshDrawNodeAutoFix(this.mMD, this.mOwner.GetFrame().Pal().SlVoxel().mShader[0], this.mMCI);
    }
    Render(_vf) {
        if (this.mMD.vGBuf == null || this.mMD.vNum <= 0)
            return;
        var barr = this.RenderBatch(_vf, 1);
        if (barr == null)
            return;
        this.mOwner.GetFrame().BMgr().BatchOn();
        this.Common(_vf);
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMat", this.GetFMat()));
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("size", this.mSize));
        if (_vf.mUniform.get("material") != null)
            this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("material", this.mMaterial));
        this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey);
        this.mOwner.GetFrame().BMgr().SetBatchMesh(this.mMD);
        let batch = this.mOwner.GetFrame().BMgr().BatchOff();
        if (batch == null || batch.mKey == 0) {
            this.ClearBatch();
            return;
        }
        barr[0] = batch;
    }
    ClearCRPAuto() {
        super.ClearCRPAuto();
    }
}

import { CBound } from "../../../geometry/CBound.js";
import { CFloat32Mgr } from "../../../geometry/CFloat32Mgr.js";
import { CVec1 } from "../../../geometry/CVec1.js";
import { CMeshDrawNode } from "../../../render/CMeshDrawNode.js";
import { CRenderPass } from "../../../render/CRenderPass.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { CUtilRender } from "../../../render/CUtilRender.js";
import { CPaint } from "./CPaint.js";
export class CPaintTrail extends CPaint {
    mOut = new CFloat32Mgr();
    mPosListCount = new CVec1();
    mCurrentTargetSize = 0;
    mIsOutChanged = false;
    mLastHide = false;
    constructor(_tex = "") {
        super();
        this.mTextureKey.push(_tex);
        this.PushTag("trail");
    }
    EmptyRPChk() {
        if (this.mRenderPass.length == 0) {
            var rp = new CRenderPass(this.mOwner.GetFrame().Pal().Sl2D().mKey);
            this.mRenderPass = [rp];
        }
    }
    GetDrawMesh(_meshKey, _shader) {
        var drawMesh = this.mOwner.GetFrame().Res().Find(this.mCurrentTargetSize + _meshKey + _shader.mKey);
        if (drawMesh == null) {
            drawMesh = new CMeshDrawNode();
            var info = CUtilRender.GetTrail(this.mCurrentTargetSize);
            this.mOwner.GetFrame().Ren().BuildMeshDrawNode(drawMesh, info, _shader);
            this.mOwner.GetFrame().Res().Push(this.mCurrentTargetSize + _meshKey + _shader.mKey, drawMesh);
        }
        return drawMesh;
    }
    UpdateBuffer(_upPos, _downPos) {
        this.mBW.mRadian = 0;
        this.mBound.Reset();
        this.mBound.SetType(CBound.eType.Box);
        this.mUpdateLMat = true;
        let neededSize = 4;
        while (neededSize < _upPos.length) {
            neededSize *= 4;
        }
        if (this.mCurrentTargetSize < neededSize) {
            this.mCurrentTargetSize = neededSize;
            this.mOut.Resize(this.mCurrentTargetSize * 4 * 2);
            this.mIsOutChanged = true;
            this.mRenPT = [];
            for (let key of this.mBatchMap.keys()) {
                this.mBatchMap.set(key, null);
            }
            this.ClearBatch();
            this.mCamCullUpdate = true;
        }
        else {
            this.mIsOutChanged = false;
        }
        this.mPosListCount.x = _upPos.length;
        for (let i = 0; i < this.mCurrentTargetSize; i++) {
            if (i < _upPos.length) {
                let alpha = 1 - i / (_upPos.length - 1);
                this.mOut.V4(i * 2 + 0, _upPos[i], alpha);
                this.mOut.V4(i * 2 + 1, _downPos[i], alpha);
                this.mBound.InitBound(_upPos[i]);
                this.mBound.InitBound(_downPos[i]);
            }
            else if (_upPos.length > 0) {
                let lastIdx = _upPos.length - 1;
                this.mOut.V4(i * 2 + 0, _upPos[lastIdx], 0);
                this.mOut.V4(i * 2 + 1, _downPos[lastIdx], 0);
            }
        }
        this.mBound.mMin.x *= 2;
        this.mBound.mMin.y *= 2;
        this.mBound.mMin.z *= 2;
        this.mBound.mMax.x *= 2;
        this.mBound.mMax.y *= 2;
        this.mBound.mMax.z *= 2;
    }
    Render(_vf) {
        if (this.mCurrentTargetSize === 0)
            return;
        var barr = this.RenderBatch(_vf, 1);
        if (barr == null)
            return;
        this.mOwner.GetFrame().BMgr().BatchOn();
        super.Common(_vf);
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("texCodi", this.mTexCodi));
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("trailPos", 4, this.mOut.GetArray()));
        if (this.mLastHide)
            this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("lastHide", new CVec1(1.0)));
        else
            this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("lastHide", new CVec1(0.0)));
        this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey);
        var dm = this.GetDrawMesh("CPaintTrail", _vf);
        this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);
        barr[0] = this.mOwner.GetFrame().BMgr().BatchOff();
    }
}

import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { CRPAuto } from "../../CRPMgr.js";
import { CPaint } from "./CPaint.js";
export class CPaintSurface extends CPaint {
    constructor(_rp, _size = null) {
        super();
        if (_rp == null)
            return;
        else {
            this.PushRenderPass(_rp);
        }
        this.mBoundFMatR = 0xffffffff;
    }
    InitChk() {
        super.InitChk();
        this.mBoundFMatR = 0xffffffff;
    }
    EmptyRPChk() {
        if (this.mRenderPass.length == 0) {
            var rp = new CRPAuto("Artgine/Shader/2DBlit");
            this.mRenderPass = [rp];
        }
    }
    Update(_update) {
        if (this.mRenPT.length == 0)
            return;
    }
    Render(_vf) {
        var barr = this.RenderBatch(_vf, 1);
        if (barr == null)
            return;
        this.mOwner.GetFrame().BMgr().BatchOn();
        this.Common(_vf);
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMat", this.GetFMat()));
        this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey);
        var dm = this.GetDrawMesh("Artgine/DM/Surface", _vf, this.mOwner.GetFrame().Pal().MCI2D());
        this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);
        barr[0] = this.mOwner.GetFrame().BMgr().BatchOff();
    }
}
;

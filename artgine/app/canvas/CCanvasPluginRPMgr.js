import { CUpdate } from "../../basic/Basic.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CCanvasPlugin } from "./CCanvas.js";
import { CRPMgr } from "./CRPMgr.js";
export class CCanvasPluginRPMgr extends CCanvasPlugin {
    mRPMgr;
    mChangeRPMgr;
    constructor(_RPMgr) {
        super();
        this.SetRPMgr(_RPMgr);
    }
    SetRPMgr(_rpMgr = null) {
        if (_rpMgr == null)
            _rpMgr = new CRPMgr();
        if (this.mRPMgr == null)
            this.mRPMgr = _rpMgr;
        else
            this.mChangeRPMgr = _rpMgr;
        this.mRPMgr.mUpdate = CUpdate.eType.Updated;
    }
    Exe() {
        if (this.mRPMgr.mUpdate == CUpdate.eType.Updated)
            this.mRPMgr.mUpdate = CUpdate.eType.Already;
        else if (this.mRPMgr.mUpdate == CUpdate.eType.Already)
            this.mRPMgr.mUpdate = CUpdate.eType.Not;
        if (this.mRPMgr.mUpdate != CUpdate.eType.Not) {
            for (const autoRP of this.mRPMgr.mRPArr)
                this.mCanvas.RemoveAutoRP(autoRP.Key());
            for (const suf of this.mRPMgr.mSufArr)
                this.mCanvas.Find(suf.Key())?.Destroy();
            for (const [key, tex] of this.mRPMgr.mTexMap) {
                const oldTex = this.mCanvas.GetFrame().Res().Find(key);
                if (oldTex) {
                    this.mCanvas.GetFrame().Ren().ReleaseTexture(oldTex);
                    this.mCanvas.GetFrame().Res().Remove(key);
                }
            }
        }
        if (this.mChangeRPMgr != null) {
            this.mRPMgr = this.mChangeRPMgr;
            this.mRPMgr.mUpdate = CUpdate.eType.Already;
            this.mChangeRPMgr = null;
        }
        if (this.mRPMgr.mUpdate != CUpdate.eType.Not) {
            for (const autoRP of this.mRPMgr.mRPArr)
                this.mCanvas.PushAutoRP(autoRP.Key(), autoRP);
            for (const suf of this.mRPMgr.mSufArr)
                this.mCanvas.PushSub(suf.Export(true, false));
            for (const [key, tex] of this.mRPMgr.mTexMap) {
                const oldTex = this.mCanvas.GetFrame().Res().Find(key);
                if (oldTex) {
                    this.mCanvas.GetFrame().Ren().ReleaseTexture(oldTex);
                    this.mCanvas.GetFrame().Res().Remove(key);
                }
                this.mCanvas.GetFrame().Ren().BuildRenderTarget(tex.GetInfo(), tex.HasOrg() ? new CVec2(tex.GetOrgWidth(), tex.GetOrgHeight()) : null, key);
            }
        }
    }
    ;
    Destroy() {
        super.Destroy();
        this.SetRPMgr();
    }
}

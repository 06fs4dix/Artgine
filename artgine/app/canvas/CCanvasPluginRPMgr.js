import { CUpdate } from "../../basic/Basic.js";
import { CCanvasPlugin } from "./CCanvas.js";
import { CRPMgr } from "./CRPMgr.js";
export class CCanvasPluginRPMgr extends CCanvasPlugin {
    mRPMgr = null;
    mChangeRPMgr = null;
    constructor(_RPMgr) {
        super();
        this.SetRPMgr(_RPMgr);
    }
    SetRPMgr(_rpMgr) {
        if (this.mRPMgr == null && _rpMgr == null) {
            this.mChangeRPMgr = null;
            return;
        }
        if (_rpMgr == null)
            this.mChangeRPMgr = new CRPMgr();
        else
            this.mChangeRPMgr = _rpMgr;
    }
    Exe() {
        if (this.mChangeRPMgr != null) {
            if (this.mRPMgr != null) {
                for (let i = 0; i < this.mRPMgr.mRPArr.length; ++i) {
                    this.mCanvas.GetBrush().RemoveAutoRP(this.mRPMgr.Key() + "_" + i);
                }
                this.mCanvas.GetBrush().mAutoRPUpdate = CUpdate.eType.Not;
                for (let i = 0; i < this.mRPMgr.mSufArr.length; ++i) {
                    const obj = this.mCanvas.Find(this.mRPMgr.mSufArr[i].Key());
                    if (obj)
                        obj.Destroy();
                }
                this.mCanvas.GetBrush().ClearRen();
            }
            if (this.mChangeRPMgr.mTexMap.size != 0 || this.mChangeRPMgr.mSufArr.length != 0 || this.mChangeRPMgr.mRPArr.length != 0) {
                for (let i = 0; i < this.mChangeRPMgr.mRPArr.length; ++i) {
                    this.mCanvas.GetBrush().SetAutoRP(this.mChangeRPMgr.Key() + "_" + i, this.mChangeRPMgr.mRPArr[i]);
                }
                for (let i = 0; i < this.mChangeRPMgr.mSufArr.length; ++i) {
                    let c = this.mChangeRPMgr.mSufArr[i].Export(true, false);
                    this.mCanvas.PushSub(c);
                }
                this.mChangeRPMgr.SetFrame(this.mCanvas.GetFrame());
                this.mRPMgr = this.mChangeRPMgr;
            }
            else
                this.mRPMgr = null;
            this.mChangeRPMgr = null;
        }
    }
    ;
    Destroy() {
        super.Destroy();
        this.SetRPMgr(null);
    }
}

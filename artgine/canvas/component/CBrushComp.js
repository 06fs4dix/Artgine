import { CComponent } from "./CComponent.js";
import { CPaint3D } from "./paint/CPaint3D.js";
export class CBrushComp extends CComponent {
    constructor(_key) {
        super();
        this.mSysc = CComponent.eSysn.CamComp;
        this.mShadowKey = _key;
    }
    mShadowKey;
    mWrite = new Array();
    mRead = null;
    mReadLen = 10000;
    mLayer = 0;
    mBruch = null;
    GetWrite() { return this.mWrite; }
    GetTex() { return this.mShadowKey + ".tex"; }
    PushRPAuto(_write) {
        this.mWrite.push(_write);
    }
    Update(_delay) {
        if (this.mBruch == null) {
            var cm = this.ProductMsg("SendGetBrush");
            cm.mInter = "canvas";
            cm.mMsgData[0] = this;
            return true;
        }
        if (this.mRead != null) {
            var cm = this.ProductMsg("CubeMap");
            cm.mIntra = CPaint3D;
            cm.mInter = "";
            cm.mMsgData[0] = this;
        }
        return false;
    }
    RecvGetBrush(_brush) {
        this.mBruch = _brush;
    }
}

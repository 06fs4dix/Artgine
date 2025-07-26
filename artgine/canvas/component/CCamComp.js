import { CComponent } from "./CComponent.js";
import { CPaint3D } from "./paint/CPaint3D.js";
export class CCamComp extends CComponent {
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
    GetWrite() { return this.mWrite; }
    GetTex() { return this.mShadowKey + ".tex"; }
    PushRPAuto(_write) {
        this.mWrite.push(_write);
    }
    Update(_delay) {
        var cm = this.ProductMsg("CCamCompAck");
        cm.mInter = "canvas";
        cm.mMsgData[0] = this;
        if (this.mRead != null) {
            var cm = this.ProductMsg("CubeMap");
            cm.mIntra = CPaint3D;
            cm.mInter = "";
            cm.mMsgData[0] = this;
        }
    }
    CCamCompReq(_brush) {
    }
}

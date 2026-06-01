import { CComponent } from "./CComponent.js";
import { CPaint3D } from "./paint/CPaint3D.js";
export class CBrushComp extends CComponent {
    constructor(_key) {
        super();
        this.mSysc = CComponent.eSysn.CamComp;
        this.mTexKey = _key;
    }
    mTexKey;
    mWrite = new Array();
    mRead = null;
    mReadLen = 10000;
    mLayer = 0;
    mBrush = null;
    IsShould(_member, _type) {
        if (_member == "mBruch")
            return false;
        return super.IsShould(_member, _type);
    }
    GetWrite() { return this.mWrite; }
    GetTex() { return this.mTexKey + ".tex"; }
    PushRPAuto(_write) {
        this.mWrite.push(_write);
    }
    StartChk() {
        if (this.mStartChk == true && this.mBrush != null) {
            this.mStartChk = false;
            return true;
        }
        else {
            var cm = this.ProductMsg("SendGetBrush");
            cm.mInter = "canvas";
            cm.mMsgData[0] = this;
        }
        return false;
    }
    Update(_update) {
        if (this.mRead != null) {
            var cm = this.ProductMsg("CubeMap");
            cm.mIntra = CPaint3D;
            cm.mInter = "";
            cm.mMsgData[0] = this;
        }
        return false;
    }
    RecvGetBrush(_brush) {
        this.mBrush = _brush;
    }
}

import { CPlane } from "./CPlane.js";
export class CPlaneInside {
    mLen;
    mPlane;
    constructor(_plane = CPlane.eDir.Null, _len = 0) {
        this.mPlane = _plane;
        this.mLen = _len;
    }
}

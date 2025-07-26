import { CObject } from "../basic/CObject.js";
export class CFontRef {
    mKey = "";
    mXSize = 0;
    mYSize = 0;
    mRXSize = 0;
    mRYSize = 0;
    constructor() {
    }
    GetRX() {
        return (this.mXSize - this.mRXSize) * 0.5;
    }
}
export class CFontOption extends CObject {
    mSize;
    mExp = true;
    mMaxX = 100000;
    mMaxY = 100000;
    mStrokeStyle = 'Black';
    mFillStyle = 'Black';
    mLineWidth = 0;
    mLineCap = "round";
    mLineJoin = "round";
    constructor(_size = 32, _fillStyle = 'Black', _strokeStyle = 'Black', _lineWidth = 0) {
        super();
        this.mSize = _size;
        this.mFillStyle = _fillStyle;
        this.mStrokeStyle = _strokeStyle;
        this.mLineWidth = _lineWidth;
    }
}
export class CFont {
    static Init(pa_ttfName = null) {
    }
    static TextToTexName(_render, pa_text, _option) {
        return null;
    }
}
;
import CFont_imple from "../util_imple/CFont.js";
CFont_imple();

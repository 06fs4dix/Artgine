import { CNavigation } from "./component/CNavigation.js";
import { CVec3 } from "../geometry/CVec3.js";
export class CAster {
    constructor() {
    }
    cur = null;
    pre = null;
    cost = 0;
    total = 0;
}
export class CNaviPos {
    constructor(_navi) {
        this.mNavigation = _navi;
        this.mPos = _navi.GetOwner().GetPos().Export();
    }
    mNavigation;
    mPos;
}
class CNaviData {
    mKeyS;
    mKeyN;
    mNavi = new Map();
}
export class CNaviMgr {
    mSize = new CVec3();
    mPos = new CVec3();
    mData = new Array();
    mRead = 0;
    mWrite = 0;
    SC = 5;
    Init(_size) {
        this.SC = CNavigation.Normal / CNavigation.Small;
        this.mSize = _size;
        for (let i = 0; i < 2; ++i) {
            let data = new CNaviData();
            data.mKeyN = new Int32Array(_size.x * _size.y * _size.z);
            data.mKeyN.fill(0);
            data.mKeyS = new Int32Array(_size.x * this.SC * _size.y * this.SC * _size.z * this.SC);
            data.mKeyS.fill(0);
            this.mData.push(data);
        }
    }
    Write(_navi, _remove) {
    }
    W() {
        return this.mData[this.mWrite];
    }
    R() {
        return this.mData[this.mRead];
    }
    Reset(_all = false) {
        this.mRead = this.mWrite;
        this.mWrite++;
        if (this.mWrite >= this.mData.length)
            this.mWrite = 0;
        if (this.W() == null)
            return;
        if (_all) {
            for (let i = 0; i < this.mData.length; ++i) {
                this.mData[i].mKeyN.fill(0);
                this.mData[i].mKeyS.fill(0);
                this.mData[i].mNavi.clear();
            }
            return;
        }
        let removeList = new Array();
        for (let key of this.W().mNavi.keys()) {
            let navi = this.W().mNavi.get(key);
            if (navi.mNavigation.mStatic == false) {
                this.Write(navi.mNavigation, true);
                removeList.push(key);
            }
        }
        for (let key of removeList) {
            this.W().mNavi.delete(key);
        }
    }
    Read(_pt, _pass, _small) {
        return null;
    }
    InChk(_pt, _pass, _small, _off, _size) {
        return false;
    }
    DownPoint(_pt, _size, _pass, _2d, _small) {
        return null;
    }
    EmptyPoint(_pt, _off, _size, _pass, _2d, _small) {
        return null;
    }
    PathAll(_st, _ed, _bound, _2d, _pass = new Set()) {
        return null;
    }
    PosInChk(_pos, _pass, _bound, _2d) {
        return null;
    }
    Path(_st, _ed, _bound, _pass, _2d, _small = false) {
        return null;
    }
}
import CNaviMgr_imple from "../canvas_imple/CNavigationMgr.js";
CNaviMgr_imple();

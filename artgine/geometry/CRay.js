import { CObject } from "../basic/CObject.js";
import { CVec3 } from "../geometry/CVec3.js";
export class CRay extends CObject {
    mVec3List;
    constructor() {
        super();
        this.mVec3List = new Array();
        this.mVec3List.push(new CVec3());
        this.mVec3List.push(new CVec3());
        this.mVec3List.push(new CVec3());
    }
    GetDirect() { return this.mVec3List[0]; }
    GetPosition() { return this.mVec3List[1]; }
    GetOriginal() { return this.mVec3List[2]; }
    GetVecList() { return this.mVec3List; }
    SetDirect(_vec) { this.mVec3List[0] = _vec.Export(); }
    SetPosition(_vec) { this.mVec3List[1] = _vec.Export(); }
    SetOriginal(_vec) { this.mVec3List[2] = _vec.Export(); }
    Export(_copy, _resetKey) {
        var dummy = new CRay();
        for (var i = 0; i < 3; ++i)
            dummy.mVec3List[i].Import(this.mVec3List[i]);
        return dummy;
    }
    Import(_tar) {
        for (var i = 0; i < 3; ++i)
            this.mVec3List[i].Import(_tar.mVec3List[i]);
    }
}

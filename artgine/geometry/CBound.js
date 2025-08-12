import { CVec3 } from "../geometry/CVec3.js";
import { CMath } from "../geometry/CMath.js";
import { CArray } from "../basic/CArray.js";
import { CObject } from "../basic/CObject.js";
export class CBound extends CObject {
    mMin;
    mMax;
    mType;
    mPos;
    constructor() {
        super();
        this.mMin = new CVec3(100000, 100000, 100000);
        this.mMax = new CVec3(-100000, -100000, -100000);
        this.mType = CBound.eType.Null;
        this.mPos = new CArray();
    }
    NewWASM() {
        this.mMin.NewWASM();
        this.mMax.NewWASM();
    }
    DeleteWASM() {
        this.mMin.ReleaseWASM();
        this.mMax.ReleaseWASM();
    }
    GetType() {
        return this.mType;
    }
    SetType(_type) {
        this.mType = _type;
    }
    WTForm(_pointer, _div, _input) {
        if (_pointer.member == "boundType") {
            let textArr = ["Box", "Sphere", "Polytope", "Null"], valArr = [0, 1, 2, 4];
            _input.hidden = true;
            let select = document.createElement("select");
            select.className = "form-select";
            for (var i = 0; i < textArr.length; ++i) {
                var opt = document.createElement("option");
                opt.value = valArr[i] + "";
                opt.text = textArr[i];
                if (_pointer.Get() == valArr[i])
                    opt.selected = true;
                select.add(opt);
            }
            select.onchange = (_event) => {
                var ct = _event.currentTarget;
                _pointer.Set(valArr[ct.selectedIndex]);
                _input.value = valArr[ct.selectedIndex] + "";
                if (_pointer.target instanceof CObject)
                    _pointer.target.EditChange(_pointer, false);
            };
            _div.append(select);
            select.addEventListener("change", () => {
                this.EditRefresh();
            });
        }
    }
    Reset() {
        this.mMin.mF32A[0] = 100000;
        this.mMin.mF32A[1] = 100000;
        this.mMin.mF32A[2] = 100000;
        this.mMax.mF32A[0] = -100000;
        this.mMax.mF32A[1] = -100000;
        this.mMax.mF32A[2] = -100000;
        this.mType = CBound.eType.Null;
        if (this.GetType() == CBound.eType.Polytope)
            this.mPos.Clear();
    }
    ResetBoxMinMax(_vec) {
        if (this.mType == CBound.eType.Null) {
            this.mType = CBound.eType.Box;
        }
        this.mMin.mF32A[0] = CMath.Min(this.mMin.mF32A[0], _vec.mF32A[0]);
        this.mMin.mF32A[1] = CMath.Min(this.mMin.mF32A[1], _vec.mF32A[1]);
        this.mMin.mF32A[2] = CMath.Min(this.mMin.mF32A[2], _vec.mF32A[2]);
        this.mMax.mF32A[0] = CMath.Max(this.mMax.mF32A[0], _vec.mF32A[0]);
        this.mMax.mF32A[1] = CMath.Max(this.mMax.mF32A[1], _vec.mF32A[1]);
        this.mMax.mF32A[2] = CMath.Max(this.mMax.mF32A[2], _vec.mF32A[2]);
    }
    InitBound(_vInfo) {
        if (typeof _vInfo == "number") {
            this.mMin.x = -_vInfo;
            this.mMin.y = -_vInfo;
            this.mMin.z = -_vInfo;
            this.mMax.x = _vInfo;
            this.mMax.y = _vInfo;
            this.mMax.z = _vInfo;
        }
        else if (_vInfo instanceof Array) {
            for (var each0 of _vInfo) {
                if (this.GetType() == CBound.eType.Polytope)
                    this.mPos.Push(each0);
                this.ResetBoxMinMax(each0);
            }
        }
        else {
            if (this.GetType() == CBound.eType.Polytope)
                this.mPos.Push(_vInfo);
            this.ResetBoxMinMax(_vInfo);
        }
    }
    GetInRadius() {
        var cen = this.GetCenter();
        var maxX = CMath.Max(this.mMax.mF32A[0] - cen.mF32A[0], this.mMin.mF32A[0] - cen.mF32A[0]);
        var maxY = CMath.Max(this.mMax.mF32A[1] - cen.mF32A[1], this.mMin.mF32A[1] - cen.mF32A[1]);
        var maxZ = CMath.Max(this.mMax.mF32A[2] - cen.mF32A[2], this.mMin.mF32A[2] - cen.mF32A[2]);
        return CMath.Max(CMath.Max(maxX, maxY), maxZ);
    }
    GetOutRadius() {
        var ra = this.GetInRadius();
        if (this.mType == CBound.eType.Sphere)
            return ra;
        return CMath.V3Len(new CVec3(ra, ra, ra));
    }
    GetCenter(_copy = null) {
        var L_cen = _copy;
        if (L_cen == null)
            L_cen = new CVec3();
        L_cen.mF32A[0] = (this.mMax.mF32A[0] + this.mMin.mF32A[0]) * 0.5;
        L_cen.mF32A[1] = (this.mMax.mF32A[1] + this.mMin.mF32A[1]) * 0.5;
        L_cen.mF32A[2] = (this.mMax.mF32A[2] + this.mMin.mF32A[2]) * 0.5;
        return L_cen;
    }
    GetSize(_copy = null) {
        if (_copy == null)
            _copy = new CVec3(this.mMax.mF32A[0] - this.mMin.mF32A[0], this.mMax.mF32A[1] - this.mMin.mF32A[1], this.mMax.mF32A[2] - this.mMin.mF32A[2]);
        else {
            _copy.mF32A[0] = this.mMax.mF32A[0] - this.mMin.mF32A[0];
            _copy.mF32A[1] = this.mMax.mF32A[1] - this.mMin.mF32A[1];
            _copy.mF32A[2] = this.mMax.mF32A[2] - this.mMin.mF32A[2];
        }
        return _copy;
    }
    GetRandom(_x, _y, _z) {
        let pos = new CVec3();
        let size = this.GetSize();
        if (_x)
            pos.x = size.x * Math.random() + this.mMin.x;
        if (_y)
            pos.y = size.y * Math.random() + this.mMin.y;
        if (_z)
            pos.z = size.z * Math.random() + this.mMin.z;
        return pos;
    }
    WTBubbling() { return false; }
    Export(_copy, _resetKey) {
        var dummy = new CBound();
        dummy.mMin = this.mMin.Export();
        dummy.mMax = this.mMax.Export();
        dummy.mType = this.mType;
        for (var each0 of this.mPos.mArray) {
            dummy.mPos.Push(each0);
        }
        return dummy;
    }
    Import(_tar) {
        this.mMin.Import(_tar.mMin);
        this.mMax.Import(_tar.mMax);
        this.mType = _tar.mType;
        this.mPos.Clear();
        for (var each0 of _tar.mPos.mArray) {
            this.mPos.Push(each0);
        }
    }
}
(function (CBound) {
    let eType;
    (function (eType) {
        eType[eType["Box"] = 0] = "Box";
        eType[eType["Sphere"] = 1] = "Sphere";
        eType[eType["Polytope"] = 2] = "Polytope";
        eType[eType["Voxel"] = 3] = "Voxel";
        eType[eType["Null"] = 4] = "Null";
    })(eType = CBound.eType || (CBound.eType = {}));
    ;
})(CBound || (CBound = {}));

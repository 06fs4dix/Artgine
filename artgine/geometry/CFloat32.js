import { CObject } from "../basic/CObject.js";
import { CWASM } from "../basic/CWASM.js";
export class CFloat32 extends CObject {
    mF32A = null;
    Ptr() {
        return this.mF32A["ptr"];
    }
    NewWASM() {
        this.mF32A = CWASM.ProductF32A(this.mF32A.length);
    }
    ReleaseWASM() {
        CWASM.Recycle(this.mF32A);
    }
    IsZero() {
        for (let i = 0; i < this.mF32A.length; ++i) {
            if (this.mF32A[i] != 0)
                return false;
        }
        return true;
    }
    Zero() {
        for (let i = 0; i < this.mF32A.length; ++i) {
            this.mF32A[i] = 0;
        }
    }
    Equals(_target) {
        for (let i = 0; i < this.mF32A.length; ++i) {
            if (this.mF32A[i] != _target.mF32A[i]) {
                return false;
            }
        }
        return true;
    }
    F32A() {
        return this.mF32A;
    }
    Import(_target) {
        if (_target == null)
            return;
        this.mF32A.set(_target["mF32A"]);
    }
    set array(_val) {
        for (let i = 0; i < _val.length; ++i) {
            if (this.mF32A.length == i)
                break;
            this.mF32A[i] = _val[i];
        }
    }
    Snap(decimals = 8) {
        const m = 10 ** decimals;
        const a = this.mF32A;
        for (let i = 0; i < a.length; ++i) {
            a[i] = Math.trunc(a[i] * m) / m;
        }
    }
    ToLog() {
        let str = "";
        for (let i = 0; i < this.mF32A.length; ++i) {
            str += this.mF32A[0];
        }
        return str;
    }
}

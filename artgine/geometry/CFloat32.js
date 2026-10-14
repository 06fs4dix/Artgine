import { CObject } from "../basic/CObject.js";
import { CWASM } from "../basic/CWASM.js";
export class CFloat32 extends CObject {
    mF32A = null;
    Ptr() {
        return this.mF32A["ptr"];
    }
    NewWASM() {
        const old = this.mF32A;
        this.mF32A = CWASM.ProductF32A(old.length);
        const n = Math.min(old.length, this.mF32A.length);
        for (let i = 0; i < n; ++i)
            this.mF32A[i] = old[i];
        CWASM.RegisterF32A(this);
    }
    ReleaseWASM() {
        const old = this.mF32A;
        if (old == null || old["ptr"] == null)
            return;
        CWASM.UnregisterF32A(this);
        const copy = new Float32Array(old["len"] != null ? old["len"] : old.length);
        const n = Math.min(copy.length, old.length);
        for (let i = 0; i < n; ++i)
            copy[i] = old[i];
        this.mF32A = copy;
        CWASM.Recycle(old);
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
        this.mF32A.set(_target.F32A());
    }
    Export(_copy = true, _resetKey = true) {
        const copy = new this.constructor();
        copy.Import(this);
        return copy;
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
            str += this.mF32A[i] + ",";
        }
        return str;
    }
}

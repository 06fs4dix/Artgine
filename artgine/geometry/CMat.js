import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CFloat32 } from "./CFloat32.js";
export class CMat extends CFloat32 {
    mUnit = true;
    constructor(_F32A = null) {
        super();
        this.mF32A = new Float32Array(16);
        if (_F32A == null) {
            this.mF32A[0] = 1;
            this.mF32A[1] = 0;
            this.mF32A[2] = 0;
            this.mF32A[3] = 0;
            this.mF32A[4] = 0;
            this.mF32A[5] = 1;
            this.mF32A[6] = 0;
            this.mF32A[7] = 0;
            this.mF32A[8] = 0;
            this.mF32A[9] = 0;
            this.mF32A[10] = 1;
            this.mF32A[11] = 0;
            this.mF32A[12] = 0;
            this.mF32A[13] = 0;
            this.mF32A[14] = 0;
            this.mF32A[15] = 1;
        }
        else {
            for (var i = 0; i < _F32A.length; ++i)
                this.mF32A[i] = _F32A[i];
            this.UnitCheck();
        }
    }
    SetUnit(_unit) {
        if (_unit != this.mUnit)
            this.mUnit = _unit;
    }
    UnitCheck() {
        if (this.mF32A[0] == 1 && this.mF32A[5] == 1 && this.mF32A[10] == 1 && this.mF32A[15] == 1 &&
            this.mF32A[1] == 0 && this.mF32A[2] == 0 && this.mF32A[3] == 0 && this.mF32A[4] == 0 &&
            this.mF32A[6] == 0 && this.mF32A[7] == 0 && this.mF32A[8] == 0 && this.mF32A[9] == 0 &&
            this.mF32A[11] == 0 && this.mF32A[12] == 0 && this.mF32A[13] == 0 && this.mF32A[14] == 0) {
            this.mUnit = true;
        }
        else
            this.mUnit = false;
    }
    IsUnit() { return this.mUnit; }
    Unit() {
        if (this.mUnit)
            return;
        this.mF32A[0] = 1;
        this.mF32A[1] = 0;
        this.mF32A[2] = 0;
        this.mF32A[3] = 0;
        this.mF32A[4] = 0;
        this.mF32A[5] = 1;
        this.mF32A[6] = 0;
        this.mF32A[7] = 0;
        this.mF32A[8] = 0;
        this.mF32A[9] = 0;
        this.mF32A[10] = 1;
        this.mF32A[11] = 0;
        this.mF32A[12] = 0;
        this.mF32A[13] = 0;
        this.mF32A[14] = 0;
        this.mF32A[15] = 1;
        this.mUnit = true;
    }
    IsRotUnit() {
        if (this.mF32A[0] == 1 && this.mF32A[5] == 1 && this.mF32A[10] == 1)
            return true;
        return false;
    }
    set x(_val) { this.mF32A[12] = _val; }
    get x() { return this.mF32A[12]; }
    set y(_val) { this.mF32A[13] = _val; }
    get y() { return this.mF32A[13]; }
    set z(_val) { this.mF32A[14] = _val; }
    get z() { return this.mF32A[14]; }
    set xyz(_val) {
        this.mF32A[12] = _val.x;
        this.mF32A[13] = _val.y;
        this.mF32A[14] = _val.z;
        this.UnitCheck();
    }
    get xyz() {
        return new CVec3(this.mF32A[12], this.mF32A[13], this.mF32A[14]);
    }
    SetV3(_off, _vec) {
        switch (_off) {
            case 0:
                this.mF32A[0] = _vec.x;
                this.mF32A[1] = _vec.y;
                this.mF32A[2] = _vec.z;
                this.mF32A[3] = 0;
                break;
            case 1:
                this.mF32A[4] = _vec.x;
                this.mF32A[5] = _vec.y;
                this.mF32A[6] = _vec.z;
                this.mF32A[7] = 0;
                break;
            case 2:
                this.mF32A[8] = _vec.x;
                this.mF32A[9] = _vec.y;
                this.mF32A[10] = _vec.z;
                this.mF32A[11] = 0;
                break;
            case 3:
                this.mF32A[12] = _vec.x;
                this.mF32A[13] = _vec.y;
                this.mF32A[14] = _vec.z;
                this.mF32A[15] = 1;
                break;
        }
        this.UnitCheck();
    }
    GetV3(_off, _vec = null) {
        if (_vec == null)
            _vec = new CVec3();
        switch (_off) {
            case 0:
                _vec.mF32A[0] = this.mF32A[0];
                _vec.mF32A[1] = this.mF32A[1];
                _vec.mF32A[2] = this.mF32A[2];
                break;
            case 1:
                _vec.mF32A[0] = this.mF32A[4];
                _vec.mF32A[1] = this.mF32A[5];
                _vec.mF32A[2] = this.mF32A[6];
                break;
            case 2:
                _vec.mF32A[0] = this.mF32A[8];
                _vec.mF32A[1] = this.mF32A[9];
                _vec.mF32A[2] = this.mF32A[10];
                break;
            case 3:
                _vec.mF32A[0] = this.mF32A[12];
                _vec.mF32A[1] = this.mF32A[13];
                _vec.mF32A[2] = this.mF32A[14];
                break;
        }
        this.UnitCheck();
        return _vec;
    }
    GetV4(_off, _vec = null) {
        if (_vec == null)
            _vec = new CVec4();
        switch (_off) {
            case 0:
                _vec.mF32A[0] = this.mF32A[0];
                _vec.mF32A[1] = this.mF32A[1];
                _vec.mF32A[2] = this.mF32A[2];
                _vec.mF32A[3] = this.mF32A[3];
                break;
            case 1:
                _vec.mF32A[0] = this.mF32A[4];
                _vec.mF32A[1] = this.mF32A[5];
                _vec.mF32A[2] = this.mF32A[6];
                _vec.mF32A[3] = this.mF32A[7];
                break;
            case 2:
                _vec.mF32A[0] = this.mF32A[8];
                _vec.mF32A[1] = this.mF32A[9];
                _vec.mF32A[2] = this.mF32A[10];
                _vec.mF32A[3] = this.mF32A[11];
                break;
            case 3:
                _vec.mF32A[0] = this.mF32A[12];
                _vec.mF32A[1] = this.mF32A[13];
                _vec.mF32A[2] = this.mF32A[14];
                _vec.mF32A[3] = this.mF32A[15];
                break;
        }
        this.UnitCheck();
        return _vec;
    }
    SetV4(_off, _vec) {
        switch (_off) {
            case 0:
                this.mF32A[0] = _vec.x;
                this.mF32A[1] = _vec.y;
                this.mF32A[2] = _vec.z;
                this.mF32A[3] = _vec.w;
                break;
            case 1:
                this.mF32A[4] = _vec.x;
                this.mF32A[5] = _vec.y;
                this.mF32A[6] = _vec.z;
                this.mF32A[7] = _vec.w;
                break;
            case 2:
                this.mF32A[8] = _vec.x;
                this.mF32A[9] = _vec.y;
                this.mF32A[10] = _vec.z;
                this.mF32A[11] = _vec.w;
                break;
            case 3:
                this.mF32A[12] = _vec.x;
                this.mF32A[13] = _vec.y;
                this.mF32A[14] = _vec.z;
                this.mF32A[15] = _vec.w;
                break;
        }
        this.UnitCheck();
    }
    Import(_target) {
        super.Import(_target);
        this.mUnit = _target["m_unit"];
    }
    NewWASM() {
        super.NewWASM();
        this.mUnit = false;
        this.Unit();
    }
}

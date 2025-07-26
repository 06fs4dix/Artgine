import { CMat } from "../geometry/CMat.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CWASM } from "../basic/CWASM.js";
import { CAlert } from "../basic/CAlert.js";
import { CPoolGeo } from "./CPoolGeo.js";
const d_PI = 3.141592;
export class CMath {
    static PI() { return d_PI; }
    static Min(_a, _b) {
        return Math.min(_a, _b);
    }
    static Max(_a, _b) {
        return Math.max(_a, _b);
    }
    static Clamp(_val, _min, _max) {
        return Math.min(_max, Math.max(_val, _min));
    }
    static Abs(_val) {
        return Math.abs(_val);
    }
    static Vec2MinusVec2(_a, _b) {
        return new CVec2(_a.mF32A[0] - _b.mF32A[0], _a.mF32A[1] - _b.mF32A[1]);
    }
    static XYLen(_ax, _ay, _bx, _by) {
        var xdir = _ax - _bx;
        var ydir = _ay - _by;
        var len = Math.sqrt(xdir * xdir + ydir * ydir);
        return len;
    }
    static V3MulV3(_a, _b, _c = null) {
        if (_c != null) {
            _c.mF32A[0] = _a.mF32A[0] * _b.mF32A[0];
            _c.mF32A[1] = _a.mF32A[1] * _b.mF32A[1];
            _c.mF32A[2] = _a.mF32A[2] * _b.mF32A[2];
            return _c;
        }
        return new CVec3(_a.x * _b.x, _a.y * _b.y, _a.z * _b.z);
    }
    static V3AddV3(_a, _b, _c = null) {
        if (_c != null) {
            _c.x = _a.mF32A[0] + _b.mF32A[0];
            _c.mF32A[1] = _a.mF32A[1] + _b.mF32A[1];
            _c.mF32A[2] = _a.mF32A[2] + _b.mF32A[2];
            return _c;
        }
        return new CVec3(_a.mF32A[0] + _b.mF32A[0], _a.mF32A[1] + _b.mF32A[1], _a.mF32A[2] + _b.mF32A[2]);
    }
    static V3SubV3(_a, _b, _c = null) {
        if (_c != null) {
            _c.mF32A[0] = _a.mF32A[0] - _b.mF32A[0];
            _c.mF32A[1] = _a.mF32A[1] - _b.mF32A[1];
            _c.mF32A[2] = _a.mF32A[2] - _b.mF32A[2];
            return _c;
        }
        return new CVec3(_a.mF32A[0] - _b.mF32A[0], _a.mF32A[1] - _b.mF32A[1], _a.mF32A[2] - _b.mF32A[2]);
    }
    static V3MulFloat(_a, _b, _c = null) {
        if (_c != null) {
            _c.mF32A[0] = _a.mF32A[0] * _b;
            _c.mF32A[1] = _a.mF32A[1] * _b;
            _c.mF32A[2] = _a.mF32A[2] * _b;
            return _c;
        }
        return new CVec3(_a.mF32A[0] * _b, _a.mF32A[1] * _b, _a.mF32A[2] * _b);
    }
    static V3Len(_a) {
        return Math.sqrt(_a.mF32A[0] * _a.mF32A[0] + _a.mF32A[1] * _a.mF32A[1] + _a.mF32A[2] * _a.mF32A[2]);
    }
    static V3Nor(_a, _b = null) {
        if (_a.IsZero())
            return new CVec3(0, -1, 0);
        var dummy = CMath.V3Len(_a);
        if (_b != null) {
            _b.mF32A[0] = _a.mF32A[0] / dummy;
            _b.mF32A[1] = _a.mF32A[1] / dummy;
            _b.mF32A[2] = _a.mF32A[2] / dummy;
            return _b;
        }
        return new CVec3(_a.mF32A[0] / dummy, _a.mF32A[1] / dummy, _a.mF32A[2] / dummy);
    }
    static V3Dot(_a, _b) {
        return _a.mF32A[0] * _b.mF32A[0] + _a.mF32A[1] * _b.mF32A[1] + _a.mF32A[2] * _b.mF32A[2];
    }
    static V3Cross(_a, _b, _c = null) {
        if (_c != null) {
            _c.mF32A[0] = _a.mF32A[1] * _b.mF32A[2] - _a.mF32A[2] * _b.mF32A[1];
            _c.mF32A[1] = _a.mF32A[2] * _b.mF32A[0] - _a.mF32A[0] * _b.mF32A[2];
            _c.mF32A[2] = _a.mF32A[0] * _b.mF32A[1] - _a.mF32A[1] * _b.mF32A[0];
            return _c;
        }
        var rVal = new CVec3();
        rVal.mF32A[0] = _a.mF32A[1] * _b.mF32A[2] - _a.mF32A[2] * _b.mF32A[1];
        rVal.mF32A[1] = _a.mF32A[2] * _b.mF32A[0] - _a.mF32A[0] * _b.mF32A[2];
        rVal.mF32A[2] = _a.mF32A[0] * _b.mF32A[1] - _a.mF32A[1] * _b.mF32A[0];
        return rVal;
    }
    static V3TwoAngle(_a, _b) {
        let denom = this.V3Len(_a) * this.V3Len(_b);
        if (denom < 1e-15) {
            return 0;
        }
        let dot = this.V3Dot(_a, _b) / denom;
        dot = this.Clamp(dot, -1, 1);
        return Math.acos(dot);
    }
    static V3SignedAngle(_a, _b, _axis) {
        let unsignedAngle = this.V3TwoAngle(_a, _b);
        let cross_x = _a.mF32A[1] * _b.mF32A[2] - _a.mF32A[2] * _b.mF32A[1];
        let cross_y = _a.mF32A[2] * _b.mF32A[0] - _a.mF32A[0] * _b.mF32A[2];
        let cross_z = _a.mF32A[0] * _b.mF32A[1] - _a.mF32A[1] * _b.mF32A[0];
        let sign = _axis.mF32A[0] * cross_x + _axis.mF32A[1] * cross_y + _axis.mF32A[2] * cross_z;
        sign = sign >= 0.0 ? 1 : -1;
        return unsignedAngle * sign;
    }
    static V4AddV4(v1, v2) {
        return new CVec4(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z, v1.w + v2.w);
    }
    static V4SubV4(v1, v2) {
        return new CVec4(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z, v1.w - v2.w);
    }
    static V4MulFloat(v, s) {
        return new CVec4(v.x * s, v.y * s, v.z * s, v.w);
    }
    static V3Distance(_a, _b) {
        return CMath.V3Len(CMath.V3SubV3(_a, _b));
    }
    static ApproxSqrt(x) {
        return x * (0.41731 + 0.59016 / (x + 1e-6));
    }
    static V3DistancePseudo(_a, _b) {
        const x = _a.mF32A[0] - _b.mF32A[0];
        const y = _a.mF32A[1] - _b.mF32A[1];
        const z = _a.mF32A[2] - _b.mF32A[2];
        return CMath.ApproxSqrt(x * x + y * y + z * z);
    }
    static MatMul(pa_val1, pa_val2, pa_val3 = null) {
        var L_matrix = pa_val3;
        if (L_matrix == null) {
            L_matrix = new CMat();
        }
        if (pa_val2.IsUnit() && pa_val1.IsUnit()) {
            L_matrix.Unit();
        }
        else if (pa_val2.IsUnit()) {
            L_matrix.mF32A.set(pa_val1.mF32A);
            L_matrix.SetUnit(false);
        }
        else if (pa_val1.IsUnit()) {
            L_matrix.mF32A.set(pa_val2.mF32A);
            L_matrix.SetUnit(false);
        }
        else {
            L_matrix.SetUnit(false);
            if (pa_val1.Ptr() != null && pa_val2.Ptr() != null && L_matrix.Ptr() != null) {
                CWASM.MatMul(pa_val1.Ptr(), pa_val2.Ptr(), L_matrix.Ptr());
                return L_matrix;
            }
            const a00 = pa_val2.mF32A[0];
            const a01 = pa_val2.mF32A[1];
            const a02 = pa_val2.mF32A[2];
            const a03 = pa_val2.mF32A[3];
            const a10 = pa_val2.mF32A[4 + 0];
            const a11 = pa_val2.mF32A[4 + 1];
            const a12 = pa_val2.mF32A[4 + 2];
            const a13 = pa_val2.mF32A[4 + 3];
            const a20 = pa_val2.mF32A[8 + 0];
            const a21 = pa_val2.mF32A[8 + 1];
            const a22 = pa_val2.mF32A[8 + 2];
            const a23 = pa_val2.mF32A[8 + 3];
            const a30 = pa_val2.mF32A[12 + 0];
            const a31 = pa_val2.mF32A[12 + 1];
            const a32 = pa_val2.mF32A[12 + 2];
            const a33 = pa_val2.mF32A[12 + 3];
            const b00 = pa_val1.mF32A[0];
            const b01 = pa_val1.mF32A[1];
            const b02 = pa_val1.mF32A[2];
            const b03 = pa_val1.mF32A[3];
            const b10 = pa_val1.mF32A[4 + 0];
            const b11 = pa_val1.mF32A[4 + 1];
            const b12 = pa_val1.mF32A[4 + 2];
            const b13 = pa_val1.mF32A[4 + 3];
            const b20 = pa_val1.mF32A[8 + 0];
            const b21 = pa_val1.mF32A[8 + 1];
            const b22 = pa_val1.mF32A[8 + 2];
            const b23 = pa_val1.mF32A[8 + 3];
            const b30 = pa_val1.mF32A[12 + 0];
            const b31 = pa_val1.mF32A[12 + 1];
            const b32 = pa_val1.mF32A[12 + 2];
            const b33 = pa_val1.mF32A[12 + 3];
            L_matrix.mF32A[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
            L_matrix.mF32A[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
            L_matrix.mF32A[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
            L_matrix.mF32A[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
            L_matrix.mF32A[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
            L_matrix.mF32A[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
            L_matrix.mF32A[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
            L_matrix.mF32A[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
            L_matrix.mF32A[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
            L_matrix.mF32A[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
            L_matrix.mF32A[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
            L_matrix.mF32A[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
            L_matrix.mF32A[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
            L_matrix.mF32A[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
            L_matrix.mF32A[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
            L_matrix.mF32A[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;
        }
        return L_matrix;
    }
    static MatAxisToRotation(axis, radianAngle, pa_out = new CMat) {
        pa_out.SetUnit(false);
        var L_s = Math.sin(radianAngle);
        var L_c = Math.cos(radianAngle);
        var L_d = 1 - L_c;
        pa_out.mF32A[0] = (L_d * (axis.x * axis.x)) + L_c;
        pa_out.mF32A[1] = (L_d * axis.x * axis.y) + (axis.z * L_s);
        pa_out.mF32A[2] = (L_d * axis.x * axis.z) - (axis.y * L_s);
        pa_out.mF32A[3] = 0;
        pa_out.mF32A[4] = (L_d * axis.x * axis.y) - (axis.z * L_s);
        pa_out.mF32A[5] = (L_d * (axis.y * axis.y)) + L_c;
        pa_out.mF32A[6] = (L_d * axis.y * axis.z) + (axis.x * L_s);
        pa_out.mF32A[7] = 0;
        pa_out.mF32A[8] = (L_d * axis.x * axis.y) + (axis.y * L_s);
        pa_out.mF32A[9] = (L_d * axis.y * axis.z) - (axis.x * L_s);
        pa_out.mF32A[10] = (L_d * (axis.z * axis.z)) + L_c;
        pa_out.mF32A[11] = 0;
        pa_out.mF32A[12] = 0;
        pa_out.mF32A[13] = 0;
        pa_out.mF32A[14] = 0;
        pa_out.mF32A[15] = 1;
        return pa_out;
    }
    static MatScale(pa_vec, _mat = null) {
        var pa_out = null;
        if (_mat == null)
            pa_out = new CMat();
        else
            pa_out = _mat;
        if (pa_vec.x == 1 && pa_vec.y == 1 && pa_vec.z == 1)
            pa_out.SetUnit(true);
        else
            pa_out.SetUnit(false);
        pa_out.mF32A[0] = pa_vec.x;
        pa_out.mF32A[1] = 0;
        pa_out.mF32A[2] = 0;
        pa_out.mF32A[3] = 0;
        pa_out.mF32A[4] = 0;
        pa_out.mF32A[5] = pa_vec.y;
        pa_out.mF32A[6] = 0;
        pa_out.mF32A[7] = 0;
        pa_out.mF32A[8] = 0;
        pa_out.mF32A[9] = 0;
        pa_out.mF32A[10] = pa_vec.z;
        pa_out.mF32A[11] = 0;
        pa_out.mF32A[12] = 0;
        pa_out.mF32A[13] = 0;
        pa_out.mF32A[14] = 0;
        pa_out.mF32A[15] = 1;
        return pa_out;
    }
    static MatMulFloat(pa_val1, pa_val2) {
        var L_matrix = new CMat();
        L_matrix.SetUnit(false);
        for (var i = 0; i < 16; ++i) {
            L_matrix.mF32A[i] = pa_val1.mF32A[i] * pa_val2;
        }
        return L_matrix;
    }
    static MatToVec4(pa_vec, pa_mat) {
        var rVal = new CVec3();
        var x = 0, y = 0, z = 0, w = 0;
        x = (pa_mat.mF32A[0] * pa_vec.x) + (pa_mat.mF32A[4] * pa_vec.y) + (pa_mat.mF32A[8] * pa_vec.z) + pa_mat.mF32A[12];
        y = (pa_mat.mF32A[1] * pa_vec.x) + (pa_mat.mF32A[5] * pa_vec.y) + (pa_mat.mF32A[9] * pa_vec.z) + pa_mat.mF32A[13];
        z = (pa_mat.mF32A[2] * pa_vec.x) + (pa_mat.mF32A[6] * pa_vec.y) + (pa_mat.mF32A[10] * pa_vec.z) + pa_mat.mF32A[14];
        w = (pa_mat.mF32A[3] * pa_vec.x) + (pa_mat.mF32A[7] * pa_vec.y) + (pa_mat.mF32A[11] * pa_vec.z) + pa_mat.mF32A[15];
        return new CVec4(x, y, z, w);
    }
    static MatToQut(_m) {
        let pa_qut = new CVec4();
        let m11 = _m.mF32A[0], m12 = _m.mF32A[4], m13 = _m.mF32A[8];
        let m21 = _m.mF32A[1], m22 = _m.mF32A[5], m23 = _m.mF32A[9];
        let m31 = _m.mF32A[2], m32 = _m.mF32A[6], m33 = _m.mF32A[10];
        let trace = m11 + m22 + m33;
        if (trace > 0) {
            let s = 0.5 / Math.sqrt(trace + 1.0);
            pa_qut.w = 0.25 / s;
            pa_qut.x = (m32 - m23) * s;
            pa_qut.y = (m13 - m31) * s;
            pa_qut.z = (m21 - m12) * s;
        }
        else if (m11 > m22 && m11 > m33) {
            const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);
            pa_qut.w = (m32 - m23) / s;
            pa_qut.x = 0.25 * s;
            pa_qut.y = (m12 + m21) / s;
            pa_qut.z = (m13 + m31) / s;
        }
        else if (m22 > m33) {
            const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);
            pa_qut.w = (m13 - m31) / s;
            pa_qut.x = (m12 + m21) / s;
            pa_qut.y = 0.25 * s;
            pa_qut.z = (m23 + m32) / s;
        }
        else {
            const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);
            pa_qut.w = (m21 - m12) / s;
            pa_qut.x = (m13 + m31) / s;
            pa_qut.y = (m23 + m32) / s;
            pa_qut.z = 0.25 * s;
        }
        return pa_qut;
    }
    static V3MulMatNormal(pa_vec, pa_mat, _out = null) {
        var pa_out = _out;
        if (pa_out == null)
            pa_out = new CVec3();
        else if (pa_vec == _out)
            CAlert.E("V3MulMatNormal error");
        if (pa_mat.IsRotUnit())
            pa_out.Import(_out);
        pa_out.mF32A[0] = (pa_mat.mF32A[0] * pa_vec.mF32A[0]) + (pa_mat.mF32A[4] * pa_vec.mF32A[1]) + (pa_mat.mF32A[8] * pa_vec.mF32A[2]);
        pa_out.mF32A[1] = (pa_mat.mF32A[1] * pa_vec.mF32A[0]) + (pa_mat.mF32A[5] * pa_vec.mF32A[1]) + (pa_mat.mF32A[9] * pa_vec.mF32A[2]);
        pa_out.mF32A[2] = (pa_mat.mF32A[2] * pa_vec.mF32A[0]) + (pa_mat.mF32A[6] * pa_vec.mF32A[1]) + (pa_mat.mF32A[10] * pa_vec.mF32A[2]);
        return pa_out;
    }
    static V3MulMatCoordi(pa_vec, pa_mat, _out = null) {
        var pa_out = _out;
        if (pa_out == null)
            pa_out = new CVec3();
        else if (pa_vec == _out)
            CAlert.E("V3MulMatCoordi error");
        let x = 0, y = 0, z = 0, w = 0;
        x = (pa_mat.mF32A[0] * pa_vec.mF32A[0]) + (pa_mat.mF32A[4] * pa_vec.mF32A[1]) + (pa_mat.mF32A[8] * pa_vec.mF32A[2]) + pa_mat.mF32A[12];
        y = (pa_mat.mF32A[1] * pa_vec.mF32A[0]) + (pa_mat.mF32A[5] * pa_vec.mF32A[1]) + (pa_mat.mF32A[9] * pa_vec.mF32A[2]) + pa_mat.mF32A[13];
        z = (pa_mat.mF32A[2] * pa_vec.mF32A[0]) + (pa_mat.mF32A[6] * pa_vec.mF32A[1]) + (pa_mat.mF32A[10] * pa_vec.mF32A[2]) + pa_mat.mF32A[14];
        w = (pa_mat.mF32A[3] * pa_vec.mF32A[0]) + (pa_mat.mF32A[7] * pa_vec.mF32A[1]) + (pa_mat.mF32A[11] * pa_vec.mF32A[2]) + pa_mat.mF32A[15];
        pa_out.mF32A[0] = x / w;
        pa_out.mF32A[1] = y / w;
        pa_out.mF32A[2] = z / w;
        return pa_out;
    }
    static MatInvert(pa_val1, pa_val2 = null) {
        let tMat = CPoolGeo.ProductMat();
        let sMat = CPoolGeo.ProductMat();
        let tmp = tMat.mF32A;
        let src = sMat.mF32A;
        let det = 0.0;
        let dst = pa_val2;
        if (dst == null)
            dst = new CMat();
        dst.SetUnit(false);
        for (let i = 0; i < 4; i++) {
            src[i] = pa_val1.mF32A[i * 4 + 0];
            src[i + 4] = pa_val1.mF32A[i * 4 + 1];
            src[i + 8] = pa_val1.mF32A[i * 4 + 2];
            src[i + 12] = pa_val1.mF32A[i * 4 + 3];
            tmp[i] = 0;
            tmp[i + 4] = 0;
            tmp[i + 8] = 0;
        }
        tmp[0] = src[10] * src[15];
        tmp[1] = src[11] * src[14];
        tmp[2] = src[9] * src[15];
        tmp[3] = src[11] * src[13];
        tmp[4] = src[9] * src[14];
        tmp[5] = src[10] * src[13];
        tmp[6] = src[8] * src[15];
        tmp[7] = src[11] * src[12];
        tmp[8] = src[8] * src[14];
        tmp[9] = src[10] * src[12];
        tmp[10] = src[8] * src[13];
        tmp[11] = src[9] * src[12];
        dst.mF32A[0] = tmp[0] * src[5] + tmp[3] * src[6] + tmp[4] * src[7];
        dst.mF32A[0] -= tmp[1] * src[5] + tmp[2] * src[6] + tmp[5] * src[7];
        dst.mF32A[1] = tmp[1] * src[4] + tmp[6] * src[6] + tmp[9] * src[7];
        dst.mF32A[1] -= tmp[0] * src[4] + tmp[7] * src[6] + tmp[8] * src[7];
        dst.mF32A[2] = tmp[2] * src[4] + tmp[7] * src[5] + tmp[10] * src[7];
        dst.mF32A[2] -= tmp[3] * src[4] + tmp[6] * src[5] + tmp[11] * src[7];
        dst.mF32A[3] = tmp[5] * src[4] + tmp[8] * src[5] + tmp[11] * src[6];
        dst.mF32A[3] -= tmp[4] * src[4] + tmp[9] * src[5] + tmp[10] * src[6];
        dst.mF32A[4] = tmp[1] * src[1] + tmp[2] * src[2] + tmp[5] * src[3];
        dst.mF32A[4] -= tmp[0] * src[1] + tmp[3] * src[2] + tmp[4] * src[3];
        dst.mF32A[5] = tmp[0] * src[0] + tmp[7] * src[2] + tmp[8] * src[3];
        dst.mF32A[5] -= tmp[1] * src[0] + tmp[6] * src[2] + tmp[9] * src[3];
        dst.mF32A[6] = tmp[3] * src[0] + tmp[6] * src[1] + tmp[11] * src[3];
        dst.mF32A[6] -= tmp[2] * src[0] + tmp[7] * src[1] + tmp[10] * src[3];
        dst.mF32A[7] = tmp[4] * src[0] + tmp[9] * src[1] + tmp[10] * src[2];
        dst.mF32A[7] -= tmp[5] * src[0] + tmp[8] * src[1] + tmp[11] * src[2];
        tmp[0] = src[2] * src[7];
        tmp[1] = src[3] * src[6];
        tmp[2] = src[1] * src[7];
        tmp[3] = src[3] * src[5];
        tmp[4] = src[1] * src[6];
        tmp[5] = src[2] * src[5];
        tmp[6] = src[0] * src[7];
        tmp[7] = src[3] * src[4];
        tmp[8] = src[0] * src[6];
        tmp[9] = src[2] * src[4];
        tmp[10] = src[0] * src[5];
        tmp[11] = src[1] * src[4];
        dst.mF32A[8] = tmp[0] * src[13] + tmp[3] * src[14] + tmp[4] * src[15];
        dst.mF32A[8] -= tmp[1] * src[13] + tmp[2] * src[14] + tmp[5] * src[15];
        dst.mF32A[9] = tmp[1] * src[12] + tmp[6] * src[14] + tmp[9] * src[15];
        dst.mF32A[9] -= tmp[0] * src[12] + tmp[7] * src[14] + tmp[8] * src[15];
        dst.mF32A[10] = tmp[2] * src[12] + tmp[7] * src[13] + tmp[10] * src[15];
        dst.mF32A[10] -= tmp[3] * src[12] + tmp[6] * src[13] + tmp[11] * src[15];
        dst.mF32A[11] = tmp[5] * src[12] + tmp[8] * src[13] + tmp[11] * src[14];
        dst.mF32A[11] -= tmp[4] * src[12] + tmp[9] * src[13] + tmp[10] * src[14];
        dst.mF32A[12] = tmp[2] * src[10] + tmp[5] * src[11] + tmp[1] * src[9];
        dst.mF32A[12] -= tmp[4] * src[11] + tmp[0] * src[9] + tmp[3] * src[10];
        dst.mF32A[13] = tmp[8] * src[11] + tmp[0] * src[8] + tmp[7] * src[10];
        dst.mF32A[13] -= tmp[6] * src[10] + tmp[9] * src[11] + tmp[1] * src[8];
        dst.mF32A[14] = tmp[6] * src[9] + tmp[11] * src[11] + tmp[3] * src[8];
        dst.mF32A[14] -= tmp[10] * src[11] + tmp[2] * src[8] + tmp[7] * src[9];
        dst.mF32A[15] = tmp[10] * src[10] + tmp[4] * src[8] + tmp[9] * src[9];
        dst.mF32A[15] -= tmp[8] * src[9] + tmp[11] * src[10] + tmp[5] * src[8];
        det = src[0] * dst.mF32A[0] + src[1] * dst.mF32A[1] + src[2] * dst.mF32A[2] + src[3] * dst.mF32A[3];
        det = 1 / det;
        for (let j = 0; j < 4; j++) {
            dst.mF32A[j * 4 + 0] *= det;
            dst.mF32A[j * 4 + 1] *= det;
            dst.mF32A[j * 4 + 2] *= det;
            dst.mF32A[j * 4 + 3] *= det;
        }
        CPoolGeo.RecycleMat(tMat);
        CPoolGeo.RecycleMat(sMat);
        return dst;
    }
    static MatTranslation(pa_vec) {
        var pa_out = new CMat();
        if (pa_vec.IsZero() == false)
            pa_out.SetUnit(false);
        pa_out.mF32A[0] = 1;
        pa_out.mF32A[1] = 0;
        pa_out.mF32A[2] = 0;
        pa_out.mF32A[3] = 0;
        pa_out.mF32A[4] = 0;
        pa_out.mF32A[5] = 1;
        pa_out.mF32A[6] = 0;
        pa_out.mF32A[7] = 0;
        pa_out.mF32A[8] = 0;
        pa_out.mF32A[9] = 0;
        pa_out.mF32A[10] = 1;
        pa_out.mF32A[11] = 0;
        pa_out.mF32A[12] = pa_vec.x;
        pa_out.mF32A[13] = pa_vec.y;
        pa_out.mF32A[14] = pa_vec.z;
        pa_out.mF32A[15] = 1;
        return pa_out;
    }
    static MatRotation(pa_rot) {
        let v4 = CPoolGeo.ProductV4();
        CMath.EulerToQut(pa_rot, v4);
        var pa_out = CMath.QutToMat(v4);
        CPoolGeo.RecycleV4(v4);
        pa_out.SetUnit(false);
        return pa_out;
    }
    static MatRotExport(pa_viewMat, pa_x, pa_y, pa_z) {
        var pa_outMat = new CMat();
        pa_outMat.SetUnit(false);
        if (pa_x) {
            pa_outMat.mF32A[5] = pa_viewMat.mF32A[5];
            pa_outMat.mF32A[6] = pa_viewMat.mF32A[6];
            pa_outMat.mF32A[9] = pa_viewMat.mF32A[9];
            pa_outMat.mF32A[10] = pa_viewMat.mF32A[10];
        }
        if (pa_y) {
            pa_outMat.mF32A[0] = pa_viewMat.mF32A[0];
            pa_outMat.mF32A[2] = pa_viewMat.mF32A[2];
            pa_outMat.mF32A[8] = pa_viewMat.mF32A[8];
            pa_outMat.mF32A[10] = pa_viewMat.mF32A[10];
        }
        if (pa_z) {
            pa_outMat.mF32A[0] = pa_viewMat.mF32A[0];
            pa_outMat.mF32A[1] = pa_viewMat.mF32A[1];
            pa_outMat.mF32A[4] = pa_viewMat.mF32A[4];
            pa_outMat.mF32A[5] = pa_viewMat.mF32A[5];
        }
        return pa_outMat;
    }
    static MatDecomposeSca(pa_mat, _sca = new CVec3()) {
        let helpVec = CPoolGeo.ProductV3();
        helpVec.mF32A[0] = pa_mat.mF32A[0];
        helpVec.mF32A[1] = pa_mat.mF32A[1];
        helpVec.mF32A[2] = pa_mat.mF32A[2];
        _sca.mF32A[0] = this.V3Len(helpVec);
        helpVec.mF32A[0] = pa_mat.mF32A[4];
        helpVec.mF32A[1] = pa_mat.mF32A[5];
        helpVec.mF32A[2] = pa_mat.mF32A[6];
        _sca.mF32A[1] = this.V3Len(helpVec);
        helpVec.mF32A[0] = pa_mat.mF32A[8];
        helpVec.mF32A[1] = pa_mat.mF32A[9];
        helpVec.mF32A[2] = pa_mat.mF32A[10];
        _sca.mF32A[2] = this.V3Len(helpVec);
        CPoolGeo.RecycleV3(helpVec);
        return _sca;
    }
    static DegreeToRadian(pa_val) {
        return pa_val / 180.0 * d_PI;
    }
    static RadianToDegree(pa_val) {
        return parseInt(((180 * pa_val) / d_PI) + "");
    }
    static EulerToQut(pa_radian, _qut = null, _order = "YZX") {
        var pa_qut = _qut;
        if (pa_qut == null)
            pa_qut = new CVec4();
        const x = pa_radian.x, y = pa_radian.y, z = pa_radian.z, order = _order;
        const cos = Math.cos;
        const sin = Math.sin;
        const c1 = cos(x / 2);
        const c2 = cos(y / 2);
        const c3 = cos(z / 2);
        const s1 = sin(x / 2);
        const s2 = sin(y / 2);
        const s3 = sin(z / 2);
        switch (order) {
            case 'XYZ':
                pa_qut.mF32A[0] = s1 * c2 * c3 + c1 * s2 * s3;
                pa_qut.mF32A[1] = c1 * s2 * c3 - s1 * c2 * s3;
                pa_qut.mF32A[2] = c1 * c2 * s3 + s1 * s2 * c3;
                pa_qut.mF32A[3] = c1 * c2 * c3 - s1 * s2 * s3;
                break;
            case 'YXZ':
                pa_qut.mF32A[0] = s1 * c2 * c3 + c1 * s2 * s3;
                pa_qut.mF32A[1] = c1 * s2 * c3 - s1 * c2 * s3;
                pa_qut.mF32A[2] = c1 * c2 * s3 - s1 * s2 * c3;
                pa_qut.mF32A[3] = c1 * c2 * c3 + s1 * s2 * s3;
                break;
            case 'ZXY':
                pa_qut.mF32A[0] = s1 * c2 * c3 - c1 * s2 * s3;
                pa_qut.mF32A[1] = c1 * s2 * c3 + s1 * c2 * s3;
                pa_qut.mF32A[2] = c1 * c2 * s3 + s1 * s2 * c3;
                pa_qut.mF32A[3] = c1 * c2 * c3 - s1 * s2 * s3;
                break;
            case 'ZYX':
                pa_qut.mF32A[0] = s1 * c2 * c3 - c1 * s2 * s3;
                pa_qut.mF32A[1] = c1 * s2 * c3 + s1 * c2 * s3;
                pa_qut.mF32A[2] = c1 * c2 * s3 - s1 * s2 * c3;
                pa_qut.mF32A[3] = c1 * c2 * c3 + s1 * s2 * s3;
                break;
            case 'YZX':
                pa_qut.mF32A[0] = s1 * c2 * c3 + c1 * s2 * s3;
                pa_qut.mF32A[1] = c1 * s2 * c3 + s1 * c2 * s3;
                pa_qut.mF32A[2] = c1 * c2 * s3 - s1 * s2 * c3;
                pa_qut.mF32A[3] = c1 * c2 * c3 - s1 * s2 * s3;
                break;
            case 'XZY':
                pa_qut.mF32A[0] = s1 * c2 * c3 - c1 * s2 * s3;
                pa_qut.mF32A[1] = c1 * s2 * c3 - s1 * c2 * s3;
                pa_qut.mF32A[2] = c1 * c2 * s3 + s1 * s2 * c3;
                pa_qut.mF32A[3] = c1 * c2 * c3 + s1 * s2 * s3;
                break;
            default:
                CAlert.E(' encountered an unknown order: ' + order);
        }
        return pa_qut;
    }
    static QutToEuler(pa_qut, _order = "YZX") {
        var pa_radian = new CVec3();
        const x = pa_qut.x, y = pa_qut.y, z = pa_qut.z, w = pa_qut.w;
        const order = _order;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;
        const m11 = 1 - (yy + zz), m21 = xy + wz, m31 = xz - wy;
        const m12 = xy - wz, m22 = 1 - (xx + zz), m32 = yz + wx;
        const m13 = xz + wy, m23 = yz - wx, m33 = 1 - (xx + yy);
        function clamp(_val, _min, _max) {
            return Math.min(Math.max(_val, _min), _max);
        }
        switch (order) {
            case 'XYZ':
                pa_radian.y = Math.asin(clamp(m13, -1, 1));
                if (Math.abs(m13) < 0.9999999) {
                    pa_radian.x = Math.atan2(-m23, m33);
                    pa_radian.z = Math.atan2(-m12, m11);
                }
                else {
                    pa_radian.x = Math.atan2(m32, m22);
                    pa_radian.z = 0;
                }
                break;
            case 'YXZ':
                pa_radian.x = Math.asin(-clamp(m23, -1, 1));
                if (Math.abs(m23) < 0.9999999) {
                    pa_radian.y = Math.atan2(m13, m33);
                    pa_radian.z = Math.atan2(m21, m22);
                }
                else {
                    pa_radian.y = Math.atan2(-m31, m11);
                    pa_radian.z = 0;
                }
                break;
            case 'ZXY':
                pa_radian.x = Math.asin(clamp(m32, -1, 1));
                if (Math.abs(m32) < 0.9999999) {
                    pa_radian.y = Math.atan2(-m31, m33);
                    pa_radian.z = Math.atan2(-m12, m22);
                }
                else {
                    pa_radian.y = 0;
                    pa_radian.z = Math.atan2(m21, m11);
                }
                break;
            case 'ZYX':
                pa_radian.y = Math.asin(-clamp(m31, -1, 1));
                if (Math.abs(m31) < 0.9999999) {
                    pa_radian.x = Math.atan2(m32, m33);
                    pa_radian.z = Math.atan2(m21, m11);
                }
                else {
                    pa_radian.x = 0;
                    pa_radian.z = Math.atan2(-m12, m22);
                }
                break;
            case 'YZX':
                pa_radian.z = Math.asin(clamp(m21, -1, 1));
                if (Math.abs(m21) < 0.9999999) {
                    pa_radian.x = Math.atan2(-m23, m22);
                    pa_radian.y = Math.atan2(-m31, m11);
                }
                else {
                    pa_radian.x = 0;
                    pa_radian.y = Math.atan2(m13, m33);
                }
                break;
            case 'XZY':
                pa_radian.z = Math.asin(-clamp(m12, -1, 1));
                if (Math.abs(m12) < 0.9999999) {
                    pa_radian.x = Math.atan2(m32, m22);
                    pa_radian.y = Math.atan2(m13, m11);
                }
                else {
                    pa_radian.x = Math.atan2(-m23, m33);
                    pa_radian.y = 0;
                }
                break;
            default:
                CAlert.E(' encountered an unknown order: ' + order);
        }
        return pa_radian;
    }
    static QutMul(pa_val1, pa_val2, pa_val3 = null) {
        var L_qut = new CVec3();
        var L_Oqut = pa_val3;
        if (L_Oqut == null)
            L_Oqut = new CVec4();
        var L_vec = CMath.V3Cross(new CVec3(pa_val2.x, pa_val2.y, pa_val2.z), new CVec3(pa_val1.x, pa_val1.y, pa_val1.z));
        L_qut.x = L_vec.x + pa_val1.w * pa_val2.x + pa_val2.w * pa_val1.x;
        L_qut.y = L_vec.y + pa_val1.w * pa_val2.y + pa_val2.w * pa_val1.y;
        L_qut.z = L_vec.z + pa_val1.w * pa_val2.z + pa_val2.w * pa_val1.z;
        L_Oqut.x = L_qut.x;
        L_Oqut.y = L_qut.y;
        L_Oqut.z = L_qut.z;
        var L_val = CMath.V3Dot(new CVec3(pa_val1.x, pa_val1.y, pa_val1.z), new CVec3(pa_val2.x, pa_val2.y, pa_val2.z));
        L_Oqut.w = pa_val2.w * pa_val1.w - L_val;
        return L_Oqut;
    }
    static QutInverse(pa_val1) {
        var L_con = new CVec4();
        var L_len = 0;
        L_con = CMath.QutConjugate(pa_val1);
        L_len = CMath.QutLenght(pa_val1);
        L_con.x = L_con.x / L_len;
        L_con.y = L_con.y / L_len;
        L_con.z = L_con.z / L_len;
        L_con.w = L_con.w / L_len;
        return L_con;
    }
    static QutNomalize(pa_val1) {
        var L_con = new CVec4();
        var L_len = 0;
        L_len = CMath.QutLenght(pa_val1);
        L_con.x = pa_val1.x / L_len;
        L_con.y = pa_val1.y / L_len;
        L_con.z = pa_val1.z / L_len;
        L_con.w = pa_val1.w / L_len;
        return L_con;
    }
    static QutConjugate(pa_val1) {
        var pa_out = new CVec4();
        pa_out.x = -pa_val1.x;
        pa_out.y = -pa_val1.y;
        pa_out.z = -pa_val1.z;
        pa_out.w = pa_val1.w;
        return pa_out;
    }
    static QutLenght(pa_val1) {
        return pa_val1.x * pa_val1.x + pa_val1.y * pa_val1.y + pa_val1.z * pa_val1.z + pa_val1.w * pa_val1.w;
    }
    static QutAxisToRotation(axis, radianAngle) {
        var pa_out = new CVec4();
        pa_out.x = axis.x * Math.sin(radianAngle / 2);
        pa_out.y = axis.y * Math.sin(radianAngle / 2);
        pa_out.z = axis.z * Math.sin(radianAngle / 2);
        pa_out.w = Math.cos(radianAngle / 2);
        return pa_out;
    }
    static FromToRotation(_from, _to) {
        let axis = this.V3Cross(_from, _to);
        this.V3Nor(axis, axis);
        let angle = this.V3TwoAngle(_from, _to);
        return this.QutAxisToRotation(axis, angle);
    }
    static QutToMat(pa_val1, _mat = null) {
        var pa_out = null;
        if (_mat == null)
            pa_out = new CMat();
        else
            pa_out = _mat;
        if (pa_val1.x == 0 && pa_val1.y == 0 && pa_val1.z == 0 && pa_val1.w == 1)
            pa_out.SetUnit(true);
        else
            pa_out.SetUnit(false);
        pa_out.mF32A[0] = 1 - (2 * pa_val1.y * pa_val1.y) - (2 * pa_val1.z * pa_val1.z);
        pa_out.mF32A[1] = (2 * pa_val1.x * pa_val1.y) + (2 * pa_val1.z * pa_val1.w);
        pa_out.mF32A[2] = (2 * pa_val1.x * pa_val1.z) - (2 * pa_val1.y * pa_val1.w);
        pa_out.mF32A[3] = 0;
        pa_out.mF32A[4] = (2 * pa_val1.x * pa_val1.y) - (2 * pa_val1.z * pa_val1.w);
        pa_out.mF32A[5] = 1 - (2 * pa_val1.x * pa_val1.x) - (2 * pa_val1.z * pa_val1.z);
        pa_out.mF32A[6] = (2 * pa_val1.y * pa_val1.z) + (2 * pa_val1.x * pa_val1.w);
        pa_out.mF32A[7] = 0;
        pa_out.mF32A[8] = (2 * pa_val1.x * pa_val1.z) + (2 * pa_val1.y * pa_val1.w);
        pa_out.mF32A[9] = (2 * pa_val1.y * pa_val1.z) - (2 * pa_val1.x * pa_val1.w);
        pa_out.mF32A[10] = 1 - (2 * pa_val1.x * pa_val1.x) - (2 * pa_val1.y * pa_val1.y);
        pa_out.mF32A[11] = 0;
        pa_out.mF32A[12] = 0;
        pa_out.mF32A[13] = 0;
        pa_out.mF32A[14] = 0;
        pa_out.mF32A[15] = 1;
        return pa_out;
    }
    static QutDot(pa_val1, pa_val2) {
        return pa_val1.x * pa_val2.x + pa_val1.y * pa_val2.y + pa_val1.z * pa_val2.z + pa_val1.w * pa_val2.w;
    }
    static Vec4PlusVec4(_val1, _val2) {
        return new CVec4(_val1.x + _val2.x, _val1.y + _val2.y, _val1.z + _val2.z, _val1.w + _val2.w);
    }
    static FloatInterpolate(_first, _second, pa_time) {
        return _first * (1.0 - pa_time) + _second * pa_time;
    }
    static V3Interpolate(_first, _second, pa_time, pa_out = new CVec3()) {
        pa_out.x = this.FloatInterpolate(_first.x, _second.x, pa_time);
        pa_out.y = this.FloatInterpolate(_first.y, _second.y, pa_time);
        pa_out.z = this.FloatInterpolate(_first.z, _second.z, pa_time);
        return pa_out;
    }
    static QutInterpolate(pa_first, pa_second, pa_time, pa_out = new CVec4()) {
        var omega, cosom, sinom, scale0, scale1;
        cosom = CMath.QutDot(pa_first, pa_second);
        if (cosom < 0.0) {
            cosom *= -1;
            pa_first.x *= -1;
            pa_first.y *= -1;
            pa_first.z *= -1;
            pa_first.w *= -1;
        }
        if ((1.0 - cosom) > 0.0) {
            omega = Math.acos(cosom);
            sinom = Math.sin(omega);
            scale0 = Math.sin((1.0 - pa_time) * omega) / sinom;
            scale1 = Math.sin(pa_time * omega) / sinom;
        }
        else {
            scale0 = 1.0 - pa_time;
            scale1 = pa_time;
        }
        pa_out.x = scale1 * pa_second.x + scale0 * pa_first.x;
        pa_out.y = scale1 * pa_second.y + scale0 * pa_first.y;
        pa_out.z = scale1 * pa_second.z + scale0 * pa_first.z;
        pa_out.w = scale1 * pa_second.w + scale0 * pa_first.w;
        return pa_out;
    }
    static Vec3toPlane(pa_vec1, pa_vec2, pa_vec3) {
        var pa_out = new CVec4();
        var L_t0 = CPoolGeo.ProductV3();
        var L_t1 = CPoolGeo.ProductV3();
        var L_t2 = CPoolGeo.ProductV3();
        CMath.V3SubV3(pa_vec2, pa_vec1, L_t0);
        CMath.V3SubV3(pa_vec3, pa_vec1, L_t1);
        CMath.V3Cross(L_t0, L_t1, L_t2);
        CMath.V3Nor(L_t2, L_t2);
        CMath.NormalAndVertexFromPlane(L_t2, pa_vec1, pa_out);
        CPoolGeo.RecycleV3(L_t0);
        CPoolGeo.RecycleV3(L_t1);
        CPoolGeo.RecycleV3(L_t2);
        return pa_out;
    }
    static NormalAndVertexFromPlane(pa_normal, pa_vertex, _out = null, _planeOff = 0) {
        var pa_out = _out;
        if (pa_out == null)
            pa_out = new CVec4();
        pa_out.mF32A[_planeOff + 0] = pa_normal.x;
        pa_out.mF32A[_planeOff + 1] = pa_normal.y;
        pa_out.mF32A[_planeOff + 2] = pa_normal.z;
        pa_out.mF32A[_planeOff + 3] = -CMath.V3Dot(pa_normal, pa_vertex);
        return pa_out;
    }
    static PlaneVec3DotCoordinate(pa_plane, _dir, _pos) {
        var v = CPoolGeo.ProductV3();
        v.mF32A[0] = pa_plane.mF32A[_dir + 0];
        v.mF32A[1] = pa_plane.mF32A[_dir + 1];
        v.mF32A[2] = pa_plane.mF32A[_dir + 2];
        let dot = CMath.V3Dot(v, _pos) + pa_plane.mF32A[_dir + 3];
        CPoolGeo.RecycleV3(v);
        return dot;
    }
    static PlaneVec3DotNormal(pa_plane, pa_vec) {
        return CMath.V3Dot(new CVec3(pa_plane.x, pa_plane.y, pa_plane.z), pa_vec);
    }
}
;

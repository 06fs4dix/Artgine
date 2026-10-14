import { CWASM } from "../basic/CWASM.js";
import { CMat } from "./CMat.js";
import { CMath } from "./CMath.js";
import { CPlane } from "./CPlane.js";
import { CPlaneInside } from "./CPlaneInside.js";
import { CPoolGeo } from "./CPoolGeo.js";
import { CVec3 } from "./CVec3.js";
const d_EPSILON = 1e-6;
export class CUtilMath {
    static CameraPerspectiveFovLH(fov, aspect, znear, zfar, _width, result = new CMat()) {
        var yScale = (1.0 / Math.tan(fov * 0.5));
        var q = zfar / (zfar - znear);
        result.SetUnit(false);
        if (_width) {
            result.mF32A[0] = yScale / aspect;
            result.mF32A[5] = yScale;
        }
        else {
            result.mF32A[0] = yScale;
            result.mF32A[5] = yScale / aspect;
        }
        result.mF32A[10] = q;
        result.mF32A[11] = 1.0;
        result.mF32A[14] = -q * znear;
        return result;
    }
    static CameraPerspectiveFovLH_ReverseZ(fov, aspect, znear, zfar, _width, result = new CMat()) {
        var yScale = (1.0 / Math.tan(fov * 0.5));
        var q = znear / (znear - zfar);
        result.SetUnit(false);
        if (_width) {
            result.mF32A[0] = yScale / aspect;
            result.mF32A[5] = yScale;
        }
        else {
            result.mF32A[0] = yScale;
            result.mF32A[5] = yScale / aspect;
        }
        result.mF32A[10] = q;
        result.mF32A[11] = 1.0;
        result.mF32A[14] = -q * zfar;
        return result;
    }
    static CameraPerspectiveFovRH(fov, aspect, znear, zfar, _width, result = new CMat()) {
        var yScale = (1.0 / Math.tan(fov * 0.5));
        var q = zfar / (znear - zfar);
        result.SetUnit(false);
        if (_width) {
            result.mF32A[0] = yScale / aspect;
            result.mF32A[5] = yScale;
        }
        else {
            result.mF32A[0] = yScale;
            result.mF32A[5] = yScale / aspect;
        }
        result.mF32A[10] = q;
        result.mF32A[11] = -1.0;
        result.mF32A[14] = q * znear;
        return result;
    }
    static CameraPerspectiveFovRH_ReverseZ(fov, aspect, znear, zfar, _width, result = new CMat()) {
        var yScale = (1.0 / Math.tan(fov * 0.5));
        var q = znear / (zfar - znear);
        result.SetUnit(false);
        if (_width) {
            result.mF32A[0] = yScale / aspect;
            result.mF32A[5] = yScale;
        }
        else {
            result.mF32A[0] = yScale;
            result.mF32A[5] = yScale / aspect;
        }
        result.mF32A[10] = q;
        result.mF32A[11] = -1.0;
        result.mF32A[14] = q * zfar;
        return result;
    }
    static CameraOrthoLH(width, height, zn, zf, result = new CMat()) {
        result.SetUnit(false);
        result.mF32A[0] = 2 / width;
        result.mF32A[1] = 0;
        result.mF32A[2] = 0;
        result.mF32A[3] = 0;
        result.mF32A[4] = 0;
        result.mF32A[5] = 2 / height;
        result.mF32A[6] = 0;
        result.mF32A[7] = 0;
        result.mF32A[8] = 0;
        result.mF32A[9] = 0;
        result.mF32A[10] = 1 / (zn - zf);
        result.mF32A[11] = 0;
        result.mF32A[12] = 0;
        result.mF32A[13] = 0;
        result.mF32A[14] = -zf / (zn - zf);
        result.mF32A[15] = 1;
        return result;
    }
    static CameraOrthoLH_ReverseZ(width, height, zn, zf, result = new CMat()) {
        result.SetUnit(false);
        result.mF32A[0] = 2 / width;
        result.mF32A[1] = 0;
        result.mF32A[2] = 0;
        result.mF32A[3] = 0;
        result.mF32A[4] = 0;
        result.mF32A[5] = 2 / height;
        result.mF32A[6] = 0;
        result.mF32A[7] = 0;
        result.mF32A[8] = 0;
        result.mF32A[9] = 0;
        result.mF32A[10] = 1 / (zf - zn);
        result.mF32A[11] = 0;
        result.mF32A[12] = 0;
        result.mF32A[13] = 0;
        result.mF32A[14] = -zn / (zf - zn);
        result.mF32A[15] = 1;
        return result;
    }
    static CameraOrthoRH(width, height, zn, zf, result = new CMat()) {
        result.SetUnit(false);
        result.mF32A[0] = 2 / width;
        result.mF32A[1] = 0;
        result.mF32A[2] = 0;
        result.mF32A[3] = 0;
        result.mF32A[4] = 0;
        result.mF32A[5] = 2 / height;
        result.mF32A[6] = 0;
        result.mF32A[7] = 0;
        result.mF32A[8] = 0;
        result.mF32A[9] = 0;
        result.mF32A[10] = 1 / (zn - zf);
        result.mF32A[11] = 0;
        result.mF32A[12] = 0;
        result.mF32A[13] = 0;
        result.mF32A[14] = zn / (zn - zf);
        result.mF32A[15] = 1;
        return result;
    }
    static CameraOrthoRH_ReverseZ(width, height, zn, zf, result = new CMat()) {
        result.SetUnit(false);
        result.mF32A[0] = 2 / width;
        result.mF32A[1] = 0;
        result.mF32A[2] = 0;
        result.mF32A[3] = 0;
        result.mF32A[4] = 0;
        result.mF32A[5] = 2 / height;
        result.mF32A[6] = 0;
        result.mF32A[7] = 0;
        result.mF32A[8] = 0;
        result.mF32A[9] = 0;
        result.mF32A[10] = 1 / (zf - zn);
        result.mF32A[11] = 0;
        result.mF32A[12] = 0;
        result.mF32A[13] = 0;
        result.mF32A[14] = zf / (zf - zn);
        result.mF32A[15] = 1;
        return result;
    }
    static CameraLookAtLH(eyeVec, lookVec, upVec, viewMat = new CMat()) {
        viewMat.SetUnit(false);
        let Zaxis = CPoolGeo.ProductV3();
        CMath.V3SubV3(lookVec, eyeVec, Zaxis);
        CMath.V3Nor(Zaxis, Zaxis);
        let Xaxis = CPoolGeo.ProductV3();
        CMath.V3Cross(upVec, Zaxis, Xaxis);
        if (Xaxis.IsZero()) {
            Xaxis.mF32A[0] = 1;
            Xaxis.mF32A[1] = 0;
            Xaxis.mF32A[2] = 0;
        }
        CMath.V3Nor(Xaxis, Xaxis);
        let Yaxis = CPoolGeo.ProductV3();
        Yaxis = CMath.V3Cross(Zaxis, Xaxis, Yaxis);
        viewMat.mF32A[0] = Xaxis.x;
        viewMat.mF32A[1] = Yaxis.x;
        viewMat.mF32A[2] = Zaxis.x;
        viewMat.mF32A[3] = 0;
        viewMat.mF32A[4] = Xaxis.y;
        viewMat.mF32A[5] = Yaxis.y;
        viewMat.mF32A[6] = Zaxis.y;
        viewMat.mF32A[7] = 0;
        viewMat.mF32A[8] = Xaxis.z;
        viewMat.mF32A[9] = Yaxis.z;
        viewMat.mF32A[10] = Zaxis.z;
        viewMat.mF32A[11] = 0;
        viewMat.mF32A[12] = -CMath.V3Dot(Xaxis, eyeVec);
        viewMat.mF32A[13] = -CMath.V3Dot(Yaxis, eyeVec);
        viewMat.mF32A[14] = -CMath.V3Dot(Zaxis, eyeVec);
        viewMat.mF32A[15] = 1;
        CPoolGeo.RecycleV3(Xaxis);
        CPoolGeo.RecycleV3(Yaxis);
        CPoolGeo.RecycleV3(Zaxis);
        return viewMat;
    }
    static CameraLookAtRH(eyeVec, lookVec, upVec, viewMat = new CMat()) {
        viewMat.SetUnit(false);
        let Zaxis = CPoolGeo.ProductV3();
        CMath.V3SubV3(eyeVec, lookVec, Zaxis);
        CMath.V3Nor(Zaxis, Zaxis);
        let Xaxis = CPoolGeo.ProductV3();
        CMath.V3Cross(upVec, Zaxis, Xaxis);
        if (Xaxis.IsZero()) {
            Xaxis.mF32A[0] = 1;
            Xaxis.mF32A[1] = 0;
            Xaxis.mF32A[2] = 0;
        }
        CMath.V3Nor(Xaxis, Xaxis);
        let Yaxis = CPoolGeo.ProductV3();
        Yaxis = CMath.V3Cross(Zaxis, Xaxis, Yaxis);
        viewMat.mF32A[0] = Xaxis.x;
        viewMat.mF32A[1] = Yaxis.x;
        viewMat.mF32A[2] = Zaxis.x;
        viewMat.mF32A[3] = 0;
        viewMat.mF32A[4] = Xaxis.y;
        viewMat.mF32A[5] = Yaxis.y;
        viewMat.mF32A[6] = Zaxis.y;
        viewMat.mF32A[7] = 0;
        viewMat.mF32A[8] = Xaxis.z;
        viewMat.mF32A[9] = Yaxis.z;
        viewMat.mF32A[10] = Zaxis.z;
        viewMat.mF32A[11] = 0;
        viewMat.mF32A[12] = -CMath.V3Dot(Xaxis, eyeVec);
        viewMat.mF32A[13] = -CMath.V3Dot(Yaxis, eyeVec);
        viewMat.mF32A[14] = -CMath.V3Dot(Zaxis, eyeVec);
        viewMat.mF32A[15] = 1;
        CPoolGeo.RecycleV3(Xaxis);
        CPoolGeo.RecycleV3(Yaxis);
        CPoolGeo.RecycleV3(Zaxis);
        return viewMat;
    }
    static RayTriangleIS(pa_one, pa_two, pa_three, pa_ray, pa_ccw = true) {
        var pvec = new CVec3();
        var tvec = new CVec3();
        var qvec = new CVec3();
        var det = 0, u = 0, v = 0, dist = 0;
        var edge1 = CMath.V3SubV3(pa_two, pa_one);
        var edge2 = CMath.V3SubV3(pa_three, pa_one);
        var L_dir = CMath.V3SubV3(pa_ray.GetOriginal(), pa_one);
        if (L_dir.x == 0 && L_dir.y == 0 && L_dir.z == 0) {
            return true;
        }
        else {
            CMath.V3Nor(L_dir, L_dir);
            det = CMath.V3Dot(L_dir, CMath.V3MulFloat(pa_ray.GetDirect(), -1));
            if (det < 0 && pa_ccw) {
                return false;
            }
        }
        CMath.V3Cross(pa_ray.GetDirect(), edge2, pvec);
        det = CMath.V3Dot(edge1, pvec);
        if (det > 0) {
            CMath.V3SubV3(pa_ray.GetOriginal(), pa_one, tvec);
        }
        else {
            CMath.V3SubV3(pa_one, pa_ray.GetOriginal(), tvec);
            det = -det;
            if (pa_ccw) {
                return false;
            }
        }
        if (det < 0.000001) {
            return false;
        }
        u = CMath.V3Dot(tvec, pvec);
        if (u < 0.0 || u > det) {
            return false;
        }
        CMath.V3Cross(tvec, edge1, qvec);
        v = CMath.V3Dot(pa_ray.GetDirect(), qvec);
        if (v < 0.0 || u + v > det) {
            return false;
        }
        dist = CMath.V3Dot(edge2, qvec);
        dist *= (1.0 / det);
        var sum = CMath.V3MulFloat(pa_ray.GetDirect(), dist);
        CMath.V3AddV3(pa_ray.GetOriginal(), sum, sum);
        pa_ray.SetPosition(sum);
        return true;
    }
    static RayBoxIS(_min, _max, pa_ray) {
        const vl = pa_ray.mVec3List;
        const d = vl[0].mF32A;
        const o = vl[2].mF32A;
        const a = _min.mF32A;
        const b = _max.mF32A;
        let tmin = -Infinity, tmax = Infinity;
        let dv, ov, lo, hi, t1, t2, tmp;
        dv = d[0];
        ov = o[0];
        lo = a[0];
        hi = b[0];
        if (lo > hi) {
            tmp = lo;
            lo = hi;
            hi = tmp;
        }
        if (dv > d_EPSILON || dv < -d_EPSILON) {
            t1 = (lo - ov) / dv;
            t2 = (hi - ov) / dv;
            if (t1 > t2) {
                tmp = t1;
                t1 = t2;
                t2 = tmp;
            }
            if (t1 > tmin)
                tmin = t1;
            if (t2 < tmax)
                tmax = t2;
            if (tmin > tmax || tmax < 0)
                return false;
        }
        else if (ov < lo || ov > hi)
            return false;
        dv = d[1];
        ov = o[1];
        lo = a[1];
        hi = b[1];
        if (lo > hi) {
            tmp = lo;
            lo = hi;
            hi = tmp;
        }
        if (dv > d_EPSILON || dv < -d_EPSILON) {
            t1 = (lo - ov) / dv;
            t2 = (hi - ov) / dv;
            if (t1 > t2) {
                tmp = t1;
                t1 = t2;
                t2 = tmp;
            }
            if (t1 > tmin)
                tmin = t1;
            if (t2 < tmax)
                tmax = t2;
            if (tmin > tmax || tmax < 0)
                return false;
        }
        else if (ov < lo || ov > hi)
            return false;
        dv = d[2];
        ov = o[2];
        lo = a[2];
        hi = b[2];
        if (lo > hi) {
            tmp = lo;
            lo = hi;
            hi = tmp;
        }
        if (dv > d_EPSILON || dv < -d_EPSILON) {
            t1 = (lo - ov) / dv;
            t2 = (hi - ov) / dv;
            if (t1 > t2) {
                tmp = t1;
                t1 = t2;
                t2 = tmp;
            }
            if (t1 > tmin)
                tmin = t1;
            if (t2 < tmax)
                tmax = t2;
            if (tmin > tmax || tmax < 0)
                return false;
        }
        else if (ov < lo || ov > hi)
            return false;
        const p = vl[1].mF32A;
        if (tmin <= 0) {
            p[0] = o[0];
            p[1] = o[1];
            p[2] = o[2];
        }
        else {
            p[0] = o[0] + d[0] * tmin;
            p[1] = o[1] + d[1] * tmin;
            p[2] = o[2] + d[2] * tmin;
        }
        return true;
    }
    static RaySphereIS(pa_center, pa_radian, pa_ray) {
        var l = CMath.V3SubV3(pa_center, pa_ray.GetOriginal());
        var s = CMath.V3Dot(l, CMath.V3Nor(pa_ray.GetDirect()));
        var l2 = CMath.V3Dot(l, l);
        var r2 = Math.pow(pa_radian, 2);
        if (s < 0 && l2 > r2) {
            return false;
        }
        var s2 = Math.pow(s, 2);
        var m2 = l2 - s2;
        if (m2 > r2) {
            return false;
        }
        var q = Math.sqrt(r2 - m2);
        var distance;
        if (l2 > r2) {
            distance = s - q;
        }
        else {
            distance = s + q;
        }
        pa_ray.SetPosition(CMath.V3AddV3(pa_ray.GetOriginal(), CMath.V3MulFloat(pa_ray.GetDirect(), distance)));
        return true;
    }
    static ColSphereSphere(_posA, _radiusA, _posB, _radiusB) {
        var vlen = CMath.V3Len(CMath.V3SubV3(_posA, _posB));
        if (vlen <= _radiusA + _radiusB)
            return vlen;
        return -1;
    }
    static PlaneSphereDist(pa_plane, pa_posion, pa_radius, _dist) {
        let minVal = 100000000;
        let L_dist = 0;
        _dist.mF32A[6] = -1;
        for (let i = 0; i < 6; ++i) {
            _dist.mF32A[i] = CMath.PlaneDotV3Coordi(pa_plane, i * 4, pa_posion);
            if (minVal > _dist.mF32A[i]) {
                _dist.mF32A[6] = i;
                _dist.mF32A[7] = _dist.mF32A[i];
                minVal = _dist.mF32A[i];
            }
        }
    }
    static PlaneSphereInside(pa_plane, pa_posion, pa_radius, _pArr) {
        if (pa_plane.Ptr() != null && pa_posion.Ptr() != null && _pArr == null)
            return CWASM.PlaneSphereInside(pa_plane.Ptr(), pa_posion.Ptr(), pa_radius);
        var L_dist = 0;
        L_dist = CMath.PlaneDotV3Coordi(pa_plane, CPlane.eDir.Left, pa_posion);
        if (_pArr == null) {
            if (L_dist < -pa_radius)
                return false;
        }
        else {
            if (L_dist < pa_radius)
                _pArr.push(new CPlaneInside(CPlane.eDir.Left, -L_dist / pa_radius));
        }
        L_dist = CMath.PlaneDotV3Coordi(pa_plane, CPlane.eDir.Right, pa_posion);
        if (_pArr == null) {
            if (L_dist < -pa_radius)
                return false;
        }
        else {
            if (L_dist < pa_radius)
                _pArr.push(new CPlaneInside(CPlane.eDir.Right, -L_dist / pa_radius));
        }
        L_dist = CMath.PlaneDotV3Coordi(pa_plane, CPlane.eDir.Bottom, pa_posion);
        if (_pArr == null) {
            if (L_dist < -pa_radius)
                return false;
        }
        else {
            if (L_dist < pa_radius)
                _pArr.push(new CPlaneInside(CPlane.eDir.Bottom, -L_dist / pa_radius));
        }
        L_dist = CMath.PlaneDotV3Coordi(pa_plane, CPlane.eDir.Top, pa_posion);
        if (_pArr == null) {
            if (L_dist < -pa_radius)
                return false;
        }
        else {
            if (L_dist < pa_radius)
                _pArr.push(new CPlaneInside(CPlane.eDir.Top, -L_dist / pa_radius));
        }
        L_dist = CMath.PlaneDotV3Coordi(pa_plane, CPlane.eDir.Near, pa_posion);
        if (_pArr == null) {
            if (L_dist < -pa_radius)
                return false;
        }
        else {
            if (L_dist < pa_radius)
                _pArr.push(new CPlaneInside(CPlane.eDir.Near, -L_dist / pa_radius));
        }
        L_dist = CMath.PlaneDotV3Coordi(pa_plane, CPlane.eDir.Far, pa_posion);
        if (_pArr == null) {
            if (L_dist < -pa_radius)
                return false;
        }
        else {
            if (L_dist < pa_radius)
                _pArr.push(new CPlaneInside(CPlane.eDir.Far, -L_dist / pa_radius));
        }
        return true;
    }
    static Bezier(pa_vec, pa_persent, _rangeX, _rangeY) {
        var k = 0, kn = 0, nn = 0, nkn = 0;
        var n = pa_vec.length - 1;
        var blend = 0, muk = 0, munk = 0;
        var pa_pst = null;
        if (pa_vec[0] instanceof CVec3) {
            pa_pst = new CVec3();
            var b = new CVec3();
            if (pa_persent == 1.0) {
                pa_pst = pa_vec[pa_vec.length - 1];
                return pa_pst;
            }
            if (_rangeY == 0) {
                n = pa_vec.length - 1;
                _rangeY = n;
            }
            else
                n = (_rangeY + 1 - _rangeX) - 1;
            muk = 1;
            munk = Math.pow(1.0 - pa_persent, n);
            var newK = 0;
            for (k = _rangeX; k <= _rangeY; k++) {
                newK = k - _rangeX;
                nn = n;
                kn = newK;
                nkn = n - newK;
                blend = muk * munk;
                muk *= pa_persent;
                munk /= (1 - pa_persent);
                while (nn >= 1) {
                    blend *= nn;
                    nn--;
                    if (kn > 1) {
                        blend /= kn;
                        kn--;
                    }
                    if (nkn > 1) {
                        blend /= nkn;
                        nkn--;
                    }
                }
                b.x += (pa_vec[k].x * blend);
                b.y += (pa_vec[k].y * blend);
                b.z += (pa_vec[k].z * blend);
            }
            pa_pst = b;
        }
        else {
            pa_pst = 0;
            var bb = 0;
            if (pa_persent == 1.0) {
                pa_pst = pa_vec[pa_vec.length - 1];
                return pa_pst;
            }
            if (_rangeY == 0) {
                n = pa_vec.length - 1;
                _rangeY = n;
            }
            else
                n = (_rangeY + 1 - _rangeX) - 1;
            muk = 1;
            munk = Math.pow(1.0 - pa_persent, n);
            var newK = 0;
            for (k = _rangeX; k <= _rangeY; k++) {
                newK = k - _rangeX;
                nn = n;
                kn = newK;
                nkn = n - newK;
                blend = muk * munk;
                muk *= pa_persent;
                munk /= (1 - pa_persent);
                while (nn >= 1) {
                    blend *= nn;
                    nn--;
                    if (kn > 1) {
                        blend /= kn;
                        kn--;
                    }
                    if (nkn > 1) {
                        blend /= nkn;
                        nkn--;
                    }
                }
                bb += (pa_vec[k] * blend);
            }
            pa_pst = bb;
        }
        return pa_pst;
    }
    static Vec3ToBillboard(RF_axis, _st, _ed, _eye) {
        var t0 = new CVec3();
        var t1 = new CVec3();
        var t2 = new CVec3();
        CMath.V3SubV3(_st, _ed, t0);
        CMath.V3SubV3(_eye, _st, t1);
        if (_ed.equals(_st))
            _st = new CVec3(0, 1, 0);
        CMath.V3Nor(t0, t0);
        CMath.V3Nor(t1, t1);
        CMath.V3Cross(t0, t1, t2);
        CMath.V3Nor(t2, t2);
        RF_axis.x = t2.x;
        RF_axis.y = t2.y;
        RF_axis.z = t2.z;
    }
    static ColSphereBox(_posA, _radiusA, _boundB, _matB) {
        let xAxis = new CVec3(_matB.mF32A[0], _matB.mF32A[1], _matB.mF32A[2]);
        let yAxis = new CVec3(_matB.mF32A[4], _matB.mF32A[5], _matB.mF32A[6]);
        let zAxis = new CVec3(_matB.mF32A[8], _matB.mF32A[9], _matB.mF32A[10]);
        let scaX = CMath.V3Len(xAxis);
        let scaY = CMath.V3Len(yAxis);
        let scaZ = CMath.V3Len(zAxis);
        CMath.V3Nor(xAxis, xAxis);
        CMath.V3Nor(yAxis, yAxis);
        CMath.V3Nor(zAxis, zAxis);
        let localCenter = _boundB.GetCenter();
        let center = new CVec3();
        CMath.V3MulMatCoordi(localCenter, _matB, center);
        let halfSize = new CVec3();
        _boundB.GetSize(halfSize);
        halfSize.x *= 0.5 * scaX;
        halfSize.y *= 0.5 * scaY;
        halfSize.z *= 0.5 * scaZ;
        let d = new CVec3();
        CMath.V3SubV3(_posA, center, d);
        let cx = CMath.Max(CMath.Min(CMath.V3Dot(d, xAxis), halfSize.x), -halfSize.x);
        let cy = CMath.Max(CMath.Min(CMath.V3Dot(d, yAxis), halfSize.y), -halfSize.y);
        let cz = CMath.Max(CMath.Min(CMath.V3Dot(d, zAxis), halfSize.z), -halfSize.z);
        let closestPoint = new CVec3(center.x, center.y, center.z);
        CMath.V3AddV3(closestPoint, CMath.V3MulFloat(xAxis, cx), closestPoint);
        CMath.V3AddV3(closestPoint, CMath.V3MulFloat(yAxis, cy), closestPoint);
        CMath.V3AddV3(closestPoint, CMath.V3MulFloat(zAxis, cz), closestPoint);
        let v = new CVec3();
        CMath.V3SubV3(_posA, closestPoint, v);
        let dist = CMath.V3Len(v);
        if (dist >= _radiusA)
            return null;
        let penetration = _radiusA - dist;
        let n = new CVec3();
        CMath.V3SubV3(_posA, closestPoint, n);
        if (n.IsZero()) {
            n.x = xAxis.x;
            n.y = xAxis.y;
            n.z = xAxis.z;
        }
        CMath.V3Nor(n, n);
        return CMath.V3MulFloat(n, penetration);
    }
    static ColBoxBoxOBB(_boundA, _matA, _boundB, _matB, _push = null) {
        const a = {
            center: CPoolGeo.ProductV3(),
            axes: [CPoolGeo.ProductV3(), CPoolGeo.ProductV3(), CPoolGeo.ProductV3()],
            extents: CPoolGeo.ProductV3(),
            tmp: CPoolGeo.ProductV3(),
        };
        const b = {
            center: CPoolGeo.ProductV3(),
            axes: [CPoolGeo.ProductV3(), CPoolGeo.ProductV3(), CPoolGeo.ProductV3()],
            extents: CPoolGeo.ProductV3(),
            tmp: CPoolGeo.ProductV3(),
        };
        const t = CPoolGeo.ProductV3();
        const bestAx = CPoolGeo.ProductV3();
        const cross = CPoolGeo.ProductV3();
        const mtv = CPoolGeo.ProductV3();
        const mtvAxW = CPoolGeo.ProductV3();
        const ReturnFun = () => {
            CPoolGeo.RecycleV3(a.center);
            CPoolGeo.RecycleV3(a.axes[0]);
            CPoolGeo.RecycleV3(a.axes[1]);
            CPoolGeo.RecycleV3(a.axes[2]);
            CPoolGeo.RecycleV3(a.extents);
            CPoolGeo.RecycleV3(a.tmp);
            CPoolGeo.RecycleV3(b.center);
            CPoolGeo.RecycleV3(b.axes[0]);
            CPoolGeo.RecycleV3(b.axes[1]);
            CPoolGeo.RecycleV3(b.axes[2]);
            CPoolGeo.RecycleV3(b.extents);
            CPoolGeo.RecycleV3(b.tmp);
            CPoolGeo.RecycleV3(t);
            CPoolGeo.RecycleV3(bestAx);
            CPoolGeo.RecycleV3(cross);
            CPoolGeo.RecycleV3(mtv);
            CPoolGeo.RecycleV3(mtvAxW);
        };
        CMath.V3MulFloat(CMath.V3AddV3(_boundA.mMax, _boundA.mMin, a.tmp), 0.5, a.tmp);
        CMath.V3MulMatCoordi(a.tmp, _matA, a.center);
        _matA.GetV3(0, a.axes[0]);
        _matA.GetV3(1, a.axes[1]);
        _matA.GetV3(2, a.axes[2]);
        _boundA.GetSize(a.extents);
        a.extents.x *= 0.5 * CMath.V3Len(a.axes[0]);
        a.extents.y *= 0.5 * CMath.V3Len(a.axes[1]);
        a.extents.z *= 0.5 * CMath.V3Len(a.axes[2]);
        CMath.V3Nor(a.axes[0], a.axes[0]);
        CMath.V3Nor(a.axes[1], a.axes[1]);
        CMath.V3Nor(a.axes[2], a.axes[2]);
        CMath.V3MulFloat(CMath.V3AddV3(_boundB.mMax, _boundB.mMin, b.tmp), 0.5, b.tmp);
        CMath.V3MulMatCoordi(b.tmp, _matB, b.center);
        _matB.GetV3(0, b.axes[0]);
        _matB.GetV3(1, b.axes[1]);
        _matB.GetV3(2, b.axes[2]);
        _boundB.GetSize(b.extents);
        b.extents.x *= 0.5 * CMath.V3Len(b.axes[0]);
        b.extents.y *= 0.5 * CMath.V3Len(b.axes[1]);
        b.extents.z *= 0.5 * CMath.V3Len(b.axes[2]);
        CMath.V3Nor(b.axes[0], b.axes[0]);
        CMath.V3Nor(b.axes[1], b.axes[1]);
        CMath.V3Nor(b.axes[2], b.axes[2]);
        CMath.V3SubV3(b.center, a.center, t);
        let minOverlap = Infinity;
        const EPS2 = 1e-10;
        const radiusOn = (ext, ax0, ax1, ax2, axis) => ext.x * Math.abs(CMath.V3Dot(axis, ax0)) +
            ext.y * Math.abs(CMath.V3Dot(axis, ax1)) +
            ext.z * Math.abs(CMath.V3Dot(axis, ax2));
        const testAxis = (axis) => {
            const ra = radiusOn(a.extents, a.axes[0], a.axes[1], a.axes[2], axis);
            const rb = radiusOn(b.extents, b.axes[0], b.axes[1], b.axes[2], axis);
            const dist = Math.abs(CMath.V3Dot(t, axis));
            const overlap = ra + rb - dist;
            if (overlap <= 0)
                return false;
            if (overlap < minOverlap) {
                minOverlap = overlap;
                mtvAxW.Import(axis);
                if (CMath.V3Dot(t, mtvAxW) < 0)
                    CMath.V3MulFloat(mtvAxW, -1, mtvAxW);
                bestAx.Import(mtvAxW);
            }
            return true;
        };
        if (!testAxis(a.axes[0])) {
            ReturnFun();
            return null;
        }
        if (!testAxis(a.axes[1])) {
            ReturnFun();
            return null;
        }
        if (!testAxis(a.axes[2])) {
            ReturnFun();
            return null;
        }
        if (!testAxis(b.axes[0])) {
            ReturnFun();
            return null;
        }
        if (!testAxis(b.axes[1])) {
            ReturnFun();
            return null;
        }
        if (!testAxis(b.axes[2])) {
            ReturnFun();
            return null;
        }
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                CMath.V3Cross(a.axes[i], b.axes[j], cross);
                if (CMath.V3Dot(cross, cross) <= EPS2)
                    continue;
                CMath.V3Nor(cross, cross);
                if (!testAxis(cross)) {
                    ReturnFun();
                    return null;
                }
            }
        }
        CMath.V3MulFloat(bestAx, minOverlap, mtv);
        const out = _push || new CVec3();
        out.Import(mtv);
        ReturnFun();
        return out;
    }
    static ColBoxBoxAABB(_boundA, _matA, _boundB, _matB, _push = null) {
        const aMin = _boundA.mMin;
        const aMax = _boundA.mMax;
        const bMin = _boundB.mMin;
        const bMax = _boundB.mMax;
        const aLocalCx = (aMin.x + aMax.x) * 0.5;
        const aLocalCy = (aMin.y + aMax.y) * 0.5;
        const aLocalCz = (aMin.z + aMax.z) * 0.5;
        const bLocalCx = (bMin.x + bMax.x) * 0.5;
        const bLocalCy = (bMin.y + bMax.y) * 0.5;
        const bLocalCz = (bMin.z + bMax.z) * 0.5;
        const aLocalHx = (aMax.x - aMin.x) * 0.5;
        const aLocalHy = (aMax.y - aMin.y) * 0.5;
        const aLocalHz = (aMax.z - aMin.z) * 0.5;
        const bLocalHx = (bMax.x - bMin.x) * 0.5;
        const bLocalHy = (bMax.y - bMin.y) * 0.5;
        const bLocalHz = (bMax.z - bMin.z) * 0.5;
        const mA = _matA.mF32A;
        const mB = _matB.mF32A;
        const aSx = mA[0];
        const aSy = mA[5];
        const aSz = mA[10];
        const bSx = mB[0];
        const bSy = mB[5];
        const bSz = mB[10];
        const aHx = Math.abs(aSx) * aLocalHx;
        const aHy = Math.abs(aSy) * aLocalHy;
        const aHz = Math.abs(aSz) * aLocalHz;
        const bHx = Math.abs(bSx) * bLocalHx;
        const bHy = Math.abs(bSy) * bLocalHy;
        const bHz = Math.abs(bSz) * bLocalHz;
        const aCx = mA[12] + aLocalCx * aSx;
        const aCy = mA[13] + aLocalCy * aSy;
        const aCz = mA[14] + aLocalCz * aSz;
        const bCx = mB[12] + bLocalCx * bSx;
        const bCy = mB[13] + bLocalCy * bSy;
        const bCz = mB[14] + bLocalCz * bSz;
        const tx = bCx - aCx;
        const ty = bCy - aCy;
        const tz = bCz - aCz;
        if (Math.abs(tx) >= aHx + bHx)
            return null;
        if (Math.abs(ty) >= aHy + bHy)
            return null;
        if (Math.abs(tz) >= aHz + bHz)
            return null;
        const overlapX = aHx + bHx - Math.abs(tx);
        const overlapY = aHy + bHy - Math.abs(ty);
        const overlapZ = aHz + bHz - Math.abs(tz);
        let minOverlap = overlapX;
        let axis = 0;
        let sign = (tx >= 0) ? 1 : -1;
        if (overlapY < minOverlap) {
            minOverlap = overlapY;
            axis = 1;
            sign = (ty >= 0) ? 1 : -1;
        }
        if (overlapZ < minOverlap) {
            minOverlap = overlapZ;
            axis = 2;
            sign = (tz >= 0) ? 1 : -1;
        }
        const out = _push || new CVec3();
        out.x = 0;
        out.y = 0;
        out.z = 0;
        if (axis === 0) {
            out.x = minOverlap * sign;
        }
        else if (axis === 1) {
            out.y = minOverlap * sign;
        }
        else {
            out.z = minOverlap * sign;
        }
        return out;
    }
    static ColBoxTriMesh(_boundA, _matA, _boundB, _matB, _push = null, _moveDir = null) {
        const posList = _boundB.mPos;
        const triCount = Math.floor(posList.Size() / 3);
        if (triCount == 0)
            return null;
        const flat = TriFlatCache(_boundB, triCount);
        const mA = _matA.mF32A;
        const mB = _matB.mF32A;
        let u0x = mA[0], u0y = mA[1], u0z = mA[2];
        let u1x = mA[4], u1y = mA[5], u1z = mA[6];
        let u2x = mA[8], u2y = mA[9], u2z = mA[10];
        const s0 = Math.sqrt(u0x * u0x + u0y * u0y + u0z * u0z);
        const s1 = Math.sqrt(u1x * u1x + u1y * u1y + u1z * u1z);
        const s2 = Math.sqrt(u2x * u2x + u2y * u2y + u2z * u2z);
        if (s0 <= 0 || s1 <= 0 || s2 <= 0)
            return null;
        u0x /= s0;
        u0y /= s0;
        u0z /= s0;
        u1x /= s1;
        u1y /= s1;
        u1z /= s1;
        u2x /= s2;
        u2y /= s2;
        u2z /= s2;
        const aMin = _boundA.mMin, aMax = _boundA.mMax;
        const ex = (aMax.x - aMin.x) * 0.5 * s0;
        const ey = (aMax.y - aMin.y) * 0.5 * s1;
        const ez = (aMax.z - aMin.z) * 0.5 * s2;
        const alcx = (aMin.x + aMax.x) * 0.5;
        const alcy = (aMin.y + aMax.y) * 0.5;
        const alcz = (aMin.z + aMax.z) * 0.5;
        const cx = mA[0] * alcx + mA[4] * alcy + mA[8] * alcz + mA[12];
        const cy = mA[1] * alcx + mA[5] * alcy + mA[9] * alcz + mA[13];
        const cz = mA[2] * alcx + mA[6] * alcy + mA[10] * alcz + mA[14];
        const bs0 = Math.sqrt(mB[0] * mB[0] + mB[1] * mB[1] + mB[2] * mB[2]);
        const bs1 = Math.sqrt(mB[4] * mB[4] + mB[5] * mB[5] + mB[6] * mB[6]);
        const bs2 = Math.sqrt(mB[8] * mB[8] + mB[9] * mB[9] + mB[10] * mB[10]);
        const bScaMin = Math.min(bs0, Math.min(bs1, bs2));
        if (bScaMin <= 0)
            return null;
        const iMat = CPoolGeo.ProductMat();
        CMath.MatInvert(_matB, iMat);
        const mI = iMat.mF32A;
        const lcx = mI[0] * cx + mI[4] * cy + mI[8] * cz + mI[12];
        const lcy = mI[1] * cx + mI[5] * cy + mI[9] * cz + mI[13];
        const lcz = mI[2] * cx + mI[6] * cy + mI[10] * cz + mI[14];
        CPoolGeo.RecycleMat(iMat);
        const lr = Math.sqrt(ex * ex + ey * ey + ez * ez) / bScaMin;
        const pMinX = lcx - lr, pMaxX = lcx + lr;
        const pMinY = lcy - lr, pMaxY = lcy + lr;
        const pMinZ = lcz - lr, pMaxZ = lcz + lr;
        let v0x = 0, v0y = 0, v0z = 0;
        let v1x = 0, v1y = 0, v1z = 0;
        let v2x = 0, v2y = 0, v2z = 0;
        let mvx = 0, mvy = 0, mvz = 0;
        if (_moveDir != null) {
            mvx = _moveDir.x;
            mvy = _moveDir.y;
            mvz = _moveDir.z;
        }
        let bestPen = 0, bestX = 0, bestY = 0, bestZ = 0;
        const TestAxis = (_axx, _axy, _axz) => {
            const len2 = _axx * _axx + _axy * _axy + _axz * _axz;
            if (len2 <= 1e-12)
                return true;
            const inv = 1 / Math.sqrt(len2);
            const nx = _axx * inv, ny = _axy * inv, nz = _axz * inv;
            const r = ex * Math.abs(nx * u0x + ny * u0y + nz * u0z)
                + ey * Math.abs(nx * u1x + ny * u1y + nz * u1z)
                + ez * Math.abs(nx * u2x + ny * u2y + nz * u2z);
            const d0 = v0x * nx + v0y * ny + v0z * nz;
            const d1 = v1x * nx + v1y * ny + v1z * nz;
            const d2 = v2x * nx + v2y * ny + v2z * nz;
            const tMin = Math.min(d0, Math.min(d1, d2));
            const tMax = Math.max(d0, Math.max(d1, d2));
            const pen1 = r - tMin;
            const pen2 = tMax + r;
            if (pen1 <= 0 || pen2 <= 0)
                return false;
            const prevC = -(mvx * nx + mvy * ny + mvz * nz);
            let useMinus;
            if (prevC <= tMin)
                useMinus = true;
            else if (prevC >= tMax)
                useMinus = false;
            else
                useMinus = (pen1 < pen2);
            const pen = useMinus ? pen1 : pen2;
            if (bestPen == 0 || pen < bestPen) {
                bestPen = pen;
                if (useMinus) {
                    bestX = -nx;
                    bestY = -ny;
                    bestZ = -nz;
                }
                else {
                    bestX = nx;
                    bestY = ny;
                    bestZ = nz;
                }
            }
            return true;
        };
        const ua = [u0x, u0y, u0z, u1x, u1y, u1z, u2x, u2y, u2z];
        const ea = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        let outX = 0, outY = 0, outZ = 0;
        let hit = false;
        for (let t = 0; t < triCount; ++t) {
            const f = t * 9;
            const a0 = flat[f], a1 = flat[f + 1], a2 = flat[f + 2];
            const b0 = flat[f + 3], b1 = flat[f + 4], b2 = flat[f + 5];
            const c0 = flat[f + 6], c1 = flat[f + 7], c2 = flat[f + 8];
            if (a0 < pMinX && b0 < pMinX && c0 < pMinX)
                continue;
            if (a0 > pMaxX && b0 > pMaxX && c0 > pMaxX)
                continue;
            if (a1 < pMinY && b1 < pMinY && c1 < pMinY)
                continue;
            if (a1 > pMaxY && b1 > pMaxY && c1 > pMaxY)
                continue;
            if (a2 < pMinZ && b2 < pMinZ && c2 < pMinZ)
                continue;
            if (a2 > pMaxZ && b2 > pMaxZ && c2 > pMaxZ)
                continue;
            v0x = mB[0] * a0 + mB[4] * a1 + mB[8] * a2 + mB[12] - cx;
            v0y = mB[1] * a0 + mB[5] * a1 + mB[9] * a2 + mB[13] - cy;
            v0z = mB[2] * a0 + mB[6] * a1 + mB[10] * a2 + mB[14] - cz;
            v1x = mB[0] * b0 + mB[4] * b1 + mB[8] * b2 + mB[12] - cx;
            v1y = mB[1] * b0 + mB[5] * b1 + mB[9] * b2 + mB[13] - cy;
            v1z = mB[2] * b0 + mB[6] * b1 + mB[10] * b2 + mB[14] - cz;
            v2x = mB[0] * c0 + mB[4] * c1 + mB[8] * c2 + mB[12] - cx;
            v2y = mB[1] * c0 + mB[5] * c1 + mB[9] * c2 + mB[13] - cy;
            v2z = mB[2] * c0 + mB[6] * c1 + mB[10] * c2 + mB[14] - cz;
            ea[0] = v1x - v0x;
            ea[1] = v1y - v0y;
            ea[2] = v1z - v0z;
            ea[3] = v2x - v1x;
            ea[4] = v2y - v1y;
            ea[5] = v2z - v1z;
            ea[6] = v0x - v2x;
            ea[7] = v0y - v2y;
            ea[8] = v0z - v2z;
            bestPen = 0;
            const fnx = ea[1] * ea[5] - ea[2] * ea[4];
            const fny = ea[2] * ea[3] - ea[0] * ea[5];
            const fnz = ea[0] * ea[4] - ea[1] * ea[3];
            if (TestAxis(fnx, fny, fnz) == false)
                continue;
            if (TestAxis(u0x, u0y, u0z) == false)
                continue;
            if (TestAxis(u1x, u1y, u1z) == false)
                continue;
            if (TestAxis(u2x, u2y, u2z) == false)
                continue;
            let sep = false;
            for (let i = 0; i < 3 && sep == false; ++i) {
                const aix = ua[i * 3], aiy = ua[i * 3 + 1], aiz = ua[i * 3 + 2];
                for (let j = 0; j < 3; ++j) {
                    const ejx = ea[j * 3], ejy = ea[j * 3 + 1], ejz = ea[j * 3 + 2];
                    if (TestAxis(aiy * ejz - aiz * ejy, aiz * ejx - aix * ejz, aix * ejy - aiy * ejx) == false) {
                        sep = true;
                        break;
                    }
                }
            }
            if (sep)
                continue;
            if (bestPen <= 0)
                continue;
            const sx = bestX * bestPen, sy = bestY * bestPen, sz = bestZ * bestPen;
            hit = true;
            const sl = Math.sqrt(sx * sx + sy * sy + sz * sz);
            if (sl > 1e-9) {
                const ux = sx / sl, uy = sy / sl, uz = sz / sl;
                const remain = sl - (outX * ux + outY * uy + outZ * uz);
                if (remain > 0) {
                    outX += ux * remain;
                    outY += uy * remain;
                    outZ += uz * remain;
                }
            }
        }
        if (hit == false)
            return null;
        const out = _push || new CVec3();
        out.x = -outX;
        out.y = -outY;
        out.z = -outZ;
        return out;
    }
    static Grad(_hash, _x, _y) {
        return ((_hash & 1) == 0 ? _x : -_x) + ((_hash & 2) == 0 ? _y : -_y);
    }
    static perm = [
        151, 160, 137, 91, 90, 15,
        131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
        190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
        88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
        77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
        102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
        135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
        5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
        223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
        129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
        251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
        49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
        138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
        151
    ];
    static Noise(_x, _y) {
        var X = Math.floor(_x) & 0xff;
        var Y = Math.floor(_y) & 0xff;
        _x -= Math.floor(_x);
        _y -= Math.floor(_y);
        var u = _x * _x * _x * (_x * (_x * 6 - 15) + 10);
        var v = _y * _y * _y * (_y * (_y * 6 - 15) + 10);
        var A = (this.perm[X] + Y) & 0xff;
        var B = (this.perm[X + 1] + Y) & 0xff;
        var r = CMath.FloatInterpolate(CMath.FloatInterpolate(this.Grad(this.perm[A], _x, _y), this.Grad(this.perm[B], _x - 1, _y), u), CMath.FloatInterpolate(this.Grad(this.perm[A + 1], _x, _y - 1), this.Grad(this.perm[B + 1], _x - 1, _y - 1), u), v);
        return (1 + r) / 2;
    }
    static ClosesetPointOnPlane(_planeNor, _planeDis, _point) {
        let dis = CMath.V3Dot(_planeNor, _point) + _planeDis;
        return CMath.V3SubV3(_point, CMath.V3MulFloat(_planeNor, dis));
    }
    static WeightVec3(pa_vec, pa_persent) {
        if (pa_vec.length == 1)
            return pa_vec[0];
        if (Math.trunc(pa_persent) >= 1)
            return pa_vec[pa_vec.length - 1];
        if (pa_persent < 0.00001)
            pa_persent = 0;
        var w = (pa_vec.length - 1) * pa_persent;
        var s = Math.trunc(w);
        var e = Math.min(s + 1, pa_vec.length - 1);
        var p = w % 1;
        var t0 = CPoolGeo.ProductV3();
        var t1 = CPoolGeo.ProductV3();
        CMath.V3MulFloat(pa_vec[s], 1 - p, t0);
        CMath.V3MulFloat(pa_vec[e], p, t1);
        var v = CMath.V3AddV3(t0, t1);
        CPoolGeo.RecycleV3(t0);
        CPoolGeo.RecycleV3(t1);
        return v;
    }
    static CubeVec3InLen(_bound, _posVec3) {
        let radV3 = CPoolGeo.ProductV3();
        let cuberad = CMath.V3MulFloat(_bound.GetSize(), 0.5);
        radV3.x = CMath.RadianToDegree(Math.atan2(CMath.Abs(_posVec3.x), CMath.V3Len(new CVec3(0, CMath.Abs(_posVec3.y), CMath.Abs(_posVec3.z)))));
        radV3.y = CMath.RadianToDegree(Math.atan2(CMath.Abs(_posVec3.y), CMath.V3Len(new CVec3(CMath.Abs(_posVec3.x), 0, CMath.Abs(_posVec3.z)))));
        radV3.z = CMath.RadianToDegree(Math.atan2(CMath.Abs(_posVec3.z), CMath.V3Len(new CVec3(CMath.Abs(_posVec3.x), CMath.Abs(_posVec3.y), 0))));
        let len = CMath.V3Len(new CVec3(Math.sin(CMath.DegreeToRadian(radV3.x)) * cuberad.x, Math.sin(CMath.DegreeToRadian(radV3.y)) * cuberad.y, Math.sin(CMath.DegreeToRadian(radV3.z)) * cuberad.z));
        CPoolGeo.RecycleV3(radV3);
        return len;
    }
}
class CTriFlat {
    flat;
    triCount;
    sample;
}
const gTriFlatMap = new WeakMap();
function TriFlatSample(_list, _triCount, _out) {
    const last = _triCount * 3 - 1;
    const idx = [0, 1, (last >> 1), last];
    for (let k = 0; k < 4; ++k) {
        const p = _list.Find(idx[k]).mF32A;
        _out[k * 3] = p[0];
        _out[k * 3 + 1] = p[1];
        _out[k * 3 + 2] = p[2];
    }
}
function TriFlatCache(_bound, _triCount) {
    const list = _bound.mPos;
    let c = gTriFlatMap.get(_bound);
    if (c != null && c.triCount == _triCount) {
        const s = gTriFlatTmp;
        TriFlatSample(list, _triCount, s);
        let same = true;
        for (let k = 0; k < 12; ++k) {
            if (s[k] != c.sample[k]) {
                same = false;
                break;
            }
        }
        if (same)
            return c.flat;
    }
    if (c == null) {
        c = new CTriFlat();
        gTriFlatMap.set(_bound, c);
    }
    c.triCount = _triCount;
    c.flat = new Float64Array(_triCount * 9);
    for (let t = 0; t < _triCount; ++t) {
        for (let j = 0; j < 3; ++j) {
            const p = list.Find(t * 3 + j).mF32A;
            const o = t * 9 + j * 3;
            c.flat[o] = p[0];
            c.flat[o + 1] = p[1];
            c.flat[o + 2] = p[2];
        }
    }
    c.sample = new Float64Array(12);
    TriFlatSample(list, _triCount, c.sample);
    return c.flat;
}
const gTriFlatTmp = new Float64Array(12);

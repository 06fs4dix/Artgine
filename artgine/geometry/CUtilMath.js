import { CWASM } from "../basic/CWASM.js";
import { CMat } from "./CMat.js";
import { CMath } from "./CMath.js";
import { CPlane } from "./CPlane.js";
import { CPlaneInside } from "./CPlaneInside.js";
import { CPoolGeo } from "./CPoolGeo.js";
import { CVec3 } from "./CVec3.js";
const RayBoxRIGHT = 0;
const RayBoxLEFT = 1;
const RayBoxMIDDLE = 2;
const d_EPSILON = 1e-6;
const _rbi_quadrant = new CVec3();
const _rbi_maxT = new CVec3();
const _rbi_candidatePlane = new CVec3();
const _rbi_pOrigin = new CVec3();
const _rbi_pBoxMin = new CVec3();
const _rbi_pBoxMax = new CVec3();
const _rbi_pIntersect = new CVec3();
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
        result.mF32A[10] = -q;
        result.mF32A[11] = 1.0;
        result.mF32A[14] = q * znear;
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
        const quadrant = _rbi_quadrant;
        const maxT = _rbi_maxT;
        const candidatePlane = _rbi_candidatePlane;
        const pIntersect = _rbi_pIntersect;
        const vecList = pa_ray.GetVecList();
        const pOrigin = _rbi_pOrigin;
        const pBoxMin = _rbi_pBoxMin;
        const pBoxMax = _rbi_pBoxMax;
        pOrigin.Import(vecList[2]);
        pBoxMin.Import(_min);
        pBoxMax.Import(_max);
        const dir = vecList[0];
        if (pBoxMin.mF32A[0] > pBoxMax.mF32A[0]) {
            pBoxMin.mF32A[0] = _max.mF32A[0];
            pBoxMax.mF32A[0] = _min.mF32A[0];
        }
        if (pBoxMin.mF32A[1] > pBoxMax.mF32A[1]) {
            pBoxMin.mF32A[1] = _max.mF32A[1];
            pBoxMax.mF32A[1] = _min.mF32A[1];
        }
        if (pBoxMin.mF32A[2] > pBoxMax.mF32A[2]) {
            pBoxMin.mF32A[2] = _max.mF32A[2];
            pBoxMax.mF32A[2] = _min.mF32A[2];
        }
        let inside = true;
        for (let i = 0; i < 3; ++i) {
            if (pOrigin.mF32A[i] < pBoxMin.mF32A[i]) {
                quadrant.mF32A[i] = RayBoxLEFT;
                candidatePlane.mF32A[i] = pBoxMin.mF32A[i];
                inside = false;
            }
            else if (pOrigin.mF32A[i] > pBoxMax.mF32A[i]) {
                quadrant.mF32A[i] = RayBoxRIGHT;
                candidatePlane.mF32A[i] = pBoxMax.mF32A[i];
                inside = false;
            }
            else {
                quadrant.mF32A[i] = RayBoxMIDDLE;
            }
        }
        if (inside) {
            pa_ray.mVec3List[1].mF32A[0] = pOrigin.mF32A[0];
            pa_ray.mVec3List[1].mF32A[1] = pOrigin.mF32A[1];
            pa_ray.mVec3List[1].mF32A[2] = pOrigin.mF32A[2];
            return true;
        }
        for (let i = 0; i < 3; i++) {
            if (quadrant.mF32A[i] !== RayBoxMIDDLE
                && (dir.mF32A[i] > d_EPSILON || dir.mF32A[i] < -d_EPSILON))
                maxT.mF32A[i] = (candidatePlane.mF32A[i] - pOrigin.mF32A[i]) / dir.mF32A[i];
            else
                maxT.mF32A[i] = -1.0;
        }
        let whichPlane = 0;
        if (maxT.mF32A[1] > maxT.mF32A[0])
            whichPlane = 1;
        if (maxT.mF32A[2] > maxT.mF32A[whichPlane])
            whichPlane = 2;
        if (maxT.mF32A[whichPlane] < 0.0)
            return false;
        for (let i = 0; i < 3; i++) {
            if (whichPlane !== i) {
                pIntersect.mF32A[i] = pOrigin.mF32A[i] + maxT.mF32A[whichPlane] * dir.mF32A[i];
                if (pIntersect.mF32A[i] < pBoxMin.mF32A[i] || pIntersect.mF32A[i] > pBoxMax.mF32A[i])
                    return false;
            }
            else {
                pIntersect.mF32A[i] = candidatePlane.mF32A[i];
            }
        }
        pa_ray.mVec3List[1].mF32A[0] = pIntersect.mF32A[0];
        pa_ray.mVec3List[1].mF32A[1] = pIntersect.mF32A[1];
        pa_ray.mVec3List[1].mF32A[2] = pIntersect.mF32A[2];
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
        var e = Math.trunc((w + 1));
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

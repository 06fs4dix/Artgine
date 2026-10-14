import { CConsol } from "../basic/CConsol.js";
import {CWASM} from "../basic/CWASM.js";
import {CBound} from "./CBound.js";
import {CMat} from "./CMat.js";
import {CMath} from "./CMath.js";
import {CPlane} from "./CPlane.js";
import {CPlaneInside} from "./CPlaneInside.js";
import {CPoolGeo} from "./CPoolGeo.js";
import { CRay } from "./CRay.js";
import {CVec3} from "./CVec3.js";
import {CVec4} from "./CVec4.js";
const d_EPSILON = 1e-6;



export class CUtilMath
{
    
    static CameraPerspectiveFovLH(fov, aspect, znear, zfar,_width,result=new CMat()) 
    {
        var yScale = (1.0 / Math.tan(fov * 0.5));
        var q = zfar / (zfar - znear);
  
        result.SetUnit(false);
        if(_width)
        {
            result.mF32A[0] = yScale / aspect;
            result.mF32A[5] = yScale;
        }
        else
        {
            result.mF32A[0] = yScale;
            result.mF32A[5] = yScale / aspect;
        }
        result.mF32A[10] = q;
        result.mF32A[11] = 1.0;
        result.mF32A[14] = -q * znear;
        return result;
    }
    static CameraPerspectiveFovLH_ReverseZ(fov, aspect, znear, zfar,_width,result=new CMat()) 
    {
        var yScale = (1.0 / Math.tan(fov * 0.5));
        var q = znear / (znear - zfar);
  
        result.SetUnit(false);
        if(_width)
        {
            result.mF32A[0] = yScale / aspect;
            result.mF32A[5] = yScale;
        }
        else
        {
            result.mF32A[0] = yScale;
            result.mF32A[5] = yScale / aspect;
        }
        result.mF32A[10] = q;
        result.mF32A[11] = 1.0;
        result.mF32A[14] = -q * zfar;
        return result;
    }
    static CameraPerspectiveFovRH(fov, aspect, znear, zfar,_width,result=new CMat()) 
    {
        var yScale = (1.0 / Math.tan(fov * 0.5));
        var q = zfar / (znear-zfar);
        //var result = new CMat();
        result.SetUnit(false);
        if(_width)
        {
            result.mF32A[0] = yScale / aspect;
            result.mF32A[5] = yScale;
        }
        else
        {
            result.mF32A[0] = yScale;
            result.mF32A[5] = yScale / aspect;
        }
        
        result.mF32A[10] = q;
        result.mF32A[11] = -1.0;
        result.mF32A[14] = q * znear;
        return result;
    }
    static CameraPerspectiveFovRH_ReverseZ(fov, aspect, znear, zfar,_width,result=new CMat()) 
    {
        var yScale = (1.0 / Math.tan(fov * 0.5));
        var q = znear / (zfar-znear);
        
        result.SetUnit(false);
        if(_width)
        {
            result.mF32A[0] = yScale / aspect;
            result.mF32A[5] = yScale;
        }
        else
        {
            result.mF32A[0] = yScale;
            result.mF32A[5] = yScale / aspect;
        }
        
        result.mF32A[10] = q;
        result.mF32A[11] = -1.0;
        result.mF32A[14] = q * zfar;
        return result;
    }

    static CameraOrthoLH(width, height, zn, zf,result=new CMat())	//직교투영
    {
        //var projMat=new CMat();
        result.SetUnit(false);
        result.mF32A[0] = 2 / width; result.mF32A[1] = 0; result.mF32A[2] = 0; result.mF32A[3] = 0;
        result.mF32A[4] = 0; result.mF32A[5] = 2 / height; result.mF32A[6] = 0; result.mF32A[7] = 0;
        result.mF32A[8] = 0; result.mF32A[9] = 0; result.mF32A[10] = 1 / (zn - zf); result.mF32A[11] = 0;
        result.mF32A[12] = 0; result.mF32A[13] = 0; result.mF32A[14] = -zf / (zn - zf); result.mF32A[15] = 1;
    
        return result;
    }
    static CameraOrthoLH_ReverseZ(width, height, zn, zf,result=new CMat())	//직교투영
    {
        //var projMat=new CMat();
        result.SetUnit(false);
        result.mF32A[0] = 2 / width; result.mF32A[1] = 0; result.mF32A[2] = 0; result.mF32A[3] = 0;
        result.mF32A[4] = 0; result.mF32A[5] = 2 / height; result.mF32A[6] = 0; result.mF32A[7] = 0;
        result.mF32A[8] = 0; result.mF32A[9] = 0; result.mF32A[10] = 1 / (zf - zn); result.mF32A[11] = 0;
        result.mF32A[12] = 0; result.mF32A[13] = 0; result.mF32A[14] = -zn / (zf - zn); result.mF32A[15] = 1;
    
        return result;
    }
    static CameraOrthoRH(width, height, zn, zf,result=new CMat())	//직교투영
    {
        
        result.SetUnit(false);
        result.mF32A[0] = 2 / width; result.mF32A[1] = 0; result.mF32A[2] = 0; result.mF32A[3] = 0;
        result.mF32A[4] = 0; result.mF32A[5] = 2 / height; result.mF32A[6] = 0; result.mF32A[7] = 0;
        result.mF32A[8] = 0; result.mF32A[9] = 0; result.mF32A[10] = 1 / (zn - zf); result.mF32A[11] = 0;
        result.mF32A[12] = 0; result.mF32A[13] = 0; result.mF32A[14] = zn / (zn - zf); result.mF32A[15] = 1;
    
        return result;
    }
    static CameraOrthoRH_ReverseZ(width, height, zn, zf,result=new CMat())	//직교투영
    {
        
        result.SetUnit(false);
        result.mF32A[0] = 2 / width; result.mF32A[1] = 0; result.mF32A[2] = 0; result.mF32A[3] = 0;
        result.mF32A[4] = 0; result.mF32A[5] = 2 / height; result.mF32A[6] = 0; result.mF32A[7] = 0;
        result.mF32A[8] = 0; result.mF32A[9] = 0; result.mF32A[10] = 1 / (zf - zn); result.mF32A[11] = 0;
        result.mF32A[12] = 0; result.mF32A[13] = 0; result.mF32A[14] = zf / (zf - zn); result.mF32A[15] = 1;
    
        return result;
    }
    static CameraLookAtLH(eyeVec : CVec3,lookVec : CVec3,upVec : CVec3,viewMat=new CMat())	//뷰행렬생성
    {
        
        viewMat.SetUnit(false);
        
        let Zaxis=CPoolGeo.ProductV3();
        CMath.V3SubV3(lookVec,eyeVec,Zaxis);
        CMath.V3Nor(Zaxis,Zaxis);

        let Xaxis=CPoolGeo.ProductV3();
        CMath.V3Cross(upVec, Zaxis,Xaxis);
        if (Xaxis.IsZero())
        {
            Xaxis.mF32A[0]=1;Xaxis.mF32A[1]=0;Xaxis.mF32A[2]=0;
        }
        CMath.V3Nor(Xaxis,Xaxis);

        let Yaxis=CPoolGeo.ProductV3();
        Yaxis=CMath.V3Cross(Zaxis, Xaxis,Yaxis);

        viewMat.mF32A[0] = Xaxis.x; viewMat.mF32A[1] = Yaxis.x; viewMat.mF32A[2] = Zaxis.x; viewMat.mF32A[3] = 0;
        viewMat.mF32A[4] = Xaxis.y; viewMat.mF32A[5] = Yaxis.y; viewMat.mF32A[6] = Zaxis.y; viewMat.mF32A[7] = 0;
        viewMat.mF32A[8] = Xaxis.z; viewMat.mF32A[9] = Yaxis.z; viewMat.mF32A[10] = Zaxis.z; viewMat.mF32A[11] = 0;
    
        viewMat.mF32A[12] = -CMath.V3Dot(Xaxis, eyeVec);
        viewMat.mF32A[13] = -CMath.V3Dot(Yaxis, eyeVec);
        viewMat.mF32A[14] = -CMath.V3Dot(Zaxis, eyeVec);
        viewMat.mF32A[15] = 1;
    
        CPoolGeo.RecycleV3(Xaxis);
        CPoolGeo.RecycleV3(Yaxis);
        CPoolGeo.RecycleV3(Zaxis);

        return viewMat;
    }
    static CameraLookAtRH(eyeVec : CVec3,lookVec : CVec3,upVec : CVec3,viewMat=new CMat())	//뷰행렬생성
    {
        
        viewMat.SetUnit(false);
        let Zaxis=CPoolGeo.ProductV3();
        CMath.V3SubV3(eyeVec,lookVec,Zaxis);
        CMath.V3Nor(Zaxis,Zaxis);
        let Xaxis=CPoolGeo.ProductV3();
        CMath.V3Cross(upVec, Zaxis,Xaxis);
        if (Xaxis.IsZero())
        {
            Xaxis.mF32A[0]=1;Xaxis.mF32A[1]=0;Xaxis.mF32A[2]=0;
        }
        CMath.V3Nor(Xaxis,Xaxis);
        let Yaxis=CPoolGeo.ProductV3();
        Yaxis=CMath.V3Cross(Zaxis, Xaxis,Yaxis);
        viewMat.mF32A[0] = Xaxis.x; viewMat.mF32A[1] = Yaxis.x; viewMat.mF32A[2] = Zaxis.x; viewMat.mF32A[3] = 0;
        viewMat.mF32A[4] = Xaxis.y; viewMat.mF32A[5] = Yaxis.y; viewMat.mF32A[6] = Zaxis.y; viewMat.mF32A[7] = 0;
        viewMat.mF32A[8] = Xaxis.z; viewMat.mF32A[9] = Yaxis.z; viewMat.mF32A[10] = Zaxis.z; viewMat.mF32A[11] = 0;
    
        viewMat.mF32A[12] = -CMath.V3Dot(Xaxis, eyeVec);
        viewMat.mF32A[13] = -CMath.V3Dot(Yaxis, eyeVec);
        viewMat.mF32A[14] = -CMath.V3Dot(Zaxis, eyeVec);
        viewMat.mF32A[15] = 1;
    
        CPoolGeo.RecycleV3(Xaxis);
        CPoolGeo.RecycleV3(Yaxis);
        CPoolGeo.RecycleV3(Zaxis);
        return viewMat;
    }
    static RayTriangleIS(pa_one : CVec3,pa_two : CVec3,pa_three : CVec3, pa_ray,pa_ccw=true)//IS -> Intersection
    {
        var pvec=new CVec3();
        var tvec=new CVec3();
        var qvec=new CVec3();
        var det=0,u=0,v=0,dist=0;
        var edge1=CMath.V3SubV3(pa_two, pa_one);
        var edge2=CMath.V3SubV3(pa_three, pa_one);
    
        var L_dir=CMath.V3SubV3(pa_ray.GetOriginal(), pa_one);
        if (L_dir.x == 0 && L_dir.y == 0 && L_dir.z == 0)
        {
            return true;
        }
        else
        {
            CMath.V3Nor(L_dir,L_dir);
            det = CMath.V3Dot(L_dir, CMath.V3MulFloat(pa_ray.GetDirect(), -1));
            if (det < 0 && pa_ccw)
            {
    
                return false;
            }
        }
        CMath.V3Cross(pa_ray.GetDirect(), edge2,pvec);
        det = CMath.V3Dot(edge1, pvec);
        if (det > 0)
        {
            CMath.V3SubV3(pa_ray.GetOriginal(), pa_one,tvec);
        }
        else//이부분 에서 컬링 설정을 할수 있다!
        {
            CMath.V3SubV3(pa_one, pa_ray.GetOriginal(),tvec);
            det = -det;
            //L_back=true;
            if (pa_ccw)
            {
                return false;
            }
        }
    
    
        if (det < 0.000001)
        {
            return false;
        }
    
        u = CMath.V3Dot(tvec, pvec);
        if (u < 0.0 || u > det)
        {
            return false;
        }
    
        CMath.V3Cross(tvec, edge1,qvec);
        v = CMath.V3Dot(pa_ray.GetDirect(), qvec);
        if (v < 0.0 || u + v > det)
        {
            return false;
        }
    
        dist = CMath.V3Dot(edge2, qvec);
        dist *= (1.0 / det);
        //*pa_dist = dist;
        
        var sum=CMath.V3MulFloat(pa_ray.GetDirect(), dist);
        CMath.V3AddV3(pa_ray.GetOriginal(),sum,sum);
        pa_ray.SetPosition(sum);
        
        return true;
    }

    // 레이-AABB 교차 (슬랩 방식). 벡터 복사/정적 객체 없이 지역 number만 사용한다.
    // ⚠ ASM 미러가 있다: big/artgine/wasm/geometry/ASMCMath.ts의 RayBoxIS와 같은 알고리즘으로
    //   맞춰 둔 것이니, 한쪽만 고치지 말고 항상 양쪽을 같이 바꾼다.
    // 판정 결과와 pa_ray.mVec3List[1](충돌점)에 기록되는 값은 이전 Woo 방식과 동일:
    //  - 원점이 박스 내부 → true, 충돌점 = 원점
    //  - 박스가 레이 뒤쪽 / 빗나감 → false
    //  - 그 외 → true, 충돌점 = 박스 진입점
    static RayBoxIS(_min: CVec3, _max: CVec3, pa_ray: CRay)
    {
        const vl = pa_ray.mVec3List;
        const d  = vl[0].mF32A;
        const o  = vl[2].mF32A;
        const a  = _min.mF32A;
        const b  = _max.mF32A;

        let tmin = -Infinity, tmax = Infinity;
        let dv: number, ov: number, lo: number, hi: number, t1: number, t2: number, tmp: number;

        // X
        dv = d[0]; ov = o[0]; lo = a[0]; hi = b[0];
        if (lo > hi) { tmp = lo; lo = hi; hi = tmp; }
        if (dv > d_EPSILON || dv < -d_EPSILON)
        {
            t1 = (lo - ov) / dv; t2 = (hi - ov) / dv;
            if (t1 > t2) { tmp = t1; t1 = t2; t2 = tmp; }
            if (t1 > tmin) tmin = t1;
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax || tmax < 0) return false;
        }
        else if (ov < lo || ov > hi) return false;

        // Y
        dv = d[1]; ov = o[1]; lo = a[1]; hi = b[1];
        if (lo > hi) { tmp = lo; lo = hi; hi = tmp; }
        if (dv > d_EPSILON || dv < -d_EPSILON)
        {
            t1 = (lo - ov) / dv; t2 = (hi - ov) / dv;
            if (t1 > t2) { tmp = t1; t1 = t2; t2 = tmp; }
            if (t1 > tmin) tmin = t1;
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax || tmax < 0) return false;
        }
        else if (ov < lo || ov > hi) return false;

        // Z
        dv = d[2]; ov = o[2]; lo = a[2]; hi = b[2];
        if (lo > hi) { tmp = lo; lo = hi; hi = tmp; }
        if (dv > d_EPSILON || dv < -d_EPSILON)
        {
            t1 = (lo - ov) / dv; t2 = (hi - ov) / dv;
            if (t1 > t2) { tmp = t1; t1 = t2; t2 = tmp; }
            if (t1 > tmin) tmin = t1;
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax || tmax < 0) return false;
        }
        else if (ov < lo || ov > hi) return false;

        const p = vl[1].mF32A;
        if (tmin <= 0)
        {
            // 원점이 박스 내부
            p[0] = o[0]; p[1] = o[1]; p[2] = o[2];
        }
        else
        {
            p[0] = o[0] + d[0] * tmin;
            p[1] = o[1] + d[1] * tmin;
            p[2] = o[2] + d[2] * tmin;
        }
        return true;
    }
    // static RayBoxIS(_min : CVec3,_max : CVec3,pa_ray : CRay)
    // {
    //     let inside = true;
    //     let quadrant = [0,0,0];
    //     let i;
    //     let whichPlane;
    //     let maxT = [0,0,0];
    //     let candidatePlane = [0,0,0];
        
    //     let vecList=pa_ray.GetVecList();
    //     let pOrigin = [ vecList[2].x ,vecList[2].y ,vecList[2].z ];
    //     let pBoxMin = [ _min.x,_min.y,_min.z ];
    //     let pBoxMax = [ _max.x,_max.y,_max.z ];
        
    //     if(pBoxMin[0]>pBoxMax[0])
    //     {
    //         pBoxMin[0]=_max.x;
    //         pBoxMax[0]=_min.x;
    //     }
    //     if(pBoxMin[1]>pBoxMax[1])
    //     {
    //         pBoxMin[1]=_max.y;
    //         pBoxMax[1]=_min.y;
    //     }
    //     if(pBoxMin[2]>pBoxMax[2])
    //     {
    //         pBoxMin[2]=_max.z;
    //         pBoxMax[2]=_min.z;
    //     }
        
    //     var pDir = [ vecList[0].x ,vecList[0].y ,vecList[0].z ];
    //     var pIntersect = [ 0 ,0 ,0 ];
    
    //     //박스 1개의 축씩 넘는지 안인지 체크한다
    //     //켄디데이타에 최소,최대 거리를 넣는다
    //     for (i = 0; i < 3; ++i)
    //     {
    //         if (pOrigin[i] < pBoxMin[i])
    //         {
    //             quadrant[i] = RayBoxLEFT;
    //             candidatePlane[i] = pBoxMin[i];
    //             inside = false;
    //         }
    //         else if (pOrigin[i] > pBoxMax[i])
    //         {
    //             quadrant[i] = RayBoxRIGHT;
    //             candidatePlane[i] = pBoxMax[i];
    //             inside = false;
    //         }
    //         else
    //         {
    //             quadrant[i] = RayBoxMIDDLE;
    //         }
    //     }
    
    //     //셋다 안이면 내부이다
    //     if (inside)
    //     {
    //         //충돌지점은 자신으로 표현
    //         pa_ray.SetPosition(new CVec3(pOrigin[0], pOrigin[1], pOrigin[2]));
    
    //         //*t = 0.0f;
    //         return true;
    //     }
    
    
    //     // Calculate T distances to candidate planes
    //     for (i = 0; i < 3; i++)
    //     {
    //         //중심이아니였음 그리고 너무 작은수는 패스
    //         if (quadrant[i] != RayBoxMIDDLE
    //             && (pDir[i] > d_EPSILON || pDir[i] < -d_EPSILON))
    //         {
    //             //(맥시멈-현재위치)/기울기
    //             maxT[i] = (candidatePlane[i] - pOrigin[i]) / pDir[i];
    //         }
    //         //아니면 직각이기때문에 -1
    //         else
    //         {
    //             maxT[i] = -1.0;
    //         }
    //     }
    
    //     //가장 큰값 찾고
    //     whichPlane = 0;
    //     for (i = 1; i < 3; i++)
    //     {
    //         if (maxT[whichPlane] < maxT[i])
    //             whichPlane = i;
    //     }
    
    //     // 0보다 작으면 충돌 아닌상황
    //     if (maxT[whichPlane] < 0.0)
    //     {
    //         return false;
    //     }
    
    
    //     for (i = 0; i < 3; i++)
    //     {
    //         //가장 큰값이 아닌경우
    //         if (whichPlane != i)
    //         {
    //             //충돌지점 구하고
    //             pIntersect[i] = pOrigin[i] + maxT[whichPlane] * pDir[i];
    //             //민,맥스랑 비교후 넘어가는 경우도 패스
    //             if (pIntersect[i] < pBoxMin[i] || pIntersect[i] > pBoxMax[i])
    //             {
    //                 return false;
    //             }
    //         }
    //         else
    //         {
    //             //
    //             pIntersect[i] = candidatePlane[i];
    //         }
    //     }
    //     pa_ray.mVec3List[1].mF32A[0]=pIntersect[0];
    //     pa_ray.mVec3List[1].mF32A[1]=pIntersect[1];
    //     pa_ray.mVec3List[1].mF32A[2]=pIntersect[2];
    //     //pa_ray.SetPosition(new CVec3(pIntersect[0], pIntersect[1], pIntersect[2]));
    //     return true;
    // }
    // static RayBoxIS(_min : CVec3,_max : CVec3,pa_ray : CRay)
    // {
    //     let inside = true;
    //     let quadrant = CPoolGeo.ProductV3();
    //     let i;
    //     let whichPlane;
    //     let maxT = CPoolGeo.ProductV3();
    //     let candidatePlane = CPoolGeo.ProductV3();
        
    //     let vecList=pa_ray.GetVecList();
    //     let pOrigin=CPoolGeo.ProductV3();
    //     let pBoxMin=CPoolGeo.ProductV3();
    //     let pBoxMax=CPoolGeo.ProductV3();
    //     pOrigin.Import(vecList[2]);
    //     pBoxMin.Import(_min);
    //     pBoxMax.Import(_max);
    //     let RecycleFun=()=>{
    //         CPoolGeo.RecycleV3(quadrant);
    //         CPoolGeo.RecycleV3(maxT);
    //         CPoolGeo.RecycleV3(candidatePlane);
    //         CPoolGeo.RecycleV3(pOrigin);
    //         CPoolGeo.RecycleV3(pBoxMin);
    //         CPoolGeo.RecycleV3(pBoxMax);
    //     };
    //     // let pOrigin = [ vecList[2].x ,vecList[2].y ,vecList[2].z ];
    //     // let pBoxMin = [ _min.x,_min.y,_min.z ];
    //     // let pBoxMax = [ _max.x,_max.y,_max.z ];
        
    //     if(pBoxMin.mF32A[0]>pBoxMax.mF32A[0])
    //     {
    //         pBoxMin.mF32A[0]=_max.x;
    //         pBoxMax.mF32A[0]=_min.x;
    //     }
    //     if(pBoxMin.mF32A[1]>pBoxMax.mF32A[1])
    //     {
    //         pBoxMin.mF32A[1]=_max.y;
    //         pBoxMax.mF32A[1]=_min.y;
    //     }
    //     if(pBoxMin.mF32A[2]>pBoxMax.mF32A[2])
    //     {
    //         pBoxMin.mF32A[2]=_max.z;
    //         pBoxMax.mF32A[2]=_min.z;
    //     }
        
    //     var pDir = [ vecList[0].x ,vecList[0].y ,vecList[0].z ];
    //     var pIntersect = [ 0 ,0 ,0 ];
    
    //     //박스 1개의 축씩 넘는지 안인지 체크한다
    //     //켄디데이타에 최소,최대 거리를 넣는다
    //     for (i = 0; i < 3; ++i)
    //     {
    //         if (pOrigin.mF32A[i] < pBoxMin.mF32A[i])
    //         {
    //             quadrant.mF32A[i] = RayBoxLEFT;
    //             candidatePlane.mF32A[i] = pBoxMin.mF32A[i];
    //             inside = false;
    //         }
    //         else if (pOrigin.mF32A[i] > pBoxMax.mF32A[i])
    //         {
    //             quadrant.mF32A[i] = RayBoxRIGHT;
    //             candidatePlane.mF32A[i] = pBoxMax.mF32A[i];
    //             inside = false;
    //         }
    //         else
    //         {
    //             quadrant.mF32A[i] = RayBoxMIDDLE;
    //         }
    //     }
    
    //     //셋다 안이면 내부이다
    //     if (inside)
    //     {
    //         //충돌지점은 자신으로 표현
    //         pa_ray.SetPosition(new CVec3(pOrigin.mF32A[0], pOrigin.mF32A[1], pOrigin.mF32A[2]));
    
    //         //*t = 0.0f;
    //         RecycleFun();
    //         return true;
    //     }
    
    
    //     // Calculate T distances to candidate planes
    //     for (i = 0; i < 3; i++)
    //     {
    //         //중심이아니였음 그리고 너무 작은수는 패스
    //         if (quadrant.mF32A[i] != RayBoxMIDDLE
    //             && (pDir[i] > d_EPSILON || pDir[i] < -d_EPSILON))
    //         {
    //             //(맥시멈-현재위치)/기울기
    //             maxT.mF32A[i] = (candidatePlane.mF32A[i] - pOrigin.mF32A[i]) / pDir[i];
    //         }
    //         //아니면 직각이기때문에 -1
    //         else
    //         {
    //             maxT.mF32A[i] = -1.0;
    //         }
    //     }
    
    //     //가장 큰값 찾고
    //     whichPlane = 0;
    //     for (i = 1; i < 3; i++)
    //     {
    //         if (maxT.mF32A[whichPlane] < maxT.mF32A[i])
    //             whichPlane = i;
    //     }
    
    //     // 0보다 작으면 충돌 아닌상황
    //     if (maxT.mF32A[whichPlane] < 0.0)
    //     {
    //         RecycleFun();
    //         return false;
    //     }
    
    
    //     for (i = 0; i < 3; i++)
    //     {
    //         //가장 큰값이 아닌경우
    //         if (whichPlane != i)
    //         {
    //             //충돌지점 구하고
    //             pIntersect[i] = pOrigin.mF32A[i] + maxT.mF32A[whichPlane] * pDir[i];
    //             //민,맥스랑 비교후 넘어가는 경우도 패스
    //             if (pIntersect[i] < pBoxMin.mF32A[i] || pIntersect[i] > pBoxMax.mF32A[i])
    //             {
    //                 RecycleFun();
    //                 return false;
    //             }
    //         }
    //         else
    //         {
    //             //
    //             pIntersect[i] = candidatePlane.mF32A[i];
    //         }
    //     }
    //     pa_ray.mVec3List[1].mF32A[0]=pIntersect[0];
    //     pa_ray.mVec3List[1].mF32A[1]=pIntersect[1];
    //     pa_ray.mVec3List[1].mF32A[2]=pIntersect[2];
    //     //pa_ray.SetPosition(new CVec3(pIntersect[0], pIntersect[1], pIntersect[2]));

    //     RecycleFun();

    //     return true;
    // }
    static RaySphereIS(pa_center, pa_radian,pa_ray)
    {
        var l = CMath.V3SubV3(pa_center, pa_ray.GetOriginal());
        var s = CMath.V3Dot(l, CMath.V3Nor(pa_ray.GetDirect()));
    
    
        var l2 = CMath.V3Dot(l, l);
        var r2 = Math.pow(pa_radian, 2);
    
        if (s < 0 && l2 > r2)  //각도가 아예 다른 방향이고 반지름이 더 크다는건 내부에 없다는 의미
        {
            return false;					   // 광선이 구의 반대 방향을 향하거나 구를 지나친 경우
        }
        var s2 = Math.pow(s, 2);
        var m2 = l2 - s2;
    
        if (m2 > r2)
        {
            return false;					  // 광선이 구를 비껴가는 경우
        }
    
        var q = Math.sqrt(r2 - m2);
        var distance;
    
        //// 두 개의 교차점 중 어느것을 구하는가?   
        if (l2 > r2)
        {
            distance = s - q;
        }
        else
        {
            distance = s + q;
        }
    
        pa_ray.SetPosition(CMath.V3AddV3(pa_ray.GetOriginal(), CMath.V3MulFloat(pa_ray.GetDirect(), distance)));
    
        return true;
    }
    static ColSphereSphere(_posA : CVec3, _radiusA : number,_posB : CVec3,_radiusB: number)
    {
        var vlen = CMath.V3Len(CMath.V3SubV3(_posA, _posB));
        if (vlen <= _radiusA + _radiusB)
            return vlen;
        return -1;
    }
    static PlaneSphereDist(pa_plane : CPlane,pa_posion : CVec3, pa_radius : number,_dist : CMat)
    {

        let minVal=100000000;
        let L_dist = 0;

        
        _dist.mF32A[6]=-1;

        
        for(let i=0;i<6;++i)
        {

            _dist.mF32A[i] = CMath.PlaneDotV3Coordi(pa_plane,i*4, pa_posion);
            if(minVal>_dist.mF32A[i])
            {
                _dist.mF32A[6]=i;
                _dist.mF32A[7]=_dist.mF32A[i];
                minVal=_dist.mF32A[i];
            }
            // if (-L_dist-pa_radius > 0)
            // {
            //     _dist.mF32A[i]=-L_dist-pa_radius;    
            //     if(minVal>_dist.mF32A[i])
            //     {
            //         _dist.mF32A[6]=i;
            //         _dist.mF32A[7]=_dist.mF32A[i];
            //         minVal=_dist.mF32A[i];
            //     }
                
            // }
            // else
            //     _dist.mF32A[i]=0;
        }
    }
    
    static PlaneSphereInside(pa_plane : CPlane,pa_posion : CVec3, pa_radius : number,_pArr : Array<CPlaneInside>)
    {
        if(pa_plane.Ptr()!=null && pa_posion.Ptr()!=null && _pArr==null)
            return CWASM.PlaneSphereInside(pa_plane.Ptr(), pa_posion.Ptr(), pa_radius);
        
        var L_dist = 0;
        
        L_dist = CMath.PlaneDotV3Coordi(pa_plane,CPlane.eDir.Left, pa_posion);
        if(_pArr==null)	
        {
            if(L_dist<-pa_radius)	return false;
        }
        else
        {
            if (L_dist < pa_radius)	_pArr.push(new CPlaneInside(CPlane.eDir.Left,-L_dist/pa_radius));
        }

        L_dist = CMath.PlaneDotV3Coordi(pa_plane,CPlane.eDir.Right, pa_posion);
        if(_pArr==null)	
        {
            if(L_dist<-pa_radius)	return false;
        }
        else
        {
            if (L_dist < pa_radius)	_pArr.push(new CPlaneInside(CPlane.eDir.Right,-L_dist/pa_radius));
        }

        L_dist = CMath.PlaneDotV3Coordi(pa_plane,CPlane.eDir.Bottom, pa_posion);
        if(_pArr==null)	
        {
            if(L_dist<-pa_radius)	return false;
        }
        else
        {
            if (L_dist <pa_radius)	_pArr.push(new CPlaneInside(CPlane.eDir.Bottom,-L_dist/pa_radius));
        }
        L_dist = CMath.PlaneDotV3Coordi(pa_plane,CPlane.eDir.Top, pa_posion);
        if(_pArr==null)	
        {
            if(L_dist<-pa_radius)	return false;
        }
        else
        {
            if (L_dist <pa_radius)	_pArr.push(new CPlaneInside(CPlane.eDir.Top,-L_dist/pa_radius));
        }
        
        
    
        L_dist = CMath.PlaneDotV3Coordi(pa_plane,CPlane.eDir.Near, pa_posion);
        if(_pArr==null)	
        {
            if(L_dist<-pa_radius)	return false;
        }
        else
        {
            if (L_dist <pa_radius)	_pArr.push(new CPlaneInside(CPlane.eDir.Near,-L_dist/pa_radius));
        }

        L_dist = CMath.PlaneDotV3Coordi(pa_plane,CPlane.eDir.Far, pa_posion);
        if(_pArr==null)	
        {
            if(L_dist<-pa_radius)	return false;
        }
        else
        {
            if (L_dist <pa_radius)	_pArr.push(new CPlaneInside(CPlane.eDir.Far,-L_dist/pa_radius));
        }
        
        

        return true;
    }
    //1엣지 리스트2현재 위치(0~1),3활용 엣지 범위 베이지어 위아래 당긴정도
    static Bezier(pa_vec : Array<any>,pa_persent,_rangeX,_rangeY)
    {
        var k=0, kn=0, nn=0, nkn=0;
        var n = pa_vec.length - 1;
        var blend=0, muk=0, munk=0;
        var pa_pst=null;
        
        if(pa_vec[0] instanceof CVec3)
        {
            pa_pst=new CVec3();
            var b=new CVec3();
            if (pa_persent == 1.0)
            {
                pa_pst = pa_vec[pa_vec.length-1];
                return pa_pst;
            }
            if (_rangeY == 0)
            {
                n = pa_vec.length - 1;
                _rangeY = n;
            }
            else
                n = (_rangeY + 1 - _rangeX) - 1;
    
            muk = 1;
    
            munk = Math.pow(1.0 - pa_persent, n);
    
            var newK = 0;
            for (k = _rangeX; k <= _rangeY; k++)
            {
                newK = k - _rangeX;
                nn = n;
                kn = newK;
                nkn = n - newK;
                blend = muk * munk;
                muk *= pa_persent;
                munk /= (1 - pa_persent);
                while (nn >= 1)
                {
                    blend *= nn;
                    nn--;
    
                    if (kn > 1)
                    {
                        blend /= kn;
                        kn--;
                    }
    
                    if (nkn > 1)
                    {
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
        else
        {
            pa_pst=0;
            var bb=0;
            if (pa_persent == 1.0)
            {
                pa_pst = pa_vec[pa_vec.length-1];
                return pa_pst;
            }
            if (_rangeY == 0)
            {
                n = pa_vec.length - 1;
                _rangeY = n;
            }
            else
                n = (_rangeY + 1 - _rangeX) - 1;
    
            muk = 1;
    
            munk = Math.pow(1.0 - pa_persent, n);
    
            var newK = 0;
            for (k = _rangeX; k <= _rangeY; k++)
            {
                newK = k - _rangeX;
                nn = n;
                kn = newK;
                nkn = n - newK;
                blend = muk * munk;
                muk *= pa_persent;
                munk /= (1 - pa_persent);
                while (nn >= 1)
                {
                    blend *= nn;
                    nn--;
    
                    if (kn > 1)
                    {
                        blend /= kn;
                        kn--;
                    }
    
                    if (nkn > 1)
                    {
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
    static Vec3ToBillboard(RF_axis,_st,_ed,_eye)
    {
    
        var t0=new CVec3();
        var t1=new CVec3();
        var t2=new CVec3();
        
        CMath.V3SubV3(_st,_ed,t0);
        CMath.V3SubV3(_eye,_st,t1);
        if (_ed.equals(_st))
            _st = new CVec3(0, 1, 0);
        CMath.V3Nor(t0,t0);
        CMath.V3Nor(t1,t1);
        CMath.V3Cross(t0, t1,t2);
        CMath.V3Nor(t2,t2);
        
        RF_axis.x=t2.x;
        RF_axis.y=t2.y;
        RF_axis.z=t2.z;
    }
    //https://threejs.org/examples/webgl_math_obb.html
    static ColSphereBox(_posA: CVec3, _radiusA: number, _boundB: CBound, _matB: CMat)
    {
        // box axes (world)
        let xAxis = new CVec3(_matB.mF32A[0], _matB.mF32A[1], _matB.mF32A[2]);
        let yAxis = new CVec3(_matB.mF32A[4], _matB.mF32A[5], _matB.mF32A[6]);
        let zAxis = new CVec3(_matB.mF32A[8], _matB.mF32A[9], _matB.mF32A[10]);

        // scales
        let scaX = CMath.V3Len(xAxis);
        let scaY = CMath.V3Len(yAxis);
        let scaZ = CMath.V3Len(zAxis);

        // normalize axes
        CMath.V3Nor(xAxis, xAxis);
        CMath.V3Nor(yAxis, yAxis);
        CMath.V3Nor(zAxis, zAxis);

        // world center = mat * localCenter  (중요!)
        let localCenter = _boundB.GetCenter();
        let center = new CVec3();
        CMath.V3MulMatCoordi(localCenter, _matB, center);

        // half extents in world-axis units (local halfsize * scale)
        let halfSize = new CVec3();
        _boundB.GetSize(halfSize);              // size = max-min (local)
        halfSize.x *= 0.5 * scaX;
        halfSize.y *= 0.5 * scaY;
        halfSize.z *= 0.5 * scaZ;

        // vector from center to sphere
        let d = new CVec3();
        CMath.V3SubV3(_posA, center, d);

        // clamp in OBB local axis space
        let cx = CMath.Max(CMath.Min(CMath.V3Dot(d, xAxis), halfSize.x), -halfSize.x);
        let cy = CMath.Max(CMath.Min(CMath.V3Dot(d, yAxis), halfSize.y), -halfSize.y);
        let cz = CMath.Max(CMath.Min(CMath.V3Dot(d, zAxis), halfSize.z), -halfSize.z);

        // closest point (copy center!)
        let closestPoint = new CVec3(center.x, center.y, center.z);
        CMath.V3AddV3(closestPoint, CMath.V3MulFloat(xAxis, cx), closestPoint);
        CMath.V3AddV3(closestPoint, CMath.V3MulFloat(yAxis, cy), closestPoint);
        CMath.V3AddV3(closestPoint, CMath.V3MulFloat(zAxis, cz), closestPoint);

        // distance
        let v = new CVec3();
        CMath.V3SubV3(_posA, closestPoint, v);
        let dist = CMath.V3Len(v);

        if (dist >= _radiusA) return null;

        let penetration = _radiusA - dist;

        // normal (sphere center - closest)
        let n = new CVec3();
        CMath.V3SubV3(_posA, closestPoint, n);
        if (n.IsZero()) {
            // sphere center exactly on box (rare). choose any axis
            n.x = xAxis.x; n.y = xAxis.y; n.z = xAxis.z;
        }
        CMath.V3Nor(n, n);

        return CMath.V3MulFloat(n, penetration);
    }

	// static ColSphereBox(_posA : CVec3, _radiusA : number,_boundB : CBound,_matB : CMat)
	// {
	// 	let xAxis = new CVec3();
	// 	let yAxis = new CVec3();
	// 	let zAxis = new CVec3();
	// 	//박스의 로컬 좌표계의 축을 구함
	// 	xAxis.mF32A[0] = _matB.mF32A[0];
	// 	xAxis.mF32A[1] = _matB.mF32A[1];
	// 	xAxis.mF32A[2] = _matB.mF32A[2];
	// 	yAxis.mF32A[0] = _matB.mF32A[4];
	// 	yAxis.mF32A[1] = _matB.mF32A[5];
	// 	yAxis.mF32A[2] = _matB.mF32A[6];
	// 	zAxis.mF32A[0] = _matB.mF32A[8];
	// 	zAxis.mF32A[1] = _matB.mF32A[9];
	// 	zAxis.mF32A[2] = _matB.mF32A[10];
	// 	//박스의 스케일
	// 	let scaX = CMath.V3Len(xAxis);
	// 	let scaY = CMath.V3Len(yAxis);
	// 	let scaZ = CMath.V3Len(zAxis);
	// 	//박스의 로컬 좌표계의 축을 정규화
	// 	CMath.V3Nor(xAxis, xAxis);
	// 	CMath.V3Nor(yAxis, yAxis);
	// 	CMath.V3Nor(zAxis, zAxis);
	// 	//박스의 중심
    //     let center=_boundB.GetCenter();
    //     center.x+=_matB.mF32A[12];
    //     center.y+=_matB.mF32A[13];
    //     center.z+=_matB.mF32A[14];
	// 	//new CVec3(_matB.mF32A[12], _matB.mF32A[13], _matB.mF32A[14]);
	// 	//구의 중심과 박스의 중심 사이의 벡터
	// 	let vec = new CVec3();
	// 	CMath.V3SubV3(_posA, center, vec);
	// 	//박스의 크기의 절반
	// 	let halfSize = new CVec3();
	// 	_boundB.GetSize(halfSize);
	// 	CMath.V3MulV3(halfSize, new CVec3(0.5 * scaX, 0.5 * scaY, 0.5 * scaZ), halfSize);
	// 	//구의 중심과 박스의 중심 사이의 벡터를 박스의 로컬 좌표계로 변환
	// 	let x = CMath.Max(CMath.Min(CMath.V3Dot(vec, xAxis), halfSize.mF32A[0]), -halfSize.mF32A[0]);
	// 	let y = CMath.Max(CMath.Min(CMath.V3Dot(vec, yAxis), halfSize.mF32A[1]), -halfSize.mF32A[1]);
	// 	let z = CMath.Max(CMath.Min(CMath.V3Dot(vec, zAxis), halfSize.mF32A[2]), -halfSize.mF32A[2]);
	// 	//박스의 로컬 좌표계에서 구의 중심으로 가는 가장 가까운 점
	// 	let closestPoint = center;
	// 	CMath.V3AddV3(closestPoint, CMath.V3MulFloat(xAxis, x), closestPoint);
	// 	CMath.V3AddV3(closestPoint, CMath.V3MulFloat(yAxis, y), closestPoint);
	// 	CMath.V3AddV3(closestPoint, CMath.V3MulFloat(zAxis, z), closestPoint);
	// 	//가장 가까운 점과 구의 중심 사이의 거리의 제곱
	// 	CMath.V3SubV3(_posA, closestPoint, vec);
	// 		//가장 가까운 점과 구의 중심 사이의 거리
	// 	let distance = CMath.V3Len(vec);
	// 	if(distance >= _radiusA) {
	// 		return null;
	// 	}
	// 	//침투 깊이
	// 	let penetrationDepth = _radiusA - distance;
	// 	//충돌 법선
	// 	let collisionNormal = CMath.V3SubV3(_posA, closestPoint);
	// 	//만약 충돌 법선의 길이가 0이면 박스의 중심과 구의 중심이 같음
	// 	if(collisionNormal.IsZero()) {
	// 		collisionNormal = xAxis;
	// 	}
	// 	CMath.V3Nor(collisionNormal, collisionNormal);
	// 	//충돌 해결을 위한 벡터
	// 	let resultVec = CMath.V3MulFloat(collisionNormal, penetrationDepth);
	// 	return resultVec;
	// }
	
	// static ColBoxBoxOBB(_boundA : CBound,_matA : CMat,_boundB : CBound,_matB : CMat,_push : CVec3=null)
	// {
	// 	//let L_center=[];
	// 	let aCen=CPoolGeo.ProductV3();
	// 	let bCen=CPoolGeo.ProductV3();
	// 	//let L_dir=[[],[]];
	// 	let aDir=[CPoolGeo.ProductV3(),CPoolGeo.ProductV3(),CPoolGeo.ProductV3()];
	// 	let bDir=[CPoolGeo.ProductV3(),CPoolGeo.ProductV3(),CPoolGeo.ProductV3()];
	// 	let aLen=CPoolGeo.ProductV3();
	// 	let bLen=CPoolGeo.ProductV3();
	// 	let atob=CPoolGeo.ProductV3();
	
	// 	let URenturn=()=>{
    //         CPoolGeo.RecycleV3(aCen);
    //         CPoolGeo.RecycleV3(bCen);
    //         CPoolGeo.RecycleV3(aLen);
    //         CPoolGeo.RecycleV3(bLen);

    //         CPoolGeo.RecycleV3(aDir[0]);
    //         CPoolGeo.RecycleV3(aDir[1]);
    //         CPoolGeo.RecycleV3(aDir[2]);
    //         CPoolGeo.RecycleV3(bDir[0]);
    //         CPoolGeo.RecycleV3(bDir[1]);
    //         CPoolGeo.RecycleV3(bDir[2]);
    //         CPoolGeo.RecycleV3(atob);
            
	// 		return null;
	// 	};

	// 	_matA.GetV3(0,aDir[0]);
	// 	_matA.GetV3(1,aDir[1]);
	// 	_matA.GetV3(2,aDir[2]);

	// 	_matB.GetV3(0,bDir[0]);
	// 	_matB.GetV3(1,bDir[1]);
	// 	_matB.GetV3(2,bDir[2]);

	
	// 	_matA.GetV3(3,aCen);
	// 	_matB.GetV3(3,bCen);
		
	
		
	
	// 	_boundA.GetSize(aLen);
	// 	_boundB.GetSize(bLen);
	// 	CMath.V3MulFloat(aLen,0.5,aLen);
	// 	CMath.V3MulFloat(bLen,0.5,bLen);
	


		

	// 	aLen.x *= CMath.V3Len(aDir[0]);
	// 	aLen.y *= CMath.V3Len(aDir[1]);
	// 	aLen.z *= CMath.V3Len(aDir[2]);
	// 	bLen.x *= CMath.V3Len(bDir[0]);
	// 	bLen.y *= CMath.V3Len(bDir[1]);
	// 	bLen.z *= CMath.V3Len(bDir[2]);


	// 	CMath.V3Nor(aDir[0],aDir[0]);
	// 	CMath.V3Nor(aDir[1],aDir[1]);
	// 	CMath.V3Nor(aDir[2],aDir[2]);

	// 	CMath.V3Nor(bDir[0],bDir[0]);
	// 	CMath.V3Nor(bDir[1],bDir[1]);
	// 	CMath.V3Nor(bDir[2],bDir[2]);
	
	// 	//XZ는 -1~1  Y는 0~2단위라서 절반하면 절반만큼 오차가 생긴다
	// 	//그부분 수정용
	// 	//L_center[0].y+=(pa_A.max.y*L_rLen[0].y)-aLen.y;
	// 	//L_center[1].y+=(pa_B.max.y*L_rLen[1].y)-bLen.y;
	
	// 	//var L_diff=[new CVec3(),new CVec3()];;
	// 	let aDiff=CPoolGeo.ProductV3();
	// 	let bDiff=CPoolGeo.ProductV3();
	// 	let diffDum=CPoolGeo.ProductV3();
	// 	CMath.V3AddV3(_boundA.mMax , _boundA.mMin,aDiff);
	// 	CMath.V3MulFloat(aDiff,0.5,aDiff);
	// 	CMath.V3AddV3(_boundB.mMax , _boundB.mMin,bDiff);
	// 	CMath.V3MulFloat(bDiff,0.5,bDiff);
	// 	//CMath.V3MulFloat(CMath.V3AddV3(_boundA.max , _boundA.min),0.5,L_diff[0]);
	// 	//CMath.V3MulFloat(CMath.V3AddV3(_boundB.max , _boundB.min),0.5,L_diff[1]);
	
	// 	CMath.V3MulMatNormal(aDiff, _matA,diffDum);
	// 	CMath.V3AddV3(aCen, diffDum,aCen);
	// 	CMath.V3MulMatNormal(bDiff, _matB,diffDum);
	// 	CMath.V3AddV3(bCen, diffDum,bCen);
    //     CPoolGeo.RecycleV3(aDiff);
    //     CPoolGeo.RecycleV3(bDiff);
    //     CPoolGeo.RecycleV3(diffDum);
		
	// 	// L_diff[1] = CMath.V3MulMatNormal(L_diff[1], _matB);
	
	// 	// CMath.V3AddV3(aCen, L_diff[0],aCen);
	// 	// CMath.V3AddV3(bCen, L_diff[1],bCen);
	
	
	
	// 	// 여기서 R0 항목은 OBB A의 interval radius, R1 항목은 OBB B의 interval radius, R 항목은 2개의 OBB의 중심 간의 투영된 거리를 나타낸다.
	// 	// D 벡터는 2개의 OBB의 중심을 잇는 벡터를 나타낸다.
	// 	// Cij 는 rotation matrix R에서의 (i,j) 항을 나타낸다.
	// 	var c=[[0,0,0],[0,0,0],[0,0,0]];
	// 	var absC=[[0,0,0],[0,0,0],[0,0,0]];
	// 	var d=[0,0,0];
	// 	var p=[0,0,0];
	// 	let pv=0;
	
	// 	var r0=0, r1=0, r=0;

	
	// 	CMath.V3SubV3(aCen,bCen,atob);
	// 	for ( let i = 0; i < 3; i ++ ) {

	// 		for ( let j = 0; j < 3; j ++ ) {

	// 			c[ i ][ j ] = CMath.V3Dot(aDir[i], bDir[j]);

	// 		}

	// 	}
	// 	let epsilon=2.220446049250313e-16;
	// 	for ( let i = 0; i < 3; i ++ ) 
	// 	{
	// 		for ( let j = 0; j < 3; j ++ ) 
	// 		{
	// 			absC[i][j] = CMath.Abs(c[i][j])+epsilon;
	// 		}

	// 	}

	// 	d[0] = CMath.V3Dot(atob, aDir[0]);
	// 	d[1] = CMath.V3Dot(atob, aDir[1]);
	// 	d[2] = CMath.V3Dot(atob, aDir[2]);

	// 	for ( let i = 0; i < 3; i ++ ) 
	// 	{
	// 		r = CMath.Abs(d[i]);
	// 		r0 = aLen.mF32A[i];//a.e[ i ];
	// 		r1 = bLen.mF32A[0] * absC[ i ][ 0 ] + bLen.mF32A[1] * absC[ i ][ 1 ] + bLen.mF32A[2] * absC[ i ][ 2 ];
	// 		if ( r > r0 + r1 ) return URenturn();
	// 		p[i]=r-(r0 + r1);
	// 	}
	// 	for ( let i = 0; i < 3; i ++ ) {

	// 		r = CMath.Abs(d[ 0 ] * c[ 0 ][ i ] + d[ 1 ] * c[ 1 ][ i ] + d[ 2 ] * c[ 2 ][ i ]);
	// 		r0 = aLen.mF32A[ 0 ] * absC[ 0 ][ i ] + aLen.mF32A[1] * absC[ 1 ][ i ] + aLen.mF32A[2] * absC[ 2 ][ i ];
	// 		r1 = bLen.mF32A[i];
	// 		if ( r > r0 + r1 ) return URenturn();
	// 		pv=r-(r0 + r1);
	// 		if(CMath.Abs(p[0])>CMath.Abs(pv) && r>0)
	// 			p[i]=pv*0.99999;//메인축이 선택될 확률이 높도록 조정함
	// 	}


			
	// 	let p2=[0,0,0,0,0,0,0,0,0];
	
	
	// 	r = CMath.Abs(d[2] * c[1][0] - d[1] * c[2][0]);
	// 	r0 = aLen.y * absC[2][0] + aLen.z * absC[1][0];
	// 	r1 = bLen.y * absC[0][2] + bLen.z * absC[0][1];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	// 	//p2[0]=r-(r0 + r1);
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[2])>CMath.Abs(pv) && r>0 && pv!=p[1] && pv!=p[0])
	// 		p[2]=pv;
	
	
	
	// 	r = CMath.Abs(d[2] * c[1][1] - d[1] * c[2][1]);
	// 	r0 = aLen.y * absC[2][1] + aLen.z * absC[1][1];
	// 	r1 = bLen.x * absC[0][2] + bLen.z * absC[0][0];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[2])>CMath.Abs(pv) && r>0 && pv!=p[1] && pv!=p[0])
	// 		p[2]=pv;
	
	
	// 	r = CMath.Abs(d[2] * c[1][2] - d[1] * c[2][2]);
	// 	r0 = aLen.y * absC[2][2] + aLen.z * absC[1][2];
	// 	r1 = bLen.x * absC[0][1] + bLen.y * absC[0][0];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[2])>CMath.Abs(pv) && r>0 && pv!=p[1] && pv!=p[0])
	// 		p[2]=pv;
	
	
	// 	r = CMath.Abs(d[0] * c[2][0] - d[2] * c[0][0]);
	// 	r0 = aLen.x * absC[2][0] + aLen.z * absC[0][0];
	// 	r1 = bLen.y * absC[1][2] + bLen.z * absC[1][1];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[0])>CMath.Abs(pv) && r>0 && pv!=p[1] && pv!=p[2])
	// 		p[0]=pv;
	
	
	// 	r = CMath.Abs(d[0] * c[2][1] - d[2] * c[0][1]);
	// 	r0 = aLen.x * absC[2][1] + aLen.z * absC[0][1];
	// 	r1 = bLen.x * absC[1][2] + bLen.z * absC[1][0];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[0])>CMath.Abs(pv) && r>0 && pv!=p[1] && pv!=p[2])
	// 		p[0]=pv;
	
	
	// 	r = CMath.Abs(d[0] * c[2][2] - d[2] * c[0][2]);
	// 	r0 = aLen.x * absC[2][2] + aLen.z * absC[0][2];
	// 	r1 = bLen.x * absC[1][1] + bLen.y * absC[1][0];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[0])>CMath.Abs(pv) && r>0 && pv!=p[1] && pv!=p[2])
	// 		p[0]=pv;
	
	
	// 	r = CMath.Abs(d[1] * c[0][0] - d[0] * c[1][0]);
	// 	r0 = aLen.x * absC[1][0] + aLen.y * absC[0][0];
	// 	r1 = bLen.y * absC[2][2] + bLen.z * absC[2][1];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[1])>CMath.Abs(pv) && r>0 && pv!=p[0] && pv!=p[2])
	// 		p[1]=pv;
	
	// 	r = CMath.Abs(d[1] * c[0][1] - d[0] * c[1][1]);
	// 	r0 = aLen.x * absC[1][1] + aLen.y * absC[0][1];
	// 	r1 = bLen.x * absC[2][2] + bLen.z * absC[2][0];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[1])>CMath.Abs(pv) && r>0 && pv!=p[0] && pv!=p[2])
	// 		p[1]=pv;
	
	// 	r = CMath.Abs(d[1] * c[0][2] - d[0] * c[1][2]);
	// 	r0 = aLen.x * absC[1][2] + aLen.y * absC[0][2];
	// 	r1 = bLen.x * absC[2][1] + bLen.y * absC[2][0];
	// 	if (r > r0 + r1)
	// 		return URenturn();
	// 	pv=r-(r0 + r1);
	// 	if(CMath.Abs(p[1])>CMath.Abs(pv) && r>0 && pv!=p[0] && pv!=p[2])
	// 		p[1]=pv;
	
		
	// 	let push=_push;
	// 	if(push==null)
	// 		push=new CVec3();
	// 	if(CMath.Abs(p[0])<CMath.Abs(p[1]))
	// 	{
	// 		if(CMath.Abs(p[0])<CMath.Abs(p[2]))
	// 			push.mF32A[0]=atob.mF32A[0]<0?-p[0]:p[0];
	// 		else
	// 			push.mF32A[2]=atob.mF32A[2]<0?-p[2]:p[2];
				
	// 	}
	// 	else
	// 	{
	// 		if(CMath.Abs(p[1])<CMath.Abs(p[2]))
	// 			push.mF32A[1]=atob.mF32A[1]<0?-p[1]:p[1];
	// 		else
	// 			push.mF32A[2]=atob.mF32A[2]<0?-p[2]:p[2];
	// 	}
	// 	URenturn();
	// 	return push;
	// }

    //1차 그나마 보기 쉬운 버전
    static ColBoxBoxOBB(_boundA: CBound, _matA: CMat, _boundB: CBound, _matB: CMat, _push: CVec3 = null): CVec3 | null
    {
        // ---- 1) POOL: 임시 벡터 준비 ----
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
        const t      = CPoolGeo.ProductV3(); // A->B 중심 벡터
        const bestAx = CPoolGeo.ProductV3(); // 최종 MTV 축(단위)
        const cross  = CPoolGeo.ProductV3(); // 교차축 재사용
        const mtv    = CPoolGeo.ProductV3(); // 결과 MTV
        const mtvAxW = CPoolGeo.ProductV3(); // 부호 조정용(재사용)

        const ReturnFun = () => {
            // recycle A
            CPoolGeo.RecycleV3(a.center);
            CPoolGeo.RecycleV3(a.axes[0]); CPoolGeo.RecycleV3(a.axes[1]); CPoolGeo.RecycleV3(a.axes[2]);
            CPoolGeo.RecycleV3(a.extents);
            CPoolGeo.RecycleV3(a.tmp);
            // recycle B
            CPoolGeo.RecycleV3(b.center);
            CPoolGeo.RecycleV3(b.axes[0]); CPoolGeo.RecycleV3(b.axes[1]); CPoolGeo.RecycleV3(b.axes[2]);
            CPoolGeo.RecycleV3(b.extents);
            CPoolGeo.RecycleV3(b.tmp);
            // others
            CPoolGeo.RecycleV3(t);
            CPoolGeo.RecycleV3(bestAx);
            CPoolGeo.RecycleV3(cross);
            CPoolGeo.RecycleV3(mtv);
            CPoolGeo.RecycleV3(mtvAxW);
        };

        // ---- 2) A, B의 center/axes/extents 세팅 (스케일 흡수) ----
        // A center
        CMath.V3MulFloat(CMath.V3AddV3(_boundA.mMax, _boundA.mMin, a.tmp), 0.5, a.tmp);
        CMath.V3MulMatCoordi(a.tmp, _matA, a.center);

        _matA.GetV3(0, a.axes[0]);
        _matA.GetV3(1, a.axes[1]);
        _matA.GetV3(2, a.axes[2]);

        _boundA.GetSize(a.extents); // full size (local AABB)
        a.extents.x *= 0.5 * CMath.V3Len(a.axes[0]);
        a.extents.y *= 0.5 * CMath.V3Len(a.axes[1]);
        a.extents.z *= 0.5 * CMath.V3Len(a.axes[2]);
        CMath.V3Nor(a.axes[0], a.axes[0]); CMath.V3Nor(a.axes[1], a.axes[1]); CMath.V3Nor(a.axes[2], a.axes[2]);

        // B center
        CMath.V3MulFloat(CMath.V3AddV3(_boundB.mMax, _boundB.mMin, b.tmp), 0.5, b.tmp);
        CMath.V3MulMatCoordi(b.tmp, _matB, b.center);

        _matB.GetV3(0, b.axes[0]);
        _matB.GetV3(1, b.axes[1]);
        _matB.GetV3(2, b.axes[2]);

        _boundB.GetSize(b.extents);
        b.extents.x *= 0.5 * CMath.V3Len(b.axes[0]);
        b.extents.y *= 0.5 * CMath.V3Len(b.axes[1]);
        b.extents.z *= 0.5 * CMath.V3Len(b.axes[2]);
        CMath.V3Nor(b.axes[0], b.axes[0]); CMath.V3Nor(b.axes[1], b.axes[1]); CMath.V3Nor(b.axes[2], b.axes[2]);

        // A->B
        CMath.V3SubV3(b.center, a.center, t);

        // ---- 3) SAT 검사 ----
        let minOverlap = Infinity;
        const EPS2 = 1e-10; // 교차축 길이 제곱 임계

        // 헬퍼: 반지름(projection half-length) 계산
        const radiusOn = (ext: CVec3, ax0: CVec3, ax1: CVec3, ax2: CVec3, axis: CVec3) =>
            ext.x * Math.abs(CMath.V3Dot(axis, ax0)) +
            ext.y * Math.abs(CMath.V3Dot(axis, ax1)) +
            ext.z * Math.abs(CMath.V3Dot(axis, ax2));

        // 축 검사 공통 루틴
        const testAxis = (axis: CVec3): boolean => {
            // proj
            const ra = radiusOn(a.extents, a.axes[0], a.axes[1], a.axes[2], axis);
            const rb = radiusOn(b.extents, b.axes[0], b.axes[1], b.axes[2], axis);
            const dist = Math.abs(CMath.V3Dot(t, axis));
            const overlap = ra + rb - dist;

            if (overlap <= 0) return false; // 분리 발견 → 충돌 아님

            if (overlap < minOverlap) {
                minOverlap = overlap;
                // MTV 방향: A -> B 바깥쪽
                // mtvAxW = axis * sign(dot(t,axis))
                mtvAxW.Import(axis);
                
                if (CMath.V3Dot(t, mtvAxW) < 0) CMath.V3MulFloat(mtvAxW, -1, mtvAxW);
                bestAx.Import(mtvAxW);
            }
            return true;
        };

        // 3.1 A의 3축, B의 3축
        if (!testAxis(a.axes[0])) { ReturnFun(); return null; }
        if (!testAxis(a.axes[1])) { ReturnFun(); return null; }
        if (!testAxis(a.axes[2])) { ReturnFun(); return null; }
        if (!testAxis(b.axes[0])) { ReturnFun(); return null; }
        if (!testAxis(b.axes[1])) { ReturnFun(); return null; }
        if (!testAxis(b.axes[2])) { ReturnFun(); return null; }

        // 3.2 교차축 9개 (즉시 계산/검사, 저장 없음)
        for (let i=0;i<3;i++){
            for (let j=0;j<3;j++){
                CMath.V3Cross(a.axes[i], b.axes[j], cross);
                // 거의 평행이면 스킵
                if (CMath.V3Dot(cross, cross) <= EPS2) continue;
                CMath.V3Nor(cross, cross);
                if (!testAxis(cross)) { ReturnFun(); return null; }
            }
        }

        // ---- 4) MTV 계산/반환 ----
        CMath.V3MulFloat(bestAx, minOverlap, mtv);

        const out = _push || new CVec3();
        out.Import(mtv);

        ReturnFun();
        return out;
    }
static ColBoxBoxAABB(
    _boundA: CBound,
    _matA: CMat,
    _boundB: CBound,
    _matB: CMat,
    _push: CVec3 = null
): CVec3 | null
{
    // ---------- 1) 로컬 center / half extents ----------
    const aMin = _boundA.mMin;
    const aMax = _boundA.mMax;
    const bMin = _boundB.mMin;
    const bMax = _boundB.mMax;

    // 로컬 센터 (두 번째 박스처럼 0이 아닐 수 있음)
    const aLocalCx = (aMin.x + aMax.x) * 0.5;
    const aLocalCy = (aMin.y + aMax.y) * 0.5;
    const aLocalCz = (aMin.z + aMax.z) * 0.5;

    const bLocalCx = (bMin.x + bMax.x) * 0.5;
    const bLocalCy = (bMin.y + bMax.y) * 0.5;
    const bLocalCz = (bMin.z + bMax.z) * 0.5;

    // 로컬 half extents
    const aLocalHx = (aMax.x - aMin.x) * 0.5;
    const aLocalHy = (aMax.y - aMin.y) * 0.5;
    const aLocalHz = (aMax.z - aMin.z) * 0.5;

    const bLocalHx = (bMax.x - bMin.x) * 0.5;
    const bLocalHy = (bMax.y - bMin.y) * 0.5;
    const bLocalHz = (bMax.z - bMin.z) * 0.5;

    // ---------- 2) 월드 스케일 / 센터 ----------
    const mA = _matA.mF32A;
    const mB = _matB.mF32A;

    // 회전 없음 가정: 대각선이 scale
    const aSx = mA[0];
    const aSy = mA[5];
    const aSz = mA[10];

    const bSx = mB[0];
    const bSy = mB[5];
    const bSz = mB[10];

    // 월드 half extents (스케일 절댓값)
    const aHx = Math.abs(aSx) * aLocalHx;
    const aHy = Math.abs(aSy) * aLocalHy;
    const aHz = Math.abs(aSz) * aLocalHz;

    const bHx = Math.abs(bSx) * bLocalHx;
    const bHy = Math.abs(bSy) * bLocalHy;
    const bHz = Math.abs(bSz) * bLocalHz;

    // 월드 센터 = translation + (로컬 센터 * 스케일)
    const aCx = mA[12] + aLocalCx * aSx;
    const aCy = mA[13] + aLocalCy * aSy;
    const aCz = mA[14] + aLocalCz * aSz;

    const bCx = mB[12] + bLocalCx * bSx;
    const bCy = mB[13] + bLocalCy * bSy;
    const bCz = mB[14] + bLocalCz * bSz;

    // ---------- 3) AABB SAT ----------
    // t = B - A  (OBB 버전과 동일)
    const tx = bCx - aCx;
    const ty = bCy - aCy;
    const tz = bCz - aCz;

    // 분리 여부
    if (Math.abs(tx) >= aHx + bHx) return null;
    if (Math.abs(ty) >= aHy + bHy) return null;
    if (Math.abs(tz) >= aHz + bHz) return null;

    // 축별 overlap
    const overlapX = aHx + bHx - Math.abs(tx);
    const overlapY = aHy + bHy - Math.abs(ty);
    const overlapZ = aHz + bHz - Math.abs(tz);

    // ---------- 4) 최소 overlap 축 + 부호 ----------
    let minOverlap = overlapX;
    let axis = 0;                      // 0:x, 1:y, 2:z
    let sign = (tx >= 0) ? 1 : -1;     // t.x 방향 (A -> B)

    if (overlapY < minOverlap) {
        minOverlap = overlapY;
        axis = 1;
        sign = (ty >= 0) ? 1 : -1;     // t.y 방향
    }
    if (overlapZ < minOverlap) {
        minOverlap = overlapZ;
        axis = 2;
        sign = (tz >= 0) ? 1 : -1;     // t.z 방향
    }

    // ---------- 5) MTV 계산 ----------
    const out = _push || new CVec3();
    out.x = 0; out.y = 0; out.z = 0;

    if (axis === 0) {
        out.x = minOverlap * sign;
    } else if (axis === 1) {
        out.y = minOverlap * sign;
    } else {
        out.z = minOverlap * sign;
    }

    return out;
}

    //박스 A와 삼각형 리스트 B(_boundB.mPos를 3개씩 끊어 삼각형 하나로 본다)의 충돌.
    //GJK는 점들을 하나의 볼록껍질로 뭉개서 보므로 오목한 형체(아치, 문틈)가 메워진다.
    //여기서는 삼각형을 하나씩 검사하므로 오목해도 실제 면 그대로 충돌한다.
    //반환값은 ColBoxBoxOBB와 같은 규약으로 A가 B로 파고든 방향의 MTV다.
    //바닥+벽 모서리처럼 여러 삼각형에 동시에 닿으면 축별로 가장 깊은 값을 모아 한 벡터로 돌려준다.
    //한 축만 골라 돌려주면 나머지 면은 다음 스텝으로 밀려 모서리에서 떨리기 때문이다.
    //_moveDir은 박스가 이번 스텝에 움직인 변위(월드). 주면 스텝 직전에 있던 쪽으로 되밀어낸다 - 아래 참고.
    static ColBoxTriMesh(_boundA: CBound, _matA: CMat, _boundB: CBound, _matB: CMat, _push: CVec3 = null, _moveDir: CVec3 = null): CVec3 | null
    {
        const posList = _boundB.mPos;
        const triCount = Math.floor(posList.Size() / 3);
        if (triCount == 0) return null;

        //정점을 평탄 배열로 캐시해 둔다. mPos는 CArray<CVec3>라서 삼각형마다
        //Find() -> CVec3 -> mF32A 를 세 번 타고 들어가는데, 삼각형을 걸러내는 루프에서
        //그 접근 비용이 절반을 넘는다. 같은 루프가 평탄 배열이면 1.6배 빨랐다.
        const flat = TriFlatCache(_boundB, triCount);

        const mA = _matA.mF32A;
        const mB = _matB.mF32A;

        //---- A(박스)의 월드 OBB : 중심 / 단위축 / 반크기 ----
        let u0x = mA[0], u0y = mA[1], u0z = mA[2];
        let u1x = mA[4], u1y = mA[5], u1z = mA[6];
        let u2x = mA[8], u2y = mA[9], u2z = mA[10];
        const s0 = Math.sqrt(u0x * u0x + u0y * u0y + u0z * u0z);
        const s1 = Math.sqrt(u1x * u1x + u1y * u1y + u1z * u1z);
        const s2 = Math.sqrt(u2x * u2x + u2y * u2y + u2z * u2z);
        if (s0 <= 0 || s1 <= 0 || s2 <= 0) return null;
        u0x /= s0; u0y /= s0; u0z /= s0;
        u1x /= s1; u1y /= s1; u1z /= s1;
        u2x /= s2; u2y /= s2; u2z /= s2;

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

        //---- 선검사용 : 박스를 B의 로컬 공간에서 감싸는 구 ----
        //삼각형마다 월드 변환을 하면 비싸므로, 박스 쪽을 로컬로 한 번 옮겨 두고
        //로컬 좌표 그대로 비교해서 대부분의 삼각형을 값 비교만으로 걸러낸다.
        const bs0 = Math.sqrt(mB[0] * mB[0] + mB[1] * mB[1] + mB[2] * mB[2]);
        const bs1 = Math.sqrt(mB[4] * mB[4] + mB[5] * mB[5] + mB[6] * mB[6]);
        const bs2 = Math.sqrt(mB[8] * mB[8] + mB[9] * mB[9] + mB[10] * mB[10]);
        const bScaMin = Math.min(bs0, Math.min(bs1, bs2));
        if (bScaMin <= 0) return null;

        const iMat = CPoolGeo.ProductMat();
        CMath.MatInvert(_matB, iMat);
        const mI = iMat.mF32A;
        const lcx = mI[0] * cx + mI[4] * cy + mI[8] * cz + mI[12];
        const lcy = mI[1] * cx + mI[5] * cy + mI[9] * cz + mI[13];
        const lcz = mI[2] * cx + mI[6] * cy + mI[10] * cz + mI[14];
        CPoolGeo.RecycleMat(iMat);

        //월드 반지름을 B의 최소 스케일로 나눠 로컬에서 넉넉하게(절대 작지 않게) 잡는다
        const lr = Math.sqrt(ex * ex + ey * ey + ez * ez) / bScaMin;
        const pMinX = lcx - lr, pMaxX = lcx + lr;
        const pMinY = lcy - lr, pMaxY = lcy + lr;
        const pMinZ = lcz - lr, pMaxZ = lcz + lr;

        //삼각형 정점(박스 중심 기준 월드 좌표). TestAxis가 읽으므로 루프 밖에 둔다.
        let v0x = 0, v0y = 0, v0z = 0;
        let v1x = 0, v1y = 0, v1z = 0;
        let v2x = 0, v2y = 0, v2z = 0;
        //이번 스텝의 이동량(방향이 아니라 실제 변위다). 이전 위치를 되짚는 데 쓴다.
        let mvx = 0, mvy = 0, mvz = 0;
        if (_moveDir != null) { mvx = _moveDir.x; mvy = _moveDir.y; mvz = _moveDir.z; }

        //13축을 모두 재서 가장 적게 움직여도 되는 축을 고른다(진짜 MTV).
        //면 법선만 쓰면 삼각형을 무한 평면처럼 취급하게 되어, 모서리만 살짝 스친
        //얇은 조각(45도 모따기 등)이 박스 크기만 한 밀어내기를 요구한다 - 경사로 끝처럼
        //좁은 곳에서 옆으로 튕겨나가 못 올라가는 원인이 된다.
        let bestPen = 0, bestX = 0, bestY = 0, bestZ = 0;
        const TestAxis = (_axx: number, _axy: number, _axz: number): boolean =>
        {
            const len2 = _axx * _axx + _axy * _axy + _axz * _axz;
            //퇴화축(길이 0)은 분리축이 될 수 없으므로 통과시킨다
            if (len2 <= 1e-12) return true;
            const inv = 1 / Math.sqrt(len2);
            const nx = _axx * inv, ny = _axy * inv, nz = _axz * inv;

            //박스를 이 축에 투영한 반지름
            const r = ex * Math.abs(nx * u0x + ny * u0y + nz * u0z)
                + ey * Math.abs(nx * u1x + ny * u1y + nz * u1z)
                + ez * Math.abs(nx * u2x + ny * u2y + nz * u2z);

            const d0 = v0x * nx + v0y * ny + v0z * nz;
            const d1 = v1x * nx + v1y * ny + v1z * nz;
            const d2 = v2x * nx + v2y * ny + v2z * nz;
            const tMin = Math.min(d0, Math.min(d1, d2));
            const tMax = Math.max(d0, Math.max(d1, d2));

            //겹친 "길이"가 아니라 떼어놓는 데 필요한 "이동량"을 잰다.
            //삼각형은 평면이라 자기 법선 축에서는 길이가 0이 되어, 겹친 길이로 재면 늘 0이 나온다.
            const pen1 = r - tMin;//-축으로 pen1만큼 빠진다
            const pen2 = tMax + r;//+축으로 pen2만큼 빠진다
            if (pen1 <= 0 || pen2 <= 0) return false;

            //어느 쪽으로 뺄지는 이번 스텝 직전에 있던 쪽으로 정한다. 가까운 쪽을 고르면
            //면 중간을 넘는 순간 반대편으로 뒤집혀 벽을 뚫고 나간다(벽에 비빌 때 그렇다).
            //이동량이 0이면 prevC가 0이라 자연스럽게 가까운 쪽으로 떨어진다.
            const prevC = -(mvx * nx + mvy * ny + mvz * nz);
            let useMinus: boolean;
            if (prevC <= tMin) useMinus = true;       //직전에 -축 쪽에 있었다
            else if (prevC >= tMax) useMinus = false; //직전에 +축 쪽에 있었다
            else useMinus = (pen1 < pen2);            //이미 걸쳐 있었으면 가까운 쪽

            const pen = useMinus ? pen1 : pen2;
            if (bestPen == 0 || pen < bestPen)
            {
                bestPen = pen;
                if (useMinus) { bestX = -nx; bestY = -ny; bestZ = -nz; }
                else { bestX = nx; bestY = ny; bestZ = nz; }
            }
            return true;
        };

        const ua = [u0x, u0y, u0z, u1x, u1y, u1z, u2x, u2y, u2z];
        const ea = [0, 0, 0, 0, 0, 0, 0, 0, 0];

        let outX = 0, outY = 0, outZ = 0;
        let hit = false;

        for (let t = 0; t < triCount; ++t)
        {
            const f = t * 9;
            const a0 = flat[f], a1 = flat[f + 1], a2 = flat[f + 2];
            const b0 = flat[f + 3], b1 = flat[f + 4], b2 = flat[f + 5];
            const c0 = flat[f + 6], c1 = flat[f + 7], c2 = flat[f + 8];

            //로컬 선검사 : 세 점이 모두 한쪽으로 벗어나 있으면 볼 것도 없다
            if (a0 < pMinX && b0 < pMinX && c0 < pMinX) continue;
            if (a0 > pMaxX && b0 > pMaxX && c0 > pMaxX) continue;
            if (a1 < pMinY && b1 < pMinY && c1 < pMinY) continue;
            if (a1 > pMaxY && b1 > pMaxY && c1 > pMaxY) continue;
            if (a2 < pMinZ && b2 < pMinZ && c2 < pMinZ) continue;
            if (a2 > pMaxZ && b2 > pMaxZ && c2 > pMaxZ) continue;

            v0x = mB[0] * a0 + mB[4] * a1 + mB[8] * a2 + mB[12] - cx;
            v0y = mB[1] * a0 + mB[5] * a1 + mB[9] * a2 + mB[13] - cy;
            v0z = mB[2] * a0 + mB[6] * a1 + mB[10] * a2 + mB[14] - cz;

            v1x = mB[0] * b0 + mB[4] * b1 + mB[8] * b2 + mB[12] - cx;
            v1y = mB[1] * b0 + mB[5] * b1 + mB[9] * b2 + mB[13] - cy;
            v1z = mB[2] * b0 + mB[6] * b1 + mB[10] * b2 + mB[14] - cz;

            v2x = mB[0] * c0 + mB[4] * c1 + mB[8] * c2 + mB[12] - cx;
            v2y = mB[1] * c0 + mB[5] * c1 + mB[9] * c2 + mB[13] - cy;
            v2z = mB[2] * c0 + mB[6] * c1 + mB[10] * c2 + mB[14] - cz;

            ea[0] = v1x - v0x; ea[1] = v1y - v0y; ea[2] = v1z - v0z;
            ea[3] = v2x - v1x; ea[4] = v2y - v1y; ea[5] = v2z - v1z;
            ea[6] = v0x - v2x; ea[7] = v0y - v2y; ea[8] = v0z - v2z;

            bestPen = 0;

            //1) 삼각형 법선
            const fnx = ea[1] * ea[5] - ea[2] * ea[4];
            const fny = ea[2] * ea[3] - ea[0] * ea[5];
            const fnz = ea[0] * ea[4] - ea[1] * ea[3];
            if (TestAxis(fnx, fny, fnz) == false) continue;

            //2) 박스의 3축
            if (TestAxis(u0x, u0y, u0z) == false) continue;
            if (TestAxis(u1x, u1y, u1z) == false) continue;
            if (TestAxis(u2x, u2y, u2z) == false) continue;

            //3) 박스축 x 삼각형변 9개
            let sep = false;
            for (let i = 0; i < 3 && sep == false; ++i)
            {
                const aix = ua[i * 3], aiy = ua[i * 3 + 1], aiz = ua[i * 3 + 2];
                for (let j = 0; j < 3; ++j)
                {
                    const ejx = ea[j * 3], ejy = ea[j * 3 + 1], ejz = ea[j * 3 + 2];
                    if (TestAxis(aiy * ejz - aiz * ejy,
                        aiz * ejx - aix * ejz,
                        aix * ejy - aiy * ejx) == false)
                    {
                        sep = true;
                        break;
                    }
                }
            }
            if (sep) continue;
            if (bestPen <= 0) continue;

            const sx = bestX * bestPen, sy = bestY * bestPen, sz = bestZ * bestPen;

            //이미 쌓인 분리량으로 해결되지 않고 남은 만큼만 더한다.
            //축별 최댓값을 취하면 서로 다른 삼각형의 성분이 뒤섞여, 어느 면에도 맞지 않는
            //방향이 나온다(평평한 바닥의 y와 옆 경사면의 z가 합쳐져 옆으로 밀리는 식).
            //같은 평면의 삼각형이 여러 장이면 두 번째부터는 남는 게 없어 저절로 무시된다.
            hit = true;
            const sl = Math.sqrt(sx * sx + sy * sy + sz * sz);
            if (sl > 1e-9)
            {
                const ux = sx / sl, uy = sy / sl, uz = sz / sl;
                const remain = sl - (outX * ux + outY * uy + outZ * uz);
                if (remain > 0) { outX += ux * remain; outY += uy * remain; outZ += uz * remain; }
            }
        }

        if (hit == false) return null;

        //outX/Y/Z는 "박스가 빠져나갈 방향"이고 반환 규약은 A->B(파고든 방향)이라 부호를 뒤집는다
        const out = _push || new CVec3();
        out.x = -outX; out.y = -outY; out.z = -outZ;
        return out;
    }


    // static ColBoxBoxOBB(_boundA: CBound, _matA: CMat, _boundB: CBound, _matB: CMat, _push: CVec3 = null): CVec3 | null
    // {
    //     // ---- 1) POOL: 임시 벡터 준비 ----
    //     const a = {
    //         center: CPoolGeo.ProductV3(),
    //         axes: [CPoolGeo.ProductV3(), CPoolGeo.ProductV3(), CPoolGeo.ProductV3()],
    //         extents: CPoolGeo.ProductV3(),
    //         tmp: CPoolGeo.ProductV3(),
    //     };
    //     const b = {
    //         center: CPoolGeo.ProductV3(),
    //         axes: [CPoolGeo.ProductV3(), CPoolGeo.ProductV3(), CPoolGeo.ProductV3()],
    //         extents: CPoolGeo.ProductV3(),
    //         tmp: CPoolGeo.ProductV3(),
    //     };
    //     const t      = CPoolGeo.ProductV3(); // A->B 중심 벡터
    //     const bestAx = CPoolGeo.ProductV3(); // 최종 MTV 축(단위)
    //     const cross  = CPoolGeo.ProductV3(); // 교차축 재사용
    //     const mtv    = CPoolGeo.ProductV3(); // 결과 MTV
    //     const mtvAxW = CPoolGeo.ProductV3(); // 부호 조정용(재사용)

    //     const ReturnFun = () => {
    //         // recycle A
    //         CPoolGeo.RecycleV3(a.center);
    //         CPoolGeo.RecycleV3(a.axes[0]); CPoolGeo.RecycleV3(a.axes[1]); CPoolGeo.RecycleV3(a.axes[2]);
    //         CPoolGeo.RecycleV3(a.extents);
    //         CPoolGeo.RecycleV3(a.tmp);
    //         // recycle B
    //         CPoolGeo.RecycleV3(b.center);
    //         CPoolGeo.RecycleV3(b.axes[0]); CPoolGeo.RecycleV3(b.axes[1]); CPoolGeo.RecycleV3(b.axes[2]);
    //         CPoolGeo.RecycleV3(b.extents);
    //         CPoolGeo.RecycleV3(b.tmp);
    //         // others
    //         CPoolGeo.RecycleV3(t);
    //         CPoolGeo.RecycleV3(bestAx);
    //         CPoolGeo.RecycleV3(cross);
    //         CPoolGeo.RecycleV3(mtv);
    //         CPoolGeo.RecycleV3(mtvAxW);
    //     };

    //     // ---- 2) A, B의 center/axes/extents 세팅 (스케일 흡수) ----
    //     // A center
    //     CMath.V3MulFloat(CMath.V3AddV3(_boundA.mMax, _boundA.mMin, a.tmp), 0.5, a.tmp);
    //     CMath.V3MulMatCoordi(a.tmp, _matA, a.center);

    //     _matA.GetV3(0, a.axes[0]);
    //     _matA.GetV3(1, a.axes[1]);
    //     _matA.GetV3(2, a.axes[2]);

    //     _boundA.GetSize(a.extents); // full size (local AABB)
    //     a.extents.x *= 0.5 * CMath.V3Len(a.axes[0]);
    //     a.extents.y *= 0.5 * CMath.V3Len(a.axes[1]);
    //     a.extents.z *= 0.5 * CMath.V3Len(a.axes[2]);
    //     CMath.V3Nor(a.axes[0], a.axes[0]); CMath.V3Nor(a.axes[1], a.axes[1]); CMath.V3Nor(a.axes[2], a.axes[2]);

    //     // B center
    //     CMath.V3MulFloat(CMath.V3AddV3(_boundB.mMax, _boundB.mMin, b.tmp), 0.5, b.tmp);
    //     CMath.V3MulMatCoordi(b.tmp, _matB, b.center);

    //     _matB.GetV3(0, b.axes[0]);
    //     _matB.GetV3(1, b.axes[1]);
    //     _matB.GetV3(2, b.axes[2]);

    //     _boundB.GetSize(b.extents);
    //     b.extents.x *= 0.5 * CMath.V3Len(b.axes[0]);
    //     b.extents.y *= 0.5 * CMath.V3Len(b.axes[1]);
    //     b.extents.z *= 0.5 * CMath.V3Len(b.axes[2]);
    //     CMath.V3Nor(b.axes[0], b.axes[0]); CMath.V3Nor(b.axes[1], b.axes[1]); CMath.V3Nor(b.axes[2], b.axes[2]);

    //     // A->B
    //     CMath.V3SubV3(b.center, a.center, t);

    //     // ---- 3) SAT 검사 ----
    //     let minOverlap = Infinity;
    //     const EPS2 = 1e-12; // 교차축 길이 제곱 임계

    //     // 헬퍼: 반지름(projection half-length) 계산
    //     const radiusOn = (ext: CVec3, ax0: CVec3, ax1: CVec3, ax2: CVec3, axis: CVec3) =>
    //         ext.x * Math.abs(CMath.V3Dot(axis, ax0)) +
    //         ext.y * Math.abs(CMath.V3Dot(axis, ax1)) +
    //         ext.z * Math.abs(CMath.V3Dot(axis, ax2));

    //     // 축 검사 공통 루틴
    //     const testAxis = (axis: CVec3): boolean => {
    //         // proj
    //         const ra = radiusOn(a.extents, a.axes[0], a.axes[1], a.axes[2], axis);
    //         const rb = radiusOn(b.extents, b.axes[0], b.axes[1], b.axes[2], axis);
    //         const dist = Math.abs(CMath.V3Dot(t, axis));
    //         const overlap = ra + rb - dist;

    //         if (overlap <= 0) return false; // 분리 발견 → 충돌 아님

    //         if (overlap < minOverlap) {
    //             minOverlap = overlap;
    //             // MTV 방향: A -> B 바깥쪽
    //             // mtvAxW = axis * sign(dot(t,axis))
    //             mtvAxW.Import(axis);
                
    //             if (CMath.V3Dot(t, mtvAxW) < 0) CMath.V3MulFloat(mtvAxW, -1, mtvAxW);
    //             bestAx.Import(mtvAxW);
    //         }
    //         return true;
    //     };

    //     // 3.1 A의 3축, B의 3축
    //     if (!testAxis(a.axes[0])) { ReturnFun(); return null; }
    //     if (!testAxis(a.axes[1])) { ReturnFun(); return null; }
    //     if (!testAxis(a.axes[2])) { ReturnFun(); return null; }
    //     if (!testAxis(b.axes[0])) { ReturnFun(); return null; }
    //     if (!testAxis(b.axes[1])) { ReturnFun(); return null; }
    //     if (!testAxis(b.axes[2])) { ReturnFun(); return null; }

    //     // 3.2 교차축 9개 (즉시 계산/검사, 저장 없음)
    //     for (let i=0;i<3;i++){
    //         for (let j=0;j<3;j++){
    //             CMath.V3Cross(a.axes[i], b.axes[j], cross);
    //             // 거의 평행이면 스킵
    //             if (CMath.V3Dot(cross, cross) <= EPS2) continue;
    //             CMath.V3Nor(cross, cross);
    //             if (!testAxis(cross)) { ReturnFun(); return null; }
    //         }
    //     }

    //     // ---- 4) MTV 계산/반환 ----
    //     CMath.V3MulFloat(bestAx, minOverlap, mtv);

    //     const out = _push || new CVec3();
    //     out.Import(mtv);

    //     ReturnFun();
    //     return out;
    // }

    static Grad(_hash : number, _x : number, _y : number) 
    {
        return ((_hash & 1) == 0 ? _x : -_x) + ((_hash & 2) == 0 ? _y : -_y);
    }
    static perm : Array<number> = [
        151,160,137,91,90,15,
        131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
        190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
        88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
        77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
        102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
        135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
        5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
        223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
        129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
        251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
        49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
        138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,
        151
    ];
    static Noise(_x : number, _y : number) {
        var X = Math.floor(_x) & 0xff;
        var Y = Math.floor(_y) & 0xff;
        _x -= Math.floor(_x);
        _y -= Math.floor(_y);
        var u = _x * _x * _x * (_x * (_x * 6 - 15) + 10);
        var v = _y * _y * _y * (_y * (_y * 6 - 15) + 10);

        var A = (this.perm[X  ] + Y) & 0xff;
        var B = (this.perm[X+1] + Y) & 0xff;
        var r = CMath.FloatInterpolate(
            CMath.FloatInterpolate(this.Grad(this.perm[A  ], _x, _y  ), this.Grad(this.perm[B  ], _x-1, _y  ), u),
            CMath.FloatInterpolate(this.Grad(this.perm[A+1], _x, _y-1), this.Grad(this.perm[B+1], _x-1, _y-1), u), 
            v
        );
        return (1 + r) / 2;
    }
    static ClosesetPointOnPlane(_planeNor : CVec3, _planeDis : number, _point : CVec3) {
        let dis = CMath.V3Dot(_planeNor, _point) + _planeDis;
        return CMath.V3SubV3(_point, CMath.V3MulFloat(_planeNor, dis));
    }
    //0~1 전체 포지션에서 위치를 가져옴
    static WeightVec3(pa_vec : Array<CVec3>,pa_persent)
    {
        if(pa_vec.length==1)
            return pa_vec[0];
        if(Math.trunc(pa_persent)>=1)
            return pa_vec[pa_vec.length-1];
        if(pa_persent<0.00001)	pa_persent=0;

        var w=(pa_vec.length-1)*pa_persent;
        var s=Math.trunc(w);
        //w가 1에 극히 가까우면 w+1이 double 반올림으로 정확히 정수가 돼 배열 범위를 넘는다
        var e=Math.min(s+1,pa_vec.length-1);
        var p=w%1;
        var t0=CPoolGeo.ProductV3();
        var t1=CPoolGeo.ProductV3();
        CMath.V3MulFloat(pa_vec[s],1-p,t0);
        CMath.V3MulFloat(pa_vec[e],p,t1)
        var v=CMath.V3AddV3(t0,t1);
        CPoolGeo.RecycleV3(t0);
        CPoolGeo.RecycleV3(t1);
        
        return v;
        
    }
    static CubeVec3InLen(_bound : CBound,_posVec3:CVec3) : number //벡터, 직육면체 크기
	{
		//let radV3 = new CVec3();
		let radV3=CPoolGeo.ProductV3();
		let cuberad = CMath.V3MulFloat(_bound.GetSize(),0.5);
		radV3.x = CMath.RadianToDegree(Math.atan2(CMath.Abs(_posVec3.x),CMath.V3Len(new CVec3(0,CMath.Abs(_posVec3.y),CMath.Abs(_posVec3.z)))));
		radV3.y = CMath.RadianToDegree(Math.atan2(CMath.Abs(_posVec3.y),CMath.V3Len(new CVec3(CMath.Abs(_posVec3.x),0,CMath.Abs(_posVec3.z)))));
		radV3.z = CMath.RadianToDegree(Math.atan2(CMath.Abs(_posVec3.z),CMath.V3Len(new CVec3(CMath.Abs(_posVec3.x),CMath.Abs(_posVec3.y),0))));
		let len=CMath.V3Len(new CVec3(Math.sin(CMath.DegreeToRadian(radV3.x))*cuberad.x,Math.sin(CMath.DegreeToRadian(radV3.y))*cuberad.y,Math.sin(CMath.DegreeToRadian(radV3.z))*cuberad.z));
        CPoolGeo.RecycleV3(radV3);
		return len;
	}
}

//ColBoxTriMesh용 정점 평탄 배열 캐시.
//바운드마다 지연 생성하고 WeakMap에 둔다(바운드가 사라지면 같이 사라진다).
//무효화 판정이 까다롭다. mPos는 CVec3 "객체 참조"를 담고 있고, CPaint3D.FMatUpdate가
//mBound.MatCoordi(mLMat)로 그 객체를 제자리에서 변형한다. 메시 CI 바운드와 객체를 공유하므로
//크기만 보면 내용이 바뀐 걸 놓친다. 그래서 크기와 함께 몇 개 점을 표본으로 떠서 비교한다.
//변형이 항등이면 값이 그대로라 캐시를 계속 써도 맞고, 아니면 표본이 달라져 다시 만든다.
class CTriFlat
{
	public flat : Float64Array;
	public triCount : number;
	public sample : Float64Array;//표본 좌표 (인덱스 0, 1, 중간, 마지막)
}
const gTriFlatMap = new WeakMap<CBound, CTriFlat>();

function TriFlatSample(_list, _triCount : number, _out : Float64Array)
{
	const last = _triCount * 3 - 1;
	const idx = [0, 1, (last >> 1), last];
	for (let k = 0; k < 4; ++k)
	{
		const p = _list.Find(idx[k]).mF32A;
		_out[k * 3] = p[0]; _out[k * 3 + 1] = p[1]; _out[k * 3 + 2] = p[2];
	}
}
function TriFlatCache(_bound : CBound, _triCount : number) : Float64Array
{
	const list = _bound.mPos;
	let c = gTriFlatMap.get(_bound);
	if (c != null && c.triCount == _triCount)
	{
		//표본이 그대로면 캐시 유효
		const s = gTriFlatTmp;
		TriFlatSample(list, _triCount, s);
		let same = true;
		for (let k = 0; k < 12; ++k) { if (s[k] != c.sample[k]) { same = false; break; } }
		if (same) return c.flat;
	}

	if (c == null) { c = new CTriFlat(); gTriFlatMap.set(_bound, c); }
	c.triCount = _triCount;
	c.flat = new Float64Array(_triCount * 9);
	for (let t = 0; t < _triCount; ++t)
	{
		for (let j = 0; j < 3; ++j)
		{
			const p = list.Find(t * 3 + j).mF32A;
			const o = t * 9 + j * 3;
			c.flat[o] = p[0]; c.flat[o + 1] = p[1]; c.flat[o + 2] = p[2];
		}
	}
	c.sample = new Float64Array(12);
	TriFlatSample(list, _triCount, c.sample);
	return c.flat;
}
const gTriFlatTmp = new Float64Array(12);
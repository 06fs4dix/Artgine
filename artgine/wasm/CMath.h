#include <math.h>

#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <emscripten/console.h>
#include <wasm_simd128.h>
using namespace emscripten;


#include "Type.h"
#include "STL.h"
#include "CString.h"
#ifndef CMath_H
#define CMath_H
class CWatch
{
	CString toJSONStr()
	{
		return CString("");
	}
};
class CPlane
{
public:
	enum class eDir {
		Near=0,
		Far=4,
		Top=8,
		Bottom=12,
		Left=16,
		Right=20,
	};
};

class CVec3 : public CWatch
{
public:
	float* m_F32A;
	bool m_ref=false;
	

	CVec3(const CVec3& _v) 
	{
		
		if(_v.m_ref)
		{
			m_F32A = _v.m_F32A;
		}
		else
		{
			m_F32A = new float[3];
			m_F32A[0]=_v.m_F32A[0];
			m_F32A[1]=_v.m_F32A[1];
			m_F32A[2]=_v.m_F32A[2];

		}
		
		

		

	}
	CVec3() {
		m_F32A = new float[3]{0,0,0};
		m_ref=false;
	}

	CVec3(float x, float y, float z) {
		m_F32A = new float[3]{x,y,z};
		m_ref=false;
	}

	CVec3(float* _ptr) 
	{
		m_F32A = _ptr;
		m_ref=true;
	}
	~CVec3()
	{
		if(m_ref==false)	delete m_F32A;
		m_F32A=null;
	}

	bool Equel(const CVec3& _tar) const {
		return m_F32A[0]==_tar.m_F32A[0]&&m_F32A[1]==_tar.m_F32A[1]&&m_F32A[2]==_tar.m_F32A[2]; 
	}

	float& operator[](int i) {
		return m_F32A[i];
	}

	float operator[](int i) const {
		return m_F32A[i];
	}

	void CopyImport(float * _tar) const {
		m_F32A[0] = _tar[0];
		m_F32A[1] = _tar[1];
		m_F32A[2] = _tar[2];
	}
	void CopyImport(const CVec3& _tar) const {
		m_F32A[0] = _tar.m_F32A[0];
		m_F32A[1] = _tar.m_F32A[1];
		m_F32A[2] = _tar.m_F32A[2];
	}
	CString toJSONStr()
	{
		CString str=CString("{\"class\":\"CVec3\",\"m_F32A\":[");
		str+=CString(m_F32A[0])+",";
		str+=CString(m_F32A[1])+",";
		str+=CString(m_F32A[2]);
		str+="]}";
		return str;
	}
};
class CBound
{
	public:
	enum eType
	{
		Box=0,
		Sphere=1,
		Polytope=2,
		Voxel=3,
		Null=4,
	};
	CVec3 min;
	CVec3 max;
	int boundType=eType::Null;
	
	CString toJSONStr()
	{
		
		CString str=CString("{\"class\":\"CBound\",");
		str+="\"min\":";
		str+=this->min.toJSONStr();
		str+=",";
		str+="\"max\":";
		str+=this->max.toJSONStr();
		str+=",";
		str+=CString("\"boundType\":")+CString(this->boundType);
		str+="}";
	

		return str;
	}
};
class CMath
{
public:
    static void V3MulV3(float * _a,float * _b,float * _c)
	{
        _c[0]=_a[0]*_b[0];
        _c[1]=_a[1]*_b[1];
        _c[2]=_a[2]*_b[2];
	
	}
	static void V3AddV3(float * _a,float * _b,float * _c)
	{
	
        _c[0]=_a[0]+_b[0];
        _c[1]=_a[1]+_b[1];
        _c[2]=_a[2]+_b[2];
    
	}
	static void V3SubV3(float * _a,float * _b,float * _c)
	{

        _c[0]=_a[0]-_b[0];
        _c[1]=_a[1]-_b[1];
        _c[2]=_a[2]-_b[2];
	
	}
	static void V3MulFloat(float * _a,float _b,float * _c)
	{
        _c[0]=_a[0]*_b;
        _c[1]=_a[1]*_b;
        _c[2]=_a[2]*_b;	
    }
	static void MatInvert(float *pa_val1,float *dst)
	{
		float tmp[12];
		float src[16];
		float det=0.0;
		
	
		for (int i = 0; i < 4; i++) {
			src[i]        = pa_val1[i*4+0];
			src[i + 4]    = pa_val1[i*4+1];
			src[i + 8]    = pa_val1[i*4+2];
			src[i + 12]   = pa_val1[i*4+3];
			
			tmp[i]        = 0;
			tmp[i + 4]    = 0;
			tmp[i + 8]    = 0;
		}
		
		tmp[0]  = src[10] * src[15];
		tmp[1]  = src[11] * src[14];
		tmp[2]  = src[9]  * src[15];
		tmp[3]  = src[11] * src[13];
		tmp[4]  = src[9]  * src[14];
		tmp[5]  = src[10] * src[13];
		tmp[6]  = src[8]  * src[15];
		tmp[7]  = src[11] * src[12];
		tmp[8]  = src[8]  * src[14];
		tmp[9]  = src[10] * src[12];
		tmp[10] = src[8]  * src[13];
		tmp[11] = src[9]  * src[12];
		
		dst[0]  = tmp[0]*src[5] + tmp[3]*src[6] + tmp[4]*src[7];
		dst[0] -= tmp[1]*src[5] + tmp[2]*src[6] + tmp[5]*src[7];
		dst[1]  = tmp[1]*src[4] + tmp[6]*src[6] + tmp[9]*src[7];
		dst[1] -= tmp[0]*src[4] + tmp[7]*src[6] + tmp[8]*src[7];
		dst[2]  = tmp[2]*src[4] + tmp[7]*src[5] + tmp[10]*src[7];
		dst[2] -= tmp[3]*src[4] + tmp[6]*src[5] + tmp[11]*src[7];
		dst[3]  = tmp[5]*src[4] + tmp[8]*src[5] + tmp[11]*src[6];
		dst[3] -= tmp[4]*src[4] + tmp[9]*src[5] + tmp[10]*src[6];
		dst[4]  = tmp[1]*src[1] + tmp[2]*src[2] + tmp[5]*src[3];
		dst[4] -= tmp[0]*src[1] + tmp[3]*src[2] + tmp[4]*src[3];
		dst[5]  = tmp[0]*src[0] + tmp[7]*src[2] + tmp[8]*src[3];
		dst[5] -= tmp[1]*src[0] + tmp[6]*src[2] + tmp[9]*src[3];
		dst[6]  = tmp[3]*src[0] + tmp[6]*src[1] + tmp[11]*src[3];
		dst[6] -= tmp[2]*src[0] + tmp[7]*src[1] + tmp[10]*src[3];
		dst[7]  = tmp[4]*src[0] + tmp[9]*src[1] + tmp[10]*src[2];
		dst[7] -= tmp[5]*src[0] + tmp[8]*src[1] + tmp[11]*src[2];
		
		tmp[0]  = src[2]*src[7];
		tmp[1]  = src[3]*src[6];
		tmp[2]  = src[1]*src[7];
		tmp[3]  = src[3]*src[5];
		tmp[4]  = src[1]*src[6];
		tmp[5]  = src[2]*src[5];
		tmp[6]  = src[0]*src[7];
		tmp[7]  = src[3]*src[4];
		tmp[8]  = src[0]*src[6];
		tmp[9]  = src[2]*src[4];
		tmp[10] = src[0]*src[5];
		tmp[11] = src[1]*src[4];
		
		dst[8]  = tmp[0]*src[13] + tmp[3]*src[14] + tmp[4]*src[15];
		dst[8] -= tmp[1]*src[13] + tmp[2]*src[14] + tmp[5]*src[15];
		dst[9]  = tmp[1]*src[12] + tmp[6]*src[14] + tmp[9]*src[15];
		dst[9] -= tmp[0]*src[12] + tmp[7]*src[14] + tmp[8]*src[15];
		dst[10] = tmp[2]*src[12] + tmp[7]*src[13] + tmp[10]*src[15];
		dst[10]-= tmp[3]*src[12] + tmp[6]*src[13] + tmp[11]*src[15];
		dst[11] = tmp[5]*src[12] + tmp[8]*src[13] + tmp[11]*src[14];
		dst[11]-= tmp[4]*src[12] + tmp[9]*src[13] + tmp[10]*src[14];
		dst[12] = tmp[2]*src[10] + tmp[5]*src[11] + tmp[1]*src[9];
		dst[12]-= tmp[4]*src[11] + tmp[0]*src[9] + tmp[3]*src[10];
		dst[13] = tmp[8]*src[11] + tmp[0]*src[8] + tmp[7]*src[10];
		dst[13]-= tmp[6]*src[10] + tmp[9]*src[11] + tmp[1]*src[8];
		dst[14] = tmp[6]*src[9] + tmp[11]*src[11] + tmp[3]*src[8];
		dst[14]-= tmp[10]*src[11] + tmp[2]*src[8] + tmp[7]*src[9];
		dst[15] = tmp[10]*src[10] + tmp[4]*src[8] + tmp[9]*src[9];
		dst[15]-= tmp[8]*src[9] + tmp[11]*src[10] + tmp[5]*src[8];
		
		det=src[0]*dst[0]+src[1]*dst[1]+src[2]*dst[2]+src[3]*dst[3];
		
		det = 1/det;
		for (int j = 0; j < 4; j++)
		{
			dst[j*4+0]*=det;
			dst[j*4+1]*=det;
			dst[j*4+2]*=det;
			dst[j*4+3]*=det;
		}
	
	}
	static void MatMulSIMD(const float *a, const float *b, float *dst)
	{
		v128_t b0 = wasm_v128_load(&b[0]);
		v128_t b1 = wasm_v128_load(&b[4]);
		v128_t b2 = wasm_v128_load(&b[8]);
		v128_t b3 = wasm_v128_load(&b[12]);

		for (int i = 0; i < 4; i++) {
			v128_t a_row = wasm_v128_load(&a[i * 4]);
			v128_t res0 = wasm_f32x4_splat(((float*)&a_row)[0]);
			v128_t res1 = wasm_f32x4_splat(((float*)&a_row)[1]);
			v128_t res2 = wasm_f32x4_splat(((float*)&a_row)[2]);
			v128_t res3 = wasm_f32x4_splat(((float*)&a_row)[3]);

			v128_t mul0 = wasm_f32x4_mul(res0, b0);
			v128_t mul1 = wasm_f32x4_mul(res1, b1);
			v128_t mul2 = wasm_f32x4_mul(res2, b2);
			v128_t mul3 = wasm_f32x4_mul(res3, b3);

			v128_t sum01 = wasm_f32x4_add(mul0, mul1);
			v128_t sum23 = wasm_f32x4_add(mul2, mul3);
			v128_t sum   = wasm_f32x4_add(sum01, sum23);

			wasm_v128_store(&dst[i * 4], sum);
		}
	}
	static void MatMul(float * a,float * b,float * dst)
	{
		const float  a00 = b[0];
		const float  a01 = b[1];
		const float  a02 = b[2];
		const float  a03 = b[3];
		const float  a10 = b[ 4 + 0];
		const float  a11 = b[ 4 + 1];
		const float  a12 = b[ 4 + 2];
		const float  a13 = b[ 4 + 3];
		const float  a20 = b[ 8 + 0];
		const float  a21 = b[ 8 + 1];
		const float  a22 = b[ 8 + 2];
		const float  a23 = b[ 8 + 3];
		const float  a30 = b[12 + 0];
		const float  a31 = b[12 + 1];
		const float  a32 = b[12 + 2];
		const float  a33 = b[12 + 3];
		const float  b00 = a[0];
		const float  b01 = a[1];
		const float  b02 = a[2];
		const float  b03 = a[3];
		const float  b10 = a[ 4 + 0];
		const float  b11 = a[ 4 + 1];
		const float  b12 = a[ 4 + 2];
		const float  b13 = a[ 4 + 3];
		const float  b20 = a[ 8 + 0];
		const float  b21 = a[ 8 + 1];
		const float  b22 = a[ 8 + 2];
		const float  b23 = a[ 8 + 3];
		const float  b30 = a[12 + 0];
		const float  b31 = a[12 + 1];
		const float  b32 = a[12 + 2];
		const float  b33 = a[12 + 3];

		dst[ 0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
		dst[ 1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
		dst[ 2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
		dst[ 3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
		dst[ 4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
		dst[ 5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
		dst[ 6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
		dst[ 7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
		dst[ 8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
		dst[ 9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
		dst[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
		dst[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
		dst[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
		dst[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
		dst[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
		dst[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;
	}
	static float V3Len(float * _a)
	{
		return sqrt(_a[0]*_a[0]+_a[1]*_a[1]+_a[2]*_a[2]); 
	}
	static void V3Nor(float * _a,float *_b)
	{
		
		
		if (_a[0]==0 && _a[1]==0 && _a[2]==0)
		{
            _b[0]=0;_b[1]=-1;_b[2]=0;
        }
		var dummy=CMath::V3Len(_a);
		
		
        _b[0]=_a[0]/dummy;
        _b[1]=_a[1]/dummy;
        _b[2]=_a[2]/dummy;
			
	}
	static float V3Dot(const CVec3& _a,const CVec3& _b)
	{
		return _a[0]*_b[0]+_a[1]*_b[1]+_a[2]*_b[2];
	}
	
	static void V3Cross(float * _a,float * _b,float * _c)
	{
	
        _c[0]= _a[1] * _b[2] - _a[2] * _b[1];
        _c[1]= _a[2] * _b[0] - _a[0] * _b[2];
        _c[2]= _a[0] * _b[1] - _a[1] * _b[0];

	}
	static float V3Distance(float * _a,float * _b)
	{
		float r[3];
		CMath::V3SubV3(_a, _b,r);
		return CMath::V3Len(r);
	}

    static float PlaneVec3DotCoordinate(float * pa_plane ,int _dir,float* _pos)
    {
        float v[3];
		v[0]=pa_plane[_dir+0];
		v[1]=pa_plane[_dir+1];
		v[2]=pa_plane[_dir+2];
		float dot=CMath::V3Dot(v,_pos) + pa_plane[_dir+3];
		return dot;
    }
	static bool PlaneSphereInsideSIMD(float* pa_plane,float* pa_position, float pa_radius)
	{
		float posArr[4] = {pa_position[0], pa_position[1], pa_position[2], 0.0f};
		v128_t pos = wasm_v128_load(posArr);
	
		{
			float* plane = &pa_plane[0];
			float normalArr[4] = {plane[0], plane[1], plane[2], 0.0f};
			v128_t normal = wasm_v128_load(normalArr);
			v128_t mul = wasm_f32x4_mul(normal, pos);
			float mulArr[4];
			wasm_v128_store(mulArr, mul);
			float dot = mulArr[0] + mulArr[1] + mulArr[2] + plane[3];
			if (dot < -pa_radius)
				return false;
		}
		{
			float* plane = &pa_plane[4];
			float normalArr[4] = {plane[0], plane[1], plane[2], 0.0f};
			v128_t normal = wasm_v128_load(normalArr);
			v128_t mul = wasm_f32x4_mul(normal, pos);
			float mulArr[4];
			wasm_v128_store(mulArr, mul);
			float dot = mulArr[0] + mulArr[1] + mulArr[2] + plane[3];
			if (dot < -pa_radius)
				return false;
		}
		{
			float* plane = &pa_plane[8];
			float normalArr[4] = {plane[0], plane[1], plane[2], 0.0f};
			v128_t normal = wasm_v128_load(normalArr);
			v128_t mul = wasm_f32x4_mul(normal, pos);
			float mulArr[4];
			wasm_v128_store(mulArr, mul);
			float dot = mulArr[0] + mulArr[1] + mulArr[2] + plane[3];
			if (dot < -pa_radius)
				return false;
		}
		{
			float* plane = &pa_plane[12];
			float normalArr[4] = {plane[0], plane[1], plane[2], 0.0f};
			v128_t normal = wasm_v128_load(normalArr);
			v128_t mul = wasm_f32x4_mul(normal, pos);
			float mulArr[4];
			wasm_v128_store(mulArr, mul);
			float dot = mulArr[0] + mulArr[1] + mulArr[2] + plane[3];
			if (dot < -pa_radius)
				return false;
		}
		{
			float* plane = &pa_plane[16];
			float normalArr[4] = {plane[0], plane[1], plane[2], 0.0f};
			v128_t normal = wasm_v128_load(normalArr);
			v128_t mul = wasm_f32x4_mul(normal, pos);
			float mulArr[4];
			wasm_v128_store(mulArr, mul);
			float dot = mulArr[0] + mulArr[1] + mulArr[2] + plane[3];
			if (dot < -pa_radius)
				return false;
		}
		{
			float* plane = &pa_plane[20];
			float normalArr[4] = {plane[0], plane[1], plane[2], 0.0f};
			v128_t normal = wasm_v128_load(normalArr);
			v128_t mul = wasm_f32x4_mul(normal, pos);
			float mulArr[4];
			wasm_v128_store(mulArr, mul);
			float dot = mulArr[0] + mulArr[1] + mulArr[2] + plane[3];
			if (dot < -pa_radius)
				return false;
		}
	
		return true;
	}
	static bool PlaneSphereInside(float* pa_plane,float* pa_position,float pa_radius)
	{		
		float L_dist = 0.f;

		L_dist = CMath::PlaneVec3DotCoordinate(pa_plane,(int)CPlane::eDir::Left, pa_position);
		
		if(L_dist<-pa_radius)
			return false;
	

		L_dist = CMath::PlaneVec3DotCoordinate(pa_plane,(int)CPlane::eDir::Right, pa_position);
	
		if(L_dist<-pa_radius)
			return false;
		
		L_dist = CMath::PlaneVec3DotCoordinate(pa_plane,(int)CPlane::eDir::Bottom, pa_position);
	
		if(L_dist<-pa_radius)
			return false;
		
		L_dist = CMath::PlaneVec3DotCoordinate(pa_plane,(int)CPlane::eDir::Top, pa_position);
	
		if(L_dist<-pa_radius)
			return false;
	
		
	
		L_dist = CMath::PlaneVec3DotCoordinate(pa_plane,(int)CPlane::eDir::Near, pa_position);
		if(L_dist<-pa_radius)
			return false;
		

		L_dist = CMath::PlaneVec3DotCoordinate(pa_plane,(int)CPlane::eDir::Far, pa_position);
		
		if(L_dist<-pa_radius)
			return false;
		
		
		

		return true;
	}

	
	static bool RayBoxIS(const CVec3& _min, const CVec3& _max, const CVec3& _dir, CVec3& _pos, const CVec3& _org) {
		const float d_EPSILON = 1e-6;

		// RayBox 내부에 있는지 판단
		bool inside = true;
		float pBoxMin[3] = {_min.m_F32A[0], _min.m_F32A[1], _min.m_F32A[2]};
		float pBoxMax[3] = {_max.m_F32A[0], _max.m_F32A[1], _max.m_F32A[2]};

		// Bounding box가 유효한지 확인하고, 최소/최대 값을 교환
		for (int i = 0; i < 3; i++) {
			if (pBoxMin[i] > pBoxMax[i]) {
				float temp = pBoxMin[i];
				pBoxMin[i] = pBoxMax[i];
				pBoxMax[i] = temp;
			}
		}

		// Ray의 시작점이 Box 안에 있으면 바로 반환
		for (int i = 0; i < 3; i++) {
			if (_org[i] < pBoxMin[i] || _org[i] > pBoxMax[i]) {
				inside = false;
				break;
			}
		}

		if (inside) {
			_pos[0] = _org[0];
			_pos[1] = _org[1];
			_pos[2] = _org[2];
			return true;
		}

		// 교차점 계산을 위한 변수들
		float maxT[3] = { -1.0f, -1.0f, -1.0f };
		float candidatePlane[3];

		// 각 축에 대해 교차점을 계산
		for (int i = 0; i < 3; i++) {
			if (_dir[i] > d_EPSILON || _dir[i] < -d_EPSILON) {
				candidatePlane[i] = (_org[i] < pBoxMin[i]) ? pBoxMin[i] : pBoxMax[i];
				maxT[i] = (candidatePlane[i] - _org[i]) / _dir[i];
			}
		}

		// 가장 먼 교차점 찾기
		int whichPlane = 0;
		for (int i = 1; i < 3; i++) {
			if (maxT[whichPlane] < maxT[i]) {
				whichPlane = i;
			}
		}

		// 유효한 교차점이 없다면 false
		if (maxT[whichPlane] < 0.0f) {
			return false;
		}

		// 교차점 계산
		float pIntersect[3];
		for (int i = 0; i < 3; i++) {
			if (i != whichPlane) {
				pIntersect[i] = _org[i] + maxT[whichPlane] * _dir[i];
				if (pIntersect[i] < pBoxMin[i] || pIntersect[i] > pBoxMax[i]) {
					return false;
				}
			} else {
				pIntersect[i] = candidatePlane[i];
			}
		}

		// 교차점 저장
		_pos[0] = pIntersect[0];
		_pos[1] = pIntersect[1];
		_pos[2] = pIntersect[2];
		return true;

		/*
		const float d_EPSILON = 1e-6;

		bool inside = true;
		float quadrant[3] = {0.0, 0.0, 0.0};
		int i;
		int whichPlane;
		float maxT[3] = {0.0,0.0,0.0};
		float candidatePlane[3] = {0.0,0.0,0.0};

		float pBoxMin[3] = {_min[0], _min[1], _min[2]};
		float pBoxMax[3] = {_max[0], _max[1], _max[2]};

		if(pBoxMin[0] > pBoxMax[0]) {
			pBoxMin[0] = _max[0];
			pBoxMax[0] = _min[0];
		}
		if(pBoxMin[1] > pBoxMax[1]) {
			pBoxMin[1] = _max[1];
			pBoxMax[1] = _min[1];
		}
		if(pBoxMin[2] > pBoxMax[2]) {
			pBoxMin[2] = _max[2];
			pBoxMax[2] = _min[2];
		}

		float pIntersect[3] = {0.0,0.0,0.0};

		for(i = 0; i < 3; i++) {
			if(_org[i] < pBoxMin[i]) {
				quadrant[i] = 1; // RayBoxLeft
				candidatePlane[i] = pBoxMin[i];
				inside = false;
			}
			else if(_org[i] > pBoxMax[i]) {
				quadrant[i] = 0; //RayBoxRight
				candidatePlane[i] = pBoxMax[i];
				inside = false;
			}
			else {
				quadrant[i] = 2; //RayBoxMiddle
			}
		}

		if(inside) {
			_pos[0] = _org[0];
			_pos[1] = _org[1];
			_pos[2] = _org[2];
			return true;
		}

		for(i = 0; i < 3; i++) {
			if(quadrant[i] != 2 && (_dir[i] > d_EPSILON || _dir[i] < -d_EPSILON)) {
				maxT[i] = (candidatePlane[i] - _org[i]) / _dir[i];
			}
			else {
				maxT[i] = -1.0;
			}
		}

		whichPlane = 0;
		for(i = 1; i < 3; i++) {
			if(maxT[whichPlane] < maxT[i]) {
				whichPlane = i;
			}
		}

		if(maxT[whichPlane] < 0.0) {
			return false;
		}

		for(i = 0; i < 3; i++) {
			if(whichPlane != i) {
				pIntersect[i] = _org[i] + maxT[whichPlane] * _dir[i];
				if(pIntersect[i] < pBoxMin[i] || pIntersect[i] > pBoxMax[i]) {
					return false;
				}
			}
			else {
				pIntersect[i] = candidatePlane[i];
			}
		}
		_pos[0] = pIntersect[0];
		_pos[1] = pIntersect[1];
		_pos[2] = pIntersect[2];
		return true;
		*/
	}
};


#endif //CMath_H
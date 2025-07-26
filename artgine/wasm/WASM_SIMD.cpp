#include <stdio.h>
#include <math.h>




#include "EM.h"
#include "Type.h"
#include "STL.h"
#include "CMath.h"
#include "Checker.h"

extern "C" {

	EMSCRIPTEN_KEEPALIVE void Init(char * _path)
	{
		InitPro(_path);
	}
	
	EMSCRIPTEN_KEEPALIVE int Checker(int* _val)
	{
		return CheckerPro(_val[0]);
	}
	void EMSCRIPTEN_KEEPALIVE MatMemcpy(float* _a, float* _b) 
	{
		_a[0]=_b[0];
		_a[1]=_b[1];
		_a[2]=_b[2];
		_a[3]=_b[3];
		_a[4]=_b[4];
		_a[5]=_b[5];
		_a[6]=_b[6];
		_a[7]=_b[7];
		_a[8]=_b[8];
		_a[9]=_b[9];
		_a[10]=_b[10];
		_a[11]=_b[11];
		_a[12]=_b[12];
		_a[13]=_b[13];
		_a[14]=_b[14];
		_a[15]=_b[15];
		//memcpy(_a,_b,4*16);
	}
	EMSCRIPTEN_KEEPALIVE bool PlaneSphereInside(float* pa_plane,float* pa_position,float pa_radius) 
	{		
		return CMath::PlaneSphereInsideSIMD(pa_plane,pa_position,pa_radius);

	}
	EMSCRIPTEN_KEEPALIVE float V3Distance(float* _a,float* _b) 
	{		
		return CMath::V3Distance(_a,_b);

	}
	//절대 지우지 마라!!!!!!20250429
	// EMSCRIPTEN_KEEPALIVE float BoundMulMat(float* _tmin,float* _tmax,float* _omin,float* _omax,float * _mat,float *_center)
	// {
	// 	_tmin[0]=_omin[0]*_mat[0];
	// 	_tmin[1]=_omin[1]*_mat[5];
	// 	_tmin[2]=_omin[2]*_mat[10];
	// 	_tmax[0]=_omax[0]*_mat[0];
	// 	_tmax[1]=_omax[1]*_mat[5];
	// 	_tmax[2]=_omax[2]*_mat[10];
		

	// 	_tmin[0]+=_mat[12];
	// 	_tmin[1]+=_mat[13];
	// 	_tmin[2]+=_mat[14];

	// 	_tmax[0]+=_mat[12];
	// 	_tmax[1]+=_mat[13];
	// 	_tmax[2]+=_mat[14];

	// 	_center[0]=(_tmax[0] + _tmin[0])*0.5;
	// 	_center[1]=(_tmax[1] + _tmin[1])*0.5;
	// 	_center[2]=(_tmax[2] + _tmin[2])*0.5;

	// 	float maxX = fabs(_tmax[0] - _center[0]);
	// 	float maxY = fabs(_tmax[1] - _center[1]);
	// 	float maxZ = fabs(_tmax[2] - _center[2]);
	// 	if(maxX> maxY)
	// 	{
	// 		if(maxX>maxZ)
	// 			return maxX;
	// 		else
	// 			return maxZ;
	// 	}
	// 	if(maxY<maxZ)
	// 		return maxZ;
	// 	return maxY;
	// 	//return max(max(maxX, maxY), maxZ);
	// }
	
	EMSCRIPTEN_KEEPALIVE	float BoundMulMat(float* _tmin, float* _tmax, float* _omin, float* _omax, float* _mat, float* _center)
	{
		  // X, Y, Z 스케일만 따로 빼기
		  float scaleArr[4] = {_mat[0], _mat[5], _mat[10], 0.0f}; // 4번째 원소는 dummy
		  float transArr[4] = {_mat[12], _mat[13], _mat[14], 0.0f};
	  
		  v128_t scale = wasm_v128_load(scaleArr);
		  v128_t trans = wasm_v128_load(transArr);
	  
		  v128_t omin = wasm_v128_load(_omin);
		  v128_t omax = wasm_v128_load(_omax);
	  
		  // tmin = omin * scale + trans
		  v128_t tmin = wasm_f32x4_add(wasm_f32x4_mul(omin, scale), trans);
		  wasm_v128_store(_tmin, tmin);
	  
		  // tmax = omax * scale + trans
		  v128_t tmax = wasm_f32x4_add(wasm_f32x4_mul(omax, scale), trans);
		  wasm_v128_store(_tmax, tmax);
	  
		  // center = (tmin + tmax) * 0.5
		  v128_t center = wasm_f32x4_mul(wasm_f32x4_add(tmin, tmax), wasm_f32x4_splat(0.5f));
		  wasm_v128_store(_center, center);
	  
		  // max 찾기
		  v128_t delta = wasm_f32x4_abs(wasm_f32x4_sub(tmax, center));
		  float deltaArr[4];
		  wasm_v128_store(deltaArr, delta);
	  
		  float maxX = deltaArr[0];
		  float maxY = deltaArr[1];
		  float maxZ = deltaArr[2];
	  
		  if (maxX > maxY)
		  {
			  if (maxX > maxZ)
				  return maxX;
			  else
				  return maxZ;
		  }
		  if (maxY < maxZ)
			  return maxZ;
		  return maxY;
	}
	EMSCRIPTEN_KEEPALIVE void MatMul(float * a,float * b,float * dst)
	{
		CMath::MatMulSIMD(a,b,dst);
	}
	EMSCRIPTEN_KEEPALIVE void MatInvert(float * src,float * dst)
	{
		CMath::MatInvert(src,dst);
	}
	// EMSCRIPTEN_KEEPALIVE void OctreeInit(int ocMgrKey, float* _center, float* _half) 
	// {
	// 	while(g_ocVec.size() <= ocMgrKey) 
	// 	{
	// 		g_ocVec.push_back(COctreeMgr());
	// 	}

	// 	g_ocVec[ocMgrKey].Init(_center,_half);
	// }
	// EMSCRIPTEN_KEEPALIVE void OctreeBuild(int ocMgrKey,int _depth) 
	// {
	// 	g_ocVec[ocMgrKey].Build(_depth);
	// }

	// EMSCRIPTEN_KEEPALIVE void OctreeInsert(int ocMgrKey,int _id, float* _cen, float* _size,char*_layer) 
	// {
	// 	if(g_ocVec.size() > ocMgrKey)
	// 		g_ocVec[ocMgrKey].Insert(_id, _cen, _size,_layer);
		
	// }
	// EMSCRIPTEN_KEEPALIVE char const* OctreeGetBound(int ocMgrKey) 
	// {
	// 	//var bList=vector<CBound>();
    //     var que=vector<COctree*>();
    //     que.push_back(g_ocVec[ocMgrKey].m_oc);
	// 	CString str="";
        

    //     while(que.size()>0)
    //     {
    //         var pst=que.front();
	// 		que.erase(que.begin());
    //         if(pst==null)   continue;
	// 		if(str.length()>0)
	// 			str+=",";
	// 		str+=pst->m_bound.toJSONStr();
    //         //bList.push_back(pst->m_bound);
    //         for(int i=0;i<pst->m_childe.size();++i)
    //             que.push_back(pst->m_childe[i]);

    //     }
	// 	str=CString("[")+str+"]";
        
    //     return str.c_str();

	// }

	// EMSCRIPTEN_KEEPALIVE void OctreeInsideRay(int ocMgrKey, float* _dir, float* _pos, float* _org, int* _results) {
	// 	CVec3 pos(_pos);
	// 	int lastIndex = g_ocVec[ocMgrKey].m_oc->InsideRay(CVec3(_dir), pos, CVec3(_org), _results);
	// 	_results[lastIndex] = -1;
	// }

	// EMSCRIPTEN_KEEPALIVE void OctreeInsidePlane(int ocMgrKey, float* _plane, int* _results) {
	// 	int lastIndex = g_ocVec[ocMgrKey].m_oc->InsidePlane(_plane, _results);
	// 	_results[lastIndex] = -1;
	// }

	// EMSCRIPTEN_KEEPALIVE void OctreeInsideBox(int ocMgrKey, float* _bmin, float* _bmax, int* _results) {
		
	// 	int lastIndex=0;
	// 	g_ocVec[ocMgrKey].m_oc->InsideBox(CVec3(_bmin), CVec3(_bmax), _results,lastIndex);
	// 	_results[lastIndex] = -1;
	
	// }
	// EMSCRIPTEN_KEEPALIVE void OctreeAllInsideBoxCac(int ocMgrKey) {
		
	// 	//int lastIndex=g_ocVec[ocMgrKey].m_ocdPool.size();
	// 	// for(int i=0;i<g_ocVec[ocMgrKey].m_ocdPool.size();++i)
	// 	// {
	// 	// 	COctreeData * od=g_ocVec[ocMgrKey].m_ocdPool[i];
	// 	// 	CVec3 omin(od->m_center.m_F32A[0]-od->m_size.m_F32A[0]*0.5,
	// 	// 		od->m_center.m_F32A[1]-od->m_size.m_F32A[1]*0.5,
	// 	// 		od->m_center.m_F32A[2]-od->m_size.m_F32A[2]*0.5);
	// 	// 	CVec3 omax(od->m_center.m_F32A[0]+od->m_size.m_F32A[0]*0.5,
	// 	// 		od->m_center.m_F32A[1]+od->m_size.m_F32A[1]*0.5,
	// 	// 		od->m_center.m_F32A[2]+od->m_size.m_F32A[2]*0.5);
	// 	// 	g_ocVec[ocMgrKey].m_oc->InsideBox(omin,omax, _results,lastIndex);
	// 	// 	_results[i]=lastIndex;
	// 	// }
	// 	//cout<<"ocMgrKey"<< ocMgrKey<<endl;

	// 	if(ocMgrKey==2)
	// 	{
	// 		for(int i=0;i<g_ocVec[ocMgrKey].m_ocdPool.size();++i)
	// 		{
	// 			COctreeData * od=g_ocVec[ocMgrKey].m_ocdPool[i];
	// 			CAsync::Async(od);
	// 		}
	// 		CAsync::AwaitUpdate(0);
	// 	}
	// 	else
	// 	{
	// 		for(int i=0;i<g_ocVec[ocMgrKey].m_ocdPool.size();++i)
	// 		{
	// 			COctreeData * od=g_ocVec[ocMgrKey].m_ocdPool[i];
	// 			od->Update(0);
	// 		}
	// 	}

		
	// 	//std::cout<<ocMgrKey<<" OctreeAllInsideBox "<<endl;


		

	// 	//int lastIndex=g_ocVec[ocMgrKey].m_ocdPool.size();
	// 	// for(int i=0;i<g_ocVec[ocMgrKey].m_ocdPool.size();++i)
	// 	// {
	// 	// 	COctreeData * od=g_ocVec[ocMgrKey].m_ocdPool[i];
	// 	// 	od->Update(0);
	// 	// 	// for(int j=0;j<od->m_result.size();++j)
	// 	// 	// {
	// 	// 	// 	_results[lastIndex]=od->m_result[j]->m_id;
	// 	// 	// 	lastIndex++;
	// 	// 	// }
	// 	// 	// _results[i]=lastIndex;
	// 	// }
	// }
	// EMSCRIPTEN_KEEPALIVE void OctreeAllInsideBoxResult(int ocMgrKey,int pool,int* _results) {
		
	// 	int lastIndex=0;
	// 	COctreeData * od=g_ocVec[ocMgrKey].m_ocdPool[pool];
	// 	for(int j=0;j<od->m_result.size();++j)
	// 	{
	// 		_results[lastIndex]=od->m_result[j]->m_id;
	// 		lastIndex++;
	// 	}
	// 	_results[lastIndex]=-1;
	// }
	

}


//em++ %BUILD_PATH%/CWASM.cpp -o %BUILD_PATH%/WASM.html -s EXPORT_ES6 -lembind -sMALLOC=emmalloc -sEXPORTED_FUNCTIONS=['_malloc','_free'] -sEXPORTED_RUNTIME_METHODS=['UTF8ToString'] -std=c++2c -stdlib=libc++ -sALLOW_MEMORY_GROWTH=1 -O3 -msimd128 -flto
/*
EXPORT_ES6 : ex6모듈로 결과 나오기
-lembind : embind사용

-sMALLOC=emmalloc -sEXPORTED_FUNCTIONS=['_malloc','_free']
ㄴ메모리 할당사용

-sALLOW_MEMORY_GROWTH
ㄴ메모리 부족시 알아서 늘려줌

-std=c++2c -stdlib=libc++
ㄴc++최신 기능 사용

//https://chromewebstore.google.com/detail/cc++-devtools-support-dwa/pdcpmagijalfljmkmjngeonclgbbannb
-g 디버깅시 넣기

-O2최적화 레벨

navigator.hardwareConcurrency
-sPTHREAD_POOL_SIZE=1 -pthread
스레드 사용

-flto 링커 타임 최적화

-msimd128 (SIMD 활성화)

*/
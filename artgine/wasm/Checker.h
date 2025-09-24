#include "STL.h"
#include "FetchAndHash.h"

const int CModal_Open_True=10000;
const int CModal_Open_False=10001;
//const int CBasic_Open=10000;


const int cFrame=1;
#include <emscripten/heap.h>  // 필수
int gErrorCount=1;
void StopProcess()
{
    gErrorCount*=2;
    while (gErrorCount)
    {
        size_t heapSize = emscripten_get_heap_size();   // 현재 heap 크기 구함
        emscripten_resize_heap(heapSize * 2);           // 두 배로 늘림
        
    }
}
bool gLock=false;
int gLockCount=0;
bool hashChk=true;
void Loop()
{
    // int hash=FetchAllHash();
	// if(hashChk && hash!=0)
	// {
	// 	cout<<"chk : "<<hash<<endl;
	// 	hashChk=false;
	// }
    
    if(FetchgCheck()==true)
    {
        cout<<"error : 1"<<endl;
        StopProcess();
    }
	if(gLock && gLockCount>60*60*10)
	{
		cout<<"error : 2"<<endl;
		StopProcess();
	}
	//StopProcess();
	
    
	//cout<<"Loop"<<FetchAllHash()<<endl;
}
void InitPro(char * _path,bool _lock)
{
    gLock=_lock;

    
    SourceCWASMChk(string(_path)+"artgine/basic_impl/CModal.js",{"CWASM","CPath","Bootstrap","CDomFactory","CEvent"});
    SourceCWASMChk(string(_path)+"artgine/canvas_imple/component/CCollider.js",{"CWASM"});

    
    VersionChk("https://06fs4dix.github.io/Artgine/artgine/version.json","1");
}
int CheckerPro(int val,bool _lock)
{
	gLock=_lock;
    Loop();
    //printf("Received value: %d\n", _val[0]);  // 디버깅 추가
    if(CModal_Open_True==val)	return 1;
    if(CModal_Open_False==val)	return 0;
    else	return 1;
    
    return 0;
}
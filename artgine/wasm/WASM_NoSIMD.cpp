#include "Checker.h"

extern "C" {
	EMSCRIPTEN_KEEPALIVE void Init(char * _path)
	{
		InitPro(_path,false);
	}
	
	EMSCRIPTEN_KEEPALIVE int Checker(int* _val)
	{
		return CheckerPro(_val[0],false);
	}
}
/*
em++ %BUILD_PATH%/Protector.cpp -o %BUILD_PATH%/Protector.html -s EXPORT_ES6 -lembind -sMALLOC=emmalloc -sEXPORTED_FUNCTIONS=['_malloc','_free'] -sEXPORTED_RUNTIME_METHODS=['UTF8ToString'] -std=c++2c -stdlib=libc++ -O3  -flto

*/
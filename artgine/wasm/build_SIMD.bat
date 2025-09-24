@echo off
echo =====Start=====
:: SDK 및 빌드 경로 설정
::set SDK_PATH=C:\Users\JHPC\Desktop\Artgine\WebContent\big\artgine\wasm\emsdk
::set BUILD_PATH=C:\Users\JHPC\Desktop\Artgine\WebContent\artgine\wasm
set SDK_PATH=E:\svn\Artgine\WebContent\big\artgine\wasm\emsdk
set BUILD_PATH=E:\svn\Artgine\WebContent\artgine\wasm


:: SDK 폴더로 이동
cd /d %SDK_PATH%

:: EMSDK 활성화 및 환경 설정
call emsdk activate latest
call emsdk_env.bat

:: 디버깅 비활성화
set EMCC_DEBUG=0


:: 컴파일 수행
em++ %BUILD_PATH%\WASM_SIMD.cpp -o %BUILD_PATH%\WASM_SIMD.html ^
  -s EXPORT_ES6 ^
  -lembind ^
  -sMALLOC=emmalloc ^
  -sEXPORTED_FUNCTIONS=['_malloc','_free'] ^
  -sEXPORTED_RUNTIME_METHODS=['UTF8ToString'] ^
  -std=c++2c ^
  -stdlib=libc++ ^
  -sALLOW_MEMORY_GROWTH=1 ^
  -O3 ^
  -msimd128 ^
  -sFETCH=1 ^
  -flto

echo ===== End =====
pause
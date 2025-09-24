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
em++ %BUILD_PATH%\WASM_NoSIMD.cpp -o %BUILD_PATH%\WASM_NoSIMD.html ^
  -s EXPORT_ES6 ^
  -sEXPORTED_RUNTIME_METHODS=['UTF8ToString'] ^
  -std=c++2c ^
  -stdlib=libc++ ^
  -O3 ^
  -sFETCH=1 ^
  -sMALLOC=emmalloc -sEXPORTED_FUNCTIONS=['_malloc','_free'] ^
  -s INITIAL_MEMORY=10485760 ^
  -s ALLOW_MEMORY_GROWTH=1 ^

echo ===== End =====
pause

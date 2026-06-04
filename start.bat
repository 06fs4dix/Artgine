@echo off
where node >nul 2>nul

if %ERRORLEVEL% NEQ 0 (
    echo Node.js가 설치되어 있지 않습니다. 다운로드 페이지를 여는 중...
    start https://nodejs.org/
    pause
    exit /b
)

where git >nul 2>nul

if %ERRORLEVEL% NEQ 0 (
    echo Git이 설치되어 있지 않습니다. 다운로드 페이지를 여는 중...
    start https://git-scm.com/downloads
    pause
    exit /b
)
if not exist "desktop\Start.js" (
    echo desktop/Start.js not found. Installing submodules...
    git submodule update --init --recursive
)
echo Start... desktop/Start.js
node desktop/Start.js
pause
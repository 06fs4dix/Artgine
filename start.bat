@echo off
where node >nul 2>nul

if %ERRORLEVEL% NEQ 0 (
    echo Node.js가 설치되어 있지 않습니다. 다운로드 페이지를 여는 중...
    start https://nodejs.org/
    pause
    exit /b
)

echo Start... App/Start.js
node App\Start.js
pause
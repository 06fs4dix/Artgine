@echo off
where node >nul 2>nul

if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed. Opening download page...
    start https://nodejs.org/
    pause
    exit /b
)

where git >nul 2>nul

if %ERRORLEVEL% NEQ 0 (
    echo Git is not installed. Opening download page...
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

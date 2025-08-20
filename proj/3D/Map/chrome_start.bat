@echo off
title Chrome CORS Disabled
color 0A

echo ================================================
echo Starting Chrome with CORS disabled
echo ================================================
echo.

REM Check existing Chrome processes
tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I /N "chrome.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Warning: Chrome is already running.
    echo Please close all Chrome windows and try again.
    echo.
    pause
    exit /b 1
)

REM Find Chrome path
set CHROME_PATH=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
) else (
    echo Error: Chrome not found.
    echo Opening Chrome download page...
    start https://www.google.com/chrome/
    pause
    exit /b 1
)

echo Starting Chrome...
echo HTML file: Map.html
"%CHROME_PATH%" --disable-web-security --disable-features=VizDisplayCompositor --user-data-dir="%TEMP%\chrome_dev" --allow-running-insecure-content --disable-extensions --no-sandbox --ignore-certificate-errors --disable-site-isolation-trials "file:///%~dp0Map.html"

echo Chrome closed.
pause
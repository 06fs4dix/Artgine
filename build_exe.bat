@echo off

echo [STEP] Electron package...

call electron-packager . Artgine ^
--platform=win32 ^
--arch=x64 ^
--overwrite ^
--ignore="\.vscode" ^
--ignore="/WEB-INF" ^
--ignore="/proj" ^
--ignore="/temp" ^
--ignore="/big" ^
--ignore="^(?!.*Basic\.ts$).*\.ts$" ^
--ignore="\.cpp$" ^
--ignore="\.h$"


echo gulp
call npx gulp


::REM 복사할 대상 폴더 생성
mkdir ".\Artgine-win32-x64\artgine"
mkdir ".\Artgine-win32-x64\proj"
mkdir ".\Artgine-win32-x64\plugin"

::REM 상대경로 복사
robocopy temp ".\Artgine-win32-x64\artgine" /E /NFL /NDL /NJH /NJS
robocopy proj ".\Artgine-win32-x64\proj" /E /NFL /NDL /NJH /NJS
robocopy plugin ".\Artgine-win32-x64\plugin" /E /NFL /NDL /NJH /NJS
robocopy temp ".\Artgine-win32-x64\resources\app\artgine" /E /NFL /NDL /NJH /NJS
:: 복사할 설정 파일
copy /Y "tsconfig.json" ".\Artgine-win32-x64\"
copy /Y "package.json" ".\Artgine-win32-x64\"
copy /Y "package.bat" ".\Artgine-win32-x64\"
copy /Y "gulpfile.js" ".\Artgine-win32-x64\"

echo Success!
pause

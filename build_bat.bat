@echo off

echo gulp
call npx gulp


rmdir /S /Q ".\Artgine-script"


::REM 복사할 대상 폴더 생성
mkdir ".\Artgine-script"
mkdir ".\Artgine-script\artgine"

::REM 상대경로 복사
robocopy temp ".\Artgine-script\artgine" /E /NFL /NDL /NJH /NJS
robocopy proj ".\Artgine-script\proj" /E /NFL /NDL /NJH /NJS
robocopy plugin ".\Artgine-script\plugin" /E /NFL /NDL /NJH /NJS
robocopy App ".\Artgine-script\App" /E /NFL /NDL /NJH /NJS
robocopy .vscode ".\Artgine-script\.vscode" /E /NFL /NDL /NJH /NJS
robocopy script ".\Artgine-script\script" /E /NFL /NDL /NJH /NJS



:: 복사할 설정 파일
copy /Y "tsconfig.json" ".\Artgine-script\"
copy /Y "package.json" ".\Artgine-script\"
copy /Y "build_exe.bat" ".\Artgine-script\"
copy /Y "gulpfile.js" ".\Artgine-script\"
copy /Y "build_bat.bat" ".\Artgine-script\"
copy /Y "start.bat" ".\Artgine-script\"
copy /Y "LICENSE.txt" ".\Artgine-script\"
copy /Y "NOTICE.txt" ".\Artgine-script\"


echo Success!
pause

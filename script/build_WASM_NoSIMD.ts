import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SDK_PATH = 'E:\\MySvn\\java\\emsdk';
const BUILD_PATH = 'E:\\MySvn\\java\\java\\Artgine\\WebContent\\artgine\\wasm';
const OUTPUT_NAME = 'WASM_NoSIMD'; // 이름 기반 처리

function runCmdCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn('cmd.exe', ['/c', command], {
            stdio: 'inherit',
            shell: true,
        });

        proc.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`❌ CMD 명령 실패 (코드 ${code})`));
        });
    });
}

async function copyJsToTs(jsFile: string) {
    const tsFile = jsFile.replace(/\.js$/, '.ts');
    try {
        await fs.copyFile(jsFile, tsFile);
        console.log(`✅ 파일 복사 완료: ${path.basename(jsFile)} → ${path.basename(tsFile)}`);
    } catch (err: any) {
        console.error(`❌ JS → TS 복사 실패: ${err.message}`);
    }
}

async function build() {
    console.log('===== Start =====');

    const fullCommand = `
cd /d ${SDK_PATH} && 
call emsdk activate latest && 
call emsdk_env.bat && 
set EMCC_DEBUG=0 && 
cd /d ${BUILD_PATH} && 
em++ ${OUTPUT_NAME}.cpp -o ${OUTPUT_NAME}.html ^
  -s EXPORT_ES6 ^
  -sEXPORTED_RUNTIME_METHODS=['UTF8ToString'] ^
  -std=c++2c ^
  -stdlib=libc++ ^
  -O3 ^
  -sFETCH=1 ^
  -sMALLOC=emmalloc ^
  -sEXPORTED_FUNCTIONS=['_malloc','_free'] ^
  -s INITIAL_MEMORY=10485760 ^
  -s ALLOW_MEMORY_GROWTH=1
`;

    try {
        await runCmdCommand(fullCommand);
        //const jsPath = path.join(BUILD_PATH, `${OUTPUT_NAME}.js`);
        //await copyJsToTs(jsPath);
        console.log('===== End =====');
    } catch (err: any) {
        console.error(err.message);
    }
}

build();

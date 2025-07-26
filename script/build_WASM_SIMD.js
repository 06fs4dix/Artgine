import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SDK_PATH = 'E:\\MySvn\\java\\emsdk';
const BUILD_PATH = 'E:\\MySvn\\java\\java\\Artgine\\WebContent\\artgine\\wasm';
function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, {
            stdio: 'inherit',
            shell: true,
            ...options,
        });
        proc.on('exit', (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                reject(new Error(`❌ '${command}' failed with exit code ${code}`));
            }
        });
    });
}
async function copyJsToTs(jsPath) {
    const tsPath = jsPath.replace(/\.js$/, '.ts');
    try {
        await fs.copyFile(jsPath, tsPath);
        console.log(`✅ 파일 복사 완료: ${path.basename(jsPath)} → ${path.basename(tsPath)}`);
    }
    catch (err) {
        console.error(`❌ JS → TS 복사 실패: ${err.message}`);
    }
}
async function build() {
    console.log('===== Start =====');
    try {
        process.chdir(SDK_PATH);
        await runCommand('call', ['emsdk activate latest']);
        await runCommand('call', ['emsdk_env.bat']);
        process.env.EMCC_DEBUG = '0';
        process.chdir(BUILD_PATH);
        const emppArgs = [
            'CWASM_SIMD.cpp',
            '-o', 'WASM_SIMD.html',
            '-s', 'EXPORT_ES6',
            '-lembind',
            '-s', 'MALLOC=emmalloc',
            "-s", "EXPORTED_FUNCTIONS=['_malloc','_free']",
            "-s", "EXPORTED_RUNTIME_METHODS=['UTF8ToString']",
            '-std=c++2c',
            '-stdlib=libc++',
            '-s', 'ALLOW_MEMORY_GROWTH=1',
            '-O3',
            '-msimd128',
            '-sFETCH=1',
            '-flto'
        ];
        await runCommand('em++', emppArgs);
        const wasmJsPath = path.join(BUILD_PATH, 'WASM_SIMD.js');
        await copyJsToTs(wasmJsPath);
        console.log('\n===== End =====');
    }
    catch (err) {
        console.error(err.message);
    }
}
build();

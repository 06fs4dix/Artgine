import gulp from 'gulp';
import javascriptObfuscator from 'gulp-javascript-obfuscator';
import through2 from 'through2';
import { deleteAsync } from 'del';
import path from 'path';
import fs from 'fs';
import { promises as fsPromise } from 'fs';

const srcBase = 'artgine';
const destBase = path.resolve(process.cwd(), 'temp');

function hasImplInPath(filePath) {
    const parts = filePath.split(path.sep);
    return parts.some(part => part.toLowerCase().includes('impl'));
}

// 0. temp 폴더 삭제
export const clean = () => {
    console.log('🧹 temp folder delete...');
    return deleteAsync([`${destBase}/**`, destBase], { force: true });
};

// 1. temp 폴더 생성
export const ensureTempExists = (done) => {
    if (!fs.existsSync(destBase)) {
        fs.mkdirSync(destBase, { recursive: true });
        console.log('📁 temp folder Create');
    }
    done();
};

// 2. impl/wasm/temp 제외하고 파일 복사 (fs 기반)
export const copyNonImple = async () => {
    console.log('📁 impl/wasm/temp copy...');
    const walkAndCopy = async (dir) => {
        const entries = await fsPromise.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(dir, entry.name);
            const relPath = path.relative(srcBase, srcPath);
            const dstPath = path.join(destBase, relPath);

            // 제외 조건
            if (
                srcPath.includes(`${path.sep}temp${path.sep}`) ||
                srcPath.includes(`${path.sep}wasm${path.sep}`) ||
                hasImplInPath(srcPath)
            ) continue;

            if (entry.isDirectory()) {
                await fsPromise.mkdir(dstPath, { recursive: true });
                await walkAndCopy(srcPath);
            } else {
                await fsPromise.mkdir(path.dirname(dstPath), { recursive: true });
                await fsPromise.copyFile(srcPath, dstPath);
            }
        }
    };

    await walkAndCopy(srcBase);
};

// 3. impl 포함된 js만 난독화 후 .js + .ts 저장
export const obfuscateImpleJS = () => {
    let count = 0;
    console.log('🔒 impl js obfuscate .js + .ts ...');
    return gulp.src([
        `${srcBase}/**/*.js`,
        `!${srcBase}/temp/**`,
        `!${srcBase}/wasm/**`
    ], { base: srcBase })
        .pipe(through2.obj(function (file, _, cb) {
            if (hasImplInPath(file.path)) {
                count++;
                this.push(file);
            }
            cb();
        }, function (cb) {
            console.log(`✅ obfuscateImpleJS File: ${count}`);
            cb();
        }))
        .pipe(javascriptObfuscator({
            compact: true,
            renameGlobals: true,
            unicodeEscapeSequence: true,
            splitStrings: true,
            selfDefending: false,
            shuffleStringArray: false,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 1,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 1,
        }))
        .pipe(through2.obj(function (file, _, cb) {
            this.push(file); // .js

            const clone = file.clone();
            const parsed = path.parse(clone.path);
            parsed.ext = '.ts';
            parsed.base = parsed.name + parsed.ext;
            clone.path = path.format(parsed);
            this.push(clone); // .ts

            cb();
        }))
        .pipe(gulp.dest(destBase));
};

// 4. wasm 필수 3개 파일만 복사
export const copyWasmOnly = (cb) => {
    console.log('📦 Binary-safe wasm Copy...');

    const wasmList = [
        'artgine/wasm/WASM_NoSIMD.js',
        'artgine/wasm/WASM_NoSIMD.wasm',
        'artgine/wasm/WASM_SIMD.js',
        'artgine/wasm/WASM_SIMD.wasm'
    ];

    for (const file of wasmList) {
        const relPath = file.replace(/^artgine[\/\\]?/, '');
        const target = path.join(destBase, relPath);
        const dir = path.dirname(target);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.copyFileSync(file, target);
        console.log(`✅ Copied: ${file} -> ${target}`);
    }

    cb();
};
// 5. 전체 실행 순서
export default gulp.series(
    clean,
    ensureTempExists,
    copyNonImple,
    obfuscateImpleJS,
    copyWasmOnly
);

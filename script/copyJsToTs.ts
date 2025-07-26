// copyJsToTs.js
import fs from 'fs';
import path from 'path';

/**
 * 지정된 디렉토리를 재귀적으로 탐색하여 JS → TS 파일 복사
 */
function copyJsToTs(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            copyJsToTs(fullPath); // 재귀 탐색
        } else if (entry.isFile() && path.extname(entry.name) === '.js') {
            const tsPath = fullPath.replace(/\.js$/, '.ts');

            if (!fs.existsSync(tsPath)) {
                fs.copyFileSync(fullPath, tsPath);
                console.log(`✅ Copied: ${fullPath} → ${tsPath}`);
            } else {
                // 이미 존재하면 생략
                console.log(`⚠️ Skipped (already exists): ${tsPath}`);
            }
        }
    }
}

// 실행부
const targetDir = process.argv[2]; // 커맨드라인 인자: 복사할 대상 디렉토리
if (!targetDir) {
    console.error("❌ 대상 폴더 경로를 입력하세요.\n사용법: node copyJsToTs.js ./src");
    process.exit(1);
}

const absPath = path.resolve(targetDir);
if (!fs.existsSync(absPath)) {
    console.error(`❌ 경로가 존재하지 않습니다: ${absPath}`);
    process.exit(1);
}

copyJsToTs(absPath);

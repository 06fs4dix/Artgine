import fs from 'fs';
import path from 'path';
function copyJsToTs(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            copyJsToTs(fullPath);
        }
        else if (entry.isFile() && path.extname(entry.name) === '.js') {
            const tsPath = fullPath.replace(/\.js$/, '.ts');
            if (!fs.existsSync(tsPath)) {
                fs.copyFileSync(fullPath, tsPath);
                console.log(`✅ Copied: ${fullPath} → ${tsPath}`);
            }
            else {
                console.log(`⚠️ Skipped (already exists): ${tsPath}`);
            }
        }
    }
}
const targetDir = process.argv[2];
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

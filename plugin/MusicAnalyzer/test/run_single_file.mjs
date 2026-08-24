import { CMusicAnalyzer } from '../CMusicAnalyzer.js';
import fs from 'fs';
import path from 'path';

// 사용법: node plugin/MusicAnalyzer/test/run_single_file.mjs "<오디오파일 절대경로>" [출력폴더]
const target = process.argv[2];
const outDir = process.argv[3] || 'plugin/MusicAnalyzer/test/team_result';

if (!target) {
    console.error('사용법: node run_single_file.mjs <파일경로> [출력폴더]');
    process.exit(1);
}
if (!fs.existsSync(target)) {
    console.error('파일이 없습니다:', target);
    process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, path.basename(target) + '.json');

const result = await CMusicAnalyzer.Analyze(target);
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
console.log('완료:', target, '->', outPath);

import { CMusicAnalyzer } from '../CMusicAnalyzer.js';
import fs from 'fs';
import path from 'path';

const folder = 'E:/music/포크';
const outPath = path.join(process.cwd(), 'plugin/MusicAnalyzer/test/result_포크.json');

const files = fs.readdirSync(folder).filter(f => /\.(mp3|flac|wav|m4a|ogg)$/i.test(f));
console.log('대상 파일 수:', files.length);

const results = [];
for (const fileName of files) {
    const filePath = path.join(folder, fileName);
    console.log('분석 중:', fileName);
    try {
        const result = await CMusicAnalyzer.Analyze(filePath);
        results.push(result);
        console.log(' -> 완료:', fileName, '| segments:', result.musical.segments.length, '| external.title:', result.external.title);
    } catch (e) {
        console.error(' -> 실패:', fileName, e.message);
        results.push({ fileInfo: { fileName, absolutePath: filePath, folderPath: folder }, error: e.message });
    }
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
}

console.log('전체 완료. 저장 경로:', outPath);

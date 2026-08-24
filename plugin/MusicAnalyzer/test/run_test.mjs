import { CMusicAnalyzer } from '../CMusicAnalyzer.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, 'sample.mp3');

try {
    const result = await CMusicAnalyzer.AnalyzeFile(target);
    console.log(JSON.stringify(result, null, 2));
} catch (e) {
    console.error('ANALYZE_FAILED:', e);
    process.exit(1);
}

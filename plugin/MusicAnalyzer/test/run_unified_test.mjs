import { CMusicAnalyzer } from '../CMusicAnalyzer.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, 'sample.mp3');

const result = await CMusicAnalyzer.Analyze(target);

const outPath = path.join(__dirname, 'result.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
console.log('Saved:', outPath);
console.log('id3:', JSON.stringify(result.id3, null, 2));
console.log('segments count:', result.musical.segments.length);
console.log('external:', JSON.stringify(result.external, null, 2));

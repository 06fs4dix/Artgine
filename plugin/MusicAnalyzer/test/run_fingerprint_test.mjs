import { CMusicAnalyzer } from '../CMusicAnalyzer.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, 'sample.mp3');

const fp = await CMusicAnalyzer.AnalyzeFingerprint({ filePath: target });
console.log('duration:', fp.duration);
console.log('fingerprint length:', fp.fingerprint.length);
console.log('fingerprint head:', fp.fingerprint.slice(0, 80));

import { CMusicAnalyzer } from '../CMusicAnalyzer.js';
import fs from 'fs';
import path from 'path';

const target = 'E:/music/Faster.mp3';
const result = await CMusicAnalyzer.Analyze(target);

const outPath = path.join(process.cwd(), 'plugin/MusicAnalyzer/test/result_faster.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
console.log('Saved:', outPath);

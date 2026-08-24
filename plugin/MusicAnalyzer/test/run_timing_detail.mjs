import { CMusicAnalyzer } from '../CMusicAnalyzer.js';
import fs from 'fs';

const target = 'E:/music/포크/Abigail - Assaf Ayalon.mp3';

// private 메서드 접근을 위해 클래스 내부 흐름을 그대로 재현
const essentia = await CMusicAnalyzer['_getEssentia']();
console.time('decode');
const samples = await CMusicAnalyzer['_decodeToFloat32'](target);
console.timeEnd('decode');
console.log('samples:', samples.length, 'sec:', samples.length / 44100);

console.time('overall rhythm+key+dynamics');
const overallVector = essentia.arrayToVector(samples);
const rhythm = essentia.RhythmExtractor2013(overallVector);
const key = essentia.KeyExtractor(overallVector);
const dynamics = essentia.DynamicComplexity(overallVector);
const ticksSec = essentia.vectorToArray(rhythm.ticks);
overallVector.delete();
console.timeEnd('overall rhythm+key+dynamics');
console.log('beats:', ticksSec.length);

console.time('per-bar loop (87 bars, KeyExtractor only)');
const boundaries = [0];
for (let i = 3; i < ticksSec.length; i += 4) boundaries.push(ticksSec[i]);
boundaries.push(samples.length / 44100);
for (let i = 0; i < boundaries.length - 1; i++) {
    const startSec = boundaries[i], endSec = boundaries[i+1];
    const chunk = samples.subarray(Math.round(startSec*44100), Math.round(endSec*44100));
    if (chunk.length > 0) {
        const vector = essentia.arrayToVector(chunk);
        try { essentia.KeyExtractor(vector); } catch {}
        vector.delete();
    }
}
console.timeEnd('per-bar loop (87 bars, KeyExtractor only)');

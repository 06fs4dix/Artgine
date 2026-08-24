import { CMusicAnalyzer } from '../CMusicAnalyzer.js';

const target = 'E:/music/포크/Abigail - Assaf Ayalon.mp3';
const essentia = await CMusicAnalyzer['_getEssentia']();
const samples = await CMusicAnalyzer['_decodeToFloat32'](target);

const v1 = essentia.arrayToVector(samples);
console.time('RhythmExtractor2013');
const rhythm = essentia.RhythmExtractor2013(v1);
console.timeEnd('RhythmExtractor2013');
v1.delete();

const v2 = essentia.arrayToVector(samples);
console.time('KeyExtractor');
essentia.KeyExtractor(v2);
console.timeEnd('KeyExtractor');
v2.delete();

const v3 = essentia.arrayToVector(samples);
console.time('DynamicComplexity');
essentia.DynamicComplexity(v3);
console.timeEnd('DynamicComplexity');
v3.delete();

import { CMusicAnalyzer } from '../CMusicAnalyzer.js';

const target = 'E:/music/포크/Abigail - Assaf Ayalon.mp3';

console.time('ReadId3Tags');
const id3 = await CMusicAnalyzer.AnalyzeFile({ filePath: target });
console.timeEnd('ReadId3Tags');

console.time('AnalyzeAudio');
const musical = await CMusicAnalyzer.AnalyzeAudio({ filePath: target });
console.timeEnd('AnalyzeAudio');
console.log('segments:', musical.segments.length);

console.time('TagExternal');
const external = await CMusicAnalyzer.TagExternal({ fileName: 'Abigail - Assaf Ayalon.mp3', folderPath: 'E:/music/포크' });
console.timeEnd('TagExternal');
console.log('external:', external.title);

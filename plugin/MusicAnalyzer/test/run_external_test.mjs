import { CMusicExternalTagger } from '../CMusicExternalTagger.js';

const hints = {
    fileName: 'SoundHelix-Song-1.mp3',
    folderPath: 'D:/Artgine_svn/WebContent/plugin/MusicAnalyzer/test',
};

try {
    const info = await CMusicExternalTagger.Tag(hints);
    console.log(JSON.stringify(info, null, 2));
} catch (e) {
    console.error('TAG_FAILED:', e);
    process.exit(1);
}

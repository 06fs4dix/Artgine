import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createRequire } from 'module';
import { CPath } from '../../artgine/basic/CPath.js';
import { CConsol } from '../../artgine/basic/CConsol.js';
import { CUtilSystem } from '../../artgine/system/CUtilSystem.js';
import { CFile } from '../../artgine/system/CFile.js';
import { CAI } from '../../artgine/util/CAI.js';
const _require = createRequire(import.meta.url);
const BIN_DIR = path.resolve(CPath.ArtgineRootPath(), 'artgine', 'external', 'bin');
const FFMPEG_PATH = path.join(BIN_DIR, 'ffmpeg.exe');
const FFMPEG_ZIP_URL = 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
const SAMPLE_RATE = 44100;
const BEATS_PER_BAR = 4;
const MIN_ANALYZE_DURATION_SEC = 2;
const MAX_ANALYZE_DURATION_SEC = 1800;
const DEFAULT_TAG_MODEL = 'grok-4.5';
export const DEFAULT_SEARCH_FIELDS = ['title', 'composer', 'artist', 'album', 'year', 'genre'];
export const ALL_SEARCH_FIELDS = ['title', 'composer', 'artist', 'album', 'year', 'genre', 'usedIn', 'lyrics'];
export const DEFAULT_ID3_TAGS = {
    title: null, artist: null, albumArtist: null, album: null, year: null, genre: null,
    track: null, composer: null, comment: null, hasPicture: false,
    format: { container: null, codec: null, bitrate: null, sampleRate: null },
};
export const DEFAULT_ANALYSIS = {
    file: '', durationSec: 0,
    overall: {
        rhythm: { bpm: 0, confidence: 0, beatCount: 0, octaveDoubleSuspect: false, bpmHalfCandidate: null },
        tonal: { key: '', scale: '', strength: 0 },
        loudness: { dynamicComplexity: 0, loudnessDb: 0 },
    },
    segments: [],
};
export const DEFAULT_FINGERPRINT = {
    matched: false, score: null, recordingId: null, title: null, artist: [], album: null, year: null,
    fingerprint: null, duration: null,
};
export const DEFAULT_SEARCH_OUTPUT = {
    title: null, composer: null, artist: null, album: null, year: null,
    genre: null,
};
const HIGH_CONFIDENCE_FINGERPRINT_SCORE = 0.9;
const CHROMAPRINT_RELEASE_API = 'https://api.github.com/repos/acoustid/chromaprint/releases/latest';
const FAST_LOOKUP_MATCH_THRESHOLD = 0.5;
const MUSICBRAINZ_MIN_INTERVAL_MS = 1100;
export class CMusicAnalyzer {
    static _essentiaPromise = null;
    static _mbLastCallAt = 0;
    static async _ensureNpmPackage(pkg) {
        try {
            _require.resolve(pkg);
            return;
        }
        catch { }
        CConsol.Log(`[MusicAnalyzer] ${pkg} 없음 -> npm install 시작`);
        const proc = await CUtilSystem.Spawn('npm', ['install', pkg], 'pipe', CPath.ArtgineRootPath());
        if (!proc)
            throw new Error(`npm install 프로세스를 시작하지 못했습니다 (${pkg})`);
        await new Promise((resolve, reject) => {
            let err = '';
            proc.stderr.on('data', (d) => err += d.toString());
            proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`npm install ${pkg} 실패: ` + err.slice(-500))));
            proc.on('error', reject);
        });
        CConsol.Log(`[MusicAnalyzer] ${pkg} 설치 완료`);
    }
    static async _ensureFfmpeg() {
        if (fs.existsSync(FFMPEG_PATH))
            return;
        CConsol.Log('[MusicAnalyzer] ffmpeg.exe 없음 -> 다운로드 시작');
        await fs.promises.mkdir(BIN_DIR, { recursive: true });
        const data = await CFile.Load(FFMPEG_ZIP_URL);
        if (!data)
            throw new Error('ffmpeg 다운로드 실패');
        const AdmZip = _require('adm-zip');
        const zip = new AdmZip(Buffer.from(data));
        const entry = zip.getEntries().find((e) => /\/bin\/ffmpeg\.exe$/i.test(e.entryName));
        if (!entry)
            throw new Error('ffmpeg ZIP 안에서 ffmpeg.exe를 찾지 못함');
        fs.writeFileSync(FFMPEG_PATH, entry.getData());
        CConsol.Log('[MusicAnalyzer] ffmpeg.exe 설치 완료');
    }
    static async _getEssentia() {
        if (!this._essentiaPromise) {
            this._essentiaPromise = (async () => {
                await this._ensureNpmPackage('essentia.js');
                const mod = await import('essentia.js');
                return new mod.Essentia(mod.EssentiaWASM);
            })();
        }
        return this._essentiaPromise;
    }
    static async _decodeToFloat32(inputPath) {
        await this._ensureFfmpeg();
        const tmpWav = path.join(BIN_DIR, `.tmp_analyze_${Date.now()}.wav`);
        const proc = await CUtilSystem.Spawn(FFMPEG_PATH, [
            '-y', '-i', inputPath, '-ac', '1', '-ar', '44100', '-f', 'wav', '-acodec', 'pcm_f32le', tmpWav,
        ]);
        if (!proc)
            throw new Error('ffmpeg 프로세스를 시작하지 못했습니다');
        let err = '';
        proc.stderr?.on('data', (d) => err += d.toString());
        await new Promise((resolve, reject) => {
            proc.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg 변환 실패: ' + err.slice(-500))));
            proc.on('error', reject);
        });
        try {
            return this._readWavFloat32(tmpWav);
        }
        finally {
            try {
                fs.unlinkSync(tmpWav);
            }
            catch { }
        }
    }
    static _readWavFloat32(wavPath) {
        const buf = fs.readFileSync(wavPath);
        if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE')
            throw new Error('올바른 WAV 파일이 아닙니다: ' + wavPath);
        let offset = 12;
        let dataOffset = -1;
        let dataLength = 0;
        while (offset + 8 <= buf.length) {
            const chunkId = buf.toString('ascii', offset, offset + 4);
            const chunkSize = buf.readUInt32LE(offset + 4);
            if (chunkId === 'data') {
                dataOffset = offset + 8;
                dataLength = chunkSize;
                break;
            }
            offset += 8 + chunkSize + (chunkSize % 2);
        }
        if (dataOffset < 0)
            throw new Error('WAV data 청크를 찾지 못함: ' + wavPath);
        const sampleCount = dataLength / 4;
        const samples = new Float32Array(sampleCount);
        for (let i = 0; i < sampleCount; i++)
            samples[i] = buf.readFloatLE(dataOffset + i * 4);
        return samples;
    }
    static _buildBarBoundaries(ticksSec, durationSec) {
        const boundaries = [0];
        for (let i = BEATS_PER_BAR - 1; i < ticksSec.length; i += BEATS_PER_BAR)
            boundaries.push(ticksSec[i]);
        if (boundaries[boundaries.length - 1] < durationSec)
            boundaries.push(durationSec);
        return boundaries;
    }
    static _analyzeBar(essentia, chunk, beatsInBar) {
        const seg = {
            beatCount: beatsInBar.length,
            bpm: null,
            key: null, scale: null, keyStrength: null,
            loudnessDb: null,
        };
        if (beatsInBar.length >= 2) {
            let sumInterval = 0;
            for (let i = 1; i < beatsInBar.length; i++)
                sumInterval += beatsInBar[i] - beatsInBar[i - 1];
            const avgInterval = sumInterval / (beatsInBar.length - 1);
            seg.bpm = avgInterval > 0 ? 60 / avgInterval : null;
        }
        if (chunk.length > 0) {
            const vector = essentia.arrayToVector(chunk);
            try {
                const key = essentia.KeyExtractor(vector);
                seg.key = key.key;
                seg.scale = key.scale;
                seg.keyStrength = key.strength;
            }
            catch { }
            vector.delete();
            let sumSq = 0;
            for (let i = 0; i < chunk.length; i++)
                sumSq += chunk[i] * chunk[i];
            const rms = Math.sqrt(sumSq / chunk.length);
            seg.loudnessDb = rms > 0 ? 20 * Math.log10(rms) : null;
        }
        return seg;
    }
    static _onsetStrength(samples, tickSec) {
        const preMs = 15, postMs = 60;
        const centerIdx = Math.round(tickSec * SAMPLE_RATE);
        const preStart = Math.max(0, centerIdx - Math.round(preMs / 1000 * SAMPLE_RATE));
        const postEnd = Math.min(samples.length, centerIdx + Math.round(postMs / 1000 * SAMPLE_RATE));
        let preSumSq = 0, preN = 0, postSumSq = 0, postN = 0;
        for (let i = preStart; i < centerIdx; i++) {
            preSumSq += samples[i] * samples[i];
            preN++;
        }
        for (let i = centerIdx; i < postEnd; i++) {
            postSumSq += samples[i] * samples[i];
            postN++;
        }
        const preRms = preN > 0 ? Math.sqrt(preSumSq / preN) : 0;
        const postRms = postN > 0 ? Math.sqrt(postSumSq / postN) : 0;
        return Math.max(0, postRms - preRms);
    }
    static OCTAVE_DOUBLE_ALTERNATION_THRESHOLD = 1.6;
    static _checkOctaveDouble(samples, ticksSec) {
        if (ticksSec.length < 8)
            return false;
        const startIdx = Math.floor(ticksSec.length * 0.2);
        const endIdx = Math.floor(ticksSec.length * 0.8);
        const strengths = [];
        for (let i = startIdx; i < endIdx; i++)
            strengths.push(this._onsetStrength(samples, ticksSec[i]));
        if (strengths.length < 8)
            return false;
        const even = strengths.filter((_, i) => i % 2 === 0);
        const odd = strengths.filter((_, i) => i % 2 === 1);
        const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
        const evenAvg = avg(even), oddAvg = avg(odd);
        const weaker = Math.min(evenAvg, oddAvg);
        if (weaker <= 0)
            return false;
        const alternationRatio = Math.max(evenAvg, oddAvg) / weaker;
        return alternationRatio > this.OCTAVE_DOUBLE_ALTERNATION_THRESHOLD;
    }
    static async AnalyzeAudio(input, output = DEFAULT_ANALYSIS) {
        const { filePath } = input;
        if (!fs.existsSync(filePath))
            throw new Error('파일이 없습니다: ' + filePath);
        const essentia = await this._getEssentia();
        const fullSamples = await this._decodeToFloat32(filePath);
        const fullDurationSec = fullSamples.length / SAMPLE_RATE;
        if (fullDurationSec < MIN_ANALYZE_DURATION_SEC) {
            return {
                file: path.basename(filePath),
                durationSec: fullDurationSec,
                overall: {
                    rhythm: { bpm: 0, confidence: 0, beatCount: 0, octaveDoubleSuspect: false, bpmHalfCandidate: null },
                    tonal: { key: '', scale: '', strength: 0 },
                    loudness: { dynamicComplexity: 0, loudnessDb: 0 },
                },
                segments: [],
            };
        }
        const samples = fullDurationSec > MAX_ANALYZE_DURATION_SEC
            ? fullSamples.subarray(0, MAX_ANALYZE_DURATION_SEC * SAMPLE_RATE)
            : fullSamples;
        const analyzedDurationSec = samples.length / SAMPLE_RATE;
        const overallVector = essentia.arrayToVector(samples);
        const rhythm = essentia.RhythmExtractor2013(overallVector);
        const key = essentia.KeyExtractor(overallVector);
        const dynamics = essentia.DynamicComplexity(overallVector);
        const ticksSec = essentia.vectorToArray(rhythm.ticks);
        const beatCount = ticksSec.length;
        rhythm.ticks?.delete?.();
        overallVector.delete();
        const octaveDoubleSuspect = this._checkOctaveDouble(samples, ticksSec);
        const bpmHalfCandidate = octaveDoubleSuspect ? rhythm.bpm / 2 : null;
        const segments = [];
        if (beatCount >= BEATS_PER_BAR) {
            const boundaries = this._buildBarBoundaries(ticksSec, analyzedDurationSec);
            for (let i = 0; i < boundaries.length - 1; i++) {
                const startSec = boundaries[i];
                const endSec = boundaries[i + 1];
                const beatsInBar = Array.from(ticksSec).filter(t => t >= startSec && t < endSec);
                const chunk = samples.subarray(Math.round(startSec * SAMPLE_RATE), Math.round(endSec * SAMPLE_RATE));
                const barResult = this._analyzeBar(essentia, chunk, beatsInBar);
                segments.push({ barIndex: i, startSec, endSec, ...barResult });
            }
        }
        else {
            const barResult = this._analyzeBar(essentia, samples, Array.from(ticksSec));
            segments.push({ barIndex: 0, startSec: 0, endSec: analyzedDurationSec, ...barResult });
        }
        return {
            ...output,
            file: path.basename(filePath),
            durationSec: fullDurationSec,
            overall: {
                rhythm: {
                    bpm: rhythm.bpm, confidence: rhythm.confidence, beatCount,
                    octaveDoubleSuspect, bpmHalfCandidate,
                },
                tonal: { key: key.key, scale: key.scale, strength: key.strength },
                loudness: { dynamicComplexity: dynamics.dynamicComplexity, loudnessDb: dynamics.loudness },
            },
            segments,
        };
    }
    static async AnalyzeFile(input, output = DEFAULT_ID3_TAGS) {
        const { filePath } = input;
        if (!fs.existsSync(filePath))
            throw new Error('파일이 없습니다: ' + filePath);
        await this._ensureNpmPackage('music-metadata');
        const mm = await import('music-metadata');
        const metadata = await mm.parseFile(filePath);
        const c = metadata.common;
        const f = metadata.format;
        return {
            ...output,
            title: c.title ?? null,
            artist: c.artist ?? null,
            albumArtist: c.albumartist ?? null,
            album: c.album ?? null,
            year: c.year ?? null,
            genre: c.genre?.length ? c.genre.join(', ') : null,
            track: c.track?.no ?? null,
            composer: c.composer?.length ? c.composer.join(', ') : null,
            comment: c.comment?.length ? c.comment.join(' / ') : null,
            hasPicture: !!(c.picture && c.picture.length),
            format: {
                container: f.container ?? null,
                codec: f.codec ?? null,
                bitrate: f.bitrate ?? null,
                sampleRate: f.sampleRate ?? null,
            },
        };
    }
    static _findFileRecursive(dir, exactName) {
        for (const name of fs.readdirSync(dir)) {
            const full = path.join(dir, name);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
                const found = this._findFileRecursive(full, exactName);
                if (found)
                    return found;
            }
            else if (name === exactName) {
                return full;
            }
        }
        return null;
    }
    static async _ensureFpcalc() {
        const exeName = os.platform() === 'win32' ? 'fpcalc.exe' : 'fpcalc';
        const fpcalcPath = path.join(BIN_DIR, exeName);
        if (fs.existsSync(fpcalcPath))
            return fpcalcPath;
        CConsol.Log('[MusicAnalyzer] fpcalc 없음 -> chromaprint 릴리즈 조회');
        await fs.promises.mkdir(BIN_DIR, { recursive: true });
        const releaseRes = await fetch(CHROMAPRINT_RELEASE_API, { headers: { 'User-Agent': 'Artgine-MusicAnalyzer' } });
        if (!releaseRes.ok)
            throw new Error('chromaprint 릴리즈 조회 실패: HTTP ' + releaseRes.status);
        const release = await releaseRes.json();
        const assets = release.assets || [];
        const platform = os.platform();
        const pattern = platform === 'win32' ? /windows.*\.zip$/i
            : platform === 'darwin' ? /macos.*\.zip$/i
                : /linux.*\.(tar\.gz|zip)$/i;
        const asset = assets.find(a => pattern.test(a.name));
        if (!asset)
            throw new Error(`현재 OS(${platform})용 fpcalc 배포본을 chromaprint 릴리즈에서 찾지 못함`);
        CConsol.Log('[MusicAnalyzer] fpcalc 다운로드: ' + asset.name);
        const data = await CFile.Load(asset.browser_download_url);
        if (!data)
            throw new Error('fpcalc 다운로드 실패');
        const buf = Buffer.from(data);
        if (asset.name.endsWith('.zip')) {
            const AdmZip = _require('adm-zip');
            const zip = new AdmZip(buf);
            const entry = zip.getEntries().find((e) => /(^|\/)fpcalc(\.exe)?$/i.test(e.entryName));
            if (!entry)
                throw new Error('zip 안에서 fpcalc 실행파일을 찾지 못함');
            fs.writeFileSync(fpcalcPath, entry.getData());
        }
        else {
            await this._ensureNpmPackage('tar');
            const tar = await import('tar');
            const tmpTar = path.join(BIN_DIR, `.tmp_fpcalc_${Date.now()}.tar.gz`);
            const extractDir = path.join(BIN_DIR, `.tmp_fpcalc_extract_${Date.now()}`);
            fs.writeFileSync(tmpTar, buf);
            await fs.promises.mkdir(extractDir, { recursive: true });
            try {
                await tar.x({ file: tmpTar, cwd: extractDir });
                const found = this._findFileRecursive(extractDir, 'fpcalc');
                if (!found)
                    throw new Error('tar 안에서 fpcalc 실행파일을 찾지 못함');
                fs.copyFileSync(found, fpcalcPath);
            }
            finally {
                try {
                    fs.unlinkSync(tmpTar);
                }
                catch { }
                try {
                    fs.rmSync(extractDir, { recursive: true, force: true });
                }
                catch { }
            }
        }
        if (platform !== 'win32')
            fs.chmodSync(fpcalcPath, 0o755);
        CConsol.Log('[MusicAnalyzer] fpcalc 설치 완료');
        return fpcalcPath;
    }
    static async AnalyzeFingerprint(input, output = DEFAULT_FINGERPRINT) {
        const { filePath, acoustIdApiKey } = input;
        if (!fs.existsSync(filePath))
            throw new Error('파일이 없습니다: ' + filePath);
        const fpcalcPath = await this._ensureFpcalc();
        const proc = await CUtilSystem.Spawn(fpcalcPath, ['-json', filePath]);
        if (!proc)
            throw new Error('fpcalc 프로세스를 시작하지 못했습니다');
        let out = '', err = '';
        proc.stdout?.on('data', (d) => out += d.toString());
        proc.stderr?.on('data', (d) => err += d.toString());
        await new Promise((resolve, reject) => {
            proc.on('close', (code) => code === 0 ? resolve() : reject(new Error('fpcalc 실행 실패: ' + err.slice(-400))));
            proc.on('error', reject);
        });
        const parsed = JSON.parse(out);
        let match = {
            matched: false, score: null, recordingId: null, title: null, artist: [], album: null, year: null,
        };
        if (acoustIdApiKey) {
            try {
                match = await CMusicAnalyzer.LookupAcoustId(parsed.duration, parsed.fingerprint, acoustIdApiKey);
            }
            catch (e) {
                CConsol.Log('[MusicAnalyzer] AcoustID 조회 실패(무시하고 계속, 로컬 지문은 보존): ' + e.message);
            }
        }
        return { ...output, ...match, fingerprint: parsed.fingerprint, duration: parsed.duration };
    }
    static async LookupAcoustId(duration, fingerprint, apiKey) {
        const url = new URL('https://api.acoustid.org/v2/lookup');
        url.searchParams.set('client', apiKey);
        url.searchParams.set('duration', String(Math.round(duration)));
        url.searchParams.set('fingerprint', fingerprint);
        url.searchParams.set('meta', 'recordings+releasegroups+compress');
        const res = await fetch(url.toString());
        if (!res.ok)
            throw new Error('AcoustID API 오류: HTTP ' + res.status);
        const json = await res.json();
        if (json.status !== 'ok')
            throw new Error('AcoustID API 오류: ' + (json.error?.message || json.status));
        const results = json.results || [];
        if (!results.length)
            return { matched: false, score: null, recordingId: null, title: null, artist: [], album: null, year: null };
        const best = results.slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0];
        const rec = best.recordings?.[0];
        if (!rec)
            return { matched: false, score: best.score ?? null, recordingId: null, title: null, artist: [], album: null, year: null };
        const releaseGroup = rec.releasegroups?.[0];
        return {
            matched: true,
            score: best.score ?? null,
            recordingId: rec.id ?? null,
            title: rec.title ?? null,
            artist: (rec.artists || []).map((a) => a.name),
            album: releaseGroup?.title ?? null,
            year: releaseGroup?.['first-release-date'] ? parseInt(releaseGroup['first-release-date'].slice(0, 4), 10) : null,
        };
    }
    static _NOISE_PHRASES = /\b(official\s*(audio|video|mv|music\s*video|lyric\s*video)|lyric\s*video|visualizer|m\/v|hd|4k)\b/gi;
    static _normalizeForMatch(s) {
        return s.toLowerCase()
            .replace(CMusicAnalyzer._NOISE_PHRASES, ' ')
            .replace(/feat\.?.*$/i, ' ')
            .replace(/[^a-z0-9가-힣\s]/g, ' ')
            .trim();
    }
    static _VERSION_MARKERS = [
        { re: /remake/i, label: 'Remake' },
        { re: /리메이크/, label: '리메이크' },
        { re: /remaster(ed)?/i, label: 'Remaster' },
        { re: /리마스터/, label: '리마스터' },
        { re: /\blive\b/i, label: 'Live' },
        { re: /라이브/, label: '라이브' },
        { re: /\bcover\b/i, label: 'Cover' },
        { re: /커버/, label: '커버' },
        { re: /acoustic/i, label: 'Acoustic' },
        { re: /어쿠스틱/, label: '어쿠스틱' },
        { re: /unplugged/i, label: 'Unplugged' },
        { re: /instrumental/i, label: 'Instrumental' },
        { re: /\bver(\.|sion)?\b/i, label: 'Version' },
        { re: /\bedit\b/i, label: 'Edit' },
        { re: /\bremix\b/i, label: 'Remix' },
    ];
    static _detectVersionMarker(...titles) {
        const text = titles.filter(Boolean).join(' ');
        for (const { re, label } of CMusicAnalyzer._VERSION_MARKERS) {
            if (re.test(text))
                return label;
        }
        return null;
    }
    static _tokenOverlapScore(a, b) {
        const na = CMusicAnalyzer._normalizeForMatch(a);
        const nb = CMusicAnalyzer._normalizeForMatch(b);
        const ca = na.replace(/\s+/g, '');
        const cb = nb.replace(/\s+/g, '');
        if (ca && ca === cb)
            return 1;
        const ta = new Set(na.split(/\s+/).filter(Boolean));
        const tb = new Set(nb.split(/\s+/).filter(Boolean));
        if (!ta.size || !tb.size)
            return 0;
        let common = 0;
        for (const t of ta)
            if (tb.has(t))
                common++;
        return common / Math.max(ta.size, tb.size);
    }
    static async _queryItunes(title, artist) {
        const url = 'https://itunes.apple.com/search?' + new URLSearchParams({
            term: `${artist} ${title}`, entity: 'song', limit: '5',
        }).toString();
        const res = await fetch(url);
        if (!res.ok)
            return null;
        const json = await res.json();
        const results = json.results || [];
        let best = null, bestScore = 0;
        for (const r of results) {
            const score = CMusicAnalyzer._tokenOverlapScore(r.trackName || '', title) * 0.6
                + CMusicAnalyzer._tokenOverlapScore(r.artistName || '', artist) * 0.4;
            if (score > bestScore) {
                bestScore = score;
                best = r;
            }
        }
        if (!best || bestScore < FAST_LOOKUP_MATCH_THRESHOLD)
            return null;
        return {
            title: best.trackName ?? title,
            artist: best.artistName ?? artist,
            album: best.collectionName ?? null,
            genre: best.primaryGenreName ?? null,
            releaseYear: best.releaseDate ? parseInt(String(best.releaseDate).slice(0, 4), 10) : null,
        };
    }
    static async _queryDiscogs(title, artist) {
        const url = 'https://api.discogs.com/database/search?' + new URLSearchParams({
            artist, track: title, type: 'release', per_page: '5',
        }).toString();
        const res = await fetch(url, { headers: { 'User-Agent': 'Artgine-MusicAnalyzer/1.0' } });
        if (!res.ok)
            return null;
        const json = await res.json();
        const results = json.results || [];
        if (!results.length)
            return null;
        const best = results[0];
        const splitIdx = String(best.title || '').indexOf(' - ');
        const bestArtist = splitIdx >= 0 ? best.title.slice(0, splitIdx) : artist;
        if (CMusicAnalyzer._tokenOverlapScore(bestArtist, artist) < FAST_LOOKUP_MATCH_THRESHOLD)
            return null;
        return {
            title,
            artist: bestArtist,
            genre: Array.isArray(best.style) && best.style.length ? best.style[0] : (Array.isArray(best.genre) && best.genre.length ? best.genre[0] : null),
            releaseYear: best.year ? parseInt(String(best.year), 10) : null,
        };
    }
    static async _queryMusicBrainzComposer(title, artist) {
        const wait = MUSICBRAINZ_MIN_INTERVAL_MS - (Date.now() - CMusicAnalyzer._mbLastCallAt);
        if (wait > 0)
            await new Promise(r => setTimeout(r, wait));
        CMusicAnalyzer._mbLastCallAt = Date.now();
        const query = `recording:"${title.replace(/"/g, '')}" AND artist:"${artist.replace(/"/g, '')}" AND NOT video:true`;
        const url = 'https://musicbrainz.org/ws/2/recording/?' + new URLSearchParams({
            query, fmt: 'json', limit: '1', inc: 'work-rels',
        }).toString();
        const res = await fetch(url, { headers: { 'User-Agent': 'Artgine-MusicAnalyzer/1.0 (contact: none)' } });
        if (!res.ok)
            return null;
        const json = await res.json();
        const rec = json.recordings?.[0];
        if (!rec)
            return null;
        for (const rel of rec.relations || []) {
            if (rel['target-type'] === 'work' && rel.work?.relations) {
                const composerRel = rel.work.relations.find((r) => r.type === 'composer');
                if (composerRel?.artist?.name)
                    return composerRel.artist.name;
            }
        }
        return null;
    }
    static _stripRomanizationTail(lyrics) {
        return lyrics.split('\n').map(line => {
            const m = line.match(/^([\s\S]*?[가-힣.,!?~\d])([a-z].*)$/i);
            return m ? m[1] : line;
        }).join('\n');
    }
    static _BUGS_FETCH_HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    };
    static _decodeHtmlEntities(s) {
        return s
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/gi, "'")
            .trim();
    }
    static _extractLyricsFromBugsHtml(html, title, artist) {
        const blockRe = /track_title="([^"]*)"[\s\S]{0,2500}?artist_disp_nm="([^"]*)"[\s\S]{0,800}?<tr[^>]*rowType="lyrics"[^>]*>[\s\S]*?<td[^>]*class="lyrics"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
        let best = null;
        for (const m of html.matchAll(blockRe)) {
            const rowTitle = CMusicAnalyzer._decodeHtmlEntities(m[1]);
            const rowArtist = CMusicAnalyzer._decodeHtmlEntities(m[2]);
            const lyrics = CMusicAnalyzer._decodeHtmlEntities(m[3]);
            if (lyrics.length < 10)
                continue;
            const titleScore = CMusicAnalyzer._tokenOverlapScore(rowTitle, title);
            if (titleScore < FAST_LOOKUP_MATCH_THRESHOLD)
                continue;
            const artistScore = artist ? CMusicAnalyzer._tokenOverlapScore(rowArtist, artist) : 0;
            const hangulBias = /[가-힣]/.test(title) && /[가-힣]/.test(lyrics) ? 0.2 : 0;
            const englishPenalty = /영어동요|english/i.test(rowTitle) ? -0.4 : 0;
            const score = titleScore * 0.7 + artistScore * 0.3 + hangulBias + englishPenalty;
            if (!best || score > best.score)
                best = { score, lyrics };
        }
        if (best)
            return best.lyrics;
        const wantHangul = /[가-힣]/.test(title);
        const lyricsPattern = /<td[^>]*class="lyrics"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
        for (const match of html.matchAll(lyricsPattern)) {
            const cleaned = CMusicAnalyzer._decodeHtmlEntities(match[1]);
            if (cleaned.length <= 10)
                continue;
            if (wantHangul && !/[가-힣]/.test(cleaned))
                continue;
            return cleaned;
        }
        return null;
    }
    static async _fetchBugsHtml(url) {
        try {
            const res = await fetch(url, { headers: CMusicAnalyzer._BUGS_FETCH_HEADERS });
            if (!res.ok)
                return null;
            return await res.text();
        }
        catch {
            return null;
        }
    }
    static async _queryLyricsBugs(title, artist) {
        const t = String(title || '').trim();
        if (!t)
            return null;
        const queries = [t];
        const both = [t, String(artist || '').trim()].filter(Boolean).join(' ');
        if (both !== t)
            queries.push(both);
        for (const q of queries) {
            for (const pathKind of ['lyrics', 'integrated']) {
                const url = `https://music.bugs.co.kr/search/${pathKind}?q=` + encodeURIComponent(q);
                const html = await CMusicAnalyzer._fetchBugsHtml(url);
                if (!html)
                    continue;
                const lyrics = CMusicAnalyzer._extractLyricsFromBugsHtml(html, title, artist);
                if (lyrics)
                    return lyrics;
            }
        }
        return null;
    }
    static async _queryLyrics(title, artist) {
        const bugs = await CMusicAnalyzer._queryLyricsBugs(title, artist);
        if (bugs)
            return bugs;
        const url = 'https://api.lyrics.ovh/v1/' + encodeURIComponent(artist) + '/' + encodeURIComponent(title);
        try {
            const res = await fetch(url);
            if (!res.ok)
                return null;
            const json = await res.json();
            return json.lyrics ? CMusicAnalyzer._stripRomanizationTail(json.lyrics) : null;
        }
        catch {
            return null;
        }
    }
    static async _queryMissingFieldsViaAI(title, artist, missing, provider, model) {
        const schemaLines = missing.map(f => `  "${f}": ${f === 'usedIn' ? 'string[]' : 'string | null'}`).join(',\n');
        const prompt = [
            '아래 곡의 부족한 정보만 웹에서 검색해서 확인해라. 곡 식별은 이미 끝났으니 다른 조사는 하지 마라.',
            `제목: ${CMusicAnalyzer._stripControlChars(title)}`,
            `아티스트: ${CMusicAnalyzer._stripControlChars(artist)}`,
            '',
            '확인 후 아래 스키마와 정확히 일치하는 JSON 객체 하나만 출력해라(설명 문장, 코드블록 없이 순수 JSON만):',
            '{',
            schemaLines,
            '}',
            missing.includes('lyrics') ? '가사를 찾으면 lyrics에 원문 전체를 넣어라(줄바꿈은 \\n으로).' : '',
            missing.includes('usedIn') ? '이 곡이 삽입된 영화/드라마/게임/광고/방송 등이 있으면 usedIn 배열에 적어라. 없으면 빈 배열로.' : '',
            '확인 안 되는 항목은 null로 답해라(usedIn은 빈 배열). 추측하지 마라.',
        ].filter(Boolean).join('\n');
        try {
            const write = provider === CAI.eProvider.claude;
            const result = await CAI.Chat(provider, model, os.tmpdir(), prompt, true, undefined, true, write);
            const start = result.text.indexOf('{');
            const end = result.text.lastIndexOf('}');
            if (start < 0 || end < start)
                return {};
            return JSON.parse(result.text.slice(start, end + 1));
        }
        catch {
            return {};
        }
    }
    static async _fastExternalLookup(title, artist, provider, model, fields) {
        const fieldSet = new Set(fields);
        const [itunes, discogs] = await Promise.all([
            CMusicAnalyzer._queryItunes(title, artist).catch(() => null),
            CMusicAnalyzer._queryDiscogs(title, artist).catch(() => null),
        ]);
        if (!itunes || !discogs)
            return null;
        if (CMusicAnalyzer._tokenOverlapScore(itunes.artist, discogs.artist) < FAST_LOOKUP_MATCH_THRESHOLD)
            return null;
        const [mbComposer, ovhLyrics] = await Promise.all([
            CMusicAnalyzer._queryMusicBrainzComposer(itunes.title, itunes.artist).catch(() => null),
            fieldSet.has('lyrics') ? CMusicAnalyzer._queryLyrics(itunes.title, itunes.artist) : Promise.resolve(null),
        ]);
        let composer = mbComposer;
        let lyrics = ovhLyrics;
        const missing = [];
        if (fieldSet.has('composer') && !composer)
            missing.push('composer');
        if (fieldSet.has('lyrics') && !lyrics)
            missing.push('lyrics');
        const aiFilled = [];
        if (missing.length) {
            const supplement = await CMusicAnalyzer._queryMissingFieldsViaAI(itunes.title, itunes.artist, missing, provider, model);
            if (missing.includes('composer') && supplement.composer) {
                composer = supplement.composer;
                aiFilled.push('작곡가');
            }
            if (missing.includes('lyrics') && supplement.lyrics) {
                lyrics = supplement.lyrics;
                aiFilled.push('가사');
            }
        }
        const versionNote = CMusicAnalyzer._detectVersionMarker(title, itunes.title);
        return {
            title: itunes.title,
            composer,
            artist: itunes.artist,
            album: itunes.album,
            year: itunes.releaseYear ?? discogs.releaseYear,
            usedIn: [],
            genre: itunes.genre ?? discogs.genre,
            lyrics,
            notes: 'iTunes/Discogs 2개 소스 일치로 전체 AI 웹검색을 생략함(삽입 작품(usedIn) 정보는 조회되지 않음)'
                + (aiFilled.length ? ` - ${aiFilled.join('/')}만 부족 항목 통합 질의 1회로 보강함` : ''),
            versionNote,
        };
    }
    static async _resolveAcoustIdExternal(fingerprint, provider, model, fields) {
        const fieldSet = new Set(fields);
        const versionNote = CMusicAnalyzer._detectVersionMarker(fingerprint.title);
        const mbTitle = fingerprint.title;
        const mbArtist = fingerprint.artist.length ? fingerprint.artist.join(', ') : null;
        let composer = null;
        let lyrics = null;
        let genre = null;
        let usedIn = [];
        const aiFilled = [];
        if (mbTitle && mbArtist) {
            const [mbComposer, ovhLyrics, itunesInfo] = await Promise.all([
                CMusicAnalyzer._queryMusicBrainzComposer(mbTitle, mbArtist).catch(() => null),
                fieldSet.has('lyrics') ? CMusicAnalyzer._queryLyrics(mbTitle, mbArtist) : Promise.resolve(null),
                CMusicAnalyzer._queryItunes(mbTitle, mbArtist).catch(() => null),
            ]);
            composer = mbComposer;
            lyrics = ovhLyrics;
            genre = itunesInfo?.genre ?? null;
            const missing = [];
            if (fieldSet.has('usedIn'))
                missing.push('usedIn');
            if (fieldSet.has('composer') && !composer)
                missing.push('composer');
            if (fieldSet.has('lyrics') && !lyrics)
                missing.push('lyrics');
            if (fieldSet.has('genre') && !genre)
                missing.push('genre');
            const supplement = missing.length
                ? await CMusicAnalyzer._queryMissingFieldsViaAI(mbTitle, mbArtist, missing, provider, model)
                : {};
            if (missing.includes('composer') && supplement.composer) {
                composer = supplement.composer;
                aiFilled.push('작곡가');
            }
            if (missing.includes('lyrics') && supplement.lyrics) {
                lyrics = supplement.lyrics;
                aiFilled.push('가사');
            }
            if (missing.includes('genre') && supplement.genre) {
                genre = supplement.genre;
                aiFilled.push('장르');
            }
            if (supplement.usedIn?.length) {
                usedIn = supplement.usedIn;
                aiFilled.push('삽입작품');
            }
        }
        return {
            title: fingerprint.title,
            composer,
            artist: fingerprint.artist.length ? fingerprint.artist.join(', ') : null,
            album: fingerprint.album,
            year: fingerprint.year,
            usedIn,
            genre,
            lyrics,
            notes: 'AcoustID 고신뢰 지문 매칭 + 무료 API(MusicBrainz/lyrics.ovh/iTunes)로 부족 항목 보강'
                + (aiFilled.length ? ` - ${aiFilled.join('/')}는 AI 통합 질의 1회로 보강함` : ''),
            versionNote,
        };
    }
    static async TagExternal(hints, provider = CAI.eProvider.grok, model = DEFAULT_TAG_MODEL, fields = DEFAULT_SEARCH_FIELDS) {
        const prompt = CMusicAnalyzer._buildTagPrompt({
            fileName: CMusicAnalyzer._stripControlChars(hints.fileName),
            folderPath: hints.folderPath ? CMusicAnalyzer._stripControlChars(hints.folderPath) : hints.folderPath,
            extraHint: hints.extraHint ? CMusicAnalyzer._stripControlChars(hints.extraHint) : hints.extraHint,
        }, fields);
        const write = provider === CAI.eProvider.claude;
        const result = await CAI.Chat(provider, model, os.tmpdir(), prompt, true, undefined, true, write);
        return CMusicAnalyzer._fillUnrequestedDefaults(CMusicAnalyzer._parseTagJson(result.text), fields);
    }
    static async AnalyzeWeb(input, output = DEFAULT_SEARCH_OUTPUT) {
        const provider = input.provider ?? CAI.eProvider.grok;
        const model = input.model ?? DEFAULT_TAG_MODEL;
        const fields = Object.keys(output).filter(k => ALL_SEARCH_FIELDS.includes(k));
        const { fingerprint, candidateTitle, candidateArtist } = input;
        if (fingerprint?.matched && fingerprint.score !== null && fingerprint.score >= HIGH_CONFIDENCE_FINGERPRINT_SCORE) {
            return CMusicAnalyzer._resolveAcoustIdExternal(fingerprint, provider, model, fields);
        }
        let fast = null;
        if (candidateTitle && candidateArtist) {
            try {
                fast = await CMusicAnalyzer._fastExternalLookup(candidateTitle, candidateArtist, provider, model, fields);
            }
            catch (e) {
                CConsol.Log('[MusicAnalyzer] 빠른 조회 실패(무시하고 AI 웹검색으로 폴백): ' + e.message);
            }
        }
        if (fast)
            return fast;
        const acoustHint = fingerprint?.matched
            ? `AcoustID 오디오 지문 매칭(score=${fingerprint.score}): 제목=${fingerprint.title}, 아티스트=${fingerprint.artist.join('/')}` +
                (fingerprint.album ? `, 릴리즈=${fingerprint.album}` : '')
            : '';
        const extraHint = [input.extraHint, acoustHint].filter(Boolean).join(', ') || undefined;
        return CMusicAnalyzer.TagExternal({ fileName: input.fileName, folderPath: input.folderPath, extraHint }, provider, model, fields);
    }
    static _stripControlChars(s) {
        return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    }
    static _fillUnrequestedDefaults(info, fields) {
        const fieldSet = new Set(fields);
        const result = { ...info };
        if (!fieldSet.has('title'))
            result.title = null;
        if (!fieldSet.has('composer'))
            result.composer = null;
        if (!fieldSet.has('artist'))
            result.artist = null;
        if (!fieldSet.has('album'))
            result.album = null;
        if (!fieldSet.has('year'))
            result.year = null;
        if (!fieldSet.has('genre'))
            result.genre = null;
        if (!fieldSet.has('usedIn'))
            result.usedIn = [];
        if (!fieldSet.has('lyrics'))
            result.lyrics = null;
        return result;
    }
    static _SEARCH_FIELD_SCHEMA_LINES = {
        title: '  "title": string | null,',
        composer: '  "composer": string | null,',
        artist: '  "artist": string | null,',
        album: '  "album": string | null,',
        year: '  "year": number | null,',
        genre: '  "genre": string | null,',
        usedIn: '  "usedIn": string[],',
        lyrics: '  "lyrics": string | null,',
    };
    static _buildTagPrompt(hints, fields) {
        const fieldSet = new Set(fields);
        return [
            '너는 음악 파일의 메타데이터를 웹 검색으로 조사하는 도구다.',
            '아래 단편적인 정보만으로 이 오디오 파일이 어떤 곡인지 웹에서 검색해서 조사해라.',
            '',
            `파일명: ${hints.fileName}`,
            hints.folderPath ? `폴더 경로: ${hints.folderPath}` : '',
            hints.extraHint ? `추가 힌트: ${hints.extraHint}` : '',
            '',
            '조사 후 아래 스키마와 정확히 일치하는 JSON 객체 하나만 출력해라(설명 문장, 코드블록 마크다운 없이 순수 JSON만):',
            '{',
            ...fields.map(f => CMusicAnalyzer._SEARCH_FIELD_SCHEMA_LINES[f]),
            '  "notes": string | null,',
            '  "versionNote": string | null',
            '}',
            fieldSet.has('lyrics') ? '가사가 있는 곡이면 lyrics에 찾은 가사 원문 전체를 넣어라(줄바꿈은 \\n으로). 찾지 못하면 null.' : '',
            '이 녹음이 원곡이 아니라 리메이크/리마스터/라이브/커버/어쿠스틱 등 다른 버전이면 versionNote에 어떤 버전인지',
            '(예: "Remake", "Live", "2020 리마스터") 짧게 적어라. 원곡이거나 판단 불가면 versionNote는 null.',
            '알 수 없는 항목은 null(또는 usedIn은 빈 배열)로 채워라. 추측하지 말고 확인 안 되면 null로 둬라.',
        ].filter(Boolean).join('\n');
    }
    static _parseTagJson(text) {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start < 0 || end < start)
            throw new Error('AI 응답에서 JSON을 찾지 못함: ' + text.slice(0, 300));
        return JSON.parse(text.slice(start, end + 1));
    }
    static async Analyze(filePath, provider = CAI.eProvider.grok, model = DEFAULT_TAG_MODEL, acoustIdApiKey = process.env.ACOUSTID_API_KEY || '4hy3wFAqsb', output = DEFAULT_SEARCH_OUTPUT) {
        const absolutePath = path.resolve(filePath).replace(/\\/g, '/');
        const fileInfo = {
            fileName: path.basename(filePath),
            absolutePath,
            folderPath: path.dirname(absolutePath),
        };
        const [id3, musical] = await Promise.all([
            CMusicAnalyzer.AnalyzeFile({ filePath }),
            CMusicAnalyzer.AnalyzeAudio({ filePath }),
        ]);
        let fingerprint = null;
        try {
            fingerprint = await CMusicAnalyzer.AnalyzeFingerprint({ filePath, acoustIdApiKey });
        }
        catch (e) {
            CConsol.Log('[MusicAnalyzer] 지문 계산 실패(무시하고 계속): ' + e.message);
        }
        const localTitle = fingerprint?.title || id3.title || null;
        const localArtist = (fingerprint?.artist.length ? fingerprint.artist.join(', ') : null) || id3.artist || null;
        const localAlbum = fingerprint?.album || id3.album || null;
        const localYear = fingerprint?.year || id3.year || null;
        const localGenre = id3.genre || null;
        const localComposer = id3.composer || null;
        const narrowedOutput = { ...output };
        if (localTitle)
            delete narrowedOutput.title;
        if (localArtist)
            delete narrowedOutput.artist;
        if (localAlbum)
            delete narrowedOutput.album;
        if (localYear !== null)
            delete narrowedOutput.year;
        if (localGenre)
            delete narrowedOutput.genre;
        if (localComposer)
            delete narrowedOutput.composer;
        const extraHintParts = [
            id3.title ? `ID3 제목: ${id3.title}` : '',
            id3.artist ? `ID3 아티스트: ${id3.artist}` : '',
            id3.album ? `ID3 앨범: ${id3.album}` : '',
        ].filter(Boolean);
        let external;
        if (Object.keys(narrowedOutput).length === 0) {
            external = {
                title: localTitle, composer: localComposer, artist: localArtist, album: localAlbum, year: localYear,
                genre: localGenre, usedIn: [], lyrics: null,
                notes: 'ID3/지문에서 요청된 항목을 전부 확보해 웹검색을 생략함', versionNote: null,
            };
        }
        else {
            external = await CMusicAnalyzer.AnalyzeWeb({
                fileName: fileInfo.fileName,
                folderPath: fileInfo.folderPath,
                extraHint: extraHintParts.join(', ') || undefined,
                candidateTitle: localTitle || undefined,
                candidateArtist: localArtist || undefined,
                fingerprint,
                provider, model,
            }, narrowedOutput);
            if ('title' in output && !('title' in narrowedOutput) && localTitle)
                external.title = localTitle;
            if ('artist' in output && !('artist' in narrowedOutput) && localArtist)
                external.artist = localArtist;
            if ('album' in output && !('album' in narrowedOutput) && localAlbum)
                external.album = localAlbum;
            if ('year' in output && !('year' in narrowedOutput) && localYear !== null)
                external.year = localYear;
            if ('genre' in output && !('genre' in narrowedOutput) && localGenre)
                external.genre = localGenre;
            if ('composer' in output && !('composer' in narrowedOutput) && localComposer)
                external.composer = localComposer;
        }
        return { fileInfo, id3, musical, fingerprint, external };
    }
}

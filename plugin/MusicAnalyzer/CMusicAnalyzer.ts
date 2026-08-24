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

// artgine/server/CDownloadServer.ts가 관리하는 ffmpeg.exe와 동일한 경로를 공유한다(이미 설치돼 있으면 재사용).
const BIN_DIR     = path.resolve(CPath.ArtgineRootPath(), 'artgine', 'external', 'bin');
const FFMPEG_PATH = path.join(BIN_DIR, 'ffmpeg.exe');
const FFMPEG_ZIP_URL = 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';

const SAMPLE_RATE = 44100;
const BEATS_PER_BAR = 4; // 코드/조성은 보통 마디 단위로 바뀌므로 비트 4개(=1마디)를 기본 세그먼트 단위로 쓴다.

// essentia-wasm이 감당 못하는 입력 길이 실측 경계값. 1초 미만(게임 보이스 SFX 등)은 리듬 추출기가 프레임
// 윈도우를 못 만들어 abort하고, 몇 시간짜리 연속 믹스는 전체를 PCM으로 메모리에 올리다 WASM 메모리 한도를
// 넘어 abort한다(실측: 0.9초 파일 / 2.7시간 파일 둘 다 재현).
const MIN_ANALYZE_DURATION_SEC = 2;
const MAX_ANALYZE_DURATION_SEC = 1800; // 30분 - 이보다 길면 앞부분만 잘라서 분석(리듬/조성은 대표 구간으로 충분)

export type CMusicSegment = {
    barIndex: number;
    startSec: number;
    endSec: number;
    beatCount: number;
    bpm: number | null; // 이 구간 비트 간격에서 역산한 로컬 템포(고정 창 재추정보다 정확)
    key: string | null;
    scale: string | null;
    keyStrength: number | null;
    loudnessDb: number | null; // 가벼운 RMS 기반 계산(마디마다 DynamicComplexity 전체 알고리즘을 돌리면 느림)
};

export type CMusicAnalysis = {
    file: string;
    durationSec: number;
    overall: {
        rhythm: {
            bpm: number; confidence: number; beatCount: number;
            octaveDoubleSuspect: boolean; // 짝수/홀수 비트의 어택 세기가 크게 교대되면(다운비트/백비트 강세) 2배속 오검출 의심
            bpmHalfCandidate: number | null; // octaveDoubleSuspect가 true일 때 참고할 절반 템포 후보(null이면 해당 없음)
        };
        tonal: { key: string; scale: string; strength: number };
        loudness: { dynamicComplexity: number; loudnessDb: number };
    };
    segments: CMusicSegment[];
};

export type CMusicExternalInfo = {
    title: string | null;
    composer: string | null;
    artist: string | null;
    album: string | null;
    year: number | null;
    usedIn: string[];          // 영화/게임/광고/방송 등 이 곡이 삽입된 곳
    genre: string | null;
    lyrics: string | null;     // 웹에서 찾은 가사 원문(저작권 있는 콘텐츠일 수 있음 - 개인 용도로만 사용)
    notes: string | null;
    versionNote: string | null; // 리메이크/리마스터/라이브/커버 등 원곡과 다른 버전이면 그 종류(예: "Remake", "Live"), 원곡/판단 불가면 null
};

export type CMusicFileInfo = {
    fileName: string;
    absolutePath: string;
    folderPath: string;
};

// mp3(ID3)/flac/ogg 등 파일 자체에 내장된 태그. AI 없이 파일에서 직접 읽는 결정론적 정보다.
export type CMusicId3Tags = {
    title: string | null;
    artist: string | null;
    albumArtist: string | null;
    album: string | null;
    year: number | null;
    genre: string | null;
    track: number | null;
    composer: string | null;
    comment: string | null;
    hasPicture: boolean;
    format: { container: string | null; codec: string | null; bitrate: number | null; sampleRate: number | null };
};

// AcoustID(MusicBrainz 기반 무료 DB) 조회 결과만 담는다(원본 지문 자체는 CMusicFingerprintMatch 쪽에 별도 보관).
type CMusicAcoustIdMatch = {
    matched: boolean;
    score: number | null;      // 0~1, AcoustID가 매긴 매칭 신뢰도
    recordingId: string | null; // MusicBrainz recording ID
    title: string | null;
    artist: string[];
    album: string | null;
    year: number | null;
};

// Chromaprint 원본 지문(fingerprint/duration)은 AcoustID 조회 성패와 무관하게 항상 보관한다 - 오디오
// 내용 자체로 하는 중복 파일 체크는 이 원본 지문에 의존하고, AcoustID 매칭(조회 실패/미매칭 가능)에
// 의존하면 안 된다.
export type CMusicFingerprintMatch = CMusicAcoustIdMatch & {
    fingerprint: string | null;
    duration: number | null;
};

export type CMusicFullResult = {
    fileInfo: CMusicFileInfo;
    id3: CMusicId3Tags;
    musical: CMusicAnalysis;
    fingerprint: CMusicFingerprintMatch | null; // AcoustID API 키가 없으면 null(조회 자체를 건너뜀)
    external: CMusicExternalInfo;
};

const DEFAULT_TAG_MODEL = 'grok-4.5';

// TagExternal/_fastExternalLookup/_resolveAcoustIdExternal이 AI 웹검색으로 채우려 시도하는 개별 항목.
// notes/versionNote는 검색 결과를 해석하는 메타 정보라 항상 같이 나온다(토글 대상 아님).
export type TMusicSearchField = 'title' | 'composer' | 'artist' | 'album' | 'year' | 'genre' | 'usedIn' | 'lyrics';

// fields 파라미터를 생략했을 때 쓰는 기본값. lyrics/usedIn은 둘 다 무료 구조화 소스로 원천적으로 못 채우는
// 항목이라(usedIn은 애초에 조회할 무료 API 자체가 없음) 켜두면 거의 매 곡마다 AI 웹검색 폴백이 붙어
// 토큰 소모가 커서 기본에서 뺐다 - 필요하면 fields에 명시적으로 넣어서 켠다.
export const DEFAULT_SEARCH_FIELDS: TMusicSearchField[] = ['title', 'composer', 'artist', 'album', 'year', 'genre'];
export const ALL_SEARCH_FIELDS: TMusicSearchField[] = ['title', 'composer', 'artist', 'album', 'year', 'genre', 'usedIn', 'lyrics'];

// ── Input/Output 파라미터 형태 ──────────────────────────────────────────────────────────────
// AnalyzeFile/AnalyzeAudio/AnalyzeFingerprint/AnalyzeWeb 4개 함수 전부 (input, output) 두 개의 JSON을
// 받는다. input은 "무엇을 어떻게 조사할지", output은 "결과를 어떤 초기값으로 채워서 시작할지"의 템플릿이다.
// AnalyzeWeb에서는 output에 들어있는 키(존재 여부)가 곧 "그 필드를 검색할지 말지"의 선택 기준이 된다 -
// 키가 있으면 검색 대상(값은 검색 실패 시 쓸 폴백), 키가 없으면 검색 자체를 생략하고 항상 null/[]로 고정한다.

export interface IReadId3TagsInput { filePath: string; }
export const DEFAULT_ID3_TAGS: CMusicId3Tags = {
    title: null, artist: null, albumArtist: null, album: null, year: null, genre: null,
    track: null, composer: null, comment: null, hasPicture: false,
    format: { container: null, codec: null, bitrate: null, sampleRate: null },
};

export interface IAnalyzeAudioInput { filePath: string; }
export const DEFAULT_ANALYSIS: CMusicAnalysis = {
    file: '', durationSec: 0,
    overall: {
        rhythm: { bpm: 0, confidence: 0, beatCount: 0, octaveDoubleSuspect: false, bpmHalfCandidate: null },
        tonal: { key: '', scale: '', strength: 0 },
        loudness: { dynamicComplexity: 0, loudnessDb: 0 },
    },
    segments: [],
};

// acoustIdApiKey가 없으면(또는 조회 실패) AcoustID 매칭 없이 로컬 지문(fingerprint/duration)만 채워서 돌려준다.
export interface IFingerprintInput { filePath: string; acoustIdApiKey?: string; }
export const DEFAULT_FINGERPRINT: CMusicFingerprintMatch = {
    matched: false, score: null, recordingId: null, title: null, artist: [], album: null, year: null,
    fingerprint: null, duration: null,
};

// AnalyzeWeb: TagExternal/_fastExternalLookup/_resolveAcoustIdExternal 3갈래 분기를 감싸는 단일 진입점.
export interface ISearchExternalInput {
    fileName: string;
    folderPath?: string;
    extraHint?: string;
    candidateTitle?: string;               // ID3/지문에서 얻은 후보(있으면 무료 경로부터 시도)
    candidateArtist?: string;
    fingerprint?: CMusicFingerprintMatch | null; // 고신뢰 매칭이면 AcoustID 경로를 탐
    provider?: CAI.eProvider;              // 기본: grok
    model?: string;                        // 기본: grok-4.5
}
// output 템플릿에 없는 키는 검색 안 함(항상 null/[]). 기본값은 lyrics/usedIn을 뺀 6항목이 켜져 있다
// (토큰 절감 이유는 DEFAULT_SEARCH_FIELDS 주석 참고) - lyrics/usedIn을 켜고 싶으면 이 객체를 스프레드한
// 뒤 해당 키를 추가하고, 다른 항목을 빼고 싶으면 해당 키를 지우고 넘기면 된다.
export type ISearchExternalOutputTemplate = Partial<CMusicExternalInfo>;
export const DEFAULT_SEARCH_OUTPUT: ISearchExternalOutputTemplate = {
    title: null, composer: null, artist: null, album: null, year: null,
    genre: null,
};

// AcoustID 매칭 score(0~1)가 이 값 이상이면 신뢰도가 충분하다고 보고 AI 웹검색(TagExternal)을 생략한다.
const HIGH_CONFIDENCE_FINGERPRINT_SCORE = 0.9;

// Chromaprint(무료 오픈소스) fpcalc 실행파일 - OS별로 GitHub 릴리즈에서 자동 다운로드해 씀.
const CHROMAPRINT_RELEASE_API = 'https://api.github.com/repos/acoustid/chromaprint/releases/latest';

// iTunes/Discogs 교차검증에서 두 소스의 title/artist가 "같은 곡"이라고 볼 최소 토큰 일치율(0~1).
// 실측(iTunes vs Discogs, 동일곡): 완전 일치 시 1.0 - 0.5는 절반 이상 단어가 겹치는 수준으로 여유를 둔 값이다.
const FAST_LOOKUP_MATCH_THRESHOLD = 0.5;

// MusicBrainz는 1req/sec를 넘기면 이후 요청이 TLS 핸드셰이크 단계에서부터 거부되는 것을 실측으로 확인함
// (익명 클라이언트의 abuse-prevention으로 추정) - 프로세스 전역에서 호출 간격을 강제로 직렬화해야 한다.
const MUSICBRAINZ_MIN_INTERVAL_MS = 1100;

export class CMusicAnalyzer {
    private static _essentiaPromise: Promise<any> | null = null;
    private static _mbLastCallAt = 0; // MusicBrainz 호출 간격 강제(전역 직렬화)용 - Fast* 메서드 참고.

    // node_modules에 해당 패키지가 없으면 프로젝트 루트(package.json 위치)에 자동 설치한다.
    private static async _ensureNpmPackage(pkg: string): Promise<void> {
        try { _require.resolve(pkg); return; } catch { /* 미설치 */ }
        CConsol.Log(`[MusicAnalyzer] ${pkg} 없음 -> npm install 시작`);
        const proc = await CUtilSystem.Spawn('npm', ['install', pkg], 'pipe', CPath.ArtgineRootPath());
        if (!proc) throw new Error(`npm install 프로세스를 시작하지 못했습니다 (${pkg})`);
        await new Promise<void>((resolve, reject) => {
            let err = '';
            proc.stderr.on('data', (d: Buffer) => err += d.toString());
            proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`npm install ${pkg} 실패: ` + err.slice(-500))));
            proc.on('error', reject);
        });
        CConsol.Log(`[MusicAnalyzer] ${pkg} 설치 완료`);
    }

    private static async _ensureFfmpeg(): Promise<void> {
        if (fs.existsSync(FFMPEG_PATH)) return;
        CConsol.Log('[MusicAnalyzer] ffmpeg.exe 없음 -> 다운로드 시작');
        await fs.promises.mkdir(BIN_DIR, { recursive: true });
        const data = await CFile.Load(FFMPEG_ZIP_URL);
        if (!data) throw new Error('ffmpeg 다운로드 실패');
        const AdmZip: any = _require('adm-zip');
        const zip = new AdmZip(Buffer.from(data as ArrayBuffer));
        const entry = zip.getEntries().find((e: any) => /\/bin\/ffmpeg\.exe$/i.test(e.entryName));
        if (!entry) throw new Error('ffmpeg ZIP 안에서 ffmpeg.exe를 찾지 못함');
        fs.writeFileSync(FFMPEG_PATH, entry.getData());
        CConsol.Log('[MusicAnalyzer] ffmpeg.exe 설치 완료');
    }

    private static async _getEssentia(): Promise<any> {
        if (!this._essentiaPromise) {
            this._essentiaPromise = (async () => {
                await this._ensureNpmPackage('essentia.js');
                const mod: any = await import('essentia.js');
                // essentia.js(Node/CJS 빌드)의 EssentiaWASM은 팩토리 함수가 아니라 require 시점에
                // 이미 동기 초기화된 WASM 모듈 객체 자체다(브라우저용 async 팩토리 패턴과 다름).
                return new mod.Essentia(mod.EssentiaWASM);
            })();
        }
        return this._essentiaPromise;
    }

    // 입력 오디오(mp3 등)를 essentia가 요구하는 mono 44100Hz 32bit float WAV로 변환한다.
    private static async _decodeToFloat32(inputPath: string): Promise<Float32Array> {
        await this._ensureFfmpeg();
        const tmpWav = path.join(BIN_DIR, `.tmp_analyze_${Date.now()}.wav`);
        const proc = await CUtilSystem.Spawn(FFMPEG_PATH, [
            '-y', '-i', inputPath, '-ac', '1', '-ar', '44100', '-f', 'wav', '-acodec', 'pcm_f32le', tmpWav,
        ]);
        if (!proc) throw new Error('ffmpeg 프로세스를 시작하지 못했습니다');
        let err = '';
        proc.stderr?.on('data', (d: Buffer) => err += d.toString());
        await new Promise<void>((resolve, reject) => {
            proc.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg 변환 실패: ' + err.slice(-500))));
            proc.on('error', reject);
        });

        try {
            return this._readWavFloat32(tmpWav);
        } finally {
            try { fs.unlinkSync(tmpWav); } catch { /* ignore */ }
        }
    }

    // RIFF/WAVE 청크를 직접 파싱한다(고정 44바이트 오프셋을 가정하지 않음 - 청크 순서가 다를 수 있음).
    private static _readWavFloat32(wavPath: string): Float32Array {
        const buf = fs.readFileSync(wavPath);
        if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE')
            throw new Error('올바른 WAV 파일이 아닙니다: ' + wavPath);

        let offset = 12;
        let dataOffset = -1;
        let dataLength = 0;
        while (offset + 8 <= buf.length) {
            const chunkId = buf.toString('ascii', offset, offset + 4);
            const chunkSize = buf.readUInt32LE(offset + 4);
            if (chunkId === 'data') { dataOffset = offset + 8; dataLength = chunkSize; break; }
            offset += 8 + chunkSize + (chunkSize % 2);
        }
        if (dataOffset < 0) throw new Error('WAV data 청크를 찾지 못함: ' + wavPath);

        const sampleCount = dataLength / 4; // pcm_f32le = 4 bytes/sample
        const samples = new Float32Array(sampleCount);
        for (let i = 0; i < sampleCount; i++) samples[i] = buf.readFloatLE(dataOffset + i * 4);
        return samples;
    }

    // 비트 시각 배열(초) 기준으로 마디(BEATS_PER_BAR개 비트) 경계를 만든다.
    // 곡 끝부분 자투리(마지막 온전한 마디 이후 남는 부분)도 하나의 구간으로 포함시킨다.
    private static _buildBarBoundaries(ticksSec: Float32Array, durationSec: number): number[] {
        const boundaries: number[] = [0];
        for (let i = BEATS_PER_BAR - 1; i < ticksSec.length; i += BEATS_PER_BAR) boundaries.push(ticksSec[i]);
        if (boundaries[boundaries.length - 1] < durationSec) boundaries.push(durationSec);
        return boundaries;
    }

    // 한 마디 구간(Float32Array 조각)을 분석한다. 로컬 템포는 재추정 대신, 그 구간에 속한 비트들의
    // 간격을 평균 내 역산한다(짧은 창에서 RhythmExtractor2013을 다시 돌리는 것보다 안정적).
    private static _analyzeBar(essentia: any, chunk: Float32Array, beatsInBar: number[]): Omit<CMusicSegment, 'barIndex' | 'startSec' | 'endSec'> {
        const seg = {
            beatCount: beatsInBar.length,
            bpm: null as number | null,
            key: null as string | null, scale: null as string | null, keyStrength: null as number | null,
            loudnessDb: null as number | null,
        };
        if (beatsInBar.length >= 2) {
            let sumInterval = 0;
            for (let i = 1; i < beatsInBar.length; i++) sumInterval += beatsInBar[i] - beatsInBar[i - 1];
            const avgInterval = sumInterval / (beatsInBar.length - 1);
            seg.bpm = avgInterval > 0 ? 60 / avgInterval : null;
        }
        if (chunk.length > 0) {
            const vector = essentia.arrayToVector(chunk);
            try {
                const key = essentia.KeyExtractor(vector);
                seg.key = key.key; seg.scale = key.scale; seg.keyStrength = key.strength;
            } catch { /* 조성 추정 불가(구간이 너무 짧음 등) */ }
            vector.delete();

            // 마디마다 DynamicComplexity 전체 알고리즘을 돌리면 느리고(2~3초 창에서는 통계적으로도 불안정),
            // 음량 자체는 RMS -> dB 경량 계산으로 충분하다.
            let sumSq = 0;
            for (let i = 0; i < chunk.length; i++) sumSq += chunk[i] * chunk[i];
            const rms = Math.sqrt(sumSq / chunk.length);
            seg.loudnessDb = rms > 0 ? 20 * Math.log10(rms) : null;
        }
        return seg;
    }

    // tick 시각 주변의 어택(에너지 상승폭)을 잰다. 2배속 오검출 판별에 쓰는 신호일 뿐, 세그먼트 loudnessDb(RMS)와는 목적이 다르다.
    private static _onsetStrength(samples: Float32Array, tickSec: number): number {
        const preMs = 15, postMs = 60;
        const centerIdx = Math.round(tickSec * SAMPLE_RATE);
        const preStart = Math.max(0, centerIdx - Math.round(preMs / 1000 * SAMPLE_RATE));
        const postEnd = Math.min(samples.length, centerIdx + Math.round(postMs / 1000 * SAMPLE_RATE));
        let preSumSq = 0, preN = 0, postSumSq = 0, postN = 0;
        for (let i = preStart; i < centerIdx; i++) { preSumSq += samples[i] * samples[i]; preN++; }
        for (let i = centerIdx; i < postEnd; i++) { postSumSq += samples[i] * samples[i]; postN++; }
        const preRms = preN > 0 ? Math.sqrt(preSumSq / preN) : 0;
        const postRms = postN > 0 ? Math.sqrt(postSumSq / postN) : 0;
        return Math.max(0, postRms - preRms);
    }

    // 정확히 2배속으로 오검출된 트랙은 진짜 다운비트/백비트가 강-약으로 교대되는데, 그 절반만 tick으로 잡히다 보니
    // 홀수/짝수 tick의 평균 어택 세기가 크게 벌어진다(실측: 정상 트랙 1.16~1.29배, 2배속 오검출 트랙 2.17배).
    // 1.5배 등 2배가 아닌 옥타브 오류는 이 신호로 걸러지지 않는다(신호 자체가 다르지 않음 - 알려진 한계).
    private static readonly OCTAVE_DOUBLE_ALTERNATION_THRESHOLD = 1.6;

    private static _checkOctaveDouble(samples: Float32Array, ticksSec: Float32Array): boolean {
        if (ticksSec.length < 8) return false;
        // 전주/아웃트로의 불규칙한 어택을 피해 곡 중반부(20%~80%)만 사용한다.
        const startIdx = Math.floor(ticksSec.length * 0.2);
        const endIdx = Math.floor(ticksSec.length * 0.8);
        const strengths: number[] = [];
        for (let i = startIdx; i < endIdx; i++) strengths.push(this._onsetStrength(samples, ticksSec[i]));
        if (strengths.length < 8) return false;

        const even = strengths.filter((_, i) => i % 2 === 0);
        const odd = strengths.filter((_, i) => i % 2 === 1);
        const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
        const evenAvg = avg(even), oddAvg = avg(odd);
        const weaker = Math.min(evenAvg, oddAvg);
        if (weaker <= 0) return false;
        const alternationRatio = Math.max(evenAvg, oddAvg) / weaker;
        return alternationRatio > this.OCTAVE_DOUBLE_ALTERNATION_THRESHOLD;
    }

    // 오디오 파일 하나를 분석해 JSON 결과를 반환한다. 전체 곡 요약(overall) + 마디(4비트) 단위 구간별(segments) 결과.
    static async AnalyzeAudio(input: IAnalyzeAudioInput, output: CMusicAnalysis = DEFAULT_ANALYSIS): Promise<CMusicAnalysis> {
        const { filePath } = input;
        if (!fs.existsSync(filePath)) throw new Error('파일이 없습니다: ' + filePath);

        const essentia = await this._getEssentia();
        const fullSamples = await this._decodeToFloat32(filePath);
        const fullDurationSec = fullSamples.length / SAMPLE_RATE;

        if (fullDurationSec < MIN_ANALYZE_DURATION_SEC) {
            // 게임 보이스 SFX 등 1초 미만 초단타 클립 - essentia 리듬 추출기가 프레임 윈도우를 못 만들어
            // abort하므로 아예 돌리지 않고 빈 결과를 반환한다.
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

        // 몇 시간짜리 연속 믹스는 전체를 PCM으로 메모리에 올리면 essentia-wasm 메모리 한도를 넘어 abort하므로
        // 앞부분만 잘라서 분석한다. durationSec은 실제 전체 길이 그대로 리포트하되, 마디 구간(segments)은
        // 분석에 실제 쓰인 구간까지만 만든다.
        const samples = fullDurationSec > MAX_ANALYZE_DURATION_SEC
            ? fullSamples.subarray(0, MAX_ANALYZE_DURATION_SEC * SAMPLE_RATE)
            : fullSamples;
        const analyzedDurationSec = samples.length / SAMPLE_RATE;

        const overallVector = essentia.arrayToVector(samples);
        const rhythm = essentia.RhythmExtractor2013(overallVector);
        const key = essentia.KeyExtractor(overallVector);
        const dynamics = essentia.DynamicComplexity(overallVector);
        const ticksSec: Float32Array = essentia.vectorToArray(rhythm.ticks);
        const beatCount = ticksSec.length;
        rhythm.ticks?.delete?.();
        overallVector.delete();

        const octaveDoubleSuspect = this._checkOctaveDouble(samples, ticksSec);
        const bpmHalfCandidate = octaveDoubleSuspect ? rhythm.bpm / 2 : null;

        const segments: CMusicSegment[] = [];
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
        } else {
            // 비트 검출 실패(너무 짧거나 리듬이 불명확한 트랙) - 곡 전체를 구간 하나로 폴백.
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

    // 파일에 내장된 ID3(mp3)/Vorbis(ogg/flac) 등 태그를 읽는다. AI/네트워크 없이 파일 자체에서
    // 바로 뽑는 결정론적 정보 - music-metadata 패키지는 node_modules에 없으면 자동 설치한다.
    static async AnalyzeFile(input: IReadId3TagsInput, output: CMusicId3Tags = DEFAULT_ID3_TAGS): Promise<CMusicId3Tags> {
        const { filePath } = input;
        if (!fs.existsSync(filePath)) throw new Error('파일이 없습니다: ' + filePath);
        await this._ensureNpmPackage('music-metadata');
        const mm: any = await import('music-metadata');
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

    // 압축 해제된 디렉터리 트리에서 이름이 정확히 일치하는 파일을 재귀적으로 찾는다(tar 내부 폴더 깊이가
    // 릴리즈마다 달라 고정 경로를 가정할 수 없음).
    private static _findFileRecursive(dir: string, exactName: string): string | null {
        for (const name of fs.readdirSync(dir)) {
            const full = path.join(dir, name);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
                const found = this._findFileRecursive(full, exactName);
                if (found) return found;
            } else if (name === exactName) {
                return full;
            }
        }
        return null;
    }

    // node_modules에 fpcalc(Chromaprint)가 없으면 GitHub 릴리즈에서 현재 OS에 맞는 배포본을 자동 다운로드한다.
    // 파일명에 버전이 박혀 있어(예: chromaprint-fpcalc-1.6.0-windows-x86_64.zip) ffmpeg처럼 고정된
    // latest/download URL을 못 쓰고, GitHub API로 최신 릴리즈의 asset 목록을 먼저 조회해야 한다.
    private static async _ensureFpcalc(): Promise<string> {
        const exeName = os.platform() === 'win32' ? 'fpcalc.exe' : 'fpcalc';
        const fpcalcPath = path.join(BIN_DIR, exeName);
        if (fs.existsSync(fpcalcPath)) return fpcalcPath;

        CConsol.Log('[MusicAnalyzer] fpcalc 없음 -> chromaprint 릴리즈 조회');
        await fs.promises.mkdir(BIN_DIR, { recursive: true });

        const releaseRes = await fetch(CHROMAPRINT_RELEASE_API, { headers: { 'User-Agent': 'Artgine-MusicAnalyzer' } });
        if (!releaseRes.ok) throw new Error('chromaprint 릴리즈 조회 실패: HTTP ' + releaseRes.status);
        const release: any = await releaseRes.json();
        const assets: { name: string; browser_download_url: string }[] = release.assets || [];

        const platform = os.platform();
        const pattern = platform === 'win32' ? /windows.*\.zip$/i
                       : platform === 'darwin' ? /macos.*\.zip$/i
                       : /linux.*\.(tar\.gz|zip)$/i;
        const asset = assets.find(a => pattern.test(a.name));
        if (!asset) throw new Error(`현재 OS(${platform})용 fpcalc 배포본을 chromaprint 릴리즈에서 찾지 못함`);

        CConsol.Log('[MusicAnalyzer] fpcalc 다운로드: ' + asset.name);
        const data = await CFile.Load(asset.browser_download_url);
        if (!data) throw new Error('fpcalc 다운로드 실패');
        const buf = Buffer.from(data as ArrayBuffer);

        if (asset.name.endsWith('.zip')) {
            const AdmZip: any = _require('adm-zip');
            const zip = new AdmZip(buf);
            const entry = zip.getEntries().find((e: any) => /(^|\/)fpcalc(\.exe)?$/i.test(e.entryName));
            if (!entry) throw new Error('zip 안에서 fpcalc 실행파일을 찾지 못함');
            fs.writeFileSync(fpcalcPath, entry.getData());
        } else {
            // .tar.gz(리눅스): 순수 zip 전용인 adm-zip으로 못 열어 tar 패키지를 자동 설치해서 쓴다.
            await this._ensureNpmPackage('tar');
            const tar: any = await import('tar');
            const tmpTar = path.join(BIN_DIR, `.tmp_fpcalc_${Date.now()}.tar.gz`);
            const extractDir = path.join(BIN_DIR, `.tmp_fpcalc_extract_${Date.now()}`);
            fs.writeFileSync(tmpTar, buf);
            await fs.promises.mkdir(extractDir, { recursive: true });
            try {
                await tar.x({ file: tmpTar, cwd: extractDir });
                const found = this._findFileRecursive(extractDir, 'fpcalc');
                if (!found) throw new Error('tar 안에서 fpcalc 실행파일을 찾지 못함');
                fs.copyFileSync(found, fpcalcPath);
            } finally {
                try { fs.unlinkSync(tmpTar); } catch { /* ignore */ }
                try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch { /* ignore */ }
            }
        }
        if (platform !== 'win32') fs.chmodSync(fpcalcPath, 0o755);
        CConsol.Log('[MusicAnalyzer] fpcalc 설치 완료');
        return fpcalcPath;
    }

    // fpcalc로 오디오 지문(Chromaprint fingerprint)과 길이를 로컬 계산한 뒤, acoustIdApiKey가 있으면 AcoustID
    // 무료 API로 MusicBrainz 매칭까지 추가로 조회한다(키가 없거나 조회 실패해도 로컬 지문은 그대로 반환 -
    // 오디오 내용 기반 중복 파일 체크는 이 로컬 지문에만 의존하고 네트워크가 필요 없기 때문).
    static async AnalyzeFingerprint(input: IFingerprintInput, output: CMusicFingerprintMatch = DEFAULT_FINGERPRINT): Promise<CMusicFingerprintMatch> {
        const { filePath, acoustIdApiKey } = input;
        if (!fs.existsSync(filePath)) throw new Error('파일이 없습니다: ' + filePath);
        const fpcalcPath = await this._ensureFpcalc();
        const proc = await CUtilSystem.Spawn(fpcalcPath, ['-json', filePath]);
        if (!proc) throw new Error('fpcalc 프로세스를 시작하지 못했습니다');
        let out = '', err = '';
        proc.stdout?.on('data', (d: Buffer) => out += d.toString());
        proc.stderr?.on('data', (d: Buffer) => err += d.toString());
        await new Promise<void>((resolve, reject) => {
            proc.on('close', (code) => code === 0 ? resolve() : reject(new Error('fpcalc 실행 실패: ' + err.slice(-400))));
            proc.on('error', reject);
        });
        const parsed = JSON.parse(out);

        let match: CMusicAcoustIdMatch = {
            matched: false, score: null, recordingId: null, title: null, artist: [], album: null, year: null,
        };
        if (acoustIdApiKey) {
            try {
                match = await CMusicAnalyzer.LookupAcoustId(parsed.duration, parsed.fingerprint, acoustIdApiKey);
            } catch (e) {
                CConsol.Log('[MusicAnalyzer] AcoustID 조회 실패(무시하고 계속, 로컬 지문은 보존): ' + (e as Error).message);
            }
        }
        return { ...output, ...match, fingerprint: parsed.fingerprint, duration: parsed.duration };
    }

    // Chromaprint 지문을 AcoustID 무료 API(https://acoustid.org/webservice)에 조회해 MusicBrainz 매칭을 찾는다.
    // apiKey는 https://acoustid.org/api-key 에서 무료로 직접 발급받아야 한다(익명 사용 불가, 과금은 없음).
    static async LookupAcoustId(duration: number, fingerprint: string, apiKey: string): Promise<CMusicAcoustIdMatch> {
        const url = new URL('https://api.acoustid.org/v2/lookup');
        url.searchParams.set('client', apiKey);
        url.searchParams.set('duration', String(Math.round(duration)));
        url.searchParams.set('fingerprint', fingerprint);
        url.searchParams.set('meta', 'recordings+releasegroups+compress');

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('AcoustID API 오류: HTTP ' + res.status);
        const json: any = await res.json();
        if (json.status !== 'ok') throw new Error('AcoustID API 오류: ' + (json.error?.message || json.status));

        const results: any[] = json.results || [];
        if (!results.length) return { matched: false, score: null, recordingId: null, title: null, artist: [], album: null, year: null };

        const best = results.slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0];
        const rec = best.recordings?.[0];
        if (!rec) return { matched: false, score: best.score ?? null, recordingId: null, title: null, artist: [], album: null, year: null };

        const releaseGroup = rec.releasegroups?.[0];
        return {
            matched: true,
            score: best.score ?? null,
            recordingId: rec.id ?? null,
            title: rec.title ?? null,
            artist: (rec.artists || []).map((a: any) => a.name),
            album: releaseGroup?.title ?? null,
            year: releaseGroup?.['first-release-date'] ? parseInt(releaseGroup['first-release-date'].slice(0, 4), 10) : null,
        };
    }

    // 검색 결과 제목에 흔히 붙는 잡음(공식 오디오/뮤비 표기 등)만 지운다. "(Remake)", "(Live)" 같은
    // 버전 표기는 원곡과 다른 녹음을 구분하는 데 필요한 정보라 일부러 지우지 않는다 - 예전에는 괄호 안
    // 내용을 통째로 지웠는데, 그러면 원곡과 리메이크가 제목/아티스트만으로 구분이 안 돼 매칭 점수가
    // 똑같이 나오는 문제가 있었다(리메이크곡에 원곡 연도/앨범이 잘못 붙는 원인).
    private static readonly _NOISE_PHRASES = /\b(official\s*(audio|video|mv|music\s*video|lyric\s*video)|lyric\s*video|visualizer|m\/v|hd|4k)\b/gi;

    // 비교용으로 제목/아티스트 문자열을 정규화한다(대소문자/잡음 표기/feat./특수문자 차이를 무시).
    private static _normalizeForMatch(s: string): string {
        return s.toLowerCase()
            .replace(CMusicAnalyzer._NOISE_PHRASES, ' ')
            .replace(/feat\.?.*$/i, ' ')
            .replace(/[^a-z0-9가-힣\s]/g, ' ')
            .trim();
    }

    // 리메이크/리마스터/라이브/커버/어쿠스틱 등 원곡과 다른 버전임을 나타내는 표기를 제목에서 찾는다
    // (결정론적, AI 호출 없음). fast path에서 iTunes/Discogs 매칭 직후 바로 붙일 수 있어 빠르다.
    private static readonly _VERSION_MARKERS: Array<{ re: RegExp; label: string }> = [
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
    // 원곡이면(또는 판단 불가면) null, 다른 버전이면 그 종류 라벨(예: "Remake", "Live")을 돌려준다.
    private static _detectVersionMarker(...titles: Array<string | null | undefined>): string | null {
        const text = titles.filter(Boolean).join(' ');
        for (const { re, label } of CMusicAnalyzer._VERSION_MARKERS) {
            if (re.test(text)) return label;
        }
        return null;
    }

    // 두 문자열의 토큰(단어) 겹침 비율(0~1) - 완전 일치가 아니어도 같은 곡으로 볼 수 있게 허용 오차를 둔다.
    private static _tokenOverlapScore(a: string, b: string): number {
        const na = CMusicAnalyzer._normalizeForMatch(a);
        const nb = CMusicAnalyzer._normalizeForMatch(b);
        const ca = na.replace(/\s+/g, '');
        const cb = nb.replace(/\s+/g, '');
        // "좋은날" vs "좋은 날"처럼 한글 띄어쓰기만 다른 표기는 같은 제목으로 본다.
        if (ca && ca === cb) return 1;
        const ta = new Set(na.split(/\s+/).filter(Boolean));
        const tb = new Set(nb.split(/\s+/).filter(Boolean));
        if (!ta.size || !tb.size) return 0;
        let common = 0;
        for (const t of ta) if (tb.has(t)) common++;
        return common / Math.max(ta.size, tb.size);
    }

    // iTunes Search API(무인증/무료)에서 title+artist로 가장 근접한 트랙을 찾는다.
    private static async _queryItunes(title: string, artist: string): Promise<{ title: string; artist: string; album: string | null; genre: string | null; releaseYear: number | null } | null> {
        const url = 'https://itunes.apple.com/search?' + new URLSearchParams({
            term: `${artist} ${title}`, entity: 'song', limit: '5',
        }).toString();
        const res = await fetch(url);
        if (!res.ok) return null;
        const json: any = await res.json();
        const results: any[] = json.results || [];
        let best: any = null, bestScore = 0;
        for (const r of results) {
            const score = CMusicAnalyzer._tokenOverlapScore(r.trackName || '', title) * 0.6
                        + CMusicAnalyzer._tokenOverlapScore(r.artistName || '', artist) * 0.4;
            if (score > bestScore) { bestScore = score; best = r; }
        }
        if (!best || bestScore < FAST_LOOKUP_MATCH_THRESHOLD) return null;
        return {
            title: best.trackName ?? title,
            artist: best.artistName ?? artist,
            album: best.collectionName ?? null,
            genre: best.primaryGenreName ?? null,
            releaseYear: best.releaseDate ? parseInt(String(best.releaseDate).slice(0, 4), 10) : null,
        };
    }

    // Discogs 공개 검색 API(무인증)에서 artist/track 구조화 파라미터로 조회한다.
    // 자유 텍스트 검색(q=)은 관련 없는 결과가 섞여 부정확함이 실측으로 확인돼 반드시 구조화 파라미터를 쓴다.
    private static async _queryDiscogs(title: string, artist: string): Promise<{ title: string; artist: string; genre: string | null; releaseYear: number | null } | null> {
        const url = 'https://api.discogs.com/database/search?' + new URLSearchParams({
            artist, track: title, type: 'release', per_page: '5',
        }).toString();
        const res = await fetch(url, { headers: { 'User-Agent': 'Artgine-MusicAnalyzer/1.0' } });
        if (!res.ok) return null;
        const json: any = await res.json();
        const results: any[] = json.results || [];
        if (!results.length) return null;
        const best = results[0];
        // Discogs 검색 결과 title은 보통 "아티스트 - 앨범/트랙" 형식이라 하이픈으로 분리해 아티스트를 뽑는다.
        const splitIdx = String(best.title || '').indexOf(' - ');
        const bestArtist = splitIdx >= 0 ? best.title.slice(0, splitIdx) : artist;
        if (CMusicAnalyzer._tokenOverlapScore(bestArtist, artist) < FAST_LOOKUP_MATCH_THRESHOLD) return null;
        return {
            title,
            artist: bestArtist,
            genre: Array.isArray(best.style) && best.style.length ? best.style[0] : (Array.isArray(best.genre) && best.genre.length ? best.genre[0] : null),
            releaseYear: best.year ? parseInt(String(best.year), 10) : null,
        };
    }

    // MusicBrainz recording+work 조회로 작곡가(composer relationship)를 찾는다(best-effort).
    // 실패해도 전체 조회를 막지 않도록 호출부에서 반드시 try/catch로 감싼다.
    private static async _queryMusicBrainzComposer(title: string, artist: string): Promise<string | null> {
        const wait = MUSICBRAINZ_MIN_INTERVAL_MS - (Date.now() - CMusicAnalyzer._mbLastCallAt);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        CMusicAnalyzer._mbLastCallAt = Date.now();

        const query = `recording:"${title.replace(/"/g, '')}" AND artist:"${artist.replace(/"/g, '')}" AND NOT video:true`;
        const url = 'https://musicbrainz.org/ws/2/recording/?' + new URLSearchParams({
            query, fmt: 'json', limit: '1', inc: 'work-rels',
        }).toString();
        const res = await fetch(url, { headers: { 'User-Agent': 'Artgine-MusicAnalyzer/1.0 (contact: none)' } });
        if (!res.ok) return null;
        const json: any = await res.json();
        const rec = json.recordings?.[0];
        if (!rec) return null;
        for (const rel of rec.relations || []) {
            if (rel['target-type'] === 'work' && rel.work?.relations) {
                const composerRel = rel.work.relations.find((r: any) => r.type === 'composer');
                if (composerRel?.artist?.name) return composerRel.artist.name;
            }
        }
        return null;
    }

    // lyrics.ovh의 한국어 가사는 줄마다 "한글 원문 + 구분자 없는 로마자 표기"가 그대로 붙어 나오는 경우가
    // 있다(실측 확인). 각 줄에서 한글 다음 알파벳이 시작되는 지점을 찾아 로마자 꼬리를 잘라낸다.
    private static _stripRomanizationTail(lyrics: string): string {
        return lyrics.split('\n').map(line => {
            const m = line.match(/^([\s\S]*?[가-힣.,!?~\d])([a-z].*)$/i);
            return m ? m[1] : line;
        }).join('\n');
    }

    private static readonly _BUGS_FETCH_HEADERS: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    };

    private static _decodeHtmlEntities(s: string): string {
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

    // 벅스 가사검색 HTML: 곡 정보 tr(track_title/artist_disp_nm) 바로 다음에
    // <tr rowType="lyrics"><td class="lyrics">가사 미리보기</td>가 온다. 같은 tr에 제목+가사가
    // 같이 있지 않아서, 속성 기준으로 묶어서 고른다.
    private static _extractLyricsFromBugsHtml(html: string, title: string, artist: string): string | null {
        const blockRe = /track_title="([^"]*)"[\s\S]{0,2500}?artist_disp_nm="([^"]*)"[\s\S]{0,800}?<tr[^>]*rowType="lyrics"[^>]*>[\s\S]*?<td[^>]*class="lyrics"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
        let best: { score: number; lyrics: string } | null = null;
        for (const m of html.matchAll(blockRe)) {
            const rowTitle = CMusicAnalyzer._decodeHtmlEntities(m[1]);
            const rowArtist = CMusicAnalyzer._decodeHtmlEntities(m[2]);
            const lyrics = CMusicAnalyzer._decodeHtmlEntities(m[3]);
            if (lyrics.length < 10) continue;

            const titleScore = CMusicAnalyzer._tokenOverlapScore(rowTitle, title);
            if (titleScore < FAST_LOOKUP_MATCH_THRESHOLD) continue;
            const artistScore = artist ? CMusicAnalyzer._tokenOverlapScore(rowArtist, artist) : 0;
            // "산토끼 동요"처럼 장르 단어가 검색에 붙으면 영어동요가 먼저 뜨는 경우가 있어, 한글 제목이면 한글 가사를 가산한다.
            const hangulBias = /[가-힣]/.test(title) && /[가-힣]/.test(lyrics) ? 0.2 : 0;
            const englishPenalty = /영어동요|english/i.test(rowTitle) ? -0.4 : 0;
            const score = titleScore * 0.7 + artistScore * 0.3 + hangulBias + englishPenalty;
            if (!best || score > best.score) best = { score, lyrics };
        }
        if (best) return best.lyrics;

        // 마크업이 바뀌어 속성 매칭이 실패하면 기존 동요 스크립트처럼 첫 td.lyrics를 쓰되,
        // 한글 제목인데 가사가 한글이 아니면 건너뛴다.
        const wantHangul = /[가-힣]/.test(title);
        const lyricsPattern = /<td[^>]*class="lyrics"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
        for (const match of html.matchAll(lyricsPattern)) {
            const cleaned = CMusicAnalyzer._decodeHtmlEntities(match[1]);
            if (cleaned.length <= 10) continue;
            if (wantHangul && !/[가-힣]/.test(cleaned)) continue;
            return cleaned;
        }
        return null;
    }

    private static async _fetchBugsHtml(url: string): Promise<string | null> {
        try {
            const res = await fetch(url, { headers: CMusicAnalyzer._BUGS_FETCH_HEADERS });
            if (!res.ok) return null;
            return await res.text();
        } catch { return null; }
    }

    // 벅스(국내)에서 가사를 조회한다. 제목만으로 가사탭을 먼저 찾고, 없으면 제목+아티스트 / 통합검색.
    // 아티스트를 검색어에 먼저 넣으면 "동요" 같은 장르 단어가 영어동요 결과에 끌려가는 문제가 있다.
    private static async _queryLyricsBugs(title: string, artist: string): Promise<string | null> {
        const t = String(title || '').trim();
        if (!t) return null;
        const queries: string[] = [t];
        const both = [t, String(artist || '').trim()].filter(Boolean).join(' ');
        if (both !== t) queries.push(both);

        for (const q of queries) {
            for (const pathKind of ['lyrics', 'integrated'] as const) {
                const url = `https://music.bugs.co.kr/search/${pathKind}?q=` + encodeURIComponent(q);
                const html = await CMusicAnalyzer._fetchBugsHtml(url);
                if (!html) continue;
                const lyrics = CMusicAnalyzer._extractLyricsFromBugsHtml(html, title, artist);
                if (lyrics) return lyrics;
            }
        }
        return null;
    }

    // 가사는 국내(벅스)를 먼저 보고, 없으면 lyrics.ovh(해외)로 폴백한다. 실패는 정상 흐름(null).
    private static async _queryLyrics(title: string, artist: string): Promise<string | null> {
        const bugs = await CMusicAnalyzer._queryLyricsBugs(title, artist);
        if (bugs) return bugs;

        const url = 'https://api.lyrics.ovh/v1/' + encodeURIComponent(artist) + '/' + encodeURIComponent(title);
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const json: any = await res.json();
            return json.lyrics ? CMusicAnalyzer._stripRomanizationTail(json.lyrics) : null;
        } catch { return null; }
    }

    // MusicBrainz/lyrics.ovh/iTunes가 못 채운 필드들을 한 번의 AI 호출에 몰아서 물어본다(필드마다 따로 호출하지 않음).
    // TagExternal의 "이 파일이 무슨 곡인지부터 조사"하는 전체 웹검색과 달리, 곡이 이미 확정된 상태에서
    // 부족한 사실만 물어보므로(정체 확인 불필요) 더 짧게 끝날 것으로 기대한다.
    // usedIn(삽입 작품)은 구조화 API로 원천적으로 못 채우는 항목이라 missing에 있으면 항상 AI에 물어본다.
    private static async _queryMissingFieldsViaAI(
        title: string, artist: string, missing: Array<'composer' | 'lyrics' | 'genre' | 'usedIn'>, provider: CAI.eProvider, model: string,
    ): Promise<{ composer?: string | null; lyrics?: string | null; genre?: string | null; usedIn?: string[] }> {
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
            if (start < 0 || end < start) return {};
            return JSON.parse(result.text.slice(start, end + 1));
        } catch { return {}; }
    }

    // AI 웹검색 없이 iTunes+Discogs 2개 이상의 구조화 소스로 교차검증해 외적 정보를 채운다.
    // 두 소스가 서로 다른 곡을 가리키거나 어느 하나라도 못 찾으면 null을 돌려줘 AI 웹검색으로 폴백시킨다
    // (교차검증 없이 한쪽 소스만으로 확정하지 않는다).
    // usedIn(삽입 작품)은 의도적으로 부족 항목에서 제외한다 - 구조화 소스로 원천적으로 못 채우는 항목이라
    // 넣으면 사실상 모든 곡에서 AI가 호출돼 fast path의 속도 이점이 사라지기 때문이다.
    private static async _fastExternalLookup(
        title: string, artist: string, provider: CAI.eProvider, model: string, fields: TMusicSearchField[],
    ): Promise<CMusicExternalInfo | null> {
        const fieldSet = new Set(fields);
        const [itunes, discogs] = await Promise.all([
            CMusicAnalyzer._queryItunes(title, artist).catch(() => null),
            CMusicAnalyzer._queryDiscogs(title, artist).catch(() => null),
        ]);
        if (!itunes || !discogs) return null;
        if (CMusicAnalyzer._tokenOverlapScore(itunes.artist, discogs.artist) < FAST_LOOKUP_MATCH_THRESHOLD) return null;

        const [mbComposer, ovhLyrics] = await Promise.all([
            CMusicAnalyzer._queryMusicBrainzComposer(itunes.title, itunes.artist).catch(() => null),
            fieldSet.has('lyrics') ? CMusicAnalyzer._queryLyrics(itunes.title, itunes.artist) : Promise.resolve(null),
        ]);

        let composer = mbComposer;
        let lyrics = ovhLyrics;
        // fields에 없는 항목은 무료 소스에서도 못 찾았어도 AI로 쫓아가지 않는다(예: lyrics.ovh가 기악곡에서
        // 거의 항상 null을 주는데, 이걸 매번 AI 웹검색으로 재확인하면 대부분의 fast-path 호출에 숨은 AI
        // 세션이 하나씩 더 붙어 비용이 커진다 - fields로 이 재확인 자체를 끌 수 있게 함).
        const missing: Array<'composer' | 'lyrics'> = [];
        if (fieldSet.has('composer') && !composer) missing.push('composer');
        if (fieldSet.has('lyrics') && !lyrics) missing.push('lyrics');

        const aiFilled: string[] = [];
        if (missing.length) {
            const supplement = await CMusicAnalyzer._queryMissingFieldsViaAI(itunes.title, itunes.artist, missing, provider, model);
            if (missing.includes('composer') && supplement.composer) { composer = supplement.composer; aiFilled.push('작곡가'); }
            if (missing.includes('lyrics') && supplement.lyrics) { lyrics = supplement.lyrics; aiFilled.push('가사'); }
        }

        // 실제 파일의 원래 제목(title, ID3/지문 후보)과 iTunes가 찾아준 제목 둘 다에서 버전 표기를 찾는다
        // - 파일 제목에만 "(Remake)"가 붙어있고 iTunes 매칭 결과 제목엔 없는 경우도 잡기 위함.
        const versionNote = CMusicAnalyzer._detectVersionMarker(title, itunes.title);

        return {
            title: itunes.title,
            composer,
            artist: itunes.artist,
            album: itunes.album,
            year: itunes.releaseYear ?? discogs.releaseYear,
            usedIn: [], // 삽입 작품 정보는 구조화 API로 커버되지 않음(fast path에서는 조회하지 않음)
            genre: itunes.genre ?? discogs.genre,
            lyrics,
            notes: 'iTunes/Discogs 2개 소스 일치로 전체 AI 웹검색을 생략함(삽입 작품(usedIn) 정보는 조회되지 않음)'
                + (aiFilled.length ? ` - ${aiFilled.join('/')}만 부족 항목 통합 질의 1회로 보강함` : ''),
            versionNote,
        };
    }

    // AcoustID 고신뢰 지문 매칭 결과를 외적 정보로 변환한다. 곡 식별(제목/아티스트) 자체는 이미 끝났으므로
    // TagExternal의 전체 웹검색은 생략하되, 이전에는 여기서 composer/genre/lyrics/usedIn을 아예 조회하지
    // 않고 null/빈 배열로 버려서 정보 손실이 있었다 - _fastExternalLookup과 동일하게 무료 구조화 소스
    // (MusicBrainz/벅스·lyrics.ovh/iTunes)로 먼저 채우고, 그래도 부족한 항목만 AI 통합 질의 1회로 보강한다.
    private static async _resolveAcoustIdExternal(
        fingerprint: CMusicFingerprintMatch, provider: CAI.eProvider, model: string, fields: TMusicSearchField[],
    ): Promise<CMusicExternalInfo> {
        const fieldSet = new Set(fields);
        const versionNote = CMusicAnalyzer._detectVersionMarker(fingerprint.title);
        const mbTitle = fingerprint.title;
        const mbArtist = fingerprint.artist.length ? fingerprint.artist.join(', ') : null;

        let composer: string | null = null;
        let lyrics: string | null = null;
        let genre: string | null = null;
        let usedIn: string[] = [];
        const aiFilled: string[] = [];

        if (mbTitle && mbArtist) {
            const [mbComposer, ovhLyrics, itunesInfo] = await Promise.all([
                CMusicAnalyzer._queryMusicBrainzComposer(mbTitle, mbArtist).catch(() => null),
                fieldSet.has('lyrics') ? CMusicAnalyzer._queryLyrics(mbTitle, mbArtist) : Promise.resolve(null),
                CMusicAnalyzer._queryItunes(mbTitle, mbArtist).catch(() => null),
            ]);
            composer = mbComposer;
            lyrics = ovhLyrics;
            genre = itunesInfo?.genre ?? null;

            // usedIn(삽입 작품)은 구조화 API로 원천적으로 못 채우는 항목이라, fields에 있으면 무조건 부족
            // 목록에 넣는다(없으면 애초에 안 물어봐서 AI 호출 자체를 줄일 수 있음).
            const missing: Array<'composer' | 'lyrics' | 'genre' | 'usedIn'> = [];
            if (fieldSet.has('usedIn')) missing.push('usedIn');
            if (fieldSet.has('composer') && !composer) missing.push('composer');
            if (fieldSet.has('lyrics') && !lyrics) missing.push('lyrics');
            if (fieldSet.has('genre') && !genre) missing.push('genre');

            const supplement = missing.length
                ? await CMusicAnalyzer._queryMissingFieldsViaAI(mbTitle, mbArtist, missing, provider, model)
                : {};
            if (missing.includes('composer') && supplement.composer) { composer = supplement.composer; aiFilled.push('작곡가'); }
            if (missing.includes('lyrics') && supplement.lyrics) { lyrics = supplement.lyrics; aiFilled.push('가사'); }
            if (missing.includes('genre') && supplement.genre) { genre = supplement.genre; aiFilled.push('장르'); }
            if (supplement.usedIn?.length) { usedIn = supplement.usedIn; aiFilled.push('삽입작품'); }
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

    // 파일명/폴더 경로 등 단편적인 힌트만으로 AI(웹검색 가능한 헤드리스 CLI)를 1회 호출해
    // 작곡가/출처 등 외적 정보를 정해진 스키마의 JSON으로 받아온다.
    static async TagExternal(
        hints: { fileName: string; folderPath?: string; extraHint?: string },
        provider: CAI.eProvider = CAI.eProvider.grok,
        model: string = DEFAULT_TAG_MODEL,
        fields: TMusicSearchField[] = DEFAULT_SEARCH_FIELDS,
    ): Promise<CMusicExternalInfo> {
        const prompt = CMusicAnalyzer._buildTagPrompt({
            fileName: CMusicAnalyzer._stripControlChars(hints.fileName),
            folderPath: hints.folderPath ? CMusicAnalyzer._stripControlChars(hints.folderPath) : hints.folderPath,
            extraHint: hints.extraHint ? CMusicAnalyzer._stripControlChars(hints.extraHint) : hints.extraHint,
        }, fields);
        // 파일 수정 권한은 불필요(조사만 함)하지만, claude CLI는 write=false일 때 --permission-mode
        // plan으로 실행되어 WebSearch/WebFetch까지 막혀버려 조사 자체가 실패한다. 그래서 claude는
        // write=true(bypassPermissions)로 호출한다 - 어차피 이 세션은 파일을 쓰지 않는다.
        // + 이 작업 전용 세션이라 프로젝트와 무관한 tmpdir을 cwd로 준다
        // (CAIInfoRouter의 웜업 호출과 동일한 이유: 대화형 세션과의 오귀속을 방지).
        const write = provider === CAI.eProvider.claude;
        const result = await CAI.Chat(provider, model, os.tmpdir(), prompt, true, undefined, true, write);
        return CMusicAnalyzer._fillUnrequestedDefaults(CMusicAnalyzer._parseTagJson(result.text), fields);
    }

    // 외적 정보 검색의 단일 진입점 - 지문 고신뢰 매칭/무료 교차검증(iTunes+Discogs)/AI 전체 웹검색(TagExternal)
    // 3갈래 분기를 여기 안에 감춘다. output 템플릿에 있는 키(TMusicSearchField 8종 기준)만 실제 검색 대상이고,
    // 없는 키는 항상 null/[]로 고정된다(예: usedIn/lyrics를 빼고 넘기면 그 두 항목은 AI에게 아예 안 물어봄).
    static async AnalyzeWeb(
        input: ISearchExternalInput,
        output: ISearchExternalOutputTemplate = DEFAULT_SEARCH_OUTPUT,
    ): Promise<CMusicExternalInfo> {
        const provider = input.provider ?? CAI.eProvider.grok;
        const model = input.model ?? DEFAULT_TAG_MODEL;
        const fields = (Object.keys(output) as TMusicSearchField[]).filter(k => ALL_SEARCH_FIELDS.includes(k));
        const { fingerprint, candidateTitle, candidateArtist } = input;

        if (fingerprint?.matched && fingerprint.score !== null && fingerprint.score >= HIGH_CONFIDENCE_FINGERPRINT_SCORE) {
            // 지문 매칭 신뢰도가 충분히 높으면 identification(제목/아티스트)용 전체 웹검색은 생략한다(비용/시간 절감).
            return CMusicAnalyzer._resolveAcoustIdExternal(fingerprint, provider, model, fields);
        }

        // 후보 제목+아티스트가 있으면 먼저 iTunes+Discogs 교차검증(빠른 결정론적 경로)을 시도해 AI 웹검색을
        // 건너뛴다. 후보가 없거나 두 소스가 교차검증에 실패하면 AI 전체 웹검색으로 폴백한다.
        let fast: CMusicExternalInfo | null = null;
        if (candidateTitle && candidateArtist) {
            try {
                fast = await CMusicAnalyzer._fastExternalLookup(candidateTitle, candidateArtist, provider, model, fields);
            } catch (e) {
                CConsol.Log('[MusicAnalyzer] 빠른 조회 실패(무시하고 AI 웹검색으로 폴백): ' + (e as Error).message);
            }
        }
        if (fast) return fast;

        const acoustHint = fingerprint?.matched
            ? `AcoustID 오디오 지문 매칭(score=${fingerprint.score}): 제목=${fingerprint.title}, 아티스트=${fingerprint.artist.join('/')}` +
              (fingerprint.album ? `, 릴리즈=${fingerprint.album}` : '')
            : '';
        const extraHint = [input.extraHint, acoustHint].filter(Boolean).join(', ') || undefined;
        return CMusicAnalyzer.TagExternal(
            { fileName: input.fileName, folderPath: input.folderPath, extraHint },
            provider, model, fields,
        );
    }

    // 일부 mp3의 ID3 태그는 null byte로 이어붙은 중복 문자열(레거시+UTF-8 인코딩 병기 등)을 담고 있는데,
    // 이 값이 그대로 AI CLI 프로세스의 인자로 전달되면 Node가 "string without null bytes" 에러로 spawn 자체를 거부한다.
    private static _stripControlChars(s: string): string {
        return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    }

    // fields에서 뺀 항목은 애초에 AI에게 검색을 시키지 않았으므로(스키마에서도 뺐음), 응답 파싱 후 결과
    // 객체에서 null/빈 배열로 확정해준다 - AI가 스키마에 없는 필드를 임의로 채워 넣는 경우를 방지.
    private static _fillUnrequestedDefaults(info: CMusicExternalInfo, fields: TMusicSearchField[]): CMusicExternalInfo {
        const fieldSet = new Set(fields);
        const result = { ...info };
        if (!fieldSet.has('title')) result.title = null;
        if (!fieldSet.has('composer')) result.composer = null;
        if (!fieldSet.has('artist')) result.artist = null;
        if (!fieldSet.has('album')) result.album = null;
        if (!fieldSet.has('year')) result.year = null;
        if (!fieldSet.has('genre')) result.genre = null;
        if (!fieldSet.has('usedIn')) result.usedIn = [];
        if (!fieldSet.has('lyrics')) result.lyrics = null;
        return result;
    }

    private static readonly _SEARCH_FIELD_SCHEMA_LINES: Record<TMusicSearchField, string> = {
        title: '  "title": string | null,',
        composer: '  "composer": string | null,',
        artist: '  "artist": string | null,',
        album: '  "album": string | null,',
        year: '  "year": number | null,',
        genre: '  "genre": string | null,',
        usedIn: '  "usedIn": string[],',
        lyrics: '  "lyrics": string | null,',
    };

    private static _buildTagPrompt(hints: { fileName: string; folderPath?: string; extraHint?: string }, fields: TMusicSearchField[]): string {
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

    // AI 응답이 코드블록(```json ... ```)이나 설명 문장을 덧붙일 수 있어, 첫 { ~ 마지막 } 구간만 추출해 파싱한다.
    private static _parseTagJson(text: string): CMusicExternalInfo {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start < 0 || end < start) throw new Error('AI 응답에서 JSON을 찾지 못함: ' + text.slice(0, 300));
        return JSON.parse(text.slice(start, end + 1));
    }

    // 통합 함수: ID3 태그(AnalyzeFile) + 음악적 분석(AnalyzeAudio) + 지문 매칭(AnalyzeFingerprint) + 외적 정보(AnalyzeWeb) +
    // 파일 경로 정보를 하나의 JSON으로 합친다. ID3/지문 매칭 결과가 있으면 AnalyzeWeb 검색 힌트로 넘겨
    // 정확도를 높인다. 원본 지문(fpcalc, 로컬 계산)은 acoustIdApiKey 유무와 무관하게 항상 계산한다 - 오디오
    // 내용 기반 중복 파일 체크는 이 원본 지문에 의존하고 네트워크/API 키가 필요 없기 때문이다. AcoustID 웹
    // 조회(곡 식별용 title/artist 등)만 acoustIdApiKey가 있을 때 추가로 시도한다.
    // 기본값 폴백 키(4hy3wFAqsb)는 acoustid.org에 등록한 애플리케이션 키다 - 결제/개인정보 접근용 시크릿이
    // 아니라 요청을 보낸 애플리케이션을 식별하는 공개용 키라 소스에 두는 게 AcoustID 자체 관례상 문제없다.
    static async Analyze(
        filePath: string,
        provider: CAI.eProvider = CAI.eProvider.grok,
        model: string = DEFAULT_TAG_MODEL,
        acoustIdApiKey: string | undefined = process.env.ACOUSTID_API_KEY || '4hy3wFAqsb',
        output: ISearchExternalOutputTemplate = DEFAULT_SEARCH_OUTPUT,
    ): Promise<CMusicFullResult> {
        const absolutePath = path.resolve(filePath).replace(/\\/g, '/');
        const fileInfo: CMusicFileInfo = {
            fileName: path.basename(filePath),
            absolutePath,
            folderPath: path.dirname(absolutePath),
        };

        const [id3, musical] = await Promise.all([
            CMusicAnalyzer.AnalyzeFile({ filePath }),
            CMusicAnalyzer.AnalyzeAudio({ filePath }),
        ]);

        let fingerprint: CMusicFingerprintMatch | null = null;
        try {
            fingerprint = await CMusicAnalyzer.AnalyzeFingerprint({ filePath, acoustIdApiKey });
        } catch (e) {
            CConsol.Log('[MusicAnalyzer] 지문 계산 실패(무시하고 계속): ' + (e as Error).message);
        }

        // id3/지문에서 이미 확보한 값은 output 템플릿에서 빼서 AnalyzeWeb이 그 항목을 다시 검색하지 않게
        // 한다(예: title은 거의 항상 ID3에 있어 웹검색이 사실상 중복 조회였음 - 실측 99.9%). usedIn/lyrics는
        // id3/지문 어느 쪽으로도 원천적으로 못 채우는 항목이라 요청했으면 항상 그대로 검색 대상에 남는다.
        // 우선순위는 지문(AcoustID) > ID3다 - 지문 매칭은 오디오 내용 자체로 곡을 식별한 결과라, 사람이
        // 입력했거나 잘못 붙어있을 수 있는 ID3 태그보다 신뢰도가 높다(genre/composer는 지문에서 못 주는 항목이라 ID3만 씀).
        const localTitle = fingerprint?.title || id3.title || null;
        const localArtist = (fingerprint?.artist.length ? fingerprint.artist.join(', ') : null) || id3.artist || null;
        const localAlbum = fingerprint?.album || id3.album || null;
        const localYear = fingerprint?.year || id3.year || null;
        const localGenre = id3.genre || null;
        const localComposer = id3.composer || null;

        const narrowedOutput: ISearchExternalOutputTemplate = { ...output };
        if (localTitle) delete narrowedOutput.title;
        if (localArtist) delete narrowedOutput.artist;
        if (localAlbum) delete narrowedOutput.album;
        if (localYear !== null) delete narrowedOutput.year;
        if (localGenre) delete narrowedOutput.genre;
        if (localComposer) delete narrowedOutput.composer;

        const extraHintParts = [
            id3.title ? `ID3 제목: ${id3.title}` : '',
            id3.artist ? `ID3 아티스트: ${id3.artist}` : '',
            id3.album ? `ID3 앨범: ${id3.album}` : '',
        ].filter(Boolean);

        let external: CMusicExternalInfo;
        if (Object.keys(narrowedOutput).length === 0) {
            // 요청된 항목을 id3/지문만으로 전부 채웠으면 웹검색(AI/네트워크) 자체를 생략한다.
            external = {
                title: localTitle, composer: localComposer, artist: localArtist, album: localAlbum, year: localYear,
                genre: localGenre, usedIn: [], lyrics: null,
                notes: 'ID3/지문에서 요청된 항목을 전부 확보해 웹검색을 생략함', versionNote: null,
            };
        } else {
            external = await CMusicAnalyzer.AnalyzeWeb({
                fileName: fileInfo.fileName,
                folderPath: fileInfo.folderPath,
                extraHint: extraHintParts.join(', ') || undefined,
                candidateTitle: localTitle || undefined,
                candidateArtist: localArtist || undefined,
                fingerprint,
                provider, model,
            }, narrowedOutput);
            // narrowedOutput에서 뺀 필드는 AnalyzeWeb이 항상 null/[]로 고정하므로, 검색 대신 로컬 값으로 복원한다.
            if ('title' in output && !('title' in narrowedOutput) && localTitle) external.title = localTitle;
            if ('artist' in output && !('artist' in narrowedOutput) && localArtist) external.artist = localArtist;
            if ('album' in output && !('album' in narrowedOutput) && localAlbum) external.album = localAlbum;
            if ('year' in output && !('year' in narrowedOutput) && localYear !== null) external.year = localYear;
            if ('genre' in output && !('genre' in narrowedOutput) && localGenre) external.genre = localGenre;
            if ('composer' in output && !('composer' in narrowedOutput) && localComposer) external.composer = localComposer;
        }

        return { fileInfo, id3, musical, fingerprint, external };
    }
}

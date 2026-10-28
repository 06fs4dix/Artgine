import { dirname, join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readdirSync, statSync, mkdirSync, rmSync } from 'fs';
import { spawnSync } from 'child_process';
import { createApiClient, tempPath } from './common.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(dirname(SCRIPT_DIR));
const FFMPEG = join(PROJECT_ROOT, 'artgine', 'external', 'bin', 'ffmpeg.exe');

const POLL_MS = 1000;
const POLL_TIMEOUT_MS = 30 * 60 * 1000;
const INSTALL_WAIT_MS = 3 * 60 * 1000;
const DEFAULT_MAX_FRAMES = 30;

const { call } = createApiClient(PROJECT_ROOT);

function usageAndExit() {
    console.error('Usage: [서버 경유 - 서버가 켜져 있어야 함]');
    console.error('       node ai/tool/download.js <base-url> status                          (yt-dlp/ffmpeg 설치 여부, 오늘 폴더/용량)');
    console.error('       node ai/tool/download.js <base-url> info <url>                      (유튜브 제목/길이 조회, 일반 URL은 파일명만)');
    console.error('       node ai/tool/download.js <base-url> get <url> [mp4|mp3|direct]      (다운로드 후 저장 경로 출력, 기본 mp4)');
    console.error('       [로컬 - ffmpeg 직접 실행, 서버 불필요. 결과는 temp/]');
    console.error('       node ai/tool/download.js probe <영상>                               (길이/해상도)');
    console.error('       node ai/tool/download.js frame <영상> <시각> [--width=W]            (특정 시점 1장. 시각: 83 또는 00:01:23)');
    console.error('       node ai/tool/download.js frames <영상> [--every=N | --count=N] [--max=30] [--width=W]');
    console.error('       node ai/tool/download.js scenes <영상> [--threshold=0.3] [--max=30] [--width=W]   (장면 전환 지점)');
    process.exit(1);
}

const flags = {};
const argv = [];
for (const arg of process.argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(arg);
    if (m) flags[m[1]] = m[2]; else argv.push(arg);
}

function fail(msg) {
    console.log(`fail: ${msg}`);
    process.exit(1);
}

function mb(n) {
    return (n / 1024 / 1024).toFixed(1) + 'MB';
}

// ── 서버 경유 ────────────────────────────────────────────────────────────────
async function newestFileSince(dir, sinceMs) {
    if (!dir || !existsSync(dir)) return '';
    let best = '';
    let bestTime = 0;
    for (const name of readdirSync(dir)) {
        if (name.startsWith('.tmp_')) continue;
        const st = statSync(join(dir, name));
        if (st.isFile() && st.mtimeMs >= sinceMs - 2000 && st.mtimeMs > bestTime) { best = name; bestTime = st.mtimeMs; }
    }
    return best ? join(dir, best) : '';
}

async function serverGet(base, url, format) {
    const status = await call(base, 'Download/Status', {});
    if (!status.ok) fail(status.msg ?? 'Download/Status 실패');
    if (status.dailyRemain <= 0) fail(`일일 한도 도달 (${mb(status.dailyUsed)} / ${mb(status.dailyLimit)})`);

    // 서버가 시작 직후 yt-dlp/ffmpeg를 백그라운드로 내려받는 중일 수 있어 유튜브는 설치될 때까지 기다린다.
    if (/^https?:\/\/(www\.)?(youtube\.com\/|youtu\.be\/)/.test(url) && !(status.ytdlp && status.ffmpeg)) {
        console.error('yt-dlp/ffmpeg 설치 대기 중...');
        const waitUntil = Date.now() + INSTALL_WAIT_MS;
        let cur = status;
        while (!(cur.ytdlp && cur.ffmpeg) && Date.now() < waitUntil) {
            await new Promise((r) => setTimeout(r, 3000));
            cur = await call(base, 'Download/Status', {});
        }
        if (!(cur.ytdlp && cur.ffmpeg))
            fail(`yt-dlp=${!!cur.ytdlp}, ffmpeg=${!!cur.ffmpeg} - 서버 설치 실패(네트워크/GitHub 접근 확인 후 서버 재시작 필요, 서버 콘솔의 [Download] 로그 참고)`);
    }

    const started = Date.now();
    const start = await call(base, 'Download/Start', { url, format });
    if (!start.ok) fail(start.msg ?? 'Download/Start 실패');

    const deadline = started + POLL_TIMEOUT_MS;
    let lastMsg = '';
    while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const job = await call(base, 'Download/Poll', { jobId: start.jobId });
        if (!job.ok) fail(job.msg ?? 'Poll 실패');
        if (job.msg !== lastMsg) { console.error(job.msg); lastMsg = job.msg; }
        if (job.status === 'error') fail(job.msg);
        if (job.status === 'done') {
            // mp3 변환이면 job.file은 변환 전 중간 파일명일 수 있어 폴더에서 방금 만들어진 파일을 찾는다.
            const found = await newestFileSince(status.dir, started);
            console.log(found || join(status.dir, job.file ?? ''));
            return;
        }
    }
    fail('시간 초과');
}

// ── 로컬 ffmpeg ──────────────────────────────────────────────────────────────
function failNoFfmpeg(err) {
    if (err.code === 'ENOENT')
        fail('ffmpeg 없음 - 서버가 시작 시 artgine/external/bin/ffmpeg.exe를 자동 설치한다. 서버를 한 번 실행해 두거나 `<BASE_URL> status`로 설치 여부를 확인할 것');
    fail(`ffmpeg 실행 실패: ${err.message}`);
}

// 조건에 맞는 프레임이 하나도 없으면 ffmpeg가 인코더를 못 열고 실패한다. 오류가 아니라 "0장"이므로 구분한다.
function ffmpeg(args) {
    const exe = existsSync(FFMPEG) ? FFMPEG : 'ffmpeg';
    const r = spawnSync(exe, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
    if (r.error) failNoFfmpeg(r.error);
    const stderr = r.stderr || '';
    if (r.status !== 0 && !/Nothing was written|received no packets/.test(stderr))
        fail(`ffmpeg exit ${r.status}: ${stderr.slice(-400)}`);
}

function probe(file) {
    const exe = existsSync(FFMPEG) ? FFMPEG : 'ffmpeg';
    const r = spawnSync(exe, ['-hide_banner', '-i', file], { encoding: 'utf8' });
    if (r.error) failNoFfmpeg(r.error);
    const text = r.stderr || '';
    const dur = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);
    const res = /Video:.*?,\s*(\d{2,5})x(\d{2,5})/.exec(text);
    return {
        seconds: dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : 0,
        width: res ? Number(res[1]) : 0,
        height: res ? Number(res[2]) : 0,
    };
}

function requireVideo(file) {
    if (!file || !existsSync(file)) fail(`파일 없음: ${file ?? ''}`);
}

function scaleFilter() {
    return flags.width ? [`scale=${Number(flags.width)}:-2`] : [];
}

function framesDir(file, tag) {
    const safe = basename(file, extname(file)).replace(/[^\w.-]/g, '_').slice(0, 40);
    const dir = tempPath(`frames_${safe}_${tag}`);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    return dir;
}

function printFrames(dir) {
    const files = readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort();
    for (const f of files) console.log(join(dir, f));
    console.error(files.length ? `${files.length} frames` : '0 frames (--threshold를 낮추거나 시각/간격을 확인하세요)');
}

// -ss를 -i 앞에 두면 키프레임으로 바로 점프해서 긴 영상도 빠르다.
function extractEvery(file, everySec, max) {
    const dir = framesDir(file, `every${everySec}`);
    const vf = [`fps=1/${everySec}`, ...scaleFilter()].join(',');
    ffmpeg(['-i', file, '-vf', vf, '-frames:v', String(max), '-q:v', '3', join(dir, 'f_%03d.jpg')]);
    printFrames(dir);
}

// ── 명령 분기 ────────────────────────────────────────────────────────────────
const first = argv[0];
const isServerCmd = first && first.startsWith('http');

if (isServerCmd) {
    const base = first.replace(/\/$/, '');
    const [, cmd, url, format] = argv;
    if (cmd === 'status') {
        const r = await call(base, 'Download/Status', {});
        console.log(r.ok ? JSON.stringify(r) : `fail: ${r.msg ?? 'unknown'}`);
    } else if (cmd === 'info') {
        if (!url) usageAndExit();
        const r = await call(base, 'Download/Info', { url });
        console.log(r.ok ? JSON.stringify(r) : `fail: ${r.msg ?? 'unknown'}`);
    } else if (cmd === 'get') {
        if (!url) usageAndExit();
        if (format && !['mp4', 'mp3', 'direct'].includes(format)) usageAndExit();
        await serverGet(base, url, format ?? 'mp4');
    } else {
        usageAndExit();
    }
} else {
    const [cmd, file, arg] = argv;
    if (!cmd) usageAndExit();
    requireVideo(file);
    const max = Math.max(1, Number(flags.max ?? DEFAULT_MAX_FRAMES));

    if (cmd === 'probe') {
        console.log(JSON.stringify(probe(file)));

    } else if (cmd === 'frame') {
        if (!arg) usageAndExit();
        const out = tempPath(`frame_${basename(file, extname(file)).replace(/[^\w.-]/g, '_').slice(0, 40)}_${arg.replace(/[^\w]/g, '-')}.jpg`);
        ffmpeg(['-ss', arg, '-i', file, ...(scaleFilter().length ? ['-vf', scaleFilter()[0]] : []), '-frames:v', '1', '-q:v', '2', out]);
        if (!existsSync(out)) fail('시각이 영상 길이를 넘었습니다');
        console.log(out);

    } else if (cmd === 'frames') {
        let every = Number(flags.every ?? 0);
        const count = Number(flags.count ?? 0);
        if (!every) {
            const { seconds } = probe(file);
            if (!seconds) fail('영상 길이를 알 수 없습니다. --every=N을 지정하세요');
            every = seconds / (count || max);
        }
        extractEvery(file, Number(every.toFixed(3)), count || max);

    } else if (cmd === 'scenes') {
        const th = Number(flags.threshold ?? 0.3);
        const dir = framesDir(file, `scene${th}`);
        const vf = [`select='gt(scene,${th})'`, ...scaleFilter()].join(',');
        ffmpeg(['-i', file, '-vf', vf, '-fps_mode', 'vfr', '-frames:v', String(max), '-q:v', '3', join(dir, 'f_%03d.jpg')]);
        printFrames(dir);

    } else {
        usageAndExit();
    }
}

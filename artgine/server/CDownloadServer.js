var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import * as path from 'path';
import { CUtilSystem } from '../system/CUtilSystem.js';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { URLPatterns } from '../network/CServerMain.js';
import { CServerRouter } from '../network/CServerRouter.js';
import { CFile } from '../system/CFile.js';
import { CConsol } from '../basic/CConsol.js';
import { GetAppJSON, GetRootPaths } from '../../desktop/MainFunc.js';
import { CPath } from '../basic/CPath.js';
import { isAuthedReq, isValidToken } from './CAuthServer.js';
const BIN_DIR = path.resolve(CPath.ArtgineRootPath(), 'artgine', 'external', 'bin');
const YTDLP_PATH = path.join(BIN_DIR, 'yt-dlp.exe');
const FFMPEG_PATH = path.join(BIN_DIR, 'ffmpeg.exe');
const DAILY_LIMIT_BYTES = 1024 * 1024 * 1024;
function resolveAbs(p) {
    return path.resolve(p).replace(/\\/g, '/');
}
function isInsideRoot(rootPath, targetPath) {
    const base = resolveAbs(rootPath).replace(/\/+$/, '');
    const target = resolveAbs(targetPath);
    return target === base || target.startsWith(base + '/');
}
function getDirSizeBytes(dir) {
    if (!fs.existsSync(dir))
        return 0;
    let total = 0;
    for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        try {
            const st = fs.statSync(p);
            if (st.isFile())
                total += st.size;
            else if (st.isDirectory())
                total += getDirSizeBytes(p);
        }
        catch { }
    }
    return total;
}
async function getTodayDir() {
    const config = await GetAppJSON();
    const d = new Date();
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dir = path.join(path.resolve(GetRootPaths(config)[0]), 'Downloads', ymd);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    return dir;
}
async function getTodayUsage() {
    const dir = await getTodayDir();
    const used = getDirSizeBytes(dir);
    return { dir, used, limit: DAILY_LIMIT_BYTES, remain: Math.max(0, DAILY_LIMIT_BYTES - used) };
}
function formatBytes(n) {
    if (n >= 1024 * 1024 * 1024)
        return (n / (1024 * 1024 * 1024)).toFixed(2) + 'GB';
    if (n >= 1024 * 1024)
        return (n / (1024 * 1024)).toFixed(1) + 'MB';
    if (n >= 1024)
        return (n / 1024).toFixed(0) + 'KB';
    return n + 'B';
}
const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
const FFMPEG_ZIP_URL = 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
const gJobs = new Map();
function isYouTubeUrl(url) {
    return /^https?:\/\/(www\.)?(youtube\.com\/|youtu\.be\/)/.test(url);
}
async function ensureYtdlp() {
    if (fs.existsSync(YTDLP_PATH))
        return true;
    CConsol.Log('[Download] yt-dlp.exe 없음 → GitHub 다운로드 시작');
    await CFile.FolderCreate(BIN_DIR);
    const data = await CFile.Load(YTDLP_URL);
    if (!data) {
        CConsol.Log('[Download] yt-dlp.exe 다운로드 실패');
        return false;
    }
    await CFile.Save(data, YTDLP_PATH);
    CConsol.Log('[Download] yt-dlp.exe 다운로드 완료');
    return true;
}
async function ensureFfmpeg() {
    if (fs.existsSync(FFMPEG_PATH))
        return true;
    CConsol.Log('[Download] ffmpeg.exe 없음 → GitHub ZIP 다운로드 시작');
    await CFile.FolderCreate(BIN_DIR);
    const data = await CFile.Load(FFMPEG_ZIP_URL);
    if (!data) {
        CConsol.Log('[Download] ffmpeg ZIP 다운로드 실패');
        return false;
    }
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(Buffer.from(data));
    const entry = zip.getEntries().find((e) => /\/bin\/ffmpeg\.exe$/i.test(e.entryName));
    if (!entry) {
        CConsol.Log('[Download] ZIP 안에서 ffmpeg.exe 못 찾음');
        return false;
    }
    fs.writeFileSync(FFMPEG_PATH, entry.getData());
    CConsol.Log('[Download] ffmpeg.exe 설치 완료');
    return true;
}
function updateYtdlp() {
    return new Promise(async (resolve) => {
        if (!fs.existsSync(YTDLP_PATH)) {
            resolve('yt-dlp 없음');
            return;
        }
        const proc = (await CUtilSystem.Spawn(YTDLP_PATH, ['-U']));
        let out = '';
        proc.stdout.on('data', (d) => out += d.toString());
        proc.stderr.on('data', (d) => out += d.toString());
        proc.on('close', () => resolve(out.split('\n')[0]?.trim() || 'yt-dlp 최신 상태'));
        proc.on('error', () => resolve('yt-dlp 업데이트 실행 실패'));
    });
}
function downloadDirectUrl(url, destPath, onProgress, maxBytes) {
    return new Promise((resolve, reject) => {
        const cleanupPartial = () => {
            try {
                if (fs.existsSync(destPath))
                    fs.unlinkSync(destPath);
            }
            catch { }
        };
        const request = (targetUrl) => {
            const proto = targetUrl.startsWith('https') ? https : http;
            proto.get(targetUrl, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
                    request(res.headers.location);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                const total = parseInt(res.headers['content-length'] || '0', 10);
                if (maxBytes != null && total > 0 && total > maxBytes) {
                    res.resume();
                    reject(new Error(`Daily download limit (1GB) would be exceeded (file ${formatBytes(total)}, remain ${formatBytes(maxBytes)})`));
                    return;
                }
                let received = 0;
                let aborted = false;
                const file = fs.createWriteStream(destPath);
                res.on('data', (chunk) => {
                    if (aborted)
                        return;
                    received += chunk.length;
                    if (maxBytes != null && received > maxBytes) {
                        aborted = true;
                        res.destroy();
                        file.destroy();
                        cleanupPartial();
                        reject(new Error('Daily download limit (1GB) exceeded'));
                        return;
                    }
                    if (total > 0)
                        onProgress(Math.round(received / total * 100));
                });
                res.pipe(file);
                file.on('finish', () => {
                    if (aborted)
                        return;
                    file.close();
                    resolve();
                });
                file.on('error', (e) => {
                    if (aborted)
                        return;
                    cleanupPartial();
                    reject(e);
                });
            }).on('error', reject);
        };
        request(url);
    });
}
let CDownloadServer = class CDownloadServer extends CServerRouter {
    constructor() {
        super();
        (async () => {
            const ytOk = await ensureYtdlp();
            await ensureFfmpeg();
            if (ytOk) {
                const result = await updateYtdlp();
                CConsol.Log('[Download] yt-dlp: ' + result);
            }
        })();
        this.On("/Download/Status", async (_json, _req, _res) => {
            const usage = await getTodayUsage();
            return JSON.stringify({
                ok: true,
                ytdlp: fs.existsSync(YTDLP_PATH),
                ffmpeg: fs.existsSync(FFMPEG_PATH),
                dailyLimit: usage.limit,
                dailyUsed: usage.used,
                dailyRemain: usage.remain,
                dir: usage.dir,
            });
        });
        this.On("/Download/Info", async (_json, _req, _res) => {
            const url = _json.GetStr("url");
            if (!url)
                return JSON.stringify({ ok: false, msg: 'URL이 없습니다' });
            if (!isYouTubeUrl(url)) {
                const fileName = decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'file');
                return JSON.stringify({ ok: true, title: fileName, general: true });
            }
            if (!fs.existsSync(YTDLP_PATH))
                return JSON.stringify({ ok: false, msg: 'yt-dlp 설치 중입니다. 잠시 후 다시 시도하세요.' });
            return new Promise(async (resolve) => {
                const proc = (await CUtilSystem.Spawn(YTDLP_PATH, ['--dump-json', '--no-playlist', '--js-runtimes', 'node', url], 'pipe', '', { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }));
                let out = '';
                let err = '';
                proc.stdout.on('data', (d) => out += d.toString());
                proc.stderr.on('data', (d) => err += d.toString());
                proc.on('close', () => {
                    try {
                        const info = JSON.parse(out);
                        const sec = Math.round(info.duration || 0);
                        const dur = sec ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : '';
                        resolve(JSON.stringify({ ok: true, title: info.title, duration: dur, channel: info.uploader }));
                    }
                    catch {
                        resolve(JSON.stringify({ ok: false, msg: '정보 조회 실패: ' + err.slice(0, 200) }));
                    }
                });
                proc.on('error', () => resolve(JSON.stringify({ ok: false, msg: 'yt-dlp 실행 오류' })));
            });
        });
        this.On("/Download/Start", async (_json, _req, _res) => {
            const url = _json.GetStr("url");
            const format = _json.GetStr("format");
            if (!url)
                return JSON.stringify({ ok: false, msg: 'URL이 없습니다' });
            const usage = await getTodayUsage();
            if (usage.remain <= 0) {
                return JSON.stringify({
                    ok: false,
                    msg: `Daily download limit (1GB) reached (${formatBytes(usage.used)} / ${formatBytes(usage.limit)})`,
                    dailyLimit: usage.limit,
                    dailyUsed: usage.used,
                    dailyRemain: 0,
                });
            }
            const jobId = Math.random().toString(36).slice(2) + Date.now().toString(36);
            gJobs.set(jobId, { status: 'running', progress: 0, msg: '시작 중...' });
            if (!isYouTubeUrl(url)) {
                const fileName = decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'download');
                const todayDir = usage.dir;
                const destPath = path.join(todayDir, fileName);
                if (!isInsideRoot(todayDir, destPath)) {
                    gJobs.set(jobId, { status: 'error', progress: 0, msg: 'Path escapes Downloads' });
                    return JSON.stringify({ ok: true, jobId });
                }
                downloadDirectUrl(url, destPath, (pct) => {
                    gJobs.set(jobId, { status: 'running', progress: pct, msg: `${pct}%`, file: fileName });
                }, usage.remain).then(() => {
                    gJobs.set(jobId, { status: 'done', progress: 100, msg: '완료', file: fileName });
                }).catch((e) => {
                    gJobs.set(jobId, { status: 'error', progress: 0, msg: e.message });
                });
            }
            else {
                if (!fs.existsSync(YTDLP_PATH)) {
                    gJobs.set(jobId, { status: 'error', progress: 0, msg: 'yt-dlp가 아직 설치되지 않았습니다' });
                }
                else {
                    const todayDir = usage.dir;
                    const args = format === 'mp3'
                        ? ['-x', '--audio-format', 'mp3', '--ffmpeg-location', BIN_DIR,
                            '--js-runtimes', 'node',
                            '-o', path.join(todayDir, '%(title)s.%(ext)s'), '--no-playlist', url]
                        : ['-f', 'bestvideo+bestaudio/best', '--merge-output-format', 'mp4',
                            '--ffmpeg-location', BIN_DIR,
                            '--js-runtimes', 'node',
                            '-o', path.join(todayDir, '%(title)s.%(ext)s'), '--no-playlist', url];
                    const proc = (await CUtilSystem.Spawn(YTDLP_PATH, args, 'pipe', '', { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }));
                    let lastFile = '';
                    let killedForQuota = false;
                    const quotaTimer = setInterval(() => {
                        if (getDirSizeBytes(todayDir) > DAILY_LIMIT_BYTES) {
                            killedForQuota = true;
                            try {
                                proc.kill();
                            }
                            catch { }
                        }
                    }, 2000);
                    proc.stdout.on('data', (d) => {
                        const line = d.toString();
                        const pctMatch = line.match(/\[download\]\s+([\d.]+)%/);
                        const fileMatch = line.match(/Destination:\s*(.+)/);
                        if (fileMatch)
                            lastFile = path.basename(fileMatch[1].trim());
                        if (pctMatch) {
                            const pct = Math.round(parseFloat(pctMatch[1]));
                            gJobs.set(jobId, { status: 'running', progress: pct, msg: `${pct}%`, file: lastFile });
                        }
                    });
                    proc.on('close', (code) => {
                        clearInterval(quotaTimer);
                        if (killedForQuota) {
                            gJobs.set(jobId, { status: 'error', progress: 0, msg: 'Daily download limit (1GB) exceeded', file: lastFile });
                            return;
                        }
                        if (code === 0)
                            gJobs.set(jobId, { status: 'done', progress: 100, msg: '완료', file: lastFile });
                        else
                            gJobs.set(jobId, { status: 'error', progress: 0, msg: `다운로드 실패 (exit ${code})` });
                    });
                    proc.on('error', (e) => {
                        clearInterval(quotaTimer);
                        gJobs.set(jobId, { status: 'error', progress: 0, msg: e.message });
                    });
                }
            }
            return JSON.stringify({ ok: true, jobId, dailyLimit: usage.limit, dailyUsed: usage.used, dailyRemain: usage.remain });
        });
        this.On("/Download/Poll", async (_json, _req, _res) => {
            const jobId = _json.GetStr("jobId");
            const job = gJobs.get(jobId);
            if (!job)
                return JSON.stringify({ ok: false, msg: '없는 작업 ID' });
            const result = JSON.stringify({ ok: true, ...job });
            if (job.status !== 'running')
                gJobs.delete(jobId);
            return result;
        });
        this.On("/Download/SaveEdit", async (_json, _req, _res) => {
            const nameRaw = _json.GetStr("name") || 'edit';
            const format = (_json.GetStr("format") || 'wav');
            const overwrite = _json.GetStr("overwrite") === '1';
            const targetPath = _json.GetStr("targetPath");
            const audioB64 = _json.GetStr("audioData");
            const videoB64 = _json.GetStr("videoData");
            if (!audioB64)
                return JSON.stringify({ ok: false, msg: '저장할 오디오 데이터가 없습니다' });
            if (format === 'mp4' && !videoB64)
                return JSON.stringify({ ok: false, msg: '원본 영상 데이터가 없습니다' });
            if ((format === 'mp3' || format === 'mp4') && !fs.existsSync(FFMPEG_PATH))
                return JSON.stringify({ ok: false, msg: 'ffmpeg가 아직 설치되지 않았습니다. 잠시 후 다시 시도하세요.' });
            const audioBuf = Buffer.from(audioB64, 'base64');
            const videoBuf = videoB64 ? Buffer.from(videoB64, 'base64') : null;
            if (audioBuf.length === 0)
                return JSON.stringify({ ok: false, msg: '빈 파일입니다' });
            let destDir;
            let destPath;
            if (targetPath) {
                const token = _json.GetStr('token');
                const authed = token ? isValidToken(token) : isAuthedReq(_req);
                if (!authed) {
                    _res.status(403);
                    return JSON.stringify({ ok: false, msg: 'Authentication required' });
                }
                const resolved = resolveAbs(targetPath);
                const roots = GetRootPaths(await GetAppJSON());
                if (!roots.some(r => isInsideRoot(r, resolved))) {
                    return JSON.stringify({ ok: false, msg: '등록된 File 루트 밖의 경로라 저장할 수 없습니다' });
                }
                destDir = path.dirname(resolved);
                destPath = resolved;
            }
            else {
                const usage = await getTodayUsage();
                const incoming = audioBuf.length + (videoBuf ? videoBuf.length : 0);
                if (incoming > usage.remain) {
                    return JSON.stringify({
                        ok: false,
                        msg: `Daily download limit (1GB) would be exceeded (file ${formatBytes(incoming)}, remain ${formatBytes(usage.remain)})`,
                    });
                }
                const ext = format === 'mp4' ? '.mp4' : format === 'mp3' ? '.mp3' : '.wav';
                const safeBase = path.basename(nameRaw).replace(/[\\/:*?"<>|]/g, '_').replace(/\.[^.]+$/, '') || 'edit';
                destDir = usage.dir;
                destPath = path.join(usage.dir, safeBase + ext);
                if (!isInsideRoot(usage.dir, destPath))
                    return JSON.stringify({ ok: false, msg: '잘못된 파일명' });
                if (!overwrite) {
                    let n = 1;
                    while (fs.existsSync(destPath)) {
                        destPath = path.join(usage.dir, `${safeBase} (${n})${ext}`);
                        n++;
                    }
                }
            }
            const stamp = Date.now();
            const tmpAudio = path.join(destDir, `.tmp_audio_${stamp}.wav`);
            const tmpVideo = path.join(destDir, `.tmp_video_${stamp}.mp4`);
            fs.writeFileSync(tmpAudio, audioBuf);
            if (videoBuf)
                fs.writeFileSync(tmpVideo, videoBuf);
            try {
                if (format === 'wav') {
                    fs.renameSync(tmpAudio, destPath);
                }
                else if (format === 'mp3') {
                    await runFfmpeg(['-y', '-i', tmpAudio, destPath]);
                    fs.unlinkSync(tmpAudio);
                }
                else {
                    await runFfmpeg(['-y', '-i', tmpVideo, '-i', tmpAudio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-shortest', destPath]);
                    fs.unlinkSync(tmpAudio);
                    fs.unlinkSync(tmpVideo);
                }
            }
            catch (e) {
                try {
                    if (fs.existsSync(tmpAudio))
                        fs.unlinkSync(tmpAudio);
                }
                catch { }
                try {
                    if (fs.existsSync(tmpVideo))
                        fs.unlinkSync(tmpVideo);
                }
                catch { }
                return JSON.stringify({ ok: false, msg: 'ffmpeg 처리 실패: ' + e.message });
            }
            return JSON.stringify({ ok: true, file: path.basename(destPath) });
        });
    }
};
CDownloadServer = __decorate([
    URLPatterns(["/Download/Status", "/Download/Info", "/Download/Start", "/Download/Poll", "/Download/SaveEdit"])
], CDownloadServer);
export { CDownloadServer };
function runFfmpeg(args) {
    return new Promise(async (resolve, reject) => {
        const proc = (await CUtilSystem.Spawn(FFMPEG_PATH, args));
        let err = '';
        proc.stderr.on('data', (d) => err += d.toString());
        proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(err.slice(-400) || `ffmpeg exit ${code}`)));
        proc.on('error', (e) => reject(e));
    });
}

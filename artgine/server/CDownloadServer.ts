import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const AdmZip: any = require('adm-zip');
import { URLPatterns } from '../network/CServerMain.js';
import { CServerRouter } from '../network/CServerRouter.js';
import { CJSON } from '../basic/CJSON.js';
import { CFile } from '../system/CFile.js';
import { CConsol } from '../basic/CConsol.js';
import { Request, Response } from 'express';
import { GetAppJSON } from '../../desktop/MainFunc.js';

const BIN_DIR     = path.resolve(process.cwd(), 'artgine', 'external', 'bin');
const YTDLP_PATH  = path.join(BIN_DIR, 'yt-dlp.exe');
const FFMPEG_PATH = path.join(BIN_DIR, 'ffmpeg.exe');

async function getTodayDir(): Promise<string> {
    const config = await GetAppJSON();
    const d = new Date();
    const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const dir = path.join(path.resolve(config.rootPath ?? './'), 'Downloads', ymd);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

const YTDLP_URL      = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
const FFMPEG_ZIP_URL = 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';

type JobStatus = { status: 'running'|'done'|'error'; progress: number; msg: string; file?: string };
const gJobs = new Map<string, JobStatus>();

function isYouTubeUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?(youtube\.com\/|youtu\.be\/)/.test(url);
}

async function ensureYtdlp(): Promise<boolean> {
    if (fs.existsSync(YTDLP_PATH)) return true;
    CConsol.Log('[Download] yt-dlp.exe 없음 → GitHub 다운로드 시작');
    await CFile.FolderCreate(BIN_DIR);
    const data = await CFile.Load(YTDLP_URL);
    if (!data) { CConsol.Log('[Download] yt-dlp.exe 다운로드 실패'); return false; }
    await CFile.Save(data as ArrayBuffer, YTDLP_PATH);
    CConsol.Log('[Download] yt-dlp.exe 다운로드 완료');
    return true;
}

async function ensureFfmpeg(): Promise<boolean> {
    if (fs.existsSync(FFMPEG_PATH)) return true;
    CConsol.Log('[Download] ffmpeg.exe 없음 → GitHub ZIP 다운로드 시작');
    await CFile.FolderCreate(BIN_DIR);
    const data = await CFile.Load(FFMPEG_ZIP_URL);
    if (!data) { CConsol.Log('[Download] ffmpeg ZIP 다운로드 실패'); return false; }

    const zip = new AdmZip(Buffer.from(data as ArrayBuffer));
    const entry = zip.getEntries().find((e: any) => /\/bin\/ffmpeg\.exe$/i.test(e.entryName));
    if (!entry) { CConsol.Log('[Download] ZIP 안에서 ffmpeg.exe 못 찾음'); return false; }

    fs.writeFileSync(FFMPEG_PATH, entry.getData());
    CConsol.Log('[Download] ffmpeg.exe 설치 완료');
    return true;
}

function updateYtdlp(): Promise<string> {
    return new Promise((resolve) => {
        if (!fs.existsSync(YTDLP_PATH)) { resolve('yt-dlp 없음'); return; }
        const proc = spawn(YTDLP_PATH, ['-U']);
        let out = '';
        proc.stdout.on('data', (d: Buffer) => out += d.toString());
        proc.stderr.on('data', (d: Buffer) => out += d.toString());
        proc.on('close', () => resolve(out.split('\n')[0]?.trim() || 'yt-dlp 최신 상태'));
        proc.on('error', () => resolve('yt-dlp 업데이트 실행 실패'));
    });
}

function downloadDirectUrl(url: string, destPath: string, onProgress: (pct: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = (targetUrl: string) => {
            const proto = targetUrl.startsWith('https') ? https : http;
            proto.get(targetUrl, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
                    request(res.headers.location!);
                    return;
                }
                if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
                const total = parseInt(res.headers['content-length'] || '0', 10);
                let received = 0;
                const file = fs.createWriteStream(destPath);
                res.on('data', (chunk: Buffer) => {
                    received += chunk.length;
                    if (total > 0) onProgress(Math.round(received / total * 100));
                });
                res.pipe(file);
                file.on('finish', () => { file.close(); resolve(); });
                file.on('error', reject);
            }).on('error', reject);
        };
        request(url);
    });
}

@URLPatterns(["/Download/Status", "/Download/Info", "/Download/Start", "/Download/Poll"])
export class CDownloadServer extends CServerRouter {
    constructor() {
        super();

        // 서버 시작 시: 바이너리 확인 + yt-dlp 자동 업데이트
        (async () => {
            const ytOk = await ensureYtdlp();
            await ensureFfmpeg();
            if (ytOk) {
                const result = await updateYtdlp();
                CConsol.Log('[Download] yt-dlp: ' + result);
            }
        })();

        this.On("/Download/Status", async (_json: CJSON, _req: Request, _res: Response) => {
            return JSON.stringify({
                ok    : true,
                ytdlp : fs.existsSync(YTDLP_PATH),
                ffmpeg: fs.existsSync(FFMPEG_PATH),
            });
        });

        this.On("/Download/Info", async (_json: CJSON, _req: Request, _res: Response) => {
            const url = _json.GetStr("url");
            if (!url) return JSON.stringify({ ok: false, msg: 'URL이 없습니다' });

            if (!isYouTubeUrl(url)) {
                const fileName = decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'file');
                return JSON.stringify({ ok: true, title: fileName, general: true });
            }
            if (!fs.existsSync(YTDLP_PATH))
                return JSON.stringify({ ok: false, msg: 'yt-dlp 설치 중입니다. 잠시 후 다시 시도하세요.' });

            return new Promise<string>((resolve) => {
                const proc = spawn(YTDLP_PATH, ['--dump-json', '--no-playlist', '--js-runtimes', 'node', url], { env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' } });
                let out = '';
                let err = '';
                proc.stdout.on('data', (d: Buffer) => out += d.toString());
                proc.stderr.on('data', (d: Buffer) => err += d.toString());
                proc.on('close', () => {
                    try {
                        const info = JSON.parse(out);
                        const sec  = Math.round(info.duration || 0);
                        const dur  = sec ? `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}` : '';
                        resolve(JSON.stringify({ ok: true, title: info.title, duration: dur, channel: info.uploader }));
                    } catch {
                        resolve(JSON.stringify({ ok: false, msg: '정보 조회 실패: ' + err.slice(0, 200) }));
                    }
                });
                proc.on('error', () => resolve(JSON.stringify({ ok: false, msg: 'yt-dlp 실행 오류' })));
            });
        });

        this.On("/Download/Start", async (_json: CJSON, _req: Request, _res: Response) => {
            const url    = _json.GetStr("url");
            const format = _json.GetStr("format") as 'mp3'|'mp4'|'direct';
            if (!url) return JSON.stringify({ ok: false, msg: 'URL이 없습니다' });

            const jobId = Math.random().toString(36).slice(2) + Date.now().toString(36);
            gJobs.set(jobId, { status: 'running', progress: 0, msg: '시작 중...' });

            if (!isYouTubeUrl(url)) {
                const fileName = decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'download');
                const destPath = path.join(await getTodayDir(), fileName);
                downloadDirectUrl(url, destPath, (pct) => {
                    gJobs.set(jobId, { status: 'running', progress: pct, msg: `${pct}%`, file: fileName });
                }).then(() => {
                    gJobs.set(jobId, { status: 'done', progress: 100, msg: '완료', file: fileName });
                }).catch((e: any) => {
                    gJobs.set(jobId, { status: 'error', progress: 0, msg: e.message });
                });
            } else {
                if (!fs.existsSync(YTDLP_PATH)) {
                    gJobs.set(jobId, { status: 'error', progress: 0, msg: 'yt-dlp가 아직 설치되지 않았습니다' });
                } else {
                    const args: string[] = format === 'mp3'
                        ? ['-x', '--audio-format', 'mp3', '--ffmpeg-location', BIN_DIR,
                           '--js-runtimes', 'node',
                           '-o', path.join(await getTodayDir(), '%(title)s.%(ext)s'), '--no-playlist', url]
                        : ['-f', 'bestvideo+bestaudio/best', '--merge-output-format', 'mp4',
                           '--ffmpeg-location', BIN_DIR,
                           '--js-runtimes', 'node',
                           '-o', path.join(await getTodayDir(), '%(title)s.%(ext)s'), '--no-playlist', url];

                    const proc = spawn(YTDLP_PATH, args, { env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' } });
                    let lastFile = '';

                    proc.stdout.on('data', (d: Buffer) => {
                        const line = d.toString();
                        const pctMatch  = line.match(/\[download\]\s+([\d.]+)%/);
                        const fileMatch = line.match(/Destination:\s*(.+)/);
                        if (fileMatch) lastFile = path.basename(fileMatch[1].trim());
                        if (pctMatch) {
                            const pct = Math.round(parseFloat(pctMatch[1]));
                            gJobs.set(jobId, { status: 'running', progress: pct, msg: `${pct}%`, file: lastFile });
                        }
                    });
                    proc.on('close', (code) => {
                        if (code === 0)
                            gJobs.set(jobId, { status: 'done', progress: 100, msg: '완료', file: lastFile });
                        else
                            gJobs.set(jobId, { status: 'error', progress: 0, msg: `다운로드 실패 (exit ${code})` });
                    });
                    proc.on('error', (e) => {
                        gJobs.set(jobId, { status: 'error', progress: 0, msg: e.message });
                    });
                }
            }

            return JSON.stringify({ ok: true, jobId });
        });

        this.On("/Download/Poll", async (_json: CJSON, _req: Request, _res: Response) => {
            const jobId = _json.GetStr("jobId");
            const job   = gJobs.get(jobId);
            if (!job) return JSON.stringify({ ok: false, msg: '없는 작업 ID' });
            const result = JSON.stringify({ ok: true, ...job });
            if (job.status !== 'running') gJobs.delete(jobId);
            return result;
        });
    }
}

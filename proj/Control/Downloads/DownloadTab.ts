import { CDOM } from '../../../artgine/basic/CDOM.js';
import { CFecth } from '../../../artgine/network/CFecth.js';
import { CAlert } from '../../../artgine/basic/CAlert.js';
import { CLan } from '../../../artgine/basic/CLan.js';

// 번역 키는 Control.ts registerControlLan() 한곳에 등록. 여기서는 CLan.Get만 사용.
function L(key: string, en: string): string {
    return CLan.Get(key, en);
}
function LF(key: string, en: string, ...args: Array<string | number>): string {
    let s = CLan.Get(key, en);
    for (let i = 0; i < args.length; i++) s = s.split(`{${i}}`).join(String(args[i]));
    return s;
}

// ── UI 마운트 ──────────────────────────────────────────────────────────────
export function MountDownloadTab(rootId: string) {
    const root = CDOM.ID(rootId);
    if (!root) return;

    root.innerHTML = `
<div class="container-fluid p-3" style="max-width:760px;">

  <!-- 바이너리 상태 표시줄 -->
  <div class="d-flex align-items-center gap-2 mb-3">
    <span id="dl-ytdlp-badge" class="badge bg-secondary">${L('ctrl.dl.ytdlpChecking', 'yt-dlp checking...')}</span>
    <span id="dl-ffmpeg-badge" class="badge bg-secondary">${L('ctrl.dl.ffmpegChecking', 'ffmpeg checking...')}</span>
  </div>

  <!-- URL 입력 -->
  <div class="input-group mb-2">
    <input id="dl-url" type="text" class="form-control font-monospace"
      placeholder="${L('ctrl.dl.phUrl', 'https://www.youtube.com/watch?v=... or direct file URL')}">
    <button class="btn btn-outline-primary" id="dl-info-btn">${L('ctrl.dl.fetchInfo', 'Fetch Info')}</button>
  </div>

  <!-- 영상 정보 -->
  <div id="dl-info-box" class="alert alert-info py-2 mb-2" style="display:none;font-size:13px;">
    <strong id="dl-title"></strong>
    <span id="dl-meta" class="text-muted ms-2"></span>
  </div>

  <!-- 포맷 선택 -->
  <div class="d-flex align-items-center gap-3 mb-3">
    <div class="form-check">
      <input class="form-check-input" type="radio" name="dl-format" id="dl-fmt-mp3" value="mp3" checked>
      <label class="form-check-label" for="dl-fmt-mp3">${L('ctrl.dl.mp3', 'MP3 (audio only)')}</label>
    </div>
    <div class="form-check">
      <input class="form-check-input" type="radio" name="dl-format" id="dl-fmt-mp4" value="mp4">
      <label class="form-check-label" for="dl-fmt-mp4">${L('ctrl.dl.mp4', 'MP4 (video)')}</label>
    </div>
    <div class="form-check">
      <input class="form-check-input" type="radio" name="dl-format" id="dl-fmt-direct" value="direct">
      <label class="form-check-label" for="dl-fmt-direct">${L('ctrl.dl.direct', 'Direct download (file URL)')}</label>
    </div>
  </div>

  <button class="btn btn-success" id="dl-start-btn">${L('ctrl.dl.start', 'Start Download')}</button>

  <!-- 진행 목록 -->
  <div id="dl-job-list" class="mt-3"></div>
</div>`;

    // 상태 뱃지 갱신
    checkBinaryStatus();

    // URL 입력 시 포맷 자동 추천
    CDOM.ID('dl-url').addEventListener('input', () => {
        const url = (CDOM.ID('dl-url') as HTMLInputElement).value.trim();
        const isYT = isYouTubeUrl(url);
        (CDOM.ID('dl-fmt-mp3') as HTMLInputElement).disabled = !isYT;
        (CDOM.ID('dl-fmt-mp4') as HTMLInputElement).disabled = !isYT;
        (CDOM.ID('dl-fmt-direct') as HTMLInputElement).disabled = isYT;
        if (!isYT) (CDOM.ID('dl-fmt-direct') as HTMLInputElement).checked = true;
        else if ((CDOM.ID('dl-fmt-direct') as HTMLInputElement).checked)
            (CDOM.ID('dl-fmt-mp3') as HTMLInputElement).checked = true;
        CDOM.ID('dl-info-box').style.display = 'none';
    });

    // 조회 버튼
    CDOM.ID('dl-info-btn').addEventListener('click', () => fetchInfo());

    // 엔터키 조회
    CDOM.ID('dl-url').addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') fetchInfo();
    });

    // 다운로드 시작 버튼
    CDOM.ID('dl-start-btn').addEventListener('click', () => startDownload());
}

// ── 유틸 ────────────────────────────────────────────────────────────────────
function isYouTubeUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?(youtube\.com\/|youtu\.be\/)/.test(url);
}

function getFormat(): string {
    const radios = document.querySelectorAll<HTMLInputElement>('input[name="dl-format"]');
    for (const r of radios) if (r.checked) return r.value;
    return 'mp3';
}

// ── 바이너리 상태 확인 ──────────────────────────────────────────────────────
// 다운로드 서버 라우트 자체가 없는 프로젝트도 있다(Download/Status 무응답). 그런 경우 계속
// "checking..."에 멈춰 있지 않도록, 연속 실패 MAX_STATUS_FAILS회 후에는 재시도를 멈추고
// 서버 상태를 확인하라는 에러 뱃지로 고정한다.
const MAX_STATUS_FAILS = 5;
function checkBinaryStatus(failCount = 0) {
    (CFecth.Exe('Download/Status', {}, 'json') as Promise<any>)
        .then((data: { ytdlp: boolean; ffmpeg: boolean }) => {
            const ytBadge  = CDOM.ID('dl-ytdlp-badge');
            const ffBadge  = CDOM.ID('dl-ffmpeg-badge');
            ytBadge.textContent  = data.ytdlp  ? 'yt-dlp ✅' : L('ctrl.dl.ytdlpInstalling', 'yt-dlp installing...');
            ytBadge.className    = 'badge ' + (data.ytdlp  ? 'bg-success' : 'bg-warning text-dark');
            ffBadge.textContent  = data.ffmpeg ? 'ffmpeg ✅' : L('ctrl.dl.ffmpegInstalling', 'ffmpeg installing...');
            ffBadge.className    = 'badge ' + (data.ffmpeg ? 'bg-success' : 'bg-warning text-dark');

            // 아직 설치 중이면 3초 후 재확인
            if (!data.ytdlp || !data.ffmpeg)
                setTimeout(() => checkBinaryStatus(0), 3000);
        })
        .catch(() => {
            const nextFailCount = failCount + 1;
            if (nextFailCount >= MAX_STATUS_FAILS) {
                const msg = L('ctrl.dl.serverUnavailable', 'Server not responding - this may be a build without the server, please check server status');
                const ytBadge = CDOM.ID('dl-ytdlp-badge');
                const ffBadge = CDOM.ID('dl-ffmpeg-badge');
                ytBadge.textContent = msg;
                ytBadge.className   = 'badge bg-danger';
                ffBadge.textContent = msg;
                ffBadge.className   = 'badge bg-danger';
                return;
            }
            setTimeout(() => checkBinaryStatus(nextFailCount), 5000);
        });
}

// ── URL 정보 조회 ────────────────────────────────────────────────────────────
async function fetchInfo() {
    const url = (CDOM.ID('dl-url') as HTMLInputElement).value.trim();
    if (!url) return;

    const btn = CDOM.ID('dl-info-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = L('ctrl.dl.fetching', 'Fetching...');

    try {
        const res = await CFecth.Exe('Download/Info', { url }, 'json') as any;
        if (res.ok) {
            CDOM.ID('dl-title').textContent = res.title || url;
            CDOM.ID('dl-meta').textContent  = [res.duration, res.channel].filter(Boolean).join(' · ');
            CDOM.ID('dl-info-box').style.display = '';
        } else {
            CAlert.E(res.msg || L('ctrl.dl.failedInfo', 'Failed to fetch info'));
        }
    } catch (e: any) {
        CAlert.E(LF('ctrl.dl.serverError', 'Server error: {0}', e.message));
    } finally {
        btn.disabled = false;
        btn.textContent = L('ctrl.dl.fetchInfo', 'Fetch Info');
    }
}

// ── 다운로드 시작 ─────────────────────────────────────────────────────────────
async function startDownload() {
    const url    = (CDOM.ID('dl-url') as HTMLInputElement).value.trim();
    const format = getFormat();
    if (!url) { CAlert.E(L('ctrl.dl.enterUrl', 'Please enter a URL')); return; }

    const btn = CDOM.ID('dl-start-btn') as HTMLButtonElement;
    btn.disabled = true;

    try {
        const res = await CFecth.Exe('Download/Start', { url, format }, 'json') as any;
        if (!res.ok) { CAlert.E(res.msg || L('ctrl.dl.failedStart', 'Failed to start')); return; }
        addJobRow(res.jobId, url);
        (CDOM.ID('dl-url') as HTMLInputElement).value = '';
        CDOM.ID('dl-info-box').style.display = 'none';
    } catch (e: any) {
        CAlert.E(LF('ctrl.dl.serverError', 'Server error: {0}', e.message));
    } finally {
        btn.disabled = false;
    }
}

// ── 작업 행 추가 + 폴링 ────────────────────────────────────────────────────
function addJobRow(jobId: string, url: string) {
    const list  = CDOM.ID('dl-job-list');
    const rowId = 'job-' + jobId;
    const label = url.length > 60 ? url.slice(0, 60) + '…' : url;

    const row   = document.createElement('div');
    row.id      = rowId;
    row.className = 'border rounded p-2 mb-2';
    row.innerHTML = `
<div class="d-flex justify-content-between align-items-center mb-1">
  <small class="text-muted font-monospace" style="word-break:break-all;">${label}</small>
  <span class="badge bg-primary job-status">${L('ctrl.dl.starting', 'Starting')}</span>
</div>
<div class="progress" style="height:6px;">
  <div class="progress-bar job-bar" role="progressbar" style="width:0%"></div>
</div>
<small class="job-file text-success" style="font-size:11px;"></small>`;
    list.prepend(row);

    pollJob(jobId, rowId);
}

function pollJob(jobId: string, rowId: string) {
    (CFecth.Exe('Download/Poll', { jobId }, 'json') as Promise<any>)
        .then((data: any) => {
            const row = document.getElementById(rowId);
            if (!row) return;

            const badge = row.querySelector('.job-status') as HTMLElement;
            const bar   = row.querySelector('.job-bar')   as HTMLElement;
            const file  = row.querySelector('.job-file')  as HTMLElement;

            bar.style.width = data.progress + '%';
            if (data.file) file.textContent = '📁 ' + data.file;

            if (data.status === 'done') {
                badge.textContent = L('ctrl.dl.done', 'Done');
                badge.className   = 'badge bg-success job-status';
                bar.className     = 'progress-bar bg-success job-bar';
            } else if (data.status === 'error') {
                badge.textContent = L('ctrl.dl.error', 'Error');
                badge.className   = 'badge bg-danger job-status';
                bar.className     = 'progress-bar bg-danger job-bar';
                file.textContent  = '⚠ ' + data.msg;
            } else {
                badge.textContent = data.progress + '%';
                setTimeout(() => pollJob(jobId, rowId), 800);
            }
        })
        .catch(() => setTimeout(() => pollJob(jobId, rowId), 2000));
}

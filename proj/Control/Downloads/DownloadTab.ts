import { CDOM } from '../../../artgine/basic/CDOM.js';
import { CFecth } from '../../../artgine/network/CFecth.js';
import { CAlert } from '../../../artgine/basic/CAlert.js';

// ── UI 마운트 ──────────────────────────────────────────────────────────────
export function MountDownloadTab(rootId: string) {
    const root = CDOM.ID(rootId);
    if (!root) return;

    root.innerHTML = `
<div class="container-fluid p-3" style="max-width:760px;">

  <!-- 바이너리 상태 표시줄 -->
  <div class="d-flex align-items-center gap-2 mb-3">
    <span id="dl-ytdlp-badge" class="badge bg-secondary">yt-dlp checking...</span>
    <span id="dl-ffmpeg-badge" class="badge bg-secondary">ffmpeg checking...</span>
  </div>

  <!-- URL 입력 -->
  <div class="input-group mb-2">
    <input id="dl-url" type="text" class="form-control font-monospace"
      placeholder="https://www.youtube.com/watch?v=... or direct file URL">
    <button class="btn btn-outline-primary" id="dl-info-btn">Fetch Info</button>
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
      <label class="form-check-label" for="dl-fmt-mp3">MP3 (audio only)</label>
    </div>
    <div class="form-check">
      <input class="form-check-input" type="radio" name="dl-format" id="dl-fmt-mp4" value="mp4">
      <label class="form-check-label" for="dl-fmt-mp4">MP4 (video)</label>
    </div>
    <div class="form-check">
      <input class="form-check-input" type="radio" name="dl-format" id="dl-fmt-direct" value="direct">
      <label class="form-check-label" for="dl-fmt-direct">Direct download (file URL)</label>
    </div>
  </div>

  <button class="btn btn-success" id="dl-start-btn">Start Download</button>

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
function checkBinaryStatus() {
    (CFecth.Exe('Download/Status', {}, 'json') as Promise<any>)
        .then((data: { ytdlp: boolean; ffmpeg: boolean }) => {
            const ytBadge  = CDOM.ID('dl-ytdlp-badge');
            const ffBadge  = CDOM.ID('dl-ffmpeg-badge');
            ytBadge.textContent  = data.ytdlp  ? 'yt-dlp ✅' : 'yt-dlp installing...';
            ytBadge.className    = 'badge ' + (data.ytdlp  ? 'bg-success' : 'bg-warning text-dark');
            ffBadge.textContent  = data.ffmpeg ? 'ffmpeg ✅' : 'ffmpeg installing...';
            ffBadge.className    = 'badge ' + (data.ffmpeg ? 'bg-success' : 'bg-warning text-dark');

            // 아직 설치 중이면 3초 후 재확인
            if (!data.ytdlp || !data.ffmpeg)
                setTimeout(checkBinaryStatus, 3000);
        })
        .catch(() => setTimeout(checkBinaryStatus, 5000));
}

// ── URL 정보 조회 ────────────────────────────────────────────────────────────
async function fetchInfo() {
    const url = (CDOM.ID('dl-url') as HTMLInputElement).value.trim();
    if (!url) return;

    const btn = CDOM.ID('dl-info-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Fetching...';

    try {
        const res = await CFecth.Exe('Download/Info', { url }, 'json') as any;
        if (res.ok) {
            CDOM.ID('dl-title').textContent = res.title || url;
            CDOM.ID('dl-meta').textContent  = [res.duration, res.channel].filter(Boolean).join(' · ');
            CDOM.ID('dl-info-box').style.display = '';
        } else {
            CAlert.E(res.msg || 'Failed to fetch info');
        }
    } catch (e: any) {
        CAlert.E('Server error: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Fetch Info';
    }
}

// ── 다운로드 시작 ─────────────────────────────────────────────────────────────
async function startDownload() {
    const url    = (CDOM.ID('dl-url') as HTMLInputElement).value.trim();
    const format = getFormat();
    if (!url) { CAlert.E('Please enter a URL'); return; }

    const btn = CDOM.ID('dl-start-btn') as HTMLButtonElement;
    btn.disabled = true;

    try {
        const res = await CFecth.Exe('Download/Start', { url, format }, 'json') as any;
        if (!res.ok) { CAlert.E(res.msg || 'Failed to start'); return; }
        addJobRow(res.jobId, url);
        (CDOM.ID('dl-url') as HTMLInputElement).value = '';
        CDOM.ID('dl-info-box').style.display = 'none';
    } catch (e: any) {
        CAlert.E('Server error: ' + e.message);
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
  <span class="badge bg-primary job-status">Starting</span>
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
                badge.textContent = 'Done';
                badge.className   = 'badge bg-success job-status';
                bar.className     = 'progress-bar bg-success job-bar';
            } else if (data.status === 'error') {
                badge.textContent = 'Error';
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

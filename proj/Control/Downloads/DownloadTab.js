import { CDOM } from '../../../artgine/basic/CDOM.js';
import { CFecth } from '../../../artgine/network/CFecth.js';
import { CAlert } from '../../../artgine/basic/CAlert.js';
import { CLan } from '../../../artgine/basic/CLan.js';
function L(key, en) {
    return CLan.Get(key, en);
}
function LF(key, en, ...args) {
    let s = CLan.Get(key, en);
    for (let i = 0; i < args.length; i++)
        s = s.split(`{${i}}`).join(String(args[i]));
    return s;
}
function applyLanInEl(root) {
    if (!root)
        return;
    root.querySelectorAll('[data-CLan]').forEach(el => {
        const key = el.getAttribute('data-CLan');
        if (!key)
            return;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            const t = CLan.Get(key, el.placeholder);
            if (t != null)
                el.placeholder = t;
        }
        else {
            const t = CLan.Get(key, el.innerHTML);
            if (t != null)
                el.innerHTML = t;
        }
    });
}
function registerDownloadTab() {
    const menu = document.querySelector('ul[aria-labelledby="more-tab"]');
    const tabContent = CDOM.ID('myTabContent');
    if (!menu || !tabContent || CDOM.ID('download-tab'))
        return;
    const li = document.createElement('li');
    li.innerHTML = `<button class="dropdown-item" id="download-tab" data-bs-toggle="tab" data-bs-target="#download-panel" type="button"
        role="tab" aria-controls="download-panel" aria-selected="false"><i class="bi bi-cloud-download-fill"></i> <span data-CLan="ctrl.download">Download</span></button>`;
    menu.appendChild(li);
    const panel = document.createElement('div');
    panel.className = 'tab-pane h-100';
    panel.id = 'download-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'download-tab');
    panel.style.overflowY = 'auto';
    panel.innerHTML = `<div id="download-root"></div>`;
    tabContent.appendChild(panel);
    applyLanInEl(li);
    let inited = false;
    const doMount = () => {
        if (inited)
            return;
        inited = true;
        MountDownloadTab('download-root');
        applyLanInEl(document.getElementById('download-root'));
    };
    document.getElementById('download-tab').addEventListener('shown.bs.tab', doMount);
}
registerDownloadTab();
export function MountDownloadTab(rootId) {
    const root = CDOM.ID(rootId);
    if (!root)
        return;
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
    checkBinaryStatus();
    CDOM.ID('dl-url').addEventListener('input', () => {
        const url = CDOM.ID('dl-url').value.trim();
        const isYT = isYouTubeUrl(url);
        CDOM.ID('dl-fmt-mp3').disabled = !isYT;
        CDOM.ID('dl-fmt-mp4').disabled = !isYT;
        CDOM.ID('dl-fmt-direct').disabled = isYT;
        if (!isYT)
            CDOM.ID('dl-fmt-direct').checked = true;
        else if (CDOM.ID('dl-fmt-direct').checked)
            CDOM.ID('dl-fmt-mp3').checked = true;
        CDOM.ID('dl-info-box').style.display = 'none';
    });
    CDOM.ID('dl-info-btn').addEventListener('click', () => fetchInfo());
    CDOM.ID('dl-url').addEventListener('keydown', (e) => {
        if (e.key === 'Enter')
            fetchInfo();
    });
    CDOM.ID('dl-start-btn').addEventListener('click', () => startDownload());
}
function isYouTubeUrl(url) {
    return /^https?:\/\/(www\.)?(youtube\.com\/|youtu\.be\/)/.test(url);
}
function getFormat() {
    const radios = document.querySelectorAll('input[name="dl-format"]');
    for (const r of radios)
        if (r.checked)
            return r.value;
    return 'mp3';
}
const MAX_STATUS_FAILS = 5;
function checkBinaryStatus(failCount = 0) {
    CFecth.Exe('Download/Status', {}, 'json')
        .then((data) => {
        const ytBadge = CDOM.ID('dl-ytdlp-badge');
        const ffBadge = CDOM.ID('dl-ffmpeg-badge');
        ytBadge.textContent = data.ytdlp ? 'yt-dlp ✅' : L('ctrl.dl.ytdlpInstalling', 'yt-dlp installing...');
        ytBadge.className = 'badge ' + (data.ytdlp ? 'bg-success' : 'bg-warning text-dark');
        ffBadge.textContent = data.ffmpeg ? 'ffmpeg ✅' : L('ctrl.dl.ffmpegInstalling', 'ffmpeg installing...');
        ffBadge.className = 'badge ' + (data.ffmpeg ? 'bg-success' : 'bg-warning text-dark');
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
            ytBadge.className = 'badge bg-danger';
            ffBadge.textContent = msg;
            ffBadge.className = 'badge bg-danger';
            return;
        }
        setTimeout(() => checkBinaryStatus(nextFailCount), 5000);
    });
}
async function fetchInfo() {
    const url = CDOM.ID('dl-url').value.trim();
    if (!url)
        return;
    const btn = CDOM.ID('dl-info-btn');
    btn.disabled = true;
    btn.textContent = L('ctrl.dl.fetching', 'Fetching...');
    try {
        const res = await CFecth.Exe('Download/Info', { url }, 'json');
        if (res.ok) {
            CDOM.ID('dl-title').textContent = res.title || url;
            CDOM.ID('dl-meta').textContent = [res.duration, res.channel].filter(Boolean).join(' · ');
            CDOM.ID('dl-info-box').style.display = '';
        }
        else {
            CAlert.E(res.msg || L('ctrl.dl.failedInfo', 'Failed to fetch info'));
        }
    }
    catch (e) {
        CAlert.E(LF('ctrl.dl.serverError', 'Server error: {0}', e.message));
    }
    finally {
        btn.disabled = false;
        btn.textContent = L('ctrl.dl.fetchInfo', 'Fetch Info');
    }
}
async function startDownload() {
    const url = CDOM.ID('dl-url').value.trim();
    const format = getFormat();
    if (!url) {
        CAlert.E(L('ctrl.dl.enterUrl', 'Please enter a URL'));
        return;
    }
    const btn = CDOM.ID('dl-start-btn');
    btn.disabled = true;
    try {
        const res = await CFecth.Exe('Download/Start', { url, format }, 'json');
        if (!res.ok) {
            CAlert.E(res.msg || L('ctrl.dl.failedStart', 'Failed to start'));
            return;
        }
        addJobRow(res.jobId, url);
        CDOM.ID('dl-url').value = '';
        CDOM.ID('dl-info-box').style.display = 'none';
    }
    catch (e) {
        CAlert.E(LF('ctrl.dl.serverError', 'Server error: {0}', e.message));
    }
    finally {
        btn.disabled = false;
    }
}
function addJobRow(jobId, url) {
    const list = CDOM.ID('dl-job-list');
    const rowId = 'job-' + jobId;
    const label = url.length > 60 ? url.slice(0, 60) + '…' : url;
    const row = document.createElement('div');
    row.id = rowId;
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
function pollJob(jobId, rowId) {
    CFecth.Exe('Download/Poll', { jobId }, 'json')
        .then((data) => {
        const row = document.getElementById(rowId);
        if (!row)
            return;
        const badge = row.querySelector('.job-status');
        const bar = row.querySelector('.job-bar');
        const file = row.querySelector('.job-file');
        bar.style.width = data.progress + '%';
        if (data.file)
            file.textContent = '📁 ' + data.file;
        if (data.status === 'done') {
            badge.textContent = L('ctrl.dl.done', 'Done');
            badge.className = 'badge bg-success job-status';
            bar.className = 'progress-bar bg-success job-bar';
        }
        else if (data.status === 'error') {
            badge.textContent = L('ctrl.dl.error', 'Error');
            badge.className = 'badge bg-danger job-status';
            bar.className = 'progress-bar bg-danger job-bar';
            file.textContent = '⚠ ' + data.msg;
        }
        else {
            badge.textContent = data.progress + '%';
            setTimeout(() => pollJob(jobId, rowId), 800);
        }
    })
        .catch(() => setTimeout(() => pollJob(jobId, rowId), 2000));
}

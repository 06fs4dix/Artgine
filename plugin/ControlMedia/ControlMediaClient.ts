import { CDOM } from '../../artgine/basic/CDOM.js';
import { CAlert } from '../../artgine/basic/CAlert.js';
import { CLan } from '../../artgine/basic/CLan.js';
import { CFecth } from '../../artgine/network/CFecth.js';
import { CModal } from '../../artgine/basic/CModal.js';
import { CStorage } from '../../artgine/system/CStorage.js';
import { CClass } from '../../artgine/basic/CClass.js';

function L(key: string, en: string): string {
    return CLan.Get(key, en);
}
function LF(key: string, en: string, ...args: Array<string | number>): string {
    let s = CLan.Get(key, en);
    for (let i = 0; i < args.length; i++) s = s.split(`{${i}}`).join(String(args[i]));
    return s;
}
// 기본 문구는 영문(L 2nd arg). 한국어는 여기 등록. 미등록 키는 영문 폴백.
function registerMediaLan(): void {
    CLan.Set({
        ko: {
            "ctrl.media.noUndo": "되돌릴 편집이 없습니다",
            "ctrl.media.undone": "되돌림",
            "ctrl.media.dropHint": "또는 File 탭에서 드래그&드롭",
            "ctrl.media.editTab": "편집",
            "ctrl.media.trim": "선택구간만 남기고 자르기",
            "ctrl.media.cutOp": "자르기",
            "ctrl.media.copyOp": "복사",
            "ctrl.media.pasteOp": "붙여넣기",
            "ctrl.media.soundTab": "소리",
            "ctrl.media.volume": "볼륨",
            "ctrl.media.normalize": "노말라이즈",
            "ctrl.media.fadein": "페이드 인",
            "ctrl.media.fadeout": "페이드 아웃",
            "ctrl.download": "다운로드",
            "ctrl.media.save": "저장",
            "ctrl.media.play": "선택구간 재생",
            "ctrl.media.stop": "정지",
            "ctrl.media.noFile": "파일을 선택하세요",
            "ctrl.media.selHint": "파형을 드래그해서 구간을 선택하세요",
            "ctrl.media.zoomOut": "줌 아웃",
            "ctrl.media.zoomIn": "줌 인",
            "ctrl.dl.ytdlpChecking": "yt-dlp 확인 중...",
            "ctrl.dl.ffmpegChecking": "ffmpeg 확인 중...",
            "ctrl.dl.phUrl": "https://www.youtube.com/watch?v=... 또는 직접 파일 URL",
            "ctrl.dl.fetchInfo": "정보 조회",
            "ctrl.dl.mp3": "MP3 (오디오만)",
            "ctrl.dl.mp4": "MP4 (영상)",
            "ctrl.dl.direct": "직접 다운로드 (파일 URL)",
            "ctrl.dl.start": "다운로드 시작",
            "ctrl.dl.aiOrganize": "AI 정리",
            "ctrl.dl.aiPh": "예: 방금 받은 파일 이름을 정리하고, 확장자/종류별로 폴더 나눠줘",
            "ctrl.dl.aiRun": "AI로 정리",
            "ctrl.dl.aiNeedPrompt": "정리 내용을 입력하세요",
            "ctrl.dl.aiNoDir": "다운로드 폴더 경로를 아직 모릅니다. 잠시 후 다시 시도하세요.",
            "ctrl.dl.aiNoProvider": "AI provider/model이 없습니다. Chat에서 한 번 선택해 주세요.",
            "ctrl.dl.aiRunning": "AI 실행 중…",
            "ctrl.dl.aiFailed": "AI 정리 실패",
            "ctrl.dl.aiDoneEmpty": "(응답 없음)",
            "ctrl.dl.aiDone": "완료",
            "ctrl.media.decodeFail": "오디오 디코딩 실패: ",
            "ctrl.media.dropPathErr": "등록된 File 루트 밖의 경로라 불러올 수 없습니다",
            "ctrl.media.dropFetchErr": "파일을 가져오지 못했습니다",
            "ctrl.media.cursor": "커서",
            "ctrl.media.pasteHere": "붙여넣기 위치",
            "ctrl.media.selection": "선택 구간",
            "ctrl.media.noFileErr": "먼저 파일을 불러오세요",
            "ctrl.media.noSelErr": "구간을 먼저 선택하세요",
            "ctrl.media.trimWholeWarn": "전체 구간이 선택되어 있어 잘라낼 부분이 없습니다",
            "ctrl.media.trimVideoWarn": "소리만 잘렸습니다. 영상 화면(원본)은 아직 서버 처리 전이라 그대로예요.",
            "ctrl.media.copied": "복사됨",
            "ctrl.media.cutDone": "잘라냄",
            "ctrl.media.noClipboardErr": "먼저 자르기나 복사를 해주세요",
            "ctrl.media.pasted": "붙여넣음",
            "ctrl.media.volumePrompt": "볼륨 배율 입력 (예: 1.5 = 150%)",
            "ctrl.media.applied": "적용됨",
            "ctrl.media.silentSel": "선택 구간이 무음입니다",
            "ctrl.media.noOrigVideoErr": "원본 영상 파일을 찾을 수 없습니다",
            "ctrl.media.videoTooBigErr": "영상 파일이 너무 커서(60MB 초과) 지금 방식으로는 MP4로 저장할 수 없습니다. MP3로 저장해보세요.",
            "ctrl.media.saveFailed": "저장 실패",
            "ctrl.media.fmtVideo": "영상 + 편집된 소리",
            "ctrl.media.fmtAudioOnly": "소리만",
            "ctrl.media.fmtLossless": "무손실",
            "ctrl.media.fmtLosslessAudio": "무손실, 소리만",
            "ctrl.media.saveNameLabel": "파일명",
            "ctrl.media.saveFormatLabel": "형식",
            "ctrl.media.overwrite": "같은 이름 파일이 있으면 덮어쓰기",
            "ctrl.cancel": "취소",
            "ctrl.media.saveTitle": "저장",
            "ctrl.dl.ytdlpInstalling": "yt-dlp 설치 중...",
            "ctrl.dl.ffmpegInstalling": "ffmpeg 설치 중...",
            "ctrl.dl.serverUnavailable": "서버 응답 없음 - 서버가 제외된 버전일 수 있습니다. 서버 상태를 확인하세요",
            "ctrl.dl.fetching": "조회 중...",
            "ctrl.dl.failedInfo": "정보 조회 실패",
            "ctrl.dl.enterUrl": "URL을 입력하세요",
            "ctrl.dl.failedStart": "시작 실패",
            "ctrl.dl.starting": "시작 중",
            "ctrl.dl.done": "완료",
            "ctrl.dl.error": "오류",
            "ctrl.dl.serverError": "서버 오류: {0}",
            "ctrl.media.savedOverwrite": "원본에 덮어씀: {0}",
            "ctrl.media.saved": "저장됨: {0}",
            "ctrl.media": "미디어",
        }
    });
}
registerMediaLan();


// SetBody가 innerHTML을 통째로 넣은 직후에는 DOM이 아직 붙지 않은 프레임이 있어, 살짝 지연을 두고서야
// 입력 요소를 안전하게 잡을 수 있다(Control.ts의 다른 모달들과 동일 이유·동일 값).
const MODAL_DOM_DELAY = 100;

// ── More 메뉴 자기등록 (다운로드 탭 흡수 → 단일 Media 탭) ───────────────────────
function applyLanInEl(root: ParentNode | null): void {
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-CLan]').forEach(el => {
        const key = el.getAttribute('data-CLan');
        if (!key) return;
        const t = CLan.Get(key, el.innerHTML);
        if (t != null) el.innerHTML = t;
    });
}

function registerMediaTab(): void {
    const menu = document.querySelector('ul[aria-labelledby="more-tab"]');
    const tabContent = CDOM.ID('myTabContent');
    if (!menu || !tabContent || CDOM.ID('media-tab')) return;

    const li = document.createElement('li');
    li.innerHTML = `<button class="dropdown-item" id="media-tab" data-bs-toggle="tab" data-bs-target="#media-panel" type="button"
        role="tab" aria-controls="media-panel" aria-selected="false"><i class="bi bi-music-note-beamed"></i> <span data-CLan="ctrl.media">Media</span></button>`;
    menu.appendChild(li);

    const panel = document.createElement('div');
    panel.className = 'tab-pane h-100';
    panel.id = 'media-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'media-tab');
    panel.style.overflowY = 'auto';
    panel.innerHTML = `<div id="media-root"></div>`;
    tabContent.appendChild(panel);

    applyLanInEl(li);

    let inited = false;
    const doMount = () => {
        if (inited) return;
        inited = true;
        MountMediaTab('media-root');
        applyLanInEl(document.getElementById('media-root'));
    };
    document.getElementById('media-tab')!.addEventListener('shown.bs.tab', doMount);
}

registerMediaTab();
CClass.Push(MountMediaTab);

// ── 상태 (편집기) ────────────────────────────────────────────────────────────
let gAudioCtx: AudioContext | null = null;
let gBuffer: AudioBuffer | null = null;
let gFileType: 'audio' | 'video' | null = null;
let gSelStart = 0; // seconds
let gSelEnd = 0;   // seconds
let gPreviewSrc: AudioBufferSourceNode | null = null;
let gClipboard: AudioBuffer | null = null;
let gCurrentFileName: string | null = null;
let gCurrentFile: Blob | null = null; // <input type=file>는 File, 드래그&드롭 로드는 fetch로 받은 Blob
// File 탭 드래그로 불러온 경우의 서버 로컬 절대경로. 저장 시 다운로드 폴더 대신 이 경로에 덮어쓴다.
// <input type=file> 업로드로 불러온 경우는 서버 경로를 알 수 없으므로 항상 null.
let gLoadedAbsPath: string | null = null;

// 1단계짜리(Ctrl+Z 한 번만) undo. 편집 하나 직전 상태의 AudioBuffer를 통째로 복제해서 들고 있는다.
let gUndoBuffer: AudioBuffer | null = null;
let gUndoSelStart = 0;
let gUndoSelEnd = 0;

function getAudioCtx(): AudioContext {
    if (!gAudioCtx) gAudioCtx = new AudioContext();
    return gAudioCtx;
}

function cloneAudioBuffer(buf: AudioBuffer): AudioBuffer {
    const out = getAudioCtx().createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        out.getChannelData(ch).set(buf.getChannelData(ch));
    }
    return out;
}

// 볼륨/노말라이즈/페이드는 gBuffer 샘플을 제자리에서 고쳐쓰기 때문에, 되돌리려면 손대기 전에
// 반드시 복제본을 떠둬야 한다(참조만 저장하면 원본도 같이 바뀌어서 undo가 무의미해진다).
function saveUndoSnapshot(): void {
    if (!gBuffer) return;
    gUndoBuffer = cloneAudioBuffer(gBuffer);
    gUndoSelStart = gSelStart;
    gUndoSelEnd = gSelEnd;
}

function undoOnce(): void {
    if (!gUndoBuffer) {
        CAlert.Warning(L('ctrl.media.noUndo', 'No edits to undo'));
        return;
    }
    stopPreview();
    gBuffer = gUndoBuffer;
    gSelStart = gUndoSelStart;
    gSelEnd = gUndoSelEnd;
    gUndoBuffer = null; // 1회만 지원
    gBaseWidth = 0;
    setZoom(1);
    updateSelLabel();
    CAlert.Info(L('ctrl.media.undone', 'Undone'));
}

function setupUndoKey(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key.toLowerCase() !== 'z' || !(e.ctrlKey || e.metaKey)) return;
        const panel = document.getElementById('media-panel');
        if (!panel || !panel.classList.contains('active')) return;
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
        e.preventDefault();
        undoOnce();
    });
}

// ── UI 마운트 ──────────────────────────────────────────────────────────────
export function MountMediaTab(rootId: string) {
    const root = CDOM.ID(rootId);
    if (!root) return;

    root.innerHTML = `
<div class="d-flex flex-column">

  <!-- 편집 툴바 -->
  <div class="btn-toolbar align-items-center gap-2 p-2 border-bottom bg-body-secondary" role="toolbar">
    <input type="file" id="media-file-input" accept="audio/*,video/*" class="form-control form-control-sm" style="max-width:260px;">
    <span class="text-muted small" style="white-space:nowrap;">${L('ctrl.media.dropHint', 'or drag & drop from the File tab')}</span>

    <div class="btn-group btn-group-sm" role="group">
      <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="bi bi-scissors"></i> ${L('ctrl.media.editTab', 'Edit')}
      </button>
      <ul class="dropdown-menu">
        <li><button class="dropdown-item" id="media-op-trim">${L('ctrl.media.trim', 'Trim to selection')}</button></li>
        <li><hr class="dropdown-divider"></li>
        <li><button class="dropdown-item" id="media-op-cut">${L('ctrl.media.cutOp', 'Cut')}</button></li>
        <li><button class="dropdown-item" id="media-op-copy">${L('ctrl.media.copyOp', 'Copy')}</button></li>
        <li><button class="dropdown-item" id="media-op-paste" disabled>${L('ctrl.media.pasteOp', 'Paste')}</button></li>
      </ul>
    </div>

    <div class="btn-group btn-group-sm" role="group">
      <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="bi bi-soundwave"></i> ${L('ctrl.media.soundTab', 'Sound')}
      </button>
      <ul class="dropdown-menu">
        <li><button class="dropdown-item" id="media-op-volume">${L('ctrl.media.volume', 'Volume')}</button></li>
        <li><button class="dropdown-item" id="media-op-normalize">${L('ctrl.media.normalize', 'Normalize')}</button></li>
        <li><button class="dropdown-item" id="media-op-fadein">${L('ctrl.media.fadein', 'Fade in')}</button></li>
        <li><button class="dropdown-item" id="media-op-fadeout">${L('ctrl.media.fadeout', 'Fade out')}</button></li>
      </ul>
    </div>

    <button class="btn btn-outline-secondary" id="media-download-btn">
      <i class="bi bi-cloud-download-fill"></i> ${L('ctrl.download', 'Download')}
    </button>

    <button class="btn btn-outline-success" id="media-save-btn" disabled>
      <i class="bi bi-save-fill"></i> ${L('ctrl.media.save', 'Save')}
    </button>

    <div class="btn-group btn-group-sm ms-auto" role="group">
      <button class="btn btn-primary" id="media-play-btn" disabled><i class="bi bi-play-fill"></i> ${L('ctrl.media.play', 'Play selection')}</button>
      <button class="btn btn-outline-danger" id="media-stop-btn" disabled><i class="bi bi-stop-fill"></i> ${L('ctrl.media.stop', 'Stop')}</button>
    </div>
  </div>

  <!-- 센터: 영상/검정 영역 -->
  <div id="media-video-wrap" class="d-flex align-items-center justify-content-center bg-black" style="height:240px;">
    <video id="media-video" class="mw-100 mh-100" style="display:none;"></video>
    <span id="media-video-placeholder" class="text-white-50 small">${L('ctrl.media.noFile', 'Select a file')}</span>
  </div>

  <!-- 파형 + 구간선택 -->
  <div class="p-2">
    <div id="media-waveform-scroll" class="rounded border" style="height:128px;overflow-x:auto;overflow-y:hidden;background:#111;">
      <canvas id="media-waveform" style="height:120px;display:block;cursor:crosshair;"></canvas>
    </div>
    <div class="d-flex align-items-center justify-content-between small text-muted mt-1">
      <span id="media-sel-label" class="badge text-bg-light border">${L('ctrl.media.selHint', 'Drag the waveform to select a range')}</span>
      <div class="btn-group btn-group-sm" role="group">
        <button class="btn btn-outline-secondary" id="media-zoom-out" title="${L('ctrl.media.zoomOut', 'Zoom out')}"><i class="bi bi-dash-lg"></i></button>
        <span id="media-zoom-label" class="btn btn-outline-secondary disabled" style="min-width:52px;">100%</span>
        <button class="btn btn-outline-secondary" id="media-zoom-in" title="${L('ctrl.media.zoomIn', 'Zoom in')}"><i class="bi bi-plus-lg"></i></button>
      </div>
      <span id="media-vol-label" class="badge text-bg-light border"></span>
    </div>
  </div>

</div>`;

    // 편집기 이벤트
    CDOM.ID('media-file-input').addEventListener('change', onFileChosen);
    CDOM.ID('media-play-btn').addEventListener('click', () => playSelection());
    CDOM.ID('media-stop-btn').addEventListener('click', () => stopPreview());
    CDOM.ID('media-op-volume').addEventListener('click', () => opVolume());
    CDOM.ID('media-op-normalize').addEventListener('click', () => opNormalize());
    CDOM.ID('media-op-fadein').addEventListener('click', () => opFade('in'));
    CDOM.ID('media-op-fadeout').addEventListener('click', () => opFade('out'));
    CDOM.ID('media-op-trim').addEventListener('click', () => opTrim());
    CDOM.ID('media-op-cut').addEventListener('click', () => opCut());
    CDOM.ID('media-op-copy').addEventListener('click', () => opCopy());
    CDOM.ID('media-op-paste').addEventListener('click', () => opPaste());
    CDOM.ID('media-download-btn').addEventListener('click', () => openDownloadModal());
    CDOM.ID('media-save-btn').addEventListener('click', () => onSaveClick());
    CDOM.ID('media-zoom-in').addEventListener('click', () => setZoom(gZoom * 1.5));
    CDOM.ID('media-zoom-out').addEventListener('click', () => setZoom(gZoom / 1.5));
    setupWaveformDrag();
    setupSpaceKeyToggle();
    setupUndoKey();
    setupFileDrop(root);
}

// ── 스페이스바로 재생/정지 토글 ────────────────────────────────────────────────
function setupSpaceKeyToggle(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.code !== 'Space' && e.key !== ' ') return;

        const panel = document.getElementById('media-panel');
        if (!panel || !panel.classList.contains('active')) return; // Media 탭이 열려있을 때만

        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

        e.preventDefault();
        if (gPreviewSrc) stopPreview();
        else playSelection();
    });
}

// ── 다운로드 모달 ────────────────────────────────────────────────────────────
function downloadSectionHtml(): string {
    return `
<div class="d-flex align-items-center gap-2 mb-3">
  <span id="dl-ytdlp-badge" class="badge bg-secondary">${L('ctrl.dl.ytdlpChecking', 'yt-dlp checking...')}</span>
  <span id="dl-ffmpeg-badge" class="badge bg-secondary">${L('ctrl.dl.ffmpegChecking', 'ffmpeg checking...')}</span>
</div>

<div class="input-group mb-2">
  <input id="dl-url" type="text" class="form-control font-monospace"
    placeholder="${L('ctrl.dl.phUrl', 'https://www.youtube.com/watch?v=... or direct file URL')}">
  <button class="btn btn-outline-primary" id="dl-info-btn">${L('ctrl.dl.fetchInfo', 'Fetch Info')}</button>
</div>

<div id="dl-info-box" class="alert alert-info py-2 mb-2" style="display:none;font-size:13px;">
  <strong id="dl-title"></strong>
  <span id="dl-meta" class="text-muted ms-2"></span>
</div>

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

<div id="dl-job-list" class="mt-3"></div>

<hr class="my-3">
<div class="mt-2">
  <div class="d-flex align-items-center justify-content-between mb-1">
    <label class="form-label small mb-0 fw-semibold">
      <i class="bi bi-stars"></i> ${L('ctrl.dl.aiOrganize', 'AI organize')}
    </label>
    <span id="dl-ai-cwd" class="text-muted small font-monospace text-truncate ms-2" style="max-width:60%;" title=""></span>
  </div>
  <textarea id="dl-ai-prompt" class="form-control form-control-sm mb-2" rows="3"
    placeholder="${L('ctrl.dl.aiPh', 'e.g. Rename the files I just downloaded and sort them into folders by type')}"></textarea>
  <div class="d-flex align-items-center gap-2">
    <button type="button" class="btn btn-primary btn-sm" id="dl-ai-btn">
      <i class="bi bi-robot"></i> ${L('ctrl.dl.aiRun', 'Organize with AI')}
    </button>
    <span id="dl-ai-status" class="small text-muted"></span>
  </div>
  <div id="dl-ai-result" class="mt-2 p-2 border rounded bg-body-tertiary small"
    style="display:none;max-height:220px;overflow:auto;white-space:pre-wrap;"></div>
</div>`;
}

let gDownloadModal: CModal | null = null;
function openDownloadModal(): void {
    if (gDownloadModal) {
        gDownloadModal.Show();
        gDownloadModal.SetZIndex(CModal.eSort.Top);
        return;
    }

    const container = document.createElement('div');
    container.id = 'media-download-root';
    container.innerHTML = downloadSectionHtml();

    gDownloadModal = new CModal();
    gDownloadModal.SetTitle(CModal.eTitle.TextClose);
    gDownloadModal.SetHeader(L('ctrl.download', 'Download'));
    gDownloadModal.SetBody(container);
    gDownloadModal.SetSize('90%', '80%');
    gDownloadModal.SetCloseToHide(true);
    gDownloadModal.SetZIndex(CModal.eSort.Top);
    gDownloadModal.Open(CModal.ePos.Center);

    setTimeout(() => {
        wireDownloadEvents();
        checkBinaryStatus();
    }, MODAL_DOM_DELAY);
}

// 오늘 다운로드 폴더 절대경로(Download/Status.dir). AI 정리 workingDir로 사용.
let gDownloadDir: string = '';
// 모달 안에서 이어서 말할 때 쓰는 AIChat 세션 id
let gDownloadAiSession: string = '';

function wireDownloadEvents(): void {
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
    CDOM.ID('dl-info-btn').addEventListener('click', () => fetchInfo());
    CDOM.ID('dl-url').addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') fetchInfo();
    });
    CDOM.ID('dl-start-btn').addEventListener('click', () => startDownload());
    CDOM.ID('dl-ai-btn').addEventListener('click', () => runDownloadAiOrganize());
}

/** Chat UI와 동일한 키로 마지막 프로바이더/모델 사용. 없으면 AIInfo/setting에서 기본값. */
async function resolveAiProviderModel(): Promise<{ provider: string; model: string } | null> {
    let provider = (CStorage.Get('ai.provider') as string) || '';
    let model = (CStorage.Get('ai.model') as string) || '';
    if (provider && (provider === 'cmd' || model)) return { provider, model };

    try {
        const setting = await CFecth.Exe('AIInfo/setting', {}, 'json') as any;
        const models = setting?.models || {};
        const order = ['claude', 'codex', 'grok', 'opencode', 'antigravity'];
        if (!provider || !models[provider]) {
            provider = order.find(p => Array.isArray(models[p]) && models[p].length) || '';
        }
        if (provider && provider !== 'cmd') {
            const list: { value: string; label: string }[] = models[provider] || [];
            if (!model || !list.some(m => m.value === model)) {
                model = list.length ? list[list.length - 1].value : '';
            }
        }
    } catch { /* ignore */ }

    if (!provider) return null;
    if (provider !== 'cmd' && !model) return null;
    return { provider, model };
}

async function runDownloadAiOrganize(): Promise<void> {
    const promptEl = CDOM.ID('dl-ai-prompt') as HTMLTextAreaElement | null;
    const btn = CDOM.ID('dl-ai-btn') as HTMLButtonElement | null;
    const statusEl = CDOM.ID('dl-ai-status');
    const resultEl = CDOM.ID('dl-ai-result');
    if (!promptEl || !btn) return;

    const content = promptEl.value.trim();
    if (!content) {
        CAlert.E(L('ctrl.dl.aiNeedPrompt', 'Enter organize instructions'));
        promptEl.focus();
        return;
    }
    if (!gDownloadDir) {
        CAlert.E(L('ctrl.dl.aiNoDir', 'Download folder path is not ready yet. Try again in a moment.'));
        return;
    }

    const pm = await resolveAiProviderModel();
    if (!pm) {
        CAlert.E(L('ctrl.dl.aiNoProvider', 'No AI provider/model. Pick one in Chat first.'));
        return;
    }

    btn.disabled = true;
    if (statusEl) statusEl.textContent = L('ctrl.dl.aiRunning', 'Running AI…');
    if (resultEl) { resultEl.style.display = 'none'; resultEl.textContent = ''; }

    try {
        const body: Record<string, unknown> = {
            provider: pm.provider,
            model: pm.model,
            content,
            workingDir: gDownloadDir,
            write: true,
            mdcopy: false,
            mcp: false,
        };
        if (gDownloadAiSession) body.session = gDownloadAiSession;

        const res = await CFecth.Exe('AIChat/chat', body, 'json') as {
            ok?: boolean; msg?: string; session?: string; messages?: Array<{ role: string; content: string }>;
        };

        if (res.session) gDownloadAiSession = res.session;

        if (!res.ok) {
            CAlert.E(res.msg || L('ctrl.dl.aiFailed', 'AI organize failed'));
            if (statusEl) statusEl.textContent = '';
            if (resultEl && res.messages?.length) {
                const last = [...res.messages].reverse().find(m => m.role === 'assistant') || res.messages[res.messages.length - 1];
                resultEl.style.display = '';
                resultEl.textContent = last?.content || res.msg || '';
            }
            return;
        }

        const msgs = res.messages || [];
        const lastAsst = [...msgs].reverse().find(m => m.role === 'assistant');
        if (resultEl) {
            resultEl.style.display = '';
            resultEl.textContent = lastAsst?.content || L('ctrl.dl.aiDoneEmpty', '(no response)');
        }
        if (statusEl) statusEl.textContent = L('ctrl.dl.aiDone', 'Done');
        CAlert.Info(L('ctrl.dl.aiDone', 'Done'));
    } catch (e: any) {
        CAlert.E(LF('ctrl.dl.serverError', 'Server error: {0}', e?.message || e));
        if (statusEl) statusEl.textContent = '';
    } finally {
        btn.disabled = false;
    }
}

// ── 파일 로드 (편집기) ─────────────────────────────────────────────────────────
async function onFileChosen(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    await loadMediaBlob(file, file.name, file.type);
}

function guessMediaType(name: string, mime: string): 'audio' | 'video' {
    if (mime.startsWith('video')) return 'video';
    if (mime.startsWith('audio')) return 'audio';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return ['mp4', 'mov', 'mkv', 'webm', 'avi'].includes(ext) ? 'video' : 'audio';
}

// 원본 절대경로에 그대로 덮어써 저장할 수 있는 확장자인지. 지금 서버가 인코딩 지원하는 형식(wav/mp3/mp4)만
// 안전하게 원래 확장자를 유지한 채 덮어쓸 수 있다 — 그 외 확장자(m4a, ogg, mov 등)는 컨테이너/코덱이
// 안 맞을 수 있어 지원하지 않고 일반 저장(다운로드 폴더) 모달로 유도한다.
function extToOverwriteFormat(name: string): 'wav' | 'mp3' | 'mp4' | null {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'wav') return 'wav';
    if (ext === 'mp3') return 'mp3';
    if (ext === 'mp4') return 'mp4';
    return null;
}

// <input type=file> 선택과 File 탭 드래그&드롭 모두 이 함수로 합류한다.
// absPath: File 탭 드래그로 불러온 경우 원본 서버 절대경로(저장 시 덮어쓸 위치). 업로드면 null.
async function loadMediaBlob(blob: Blob, fileName: string, mime: string, absPath: string | null = null): Promise<void> {
    stopPreview();
    gFileType = guessMediaType(fileName, mime);
    gCurrentFileName = fileName;
    gCurrentFile = blob;
    gLoadedAbsPath = absPath;
    gUndoBuffer = null; // 새 파일을 불러오면 이전 파일의 undo 스냅샷은 의미가 없다

    const video = CDOM.ID('media-video') as HTMLVideoElement;
    const placeholder = CDOM.ID('media-video-placeholder');
    const url = URL.createObjectURL(blob);

    if (gFileType === 'video') {
        video.src = url;
        video.style.display = '';
        placeholder.style.display = 'none';
    } else {
        video.style.display = 'none';
        placeholder.style.display = '';
    }

    try {
        const arrayBuf = await blob.arrayBuffer();
        gBuffer = await getAudioCtx().decodeAudioData(arrayBuf);
        gSelStart = 0;
        gSelEnd = gBuffer.duration;
        drawWaveform();
        updateSelLabel();
        (CDOM.ID('media-play-btn') as HTMLButtonElement).disabled = false;
        (CDOM.ID('media-save-btn') as HTMLButtonElement).disabled = false;
    } catch (err: any) {
        CAlert.E(L('ctrl.media.decodeFail', 'Audio decode failed: ') + err.message);
    }
}

// ── File 탭에서 드래그&드롭으로 불러오기 ──────────────────────────────────────
// File 탭 항목을 드래그하면 dataTransfer('text/plain')에 서버 로컬 절대경로 문자열이 담겨온다.
// Control.ts가 노출해둔 window.ctrlPathToUrl로 그 경로를 실제 다운로드 URL로 바꿔 fetch한다.
function setupFileDrop(root: HTMLElement): void {
    root.addEventListener('dragover', (e: DragEvent) => {
        if (!e.dataTransfer?.types.includes('text/plain')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    root.addEventListener('drop', async (e: DragEvent) => {
        const absPath = e.dataTransfer?.getData('text/plain');
        if (!absPath) return;
        e.preventDefault();

        const toUrl = (window as any).ctrlPathToUrl as ((p: string) => Promise<string | null>) | undefined;
        const url = toUrl ? await toUrl(absPath) : null;
        if (!url) {
            CAlert.E(L('ctrl.media.dropPathErr', 'Path is outside registered File roots'));
            return;
        }

        const fileName = decodeURIComponent(absPath.split(/[\\/]/).pop() || 'dropped');
        try {
            const res = await fetch(url);
            if (!res.ok) { CAlert.E(`${L('ctrl.media.dropFetchErr', 'Failed to fetch file')}: HTTP ${res.status}`); return; }
            const blob = await res.blob();
            await loadMediaBlob(blob, fileName, blob.type, absPath);
        } catch (err: any) {
            CAlert.E(LF('ctrl.dl.serverError', 'Server error: {0}', err.message));
        }
    });
}

// ── 파형 그리기 (줌 지원) ──────────────────────────────────────────────────────
let gPlayheadTime: number | null = null; // 재생 중일 때 초 단위 위치, 아니면 null
let gZoom = 1;       // 1 = 스크롤 영역 폭에 맞춤, 커질수록 가로로 늘어나며 스크롤바 생김
let gBaseWidth = 0;  // 줌 1배 기준 폭(px), 최초 그릴 때 스크롤 컨테이너 폭으로 캐시

function setZoom(z: number): void {
    gZoom = Math.min(30, Math.max(1, z));
    const label = CDOM.ID('media-zoom-label');
    if (label) label.textContent = Math.round(gZoom * 100) + '%';
    drawWaveform();
}

function drawWaveform() {
    if (!gBuffer) return;
    const canvas = CDOM.ID('media-waveform') as HTMLCanvasElement;
    const scrollWrap = CDOM.ID('media-waveform-scroll') as HTMLDivElement;
    if (gBaseWidth === 0) gBaseWidth = scrollWrap.clientWidth;

    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(gBaseWidth, Math.round(gBaseWidth * gZoom));
    const h = 120;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const data = gBuffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / w));
    const mid = h / 2;

    ctx.strokeStyle = '#4da3ff';
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
        let min = 1, max = -1;
        const start = x * step;
        for (let i = 0; i < step; i++) {
            const s = data[start + i] || 0;
            if (s < min) min = s;
            if (s > max) max = s;
        }
        ctx.moveTo(x, mid + min * mid);
        ctx.lineTo(x, mid + max * mid);
    }
    ctx.stroke();

    if (gBuffer.duration > 0) {
        const x1 = (gSelStart / gBuffer.duration) * w;
        const x2 = (gSelEnd / gBuffer.duration) * w;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x1, 0, x2 - x1, h);

        if (gPlayheadTime != null) {
            const px = (gPlayheadTime / gBuffer.duration) * w;
            ctx.strokeStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, h);
            ctx.stroke();
        } else if (gSelEnd - gSelStart < 0.005) {
            // 재생 중이 아니고 선택 구간이 점(길이 0)이면 = 붙여넣기 커서 위치. 항상 표시.
            const px = (gSelStart / gBuffer.duration) * w;
            ctx.strokeStyle = '#ffcc00';
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, h);
            ctx.stroke();
        }
    }
}

function setupWaveformDrag() {
    const canvas = CDOM.ID('media-waveform') as HTMLCanvasElement;
    let dragging = false;
    let dragStartX = 0;

    const xToTime = (clientX: number): number => {
        if (!gBuffer) return 0;
        const rect = canvas.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        return ratio * gBuffer.duration;
    };

    canvas.addEventListener('mousedown', (e) => {
        if (!gBuffer) return;
        dragging = true;
        dragStartX = e.clientX;
        gSelStart = gSelEnd = xToTime(e.clientX);
        drawWaveform();
        updateSelLabel();
    });
    window.addEventListener('mousemove', (e) => {
        if (!dragging || !gBuffer) return;
        const t = xToTime(e.clientX);
        const t0 = xToTime(dragStartX);
        gSelStart = Math.min(t0, t);
        gSelEnd = Math.max(t0, t);
        drawWaveform();
        updateSelLabel();
    });
    window.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        if (gBuffer && gSelEnd - gSelStart < 0.02) {
            // 의미 있는 드래그가 아니라 클릭 → 그 위치를 "붙여넣기 커서"(길이 0 선택)로 고정.
            // 예전엔 이걸 이전 선택으로 되돌렸는데, 그러면 클릭만으로 삽입 위치를 지정할 수 없었다.
            gSelStart = gSelEnd = xToTime(dragStartX);
            drawWaveform();
            updateSelLabel();
        }
    });
}

function updateSelLabel() {
    const label = CDOM.ID('media-sel-label');
    if (gSelEnd - gSelStart < 0.005) {
        label.textContent = `${L('ctrl.media.cursor', 'Cursor')}: ${gSelStart.toFixed(2)}s (${L('ctrl.media.pasteHere', 'paste position')})`;
    } else {
        label.textContent = `${L('ctrl.media.selection', 'Selection')}: ${gSelStart.toFixed(2)}s ~ ${gSelEnd.toFixed(2)}s`;
    }
}

// ── 재생/정지 ────────────────────────────────────────────────────────────────
let gPlayheadRAF: number | null = null;

function stopPlayheadLoop(): void {
    if (gPlayheadRAF != null) {
        cancelAnimationFrame(gPlayheadRAF);
        gPlayheadRAF = null;
    }
    gPlayheadTime = null;
}

function stopPreview() {
    if (gPreviewSrc) {
        try { gPreviewSrc.stop(); } catch { /* 이미 정지됨 */ }
        gPreviewSrc = null;
    }
    if (gFileType === 'video') {
        const video = CDOM.ID('media-video') as HTMLVideoElement;
        video.pause();
    }
    stopPlayheadLoop();
    (CDOM.ID('media-stop-btn') as HTMLButtonElement).disabled = true;
    drawWaveform();
}

function playSelection() {
    if (!gBuffer) return;
    stopPreview();

    // 구간 선택이 없고 커서(길이 0)만 있는 상태면, 커서 위치부터 끝까지 재생한다.
    const isCursor = gSelEnd - gSelStart < 0.005;
    const playFrom = gSelStart;
    const playTo = isCursor ? gBuffer.duration : gSelEnd;
    const dur = Math.max(0, playTo - playFrom);
    if (dur <= 0) return;

    const ctx = getAudioCtx();
    const src = ctx.createBufferSource();
    src.buffer = gBuffer;
    src.connect(ctx.destination);

    const startCtxTime = ctx.currentTime;
    src.start(0, playFrom, dur);
    gPreviewSrc = src;
    (CDOM.ID('media-stop-btn') as HTMLButtonElement).disabled = false;

    // 영상 파일이면 화면도 같이 재생한다. 원본 트랙 소리는 끄고(음소거) 대신 위에서 만든
    // Web Audio 버퍼(볼륨/노말라이즈/페이드가 실제로 반영된 편집본)로만 소리를 낸다.
    if (gFileType === 'video') {
        const video = CDOM.ID('media-video') as HTMLVideoElement;
        video.muted = true;
        video.currentTime = playFrom;
        video.play().catch(() => { /* 사용자 제스처 없이 자동재생이 막힌 경우 등, 오디오는 계속 재생됨 */ });
    }

    const animate = () => {
        if (gPreviewSrc !== src) return; // 다른 재생으로 대체됨
        gPlayheadTime = playFrom + (getAudioCtx().currentTime - startCtxTime);
        if (gFileType === 'video' && gPlayheadTime >= playTo) {
            const video = CDOM.ID('media-video') as HTMLVideoElement;
            video.pause();
        }
        drawWaveform();
        gPlayheadRAF = requestAnimationFrame(animate);
    };
    gPlayheadRAF = requestAnimationFrame(animate);

    src.onended = () => {
        if (gPreviewSrc !== src) return; // 이미 다른 재생으로 대체됨 → 이 뒤늦은 콜백은 무시
        gPreviewSrc = null;
        if (gFileType === 'video') (CDOM.ID('media-video') as HTMLVideoElement).pause();
        stopPlayheadLoop();
        (CDOM.ID('media-stop-btn') as HTMLButtonElement).disabled = true;
        drawWaveform();
    };
}

// 드래그로 구간을 선택하지 않고 단순 클릭만 한 경우(커서, 폭 0)는 전체 선택으로 취급한다.
function getEffectiveSelIdx(): { startIdx: number, endIdx: number } {
    const sr = gBuffer.sampleRate;
    if (gSelEnd - gSelStart < 0.005) return { startIdx: 0, endIdx: gBuffer.length };
    const startIdx = Math.max(0, Math.floor(gSelStart * sr));
    const endIdx = Math.min(gBuffer.length, Math.floor(gSelEnd * sr));
    return { startIdx, endIdx };
}

// ── 오디오 편집 기능 (선택 구간의 샘플을 실제로 변형 → 파형에 바로 반영) ─────────
// gainAt(구간 내 상대위치 0~1) → 해당 샘플에 곱할 게인
function applySelectionGain(gainAt: (relPos: number) => number): boolean {
    if (!gBuffer) return false;
    const { startIdx, endIdx } = getEffectiveSelIdx();
    const n = endIdx - startIdx;
    if (n <= 0) return false;

    for (let ch = 0; ch < gBuffer.numberOfChannels; ch++) {
        const data = gBuffer.getChannelData(ch);
        for (let i = 0; i < n; i++) {
            const g = gainAt(i / n);
            let v = data[startIdx + i] * g;
            if (v > 1) v = 1; else if (v < -1) v = -1;
            data[startIdx + i] = v;
        }
    }
    return true;
}

// ── 편집 기능: 선택구간만 남기고 자르기(트림) ─────────────────────────────────────
function opTrim(): void {
    if (!gBuffer) { CAlert.E(L('ctrl.media.noFileErr', 'Load a file first')); return; }

    const sr = gBuffer.sampleRate;
    const startIdx = Math.max(0, Math.floor(gSelStart * sr));
    const endIdx = Math.min(gBuffer.length, Math.floor(gSelEnd * sr));
    const n = endIdx - startIdx;
    if (n <= 0) { CAlert.E(L('ctrl.media.noSelErr', 'Select a range first')); return; }
    if (n === gBuffer.length) { CAlert.Warning(L('ctrl.media.trimWholeWarn', 'The whole range is selected — nothing to trim')); return; }

    stopPreview();
    saveUndoSnapshot();

    const newBuffer = getAudioCtx().createBuffer(gBuffer.numberOfChannels, n, sr);
    for (let ch = 0; ch < gBuffer.numberOfChannels; ch++) {
        newBuffer.getChannelData(ch).set(gBuffer.getChannelData(ch).subarray(startIdx, endIdx));
    }
    gBuffer = newBuffer;
    gSelStart = 0;
    gSelEnd = gBuffer.duration;
    gBaseWidth = 0;
    setZoom(1);
    updateSelLabel();

    if (gFileType === 'video') {
        CAlert.Warning(L('ctrl.media.trimVideoWarn', 'Audio was edited only. Video preview still shows the original until server processing.'));
    }
}

// ── 편집 기능: 잘라내기 / 복사 / 붙여넣기(클립보드) ──────────────────────────────
function bufferSlice(buf: AudioBuffer, startIdx: number, endIdx: number): AudioBuffer {
    const n = Math.max(0, endIdx - startIdx);
    const out = getAudioCtx().createBuffer(buf.numberOfChannels, Math.max(1, n), buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        out.getChannelData(ch).set(buf.getChannelData(ch).subarray(startIdx, endIdx));
    }
    return out;
}

// buf의 [startIdx,endIdx) 구간을 insert(null이면 그냥 삭제)로 갈아끼운 새 버퍼를 만든다.
function bufferSplice(buf: AudioBuffer, startIdx: number, endIdx: number, insert: AudioBuffer | null): AudioBuffer {
    const insertLen = insert ? insert.length : 0;
    const newLen = buf.length - (endIdx - startIdx) + insertLen;
    const out = getAudioCtx().createBuffer(buf.numberOfChannels, Math.max(1, newLen), buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const src = buf.getChannelData(ch);
        const dst = out.getChannelData(ch);
        dst.set(src.subarray(0, startIdx), 0);
        if (insert) {
            const insertCh = insert.numberOfChannels > ch ? ch : 0;
            dst.set(insert.getChannelData(insertCh), startIdx);
        }
        dst.set(src.subarray(endIdx), startIdx + insertLen);
    }
    return out;
}

function getSelIdx(): { startIdx: number; endIdx: number } | null {
    if (!gBuffer) return null;
    const sr = gBuffer.sampleRate;
    const startIdx = Math.max(0, Math.floor(gSelStart * sr));
    const endIdx = Math.min(gBuffer.length, Math.floor(gSelEnd * sr));
    return { startIdx, endIdx };
}

function updatePasteEnabled(): void {
    (CDOM.ID('media-op-paste') as HTMLButtonElement).disabled = gClipboard == null;
}

function opCopy(): void {
    if (!gBuffer) { CAlert.E(L('ctrl.media.noFileErr', 'Load a file first')); return; }
    const idx = getSelIdx()!;
    if (idx.endIdx - idx.startIdx <= 0) { CAlert.E(L('ctrl.media.noSelErr', 'Select a range first')); return; }
    gClipboard = bufferSlice(gBuffer, idx.startIdx, idx.endIdx);
    updatePasteEnabled();
    CDOM.ID('media-vol-label').textContent = L('ctrl.media.copied', 'Copied');
}

function opCut(): void {
    if (!gBuffer) { CAlert.E(L('ctrl.media.noFileErr', 'Load a file first')); return; }
    const idx = getSelIdx()!;
    if (idx.endIdx - idx.startIdx <= 0) { CAlert.E(L('ctrl.media.noSelErr', 'Select a range first')); return; }

    stopPreview();
    saveUndoSnapshot();
    gClipboard = bufferSlice(gBuffer, idx.startIdx, idx.endIdx);
    gBuffer = bufferSplice(gBuffer, idx.startIdx, idx.endIdx, null);

    const cutTime = idx.startIdx / gBuffer.sampleRate;
    gSelStart = gSelEnd = Math.min(cutTime, gBuffer.duration);
    gBaseWidth = 0;
    setZoom(1);
    updateSelLabel();
    updatePasteEnabled();
    CDOM.ID('media-vol-label').textContent = L('ctrl.media.cutDone', 'Cut');

    if (gFileType === 'video') {
        CAlert.Warning(L('ctrl.media.trimVideoWarn', 'Audio was edited only. Video preview still shows the original until server processing.'));
    }
}

function opPaste(): void {
    if (!gBuffer) { CAlert.E(L('ctrl.media.noFileErr', 'Load a file first')); return; }
    if (!gClipboard) { CAlert.E(L('ctrl.media.noClipboardErr', 'Cut or copy a range first')); return; }
    const idx = getSelIdx()!;

    stopPreview();
    saveUndoSnapshot();
    const pasteStart = idx.startIdx;
    gBuffer = bufferSplice(gBuffer, idx.startIdx, idx.endIdx, gClipboard);

    gSelStart = pasteStart / gBuffer.sampleRate;
    gSelEnd = (pasteStart + gClipboard.length) / gBuffer.sampleRate;
    gBaseWidth = 0;
    setZoom(1);
    updateSelLabel();
    CDOM.ID('media-vol-label').textContent = L('ctrl.media.pasted', 'Pasted');

    if (gFileType === 'video') {
        CAlert.Warning(L('ctrl.media.trimVideoWarn', 'Audio was edited only. Video preview still shows the original until server processing.'));
    }
}

function opVolume() {
    if (!gBuffer) { CAlert.E(L('ctrl.media.noFileErr', 'Load a file first')); return; }
    const input = prompt(L('ctrl.media.volumePrompt', 'Volume multiplier (e.g. 1.5 = 150%)'), '1.0');
    if (input == null) return;
    const v = parseFloat(input);
    if (!isFinite(v) || v < 0) return;
    saveUndoSnapshot();
    if (!applySelectionGain(() => v)) return;
    drawWaveform();
    CDOM.ID('media-vol-label').textContent = `${L('ctrl.media.volume', 'Volume')}: x${v.toFixed(2)} ${L('ctrl.media.applied', 'applied')}`;
    playSelection();
}

function opNormalize() {
    if (!gBuffer) { CAlert.E(L('ctrl.media.noFileErr', 'Load a file first')); return; }
    const { startIdx, endIdx } = getEffectiveSelIdx();
    let peak = 0;
    for (let ch = 0; ch < gBuffer.numberOfChannels; ch++) {
        const data = gBuffer.getChannelData(ch);
        for (let i = startIdx; i < endIdx; i++) {
            const abs = Math.abs(data[i] || 0);
            if (abs > peak) peak = abs;
        }
    }
    if (peak <= 0) { CAlert.E(L('ctrl.media.silentSel', 'Selection is silent')); return; }
    const target = 0.98;
    const gainVal = target / peak;
    saveUndoSnapshot();
    applySelectionGain(() => gainVal);
    drawWaveform();
    CDOM.ID('media-vol-label').textContent = `${L('ctrl.media.normalize', 'Normalize')}: peak=${peak.toFixed(3)} → x${gainVal.toFixed(2)} ${L('ctrl.media.applied', 'applied')}`;
    playSelection();
}

function opFade(dir: 'in' | 'out') {
    if (!gBuffer) { CAlert.E(L('ctrl.media.noFileErr', 'Load a file first')); return; }
    saveUndoSnapshot();
    applySelectionGain((relPos) => dir === 'in' ? relPos : (1 - relPos));
    drawWaveform();
    CDOM.ID('media-vol-label').textContent = (dir === 'in'
        ? L('ctrl.media.fadein', 'Fade in')
        : L('ctrl.media.fadeout', 'Fade out')) + ' ' + L('ctrl.media.applied', 'applied');
    playSelection();
}

// ── 저장 (편집된 오디오를 WAV로 서버에 저장) ─────────────────────────────────────
// AudioBuffer → 16bit PCM WAV. 브라우저에는 mp3 등 압축 인코더가 없어 무손실 WAV로 저장한다.
function encodeWav(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const numFrames = buffer.length;
    const blockAlign = numChannels * 2;
    const dataSize = numFrames * blockAlign;

    const arrBuf = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrBuf);
    const writeStr = (offset: number, s: string) => {
        for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);

    const channels: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) channels.push(buffer.getChannelData(ch));

    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            const s = Math.max(-1, Math.min(1, channels[ch][i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
            offset += 2;
        }
    }
    return arrBuf;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

// mp4로 저장하려면 원본 영상까지 통째로 base64로 올려야 하는데, JSON 바디 한도(100MB)를 감안해
// 대략 이 크기(base64 팽창 전 원본 기준) 넘는 파일은 지금 방식으로는 막는다.
const MAX_MP4_SOURCE_BYTES = 60 * 1024 * 1024;

// 저장 버튼 클릭. File 탭 드래그로 불러왔고(gLoadedAbsPath) 원본 확장자가 저장 지원 형식(wav/mp3/mp4)이면
// 다운로드 폴더 모달 없이 원본 절대경로에 바로 덮어쓴다. 그 외(업로드로 불러왔거나 확장자 미지원)는
// 기존 다운로드 폴더 저장 모달로 진행한다.
function onSaveClick(): void {
    if (!gBuffer) { CAlert.E(L('ctrl.media.noFileErr', 'Load a file first')); return; }
    const overwriteFormat = gLoadedAbsPath ? extToOverwriteFormat(gCurrentFileName || '') : null;
    if (gLoadedAbsPath && overwriteFormat) {
        saveToOriginalPath(gLoadedAbsPath, overwriteFormat);
        return;
    }
    openSaveModal();
}

async function saveToOriginalPath(targetPath: string, format: 'wav' | 'mp3' | 'mp4'): Promise<void> {
    if (!gBuffer) return;

    if (format === 'mp4') {
        if (!gCurrentFile) { CAlert.E(L('ctrl.media.noOrigVideoErr', 'Original video file not found')); return; }
        if (gCurrentFile.size > MAX_MP4_SOURCE_BYTES) {
            CAlert.E(L('ctrl.media.videoTooBigErr', 'Video is too large (>60MB) to save as MP4 this way. Try MP3.'));
            return;
        }
    }

    const btn = CDOM.ID('media-save-btn') as HTMLButtonElement;
    btn.disabled = true;
    try {
        const wav = encodeWav(gBuffer);
        const audioData = arrayBufferToBase64(wav);
        const payload: Record<string, string> = { format, targetPath, audioData };
        if (format === 'mp4' && gCurrentFile) {
            payload.videoData = arrayBufferToBase64(await gCurrentFile.arrayBuffer());
        }

        const res = await CFecth.Exe('Download/SaveEdit', payload, 'json') as any;
        if (res.ok) {
            CAlert.Info(LF('ctrl.media.savedOverwrite', 'Overwritten original: {0}', targetPath));
        } else {
            CAlert.E(res.msg || L('ctrl.media.saveFailed', 'Save failed'));
        }
    } catch (e: any) {
        CAlert.E(LF('ctrl.dl.serverError', 'Server error: {0}', e.message));
    } finally {
        btn.disabled = false;
    }
}

function openSaveModal(): void {
    if (!gBuffer) { CAlert.E(L('ctrl.media.noFileErr', 'Load a file first')); return; }

    const baseName = (gCurrentFileName || 'edit').replace(/\.[^.]+$/, '');
    const formatOptions = gFileType === 'video'
        ? `<option value="mp4">MP4 (${L('ctrl.media.fmtVideo', 'video + edited audio')})</option>
           <option value="mp3">MP3 (${L('ctrl.media.fmtAudioOnly', 'audio only')})</option>
           <option value="wav">WAV (${L('ctrl.media.fmtLosslessAudio', 'lossless, audio only')})</option>`
        : `<option value="mp3">MP3</option>
           <option value="wav">WAV (${L('ctrl.media.fmtLossless', 'lossless')})</option>`;

    const container = document.createElement('div');
    container.innerHTML = `
<div class="mb-3">
  <label class="form-label small">${L('ctrl.media.saveNameLabel', 'File name')}</label>
  <div class="input-group">
    <input type="text" class="form-control" id="media-save-name" value="${baseName}">
    <span class="input-group-text" id="media-save-ext">.mp3</span>
  </div>
</div>
<div class="mb-3">
  <label class="form-label small">${L('ctrl.media.saveFormatLabel', 'Format')}</label>
  <select class="form-select" id="media-save-format">${formatOptions}</select>
</div>
<div class="form-check mb-3">
  <input class="form-check-input" type="checkbox" id="media-save-overwrite">
  <label class="form-check-label" for="media-save-overwrite">${L('ctrl.media.overwrite', 'Overwrite if a file with the same name exists')}</label>
</div>
<div class="d-flex justify-content-end gap-2">
  <button class="btn btn-secondary" id="media-save-cancel">${L('ctrl.cancel', 'Cancel')}</button>
  <button class="btn btn-success" id="media-save-confirm"><i class="bi bi-save-fill"></i> ${L('ctrl.media.save', 'Save')}</button>
</div>`;

    const modal = new CModal();
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetHeader(L('ctrl.media.saveTitle', 'Save'));
    modal.SetBody(container);
    modal.SetSize('420', '340');
    modal.SetZIndex(CModal.eSort.Top);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        const fmtSel = CDOM.ID('media-save-format') as HTMLSelectElement;
        const extSpan = CDOM.ID('media-save-ext');
        const syncExt = () => { extSpan.textContent = '.' + fmtSel.value; };
        fmtSel.addEventListener('change', syncExt);
        syncExt();

        CDOM.ID('media-save-cancel').addEventListener('click', () => modal.Close());
        CDOM.ID('media-save-confirm').addEventListener('click', () => {
            const name = (CDOM.ID('media-save-name') as HTMLInputElement).value.trim() || 'edit';
            const format = fmtSel.value as 'wav' | 'mp3' | 'mp4';
            const overwrite = (CDOM.ID('media-save-overwrite') as HTMLInputElement).checked;
            doSave(name, format, overwrite, modal);
        });
    }, MODAL_DOM_DELAY);
}

async function doSave(name: string, format: 'wav' | 'mp3' | 'mp4', overwrite: boolean, modal: CModal): Promise<void> {
    if (!gBuffer) return;

    if (format === 'mp4') {
        if (!gCurrentFile) { CAlert.E(L('ctrl.media.noOrigVideoErr', 'Original video file not found')); return; }
        if (gCurrentFile.size > MAX_MP4_SOURCE_BYTES) {
            CAlert.E(L('ctrl.media.videoTooBigErr', 'Video is too large (>60MB) to save as MP4 this way. Try MP3.'));
            return;
        }
    }

    const btn = CDOM.ID('media-save-confirm') as HTMLButtonElement;
    btn.disabled = true;
    try {
        const wav = encodeWav(gBuffer);
        const audioData = arrayBufferToBase64(wav);
        const payload: Record<string, string> = { name, format, overwrite: overwrite ? '1' : '0', audioData };
        if (format === 'mp4' && gCurrentFile) {
            payload.videoData = arrayBufferToBase64(await gCurrentFile.arrayBuffer());
        }

        const res = await CFecth.Exe('Download/SaveEdit', payload, 'json') as any;
        if (res.ok) {
            CAlert.Info(LF('ctrl.media.saved', 'Saved: {0}', res.file));
            modal.Close();
        } else {
            CAlert.E(res.msg || L('ctrl.media.saveFailed', 'Save failed'));
        }
    } catch (e: any) {
        CAlert.E(LF('ctrl.dl.serverError', 'Server error: {0}', e.message));
    } finally {
        btn.disabled = false;
    }
}

// ── 다운로드 (기존 DownloadTab.ts 로직 그대로 흡수) ─────────────────────────────
function isYouTubeUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?(youtube\.com\/|youtu\.be\/)/.test(url);
}

function getFormat(): string {
    const radios = document.querySelectorAll<HTMLInputElement>('input[name="dl-format"]');
    for (const r of radios) if (r.checked) return r.value;
    return 'mp3';
}

const MAX_STATUS_FAILS = 5;
function checkBinaryStatus(failCount = 0) {
    (CFecth.Exe('Download/Status', {}, 'json') as Promise<any>)
        .then((data: { ytdlp: boolean; ffmpeg: boolean; dir?: string }) => {
            if (typeof data?.dir === 'string' && data.dir) {
                gDownloadDir = data.dir;
                const cwdEl = CDOM.ID('dl-ai-cwd');
                if (cwdEl) {
                    cwdEl.textContent = data.dir;
                    cwdEl.setAttribute('title', data.dir);
                }
            }
            const ytBadge  = CDOM.ID('dl-ytdlp-badge');
            const ffBadge  = CDOM.ID('dl-ffmpeg-badge');
            ytBadge.textContent  = data.ytdlp  ? 'yt-dlp ✅' : L('ctrl.dl.ytdlpInstalling', 'yt-dlp installing...');
            ytBadge.className    = 'badge ' + (data.ytdlp  ? 'bg-success' : 'bg-warning text-dark');
            ffBadge.textContent  = data.ffmpeg ? 'ffmpeg ✅' : L('ctrl.dl.ffmpegInstalling', 'ffmpeg installing...');
            ffBadge.className    = 'badge ' + (data.ffmpeg ? 'bg-success' : 'bg-warning text-dark');

            if (!data.ytdlp || !data.ffmpeg)
                setTimeout(() => checkBinaryStatus(0), 3000);
        })
        .catch(() => {
            const nextFailCount = failCount + 1;
            if (nextFailCount >= MAX_STATUS_FAILS) {
                const msg = L('ctrl.dl.serverUnavailable', 'Server not responding — this build may exclude the server; check server status');
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

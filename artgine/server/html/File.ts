import { CModal, CConfirm } from "../../basic/CModal.js";
import { CAlert } from "../../basic/CAlert.js";
import { CDOM } from "../../basic/CDOM.js";
import { CHash } from "../../basic/CHash.js";
import { CFecth } from "../../network/CFecth.js";
import { CPath } from "../../basic/CPath.js";
import { CStorage } from "../../system/CStorage.js";
import { CUtilWeb } from "../../util/CUtilWeb.js";
import { getAuthToken, setAuthToken, removeAuthToken } from "../CAuthToken.js";
import { CFileViewer, CMDViewer, CSheetViewer, CModalMusic, CORMViewer } from "../../util/CModalUtil.js";
import { CAuthInfo } from "../../network/CAuthInfo.js";
import { CIframeMsg } from "./CIframeMsg.js";

const MODAL_DOM_DELAY = 100;
const DEFAULT_AUTH_PASSWORD = 'artgine';

function warnIfDefaultAuthPassword(pw: string) {
    if (pw === DEFAULT_AUTH_PASSWORD) CAlert.E("Please change the default password.");
}

// ==================================================================================================================
// 부모(Home.ts)와의 메시지 브리지
// ==================================================================================================================
// F1~F4/F7 등 전역 단축키는 부모의 공용 리스너(runHomeHotkey)로 위임한다 (Memo.ts와 동일한 패턴).
document.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'F1' || ev.key === 'F2' || ev.key === 'F3' || ev.key === 'F4' || ev.key === 'F7') {
        ev.preventDefault();
        if (window.top) CIframeMsg.Send(window.top, 'home-hotkey', { key: ev.key });
    }
});

CIframeMsg.Recv({
    'connect-remote': (data) => ConnectFileHomeUrl(String(data.url ?? '') || undefined),
    'trigger-file-btn': () => FileBtn(),
    'trigger-file-search': () => FileSearch(),
    'local-auth-updated': () => refreshFileAuthState(),
    // Control.ts 좌측 사이드바의 경로 선택 박스에서 고른 루트를 그대로 적용한다(#fileRootSel과 동일 경로).
    'set-file-root': (data) => applyFileRootSelection(String(data.path ?? ''), data.url ? String(data.url) : undefined, String(data.selKey ?? data.path ?? '')),
});

// RDP/File 탭 어느 쪽에서든 원격지가 바뀌면, 부모(Home.ts)가 Memo iframe에 그대로 중계하고,
// File iframe이 로드되어 있을 때는 'connect-remote'로 서로 맞춰준다 - memoSendRemoteInfo와 동일한 패턴.
function notifyRemoteChanged() {
    const baseUrl = g_fileWebRootUrl === CPath.WebRootUrl() ? '' : g_fileWebRootUrl;
    const token = baseUrl ? getAuthToken(baseUrl) : '';
    if (window.top) CIframeMsg.Send(window.top, 'file-remote-changed', { baseUrl, token });
}

// ==================================================================================================================
// 파일 서버 인증
// ==================================================================================================================
// 파일 서버(g_fileWebRootUrl) 관리자 비밀번호 인증창. F1(FileBtn)에서 공용으로 쓴다.
// 성공 시 refreshFileAuthState를 태워 인증 상태/인디케이터를 갱신하고, 대상이 원격이면 SendRemoteGuide까지 발동한다.
function promptFileAuth(onSuccess?: () => void) {
    const dlg = new CConfirm();
    dlg.SetBody('Enter admin password:<br><input type="password" id="AuthPassword" class="form-control form-control-sm">');
    const doAuth = () => {
        const pw = CDOM.IDValue("AuthPassword");
        (CFecth.Exe(FileApiUrl("auth/login"), { password: CHash.SHA256('artgine_' + pw) }, "json") as Promise<any>).then(async (j: { ok: boolean, token?: string, msg?: string }) => {
            if (j.ok) {
                SetFileToken(j.token!);
                await refreshFileAuthState();
                // 로컬 서버 인증이면 AI/터미널 탭도 같은 토큰(origin 공용)을 쓰므로, 열려 있는 AI 인증 오버레이도 즉시 닫아준다.
                if (g_fileWebRootUrl === CPath.WebRootUrl() && window.top) CIframeMsg.Send(window.top, 'local-auth-succeeded');
                CAlert.Info("Permission granted");
                warnIfDefaultAuthPassword(pw);
                onSuccess?.();
            } else {
                CAlert.E("Wrong password: " + (j.msg ?? ""));
            }
        }).catch(() => { CAlert.E("Server error"); });
    };
    dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
        doAuth,
        () => {},
    ], ["OK", "Cancel"]);
    dlg.Open();
    setTimeout(() => {
        const input = CDOM.ID("AuthPassword") as HTMLInputElement | null;
        input?.focus();
        input?.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            doAuth();
            dlg.Close();
        });
    }, MODAL_DOM_DELAY);
}

function installFileAuthIndicatorStyle() {
    // #fileUrlBar.file-list-authed 스타일은 File.html의 <style>에 정적으로 포함되어 있으므로 여기선 클래스만 토글한다.
}

const FILE_LIST_AUTHED_CLASS = 'file-list-authed';
function applyFileAuthIndicator(authed: boolean) {
    const urlBar = document.getElementById('fileUrlBar');
    if (!urlBar) return;
    urlBar.classList.toggle(FILE_LIST_AUTHED_CLASS, authed);
    urlBar.title = authed ? 'File admin authenticated' : '';
}
installFileAuthIndicatorStyle();

// ==================================================================================================================
// 모달들 (이미지/비디오/삭제/뮤직)
// ==================================================================================================================
var g_contentJBox = new CModal("content_modal");
g_contentJBox.SetCloseToHide(true);
g_contentJBox.SetBody("<img id='ImageModalSrc' style='width:100%;height: auto;max-height: 75vh;object-fit: contain' onclick='NextPhoto()'/>" +
            "<video id='VideoModalSrc' style='width:100%;height: auto;max-height: 75vh;object-fit: contain' controls onended='NextPhoto()'></video>" +
            "<a id='FileModalSrc' download >Download</a>" +
            "<div id='SourceSrc'/>");
g_contentJBox.Hide();
g_contentJBox.Open(CModal.ePos.Center);

var g_deleteJBox = new CModal("delete_modal");
g_deleteJBox.SetCloseToHide(true);
g_deleteJBox.SetBody("<div id='Delete_div'/>");
g_deleteJBox.Hide();
g_deleteJBox.Open(CModal.ePos.Center);

var g_musicJBox: CModalMusic;

function vcsTag(fl: { Status?: string, name?: string }): string {
    const s = fl.Status;
    if (!s) return '';
    const color = s === 'A' ? 'success' : s === 'D' ? 'danger' : s === 'M' ? 'warning' : 'secondary';
    const canDiff = s === 'M' || s === 'A' || s === 'D';
    if (canDiff) {
        const filePath = ((gRoot as string) ?? '') + ((gPath as string) ?? '') + (fl.name ?? '');
        const escaped = filePath.replace(/'/g, "\\'");
        return `<span class="badge bg-${color} float-end" style="font-size:0.65rem;cursor:pointer;" onclick="event.stopPropagation();openVcsDiff('${escaped}')">${s}</span>`;
    }
    return `<span class="badge bg-${color} float-end" style="font-size:0.65rem;">${s}</span>`;
}

let index = 0;
var folderList = {"<>":"ul","class":"list-group","html":[] as any[]};
var fileList = {"<>":"ul","class":"list-group","html":[] as any[]};

// ---- 파일 항목 종류 분류 + 종류별 (아이콘 / 클릭 동작) 테이블 ----
type FileKind = 'folder'|'image'|'audio'|'video'|'soundlist'|'html'|'code'|'md'|'sheet'|'orm'|'file';
const EXT_KIND: Record<string, FileKind> = {
    png:'image', jpg:'image', jpeg:'image', bmp:'image',
    mp3:'audio', ogg:'audio',
    mp4:'video', mov:'video', avi:'video',
    soundlist:'soundlist', html:'html', md:'md',
    ts:'code', js:'code', txt:'code', json:'code',
    csv:'sheet', xlsx:'sheet', xls:'sheet',
    sqlite:'orm', db:'orm',
};
const FILE_ICON: Record<FileKind, string> = {
    folder:'bi-folder-fill', image:'bi-folder-image', audio:'bi-folder-music',
    video:'bi-folder-play', soundlist:'bi-flower1', html:'bi-file-earmark-code',
    code:'bi-file-code', md:'bi-file-earmark-text', sheet:'bi-file-earmark-spreadsheet',
    orm:'bi-file-earmark-binary', file:'bi-file',
};
// ".nedb"로 끝나는 폴더는 일반 폴더 탐색 대신 ORM 뷰어(ne 타입)로 연다.
// "db" 폴더 안의 .json 파일들은 CNe가 폴더 단위(mDatabase)로 컬렉션(파일)들을 묶어 다루므로,
// 개별 json을 코드뷰어 대신 ORM 뷰어(ne 타입, database=현재 폴더)로 연다.
const isDbFolder = () => {
    const trimmed = gPath.replace(/\/+$/, '');
    const last = trimmed.substring(trimmed.lastIndexOf('/') + 1);
    return last.toLowerCase() === 'db';
};
const kindOf = (fl: DirEntry): FileKind => {
    if (fl.file) {
        if (fl.ext === 'json' && isDbFolder()) return 'orm';
        return EXT_KIND[fl.ext] ?? 'file';
    }
    return fl.name.toLowerCase().endsWith('.nedb') ? 'orm' : 'folder';
};
// URL의 path 세그먼트만 encodeURIComponent 처리한다('/' 구분자는 유지).
// 파일명에 '#' 등 URL 특수문자가 있으면 인코딩 없이는 href/src에서 fragment로 잘려 서빙이 깨진다.
const encodeUrlPath = (p: string) => p.split('/').map(encodeURIComponent).join('/');
const downUrl = (fl: DirEntry) => gDown + encodeUrlPath(gPath + fl.name);
// 에디터(텍스트/HTML/시트)에서 저장 콜백 공용. base64를 그대로 업로드한다.
function saveEditedFile(filePath: string, base64: string) {
    const fileName = filePath.split('/').pop();
    CFecth.Exe(FileApiUrl("File/Upload"), FileParam({ path: gRoot + gPath, name: [fileName], data: [base64] }))
        .then(() => CAlert.Info('저장 완료'))
        .catch((e: any) => CAlert.E('저장 실패: ' + e.message));
}
const textToBase64 = (text: string) => btoa(unescape(encodeURIComponent(text)));

function addFolderTracks(fl: DirEntry) {
    const p2: any = { path: gPath + fl.name + "/" };
    if (RootPath) p2.RootPath = RootPath;
    CFecth.Exe(FileApiUrl("File/List"), FileParam(p2), "json").then((data: {"list","RootPath","path","RootUrl"}) => {
        CAlert.Info(gPath + fl.name + "추가");
        for (const fl2 of data.list as Array<DirEntry>) {
            if (fl.name == fl2.name) continue;
            if (fl2.ext == "mp3" || fl2.ext == "ogg")
                g_musicJBox.AddTrack(fl2.name, gDown + encodeUrlPath(gPath + fl.name + "/" + fl2.name));
        }
        g_musicJBox.Play(0);
    });
}

function openFolder(fl: DirEntry) {
    if (CDOM.IDValue("soundAddType") == "1") {
        addFolderTracks(fl);
    } else {
        FolderCD(gPath + fl.name + "/");
    }
}
function openImage(fl: DirEntry) {
    CDOM.ID("ImageModalSrc").hidden = false;
    (CDOM.ID("ImageModalSrc") as HTMLImageElement).src = downUrl(fl);
    CDOM.ID("VideoModalSrc").hidden = true;
    CDOM.ID("FileModalSrc").hidden = true;
    fl.open = true;
    RefreshOpen();
    g_contentJBox.Show();
}
function openAudio(fl: DirEntry) {
    if (CDOM.IDValue("soundAddType") == "1") {
        g_musicJBox.AddTrack(fl.name, downUrl(fl));
        CAlert.Info(fl.name + " 추가");
    } else {
        const names: string[] = [fl.name];
        const paths: string[] = [downUrl(fl)];
        for (const fl2 of gDirList) {
            if (fl.name == fl2.name) continue;
            if (fl2.ext == "mp3" || fl2.ext == "ogg") {
                const fp = gDown + encodeUrlPath(gPath + fl2.name);
                if (!paths.includes(fp)) { names.push(fl2.name); paths.push(fp); }
            }
        }
        g_musicJBox.SetList(names, paths);
        g_musicJBox.Play(0);
    }
    fl.open = true;
    RefreshOpen();
}
function openVideo(fl: DirEntry) {
    CDOM.ID("ImageModalSrc").hidden = true;
    (CDOM.ID("VideoModalSrc") as HTMLVideoElement).src = downUrl(fl);
    CDOM.ID("VideoModalSrc").hidden = false;
    CDOM.ID("FileModalSrc").hidden = true;
    fl.open = true;
    RefreshOpen();
    g_contentJBox.Show();
}
function openSoundList(fl: DirEntry) {
    const oReq = new XMLHttpRequest();
    oReq.onload = () => {
        if (oReq.status != 200) { CAlert.E("XMLHttpRequest error code" + oReq.status); return; }
        const d = oReq.response;
        g_musicJBox.SetList(d.name || [], d.fullPath || []);
        CAlert.Info("ListUp!");
    };
    oReq.open("GET", downUrl(fl));
    oReq.responseType = "json";
    oReq.send();
}
// g_fileEditorHost(Control 임베드)가 설정된 경우, 모나코 뷰어를 이 페이지에서 직접 열지 않고
// 'file-opened' postMessage로 부모(Control)에 위임한다. 위임했으면 true를 반환.
function tryNotifyEditorHost(path: string, url: string): boolean {
    if (!g_fileEditorHost || !window.top) return false;
    const baseUrl = g_fileWebRootUrl === CPath.WebRootUrl() ? '' : g_fileWebRootUrl;
    CIframeMsg.Send(window.top, 'file-opened', { path, baseUrl, url });
    return true;
}
function openHtml(fl: DirEntry) {
    const url = downUrl(fl);
    if (tryNotifyEditorHost(gRoot + gPath + fl.name, url)) return;
    const confirm = new CConfirm();
    confirm.SetBody("HTML 파일을 어떻게 열까요?");
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        () => { window.open(url, "_blank"); },
        () => { new CFileViewer([url], async (filePath, bufStr) => saveEditedFile(filePath, textToBase64(bufStr))).Open(); },
    ], ["New Window", "File Viewer"]);
    confirm.Open();
}
function openCode(fl: DirEntry) {
    const url = downUrl(fl);
    if (tryNotifyEditorHost(gRoot + gPath + fl.name, url)) return;
    new CFileViewer([url], async (filePath, bufStr) => saveEditedFile(filePath, textToBase64(bufStr))).Open();
}
function openMd(fl: DirEntry) {
    const url = downUrl(fl);
    if (tryNotifyEditorHost(gRoot + gPath + fl.name, url)) return;
    new CMDViewer(url);
}
function openSheet(fl: DirEntry) {
    new CSheetViewer([downUrl(fl)], async (filePath, base64) => saveEditedFile(filePath, base64)).Open();
}
// File/Memo 라우터와 동일하게, 현재 파일탭이 원격 서버에 접속된 상태면 ORM도 그 원격 서버(g_fileWebRootUrl)로 보낸다.
function openOrm(fl: DirEntry) {
    const remote = g_fileWebRootUrl !== CPath.WebRootUrl();
    const serverUrl = remote ? g_fileWebRootUrl : '';
    const token = remote ? GetFileToken() : '';
    if (fl.file) {
        if (fl.ext === 'json') new CORMViewer(new CAuthInfo(), "ne", gRoot + gPath, serverUrl, token).Open();
        else new CORMViewer(new CAuthInfo(), "sqlite", gRoot + gPath + fl.name, serverUrl, token).Open();
    } else {
        new CORMViewer(new CAuthInfo(), "ne", gRoot + gPath + fl.name + "/", serverUrl, token).Open();
    }
}
function openGenericFile(fl: DirEntry) {
    CDOM.ID("ImageModalSrc").hidden = true;
    (CDOM.ID("FileModalSrc") as HTMLLinkElement).href = downUrl(fl);
    CDOM.ID("VideoModalSrc").hidden = true;
    CDOM.ID("FileModalSrc").hidden = false;
    g_contentJBox.Show();
}
const FILE_OPEN: Record<FileKind, (fl: DirEntry) => void> = {
    folder: openFolder, image: openImage, audio: openAudio, video: openVideo,
    soundlist: openSoundList, html: openHtml, code: openCode, md: openMd,
    sheet: openSheet, orm: openOrm, file: openGenericFile,
};

// 꾹 누르면(롱프레스) 클릭 동작 대신: 파일은 다운로드 모달(openGenericFile), 폴더는 사운드 Add Each(addFolderTracks).
const LONG_PRESS_MS = 500;
function makeLongPressHandlers(fl: DirEntry, kind: FileKind) {
    let pressTimer: number | null = null;
    let longPressed = false;
    const start = () => {
        longPressed = false;
        pressTimer = window.setTimeout(() => {
            longPressed = true;
            if (fl.file) openGenericFile(fl);
            else addFolderTracks(fl);
        }, LONG_PRESS_MS);
    };
    const cancel = () => { if (pressTimer != null) { clearTimeout(pressTimer); pressTimer = null; } };
    const click = () => { if (longPressed) { longPressed = false; return; } FILE_OPEN[kind](fl); };
    return {
        onclick: click,
        onmousedown: start, onmouseup: cancel, onmouseleave: cancel,
        ontouchstart: start, ontouchend: cancel, ontouchcancel: cancel, ontouchmove: cancel,
    };
}

// URLSearchParams.set()은 form-urlencoded 규칙상 '/'까지 %2F로 인코딩해버려 주소창이 읽기 어려워진다.
// '/'는 쿼리 문자열에서 인코딩 없이 써도 유효한 문자라 그대로 둬도 파싱에 문제없으므로, 인코딩 후 %2F만 복원한다.
function encodeQueryValue(_value: string): string {
    return encodeURIComponent(_value).replace(/%2F/g, '/');
}

function updateFileUrlBar() {
    renderFileRootSelect();
    const input = document.getElementById('fileUrlInput') as HTMLInputElement | null;
    if (!input) return;
    const url = new URL(location.href);
    url.search = '';
    const params = [`path=${encodeQueryValue(gPath ?? '/')}`];
    if (RootPath) params.push(`RootPath=${encodeQueryValue(RootPath)}`);
    input.value = `${url.toString()}?${params.join('&')}`;
}

// 루트 선택 드롭다운(#fileRootSel, 상단 바) 관련: 옵션 계산 + 렌더 + 선택 적용을 File Manager 모달과 상단 바가 공용으로 쓴다.
function computeFileRootOpts(): { opts: Array<{path:string,name:string,url?:string}>, curIdx: number } {
    const _roots = (gRoots as Array<{path:string,name:string,url?:string}>) ?? [];
    // 설정 루트(맵 + 안티앨리싱) 경로를 텍스트로 통합
    const _opts: Array<{path:string,name:string,url?:string}> = [..._roots, { path: "./", name: "Artgine (WorkingPath)" }];
    // 현재 활성 항목 표시: 사용자가 마지막으로 클릭한 SelKey로 직접 매칭한다.
    // (RootPath는 서버 왕복 중 정규화되어 형태가 바뀌므로 비교 기준으로 쓰지 않는다.)
    let _curIdx = fileRootSelKey === 'workingpath'
        ? _opts.length - 1
        : (fileRootSelKey != null ? _roots.findIndex(r => r.path === fileRootSelKey) : -1);
    if (_curIdx < 0) {
        // SelKey 기록이 없는 최초 진입 등에는 RootPath로 추정한다.
        for (let i = _opts.length - 1; i >= 0; i--) {
            if (_opts[i].path === (RootPath || './')) { _curIdx = i; break; }
        }
    }
    if (_curIdx < 0) _curIdx = 0;
    return { opts: _opts, curIdx: _curIdx };
}

async function applyFileRootSelection(rootPath: string, rootUrl: string | undefined, selKey: string) {
    fileRootSelKey = selKey;
    RootUrl = rootUrl ?? null; // SyncFileRoot는 null을 무시하므로(부분 갱신용) 여기서 직접 초기화해야 이전 루트의 RootUrl이 남지 않는다.
    SyncFileRoot({ RootPath: rootPath || null, RootUrl: rootUrl ?? null });
    savePersistedFileRoot(rootPath || null, selKey);
    // 루트 리스트가 자기 url을 들고 오면 그대로 사용, 없으면(예: WorkingPath) 서버에서 받아온다.
    if (!rootUrl) await InitFileRoot();
    FolderCD("/");
}

let gFileRootOpts: Array<{path:string,name:string,url?:string}> = [];
function renderFileRootSelect() {
    const sel = document.getElementById('fileRootSel') as HTMLSelectElement | null;
    if (!sel) return;
    const { opts, curIdx } = computeFileRootOpts();
    gFileRootOpts = opts;
    sel.innerHTML = opts.map((r, i) => `<option value="${i}" ${i === curIdx ? 'selected' : ''}>${r.name}</option>`).join('');
}

function DirListRefresh()
{
    updateFileUrlBar();
    CDOM.ID("File_div").innerHTML="";
    CDOM.ID("Delete_div").innerHTML="";
    folderList={"<>":"ul","class":"list-group","html":[]};
    fileList={"<>":"ul","class":"list-group","html":[]};

    if(gPath!=null && gPath!="/")
    {
        folderList.html.push({"<>":"li","class":"list-group-item list-group-item-warning list-group-item-action","html":"<i class='bi bi-folder'></i> Root Folder",
            "onclick":()=>{FolderCD("/")},
        });
        let path=(gPath as string);
        let pos=path.lastIndexOf("/",path.length-2);
        let bpath=path.substr(0,pos);
        bpath+="/";
        folderList.html.push({"<>":"li","class":"list-group-item list-group-item-primary list-group-item-action","html":"<i class='bi bi-folder'></i> Parent Folder",
            "onclick":()=>{FolderCD(bpath)},
        });
    }

    for(let fl of gDirList as Array<{hidden:boolean,file:boolean,name:string,ext:string,open:boolean,index:number,Status?:string}>)
    {
        if(fl.hidden)   continue;
        fl.open=false;
        fl.index=index;
        index++;

        const kind = kindOf(fl);
        folderList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
            "html":`<i class='bi ${FILE_ICON[kind]}'>${fl.name}${vcsTag(fl)}`,
            ...makeLongPressHandlers(fl, kind)});

        if(fl.file==true)
        {
            fileList.html.push({"<>":"li","class":"list-group-item list-group-item-action","id":"fl"+fl.index,
                "html":`<i class='bi bi-file'>${fl.name}${vcsTag(fl)}`,"onclick":()=>Delete(fl.name)});
        }

    }

    CDOM.ID("File_div").append(CDOM.DataToDom(folderList));
    CDOM.ID("Delete_div").append(CDOM.DataToDom(fileList));
}

// F1 File Manager에서 마지막으로 고른 루트를 기억해뒀다가, URL 쿼리(path/RootPath)가 없는
// 일반 진입 시에는 그 값을 기본 선택으로 복원한다.
// RootUrl은 서버가 RootPath로부터 유도하는 파생값이라 여기서 따로 저장/전달하지 않는다.
const FILE_ROOT_KEY = 'artgine.fileRoot';
// SelKey: 사용자가 File Manager에서 실제로 클릭한 옵션의 식별자.
// 'workingpath'면 WorkingPath 항목, 그 외엔 설정 루트의 원본(미정규화) path 문자열.
// RootPath는 서버 왕복(File/Root, File/List)을 거치며 슬래시 정규화 등으로 형태가 바뀌므로,
// 그 값으로 드롭다운 선택을 역추정하면 다른 루트를 골라도 매칭이 깨진다. 그래서 SelKey를 따로 기억한다.
function loadPersistedFileRoot(): { RootPath: string | null, SelKey: string | null } {
    try {
        const v = JSON.parse(localStorage.getItem(FILE_ROOT_KEY) || '{}');
        return { RootPath: v.RootPath ?? null, SelKey: v.SelKey ?? null };
    } catch { return { RootPath: null, SelKey: null }; }
}
function savePersistedFileRoot(rootPath: string | null, selKey: string | null) {
    try { localStorage.setItem(FILE_ROOT_KEY, JSON.stringify({ RootPath: rootPath, SelKey: selKey })); } catch {}
}
const _persistedFileRoot = loadPersistedFileRoot();
let fileRootSelKey: string | null = _persistedFileRoot.SelKey;

let path=CUtilWeb.Parameter("path");
let RootPath=CUtilWeb.Parameter("RootPath") ?? _persistedFileRoot.RootPath;
let RootUrl: string | null = null; // File/Root, File/List 응답(SyncFileRoot)으로만 채워지는 파생값.

// Control.html이 iframe으로 열 때 자신의 현재 테마(light/dark)를 함께 넘겨준다.
// 값이 없으면(단독 접속 등) 기존과 동일하게 아무 것도 건드리지 않는다(기본 Bootstrap 라이트 모습).
const _fileTheme = CUtilWeb.Parameter("theme");
if (_fileTheme) document.documentElement.setAttribute('data-bs-theme', _fileTheme);
let g_fileWebRootUrl = CPath.WebRootUrl();

// Control.html이 iframe으로 열 때만 붙이는 값. 있으면 모나코로 열리는 파일(ts/js/html/txt 등)을
// 이 페이지 안의 모달로 열지 않고 'file-opened' postMessage를 부모(Control)로 보낸다.
const g_fileEditorHost = CUtilWeb.Parameter("editorHost");

let fileAuthed = !!getAuthToken(g_fileWebRootUrl);
function setFileAuthed(authed: boolean) {
    fileAuthed = authed;
    applyFileAuthIndicator(authed);
}

// ---- 파일 브라우저 상태 ----
interface DirEntry { hidden: boolean; file: boolean; name: string; ext: string; open: boolean; index: number; Status?: string; }
interface FileRoot { path: string; name: string; url?: string; }
let gPath = '/';                 // 현재 폴더 경로
let gRoot = '';                  // 루트 절대경로 prefix (RootPath)
let gDown = '';                  // 다운로드 베이스 URL
let gRoots: FileRoot[] = [];     // 선택 가능한 루트 목록
let gDirList: DirEntry[] = [];   // 현재 폴더의 항목 목록

const cachedDirList = CStorage.Get(path == null ? "root" : path);
if (cachedDirList != null) {
    gDirList = JSON.parse(cachedDirList);
    DirListRefresh();
}

function NormalizeWebRootUrl(url: string): string {
    return url.replace(/\/+$/, '') + '/';
}

function ResolveFileUrl(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith("http://") || url.startsWith("https://")) return url.replace(/\/+$/, '');
    return new URL(url, g_fileWebRootUrl).href.replace(/\/+$/, '');
}

function FileApiUrl(path: string): string {
    return g_fileWebRootUrl + path.replace(/^\/+/, '');
}

function GetFileToken(): string {
    return getAuthToken(g_fileWebRootUrl);
}

function SetFileToken(token: string) {
    setAuthToken(g_fileWebRootUrl, token);
}

// File/* 요청 본문에 토큰을 동봉한다. 다른 origin(원격 서버)으로 보내는 cross-origin
// fetch는 쿠키가 기본적으로 첨부되지 않으므로, 서버가 토큰 우선으로 인증할 수 있게 한다.
function FileParam(extra: object = {}): object {
    return { ...extra, token: GetFileToken() };
}

// 현재 접속된 서버 기준 Home.html URL(주소)을 재구성한다. RemoteCMDGuide.md의 `## 주소` 형식과 동일.
function BuildFileHomeUrl(): string {
    const base = g_fileWebRootUrl.replace(/\/+$/, '');
    let url = base + "/proj/Home/Home.html";
    const q: string[] = [];
    if (path)     q.push("path=" + encodeURIComponent(path));
    if (RootPath) q.push("RootPath=" + encodeURIComponent(RootPath));
    if (q.length) url += "?" + q.join("&");
    return url;
}

// RDP 사이드바에서 원격 서버로 전환되어 인증이 확인됐을 때(refreshFileAuthState) 호출된다.
// 그 원격 서버 자신에게 보내면 로컬 AI가 볼 수 없는 파일이 갱신되므로 의미가 없다 — g_fileWebRootUrl이 아니라 CPath.WebRootUrl()로 보낸다.
async function SendRemoteGuide(token: string) {
    try {
        await CFecth.Exe(CPath.WebRootUrl() + "RemoteCMD/Write", { addr: BuildFileHomeUrl(), token }, "json");
    } catch (e) {
        // 가이드 갱신 실패는 인증 흐름에 영향을 주지 않는다.
        console.error("RemoteCMD/Write update failed:", e);
    }
}

function SyncFileRoot(data: {RootPath?: string | null, RootUrl?: string | null, roots?: Array<{path:string,name:string,url?:string}>}) {
    if (data.RootPath != null) RootPath = data.RootPath;
    if (data.RootUrl != null) RootUrl = data.RootUrl;
    gRoot=(RootPath as string)?.replace(/\/+$/, '') ?? '';
    gDown=ResolveFileUrl(RootUrl);
    if (data.roots) gRoots=data.roots;
}

async function fileCheckAuth(): Promise<boolean> {
    const token = GetFileToken();
    if (!token) return false;
    try {
        const j = await CFecth.Exe(FileApiUrl("auth/check"), { token }, "json") as any;
        return !!j?.authed;
    } catch { return false; }
}

async function refreshFileAuthState() {
    const checkedWebRootUrl = g_fileWebRootUrl;
    const hasToken = !!GetFileToken();
    fileAuthed = hasToken;
    applyFileAuthIndicator(false);
    if (!hasToken) return;
    const valid = await fileCheckAuth();
    if (!valid) removeAuthToken(checkedWebRootUrl);
    if (checkedWebRootUrl !== g_fileWebRootUrl) return;
    setFileAuthed(valid);
    // RDP 사이드바에서 원격 서버로 전환해 인증이 확인된 시점에 가이드를 갱신한다(로컬 자기 자신은 대상이 아님).
    if (valid && checkedWebRootUrl !== CPath.WebRootUrl()) SendRemoteGuide(GetFileToken());
}

async function InitFileRoot() {
    const rootParam: any = {};
    if(RootPath) rootParam.RootPath = RootPath;
    const data = await CFecth.Exe(FileApiUrl("File/Root"), rootParam, "json") as {RootPath:string, RootUrl:string, roots:Array<{path:string,name:string,url?:string}>};
    SyncFileRoot(data);
}

async function FetchFileList(_path) {
    let fetchParam: any = {path:_path};
    if(RootPath) fetchParam.RootPath = RootPath;
    return await CFecth.Exe(FileApiUrl("File/List"), FileParam(fetchParam), "json") as {"list","RootPath","path","RootUrl"};
}

async function LoadFileList(_path) {
    const data = await FetchFileList(_path);
    CStorage.Set(_path==null?"root":_path,JSON.stringify(data.list));
    gDirList=data.list;
    SyncFileRoot(data);
    gPath=data.path;
    DirListRefresh();
}

function ParseFileHomeUrl(input: string): {webRootUrl:string, path:string, RootPath:string | null} {
    const u = new URL(input);
    const marker = "/proj/Home/Home.html";
    const homeIdx = u.pathname.indexOf(marker);
    const basePath = homeIdx >= 0 ? u.pathname.substring(0, homeIdx) : u.pathname;
    return {
        webRootUrl: NormalizeWebRootUrl(u.origin + (basePath || "/")),
        path: u.searchParams.get("path") || "/",
        RootPath: u.searchParams.get("RootPath"),
    };
}

async function ConnectFileHomeUrl(input?: string) {
    if (!input) {
        g_fileWebRootUrl = CPath.WebRootUrl();
        RootPath = null;
        RootUrl = null;
        path = "/";
    }
    else {
        const parsed = ParseFileHomeUrl(input);
        g_fileWebRootUrl = parsed.webRootUrl;
        RootPath = parsed.RootPath;
        RootUrl = null; // InitFileRoot()가 RootPath로부터 다시 받아온다.
        path = parsed.path;
    }

    try {
        await InitFileRoot();
    } catch (err) {
        throw err;
    }
    await LoadFileList(path);
    refreshFileAuthState();
    notifyRemoteChanged();
}
window["ConnectFileHomeUrl"] = ConnectFileHomeUrl;

{
    const fileHomeUrlParam = CUtilWeb.Parameter("FileHomeUrl");
    if (fileHomeUrlParam) {
        ConnectFileHomeUrl(fileHomeUrlParam);
    } else {
        // path/RootPath are already initialized from URL params above.
        // ConnectFileHomeUrl(undefined) would reset them to defaults, so call the init steps directly.
        (async () => {
            try { await InitFileRoot(); } catch {}
            await LoadFileList(path ?? '/');
            refreshFileAuthState();
            notifyRemoteChanged();
        })();
    }
}

{
    const _sd = CStorage.Get("SoundList");
    const _d = _sd ? JSON.parse(_sd) : {name:[] as string[], fullPath:[] as string[]};
    g_musicJBox = new CModalMusic(
        _d.name, _d.fullPath,
        (names, paths) => CStorage.Set("SoundList", JSON.stringify({name:names,fullPath:paths}))
    );
}

function FolderCD(_path, _onDone?: () => void)
{
    gPath=_path;
    FetchFileList(_path).then((data : {"list","RootPath","path","RootUrl"})=>{
        gDirList=data.list;
        SyncFileRoot(data);
        gPath=data.path;
        index=0;
        DirListRefresh();
        _onDone?.();
    });
}
window["FolderCD"]=FolderCD;

var g_fun="";
var g_data="";
var g_option="";
function Redirection(_multi : boolean)
{
    var form = CDOM.ID("ThisPage") as HTMLFormElement;
    form.setAttribute("charset", "UTF-8");
    form.setAttribute("method", "Post");
    // 원격 서버로 보낼 수도 있어 쿠키에 의존하지 않고 hidden input(token)으로 직접 인증한다.
    form.setAttribute("action", FileApiUrl("File/Redirection"));

    CDOM.IDValue("fun",g_fun);
    CDOM.IDValue("data",g_data);
    CDOM.IDValue("option",g_option);
    CDOM.IDValue("path",gPath);
    CDOM.IDValue("RootPath", RootPath ?? "");
    CDOM.IDValue("redirToken", GetFileToken());

    form.submit();
}
window["Redirection"]=Redirection;

var g_menuList={"<>":"div","class":"d-flex align-items-center p-1","html":[
    {"<>":"form","action":"FilePage.jsp","id":"ThisPage","name":"ThisPage","method":"post","accept-charset":"UTF-8","html":[
        {"<>":"input","type":"hidden","id":"fun","name":"fun"},
        {"<>":"input","type":"hidden","id":"data","name":"data"},
        {"<>":"input","type":"hidden","id":"option","name":"option"},
        {"<>":"input","type":"hidden","id":"path","name":"path"},
        {"<>":"input","type":"hidden","id":"RootPath","name":"RootPath"},
        {"<>":"input","type":"hidden","id":"redirToken","name":"token"},
    ]},
    {"<>":"input","type":"file","multiple":"multiple","id":"uploadBtn","name":"uploadBtn","style":"display:none"},
    {"<>":"div","class":"d-flex align-items-center gap-1","html":[
        {"<>":"button","type":"button","class":"btn btn-sm btn-primary","text":"Music","onclick":()=>{
            g_musicJBox.Show();
            g_musicJBox.SetPosition(CModal.ePos.Center);
        }},
        {"<>":"select","class":"form-select form-select-sm","id":"soundAddType","style":"width:128px;","html":[
            {"<>":"option","value":"0","text":"Add All"},
            {"<>":"option","value":"1","text":"Add Each (w/ Folder)"},
        ]},
        {"<>":"button","type":"button","class":"btn btn-sm btn-outline-info","html":"Search <span style='font-size:0.75em;opacity:0.7;'>F2</span>","onclick":()=>{FileSearch();}},
        {"<>":"button","type":"button","class":"btn btn-sm btn-outline-secondary","html":"File <span style='font-size:0.75em;opacity:0.7;'>F1</span>","onclick":()=>{FileBtn();}},
    ]},
]};

CDOM.ID("Menu_div").append(CDOM.DataToDom(g_menuList));

{
    const rootSel = document.getElementById('fileRootSel') as HTMLSelectElement | null;
    rootSel?.addEventListener('change', () => {
        const idx = parseInt(rootSel.value);
        const r = gFileRootOpts[idx];
        if (r) applyFileRootSelection(r.path, r.url, idx === gFileRootOpts.length - 1 ? 'workingpath' : r.path);
    });
}

{
    const copyBtn = document.getElementById('fileUrlCopyBtn');
    copyBtn?.addEventListener('click', async () => {
        const input = document.getElementById('fileUrlInput') as HTMLInputElement | null;
        if (!input?.value) return;
        try { await navigator.clipboard.writeText(input.value); }
        catch { input.select(); document.execCommand('copy'); }
        const icon = copyBtn.querySelector('i');
        if (!icon) return;
        icon.className = 'bi bi-clipboard-check';
        setTimeout(() => { icon.className = 'bi bi-clipboard'; }, 1500);
    });
}

async function FileBtn() {
    if (fileAuthed) {
        // 서버 토큰 유효성 검증 (서버 재시작 시 메모리 토큰 초기화됨)
        const valid = await fileCheckAuth();
        if (valid) {
            setFileAuthed(true);
            showFileAdminModal();
            return;
        }
        // 토큰 만료/무효 → 재인증 필요
        setFileAuthed(false);
    }
    promptFileAuth();
}
window["FileBtn"] = FileBtn;
window["PermissionBtn"] = FileBtn;

function showFileAdminModal() {
    const uid = Date.now();

    const modal = new CModal();
    modal.SetHeader("File Manager");
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetCloseToHide(false);
    modal.SetBody(`
        <div class="d-flex flex-column gap-2 p-2" style="width:100%;height:100%;box-sizing:border-box;overflow:hidden;">
            <div class="d-flex gap-1 align-items-center">
                <span class="small text-secondary flex-shrink-0" title="Find from current path"><i class="bi bi-folder2-open"></i> PathTo</span>
                <button id="fadm_chat_${uid}" class="btn btn-outline-primary btn-sm flex-fill">Chat</button>
                <button id="fadm_term_${uid}" class="btn btn-outline-success btn-sm flex-fill">Terminal</button>
                <button id="fadm_memo_${uid}" class="btn btn-outline-warning btn-sm flex-fill">Memo</button>
            </div>
            <hr class="my-0">
            <div class="accordion" id="fadm_acc_${uid}">
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button py-2 collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#fadm_file_actions_body_${uid}" aria-expanded="false" aria-controls="fadm_file_actions_body_${uid}">
                            File Actions
                        </button>
                    </h2>
                    <div id="fadm_file_actions_body_${uid}" class="accordion-collapse collapse" data-bs-parent="#fadm_acc_${uid}">
                        <div class="accordion-body d-flex flex-column gap-2 p-2">
<button id="fadm_folder_${uid}" class="btn btn-warning btn-sm">New Folder</button>
                            <button id="fadm_delete_${uid}" class="btn btn-danger btn-sm">Delete</button>
                            <button id="fadm_upload_${uid}" class="btn btn-primary btn-sm">Upload</button>
                            <button id="fadm_orm_${uid}" class="btn btn-outline-success btn-sm">ORM Viewer</button>
                        </div>
                    </div>
                </div>
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button py-2" type="button" data-bs-toggle="collapse" data-bs-target="#fadm_vcs_body_${uid}" aria-expanded="true" aria-controls="fadm_vcs_body_${uid}">
                            Version Control
                        </button>
                    </h2>
                    <div id="fadm_vcs_body_${uid}" class="accordion-collapse collapse show" data-bs-parent="#fadm_acc_${uid}">
                        <div class="accordion-body d-flex flex-column gap-2 p-2">
                            <button id="fadm_vcs_diff_${uid}" class="btn btn-outline-secondary btn-sm w-100">Diff</button>
                            <button id="fadm_vcs_update_${uid}" class="btn btn-outline-primary btn-sm w-100">Update</button>
                            <button id="fadm_vcs_add_${uid}" class="btn btn-outline-info btn-sm w-100">Add (SVN)</button>
                            <button id="fadm_vcs_revert_${uid}" class="btn btn-outline-warning btn-sm w-100">Revert</button>
                            <button id="fadm_vcs_commit_${uid}" class="btn btn-outline-success btn-sm w-100">Commit & Push</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
document.getElementById(`fadm_folder_${uid}`)?.addEventListener('click', () => {
            modal.Hide(); CreateFolder();
        });
        document.getElementById(`fadm_delete_${uid}`)?.addEventListener('click', () => {
            openDeleteModal();
        });
        document.getElementById(`fadm_upload_${uid}`)?.addEventListener('click', () => {
            modal.Hide(); (CDOM.ID("uploadBtn") as HTMLInputElement).click();
        });
        document.getElementById(`fadm_orm_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            const remote = isRemoteServer();
            new CORMViewer(new CAuthInfo(), null, '', remote ? g_fileWebRootUrl : '', remote ? GetFileToken() : '').Open();
        });
        // RootUrl은 "로컬 리소스 루트 선택"에도 채워지므로 원격 판단 기준으로 쓰면 안 된다.
        // 진짜 원격 서버 접속 여부는 g_fileWebRootUrl이 로컬 WebRootUrl과 다른지로만 판별한다.
        const isRemoteServer = () => g_fileWebRootUrl !== CPath.WebRootUrl();
        document.getElementById(`fadm_chat_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            const cwd = isRemoteServer() ? '' : ((gRoot as string) ?? '') + ((gPath as string) ?? '');
            if (window.top) CIframeMsg.Send(window.top, 'open-chat', { cwd: cwd || undefined });
        });
        document.getElementById(`fadm_term_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            const cwd = isRemoteServer() ? '' : ((gRoot as string) ?? '') + ((gPath as string) ?? '');
            if (window.top) CIframeMsg.Send(window.top, 'open-term', { cwd: cwd || undefined });
        });
        document.getElementById(`fadm_memo_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            // Chat/Terminal과 달리 Memo는 원격 서버 자체로 API 호출이 넘어가므로, 원격일 때도 그 서버 기준 경로(gRoot+gPath)를 그대로 보내면 된다.
            const cwd = ((gRoot as string) ?? '') + ((gPath as string) ?? '');
            if (window.top) CIframeMsg.Send(window.top, 'open-memo', { folder: cwd });
        });

        const vcsPath = () => ((gRoot as string) ?? './') + ((gPath as string) ?? '');

        document.getElementById(`fadm_vcs_diff_${uid}`)?.addEventListener('click', () => openVcsDiff(vcsPath()));
        document.getElementById(`fadm_vcs_update_${uid}`)?.addEventListener('click', async () => {
            const res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam({ action: "update", path: vcsPath() }), "json") as any;
            const revLine = res.revision ? `<br><b>Revision: ${res.revision}</b>` : '';
            const msgBody = res.msg ? res.msg.replace(/\n/g, '<br>') : (res.ok ? 'Update complete' : 'Update failed');
            CAlert.Info(msgBody + revLine);
            if (res.ok) FolderCD(gPath);
        });
        document.getElementById(`fadm_vcs_add_${uid}`)?.addEventListener('click', () => openVcsModal('add', vcsPath()));
        document.getElementById(`fadm_vcs_revert_${uid}`)?.addEventListener('click', () => openVcsModal('revert', vcsPath()));
        document.getElementById(`fadm_vcs_commit_${uid}`)?.addEventListener('click', () => openVcsModal('commit', vcsPath()));
    }, MODAL_DOM_DELAY);
}
window["showFileAdminModal"] = showFileAdminModal;

type ActionItem = {badge?:string, badgeClass?:string, icon?:string, label:string, value:string, checked?:boolean};
type ActionRunFn = (values: string[], message?: string) => Promise<{result: string, refresh?: boolean}>;
type ActionItemDblClickFn = (item: ActionItem) => void;

function openActionModal(
    title: string,
    runLabel: string,
    runClass: string,
    onRun: ActionRunFn,
    hasMessage = false,
    fetchItems?: () => Promise<ActionItem[]>,
    staticItems?: ActionItem[],
    onItemDblClick?: ActionItemDblClickFn
) {
    const uid = Date.now();
    const hasFetch = !!fetchItems;

    const modal = new CModal();
    modal.SetHeader(title);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetBody(`
        <div class="d-flex flex-column gap-2 p-1" style="width:380px;height:480px;overflow:hidden;">
            ${hasFetch ? `
            <div class="d-flex gap-2 align-items-center flex-shrink-0">
                ${hasMessage ? `<input id="am_msg_${uid}" type="text" class="form-control form-control-sm flex-fill" placeholder="Commit message...">` : ''}
                <button id="am_refresh_${uid}" class="btn btn-outline-secondary btn-sm flex-shrink-0"><i class="bi bi-arrow-clockwise"></i></button>
            </div>` : hasMessage ? `<input id="am_msg_${uid}" type="text" class="form-control form-control-sm flex-shrink-0" placeholder="Commit message...">` : ''}
            <div id="am_list_${uid}" class="border rounded p-1 flex-fill" style="overflow-y:auto;min-height:0;">
                ${hasFetch ? '<span class="text-secondary">Loading...</span>' : ''}
            </div>
            <div class="d-flex gap-1 flex-shrink-0">
                <button id="am_all_${uid}" class="btn btn-outline-secondary btn-sm">Select All</button>
                <button id="am_run_${uid}" class="btn ${runClass} btn-sm flex-fill">${runLabel}</button>
            </div>
            <pre id="am_result_${uid}" class="p-2 rounded bg-body-secondary small mb-0 flex-shrink-0" style="display:none;max-height:120px;overflow-y:auto;white-space:pre-wrap;"></pre>
        </div>
    `);
    modal.Open(CModal.ePos.Center);

    const listEl   = document.getElementById(`am_list_${uid}`)!;
    const resultEl = document.getElementById(`am_result_${uid}`)!;
    const allBtn   = document.getElementById(`am_all_${uid}`)!;
    const runBtn   = document.getElementById(`am_run_${uid}`)!;
    const msgEl    = document.getElementById(`am_msg_${uid}`) as HTMLInputElement | null;

    let currentItems: ActionItem[] = [];
    const renderItems = (items: ActionItem[] | undefined) => {
        if (!items || items.length === 0) { listEl.innerHTML = '<span class="text-secondary">No items</span>'; return; }
        currentItems = items;
        listEl.innerHTML = items.map((i, idx) => `
            <div class="d-flex align-items-center gap-1 py-1" data-action-idx="${idx}">
                <input type="checkbox" class="form-check-input am-chk-${uid}" value="${i.value}" ${i.checked !== false ? 'checked' : ''}>
                ${i.badge ? `<span class="badge bg-${i.badgeClass ?? 'secondary'}" style="font-size:0.65rem;min-width:1.4rem;">${i.badge}</span>` : ''}
                ${i.icon  ? `<i class="bi ${i.icon}"></i>` : ''}
                <span class="text-truncate mb-0 flex-fill" title="${i.label}">${i.label}</span>
            </div>`).join('');
        if (onItemDblClick) {
            listEl.querySelectorAll<HTMLElement>('[data-action-idx]').forEach(row => {
                row.addEventListener('dblclick', () => {
                    const item = currentItems[parseInt(row.dataset.actionIdx ?? '-1')];
                    if (item) onItemDblClick(item);
                });
            });
        }
    };

    const refresh = async () => {
        if (!fetchItems) return;
        listEl.innerHTML = '<span class="text-secondary">Loading...</span>';
        resultEl.style.display = 'none';
        renderItems(await fetchItems());
    };

    if (fetchItems) refresh();
    else renderItems(staticItems);

    document.getElementById(`am_refresh_${uid}`)?.addEventListener('click', refresh);

    allBtn.addEventListener('click', () => {
        const chks = listEl.querySelectorAll<HTMLInputElement>(`.am-chk-${uid}`);
        const allChecked = Array.from(chks).every(c => c.checked);
        chks.forEach(c => c.checked = !allChecked);
    });

    runBtn.addEventListener('click', async () => {
        const values = Array.from(listEl.querySelectorAll<HTMLInputElement>(`.am-chk-${uid}`))
            .filter(c => c.checked).map(c => c.value);
        if (values.length === 0) { CAlert.Info('No items selected'); return; }
        if (hasMessage && !msgEl?.value.trim()) { CAlert.Info('Please enter a message'); return; }

        runBtn.setAttribute('disabled', '');
        resultEl.style.display = '';
        resultEl.textContent = 'Processing...';
        const { result, refresh: doRefresh } = await onRun(values, msgEl?.value.trim());
        resultEl.textContent = result;
        runBtn.removeAttribute('disabled');
        if (doRefresh) refresh();
    });
}

function openVcsModal(action: 'add' | 'revert' | 'commit', path: string) {
    const statusColor = (s: string) => s === 'M' ? 'warning' : s === 'A' ? 'success' : s === 'D' ? 'danger' : 'secondary';
    const title = action === 'commit' ? 'Commit & Push' : action === 'revert' ? 'Revert' : 'Add';
    const runLabel = action === 'commit' ? 'Commit & Push' : action === 'revert' ? 'Revert' : 'Add';
    const runClass = action === 'commit' ? 'btn-success' : action === 'revert' ? 'btn-warning' : 'btn-info';
    const diffPath = (file: string) => {
        const normalized = file.replace(/\\/g, '/');
        if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith('/')) return normalized;
        return (path.replace(/\\/g, '/').replace(/\/?$/, '/') + normalized).replace(/\/+/g, '/');
    };
    openActionModal(
        title,
        runLabel,
        runClass,
        async (files, message) => {
            const param: any = { action, path, files };
            if (action === 'commit') param.message = message;
            const res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam(param), "json") as any;
            if (res.ok) FolderCD(gPath);
            return { result: res.msg || (res.ok ? 'Done' : 'Failed'), refresh: res.ok };
        },
        action === 'commit',
        async () => {
            const res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam({ action: "status", path }), "json") as any;
            if (!res.ok) return [];
            const items = res.items as {status: string, file: string}[];
            // SVN의 '?'(미버전) 파일은 svn add 전엔 커밋 대상이 아니므로 commit 목록에서 제외
            const filtered = action === 'add'
                ? items.filter(i => i.status === '?')
                : (action === 'commit' && res.vcs === 'svn')
                    ? items.filter(i => i.status !== '?')
                    : items;
            return filtered.map(i => ({ badge: i.status, badgeClass: statusColor(i.status), label: i.file, value: i.file, checked: true }));
        },
        undefined,
        action === 'add' ? undefined : item => openVcsDiff(diffPath(item.value))
    );
}

async function openVcsDiff(filePath: string) {
    let res: any;
    try {
        res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam({ action: "diff", path: filePath }), "json");
    } catch (e) {
        CAlert.Info("Diff request failed"); return;
    }
    if (!res?.ok) { CAlert.Info(res?.msg || "Diff failed"); return; }

    // 라인번호 td가 position:absolute라 스크롤 영역 내에 기준(position:relative)이 필요.
    // 없으면 세로 스크롤 시 코드만 움직이고 라인번호가 안 따라가서 1픽셀만 주입.
    if (!document.getElementById("vcs-diff-style")) {
        const st = document.createElement("style");
        st.id = "vcs-diff-style";
        st.textContent = "#vcs-diff-view .d2h-code-wrapper{position:relative;}";
        document.head.appendChild(st);
    }

    const modal = new CModal();
    modal.SetHeader(`Diff: ${filePath.replace(/\/+$/, '').split('/').pop() || filePath}`);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetBody(`<div id="vcs-diff-view"></div>`);
    modal.SetSize(860, 580);
    modal.Open(CModal.ePos.Center);

    setTimeout(() => {
        const el = document.getElementById("vcs-diff-view");
        if (!el) return;
        const D2H = (window as any).Diff2HtmlUI;
        if (!D2H) { el.textContent = "diff2html not loaded"; return; }
        const cfg = { drawFileList: false, matching: "lines", outputFormat: "line-by-line", highlight: false, stickyFileHeaders: false };
        new D2H(el, res.diff, cfg).draw();
    }, MODAL_DOM_DELAY);
}
window["openVcsDiff"] = openVcsDiff;

function openDeleteModal() {
    const dirList = (gDirList as Array<{file:boolean, name:string, hidden?:boolean}>) ?? [];
    openActionModal(
        'Delete',
        'Delete',
        'btn-danger',
        async (names) => {
            const lines: string[] = [];
            for (const name of names) {
                const param: any = { data: gPath + name };
                if (RootPath) param.RootPath = RootPath;
                const res = await CFecth.Exe(FileApiUrl("File/Delete"), FileParam(param), "json") as any;
                lines.push(`${res.ok ? 'OK' : 'FAIL'} ${name}`);
            }
            FolderCD(gPath);
            return { result: lines.join('\n') };
        },
        false,
        undefined,
        dirList
            .filter(fl => !fl.hidden)
            .map(fl => ({ icon: fl.file ? 'bi-file' : 'bi-folder-fill', label: fl.name, value: fl.name, checked: false }))
    );
}

function CreateFolder()
{
    let confirm=new CConfirm();
    confirm.SetBody('Enter folder name:<br><input type="text" id="CreateFolder" class="form-control form-control-sm" value="New Folder">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
    async ()=> {
        const folderName = CDOM.IDValue("CreateFolder");
        const data = gPath + folderName;
        const param: any = { data };
        if (RootPath) param.RootPath = RootPath;
        const j = await CFecth.Exe(FileApiUrl("File/Mkdir"), FileParam(param), "json") as any;
        if (j?.ok) FolderCD(gPath);
        else CAlert.E("폴더 생성 실패");
    },
    ()=> {},
    ],["Yes","No"])
    confirm.Open();
}
window["CreateFolder"]=CreateFolder;
function Delete(_file)
{
    g_fun="Delete";
    g_data=gPath+_file;
    Redirection(false);
}
window["Delete"]=Delete;

type SrchFile = {hidden:boolean,file:boolean,name:string,ext:string};
const SEARCH_EXCLUDE_DIRS = ['node_modules'];
const isSearchExcluded = (name: string) => name.startsWith('.') || SEARCH_EXCLUDE_DIRS.includes(name);
// 서버 루트 단위로 캐시 유지 — 경로가 바뀌어도 유지, 해당 subtree 항목만 활용
let g_srchCache: Map<string, SrchFile[]> = new Map(); // dirPath -> fileList
let g_srchServerKey = '';

async function FileSearch() {
    let searchCancelled = false;
    const uid = Date.now();

    const modal = new CModal();
    modal.SetHeader("File Search");
    modal.SetBody(`
        <div class="d-flex gap-2 mb-2">
            <input type="text" id="srchInput_${uid}" class="form-control form-control-sm" placeholder="Filename (partial match)...">
            <button id="srchBtn_${uid}" class="btn btn-sm btn-primary">Search</button>
            <button id="srchStop_${uid}" class="btn btn-sm btn-outline-danger" style="display:none;">Stop</button>
        </div>
        <div id="srchStatus_${uid}" class="small text-secondary mb-1" style="min-height:1.2em;"></div>
        <div id="srchResults_${uid}" class="list-group" style="max-height:360px;overflow-y:auto;font-size:13px;"></div>
    `);
    modal.SetTitle(CModal.eTitle.TextClose);
    modal.SetSize(520, 520);
    modal.Open(CModal.ePos.Center);

    await new Promise<void>(r => setTimeout(r, MODAL_DOM_DELAY));

    const input   = document.getElementById(`srchInput_${uid}`)  as HTMLInputElement;
    const btn     = document.getElementById(`srchBtn_${uid}`)    as HTMLButtonElement;
    const stopBtn = document.getElementById(`srchStop_${uid}`)   as HTMLButtonElement;
    const status  = document.getElementById(`srchStatus_${uid}`) as HTMLElement;
    const results = document.getElementById(`srchResults_${uid}`) as HTMLElement;

    const makeItem = (fl: SrchFile, dirPath: string) => {
        const item = document.createElement('div');
        item.className = 'list-group-item list-group-item-action py-1 px-2';
        const icon = fl.file ? 'bi-file-earmark' : 'bi-folder-fill text-warning';
        item.innerHTML =
            `<i class="bi ${icon} me-1"></i><strong>${fl.name}</strong>` +
            `<span class="text-muted ms-2" style="font-size:11px;">${dirPath}</span>`;
        if (fl.file) {
            item.addEventListener('click', () => {
                modal.Hide();
                FolderCD(dirPath);
                const url = gDown + encodeUrlPath(dirPath + fl.name);
                if (tryNotifyEditorHost(gRoot + dirPath + fl.name, url)) return;
                new CFileViewer([url], async (filePath, bufStr) => saveEditedFile(filePath, textToBase64(bufStr))).Open();
            });
        } else {
            item.addEventListener('click', () => { FolderCD(dirPath + fl.name + '/'); });
        }
        return item;
    };

    const keyOf = (dirPath: string, name: string) => dirPath + ' ' + name;

    // shown: 이번 검색에서 이미 렌더링한 (dirPath, name) 키 집합 — 캐시 표시분과 스캔 결과가 중복 렌더링되지 않게 함.
    const renderFromCache = (startPath: string, query: string, shown: Set<string>) => {
        let found = 0;
        for (const [dirPath, list] of g_srchCache) {
            if (!dirPath.startsWith(startPath)) continue;
            for (const fl of list) {
                if (fl.hidden || isSearchExcluded(fl.name)) continue;
                if (fl.name.toLowerCase().includes(query)) {
                    const key = keyOf(dirPath, fl.name);
                    if (shown.has(key)) continue;
                    shown.add(key);
                    results.appendChild(makeItem(fl, dirPath));
                    if (++found >= 200) return found;
                }
            }
        }
        return found;
    };

    const doSearch = async () => {
        const query = input.value.trim().toLowerCase();
        if (!query) return;

        const startPath = gPath ?? "/";
        const serverKey = RootPath ?? '';
        if (g_srchServerKey !== serverKey) { g_srchCache = new Map(); g_srchServerKey = serverKey; }

        searchCancelled = false;
        btn.disabled = true;
        stopBtn.style.display = '';
        results.innerHTML = '';

        // 캐시에 남아있는 이전 검색 결과를 스캔 시작 전에 즉시 보여준다.
        const shown = new Set<string>();
        let found = renderFromCache(startPath, query, shown);
        status.textContent = found > 0 ? `Cached: ${found} result(s)... Scanning` : 'Scanning...';

        const queue: string[] = [startPath];
        while (queue.length > 0 && !searchCancelled) {
            const dirPath = queue.shift()!;
            status.textContent = `Scanning: ${dirPath}`;
            try {
                let p2: any = { path: dirPath };
                if (RootPath) p2.RootPath = RootPath;
                const data = await CFecth.Exe(FileApiUrl("File/List"), FileParam(p2), "json") as { list: Array<SrchFile> };
                g_srchCache.set(dirPath, data.list);
                for (const fl of data.list) {
                    if (!fl.hidden && !fl.file && !isSearchExcluded(fl.name)) queue.push(dirPath + fl.name + '/');
                    if (!fl.hidden && fl.name.toLowerCase().includes(query) && found < 200) {
                        const key = keyOf(dirPath, fl.name);
                        if (shown.has(key)) continue;
                        shown.add(key);
                        results.appendChild(makeItem(fl, dirPath));
                        found++;
                    }
                }
            } catch (_) {}
        }

        const cap = found >= 200 ? ' (capped at 200)' : '';
        status.textContent = searchCancelled ? `Stopped. (${found} result(s))` : found === 0 ? 'No results.' : `${found} result(s)${cap}`;
        btn.disabled = false;
        stopBtn.style.display = 'none';
    };

    stopBtn.addEventListener('click', () => { searchCancelled = true; });
    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') doSearch(); });
    input.focus();
}
window["FileSearch"] = FileSearch;

CDOM.ID("uploadBtn").onchange=async (e)=>{

    var fi=e.target as HTMLInputElement;
    const path=gRoot+gPath;

    // arrayBuffer() 대신 FileReader 사용: iOS Safari에서 대용량 파일 안정성이 높음
    const readAsBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // data:image/jpeg;base64,XXX -> XXX
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

    for(let i=0;i<fi.files.length;++i)
    {
        try {
            const name=fi.files[i].name;
            const data=await readAsBase64(fi.files[i]);
            await CFecth.Exe(FileApiUrl("File/Upload"), FileParam({data:[data],name:[name],path}));
        } catch(err: any) {
            CAlert.E('Upload failed: ' + (err?.message ?? String(err)));
            return;
        }
    }
    Redirection(true);

};

function SoundPlayListSave()
{
    let confirm=new CConfirm();
    confirm.SetBody('Enter file name to save:<br><input type="text" id="soundListSave" class="form-control form-control-sm" value="basic">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo,[
    ()=> {
        g_fun="SoundPlayListSave";
        g_data=JSON.stringify({name:g_musicJBox.Names,fullPath:g_musicJBox.Paths});
        g_option=CDOM.IDValue("soundListSave");
        Redirection(false);
    },
    ()=> {

    },
    ],["Yes","No"])
    confirm.Open();
}
window["SoundPlayListSave"]=SoundPlayListSave;

function RefreshOpen()
{
    for(let fl of gDirList as Array<{hidden:boolean,file:boolean,name:string,ext:string,open:boolean,index:number,Status?:string}>)
    {
        if(fl.index==null)  continue;
        if(fl.open==false)
        {
            CDOM.ID("fl"+fl.index).className="list-group-item list-group-item-action";
        }
        else
        {
            CDOM.ID("fl"+fl.index).className="list-group-item list-group-item-action list-group-item-secondary";
        }
    }
}
window["RefreshOpen"]=RefreshOpen;
function NextPhoto()
{
    for(let fl of gDirList as Array<{hidden:boolean,file:boolean,name:string,ext:string,open:boolean,index:number,Status?:string}>)
    {
        if(fl.open==false)
        {
            CDOM.ID("fl"+fl.index).className="list-group-item list-group-item-action list-group-item-secondary";
            fl.open=true;
            if(fl.ext=="png" || fl.ext=="jpg" || fl.ext=="jpeg" || fl.ext=="bmp")
            {
                CDOM.ID("ImageModalSrc").hidden=false;
                (CDOM.ID("ImageModalSrc") as HTMLImageElement).src=gDown+encodeUrlPath(gPath+fl.name);
                CDOM.ID("VideoModalSrc").hidden=true;
                CDOM.ID("FileModalSrc").hidden=true;
            }
            else if(fl.ext=="mp4" || fl.ext=="mov" || fl.ext=="avi")
            {
                CDOM.ID("ImageModalSrc").hidden=true;
                (CDOM.ID("VideoModalSrc") as HTMLVideoElement).src=gDown+encodeUrlPath(gPath+fl.name);
                CDOM.ID("VideoModalSrc").hidden=false;
                CDOM.ID("FileModalSrc").hidden=true;
            }
            return;
        }

    }
    CAlert.Info("더 이상 없습니다.");
}
window["NextPhoto"]=NextPhoto;

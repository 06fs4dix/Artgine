import { CModal, CConfirm } from "../../basic/CModal.js";
import { CAlert } from "../../basic/CAlert.js";
import { CDOM } from "../../basic/CDOM.js";
import { CHash } from "../../basic/CHash.js";
import { CFecth } from "../../network/CFecth.js";
import { CPath } from "../../basic/CPath.js";
import { CStorage } from "../../system/CStorage.js";
import { CUtilWeb } from "../../util/CUtilWeb.js";
import { getAuthToken, setAuthToken, removeAuthToken, authLogin } from "../CAuthToken.js";
import { CFileViewer, CMDViewer, CSheetViewer, CModalMusic, CORMViewer } from "../../util/CModalUtil.js";
import { CAuthInfo } from "../../network/CAuthInfo.js";
import { CIframeMsg } from "./CIframeMsg.js";
const MODAL_DOM_DELAY = 100;
const DEFAULT_AUTH_PASSWORD = 'artgine';
function warnIfDefaultAuthPassword(pw) {
    if (pw === DEFAULT_AUTH_PASSWORD)
        CAlert.E("Please change the default password.");
}
document.addEventListener('keydown', (ev) => {
    if (ev.key === 'F1' || ev.key === 'F2' || ev.key === 'F3' || ev.key === 'F4' || ev.key === 'F7') {
        ev.preventDefault();
        if (window.top)
            CIframeMsg.Send(window.top, 'home-hotkey', { key: ev.key });
    }
});
CIframeMsg.Recv({
    'connect-remote': (data) => ConnectFileHomeUrl(String(data.url ?? '') || undefined),
    'trigger-file-btn': () => FileBtn(),
    'trigger-file-search': () => FileSearch(),
    'local-auth-updated': () => refreshFileAuthState(),
    'set-file-root': (data) => applyFileRootSelection(String(data.path ?? ''), data.url ? String(data.url) : undefined, String(data.selKey ?? data.path ?? '')),
});
function notifyRemoteChanged() {
    const baseUrl = g_fileWebRootUrl === CPath.WebRootUrl() ? '' : g_fileWebRootUrl;
    const token = baseUrl ? getAuthToken(baseUrl) : '';
    if (window.top)
        CIframeMsg.Send(window.top, 'file-remote-changed', { baseUrl, token });
}
function promptFileAuth(onSuccess) {
    const dlg = new CConfirm();
    dlg.SetBody('Enter admin password:<br><input type="password" id="AuthPassword" class="form-control form-control-sm">');
    const doAuth = () => {
        const pw = CDOM.IDValue("AuthPassword");
        authLogin(g_fileWebRootUrl, CHash.SHA256('artgine_' + pw), () => { CAlert.Info("Waiting for messenger approval (up to 5 minutes)..."); }).then(async (j) => {
            if (j.ok) {
                SetFileToken(j.token);
                await refreshFileAuthState();
                if (g_fileWebRootUrl === CPath.WebRootUrl() && window.top)
                    CIframeMsg.Send(window.top, 'local-auth-succeeded');
                CAlert.Info("Permission granted");
                warnIfDefaultAuthPassword(pw);
                onSuccess?.();
            }
            else {
                CAlert.E("Wrong password: " + (j.msg ?? ""));
            }
        }).catch(() => { CAlert.E("Server error"); });
    };
    dlg.SetConfirm(CConfirm.eConfirm.YesNo, [
        doAuth,
        () => { },
    ], ["OK", "Cancel"]);
    dlg.Open();
    setTimeout(() => {
        const input = CDOM.ID("AuthPassword");
        input?.focus();
        input?.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter')
                return;
            e.preventDefault();
            doAuth();
            dlg.Close();
        });
    }, MODAL_DOM_DELAY);
}
function installFileAuthIndicatorStyle() {
}
const FILE_LIST_AUTHED_CLASS = 'file-list-authed';
function applyFileAuthIndicator(authed) {
    const urlBar = document.getElementById('fileUrlBar');
    if (!urlBar)
        return;
    urlBar.classList.toggle(FILE_LIST_AUTHED_CLASS, authed);
    urlBar.title = authed ? 'File admin authenticated' : '';
}
installFileAuthIndicatorStyle();
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
var g_musicJBox;
function vcsTag(fl) {
    const s = fl.Status;
    if (!s)
        return '';
    const color = s === 'A' ? 'success' : s === 'D' ? 'danger' : s === 'M' ? 'warning' : 'secondary';
    const canDiff = s === 'M' || s === 'A' || s === 'D';
    if (canDiff) {
        const filePath = (gRoot ?? '') + (gPath ?? '') + (fl.name ?? '');
        const escaped = filePath.replace(/'/g, "\\'");
        return `<span class="badge bg-${color} float-end" style="font-size:0.65rem;cursor:pointer;" onclick="event.stopPropagation();openVcsDiff('${escaped}')">${s}</span>`;
    }
    return `<span class="badge bg-${color} float-end" style="font-size:0.65rem;">${s}</span>`;
}
let index = 0;
var folderList = { "<>": "ul", "class": "list-group", "html": [] };
var fileList = { "<>": "ul", "class": "list-group", "html": [] };
const EXT_KIND = {
    png: 'image', jpg: 'image', jpeg: 'image', bmp: 'image',
    mp3: 'audio', ogg: 'audio',
    mp4: 'video', mov: 'video', avi: 'video',
    soundlist: 'soundlist',
    html: 'html', htm: 'html', shtml: 'html', xhtml: 'html',
    md: 'md', markdown: 'md', mdown: 'md', mkdn: 'md', mkd: 'md', mdwn: 'md', mdtxt: 'md', mdtext: 'md',
    csv: 'sheet', xlsx: 'sheet', xls: 'sheet',
    sqlite: 'orm', db: 'orm',
};
const FILE_ICON = {
    folder: 'bi-folder-fill', image: 'bi-folder-image', audio: 'bi-folder-music',
    video: 'bi-folder-play', soundlist: 'bi-flower1', html: 'bi-file-earmark-code',
    code: 'bi-file-code', md: 'bi-file-earmark-text', sheet: 'bi-file-earmark-spreadsheet',
    orm: 'bi-file-earmark-binary', file: 'bi-file',
};
const isDbFolder = () => {
    const trimmed = gPath.replace(/\/+$/, '');
    const last = trimmed.substring(trimmed.lastIndexOf('/') + 1);
    return last.toLowerCase() === 'db';
};
const kindOf = (fl) => {
    if (fl.file) {
        if (fl.ext === 'json' && isDbFolder())
            return 'orm';
        const special = EXT_KIND[fl.ext];
        if (special)
            return special;
        if (CUtilWeb.IsMonacoSourceExt(fl.ext))
            return 'code';
        return 'file';
    }
    return fl.name.toLowerCase().endsWith('.nedb') ? 'orm' : 'folder';
};
const encodeUrlPath = (p) => p.split('/').map(encodeURIComponent).join('/');
const downUrl = (fl) => gDown + encodeUrlPath(gPath + fl.name);
function saveEditedFile(filePath, base64) {
    const fileName = filePath.split('/').pop();
    CFecth.Exe(FileApiUrl("File/Upload"), FileParam({ path: gRoot + gPath, name: [fileName], data: [base64] }))
        .then(() => CAlert.Info('저장 완료'))
        .catch((e) => CAlert.E('저장 실패: ' + e.message));
}
const textToBase64 = (text) => btoa(unescape(encodeURIComponent(text)));
function addFolderTracks(fl) {
    const p2 = { path: gPath + fl.name + "/" };
    if (RootPath)
        p2.RootPath = RootPath;
    CFecth.Exe(FileApiUrl("File/List"), FileParam(p2), "json").then((data) => {
        CAlert.Info(gPath + fl.name + "추가");
        for (const fl2 of data.list) {
            if (fl.name == fl2.name)
                continue;
            if (fl2.ext == "mp3" || fl2.ext == "ogg")
                g_musicJBox.AddTrack(fl2.name, gDown + encodeUrlPath(gPath + fl.name + "/" + fl2.name));
        }
        g_musicJBox.Play(0);
    });
}
function openFolder(fl) {
    if (CDOM.IDValue("soundAddType") == "1") {
        addFolderTracks(fl);
    }
    else {
        FolderCD(gPath + fl.name + "/");
    }
}
function openImage(fl) {
    CDOM.ID("ImageModalSrc").hidden = false;
    CDOM.ID("ImageModalSrc").src = downUrl(fl);
    CDOM.ID("VideoModalSrc").hidden = true;
    CDOM.ID("FileModalSrc").hidden = true;
    fl.open = true;
    RefreshOpen();
    g_contentJBox.Show();
}
function openAudio(fl) {
    if (CDOM.IDValue("soundAddType") == "1") {
        g_musicJBox.AddTrack(fl.name, downUrl(fl));
        CAlert.Info(fl.name + " 추가");
    }
    else {
        const names = [fl.name];
        const paths = [downUrl(fl)];
        for (const fl2 of gDirList) {
            if (fl.name == fl2.name)
                continue;
            if (fl2.ext == "mp3" || fl2.ext == "ogg") {
                const fp = gDown + encodeUrlPath(gPath + fl2.name);
                if (!paths.includes(fp)) {
                    names.push(fl2.name);
                    paths.push(fp);
                }
            }
        }
        g_musicJBox.SetList(names, paths);
        g_musicJBox.Play(0);
    }
    fl.open = true;
    RefreshOpen();
}
function openVideo(fl) {
    CDOM.ID("ImageModalSrc").hidden = true;
    CDOM.ID("VideoModalSrc").src = downUrl(fl);
    CDOM.ID("VideoModalSrc").hidden = false;
    CDOM.ID("FileModalSrc").hidden = true;
    fl.open = true;
    RefreshOpen();
    g_contentJBox.Show();
}
function openSoundList(fl) {
    const oReq = new XMLHttpRequest();
    oReq.onload = () => {
        if (oReq.status != 200) {
            CAlert.E("XMLHttpRequest error code" + oReq.status);
            return;
        }
        const d = oReq.response;
        g_musicJBox.SetList(d.name || [], d.fullPath || []);
        CAlert.Info("ListUp!");
    };
    oReq.open("GET", downUrl(fl));
    oReq.responseType = "json";
    oReq.send();
}
function tryNotifyEditorHost(path, url) {
    if (!g_fileEditorHost || !window.top)
        return false;
    const baseUrl = g_fileWebRootUrl === CPath.WebRootUrl() ? '' : g_fileWebRootUrl;
    CIframeMsg.Send(window.top, 'file-opened', { path, baseUrl, url });
    return true;
}
function openHtml(fl) {
    const url = downUrl(fl);
    if (tryNotifyEditorHost(gRoot + gPath + fl.name, url))
        return;
    const confirm = new CConfirm();
    confirm.SetBody("HTML 파일을 어떻게 열까요?");
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        () => { window.open(url, "_blank"); },
        () => { new CFileViewer([url], async (filePath, bufStr) => saveEditedFile(filePath, textToBase64(bufStr))).Open(); },
    ], ["New Window", "File Viewer"]);
    confirm.Open();
}
function openCode(fl) {
    const url = downUrl(fl);
    if (tryNotifyEditorHost(gRoot + gPath + fl.name, url))
        return;
    new CFileViewer([url], async (filePath, bufStr) => saveEditedFile(filePath, textToBase64(bufStr))).Open();
}
function openMd(fl) {
    const url = downUrl(fl);
    if (tryNotifyEditorHost(gRoot + gPath + fl.name, url))
        return;
    new CMDViewer(url);
}
function openSheet(fl) {
    const url = downUrl(fl);
    if (tryNotifyEditorHost(gRoot + gPath + fl.name, url))
        return;
    new CSheetViewer([url], async (filePath, base64) => saveEditedFile(filePath, base64)).Open();
}
function openOrm(fl) {
    const remote = g_fileWebRootUrl !== CPath.WebRootUrl();
    const serverUrl = remote ? g_fileWebRootUrl : '';
    const token = remote ? GetFileToken() : '';
    if (fl.file) {
        if (fl.ext === 'json')
            new CORMViewer(new CAuthInfo(), "ne", gRoot + gPath, serverUrl, token).Open();
        else
            new CORMViewer(new CAuthInfo(), "sqlite", gRoot + gPath + fl.name, serverUrl, token).Open();
    }
    else {
        new CORMViewer(new CAuthInfo(), "ne", gRoot + gPath + fl.name + "/", serverUrl, token).Open();
    }
}
function openGenericFile(fl) {
    CDOM.ID("ImageModalSrc").hidden = true;
    CDOM.ID("FileModalSrc").href = downUrl(fl);
    CDOM.ID("VideoModalSrc").hidden = true;
    CDOM.ID("FileModalSrc").hidden = false;
    g_contentJBox.Show();
}
const FILE_OPEN = {
    folder: openFolder, image: openImage, audio: openAudio, video: openVideo,
    soundlist: openSoundList, html: openHtml, code: openCode, md: openMd,
    sheet: openSheet, orm: openOrm, file: openGenericFile,
};
const LONG_PRESS_MS = 500;
function makeLongPressHandlers(fl, kind) {
    let pressTimer = null;
    let longPressed = false;
    const start = () => {
        longPressed = false;
        pressTimer = window.setTimeout(() => {
            longPressed = true;
            if (fl.file)
                openGenericFile(fl);
            else
                addFolderTracks(fl);
        }, LONG_PRESS_MS);
    };
    const cancel = () => { if (pressTimer != null) {
        clearTimeout(pressTimer);
        pressTimer = null;
    } };
    const click = () => { if (longPressed) {
        longPressed = false;
        return;
    } FILE_OPEN[kind](fl); };
    return {
        onclick: click,
        onmousedown: start, onmouseup: cancel, onmouseleave: cancel,
        ontouchstart: start, ontouchend: cancel, ontouchcancel: cancel, ontouchmove: cancel,
    };
}
function encodeQueryValue(_value) {
    return encodeURIComponent(_value).replace(/%2F/g, '/');
}
function updateFileUrlBar() {
    renderFileRootSelect();
    const input = document.getElementById('fileUrlInput');
    if (!input)
        return;
    const url = new URL(location.href);
    url.search = '';
    const params = [`path=${encodeQueryValue(gPath ?? '/')}`];
    if (RootPath)
        params.push(`RootPath=${encodeQueryValue(RootPath)}`);
    input.value = `${url.toString()}?${params.join('&')}`;
}
const normFileRootPath = (s) => (s ?? '').replace(/\\/g, '/').replace(/\/+$/, '');
function computeFileRootOpts() {
    const _roots = gRoots ?? [];
    const _opts = [..._roots, { path: "./", name: "Artgine (WorkingPath)" }];
    if (!_fileInitRootPathConsumed && _urlRootPathParam) {
        _fileInitRootPathConsumed = true;
        const matchIdx = _opts.findIndex(r => normFileRootPath(r.path) === normFileRootPath(_urlRootPathParam));
        if (matchIdx >= 0) {
            fileRootSelKey = matchIdx === _opts.length - 1 ? 'workingpath' : _opts[matchIdx].path;
            return { opts: _opts, curIdx: matchIdx };
        }
    }
    let _curIdx = fileRootSelKey === 'workingpath'
        ? _opts.length - 1
        : (fileRootSelKey != null ? _roots.findIndex(r => r.path === fileRootSelKey) : -1);
    if (_curIdx < 0) {
        for (let i = _opts.length - 1; i >= 0; i--) {
            if (normFileRootPath(_opts[i].path) === normFileRootPath(RootPath || './')) {
                _curIdx = i;
                break;
            }
        }
    }
    if (_curIdx < 0)
        _curIdx = 0;
    return { opts: _opts, curIdx: _curIdx };
}
async function applyFileRootSelection(rootPath, rootUrl, selKey) {
    fileRootSelKey = selKey;
    RootUrl = rootUrl ?? null;
    SyncFileRoot({ RootPath: rootPath || null, RootUrl: rootUrl ?? null });
    savePersistedFileRoot(rootPath || null, selKey);
    if (!rootUrl)
        await InitFileRoot();
    FolderCD("/");
}
let gFileRootOpts = [];
function renderFileRootSelect() {
    const sel = document.getElementById('fileRootSel');
    if (!sel)
        return;
    const { opts, curIdx } = computeFileRootOpts();
    gFileRootOpts = opts;
    sel.innerHTML = opts.map((r, i) => `<option value="${i}" ${i === curIdx ? 'selected' : ''}>${r.name}</option>`).join('');
}
function DirListRefresh() {
    updateFileUrlBar();
    CDOM.ID("File_div").innerHTML = "";
    CDOM.ID("Delete_div").innerHTML = "";
    folderList = { "<>": "ul", "class": "list-group", "html": [] };
    fileList = { "<>": "ul", "class": "list-group", "html": [] };
    if (gPath != null && gPath != "/") {
        folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-warning list-group-item-action", "html": "<i class='bi bi-folder'></i> Root Folder",
            "onclick": () => { FolderCD("/"); },
        });
        let path = gPath;
        let pos = path.lastIndexOf("/", path.length - 2);
        let bpath = path.substr(0, pos);
        bpath += "/";
        folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-primary list-group-item-action", "html": "<i class='bi bi-folder'></i> Parent Folder",
            "onclick": () => { FolderCD(bpath); },
        });
    }
    for (let fl of gDirList) {
        if (fl.hidden)
            continue;
        fl.open = false;
        fl.index = index;
        index++;
        const kind = kindOf(fl);
        folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
            "html": `<i class='bi ${FILE_ICON[kind]}'>${fl.name}${vcsTag(fl)}`,
            ...makeLongPressHandlers(fl, kind) });
        if (fl.file == true) {
            fileList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
                "html": `<i class='bi bi-file'>${fl.name}${vcsTag(fl)}`, "onclick": () => Delete(fl.name) });
        }
    }
    CDOM.ID("File_div").append(CDOM.DataToDom(folderList));
    CDOM.ID("Delete_div").append(CDOM.DataToDom(fileList));
}
const FILE_ROOT_KEY = 'artgine.fileRoot';
function loadPersistedFileRoot() {
    try {
        const v = JSON.parse(localStorage.getItem(FILE_ROOT_KEY) || '{}');
        return { RootPath: v.RootPath ?? null, SelKey: v.SelKey ?? null };
    }
    catch {
        return { RootPath: null, SelKey: null };
    }
}
function savePersistedFileRoot(rootPath, selKey) {
    try {
        localStorage.setItem(FILE_ROOT_KEY, JSON.stringify({ RootPath: rootPath, SelKey: selKey }));
    }
    catch { }
}
const _persistedFileRoot = loadPersistedFileRoot();
let fileRootSelKey = _persistedFileRoot.SelKey;
let path = CUtilWeb.Parameter("path");
let RootPath = CUtilWeb.Parameter("RootPath") ?? _persistedFileRoot.RootPath;
const _urlRootPathParam = CUtilWeb.Parameter("RootPath");
let _fileInitRootPathConsumed = false;
let RootUrl = null;
const _fileTheme = CUtilWeb.Parameter("theme");
if (_fileTheme)
    document.documentElement.setAttribute('data-bs-theme', _fileTheme);
let g_fileWebRootUrl = CPath.WebRootUrl();
const g_fileEditorHost = CUtilWeb.Parameter("editorHost");
let fileAuthed = !!getAuthToken(g_fileWebRootUrl);
function setFileAuthed(authed) {
    fileAuthed = authed;
    applyFileAuthIndicator(authed);
}
let gPath = '/';
let gRoot = '';
let gDown = '';
let gRoots = [];
let gDirList = [];
const cachedDirList = CStorage.Get(path == null ? "root" : path);
if (cachedDirList != null) {
    gDirList = JSON.parse(cachedDirList);
    DirListRefresh();
}
function NormalizeWebRootUrl(url) {
    return url.replace(/\/+$/, '') + '/';
}
function ResolveFileUrl(url) {
    if (!url)
        return '';
    if (url.startsWith("http://") || url.startsWith("https://"))
        return url.replace(/\/+$/, '');
    return new URL(url, g_fileWebRootUrl).href.replace(/\/+$/, '');
}
function FileApiUrl(path) {
    return g_fileWebRootUrl + path.replace(/^\/+/, '');
}
function GetFileToken() {
    return getAuthToken(g_fileWebRootUrl);
}
function SetFileToken(token) {
    setAuthToken(g_fileWebRootUrl, token);
}
function FileParam(extra = {}) {
    return { ...extra, token: GetFileToken() };
}
function BuildFileHomeUrl() {
    const base = g_fileWebRootUrl.replace(/\/+$/, '');
    let url = base + "/proj/Home/Home.html";
    const q = [];
    if (path)
        q.push("path=" + encodeURIComponent(path));
    if (RootPath)
        q.push("RootPath=" + encodeURIComponent(RootPath));
    if (q.length)
        url += "?" + q.join("&");
    return url;
}
async function SendRemoteGuide(token) {
    try {
        await CFecth.Exe(CPath.WebRootUrl() + "RemoteCMD/Write", { addr: BuildFileHomeUrl(), token }, "json");
    }
    catch (e) {
        console.error("RemoteCMD/Write update failed:", e);
    }
}
function SyncFileRoot(data) {
    if (data.RootPath != null)
        RootPath = data.RootPath;
    if (data.RootUrl != null)
        RootUrl = data.RootUrl;
    gRoot = RootPath?.replace(/\/+$/, '') ?? '';
    gDown = ResolveFileUrl(RootUrl);
    if (data.roots)
        gRoots = data.roots;
}
async function fileCheckAuth() {
    const token = GetFileToken();
    if (!token)
        return false;
    try {
        const j = await CFecth.Exe(FileApiUrl("auth/check"), { token }, "json");
        return !!j?.authed;
    }
    catch {
        return false;
    }
}
async function refreshFileAuthState() {
    const checkedWebRootUrl = g_fileWebRootUrl;
    const hasToken = !!GetFileToken();
    fileAuthed = hasToken;
    applyFileAuthIndicator(false);
    if (!hasToken)
        return;
    const valid = await fileCheckAuth();
    if (!valid)
        removeAuthToken(checkedWebRootUrl);
    if (checkedWebRootUrl !== g_fileWebRootUrl)
        return;
    setFileAuthed(valid);
    if (valid && checkedWebRootUrl !== CPath.WebRootUrl())
        SendRemoteGuide(GetFileToken());
}
async function InitFileRoot() {
    const rootParam = {};
    if (RootPath)
        rootParam.RootPath = RootPath;
    const data = await CFecth.Exe(FileApiUrl("File/Root"), rootParam, "json");
    SyncFileRoot(data);
}
async function FetchFileList(_path) {
    let fetchParam = { path: _path };
    if (RootPath)
        fetchParam.RootPath = RootPath;
    return await CFecth.Exe(FileApiUrl("File/List"), FileParam(fetchParam), "json");
}
async function LoadFileList(_path) {
    const data = await FetchFileList(_path);
    CStorage.Set(_path == null ? "root" : _path, JSON.stringify(data.list));
    gDirList = data.list;
    SyncFileRoot(data);
    gPath = data.path;
    DirListRefresh();
}
function ParseFileHomeUrl(input) {
    const u = new URL(input);
    const m = u.pathname.match(/^(.*)\/proj\/[^\/]+\/[^\/]+\.html$/);
    const basePath = m ? m[1] : u.pathname;
    return {
        webRootUrl: NormalizeWebRootUrl(u.origin + (basePath || "/")),
        path: u.searchParams.get("path") || "/",
        RootPath: u.searchParams.get("RootPath"),
    };
}
async function ConnectFileHomeUrl(input) {
    fileRootSelKey = null;
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
        RootUrl = null;
        path = parsed.path;
    }
    try {
        await InitFileRoot();
    }
    catch (err) {
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
    }
    else {
        (async () => {
            try {
                await InitFileRoot();
            }
            catch { }
            await LoadFileList(path ?? '/');
            refreshFileAuthState();
            notifyRemoteChanged();
        })();
    }
}
{
    const _sd = CStorage.Get("SoundList");
    const _d = _sd ? JSON.parse(_sd) : { name: [], fullPath: [] };
    g_musicJBox = new CModalMusic(_d.name, _d.fullPath, (names, paths) => CStorage.Set("SoundList", JSON.stringify({ name: names, fullPath: paths })));
}
function FolderCD(_path, _onDone) {
    gPath = _path;
    FetchFileList(_path).then((data) => {
        gDirList = data.list;
        SyncFileRoot(data);
        gPath = data.path;
        index = 0;
        DirListRefresh();
        _onDone?.();
    });
}
window["FolderCD"] = FolderCD;
var g_fun = "";
var g_data = "";
var g_option = "";
function Redirection(_multi) {
    var form = CDOM.ID("ThisPage");
    form.setAttribute("charset", "UTF-8");
    form.setAttribute("method", "Post");
    form.setAttribute("action", FileApiUrl("File/Redirection"));
    CDOM.IDValue("fun", g_fun);
    CDOM.IDValue("data", g_data);
    CDOM.IDValue("option", g_option);
    CDOM.IDValue("path", gPath);
    CDOM.IDValue("RootPath", RootPath ?? "");
    CDOM.IDValue("redirToken", GetFileToken());
    form.submit();
}
window["Redirection"] = Redirection;
var g_menuList = { "<>": "div", "class": "d-flex align-items-center p-1", "html": [
        { "<>": "form", "action": "FilePage.jsp", "id": "ThisPage", "name": "ThisPage", "method": "post", "accept-charset": "UTF-8", "html": [
                { "<>": "input", "type": "hidden", "id": "fun", "name": "fun" },
                { "<>": "input", "type": "hidden", "id": "data", "name": "data" },
                { "<>": "input", "type": "hidden", "id": "option", "name": "option" },
                { "<>": "input", "type": "hidden", "id": "path", "name": "path" },
                { "<>": "input", "type": "hidden", "id": "RootPath", "name": "RootPath" },
                { "<>": "input", "type": "hidden", "id": "redirToken", "name": "token" },
            ] },
        { "<>": "input", "type": "file", "multiple": "multiple", "id": "uploadBtn", "name": "uploadBtn", "style": "display:none" },
        { "<>": "div", "class": "d-flex align-items-center gap-1", "html": [
                { "<>": "button", "type": "button", "class": "btn btn-sm btn-primary", "text": "Music", "onclick": () => {
                        g_musicJBox.Show();
                        g_musicJBox.SetPosition(CModal.ePos.Center);
                    } },
                { "<>": "select", "class": "form-select form-select-sm", "id": "soundAddType", "style": "width:128px;", "html": [
                        { "<>": "option", "value": "0", "text": "Add All" },
                        { "<>": "option", "value": "1", "text": "Add Each (w/ Folder)" },
                    ] },
                { "<>": "button", "type": "button", "class": "btn btn-sm btn-outline-info", "text": "Search", "onclick": () => { FileSearch(); } },
                { "<>": "button", "type": "button", "class": "btn btn-sm btn-outline-secondary", "text": "File", "onclick": () => { FileBtn(); } },
            ] },
    ] };
CDOM.ID("Menu_div").append(CDOM.DataToDom(g_menuList));
{
    const rootSel = document.getElementById('fileRootSel');
    rootSel?.addEventListener('change', () => {
        const idx = parseInt(rootSel.value);
        const r = gFileRootOpts[idx];
        if (r)
            applyFileRootSelection(r.path, r.url, idx === gFileRootOpts.length - 1 ? 'workingpath' : r.path);
    });
}
{
    const copyBtn = document.getElementById('fileUrlCopyBtn');
    copyBtn?.addEventListener('click', async () => {
        const input = document.getElementById('fileUrlInput');
        if (!input?.value)
            return;
        try {
            await navigator.clipboard.writeText(input.value);
        }
        catch {
            input.select();
            document.execCommand('copy');
        }
        const icon = copyBtn.querySelector('i');
        if (!icon)
            return;
        icon.className = 'bi bi-clipboard-check';
        setTimeout(() => { icon.className = 'bi bi-clipboard'; }, 1500);
    });
}
async function FileBtn() {
    if (fileAuthed) {
        const valid = await fileCheckAuth();
        if (valid) {
            setFileAuthed(true);
            showFileAdminModal();
            return;
        }
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
            modal.Hide();
            CreateFolder();
        });
        document.getElementById(`fadm_delete_${uid}`)?.addEventListener('click', () => {
            openDeleteModal();
        });
        document.getElementById(`fadm_upload_${uid}`)?.addEventListener('click', () => {
            modal.Hide();
            CDOM.ID("uploadBtn").click();
        });
        document.getElementById(`fadm_orm_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            const remote = isRemoteServer();
            new CORMViewer(new CAuthInfo(), null, '', remote ? g_fileWebRootUrl : '', remote ? GetFileToken() : '').Open();
        });
        const isRemoteServer = () => g_fileWebRootUrl !== CPath.WebRootUrl();
        document.getElementById(`fadm_chat_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            const cwd = isRemoteServer() ? '' : (gRoot ?? '') + (gPath ?? '');
            if (window.top)
                CIframeMsg.Send(window.top, 'open-chat', { cwd: cwd || undefined });
        });
        document.getElementById(`fadm_term_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            const cwd = isRemoteServer() ? '' : (gRoot ?? '') + (gPath ?? '');
            if (window.top)
                CIframeMsg.Send(window.top, 'open-term', { cwd: cwd || undefined });
        });
        document.getElementById(`fadm_memo_${uid}`)?.addEventListener('click', () => {
            modal.Close();
            const cwd = (gRoot ?? '') + (gPath ?? '');
            if (window.top)
                CIframeMsg.Send(window.top, 'open-memo', { folder: cwd });
        });
        const vcsPath = () => (gRoot ?? './') + (gPath ?? '');
        document.getElementById(`fadm_vcs_diff_${uid}`)?.addEventListener('click', () => openVcsDiff(vcsPath()));
        document.getElementById(`fadm_vcs_update_${uid}`)?.addEventListener('click', async () => {
            const res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam({ action: "update", path: vcsPath() }), "json");
            const revLine = res.revision ? `<br><b>Revision: ${res.revision}</b>` : '';
            const msgBody = res.msg ? res.msg.replace(/\n/g, '<br>') : (res.ok ? 'Update complete' : 'Update failed');
            CAlert.Info(msgBody + revLine);
            if (res.ok)
                FolderCD(gPath);
        });
        document.getElementById(`fadm_vcs_add_${uid}`)?.addEventListener('click', () => openVcsModal('add', vcsPath()));
        document.getElementById(`fadm_vcs_revert_${uid}`)?.addEventListener('click', () => openVcsModal('revert', vcsPath()));
        document.getElementById(`fadm_vcs_commit_${uid}`)?.addEventListener('click', () => openVcsModal('commit', vcsPath()));
    }, MODAL_DOM_DELAY);
}
window["showFileAdminModal"] = showFileAdminModal;
function openActionModal(title, runLabel, runClass, onRun, hasMessage = false, fetchItems, staticItems, onItemDblClick) {
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
    const listEl = document.getElementById(`am_list_${uid}`);
    const resultEl = document.getElementById(`am_result_${uid}`);
    const allBtn = document.getElementById(`am_all_${uid}`);
    const runBtn = document.getElementById(`am_run_${uid}`);
    const msgEl = document.getElementById(`am_msg_${uid}`);
    let currentItems = [];
    const renderItems = (items) => {
        if (!items || items.length === 0) {
            listEl.innerHTML = '<span class="text-secondary">No items</span>';
            return;
        }
        currentItems = items;
        listEl.innerHTML = items.map((i, idx) => `
            <div class="d-flex align-items-center gap-1 py-1" data-action-idx="${idx}">
                <input type="checkbox" class="form-check-input am-chk-${uid}" value="${i.value}" ${i.checked !== false ? 'checked' : ''}>
                ${i.badge ? `<span class="badge bg-${i.badgeClass ?? 'secondary'}" style="font-size:0.65rem;min-width:1.4rem;">${i.badge}</span>` : ''}
                ${i.icon ? `<i class="bi ${i.icon}"></i>` : ''}
                <span class="text-truncate mb-0 flex-fill" title="${i.label}">${i.label}</span>
            </div>`).join('');
        if (onItemDblClick) {
            listEl.querySelectorAll('[data-action-idx]').forEach(row => {
                row.addEventListener('dblclick', () => {
                    const item = currentItems[parseInt(row.dataset.actionIdx ?? '-1')];
                    if (item)
                        onItemDblClick(item);
                });
            });
        }
    };
    const refresh = async () => {
        if (!fetchItems)
            return;
        listEl.innerHTML = '<span class="text-secondary">Loading...</span>';
        resultEl.style.display = 'none';
        renderItems(await fetchItems());
    };
    if (fetchItems)
        refresh();
    else
        renderItems(staticItems);
    document.getElementById(`am_refresh_${uid}`)?.addEventListener('click', refresh);
    allBtn.addEventListener('click', () => {
        const chks = listEl.querySelectorAll(`.am-chk-${uid}`);
        const allChecked = Array.from(chks).every(c => c.checked);
        chks.forEach(c => c.checked = !allChecked);
    });
    runBtn.addEventListener('click', async () => {
        const values = Array.from(listEl.querySelectorAll(`.am-chk-${uid}`))
            .filter(c => c.checked).map(c => c.value);
        if (values.length === 0) {
            CAlert.Info('No items selected');
            return;
        }
        if (hasMessage && !msgEl?.value.trim()) {
            CAlert.Info('Please enter a message');
            return;
        }
        runBtn.setAttribute('disabled', '');
        resultEl.style.display = '';
        resultEl.textContent = 'Processing...';
        const { result, refresh: doRefresh } = await onRun(values, msgEl?.value.trim());
        resultEl.textContent = result;
        runBtn.removeAttribute('disabled');
        if (doRefresh)
            refresh();
    });
}
function openVcsModal(action, path) {
    const statusColor = (s) => s === 'M' ? 'warning' : s === 'A' ? 'success' : s === 'D' ? 'danger' : 'secondary';
    const title = action === 'commit' ? 'Commit & Push' : action === 'revert' ? 'Revert' : 'Add';
    const runLabel = action === 'commit' ? 'Commit & Push' : action === 'revert' ? 'Revert' : 'Add';
    const runClass = action === 'commit' ? 'btn-success' : action === 'revert' ? 'btn-warning' : 'btn-info';
    const diffPath = (file) => {
        const normalized = file.replace(/\\/g, '/');
        if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith('/'))
            return normalized;
        return (path.replace(/\\/g, '/').replace(/\/?$/, '/') + normalized).replace(/\/+/g, '/');
    };
    openActionModal(title, runLabel, runClass, async (files, message) => {
        const param = { action, path, files };
        if (action === 'commit')
            param.message = message;
        const res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam(param), "json");
        if (res.ok)
            FolderCD(gPath);
        return { result: res.msg || (res.ok ? 'Done' : 'Failed'), refresh: res.ok };
    }, action === 'commit', async () => {
        const res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam({ action: "status", path }), "json");
        if (!res.ok)
            return [];
        const items = res.items;
        const filtered = action === 'add'
            ? items.filter(i => i.status === '?')
            : (action === 'commit' && res.vcs === 'svn')
                ? items.filter(i => i.status !== '?')
                : items;
        return filtered.map(i => ({ badge: i.status, badgeClass: statusColor(i.status), label: i.file, value: i.file, checked: true }));
    }, undefined, action === 'add' ? undefined : item => openVcsDiff(diffPath(item.value)));
}
async function openVcsDiff(filePath) {
    let res;
    try {
        res = await CFecth.Exe(FileApiUrl("File/VCS"), FileParam({ action: "diff", path: filePath }), "json");
    }
    catch (e) {
        CAlert.Info("Diff request failed");
        return;
    }
    if (!res?.ok) {
        CAlert.Info(res?.msg || "Diff failed");
        return;
    }
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
        if (!el)
            return;
        const D2H = window.Diff2HtmlUI;
        if (!D2H) {
            el.textContent = "diff2html not loaded";
            return;
        }
        el.classList.toggle('d2h-dark-color-scheme', document.documentElement.getAttribute('data-bs-theme') === 'dark');
        const cfg = { drawFileList: false, matching: "lines", outputFormat: "line-by-line", highlight: false, stickyFileHeaders: false };
        new D2H(el, res.diff, cfg).draw();
    }, MODAL_DOM_DELAY);
}
window["openVcsDiff"] = openVcsDiff;
function openDeleteModal() {
    const dirList = gDirList ?? [];
    openActionModal('Delete', 'Delete', 'btn-danger', async (names) => {
        const lines = [];
        for (const name of names) {
            const param = { data: gPath + name };
            if (RootPath)
                param.RootPath = RootPath;
            const res = await CFecth.Exe(FileApiUrl("File/Delete"), FileParam(param), "json");
            lines.push(`${res.ok ? 'OK' : 'FAIL'} ${name}`);
        }
        FolderCD(gPath);
        return { result: lines.join('\n') };
    }, false, undefined, dirList
        .filter(fl => !fl.hidden)
        .map(fl => ({ icon: fl.file ? 'bi-file' : 'bi-folder-fill', label: fl.name, value: fl.name, checked: false })));
}
function CreateFolder() {
    let confirm = new CConfirm();
    confirm.SetBody('Enter folder name:<br><input type="text" id="CreateFolder" class="form-control form-control-sm" value="New Folder">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        async () => {
            const folderName = CDOM.IDValue("CreateFolder");
            const data = gPath + folderName;
            const param = { data };
            if (RootPath)
                param.RootPath = RootPath;
            const j = await CFecth.Exe(FileApiUrl("File/Mkdir"), FileParam(param), "json");
            if (j?.ok)
                FolderCD(gPath);
            else
                CAlert.E("폴더 생성 실패");
        },
        () => { },
    ], ["Yes", "No"]);
    confirm.Open();
}
window["CreateFolder"] = CreateFolder;
function Delete(_file) {
    g_fun = "Delete";
    g_data = gPath + _file;
    Redirection(false);
}
window["Delete"] = Delete;
const SEARCH_EXCLUDE_DIRS = ['node_modules'];
const isSearchExcluded = (name) => name.startsWith('.') || SEARCH_EXCLUDE_DIRS.includes(name);
let g_srchCache = new Map();
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
    await new Promise(r => setTimeout(r, MODAL_DOM_DELAY));
    const input = document.getElementById(`srchInput_${uid}`);
    const btn = document.getElementById(`srchBtn_${uid}`);
    const stopBtn = document.getElementById(`srchStop_${uid}`);
    const status = document.getElementById(`srchStatus_${uid}`);
    const results = document.getElementById(`srchResults_${uid}`);
    const makeItem = (fl, dirPath) => {
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
                if (tryNotifyEditorHost(gRoot + dirPath + fl.name, url))
                    return;
                new CFileViewer([url], async (filePath, bufStr) => saveEditedFile(filePath, textToBase64(bufStr))).Open();
            });
        }
        else {
            item.addEventListener('click', () => { FolderCD(dirPath + fl.name + '/'); });
        }
        return item;
    };
    const keyOf = (dirPath, name) => dirPath + ' ' + name;
    const renderFromCache = (startPath, query, shown) => {
        let found = 0;
        for (const [dirPath, list] of g_srchCache) {
            if (!dirPath.startsWith(startPath))
                continue;
            for (const fl of list) {
                if (fl.hidden || isSearchExcluded(fl.name))
                    continue;
                if (fl.name.toLowerCase().includes(query)) {
                    const key = keyOf(dirPath, fl.name);
                    if (shown.has(key))
                        continue;
                    shown.add(key);
                    results.appendChild(makeItem(fl, dirPath));
                    if (++found >= 200)
                        return found;
                }
            }
        }
        return found;
    };
    const doSearch = async () => {
        const query = input.value.trim().toLowerCase();
        if (!query)
            return;
        const startPath = gPath ?? "/";
        const serverKey = RootPath ?? '';
        if (g_srchServerKey !== serverKey) {
            g_srchCache = new Map();
            g_srchServerKey = serverKey;
        }
        searchCancelled = false;
        btn.disabled = true;
        stopBtn.style.display = '';
        results.innerHTML = '';
        const shown = new Set();
        let found = renderFromCache(startPath, query, shown);
        status.textContent = found > 0 ? `Cached: ${found} result(s)... Scanning` : 'Scanning...';
        const queue = [startPath];
        while (queue.length > 0 && !searchCancelled) {
            const dirPath = queue.shift();
            status.textContent = `Scanning: ${dirPath}`;
            try {
                let p2 = { path: dirPath };
                if (RootPath)
                    p2.RootPath = RootPath;
                const data = await CFecth.Exe(FileApiUrl("File/List"), FileParam(p2), "json");
                g_srchCache.set(dirPath, data.list);
                for (const fl of data.list) {
                    if (!fl.hidden && !fl.file && !isSearchExcluded(fl.name))
                        queue.push(dirPath + fl.name + '/');
                    if (!fl.hidden && fl.name.toLowerCase().includes(query) && found < 200) {
                        const key = keyOf(dirPath, fl.name);
                        if (shown.has(key))
                            continue;
                        shown.add(key);
                        results.appendChild(makeItem(fl, dirPath));
                        found++;
                    }
                }
            }
            catch (_) { }
        }
        const cap = found >= 200 ? ' (capped at 200)' : '';
        status.textContent = searchCancelled ? `Stopped. (${found} result(s))` : found === 0 ? 'No results.' : `${found} result(s)${cap}`;
        btn.disabled = false;
        stopBtn.style.display = 'none';
    };
    stopBtn.addEventListener('click', () => { searchCancelled = true; });
    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter')
        doSearch(); });
    input.focus();
}
window["FileSearch"] = FileSearch;
CDOM.ID("uploadBtn").onchange = async (e) => {
    var fi = e.target;
    const path = gRoot + gPath;
    const readAsBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            resolve(result.split(',')[1]);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
    for (let i = 0; i < fi.files.length; ++i) {
        try {
            const name = fi.files[i].name;
            const data = await readAsBase64(fi.files[i]);
            await CFecth.Exe(FileApiUrl("File/Upload"), FileParam({ data: [data], name: [name], path }));
        }
        catch (err) {
            CAlert.E('Upload failed: ' + (err?.message ?? String(err)));
            return;
        }
    }
    Redirection(true);
};
function SoundPlayListSave() {
    let confirm = new CConfirm();
    confirm.SetBody('Enter file name to save:<br><input type="text" id="soundListSave" class="form-control form-control-sm" value="basic">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        () => {
            g_fun = "SoundPlayListSave";
            g_data = JSON.stringify({ name: g_musicJBox.Names, fullPath: g_musicJBox.Paths });
            g_option = CDOM.IDValue("soundListSave");
            Redirection(false);
        },
        () => {
        },
    ], ["Yes", "No"]);
    confirm.Open();
}
window["SoundPlayListSave"] = SoundPlayListSave;
function RefreshOpen() {
    for (let fl of gDirList) {
        if (fl.index == null)
            continue;
        if (fl.open == false) {
            CDOM.ID("fl" + fl.index).className = "list-group-item list-group-item-action";
        }
        else {
            CDOM.ID("fl" + fl.index).className = "list-group-item list-group-item-action list-group-item-secondary";
        }
    }
}
window["RefreshOpen"] = RefreshOpen;
function NextPhoto() {
    for (let fl of gDirList) {
        if (fl.open == false) {
            CDOM.ID("fl" + fl.index).className = "list-group-item list-group-item-action list-group-item-secondary";
            fl.open = true;
            if (fl.ext == "png" || fl.ext == "jpg" || fl.ext == "jpeg" || fl.ext == "bmp") {
                CDOM.ID("ImageModalSrc").hidden = false;
                CDOM.ID("ImageModalSrc").src = gDown + encodeUrlPath(gPath + fl.name);
                CDOM.ID("VideoModalSrc").hidden = true;
                CDOM.ID("FileModalSrc").hidden = true;
            }
            else if (fl.ext == "mp4" || fl.ext == "mov" || fl.ext == "avi") {
                CDOM.ID("ImageModalSrc").hidden = true;
                CDOM.ID("VideoModalSrc").src = gDown + encodeUrlPath(gPath + fl.name);
                CDOM.ID("VideoModalSrc").hidden = false;
                CDOM.ID("FileModalSrc").hidden = true;
            }
            return;
        }
    }
    CAlert.Info("더 이상 없습니다.");
}
window["NextPhoto"] = NextPhoto;

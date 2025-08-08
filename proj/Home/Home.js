const version = '2025-08-08 17:34:26';
import "../../artgine/artgine.js";
import { CPreferences } from "../../artgine/basic/CPreferences.js";
var gPF = new CPreferences();
gPF.mTargetWidth = 0;
gPF.mTargetHeight = 0;
gPF.mRenderer = "Null";
gPF.m32fDepth = false;
gPF.mTexture16f = false;
gPF.mAnti = true;
gPF.mBatchPool = true;
gPF.mXR = false;
gPF.mDeveloper = true;
gPF.mIAuto = true;
gPF.mWASM = false;
gPF.mServer = 'webServer';
import { CAtelier } from "../../artgine/canvas/CAtelier.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init([]);
import { CSing, CSingOption } from "../../artgine/server/CSing.js";
import { CConfirm, CModal } from "../../artgine/basic/CModal.js";
import { CUtil } from "../../artgine/basic/CUtil.js";
import { CBoard } from "../../artgine/server/CBoard.js";
import { CUtilWeb } from "../../artgine/util/CUtilWeb.js";
import { CStorage } from "../../artgine/system/CStorage.js";
import { CAlert } from "../../artgine/basic/CAlert.js";
import { CDomFactory } from "../../artgine/basic/CDOMFactory.js";
import { CFecth } from "../../artgine/network/CFecth.js";
import { CPath } from "../../artgine/basic/CPath.js";
if (gPF.mServer != "webServer")
    CAlert.E("서버 세팅이 잘못되었습니다");
let option = new CSingOption();
option.mFindPWBtn = "pass";
CSing.On(CSing.eEvent.State, () => {
    if (CSing.PrivateKey() == null)
        CUtil.ID("login-btn").innerText = "Login";
    else
        CUtil.ID("login-btn").innerText = "Logout";
});
CSing.On(CSing.eEvent.Init, () => {
    if (CSing.PrivateKey() == null)
        CUtil.ID("login-btn").innerText = "Login";
    else
        CUtil.ID("login-btn").innerText = "Logout";
});
CSing.On(CSing.eEvent.Insert, () => {
    loginModal.Open();
    CSing.ModifyMode();
});
let html = await CSing.InitForm(option);
let loginModal = new CModal();
loginModal.SetHeader("Sing");
loginModal.SetBody(html);
loginModal.SetTitle(CModal.eTitle.TextClose);
loginModal.SetCloseToHide(true);
CUtil.ID("login-btn").addEventListener("click", () => {
    loginModal.Open();
});
let bClient = null;
CUtil.ID("board-tab").onclick = () => {
    if (bClient == null) {
        bClient = new CBoard(CUtil.ID("board"), "");
        bClient.List(0, 5);
    }
};
let path = CUtilWeb.Parameter("path");
let admin = CUtilWeb.Parameter("admin");
if (path != null)
    CUtil.ID("file-tab").click();
if (admin != "admin")
    admin = "admin";
let data = await CFecth.Exe("File/List", { path: path, admin: admin }, "json");
window["g_dirList"] = data.list;
window["g_root"] = data.root;
window["g_path"] = data.path;
window["g_down"] = data.down;
var g_contentJBox = new CModal("content_modal");
g_contentJBox.SetCloseToHide(true);
g_contentJBox.SetBody("<img id='ImageModalSrc' style='width:100%;height: auto;max-height: 75vh;object-fit: contain' onclick='NextPhoto()'/>" +
    "<video id='VideoModalSrc' style='width:100%;height: auto;max-height: 75vh;object-fit: contain' controls autoplay onended='NextPhoto()'></video>" +
    "<a id='FileModalSrc' download >Download</a>" +
    "<div id='SourceSrc'/>");
g_contentJBox.Hide();
g_contentJBox.Open(CModal.ePos.Center);
var g_deleteJBox = new CModal("delete_modal");
g_deleteJBox.SetCloseToHide(true);
g_deleteJBox.SetBody("<div id='Delete_div'/>");
g_deleteJBox.Hide();
g_deleteJBox.Open(CModal.ePos.Center);
var g_musicJBox = new CModal("music_modal");
g_musicJBox.SetSize(400, 600);
g_musicJBox.SetCloseToHide(true);
g_musicJBox.SetBody(`<div id='Music_div'>
        
        <button type='button' class='btn btn-primary' style='margin: 4px;' onclick='SoundEachCopy()'>개별 복사</button>
        <button type='button' class='btn btn-danger' style='margin: 4px;' onclick='SoundAllDelate()'>모두 삭제</button>
        
        <button type='button' class='btn btn-warning' style='margin: 4px;' onclick='SoundPlayListSave()'>리스트 저장</button>
        <audio id='MAudio' onended='SoundEnd()' controls playsinline autoplay></audio>
        <div class='form-check'>
            <input class='form-check-input' type='checkbox' id='SoundRandom_chk' checked>
            <label class='form-check-label' for='SoundRandom_chk'>랜덤 재생</label>
        </div>
     
        <hr><div id='SoundList'></div>
    </div>`);
g_musicJBox.Hide();
g_musicJBox.Open(CModal.ePos.Center);
let g_openList = new Set();
let g_soundList = { "fullPath": [], "name": [] };
let SoundListStr = CStorage.Get("SoundList");
if (SoundListStr != null)
    g_soundList = JSON.parse(SoundListStr);
function FolderCD(_path) {
    window["g_path"] = _path;
    Redirection(false);
}
window["FolderCD"] = FolderCD;
var g_fun = "";
var g_data = "";
var g_option = "";
function Redirection(_multi) {
    var form = CUtil.ID("ThisPage");
    form.setAttribute("charset", "UTF-8");
    form.setAttribute("method", "Post");
    form.setAttribute("action", CPath.PHPC() + "File/Redirection");
    CUtil.IDValue("fun", g_fun);
    CUtil.IDValue("data", g_data);
    CUtil.IDValue("option", g_option);
    CUtil.IDValue("admin", admin);
    CUtil.IDValue("path", encodeURIComponent(window["g_path"]));
    form.submit();
}
window["Redirection"] = Redirection;
var folderList = { "<>": "ul", "class": "list-group", "html": [] };
var fileList = { "<>": "ul", "class": "list-group", "html": [] };
if (window["g_path"] != "/") {
    folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-warning list-group-item-action", "html": "<i class='bi bi-folder'></i> 최상위 폴더",
        "onclick": () => { FolderCD("/"); },
    });
    let path = window["g_path"];
    let pos = path.lastIndexOf("/", path.length - 2);
    let bpath = path.substr(0, pos);
    bpath += "/";
    folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-primary list-group-item-action", "html": "<i class='bi bi-folder'></i> 상위 폴더",
        "onclick": () => { FolderCD(bpath); },
    });
}
let index = 0;
for (let fl of window["g_dirList"]) {
    if (fl.hidden)
        continue;
    fl.open = false;
    fl.index = index;
    index++;
    let name = "";
    let onclick = null;
    if (fl.file == false) {
        folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
            "html": "<i class='bi bi-folder-fill'>" + fl.name, "onclick": () => {
                FolderCD(window["g_path"] + fl.name + "/");
            } });
    }
    else if (fl.ext == "png" || fl.ext == "jpg" || fl.ext == "jpeg" || fl.ext == "bmp") {
        folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
            "html": "<i class='bi bi-folder-image'>" + fl.name, "onclick": (e) => {
                CUtil.ID("ImageModalSrc").hidden = false;
                CUtil.ID("ImageModalSrc").src = window["g_down"] + window["g_path"] + fl.name;
                CUtil.ID("VideoModalSrc").hidden = true;
                CUtil.ID("FileModalSrc").hidden = true;
                fl.open = true;
                RefreshOpen();
                g_contentJBox.Show();
            } });
    }
    else if (fl.ext == "mp3" || fl.ext == "ogg") {
        folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
            "html": "<i class='bi bi-folder-music'>" + fl.name, "onclick": () => {
                if (CUtil.ID("soundAddChk").checked) {
                    g_soundList.fullPath.push(window["g_down"] + window["g_path"] + fl.name);
                    g_soundList.name.push(fl.name);
                    CAlert.Info(fl.name + " 추가");
                }
                else {
                    g_soundList.name.length = 0;
                    g_soundList.fullPath.length = 0;
                    g_soundList.fullPath.push(window["g_down"] + window["g_path"] + fl.name);
                    g_soundList.name.push(fl.name);
                    for (let fl2 of window["g_dirList"]) {
                        if (fl.name == fl2.name)
                            continue;
                        if (fl2.ext == "mp3" || fl.ext == "ogg") {
                            g_soundList.fullPath.push(window["g_down"] + window["g_path"] + fl2.name);
                            g_soundList.name.push(fl2.name);
                        }
                    }
                    SoundListRefresh();
                    SoundPlay(0);
                }
                SoundListSave();
                fl.open = true;
                RefreshOpen();
            } });
    }
    else if (fl.ext == "mp4" || fl.ext == "mov" || fl.ext == "avi") {
        folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
            "html": "<i class='bi bi-folder-play'>" + fl.name, "onclick": () => {
                CUtil.ID("ImageModalSrc").hidden = true;
                CUtil.ID("VideoModalSrc").src = window["g_down"] + window["g_path"] + fl.name;
                CUtil.ID("VideoModalSrc").hidden = false;
                CUtil.ID("FileModalSrc").hidden = true;
                fl.open = true;
                RefreshOpen();
                g_contentJBox.Show();
            } });
    }
    else if (fl.ext == "soundlist") {
        folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
            "html": "<i class='bi bi-flower1'>" + fl.name, "onclick": () => {
                var oReq = new XMLHttpRequest();
                oReq.onload = (e) => {
                    if (oReq.status != 200) {
                        CAlert.E("XMLHttpRequest error code" + oReq.status);
                    }
                    else {
                        g_soundList = oReq.response;
                        SoundListSave();
                        CAlert.Info("ListUp!");
                    }
                };
                oReq.open("GET", window["g_down"] + window["g_path"] + fl.name);
                oReq.responseType = "json";
                oReq.send();
            } });
    }
    else {
        folderList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
            "html": "<i class='bi bi-file'>" + fl.name, "onclick": () => {
                CUtil.ID("ImageModalSrc").hidden = true;
                CUtil.ID("FileModalSrc").href = window["g_down"] + window["g_path"] + fl.name;
                CUtil.ID("VideoModalSrc").hidden = true;
                CUtil.ID("FileModalSrc").hidden = false;
                g_contentJBox.Show();
            } });
    }
    if (fl.file == true) {
        fileList.html.push({ "<>": "li", "class": "list-group-item list-group-item-action", "id": "fl" + fl.index,
            "html": "<i class='bi bi-file'>" + fl.name, "onclick": () => {
                Delete(fl.name);
            } });
    }
}
CUtil.ID("File_div").append(CDomFactory.DataToDom(folderList));
CUtil.ID("Delete_div").append(CDomFactory.DataToDom(fileList));
var g_menuList = { "<>": "div", "html": [
        { "<>": "form", "action": "FilePage.jsp", "id": "ThisPage", "name": "ThisPage", "method": "post", "accept-charset": "UTF-8", "html": [
                { "<>": "button", "type": "button", "class": "btn btn-primary", "style": "margin: 4px;", "text": "음악", "onclick": () => {
                        g_musicJBox.Show();
                        g_musicJBox.SetPosition(CModal.ePos.Center);
                    } },
                { "<>": "button", "type": "button", "class": "btn btn-secondary", "style": "margin: 4px;", "text": "전곡 추가", "onclick": SoundAllAdd },
                { "<>": "button", "type": "button", "class": "btn btn-warning", "style": "margin: 4px;", "text": "폴더 생성", "onclick": () => { CreateFolder(); } },
                { "<>": "button", "type": "button", "class": "btn btn-danger", "style": "margin: 4px;", "text": "삭제", "onclick": () => { g_deleteJBox.Show(); } },
                { "<>": "input", "type": "file", "multiple": "multiple", "id": "uploadBtn", "name": "uploadBtn", "text": "업로드" },
                { "<>": "div", "class": "form-group form-check d-inline-block", "html": [
                        { "<>": "input", "type": "checkbox", "class": "form-check-input", "id": "soundAddChk" },
                        { "<>": "label", "class": "form-check-label", "for": "soundAddChk", "text": "음악 추가" }
                    ] },
                { "<>": "div", "class": "form-group form-check d-inline-block", "html": [
                        { "<>": "input", "type": "checkbox", "class": "form-check-input", "id": "adjustingChk" },
                        { "<>": "label", "class": "form-check-label", "for": "adjustingChk", "text": "볼륨 조절" }
                    ] },
                { "<>": "input", "type": "hidden", "id": "fun", "name": "fun" },
                { "<>": "input", "type": "hidden", "id": "data", "name": "data" },
                { "<>": "input", "type": "hidden", "id": "option", "name": "option" },
                { "<>": "input", "type": "hidden", "id": "path", "name": "path" },
                { "<>": "input", "type": "hidden", "id": "admin", "name": "admin" },
            ] },
    ] };
CUtil.ID("Menu_div").append(CDomFactory.DataToDom(g_menuList));
function CreateFolder() {
    CAlert.E("막아둠");
    return;
    let confirm = new CConfirm();
    confirm.SetBody('생성할 폴더명을 입력하세요!<br><input type="text" id="CreateFolder" class="form-control form-control-sm" value="새 폴더">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        () => {
            g_fun = "CreateFolder";
            g_data = window["g_path"] + CUtil.IDValue("CreateFolder");
            Redirection(false);
        },
        () => {
        },
    ], ["Yes", "No"]);
    confirm.Open();
}
window["CreateFolder"] = CreateFolder;
function Delete(_file) {
    CAlert.E("막아둠");
    return;
    g_fun = "Delete";
    g_data = window["g_path"] + _file;
    Redirection(false);
}
window["Delete"] = Delete;
async function Upload() {
    CAlert.E("막아둠");
    return;
    var input = document.createElement('input');
    input.type = "file";
    input.accept = ".json";
    input.click();
    await new Promise((resolve) => {
        input.onchange = async (e) => {
            var fi = e.target;
            let _str = await CUtil.FileToStr(fi.files[0]);
            resolve();
        };
        input.addEventListener('cancel', () => {
            resolve();
        });
    });
}
window["Upload"] = Upload;
CUtil.ID("uploadBtn").onchange = async (e) => {
    var fi = e.target;
    let json = { data: [], name: [], path: window["g_root"] + window["g_path"] };
    for (let i = 0; i < fi.files.length; ++i) {
        json.name.push(fi.files[i].name);
        json.data.push(CUtil.ArrayToBase64(await fi.files[i].arrayBuffer()));
    }
    CFecth.Exe("File/Upload", json).then(() => {
        Redirection(true);
    });
};
function SoundAllAdd() {
    for (let fl of window["g_dirList"]) {
        if (fl.ext == "mp3" || fl.ext == "ogg") {
            g_soundList.fullPath.push(window["g_down"] + window["g_path"] + fl.name);
            g_soundList.name.push(fl.name);
        }
    }
    CAlert.Info("전곡 추가");
    SoundListSave();
}
window["SoundAllAdd"] = SoundAllAdd;
function SoundListRefresh() {
    if (g_soundList == null)
        return;
    var musicStr = "";
    CUtil.ID("SoundList").innerHTML = "";
    for (let i = 0; i < g_soundList.fullPath.length; ++i) {
        musicStr += "<ul class='list-group'>";
        musicStr += "<li class='list-group-item list-group-item-action' id='Sound" + i + "' onclick='SoundPlay(" + i + ")'>" +
            "<i class='bi bi-file-music'></i> <font color='red'>" + g_soundList.name[i] +
            "</font><i class='bi bi-file-earmark-x float-right' onclick='SoundDelete(" + i + ")'></i></li>";
        musicStr += "</ul>";
    }
    CUtil.ID("SoundList").innerHTML = musicStr;
}
window["SoundListRefresh"] = SoundListRefresh;
SoundListRefresh();
function SoundListSave() {
    CStorage.Set("SoundList", JSON.stringify(g_soundList));
    SoundListRefresh();
}
window["SoundListSave"] = SoundListSave;
let isAdjusting = false;
const audioElement = document.getElementById('MAudio');
audioElement.crossOrigin = "anonymous";
let audioContext = null;
let sourceNode = null;
let gainNode = null;
let analyserNode = null;
let currentGain = 1.0;
let previousGain = 1.0;
function getFixedGainFromRMS(rms) {
    if (rms < 0.005)
        return 2.0;
    if (rms < 0.01)
        return lerp(rms, 0.005, 0.01, 2.0, 6.0);
    if (rms < 0.05)
        return lerp(rms, 0.01, 0.05, 6.0, 2.0);
    if (rms < 0.1)
        return lerp(rms, 0.05, 0.1, 2.0, 1.0);
    return 1.0;
}
function lerp(x, x0, x1, y0, y1) {
    const t = (x - x0) / (x1 - x0);
    return y0 + (y1 - y0) * t;
}
function autoAdjustVolume() {
    const buffer = new Uint8Array(analyserNode.fftSize);
    analyserNode.getByteTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
        const normalized = (buffer[i] - 128) / 128;
        sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / buffer.length);
    const targetGain = getFixedGainFromRMS(rms);
    const delta = targetGain - previousGain;
    const isIncreasing = delta > 0;
    const maxDeltaUp = 0.008;
    const maxDeltaDown = 0.1;
    const maxDelta = isIncreasing ? maxDeltaUp : maxDeltaDown;
    const limitedDelta = Math.max(Math.min(delta, maxDelta), -maxDelta);
    const adjustedGain = previousGain + limitedDelta;
    gainNode.gain.setValueAtTime(adjustedGain, audioContext.currentTime);
    previousGain = adjustedGain;
    console.log(`RMS: ${rms.toFixed(4)} TargetGain: ${targetGain.toFixed(2)} FinalGain: ${adjustedGain.toFixed(2)}`);
    if (isAdjusting)
        setTimeout(autoAdjustVolume, 30);
}
function startAutoGain() {
    if (!isAdjusting) {
        isAdjusting = true;
        autoAdjustVolume();
    }
}
var g_lastPlay = 0;
function SoundPlay(_off) {
    if (g_soundList.fullPath.length == 0)
        return;
    var MAudio = document.getElementById('MAudio');
    if (_off == -1) {
        CUtil.ID("Sound" + g_lastPlay).className = "list-group-item list-group-item-action";
        g_lastPlay = 0;
    }
    else {
        CUtil.ID("Sound" + g_lastPlay).className = "list-group-item list-group-item-action";
        g_lastPlay = _off;
        MAudio.src = g_soundList.fullPath[_off];
        CUtil.ID("Sound" + _off).className = "list-group-item list-group-item-action list-group-item-dark";
    }
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: g_soundList.name[_off],
            artwork: [
                { src: "512x512.png", sizes: "512x512", type: "image/png" }
            ]
        });
        navigator.mediaSession.setActionHandler("play", () => MAudio.play());
        navigator.mediaSession.setActionHandler("pause", () => MAudio.pause());
        navigator.mediaSession.setActionHandler("nexttrack", () => SoundEnd());
        navigator.mediaSession.setActionHandler("previoustrack", () => SoundEnd());
    }
    if (CUtil.IDInput("adjustingChk").checked == false) {
        MAudio.play();
    }
    else {
        if (audioContext == null) {
            audioContext = new AudioContext();
            sourceNode = audioContext.createMediaElementSource(audioElement);
            gainNode = audioContext.createGain();
            analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = 2048;
            sourceNode.connect(analyserNode);
            analyserNode.connect(gainNode);
            gainNode.connect(audioContext.destination);
        }
        isAdjusting = false;
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                MAudio.play();
                startAutoGain();
            });
        }
        else {
            MAudio.play();
            startAutoGain();
        }
    }
}
window["SoundPlay"] = SoundPlay;
function SoundDelete(_off) {
    var MAudio = document.getElementById('MAudio');
    g_soundList.fullPath.splice(_off, 1);
    g_soundList.name.splice(_off, 1);
    SoundListSave();
    MAudio.pause();
}
window["SoundDelete"] = SoundDelete;
function SoundEnd() {
    isAdjusting = false;
    if (CUtil.ID("SoundRandom_chk").checked) {
        SoundPlay(Math.trunc(Math.random() * g_soundList.fullPath.length));
    }
    else {
        ;
        if (g_soundList.fullPath.length <= g_lastPlay + 1)
            SoundPlay(0);
        else
            SoundPlay(g_lastPlay + 1);
    }
}
window["SoundEnd"] = SoundEnd;
function SoundAllDelate() {
    g_soundList.fullPath = [];
    g_soundList.name = [];
    SoundListSave();
}
window["SoundAllDelate"] = SoundAllDelate;
function SoundPlayListSave() {
    let confirm = new CConfirm();
    confirm.SetBody('저장할 파일명을 입력하세요!<br><input type="text" id="soundListSave" class="form-control form-control-sm" value="basic">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        () => {
            g_fun = "SoundPlayListSave";
            g_data = JSON.stringify(g_soundList);
            g_option = CUtil.IDValue("soundListSave");
            Redirection(false);
        },
        () => {
        },
    ], ["Yes", "No"]);
    confirm.Open();
}
window["SoundPlayListSave"] = SoundPlayListSave;
function SoundEachCopy() {
    let confirm = new CConfirm();
    confirm.SetBody('리스트를 복사하겠습니까?">');
    confirm.SetConfirm(CConfirm.eConfirm.YesNo, [
        () => {
            g_fun = "SoundEachCopy";
            g_data = JSON.stringify(g_soundList);
            Redirection(false);
        },
        () => {
            g_musicJBox.Hide();
        },
    ], ["Yes", "No"]);
    confirm.Open();
}
window["SoundEachCopy"] = SoundEachCopy;
function RefreshOpen() {
    for (let fl of window["g_dirList"]) {
        if (fl.index == null)
            continue;
        if (fl.open == false) {
            CUtil.ID("fl" + fl.index).className = "list-group-item list-group-item-action";
        }
        else {
            CUtil.ID("fl" + fl.index).className = "list-group-item list-group-item-action list-group-item-secondary";
        }
    }
}
window["RefreshOpen"] = RefreshOpen;
function NextPhoto() {
    for (let fl of window["g_dirList"]) {
        if (fl.open == false) {
            CUtil.ID("fl" + fl.index).className = "list-group-item list-group-item-action list-group-item-secondary";
            fl.open = true;
            if (fl.ext == "png" || fl.ext == "jpg" || fl.ext == "jpeg" || fl.ext == "bmp") {
                CUtil.ID("ImageModalSrc").hidden = false;
                CUtil.ID("ImageModalSrc").src = window["g_down"] + window["g_path"] + fl.name;
                CUtil.ID("VideoModalSrc").hidden = true;
                CUtil.ID("FileModalSrc").hidden = true;
            }
            else if (fl.ext == "mp4" || fl.ext == "mov" || fl.ext == "avi") {
                CUtil.ID("ImageModalSrc").hidden = true;
                CUtil.ID("VideoModalSrc").src = window["g_down"] + window["g_path"] + fl.name;
                CUtil.ID("VideoModalSrc").hidden = false;
                CUtil.ID("FileModalSrc").hidden = true;
            }
            return;
        }
    }
    CAlert.Info("더 이상 없습니다.");
}
window["NextPhoto"] = NextPhoto;

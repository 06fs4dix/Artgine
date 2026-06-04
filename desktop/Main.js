import { app, BrowserWindow, ipcMain, screen, dialog, shell } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as os from 'os';
import * as https from 'https';
import * as fs from "fs";
import { imageSize } from 'image-size';
import { spawn } from 'child_process';
import { CFile } from '../artgine/system/CFile.js';
import { CUtil } from '../artgine/basic/CUtil.js';
import { CConsol } from '../artgine/basic/CConsol.js';
import { CCMDMgr } from './CCMDMgr.js';
import { CPath } from '../artgine/basic/CPath.js';
import { CString } from '../artgine/basic/CString.js';
import { BackUp, CreateRole, DeleteRole, DependenciesChk, ExtractServiceWorkerConfig, GenerateCClassPushes, GetAppJSON, GetFolderCanvasFileName, GetPluginArr, GetProjName, PluginMapDependenciesChk, ReplaceArtginePathsInFolder, WaitForBuild } from './MainFunc.js';
import { CServerMain } from '../artgine/network/CServerMain.js';
import { CUniqueID } from '../artgine/basic/CUniqueID.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let gMainWindow = null;
var gWebServer = null;
var gRunPage = false;
const isWindows = os.platform() === 'win32';
let gAppRootPath = true;
if (await CFile.Load(CPath.WorkingPath() + "Main.json") == null)
    gAppRootPath = false;
var gAppJSON = await GetAppJSON();
if (gAppJSON == null)
    app.exit(1);
var gTSCPID = 0;
if (gAppJSON.tsc) {
    CCMDMgr.RunCMD("npx tsc -w", true).then((_pid) => {
        gTSCPID = _pid;
        CConsol.Log("TSC Build");
    });
}
const createWindow = () => {
    gMainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        autoHideMenuBar: true,
        webPreferences: {
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true,
            preload: path.resolve(__dirname, "Preload.js"),
        }
    });
    gMainWindow.webContents.session.clearCache();
    let err = PluginMapDependenciesChk();
    if (err != null) {
        dialog.showMessageBoxSync({
            type: 'error',
            buttons: ['OK'],
            defaultId: 0,
            title: 'error',
            message: err,
        });
    }
};
async function RunServer() {
    if (gAppJSON.server.indexOf("webServer") != -1) {
        const parsed = new URL(gAppJSON.url);
        const port = parsed.port;
        const pathname = parsed.pathname;
        gWebServer = new CServerMain(Number(port), pathname, gAppJSON);
        if (await gWebServer.Init()) {
            dialog.showMessageBoxSync({
                type: 'error',
                buttons: ['확인'],
                defaultId: 0,
                title: '서버 시작 오류',
                message: '서버를 시작할 수 없습니다.\n중복 포트를 확인해보세요.',
            });
            return;
        }
    }
}
async function RunPage() {
    gRunPage = true;
    RefreshScreen();
    let url = gAppJSON.url;
    let projectPath = gAppJSON.projectPath;
    if (gWebServer == null)
        await RunServer();
    let projectName = GetProjName(gAppJSON.projectPath);
    gMainWindow.setTitle(projectName);
    if (gAppJSON.server == "local") {
        gMainWindow.loadFile(CPath.WorkingPath() + projectPath + "/" + projectName + ".html");
        CConsol.Log("RunPage loadFile : " + CPath.WorkingPath() + projectPath + "/" + projectName + ".html");
    }
    else {
        gMainWindow.loadURL(url + "/" + projectPath + "/" + projectName + ".html");
        CConsol.Log("RunPage loadURL : " + url + "/" + projectPath + "/" + projectName + ".html");
    }
}
app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
    if (gAppJSON.program == "client") {
        RunPage();
    }
    else if (gAppJSON.program == "developer") {
        gMainWindow.loadFile(path.join(__dirname, 'Developer.html'));
        RefreshDevScreen();
    }
    else if (gAppJSON.program == "server") {
        gMainWindow.setFullScreen(false);
        gMainWindow.setSize(480, 420);
        gMainWindow.center();
        gMainWindow.loadFile(path.join(__dirname, 'Server.html'));
        if (gAppJSON.server.indexOf("web") == -1)
            gAppJSON.server = "webServer+other";
        RunServer();
    }
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        app.quit();
});
app.on('before-quit', async () => {
    if (gTSCPID && gTSCPID > 0) {
        CConsol.Log(`TSC 프로세스 종료 중... (PID: ${gTSCPID})`);
        await CCMDMgr.KillPID(gTSCPID);
        gTSCPID = 0;
    }
});
function RefreshDevScreen() {
    gMainWindow.setFullScreen(false);
    gMainWindow.setSize(1024, 768);
    gMainWindow.center();
    gMainWindow.setTitle("Artgine");
}
function RefreshScreen() {
    if (!gMainWindow)
        return;
    const fullScreen = gAppJSON.fullScreen;
    const width = gAppJSON.width;
    const height = gAppJSON.height;
    if (fullScreen) {
        gMainWindow.setFullScreen(true);
        gMainWindow.setMenuBarVisibility(false);
        gMainWindow.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        return;
    }
    gMainWindow.setFullScreen(false);
    const primaryDisplay = screen.getPrimaryDisplay();
    const maxWidth = primaryDisplay.workAreaSize.width;
    const maxHeight = primaryDisplay.workAreaSize.height;
    if (width === 0 && height === 0) {
        gMainWindow.maximize();
    }
    else if (width === 0 || height === 0) {
        gMainWindow.setBounds({
            x: 0,
            y: 0,
            width: width === 0 ? maxWidth : width,
            height: height === 0 ? maxHeight : height,
        });
    }
    else {
        gMainWindow.setSize(width, height);
        gMainWindow.center();
    }
}
ipcMain.handle("Connect", async (_event, _proj) => {
    return "";
});
ipcMain.handle("KeyUp", async (_event, _key) => {
    if (gAppJSON.program == "developer") {
        if (_key == "F12") {
            gMainWindow.webContents.openDevTools();
        }
        else if (_key == "F8") {
            if (gAppJSON.server != "local") {
                let projectName = GetProjName(gAppJSON.projectPath);
                shell.openExternal(gAppJSON.url + "/" + gAppJSON.projectPath + "/" + projectName + "." + gAppJSON.page);
            }
        }
        else if (_key == "F9") {
            if (gRunPage == true) {
                gRunPage = false;
                gMainWindow.loadFile(path.join(__dirname, 'Developer.html'));
                if (gWebServer != null) {
                    gWebServer.Destroy();
                    gWebServer = null;
                }
                RefreshDevScreen();
            }
        }
        if (_key == "F4") {
            if (await CCMDMgr.IsVSCodeOpen() == false) {
                CCMDMgr.RunVSCode();
                await CCMDMgr.Delay(2000);
            }
            const folderPath = path.resolve(CPath.WorkingPath() + gAppJSON.projectPath);
            let projectName = GetProjName(gAppJSON.projectPath);
            CCMDMgr.VSCodeOpenCode(folderPath + "/" + projectName + ".ts");
        }
    }
    if (_key == "F7") {
        const folderPath = path.resolve(CPath.WorkingPath() + gAppJSON.projectPath);
        shell.openPath(folderPath);
    }
    if (_key == "F5") {
        RunPage();
    }
    if (_key == "Alt+Enter") {
        gAppJSON.fullScreen = !gAppJSON.fullScreen;
        RefreshScreen();
    }
});
ipcMain.handle("VSCodeRun", async (_event) => {
    if (CCMDMgr.IsVSCodeInstall()) {
        CCMDMgr.RunVSCode();
    }
    else {
        return true;
    }
    return false;
});
ipcMain.handle("AICreate", async (_event, _selected) => {
    for (const key of _selected)
        CreateRole(key);
    return true;
});
ipcMain.handle("AIDelete", async (_event, _selected) => {
    for (const key of _selected)
        DeleteRole(key, CPath.WorkingPath());
    return true;
});
ipcMain.handle("TTYDRun", async (_event, _cfg) => {
    const BIN_DIR = path.resolve(CPath.ArtgineRootPath(), 'artgine', 'external', 'bin');
    const IS_WIN = process.platform === 'win32';
    const TTYD_FILE = IS_WIN ? 'ttyd.win32.exe'
        : process.platform === 'darwin' ? 'ttyd.macos'
            : process.arch === 'arm64' ? 'ttyd.aarch64' : 'ttyd.x86_64';
    const ttydPath = path.join(BIN_DIR, TTYD_FILE);
    if (!fs.existsSync(ttydPath)) {
        const TTYD_VERSION = '1.7.7';
        const downloadUrl = `https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/${TTYD_FILE}`;
        fs.mkdirSync(BIN_DIR, { recursive: true });
        const data = await CFile.Load(downloadUrl);
        if (!data)
            return false;
        await CFile.Save(data, ttydPath);
        if (!IS_WIN)
            fs.chmodSync(ttydPath, 0o755);
    }
    const port = _cfg?.port || 7681;
    const args = ['-p', String(port), '--writable', '-t', 'scrollback=20000'];
    if (_cfg?.password)
        args.push('-c', _cfg.password);
    const shellCmd = IS_WIN ? 'cmd.exe' : '/bin/bash';
    args.push(shellCmd);
    if (IS_WIN) {
        spawn('cmd.exe', ['/c', 'start', '""', ttydPath, ...args], {
            detached: true, stdio: 'ignore', cwd: CPath.WorkingPath(),
        }).unref();
    }
    else {
        spawn(ttydPath, args, {
            detached: true, stdio: 'ignore', cwd: CPath.WorkingPath(),
        }).unref();
    }
    return true;
});
ipcMain.handle("BuildRun", async (_event) => {
    if (CCMDMgr.IsTSC() == false)
        await CCMDMgr.RunCMD("npm install", false);
    await CCMDMgr.RunCMD("npx tsc -w", true);
    return false;
});
ipcMain.handle("PageRun", async (_event) => {
    await RunPage();
});
ipcMain.handle("URLRun", async (_event, _url) => {
    shell.openExternal(_url);
});
ipcMain.handle("FolderSelectModal", async (_event, _data) => {
    const { name, ext = [], mode, multi, absolute } = _data;
    let rootPath = CPath.WorkingPath();
    if (!fs.existsSync(rootPath)) {
        console.warn("Node: ", CUtil.IsNode() + " dir : " + __dirname);
        console.warn("Base Path Null:", rootPath);
        rootPath = undefined;
    }
    rootPath = rootPath ? path.resolve(rootPath) : undefined;
    let filters = [];
    if (ext.length > 0 && ext[0] !== "folder") {
        filters.push({
            name: ext.join(", ").toUpperCase(),
            extensions: ext
        });
    }
    if (mode === "save") {
        const result = await dialog.showSaveDialog({
            title: "Save",
            defaultPath: name ? path.join(rootPath ?? "", name) : rootPath,
            filters: filters.length > 0 ? filters : undefined,
        });
        if (result.canceled || !result.filePath)
            return "";
        return result.filePath;
    }
    const properties = [];
    if (ext.length === 1 && ext[0] === "folder") {
        properties.push("openDirectory");
    }
    else {
        properties.push("openFile");
    }
    if (multi) {
        properties.push("multiSelections");
    }
    const result = await dialog.showOpenDialog({
        title: "Open",
        defaultPath: rootPath,
        filters: filters.length > 0 ? filters : undefined,
        properties,
    });
    if (result.canceled || result.filePaths.length === 0)
        return "";
    const finalPaths = result.filePaths.map(p => {
        if (absolute || !rootPath) {
            return p.replace(/\\/g, "/");
        }
        if (p.startsWith(rootPath)) {
            const rel = p.slice(rootPath.length).replace(/^[/\\]/, "");
            return rel.replace(/\\/g, "/");
        }
        return p.replace(/\\/g, "/");
    });
    return finalPaths.join("|");
});
function ConfirmAndRestart() {
    const result = dialog.showMessageBoxSync({
        type: 'question',
        buttons: ['예', '아니오'],
        defaultId: 0,
        cancelId: 1,
        title: '재시작 확인',
        message: '재시작하시겠습니까?',
    });
    if (result === 0) {
        app.relaunch();
        app.exit(0);
    }
}
ipcMain.handle("NewPage", async (_event, _json) => {
    let buf = await CFile.Load(path.join(__dirname, 'Template/Basic.html'));
    let bHTML = CUtil.ArrayToString(buf);
    buf = await CFile.Load(path.join(__dirname, 'Template/Basic.ts'));
    let bTS = CUtil.ArrayToString(buf);
    buf = await CFile.Load(path.join(__dirname, 'Template/Basic.webmanifest'));
    let bMF = CUtil.ArrayToString(buf);
    buf = await CFile.Load(path.join(__dirname, 'Template/ServiceWorker.js'));
    let bSW = CUtil.ArrayToString(buf);
    bSW = bSW.substring(bSW.indexOf("//Start"), bSW.length);
    bSW = `const CACHE_NAME = "${_json.serviceWorker.CACHE_NAME}";
		const MAX_CACHE_SIZE = ${_json.serviceWorker.MAX_CACHE_SIZE};
		const LOG = ${_json.serviceWorker.LOG};
		const API_CACHE = ${_json.serviceWorker.API_CACHE};` + bSW;
    const artgineRoot = CPath.ArtgineRootPath();
    const projectRoot = CPath.WorkingPath();
    const _projectAbsPath = (projectRoot + _json.projectPath).replace(/\/+$/, "");
    let upFolder = path.relative(_projectAbsPath, artgineRoot.slice(0, -1)).replace(/\\/g, "/") + "/";
    let projectName = GetProjName(_json.projectPath);
    let savePath = projectRoot + _json.projectPath + "/" + projectName;
    buf = await CFile.Load(savePath + ".html");
    let oHTML = CUtil.ArrayToString(buf);
    buf = await CFile.Load(savePath + ".ts");
    let oTS = CUtil.ArrayToString(buf);
    let oMF = _json.manifast;
    let IStr = "";
    let MStr = "";
    let EStr = "";
    let ChromeStartCreate = async () => {
        const startBatContent = `@echo off
		title Chrome CORS Disabled
		color 0A

		echo ================================================
		echo Starting Chrome with CORS disabled
		echo ================================================
		echo.

		REM Check existing Chrome processes
		tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I /N "chrome.exe">NUL
		if "%ERRORLEVEL%"=="0" (
			echo Warning: Chrome is already running.
			echo Please close all Chrome windows and try again.
			echo.
			pause
			exit /b 1
		)

		REM Find Chrome path
		set CHROME_PATH=
		if exist "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" (
			set "CHROME_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
		) else if exist "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" (
			set "CHROME_PATH=C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
		) else if exist "%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe" (
			set "CHROME_PATH=%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe"
		) else (
			echo Error: Chrome not found.
			echo Opening Chrome download page...
			start https://www.google.com/chrome/
			pause
			exit /b 1
		)

		echo Starting Chrome...
		echo HTML file: ${projectName}.html
		"%CHROME_PATH%" --disable-web-security --disable-features=VizDisplayCompositor --user-data-dir="%TEMP%\\chrome_dev" --allow-running-insecure-content --disable-extensions --no-sandbox --ignore-certificate-errors --disable-site-isolation-trials "file:///%~dp0${projectName}.html"

		echo Chrome closed.
		pause`;
        await CFile.Save(startBatContent, projectRoot + _json.projectPath + "/chrome_start.bat");
    };
    if (_json.appJSON.github == true) {
        upFolder = "https://06fs4dix.github.io/Artgine/";
        ChromeStartCreate();
    }
    if (oHTML != "" && oHTML.indexOf("EntryPoint") == -1) {
        ChromeStartCreate();
        await ReplaceArtginePathsInFolder(projectRoot + _json.projectPath, upFolder, projectRoot + _json.projectPath);
        dialog.showMessageBoxSync({
            type: 'error',
            buttons: ['OK'],
            defaultId: 0,
            title: 'info',
            message: 'No <!--EntryPoint--> marker found. Recognized as manually created. Auto code generation will not work.',
        });
        return "";
    }
    if (_json.projetJSON.includes["pakozlib"]) {
        IStr += "<script type='text/javascript' src='" + upFolder + "artgine/external/legacy/pako-master/dist/pako.min.js'></script>\n";
    }
    if (_json.projetJSON.includes["jszip"]) {
        IStr += "<script type='text/javascript' src='" + upFolder + "artgine/external/legacy/jszip.min.js'></script>\n";
    }
    if (_json.projetJSON.includes["screenfull"]) {
        IStr += "<script type='text/javascript' src='" + upFolder + "artgine/external/legacy/screenfull/screenfull.min.js'></script>\n";
    }
    if (_json.projetJSON.includes["popper"]) {
        IStr += "<script src='" + upFolder + "artgine/external/legacy/popper/poper.min.js'></script>\n";
    }
    if (_json.projetJSON.includes["bootstrap"]) {
        IStr += "<link rel='stylesheet' href='" + upFolder + "artgine/external/legacy/bootstrap-5.3.3-dist/css/bootstrap.min.css'>\n";
        IStr += "<script src='" + upFolder + "artgine/external/legacy/bootstrap-5.3.3-dist/js/bootstrap.min.js'></script>\n";
        IStr += "<link rel='stylesheet' href='" + upFolder + "artgine/external/legacy/bootstrap-icons-1.11.3/bootstrap-icons.css'>\n";
        IStr += `<script>function BootstrapSearchList(searchId, listId) {
			const input = document.getElementById(searchId);
			const listItems = document.querySelectorAll(\`#\${listId} li\`);
		
			input.addEventListener('keyup', function () {
				const value = input.value.toLowerCase();
		
				listItems.forEach(item => {
					const text = item.textContent.toLowerCase();
					item.style.display = text.includes(value) ? '' : 'none';
				});
			});
		}</script>\n`;
    }
    if (_json.projetJSON.includes["excel"]) {
        IStr += "<script type='text/javascript' src='" + upFolder + "artgine/external/legacy/excel/xlsx.mini.min.js'></script>\n";
    }
    if (_json.projetJSON.includes["firebase"]) {
        IStr += "<script src='https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js'></script>\n";
        IStr += "<script src='https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js'></script>\n";
        IStr += "<script src='https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js'></script>\n";
        IStr += "<script src='https://www.gstatic.com/firebasejs/ui/6.0.0/firebase-ui-auth__ko.js'></script>\n";
        IStr += "<link type='text/css' rel='stylesheet' href='https://www.gstatic.com/firebasejs/ui/6.0.0/firebase-ui-auth.css'>\n";
    }
    if (_json.projetJSON.includes["nosleep"]) {
        IStr += "<script type='text/javascript' src='" + upFolder + "artgine/external/legacy/NoSleep.min.js'></script>\n";
        IStr += "<script>";
        IStr += "var noSleep = new NoSleep();";
        IStr += "var sChk= ()=>{setTimeout(()=>{noSleep.enable();	if(noSleep.isEnabled==false)	sChk();},1000*10);};sChk();";
        IStr += "</script>\n";
    }
    if (_json.projetJSON.includes["soundfont"]) {
        IStr += "<script src='" + upFolder + "artgine/external/legacy/soundfont/soundfont-player.min.js'></script>\n";
    }
    if (_json.projetJSON.includes["tone"]) {
        IStr += "<script src='" + upFolder + "artgine/external/legacy/Tone.js'></script>\n";
    }
    if (_json.projetJSON.includes["jquery"]) {
        IStr += "<script src='" + upFolder + "artgine/external/legacy/Jquery/jquery-3.6.0.min.js'></script>\n";
    }
    if (_json.projetJSON.includes["toastui"]) {
        IStr += "<link rel='stylesheet' href='" + upFolder + "artgine/external/legacy/toastui/toastui-editor.min.css'>\n";
        IStr += "<script src='" + upFolder + "artgine/external/legacy/toastui/toastui-editor-all.min.js'></script>\n";
    }
    if (_json.projetJSON.includes["MonacoEditor"]) {
        IStr += "<script type='text/javascript' src='" + upFolder + "artgine/external/legacy/monaco-editor/min/vs/loader.js'></script>\n";
    }
    IStr += "<link rel='manifest' href='./" + projectName + ".webmanifest'/>\n";
    IStr += "<script>\n";
    const parsed = new URL(gAppJSON.url);
    const port = parsed.port;
    const pathname = parsed.pathname;
    IStr += "let SERVER_BASE='http://localhost:" + port + pathname + "/" + _json.projectPath + "/" + projectName + ".html';\n";
    IStr += "const isElectron =/Electron/i.test(navigator.userAgent) ||(typeof window !== 'undefined' &&typeof window.process === 'object' &&!!window.process.versions?.electron);\n";
    IStr += "if (location.protocol == 'file:' && isElectron==false){\n";
    IStr += "	const page = (location.href.split('/').pop() || 'index.html').replace(/\\?.*$/, '');\n";
    IStr += "	const target = new URL(page, SERVER_BASE).toString();\n";
    IStr += "	fetch(target, {method: 'GET',mode: 'cors',cache: 'no-store',redirect: 'manual'}).then(()=>{\n";
    IStr += "	alert('Local Start Redirection!');\n";
    IStr += "	location.replace(target);\n";
    IStr += "	}).catch(() => {    alert('Please run the web server! [npm run start_web]');  });\n";
    IStr += "}</script>\n";
    let canvasList = GetFolderCanvasFileName(projectRoot + _json.projectPath + "/Canvas");
    if (_json.appJSON.server.indexOf("web") != -1 && _json.serviceWorker.MAX_CACHE_SIZE > 0) {
        IStr += `
		<script>
		if ('serviceWorker' in navigator) 
		{
			navigator.serviceWorker.register('ServiceWorker.js').then(() => {
				navigator.serviceWorker.ready.then(() => {
					console.log("서비스 워커 준비됨");
					//window.location.reload();
				});
			}).catch((err) => console.error("Service Worker 등록 실패:", err));
		}
		</script>
		`;
    }
    let pos = 0;
    if (oMF != "") {
        bMF = JSON.stringify(oMF);
    }
    if (oTS != "") {
        pos = bTS.indexOf("//EntryPoint");
        let epStr = oTS.substring(oTS.indexOf("//EntryPoint") + 12, oTS.length);
        epStr = epStr.replace(/(["'])[^"']*?((?:artgine|plugin)\/[^"']+)/g, (match, quote, path) => {
            const cleanUpFolder = upFolder.replace(/\/+$/, '');
            const cleanPath = path.replace(/^\/+/, '');
            return `${quote}${cleanUpFolder}/${cleanPath}`;
        });
        await ReplaceArtginePathsInFolder(projectRoot + _json.projectPath, upFolder, projectRoot + _json.projectPath);
        bTS = CString.InsertAt(bTS, pos + 12, epStr);
    }
    else {
        bTS += "\nimport {CObject} from \"" + upFolder + "artgine/basic/CObject.js\"";
    }
    const gVersion = CUniqueID.Get();
    let pfStr = "\nimport {CPreferences} from \"" + upFolder + "artgine/basic/CPreferences.js\";\n";
    pfStr += "var gPF = new CPreferences();\n";
    const pref = _json.projetJSON.preference;
    for (const key in pref) {
        const value = pref[key];
        if (typeof value === "string") {
            pfStr += `gPF.${key} = "${value}";\n`;
        }
        else {
            pfStr += `gPF.${key} = ${value};\n`;
        }
    }
    pfStr += `gPF.mServer = '${_json.appJSON.server}';\n`;
    pfStr += `gPF.mGitHub = ${_json.appJSON.github};\n`;
    pfStr += `gPF.mVersion = "${gVersion}";\n`;
    if (_json.projetJSON.preference.mIAuto) {
        pfStr += "\nimport {CAtelier} from \"" + upFolder + "artgine/app/CAtelier.js\";\n";
        pfStr += "\nimport {CPlugin} from \"" + upFolder + "artgine/util/CPlugin.js\";\n";
        for (let p in _json.projetJSON.dependencies) {
            pfStr += "CPlugin.PushPath('" + p + "','" + upFolder + "plugin/" + p + "/');\n";
            pfStr += "import \"" + upFolder + "plugin/" + p + "/" + p + ".js\"\n";
        }
        pfStr += "var gAtl = new CAtelier();\n";
        pfStr += "gAtl.mPF = gPF;\n";
        pfStr += "await gAtl.Init([";
        let add = false;
        for (let canName of canvasList) {
            if (canName.indexOf("Brush") != -1)
                continue;
            if (add)
                pfStr += ",";
            pfStr += "'" + canName + "'";
            add = true;
        }
        pfStr += `],"${pref.mCanvas}");\n`;
        for (let canName of canvasList) {
            if (canName.indexOf("Brush") !== -1)
                continue;
            const baseName = canName.replace(/\.json$/i, "");
            pfStr += "var " + baseName + " = gAtl.Canvas('" + canName + "');\n";
        }
        pfStr += "//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥\n";
    }
    if (DependenciesChk(_json.projetJSON.dependencies)) {
        dialog.showMessageBoxSync({
            type: 'error',
            buttons: ['확인'],
            defaultId: 0,
            title: 'Plugin',
            message: '프로젝트 플러그인 에러',
        });
    }
    bTS = CString.InsertAt(bTS, bTS.indexOf("//Version") + 9, "\nimport \"" + upFolder + "artgine/artgine.js\"\n");
    bTS = CString.InsertAt(bTS, bTS.indexOf("//Atelier") + 9, pfStr);
    let ClassStr = "import {CClass} from \"" + upFolder + "artgine/basic/CClass.js\";\n";
    ClassStr += GenerateCClassPushes(projectRoot + _json.projectPath, savePath + ".ts");
    bTS = CString.InsertAt(bTS, bTS.indexOf("//Class") + 7, "\n" + ClassStr);
    CCMDMgr.CreateEmptyFolder(projectRoot + _json.projectPath + "/Canvas");
    CCMDMgr.CreateEmptyFolder(projectRoot + _json.projectPath + "/BackUp");
    BackUp(projectRoot + _json.projectPath + "/BackUp", projectRoot + _json.projectPath + "/Canvas");
    await CFile.Save(bSW, projectRoot + _json.projectPath + "/ServiceWorker.js");
    await CFile.Save(bMF, savePath + ".webmanifest");
    await CFile.Save(bTS, savePath + ".ts");
    await CFile.Save(_json.projetJSON, savePath + ".json");
    let waitTS = await WaitForBuild(savePath + ".ts");
    if (waitTS) {
        dialog.showMessageBoxSync({
            type: 'error',
            buttons: ['OK'],
            defaultId: 0,
            title: 'info',
            message: 'Please build the TypeScript.\nType `npx tsc -w` in the terminal',
        });
        return "error";
    }
    if (_json.appJSON.github == true) {
        buf = await CFile.Load(savePath + ".js");
        IStr += "<script type='module'>\n";
        IStr += CUtil.ArrayToString(buf);
        IStr += "</script>\n";
    }
    else {
        IStr += "<script type='module' src='" + projectName + ".js'></script>\n";
    }
    pos = bHTML.indexOf("<!--Include-->");
    bHTML = CString.InsertAt(bHTML, pos + 14, IStr);
    if (oHTML != "") {
        pos = bHTML.indexOf("<!--EntryPoint-->");
        bHTML = bHTML.substring(0, bHTML.indexOf("<!--EntryPoint-->") + 17);
        bHTML = CString.InsertAt(bHTML, pos + 17, oHTML.substring(oHTML.indexOf("<!--EntryPoint-->") + 17, oHTML.length));
    }
    await CFile.Save(bHTML, savePath + ".html");
    let appChange = false;
    if (gAppJSON.program !== _json.appJSON.program)
        appChange = true;
    gAppJSON = _json.appJSON;
    if (gAppRootPath)
        CFile.Save(gAppJSON, CPath.WorkingPath() + "Main.json");
    else
        CFile.Save(gAppJSON, path.join(__dirname, "Main.json"));
    if (appChange)
        ConfirmAndRestart();
    return "";
});
var gTSCRun = false;
ipcMain.handle("LoadProjJSON", async (_event, _json) => {
    let projectName = GetProjName(_json.projectPath);
    let savePath = CPath.WorkingPath() + _json.projectPath + "/" + projectName;
    let buf = await CFile.Load(path.join(__dirname, 'Template/Basic.json'));
    let bJSON = CUtil.ArrayToString(buf);
    buf = await CFile.Load(savePath + ".json");
    if (buf != null) {
        bJSON = CUtil.ArrayToString(buf);
    }
    return bJSON;
});
ipcMain.handle("LoadAppJSON", async (_event) => {
    return JSON.stringify(gAppJSON);
});
ipcMain.handle("UpdateExtraSettings", async (_event, _json) => {
    gAppJSON.password = _json.password;
    gAppJSON.rootPath = _json.rootPath;
    if (gAppRootPath)
        CFile.Save(gAppJSON, CPath.WorkingPath() + "Main.json");
    else
        CFile.Save(gAppJSON, path.join(__dirname, "Main.json"));
});
ipcMain.handle("LoadPlugin", async (_event) => {
    return JSON.stringify(GetPluginArr());
});
ipcMain.handle("LoadManifest", async (_event, _json) => {
    let projectName = GetProjName(_json.projectPath);
    let savePath = CPath.WorkingPath() + _json.projectPath + "/" + projectName;
    let buf = await CFile.Load(path.join(__dirname, 'Template/Basic.webmanifest'));
    let bMF = CUtil.ArrayToString(buf);
    buf = await CFile.Load(savePath + ".webmanifest");
    if (buf == null) {
        const parsed = new URL(gAppJSON.url);
        let oMFJSON = JSON.parse(bMF);
        oMFJSON.short_name = projectName;
        oMFJSON.name = projectName;
        oMFJSON.start_url = parsed.pathname + "/" + _json.projectPath + "/" + projectName + ".html";
        bMF = JSON.stringify(oMFJSON);
    }
    else
        bMF = CUtil.ArrayToString(buf);
    return bMF;
});
ipcMain.handle("LoadServiceWorker", async (_event, _json) => {
    let projectName = GetProjName(_json.projectPath);
    let savePath = CPath.WorkingPath() + _json.projectPath + "/";
    let bSW = {
        "CACHE_NAME": "ServiceWorker-1",
        "MAX_CACHE_SIZE": 0,
        "LOG": false,
        "API_CACHE": false
    };
    let buf = await CFile.Load(savePath + "ServiceWorker.js");
    if (buf != null) {
        bSW = ExtractServiceWorkerConfig(CUtil.ArrayToString(buf));
    }
    bSW.CACHE_NAME = CUniqueID.GetHash();
    return JSON.stringify(bSW);
});
export function GetPrivateIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}
export async function GetPublicIP() {
    const ipServices = [
        'https://api.ipify.org',
        'https://ifconfig.me/ip',
        'https://ipinfo.io/ip',
    ];
    for (const url of ipServices) {
        try {
            const ip = await fetchText(url);
            if (ip && isValidIP(ip))
                return ip;
        }
        catch (err) {
            console.warn(`⚠️ Failed to fetch from ${url}`);
        }
    }
    return 'Unavailable';
}
function fetchText(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => resolve(data.trim()));
        })
            .on('error', reject)
            .setTimeout(3000, function () {
            this.destroy(new Error('Timeout'));
        });
    });
}
function isValidIP(ip) {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
}
ipcMain.handle("GetIPInfo", async (_event) => {
    const parsed = new URL(gAppJSON.url);
    const port = parsed.port;
    const protocol = parsed.protocol;
    const pathname = parsed.pathname;
    let projectName = GetProjName(gAppJSON.projectPath);
    let ipInfo = { private: "", public: "", url: "" };
    ipInfo.private = GetPrivateIP();
    ipInfo.public = await GetPublicIP();
    ipInfo.url = gAppJSON.url + "/" + gAppJSON.projectPath + "/" + projectName + "." + gAppJSON.page;
    ipInfo.private = protocol + "//" + ipInfo.private + ":" + port + pathname + "/" + gAppJSON.projectPath + "/" + projectName + "." + gAppJSON.page;
    ipInfo.public = protocol + "//" + ipInfo.public + ":" + port + pathname + "/" + gAppJSON.projectPath + "/" + projectName + "." + gAppJSON.page;
    CConsol.Log(ipInfo.private + "\n" + ipInfo.public);
    return JSON.stringify(ipInfo);
});
ipcMain.handle("RunBrowser", async (_event, _url) => {
    try {
        await shell.openExternal(_url);
        return true;
    }
    catch (e) {
        console.error("❌ Failed to open browser:", e);
        return false;
    }
});
ipcMain.handle("ICONSize", async (_event, _imgFile) => {
    let savePath = CPath.WorkingPath() + gAppJSON.projectPath + "/" + _imgFile;
    let buf = await CFile.Load(savePath);
    try {
        const size = imageSize(Buffer.from(buf));
        console.log(`📏 ICON Size = ${size.width} x ${size.height}`);
        return `${size.width}x${size.height}`;
    }
    catch (e) {
        console.error("❌ 이미지 크기 분석 실패:", e);
    }
    return "256x256";
});
ipcMain.handle("FileSave", async (_event, _json) => {
    let savePath = CPath.WorkingPath() + gAppJSON.projectPath + "/Canvas/";
    await CFile.Save(_json.data, savePath + _json.filename);
});
var gPaths = [];
ipcMain.handle("FileDropped", async (_event, _paths) => {
    const basePath = (path.resolve(CPath.WorkingPath(), gAppJSON.projectPath) + path.sep).replace(/\\/g, "/");
    const resultPaths = _paths.map(fullPath => {
        if (fullPath.startsWith(basePath)) {
            return fullPath.slice(basePath.length).replace(/\\/g, "/");
        }
        else {
            return null;
        }
    });
    gPaths = resultPaths;
    return resultPaths;
});
ipcMain.handle("FileDroppedPath", async (_event, _paths) => {
    return JSON.stringify(gPaths);
});

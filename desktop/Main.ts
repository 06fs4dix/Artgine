import { app, BrowserWindow,ipcMain ,screen,dialog,shell,Menu   } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as os from 'os'
import * as https from 'https';
import * as http from 'http';
import * as net from 'net';
import * as fs from "fs";
import { imageSize } from 'image-size';

import { execSync, spawn, ChildProcess } from 'child_process';
import { CUtilSystem } from '../artgine/system/CUtilSystem.js';

import {CFile} from '../artgine/system/CFile.js';
import {CUtil} from '../artgine/basic/CUtil.js';
import {CJSON} from '../artgine/basic/CJSON.js';
import {CAlert} from '../artgine/basic/CAlert.js';
import {CConsol} from '../artgine/basic/CConsol.js';
import {CAI} from '../artgine/util/CAI.js';
import {CCMDMgr} from '../artgine/system/CCMDMgr.js';
import {CPath} from '../artgine/basic/CPath.js';
import {CString} from '../artgine/basic/CString.js';


import { BackUp, CreateRole, DeleteRole, AIRole, DependenciesChk, ExtractServiceWorkerConfig, GenerateCClassPushes, GetAppJSON, GetFolderCanvasFileName, GetNowString, GetPluginArr,  GetPluginMap,  GetProjName, LoadPluginMap, PluginMapDependenciesChk, ReplaceArtginePathsInFolder, WaitForBuild } from './MainFunc.js';
import { CServerMain } from '../artgine/network/CServerMain.js';
import { CUniqueID } from '../artgine/basic/CUniqueID.js';
import { CLogRouter } from '../artgine/server/CLogRouter.js';

// 전역 크래시 가드 — 가장 먼저 등록해 이후 모든 라우터/서버 코드를 보호한다.
// stdout/stderr가 파이프(콘솔 창 등)일 때, 읽는 쪽이 드레인을 멈추면(예: Windows 콘솔
// QuickEdit 선택 모드, 창 최소화) 파이프 버퍼가 차서 write가 EAGAIN을 던진다. 핸들러가
// 없으면 이 비동기 스트림 에러가 메인 프로세스 uncaughtException으로 올라가 앱이 멈춘다
// ("A JavaScript error occurred in the main process"). 파이프 백프레셔(EAGAIN/EPIPE)는
// 로그만 유실하고 앱은 계속 돌게 흡수한다. 그 외 예외는 로깅만 하고 프로세스는 유지한다.
process.stdout.on('error', (e: any) => { if (e?.code === 'EAGAIN' || e?.code === 'EPIPE') return; });
process.stderr.on('error', (e: any) => { if (e?.code === 'EAGAIN' || e?.code === 'EPIPE') return; });
process.on('uncaughtException', (e: any) => {
	if (e?.code === 'EAGAIN' || e?.code === 'EPIPE') return;
	console.error('[uncaughtException]', e);
});
process.on('unhandledRejection', (e: any) => { console.error('[unhandledRejection]', e); });

// __dirname 대체 코드 (TS + ESM 환경)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// packaged exe(app.isPackaged)에서는 cwd(exe 폴더)와 실제 코드 위치(resources/app)가
// 달라져 WorkingPath()(cwd 기준)와 ArtgineRootPath()(__dirname 기준)가 서로 다른
// 폴더를 가리키는 문제가 생긴다. 패키징된 경우에만 cwd를 desktop의 부모(resources/app)로
// 고정한다. 소스로 직접 실행(npm start, start.bat, 서브모듈 등)될 때는 건드리지 않는다.
if (app.isPackaged) {
    process.chdir(path.resolve(__dirname, ".."));
}

let gMainWindow: BrowserWindow | null = null;
var gWebServer : CServerMain=null;
var gRunPage=false;


//CConsol.Log("__dirname : "+__dirname);
//CConsol.Log("CPath.WorkingPath() : "+CPath.WorkingPath());
const isWindows = os.platform() === 'win32';

// 임의 settings 파일명 지정: `npx electron . <settings파일명>` 형태의 위치 인자로 받는다.
// (app.isPackaged 여부에 따라 electron이 argv에 자기 실행 경로를 앞에 붙이는 위치가 달라진다)
const gSettingsFileName = process.argv.slice(app.isPackaged ? 1 : 2).find(a => !a.startsWith('-') && a.trim() !== '') ?? "settings.json";

let gAppRootPath=true;
if(await CFile.Load(CPath.WorkingPath()+gSettingsFileName)==null)
	gAppRootPath=false;


var gAppJSON = await GetAppJSON(gSettingsFileName);
if(gAppJSON==null)
	app.exit(1);

// 같은 앱을 포트만 다르게 하여 동시에 여러 개 실행할 때, 기본 userData 경로(GPUCache/Code Cache 등)를
// 모든 인스턴스가 공유하면서 발생하는 캐시 파일 락 경합(WASM 컴파일 캐시 등에서 멈춤 현상)을 막기 위해
// 인스턴스별로 userData 경로를 포트 단위로 분리한다.
{
	const port = new URL(gAppJSON.url).port || "default";
	app.setPath('userData', app.getPath('userData') + "-" + port);
}

// developer 모드: 개발 소스 편집/타입체크에 필요한 패키지(*Dev)를 TSC·개발 UI 진입 전에 설치
if (gAppJSON.program == "developer")
{
	await CCMDMgr.NPMInstall(["*Dev"]);
}

var gTSCPID=0;
if(gAppJSON.tsc)
{
	if(await CCMDMgr.IsTSCRun())
	{
		CConsol.Log("TSC 이미 실행 중 - 건너뜀");
	}
	else
	{
		CCMDMgr.RunCMD("npx tsc -w", true).then((_pid)=>{
			gTSCPID=_pid;
			CConsol.Log("TSC Build");
		});
	}
}


const createWindow = () => {
    gMainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        autoHideMenuBar: true, // 메뉴바 제거
        icon: path.resolve(__dirname, "icon.png"),
        webPreferences: {
			sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
			webviewTag: true,
			preload: path.resolve(__dirname, "Preload.js"),
			//preload: new URL(`file://${__dirname}/Preload.js`).toString(),
			
			//...( { nativeWindowOpen: true } as any )
        }
    });
	gMainWindow.webContents.session.clearCache();

	// 재시작(백그라운드 프로세스가 새 프로세스를 띄우는 경우) 시, Windows가 포그라운드가 아닌
	// 프로세스가 만든 창을 자동으로 앞에 올려주지 않아 다른 창 뒤에 숨는 문제가 있다.
	// alwaysOnTop을 순간적으로 켰다 끄는 방식으로 포커스 잠금을 우회해 강제로 최전면에 띄운다.
	gMainWindow.once('ready-to-show', () => {
		gMainWindow.show();
		gMainWindow.setAlwaysOnTop(true);
		gMainWindow.focus();
		gMainWindow.setAlwaysOnTop(false);
	});

	// Electron BrowserWindow는 크롬과 달리 우클릭 컨텍스트 메뉴(복사/붙여넣기/검사 등)를 기본 제공하지 않으므로 직접 구현한다.
	gMainWindow.webContents.on('context-menu', (_event, params) => {
		const template: Electron.MenuItemConstructorOptions[] = [];

		if (params.isEditable) {
			template.push(
				{ role: 'cut', enabled: params.editFlags.canCut },
				{ role: 'copy', enabled: params.editFlags.canCopy },
				{ role: 'paste', enabled: params.editFlags.canPaste },
				{ type: 'separator' },
				{ role: 'selectAll', enabled: params.editFlags.canSelectAll },
			);
		}
		else if (params.selectionText) {
			template.push({ role: 'copy' });
		}

		if (!app.isPackaged) {
			if (template.length > 0) template.push({ type: 'separator' });
			template.push({
				label: 'Inspect Element',
				click: () => gMainWindow.webContents.inspectElement(params.x, params.y),
			});
		}

		if (template.length === 0) return;
		Menu.buildFromTemplate(template).popup({ window: gMainWindow });
	});

	// window.open()으로 열리는 자식 창(Control.ts의 팝업 등)도 메뉴바를 숨긴다.
	gMainWindow.webContents.setWindowOpenHandler(() => {
		return {
			action: 'allow',
			overrideBrowserWindowOptions: {
				autoHideMenuBar: true,
				icon: path.resolve(__dirname, "icon.png"),
			}
		};
	});

	let err=PluginMapDependenciesChk();
	if(err!=null)
	{
		dialog.showMessageBoxSync({
			type: 'error',
			buttons: ['OK'],
			defaultId: 0,
			title: 'error',
			message: err,
		});
	}
	
	//gMainWindow.webContents.openDevTools();
    //g_mainWindow.loadFile(path.join(__dirname, 'Client.html'));
	//g_mainWindow.webContents.openDevTools();
};

async function RunServer()
{
	
	if(gAppJSON.server.indexOf("webServer")!=-1)
	{
		const parsed = new URL(gAppJSON.url);
		const port = parsed.port;       // "8080"
		const pathname = parsed.pathname; // "/Artgine"

	
		gWebServer=new CServerMain(Number(port),pathname,gAppJSON);
		//new CCmdRouter().SetServerMain(gWebServer);
		
		if(await gWebServer.Init())
		{
			dialog.showMessageBoxSync({
				type: 'error',
				buttons: ['확인'],
				defaultId: 0,
				title: '서버 시작 오류',
				message: '서버를 시작할 수 없습니다.\n중복 포트를 확인해보세요.',
			});
			return;
		}
		
		// if(gAppJSON.server=="webServer+other")
		// {
		// 	ImportServer(gWebServer);
		// }

		if(gAppJSON.program=="developer")
		{
			new CLogRouter().SetServerMain(gWebServer);
		}

	}
}
async function RunPage()
{
	gRunPage=true;
	RefreshScreen();
	let url=gAppJSON.url;
	let projectPath=gAppJSON.projectPath;
	

	if(gWebServer==null)
		await RunServer();
	
	

	let projectName=GetProjName(gAppJSON.projectPath);
	gMainWindow.setTitle(projectName); // ← 타이틀 설정
	if(gAppJSON.server=="local")
	{
		gMainWindow.loadFile(CPath.WorkingPath()+projectPath+"/"+projectName+".html");
		
		CConsol.Log("RunPage loadFile : "+CPath.WorkingPath()+projectPath+"/"+projectName+".html");
	}
	else
	{
		gMainWindow.loadURL(url+"/"+projectPath+"/"+projectName+".html");
		CConsol.Log("RunPage loadURL : "+url+"/"+projectPath+"/"+projectName+".html");
	}
	
	
}
app.whenReady().then(async () => {
    createWindow();
    
	//mac전용
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
	
	if(gAppJSON.program=="client")
	{
		RunPage();
	}
	else if(gAppJSON.program=="developer")
	{
		gMainWindow.loadFile(path.join(__dirname, 'Developer.html'));
		RefreshDevScreen();
	}
	else if(gAppJSON.program=="server")
	{
		gMainWindow.setFullScreen(false);
		gMainWindow.setSize(480, 650);
		gMainWindow.center();

		if(gAppJSON.server.indexOf("web")==-1)
			gAppJSON.server="webServer+other";
		await RunServer();
		gMainWindow.loadFile(path.join(__dirname, 'Server.html'));
	}
	

});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// 앱 종료 시 TSC / Cloudflare 터널 프로세스 정리
app.on('before-quit', async () => {
    if (gTSCPID && gTSCPID > 0) {
        CConsol.Log(`TSC 프로세스 종료 중... (PID: ${gTSCPID})`);
        await CCMDMgr.KillPID(gTSCPID);
        gTSCPID = 0;
    }
    stopCloudflareTunnel();
});

function RefreshDevScreen()
{
	gMainWindow.setFullScreen(false);
	gMainWindow.setSize(1024, 768);
	gMainWindow.center();
	gMainWindow.setTitle("Artgine"); // ← 타이틀 설정
}
function RefreshScreen() {
	if (!gMainWindow) return;

	const fullScreen = gAppJSON.fullScreen;
	const width = gAppJSON.width;
	const height = gAppJSON.height;

	if (fullScreen) {
		gMainWindow.setFullScreen(true);
		gMainWindow.setMenuBarVisibility(false); // 메뉴 숨김
		//g_mainWindow.setResizable(false);         // 창 크기 조절 안됨
		gMainWindow.setBounds({ x: 0, y: 0, width: 0, height: 0 }); // 전체화면 강제 반영
		return;
	}

	gMainWindow.setFullScreen(false); // 전체화면 해제


	const primaryDisplay = screen.getPrimaryDisplay();
	const maxWidth = primaryDisplay.workAreaSize.width;
	const maxHeight = primaryDisplay.workAreaSize.height;

	if (width === 0 && height === 0) {
		gMainWindow.maximize();
	} else if (width === 0 || height === 0) {
		gMainWindow.setBounds({
			x: 0,
			y: 0,
			width: width === 0 ? maxWidth : width,
			height: height === 0 ? maxHeight : height,
		});
	} else {
		gMainWindow.setSize(width, height);
		gMainWindow.center();
	}
}

//=========================================================================================
//다른 프로젝트일경우 예외용
ipcMain.handle("Connect", async (_event, _proj: string) => {
	return "";
});
ipcMain.handle("KeyUp", async (_event, _key: string) => {

	
	if(gAppJSON.program=="developer")
	{
		
		if(_key=="F12")
		{
			gMainWindow.webContents.openDevTools();
		}
		else if(_key=="F8")
		{
			if(gAppJSON.server!="local")
			{
				let projectName=GetProjName(gAppJSON.projectPath);
				shell.openExternal(gAppJSON.url+"/"+gAppJSON.projectPath+"/"+projectName+"."+gAppJSON.page);
			}
			
		}
		else if(_key=="F9")
		{
			
			if(gRunPage==true)
			{
				gRunPage=false;
				gMainWindow.loadFile(path.join(__dirname, 'Developer.html'));
				if(gWebServer!=null)
				{
					gWebServer.Destroy();
					gWebServer=null;
				}
			
				RefreshDevScreen();
			}
			
			// else
			// {
			// 	RunPage();
			// }

			
		}
		if(_key=="F4")
		{
			if(await CCMDMgr.IsVSCodeOpen()==false)
			{
				CCMDMgr.RunVSCode();
				await CCMDMgr.Delay(2000);
			}

			const folderPath = path.resolve(CPath.WorkingPath()+gAppJSON.projectPath);
			let projectName=GetProjName(gAppJSON.projectPath);
			CCMDMgr.VSCodeOpenCode(folderPath+"/"+projectName+".ts");
		}
	}
	
	if(_key=="F7")
	{
		const folderPath = path.resolve(CPath.WorkingPath()+gAppJSON.projectPath);
		shell.openPath(folderPath);  // 탐색기에서 폴더 열기
		
		
	}
	if(_key=="F5")
	{
		RunPage();
	}
	
	
	if(_key=="Alt+Enter")
	{
		gAppJSON.fullScreen=!gAppJSON.fullScreen;
		RefreshScreen();
	}
});
//Developer==================================================

ipcMain.handle("VSCodeRun", async (_event) => {
	if(CCMDMgr.IsVSCodeInstall())
	{
		CCMDMgr.RunVSCode();
	}
	else
	{
		return true;
	}
	return false;
});
ipcMain.handle("AICreate", async (_event, _selected: string[]) => {
	for (const key of _selected)
		CreateRole(key);
	return true;
});
ipcMain.handle("AIDelete", async (_event, _selected: string[]) => {
	for (const key of _selected)
		DeleteRole(key, CPath.WorkingPath());
	return true;
});
ipcMain.handle("BuildRun", async (_event) => {
	if(CCMDMgr.IsTSC()==false)
		await CCMDMgr.RunCMD("npm install",false);

	if(await CCMDMgr.IsTSCRun())
		CConsol.Log("TSC 이미 실행 중 - 건너뜀");
	else
		await CCMDMgr.RunCMD("npx tsc -w",true);



	return false;
});
ipcMain.handle("TSCToggle", async (_event, _enable: boolean) => {
	if (_enable) {
		if (gTSCPID === 0) {
			if (await CCMDMgr.IsTSCRun()) {
				CConsol.Log("TSC 이미 실행 중 - 건너뜀");
			} else {
				CCMDMgr.RunCMD("npx tsc -w", true).then((_pid) => {
					gTSCPID = _pid;
					CConsol.Log("TSC Build Start");
				});
			}
		}
	} else {
		if (gTSCPID > 0) {
			await CCMDMgr.KillPID(gTSCPID);
			gTSCPID = 0;
			CConsol.Log("TSC Build Stop");
		}
	}
	gAppJSON.tsc = _enable;
	if (gAppRootPath)
		CFile.Save(gAppJSON, CPath.WorkingPath() + gSettingsFileName);
	else
		CFile.Save(gAppJSON, path.join(__dirname, gSettingsFileName));
	return true;
});
ipcMain.handle("PageRun", async (_event) => {
	
	await RunPage();
	//RefreshScreen();
	//SwapProjPage(_json);
});
ipcMain.handle("URLRun", async (_event,_url) => {
	
	shell.openExternal(_url);
	//RefreshScreen();
	//SwapProjPage(_json);
});

ipcMain.handle("FolderSelectModal", async (_event, _data: {
	name?: string;
	ext?: string[];
	mode: "save" | "load";
	multi?: boolean;
	absolute?: boolean;
}) => {
	const { name, ext = [], mode, multi, absolute } = _data;


	let rootPath = CPath.WorkingPath();
	if (!fs.existsSync(rootPath)) {
		
		console.warn("Node: ", CUtil.IsNode()+" dir : "+__dirname);
		console.warn("Base Path Null:", rootPath);
		rootPath = undefined;
	}
	rootPath = rootPath ? path.resolve(rootPath) : undefined;

	let filters: { name: string, extensions: string[] }[] = [];
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

		if (result.canceled || !result.filePath) return "";

		return result.filePath;
	}

	const properties: ("openFile" | "openDirectory" | "multiSelections")[] = [];

	if (ext.length === 1 && ext[0] === "folder") {
		properties.push("openDirectory");
	} else {
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

	if (result.canceled || result.filePaths.length === 0) return "";

	
	const finalPaths = result.filePaths.map(p => {
		if (absolute || !rootPath) {
			return p.replace(/\\/g, "/"); // ← 슬래시 통일
		}
		if (p.startsWith(rootPath)) {
			const rel = p.slice(rootPath.length).replace(/^[/\\]/, "");
			return rel.replace(/\\/g, "/"); // ← 슬래시 통일
		}
		return p.replace(/\\/g, "/");
	});

	return finalPaths.join("|");
});

function ConfirmAndRestart() {
    const result = dialog.showMessageBoxSync({
        type: 'question',
        buttons: ['Yes', 'No'],
        defaultId: 0,
        cancelId: 1,
        title: 'Restart',
        message: 'Do you want to restart?',
    });

    if (result === 0) { // '예' 선택
        app.relaunch();   // 현재 실행중인 경로로 재실행
        app.quit();       // 현재 프로세스 종료
    }
}

ipcMain.handle("NewPage", async (_event, _json: {
	appJSON,
	projetJSON,
	projectPath,
	manifast,
	serviceWorker
}) => {
	let buf=await CFile.Load(path.join(__dirname, 'Template/Basic.html'));
	let bHTML=CUtil.ArrayToString(buf);

	buf=await CFile.Load(path.join(__dirname, 'Template/Basic.ts'));
	let bTS=CUtil.ArrayToString(buf);

	buf=await CFile.Load(path.join(__dirname, 'Template/Basic.webmanifest'));
	let bMF=CUtil.ArrayToString(buf);

	buf=await CFile.Load(path.join(__dirname, 'Template/ServiceWorker.js'));
	let bSW=CUtil.ArrayToString(buf);
	bSW=bSW.substring(bSW.indexOf("//Start"),bSW.length);

	


	bSW=`const CACHE_NAME = "${_json.serviceWorker.CACHE_NAME}";
		const MAX_CACHE_SIZE = ${_json.serviceWorker.MAX_CACHE_SIZE};
		const LOG = ${_json.serviceWorker.LOG};
		const API_CACHE = ${_json.serviceWorker.API_CACHE};`+bSW;

	const artgineRoot = CPath.ArtgineRootPath();
	const projectRoot = CPath.WorkingPath();
	const _projectAbsPath = (projectRoot + _json.projectPath).replace(/\/+$/, "");
	let upFolder = path.relative(_projectAbsPath, artgineRoot.slice(0, -1)).replace(/\\/g, "/") + "/";
	//let upProjPath="../"+"../".repeat(depth);


	let projectName=GetProjName(_json.projectPath);
	let savePath=projectRoot+_json.projectPath+"/"+projectName;

	buf=await CFile.Load(savePath+".html");
	let oHTML=CUtil.ArrayToString(buf);

	buf=await CFile.Load(savePath+".ts");
	let oTS=CUtil.ArrayToString(buf);

	//ts import 경로 수정은 html/ts 자동생성 여부와 무관하게 항상 독립적으로 동작
	await ReplaceArtginePathsInFolder(projectRoot+_json.projectPath,upFolder,projectRoot+_json.projectPath);

	//buf=await CFile.Load(savePath+".webmanifest");
	let oMF=_json.manifast;
	//CConsol.Log(oMF);
	


	let IStr="";
	let MStr="";
	let EStr="";
	let serverScriptStr=""; // 의존 플러그인의 server 목록 파일들 - 프로젝트 js <script> 삽입 줄 바로 위에 순차적으로 들어감

	let ChromeStartCreate=async ()=>{
		// GitHub 모드일 때 start.bat 파일 생성
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
		
		await CFile.Save(startBatContent, projectRoot+_json.projectPath+"/chrome_start.bat");
	};
	if(_json.appJSON.github==true)
	{
		upFolder="https://06fs4dix.github.io/Artgine/";
		
		ChromeStartCreate();
	}

	

	//파일 생성은 폴더가 완전히 비어있을 때(html,ts 둘 다 없음)만 수행. 하나라도 있으면 EntryPoint 체크로 분기 (html/ts 각각 독립적으로 판단)
	let isEmptyProject=(oHTML=="" && oTS=="");
	let htmlManual=oHTML!="" && oHTML.indexOf("<!--EntryPoint-->")==-1;
	let tsManual=oTS!="" && oTS.indexOf("//EntryPoint")==-1;
	let htmlSkip=htmlManual || (!isEmptyProject && oHTML=="");
	let tsSkip=tsManual || (!isEmptyProject && oTS=="");
	if(htmlManual || tsManual)
	{
		ChromeStartCreate();
		let manualMsg="";
		if(htmlManual)
			manualMsg+="No <!--EntryPoint--> marker found in html. Recognized as manually created. Auto code generation for html will not work.\n";
		if(tsManual)
			manualMsg+="No //EntryPoint marker found in ts. Recognized as manually created. Auto code generation for ts will not work.\n";
		dialog.showMessageBoxSync({
			type: 'info',
			buttons: ['OK'],
			defaultId: 0,
			title: 'info',
			message: manualMsg,
		});
	}
	//let root=upFolder;
	
	if(_json.projetJSON.includes["pakozlib"])
	{
		IStr+="<script type='text/javascript' src='"+upFolder+"artgine/external/legacy/pako-master/dist/pako.min.js'></script>\n";
	}
	if(_json.projetJSON.includes["jszip"])
	{
		IStr+="<script type='text/javascript' src='"+upFolder+"artgine/external/legacy/jszip.min.js'></script>\n";
	}
	if(_json.projetJSON.includes["screenfull"])
	{
		IStr+="<script type='text/javascript' src='"+upFolder+"artgine/external/legacy/screenfull/screenfull.min.js'></script>\n";
	}
	if(_json.projetJSON.includes["popper"])
	{
		IStr+="<script src='"+upFolder+"artgine/external/legacy/popper/poper.min.js'></script>\n";
	}
	if(_json.projetJSON.includes["bootstrap"])
	{
		IStr+="<link rel='stylesheet' href='"+upFolder+"artgine/external/legacy/bootstrap-5.3.3-dist/css/bootstrap.min.css'>\n";
		IStr+="<script src='"+upFolder+"artgine/external/legacy/bootstrap-5.3.3-dist/js/bootstrap.min.js'></script>\n";
		IStr+="<link rel='stylesheet' href='"+upFolder+"artgine/external/legacy/bootstrap-icons-1.11.3/bootstrap-icons.css'>\n";
		
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
		//IStr+="<style>p{margin-bottom:0;}</style>";
	}
	
	if(_json.projetJSON.includes["excel"])
	{
		IStr+="<script type='text/javascript' src='"+upFolder+"artgine/external/legacy/excel/xlsx.mini.min.js'></script>\n";
	}
	
	if(_json.projetJSON.includes["firebase"])
	{
		IStr+="<script src='https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js'></script>\n";
		IStr+="<script src='https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js'></script>\n";
		IStr+="<script src='https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js'></script>\n";
		
		IStr+="<script src='https://www.gstatic.com/firebasejs/ui/6.0.0/firebase-ui-auth__ko.js'></script>\n";
		IStr+="<link type='text/css' rel='stylesheet' href='https://www.gstatic.com/firebasejs/ui/6.0.0/firebase-ui-auth.css'>\n";
	}
	if(_json.projetJSON.includes["nosleep"])
	{
		IStr+="<script type='text/javascript' src='"+upFolder+"artgine/external/legacy/NoSleep.min.js'></script>\n";
		IStr+="<script>";
		IStr+="var noSleep = new NoSleep();";
		IStr+="var sChk= ()=>{setTimeout(()=>{noSleep.enable();	if(noSleep.isEnabled==false)	sChk();},1000*10);};sChk();";
		IStr+="</script>\n";
	}
	// if(_json.projetJSON.includes["colorpicker"])
	// {
	// 	IStr+="<link type='text/css' rel='stylesheet' href='"+upFolder+"/lib/external/legacy/pickr/classic.min.css'>\n";
	// 	IStr+="<link type='text/css' rel='stylesheet' href='"+upFolder+"/lib/external/legacy/pickr/monolith.min.css'>\n";
	// 	IStr+="<link type='text/css' rel='stylesheet' href='"+upFolder+"/lib/external/legacy/pickr/nano.min.css'>\n";
		
	// 	IStr+="<script type='text/javascript' src='"+upFolder+"/lib/external/legacy/pickr/pickr.min.js'></script>\n";
	// 	IStr+="<script type='text/javascript' src='"+upFolder+"/lib/external/legacy/pickr/pickr.es5.min.js'></script>\n";
	// }
	if(_json.projetJSON.includes["soundfont"])
	{
		IStr+="<script src='"+upFolder+"artgine/external/legacy/soundfont/soundfont-player.min.js'></script>\n";
	}
	if(_json.projetJSON.includes["tone"])
	{
		IStr+="<script src='"+upFolder+"artgine/external/legacy/Tone.js'></script>\n";
	}
	if(_json.projetJSON.includes["jquery"])
	{
		IStr+="<script src='"+upFolder+"artgine/external/legacy/Jquery/jquery-3.6.0.min.js'></script>\n";
	}
	if(_json.projetJSON.includes["toastui"])
	{
		IStr+="<link rel='stylesheet' href='"+upFolder+"artgine/external/legacy/toastui/toastui-editor.min.css'>\n";
		IStr+="<script src='"+upFolder+"artgine/external/legacy/toastui/toastui-editor-all.min.js'></script>\n";
	}
	if(_json.projetJSON.includes["qrcode"])
	{
		IStr+="<script src='"+upFolder+"artgine/external/legacy/qrcode.min.js'></script>\n";
	}
	if(_json.projetJSON.includes["MonacoEditor"])
	{
		IStr+="<script type='text/javascript' src='"+upFolder+"artgine/external/legacy/monaco-editor/min/vs/loader.js'></script>\n";
	}
	if(_json.projetJSON.includes["diff2html"])
	{
		IStr+="<link rel='stylesheet' href='"+upFolder+"artgine/external/legacy/diff2html/diff2html.min.css'>\n";
		IStr+="<script src='"+upFolder+"artgine/external/legacy/diff2html/diff2html-ui-slim.min.js'></script>\n";
	}
	
	
	IStr+="<link rel='manifest' href='./"+projectName+".webmanifest'/>\n";




	IStr+="<script>\n";
	const parsed = new URL(gAppJSON.url);
	const port = parsed.port;       // "8080"
	const pathname = parsed.pathname; // "/Artgine"
	IStr+="let SERVER_BASE='http://localhost:"+port+pathname+"/"+_json.projectPath+"/"+projectName+".html';\n";
	IStr+="const isElectron =/Electron/i.test(navigator.userAgent) ||(typeof window !== 'undefined' &&typeof window.process === 'object' &&!!window.process.versions?.electron);\n";
	IStr+="if (location.protocol == 'file:' && isElectron==false){\n";
	IStr +="	const page = (location.href.split('/').pop() || 'index.html').replace(/\\?.*$/, '');\n";
	
	IStr+="	const target = new URL(page, SERVER_BASE).toString();\n";
	IStr+="	fetch(target, {method: 'GET',mode: 'cors',cache: 'no-store',redirect: 'manual'}).then(()=>{\n";
	IStr+="	alert('Local Start Redirection!');\n";
	IStr+="	location.replace(target);\n";
	IStr+="	}).catch(() => {    alert('Please run the web server! [npm run start_web]');  });\n";
	IStr+="}</script>\n";



	//IStr+="<script type='module' src='"+upFolder+"artgine/artgine.js'></script>\n";
	
	let canvasList=GetFolderCanvasFileName(projectRoot+_json.projectPath+"/Canvas");

	// CConsol.Log("canvasList");
	// CConsol.Log(canvasList);

	if(_json.appJSON.server.indexOf("web")!=-1 && _json.serviceWorker.MAX_CACHE_SIZE>0)
	{
		IStr+=`
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
	let pos=0;
	
	

	

	if(oMF!="")
	{
		bMF=JSON.stringify(oMF);
	}
	

	//html/ts가 둘 다 없는 빈 프로젝트도 아니고, 둘 다 스킵 대상이면(=실제 아티젠 프로젝트가 아님) 프로젝트 부산물은 만들지 않음
	if(!(htmlSkip && tsSkip))
	{
		CCMDMgr.CreateEmptyFolder(projectRoot+_json.projectPath+"/Canvas");
		CCMDMgr.CreateEmptyFolder(projectRoot+_json.projectPath+"/BackUp");
		BackUp(projectRoot+_json.projectPath+"/BackUp",projectRoot+_json.projectPath+"/Canvas");

		//ServiceWorker.js / webmanifest는 html,ts와 별개로 항상 갱신
		await CFile.Save(bSW,projectRoot+_json.projectPath+"/ServiceWorker.js");
		await CFile.Save(bMF,savePath+".webmanifest");
		await CFile.Save(_json.projetJSON,savePath+".json");
	}

	//ts 자동 수정은 비어있는 프로젝트(신규 생성) 또는 //EntryPoint 마커가 있는 기존 ts일 때만. 수동 작성 ts나, html만 있고 ts가 없는 경우는 건드리지 않음
	if(!tsSkip)
	{
		if(oTS!="")
		{

			pos=bTS.indexOf("//EntryPoint");
			let epStr=oTS.substring(oTS.indexOf("//EntryPoint")+12,oTS.length);
			//if(_json.appJSON.github==true)


			epStr = epStr.replace(
				/^.*$/gm,
				(line) => {
					if (!/\bimport\b/.test(line)) return line;
					return line.replace(
						/(["'])[^"'\n]*?((?:artgine|plugin)\/[^"'\n]+)/g,
						(match, quote, path) => {
							// upFolder 끝 / 제거, path 앞 / 제거 후 결합
							const cleanUpFolder = upFolder.replace(/\/+$/, '');
							const cleanPath = path.replace(/^\/+/, '');
							return `${quote}${cleanUpFolder}/${cleanPath}`;
						}
					);
				}
			);

			bTS=CString.InsertAt(bTS,pos+12,epStr);



		}
		else
		{
			bTS+="\nimport {CObject} from \""+upFolder+"artgine/basic/CObject.js\"";
		}

		const gVersion=CUniqueID.Get();
		let pfStr= "\nimport {CPreferences} from \""+upFolder+"artgine/basic/CPreferences.js\";\n";
		pfStr+= "var gPF = new CPreferences();\n";
		const pref = _json.projetJSON.preference;
		for (const key in pref)
		{
			const value = pref[key];

			// 문자열은 따옴표로 감싸기
			if (typeof value === "string") {
				pfStr += `gPF.${key} = "${value}";\n`;
			}
			// 숫자나 불린은 그대로
			else {
				pfStr += `gPF.${key} = ${value};\n`;
			}
		}
		pfStr += `gPF.mServer = '${_json.appJSON.server}';\n`;
		pfStr += `gPF.mGitHub = ${_json.appJSON.github};\n`;
		pfStr += `gPF.mVersion = "${gVersion}";\n`;

		//CConsol.Log("mIAuto L "+_json.projetJSON.preference.mIAuto);
		if(_json.projetJSON.preference.mIAuto)
		{
			pfStr+= "\nimport {CAtelier} from \""+upFolder+"artgine/app/CAtelier.js\";\n";
			pfStr+= "\nimport {CPlugin} from \""+upFolder+"artgine/util/CPlugin.js\";\n";
			for(let p in _json.projetJSON.dependencies)
			{
				let pInfo=GetPluginMap().get(p);
				pfStr+="CPlugin.PushPath('"+p+"','"+upFolder+"plugin/"+p+"/');\n";
				for(let file of pInfo.client)
					pfStr+="import \""+upFolder+"plugin/"+p+"/"+file+"\"\n";
				for(let file of pInfo.server)
					serverScriptStr+="<script type=\"server\" src=\""+upFolder+"plugin/"+p+"/"+file+"\"></script>\n";
			}
			pfStr+= "var gAtl = new CAtelier();\n";
			pfStr+= "gAtl.mPF = gPF;\n";
			pfStr+= "await gAtl.Init([";
			let add=false;
			for(let canName of canvasList)
			{
				if(canName.indexOf("Brush")!=-1)	continue;
				if(add)
					pfStr+=",";

				pfStr+="'"+canName+"'";
				add=true;
			}


			pfStr+=`],"${pref.mCanvas}");\n`;
			for (let canName of canvasList)
			{
				if (canName.indexOf("Brush") !== -1) continue;

				const baseName = canName.replace(/\.json$/i, ""); // 또는 split(".")[0];
				pfStr += "var " + baseName + " = gAtl.Canvas('" + canName + "');\n";
			}
			pfStr+="//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥\n";
		}
		//CConsol.Log(_json.projetJSON.dependencies);

		if(DependenciesChk(_json.projetJSON.dependencies))
		{
			dialog.showMessageBoxSync({
				type: 'error',
				buttons: ['확인'],
				defaultId: 0,
				title: 'Plugin',
				message: '프로젝트 플러그인 에러',
			});
		}

		bTS=CString.InsertAt(bTS,bTS.indexOf("//Version")+9,"\nimport \""+upFolder+"artgine/artgine.js\"\n");




		bTS=CString.InsertAt(bTS,bTS.indexOf("//Atelier")+9,pfStr);

		let ClassStr="import {CClass} from \""+upFolder+"artgine/basic/CClass.js\";\n";
		ClassStr+=GenerateCClassPushes(projectRoot+_json.projectPath,savePath+".ts");
		//ClassStr+="\nimport \""+upFolder+"artgine/artgine.js\";\n";



		bTS=CString.InsertAt(bTS,bTS.indexOf("//Class")+7,"\n"+ClassStr);

		await CFile.Save(bTS,savePath+".ts");
		let waitTS=await WaitForBuild(savePath+".ts");
		if(waitTS)
		{
			// if(gTSCRun)
			// {
			dialog.showMessageBoxSync({
				type: 'error',
				buttons: ['OK'],
				defaultId: 0,
				title: 'info',
				message: 'Please build the TypeScript.\nType `npx tsc -w` in the terminal',
			});
			return "error";


		}
	}

	//html 자동 수정은 비어있는 프로젝트(신규 생성) 또는 <!--EntryPoint--> 마커가 있는 기존 html일 때만. 수동 작성 html이나, ts만 있고 html이 없는 경우는 건드리지 않음
	if(!htmlSkip)
	{
	if(_json.appJSON.github==true)
	{
		buf=await CFile.Load(savePath+".js");
		IStr+=serverScriptStr;
		IStr+="<script type='module'>\n";
		IStr+=CUtil.ArrayToString(buf);
		IStr+="</script>\n";
		
		


	}
	else
	{
		IStr+=serverScriptStr;
		IStr+="<script type='module' src='"+projectName+".js'></script>\n";
	}
	
	


	pos=bHTML.indexOf("<!--Include-->");
	bHTML=CString.InsertAt(bHTML,pos+14,IStr);

	if(oHTML!="")
	{
		pos=bHTML.indexOf("<!--EntryPoint-->");
		bHTML=bHTML.substring(0,bHTML.indexOf("<!--EntryPoint-->")+17);
		//모듈이 포함 안되어 있으면 강제로 넣음
		// if(oHTML.indexOf(projectName+".js")==-1)
		// 	bHTML+="<script type='module' src='"+projectName+".js'></script>\n";
		bHTML=CString.InsertAt(bHTML,pos+17,oHTML.substring(oHTML.indexOf("<!--EntryPoint-->")+17,oHTML.length));
	}
	bHTML=bHTML.replace("<title>Artgine</title>", "<title>"+projectName+"</title>"); // Basic.html의 placeholder 타이틀을 프로젝트명으로 치환 (DOCTYPE 순서 유지)
	await CFile.Save(bHTML,savePath+".html");
	}

	
	let appChange=false;
	if (gAppJSON.program !== _json.appJSON.program) 
		appChange=true;
	
	gAppJSON=_json.appJSON;
	
	if(gAppRootPath)
		CFile.Save(gAppJSON,CPath.WorkingPath()+gSettingsFileName);
	else
		CFile.Save(gAppJSON,path.join(__dirname, gSettingsFileName));
	if(appChange)
		ConfirmAndRestart();
	return "";
	//return appChange;
});
var gTSCRun=false;
ipcMain.handle("LoadProjJSON", async (_event,_json: {
	projectPath,
}) => {
	let projectName=GetProjName(_json.projectPath);
	let savePath=CPath.WorkingPath()+_json.projectPath+"/"+projectName;

	let buf=await CFile.Load(path.join(__dirname, 'Template/Basic.json'));
	let bJSON=CUtil.ArrayToString(buf);

	buf=await CFile.Load(savePath+".json");
	if(buf!=null)
	{
		bJSON=CUtil.ArrayToString(buf);
	}
	return bJSON;
});
ipcMain.handle("LoadAppJSON", async (_event,) => {
	return JSON.stringify(gAppJSON);
});
ipcMain.handle("SwitchProgram", async (_event, _program: string) => {
	gAppJSON.program = _program;
	if (gAppRootPath)
		CFile.Save(gAppJSON, CPath.WorkingPath() + gSettingsFileName);
	else
		CFile.Save(gAppJSON, path.join(__dirname, gSettingsFileName));
	ConfirmAndRestart();
});
// 워킹 폴더(rootPath)는 Env.json(CStorage)으로 이관되어 Control(AIInfo)에서 편집한다.
// 데스크탑에서는 password만 settings.json에 저장한다.
ipcMain.handle("UpdateExtraSettings", async (_event, _json: { password: string }) => {
	gAppJSON.password = _json.password;
	if (gAppRootPath)
		CFile.Save(gAppJSON, CPath.WorkingPath() + gSettingsFileName);
	else
		CFile.Save(gAppJSON, path.join(__dirname, gSettingsFileName));
});
ipcMain.handle("LoadPlugin", async (_event,) => 
{
	return JSON.stringify(GetPluginArr());
});
ipcMain.handle("LoadManifest", async (_event,_json: {
	projectPath,
}) => {
	let projectName=GetProjName(_json.projectPath);
	let savePath=CPath.WorkingPath()+_json.projectPath+"/"+projectName;
	//CConsol.Log("LoadManifest "+savePath);

	let buf=await CFile.Load(path.join(__dirname, 'Template/Basic.webmanifest'));
	let bMF=CUtil.ArrayToString(buf);

	buf=await CFile.Load(savePath+".webmanifest");
	if(buf==null)
	{
		const parsed = new URL(gAppJSON.url);
		
		let oMFJSON=JSON.parse(bMF);
		oMFJSON.short_name=projectName;
		oMFJSON.name=projectName;
		oMFJSON.start_url=parsed.pathname+"/"+_json.projectPath+"/"+projectName+".html";
		//CConsol.Log(parsed.pathname+" / "+gAppJSON.url);

		bMF=JSON.stringify(oMFJSON);
	}
	else
		bMF=CUtil.ArrayToString(buf);
	return bMF;
});
ipcMain.handle("LoadServiceWorker", async (_event,_json: {
	projectPath,
}) => {
	let projectName=GetProjName(_json.projectPath);
	let savePath=CPath.WorkingPath()+_json.projectPath+"/";

	//let buf=await CFile.Load(path.join(__dirname, 'Template/ServiceWorker.js'));
	//let bSW=CUtil.ArrayToString(buf);

	let bSW={
		"CACHE_NAME": "ServiceWorker-1",
		"MAX_CACHE_SIZE": 0,
		"LOG": false,
		"API_CACHE": false
	};
	let buf=await CFile.Load(savePath+"ServiceWorker.js");
	//CConsol.Log("SW : "+savePath);
	if(buf!=null)
	{
		bSW = ExtractServiceWorkerConfig(CUtil.ArrayToString(buf)) as {
			CACHE_NAME: string;
			MAX_CACHE_SIZE: number;
			LOG: boolean;
			API_CACHE: boolean;
		};
	}
	bSW.CACHE_NAME=CUniqueID.GetHash();
	
	return JSON.stringify(bSW);
});

//server========================================================

// 설정한 프로젝트 페이지로 실제 HTTP 접속해 200이 오는지 확인한다.
// 단순 포트 열림(TCP)만 보면 Tomcat 등 엉뚱한 서버도 통과하므로,
// 실제로 내 Node 서버가 해당 콘텐츠를 서빙 중인지(200)로 검증한다.
function checkHttp(url: string, timeout: number = 3000): Promise<boolean> {
    return new Promise(resolve => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(url, res => {
            res.resume(); // 본문 버림
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(timeout, () => { req.destroy(); resolve(false); });
    });
}

// 서버 기동 직후 자기 공인 IP로 접속하면 NAT 헤어핀 콜드 스타트로 첫 요청이 느려질 수 있어 재시도한다.
async function checkHttpRetry(url: string, tries: number = 3, timeout: number = 5000): Promise<boolean> {
    for (let i = 0; i < tries; i++) {
        if (await checkHttp(url, timeout)) return true;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
}
ipcMain.handle("GetIPInfo", async (_event) => {
	const parsed = new URL(gAppJSON.url);
	const port = parsed.port;       // "8080"
	const protocol = parsed.protocol;       // "8080"
	const pathname = parsed.pathname; // "/Artgine"

	let projectName=GetProjName(gAppJSON.projectPath);
	let ipInfo={private:"",public:"",url:""};
	ipInfo.private=CServerMain.GetPrivateIP();
	ipInfo.public=await CServerMain.GetPublicIP();

	ipInfo.url=gAppJSON.url+"/"+gAppJSON.projectPath+"/"+projectName+"."+gAppJSON.page;
	ipInfo.private=protocol+"//"+ipInfo.private+":"+port+pathname+"/"+gAppJSON.projectPath+"/"+projectName+"."+gAppJSON.page;
	const publicPage=protocol+"//"+ipInfo.public+":"+port+pathname+"/"+gAppJSON.projectPath+"/"+projectName+"."+gAppJSON.page;
	if(ipInfo.public==="Unavailable")
		ipInfo.public="Please check your internet connection.";
	else if(!(await checkHttpRetry(publicPage)))
		ipInfo.public="Port unreachable. Please check port forwarding.";
	else
		ipInfo.public=publicPage;

	CConsol.Log(ipInfo.private+"\n"+ipInfo.public);

	return JSON.stringify(ipInfo);
});

// ---- Cloudflare Quick Tunnel (서버 모드: 외부 포트 막힘 시 무료 임시 공개 URL) ----
// yt-dlp와 동일하게 artgine/external/bin 에 OS별 cloudflared를 받아 실행한다. 로그인/사전 설정 없음.
const CLOUDFLARED_RELEASE = "https://github.com/cloudflare/cloudflared/releases/latest/download";
let gCloudflaredProc: ChildProcess | null = null;
let gCloudflareTunnelUrl = "";

function cloudflaredBinDir(): string {
	return path.resolve(CPath.ArtgineRootPath(), "artgine", "external", "bin");
}

/** OS/arch에 맞는 배포 파일과 로컬 실행 파일명. */
function resolveCloudflaredAsset(): { url: string; fileName: string; archive: "none" | "tgz" } {
	const p = os.platform();
	const a = os.arch();
	if (p === "win32") {
		const asset = a === "arm64" ? "cloudflared-windows-arm64.exe" : "cloudflared-windows-amd64.exe";
		return { url: `${CLOUDFLARED_RELEASE}/${asset}`, fileName: "cloudflared.exe", archive: "none" };
	}
	if (p === "darwin") {
		const asset = a === "arm64" ? "cloudflared-darwin-arm64.tgz" : "cloudflared-darwin-amd64.tgz";
		return { url: `${CLOUDFLARED_RELEASE}/${asset}`, fileName: "cloudflared", archive: "tgz" };
	}
	// linux
	let asset = "cloudflared-linux-amd64";
	if (a === "arm64") asset = "cloudflared-linux-arm64";
	else if (a === "arm") asset = "cloudflared-linux-arm";
	return { url: `${CLOUDFLARED_RELEASE}/${asset}`, fileName: "cloudflared", archive: "none" };
}

async function ensureCloudflared(): Promise<string | null> {
	const binDir = cloudflaredBinDir();
	const asset = resolveCloudflaredAsset();
	const binPath = path.join(binDir, asset.fileName);
	if (fs.existsSync(binPath)) return binPath;

	CConsol.Log(`[Cloudflare] cloudflared 없음 → 다운로드: ${asset.url}`);
	await CFile.FolderCreate(binDir);
	const data = await CFile.Load(asset.url);
	if (!data) {
		CConsol.Log("[Cloudflare] cloudflared 다운로드 실패", CConsol.eColor.red);
		return null;
	}

	if (asset.archive === "tgz") {
		const tgzPath = path.join(binDir, "cloudflared.tgz");
		await CFile.Save(data as ArrayBuffer, tgzPath);
		try {
			execSync(`tar -xzf "${tgzPath}" -C "${binDir}"`, { stdio: "ignore" });
		} catch (e) {
			CConsol.Log("[Cloudflare] tgz 압축 해제 실패: " + e, CConsol.eColor.red);
			try { fs.unlinkSync(tgzPath); } catch { /* ignore */ }
			return null;
		}
		try { fs.unlinkSync(tgzPath); } catch { /* ignore */ }
		// tar 결과물이 하위 폴더에 있을 수 있어 cloudflared 실행 파일을 찾아 bin 루트로 옮긴다.
		if (!fs.existsSync(binPath)) {
			const found = findFileRecursive(binDir, "cloudflared");
			if (found && found !== binPath) {
				fs.renameSync(found, binPath);
			}
		}
	} else {
		await CFile.Save(data as ArrayBuffer, binPath);
	}

	if (!fs.existsSync(binPath)) {
		CConsol.Log("[Cloudflare] cloudflared 설치 후 파일 없음", CConsol.eColor.red);
		return null;
	}
	if (process.platform !== "win32") {
		try { fs.chmodSync(binPath, 0o755); } catch { /* ignore */ }
	}
	CConsol.Log("[Cloudflare] cloudflared 준비 완료: " + binPath);
	return binPath;
}

function findFileRecursive(dir: string, name: string): string | null {
	try {
		for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, ent.name);
			if (ent.isFile() && ent.name === name) return full;
			if (ent.isDirectory()) {
				const nested = findFileRecursive(full, name);
				if (nested) return nested;
			}
		}
	} catch { /* ignore */ }
	return null;
}

function stopCloudflareTunnel() {
	if (gCloudflaredProc) {
		const pid = gCloudflaredProc.pid;
		try {
			if (process.platform === "win32" && pid) {
				try { execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" }); } catch { gCloudflaredProc.kill(); }
			} else {
				gCloudflaredProc.kill("SIGTERM");
			}
		} catch { /* ignore */ }
		gCloudflaredProc = null;
	}
	gCloudflareTunnelUrl = "";
}

function buildProjectPageUrl(originBase: string): string {
	const parsed = new URL(gAppJSON.url);
	const pathname = (parsed.pathname || "").replace(/\/+$/, "");
	const projectName = GetProjName(gAppJSON.projectPath);
	const base = originBase.replace(/\/+$/, "");
	return `${base}${pathname}/${gAppJSON.projectPath}/${projectName}.${gAppJSON.page}`.replace(/([^:]\/)\/+/g, "$1");
}

async function startCloudflareTunnel(): Promise<{ ok: boolean; url?: string; msg?: string }> {
	if (gCloudflaredProc && gCloudflareTunnelUrl) {
		return { ok: true, url: gCloudflareTunnelUrl };
	}
	// 이전 잔여 프로세스 정리
	stopCloudflareTunnel();

	const binPath = await ensureCloudflared();
	if (!binPath) return { ok: false, msg: "Failed to download cloudflared." };

	const parsed = new URL(gAppJSON.url);
	const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
	const localTarget = `http://127.0.0.1:${port}`;

	return new Promise((resolve) => {
		let settled = false;
		let buf = "";
		const finish = (result: { ok: boolean; url?: string; msg?: string }) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve(result);
		};

		let proc: ChildProcess;
		try {
			// QUIC(UDP)은 공인 포트가 막힌 네트워크에서 같이 막혀 있는 경우가 많아 연결 시도가 지연/실패하기 쉽다.
			// 웹 브라우징이 되는 환경이면 거의 항상 열려있는 TCP 443 기반 http2로 강제해 지연 요인을 없앤다.
			proc = spawn(binPath, ["tunnel", "--protocol", "http2", "--url", localTarget], {
				stdio: ["ignore", "pipe", "pipe"],
				windowsHide: true,
			});
		} catch (e: any) {
			finish({ ok: false, msg: e?.message ?? String(e) });
			return;
		}
		gCloudflaredProc = proc;

		let urlFound = false;
		const onChunk = (chunk: Buffer) => {
			const text = chunk.toString();
			buf += text;
			CConsol.Log("[cloudflared] " + text.trim());
			// Quick Tunnel URL: https://xxxx.trycloudflare.com
			const m = buf.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
			if (m && !urlFound) {
				urlFound = true;
				clearTimeout(timer); // URL 대기 타임아웃 해제: 검증 단계는 별도 재시도 예산(아래)으로 진행
				const tunnelOrigin = m[0];
				const pageUrl = buildProjectPageUrl(tunnelOrigin);
				CConsol.Log("[Cloudflare] tunnel URL received, verifying page is live: " + pageUrl);
				// 로컬 오리진은 이미 떠 있는 서버라 항상 즉시 200이 나와 검증 의미가 없다.
				// 실제 지연은 Cloudflare 엣지↔오리진 터널 라우팅이 자리잡는 시간이므로 공개 URL로 확인해야 하며,
				// 사용자 실측상 계속 재시도하면 결국 뜨는 경우가 많아 재시도 예산을 넉넉히 준다(최대 약 2분).
				checkHttpRetry(pageUrl, 24, 4000).then((live) => {
					if (settled) return;
					if (!live) {
						finish({ ok: false, msg: "Cloudflare tunnel started but the page did not respond." });
						return;
					}
					gCloudflareTunnelUrl = pageUrl;
					CConsol.Log("[Cloudflare] tunnel ready: " + pageUrl);
					finish({ ok: true, url: pageUrl });
				});
			}
		};
		proc.stdout?.on("data", onChunk);
		proc.stderr?.on("data", onChunk);
		proc.on("error", (err) => {
			gCloudflaredProc = null;
			finish({ ok: false, msg: err.message });
		});
		proc.on("close", (code) => {
			gCloudflaredProc = null;
			if (!settled) finish({ ok: false, msg: `cloudflared exited (code ${code})` });
			else gCloudflareTunnelUrl = "";
		});

		const timer = setTimeout(() => {
			if (settled) return;
			// URL을 못 받은 채 시간 초과면 잔여 프로세스 종료
			try {
				if (process.platform === "win32" && proc.pid) {
					try { execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" }); } catch { proc.kill(); }
				} else {
					proc.kill("SIGTERM");
				}
			} catch { /* ignore */ }
			gCloudflaredProc = null;
			finish({ ok: false, msg: "Timed out waiting for Cloudflare tunnel URL." });
		}, 60000); // 최초 실행 시 바이너리 준비 직후 cloudflared가 엣지에 등록되는 데 시간이 걸릴 수 있어 넉넉히 잡는다.
	});
}

ipcMain.handle("StartCloudflareTunnel", async (_event) => {
	try {
		const r = await startCloudflareTunnel();
		return JSON.stringify(r);
	} catch (e: any) {
		return JSON.stringify({ ok: false, msg: e?.message ?? String(e) });
	}
});
ipcMain.handle("StopCloudflareTunnel", async (_event) => {
	stopCloudflareTunnel();
	return JSON.stringify({ ok: true });
});

ipcMain.handle("RunBrowser", async (_event,_url) => {
	try {
		await shell.openExternal(_url);
		return true;
	} catch (e) {
		console.error("❌ Failed to open browser:", e);
		return false;
	}
});
ipcMain.handle("ICONSize", async (_event,_imgFile) => {
	let savePath=CPath.WorkingPath()+gAppJSON.projectPath+"/"+_imgFile;
	let buf=await CFile.Load(savePath);
	try {
        const size = imageSize(Buffer.from(buf));
        console.log(`📏 ICON Size = ${size.width} x ${size.height}`);
		return `${size.width}x${size.height}`;
    } catch (e) {
        console.error("❌ 이미지 크기 분석 실패:", e);
    }
	return "256x256";
});
ipcMain.handle("FileSave", async (_event,_json: {
	type:string,filename:string,data:string
}) => {
	let savePath=CPath.WorkingPath()+gAppJSON.projectPath+"/Canvas/";
	await CFile.Save(_json.data,savePath+_json.filename);

});
var gPaths=[];
ipcMain.handle("FileDropped", async (_event, _paths: string[]) => {
    const basePath = (path.resolve(CPath.WorkingPath(), gAppJSON.projectPath) + path.sep).replace(/\\/g, "/");
	//CConsol.Log("FileDropped : "+_paths);
	//CConsol.Log("basePath : "+basePath);
    const resultPaths = _paths.map(fullPath => {
        if (fullPath.startsWith(basePath)) {
            return fullPath.slice(basePath.length).replace(/\\/g, "/");
        } else {
            return null;
        }
    });

    gPaths = resultPaths;

    return resultPaths; // optional: 클라이언트에게도 반환
});
ipcMain.handle("FileDroppedPath", async (_event,_paths) => {
	return JSON.stringify(gPaths);
});

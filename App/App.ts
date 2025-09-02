import { app, BrowserWindow,ipcMain ,screen,dialog,shell   } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as os from 'os'
import * as https from 'https';
import * as fs from "fs";
import { imageSize } from 'image-size';

import { execSync } from 'child_process';

import {CFile} from '../artgine/system/CFile.js';
import {CUtil} from '../artgine/basic/CUtil.js';
import {CJSON} from '../artgine/basic/CJSON.js';
import {CAlert} from '../artgine/basic/CAlert.js';
import {CConsol} from '../artgine/basic/CConsol.js';
import {CCMDMgr} from './CCMDMgr.js';
import {CPath} from '../artgine/basic/CPath.js';
import {CString} from '../artgine/basic/CString.js';


import { BackUp, DependenciesChk, ExtractServiceWorkerConfig, GenerateCClassPushes, GetFolderCanvasFileName, GetNowString, GetPluginArr,  GetPluginMap,  GetProjName, LoadPluginMap, PluginMapDependenciesChk, ReplaceArtginePathsInFolder, WaitForBuild } from './AppFunc.js';
import { CServerMain } from '../artgine/network/CServerMain.js';
import { CUniqueID } from '../artgine/basic/CUniqueID.js';

// __dirname 대체 코드 (TS + ESM 환경)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let gMainWindow: BrowserWindow | null = null;
var gWebServer : CServerMain=null;
var gRunPage=false;

//CConsol.Log("__dirname : "+__dirname);
//CConsol.Log("CPath.PHPC() : "+CPath.PHPC());
const isWindows = os.platform() === 'win32';
let gAppRootPath=true;
let initBuf=await CFile.Load(CPath.PHPC()+"App.json");
if(initBuf==null)
{
	gAppRootPath=false;
	initBuf=await CFile.Load(path.join(__dirname, "App.json"));
}
if(initBuf==null)
{
    CAlert.E("error");
    app.exit(1);
}
else
{
	CConsol.Log("App.json Load!");
	LoadPluginMap([CPath.PHPC()+"/plugin/",CPath.PHPC()+"/artgine"]);
}


type ProgramType = 'developer' | 'client' | 'server';
var gAppJSON =new CJSON(CUtil.ArrayToString(initBuf)).ToJSON(
	{"width":1024,"height":768,"fullScreen":false,"program":"client","url":"","projectPath":"","page":"html",
		"server":"","github":false,"tsc":true}
);
var gTSCPID=0;
if(gAppJSON.tsc)
{
	CCMDMgr.RunCMD("npx tsc -w", true).then((_pid)=>{
		gTSCPID=_pid;
		CConsol.Log("TSC Build");
	});
}


const createWindow = () => {
    gMainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        autoHideMenuBar: true, // 메뉴바 제거
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

	
		gWebServer=new CServerMain(Number(port),pathname,gAppJSON.projectPath);
		
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
		gMainWindow.loadFile(CPath.PHPC()+projectPath+"/"+projectName+".html");
		
		CConsol.Log("RunPage loadFile : "+CPath.PHPC()+projectPath+"/"+projectName+".html");
	}
	else
	{
		gMainWindow.loadURL(url+"/"+projectPath+"/"+projectName+".html");
		CConsol.Log("RunPage loadURL : "+url+"/"+projectPath+"/"+projectName+".html");
	}
	
	
}
app.whenReady().then(() => {
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
		gMainWindow.setSize(480, 420);
		gMainWindow.center();

		gMainWindow.loadFile(path.join(__dirname, 'Server.html'));
		if(gAppJSON.server.indexOf("web")==-1)
			gAppJSON.server="webServer+other";
		RunServer();
	}
	

});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// 앱 종료 시 TSC 프로세스 정리
app.on('before-quit', async () => {
    if (gTSCPID && gTSCPID > 0) {
        CConsol.Log(`TSC 프로세스 종료 중... (PID: ${gTSCPID})`);
        await CCMDMgr.KillPID(gTSCPID);
        gTSCPID = 0;
    }
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
			const folderPath = path.resolve(CPath.PHPC()+gAppJSON.projectPath);
			let projectName=GetProjName(gAppJSON.projectPath);
			CCMDMgr.VSCodeOpenCode(folderPath+"/"+projectName+".ts");
		}
	}
	
	if(_key=="F7")
	{
		const folderPath = path.resolve(CPath.PHPC()+gAppJSON.projectPath);
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
ipcMain.handle("BuildRun", async (_event) => {
	if(CCMDMgr.IsTSC()==false)
		await CCMDMgr.RunCMD("npm install",false);

	await CCMDMgr.RunCMD("npx tsc -w",true);

	
	
	return false;
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


	let rootPath = CPath.PHPC();
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
        buttons: ['예', '아니오'],
        defaultId: 0,
        cancelId: 1,
        title: '재시작 확인',
        message: '재시작하시겠습니까?',
    });

    if (result === 0) { // '예' 선택
        app.relaunch();   // 현재 실행중인 경로로 재실행
        app.exit(0);      // 현재 프로세스 종료
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

	const depth = (_json.projectPath.match(/\//g) || []).length;
	let upFolder = "../"+"../".repeat(depth);
	//let upProjPath="../"+"../".repeat(depth);

	
	let projectName=GetProjName(_json.projectPath);
	let savePath=CPath.PHPC()+_json.projectPath+"/"+projectName;

	buf=await CFile.Load(savePath+".html");
	let oHTML=CUtil.ArrayToString(buf);

	buf=await CFile.Load(savePath+".ts");
	let oTS=CUtil.ArrayToString(buf);

	//buf=await CFile.Load(savePath+".webmanifest");
	let oMF=_json.manifast;
	//CConsol.Log(oMF);
	


	let IStr="";
	let MStr="";
	let EStr="";

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
		
		await CFile.Save(startBatContent, CPath.PHPC()+_json.projectPath+"/chrome_start.bat");
	};
	if(_json.appJSON.github==true)
	{
		upFolder="https://06fs4dix.github.io/Artgine/";
		
		ChromeStartCreate();
	}

	//이건 사용자가 직접 만든거다
	if(oHTML!="" && oHTML.indexOf("EntryPoint")==-1)
	{
		ChromeStartCreate();
		await ReplaceArtginePathsInFolder(CPath.PHPC()+_json.projectPath,upFolder,CPath.PHPC()+_json.projectPath);
		dialog.showMessageBoxSync({
			type: 'error',
			buttons: ['OK'],
			defaultId: 0,
			title: 'info',
			message: '수동으로 만들었습니다.폴더안 chrome_start.bat으로 직접 실행하세요!',
		});
		return "";
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
	if(_json.projetJSON.includes["lzstring"])
	{
		IStr+="<script src='"+upFolder+"artgine/external/legacy/lz-string-master/libs/base64-string.js'></script>\n";
		IStr+="<script src='"+upFolder+"artgine/external/legacy/lz-string-master/libs/lz-string.min.js'></script>\n";
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
	if(_json.projetJSON.includes["MonacoEditor"])
	{
		IStr+="<script type='text/javascript' src='"+upFolder+"artgine/external/legacy/monaco-editor/min/vs/loader.js'></script>\n";
	}

	
	IStr+="<link rel='manifest' href='./"+projectName+".webmanifest'/>\n";


	
	//IStr+="<script type='module' src='"+upFolder+"artgine/artgine.js'></script>\n";
	
	let canvasList=GetFolderCanvasFileName(CPath.PHPC()+_json.projectPath+"/Canvas");

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
	

	let pos=bHTML.indexOf("<!--Include-->");
	bHTML=CString.InsertAt(bHTML,pos+14,IStr);

	if(oHTML!="")
	{
		pos=bHTML.indexOf("<!--EntryPoint-->");
		bHTML=bHTML.substring(0,bHTML.indexOf("<!--EntryPoint-->")+17);
		//모듈이 포함 안되어 있으면 강제로 넣음
		if(oHTML.indexOf(projectName+".js")==-1)
			bHTML+="<script type='module' src='"+projectName+".js'></script>\n";
		bHTML=CString.InsertAt(bHTML,pos+17,oHTML.substring(oHTML.indexOf("<!--EntryPoint-->")+17,oHTML.length));
	}

	if(oMF!="")
	{
		bMF=JSON.stringify(oMF);
	}
	

	if(oTS!="")
	{
		
		pos=bTS.indexOf("//EntryPoint");
		let epStr=oTS.substring(oTS.indexOf("//EntryPoint")+12,oTS.length);
		//if(_json.appJSON.github==true)
		
		
		epStr = epStr.replace(
			/(["'])[^"']*?((?:artgine|plugin)\/[^"']+)/g,
			(match, quote, path) => {
				// upFolder 끝 / 제거, path 앞 / 제거 후 결합
				const cleanUpFolder = upFolder.replace(/\/+$/, '');
				const cleanPath = path.replace(/^\/+/, '');
				return `${quote}${cleanUpFolder}/${cleanPath}`;
			}
		);

		await ReplaceArtginePathsInFolder(CPath.PHPC()+_json.projectPath,upFolder,CPath.PHPC()+_json.projectPath);
		

		bTS=CString.InsertAt(bTS,pos+12,epStr);
		
		

	}
	else
	{
		bTS+="\nimport {CObject} from \""+upFolder+"artgine/basic/CObject.js\"";
	}
	
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
	
	//CConsol.Log("mIAuto L "+_json.projetJSON.preference.mIAuto);
	if(_json.projetJSON.preference.mIAuto)
	{
		pfStr+= "\nimport {CAtelier} from \""+upFolder+"artgine/canvas/CAtelier.js\";\n";
		pfStr+= "\nimport {CPlugin} from \""+upFolder+"artgine/util/CPlugin.js\";\n";
		for(let p in _json.projetJSON.dependencies)
		{
			//let pInfo=GetPluginMap().get(p);
			pfStr+="CPlugin.PushPath('"+p+"','"+upFolder+"plugin/"+p+"/');\n";
			pfStr+="import \""+upFolder+"plugin/"+p+"/"+p+".js\"\n";
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
	
	bTS=CString.InsertAt(bTS,bTS.indexOf("//Version")+9,"\nconst version=\'"+CUniqueID.Get()+"';\n"+"import \""+upFolder+"artgine/artgine.js\"\n");
	

	

	bTS=CString.InsertAt(bTS,bTS.indexOf("//Atelier")+9,pfStr);

	let ClassStr="import {CClass} from \""+upFolder+"artgine/basic/CClass.js\";\n";
	ClassStr+=GenerateCClassPushes(CPath.PHPC()+_json.projectPath,savePath+".ts");
	//ClassStr+="\nimport \""+upFolder+"artgine/artgine.js\";\n";
	
	

	bTS=CString.InsertAt(bTS,bTS.indexOf("//Class")+7,"\n"+ClassStr);

	CCMDMgr.CreateEmptyFolder(CPath.PHPC()+_json.projectPath+"/Canvas");
	CCMDMgr.CreateEmptyFolder(CPath.PHPC()+_json.projectPath+"/BackUp");
	BackUp(CPath.PHPC()+_json.projectPath+"/BackUp",CPath.PHPC()+_json.projectPath+"/Canvas");

	await CFile.Save(bSW,CPath.PHPC()+_json.projectPath+"/ServiceWorker.js");
	await CFile.Save(bMF,savePath+".webmanifest");
	await CFile.Save(bHTML,savePath+".html");
	await CFile.Save(bTS,savePath+".ts");
	await CFile.Save(_json.projetJSON,savePath+".json");
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
	
	let appChange=false;
	if (gAppJSON.program !== _json.appJSON.program) 
		appChange=true;
	
	gAppJSON=_json.appJSON;
	
	if(gAppRootPath)
		CFile.Save(gAppJSON,CPath.PHPC()+"App.json");
	else
		CFile.Save(gAppJSON,path.join(__dirname, "App.json"));
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
	let savePath=CPath.PHPC()+_json.projectPath+"/"+projectName;

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
ipcMain.handle("LoadPlugin", async (_event,) => 
{
	return JSON.stringify(GetPluginArr());
});
ipcMain.handle("LoadManifest", async (_event,_json: {
	projectPath,
}) => {
	let projectName=GetProjName(_json.projectPath);
	let savePath=CPath.PHPC()+_json.projectPath+"/"+projectName;
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
	let savePath=CPath.PHPC()+_json.projectPath+"/";

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
	bSW.CACHE_NAME="CACHE_NAME_"+GetNowString();
	
	return JSON.stringify(bSW);
});

//server========================================================

// ✅ 1. 로컬(사설) IP 확인 함수
export function GetPrivateIP(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]!) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1'; // fallback
}

// ✅ 2. 공인 IP 확인 함수 (우선 사이트 → 실패 시 대체 사이트 사용)
export async function GetPublicIP(): Promise<string> {
    const ipServices = [
        'https://api.ipify.org',
        'https://ifconfig.me/ip',
        'https://ipinfo.io/ip',
    ];

    for (const url of ipServices) {
        try {
            const ip = await fetchText(url);
            if (ip && isValidIP(ip)) return ip;
        } catch (err) {
            console.warn(`⚠️ Failed to fetch from ${url}`);
        }
    }

    return 'Unavailable';
}

// 🔧 텍스트 응답용 fetch 함수 (https 전용)
function fetchText(url: string): Promise<string> {
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

// 🔍 IPv4 유효성 검사
function isValidIP(ip: string): boolean {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
}
ipcMain.handle("GetIPInfo", async (_event) => {
	const parsed = new URL(gAppJSON.url);
	const port = parsed.port;       // "8080"
	const protocol = parsed.protocol;       // "8080"
	const pathname = parsed.pathname; // "/Artgine"

	let projectName=GetProjName(gAppJSON.projectPath);
	let ipInfo={private:"",public:"",url:""};
	ipInfo.private=GetPrivateIP();
	ipInfo.public=await GetPublicIP();

	ipInfo.url=gAppJSON.url+"/"+gAppJSON.projectPath+"/"+projectName+"."+gAppJSON.page;
	ipInfo.private=protocol+"//"+ipInfo.private+":"+port+pathname+"/"+gAppJSON.projectPath+"/"+projectName+"."+gAppJSON.page;
	ipInfo.public=protocol+"//"+ipInfo.public+":"+port+pathname+"/"+gAppJSON.projectPath+"/"+projectName+"."+gAppJSON.page;

	CConsol.Log(ipInfo.private+"\n"+ipInfo.public);

	return JSON.stringify(ipInfo);
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
	let savePath=CPath.PHPC()+gAppJSON.projectPath+"/"+_imgFile;
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
	let savePath=CPath.PHPC()+gAppJSON.projectPath+"/Canvas/";
	await CFile.Save(_json.data,savePath+_json.filename);

});
var gPaths=[];
ipcMain.handle("FileDropped", async (_event, _paths: string[]) => {
    const basePath = (path.resolve(CPath.PHPC(), gAppJSON.projectPath) + path.sep).replace(/\\/g, "/");
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
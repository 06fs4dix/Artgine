//import CWebView from "../lib/artgine/core/system/CWebView.js";

const { contextBridge, ipcRenderer,webUtils  } = require('electron'); // ✅ CommonJS 문법

const url = require("url");
//const currentHTMLPath = path.dirname(url.fileURLToPath(window.location.href));


console.log("[Preload] Loaded!");
var gPaths=[];
contextBridge.exposeInMainWorld("electronAPI", {
	ipcRenderer: {
		invoke: (...args) => ipcRenderer.invoke(...args),
		send: (...args) => ipcRenderer.send(...args),
		on: (...args) => ipcRenderer.on(...args),
		removeListener: (...args) => ipcRenderer.removeListener(...args)
	}
	// ,
	// //handleDrop: (filePath) => ipcRenderer.send("file-dropped", filePath)
	// handleDrop: async (files: FileList) => {
	// 	// for (const [i, file] of Array.from(files).entries()) 
	// 	// {
	// 	// 	//const path = webUtils.getPathForFile(file);
	// 	// 	file.path=gPaths[i];
	// 	// }
	// 	return gPaths;
	// }
});



function getCommonBase(path1: string, path2: string): string {
	const parts1 = path1.split(/[\\/]/);
	const parts2 = path2.split(/[\\/]/);
	const len = Math.min(parts1.length, parts2.length);

	let commonParts = [];
	for (let i = 0; i < len; i++) {
		if (parts1[i] !== parts2[i]) break;
		commonParts.push(parts1[i]);
	}
	return commonParts.join("/");
}

window.addEventListener("DOMContentLoaded", () => {
  console.log("[Preload] DOMContentLoaded!");

  window.addEventListener("dragover", (e) => e.preventDefault());

  window.addEventListener("drop", async (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) {
      //console.log("❌ 파일 없음");
      return;
    }

    

	let relPaths=[];
	for (const file of files) {
		const fullPath = webUtils.getPathForFile(file)?.replace(/\\/g, "/");
		relPaths.push(fullPath); // 절대 경로지만 임시로 relPaths에 저장
	}

	ipcRenderer.invoke("FileDropped", relPaths);
	//gPaths=relPaths;

  },{ capture: true });
});

window.addEventListener("keyup", (e) => {
	
	let key = e.key;
	if(e.keyCode ==115 && e.ctrlKey==false)	ipcRenderer.invoke("KeyUp", "F4");
	if(e.keyCode ==116 )	ipcRenderer.invoke("KeyUp", "F5");
	if(e.keyCode ==118 )	ipcRenderer.invoke("KeyUp", "F7");
	if(e.keyCode ==119 )	ipcRenderer.invoke("KeyUp", "F8");
	if(e.keyCode ==120 )	ipcRenderer.invoke("KeyUp", "F9");
	if(e.keyCode ==123 )	ipcRenderer.invoke("KeyUp", "F12");
	
});


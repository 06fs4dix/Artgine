const { contextBridge, ipcRenderer, webUtils } = require('electron');
const url = require("url");
console.log("[Preload] Loaded!");
var gPaths = [];
contextBridge.exposeInMainWorld("electronAPI", {
    ipcRenderer: {
        invoke: (...args) => ipcRenderer.invoke(...args),
        send: (...args) => ipcRenderer.send(...args),
        on: (...args) => ipcRenderer.on(...args),
        removeListener: (...args) => ipcRenderer.removeListener(...args)
    }
});
function getCommonBase(path1, path2) {
    const parts1 = path1.split(/[\\/]/);
    const parts2 = path2.split(/[\\/]/);
    const len = Math.min(parts1.length, parts2.length);
    let commonParts = [];
    for (let i = 0; i < len; i++) {
        if (parts1[i] !== parts2[i])
            break;
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
            return;
        }
        let relPaths = [];
        for (const file of files) {
            const fullPath = webUtils.getPathForFile(file)?.replace(/\\/g, "/");
            relPaths.push(fullPath);
        }
        ipcRenderer.invoke("FileDropped", relPaths);
    }, { capture: true });
});
window.addEventListener("keyup", (e) => {
    let key = e.key;
    if (e.keyCode == 115 && e.ctrlKey == false)
        ipcRenderer.invoke("KeyUp", "F4");
    if (e.keyCode == 116)
        ipcRenderer.invoke("KeyUp", "F5");
    if (e.keyCode == 118)
        ipcRenderer.invoke("KeyUp", "F7");
    if (e.keyCode == 119)
        ipcRenderer.invoke("KeyUp", "F8");
    if (e.keyCode == 120)
        ipcRenderer.invoke("KeyUp", "F9");
    if (e.keyCode == 123)
        ipcRenderer.invoke("KeyUp", "F12");
});

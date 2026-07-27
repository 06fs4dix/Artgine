import { CAlert } from "../artgine/basic/CAlert.js";
import { CServerMain } from "../artgine/network/CServerMain.js";
import { CCMDMgr } from "../artgine/system/CCMDMgr.js";
import { GetAppJSON } from "./MainFunc.js";
var gAppJSON = await GetAppJSON();
if (gAppJSON == null) {
    process.exit(1);
}
await CCMDMgr.NPMInstall(["*Basic"]);
const parsed = gAppJSON.url ? new URL(gAppJSON.url) : null;
const port = Number(process.argv[2] ?? parsed?.port ?? '8050');
const pathname = parsed?.pathname ?? '/Artgine';
var gWebServer = new CServerMain(port, pathname, gAppJSON);
if (await gWebServer.Init()) {
    CAlert.E("server start error!");
    process.exit(1);
}
console.log(`\nServerStart`);
console.log(`http://localhost:${port}${pathname}\n`);
let gShutdownStarted = false;
function ShutdownOnParentGone(_reason) {
    if (gShutdownStarted)
        return;
    gShutdownStarted = true;
    clearInterval(gParentWatchdog);
    console.log(`\nParent process gone (${_reason}) — shutting down.`);
    try {
        gWebServer.Destroy();
    }
    catch { }
    process.exit(0);
}
process.stdin.on('end', () => ShutdownOnParentGone('stdin end'));
process.stdin.on('close', () => ShutdownOnParentGone('stdin close'));
process.stdin.resume();
const gParentPid = process.ppid;
const gParentWatchdog = setInterval(() => {
    let parentAlive = true;
    try {
        process.kill(gParentPid, 0);
    }
    catch {
        parentAlive = false;
    }
    if (parentAlive)
        return;
    ShutdownOnParentGone(`ppid ${gParentPid} not found`);
}, 2000);

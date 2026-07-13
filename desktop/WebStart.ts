import { CAlert } from "../artgine/basic/CAlert.js";
import { CServerMain } from "../artgine/network/CServerMain.js";
import { GetAppJSON } from "./MainFunc.js";

var gAppJSON=await GetAppJSON();
if(gAppJSON==null)
{
    process.exit(1);
}
const parsed = gAppJSON.url ? new URL(gAppJSON.url) : null;
const port = Number(process.argv[2] ?? parsed?.port ?? '8050');
const pathname = parsed?.pathname ?? '/Artgine';

var gWebServer=new CServerMain(port, pathname, gAppJSON);

if(await gWebServer.Init())
{
    CAlert.E("server start error!");
    process.exit(1);
}

console.log(`\nServerStart`);
console.log(`http://localhost:${port}${pathname}\n`);

// npm(부모)이 Windows에서 Ctrl+C를 이 자식 프로세스로 전달하지 않는 경우가 있어(별도
// 프로세스 그룹으로 스폰됨) SIGINT 핸들러가 아예 호출되지 못하고 프로세스가 포트를 문 채
// 고아로 남을 수 있다. 두 가지 방법으로 부모 종료를 감지해 먼저 잡히는 쪽에서 정리 후 종료한다:
// (1) stdin 종료 — 부모가 물려준 stdin 핸들이 닫히면 즉시 'end'/'close'가 발생한다(신호 지연 없음).
// (2) 부모 PID 폴링 — stdin이 파이프가 아니라 콘솔에 직접 연결돼 있어 (1)이 안 잡히는 경우의 보조 수단.
//     단, Windows PID는 짧은 시간 안에 다른 프로세스로 재사용될 수 있어 이 방식만으로는
//     재사용된 PID를 원래 부모로 오판할 위험이 있다 — 그래서 (1)을 우선 수단으로 둔다.
let gShutdownStarted = false;
function ShutdownOnParentGone(_reason: string) {
    if (gShutdownStarted) return;
    gShutdownStarted = true;
    clearInterval(gParentWatchdog);
    console.log(`\nParent process gone (${_reason}) — shutting down.`);
    try { gWebServer.Destroy(); } catch {}
    process.exit(0);
}

process.stdin.on('end', () => ShutdownOnParentGone('stdin end'));
process.stdin.on('close', () => ShutdownOnParentGone('stdin close'));
process.stdin.resume();

const gParentPid = process.ppid;
const gParentWatchdog = setInterval(() => {
    let parentAlive = true;
    try { process.kill(gParentPid, 0); } catch { parentAlive = false; }
    if (parentAlive) return;
    ShutdownOnParentGone(`ppid ${gParentPid} not found`);
}, 2000);
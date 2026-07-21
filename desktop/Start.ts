import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { CCMDMgr } from "./CCMDMgr.js";

function GetStartPort(_settingsFileName: string): number | null {
    const mainPath = fs.existsSync(_settingsFileName) ? _settingsFileName : path.join("desktop", _settingsFileName);
    if (!fs.existsSync(mainPath)) return null;

    try {
        const mainJSON = JSON.parse(fs.readFileSync(mainPath, "utf8"));
        if (mainJSON.url == null || mainJSON.url === "") return null;

        const url = new URL(mainJSON.url);
        const port = Number(url.port);
        return Number.isFinite(port) ? port : null;
    } catch {
        return null;
    }
}

function FindPortPIDs(_port: number): number[] {
    if (process.platform === "win32") {
        const output = execFileSync("netstat", ["-ano"], { encoding: "utf8", windowsHide: true });
        const pids = new Set<number>();

        for (const line of output.split(/\r?\n/)) {
            const part = line.trim().split(/\s+/);
            if (part.length < 5 || part[0] !== "TCP" || part[3] !== "LISTENING") continue;
            if (!part[1].endsWith(`:${_port}`)) continue;

            const pid = Number(part[4]);
            if (Number.isFinite(pid)) pids.add(pid);
        }

        return [...pids];
    }

    try {
        const output = execFileSync("lsof", ["-ti", `tcp:${_port}`, "-sTCP:LISTEN"], { encoding: "utf8" });
        return output.split(/\r?\n/).map(v => Number(v.trim())).filter(v => Number.isFinite(v));
    } catch {
        return [];
    }
}

function IsElectronPID(_pid: number): boolean {
    try {
        if (process.platform === "win32") {
            const command = `(Get-CimInstance Win32_Process -Filter "ProcessId=${_pid}").CommandLine`;
            const output = execFileSync("powershell", ["-NoLogo", "-NoProfile", "-Command", command], {
                encoding: "utf8",
                windowsHide: true,
            });
            return output.toLowerCase().includes("electron");
        }

        const output = execFileSync("ps", ["-p", String(_pid), "-o", "command="], { encoding: "utf8" });
        return output.toLowerCase().includes("electron");
    } catch {
        return false;
    }
}

function KillElectronOnPort(_port: number): void {
    for (const pid of FindPortPIDs(_port)) {
        if (!IsElectronPID(pid)) continue;

        console.log(`Kill existing Electron on port ${_port}. pid=${pid}`);
        if (process.platform === "win32") {
            execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
        } else {
            try {
                process.kill(-pid, "SIGKILL");
            } catch {
                process.kill(pid, "SIGKILL");
            }
        }
    }
}

if (CCMDMgr.IsTSC() == false || CCMDMgr.GetFileCount("node_modules")==0)
{
    await CCMDMgr.RunCMD("npm install --production", false);
	await CCMDMgr.RunCMD("npx tsc", false);
}
//await CCMDMgr.RunCMD("git submodule update --remote --force", false);

// 임의 settings 파일명 지정: `npm run start -- myconfig.json` 형태의 위치 인자
const settingsFileName = process.argv[2] ?? "settings.json";

const startPort = GetStartPort(settingsFileName);
if (startPort != null) {
    KillElectronOnPort(startPort);
}

// Windows의 npx.cmd -> electron.cmd 배치 체인은 중첩 따옴표를 그대로 통과시켜버리므로
// (따옴표까지 파일명 문자열에 포함됨) 공백이 있는 경우에만 따옴표를 붙인다.
const electronArg = /\s/.test(settingsFileName) ? `"${settingsFileName}"` : settingsFileName;
// Linux에서는 Electron의 setuid 샌드박스(chrome-sandbox)가 root 소유 + 4755 권한을
// 요구해, 소스로 직접 실행하면 권한 미설정으로 즉시 종료된다(FATAL: setuid_sandbox_host).
// Main.ts의 app.commandLine.appendSwitch('no-sandbox')는 zygote 프로세스엔 적용되지 않아
// 이 에러를 못 막으므로, electron 실행 시 명령행 인자로 직접 --no-sandbox를 전달한다.
// Windows/Mac은 샌드박스가 정상 동작하므로 붙이지 않는다.
const sandboxArg = process.platform === "linux" ? " --no-sandbox" : "";
await CCMDMgr.RunCMD(`npx electron . ${electronArg}${sandboxArg}`, false);


                

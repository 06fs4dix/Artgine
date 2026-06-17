import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { CCMDMgr } from "./CCMDMgr.js";

function GetStartPort(): number | null {
    const mainPath = fs.existsSync("Main.json") ? "Main.json" : path.join("desktop", "Main.json");
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

const startPort = GetStartPort();
if (startPort != null) {
    KillElectronOnPort(startPort);
}

await CCMDMgr.RunCMD("npx electron .", false);


                

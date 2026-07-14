import { execSync, spawn, exec } from 'child_process';
import { CUtilSystem } from '../artgine/system/CUtilSystem.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
const execAsync = promisify(exec);
export class CCMDMgr {
    static IsVSCodeInstall() {
        try {
            const result = execSync('code --version', { stdio: 'pipe' }).toString();
            return !!result.trim();
        }
        catch (e) {
            return false;
        }
    }
    static IsTSC() {
        try {
            const result = execSync('npx tsc --version', { stdio: 'pipe' }).toString();
            return !!result.trim();
        }
        catch (e) {
            return false;
        }
    }
    static GetFileCount(_pname) {
        if (!fs.existsSync(_pname))
            return 0;
        const stat = fs.statSync(_pname);
        if (!stat.isDirectory())
            return 0;
        const files = fs.readdirSync(_pname);
        return files.length;
    }
    static async Delay(ms) {
        await new Promise(res => setTimeout(res, ms));
    }
    static async KillPID(pid) {
        try {
            await CUtilSystem.KillPID(pid);
            return true;
        }
        catch (e) {
            console.warn(`KillPID 실패(pid=${pid}):`, e);
            return false;
        }
    }
    static async RunCMD(_cmd, _new) {
        const platform = os.platform();
        if (_new) {
            try {
                if (platform === 'win32') {
                    const child = spawn('cmd.exe', ['/k', `chcp 65001 >nul && ${_cmd}`], {
                        detached: true,
                        stdio: 'ignore',
                        windowsHide: false,
                    });
                    child.unref();
                    return child.pid ?? null;
                }
                else if (platform === 'darwin') {
                    const child = spawn('osascript', [
                        '-e',
                        `tell app "Terminal" to do script "${_cmd.replace(/"/g, '\\"')}"`
                    ], {
                        detached: true,
                        stdio: 'ignore',
                    });
                    child.unref();
                    return child.pid ?? null;
                }
                else {
                    const tryTerms = [
                        { bin: 'gnome-terminal', args: ['--', 'bash', '-c', `${_cmd}; exec bash`] },
                        { bin: 'konsole', args: ['-e', 'bash', '-c', `${_cmd}; exec bash`] },
                        { bin: 'xterm', args: ['-e', 'bash', '-c', `${_cmd}; exec bash`] },
                    ];
                    for (const t of tryTerms) {
                        if (this.IsCommandAvailable(t.bin)) {
                            const child = spawn(t.bin, t.args, { detached: true, stdio: 'ignore' });
                            child.unref();
                            return child.pid ?? null;
                        }
                    }
                    const child = spawn('bash', ['-c', _cmd], { detached: true, stdio: 'ignore' });
                    child.unref();
                    return child.pid ?? null;
                }
            }
            catch (err) {
                console.error('RunCMD (새창) 에러:', err);
                return null;
            }
        }
        else {
            const env = { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' };
            const child = (platform === 'win32'
                ? await CUtilSystem.Spawn('cmd', ['/c', `chcp 65001 >nul && ${_cmd}`], 'inherit', '', env)
                : await CUtilSystem.Spawn('bash', ['-c', _cmd], 'inherit', '', env));
            return new Promise((resolve, reject) => {
                child.on('exit', (code) => {
                    console.log(`명령어 종료됨. 종료 코드: ${code}`);
                    resolve(null);
                });
                child.on('error', (err) => {
                    console.error("RunCMD 에러:", err);
                    reject(err);
                });
            });
        }
    }
    static RunVSCode(folderPath = process.cwd()) {
        try {
            const isWin = os.platform() === 'win32';
            const absolutePath = path.resolve(folderPath);
            if (isWin) {
                const command = `code "${absolutePath}"`;
                exec(command, {
                    encoding: 'utf8',
                    env: {
                        ...process.env,
                        LANG: 'C.UTF-8',
                        LC_ALL: 'C.UTF-8',
                        PYTHONIOENCODING: 'utf-8'
                    },
                    windowsHide: true
                }, (error, stdout, stderr) => {
                    if (error) {
                        console.error('VSCode 실행 실패:', error);
                        console.log('경로:', absolutePath);
                    }
                });
            }
            else {
                const child = spawn('code', [absolutePath], {
                    detached: true,
                    stdio: 'ignore',
                    env: {
                        ...process.env,
                        LANG: 'C.UTF-8',
                        LC_ALL: 'C.UTF-8'
                    }
                });
                child.unref();
            }
        }
        catch (e) {
            console.error('VSCode 실행 실패:', e);
            console.log('경로:', folderPath);
        }
    }
    static IsCommandAvailable(command) {
        try {
            execSync(`which ${command}`, { stdio: 'pipe' });
            return true;
        }
        catch (e) {
            return false;
        }
    }
    static VSCodeOpenCode(_filePath) {
        const platform = os.platform();
        const absolutePath = path.resolve(_filePath);
        if (platform === 'win32') {
            exec(`code "${absolutePath}"`, {
                encoding: 'utf8',
                env: {
                    ...process.env,
                    LANG: 'C.UTF-8',
                    LC_ALL: 'C.UTF-8',
                    PYTHONIOENCODING: 'utf-8'
                },
                windowsHide: true
            }, (error, stdout, stderr) => {
                if (error) {
                    console.error('VS Code 실행 실패:', error);
                    console.log('파일 경로:', absolutePath);
                }
            });
        }
        else {
            exec(`code "${absolutePath}"`, {
                encoding: 'utf8',
                env: {
                    ...process.env,
                    LANG: 'C.UTF-8',
                    LC_ALL: 'C.UTF-8'
                }
            }, (error, stdout, stderr) => {
                if (error) {
                    console.error('VS Code 실행 실패:', error);
                    console.log('파일 경로:', absolutePath);
                }
            });
        }
    }
    static CreateEmptyFolder(folderPath) {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
    }
    static async IsRun(target) {
        const t = target.toLowerCase();
        try {
            if (process.platform === "win32") {
                const { stdout } = await execAsync(`powershell -NoLogo -NoProfile -Command "Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -ExpandProperty ProcessName"`, { windowsHide: true, maxBuffer: 1024 * 1024 });
                const names = stdout.split(/\r?\n/).map(s => s.trim().toLowerCase()).filter(Boolean);
                if (names.some(n => n.includes(t) || `${n}.exe` === t))
                    return true;
                const task = await execAsync(`tasklist /fo csv /nh`, { windowsHide: true, maxBuffer: 1024 * 1024 });
                return task.stdout.split(/\r?\n/).some(line => {
                    const m = line.match(/^"([^"]+)"/);
                    if (!m)
                        return false;
                    const name = m[1].toLowerCase();
                    return name.includes(t) || name === t || name === `${t}.exe`;
                });
            }
            if (process.platform === "darwin") {
                try {
                    const { stdout } = await execAsync(`osascript -e 'tell application "${target}" to (count of windows) > 0'`);
                    if (/true/i.test(stdout))
                        return true;
                }
                catch { }
                const { stdout } = await execAsync(`pgrep -ifl "${target}" || true`);
                return !!stdout.trim();
            }
            try {
                const { stdout } = await execAsync(`wmctrl -lx 2>/dev/null || true`);
                if (stdout && stdout.toLowerCase().includes(t))
                    return true;
            }
            catch { }
            const { stdout } = await execAsync(`pgrep -ifl "${target}" || true`);
            return !!stdout.trim();
        }
        catch {
            return false;
        }
    }
    static async IsVSCodeOpen() {
        if (process.platform === "win32")
            return CCMDMgr.IsRun("Code");
        if (process.platform === "darwin")
            return CCMDMgr.IsRun("Visual Studio Code");
        return CCMDMgr.IsRun("code");
    }
    static async IsTSCRun() {
        const tempName = `__tsc_check_${Date.now()}`;
        const tsPath = path.join(process.cwd(), `${tempName}.ts`);
        const jsPath = path.join(process.cwd(), `${tempName}.js`);
        const timeoutMs = 5000;
        const intervalMs = 200;
        try {
            fs.writeFileSync(tsPath, `export const __tscCheck = true;\n`);
            const start = Date.now();
            while (Date.now() - start < timeoutMs) {
                if (fs.existsSync(jsPath))
                    return true;
                await CCMDMgr.Delay(intervalMs);
            }
            return fs.existsSync(jsPath);
        }
        finally {
            try {
                if (fs.existsSync(tsPath))
                    fs.unlinkSync(tsPath);
            }
            catch (e) { }
            try {
                if (fs.existsSync(jsPath))
                    fs.unlinkSync(jsPath);
            }
            catch (e) { }
        }
    }
}

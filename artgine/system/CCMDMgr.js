import { execSync, spawn, exec } from 'child_process';
import { CUtilSystem } from './CUtilSystem.js';
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
    static sNPMPlatformOnly = {
        "dbus-next": ["linux"],
    };
    static sNPMPinnedVersion = {
        "@nut-tree-fork/nut-js": "4.2.6",
        "@xterm/addon-fit": "0.10.0",
        "@xterm/addon-unicode11": "0.8.0",
        "@xterm/addon-web-links": "0.12.0",
        "@xterm/addon-webgl": "0.19.0",
        "@xterm/headless": "5.5.0",
        "@xterm/xterm": "5.5.0",
        "adm-zip": "0.5.18",
        "compression": "1.8.1",
        "cors": "2.8.6",
        "dbus-next": "0.10.2",
        "electron": "35.2.1",
        "express": "4.22.2",
        "express-session": "1.19.0",
        "image-size": "2.0.2",
        "nedb": "1.8.0",
        "node-pty": "1.1.0",
        "nodemailer": "7.0.13",
        "playwright": "1.61.1",
        "raw-body": "3.0.2",
        "sqlite": "5.1.1",
        "sqlite3": "5.1.7",
        "typescript": "7.0.2",
        "ws": "8.21.1",
        "@types/adm-zip": "0.5.8",
        "@types/compression": "1.8.1",
        "@types/electron": "1.6.12",
        "@types/nedb": "1.8.16",
        "@types/node": "22.20.1",
        "@types/ws": "8.18.1",
        "@webgpu/types": "0.1.71",
        "del": "8.0.1",
        "electron-packager": "17.1.2",
        "gulp": "5.0.1",
        "gulp-javascript-obfuscator": "1.1.6",
        "terser": "5.49.0",
        "through2": "4.0.2",
        "vinyl-sourcemaps-apply": "0.2.1",
    };
    static sNPMPresets = {
        "Basic": [
            "electron",
            "image-size",
            "typescript",
            "@webgpu/types",
            "express",
            "express-session",
            "compression",
            "cors",
            "raw-body",
            "ws",
            "nodemailer",
        ],
        "DB": [
            "sqlite",
            "sqlite3",
            "nedb",
        ],
        "Control": [
            "playwright",
            "@nut-tree-fork/nut-js",
            "dbus-next",
            "node-pty",
            "@xterm/headless",
            "@xterm/xterm",
            "@xterm/addon-fit",
            "@xterm/addon-unicode11",
            "@xterm/addon-web-links",
            "@xterm/addon-webgl",
            "adm-zip",
        ],
        "Dev": [
            "typescript",
            "@types/node",
            "@types/ws",
            "@types/electron",
            "@types/adm-zip",
            "@types/compression",
            "@types/nedb",
        ],
        "Build": [
            "gulp",
            "gulp-javascript-obfuscator",
            "terser",
            "through2",
            "del",
            "electron-packager",
            "vinyl-sourcemaps-apply",
        ],
    };
    static GetNPMPackageName(_spec) {
        const s = _spec.trim();
        if (s.startsWith("@")) {
            const i = s.indexOf("@", 1);
            return i === -1 ? s : s.slice(0, i);
        }
        const i = s.indexOf("@");
        return i === -1 ? s : s.slice(0, i);
    }
    static GetNPMPreset(_token) {
        if (!_token.startsWith("*"))
            return null;
        const mode = _token.slice(1).trim();
        if (mode === "")
            return null;
        const key = Object.keys(CCMDMgr.sNPMPresets).find(k => k.toLowerCase() === mode.toLowerCase());
        return key != null ? CCMDMgr.sNPMPresets[key] : null;
    }
    static ExpandNPMPackages(_packages) {
        const expanded = [];
        for (const raw of _packages) {
            const spec = (raw ?? "").trim();
            if (spec === "")
                continue;
            if (spec.startsWith("*")) {
                const preset = CCMDMgr.GetNPMPreset(spec);
                if (preset == null) {
                    console.warn(`[NPMInstall] unknown preset: ${spec}`);
                    continue;
                }
                console.log(`[NPMInstall] preset ${spec} -> ${preset.join(", ")}`);
                expanded.push(...preset);
                continue;
            }
            expanded.push(spec);
        }
        const seen = new Set();
        const unique = [];
        for (const spec of expanded) {
            const name = CCMDMgr.GetNPMPackageName(spec);
            if (name === "" || seen.has(name))
                continue;
            seen.add(name);
            unique.push(spec);
        }
        return unique;
    }
    static NPMPackageInit(_packageJsonPath) {
        const pkgPath = _packageJsonPath
            ? path.resolve(_packageJsonPath)
            : path.join(process.cwd(), "package.json");
        if (!fs.existsSync(pkgPath)) {
            console.warn(`[NPMPackageInit] package.json 없음: ${pkgPath}`);
            return;
        }
        let pkg;
        try {
            pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        }
        catch (e) {
            console.error(`[NPMPackageInit] package.json 파싱 실패: ${pkgPath}`, e);
            return;
        }
        const depCount = pkg.dependencies ? Object.keys(pkg.dependencies).length : 0;
        const devCount = pkg.devDependencies ? Object.keys(pkg.devDependencies).length : 0;
        pkg.dependencies = {};
        pkg.devDependencies = {};
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
        console.log(`[NPMPackageInit] dependencies/devDependencies 초기화 (dep ${depCount} → 0, dev ${devCount} → 0)`);
        const rootDir = path.dirname(pkgPath);
        const lockNames = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
        for (const name of lockNames) {
            const lockPath = path.join(rootDir, name);
            if (fs.existsSync(lockPath)) {
                fs.unlinkSync(lockPath);
                console.log(`[NPMPackageInit] lock 삭제: ${name}`);
            }
        }
    }
    static async NPMInstall(_packages) {
        if (_packages == null || _packages.length === 0)
            return;
        const platform = process.platform;
        const expanded = CCMDMgr.ExpandNPMPackages(_packages);
        const installList = [];
        const skipped = [];
        for (const spec of expanded) {
            const name = CCMDMgr.GetNPMPackageName(spec);
            const allowed = CCMDMgr.sNPMPlatformOnly[name];
            if (allowed != null && !allowed.includes(platform)) {
                skipped.push(spec);
                continue;
            }
            const pinned = CCMDMgr.sNPMPinnedVersion[name];
            if (pinned != null) {
                const pinnedSpec = `${name}@${pinned}`;
                if (pinnedSpec !== spec) {
                    console.log(`[NPMInstall] pin ${name} -> ${pinned} (요청: ${spec})`);
                }
                installList.push(pinnedSpec);
                continue;
            }
            installList.push(spec);
        }
        if (skipped.length > 0) {
            console.log(`[NPMInstall] skip (not for ${platform}): ${skipped.join(", ")}`);
        }
        if (installList.length === 0) {
            console.log("[NPMInstall] nothing to install");
            return;
        }
        const args = installList.map(p => /\s/.test(p) ? `"${p}"` : p).join(" ");
        console.log(`[NPMInstall] npm install ${args}`);
        await CCMDMgr.RunCMDPiped(`npm install ${args}`);
    }
    static async RunCMDPiped(_cmd) {
        const platform = os.platform();
        const env = { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' };
        const child = (platform === 'win32'
            ? await CUtilSystem.Spawn('cmd', ['/c', `chcp 65001 >nul && ${_cmd}`], 'pipe', '', env)
            : await CUtilSystem.Spawn('bash', ['-c', _cmd], 'pipe', '', env));
        const pump = (_stream) => {
            if (_stream == null)
                return;
            let rest = '';
            _stream.setEncoding('utf8');
            _stream.on('data', (_chunk) => {
                const lines = (rest + _chunk).split(/\r?\n/);
                rest = lines.pop() ?? '';
                for (const line of lines)
                    console.log(line);
            });
            _stream.on('end', () => { if (rest !== '')
                console.log(rest); });
        };
        pump(child.stdout);
        pump(child.stderr);
        return new Promise((resolve, reject) => {
            child.on('close', (code) => {
                console.log(`명령어 종료됨. 종료 코드: ${code}`);
                resolve(null);
            });
            child.on('error', (err) => {
                console.error("RunCMDPiped 에러:", err);
                reject(err);
            });
        });
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
                        { bin: 'ptyxis', args: ['--', 'bash', '-c', `${_cmd}; exec bash`] },
                        { bin: 'konsole', args: ['-e', 'bash', '-c', `${_cmd}; exec bash`] },
                        { bin: 'xterm', args: ['-e', 'bash', '-c', `${_cmd}; exec bash`] },
                        { bin: 'x-terminal-emulator', args: ['-e', 'bash', '-c', `${_cmd}; exec bash`] },
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

import { execSync, spawn, exec } from 'child_process';
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
    static async KillPID(pid) {
        try {
            if (os.platform() === 'win32') {
                execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
            }
            else {
                try {
                    process.kill(-pid, 'SIGTERM');
                }
                catch {
                    process.kill(pid, 'SIGTERM');
                }
            }
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
            return new Promise((resolve, reject) => {
                let child;
                if (platform === 'win32') {
                    child = spawn('cmd', ['/c', 'chcp 65001 >nul && ' + _cmd], {
                        stdio: 'inherit',
                        env: {
                            ...process.env,
                            LANG: 'C.UTF-8',
                            LC_ALL: 'C.UTF-8'
                        }
                    });
                }
                else {
                    child = spawn('bash', ['-c', _cmd], {
                        stdio: 'inherit',
                        env: {
                            ...process.env,
                            LANG: 'C.UTF-8',
                            LC_ALL: 'C.UTF-8'
                        }
                    });
                }
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
    static async ReplaceArtginePathsInFolder(workFolder, upFolder, projPath) {
        try {
            if (!fs.existsSync(workFolder)) {
                console.error(`폴더가 존재하지 않습니다: ${workFolder}`);
                return;
            }
            const tsFiles = this.FindTSFiles(workFolder);
            if (tsFiles.length === 0) {
                console.log('처리할 TypeScript 파일이 없습니다.');
                return;
            }
            let processedCount = 0;
            let modifiedCount = 0;
            for (const filePath of tsFiles) {
                try {
                    const modified = await this.ReplaceArtginePathsInFile(filePath, upFolder, projPath);
                    processedCount++;
                    if (modified) {
                        modifiedCount++;
                    }
                }
                catch (error) {
                    console.error(`❌ 파일 처리 실패 ${filePath}:`, error);
                }
            }
        }
        catch (error) {
            console.error('ReplaceArtginePathsInFolder 실행 중 오류:', error);
        }
    }
    static FindTSFiles(folderPath) {
        const tsFiles = [];
        const searchRecursive = (currentPath) => {
            const items = fs.readdirSync(currentPath);
            for (const item of items) {
                const fullPath = path.join(currentPath, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
                        searchRecursive(fullPath);
                    }
                }
                else if (stat.isFile() && item.endsWith('.ts')) {
                    tsFiles.push(fullPath);
                }
            }
        };
        searchRecursive(folderPath);
        return tsFiles;
    }
    static async ReplaceArtginePathsInFile(filePath, upFolder, projPath) {
        try {
            let additionalLevels = 0;
            const originalContent = fs.readFileSync(filePath, 'utf8');
            if (upFolder.indexOf("http") == -1) {
                const normalizedFilePath = filePath.replace(/\\/g, '/');
                const normalizedProjPath = projPath.replace(/\\/g, '/');
                const filePathParts = normalizedFilePath.split('/');
                const projPathParts = normalizedProjPath.split('/');
                if (filePathParts.length > projPathParts.length) {
                    additionalLevels = filePathParts.length - projPathParts.length - 1;
                }
            }
            const modifiedContent = originalContent.replace(/(["'])[^"']*?((?:artgine|plugin)\/[^"']+)/g, (match, quote, path) => {
                const cleanUpFolder = upFolder.replace(/\/+$/, '');
                const cleanPath = path.replace(/^\/+/, '');
                const upPath = '../'.repeat(additionalLevels);
                return `${quote}${upPath}${cleanUpFolder}/${cleanPath}`;
            });
            if (originalContent !== modifiedContent) {
                fs.writeFileSync(filePath, modifiedContent, 'utf8');
                return true;
            }
            return false;
        }
        catch (error) {
            console.error(`파일 처리 중 오류 ${filePath}:`, error);
            return false;
        }
    }
}

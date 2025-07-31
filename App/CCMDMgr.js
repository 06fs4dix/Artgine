import { execSync, spawn, exec } from 'child_process';
import * as fs from 'fs';
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
    static async RunCMD(_cmd, _new) {
        const platform = os.platform();
        if (_new) {
            let finalCmd;
            if (platform === 'win32') {
                finalCmd = `start cmd /k "${_cmd}"`;
            }
            else if (platform === 'darwin') {
                finalCmd = `osascript -e 'tell app "Terminal" to do script "${_cmd}"'`;
            }
            else {
                if (this.IsCommandAvailable('gnome-terminal')) {
                    finalCmd = `gnome-terminal -- bash -c "${_cmd}; exec bash"`;
                }
                else if (this.IsCommandAvailable('konsole')) {
                    finalCmd = `konsole -e bash -c "${_cmd}; exec bash"`;
                }
                else if (this.IsCommandAvailable('xterm')) {
                    finalCmd = `xterm -e bash -c "${_cmd}; exec bash"`;
                }
                else {
                    console.warn("터미널 에뮬레이터를 찾을 수 없습니다. 현재 터미널에서 실행합니다.");
                    finalCmd = _cmd;
                }
            }
            try {
                await execAsync(finalCmd);
            }
            catch (err) {
                console.error("RunCMD (새창) 에러:", err);
            }
        }
        else {
            return new Promise((resolve, reject) => {
                let child;
                if (platform === 'win32') {
                    child = spawn('cmd', ['/c', _cmd], { stdio: 'inherit' });
                }
                else {
                    child = spawn('bash', ['-c', _cmd], { stdio: 'inherit' });
                }
                child.on('exit', (code) => {
                    console.log(`명령어 종료됨. 종료 코드: ${code}`);
                    resolve();
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
            const codeCommand = isWin ? 'code.cmd' : 'code';
            const child = spawn(codeCommand, [folderPath], {
                detached: true,
                stdio: 'ignore',
                shell: true
            });
            child.unref();
        }
        catch (e) {
            console.error('VSCode 실행 실패:', e);
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
        const codeCommand = platform === 'win32' ? 'code.cmd' : 'code';
        exec(`${codeCommand} "${_filePath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error('VS Code 실행 실패:', error);
            }
        });
    }
    static CreateEmptyFolder(folderPath) {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
    }
}

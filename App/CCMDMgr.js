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
    static IsEmptyFolder(_pname) {
        if (!fs.existsSync(_pname))
            return false;
        const stat = fs.statSync(_pname);
        if (!stat.isDirectory())
            return false;
        const files = fs.readdirSync(_pname);
        return files.length === 0;
    }
    static async RunCMD(_cmd, _new) {
        if (_new) {
            const finalCmd = `start cmd /k "${_cmd}"`;
            try {
                await execAsync(finalCmd);
            }
            catch (err) {
                console.error("RunCMD (새창) 에러:", err);
            }
        }
        else {
            return new Promise((resolve, reject) => {
                const child = spawn('cmd', ['/c', _cmd], { stdio: 'inherit' });
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
    static VSCodeOpenCode(_filePath) {
        exec(`code "${_filePath}"`, (error, stdout, stderr) => {
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

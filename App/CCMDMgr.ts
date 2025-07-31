import { execSync, spawn,exec } from 'child_process';

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
const execAsync = promisify(exec);
export class CCMDMgr {
    // VSCode 설치 여부 확인 (code 명령어가 PATH에 있는지)
    static IsVSCodeInstall(): boolean {
        try {
            const result = execSync('code --version', { stdio: 'pipe' }).toString();
            return !!result.trim();
        } catch (e) {
            return false;
        }
    }

    // TypeScript 설치 여부 확인 (tsc 명령어가 PATH에 있는지)
    static IsTSC(): boolean {
        try {
            const result = execSync('npx tsc --version', { stdio: 'pipe' }).toString();
            return !!result.trim();
        } catch (e) {
            return false;
        }
    }
    static GetFileCount(_pname : string)
    {
        if (!fs.existsSync(_pname)) return 0; // 폴더가 존재하지 않음

        const stat = fs.statSync(_pname);
        if (!stat.isDirectory()) return 0; // 폴더가 아님

        const files = fs.readdirSync(_pname);
        return files.length;
    }

    static async RunCMD(_cmd: string, _new: boolean): Promise<void> {
        const platform = os.platform();
        
        if (_new) {
            // 새 콘솔 창에서 실행 (종료 추적 불가)
            let finalCmd: string;
            if (platform === 'win32') {
                finalCmd = `start cmd /k "${_cmd}"`;
            } else if (platform === 'darwin') {
                // macOS
                finalCmd = `osascript -e 'tell app "Terminal" to do script "${_cmd}"'`;
            } else {
                // Linux - 다양한 터미널 에뮬레이터 지원
                if (this.IsCommandAvailable('gnome-terminal')) {
                    finalCmd = `gnome-terminal -- bash -c "${_cmd}; exec bash"`;
                } else if (this.IsCommandAvailable('konsole')) {
                    finalCmd = `konsole -e bash -c "${_cmd}; exec bash"`;
                } else if (this.IsCommandAvailable('xterm')) {
                    finalCmd = `xterm -e bash -c "${_cmd}; exec bash"`;
                } else {
                    // 터미널 에뮬레이터를 찾을 수 없는 경우 현재 터미널에서 실행
                    console.warn("터미널 에뮬레이터를 찾을 수 없습니다. 현재 터미널에서 실행합니다.");
                    finalCmd = _cmd;
                }
            }
            
            try {
                await execAsync(finalCmd);
            } catch (err) {
                console.error("RunCMD (새창) 에러:", err);
            }
        } else {
            // 현재 콘솔에서 실행하고 종료까지 대기
            return new Promise((resolve, reject) => {
                let child;
                if (platform === 'win32') {
                    child = spawn('cmd', ['/c', _cmd], { stdio: 'inherit' });
                } else {
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
    static RunVSCode(folderPath: string = process.cwd()): void {
        try {
            const isWin = os.platform() === 'win32';
            const codeCommand = isWin ? 'code.cmd' : 'code';
    
            const child = spawn(codeCommand, [folderPath], {
                detached: true,
                stdio: 'ignore',
                shell: true // <- Windows에서는 shell true가 안정적
            });
            child.unref();
        } catch (e) {
            console.error('VSCode 실행 실패:', e);
        }
    }
    static IsCommandAvailable(command: string): boolean {
        try {
            execSync(`which ${command}`, { stdio: 'pipe' });
            return true;
        } catch (e) {
            return false;
        }
    }

    static VSCodeOpenCode(_filePath: string): void 
    {
        const platform = os.platform();
        const codeCommand = platform === 'win32' ? 'code.cmd' : 'code';
        
        exec(`${codeCommand} "${_filePath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error('VS Code 실행 실패:', error);
            }
        });
    }
    static CreateEmptyFolder(folderPath: string): void 
    {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
    }
}

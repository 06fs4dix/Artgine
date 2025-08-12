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
    /**
     * 지정된 PID의 프로세스를 종료한다.
     * @param pid 종료할 프로세스 ID
     * @returns 성공 여부
     */
    static async KillPID(pid: number): Promise<boolean> {
        try {
            if (os.platform() === 'win32') {
                // Windows: taskkill로 프로세스 트리 종료
                execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
            } else {
                // Unix 계열: 프로세스 그룹 종료 시도 후 단일 프로세스 종료
                try {
                    // detached 프로세스의 경우 프로세스 그룹으로 생성됨
                    process.kill(-pid, 'SIGTERM');
                } catch {
                    // 그룹 종료 실패 시 단일 프로세스 종료
                    process.kill(pid, 'SIGTERM');
                }
            }
            return true;
        } catch (e) {
            console.warn(`KillPID 실패(pid=${pid}):`, e);
            return false;
        }
    }
    /**
     * 명령을 실행한다.
     * - _new=true: 새 콘솔 창에서 실행하고 즉시 PID(number|null)를 반환한다.
     * - _new=false: 현재 콘솔에서 실행을 끝까지 대기하고 null을 반환한다.
     */
    static async RunCMD(_cmd: string, _new: boolean): Promise<number | null> {
        const platform = os.platform();
        
        if (_new) {
            // 새 콘솔 창에서 실행하고 PID 반환
            try {
                if (platform === 'win32') {
                    // 별도 콘솔 창에서 유지(/k)하며 실행
                    const child = spawn('cmd.exe', ['/k', `chcp 65001 >nul && ${_cmd}`], {
                        detached: true,
                        stdio: 'ignore',
                        windowsHide: false,
                    });
                    child.unref();
                    return child.pid ?? null;
                } else if (platform === 'darwin') {
                    // macOS: Terminal 새 창에서 실행 (osascript PID 반환)
                    const child = spawn('osascript', [
                        '-e',
                        `tell app "Terminal" to do script "${_cmd.replace(/"/g, '\\"')}"`
                    ], {
                        detached: true,
                        stdio: 'ignore',
                    });
                    child.unref();
                    return child.pid ?? null;
                } else {
                    // Linux: 가용한 터미널 에뮬레이터 우선 사용
                    const tryTerms: Array<{bin: string; args: string[]}> = [
                        { bin: 'gnome-terminal', args: ['--', 'bash', '-c', `${_cmd}; exec bash`] },
                        { bin: 'konsole',        args: ['-e', 'bash', '-c', `${_cmd}; exec bash`] },
                        { bin: 'xterm',          args: ['-e', 'bash', '-c', `${_cmd}; exec bash`] },
                    ];
                    for (const t of tryTerms) {
                        if (this.IsCommandAvailable(t.bin)) {
                            const child = spawn(t.bin, t.args, { detached: true, stdio: 'ignore' });
                            child.unref();
                            return child.pid ?? null;
                        }
                    }
                    // fallback: headless 실행
                    const child = spawn('bash', ['-c', _cmd], { detached: true, stdio: 'ignore' });
                    child.unref();
                    return child.pid ?? null;
                }
            } catch (err) {
                console.error('RunCMD (새창) 에러:', err);
                return null;
            }
        } else {
            // 현재 콘솔에서 실행하고 종료까지 대기
            return new Promise<number | null>((resolve, reject) => {
                let child;
                if (platform === 'win32') {
                    // Windows에서 유니코드 지원을 위해 UTF-8 코드페이지 설정
                    child = spawn('cmd', ['/c', 'chcp 65001 >nul && ' + _cmd], { 
                        stdio: 'inherit',
                        env: { 
                            ...process.env, 
                            LANG: 'C.UTF-8',
                            LC_ALL: 'C.UTF-8'
                        }
                    });
                } else {
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
    static RunVSCode(folderPath: string = process.cwd()): void {
        try {
            const isWin = os.platform() === 'win32';
            
            // 경로를 절대 경로로 변환하여 안정성 확보
            const absolutePath = path.resolve(folderPath);
            
            if (isWin) {
                // Windows에서 유니코드 경로 처리를 위해 exec 사용
                // 경로를 따옴표로 감싸고 유니코드 지원 환경 설정
                const command = `code "${absolutePath}"`;
                
                exec(command, { 
                    encoding: 'utf8',
                    // Windows 유니코드 지원을 위한 환경변수 설정
                    env: { 
                        ...process.env, 
                        LANG: 'C.UTF-8',
                        LC_ALL: 'C.UTF-8',
                        // Windows 콘솔 UTF-8 지원
                        PYTHONIOENCODING: 'utf-8'
                    },
                    // Windows에서 유니코드 처리를 위한 추가 옵션
                    windowsHide: true
                }, (error, stdout, stderr) => {
                    if (error) {
                        console.error('VSCode 실행 실패:', error);
                        console.log('경로:', absolutePath);
                    }
                });
            } else {
                // Linux/Mac - 유니코드 지원 개선
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
        } catch (e) {
            console.error('VSCode 실행 실패:', e);
            console.log('경로:', folderPath);
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
        
        // 경로를 절대 경로로 변환하여 안정성 확보
        const absolutePath = path.resolve(_filePath);
        
        if (platform === 'win32') {
            // Windows에서 유니코드 경로 처리
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
        } else {
            // Linux/Mac - 유니코드 지원 개선
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
    static CreateEmptyFolder(folderPath: string): void 
    {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
    }

    /**
     * 지정된 폴더의 모든 TypeScript 파일에서 artgine/ 경로를 상위 폴더 경로로 변경
     * @param workFolder 작업할 폴더 경로
     * @param upFolder 상위 폴더명 (예: "../artgine")
     */
    static async ReplaceArtginePathsInFolder(workFolder: string, upFolder: string): Promise<void> {
        try {
            // console.log(`작업 폴더: ${workFolder}`);
            // console.log(`상위 폴더: ${upFolder}`);
            
            // 폴더가 존재하는지 확인
            if (!fs.existsSync(workFolder)) {
                console.error(`폴더가 존재하지 않습니다: ${workFolder}`);
                return;
            }

            // 모든 .ts 파일 찾기
            const tsFiles = this.FindTSFiles(workFolder);
            //console.log(`찾은 TypeScript 파일: ${tsFiles.length}개`);

            if (tsFiles.length === 0) {
                console.log('처리할 TypeScript 파일이 없습니다.');
                return;
            }

            // 각 파일 처리
            let processedCount = 0;
            let modifiedCount = 0;

            for (const filePath of tsFiles) {
                try {
                    const modified = await this.ReplaceArtginePathsInFile(filePath, upFolder);
                    processedCount++;
                    if (modified) {
                        modifiedCount++;
                        //console.log(`✅ 수정됨: ${path.relative(workFolder, filePath)}`);
                    }
                } catch (error) {
                    console.error(`❌ 파일 처리 실패 ${filePath}:`, error);
                }
            }

            

        } catch (error) {
            console.error('ReplaceArtginePathsInFolder 실행 중 오류:', error);
        }
    }

    /**
     * 폴더에서 모든 .ts 파일을 재귀적으로 찾기
     * @param folderPath 검색할 폴더 경로
     * @returns .ts 파일 경로 배열
     */
    private static FindTSFiles(folderPath: string): string[] {
        const tsFiles: string[] = [];

        const searchRecursive = (currentPath: string) => {
            const items = fs.readdirSync(currentPath);

            for (const item of items) {
                const fullPath = path.join(currentPath, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    // 특정 폴더는 제외 (node_modules, .git 등)
                    if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
                        searchRecursive(fullPath);
                    }
                } else if (stat.isFile() && item.endsWith('.ts')) {
                    tsFiles.push(fullPath);
                }
            }
        };

        searchRecursive(folderPath);
        return tsFiles;
    }

   private static async ReplaceArtginePathsInFile(filePath: string, upFolder: string): Promise<boolean> {
        try {
            // 파일 읽기
            const originalContent = fs.readFileSync(filePath, 'utf8');
            
            // artgine/ 또는 plugin/ 경로 치환
            const modifiedContent = originalContent.replace(
                /(["'])[^"']*?((?:artgine|plugin)\/[^"']+)/g,
                (match, quote, path) => {
                    // upFolder 끝 / 제거, path 앞 / 제거 후 결합
                    const cleanUpFolder = upFolder.replace(/\/+$/, '');
                    const cleanPath = path.replace(/^\/+/, '');
                    return `${quote}${cleanUpFolder}/${cleanPath}`;
                }
            );

            // 내용이 변경되었는지 확인
            if (originalContent !== modifiedContent) {
                // 수정된 내용 저장
                fs.writeFileSync(filePath, modifiedContent, 'utf8');
                return true;
            }

            return false;
        } catch (error) {
            console.error(`파일 처리 중 오류 ${filePath}:`, error);
            return false;
        }
    }


}

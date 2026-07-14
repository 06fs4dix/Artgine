import { execSync, spawn, exec } from 'child_process';
import { CUtilSystem } from '../artgine/system/CUtilSystem.js';

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
    static GetFileCount(_pname: string) {
        if (!fs.existsSync(_pname)) return 0; // 폴더가 존재하지 않음

        const stat = fs.statSync(_pname);
        if (!stat.isDirectory()) return 0; // 폴더가 아님

        const files = fs.readdirSync(_pname);
        return files.length;
    }
    static async Delay(ms: number): Promise<void> {
        await new Promise<void>(res => setTimeout(res, ms)); // ✅ 무조건 대기
    }
    /**
     * 지정된 PID의 프로세스를 종료한다.
     * @param pid 종료할 프로세스 ID
     * @returns 성공 여부
     */
    static async KillPID(pid: number): Promise<boolean> {
        try {
            await CUtilSystem.KillPID(pid);
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
                    const tryTerms: Array<{ bin: string; args: string[] }> = [
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
            const env = { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' };
            // newWindow=false(기본값)이라 null이 반환될 일이 없다.
            const child = (platform === 'win32'
                ? await CUtilSystem.Spawn('cmd', ['/c', `chcp 65001 >nul && ${_cmd}`], 'inherit', '', env)
                : await CUtilSystem.Spawn('bash', ['-c', _cmd], 'inherit', '', env))!;
            return new Promise<number | null>((resolve, reject) => {
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

    static VSCodeOpenCode(_filePath: string): void {


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
    static CreateEmptyFolder(folderPath: string): void {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
    }


    static async IsRun(target: string): Promise<boolean> {
        const t = target.toLowerCase();

        try {
            if (process.platform === "win32") {
                // 1) 창이 떠 있는 프로세스들
                const { stdout } = await execAsync(
                    `powershell -NoLogo -NoProfile -Command "Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -ExpandProperty ProcessName"`,
                    { windowsHide: true, maxBuffer: 1024 * 1024 }
                );
                const names = stdout.split(/\r?\n/).map(s => s.trim().toLowerCase()).filter(Boolean);
                if (names.some(n => n.includes(t) || `${n}.exe` === t)) return true;

                // 2) 창이 없으면 전체 프로세스에서 폴백
                const task = await execAsync(`tasklist /fo csv /nh`, { windowsHide: true, maxBuffer: 1024 * 1024 });
                return task.stdout.split(/\r?\n/).some(line => {
                    const m = line.match(/^"([^"]+)"/); // "Image Name","PID",...
                    if (!m) return false;
                    const name = m[1].toLowerCase();
                    return name.includes(t) || name === t || name === `${t}.exe`;
                });
            }

            if (process.platform === "darwin") {
                // 1) 실제 창이 떠 있는지 (앱 이름 기준)
                try {
                    const { stdout } = await execAsync(
                        `osascript -e 'tell application "${target}" to (count of windows) > 0'`
                    );
                    if (/true/i.test(stdout)) return true;
                } catch { /* 앱 미실행/미설치 등의 에러 → 폴백 */ }

                // 2) 프로세스 이름 기준 폴백
                const { stdout } = await execAsync(`pgrep -ifl "${target}" || true`);
                return !!stdout.trim();
            }

            // Linux
            try {
                // 1) 창 목록으로 확인 (wmctrl 설치 시)
                const { stdout } = await execAsync(`wmctrl -lx 2>/dev/null || true`);
                if (stdout && stdout.toLowerCase().includes(t)) return true;
            } catch { /* wmctrl 없음 → 폴백 */ }

            // 2) 프로세스 이름 기준 폴백
            const { stdout } = await execAsync(`pgrep -ifl "${target}" || true`);
            return !!stdout.trim();
        } catch {
            return false;
        }
    }
    static async IsVSCodeOpen(): Promise<boolean> {
        if (process.platform === "win32") return CCMDMgr.IsRun("Code");                // Code.exe / Code - Insiders.exe 등
        if (process.platform === "darwin") return CCMDMgr.IsRun("Visual Studio Code"); // 앱 이름
        return CCMDMgr.IsRun("code");                                                  // Linux 바이너리
    }

    // tsc -w(watch) 프로세스가 실제로 동작 중인지 확인
    // 임시 .ts 파일을 만들고, 대응하는 .js 파일이 생성되는지 최대 5초까지 폴링(먼저 생기면 즉시 종료)
    static async IsTSCRun(): Promise<boolean> {
        const tempName = `__tsc_check_${Date.now()}`;
        const tsPath = path.join(process.cwd(), `${tempName}.ts`);
        const jsPath = path.join(process.cwd(), `${tempName}.js`);
        const timeoutMs = 5000;
        const intervalMs = 200;
        try {
            fs.writeFileSync(tsPath, `export const __tscCheck = true;\n`);
            const start = Date.now();
            while (Date.now() - start < timeoutMs) {
                if (fs.existsSync(jsPath)) return true;
                await CCMDMgr.Delay(intervalMs);
            }
            return fs.existsSync(jsPath);
        } finally {
            try { if (fs.existsSync(tsPath)) fs.unlinkSync(tsPath); } catch (e) { }
            try { if (fs.existsSync(jsPath)) fs.unlinkSync(jsPath); } catch (e) { }
        }
    }

}

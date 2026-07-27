import { execSync, spawn, exec } from 'child_process';
import { CUtilSystem } from './CUtilSystem.js';

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

    /** 특정 OS에서만 설치할 npm 패키지 (키: 패키지명, 값: 허용 platform) */
    private static readonly sNPMPlatformOnly: Record<string, NodeJS.Platform[]> = {
        "dbus-next": ["linux"],
    };

    /**
     * 강제 고정 버전 (키: 패키지명, 값: 설치할 버전).
     * 여기 등록된 패키지는 호출부에서 버전을 지정하지 않았거나 다른 버전을 지정해도
     * 항상 이 버전으로 설치한다. 목록 없는 패키지는 기존대로 최신 버전이 설치된다.
     * 값은 현재 package.json의 dependencies/devDependencies 버전(캐럿 제거) 기준.
     */
    private static readonly sNPMPinnedVersion: Record<string, string> = {
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

    /**
     * `*모드` 프리셋 패키지 모음.
     * settings packages 등에 `*Basic` 형태로 넣으면 여기 목록으로 펼친다.
     * - Basic: 로컬+웹서버 구동에 필요한 것들(Electron/tsc + HTTP/세션/WS 등). DB 미포함
     * - DB: DB 관련 패키지만. 자동 설치 대상 아님(필요한 곳에서 명시적으로 `*DB` 지정)
     * - Control: Control 서버 기능(원격/터미널/브라우저 자동화 등)
     * - Dev: 컴파일·타입·소스맵/언어서버
     * - Build: 난독화·번들·exe 추출
     */
    private static readonly sNPMPresets: Record<string, string[]> = {
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

    /** npm 스펙(`name`, `name@version`, `@scope/name@ver`)에서 패키지명만 추출 */
    private static GetNPMPackageName(_spec: string): string {
        const s = _spec.trim();
        if (s.startsWith("@")) {
            const i = s.indexOf("@", 1);
            return i === -1 ? s : s.slice(0, i);
        }
        const i = s.indexOf("@");
        return i === -1 ? s : s.slice(0, i);
    }

    /** `*Local` 등 프리셋 키 조회 (대소문자 무시). 없으면 null */
    private static GetNPMPreset(_token: string): string[] | null {
        if (!_token.startsWith("*")) return null;
        const mode = _token.slice(1).trim();
        if (mode === "") return null;
        const key = Object.keys(CCMDMgr.sNPMPresets).find(k => k.toLowerCase() === mode.toLowerCase());
        return key != null ? CCMDMgr.sNPMPresets[key] : null;
    }

    /**
     * 입력 목록을 펼친다.
     * - `*Local` 등 `*` 접두 모드는 프리셋 패키지 배열로 치환
     * - 일반 문자열은 그대로 유지
     * - 패키지명 기준 중복 제거 (먼저 나온 스펙 유지)
     */
    private static ExpandNPMPackages(_packages: string[]): string[] {
        const expanded: string[] = [];
        for (const raw of _packages) {
            const spec = (raw ?? "").trim();
            if (spec === "") continue;

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

        // 패키지명 기준 중복 제거 (Local+Dev 등 모드 겹침 대비)
        const seen = new Set<string>();
        const unique: string[] = [];
        for (const spec of expanded) {
            const name = CCMDMgr.GetNPMPackageName(spec);
            if (name === "" || seen.has(name)) continue;
            seen.add(name);
            unique.push(spec);
        }
        return unique;
    }

    /**
     * package.json의 dependencies / devDependencies를 비우고 lock 파일을 삭제한다.
     * 이후 NPMInstall로 필요한 패키지만 다시 쌓기 위한 선행 초기화.
     *
     * lock 삭제 이유:
     * - package-lock.json에 옛 dependency 트리가 남으면, package.json을 비워도
     *   다음 npm install이 잠긴 해석/버전을 끌어와 초기화 의도와 어긋난다.
     * - yarn.lock / pnpm-lock.yaml 이 있으면 함께 제거한다.
     *
     * node_modules는 삭제하지 않는다(매 기동 전체 재설치 비용). 필요 시 수동 삭제.
     * @param _packageJsonPath 생략 시 process.cwd()/package.json
     */
    static NPMPackageInit(_packageJsonPath?: string): void {
        const pkgPath = _packageJsonPath
            ? path.resolve(_packageJsonPath)
            : path.join(process.cwd(), "package.json");

        if (!fs.existsSync(pkgPath)) {
            console.warn(`[NPMPackageInit] package.json 없음: ${pkgPath}`);
            return;
        }

        let pkg: any;
        try {
            pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        } catch (e) {
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

    /**
     * 패키지 목록을 현재 OS에 맞게 걸러 npm install 한다.
     * - 빈 배열이면 아무 것도 하지 않는다.
     * - `*Local` / `*WebServer` / `*Control` / `*Dev` / `*Build` 는 프리셋으로 펼친다.
     * - 모드·직접 지정 간 중복 패키지는 제외한다.
     * - `dbus-next` 등 OS 전용 패키지는 해당 platform이 아니면 제외한다.
     */
    static async NPMInstall(_packages: string[]): Promise<void> {
        if (_packages == null || _packages.length === 0) return;

        const platform = process.platform;
        const expanded = CCMDMgr.ExpandNPMPackages(_packages);
        const installList: string[] = [];
        const skipped: string[] = [];

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

        // 공백/특수문자가 있는 스펙만 따옴표 (Windows npx/cmd 중첩 따옴표 이슈 최소화)
        const args = installList.map(p => /\s/.test(p) ? `"${p}"` : p).join(" ");
        console.log(`[NPMInstall] npm install ${args}`);
        // RunCMD(stdio:'inherit')를 쓰지 않는다 — 부모 콘솔 핸들을 자식에게 그대로 넘기면
        // 그 자식이 끝난 뒤 부모(Electron 메인)의 콘솔 출력이 통째로 죽는 문제가 있다
        // (write는 에러 없이 성공하는데 화면엔 아무것도 안 나옴). 파이프로 받아서 부모가
        // 직접 다시 찍으면 자식이 부모 콘솔을 만질 일이 없어 구조적으로 깨지지 않는다.
        await CCMDMgr.RunCMDPiped(`npm install ${args}`);
    }

    /**
     * 자식 출력을 파이프로 받아 부모가 콘솔에 다시 찍는다(자식에게 콘솔 핸들을 넘기지 않는다).
     * 대화형 입력이 필요 없는 명령 전용 — stdin이 연결되지 않는다.
     */
    static async RunCMDPiped(_cmd: string): Promise<number | null> {
        const platform = os.platform();
        const env = { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' };
        const child = (platform === 'win32'
            ? await CUtilSystem.Spawn('cmd', ['/c', `chcp 65001 >nul && ${_cmd}`], 'pipe', '', env)
            : await CUtilSystem.Spawn('bash', ['-c', _cmd], 'pipe', '', env))!;

        // 줄 단위로 모아 찍는다 — 청크 경계에서 멀티바이트(한글)가 잘려 깨지는 걸 막는다.
        const pump = (_stream: any) => {
            if (_stream == null) return;
            let rest = '';
            _stream.setEncoding('utf8');
            _stream.on('data', (_chunk: string) => {
                const lines = (rest + _chunk).split(/\r?\n/);
                rest = lines.pop() ?? '';
                for (const line of lines) console.log(line);
            });
            _stream.on('end', () => { if (rest !== '') console.log(rest); });
        };
        pump(child.stdout);
        pump(child.stderr);

        return new Promise<number | null>((resolve, reject) => {
            // 'exit'가 아니라 'close'를 쓴다 — 'exit'는 stdout/stderr에 남은 데이터를 다 읽기 전에
            // 발생할 수 있어 출력 끝부분이 잘린다. 'close'는 파이프가 모두 닫힌 뒤에 온다.
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
                        // ptyxis: 최신 GNOME/우분투 기본 터미널(gnome-terminal 대체). '--' 뒤 명령 실행.
                        { bin: 'ptyxis', args: ['--', 'bash', '-c', `${_cmd}; exec bash`] },
                        { bin: 'konsole', args: ['-e', 'bash', '-c', `${_cmd}; exec bash`] },
                        { bin: 'xterm', args: ['-e', 'bash', '-c', `${_cmd}; exec bash`] },
                        // x-terminal-emulator: 데비안/우분투의 "시스템 기본 터미널" 심볼릭 링크. 어떤 배포든 마지막 폴백.
                        { bin: 'x-terminal-emulator', args: ['-e', 'bash', '-c', `${_cmd}; exec bash`] },
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

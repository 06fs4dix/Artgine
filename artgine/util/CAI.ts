import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { CPath } from '../basic/CPath.js';

export interface IAIInteractiveArgs {
    args: string[];
    policyFile?: string;
}

export interface IProviderInfo {
    id: CAI.eProvider;
    available: boolean;
    version: string;
    models: { value: string; label: string }[];
}

const _roleTargets: Record<string, [string, string]> = {
    claude:      ['CLAUDE.md',                       '.claudeignore' ],
    gemini:      ['GEMINI.md',                       '.geminiignore' ],
    codex:       ['AGENTS.md',                       '.codexignore'  ],
    manus:       ['MANUS.md',                        '.manusignore'  ],
    gpt:         ['.github/copilot-instructions.md', '.copilotignore'],
    antigravity: ['AGENTS.md',                       '.geminiignore' ],
};

export class CAI {
    static readonly IS_WIN = process.platform === 'win32';
    static readonly EMPTY_MCP_PATH = path.resolve(CPath.WorkingPath(), 'proj', 'Home', 'AI', 'empty-mcp.json');

    static AIDir(): string {
        return CPath.WorkingPath() + "ai";
    }

    // ---- Role ----

    /**
     * targetDir 없음: ai/ROLE.md + ai/.ignore → 루트에 해당 모델 파일 생성 (기존 동작)
     * targetDir 있음: 루트의 provider MD → targetDir에 복사. 이미 있으면 건너뜀. 복사한 경로 반환(null=건너뜀/실패)
     */
    static CreateRole(provider: CAI.eProvider, targetDir?: string): boolean | string | null {
        const cwd = CPath.WorkingPath();
        const target = _roleTargets[provider];
        if (!target) return false;
        const [mdName, ignoreName] = target;

        if (targetDir) {
            const rootMd = path.join(cwd, mdName);
            if (!fs.existsSync(rootMd)) return null;
            const destMd = path.join(targetDir, mdName);
            if (fs.existsSync(destMd)) return null;
            fs.copyFileSync(rootMd, destMd);
            return destMd;
        }

        const aiDir      = CAI.AIDir();
        const roleFile   = path.join(aiDir, 'ROLE.md');
        const ignoreFile = path.join(aiDir, '.ignore');
        if (!fs.existsSync(roleFile) || !fs.existsSync(ignoreFile)) return false;
        const mdDest     = path.join(cwd, mdName);
        const ignoreDest = path.join(cwd, ignoreName);
        if (!fs.existsSync(mdDest)) {
            fs.mkdirSync(path.dirname(mdDest), { recursive: true });
            fs.copyFileSync(roleFile, mdDest);
        }
        if (!fs.existsSync(ignoreDest)) {
            fs.mkdirSync(path.dirname(ignoreDest), { recursive: true });
            fs.copyFileSync(ignoreFile, ignoreDest);
        }
        return true;
    }

    /** targetDir의 provider MD 파일 삭제. 성공 여부 반환. */
    static DeleteRole(provider: CAI.eProvider, targetDir: string): boolean {
        const target = _roleTargets[provider];
        if (!target) return false;
        const [mdName] = target;
        const destMd = path.join(targetDir, mdName);
        if (!fs.existsSync(destMd)) return false;
        try { fs.unlinkSync(destMd); return true; } catch { return false; }
    }

    // ---- Provider probe / install ----

    static async _resolveAgyBin(): Promise<string> {
        if (CAI.IS_WIN) {
            const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
            const localPath = path.join(localAppData, 'agy', 'bin', 'agy.exe');
            if (fs.existsSync(localPath)) return localPath;
        } else {
            const homeBin = path.join(os.homedir(), '.local', 'bin', 'agy');
            if (fs.existsSync(homeBin)) return homeBin;
        }
        return 'agy'; // fallback to PATH
    }

    /** 단일 프로바이더 탐지 결과 반환 (로컬 bin 실행 검증) */
    static async ProviderInfo(provider: CAI.eProvider): Promise<IProviderInfo> {
        let bin: string;
        if (provider === CAI.eProvider.antigravity) {
            const resolved = await CAI._resolveAgyBin();
            if (resolved === 'agy' || !fs.existsSync(resolved)) return { id: provider, available: false, version: '', models: [] };
            bin = resolved;
        } else {
            const ext = CAI.IS_WIN ? '.cmd' : '';
            bin = path.join(CPath.WorkingPath(), 'node_modules', '.bin', provider + ext);
            if (!fs.existsSync(bin)) return { id: provider, available: false, version: '', models: [] };
        }
        const version = await new Promise<string>((resolve) => {
            let out = ''; let done = false;
            const finish = (v: string) => { if (!done) { done = true; resolve(v); } };
            try {
                const child = CAI.IS_WIN
                    ? spawn(`"${bin}" --version`, [], { shell: true })
                    : spawn(bin, ['--version']);
                child.stdout?.on('data', (d: Buffer) => { out += d.toString('utf8'); });
                child.on('error', () => finish(''));
                child.on('close', (code) => finish(code === 0 ? out.trim() : ''));
                setTimeout(() => { try { child.kill(); } catch {} finish(''); }, 5000);
            } catch { finish(''); }
        });
        return { id: provider, available: !!version, version, models: [] };
    }

    /** 설치 여부 확인 후 없으면 설치. 설치 성공(또는 이미 설치됨) 시 true 반환 */
    static async ProviderInstall(provider: CAI.eProvider): Promise<boolean> {
        const info = await CAI.ProviderInfo(provider);
        if (info.available) return true;
        // Windows claude: .exe.old.* 파일이 있으면 rename으로 복구 시도
        if (CAI.IS_WIN && provider === CAI.eProvider.claude) {
            const pkgBin = path.join(CPath.WorkingPath(), 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
            const binDir = path.dirname(pkgBin);
            if (fs.existsSync(binDir) && !fs.existsSync(pkgBin)) {
                const oldFile = fs.readdirSync(binDir).find(f => f.startsWith('claude.exe.old.'));
                if (oldFile) {
                    try {
                        fs.renameSync(path.join(binDir, oldFile), pkgBin);
                        console.log(`[CAI] Recovered claude.exe from ${oldFile}`);
                        return true;
                    } catch {}
                }
            }
        }
        return new Promise((resolve) => {
            if (provider === CAI.eProvider.antigravity) {
                console.log(`[CAI] Installing Antigravity CLI (agy)...`);
                const child = CAI.IS_WIN
                    ? spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', 'irm https://antigravity.google/cli/install.ps1 | iex'], { stdio: 'inherit' })
                    : spawn('sh', ['-c', 'curl -fsSL https://antigravity.google/cli/install.sh | bash'], { stdio: 'inherit' });
                child.on('error', () => resolve(false));
                child.on('close', (code) => {
                    if (code === 0) { console.log(`[CAI] Antigravity CLI installed.`); resolve(true); }
                    else resolve(false);
                });
                return;
            }
            const pkgs: Partial<Record<CAI.eProvider, string>> = {
                [CAI.eProvider.claude]: '@anthropic-ai/claude-code',
                [CAI.eProvider.gemini]: '@google/gemini-cli',
                [CAI.eProvider.codex]:  '@openai/codex',
            };
            const pkg = pkgs[provider];
            if (!pkg) { resolve(false); return; }
            console.log(`[CAI] Installing ${pkg}...`);
            const child = spawn('npm', ['install', pkg], { shell: true, stdio: 'inherit', cwd: CPath.WorkingPath() });
            child.on('error', () => resolve(false));
            child.on('close', (code) => {
                if (code === 0) { console.log(`[CAI] ${pkg} installed.`); resolve(true); }
                else resolve(false);
            });
        });
    }

    // ---- Execute (non-interactive / 채팅용) ----

    /** AI CLI를 직접 spawn. stdin으로 prompt 주입, stdout 수집. CAIChatRouter 전용. */
    static async Chat(provider: CAI.eProvider, model: string, cwd: string, prompt: string, mcp = true, cliSessionId?: string, isFirstCall = true): Promise<ChildProcess> {
        await CAI.ProviderInstall(provider);
        CAI.CreateRole(provider);
        const env = {
            ...process.env,
            FORCE_COLOR: '0', NO_COLOR: '1',
            CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE: 'false',  // claude 자동 업데이트 비활성화
            GEMINI_CLI_NO_RELAUNCH: '1',                       // gemini 자동 업데이트 비활성화
        };
        let cmd: string;
        const args: string[] = [];

        if (provider === CAI.eProvider.claude) {
            cmd = CAI.IS_WIN ? 'claude.cmd' : 'claude';
            args.push('-p', '--permission-mode', 'bypassPermissions', '--model', model);
            if (!mcp) {
                CAI._ensureEmptyMcpFile();
                args.push('--mcp-config', CAI.EMPTY_MCP_PATH, '--strict-mcp-config');
            }
            if (isFirstCall && cliSessionId)       args.push('--session-id', cliSessionId);
            else if (!isFirstCall && cliSessionId) args.push('--resume', cliSessionId);
        } else if (provider === CAI.eProvider.gemini) {
            cmd = CAI.IS_WIN ? 'gemini.cmd' : 'gemini';
            args.push('--approval-mode=yolo', '-m', model);
            if (!isFirstCall && cliSessionId) args.push('--resume', cliSessionId);
        } else if (provider === CAI.eProvider.antigravity) {
            cmd = await CAI._resolveAgyBin();
            args.push('--dangerously-skip-permissions');
            if (!isFirstCall && cliSessionId) args.push('--conversation', cliSessionId);
            args.push('-p', prompt);
        } else {
            const [bin, ...rest] = CAI._resolveBin('codex');
            cmd = bin; args.push(...rest);
            if (isFirstCall) args.push('exec');
            else             args.push('exec', 'resume', '--last');
            if (!mcp) args.push('-c', 'mcp_servers={}');
            args.push('-m', model, '--skip-git-repo-check', '-');
        }

        // Antigravity: 프롬프트를 args로 직접 전달하므로 shell을 거치지 않고 spawn (Windows 멀티라인 안전)
        const child = provider === CAI.eProvider.antigravity
            ? spawn(cmd, args, { cwd, env })
            : CAI._spawnWithArgs(cmd, args, cwd, env);
        if (child.stdin) {
            if (provider !== CAI.eProvider.antigravity) {
                child.stdin.write(prompt);
            }
            child.stdin.end();
        }
        return child;
    }

    // ---- BuildInteractiveArgs (interactive / 터미널용) ----

    /** ttyd에 전달할 CLI 부분 args 반환. policyFile은 ttyd 종료 시 삭제 필요. */
    // ~/.gemini/settings.json 에 useRipgrep:false 보장 (startup hang 방지)
    private static _ensureGeminiNoRipgrep(): void {
        try {
            const settingsPath = path.join(os.homedir(), '.gemini', 'settings.json');
            fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
            let settings: Record<string, any> = {};
            if (fs.existsSync(settingsPath)) {
                try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch {}
            }
            if (settings['useRipgrep'] !== false) {
                settings['useRipgrep'] = false;
                fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
            }
        } catch {}
    }

    static async Terminal(provider: CAI.eProvider, mcp: boolean, allow: string, port: number): Promise<IAIInteractiveArgs> {
        await CAI.ProviderInstall(provider);
        CAI.CreateRole(provider);
        if (provider === CAI.eProvider.gemini) CAI._ensureGeminiNoRipgrep();
        if (provider === CAI.eProvider.claude) {
            CAI._ensureEmptyMcpFile();
            const mcpFlags = mcp ? [] : ['--mcp-config', CAI.EMPTY_MCP_PATH, '--strict-mcp-config'];
            if (allow) {
                const allowPattern = CAI.IS_WIN
                    ? allow.replace(/^([A-Za-z]):/, (_, d) => '//' + d.toLowerCase()).replace(/\\/g, '/') + '/**'
                    : '/' + allow + '/**';
                if (CAI.IS_WIN) {
                    const binCmd = 'npx claude';
                    const mcpPart = mcpFlags.length ? ' ' + mcpFlags.map(f => f.includes(' ') ? `"${f}"` : f).join(' ') : '';
                    const policyFile = path.join(os.tmpdir(), `claude-start-${port}.cmd`);
                    fs.writeFileSync(policyFile,
                        `@${binCmd} --allowedTools "Bash,Glob,Grep,Read,Edit(${allowPattern}),Write(${allowPattern})"${mcpPart}\n`,
                        'utf8'
                    );
                    return { args: [policyFile], policyFile };
                }
                return { args: [...CAI._resolveBin('claude'), '--allowedTools', `Bash,Glob,Grep,Read,Edit(${allowPattern}),Write(${allowPattern})`, ...mcpFlags] };
            }
            // Windows: 한글 경로가 ttyd → cmd.exe 전달 시 깨짐 → npx 사용
            if (CAI.IS_WIN) return { args: ['npx', 'claude', ...mcpFlags] };
            return { args: [...CAI._resolveBin('claude'), ...mcpFlags] };
        }

        if (provider === CAI.eProvider.gemini) {
            // Home/ttyd 경로에서는 직접 CLI를 실행해야 Windows cmd 동작과 일치한다.
            const geminiArgs = [CAI.IS_WIN ? 'gemini.cmd' : 'gemini'];
            if (allow) geminiArgs.push('--approval-mode=yolo');
            return { args: geminiArgs };
        }

        if (provider === CAI.eProvider.antigravity) {
            const bin = await CAI._resolveAgyBin();
            const agyArgs = [bin, '--dangerously-skip-permissions'];
            return { args: agyArgs };
        }

        // Codex
        const codexArgs = [...CAI._resolveBin('codex'), '--no-alt-screen'];
        if (allow) codexArgs.push('-s', 'workspace-write', '-C', allow);
        if (!mcp) {
            for (const key of CAI._getCodexMcpKeys()) {
                codexArgs.push('-c', `mcp_servers.${key}.enabled=false`);
            }
        }
        return { args: codexArgs };
    }

    // ---- Gemini session capture ----

    /** Gemini 첫 호출 완료 후 --list-sessions로 세션 UUID 추출 */
    static CaptureGeminiSessionId(cwd: string): Promise<string | null> {
        return new Promise((resolve) => {
            const cmd = CAI.IS_WIN ? 'gemini.cmd' : 'gemini';
            let out = ''; let done = false;
            const finish     = () => { if (!done) { done = true; resolve(null); } };
            const finishWith = (v: string) => { if (!done) { done = true; resolve(v); } };
            try {
                const child = CAI.IS_WIN
                    ? spawn(`${cmd} --list-sessions`, [], { cwd, shell: true })
                    : spawn(cmd, ['--list-sessions'], { cwd });
                child.stdout?.on('data', (d: Buffer) => { out += d.toString('utf8'); });
                child.stderr?.on('data', (d: Buffer) => { out += d.toString('utf8'); });
                child.on('error', finish);
                child.on('close', () => {
                    const match = out.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                    if (match) finishWith(match[0]); else finish();
                });
                setTimeout(() => { try { child.kill(); } catch {} finish(); }, 5000);
            } catch { finish(); }
        });
    }

    // ---- private helpers ----

    private static _ensureEmptyMcpFile(): void {
        try {
            if (!fs.existsSync(CAI.EMPTY_MCP_PATH)) {
                fs.mkdirSync(path.dirname(CAI.EMPTY_MCP_PATH), { recursive: true });
                fs.writeFileSync(CAI.EMPTY_MCP_PATH, JSON.stringify({ mcpServers: {} }), 'utf8');
            }
        } catch {}
    }

    private static _resolveBin(name: string): string[] {
        const ext     = CAI.IS_WIN ? '.cmd' : '';
        const binPath = path.join(CPath.WorkingPath(), 'node_modules', '.bin', name + ext);
        if (fs.existsSync(binPath)) {
            // Windows: 경로에 비ASCII(한글 등)가 있으면 ttyd C 바이너리가 cmd.exe 전달 시 깨짐 → npx 사용
            if (CAI.IS_WIN && /[^\x00-\x7F]/.test(binPath)) return ['npx', name];
            return [binPath];
        }
        return ['npx', name];
    }

    private static _getCodexMcpKeys(): string[] {
        try {
            const configPath = path.join(os.homedir(), '.codex', 'config.toml');
            if (!fs.existsSync(configPath)) return [];
            const content = fs.readFileSync(configPath, 'utf8');
            const keys = new Set<string>();
            for (const m of content.matchAll(/^\[mcp_servers\.([^\]]+)\]/gm)) keys.add(m[1]);
            return [...keys];
        } catch { return []; }
    }

    private static _quoteCmd(s: string): string {
        return '"' + s.replace(/"/g, '""').replace(/\^/g, '^^').replace(/%/g, '%%') + '"';
    }

    private static _spawnWithArgs(cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): ChildProcess {
        if (CAI.IS_WIN) {
            const line = [cmd, ...args.map(CAI._quoteCmd)].join(' ');
            return spawn(line, [], { cwd, env, shell: true });
        }
        return spawn(cmd, args, { cwd, env });
    }
}

export namespace CAI {
    export enum eProvider { claude='claude', gemini='gemini', codex='codex', manus='manus', gpt='gpt', antigravity='antigravity' }
}

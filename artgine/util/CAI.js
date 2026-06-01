import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';
import { CPath } from '../basic/CPath.js';
const _roleTargets = {
    claude: ['CLAUDE.md', '.claudeignore'],
    gemini: ['GEMINI.md', '.geminiignore'],
    codex: ['AGENTS.md', '.codexignore'],
    manus: ['MANUS.md', '.manusignore'],
    gpt: ['.github/copilot-instructions.md', '.copilotignore'],
    antigravity: ['AGENTS.md', '.geminiignore'],
};
export class CAI {
    static IS_WIN = process.platform === 'win32';
    static EMPTY_MCP_PATH = path.resolve(process.cwd(), 'proj', 'Home', 'AI', 'empty-mcp.json');
    static AIDir() {
        return CPath.PHPC() + "ai";
    }
    static CreateRole(provider, targetDir) {
        const cwd = process.cwd();
        const target = _roleTargets[provider];
        if (!target)
            return false;
        const [mdName, ignoreName] = target;
        if (targetDir) {
            const rootMd = path.join(cwd, mdName);
            if (!fs.existsSync(rootMd))
                return null;
            const destMd = path.join(targetDir, mdName);
            if (fs.existsSync(destMd))
                return null;
            fs.copyFileSync(rootMd, destMd);
            return destMd;
        }
        const aiDir = CAI.AIDir();
        const roleFile = path.join(aiDir, 'ROLE.md');
        const ignoreFile = path.join(aiDir, '.ignore');
        if (!fs.existsSync(roleFile) || !fs.existsSync(ignoreFile))
            return false;
        const mdDest = path.join(cwd, mdName);
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
    static DeleteRole(provider, targetDir) {
        const target = _roleTargets[provider];
        if (!target)
            return false;
        const [mdName] = target;
        const destMd = path.join(targetDir, mdName);
        if (!fs.existsSync(destMd))
            return false;
        try {
            fs.unlinkSync(destMd);
            return true;
        }
        catch {
            return false;
        }
    }
    static async _resolveAgyBin() {
        if (CAI.IS_WIN) {
            const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
            const localPath = path.join(localAppData, 'agy', 'bin', 'agy.exe');
            if (fs.existsSync(localPath))
                return localPath;
        }
        else {
            const homeBin = path.join(os.homedir(), '.local', 'bin', 'agy');
            if (fs.existsSync(homeBin))
                return homeBin;
        }
        return 'agy';
    }
    static async ProviderInfo(provider) {
        let bin;
        if (provider === CAI.eProvider.antigravity) {
            const resolved = await CAI._resolveAgyBin();
            if (resolved === 'agy' || !fs.existsSync(resolved))
                return { id: provider, available: false, version: '', models: [] };
            bin = resolved;
        }
        else {
            const ext = CAI.IS_WIN ? '.cmd' : '';
            bin = path.join(process.cwd(), 'node_modules', '.bin', provider + ext);
            if (!fs.existsSync(bin))
                return { id: provider, available: false, version: '', models: [] };
        }
        const version = await new Promise((resolve) => {
            let out = '';
            let done = false;
            const finish = (v) => { if (!done) {
                done = true;
                resolve(v);
            } };
            try {
                const child = CAI.IS_WIN
                    ? spawn(`"${bin}" --version`, [], { shell: true })
                    : spawn(bin, ['--version']);
                child.stdout?.on('data', (d) => { out += d.toString('utf8'); });
                child.on('error', () => finish(''));
                child.on('close', (code) => finish(code === 0 ? out.trim() : ''));
                setTimeout(() => { try {
                    child.kill();
                }
                catch { } finish(''); }, 5000);
            }
            catch {
                finish('');
            }
        });
        return { id: provider, available: !!version, version, models: [] };
    }
    static async ProviderInstall(provider) {
        const info = await CAI.ProviderInfo(provider);
        if (info.available)
            return true;
        if (CAI.IS_WIN && provider === CAI.eProvider.claude) {
            const pkgBin = path.join(process.cwd(), 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
            const binDir = path.dirname(pkgBin);
            if (fs.existsSync(binDir) && !fs.existsSync(pkgBin)) {
                const oldFile = fs.readdirSync(binDir).find(f => f.startsWith('claude.exe.old.'));
                if (oldFile) {
                    try {
                        fs.renameSync(path.join(binDir, oldFile), pkgBin);
                        console.log(`[CAI] Recovered claude.exe from ${oldFile}`);
                        return true;
                    }
                    catch { }
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
                    if (code === 0) {
                        console.log(`[CAI] Antigravity CLI installed.`);
                        resolve(true);
                    }
                    else
                        resolve(false);
                });
                return;
            }
            const pkgs = {
                [CAI.eProvider.claude]: '@anthropic-ai/claude-code',
                [CAI.eProvider.gemini]: '@google/gemini-cli',
                [CAI.eProvider.codex]: '@openai/codex',
            };
            const pkg = pkgs[provider];
            if (!pkg) {
                resolve(false);
                return;
            }
            console.log(`[CAI] Installing ${pkg}...`);
            const child = spawn('npm', ['install', pkg], { shell: true, stdio: 'inherit', cwd: process.cwd() });
            child.on('error', () => resolve(false));
            child.on('close', (code) => {
                if (code === 0) {
                    console.log(`[CAI] ${pkg} installed.`);
                    resolve(true);
                }
                else
                    resolve(false);
            });
        });
    }
    static async Chat(provider, model, cwd, prompt, mcp = true, cliSessionId, isFirstCall = true) {
        await CAI.ProviderInstall(provider);
        CAI.CreateRole(provider);
        const env = {
            ...process.env,
            FORCE_COLOR: '0', NO_COLOR: '1',
            CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE: 'false',
            GEMINI_CLI_NO_RELAUNCH: '1',
        };
        let cmd;
        const args = [];
        if (provider === CAI.eProvider.claude) {
            cmd = CAI.IS_WIN ? 'claude.cmd' : 'claude';
            args.push('-p', '--permission-mode', 'bypassPermissions', '--model', model);
            if (!mcp) {
                CAI._ensureEmptyMcpFile();
                args.push('--mcp-config', CAI.EMPTY_MCP_PATH, '--strict-mcp-config');
            }
            if (isFirstCall && cliSessionId)
                args.push('--session-id', cliSessionId);
            else if (!isFirstCall && cliSessionId)
                args.push('--resume', cliSessionId);
        }
        else if (provider === CAI.eProvider.gemini) {
            cmd = CAI.IS_WIN ? 'gemini.cmd' : 'gemini';
            args.push('--approval-mode=yolo', '-m', model);
            if (!isFirstCall && cliSessionId)
                args.push('--resume', cliSessionId);
        }
        else if (provider === CAI.eProvider.antigravity) {
            cmd = await CAI._resolveAgyBin();
            args.push('--dangerously-skip-permissions');
            if (!isFirstCall && cliSessionId)
                args.push('--conversation', cliSessionId);
            args.push('-p', prompt);
        }
        else {
            const [bin, ...rest] = CAI._resolveBin('codex');
            cmd = bin;
            args.push(...rest);
            if (isFirstCall)
                args.push('exec');
            else
                args.push('exec', 'resume', '--last');
            if (!mcp)
                args.push('-c', 'mcp_servers={}');
            args.push('-m', model, '--skip-git-repo-check', '-');
        }
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
    static _ensureGeminiNoRipgrep() {
        try {
            const settingsPath = path.join(os.homedir(), '.gemini', 'settings.json');
            fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
            let settings = {};
            if (fs.existsSync(settingsPath)) {
                try {
                    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                }
                catch { }
            }
            if (settings['useRipgrep'] !== false) {
                settings['useRipgrep'] = false;
                fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
            }
        }
        catch { }
    }
    static async Terminal(provider, mcp, allow, port) {
        await CAI.ProviderInstall(provider);
        CAI.CreateRole(provider);
        if (provider === CAI.eProvider.gemini)
            CAI._ensureGeminiNoRipgrep();
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
                    fs.writeFileSync(policyFile, `@${binCmd} --allowedTools "Bash,Glob,Grep,Read,Edit(${allowPattern}),Write(${allowPattern})"${mcpPart}\n`, 'utf8');
                    return { args: [policyFile], policyFile };
                }
                return { args: [...CAI._resolveBin('claude'), '--allowedTools', `Bash,Glob,Grep,Read,Edit(${allowPattern}),Write(${allowPattern})`, ...mcpFlags] };
            }
            if (CAI.IS_WIN)
                return { args: ['npx', 'claude', ...mcpFlags] };
            return { args: [...CAI._resolveBin('claude'), ...mcpFlags] };
        }
        if (provider === CAI.eProvider.gemini) {
            const geminiArgs = [CAI.IS_WIN ? 'gemini.cmd' : 'gemini'];
            if (allow)
                geminiArgs.push('--approval-mode=yolo');
            return { args: geminiArgs };
        }
        if (provider === CAI.eProvider.antigravity) {
            const bin = await CAI._resolveAgyBin();
            const agyArgs = [bin, '--dangerously-skip-permissions'];
            return { args: agyArgs };
        }
        const codexArgs = [...CAI._resolveBin('codex'), '--no-alt-screen'];
        if (allow)
            codexArgs.push('-s', 'workspace-write', '-C', allow);
        if (!mcp) {
            for (const key of CAI._getCodexMcpKeys()) {
                codexArgs.push('-c', `mcp_servers.${key}.enabled=false`);
            }
        }
        return { args: codexArgs };
    }
    static CaptureGeminiSessionId(cwd) {
        return new Promise((resolve) => {
            const cmd = CAI.IS_WIN ? 'gemini.cmd' : 'gemini';
            let out = '';
            let done = false;
            const finish = () => { if (!done) {
                done = true;
                resolve(null);
            } };
            const finishWith = (v) => { if (!done) {
                done = true;
                resolve(v);
            } };
            try {
                const child = CAI.IS_WIN
                    ? spawn(`${cmd} --list-sessions`, [], { cwd, shell: true })
                    : spawn(cmd, ['--list-sessions'], { cwd });
                child.stdout?.on('data', (d) => { out += d.toString('utf8'); });
                child.stderr?.on('data', (d) => { out += d.toString('utf8'); });
                child.on('error', finish);
                child.on('close', () => {
                    const match = out.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                    if (match)
                        finishWith(match[0]);
                    else
                        finish();
                });
                setTimeout(() => { try {
                    child.kill();
                }
                catch { } finish(); }, 5000);
            }
            catch {
                finish();
            }
        });
    }
    static _ensureEmptyMcpFile() {
        try {
            if (!fs.existsSync(CAI.EMPTY_MCP_PATH)) {
                fs.mkdirSync(path.dirname(CAI.EMPTY_MCP_PATH), { recursive: true });
                fs.writeFileSync(CAI.EMPTY_MCP_PATH, JSON.stringify({ mcpServers: {} }), 'utf8');
            }
        }
        catch { }
    }
    static _resolveBin(name) {
        const ext = CAI.IS_WIN ? '.cmd' : '';
        const binPath = path.join(process.cwd(), 'node_modules', '.bin', name + ext);
        if (fs.existsSync(binPath)) {
            if (CAI.IS_WIN && /[^\x00-\x7F]/.test(binPath))
                return ['npx', name];
            return [binPath];
        }
        return ['npx', name];
    }
    static _getCodexMcpKeys() {
        try {
            const configPath = path.join(os.homedir(), '.codex', 'config.toml');
            if (!fs.existsSync(configPath))
                return [];
            const content = fs.readFileSync(configPath, 'utf8');
            const keys = new Set();
            for (const m of content.matchAll(/^\[mcp_servers\.([^\]]+)\]/gm))
                keys.add(m[1]);
            return [...keys];
        }
        catch {
            return [];
        }
    }
    static _quoteCmd(s) {
        return '"' + s.replace(/"/g, '""').replace(/\^/g, '^^').replace(/%/g, '%%') + '"';
    }
    static _spawnWithArgs(cmd, args, cwd, env) {
        if (CAI.IS_WIN) {
            const line = [cmd, ...args.map(CAI._quoteCmd)].join(' ');
            return spawn(line, [], { cwd, env, shell: true });
        }
        return spawn(cmd, args, { cwd, env });
    }
}
(function (CAI) {
    let eProvider;
    (function (eProvider) {
        eProvider["claude"] = "claude";
        eProvider["gemini"] = "gemini";
        eProvider["codex"] = "codex";
        eProvider["manus"] = "manus";
        eProvider["gpt"] = "gpt";
        eProvider["antigravity"] = "antigravity";
    })(eProvider = CAI.eProvider || (CAI.eProvider = {}));
})(CAI || (CAI = {}));

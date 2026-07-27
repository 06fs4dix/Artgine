let gSpawn = null;
let gSpawnSync = null;
let gExecFileSync = null;
let gOs = null;
async function EnsureNodeModules() {
    if (!gSpawn) {
        const cp = await import('child_process');
        gSpawn = cp.spawn;
        gSpawnSync = cp.spawnSync;
        gExecFileSync = cp.execFileSync;
    }
    if (!gOs)
        gOs = await import('os');
}
function _quoteWin(s) {
    return '"' + s.replace(/"/g, '""').replace(/\^/g, '^^').replace(/%/g, '%%') + '"';
}
export class CUtilSystem {
    static async Spawn(cmd, args = [], stdio = 'pipe', cwd = '', env = null, newWindow = false, windowsHide = true) {
        await EnsureNodeModules();
        const IS_WIN = gOs.platform() === 'win32';
        const resolvedEnv = env ?? process.env;
        const resolvedCwd = cwd || undefined;
        if (newWindow) {
            if (IS_WIN) {
                const innerFlag = windowsHide ? '/c' : '/k';
                const line = [cmd, ...args].map(a => /[\s"]/.test(a) ? _quoteWin(a) : a).join(' ');
                const cdPrefix = resolvedCwd ? `cd /d "${resolvedCwd}" && ` : '';
                const taskName = `CUtilSystemSpawn_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
                try {
                    gExecFileSync('schtasks', [
                        '/create', '/tn', taskName,
                        '/tr', `cmd.exe ${innerFlag} "${cdPrefix}${line}"`,
                        '/sc', 'once', '/st', '00:00', '/sd', '2099/01/01', '/f'
                    ], { stdio: 'ignore', windowsHide: true });
                    gExecFileSync('schtasks', ['/run', '/tn', taskName], { stdio: 'ignore', windowsHide: true });
                }
                finally {
                    try {
                        gExecFileSync('schtasks', ['/delete', '/tn', taskName, '/f'], { stdio: 'ignore', windowsHide: true });
                    }
                    catch { }
                }
                return null;
            }
            else if (gOs.platform() === 'darwin') {
                if (windowsHide) {
                    const child = gSpawn(cmd, args, {
                        detached: true, stdio: 'ignore', cwd: resolvedCwd, env: resolvedEnv
                    });
                    child.unref();
                    return child;
                }
                const script = `tell app "Terminal" to do script "${[cmd, ...args].join(' ').replace(/"/g, '\\"')}"`;
                const child = gSpawn('osascript', ['-e', script], {
                    detached: true, stdio: 'ignore', cwd: resolvedCwd, env: resolvedEnv
                });
                child.unref();
                return child;
            }
            else {
                if (windowsHide) {
                    const child = gSpawn(cmd, args, {
                        detached: true, stdio: 'ignore', cwd: resolvedCwd, env: resolvedEnv
                    });
                    child.unref();
                    return child;
                }
                const terms = [
                    { bin: 'gnome-terminal', args: ['--', cmd, ...args] },
                    { bin: 'konsole', args: ['-e', cmd, ...args] },
                    { bin: 'xterm', args: ['-e', cmd, ...args] },
                ];
                for (const t of terms) {
                    try {
                        const child = gSpawn(t.bin, t.args, {
                            detached: true, stdio: 'ignore', cwd: resolvedCwd, env: resolvedEnv
                        });
                        child.unref();
                        return child;
                    }
                    catch { }
                }
                const child = gSpawn(cmd, args, {
                    detached: true, stdio: 'ignore', cwd: resolvedCwd, env: resolvedEnv
                });
                child.unref();
                return child;
            }
        }
        const cmdBase = cmd.replace(/.*[/\\]/, '').toLowerCase();
        const isShellInterp = /^(cmd|cmd\.exe|bash|sh|powershell|powershell\.exe)$/.test(cmdBase);
        if (isShellInterp) {
            return gSpawn(cmd, args, { stdio, cwd: resolvedCwd, env: resolvedEnv, windowsHide });
        }
        const needsQuoteShell = IS_WIN && (/[^\x00-\x7F]/.test(cmd) ||
            (!/[/\\]/.test(cmd) && !/\.\w+$/.test(cmd)) ||
            /\.cmd$/i.test(cmd));
        if (needsQuoteShell) {
            const quotedCmd = /[\s"]/.test(cmd) ? _quoteWin(cmd) : cmd;
            const line = [quotedCmd, ...args.map(_quoteWin)].join(' ');
            return gSpawn(line, [], { stdio, cwd: resolvedCwd, env: resolvedEnv, shell: true, windowsHide });
        }
        return gSpawn(cmd, args, { stdio, cwd: resolvedCwd, env: resolvedEnv, windowsHide });
    }
    static async KillPID(pid) {
        await EnsureNodeModules();
        const IS_WIN = gOs.platform() === 'win32';
        try {
            if (IS_WIN) {
                gSpawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], { windowsHide: true });
            }
            else {
                try {
                    process.kill(-pid, 'SIGTERM');
                }
                catch {
                    process.kill(pid, 'SIGTERM');
                }
            }
        }
        catch (e) {
            console.warn(`[CUtilSystem] KillPID failed (pid=${pid}):`, e);
        }
    }
}

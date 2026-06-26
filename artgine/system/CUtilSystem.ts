let gSpawn:    typeof import('child_process')['spawn']     = null;
let gSpawnSync: typeof import('child_process')['spawnSync'] = null;
let gOs:       typeof import('os')                          = null;

async function EnsureNodeModules() {
    if (!gSpawn) {
        const cp  = await import('child_process');
        gSpawn    = cp.spawn;
        gSpawnSync = cp.spawnSync;
    }
    if (!gOs) gOs = await import('os');
}

function _quoteWin(s: string): string {
    return '"' + s.replace(/"/g, '""').replace(/\^/g, '^^').replace(/%/g, '%%') + '"';
}

export class CUtilSystem {
    static async Spawn(
        cmd: string,
        args: string[] = [],
        stdio: 'pipe' | 'ignore' | 'inherit' = 'pipe',
        cwd = '',
        env: NodeJS.ProcessEnv | null = null,
        newWindow = false,
        windowsHide = true
    ): Promise<import('child_process').ChildProcess> {
        await EnsureNodeModules();
        const IS_WIN      = gOs.platform() === 'win32';
        const resolvedEnv = env ?? process.env;
        const resolvedCwd = cwd || undefined;

        if (newWindow) {
            if (IS_WIN) {
                // windowsHide=true  → /b (백그라운드, 창 없음)
                // windowsHide=false → 새 콘솔 창
                const startFlag = windowsHide ? ['/b'] : [];
                const child = gSpawn(
                    'cmd.exe',
                    ['/c', 'start', ...startFlag, '""', cmd, ...args],
                    { detached: true, stdio: 'ignore', cwd: resolvedCwd, env: resolvedEnv }
                );
                child.unref();
                return child;
            } else if (gOs.platform() === 'darwin') {
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
            } else {
                if (windowsHide) {
                    const child = gSpawn(cmd, args, {
                        detached: true, stdio: 'ignore', cwd: resolvedCwd, env: resolvedEnv
                    });
                    child.unref();
                    return child;
                }
                const terms = [
                    { bin: 'gnome-terminal', args: ['--', cmd, ...args] },
                    { bin: 'konsole',        args: ['-e', cmd, ...args] },
                    { bin: 'xterm',          args: ['-e', cmd, ...args] },
                ];
                for (const t of terms) {
                    try {
                        const child = gSpawn(t.bin, t.args, {
                            detached: true, stdio: 'ignore', cwd: resolvedCwd, env: resolvedEnv
                        });
                        child.unref();
                        return child;
                    } catch {}
                }
                const child = gSpawn(cmd, args, {
                    detached: true, stdio: 'ignore', cwd: resolvedCwd, env: resolvedEnv
                });
                child.unref();
                return child;
            }
        }

        // newWindow=false: 자식 프로세스로 직접 관리
        const cmdBase = cmd.replace(/.*[/\\]/, '').toLowerCase();
        const isShellInterp = /^(cmd|cmd\.exe|bash|sh|powershell|powershell\.exe)$/.test(cmdBase);

        // 셸 인터프리터(cmd, bash 등)는 이중 래핑 없이 그대로 직접 전달
        if (isShellInterp) {
            return gSpawn(cmd, args, { stdio, cwd: resolvedCwd, env: resolvedEnv, windowsHide });
        }

        // 비ASCII 경로, 확장자 없는 bare 커맨드(npm, npx 등), .cmd 파일은 shell 처리
        // .cmd 파일은 cmd.exe 없이 직접 spawn 불가
        const needsQuoteShell = IS_WIN && (
            /[^\x00-\x7F]/.test(cmd) ||
            (!/[/\\]/.test(cmd) && !/\.\w+$/.test(cmd)) ||
            /\.cmd$/i.test(cmd)
        );
        if (needsQuoteShell) {
            const quotedCmd = /[\s"]/.test(cmd) ? _quoteWin(cmd) : cmd;
            const line = [quotedCmd, ...args.map(_quoteWin)].join(' ');
            return gSpawn(line, [], { stdio, cwd: resolvedCwd, env: resolvedEnv, shell: true, windowsHide });
        }

        return gSpawn(cmd, args, { stdio, cwd: resolvedCwd, env: resolvedEnv, windowsHide });
    }

    static async KillPID(pid: number): Promise<void> {
        await EnsureNodeModules();
        const IS_WIN = gOs.platform() === 'win32';
        try {
            if (IS_WIN) {
                gSpawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], { windowsHide: true });
            } else {
                try {
                    process.kill(-pid, 'SIGTERM');
                } catch {
                    process.kill(pid, 'SIGTERM');
                }
            }
        } catch (e) {
            console.warn(`[CUtilSystem] KillPID failed (pid=${pid}):`, e);
        }
    }
}

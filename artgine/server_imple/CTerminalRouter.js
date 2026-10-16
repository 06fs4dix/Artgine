import { CWASM as __cwasmDecode__ } from "../basic/CWASM.js";
import { randomBytes } from 'crypto';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import * as path from 'path';
import * as fs from 'fs';
import * as ptyMod from 'node-pty';
import * as xtermHeadless from '@xterm/headless';
import { WebSocketServer, WebSocket } from 'ws';
import { CServerMain } from '../network/CServerMain.js';
import { isAuthedReq, isAuthedUpgrade, isValidToken } from '../server/CAuthServer.js';
import { CAI } from '../util/CAI.js';
import { CSchedule } from '../util/CSchedule.js';
import { CTimer } from '../system/CTimer.js';
import { CPath } from '../basic/CPath.js';
import { CTerminalRouter } from '../server/CTerminalRouter.js';
import { CSubAgent } from '../server/CSubAgent.js';
import { CWorkOrder } from '../server/CWorkOrder.js';
import { CTerminalScheduler } from '../server/CTerminalScheduler.js';
import { CProviderLog } from '../server/CProviderLog.js';
import { CMessenger } from '../server/CMessenger.js';
import * as ConvReader from './CConversationReader.js';
import { CWASM } from '../basic/CWASM.js';
CWASM.IsSIMD();
const HeadlessTerminal = xtermHeadless.Terminal ?? xtermHeadless.default?.Terminal;
function isAuthedOrToken(req) {
    const authToken = req.query?.authToken || '';
    return (authToken !== '' && isValidToken(authToken)) || isAuthedReq(req);
}
const IS_WIN = process.platform === 'win32';
let currentCwd = CPath.WorkingPath();
const CTX_DIR = path.join(CAI.AIDir(), 'ctx');
let _ctxCleared = false;
const UPLOAD_DIR = path.join(currentCwd, '.uploads');
let _uploadsCleared = false;
const BUSY_IDLE_MS = 2000;
const PERM_IDLE_MS = 250;
const PERM_DEADLINE_MS = 1000;
const PERM_STALL_DIAG = 15;
const MAX_BUFFER_SIZE = 2 * 1024 * 1024;
function _modeReplayPrefix(headless) {
    const m = headless.modes;
    let s = '';
    if (m.applicationCursorKeysMode)
        s += '\x1b[?1h';
    if (m.applicationKeypadMode)
        s += '\x1b[?66h';
    if (m.bracketedPasteMode)
        s += '\x1b[?2004h';
    if (m.sendFocusMode)
        s += '\x1b[?1004h';
    const proto = { x10: 9, vt200: 1000, drag: 1002, any: 1003 }[m.mouseTrackingMode];
    if (proto) {
        s += `\x1b[?${proto}h`;
        const enc = headless._core?.coreMouseService?.activeEncoding;
        if (enc === 'SGR')
            s += '\x1b[?1006h';
        else if (enc === 'SGR_PIXELS')
            s += '\x1b[?1016h';
    }
    return s;
}
const gSessions = new Map();
const gPending = new Map();
const PENDING_TTL_MS = 30_000;
const gTeamTempAgents = new Map();
function _teamTempAgentAll() {
    const out = [];
    for (const list of gTeamTempAgents.values())
        out.push(...list);
    return out;
}
function _findByKey(key) {
    for (const s of gSessions.values())
        if (s.key === key)
            return s;
    return null;
}
function _keyTaken(key) {
    if (_findByKey(key))
        return true;
    for (const p of gPending.values())
        if (p.key === key)
            return true;
    for (const a of _teamTempAgentAll())
        if (a.key === key)
            return true;
    return false;
}
function screenText(headless) {
    const buf = headless.buffer.active;
    const lines = [];
    const end = buf.baseY + headless.rows;
    for (let i = 0; i < end; i++) {
        const line = buf.getLine(i);
        if (line)
            lines.push(line.translateToString(true).replace(/\s+$/, ''));
    }
    return lines.filter(l => l.length).join('\n').slice(-8000);
}
function viewportText(headless) {
    const buf = headless.buffer.active;
    const lines = [];
    for (let i = buf.baseY; i < buf.baseY + headless.rows; i++) {
        const line = buf.getLine(i);
        if (line)
            lines.push(line.translateToString(true).replace(/\s+$/, ''));
    }
    return lines.filter(l => l.length).join('\n');
}
function viewportTail(headless, n = 6) {
    return viewportText(headless).split('\n').slice(-n).join('\n');
}
const _VOLATILE = [
    /\bWorked for\b[^\n]*/gi,
    /\b(?:Brewed|Thought|Slithering|Thinking|Working|Waiting for response)\b[^\n]*?\b\d+(?:\.\d+)?\s*[smh]\b/gi,
    /\b\d+[hm]\d+[ms](?:\d+s)?\b/gi,
    /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)\b/gi,
    /\b[\d.]+\s*[KM]?\s*\/\s*[\d.]+\s*[KM]\b/gi,
    /\$[\d.]+/g,
    /\(\s*\d+(?:\.\d+)?\s*[smh][^)\n]*\)/gi,
    /\b\d+(?:\.\d+)?\s*[smh]\s*(?:left|ago)\b/gi,
    /\b\d+(?:\.\d+)?\s*[smh]\b/gi,
    /[↓↑]\s*[\d.]+\s*[kKmM]\b/g,
];
const _ASCII_SPIN = /(?<=^|\s)[-\\|/](?=\s|$)/gm;
const _ANIM = /[·•∙⋅✻✽✶✳✢◐◓◑◒◇◆♦●○◉◎█▌▐░▒▓⠁-⣿]/g;
function _maskVolatile(text) {
    let out = text;
    for (const re of _VOLATILE)
        out = out.replace(re, '§');
    out = out.replace(_ANIM, ' ').replace(_ASCII_SPIN, ' ');
    return out.split('\n')
        .map(l => l.replace(/\s+/g, ' ').trim())
        .filter(l => l.length)
        .join('\n');
}
function _permArmDeadline(entry) {
    if (entry._permDeadline)
        return;
    entry._permDeadline = setTimeout(() => {
        entry._permDeadline = null;
        permOnScreen(entry, false, false);
    }, PERM_DEADLINE_MS);
}
function _permResetDeadline(entry) {
    if (entry._permDeadline) {
        clearTimeout(entry._permDeadline);
        entry._permDeadline = null;
    }
}
function _ctxDir(entry) {
    return path.join(CTX_DIR, (entry.key ?? entry.token).replace(/[<>:"/\\|?*]/g, '_'));
}
function _permLogStall(entry, prev, cur, rawView) {
    try {
        if (!_logEnabled())
            return;
        const a = prev.split('\n'), b = cur.split('\n');
        const diffs = [];
        for (let i = 0; i < Math.max(a.length, b.length) && diffs.length < 5; i++) {
            if (a[i] !== b[i])
                diffs.push({ line: i, prev: a[i] ?? '(없음)', cur: b[i] ?? '(없음)' });
        }
        const dir = _ctxDir(entry);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const ts = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
        fs.writeFileSync(path.join(dir, `${ts}.stall.json`), JSON.stringify({
            diag: 'perm-stall', token: entry.token, mode: entry.mode,
            deferCount: entry._permDeferCount,
            maskedLineCount: { prev: a.length, cur: b.length },
            diffs,
            rawView,
            savedAt: new Date().toISOString(),
        }, null, 2), 'utf8');
    }
    catch { }
}
function _denyKey(entry) {
    if (entry.mode === CAI.eProvider.grok)
        return '\x03';
    return '\x1b';
}
function _markBusyAfterApproval(entry) {
    entry._cmdSent = true;
    entry.updatedAt = Date.now();
}
function _sendApprovalKey(entry, key, kind) {
    const keyName = key === '\r' ? 'ENTER' : key === '\x1b' ? 'ESC' : key === '\x03' ? 'CTRL+C' : JSON.stringify(key);
    _markBusyAfterApproval(entry);
    if (entry.mode === CAI.eProvider.codex) {
        entry.pty.write('\x1b[I');
        schedLog(`[approve] ${entry.token} ${kind} codex focus-in → ${keyName} in 500ms`);
        setTimeout(() => { try {
            entry.pty.write(key);
        }
        catch { } }, 500);
    }
    else if (entry.mode === CAI.eProvider.grok && key === '\r') {
        _sendGrokEnter(entry);
        schedLog(`[approve] ${entry.token} ${kind} ${keyName} sent (grok)`);
    }
    else {
        entry.pty.write(key);
        schedLog(`[approve] ${entry.token} ${kind} ${keyName} sent`);
    }
}
const GROK_FOCUS_QUIET_MS = 2500;
const GROK_ARROW_GAP_MS = 150;
function _grokMenuDir(text) {
    const rows = [];
    let sel = 0;
    const lines = text.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
        const m = /^\s*(?:[│┃|][\s|]*)?(\d+)\s*\(([^)\n])\)/.exec(lines[i]);
        if (!m) {
            if (rows.length)
                break;
            continue;
        }
        const num = Number(m[1]);
        if (rows.length && num !== rows[rows.length - 1] - 1)
            break;
        rows.push(num);
        if (m[2] === '•')
            sel = num;
    }
    if (rows.length < 3 || rows[rows.length - 1] !== 1 || !sel)
        return 0;
    return sel === rows[0] ? -1 : 1;
}
function _sendGrokEnter(entry) {
    const now = Date.now();
    if (entry._grokApproveUntil && now < entry._grokApproveUntil)
        return;
    const dir = _grokMenuDir(viewportText(entry.headless));
    const wait = Math.max(0, GROK_FOCUS_QUIET_MS - (now - (entry._focusInAt ?? 0)));
    const at = (ms, data) => setTimeout(() => { if (!entry._disposed)
        try {
            entry.pty.write(data);
        }
        catch { } }, ms);
    if (!dir) {
        entry.pty.write('\r');
        return;
    }
    entry._grokApproveUntil = now + wait + GROK_ARROW_GAP_MS * 3;
    at(wait, dir > 0 ? '\x1b[B' : '\x1b[A');
    at(wait + GROK_ARROW_GAP_MS, dir > 0 ? '\x1b[A' : '\x1b[B');
    at(wait + GROK_ARROW_GAP_MS * 2, '\r');
}
function _formatApprovalMsgForMessenger(ctx, tail) {
    const lines = ['⚠️ 승인 필요', `type: ${ctx.type}${ctx.tool ? ` / tool: ${ctx.tool}` : ''}`];
    if (ctx.command)
        lines.push(`command: ${ctx.command}`);
    lines.push('', tail.trim(), '', '승인: y 또는 1 / 거부: n 또는 2');
    return lines.join('\n');
}
const _STARTUP_DIALOGS = [
    { name: 'trust', anchor: /\btrust\b[^\n]*\?/i,
        yes: /^(?:Yes, I trust this (?:folder|directory|project|workspace)|Yes, proceed|Yes, continue|Yes, allow Codex to work in this folder\b.*|Trust (?:this )?folder\b.*)$/i },
    { name: 'update', anchor: /\bUpdate available\b/i, yes: /^Update now\b.*$/i },
];
const _STARTUP_WINDOW_MS = 5 * 60_000;
const _OPT_CURSOR = /^\s*[>›❯▶]\s+/;
const _CLI_RESTART = /Please restart (?:Codex|the CLI)\b/i;
function _startupDialogKey(entry, tail) {
    if (entry.mode === 'cmd')
        return null;
    if (Date.now() - (entry._startupAt ?? entry.createdAt) > _STARTUP_WINDOW_MS)
        return null;
    const lines = tail.split('\n');
    for (const d of _STARTUP_DIALOGS) {
        let anchor = -1;
        for (let i = lines.length - 1; i >= 0; i--)
            if (d.anchor.test(lines[i])) {
                anchor = i;
                break;
            }
        if (anchor < 0)
            continue;
        let yes = -1, cursor = -1;
        for (let i = anchor + 1; i < lines.length; i++) {
            if (_OPT_CURSOR.test(lines[i]))
                cursor = i;
            const body = lines[i].replace(_OPT_CURSOR, '').replace(/^\s*\d+[.)]\s*/, '').trim();
            const hot = body.match(/^(.*?)\s{2,}([a-z])$/i);
            if (hot && d.yes.test(hot[1]))
                return { name: d.name, key: hot[2] };
            if (d.yes.test(body))
                yes = i;
        }
        if (yes < 0 || cursor < 0)
            continue;
        return { name: d.name, key: cursor === yes ? '\r' : cursor < yes ? '\x1b[B' : '\x1b[A' };
    }
    return null;
}
function computeStatus(entry) {
    if (entry.permPending)
        return 'permission';
    if (entry._cmdSent && Date.now() - entry.updatedAt < BUSY_IDLE_MS)
        return 'working';
    return 'idle';
}
function _pushStatus(entry, force = false) {
    const status = computeStatus(entry);
    if (!force && status === entry._lastStatus)
        return;
    entry._lastStatus = status;
    const msg = Buffer.from(JSON.stringify({ type: 'status', status }), 'utf8');
    for (const c of entry.clients)
        if (c.readyState === WebSocket.OPEN)
            c.send(msg);
    for (const c of entry.readOnlyClients)
        if (c.readyState === WebSocket.OPEN)
            c.send(msg);
}
function permOnScreen(entry, force = false, proven = true) {
    if (entry._disposed)
        return;
    _permResetDeadline(entry);
    const view = viewportText(entry.headless);
    const viewCmp = _maskVolatile(view);
    if (!proven) {
        const drawn = entry.mode === CAI.eProvider.grok && isGrokPermissionMenu(view);
        if (!drawn && viewCmp !== entry._permStableSample) {
            const n = ++entry._permDeferCount;
            if (n === PERM_STALL_DIAG || n % 20 === 0)
                _permLogStall(entry, entry._permStableSample, viewCmp, view);
            entry._permStableSample = viewCmp;
            return;
        }
    }
    else {
        entry._permStableSample = viewCmp;
    }
    entry._permDeferCount = 0;
    if (!force && viewCmp === entry._permSavedContent)
        return;
    entry._permSavedContent = viewCmp;
    try {
        const content = screenText(entry.headless);
        const isGrok = entry.mode === CAI.eProvider.grok;
        const grokMenu = isGrok && isGrokPermissionMenu(view);
        let { type, tool, command } = _extractCtx(content, entry.workingDir, entry.cols, entry.mode);
        if (grokMenu) {
            const g = _extractGrokPermCtx(content, entry.workingDir);
            type = g?.type ?? 'write';
            tool = g?.tool ?? null;
            command = g?.command ?? null;
        }
        const tail = viewportTail(entry.headless, 12);
        const startup = _startupDialogKey(entry, tail);
        const relaunch = !startup && !!entry._cliLine && !entry._relaunched && _CLI_RESTART.test(tail);
        const isPrompt = !startup && !relaunch && !_NAV_MENU.test(viewportTail(entry.headless))
            && (isGrok
                ? grokMenu
                : (type !== 'reply' && (isCodexYesNoPrompt(entry, view) || _isPermPrompt(tail))));
        let auto = null;
        let kind = null;
        if (startup) {
            auto = 'allow';
            kind = `startup:${startup.name}`;
            if (startup.name === 'update')
                entry._relaunched = false;
            _sendApprovalKey(entry, startup.key, kind);
            if (entry.permPending) {
                entry.permPending = false;
                entry._msgAwaitingApproval = false;
                _pushStatus(entry);
            }
        }
        else if (relaunch) {
            kind = 'relaunch';
            entry._relaunched = true;
            entry._startupAt = Date.now();
            _markBusyAfterApproval(entry);
            entry.pty.write(entry._cliLine + '\r');
            schedLog(`[startup] ${entry.token} relaunch after update`);
        }
        else if (isPrompt) {
            const ctx = { type, tool, command };
            const globalPerms = _loadPermSettings();
            const sessionPerms = entry.perms ?? null;
            for (const rule of [...(globalPerms?.deny ?? []), ...(sessionPerms?.deny ?? [])]) {
                if (_matchRule(ctx, rule)) {
                    auto = 'deny';
                    kind = 'deny';
                    break;
                }
            }
            if (!auto && _isArtgineTempAccess(ctx, entry.workingDir)) {
                auto = 'allow';
                kind = 'temp';
            }
            if (!auto && sessionPerms) {
                for (const rule of sessionPerms.allow) {
                    if (_matchRule(ctx, rule)) {
                        auto = 'allow';
                        kind = 'session';
                        break;
                    }
                }
            }
            if (!auto && globalPerms) {
                for (const rule of globalPerms.allow) {
                    if (_matchRule(ctx, rule)) {
                        auto = 'allow';
                        kind = 'allow';
                        break;
                    }
                }
            }
            if (!auto && entry.superMode) {
                auto = 'allow';
                kind = 'super';
            }
            if (auto)
                _sendApprovalKey(entry, auto === 'deny' ? _denyKey(entry) : '\r', kind);
            entry.permPending = !auto;
            _pushStatus(entry);
            if (!auto && entry.msgSession) {
                entry._msgAwaitingApproval = true;
                CMessenger.Send(entry.msgSession, entry.key ?? 'terminal', _formatApprovalMsgForMessenger(ctx, tail))
                    .catch((err) => schedLog(`[Messenger] approval notify failed (session=${entry.msgSession}): ${err?.message ?? err}`));
            }
            else if (entry._msgAwaitingApproval) {
                entry._msgAwaitingApproval = false;
            }
        }
        else if (entry.permPending) {
            entry.permPending = false;
            entry._msgAwaitingApproval = false;
            _pushStatus(entry);
        }
        if (!_logEnabled())
            return;
        const dir = _ctxDir(entry);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const ts = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
        fs.writeFileSync(path.join(dir, `${ts}.json`), JSON.stringify({ token: entry.token, mode: entry.mode, key: entry.key ?? null, type, tool, command, auto, kind, isPrompt, proven, content, savedAt: new Date().toISOString() }, null, 2), 'utf8');
    }
    catch { }
}
function permOnUserKey(entry) {
    entry.permPending = false;
}
function schedLog(_msg) { }
const _SETTINGS_FILE = path.join(CAI.AIDir(), 'settings.json');
const _READ_TOOL_NAMES = /^(Read|ReadURL|Glob|Grep|LS|TodoRead|WebFetch|WebSearch|ListDir|SearchFiles|view_file|view_file_outline|view_code_item|search_in_file|read_url_content|view_content_chunk|list_dir|find_by_name|grep_search|codebase_search|command_status|list_resources|read_resource|read_terminal|search_web|Access|InitialInstructions|GetSymbolsOverview|FindSymbol|FindReferencingSymbols|FindDeclaration|FindImplementations|GetDiagnosticsForFile|ListMemories|ReadMemory)$/i;
const _ARTGINE_TEMP_DIR = path.resolve(CPath.ArtgineRootPath(), 'temp');
const _TEMP_FILE_TOOLS = /^(Read|Write|Edit|MultiEdit|NotebookEdit|WriteFile|EditFile|ReplaceInFile|view_file|write_to_file|replace_file_content|multi_replace_file_content)$/i;
function _isArtgineTempAccess(ctx, cwd) {
    if (!ctx.tool || !ctx.command || !_TEMP_FILE_TOOLS.test(ctx.tool))
        return false;
    let p = ctx.command.trim().replace(/^(['"])(.*)\1$/, '$2');
    if (!p || /[\n|;&<>*?$`]/.test(p))
        return false;
    if (process.platform === 'win32')
        p = p.replace(/^\/(?:cygdrive\/)?([A-Za-z])\//, '$1:/');
    const rel = path.relative(_ARTGINE_TEMP_DIR, path.resolve(cwd || currentCwd, p));
    return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}
const _READ_TASK_NAMES = /^(Explore|Search|Research|Review|Investigate|Analyze|Look\s*Up|Find)$/i;
const _WRITE_TOOL_NAMES = /^(Write|MultiEdit|Edit|TodoWrite|WriteFile|EditFile|ReplaceInFile|NotebookEdit|write_to_file|replace_file_content|multi_replace_file_content|generate_image)$/i;
const _SHELL_TOOLS = /^(Bash|Shell|RunShell|run_command|PowerShell|pwsh|powershell\.exe|sh|zsh|cmd|cmd\.exe)$/i;
const _READ_BASH = /^\s*(find|grep|ls|cat|type|head|tail|stat|du|wc|diff|echo|sleep|pwd|cd|which|where|file|rg|fd|findstr|tsc|sort|uniq|cut|tr|nl|column|xxd|icacls|iconv|zcat|bzcat|paste|dd|printf|od|seq|cmp|comm|xargs\s+(?:(?:-[\w{}.]+|\{\}|\d+)\s+)*(?:grep|cat|ls|head|tail|file|stat|wc|find|rg|fd|which|echo|printf|dirname|basename)|git\s+(?:-\S+\s+(?:[^-\s]\S*\s+)?)*(log|diff|status|show|config\s+--(?:list|-l\b|get(?:-all|-regexp|-urlmatch)?)|submodule\s+status|submodule\s+summary|ls-files|ls-remote|describe|blame|shortlog|stash\s+list|rev-parse|cat-file|branch(?:\s+-(?:a|r|v|vv|list))?|tag(?:\s+-l)?|remote(?:\s+-v)?)|svn\s+(?:--\S+(?:\s+\S+)?\s+|-\w\s+)*(info|diff|status|st|log|list|ls|cat|blame|praise|annotate|ann|proplist|plist|pl|propget|pget|pg)\b|Get-Content|Get-ChildItem|Select-String|Test-Path|Get-Item|Start-Sleep|ForEach-Object|Where-Object|Select-Object|Sort-Object|Measure-Object|Group-Object|Format-Table|Format-List|Format-Wide|Out-String|Out-Host|Write-Output|Write-Host|dir)\b/i;
const _WRITE_BASH = /^\s*(rm|mv|cp|mkdir|touch|chmod|chown|sed|awk|tee|npm|yarn|pnpm|git\s+(commit|push|reset|checkout|merge|rebase|add)|curl|wget|del|erase|ren|rename|rd|rmdir|md|move|copy|Set-Content|Remove-Item|New-Item|Copy-Item|Move-Item|Rename-Item|Out-File)\b/i;
const _READ_NPM_UV = /^\s*(?:npm\s+(?:config\s+(?:get|list|ls)\b|cache\s+(?:dir|ls)\b|ls\b|list\b|outdated\b|view\b|info\b|root\b|prefix\b|whoami\b|ping\b)|uv\s+(?:cache\s+dir\b|pip\s+(?:list|show|tree)\b|tree\b))/i;
const _FIND_EXEC = /^\s*find\b[\s\S]*\s-(?:delete|exec|execdir|ok|okdir|fprint|fprintf|fls)\b/i;
const _ICACLS_WRITE = /^\s*icacls\b[\s\S]*\s\/(?:grant|deny|remove|setowner|setintegritylevel|reset|save|restore|substitute|inheritance(?:level)?)\b/i;
const _ICONV_WRITE = /^\s*iconv\b[\s\S]*\s(?:-o\b|--output\b)/i;
const _DECOMPRESS_READ = /^\s*(?:gunzip\b[\s\S]*\s(?:-c\b|--stdout\b|--to-stdout\b)|(?:gzip|xz)\b(?=[\s\S]*\s(?:-d\b|--decompress\b))(?=[\s\S]*\s(?:-c\b|--stdout\b|--to-stdout\b))[\s\S]*)/i;
const _READ_OS = new RegExp('^\\s*(?:' + [
    'ps', 'pstree', 'pgrep', 'pidof', 'tasklist', 'whoami', 'id', 'groups', 'users', 'who',
    'last', 'lastb', 'lastlog', 'logname', 'quser', 'qwinsta', 'pinky',
    'uname', 'arch', 'nproc', 'uptime', 'free', 'vmstat', 'iostat', 'mpstat', 'df',
    'lsblk', 'blkid', 'findmnt', 'lsmod', 'lspci', 'lsusb', 'lshw', 'lscpu', 'lsmem',
    'lsipc', 'lslocks', 'lslogins', 'ipcs', 'getconf', 'locale', 'printenv', 'lsb_release',
    'systeminfo', 'driverquery', 'getmac', 'gpresult', 'ver', 'vol', 'klist',
    'netstat', 'ss', 'lsof', 'nstat', 'ping', 'ping6', 'traceroute', 'traceroute6',
    'tracepath', 'tracert', 'pathping', 'nslookup', 'dig', 'host', 'hostid',
    'ipconfig', 'arp', 'route', 'ip', 'hostname',
    'tree', 'getfacl', 'lsattr', 'namei', 'readlink', 'realpath', 'dirname', 'basename',
    'whereis', 'tty', 'cal', 'date', 'getent', 'help', 'man', 'whatis', 'apropos', 'more',
    'dmesg', 'journalctl', 'sysctl',
    'Get-\\w+', 'Test-\\w+', 'Measure-\\w+', 'ConvertTo-\\w+', 'ConvertFrom-\\w+',
    'Resolve-\\w+', 'Compare-Object', 'Import-Csv', 'Select-Xml', 'Split-Path', 'Join-Path',
    'gps', 'gsv', 'tnc', 'gwmi', 'gcm', 'gal', 'gv', 'gm',
].join('|') + ')\\b', 'i');
const _READ_OS_SUBCMD = new RegExp('^\\s*(?:' + [
    String.raw `systemctl\s+(?:status|show|is-active|is-enabled|is-failed|is-system-running|list-units|list-unit-files|list-jobs|list-sockets|list-timers|list-dependencies|cat|help|get-default|show-environment)\b`,
    String.raw `sc(?:\.exe)?\s+(?:query|queryex|qc|qdescription|qfailure|qsidtype|qprivs|enumdepend|GetDisplayName|GetKeyName|sdshow)\b`,
    String.raw `wmic(?:\.exe)?\s+\S[\s\S]*\b(?:get|list)\b`,
    String.raw `service\s+(?:--status-all\b|\S+\s+status\b)`,
    String.raw `query(?:\.exe)?\s+(?:user|session|process|termserver)\b`,
    String.raw `schtasks(?:\.exe)?\s+\/query\b`,
    String.raw `wevtutil(?:\.exe)?\s+(?:qe|qli?|gl|el)\b`,
    String.raw `powercfg(?:\.exe)?\s+\/(?:a|l|q|query|list|available|devicequery|waketimers|requests)\b`,
    String.raw `fsutil(?:\.exe)?\s+fsinfo\b`,
    String.raw `bcdedit(?:\.exe)?\s+\/enum\b`,
    String.raw `reg(?:\.exe)?\s+query\b`,
    String.raw `pnputil(?:\.exe)?\s+\/enum-[\w-]+`,
    String.raw `openfiles(?:\.exe)?\s+\/(?:query|local|fo)\b`,
    String.raw `ifconfig(?:\s+(?:-a|--all|[a-zA-Z0-9:._-]+))?\s*$`,
    String.raw `apt(?:-get)?\s+(?:list|show|search|policy|depends|rdepends|changelog)\b`,
    String.raw `apt-cache\s+(?:search|show|policy|depends|rdepends|pkgnames|stats|dumpavail)\b`,
    String.raw `dpkg(?:-query)?\s+(?:-[lLsS]|--list|--status|--listfiles|--search)\b`,
    String.raw `rpm\s+-q\b`,
    String.raw `unzip(?:\.exe)?\s+-q*[lvtZ][lvtqZ]*\s`,
    String.raw `zipinfo\b`,
    String.raw `networkctl\s+(?:status|list|lldp)\b`,
    String.raw `resolvectl\s+(?:status|query|dns|domain|statistics)\b`,
    String.raw `loginctl\s+(?:list-sessions|list-users|list-seats|show-session|show-user|show-seat|user-status|session-status)\b`,
    String.raw `nmcli\s+(?:-p\s+)?(?:general\s+status|device\s+(?:status|show)|connection\s+show|networking\s+connectivity)\b`,
    String.raw `timedatectl(?:\s+status)?\s*$`,
    String.raw `hostnamectl(?:\s+status)?\s*$`,
].join('|') + ')', 'i');
const _IPCONFIG_WRITE = /^\s*ipconfig\b[\s\S]*\/(?:release6?|renew6?|flushdns|registerdns)\b/i;
const _ARP_WRITE = /^\s*arp\b[\s\S]*\s(?:-[sdf]\b|\/[sd]\b|--file\b)/i;
const _ROUTE_WRITE = /^\s*route\b[\s\S]*\s(?:add|delete|del|change|flush|replace)\b/i;
const _IP_WRITE = /^\s*ip\b[\s\S]*\b(?:add|delete|del|change|replace|flush|set|exec)\b/i;
const _HOSTNAME_WRITE = /^\s*hostname\s+(?:.*\s)?(?:-F\b|--file\b|[^-/\s]\S*)/i;
const _SYSCTL_WRITE = /^\s*sysctl\b[\s\S]*(?:\s(?:-w|--write)\b|=)/i;
const _JOURNALCTL_WRITE = /^\s*journalctl\b[\s\S]*\s--(?:vacuum-\w+|rotate|relinquish-var|flush|sync|setup-keys|update-catalog)\b/i;
const _DMESG_WRITE = /^\s*dmesg\b[\s\S]*\s(?:-C|--clear|-c|--read-clear)\b/i;
const _WMIC_WRITE = /^\s*wmic\b[\s\S]*\b(?:call|create|delete|set|assoc|install)\b/i;
const _READ_TOOL_WRITE = [
    /^\s*sort\b[\s\S]*\s(?:-[A-Za-z]*o|--output\b)/,
    /^\s*tree\b[\s\S]*\s-o\b/,
    /^\s*dd\b[\s\S]*\sof=/,
    /^\s*date\b[\s\S]*\s(?:-[dfruR]*s|--set\b)|^\s*date\s+\d/,
    /^\s*tsc\b(?![\s\S]*\s(?:--noEmit(?!\s+false\b)|--showConfig|--listFilesOnly)\b)/,
    /^\s*rg\b[\s\S]*\s--pre(?:=|\s)/,
    /^\s*fd\b[\s\S]*\s(?:-[A-Za-z]*[xX]\b|--exec(?:-batch)?\b)/,
    /^\s*git(?:\s+-\S+(?:\s+(?!-)\S+)?)*?\s+-c\s*(?!(?:core\.quote[Pp]ath|color\.[\w.]+|i18n\.[\w.]+|core\.auto[Cc][Rr][Ll][Ff]|safe\.directory)=)\S/,
    /^\s*git\b[\s\S]*\s--(?:config-env|exec-path=)/i,
    /^\s*git\b[\s\S]*\s--output(?:=|\s)/i,
    /^\s*svn\b[\s\S]*\s--(?:diff-cmd|diff3-cmd|editor-cmd|config-option|config-dir)\b/i,
    /^\s*klist\b[\s\S]*\bpurge\b/i,
    /^\s*gpresult\b[\s\S]*\s\/[xh]\b/i,
    /^\s*file\b[\s\S]*\s(?:-[A-Za-z]*C|--compile)\b/,
];
function _operandCount(args, argOpt) {
    let n = 0;
    for (let i = 0; i < args.length; i++) {
        const t = args[i];
        if (t === '--')
            return n + args.length - i - 1;
        if (/^\d*[<>]+&?\d*$/.test(t)) {
            i++;
            continue;
        }
        if (/[<>]/.test(t))
            continue;
        if (argOpt.test(t)) {
            i++;
            continue;
        }
        if (t.startsWith('-') && t !== '-')
            continue;
        n++;
    }
    return n;
}
function _gitRefWrites(seg) {
    const toks = seg.trim().split(/\s+/);
    if (!/^git$/i.test(toks[0] ?? ''))
        return false;
    let i = 1;
    for (; i < toks.length && toks[i].startsWith('-'); i++)
        if (/^(?:-C|-c|--git-dir|--work-tree|--namespace)$/.test(toks[i]))
            i++;
    const sub = (toks[i] ?? '').toLowerCase();
    if (sub !== 'branch' && sub !== 'tag' && sub !== 'remote')
        return false;
    const args = toks.slice(i + 1).filter(t => !/[<>]/.test(t));
    const flags = args.filter(t => t.startsWith('-'));
    const pos = args.filter(t => !t.startsWith('-'));
    const shortHas = (letters) => flags.some(f => /^-[A-Za-z]+$/.test(f) && [...f.slice(1)].some(c => letters.includes(c)));
    const longHas = (re) => flags.some(f => re.test(f));
    const listing = longHas(/^(?:-l|--list|--contains|--no-contains|--merged|--no-merged|--points-at)(?:=|$)/);
    if (sub === 'branch')
        return shortHas('dDmMcCfut') || longHas(/^--(?:delete|move|copy|force|set-upstream-to|unset-upstream|edit-description|track|no-track|create-reflog)(?:=|$)/)
            || (pos.length > 0 && !listing);
    if (sub === 'tag')
        return shortHas('asudfmFe') || longHas(/^--(?:annotate|sign|local-user|delete|force|message|file|edit|create-reflog)(?:=|$)/)
            || (pos.length > 0 && !listing);
    return pos.length > 0 && !/^(?:show|get-url)$/i.test(pos[0]);
}
function _operandOutputWrites(seg) {
    const m = seg.match(/^\s*(uniq|xxd)\b(.*)$/i);
    if (!m)
        return false;
    const args = m[2].trim().split(/\s+/).filter(Boolean);
    const argOpt = m[1].toLowerCase() === 'uniq'
        ? /^-[fsw]$/
        : /^-(?:c|g|l|o|s|n|cols|groupsize|len|offset|seek|name)$/;
    return _operandCount(args, argOpt) >= 2;
}
function _sedScript(quote) {
    const bad = quote === "'" ? "'" : quote === '"' ? '"$\\x60' : String.raw `\s;&|<>(){}'"$\x60`;
    const delims = quote ? '/#|,:@%!' : '/#,:@%';
    const esc = (c) => '\\' + c;
    const body = (d) => String.raw `(?:\\[^${bad}\n]|[^${esc(d)}\\${bad}])*`;
    const atom = String.raw `(?:\d+(?:~\d+)?${quote === "'" ? String.raw `|\$` : ''}|/${body('/')}/)`;
    const subst = [...delims].map(d => `s${esc(d)}${body(d)}${esc(d)}${body(d)}${esc(d)}[gpiImM0-9]*`).join('|');
    const stmt = String.raw `(?:${atom}(?:,${atom})?)?!?(?:[pdq=]|${subst})`;
    return String.raw `${stmt}(?:\s*;\s*${stmt})*`;
}
const _SED_FLAG_ALT = String.raw `-n|--quiet|--silent|-E|-r|--regexp-extended|-s|--separate|-z|--null-data|-u|--unbuffered|--posix|-b|--binary`;
const _SED_FLAGS = String.raw `(?:\s+(?:${_SED_FLAG_ALT}))*`;
const _SED_SCRIPT = String.raw `(?:'${_sedScript("'")}'|"${_sedScript('"')}"|${_sedScript('')})`;
const _SED_EXPR = String.raw `\s+(?:-[nErszub]*e\s*|--expression(?:=|\s+))${_SED_SCRIPT}`;
const _SED_FILES = String.raw `(?:\s+(?:[^\s;|&<>'"\x60$\-][^\s;|&<>'"\x60$]*|"(?!-)[^"\\\x60$\n]*"|'(?!-)[^'\n]*'))*`;
const _SED_END = String.raw `(?=\s*(?:[;&|\n<>)\x60]|\d+>|$))`;
const _CMD_LEAD = String.raw `((?:^|[;&|(\x60{]\s*|\n\s*)(?:(?:do|then|else)\s+)?)`;
const _SED_READ_G = new RegExp(String.raw `${_CMD_LEAD}sed${_SED_FLAGS}(?:${_SED_EXPR}(?:\s+(?:${_SED_FLAG_ALT})|${_SED_EXPR})*|\s+${_SED_SCRIPT})(${_SED_FILES})${_SED_END}`, 'g');
function _normReadSed(cmd) {
    return cmd.replace(_SED_READ_G, (_m, lead, files) => `${lead}cat${files}`);
}
const _AWK_FS = String.raw `(?:[^\s;|&<>'"\x60$]+|'[^'\n]*'|"[^"\n$\x60\\]*")`;
const _AWK_VAR = String.raw `(?:-v\s*[A-Za-z_]\w*=${_AWK_FS}|-v\s*'[A-Za-z_]\w*=[^'\n]*'|--assign(?:=|\s+)[A-Za-z_]\w*=${_AWK_FS})`;
const _AWK_FLAGS = String.raw `(?:\s+(?:-F\s*${_AWK_FS}|--field-separator(?:=|\s+)${_AWK_FS}|${_AWK_VAR}))*`;
const _AWK_PROG = String.raw `(?:'[^']*'|"(?:\\.|[^"\\])*")`;
const _AWK_FILES = String.raw `(?:\s+[^\s;|&<>'"\x60$]+)*`;
const _AWK_READ_G = new RegExp(String.raw `${_CMD_LEAD}awk${_AWK_FLAGS}\s+(${_AWK_PROG})(${_AWK_FILES})(?=\s|;|\||&|\)|\x60|$)`, 'g');
const _AWK_UNSAFE_BODY = /\|\s*["']|\bgetline\b|\bsystem\s*\(|\bclose\s*\(|\bENVIRON\b|\$\(|\x60/i;
const _AWK_PRINT_REDIR = /print(?:f)?[^;}]*>/i;
function _awkStripLiterals(body) {
    let out = '';
    let prev = '';
    for (let i = 0; i < body.length; i++) {
        const c = body[i];
        if (c === '"') {
            let j = i + 1;
            for (; j < body.length && body[j] !== '"'; j++) {
                if (body[j] === '\\')
                    j++;
                else if (body[j] === '\n')
                    return null;
            }
            if (j >= body.length)
                return null;
            out += '""';
            prev = '"';
            i = j;
            continue;
        }
        if (c === '/' && prev === ')')
            return null;
        if (c === '/' && (prev === '' || /[(,{};!~&|=?:\n]/.test(prev) || /(?:^|[^\w])(?:print|printf|return|in)\s*$/.test(out))) {
            let j = i + 1, cls = false;
            for (; j < body.length; j++) {
                const d = body[j];
                if (d === '\\') {
                    j++;
                    continue;
                }
                if (d === '\n')
                    return null;
                if (cls) {
                    if (d === ']')
                        cls = false;
                    continue;
                }
                if (d === '[') {
                    cls = true;
                    continue;
                }
                if (d === '/')
                    break;
            }
            if (j >= body.length)
                return null;
            out += '//';
            prev = '/';
            i = j;
            continue;
        }
        out += c;
        if (!/\s/.test(c))
            prev = c;
    }
    return out;
}
function _normReadAwk(cmd) {
    return cmd.replace(_AWK_READ_G, (m, lead, prog, files) => {
        const code = prog[0] === "'" ? _awkStripLiterals(prog.slice(1, -1)) ?? prog : prog;
        return _AWK_UNSAFE_BODY.test(prog) || _AWK_PRINT_REDIR.test(code) ? m : `${lead}cat${files}`;
    });
}
const _FS_REMOTE_AUTH = /^\s*node\s+\S*remotecmd\.js\s+\S+\s+remote\s+\S+\s*$/i;
const _WEB_DEBUG_READ = /^\s*node\s+\S*browser\.js\b/i;
const _CHECK_TOOL_READ = /^\s*node\s+(?:\S*[/\\])?ai[/\\]tool[/\\](?:tsc_check|asc_check)\.js(?=\s|$)/i;
const _SHELL_TEST_SET = /^\s*(?:\[\[?\s[\s\S]*\s\]\]?\s*$|test(?:\s|$)|set(?:\s|$)|read(?:\s|$)|(?:true|false|:|break|continue)(?:\s|$))/;
function _stripTimeout(seg) {
    return seg.replace(/^\s*timeout(?:\s+--?[\w-]+(?:=\S+)?)*\s+\d+(?:\.\d+)?[smhd]?\s+(?=\S)/i, '');
}
const _INFO_FLAG = /^\s*[\w.-]+\s+--(?:version|help)\s*$/i;
function _unwrapCmd(command) {
    let cmd = command;
    const cmdM = cmd.match(/^(?:cmd|cmd\.exe)\s+\/{1,2}[cC]\s+(.+)/);
    if (cmdM)
        cmd = cmdM[1].trim().replace(/^"(.*)"$/, '$1');
    const psM = cmd.match(/^\s*(?:\S*[/\\])?(?:powershell|pwsh)(?:\.exe)?\s+(?:-\w+(?:\s+[^-\s'"][^\s'"]*)?\s+)*?-C(?:ommand)?\s+"?([\s\S]+?)"?\s*$/i);
    if (psM)
        cmd = psM[1].trim();
    const shM = cmd.match(/^(?:bash|sh|zsh)\s+-\w*c\s+([\s\S]+)$/i);
    if (shM) {
        let body = shM[1].trim()
            .replace(/^'([\s\S]*)'$/, '$1').replace(/^"([\s\S]*)"$/, '$1');
        if ((body[0] === '"' || body[0] === "'") && body[body.length - 1] !== body[0])
            body = body.slice(1).trim();
        cmd = body.replace(/\\"/g, '"').replace(/\\'/g, "'").trim();
    }
    const fsM = cmd.match(/^\s*node\s+\S*remotecmd\.js\s+\S+\s+cmd\s+([\s\S]+)$/i);
    if (fsM) {
        cmd = fsM[1].trim()
            .replace(/^'([\s\S]*)'$/, '$1').replace(/^"([\s\S]*)"$/, '$1').trim();
    }
    if (/[/\\]rg\.exe\b/i.test(cmd))
        cmd = 'rg ' + cmd.replace(/^.*[/\\]rg\.exe\s*/i, '');
    return cmd;
}
function _bashTool(command) {
    const cmd = _unwrapCmd(command);
    const m = cmd.match(/^\s*(?:.*&&\s*)?(node|python3?|npx|ts-node|deno|bun|ruby|php|perl|java|dotnet)\b/i);
    if (!m)
        return 'Bash';
    const name = m[1].toLowerCase();
    if (name.startsWith('python'))
        return 'Python';
    if (name === 'npx' || name === 'ts-node')
        return 'Node';
    return name.charAt(0).toUpperCase() + name.slice(1);
}
const _CURL_WRITE_FLAGS = /\s(?:-[oOT]\b|--output\b|--remote-name\b|--upload-file\b|-OutFile\b|-InFile\b)/i;
const _WEB_READ_CMD = /^\s*(?:curl|Invoke-WebRequest|Invoke-RestMethod|iwr|irm)\b/i;
function _isReadCurl(seg) {
    return _WEB_READ_CMD.test(seg) && !_CURL_WRITE_FLAGS.test(seg);
}
const _REDIRECT = /(?:^|\s|\d)>{1,2}(?!>)\s*(?![&\s])(?!\/dev\/null\b)(?!nul\b)(?!\$null\b)(?!['"]?(?:\/private)?\/(?:var\/)?tmp\/)(?!['"]?\$\{?(?:TMPDIR|TEMP|TMP)\}?[\\/])(?!['"]?%(?:TEMP|TMP)%[\\/]?)(?!['"]?[A-Za-z]:[\\/](?:[^\s'"]*[\\/])?Temp[\\/])(?!['"]?\/(?:cygdrive\/)?[A-Za-z]\/(?:[^\s'"]*\/)?Temp\/)(?!['"]?(?:\.[\\/])?temp[\\/](?![^\s'"]*\.\.))/i;
const _TEMP_TARGET = /^(?:(?:\/private)?\/(?:var\/)?tmp\/|\$\{?(?:TMPDIR|TEMP|TMP)\}?[\\/]|%(?:TEMP|TMP)%[\\/]|[A-Za-z]:[\\/](?:[^\s'"]*[\\/])?Temp[\\/]|\/(?:cygdrive\/)?[A-Za-z]\/(?:[^\s'"]*\/)?Temp\/|(?:\.[\\/])?temp[\\/])/i;
function _isTempRedirectTarget(p) {
    if (!_TEMP_TARGET.test(p))
        return false;
    const rest = p.replace(/^\$\{?(?:TMPDIR|TEMP|TMP)\}?/i, '');
    return !/[|;&<>(){}\x60"'\n$]|\.\./.test(rest);
}
function _matchParen(s, open) {
    let depth = 0;
    for (let i = open; i < s.length; i++) {
        const c = s[i];
        if (c === '\\') {
            i++;
            continue;
        }
        if (c === "'") {
            const e = s.indexOf("'", i + 1);
            if (e < 0)
                return -1;
            i = e;
            continue;
        }
        if (c === '"') {
            let j = i + 1;
            for (; j < s.length && s[j] !== '"'; j++)
                if (s[j] === '\\')
                    j++;
            if (j >= s.length)
                return -1;
            i = j;
            continue;
        }
        if (c === '(')
            depth++;
        else if (c === ')' && --depth === 0)
            return i;
    }
    return -1;
}
const _SUB_MARK = '$__S';
function _extractCmdSubs(s, subs) {
    let out = '';
    for (let i = 0; i < s.length; i++) {
        const end = s[i] === '$' && s[i + 1] === '(' ? _matchParen(s, i + 1) : -1;
        if (end < 0) {
            out += s[i];
            continue;
        }
        const inner = _extractCmdSubs(s.slice(i + 2, end), subs);
        const arith = inner[0] === '(' && _matchParen(inner, 0) === inner.length - 1
            && /^[\s\w$+\-*\/%<>=!&|^~?:,.()\[\]]*$/.test(inner) && !/[\w\])]\s+[\w$(]/.test(inner);
        if (!arith)
            subs.push(inner);
        out += arith ? ' ' : _SUB_MARK;
        i = end;
    }
    return out;
}
const _VAR_INDIRECT = /(?<![\w-])(?:eval|source|declare|typeset|local|export|readonly|read|mapfile|readarray|getopts|let|unset|IFS)(?![\w-])|(?:^|[;&|\n({]\s*)\.\s|\bprintf\s+-v\b|<<|\$'/;
const _LITERAL_ASSIGN = /(^|[;\n][ \t]*|&&[ \t]*)([A-Za-z_]\w*)=(?:"([^"$\x60\\\n!]*)"|'([^'\n]*)'|([\w./:@%+,=-]+))(?=[ \t]*(?:[;\n]|&&|$))/g;
const _CHAIN_BREAK = /[;\n]|\|\||(?<![&>|<])&(?![&>])/;
const _VAR_CMD_RISK = /^(?:eval|source|\.|trap|command|builtin|exec|time|coproc|declare|typeset|local|export|readonly|let|printf|read|mapfile|readarray|getopts|unset|wait|alias|bind|complete|compgen|fc|enable|shopt|set|env|sudo|nohup|xargs|nice|if|then|else|elif|while|until|do|done|for|case|esac|in|select|function)$/i;
function _varIndirectText(cmd) {
    return cmd.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, '\x03')
        .split(/[;&|\n(){}\x60]/)
        .map(p => {
        const toks = p.trim().split(/\s+/);
        let i = 0;
        while (i < toks.length && /^[A-Za-z_]\w*=/.test(toks[i]))
            i++;
        const head = toks[i];
        return head && /^[\w./-]+$/.test(head) && !_VAR_CMD_RISK.test(head) ? toks.slice(0, i + 1).join(' ') : p;
    }).join(';');
}
function _substLiteralVars(cmd) {
    if (/<</.test(cmd) || (/\$'/.test(cmd) && /\\'/.test(cmd)) || _VAR_INDIRECT.test(_varIndirectText(cmd)))
        return cmd;
    const vals = [];
    for (const m of cmd.matchAll(_LITERAL_ASSIGN)) {
        const at = m.index + m[1].length;
        const val = m[3] ?? m[4] ?? m[5];
        if (/[$\x60\\*?[\]{}~!'"]/.test(val))
            continue;
        const sub = [];
        const prefix = _extractCmdSubs(cmd.slice(0, at), sub)
            .replace(/'[^']*'/g, ' ').replace(/"(?:\\.|[^"\\])*"/g, ' ');
        if (/[(){}\x60]|(?<![\w-])(?:if|then|else|elif|fi|for|while|until|do|done|case|esac|select|function|in)(?![\w-])/.test(prefix))
            continue;
        let end = Infinity;
        if (m[1].startsWith('&&')) {
            if (_CHAIN_BREAK.test(prefix.slice(Math.max(prefix.lastIndexOf(';'), prefix.lastIndexOf('\n')) + 1)))
                continue;
            const brk = cmd.slice(at).search(_CHAIN_BREAK);
            if (brk >= 0)
                end = at + brk;
        }
        const name = m[2];
        const all = cmd.match(new RegExp(`(?<!\\w)${name}(?!\\w)`, 'g'))?.length ?? 0;
        const uses = cmd.match(new RegExp(`\\$${name}(?!\\w)|\\$\\{${name}\\}`, 'g'))?.length ?? 0;
        if (all - uses !== 1)
            continue;
        vals.push({ name, val, at, end });
    }
    if (!vals.length)
        return cmd;
    let out = '';
    let sq = false, dq = false;
    for (let i = 0; i < cmd.length; i++) {
        const c = cmd[i];
        if (sq) {
            if (c === "'")
                sq = false;
            out += c;
            continue;
        }
        if (c === '\\') {
            out += c + (cmd[i + 1] ?? '');
            i++;
            continue;
        }
        if (c === "'" && !dq) {
            sq = true;
            out += c;
            continue;
        }
        if (c === '"') {
            dq = !dq;
            out += c;
            continue;
        }
        if (c === '$') {
            const m = cmd.slice(i).match(/^\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))/);
            const v = m && vals.find(x => x.name === (m[1] ?? m[2]) && x.at < i && i < x.end);
            if (v) {
                out += v.val;
                i += m[0].length - 1;
                continue;
            }
        }
        out += c;
    }
    return out;
}
const _WRAPPER_CALL = /(^|[;&|]\s*|\n\s*)(?:\S*[/\\])?(?:powershell|pwsh|bash|sh|zsh|cmd)(?:\.exe)?\s+(?:-\w+(?:\s+[^-\s'"][^\s'"]*)?\s+)*?(?:-C(?:ommand)?|-\w*c|\/[ck])\s+('[^']*'|"(?:\\.|[^"\\])*")/gi;
function _stripHeredocs(cmd) {
    if (!cmd.includes('<<'))
        return cmd;
    const lines = cmd.split('\n');
    const out = [];
    let q = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const delims = [];
        let kept = '';
        for (let k = 0; k < line.length; k++) {
            const c = line[k];
            if (q) {
                if (c === q && !(q === '"' && line[k - 1] === '\\'))
                    q = null;
                kept += c;
                continue;
            }
            if (c === "'" || c === '"') {
                q = c;
                kept += c;
                continue;
            }
            if (c === '<' && line[k + 1] === '<' && line[k + 2] !== '<' && line[k - 1] !== '<') {
                const m = line.slice(k + 2).match(/^-?\s*(?:'(\w+)'|"(\w+)"|(\w+))/);
                if (m) {
                    delims.push({ d: m[1] || m[2] || m[3], quoted: !m[3] });
                    k += 1 + m[0].length;
                    kept += ' ';
                    continue;
                }
            }
            kept += c;
        }
        out.push(delims.length ? kept : line);
        for (const { d, quoted } of delims) {
            let end = -1;
            for (let j = i + 1; j < lines.length; j++)
                if (lines[j].trim() === d) {
                    end = j;
                    break;
                }
            if (end < 0)
                for (let j = i + 1; j < lines.length; j++)
                    if (new RegExp(`\\s${d}\\s*$`).test(lines[j])) {
                        end = j;
                        break;
                    }
            if (end < 0)
                return cmd;
            if (!quoted && lines.slice(i + 1, end + 1).some(l => /\$\(|`/.test(l)))
                return cmd;
            i = end;
        }
    }
    return q ? cmd : out.join('\n');
}
function _extractBackticks(s, subs) {
    const real = (i) => { let n = 0; while (i - 1 - n >= 0 && s[i - 1 - n] === '\\')
        n++; return n % 2 === 0; };
    let out = '';
    for (let i = 0; i < s.length; i++) {
        if (s[i] !== '`' || !real(i)) {
            out += s[i];
            continue;
        }
        let j = i + 1;
        while (j < s.length && !(s[j] === '`' && real(j)))
            j++;
        if (j >= s.length) {
            out += s.slice(i);
            break;
        }
        subs.push(s.slice(i + 1, j));
        out += _SUB_MARK;
        i = j;
    }
    return out;
}
function _bashSegs(cmd) {
    cmd = _substLiteralVars(_stripHeredocs(cmd));
    const subs = [];
    const norm = _normReadAwk(_normReadSed(cmd));
    const pre = norm.replace(/`["']/g, '\x01');
    let body = _extractBackticks(_extractCmdSubs(pre, subs), subs);
    _extractBackticks(norm, subs);
    body = body.replace(_WRAPPER_CALL, (_m, lead, quoted) => {
        subs.push(quoted.slice(1, -1));
        return lead + ' ';
    });
    const qs = [];
    const hold = (inner) => `\x02${qs.push(inner) - 1}\x02`;
    const keep = (m, off, s) => /(?:^|[\s\d])>{1,2}\s*$/.test(s.slice(0, off)) && _isTempRedirectTarget(m.slice(1, -1));
    const mask = (s) => s
        .replace(/'[^']*'/g, (m, off, str) => keep(m, off, str) ? m : `'${hold(m.slice(1, -1))}'`)
        .replace(/"(?:\\.|[^"\\])*"/g, (m, off, str) => keep(m, off, str) ? m : `"${hold(m.slice(1, -1))}"`);
    const unmask = (s) => {
        for (let i = 0, prev = ''; i < 8 && prev !== s; i++) {
            prev = s;
            s = s.replace(/\x02(\d+)\x02/g, (_m, n) => qs[+n] ?? '');
        }
        return s;
    };
    body = mask(body);
    const fnNames = new Set();
    body = body.replace(/(^|[;&|\n]\s*)(?:function\s+([A-Za-z_][\w:-]*)\s*(?:\(\s*\))?|([A-Za-z_][\w:-]*)\s*\(\s*\))\s*(?=\{)/g, (_m, lead, a, b) => { fnNames.add((a ?? b)); return lead + ' '; });
    const callFix = (seg) => {
        const m = seg.match(/^([A-Za-z_][\w:-]*)(?=\s|$)/);
        return m && fnNames.has(m[1]) ? 'echo' + seg.slice(m[1].length) : seg;
    };
    for (let prev = ''; prev !== body;) {
        prev = body;
        body = body.replace(/(?<!\$)\{([^{}]*)\}/g, (_m, s) => { subs.push(s); return ' '; });
    }
    const split = (s) => s.split(/\s*(?:&&|\|\||[;|\n])\s*/)
        .map(x => x.trim().replace(/^(do|then|else)\s+/i, '').replace(/^(?:if|elif|while|until)\s+(?:!\s+)?/i, '')
        .replace(/^case\s+\S+\s+in(?:\s+[^\s()<>]+$|\s+|$)/i, '').replace(/^\(?[^\s()<>]+\)\s+(?=\S)/, '')
        .replace(/^(?:done|fi|esac)(?=[\s<>\d])/i, ':')
        .replace(/^\(+/, '').replace(/\)+$/, '').trim())
        .filter(Boolean)
        .filter(x => !/^(for|foreach|while|until|do|done|then|else|elif|fi|if|esac|try|catch|finally)\b/i.test(x));
    return [...split(body), ...subs.flatMap(s => split(mask(s)))].map(callFix).map(seg => ({ seg, raw: unmask(seg) }));
}
const _PS_EXPR = /^(\$\w+|[-\d.]+|''|""|@|\+\+|--|-[a-z]+\b|[*/%,\s()\[\].])+$/i;
const _PS_SAFE_MEMBERS = new Set([
    'fullname', 'name', 'basename', 'extension', 'directory', 'directoryname', 'parent', 'root',
    'path', 'pspath', 'provider', 'length', 'exists', 'attributes', 'mode', 'isreadonly', 'linktype', 'target',
    'lastwritetime', 'lastwritetimeutc', 'creationtime', 'creationtimeutc', 'lastaccesstime',
    'substring', 'tostring', 'trim', 'trimstart', 'trimend', 'tolower', 'toupper',
    'tolowerinvariant', 'toupperinvariant', 'split', 'replace', 'indexof', 'lastindexof',
    'contains', 'startswith', 'endswith', 'padleft', 'padright', 'chars', 'compareto', 'equals',
    'count', 'value', 'keys', 'values', 'item', 'containskey',
    'line', 'linenumber', 'filename', 'matches', 'context', 'ignoredcase', 'pattern',
    'statuscode', 'statusdescription', 'content', 'rawcontent', 'rawcontentlength', 'headers',
    'exception', 'message', 'response', 'innerexception',
    'resolve-path', 'split-path', 'join-path', 'convert-path', 'get-item', 'get-childitem', 'test-path',
    'get-location', 'get-date', 'get-host', 'get-process', 'get-command', 'get-alias', 'get-variable',
    'select-object', 'where-object', 'foreach-object', 'sort-object', 'measure-object', 'select-string',
    'break', 'continue', 'return',
    'id', 'processname', 'mainwindowtitle', 'mainwindowhandle', 'starttime', 'cpu', 'handles',
    'workingset', 'company', 'description', 'product', 'fileversion',
]);
function _isSafePsExpr(seg) {
    if (/=/.test(seg))
        return false;
    const bare = seg.replace(/\[[A-Za-z_][\w.]*\]/g, ' ');
    const ids = bare.match(/(?<![$\w-])[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z][A-Za-z0-9]*)*/g);
    if (!ids)
        return _PS_EXPR.test(bare);
    return ids.every(id => _PS_SAFE_MEMBERS.has(id.toLowerCase()));
}
function _stripPkgRunner(seg) {
    return seg.replace(/^(?:npx|bunx|pnpx)\s+(?:--prefix\s+\S+\s+|--registry\s+\S+\s+|-[yqn]\s+|--yes\s+|--no\s+|--quiet\s+)*/, '').trim();
}
const _NODE_PY_INLINE = /^\s*(?:node|nodejs|python3?)\s+(?:-[\w-]+(?:=\S+)?\s+)*(?:-e|--eval|-c)\s+(['"])([\s\S]*)\1\s*(?:\d*>{1,2}&?\d*(?:\s+\S+)?\s*)*$/i;
const _NODE_CHECK_ONLY = /^\s*(?:node|nodejs)\s+(?:--check|-c)\s+(['"]?)([^\s'"]+)\1\s*$/i;
const _NODE_PY_SCRIPT = /^\s*(node|nodejs|python3?)\s+(['"]?)([^\s'"]+\.(?:mjs|cjs|js|ts|py))\2(?=\s|$)/i;
const _PS_FILE_SCRIPT = /^\s*(?:powershell|pwsh)(?:\.exe)?\s+(?:-\w+(?:\s+[^-\s'"][^\s'"]*)?\s+)*?-File\s+(['"]?)([^\s'"]+\.ps1)\1(?=\s|$)/i;
const _JS_DANGEROUS = /\b(?:writeFile(?:Sync)?|appendFile(?:Sync)?|unlink(?:Sync)?|rmdir(?:Sync)?|rmSync|rm(?:Sync)?|mkdir(?:Sync)?|rename(?:Sync)?|chmod(?:Sync)?|chown(?:Sync)?|truncate(?:Sync)?|createWriteStream|symlink(?:Sync)?|linkSync|copyFile(?:Sync)?|cp(?:Sync)?)\s*\(|require\(\s*['"](?:child_process|worker_threads|execa|shelljs|del|rimraf|fs-extra|mkdirp)['"]\s*\)|from\s+['"](?:child_process|worker_threads|execa|shelljs|del|rimraf|fs-extra|mkdirp)['"]|\bchild_process\b|\bworker_threads\b|\bfs\s*\.\s*(?:open(?:Sync)?|write(?:Sync)?|writev(?:Sync)?)\s*\(|\bexecSync\s*\(|\bexecFileSync\s*\(|\bspawnSync\s*\(|\bexec\s*\(|\bexecFile\s*\(|\bspawn\s*\(|\bfork\s*\(|\bnew\s+Worker\s*\(|\bnew\s+Winreg\s*\(|\beval\s*\(|\bnew\s+Function\s*\(|\bvm\s*\.\s*(?:runIn\w*|Script)\b|\bprocess\s*\.\s*kill\s*\(/;
const _PY_OPEN_MODE = /\bopen\s*\((?:[^()]|\([^()]*\))*?['"]([rwaxbtRWAXBT+]{1,3})['"]/g;
const _PY_RISKY_FROM_IMPORT = /\bfrom\s+(?:os|subprocess|shutil|shlex|pty|tempfile|winreg|ctypes|multiprocessing)\s+import\b/;
const _PY_BARE_DANGEROUS = /\b(?:system|popen|startfile|chroot|setuid|setgid|seteuid|setegid|posix_spawn|mkfifo|mknod|unlink|rmdir|makedirs|chown|kill|remove|rename|replace|link|spawn\w*)\s*\(/;
const _PY_DANGEROUS_REST = /\bos\s*\.\s*(?:mkdir|renames|chmod|truncate|symlink|utime|exec\w*)\s*\(|\bshutil\s*\.\s*(?:rmtree|move|copy\w*)\s*\(|\bsubprocess\s*\.\s*(?:run|call|Popen|check_call|check_output|getoutput|getstatusoutput)\s*\(|\bpty\s*\.\s*spawn\s*\(|\btempfile\s*\.\s*(?:mkstemp|mkdtemp|NamedTemporaryFile|TemporaryFile)\s*\(|\bmultiprocessing\s*\.\s*Process\s*\(|\bwinreg\s*\.\s*(?:SetValue\w*|CreateKey\w*|DeleteKey\w*|DeleteValue\w*)\s*\(|\b__import__\s*\(|\bimportlib\s*\.\s*import_module\s*\(|\bctypes\b|\.\s*(?:write_text|write_bytes|mkdir|touch|chmod|symlink_to|hardlink_to)\s*\(|\beval\s*\(|\bexec\s*\(|\bcompile\s*\(/;
const _SQL_WRITE_KEYWORD = /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|TRUNCATE|GRANT|REVOKE|PRAGMA)\b/i;
const _SQL_WRITE_CALL = new RegExp(`\\.\\s*(?:run|exec|prepare|query|execute|executemany|executescript)\\s*\\(\\s*[\`'"][^\`'"]*?${_SQL_WRITE_KEYWORD.source}`, 'i');
const _SQLITE3_CLI = /^\s*sqlite3(?:\.exe)?\s+(['"]?)[^\s'"]+\1(?:\s+(['"]?)([\s\S]*?)\2)?\s*$/i;
const _SQLITE3_SAFE_DOT = /^\.(?:tables|schema|indexes|indices|databases|mode|headers?|width|help|version|show|fullschema|stats|dump|excel|separator|nullvalue|prompt|echo|eqp|explain)\b/i;
function _classifySqlite3Cli(seg) {
    const m = seg.match(_SQLITE3_CLI);
    if (!m)
        return null;
    const q = m[3];
    if (q === undefined)
        return 'unsafe';
    const query = q.trim();
    if (!query)
        return 'unsafe';
    if (query.startsWith('.'))
        return _SQLITE3_SAFE_DOT.test(query) ? 'read' : 'unsafe';
    return _SQL_WRITE_KEYWORD.test(query) ? 'unsafe' : 'read';
}
function _pyOpenIsWrite(src) {
    _PY_OPEN_MODE.lastIndex = 0;
    let m;
    while ((m = _PY_OPEN_MODE.exec(src))) {
        if (/[waxWAX+]/.test(m[1]))
            return true;
    }
    return false;
}
const _PS_DANGEROUS = /\b(?:Set-Content|sc|Add-Content|ac|Clear-Content|clc|Remove-Item|ri|del|erase|rd|rmdir|New-Item|ni|md|mkdir|Copy-Item|cpi|copy|cp|Move-Item|mi|move|mv|Rename-Item|rni|ren|Out-File|Set-ItemProperty|sp|New-ItemProperty|Remove-ItemProperty|Clear-ItemProperty|Set-Acl|Start-Process|saps|start|Stop-Process|spps|kill|Invoke-Expression|iex|Invoke-Command|icm|Invoke-WebRequest|iwr|Invoke-RestMethod|irm|New-Service|Set-Service|Restart-Service|Stop-Service|Remove-Service|Set-ExecutionPolicy|Register-ScheduledTask|Unregister-ScheduledTask|New-PSDrive|Remove-PSDrive|New-Object)\b|\[System\.IO\.(?:File|Directory)\]\s*::\s*\w+|\.\s*(?:WriteAllText|WriteAllBytes|WriteAllLines|AppendAllText|AppendAllLines|AppendText|Delete|CopyTo|MoveTo|Save|SetValue|SetAccessControl)\s*\(|&\s*\$\w+|`\s*(?:iex|Invoke-Expression)\b/i;
function _isDangerousScriptSrc(src, lang) {
    if (lang === 'js')
        return _JS_DANGEROUS.test(src) || _SQL_WRITE_CALL.test(src);
    if (lang === 'ps1')
        return _PS_DANGEROUS.test(src) || _SQL_WRITE_CALL.test(src);
    return _pyOpenIsWrite(src) || _PY_BARE_DANGEROUS.test(src) || _PY_DANGEROUS_REST.test(src) || _PY_RISKY_FROM_IMPORT.test(src) || _SQL_WRITE_CALL.test(src);
}
const _SCRIPT_SCAN_MAX_BYTES = 512 * 1024;
function _classifyScriptExec(seg, cwd) {
    if (_NODE_CHECK_ONLY.test(seg))
        return 'read';
    const inlineM = seg.match(_NODE_PY_INLINE);
    if (inlineM) {
        if (inlineM[1] === '"' && /\$[A-Za-z_{(]|\x60/.test(inlineM[2]))
            return 'unsafe';
        const lang = /^\s*python/i.test(seg) ? 'py' : 'js';
        return _isDangerousScriptSrc(inlineM[2], lang) ? 'unsafe' : 'read';
    }
    const scriptM = seg.match(_NODE_PY_SCRIPT);
    if (scriptM) {
        const lang = /^python/i.test(scriptM[1]) ? 'py' : 'js';
        let scriptPath = scriptM[3];
        if (!path.isAbsolute(scriptPath)) {
            if (!cwd)
                return 'unsafe';
            scriptPath = path.join(cwd, scriptPath);
        }
        let src;
        try {
            if (fs.statSync(scriptPath).size > _SCRIPT_SCAN_MAX_BYTES)
                return 'unsafe';
            src = fs.readFileSync(scriptPath, 'utf8');
        }
        catch {
            return 'unsafe';
        }
        return _isDangerousScriptSrc(src, lang) ? 'unsafe' : 'read';
    }
    const psM = seg.match(_PS_FILE_SCRIPT);
    if (psM) {
        let scriptPath = psM[2];
        if (!path.isAbsolute(scriptPath)) {
            if (!cwd)
                return 'unsafe';
            scriptPath = path.join(cwd, scriptPath);
        }
        let src;
        try {
            if (fs.statSync(scriptPath).size > _SCRIPT_SCAN_MAX_BYTES)
                return 'unsafe';
            src = fs.readFileSync(scriptPath, 'utf8');
        }
        catch {
            return 'unsafe';
        }
        return _isDangerousScriptSrc(src, 'ps1') ? 'unsafe' : 'read';
    }
    return null;
}
const _ASSIGN_PREFIX = /^(?:\w+=(?!=)\s*|\$\w+\s*=(?!=)\s*)/;
const _PURE_ASSIGN = /^(?:\w+=(?!=)\S*|\$\w+\s*=(?!=)\s*\S*)$/;
const _ENV_PREFIX = /^(?:[A-Za-z_]\w*=(?!=)(?:"(?:\\.|[^"\\])*"|'[^']*'|[^\s'"])*\s+)+/;
function _stripAssign(s) {
    const env = s.replace(_ENV_PREFIX, '');
    return env !== s ? env : s.replace(_ASSIGN_PREFIX, '');
}
function _segSafe(rawSeg, cwd, srcSeg) {
    if (_PURE_ASSIGN.test(rawSeg))
        return 'skip';
    const seg = _stripTimeout(_stripAssign(rawSeg));
    if (!seg)
        return 'skip';
    const inner = _stripPkgRunner(seg);
    const innerSrc = _stripPkgRunner(_stripTimeout(_stripAssign(srcSeg ?? rawSeg)));
    if (_INFO_FLAG.test(inner))
        return 'read';
    if (_FS_REMOTE_AUTH.test(inner) || _WEB_DEBUG_READ.test(inner))
        return 'read';
    if (_CHECK_TOOL_READ.test(inner) && !_REDIRECT.test(seg))
        return 'read';
    if (_isReadCurl(inner) && !_REDIRECT.test(seg))
        return 'read';
    if (_READ_NPM_UV.test(inner) && !_REDIRECT.test(seg))
        return 'read';
    if (_DECOMPRESS_READ.test(inner) && !_REDIRECT.test(seg))
        return 'read';
    if (_WRITE_BASH.test(inner) || _REDIRECT.test(seg) || _FIND_EXEC.test(inner) || _ICACLS_WRITE.test(inner) || _ICONV_WRITE.test(inner)
        || _IPCONFIG_WRITE.test(inner) || _ARP_WRITE.test(inner) || _ROUTE_WRITE.test(inner) || _IP_WRITE.test(inner)
        || _HOSTNAME_WRITE.test(inner) || _SYSCTL_WRITE.test(inner) || _JOURNALCTL_WRITE.test(inner) || _DMESG_WRITE.test(inner)
        || _WMIC_WRITE.test(inner)
        || _READ_TOOL_WRITE.some(re => re.test(inner)) || _gitRefWrites(inner) || _operandOutputWrites(inner))
        return 'unsafe';
    if (_READ_BASH.test(inner) || _READ_OS.test(inner) || _READ_OS_SUBCMD.test(inner) || _SHELL_TEST_SET.test(inner))
        return 'read';
    const scriptVerdict = _classifyScriptExec(innerSrc, cwd);
    if (scriptVerdict)
        return scriptVerdict;
    const sqliteVerdict = _classifySqlite3Cli(inner);
    if (sqliteVerdict)
        return sqliteVerdict;
    if (/^(?:\$\{?\w+\}?)+(?:\s|$)/.test(inner))
        return 'unsafe';
    if (_isSafePsExpr(inner))
        return 'read';
    return 'unsafe';
}
function _classifyBash(command, cwd) {
    const cmd = _unwrapCmd(command);
    const tool = _bashTool(cmd);
    let sawRead = false;
    for (const { seg, raw } of _bashSegs(cmd)) {
        const r = _segSafe(seg, cwd, raw);
        if (r === 'unsafe')
            return { type: 'write', tool };
        if (r === 'read')
            sawRead = true;
    }
    return { type: sawRead ? 'read' : 'write', tool };
}
function _normToolName(raw) {
    const t = raw.replace(/\s+/g, '');
    if (/^Update$/i.test(t))
        return 'Edit';
    return t;
}
function _classifyTool(rawTool, command, cwd) {
    const tool = _normToolName(rawTool);
    if (_SHELL_TOOLS.test(tool)) {
        if (!command)
            return { type: 'write', tool, command };
        const { type, tool: t } = _classifyBash(command, cwd);
        return { type, tool: t, command };
    }
    if (_WRITE_TOOL_NAMES.test(tool))
        return { type: 'write', tool, command };
    if (_READ_TOOL_NAMES.test(tool))
        return { type: 'read', tool, command };
    return { type: 'write', tool, command };
}
const _PERM_PAT = /\ballow\s+(?:access|reading|writing|[A-Za-z][\w ]*[:(])|yes,\s*allow\b|\bpermission\s+required\b|\bpermit\b|\by\/n\b|\[y\]|\(y\/n\)|(?<!-)\bapprove\b|do\s+you\s+want|proceed\?|would you like to run|press enter to confirm|esc to cancel\s*·\s*tab to amend|yes,\s*proceed\b|no,\s*reject\b/i;
const _PERM_LOOSE = /\ballow\b|\bpermit\b|\by\/n\b|\[y\]|\(y\/n\)|(?<!-)\bapprove\b|do\s+you\s+want|proceed\?|would you like to run|press enter to confirm|esc to cancel\s*·\s*tab to amend|yes,\s*proceed\b|no,\s*reject\b/i;
const _PERM_OPTS = /(^|\n)\s*[>❯]?\s*\d+\.\s+\S|\(y\/n\)|\[y\/n\]|\by\/n\b|press\s+enter\s+to\s+confirm|esc\s+to\s+cancel/i;
const _CHOICE_ROW = /^\s*([>❯›▶●])?\s*(\d+)[.)]\s+(\S.*)$/;
const _CHOICE_YES = /^(?:yes|allow|proceed|approve|accept|ok|run|trust|continue)\b/i;
const _CHOICE_NO = /^(?:no|deny|reject|cancel|decline|exit|quit|don't)\b/i;
function _isChoiceMenu(tail) {
    const lines = tail.split('\n');
    let i = lines.length - 1;
    let skipped = 0;
    while (i >= 0 && !_CHOICE_ROW.test(lines[i])) {
        if (++skipped > 4)
            return false;
        i--;
    }
    if (i < 0)
        return false;
    const rows = [];
    for (; i >= 0; i--) {
        const m = _CHOICE_ROW.exec(lines[i]);
        if (!m)
            break;
        rows.unshift({ num: Number(m[2]), cursor: !!m[1], text: m[3].trim() });
    }
    if (rows.length < 2 || rows.some((r, k) => r.num !== k + 1))
        return false;
    if (rows.filter(r => r.cursor).length !== 1)
        return false;
    return rows.some(r => _CHOICE_YES.test(r.text)) && rows.some(r => _CHOICE_NO.test(r.text));
}
function _isPermPrompt(tail) {
    return _PERM_PAT.test(tail) || (_PERM_LOOSE.test(tail) && _PERM_OPTS.test(tail)) || _isChoiceMenu(tail);
}
const _PERM_BANNER = /^[ \t]*Permission\s+(?:allow|deny|ask)\s+rule\s*\(/i;
function isGrokPermissionMenu(text) {
    const row = (i) => new RegExp(`^\\s*(?:[│┃|][\\s|]*)?${i}\\s*\\([^)\\n]*\\).*$`, 'mi').exec(text)?.[0];
    const all = [...text.matchAll(/1\s*\/\s*(\d+)\s*:\s*select/gi)];
    let n = 0;
    if (all.length)
        n = Number(all[all.length - 1][1]);
    else if (/↑\s*\/\s*↓\s*:\s*choose/.test(text)) {
        while (n < 6 && row(n + 1) !== undefined)
            n++;
    }
    if (n < 3 || n > 5)
        return false;
    const rows = [];
    for (let i = 1; i <= n; i++)
        rows.push(row(i));
    if (rows.some(r => r === undefined))
        return false;
    return rows.some(r => /\bYes\b/i.test(r)) && rows.some(r => /\bNo,\s*reject\b/i.test(r));
}
function _lastMatch(content, re) {
    const all = [...content.matchAll(re)];
    return all.length ? all[all.length - 1] : null;
}
function _extractGrokRunCmd(content) {
    const lines = content.split('\n');
    const strip = (l) => l.replace(/^\s*(?:[│┃|]\s*)?/, '').replace(/[█\s]+$/, '');
    let menu = -1;
    for (let i = lines.length - 1; i >= 0; i--)
        if (/^\s*(?:[│┃|][\s|]*)?1\s*\([^)\n]*\).*\bYes\b/i.test(lines[i])) {
            menu = i;
            break;
        }
    if (menu < 0)
        return null;
    let i = menu - 1;
    while (i >= 0 && !strip(lines[i]))
        i--;
    const block = [];
    for (; i >= 0 && strip(lines[i]); i--)
        block.unshift(strip(lines[i]));
    if (block.length < 2)
        return null;
    if (/^>\s+\S/.test(block[0])) {
        const body = block.slice(1).filter(l => !/^←\s*→\s*narrow scope\b/.test(l));
        const segs = [];
        for (const l of body) {
            if (/^│(?:\s|$)/.test(l))
                segs.push(l.replace(/^│\s?/, '').trimEnd());
            else if (segs.length && /^:\s/.test(l)) {
                const prev = segs[segs.length - 1];
                segs[segs.length - 1] = (prev.endsWith('·') ? prev.slice(0, -1) + ' ' : prev) + l.replace(/^:\s/, '').trimEnd();
            }
            else
                return null;
        }
        const cmd = segs.map(s => s.trim()).filter(Boolean).join(' ');
        return cmd || null;
    }
    const label = block[0].toLowerCase();
    let headerOk = false;
    for (const m of content.matchAll(/\bRun\s+(.+)/gi)) {
        const hdr = m[1].replace(/[.…█\s]+$/, '').trim().toLowerCase();
        if (hdr && label.startsWith(hdr)) {
            headerOk = true;
            break;
        }
    }
    if (!headerOk)
        return null;
    return block.slice(1).join(' ');
}
function _extractGrokPermCtx(content, cwd) {
    const fetch = _lastMatch(content, /Allow\s+Fetch:\s*([^\n?]+)\??/gi);
    if (fetch)
        return { type: 'read', tool: 'WebFetch', command: fetch[1].trim() };
    const cl = content.split('\n');
    let mi = -1;
    for (let i = cl.length - 1; i >= 0; i--)
        if (/^\s*(?:[│┃|][\s|]*)?1\s*\([^)\n]*\).*\bYes\b/i.test(cl[i])) {
            mi = i;
            break;
        }
    const editTo = mi >= 0 ? /Allow\s+(Edit|Write)\s+to\s+([^\n?]+)\??/i.exec(cl.slice(Math.max(0, mi - 6), mi).join('\n')) : null;
    if (editTo)
        return _classifyTool(editTo[1], editTo[2].trim(), cwd);
    const allow = _lastMatch(content, /Allow\s+([A-Za-z][\w ]*?):\s*([^\n?]+)\??/gi);
    if (allow)
        return _classifyTool(allow[1].trim(), allow[2].trim(), cwd);
    const mcp = _lastMatch(content, /Allow\s+\(([^)\n]+)\)\s+([^\n?]+?)\s*\?/gi);
    if (mcp)
        return _classifyTool(mcp[2].trim(), null, cwd);
    const runCmd = _extractGrokRunCmd(content);
    if (runCmd) {
        const c = _classifyBash(runCmd, cwd);
        return { type: c.type, tool: c.tool, command: runCmd };
    }
    return null;
}
const _NAV_MENU = /\bto navigate\b/i;
function _joinBashCmd(block, cols) {
    const noTip = block.replace(/Tip:[\s\S]*?\bbelow\b\s*\n?/i, '');
    const rows = noTip.split('\n')
        .map(l => ({ box: /^\s*[│┃]/.test(l), len: _dispWidth(l.trimEnd()), t: l.replace(/^\s*[│┃]\s*/, '').trim() }))
        .filter(r => r.t)
        .filter(r => !/^This command requires approval$/i.test(r.t))
        .filter(r => !/^Contains\s+[\w\s]+$/i.test(r.t));
    let use = [];
    const seps = rows.flatMap((r, i) => /^╌{3,}$/.test(r.t) ? [i] : []);
    if (seps.length)
        use = rows.slice(seps[0] + 1, seps.length > 1 ? seps[seps.length - 1] : rows.length);
    const first = rows.findIndex(r => r.box);
    if (!use.length && first >= 0) {
        const rest = rows.slice(first);
        const stop = rest.findIndex(r => !r.box);
        use = stop > 0 ? rest.slice(0, stop) : rest;
    }
    else if (!use.length) {
        use = rows.slice();
        if (use.length >= 2)
            use.pop();
    }
    const W = Math.max((cols ?? 0) - 3, ...use.map(r => r.len));
    let s = use.length ? use[0].t : '';
    for (let i = 1; i < use.length; i++) {
        const prev = use[i - 1];
        const nextWord = use[i].t.split(/\s/)[0];
        const lastWord = prev.t.split(/\s/).pop();
        const broken = prev.len >= W && _dispWidth(lastWord) + _dispWidth(nextWord) > _dispWidth(prev.t)
            && !/[<>|;&()]$/.test(lastWord) && !/^[<>|;&()-]/.test(nextWord);
        const toolArg = /^(?:eval|exec)\b/i.test(use[i].t) && /(?:^|[;&|\n]\s*)node\s+\S*ai[/\\]tool[/\\][\w.-]+\.js\b[^;&|\n]*$/i.test(s);
        const wrap = prev.len + 1 + _dispWidth(nextWord) >= W && (toolArg || !_WRAP_RISKY_HEAD.test(use[i].t));
        s += (broken ? '' : wrap ? ' ' : '\n') + use[i].t;
    }
    return s;
}
const _WRAP_RISKY_HEAD = new RegExp(String.raw `^(?:${_WRITE_BASH.source.replace(/^\^\\s\*/, '')}|(?:node|nodejs|python3?|bash|sh|zsh|pwsh|powershell|cmd|eval|exec|source|sudo|xargs|env|perl|ruby|php|deno|bun|npx|start|Invoke-Expression|iex)\b)`, 'i');
const _WIDE_CHAR = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/g;
function _dispWidth(s) {
    return s.length + (s.match(_WIDE_CHAR)?.length ?? 0);
}
function _extractCtx(content, cwd, cols, mode) {
    let bestPos = -1;
    let result = { type: 'reply', tool: null, command: null };
    const _NOISE = /[⎿✢✶✻✽]/;
    const consider = (re, make) => {
        const all = [...content.matchAll(re)];
        if (!all.length)
            return;
        const clean = all.filter(m => m[2] === undefined || !_NOISE.test(m[2]));
        if (!clean.length)
            return;
        const m = clean[clean.length - 1];
        if (m.index > bestPos) {
            bestPos = m.index;
            result = make(m);
        }
    };
    consider(/(Read|Write|Edit|Create|Delete|Modify|Append|Update)\s*:\s*([^\n]*(?:\n[^\n]*){0,3}?)\s*\n\s*Allow access to this file\?/gi, m => {
        const isRead = /^read$/i.test(m[1]);
        return { type: isRead ? 'read' : 'write', tool: isRead ? 'Read' : 'Edit', command: m[2].replace(/\n/g, '').trim() };
    });
    consider(/(Create|Edit|Delete|Modify|Write|Overwrite|Update|Append)\s+file[ \t]*\n[ \t]*[─-]{3,}[ \t]*\n[ \t]*(\S[^\n]*?)[ \t]+[+-]\d+(?:[ \t]+[+-]\d+)*[ \t]*\n(?:(?![ \t]*Allow )[^\n]*\n){0,80}?[ \t]*Allow [a-z ]+ of this file\?/gi, m => {
        return { type: 'write', tool: 'Edit', command: m[2].trim() };
    });
    consider(/Requesting permission for:\s*([^\n]+)/gi, m => {
        const { type, tool } = _classifyBash(m[1].trim(), cwd);
        return { type, tool, command: m[1].trim() };
    });
    consider(/(?:Bash|PowerShell|pwsh|Shell|cmd) command[^\n]*\n((?:(?!(?<=^|\n)[ \t]*(?:Bash|PowerShell|pwsh|Shell|cmd) command\b)[\s\S])*?)\n\s*(?:This command requires approval|Do you want to proceed\?)/gim, m => {
        const command = _joinBashCmd(m[1], cols);
        const { type, tool } = _classifyBash(command, cwd);
        return { type, tool, command };
    });
    consider(/\b([A-Za-z]\w*)\(([^)\n]*)\)\s*\nDo you want to proceed\?/gi, m => _classifyTool(m[1].trim(), m[2].trim() || null, cwd));
    consider(/([A-Za-z][\w ]*?)\n[─\-]{3,}\n([^\n]+)\nDo you want to proceed\?/gi, m => _classifyTool(m[1].trim(), m[2].trim() || null, cwd));
    consider(/Do you want to make this edit(?:\s+to\s+([^?\n]+))?\?/gi, m => ({ type: 'write', tool: 'Edit', command: m[1] ? m[1].trim() : null }));
    consider(/Do you want to (?:create|overwrite|write\s+to)\s+((?:[^\s?\n]*[\\/])?[^\s?\n]+\.[A-Za-z0-9]{1,8})\s*\?/gi, m => ({ type: 'write', tool: 'Write', command: m[1].trim() }));
    consider(/Allow\s+([\w ]+?)\(([^)\n]*)\)/g, m => _classifyTool(m[1].trim(), m[2].trim() || null, cwd));
    consider(/[●•]\s*([A-Za-z][A-Za-z_]*(?:\s+[A-Za-z]+)*)\(([^)\n]*)\)/g, m => _classifyTool(m[1].trim(), m[2].trim() || null, cwd));
    consider(/Tool use\s*\n\s*([A-Za-z][A-Za-z_]*(?:\s+[A-Za-z]+)*)\(([^)\n]*)\)/g, m => _classifyTool(m[1].trim(), m[2].trim() || null, cwd));
    consider(/Claude wants to ([a-z][a-z ]*)/gi, m => {
        const act = m[1].toLowerCase();
        const url = content.match(/\burl:\s*"([^"]+)"/i)?.[1] ?? null;
        const cmd = content.match(/\bcommand:\s*"([^"]+)"/i)?.[1] ?? null;
        if (/search the web|web search/.test(act))
            return { type: 'read', tool: 'WebSearch', command: null };
        if (/fetch/.test(act))
            return { type: 'read', tool: 'WebFetch', command: url };
        if (/(run|execute)/.test(act) && cmd) {
            const c = _classifyBash(cmd, cwd);
            return { type: c.type, tool: c.tool, command: cmd };
        }
        if (/(edit|creat|writ|updat|modif|make|change|delet|remov|rename|move)/.test(act))
            return { type: 'write', tool: 'Edit', command: null };
        if (/(read|view|list|open|fetch)/.test(act))
            return { type: 'read', tool: 'Read', command: url };
        return { type: 'write', tool: null, command: null };
    });
    consider(/Permission required(?:(?!\$)[\s\S]){0,40}?([A-Za-z]+(?:\s[A-Za-z]+)*)\s*"([^"\n]*)"/gi, m => _classifyTool(m[1].trim(), m[2].trim() || null, cwd));
    consider(/Permission required[\s\S]{0,60}?%\s*([A-Za-z][A-Za-z_]*)\b[^\n]*\n[\s\S]{0,80}?[A-Za-z]+:\s*([^\n┃]+)/gi, m => _classifyTool(m[1].trim(), m[2].trim() || null, cwd));
    consider(/Permission required[^\w\n]{0,20}[←→]\s*([A-Za-z][A-Za-z_]*)\s+([^\n┃]+)/gi, m => _classifyTool(m[1].trim(), m[2].trim() || null, cwd));
    consider(/Permission required[\s\S]{0,80}?#\s*([A-Za-z]+)\s*Task\b[\s\S]{0,80}?◉\s*([^\n┃]+)/gi, m => {
        const taskName = m[1].trim();
        return { type: _READ_TASK_NAMES.test(taskName) ? 'read' : 'write', tool: null, command: m[2].trim() };
    });
    consider(/Permission required[\s\S]{0,160}?[\n┃][^\w\n]{0,10}\$\s+([^\n┃]+)/gi, m => {
        const { type, tool } = _classifyBash(m[1].trim(), cwd);
        return { type, tool, command: m[1].trim() };
    });
    if (mode === CAI.eProvider.codex)
        consider(/Run:\s*(.+)/gi, m => {
            const { type, tool } = _classifyBash(m[1].trim(), cwd);
            return { type, tool, command: m[1].trim() };
        });
    consider(/Would you like to run[^\n]*\n(?:[^\n]*\n)?\s*\$\s+([^\n]+)/gi, m => {
        const { type, tool } = _classifyBash(m[1].trim(), cwd);
        return { type, tool, command: m[1].trim() };
    });
    consider(/allow\s+reading\s+from\s+([^\n]+?)(?:\s+from\s+this\s+project)?\s*$/gim, m => ({
        type: 'read', tool: 'Read', command: m[1].trim()
    }));
    if (bestPos >= 0)
        return result;
    if (/Allow sandbox bypass|Allow access to this file\?|Requesting permission for|tab Amend/i.test(content))
        return { type: 'write', tool: null, command: null };
    if (/apply\s+patch|would\s+you\s+like\s+to\s+make.*edit|do\s+you\s+want\s+to\s+make.*edit/i.test(content))
        return { type: 'write', tool: 'Edit', command: null };
    const permTail = content.split('\n').filter(l => !_PERM_BANNER.test(l)).slice(-12).join('\n');
    if (_isPermPrompt(permTail))
        return { type: 'write', tool: null, command: null };
    return { type: 'reply', tool: null, command: null };
}
function _loadPermSettings() {
    try {
        if (!fs.existsSync(_SETTINGS_FILE))
            return null;
        return JSON.parse(fs.readFileSync(_SETTINGS_FILE, 'utf8')).permissions ?? null;
    }
    catch {
        return null;
    }
}
function _parseAgentPermsQuery(raw) {
    const empty = { allow: [], deny: [] };
    if (!raw)
        return empty;
    try {
        const parsed = JSON.parse(raw);
        const norm = (arr) => (Array.isArray(arr) ? arr : [])
            .map((r) => {
            const o = {};
            if (typeof r?.type === 'string' && r.type)
                o.type = r.type;
            if (typeof r?.tool === 'string' && r.tool)
                o.tool = r.tool;
            if (typeof r?.command === 'string' && r.command)
                o.command = r.command;
            return o;
        })
            .filter((r) => r.type !== undefined || r.tool !== undefined || r.command !== undefined);
        return { allow: norm(parsed?.allow), deny: norm(parsed?.deny) };
    }
    catch {
        return empty;
    }
}
function _logEnabled() {
    try {
        if (!fs.existsSync(_SETTINGS_FILE))
            return true;
        return JSON.parse(fs.readFileSync(_SETTINGS_FILE, 'utf8')).log !== false;
    }
    catch {
        return true;
    }
}
function _commandRuleMatches(command, rulePrefix) {
    const cmd = _unwrapCmd(command ?? '');
    const pfx = rulePrefix.toLowerCase().replace(/\\/g, '/');
    function matchesPfx(seg) {
        const s = seg.toLowerCase().replace(/\\/g, '/');
        if (pfx.includes('*')) {
            const pattern = pfx.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
            return new RegExp('^' + pattern + '(\\s|\\.|$)', 'i').test(s);
        }
        if (!s.startsWith(pfx))
            return false;
        const rest = seg.slice(pfx.length);
        return rest === '' || /^[\s.]/.test(rest);
    }
    const isPureAssign = (s) => _PURE_ASSIGN.test(s);
    const stripAssign = (s) => {
        const real = s.replace(/^\$?\w+=\S*(?:\s+|$)/, '');
        if (real !== s)
            return real;
        return s.replace(_ASSIGN_PREFIX, '');
    };
    const segs = _bashSegs(cmd);
    if (segs.length <= 1) {
        const trimmed = cmd.trimStart();
        return matchesPfx(stripAssign(trimmed)) && !_REDIRECT.test(trimmed);
    }
    let matched = false;
    for (const { seg: rawSeg, raw } of segs) {
        if (isPureAssign(rawSeg))
            continue;
        const seg = stripAssign(rawSeg);
        if (matchesPfx(seg)) {
            if (_REDIRECT.test(rawSeg))
                return false;
            matched = true;
            continue;
        }
        if (_segSafe(rawSeg, undefined, raw) !== 'unsafe')
            continue;
        if (matched) {
            const firstTok = seg.split(/\s/)[0];
            if (/[/\\]/.test(firstTok) && !/^\.\//.test(firstTok))
                continue;
        }
        return false;
    }
    return matched;
}
function _matchRule(ctx, rule) {
    if (rule.type !== undefined && rule.type !== ctx.type)
        return false;
    if (rule.tool !== undefined && rule.tool.toLowerCase() !== (ctx.tool ?? '').toLowerCase())
        return false;
    if (rule.command !== undefined && !_commandRuleMatches(ctx.command, rule.command))
        return false;
    return true;
}
function isCodexYesNoPrompt(entry, content) {
    if (entry.mode !== CAI.eProvider.codex)
        return false;
    const compact = content.replace(/\s+/g, ' ').toLowerCase();
    return /would you like to run the following command/.test(compact)
        || /press enter to confirm or esc to cancel/.test(compact)
        || /\b(?:yes|y)\b.{0,80}\b(?:no|n)\b/.test(compact)
        || /\b(?:no|n)\b.{0,80}\b(?:yes|y)\b/.test(compact)
        || /(?:\(|\[)?\s*y\s*\/\s*n\s*(?:\)|\])?/.test(compact)
        || /(?:\(|\[)?\s*n\s*\/\s*y\s*(?:\)|\])?/.test(compact);
}
const gSchedulerRuntime = new Map();
async function _schedSend(rec) {
    await CWorkOrder.Create(`scheduler:${rec.name}`, rec.subAgentKey, rec.command);
    schedLog(`[Scheduler] name=${rec.name} → work order created for ${rec.subAgentKey}`);
}
async function _tickSchedulers() {
    const records = await CTerminalScheduler.List();
    const names = new Set(records.map(r => r.name));
    for (const key of gSchedulerRuntime.keys())
        if (!names.has(key))
            gSchedulerRuntime.delete(key);
    for (const rec of records) {
        let rt = gSchedulerRuntime.get(rec.name);
        if (!rt) {
            rt = { cschedule: new CSchedule(), tempTarget: {}, lastFiredKey: '', initialized: false };
            gSchedulerRuntime.set(rec.name, rt);
        }
        const option = rec.option;
        let fire = false;
        let reachedLimit = false;
        if (rec.mode === 'time') {
            const now = new Date();
            const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const days = rec.option.days ?? [];
            if (days.includes(now.getDay()) && now.getHours() === (rec.option.hour ?? 0) && now.getMinutes() === (rec.option.minute ?? 0) && rt.lastFiredKey !== nowKey) {
                rt.lastFiredKey = nowKey;
                fire = true;
                if (option.autoEnd)
                    reachedLimit = true;
            }
        }
        else {
            rt.cschedule.mDelay = rec.option.delay ?? 0;
            rt.cschedule.mCount = rec.option.count ?? 0;
            rt.cschedule.mStart = rec.option.start ?? 0;
            rt.cschedule.mEnd = rec.option.end ?? 0;
            if (!rt.initialized) {
                rt.initialized = true;
                if ((rec.option.start ?? 0) === 0) {
                    fire = true;
                    rt.tempTarget.mTemp = { mTimer: new CTimer(), mCount: 1, mTime: 0, mDelay: 0, mOffset: 0 };
                }
                else {
                    fire = rt.cschedule.Execute(rt.tempTarget);
                }
            }
            else {
                fire = rt.cschedule.Execute(rt.tempTarget);
            }
            const count = rec.option.count ?? 0;
            if (fire && count > 0 && (rt.tempTarget?.mTemp?.mCount ?? 0) >= count && (option.autoEnd ?? true))
                reachedLimit = true;
        }
        if (fire)
            await _schedSend(rec);
        if (reachedLimit) {
            await CTerminalScheduler.Delete(rec.name);
            gSchedulerRuntime.delete(rec.name);
            schedLog(`[Scheduler] name=${rec.name} → auto-ended (mode=${rec.mode}, count=${rec.option.count})`);
        }
    }
}
let gConvBusy = false;
async function _completeWorkOrderByLog(key) {
    const order = await CWorkOrder.Working(key);
    if (!order)
        return;
    const taskRow = await CProviderLog.FindTaskRow(key, order.logId, CWorkOrder.Marker(order.id));
    if (!taskRow || !await CProviderLog.HasFinalAfter(key, taskRow))
        return;
    if (await CWorkOrder.CompleteIfWorking(order.id))
        schedLog(`[WorkOrder] id=${order.id} assignee=${key} → DONE (final answer logged)`);
}
function _liveSessions() {
    const out = [];
    for (const e of gSessions.values()) {
        if (e.mode === 'cmd' || !e._recentInputs)
            continue;
        out.push({ key: e.key ?? e.token, provider: e.mode, cwd: e.workingDir ?? currentCwd, inputs: e._recentInputs });
    }
    return out;
}
async function _tickConversationLog() {
    if (gConvBusy)
        return;
    const live = _liveSessions();
    if (!live.length)
        return;
    gConvBusy = true;
    try {
        const chunks = await ConvReader.Poll(live);
        for (const c of chunks) {
            await CProviderLog.Append({
                key: c.key,
                provider: String(c.provider),
                sessionId: c.sessionId, cwd: c.cwd,
                model: c.model, role: c.role, text: c.text ?? '',
                tool: c.tool ?? '', file: c.file ?? '',
                createdAt: CProviderLog.Stamp(c.iso),
            });
            if (c.role === 'assistant' && c.key)
                await _completeWorkOrderByLog(c.key);
            if (c.role === 'tool' || !c.key)
                continue;
            const text = (c.text ?? '').trim();
            if (text === '')
                continue;
            const target = _findByKeyOrToken(c.key);
            if (!target?.msgSession)
                continue;
            if (c.role === 'user') {
                const i = target._msgEcho?.indexOf(text) ?? -1;
                if (i >= 0) {
                    target._msgEcho.splice(i, 1);
                    continue;
                }
            }
            try {
                await CMessenger.Send(target.msgSession, c.role === 'user' ? 'terminal' : c.key, c.role === 'user' ? '🧑 ' + text : text);
            }
            catch (err) {
                schedLog(`[Messenger] send failed (session=${target.msgSession}): ${err?.message ?? err}`);
            }
        }
    }
    catch (err) {
        schedLog(`[ConvLog] poll failed: ${err?.message ?? err}`);
    }
    finally {
        gConvBusy = false;
    }
}
const INPUT_HIST_MAX = 20;
const INPUT_HIST_TTL_MS = 600_000;
function _recordInput(entry, text) {
    if (entry.mode === 'cmd' || !entry._recentInputs)
        return;
    const clean = text.trim();
    if (!clean)
        return;
    if (/^\/\S/.test(clean))
        return;
    const now = Date.now();
    entry._recentInputs.push({ text: clean, at: now, used: false });
    entry._recentInputs = entry._recentInputs
        .filter(i => now - i.at < INPUT_HIST_TTL_MS)
        .slice(-INPUT_HIST_MAX);
}
function _quote(a) { return /\s/.test(a) && !/^".*"$/.test(a) ? `"${a}"` : a; }
async function startPty(mode, cwd, mcp = true, mdcopy = false, key, presetToken, initialPrompt, model, superMode, perms) {
    const resolvedCwd = cwd ? path.resolve(currentCwd, cwd) : '';
    const spawnCwd = (resolvedCwd && fs.existsSync(resolvedCwd)) ? resolvedCwd : currentCwd;
    let tempMd;
    if (mdcopy && mode !== 'cmd' && spawnCwd !== currentCwd) {
        const copied = CAI.CreateRole(mode, spawnCwd);
        if (typeof copied === 'string') {
            tempMd = copied;
        }
    }
    const shellCmd = IS_WIN ? 'cmd.exe' : '/bin/sh';
    let shellArgs;
    let cliLine = '';
    if (mode !== 'cmd') {
        const _svrAddr = CServerMain.Main().GetServer()?.address();
        const _svrPort = typeof _svrAddr === 'object' && _svrAddr ? _svrAddr.port : 8050;
        const _svrPath = CServerMain.Main().GetPath();
        const _svrHost = await CServerMain.GetAccessibleHost(_svrPort);
        CAI.CreateRole(mode, undefined, _svrHost, _svrPort, _svrPath);
        const built = await CAI.Terminal(mode, mcp, model);
        const cli = built.args.map(_quote).join(' ');
        cliLine = cli;
        shellArgs = IS_WIN ? ['/k', `chcp 65001>nul && ${cli}`] : ['-c', cli];
    }
    else {
        shellArgs = IS_WIN ? ['/k', 'chcp 65001>nul'] : [];
    }
    const cols = 220, rows = 50;
    const spawnEnv = { ...process.env };
    delete spawnEnv.NODE_OPTIONS;
    let term;
    try {
        term = ptyMod.spawn(shellCmd, shellArgs, { name: 'xterm-color', cols, rows, cwd: spawnCwd, env: spawnEnv, useConptyDll: true });
    }
    catch {
        return null;
    }
    const token = presetToken ?? randomBytes(16).toString('hex');
    const headless = new HeadlessTerminal({ cols, rows, allowProposedApi: true, scrollback: 500 });
    const now = Date.now();
    const entry = {
        pty: term, headless, mode, token,
        clients: new Set(), readOnlyClients: new Set(),
        buffer: [], bufferSize: 0, cols, rows,
        updatedAt: now, lastMsg: '', lastContent: '', _inputBuf: '', _writeChain: Promise.resolve(), _escState: 'none', _csiParams: '', _inPaste: false,
        _cmdSent: true, _permTimer: null, _permDeadline: null, _permSavedContent: '', _permStableSample: '', _permDeferCount: 0,
        _busyTimer: null,
        createdAt: now, workingDir: spawnCwd,
    };
    if (cliLine && IS_WIN)
        entry._cliLine = cliLine;
    if (key)
        entry.key = key;
    if (tempMd)
        entry.tempMd = tempMd;
    if (superMode)
        entry.superMode = true;
    if (perms && ((perms.allow?.length ?? 0) > 0 || (perms.deny?.length ?? 0) > 0))
        entry.perms = perms;
    if (mode !== 'cmd')
        entry._recentInputs = [];
    if (initialPrompt) {
        entry._pendingInitPrompt = initialPrompt;
        _scheduleInitPrompt(entry);
    }
    if (!_ctxCleared) {
        _ctxCleared = true;
        if (fs.existsSync(CTX_DIR)) {
            try {
                fs.rmSync(CTX_DIR, { recursive: true });
            }
            catch { }
        }
    }
    if (!_uploadsCleared) {
        _uploadsCleared = true;
        if (fs.existsSync(UPLOAD_DIR)) {
            try {
                fs.rmSync(UPLOAD_DIR, { recursive: true });
            }
            catch { }
        }
    }
    term.onData((data) => {
        if (entry._disposed)
            return;
        headless.write(data);
        entry.buffer.push(data);
        entry.bufferSize += data.length;
        while (entry.bufferSize > MAX_BUFFER_SIZE && entry.buffer.length > 1)
            entry.bufferSize -= entry.buffer.shift().length;
        if (entry._cmdSent && Date.now() - entry.updatedAt < BUSY_IDLE_MS)
            entry.updatedAt = Date.now();
        for (const c of entry.clients)
            if (c.readyState === WebSocket.OPEN)
                c.send(data);
        for (const c of entry.readOnlyClients)
            if (c.readyState === WebSocket.OPEN)
                c.send(data);
        _pushStatus(entry);
        if (entry._busyTimer)
            clearTimeout(entry._busyTimer);
        entry._busyTimer = setTimeout(() => _pushStatus(entry), BUSY_IDLE_MS);
        if (entry._permTimer)
            clearTimeout(entry._permTimer);
        entry._permTimer = setTimeout(() => permOnScreen(entry), PERM_IDLE_MS);
        _permArmDeadline(entry);
    });
    term.onExit(() => {
        if (entry._permTimer) {
            clearTimeout(entry._permTimer);
            entry._permTimer = null;
        }
        if (entry._busyTimer) {
            clearTimeout(entry._busyTimer);
            entry._busyTimer = null;
        }
        _permResetDeadline(entry);
        entry._disposed = true;
        try {
            entry.headless.dispose();
        }
        catch { }
        for (const c of entry.clients) {
            try {
                c.close();
            }
            catch { }
        }
        for (const c of entry.readOnlyClients) {
            try {
                c.close();
            }
            catch { }
        }
        if (entry.tempMd) {
            CAI.DeleteRole(entry.mode, path.dirname(entry.tempMd));
        }
        gSessions.delete(token);
    });
    gSessions.set(token, entry);
    return token;
}
function _killTree(pid) {
    try {
        if (IS_WIN) {
            spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], { windowsHide: true });
        }
        else {
            try {
                process.kill(-pid, 'SIGKILL');
            }
            catch {
                process.kill(pid, 'SIGKILL');
            }
        }
    }
    catch { }
}
function killSession(token) {
    const entry = gSessions.get(token);
    if (!entry)
        return;
    if (entry._permTimer)
        clearTimeout(entry._permTimer);
    _permResetDeadline(entry);
    for (const c of entry.clients) {
        try {
            c.close();
        }
        catch { }
    }
    for (const c of entry.readOnlyClients) {
        try {
            c.close();
        }
        catch { }
    }
    entry.clients.clear();
    entry.readOnlyClients.clear();
    entry.buffer = [];
    entry.bufferSize = 0;
    entry._disposed = true;
    try {
        entry.headless.dispose();
    }
    catch { }
    const pid = entry.pty.pid;
    try {
        entry.pty.kill();
    }
    catch { }
    if (pid)
        _killTree(pid);
    if (entry.tempMd) {
        CAI.DeleteRole(entry.mode, path.dirname(entry.tempMd));
    }
    gSessions.delete(token);
}
function killAll() { for (const token of [...gSessions.keys()])
    killSession(token); }
const HANDOFF_PROVIDERS = {
    claude: CAI.eProvider.claude, codex: CAI.eProvider.codex,
    antigravity: CAI.eProvider.antigravity, opencode: CAI.eProvider.opencode,
    grok: CAI.eProvider.grok,
};
const gSubAgentStarting = new Set();
async function _ensureSubAgentSessions() {
    const targets = [
        ...(await CSubAgent.List()).map(rec => ({ rec, fromCatalog: true })),
        ..._teamTempAgentAll().map(rec => ({ rec, fromCatalog: false })),
    ];
    for (const { rec: a, fromCatalog } of targets) {
        if (!(a.provider in HANDOFF_PROVIDERS))
            continue;
        if (fromCatalog ? _keyTaken(a.key) : _findByKey(a.key) !== null)
            continue;
        if (gSubAgentStarting.has(a.key))
            continue;
        gSubAgentStarting.add(a.key);
        const mode = HANDOFF_PROVIDERS[a.provider];
        try {
            const token = await startPty(mode, a.workingDir || undefined, true, false, a.key, undefined, undefined, a.model || undefined, a.super === 1, a.permissions);
            if (token && fromCatalog) {
                const entry = gSessions.get(token);
                if (entry)
                    entry.fromCatalog = true;
            }
            schedLog(`[SubAgent] start key=${a.key} provider=${a.provider} model=${a.model} workingDir=${a.workingDir} → ${token ? 'ok' : 'failed'}`);
        }
        finally {
            gSubAgentStarting.delete(a.key);
        }
    }
}
async function _tickKillRemovedSubAgents() {
    const catalogKeys = new Set((await CSubAgent.List()).map(a => a.key));
    for (const entry of [...gSessions.values()]) {
        if (!entry.fromCatalog || !entry.key)
            continue;
        if (catalogKeys.has(entry.key))
            continue;
        schedLog(`[SubAgent] key=${entry.key} removed from catalog → killing session`);
        killSession(entry.token);
    }
}
const gAgentRetryCount = new Map();
const RETRY_REQUESTER_PREFIX = 'retry:';
async function _tickAgentRetries() {
    const agents = await CSubAgent.List();
    for (const a of agents) {
        if (!a.retryText || a.retryCount <= 0) {
            gAgentRetryCount.delete(a.key);
            continue;
        }
        if (!_keyTaken(a.key))
            continue;
        const pending = await CWorkOrder.ReadyList(a.key);
        if (pending)
            continue;
        const latest = await CWorkOrder.Latest(a.key);
        if (!latest || latest.status !== 'done')
            continue;
        const fired = gAgentRetryCount.get(a.key);
        if (fired === undefined)
            continue;
        if (fired >= a.retryCount)
            continue;
        await CWorkOrder.Create(`${RETRY_REQUESTER_PREFIX}${a.key}`, a.key, a.retryText);
        gAgentRetryCount.set(a.key, fired + 1);
        schedLog(`[Retry] key=${a.key} → retry work order created (${fired + 1}/${a.retryCount})`);
    }
}
const WORK_ORDER_BASE_COMMAND = 'You are a registered sub-agent. Complete the task instructions below.';
function _teamStamp() {
    const d = new Date();
    const p = (v) => (v < 10 ? `0${v}` : `${v}`);
    return Number(`${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`);
}
const TEAM_AUTO_MAX = 20;
function _parseTeamAutoSpecs(raw) {
    let parsed;
    try {
        parsed = JSON.parse(raw || '[]');
    }
    catch {
        return [];
    }
    if (!Array.isArray(parsed))
        return [];
    const out = [];
    let total = 0;
    for (const item of parsed) {
        const provider = String(item?.provider ?? '');
        if (!(provider in HANDOFF_PROVIDERS))
            continue;
        const want = Math.max(1, Math.floor(Number(item?.count) || 1));
        const count = Math.min(want, TEAM_AUTO_MAX - total);
        if (count <= 0)
            break;
        total += count;
        out.push({ provider, model: String(item?.model ?? '').trim(), count });
    }
    return out;
}
function _teamBuildAutoAgents(teamKey, specs, workingDir, goal) {
    const out = [];
    for (const spec of specs) {
        for (let i = 0; i < spec.count; i++) {
            let key = '';
            let n = out.length + 1;
            do {
                key = `${teamKey}-${spec.provider}${n++}`;
            } while (_keyTaken(key) || out.some(a => a.key === key));
            out.push({
                key,
                provider: spec.provider,
                model: spec.model,
                score: 0,
                traits: [
                    `You are an auto-created member of team ${teamKey}.`,
                    `The team goal is: ${goal}`,
                    'Do only the task you are given, then give the result as your final answer. Do not dispatch work to anyone else.',
                ],
                workingDir,
                super: 1,
                retryText: '',
                retryCount: 0,
                permissions: { allow: [], deny: [] },
                hidden: 0,
            });
        }
    }
    return out;
}
function _teamCleanup(teamKey) {
    const list = gTeamTempAgents.get(teamKey);
    if (!list)
        return [];
    gTeamTempAgents.delete(teamKey);
    for (const a of list) {
        const entry = _findByKey(a.key);
        if (entry)
            killSession(entry.token);
    }
    schedLog(`[Team] cleanup key=${teamKey} agents=${list.map(a => a.key).join(',')}`);
    return list.map(a => a.key);
}
function _tickTeamCleanup() {
    for (const teamKey of [...gTeamTempAgents.keys()]) {
        if (_findByKey(teamKey))
            continue;
        schedLog(`[Team] main session gone key=${teamKey} → cleaning up auto-created staff`);
        _teamCleanup(teamKey);
        _teamCancelOrders(teamKey).catch(() => { });
    }
}
async function _teamCancelOrders(teamKey) {
    const ids = await CWorkOrder.FailPending(teamKey);
    for (const id of ids)
        gWoNotified.add(id);
    if (ids.length > 0)
        schedLog(`[Team] cancelled pending orders key=${teamKey} ids=${ids.join(',')}`);
    return ids;
}
function _teamBuildTask(teamKey, startedAt, goal, agents, limitMin, remindMin, autoAgents) {
    const autoKeys = new Set(autoAgents.map(a => a.key));
    return [
        'You are the main agent of a work team. You are a supervisor, not a worker.',
        'Never do the task yourself, no matter how trivial it looks. You only dispatch, wait, collect results, and stop the team.',
        'Even a one-line task must go through "node ai/tool/work.js push" to a sub agent. Doing it yourself (directly answering, or using any other tool) is a protocol violation.',
        '',
        ...(autoAgents.length > 0 ? [
            '[Auto-Created Staff]',
            `${autoAgents.length} staff were created automatically for this team, before you started:`,
            ...autoAgents.map(a => `- key: "${a.key}" (${a.provider}/${a.model}) workingDir: ${a.workingDir}`),
            'Permissions given to them: every approval request they raise is auto-approved (super mode), and they all run in the workingDir shown above — so they have free rein inside that folder. Globally denied rules still apply to them.',
            'They are temporary. They exist only for this team and are deleted when the team ends.',
            `IMPORTANT: each staff key above (e.g. "${autoAgents[0].key}") is one single opaque token, including the "${teamKey}-" part. When you push work to them, copy that whole string exactly as <agent> — do not drop the "${teamKey}-" prefix or shorten it (e.g. do NOT turn "${autoAgents[0].key}" into "${autoAgents[0].key.split('-').pop()}"). A wrong/shortened key silently matches no one: the task sits in "ready" forever and never becomes "working".`,
            `Example: node ai/tool/work.js push ${teamKey} ${autoAgents[0].key} <task>`,
            '',
        ] : []),
        '[Goal]',
        goal,
        '',
        '[Sub Agents]',
        ...agents.map(a => {
            const traits = (!autoKeys.has(a.key) && a.traits.length > 0) ? ` traits: ${a.traits.join(', ')}` : '';
            return `- ${a.key} (${a.provider}/${a.model}, score ${a.score})${traits}`;
        }),
        '',
        '[Team]',
        `key: ${teamKey}`,
        `startedAt: ${startedAt}`,
        `timeLimitMin: ${limitMin}${limitMin === 0 ? ' (unlimited)' : ''}`,
        `remindMin: ${remindMin}`,
        '',
        '[Commands]',
        `Dispatch : node ai/tool/work.js push ${teamKey} <agent> <task>`,
        'Collect  : node ai/tool/work.js get <id>   (the "answer" field is the agent\'s final answer = the task result)',
        `Check    : node ai/tool/work.js check ${teamKey} ${startedAt}`,
        'Watchdog : node ai/tool/work.js watchdog',
        '<agent> must be the exact key string listed in [Sub Agents] — copy it whole, character for character. Never abbreviate, guess, or reconstruct it.',
        'If <task> needs a line break, type the literal two characters "\\n" instead of pressing Enter — a real Enter submits the command line early and corrupts it.',
        '',
        '[How to work] — notice driven. Never poll.',
        '1. Dispatch. A dispatched task is delivered to that agent automatically; never open a terminal yourself. Different agents run in parallel; tasks for the same agent are delivered one at a time.',
        '2. End your turn right after dispatching. Do not run check in a loop, do not sleep, do not wait inside a command.',
        '3. The server wakes you with a "[WorkOrder Notice]" message:',
        '   - "#<id> done/failed (<agent>)" when a task you dispatched finishes. Collect its result with get.',
        `   - "No task finished in the last ${remindMin} min" when tasks are still pending and you have been quiet. Run Check and Watchdog then.`,
        '4. On each notice: collect results, decide (next dispatch, or stop), then end your turn again.',
        'Pick the agent for each task by looking at the score and traits.',
        '',
        '[Stop]',
        'Any task turning "failed" -> stop the whole team immediately. No retry.',
        ...(limitMin > 0 ? [
            `On every notice run Check. Stop the whole team once its "elapsedMin" exceeds ${limitMin}.`,
            'elapsedMin comes ONLY from that check command\'s output. Never substitute it with a task result, an answer value, or any other number you happen to see.',
        ] : []),
        'Watchdog recovers a task stuck "working" because its agent session disappeared (crash): it resets the task to "ready" so it is redispatched to the restarted agent.',
        'A done notice may say "no answer in the log" and carry the agent\'s terminal screen instead; read the result from that screen.',
        'When the goal is reached, report the final summary as your answer.',
        ...(autoAgents.length > 0 ? [
            '',
            `Whenever the team stops for any reason (goal reached, a task failed, or the time limit passed), run this as your very last step: node ai/tool/work.js team-end ${teamKey}`,
            'That deletes the auto-created staff listed above. Until you run it they keep running and are restarted automatically if they die.',
        ] : []),
    ].join('\n');
}
function _ptyWriteChunked(entry, data, chunkSize = 256, delayMs = 15) {
    const run = async () => {
        for (let i = 0; i < data.length; i += chunkSize) {
            entry.pty.write(data.slice(i, i + chunkSize));
            await new Promise(r => setTimeout(r, delayMs));
        }
    };
    const next = entry._writeChain.then(run, run);
    entry._writeChain = next.catch(() => { });
    return next;
}
const SEGMENT_SIZE = 600;
const SEGMENT_GAP_MS = 200;
function _needsBracketPaste(mode) {
    return mode === CAI.eProvider.antigravity || mode === 'gemini';
}
function _splitSegments(text, size = SEGMENT_SIZE) {
    const lines = text.split('\n');
    const segs = [];
    let cur = '';
    for (const line of lines) {
        const next = cur ? cur + '\n' + line : line;
        if (next.length > size && cur) {
            segs.push(cur);
            cur = '\n' + line;
        }
        else
            cur = next;
    }
    if (cur)
        segs.push(cur);
    return segs.length > 0 ? segs : [text];
}
async function _waitPtyQuiet(entry, minMs, quietMs, maxMs) {
    const start = Date.now();
    await new Promise(r => setTimeout(r, minMs));
    while (Date.now() - start < maxMs && Date.now() - entry.updatedAt < quietMs) {
        await new Promise(r => setTimeout(r, 100));
    }
}
async function _writeSegments(entry, text) {
    const wrap = _needsBracketPaste(entry.mode);
    const segments = _splitSegments(text);
    for (let i = 0; i < segments.length; i++) {
        const payload = wrap ? '\x1b[200~' + segments[i] + '\x1b[201~' : segments[i];
        await _ptyWriteChunked(entry, payload);
        if (i < segments.length - 1)
            await new Promise(r => setTimeout(r, SEGMENT_GAP_MS));
    }
}
const _squash = (s) => s.replace(/\s+/g, '');
const TYPE_ECHO_WAIT_MS = 800;
const TYPE_SUBMIT_CHECK_MS = 1500;
const TYPE_INPUT_TAIL_LINES = 8;
async function _typeAndConfirm(entry, text, attempts = 3, retryGapMs = 3000) {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const probe = _squash(text).slice(-24);
    const inInputLine = () => _squash(viewportText(entry.headless).split('\n').slice(-TYPE_INPUT_TAIL_LINES).join('\n')).includes(probe);
    for (let attempt = 1; attempt <= attempts; attempt++) {
        if (entry._disposed)
            return false;
        entry._cmdSent = true;
        entry.updatedAt = Date.now();
        await _writeSegments(entry, text);
        await sleep(TYPE_ECHO_WAIT_MS);
        if (entry._disposed)
            return false;
        if (!_squash(viewportText(entry.headless)).includes(probe)) {
            schedLog(`[Type] swallowed by TUI (attempt ${attempt}) ← ${entry.key ?? entry.token}`);
            try {
                entry.pty.write('\x15');
            }
            catch {
                return false;
            }
            if (attempt < attempts)
                await sleep(retryGapMs);
            continue;
        }
        for (let enter = 0; enter < 3; enter++) {
            entry._cmdSent = true;
            entry.updatedAt = Date.now();
            try {
                entry.pty.write('\r');
            }
            catch {
                return false;
            }
            await sleep(TYPE_SUBMIT_CHECK_MS);
            if (entry._disposed || Date.now() - entry.updatedAt < 500 || !inInputLine())
                break;
        }
        return true;
    }
    return false;
}
async function _injectToPty(entry, text, clear = false) {
    entry._cmdSent = true;
    entry.updatedAt = Date.now();
    entry.pty.write('\x1b[I');
    await new Promise(r => setTimeout(r, 500));
    if (clear) {
        if (!await _typeAndConfirm(entry, '/clear'))
            return false;
        entry.updatedAt = Date.now();
        await _waitPtyQuiet(entry, 1000, 800, 8000);
    }
    _recordInput(entry, text);
    return _typeAndConfirm(entry, text);
}
async function _dispatchWorkOrders() {
    const agentByKey = new Map((await CSubAgent.List()).map(a => [a.key, a]));
    for (const a of _teamTempAgentAll())
        if (!agentByKey.has(a.key))
            agentByKey.set(a.key, a);
    const keys = [];
    for (const s of gSessions.values())
        if (s.key)
            keys.push(s.key);
    if (keys.length === 0)
        return;
    await Promise.all(keys.map(async (key) => {
        const order = await CWorkOrder.ReadyList(key);
        if (!order)
            return;
        const target = _findByKey(order.assignee);
        if (!target)
            return;
        if (computeStatus(target) !== 'idle')
            return;
        target._cmdSent = true;
        target.updatedAt = Date.now();
        const isRetry = order.requester.startsWith(RETRY_REQUESTER_PREFIX);
        if (!isRetry)
            gAgentRetryCount.set(order.assignee, 0);
        if (isRetry)
            await CWorkOrder.SetStatus(order.id, 'done');
        else {
            gWoSubmitted.delete(order.id);
            await CWorkOrder.Dispatch(order.id, await CProviderLog.MaxId());
        }
        let combined;
        if (isRetry) {
            combined = order.content;
        }
        else {
            const agent = agentByKey.get(key);
            const lines = [CWorkOrder.Marker(order.id)];
            if (agent) {
                lines.push(WORK_ORDER_BASE_COMMAND, '');
                lines.push('[Traits]', ...(agent.traits.length > 0 ? agent.traits : ['(none)']), '');
            }
            lines.push('[Task]', order.content, '', '[On Completion]', 'Put the result in your final answer. The requester reads your final answer as the result of this task.', 'You do not need to report success: this task is marked done automatically when you finish your final answer.', `Only if you could not complete the task, run this before your final answer: node ai/tool/work.js status ${order.id} failed`, 'Then explain why in your final answer.');
            combined = lines.join('\n');
        }
        if (!await _injectToPty(target, combined, !isRetry)) {
            if (!isRetry)
                await CWorkOrder.SetStatus(order.id, 'ready');
            schedLog(`[WorkOrder] id=${order.id} assignee=${order.assignee} → NOT SUBMITTED, back to ready`);
            return;
        }
        if (!isRetry)
            gWoSubmitted.add(order.id);
        schedLog(`[WorkOrder] id=${order.id} assignee=${order.assignee} → SENT`);
    }));
}
const WO_REMIND_DEFAULT_MIN = 3;
const gWoRemindMs = new Map();
const gWoNotified = new Set();
const gWoLastNotice = new Map();
let gWoNoticeBusy = false;
async function _tickWorkOrderNotices() {
    if (gWoNoticeBusy)
        return;
    gWoNoticeBusy = true;
    try {
        for (const k of [...gWoRemindMs.keys()])
            if (!_findByKey(k))
                gWoRemindMs.delete(k);
        const all = await CWorkOrder.List();
        await _completeWorkOrdersByIdle(all.filter(o => o.status === 'working'));
        const byRequester = new Map();
        for (const o of all) {
            const list = byRequester.get(o.requester);
            if (list)
                list.push(o);
            else
                byRequester.set(o.requester, [o]);
        }
        for (const [requester, orders] of byRequester) {
            const finished = orders.filter(o => (o.status === 'done' || o.status === 'failed') && !gWoNotified.has(o.id)).sort((a, b) => a.id - b.id);
            const target = _findByKey(requester);
            if (!target) {
                for (const o of finished) {
                    gWoNotified.add(o.id);
                    gWoScreenAnswer.delete(o.id);
                }
                continue;
            }
            if (computeStatus(target) !== 'idle')
                continue;
            let lines;
            if (finished.length > 0) {
                lines = finished.flatMap(o => {
                    const screen = gWoScreenAnswer.get(o.id);
                    if (screen === undefined)
                        return [`#${o.id} ${o.status} (${o.assignee}) -> node ai/tool/work.js get ${o.id}`];
                    return [`#${o.id} ${o.status} (${o.assignee}) -> no answer in the log; its terminal screen when it went idle:`, screen];
                });
            }
            else {
                const pending = orders.filter(o => o.status === 'ready' || o.status === 'working').sort((a, b) => a.id - b.id);
                if (pending.length === 0)
                    continue;
                const remindMs = gWoRemindMs.get(requester) ?? WO_REMIND_DEFAULT_MIN * 60_000;
                if (Date.now() - Math.max(target.updatedAt, gWoLastNotice.get(requester) ?? 0) < remindMs)
                    continue;
                lines = [
                    `No task finished in the last ${Math.round(remindMs / 60_000)} min. Outstanding: ${pending.map(o => `#${o.id} ${o.status} (${o.assignee})`).join(', ')}`,
                    'Run check and watchdog now, then continue.',
                ];
            }
            gWoLastNotice.set(requester, Date.now());
            if (!await _injectToPty(target, ['[WorkOrder Notice]', ...lines].join('\n'))) {
                schedLog(`[WorkOrder] notice → ${requester}: NOT SUBMITTED, retry next tick`);
                continue;
            }
            for (const o of finished) {
                gWoNotified.add(o.id);
                gWoScreenAnswer.delete(o.id);
            }
            schedLog(`[WorkOrder] notice → ${requester}: ${lines[0]}`);
        }
    }
    finally {
        gWoNoticeBusy = false;
    }
}
const WO_IDLE_DONE_MS = 30_000;
const WO_IDLE_DONE_LOGGED_MS = 300_000;
const WO_SCREEN_ANSWER_MAX = 1500;
const gWoScreenAnswer = new Map();
const gWoSubmitted = new Set();
async function _completeWorkOrdersByIdle(working) {
    for (const o of working) {
        if (!gWoSubmitted.has(o.id))
            continue;
        const s = _findByKey(o.assignee);
        if (!s || computeStatus(s) !== 'idle' || Date.now() - s.updatedAt < WO_IDLE_DONE_MS)
            continue;
        if (Date.now() - s.updatedAt < WO_IDLE_DONE_LOGGED_MS
            && await CProviderLog.FindTaskRow(o.assignee, o.logId, CWorkOrder.Marker(o.id)))
            continue;
        const screen = viewportText(s.headless).slice(-WO_SCREEN_ANSWER_MAX);
        if (!await CWorkOrder.CompleteIfWorking(o.id))
            continue;
        o.status = 'done';
        gWoScreenAnswer.set(o.id, screen);
        schedLog(`[WorkOrder] id=${o.id} assignee=${o.assignee} → DONE (idle fallback, no final answer in log)`);
    }
}
function _findByKeyOrToken(_id) {
    return _findByKey(_id) ?? gSessions.get(_id) ?? null;
}
const MESSENGER_TICK_EVERY = 6;
let gMsgTickCount = 0;
let gMsgBusy = false;
async function _tickMessenger() {
    if (++gMsgTickCount < MESSENGER_TICK_EVERY)
        return;
    gMsgTickCount = 0;
    if (gMsgBusy)
        return;
    gMsgBusy = true;
    try {
        const targets = [];
        for (const e of gSessions.values()) {
            if (!e.msgSession || e._disposed)
                continue;
            const status = computeStatus(e);
            if (status === 'permission') {
                if (e._msgAwaitingApproval)
                    targets.push(e);
                continue;
            }
            if (status !== 'idle')
                continue;
            targets.push(e);
        }
        if (targets.length === 0)
            return;
        await Promise.all(targets.map(async (entry) => {
            let msgs;
            try {
                const uploadDir = path.join(entry.workingDir || currentCwd, '.uploads');
                msgs = await CMessenger.Recv(entry.msgSession, uploadDir);
            }
            catch (err) {
                schedLog(`[Messenger] recv failed (session=${entry.msgSession}) → unlink: ${err?.message ?? err}`);
                entry.msgSession = undefined;
                return;
            }
            if (msgs.length === 0)
                return;
            if (entry._msgAwaitingApproval) {
                const combined = msgs.map(m => m.text).join(' ').trim();
                const isAllow = /^(y|yes|1|승인|허용|allow|ok)/i.test(combined);
                const isDeny = /^(n|no|2|거부|취소|deny|cancel)/i.test(combined);
                if (!isAllow && !isDeny) {
                    CMessenger.Send(entry.msgSession, entry.key ?? 'terminal', '이해하지 못했습니다. 승인: y 또는 1 / 거부: n 또는 2').catch(() => { });
                    return;
                }
                entry._msgAwaitingApproval = false;
                _sendApprovalKey(entry, isAllow ? '\r' : _denyKey(entry), 'messenger');
                schedLog(`[Messenger] approval ${isAllow ? 'allow' : 'deny'} ← ${entry.key ?? entry.token}`);
                return;
            }
            const combined = msgs.map(m => m.text).join('\n');
            (entry._msgEcho ??= []).push(combined.trim());
            if (entry._msgEcho.length > 20)
                entry._msgEcho.shift();
            await _injectToPty(entry, combined);
            schedLog(`[Messenger] ${msgs.length} msg → ${entry.key ?? entry.token}`);
        }));
    }
    finally {
        gMsgBusy = false;
    }
}
function _scheduleInitPrompt(entry) {
    const startedAt = Date.now();
    const IDLE_MS = 3000;
    const GIVEUP_MS = 180_000;
    const RETRY_GAP_MS = 4000;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const alive = () => gSessions.has(entry.token) && !!entry._pendingInitPrompt;
    void (async () => {
        await sleep(1500);
        if (!alive())
            return;
        const prompt = entry._pendingInitPrompt;
        _recordInput(entry, prompt);
        let attempt = 0;
        while (Date.now() - startedAt < GIVEUP_MS) {
            if (!alive())
                return;
            if (!(entry.clients.size > 0 && Date.now() - entry.updatedAt >= IDLE_MS)) {
                await sleep(500);
                continue;
            }
            attempt++;
            if (!await _typeAndConfirm(entry, prompt, 1)) {
                if (!alive())
                    return;
                await sleep(RETRY_GAP_MS);
                continue;
            }
            entry._pendingInitPrompt = undefined;
            schedLog(`[InitPrompt] submitted (attempt ${attempt}) → ${entry.key ?? entry.token}`);
            return;
        }
        entry._pendingInitPrompt = undefined;
        schedLog(`[InitPrompt] gave up after ${attempt} attempts ← ${entry.key ?? entry.token}`);
    })();
}
const _pageTemplatePath = path.resolve(CPath.ArtgineRootPath(), 'artgine', 'server', 'html', 'Terminal.html');
const _require = createRequire(import.meta.url);
function _readAsset(pkgSubpath) { try {
    return fs.readFileSync(_require.resolve(pkgSubpath), 'utf8');
}
catch {
    return '';
} }
const _XTERM_CSS = _readAsset('@xterm/xterm/css/xterm.css');
const _XTERM_JS = _readAsset('@xterm/xterm/lib/xterm.js');
const _FIT_JS = _readAsset('@xterm/addon-fit/lib/addon-fit.js');
const _UNICODE11_JS = _readAsset('@xterm/addon-unicode11/lib/addon-unicode11.js');
const _WEBGL_JS = _readAsset('@xterm/addon-webgl/lib/addon-webgl.js');
const _WEBLINKS_JS = _readAsset('@xterm/addon-web-links/lib/addon-web-links.js');
function _loadSkills() {
    const skillDir = path.join(CAI.AIDir(), 'skill');
    if (!fs.existsSync(skillDir))
        return [];
    return fs.readdirSync(skillDir).filter(f => f.endsWith('.md'))
        .map(f => ({ name: path.basename(f, '.md'), content: fs.readFileSync(path.join(skillDir, f), 'utf8') }));
}
function buildPage(mode, mPath, authToken) {
    const modeStr = mode === 'cmd' ? 'cmd' : mode;
    const skills = _loadSkills();
    const tmpl = fs.readFileSync(_pageTemplatePath, 'utf8');
    const rel = path.relative(CPath.WorkingPath(), CPath.ArtgineRootPath()).replace(/\\/g, '/');
    const artgineBase = (mPath + (rel ? '/' + rel : '') + '/artgine/').replace(/\/{2,}/g, '/');
    const inject = `<style>${_XTERM_CSS}</style>\n` +
        `<script>${_XTERM_JS}</script>\n` +
        `<script>${_FIT_JS}</script>\n` +
        `<script>${_UNICODE11_JS}</script>\n` +
        `<script>${_WEBGL_JS}</script>\n` +
        `<script>${_WEBLINKS_JS}</script>\n` +
        `<script>window.__TERM_MODE=${JSON.stringify(modeStr)};` +
        `window.__SKILLS__=${JSON.stringify(skills)};` +
        `window.__ARTGINE_BASE__=${JSON.stringify(artgineBase)};` +
        `window.__AUTH_TOKEN__=${JSON.stringify(authToken || '')};` +
        `window.__CTX_PATH__=${JSON.stringify(mPath)};</script>\n`;
    return tmpl.includes('<!--INJECT-->') ? tmpl.replace('<!--INJECT-->', inject) : inject + tmpl;
}
export default function CTerminalPty_imple() {
    CWorkOrder.DeleteAll().catch(() => { });
    CTerminalRouter.prototype["onStartTerm"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","SNBmSxBPSYS5RlSER6RBBqS4RnBzRPBhi3BdSFS1RAByBnB7SnuRiBS9iIRlBlSlBRSDigRaR7iyiWB0B6BjRwBMR0BPSvRMBoSoiLRRRLiWS7iPi3ifR4SFBeBIi3SkSwSRRCSwiHRsB9i5RjRkBWSPSySBSkRCRSBjSLB5RBijBvSMiciIB0uiBRiziJi9uuRJipBdR1SmRpS6iMR1RrR1BVBrSiRZiQRXRMBeB4B5BDRhSXi5RrS6BvRXSuiYSxRkioRoiXSuRORKBMBzBWimitSKRUS6RrSQRGSHSWSMROBsiUSxSauSS0iRi6iRiTBbS2ijSiipBiRiiMiyRdiwiXSIBaiFRtSoSpBJBhiwSqiDiiRXSqiNitiYimBrRaRTS9RMSORnB5i1SfBVShRvSlRGRsiESpSvSBi4BnBqBsilBvRrieBOB2RDidSfS3RqBai0BqBPuSi2ixSWSIi5RQRaimSBSdioSvRridBwitRRSiuRB3BSiRiSRBBdSFSWRkSsSaSXSBRvBCBti3RFRzuiB8R7BbBDBeRAB5RNRNRPiFRhiEBnS7RcB6RSSKBHRHSYSGSQuSRfiuBlR5uRiNSYSSRkRLiaSVSOiXSESMB6RoBrBvBDBqBqBAiLRsS5BTBtRMSkR1SNRhStBZRJSJBQBCSoBYiiipi1RGi1RZRcSWBxi7unB5RcRTBMBPBTSdRsSeinR0isi0iDBkisSxiUSPS0RXBgRiinSKBHSGi4RsS8R0ivR4BqBPRLB7SpibBiBRRzifRBiLB8BYiwBHRbS5BqBJRIBiSfiRiZRqiVRgR3BwRpuRBfBMiKR9SMRdB2R9SmS3RgBNBYiMS8iGizSlirRfRrBIu2RRiLiQiEBvB6iHSCRBSOiSBcBXSHiiBLiRiYiYSpBsiNRTBmirBaiASRunitRcBZSTBCSIuSS8SnSpSfSTSuSiR4SniJiGSVSARsuRSLS0itSaRYBlRCi0i7B0ikS0iIRhRiBkSaRtBvizBlSUSSS4icSliYSMSYS6SzRqSjSKRKiSSPRdirBGShRpRRunRgRsS6SLSaBCBoSxBXRDi5SOiUiyi3RBBTBlRhBkRXuJBJRkSSB1SouuiaBCRliQRtSCS8BpSBBlBPSeBti3RRRFirRJS3SGSiSrioB7RlBci3u2iOiKimikRNiWBoRQuuB7iGRHiui6RvSzBkirSOiES1imR5S8ipBWBOBhiySMinB8ifRsi1i0iBBSBMiXikiBuiB5SZifi1SuSfRaidBVRwBvSsSCRgBKBrRmSjSASLS9ScRgSoRvBBi1iQSbuuBFRaSiBJBfRiunRbiXRzROS5SwSGBrigBQSCSvSERNBGRsBgBIiEBPiIuRSpRNicSpRLBZShS7BvSCBiRSSEiaB1ifSZR4RPSHR4RNibRwRfSHBZBbiKSLiPSkBUSsB5iqSCBmimBUiuSgSnSaiFixSMRwilRHSzioROBYBXR1S5BfRvRXSSiHBPiNRsi3BRSCS8SVBlSpBmBFROBARUieiQiQidBriGSiBxiSBsiti5RNSrBNBRBfS7RvBBi4B1SeSzReRRSzSGSoS6B5S2RvBQSLSuByi2BJRTBGBXBCBjRlSmirRJiLBCBTikB7iXRAizivSsBUSkikS8S1BWiNB6i7BCSxRjuiBhBnBKS1B1RiS2RGSOBvBVRXiHiRiAiCRwS2SQRkimS3iTSuRnBXBeSQBjReigBEiHiiSHBPSxiUiJBVSTRWS3RFiviZSOiDScRmS7SYBgBXunSQuJRfSyRXBai1RvRWBHR6ROROBDBrRVBOSmiWifSmiDBxB0i9BnSkR2R2BPBbSDRFSai2RCSSRtiVBxS0SBBwBwiCi4S1i7RSBVR2SwRbSVBhBhRTiEiTSiSKR8SxB6SbRXBJuiRQuiSySMSWSKSNSKiCRailByBCSLBhiURPiOi8uRRgREiaB7BZiAilS1BYi1B9iwBxiqBgBmixBKSESlSRSpSAi0BSB8iJiCiTBjRAirBaiaBdR6B3REiJicRhSCRhiyReR9SUiqRcSOSviRi9iriiB8RLSFBwBdBWBKBASBuBStRuByiCRYRNBoRKBMS1SpioShSkRmuBScSbiHiGunB7RoRNRjBOBUSERKixiyiTBiRpSQuBBIBURtR4iOuSR8BJB8ixSPihiUBwRASoBARMBARIBQBuRlRZBei6BaBSBfBESXR4BVibStSQSUiDiHRSBuBaB2RHi8RrRFS9imR0B7SRSHSMizRkSoRpBDi7BXiuSuRTiWB2BOSbikSFBvSOuiB4RARsuSSqBCSTRqi4i5RsRWRlRyBuBHBpu2iGibSIR9B0SaRbRpRaRNRrSLiNihiGSGiORbRySTBGiGiIBHBARnijBoRCiWBVRYuBSiiUiPinRISQBQiyRZSouuSkibRCR1BYi2BCBAiiRiSlB7SXSzSuSMiiBuRXS6uBBRi8RJS3iDSYSYSDBaS8BcBsSuRRBXS1RlSnRwBAS2iLiiSiBcBOSWByRmRLBnR1iBSviYB1SfiqBwRySkRUS4SFSMRIBCROi7BIBPReioiGRjBxRdS6RgSdSlRoiuRvBjBpiNBfR5iFSZiWSKSUBNBSRESMSVRGSqSZBdBXiui0i9isSkRrS1RRiRRDiqRuB8uBRgSPiJShBGBORiuJRkRJiFRxi8SqBviciMBCBCRCSHBgSZRRRoS8iHRURORfiqiURiBLRtS5B8S2idSzSJBcS1B9RGBsuRixS2SuuuRGSuinuSBkRXiVihR5RFuiBmSbRcSLB7iHRFificSTuBRlSXiluJSvS1BoSmRPBPS5BbBpiPiXSOS2R2BrBXi4SmB1BLRsR7SFRxBPR6ilRsB9iwRiSxiRRaSURSihBlSaRaBsRAS8RPu2BJRsSYBzBLRhiQS1RLRZRQSliuiBRDSJBWi7RMSXSkSuS2BrSqBDSBBGSXRdiABRREB6RUSSi0SeiQRiRmR6RNBgBjR0iES2i6BvRyiZBURsiLS1RqiVRDR9RkRHB9RYBaSQSiiKitixSgRLBdB5RyS8RtuBRvixRXBIBJBaBeB5SwSuBQR8SoS3BmiMRlSPieidRAihR9B9BTBCBCSnSoSFShSYivi2SdBhiES8irBriGBgRrShRPSERnidiTR9RdBUiBSUBDBERMRIBvi8iMSQBXuRRESWiLBfB6SlikBbi3RuihSnRIu2uRR2BWRyBEuSSCBASRBqiSREBERruiiPBoRxBgSbiHBbiYiaijSDifBJSzuSBpBqiORFSkS0SVB3BWBqBli1S7BeRTiziHiguuByiUR0ScBWBZBYSsRUBZR7BgiXS7R0iSigiBBci5BvBSSnBVBcuuBbB2RlS6S9BqR6iVRhR6BIihiLRbBtRQR4BoSyiGBRRfB8SqiniqRTBMRCBvR8SjRHBKReSKRHBUiJSRSaSBSBRwS4SdSTiJBpSVi6BhifSDihR6unBES0SXBsihRwRVuRiqiKR7iBi1BXiOililSFRAS2RJRIBTimiORbBsirSaRnSWiNSFSEBQROBxB7BDSdR0iaiqRviWibR8BURFSdSdR6RhB9SCSbBKRKRtiAitSkS7irS9iiByimitB4SQiVREicSzRTS7BPi7RWiIiaRFBRROSrSiRERMSeunRkBwRqR1BtRbR0ShSeisBkSdiBRBRCRZidBKRwBJSPSwBTi3SNBKSmSmRnimuuBvSYigByiRRtSiS3BfBCirRLirBmioiRBES3BNSeiVR3BpixB0BAiYBzBwRUSsunBKR3RfR1BpRlSQimRuBlBnSgiASiiEB2R3BvSWi0uuinBhR1RrRiSgSrBpBLi8RGSeBIBoRSSDBhRXBBRESOSOByiHi7SMiWiCRyBaiHRCRmiziiiSBDigBqRHR6iKBViwRISHRZSXBMBSiGiHBfiVBmSrB5RUSfSuRKi0igBnBZuuBzBNiIRGRGiWRmSxSRRLBTBlSKiHBGSqSVRVSFBHSsiTSmR2SmB7ROS8BiuJiyRSBfi5irROSXS2StirBFSpStBDiTiFiCixSNRFiJBLRoRNBRSKRhuuRiiyBZRtBBB1B4RKBuSmB8uSixi9BFijRYRdSCiTRzRxRmiBRmiVi3BWB0RzBniFifSMRRihBERSBaRyuRReBjSkBfR7R0RKRgBbiqR9RNSVBERkRiSdSuBWBBiCSJBYBfRpRrSCRGBwuJRkiIiJi4ixB5iyR3izB0RiuJBMRaiDRZBYizididSmBquJi1RCRVuJBKSzi3u2RcBgBgRbS4SpSwRMiQRRRjSrRiiVu2BkBrBbSOiQS0SfS7BcBxRfRERDR1BgBnBxRfBHB2BSinBfifiKRJBwBwSnSjiSBQSWSaRJRWiniBRtRpRDBZBtSbBWS1ieSeuJR0BgRlSjSKRuSERAB6iESriSBIRkBkRruBuSiFilBEBri3BdRFSlSlRfiWBDB1BBSyihRhBCRwBuRnRSRfSiREBHSYSERBihR4BgiqSIS1SOBsBnSlRMSSS2RTRJSeS2isRqisRqirRTRHSciaBIi4RLR2RnBmBGR4BORtBKiTRORFiQuiu2BCBKS8idilBuSZBYRkSZB5BGSZBxidunRqR5Rdi4BnRUiWiOihifSZSLRXBwS9B5BSBvSOiJiiRTBISRivSARXRNiMB8iwBMS7SiBASQSqihSxRIBhBziZSCRrReSzRVBRBkSlSKRAiXS4uRRhBiSeiBSvRlihi1BrifBWS5iRBFBRieBJRnBxiOiHilRlicS3RGirRUBpigiKS7RMiXijSAi5iHiuSeilSwiGBDSkBJSLivSQi2RiRSR7iFRBSERvi1S2RFivBcRbiTR1BkSWikSWS9iKB3RpSgShSJB7iMSPuuBbRPB5RpiuSDSpBTRlSji5R7ipBpBsSZihBGR7SQBPSvBuiHSIScBESGi1SwRCB1RsSciWioS0Snidi2uiRSiZRjBBBZSDSxi1BwBsi6BLisSXiSB9RmRxRWSPitSwRqSruuBXS9iASySnioRfS1SFSZBlSCicBaRDRmB0BlBBScBmiDRVS9BOBlBIuRiAihuuRfiBRyRWiSB7B1RsuJRQSOiYRmRFB3SViUSdRTRqB2unSzili2RrSpSiBoBRi6uJRRRfBIRnSXuSiBBIBEBKi7iBRtunuBBERTBjBLRBS9S1RQBVixi0R8BFuJi5BWBTimSUiiB7R7iPR9BvR9BliZBeByiTR3SSSySSSnRsinS4SLBkioSURVSsiaRmRxirBGRhSji1iNixBhSXSBiuiGSriRRMivBKBDBaimRgR2SHR6iySkRrSxBgRNRMBOBuSeiMSjBwRZSTSeRxRcRjBQiXiJiPR6SfuSS3BkRPRdRfRIiHBbihRTiPBgRxSGSgS5BnSuSsSzSpivisBUScitRXSPBwSBikBgRNRSR1u2SMifBuBeuuBHBMBViRSyRUi4SkSXRWSZRJRMBrBRR3B4RhunRpBQRniBSxRjR2SmRxBOSgifRUiyRiBsR0SIiki7iGBFRJRDSxB9RCiKSbSzRAROBDBMi6RPRiBEuRB1BfS1BOB2i7RhRsS8SFSzirijB2uBSISdBfSBRNRSB1RWunS8RfR5BmRsi4BsRwSBBtRNibSXBYR2BMBlBWSVB7BPS5BTidieiASgiPBgSxu2RkSISxB1SpS1iUB9iRuiRYBHiMRTRfSnB5iZRhi4S4uSSsRuiXBmS4SJB3BlBmSNSQRpRJirB3inRdiXSvRNBriJS7ihSdBMS2SsiyS4SEiNRTu2RiRVuniGBGReiziaSLSqRaR1ivBDBXiJS6S1BxS4R6BnRgRFS4SYiuSiBviMisSyRJBVSlR2iJS4BPBCRxiFS8RLi8RpReS1BKRYSdSPR6SNiTBCBgBau2iQRgBOBkBDS1B8RQiJBAi1BrigSdSbR2RvBjikBJSwRJBDidSEiQRhRgRxBYiLB7SABOuRRvRaRTB2RAiRSYBXBqRcR3RJRFS0BSBPRSSuB1SYB9RSRmSDRAB4SBi5SzRtSxBji5iqRdR4itSQBHiESQikiBiSSORfSzRaizRUiei1iqiQRSBpu2BQihBDRGiHR7R9iqRMB6BYSISVR9BWRbibRISlS7SzBUR9uSRhidB7RsiqSKisSdiSiORDilR2RiSYR7BZRbSdSUBPBKB3imBmiMBqRgigijiDunBaRfRCBPB5iYSFS9B8S1iuRFBuBWS3S8BoRTicRbS2S3ibBBuJiXSjBdiPRtuJiui6BPSFRmiSBaSOi5B8SES9iguSBtRMiPRKSPixRjSSSXBCRLBNi1SsSiR0BZSHBRuBi4ijiYRJSZBdB0BESBBnRmS8iaSuBQiwRfRgBrB3SUBYRwRnB6iiBwBFRTBSiSidB8BaR2SiRMBRiTBnBLBKilRCiyiwSuBaRQRESeBvRrRwSyRoReieBEBkSCBISFBlRgRuiPBuRFRGRBROSbBORGS9ikuSBrSmR9R3SUS3B9SQBKRnSMSARjRsS1ikB4iASvBTRUBiRkS2SySTBFiVBXRGSBuiB8BpiOB7RuiLidSRS8iURxiLScikixiZSZBGBUi1BOBQRaRxRriqRPRwSRiTS6BfSriCSLBFipBPifB5R8iqR6R1RzS5iTBqiGuRRlBgBbSuiqiKBlSKBvR1iwBrRKSvB8iPiZB8B1SYB1BVR3RIReiyihuRSoBViKijSFSXiUiZS7SEBnixSSiMRSRHiHB2iQR1iiiMiminiDSbSRikiDBGS0BoioRoS3RUR0RIRnR2uRS7iqSLiJRviDRRSoBsBAiIBkRMBYByB6BjRtRPS1RlRRBfRvSHShSsuJi4BSSVS1B7B6BdiwiuScuRBTRwSIBRRtR6SPRgiVRJBZiEBXR8SlRNSfRFiJiFBwStiqSziQiRScBWSaRAB9BrRbBhiDSciRRCSvSlSIRZBoiORaStSEBLRZBBRRBri9BjSURpRuR7RfBxigSQB9SxiUS8iYiTunS4iTi4iIiQSEBCipRqBLBgRSSaScRLiXieSHSKSSRLS9BKRCBoRKiCSVBTBNSJScSlRHBwiASEihSOB0SHRtS2B7BfRTByReBiSORkBWiZB4R4BKRkBCR4SaSVRzSo",0));
    CTerminalRouter.prototype["onStartTeam"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",3576));
    CTerminalRouter.prototype["onTeamEnd"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",8818));
    CTerminalRouter.prototype["onSchedules"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",11031));
    CTerminalRouter.prototype["onScheduleSet"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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S3BORdSdiOiyiVRgByi8RXirBeRPReRdigRsi8BYSsBaRvBlSoSFB4BsiBRfiKSkRRiFBhRnBmBySvRrBUifitSvuSSASkSuB4SGRGieiLB8S4RqSviQSBB4SRBjRvSDSzBIRaSMBViyB8B0BMBfSXSjRfRyiZiNuJieB7BhRWBxBLiHBFi0BfR4B6SBBZBJREijiFSrBBBLR8uiBuB9RjBKBDihR2SBBlBViTihiMRliRRcSMR1SLRrBrSABluBiLSQBhBvB4BFBXROi5BvRmSnR6RZSFSySIB2R7RoSjRoiWSXBLiVicSzRwRlS9RlBBBmBnSESnRuSKRJRgR1iLijBZBzimRmSziRiFiZiKSsijBERaRMByuiB8BuiJR0iwBHB4BdSKBWSMipBuBbi7R6i4iXRmikRKiORMSrBrBMShSKisSzimiKinSmRnikBRSfuui3R5B4R2iUijBbigieBUR1RtREBkizRSiWR6BhSwuRRziMRvR5imR3BJRvSJuJBfRWieRTRVifiNRFuRSyBniUBKBmSmRZR3BxilRyiDRNSHBlRjiwi6R0SHuRBXuSBiBlBQBQifRluuSpS1RZSTinROiLiPuRS0RVBJiNijiMBfBFRWBMRCRnSgBbSriOiBR5RYBBi7iqiGR9RIR1idB0ReBJuBRMBuBJuSSDB6SpRQS5B7ShiESwBNSiBCB8R4RaB0iMSgBvixi7SzisSNSQSFiiiwicREBiBkS3BtiGRsSlSPBLSEBGSmieuJB8SluSiriABnRYBjBrSvRWRXS6iMRrR9SjSoiIBguSBRuiidStSfibRxRtRTB6irSqR7iwSFRjBrigRcRcBNBwRQieRPi7B6BXS4iwBDSTRTRoBiiMBviiSBunS8u2i0RoRnRfiZicBvSsiNibBISmSlRaRQBHSNBlifRMR7BqiliHSMBuRfBdSbSYSciIuJROunBdiEB3B7BViESJiAScR4SwSyBEReSJSNB1S0BOinBBivBJiyBziYitiZSrREitixuJiDuSieSeSzB6BRBniURqBySARkBABBBuBmSfijBCRqR0SJSDRpBDiqBCSUiKiaBOB6BUSjiOiKijByBoRWiPikiAiGSOiiBBBKB0ui",12814));
    CTerminalRouter.prototype["onScheduleDel"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",16381));
    CTerminalRouter.prototype["onAgents"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",18517));
    CTerminalRouter.prototype["onAgentSet"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",20299));
    CTerminalRouter.prototype["onAgentDel"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",23849));
    CTerminalRouter.prototype["onSessions"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",25855));
    CTerminalRouter.prototype["onSuperMode"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",28598));
    CTerminalRouter.prototype["onKillSession"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",30613));
    CTerminalRouter.prototype["onLogSessions"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",32771));
    CTerminalRouter.prototype["onLogSession"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",34785));
    CTerminalRouter.prototype["onLogSessionDel"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",36751));
    CTerminalRouter.prototype["onLogClear"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",38786));
    CTerminalRouter.prototype["onLogTerm"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","SIRWRvRPitSDBMirRsibidiKBKROSTB9BlSoRGBGi9SKRmSPReiSBuRPROi1BARJBhifRbRFSFRvBxShBnSwROBaRvB4BtStiLi6BdBvRhifi7iki0iARaRtB6BtBdRmBSB8iNiviDiRiLBdSouRShB1BOB3BfRrBEBkS4ihSniNR7RPR5SCBqSmR5RaBdi4ipRpiKBmS8BhiYRxiViISpi6BuBBBrSRBrRQRsinR2BrScBpSRifR4RiiNBsiZBUSeiRRORkBwBGBuB5RtS6SvRmiEiVSSiYizBbifRmBTiMSUi6BruJijBEBVSTBARgSRSmRMigS4BkuBiyBqR4Bji4RuisisiPuBRbS8BPRVidBuirifBDRIRlSVi8RtSGiZRKBJBiiZRYSqiSRxi3RUuSBWBFibuiBYiaRxSQSzB9B7iSRMBoSXBzBriBR8iXBTBKi0R5i4SWRrR8SnSWRBi9uJR3SbSTRlBpBRifRIBciPiZilixBMBTSsRVBoB0SHSjRKRbi5B4R8BUBxiqS1i1ihilihSCByioB7BLS2B8SRRWBsRBSjSCRuiyi8SMBiiWRVBaSqB4SqREioROieSduiBHBvRMRWScB2iYR6R2iYRYSPiABauuRlSxilSzBISBiYBSS7BtuRiOS0SQRXi0SFimiLSqRtR1ihSYB8SmS2B5iABuBOiMBeSmR1ixiRBsByRHBSRtB6iaS7RaR5SnSiB2SNBMuii5S0ihiWScBwSYSNiCRIiNiBSEBuBBiiitSERdBSBQBNBgRKidSHSvi3B7RiS4i8BDinRWigR1RHigiGB4iDihRtBQuJRLSHB7BlR0ROROBlRLuiiCiYiQiDieRESORRRxigBGRaB3SjiHiji8StSrRFBBBhRPByRaunB6SbRzBiSWS9BaiURkikSTRAB1i6idSQuRSSB3SPRsSbRyS6iXSgBfRDiCRtSXBABOScRlSoBoSSSPihSrSfSWBriiSHBVuuRqiWBTiWBPRERQB1B2iVB7BViJBMioRPSnSvR7BdBPR2SfRbiwBrBni0RWixi3iMBEiqiOR9SkRnBGi9R3iDRCSNSMRWBsBxiPRkRBRjRUBESwiVSLiNSIRaS4RuimRESlBUiORfi9ipSvBDifRpBsBWRrRGSwRJB9B5R6RERHStBbBRicRuSbSrBLSYSGivBURfiaSduuBnimS5SHBMRWR0iLBNSyBJRpikBnB2B5iDRwRKSbR7iuSuinuRBKR8uuirB0icRDBERzR9SJBaRxiABVRKR3SWRUReiPRGuiBIiWBjRKSDi0SpivSBi3SuBMSASxRrieSVR9S2BoBLB0iyBFuRRciZiqSuBeSVRERYBVSpBrRSBOBBB4BFSYuuB8RqiHS8BNSXi6SPiWi0R4SwRMRGRZRCRtBFiORPigRiiHSAiEiuSYBIBwuuunRoRFi3RTiRRjRaRERWRIBURuStRuRRiES4iOSIR9iLBdR7SiBii6RfitRYiKiOR0iIiBiAB4BfiTStB8SqSJirSkibRAilSoSqBGijBwRXRSR7RHi6BPB2igRmSoiNRHRQSMB4RhRWitS3uJBCB1iJunB7BRBzBpSQiQBESVBVSuRDSKSYiBSyRqiRSridBcR1SIR0R6RFSYitSWBdRCBmSxSVSkRtiPRnRPSpR1S7BKBZSDBASmBDSUiqRYiRSuBNRDiLBlixRRSmR9BDBZBkBrREBsSIB2SKBRBBSIR9SaSCR6iti7BGioiuRGB2R9ieSXiASzi7RqRhiZRwS1BciaiQRuRTBPiKRNR6BsiyBTuuigSEReRKSGiUREBfRkiWBVSeBpRxRBRXSLiqiHiABbRSBUisuBi2i7SVSjifS4BVBYSdipifBzRuByBEBfieijBquJiSSYioRjBvB4RQSTBCiNSRiwRVBfizBOihigRnioiFBOSqSdByiPiRR7SUiJiXB7SkSfSNR8iPBkSfB0i8RASBu2BkSBRJRBBMBXBWSUiBRMBFSdBCi5STiwR4SxRIiHBHS4ShS6i5iiBcuiRGitRvBqimBXRXBxRRBPicR1i9BxR4SnRsRUSQSrRoB3ROSoSPiCBGiZRUBcisBoigSRicBRBni1BHB9SHR5SGRLBHRfBiRfBvuBRCioBaiiRXSYSWBTBMRVR9RvuiRwRriNS2BmitiPSbi0iZilioSPBjBmiPiLBASqiQBzijRRiUSZR5iiitBCBQR2iNRLSuiHRCSuRxRFBUBPBXS6SNBrRORXRkBhigStRnBHi8ieSPBPSaBkRkSBBPSxBARhuRBYR3iwBxiEihS1ihSSSBBQioiqRZRZRtBpSKigBFRdi3SeBIB0RJRxiTBbSeRBS9S5B5RDi1SWunifShiHSfBNSTSQSXBmRSiWRGiISYigBmByB7BSByiJSESoS1itS0BzS9RAuuBgihBpSTuiB5RpBfiXSORrBiSmuiBJSeBlSjRjiZRbR4BgBLRVBbBnRYRaB3SrSLikifBsRuRzi3RiRCiRBwSbiTBsROBhRXB1RGRCRwSsiABPSxBwixipBVBVBLuJSFR6RlRZiiRjiUSYiSiUSJRtRqRaiYuSSLB4R7SLSYiCBlBBSPSfRqRISUidiIRgBhR1RhBwBbShR9icRURuizi4RaunBOiQS2B4BRSNBziviPuuBcRwiYBEBeRARYioRSiUR1i7BpiWBoi3R1inBOSgShRzBQBpBaBsiBSFRRR1RXSyBfiSiSSrScBXBrS7BASNSZSuRHRVSoBjSwSnBMixBLRES4RhiIS1RsRPBzRNiNS9iBR4BniNSLuSScRNS6BzRrB3i4BXRTBPSDSAiKS4BwSoiXSwiLBfBSiNBQi5i3ilRmRtiWiSRcSAitRSifiJBYSQREipSjBQBsRViNRtBUR1BuSRB2BPBuR7RlBTSdRvSjSfSIu2BvSkSqStivRGBJi3S8ipiZR5i2uuRMBCBFS5RbSxSjRKu2uJSDSNBfBkBoSEBni3BaBoiMSdikSDRqiZiUBGBwiTiOS8i0SpRtRBRuRJRKBBSzRTR2RzSFB4BuSlBySmRmSjiOBciNBcSkSoRzR1uiRiByB9RNinBrisS2RhiKSPiqBHSWiJiWB7S6iqijuuR0uSS9RwB7RRBCiIBGByBDBuBRS7iRBuSjSIiIi9iXSLBIiBiMRXRkRCSLSdB3ShBpRVS4i2SPBmBpSsRSicB7S4BPi9RRiFSUBfSYB1R4SQRjBuS4RKRVijBRRIiUi3ShBjBHBeSdBuRnS3RZBEBsBlRFR5i4R3iiiaipRHikRAuRBzB5RoRUSmi1R5SQS1B4RCizByB4R9ScR7i8iMR4RniiuuB5RGRyB7SoSjunRzSaBiBhiJunBdS3S9RRiCRfSbBrBGRRBnS6RFu2uSRYiZB6ROBHSqiricunRtRji4RSB0RhSLSwRiiQSjRKipRNidi1SARfRyivuBSaBgRQBvSGR5SjifB5BTSfS6SziUiVB6SiBfS4BEBOBhRjiSimBbBhSruBBwRniHBsShBPiBSKihB0i3RhR6iPiiR2ixi4BFSrRMunR5SVRqBISjSeRtSLRaSfSrBnSoR3SHiTRESERYi3BHSySriwSISKidu2BkSOSXiISPiaiVBmSFi5RDR6S6irRESzSpiHipiFROiAi4BySMSARRi2RqSTB9SVRwBBi2R7RDSuBwRmSxB9RRBZBPShB2B0ijSARFuRSRByBiBLBBiIBhuSSmBIRFR5S9RnBrBaili6RERXBaRticRqiviMSxBSiDiNS0BWR2RySUBxBEiuRLiFBKSABUiGBKSfiDiQRlStiHBLRQimBBSnRWSlieirRSRwSbBfByiRSsB3RLitSjB4BUB9BjBQRpBqB8ifihRvShiARXidRSBPSVBtBwBui7i1SliFiZB4RIi2S8RIBDBQuRROBBiLRzBmByBiSziiiWBBRHi2BfR7S2SviziRS1R7iciAijR9S2SOB1SJSSSWi5ihBRigi9ikSGiiBIRyBLRsRCBXRsRDiYBHR0ioBKBLBfizBIivB2R2S7ikiBReSSSqRYBsiaihiqScBdiQBzunioBaipB4RtBJBpS2S5BjBDBqSLBsifRjR4BoBNSWigShBuSdS8BXSpSHRGi5RiB4iTiiSWRES2BHRiiuBpRPBfRNR2ijSgS0SuSSitSmSEiZBvSpREi1B2SiRLS0ikiWSsSGRxuRR1SZSjB0izBxiJRJiHSVSpiDRjSYRfiviyiaiARHSZBbRriDibSMBBBbBpRziHuRR9izRCSRB0igSFiViKRCBlSLBzBri0iGiXi2uiSiihBXSkiCiqRkRCRZBriERHR2ixScS2BABJi6RyS3RriTiuSoBiiJShS3BdBTRXBaRGBiR5BuSfRDSPRyuniqR7i7SESFBkSWRoBPB0SUBZiIifBQSBi9ipRySrBeigRVSaRjSxBJiOSJSORKRABcBKBpReRIBySqSiBViURoSxi7iyR0SESaBaRmBcSFSYiCSVS4RjScRKBhRrRqi6ReRtR3imRDRrSqibioR1RsBxR2RTB8iMiTRxuSizB8iKBhuRR9SqSGS1BRirS5RiSmBAiMBhi8u2SyRERxByRIiYilRXSNSBS4B3RDipiwBbBkSySvSQRgRJBsi8RJS8R9RiiNixS5iKSNiISmB6BiiXu2i6SEiHuSRLBdRRiaSuSqRkSLi3SiBRSxBES4SounSvBNitiWSLSyi2iIRIBBBjBvSeRmBuBgRQBBB4ilR3RnSuRIitBiiHBhSPBbihB3i2BjRtRXRLReunR3iXiTRJBLiQRpiiuSuRB6SviASOSeSpiNSWR0S4iNiNBHRiiCB6iLRfuBiPSTi8R4ioSVSfS1B0RkuSRXuBRQRKRmReuuRpB5ioBmBVRuRFBKSsRRS6iBBRBrBtiSieSriTBtRdiNBJSGi4RqSySVRqisRnitR7ibRgRVBSRXiBRfRgBGSRRJiQS8RdBXBARMSyBKStBaBrBkSFBUSiBNi0S3BrRQSiihBZSuSXSsipBwS8BKRmR2BliVBcRURjiWuSBEuuRJSzigRRSCSTRxSRBNRHBpiDBbBZBMRsiLS1RDSVRuRkRgigSHB8RUSSBIu2ihRBSXBpicBCBOuRRhR9izBwiBisidRQBdSvSvSwiFRMSJSXiaiWi5R6BfBNR7SrBMSJiYBMSiRiSDB5BQSvBgBJRUinSUSliUSeSXBLR9BZRmB0ijRBBUibipSoS8iTRSR4iORPiAuJioSTRLiFBSRtiCRoSxBHRoBZRkRMSZBBRkunStSJiYBPSeR1SViTiySQSYuBByB3iLSdiaRmR6i6RARCRuSRR3RGBRROBQSQin",40623));
    CTerminalRouter.prototype["onUploadFile"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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iSBgBGBeSdRARhiWifSGRERdSIB9BhRIigRJRKiARhiPRKS8idiAS1i3SFS1RhBBRLRhR2SDiPRNiHSMiiSABxBeivReRpi7SWizBDSsSuByRwB0uSSrRURRiJS7Rci8iuSqRhBcuSRwiXB3B1iqRbiiRfSOSoiOuBRiiluRBWiORqibirSkixiyBuSlBLiMRESmiHS1BaBUBJiBSKimiER7iRinirSgRvRjiJS2S2STS1ReB9i4SeS5uSS0iESmBlSmBki2SSiHRhRNB7R4B3SqSIigRCRQuRSYSESOiBieRjBdBDizi3R2SnBWSNBBSkBaR1BxSbixS3BJu2RuREiZuBR4ieuJBYioSeSgSlS9BMB9ieSnS7ivShuuSGiMikSaRCRRROBeShBRBYRNR4RMipBhSkS0i7SJBHSgRfi3BfB4iluJBhBgB1RwiaBuB0RkRwBKibRGiyR3isBMinBAR7uSRjSvRhi2BAiji7BYuRBTiKR6RsiER1RjSQitSsRlRmiiiBS9R6SQSyiwSqRPuiS9B4S6BjipRJR3BBSFBsilBLRoRSRABkRKBLShSHiti4BnBISVSViLSniCRISkR9S3iaSDBTRzSjBpRBBSS6SBipRoiaSgBaiui8Bmi4RZSbS7SjBcidi0SniNi5R6R3R4S2BRSSiiBnSMiYisiMScSliKuBRiBDi2RsBdR9BoioB5RSizBiR0BRBHSGBFB3ROBKunBoBqRHBcBLSuiES3iCBiSJBORLRCRnSeiRSfR7BHBLS0BGSyStBMSrSniCiYi6BMB8i1Rni5BABKiMB3BbR5SXBWi1SjikR1SmibBzRtiKBFiUBPSbBziWRtSYiWibSUivijRliFBEirStBxiyimRTRaB7i4B9isuSB2SeRaS3RHitRgiAR6RMSMByBCRhRqSURsBISDBZReSOSFuiBlioSkSviXisiIReiVRgSISUiBihBDBNB5SMSUB0SISYuiSqRqiUBNSiirRNi1ieB0SqB1iGRsiRSViHiviDizR9i7iHRpRQBsByRqS1iySdiBSaBYBCBIRJSgSduui9BQRUicBRRuSAi3ReSbBNSFitSRiFR3SMigSSR3imiLibiwScicB2i8iuBwR1BvRvR0irRDiUSEBsRSB9R6RKREBrRwSVi8uRR6icSci5S4BMilB9R7uSBnB6iOS5uBBcR3BUSXBYRoiBilR7iZivRHRNRTS4BrScS9BGuRBviMRKR1RHRsSgBqReuuSoizB4uBiwiDBUuiSRRlBJBuiKi6BqR2RBBGRpBSRCiMRnB5RJBJSgSURLSCByiHitSoRMR2RlB4RxSmRxiiunRTR0BBSnRdS5S8BmBXBfS1i1RaiOBwijSoR8RnBriPS9SyBrSMiCijRpiJBsBhinRnSnSlSKBHBLR5RrSTS3RcSXRERZRgRuRJReBCSfSESjSGiriIS0RXRRBzBPimSzSkiWikRSuJRgBVSuRVi4SCRSiYR6BBSBSQRXi5SySLuSSmiDSciVBLRsiUuJunSlRWSUBlBHSXShRcB8iJRPBXBRS5SsiwSySQuJSwBSRxiAR0RhBBSWBaRgitR6i5uiRdSyR1iziMRGiSuiS4SQBYBJuBSnBMR6izSSBpSBB9SBiHBLRMSEi5RZi2RhBVBpi6i2iNiQimipiPBBR8RfRNBEiRiXSKSOBbigiyRsRFRvBNiDBOBISQiZiGuBiRBgi8SKRjRcBqixSWRcigSMR1SJSXRRR8ivScSoBuRLBHB1S4BtSPiZRnivByBnRHBbB7BMSwiWRRBGRtRtiNRaSUBzR5BlBniKunSXRzRJiTBNBVSvB1Sti8iyiwS0iQi6BVR7RXRfiARmiwRZBlBoBdRjRPSySFSnRTBsBKBsiTiGiCilRmiRBBRKiMR2SFBLS3SaRTS8iyRcRRReS7B9S8uuBEi2RQSLSOSdiMB5R7iWRrR9RfSXiRRrRiSpBxBZRjBVRFuiiXS0BpBBBciDSmiaBrSISnBfiSBOSMRtRtBWB6R3RLR6iQi5B1iVi0iASMiPiOBTBJB8RSBKRfBnipReR7SJRTR5BcB9RFBaBMisSBB4BEiuRDBZRDSqiliXS9BRSxBFBNScBNBxBMBWi5SrScB7BaidiARLi9RPSxiQSuiHB0iRRmRuSiS6SOSYSVR2iUiBB3RviaiCRMR3RviySmijSqBXBgSjikRjSLSRByR5SvBIiRuuB8RVB2ixuuiABuRUBwRkS2B1R9iUisBYBxijSDRpBqRniNSDBQRJS2SxuJBfBiSVB1R5SXSSifSrBuiUSdSFBRB4StijiNRpSGSJB7RqBKRRuRSgBkBlibRKBqibSGBTBiiBR5R7ipRKihS5iuiEiABvB2iDBsBOS1BhivStRwBxRTRRSDSLRKR3isR1RFikiCS8Rpi1izBVBIBnRFSWR9iZixiqS8BYSUR7BkRHiGBXiUiXBjiXiWB7BoR9B2RGSbRhiYRmiiS4S9ByuBS2iIi9RWS6SFi5B3SyivSZiTi3BAS9R3B4RZiDiBifRcSEuuRTisBeShRFBYSHSRB3RliASKiuRIBCiviFRmiMiwSNBMRHSUB2RsSJSbunRRSQSbSDuRuBiiR5SEipi3SOSORgRdSfB3SZifBLiOBBiOiIiuS8S8iKiAB0BGRkB1RwSjSAB1SNiOiPiJRzRKB6i0BriVRtSXBuBeBRBbRFSXSliJRHSsBGiPBhiRBTB3RWiNR1BySnRjBKRkBzRIRFRpuBiLSOiHi9SUimSNiRSwiMREiLBzihi2R3BKSfB7RiR3unRaSGSMRri1RaR8isStR9SJibRAi1BmRjBsBjBYBtiwiKBUBuSpRlRnSmiaRRiXRWRBRnBtSHiMiHixSKRvSTikSURxBFSaSXRwRZBFRaSCBuByi8RiBTRORJS1iqibSziOB6B6iDBkBTRXiIi3SfRCiBSvioisuBBAR0SGSbBORyRXBARyRkicBuR8RFiniLSMilBGiDB3SjiUBgRVS2RyB8BgSxR9RKBMB4iei8BPBOSOiBRnBWBUiAiuS9iDSwiIRlBpR9R1SAuRBJBoiRitiBisi3ivuRSCuJinBSSxSuSaiySERXSxibByiaBqRNBsS8BHBqRuROigRkBziKB4i9BQRhijR1B5R1BrBERuS6iaR5iBBjSTSMB4iXBdRVR8RWBkBOiVS0SAifiaidB2iLS0ipBMRruSRjBHRjSiR0B5B6RrBvRISRizi4BRSnRFBgiJSkS5SHBFSvB2BNRFBiSRiiR0BtiTSVSiSUSTRKSHRxiNBmi7S7iYSBBdSHRuBGB2RuRMSWivi0ioixi4RVSLBIRdRGivibu2BwRcBmSyBYiluBBXRGBVi3SkSFRiitipBnSHB5SsBMSciJBQSrRgisiBiyS7BWRmR9RkRhiZBQiQuJRViMBSSMBBRyS6RBiwiIR7RvReibRMivBoiQSsSBR9R3BzRVidiGRlBfRNBBiSisuRRpBJSyiiifBzijuSBtSaStRZBFRLBPR4Rdi8RYRkiVBpSAB9SxiSRei0RrB1BsBQSVRhuiBkiDR6RvS1iTi6RySzS8BdROBAi0BuRpS9B8RQSbSeRjiliSiVRVRBuRRbRuBiSRSwRrirRABBROBGiISDRVSwSQRriASJS2i7BcSmimBju2RdSRBai0SBiCBERvRMRvSrBxS8S7RqSuRQS6SIR8BHuSunSSRyiHBdSxRjS9i0iyStSxRZSHiCBkSRBrRWS0B5BUimSYBJSPiRSnBvRJRtiSBaBsBSSNi3SDSpRxRhSNiMSiSkuBSjByB4BuRFSrRlBkSOSXBNi0SGikS0RURKSCiZRHSDSvRqSBSXR2uiiZigBCBBSNBiiASIiFiGS0RCuuBrS3BcijB2BHiJStRjiOS2iOiAiyB8RESCipRgBbRXiVSJShi7ijR6BNRASGRzBMSXR6SqBFRKScBoBliBisSLRaBPi4RKiaigSpSvSPiniPiNi8SbixRpBcunitRURzRZReSJB0i9SiBuiNSsilR4SmRoioifiCiui3i5S4BcuuRriXirRDiqiZuuSRRNBmifREBoR2BfBKicBBSWiCipBJiJB3RnBOS4iguBBABViRigR5SBSkSUi8SHipRzSqRyiGSbR0B0RZRORjSAB2R0RHRTScSnRGiMRQRkitS6RZRWiCuiBZS4R4S1iii1RtRWiwBfB2SNiESGRASxS0iOBSSSinBLB2SvRwRfS8SWuuSkBPRyBSiziciNRmiLRsikiJBRi9BGSwRoRyifRDiiB4iUSyS5SOSaRmiqSZBCSkBeRuSfBVSKi1SBBDiSSkuRiUigSKBPiAB5SOBnR4SDR9SsRuSFiASOBDitRORCSHBFSNiERCBISSSuS5iuSOiKuiBZBZSDSEiURmRqitBqBmRYSmS9uBRVRkR3BBBBByRtRfiXBqBiSzSyBKRaSsBoSdSwSYRlRLi1iZBjRfRMBIByuBiVBdS8BGSmiJRxRLB5RMS7SARiRHRUSlB0RXixiQiQRtiDB1RrBQBlR1SmuBRiRIuuBlSoSRivS7RcRGB3R3BuBoSKS6i1BCRkSLS8RDBcSzBUiIBLSYRYuBihiNitS8SGSYB9SHidBtS1iyRNS4ixBDR7RhSsBiSYBOitRjSBS3uiikBdRfR0RBBkSpBNiWRBBbisBIBqStihisS4SNBeRrShRXiYBZRxRERfRIiSR8idRrRQBYS4SYS6uiRWSsROB0SiicBRRSBqSnBUi3B3BsB8BXBiRMRHS8RiR5REBCSiSHS2RtR7BnBZRzB7RgRTS1ijR7RvRgBUiRijixidBQi2SUieiKi9RKBEi0SkicRLSbieihixixRzRTi8RRRWiaijReSYBKuJiaRliLiySkSCBRRLShBRRQSURfSRu2ijRounRmifi0SGSSRiigifBrShieiUSEiaRJR6RBRYiBRdBqBnirShREiDirSPBhBKSLBHRCSABdRCijBIu2izRnSDSXRESuS4SgiHBiB6uuBMiWS6RJSgS1RvSKikuiBiRzS9uiBUS4B5i5R6BgikBCBFBjBoB0SVBWRvRhSDuRBbiwBqR9SKSfR1S5B4SsRQibSbiYiySdBQRxB1BaRWBCBziaijRxSGRtRXuBiiipBQScRSBPRDSCS8BsR0SuR7BsiFRQS1SIiIBOBTicizS6ipSYRvSJR3S9BjRvixi3BpRgBqiciIS5RDRlS2R6iWi8BkBiBuBtiaiMBxuBunSrRqSHS4iqBqRpBvSMRdBLB6BGiminBrSvB2SkicB8SnRSBISuiXSSBuSZBxBFB4SoBwSuSgSFSWSxBHS5SASyirR5SUitRVijR7RER6iqR4R5S4BrBMuii7i5SniNSyitRqRvRNiSS7Rgi6SWRMSRitRViNRpiaiAi8BWiiirBORYi6SaibRbStiUiMibS6RviXBvBTR8iJSKByRJihi0SDRRS0SdSAi5BvRnSuRUBxBwS8StRhSJi1SLS4R6i3B7ieSEiUBriISaiBBASMBfi4R7ikiOiZi6RpRxBFBiSWBSiiiMBdB4RMiGBLiRi9uni5S5SkidRLBvRXRURjBtB2ipi4RHSGROicSmitRUSHRTSORoRBRRRvBgSgSqSESvioBBRYROiSB6i9SyRyBURSBxB9RyRjiuiAB0ScijR9B0RVShiQiqi4RWRaSDibiSiLSqRfRfRvi9iYBYBFiWRVB6RBBWi5SfSYBiR5BxRNiyRRiKi6S2Bbi4BfSGicR4B9BgRxSQRKSXSli7BKioSuizBJiXBxiCRmigSZRbRuR9BfR8BYiqBwSTBQiBSsBaBdREi2B0BcRIRQSJBRRMRFRgStB4ijBIShiwB1ifBMBfRcR0SQBABdiUR3BEBBB9ScBOiHRUBKiIRoRQBFRXSNRGiURzSCibiuROR6iAiBi9iVBAi2BjS4SeSAiDBERviVR7RYilifRGSPicSYBxBtiiSpiiBfRaRwS9B3BfSqRiieRPRqBDRWixRiRMiwiZBWBwRCBpSUBdBbiABsReBJiQSFRDieR3BYSiihSpBbRxBtBBieBlBaiEihBRRlRKSKibuJiaBFSTi1RRSvSjB8RbBgu2BRSWRDikiKSPSSSIiji7BHB7R0RciEibi9R4R6RISjBgRauSBvSLBjiq",43310));
    CTerminalRouter.prototype["onHandoff"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",47607));
    CTerminalRouter.prototype["onTerminalProxyToken"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",53853));
    CTerminalRouter.prototype["onTerminalProxy"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",54948));
    const _origDestroy = CTerminalRouter.prototype.Destroy;
    CTerminalRouter.prototype["Destroy"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",57296));
    CTerminalRouter.prototype["_connectImpl"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","R7BBR2imRDiPSIiYBfidiNi6BFivRgRLiESLRBSNRqSei4iNRNilSFRBSKRMByScSCROiaikiISru2SFB0BkBoRdS4ivSciFSUBBBWuRB5R8BfigBAiBSDBGBCi0ikipRdScSGi5S7SXROieB5iAixRMSVStuBiuSISDBaiQBbSGB0SuihSgBKiSiuRtRCBGB3iqipByBsBnRkRVSvSRiUSQSPRdiwR5RpB5SWSYRPifB0RkiPRticBJSAShRGi2RdSNBjSyiGBwSkBcSjSMRPiZSoRPibBPB5SfiiiRB7i3R5izBxuJBeRnisSgBouSREBTS9i8S9imiRRlibSISiBeBwReBhiERFSdSXSqu2iGSzSei2i1ShRrRWBiu2RsiVi0unSyB8R2SJiGRMRFiVi9S8SPS9BlSTBES1R1BgB9uJStSXipiPBwijiURvRURcSYRfijBFRoSHiZRrRKiJR1BjBrSDimBWS1ibBERvBbS8REBbSOiWBmSSunifiMBoBtiJBsB3iSRpRvBJBlSGi8RRRRiERRiXu2R7ByRXisS2SJBaB8iWiFREiiitRli8BZuiuiuSimRYSkB0BOR1B0BFiOinBTRTSjRYS9RsBiB5BVR1SGReBOBnS0i2RQRuRkSvB9R1B2B3BuBsRlBYSsBFBbRxSYRgioSNiXizRziGRqRjSMSWBVBwieBBR5SoR3RBSlB0iXBGBrRZSyidB1S0RaRpSNiIRSRbRLBeiUikSIRoiFiVSui4SMiwBmRIBjB8RviBS8iTR7RqRHS8BNirSPiXBRihSySDiPS1imB0iqR7iKRvBMRJS4BDBKS1SGi4iJB4iWuSSmuBunRWRouBiGBSSeiUSoRkSMBkSviaBVBWBFijSUSHiWSnB4B4RQiNiMi0RXiyBcivSoRfSlBUBZR7iHidi3RiBfBViSiFBzifBaiPB7iDBrBdicBcuJuJBPBLiYBARIBhiEieBzScR2uii3SFBuBNuSiAuSS6iYSDBhi3SOS5RGRYBbi5SdSsROB0RZidiFRgiJBUi6BiiAiDSKi5BBikB6BfRgBKRmRGSqBmRfBMRPSDSsRiSGifiqSaiERHRPRDBWiaSPibi9iKB6SRiHisRSRpBPi2BcunRgSqRtBrBnRMRDRJB2iIi7SzRwSaRbSsivi2iBBERzSJBSS4S2iKBHR6BAS9BMRaizBzBASGS2BEioSOieSDiliMS2SHBxRDiEi3B3BISwSeRySYS8SwSHiXSDRwRRBfBqB4SVSQiEi7R3SASIBDSWBiSGSxBiiSRaRcSyiDBRBAihS5SfS9uBRHB6uuSziYieBOBdBVR0RvBtiXiziGi3B9RFB9itSMiNS6iYiPRBBTisRpSSiwSnBoRfR4RcSmiiSBRcRYB5i2RLiIRpSTRZiWiBRoSpilR2RNB8BYRFRYSvRTuiSsBWB8iKSgSxBIRBiJSlRfiqR5RHiMSPBORqRjiqBMSqRNBOiii1RVBOioSlSsBmRbiGiORFB7iwBXSBBOSlRABbBZSbRXRXBrBfStSqiwBBiQiSRTimiuRmimRtBRR1SURERPS2RPRbBjRwRliERFSUiouSSJikBhBbR5R3RbRmBDB3RaRhSkBkS7iKikBqi3RGiyBFBUiMBPBmRqBpiuSvBLSxS1BsiTR8RjBcBJRtBySHRpRCivBDSbRiRER5RyiiBDSkiqBESMRfiZiLB8Rbi1STSeiiBsSciaunSSBxitRquiSIiURZuJBRiNiLBHBiSDSouuiZSDRyBhBtSVBHSwBRiSBJSwBySSicSBBQSmRSiTSJRHi1SOBvSlSlBUS3S7S4BABIS4BjS9RXBjS1SripBISQilBMiyBAi0uBBzRUiHRMiaBUS3B9irSVSOBei4uSRbiuiHi8RjRMRNSGSLB0SLiFuiiwBxiSiSicR0i1RQRlRXRBR9SABKSbi4RSBPBVRli0SlBeBXSiuRRmBJS9iKShiVRwRhBSRDiCSjiGRFR6iJRvioiJRSB6BqSvSjBrixiwRGBtisiMS5irBBB5RjStRjBYiTRPSAS5ShB2icRTRmiHinSHRvRpiqSvRxiHSESziqieidRWSeitRUBDS0R5SQB0BwSTR2SnRcSOS3uRRqisBNSHRRRxR6RtiZBuiUi0BbRAS2RISVSwi4Sli0RUiwRMi5SvStRGRbB8iaiwB1RrRpSYS8B8uJSYRNREROBRBLSHR3i3S0RtiSRTBiSHSsBQRjBSBpS2SLRBBSixSei6iNi6SqBjRFi9icBkuSixiDiIRyidSPivi9SoSDuniyBkBDiVRnSKiDBhSTSHRWRHBxBdRmRHS3iviIREi1iuiWiOSkRqSCSIRnRZiSi6SoRriKiWSRSLRWB3RRB7BHRpR4S1RZRzuRRqBQiIRGixSKiAB6ibS7BCieiwSrS1B7ReuSSyiwiBBtixu2uJBBiFBdinRWiQiCB4iTiHRqiaSbimRmiwuRBoiVBZuSirR8BfRXiGimSqR3ixBKR5SiScSlRqRGidSRSxBkSZR5i0R2S1SORGR4SfRhR5iKBGSxRki7BOiwRQBDimRSiIRsBhSEi1B0RHuBB4iti1RoR9B2SOSZBtBgBXBPSqBcRgBvBwBKBNBrijiSiZBuSUiARlSLRSRJR3BCSBRHSbSKi6RRRsSUBkBmBgi3itBmRwiuR0SRBCRGRkR6iSRviiB4iIRMivRSRfS0ByReSNRnivRrR4uSSGS6izBvuRSGRhB7ivBHBOSjBBB5S5RkBzipSzScSri5BkRvRGS7RMiTilRluRiPS4uiBUSVizBSBRRaRQBfBHB1Bci3SwRmSWRPR7ShS3RTRVBuSJRJS7B7RDiViVBwRzB2igStRySiiBi1iXBmiNRiShB0iBi8i1ijSEiGS6SuBpSwRrBGiYRBR0Rvimi0uBBUSRiCB0SXiDB8iki8iJBIRPSmBTidiWBZBbBpSFixSYieSYBrRGRcBtSKSlRZSFSWi9Soi6SBSoRyB9RaRJR4ifS2SfS0iniOiYBCS5SjB5S1iNRzRxidivRHREiqieBlijiVReBIinBJSaRtBeBAiuiLiqSWi4ivR7iXBUSQB4S1SpilSYBQSoBwBFRGBkBHRrRHSIieBIRHixRpSTSxS2SkSSiNBOijieSOShBsStSiRxBviYSSRFiySaBpivRmiCRpSlBKBoRsR2itiiStSoBFicBwSzitSfReifS3S5BDRJi0BuRoBVBXigRmRMijRXi1BqSOi5isRVR1iYRaBESRRcRISKSxBTi5RcRaRsR2SMBvifSASyBJRjBrieiKivRXRfiJREifS6R2BXRRSCB4ilSPiji5BoRoRuR1inB0B9BLR1inRYBciUBfBCRxirRKRtBKSLRjSiRKRqSMSbSiBTR9BJuiBJunS4iESailRnRRiVS6iOBiiLiKRdRxirBpSfS7R4BNiVRGBgipB7BUBSBJB1isicBpRMSyigBcRji5SGB9BEBERwRhB3iHSJShikuRiTiISeRhR7RKBsSOBWiMSYiXikiRBQiZBdRvB4SyB3BDRViIitRqiUiYRsSQShiCiJunBYRAR6RqRniHRvRlR8SeSPimiriLRvidBpRWRwiriNRQiBiqRCBaRuB7ibBxiKRgR3RxRUiSSOS5S0BCi4RsBWRRBvBRioBvRcBURFRLBvBXB8BGibSIiGSSR5SbBORci1S5BRiuiVBCBvi2i1idRhSnisRPSwSIRQBaRdBDiiReBoiYBzi0RrihRmiTSJi3BbBmiXBsiOSvSpRXScBiSxinBiSBScR3RsidSUitSqBtifR9ifi8BtRHBZRiiKSLRiieiUBiSkiqiRRGB7BTinSWStB5SUSaS0ifuBBsBNicRKBvRGRXBVRXi3RCiqiCRhibiLRoBgBYBvi0SGRGipR5itSSRNROiIBWSYiGBdRlSsR6BsRxSRRbBli9RzRiiKibSmB5iLRqRRSqSVScBfSLS6iLibBmRiRWBrSNiXisBHSTuBBaB6SAinRhSvicRkBCipSIRkR4i7BJS4SxSiSZSFS9BcSdiiShiqBcRkR9BhRvB2BABaRmBbi3RhixiwRFSfilR2ReRDReRIRruJBhiZBIiZBvi4R2S6SXRzRIBnReSHSEBQSHB6B3BBS6R5idRZiRBtBrSmB5BjRWBZRwSHScBGRUBoiJSvSNRxBQSgi9RZSaBARSRPRNBVR5RdBVSoR0ikihiESMSoBuRaRtBnR3BDRZRwiARDSjBeSORJSwiHBeRBB9SYSIB7i3BJRLSiSeS5iESSRqiQSxiPRuixSPiFReiWSyBABui3SquiS1ibBHR4RWiDBoBBSySoB0SwRNSVRgRTisi0BiRBBGiGunifBXBkBXSjidB1iYi8BQiJijRXReRLBbSDSTRxi2RlBXSgBZB8SwiEiIiZBZSsBDitRER8S6iTBBRmBXSgSvB7iRShRjBpRPiKRGSwReBgi2SpiVSURYRkBYitBviiBKR0B8BwSsuiRwRCi7RsS1BzSeieiIiQB0iIRhS5RmS1B4SpBdiPR0SSiABQuSi3iEBAiWi5i2RmBVBWSKiuB2isSAReRfRQBlSQBUBfBPiGRxSHRgBDSFSNSsBVSnuRBLiSi5SQRQBpBnSdBgiPRZBdBeiXSJSVBWiiRvRKRUSeSlB5BTB6iOR4i9ivB8BpSCR5igS8iiRPShRIRjBSSRRNRbiCBbBzSASrS4iVBoSsRWR0RiiuieiTBjBOSrR2BFipBHBziuisSfiySCREiBRzR3i3BQBNSXBdiAS8RBini3BwRti5BeRcSORHSQiDinidR4B0SditRIBJSkRIRjiUiHBzRCS2i1S9RiikRyRiRquiuuBpiPBmRritRSSSR6BZimScR8ici0SySCSdR3BbRsSNiCiDRiRZS5RmSCBQRWBKSsSkStiDBzRKB0SgiriIRuisiounBriXBXiPRBBqS2SlBpSqSGSQRLRpBjSeR6SQRPiyRYRiihiLBnSiS1BmRTiYioRkBER7iYSOSVS7RdS2SISrS3B6S0ieSJi1SaRTiFB9RCi6ihSdBBitRFimBfizSyuiicBrBfSBS8iKSCSLunBuSqBWSHBUSQRtiUBWRzi1i8RxRoSHR3R1SFRYSaitBLiSigi8iWBwRXSBRtBQBfRGBVieRuBfSuiGSeRxBoi5RmR5R7Bci1SOBOS3RRiISmivSGSPSABFBGSrBnSlRUiZBpSRi6BFSHSlu2R0RoRLiNBEuBRfBtS3RwSaRkBUR2uBR0SwSZBUSDi0uuRXiHuJSdScibS1RPiaiSiaByRyiDiJBTiSB7i1BVuBBxR5B6SBSeBiBQSFRtSCRMR1RrSSinBbiTifieiniVRfB9uuBRRTBUB1ixSxuiSni5BkiWRIiQR2RgiOimRqSVisiPijBNi5RhSNBPRJScRbSOiHBBSpRriiikRhS7imBFSpi0BTRDRZByB8BoRERpRtBDSrRtBgSOitiqi7RoS1iCReRQBfBGBAi2SwRfRURwSUBrBauBRdRMRiRfBYiFi8RiBsiYiiRYBeBLiKBJSMBBRFBOBNRYunixifB6BxRXBgRrSAiiSTSmSTBsRCiARsBQBlisS4SciyR1S5BWBjSYBhi0RLBVRKBsSVSnRfSPiHRPBtRGRmBlSDRvRcSeBuShRWRaSQSWSUS9u2BsibBQRPBIiNRWR9ixiSRSRcRhSJRoBFSoSuigBgRqijSgSIiUBSibu2S6SDBwBfRoBSRXRgBcRyRNixR9iHSOBcBrRuB8SkRFShB8SKSlBqB9StiyR8SdBUSqSrBDRviCB5uiReioifuSBEiOSPiERniRRMu2iRiIi9ijRPBQu2RFSNBTR2B1iHRQi5ilRjiyBluiicBcR8i8iGSqR2unBeBiR6RAuuiGRmS8BDBjBpB4BTRERuBtB1iSSMSSRbBDSjiJRASSBSSEuRShBZSXixRNR2SuSCRsSURNRURbiOBCSpRKi9BuRtB7uRipS2iIRqi6S0BHSTiqi5inRpi9BHRwSbB7SZBqSMiRRYibBmBhi3RKS8BCR2iySziWBOBRBAuBSdSySlB5RZBeipSySwuBi7SoiriTSzS4SHi0SfiOBvRESnRABOidRQi2iLR6ixiXBTiKi7BhRRisSzBZRVBUBnBlRdi8SZiNRMRGi3B6BjioRDBRReRVizi0B7RtB6iCSiRMBERoijSZBDBnRQiziFSGBLBSRkS1i7RFBjiXRtBcRPRlRoRWi2R5iKBvSXiYSCSIB5BPi7RviUR9SuRcBYS7BkijSQRei7RJB8R9R8RaBcSlRORii9Bji3BvBvBsB7ibSWSXRbBAiWSnRoRlRgSKS9ifiMShSqSdR4inR6ieRsSXBJibSRRYijBWShiIStRnSIRvSWiOBkRMi5RduBRLBbRbidBvRKRuifSySiidSOScicRfRGSQiFRWBrBRRbBFBWRKBZRHBeSqSSRNBCSpBQSiRySai7R3iKBMRQiTiYB1RSRFSfBrBiB9B0RmSMiRRXu2B3RfifBtRIi0iIRcSKBsBaBBBeBFSDRhRrSWi3iBSWiNReSBR8iTS2R7SQSUuiROi2SqiFRpijihiBSHBxinSaiMRIiKSLSJRLSYSGiHRzRKiTRrSkijivSAiORoiLiXBli1iJSiB5RKiDSOSOB1iYiKRDSFRMiuBXR4BgS9R6STiKB3RfijBiBBBKigSmiqidSxSaiDRsiuRlBGBtRfBMRIBPuSRnRVSjRBiaikBdRCB7SIiPBwRAR8SSRqiUiTBPRsRNRgBxBDSBSrBAiuifi2iwBGiRilRwuRB3SVuiRFS6uiiCB7S2Spi9B4SNBYBcS2SJRmBOBaSuRWRVi0SKBORAS3ScR4iwi4SHBwioRoBdRkR2RyRmi3S9SiiLBIuSBnRwSHRDS6uBRVBeSoREBDSwSRRMBOivizRzS1iCiVikiXRZRMB4BpRNSni8iPS7izRai6iGBQBoBYB5BqBSRGRwBvRIBniDunBGBwimi2ROi9i3Ski5BpBBRISbigBUSAiPBUSVS5iFihBaSHSeiNi2ihi3BVunRzR9B5BIRrisBKSISnifBwiBRbRmizR3BjiOiDSaBSRrRwiuS4RASdiDBaisBoioBCuuBMuRiHBqRnBNiSB0RRiJRbSviNiABaSERMRRRyR8SAB6BqRRBlSUBeuRioShisBwBjiwiWBWuSB7i0RwRFSJSaBhB8SKS0i7SDBuiaRGB3SgRGiDBIijRSSlSLRDiJiEBlBSBgRvSjStB6BzibiXS4ikBLBISOi3ioRki6SVi4BsirS1BKBFiQiBSjS5BtieRciUS4S5BpS2uiiYRQBqS7RkRfi0RuBFBHBRSYSZB4RbSIRhSnBIR2RFS6iHiGSkiyR3RJBkBpRFSoiqRABpiCShSXRgS1ikBPiaRxi9ixBERORzSgiOicBdStScBxRRBoRUuiSJR7RdidB2BbSdS2SDSTByiNiuBUSMiXSzSmuuSZBqRXiLunR6RmBERfBxS6S6RwR3STSwStiwS5RzBciESLRTRIiliZSRBoiVihiaS8RsigizRDSHBLR3RWSwSOB4Sxili7SiiKiORGRoB7ShRURfB2BzRzB6uSSBS4BoBLibBUBKRvuJR5iaSFBfBGRIRnBKBGSTiDSWiqB0REunSOSqRXifSvS3S8SJSYB5BNB1RKSPRbBZSdROSyR2RsirBgi3uiisixSoBLR5iIBNSKSBSWB5Sri0BzSLBVB1B7SRSeiCBwiaBORJilRRigisi5ieBpSqS9iFR3B6SXRlRkRfBqSlRnRwBPi8SfRcBDiJBPBpR8R7B4SMR1SURuSrBwixRHRcivSQB6RXSgiSBCBwSZRASWBaRqBTS5RXRHREu2R9SYRZinuSBdSWBGRsRbSdu2RtBwRrS5RLRFRbikBFS4SaSWisRoiDiKSYRJibiUSKBWisipiGiNRVijS8SkBLRNiQi2RaBQS0S7u2SfiFSbSLS1ifBKRqiRuRiXRjicB1ibR7SnuBuiSjBbBUR3Rvi1RDiEBlRzi7RHStRUuSRISFRaRWiBR8i8BBBwRxRKSrRjiyBnSpiWSiRkS3SSiCRhixRZBiioBViPScBsRfRXBaSAReRPRwBjSPRDiLikR3iNBgR4BbSDi5RKBgBUSfBwBSSXB8BmRlSNiriMSrBCBESfSYiwS0BjBNShBuRvSAiwBEiRiKBmSjSfBvigB2i6SmSeScSpiWBKi7iEi3iOR8iNBhiHixi6BKBISkSrihipSsBwSNRkiZSxSEBqimSbSnBKifRViBSMijiAS6RTiER9izB7RySdRTivSbi0RLiXiiiWRUuiBYS6SARfS9RWiFiBBkSqSRRVS6B4SKSiBUSSi6SZRkBvBuRbioiiS0S0R3SqBFSbRTi6RHRLSnSXSlRVSuuBiminiuSsRdS0ReiRRCBESlBhBpSUiBS3inixBoB1SoSgR8SIBpRhBURvB2iVunBFSBBMBkSJRHifSdSUiUi1SLSUSfSZBaR4SoiGS6BZBtShSWBWSdizi8BLBcRySTB1SWRVRgiISTiWiWR4idSTBju2BpiiSlivi7RHBcBwSmS7RLS9ioBOS0RCBOBeRTRJi9SUuSBPivi6R1RBSKuJRASVRVSauJiQRuR5RWBNSmiPRqiPBLReS5Sni5RZSzR0B2BxRSuuBei5isBCBGRlSPBGSfRbimBUSYRyS8RdRfRiitiABVRdBSRrSvi3BWSpSxiSSAuBRji8RgiLuJRmSWRhiBSARYiwuSR3B6SBSGiHScSBReBZSbirB8ShBzunBPSVR0ikB8RniHSbi9ijBvSnR3SrRmBNRKi1B0RLSGBXR6RCSdRrBaSaRdBqSaBpuRBsStBBRVRERJR3BEiQi4SJixuBini6iaS7BXSKipiZi8ReixB0unRiizu2SHSdRCReRKBHibBkioiVBZSkBZSiRQRIiYR1RzRsR1RxBwuSBgipSnicB6ifB6RsSbRpBWirS5RVi3SsibBdiPBhBgRaSfuuRLBaRGBSRIu2SDRsBiiYSrB2SfBzixRUSGSZBGREisSoRRiBiui3iZB8RTRjRXRWSxRuRmiBipSkiEBaBFSziLB0SsSQS9ibBzRiigRuimipSQSIRkSESRS5iHReSnBnBtRKikRrSwuiRcSqSZi8BEBURZRCSkimipSUuuinigR6iYRmBVRci5SsRmiWiuSmR6RviJSESjSDRCuRiBSgS1B9RPBRi2RgSEiLS0BGSVRGi8BmiTiVSBSwSGBmSRigBzS2SnSZSNSySeBDiXiTB1B3iEiXinBJRtRKi9iIRHSFitigSai0RVigBeS7S6uSR5B9i7SYReBJSRSNSdiSRDRmRsBCR7R6SIBVuiBcRBS3iHSRiLR4SdiUR9i2SpSWRtSLBPBeRJSFSbBpRVR5SgSki9S6BeBMSdBXunSLiIi6BoS1iwitSVSqiGBei8i9SliqRaBrRLiNiliESJiOSKSQBlBYB1SpBgRrREidBfBXREB1BSSuRYBTifSWiLimSxRMilStBIiTRFiSBDRqivSTiBB4B5iBBURRS6R2RrRHRmiRRsB9B4RbBVBKiYuRi7inS2SoSMBrRsRNBYSnRrRviFBlBXScSiB9iGRhSaBKR2iWi8STSjShiKi7iOSkRiBbSviiRYiZROSdikSOi3RainipBRRUBZiHiDuiRRRHS7imRsSVihuRuuSjRDioiuBrS6BpRWBrizB2SLS5RyB5B8SRinRci7RcicR0iLSeiyBhReBXRWuiRLiZuJSASFiTikS9uBB2RAi4SiSfRmBiBhB1RISNSCSgiRR2SauuRRRdiaikSvSPSFBASGinBdSTRZiqSzieR6BBBxi7RAiVisBMRzRASRRyS0RSR8BUinifBqSQB3BKiwBBBGiQi5BtRaSiS5iRSOioiritSKBpRViLSYRbiqRgihS3iYBNRkiXSNBpBWu2RkRtSFBlRmiyBXRtBeSaRRRIiWiIi2i9BdBCBrSgSORZS2SzBpiDRdBNBJBEBCRzB3iTBSSqS9BQilSURASRREBxBoiJBQSBSuBsioi3SJiEBiBzByRUBHSISciiREBVBAigBfiWRRBwBJunSQS7B1i4RtRkiORnRpSZSJRYikRuBgijREiWSWRFRrRgiMB3S7BzSrSfBjRBBoBTiuBnSdR3SYBcuBieBiB4BESLSjBcigSqiKioifR3ihi5BqBARCRkBzReSvRJS9RQSRRZBKBXBeBhSIBJi4RWRnBmipBqipBgBPSUBOB6iXSRSsBTBaS1iTBABviMSARtRCShiCSHBNSqR7iaBIBLSFS5BBR0SeRuiUSCiNihS6iZRWBaSNijBVRlSCSnRlBZSpBYi7RoSMRASUiIRoR7SlSDBKixSxi9RcRNRFinBsBnB4RkRQBrBgiui0S2SyB9RDSHROiQiWioSBR4BfiGizioiqieRUiIRBShBmRVBji3ReS1BLi3RVBmu2RxRoivRriJiGBzSnSKiySNBCi6iai7iFSUSQSASUSCuii3BHBDSqRnRsSLSgRCi1S9BeRPSvRpRPS4RPRmRoBmBjSjRwBYBrRbBYBvS9uSiVRRibBBiNBABZBURFiViEiKSQi7uRB3SCuRuBiCBwByB7SDi8iVB7ilB3iJB2iQB6R9SlSES5RXRIBbRpSeijBuuRBEBMiWS7BLRxBBBWBriRRORtRMSUiPByiTSfRVi0iyRbSkBuRiiuBbBSBpSpRLScR0BcB2BQSeBPSjRuBXRNBbRTS6RiidB0iABluiipR4RliUBySLS2S8SmB3RYSZicRximiiSqRMiji9B9i6BduuRKilR6BsSSBVSTSJiMB3BhSjisi8ivRqRJRSiMiwiSSaiHRkiwisidiuSeiKioRAiiSmiiijScRZBviPiViJSai2iOSrBaisReiTRBBTiBRbiERLiRiOSXBUSriqieB0BZiniyB5uuBuBGBhBZSbRASYiNRhBqiSSKSpicRLBiikSEB3BySoR7iAigRri7RASlRRR0unBWBiBeSGRPS1RKRJSoS5RpSDRMR1SyRNiBRMSpBtRMBViABYRUBdBOiURsSpi8RyRSuuSIR4BuSJBeRJRYSBBARoi2S3SNiniXR1S4RmSlBnSSSjSIirRYBGBZSuihRCSqRQSuiURmiKivRSBzShR5SgS4BSioSwBuReSaiOifRqRASjB8BEixRjRvRVRMBJinSsiNi8BIBdBwRsBwSdStRbRiRJiRihReBliHRURhSPS6ScS0RISOuSiluuRHSWS9SSRnRyRRBjBSBUiJRjSQi1BVSdSJSdBbibR2ByRnRXBUuuRHS5RUi2SuiVBuBwi3R2SYBeRUByiMikRrB4REipRSR1RdBwBqiERxRWRDSkR4B0iEi8SyB9iOSBROiISHR5R5R2RCRZiQSRBDSZBsB8Rdi3RHiIBISMRVSvigBsSoiqS1SoSBBYRCRdRiiBBNBWRzB9BqS3BlRkigSGSLBVicS5BsBUBsSziERPB8RLS9RSunRfBPR4iSRYRWShR7BmBsReRIiyiQilStBPB2ioB7BNBuSURPB5iCuBB4BkibiLS4RzB1Rli6S4SjSERLijiYBeBfiDRtBJRySeSuRKRNSOR5RCB8ikRLRrihSkicuiSRBwBZBuiVRnRdSLiQSGi1R0BOSaRJR9ivSaiiBGRNBBiqRrRySDiyBiiKBZifBmRFi3SWi5Sqipi7RTRJBjRCRMR0SDieRHB7iBSoB2iIu2iNSWSXizSbi4B0iMBzBQioSeBoikieiIiLRWuBSciEiPR7inRaSmRGu2RPiFBzRTBpSgimSTB9SeBOSVi7SvR0i8izBYuiRWB3RdBaRGSEB1Rvi9RRRgiHBJBnSoiuRMSeBsitSMB4SyBfRjimR0B5RniSSGSKRvitiIRIiYBrilRVSsS2RpiLiZR5BwSpSCBViSR5iGRziFi2BeB3SBBhBTRcRYBduRRXSPBtBMBZRvSCRVBcREBxSEB1R1ioR3iDSRioS6BYirivRIuRBmBCuSS5BvRfSbBdiIiaSpBxBWiNRaiGRXB6S4BviyStBkSTiNBaS7iOiKSSBrBPSuBmiOiUSWBUR1isSqBVRYSGSoBTSli4BESqR3RKSeiHi7RFSRiiSiBySsiWRyB7S5icicBKSUBSS9SwRbBMBJisikRdBeiNRDRUR8BaSJRjivRrBGivShRGRfSvBqBFR2BtRtSbSSRyBPiFRbirSJBmREBgBrRMirRARXBaijStiWSMS9i1BkSYRcBeBNiZi8BAiSRvRMSBBZRiicRJBDBlSdS2BtSVRsRrRkSTBgRrRVByS1ROBsB7SfiZi9uJSsSLiYimieiSBgStBxRSSPRyBISiiZijiqRfRdRnBhRwBtRCS0SjRmRai2SZivBaBRitirBfiPSOBXRABsiaRbSeS4SjiASlidBoBUifSXRwS4SviiScBASQiDB8BdBsBMSBiQRSi5BjRKS2BKRpBuSkiVSWS0BNiXi6RwB9SciCBVSqBnBzBXBcBvBNitBYStikBVRuS0SaRjBrBDihSHSnR9RUixSrBYSVRziDSHS1SFSKB7RziwSzSwizBESXB6R4RxREuiS6SoRgSSSyiCi7uiunRRR1RrRqBjiYBfSQigRbB7SHiERLioBZBtBkinB0i8iFReBAunRziUS8B7i7B4RvB6ipSABsunB1SQRVBaRaigBQBCBrRFuBiISNB8S4BeSyR6imRTB0BSRRRsiRR9BiS8SeS4BxBSS7Seu2RwiBSiS5R8SKRxibSTSIREBsSKBTBRS9ibBjS9iyB8RwR0iwBGBkifRziURyRDRHBdRkS2RMRbB1RGB7BmBGiTS8SMByieRXBnBeRvReikRZinSni9BnRbSQiaRYiGB7SoRuS5B0SWBQSIi4uRRYSESfSnRrSMizRzSfuiSOBPRvS7RcBui6i1SMiwR7BhRsShSBBcSoi9iwBMiNiTSPiTB6SlB3BESBBcSIB0BsRBR3RRRnSWRXBXi4S4BHRZBxBzSfBwSsSFRyBRRuigRYBti8BVSRS7SHRqiYBzSPixipiJBQRhBsR6i0RsirSySASVSeiFRlSGRuRNSkiiilSgiXBARhBmBrSlSCiBRpiLS2iuSdiFRgRyBruni7i9R4B6RqR8BRiuSsi3R1i6iZBIipS4BIi9BsRnBBuSROSjBMBKBJRuuuBJiwBnSFinRPSUSLSVRuS7STBeSYB3RFBRiCRbiciSRkiFSdREiBSMReipRTRRBVRoiwRaRBR5BxBkB7BbBPieRlBERBRFBkBSSXBtiBBTBCB2SWi6B9ijR0SXBSSvSABNR9BsS4RvisBYStioRaSbSFiHSsSCiziSiKRDSBReSXiVByStSIixiRBwRvSMRCB8iRihiASrS4iXBARFibRzBiS8iwSqB9RTRLSqiCSiiWS2RHRnuni3SIBZRlRriiBCBJSwBZS1BhSOSVibiiRLiqRRiISTByiqSISgBGRTB7SNSkihBhSwiRBjRCSjuRieS6iMSsi1BOStBHRruiBjB5RHi9R0ituuSCRLRnBISVB1RdigRQSMSiiQSjimBuB0ijirRcBFR5SSixBuuRRCRBi1RFR0SSSdSnBfiDS7ipBpBFSHRuibSnBpSDSXBYRYirRZB0i8Bvi4SwiQisipBxBeRyi3iri9SHBUi5itB7B0BUBFBfRmSXiNSnSFS4iPB2RKScSliyBaRJBiRgSORCBMiFibSOiGiHBaiDiKS5S1igi6RpSVBouuBwSFiKS4RER1BHifBHSiBXBaRvRMR9itBqR2S4S0iNRCRGiOBwB6SFivSeilBFBxBnSbBHRlBkSLSFizSCiuiSBfBWBEBLRjSzS5iJuuRVRaiFS0iDRzSFRPRoi9inRqBjSLR9RbSGiLSQSfBABaB6i3irRxR7B3BFihioBqSxRQRsiCS8iSiwRERWRTR4SNRbiUSURqRUSlR5SRSRR4BiunRuRuBzRISlBEiWRMSoR8BbijSOBoBHimipS9iBS1S3BlRCSXB6ihSNixS5SyBkiLBTS3RoSoBLuRi6iPuRSuiTSfShR6BDSpS6ipi7iCSeiCBNB7RcRZSBRqRKi4S9SdijSHS3BiiDRRi5BqRKSPRXBmShRcShB9iSR7B5B9i6BgBmiYR7SnijSdBCi5B9iNi8uRiCiiSri5BQSnBZi1i6RJisBYijBFS4B9Sui3B5BCRbRrBGiASvSORIByuJSDuuRCRzBBRfReSRSNSAuuBTSUSESYRfBVR8iuB3SlBki2B3B2uBS2BrBBScSfiABgSsuRBySEReSiS5BQBuBXROSVSvi4RZSpikiBRISTRkR1R2RKR9S5SWRfiZRniwRtSES4BqSuRARVRdReBNB4Bqiti4R4iNS8RHiDRuinBDRxSmBtRSSQiOBBBaRDSdS9STBERGSJRJipRhuBS4RoRVimiNRlRIiMRVBGRViUiDRliTSgiti6SbRPRrBMi2BtSYROilSRBpBSBMSPBgi3B7R0RJiNuJB3BNi5RvBuiCRISgi9iNRXuiimBWBOBmi5RTBoRuB8B2i0RFRlB9R6B1BfBkRuilB3RAS8SFRWS7SoiHBeBzu2R8ibi2SxiEi7SCRgSwSFRqSXRtBOiJieioiMRQSTimSzRdBqBWRTBninB6R3BnSPiFBuRsSmSYRzBwBXBdSFiwSwS2SNSXilSfiyRKBmB5ilBUSJinRhRoBXi1BoRwReSziuipiliyRRigSyB9BUSdBISxBqSpilBTBIBqB3RVS7BSReStBkRrSxBiS6RIRYB0BLBxiqBpBUS3BWReR9BmidSiR7u2R6RFiERBSRBeBuBLRiRhR9SLi8S7uuB5i8iRRNiKijiIiESWSHi6SGSZBfRwilSrRDRGuRSuiXRtSABERviMBSikSqSWSoRoRNSJRriOSyBYRtBHinRxRFBhR5ifigSXSmirSgRpuiinBDRXi9SPSLiyRNRKiZSIunS7BoBfRfSaBgRySgRgiuRfSbilS0iBRCSzStSfiTBgBmSEBZSXiuBuSJRLSLiaBOB9SmisiBSLR0SvSdBYiruuRhBgiCRRSfRTuRRKBqibRzBNSMSuSMBoiCiouRBsBfiPSySKBQBBRFi1RoRIBNBRRdiwBHR7ijizSqiIBOBkBpRLBmS8S6BeR1SPSYRqRZuJuuShitSXBiinimRhRiBgR7SQSIuBBmB9RJBRiniUBwRHuSRYRHBFSDS5SWiriwRUSJSmR0ScBrSSRPiWSWiRiNReBuB1idiLR1BUSCRlSbSYuBiSBfBiBZRjiGRIR7BnSvBNRuuRSqBKRjRRiPBXR8SBB7iminSoS5RmRoRTSOSbRsRCBoR0iBRdRISpuSS3RWiBicBXBgiMB3iji3RpirisShB7i4SJBQuSiiSHRZR7BLSyBbiWBlR9iWR1S4S0BVBPSSSSRIRWStSsiTRdSjRuBkRCRpRjRcB9RXiWRXS3itBZR9iDShSiRfilivSKSOR6SCSJB2iKi5BwRrBPRNiXSXiuReSkBkSuiKRviTiSRJBLBFS8S1BRSbSvRlB7BvRiR4iYB3BWSMSVRPRuSnS8SjB9ByStBLR7S5imiySZiWinBgSCiIBzB2isBUBvBXRuRjiUi0SSSsSqiIB1BkSgSEBZSNS7RxBpRxR1RairRninRiiKSqRsSUR5iQi1RKR6SmRliuBgRzBxipSVRgSLRLBlSPSeRDiFS9BvuBR4RFR8iRiai4uiB1imSjihimRGBtB4B4BcRMBSuRBdROitieR1RmR0BGB7R4SHBsSiR0B7BiiISLBTR8i2BmiWuiuRijBESDSLBGi4BBBqRNSQRfSVBQRXR3RsR8Rci9RkS8iVSjRySnicBnRSihBDRDuRB5iAi5SFR3iaizRjRQRUiKibSGSnSjRpReBIBEidiASvS1RTSASsBtSrStRtuiihBEBfBliOBIiwSfSFS3BaibRNiqRWBCBlRhB4SdRfBARYiOR6RiiJiYiASPBhRwibBiSnSgBLRBREiZRPR6SwRsi5iNSMR2BjitioBhBGSsiZRHibSBiUBlBoi0irBuiTS5RdSaSMB9RMS0S5SwBmSgRzSESUuii3SqSvSciMSYSMiiSIibRNSqSVBpieBfS6SER2B2ioikRCSOiUSSBHiiipStB7SlRPiKSJijBaS8RHi6iWiku2RpSZSPSPBBBeSnRjikSkivBjBRRERyRASjRJSoR6i1BVSbBoRtSuSVRQBjBCB0Boi4RuBAieSYRjSjSfBNBxi6RxiCBcReilR3inSfBFiOipiABnB3BYRLSYRfSySfBhBFici9ixSHiuSiBrSoBJSZSGBcBgBPieiGRnSUinBgSzuiBYSYSJunS4B3SkRSRNRcRgBgunuuSJiwSuu2SyBqBWRyi0RySJRCBOR2SjSbBnuBRdSNBwiTSnR7RuBwS0RvSoRUS8RvBeSCiNR9SGRZi9RPioBpirB4ReitSfiURES1SCSdizRjSlSTRKR9BNREuSRtBER1BcRrRDSGBERWBnRju2BlRBRGR0B6ieioRGScBBSeR9RrBaSpS9ieuiRuu2SrieSlS4RziLR6uRBOicBAiwS8ifijBjSYBQBSRWBfSDuSSHRwRviFiISRS0RoihBeSnRMSIRFB3iBihiDBii2BiSOBmBqRqBYiBiSBgB0BGRpSySYSdBQS9SYB5iPRZBxRciDBGSIiWiuR2B5ByBKBiROilRJRBRzS4SPS4uBS2BlSXB8iMSriLBaSqR3SiB6RuSki9BUiJiySvRxBpB7iviAR4ipBhBSSyRHiWB2BuSgSbiDBESPizBviKBPBYiaRuBYiliwBJS2BYS1SVR0SPiARZSdibBqS0SPSJB9SiRcSlibSoRkBjSLBnS4SXS7SIBJSDikSTiXunS8S3ScSHSmRvSKiBiaRcB3R8iiRfuiRyBeBHi0S1iTiBRoSKSsBUunRhB1i4RlByBBRmSlRORAifipunSjBnisB6u2RISXRGSlRZBmSuSTB1SURxSFScSPBrSoBKSASViaR0BhRjSwioROiFRfuRBSS6SOBcixBQSHiYStiYB2RTRyivSVRRSbRhRmilBKiZSJBdB0iAiBBaR2SWRBRYBHRjBYiDi5SuBqBjiVSgiPRsRxBgSaBkSjSQSricSEBzB6ihR7iDSQi7i2RrBtSjRGiLi3SRSYS5RoSvS3igSdSeBgiGRHiNSwRtRSSISGR4iGBNixSLBCiRi7RzivShRxiBBZRySsShSOifBtiHBli5BURaSbSTRjR2unRISQi5RHS9SliJuSBFRpBXicinivBySMRDiriGSLRZShunijReRPSCSoBOiKSDizSYRLRmSZRgSWilRMBLRiSBBBReSzuBSWifSURCB7S1irSESZBuSZSpBXRKiPSLBBBsRIBzBUB7BsioiIS4i0B3SnSaS5iuSGRwSTRhB8RKS1SDijRWibSXRlSkipB1ScRViFuuBASuuSRFSPBwSgRaBqRiiYRtSwBjBQiDRruuR7RwSoBzSJBKijRoRmS2RquRRnSwRRSvBURORvBFBuSXBCS2RhBJR2RSRsBwBdRiitSQR3BIShuBRnRvSsBmBfBWBVizBgRqRoBDRZSSRYSVSfiwB2RnBHRTS6iPi4imR0BPBMS3RwiDBTijBZBmS5SlSNi0RkiTBeBGR5iEReBrShR9RsBzBcR6RJBMioSKSaSHBNi5i6SluJi9RtSXBISIBSi0SvSeSDBTBhigRFiaBZisSHByiTRVSGiOR6SISXSailuJiLSNibRKB6SMRdS9SeiBBni9SeBVS5RqBDBkRrS9BZSqB9SwBkRTBNiBBbR4iyRySeBXBHBUR2SZuSiUSxiUBWiORfBeiyBNiCBAS5RHS4BWSXShByBKSoiUR3iDR5BDByRQiiiqRRROSMi8RiSIiwuuituuSQSxiESZSOiCS1isiEuiSZSRBDBESvRuB3RSSLiERMSziSBCuBBcROBBiCiViJuBBNR6BgBlRVBuRRBiivSWR8BNSnRaBURhiJR6i5Shi9idSOSyifBXSaSERJByBOSwBYiZSZRwiDRViliUR7S1ScShRxB3SoSnS3S5ieBniMReSBBhikioSZuBBtSASNSduSiBRkBZSBBUSgBNiwBpSTR8BwSSiBi4ivBDRHS3iDRWiLSFBYiaRPBpicSRShiFu2iWSxiZi3SXBRB1ini0BUSHRxiYSfuBRDunBUSpRVB5i6BsSNSSSQRHRbiySZRYifi0SPBuiTSMBjiPBbBqBdSjSCRIiwB3RsifSnSzBWRUiPiABbRFS7RkSQiHB3iGSlB0ReiFSkuRuJSTiIRmi0RiRBRURtu2RHShRWRKBzRnBFBhRPB8StSaROihSURoSjioSfuBSxBEixRUB1ioR9BNBKBbSRS3RHRrBUR8RuRGiDRoRRSJS1icRKi1RMBfBySHB8RXBQizioiHiLS6RtRcRvSRRURVSZSABlRORSSci6iLBfSuiViCiFilinSWSIS4SPR9SpRmu2RoSUiGB9RvSWByRTS6RiBCSYSsBjiUS1BOB0BaR3ieRSRmiNSbSnSYiVRUBJi6S4icB9S6i2RVR9RKuRRfuSieSGR4BvSBRHSLSEBMBgiBRLShSkRhRFBBBxBVBmiSBQBiRriwRSBwuniOBBBxBji0RXRARKS5RURaSKB3SgiMRoioi4RjBKSiRJBBScitiZRORESdiXBpStRISsuJSiB0RXB5ilSSR0BtRQRsiyi3RUShSYSUS3SgiQivSASbB8i1RERoicBduJRESvBKSUigigioRdR2BFBxRdBQSciWRyS7SSBoiPRJSlS8SNBYBzBQBeBFBbBbB8SIBQiGRYB6Rzi8RBB9iNiqBhipiJR5R8i1SoB3SGi6BrSARoSpuiRVBzB1BCSNiFBDSUSlShSVBfR1RrBrRdRBRnSwRaBwBbRNiuRWRESFiXBqRCRTiVBeBpSgBrikiRiNSSirBcBYROiSiMSNRjiXRdSUBRS3inS1uuixSiBxRySKiVisBmRbSERPuiB0SoR8SCi3R5R7SWBdiVSXBgSvRJRKiHSbB5BEBVRNioSrB0iiRiixSEBiiqS0B5BaiRR3SJSeiiBWiNiGB0BGBgi4RxRLBciriFBvBXSrRCi5RLBsBIBXuJidBwBxR6R1BER7BHBJiuRfRiRQi1iLS4STB5iYBdRuSSBcR6SGiRS2iDSUiVB9isuBBFSciuitRGSeSyStRCiCBGBtSdR9iyBORzSXBziFBVBuRfinRJiIBIRvRIiWRWS0RkRIBpBORmSdBfBARQBjSGBeihRli3iKRZRlSpB1S7RlSNSlRRRZiHSZSgBGBSiZi0RmBHBDRiSgSdSZijRxSwRaR9inRXuRBjSJieicS3SjinSLiZRWS9R2icRUSaByR4i4iSBZRqS9SdS2uuBmS0SxSdBiuuR7SzRSicRtRFuSRoijiERgRsibROifBCieBeiWR2RfBnBtB8RdBCSUSLi9SHBqizi5R3iWiSSFBCi8ieS7SliqBISjiQSaSrSmSZR9RZBPSoSDSVikiaSHSJSiBNieBHSZS6BNuiRgBhB6iYSCi9RaROBai1iOBQi5iiRoS3i9ByiuiZi2izBwRpSIivS5S9isiyigShSzBESPu2BbB3iQi5SrSaRfiXBviEBHi7BVRFByiiSuBTBlR2BmRlSCioiTBEiDBTSVBzSlRdBhuRRtRVRNRoRSBVROBZBZi5iGiJR3RoBlR0RgRbBoiVSsBPigSpSrB9RRSMBrR4ByRBBMRGRRSnRXSZB7SUiDB4RiinB2RkBEBkiNS5SVisuJRnBhB9SJSeR2i7ididiairREStSdSZBrikSgi9irRlROSHRhBSiyi7inSdibSoSvRHioRuRXiJiaRTidiKRhBNuiRFS0BYSiRmRJSDRNRliNBSiWiISWBNSARxRPikStSsBxiVRQSESrBzRlRnBjRRBYRZiZR0iJS2iAR8Byi5ieBMRyiES7BcS7RSS2SDiwSlB2uuBXSOiGBMRuiMRPR2SmiXRkSFBDuiS2BMiBiURtSbBvibBoBcijSaS4iPisBNSFSYSnuii1i1RPSkuiBOiwS3iHS8S7BPS3SwSdBrSBRuB8RUB9Sni3B8iFBWRbBCR1SciciSRQRzBgBuSziMitS1RhBriTBCRSiSSoSyBOSPSpBwBCiDi9ScS8iqBASqR3ilR5Sei1B7SGi0StS0R7i3iCS8ilB8ikRrigRpSwBVSURGSfivi8iYB9iBiqR8S7ipR0SgSsRTijBMRdRKR3B5BcBkS7uSBVi5SpRHBKBmBxRjSXBbBzSfBaSRRZBdRoR6B5RQRQBdStRJRTSjiyByixBVSTiPBhirS6SBRgR0S2SOBCi7iQiQRLBHBcBUR7iFRgSpBWuuiqunuBR2Bfivi9iURhBOijSXBNB7RBBoBSBqSbSsSRBli8BOSLBrRQSJivSERzBeSsS9BFSHBNSuiURyRmRQBLSNRERjiyRXSPipBJRtiLSHitRfR0BuipiUiOBTSaBFBkiHiDR9RiiZRYici9uSR1iIiRS5iaiASkBRSrBAipiVBKRbSwSnRZi1i8iLSyS8iOS5i5i8SEiNRGi3RXiPSFiJSBB6SBibBKB1BZBeSMisBKS1RRRlSeiLB8RJR8iLiQijuBSUSSuuRWSsBoBCSOBnSSBySNSuR2BmBbBKirBUuJiUBIRjSeROSFSjRPSsiwijRhSXilBwiGi1SpieRUR3RaigB9SNBGSrBlBABkBNBHSISjShBrSZBJi3uJS5SdBWBeR8SbBViSihBHRtSwRQiViBiaSjBBSViSB8BPRlREiOiyScRtSKuiSgRJBURbRDi9RQSxiIRT",58838));
}
export function getMsgSession(termToken) {
    return gSessions.get(termToken)?.msgSession;
}
export function setMsgSession(termToken, msgSessionId) {
    const entry = gSessions.get(termToken);
    if (!entry)
        return false;
    entry.msgSession = msgSessionId;
    if (msgSessionId === undefined)
        entry._msgEcho = undefined;
    return true;
}
export function listTermsWithMsg() {
    const out = [];
    for (const [token, e] of gSessions.entries()) {
        if (e.msgSession != null)
            out.push({ token, key: e.key, msgSession: e.msgSession });
    }
    return out;
}

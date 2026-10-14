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
    CTerminalRouter.prototype["onStartTerm"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",0));
    CTerminalRouter.prototype["onStartTeam"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",3703));
    CTerminalRouter.prototype["onTeamEnd"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","i1icBzi5idiwRURvSQSlikB4ihReBEB6RwBYiUSti9BSidSiRnB9BERYiOR8SVS2BEiYSSSrivBZRLRXitRgSrSrSHisSzi2BxiVSbuiBEBrilSlRWSKSRBGSUivStRYRtigSOBVRgSMSnRrRoSCScRnBESnBbRzBYBdiBiQRlRcBDBjSySuBSBeStRFB9ROS8RFSkSXSGB8S0BzSURRB4B1RiRzSfivRyB3BVSbiaSJiri8B5ScBXRAuuiLSORDSRizSbiGioiiSjRVihi3RwiOiPuRBGRFSXB7R9BAB5iUipS9ikBWi3SASiS4SuSWRASiS6SciLRNisieB5iOiIRmR3iBByRKBwRdioiJSpiASnS0imiHStBPBaRxBQSHRySlSBSkRciZSxS7BBBhSKB8BMB1SMB4SxRTiaBxBFuiSAS4BKBISvSjBVSSizR5SPiMuBRLRCBLRrSmSDSxBkBwSDR2BOB5RtixBEBoB4BQS7Bqiei6SGBABlS6SXSfBkBgSVS3SxRFRyR4B8RJBTBjRcSbRGRDBQRBRiSIBuSCRwSdi0BARpRPS3SyRqigiVBZidSeSTBCiAiEifB2S2BRSBSNSOB7RSSNiaSsiUB7BQBaiCi2RJR5ivijSFBbBsicSZBmSdRpSNRIiXi4RhimSDBeBpBKBeR9B3RxRwRhRNiqS0SDicSuRERkBqRfS0BiB4iUi1ipB9B3iwiVBFRaRUBxiIBwBDi8R3BEijB2BpBei5i0BCRiSlR4BBBtR6RlRuBxBXBXS6isRjBPB3RCSBipBSBuiLRUB3SCigB8RIRdSiBQSXSCRgB2RaREB2SnSOBsiLS7BrSKS4SEi2STRzBPimBESKBpR4B9BxiPSGRvS3SYSjBhRARdBMiKRmiTSMSpBTRoiLSWRHSJiLRASdimRuRWRjBBB7R3itRES2SQRHSxR0BeijRziXi5BbRmSLRlSPBsRXStBfBXBSRdRuSNSoSHS3BfiUiGRiBSu2RkBiRWBri9RHuBSoBYBnSVSNSzBeunBZiUShiRiCSoB2RnSqibikibRERDSOSQuBSMuBS5iBRrRIRJi1B3BASTSMSESsBDRVBMSABduJBuitihS1R3RVRmSHuJSIS5i5RHSTSlB1BkizRXSNiISiSrScidBuSeR9SvSWSaSxSEiAihRwBQRnRbSCRSiASQRvixRWR9BJRvBhRyiWSEB8SiBXRTBURfiPBTRbS4SyBiSVS9BOiQiABwBqSkSbiFSiRASGuiBVS5ibBtuRipiJBxSLiPipREBXRRRhSPieBxBSBpiTBQSlRSiSiBRfR7RwS5SJSNuRi5SrR4ScBni7BzBlBLuuuiioS3Bbi5RfSIiriRSKBYiVSwRJiki8REBQBOBiS3RzBXi7RGRgi9unRku2SVRricB1BfuuRGR1SDiEBlB1i5BQSlisi2icRPicS1SSiPSvi9iSB2iKiXB1iTBcSLSCieRdiNSvBCuRR7icR4RlRuS8SWiWRNSbB7SSSkR4RxibR8iYifieBAilRISlBqSbBYBmBASxBEiiB3S1RIiYiuRQSwSZRgS6i2BNBSSlRYRNibSDSnBFB5BXi0BNRqSGRnS3RbSASwRriwiKRsR6SVRciricB9ixSVR8RRReS0iZuiBuBCiyRTSLBHiRSoB8R1S3RPBMStS7SXi3izunBiBuSyRYSpSmRZiOBnR2ixiJR4RsSUSQRwScu2BiirRWSoBFB9RjSCieiKRtBeByBpiiRkiRBqi1i2RkiXBYBQRPB0B0iZSoi9S0Bai9B0RzRARtSaRfitRVSmR7BZBVunRISsiKisBoB4SYBkRlB0BlBJBsRFS5SUiiS0ioBSiRBORkRtB3SVRTR3ikiyByRISAi7RSBSiwRhSpRHB4BrRuSiSMuBBnRciUiOStRFBWiaSyBgiVB5B0RUSRizR8ifS4S1BQiyiiBoBiRZRfuJBtRHS3uRinihSNRpRFieSxBNunimirSHR9B7iOiVBAS5SUiPBxSMB4RdSVisBfBziWi1RWSHSPBtBNSLRGiDBOBtB5i0BTSsS1RGiERRSdieivSwS1ioRIRPifR8SYBMRoRSRVRiSgBfSUihS8uBR9S7R4S5RZRzSvScSvitBDRbSARiS2S9RsiqSdiJSnSnuuSXRZiHBrBcSGB7i0B8RzBKSdiHRKB6RwSvRpBvBpiaSnSqR3B7iJipiri9irSlSmSLSpBkSMiUSeBLSRSPRBSTBNRYBiSfBRBDS8B2i8SgSJi5ixibRgSVBuBxB3iPB2Btu2ibiJRaiEBNB0imuiSBigiIR9BKSqBaBciYBHiNixS4RURdSCRMRESdBjiYiBBciBR4RbRSSqRTRPRzRmBiizB5iURPSsBTBFuSBdiruiiBRCSCS7RxSfS3BpBIidB1BEBeimScRfSuR0Rqi5RNBBRaBMRWSSuSuuR4R0iEiNiniGR5RDRwBZBmRBSAizBluuBUBHSaRpSeRmi5iuSJi5RESuSvi1SeimStRASiRki4RdBdBNB4BpSESVRhB5RmBVRqSCStStiESrBYR9RSBySPBoipS1SoBaShBJiXBfBcRdRDBqBqitRMRWBAS7S8BQuBi7SvikRQigSbiUiASIRDRqBxSWi7SQBainSKunSUBzRWiQR7SziEi4R8S2RbBSSHBFBeRpiTipBfSqBtBZRwSmSFRKBqSpiPRWSIBTRPirSuisBmi6Bbi5unRhuuRZuBB3iOSoSAR7SxSxRai2SmRgSWBFRuSFiGBvBWBUB2RviaSJB3iKRqRyRmSCSAS5SNB4SPSKSDScBDiJBTiFBqBBS0SjRzS1itRfB6RcRTBQRNSaSPiVRuRsRaRbiKReiBi2B6SzSZiKB4SwBeRhBrieBPRuB3RZR5B9R2Rmi0RiBjizBQi8iGByiZBMiSRRiuBtBTBrSxRESni5i6iPSnBKR4i4Rgu2igS8R4RoSniLiHihS3itRIR4BTiBBRS0RIRvS1BqBhieRXBySJiLSuBWShibByinBoiGSVRSR8SvRES5RrRLBji1S5i5Bii2i5SIBRRoBOiRBRSESEBERORtSDRAB2i2isReBPSISdR2i7BxBeBli5R1RtRUSRBvi0ibSeu2RpRoiHR0SVBeSNSlRgRbRQRJRXRNRMS0BzB9iGR3RbSWiSR7RESQBlSWS4BiR5ROSkBFBzRwiNi8SARkRABquiisRNBoiWiFi2iURWifR6u2S0SsBbigBCBgSjSaieRDijBEB1RDB6igBhR6iwRaixBQSNRoBkRMBSSdSXRCigSJRkRkBnRNSLiwSaRgRgByRmiFBFB9BHSHB5ivSGSKSIReuJS6S3i8iSSIRNSVBSBHBNSZBjRFiBRYRbRIiSRrBuiYiDBDBJRdSmR6BXBDBaRFBGSji5RoSwinSURFScBOihRESpifSWBhBmBVRii4BuizBduuRLSjSvSpS7ihSIBbigRGR0BcBPRpSQiORVSABWiPRNBMRHBxi6RPBERoSXR3B3RZBGBTiCRmRtBSBIBRBjS6SOiYBDRYRhSOSiiAilRJiGBaBRiaB2SXSwR5B6iWBaBKinSnBFuniqRPRCioBnRGiKSEB0B9SLBZi0iwRTSzRYBxBgSdibiZBYRainSzSpSzS3SXSnSOBJB0iVBPiyi0RpiFRrSVSSSqSJBSRri7ibB2SCS4RYSUBMBOByiTizBrSMSYidisRLuBixiSS2ipReiJBnSjuJS8iURCiEBtieiDSvBlSpRzBpRCiTuSRLSyRViZiTSWByiQSsiuRDSKSLiDB4SlSdSoBXBzSrS2iVRLilBhBjiQS0SpizBHR2BERWBRS1BCiySHS3BGRxioBBSMS5ili8i9SbBSRVSZBYR1SoBluRBliaiKRGBfiKBaiMRWuSBUunRiS5BxSkBTipB4imR4RauiBrRdRCRsBxShRNSdSZiqRSBniXRzBpSEBSiRSIBqSjRWisB6B9SVBMSti2SsS4BnSluSRSSrRWuRRKBzS1ieSsB1BBiISNRVBbitigSmSoiYRpSVipBYBZRgBZSCBcR5BcSCS3RLiYBWRoivRgSYitR1BPBdifR6RfRIiwRbiRiYR6u2RNShRUiiByS2iIijB1RNi5ilSoBaR8SMR0iYRrRkRgR5S6RqB1S7RhRrSlRHRtSiRTi0SPi5BFiWSqSfB4B2BfisS7RMiVR3itBQiJSgiIRyShR9i1BW",8747));
    CTerminalRouter.prototype["onSchedules"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","RLBeB2S0BguSSwSUBDSVRVR8SkBuS8SZRSBtBERCR1iQiWBeiaSDieRdRABziQSgRzRHRERbiVBci7Rsi2R6i8BVSgSISqRySySoieReBSSNB9BVBwiqBFSEiyB4S8BFS8ibRviHuiisSFBZRgiCBCBSiOiNR0RRSNuJuiS2BsSSiRSXSUBXBMibSrihRpBwSzRMSeiXiHSeiXRwSKRPB7BjRySNiKiGu2idiDB9SrBQSbinS5RRiBB2SmRzBlB6SXReReBFBeBwSwiRRHSpSSSNizRISYSGi5SkByBISNSWRLi6iZBlizioilSKiRizR0RfiaBVBFiLRZiVBTiWS9SEiKSmR0SLRJRORmRgRJBBSGRaBcBfiPiCSoBnROShSgSpigB4iYSUSxBUR2RoSgR1BqRUiARYiWRXByRzigRLSTiIBHiOSdunBWRCRuRBi2SWSjSWSluJiiB0SVRiSqSWiuBRiFiriSBqR4R1BKReSrivBDRjSqRqRQSKRZBfRlRkiUB4ipB9BSBJBhRcBzSeSjiUiuBJBbSrSmB8SjBIBUBHi0STSSiwiviGRxigBaBiREidiciCRXi0RVBkiqRFBaiuuiB4BHBrRXRQS2SwRBSoi9RjB4SnSYS1BDi5SwiSiQiWRCiCSgR0BtRLSAS4RSSXiJBbSVRZRgiTREBdScBTBLB8R9iMiQSpRLBfRPRgSkSkReBaRgRgSIR9S2Rfi7RuBwiYifi7i7ibByikSziUBoSpBruJBySgSaSMBji4SmR5RJSmi5iJS5B9RjRMBsRqicB5REB1BNBuRfSQiVi7SgioRsBoiKRrijiui0iqRrSzSRBIBuiliTiVi3uiSquJSTifijicSiB4Buu2iQB2SXBISkSduiiIS6uJRvR7BERKuSiPiiBDRLSWBOi4i6iMi4R8RtiLSHixSGRKijRlSriwRrSVSYB4BbSOiniYSsBXiwR4SZBRSyBqB9RDBrBLBvRnSSSwi9SuRxRpi0R3ShSAS1RYidiVRGiARVR6ifB0iCiLB2RIBXRNihSbiCR9R5S3iDBxi3RSiAiRRTBViliYSJBNS5RQSjuRBdBQiVu2BVRoiqBERLBmBLB9R6RQSXR1BxRbBSR7u2BESciAiji3S5BZilRNRESciFRNi6SpiGR0SHuBSXiGBmiNihSTiHRBiZiwB7iSSGRBROSpSgikSOiSRnBJRWiyBhSoBKSnRVRqBfR0R3ilSai8BviWSURpieRYBuBsSkSQBWBIidRYRqibi5idBiiuSuBfuuidSiizBoiOS5RNSzSPuuS3iaBySqB3itiUBDSORFByBhShRGihiPiYSpBCRpShBeRER2BRihBWidBWSpikioidisRwiURAi1SQRHSgBxiFBMBSiVi9i9ShBsSViPBERCSuBDS2BbREiVSbiqunB7SmiGSYitiEBpS8idB1BURUSGuniyisBNB1iYBeB8ReR1RVBAiLRpRAuiSmRdBwR9i4iXSoSaRuSpB8S3uuRdREuRSiSnSVi9S0iSRSiERUiySsBpiPBNSnBfiIBViWSwikRIBTigiiSFRHRsRgBVRmBhSXiwBmiOixSLBKSkiriRSeRISeBMRVRIBKiaR7iKi2RPSYBxSCSDRQSVBrSkRXRGRIiaR8BiBpSqSeSMiSidBpSxiviyRURRBzihBlRqBWSaBUR1S0BNShBQB6BMi8RbBTSpimSGBySFiOSmiERgReBjS4iviCSliXBDSpB5RpRciQiKioRIiOB2iHR4BGS0BhiVBlRmibBAROiwizBzibihRVBsiTiKS2R9B7SqSbR8BFSiRXB3iDBSBtRYSGScS3RRiwSySkiYi8SzReBuBpBUiWSZRZiwBtirifRARhBci1SYiXR3STiCSTS3SOiaiFR0igSUitBoSHifSKiuR7i9BRR4BGiaRMiMSDRSRYBfS8itiLRTSTisSxSDuJR4RvRzSnBkRwBniNRNSau2igSVS0R5iDRqSaizBGuiiDRuiJBIBUSOiURki3iaBUBHSkR6STBgSnBVRLBiiZRVSlRvSZSDSvSKRbiTRwRRRiBbBtiwRqSCBHRBROisirRsRjS3ihSUBliGBRSGRUioRhRRSVSbBViFirB9SnSvSwS0iki7iKBni3BbSrSJSeSBifSOi4iZiXSjSbRUSKB7BaRsRJiYiiiGiJSgBsS6uiBTRABABMiERLBdiuiQuJRzSai8unRGRGBHBCSdBPimB1imS1icSLBwREinSvS6BnBGiUBLRoR5BdRxB2idBhuBRFRTihRriUBcRoBUSki6SziuRii6B2RBReBCRxBoSwSLicRGSWBFiLRWRjSUiVRwSjimR7iYR5SGiKiGRxBjBxiEi3BpSWRSSIRUiDSXSrRCSaSuBtBcSTSsiCBLSciwimShRGSeBzBDuuRDBqRmRJBeRhi3i8ividi0BnuBSPSDBfRHiQRqiaBGiOiDSQBRR7BIBWR5SFiBiFBniYScR8SOSJR2iGRHSuiWSbBKSIRdiSiGiMiuRwSZByBzBlBlRJiuSDRoRnSYBHSIRVi5BUiFSaiqR0R0SDBlRTRaRduRBdRqRTSRSiSUidBKiVBOi8ShSVSRiMSwRiRURVBziBRTiCiqBWBwiCRnB5BoikiYiriRRxisSmiviBRiSCBABDRlSrRNiGBPRuBxR1iNiBiEivScRxBORlBPSAR8RESkiBBYu2SUSXiiRMiViBRAiUR2BWBZiYB5iYSzB9iCBpSHBcirSFiLSpBOBViHBvBASQSNS3ivR0iNifBuSGiKiiBBiSi6BER2RQB4BASKiWuRiASBBJSouJi3ioiCRKSsSRSgitSJSuRgSCR8R8BLiEBlRYBhBMBRRDRgBVS8RaiPBSRviCSCS2SJBlB2RTiPiCBuiaBCRfS7BRiaRnBEStRCRyRlR9BdiZiaiaSWi8SiiBS7RpRViaSWSbSyBtSqRTRhi9RMRLinBoifiXRjBiStSkRLSxBBSuiFiDi3BmSYBAS2SxSPS7SySSiwBQBWiNRpRFSPSfRzuBShB4S1iRRviPibBliiisiiiSiIigRyS4BcSWRqBWSNRlS5BniEuiRkRGilByStSZRURZSUBIiIiWReBWituJSKS8ioSSBaiVBvRIizBruuBySdRNi0SqBHRvizSziNu2SGBLipigSniQBcReizSuRri1iNStRmiGi1BBuJSFiqS7iKRZBRi2BBR0iTBjSrSriSS6S2BQBLSuSiidiLSjScBmiNRcBTRVBeilS2RkiNBoBgScizuJRsiCS0RCSySBiCizRyRvRIR2RAiTRnikReuRRnBNRJBDiDSERURbBZRdiORiBcSTS0iHioBsBOBZisuuRPRdBpRdBgihRHiHiXuBRriGB1R6RqS3iVS3RYiWS8i0BjiYS8SDR6RPBViZRoB9STR1iVB6RIRMBFiABwiUS3BHBGibRJiDiKB3RlBHSLRIiASSB0BES6BhBOStBtiLRaioS7ivB2i1iPSqSBBfBfidRJSESHBjSGRnRMR8iLuRi1SjBMBMSYiWRqBQSUREBnBSBgiNB7BauBRCSCScuRBmSuSABEiKSHBDS3R2Svi5BmiwS1iPBuiJigBTi3BBROi1S5RoBjSHS1RSi0SkiUuiB3S1REiUBfRyuSRoBxBhRBR0R7SfRyihSfBoiNSwBwiUStScS7SiBIu2BMBGRfSU",10866));
    CTerminalRouter.prototype["onScheduleSet"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","BiBUSdSYRCi0RxBxijR1iNSdSyStBARCBSRhiQi4RuSIBXS7BCBFuSSfi5BZRIRoS3i3itRIBmRqScRmS3RBiBSMRXR9BoRJRMiXR1ifBORtSkBYSAR5SER5ibBTiZiGRdRHi9RlSei9ShBei7SqS1iRuBi1iVRmiFSHBRRORPR3RJi9RXSeBtifBUirR4iFSsSRB2RORPSGBxRXRNSSizicBFu2RjB8RTBBRcR4SRRwBziWiRRcBnRJR7ili3B5B7S9ieR4SKBMuniaSARFiiSWBKSVu2iuBcBZSqSiRRBHR8BBSAu2RORXR5SEi8SyBKiNSFR9STRHRcS3iiRERsSgRiBMiWBmBnSfBpS4iniWiqSoSARxisiZSDSFBri2B7BfiqRDRBS0RLSlRziYBdSqSMR4BQRdiAiVRLRmitSBSsRDRtitBxSCRsRQRIRtSJi2i9RuiLSdBmRsRJRZBFirS9SYSpSDBuBeB9SuBfRZRcRBiMihu2iTBDuBunBEBhBZRHSviiB8BbBtiJiKSJu2BLS6ieRmRPiluiSCigiBSiSHBoRVS5BARZipBPiiRiRYBNRVBjiZR8RcSmRLBfSXRsBKRgSIBHiPiCSuSVBrBoiTBwRqRjRRipSnRbi4BeSLi3BuS0BeBeBbuii5RIifiFSoiFunSWSHiqSZRuRVRPB7RES9SASGSbR3idSjRDBSSuSlBAi4SZSIi8iFiQR9BbSMR7RqRSBpiDSZRQSQBQihSbSqSiSYihiLBYiABmRBiEiWBJBPiEiKiJBIRAiNBtiLitSCROSRiRiIROiMijRwi8B9BAR5BGuRB0SaSBRmROiERHSJRUBMSIR7iuSnRLRpBsSzBViuRMRluSRQRNSUiquRiLR8idR5B6uuiHR8iqBRBlRERJRMSoSWRPRDB7iNSSRwB4i1Sji3iYiCBbiNROiuiRiqR9BAiARWSrSgBDS5SYBdB8iwRPiqRjRSBaiiRwShuRiTRqSwiiBWRciuRaR0RbBIi3BSR9SbS2SRiNilShBIBXBkRZB9B9RNShR6RgRiScR4iEitiBR2RWicSYBBBvRKSYihipBhBvRNi3RUiciEBoiJB5B2ioiZBXB1S9SyBkRGiXBtipBKixigi1S6SxiyBdRVB3SNiKiCB2izBhiHiJBhRIRFS0SUiTBARbRGu2RnB6S6R6R6SmSnS6i0RiBhRLi4R2BZREBBiJiHRBBoB8RAiqRuRvRoitR7SFSSRdRfiWimBSSki7RFRoSKR4iMShBFivRVSOBfiWRjRHR9RqBoS3iLRwRoSVBtSJiFRuRbBURxSLSBieBmBeR7BMSfBAiYByRGSeiGBvRGSDBxSDRIReR5RCiFBsiYSuRPSEB9BbScRGSRScSrSCBguSBwBhi8i6ixS9iEBBBGBpR8BdBCBJSoBkRniAS5ROBIRwSFSZS4iER0RBSrSZS3igiUBtR0RNBjBySSREiDBiSYBXilRaRNRmipi2iyRXBjSzSlSPisBYSkSPBKiHBBi0SFSGiBShRSS7i5SvihRtiNiHBxScBCBciqBuBrRRBBi3S1RxRXRURiBaRfBliKuuiguuRFShiLBZS7BfSRR0RrRWilBhifRnBDiURZiQisiIRJBLikSySRSyR6uSRxRISMBlBZiLRmuuBYByiniFivBbuJSfSViTRHiAitBSRbRZR9SAirBFSeBVB8SuBlRYSeSVBwiLSMibBcRDidS7SERPS4BaipSrSxSbSyBRSrBiR4SdipiWBhBTR1SmSsSWRNBlB9ijieRySUSzBJSEBZS0iUuui0B5SeB2ixiMBDRvBQRsSvSRSLRsSGSMR1RlBJRdBZRKRRiHBOB1i4BTBqS6R3SEi6S4SBuRijBmRiSLSRiaihSGBzilRLSTBHSsSyREBXSARGi6RxBqB8iQiOSRiQRGB5BkRli7iFSvSySISwiHiSiligStSsRABJB5RCiYRBiruuiySzi2B7i7iFiMRjBkRlS2iXRnSjRpSfB2SLifigBkS7SPBiBdBbSoRURtRuSpB0uuSKiXS4RPigBMBMR3BvB6i6RGShBkBSSnBlBOifBkS3Bci5ikS7ioSkixSkSnShBMSGBEiZi1unSbuSBeBri2uiiPicR9uBiNinBbRURZSrBtS2BABCiHScS1uiieuBiSBPB6iERRSKBwSVRjBsilu2SOSHSsiySxSlRtBsRaBvB0STRAReR0Sji6iRitS5RqBhiHBQRaBWBuBNiZSkBtRIREB8SwRRitiNBEi0SZRNSAROBeSLBjRUSSBfSdBFB0B1RWBVBIBxR9Bru2BQiRBNSQRbiSuBicSeRsiOiOR7RMB6RCBliRiHSzRiBbifilROSYSTBSRVR5SJSnS5RyStSqSHSYiqBASoSiuJS1SeS0iXiSSuBYByS8SIBriKR2RySaiYSCiiBMBQRoiORGi0RpiDSgRziwBuijB2iHiOBeS8RbRXiFR8RxRFiIBYRLRwisRXiHRcBMBViZRQSuSBRki5ifihiBSUSbSOSlBGSVB5BTioBqR3SIiXBLRZBMBhRPiDioSYixBDRuRPicRqBUSqRQSSRQRJBsSsiFRlBgiSBKREBsRGSzSHBxiRiIB1BFRQixBTBhRYROSQRfRiR1SJibSaRlRDR8BXiuSRSZi2ByRSBCisBZi4RvBLRXuJRUiaSZBkB4RCRhR2SBidS0SPR7B1RaB3i8RbBCBtBWBaB9RoiJRkRAR4SAirR3SiS9RyBoirSSSzBNSnR5RlShB5S7ilBMijSIRsBNi7R5RYi9R5BQRLizS4Rbimu2RhSkuRS4iLiuRpSCSJihBoS0uiiFiiSeB1SGBMuSBEiuBsBcuiBSSuRQBfBlSlSMSsiCRaifiUiSiFR6i3RQiaB9R3SUB1BLiySyBvSfRCRWRMSVBTiWS6R4iAReRMBpu2RsRrRNBHBHS7ioRpSjS0B2BEitBLiEioSFSHSzBOSBi1BZBKinSqSkB7SjSBiHRHigB2iySAB1BcRpROivRhiFS6iNR1uRBFRNBQRMB1RaiABaR8Rtiei6SNRiSCBIBzSHBaRnBQRqSkS7iESfSbSaivR9iKRLi3iRunRAi0BRBcSYRZiZinSyB6i0RASGiuBFSsBgRgBjBORaSSBRRJSsRMiQR8R9iNRCBPBbRhi9RzSGiViei8SBRiivSui1RhBsB4ihiPRRSMB1RcSbu2BJRSBnBuReizRWBYBxifibRJiSBXRTBKSlisRuSEBVS7RfiRBMSWShidR7RdRKB1BCijSnRABXSySeBrSBRNSgSqiYSUiTRFSPSCi3iiunBSRLBVi5iqStSoSRiCRtuiRXR8STi0RIR8SniGSiR8SXSrBeRxRqBiBOBdBNBQS0SLBlSRS2i6uJSfSWikS2RzBZBaBiB7BCRFBDREBtS4S3iritSfuiBriGRmSFSzS5i8i9BlRpR6RcSKRHRoiPSgRABqihuSBHB2SNicBkSXizuRR8BViFS9SaRiB5R6SEBQReS6SDSTSIS3ScRjR1iWRKRoi4iYuSRXBzuRiIiVisBRRTiUSESViNBBihBrBii7RdRaRpiZRtRBRRiRiYiXRhikieinBlSjSlRQRbRAS1RmBKRfBmS0SnSxu2SXBXRlREiVBXuniPSGibiDi8RISdRsR6SrRLSZRaBXBHimRpSBBJSABFSABbiziaiCigSNB6BpRKBPSaRjRiRsRsS7RuiaSRuSSmSURURKRjR5BbBbSEiKSsizBwBXBZiiR4SRR4iFiqS3iwR6SjiWBFijRfSpBnBgS8SUR9i4BiiAReBJB3BZR9i5uRREiMiSSxihiVRQuSRkiEBbRGipiBRYRBBvBsSAB4i4B3SFBaRZiyBrRFSAuJRcSfSYRySGBfiQBbRyRrBTSrBmRmiYBSSnuuRcSzi2SwSoBBiiRKBxiuBrBvBmSmRBSPRUiXi4SOixBnBDBtRASZSXBvS5SmiTBPBkRbRABaiWRoSlSsidS5iriPRyiSRHSfigBbSfSrSUBwiSB0SIRtBERXS7REi4BzBRRoSHBASIunS4BsB1SpRTB1R5SMSpRUB1S3iJSlBSRfunBXS2RDuSBoRVByRlizSgSgSRRXSTSzSCRdRMRNSCuniGSribiESuRVi4RUSVR7RuB3RbSQBABqSaSNiJSdRmBeiHRARDBWBDS9BPSliji8BwBgRHBhBtSWiUSyS2BnS8SZS5ikSoiMRBiPBqimSeRuSPBqRwSxBJSQi8RSiLBzRpirBPSniTBVSFRzSiiRBKSlBgR9RLR0u2SMBtS5iJBeB1iFiEiXBBRGBEiYBQSKBMSRi0BoSUBcBbB6BjSKioRGSSiZS1SfuiBwRUi9RXStBWS4SKicRJBuBaBciViQSeSASISrBPSTiwijRiSySHR9R5iLBtiVununR2RuSLiPSqBOBqBZSER8R5SPiPSXSdRER0BfRJSnRtR5BiSWS1SBBfBTiRRKiRS5SQSwSfSnRZBJBpSQiki1iCBuiGSFiNBZBmReRWiTSXBKSGSBBYRjRSRgBUirSCRgR2R9RnBqS6R2unifiYBkiLSfSyBKSRRERBRmR5SviWRgB3Rni7RNiOicRMS5SKSOBGiZB3BfBxSjSFR0S5RwBuRuRqRFixiliuuRBgSXicRcSdRgRKRySViBBBilBbBGB8BxS5iCBdigiKibSwSEuJiZSLSKBxBFiFuJRbS2RRi1iIBOSTiXiBSmRRSeSySMB2SXSJSIS6BVBnS6SUSASGiNBbSkS7S7SISJiqSoBrS9SDBqB2BgiTBzibSTSKSWBpSSRYBlibuSRNivBIB9B8SKSUiqR9SAipBKRJS2RUSKB6BQRHBSSeBsRTBJB4ROR2i1SaSzSXRCSARfivSZuSBcBTSRRdBeSHBiuBSSiaiySeSXSai0Bni3S6SXiWSxS6SZSHRkBiR4RgieRDSsiwu2ShiwB9i1SVixRXBSiwBqSrR1SiSKiDBDixRriJB6SLRaBIiSRaiYRPSPBBSnBPRXSdivBfihRsuiSfBRRxRoi9BeS7SsB5BHRvijunBQByBOBFSVRLiLRCSiRlRhB9SJSniTRbuRuBRkSdRmByRwitixRWRhSqSsBWSsSxSCiDifi7BpizSCSCiLuRSTiyRKR5iqBeSTB2SASdiAuBBUigSkSwRrRLBjRoiKR8BFivSES1iBiyB8BIScBhBmBpijRPioBVBYBbSYSdSOSTidS9SrBQBzRgSHS6iSBNiiuBBHSdBgidiHBqi7SuSuuuBmRlBDSlRJBniBBTRzRlRIi0RQBoimS9B1SQBoRABGiLBsRqR7itSQR5B4icRdBFB9RSiGRvRbRwRxBaBRSZRoiUBpRWSKSMSiSYBZiZSbRxuRitikS4BIBFRCSbBbi2ikipiruRSRipRkBIiii0iCuiRMunRlunSsSwRbimBXi1RZiuRbSwRqiuRKBSRVSzitSpSKR5iIR0B7BLieRUilS0SlRMB7iHSwBwShRbRMBIS9BSBzBvibBaRlBaS3BZiQRvSwSFRwiFi3i5i2SZRySwBvR2RJSNigSPStBMSjitRyBfRPBpSxRkiaRNRgBeifRhuuiCR9SmiEBvSvigBZBeBZB5RbRUi8R7igRjRMB3inRUReifS2SABESkBABziBuJBjuRR9R0iJuuici0RgSMBGB4RpiuS5ivS5SMSfBpRkBpSbRmSrBFiiRXunS4BGSsi4iEBfBRBnRjBDRoRSBoRpBXSGRtu2BjSEiHBjSKSiBAiNiFS6SRBPSQicRESOBASlRKR6ibiai6imRHRHRGivBwifS6BJBlRuS2SEBFSoB1SZSMBbiYiWBNi8RniziQRhBcS2SSSluRR1RGBRBfikSXiMB2ipRtBpSAB6i7SnSURiS9S0iGipBbi5SFSKSWiKBxRTSTRTiJSmiuBGRzRySFR2SKiYSuiqSlSHB7BZRzi9ScBsRcSrSiS4iLuRieSASDiPBYRKi9imS4REROR2RuBRRaRuBtizi3iaR2SiiaS8iFBySoRGR1iLRXiXi5iMSoReici2SvSZRLRJSdR5iYi7igBvitiIibRjidiIidiyBQi0B9Sbiti8BNiiuJR8RLSQS4iBSLiZBcBhBWiHBUBjRmuiS2SlihBGRtRPRWBoRpS3BOBZSdiOiyiDRgByi8RXSHRHRvBdRbSzR3SVBTioBaBdBAi9SnR5R5R8RIiKSkBOi4BhRnBzB7SvRrBQS0SgirSoS6SNSHRpSkRWS4iuRSShBfSQSWieRtSiB6RBS7uSBIRaS4BNiyB8B0BXBfSXStRxRyiZipuBieB7BhRCRURpifR0iMRxRFRNieRKBnBTi5S8SwRbBPBAShR3BBBjBURfi4BNSIRkBzSliHuRR8BIRqiHRAinRTRxSlRlu2i5uuREBGiiBbRUR0S9B2Bei7BgROiuiuirBvBKRzSbRrSCSViSiISmSsRgR8iZRiRzBwRNSCu2RfiKRwBKRAS2iFRCBVScRbiTRtS9iMi1iaSTRGB1RRBBiFRsRbSDBXS1RFBwRfS1Rji6i7BKRriYBLSwi5RwSIRtidRIidBBRCS4i6uniViLS7iwiJBtiWBZSfuuimB9B4R2iUijBbigi6RVR1RtRHB6izRSiWBiRSiFSmBRi0BAB8SZBgBUiSSJuJBqRIieRTRDSHiNRFuBS6BniUBKiiSmRZRmBvilRyiXR1SHBlR7ili6R0SHiIRciIBLRxBhRLSPBmSQiTSDBPSYSLB8Sxiai0ShB9BGSDituSBdRKRIBBBwBtiwiiisuRB4BgBaRDunSmS0BqBtR4SxRgBwRNiMBURoRTiMSaRTiDBPixBrSxSDSxR2S5R4BRBaRGR7i0ixRgSriYi3imimiNS4BhiwicRIR4BkS3BtieRsSlSPBXSEBGSmijuJB8S2ibiriABnB6R9RtSLBLREiZi7RYRpiKSYSrB4iYB2SwibieSxSNRiBMRDR2ioigR4iWSbBjBdSpRDBkBwRkRhSjRHigBuRGStSNiiijB9R5RzS8RNBESMiHiOSfSvBmBmBcuSSBBPSOiNSeRminidBIBTRFSGR9SYRRRdRJSwS9SXRbRCBySWijSnSki3BjS6RuiHRRRcRLSeSCSdiAB0iLiCRCBVSCimR6iQR5SIRSSPR1SOBbSGSeuSiwByiDSDSkSki5Shi4iXR3RARpSPBAROizRPRlBKBPBfSaSvBYRIR8iOSjRSRNSfRoiniwiFBqBxBuiJiEi2iyByRBB8iHiEiIiwi8iSBpRkBfigROBr",12726));
    CTerminalRouter.prototype["onScheduleDel"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",16383));
    CTerminalRouter.prototype["onAgents"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",18333));
    CTerminalRouter.prototype["onAgentSet"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",20025));
    CTerminalRouter.prototype["onAgentDel"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",23362));
    CTerminalRouter.prototype["onSessions"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",25309));
    CTerminalRouter.prototype["onSuperMode"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",28083));
    CTerminalRouter.prototype["onKillSession"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","iYRBB6i0SnRiBVBNibRviSBORvBOioiCSqiUB6S1S2SZSpiqiFBBSeRKBISUShBGBASiBVBUS8R0RlSnuRRjSTBHRTBcRximBPBCSFiMiBBTuJiaR9BXB8BMBEipi2uiSxiuBBSlRcBFuiSXiLSSi0iNi3SdS5S8ReS8RPunSTSbR5BxBoS4iYSEB8ilRFR6izSUieBUBHRVS1BdSiBdBWieRCibBIS0B1iYSjBVSGBIRTRxShBzBABJByiuSKBYiKSSSaRCivB2SjikBjBpSxu2BZRRBPiPSGBWiyRkBHRoBJSiRYBvR6RKBEiiSqSzRJS1BVS4R8iVBeipScSXigBURhBmBuS0RDBGR0RpiaiASzBjBzieiuRnSVR5RxBoininSWi2S6iiSIR4ixSqSiRhSJi1SKiFSRS4RDBdS0S6iQSVi7RzidBVSMBuiJR6R4uiRCR8SsSOBRR6iRuuBiiaSEiQSgBeBHiXSBBFiJRDiZBUSxiaSpiTSeikiISIBQi8SpRJSASCBXRuihBHRnR4ilSWRqRIRoSpBhSnSTiUS8BfuSRDRcRABxigSwiEBvS5iKRTBhS8ROuSBqByiMR0i1uninRmBESjS8i9itBAB8STRPiEBLiOiAiFBwS6RLBdiKRWB4BsisRFSLi9SESwimRBiISbi4R0BOBqSzi4RhRoRkBoSZiYi2ixSbiTRPBySei5R3S9SPBJSviPRdRHimB1SFSSRviPunBliDicicSvSziHBbiQiRRaBAROiTRnBNinivRyB5BXSzByBnS7SKRSuSBjS3RFixB4iUS7B0ikBGB3SgBgS2S9BnBJBTBqRUSLRgiGRhS6i6BRR4BeRBSyiLBCR9SViCi2SOiDSgBEB9iJRmi5RGBERhB7uRB9ROBWi1BBSFBdi6RkBLBMiWiTiUBzB5S3Bfi9RjS8ituuBpimBmR2RiRPiquuBguBSgBVRqBkiLSNizSkifR4iNStRVBSRSSnRlifi1S0ipBMBDRYiIBMBkBtiliSRABnBHBwinipikRqRsSNR0BhipRxRxBJBhiZBySRBVRdihSYSnSqRXiTROiHSYi0igRYi7BzRfBHBnB3RKSoRASyiFR2BOikS9RYuniHSdBYibBkBpSaRfRAi2RORcRRBXunRPRvR7BbBkSxRgRNR3RtiHiuSERgBSRkS5SABwBiuiidiWunRASfunS4RSRZSVSBi6u2iDSNR4SARdiAR0i5i5RMiVidicRNR8ioRHBYifS3B4SJiZSCBviAiZSwiBi6SlBjBmSmRGikBPRxByiKRnS8RDSGRwBxSdiZRmSSinijBtSISdi1SMRJRsRDSciNisiOSPisR2B1iXicisBQRPi4RKi9itiLR1SCBNBuRMikuJRRRsBERIBJS0RfiJBdR4Byi1RBS1SHiSRBSMSoRqiLuiRHSUSeSCiNB7iRBdBnBcBCSdBfiFBZigiuRzi9SXSwSzSsBJi4BgSUBCRQiqiQSuSIBEBBRhBtR0S8RTRMiCi1RyiZiwRMS6BtBDS0ibioSZi2ixRoScRYSQRERkS0RrSRRCRMBsR5BHRvRgRKSGBEihRRBmSGiOiEimBKBmRQBvRVSiSxiniEBmBgBNisByR4iyi1ioBRimiKBsiHRaBfRgRKi0RZBcRaB5BQiQRARTBuSPBkRWBuSQunB1RHuiijS9iJR7BCiauiB3iHBWiEByiwiuR7iRSgRnRNBOiRBCSPBGiAS4R5iKSsB4RBSuBKRwSfSaBpBeS9SMB5B5BsSfRQiaScBDiuR7iGiDRNBABCiriSRRS0SpR0R2RjS7BLBZRXi4SXSISGR8SnRbSUS6R3S0SDS8RTuuRqi0R0BuSguuS1RPRfilRaiKSUS8Sii3S8SnSrB2i6BmR5BFRgB3R9iEi7SNBdBTB2iWiiRBRABHiRRPBqiliuSmSSRxR9BDBASAiDSoBuioiyi5BmiLBtiMuSRqiXSouBS8RbRVBJRqB0RxiKBoR0iKB8RJRQu2RcRAuSSWiySiSgRjRyRsRqiLRERJunB1SURnRtRJRQuuiSi9imRMSQB7unS2RSihSDROBcSsSYBMSiBzuui3iSBGRcBlBvBfBOSABASjuSSURsB7BlitRHSIi9iLSNRBSfSDi1BASoRLBCBmBnRiBKRmunRLBZRsSTiTRNRgBHSbSDSDR2SCB0iOBARPiyBvSwRmSciWiJuiS4inS4BKiQBeBxS9SRBjSwB5BsRuReShS8SIRKiyicBUSSBZR1SBiciABAilShReSqSdSCB9SlSqB9SmSriBBDRrBwRei5RxS5SvBgBvSgByRYRRBmiMBaSOiCRSiciQR9ijB8RdSwirBNRcROi7SqSSiXBsSfiVipRhSCBzRaRvSnBeBaRcBei2RtSZijS6BiuRRkiLBrRcSRimRBRgSPizimi0uSBBBiBaRbBgiKR9B4RBikSRBCiTSfiniXiWB3BfR9BrRkRiStiwR1RWivS1RXi2SiBHSAu2BVR7icSkRkiBRQRaBjBrRginSmBJB9STB7iHiVRxieS9inBXRgSlBDR0iSBeBiSUBGBQipRzRKRiihSgieuRiZiBSYieRRBxirBjBEiqBJi6SyuRRuBkBtSRu2SZRqiDunS5iqRZSRRaBfBxRZiHuRiduiiSBkSsicR1RaBIimSOBtSER9iiiGibS5Rwi8SjBeRfuuidS1RHSEBkSEuuRFBLi5RSBtSGRJR9RXSKB2SYBCS9ipiri2RDRtR7RBBmiJBVSbS9BqidRnSgiAB9BRiiRvRFuJBQRFSxSoSFiiRZigiviGRfRrS5SJiGR5RYSWiPuJBcRRRIioRSBsRhBLSRikR8BzRHSPBiB9BmSvBlS1RoiHRTidSgR3SKBzBai5ShBJRfBmSWBviBB9BDBpSQSrSdiWBrRJBMiYBBuJBwB2iJBLibiAi7S4Roi1BHR1ivSXRcBwSbiZBVRAiGiGiuRlBbuuSbRzB2SXBzS4B8ShuBBrBfBoiRRWiEROiBRjSFR7RtB6iqBziNRcRnidBhiqB8BeBAitRuBniQiPSlSfBSSSR7BMiVBYBaBsSViOBgSOBii1SYBhSbBCi7SyRvRyiqSHSxBPi3RriyRQiNBtSFReBkS0S6BkS5BqSxS1SSSSRqBNimiHRHRYiRB1RPiVipirRciJiqRWSDi2RCSiBBSbRkiCSQB4BgR1SBiNRcSwSbRCR1S3BBiDi6BmiJuuBWBFBoSmRoRjRtBxSqRYilSzBbiLBaS8BNSyiUiJRgBaS5iUiZiURXBBiBi4R0SoBxB8SJRqiHBFBFSwRZiuS6SPiZiHBMS6BpBCS5iyRhRUS2RdRCi4RPR8SpilBSBKRjSWReSDBbRXR5BXBqS6B0iaSvBGiwB1iyBxRiSTRBBgiNB3RFieiZBwSYB1iIRHihB8BmSlRZuBBfBkRqBVS7BoSGitRLRCRZipBABCSYRmSHSSiBiCSAReRPSASIB6BQBIiAuJiiSwiri4SIBsieSrSjBqiMiFSsRZitRvBvBDRASTiESeSOihBBRwSQRIiNB9RGScRRB4BKRRu2B6SBu2iNS1R9iviNRDRSBCiOBoB9Bqi2BciySyBIRkBbSlBNRjBYi4Sui7iXSKS5BRSHSsisiXR0iISSRBSFSziBRJRcSFSvBgBuRoi5R0BoBiiMRRRZSBS2i2ibRPRZBnB2u2iiRkSTBVSgiGSIBRB3RWiOiEiuiGBGBBiuixRHi4iXicS4SUiUiIBFS8BwStSNBVRiSVBwBESISzi9BaiURiSeR1ikSuRIRmSbRNiBSORUBMSGSkRKSIBSSni3BYBWiyiAB7ifi9itSHSSRCS4iJRWRYiRBBROBNiTBXiCRcSCSVSIRpR3iJiaSSi0B2RTR0RXi5Soi2RkiiifiqBPSARCiXRdS8R7S5iSioBeiNS7iDSxRGSeSfR0iNRFRERKRXSBiESMBGSvBrBsunSyBaBkigSPBoROBERjisS5SvSISlBhRZSPB8BsBLBCSkSlSZBZivBwi5SXR8S4ifR9iDR0BUiaR3BtBUSHSeBXB1i8i8R4BmSPSeRFimiRSoRuiDRWijS8SeBKSMSoBlSKRGSGSwiiSoShRuSauSibBGSyR8u2RRicSuBQScu2B7RCB3i2BhBhS4uSBGigSIBzRwBlBUinRJuiSESDBei8SFisSpBYiWiBBCizBZBWRoBsRFSRipSsRsB5SzRYBfRFi7iIByBLSvB7iRStRFSZRxSeRzBLiMSaiSSRSou2iTSJBKRqBEiuBFuiiGBKBORrBTBLRmRORIixRoRoR9BABIiLRGigBGBORJiyRLR3iASfB9BUS1BqiHi5SrRPig",30186));
    CTerminalRouter.prototype["onLogSessions"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",32372));
    CTerminalRouter.prototype["onLogSession"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",34204));
    CTerminalRouter.prototype["onLogSessionDel"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",36014));
    CTerminalRouter.prototype["onLogClear"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",38067));
    CTerminalRouter.prototype["onLogTerm"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",39788));
    CTerminalRouter.prototype["onUploadFile"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",42642));
    CTerminalRouter.prototype["onHandoff"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",45872));
    CTerminalRouter.prototype["onTerminalProxyToken"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",51868));
    CTerminalRouter.prototype["onTerminalProxy"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",53195));
    const _origDestroy = CTerminalRouter.prototype.Destroy;
    CTerminalRouter.prototype["Destroy"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",55464));
    CTerminalRouter.prototype["_connectImpl"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",56897));
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

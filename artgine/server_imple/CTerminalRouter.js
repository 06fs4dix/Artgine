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
const _ANIM = /[·•∙⋅✻✽✶✳✢◐◓◑◒◇◆♦●○◉◎█▌▐░▒▓■⬝⠁-⣿]/g;
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
const _ARTGINE_TEMP_DIR = path.resolve(CPath.WorkingPath(), 'temp');
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
const _READ_BASH = /^\s*(find|grep|ls|cat|type|head|tail|stat|du|wc|diff|echo|sleep|pwd|cd|which|where|file|rg|fd|findstr|tsc|sort|uniq|cut|tr|nl|column|xxd|icacls|iconv|zcat|bzcat|paste|dd|printf|od|seq|cmp|comm|md5sum|sha1sum|sha256sum|sha512sum|cksum|xargs\s+(?:(?:-[\w{}.]+|\{\}|\d+)\s+)*(?:grep|cat|ls|head|tail|file|stat|wc|find|rg|fd|which|echo|printf|dirname|basename)|git\s+(?:-\S+\s+(?:[^-\s]\S*\s+)?)*(log|diff|status|show|config\s+--(?:list|-l\b|get(?:-all|-regexp|-urlmatch)?)|submodule\s+status|submodule\s+summary|ls-files|ls-remote|describe|blame|shortlog|stash\s+list|rev-parse|cat-file|branch(?:\s+-(?:a|r|v|vv|list))?|tag(?:\s+-l)?|remote(?:\s+-v)?)|svn\s+(?:--\S+(?:\s+\S+)?\s+|-\w\s+)*(info|diff|status|st|log|list|ls|cat|blame|praise|annotate|ann|proplist|plist|pl|propget|pget|pg)\b|Get-Content|Get-ChildItem|Select-String|Test-Path|Get-Item|Start-Sleep|ForEach-Object|Where-Object|Select-Object|Sort-Object|Measure-Object|Group-Object|Format-Table|Format-List|Format-Wide|Out-String|Out-Host|Write-Output|Write-Host|dir)\b/i;
const _WRITE_BASH = /^\s*(rm|mv|cp|mkdir|touch|chmod|chown|sed|awk|tee|npm|yarn|pnpm|git\s+(commit|push|reset|checkout|merge|rebase|add)|curl|wget|del|erase|ren|rename|rd|rmdir|md|move|copy|Set-Content|Remove-Item|New-Item|Copy-Item|Move-Item|Rename-Item|Out-File)\b/i;
const _READ_NPM_UV = /^\s*(?:npm\s+(?:config\s+(?:get|list|ls)\b|cache\s+(?:dir|ls)\b|ls\b|list\b|outdated\b|view\b|info\b|root\b|prefix\b|whoami\b|ping\b)|uv\s+(?:cache\s+dir\b|pip\s+(?:list|show|tree)\b|tree\b))/i;
const _FIND_WRITE_FLAG = /\s-(?:delete|fprint|fprintf|fls)\b/i;
const _FIND_EXEC_CMD = /\s-(?:exec|execdir|ok|okdir)\s+(\S+)/gi;
const _FIND_EXEC_SAFE = /^(?:du|ls|stat|wc|cat|head|tail|file|md5sum|sha(?:1|256|512)sum|cksum|grep)$/i;
const _FIND_ORPHAN = /^\s*-(?:delete|exec|execdir|ok|okdir|fprint|fprintf|fls)\b/i;
function _findExecWrites(seg) {
    if (_FIND_ORPHAN.test(seg))
        return true;
    if (!/^\s*find\b/i.test(seg))
        return false;
    if (_FIND_WRITE_FLAG.test(seg))
        return true;
    for (const m of seg.matchAll(_FIND_EXEC_CMD))
        if (!_FIND_EXEC_SAFE.test(m[1]))
            return true;
    return false;
}
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
    String.raw `fsutil(?:\.exe)?\s+(?:fsinfo\b|reparsepoint\s+query\b|file\s+queryfileid\b)`,
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
const _CMD_LEAD = String.raw `((?:^|[;&|(\x60{]\s*|\n\s*)(?:(?:do|then|else)\s+)?(?:(?:LC_[A-Z]+|LANG)=[\w.@-]+\s+)*)`;
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
const _INFO_FLAG = /^\s*[\w.-]+\s+--(?:version|help)(?:\s+2>&1)?\s*$/i;
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
const _TOOL_VAR_ASSIGN = /(?:^|[;\n][ \t]*|&&[ \t]*)([A-Za-z_]\w*)=(?:"node\s+\S*ai[/\\]tool[/\\][\w.-]+\.js(?:\s[^"$\x60\\\n!]*)?"|'node\s+\S*ai[/\\]tool[/\\][\w.-]+\.js(?:\s[^'\n]*)?')(?=[ \t]*(?:[;\n]|&&|$))/g;
function _varIndirectText(cmd) {
    const toolVars = new Set([...cmd.matchAll(_TOOL_VAR_ASSIGN)].map(m => m[1]));
    return cmd.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, '\x03')
        .split(/[;&|\n(){}\x60]/)
        .map(p => {
        const toks = p.trim().split(/\s+/);
        let i = 0;
        while (i < toks.length && /^[A-Za-z_]\w*=/.test(toks[i]))
            i++;
        const head = toks[i];
        const toolVar = head?.match(/^\$(?:\{(\w+)\}|(\w+))$/);
        if (toolVar && toolVars.has(toolVar[1] ?? toolVar[2]))
            return toks.slice(0, i + 1).join(' ');
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
    if ((_FS_REMOTE_AUTH.test(inner) || _WEB_DEBUG_READ.test(inner)) && !_REDIRECT.test(seg))
        return 'read';
    if (_CHECK_TOOL_READ.test(inner) && !_REDIRECT.test(seg))
        return 'read';
    if (_isReadCurl(inner) && !_REDIRECT.test(seg))
        return 'read';
    if (_READ_NPM_UV.test(inner) && !_REDIRECT.test(seg))
        return 'read';
    if (_DECOMPRESS_READ.test(inner) && !_REDIRECT.test(seg))
        return 'read';
    if (_WRITE_BASH.test(inner) || _REDIRECT.test(seg) || _findExecWrites(inner) || _ICACLS_WRITE.test(inner) || _ICONV_WRITE.test(inner)
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
const _OPENCODE_PERM_FOOTER = /Allow once\s+Allow always\s+Reject/;
function _isPermPrompt(tail) {
    return _PERM_PAT.test(tail) || _OPENCODE_PERM_FOOTER.test(tail) || (_PERM_LOOSE.test(tail) && _PERM_OPTS.test(tail)) || _isChoiceMenu(tail);
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
        const toolArg = _isToolSubcmdRow(use[i].t) && _isToolCallTail(s);
        const wrap = prev.len + 1 + _dispWidth(nextWord) >= W && (toolArg || !_WRAP_RISKY_HEAD.test(use[i].t));
        s += (broken ? '' : wrap ? ' ' : '\n') + use[i].t;
    }
    return s;
}
function _isToolSubcmdRow(t) {
    const m = t.match(/^(?:eval|exec)\s+(\S+)/i);
    if (!m || /\$\(|\x60/.test(t))
        return false;
    return /^\$(?:\w+|\{\w+\})$/.test(m[1]) || /^[0-9a-f][0-9a-f-]{7,}$/i.test(m[1]);
}
function _isToolCallTail(s) {
    const tail = s.slice(Math.max(s.lastIndexOf(';'), s.lastIndexOf('&'), s.lastIndexOf('|'), s.lastIndexOf('\n'), s.lastIndexOf('('), s.lastIndexOf('`')) + 1);
    return /^node\s+\S*ai[/\\]tool[/\\][\w.-]+\.js\b/i.test(_stripTimeout(_stripAssign(tail.trim())));
}
const _WRAP_RISKY_HEAD = new RegExp(String.raw `^(?:${_WRITE_BASH.source.replace(/^\^\\s\*/, '')}|(?:node|nodejs|python3?|bash|sh|zsh|pwsh|powershell|cmd|eval|exec|source|sudo|xargs|env|perl|ruby|php|deno|bun|npx|start|Invoke-Expression|iex)\b)`, 'i');
const _WIDE_CHAR = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/g;
function _dispWidth(s) {
    return s.length + (s.match(_WIDE_CHAR)?.length ?? 0);
}
function _opencodeWrappedCmd(first, rest) {
    if (!rest.startsWith('\n'))
        return first;
    let cmd = first;
    let prevLen = first.length + 2;
    for (const raw of rest.split('\n').slice(1, 12)) {
        const c = /^\s*┃\s{1,3}(\S.*)$/.exec(raw);
        if (!c)
            return /^\s*┃?\s*$/.test(raw) ? cmd : null;
        const seg = c[1].replace(/\s{5,}.*$/, '').trimEnd();
        cmd += (prevLen < 60 ? '\n' : '') + seg;
        prevLen = seg.length;
    }
    return null;
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
    consider(/Permission required[^\w]{0,30}[←→]\s*([A-Za-z][A-Za-z_]*)\s+([^\n┃]+)/gi, m => _classifyTool(m[1].trim(), m[2].trim() || null, cwd));
    consider(/Permission required[\s\S]{0,80}?#\s*([A-Za-z]+)\s*Task\b[\s\S]{0,80}?◉\s*([^\n┃]+)/gi, m => {
        const taskName = m[1].trim();
        return { type: _READ_TASK_NAMES.test(taskName) ? 'read' : 'write', tool: null, command: m[2].trim() };
    });
    consider(/Permission required[\s\S]{0,160}?[\n┃][^\w\n]{0,10}\$\s+([^\n┃]+)/gi, m => {
        const first = m[1].trim();
        const full = _opencodeWrappedCmd(first, content.slice(m.index + m[0].length));
        if (full === null)
            return { type: 'write', tool: _classifyBash(first, cwd).tool, command: first };
        const { type, tool } = _classifyBash(full, cwd);
        return { type, tool, command: full };
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
    CTerminalRouter.prototype["onStartTerm"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","iVBWuSB0uRSHRSSPBTRGRLifBwRnBxBei6RGSzi4R8RxRJRkS6SbRsixi0B4BJS7RGiDS5BrBniriPRLBJBlBiRdBbBsSVRaBASESvB0RVicSrSoSESBRuS8RrBrSfiWSKS1BMiNSWRzBPSIBdB9B5i1SeSJuBBPBjRlSyBvRxSZRfSViwSkRDSkRXS3S9ihSuBRiFR4RyiDBaS1SeRxBnB3RKBDuuR5S9BuBJBgRFBdRCRhiySIBlSGRzBSSfSAiWBGS0BDiyunRbBTRjRCRGShiUSrBjS8RrSQBNi8SISMR5RPSyixS8ibiaBviFR8uJRWS6SnSSiyBRRtiDSyRNiUSrizR1iZRQSCSpR2BvSni8SNB2Rli8iUS7iOimBrBNByiMRMSCRnB5SXuSRDSqBgS3BaBmSqSBSpSmS7BKiBBoiyRcRFivBvRjBpSli9SfB5BbSBRHBmSIi4iCixiCuJRSRpigixiLSgSaRNi4R2iTRsSJisBEBTBYBYRvR1SjirB6SJSLuui9RfBkBySARVRAunRCBURoRVRRBFR9BDRdBcSnRWSkRZSLR5RABpStB8RBizS6SlSkBIiJBTRPSkiNSOiOB5B1iNieiZSMuJiGR6RPBFRgBLBCBqRHSaB6iLRZRGBJSYRGS8BbS1RSBdSSBKB9SuBgBsiUiVRSiVRVRbSWBxSnScB3B6BRBjR0Bli7RgijitBfSOS5SpBQizSsSnSei7BVRBRtiDSrBGiDiTRYSeBfiNB7BOBYBSBdSrSsB7RdRmSIBsSvROBPiQBERmSoBgBrBvBFi8BoSOB9iXBOR7RXBXSDROBJS7B8S4RMRjBYSHSHRzBXBzijSpStSuitiZiRBQBgSfRmSQi2uSBHRcunS0RBSOiSiBBrS3RvRrBES5iESdBMiQRGR1igRpi5ioSASpBvBrSjBGSgu2SniFSwiYSDSHSBRXSUiNiuiJiAR9iIStifSwSKBGBwBhSsSlB8i9SOiPRgRJiBi1BFRliWBKi2iNiGS8StS0ivSqSGuuBbiGiQRJBmSYR7S2BvizRlBvSsRHROijSDiNRgBciOBTBSiYSYiUS1imBeBZRpRsRqBdSiBXRgS4B1iHSmiPRqRiirRjibSMRGibBBRkSDReuuBFBBiDR6SSSYiESoS9R1RoRki5SEisSUi2ibBWiCBvBpifBuiDRPi6SyRUScBmSMSjScSxuBRgSpS4BpBPB4SbiwimRsSuRxiFSCRMBdR8iLi5BfSiB5iQSuirSkihBMi1RiRZB9uSSuRzBVBFRRi4SkS8SviqROuBRcRdSeipicShRyRpSmRTBfRGuSBviGR8ReSfiNiGBQiOBXSkSnSWRwRqBXRpiRSURASCi3S6R2izS8RjRSiviORKipRLRTSJivRtSuuJReRESYRtRwiNRERiSVB1RBiMiDuBiLBUSSBeiHSWBqihRXSMSrSiiIiHSIStBki8BOSsSNRZRCBFBeS1RqR9BOiyuSBYSYRTScBJSfiqSiBdSpBmRpRHiBR2iKiNS7SDR6inSWBCBcBAi1i3R1S6RJRwBGiyB3Bji5iiiFSxBoBiuSigSFSwB3SBR2RXSVipBOSXRMRgiiBURhRkRlSgStBHimRYRuiyBCSnRbiySnSbBliGSwiASwRXiNR5ijRNSzRNSzBpBNRpiFBrBjSzBjiYB3BQRqSJBLiXS1RDivStRoShuSiPiDRgRwRfiuBdRASzBoi2BciKRfSkili2R2SuBdSiBIi6iuS1igimRzSmSTiBRSiauuiERxSNRDBySUBAB9BiR2RcRcREBqBSRAiNiGSbSbSFR7BMi3RDiQRvBwB5RGSgBKSKSRR6SORKiKB0iTiYRARviQiViGSaBrRiRrSNRViqBGR7RTiHS8SaiNBpuJRySFBQBnijRhiHStSoSjiKSdSNS9R8SHRvB0u2B8iMBzSuipiDBTR5itBMR0iASKiURSisRNSJRFSIiBR0SDRViUS6SnSsiAiORbBRSZSRSFB7RRiyRYiPRuRyRdRXSZSCBXS7BPiQBDRpiticBJSyi4RYi5S5R2RFB6SVBOBXBOBHRxSoSOSGB8BJiPBXBeBXRJRSi2iLiMSEiURAS6uiSoiFSauBRVBaRmRDBcBUSERKuJiyiTBSRSSQuBBgB7RtR4iOiIR8BJB9izSPihiURMRASoBsRMBARIBUBpRlRZBei6BaBSBOBESXR4RyiASFibS8iVSyRtRDBuBJBOiyRTBfigS0BXRjSMSgSBSIBDikBsBTunR6SbifRGSsB7BBijS1SDR5S0ScB3RgREi4ScBQSaR9SXSIB7BXRZiRRPR0R6iIi1SfiXRABVSkBJBKRSB7BpSLSlSbiPiyiPRuRhicRBSEiIRzBxBoiYB3RqSpBzBCibuJuJirS0RKifRoiFBHSFSki9SpBzB9BNuBB7R9RWBzSAR7SXSPSQSOReRFRESwSCRduSBEiCS8SHSciTBBi7B5R9ifB8BXS4RZiURvB7SmSyRkS5RDBXSCiiRPB7B7RDBbiCSpB4SfSYRMRvuJRuSoSYStBRBJBwiwBeBZRyiEiMR7BJBxiaBKSdiZBHS0RnBSRUiGR4R8ivikiWS4i1BYRFRRSXiWRNi9iaBCRLSaSbi4ikixRFiKRGRYRVuJB3RIShB3SRiNieBYBYBUiFRWBFirBQSKu2BPS4iYR4B9RCikBliJRsRLS8iqRURORfSHiUBrRfBOirRZSFScSzSSiiiDBGRvBWSLSwuRSXSoRWi9iNSqBxRYiUS8RjBKigRlSFBxSFRHiFByimiCiYSUReSOSliASni6RBiEBHBVSfRkBpSSi6ihSZRwRgBMSYioBZBcBpRSSUB0BWBTizB7BvS0B0iYBzBLS2R0S6RCi8RMRzBIiyBRS6RdBkSYB6RGBQixiCRlRORSSXiKiRBKi8BGiHRXiLSBiwSeRQiCBCizRYSZBui4RYRUBmRriQSISeSyBWRLRNRLBqRGiiu2iLiNBfRdiuRSRoiMiMRwSgRtRoBhRDRkR3RPibSJiriIiwixBBRxRsRFiQRtuBRciURjR4BwRHBeBgSdiwR1Bli2uniiijBpSsSpiUBQiMBcBhRAR8BviguuieSOiISHiGSrBviPiXi4BXSdRkRUi5RdSiBLiyipBEB2RtBCiMRwBxBUB0RlikiFirBmi5RkSEiXRbBEieimB4SORpixSdROipS7BPBciSiiuJicRaieBPB3RQBWBVuRiuBWB1B6iASNRISfiDi9SKSBRuS8SPRkB1SBRaiCS1ibBcRlRUB8i4ivBdRZScSHiuSbBNSeBJuRBcR2Bgu2BbBpBJBfuBSFRxRFS6BYRxSzR9RRS2BlB9iTBxRnRVSbiGRHRKipBzR7BXidSXBkBYRLRuBkihijRjBGB1Snu2SBRtRMB1RbRvinRTBRBcidRLBTSXuRSFiTi8RiSrS7iuStBVSeSnB0iNiwivRPiCR8SfiZBpunBZREixu2iJB2BCiTRVSPiXSeiXBoi0BHBGBMSqigBxB9SQSoRli8iFSbiCRNBeBQRNR8i2BiSaiEBDiCuBRYB8RHiditBoRQRASHinBHBFRtSiSES7SLiuuiBERVuBSfR2i6S2RWSyikRviaRsSyR8uSS4BZR6RkS6ilRoRWSNicRkBORYB0BuRpRxi5SnSURoidiBiSREBEirBNRmRNizSnRqSqiDRdStSORySNuuR2u2iOBDiRRtSiSoBfBCiDRLirBmioR0RDi3R6SpSPRNRpioBSBlunRhR9R0isu2BpRmBPBgRpBzSQibBMRmRjSHSiSMiHBzRfRaSjuRigSiBQBRBtBqSDirBNROunRZiDBHBsRzi6BzRzB9B0SCSVBOuSijiWiGSCRtBpS7RARHSqBJBWRLi0RTiBBrS8BxiTBfSfBXizBRRSS9iJRBS6B1SiB1BXSkSMiiuRi3RoBoiPRCR8SPB5Rli9BHi5i3RyRtB6iLSrBFSCiQRiSABYuBiZiGBBSkRKBIiDBpixSTBWBaSBi0BTSeiZiUiPBCiZiXBPiGSDSbiqiQBHiQBSR9iiBuSGRRSNRDSGRZBTiRR6BSB4Rji5RISOSgi6BVSQBsR7igiNB0B4RWiBBQS8iNB6RBRlRri8SUi2B3u2BpRIB6BEiKB2R8iuB2RARZBARKBIS3B6RUuSiiR6R8Syi2BjRTiCS4BTRfR2RIS7BTBpSJBUS6SoSniCR4SeB1SmBBRcigBtBtSUBKRYizSHuBi0RJi5SsBPBkiYRHuSS2ScBiBfRaBvSBiXiIBjSPBeRpSDBei3unRNRdiiSfS6ieS6iORMBlRURQRgRoBVB8BMBNBuBnBnidBTSgimRwRwRrS4iaBXBwSWSaRJRWiniBRaBXBEBbBJifRpS5S4iXSrRUiBRuSIirRTihB4BSSQS8BuBMBzB8RaidifuiiURURSS2B4BHiLiABzSjBZRWBySdiWRfBOR7BKRHRDBCSzRzRzSxiaB6SPBNBriAi0iMS2RPRISQRaS3iFRMRxS0SZSFB4uBRxSNBvRASxSpRnS6ByRiBzRvRRB7RMRtBQiLBKBBiGiPiaR3BXSQSnSrRLSARmBeS2BDRIS4RWiCSqB8RqRfSyRSBIiHiFSBSYi1i7BSB9SDBxR2RnSCSaRRiBBfuuS2SaRlRKS2RXSyRGiriXB0iKixSTSURhRtRLiOiCRDBdS2BRBDRdSAiKRbSAShi0R0RfuBBISURLSdS7RqSmRMigBMBwRAi2RoBlRVuSS8SFBAS5iNBMSqRpR9iESHiMRRiZu2i3S6uBSYi7SoiTSWBLiVRwiciJiESlBcBrBCSMR4SiRIi4SBRHS4BfRZisBJB6iKiNiWiLixBNBpSJSXSxBnipSPuuBYRIB5RpilSnSpBTRuSKi5R7ilBBBsSZiPBzR7SQBISUBuiHS3SYBESGiLSnRCB1RzSciWioShiFidi2uJRniZRjBnBKiEiHivBER5iwBnisSXRCRERmRxiiSESgiFR5iISQRaSeSnSOiVigBpS5ilSXR9S7SIBQB9RwRgBdRxSnR8iwB9uiRHBdR6SvSzi0iaRuBIRjBXRyR4BMBBixRnSIS1BHRJRiSISMSrRHRJRVuBi1S6iyRMSpSiBoBJi6uJB0BbBIRnSLuBiBBIBEByi7iBRaS0uBBERTRNBLRBS9SXRQBVi9i0R8BFuui5BWBTiISGBJRDRlSyRpRcRfBbiORzBMSxRNSCSQSaScBGiNSJSmRmioiYRzioijRMB0iaBIRhSjiViJixBhS1SBiuiGSpBfRMivB7BpBaimREBLSHR6ivSsBbiHBGB9RIROR4i0i0iGBwR3SYi4R8BSR5RLS9SoiaB1SsivihBCRsBoBgRkS8BFuBRDSUB4Bci1i2S1RNiWi2S2iTijSLB0imiMRBSaR2SRSZB4B2RnBxSGieiqBOBniPBEiRBzBgStBOihigSpBWSJBKRRRiB1R5R3RQiYRnR5ReBIScRBRvicBYRLSDSbBlSWRxR8RhiduuiLiXRoBMRUi1BBBoivSjS2B6RYRfBISyRYB8BXihBMRJS5RPBuuiRQB8S6ikS2SriFR3Sei9SNRVieBnBMBiBNi8iHBkRqBIB1ihRqRdStRRBiiIifBTBDByReBjinBtRGS1RyiTS0i1izi5RySwiEBbirSwRQiji9SJRciRiMR7REiaBvRuiXBYuuRQS9ilSJSIRNShBwieSRRnBAReiFSfR9BriXRSicBJiTSqR3RJi2i0i4idBFi2iaSdSBSuSmBuitBdBeiPSWReBlSguJiwSPRiBYSRRSBKSRuniwB8SiRCRriiB0ShikiJunRZSLSpi6BcRliARySoiyRQRgBVSeiOByiYRFBtS5R7RIi3SaBTSpSsB7iBR1iMSuRBRRRdBcipB8BYiqRqiVBYiDidSBB3R2RjSPRoSxBdBrSAStS4iBRdRiRCi1RIiCBeSsRvRaR1BdRAiRS5BZBqRcR3RnRFS0B2ReRSSuB1SoB9RSR3iURAB4SuiHieBrSPRIijSYRrBbiEiMBCS6uuS5ROBXSyBcScBEi2BTiUSciJSKRiRfSGRZiWRxRWuiRZRgStBwRriiiNSjBrB9BuSkBUiVSpSPBUBLifBLi7R5BGSZSDSpiVBZuRBkSVR4RtSYBxRdBRiTiERHR5RqSnR8uuRvBtSYiJivilRBBAiBRGB1uSSnSBBRiuiwBEB6R5S5iYBZBBSPBnSzizu2RoSUSnSMR8iaB4uRSziCRhSVBmBVR2iyuiBYiWiqiDiOB7BWiaBFShSLR5SOiGRtRPRniVS9SqR9BNirRMS3imi5unBFS0BfRPBgS7BeBeiXu2iQRLStBeRWBnR4uJRCRpiBBuBbBlRWRsRDRgivBmB1RBiKBQBnSzBeRtBaS3R6S7ipS4RBBMRESsB2B2BQSSRrBsiFRFBSiCBbicBABCRpSGB6BQRQRLBfSEBzB9iDiPi7BqikRxBnuJixBviYRJRySwSARjR3SLikB4ioSQBTRUBnRvS2SyS1BjiVBXRQihuiB8BpSfB7Rui1iVSRS8iyRciLSci9ikSbiUBbRYiAREBTBbRiBJSCB1RmShiTSxBdirSJS0BbSTRqSDB1BAi3BbRABkSISzBrSyunBcB4iiSISLSiRliwRpRASDBDBYuRRAi5i2RMRTipRUBKBvBwRnSyiYiaSZRii4unSbiNiKuiSCSRBiiYSXSLBmRBSGRTS0BuB1SeSNSDSzi9SMSISxRRieBfSNBxi2RpBXRoBABpiZivSZiJS3BcSkROuBBoBAS8RhB0RWRORAROB1BUipBAiiRuBASfSoiGSUSQBJicS5R7BkBPixSFi5iZBYB2S3RciRBTSHBFSaRtBSiEBXR8SpRNSfRFiuiFBwSMibSziQiBSYBWSaRsREBrRbRRirSciRRhSGSlSIRZB0iORaSti8BLRZBuRzBri9BjSURpRuR4RfBxibS6B9SxiQiViYiTunSaSWSdSJSPStR5i2BiBPiRRuSiSnBQiTSWSKiyiCRBiJB2RxRdiSiHi4RIBZuJiCuuRCRMu2SlSsSgB9izBTi4BoBeB4RtRgRSiCBHBXiTR4BZBgR5BcBDi9iKRxS0iPSKigiLSruSRjiVBWiVBWiVBVS9B1iSiCR8iaiIS8isSQSDBPRZRbSwBDi4iySqB1SFSfR6itSZB6BGiuRRSUS8B0iBBAifR0RqSiisBqSXiZShSFSTSuRrSqSORKiCSduBi6iaBbSYiNBURkS5BBiwRVSuiPReS7BzSCihB8SqRRRTR2BQBjRDiYunipR0iVB7SWBNBeR4ByRRR9R0BQSyu2BliwBtRjSaiJSaSoBSBQR5SXS9RTBoS9i1iOi3RnSYiciMRaB5iyivBMBkBKitS9STRTS4SHRQRbSHRd",0));
    CTerminalRouter.prototype["onStartTeam"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",3725));
    CTerminalRouter.prototype["onTeamEnd"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","ReSDBWigiMRjinBmunSuBUSviZSMSbBeBISuSvS5iVibiDSKRFSdBPSLRQSXBMSSiQBySKS0SCS7BKi3SmBpi9SNBBR6SriWuSi4SSirRGixSLi1S3RkiEiLiwBFiiiViQieRAiWRYRBBxRZB3iQSZi9BFiLijBDBHRxROS3BviGSQiSSuuRiVSLRjBQRxiWBAi6u2SSiDiWSiBoSKisS7RoRNS9iPR5iuuSBDSwSkidRKBluJSJR8RgSai6B3RBSmSORrBPSyBFB6R8BiBZSVRnB6R8RrSaShBWRzi2RrRwROSvRLidi1SdRziJBvi1RCBOBdRBBPSTSZBNRBR8SbiZiHSxSPBzunBKRsSoimS3RNSJS4SJieSgB4iJRZiYiXBJSASziLRzBjiaRgBvBYBzSWipSeSRRwuBunuiSIiHiPBhiASLizieRYuBiKRPSQSYRoRYBlRdRnRnRUuRSpisiHSQSEiLunipRvRmBoByiCB5iFiWiABJSlSqieR3RgilBvR9RJSZBiSLRjS4BEBAS1SSiGRcBsS2S4BzShi3BvuniaSPB9B3BZB2ililiORHiRiuBNBORJBdifBzRQRyBtiJR6S1iQiaRiRnS6SNS5BxB8SIiku2BaBsBRR9B1RBBLB0SNR3RiBBBCR1SERyiUBpiFioRaB1RASISOBmiPiDBoSNiXSdRrSkuui9BHirB2ixSZS5RlBsS8i7unSWB7BKB4SXS4BBB6i5ieieRTBQimS4R0iPBDiVB9SbS9Rqi5SRRYB1RNBnBfBARfBdiSR6iJSJSFSBS7REReBqB1SSRNB1SESwSMBYRaSjSDRnRHR7RgS8BHBiSBBWRJSvRrBBRpimimBxBIiMRFBKiiBTRpBlRjRyR6SvS8BiBgRvRsizS2RPRDSNRKRtSuSzB6ByBwiCBDSRicBIRFRHiiRXSiS2B6iji1R0ieiGSCSAS4REBcSURqSMR2BhRbRYiPibBqiqSYiqRoRoR4BJS4RCuSiyi1BMBiS8SmRciMitB3ipiMR5BvRlRPB2RISNRXidSyR5ijBfBhipBJiXSxBcByipBpSPBLBySDBABEBURNRJiPikSSSIRlS4i4RLRPimBeRXRMBnSOBwSTSABcRMSdSUSBR1SuRuiViJBcikSfBvRGiHuSSauRRHB2ieSNSkS7SeSEiRRMByRJSvBGRpiUSFSbitBnB7BBSDB1i2RFSJSsiyR5BGRmSWuuSOSbSJBJiQSnRaBaSYRFSvSlSiSNiEiOBQSwiRi5SWSGihSFuSi5BlRHBZRIS0RPi0SrB9SlRBRsRoBFB6BySBi0R9i9BcRKRGB0SFBRBSi4uSBViXiLRuSJiHRFBmSuibSVirREiySbBDSJi5B2SzStSNBtSnSfSUBRBuB8BbSNSSBgR2BGiNR2S7RiB3BxBVBARJiHSzu2S0iqisB6iOBjitBwBdRtiOSCuRSEBYijB3S5ijB1SKReSGi3RGSiS5R9B0BIRMi0RmBuS4B1BYi5iqB6SAiKBRSfBTR3i5RrBpSwieRSBZScBViwSBi2SBR0SHSNuiS0SFSRRWBIS2idRyi2B6SLSCSNRoiVSABfSKBDi9RQBKBMiaSISNRhiPBRSzSaBIRRSlRWiEisi6Reu2R0S1BBS7RzB6BzuuRbRmBMi2RJSRSlR1SmiDRsieSuBRRpitRqRGS5SaS0RnBgR6i1RrR0S2RDi6RASASwRTieSFRORJiNR5SeizRHSBivBfBGRhS0Spu2RjB6SLRjiyB6BIS3RkR7uiBmBqSwi7iruSu2SYR4RMSRRsidSsBxSfB7BDSFiJRLRBiUiuRuiXS6BUiQBUiqBpR3B0SCiKiuBfRsRZBlReBWRgRaSNSZR3uiRkBiBoBnBoStSBiOSqRaiYBDBOR3BFSYiSidBRiUBnBLRJiMBvuJiZiTRhB4SYRuBFB6BpBGRkR7SJiYBsSOSgRbBmBeBIiRB5StBnBRikiKRNBQihidBSRBiTBWi4R8BBRTRyiriJu2RrRFStimSNBGR3iZiGBVSUBmRBR0SPicRbisiGiQBSiZBORRR2RaiRi8RDBPiHSOS6iciGRERWSTSUBhizS5uJSqiRByiZSpBzS3ibSqRBS1RqBiiwi9R3RSSVuBR8SBiWB7B7SXBDSsBkRMBOSSBlSNi3RpiARsSrS8iySvSJibR5R9SSRxiHR2RCBGRXRXiYBYi2SmiNSWRGikRMSPBSRciGiEituSRiRBSPRxidS9RbiKi7iNS6SKSIS2BHiZBLRRSqRZisRAByBFiFS0REBWBEipBZBoBOiaSnSqBhRJiUipSGi8ijStibijSZB9iySwSTRjibSxRCS6RxiiRFiARQB5iwBSifi3SqSbuiSSBziaBbRFB6i5RTBtikSiicRdSkRJiSSdiEuRuJiPRRB5SPRTRxSHBIiQuBSaR7RiixRJRvivRlSmBkRNBTByROBLu2BnR5BgRuR1ijiBiEB9iWR6RhuSBNSGSIRoRYuBi8BlihuRBgRviXRUR6RIibiARQSWROiRSnBRRTBrRCB0SmiYiVRQBmShisivSqB9BURKBdBcBqSliWB2SARsRoSTR6iYRmihSFSji5RESiiCS9SGSciCB8i9iRunRdBDRtBaBUigiGB0BpRgBXR0iQStS7i3i5RxB9R2BIuSR9unuRSABuisRISrRfRhBxBBBPR8ScBJReBfSCijRdu2iySTSpRtSfSISQSguRB1RHRAiciUS6RKSriKSBSDRHB8S8R8ScuuilRaiLBWBZSHR1BgBdidSKBei0BjRpB1iciXBjBYSjS3BruiB7BPSLSsifR6ipBOSGSRR3SuBMigBvSCivShBKiciOR7i7iAR3iABsRuiEiXBYBqBbBBRvS9iqBKSURqRwRoSDiHS3S8B1ihS7SaSwRiSvRjSDB6BFSAijBmi0iXBERbRsBjRpRGiVSxiuRNBJBQRXStiRRkS5B6SfSMShB4SNBvBLBTivRWBgBPBFRcB4R6RCScRzBVSORZS5S9R4SzRBRxRzSPBLBDRnS8R9iKuSiHSbilR2BEilRBSNunSVBlRiuRSXS0inShSNBVRCBCB8BDSLRqiRS1RQRAS6BRB5iPS1S3RSuJSNR6SCR0S7iGRhBgihRci2RrR7BtS3icioBaS5i5SbR6RXB9RvBSStSIR9BkBsSoRCRoSeiPBxBPSISpRui7BxBkRai5R1RQBDSnBnibSYizSGBrRsiLRUinBvuSi6R0R0RyRfRrBVRMS0BcROiGR3RbuuiSR7ROS6RYiOSpRfRjB0SziBRPRZiji8SARvR3Bquii3RlBoiWi4SjiURWicBlu2S0SABWigBCBIS9SaieR1ieRDR2RURViDRIRKSYiBS3Bji9RrRmRLBOSfiwiRitiUBmRoRsR3iNiJSBR4B0BjBJiHRtBvRMSKRWSTiPSHixRkiKunici8B1SVBuSdRsBKRpSZBwRtBxB2BhBsBORWBTiCS4BWBXBwiIBeBtBBBBRmBiSrSeRriViuiYRHi3BhirRXiTiqSTBQRvBpBcihRriABtuJR5ijSXigS7ScSRRBS8BuRtREBeR6S8SbBeimR7unBxRUByRmSOBORUBmixBeR2R1BgRPSLBWR4BlBlRXBDSViwSBR6BbRXuRScS5isReSGBuB4SpRpS0ijByBCieR2R5SZimBwiZSoBQReiWBDBeSRivB3RGSmR6iYSuRsigRERNB4idikuiRAR4itiZiDimSmi8iDSIR1RTS8RmSGiNRFiGRriJu2i0itRyBsiKiIBNi9inRJSfRwRbB6iQSkR2iqSsitSfRhSSSCBhuuijBvi7BJS8ioiwimRSSsBXi8itilRgitBGRdR4iNSxB1ixBDS4S4S8BTSGi5uuR2SuiwunR6idiySjRuRuSKSsSaBhiURLB2SESRisSSBqBtRdBeRmifRDSdiKS0BoiBSKB9ivS3SoilSYSmRfRziJR8BGSZR2isRkiPSKRURuSiRMieRsiGBMScRMS5BxSqBFipB4isBuRauiBDBtBRRBBESFR3i1SLSZRkRdS8BBBsSuBnBZiPB9ihBNSWRrRbikRQSiiQiTiyRoi2SbBpSiRGi0RGB4S5S4SciiB9SkiFROBFSUuSSMiHimR4SVipBoBTBNRji5ReBniii3ifReifB5BGSbBI",8692));
    CTerminalRouter.prototype["onSchedules"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",10793));
    CTerminalRouter.prototype["onScheduleSet"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",12373));
    CTerminalRouter.prototype["onScheduleDel"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",16100));
    CTerminalRouter.prototype["onAgents"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",18076));
    CTerminalRouter.prototype["onAgentSet"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",19614));
    CTerminalRouter.prototype["onAgentDel"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",23078));
    CTerminalRouter.prototype["onSessions"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",24897));
    CTerminalRouter.prototype["onSuperMode"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",27599));
    CTerminalRouter.prototype["onKillSession"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",29772));
    CTerminalRouter.prototype["onLogSessions"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",31788));
    CTerminalRouter.prototype["onLogSession"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",33929));
    CTerminalRouter.prototype["onLogSessionDel"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",36010));
    CTerminalRouter.prototype["onLogClear"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","RQSVuuS5BZBdSxRARwS4izRMBLRxSwBoi3S1SvROiVBASmRZi1BWBlBrB3RBRbBkRZSwiQReiTiJigRXSIiPRBSBBYBuBPBDSbidicSgSiRNR2unRtSBRkisRqRWRaBLisSPiuilRPRHRUiURhSKRDRKi2RnidRhRsBXicB3RJRaRvBlikuuiGBbRiSnilBQSIBNuBBlBpR2RyiKSpRpRziJS0u2SIiLBURNiAR4SHS3RHiPR5iFShSJRbBaB8BNBMB2B2RsSJRESAi9R9RaS9BfiaiqSFB2SnRaBlSMS8iZR6iVBbiERfRtBvimiNBmBXRaBNR9B2SCBjiBR8i1SRBYBfBhS3BOSLBRBpSKRbRxROBVi9RgSvisiouiirBYSbByRgR6S8i0R3B3RLBNBGS0RaRlBlRTRWR9SyRaB1uuifBYi8BoS0RxRAB5SaSqSxR6BqikS4iJiXSxSPRwBjBOR2RpRUiFBlB0SuRwRjizRwSViTB5SaioitRCimS5uiR4BgR9SNiHi7SuiHBJBzBTRfiziNSvSBBvRZisi7SDi1RjS5BvSUScuuiSRrB4SmSTRrSxRURZSISQSxBPRCiKSwSgB4BxBhB3inBPijRxBzRvS3B9SzBDBeSfifS0iYRQi0iCSLSsRqiER4BLSPB1BxBniUi9BBSvSdiKiIiDidiiRaiBi8RpSHSaBGRvBOiVR7BaRESaSlRgi3B0SKB3SDSkS7BzuuBdRNREuRi3SJS7ibSABsSvSii2BRirS1BQRTSviOiuR6igROBJiwSURmSdiDiVBuRnRjSsR6iwSNS7iKB8BnSeuni0ipS7SeBxBWBXRtBPRnSCBbS5SoBvSVSeB9S4BmBgS5iWitSmSCBbBxSzB4RYidBWRwSfRURkSEizBbSgRXi4inRuBdizi8SoB7ibSlieisSQBPBcSvBpSeSTRpSnBdSqBeBRu2ikSgi4SoSFi1RLR5RjR4R5StBqSNSPBBS6RSR3ifitRLR6SlR8RcR3RniZB1SjSpiJiyi7RQRsijR2iqRtBNiGBlSbiuRrBQB1RgSCScRhRmBdRzi1SwByi5BSRKS5REBgSPidiMiiRZBlBTSTSsSlSkR9RiBARQRdB6S3BrRNinSEunRAuiB4STSWB6RTRCSkSjBpiBRNBgRwRviGSORqi9BZBWi3RRiZB2BRSVRsR3SLiLB8iSR0SyS8SgR0BeuRiwSlR3SNSeiKSASMieSeicSvBDR6iQS6SzRLiYi9SBRSiKSCBvRZRqB1BgSORYB8iaBESAi7RHSHiVSPRZuBSdSfijieBoBAibSTiHB6BuSoizRgSRSGBaSpRmBniou2i2ipiYBiRgBMSWSnSiiRSPimBnixiNR9BBiSRLR4R9BqSeS1iDB8R6izSjRui6iRSeRzSZBSS4BBSPSrBTRtR4BNBgB1RhR3RRRYSrBZBmSdSGBAifSOBmBjSPSmSHRUBfBWRiSziKRrBQiIibBKS3RuijBXBgBpSeRmBcBOSdB5RyBrBJicixSdS2iCiGRiiCBLRAunRZisShilSSBqi4ikikB0S8ibSNi8B4iJBqSqi6iminSNBKBeRtREBeR5iUShBWuSB4BmBUBORmSzuuSSiBR5BXidSMSWBZStBwSWRgiNiCixRbSiBEiYBwB4RbRPRgBVRbS2iguuBhRrBGRUiUirRoRsi1BBRMRgRouBBXSGSURwR5SORaimB9S1idBgisSSSTReS6i0RSBXSBBxuuSiiHRIBQBaRjBLBiiCi9ifSuSRRMSNB1BhSlBJB9uiuBRxi5R9iwS6BlSESViiB7SrSnBGBNBNBpRJuSR0RRRZRIR8iQS3ipSZSSBKSVBDBAiRilBCR0iiB8BjRrR0SdStSAReRpRnBJR9i3RKRuikRjBgS2imuBSSiIBDibi0SAiXR4RQiFRHB5BGSxSnSKiFiABqSxBtR8BJBzBlSbS0uRSBS1S6RlBNiCBVi5RpSMRXBZRcBIBUB6SWR5SVSBidBoR1BiRvBABMBhiii0SuuiRYiUSrREiFBbuRR0RJRURCRrBdBPiEBOSSimuJihRCuuSkShBqR6Sii3BkBDRCSbBTSZioStRBBKS4BaSfBrijBpSJi0i1R5iOu2iBiYiGBcRbBySwSLRFSsBNRPS6R4SfilBdR8BJRWBnS5BTRXi2S1ByiFBrSiBVRjRsi7RvuRRmRFuJR9SoBQRKRkSnSwBYBQSBiDRWBhRbRaSbB1i4SYSgi0BQiISGiDiKShiZiUBuRSiIRpRFRwiRSWRSBkBeReiGiLuSRPiuByBDBcBHiBSHiUBaBkSjShStiMBpiiRpBxicRwBCiNiHRcBvu2i4i2S4SliMi6BPiTBhBARjSMBiSqBciwi1SWRhRqR4RlBBR5BhBfS3SwBWBhRmBLRhi5iVSsSmRsS7BGiWRcBBi9igSSRZSrR7BtSJR2SZiZiCSdSbRgSdBtB3BoiYSERrBySwBbRORxS4SsSJSHRmBbBOi8SSuuiUShiBS8BhS2ShuRuRB8ihRJBIBqi5iBiKBKSPB4iRBuiURWiPimiQi5BSB5imirS2SISqRmizSZSrBtBhiiBzBJi8BmSOSQBSSwuiRhR7RbSJRbSbiJS9RzBlB9RMSdS6i5Bci7SViuStBZiJR2BSiIBdSXBBRMROBbSCBsBNB5B0BDB7B0Rhi3iyBMRpReBVibSmiVipS7RpBbBpS0REBquui2BAuJRfuRiyiliFStiFSSB8RORxSIRZSLR4RaRkRQuii3SGRhRwSYBcunSPRhiJBoB0BQSrBEiAR7RcBlRiSqB5iliGROSkSMSTBoSNieSUiliaRsRSinSVB1BfiBBfR4iASMBxiYiFRqSAiNBsSFilituuBbBzR1SDBOBCRZR5SvBrBFSeRoBIR3BEiZSRBeBQijBIShBQShiMBeSjS2BwBxi0RMSViWBwBSSuR2i3i0BpRgSninuSSRBLRAS3iUSBiGBxSIiSiyB6BoROiAi7RGR5iGBQSSS0RaBIBDSoS5iFSOBdBrR4SASQiFSrRyunSWRtB5SWiQiTinSBRtSKRqRySABPS4SCSSSASxSpR2iPBkBMSMBMBJB4Ski1RhRaBqRvRVBiSzBvRSRRiciqB1BCi0iFSjSSBSSuiYRdiAiLSWS5BWBKBNSnBcihBVixReB0BuitS9RbRwB0i7SFR4RuBBiliVixB8BeiPRSi5BLBWBgiJRZShioBhRTBjSLSIRViVRgSsi8B8i5BhRAi4R1BtBIBqi7RySCRVBLRvuSiiB2iOBQRUieBCSrR8BuRfRIRZBuBNSeB8ibBQB3iqSMiJRPiOi4RMRCR4",37815));
    CTerminalRouter.prototype["onLogTerm"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",39492));
    CTerminalRouter.prototype["onUploadFile"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",42133));
    CTerminalRouter.prototype["onHandoff"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",45660));
    CTerminalRouter.prototype["onTerminalProxyToken"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",51442));
    CTerminalRouter.prototype["onTerminalProxy"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",52727));
    const _origDestroy = CTerminalRouter.prototype.Destroy;
    CTerminalRouter.prototype["Destroy"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",55205));
    CTerminalRouter.prototype["_connectImpl"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",56633));
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

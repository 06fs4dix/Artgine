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
    return authToken ? isValidToken(authToken) : isAuthedReq(req);
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
    /\b(?:Brewed|Thought|Slithering|Thinking|Working)\b[^\n]*?\b\d+(?:\.\d+)?\s*[smh]\b/gi,
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
function _sendApprovalKey(entry, key, kind) {
    const keyName = key === '\r' ? 'ENTER' : key === '\x1b' ? 'ESC' : key === '\x03' ? 'CTRL+C' : JSON.stringify(key);
    if (entry.mode === CAI.eProvider.codex) {
        entry.pty.write('\x1b[I');
        schedLog(`[approve] ${entry.token} ${kind} codex focus-in → ${keyName} in 500ms`);
        setTimeout(() => { try {
            entry.pty.write(key);
        }
        catch { } }, 500);
    }
    else {
        entry.pty.write(key);
        schedLog(`[approve] ${entry.token} ${kind} ${keyName} sent`);
    }
}
function _formatApprovalMsgForMessenger(ctx, tail) {
    const lines = ['⚠️ 승인 필요', `type: ${ctx.type}${ctx.tool ? ` / tool: ${ctx.tool}` : ''}`];
    if (ctx.command)
        lines.push(`command: ${ctx.command}`);
    lines.push('', tail.trim(), '', '승인: y 또는 1 / 거부: n 또는 2');
    return lines.join('\n');
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
        let { type, tool, command } = _extractCtx(content, entry.workingDir);
        if (grokMenu) {
            const g = _extractGrokPermCtx(content, entry.workingDir);
            type = g?.type ?? 'write';
            tool = g?.tool ?? null;
            command = g?.command ?? null;
        }
        const tail = viewportTail(entry.headless, 12);
        const isPrompt = !_NAV_MENU.test(viewportTail(entry.headless))
            && (isGrok
                ? grokMenu
                : (type !== 'reply' && (isCodexYesNoPrompt(entry, view) || _PERM_PAT.test(tail))));
        let auto = null;
        let kind = null;
        if (isPrompt) {
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
const _READ_TASK_NAMES = /^(Explore|Search|Research|Review|Investigate|Analyze|Look\s*Up|Find)$/i;
const _WRITE_TOOL_NAMES = /^(Write|MultiEdit|Edit|TodoWrite|WriteFile|EditFile|ReplaceInFile|NotebookEdit|write_to_file|replace_file_content|multi_replace_file_content|generate_image)$/i;
const _SHELL_TOOLS = /^(Bash|Shell|RunShell|run_command|PowerShell|pwsh|powershell\.exe|sh|zsh|cmd|cmd\.exe)$/i;
const _READ_BASH = /^\s*(find|grep|ls|cat|type|head|tail|stat|du|wc|diff|echo|sleep|pwd|cd|which|where|file|rg|fd|findstr|tsc|sort|uniq|cut|tr|nl|column|xxd|icacls|iconv|xargs\s+(?:(?:-[\w{}.]+|\{\}|\d+)\s+)*(?:grep|cat|ls|head|tail|file|stat|wc|find|rg|fd|which|echo|printf)|git\s+(?:-\S+\s+(?:[^-\s]\S*\s+)?)*(log|diff|status|show|config\s+--(?:list|-l\b|get(?:-all|-regexp|-urlmatch)?)|submodule\s+status|submodule\s+summary|ls-files|ls-remote|describe|blame|shortlog|stash\s+list|rev-parse|cat-file|branch(?:\s+-(?:a|r|v|vv|list))?|tag(?:\s+-l)?|remote(?:\s+-v)?)|svn\s+(?:--\S+(?:\s+\S+)?\s+|-\w\s+)*(info|diff|status|st|log|list|ls|cat|blame|praise|annotate|ann|proplist|plist|pl|propget|pget|pg)\b|Get-Content|Get-ChildItem|Select-String|Test-Path|Get-Item|Start-Sleep|ForEach-Object|Where-Object|Select-Object|Sort-Object|Measure-Object|Group-Object|Format-Table|Format-List|Format-Wide|Out-String|Out-Host|Write-Output|Write-Host|dir)\b/i;
const _WRITE_BASH = /^\s*(rm|mv|cp|mkdir|touch|chmod|chown|sed|awk|tee|npm|yarn|pnpm|git\s+(commit|push|reset|checkout|merge|rebase|add)|curl|wget|del|erase|ren|rename|rd|rmdir|md|move|copy|Set-Content|Remove-Item|New-Item|Copy-Item|Move-Item|Rename-Item|Out-File)\b/i;
const _READ_NPM_UV = /^\s*(?:npm\s+(?:config\s+(?:get|list|ls)\b|cache\s+(?:dir|ls)\b|ls\b|list\b|outdated\b|view\b|info\b|root\b|prefix\b|whoami\b|ping\b)|uv\s+(?:cache\s+dir\b|pip\s+(?:list|show|tree)\b|tree\b))/i;
const _FIND_EXEC = /^\s*find\b[\s\S]*\s-(?:delete|exec|execdir|ok|okdir|fprint|fprintf|fls)\b/i;
const _ICACLS_WRITE = /^\s*icacls\b[\s\S]*\s\/(?:grant|deny|remove|setowner|setintegritylevel|reset|save|restore|substitute|inheritance(?:level)?)\b/i;
const _ICONV_WRITE = /^\s*iconv\b[\s\S]*\s(?:-o\b|--output\b)/i;
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
    'whereis', 'tty', 'cal', 'getent', 'help', 'man', 'whatis', 'apropos', 'more',
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
    String.raw `openfiles(?:\.exe)?\s+\/(?:query|local|fo)\b`,
    String.raw `ifconfig(?:\s+(?:-a|--all|[a-zA-Z0-9:._-]+))?\s*$`,
    String.raw `apt(?:-get)?\s+(?:list|show|search|policy|depends|rdepends|changelog)\b`,
    String.raw `apt-cache\s+(?:search|show|policy|depends|rdepends|pkgnames|stats|dumpavail)\b`,
    String.raw `dpkg(?:-query)?\s+(?:-[lLsS]|--list|--status|--listfiles|--search)\b`,
    String.raw `rpm\s+-q\b`,
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
const _SED_ATOM = String.raw `(?:\d+(?:~\d+)?|\$|/(?:\\.|[^/\\])*/)`;
const _SED_STMT = String.raw `(?:${_SED_ATOM}(?:,${_SED_ATOM})?)?!?(?:[pdq=]|s/(?:\\.|[^/\\])*/(?:\\.|[^/\\])*/[gpiImM0-9]*)`;
const _SED_SCRIPT = String.raw `${_SED_STMT}(?:\s*;\s*${_SED_STMT})*`;
const _SED_FLAGS = String.raw `(?:\s+(?:-n|--quiet|--silent|-E|-r|--regexp-extended|-s|--separate|-z|--null-data|-u|--unbuffered|--posix))*`;
const _SED_FILES = String.raw `(?:\s+[^\s;|&<>'"\x60$]+)*`;
const _SED_READ_G = new RegExp(String.raw `(^|[;&|]\s*|\n\s*)sed${_SED_FLAGS}\s+(?:'${_SED_SCRIPT}'|"${_SED_SCRIPT}"|${_SED_SCRIPT})(${_SED_FILES})(?=\s|;|\||&|$)`, 'g');
function _normReadSed(cmd) {
    return cmd.replace(_SED_READ_G, (_m, lead, files) => `${lead}cat${files}`);
}
const _AWK_FLAGS = String.raw `(?:\s+(?:-F\s*[^\s;|&<>'"\x60$]+|--field-separator(?:=|\s+)[^\s;|&<>'"\x60$]+))*`;
const _AWK_PROG = String.raw `(?:'[^']*'|"(?:\\.|[^"\\])*")`;
const _AWK_FILES = String.raw `(?:\s+[^\s;|&<>'"\x60$]+)*`;
const _AWK_READ_G = new RegExp(String.raw `(^|[;&|]\s*|\n\s*)awk${_AWK_FLAGS}\s+(${_AWK_PROG})(${_AWK_FILES})(?=\s|;|\||&|$)`, 'g');
const _AWK_UNSAFE_BODY = /print(?:f)?[^;}]*>|\|\s*["']|\bgetline\b|\bsystem\s*\(|\bclose\s*\(|\bENVIRON\b|\$\(|\x60/i;
function _normReadAwk(cmd) {
    return cmd.replace(_AWK_READ_G, (m, lead, prog, files) => _AWK_UNSAFE_BODY.test(prog) ? m : `${lead}cat${files}`);
}
const _FS_REMOTE_AUTH = /^\s*node\s+\S*remotecmd\.js\s+\S+\s+remote\s+\S+\s*$/i;
const _WEB_DEBUG_READ = /^\s*node\s+\S*browser\.js\b/i;
const _INFO_FLAG = /^\s*[\w.-]+\s+--(?:version|help)\s*$/i;
function _unwrapCmd(command) {
    let cmd = command;
    const cmdM = cmd.match(/^(?:cmd|cmd\.exe)\s+\/[cC]\s+(.+)/);
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
const _REDIRECT = /(?:^|\s|\d)>>?\s*(?![&\s])(?!\/dev\/null\b)(?!nul\b)(?!\$null\b)/i;
const _WRAPPER_CALL = /(^|[;&|]\s*|\n\s*)(?:\S*[/\\])?(?:powershell|pwsh|bash|sh|zsh|cmd)(?:\.exe)?\s+(?:-\w+(?:\s+[^-\s'"][^\s'"]*)?\s+)*?(?:-C(?:ommand)?|-\w*c|\/[ck])\s+('[^']*'|"(?:\\.|[^"\\])*")/gi;
function _bashSegs(cmd) {
    const subs = [];
    const pre = _normReadAwk(_normReadSed(cmd)).replace(/`["']/g, '\x01');
    let body = pre
        .replace(/\$\(([^()]*)\)/g, (_m, s) => { subs.push(s); return ' '; })
        .replace(/`([^`]*)`/g, (_m, s) => { subs.push(s); return ' '; });
    body = body.replace(_WRAPPER_CALL, (_m, lead, quoted) => {
        subs.push(quoted.slice(1, -1));
        return lead + ' ';
    });
    const mask = (s) => s.replace(/'[^']*'/g, "''").replace(/"(?:\\.|[^"\\])*"/g, '""');
    body = mask(body);
    for (let prev = ''; prev !== body;) {
        prev = body;
        body = body.replace(/(?<!\$)\{([^{}]*)\}/g, (_m, s) => { subs.push(s); return ' '; });
    }
    const split = (s) => s.split(/\s*(?:&&|\|\||[;|\n])\s*/)
        .map(x => x.trim().replace(/^(do|then|else)\s+/i, '').replace(/^\(+/, '').replace(/\)+$/, '').trim())
        .filter(Boolean)
        .filter(x => !/^(for|foreach|while|until|do|done|then|else|elif|fi|if|case|esac|try|catch|finally)\b/i.test(x));
    return [...split(body), ...subs.flatMap(s => split(mask(s)))];
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
function _isDangerousScriptSrc(src, lang) {
    if (lang === 'js')
        return _JS_DANGEROUS.test(src) || _SQL_WRITE_CALL.test(src);
    return _pyOpenIsWrite(src) || _PY_BARE_DANGEROUS.test(src) || _PY_DANGEROUS_REST.test(src) || _PY_RISKY_FROM_IMPORT.test(src) || _SQL_WRITE_CALL.test(src);
}
const _SCRIPT_SCAN_MAX_BYTES = 512 * 1024;
function _classifyScriptExec(seg, cwd) {
    if (_NODE_CHECK_ONLY.test(seg))
        return 'read';
    const inlineM = seg.match(_NODE_PY_INLINE);
    if (inlineM) {
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
    return null;
}
function _segSafe(rawSeg, cwd) {
    const seg = rawSeg.replace(/^\$?\w+\s*=\s*/, '');
    if (!seg)
        return 'skip';
    const inner = _stripPkgRunner(seg);
    if (_INFO_FLAG.test(inner))
        return 'read';
    if (_FS_REMOTE_AUTH.test(inner) || _WEB_DEBUG_READ.test(inner))
        return 'read';
    if (_isReadCurl(inner) && !_REDIRECT.test(seg))
        return 'read';
    if (_READ_NPM_UV.test(inner) && !_REDIRECT.test(seg))
        return 'read';
    if (_WRITE_BASH.test(inner) || _REDIRECT.test(seg) || _FIND_EXEC.test(inner) || _ICACLS_WRITE.test(inner) || _ICONV_WRITE.test(inner)
        || _IPCONFIG_WRITE.test(inner) || _ARP_WRITE.test(inner) || _ROUTE_WRITE.test(inner) || _IP_WRITE.test(inner)
        || _HOSTNAME_WRITE.test(inner) || _SYSCTL_WRITE.test(inner) || _JOURNALCTL_WRITE.test(inner) || _DMESG_WRITE.test(inner)
        || _WMIC_WRITE.test(inner))
        return 'unsafe';
    if (_READ_BASH.test(inner) || _READ_OS.test(inner) || _READ_OS_SUBCMD.test(inner))
        return 'read';
    const scriptVerdict = _classifyScriptExec(inner, cwd);
    if (scriptVerdict)
        return scriptVerdict;
    const sqliteVerdict = _classifySqlite3Cli(inner);
    if (sqliteVerdict)
        return sqliteVerdict;
    if (_isSafePsExpr(inner))
        return 'read';
    return 'unsafe';
}
function _classifyBash(command, cwd) {
    const cmd = _unwrapCmd(command);
    const tool = _bashTool(cmd);
    let sawRead = false;
    for (const rawSeg of _bashSegs(cmd)) {
        const r = _segSafe(rawSeg, cwd);
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
const _PERM_PAT = /\ballow\b|\bpermit\b|\by\/n\b|\[y\]|\(y\/n\)|(?<!always-)\bapprove\b|do\s+you\s+want|proceed\?|would you like to run|press enter to confirm|esc to cancel\s*·\s*tab to amend|yes,\s*proceed\b|no,\s*reject\b/i;
function isGrokPermissionMenu(text) {
    const all = [...text.matchAll(/1\s*\/\s*(\d+)\s*:\s*select/gi)];
    if (!all.length)
        return false;
    const n = Number(all[all.length - 1][1]);
    if (n < 3 || n > 5)
        return false;
    const opt = (i, body) => new RegExp(`^\\s*(?:[│┃|][\\s|]*)?${i}\\s*\\([^)\\n]*\\).*${body}`, 'mi').test(text);
    for (let i = 1; i < n; i++)
        if (!opt(i, '\\bYes\\b'))
            return false;
    return opt(n, '\\bNo,\\s*reject\\b');
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
function _joinBashCmd(block) {
    const lines = block.split('\n')
        .map(l => l.replace(/^\s*[│┃]\s*/, '').trim())
        .filter(Boolean)
        .filter(l => !/^This command requires approval$/i.test(l))
        .filter(l => !/^Contains\s+[\w\s]+$/i.test(l));
    if (lines.length >= 2)
        lines.pop();
    return lines.join(' ');
}
function _extractCtx(content, cwd) {
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
    consider(/(Read|Write|Edit|Create|Delete|Modify|Append|Update)\s*:\s*([^\n]+?)\s*\n\s*Allow access to this file\?/gi, m => {
        const isRead = /^read$/i.test(m[1]);
        return { type: isRead ? 'read' : 'write', tool: isRead ? 'Read' : 'Edit', command: m[2].trim() };
    });
    consider(/Requesting permission for:\s*([^\n]+)/gi, m => {
        const { type, tool } = _classifyBash(m[1].trim(), cwd);
        return { type, tool, command: m[1].trim() };
    });
    consider(/(?:Bash|PowerShell|pwsh|Shell|cmd) command[^\n]*\n([\s\S]*?)\n\s*(?:This command requires approval|Do you want to proceed\?)/gi, m => {
        const command = _joinBashCmd(m[1]);
        const { type, tool } = _classifyBash(command, cwd);
        return { type, tool, command };
    });
    consider(/\b([A-Za-z]\w*)\(([^)\n]*)\)\s*\nDo you want to proceed\?/gi, m => _classifyTool(m[1].trim(), m[2].trim() || null, cwd));
    consider(/([A-Za-z][\w ]*?)\n[─\-]{3,}\n([^\n]+)\nDo you want to proceed\?/gi, m => _classifyTool(m[1].trim(), m[2].trim() || null, cwd));
    consider(/Do you want to make this edit(?:\s+to\s+([^?\n]+))?\?/gi, m => ({ type: 'write', tool: 'Edit', command: m[1] ? m[1].trim() : null }));
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
    if (_PERM_PAT.test(content))
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
    const isPureAssign = (s) => /^\$?\w+\s*=\s*\S*$/.test(s);
    const stripAssign = (s) => s.replace(/^\$?\w+\s*=\s*/, '');
    const segs = _bashSegs(cmd);
    if (segs.length <= 1) {
        const trimmed = cmd.trimStart();
        return matchesPfx(stripAssign(trimmed)) && !_REDIRECT.test(trimmed);
    }
    let matched = false;
    for (const rawSeg of segs) {
        if (isPureAssign(rawSeg))
            continue;
        const seg = stripAssign(rawSeg);
        if (matchesPfx(seg)) {
            if (_REDIRECT.test(rawSeg))
                return false;
            matched = true;
            continue;
        }
        if (_segSafe(rawSeg) !== 'unsafe')
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
    if (mode !== 'cmd') {
        const _svrAddr = CServerMain.Main().GetServer()?.address();
        const _svrPort = typeof _svrAddr === 'object' && _svrAddr ? _svrAddr.port : 8050;
        const _svrPath = CServerMain.Main().GetPath();
        const _svrHost = await CServerMain.GetAccessibleHost(_svrPort);
        CAI.CreateRole(mode, undefined, _svrHost, _svrPort, _svrPath);
        const built = await CAI.Terminal(mode, mcp, model);
        const cli = built.args.map(_quote).join(' ');
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
        term = ptyMod.spawn(shellCmd, shellArgs, { name: 'xterm-color', cols, rows, cwd: spawnCwd, env: spawnEnv });
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
        updatedAt: now, lastMsg: '', lastContent: '', _inputBuf: '', _escState: 'none', _csiParams: '', _inPaste: false,
        _cmdSent: true, _permTimer: null, _permDeadline: null, _permSavedContent: '', _permStableSample: '', _permDeferCount: 0,
        _busyTimer: null,
        createdAt: now, workingDir: spawnCwd,
    };
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
const HANDOFF_MARKER = '<<HANDOFF_DONE>>';
const HANDOFF_DIR = path.join(CAI.AIDir(), 'handoff');
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
                    'Do only the task you are given, then report the result. Do not dispatch work to anyone else.',
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
    }
}
function _teamBuildTask(teamKey, startedAt, goal, agents, limitMin, autoAgents) {
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
        '',
        '[How to work]',
        `Dispatch : node ai/tool/work.js push ${teamKey} <agent> <task>`,
        `Check    : node ai/tool/work.js check ${teamKey} ${startedAt}`,
        'Watchdog : node ai/tool/work.js watchdog',
        'Collect  : node ai/tool/work.js get <id>',
        '<agent> must be the exact key string listed in [Sub Agents] below — copy it whole, character for character. Never abbreviate, guess, or reconstruct it.',
        'If <task> needs a line break, type the literal two characters "\\n" instead of pressing Enter — a real Enter submits the command line early and corrupts it.',
        'A dispatched task is delivered to that agent automatically. Never open a terminal yourself.',
        'Dispatching to different agents at once runs them in parallel.',
        'Multiple tasks for the same agent are delivered one at a time, so dispatch them all and wait.',
        'When a task turns done, read its result with get and feed it into the next task.',
        'Pick the agent for each task by looking at the score and traits above.',
        '',
        '[Stop]',
        'Any task turning "failed" -> stop the whole team immediately. No retry.',
        ...(limitMin > 0 ? [
            `Stop the whole team once the "elapsedMin" field from "node ai/tool/work.js check ${teamKey} ${startedAt}" exceeds ${limitMin}.`,
            'elapsedMin comes ONLY from that check command\'s output. Never substitute it with a task result, an answer value, or any other number you happen to see.',
        ] : []),
        'A dispatched task can silently die if the sub agent process crashes or gets stuck (e.g. stuck waiting for permission). If that happens the task stays "working" forever and check will never show it as done/failed.',
        'To catch that, periodically run the Watchdog command above — it detects any task stuck "working" whose agent session is no longer actually working, kills that session, and resets the task back to "ready" so it gets redispatched.',
        'Repeat dispatch -> check -> watchdog -> collect until the goal is reached.',
        ...(autoAgents.length > 0 ? [
            '',
            `Whenever the team stops for any reason (goal reached, a task failed, or the time limit passed), run this as your very last step: node ai/tool/work.js team-end ${teamKey}`,
            'That deletes the auto-created staff listed above. Until you run it they keep running and are restarted automatically if they die.',
        ] : []),
    ].join('\n');
}
async function _ptyWriteChunked(pty, data, chunkSize = 256, delayMs = 15) {
    for (let i = 0; i < data.length; i += chunkSize) {
        pty.write(data.slice(i, i + chunkSize));
        await new Promise(r => setTimeout(r, delayMs));
    }
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
            cur = line;
        }
        else
            cur = next;
    }
    if (cur)
        segs.push(cur);
    return segs.length > 0 ? segs : [text];
}
async function _submitToPty(entry, text) {
    const wrap = _needsBracketPaste(entry.mode);
    const segments = _splitSegments(text);
    for (let i = 0; i < segments.length; i++) {
        const payload = wrap ? '\x1b[200~' + segments[i] + '\x1b[201~' : segments[i];
        await _ptyWriteChunked(entry.pty, payload);
        if (i < segments.length - 1)
            await new Promise(r => setTimeout(r, SEGMENT_GAP_MS));
    }
    await new Promise(r => setTimeout(r, 300));
    entry.pty.write('\r');
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
        if (target._cmdSent && Date.now() - target.updatedAt < BUSY_IDLE_MS)
            return;
        const isRetry = order.requester.startsWith(RETRY_REQUESTER_PREFIX);
        if (!isRetry)
            gAgentRetryCount.set(order.assignee, 0);
        await CWorkOrder.SetStatus(order.id, isRetry ? 'done' : 'working');
        let combined;
        if (isRetry) {
            combined = order.content;
        }
        else {
            const agent = agentByKey.get(key);
            const lines = [];
            if (agent) {
                lines.push(WORK_ORDER_BASE_COMMAND, '');
                lines.push('[Traits]', ...(agent.traits.length > 0 ? agent.traits : ['(none)']), '');
            }
            lines.push('[Task]', order.content, '', '[On Completion]', 'When finished, run the command below to update the status.', `Success: node ai/tool/work.js result ${order.id} done <summary>`, `Failure: node ai/tool/work.js result ${order.id} failed <reason>`, 'If <summary>/<reason> needs a line break, type the literal two characters "\\n" instead of pressing Enter — a real Enter submits the command line early and corrupts it.', 'The task will remain in "working" status until this command is executed.');
            combined = lines.join('\n');
        }
        target._cmdSent = true;
        target.updatedAt = Date.now();
        _recordInput(target, combined);
        target.pty.write('\x1b[I');
        await new Promise(r => setTimeout(r, 500));
        if (!isRetry) {
            target.pty.write('/clear');
            await new Promise(r => setTimeout(r, 200));
            target.pty.write('\r');
            await new Promise(r => setTimeout(r, 1000));
        }
        await _submitToPty(target, combined);
        schedLog(`[WorkOrder] id=${order.id} assignee=${order.assignee} → SENT`);
    }));
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
            entry._cmdSent = true;
            entry.updatedAt = Date.now();
            _recordInput(entry, combined);
            entry.pty.write('\x1b[I');
            await new Promise(r => setTimeout(r, 500));
            await _submitToPty(entry, combined);
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
    const ECHO_WAIT_MS = 800;
    const RETRY_GAP_MS = 4000;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const squash = (s) => s.replace(/\s+/g, '');
    const alive = () => gSessions.has(entry.token) && !!entry._pendingInitPrompt;
    void (async () => {
        await sleep(1500);
        if (!alive())
            return;
        const prompt = entry._pendingInitPrompt;
        const probe = squash(prompt).slice(-24);
        let attempt = 0;
        while (Date.now() - startedAt < GIVEUP_MS) {
            if (!alive())
                return;
            if (!(entry.clients.size > 0 && Date.now() - entry.updatedAt >= IDLE_MS)) {
                await sleep(500);
                continue;
            }
            attempt++;
            if (attempt > 1) {
                try {
                    entry.pty.write('\x15');
                }
                catch {
                    return;
                }
                await sleep(300);
            }
            entry._cmdSent = true;
            entry.updatedAt = Date.now();
            try {
                await _ptyWriteChunked(entry.pty, prompt);
            }
            catch {
                return;
            }
            await sleep(ECHO_WAIT_MS);
            if (!alive())
                return;
            if (!squash(viewportText(entry.headless)).includes(probe)) {
                schedLog(`[InitPrompt] swallowed by TUI (attempt ${attempt}) ← ${entry.key ?? entry.token}`);
                await sleep(RETRY_GAP_MS);
                continue;
            }
            entry._pendingInitPrompt = undefined;
            _recordInput(entry, prompt);
            entry._cmdSent = true;
            entry.updatedAt = Date.now();
            try {
                entry.pty.write('\r');
            }
            catch { }
            schedLog(`[InitPrompt] submitted (attempt ${attempt}) → ${entry.key ?? entry.token}`);
            return;
        }
        entry._pendingInitPrompt = undefined;
        schedLog(`[InitPrompt] gave up after ${attempt} attempts ← ${entry.key ?? entry.token}`);
    })();
}
async function _waitForHandoffMarker(file, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(HANDOFF_MARKER))
                return true;
        }
        catch { }
        await new Promise(r => setTimeout(r, 1000));
    }
    return false;
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
    CTerminalRouter.prototype["onStartTeam"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",3699));
    CTerminalRouter.prototype["onTeamEnd"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",8616));
    CTerminalRouter.prototype["onSchedules"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",10829));
    CTerminalRouter.prototype["onScheduleSet"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",12631));
    CTerminalRouter.prototype["onScheduleDel"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",16232));
    CTerminalRouter.prototype["onAgents"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",18202));
    CTerminalRouter.prototype["onAgentSet"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",19907));
    CTerminalRouter.prototype["onAgentDel"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",23316));
    CTerminalRouter.prototype["onSessions"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",25366));
    CTerminalRouter.prototype["onSuperMode"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",28306));
    CTerminalRouter.prototype["onKillSession"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",30338));
    CTerminalRouter.prototype["onLogSessions"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",32267));
    CTerminalRouter.prototype["onLogSession"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",34247));
    CTerminalRouter.prototype["onLogSessionDel"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",36394));
    CTerminalRouter.prototype["onLogClear"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",38545));
    CTerminalRouter.prototype["onLogTerm"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",40312));
    CTerminalRouter.prototype["onUploadFile"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","ibiEiWBYScSBSsRai6BySLS4iLSKBFS9SrSviASHu2RAB2BWBHSnBkRcBgRtBRiiSKRAR6StRBitBTSQBhShBPS8iRiKBQiRRdRVRoS2RCSySdRARduSRNBLu2SWRlSVu2iOi9SIiriFiiSES3iXB4RUu2Rfi9RgSoSKioifR1uSSxShiUiSRLSgBwS3RtBDBqRhSGRURmuiBRBSRMBciRSLB8iOByB6B1BBR8SNidiWBVBKitRhinuiBDixSTB6SbRvi7BnuSRuRpRuR2ROBvRcR8iwRNS8inRGBJR3RnSdRDSMBBBIBOSjBRiHBVSSilBrRFSBSvRlifSVSpSZBMS9BHB8RaBriIRABNRySFigBbi0R7uuSmB2izSKRWitBLBgRTiEBRRDRjRkS5SwB6SVBFBbBJu2SbBHBoSSB5uuS9B9S4BySTBCRmuuBVBEi8BMB1SsiNRXR0iTSnS4SiRDuSi1iIidS3BtRQRBRNSlBIiqihB2SVBMSKiiRYSvB5BSBbSMSGiVSCiLSTRaBdRQRBBOSfRAB7SzSbikSUiDBYBni3ReilScSmiVRzi8RyB7SLRKunBCBbBqBWBXSGRNBHSSiwiESmR5ivRjiKSZS7iXi5i9RGBOiti3S1BhRMiaRcRRBQSxBfBVBVBARniwihBJBNBISoB2BfS1SBSoSqS5SLiiiFBoR7RpinBsBLiLuRihSlixS8SUBaRGi5SeShBKBtSESbiLBxS8S6RdSTitiMBnB7BkiNSsSPBaiNBIBzuBSGR5RtSqSYBtSzS2isRDSRSEBCidBNR9Srivi6i3irSfB6BKSDSTS9BES9iMSQBRRwR3SBBDSNBNivBOuiBOimSriSSwioSdSSSEBJiwuJRDR1uJifReBzBkRvisipitBLSCinSwBNBjRLSKRtBERxBmBLR9B3i2iJuSilSbSjBmRduRRDRqBmixBTBlRHSURuR8uRBKRbuRRFSZSvRTBNBVBDi5R3iSRtRhiwBQuSiuRtSbiCS1inSVijB6SYBLRVB2iMiJiERRRwR9BTSfBZRtBduBRci9ieB9R4RcRjiTRHSNS0STSuR0BGiDiRSliwSsSwSRBARaRdBxS5BIREi2RmirRIBNuuBoRVuJiTiciaRSBISriEiTiHBuBQSJRhiGSFRJB8ixSwStSrRfiCRJi1i5ipRVRvBWRxRXRHi0SdRfS2BmSdiei9SlBeuiiySzR0iKigipi2R7SLigSeSeiLBlReS3BhBcB9BDRmu2imBGRFibifRERjSGRgBRStSQR6BsRwBcBsS0SoiBSXRniKBqiQiyRDiuS9B5ROB9SySgRESNipR4SSBdB1B4SGS8RXiJSGR6RvBbS1SoBLRoBZRqRRuuSQBBRTSWRUixSgRDRRRKikieiHuiiaR2RRRSR0BjiuB8BgiuicifRqi6BrS3RoRSiyisBcicB0RmSWidBfigRSSAiGRCSnSUR7i4RHRSRzRVBKi1iWSkuSBhiqB4SWiwBiB0BIRnSVijRBSTShSgiqimBhRgRcRuRFB1SSiIB8RfiwBZB0SGR5Rli9BkBzRTiABcBiBNSEBpRJSGunieS8RlRAiRiKSxSHiARlidBLSqB2RySDB6S0SdSrRQSGR2iUiKuRiJiYiqBXRtB8BWBGi5RPB6BdSeigSdB9SQSgiJRhRtBpRRinSRiHRSB8BJSgR5iHiaSHBrBJRZSuBARwSFiPBDBxSGB1BviYBWiHSdB2BCBxR0SPBwSPS2SFBWSSi1B0i0RZBkBkRQSQSki5BeRiBPRhikBoR3SviNSBBtRiB0RJSzSBiwRCSXRQSciCSJunByiPSaB0RWScBDByRNizSyS7RjScBRBfS9iCSBB6RuB6SKS8ilBVRLS1RBRMSmBIBNibioikiMRRiERYB2S5RrSIiniIBnBaBnB9S3iXihiouiSxSUBMBYRDBpiJiUiCRhiHiNBZBTRABABuRNB4S6SDR8uSSciiSIBABaR2RrBWBbBvRji0icR5igRCReBESgRcSvSYBhBPiJi9RJirB4BlB3RyitBLSLBOShBIiNivBFSDRISJRkS7SpBAS9iFiTS1unRIicRjSoicRMiiSKRkicBQSfSSRjiTixRHBjunBCiJSyRYR9icBHRNR9B0iPBrB3iWSSRYSXBwRjiPSPS3SESwBdiqB5iBRdRjSkuuieiHRsijRciKRqBTRUBhiARViyiPSJRNRzSWi2ivBlSQi7R7BwRxiwSgB6iKSVSISASiBLi6SQiORBiwBxiliJRhS0i3BSBPi0irSCR1R0u2iMB2iZSuBZRjiXSbBqS3BbiSuSi6BBioB0SMReikigBQBKi3BBRaB0RSSiB8BKRmBeBASJRNRyBsBXBdRbSAB8iSBPBRRBBcR5RuS8BkRcSbS9B6BERVRqRtuuiiiOBLR3SvRVSDiJB8RQRDiZSYRlSbSSiMBOSMiEBTSfiXSABiRjixS0iCB9BDBqizSfS9BZSJBFiNSdBouRiEiViYBsBOSFSriuRxSfBsBDBritiER3RNRAiGBWRBS5S1ScBUi8iFBYi1RIilSISOSNRVRiieSfSEByiGBRiduuSMicRIRfBTBDB4iASnBsS1BgSYuSBLSKS0RTR9B7SzRWiPBGRISYRHBDioixiQRpREiQRFRdR1BBRDBPiaiwRhBFBkRFBxiXRCBYSmB9SXBIB8iVirRBRsSVSzRDiDBJBDSyRpSYBWSYRABnR6BWRzBQRWBrRpReRRRViXBMRrBiBFieRNROBTSJiniaRXiwRCSARPu2iRBCiQRqRHS9uJBaSCiyRsRHimSqSOBXiticieuJBUB3RuBUiiiCRZiAR3inB5SmSfi9R5RVSQBdSbRqRnREuuSKiDRUStReRCRpBjBjB9RuBrBcB2BqBtRTiOSFiIR6B1RyijiUiJB5Rci3SZSOSeSqRBiuBRBkSfRiBXShS0iQRnS5STBvSYicizSLBruuBhRgRbSNSQiDirBFRjSIBPS5RpSFSCB0SeiCSORARTi1RARNSLiuiiRoiqiURZBsRySdi2BmRRReBdSrBkBAiaiNirRbBxSIRgReBuiVRURaSURWikR8uSSriAiziXiuSDRSB9BQiRiSSguJRrSeS0BoSARdBnS4RkBsiYiWisBYSpSEBKBGBUiOSwBURtSQSNB2SGiuSqRoBfSoRLSlRdBMihReRxiRSeigS7S0RwiNiCiBiEBQSxijSISBi7RaiTRqSvR6SmiuS1BaBURjRYS1S9SdBgBJi2SpSWRRBdSpi6SDSsiDBER9SZiXSvuBS0ixS8RJi9RqiCSSiZR0RMBjRaRsSRiYuSBKBuiuSCiWSmRWinRbBrRZSPi0BEimRtSDBpi5RKRJR4S7ixSSRXSARLBBiHSABiSYuuBqSJSeSgSniVRmROSIi7uiiniKi3iISGSgiwRJRbBKBIiJRFRZR7BIRLSaiBiGimiGigBtS7B3i3RTRFibiqRaB3RdRnisRXBCBhBeBJSdB1SOR5SlRUSmRmBCSzBWSnRzSBBeiYiFBDuuBdioRiRPSdRwiiSdiaSpBDRbRWBluSRiilixSyi3BGSVSDR7iQBQSmRjBMBrSwRviGRKBxBMBWBkRKBLSXuuSAiTBrBFSFiaScS6iAR0i6B0ipuiiCR1BiiKR8RHRzitS4SXBJiViNR7SbSmRnS7RuiHSpSPR0iji9SzSXSbRyRERMStB5SeBPBhS6S1iTSvi0uRSrSARyRWSnBGR7RGBWuBBHRTiEBSRNRWBJijBtRJRORdiIRRRGB3BwRxSTuSizS5RAiqBxRoRERjSKR8iaRSR9BWSKRpiUiWBMS2SriNSkSWBpRsiURmi5RyRcSGRvRkBji1BeSzizigR4uuibBzRaiyBFiUBPSbBziWRaSbiWibSUivSYR9S9BfSYS4RqSDuRBLBSRKS1B1iTSJRyivBFSCiSSQRaS5RpBnScBwRxRBRgirREBciTRiB3i8SkiNRFi0SsinScSxSnBmSkBOinitBMuiRvRiRGiZS1BHSUSXivuBBNiUBriWSsB7SciLRwSrRCiwRXBqSUirSni7SsBjSNuJRaB0BqRTRBScipSMBhSIBHiBRYRIiHiJiMioRTRKSgBMRaSHS9R2ShRliOiES0iMRjS0SkSJBfi8iMSMiqiXS5iBilSFBrROB2B3BcSsRcStSHRlBQBsRRBmBWRuRrikSmSsB4SjiYSmi7BkiZBfBQSwB1Rhu2Sri9RPR9BtSYRZRYBTilRXiMiTR5BIBhuRBXSkuiRcuBBzSsBNBuRBB1iEBIRqiGuiSTBBuBiwiVRNuiSRRlBJiSSLiTR2RvRIB6R0BkB5itBqB1BrBwi2uJBUShRPSouuSCBxR8BMRSRDSERcBKuuBaBLRNunRZimiXRnRGBoSyuJB2iqBaSHuiBIBlRgisS2iaR1irSbSRRLitBWBWSvBmS9iASZRFRZB7BBi9ShR0iNBDRORBB1R7RvRmiISASjSGiduiS0RXRRiBRVSmSHS8iCSWRLiFR4RSSgREihiWRnSUBRBaimikBXSKiei9uSSYiXiJS6RtB8SoSoSSSTBbSFRVBNSGi5BqRtigiiRyBCSqiCScibuuiPS2RBRiSsRWRuB9iCBUBZiEBXiHSlBZSSR6iriYRTRpS9ivSURyRKSfiJBMR6ixSbBpSBB8SIiHBLR4uBi5RZi2iiBVBpi6S7iNiQisiJiPBBR8RARNBEiRiLSKinRAiLinBsB1R1B4SyiSBsSySdipS0BABoSkSRBtBOBbSyiHB3S3ShRDSzivRrRdipSsSZRVRFBCRxijBLuSSbReSMR1RsRFiSB7R0SxSCBWR1iRBFSMRDiARPBaRSBLilSUSjBqBfiJRyBwiaiBiySPiJiNiquiiwBfBlB0BsSpBxSgB7R8iBRxRTRkSDiOScBRBmR5BpSliKS4i8BvRhR3iiSvRricBPicStBkuSSyRsBziRS8BeSQSUiBSZB0SQi9SaS5B8RQunBrBhBqSTBeB6BdisRRiSRNRkRDiFijivRNRsRqSxS0iNB5SfSRBvRmRcSUBRR8R3REB3RjBRS0uuRWSdSQSqSBSHS9RGRoRxBfRXBrRVSgBmBWSOB9BWRSRoBHRLiiSqSMR6BkijBEBoBiiOSgi3iFBJSWBZRyiWBMRZBFRvSziESXBJBKibSxRXSEBRiqi4iPiHRrBeBuBVSjiMiKi9icBNSOB5RiBsuJSHBhBxBlinuuiXSXBDR5iMi1RSSUSTBaRKSpBIRtiOBkBjRYiNSfu2B6BMBVBgSyB4RESJSqBcBhuRSDRNBfR0SaS7BaRqiXiYSWRUBGigBdBUSXSBSWiARMSES6S3R6iBi7u2iyBsiFStBiRHBMRuS6iwRRRYidBFBxi7u2R6RZBXRjB7SyBoS3SAitiEiAB6BuiDBsBHS1BhivStRVBxRTRBSNSLRKR3ifR1RFixS5S8RpiTicBVBIBnRGiTBPiuSXiJiFB5iHRYRzBkS0BESaiViBi3SWRDBNRpRNRLSjRQunB0BLShiFByiaSzSqixBLuniuSJRuSOS4STieSGRYiHBsR0BUSkBPS1B6iUi5BGSqRwiCRpRIiNS5RYBwiySpidB8Bdi7SdBGibiZi6RQR6iJRHRbiMSOSSRxS8SlSyunSeBER5SESEiLSYSviiRdikRTSrSCRMiJBvSyiYSgS8SviaSnRsR1RhBiBKiqu2RHStSRSPSiRkBRR1SLBqSrBdSPB6R3B2BwRHi2SnScRFimREiVRkBZBrB9B3SyBiByiYBpRERWB0RcRdRGSBS9ShiGSJSUiLiTiiSNSsRLiFBIS2SuRYBFSlByBTBzinB8SaSSRriDRaRQuRSuRWiVuBBQSLBFRNiSRKRwRfirShBUBSSnBvBZi2iXBRSGByBeBfBtS0i7iTSOSXRhSBi3iOB2Rei6i2RDBOR6RpiQRgBQi5BqBYBOBXigiJSfiYi9RpR0iGRNB1BJSuSlSSRvRASvioioSEBAR0SUSgBORyRFB9B6BkuSR3B7RHSFiDSJi8RmipRpSWSaBYRKi5BuR1BqiXB3BbR6R0StS1iRR7SuB4BlBqROSvSyi5Ssi0iYRaBtR9R1SsiciiReBEiTBtiouSi4SKSoSoSdBhSgu2ivi3iAB6i2i8RViMRqRGBPSTRVBdRQRcStRSRkSLBsipRLRCi3BTBORjBwBLRtSZiaR5iSRTSTSMB4ilBdRVR8BqRQRWSgSYSPSPiuSfRTi7iWSERJB4SSRqBsRGSHRpBsRqBTBMBGSQSuiOBTiFBKRRSMSAixivRtSeRrRsBMBpuJiiR0BaSeiPSmSTS0iiiWRvSJBwS8SySQieRlSOBkiiByBiRFS9i2iPirSoiFRliWB4RjB1ScidiPBlRFBwiUB0SRizByRwR5i3SCixBGirSrBdSXBOiCRrSKSMBRiVB8SWRQi0SERWiBR3RoBbiUR2ixShB1S6BpiGBHB4idRfi7",42977));
    CTerminalRouter.prototype["onHandoff"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",46240));
    CTerminalRouter.prototype["onTerminalProxyToken"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",54698));
    CTerminalRouter.prototype["onTerminalProxy"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",56016));
    const _origDestroy = CTerminalRouter.prototype.Destroy;
    CTerminalRouter.prototype["Destroy"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","BwBcRIRIBsi0iYi0RtRERNi0i1iFSIRbSkBTigR8iERHiuiYBjuJRKRZSrRgBQBIRVRnB2SMS3S0RuShSERiSSieSWiXRnBqiPRCSOSUiMSTSSSISIRlRSiUiYBsB3i5ROBiBRBuiEBDBSBrBTBmSMSaRJieBjiTB1RhRfSeBsRwR3izBdBSBUixSwuBSuS6SuSmiRBwRQBASbSWBCSPRginijRlSIiXi7SXBaScSVRiB4BURtBlieRNBSBXiUBLSyRdiNRCRRuiRIuSRpicBNSOSvR2RfRHuuSFiPRFB2BfSMRtSiRnB9BpiYRjRxBmR9B7RwRBi4RXuRiYBxSfSKR7BqBmReiriRBaiOB0SWRHBei7SEiiiOSLi7RyBXBliIBMRRBaBHBxixunSISRR9uSRyi8SLSUSuBmuRS5unBmikSbSmSHBTBnR4BCB1itBESOSwS5SgRYBKisRhSeRriDSgSiSmSiBjBRR0SJBHiEiVBciSBJBCB9R7BHBqiFSbRWByiaStRxiLi9SURNB8B7RaRJRbiRi7SeRnSzRGi8BAu2BWRTiXSlBnRoRlBXRBSPiJizRkRZRVRDRhi0RfRYRjixBzBzu2RTRsRbSzRhi8RxBMi8SaRBS8iPiFBOBti9i8Sgi3iFSsB9S1SZSxR8BfiXi1RXRrRHSuSMBuRCBIRQRyB7SRiSixSWBiRei8SCigRNSnSARhiwBoRBSrRlB4RBS4ByR0SySjS0SqSnSzSbSpSLiZRqi5RZSgiCSIi1RyRgRwB3uiiOSKRaBRBVSqRhBIidRBiXuRShS8BSSnB7BkBdB3iYiZRpRui1RXR5iERDu2RJB5ikRqihiPu2BySeSQSDSqBzB3SYRpSHShiLiRBRiRBZRYBkRDR9iPBBBaSlBzRpi8iVSlByRgRTSKRbSWBEB8RPiASmS5iHBsBHBfR7B2RTRWSdBmiKBlBYi2B3R8uJSNBCiuigS4RXiqijBhigSMS6S7BsSpBKifRniIScivBQShS6SgReiniki2SySGBnSNR3B9RQBdSMBwSLB2RKu2BxRwRpBLijRiSmi0inRgSaivS3BMSZBAR9iCi1BcuuBeiYiTiNRNiNSFRBSKR7RdScSCRHi4ikiISrSHSFRdB0BxBViuirSKiViURaBDS5BcR0BVifiSBCSkBzRfSOiUSrBBSgS0ibiFiXBeSeBgSuSHRrSNShSsSpi5SWB4SNRfS3R8SGimS3RwBhi6BJBVB0BcSPiUBQBpR1RvRSSzSmiui1SaBSinRIR7BgSxSTBOiIBvBiSiBNSxR0SVuiB9SWBtSXRUSbitBQinRruJSJBQiFisBou2BQBHiqBkBRBEifB0SjBHSuBABBSPixBiSIRARgigimSnSfRjR6Sbu2ifRqRoR0BbSCBWSQiCi9SuSlS4SDS4iFirBLBMR3SEBWSQiyu2ivR9RhiOiLBIBIS9SsidS9StRyiOBJSrRXRSRLiOiQSwSISqBMiVS5BYRaBkisiSiVR9BkSiSNBCBViNRXRPRlSFunBoSTSRBXiBB5iLBSRkS0ixRiSgSqS5SJBfR6S2BZBQBkB2RbR3Bni0i8BoBCSdRbiaSfBkRMBUi3iIicBUBhSDSQBhREuRBVikBriViPiHioB7u2BkB8BvB0BLiOSWRuRLS1B8iMRRBABfREBjSOBbRTB4iyi2RZRpBTiTRRRLRAB3BSBfiSiBuBBDRQRxSmRgSDipiFixBPS7BvBeiuSbRpBxiNRnRfS7RQRfi2R1iERRBpBdSpiaRxifRiRQiHSABVRRB5RgiGSbiuBei1i4S7i4iNi2BXBeBUBHBdReS4i1BvB5RzS1BkiFihSZBHiNiXS8SdSWiHBgiJBMiQiRR9BFSFRpRgS1SvSpiWR2SuiYuJSfSoBMBCSfiyBkijiNSSRSiUBxSviIR6BvBNiWSni0uBuRBkRTB1SOiIiABuSSRsSZS0RcSnBTRxBQuiiJSrBNBsBZBDSQRkSOROunB7ijRvBdikRhiaSxBqBrSwRhBYRbiGijR0iGROSCiOSSRgRJiHixiFiViISKRTunS0ikBgB6BPuuS4uRBIBRBBiFiFR4SnRwiZRESkSdSKSrRwSgB9BTRRRwBGRXScB9RdBDBbSvS8RIi2SsSMSmioRgBzRtBsSqi8ihSYShB6SBihSdBLRiBcSYRkSfRziXRtBRBBBeBjR2RdSrSvuRBBiCRbSxi4i1RWReR4iORJinSaiLiSRnB5iLBFBFSpR8BgitiPRqiASuSOiQi2SUiqSRBORjS8i3BvRviAiXRQifS2iTu2SqSDBaRYR6R0RLiGSCiCSdBMStSkB1iuRHiMigBwBtBlROSZunR4BzuSuiunSTSnB8RBu2S2uRSLBWRkRURqR9RRSdSJi6iXRzBJBeSfiuiviKi1iCiiR2SSRLuniQSQRvRvBjBrSER9iqBtBeBbSZBWiPBFiUB9SgRhBxSyiGRyRORHB3RjR7i7RZS5iDBWBxSNi2i5RRR8SnSrB4SwBPiRSjilBvBvBSiKBuS5B7BlRES9R6BIiLS7igiBBoS7SFROBRiPBFSziSSVR6BmRMShBzRMBSRUiaisSaBWiaBzBXS9irRYSzRZBeR6iZRQiSi6RqRoRNBfRCSDRtiNicS2iEiPRFRnBeRYBbBPRGREBsRruSRmSuiKi9BbS6BMSyB4RQS9BGR2BYBLinuRRtiYSFRSSniSRLBDRrR7BaSARaRPS5BTisBtRdiSBJBvBCi5SBB3iuBzSwSHB3RkSBioSZBGBxSaiIifiHRFSdRsicibivBBSQBlStS7BiRKi8i5S7iuiyBmBSBTiDRhSWBBRPBNiqBMikigieRGSYRauRiKB3SFSdBCiYi7BbSziaiLBpBTi7RMiPRXB4iGSVS0BCSPijRNSURaShiPBPBh",58308));
    CTerminalRouter.prototype["_connectImpl"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","imBMSTB6SzRWS8uSi3RGS8iLR3StSgSmBpBnB5S2SpRFi0iHi5ipRDRyBYiABMiABMRnBYBaBsSxR5SFS9BXBVRLR6izSlBeBLSuuRRmB2SjiKShirRrBSRjRUSMSWSKRjBbiqBcimiWRkRABsSASWRpibSYRWRLicuiiYi4BUB5RjS7R7BYiTRYSfS5ShBBSERTRmihilSHRvR2igicBbifiGS2SoivSgRGiMiFBYBcSRROSFBbBRi5Rvi1Roi6SXihRqSXB3SuBCBVRCBZSlRvSJuBBEBqi5Bmi9idiwSQSLR0SVRjiruRiKRXBSBRSUidRPRoBlSxSsRCSzSPRNRERPRKRziciBSdSMBLRCBGBxiWSkRHR5RwBdinSiRvRcS3ihiuSISjSHRZBqipSmB6i4iwSwiABbibSuSZiOiUitijSaRVR2SqRGSSSNRLipiKBERxBORORwBOSuuSiVB0iTiMSVSbiDBzi6ibB3BtBFSyipRFSPSOStS7BTR9RXBnRFBpRBS4BOBkiMR0RPSfB5S3SSSqBoi5iAB7S4S4uJS5R7RbieSOSDBsBeiwiYuRRmiHRJiJRzSbSAiRSnSeR0uni9SlB9SIiHRtSdiSiOiQBcBfBGSpSniIB2SYRHRBSKiAisBsB5iMS4ibRVinB7uJBmiNiyRSRBiIRcRfiKRXSJBVidRZSXB5RpS2BwSNBvRLiYiGBvBrSeRai6ieBUBWRcSSifRZRURFRUigR2RBRwRSR5RnRqStRAidiSuJSfRDi8RkBrRsRtieBOSgSiiCRgReiHBSR8B5SwiEReRNS3RUS0RBRNBZBRBFBABFRUSdBtS0RGBrSgRORWiIRtShBBRnSxSGimuBRNiPiEBHRYipRZRYiWBQRQiIBDReSYiqiLiDi9BORvB3i1RRSrSIRyiMiASBiEREidSXRuRABZBPB5BqRaRXiXiVRbiKRLBjSEisRBBLRbifBciyR5B2iKieRIRVRriISBiSSEiiS3i3R9ipBAS4RHR0SZiASUi8irimSkR9S6B6RsS6RYBXBsSnuii4R7SjSERLiNSkRziPSuuiBMBhSzBcibShBXRtBsiuifiJSBi8BlBbRDRMS7ibROiuifSDSZSjSJuJBzRWBIBVRRS3i3iISzi6SFi7RYSRSnR2i7SgBfBrSNShRBByS3ShRniwS2BtBMSFBnSRiRRbBqiMunuiiGSGS0B4ScRZiPRyi9iXS5izREi9BtBdB9BSRHBKBUSVS4BIBaiwBlSFiVSzigiCSpRNSTShSBSxBoigiKB3BkSQiyBjiaSSBsSaRASyR9idBLRtRTBDi7BTSEizRni6Bmisi7iNRRSJuBS5BDRJSJBuRoBdR1igRmRjSnBcSUBOiyijSARNBkS5RJB9SRRcRgiwSxBTi5RxRaRsRni1RaSPSCSiRKRNRDieiKivBnRfiJRESOS6R2BLB0i1RuiFSTi5uiBgB2RfBuiuRFBBRtRdSgR7RvieBTB7B3iLR9iRRjSFBCiKB4BYSuiOicBRR9BJunBrunS4ihSKilRnBhSUS6iOBJSUSqBQRgScBsigSKBhB3SNRQRai9RjByRzBGRQiIiKBsBtSaiZBDB7ihi0BBRhB5RYBkB5icSJShixSOSWuSSXB1RYBZBqieBjSeSISAiNBgB7igBfB3BZSuBNRSRwSRSABHSPuSiSi4iXi6SZuBBDR1BTB5BziFB3RnBduBSBuiSgimBmirRxRGBniDSbRhBIi9BFRBBdRdS2BiS7BeRMRiBLiSi6iYSYBfS3RBBqRKB2RTioRlRDRXBSRBB2RUR5BjidikieinRjifRsiiuJiYRcSDiQB8RaizSpi2BKScSsiii8SVBXByRGiiBGBVRgS6BPSQBRSeRYSzSWSniSRBiZRjiZiMiaRBSnRTSkS5BxSWSsBJRTSwSvi2iMRnSFBeiHiCReRFRKRpi9SmBDi6SOBxiIixBLRWRjBLiCSjiUBEiOSPSRiziGR5BXiYRKBvR6RQRPBJSBRJiJSWRWSVimB6BoRQB2uRSGBhi9BHiyi3BOBfSNBxipi2RkBVi1BZRlBmSMB8R8SuBRBrSHiYi2iiSzB3RMisSUuuBfSiilSciYRuRQB1RSiAiaSpR5izSfRgRBiLiKBXijSVBmRjSNuRRhB3iYRri2iriKiniUiPBDidiRiviJRkReBdBQBmBSRiRBBeReSlRQSIinB0SSi6BnReRDRkRYRruJB0iMBIiZBeiZR2S6SXRzRIBnReShSEBQSHBeB3BBS6iiidRZR0ByBrSmB5BFBBRSRtSDSnRzBNRUiqijiMBNBhiqS0B0SPReBZBjR3RnROB9Bzi9RhS1i4uJiNiNB6BZRURbRNRiRLBGi1BSS4RDSyBdSdiTBnRgBziVSVR7uBBCRPSHSvinitSWRviqSwuJR2iUSaS8R9StSORqBSSNSriOSVSNBKBaRPSfBZRTStilBUiLRTibR4BRiIiDBxRgBxSES6SoBZRTBEiGS6Bfi7S5BTS3i5BUBIBOBFiwSLBwizBlRSS7BoRoi7i1iVSGRpS9BcSvB6RyunSdBBRXRDShi6B7iRSEB2BpRPiyRGSwReBEiwSpiVSeRYRkBYijB9iiBKR0BmBwSsuSRNRCi7RmiKBzSeiGuniQB0ibiBi7BHS6B3SsRSSsBZiySABTiMiXuJiiSvijSFRsRfBjiKi2RAiTisRxBpRhRpS6RHBdRhivRYinB3Rki2iIi3RkiJi4RtBFuSiPBMBjBUSSB4uuRXBgBnSNiWi9BjBgRkRRBiSwiNB5BTBeiCR4i9iUB6BpSCRYuRS8iiRESERIRjBSiYRNRbSiRfBzSASdSGiVBoSsRWR0RiipiQSWRVBfixRvRKSaBRBVSZibi1SSiCRIBFRVBGisR5B3inBliauSRgiNS5RCBnSGRoBSiCBKi7SkSZSsR1RXiTuRBORbimBaB7SPuBRSBhimSriHBRSVBaBcBsiFSkR9SHRnBuinRUSdRCRyigiDRlSmiYSuS7idRBRURTiXSuSfRxBKS5R7S7RLiBB8SpiIiJiOBVBFBOirioSzRpSririYBwiYBEuBBHRDSzi1RKiDu2iaRGiSBWi4BdiYRLSKRgB3S3ijBZSiS1BmBQiYioRvRvR7iYSOSTS7RdSnSbSiSSB5iySBSOinSiRsSvBkB1iCuSSwBhiEBUisB1i2iGigSTBqR8SuiESiSiivS2B6isBhiUB0i4RGSCBjBeiLSFRiB9ShBuRAilRPiCiERaRhSNilS0RtBCieBMRTRVRWRiiGBcBdShiviYRiRgiOBBBhR4BTiAiWRBiuBtSxSbicu2SuS3iBBJirBVuSR0S9BNiwiCR6SCibSGBEReRsikRhuJRGRRikRTSIRSRXB4iZRUiDivRgSguBuRBOiFiEi7iJidilR5ibRySQRwR9igS1RpRuBCSwRGi7BiRBRPStuBRDRDSEiRSuB2RERoS0SaB9uuuSShSZSfRhRwSxRABVR5BpSDuJiaSeS6RoStRciDRQBNiZSzRxi8iTuniZBoijBESNRtRqimRoSxSwRGiABRBZSoBLiMSnRUisimRWBBBORFBYB8BDR9BMRQigiRiBS0uSiJS6BWi9i6BmR6BWRXRYS3i1BVB1BeijRqRji4B2RpBwByBTSviqRhBpuuBqReRFRVSORTSRRVBORYReBHi7SoSZRsRDBQRaRMi1BIS6SCSTRQB8SlB6RHRNSliGi1StB8i8R4RMipRPS9B7RkBMRuSyi3BsSciABVRRBZBCBISgBcRoiEB6SuiBBEuuSiSGSRSGRqiARYRLRhilB4RpSmRhB3RDBYSgBiBbiqSYiaB4Bfiai2iPilBFibu2SvSLBwBfRsRFRXRgBmRURNixRqSxSOBcBpRuB8SkRXizB8SKSnRIB9StiUBISdBUSfiMBDRviCRzuiReiISPuSBEi0SOiERniSRGipBqSJSDi5B0ByiQRHiDBLiSB5uiRQidi8BKi4R1iDuRRnBzS1SKirBDijR3RcR2BRiYiTBxifBcR7BdR0BYB0RSRYB5BEi2ipRdRpipS3BYi8RiSEuRSHRlihSCRaBGiQSRBhiHR3BXRoSGB7iTBpSZB6BMBySli9iLibBViCSBBWikiJuJiXBzipRHBainRlSyRRSMiRRYioRMRbiWBouSRYRnSCS2SCBCRkBlihi7SIi6B3BTRtS4SrimSeS6SmSxisi3ipiGiMibiHRpRXiTRsBuibBTSKi6RMiAShBYSai7RFBtSsSARWRzRLBuRmRbSgSTSJBwR2iWB6BjioRTBRReRViqi0B7RaBsSlSmR2RtBbiXiLBDBnRUSPiFSGBLBJRkS1ijR4R9SGRwR1RLBpRARpizBCiQRdi4i3SqSIB5B5ieRviUReSfRcBYS4BkijSQR9i7RJB8ReBbRaBcS2RCRii9Bji3BvBeBvB7ibS0SdRbBASBSFRoRlRgS7S9ifi4SHSqSdR4inR6ivBWSXBJioSiRYijBCS0SaiJR4ilR2SiiHRTRIuiR1itBVB3iRidBvRGRlifSyiWidSOScicBgRGSQiFRHBrBRRbRSBWRKBZRPRti0igRPB7i1BtSaBuSLipR3iKBFR6iTiYBTBURFSfBdR4RGRoiRiCRtBKiIB4BOSuBVRIi0igRRSKBsBtBRBeBFSTRWRrSWi3iBSWiNRvSIB7SQSMRBiNSlSbROi2SkSdRpijiOBAirRYi4iWi0RBiei9iUBUSYiOSoR5R1iTRrSxSpivSAi0RAiLiXBpiLiJSiBYRjiDSOSORDS1SLRUiqBwiUBRR4BgS8BrSTiKBsR9ijBiBRBUigSmifiXSxSaidRcuSBXBbR5RuRaRIRyS8BNRwSRRviTSSBdRCBySBSVR6iSBliyBqiUSmBLB9BKBQBiRiihixBlSFiqSoixRoBmSxRmihBmiqS9BySeSbiEBXSBSsSYB4i3BTRkS2SjRwROBTisRgRpSLSHRORzi1SnBailu2SKR2isR7BfBcRlBIRwScS6i2imiRi3RoRmSSRiiESeBSB6iNRXRiSdi3B8RfShSIBBStS7SpSVSFBOBjiBBZBvi1iEigiAi2B4iQSOBhiiBoBVBrRDRQBvB2RRBuieS0BcRIiLSZR5SDiXigiERmB9BWSiS1B0imiHRgSIiki7ifB1uRizikSLiOSdBziYRABNB1iBRdSwBHixSnSFBmBgRciiSyBgRHuJSkivRsBiBvSXSRBeioSpRgSmRySxR4iEiBiESeR8BsBMBZBkBmS1BZuRSVigR5StBtBORwR9ifRWRYBJBuiuROSMSiioiziiRwSDunBuSWRKSORCBwSYiTReBgi2SLiKiVRJifB2ROSCBcSVR0S2RcStiyR6iHifRLB1RQRkibiqBQB5SciVijSXRQRlSRSzicBRSKStiTRiirSVBiBQiwBvSSicRNitBUSjieSmiiiriOiEBPBISXRfRti9BaBiBTRtisSlB8RBSHBkSPBmB2RlioiqSTSsiWBSRdBlBZBZigiViRBtSQSmi6iSSEigRoSrRDi5uSRmBSRNSCSpSjBViuSJBFBYRYRnSjuiBcRMifRuRGS6iHiViVRniPi7RVSXSHSiili7S2iiBii9u2B4BCBuRgRfieicReR8inuRS8SdSBiBBCShS7RqBGiwS8i2iiiZizSziXR3SkSpBdSHBNBKBIirSPBfiPiGiGiKS7SkBMBQRLSRRQBvBKRzBKRYSzSEuuBfRjSgBxBABOSBiBSZS2RnBGB6BMRzRgSMiZiwSIREB8idSRiIBpSTiMSCSGSxSORgReRyRpuRRdRGSQBHSRR2RzirRQuiSAiPSjSqRpBOuSRuiCiduSBqSaSlR8iJRQRhRNicSdSLRGi4B9RMi2B5SpisihiGRku2SliVBRB6iyRiROReBviIRnRVBcS4imBxBpSRRWBniiRyBLiwRYSjBni4BUiHB5REihidBkBaSaR8BvBtSrRoSxRBBmBQScBCB8RouSRpi9RZi2i1RniCB6ByB0SNSsBbRpRZiWRPBjRsSgRvi2i4S0iwRxSUi0SeR1iPSvixRESsiTizSKRFSUi3iARQRNSHS4R6BBiKSLi3SASASJS1iNi5BBRPBFisiZRSiUBtS3BnStSYiWSDBjR1RABcSmB2iIBXBaSwRmSMR0SfBxiUBmBIBIRxSKRwRnReRdS7BZSYRZSwSPSMBESOiCi6BHikBRROu2B1izSDB5BGB4BvSKBHRfBCBFSYBQimSfR3iURlBSBmiGSYRJRHRWiYB1BJS3RABbRTSkSDieiMRdiSioSbSEi9BKRriORbBCiwiaRvRgSrRxiLi9BCi8RUSdSCSAS5SpScBtS7iki5S5iRijRvununSUB4RzixSmiHiGiqRiidB6iNSRSqBvSYiHiKiBSIBsBPidiZSfuSRuSlRkizR2BwSLBlSTirS3RQiMBCSBRiiPBAidisRhSGR8SNiRRPu2i8B7SGRnSDSJBiiziUipRkB6BVREikRYSqimReilRXiMRMi2BzBZiTi4iMRWSESvi7i4iEiABTSzBCBHRgBCSaRnBaiViBixSriHRkBRiEisB6S0BqRkBDR9RXSQS3Rru2RjBsScRWiLSGSoSwSzSXS6SEijBiRQS0iVitiRR4SGinRvijSqi3BVRcB1iTRLibBFReiuSZSqS0B4i2ieR8S0RjRWilSZijRBBvBNSbS1B2SniIRYS3RkB6B9BXBLimiMuJBtSGSNRjBISZSsRBiUBJiUSsS4RJRzBzBjSBicRBSABvBCiYSNSWBSScBzRNRYBTScB5uJiIRoB8BZSHRRSqRbi0BjSOBXiaRXiSRti1SOR6RiRSBJifSSBcidSEiiuni3BQSHBzSai0BriHBCBsi9RgiwuSRoRHicSUi3iHSiiBBDikSvRmSYBESziiSyiSixBCBLSzSHiYSMREiFRaSZRcBUBEirBqRJSLBRRLBpSXRZRSSrRuRzSWRVS5RgiXRlRuBJRyRkRKidS1SAiEibSwiFuSinBNSrSGStS3BsSsB6ShR6i0u2ixiURXBxRaRBSBBnScixBZSARfi3RjBGS5BBBYR9BhRvBXimBHSDSeiCBvSsBCRRSoBDRAS9i9RnuRuRigRpiYBHB5RiSbimBLBpRGR0BYSRiKBcByiESvR7SHBmSIB2iGiJRkRxS0iYBxiiSKuBiwRCBuB4RnBfSPB0BHBZi4iCSoBNR7idiZRHu2irSLiCR8RoSsR4iwieSzi3RqSiuRSkSIRRS2B2ByR1ioRwSwShB5SRiai5BjBtBtRgiGiPSLiFihilu2RDiOBIR5R3i5SsBCi9i2u2RyRTi7SbSlSdReShRei8SUR0BfBKiMBbSPiLiJRGSLRGi8RCiNSrSXSeiVBbioi9Bfi1SlSFimSGSjBNiwSORnBPS5ShS6RMB1ByuniIRRijSDi7uBi0RdSOBxiviWSCRERZS6ixBGRtSNiFSXRbBLBoB3iSBnRpipRDivR0B8SbiFSCiDR1imiURxiui0ifRuiXBNBfBniMipB0B1R5iEShigSUBWBnSlRkiqi1SkSrBiSlirSDi5i3SnB5SsSYitiLBUR2BGiKStS3uBSISjS2BcRZBdS2BsB2RfirRaRrBCRdRVSzRiBSuRSOizSsiWR6iZilRbSdBZBBRXR3SNiIBvRuBfBCRaRIiFB5BABxBHBEBEBPBVRrB4BSuJixi2S4iNi3iURCRNByRsiaRoBkiuBTBOSWiERCiDRKSDBrBdiTivieiVisiYimSBiTBTBSSJRgRQSMBPirSbSbi1BriniJRkR4BUihijSQBbB0SXSWRJuiiyibSzSlRDSIiLBNStBiRaBKSABISvSJBQRTBBifivBySyBvSmRaS9i8i1BbBrRJR9SfBDSLi0iYSySQSXiQSBRNBbiASfiOiSBSR9R1B6SVigiPBHBOSlimBWRZiOiOiCiWiUBcSzSjB4iGRCiEi5S9RABMiiiXBQiduJRiB6R2SARZSSRSBVRwiciYRIS5BgBnSuBwRnSZSBBwBduSStBvSHSxSailSYR4B7ipuJBPSxBJihSmifBpB6itSyR1Rqi5BSRdiqRiRqSuBSBnRcSfRnRnuRuiivi0RjRgR7ificR7imStB1idR4RjRdBmBjRgBPiFBlSCidRZSaSrBnuRBsRoRsioRdSHSmBdigi9ioiARjByBpBERlSySORfR8BpBLimBLixBnBgRdi3SFSrR5S9RORBS0RgRXi7izBviUBhBIuBB8isisBLRgRguJB3i7RHSjSERJRfRTBFSaBNSDRXizB1SEigBYBFB0SMSjBhigSOidiQicRCSPSuiRRtBzBpBnBFijBriuRxSbB0B2RqR5BoSsBeitRkRKBAiKROS2BQB3iURoBFi9SqicRQRoiKSVBXBdiGSsRrRqSAi0ieBNSIR4SqB4Bdi2SkReRoS9BMinixSBSWiQS9RIBfSGieBiBtShirRSRrScRhS6R0i2RZiZiGRxBFS4SKRtSIuJijBABTBSiARPRkROREBdRARXSzSpSUiNRcBFSzRXS1S7iAStRaRhivSzSrSEiyRVSfB8SeBrB1RiSiRmSuR4iZRnBhiyRPRmSIBtiriJR8u2SyiKieRxSKiKiUSySFScuuS9SsSzSdRRRiuRRCRpi2iWRgSlSrRLRvigBYB9SQRcBxBwB3RmS7BEBeRpRAiiBmiDunS6R5SOBLi1RPRKRyBwSIiqSTivS2iyiRiHi9SiSABKRGRcSBSEirBRSMRHiJRvSMBAB8iDSPi8RpBqBZiBSyinB4izBxB5ihSDBpBUBiBfR4R6R7BMRDuuuuBuunS9RBi9SSBmSxBaRSS4B3BrBWSeR1ikROBdRpBhSeBGSWRGRlRtR2RdiZR6SORoSWBniNSaBSBaigB4ibSNi7SiRHBtS2SzBoSiB5SfRMiwSBBhiURViABNSTBNRDSiB6SlSHSrBiR5iJSOiGS7RHBjRcS2u2BUSUuRBGS9iTSySGS6itiFB0RhifBtiTuSR1RZiESAijSai2iHSrBaisRviVRBBTiRB0iERLiRiCSXBUSdixieB0BZS4SfBTSPR1RUB8BZSOBfSWSyBbBBBYiySzikBFR4iVuuRABTiTRZuiifRxirBkiMBdRoSRiBBJRtSFBIiMBXB7uRi0BJSBRvRIiNRXBGBcStBgRvRuSoRxRuB7RDSuRPSzStBXBVuBSjBJByifRjBnRCShBYBcijuiSpizi2BuiqB3iaRQiXSQigiUBIBxBZSDS1BRSJBySBiXRqS6ioRURPuuRwSZifRTSBSkR1BOStSQShBCBGSniBBHiORrRzRlBXB1STiASpi2BgRjByRHBOSLStR0RUBrRTS4RJBaSIRJRziHiIS2SmB6iwiCS6ixBiigSJigRBBiRoRZB9BDS7RdS9S0BFSvSTi6RyiaBDBKBZBtBRihRnisRKilSAi7RrB5SyRBSTR3RGBki0SgR1R5RXSTRTRHRbR2BcS8RiB5RTSORMRASdSSSRB9SqSoBiunS3BYRPiSRxRMSNiNR3iPRtBWBtSEBCSzBVi1B2iLi5ROSJSmSzSNi6RYRIR1RVBcBwB8BfBCBBSsR8iRSsiQiKRJS7iQBfRUBoShSWBARWBXiUBBihBqR3BeBrBeRCSuBBBsBqBTRzi5ipSNiQByBBSkRyBwRaiFR0RXuJS0RQRESmS4SGBsRMBKi4SRSjSOBPS3i5RHRlSMRVRiRZi7iJRVB1ScRyBeRFimR2BpSIirSRimSSRlRgBji7iBRBSnSaivSZRrR9StBcBuu2SNBQBxRkBUicRoRSSXipBSSvRISXBxBiioihStuBiUibBhBLBSBdRKBSibSnByRnBPSfBOuiuBSuSbiUi2SCi6Bzi4RWReSkSJBRSZS5SGSdBYisidSfSQRdivBpSgBZS2RBiLBEBfBvigSYipBMiwBPiciwirBkiYS5BJS6RRBKRQRGRVi1BrRsi3iRRKSiBCiBitS4RSi5RXiMSRRlSaRPBti2REBzRXBfSPS4B8SXS5B8i0B7SCBDSkSIRairiORzRGS9SWR7RERCSqBUSgSVB0RmSoRkB1ReRdR1i3Rui3BDR2BTBxSJR9BxR9RZiFBrBvSnBjSpSCuSSxRkSqSHBwSvRvRBSoi4RfR3iERhSASUitBHRNiwiBiGRwRPiCBjiti9BviuijRviZSYSNijRMRLSBRBSHS1iFRURvSOSBB7iSSXSaRoSGS6iiiWBhBMimibi9RViEBGu2RNuSS3B2RGi5izSEBdSjB4SUSpBEBZRmiti7BPBhSZRLRQBsRbSTReiFBkBGS1ShBcBES4RvBzRQRaBDiqiUBDBRSyBbinisBEBFBxBTR6SZB8BlR5SGiuSPS6ijiHB6S2BGBfBOiySvRYRmReR6SRBoR2uiR0BZRiivSXBiiyBbRjBCSQBRRuBRRhSlR5RsRLSGSQSYSyikSXSRSuiyRRB0uBBERZSPR8BISiiZSXSERfRdRZBsRRBqBlSfSWRERjiMSFSZRhRDuSirBqSmiwRlRPBoSWBfiZiyiPSPSaSfBbRQS5iNBHSeiERzScBASUS9B8BdBsBFSBiQRSSsBjRKSnBjBWBGunSouBiKRGiVicBrB6uuS3BNSzR4BnB2BbRwR3inBbSZSURXRFS3SjRrBMRUiKikSVBiBSSAS9R4i3Bxi4SuivS8SMBLRASRSQinSHBzijiBBtB1BMiFSti0R6SJiUSIiDSPizR5RHRtRnB9ShRES2i5RKR1iOiDBuSfRZBtBmiZRHifiKR9BsinBNuni1RdiURaB8BqSciWRzSgRVS4BNRTRFigRCRmR6BjiEihi6RGiJBEiEBDunBSR5RARBRxRKR5RLSZi8SQB5B1iIS4iZBfBpShixRsSJB5SlilSTRxR0SZRAB8i7uJB9uiS7B6B8RUSLB8RNiuBeiyRBRcBWBpRaieRlRqRgR5BiBmBJitSUiGRci4BZBjBJR3BdSlBkSTiDSEBHRRi5idRCSXBQS0BkSCB8SoRbSku2SDBniWibiFBviuSTB8itiWSuBYRQS9RRRGSRidiniTR0BkiBSrSSREiJSSS5BlSIS2iQSXRdidR2BcSMRfiwR5RpiSBnRYBmS3BhRGuBSXRLBjRNBgirRlidiwBoR1RZSnBXBYSLBHSZiQSiRkS8RCiQSTiTSMB7B5BLRnigRZuJinSAS4i5iDRTiXB5BRiABmidSmiMBJBLRYRJSwiqBABniju2iFSQiNBHBURTSqSUiFBCRfR9R8BRSyuniPRsiNSyBPipS4RoifReRJRsimiiieR7R4RjRRi6BFSeRZSpiMBbieimi6BBSfS2ROimBMRIRkSEBiicBABoSzSqRcRsShRcS7BLBJRjBTiDBORWB1RsRrB7BWReSoBBRXBoROBuBXikRRBgBQRFBviCiyBQi5B5SDR3uRisBNRKBpieRkSwBTiUioBgSFiui0iVS7SmRWiwRVSbBUiNSmBZiCu2ixiRBNRvSMRCBGBzihiASNSyiXBARZunRzBiS6ipSqB9R1RKSqiCSSSmS2RHRnuBS4SDBwBGRRBPR5RLiARnS4BbS6iyShR8B8SsRPSOSPRVSfikSLBABvBfi5iAuBBhioBsRYBPuJScSeieSSSPiuBmuSBOBiSDBQBjRmi9RUi1unSIRXBFRPS4BOBQSvRnSgi0SaiXijRQR8iZSoRARniRiXiARuS3R5RWSIRriSuBi3uBRaieSQuiRzRFSJBFivSKRDiLi5BDiiiWBYBjSZRfi4SwiUuuipBxB8Bwi3irizi9RxSxi1RPRlRkReB9BviLSuSyieiMifRuRXSJiCSSRMRlR3R4SSRhBuiZuuSIi7ijBRSvStS4SGSqipRcSaR5SuRGivS3itRdRZBHSbBlijB9BZBrRMBbSXRQReSduSSsRMBDSzBJBEiQS2SzirR0iBRYixRHRwBjiGiqSRSMiZBmBgRHRuBwRkisSxSfiQBgRVSLiqi2R5S9BKRbS1SMBkBhS2RWROiDSMiCSJBiRyRziFSUB7BtRKRjuJikBaSlRDBJi6iZBmS3RXB5ByRuSwRBuBSdBNRUSLBeiOSRRcBiunRQRuBzB9SCRxSzRWSoiBBbiySABNBTSKi1iLRCStSKRnRkicR4inS6iIi8SgBkSliSu2BouSBri3SUiLuBS4SKi0uBBXRVilSnSwSaiLiUSsBBBVBqBPigR7BiipiQSfitSdSQR1SmBei9RHBLSaBqRWSXRHioBHBNR9R6BqSmRCRqiERbiZuJi1Ryi9RIi6iyisS8BXSWSkB7SeBASliuBASeBfiDBaSbBIuSi0BwBzBEBdBlSEibSbRuBSSoSkuSB8BSR1BdBcSti1iTi5RWi7iUi9BrRlBlSFRSiVRVSFRnRriMiVBKRkiZSOuRB3SYS6BpiGRnSOSbRHB6RURPi9uRSeRMibiNBgR5SHRSBBRdRRRpixSHRGiOBNipBYStieBmiJR1BiRDRtB3RaBmStiMB1idiNiRitBLSkBWiSi0B7RzuSS5RVRHRDSXiTSJBLRiSvRnSGBLiWSRB9BxSxSIBwBaSQBkBCBxSySxBNiyiJSqikShiRRPBBS6RUSdB3SUSqBCRnRziUBiuSBUB5RWiySfRdR3ilBdRUSLBOicSOiCBBiFikBNBaRRSQRsiSRnRwBvuRRXBmBBBTBXBPBxBLSsBYBdSjiDBES0SrSURCRGi0BquBS3i5S6iXSmiRiaS1R6SrBPRmS0SKSAS2RkiUS2iARQBiRnBoBRiaRRRxBeSbi7ByRAiCikiBBwBXBrSZiwSwSwSLSXilSqiFRKBmB5StRxuJSUR8BSBXSGBIBWBYShSIi9STi6BBiDiKBxB6SfiRSARiSsSTBLRyBrReRdSIBkB3SaBbBAuSRKiuRUiSR0R1BqiARGRFSnBPiiByRyi1ikRuipRCB7iHRjivRmBBRCRxBPRkicili6imRXunRfRLu2iFuSSsS8S3SpiZSYBuB8iViEBuB1iASMS9BPu2B2BoijRdiQioSgSWRzB7iPRpiXiNRsRNBbi8RERABQBWS0SrS3icSGu2RlimSQBXBWi9izSTSgByRnS9iTiCieiiRUB8i2RbRPSEBCSyRMuuS2ihBBRhSYSwi2STRWBfSpBSiTSwRhi9RaiFSsBiB3u2i1RPivBvSAieREiliGBWR9ikRZSfRSuJB3RbS3R8BZSeS5iuBpiPSnS5BsBfiPSySKBQBBRMi1RoROBlBRRli2BWB0SUSXioS2RIRVRpB0R9iOitRwBViUifRHBEirSOSbiUSsBGitSdRQBVBbBIuuikiARSBBBDBBSYSJR2RPSpR7BOBTSHS1iWiNSmR0SESRRSSnRJSiR9iCizBsSLBdBuRSS8uSBQBFSrRoSxiPShRnRhRJRaBbiTBkBaBjunBKiSicuuBFRHB9SzRGRQimRMSsSSuuihBARlB4i1ScRjRERfRHR4BLBYinSdSqBOBjiLBLBmSyBfSTSnBwiKiZiuRVi7i8RPSBR0SIBeBQRQSjRHSeBLBWS7R9SVSYRlB3SSiqByRoiriuScRGSjRuBkRWBDBGRPBqBHSdRNi8iTBnBciMSMizRHS3SqiDi5RGiHSmRSi3SYBgRlB1B3iFihu2R7inBxSJS0B5iGBZRVBXRnimiwRfuSi1BlB4iRRLBgi0BbBvSaSIR3RSiDiqiEBbBtiOR5RxSAu2iaS7uuSwB2SkSCRABBilBRBcBERtRMSjihSIiQu2iPRuRoS6SZBFipiTR0BrR3BVR8ivRBi7BQSeSeBpSlRcS7SXRyRnilR2SbRtRnBCinirRHirRGBniaS6BoiEiHBcSURNBpRHRnSFSKSPRmSOSJSQihiSRDRVBDR5RPBXiHRwBKSBiNRrBeBbB8RNBHSoRFifBoRXB1SsStRnBWivBxuii8uSixBSShi5BOS6BjRCRZibBniEBTBQREBeBeBOSRRkigSDSwRMSZSTBnRSSARWRzSARCSFiHiQB0SuSiBpBFB2i0ShuJSYSdBBRABPB0iDisS5i3RoSSiIB7S3SoRjuSS5BWB8BiisRfSkSMStiORpu2R1i3BYB9RSR8RpS9BLRtBGidR6RYiJiYiASHBCRwibBniOSoBrB6BGiORzBdSQRASxiVivRCBBSauJBDBeioSaRaioSWSxBDBmiAiTRyS2SARdiPuBBxBliYSzSVB9iCRjihSzS7iCSoSui8iOSAieRDiESKRIi3uSBSSvBhuniABKB2SMidB4iZS5S0RORPSdi8RmSMReiGSCiLBeSfB8SMiEifSYBaSxikSCRiBpSdR4ipSIi7BlBjRcRfB4iCRTigBBSUBDiNReRZipiORURkBUBWBciVRqRqinSYBoi1SVBuBGi1BUieRRBjSpRKiCieRvioSti3RjReRSBxSsBaS9iPBWRQSXSiSSiQSAilRvunBJSZSGiSBgBPiGiyRnSUinBIieS8BcScSTSSi4RzSwRuBTBwR0R9uBSkinSXi8ijSQBPRvR9SiRGSJRdRQRmSQiqRISpRpitRdiZSDBTR7BOuSBPSqRFSFReRZStioR6SIRNSsB1icBdiQRPRaSdi5SPBBivi0iGi4RrSaibRHRbR2BLStRwREBURTBjRmiGRmRfBSBKiQBlRKBcBhRISpi2BViYRySYRzBlBNSriwSdisRBSwSUS4uuSrBbSFBrSqBqShBjioSXuBSnBguSRDR6RZR5SXiKikBuiSSQSLiCS0RoSYB6SeR7S3RtBcBmuuSjRXiMRwifRmRuRdBmiRBEBIBxBIRcidi9SYBJiuixB8iZRuR1RDSrRginiGSFRlRKBORZB2Bai8BrB0BiShSSStiZieBLijRLS4iKSURbS7R5SABkByiVSIBDSBSgS9BoBdRDizi8RfipBhBSSyBxiWB1ReieiYi6iBS0S5BsSaB2RCimBuRsSySZBcSXBGSjSjBQimSJB7Svi9BviISuSdRwSiBBS8iyS0RhBsSlBliXSPSZSHR6iASsibi7i4S8SuiPuuuSiRiGBviuiiBWRsBeBgSmBwBQBnu2SESaB1BYi0ikRhSqBFB1iGRiRcRlBiSTRzRfSWSMSrSURsSXR4i0RRiKBoi4BOBgSBiUB7iHB7SpSEuJRwiOR7unSgSvRDB0RTSPitBGiZiSSRBoS1isBQSER6uJSjivScBBRQBaiaSABNuRBzREitRVivSuRQBWSfB7RZRaShBaBHBER2BvSDSxSRBcRliliAigRoB3B5SyBES9iGS8i9ixBEBquJRKiVSNSeSXRwBUS7RGiLuSSASPSmBoSVibi8iGSQRHitRBSwi4BVBuigSyRiiKR4SpiIBNBRScR8SOShRfRfRxBXisSCiviCBJuJBji4R1RJiwSTBBRnSPRISXi5ROStS7iniORyRyRQicSESkiBi7RpiQiGSLRZisilS1RIBpSEShBkiGitiUihRnBdikRkuiiQBKBFB1iqB1B3itiMSPSRSrR0BCS4SUSuSFRSSQiuBFiSSuiQRrBiBcR3RyRTiBSNSPiXSSBvi5i6i9SaS1RnSeRDR1RTi8iUi1BAidipRyu2SmB1SxRNioi5BWi8S2RIi7BLiuRaiRRlSNiBSXB4RYiDR1SABhRwSgiSSGRXirRmBIioRgS3RNiUB2iFBZRbBTRQR1SLRZSQBfByBjB0iRBBRJRaS8SwBOiBiuiKBUBtSgRyBvBHB4S0RORNBxiRRnS2RNiySzSLBhRtBkREioSWuuicRpBGRTigBniWRaiaRERsS7SDitiqR6SeB9RRRdisiiBBS2iBRERABbRBR2RTS5SyieiViRS4SLSpSxixR7SZRJiwBcuJSGiLipB4RASwRXSviiiJSmBQiaRwSNS4RaSsSWSWSkiESfSNuBRtRMShR4SKuJRqRXSASqBUi8BqBxBABJiZBaSnRJSvRrRTBuRCR2RIShRRSjiiiRBjRySKS9SKSxS3RjuBBhBqiKRluBB4SoR8ihRXSQS3RMBnSgSMBlS2R8RJBnBdB6SoRqRPiGSbRpibSQSuiJShiMimiPiNS1iuSwuSunSHS1uJRdB8iLRgRPBFSdiQBSiORmBLiPRzRoBtiCiJSaSpRiRNBcBARKRVBsR1SgSARPR7inB2BEBNiOBAS4ifSESwSRiPiYBqS4icBLRJBOiniRS6SlRNiFRjivSFiRS4SCuSBeRei5iwi0SSSvR2ivR5iPBYSdSdiFS2RMS3Svi0iEBgBCBfikBBicBtiqRaS4BVBwSmRWSASBBJROiGSpB5i2icRkiUBeB0iYuSibixSHSoS5S1ivi2BjRSSbSJBMSCRcSeSfuSBTiCRwiLRmBOiFB9SDSLiFRBRBirSZRoSESkStBzSDSzRNSaBrRFBfiGuiRrixRvBOSXScisBhBgiaSABEBWSCBcS9SGBNS7SnRZRnS9SfS5uuiUSqBoi1BTB3BYBni7RsSjReBrB0iRRDRURARNStSURYSliUBpSoSGSoS0iqBIiPRnBYSHRdBUBpRKSrS7BxRTBJB6RNBku2R9B9iuSUSjB7ShRyRNRaSfRDRERZS0iCSySMi5BLBiiSS4B1BxipiTRJByBwS0ivi2RhiCiaSvSMiQiLiWSKS4iMRSiqRbu2RoSUi4BxB1uiRaRSSyBoRPi9SsROiJSyBhBURZRAitRDRcScSVSOSbiVRUBVS4SaS1RvieijRlBcBJS5Bcimi4ilBRReSbBvijifR1RyBERNi9SIB4BKBLiSB1R8BeBlR9RpS8R4BgiriHREBJRduJRdRBBpicRpBPirB3i6SwRRibSnBSBJiciSBKuniGSqBPBkSySzRtS8RgSiiCSHR3BiBeSQScB6BNR2R9Sqi7B1SgiciFSRiYiyS5iTS0RRS8B9ROitiiiNBRiTBLS9SaSPiEBIRuBNBORNBhuBSRRSSjuBRkS6RhiMSQirBNRsBRRTReRhiSB6inR6ivRmBERDu2BlRsi6SPBISNiQRhBgSQS3RXieiFBKSPRriniIRTBxB2R9izSxRoirSpSuSdiBRDB0BBBVBoRBSeBTRJRhBySMR8R2SCSBBfRfRCS3ROBliJRwSARcS0SSiXRbR0RGRlSwSxRsSnBsSaRnihi7SuSUisiGReBliji2i7RjRHiWRcixRPivB4SfSBB1RESBRGi6SvR9SSBuR0iQiWRSBSB4RTSQiaBGBNRlSSS5RjiJS5BHBSiBBfigSTBjBHSXS1BNBcReSvRXRTBYSziDRJBXS2iRi7RQBERzBwSIixRFB0BgRiRyR7RsBwiLRYBaRNSgS9iliuiiicB7RiirRtRRiVBfiViQiuSIBeScSIRsiciFuiRXSviNiVBLi2RIByiVRQipBxRXiWBouJRQBNBNS7RkSpBWReBGShRsS0RkRIBDBORmSrROBARQB7iXRtiMRtSgScRTiBi4B4iyRCiVSvBkBfiFiuS3RTBkS8iWBuBKRiBXiJSfiJijBdSxB4RmSoREi0B7S4S2i3iNSeSiSXitREigBaSXB1SJRLRRSjBFRtBdiaibiXiaR8SkSfiYBSSzBFSDR0SmRUR2S8REiQiARIB3SyB7S8B7S4Bxi2RvBqBuiiBRBJRRSxSmS5SCRBS2ioRYSnBwS1BeiWSzSCiXi9RKSWStSKiISLiJR9RuBESDSeiouuidSmSQizRFiMBTS9inRlSlBIRoRYivSoihBCRhROSvSsR7iAR5BgSbikRnSNiviNSCRtRFSiStiqSKuiS1SsSCSWBPSIiIBsBzSGSfSaSaBxijBkS4BtShBLBBRjBPihRSRfByRAR0iziPS7BDieRMSTRGSfRuR9iniRBSRTRhRUB4RqRRRVSWSVSnBjiiBuB6RsRRiRimSbBOi8SMiYRmROiNBBRLBNReBNRIRjiTR4SZB7idiJBrBqi2BMBdRYBziMiUSFSWiZRaBfiRSwuBBNiZiOSyiUSqBBiai1iJBsSxi1SDSHR8BHSPRuBkSyiMSRiySdSWSIBxi3BVBXSbinBIS6iJB0R4ikBlSsBciYR3R6SDBBR6S7BlScSguBRXuBRmRFixS9SqRrSsRFitSgRpBnRnBjBCBEBfiHRqSQiOSkBsRdiXSZBrRiSditBGiVRpieikSTiARriaRKiyS4iBBDuRRoB3iqieBriIBkSzSNBIBWi7R2SCBySoBNROStiaSEiTiHBcS8SuiLSZSDiwBsSoitRziVSoiHS8ilRqSoSNS9RQiORDBzRkBfibi3BeSpRrBxRYRriDSiReRnRfB1R8uBu2itivRPRhiABEB8RgiwiNR4SbSpBwBeSLS0SIStimBsSzRBi2RqSriTBNSmuiiQizBLi4iEi6SBB8i2R1SKByiqRdSDRfSSSHSmSYB8RsuSBkiWSCBuiISJRKSnRxBVRAR3R9BOBhSjSoBQSfunBTRcBqBVRNiUBFBESAR7S2RMRERBRpiRR2BpBMi8RlR1S2SoBJu2RnSCiNB7StSTirBqBbSjSNRci0ioiDBFRxRCBVRVSVRGilRbSkSciCiFBCBzinSmiwRIBxi3SKBrBJRHRCRDBgSiiPiEBLicBHSLBrRQiqSySCBhBvibi1BFSSBrSuiURjBkRNBpiFRIBaSDRXSAimROB9SKiYiuRxRCR6imuJiER3SWiSR3SRiAR5R0SFB7SRSGS8BBimBLS1SQiAipB8irBfS5iIRZRoibScByiTSDimiyS9SGS1uJifSVSQRni0RGS7SXSuiCB0i5ipBOBjR4RqiFSPRnSuBkB4iMiYiiBtBWSeiySUiJSZiISmBxSEB9RriUR5SgB2SPiWBaRnBABDiPRAShilBhR5S2ROinikB9uBiVSWRWiNiyRmSXSMivigRNB7BnieRPSGBHSoBSRPRYRNB4ikiIixBQinB7ixihikSxiBRPBIijB7RYSOBABIiXR6SdRAi4ieiSSLRzB5BGR8RRiPijizRKiOSUiTRuBnBARMSBRTSnSRBxBcBbB6i0RnijS3R0SRSYu2SQiLRoRJB8uiStikBfB5SsiauSiQi4S4RzS1SxRziQRSReiYSdBjBsioR5uuRRB9BrBKuJR5iMuBBnuSiXBISPiSS8uiSGSliPRvSeRARuikRPi9BxB9R4BxBiiNRgiFibSVRMS2RfRTSQS3BbBhRQR1SPiOBBRWiBRiBeSxRORFBWSNSgStuJShR4SUitRpBbSNRWR4B5SlSSiFRuBtRWi4iKi8RDSSiGSuSSSLSER2iFRcBYBPiyiCRHScunRYShieiNunBUBCuiB0SqSBRniMBjSpRrB9RCRnSCijRbR7iGRNieS7BfBVSRBkSGSWReRzBuBnRhSPB7SfRlSdR8SnRSi9SxiwBLB8S3RNBnRYSaSzimi7B4iLB4SSSoR7SpS4RJBoRORXB4uiibRyiOSpiQSERXBWRDBgSuRLSbSji4iQBPSmSkiKBHSCikiLSAiEitSriwSISgiBRdBquRRPSquuSQBwidRTRAStBKixB7uSi8SFBOBqBfSouSRauSRASyiBRMBIBbSSSiizBRRJuuBKi9iyBgRqB2i4BLiBBFSpRcB9BBBfS0S1RFBQixBSRji7B9iaiKuiRGRABLRjSmikRdSpiCS4BkRTBGRdiRi2RaSjSaiPSeB2BIBuRGS9SRBKSOicigBJSJBoiViriXSqSMSFSvSqunRFRVBmRHBlBKipSUifS4i8SYSbRYBdBlBrBrR7ifRpBkRgRXSWihBpRUSBBaSgiKReSWRQioiLRVuBBuRdRBiiBcBIijioR0iNSHikRNSlB8SQR3iBR4SdSWi8RZRuBNiKRkRriYReiHBgRFS1SJBJiSSoi0RdR1i9RhiOR4uBSlSkBUBIRgiUSrRtRFRRSnB2RKR2RhRhSvSFSZSQB4RXiPSCi5itSrSYBWB9SfSqBdiAiDi7BuR3iJRYS9RyiVRNiFR6ijSqBgRgStS9RZiAR4iYS2B3icRmiKidStiGSERGiMB0RmStBIR8BISwSzSgioRZBqRaBCB9RNBuSyRwiaRwSLRsBJRbiNBLSqRpi6BBSoiwB9ROiMi9SMSyijicSWi2RnBqBERJiKB7iMiBSjiUS9S2SbS0RlB2S7RAuJiURoSlSCReibRhSeROuBSki7BDScieRUBVRaiZS1ihBfSfRLR2SmSsRySFRJieBQBaiCBwiDBgRnSRSfRHuniJR6BIifBJRsBaB5SBSeRbRsS9i4B4ivihRESrBXB8SyRESoRUSABFRhR5iJSmSsRyR9B0R6uRSg",59776));
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

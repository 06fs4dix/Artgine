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
    CTerminalRouter.prototype["onStartTeam"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",3790));
    CTerminalRouter.prototype["onTeamEnd"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",8551));
    CTerminalRouter.prototype["onSchedules"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",10507));
    CTerminalRouter.prototype["onScheduleSet"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",12145));
    CTerminalRouter.prototype["onScheduleDel"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",15396));
    CTerminalRouter.prototype["onAgents"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",17426));
    CTerminalRouter.prototype["onAgentSet"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",18941));
    CTerminalRouter.prototype["onAgentDel"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",22232));
    CTerminalRouter.prototype["onSessions"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",24021));
    CTerminalRouter.prototype["onSuperMode"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",26779));
    CTerminalRouter.prototype["onKillSession"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",28784));
    CTerminalRouter.prototype["onLogSessions"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",30820));
    CTerminalRouter.prototype["onLogSession"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",32743));
    CTerminalRouter.prototype["onLogSessionDel"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",34634));
    CTerminalRouter.prototype["onLogClear"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",36480));
    CTerminalRouter.prototype["onLogTerm"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",38177));
    CTerminalRouter.prototype["onUploadFile"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",40856));
    CTerminalRouter.prototype["onHandoff"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",44363));
    CTerminalRouter.prototype["onTerminalProxyToken"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",52891));
    CTerminalRouter.prototype["onTerminalProxy"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",54192));
    const _origDestroy = CTerminalRouter.prototype.Destroy;
    CTerminalRouter.prototype["Destroy"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",56730));
    CTerminalRouter.prototype["_connectImpl"]=eval(__cwasmDecode__.Decode("artgine/server_imple/CTerminalRouter.js","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",58213));
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

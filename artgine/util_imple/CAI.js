import { CWASM as __cwasmDecode__ } from "../basic/CWASM.js";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { execFileSync, spawnSync } from 'child_process';
import { CUtilSystem } from '../system/CUtilSystem.js';
import { PassThrough } from 'stream';
import { CPath } from '../basic/CPath.js';
import { CConsol } from '../basic/CConsol.js';
import { CAI } from '../util/CAI.js';
import { CWASM } from '../basic/CWASM.js';
CWASM.IsSIMD();
export default function CAI_imple() {
    const IS_WIN = process.platform === 'win32';
    const _markHeadlessSession = function (_sessionId) {
        const now = Date.now();
        for (const [id, at] of CAI.gHeadlessSessionIds) {
            if (now - at > 60 * 60 * 1000)
                CAI.gHeadlessSessionIds.delete(id);
        }
        CAI.gHeadlessSessionIds.set(_sessionId, now);
    };
    if (process.platform === 'linux') {
        try {
            let npmRoot = '';
            try {
                npmRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
            }
            catch { }
            const isWritable = (p) => {
                try {
                    let d = p;
                    while (d && !fs.existsSync(d))
                        d = path.dirname(d);
                    fs.accessSync(d, fs.constants.W_OK);
                    return true;
                }
                catch {
                    return false;
                }
            };
            if (!npmRoot || !isWritable(npmRoot)) {
                const userPrefix = path.join(os.homedir(), '.npm-global');
                const userBin = path.join(userPrefix, 'bin');
                try {
                    fs.mkdirSync(userBin, { recursive: true });
                }
                catch { }
                process.env.npm_config_prefix = userPrefix;
                const parts = (process.env.PATH || '').split(path.delimiter);
                if (!parts.includes(userBin))
                    process.env.PATH = userBin + path.delimiter + (process.env.PATH || '');
                CConsol.Log('[CAI] Linux npm global redirected to ' + userPrefix + ' (default global dir not writable).');
            }
        }
        catch { }
    }
    const roleTargets = {
        claude: ['CLAUDE.md', '.claudeignore'],
        codex: ['AGENTS.md', '.codexignore'],
        gpt: ['.github/copilot-instructions.md', '.copilotignore'],
        antigravity: ['AGENTS.md', '.geminiignore'],
        opencode: ['AGENTS.md', '.opencodeignore'],
        grok: ['AGENTS.md', '.grokignore'],
    };
    CAI.IS_WIN = IS_WIN;
    CAI["AIDir"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",0));
    const EMPTY_MCP_PATH = path.join(os.tmpdir(), 'artgine-empty-mcp.json');
    CAI.EMPTY_MCP_PATH = EMPTY_MCP_PATH;
    const getNpmGlobalDir = function () {
        return process.env.APPDATA ? path.join(process.env.APPDATA, 'npm') : path.join(os.homedir(), 'AppData', 'Roaming', 'npm');
    };
    const _resolveClaudeBin = function () {
        const shimPath = path.join(getNpmGlobalDir(), 'claude.cmd');
        return fs.existsSync(shimPath) ? shimPath : (IS_WIN ? 'claude.cmd' : 'claude');
    };
    const GROK_HOME = process.env.GROK_HOME || path.join(os.homedir(), '.grok');
    const _grokBinPath = () => path.join(GROK_HOME, 'bin', IS_WIN ? 'grok.exe' : 'grok');
    const _resolveGrokBin = function () {
        const p = _grokBinPath();
        return fs.existsSync(p) ? p : (IS_WIN ? 'grok.cmd' : 'grok');
    };
    const _createdRoleKeys = new Set();
    const _toAbsDir = (p) => path.resolve(p).replace(/\\/g, '/').replace(/\/?$/, '/');
    const _applyRoleVars = (content, workingDir, artgineDir, host, port, basePath) => {
        let result = content
            .replace(/(## 작업 디렉토리[^\n]*\n- )[^\n]*/m, `$1${workingDir}`)
            .replace(/(## 아티젠 디렉토리[^\n]*\n- )[^\n]*/m, `$1${artgineDir}`);
        if (host !== undefined && port !== undefined) {
            result = result
                .replace(/^(- \*\*주소\*\*: `)[^`]*(`)$/m, `$1${host}$2`)
                .replace(/^(- \*\*포트\*\*: `)[^`]*(`)$/m, `$1${port}$2`);
            if (basePath !== undefined)
                result = result.replace(/^(- \*\*기본 경로\*\*: `)[^`]*(`)$/m, `$1${basePath}$2`);
        }
        return result;
    };
    const _writeRole = (src, dest, workingDir, artgineDir, host, port, basePath) => {
        try {
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            const content = _applyRoleVars(fs.readFileSync(src, 'utf8'), workingDir, artgineDir, host, port, basePath);
            fs.writeFileSync(dest, content, 'utf8');
            return true;
        }
        catch (e) {
            console.warn('[CAI] CreateRole write failed:', dest, e.message);
            return false;
        }
    };
    CAI["CreateRole"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",1679));
    CAI["DeleteRole"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",4920));
    const resolveAgyBin = async function () {
        if (IS_WIN) {
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
    };
    const checkAntigravityLog = function (logPath) {
        try {
            if (!fs.existsSync(logPath))
                return false;
            const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
            const lastLine = lines[lines.length - 1] || '';
            if (/not logged into antigravity/i.test(lastLine))
                return false;
            const recent = lines.slice(-30).join('\n');
            return /Auth done received|experiment refresh|streamGenerateContent/i.test(recent);
        }
        catch {
            return false;
        }
    };
    const checkAuthenticated = async function (provider, bin) {
        switch (provider) {
            case CAI.eProvider.claude: {
                try {
                    const credPath = path.join(os.homedir(), '.claude', '.credentials.json');
                    if (!fs.existsSync(credPath))
                        return false;
                    const data = JSON.parse(fs.readFileSync(credPath, 'utf8'));
                    return !!data.claudeAiOauth;
                }
                catch {
                    return false;
                }
            }
            case CAI.eProvider.codex: {
                try {
                    const authPath = path.join(os.homedir(), '.codex', 'auth.json');
                    if (!fs.existsSync(authPath))
                        return false;
                    const data = JSON.parse(fs.readFileSync(authPath, 'utf8'));
                    return !!(data.OPENAI_API_KEY || data.tokens || data.last_refresh);
                }
                catch {
                    return false;
                }
            }
            case CAI.eProvider.grok: {
                try {
                    const authPath = path.join(GROK_HOME, 'auth.json');
                    if (fs.existsSync(authPath)) {
                        const data = JSON.parse(fs.readFileSync(authPath, 'utf8'));
                        for (const v of Object.values(data ?? {})) {
                            if (v && typeof v === 'object' && (v.key || v.refresh_token))
                                return true;
                        }
                    }
                }
                catch { }
                return !!process.env.XAI_API_KEY;
            }
            case CAI.eProvider.opencode: {
                return new Promise(async (resolve) => {
                    let out = '';
                    let done = false;
                    const finish = (v) => { if (!done) {
                        done = true;
                        resolve(v);
                    } };
                    try {
                        const child = (await CUtilSystem.Spawn(bin, ['auth', 'list']));
                        child.stdout?.on('data', (d) => { out += d.toString('utf8'); });
                        child.on('error', () => finish(false));
                        child.on('close', () => finish(/\d+\s+credentials?/i.test(out)));
                        setTimeout(() => { try {
                            child.kill();
                        }
                        catch { } finish(false); }, 5000);
                    }
                    catch {
                        finish(false);
                    }
                });
            }
            case CAI.eProvider.antigravity: {
                const logPath = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'cli.log');
                if (fs.existsSync(logPath))
                    return checkAntigravityLog(logPath);
                return new Promise(async (resolve) => {
                    let done = false;
                    const finish = (v) => { if (!done) {
                        done = true;
                        resolve(v);
                    } };
                    try {
                        const child = (await CUtilSystem.Spawn(bin, ['--print', 'ping', '--print-timeout', '10s']));
                        child.on('error', () => finish(false));
                        child.on('close', () => finish(checkAntigravityLog(logPath)));
                        setTimeout(() => { try {
                            child.kill();
                        }
                        catch { } finish(checkAntigravityLog(logPath)); }, 12000);
                    }
                    catch {
                        finish(false);
                    }
                });
            }
            default:
                return false;
        }
    };
    CAI["ProviderInfo"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",6442));
    const remainingRatio = function (used) {
        if (typeof used !== 'number' || !Number.isFinite(used))
            return -1;
        const pct = used > 1 ? used / 100 : used;
        return Math.max(0, Math.min(1, 1 - pct));
    };
    const fetchJson = async function (url, headers) {
        try {
            const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
            if (!res.ok)
                return null;
            return await res.json();
        }
        catch {
            return null;
        }
    };
    const mergeClaudeWindow = function (root, baseKey) {
        let max = null;
        for (const key of Object.keys(root ?? {})) {
            if (key !== baseKey && !key.startsWith(baseKey + '_'))
                continue;
            const u = root[key]?.utilization;
            if (typeof u === 'number' && (max === null || u > max))
                max = u;
        }
        return max;
    };
    const getClaudeUsage = async function () {
        const empty = { fiveHour: -1, weekly: -1 };
        try {
            const credPath = path.join(os.homedir(), '.claude', '.credentials.json');
            if (!fs.existsSync(credPath))
                return empty;
            const data = JSON.parse(fs.readFileSync(credPath, 'utf8'));
            const accessToken = data?.claudeAiOauth?.accessToken;
            if (!accessToken)
                return empty;
            const root = await fetchJson('https://api.anthropic.com/api/oauth/usage', {
                Authorization: `Bearer ${accessToken}`,
                'anthropic-beta': 'oauth-2025-04-20',
            });
            if (!root)
                return empty;
            return { fiveHour: remainingRatio(mergeClaudeWindow(root, 'five_hour')), weekly: remainingRatio(mergeClaudeWindow(root, 'seven_day')) };
        }
        catch {
            return empty;
        }
    };
    const listFilesRecursive = function (dir, ext) {
        const out = [];
        const walk = (d) => {
            let entries;
            try {
                entries = fs.readdirSync(d, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const e of entries) {
                const full = path.join(d, e.name);
                if (e.isDirectory())
                    walk(full);
                else if (e.isFile() && e.name.endsWith(ext))
                    out.push(full);
            }
        };
        walk(dir);
        return out;
    };
    const findLatestFile = function (dir, ext) {
        let latest = null;
        let latestMtime = 0;
        for (const full of listFilesRecursive(dir, ext)) {
            try {
                const mtime = fs.statSync(full).mtimeMs;
                if (mtime > latestMtime) {
                    latestMtime = mtime;
                    latest = full;
                }
            }
            catch { }
        }
        return latest;
    };
    const getCodexUsageFromSessions = function () {
        const empty = { fiveHour: -1, weekly: -1 };
        try {
            const sessDir = path.join(os.homedir(), '.codex', 'sessions');
            if (!fs.existsSync(sessDir))
                return empty;
            const latestFile = findLatestFile(sessDir, '.jsonl');
            if (!latestFile)
                return empty;
            const lines = fs.readFileSync(latestFile, 'utf8').trim().split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
                if (!lines[i])
                    continue;
                try {
                    const rec = JSON.parse(lines[i]);
                    const rl = rec?.payload?.rate_limits;
                    if (!rl)
                        continue;
                    const fiveHour = remainingRatio(rl.primary?.used_percent);
                    const weekly = remainingRatio(rl.secondary?.used_percent);
                    if (fiveHour !== -1 || weekly !== -1)
                        return { fiveHour, weekly };
                }
                catch { }
            }
            return empty;
        }
        catch {
            return empty;
        }
    };
    const getCodexUsage = async function () {
        try {
            const authPath = path.join(os.homedir(), '.codex', 'auth.json');
            if (fs.existsSync(authPath)) {
                const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
                const accessToken = auth?.tokens?.access_token;
                if (accessToken) {
                    const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'User-Agent': 'Artgine' };
                    if (auth?.tokens?.account_id)
                        headers['ChatGPT-Account-Id'] = auth.tokens.account_id;
                    const root = await fetchJson('https://chatgpt.com/backend-api/wham/usage', headers);
                    const rl = root?.rate_limit;
                    if (rl) {
                        const fiveHour = remainingRatio(rl.primary_window?.used_percent);
                        const weekly = remainingRatio(rl.secondary_window?.used_percent);
                        if (fiveHour !== -1 || weekly !== -1)
                            return { fiveHour, weekly };
                    }
                }
            }
        }
        catch { }
        return getCodexUsageFromSessions();
    };
    const agyRemaining = function (v) {
        if (typeof v !== 'number' || !Number.isFinite(v))
            return -1;
        const r = v > 1 ? v / 100 : v;
        return Math.max(0, Math.min(1, r));
    };
    const pickAgyWindow = function (buckets, which) {
        const isWeekly = (b) => /week/i.test(b.window) || /week/i.test(b.id) || /week/i.test(b.name);
        const isFive = (b) => /five|5\s*hour|5h/i.test(b.window) || /five|5h/i.test(b.id) || /five\s*hour/i.test(b.name);
        const list = buckets.filter(which === 'weekly' ? isWeekly : isFive);
        if (!list.length)
            return -1;
        const gemini = list.find(b => /gemini/i.test(b.group + ' ' + b.id));
        if (gemini && gemini.remaining >= 0)
            return gemini.remaining;
        let best = -1;
        for (const b of list)
            if (b.remaining > best)
                best = b.remaining;
        return best;
    };
    const usageFromAgyBuckets = function (buckets) {
        if (!buckets.length)
            return null;
        const weekly = pickAgyWindow(buckets, 'weekly');
        const fiveHour = pickAgyWindow(buckets, 'fiveHour');
        if (weekly < 0 && fiveHour < 0)
            return null;
        return { weekly, fiveHour };
    };
    const parseAgyUsageTsv = function (text) {
        const buckets = [];
        for (const line of text.split(/\r?\n/)) {
            const parts = line.split('\t').map(s => s.trim());
            if (parts.length < 3)
                continue;
            const m = parts[2].match(/([\d.]+)\s*%/);
            if (!m)
                continue;
            const remaining = agyRemaining(parseFloat(m[1]));
            if (remaining < 0)
                continue;
            const label = parts[1] || '';
            buckets.push({
                group: parts[0] || '',
                id: '',
                name: label,
                window: /week/i.test(label) ? 'weekly' : (/five|5\s*h/i.test(label) ? 'five_hour' : ''),
                remaining,
            });
        }
        return usageFromAgyBuckets(buckets);
    };
    const parseAgyUsageJson = function (raw) {
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start < 0 || end <= start)
            return parseAgyUsageTsv(raw);
        let root;
        try {
            root = JSON.parse(raw.slice(start, end + 1));
        }
        catch {
            return parseAgyUsageTsv(raw);
        }
        const data = root?.command?.data ?? root?.data ?? root;
        const groups = data?.groups;
        if (Array.isArray(groups)) {
            const buckets = [];
            for (const g of groups) {
                const gname = String(g?.name ?? '');
                if (!Array.isArray(g?.buckets))
                    continue;
                for (const b of g.buckets) {
                    const rem = (typeof b?.remaining_fraction === 'number') ? agyRemaining(b.remaining_fraction)
                        : (typeof b?.remaining_percent === 'number') ? agyRemaining(b.remaining_percent)
                            : (typeof b?.remaining === 'number') ? agyRemaining(b.remaining)
                                : -1;
                    if (rem < 0)
                        continue;
                    buckets.push({
                        group: gname,
                        id: String(b?.id ?? ''),
                        name: String(b?.name ?? ''),
                        window: String(b?.window ?? ''),
                        remaining: rem,
                    });
                }
            }
            const fromGroups = usageFromAgyBuckets(buckets);
            if (fromGroups)
                return fromGroups;
        }
        if (typeof root?.response === 'string')
            return parseAgyUsageTsv(root.response);
        return null;
    };
    const parseAgyUsageScreen = function (text) {
        const fromTsv = parseAgyUsageTsv(text);
        if (fromTsv)
            return fromTsv;
        const labeledWeekly = [...text.matchAll(/Weekly Limit Remaining[^\d%]*([\d.]+)\s*%/gi)]
            .map(m => agyRemaining(parseFloat(m[1]))).filter(v => v >= 0);
        const labeledFive = [...text.matchAll(/(?:Five Hour|5-Hour|5 Hour)[^\d%]*([\d.]+)\s*%/gi)]
            .map(m => agyRemaining(parseFloat(m[1]))).filter(v => v >= 0);
        if (labeledWeekly.length) {
            return { weekly: labeledWeekly[0], fiveHour: labeledFive.length ? labeledFive[0] : -1 };
        }
        const geminiSec = text.match(/Gemini[\s\S]{0,500}/i);
        if (geminiSec) {
            const wm = geminiSec[0].match(/([\d.]+)\s*%/);
            if (wm)
                return { weekly: agyRemaining(parseFloat(wm[1])), fiveHour: -1 };
        }
        let pcts = [...text.matchAll(/\]\s*([\d.]+)\s*%/g)].map(m => agyRemaining(parseFloat(m[1]))).filter(v => v >= 0);
        if (!pcts.length) {
            pcts = [...text.matchAll(/([\d.]+)\s*%/g)].map(m => agyRemaining(parseFloat(m[1]))).filter(v => v >= 0);
        }
        if (pcts.length >= 4)
            return { weekly: pcts[0], fiveHour: pcts[1] };
        if (pcts.length >= 1)
            return { weekly: pcts[0], fiveHour: -1 };
        return null;
    };
    const getAntigravityUsageFromPrint = function (bin) {
        try {
            const r = spawnSync(bin, ['--print', '/usage', '--output-format', 'json', '--print-timeout', '30s'], {
                encoding: 'utf8',
                timeout: 35000,
                windowsHide: true,
                maxBuffer: 20 * 1024 * 1024,
                shell: false,
                env: process.env,
                cwd: CPath.WorkingPath(),
            });
            if (r.error)
                return null;
            const out = `${typeof r.stdout === 'string' ? r.stdout : ''}\n${typeof r.stderr === 'string' ? r.stderr : ''}`;
            return parseAgyUsageJson(out);
        }
        catch {
            return null;
        }
    };
    const loadPtyDeps = async function () {
        try {
            const ptyModRaw = await import('node-pty');
            const xtermHeadless = await import('@xterm/headless');
            const HeadlessTerminal = xtermHeadless.Terminal ?? xtermHeadless.default?.Terminal;
            return { ptyMod: (ptyModRaw.default ?? ptyModRaw), HeadlessTerminal };
        }
        catch {
            CConsol.Log('CAI: node-pty/@xterm/headless 미설치로 PTY 사용량 조회를 건너뜁니다.');
            return null;
        }
    };
    const getAntigravityUsageFromPty = async function (bin) {
        const empty = { fiveHour: -1, weekly: -1 };
        const deps = await loadPtyDeps();
        if (!deps)
            return empty;
        const { ptyMod, HeadlessTerminal } = deps;
        return new Promise((resolve) => {
            const cols = 120, rows = 40;
            const headless = new HeadlessTerminal({ cols, rows, allowProposedApi: true, scrollback: 500 });
            let child;
            try {
                child = ptyMod.spawn(bin, ['--dangerously-skip-permissions', '--add-dir', CPath.WorkingPath()], {
                    name: 'xterm-color', cols, rows, cwd: CPath.WorkingPath(), env: process.env,
                });
            }
            catch {
                resolve(empty);
                return;
            }
            let settled = false;
            const timers = [];
            const finish = (v) => {
                if (settled)
                    return;
                settled = true;
                for (const t of timers)
                    clearTimeout(t);
                try {
                    const pid = child?.pid;
                    try {
                        child.kill();
                    }
                    catch { }
                    if (pid) {
                        try {
                            process.kill(pid);
                        }
                        catch { }
                    }
                }
                catch { }
                resolve(v);
            };
            let writeChain = Promise.resolve();
            child.onData((d) => {
                writeChain = writeChain.then(() => new Promise((res) => {
                    try {
                        headless.write(d, () => res());
                    }
                    catch {
                        res();
                    }
                }));
            });
            const screenText = () => {
                const buf = headless.buffer.active;
                const lines = [];
                const end = buf.baseY + rows;
                for (let i = 0; i < end; i++) {
                    const line = buf.getLine(i);
                    if (line)
                        lines.push(line.translateToString(true).replace(/\s+$/, ''));
                }
                return lines.filter(l => l.length).join('\n');
            };
            const parse = () => parseAgyUsageScreen(screenText());
            let usageSentAt = 0;
            let sendCount = 0;
            const sendUsage = () => {
                if (settled)
                    return;
                try {
                    child.write('/usage\r');
                }
                catch { }
                usageSentAt = Date.now();
                sendCount++;
            };
            const isReady = () => {
                const t = screenText();
                return /Antigravity CLI/i.test(t) && (/\n>\s*$/.test(t) || /\n>\n/.test(t) || />\s*$/.test(t));
            };
            const tick = () => {
                if (settled)
                    return;
                const v = parse();
                if (v) {
                    finish(v);
                    return;
                }
                if (sendCount === 0 && isReady()) {
                    sendUsage();
                    return;
                }
                if (sendCount > 0 && sendCount < 3 && Date.now() - usageSentAt > 3000) {
                    sendUsage();
                }
            };
            timers.push(setInterval(tick, 500));
            timers.push(setTimeout(() => { if (sendCount === 0)
                sendUsage(); }, 8000));
            timers.push(setTimeout(() => {
                try {
                    const t = screenText();
                    CConsol.Log(`[CAI] antigravity usage parse failed. sends=${sendCount} screenLen=${t.length} snippet=${JSON.stringify(t.slice(0, 400))}`);
                }
                catch { }
                finish(empty);
            }, 20000));
        });
    };
    const getAntigravityUsage = async function () {
        const empty = { fiveHour: -1, weekly: -1 };
        const bin = await resolveAgyBin();
        if (bin !== 'agy' && !fs.existsSync(bin))
            return empty;
        const printed = getAntigravityUsageFromPrint(bin);
        if (printed)
            return printed;
        return getAntigravityUsageFromPty(bin);
    };
    const getGrokUsage = async function () {
        const empty = { fiveHour: -1, weekly: -1 };
        const bin = _resolveGrokBin();
        const deps = await loadPtyDeps();
        if (!deps)
            return empty;
        const { ptyMod, HeadlessTerminal } = deps;
        return new Promise((resolve) => {
            const cols = 120, rows = 40;
            const headless = new HeadlessTerminal({ cols, rows, allowProposedApi: true, scrollback: 500 });
            let child;
            try {
                child = ptyMod.spawn(bin, ['--no-alt-screen', '--permission-mode', 'default'], {
                    name: 'xterm-color', cols, rows, cwd: CPath.WorkingPath(), env: process.env,
                });
            }
            catch {
                resolve(empty);
                return;
            }
            let settled = false;
            const timers = [];
            const finish = (v) => {
                if (settled)
                    return;
                settled = true;
                for (const t of timers)
                    clearTimeout(t);
                try {
                    child.kill();
                }
                catch { }
                resolve(v);
            };
            child.onData((d) => headless.write(d));
            const screenText = () => {
                const buf = headless.buffer.active;
                const lines = [];
                const end = buf.baseY + rows;
                for (let i = 0; i < end; i++) {
                    const line = buf.getLine(i);
                    if (line)
                        lines.push(line.translateToString(true).replace(/\s+$/, ''));
                }
                return lines.filter(l => l.length).join('\n');
            };
            const parse = () => {
                const m = screenText().match(/Weekly limit:\s*([\d.]+)%/);
                if (!m)
                    return null;
                return { fiveHour: -1, weekly: remainingRatio(parseFloat(m[1])) };
            };
            timers.push(setTimeout(() => { try {
                child.write('/usage show');
            }
            catch { } }, 2500));
            timers.push(setTimeout(() => { try {
                child.write('\r');
            }
            catch { } }, 3000));
            for (let t = 3500; t <= 11000; t += 1000) {
                timers.push(setTimeout(() => { const v = parse(); if (v)
                    finish(v); }, t));
            }
            timers.push(setTimeout(() => finish(empty), 12000));
        });
    };
    const OPENCODE_GO_CAP_5H = 12;
    const OPENCODE_GO_CAP_7D = 30;
    const _loadOpencodeGoPrices = function () {
        const map = new Map();
        try {
            const settings = JSON.parse(fs.readFileSync(path.join(CAI.AIDir(), 'settings.json'), 'utf8'));
            const list = Array.isArray(settings?.models?.opencode) ? settings.models.opencode : [];
            for (const item of list) {
                const value = String(item?.value ?? '');
                if (!value.startsWith('opencode-go/'))
                    continue;
                const input = Number(item.costInputPer1M), output = Number(item.costOutputPer1M);
                if (!Number.isFinite(input) || !Number.isFinite(output))
                    continue;
                const cachedReadRaw = item.costCachedReadPer1M, cachedWriteRaw = item.costCachedWritePer1M;
                map.set(value.slice('opencode-go/'.length), {
                    input, output,
                    cachedRead: (typeof cachedReadRaw === 'number' && Number.isFinite(cachedReadRaw)) ? cachedReadRaw : input,
                    cachedWrite: (typeof cachedWriteRaw === 'number' && Number.isFinite(cachedWriteRaw)) ? cachedWriteRaw : 0,
                });
            }
        }
        catch { }
        return map;
    };
    const getOpencodeUsage = async function () {
        const empty = { fiveHour: -1, weekly: -1 };
        try {
            const dataDir = process.env.OPENCODE_DATA_DIR || path.join(os.homedir(), '.local', 'share', 'opencode');
            const dbPath = path.join(dataDir, 'opencode.db');
            if (!fs.existsSync(dbPath))
                return empty;
            const now = Date.now();
            const FIVE_HOUR_MS = 5 * 3600 * 1000;
            const SEVEN_DAY_MS = 7 * 24 * 3600 * 1000;
            let sqlite3;
            let open;
            try {
                const sqlite3Mod = await import('sqlite3');
                sqlite3 = sqlite3Mod.default ?? sqlite3Mod;
                ({ open } = await import('sqlite'));
            }
            catch (e) {
                CConsol.Log('CAI: sqlite3/sqlite 미설치로 OpenCode 사용량 조회를 건너뜁니다.');
                return empty;
            }
            const db = await open({ filename: dbPath, driver: sqlite3.Database, mode: sqlite3.OPEN_READONLY });
            let rows;
            try {
                rows = await db.all('SELECT data FROM message WHERE time_created >= ?', [now - SEVEN_DAY_MS]);
            }
            finally {
                await db.close();
            }
            const prices = _loadOpencodeGoPrices();
            let sawGoMessage = false;
            const msgs = [];
            for (const row of rows) {
                let msg;
                try {
                    msg = JSON.parse(row.data);
                }
                catch {
                    continue;
                }
                if (msg?.providerID !== 'opencode-go' || msg?.role !== 'assistant')
                    continue;
                sawGoMessage = true;
                const completed = Number(msg?.time?.completed ?? msg?.time?.created);
                if (!Number.isFinite(completed))
                    continue;
                if (now - completed > SEVEN_DAY_MS)
                    continue;
                const price = prices.get(String(msg.modelID));
                let cost;
                if (price) {
                    const t = msg.tokens ?? {};
                    const input = Number(t.input) || 0;
                    const output = Number(t.output) || 0;
                    const cachedRead = Number(t.cache?.read) || 0;
                    const cachedWrite = Number(t.cache?.write) || 0;
                    cost = (input * price.input + output * price.output + cachedRead * price.cachedRead + cachedWrite * price.cachedWrite) / 1_000_000;
                }
                else {
                    const raw = Number(msg.cost);
                    cost = Number.isFinite(raw) ? raw : 0;
                }
                msgs.push({ atMs: completed, cost });
            }
            if (!sawGoMessage)
                return empty;
            const sumSince = (sinceMs, uptoMs) => msgs.reduce((sum, m) => (m.atMs >= sinceMs && m.atMs <= uptoMs) ? sum + m.cost : sum, 0);
            const cost5h = sumSince(now - FIVE_HOUR_MS, now);
            const cost7d = sumSince(now - SEVEN_DAY_MS, now);
            return {
                fiveHour: Math.max(0, Math.min(1, 1 - cost5h / OPENCODE_GO_CAP_5H)),
                weekly: Math.max(0, Math.min(1, 1 - cost7d / OPENCODE_GO_CAP_7D)),
            };
        }
        catch {
            return empty;
        }
    };
    CAI["ProviderUsage"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",9490));
    const captureStdout = function (bin, args, timeoutMs = 12000) {
        try {
            const needsShell = IS_WIN && (/\.cmd$/i.test(bin) ||
                (!/[/\\]/.test(bin) && !/\.\w+$/.test(bin)));
            const r = spawnSync(bin, args, {
                encoding: 'utf8',
                timeout: timeoutMs,
                windowsHide: true,
                maxBuffer: 20 * 1024 * 1024,
                shell: needsShell,
                env: process.env,
            });
            if (r.error)
                return '';
            const out = typeof r.stdout === 'string' ? r.stdout : '';
            if (out.trim())
                return out;
            return typeof r.stderr === 'string' ? r.stderr : '';
        }
        catch {
            return '';
        }
    };
    const asModelEntry = function (value, label) {
        return { value, label: (label && label.trim()) ? label.trim() : value };
    };
    const _parseClaudeModelId = function (id) {
        const m = id.match(/^claude-(opus|sonnet|haiku|fable)-(.+)$/i);
        if (!m)
            return null;
        const family = m[1].toLowerCase();
        let rest = m[2];
        let date = 0;
        const dateM = rest.match(/-(\d{8})$/);
        if (dateM) {
            date = parseInt(dateM[1], 10) || 0;
            rest = rest.slice(0, -(dateM[1].length + 1));
        }
        const nums = rest.split(/[.-]/).map(s => parseInt(s, 10)).filter(n => Number.isFinite(n));
        return { family, nums, date };
    };
    const _cmpClaudeModel = function (a, b) {
        const len = Math.max(a.nums.length, b.nums.length);
        for (let i = 0; i < len; i++) {
            const av = a.nums[i] ?? 0;
            const bv = b.nums[i] ?? 0;
            if (av !== bv)
                return av - bv;
        }
        if (a.date === 0 && b.date !== 0)
            return 1;
        if (b.date === 0 && a.date !== 0)
            return -1;
        return a.date - b.date;
    };
    const getClaudeModels = async function () {
        try {
            const credPath = path.join(os.homedir(), '.claude', '.credentials.json');
            if (!fs.existsSync(credPath))
                return [];
            const data = JSON.parse(fs.readFileSync(credPath, 'utf8'));
            const accessToken = data?.claudeAiOauth?.accessToken;
            if (!accessToken)
                return [];
            const root = await fetchJson('https://api.anthropic.com/v1/models?limit=100', {
                Authorization: `Bearer ${accessToken}`,
                'anthropic-version': '2023-06-01',
            });
            if (!root || !Array.isArray(root.data))
                return [];
            const best = new Map();
            for (const m of root.data) {
                if (typeof m?.id !== 'string' || !m.id)
                    continue;
                const parsed = _parseClaudeModelId(m.id);
                if (!parsed)
                    continue;
                const entry = asModelEntry(m.id, typeof m.display_name === 'string' ? m.display_name : m.id);
                const cur = best.get(parsed.family);
                if (!cur || _cmpClaudeModel(parsed, cur.parsed) > 0) {
                    best.set(parsed.family, { entry, parsed });
                }
            }
            const order = ['sonnet', 'opus', 'haiku', 'fable'];
            return order.filter(f => best.has(f)).map(f => best.get(f).entry);
        }
        catch {
            return [];
        }
    };
    const getCodexModels = async function () {
        const fromCatalog = function (models) {
            return models
                .filter((m) => typeof m?.slug === 'string' && m.slug && m.visibility !== 'hide')
                .map((m) => asModelEntry(m.slug, typeof m.display_name === 'string' ? m.display_name : m.slug));
        };
        try {
            const bin = IS_WIN ? 'codex.cmd' : 'codex';
            const out = captureStdout(bin, ['debug', 'models'], 20000);
            const brace = out.indexOf('{');
            if (brace >= 0) {
                const j = JSON.parse(out.slice(brace));
                if (Array.isArray(j?.models) && j.models.length)
                    return fromCatalog(j.models);
            }
        }
        catch { }
        try {
            const cachePath = path.join(os.homedir(), '.codex', 'models_cache.json');
            if (!fs.existsSync(cachePath))
                return [];
            const j = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            if (Array.isArray(j?.models) && j.models.length)
                return fromCatalog(j.models);
        }
        catch { }
        return [];
    };
    const getGrokModels = async function () {
        try {
            const bin = _resolveGrokBin();
            const out = captureStdout(bin, ['models'], 15000);
            const list = [];
            for (const line of out.split(/\r?\n/)) {
                const m = line.match(/^\s*\*\s+([A-Za-z0-9._-]+)/);
                if (m)
                    list.push(asModelEntry(m[1]));
            }
            if (list.length)
                return list;
        }
        catch { }
        try {
            const cachePath = path.join(GROK_HOME, 'models_cache.json');
            if (!fs.existsSync(cachePath))
                return [];
            const j = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            const map = j?.models;
            if (!map || typeof map !== 'object')
                return [];
            const list = [];
            for (const [key, ent] of Object.entries(map)) {
                const info = ent?.info ?? ent;
                if (info?.hidden === true)
                    continue;
                const id = typeof info?.id === 'string' ? info.id
                    : (typeof info?.model === 'string' ? info.model : key);
                if (!id)
                    continue;
                const name = typeof info?.name === 'string' ? info.name : id;
                list.push(asModelEntry(id, name));
            }
            return list;
        }
        catch {
            return [];
        }
    };
    const getAntigravityModels = async function () {
        try {
            const bin = await resolveAgyBin();
            if (bin === 'agy' && !fs.existsSync(bin)) {
            }
            const out = captureStdout(bin, ['models'], 15000);
            const list = [];
            for (const line of out.split(/\r?\n/)) {
                const id = line.trim();
                if (!id || /\s/.test(id) || /^usage of/i.test(id) || /^flags /i.test(id))
                    continue;
                list.push(asModelEntry(id));
            }
            return list;
        }
        catch {
            return [];
        }
    };
    const getOpencodeModels = async function () {
        try {
            const bin = IS_WIN ? 'opencode.cmd' : 'opencode';
            const out = captureStdout(bin, ['models'], 20000);
            const list = [];
            const seen = new Set();
            for (const line of out.split(/\r?\n/)) {
                const id = line.trim();
                if (!id || !id.includes('/') || /\s/.test(id))
                    continue;
                if (seen.has(id))
                    continue;
                seen.add(id);
                const slash = id.indexOf('/');
                const prov = id.slice(0, slash);
                const name = id.slice(slash + 1);
                let label = id;
                if (/^ollama[-_]/i.test(prov) || /^lmstudio[-_]/i.test(prov)) {
                    const hostRaw = prov.replace(/^(ollama|lmstudio)[-_]/i, '')
                        .replace(/_/g, '.')
                        .replace(/\.(\d+)$/, ':$1');
                    const kind = /^lmstudio/i.test(prov) ? 'LM Studio' : 'Ollama';
                    label = `${kind} (${hostRaw}) - ${name}`;
                }
                else if (prov === 'opencode-go') {
                    label = `${name} (Go)`;
                }
                else if (prov === 'opencode') {
                    label = /free$/i.test(name) ? `${name.replace(/-free$/i, '')} (Free)` : name;
                }
                else {
                    label = name || id;
                }
                list.push(asModelEntry(id, label));
            }
            return list;
        }
        catch {
            return [];
        }
    };
    CAI["ProviderModels"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",11557));
    const ensureAntigravitySettings = function () {
        try {
            const settingsPath = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'settings.json');
            fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
            let settings = {};
            if (fs.existsSync(settingsPath)) {
                try {
                    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                }
                catch {
                    settings = {};
                }
            }
            settings.toolPermission = 'strict';
            settings.enableTerminalSandbox = false;
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        }
        catch (e) {
            console.log(`[CAI] Failed to update antigravity settings.json: ${e}`);
        }
    };
    const ensureClaudeSettings = function () {
        try {
            const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
            fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
            let settings = {};
            if (fs.existsSync(settingsPath)) {
                try {
                    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                }
                catch {
                    settings = {};
                }
            }
            const perms = (settings.permissions && typeof settings.permissions === 'object')
                ? settings.permissions : {};
            perms.defaultMode = 'default';
            settings.permissions = perms;
            settings.remoteControlAtStartup = false;
            const env = (settings.env && typeof settings.env === 'object') ? settings.env : {};
            env.DISABLE_TELEMETRY = '1';
            env.DISABLE_GROWTHBOOK = '1';
            settings.env = env;
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        }
        catch (e) {
            console.warn('[CAI] Failed to update claude settings.json:', e.message);
        }
    };
    const _setTomlSectionKeys = function (filePath, section, desired) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        const lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8').split(/\r?\n/) : [];
        const fmt = (v) => typeof v === 'boolean' ? String(v) : `"${v}"`;
        const sectionRe = new RegExp(`^\\[${section.replace(/\./g, '\\.')}\\]\\s*$`);
        const secIdx = lines.findIndex(l => sectionRe.test(l));
        if (secIdx === -1) {
            if (lines.length && lines[lines.length - 1] !== '')
                lines.push('');
            lines.push(`[${section}]`);
            for (const key of Object.keys(desired))
                lines.push(`${key} = ${fmt(desired[key])}`);
        }
        else {
            let sectionEnd = lines.length;
            for (let i = secIdx + 1; i < lines.length; i++) {
                if (/^\[.*\]\s*$/.test(lines[i])) {
                    sectionEnd = i;
                    break;
                }
            }
            for (const key of Object.keys(desired)) {
                const valueLine = `${key} = ${fmt(desired[key])}`;
                const keyIdx = lines.findIndex((l, i) => i > secIdx && i < sectionEnd && new RegExp(`^${key}\\s*=`).test(l));
                if (keyIdx === -1) {
                    lines.splice(secIdx + 1, 0, valueLine);
                    sectionEnd++;
                }
                else
                    lines[keyIdx] = valueLine;
            }
        }
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    };
    const ensureGrokConfig = function () {
        try {
            _setTomlSectionKeys(path.join(GROK_HOME, 'config.toml'), 'ui', {
                permission_mode: 'default',
                default_selected_permission: 'allow_once',
                compact_mode: true,
                show_timestamps: false,
            });
            _setTomlSectionKeys(path.join(GROK_HOME, 'config.toml'), 'features', {
                telemetry: false,
            });
            _setTomlSectionKeys(path.join(GROK_HOME, 'pager.toml'), 'scrollback.display', {
                sticky_headers: false,
            });
        }
        catch (e) {
            console.warn('[CAI] Failed to update grok config:', e.message);
        }
    };
    const ensureOpencodeConfig = function () {
        try {
            const ocPath = path.join(CPath.WorkingPath(), 'opencode.json');
            let config = {};
            if (fs.existsSync(ocPath)) {
                try {
                    config = JSON.parse(fs.readFileSync(ocPath, 'utf8'));
                }
                catch {
                    config = {};
                }
            }
            if (!config || typeof config !== 'object')
                config = {};
            config.share = 'disabled';
            fs.writeFileSync(ocPath, JSON.stringify(config, null, 2), 'utf8');
        }
        catch (e) {
            console.warn('[CAI] Failed to update opencode.json:', e.message);
        }
    };
    const _installed = new Set();
    const _installing = new Map();
    const _isClaudeExeLocked = function () {
        const pkgBin = path.join(getNpmGlobalDir(), 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
        if (!fs.existsSync(pkgBin))
            return false;
        try {
            const fd = fs.openSync(pkgBin, 'r+');
            fs.closeSync(fd);
            return false;
        }
        catch {
            return true;
        }
    };
    const _isGrokExeLocked = function () {
        const binPath = _grokBinPath();
        if (!fs.existsSync(binPath))
            return false;
        try {
            const fd = fs.openSync(binPath, 'r+');
            fs.closeSync(fd);
            return false;
        }
        catch {
            return true;
        }
    };
    CAI["ProviderInstall"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",13293));
    const ensureEmptyMcpFile = function () {
        try {
            if (!fs.existsSync(EMPTY_MCP_PATH)) {
                fs.mkdirSync(path.dirname(EMPTY_MCP_PATH), { recursive: true });
                fs.writeFileSync(EMPTY_MCP_PATH, JSON.stringify({ mcpServers: {} }), 'utf8');
            }
        }
        catch { }
    };
    const resolveBin = function (name) {
        return [IS_WIN ? name + '.cmd' : name];
    };
    const resolveTerminalBin = resolveBin;
    const getCodexMcpKeys = function () {
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
    };
    const wrapOpencodeJsonStdout = function (child) {
        const rawStdout = child.stdout;
        if (!rawStdout)
            return;
        const textOut = new PassThrough();
        const errOut = new PassThrough();
        const rawStderr = child.stderr;
        if (rawStderr)
            rawStderr.on('data', (d) => errOut.write(d));
        let errEnded = false;
        const endErr = () => { if (!errEnded) {
            errEnded = true;
            errOut.end();
        } };
        let buf = '';
        rawStdout.on('data', (data) => {
            buf += data.toString('utf8');
            let idx;
            while ((idx = buf.indexOf('\n')) >= 0) {
                const line = buf.slice(0, idx).trim();
                buf = buf.slice(idx + 1);
                if (!line)
                    continue;
                try {
                    const evt = JSON.parse(line);
                    if (evt.sessionID && !child._opencodeSessionId) {
                        child._opencodeSessionId = evt.sessionID;
                        CConsol.Log(`[wrapOpencode] sessionID=${evt.sessionID}`, CConsol.eColor.green);
                    }
                    if (evt.type === 'text' && typeof evt.part?.text === 'string') {
                        textOut.write(evt.part.text);
                    }
                    else if (evt.type === 'error') {
                        const errMsg = evt.error?.data?.message || evt.error?.name || evt.error?.message || 'opencode error';
                        errOut.write(errMsg + '\n');
                    }
                }
                catch { }
            }
        });
        rawStdout.on('end', () => { textOut.end(); endErr(); });
        rawStdout.on('error', (e) => { textOut.emit('error', e); endErr(); });
        if (rawStderr)
            rawStderr.on('end', endErr);
        Object.defineProperty(child, 'stdout', { value: textOut, configurable: true });
        Object.defineProperty(child, 'stderr', { value: errOut, configurable: true });
    };
    const wrapCodexJsonStdout = function (child) {
        const rawStdout = child.stdout;
        if (!rawStdout)
            return;
        const textOut = new PassThrough();
        const errOut = new PassThrough();
        const rawStderr = child.stderr;
        if (rawStderr)
            rawStderr.on('data', (d) => errOut.write(d));
        let errEnded = false;
        const endErr = () => { if (!errEnded) {
            errEnded = true;
            errOut.end();
        } };
        let buf = '';
        let lineCount = 0;
        rawStdout.on('data', (data) => {
            buf += data.toString('utf8');
            let idx;
            while ((idx = buf.indexOf('\n')) >= 0) {
                const line = buf.slice(0, idx).trim();
                buf = buf.slice(idx + 1);
                if (!line)
                    continue;
                lineCount++;
                try {
                    const evt = JSON.parse(line);
                    if (evt.type === 'thread.started' && evt.thread_id) {
                        CConsol.Log(`[wrapCodex] thread id=${evt.thread_id}`, CConsol.eColor.green);
                        child.emit('codex-session-id', evt.thread_id);
                    }
                    else if (evt.type === 'item.completed' && evt.item?.type === 'agent_message' && typeof evt.item.text === 'string') {
                        textOut.write(evt.item.text);
                    }
                    else {
                        CConsol.Log(`[wrapCodex] LINE ${lineCount} type=${evt.type}${evt.item?.type ? '/' + evt.item.type : ''}`, CConsol.eColor.cyan);
                    }
                }
                catch {
                    CConsol.Log(`[wrapCodex] PARSE FAIL line ${lineCount}: ${JSON.stringify(line.slice(0, 150))}`, CConsol.eColor.red);
                }
            }
        });
        rawStdout.on('end', () => { textOut.end(); endErr(); });
        rawStdout.on('error', (e) => { textOut.emit('error', e); endErr(); });
        if (rawStderr)
            rawStderr.on('end', endErr);
        Object.defineProperty(child, 'stdout', { value: textOut, configurable: true });
        Object.defineProperty(child, 'stderr', { value: errOut, configurable: true });
    };
    CAI["Chat"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",22772));
    CAI["Cmd"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",32117));
    CAI["Terminal"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",35874));
}

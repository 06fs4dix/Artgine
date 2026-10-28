import { CWASM as __cwasmDecode__ } from "../basic/CWASM.js";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { execFileSync, spawn, spawnSync } from 'child_process';
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
    CAI["CreateRole"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",1754));
    CAI["DeleteRole"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",5427));
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
    CAI["ProviderInfo"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",7057));
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
    const getAntigravityUsageFromPrint = async function (bin) {
        const tmpBase = path.join(os.tmpdir(), `agy-usage-${randomUUID()}`);
        const outPath = tmpBase + '.out';
        const errPath = tmpBase + '.err';
        let outFd = -1, errFd = -1;
        try {
            outFd = fs.openSync(outPath, 'w');
            errFd = fs.openSync(errPath, 'w');
            const exited = await new Promise((resolve) => {
                let child;
                try {
                    child = spawn(bin, ['--print', '/usage', '--output-format', 'json', '--print-timeout', '30s'], {
                        stdio: ['ignore', outFd, errFd],
                        windowsHide: true,
                        shell: false,
                        env: process.env,
                        cwd: CPath.WorkingPath(),
                    });
                }
                catch {
                    resolve(false);
                    return;
                }
                const timer = setTimeout(() => { try {
                    child.kill();
                }
                catch { } resolve(false); }, 35000);
                child.once('error', () => { clearTimeout(timer); resolve(false); });
                child.once('exit', () => { clearTimeout(timer); resolve(true); });
            });
            if (!exited)
                return null;
            const out = `${fs.readFileSync(outPath, 'utf8')}\n${fs.readFileSync(errPath, 'utf8')}`;
            return parseAgyUsageJson(out);
        }
        catch {
            return null;
        }
        finally {
            if (outFd >= 0) {
                try {
                    fs.closeSync(outFd);
                }
                catch { }
            }
            if (errFd >= 0) {
                try {
                    fs.closeSync(errFd);
                }
                catch { }
            }
            try {
                fs.unlinkSync(outPath);
            }
            catch { }
            try {
                fs.unlinkSync(errPath);
            }
            catch { }
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
        const printed = await getAntigravityUsageFromPrint(bin);
        if (printed)
            return printed;
        return getAntigravityUsageFromPty(bin);
    };
    const _isGrokFreeTier = function () {
        try {
            const logPath = path.join(GROK_HOME, 'logs', 'unified.jsonl');
            const fd = fs.openSync(logPath, 'r');
            let text = '';
            try {
                const size = fs.fstatSync(fd).size;
                const len = Math.min(size, 1024 * 1024);
                const buf = Buffer.alloc(len);
                fs.readSync(fd, buf, 0, len, size - len);
                text = buf.toString('utf8');
            }
            finally {
                fs.closeSync(fd);
            }
            const lines = text.split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i];
                if (!line.includes('"subscriptionTier"'))
                    continue;
                const tier = line.match(/"subscriptionTier":"([^"]*)"/)?.[1];
                if (tier !== 'Free')
                    return false;
                const ts = Date.parse(line.match(/"ts":"([^"]+)"/)?.[1] ?? '');
                if (!Number.isFinite(ts))
                    return false;
                try {
                    if (fs.statSync(path.join(GROK_HOME, 'auth.json')).mtimeMs > ts)
                        return false;
                }
                catch { }
                return true;
            }
        }
        catch { }
        return false;
    };
    const getGrokUsageFromApi = async function () {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(GROK_HOME, 'auth.json'), 'utf8'));
            const entry = Object.values(data ?? {}).find(v => v && typeof v === 'object' && v.key);
            if (!entry)
                return null;
            const headers = { Authorization: `Bearer ${entry.key}`, Accept: 'application/json' };
            if (entry.user_id)
                headers['x-userid'] = String(entry.user_id);
            const root = await fetchJson('https://cli-chat-proxy.grok.com/v1/billing?format=credits', headers);
            const pct = root?.config?.creditUsagePercent;
            if (typeof pct !== 'number' || !Number.isFinite(pct))
                return null;
            return { fiveHour: -1, weekly: Math.max(0, Math.min(1, 1 - pct / 100)) };
        }
        catch {
            return null;
        }
    };
    const getGrokUsage = async function () {
        const empty = { fiveHour: -1, weekly: -1 };
        const fromApi = await getGrokUsageFromApi();
        if (fromApi)
            return fromApi;
        if (_isGrokFreeTier())
            return empty;
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
                const lines = screenText().split('\n');
                let at = -1;
                for (let i = lines.length - 1; i >= 0; i--)
                    if (/Weekly limit/i.test(lines[i])) {
                        at = i;
                        break;
                    }
                if (at < 0)
                    return null;
                for (let i = at; i < Math.min(lines.length, at + 5); i++) {
                    const m = (i === at ? lines[i].replace(/^.*Weekly limit/i, '') : lines[i]).match(/([\d.]+)\s*%/);
                    if (m)
                        return { fiveHour: -1, weekly: remainingRatio(parseFloat(m[1])) };
                }
                return null;
            };
            timers.push(setTimeout(() => { try {
                child.write('/usage');
            }
            catch { } }, 2500));
            timers.push(setTimeout(() => { try {
                child.write('\r');
            }
            catch { } }, 3000));
            timers.push(setTimeout(() => { if (parse())
                return; try {
                child.write('\x1b');
            }
            catch { } }, 6000));
            timers.push(setTimeout(() => { if (settled)
                return; try {
                child.write('/usage show');
            }
            catch { } }, 6300));
            timers.push(setTimeout(() => { if (settled)
                return; try {
                child.write('\r');
            }
            catch { } }, 6800));
            timers.push(setTimeout(() => { if (settled)
                return; try {
                child.write('\r');
            }
            catch { } }, 7300));
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
    CAI["ProviderUsage"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",10127));
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
    CAI["ProviderModels"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","S2SjSRPLp3PmpZh0ShhxhwhxOhpPhShuSBhZpIh9SRh6POhpSyPoS7PohYSnPHpFPEPvPlSsPrpZhJPvhnSvpghjhmpphDpiSqPuPkSgPySLpHp3P2SXSOhqS8P6SoppPMpqhwP1hzSQhMpmhWh3p4SgpTpfPbhuPfhEPwhaSBSSSepCpJpuSnSrPRPEPOpohWhfSMSjpWSpPTP7pcSvh9p4hkprpmSZpUSDpphoPPhPPZPDOpPophSJhHh6PYp2hEPcpgPZOpSySPp4h5S4SQSsSeSVPUh1pDPVSUPlPPpAhgp4h4pkSAh5PghJhMhFSUhEh2OfPNPbPNhXpePYSFP7hAPVS6pVS9PAhlhZpQSDS4SVPYP3hJPrPmOppDS1P3p4pYh7hWPLS5P1hyPgheSopRPPPbP2Pqp0hdPxS6SVSMP4PVhpphSjSShXSySVhLP1PchWSChdhQPrhiP5SCP3Sch2P0h6pGPiSnSBPoSIPKhthLpepApTpapwPrPCp8Sgh6PbprSvhJPXhbpsPOPmSkpDhypspOS7PmpmPhpbPMhwpQSOpVpXSHPDPSP7pwhmpYSjPapFSSOrpOpbpWhtPnSJSySWpIhIPJptpbSspVPNPQhbhrhkSypjS1pUhFSzhNpkhxShS8hnSPSDPqP2S1SmPIhNptP9hhPWpaSuPnpVhxSoPCpEPbhZhEpghKpshIpRPepePQpNSuhkSXPaPAPYp4hSSnOPhjS3hbpvpwplhLSLhDpaSGpVpOSSplhnSqSWhMp3pKSGSlpshDhRh7pcptp8PQhupiSmhIOOSEPThCPHpWpsPWhhSPSphKP7SbSwPCSZPEPRPQpdSFPdpxpopRpQh2PVSVpzpGpPpFPRSkhAhihxOSh7P4PGSMp8PfSvPBS9SrPrSOhJhqpeScSUpzSCPYPDpZP3pZPZh9STh9popvPsSwh1PqPfS1PAh5ShpvpUOrhapsSyPrSISUpaPJP1PTh2hTp8P5PpS6pHhrSsPEPrPgPbPbpQS1PgS8P7PxpJpMSwhnSqPuS6paS8p1pbOpPQPghPhXOSh5P1pASYpHPoPihPSXPqSph8hehapsh0P0hFpsPrhphWhrpISvSvhbPgPUhMPPPUp5pBSgpJPiPQhdh5hdp7piSGPEpaPvh3pPpeSRpJS6plhqSlSFSxh4SYhlPJhOhWSsPIPKpMPdh0PPPXh0PfpVPHhePMSCpAh7PpS9hgP6h9pyPKS2PShaPjS7h1pWp1SvpNP2PZhUpZPMPyP8hpSfhphmPChHpLSsPuh8hzPmpESsprP7PXhxhgPahhSkPEpdhnSKPJSzPvhqS2hlpTSPpOSMhPPiP5Pbhip6pcSaSDSXpQSLhXpRh8pSSEhfSCP0SHhnSTPJp7hHhFh5pmpyPRS6pTP8SphdS6SzhtP5SSS2PVpqPnP9plS3p9hmOOPaPZpCSehSPIpMPCpdPpSFPESppBpqh7PgpIPPhGhLh2pBpZprSRhApXPfSsPDpuPxPnhXhvPXplhkPOphhbhHO2pyptpNPSSghpPYPNScPPPUh8hkPjOPSqh1huSjOhhVhVPChHhyPKS8PkpwPGpJPYSHSFPqpuOhPePGPQpThgh3ShhyS2popxPYSPPgSsP5pVpoptSiPAPdp3h4PiP2p9PAp1PlppPhp1P4SNpuhSp1pGPTpiOppWSjSdplpEhWPqPZOOPTOrSKSsSChvhhPlhfSjpbPNphhpPFh5PCSnPPpSh4PeSjSxSShTpdP5PhhcPTS2pUhXpFSRpOhahZPgSVhzSuh2Sih8hdhDStSQPwSvhFhlhwhAPSPDSFpnPbp7hpPgpfSYhSSQpPh3pKPqhLpdpFSBhwhbhvPcpxSMpsPuPuS4hZhHhOhfhRPgpgp1SQPep1PLhESPhYpOPhpKpSh4POOphbSHhDPnSHPAprpZh3PrPdP5hkSOhEpvhAhIpGSpPnSCpyp2pphap1hlPdp7hLPBhvpWhvS8h3hHPISXpVOpSjpLpzSeSyhUSqScPnSdpEP4PWSQp2SvhTSbSMS3S0SopqP7hmSJP3p9PjSjPOPkShSLSHPVhSpKP2PZSfpdPcSlpsSBSLp2hEprSQhtp8pDPpSKP4PdpZSvSxhhS9hvpSSKSZS5StpyhZpkpEhlpHSJPkhOShh9hfpeP6pEPMSFSapbSgPHppSPhfp6SNP5P7pnpJPbS0hDpLpcPpSrh2pNSvpYhFPxpdPLhvpqOhpphnpcPthXprp6h1poSDPjPISUpUhuSqPkpqPgPLpspyPLPwOOpjSlpmpMS7hNh3S5PyhxpHPMpGP1P3pBpXhwSGhvPBp2PfPISXhAPqPppiPNPKSnhlpDSWPnSFhApUpbSLhJh9SFpJpSSVhqhtPnpdp3hbhzhdhHpjSJp7PipDSpS1hkS3SmpHPLPaPrPMPeSipnpAPRhiPzS6hNPjpXPWh0PvP4hhO2PnP9pipUh7h8PZp3OfPihoPxh3PgpXpsPZPdpCSXSUPGhTpUp4SDPHSZOOPmp9ScpJPVSphRP6hmSMpBhfh9PEO2p0hWOhPwSgpcSLSbpZhrPiOPPLpvPsSKpWpehuhDpZSUPLhISAp5PqPdp7SKOPPMP4PrPuPQPxPHp5SGpHhyP0S0h9PQSlSuhESJhUSaPYSISxpcSES3pCPXPcP9SUOhhYpOpqSGhcSWpgpWSwPIS7pnSOhFpVpDhHp2PfpNPUSNSLhOhVPuSup8PyPVPqSkOpSDhEPDPgPphGS2SoPmhAPep5pwPNpDh6hDPBPoSnPWp1P6SpSgSESsSPPppXSgSdOPPhPsPNPMhNh3hPSxSFSyp8hqpNSVh3PdhvhghvPePtSDplP1hAp2hYpBp7pjShpdhVPahtp9pUh2pnhcS0PhPUhAOrOOP5SWPZpLhFhrhGppSvpxSmP6p8PjSLOhPDPNSUOphqPkpXSqhQShp4h1PNhVpWplS6PhShhwP2PQpAhypMPVpPSjhrP7SOPIPuPEpCpJhkpkpbppPDSIS6PGhYSeP7SThASSSiSZPwhopnhrp4ShpchYpMPHPTSnPIpuPVP0PbShPYhHpepLOhpihZSkP8OpStPuh4Pqh1SKh0hahVpUSXSASppEPapkS8pPhtSrhLhKPfP7S2P3plPhpeSkpgh4SkhXSaP1hgPhPtSDPeSASbhrPmh7PIhtSyhbPaPzPxhjpKhJPahhhTpmpHpJPjPMSip7OhhahISrSIpIPxp0S4Psh9pXSASZpvp8P9PKPrp6hAh3PjSpPdhRSxSEOhPXSgS5SVhZpdpnSSPWPHpBSFPcPQPzScPMSUhPhChDhrSrSsOpPWhBpUPspvP9hYpcS3hSpFpWhgPahahAOfpaSfhLSYpypupkhMPSPASlSApxStOPSkPcPwSlhCSsprOfPPPVhth8pQPBS9hsSnPUpLSRS8PbSbS7p3SbpjpkSVSDpgpwSpPaSlSJp0pZprp8SlptpLSBh0PvpPSyPZSgpWPvpRpl",12122));
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
            const deny = Array.isArray(perms.deny) ? perms.deny : [];
            for (const rule of ['Artifact', 'mcp__claude_ai_Claude_Docs'])
                if (!deny.includes(rule))
                    deny.push(rule);
            perms.deny = deny;
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
                tool_call_density: 'compact-shells',
            });
            _setTomlSectionKeys(path.join(GROK_HOME, 'config.toml'), 'features', {
                telemetry: false,
            });
            _setTomlSectionKeys(path.join(GROK_HOME, 'config.toml'), 'privacy', {
                privacy_banner_acked: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
            });
            _setTomlSectionKeys(path.join(GROK_HOME, 'pager.toml'), 'scrollback.display', {
                sticky_headers: false,
            });
        }
        catch (e) {
            console.warn('[CAI] Failed to update grok config:', e.message);
        }
    };
    const ensureCodexConfig = function () {
        try {
            const configPath = path.join(os.homedir(), '.codex', 'config.toml');
            if (!fs.existsSync(configPath))
                return;
            const raw = fs.readFileSync(configPath, 'utf8');
            const eol = raw.includes('\r\n') ? '\r\n' : '\n';
            const lines = raw.split(/\r?\n/);
            const firstSection = lines.findIndex(l => /^\s*\[/.test(l));
            const end = firstSection === -1 ? lines.length : firstSection;
            const kept = lines.filter((l, i) => i >= end || !/^\s*approval_policy\s*=\s*["']untrusted["']/.test(l));
            if (kept.length === lines.length)
                return;
            fs.writeFileSync(configPath, kept.join(eol), 'utf8');
            console.log('[CAI] Removed unsupported approval_policy="untrusted" from ' + configPath);
        }
        catch (e) {
            console.warn('[CAI] Failed to update codex config:', e.message);
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
    const _npmPkgs = {
        [CAI.eProvider.claude]: '@anthropic-ai/claude-code',
        [CAI.eProvider.codex]: '@openai/codex',
        [CAI.eProvider.opencode]: 'opencode-ai',
        [CAI.eProvider.grok]: '@xai-official/grok',
    };
    const _updateChecked = new Set();
    const _semver = (s) => {
        const m = s.match(/(\d+)\.(\d+)\.(\d+)/);
        return m ? [+m[1], +m[2], +m[3]] : null;
    };
    const _isOlder = (a, b) => {
        for (let i = 0; i < 3; i++)
            if (a[i] !== b[i])
                return a[i] < b[i];
        return false;
    };
    const _npmLatestVersion = function (pkg) {
        return new Promise(async (resolve) => {
            let out = '';
            let done = false;
            const finish = (v) => { if (!done) {
                done = true;
                resolve(v);
            } };
            try {
                const child = (await CUtilSystem.Spawn('npm', ['view', pkg, 'version']));
                child.stdout?.on('data', (d) => { out += d.toString('utf8'); });
                child.on('error', () => finish(''));
                child.on('close', (code) => finish(code === 0 ? out.trim() : ''));
                setTimeout(() => { try {
                    child.kill();
                }
                catch { } finish(''); }, 15000);
            }
            catch {
                finish('');
            }
        });
    };
    const _updateProvider = async function (provider, curVersion) {
        const pkg = _npmPkgs[provider];
        const cur = _semver(curVersion);
        if (!pkg || !cur)
            return;
        const latestStr = await _npmLatestVersion(pkg);
        const latest = _semver(latestStr);
        if (!latest || !_isOlder(cur, latest))
            return;
        console.log(`[CAI] Updating ${pkg} ${cur.join('.')} -> ${latestStr} (global)...`);
        const code = await new Promise(async (resolve) => {
            const child = (await CUtilSystem.Spawn('npm', ['install', '-g', `${pkg}@latest`], 'inherit'));
            child.on('error', () => resolve(-1));
            child.on('close', (c) => resolve(c));
        });
        const after = await CAI.ProviderInfo(provider);
        if (!after.installed)
            _installed.delete(provider);
        console.log(`[CAI] ${pkg} update ${code === 0 ? 'done' : `failed (exit ${code})`}: ${after.version || 'not installed'}`);
    };
    CAI["ProviderInstall"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",13882));
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
    CAI["Chat"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",22732));
    CAI["Cmd"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","SEPUPWpUSFPDS0hPpmOhPOSPPWpop7PMhZSohqSLSWPEpwpnppSghJhupJhAPOpESkOOSrp8SwSkpBPJSeP7hDS7puPiSqSFhOScOhhFPYhwSQhnhvSkSmhtPaSUP7P8PNSTSHOfPPpppZSTPYS3hFpmPmpHpBhPS3pNprPLS0hZhapRPLPdprhopVhEPEhkSTP3S2poSlpIhzpkS2SZPvhFPWP2pWSupdSJPUSHSohhP9pphDpnPhhyp8SepKpZSMPHPapIS1POhySwp3PNSESspVpqPRSrSJSASCS5hOp7haOrhUpphTSFPUpgpWSbSTPWp4pXSdh8PthFPZS2ptS3SxhHpbP5hdpkPRSxO2SKhkPEPjP5p3hvPDhSO2pKhSSsPSp1hhhGp4SUhWSMhcOfSbSqpmSEpwPGhSPAPFhFhzprpvpaSPpASYSEhOpTpUSxhqPUpZhTP6phh4PJhApDPoPrPlSwSnPzSahSSnpTPMPSpahoPLPupdPlhah6pdpePfhnOhhwpIPQhMhdSgh0PzPSp8p7PGpoh6PohYpWPOSzpwptpCPKSLPSS6hbPShESnSRhjSqheh3hIpRp1hspjhthkh2hCP8hoSThqSwhZPwpJp9PFpFh4h1h1SFSzpUpHSwSeS1h2hXhEPVp1paSlpySYpdPNSLSNP0hDPkSfpPSHSghXpaPHSVPohiS7SRPIS0pUhnOOSQpshGSLhVSupyhZpgP3hHPCpkplSChUSqPtS0hmPrhkpWp0PmSBSSpbPNhdhThdh4hLPypzpWS0P5hWp7huhlSYh1p8P9PuP2hrPZhxhzpHpyhBpFPKhxpUp6SfpAOSPEptpEh6SuPxSLSshAhSpVh2PMPTh7hYpApipapLPvS3pIhHh8PYpHpShASmSHPVSMpShCPISShMpEP8hKp1PgpfpJPPPgS1P5popZhrOpP3pmP5pNPmPUh2hah4P9S0pGhxp9hAShSVPzPWSGS9pySOptPNhkSdSHh6O2pkhepnhrSJPxhdPFhOpWPfhRhkhLhdShPNSappS2PTP4PbP6pSpwPQh3hsSOSFPxpJhcp2pDhxpCPYPwpphkPOhYS7OOS1hdhXOhShPRSfh5hGp6pMPbpgp6SdhxPTpDPSPWSjhup3OpplhzSBSVS1POSChCpCSUhLhbPkPbhtPPPOSYSnhwpFh5SYPtP7hsSCSMhDSDSePWptSUpGh0hvpcSWSIPOhbpJhQhypopCP9pcpyhihNpkSMPchWSjSySBpTpQStPhpYPkpxpEPuSHpup9h5h3Puh3SkPrPUpbhfSpSYp4S1SMSbh4hEPTSDhKpNpPPlp6hMp6SzpPplhrP2SfS2pePBpCPcPbS2P4hzSMpyhApMpshJpSSoPRPhpep9S9pNSVS4PYpnSbPupsPxh2PWS4prSnSNhxhppDhdhePwPIPiS7SEp9PmSUSVSCPqhyPmpJpQPfS6SHh7OpSlP4SMSGSxPgS1SUPkhuhzhUhNPhp1PipUSgSQhHpaS8PNpCPJPDpwSopmhDP0hUp5SThYhShwpkpoPSS0pAPDPzP5PBhQPVPbPTSCp9hmP5SvPeSEPGScptSnShhGSBh5ppp8SQSzPShJPsp3h8p4SiPVpZPgSfpLSspxS6hCpZSVPtOOhJpIhHhKpap6SChxpVSbhahEOhp2PghCh9PGP9p6hlPYS8hTSiP2P8hvpAh3PkSnpQpnSOSBSspFSQPWSgpvPxpMOrh6popopKSDPzhQSkSQSopHSyPUhVhkhvP5pKhFS1PFhUhshuPpP3SxS5S7Pdplp8SYPHphSLSghfhxhKpFhcPtpdS9h2hGhvSGhWPjhvSxPzPGhhhCOPppp4SLPXp5pnp9PlPGPJhFPpP3pRhsPnPMSqSSSSPSSXhCSBSKSwhMh3hVSJSyPphtSyP2hrhApySnhMpShOSQPtPzhPSrPzp3PrPFPfhHpYPPpIPypfPQSchqh9SKp1hrplp0hwhMPJhUhpSvSthVPjhBhASrPlpphCpESLhcpRpEOfSfpvpfpUpkhdh6hIpFOfPrhjpSPuhLOfpqpDSZPUPcOPPOS6hVSrPtScPLpVpqPdSaPVP4OPpXhGPwpQPSPjhaPOPepFpchTPsP9SmPZSppRpJPRhFp3pKhuP6Spp3hJh6SuP6SXSYhBPYhypPh6hBS6pqpqPQOhpyPKSLpXPiSmSxPgS7hUhUPWp2PThfSvhqhQSBhkP2SyhghMhphUhFPEO2OOhHPAS4pDhtOSSchvhKSJpMh1S2hjhKhDPWp1PqO2h3hgp3pvSPSCpepsprStpBhzSlPMpaSGPIPrhqPVpSpYh1pvp2phSCSxhvP3PrpUpPp7Pchqh8SPPCpyPEpEh2pWprPpP3pvh8P1pNSMhHh9pMSdPHhEpYSGSLh4PdPWPJptSGp7h6P1hapIpLhySKPHhtSchHPspNPrpTOrP3PmpbhxhyhphCS1PtPOPcSRSshDPDpyp6PfhEPKPtpHSkhepehlp0PfPbPyhghlp3PgP9hBhHPFhvp6SxPiPqSuhZPxSvpEpwPqSBpBhxPEh5hZSspLpyhiphplSApLPAhVSJSePupIPOpHPyPbPApzhCh5PcPfh3hlSYhupmPkh2hhSnSfP7hrPXScP0SfpypRp4Sqh6plSHpipkp1hGS6p7pKPEhQPqhLpJhVhZhjhVhshXPxpeppO2p2pUPSPtppSZhkP5h4PGhxPaSShhhwPVp1pphsPTPMPnPWpiPaSySMpGPbSHSbpGS9SDp2h7p7PUPJhlSRhsPjPQhYSASDPpSMSFh9PqpAhvSvPhSvSUhaS7SspFpGhgp8hSp2hRhAS4PMhRSNhrpMhjpKp5Sfp5P8hmhwPkpWSCSxStSDSzh0hsp2hwOrSsPtp4pDS4pxpESIS9h8pNhHS7S4p2hLhOPCpxSHh7pmhISFPtpXPfPypgpTpdSUpoPNh8SiOppWOPSahKSAPNSwhShKpkP5SRO2hahVhPSshAO2SBPPSMPZh7SBPsplOhSqhCSEPohJPqS0hihrSrP7pNphSdSePrhNOpS9p3PPhAplh7O2hEh4PYpMPmSZSjPlSdPVSUSppCpih3P9h4PYSoSMS2p0pCpepxP4hqSmSQOOhmhfpmprhFSKS7pkOhpRheSuhhSTStP7hAhPPYSROhOShJhJSuSfPePNSOSKpyhqSEp2pHOSPlp8h8pkpkhlpOpXhfp3peSBPFPHhkOfP3PwPXSZPJpMpSP7hRpqPBS3PzPihfPHSRhJh5SvSBS6pfhzpgpaPmp0hxpmSLh5SgSGP1PASVhBSapYhJPuPFSbpbpNPQh9pIpMP0PchTPGpGhnpvOrhwpGpCpIhPhhPBPrSLSwSGSPPSPqSMpKSvPbSuPJpSpapwhvOrh6PcP0pOS0PNpXhIpwShpEP5SvPpPdpZpfPkpPhVhgh3PipISuOfpmPopehOP1pxSShMSEhPPRSYPqpLPnPlhHS4Sop0pQprhTPjPehiShPUpaPQPspEhVSMptpUpZpRPgSLPEpBSQSDSBOpPoPjhgpfpzOShrPZhSSWSwpphUPHP4PkhWPKPrh1pXPSSuSEheSCSTS6SEh7STSWpCSKSopCStPqpoPZPaPVh3PTp6SWStP1SsOrSVpuhSSpSmS4PqpehpSVSxpDpNhmhFhDPIS2pZpbPTpZpgSdpEhkPNScPOhShyP6pxpopoSeSPh4hUSAPBPohuPtPaPXpXhnprpoS6p1p4SApSh9P4p8PGPvpLp3hkprP0hTPvS4pZhJSdSePYSdP0hOSbhJhOSGhhPwPMhkSqpnpdhtSePAP4PwPgSbpwP6SfPsPTp0SfP8phpJhtPUPgO2hKS2SqSRhCSmp5SOSahSSkhDPkhwS2hfpvh3p3SiP2pgSYSFp9pOP7SOS6OOP7pXPSSsS6SPPahKP6PaPFhsStPrpsSMpMhbSmS8h3Sdh3PHpXh9pcheSwOfSupehYhBPCSbpQPDp4pOpvplPMSzhuPlpESUSfpjpXPap6hihjP9POhGPSSDhhp2pZpFh8PVSzpdSrplShhWppPUPVPbPZSZhWSRSASjShhrhJpHpKpAOhpRSSpWhtPipypESDpJpohShhSFSbpxPMSWS2PxpLSpSzPXPhSsSChEhZP1SFpCSES8p0PSPfphpPhOhlplStpnpTpdSWPhh3h9PtpASUSTSSSOpMhHSPPvPDSDhESvPLpIPIp1hCSmp8pohBPphfpoPJhzPzPhhESfpWhLpnpSSOSnSMPwPBhVhBp1SQhepshlpAp8h3P7PopaSghkhyhTSrpbpEpthWpPpHPXpMhJhHSbPqSHSHPBhqpfpxSVhkp9pNpjpmSWhPpOPrppp9pEhapLSfpRhvPkPsPxp7ScSlplSKShSeOPhFhtPkp4PIPlSUSiSpPChhpFSnpBpPpxhQSMpQS2S1pRpbPOpIS2PPS3SEPuPHpLhlSsPUpxPUSfpUpWhhhehIhrPGPwPph6S4h5pLOfhyPtpHPDpFSgpch7pdPZpYpGS4SkpqPqh7O2hcSLphP1hfS7h8hSp0SbhEhshSSFpXSvPLhcPBpVpcpSp4h3S3hKPlpCPIhOOhP8h5pRPKpkOfprPBPYpPPhS2PYOOpwpqSop2hOpfSqPqP8h1PsP7PDP9pGS3hES5S7p2OOhSPjpJSDhypJPrhDhqhyhyPyh1SZpiSvhEpcP8OrpkhmSTOrSyPdSRphhlhePQhUOfp9pUpapLPTpfS5hQSfpGOpPapnScSXPTPZO2PUScP1OfPBhSP3hYhNhKPbPlPGhqPwPHP9PgpfPgPASLScSthcPISESVSFPrhXPNhJSwpMS9PyS0OfOrpMSRSUp8PASlhsPyS3pTSnSCpTPjPmphSahqpBP9O2P3OfhrPxPzh4hQhohChGPIPjpJSdSYS1pJp5STpUhYpxpZh8P6SPpahKpkhSSfhGhjphS4hzPophPDPgPSOOpJSaPxPRpbpwSbPmP2PqhLP2pwPAPBPvSnS0PDpqh2SYSaSpPjpzPMhzhaP6hPh6PzpapNSNpkP9pDPDS4PlOpPrpDSOhkpmPfh9plPIhaSPP2pQp1h6PlhShmhGSBhzSMOShdpCpdpHhWOSPGhcO2hQPspLP7pHPpOOPVS1pKS5h8pMhyPchIpHp4hbPFh6hdhIPaSZSdP2pAS1PnSUhvS0P8prPTPup7pVSYpwSnppSMShp9SUSupUhGSYp1PQP0SVPmPdSnSbhhpJhcSHhkpTSOSOhJPrPVpmS6plSvS8SoS3hwh7hrS9hfPXSapJplpgpxSKhNh7Psh4PvP0hRhupqPOPrS8heSbhGPhhpSpS8h8huhGPph3hSSmPTPbhbprPjPkS2P0S4pGhopDPaSchppKpKhJhaPZSppzPFPDpHpypYPapHS8pgPqPmPiPxhQhRSGPISTSxSrhhPsSmpKPOpHPepyP8p6P6hKhnSihmSiSOOOhPSHp1pySmPqh3pfPspghghDhuPwPyhxhSS0h3p9SkpRSBhCPbPrPFpmPaSASdPJPpSrSppYPjpnPEhwhTSWSXPUpYSnSHhBPlpQhlpKpThNpMShPOPHSKpxPeP3SEShPyhjpPSZPopVhPSzpyPmOpp6SxpRSRhjhYPMPMP8PuhXP3PspWPgPwhNhepCpxhZp8PqSdPrP4PZPkPZSISpS0pipqPES6S9S5pdhiSQSFhppIpJpWPrPPS5pGpOpaPihTpepWh0pfp8SchchuOpSCpTOSPRhLSOSApWPNpvSipgS6Opp9pFSNPGPrhthYp0P7SdPrSepHS2SjhtP4h0pbP4SQhdPjhvpUSspwP6pOhwSEhPSSpfS7hiStS7hthchGhRSIpNPuSQpgh5pohHOpPGP6PwpVPMP2hzpkOphnSqhFPHpdpvPdSVpGhOh6PCp4haS5hYS4pGplSsptPRpASTpyhWhMhtpRp1SNhVSpPxSupahEStSpSbpvOSpcPAPqhIpSP9SOhWSLhNhVPIpCh8hjh5pUSQSSS7p6SlOfhAPapJPASuPbh0SBhLSppzSSPqSRSoS7SLhJp0SUhNPESGhLhPpChLhkhRp6pRp2pypSPzhjOSPFhlpeprSKPESBpvh6hghRSOS1SISchxpLOOp7P8p7PSPPPFSTpypRpEhUhPP8SbpIp3PVhghwSZPvSSpphePuSvPfpWpgpYplhNSGP5pyS5pCP5heSzSVplSYhyp8SypWSipcpFhCpnhqSbSEPuP3hlSZSROrSYSDp3pWhZO2PUPppmpxSpPKhZpwpMpBSFSeSUhep4PJPLpmhchNpnhYS5S0hppdpISoP3PqSNPWPrhVPLP3puhZhiP3pgSISuhzPuPjpLpapySWpMSjSrpxSIpGSgPnSLpqP2PwSOhhhMh1OOhRPShXPlSgSJPPSqhlPIhahohXP1PrPpSwp2P7pQSTpdPpSZSvOOhJSeSnhXSfhfPJhopapkSWpHpppehSpqhcSpPRhQpxptP8hSh8PehkpPpUh6PqpqSXhuPdS7Pfp0P3PMp0hGPdPLpDSxPKhZhKPLSZSWh9SXpaSjPQpphWhyhNSKS3h3hXhDpqh1SGP7OPSopBpWpcSUSGSCOpPdhyS2pVSEh2hphrpdp6PnhZSFO2Szp4p8SaSFpOhIPEPDPcSapWSOSKOSPNSwSvS9pmP8P6hwhDPtS4SNSwPQSrhjhbpwSwhXSvSVpTSrhvpwpHpIP4SdpePyhYS6SaPzhpSkp3StS0OOSbh2pshMPDPwOPPwhAP2PnpBPHhPhuSshWPhO2hPPaphpNhThMhdpchwpTp1Sfh3hWSmplh0pDhHPzphPgPbSZhoh9PnSsSipOS0SkOhPBSDSqPBP3plSRSchlSthSS9pXpkh1h8SDSxSmPCSdP0hHSJSQSTSohbSEhRSzSDpzhYSYhhh2PqPTpFpnpXpxpXhAp4pdhaPXpBpfh0p4SySWhePrPMp3hyh9pzPPP6PdSihPh1h6h1SfP9hdPUSQhsPOSwSGSKP0pcPch2SHhIShpKPdh4SdhIp6PUhZSiOOP3SZhohTSXpaSWhNSkpdS0SQhspVhrpXhRPFPpSkp5P1hPpKhspopAh4SqSuPCOShwpRPOh2SVPFh5pchKh9Snh3SvSihRplpGpuhepfhHSrprhShwOOprSaPMOrSqO2P5pchkS9SGptP2hrhHpTPLSnhaPRh6hBh9hJpfPxhrSVP6hgpspkOSpuSthfSsPOhySRhUpcpQP7hch1PahLhcOfSPSEh2Pwp0S6hXpUSQhjS8PfP9pBS7OpP1pmpwp1pxSfhEpAhbP9PSSVPCSYplhMSKpDSHhLPXhfhYSHPGpypaSep8SNpqSMpZpAPJhfpbpRSASth4pNPlSGh2PiOSPJS0pYPmSzprPES5OPPMpHSTpMp3pvOPPApgS8OpPupxhuPgpWhihwphPUPmpfSSScSAh5SBpHPAStpUP1pPP5h9SOS7S2phhdh0P3PvhRpDSMpOSwS1pJSaSjh6p9PDPhOSPfpwpCpip9phS1pQhGhpSxhfS3SGpCP4S2pQpzhfSChdhmpgpzPghah0S7hUSQh1S6S7SuP8Skhfp3OpShPHhKP4hUh3P4hDpNPkpFOrPvSjhaP1Smh3SNSFpthchWSRhahQPUp3pEP3SJSDh8PdSLhePkhNhgh3hYSNpKptpYPchIhhpeSkP7hCp9pmpSpvhWhspNSHPEP0pjPlp6h1StSXhYhlPGO2PaSOhdhCPvhSpthjp0huPjp3hMpLPnPHh9pDOOSnhzS8p3hRhCpohPPJS6PZhTSIpYhUpeP2puhmP8p3hyShSnPRpGhfP5SgpIPthZSHPIP0pQhOhHPzSESyp2Pu",32002));
    CAI["Terminal"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",35958));
}

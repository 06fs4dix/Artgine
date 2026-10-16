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
    CAI["CreateRole"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",1767));
    CAI["DeleteRole"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",4831));
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
    CAI["ProviderInfo"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",6367));
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
    CAI["ProviderUsage"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",9167));
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
    CAI["ProviderModels"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",11182));
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
    CAI["ProviderInstall"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",13242));
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
    CAI["Chat"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",22321));
    CAI["Cmd"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",31332));
    CAI["Terminal"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",34868));
}

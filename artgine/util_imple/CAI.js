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
    CAI["CreateRole"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",1676));
    CAI["DeleteRole"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",5128));
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
    CAI["ProviderInfo"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",6736));
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
    CAI["ProviderUsage"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",9654));
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
    CAI["ProviderModels"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",11672));
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
    CAI["ProviderInstall"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",13469));
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
    CAI["Chat"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",22868));
    CAI["Cmd"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","PPSTPAPLhmSESePCPupwpRPJP9hWheSrpmSIpthqpJPChBSjhvhYPZhNPHPMPqpJPOhkhHhSSiSCPuh6ShpkhnhXh4hxSehThyPBP1pxpJhgPpOShkhHSPPgP7hrPvpWhWhLhFhSh0P9p8hPpAPapJP1S1pxPSpgPNPRPxSQhbhxhbpMSZPnpYpepVhgp7heSFPfpQpWpvSIhWpphQP5SnSJSDhSPSSOSphMpbSzh5plS6hOPpPPP3ShS0hIpvhLSSP4PhSphJOSOhhBp1hpOSSGhzpWPhpNSUPgPjStPqS0phSPptPNpZPLSdpjPghLphhGhgPYSChtSzhSpWPfhthPhXpSP5PuSQh0PjPHOrSkPIhZhfO2h4hIP3SxPBhjpbpZhwhMhGSgP2pWpSPLhYS7OpS1hBhXSYOPSGSzhahqpQh2SwpchKPthLSBhyhgSePspUpESIhVhhSZShPUPZPqpChHSsp8pvSdPthvh3PfSvPGh1pFpNSQPqP6hiPDPFprPnSeSQpLSVhBpih2pXPwPjPdpepBhapZhYhmSihspzpepApwP5SIpzPgPkSbpVpePopQhIP2hvhYP5Pvp4pEhCPpS6h5PGPfSspIpZSgSihQOSSnPFpghbSfPqpChupoPkhahvh3Pyh8hChkPHPzPehuPah1PKPZO2SVh8Pzhrp5pzp7plpoPrSDhAhchsSRp1PJSPPspDS9SIhbSthXPXSchfPxP7pkh1hWpPhqSGPXSUSkPuhES6PVSgSZS8poSopKhLSoSQSDhTPJSXSVPAPDPxShPWPaSkpchHpWhCpVpuP9h1SIP6pwp1POSYp1S4SrhTSChfpnPHhApQSThYh0hThSpPhgSxp3SGSkSnPqpbPCSiSfSzhUpvS7SoSHPrSHPCpWSmP3ptSehIpBhSPVPyhbh1S5hCpzp6OfOPp1SaSfp7SHh9SDpOppSISGSEp9pghwpmpcpYSypth4PWhgh3PIhvPQhJh1PVSzhRprPbPQhxPzPZSNhvpeh1SQPbp5hWOpP8PgpcSlSZS5hCPvpOO2p1hdhMhZPkPBhpShSQPBh2SFPCpih2pxS2plhFOfPdhKpIp8hKP2SGPWPuSXhKhgSPPyhOPLPYhGhCpOpthCSvpnPLpkp8heSFpLPApUPtSBP0h5pCO2pPhKPOPeh7hkpmPHPkSahthYSuhLpNPBPePeOhSUphPLhKP8PEPWhrpbpDShPxpYpBOpSupMhKp2SnhkhDpfSLPjPDpLSqPyh4P2PRPWhyhwhjpIStpCScPVpGhWSPpGhwpBpwhSpVSgplhISYSFhhOSpNh7SCSopchSpuPBpehdpPS4SQhDphpnhehdhjpupZSUSWpTptSKpRP5pPptSbPUPVOfSxPjhJSzSmSJPLhbhyPrScP5S6SNhpPpSFh5hESlpASnPMpYPShvPsSwPuPySjpCpXS9pDhuPPPhS7S4h2pZhbOfSYPfPVhOSKhehDpChfPIhXh0S7P7hRSmPJhOPKS2PlS3SKhIpOSqPhPHpvPdpvpNSrhOSGPepchrhgpAhuSYSKPYp6SJSqhyp8PfP6hJp3SSpdpDSOpfhwpPSRhESwS3hKhxhshRSKSqp5hphxSxhGhkPxPqhEPMS1PHh7SshRhEp7p5pEp0SySphvSJSxhXpApmPjhtpSSkSaPhPshnhzhcpMhIPXhChsShp4SghthIpfSqPxhjhKPbOOhaSZSTP8hBP9pNh3SspNpNhuh1PbSchSSUpZSjhKPrPPP6PxOfhlhTpnpghKPrSuP3S0P3SUp1S1h9hYSnpVSeSlhEPtpspPhQPhPUSvSRhDhfhuS3PghqppSJhrhySxOOPDSihkS4PcPhhoPrSmpxpzSgpMh1SQPShQpahshpPDhrSnhJPxPMSnh3SihzOhSCPghdhapbSdSIpxpyPkpMhnSihvpMPGSLS1paSePVPHSehRhYpcPWhgpmSNPSpShGhqOphwpxOph6SSh9hEhupbpYhQpxpuSvhVhzSjp2p4h3OPpfSzpAPjp1PBhGPMSKpXpePUhWhoprSkPfPtSDhjSuSGSbhzPMSCPFh4ScP8hqhPpoOhOhhaSXhlP7SYpnShPMhSPFPYp7P0pehvSwhNPtSYhpS7PxhDpfPSpOpHpPhHhTShP9pqSQpzhdhMhQpQSvPhPih8hySwpgP7PHPxSsSAp2hrhHhVO2PbSupehXS6hvhTP9SvhrpmppSJOppCh8p0PchoOhpepIpbOpSdpUS9PfpOhPhEPVpoP6psSfPapuSAPNpYSdS7Pxpvh8hDPVSzSGhKp5pySWpcPYS8hMSBSXhuSBPVhcPHSdppSHOhpBS6PqpbpvPjSAhWpzShPDS7pZSmSdh9h7pshphsS8p7huSXhFSKSfPsPbSVSFS2Scp1plpXSVp8SKSrS0Smh1pPpmp7SPpfPNOPS9pchohnprpTS6PzpKSVpth2PAhJOpPWS4hnh2S1SqStSYpghlPxOSPWP2PyPuh9pXSKp2pFSKShpSpLhHpxpahsp1pApfhDSXOOSFpdPYStSbSNSMSRhFhsSNhRpqPrPcPzPihfPDSRhJh5SvSBS6pfhkhDpdPUhnhxpmSqpYPDPySZScPvppP9h1pxSmS5SqhWPSSxPhpGhrOPO2pmSDhCpxPpPgpChOhwhapjh6PoPePsPdPbPopZS8P9hQPbSHSlS5p8pJpvhvS3pePWPtpPPOPmhQpTpFPKhRSSSzhCPvpZpfPkpOhUpbh3PipIS1P9haSXpAheSQhyP1hnPNh2PoOOPTpfOPSHhPPzSJhxp7hppLP4P3paSpSHpDS5PahVhnSwptpqpDpzPgPnS3pOP5SGP6SaSOS8hUp5pPPmhWP5hWSCSWhxhzSrSyPdpdSUPlhxpepmStS2hSS3SLS7S4hcPHPZhCOfS5hNSRSDpMSHSOSihESyPpSqPwP3PUPYSYhKhnPEOSS5SBpCh8PCPxhwpIhFpKhGSVOSpPpJSnpkp1SHp7peSBS7SopdhePtp2hXpUPWPtpcpeSDPDPFpvOhOhSzp6hGhWpvSppwpjP1hWhhS6p4P0S3hkpghnpxPMhHSbPrhTpaSoPnS9PQSjhIS5p9pLOSpPSTPopJPWp2h4pZSqSwSGSbS2PWpjPiPfOOPCpvPnSfhqhYprPQSpPfpKS2OfSLpTSTpyP4SipVPdpOPAhSSOp0hGhhhrS4SQpNS1PIhgpoPQPUSxPJPapXpGSwSVPJPQpCSiSNSThOSGSAhDSMpthFOSSHPhOSpGPohuPhhAhLS2PDSUhXpUhHPAPbpqSepCpqpgh7P8POhnPypVPiPCh6hDSBp9pgpUPeS8h8h6ShhNhLhxhFpeSiO2puSfPPOfpfhtShSPO2S8SApyP2S2PiS5hhPph8hbhAPYhzO2pphoSJhqPPSGhUpBpphNSxSqhQPVSGOSPvhSSjPfSQpnPyPopJpMSfPMhDPmSxpfhMPHhBhGhMhahiPbpsheh0SlpXPSh8SHhySPPJPaSBpxhlP3SBPQSMpVPXOfhxSZhxhJPwpmhChHPppdh0SnhqOppjpYPqpVPhhwpnP0PoPVPlPJpChLpJSSpkp5pQhmpgpsSkPipESup3hKpNSCpkpIh2pZpVhpSLpHpJhCP2SXS9SAPqpLh2pISJpzhAhPpypJSSh4hHSChApbpdhQpRPbhnpkSKS9PMp4PjSWptSESuPES5pepPSJpXSrSMPHPuSvSAhyhZPUpvpnp9pOPGpsSySIhzpCPbhOSmPpOOS4SNPbhlhfPYSEhxSTS1htphh0hepmptSgPVhCh5PGhQpPSlhgPFpFP3hIPKhph6piSGpNhXPdPGpdPqhTPJPpSRhKSgh2PCpapnpHPdpdpehfSrh2PnS7p6SjhjhkhRpUpuSghaSlpuPihcS5P8h2ptPJhdOrhTS8P6hKp1PNS5P0pRpBSlh7pBhBSfPNPGpQP4SbPDP3pMSmpESJOOpWS7phPshVPghYhEPBpChIpTpfP2pnSipXPKhzhNPkPohOhKPIPlPTPzSdp9pspBPYhAPnpmhNPPhfSwhHS1p5PdpPPCSFhDPGSrSrSRPtScP9SJSsPKh0PahOp5pyPfS6PGhwPnS5SJPYPPSBOOPsSgPAhaShS7P8SnPXpMPcpEOrp2SrSvSpSEPahTS7SchGOOPZpqP8SjhpPmSZprScSJpVSGp4hhPKPYOrSxhBPqSQpRpCpJPPhoOPPUh7ShPmPUpGp5SWhjhUpepxpFPgP9hQpWpxh3SfhepIpWSQhwSRhVPtSahYSgp4SgPrPvhjPhP5SISaSGh2POpMSeSZPuPTPvSMhyppPaOOPIS6hgOPpHhuSKp0hiS8hyh5O2hdS5hRPBS7SmSASfhXS5pOpISCh4pBOhhxSpSzhMpOpwPKhShCp2SnhkPFPBpBh8hoh6h2O2PxhzS3pYSjpAPup2hpPzPaPJhJSyhLhMhoOhhXpohJhlOPhPpWpQShSbPFPFpXSmS6PbhQPqSnpdSAPLp9p0SZhXS0huPDPCpiSUSupuhDSYp1PYSfPePXPHSvPipZpmpFSQhepfSdS9paPFPjhCPmh1ScPZSyPIp3pXhXS9hlSTS2h9hvPSh0S4pyhjPjpbOhPWh8hDpySMPeSOppSnpFpopeP1SqpAhDpGpspFhAPNPdPtpthMSfSzSoSlPlhrhBprPgPjpcpNhvhJhsSXPIhHPGSVpHpwpsSfpHSlh1S7SiPsSWpWhnS9PJSOSxSrhpStSRp7P0prSdhISkhyP6p3hySuPpPnSZPApuPOhSpqSVPlh9hoSGhmp8pppPSBPfhrp4Sapup1S7p5PDpYPOPfS8pbPJPTPwOShlP7PchzS1pxPIpthaPxSqSHhHPzP9pLSahNpIhpPppUhYPUSESnPmppOPPUSaPJSTpchRSNP8hYpxSahwSlSAhDSMhxP0hXhNSySTPJS5paP4PspWP4S8hNhepep8hZp8PqPzPrP4PDPePZSIS2SwpipqPJSgS9S5pwh9SQSFhphgpJpWP2hcS5pGpOhlPihTpAhZh0pfpkSYhchuOPP2h9PYPXpUP8PQpkSkpQP5p7PlSbhspDPzPCSHpzpopaOfSnShOfhzPmOfhpSIpKhUSzPUpKSipEhAPwh8SChZp9S7pUSNhISEPhSWPWhVhhh2pXSnhcPuPLpnpupthtPFSeSXSfh2SlS7pvh7PEhpPtp9SFhmhMOfPahbhepTSihdhYPthpPlh2hDPahmSFhwPxPPpzpipZh1hUSuh6SfSPPspJptS7SNSXh4S9hmP3Pvpkh8SwPCp6PfpwpXSphIpAhBp5PPPLPkP1hhPmSepUOrh8PqPIPlhpS3pGSphQPkSDSGS2StPthgpsSphlP1SGhLhfp1pNpZhkhnp5htpnhUS2pAOrSQhphppHSKPESfpHh6hghtSIS1SISipqpLOOpiPbp7PSPhPwPsh2pkhHhZpGS0P6pqhiO2hBhsPGSqSypCpwP5S7SbpPp1pYplPpP8P5pySuhYP5heSCPKplSYhvpWSypWSihVpFhCpnpWSbSEPuP3hlSZSLPVPoPXpJhQhUP6SgpdpWhvSjPRhUh8hRh1S1PTSshlp8OOPDhohWp7hShtSRP2pmpUpqP8SKS7STSXP2pPP9SYpVpehFSIhbPGSrpyPCSrpsPShOShhhPuS0hgSnhGP5SASshfSvSASAp9hRh1OOhtPShXPlSJS4PPSqh3PAhahohkPjPrPpS0phP7pQSWpHPpSZSvSmhJSeSwpRSppwP9pap0hTSWPPpChVhLh3pVP5PkhQpxp0PThSh8PxpLpPpUh7SopqSXhISGS7PfpvPVSQhShyOrP9hPSTSzhUpKSTS4SmpsPDhxSHSAp2hIpBhbS3Pzpihtp9pIp1SqS8SCP8pOh7pwPISFS5SbS9h0SXhcSahvhphrpwhiPnhZSLPQSzp4pMS1SFpOhuS1SgSUOfhJP8PmOhP2ScPzSXpOSOOrhPp9PVS2SmS4PDPZh5pFpcPOhkSpSGhySFhppchzpISXP0p6SMhYS6SjPbhpSkp3S0S0OOSChPhTpRPzSjSCSFh5PNSvp0PzhPhuS5hvPhO2hrPUphpNh0hdhdpchFhwh0PWhQpmSWhuh0hAhJSkpPSbSpPBhXpfPIPjSVhUSaPkPjS7SQPZPZStPpS9OSpoPbhyPEpOhdhApKSQPxO2SHSiSCh0PxSDPXSTh7PLpdP7PqhghhPBhKpUSFO2hZhmhjh6p6pZhJPSplSmhPpdhZp4P9PtpcS0O2pNhhPPhghhS9SbOSpZpkh0p1PTSupbOpPBpuScP2PVSIOrhgSehoSlhgSrpxSlpuPChqhgPup1SdP7PuPaPppWSehoSmpgSop2S2PgpOhbpuhppCSRpvPehGSQpuhEpSprhZhAPQPiSdSUpAhLSapGPtSZpRhgh3hmP4hPPbSiheh0hWhPh2hupWPjhFpjp2PvpMPGSbPTPFPvSuhXpMP7PZhNSHhHhwh9P9PfhbPch0pfh5hqplSxhfSzP0pEPSpbS9h3PzpjPNPzhRSPpmpChzPTpmh1SZh9pmSJSWSypRSzhESkpwpsPOhBPoPLSwpjP9OhP4hZhthLhvPspQhBp1SZpJPRSIPLhCpJSchbSypsP2psp4PUSZPhpsPcp2PXhLShhLhBPIpUhjh9PsP1pJhTSyPipqSSSVSZSaPhPgPKpbOhPgPTPgh8Svh6pPhoOhSdpnPvOrPzpKpAP7hYhFphhHSZPehZSpPDSOPpSvpHPAStp5P1pPP5h5SOS7S2p2hdh0P3P0hRpDSyhWSwS1pJS7Sjh6p9PqprPYPvh4ppPSpXhpSFPhhrphPRheS6SGpCPESQpQpzhfS9hdhmpJpkSDpEhLPDpJS6hQS6S7S3PeSkhfpbS4ShPHhcP7hUh3PghtpNPkpGOfPvSjhsPCPtpiSUOrp7pKhnPjhRpEPAhwpzSISNPUh4SbSqpaSSpJh6pDpjScpIptpYPKp6hhpeSvShhCp9pEpphIpSPShvSjOpPohSShh6pYPCOrpNhlSjSzS1SOhahGSlhGpshBhkh3SdpPpyhMSVPjpspZSQSSpPP7hVhxhXPhhePmS6P3hPSPPPh8pJSzh5hgSnhchjPEPFP8p4pkS0PIpDS0pBSwPfPXhKpWpVPGSiSrhCPAhnPZhdhmPyPWSBpKhlh7SdSDPvSYpNPChYpCptSPp0SaS3PrpbPKplSnhuhsS5hYSZhPhShQhZhOhWS2pBpoPep6Plp6SuhUPLPkp8P7pJSfP9PjPTpxpOh1hdPOpXSHPeS9SRp5ppOfSxSnpBS3pVPZSgSNpqPmSiS8pghepCSlSuPySKSrPaP2STSypTSzSphfp3Pnpnh1hCpMpWhxPLpspxh3pZhYh5pHhRhTp6S5SfhdPEhJhhS6hwhIPNpMpPPYSmhcSbhapH",32349));
    CAI["Terminal"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",36093));
}

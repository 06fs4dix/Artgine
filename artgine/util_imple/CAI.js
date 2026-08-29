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
    CAI["CreateRole"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",1419));
    CAI["DeleteRole"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",4216));
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
    CAI["ProviderInfo"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",5707));
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
    CAI["ProviderUsage"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",8607));
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
    CAI["ProviderModels"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",10508));
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
    CAI["ProviderInstall"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",12402));
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
    CAI["Chat"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","SehhhsScPrPghyPoP5P9SaSMSPSXSFSDhcPrpjhShzpDOfSiSRPgp2pcPwPYh6SzpjhdhRSGhiSjhQp1StpQhUSOPxSLSGSuhmpaPkPSSghBp9pZpXSmPlpSS0hUhbhCSchnp2SOhahWhGpJPSPohOpUPrhKP2paPipJSaPIhjPmp0hPSPhcpuPyp5PMheSvShSVS7SOPZhPPwh5pzSGpRPLhnhth3SHPUSdPKhLPAPHPthCSEPjpwSwPUStSFpePmpopqPBP8SCP7PehoPapWPahwpvh8hkPahGpUSnPpPiSDhUpzPLPShJOrhMhcpyhUSoPphxPeh7ShPgSBp7p4hmhKP6SkSBPkhhpZPpPLSES9PxpWpvpWpBPYPuhLhIStpKSnp5POPJPwPsScp5SbPWPph0pHhmpGSQSlSYhqhipBpfpJOSSGhwSMSuphhLPKhrSqh8hfPASYPyPDpzSOPhp6pDSPhoPjOPPaSaP2pFhAPchJp9pLPShHhJh8SSPspghuh5S6S1PbP9SEpuPrOShHPWpISaSPPDS8SmPHPXOpSVSXhap3pzSXp7SwhwhmPepThfPyhdp7hLpwSehKpwhcpxpEp8P0POhipSSHSrpXpSPTpdhmPYpspnppSVhThiPaPhpqpuPbS1PHStScSAPASGhkhUPFpNpzP6h7hNpopohNS1PASESDPTpZh3SchSS3SUSrpUS1P5SUSnpLP0PahzPUSMSnhYhtPOpkhZp6P4PdSESlPdPUpdhHOPpqPzP7hjpYSZPbpOpLhHSjPHpZpIhghDh8hHhUhYS2h6PySMhwpTPPhJpPSRPWSnPyPyOOS2PyhgPcpWhsppPDPspMPZSihXh4PWpChjpKPBPfSWSIpWp7hahUP7p4hrpzp4S6pApSSHhDSDP6p3PmhmpsSSS5hzSxhBhZpUh8pDp9hpPop5S6hVpLhgpGh4pZPjPWPSPOhwpeP0ScPAhqhYSgPSPChqSDhFPMPFpuPkpCS5OrP8PGPYPuP4SmhfPiSGPhpBP9pBpWhIhfPxSopBhMS3pqP0pupdhVh4PjSFpnPahvPISaPjSghzhuhhOhhUpyhVhcp1SaSASYOShdp8SkSIh3PepSPDhjhdPKPGpYpPPBhHPopKp1pIpDPWPipZSYPkhZPahxSRSSplhJpCPsh7PrhMh4PqpCSQPfPJP5pmPqPEPKSNSihHpBPlpqSZhDP5SGPLPWSNP4PbpxhlSDSgpjhDSrhVSzP0hvhPPBphpgPDhTSspbhDpRhohWpvPOppplpuSgp6hzpch7PNpqhfPMSSSaPOPYpThBPSPIhGpkhHpPpUpGpGP9Ptp3SPOhhrSnhChBPWp7SyS3S9hYSmhWpaPZSIPDPxhWpcPFh8PjpeSCpZOSSuSESvSahUPaSEStSYSohch9hMSBpfhpSOPJhihEPLh3pTp4hDPuSTS4pRhDhxPKhqPcpfPhpqPeP1SxhehKPYpSPYSXhiPtPFpnScpDpupXPLSCSkPxh7p9pzpppuhmhsP3hppQhUPmSgPFp2h6prh5SPPjh8hwPJhMpRPvp9pJpjp1SGS1O2P9SZSNpoh7PJPWSJpxPxp8pZSLhGPJSUprOOpkSapGSqhGp6pdh2OhhNh8P9pBSyhHSkPBS6hLPBP6SHPXpHp1pipGPcpSSXPSSHpMhDSyP9hohAh0SYP7p0p7prhSpOhVPKP3PyOfPUPEh3SAhfh2SoPGPEhcp9hbSlP0PQShSlp2SxPKpuSihNP2hWP8pUhIP6p7P3hiS8pTP8SXPMPSPchTh0SZhKhGhjSSSkS1pahZh6psP8OpPrhtP8S9p9hlpYpppEPjpdpjOOhYSqSCP8hUPPpoS6SbpNPBPGhHPjOShuPQSRhbSdSSS3haP0PNpCP5pdhFhGhGSppVh6hQhxhJhupFPsPAhDPJSvh8pxpAhlSNpxS1hDSPhmSFhdhfh2pqPmS1h6SSOOhWPRSjhTSshXSpPePkSDpeOOPzS4hoSpPQhcP1hvpVPEhvP9pmSTS4Prp6pQPOPdS6pohoPipBSySNpHhzpCSbhsPvSoPQPlOPphhShehLO2pbhZOOS0SGSrSLhqPtSmpzhnSXpjhvh7PPh2SjSahhPgPihQP5pkSShfSMSypPSIhzpqOPPESzhOSOhqPAPApsP6pFSYSmPXSChshzhihPhSPnhUPchUSApAS1p6PehbhfPMPCPNpdhepUpoh8h1SWhiSJSsS3SaPVhxpIhOpOS5hvpFpcSXpThzhppmSAPvpNPEPDpihbpBPFPbSZPLSFSWPdhuh2SZP5OrSBhfhKPlPqpipySAhfPFOPSSSrPSpZprSypwSuSSp8pohdpPhES7OrhOhbh0SppMSnhuS2PtpkP2PVhkP6p1PaPoptOOPThIPAOPpshyh1OPpTPCSwhGPjpKpWpBhkSdPghwSVPTpASlhdPZSRhTS1pBhTP2hzpfSQhNh5plpYSehvPmhUS4PHpPpcSCPmpfPippSoP9PnSUSDpjhBPmS0hipXPGPfPuSFh0SzPuSSp0SES3hESKhiPhhvhypFS5hPSVPBPWpZhjprPySjSbpFOSpWPsSDh7SXh3pDhhpNpzpKP8SWSzhQpQhrpohLPmP0PKPtPzhYSwhNPipIOhpxStpIhMhthLS5pJPgPdSOPvPLO2pySxOSOpSRh5S1pUpfpiPUpnhbp2hCPLS7hPpNP7ShhgpjplpVPypdPmpbp0SMpBSdhYhJhvpPSDP7pxhMPFpVShPZphpFShpIp7PzSAPyPaP5pZpXpxhzhvS8pRhLSVpQOShbSupBpfh4PiSopLpQhShhSgSsSrp8PEhdP5hXPES8SNPih2PYpApWSxhoSppxpRPxSChYSmSzhnPFhkpuSrSphPpXS3PCP7PGhmpSS7SEhVh7SlpnhOhjOPOOPePuhjPYhNhApgSGp9hQSaPspTp7huhMp9puSKS0pNSfhVpxpeSGpNpgPAP3SGhOPDSnSCSfPQp8hmpTh7hRhpSePVhHhOPHS6hHhrhpPtp7POh5SIhESxpAhPpepiPBpNSdhlhKhzpfpehFhtPsh9P1SrPehtPnpQPAPGSUPgh9O2SLPzP6hrSkPvhuPdPQpRPPSUSDhrp3SdSRPmOpSqPGhzSEhkP3hbpCPGSPPcSQPmpWP3SZSepxhWSIh7PyhRpISIS6P6pdp7SmSRpQPzOPOrSihbhXP9pBPOhKpNP2POSPPwpvP3pOOfPlShptSKOOOSPYPIhFPRhySTPSSmOPS5SpPMpshyPESlPyhfSSP4PES4SYprSdhxhPpIpMPuhnSphYh4SIpuplPChHSUOSPVPqP2OpSdPshLPAPpPUPYOfS2PKSbSCPKPFSEPjh1pkSfSQPwSbPdhlPspppVPAhYOrS1pbSsSIpHhISGhHPcPRSCphpBSYhnpxhZpnpIp7pnhpPipyhSpqPXPlp2pJhppMPphshXp2SkhISJpKpMhHSCStp7pppiPrpYPRhahzp1PDhgS4PUSbpxPcpoPkh5ShhfP1prh3SpSpPdpJSFPvpXPZp1PUpOhnOhPahCSYSwhfpKhshMhePtpkPwPiPgPphSPySup2SiPxpTp0hPSaPYh8hDOPSkhphrpWSIPxhHPMSThThkphSfSEhwOPPqP1Pfh9SshHpohJPSp1pEp9pihnSshjh4PcPsp9p3PZPppIhkhcPtPZPESePahDpXSMpOPkPDpIP7SFhmhmhGptSBh3Oppyprp5PJpbOrO2OOPsPlPghOhwhIpSSxSJp6PkpNSvpRSXhhPhp2P5pkh3SePfhsSBpth1PPSTpNhGhzhePNPCSXPmpwSGhuP0PVpDhePhS8PdPkhIPGSBSbhKhvOOpqpzpdPWSZpMSHSThqpySeSfSHS2poPZp4pbPnh2PgSxhvhlSphUp4SPpWPJhLhzSQhtpdS5pZhtP4OhhEpBpQPnp9huPghDSfOhhwpghThMPsOrhlhsPkP0hWSFpQSLhqprhePnS4pVp5PxhzPvPhSZpXhSP1SQpbSYSqpjplhPpMSsh8pgpypVSfpWpUSJhZhMpxhQS1SSO2hySpPSSYS2plSiPpS6pzhAPqpxhGPHO2pnPphthohwh3SkSmOSOhSLhgP1hApVOphySKh7P6PjS3hHStPQpAP6hMS4pVhXSxSHpEp4p9PqSYhqSDpbhLPHpUSJhlp9S6SopTS5p2SgSjPPPCh3h1PXPzhWh4hqOOp0S7S1P6SMhzhASLS8plhwpqpFPfhuhhPHp5hMSfhzhtSDO2pIhhpMpBpjPUpkS4p2h3huPEPtP7PVS7SHSTStpnPUp2S4PqSUpGhlhOPMhwPqP7PePKSdhhSHPmplPlPYSrpgSLhapzSOPqPcSyPpSpStPUpKSWSwp8SMSUpmS3P0S4P9P1STpOSYp5h1hwhhhjpVhQhHPiSop6SihthjSGhqhrSApSpJhiPGSZSzhXS0SHPtp6SEpkPMpmhEhlhipcPWP8SiPZPSS8h3hBp2PCPOpBSkPepBS1SBhMp6Ofp4pQPwSNh0Ptp5SOhWpLpWSPphSkPPS1h9hZSkPTpypyhNPkPEpwpshkPzPBPEpHhPpcpNSTSFpLhxhtSkSShNhUhYPtPNOfPxh6hBP6h3p6pVpEO2SSSbp9SbPFSoPLSThTPxSqpxSdpKh4pihVPGpoSjhaPuSOhMPVP0SYhmhgStSoh9poh1pISbhvSvPkhOhiOpOPhvpxp9OrpHSQh1PphzPkSNPTpOpypShFSOhjSOSJp4pRSoPXpqh9PlpVppPwpNhoP4pzp2SUp4S8SzSrPrPLSVpQPYS3PShCpWPfhxPOpKP3pgP6SOpspeOfhNhxhGh1SqSXSuPZPWpjP6pSPXp0PUhzS6PNhnhoPnpfp0phhuPEpjPmpYSfSmhXPjStp9hxp1P5p3hMSIPyplPMhnpnPdSbpKhph6PoPLhiSHPCpKpzSyphpMPUpnSIPBP1S4PMhShXhWSwPthHPrPJp3hahnhfPnpPhgpmS5pbO2PvpKp7PUS5hDSRpYhDPyhoSfP5P4PiPChAPrPBh0S6SpPUhWPnpep4SAp3pUPCpMPGp3pDhepnPYpiOPpAp7pyPcpBh1heSYOphoSCPrPePcpDp7pOpJPYSYPmPOhLh1hqPApPPIPRSTS6OhpihYhFSrhapJSUPypRP4pUSaptpdp7pCPpSqPrpDhAPSSKhMhNPJSbhxh3S1hHPySkS4p2hRhCptPOhCOSSAh9PMPWh5SKS6hfpJSsS5PspiSApjPwpEpDP6P8POPAOrpapuP6hWhupRpkh7hdpLPvSNhdSipfpApnplprhHPqpNptpgh4pohASchYPnPhPXSbPTPEhzp5SbpkpSSuhuOPSxPKPQSEp6pXSvhKpcPepIpVpjhrSISQPTO2hKpFpHPhSjSkP3h2SCPEpeOSPIpypAhlhMhnp1hNSAPchWp4hWPGSshwhJpUPSpcPIhDO2hsPMptP4SFhFhkPahLhjpGPbpxhxSKpISQSePhPESwpKpZpgSEpRSKhApQpWPTPXp6O2P4hrSHh6hWhshppnhTPUPbSBpRpWPzPbPUplPYPrPoSGpqprSSPkP9ptSDSiSPplPtPdhbPLpzhthJh6hMptPcP1hppohASuSRplhTS3SWhYptS2SqhvhwStPChqStpghShDhISGhsP1SSp8pyP2P9PuhHPthApipzpJhtSopuPAhah6SgP8S0pepbSOhrhHSSpfhISLS4PWpppEPnSQSOP1p5P8hbhUP9S9PJSYPCPiOfSphHPHSiPgpNhppWhhStP4hkhWPGSShtpLSupgPxp6hOPrSXSNPAp9S7PPPTS9PqhShPpJpVhiSqhvhuhOPuS4SspFhmSHSShWhphZPcpgSbSRphSsPRhiSshCPESgP6PihCP7hZhEhUpLpqO2hthAS3PChySpp7hiSXS9PfSzpqphhIpUSOSfhwhePJpdPqPXpRp0hjpNSwhXP4p9PLPhSgpBPepzSnSPP8hxhfP5Ptpnh7h9p9Syh4S8PmhXPahFp1hFhVSrS9pDSxpgSxPkhupHhVhKpKS4hVOrP8Peh2pTPzpASyp7pVhvhYP7pmhXSwP1pVpdpVpEp4S2hLpHpaOfhcSipKSlSNPtPthKSupNP5h2p2SMPVPZhKhWPyhHPAhCh0paplh6pFpuhspWhwpQSyhtSzSCSkpKSVpMpXS8hOPWPSptPYSwSSP9pSS8pChNSZPXh2h5PePxPiPDPGp7SBSthIh8SAPVhLStPTPohwpgPghOpoPShWPnPghOpxS5hVhJSiSupISPpEhcSzp4h8PUPqh7PAhkPFhQSIhVp8SohrSVScSgp7SzSdSgPkPXhsPxh1SrS3hVPSPTSuSPPrh0PopbhKh3PESRSFSnPxPHSphxSTSbpepBSypSSvhyP2pMhPhAPyPqhzhrOhPMhKpepWOOhnO2hQhjSZpJSuPGhhhmSdhdhxpThhS0h0PGSaheSnSbPqPeh2pDSZhIhphJS3pkp5pqPMS9PQpLpLSXpoSQplSZpIPDSgPdSdS6hjP4pDSppaSChPPuP6pipgP3POhGSnSihbS2pxpUPQPhhGSlSaSUS2pgpYpahrplPiSYh0h1ppPrhIp9hOPCSbSipsSmPXPAhlS2hmSTpnSnhCSlSXhmpQSBPXSChgOPpTPPPnPcp3pBSgSQp3pBhwSgPththtPRPeh4P4pVSQhhhcSGh2SMh9S3PYOhSYpsSDhLSGStPopOpOSZP0pNhnhGpoh4SshgSBhkhapOScPfpWp2pISUpaSYpJhlplS6p0PwS1S5h1PXhXp2h9PtPXpqh4SkSFhxPjPQpySOSlhcpeh3hLP6S3pmhEpNPWpOPwhMS2pdP3P7S1hnSwSBPIpkSHhCPZp7hDhyPKhIS3POSGh1S1PkPKP9hZPWSISiSSS5S4O2SXh5STPbSbOOSHPyPghnSGS0SRScpphWh1S3pohWSkh0pvpohNSeSOS8Pep0p4OhPSPEpUhYSTh6SphbPSS8hQhDPVppPYpzSmp3P0PzPhp9P1Srhdp6puPPhcpfPNS0h1SpSYPTh4SqSOSmplSuptSUPUpUOrPGhCShhVp5pRh1SiPOpKPepfhEPIPGhchZSOhPP9hYhXSdPnhWhzpTpvSmhSpepQPopXSwSQS5pvSzOShUpXOShBhIPrPohkpOhMPCOSpVpEhyP4OhSeOSOOPzpEppSHSLPzhkSVhyPbhnPIpsPxPBpIPhPFPkPTpdPvpWSTpfhVplh2pGOrSAhLpBO2hgh4PyPFhfpLpmOrhkpjOOh3pEhbhVPQSqSVpTpgPspThFhJSwpYS8pfpLhJSmhKPUhKPrSVSMhoh3pBpCS9P0hBSsSgS1SHhuhQpphepEpVP1hRhOS5pUphhhSZP0PoPXh6hIhWSdpFPnpipzhdhNSOh7PDPyhPPrP7SBPMPASROppvhDPQPohtpdS2PRhTh9PQSoPKP9SnpmhJhESFpSPTSbhFPgShSvpEpXSmh1PrhSSvPZpEhqhKPhh5pKhPhThFpXp9SBPkhMp3SsPyhJSrPhp5pxhthePyh0ScSAp2pMhJhlSfhCPvShh2Snh2PQSdhlPOhGPUpnSBPRS6SMPPSsOShQSghzPUPoPTpjpfp4SUpphIStS4PWpxhIhKPxSMhfPgPXStpYSOSVp2SThZPEpAPnhxpVP0SbhupuPWPChDSlhVOpSJPvP1PmSdSUhwhqhmhTPDPESwP7hehdpThAhvh7pYhupOPmpdp0PxhGPdhwSoPShFOOhQSbSfhiSchOppSwhXSGpRS4SdSsh2SASfp2hvSqh3h9PaS8O2hAPLpnh0SePQPRpApjptpWPFhghfPRPthiSmPFPLhyhTpNPap5SWhSSepbP9hWPFhlpsp9p7SzhISMPTPuP0S4paSzhASyhySBhYphhqPNSSPuSwPASVpdP1SVhshChaSgPepShPpCPthyhXSFpYPsSgSdPmhEPiPFh5PFphhHpNpVPNpXhfpWpOhaPLP9SwPGPwSLOhPLhyPxPYSOSDSRPcPZSVpzhbSAhPPPSaPJPFhAhUS1PdpkPOSePdSPP8hspIhIplSGSRphSdpHOPPWSXSUSDpth7pwpYptSaSeSZhKhqSWpzhTp7p3huhmh5hHPESLPqPiPVhnpZPJS0PIhtPGS8pJOfpaS0p2P6hDpMPpPTp8S8PLPDSWP3ShPpP6pmhdOOpmp1pKPfplPLhYhAPDh8pQScSuhMSjP5h8hThLP8hmpWPKStPNpXS6SjPMPtp5SOS2h3hGSMPESxSqPUpBp5SAhfhaSaPxSxpQSjhYhiSppFSOh2PehXPzpBhZhSSVp9p3pTpPp9SZPYhUpQPqPEpBpchTPbpyhrPoSAhgpsS6p9OhhfhcSeShPaPlSEStP2P5SQPYhXpbOPhaS6PUSZhTP8PkSsPBpaSaSFSlSQSbhISkSbhehNSGhVpqPhpcpBScPHSfPnhMSbpipuSKPJpmPYS1pgpxOphNp3h4P9SOPFPePDhHPtpJpKP3PuPGSipiS4SKp1PsPMPRpSSFpMh4SOhkpXp7SFhqSapPSfpwpNpgh9hEPuSvpYpBhMh8PLpJP5PIpthpSlSmp5OpSOhASpPjSSPZh3pjpehihKpsPASahxPYPDhUPbPZS1SFSxPnPsp0SkhUPUSiPoPnSqOppDSgpsP9pjp6PnhIhGpph5SiP1hOpPPghSpQpKSoh8S7PnS9PwSWP7h8h2hASJpdpESlPlOSPdPwpaPaPbPAPRPjSYpThuShS2PHPaSPOPSUP4SMpqS3PTOrPdpMpIphhCPAP2phSOSlPwSbPChbPhpuSGhfPsSkhpPzhlpXpjS1pjpbSLSVPUp0pZPCPhPwp7h7OphjpQS9pUhdSwhiSbPISMpqSZScPXpkhGhfh1SMp3hcSdS9pIPcpHpwPyPROOpiPrS2h1pgSOhKhQSGSchmhrS1hhhYSIScPtPxpnPCP1hph3hkhZhfSsSGhUhZPThgh0SmpXSWhyp5hsSXPCh9hPpMPnSqpNPtSDprPrO2h3pqpIpgh0pqhghCh4Snpxphpnh6hdSSp5h1S0OPSMSopRpjSKP0S5h6pNS7SHP3SPhfPePDSNSMSupBhjpDP3p4hCpnSYPwS1PJpqpQpcpSS9PaSrSlhtSjpoSLSxPnhDh0hxpNpiSJPTSqPrSlpwhBSBhTSgPvpYPwOfpIPjOPOfSSSZp9OhSRPlhmPapypCSWSESNSfhghkS9pmPZSyOrSbPFP2psShpXpqSepdSKP5S7hiSPhSpPpdp8PhpihCpfpWpYSsPzPcSASphfPVPBpYp9SrPrpzh7SjPNPYhDhrhqhEPEhhOfS3plpehROSPqO2hDPdSDOPp3SrpThYPAhfPkSDSqPrS5h8POS1pgPEhMpkpNpShKScOrpISQS3S3S5SuP9SlPXprSshHPnhChyhShch4OPPoPGPNPThiSFPjSYhrhOS5pbhTS2pqpSp2pXPfhPh9h4SOSJPPpnSvpZpNhBSmPghwOrhip3OSh0SrPuSFPJPGPwS2hhh3SXhjSNPNS8PFS1pOhoPDStpRpfPKh0hqpchJSsP9PthpOPPTSZSbh2heSKPXPUSpSrhkSdpwp7PHP6P7p2PSSKhcSkS0OrPWhPpcS6PEPwSESph3hAPjhlpgPyhGPXStpfhZP6SHp5SlPjOpSdSkSrh0PzSLS8StSEpUSRhcpWhWpIhRhjPmpiO2hCPvh3pdP1hxpfP7pch1PtSJPOPnPrhLPppbOfhGPYScpMPUhSPgSkpXPHSoSHSlSbhbSoSiPep7S6p7pEh0p9pKhySIpqSJPjOSSShCPFpFPyhZSjpahrSGP0SeSghQPfPwpTSchGSbPPSSSlSUSeSMpop3PzpzpFhZhePVSLpSPKS7hOhYpIpJhCSlpgpiPxpMS4SYPjSLP3SESUPWhqpQhNhjh4pSPvPnp3PShehdS8hTSepFhQpQP6PUhtSSS4PAOrSch5PIhzPyh0PaShSmhxP6pTp0PtSepXSGPbpOPbSjSJhzSNSbSLPNpip0SBpjSASxhxS8hBh0P8SxSDSXhcpmOrhUPZPnhmh8pxPhSTPiSYOPPwSWh9hfpqpRSiS2P6PTpiPPSYPqhiPxPAPRPhhAOPP1SxpIpDPnp0OPS9pnPUpEhxS8PFhQPdhvhyOhPKPrPDpVhfhWpJp9p8pBSPpfhlpJhshESZpfSAPypZpwS4SSPBhsPSPaSvSUp0OppLpuSWhPpVplpKpNhqpohlSppyOOSISbhspmPrp7OOh8pRSHpdh7SjSSSppRSvOfh5hmhjhihghxSkphhtSOPCpNpChGPOSThISfpfhOplpEhFpfpOSySpSxPPpepshtP0p8PqhiSISrPmSfhrPTPhSoS3hLS1hkhsPyP9hcp3S7hwSUhBSwSsPWhYPThJPBSGSXSshnPdhqphhMSLPgS4phSKSLhvhKS0hSPhSLPepYP6hTSkhCPshcSVPQhNPwSzpgSOStptPqP3hqPZSiSSh1OrPDhohVpZSlp4S2haPjhKpOPKpgSuS1hnpeSCSrp3h6SVp6hkpzSeplhVhFpGSaSiPES4hNhahOhPpdhpPeh9S0hPSTPrPKhzpFSwptPahMSfh6SrSQhvhspfhThtSBhppQhAPlPopwpfhEStS9P9SjprpIprhJS3hLSQOrSISZhOpVhKSxOSpISPOPp4hUS0S3OOPOPOPUPHp7pZPwhPPNpqShP9hypfPzS7PmSnSiPWSxhfPhSXhxp8PyPRSqpoSzpkSCP2h9pHhUhWPzPOhXSzhFhfSZhThppphrpxOOhkhlpppYpkp4hASLp1prP3heh3SVplpOPlSZpRh1pvpJPwSRpip8pGSupwSSpXhcpCp7SOp2SLSEO2PJSwhnSRSApvPNSFP2SGhihISEPopwh0SvPdhGhsPoSypiOOSihQhvpcSYh7hIpwP4h3SFp7p6OfPLhVpfpEPWpjPRSqSSPRS2S5ShP6hYSJpUpqhMhkp7PLpDhPhIhIhBSMpSPOPyhePMSIPJS1SxhnPmPmpYSLPTP1hyh9hOSYOppMPJpePMhaP2pspSpTpppVpxpkSJhGPahThMPOh5pIhepnp4S9pnPBPQPdhIhQPZpZhqPMhCpWhdPFP3O2SdP6pihKhxPUhqPoPOPQhZSkhMP2pZp4PoPEhySfhDhQPJSUpgSjhHSrpFSiPTSUS5peptPnPsSnPXpDSMpmhVPZOrhPpSprS0p7hKhbPWh9OPhgSoh9hVhxPJSOPMpvPmpahGhDPCpwSOhMSBp2PHplOrhqpUhxPHOfhepvhBp3pjp3pHhKSCOpPBSxhvPop3OSShPHPGpKPkh6hFhjpeh1SepzpMPaSSSaPJPFpbpVhBpxPKpGpgSkPOphhaP0Srh8pnSPhqhYh5PQPghiSLhUprhYhShOPUPDP5p8ScPvS4OhpgSzhDPlSFhCP5OPPqpap9SSSQpsPSpwSrP1Smp4pkPuhYPYh3h4PBSqhGSYPVp2SBhwPqOhPzS6SWhFpZPphLP1PHPtPgP7pUSyhNh2php9SCh6pvhVhUPiSfPESPpthqhzpTSdppPxSQpaPRhDPkP9P3pjhUhAhCSChspPh2PTSCSPpUpCp2SRpUOOpjp5htP7hOh4SBStPGSXhHPphNh4PyPSpgpaSlSVPbSjPvSkhCpOPzpWSfSTSdpgPmh6pDp6pBPhPASgOhSISoPiPYSfp0pBpVpnpFSWPvhgSDPXSIPmhTPhpQPKSJSPSEhip9SJpRSlP4PEPfpXpIpvSKPth3hNPchPS5hLSih6hfP2hIP0hISkpLP8PoSUpPPHPUpMhtp5S9SDpBhjpRhTPNS0SwPWSwpUSxSZOfhPhmPqpLPGpthaPHhchHPBpJOPSnpDppPEpeptPDSNhJPxS0S8h6hyhLPfhmSkpNPKSJO2P4pgSvp3PsSpPCSshNpMhwOOSkpJPXpshcpIpChhhQSEhTPmPrSMP7hiSBpSpuSTPrpPhhpVPsPQPqp3PHP2PTS8SMOhSQP6hWhmSxPXhrOPPspnh3hUOhpRS2piSeSdPxS2S4P8P6pApTPRSup6P0PIhtp6h0hSh6Pkp8p8P1OPSYhfSBP0PNO2OpPPhGPQpVSipGSbSFPPhdSePYhxOfhlPjPHpQPQh8SKphP9pppVSPPWpASihAhAScPSpehgpvpePMpJpjSPp9SKS6PUh9pvS9p9hJpMPhPxPHhhSXhQhahRP0P4pDpBS9pPSHhoS4PepQhhPcOSpQSaSaP0SMpEpgS9p8papghTpkhhhLhShIhvh0SkpdPjScpshKSzpcP1p9pKSlSUpCSRhohaS0hopchyhChaPshfplSGSlPgpOPzP1p4StS7PYSFpVSLhwpgPkSHpqpVpGh1pehqhYpbSNSuSjh6SVSuSnS5prStPfpbpZhZStPlP3pNSKP6SQhyPkhKPfSxOrSepwSVpJPUSKPgpjS0pQp1PypjpypDPwPjSYS5hsPAhxhmSOPnSxhdPvP7Pnhph1hxpSpmPvpNpkPwp5pjP9PRp0PKhbpShyhsSXhqpRhWShS1PaPfpjpsOppmhFp0PXSNpxPGOOSlPepWSUpBpfP4PnhcSqSkS9OhhWSQh8PHSshjpFhVPphqpYSbhqSpSnhwhjSgO2SNhXPdhkpvPPSCSjSBp9P6htpqpYpaS9SKPupfhqSYSsh0hxPJpySghIhCh5hgSXSshsSQPDhIPlPiSTSoSlPNSihMSZSXhWpMS0pQh2hRPUhPhjhGpChKP2pfplSkSlPDSah6Sup8pRp0PQhwpapuhEpZp4hZSthShlpkhmhQpxSgh5pPhUOrpuPDhwpaSnSjSqhspohHPghmhdSsSQpxPVOrpbpfhlPhOfPzPFSXh3hUhXhFhySZSBhoSoPGP9p9OPPZPdhLpQp2SzSchNSJhzpfhvhWPMpjSgPxpXSRhWPehHPtp2p9hoS0pPSppQhoSFSwpFhJpEhXSzh1SCSZPdSGhKhTSiPTpkpOppSxhzP7p0h1hCSDpdp7PxShSHPRpcPAS1PwpHSThPhPpiSWP4SbpHPtpqPnPkh1hCh5PISKOOpBSohLOpp8pEPaPpPIhehKSMS1p3hePrptSdSjhwpUSoSphSppP8hNhMhOSySyPjpMPjSYScp7OPSSPJprpshMPRp2hASjhaSuSfhAPmPkPSPXPdhRSwhpP0SohyPvhVhdhLp9SphYplPqp8PWSMhwPuS9pqp2hyppO2h6P6PWp8SxSppxhdPSSvh5plPoPyh0S3hLPvPMSjpDpzPThkS2PLh6SFhbPgSSpGSlpkP4plp0hDhPpBhYSqSXPKhdpVpKSOPBhXhQhIPepUhKSmpjpJPDSQSMS9SWpTOOpchwPGp4Sqhpp6pRpNpISyhIS8pFSlS9hxSVpNOPSlpXhlpuSPPIPRP5PXhXpyPvhhPWhfPJSLh9h0pJPwhbhVpBpah0hDpxpKPap3PrpEPsOPhpSvhGP9pUPjhzhpSkPChRp6SnPgSISThwh4pbPuOOhGPoSihBptpahiP1hxSIPXSRSgShhXSWhKPopvPApnh8hoPUSqpuhMhCSThASkSQpzpkhWhUSxPUSfSkP4pQP1hBpipJSIScSUpJpuSXPLSIpcSzP3PAhTh6hoSKp9PmOfP4PxhGppp0SihNh4pXSjPBPwhqpDSrPFOSpLPMpxhSpIPBS9SZSzhGpPP4SZhPpShWpahahcpGP8hKh1pXpyhsS6PEPuSLhKSWSuSoP2PFSOp2P6h8pkSNPqOpPiprhuSKS9PyhhptpkpepfPlPYS9hXpphrpCpuSUp0SCPzSYPZpfpzPcOOPuhzpUSjhsh0psSShVh5hWPjSVPJpRpjhoP4PIOSS8SYhrhsPQSshuOSP4hphDhehwOPhnPnP2hfSppKpnhBPBpGSMSjPqhmS1S1PnhHSrpBpDSeSbPvSLPchSSmP9ShSPhPhGhDSXSMSAPepLSpPTSJhvSCPChWSKpGpKhXprhpPEhtp7pzheSwPBSKPAp8PMhqhGpNpxhqPdhNpip6PghlhkPyPGO2S3PYpcPFSghOpFhwpBhqhzhJPwSIPXP8hPOSSROSP8hipDh0pMPypxSyPIhdh9hpOOSapGSrpipdP0PuPfPahuSUPPPyOSPxO2S4hjp1hlPXScSDSshxSLPcPKSASHSBh0p0hbhaPFptSZpfhOPvPMpZS6hSP3StS8SKpEPmpFP3p7p6pmhlPgSNpIPrpGScSHSIPRSYSIPSP1Svh8pXhxS7SzppSvPIhDhbPPSePvSHhWp6hhh3SzSDS4PvSHPgSzOhOfPspRPnpwPQpyP3SgPAhLSVhvpHOhSLhwPfPaSjPBpXSdP1Sphkpap9PaSypPSyPqSyPchsh9SFSRP5SMPlPLSqhChJS6SUPlSYpWpgPUPQOppNSGphS4pMShS5pXhOh5hmpIpDpYpYp5p2p4SRhdSypGP8pMpGSNSjhOp6hgPMPopmhthgpGhPhYSTPIpGhCS9p0PaSxpnP4PPp7S8hOp7PSOhhNprSjPoSvSghGPNSTSrheOShqSqSyhgS1hZpXPbpASxhJpvS7SNp8pppYPYSIhnSHSBhdPgpxpuhSPqpfSxpMOfp6pmhkP0O2pTSeSzPhSXP3S5hTh5SEhtpbp5hGpjhKShOfS4SGpLpPPIS6SepxOhSdP4PIhKpohXhRhwPdOfSOh1P4S1SLp0PCpRhPSlSSSNPCPwSoSsPnSopLSihSpfhWpFpsS3hXpPhuSehFSsh0hAhxS5hDP5p9P0PAPXSLP3hNPHp4h4PBpiSppgpmhEpoS8PlpKS8hlSvpsPBhzSohTpCSFOSpWSjSIphhCPBh5SCpvphpdpxhOpIP1PKSxP0h2pvh2PTSlhwpbpYSiPWSxpVSPS1PuPfhTOhPsPBPPSRhyPDPuPEpgP7pyhuhPSePPhpSjSgPqPpSfPOpCpvSHOhSFSzhJSPSSh8hrhzpTPOPqP5S9PUpZptO2pkPJP8pEP0SqPvhcp1hPPwS9PgSMSOPrhgPAhUpIPLPzPhPZPdpjSxpFpNpfPnP3PpSXp3p3pgPjSqS8SVPUP0hVSSpkPiSDpphmp1hNpGS8h6PFh3psSyhdPFSep8SdOfp0P3hSPES5hUPiP6Pvh4plhSPLPApXpehRpvSPSTPZPJPrhvpthepFPgStPupyhuS9p2S7PSh5PsSTP2htPMh6pEpWpkhJSeSiSNSehspupCpQPKpvSrOrSZS6ptpTSpSOPEPEpahiS8hJSdSMh3PppKhkPgSHShhbpYhbPHpiPbS6p7OfheSrS3hoPqPbhxhnpGSGSDhHSxhIhOhKSjSDS8SJpChQPFP6hjPChKPfSWPPpbSTS9SrpChESrhlhvPTPVSHPZhPSSpiOpPwpohNhWSDhzPyhJSppvSPPJPWpep1SPhiP7SZSWplOPhOpPh7SxpjhESopiPHhVpdhjpwpHpzPUPMplPipahgPtPZp4hGhIh6hUPhPRhdhKOrPNPKhaS2h3SkPxP6SVS2OSPjPQOrSPpQhsSqhIpnh7S4pPP4hFhfOppqhJOhh8S4hLpqpNhdp8PzSXplpvPHpbPIpjp4SMp7hopIpNPgpCh3hKpFSHhPhEOrSPhaPPSUhNp9pfPFPYhxS5SJScp2S9pEptpzhSSYSrpEhwpPPRpqhbpwpvpfP9hrpXpkpjSYh2h5SwplP0PEhehvP1SXSISJhKp5Snh2hEp0pwhSP9StpzPSSbPKPuP2hiOhPYSWSRSqh2SpphSohHpJP9p3ShPbPIpSPrPfPfp7PlPgS3pPPUpcPiSxhEPoPhphP9pTpRStpES4OpS7PbSRp3plphP8S8SHhjpHpmS8S4hYSlSrhOPZh8PiOPPGO2hGpwStSiPwSkpap1pGpQSBPESPhmSHh7hEP5prhop2PCSnSoSvPxhbpMSqpTSpP8pOh5hvp7SGSsS4p7h3p7p2PWSMhqhgSYhihVPtS8hlSwhrpYO2pxPehQO2PyhPprhapKPyhypAh4pwSBheSoPFSOPspxhNhnSmSgh7PsSIPiS8PJPQSCSAplpKhvPXhePqPaSyPThPPSpzhfpuPYhehnheSWp0P1hIS4pYpuhMpMhLPJS6hWh0SQpipBS0SlPuSVpChWShPSS0h9PFSPhsSRSiP4PpSNP7PWPJPnPwPZpNSTpgS9p3PhhSPrpnpvpAhghshDpPPHOrPGS1pChIhLSCpVpwpThZhjSUhWSThfS4pwSFpkSdPRhmpQhMpkSFSOPqhIStSxPIpnSNSOhlhOhgpAhPPTPZpyhZPPpISvhBpeP2PyPCp4S2SOPbhmSePBSrhQpnP6p0hXSbPphkSNSCPMPdOfP5PsSmpxp1pQPBhNOrhbPCpxhbP7p6pipjpYpvh5pKP5pYpHpaSzPmhOpChiOpOhhlhnhNpRP3h9SvptOSS4pchzhwhbPYP3hghEO2PdpWpuSiPESrPUOfpiS0PBp7PFpzhMSsPHSoPmpwpMhhSCpopop1PpP4Psh0pqPRhBpFSApMPShkOSPjpkpeSihePnhmpQP1pzPSSVpzPQPLhhS7SyPmpiSJS5pThgPqpfhtPtS5pEPzpDpPhaS3SwSbpup5pThzOrSshupsP8P6h9OfpnSlPTPCS8PDhypdhKP3pVSHSnhJPVhUPDSPhGSTP0SVhfPMPFP7SSPUSPPRPOPnPRhpp8pDPESWShpTPHpNpUhYpfPkPahwpVpep3SESCPoSvpipUpLp4hkhxSFPmhRO2Pvh2PCSlSUhaPGpphzpZpdSwhSPOSYpQhxPIpfPmS4p8PRPkOpPASyhXSHh4pjpTP7SjPbSapOSqP0hWSjPgpBpoh5PgPzh5SPP2PDS3h7PnpMSvSiPTSkPPPWPbpyPZhupqh1ScPdS9pSh8prP5S3p1hUpgPop3PIScSApBSzpKpcp3SghQPtpySQPohqpQPdhOpcPpO2PkhWSopSprhBPQhEhJp5PoSnP8PyOpOfhfp8hKpOP4PRSOS4hHhfpvP4plhPhjhaSZPfhYhySHSkS4hMOpPCPSpPOOP5PxStSCpSPAPgPtpapFpTOShFhZpPhXpXpsPDhcPjS2hbP2OppzPzSESIOhpZpoSdhsSJpQp8PzpTSVPLP7hWSah1OhP9SYhUptPGPmpePnSZSJhBSkpvhEhZPOPihXhHPwpcPnPxPkSDSsSCPlSsPgP7h1h5pCSnPopIhiP0pySnpCpWhNhDpgPipHpdPISVPfhtS1SRhFhxPxSrSGpxOhSeptpopwhgSQhmp6P5S6OhhQP9S9pxO2pBOphcpWh0PnhPpAPnSNhQhGpmpWSQSkOPSgSYPcPoPlhJhnpQhRS3peP3hJpRSnS2prSDSTPShnhZpMSaPEPspzpoStSKP4hXpXhaPrpyp9S1PkPAS7OOpfPIpdh2pISBhvpWPdPdh4PMpWpqSppjSLPNSDhyhXSop3SehJhTPLh4h5PNPJpHpcPXPypjh0SvpnprSzSFSgpdSZhuPIhnprPgPCPZPcS2plP8hwhGPgP9hNP7hYSaPDhjhzSvP7PGPthPp6hnhphPS8pepHhQpvSqpqO2PSS4PEhmhjP4SiS0SMpNP0SdhkPVhApmpuSZh3pEhEShPZPkSnpcSISypdpQOOSXpfhqSrhzPoS2PCPpP9SESWPEpphLPxpshPpJP6SvpIp4PAhfPZp5p6SYPghHpBShSiPCPnpMPiPApsPrpiSmOhSVhLhzSDOOSghkpHpISnSmSJP1hMPiPWP4PNhhpnhph0p4h1PIpeSJpYShSzSPprpUpdpzhmpChkSthwP5p3PjPDSHSxh5PxPGS2hchIp4PEpvOOPXpthqS6pbS8pYPMpth2SiSZSJhWSNPRp8PXpbPvhsSLPKphpjhBpepLhePgSES2hJS8pcPMhuhLhdhHprSlPghWhBShp4pLpEhppjhxhGpRPzS3PNpTPTSvpRpChwpSpzpyphS7pSSyhzh5PGpoOPpahOp8p8SvhGhUpVP2SlSch0p5hZP0pxSGhjhXSApuSOhkh4pEhspjhKPXSNSwpASzhSSqpvPmPzhIhJPhPhPZPpPNpqpOS4prScSjSmPah7p7S1STSqSPpISdhFPbhipKSiP4hOSRpvpxO2P7PROfSwSEPEPIpWPCp8PWPuPBSPpLhRPDhRh0PUSJSppiPrh7pphFpyhVpBSwhxhmSAplPIhkP7hHPQhlSNpphUStpIPsOpSYpoP6O2Srp3p9PypPp1hrSiSYh4PZhbpQhySFhqPPPvSTheP3pgpmhtPDS9hlpTS8SfPfPRSzPRhjSipNSuhOPupbhcpHp2pDPbPtpKhHpUS7hHpmOSp5PYhZPXSMhqhYpkP6SiSlpkpop3hRPWpohvp9PWpSP2pUPPPhS1p7pgSNPGhpSUP9h2ShSSSlSbSxhphRhEPBhhP2OhhpPRPkSSphpVPvpQhShvPChrp0SiOPpPhIpKhoSjSshiSQP8OhhtS7STPfhApdhbPkhSP5pShIpgP0Pypkp0PmpPhdhUPVptPaOhPnpJpoPzpsS3paSCSFPAPqpfPlOfhQhbSQS8pzS4pVhhpnhtO2PrhLhmSvpiPth6htSNPypJPBhJpOPLPxhhSSStOPpPpshvSSpUSphfPmP7PZPfOSPrSKh3OfPfpDP7heppPApahxhfhHpEp0hZpwPqPThHSOP9SgSRpOpOPFPPpfSYhTPOPgPnhipuOrShhIpbOfhWhth0hNOfp3SUhnpXh2phh0SIhcPlSvPePShJS1pSpkP7SnSlSKOhpRPVSOPSSiSYPTpJPDSpp2SgpqSdSJSshTP9plPchNhmhRSkpWhZhYhFpChUP8S9SZpIhsOppePWpMPMpzSVSEpWh2PLP0hbS0S7hLPqhLhJOph5hoSUPaScPDS9Pyp3ptpMSApGhkh0hDPqSHh0PShlhWpkPVP9SnOfP6PaOOhnhoS6pnpIpPpJhohXhFPJSCpfpVSbSlPmhZPKOPPkSyhCpUP0pTSHPcPtOSpEPyhFhuS8Swh7PipwO2SThapKOSSJP0h6P0SvS5SwSuPrp7hfPZpWprOOPmp8PIh5SnSPSipGPHpUpTSvh1hWPchAh5hBPRPkPJPkp2P5hWplP2pAhCpth9Sq",21939));
    CAI["Cmd"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",31584));
    CAI["Terminal"]=eval(__cwasmDecode__.Decode("artgine/util_imple/CAI.js","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",35384));
}

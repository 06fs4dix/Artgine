var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { CUtil } from "../basic/CUtil.js";
import { URLPatterns } from "../network/CServerMain.js";
import { CFile } from "../system/CFile.js";
import { CAuthServer, isAuthedReq, isValidToken } from './CAuthServer.js';
import { GetAppJSON, GetRootPaths, GetLoadedSettingsFileName } from '../../desktop/MainFunc.js';
import { CUtilSystem } from '../system/CUtilSystem.js';
import { CStorage } from '../system/CStorage.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as nodePath from 'path';
const _exec = promisify(exec);
const execAsync = (cmd, opts) => _exec(cmd, { maxBuffer: 64 * 1024 * 1024, ...opts });
async function getGitRoot(dirPath) {
    try {
        const { stdout } = await execAsync(`git -C "${dirPath}" rev-parse --show-toplevel`);
        return stdout.trim().replace(/\\/g, '/');
    }
    catch {
        return null;
    }
}
async function detectVcsType(dirPath) {
    try {
        await execAsync(`svn info "${dirPath}"`);
        return "svn";
    }
    catch { }
    const tryGit = async (d) => { try {
        await execAsync(`git -C "${d}" rev-parse --git-dir`);
        return true;
    }
    catch { } return false; };
    if (await tryGit(dirPath))
        return "git";
    const parent = nodePath.dirname(nodePath.resolve(dirPath));
    if (parent !== nodePath.resolve(dirPath) && await tryGit(parent))
        return "git";
    return null;
}
function parseSvnStatus(stdout) {
    return stdout.split('\n')
        .filter(l => l.length >= 9)
        .map(l => ({ status: l[0], file: l.slice(8).trim() }))
        .filter(i => i.file && (i.status === 'M' || i.status === 'A' || i.status === 'D' || i.status === '?'));
}
function parseGitStatus(stdout, dirPath) {
    const priority = { 'M': 4, 'A': 3, 'D': 2, '?': 1 };
    const toStatus = (c) => c === 'M' ? 'M' : c === 'A' ? 'A' : c === 'D' ? 'D' : (c === '?' ? '?' : null);
    return stdout.split('\n')
        .filter(l => l.length >= 3)
        .map(l => {
        const x = toStatus(l[0]);
        const y = toStatus(l[1]);
        const file = nodePath.join(dirPath, l.slice(3).trim()).replace(/\\/g, '/');
        const s = (x && y)
            ? (priority[x] >= priority[y] ? x : y)
            : (x || y);
        return s ? { status: s, file } : null;
    })
        .filter((i) => !!i && !!i.file);
}
async function getVcsStatus(dirPath) {
    const map = new Map();
    const normalize = (p) => p.replace(/\\/g, '/').replace(/\/+$/, '');
    const base = normalize(nodePath.resolve(dirPath));
    const priority = { 'M': 4, 'A': 3, 'D': 2, '?': 1 };
    const addEntry = (rawPath, s) => {
        const abs = normalize(nodePath.resolve(rawPath));
        if (!abs.startsWith(base + '/') && abs !== base)
            return;
        const rel = abs.slice(base.length + 1);
        const first = rel.split('/')[0];
        if (!first)
            return;
        if (s === '?' && rel.includes('/'))
            return;
        const existing = map.get(first);
        if (!existing || priority[s] > priority[existing])
            map.set(first, s);
    };
    const vcs = await detectVcsType(dirPath);
    if (vcs === 'svn') {
        try {
            const { stdout } = await execAsync(`svn status "${dirPath}"`);
            for (const { status, file } of parseSvnStatus(stdout))
                addEntry(file, status);
        }
        catch { }
    }
    else if (vcs === 'git') {
        try {
            const gitRoot = await getGitRoot(dirPath) || dirPath;
            const { stdout } = await execAsync(`git -C "${dirPath}" status --short`);
            for (const { status, file } of parseGitStatus(stdout, gitRoot))
                addEntry(file, status);
        }
        catch { }
    }
    return map;
}
function resolveAbs(p) {
    return nodePath.resolve(p).replace(/\\/g, '/');
}
function isInsideRoot(rootPath, targetPath) {
    const base = resolveAbs(rootPath).replace(/\/+$/, '');
    const target = resolveAbs(targetPath);
    return target === base || target.startsWith(base + '/');
}
async function isInsideAnyRoot(targetPath) {
    const roots = await getRoots();
    return roots.some(r => isInsideRoot(r.path, targetPath));
}
async function getRoots() {
    const _cfg = await GetAppJSON();
    const serverPath = new URL(_cfg.url).pathname.replace(/\/+$/, '') || '/Artgine';
    const roots = GetRootPaths(_cfg).map((p, i) => ({ path: resolveAbs(p), url: serverPath + '/Root' + i, name: p }));
    const workPath = resolveAbs('./');
    if (!roots.some(r => r.path === workPath)) {
        roots.push({ path: workPath, url: serverPath, name: './' });
    }
    return roots;
}
async function validateRoot(rootParam) {
    const roots = await getRoots();
    if (!rootParam)
        return roots[0] ?? null;
    const match = roots.find(r => resolveAbs(r.path) === resolveAbs(rootParam));
    return match ?? null;
}
function applyVcsStatus(list, vcsMap) {
    return list.map(item => {
        const s = vcsMap.get(item.name);
        return s ? { ...item, Status: s } : item;
    });
}
let CFileServer = class CFileServer extends CAuthServer {
    IsAuth(_json, req) {
        const token = _json.GetStr('token');
        return token ? isValidToken(token) : isAuthedReq(req);
    }
    constructor() {
        super();
        this.On("/File/Root", this.onRoot.bind(this));
        this.On("/File/Redirection", this.onRedirection.bind(this));
        this.On("/File/List", this.onList.bind(this));
        this.On("/File/Mkdir", this.onMkdir.bind(this));
        this.On("/File/Delete", this.onDelete.bind(this));
        this.On("/File/Upload", this.onUpload.bind(this));
        this.On("/File/VCS", this.onVCS.bind(this));
        this.On("/File/Restart", this.onRestart.bind(this));
    }
    async onRestart(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        await CUtilSystem.Spawn('npm', ['run', 'start', '--', GetLoadedSettingsFileName()], 'ignore', process.cwd(), null, true, false);
        return JSON.stringify({ ok: true });
    }
    async onRoot(_json, _req, _res) {
        const roots = await getRoots();
        const root = await validateRoot(_json.GetStr("RootPath")) ?? roots[0];
        const fix = (_str) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
        return JSON.stringify({
            RootPath: fix(root.path),
            RootUrl: root.url,
            roots,
        });
    }
    async onRedirection(_json, _req, _res) {
        const body = (_req.body && typeof _req.body === 'object') ? _req.body : {};
        let path = body["path"] || "/";
        let fun = body["fun"];
        let data = body["data"];
        let option = body["option"];
        let rootParam = body["RootPath"];
        let extraQ = "";
        if (rootParam) {
            const root = await validateRoot(rootParam);
            if (root)
                extraQ += `&RootPath=${encodeURIComponent(rootParam)}&RootUrl=${encodeURIComponent(root.url)}`;
        }
        const fix = (_str) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
        if (fun?.includes("CreateFolder") || fun?.includes("Delete") || fun?.includes("SoundPlayList")) {
            if (!this.IsAuth(_json, _req)) {
                _res.status(403);
                return JSON.stringify({ ok: false, msg: "Unauthorized" });
            }
            const currentRoot = await validateRoot(rootParam);
            if (currentRoot === null) {
                _res.status(403);
                return JSON.stringify({ ok: false, msg: "Invalid RootPath" });
            }
            const currentRootPath = currentRoot.path;
            if (fun?.includes("CreateFolder")) {
                const targetPath = fix(currentRootPath + data);
                if (!isInsideRoot(currentRootPath, targetPath)) {
                    _res.status(403);
                    return JSON.stringify({ ok: false, msg: "Path escapes root" });
                }
                await CFile.FolderCreate(targetPath);
            }
            else if (fun?.includes("Delete")) {
                const targetPath = fix(currentRootPath + data);
                if (!isInsideRoot(currentRootPath, targetPath)) {
                    _res.status(403);
                    return JSON.stringify({ ok: false, msg: "Path escapes root" });
                }
                await CFile.Delete(targetPath);
            }
            else if (fun?.includes("SoundPlayList")) {
                const targetPath = fix(currentRootPath + path + option + ".soundlist");
                if (!isInsideRoot(currentRootPath, targetPath)) {
                    _res.status(403);
                    return JSON.stringify({ ok: false, msg: "Path escapes root" });
                }
                CFile.Save(data, targetPath);
            }
        }
        _res.redirect(302, "../proj/Control/Control.html" + `?path=${path}${extraQ}`);
        return null;
    }
    async onList(_json, _req, _res) {
        const fileListPublic = CStorage.Get("fileListPublic", "false") === "true";
        const authed = this.IsAuth(_json, _req);
        if (!fileListPublic && !authed) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        let path = _json.GetStr("path") || "/";
        const currentRoot = await validateRoot(_json.GetStr("RootPath"));
        if (currentRoot === null) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Invalid RootPath" });
        }
        const currentRootPath = currentRoot.path;
        const currentDown = currentRoot.url;
        const fix = (_str) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
        const targetPath = fix(currentRootPath + path);
        if (!isInsideRoot(currentRootPath, targetPath)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Path escapes root" });
        }
        let list = await CFile.FolderList(targetPath);
        if (!authed) {
            const mediaExts = ["png", "jpg", "jpeg", "bmp", "mp3", "ogg", "mp4", "mov", "avi"];
            list = list.filter((item) => !item.file || mediaExts.includes(item.ext));
        }
        list = list.filter((item) => !item.name.toLowerCase().includes("secret"));
        const vcsMap = await getVcsStatus(targetPath);
        if (vcsMap.size > 0)
            list = applyVcsStatus(list, vcsMap);
        list = list.slice().sort((a, b) => {
            if (a.file !== b.file)
                return a.file ? 1 : -1;
            return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        });
        return JSON.stringify({ RootPath: fix(currentRootPath), list, path, RootUrl: currentDown });
    }
    async onMkdir(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        const fix = (_str) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
        const currentRoot = await validateRoot(_json.GetStr("RootPath"));
        if (currentRoot === null) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Invalid RootPath" });
        }
        const currentRootPath = currentRoot.path;
        const data = _json.GetStr("data");
        const targetPath = fix(currentRootPath + data);
        if (!isInsideRoot(currentRootPath, targetPath)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Path escapes root" });
        }
        const ok = await CFile.FolderCreate(targetPath);
        return JSON.stringify({ ok });
    }
    async onDelete(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        const fix = (_str) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
        const currentRoot = await validateRoot(_json.GetStr("RootPath"));
        if (currentRoot === null) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Invalid RootPath" });
        }
        const currentRootPath = currentRoot.path;
        const data = _json.GetStr("data");
        const fullPath = fix(currentRootPath + data);
        if (!isInsideRoot(currentRootPath, fullPath)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Path escapes root" });
        }
        try {
            await execAsync(`svn info "${fullPath}"`);
            await execAsync(`svn delete "${fullPath}"`);
        }
        catch {
            await CFile.Delete(fullPath);
        }
        return JSON.stringify({ ok: true });
    }
    async onUpload(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        let path = _json.GetStr("path");
        let nameArr = _json.GetArray("name");
        let dataArr = _json.GetArray("data");
        const fix = (_str) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
        const filePaths = nameArr.mArray.map((n) => fix(path + n));
        for (const filePath of filePaths) {
            if (!await isInsideAnyRoot(filePath)) {
                _res.status(403);
                return JSON.stringify({ ok: false, msg: "Path escapes root" });
            }
        }
        for (let i = 0; i < nameArr.mArray.length; ++i) {
            const filePath = filePaths[i];
            const fileData = CUtil.Base64ToArray(dataArr.mArray[i]);
            CFile.Save(fileData, filePath);
            CFile.PushCache(filePath, fileData);
        }
        return JSON.stringify({ ok: true });
    }
    async onVCS(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        const action = _json.GetStr("action");
        const rawPath = _json.GetStr("path") || "./";
        const fixPath = (p) => p.replace(/\\/g, "/").replace(/\/+/g, "/");
        const path = fixPath(rawPath);
        const files = _json.GetArray("files").mArray;
        const message = _json.GetStr("message") || "";
        const quote = (p) => `"${p.replace(/"/g, '\\"')}"`;
        const isDir = path.endsWith("/");
        const dirPath = isDir ? path : fixPath(nodePath.dirname(path));
        if (!await isInsideAnyRoot(dirPath)) {
            return JSON.stringify({ ok: false, msg: "Path escapes allowed roots" });
        }
        const vcs = await detectVcsType(dirPath);
        if (!vcs)
            return JSON.stringify({ ok: false, msg: "SVN/Git not found. Check installation." });
        try {
            if (action === "diff") {
                let cmd;
                if (vcs === 'svn') {
                    cmd = `svn diff ${quote(path)}`;
                }
                else if (isDir) {
                    cmd = `git -C ${quote(path)} diff`;
                }
                else {
                    cmd = `git -C ${quote(dirPath)} diff -- ${quote(nodePath.basename(path))}`;
                }
                const { stdout } = await execAsync(cmd);
                return JSON.stringify({ ok: true, vcs, diff: stdout });
            }
            if (action === "status") {
                const cmd = vcs === 'svn'
                    ? `svn status ${quote(path)}`
                    : `git -C ${quote(path)} status --short -- .`;
                const { stdout } = await execAsync(cmd);
                const gitRoot = vcs === 'git' ? (await getGitRoot(dirPath) || path) : path;
                const items = vcs === 'svn'
                    ? parseSvnStatus(stdout)
                    : parseGitStatus(stdout, gitRoot);
                return JSON.stringify({ ok: true, vcs, items });
            }
            let cmd = "";
            if (action === "update") {
                if (vcs === 'svn') {
                    const { stdout, stderr } = await execAsync(`svn update ${quote(path)}`);
                    const revMatch = (stdout + stderr).match(/At revision (\d+)/);
                    return JSON.stringify({ ok: true, vcs, msg: (stdout + stderr).trim(), revision: revMatch?.[1] ?? null });
                }
                else {
                    const { stdout, stderr } = await execAsync(`git -C ${quote(dirPath)} pull && git -C ${quote(dirPath)} submodule update --remote --recursive`);
                    let revision = null;
                    try {
                        const { stdout: logOut } = await execAsync(`git -C ${quote(dirPath)} log -1 --format="%h %s"`);
                        revision = logOut.trim() || null;
                    }
                    catch { }
                    return JSON.stringify({ ok: true, vcs, msg: (stdout + stderr).trim(), revision });
                }
            }
            else if (action === "add") {
                if (vcs !== 'svn')
                    return JSON.stringify({ ok: false, msg: "Add is SVN-only. Use commit for Git (git add is implicit)." });
                cmd = `svn add ${files.map(quote).join(" ")}`;
            }
            else if (action === "revert") {
                if (vcs === 'svn') {
                    cmd = `svn revert ${files.map(quote).join(" ")}`;
                }
                else {
                    const CHUNK = 50;
                    let revertOut = '';
                    for (let i = 0; i < files.length; i += CHUNK) {
                        const chunk = files.slice(i, i + CHUNK);
                        const { stdout: s, stderr: e } = await execAsync(`git -C ${quote(path)} restore ${chunk.map(quote).join(" ")}`);
                        revertOut += s + e;
                    }
                    return JSON.stringify({ ok: true, vcs, msg: revertOut.trim() });
                }
            }
            else if (action === "commit") {
                if (vcs === 'svn') {
                    cmd = `svn commit -m ${quote(message)} ${files.map(quote).join(" ")}`;
                }
                else {
                    const CHUNK = 50;
                    let addOut = '';
                    for (let i = 0; i < files.length; i += CHUNK) {
                        const chunk = files.slice(i, i + CHUNK);
                        try {
                            const { stdout: s, stderr: e } = await execAsync(`git -C ${quote(path)} add ${chunk.map(quote).join(" ")}`);
                            addOut += s + e;
                        }
                        catch (addErr) {
                            addOut += addErr.stderr || addErr.message || String(addErr);
                        }
                    }
                    const { stdout: commitOut, stderr: commitErr } = await execAsync(`git -C ${quote(path)} commit -m ${quote(message)}`);
                    let pushOut = '';
                    let pushFailed = false;
                    try {
                        const { stdout: ps, stderr: pe } = await execAsync(`git -C ${quote(path)} push`);
                        pushOut = ps + pe;
                    }
                    catch (pushErr) {
                        pushOut = pushErr.stderr || pushErr.message || String(pushErr);
                        pushFailed = true;
                    }
                    return JSON.stringify({ ok: !pushFailed, vcs, msg: (addOut + commitOut + commitErr + pushOut).trim() });
                }
            }
            else {
                return JSON.stringify({ ok: false, msg: "Unknown action" });
            }
            const { stdout, stderr } = await execAsync(cmd);
            return JSON.stringify({ ok: true, vcs, msg: (stdout + stderr).trim() });
        }
        catch (e) {
            return JSON.stringify({ ok: false, msg: e.stderr || e.message || String(e) });
        }
    }
};
CFileServer = __decorate([
    URLPatterns(["/File/Root", "/File/List", "/File/Redirection", "/File/Upload", "/File/Mkdir", "/File/Delete", "/File/VCS", "/File/Restart"])
], CFileServer);
export { CFileServer };

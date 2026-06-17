import { CJSON } from "../basic/CJSON.js";
import { CUtil } from "../basic/CUtil.js";
import { URLPatterns } from "../network/CServerMain.js";
import { CFile } from "../system/CFile.js";
import { Request, Response } from 'express';
import { CAuthServer, isAuthedReq } from './CAuthServer.js';
import { GetAppJSON, GetRootPaths } from '../../desktop/MainFunc.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as nodePath from 'path';

const _exec = promisify(exec);
const execAsync = (cmd: string, opts?: { cwd?: string }) => _exec(cmd, { maxBuffer: 64 * 1024 * 1024, ...opts });

type VcsStatus = "M" | "A" | "D" | "?";
type VcsType = "svn" | "git";

async function getGitRoot(dirPath: string): Promise<string | null> {
    try {
        const { stdout } = await execAsync(`git -C "${dirPath}" rev-parse --show-toplevel`);
        return stdout.trim().replace(/\\/g, '/');
    } catch { return null; }
}

async function detectVcsType(dirPath: string): Promise<VcsType | null> {
    try { await execAsync(`svn info "${dirPath}"`); return "svn"; } catch {}
    const tryGit = async (d: string) => { try { await execAsync(`git -C "${d}" rev-parse --git-dir`); return true; } catch {} return false; };
    if (await tryGit(dirPath)) return "git";
    const parent = nodePath.dirname(nodePath.resolve(dirPath));
    if (parent !== nodePath.resolve(dirPath) && await tryGit(parent)) return "git";
    return null;
}

function parseSvnStatus(stdout: string): {status: VcsStatus, file: string}[] {
    return stdout.split('\n')
        .filter(l => l.length >= 9)
        .map(l => ({ status: l[0] as VcsStatus, file: l.slice(8).trim() }))
        .filter(i => i.file && (i.status === 'M' || i.status === 'A' || i.status === 'D' || i.status === '?'));
}

function parseGitStatus(stdout: string, dirPath: string): {status: VcsStatus, file: string}[] {
    const priority: Record<string, number> = { 'M': 4, 'A': 3, 'D': 2, '?': 1 };
    const toStatus = (c: string): VcsStatus | null =>
        c === 'M' ? 'M' : c === 'A' ? 'A' : c === 'D' ? 'D' : (c === '?' ? '?' : null);
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
        .filter((i): i is {status: VcsStatus, file: string} => !!i && !!i.file);
}

async function getVcsStatus(dirPath: string): Promise<Map<string, VcsStatus>> {
    const map = new Map<string, VcsStatus>();
    const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '');
    const base = normalize(nodePath.resolve(dirPath));
    const priority: Record<string, number> = { 'M': 4, 'A': 3, 'D': 2, '?': 1 };

    const addEntry = (rawPath: string, s: VcsStatus) => {
        const abs = normalize(nodePath.resolve(rawPath));
        if (!abs.startsWith(base + '/') && abs !== base) return;
        const rel = abs.slice(base.length + 1);
        const first = rel.split('/')[0];
        if (!first) return;
        if (s === '?' && rel.includes('/')) return;
        const existing = map.get(first);
        if (!existing || priority[s] > priority[existing]) map.set(first, s);
    };

    const vcs = await detectVcsType(dirPath);
    if (vcs === 'svn') {
        try {
            const { stdout } = await execAsync(`svn status "${dirPath}"`);
            for (const { status, file } of parseSvnStatus(stdout)) addEntry(file, status);
        } catch {}
    } else if (vcs === 'git') {
        try {
            const gitRoot = await getGitRoot(dirPath) || dirPath;
            const { stdout } = await execAsync(`git -C "${dirPath}" status --short`);
            for (const { status, file } of parseGitStatus(stdout, gitRoot)) addEntry(file, status);
        } catch {}
    }
    return map;
}

function resolveAbs(p: string): string {
    return nodePath.resolve(p).replace(/\\/g, '/');
}

function isInsideRoot(rootPath: string, targetPath: string): boolean {
    const base = resolveAbs(rootPath).replace(/\/+$/, '');
    const target = resolveAbs(targetPath);
    return target === base || target.startsWith(base + '/');
}

async function isInsideAnyRoot(targetPath: string): Promise<boolean> {
    const roots = GetRootPaths(await GetAppJSON());
    return roots.some(r => isInsideRoot(r, targetPath));
}

async function validateRoot(rootParam: string | undefined): Promise<string | null> {
    const roots = GetRootPaths(await GetAppJSON());
    if (!rootParam) return roots[0];
    const match = roots.find(r => resolveAbs(r) === resolveAbs(rootParam));
    return match ?? null;
}

function applyVcsStatus(
    list: { file: boolean; name: string; ext: string }[],
    vcsMap: Map<string, VcsStatus>
): ({ file: boolean; name: string; ext: string; Status?: VcsStatus })[] {
    return list.map(item => {
        const s = vcsMap.get(item.name);
        return s ? { ...item, Status: s } : item;
    });
}

@URLPatterns(["/File/Root", "/File/List", "/File/Redirection", "/File/Upload", "/File/Mkdir", "/File/Delete", "/File/VCS", "/File/CMD", "/File/Remote"])
export class CFileServer extends CAuthServer
{
    private IsAuth(req: Request): boolean {
        return isAuthedReq(req);
    }

    constructor()
    {
        super();

        this.On("/File/Root", this.onRoot.bind(this));
        this.On("/File/Redirection", this.onRedirection.bind(this));
        this.On("/File/List", this.onList.bind(this));
        this.On("/File/Mkdir", this.onMkdir.bind(this));
        this.On("/File/Delete", this.onDelete.bind(this));
        this.On("/File/Upload", this.onUpload.bind(this));
        this.On("/File/VCS", this.onVCS.bind(this));
        this.On("/File/CMD", this.onCmd.bind(this));
        this.On("/File/Remote", this.onRemote.bind(this));
    }

    async onRoot(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        const _cfg = await GetAppJSON();
        const serverPath = new URL(_cfg.url).pathname.replace(/\/+$/, '') || '/Artgine';
        const roots = GetRootPaths(_cfg).map((p, i) => ({ path: p, url: serverPath + '/Root' + i, name: p }));
        const requestedRootPath = _json.GetStr("RootPath");
        const requestedRootUrl = _json.GetStr("RootUrl");
        const root = roots.find(r => r.path === requestedRootPath || r.url === requestedRootUrl) ?? roots[0];
        const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
        return JSON.stringify({
            RootPath: fix(root.path),
            RootUrl: root.url,
            roots,
        });
    }

    async onRedirection(_json: CJSON, _req: Request, _res: Response): Promise<string | null> {
        const body = (_req.body && typeof _req.body === 'object') ? _req.body as Record<string,string> : {};
        let path   = body["path"] || "/";
        let fun    = body["fun"];
        let data   = body["data"];
        let option = body["option"];

        let rootParam = body["RootPath"];
        let downParam = body["RootUrl"];
        let extraQ = "";
        if(rootParam) extraQ += `&RootPath=${encodeURIComponent(rootParam)}`;
        if(downParam) extraQ += `&RootUrl=${encodeURIComponent(downParam)}`;

        const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");

        if (fun?.includes("CreateFolder") || fun?.includes("Delete") || fun?.includes("SoundPlayList")) {
            if (!this.IsAuth(_req)) {
                _res.status(403);
                return JSON.stringify({ ok: false, msg: "Unauthorized" });
            }

            const currentRootPath = await validateRoot(rootParam);
            if (currentRootPath === null) {
                _res.status(403);
                return JSON.stringify({ ok: false, msg: "Invalid RootPath" });
            }

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

        _res.redirect(302, "../proj/Home/Home.html" + `?path=${path}${extraQ}`);
        return null;
    }

    async onList(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        let path = _json.GetStr("path") || "/";
        const currentRootPath = await validateRoot(_json.GetStr("RootPath"));
        if (currentRootPath === null) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Invalid RootPath" });
        }
        let currentDown = _json.GetStr("RootUrl");

        const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
        const targetPath = fix(currentRootPath + path);
        if (!isInsideRoot(currentRootPath, targetPath)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Path escapes root" });
        }

        let list = await CFile.FolderList(targetPath);

        if (!this.IsAuth(_req)) {
            const mediaExts = ["png","jpg","jpeg","bmp","mp3","ogg","mp4","mov","avi"];
            list = list.filter((item: { file: boolean; name: string; ext: string }) => !item.file || mediaExts.includes(item.ext));
        }

        list = list.filter((item: { file: boolean; name: string; ext: string }) => !item.name.toLowerCase().includes("secret"));

        const vcsMap = await getVcsStatus(targetPath);
        if (vcsMap.size > 0) list = applyVcsStatus(list, vcsMap);

        return JSON.stringify({ RootPath: fix(currentRootPath), list, path, RootUrl: currentDown });
    }

    async onMkdir(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        if (!this.IsAuth(_req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
        const currentRootPath = await validateRoot(_json.GetStr("RootPath"));
        if (currentRootPath === null) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Invalid RootPath" });
        }
        const data = _json.GetStr("data");
        const targetPath = fix(currentRootPath + data);
        if (!isInsideRoot(currentRootPath, targetPath)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Path escapes root" });
        }
        const ok = await CFile.FolderCreate(targetPath);
        return JSON.stringify({ ok });
    }

    async onDelete(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        if (!this.IsAuth(_req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
        const currentRootPath = await validateRoot(_json.GetStr("RootPath"));
        if (currentRootPath === null) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Invalid RootPath" });
        }
        const data = _json.GetStr("data");
        const fullPath = fix(currentRootPath + data);
        if (!isInsideRoot(currentRootPath, fullPath)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Path escapes root" });
        }
        try {
            await execAsync(`svn info "${fullPath}"`);
            await execAsync(`svn delete "${fullPath}"`);
        } catch {
            await CFile.Delete(fullPath);
        }
        return JSON.stringify({ ok: true });
    }

    async onUpload(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        if (!this.IsAuth(_req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }

        let path    = _json.GetStr("path");
        let nameArr = _json.GetArray("name");
        let dataArr = _json.GetArray("data");
        const fix   = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");

        const filePaths = nameArr.mArray.map((n: string) => fix(path + n));
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

    async onVCS(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        if (!this.IsAuth(_req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        const action  = _json.GetStr("action");
        const rawPath = _json.GetStr("path") || "./";
        const fixPath = (p: string) => p.replace(/\\/g, "/").replace(/\/+/g, "/");
        const path    = fixPath(rawPath);
        const files   = (_json.GetArray("files").mArray as string[]);
        const message = _json.GetStr("message") || "";
        const quote   = (p: string) => `"${p.replace(/"/g, '\\"')}"`;

        const isDir  = path.endsWith("/");
        const dirPath = isDir ? path : fixPath(nodePath.dirname(path));
        if (!await isInsideAnyRoot(dirPath)) {
            return JSON.stringify({ ok: false, msg: "Path escapes allowed roots" });
        }
        const vcs = await detectVcsType(dirPath);
        if (!vcs) return JSON.stringify({ ok: false, msg: "SVN/Git not found. Check installation." });

        try {
            if (action === "diff") {
                let cmd: string;
                if (vcs === 'svn') {
                    cmd = `svn diff ${quote(path)}`;
                } else if (isDir) {
                    cmd = `git -C ${quote(path)} diff`;
                } else {
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
                } else {
                    const { stdout, stderr } = await execAsync(
                        `git -C ${quote(dirPath)} pull && git -C ${quote(dirPath)} submodule update --remote --recursive`
                    );
                    let revision: string | null = null;
                    try {
                        const { stdout: logOut } = await execAsync(`git -C ${quote(dirPath)} log -1 --format="%h %s"`);
                        revision = logOut.trim() || null;
                    } catch {}
                    return JSON.stringify({ ok: true, vcs, msg: (stdout + stderr).trim(), revision });
                }
            } else if (action === "add") {
                if (vcs !== 'svn') return JSON.stringify({ ok: false, msg: "Add is SVN-only. Use commit for Git (git add is implicit)." });
                cmd = `svn add ${files.map(quote).join(" ")}`;
            } else if (action === "revert") {
                if (vcs === 'svn') {
                    cmd = `svn revert ${files.map(quote).join(" ")}`;
                } else {
                    const CHUNK = 50;
                    let revertOut = '';
                    for (let i = 0; i < files.length; i += CHUNK) {
                        const chunk = files.slice(i, i + CHUNK);
                        const { stdout: s, stderr: e } = await execAsync(`git -C ${quote(path)} restore ${chunk.map(quote).join(" ")}`);
                        revertOut += s + e;
                    }
                    return JSON.stringify({ ok: true, vcs, msg: revertOut.trim() });
                }
            } else if (action === "commit") {
                if (vcs === 'svn') {
                    cmd = `svn commit -m ${quote(message)} ${files.map(quote).join(" ")}`;
                } else {
                    const CHUNK = 50;
                    let addOut = '';
                    for (let i = 0; i < files.length; i += CHUNK) {
                        const chunk = files.slice(i, i + CHUNK);
                        const { stdout: s, stderr: e } = await execAsync(`git -C ${quote(path)} add ${chunk.map(quote).join(" ")}`);
                        addOut += s + e;
                    }
                    const { stdout: commitOut, stderr: commitErr } = await execAsync(`git -C ${quote(path)} commit -m ${quote(message)}`);
                    let pushOut = '';
                    let pushFailed = false;
                    try {
                        const { stdout: ps, stderr: pe } = await execAsync(`git -C ${quote(path)} push`);
                        pushOut = ps + pe;
                    } catch (pushErr: any) {
                        pushOut = pushErr.stderr || pushErr.message || String(pushErr);
                        pushFailed = true;
                    }
                    return JSON.stringify({ ok: !pushFailed, vcs, msg: (addOut + commitOut + commitErr + pushOut).trim() });
                }
            } else {
                return JSON.stringify({ ok: false, msg: "Unknown action" });
            }

            const { stdout, stderr } = await execAsync(cmd);
            return JSON.stringify({ ok: true, vcs, msg: (stdout + stderr).trim() });
        } catch (e: any) {
            return JSON.stringify({ ok: false, msg: e.stderr || e.message || String(e) });
        }
    }

    async onCmd(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        if (!this.IsAuth(_req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        const cmd = _json.GetStr("cmd");
        const cwd = _json.GetStr("path") || undefined;
        const fullCmd = process.platform === 'win32' ? `chcp 65001>nul && ${cmd}` : cmd;
        try {
            const { stdout, stderr } = await execAsync(fullCmd, cwd ? { cwd } : undefined);
            return JSON.stringify({ ok: true, stdout, stderr });
        } catch (e: any) {
            return JSON.stringify({ ok: false, msg: e.message || String(e), stdout: e.stdout, stderr: e.stderr });
        }
    }

    // 인증 성공 시 클라이언트가 호출한다(인증 체크 없음). 넘어온 주소/토큰으로 ai/FileServerGuide.md를 갱신한다.
    async onRemote(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        const addr  = _json.GetStr("addr");
        const token = _json.GetStr("token");
        if (!addr) {
            return JSON.stringify({ ok: false, msg: "Missing addr" });
        }
        const guidePath = nodePath.resolve(process.cwd(), "ai/FileServerGuide.md");
        try {
            const fs = await import('fs/promises');
            let md = await fs.readFile(guidePath, 'utf8');
            // `## 주소` / `## 토큰` 헤딩 바로 다음의 `- ...` 라인을 넘어온 값으로 치환한다.
            md = md.replace(/(##\s*주소[^\n]*\r?\n-\s*)[^\r\n]*/, `$1${addr}`);
            md = md.replace(/(##\s*토큰[^\n]*\r?\n-\s*)[^\r\n]*/, `$1${token}`);
            await fs.writeFile(guidePath, md, 'utf8');
            return JSON.stringify({ ok: true });
        } catch (e: any) {
            return JSON.stringify({ ok: false, msg: e.message || String(e) });
        }
    }
}

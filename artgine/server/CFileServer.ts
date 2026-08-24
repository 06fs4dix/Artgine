import { CJSON } from "../basic/CJSON.js";
import { CUtil } from "../basic/CUtil.js";
import { URLPatterns } from "../network/CServerMain.js";
import { CFile } from "../system/CFile.js";
import { Request, Response } from 'express';
import { CAuthServer, isAuthedReq, isValidToken } from './CAuthServer.js';
import { GetAppJSON, GetRootPaths, GetLoadedSettingsFileName } from '../../desktop/MainFunc.js';
import { CUtilSystem } from '../system/CUtilSystem.js';
import { CStorage } from '../system/CStorage.js';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import * as nodePath from 'path';
import * as fs from 'fs/promises';

const _exec = promisify(exec);
const execAsync = (cmd: string, opts?: { cwd?: string }) => _exec(cmd, { maxBuffer: 64 * 1024 * 1024, ...opts });
const _execFile = promisify(execFile);
const execFileAsync = (cmd: string, args: string[], opts?: { cwd?: string }) => _execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024, ...opts });

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

// 뮤직 플레이리스트 URL(root.url + 상대경로)을 디스크 절대경로로 되돌린다. onMusicAI의 역변환.
async function urlToAbsPath(url: string): Promise<string | null> {
    let pathPart = String(url || '').trim();
    if (!pathPart) return null;
    try {
        pathPart = new URL(pathPart, 'http://dummy.local').pathname;
    } catch {}
    const roots = await getRoots();
    const sorted = [...roots].sort((a, b) => b.url.length - a.url.length);
    for (const root of sorted) {
        const rootUrl = root.url.replace(/\/+$/, '');
        if (pathPart !== rootUrl && !pathPart.startsWith(rootUrl + '/')) continue;
        const rel = decodeURIComponent(pathPart.slice(rootUrl.length));
        return resolveAbs(root.path.replace(/\/+$/, '') + rel);
    }
    return null;
}

async function isInsideAnyRoot(targetPath: string): Promise<boolean> {
    const roots = await getRoots();
    return roots.some(r => isInsideRoot(r.path, targetPath));
}

// RootUrl은 RootPath에 대응하는 파생값(roots 배열 인덱스로 결정)이라 클라이언트가 보낸 값을
// 신뢰하지 않고 여기서 직접 계산한다.
async function getRoots(): Promise<{ path: string, url: string, name: string }[]> {
    const _cfg = await GetAppJSON();
    const serverPath = new URL(_cfg.url).pathname.replace(/\/+$/, '') || '/Artgine';
    const roots = GetRootPaths(_cfg).map((p, i) => ({ path: resolveAbs(p), url: serverPath + '/Root' + i, name: p }));
    // Artgine 작업경로(process.cwd())는 rootPath 등록 여부와 무관하게 CServerMain이 항상
    // express.static으로 서빙 중이라, 클라이언트가 './' 같은 상대경로로 추측할 필요 없이
    // 여기서 항상 절대경로 형태로 목록 끝에 실어 보낸다. 이미 같은 폴더가 등록돼 있으면 중복 추가 안 함.
    const workPath = resolveAbs('./');
    if (!roots.some(r => r.path === workPath)) {
        roots.push({ path: workPath, url: serverPath, name: './' });
    }
    return roots;
}

async function validateRoot(rootParam: string | undefined): Promise<{ path: string, url: string } | null> {
    const roots = await getRoots();
    if (!rootParam) return roots[0] ?? null;
    const match = roots.find(r => resolveAbs(r.path) === resolveAbs(rootParam));
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

@URLPatterns(["/File/Root", "/File/List", "/File/Redirection", "/File/Upload", "/File/Mkdir", "/File/Delete", "/File/Rename", "/File/VCS", "/File/Restart", "/File/MusicAI", "/File/MusicLyricsEn"])
export class CFileServer extends CAuthServer
{
    // 토큰이 같이 오면 토큰 기준으로, 없으면 기존 세션 쿠키 기준으로 인증한다.
    // cross-origin(다른 origin 서버를 다루는) 요청은 쿠키가 기본적으로 전달되지 않으므로 토큰이 필요하다.
    private IsAuth(_json: CJSON, req: Request): boolean {
        const token = _json.GetStr('token');
        return token ? isValidToken(token) : isAuthedReq(req);
    }

    constructor()
    {
        super();

        this.On("/File/Root", this.onRoot.bind(this));
        this.On("/File/Redirection", this.onRedirection.bind(this));
        this.On("/File/List", this.onList.bind(this));
        this.On("/File/Mkdir", this.onMkdir.bind(this));
        this.On("/File/Delete", this.onDelete.bind(this));
        this.On("/File/Rename", this.onRename.bind(this));
        this.On("/File/Upload", this.onUpload.bind(this));
        this.On("/File/VCS", this.onVCS.bind(this));
        this.On("/File/Restart", this.onRestart.bind(this));
        this.On("/File/MusicAI", this.onMusicAI.bind(this));
        this.On("/File/MusicLyricsEn", this.onMusicLyricsEn.bind(this));
    }

    async onRestart(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        if (!this.IsAuth(_json, _req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        // newWindow=true: 현재 프로세스 트리와 분리된 독립 프로세스로 재실행한다(같은 트리에
        // 묶이면, 뒤이어 이 프로세스를 taskkill /T로 죽일 때 재시작 체인 자신도 같이 죽는다).
        await CUtilSystem.Spawn('npm', ['run', 'start', '--', GetLoadedSettingsFileName()], 'ignore', process.cwd(), null, true, false);
        return JSON.stringify({ ok: true });
    }

    async onRoot(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        const roots = await getRoots();
        const root = await validateRoot(_json.GetStr("RootPath")) ?? roots[0];
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
        let extraQ = "";
        if (rootParam) {
            const root = await validateRoot(rootParam);
            if (root) extraQ += `&RootPath=${encodeURIComponent(rootParam)}&RootUrl=${encodeURIComponent(root.url)}`;
        }

        const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");

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

    async onList(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        // Env.json(CStorage) fileListPublic: true면 기존처럼 미인증 목록 허용(미디어 필터).
        // 없거나 false(기본)면 인증 필수.
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

        const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
        const targetPath = fix(currentRootPath + path);
        if (!isInsideRoot(currentRootPath, targetPath)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Path escapes root" });
        }

        let list = await CFile.FolderList(targetPath);

        if (!authed) {
            const mediaExts = ["png","jpg","jpeg","bmp","mp3","ogg","mp4","mov","avi"];
            list = list.filter((item: { file: boolean; name: string; ext: string }) => !item.file || mediaExts.includes(item.ext));
        }

        list = list.filter((item: { file: boolean; name: string; ext: string }) => !item.name.toLowerCase().includes("secret"));
        list = list.filter((item: { file: boolean; name: string; ext: string }) => !(!item.file && (item.name === ".git" || item.name === ".svn")));

        // skipVcs=true: 검색 인덱싱처럼 폴더를 대량으로(BFS) 훑을 때 매 폴더마다 git/svn 프로세스를
        // 스폰하는 getVcsStatus 비용을 생략한다. 일반 파일 탐색기 조회는 그대로 VCS 배지를 받는다.
        const skipVcs = _json.GetStr("skipVcs") === "true";
        if (!skipVcs) {
            const vcsMap = await getVcsStatus(targetPath);
            if (vcsMap.size > 0) list = applyVcsStatus(list, vcsMap);
        }

        list = list.slice().sort((a, b) => {
            if (a.file !== b.file) return a.file ? 1 : -1;
            return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        });

        return JSON.stringify({ RootPath: fix(currentRootPath), list, path, RootUrl: currentDown });
    }

    async onMkdir(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        if (!this.IsAuth(_json, _req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
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

    async onDelete(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        if (!this.IsAuth(_json, _req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
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
        } catch {
            await CFile.Delete(fullPath);
        }
        return JSON.stringify({ ok: true });
    }

    /** data: 루트 기준 상대 경로(기존 이름 포함), name: 새 파일/폴더명(경로 구분자 불가).
     *  비즈니스 오류는 HTTP 200 + {ok:false,msg} (CFecth가 non-2xx 시 body를 버림). 인증 실패만 403. */
    async onRename(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        if (!this.IsAuth(_json, _req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
        const currentRoot = await validateRoot(_json.GetStr("RootPath"));
        if (currentRoot === null) {
            return JSON.stringify({ ok: false, msg: "Invalid RootPath" });
        }
        const currentRootPath = currentRoot.path;
        const data = (_json.GetStr("data") || "").replace(/\\/g, "/");
        const newName = (_json.GetStr("name") || "").trim();
        if (!data || !newName) {
            return JSON.stringify({ ok: false, msg: "Missing data or name" });
        }
        if (newName.includes("/") || newName.includes("\\") || newName === "." || newName === "..") {
            return JSON.stringify({ ok: false, msg: "Invalid name" });
        }
        const oldPath = fix(currentRootPath + data);
        if (!isInsideRoot(currentRootPath, oldPath)) {
            return JSON.stringify({ ok: false, msg: "Path escapes root" });
        }
        const parentSlash = oldPath.lastIndexOf("/");
        const parentDir = parentSlash >= 0 ? oldPath.slice(0, parentSlash + 1) : "";
        const newPath = fix(parentDir + newName);
        if (!isInsideRoot(currentRootPath, newPath)) {
            return JSON.stringify({ ok: false, msg: "Path escapes root" });
        }
        if (resolveAbs(oldPath) === resolveAbs(newPath)) {
            return JSON.stringify({ ok: true });
        }
        const fs = await import("fs/promises");
        try {
            await fs.access(oldPath);
        } catch {
            return JSON.stringify({ ok: false, msg: "Source not found" });
        }
        try {
            await fs.access(newPath);
            return JSON.stringify({ ok: false, msg: "Target already exists" });
        } catch {
            // destination must not exist
        }
        try {
            await execAsync(`svn info "${oldPath}"`);
            await execAsync(`svn move "${oldPath}" "${newPath}"`);
            return JSON.stringify({ ok: true });
        } catch {
            // not SVN or svn move failed → plain rename
        }
        const ok = await CFile.Rename(oldPath, newPath);
        if (!ok) {
            return JSON.stringify({ ok: false, msg: "Rename failed" });
        }
        return JSON.stringify({ ok: true });
    }

    async onUpload(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        if (!this.IsAuth(_json, _req)) {
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
        if (!this.IsAuth(_json, _req)) {
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
                        try {
                            const { stdout: s, stderr: e } = await execAsync(`git -C ${quote(path)} add ${chunk.map(quote).join(" ")}`);
                            addOut += s + e;
                        } catch (addErr: any) {
                            // Already-staged deletions with no further change make `git add` fail
                            // with "pathspec did not match any files" even though there's nothing to do.
                            addOut += addErr.stderr || addErr.message || String(addErr);
                        }
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

    // 뮤직 모달의 AI 검색 버튼 전용. 검색어 배열을 ai/tool/music.js exe에 넘겨(질의는 하나로 합쳐서
    // 1회 호출) SELECT 결과(absolute_path 포함)를 받고, 그 절대경로를 다운로드 URL로 변환해 돌려준다.
    // DB(db/music.sqlite)는 라이브러리 전체(예: E:/music/...)를 스캔해 만들어지므로, 트랙이 현재
    // 브라우징 중인 RootPath 하나에만 있다고 가정할 수 없다 - 등록된 모든 root를 대상으로 매칭한다.
    async onMusicAI(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        if (!this.IsAuth(_json, _req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        const queries = (_json.GetArray("queries").mArray as string[])
            .map(q => String(q).trim()).filter(q => q);
        if (queries.length === 0) {
            return JSON.stringify({ ok: false, msg: "No queries" });
        }

        const dbPath = nodePath.resolve('./db/music.sqlite');
        try {
            await fs.access(dbPath);
        } catch {
            return JSON.stringify({ ok: false, msg: `DB not found: ${dbPath} (먼저 "node ai/tool/music.js scan <폴더> ${dbPath}"로 스캔하세요)` });
        }

        const question = queries.join(', ');
        let rows: { absolute_path?: string }[];
        let reason = '';
        try {
            const { stdout } = await execFileAsync('node', ['ai/tool/music.js', 'exe', dbPath, question, 'claude', 'claude-sonnet-4-6'], { cwd: process.cwd() });
            // CAI 쪽에서 설치/락 상태 안내 로그(이것도 '{'로 시작할 수 있음, 예: "[CAI] ...")를 stdout에
            // 같이 찍는 경우가 있어, 결과 JSON 한 줄(exe 모드의 마지막 console.log)만 따로 골라 파싱한다.
            const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            const jsonLine = lines[lines.length - 1];
            if (!jsonLine || !jsonLine.startsWith('{')) throw new Error('music.js exe가 JSON 객체를 출력하지 않음: ' + stdout.trim());
            const parsed = JSON.parse(jsonLine);
            rows = parsed.rows;
            reason = parsed.reason || '';
        } catch (e: any) {
            return JSON.stringify({ ok: false, msg: e.stderr || e.message || String(e) });
        }

        const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
        const encodeUrlPath = (p: string) => p.split('/').map(encodeURIComponent).join('/');
        const roots = await getRoots();

        const urls: string[] = [];
        const seen = new Set<string>();
        for (const row of rows) {
            const abs = row.absolute_path;
            if (!abs || seen.has(abs)) continue;
            seen.add(abs);
            const normAbs = fix(resolveAbs(abs));
            const root = roots.find(r => isInsideRoot(r.path, normAbs));
            if (!root) continue;
            const rootAbs = resolveAbs(root.path).replace(/\/+$/, '');
            urls.push(root.url + encodeUrlPath(normAbs.slice(rootAbs.length)));
        }

        return JSON.stringify({ ok: true, urls, reason, matched: urls.length, total: rows.length });
    }

    // 뮤직 모달 Lyrics 버튼. music.js lyrics-en은 원문만 찾고, 영어 번역은 이 프로세스(CAI 이미 로드됨)에서 한다.
    // lyrics-en 자식에서 CAI를 import하면 CWASM TDZ("Cannot access 'CWASM' before initialization")가 난다.
    async onMusicLyricsEn(_json: CJSON, _req: Request, _res: Response): Promise<string> {
        if (!this.IsAuth(_json, _req)) {
            _res.status(403);
            return JSON.stringify({ ok: false, msg: "Unauthorized" });
        }
        const url = String(_json.GetStr("url") ?? '').trim();
        if (!url) {
            return JSON.stringify({ ok: false, msg: "No url" });
        }

        const dbPath = nodePath.resolve('./db/music.sqlite');
        try {
            await fs.access(dbPath);
        } catch {
            return JSON.stringify({ ok: false, msg: `DB not found: ${dbPath} (먼저 "node ai/tool/music.js scan <폴더> ${dbPath}"로 스캔하세요)` });
        }

        const absPath = await urlToAbsPath(url);
        const trackArg = absPath || url;
        let parsed: { ok?: boolean, msg?: string, lyrics?: string, title?: string, artist?: string };
        try {
            const { stdout } = await execFileAsync('node', ['ai/tool/music.js', 'lyrics-en', dbPath, trackArg], { cwd: process.cwd() });
            const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            const jsonLine = lines[lines.length - 1];
            if (!jsonLine || !jsonLine.startsWith('{')) throw new Error('music.js lyrics-en가 JSON 객체를 출력하지 않음: ' + stdout.trim());
            parsed = JSON.parse(jsonLine);
        } catch (e: any) {
            return JSON.stringify({ ok: false, msg: e.stderr || e.message || String(e) });
        }
        if (!parsed.ok) return JSON.stringify({ ok: false, msg: parsed.msg || 'lyrics-en failed' });

        let lyrics = parsed.lyrics || '';
        if (lyrics && /[\u3040-\u30ff\u3400-\u9fff가-힣]/.test(lyrics)) {
            try {
                const { CAI } = await import("../util/CAI.js");
                const os = await import("os");
                const prompt = [
                    'Translate the following song lyrics into natural English.',
                    'Preserve line breaks and stanza structure.',
                    'Output ONLY the English lyrics. No title, artist, commentary, or markdown.',
                    '',
                    `Title: ${parsed.title || ''}`,
                    `Artist: ${parsed.artist || ''}`,
                    '',
                    'Lyrics:',
                    lyrics,
                ].join('\n');
                const result = await CAI.Chat(CAI.eProvider.claude, 'claude-sonnet-4-6', os.tmpdir(), prompt, true, undefined, true, false);
                let en = String(result.text || '').trim();
                const fence = en.match(/```(?:\w+)?\s*([\s\S]*?)```/);
                if (fence) en = fence[1].trim();
                if (en) lyrics = en;
            } catch (e: any) {
                return JSON.stringify({ ok: false, msg: e.message || String(e) });
            }
        }

        return JSON.stringify({ ok: true, lyrics, title: parsed.title || '', artist: parsed.artist || '' });
    }

}

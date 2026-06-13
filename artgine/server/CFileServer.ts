import { CConsol } from "../basic/CConsol.js";
import { CJSON } from "../basic/CJSON.js";
import { CPath } from "../basic/CPath.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";
import { URLPatterns } from "../network/CServerMain.js";
import { CFile } from "../system/CFile.js";
import { Request, Response, NextFunction } from 'express';
import { CAuthServer, isValidToken, getToken } from './CAuthServer.js';
import { GetAppJSON, GetRootPaths } from '../../desktop/MainFunc.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as nodePath from 'path';
const execAsync = promisify(exec);

type VcsStatus = "M" | "A" | "D" | "?";
type VcsType = "svn" | "git";

async function detectVcsType(dirPath: string): Promise<VcsType | null> {
    try { await execAsync(`svn info "${dirPath}"`); return "svn"; } catch {}
    // git -C requires a directory; if dirPath is a file, fall back to its parent
    const tryGit = async (d: string) => { try { await execAsync(`git -C "${d}" rev-parse --git-dir`); return true; } catch {} return false; };
    if (await tryGit(dirPath)) return "git";
    const parent = nodePath.dirname(nodePath.resolve(dirPath));
    if (parent !== nodePath.resolve(dirPath) && await tryGit(parent)) return "git";
    return null;
}

// SVN status 라인 → {status, file} 파싱
function parseSvnStatus(stdout: string): {status: VcsStatus, file: string}[] {
    return stdout.split('\n')
        .filter(l => l.length >= 9)
        .map(l => ({ status: l[0] as VcsStatus, file: l.slice(8).trim() }))
        .filter(i => i.file && (i.status === 'M' || i.status === 'A' || i.status === 'D' || i.status === '?'));
}

// Git --short 라인 → {status, file} 파싱
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

// 반환: dirPath 기준 첫 번째 세그먼트(파일명 또는 폴더명) → 상태코드 Map
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
            const { stdout } = await execAsync(`git -C "${dirPath}" status --short`);
            for (const { status, file } of parseGitStatus(stdout, dirPath)) addEntry(file, status);
        } catch {}
    }
    return map;
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
@URLPatterns(["/File/List", "/File/Redirection", "/File/Upload", "/File/Mkdir", "/File/Delete", "/File/VCS"])
export class CFileServer extends CAuthServer
{
    private IsAuth(req: Request): boolean {
        return isValidToken(getToken(req));
    }

    constructor()
    {
        super();

        this.On("/File/Redirection", async (_json: CJSON, _req: Request, _res: Response) => {
            // form POST + query string 혼합 시 Object.assign이 mDocument를 덮어쓰므로 req.body에서 직접 읽음
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
            const currentRootPath = rootParam || GetRootPaths(await GetAppJSON())[0];

            if (fun?.includes("CreateFolder") || fun?.includes("Delete") || fun?.includes("SoundPlayList")) {
                if (!this.IsAuth(_req)) {
                    _res.status(403);
                    return JSON.stringify({ ok: false, msg: "Unauthorized" });
                }
            }

            if (fun?.includes("CreateFolder")) {
                await CFile.FolderCreate(fix(currentRootPath + data));
            }
            else if (fun?.includes("Delete")) {
                await CFile.Delete(fix(currentRootPath + data));
            }
            else if (fun?.includes("SoundPlayList")) {
                CFile.Save(data, fix(currentRootPath + path + option + ".soundlist"));
            }

			_res.redirect(302, "../proj/Home/Home.html" + `?path=${path}${extraQ}`);
            return null;
        });

        this.On("/File/List", async (_json: CJSON, _req: Request, _res: Response) => {
            let path  = _json.GetStr("path") || "/";
			const _cfg = await GetAppJSON();
    		const serverPath = new URL(_cfg.url).pathname.replace(/\/+$/, '') || '/Artgine';
			const roots = GetRootPaths(_cfg).map((p, i) => ({ path: p, url: serverPath + '/Root' + i, name: p }));
			let currentRootPath = _json.GetStr("RootPath") || roots[0].path;
    		let currentDown = _json.GetStr("RootUrl") || roots[0].url;

			const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
			const targetPath = fix(currentRootPath + path);

			let list = await CFile.FolderList(targetPath);

			if (!this.IsAuth(_req)) {
				const mediaExts = ["png","jpg","jpeg","bmp","mp3","ogg","mp4","mov","avi"];
				list = list.filter((item: { file: boolean; name: string; ext: string }) => !item.file || mediaExts.includes(item.ext));
			}

			list = list.filter((item: { file: boolean; name: string; ext: string }) => !item.name.toLowerCase().includes("secret"));

			const vcsMap = await getVcsStatus(targetPath);
			if (vcsMap.size > 0) list = applyVcsStatus(list, vcsMap);

			// RootPath를 forward slash로 정규화해서 반환 (클라이언트 onclick에서 백슬래시 소실 방지)
			return JSON.stringify({ RootPath: fix(currentRootPath), list, path, RootUrl: currentDown, roots });

            // const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
            // const targetPath = fix(gRootPath + path);

            // let list = await CFile.FolderList(targetPath);
            // if (admin !== "admin") list = [];

            // list = list.filter((item: { file: boolean; name: string; ext: string }) => !item.name.toLowerCase().includes("secret"));

            // return JSON.stringify({ root: gRootPath, list, path, down: gDown });
        });

        this.On("/File/Mkdir", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!this.IsAuth(_req)) {
                _res.status(403);
                return JSON.stringify({ ok: false, msg: "Unauthorized" });
            }
            const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
            const rootParam = _json.GetStr("RootPath");
            const currentRootPath = rootParam || GetRootPaths(await GetAppJSON())[0];
            const data = _json.GetStr("data");
            const ok = await CFile.FolderCreate(fix(currentRootPath + data));
            return JSON.stringify({ ok });
        });

        this.On("/File/Delete", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!this.IsAuth(_req)) {
                _res.status(403);
                return JSON.stringify({ ok: false, msg: "Unauthorized" });
            }
            const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
            const rootParam = _json.GetStr("RootPath");
            const currentRootPath = rootParam || GetRootPaths(await GetAppJSON())[0];
            const data = _json.GetStr("data");
            const fullPath = fix(currentRootPath + data);
            try {
                await execAsync(`svn info "${fullPath}"`);
                // SVN 관리 경로: svn delete로 처리 (파일 제거 + 삭제 스케줄 등록)
                await execAsync(`svn delete "${fullPath}"`);
            } catch {
                // SVN 미설치 또는 미등록 경로: 일반 삭제
                await CFile.Delete(fullPath);
            }
            return JSON.stringify({ ok: true });
        });

        this.On("/File/Upload", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!this.IsAuth(_req)) {
                _res.status(403);
                return JSON.stringify({ ok: false, msg: "Unauthorized" });
            }

            let path    = _json.GetStr("path");
            let nameArr = _json.GetArray("name");
            let dataArr = _json.GetArray("data");
            const fix   = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");

            for (let i = 0; i < nameArr.mArray.length; ++i) {
                const filePath = fix(path + nameArr.mArray[i]);
                const fileData = CUtil.Base64ToArray(dataArr.mArray[i]);
                CFile.Save(fileData, filePath);
                CFile.PushCache(filePath, fileData);
            }
            return JSON.stringify({ ok: true });
        });

        this.On("/File/VCS", async (_json: CJSON, _req: Request, _res: Response) => {
            if (!this.IsAuth(_req)) {
                _res.status(403);
                return JSON.stringify({ ok: false, msg: "Unauthorized" });
            }
            const action  = _json.GetStr("action");   // status | update | revert | commit
            const rawPath = _json.GetStr("path") || "./";
            const fixPath = (p: string) => p.replace(/\\/g, "/").replace(/\/+/g, "/");
            const path    = fixPath(rawPath);
            const files   = (_json.GetArray("files").mArray as string[]);
            const message = _json.GetStr("message") || "";
            const quote   = (p: string) => `"${p.replace(/"/g, '\\"')}"`;

            // VCS detection needs a directory path (git -C requires a dir)
            const isDir  = path.endsWith("/");
            const dirPath = isDir ? path : fixPath(nodePath.dirname(path));
            const vcs = await detectVcsType(dirPath);
            if (!vcs) return JSON.stringify({ ok: false, msg: "SVN/Git을 찾을 수 없습니다. 설치 여부를 확인하세요." });

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
                    const items = vcs === 'svn'
                        ? parseSvnStatus(stdout)
                        : parseGitStatus(stdout, path);
                    return JSON.stringify({ ok: true, vcs, items });
                }

                let cmd = "";
                if (action === "update") {
                    cmd = vcs === 'svn'
                        ? `svn update ${quote(path)}`
                        : `git -C ${quote(path)} pull && git -C ${quote(path)} submodule update --init --recursive`;
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
                        // git add in chunks to avoid ENAMETOOLONG on large file lists
                        const CHUNK = 50;
                        let addOut = '';
                        for (let i = 0; i < files.length; i += CHUNK) {
                            const chunk = files.slice(i, i + CHUNK);
                            const { stdout: s, stderr: e } = await execAsync(`git -C ${quote(path)} add ${chunk.map(quote).join(" ")}`);
                            addOut += s + e;
                        }
                        const { stdout: commitOut, stderr: commitErr } = await execAsync(`git -C ${quote(path)} commit -m ${quote(message)}`);
                        let pushOut = '';
                        try {
                            const { stdout: ps, stderr: pe } = await execAsync(`git -C ${quote(path)} push`);
                            pushOut = ps + pe;
                        } catch (pushErr: any) {
                            pushOut = pushErr.stderr || pushErr.message || String(pushErr);
                        }
                        return JSON.stringify({ ok: true, vcs, msg: (addOut + commitOut + commitErr + pushOut).trim() });
                    }
                } else {
                    return JSON.stringify({ ok: false, msg: "Unknown action" });
                }
                const { stdout, stderr } = await execAsync(cmd);
                return JSON.stringify({ ok: true, vcs, msg: (stdout + stderr).trim() });
            } catch (e: any) {
                return JSON.stringify({ ok: false, msg: e.stderr || e.message || String(e) });
            }
        });
    }
}
import { CConsol } from "../basic/CConsol.js";
import { CJSON } from "../basic/CJSON.js";
import { CPath } from "../basic/CPath.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";
import { URLPatterns } from "../network/CServerMain.js";
import { CFile } from "../system/CFile.js";
import { Request, Response, NextFunction } from 'express';
import { CAuthServer, isValidToken, getToken } from './CAuthServer.js';
import { GetAppJSON } from '../../desktop/MainFunc.js';
@URLPatterns(["/File/List", "/File/Redirection", "/File/Upload", "/File/Mkdir", "/File/Delete"])
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
            const currentRootPath = rootParam || ((await GetAppJSON()).rootPath ?? "./");

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
			let currentRootPath = _json.GetStr("RootPath") || (_cfg.rootPath ?? "./");
    		const serverPath = new URL(_cfg.url).pathname.replace(/\/+$/, '') || '/Artgine';
    		let currentDown = _json.GetStr("RootUrl") || (serverPath + '/Root');

			const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
			const targetPath = fix(currentRootPath + path);

			let list = await CFile.FolderList(targetPath);

			if (!this.IsAuth(_req)) {
				const mediaExts = ["png","jpg","jpeg","bmp","mp3","ogg","mp4","mov","avi"];
				list = list.filter((item: { file: boolean; name: string; ext: string }) => !item.file || mediaExts.includes(item.ext));
			}

			list = list.filter((item: { file: boolean; name: string; ext: string }) => !item.name.toLowerCase().includes("secret"));

			// [MODIFIED] 응답 객체에도 동적으로 결정된 값 전달
			return JSON.stringify({ RootPath: currentRootPath, list, path, RootUrl: currentDown });

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
            const currentRootPath = rootParam || ((await GetAppJSON()).rootPath ?? "./");
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
            const currentRootPath = rootParam || ((await GetAppJSON()).rootPath ?? "./");
            const data = _json.GetStr("data");
            await CFile.Delete(fix(currentRootPath + data));
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
    }
}
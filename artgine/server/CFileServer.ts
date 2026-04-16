import { CConsol } from "../basic/CConsol.js";
import { CJSON } from "../basic/CJSON.js";
import { CPath } from "../basic/CPath.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";
import { URLPatterns } from "../network/CServerMain.js";
import { CServerRouter } from "../network/CServerRouter.js";
import { CFile } from "../system/CFile.js";
import { Request, Response, NextFunction } from 'express';

const gRootPath = "./";
const gDown = "/Artgine";
const gPassword = CUniqueID.GetHash(); // ← 변경 필요
CConsol.Log("CFileServer PW: "+gPassword);
//const gRootPath = "E:/"; // 필요 시 절대 경로로 설정
//const gDown = "http://singleton88.iptime.org:8020"; // 복사 대상 기준 경로
@URLPatterns(["/File/Auth", "/File/List", "/File/Redirection", "/File/Upload"])
export class CFileServer extends CServerRouter
{
    private mAuthedSet = new Set<string>();

    private IsAuth(req: Request): boolean {
        return this.mAuthedSet.has(req.sessionID);
    }

    constructor()
    {
        super();

        this.On("/File/Auth", async (_json: CJSON, _req: Request, _res: Response) => {
            const pw = _json.GetStr("password");
            if (pw !== gPassword) {
                _res.status(403);
                return JSON.stringify({ ok: false, msg: "Invalid password" });
            }
            this.mAuthedSet.add(_req.sessionID);
            return JSON.stringify({ ok: true });
        });

        this.On("/File/Redirection", async (_json: CJSON, _req: Request, _res: Response) => {
            let path   = _json.GetStr("path") || "/";
            let fun    = _json.GetStr("fun");
            let data   = _json.GetStr("data");
            let option = _json.GetStr("option");
            let admin  = _json.GetStr("admin");

			let rootParam = _json.GetStr("gRootPath");
			let downParam = _json.GetStr("gDown");
			let extraQ = "";
			if(rootParam) extraQ += `&gRootPath=${encodeURIComponent(rootParam)}`;
			if(downParam) extraQ += `&gDown=${encodeURIComponent(downParam)}`;
			_res.redirect(302, "../proj/Home/Home.html" + `?path=${path}&admin=${admin}${extraQ}`);

            const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");

            if (fun?.includes("CreateFolder") || fun?.includes("Delete") || fun?.includes("SoundPlayList")) {
                if (!this.IsAuth(_req)) {
                    _res.status(403);
                    return JSON.stringify({ ok: false, msg: "Unauthorized" });
                }
            }

            if (fun?.includes("CreateFolder")) {
                await CFile.FolderCreate(fix(gRootPath + data));
            }
            else if (fun?.includes("Delete")) {
                await CFile.Delete(fix(gRootPath + data));
            }
            else if (fun?.includes("SoundPlayList")) {
                CFile.Save(data, fix(gRootPath + path + option + ".soundlist"));
            }

            return null;
        });

        this.On("/File/List", async (_json: CJSON, _req: Request, _res: Response) => {
            let path  = _json.GetStr("path") || "/";
            let admin = _json.GetStr("admin");
			let currentRootPath = _json.GetStr("gRootPath") || gRootPath;
    		let currentDown = _json.GetStr("gDown") || gDown;


			const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
			// [MODIFIED] gRootPath 대신 currentRootPath 적용
			const targetPath = fix(currentRootPath + path);

			let list = await CFile.FolderList(targetPath);
			if (admin !== "admin") list = [];

			list = list.filter((item: { file: boolean; name: string; ext: string }) => !item.name.toLowerCase().includes("secret"));

			// [MODIFIED] 응답 객체에도 동적으로 결정된 값 전달
			return JSON.stringify({ root: currentRootPath, list, path, down: currentDown });

            // const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
            // const targetPath = fix(gRootPath + path);

            // let list = await CFile.FolderList(targetPath);
            // if (admin !== "admin") list = [];

            // list = list.filter((item: { file: boolean; name: string; ext: string }) => !item.name.toLowerCase().includes("secret"));

            // return JSON.stringify({ root: gRootPath, list, path, down: gDown });
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
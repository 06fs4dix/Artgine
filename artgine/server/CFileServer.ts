import { CConsol } from "../basic/CConsol.js";
import { CJSON } from "../basic/CJSON.js";
import { CPath } from "../basic/CPath.js";
import { CUtil } from "../basic/CUtil.js";
import { URLPatterns } from "../network/CServerMain.js";
import { CServerRouter } from "../network/CServerRouter.js";
import { CFile } from "../system/CFile.js";
import  { Request, Response, NextFunction } from 'express';

const gRootPath = "./"; // 필요 시 절대 경로로 설정
const gDown = ""; // 복사 대상 기준 경로

@URLPatterns(["/File/List","/File/Redirection","/File/Upload"])
export class CFileServer extends CServerRouter
{
	
    //mFindPWMap=new Map<string,string>();
    constructor()
    {
        super();
		this.On("/File/Redirection",async (_json : CJSON, _req: Request, _res: Response)=>{
			let path = _json.GetStr("path") || "/";
			let fun = _json.GetStr("fun");
			let data = _json.GetStr("data");
			let option = _json.GetStr("option");
			let admin = _json.GetStr("admin");
			
			// ✅ 클라이언트가 접근 가능한 URL로 리다이렉트
			_res.redirect(302, "../proj/Home/Home.html"+`?path=${path}&admin=${admin}`);
			// const filePath = CPath.PHPC() + "proj/Home/Home.html";
			// let buf = await CFile.Load(filePath);
			// CFile.PushCache(filePath,buf);
			// return CUtil.ArrayToString(buf);


			// 경로 정규화 함수
			const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");

			const targetPath = fix(gRootPath + path);

			if (fun?.includes("CreateFolder")) {
				await CFile.FolderCreate(fix(gRootPath + data));
			}
			else if (fun?.includes("Delete")) {
				await CFile.Delete(fix(gRootPath + data));
			}
			else if (fun?.includes("SoundPlayList")) 
			{
				CFile.Save(data,fix(gRootPath + path + option + ".soundlist"));
				// const fs = await import("fs/promises");
				// await fs.writeFile(fix(rootPath + path + option + ".soundlist"), data, "utf-8");
			}

			return null;
		});

        this.On("/File/List",async (_json : CJSON, _req: Request, _res: Response)=>{
            let path = _json.GetStr("path") || "/";
			let admin = _json.GetStr("admin");
			
			// 경로 정규화 함수
			const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
			const targetPath = fix(gRootPath + path);


			
			let list = await CFile.FolderList(targetPath);
			if(admin!="admin")
				list=[];

			let sData={root:gRootPath,list:list,path:path,down:gDown};

            return JSON.stringify(sData);

        });
		this.On("/File/Upload",async (_json : CJSON, _req: Request, _res: Response)=>{
			//CConsol.Log("test");
			let path=_json.GetStr("path");
			let nameArr=_json.GetArray("name");
			let dataArr=_json.GetArray("data");
			const fix = (_str: string) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");

			for(let i=0;i<nameArr.mArray.length;++i)
			{
				CFile.Save(CUtil.Base64ToArray(dataArr.mArray[i]),fix(gRootPath + path+nameArr.mArray[i]));
				
			}
			return "";

		});
    }
}
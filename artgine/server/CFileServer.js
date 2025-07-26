var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { CUtil } from "../basic/CUtil.js";
import { URLPatterns } from "../network/CServerMain.js";
import { CServerRouter } from "../network/CServerRouter.js";
import { CFile } from "../system/CFile.js";
const gRootPath = "./";
const gDown = "";
let CFileServer = class CFileServer extends CServerRouter {
    constructor() {
        super();
        this.On("/File/Redirection", async (_json, _req, _res) => {
            let path = _json.GetStr("path") || "/";
            let fun = _json.GetStr("fun");
            let data = _json.GetStr("data");
            let option = _json.GetStr("option");
            let admin = _json.GetStr("admin");
            _res.redirect(302, "../proj/Home/Home.html" + `?path=${path}&admin=${admin}`);
            const fix = (_str) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
            const targetPath = fix(gRootPath + path);
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
        this.On("/File/List", async (_json, _req, _res) => {
            let path = _json.GetStr("path") || "/";
            let admin = _json.GetStr("admin");
            const fix = (_str) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
            const targetPath = fix(gRootPath + path);
            let list = await CFile.FolderList(targetPath);
            if (admin != "admin")
                list = [];
            let sData = { root: gRootPath, list: list, path: path, down: gDown };
            return JSON.stringify(sData);
        });
        this.On("/File/Upload", async (_json, _req, _res) => {
            let path = _json.GetStr("path");
            let nameArr = _json.GetArray("name");
            let dataArr = _json.GetArray("data");
            const fix = (_str) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
            for (let i = 0; i < nameArr.mArray.length; ++i) {
                CFile.Save(CUtil.Base64ToArray(dataArr.mArray[i]), fix(gRootPath + path + nameArr.mArray[i]));
            }
            return "";
        });
    }
};
CFileServer = __decorate([
    URLPatterns(["/File/List", "/File/Redirection", "/File/Upload"])
], CFileServer);
export { CFileServer };

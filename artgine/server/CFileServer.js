var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { CConsol } from "../basic/CConsol.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";
import { URLPatterns } from "../network/CServerMain.js";
import { CServerRouter } from "../network/CServerRouter.js";
import { CFile } from "../system/CFile.js";
const gRootPath = "./";
const gDown = "/Artgine";
const gPassword = CUniqueID.GetHash();
CConsol.Log("CFileServer PW: " + gPassword);
let CFileServer = class CFileServer extends CServerRouter {
    mAuthedSet = new Set();
    IsAuth(req) {
        return this.mAuthedSet.has(req.sessionID);
    }
    constructor() {
        super();
        this.On("/File/Auth", async (_json, _req, _res) => {
            const pw = _json.GetStr("password");
            if (pw !== gPassword) {
                _res.status(403);
                return JSON.stringify({ ok: false, msg: "Invalid password" });
            }
            this.mAuthedSet.add(_req.sessionID);
            return JSON.stringify({ ok: true });
        });
        this.On("/File/Redirection", async (_json, _req, _res) => {
            let path = _json.GetStr("path") || "/";
            let fun = _json.GetStr("fun");
            let data = _json.GetStr("data");
            let option = _json.GetStr("option");
            let admin = _json.GetStr("admin");
            let rootParam = _json.GetStr("gRootPath");
            let downParam = _json.GetStr("gDown");
            let extraQ = "";
            if (rootParam)
                extraQ += `&gRootPath=${encodeURIComponent(rootParam)}`;
            if (downParam)
                extraQ += `&gDown=${encodeURIComponent(downParam)}`;
            _res.redirect(302, "../proj/Home/Home.html" + `?path=${path}&admin=${admin}${extraQ}`);
            const fix = (_str) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
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
        this.On("/File/List", async (_json, _req, _res) => {
            let path = _json.GetStr("path") || "/";
            let admin = _json.GetStr("admin");
            let currentRootPath = _json.GetStr("gRootPath") || gRootPath;
            let currentDown = _json.GetStr("gDown") || gDown;
            const fix = (_str) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
            const targetPath = fix(currentRootPath + path);
            let list = await CFile.FolderList(targetPath);
            if (admin !== "admin")
                list = [];
            list = list.filter((item) => !item.name.toLowerCase().includes("secret"));
            return JSON.stringify({ root: currentRootPath, list, path, down: currentDown });
        });
        this.On("/File/Upload", async (_json, _req, _res) => {
            if (!this.IsAuth(_req)) {
                _res.status(403);
                return JSON.stringify({ ok: false, msg: "Unauthorized" });
            }
            let path = _json.GetStr("path");
            let nameArr = _json.GetArray("name");
            let dataArr = _json.GetArray("data");
            const fix = (_str) => _str.replace(/\\/g, "/").replace(/\/+/g, "/");
            for (let i = 0; i < nameArr.mArray.length; ++i) {
                const filePath = fix(path + nameArr.mArray[i]);
                const fileData = CUtil.Base64ToArray(dataArr.mArray[i]);
                CFile.Save(fileData, filePath);
                CFile.PushCache(filePath, fileData);
            }
            return JSON.stringify({ ok: true });
        });
    }
};
CFileServer = __decorate([
    URLPatterns(["/File/Auth", "/File/List", "/File/Redirection", "/File/Upload"])
], CFileServer);
export { CFileServer };

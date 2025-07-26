var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { CPool } from "../basic/CPool.js";
import { CORMCondition, CORMField, CORMOption } from "../network/CORM.js";
import { URLPatterns } from "../network/CServerMain.js";
import { CServerRouter } from "../network/CServerRouter.js";
import { CSQLite } from "../network/CSQLite.js";
CPool.On("CLocalDB", async () => {
    let CLocalDB = new CSQLite();
    await CLocalDB.Init();
    return CLocalDB;
}, "Product");
let sql = await CPool.Product("CLocalDB");
let con = new Array();
let option = new CORMOption();
option.mLimitOffset = 0;
option.mLimit = 1;
let data = await sql.Select("board", con, null, option);
if (data == null) {
    await sql.Send(`CREATE TABLE IF NOT EXISTS board (
		_offset INTEGER PRIMARY KEY AUTOINCREMENT,
		_category TEXT DEFAULT NULL,
		_publicKey TEXT DEFAULT NULL,
		_nick TEXT DEFAULT NULL,
		_subject TEXT DEFAULT NULL,
		_content TEXT,
		_datetime DATETIME DEFAULT CURRENT_TIMESTAMP
	)`);
}
let CBoardServer = class CBoardServer extends CServerRouter {
    constructor() {
        super();
        this.On("/CBoard/List", async (_json, _req, _res) => {
            var category = _json.GetStr("category");
            var limitOffset = _json.GetInt("limitOffset");
            var limitCount = _json.GetInt("limitCount");
            let sql = await CPool.Product("CLocalDB");
            let con = new Array();
            con.push(new CORMCondition("_category", "==", category));
            let option = new CORMOption();
            option.mLimitOffset = limitOffset;
            option.mLimit = limitCount;
            option.mOrderBy = "_offset";
            let data = await sql.Select("board", con, ["_offset", "_nick", "_subject", "_datetime"], option);
            let jsonStr = JSON.stringify(data);
            CPool.Recycle(sql);
            return jsonStr;
        });
        this.On("/CBoard/ListCount", async (_json, _req, _res) => {
            var category = _json.GetStr("category");
            let sql = await CPool.Product("CLocalDB");
            let con = new Array();
            con.push(new CORMCondition("_category", "==", category));
            let jsonStr = JSON.stringify(await sql.Select("board", con, ["COUNT(*)"], null));
            CPool.Recycle(sql);
            return jsonStr;
        });
        this.On("/CBoard/Delete", async (_json, _req, _res) => {
            var offset = _json.GetStr("offset");
            let sql = await CPool.Product("CLocalDB");
            let con = new Array();
            con.push(new CORMCondition("_offset", "==", offset));
            sql.Delete("board", con);
            CPool.Recycle(sql);
        });
        this.On("/CBoard/Read", async (_json, _req, _res) => {
            var offset = _json.GetInt("offset");
            let sql = await CPool.Product("CLocalDB");
            let con = new Array();
            con.push(new CORMCondition("_offset", "==", offset));
            let jsonStr = JSON.stringify(await sql.Select("board", con, ["_subject", "_content", "_publicKey", "_offset"], null));
            CPool.Recycle(sql);
            return jsonStr;
        });
        this.On("/CBoard/Write", async (_json, _req, _res) => {
            var category = _json.GetStr("category");
            var publicKey = _json.GetStr("publicKey");
            var subject = _json.GetStr("subject");
            var nick = _json.GetStr("nick");
            var content = _json.GetStr("content");
            var offset = _json.GetStr("offset");
            let data = new Array();
            data.push(new CORMField("_category", category));
            data.push(new CORMField("_publicKey", publicKey));
            data.push(new CORMField("_subject", subject));
            data.push(new CORMField("_nick", nick));
            data.push(new CORMField("_content", content));
            let sql = await CPool.Product("CLocalDB");
            if (offset == "-1") {
                await sql.Insert("board", data);
            }
            else {
                let con = new Array();
                con.push(new CORMCondition("_offset", "==", offset));
                await sql.Update("board", con, data);
            }
            CPool.Recycle(sql);
        });
        this.On("/CBoard/Modify", async (_json, _req, _res) => {
            var offset = _json.GetInt("offset");
            let sql = await CPool.Product("CLocalDB");
            let con = new Array();
            con.push(new CORMCondition("_offset", "==", offset));
            let jsonStr = JSON.stringify(await sql.Select("board", con, ["_subject", "_content", "_nick", "_offset"], null));
            CPool.Recycle(sql);
            return jsonStr;
        });
    }
};
CBoardServer = __decorate([
    URLPatterns(["/CBoard/List", "/CBoard/ListCount", "/CBoard/Delete", "/CBoard/Read", "/CBoard/Write", "/CBoard/Modify"])
], CBoardServer);
export { CBoardServer };

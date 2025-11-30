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
let data = await sql.Select("score", con, null, option);
if (data == null) {
    await sql.Send(`CREATE TABLE IF NOT EXISTS score (
		_project TEXT DEFAULT NULL,
		_nick TEXT DEFAULT NULL,
		_data DOUBLE DEFAULT NULL,
		_datetime DATETIME DEFAULT CURRENT_TIMESTAMP
	)`);
}
let CScoreServer = class CScoreServer extends CServerRouter {
    constructor() {
        super();
        this.On("/CScore/Read", async (_json, _req, _res) => {
            let project = _json.GetStr("project");
            let count = _json.GetStr("count");
            let order = _json.GetStr("order");
            let sql = await CPool.Product("CLocalDB");
            let con = new Array();
            con.push(new CORMCondition("_project", "==", project));
            let option = new CORMOption();
            option.mLimitOffset = 0;
            option.mLimit = Number(count);
            option.mOrderBy = "_data " + order;
            let data = await sql.Select("score", con, null, option);
            let jsonStr = JSON.stringify(data);
            CPool.Recycle(sql);
            return jsonStr;
        });
        this.On("/CScore/Write", async (_json, _req, _res) => {
            let project = _json.GetStr("project");
            let nick = _json.GetStr("nick");
            let data = _json.GetDouble("data");
            let sql = await CPool.Product("CLocalDB");
            let fa = new Array();
            fa.push(new CORMField("_project", project));
            fa.push(new CORMField("_nick", nick));
            fa.push(new CORMField("_data", data));
            await sql.Insert("score", fa);
            CPool.Recycle(sql);
        });
    }
};
CScoreServer = __decorate([
    URLPatterns(["/CScore/Read", "/CScore/Write"])
], CScoreServer);
export { CScoreServer };

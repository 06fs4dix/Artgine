import { CJSON } from "../basic/CJSON.js";
import { CPool } from "../basic/CPool.js";
import { CORMCondition, CORMField, CORMOption, CRDBMS } from "../network/CORM.js";
import { URLPatterns } from "../network/CServerMain.js";
import { CServerRouter } from "../network/CServerRouter.js";
import { CSQLite } from "../network/CSQLite.js";

CPool.On("CLocalDB",async ()=>{
	let CLocalDB=new CSQLite();
	await CLocalDB.Init();
	return CLocalDB;
},"Product");

let sql=await CPool.Product("CLocalDB")  as CRDBMS;
let con=new Array<CORMCondition>();
let option=new CORMOption();
option.mLimitOffset=0;
option.mLimit=1;

let data=await sql.Select("board", con, null, option);
if(data==null)
{
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

@URLPatterns(["/CBoard/List","/CBoard/ListCount","/CBoard/Delete","/CBoard/Read","/CBoard/Write","/CBoard/Modify"])
export class CBoardServer extends CServerRouter
{
    //mFindPWMap=new Map<string,string>();
    constructor()
    {
        super();
        this.On("/CBoard/List",async (_json : CJSON, _req: Request, _res: Response)=>{
            var category=_json.GetStr("category");
			var limitOffset=_json.GetInt("limitOffset");
			var limitCount=_json.GetInt("limitCount");
			
			
			let sql=await CPool.Product("CLocalDB")  as CRDBMS;
			let con=new Array<CORMCondition>();
			con.push(new CORMCondition("_category", "==", category));
			let option=new CORMOption();
			option.mLimitOffset=limitOffset;
			option.mLimit=limitCount;
			option.mOrderBy="_offset";
			
			let data=await sql.Select("board", con, ["_offset","_nick","_subject","_datetime"], option);
			let jsonStr=JSON.stringify(data);
			
            CPool.Recycle(sql);
			
			return jsonStr;
        });
        this.On("/CBoard/ListCount",async (_json : CJSON, _req: Request, _res: Response)=>{
            var category=_json.GetStr("category");
			let sql=await CPool.Product("CLocalDB")  as CRDBMS;
			let con=new Array<CORMCondition>();
			con.push(new CORMCondition("_category", "==", category));
		
			//let pro=new Array<String>(); 
			//pro.add("COUNT(*)");
			let jsonStr=JSON.stringify(await sql.Select("board", con, ["COUNT(*)"], null));
            CPool.Recycle(sql);
			return jsonStr;
        });
        this.On("/CBoard/Delete",async (_json : CJSON, _req: Request, _res: Response)=>{
            var offset=_json.GetStr("offset");
			let sql=await CPool.Product("CLocalDB")  as CRDBMS;
			let con=new Array<CORMCondition>();
			con.push(new CORMCondition("_offset", "==", offset));
			sql.Delete("board", con);
            CPool.Recycle(sql);
        });
        this.On("/CBoard/Read",async (_json : CJSON, _req: Request, _res: Response)=>{
            var offset=_json.GetInt("offset");
			
			let sql=await CPool.Product("CLocalDB")  as CRDBMS;
			let con=new Array<CORMCondition>();
			con.push(new CORMCondition("_offset", "==", offset));
			
			//return local.Select("board", con, ["_subject","_content","_publicKey","_offset"], null);
            let jsonStr=JSON.stringify(await sql.Select("board", con, ["_subject","_content","_publicKey","_offset"], null));
            CPool.Recycle(sql);
			return jsonStr;
        });
        this.On("/CBoard/Write",async (_json : CJSON, _req: Request, _res: Response)=>{
            var category=_json.GetStr("category");
			var publicKey=_json.GetStr("publicKey");
			var subject=_json.GetStr("subject");
			var nick=_json.GetStr("nick");
			var content=_json.GetStr("content");
			var offset=_json.GetStr("offset");
			
			let data=new Array<CORMField>();
			data.push(new CORMField("_category",category));
			data.push(new CORMField("_publicKey",publicKey));
			data.push(new CORMField("_subject",subject));
			data.push(new CORMField("_nick",nick));
			data.push(new CORMField("_content",content));
			
			let sql=await CPool.Product("CLocalDB")  as CRDBMS;
			if(offset=="-1")
			{
				await sql.Insert("board", data);
			}
			else
			{
				let con=new Array<CORMCondition>();
				con.push(new CORMCondition("_offset", "==", offset));
				
				await sql.Update("board", con, data);
			}
            CPool.Recycle(sql);
        });
        this.On("/CBoard/Modify",async (_json : CJSON, _req: Request, _res: Response)=>{
            var offset=_json.GetInt("offset");
			let sql=await CPool.Product("CLocalDB")  as CRDBMS;
			let con=new Array<CORMCondition>();
			con.push(new CORMCondition("_offset", "==", offset));
			
            let jsonStr=JSON.stringify(await sql.Select("board", con, ["_subject","_content","_nick","_offset"], null));
            CPool.Recycle(sql);
			return jsonStr;
        });
    }
}
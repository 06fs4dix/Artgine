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



let data=await sql.Select("score", con, null, option);
if(data==null)
{
	await sql.Send(`CREATE TABLE IF NOT EXISTS score (
		_project TEXT DEFAULT NULL,
		_nick TEXT DEFAULT NULL,
		_data DOUBLE DEFAULT NULL,
		_datetime DATETIME DEFAULT CURRENT_TIMESTAMP
	)`);
}
@URLPatterns(["/CScore/Read","/CScore/Write"])
export class CScoreServer extends CServerRouter
{
    //mFindPWMap=new Map<string,string>();
constructor()
{
    super();
    this.On("/CScore/Read",async (_json : CJSON, _req: Request, _res: Response)=>{
        let project=_json.GetStr("project");
        let count=_json.GetStr("count");
        let order=_json.GetStr("order");
        
        
        
        let sql=await CPool.Product("CLocalDB")  as CRDBMS;
        let con=new Array<CORMCondition>();
        con.push(new CORMCondition("_project", "==", project));
        let option=new CORMOption();
        option.mLimitOffset=0;
        option.mLimit=Number(count);
        option.mOrderBy="_data "+order;
        
        
        let data=await sql.Select("score", con, null, option);
        let jsonStr=JSON.stringify(data);
        
        CPool.Recycle(sql);
        
        return jsonStr;
    });   
    this.On("/CScore/Write",async (_json : CJSON, _req: Request, _res: Response)=>{
        let project=_json.GetStr("project");
        let nick=_json.GetStr("nick");
        let data=_json.GetDouble("data");
        
        
        
        let sql=await CPool.Product("CLocalDB")  as CRDBMS;
        let fa=new Array<CORMField>();
        fa.push(new CORMField("_project",project));
        fa.push(new CORMField("_nick",nick));
        fa.push(new CORMField("_data",data));
        
        
        await sql.Insert("score", fa);
        
        
        CPool.Recycle(sql);
        
        
    });   
}
}
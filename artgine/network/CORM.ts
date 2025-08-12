import { IRecycle } from "../basic/Basic.js";
import { CFileDB, CJSON } from "../basic/CJSON.js";
import { CPool } from "../basic/CPool.js";
import { CAuthInfo } from "./CAuthInfo.js";



export class CORMField {
    public mKey = "";
    public mValue = null;//string,int,double

    constructor(_key: string, _value: any) {
        this.mKey = _key;
        this.mValue = _value;
    }

}
export class CORMCondition {
    // public constructor(String _key,String _condition,Object _value)
    // {
    // 	m_key =_key;
    // 	m_condition=_condition;
    // 	m_value=_value;
    // }
    public constructor(_key: string, _condition: string, _value, _logical: string = "and") {
        this.mKey = _key;
        this.mCondition = _condition;
        this.mValue = _value;
        this.mLogical = _logical;
    }
    public mLogical = "and";
    public mKey = "";
    public mCondition = "";
    public mValue;
}
export class CORMOption {
    public mLimitOffset = 0;
    public mLimit = 0;
    public mDistinct: string = null;
    public mOrderBy: string = null;
    public mDownload = true;
}


export class CORM implements IRecycle
{
    Recycle() 
    {
        if(this["mRecycleType"]!=null)
        {
            this["mRecycle"]=true;
            CPool.Recycle(this);
        }
    }
    GetRecycleType(): string {
        return this["mRecycleType"];
    }
    SetRecycleType(_type: string) 
    {
        if(_type!=this["mRecycleType"])
            this["mRecycleType"]=_type;
        this["mRecycle"]=false;
    }
    //리사이클 등록되어 있는지
    IsRecycle() 
    {
        if(this["mRecycleType"]==null)
            return false;
        return this["mRecycle"];
    }
    mFileDB = true;
    mAuth: CAuthInfo;
    mDatabase = "";
    async Init(): Promise<void> 
    {
        return null;
    }
    async Insert(_collection: string, _data: Array<CORMField>) {

    }
    async Update(_collection: string, _condition: Array<CORMCondition>, _data: Array<CORMField>) {

    }
    async Select(_collection: string, _condition: Array<CORMCondition>, _projection: Array<string>, _limit: CORMOption): Promise<object[]> 
    {
        return [];
    }
   
    async  Delete(_collection: string, _condition: Array<CORMCondition>) {

    }
    async  Close() {

    }
    
    async IsCollection(_name: string) { return false; }
    async CreateCollection(_name: string, _data: Array<CORMField>, _primaryKey: String) { }
    async GetProjection(_table) : Promise<string[]> {    return null;    }
}
//================================================
type ProjectedObject<T extends readonly string[]> = {
        [K in T[number]]: any;
    };
export class CRDBMS extends CORM 
{
    // static eType={
    //     Mysql:"Mysql",
    //     Sqlite:"Sqlite",
    // };
    // mType="";
    async Send(_qurry: string, _objVec: Array<any> = null)
    {
        
    }

    async Recv(_qurry: string, _objVec: Array<any> = null): Promise<any[][]>  
    {
        return null;
    }

    async FileDBChk() 
    {
        
        if (await this.IsCollection("grid_fs")==false) 
        {
             await this.Send(`
                CREATE TABLE IF NOT EXISTS grid_fs (
                    _id INTEGER PRIMARY KEY,
                    _filename TEXT,
                    _uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                    _data TEXT
                );
            `);
        }
    }

    async FileDBUpload(_collection: string, _list: Array<CFileDB>) {
        if (!this.mFileDB) return;
        await this.FileDBChk();

        for (const each of _list) {
            const text = each.mDoc[each.mKey];
            const id = `${_collection}_${each.mKey}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            await this.Send("INSERT INTO grid_fs (_filename, _data) VALUES (?, ?)", [id, text]);
            each.mDoc[each.mKey] = "#GridFS:" + id;
        }
    }

    async FileDBDownload(_list: Array<CFileDB>) {
        if (!this.mFileDB) return;

        for (const each of _list) {
            const tag = each.mDoc[each.mKey];
            const id = tag.substring(8); // remove '#GridFS:'
            const rows = await this.Recv("SELECT _data FROM grid_fs WHERE _filename = ?", [id]);
            if (rows.length > 0 && rows[0].length > 0) {
                each.mDoc[each.mKey] = rows[0][0];
            }
        }
    }
    async Insert(_collection: string, _data: Array<CORMField>) 
    {
        return null;
    }


    async Update(_collection: string, _condition: Array<CORMCondition>, _data: Array<CORMField>) {
        return null;
    }
    
   // 오버로드 선언
    async Select(_collection: string,_condition: Array<CORMCondition>,_projection: [],_limit: CORMOption): Promise<object[]>;
    async Select<K extends string>(_collection: string,_condition: Array<CORMCondition>,_projection: [K, ...K[]],_limit: CORMOption): Promise<{ [P in K]: any }[]>;
    async Select(_collection: string,_condition: Array<CORMCondition>,_projection: string[],_limit: CORMOption): Promise<object[]> 
    {
       return null;
    }

    async Delete(_collection: string, _condition: Array<CORMCondition>) {
        return null;
    }

    async Close() {
        
    }

 

    // async IsCollection(_name: string): Promise<boolean> {
    //     const rows = await this.Recv("SHOW TABLES LIKE ?", [_name]);
    //     return rows.length > 0;
    // }
    

    async CreateCollection(_name: string, _data: Array<CORMField>, _primaryKey: String) {
        const cols = _data.map(f => {
            const type = typeof f.mValue === 'number' ? (Number.isInteger(f.mValue) ? 'INT' : 'DOUBLE') : 'VARCHAR(255)';
            return `${f.mKey} ${type}`;
        });
        const pk = _primaryKey ? `, PRIMARY KEY (${_primaryKey})` : '';
        const sql = `CREATE TABLE IF NOT EXISTS ${_name} (${cols.join(', ')}${pk})`;
        return await this.Send(sql);
    }



}

///////////////////




import CORM_imple from "../network_imple/CORM.js";
CORM_imple();
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
    async Insert(_collection: string, _data: Array<CORMField>) {
        // GridFS 업로드 처리
        if (this.mFileDB) {
            await this.FileDBChk();

            const gridList = [];

            for (const field of _data) 
            {
                if (typeof field.mValue === 'string' && field.mValue.length > 0xffff) 
                {
                    const holder = {};
                    holder[field.mKey] = field.mValue;
                    gridList.push(new CFileDB(holder,field.mKey));
                }
                else if(field.mValue instanceof CJSON)
                {
                    field.mValue.FileDB(true,gridList);
                }
            }

            await this.FileDBUpload(_collection, gridList);

            // GridFSUpload에서 실제 데이터가 변경되었으므로 다시 덮어쓰기
            for (const grid of gridList) 
            {
                const key = grid.mKey;
                const index = _data.findIndex(f => f.mKey === key);
                if (index !== -1) {
                    _data[index].mValue = grid.mDoc[key];
                }
            }
        }

        const keys = _data.map(f => `${f.mKey}`).join(',');
        const values = _data.map(() => '?').join(',');
        const params = _data.map(f => f.mValue);
        const sql = `INSERT INTO ${_collection} (${keys}) VALUES (${values})`;
        return await this.Send(sql, params);
    }


    async Update(_collection: string, _condition: Array<CORMCondition>, _data: Array<CORMField>) {
        const setClause = _data.map(f => `${f.mKey}=?`).join(',');
        const setParams = _data.map(f => f.mValue);

        const whereClause = _condition.map((c, i) => {
            const logic = i === 0 ? '' : ` ${c.mLogical.toUpperCase()}`;
            return `${logic} ${c.mKey} ${c.mCondition} ?`;
        }).join('');
        const whereParams = _condition.map(c => c.mValue);

        const sql = `UPDATE ${_collection} SET ${setClause} WHERE ${whereClause}`;
        return await this.Send(sql, [...setParams, ...whereParams]);
    }
    
   // 오버로드 선언
    async Select(_collection: string,_condition: Array<CORMCondition>,_projection: [],_limit: CORMOption): Promise<object[]>;
    async Select<K extends string>(_collection: string,_condition: Array<CORMCondition>,_projection: [K, ...K[]],_limit: CORMOption): Promise<{ [P in K]: any }[]>;
    async Select(_collection: string,_condition: Array<CORMCondition>,_projection: string[],_limit: CORMOption): Promise<object[]> 
    {
        // Projection이 비어있으면 자동으로 컬럼명 조회
        if (!_projection || _projection.length === 0) 
            _projection = await this.GetProjection(_collection);
        

        const columns = _projection.length > 0 ? _projection.map(k => `${k}`).join(',') : '*';
        let sql = `SELECT ${columns} FROM ${_collection}`;

        const whereClause = _condition.map((c, i) => {
            const logic = i === 0 ? '' : ` ${c.mLogical.toUpperCase()}`;
            if(c.mCondition=="==")    return `${logic} ${c.mKey} = ?`;
            return `${logic} ${c.mKey} ${c.mCondition} ?`;
        }).join('');
        const whereParams = _condition.map(c => c.mValue);

        if (whereClause.length > 0) sql += ` WHERE ${whereClause}`;
        if (_limit?.mOrderBy) sql += ` ORDER BY ${_limit.mOrderBy}`;
        if (_limit?.mLimit > 0) sql += ` LIMIT ${_limit.mLimitOffset}, ${_limit.mLimit}`;

        const rows: any[][] = await this.Recv(sql, whereParams);
        const result: Record<string, any>[] = [];
        if(rows==null)  return null;

        for (const row of rows) {
            const rowObj: Record<string, any> = {};
            for (let i = 0; i < _projection.length; i++) {
                rowObj[_projection[i]] = row[i];
            }
            result.push(rowObj);
        }

        // GridFS 처리
        if (this.mFileDB) {
            const gridList: Array<CFileDB> = [];
            for (const doc of result) {
                for (const key of Object.keys(doc)) {
                    if (typeof doc[key] === 'string' && doc[key].startsWith('#GridFS:')) {
                        gridList.push({ mDoc: doc, mKey: key });
                    }
                }
            }
            await this.FileDBDownload(gridList);
        }

        return result as any;
    }

    async Delete(_collection: string, _condition: Array<CORMCondition>) {
        const whereClause = _condition.map((c, i) => {
            const logic = i === 0 ? '' : ` ${c.mLogical.toUpperCase()}`;
            return `${logic} ${c.mKey} ${c.mCondition} ?`;
        }).join('');
        const whereParams = _condition.map(c => c.mValue);
        const sql = `DELETE FROM ${_collection} WHERE ${whereClause}`;
        return await this.Send(sql, whereParams);
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

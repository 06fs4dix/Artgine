import { CPool } from "../basic/CPool.js";
export class CORMField {
    mKey = "";
    mValue = null;
    constructor(_key, _value) {
        this.mKey = _key;
        this.mValue = _value;
    }
}
export class CORMCondition {
    constructor(_key, _condition, _value, _logical = "and") {
        this.mKey = _key;
        this.mCondition = _condition;
        this.mValue = _value;
        this.mLogical = _logical;
    }
    mLogical = "and";
    mKey = "";
    mCondition = "";
    mValue;
}
export class CORMOption {
    mLimitOffset = 0;
    mLimit = 0;
    mDistinct = null;
    mOrderBy = null;
    mDownload = true;
}
export class CORM {
    Recycle() {
        if (this["mRecycleType"] != null) {
            this["mRecycle"] = true;
            CPool.Recycle(this);
        }
    }
    GetRecycleType() {
        return this["mRecycleType"];
    }
    SetRecycleType(_type) {
        if (_type != this["mRecycleType"])
            this["mRecycleType"] = _type;
        this["mRecycle"] = false;
    }
    IsRecycle() {
        if (this["mRecycleType"] == null)
            return false;
        return this["mRecycle"];
    }
    mFileDB = true;
    mAuth;
    mDatabase = "";
    async Init() {
        return null;
    }
    async Insert(_collection, _data) {
    }
    async Update(_collection, _condition, _data) {
    }
    async Select(_collection, _condition, _projection, _limit) {
        return [];
    }
    async Delete(_collection, _condition) {
    }
    async Close() {
    }
    async IsCollection(_name) { return false; }
    async CreateCollection(_name, _data, _primaryKey) { }
    async GetProjection(_table) { return null; }
}
export class CRDBMS extends CORM {
    async Send(_qurry, _objVec = null) {
    }
    async Recv(_qurry, _objVec = null) {
        return null;
    }
    async FileDBChk() {
        if (await this.IsCollection("grid_fs") == false) {
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
    async FileDBUpload(_collection, _list) {
        if (!this.mFileDB)
            return;
        await this.FileDBChk();
        for (const each of _list) {
            const text = each.mDoc[each.mKey];
            const id = `${_collection}_${each.mKey}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            await this.Send("INSERT INTO grid_fs (_filename, _data) VALUES (?, ?)", [id, text]);
            each.mDoc[each.mKey] = "#GridFS:" + id;
        }
    }
    async FileDBDownload(_list) {
        if (!this.mFileDB)
            return;
        for (const each of _list) {
            const tag = each.mDoc[each.mKey];
            const id = tag.substring(8);
            const rows = await this.Recv("SELECT _data FROM grid_fs WHERE _filename = ?", [id]);
            if (rows.length > 0 && rows[0].length > 0) {
                each.mDoc[each.mKey] = rows[0][0];
            }
        }
    }
    async Insert(_collection, _data) {
        return null;
    }
    async Update(_collection, _condition, _data) {
        return null;
    }
    async Select(_collection, _condition, _projection, _limit) {
        return null;
    }
    async Delete(_collection, _condition) {
        return null;
    }
    async Close() {
    }
    async CreateCollection(_name, _data, _primaryKey) {
        const cols = _data.map(f => {
            const type = typeof f.mValue === 'number' ? (Number.isInteger(f.mValue) ? 'INT' : 'DOUBLE') : 'VARCHAR(255)';
            return `${f.mKey} ${type}`;
        });
        const pk = _primaryKey ? `, PRIMARY KEY (${_primaryKey})` : '';
        const sql = `CREATE TABLE IF NOT EXISTS ${_name} (${cols.join(', ')}${pk})`;
        return await this.Send(sql);
    }
}
import CORM_imple from "../network_imple/CORM.js";
CORM_imple();

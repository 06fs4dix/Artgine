import { CFileDB, CJSON } from "../basic/CJSON.js";
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
        if (this.mFileDB) {
            await this.FileDBChk();
            const gridList = [];
            for (const field of _data) {
                if (typeof field.mValue === 'string' && field.mValue.length > 0xffff) {
                    const holder = {};
                    holder[field.mKey] = field.mValue;
                    gridList.push(new CFileDB(holder, field.mKey));
                }
                else if (field.mValue instanceof CJSON) {
                    field.mValue.FileDB(true, gridList);
                }
            }
            await this.FileDBUpload(_collection, gridList);
            for (const grid of gridList) {
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
    async Update(_collection, _condition, _data) {
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
    async Select(_collection, _condition, _projection, _limit) {
        if (!_projection || _projection.length === 0)
            _projection = await this.GetProjection(_collection);
        const columns = _projection.length > 0 ? _projection.map(k => `${k}`).join(',') : '*';
        let sql = `SELECT ${columns} FROM ${_collection}`;
        const whereClause = _condition.map((c, i) => {
            const logic = i === 0 ? '' : ` ${c.mLogical.toUpperCase()}`;
            if (c.mCondition == "==")
                return `${logic} ${c.mKey} = ?`;
            return `${logic} ${c.mKey} ${c.mCondition} ?`;
        }).join('');
        const whereParams = _condition.map(c => c.mValue);
        if (whereClause.length > 0)
            sql += ` WHERE ${whereClause}`;
        if (_limit?.mOrderBy)
            sql += ` ORDER BY ${_limit.mOrderBy}`;
        if (_limit?.mLimit > 0)
            sql += ` LIMIT ${_limit.mLimitOffset}, ${_limit.mLimit}`;
        const rows = await this.Recv(sql, whereParams);
        const result = [];
        if (rows == null)
            return null;
        for (const row of rows) {
            const rowObj = {};
            for (let i = 0; i < _projection.length; i++) {
                rowObj[_projection[i]] = row[i];
            }
            result.push(rowObj);
        }
        if (this.mFileDB) {
            const gridList = [];
            for (const doc of result) {
                for (const key of Object.keys(doc)) {
                    if (typeof doc[key] === 'string' && doc[key].startsWith('#GridFS:')) {
                        gridList.push({ mDoc: doc, mKey: key });
                    }
                }
            }
            await this.FileDBDownload(gridList);
        }
        return result;
    }
    async Delete(_collection, _condition) {
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

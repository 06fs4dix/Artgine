import { CRDBMS } from "./CORM.js";
import { CCMDMgr } from "../system/CCMDMgr.js";
let pgModule = null;
let pgLoad = null;
export class CPostgreSQL extends CRDBMS {
    mConn;
    static EnsureModule() {
        if (pgModule)
            return Promise.resolve(pgModule);
        if (!pgLoad) {
            pgLoad = (async () => {
                await CCMDMgr.NPMInstall(["pg"]);
                const mod = await import("pg");
                pgModule = mod.default ?? mod;
                return pgModule;
            })();
        }
        return pgLoad;
    }
    prepareQuery(_query, _objVec = null) {
        if (!_objVec || _objVec.length === 0) {
            return { text: _query, values: [] };
        }
        let idx = 0;
        const text = _query.replace(/\?/g, () => `$${++idx}`);
        return { text, values: _objVec };
    }
    async Init() {
        const pg = await CPostgreSQL.EnsureModule();
        const { Client } = pg;
        this.mConn = new Client({
            host: this.mAuth.mAddres,
            port: parseInt(this.mAuth.mPort || "5432", 10),
            user: this.mAuth.mID,
            password: this.mAuth.mPW,
            database: this.mDatabase,
        });
        await this.mConn.connect();
    }
    async Send(_query, _objVec = null) {
        if (!this.mConn)
            throw new Error("Connection not initialized");
        const { text, values } = this.prepareQuery(_query, _objVec);
        if (values.length > 0) {
            await this.mConn.query(text, values);
        }
        else {
            await this.mConn.query(text);
        }
    }
    async Recv(_query, _objVec = null) {
        if (!this.mConn)
            throw new Error("Connection not initialized");
        const { text, values } = this.prepareQuery(_query, _objVec);
        const result = values.length > 0
            ? await this.mConn.query(text, values)
            : await this.mConn.query(text);
        return result.rows.map((row) => Object.values(row));
    }
    async Close() {
        await this.mConn?.end();
        this.mConn = null;
    }
    async FileDBChk() {
        if (await this.IsCollection("grid_fs") == false) {
            await this.Send(`
                CREATE TABLE IF NOT EXISTS grid_fs (
                    _id SERIAL PRIMARY KEY,
                    _filename TEXT,
                    _uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    _data TEXT
                );
            `);
        }
    }
    async IsCollection(_name) {
        const rows = await this.Recv(`SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = ?`, [_name]);
        return rows != null && rows.length > 0;
    }
    async GetProjection(_table) {
        const columnRows = await this.Recv(`SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = ?
             ORDER BY ordinal_position`, [_table]);
        if (!columnRows)
            return [];
        return columnRows.map(row => row[0]);
    }
    async GetCollection() {
        const rows = await this.Recv(`SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`);
        if (!rows)
            return [];
        return rows.map(row => row[0]);
    }
    async Select(_collection, _condition, _projection, _limit) {
        if (!_projection || _projection.length === 0)
            _projection = await this.GetProjection(_collection);
        const columns = _projection.length > 0 ? _projection.map(k => `${k}`).join(",") : "*";
        let sql = `SELECT ${columns} FROM ${_collection}`;
        if (_condition == null)
            _condition = [];
        const whereClause = _condition.map((c, i) => {
            const logic = i === 0 ? "" : ` ${c.mLogical.toUpperCase()}`;
            if (c.mCondition == "==")
                return `${logic} ${c.mKey} = ?`;
            return `${logic} ${c.mKey} ${c.mCondition} ?`;
        }).join("");
        const whereParams = _condition.map(c => c.mValue);
        if (whereClause.length > 0)
            sql += ` WHERE ${whereClause}`;
        if (_limit?.mOrderBy) {
            sql += ` ORDER BY ${_limit.mOrderBy}`;
            if (_limit?.mASC == false)
                sql += ` DESC`;
        }
        if (_limit?.mLimit > 0) {
            sql += ` LIMIT ${_limit.mLimit} OFFSET ${_limit.mLimitOffset || 0}`;
        }
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
                    if (typeof doc[key] === "string" && doc[key].startsWith("#GridFS:")) {
                        gridList.push({ mDoc: doc, mKey: key });
                    }
                }
            }
            await this.FileDBDownload(gridList);
        }
        return result;
    }
    async CreateCollection(_name, _data, _primaryKey = null) {
        if (!Array.isArray(_data) || _data.length === 0)
            throw new Error("컬럼을 하나 이상 제공해야 합니다.");
        if (typeof _name !== "string" || _name.trim() === "")
            throw new Error("테이블명을 제공하세요.");
        const escapeIdent = (ident) => {
            if (typeof ident !== "string" || !/^[A-Za-z0-9_]+$/.test(ident)) {
                throw new Error(`잘못된 식별자: ${ident}`);
            }
            return `"${ident}"`;
        };
        const autoIncField = _data.find(f => typeof f.mValue === "number" && Number.isInteger(f.mValue) && f.mValue > 0);
        const autoIncKey = autoIncField ? String(autoIncField.mKey) : null;
        const mapType = (value) => {
            if (value instanceof Date)
                return "TIMESTAMP";
            if (value instanceof ArrayBuffer || ArrayBuffer.isView(value))
                return "BYTEA";
            if (typeof value === "number") {
                return Number.isInteger(value) ? "INTEGER" : "DOUBLE PRECISION";
            }
            if (typeof value === "string") {
                const len = value.length;
                if (len <= 255)
                    return "VARCHAR(255)";
                else if (len <= 65535)
                    return "TEXT";
                else
                    return "TEXT";
            }
            return "VARCHAR(255)";
        };
        const colsSql = _data.map(f => {
            const colName = String(f.mKey);
            const col = escapeIdent(colName);
            if (autoIncKey && colName === autoIncKey) {
                return `${col} SERIAL`;
            }
            const sqlType = mapType(f.mValue);
            if (f.mValue instanceof Date) {
                return `${col} ${sqlType} NOT NULL DEFAULT CURRENT_TIMESTAMP`;
            }
            return `${col} ${sqlType} NOT NULL`;
        }).join(",\n    ");
        const colNames = _data.map(x => String(x.mKey));
        const parseKeys = (s) => String(s).split(",").map(k => k.trim()).filter(k => k);
        let pkClause = "";
        let uniqueClause = "";
        if (_primaryKey && String(_primaryKey).trim()) {
            const keys = parseKeys(_primaryKey);
            const invalid = keys.filter(k => !colNames.includes(k));
            if (invalid.length > 0) {
                throw new Error(`PRIMARY KEY에 존재하지 않는 컬럼: ${invalid.join(", ")}`);
            }
            if (autoIncKey && !keys.includes(autoIncKey)) {
                pkClause = `, PRIMARY KEY (${escapeIdent(autoIncKey)})`;
                uniqueClause = `, UNIQUE (${keys.map(k => escapeIdent(k)).join(", ")})`;
            }
            else {
                pkClause = `, PRIMARY KEY (${keys.map(k => escapeIdent(k)).join(", ")})`;
            }
        }
        else {
            if (autoIncKey) {
                pkClause = `, PRIMARY KEY (${escapeIdent(autoIncKey)})`;
            }
        }
        const table = escapeIdent(_name);
        const sql = `CREATE TABLE IF NOT EXISTS ${table} (\n    ${colsSql}${pkClause}${uniqueClause}\n)`;
        return await this.Send(sql);
    }
}

import { CRDBMS } from "./CORM.js";
import { CCMDMgr } from "../system/CCMDMgr.js";
import { CPath } from "../basic/CPath.js";
import * as fs from 'fs';
import * as path from 'path';
let sqlite3Module = null;
let sqliteOpen = null;
let sqliteLoad = null;
export class CSQLite extends CRDBMS {
    mConn;
    static EnsureModule() {
        if (sqlite3Module && sqliteOpen) {
            return Promise.resolve({ sqlite3: sqlite3Module, open: sqliteOpen });
        }
        if (!sqliteLoad) {
            sqliteLoad = (async () => {
                await CCMDMgr.NPMInstall(["sqlite3", "sqlite"]);
                const sqlite3Mod = await import("sqlite3");
                sqlite3Module = sqlite3Mod.default ?? sqlite3Mod;
                const sqliteMod = await import("sqlite");
                sqliteOpen = sqliteMod.open ?? sqliteMod.default?.open;
                return { sqlite3: sqlite3Module, open: sqliteOpen };
            })();
        }
        return sqliteLoad;
    }
    async Init() {
        const { sqlite3, open } = await CSQLite.EnsureModule();
        const filename = this.mDatabase || (CPath.WorkingPath() + 'db/artgine.sqlite');
        fs.mkdirSync(path.dirname(filename), { recursive: true });
        this.mConn = await open({
            filename,
            driver: sqlite3.Database
        });
    }
    async Send(_qurry, _objVec = null) {
        if (!this.mConn)
            throw new Error('Connection not initialized');
        if (_objVec && _objVec.length > 0) {
            await this.mConn.run(_qurry, _objVec);
        }
        else {
            await this.mConn.run(_qurry);
        }
    }
    async Recv(_qurry, _objVec = null) {
        if (!this.mConn)
            throw new Error('Connection not initialized');
        try {
            let rows;
            if (_objVec && _objVec.length > 0) {
                rows = await this.mConn.all(_qurry, _objVec);
            }
            else {
                rows = await this.mConn.all(_qurry);
            }
            const result = [];
            for (const row of rows) {
                result.push(Object.values(row));
            }
            return result;
        }
        catch (err) {
            if (err?.message?.includes("no such table")) {
                return null;
            }
            else {
                throw err;
            }
        }
    }
    async IsCollection(_name) {
        let rows = await this.Recv("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [_name]);
        return rows.length > 0;
    }
    async Close() {
        await this.mConn?.close();
    }
    async GetProjection(_table) {
        let columnRows = await this.Recv(`PRAGMA table_info(${_table})`);
        return columnRows.map(row => row[1]);
        ;
    }
    async GetCollection() {
        let rows = await this.Recv("SELECT name FROM sqlite_master WHERE type='table'");
        return rows.map(row => row[0]);
    }
    async CreateCollection(_name, _data, _primaryKey = null) {
        if (!Array.isArray(_data) || _data.length === 0)
            throw new Error('컬럼을 하나 이상 제공해야 합니다.');
        if (typeof _name !== 'string' || _name.trim() === '')
            throw new Error('테이블명을 제공하세요.');
        const escapeIdent = (ident) => {
            if (typeof ident !== 'string' || !/^[A-Za-z0-9_]+$/.test(ident)) {
                throw new Error(`잘못된 식별자: ${ident}`);
            }
            return `\`${ident}\``;
        };
        const autoIncField = _data.find(f => typeof f.mValue === "number" && Number.isInteger(f.mValue) && f.mValue > 0);
        const autoIncKey = autoIncField ? String(autoIncField.mKey) : null;
        const mapType = (value) => {
            if (value instanceof Date)
                return 'DATETIME';
            if (value instanceof ArrayBuffer || ArrayBuffer.isView(value))
                return 'BLOB';
            if (typeof value === 'number') {
                return Number.isInteger(value) ? 'INTEGER' : 'REAL';
            }
            if (typeof value === 'string') {
                const len = value.length;
                if (len <= 255)
                    return 'CHAR(255)';
                else if (len <= 65535)
                    return 'VARCHAR(65535)';
                else
                    return 'TEXT';
            }
            return 'TEXT';
        };
        const colsSql = _data.map(f => {
            const colName = String(f.mKey);
            const col = escapeIdent(colName);
            if (autoIncKey && colName === autoIncKey) {
                return `${col} INTEGER PRIMARY KEY AUTOINCREMENT`;
            }
            const sqlType = mapType(f.mValue);
            if (f.mValue instanceof Date) {
                return `${col} ${sqlType} NOT NULL DEFAULT CURRENT_TIMESTAMP`;
            }
            return `${col} ${sqlType} NOT NULL`;
        }).join(',\n    ');
        const colNames = _data.map(x => String(x.mKey));
        const parseKeys = (s) => String(s).split(',').map(k => k.trim()).filter(k => k);
        let pkClause = '';
        let uniqueClause = '';
        if (_primaryKey && String(_primaryKey).trim()) {
            const keys = parseKeys(_primaryKey);
            const invalid = keys.filter(k => !colNames.includes(k));
            if (invalid.length > 0) {
                throw new Error(`PRIMARY KEY에 존재하지 않는 컬럼: ${invalid.join(', ')}`);
            }
            if (autoIncKey) {
                if (!(keys.length === 1 && keys[0] === autoIncKey)) {
                    uniqueClause = `, UNIQUE (${keys.map(k => escapeIdent(k)).join(', ')})`;
                }
            }
            else {
                pkClause = `, PRIMARY KEY (${keys.map(k => escapeIdent(k)).join(', ')})`;
            }
        }
        const table = escapeIdent(_name);
        const sql = `CREATE TABLE IF NOT EXISTS ${table} (\n    ${colsSql}${pkClause}${uniqueClause}\n);`;
        return await this.Send(sql);
    }
}

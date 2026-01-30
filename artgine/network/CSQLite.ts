import { CORMField, CRDBMS } from "./CORM.js";
import sqlite3 from 'sqlite3'; // or: import * as sqlite3 from 'sqlite3';
import { open } from 'sqlite';


export class CSQLite extends CRDBMS {
    protected mConn;

    override async Init(): Promise<void> {
        //this.mType=CRDBMS.eType.Sqlite;
        this.mConn = await open({
            filename: this.mDatabase || './db/artgine.sqlite',
            driver: sqlite3.Database
        });
    }

    override async Send(_qurry: string, _objVec: Array<any> = null): Promise<void> {
        if (!this.mConn) throw new Error('Connection not initialized');
        if (_objVec && _objVec.length > 0) {
            await this.mConn.run(_qurry, _objVec);
        } else {
            await this.mConn.run(_qurry);
        }
    }

    override async Recv(_qurry, _objVec = null) {
        if (!this.mConn)
            throw new Error('Connection not initialized');

        try {
            let rows;
            if (_objVec && _objVec.length > 0) {
                rows = await this.mConn.all(_qurry, _objVec);
            } else {
                rows = await this.mConn.all(_qurry);
            }

            const result = [];
            for (const row of rows) {
                result.push(Object.values(row));
            }
            return result;
        } catch (err) {
            if (err.message.includes("no such table")) {
                // ❗ 테이블 없으면 빈 배열 리턴
                return null;
            } else {
                // 다른 오류는 그대로 throw
                throw err;
            }
        }
    }

    override async IsCollection(_name: string): Promise<boolean> {
        let rows= await this.Recv("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [_name]);
        return rows.length > 0;
    }

    override async Close() {
        await this.mConn?.close();
    }
    override async GetProjection(_table : string) : Promise<string[]>
    {
        let columnRows= await this.Recv(`PRAGMA table_info(${_table})`);
        return columnRows.map(row => row[1]);;
    }
    override async CreateCollection(_name: string, _data: Array<CORMField>, _primaryKey: String=null) 
    {
        if (!Array.isArray(_data) || _data.length === 0) throw new Error('컬럼을 하나 이상 제공해야 합니다.');
        if (typeof _name !== 'string' || _name.trim() === '') throw new Error('테이블명을 제공하세요.');

        const escapeIdent = (ident: string) => {
            if (typeof ident !== 'string' || !/^[A-Za-z0-9_]+$/.test(ident)) {
                throw new Error(`잘못된 식별자: ${ident}`);
            }
            return `\`${ident}\``;
        };

        // 자동증가 후보(정수 + 양수) 1개만 선택
        const autoIncField = _data.find(f => typeof f.mValue === "number" && Number.isInteger(f.mValue) && f.mValue > 0);
        const autoIncKey = autoIncField ? String(autoIncField.mKey) : null;

        const mapType = (value: any) => {
            //  Date -> DATETIME
            if (value instanceof Date) return 'DATETIME';
            // 바이너리
            if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return 'BLOB';
            // 숫자
            if (typeof value === 'number') {
                return Number.isInteger(value) ? 'INTEGER' : 'REAL';
            }
            if (typeof value === 'string') {
                const len = value.length;
                if (len <= 255) return 'CHAR(255)';
                else if (len <= 65535) return 'VARCHAR(65535)';
                else return 'TEXT';
            }
            return 'TEXT';
        };

        const colsSql = _data.map(f => {
            const colName = String(f.mKey);
            const col = escapeIdent(colName);

            //  SQLite 자동증가(반드시 INTEGER PRIMARY KEY AUTOINCREMENT)
            if (autoIncKey && colName === autoIncKey) {
                return `${col} INTEGER PRIMARY KEY AUTOINCREMENT`;
            }

            const sqlType = mapType(f.mValue);

            //  Date 컬럼이면 기본값 현재시간 추가
            if (f.mValue instanceof Date) {
                return `${col} ${sqlType} NOT NULL DEFAULT CURRENT_TIMESTAMP`;
            }

            return `${col} ${sqlType} NOT NULL`;
        }).join(',\n    ');

        const colNames = _data.map(x => String(x.mKey));
        const parseKeys = (s: String) =>
            String(s).split(',').map(k => k.trim()).filter(k => k);

        let pkClause = '';
        let uniqueClause = '';

        if (_primaryKey && String(_primaryKey).trim()) {
            const keys = parseKeys(_primaryKey);
            const invalid = keys.filter(k => !colNames.includes(k));
            if (invalid.length > 0) {
                throw new Error(`PRIMARY KEY에 존재하지 않는 컬럼: ${invalid.join(', ')}`);
            }

            //  autoInc가 있으면 SQLite는 이미 PK가 컬럼에 들어가므로, 기존 _primaryKey는 UNIQUE로 처리
            if (autoIncKey) {
                if (!(keys.length === 1 && keys[0] === autoIncKey)) {
                    uniqueClause = `, UNIQUE (${keys.map(k => escapeIdent(k)).join(', ')})`;
                }
            } else {
                pkClause = `, PRIMARY KEY (${keys.map(k => escapeIdent(k)).join(', ')})`;
            }
        }

        const table = escapeIdent(_name);
        const sql = `CREATE TABLE IF NOT EXISTS ${table} (\n    ${colsSql}${pkClause}${uniqueClause}\n);`;
        return await this.Send(sql);
    }


}

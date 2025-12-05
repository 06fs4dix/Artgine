import { CORMField, CRDBMS } from "./CORM.js";
import sqlite3 from 'sqlite3'; // or: import * as sqlite3 from 'sqlite3';
import { open } from 'sqlite';


export class CSQLite extends CRDBMS {
    protected mConn;

    async Init(): Promise<void> {
        //this.mType=CRDBMS.eType.Sqlite;
        this.mConn = await open({
            filename: this.mDatabase || './db/artgine.sqlite',
            driver: sqlite3.Database
        });
    }

    async Send(_qurry: string, _objVec: Array<any> = null): Promise<void> {
        if (!this.mConn) throw new Error('Connection not initialized');
        if (_objVec && _objVec.length > 0) {
            await this.mConn.run(_qurry, _objVec);
        } else {
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

    async IsCollection(_name: string): Promise<boolean> {
        let rows= await this.Recv("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [_name]);
        return rows.length > 0;
    }

    async Close() {
        await this.mConn?.close();
    }
    async GetProjection(_table : string) : Promise<string[]>
    {
        let columnRows= await this.Recv(`PRAGMA table_info(${_table})`);
        return columnRows.map(row => row[1]);;
    }
    async CreateCollection(_name: string, _data: Array<CORMField>, _primaryKey: String=null) 
    {
        if (!Array.isArray(_data) || _data.length === 0) throw new Error('컬럼을 하나 이상 제공해야 합니다.');
        if (typeof _name !== 'string' || _name.trim() === '') throw new Error('테이블명을 제공하세요.');

        const escapeIdent = (ident: string) => {
            if (typeof ident !== 'string' || !/^[A-Za-z0-9_]+$/.test(ident)) {
                throw new Error(`잘못된 식별자: ${ident}`);
            }
            return `\`${ident}\``;
        };

        const mapType = (value: any) => {
            // Date → TEXT (ISO 문자열)
            if (value instanceof Date) return 'TEXT';
            // 바이너리
            if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return 'BLOB';
            // 숫자
            if (typeof value === 'number') {
                return Number.isInteger(value) ? 'INTEGER' : 'REAL';
            }
            // 문자열/기타 → SQLite는 타입 느슨하지만, 선언은 길이 기준으로 나눠 줄 수 있음
            if (typeof value === 'string') {
                const len = value.length;
                if (len <= 255) {
                    return 'CHAR(255)';
                } else if (len <= 65535) {
                    return 'VARCHAR(65535)';
                } else {
                    return 'TEXT'; // “최대 크기” 느낌
                }
            }
            return 'TEXT';
        };

        const colsSql = _data.map(f => {
            const col = escapeIdent(String(f.mKey));
            const sqlType = mapType(f.mValue);
            return `${col} ${sqlType} NOT NULL`;
        }).join(',\n    ');

        let pkClause = '';
        if (_primaryKey && _primaryKey.trim()) {
            const keys = _primaryKey.split(',').map(k => k.trim()).filter(k => k);
            const colNames = _data.map(x => String(x.mKey));
            const invalid = keys.filter(k => !colNames.includes(k));
            if (invalid.length > 0) {
                throw new Error(`PRIMARY KEY에 존재하지 않는 컬럼: ${invalid.join(', ')}`);
            }
            pkClause = `, PRIMARY KEY (${keys.map(k => escapeIdent(k)).join(', ')})`;
        }

        const table = escapeIdent(_name);
        const sql = `CREATE TABLE IF NOT EXISTS ${table} (\n    ${colsSql}${pkClause}\n);`;
        return await this.Send(sql);
    }
}

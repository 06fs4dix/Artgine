import { CORMField, CRDBMS } from "./CORM.js";
// import { Connection, RowDataPacket } from 'mysql2/promise';
// import * as mysql from 'mysql2/promise';
import { CPool } from "../basic/CPool.js";
let mysqlModule = null;

export class CMysql extends CRDBMS 
{
    protected mConn;
    override async Init(): Promise<void> 
    {
        //this.mType=CRDBMS.eType.Mysql;
        if (!mysqlModule) {
            mysqlModule = await import("mysql2/promise");
        }

        this.mConn = await mysqlModule.createConnection({
            host: this.mAuth.mAddres,
            port: parseInt(this.mAuth.mPort, 10),
            user: this.mAuth.mID,
            password: this.mAuth.mPW,
            database: this.mDatabase,
        });
    }

    override async Send(_qurry: string, _objVec: Array<any> = null): Promise<void> 
    {
        if (!this.mConn) throw new Error('Connection not initialized');
        if (_objVec && _objVec.length > 0) {
            await this.mConn.execute(_qurry, _objVec);
        } else {
            await this.mConn.execute(_qurry);
        }
    }

    override async Recv(_qurry: string, _objVec: Array<any> = null): Promise<any[][]>  
    {
        if (!this.mConn) throw new Error('Connection not initialized');
        let rows=[];

        if (_objVec && _objVec.length > 0) {
            [rows] = await this.mConn.query(_qurry, _objVec);
        } else {
            [rows] = await this.mConn.query(_qurry);
        }

        const result: any[][] = [];
        for (const row of rows) {
            result.push(Object.values(row));
        }

        return result;
    }
    override async Close() {
        await this.mConn?.end();
    }
    override async IsCollection(_name: string): Promise<boolean> {
        let rows= await this.Recv("SHOW TABLES LIKE ?", [_name]);
        
        return rows.length > 0;
    }
    override async GetProjection(_table : string) : Promise<string[]>
    {
        let columnRows=await this.Recv(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ?",
            [_table]
        );
         
        return columnRows.map(row => row[0]).filter(name => !["USER", "CURRENT_CONNECTIONS", "TOTAL_CONNECTIONS"].includes(name));
    }
    override async GetCollection() : Promise<string[]>
    {
        let rows = await this.Recv("SHOW TABLES");
        return rows.map(row => row[0]);
    }
    // async CreateCollection(_name: string, _data: Array<CORMField>, _primaryKey: String=null) 
    // {
    //     if (!Array.isArray(_data) || _data.length === 0) throw new Error('컬럼을 하나 이상 제공해야 합니다.');
    //     if (typeof _name !== 'string' || _name.trim() === '') throw new Error('테이블명을 제공하세요.');

    //     const escapeIdent = (ident: string) => {
    //         if (typeof ident !== 'string' || !/^[A-Za-z0-9_]+$/.test(ident)) {
    //             throw new Error(`잘못된 식별자: ${ident}`);
    //         }
    //         return `\`${ident}\``;
    //     };

    //     const mapType = (value: any) => {
    //         // Date
    //         if (value instanceof Date) return 'DATETIME';
    //         // 바이너리
    //         if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return 'LONGBLOB';
    //         // 숫자
    //         if (typeof value === 'number') {
    //             return Number.isInteger(value) ? 'INT' : 'DOUBLE';
    //         }
    //         // 문자열/기타 → 길이 기준
    //         if (typeof value === 'string') {
    //             const len = value.length;
    //             if (len <= 255) {
    //                 // CHAR(0)는 안 되므로, 구간 전체를 CHAR(255)로 통일
    //                 return 'CHAR(255)';
    //             } else if (len <= 65535) {
    //                 return 'VARCHAR(65535)';
    //             } else {
    //                 return 'LONGTEXT';
    //             }
    //         }
    //         // 기타 타입이 들어오면 그냥 VARCHAR(255)
    //         return 'VARCHAR(255)';
    //     };

    //     const colsSql = _data.map(f => {
    //         const col = escapeIdent(String(f.mKey));
    //         const sqlType = mapType(f.mValue);
    //         return `${col} ${sqlType} NOT NULL`;
    //     }).join(',\n    ');

    //     let pkClause = '';
    //     if (_primaryKey && _primaryKey.trim()) {
    //         const keys = _primaryKey.split(',').map(k => k.trim()).filter(k => k);
    //         const colNames = _data.map(x => String(x.mKey));
    //         const invalid = keys.filter(k => !colNames.includes(k));
    //         if (invalid.length > 0) {
    //             throw new Error(`PRIMARY KEY에 존재하지 않는 컬럼: ${invalid.join(', ')}`);
    //         }
    //         pkClause = `, PRIMARY KEY (${keys.map(k => escapeIdent(k)).join(', ')})`;
    //     }

    //     const table = escapeIdent(_name);
    //     const sql = `CREATE TABLE IF NOT EXISTS ${table} (\n    ${colsSql}${pkClause}\n) ENGINE=InnoDB;`;
    //     return await this.Send(sql);
    // }
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

        //  자동증가 후보(정수 + 양수) 1개만 선택
        const autoIncField = _data.find(f => typeof f.mValue === "number" && Number.isInteger(f.mValue) && f.mValue > 0);
        const autoIncKey = autoIncField ? String(autoIncField.mKey) : null;

        const mapType = (value: any) => {
            //  Date
            if (value instanceof Date) return 'DATETIME';
            // 바이너리
            if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return 'LONGBLOB';
            // 숫자
            if (typeof value === 'number') {
                return Number.isInteger(value) ? 'INT' : 'DOUBLE';
            }
            // 문자열/기타 → 길이 기준
            if (typeof value === 'string') {
                const len = value.length;
                if (len <= 255) return 'CHAR(255)';
                else if (len <= 65535) return 'VARCHAR(65535)';
                else return 'LONGTEXT';
            }
            return 'VARCHAR(255)';
        };

        const colsSql = _data.map(f => {
            const colName = String(f.mKey);
            const col = escapeIdent(colName);

            //  AUTO_INCREMENT 컬럼
            if (autoIncKey && colName === autoIncKey) {
                return `${col} INT NOT NULL AUTO_INCREMENT`;
            }

            const sqlType = mapType(f.mValue);

            //  Date 컬럼이면 기본값 현재시간 추가
            // (MySQL 5.6.5+ 에서는 DATETIME DEFAULT CURRENT_TIMESTAMP 가능)
            if (f.mValue instanceof Date) {
                return `${col} ${sqlType} NOT NULL DEFAULT CURRENT_TIMESTAMP`;
            }

            return `${col} ${sqlType} NOT NULL`;
        }).join(',\n    ');

        const colNames = _data.map(x => String(x.mKey));

        // 기존 PK 파싱
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

            // autoIncKey가 있는데 PK에 포함 안되면: PK는 autoIncKey로, 기존 PK는 UNIQUE로 유지
            if (autoIncKey && !keys.includes(autoIncKey)) {
                pkClause = `, PRIMARY KEY (${escapeIdent(autoIncKey)})`;
                uniqueClause = `, UNIQUE (${keys.map(k => escapeIdent(k)).join(', ')})`;
            } else {
                pkClause = `, PRIMARY KEY (${keys.map(k => escapeIdent(k)).join(', ')})`;
            }
        } else {
            // PK 미지정 + autoInc 있으면 autoInc를 PK로
            if (autoIncKey) {
                pkClause = `, PRIMARY KEY (${escapeIdent(autoIncKey)})`;
            }
        }

        const table = escapeIdent(_name);
        const sql = `CREATE TABLE IF NOT EXISTS ${table} (\n    ${colsSql}${pkClause}${uniqueClause}\n) ENGINE=InnoDB;`;
        return await this.Send(sql);
    }


}

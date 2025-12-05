import { CRDBMS } from "./CORM.js";
import * as mssql from "mssql";
export class CMssql extends CRDBMS {
    mConn;
    async Init() {
        this.mConn = await mssql.connect({
            user: this.mAuth.mID,
            password: this.mAuth.mPW,
            server: this.mAuth.mAddres,
            port: parseInt(this.mAuth.mPort, 10),
            database: this.mDatabase,
            options: {
                encrypt: false,
                trustServerCertificate: true
            }
        });
    }
    async Send(_query, _objVec = null) {
        if (!this.mConn)
            throw new Error("Connection not initialized");
        const request = this.mConn.request();
        if (_objVec) {
            _objVec.forEach((val, idx) => {
                request.input(`p${idx}`, val);
            });
        }
        await request.query(_query);
    }
    async Recv(_query, _objVec = null) {
        if (!this.mConn)
            throw new Error("Connection not initialized");
        const request = this.mConn.request();
        if (_objVec) {
            _objVec.forEach((val, idx) => {
                request.input(`p${idx}`, val);
            });
        }
        const result = await request.query(_query);
        return result.recordset.map(row => Object.values(row));
    }
    async Close() {
        await this.mConn?.close();
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
            return `[${ident}]`;
        };
        const mapType = (value) => {
            if (value instanceof Date)
                return 'DATETIME2';
            if (value instanceof ArrayBuffer || ArrayBuffer.isView(value))
                return 'VARBINARY(MAX)';
            if (typeof value === 'number') {
                return Number.isInteger(value) ? 'INT' : 'FLOAT';
            }
            if (typeof value === 'string') {
                const len = value.length;
                if (len <= 255) {
                    return 'CHAR(255)';
                }
                else if (len <= 65535) {
                    return 'VARCHAR(8000)';
                }
                else {
                    return 'VARCHAR(MAX)';
                }
            }
            return 'VARCHAR(255)';
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
        const rawName = _name;
        if (!/^[A-Za-z0-9_]+$/.test(rawName)) {
            throw new Error(`잘못된 테이블명: ${rawName}`);
        }
        const tableEsc = escapeIdent(rawName);
        const sql = `
    IF OBJECT_ID(N'dbo.${rawName}', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.${tableEsc} (
            ${colsSql}${pkClause}
        );
    END
    `.trim();
        return await this.Send(sql);
    }
}

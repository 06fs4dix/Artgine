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
        const autoIncField = _data.find(f => typeof f.mValue === "number" && Number.isInteger(f.mValue) && f.mValue > 0);
        const autoIncKey = autoIncField ? String(autoIncField.mKey) : null;
        const mapType = (value) => {
            if (value instanceof Date)
                return 'DATETIME';
            if (value instanceof ArrayBuffer || ArrayBuffer.isView(value))
                return 'VARBINARY(MAX)';
            if (typeof value === 'number') {
                return Number.isInteger(value) ? 'INT' : 'FLOAT';
            }
            if (typeof value === 'string') {
                const len = value.length;
                if (len <= 255)
                    return 'CHAR(255)';
                else if (len <= 65535)
                    return 'VARCHAR(8000)';
                else
                    return 'VARCHAR(MAX)';
            }
            return 'VARCHAR(255)';
        };
        const colsSql = _data.map(f => {
            const colName = String(f.mKey);
            const col = escapeIdent(colName);
            if (autoIncKey && colName === autoIncKey) {
                return `${col} INT IDENTITY(1,1) NOT NULL`;
            }
            const sqlType = mapType(f.mValue);
            if (f.mValue instanceof Date) {
                return `${col} ${sqlType} NOT NULL DEFAULT GETDATE()`;
            }
            return `${col} ${sqlType} NOT NULL`;
        }).join(',\n            ');
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
            if (autoIncKey && !keys.includes(autoIncKey)) {
                pkClause = `, PRIMARY KEY (${escapeIdent(autoIncKey)})`;
                uniqueClause = `, UNIQUE (${keys.map(k => escapeIdent(k)).join(', ')})`;
            }
            else {
                pkClause = `, PRIMARY KEY (${keys.map(k => escapeIdent(k)).join(', ')})`;
            }
        }
        else {
            if (autoIncKey) {
                pkClause = `, PRIMARY KEY (${escapeIdent(autoIncKey)})`;
            }
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
                ${colsSql}${pkClause}${uniqueClause}
        );
    END
        `.trim();
        return await this.Send(sql);
    }
}

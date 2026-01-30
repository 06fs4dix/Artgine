import { CORMField, CRDBMS } from "./CORM.js";
import * as mssql from "mssql";

export class CMssql extends CRDBMS {
    protected mConn: mssql.ConnectionPool;

    override async Init(): Promise<void> {
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

    override async Send(_query: string, _objVec: Array<any> = null): Promise<void> {
        if (!this.mConn) throw new Error("Connection not initialized");

        const request = this.mConn.request();
        if (_objVec) {
            _objVec.forEach((val, idx) => {
                request.input(`p${idx}`, val);
            });
        }
        await request.query(_query);
    }

    override async Recv(_query: string, _objVec: Array<any> = null): Promise<any[][]> {
        if (!this.mConn) throw new Error("Connection not initialized");

        const request = this.mConn.request();
        if (_objVec) {
            _objVec.forEach((val, idx) => {
                request.input(`p${idx}`, val);
            });
        }
        const result = await request.query(_query);
        return result.recordset.map(row => Object.values(row));
    }

    override async Close() {
        await this.mConn?.close();
    }
    override async CreateCollection(_name: string, _data: Array<CORMField>, _primaryKey: String=null) 
    {
        if (!Array.isArray(_data) || _data.length === 0) throw new Error('컬럼을 하나 이상 제공해야 합니다.');
        if (typeof _name !== 'string' || _name.trim() === '') throw new Error('테이블명을 제공하세요.');

        const escapeIdent = (ident: string) => {
            if (typeof ident !== 'string' || !/^[A-Za-z0-9_]+$/.test(ident)) {
                throw new Error(`잘못된 식별자: ${ident}`);
            }
            return `[${ident}]`;
        };

        //  자동증가 후보(정수 + 양수) 1개만 선택
        const autoIncField = _data.find(f => typeof f.mValue === "number" && Number.isInteger(f.mValue) && f.mValue > 0);
        const autoIncKey = autoIncField ? String(autoIncField.mKey) : null;

        const mapType = (value: any) => {
            //  Date -> DATETIME
            if (value instanceof Date) return 'DATETIME';
            // 바이너리
            if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return 'VARBINARY(MAX)';
            // 숫자
            if (typeof value === 'number') {
                return Number.isInteger(value) ? 'INT' : 'FLOAT';
            }
            if (typeof value === 'string') {
                const len = value.length;
                if (len <= 255) return 'CHAR(255)';
                else if (len <= 65535) return 'VARCHAR(8000)';
                else return 'VARCHAR(MAX)';
            }
            return 'VARCHAR(255)';
        };

        const colsSql = _data.map(f => {
            const colName = String(f.mKey);
            const col = escapeIdent(colName);

            //  MSSQL 자동증가
            if (autoIncKey && colName === autoIncKey) {
                return `${col} INT IDENTITY(1,1) NOT NULL`;
            }

            const sqlType = mapType(f.mValue);

            //  Date 컬럼이면 기본값 현재시간 추가
            if (f.mValue instanceof Date) {
                return `${col} ${sqlType} NOT NULL DEFAULT GETDATE()`;
                // 더 정밀한 시간이 필요하면 아래로 교체 가능:
                // return `${col} DATETIME2 NOT NULL DEFAULT SYSDATETIME()`;
            }

            return `${col} ${sqlType} NOT NULL`;
        }).join(',\n            ');

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

            //  autoIncKey가 있는데 PK에 포함 안되면: PK는 autoIncKey로, 기존 PK는 UNIQUE로
            if (autoIncKey && !keys.includes(autoIncKey)) {
                pkClause = `, PRIMARY KEY (${escapeIdent(autoIncKey)})`;
                uniqueClause = `, UNIQUE (${keys.map(k => escapeIdent(k)).join(', ')})`;
            } else {
                pkClause = `, PRIMARY KEY (${keys.map(k => escapeIdent(k)).join(', ')})`;
            }
        } else {
            //  PK 미지정 + autoInc 있으면 autoInc를 PK로
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

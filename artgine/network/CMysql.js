import { CRDBMS } from "./CORM.js";
let mysqlModule = null;
export class CMysql extends CRDBMS {
    mConn;
    async Init() {
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
    async Send(_qurry, _objVec = null) {
        if (!this.mConn)
            throw new Error('Connection not initialized');
        if (_objVec && _objVec.length > 0) {
            await this.mConn.execute(_qurry, _objVec);
        }
        else {
            await this.mConn.execute(_qurry);
        }
    }
    async Recv(_qurry, _objVec = null) {
        if (!this.mConn)
            throw new Error('Connection not initialized');
        let rows = [];
        if (_objVec && _objVec.length > 0) {
            [rows] = await this.mConn.query(_qurry, _objVec);
        }
        else {
            [rows] = await this.mConn.query(_qurry);
        }
        const result = [];
        for (const row of rows) {
            result.push(Object.values(row));
        }
        return result;
    }
    async Close() {
        await this.mConn?.end();
    }
    async IsCollection(_name) {
        let rows = await this.Recv("SHOW TABLES LIKE ?", [_name]);
        return rows.length > 0;
    }
    async GetProjection(_table) {
        let columnRows = await this.Recv("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ?", [_table]);
        return columnRows.map(row => row[0]).filter(name => !["USER", "CURRENT_CONNECTIONS", "TOTAL_CONNECTIONS"].includes(name));
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
        const mapType = (value) => {
            if (value instanceof Date)
                return 'DATETIME';
            if (value instanceof ArrayBuffer || ArrayBuffer.isView(value))
                return 'LONGBLOB';
            if (typeof value === 'number') {
                return Number.isInteger(value) ? 'INT' : 'DOUBLE';
            }
            if (typeof value === 'string') {
                const len = value.length;
                if (len <= 255) {
                    return 'CHAR(255)';
                }
                else if (len <= 65535) {
                    return 'VARCHAR(65535)';
                }
                else {
                    return 'LONGTEXT';
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
        const table = escapeIdent(_name);
        const sql = `CREATE TABLE IF NOT EXISTS ${table} (\n    ${colsSql}${pkClause}\n) ENGINE=InnoDB;`;
        return await this.Send(sql);
    }
}

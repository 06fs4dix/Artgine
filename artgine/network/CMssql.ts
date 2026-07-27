import { CORMCondition, CORMField, CORMOption, CRDBMS } from "./CORM.js";
import { CCMDMgr } from "../system/CCMDMgr.js";
import { CFileDB } from "../basic/CJSON.js";

let mssqlModule: any = null;
let mssqlLoad: Promise<any> = null;

export class CMssql extends CRDBMS {
    protected mConn: any;

    /** mssql 설치(NPMInstall) 후 동적 로드 (프로세스당 1회) */
    private static EnsureModule(): Promise<any> {
        if (mssqlModule) return Promise.resolve(mssqlModule);
        if (!mssqlLoad) {
            mssqlLoad = (async () => {
                await CCMDMgr.NPMInstall(["mssql"]);
                // @ts-ignore optional runtime dep — NPMInstall 후 로드
                const mod: any = await import("mssql");
                mssqlModule = mod.default ?? mod;
                return mssqlModule;
            })();
        }
        return mssqlLoad;
    }

    override async Init(): Promise<void> {
        const mssql = await CMssql.EnsureModule();
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

    /** CRDBMS 공통 SQL의 `?` 플레이스홀더를 mssql `@pN` 바인딩으로 변환 */
    private prepareRequest(_query: string, _objVec: Array<any> = null): { request: any, query: string } {
        const request = this.mConn.request();
        let query = _query;
        if (_objVec && _objVec.length > 0) {
            let idx = 0;
            query = _query.replace(/\?/g, () => {
                const name = `p${idx}`;
                request.input(name, _objVec[idx]);
                idx++;
                return `@${name}`;
            });
            // 쿼리에 `?`가 없고 이미 @pN 형태인 경우 그대로 바인딩
            if (idx === 0) {
                _objVec.forEach((val, i) => request.input(`p${i}`, val));
            }
        }
        return { request, query };
    }

    override async Send(_query: string, _objVec: Array<any> = null): Promise<void> {
        if (!this.mConn) throw new Error("Connection not initialized");

        const { request, query } = this.prepareRequest(_query, _objVec);
        await request.query(query);
    }

    override async Recv(_query: string, _objVec: Array<any> = null): Promise<any[][]> {
        if (!this.mConn) throw new Error("Connection not initialized");

        const { request, query } = this.prepareRequest(_query, _objVec);
        const result = await request.query(query);
        return result.recordset.map(row => Object.values(row));
    }

    /** MSSQL은 `LIMIT offset, count` 문법을 지원하지 않아 공통 CRDBMS.Select(CORM_imple)를 그대로 못 쓴다.
     *  OFFSET/FETCH NEXT는 ORDER BY가 필수라 정렬 지정이 없으면 `(SELECT NULL)`로 채운다. */
    override async Select(_collection: string, _condition: Array<CORMCondition>, _projection: string[], _limit: CORMOption): Promise<object[]> {
        if (!_projection || _projection.length === 0) _projection = await this.GetProjection(_collection);

        const columns = _projection.length > 0 ? _projection.map(k => `${k}`).join(',') : '*';
        let sql = `SELECT ${columns} FROM ${_collection}`;
        if (_condition == null) _condition = [];

        const whereClause = _condition.map((c, i) => {
            const logic = i === 0 ? '' : ` ${c.mLogical.toUpperCase()}`;
            if (c.mCondition == "==") return `${logic} ${c.mKey} = ?`;
            return `${logic} ${c.mKey} ${c.mCondition} ?`;
        }).join('');
        const whereParams = _condition.map(c => c.mValue);

        if (whereClause.length > 0) sql += ` WHERE ${whereClause}`;

        const orderBy = _limit?.mOrderBy || '(SELECT NULL)';
        sql += ` ORDER BY ${orderBy}`;
        if (_limit?.mASC == false) sql += ` DESC`;
        if (_limit?.mLimit > 0) sql += ` OFFSET ${_limit.mLimitOffset} ROWS FETCH NEXT ${_limit.mLimit} ROWS ONLY`;

        const rows: any[][] = await this.Recv(sql, whereParams);
        if (rows == null) return null;

        const result: Record<string, any>[] = [];
        for (const row of rows) {
            const rowObj: Record<string, any> = {};
            for (let i = 0; i < _projection.length; i++) {
                rowObj[_projection[i]] = row[i];
            }
            result.push(rowObj);
        }

        if (this.mFileDB) {
            const gridList: Array<CFileDB> = [];
            for (const doc of result) {
                for (const key of Object.keys(doc)) {
                    if (typeof doc[key] === 'string' && doc[key].startsWith('#GridFS:')) {
                        gridList.push({ mDoc: doc, mKey: key });
                    }
                }
            }
            await this.FileDBDownload(gridList);
        }

        return result as any;
    }

    override async Close() {
        await this.mConn?.close();
    }

    override async IsCollection(_name: string): Promise<boolean> {
        const rows = await this.Recv(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = ?",
            [_name]
        );
        return rows != null && rows.length > 0;
    }

    override async GetProjection(_table: string): Promise<string[]> {
        const columnRows = await this.Recv(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
            [_table]
        );
        if (!columnRows) return [];
        return columnRows.map(row => row[0]);
    }

    override async GetCollection(): Promise<string[]> {
        const rows = await this.Recv("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
        return rows.map(row => row[0]);
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

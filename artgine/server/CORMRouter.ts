import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer, isAuthedReq, isValidToken } from './CAuthServer.js';
import { CORM, CORMCondition, CORMField, CORMOption } from '../network/CORM.js';
import { CAuthInfo } from '../network/CAuthInfo.js';
import { CMysql } from '../network/CMysql.js';
import { CMssql } from '../network/CMssql.js';
import { CSQLite } from '../network/CSQLite.js';
import { CNe } from '../network/CNe.js';
import { CPostgreSQL } from '../network/CPostgreSQL.js';
import { CMongoDB } from '../network/CMongoDB.js';

/*
ORM Router
- 클라이언트가 넘긴 인증정보 + DB정보로 CORM 인스턴스를 만들어 연결하고,
  요청받은 함수(func)를 그 인스턴스에서 실행한 뒤 결과를 JSON으로 돌려주는 단일 프록시 엔드포인트.
- 네이티브 드라이버(mysql2/mssql/sqlite/pg/mongodb)는 각 DB 클래스 Init()에서 NPMInstall 후 동적 로드한다.
- /ORM/Exec POST
  body: {
      token?, auth:{mID,mPW,mAddres,mPort}, dbType:"mysql"|"mssql"|"sqlite"|"ne"|"postgresql"|"mongodb", database,
      func:"Insert"|"Update"|"Select"|"Delete"|"GetCollection"|"GetProjection",
      collection?, condition?:CORMCondition[], data?:CORMField[], projection?:string[], limit?:CORMOption
  }
*/

@URLPatterns(["/ORM/Exec"])
export class CORMRouter extends CAuthServer {
    private IsAuth(_json: CJSON, req: Request): boolean {
        const token = _json.GetStr('token');
        return token ? isValidToken(token) : isAuthedReq(req);
    }

    private CreateORM(_dbType: string): CORM {
        switch (_dbType) {
            case 'mysql': return new CMysql();
            case 'mssql': return new CMssql();
            case 'sqlite': return new CSQLite();
            case 'ne': return new CNe();
            case 'postgresql': return new CPostgreSQL();
            case 'mongodb': return new CMongoDB();
        }
        return null;
    }

    constructor() {
        super();
        this.On("/ORM/Exec", this.onExec.bind(this));
    }

    async onExec(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const dbType = _json.GetStr('dbType');
        const orm = this.CreateORM(dbType);
        if (!orm) { _res.status(400).json({ ok: false, msg: '지원하지 않는 dbType: ' + dbType }); return null; }

        const authRaw: any = _json.GetVal('auth') || {};
        const auth = new CAuthInfo();
        auth.mID = authRaw.mID || '';
        auth.mPW = authRaw.mPW || '';
        auth.mAddres = authRaw.mAddres || '';
        auth.mPort = authRaw.mPort || '';
        orm.mAuth = auth;
        orm.mDatabase = _json.GetStr('database') || '';

        try {
            await orm.Init();

            const func = _json.GetStr('func');
            const collection = _json.GetStr('collection');
            const conditionRaw = (_json.GetArray('condition')?.mArray ?? []);
            const dataRaw = (_json.GetArray('data')?.mArray ?? []);
            const projection: string[] = (_json.GetArray('projection')?.mArray ?? []);
            const limitRaw: any = _json.GetVal('limit') || {};

            const condition = conditionRaw.map((c: any) => new CORMCondition(c.GetStr('mKey'), c.GetStr('mCondition'), c.GetVal('mValue'), c.GetStr('mLogical')));
            const data = dataRaw.map((d: any) => new CORMField(d.GetStr('mKey'), d.GetVal('mValue')));

            const limit = new CORMOption();
            if (limitRaw.mLimitOffset != null) limit.mLimitOffset = limitRaw.mLimitOffset;
            if (limitRaw.mLimit != null) limit.mLimit = limitRaw.mLimit;
            if (limitRaw.mDistinct != null) limit.mDistinct = limitRaw.mDistinct;
            if (limitRaw.mOrderBy != null) limit.mOrderBy = limitRaw.mOrderBy;
            if (limitRaw.mASC != null) limit.mASC = limitRaw.mASC;

            let result: any;
            switch (func) {
                case 'Insert':
                    result = await orm.Insert(collection, data);
                    break;
                case 'Update':
                    result = await orm.Update(collection, condition, data);
                    break;
                case 'Select':
                    result = await orm.Select(collection, condition, projection, limit);
                    break;
                case 'Delete':
                    result = await orm.Delete(collection, condition);
                    break;
                case 'GetCollection':
                    result = await orm.GetCollection();
                    break;
                case 'GetProjection':
                    result = await orm.GetProjection(collection);
                    break;
                default:
                    _res.status(400).json({ ok: false, msg: '지원하지 않는 func: ' + func });
                    return null;
            }

            _res.json({ ok: true, result });
        } catch (e: any) {
            _res.status(500).json({ ok: false, msg: e?.message || 'ORM 처리 오류' });
        } finally {
            await orm.Close();
        }
        return null;
    }
}

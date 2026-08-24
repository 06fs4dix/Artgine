var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { URLPatterns } from '../network/CServerMain.js';
import { CAuthServer, isAuthedReq, isValidToken } from './CAuthServer.js';
import { CORMCondition, CORMField, CORMOption } from '../network/CORM.js';
import { CAuthInfo } from '../network/CAuthInfo.js';
import { CMysql } from '../network/CMysql.js';
import { CMssql } from '../network/CMssql.js';
import { CSQLite } from '../network/CSQLite.js';
import { CNe } from '../network/CNe.js';
import { CPostgreSQL } from '../network/CPostgreSQL.js';
import { CMongoDB } from '../network/CMongoDB.js';
let CORMRouter = class CORMRouter extends CAuthServer {
    IsAuth(_json, req) {
        const token = _json.GetStr('token');
        return token ? isValidToken(token) : isAuthedReq(req);
    }
    CreateORM(_dbType) {
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
    async onExec(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const dbType = _json.GetStr('dbType');
        const orm = this.CreateORM(dbType);
        if (!orm) {
            _res.status(400).json({ ok: false, msg: '지원하지 않는 dbType: ' + dbType });
            return null;
        }
        const authRaw = _json.GetVal('auth') || {};
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
            const projection = (_json.GetArray('projection')?.mArray ?? []);
            const limitRaw = _json.GetVal('limit') || {};
            const condition = conditionRaw.map((c) => new CORMCondition(c.GetStr('mKey'), c.GetStr('mCondition'), c.GetVal('mValue'), c.GetStr('mLogical')));
            const data = dataRaw.map((d) => new CORMField(d.GetStr('mKey'), d.GetVal('mValue')));
            const limit = new CORMOption();
            if (limitRaw.mLimitOffset != null)
                limit.mLimitOffset = limitRaw.mLimitOffset;
            if (limitRaw.mLimit != null)
                limit.mLimit = limitRaw.mLimit;
            if (limitRaw.mDistinct != null)
                limit.mDistinct = limitRaw.mDistinct;
            if (limitRaw.mOrderBy != null)
                limit.mOrderBy = limitRaw.mOrderBy;
            if (limitRaw.mASC != null)
                limit.mASC = limitRaw.mASC;
            let result;
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
        }
        catch (e) {
            _res.status(500).json({ ok: false, msg: e?.message || 'ORM 처리 오류' });
        }
        finally {
            await orm.Close();
        }
        return null;
    }
};
CORMRouter = __decorate([
    URLPatterns(["/ORM/Exec"])
], CORMRouter);
export { CORMRouter };

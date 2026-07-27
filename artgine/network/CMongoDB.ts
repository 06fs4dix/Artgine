import { CFileDB, CJSON } from "../basic/CJSON.js";
import { CCMDMgr } from "../system/CCMDMgr.js";
import { CORM, CORMCondition, CORMField, CORMOption } from "./CORM.js";

let mongoModule: any = null;
let mongoLoad: Promise<any> = null;

/**
 * MongoDB ORM — CNe와 동일한 CORM API / condition / GridFS 태그 프로토콜.
 * 드라이버는 Init 시 NPMInstall(["mongodb"]) 후 동적 로드.
 */
export class CMongoDB extends CORM {
    private mClient: any = null;
    private mDb: any = null;

    /** mongodb 설치(NPMInstall) 후 동적 로드 (프로세스당 1회) */
    private static EnsureModule(): Promise<any> {
        if (mongoModule) return Promise.resolve(mongoModule);
        if (!mongoLoad) {
            mongoLoad = (async () => {
                await CCMDMgr.NPMInstall(["mongodb"]);
                // @ts-ignore optional runtime dep — NPMInstall 후 로드
                const mod: any = await import("mongodb");
                mongoModule = mod.default ?? mod;
                return mongoModule;
            })();
        }
        return mongoLoad;
    }

    /** CAuthInfo 필드로 Mongo URI 조립 (다른 ORM과 동일 인증 방식) */
    private BuildUri(): string {
        const host = this.mAuth?.mAddres || "127.0.0.1";
        const port = this.mAuth?.mPort || "27017";
        const id = this.mAuth?.mID || "";
        const pw = this.mAuth?.mPW || "";
        if (id) {
            const user = encodeURIComponent(id);
            const pass = encodeURIComponent(pw);
            return `mongodb://${user}:${pass}@${host}:${port}`;
        }
        return `mongodb://${host}:${port}`;
    }

    override async Init(): Promise<void> {
        const mongodb = await CMongoDB.EnsureModule();
        const { MongoClient } = mongodb;
        const uri = this.BuildUri();
        this.mClient = new MongoClient(uri);
        await this.mClient.connect();
        const dbName = this.mDatabase || "artgine";
        this.mDb = this.mClient.db(dbName);
    }

    override async Close() {
        await this.mClient?.close();
        this.mClient = null;
        this.mDb = null;
    }

    private col(_name: string) {
        if (!this.mDb) throw new Error("Connection not initialized");
        return this.mDb.collection(_name);
    }

    /** CNe.conditionToLogic 과 동일한 CORMCondition → Mongo 필터 */
    private conditionToLogic(_condition: Array<CORMCondition>): any {
        if (!_condition || _condition.length === 0) return {};

        const conditions = _condition.map(con => {
            let condition: any = {};

            switch (con.mCondition) {
                case "==":
                    condition[con.mKey] = con.mValue;
                    break;
                case "!=":
                    condition[con.mKey] = { $ne: con.mValue };
                    break;
                case "<":
                    condition[con.mKey] = { $lt: con.mValue };
                    break;
                case "<=":
                    condition[con.mKey] = { $lte: con.mValue };
                    break;
                case ">":
                    condition[con.mKey] = { $gt: con.mValue };
                    break;
                case ">=":
                    condition[con.mKey] = { $gte: con.mValue };
                    break;
                case "in":
                    condition[con.mKey] = { $in: Array.isArray(con.mValue) ? con.mValue : [con.mValue] };
                    break;
                default:
                    condition[con.mKey] = con.mValue;
            }

            return condition;
        });

        if (conditions.length === 1) {
            return conditions[0];
        }

        // 연속 조건의 logical은 각 항목 mLogical 기준. 첫 항목 이후 값으로 and/or 그룹.
        const useOr = _condition.slice(1).some(c => {
            const l = (c.mLogical || "and").toLowerCase();
            return l === "or" || l === "||";
        });
        if (useOr) {
            return { $or: conditions };
        }
        return { $and: conditions };
    }

    private async gridFSUpload(_collection: string, _list: Array<CFileDB>): Promise<void> {
        if (!this.mFileDB || !_list || _list.length === 0) return;

        const gridCol = this.col("gridFS");
        for (const each of _list) {
            const text = each.mDoc[each.mKey];
            const filename = `${_collection}_${each.mKey}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            await gridCol.insertOne({
                _id: filename as any,
                filename,
                uploadDate: new Date(),
                data: text,
            });
            each.mDoc[each.mKey] = "#GridFS:" + filename;
        }
    }

    private async gridFSDownload(_list: Array<CFileDB>): Promise<void> {
        if (!this.mFileDB || !_list || _list.length === 0) return;

        const gridCol = this.col("gridFS");
        for (const each of _list) {
            const str = each.mDoc[each.mKey];
            if (typeof str !== "string") continue;
            // '#GridFS:' 또는 '#GridFS' 접두 모두 허용 (CRDBMS / CNe 호환)
            let id = str;
            if (str.startsWith("#GridFS:")) id = str.substring(8);
            else if (str.startsWith("#GridFS")) id = str.substring(7);
            else continue;

            const doc = await gridCol.findOne({ _id: id as any });
            if (doc) {
                each.mDoc[each.mKey] = doc.data;
            }
        }
    }

    private async collectGridFromFields(_collection: string, _data: Array<CORMField>): Promise<void> {
        if (!this.mFileDB) return;
        const gridList: Array<CFileDB> = [];
        for (const field of _data) {
            if (typeof field.mValue === "string" && field.mValue.length > 0xffff) {
                const holder: any = {};
                holder[field.mKey] = field.mValue;
                gridList.push(new CFileDB(holder, field.mKey));
            } else if (field.mValue instanceof CJSON) {
                field.mValue.FileDB(true, gridList);
            }
        }
        await this.gridFSUpload(_collection, gridList);
        for (const grid of gridList) {
            const key = grid.mKey;
            const index = _data.findIndex(f => f.mKey === key);
            if (index !== -1) {
                _data[index].mValue = grid.mDoc[key];
            }
        }
        // CJSON 필드는 document 내용 반영
        for (const field of _data) {
            if (field.mValue instanceof CJSON) {
                field.mValue = field.mValue.mDocument;
            }
        }
    }

    override async Insert(_collection: string, _data: Array<CORMField>) {
        await this.collectGridFromFields(_collection, _data);
        const doc: any = {};
        for (const field of _data) {
            doc[field.mKey] = field.mValue;
        }
        await this.col(_collection).insertOne(doc);
    }

    override async Update(_collection: string, _condition: Array<CORMCondition>, _data: Array<CORMField>) {
        await this.collectGridFromFields(_collection, _data);
        const filter = this.conditionToLogic(_condition);
        const setDoc: any = {};
        for (const field of _data) {
            setDoc[field.mKey] = field.mValue;
        }
        await this.col(_collection).updateMany(filter, { $set: setDoc });
    }

    override async Select(
        _collection: string,
        _condition: Array<CORMCondition>,
        _projection: Array<string>,
        _limit: CORMOption
    ): Promise<object[]> {
        const filter = this.conditionToLogic(_condition);
        let cursor = this.col(_collection).find(filter);

        if (_projection && _projection.length > 0) {
            const proj: any = { _id: 1 };
            for (const field of _projection) {
                const num = field.lastIndexOf("[");
                if (num !== -1) {
                    const strDataName = field.substring(0, num);
                    proj[strDataName] = 1;
                } else {
                    proj[field] = 1;
                }
            }
            cursor = cursor.project(proj);
        }

        if (_limit?.mOrderBy) {
            const parts = _limit.mOrderBy.split(" ");
            const field = parts[0];
            let order = parts[1]?.toLowerCase() === "desc" ? -1 : 1;
            if (_limit.mASC === false) order = -1;
            cursor = cursor.sort({ [field]: order });
        }

        if (_limit?.mLimitOffset > 0) {
            cursor = cursor.skip(_limit.mLimitOffset);
        }
        if (_limit?.mLimit > 0) {
            cursor = cursor.limit(_limit.mLimit);
        }

        const results = await cursor.toArray();

        if (this.mFileDB && (_limit == null || _limit.mDownload !== false)) {
            const gridList: Array<CFileDB> = [];
            for (const doc of results) {
                for (const key of Object.keys(doc)) {
                    if (typeof doc[key] === "string" && String(doc[key]).startsWith("#GridFS")) {
                        gridList.push({ mDoc: doc, mKey: key } as CFileDB);
                    }
                }
            }
            await this.gridFSDownload(gridList);
        }

        return results;
    }

    override async Delete(_collection: string, _condition: Array<CORMCondition>) {
        const filter = this.conditionToLogic(_condition);
        await this.col(_collection).deleteMany(filter);
    }

    override async IsCollection(_name: string): Promise<boolean> {
        if (!this.mDb) return false;
        const list = await this.mDb.listCollections({ name: _name }, { nameOnly: true }).toArray();
        return list.length > 0;
    }

    override async CreateCollection(_name: string, _data: Array<CORMField>, _primaryKey: String = null) {
        // Mongo는 스키마리스 — 컬렉션만 생성 (데이터는 Insert 시)
        if (!(await this.IsCollection(_name))) {
            await this.mDb.createCollection(_name);
        }
    }

    override async GetProjection(_table: string): Promise<string[]> {
        const doc = await this.col(_table).findOne({});
        if (!doc) return ["_id"];
        return Object.keys(doc);
    }

    override async GetCollection(): Promise<string[]> {
        if (!this.mDb) return [];
        const list = await this.mDb.listCollections({}, { nameOnly: true }).toArray();
        return list.map((c: any) => c.name);
    }
}

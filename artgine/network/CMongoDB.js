import { CFileDB, CJSON } from "../basic/CJSON.js";
import { CCMDMgr } from "../system/CCMDMgr.js";
import { CORM } from "./CORM.js";
let mongoModule = null;
let mongoLoad = null;
export class CMongoDB extends CORM {
    mClient = null;
    mDb = null;
    static EnsureModule() {
        if (mongoModule)
            return Promise.resolve(mongoModule);
        if (!mongoLoad) {
            mongoLoad = (async () => {
                await CCMDMgr.NPMInstall(["mongodb"]);
                const mod = await import("mongodb");
                mongoModule = mod.default ?? mod;
                return mongoModule;
            })();
        }
        return mongoLoad;
    }
    BuildUri() {
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
    async Init() {
        const mongodb = await CMongoDB.EnsureModule();
        const { MongoClient } = mongodb;
        const uri = this.BuildUri();
        this.mClient = new MongoClient(uri);
        await this.mClient.connect();
        const dbName = this.mDatabase || "artgine";
        this.mDb = this.mClient.db(dbName);
    }
    async Close() {
        await this.mClient?.close();
        this.mClient = null;
        this.mDb = null;
    }
    col(_name) {
        if (!this.mDb)
            throw new Error("Connection not initialized");
        return this.mDb.collection(_name);
    }
    conditionToLogic(_condition) {
        if (!_condition || _condition.length === 0)
            return {};
        const conditions = _condition.map(con => {
            let condition = {};
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
        const useOr = _condition.slice(1).some(c => {
            const l = (c.mLogical || "and").toLowerCase();
            return l === "or" || l === "||";
        });
        if (useOr) {
            return { $or: conditions };
        }
        return { $and: conditions };
    }
    async gridFSUpload(_collection, _list) {
        if (!this.mFileDB || !_list || _list.length === 0)
            return;
        const gridCol = this.col("gridFS");
        for (const each of _list) {
            const text = each.mDoc[each.mKey];
            const filename = `${_collection}_${each.mKey}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            await gridCol.insertOne({
                _id: filename,
                filename,
                uploadDate: new Date(),
                data: text,
            });
            each.mDoc[each.mKey] = "#GridFS:" + filename;
        }
    }
    async gridFSDownload(_list) {
        if (!this.mFileDB || !_list || _list.length === 0)
            return;
        const gridCol = this.col("gridFS");
        for (const each of _list) {
            const str = each.mDoc[each.mKey];
            if (typeof str !== "string")
                continue;
            let id = str;
            if (str.startsWith("#GridFS:"))
                id = str.substring(8);
            else if (str.startsWith("#GridFS"))
                id = str.substring(7);
            else
                continue;
            const doc = await gridCol.findOne({ _id: id });
            if (doc) {
                each.mDoc[each.mKey] = doc.data;
            }
        }
    }
    async collectGridFromFields(_collection, _data) {
        if (!this.mFileDB)
            return;
        const gridList = [];
        for (const field of _data) {
            if (typeof field.mValue === "string" && field.mValue.length > 0xffff) {
                const holder = {};
                holder[field.mKey] = field.mValue;
                gridList.push(new CFileDB(holder, field.mKey));
            }
            else if (field.mValue instanceof CJSON) {
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
        for (const field of _data) {
            if (field.mValue instanceof CJSON) {
                field.mValue = field.mValue.mDocument;
            }
        }
    }
    async Insert(_collection, _data) {
        await this.collectGridFromFields(_collection, _data);
        const doc = {};
        for (const field of _data) {
            doc[field.mKey] = field.mValue;
        }
        await this.col(_collection).insertOne(doc);
    }
    async Update(_collection, _condition, _data) {
        await this.collectGridFromFields(_collection, _data);
        const filter = this.conditionToLogic(_condition);
        const setDoc = {};
        for (const field of _data) {
            setDoc[field.mKey] = field.mValue;
        }
        await this.col(_collection).updateMany(filter, { $set: setDoc });
    }
    async Select(_collection, _condition, _projection, _limit) {
        const filter = this.conditionToLogic(_condition);
        let cursor = this.col(_collection).find(filter);
        if (_projection && _projection.length > 0) {
            const proj = { _id: 1 };
            for (const field of _projection) {
                const num = field.lastIndexOf("[");
                if (num !== -1) {
                    const strDataName = field.substring(0, num);
                    proj[strDataName] = 1;
                }
                else {
                    proj[field] = 1;
                }
            }
            cursor = cursor.project(proj);
        }
        if (_limit?.mOrderBy) {
            const parts = _limit.mOrderBy.split(" ");
            const field = parts[0];
            let order = parts[1]?.toLowerCase() === "desc" ? -1 : 1;
            if (_limit.mASC === false)
                order = -1;
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
            const gridList = [];
            for (const doc of results) {
                for (const key of Object.keys(doc)) {
                    if (typeof doc[key] === "string" && String(doc[key]).startsWith("#GridFS")) {
                        gridList.push({ mDoc: doc, mKey: key });
                    }
                }
            }
            await this.gridFSDownload(gridList);
        }
        return results;
    }
    async Delete(_collection, _condition) {
        const filter = this.conditionToLogic(_condition);
        await this.col(_collection).deleteMany(filter);
    }
    async IsCollection(_name) {
        if (!this.mDb)
            return false;
        const list = await this.mDb.listCollections({ name: _name }, { nameOnly: true }).toArray();
        return list.length > 0;
    }
    async CreateCollection(_name, _data, _primaryKey = null) {
        if (!(await this.IsCollection(_name))) {
            await this.mDb.createCollection(_name);
        }
    }
    async GetProjection(_table) {
        const doc = await this.col(_table).findOne({});
        if (!doc)
            return ["_id"];
        return Object.keys(doc);
    }
    async GetCollection() {
        if (!this.mDb)
            return [];
        const list = await this.mDb.listCollections({}, { nameOnly: true }).toArray();
        return list.map((c) => c.name);
    }
}

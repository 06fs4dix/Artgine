import { CFileDB, CJSON } from '../basic/CJSON.js';
import { CPath } from '../basic/CPath.js';
import { CORM, CORMCondition, CORMField, CORMOption } from './CORM.js';


export class CNe extends CORM 
{
    private mClient: any = null;
    private mDb: any = null;
    private mCollections: Map<string, any[]> = new Map();
    private mDbPath: string = CPath.WorkingPath() + "db";

    async Init(): Promise<void> 
    {
        // Create db directory if it doesn't exist
        const fs = await import('fs');
        if (!fs.existsSync(this.mDbPath)) {
            fs.mkdirSync(this.mDbPath, { recursive: true });
        }
    }

    async Close() {
        // Close all database connections
        this.mCollections.clear();
    }

    private async getCollection(_collection: string): Promise<any[]> {
        if (!this.mCollections.has(_collection)) {
            const fs = await import('fs');
            const filePath = `${this.mDbPath}/${_collection}.json`;
            
            let data: any[] = [];
            if (fs.existsSync(filePath)) {
                try {
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    data = JSON.parse(fileContent);
                } catch (error) {
                    console.error(`Error reading ${filePath}:`, error);
                    data = [];
                }
            }
            
            this.mCollections.set(_collection, data);
        }
        return this.mCollections.get(_collection)!;
    }

    private async saveCollection(_collection: string): Promise<void> {
        const fs = await import('fs');
        const filePath = `${this.mDbPath}/${_collection}.json`;
        const data = this.mCollections.get(_collection) || [];
        
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            console.error(`Error writing ${filePath}:`, error);
        }
    }

    private async findGridFSInfo(_id: string): Promise<string[]> {
        const gridFSCollection = await this.getCollection('gridFS');
        const id = _id.substring(7); // remove '#GridFS'
        
        const doc = gridFSCollection.find((item: any) => item._id === id);
        if (doc) {
            return [
                doc._id,
                doc.uploadDate?.toString() || '',
                doc.filename || ''
            ];
        }
        return [];
    }

    private async gridFSUpload(_collection: string, _list: Array<CFileDB>): Promise<void> {
        if (!this.mFileDB) return;

        const gridFSCollection = await this.getCollection('gridFS');
        
        for (const each of _list) {
            const text = each.mDoc[each.mKey];
            const filename = `${_collection}_${each.mKey}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            
            const gridFSDoc = {
                _id: filename,
                filename: filename,
                uploadDate: new Date(),
                data: text
            };

            gridFSCollection.push(gridFSDoc);
            each.mDoc[each.mKey] = `#GridFS${filename}`;
        }
        
        await this.saveCollection('gridFS');
    }

    private async gridFSDownload(_list: Array<CFileDB>): Promise<void> {
        if (!this.mFileDB) return;

        const gridFSCollection = await this.getCollection('gridFS');
        
        for (const each of _list) {
            const str = each.mDoc[each.mKey];
            const id = str.substring(7); // remove '#GridFS'
            
            const doc = gridFSCollection.find((item: any) => item._id === id);
            if (doc) {
                each.mDoc[each.mKey] = doc.data;
            }
        }
    }

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

        const logical = _condition[0].mLogical.toLowerCase();
        if (logical === "and" || logical === "&&") {
            return { $and: conditions };
        } else if (logical === "or" || logical === "||") {
            return { $or: conditions };
        }

        return conditions[0];
    }

    async Insert(_collection: string, _data: Array<CORMField>): Promise<void> {
        const collection = await this.getCollection(_collection);
        
        const doc: any = {
            _id: this.generateId()
        };
        
        for (const field of _data) {
            if (field.mValue instanceof CJSON) {
                const cjson = field.mValue as CJSON;
                const gfList = cjson.FileDB(true);
                await this.gridFSUpload(_collection, gfList);
                doc[field.mKey] = cjson.mDocument;
            } else {
                doc[field.mKey] = field.mValue;
            }
        }

        collection.push(doc);
        await this.saveCollection(_collection);
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    async Update(_collection: string, _condition: Array<CORMCondition>, _data: Array<CORMField>): Promise<void> {
        const collection = await this.getCollection(_collection);
        
        const logic = this.conditionToLogic(_condition);

        const updateDoc: any = {};
        for (const field of _data) {
            if (field.mValue instanceof CJSON) {
                const cjson = field.mValue as CJSON;
                const gfList = cjson.FileDB(true);
                await this.gridFSUpload(_collection, gfList);
                updateDoc[field.mKey] = cjson.mDocument;
            } else {
                updateDoc[field.mKey] = field.mValue;
            }
        }

        // Update matching documents
        for (let i = 0; i < collection.length; i++) {
            if (this.matchesCondition(collection[i], logic)) {
                Object.assign(collection[i], updateDoc);
            }
        }
        
        await this.saveCollection(_collection);
    }

    private matchesCondition(doc: any, condition: any): boolean {
        if (!condition || Object.keys(condition).length === 0) return true;
        
        for (const [key, value] of Object.entries(condition)) {
            if (key === '$and') {
                return (value as any[]).every(cond => this.matchesCondition(doc, cond));
            } else if (key === '$or') {
                return (value as any[]).some(cond => this.matchesCondition(doc, cond));
            } else if (typeof value === 'object' && value !== null) {
                // Handle operators like $ne, $lt, $lte, $gt, $gte, $in
                for (const [op, opValue] of Object.entries(value)) {
                    switch (op) {
                        case '$ne': if (doc[key] === opValue) return false; break;
                        case '$lt': if (doc[key] >= opValue) return false; break;
                        case '$lte': if (doc[key] > opValue) return false; break;
                        case '$gt': if (doc[key] <= opValue) return false; break;
                        case '$gte': if (doc[key] < opValue) return false; break;
                        case '$in': if (!(opValue as any[]).includes(doc[key])) return false; break;
                    }
                }
            } else {
                if (doc[key] !== value) return false;
            }
        }
        return true;
    }

    async Select(_collection: string, _condition: Array<CORMCondition>, _projection: Array<string>, _option: CORMOption): Promise<object[]> {
        const collection = await this.getCollection(_collection);
        
        const logic = this.conditionToLogic(_condition);

        // Filter documents
        let results = collection.filter((doc: any) => this.matchesCondition(doc, logic));

        // Projection 처리
        if (_projection && _projection.length > 0) {
            results = results.map((doc: any) => {
                const projected: any = { _id: doc._id };
                for (const field of _projection) {
                    const num = field.lastIndexOf("[");
                    if (num !== -1) {
                        const strDataName = field.substring(0, num);
                        projected[strDataName] = doc[strDataName];
                    } else {
                        projected[field] = doc[field];
                    }
                }
                return projected;
            });
        }

        // 정렬 처리
        if (_option?.mOrderBy) {
            const parts = _option.mOrderBy.split(' ');
            const field = parts[0];
            const order = parts[1]?.toLowerCase() === 'desc' ? -1 : 1;
            
            results.sort((a: any, b: any) => {
                if (a[field] < b[field]) return -1 * order;
                if (a[field] > b[field]) return 1 * order;
                return 0;
            });
        }

        // Limit 처리
        if (_option?.mLimit > 0) {
            results = results.slice(_option.mLimitOffset, _option.mLimitOffset + _option.mLimit);
        }

        // GridFS 처리
        if (_option?.mDownload) {
            const gridList: Array<CFileDB> = [];
            for (const doc of results) {
                for (const key of Object.keys(doc)) {
                    if (typeof doc[key] === 'string' && doc[key].startsWith('#GridFS')) {
                        gridList.push({ mDoc: doc, mKey: key });
                    }
                }
            }
            await this.gridFSDownload(gridList);
        }

        return results;
    }

    async Delete(_collection: string, _condition: Array<CORMCondition>): Promise<void> {
        const collection = await this.getCollection(_collection);
        
        const logic = this.conditionToLogic(_condition);

        // Remove matching documents
        const filteredCollection = collection.filter((doc: any) => !this.matchesCondition(doc, logic));
        
        this.mCollections.set(_collection, filteredCollection);
        await this.saveCollection(_collection);
    }

    async IsCollection(_name: string): Promise<boolean> {
        try {
            const collection = await this.getCollection(_name);
            return collection.length > 0;
        } catch {
            return false;
        }
    }

    async CreateCollection(_name: string, _data: Array<CORMField>, _primaryKey: String): Promise<void> {
        // Collections are created automatically when data is inserted
        await this.getCollection(_name);
    }

    async GetProjection(_table: string): Promise<string[]> {
        // Return common fields for all collections
        return ['_id'];
    }

    // Get all collections from the database
    async getAllCollections(): Promise<string[]> {
        const fs = await import('fs');
        const path = await import('path');
        
        if (!fs.existsSync(this.mDbPath)) {
            return [];
        }
        
        const files = fs.readdirSync(this.mDbPath);
        return files
            .filter(file => file.endsWith('.json'))
            .map(file => path.basename(file, '.json'));
    }

    // Get collection statistics
    async getCollectionStats(): Promise<any> {
        const collections = await this.getAllCollections();
        const result: any = {};
        
        for (const collectionName of collections) {
            try {
                const collection = await this.getCollection(collectionName);
                result[collectionName] = collection.length;
            } catch (error) {
                result[collectionName] = 0;
            }
        }
        
        return result;
    }
}
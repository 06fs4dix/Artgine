import { CORMField } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';
export class CWorkOrder {
    static sDB = null;
    static sTable = 'work_order';
    static async Init() {
        if (CWorkOrder.sDB != null)
            return CWorkOrder.sDB;
        const db = new CSQLite();
        await db.Init();
        if (await db.IsCollection(CWorkOrder.sTable)) {
            const cols = await db.GetProjection(CWorkOrder.sTable);
            if (!cols.includes('requester')) {
                await db.Send(`DROP TABLE ${CWorkOrder.sTable}`);
            }
        }
        await db.CreateCollection(CWorkOrder.sTable, [
            new CORMField('id', 1),
            new CORMField('status', 'ready'),
            new CORMField('requester', ''),
            new CORMField('assignee', ''),
            new CORMField('createdAt', 0),
            new CORMField('content', ''),
            new CORMField('result', ''),
        ]);
        CWorkOrder.sDB = db;
        return db;
    }
    static async Create(_requester, _assignee, _content) {
        const db = await CWorkOrder.Init();
        const createdAt = CWorkOrder.Now();
        await db.Send(`INSERT INTO ${CWorkOrder.sTable} (status, requester, assignee, createdAt, content, result) VALUES (?, ?, ?, ?, ?, ?)`, ['ready', _requester, _assignee, createdAt, _content, '']);
        const rows = await db.Recv(`SELECT id, status, requester, assignee, createdAt, content, result FROM ${CWorkOrder.sTable} WHERE requester = ? AND assignee = ? AND createdAt = ? ORDER BY id DESC LIMIT 1`, [_requester, _assignee, createdAt]);
        return CWorkOrder.RowToRecord(rows[0]);
    }
    static async ReadyList(_assignee) {
        const db = await CWorkOrder.Init();
        const rows = await db.Recv(`SELECT id, status, requester, assignee, createdAt, content, result FROM ${CWorkOrder.sTable} WHERE assignee = ? AND status != 'done' ORDER BY id ASC`, [_assignee]);
        if (rows == null || rows.length === 0)
            return null;
        const records = rows.map(CWorkOrder.RowToRecord);
        if (records.some(r => r.status === 'working' || r.status === 'failed'))
            return null;
        return records.find(r => r.status === 'ready') ?? null;
    }
    static async Latest(_assignee) {
        const db = await CWorkOrder.Init();
        const rows = await db.Recv(`SELECT id, status, requester, assignee, createdAt, content, result FROM ${CWorkOrder.sTable} WHERE assignee = ? ORDER BY id DESC LIMIT 1`, [_assignee]);
        if (rows == null || rows.length === 0)
            return null;
        return CWorkOrder.RowToRecord(rows[0]);
    }
    static async List(_status, _limit) {
        const db = await CWorkOrder.Init();
        const statusFilter = _status ? `WHERE status = ?` : '';
        const limitClause = _limit ? `LIMIT ${Number(_limit)}` : '';
        const params = _status ? [_status] : [];
        const rows = await db.Recv(`SELECT id, status, requester, assignee, createdAt, content, result FROM ${CWorkOrder.sTable} ${statusFilter} ORDER BY id DESC ${limitClause}`, params);
        if (rows == null)
            return [];
        return rows.map(CWorkOrder.RowToRecord);
    }
    static async Get(_id) {
        const db = await CWorkOrder.Init();
        const rows = await db.Recv(`SELECT id, status, requester, assignee, createdAt, content, result FROM ${CWorkOrder.sTable} WHERE id = ?`, [_id]);
        if (rows == null || rows.length === 0)
            return null;
        return CWorkOrder.RowToRecord(rows[0]);
    }
    static async SetStatus(_id, _status) {
        const db = await CWorkOrder.Init();
        await db.Send(`UPDATE ${CWorkOrder.sTable} SET status = ? WHERE id = ?`, [_status, _id]);
    }
    static async SetResult(_id, _status, _result) {
        const db = await CWorkOrder.Init();
        await db.Send(`UPDATE ${CWorkOrder.sTable} SET status = ?, result = ? WHERE id = ?`, [_status, _result, _id]);
    }
    static async DeleteAll() {
        const db = await CWorkOrder.Init();
        const rows = await db.Recv(`SELECT id FROM ${CWorkOrder.sTable}`, []);
        const count = rows ? rows.length : 0;
        if (count > 0)
            await db.Send(`DELETE FROM ${CWorkOrder.sTable}`, []);
        return count;
    }
    static async Delete(_id) {
        const db = await CWorkOrder.Init();
        const rows = await db.Recv(`SELECT id FROM ${CWorkOrder.sTable} WHERE id = ?`, [_id]);
        if (rows == null || rows.length === 0)
            return false;
        await db.Send(`DELETE FROM ${CWorkOrder.sTable} WHERE id = ?`, [_id]);
        return true;
    }
    static RowToRecord(_row) {
        return {
            id: Number(_row[0]),
            status: String(_row[1]),
            requester: String(_row[2]),
            assignee: String(_row[3]),
            createdAt: Number(_row[4]),
            content: String(_row[5]),
            result: String(_row[6]),
        };
    }
    static Now() {
        const d = new Date();
        const pad2 = (v) => (v < 10 ? `0${v}` : `${v}`);
        return Number(`${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`);
    }
}

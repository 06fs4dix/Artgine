import { CORMField } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';
export class CTerminalScheduler {
    static sDB = null;
    static sTable = 'scheduler';
    static async Init() {
        if (CTerminalScheduler.sDB != null)
            return CTerminalScheduler.sDB;
        const db = new CSQLite();
        await db.Init();
        await db.CreateCollection(CTerminalScheduler.sTable, [
            new CORMField('name', ''),
            new CORMField('subAgentKey', ''),
            new CORMField('mode', 'interval'),
            new CORMField('option', '{}'),
            new CORMField('command', ''),
        ], 'name');
        CTerminalScheduler.sDB = db;
        return db;
    }
    static async List() {
        const db = await CTerminalScheduler.Init();
        const rows = await db.Recv(`SELECT name, subAgentKey, mode, option, command FROM ${CTerminalScheduler.sTable} ORDER BY name ASC`);
        if (rows == null)
            return [];
        return rows.map(CTerminalScheduler.RowToRecord);
    }
    static async Set(_record) {
        const db = await CTerminalScheduler.Init();
        await db.Send(`INSERT INTO ${CTerminalScheduler.sTable} (name, subAgentKey, mode, option, command) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(name) DO UPDATE SET subAgentKey = excluded.subAgentKey, mode = excluded.mode, option = excluded.option, command = excluded.command`, [_record.name, _record.subAgentKey, _record.mode, JSON.stringify(_record.option ?? {}), _record.command]);
    }
    static async Delete(_name) {
        const db = await CTerminalScheduler.Init();
        const rows = await db.Recv(`SELECT name FROM ${CTerminalScheduler.sTable} WHERE name = ?`, [_name]);
        if (rows == null || rows.length === 0)
            return false;
        await db.Send(`DELETE FROM ${CTerminalScheduler.sTable} WHERE name = ?`, [_name]);
        return true;
    }
    static RowToRecord(_row) {
        return {
            name: String(_row[0]),
            subAgentKey: String(_row[1]),
            mode: String(_row[2]),
            option: CTerminalScheduler.ParseOption(_row[3]),
            command: String(_row[4]),
        };
    }
    static ParseOption(_value) {
        try {
            const parsed = JSON.parse(String(_value));
            if (parsed && typeof parsed === 'object')
                return parsed;
        }
        catch { }
        return {};
    }
}

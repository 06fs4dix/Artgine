import { CORMField } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';
export class CProviderLog {
    static sDB = null;
    static sTable = 'provider_log';
    static sCols = 'id, key, provider, sessionId, cwd, model, role, text, tool, file, createdAt';
    static async Init() {
        if (CProviderLog.sDB != null)
            return CProviderLog.sDB;
        const db = new CSQLite();
        await db.Init();
        await db.CreateCollection(CProviderLog.sTable, [
            new CORMField('id', 1),
            new CORMField('key', ''),
            new CORMField('provider', ''),
            new CORMField('sessionId', ''),
            new CORMField('cwd', ''),
            new CORMField('model', ''),
            new CORMField('role', ''),
            new CORMField('text', ''),
            new CORMField('tool', ''),
            new CORMField('file', ''),
            new CORMField('createdAt', 0),
        ]);
        await db.Send(`CREATE INDEX IF NOT EXISTS idx_plog_session_id ON ${CProviderLog.sTable}(sessionId, id)`);
        await db.Send(`CREATE INDEX IF NOT EXISTS idx_plog_key ON ${CProviderLog.sTable}(key)`);
        CProviderLog.sDB = db;
        return db;
    }
    static async Append(_rec) {
        if (_rec.role === 'tool') {
            if (!_rec.tool)
                return;
        }
        else if (!_rec.text) {
            return;
        }
        const db = await CProviderLog.Init();
        await db.Send(`INSERT INTO ${CProviderLog.sTable} (key, provider, sessionId, cwd, model, role, text, tool, file, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            _rec.key, _rec.provider, _rec.sessionId, _rec.cwd, _rec.model, _rec.role,
            _rec.text ?? '', _rec.tool ?? '', _rec.file ?? '', _rec.createdAt,
        ]);
    }
    static async List(_key, _afterId = -1, _limit) {
        const db = await CProviderLog.Init();
        const cols = CProviderLog.sCols;
        const afterId = _afterId == null || isNaN(Number(_afterId)) ? -1 : Number(_afterId);
        let rows;
        if (afterId >= 0) {
            rows = await db.Recv(`SELECT ${cols} FROM ${CProviderLog.sTable} WHERE key = ? AND id > ? ORDER BY id ASC`, [_key, afterId]);
        }
        else if (_limit) {
            rows = await db.Recv(`SELECT * FROM (SELECT ${cols} FROM ${CProviderLog.sTable} WHERE key = ? ORDER BY id DESC LIMIT ${Number(_limit)}) ORDER BY id ASC`, [_key]);
        }
        else {
            rows = await db.Recv(`SELECT ${cols} FROM ${CProviderLog.sTable} WHERE key = ? ORDER BY id ASC`, [_key]);
        }
        if (rows == null)
            return [];
        return rows.map(CProviderLog.RowToRecord);
    }
    static async ListForTerminalKey(_key, _afterId = -1) {
        const db = await CProviderLog.Init();
        const t = CProviderLog.sTable;
        const cols = CProviderLog.sCols;
        const afterId = _afterId == null || isNaN(Number(_afterId)) ? -1 : Number(_afterId);
        const owned = `sessionId != '' AND sessionId IN (SELECT DISTINCT sessionId FROM ${t} WHERE key = ? AND sessionId != '')`;
        const where = afterId >= 0
            ? `WHERE id > ? AND (key = ? OR (${owned}))`
            : `WHERE key = ? OR (${owned})`;
        const params = afterId >= 0 ? [afterId, _key, _key] : [_key, _key];
        const rows = await db.Recv(`SELECT ${cols} FROM ${t} ${where} ORDER BY id ASC`, params);
        if (rows == null)
            return [];
        return rows.map(CProviderLog.RowToRecord);
    }
    static async ListBySession(_sessionId) {
        const db = await CProviderLog.Init();
        const rows = await db.Recv(`SELECT ${CProviderLog.sCols} FROM ${CProviderLog.sTable} WHERE sessionId = ? ORDER BY id ASC`, [_sessionId]);
        if (rows == null)
            return [];
        return rows.map(CProviderLog.RowToRecord);
    }
    static async ListSessions(_beforeId, _limit = 30) {
        const db = await CProviderLog.Init();
        const t = CProviderLog.sTable;
        const group = _beforeId
            ? `SELECT sessionId, MAX(id) AS maxId, MIN(id) AS minId FROM ${t} GROUP BY sessionId HAVING maxId < ? ORDER BY maxId DESC LIMIT ${Number(_limit)}`
            : `SELECT sessionId, MAX(id) AS maxId, MIN(id) AS minId FROM ${t} GROUP BY sessionId ORDER BY maxId DESC LIMIT ${Number(_limit)}`;
        const sql = `SELECT g.sessionId, g.maxId,` +
            ` (SELECT t.model FROM ${t} t WHERE t.sessionId = g.sessionId AND t.model != '' ORDER BY t.id ASC LIMIT 1) AS model,` +
            ` COALESCE(u.text, f.text) AS firstText, COALESCE(u.cwd, f.cwd) AS cwd, l.createdAt` +
            ` FROM (${group}) g` +
            ` JOIN ${t} f ON f.id = g.minId` +
            ` JOIN ${t} l ON l.id = g.maxId` +
            ` LEFT JOIN ${t} u ON u.id = (` +
            ` SELECT t.id FROM ${t} t WHERE t.sessionId = g.sessionId AND t.role = 'user' ORDER BY t.id ASC LIMIT 1` +
            ` )`;
        const rows = await db.Recv(sql, _beforeId ? [_beforeId] : []);
        if (rows == null)
            return [];
        return rows
            .sort((a, b) => Number(b[1]) - Number(a[1]))
            .map(row => ({
            name: String(row[0]), offset: Number(row[1]), model: String(row[2] ?? ''), firstText: String(row[3] ?? ''),
            cwd: String(row[4] ?? ''), time: Number(row[5]),
        }));
    }
    static async DeleteSession(_sessionId) {
        const db = await CProviderLog.Init();
        await db.Send(`DELETE FROM ${CProviderLog.sTable} WHERE sessionId = ?`, [_sessionId]);
    }
    static async DeleteAll() {
        const db = await CProviderLog.Init();
        await db.Send(`DELETE FROM ${CProviderLog.sTable}`, []);
    }
    static RowToRecord(_row) {
        return {
            id: Number(_row[0]),
            key: String(_row[1]),
            provider: String(_row[2]),
            sessionId: String(_row[3]),
            cwd: String(_row[4]),
            model: String(_row[5]),
            role: String(_row[6]),
            text: String(_row[7]),
            tool: String(_row[8] ?? ''),
            file: String(_row[9] ?? ''),
            createdAt: Number(_row[10]),
        };
    }
    static Stamp(_iso) {
        const d = _iso ? new Date(_iso) : new Date();
        const t = isNaN(d.getTime()) ? new Date() : d;
        const p = (v) => (v < 10 ? `0${v}` : `${v}`);
        return Number(`${t.getFullYear()}${p(t.getMonth() + 1)}${p(t.getDate())}${p(t.getHours())}${p(t.getMinutes())}${p(t.getSeconds())}`);
    }
}

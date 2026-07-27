import { CORMField } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';
export class CSubAgent {
    static sDB = null;
    static sTable = 'sub_agent';
    static async Init() {
        if (CSubAgent.sDB != null)
            return CSubAgent.sDB;
        const db = new CSQLite();
        await db.Init();
        if (await db.IsCollection('sub_agent_v2')) {
            await db.Send(`DROP TABLE IF EXISTS sub_agent`);
            await db.Send(`ALTER TABLE sub_agent_v2 RENAME TO sub_agent`);
        }
        await db.CreateCollection(CSubAgent.sTable, [
            new CORMField('key', ''),
            new CORMField('provider', ''),
            new CORMField('model', ''),
            new CORMField('score', 0),
            new CORMField('traits', ''),
            new CORMField('workingDir', './'),
            new CORMField('super', 0),
            new CORMField('retryText', ''),
            new CORMField('retryCount', 0),
            new CORMField('permissions', ''),
        ], 'key');
        if (await db.IsCollection(CSubAgent.sTable)) {
            const cols = await db.GetProjection(CSubAgent.sTable);
            if (!cols.includes('super')) {
                await db.Send(`ALTER TABLE ${CSubAgent.sTable} ADD COLUMN \`super\` INTEGER NOT NULL DEFAULT 0`);
            }
            if (!cols.includes('retryText')) {
                await db.Send(`ALTER TABLE ${CSubAgent.sTable} ADD COLUMN \`retryText\` TEXT NOT NULL DEFAULT ''`);
            }
            if (!cols.includes('retryCount')) {
                await db.Send(`ALTER TABLE ${CSubAgent.sTable} ADD COLUMN \`retryCount\` INTEGER NOT NULL DEFAULT 0`);
            }
            if (!cols.includes('permissions')) {
                await db.Send(`ALTER TABLE ${CSubAgent.sTable} ADD COLUMN \`permissions\` TEXT NOT NULL DEFAULT ''`);
            }
        }
        CSubAgent.sDB = db;
        return db;
    }
    static async List() {
        const db = await CSubAgent.Init();
        const rows = await db.Recv(`SELECT key, provider, model, score, traits, workingDir, \`super\`, retryText, retryCount, permissions FROM ${CSubAgent.sTable} ORDER BY key ASC`);
        if (rows == null)
            return [];
        return rows.map(CSubAgent.RowToRecord);
    }
    static async Set(_record) {
        const db = await CSubAgent.Init();
        await db.Send(`INSERT INTO ${CSubAgent.sTable} (key, provider, model, score, traits, workingDir, \`super\`, retryText, retryCount, permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET provider = excluded.provider, model = excluded.model, score = excluded.score, traits = excluded.traits, workingDir = excluded.workingDir, \`super\` = excluded.\`super\`, retryText = excluded.retryText, retryCount = excluded.retryCount, permissions = excluded.permissions`, [_record.key, _record.provider, _record.model, _record.score, JSON.stringify(_record.traits), _record.workingDir || './', _record.super ? 1 : 0, _record.retryText || '', _record.retryCount || 0, CSubAgent.StringifyPermissions(_record.permissions)]);
    }
    static async Delete(_key) {
        const db = await CSubAgent.Init();
        const rows = await db.Recv(`SELECT key FROM ${CSubAgent.sTable} WHERE key = ?`, [_key]);
        if (rows == null || rows.length === 0)
            return false;
        await db.Send(`DELETE FROM ${CSubAgent.sTable} WHERE key = ?`, [_key]);
        return true;
    }
    static RowToRecord(_row) {
        return {
            key: String(_row[0]),
            provider: String(_row[1]),
            model: String(_row[2]),
            score: Number(_row[3]),
            traits: CSubAgent.ParseTraits(_row[4]),
            workingDir: String(_row[5] ?? './') || './',
            super: Number(_row[6]) ? 1 : 0,
            retryText: String(_row[7] ?? ''),
            retryCount: Number(_row[8]) || 0,
            permissions: CSubAgent.ParsePermissions(_row[9]),
        };
    }
    static StringifyPermissions(_perms) {
        const allow = Array.isArray(_perms?.allow) ? _perms.allow : [];
        const deny = Array.isArray(_perms?.deny) ? _perms.deny : [];
        if (allow.length === 0 && deny.length === 0)
            return '';
        return JSON.stringify({ allow, deny });
    }
    static ParsePermissions(_value) {
        try {
            const parsed = JSON.parse(String(_value ?? ''));
            return {
                allow: Array.isArray(parsed?.allow) ? parsed.allow : [],
                deny: Array.isArray(parsed?.deny) ? parsed.deny : [],
            };
        }
        catch {
            return { allow: [], deny: [] };
        }
    }
    static ParseTraits(_value) {
        try {
            const parsed = JSON.parse(String(_value));
            if (Array.isArray(parsed))
                return parsed.map(String);
        }
        catch { }
        const s = String(_value ?? '').trim();
        return s.length > 0 ? [s] : [];
    }
}

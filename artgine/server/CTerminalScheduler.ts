import { CORMField, CRDBMS } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';

// interval: {delay,count,start,end} (CSchedule 필드), time: {days,hour,minute}
export type SchedulerOption = { delay?: number; count?: number; start?: number; end?: number; days?: number[]; hour?: number; minute?: number };
export type SchedulerRecord = {
    name: string;
    subAgentKey: string;
    mode: string; // 'interval' | 'time'
    option: SchedulerOption;
    command: string;
};

// 터미널 라우터(CTerminalRouter)가 등록·조회·삭제하는 스케줄러 카탈로그.
// 이름(name) 기준으로 유일하며, 같은 name으로 다시 Set()하면 덮어쓴다(upsert). CSubAgent와 동일한 패턴.
export class CTerminalScheduler {
    private static sDB: CRDBMS = null;
    private static sTable = 'scheduler';

    private static async Init(): Promise<CRDBMS> {
        if (CTerminalScheduler.sDB != null) return CTerminalScheduler.sDB;

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

    public static async List(): Promise<SchedulerRecord[]> {
        const db = await CTerminalScheduler.Init();
        const rows = await db.Recv(`SELECT name, subAgentKey, mode, option, command FROM ${CTerminalScheduler.sTable} ORDER BY name ASC`);
        if (rows == null) return [];
        return rows.map(CTerminalScheduler.RowToRecord);
    }

    // name이 이미 있으면 덮어쓰고, 없으면 새로 만든다. option은 모드별 하위 필드가 달라 JSON으로 저장한다.
    public static async Set(_record: SchedulerRecord): Promise<void> {
        const db = await CTerminalScheduler.Init();
        await db.Send(
            `INSERT INTO ${CTerminalScheduler.sTable} (name, subAgentKey, mode, option, command) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(name) DO UPDATE SET subAgentKey = excluded.subAgentKey, mode = excluded.mode, option = excluded.option, command = excluded.command`,
            [_record.name, _record.subAgentKey, _record.mode, JSON.stringify(_record.option ?? {}), _record.command]
        );
    }

    public static async Delete(_name: string): Promise<boolean> {
        const db = await CTerminalScheduler.Init();
        const rows = await db.Recv(`SELECT name FROM ${CTerminalScheduler.sTable} WHERE name = ?`, [_name]);
        if (rows == null || rows.length === 0) return false;
        await db.Send(`DELETE FROM ${CTerminalScheduler.sTable} WHERE name = ?`, [_name]);
        return true;
    }

    private static RowToRecord(_row: any[]): SchedulerRecord {
        return {
            name: String(_row[0]),
            subAgentKey: String(_row[1]),
            mode: String(_row[2]),
            option: CTerminalScheduler.ParseOption(_row[3]),
            command: String(_row[4]),
        };
    }

    private static ParseOption(_value: any): SchedulerOption {
        try {
            const parsed = JSON.parse(String(_value));
            if (parsed && typeof parsed === 'object') return parsed;
        } catch { /* 손상된 값은 빈 옵션으로 취급 */ }
        return {};
    }
}

import { CORMField, CRDBMS } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';

export type WorkOrderRecord = {
    id: number;
    status: string; // 'ready' | 'working' | 'done' | 'failed'
    requester: string;
    assignee: string;
    createdAt: number; // YYYYMMDDHHmmss
    content: string;
    result: string;
};

// 서브 에이전트 사이에 "누가 누구에게 어떤 작업을 요청했고, 지금 어떤 상태인지"를 추적하는 작업 의뢰서 테이블.
export class CWorkOrder {
    private static sDB: CRDBMS = null;
    private static sTable = 'work_order';

    private static async Init(): Promise<CRDBMS> {
        if (CWorkOrder.sDB != null) return CWorkOrder.sDB;

        const db = new CSQLite();
        await db.Init();

        // 원래 컬럼명이 from/to였는데 SQLite 예약어라 CORM의 범용 Select(식별자 이스케이프 없음, ORM_viewer 등에서 사용)가
        // 깨졌다. requester/assignee로 바꾸며 구 스키마 테이블은 버리고 새로 만든다(1회성, 데이터 손실 감수).
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

    public static async Create(_requester: string, _assignee: string, _content: string): Promise<WorkOrderRecord> {
        const db = await CWorkOrder.Init();
        const createdAt = CWorkOrder.Now();
        await db.Send(
            `INSERT INTO ${CWorkOrder.sTable} (status, requester, assignee, createdAt, content, result) VALUES (?, ?, ?, ?, ?, ?)`,
            ['ready', _requester, _assignee, createdAt, _content, '']
        );
        const rows = await db.Recv(
            `SELECT id, status, requester, assignee, createdAt, content, result FROM ${CWorkOrder.sTable} WHERE requester = ? AND assignee = ? AND createdAt = ? ORDER BY id DESC LIMIT 1`,
            [_requester, _assignee, createdAt]
        );
        return CWorkOrder.RowToRecord(rows[0]);
    }

    // 특정 assignee 앞으로 온 의뢰서 중 아직 처리되지 않은(status != 'done') 것들을 id 오름차순으로 확인해,
    // working/failed가 하나라도 있으면(= 이미 처리 중이거나 실패로 멈춰있으면) null을 반환해 배분을 건너뛴다.
    // 그렇지 않으면 id가 가장 낮은 ready 의뢰서 하나만 반환한다(한 틱에 assignee당 최대 1건).
    public static async ReadyList(_assignee: string): Promise<WorkOrderRecord | null> {
        const db = await CWorkOrder.Init();
        const rows = await db.Recv(
            `SELECT id, status, requester, assignee, createdAt, content, result FROM ${CWorkOrder.sTable} WHERE assignee = ? AND status != 'done' ORDER BY id ASC`,
            [_assignee]
        );
        if (rows == null || rows.length === 0) return null;
        const records = rows.map(CWorkOrder.RowToRecord);
        if (records.some(r => r.status === 'working' || r.status === 'failed')) return null;
        return records.find(r => r.status === 'ready') ?? null;
    }

    // 특정 assignee 앞으로 온 워크오더 중 가장 최근(id 최대) 1건. 없으면 null.
    // 자동 리트라이 판정(마지막 작업이 done으로 끝났는지)에 쓰인다 — ReadyList는 done을 걸러내므로
    // "전부 done이라 idle"과 "애초에 워크오더가 없어서 idle"을 구분하지 못해 따로 둔다.
    public static async Latest(_assignee: string): Promise<WorkOrderRecord | null> {
        const db = await CWorkOrder.Init();
        const rows = await db.Recv(
            `SELECT id, status, requester, assignee, createdAt, content, result FROM ${CWorkOrder.sTable} WHERE assignee = ? ORDER BY id DESC LIMIT 1`,
            [_assignee]
        );
        if (rows == null || rows.length === 0) return null;
        return CWorkOrder.RowToRecord(rows[0]);
    }

    // _status가 비어있으면 전체, 있으면 그 상태만. _limit이 지정되면 최신순으로 그 개수만 가져온다.
    public static async List(_status?: string, _limit?: number): Promise<WorkOrderRecord[]> {
        const db = await CWorkOrder.Init();
        const statusFilter = _status ? `WHERE status = ?` : '';
        const limitClause = _limit ? `LIMIT ${Number(_limit)}` : '';
        const params = _status ? [_status] : [];
        const rows = await db.Recv(
            `SELECT id, status, requester, assignee, createdAt, content, result FROM ${CWorkOrder.sTable} ${statusFilter} ORDER BY id DESC ${limitClause}`,
            params
        );
        if (rows == null) return [];
        return rows.map(CWorkOrder.RowToRecord);
    }

    public static async Get(_id: number): Promise<WorkOrderRecord | null> {
        const db = await CWorkOrder.Init();
        const rows = await db.Recv(`SELECT id, status, requester, assignee, createdAt, content, result FROM ${CWorkOrder.sTable} WHERE id = ?`, [_id]);
        if (rows == null || rows.length === 0) return null;
        return CWorkOrder.RowToRecord(rows[0]);
    }

    public static async SetStatus(_id: number, _status: string): Promise<void> {
        const db = await CWorkOrder.Init();
        await db.Send(`UPDATE ${CWorkOrder.sTable} SET status = ? WHERE id = ?`, [_status, _id]);
    }

    // 완료(또는 실패) 시 결과 내용과 함께 상태를 함께 기록한다.
    public static async SetResult(_id: number, _status: string, _result: string): Promise<void> {
        const db = await CWorkOrder.Init();
        await db.Send(`UPDATE ${CWorkOrder.sTable} SET status = ?, result = ? WHERE id = ?`, [_status, _result, _id]);
    }

    // 테이블의 모든 행을 삭제한다(status 무관). 삭제된 행 수를 반환한다.
    public static async DeleteAll(): Promise<number> {
        const db = await CWorkOrder.Init();
        const rows = await db.Recv(`SELECT id FROM ${CWorkOrder.sTable}`, []);
        const count = rows ? rows.length : 0;
        if (count > 0) await db.Send(`DELETE FROM ${CWorkOrder.sTable}`, []);
        return count;
    }

    public static async Delete(_id: number): Promise<boolean> {
        const db = await CWorkOrder.Init();
        const rows = await db.Recv(`SELECT id FROM ${CWorkOrder.sTable} WHERE id = ?`, [_id]);
        if (rows == null || rows.length === 0) return false;
        await db.Send(`DELETE FROM ${CWorkOrder.sTable} WHERE id = ?`, [_id]);
        return true;
    }

    private static RowToRecord(_row: any[]): WorkOrderRecord {
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

    private static Now(): number {
        const d = new Date();
        const pad2 = (v: number) => (v < 10 ? `0${v}` : `${v}`);
        return Number(`${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`);
    }
}

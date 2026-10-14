import { CORMField, CRDBMS } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';

export type WorkOrderRecord = {
    id: number;
    status: string; // 'ready' | 'working' | 'done' | 'failed'
    requester: string;
    assignee: string;
    createdAt: number; // YYYYMMDDHHmmss
    content: string;
    logId: number;  // 배분 시점의 provider_log 마지막 id. 이 의뢰의 처리 내역은 assignee의 로그 중 이 id 이후 구간이다.
};

// 서브 에이전트 사이에 "누가 누구에게 어떤 작업을 요청했고, 지금 어떤 상태인지"를 추적하는 작업 의뢰서 테이블.
// 결과 본문은 여기 두지 않는다 - 처리 내역/최종 답변은 provider_log(대화 로그)가 정본이고, 여기서는 logId로 그 구간만 가리킨다.
export class CWorkOrder {
    private static sDB: CRDBMS = null;
    private static sTable = 'work_order';
    private static readonly sCols = 'id, status, requester, assignee, createdAt, content, logId';

    private static async Init(): Promise<CRDBMS> {
        if (CWorkOrder.sDB != null) return CWorkOrder.sDB;

        const db = new CSQLite();
        await db.Init();

        // 구 스키마(from/to 컬럼, 또는 result 컬럼)는 버리고 새로 만든다. 서버 기동 시 어차피 전부 비우는 테이블이라 손실이 없다.
        if (await db.IsCollection(CWorkOrder.sTable)) {
            const cols = await db.GetProjection(CWorkOrder.sTable);
            if (!cols.includes('logId')) {
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
            new CORMField('logId', 0),
        ]);

        CWorkOrder.sDB = db;
        return db;
    }

    public static async Create(_requester: string, _assignee: string, _content: string): Promise<WorkOrderRecord> {
        const db = await CWorkOrder.Init();
        const createdAt = CWorkOrder.Now();
        await db.Send(
            `INSERT INTO ${CWorkOrder.sTable} (status, requester, assignee, createdAt, content, logId) VALUES (?, ?, ?, ?, ?, ?)`,
            ['ready', _requester, _assignee, createdAt, _content, 0]
        );
        const rows = await db.Recv(
            `SELECT ${CWorkOrder.sCols} FROM ${CWorkOrder.sTable} WHERE requester = ? AND assignee = ? AND createdAt = ? ORDER BY id DESC LIMIT 1`,
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
            `SELECT ${CWorkOrder.sCols} FROM ${CWorkOrder.sTable} WHERE assignee = ? AND status != 'done' ORDER BY id ASC`,
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
            `SELECT ${CWorkOrder.sCols} FROM ${CWorkOrder.sTable} WHERE assignee = ? ORDER BY id DESC LIMIT 1`,
            [_assignee]
        );
        if (rows == null || rows.length === 0) return null;
        return CWorkOrder.RowToRecord(rows[0]);
    }

    // 특정 assignee가 지금 처리 중(working)인 의뢰서. ReadyList가 assignee당 working을 하나로 묶어두므로 최대 1건이다.
    public static async Working(_assignee: string): Promise<WorkOrderRecord | null> {
        const db = await CWorkOrder.Init();
        const rows = await db.Recv(
            `SELECT ${CWorkOrder.sCols} FROM ${CWorkOrder.sTable} WHERE assignee = ? AND status = 'working' ORDER BY id ASC LIMIT 1`,
            [_assignee]
        );
        if (rows == null || rows.length === 0) return null;
        return CWorkOrder.RowToRecord(rows[0]);
    }

    // 같은 assignee의 바로 다음 의뢰서 중 이미 배분된(logId > 0) 것의 logId. 이 의뢰의 로그 구간 끝으로 쓴다. 없으면 0.
    public static async NextLogId(_order: WorkOrderRecord): Promise<number> {
        const db = await CWorkOrder.Init();
        const rows = await db.Recv(
            `SELECT logId FROM ${CWorkOrder.sTable} WHERE assignee = ? AND id > ? AND logId > 0 ORDER BY id ASC LIMIT 1`,
            [_order.assignee, _order.id]
        );
        if (rows == null || rows.length === 0) return 0;
        return Number(rows[0][0]) || 0;
    }

    // _status가 비어있으면 전체, 있으면 그 상태만. _limit이 지정되면 최신순으로 그 개수만 가져온다.
    public static async List(_status?: string, _limit?: number): Promise<WorkOrderRecord[]> {
        const db = await CWorkOrder.Init();
        const statusFilter = _status ? `WHERE status = ?` : '';
        const limitClause = _limit ? `LIMIT ${Number(_limit)}` : '';
        const params = _status ? [_status] : [];
        const rows = await db.Recv(
            `SELECT ${CWorkOrder.sCols} FROM ${CWorkOrder.sTable} ${statusFilter} ORDER BY id DESC ${limitClause}`,
            params
        );
        if (rows == null) return [];
        return rows.map(CWorkOrder.RowToRecord);
    }

    public static async Get(_id: number): Promise<WorkOrderRecord | null> {
        const db = await CWorkOrder.Init();
        const rows = await db.Recv(`SELECT ${CWorkOrder.sCols} FROM ${CWorkOrder.sTable} WHERE id = ?`, [_id]);
        if (rows == null || rows.length === 0) return null;
        return CWorkOrder.RowToRecord(rows[0]);
    }

    public static async SetStatus(_id: number, _status: string): Promise<void> {
        const db = await CWorkOrder.Init();
        await db.Send(`UPDATE ${CWorkOrder.sTable} SET status = ? WHERE id = ?`, [_status, _id]);
    }

    // 배분 시 working 선점과 로그 구간 시작점을 한 번에 기록한다.
    public static async Dispatch(_id: number, _logId: number): Promise<void> {
        const db = await CWorkOrder.Init();
        await db.Send(`UPDATE ${CWorkOrder.sTable} SET status = 'working', logId = ? WHERE id = ?`, [_logId, _id]);
    }

    // 최종 답변이 로그에 들어와 서버가 완료를 판정할 때 쓴다. 에이전트가 먼저 failed를 선언했으면 덮어쓰지 않는다.
    public static async CompleteIfWorking(_id: number): Promise<boolean> {
        const db = await CWorkOrder.Init();
        const rows = await db.Recv(`SELECT id FROM ${CWorkOrder.sTable} WHERE id = ? AND status = 'working'`, [_id]);
        if (rows == null || rows.length === 0) return false;
        await db.Send(`UPDATE ${CWorkOrder.sTable} SET status = 'done' WHERE id = ? AND status = 'working'`, [_id]);
        return true;
    }

    // _requester가 낸 미완료(ready/working) 의뢰를 전부 failed로 닫고 그 id들을 돌려준다(팀 종료 시 정리용).
    public static async FailPending(_requester: string): Promise<number[]> {
        const db = await CWorkOrder.Init();
        const rows = await db.Recv(`SELECT id FROM ${CWorkOrder.sTable} WHERE requester = ? AND status IN ('ready', 'working')`, [_requester]);
        const ids = (rows ?? []).map((r: any[]) => Number(r[0]));
        if (ids.length > 0) await db.Send(`UPDATE ${CWorkOrder.sTable} SET status = 'failed' WHERE requester = ? AND status IN ('ready', 'working')`, [_requester]);
        return ids;
    }

    // 배분 지시문 첫 줄에 넣는 의뢰 표식. 대화 로그에서 "이 의뢰를 받은 user 행"을 찾는 유일한 근거다 -
    // 배분 직전의 /clear도 user 행 + 턴 종료 assistant 행("Conversation cleared...")을 남기므로, 순서만으로
    // 구간을 잡으면 /clear 응답을 이 의뢰의 최종 답변으로 오판한다. 닫는 ']'까지 넣어야 #1이 #12에 걸리지 않는다.
    public static Marker(_id: number): string {
        return `[WorkOrder #${_id}]`;
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
            logId: Number(_row[6]) || 0,
        };
    }

    private static Now(): number {
        const d = new Date();
        const pad2 = (v: number) => (v < 10 ? `0${v}` : `${v}`);
        return Number(`${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`);
    }
}

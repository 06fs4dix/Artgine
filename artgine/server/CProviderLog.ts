import { CORMField, CRDBMS } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';

export type ProviderLogRecord = {
    id: number;
    key: string;        // pty 세션 key(없으면 token) — 라우터가 아는 값
    provider: string;   // claude | grok | codex | opencode
    sessionId: string;  // CLI 자체 세션 ID
    cwd: string;        // 워크스페이스
    model: string;      // 모델명
    role: string;       // user | assistant
    text: string;       // 본문(마크다운 원문)
    createdAt: number;  // YYYYMMDDHHmmss
};

// 터미널 세션의 질문/최종답변만 저장하는 provider(CLI)별 대화 로그.
//
// 소스는 화면이 아니라 각 CLI가 직접 남기는 세션 트랜스크립트다(CConversationReader 참조).
// 화면 스크래핑으로는 도구 출력과 답변이 원리적으로 구분되지 않아 폐기했다 — 자세한 이유는 리더 주석에.
// 도구 호출 직전의 중간 멘트("~를 확인하겠습니다")는 저장하지 않는다. 최종 답변만 남긴다.
export class CProviderLog {
    private static sDB: CRDBMS = null;
    private static sTable = 'provider_log';

    private static async Init(): Promise<CRDBMS> {
        if (CProviderLog.sDB != null) return CProviderLog.sDB;

        const db = new CSQLite();
        await db.Init();

        // 구 스키마(key/mode/createdAt/content — 화면 스크래핑 시절)로 만들어진 테이블이 남아 있으면 버린다.
        // CreateCollection은 CREATE TABLE IF NOT EXISTS라 컬럼을 추가해주지 않아, 그대로 두면 INSERT가 깨진다.
        // (CWorkOrder가 from/to → requester/assignee 바꿀 때 쓴 것과 같은 1회성 처리)
        if (await db.IsCollection(CProviderLog.sTable)) {
            const cols = await db.GetProjection(CProviderLog.sTable);
            if (!cols.includes('sessionId')) {
                await db.Send(`DROP TABLE ${CProviderLog.sTable}`);
            }
        }

        await db.CreateCollection(CProviderLog.sTable, [
            new CORMField('id', 1),
            new CORMField('key', ''),
            new CORMField('provider', ''),
            new CORMField('sessionId', ''),
            new CORMField('cwd', ''),
            new CORMField('model', ''),
            new CORMField('role', ''),
            new CORMField('text', ''),
            new CORMField('createdAt', 0),
        ]);

        CProviderLog.sDB = db;
        return db;
    }

    public static async Append(_rec: Omit<ProviderLogRecord, 'id'>): Promise<void> {
        if (!_rec.text) return;
        const db = await CProviderLog.Init();
        await db.Send(
            `INSERT INTO ${CProviderLog.sTable} (key, provider, sessionId, cwd, model, role, text, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [_rec.key, _rec.provider, _rec.sessionId, _rec.cwd, _rec.model, _rec.role, _rec.text, _rec.createdAt]
        );
    }

    // _key 기준 시간순(id 오름차순). _limit이 있으면 최신 _limit건을 시간순으로 반환한다.
    public static async List(_key: string, _limit?: number): Promise<ProviderLogRecord[]> {
        const db = await CProviderLog.Init();
        const cols = 'id, key, provider, sessionId, cwd, model, role, text, createdAt';
        const rows = _limit
            ? await db.Recv(`SELECT * FROM (SELECT ${cols} FROM ${CProviderLog.sTable} WHERE key = ? ORDER BY id DESC LIMIT ${Number(_limit)}) ORDER BY id ASC`, [_key])
            : await db.Recv(`SELECT ${cols} FROM ${CProviderLog.sTable} WHERE key = ? ORDER BY id ASC`, [_key]);
        if (rows == null) return [];
        return rows.map(CProviderLog.RowToRecord);
    }

    // 세션(sessionId) 단위 조회 — 한 대화를 통째로 꺼낼 때.
    public static async ListBySession(_sessionId: string): Promise<ProviderLogRecord[]> {
        const db = await CProviderLog.Init();
        const rows = await db.Recv(
            `SELECT id, key, provider, sessionId, cwd, model, role, text, createdAt FROM ${CProviderLog.sTable} WHERE sessionId = ? ORDER BY id ASC`,
            [_sessionId]
        );
        if (rows == null) return [];
        return rows.map(CProviderLog.RowToRecord);
    }

    // 세션 단위로 묶은 최신 세션 목록(최신 대화순). _beforeId를 주면 그 id보다 오래된 세션부터
    // (아코디언 "더 보기"용 커서 페이징). offset은 그 세션의 마지막(가장 큰) id — 다음 페이지 호출 시 그대로 _beforeId로 넘긴다.
    // firstText/cwd는 그 세션의 첫 레코드(id 최소) 기준(작업 디렉토리는 세션 내내 동일하다). time은 마지막 레코드(id 최대) 기준(최근 활동 시각).
    // model은 첫 레코드가 아니라 "model이 채워진 최초 레코드" 기준 — user 메시지에는 model이 없고(assistant 응답에만 기록됨),
    // 첫 레코드는 보통 user 질문이라 그대로 쓰면 항상 빈 값이 나온다.
    public static async ListSessions(_beforeId?: number, _limit = 30): Promise<{ name: string; offset: number; model: string; firstText: string; cwd: string; time: number }[]> {
        const db = await CProviderLog.Init();
        const t = CProviderLog.sTable;
        const group = _beforeId
            ? `SELECT sessionId, MAX(id) AS maxId, MIN(id) AS minId FROM ${t} GROUP BY sessionId HAVING maxId < ? ORDER BY maxId DESC LIMIT ${Number(_limit)}`
            : `SELECT sessionId, MAX(id) AS maxId, MIN(id) AS minId FROM ${t} GROUP BY sessionId ORDER BY maxId DESC LIMIT ${Number(_limit)}`;
        const modelSub = `SELECT t1.sessionId AS sid, t1.model AS model FROM ${t} t1 WHERE t1.model != '' AND t1.id = (SELECT MIN(t2.id) FROM ${t} t2 WHERE t2.sessionId = t1.sessionId AND t2.model != '')`;
        const sql = `SELECT g.sessionId, g.maxId, m.model, f.text, f.cwd, l.createdAt FROM (${group}) g JOIN ${t} f ON f.id = g.minId JOIN ${t} l ON l.id = g.maxId LEFT JOIN (${modelSub}) m ON m.sid = g.sessionId`;
        const rows = await db.Recv(sql, _beforeId ? [_beforeId] : []);
        if (rows == null) return [];
        return rows
            .sort((a, b) => Number(b[1]) - Number(a[1]))
            .map(row => ({
                name: String(row[0]), offset: Number(row[1]), model: String(row[2] ?? ''), firstText: String(row[3]),
                cwd: String(row[4]), time: Number(row[5]),
            }));
    }

    // 세션 단위 삭제 — 아코디언 X 클릭 시 그 세션 기록을 통째로 지운다.
    public static async DeleteSession(_sessionId: string): Promise<void> {
        const db = await CProviderLog.Init();
        await db.Send(`DELETE FROM ${CProviderLog.sTable} WHERE sessionId = ?`, [_sessionId]);
    }

    // 전체 삭제 — 로그 탭 상단 X 클릭 시 모든 세션 기록을 지운다.
    public static async DeleteAll(): Promise<void> {
        const db = await CProviderLog.Init();
        await db.Send(`DELETE FROM ${CProviderLog.sTable}`, []);
    }

    private static RowToRecord(_row: any[]): ProviderLogRecord {
        return {
            id: Number(_row[0]),
            key: String(_row[1]),
            provider: String(_row[2]),
            sessionId: String(_row[3]),
            cwd: String(_row[4]),
            model: String(_row[5]),
            role: String(_row[6]),
            text: String(_row[7]),
            createdAt: Number(_row[8]),
        };
    }

    // ISO8601 → YYYYMMDDHHmmss (다른 테이블(CWorkOrder 등)과 같은 시각 표기).
    // _iso가 없으면(grok처럼 레코드에 시각이 없는 CLI) 현재 시각 — 500ms 폴링이라 오차가 1초 이내다.
    public static Stamp(_iso?: string): number {
        const d = _iso ? new Date(_iso) : new Date();
        const t = isNaN(d.getTime()) ? new Date() : d;
        const p = (v: number) => (v < 10 ? `0${v}` : `${v}`);
        return Number(`${t.getFullYear()}${p(t.getMonth() + 1)}${p(t.getDate())}${p(t.getHours())}${p(t.getMinutes())}${p(t.getSeconds())}`);
    }
}

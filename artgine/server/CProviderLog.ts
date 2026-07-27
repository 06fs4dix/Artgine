import { CORMField, CRDBMS } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';

export type ProviderLogRecord = {
    id: number;
    key: string;        // pty 세션 key(없으면 token) — 라우터가 아는 값
    provider: string;   // claude | grok | codex | opencode | antigravity
    sessionId: string;  // CLI 자체 세션 ID
    cwd: string;        // 워크스페이스
    model: string;      // 모델명
    role: string;       // user | assistant | tool
    text: string;       // 본문(마크다운 원문). tool 행은 ''
    tool: string;       // tool 행: 도구 이름. Q&A는 ''
    file: string;       // tool 행: 대상 경로(없으면 ''). Q&A는 ''
    createdAt: number;  // YYYYMMDDHHmmss
};

// 터미널 세션의 질문/최종답변 + 도구 호출(tool,file만)을 저장하는 provider(CLI)별 대화 로그.
//
// 소스는 화면이 아니라 각 CLI가 직접 남기는 세션 트랜스크립트다(CConversationReader 참조).
// 화면 스크래핑으로는 도구 출력과 답변이 원리적으로 구분되지 않아 폐기했다 — 자세한 이유는 리더 주석에.
// 도구 호출 직전의 중간 멘트("~를 확인하겠습니다")는 저장하지 않는다. 최종 답변만 남긴다.
// tool 행은 result 본문 없이 이름·경로만 남긴다(AI 요약 없음).
export class CProviderLog {
    private static sDB: CRDBMS = null;
    private static sTable = 'provider_log';
    private static readonly sCols = 'id, key, provider, sessionId, cwd, model, role, text, tool, file, createdAt';

    private static async Init(): Promise<CRDBMS> {
        if (CProviderLog.sDB != null) return CProviderLog.sDB;

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

        CProviderLog.sDB = db;
        return db;
    }

    public static async Append(_rec: Omit<ProviderLogRecord, 'id'>): Promise<void> {
        // user/assistant는 본문, tool은 도구 이름이 있어야 저장한다.
        if (_rec.role === 'tool') {
            if (!_rec.tool) return;
        } else if (!_rec.text) {
            return;
        }
        const db = await CProviderLog.Init();
        await db.Send(
            `INSERT INTO ${CProviderLog.sTable} (key, provider, sessionId, cwd, model, role, text, tool, file, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                _rec.key, _rec.provider, _rec.sessionId, _rec.cwd, _rec.model, _rec.role,
                _rec.text ?? '', _rec.tool ?? '', _rec.file ?? '', _rec.createdAt,
            ]
        );
    }

    // _key 기준 시간순(id 오름차순).
    // _afterId: 생략 또는 -1 → 전체(또는 _limit). 0 이상이면 id > _afterId 만(증분 폴링용).
    // _limit: 전체 조회(_afterId < 0)일 때만 적용 — 최신 _limit건을 시간순으로 반환. 증분 조회에는 무시.
    public static async List(_key: string, _afterId: number = -1, _limit?: number): Promise<ProviderLogRecord[]> {
        const db = await CProviderLog.Init();
        const cols = CProviderLog.sCols;
        const afterId = _afterId == null || isNaN(Number(_afterId)) ? -1 : Number(_afterId);
        let rows: any[] | null;
        if (afterId >= 0) {
            rows = await db.Recv(
                `SELECT ${cols} FROM ${CProviderLog.sTable} WHERE key = ? AND id > ? ORDER BY id ASC`,
                [_key, afterId]
            );
        } else if (_limit) {
            rows = await db.Recv(
                `SELECT * FROM (SELECT ${cols} FROM ${CProviderLog.sTable} WHERE key = ? ORDER BY id DESC LIMIT ${Number(_limit)}) ORDER BY id ASC`,
                [_key]
            );
        } else {
            rows = await db.Recv(
                `SELECT ${cols} FROM ${CProviderLog.sTable} WHERE key = ? ORDER BY id ASC`,
                [_key]
            );
        }
        if (rows == null) return [];
        return rows.map(CProviderLog.RowToRecord);
    }

    // 터미널 로그 패널용: key로 직접 붙은 행 + 그 key가 한 번이라도 등장한 CLI sessionId의 전체 행.
    // key 매칭 실패로 key=''인 같은 대화 행도 세션 단위로 함께 나온다(부분 로그만 보이던 문제 해결).
    // _afterId: -1=전체, ≥0 이면 id > _afterId (증분). sessionId 집합은 afterId와 무관하게 key 기준 전체 이력에서 잡는다.
    public static async ListForTerminalKey(_key: string, _afterId: number = -1): Promise<ProviderLogRecord[]> {
        const db = await CProviderLog.Init();
        const t = CProviderLog.sTable;
        const cols = CProviderLog.sCols;
        const afterId = _afterId == null || isNaN(Number(_afterId)) ? -1 : Number(_afterId);
        // key = ? 이거나, (비어 있지 않은 sessionId가 key 소속 세션 집합에 속함)
        const owned = `sessionId != '' AND sessionId IN (SELECT DISTINCT sessionId FROM ${t} WHERE key = ? AND sessionId != '')`;
        const where = afterId >= 0
            ? `WHERE id > ? AND (key = ? OR (${owned}))`
            : `WHERE key = ? OR (${owned})`;
        const params = afterId >= 0 ? [afterId, _key, _key] : [_key, _key];
        const rows = await db.Recv(`SELECT ${cols} FROM ${t} ${where} ORDER BY id ASC`, params);
        if (rows == null) return [];
        return rows.map(CProviderLog.RowToRecord);
    }

    // 세션(sessionId) 단위 조회 — 한 대화를 통째로 꺼낼 때.
    public static async ListBySession(_sessionId: string): Promise<ProviderLogRecord[]> {
        const db = await CProviderLog.Init();
        const rows = await db.Recv(
            `SELECT ${CProviderLog.sCols} FROM ${CProviderLog.sTable} WHERE sessionId = ? ORDER BY id ASC`,
            [_sessionId]
        );
        if (rows == null) return [];
        return rows.map(CProviderLog.RowToRecord);
    }

    // 세션 단위로 묶은 최신 세션 목록(최신 대화순). _beforeId를 주면 그 id보다 오래된 세션부터
    // (아코디언 "더 보기"용 커서 페이징). offset은 그 세션의 마지막(가장 큰) id — 다음 페이지 호출 시 그대로 _beforeId로 넘긴다.
    // firstText/cwd는 그 세션의 첫 user 레코드 기준(tool이 먼저 끼면 제목이 비는 문제 방지). 없으면 min(id) 폴백.
    // time은 마지막 레코드(id 최대) 기준(최근 활동 시각).
    // model은 "model이 채워진 최초 레코드" 기준 — user/tool 메시지에는 model이 없고 assistant 응답에만 기록됨.
    public static async ListSessions(_beforeId?: number, _limit = 30): Promise<{ name: string; offset: number; model: string; firstText: string; cwd: string; time: number }[]> {
        const db = await CProviderLog.Init();
        const t = CProviderLog.sTable;
        const group = _beforeId
            ? `SELECT sessionId, MAX(id) AS maxId, MIN(id) AS minId FROM ${t} GROUP BY sessionId HAVING maxId < ? ORDER BY maxId DESC LIMIT ${Number(_limit)}`
            : `SELECT sessionId, MAX(id) AS maxId, MIN(id) AS minId FROM ${t} GROUP BY sessionId ORDER BY maxId DESC LIMIT ${Number(_limit)}`;
        const modelSub = `SELECT t1.sessionId AS sid, t1.model AS model FROM ${t} t1 WHERE t1.model != '' AND t1.id = (SELECT MIN(t2.id) FROM ${t} t2 WHERE t2.sessionId = t1.sessionId AND t2.model != '')`;
        const firstUserSub = `SELECT t1.sessionId AS sid, t1.text AS text, t1.cwd AS cwd FROM ${t} t1 WHERE t1.role = 'user' AND t1.id = (SELECT MIN(t2.id) FROM ${t} t2 WHERE t2.sessionId = t1.sessionId AND t2.role = 'user')`;
        const sql = `SELECT g.sessionId, g.maxId, m.model, COALESCE(u.text, f.text), COALESCE(u.cwd, f.cwd), l.createdAt FROM (${group}) g JOIN ${t} f ON f.id = g.minId JOIN ${t} l ON l.id = g.maxId LEFT JOIN (${modelSub}) m ON m.sid = g.sessionId LEFT JOIN (${firstUserSub}) u ON u.sid = g.sessionId`;
        const rows = await db.Recv(sql, _beforeId ? [_beforeId] : []);
        if (rows == null) return [];
        return rows
            .sort((a, b) => Number(b[1]) - Number(a[1]))
            .map(row => ({
                name: String(row[0]), offset: Number(row[1]), model: String(row[2] ?? ''), firstText: String(row[3] ?? ''),
                cwd: String(row[4] ?? ''), time: Number(row[5]),
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
            tool: String(_row[8] ?? ''),
            file: String(_row[9] ?? ''),
            createdAt: Number(_row[10]),
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

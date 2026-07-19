import { CORMField, CRDBMS } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';

export type SubAgentRecord = {
    key: string;
    provider: string;
    model: string;
    score: number;
    traits: string[];
    workingDir: string;
    super: number; // 0|1 — 이 에이전트로 세션이 뜰 때 슈퍼 모드(권한 자동 승인)로 시작할지
    retryText: string; // 워크오더가 done으로 끝나고 더 이상 대기 중인 작업이 없을 때 자동으로 반복 지시할 명령
    retryCount: number; // retryText를 자동으로 반복 발주할 최대 횟수(0=사용 안 함)
};

// 터미널 라우터(CTerminalRouter)가 등록·조회·삭제하는 서브 에이전트 카탈로그.
// 이름(key) 기준으로 유일하며, 같은 key로 다시 Set()하면 덮어쓴다(upsert).
export class CSubAgent {
    private static sDB: CRDBMS = null;
    private static sTable = 'sub_agent';

    private static async Init(): Promise<CRDBMS> {
        if (CSubAgent.sDB != null) return CSubAgent.sDB;

        const db = new CSQLite();
        await db.Init();

        // workingDir 컬럼 추가 당시 스키마가 바뀌어 sub_agent_v2로 테이블명을 올렸었다. 이제 구버전
        // sub_agent(workingDir 없음)는 버리고 sub_agent_v2를 표준 이름(sub_agent)으로 되돌려서
        // 테이블이 두 개로 갈라져 있던 상태를 정리한다. sub_agent_v2가 이미 없으면(정리 완료 후 재기동)
        // 아래는 아무 일도 하지 않는다 - 1회성 마이그레이션.
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
            new CORMField('super', 0), // 주의: 값이 양수 정수면 CSQLite가 AUTOINCREMENT PK로 오인하므로 기본값 0 유지 필수
            new CORMField('retryText', ''),
            new CORMField('retryCount', 0),
        ], 'key');

        // super/retryText/retryCount 컬럼 추가 이전에 생성된 기존 테이블 호환: 없으면 채워 넣는다(데이터 보존).
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
        }

        CSubAgent.sDB = db;
        return db;
    }

    public static async List(): Promise<SubAgentRecord[]> {
        const db = await CSubAgent.Init();
        const rows = await db.Recv(`SELECT key, provider, model, score, traits, workingDir, \`super\`, retryText, retryCount FROM ${CSubAgent.sTable} ORDER BY key ASC`);
        if (rows == null) return [];
        return rows.map(CSubAgent.RowToRecord);
    }

    // key가 이미 있으면 덮어쓰고, 없으면 새로 만든다. traits는 항목이 길어질 수 있어 배열로 받아 JSON으로 저장한다.
    public static async Set(_record: SubAgentRecord): Promise<void> {
        const db = await CSubAgent.Init();
        await db.Send(
            `INSERT INTO ${CSubAgent.sTable} (key, provider, model, score, traits, workingDir, \`super\`, retryText, retryCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET provider = excluded.provider, model = excluded.model, score = excluded.score, traits = excluded.traits, workingDir = excluded.workingDir, \`super\` = excluded.\`super\`, retryText = excluded.retryText, retryCount = excluded.retryCount`,
            [_record.key, _record.provider, _record.model, _record.score, JSON.stringify(_record.traits), _record.workingDir || './', _record.super ? 1 : 0, _record.retryText || '', _record.retryCount || 0]
        );
    }

    public static async Delete(_key: string): Promise<boolean> {
        const db = await CSubAgent.Init();
        const rows = await db.Recv(`SELECT key FROM ${CSubAgent.sTable} WHERE key = ?`, [_key]);
        if (rows == null || rows.length === 0) return false;
        await db.Send(`DELETE FROM ${CSubAgent.sTable} WHERE key = ?`, [_key]);
        return true;
    }

    private static RowToRecord(_row: any[]): SubAgentRecord {
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
        };
    }

    private static ParseTraits(_value: any): string[] {
        try {
            const parsed = JSON.parse(String(_value));
            if (Array.isArray(parsed)) return parsed.map(String);
        } catch { /* 구버전 데이터(단일 문자열)는 아래에서 배열 1개로 감싼다 */ }
        const s = String(_value ?? '').trim();
        return s.length > 0 ? [s] : [];
    }
}

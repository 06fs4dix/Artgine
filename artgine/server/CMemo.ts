import { CORMField, CRDBMS } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';
import { CAI } from '../util/CAI.js';

export type MemoRecord = {
    original: string;
    keywords: string[];
    chatTime: number;
    selfOffset: number;
    prevOffset: number;
    nextOffset: number;
    headOffset: number;
    lastActivity: number;
};

export class CMemo {
    private static sDB: CRDBMS = null;
    private static sInit = false;
    private static sRecordTable = 'memo_record';
    private static sKeywordTable = 'memo_keyword_ref';
    private static sLastKeywords: string[] = [];
    private static sLastText: string = '';
    private static sProvider: CAI.eProvider = CAI.eProvider.claude;
    private static sModel: string = 'claude-sonnet-4-6';

    public static async Init(_db: CRDBMS = null): Promise<void> {
        if (_db != null) {
            CMemo.sDB = _db;
            CMemo.sInit = false;
        }

        if (CMemo.sInit) {
            return;
        }

        if (CMemo.sDB == null) {
            const db = new CSQLite();
            db.mDatabase = './db/memo.sqlite';
            await db.Init();
            CMemo.sDB = db;
        }

        await CMemo.CreateTables();
        CMemo.sInit = true;
    }

    public static async Write(
        _original: string,
        _keywords: string[],
        _new: boolean,
        _continueOffset?: number
    ): Promise<void> {
        await CMemo.Init();

        const last = await CMemo.LastRecord();
        const selfOffset = last == null ? 0 : last.selfOffset + 1;
        const record: MemoRecord = {
            original: _original,
            keywords: _keywords,
            chatTime: CMemo.Now(),
            selfOffset,
            prevOffset: 0,
            nextOffset: 0,
            headOffset: selfOffset,
            lastActivity: CMemo.Now(),
        };

        // 연결 여부(_new)는 호출 쪽(Chat)에서 ExtractWriteInfo로 이미 AI 판단을 마친 값이다.
        // continueOffset이 지정되면 그 레코드를, 아니면 직전 전역 레코드(last)를 연결 대상으로 쓴다.
        let linkTarget: MemoRecord = null;
        if (!_new) {
            linkTarget = _continueOffset != null ? await CMemo.GetRecord(_continueOffset) : last;
        }

        try {
            await CMemo.sDB.Send('BEGIN TRANSACTION');

            if (linkTarget != null) {
                record.prevOffset = linkTarget.selfOffset - record.selfOffset;
                record.headOffset = linkTarget.prevOffset === 0 ? linkTarget.selfOffset : linkTarget.headOffset;
                await CMemo.UpdateNextOffset(linkTarget.selfOffset, record.selfOffset - linkTarget.selfOffset);
                await CMemo.UpdateLastActivity(record.headOffset, record.chatTime);
            }

            await CMemo.InsertRecord(record);
            await CMemo.InsertKeywords(record);
            await CMemo.sDB.Send('COMMIT');
        } catch (err) {
            await CMemo.sDB.Send('ROLLBACK');
            throw err;
        }
    }

    public static async Read(_keywords: string[], _startTime: number, _endTime: number): Promise<string[]> {
        await CMemo.Init();

        const offsets = await CMemo.FindOffsets(_keywords, _startTime, _endTime);
        const groups: MemoRecord[][] = [];

        for (const offset of offsets) {
            const recordMap = new Map<number, MemoRecord>();
            await CMemo.PushLinked(recordMap, offset);
            const group = Array.from(recordMap.values())
                .sort((a, b) => a.selfOffset - b.selfOffset);
            groups.push(group);
        }

        const merged = CMemo.MergeGroups(groups);
        return merged.map(group => group.map(record => `[${CMemo.FormatTime(record.chatTime)}] ${record.original}`).join('\n'));
    }

    public static async Chat(_text: string, _write: boolean | null = true, _provider?: CAI.eProvider, _model?: string, _continueOffset?: number): Promise<string> {
        // auto 모드: AI 호출 없이 물음표 포함 여부로 단순 판단한다 (있으면 검색, 없으면 저장).
        if (_write === null) {
            _write = !_text.includes('?') && !_text.includes('？');
        }

        const hashtags = CMemo.ExtractHashtags(_text);

        if (_write) {
            let continueTarget: { text: string; keywords: string[] } | undefined;
            if (_continueOffset != null) {
                const target = await CMemo.GetRecord(_continueOffset);
                if (target != null) {
                    continueTarget = { text: target.original, keywords: target.keywords };
                }
            }

            const info = await CMemo.ExtractWriteInfo(_text, continueTarget, _provider, _model);
            const keywords = CMemo.UniqueKeywords([...info.keywords, ...hashtags]);
            // continueOffset이 명시되면 호출 쪽의 명시적 의도(특정 대화에 이어쓰기)이므로
            // AI의 new 판단과 무관하게 항상 연결한다.
            const isNew = continueTarget == null
                ? (CMemo.sLastKeywords.length === 0 || info.new)
                : false;
            await CMemo.Write(_text, keywords, isNew, _continueOffset);
            CMemo.sLastKeywords = keywords;
            CMemo.sLastText = _text;
            return 'saved';
        }

        const now = CMemo.Now();
        const monthAgo = CMemo.AddMonthTime(-1);
        const info = await CMemo.ExtractReadInfo(_text, monthAgo, now, _provider, _model);
        const keywords = CMemo.UniqueKeywords([...info.keywords, ...hashtags]);
        const groups = await CMemo.Read(keywords, info.startTime, info.endTime);
        if (groups.length === 0) {
            return '관련 메모가 없습니다.';
        }
        return await CMemo.BuildAnswer(_text, groups, _provider, _model);
    }

    // 헤드 여부와 관계없이 전체 레코드 중 작성 시각(chatTime) 기준 최근 n개를 반환한다.
    public static async ListRecent(_n: number): Promise<MemoRecord[]> {
        await CMemo.Init();

        const rows = await CMemo.sDB.Recv(
            `SELECT original, chatTime, selfOffset, prevOffset, nextOffset, headOffset, lastActivity FROM ${CMemo.sRecordTable} ORDER BY chatTime DESC LIMIT ?`,
            [_n]
        );
        if (rows == null) {
            return [];
        }

        const records: MemoRecord[] = [];
        for (const row of rows) {
            records.push(await CMemo.RowToRecord(row));
        }
        return records;
    }

    // 특정 오프셋이 속한 체인 전체를 selfOffset 오름차순으로 반환한다.
    public static async GetChain(_selfOffset: number): Promise<MemoRecord[]> {
        await CMemo.Init();

        const map = new Map<number, MemoRecord>();
        await CMemo.PushLinked(map, _selfOffset);
        return Array.from(map.values()).sort((a, b) => a.selfOffset - b.selfOffset);
    }

    // 레코드와 키워드를 삭제하고, 체인 중간이 끊기지 않도록 앞뒤 레코드를 재연결한다.
    // 헤드가 삭제되면 다음 레코드가 새 헤드가 되며, 체인 전체의 headOffset을 새 헤드로 갱신한다.
    public static async Delete(_selfOffset: number): Promise<boolean> {
        await CMemo.Init();

        const record = await CMemo.GetRecord(_selfOffset);
        if (record == null) {
            return false;
        }

        const prevAbs = record.prevOffset !== 0 ? record.selfOffset + record.prevOffset : null;
        const nextAbs = record.nextOffset !== 0 ? record.selfOffset + record.nextOffset : null;

        try {
            await CMemo.sDB.Send('BEGIN TRANSACTION');

            await CMemo.sDB.Send(`DELETE FROM ${CMemo.sKeywordTable} WHERE selfOffset = ?`, [_selfOffset]);
            await CMemo.sDB.Send(`DELETE FROM ${CMemo.sRecordTable} WHERE selfOffset = ?`, [_selfOffset]);

            if (prevAbs != null && nextAbs != null) {
                await CMemo.UpdateNextOffset(prevAbs, nextAbs - prevAbs);
                await CMemo.UpdatePrevOffset(nextAbs, prevAbs - nextAbs);
            } else if (prevAbs != null) {
                await CMemo.UpdateNextOffset(prevAbs, 0);
            } else if (nextAbs != null) {
                await CMemo.UpdatePrevOffset(nextAbs, 0);
                await CMemo.RelinkChainHead(nextAbs, record.lastActivity);
            }

            await CMemo.sDB.Send('COMMIT');
            return true;
        } catch (err) {
            await CMemo.sDB.Send('ROLLBACK');
            throw err;
        }
    }

    private static async CreateTables(): Promise<void> {
        await CMemo.sDB.CreateCollection(CMemo.sRecordTable, [
            new CORMField('selfOffset', 0),
            new CORMField('original', ''),
            new CORMField('chatTime', 0),
            new CORMField('prevOffset', 0),
            new CORMField('nextOffset', 0),
            new CORMField('headOffset', 0),
            new CORMField('lastActivity', 0),
        ], 'selfOffset');

        await CMemo.sDB.CreateCollection(CMemo.sKeywordTable, [
            new CORMField('keyword', ''),
            new CORMField('selfOffset', 0),
            new CORMField('chatTime', 0),
        ], 'keyword,selfOffset');

        // 기존에 만들어진 DB에는 headOffset/lastActivity 컬럼이 없으므로 마이그레이션으로 추가한다.
        // 이미 컬럼이 있으면(신규 DB) ALTER가 실패하므로 무시한다.
        try { await CMemo.sDB.Send(`ALTER TABLE ${CMemo.sRecordTable} ADD COLUMN headOffset INTEGER NOT NULL DEFAULT 0`); } catch { /* 컬럼 이미 존재 */ }
        try { await CMemo.sDB.Send(`ALTER TABLE ${CMemo.sRecordTable} ADD COLUMN lastActivity INTEGER NOT NULL DEFAULT 0`); } catch { /* 컬럼 이미 존재 */ }

        await CMemo.sDB.Send(`CREATE INDEX IF NOT EXISTS idx_${CMemo.sRecordTable}_chatTime ON ${CMemo.sRecordTable} (chatTime)`);
        await CMemo.sDB.Send(`CREATE INDEX IF NOT EXISTS idx_${CMemo.sKeywordTable}_keyword_time ON ${CMemo.sKeywordTable} (keyword, chatTime)`);
        await CMemo.sDB.Send(`CREATE INDEX IF NOT EXISTS idx_${CMemo.sKeywordTable}_selfOffset ON ${CMemo.sKeywordTable} (selfOffset)`);
        await CMemo.sDB.Send(`CREATE INDEX IF NOT EXISTS idx_${CMemo.sRecordTable}_prevOffset_lastActivity ON ${CMemo.sRecordTable} (prevOffset, lastActivity)`);
    }

    private static async LastRecord(): Promise<MemoRecord> {
        const rows = await CMemo.sDB.Recv(
            `SELECT original, chatTime, selfOffset, prevOffset, nextOffset, headOffset, lastActivity FROM ${CMemo.sRecordTable} ORDER BY selfOffset DESC LIMIT 1`
        );
        if (rows == null || rows.length === 0) {
            return null;
        }

        return await CMemo.RowToRecord(rows[0]);
    }

    private static async FindOffsets(_keywords: string[], _startTime: number, _endTime: number): Promise<number[]> {
        const keywords = CMemo.UniqueKeywords(_keywords);
        let rows: any[][];

        if (keywords.length === 0) {
            rows = await CMemo.sDB.Recv(
                `SELECT selfOffset FROM ${CMemo.sRecordTable} WHERE chatTime >= ? AND chatTime <= ? ORDER BY selfOffset ASC`,
                [_startTime, _endTime]
            );
        } else {
            // 저장/검색 시 복합어 분리 토큰화가 어긋날 수 있어(예: "기지건설" vs "기지"+"건설"),
            // 완전일치 대신 양방향 부분 포함(LIKE)으로 매칭한다.
            const conditions = keywords.map(() => `(keyword LIKE '%' || ? || '%' OR ? LIKE '%' || keyword || '%')`).join(' OR ');
            const params: string[] = [];
            for (const keyword of keywords) {
                params.push(keyword, keyword);
            }
            rows = await CMemo.sDB.Recv(
                `SELECT DISTINCT selfOffset FROM ${CMemo.sKeywordTable} WHERE chatTime >= ? AND chatTime <= ? AND (${conditions}) ORDER BY selfOffset ASC`,
                [_startTime, _endTime, ...params]
            );
        }

        if (rows == null) {
            return [];
        }

        return rows.map(row => Number(row[0]));
    }

    private static async PushLinked(_map: Map<number, MemoRecord>, _selfOffset: number): Promise<void> {
        const record = await CMemo.GetRecord(_selfOffset);
        if (record == null || _map.has(record.selfOffset)) {
            return;
        }

        _map.set(record.selfOffset, record);

        if (record.prevOffset !== 0) {
            await CMemo.PushLinked(_map, record.selfOffset + record.prevOffset);
        }
        if (record.nextOffset !== 0) {
            await CMemo.PushLinked(_map, record.selfOffset + record.nextOffset);
        }
    }

    private static async GetRecord(_selfOffset: number): Promise<MemoRecord> {
        const rows = await CMemo.sDB.Recv(
            `SELECT original, chatTime, selfOffset, prevOffset, nextOffset, headOffset, lastActivity FROM ${CMemo.sRecordTable} WHERE selfOffset = ? LIMIT 1`,
            [_selfOffset]
        );
        if (rows == null || rows.length === 0) {
            return null;
        }

        return await CMemo.RowToRecord(rows[0]);
    }

    private static async RowToRecord(_row: any[]): Promise<MemoRecord> {
        const selfOffset = Number(_row[2]);
        return {
            original: String(_row[0]),
            keywords: await CMemo.GetKeywords(selfOffset),
            chatTime: Number(_row[1]),
            selfOffset,
            prevOffset: Number(_row[3]),
            nextOffset: Number(_row[4]),
            headOffset: Number(_row[5]),
            lastActivity: Number(_row[6]),
        };
    }

    private static async GetKeywords(_selfOffset: number): Promise<string[]> {
        const rows = await CMemo.sDB.Recv(
            `SELECT keyword FROM ${CMemo.sKeywordTable} WHERE selfOffset = ? ORDER BY keyword ASC`,
            [_selfOffset]
        );
        if (rows == null) {
            return [];
        }

        return rows.map(row => String(row[0]));
    }

    private static async InsertRecord(_record: MemoRecord): Promise<void> {
        await CMemo.sDB.Send(
            `INSERT INTO ${CMemo.sRecordTable} (selfOffset, original, chatTime, prevOffset, nextOffset, headOffset, lastActivity) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [_record.selfOffset, _record.original, _record.chatTime, _record.prevOffset, _record.nextOffset, _record.headOffset, _record.lastActivity]
        );
    }

    private static async InsertKeywords(_record: MemoRecord): Promise<void> {
        for (const keyword of CMemo.UniqueKeywords(_record.keywords)) {
            await CMemo.sDB.Send(
                `INSERT INTO ${CMemo.sKeywordTable} (keyword, selfOffset, chatTime) VALUES (?, ?, ?)`,
                [keyword, _record.selfOffset, _record.chatTime]
            );
        }
    }

    private static async UpdateNextOffset(_selfOffset: number, _nextOffset: number): Promise<void> {
        await CMemo.sDB.Send(
            `UPDATE ${CMemo.sRecordTable} SET nextOffset = ? WHERE selfOffset = ?`,
            [_nextOffset, _selfOffset]
        );
    }

    private static async UpdatePrevOffset(_selfOffset: number, _prevOffset: number): Promise<void> {
        await CMemo.sDB.Send(
            `UPDATE ${CMemo.sRecordTable} SET prevOffset = ? WHERE selfOffset = ?`,
            [_prevOffset, _selfOffset]
        );
    }

    // 헤드가 삭제되어 새 헤드(_newHead)로 바뀐 경우, 체인 전체의 headOffset과 lastActivity를 갱신한다.
    private static async RelinkChainHead(_newHead: number, _lastActivity: number): Promise<void> {
        const map = new Map<number, MemoRecord>();
        await CMemo.PushLinked(map, _newHead);

        for (const selfOffset of map.keys()) {
            await CMemo.sDB.Send(
                `UPDATE ${CMemo.sRecordTable} SET headOffset = ? WHERE selfOffset = ?`,
                [_newHead, selfOffset]
            );
        }
        await CMemo.UpdateLastActivity(_newHead, _lastActivity);
    }

    // 체인의 헤드 레코드에 체인 내 최신 활동 시각을 갱신한다. List에서 체인 정렬 기준으로 사용.
    private static async UpdateLastActivity(_headOffset: number, _lastActivity: number): Promise<void> {
        await CMemo.sDB.Send(
            `UPDATE ${CMemo.sRecordTable} SET lastActivity = ? WHERE selfOffset = ?`,
            [_lastActivity, _headOffset]
        );
    }

    private static Now(): number {
        return CMemo.DateToTime(new Date());
    }

    private static DateToTime(_date: Date): number {
        const year = _date.getFullYear();
        const month = CMemo.Pad2(_date.getMonth() + 1);
        const day = CMemo.Pad2(_date.getDate());
        const hour = CMemo.Pad2(_date.getHours());
        const minute = CMemo.Pad2(_date.getMinutes());
        const second = CMemo.Pad2(_date.getSeconds());
        return Number(`${year}${month}${day}${hour}${minute}${second}`);
    }

    private static AddMonthTime(_month: number): number {
        const date = new Date();
        date.setMonth(date.getMonth() + _month);
        return CMemo.DateToTime(date);
    }

    private static Pad2(_value: number): string {
        return _value < 10 ? `0${_value}` : `${_value}`;
    }

    private static FormatTime(_time: number): string {
        const s = String(_time).padStart(14, '0');
        return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}`;
    }

    private static MergeGroups(_groups: MemoRecord[][]): MemoRecord[][] {
        const offsetToIndex = new Map<number, number>();
        const result: MemoRecord[][] = [];

        for (const group of _groups) {
            let targetIndex = -1;
            for (const record of group) {
                if (offsetToIndex.has(record.selfOffset)) {
                    targetIndex = offsetToIndex.get(record.selfOffset)!;
                    break;
                }
            }

            if (targetIndex >= 0) {
                const target = result[targetIndex];
                for (const record of group) {
                    if (!offsetToIndex.has(record.selfOffset)) {
                        target.push(record);
                        offsetToIndex.set(record.selfOffset, targetIndex);
                    }
                }
                target.sort((a, b) => a.selfOffset - b.selfOffset);
            } else {
                const newIndex = result.length;
                result.push([...group]);
                for (const record of group) {
                    offsetToIndex.set(record.selfOffset, newIndex);
                }
            }
        }

        return result;
    }

    private static UniqueKeywords(_keywords: string[]): string[] {
        const set = new Set<string>();
        for (const keyword of _keywords) {
            const key = keyword.trim();
            if (key.length > 0) {
                set.add(key);
            }
        }
        return Array.from(set);
    }

    // "#키워드"처럼 #으로 시작하는 토큰을 띄어쓰기 기준으로 뽑아 강제 키워드로 쓴다.
    private static ExtractHashtags(_text: string): string[] {
        const matches = _text.match(/#\S+/g);
        if (matches == null) {
            return [];
        }
        return matches.map(tag => tag.slice(1)).filter(tag => tag.length > 0);
    }

    private static async ExtractWriteInfo(
        _text: string,
        _continueTarget?: { text: string; keywords: string[] },
        _provider?: CAI.eProvider,
        _model?: string
    ): Promise<{ keywords: string[]; new: boolean }> {
        const now = CMemo.Now();
        const lines = [
            '너는 메모 저장 전처리기다.',
            '사용자 문장에서 키워드를 추출하고, 새 대화 흐름인지 판단해라.',
            '반드시 JSON만 출력해라. 마크다운, 설명, 코드블록 금지.',
            '스키마: {"keywords":["키워드"],"new":true}',
            '키워드는 단어 단위로 추출해라.',
            '어제/오늘/지난주처럼 날짜·시간을 가리키는 표현은 키워드에 넣지 마라.',
            '문장이 아직 끝나지 않은 할일·확인 필요·작업 예정 등을 나타내면 키워드 목록에 "TODO"를 추가해라.',
            '`new`는 이전 대화와 연결하지 않을 새 주제면 true, 직전 대화의 연장이면 false다.',
        ];
        // continueOffset으로 지정된 타겟이 있으면 그 레코드를, 없으면 가장 최근 대화를 "이전 대화"로 비교한다.
        const hasPrev = _continueTarget != null || CMemo.sLastKeywords.length > 0;
        if (hasPrev) {
            const prevText = _continueTarget?.text ?? CMemo.sLastText;
            const prevKeywords = _continueTarget?.keywords ?? CMemo.sLastKeywords;
            lines.push(`이전 대화: ${JSON.stringify(prevText)}`);
            lines.push(`이전 대화 키워드: ${JSON.stringify(prevKeywords)}`);
        }
        lines.push(`현재 시간 숫자: ${now}`);
        lines.push(`문장: ${JSON.stringify(_text)}`);
        return CMemo.ParseJson(await CMemo.RunCAI(lines.join('\n'), _provider, _model), { keywords: [_text], new: true });
    }

    private static async ExtractReadInfo(_text: string, _defaultStart: number, _defaultEnd: number, _provider?: CAI.eProvider, _model?: string): Promise<{ keywords: string[]; startTime: number; endTime: number }> {
        const now = CMemo.Now();
        const prompt = [
            '너는 메모 검색 전처리기다.',
            '사용자 요청에서 검색 키워드와 날짜 범위를 추출해라.',
            '반드시 JSON만 출력해라. 마크다운, 설명, 코드블록 금지.',
            '키워드는 단어 단위로 추출해라.',
            '어제/오늘/지난주처럼 날짜·시간을 가리키는 표현은 키워드에 넣지 말고 날짜 범위 변환에만 써라.',
            '요청이 남은 할일·해야할 작업·확인 필요한 것을 묻는 질문이면 키워드 목록에 "TODO"를 추가해라.',
            '시간은 YYYYMMDDHHmmss 숫자로 출력해라.',
            `날짜 정보가 없으면 startTime=${_defaultStart}, endTime=${_defaultEnd}를 사용해라.`,
            '스키마: {"keywords":["키워드"],"startTime":20260101000000,"endTime":20260131235959}',
            `현재 시간 숫자: ${now}`,
            `요청: ${JSON.stringify(_text)}`,
        ].join('\n');
        return CMemo.ParseJson(await CMemo.RunCAI(prompt, _provider, _model), { keywords: [_text], startTime: _defaultStart, endTime: _defaultEnd });
    }

    private static async BuildAnswer(_request: string, _groups: string[], _provider?: CAI.eProvider, _model?: string): Promise<string> {
        const prompt = [
            '너는 메모 읽기 응답 생성기다.',
            '아래 메모 그룹들 중 사용자 요청과 관련 있는 그룹만 근거로 짧고 자연스럽게 답해라.',
            '관련 없는 메모 그룹은 답변에 쓰지 말고 무시해라.',
            '각 줄 맨 앞 [YYYY-MM-DD HH:mm:ss]는 그 메모를 작성한 시각이다. 질문이 시점을 묻는다면 이 시각을 답에 포함해라.',
            '없는 내용은 지어내지 마라.',
            `요청: ${JSON.stringify(_request)}`,
            '메모 그룹:',
            ..._groups.map((g, i) => `[${i}]\n${g}`),
        ].join('\n');
        const answer = (await CMemo.RunCAI(prompt, _provider, _model)).trim();
        return answer.length > 0 ? answer : _groups.join('\n');
    }

    private static async RunCAI(_prompt: string, _provider?: CAI.eProvider, _model?: string): Promise<string> {
        const provider = _provider ?? CMemo.sProvider;
        const model = _model ?? CMemo.sModel;
        const { text } = await CAI.Chat(provider, model, process.cwd(), _prompt, false);
        return text.trim();
    }

    private static ParseJson<T>(_text: string, _fallback: T): T {
        const json = CMemo.ExtractJson(_text);
        if (json == null) {
            return _fallback;
        }
        try {
            return JSON.parse(json) as T;
        } catch {
            return _fallback;
        }
    }

    private static ExtractJson(_text: string): string | null {
        const start = _text.indexOf('{');
        const end = _text.lastIndexOf('}');
        if (start < 0 || end < start) {
            return null;
        }
        return _text.substring(start, end + 1);
    }
}

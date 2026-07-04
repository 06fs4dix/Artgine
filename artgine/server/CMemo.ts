import { CORMField, CRDBMS } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';
import { CAI } from '../util/CAI.js';

export type CategoryRecord = {
    id: number;
    parentId: number;
    name: string;
};

export type DataRecord = {
    id: number;
    categoryId: number;
    content: string;
    tags: string[];
    date: number;
};

export class CMemo {
    private static sDB: CRDBMS = null;
    private static sInit = false;
    private static sCategoryTable = 'memo_category';
    private static sDataTable = 'memo_data';
    private static sDataTagTable = 'memo_data_tag_ref';
    private static sDeletedTable = 'memo_data_deleted';
    private static sCategoryTagTable = 'memo_category_tag';
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

    // ==================================================================
    // 카테고리 CRUD
    // ==================================================================

    public static async ListCategories(): Promise<CategoryRecord[]> {
        await CMemo.Init();

        const rows = await CMemo.sDB.Recv(
            `SELECT id, parentId, name FROM ${CMemo.sCategoryTable} ORDER BY id ASC`
        );
        if (rows == null) {
            return [];
        }
        return rows.map(row => CMemo.RowToCategory(row));
    }

    public static async AddCategory(_name: string, _parentId: number): Promise<CategoryRecord> {
        await CMemo.Init();

        await CMemo.sDB.Send(
            `INSERT INTO ${CMemo.sCategoryTable} (parentId, name) VALUES (?, ?)`,
            [_parentId, _name]
        );
        // 단일 프로세스/저동시성 관리 도구라 lastInsertRowId 없이도 충분하다(CSQLite.Send가 결과를 반환하지 않음).
        const rows = await CMemo.sDB.Recv(
            `SELECT id, parentId, name FROM ${CMemo.sCategoryTable} ORDER BY id DESC LIMIT 1`
        );
        return CMemo.RowToCategory(rows[0]);
    }

    // 카테고리와 그 하위 카테고리 전부, 그 아래 딸린 데이터까지 함께 삭제한다.
    // 데이터는 memo_data_deleted에 먼저 기록한 뒤 삭제하는 soft-delete 감사 로그 패턴을 유지한다.
    public static async DeleteCategory(_id: number): Promise<{ deletedCategoryIds: number[]; deletedDataCount: number }> {
        await CMemo.Init();

        const all = await CMemo.ListCategories();
        const ids = CMemo.CollectDescendantIds(_id, all);
        if (ids.length === 0) {
            return { deletedCategoryIds: [], deletedDataCount: 0 };
        }

        let deletedDataCount = 0;
        try {
            await CMemo.sDB.Send('BEGIN TRANSACTION');

            for (const categoryId of ids) {
                const dataRows = await CMemo.sDB.Recv(
                    `SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE categoryId = ?`,
                    [categoryId]
                );
                if (dataRows == null) {
                    continue;
                }
                for (const row of dataRows) {
                    const dataId = Number(row[0]);
                    await CMemo.sDB.Send(
                        `INSERT INTO ${CMemo.sDeletedTable} (dataId, categoryId, content, date, deletedTime) VALUES (?, ?, ?, ?, ?)`,
                        [dataId, Number(row[1]), String(row[2]), Number(row[3]), CMemo.Now()]
                    );
                    await CMemo.sDB.Send(`DELETE FROM ${CMemo.sDataTagTable} WHERE dataId = ?`, [dataId]);
                    await CMemo.sDB.Send(`DELETE FROM ${CMemo.sDataTable} WHERE id = ?`, [dataId]);
                    deletedDataCount++;
                }
            }

            const placeholders = ids.map(() => '?').join(',');
            await CMemo.sDB.Send(`DELETE FROM ${CMemo.sCategoryTagTable} WHERE categoryId IN (${placeholders})`, ids);
            await CMemo.sDB.Send(`DELETE FROM ${CMemo.sCategoryTable} WHERE id IN (${placeholders})`, ids);

            await CMemo.sDB.Send('COMMIT');
        } catch (err) {
            await CMemo.sDB.Send('ROLLBACK');
            throw err;
        }

        return { deletedCategoryIds: ids, deletedDataCount };
    }

    // ==================================================================
    // 카테고리 태그 - 메모 하나하나가 아니라 카테고리 자체에 붙는 라벨.
    // 검색 시 그 카테고리(+모든 하위 카테고리)에 속한 메모는 이 태그와 매칭된 것으로 취급한다.
    // ==================================================================

    public static async ListCategoryTags(_categoryId: number): Promise<string[]> {
        await CMemo.Init();

        const rows = await CMemo.sDB.Recv(
            `SELECT tag FROM ${CMemo.sCategoryTagTable} WHERE categoryId = ? ORDER BY tag ASC`,
            [_categoryId]
        );
        if (rows == null) {
            return [];
        }
        return rows.map(row => String(row[0]));
    }

    // 카테고리 트리를 그릴 때(사이드바) 카테고리별 태그를 한 번에 보여주기 위한 전체 목록.
    public static async ListAllCategoryTags(): Promise<{ categoryId: number; tag: string }[]> {
        await CMemo.Init();

        const rows = await CMemo.sDB.Recv(`SELECT categoryId, tag FROM ${CMemo.sCategoryTagTable} ORDER BY categoryId ASC, tag ASC`);
        if (rows == null) {
            return [];
        }
        return rows.map(row => ({ categoryId: Number(row[0]), tag: String(row[1]) }));
    }

    public static async AddCategoryTag(_categoryId: number, _tag: string): Promise<void> {
        await CMemo.Init();

        const tag = _tag.trim();
        if (tag.length === 0) {
            return;
        }
        const existing = await CMemo.sDB.Recv(
            `SELECT 1 FROM ${CMemo.sCategoryTagTable} WHERE categoryId = ? AND tag = ? LIMIT 1`,
            [_categoryId, tag]
        );
        if (existing != null && existing.length > 0) {
            return;
        }
        await CMemo.sDB.Send(
            `INSERT INTO ${CMemo.sCategoryTagTable} (categoryId, tag) VALUES (?, ?)`,
            [_categoryId, tag]
        );
    }

    public static async RemoveCategoryTag(_categoryId: number, _tag: string): Promise<void> {
        await CMemo.Init();

        await CMemo.sDB.Send(
            `DELETE FROM ${CMemo.sCategoryTagTable} WHERE categoryId = ? AND tag = ?`,
            [_categoryId, _tag]
        );
    }

    // 검색 태그와 매칭되는 카테고리 태그를 가진 카테고리들을, 하위 카테고리까지 포함해 전부 모은다.
    // 완전일치를 우선하고, 완전일치가 하나도 없을 때만 부분 포함(양방향)으로 확장한다(짧고 흔한 태그의 오매칭 방지).
    private static async FindTaggedCategoryIds(_tags: string[]): Promise<number[]> {
        if (_tags.length === 0) {
            return [];
        }

        const rows = await CMemo.sDB.Recv(`SELECT categoryId, tag FROM ${CMemo.sCategoryTagTable}`);
        if (rows == null || rows.length === 0) {
            return [];
        }

        const matchedCategoryIds = new Set<number>();
        for (const row of rows) {
            const categoryId = Number(row[0]);
            const categoryTag = String(row[1]).toLowerCase();
            for (const tag of _tags) {
                if (categoryTag === tag.toLowerCase()) {
                    matchedCategoryIds.add(categoryId);
                    break;
                }
            }
        }
        if (matchedCategoryIds.size === 0) {
            for (const row of rows) {
                const categoryId = Number(row[0]);
                const categoryTag = String(row[1]).toLowerCase();
                for (const tag of _tags) {
                    const t = tag.toLowerCase();
                    if (categoryTag.includes(t) || t.includes(categoryTag)) {
                        matchedCategoryIds.add(categoryId);
                        break;
                    }
                }
            }
        }
        if (matchedCategoryIds.size === 0) {
            return [];
        }

        const all = await CMemo.ListCategories();
        const result = new Set<number>();
        for (const categoryId of matchedCategoryIds) {
            for (const id of CMemo.CollectDescendantIds(categoryId, all)) {
                result.add(id);
            }
        }
        return Array.from(result);
    }

    // ==================================================================
    // 데이터(메모) CRUD - 카테고리별 플랫 리스트. 서로 연결(체인/이어쓰기)되지 않는다.
    // ==================================================================

    public static async AddData(_categoryId: number, _content: string, _provider?: CAI.eProvider, _model?: string): Promise<DataRecord> {
        await CMemo.Init();

        const hashtags = CMemo.ExtractHashtags(_content);
        const manualTodo = CMemo.DetectTodoTag(_content);
        const info = await CMemo.ExtractWriteInfo(_content, _provider, _model);
        const tags = CMemo.UniqueTags([...info.tags, ...hashtags, ...manualTodo]);
        const content = CMemo.StripHashtags(_content);
        const date = CMemo.Now();

        try {
            await CMemo.sDB.Send('BEGIN TRANSACTION');

            await CMemo.sDB.Send(
                `INSERT INTO ${CMemo.sDataTable} (categoryId, content, date) VALUES (?, ?, ?)`,
                [_categoryId, content, date]
            );
            const rows = await CMemo.sDB.Recv(
                `SELECT id FROM ${CMemo.sDataTable} WHERE categoryId = ? AND date = ? ORDER BY id DESC LIMIT 1`,
                [_categoryId, date]
            );
            const id = Number(rows[0][0]);
            await CMemo.InsertTags(id, date, tags);

            await CMemo.sDB.Send('COMMIT');
            return { id, categoryId: _categoryId, content, tags, date };
        } catch (err) {
            await CMemo.sDB.Send('ROLLBACK');
            throw err;
        }
    }

    public static async ListData(_categoryId: number): Promise<DataRecord[]> {
        await CMemo.Init();

        const rows = await CMemo.sDB.Recv(
            `SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE categoryId = ? ORDER BY date DESC, id DESC`,
            [_categoryId]
        );
        if (rows == null) {
            return [];
        }

        const records: DataRecord[] = [];
        for (const row of rows) {
            records.push(await CMemo.RowToData(row));
        }
        return records;
    }

    // 카테고리 구분 없이 전체에서 최신 N개(사이드바 "타임" 탭용).
    public static async ListRecentData(_limit: number): Promise<DataRecord[]> {
        await CMemo.Init();

        const rows = await CMemo.sDB.Recv(
            `SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} ORDER BY date DESC, id DESC LIMIT ?`,
            [_limit]
        );
        if (rows == null) {
            return [];
        }

        const records: DataRecord[] = [];
        for (const row of rows) {
            records.push(await CMemo.RowToData(row));
        }
        return records;
    }

    public static async DeleteData(_id: number): Promise<boolean> {
        await CMemo.Init();

        const rows = await CMemo.sDB.Recv(
            `SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE id = ? LIMIT 1`,
            [_id]
        );
        if (rows == null || rows.length === 0) {
            return false;
        }
        const id = Number(rows[0][0]);
        const categoryId = Number(rows[0][1]);
        const content = String(rows[0][2]);
        const date = Number(rows[0][3]);

        try {
            await CMemo.sDB.Send('BEGIN TRANSACTION');

            await CMemo.sDB.Send(
                `INSERT INTO ${CMemo.sDeletedTable} (dataId, categoryId, content, date, deletedTime) VALUES (?, ?, ?, ?, ?)`,
                [id, categoryId, content, date, CMemo.Now()]
            );
            await CMemo.sDB.Send(`DELETE FROM ${CMemo.sDataTagTable} WHERE dataId = ?`, [id]);
            await CMemo.sDB.Send(`DELETE FROM ${CMemo.sDataTable} WHERE id = ?`, [id]);

            await CMemo.sDB.Send('COMMIT');
            return true;
        } catch (err) {
            await CMemo.sDB.Send('ROLLBACK');
            throw err;
        }
    }

    // ==================================================================
    // 검색
    // ==================================================================

    // _categoryId가 null이면 전체 검색, 지정되면 그 카테고리로만 필터링한다.
    public static async Search(_text: string, _categoryId: number | null, _provider?: CAI.eProvider, _model?: string): Promise<string> {
        await CMemo.Init();

        const records = await CMemo.FindMatchingData(_text, _categoryId, _provider, _model);
        if (records.length === 0) {
            return '관련 메모가 없습니다.';
        }

        const lines = records.map(r => `[${r.id}][${CMemo.FormatTime(r.date)}] ${r.content}`);
        return lines.join('\n');
    }

    // 설명(자연어)으로 삭제 후보를 찾기만 한다(실제 삭제는 하지 않음) - 클라이언트가 확인(confirm) 후
    // 각 id에 대해 DeleteData를 호출하는 2단계 흐름을 위한 것.
    public static async FindByDescription(_text: string, _categoryId: number | null, _provider?: CAI.eProvider, _model?: string): Promise<DataRecord[]> {
        await CMemo.Init();
        return await CMemo.FindMatchingData(_text, _categoryId, _provider, _model);
    }

    private static async FindMatchingData(_text: string, _categoryId: number | null, _provider?: CAI.eProvider, _model?: string): Promise<DataRecord[]> {
        const now = CMemo.Now();
        const monthAgo = CMemo.AddMonthTime(-1);
        const hashtags = CMemo.ExtractHashtags(_text);
        const manualTodo = CMemo.DetectTodoTag(_text);
        const info = await CMemo.ExtractReadInfo(_text, monthAgo, now, _provider, _model);
        const tags = CMemo.UniqueTags([...info.tags, ...hashtags, ...manualTodo]);

        const ids = await CMemo.FindDataIds(tags, info.startTime, info.endTime, _categoryId, info.hasExplicitDate);
        const records: DataRecord[] = [];
        for (const id of ids) {
            const rows = await CMemo.sDB.Recv(
                `SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE id = ? LIMIT 1`,
                [id]
            );
            if (rows == null || rows.length === 0) {
                continue;
            }
            records.push(await CMemo.RowToData(rows[0]));
        }
        return records;
    }

    // ==================================================================
    // 테이블 생성
    // ==================================================================

    private static async CreateTables(): Promise<void> {
        // 구 체인(offset 연결) 스키마 및 "키워드" 시절 테이블명은 마이그레이션 없이 완전히 폐기한다.
        await CMemo.sDB.Send(`DROP TABLE IF EXISTS memo_record`);
        await CMemo.sDB.Send(`DROP TABLE IF EXISTS memo_keyword_ref`);
        await CMemo.sDB.Send(`DROP TABLE IF EXISTS memo_deleted`);
        await CMemo.sDB.Send(`DROP TABLE IF EXISTS memo_data_keyword_ref`);

        await CMemo.sDB.CreateCollection(CMemo.sCategoryTable, [
            new CORMField('id', 1),
            new CORMField('parentId', 0),
            new CORMField('name', ''),
        ]);

        await CMemo.sDB.CreateCollection(CMemo.sDataTable, [
            new CORMField('id', 1),
            new CORMField('categoryId', 0),
            new CORMField('content', ''),
            new CORMField('date', 0),
        ]);

        await CMemo.sDB.CreateCollection(CMemo.sDataTagTable, [
            new CORMField('tag', ''),
            new CORMField('dataId', 0),
            new CORMField('date', 0),
        ], 'tag,dataId');

        await CMemo.sDB.CreateCollection(CMemo.sDeletedTable, [
            new CORMField('dataId', 0),
            new CORMField('categoryId', 0),
            new CORMField('content', ''),
            new CORMField('date', 0),
            new CORMField('deletedTime', 0),
        ], 'dataId,deletedTime');

        // 메모 하나하나에 붙는 메모 태그(memo_data_tag_ref)와 별개로, 카테고리 자체에 붙는 카테고리 태그.
        // 하위 카테고리까지 상속되며(검색 시 JS에서 트리를 훑어 처리), 카테고리 이름과는 무관한 별도 값이다.
        await CMemo.sDB.CreateCollection(CMemo.sCategoryTagTable, [
            new CORMField('categoryId', 0),
            new CORMField('tag', ''),
        ], 'categoryId,tag');

        await CMemo.sDB.Send(`CREATE INDEX IF NOT EXISTS idx_${CMemo.sCategoryTable}_parentId ON ${CMemo.sCategoryTable} (parentId)`);
        await CMemo.sDB.Send(`CREATE INDEX IF NOT EXISTS idx_${CMemo.sDataTable}_categoryId_date ON ${CMemo.sDataTable} (categoryId, date)`);
        await CMemo.sDB.Send(`CREATE INDEX IF NOT EXISTS idx_${CMemo.sDataTagTable}_tag_date ON ${CMemo.sDataTagTable} (tag, date)`);
        await CMemo.sDB.Send(`CREATE INDEX IF NOT EXISTS idx_${CMemo.sDataTagTable}_dataId ON ${CMemo.sDataTagTable} (dataId)`);
        await CMemo.sDB.Send(`CREATE INDEX IF NOT EXISTS idx_${CMemo.sCategoryTagTable}_tag ON ${CMemo.sCategoryTagTable} (tag)`);
    }

    // ==================================================================
    // 내부 헬퍼
    // ==================================================================

    private static RowToCategory(_row: any[]): CategoryRecord {
        return {
            id: Number(_row[0]),
            parentId: Number(_row[1]),
            name: String(_row[2]),
        };
    }

    private static async RowToData(_row: any[]): Promise<DataRecord> {
        const id = Number(_row[0]);
        return {
            id,
            categoryId: Number(_row[1]),
            content: String(_row[2]),
            tags: await CMemo.GetTags(id),
            date: Number(_row[3]),
        };
    }

    // 부모-자식(parentId) 관계를 JS에서 재귀 순회해 자기 자신 + 모든 하위 카테고리 id를 모은다.
    private static CollectDescendantIds(_id: number, _all: CategoryRecord[]): number[] {
        if (!_all.some(c => c.id === _id)) {
            return [];
        }

        const result: number[] = [_id];
        const stack: number[] = [_id];
        while (stack.length > 0) {
            const current = stack.pop()!;
            for (const child of _all.filter(c => c.parentId === current)) {
                result.push(child.id);
                stack.push(child.id);
            }
        }
        return result;
    }

    private static async GetTags(_dataId: number): Promise<string[]> {
        const rows = await CMemo.sDB.Recv(
            `SELECT tag FROM ${CMemo.sDataTagTable} WHERE dataId = ? ORDER BY tag ASC`,
            [_dataId]
        );
        if (rows == null) {
            return [];
        }
        return rows.map(row => String(row[0]));
    }

    private static async InsertTags(_dataId: number, _date: number, _tags: string[]): Promise<void> {
        for (const tag of CMemo.UniqueTags(_tags)) {
            await CMemo.sDB.Send(
                `INSERT INTO ${CMemo.sDataTagTable} (tag, dataId, date) VALUES (?, ?, ?)`,
                [tag, _dataId, _date]
            );
        }
    }

    // 완전일치를 우선하고, 완전일치가 하나도 없을 때만 양방향 부분 포함(LIKE)으로 확장한다
    // (예: "기지건설" vs "기지"+"건설" 같은 복합어 분리 토큰화 어긋남 대응). _categoryId가 지정되면 그 카테고리로 필터링한다.
    // 태그가 여러 개면(예: "TODO"+"메모앱") 각 태그를 모두 만족(AND)하는 메모만 결과에 남긴다
    // - 태그 하나하나는 "내가 있으면 조건 충족(OR)" 이지만, 서로 다른 태그끼리는 전부 걸려야 한다.
    // _hasExplicitDate: 요청에 명시적 시간/날짜 표현이 있었는지(ExtractReadInfo 참고) - 카테고리 태그 상속 매칭에 날짜 필터를 걸지 여부에 쓰인다.
    private static async FindDataIds(_tags: string[], _startTime: number, _endTime: number, _categoryId: number | null, _hasExplicitDate: boolean): Promise<number[]> {
        const tags = CMemo.UniqueTags(_tags);

        if (tags.length === 0) {
            const categoryFilter = _categoryId != null ? `AND categoryId = ?` : '';
            const params = _categoryId != null ? [_startTime, _endTime, _categoryId] : [_startTime, _endTime];
            const rows = await CMemo.sDB.Recv(
                `SELECT id FROM ${CMemo.sDataTable} WHERE date >= ? AND date <= ? ${categoryFilter} ORDER BY id ASC`,
                params
            );
            return rows == null ? [] : rows.map(row => Number(row[0]));
        }

        let resultIds: Set<number> | null = null;
        for (const tag of tags) {
            const matchedIds = await CMemo.FindIdsForSingleTag(tag, _startTime, _endTime, _categoryId, _hasExplicitDate);
            resultIds = resultIds == null ? matchedIds : new Set([...resultIds].filter(id => matchedIds.has(id)));
            if (resultIds.size === 0) {
                break;
            }
        }

        return Array.from(resultIds ?? new Set<number>()).sort((a, b) => a - b);
    }

    // 태그 하나에 대해 매칭되는 dataId 집합을 모은다: 메모 자체 태그(날짜 범위 적용) + 카테고리 태그 상속(아래 참고).
    private static async FindIdsForSingleTag(_tag: string, _startTime: number, _endTime: number, _categoryId: number | null, _hasExplicitDate: boolean): Promise<Set<number>> {
        const categoryFilter = _categoryId != null ? `AND d.categoryId = ?` : '';

        // 1차: 완전일치하는 메모 태그만 사용.
        const exactParams: any[] = [_startTime, _endTime, _tag];
        if (_categoryId != null) {
            exactParams.push(_categoryId);
        }
        const exactRows = await CMemo.sDB.Recv(
            `SELECT DISTINCT k.dataId FROM ${CMemo.sDataTagTable} k
             JOIN ${CMemo.sDataTable} d ON d.id = k.dataId
             WHERE k.date >= ? AND k.date <= ? AND k.tag = ? ${categoryFilter}
             ORDER BY k.dataId ASC`,
            exactParams
        );
        let idSet = new Set<number>(exactRows == null ? [] : exactRows.map(row => Number(row[0])));

        // 2차: 완전일치가 하나도 없을 때만 양방향 부분 포함(LIKE)으로 확장 - 짧고 흔한 태그(예: "메모")가
        // 관계없는 긴 태그(예: "메모앱")와 섞이는 오매칭을 막으면서, 복합어 분리 대응은 그대로 유지한다.
        if (idSet.size === 0) {
            const likeParams: any[] = [_startTime, _endTime, _tag, _tag];
            if (_categoryId != null) {
                likeParams.push(_categoryId);
            }
            const likeRows = await CMemo.sDB.Recv(
                `SELECT DISTINCT k.dataId FROM ${CMemo.sDataTagTable} k
                 JOIN ${CMemo.sDataTable} d ON d.id = k.dataId
                 WHERE k.date >= ? AND k.date <= ? AND (k.tag LIKE '%' || ? || '%' OR ? LIKE '%' || k.tag || '%') ${categoryFilter}
                 ORDER BY k.dataId ASC`,
                likeParams
            );
            idSet = new Set<number>(likeRows == null ? [] : likeRows.map(row => Number(row[0])));
        }

        // 카테고리 태그 상속: 검색 태그와 매칭되는 카테고리 태그를 가진 카테고리(+하위)에 속한 메모는
        // 개별 메모 태그가 없어도 이 태그 조건을 충족한 것으로 취급한다. _categoryId로 스코프가 좁혀져 있으면 그 하위집합으로만 제한한다.
        // 요청에 명시적 시간 표현이 없었다면("이 카테고리 안이면 무조건 이 태그") 날짜 필터를 걸지 않아
        // AI가 기본값으로 잡은 날짜 범위가 부정확해도 영향받지 않게 하지만, 사용자가 "22시 이후"처럼
        // 시간을 명시했다면(_hasExplicitDate) 그 의도를 존중해 카테고리 상속 매칭에도 날짜 필터를 적용한다.
        let taggedCategoryIds = await CMemo.FindTaggedCategoryIds([_tag]);
        if (taggedCategoryIds.length > 0 && _categoryId != null) {
            const all = await CMemo.ListCategories();
            const scopeIds = new Set(CMemo.CollectDescendantIds(_categoryId, all));
            taggedCategoryIds = taggedCategoryIds.filter(id => scopeIds.has(id));
        }
        if (taggedCategoryIds.length > 0) {
            const placeholders = taggedCategoryIds.map(() => '?').join(',');
            const dateFilter = _hasExplicitDate ? `AND date >= ? AND date <= ?` : '';
            const taggedParams: any[] = _hasExplicitDate ? [...taggedCategoryIds, _startTime, _endTime] : taggedCategoryIds;
            const taggedRows = await CMemo.sDB.Recv(
                `SELECT id FROM ${CMemo.sDataTable} WHERE categoryId IN (${placeholders}) ${dateFilter}`,
                taggedParams
            );
            if (taggedRows != null) {
                for (const row of taggedRows) idSet.add(Number(row[0]));
            }
        }

        return idSet;
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

    private static UniqueTags(_tags: string[]): string[] {
        const set = new Set<string>();
        for (const tag of _tags) {
            const key = tag.trim();
            if (key.length > 0) {
                set.add(key);
            }
        }
        return Array.from(set);
    }

    // "#태그"처럼 #으로 시작하는 토큰을 띄어쓰기 기준으로 뽑아 강제 태그로 쓴다.
    private static ExtractHashtags(_text: string): string[] {
        const matches = _text.match(/#\S+/g);
        if (matches == null) {
            return [];
        }
        return matches.map(tag => tag.slice(1)).filter(tag => tag.length > 0);
    }

    // "#태그" 토큰은 태그로만 저장하고, 본문(content)에서는 제거한다.
    private static StripHashtags(_text: string): string {
        return _text.replace(/#\S+/g, ' ').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
    }

    // AI 판단 전에 한/영 "할 일" 표현이 포함되어 있으면 무조건 "TODO"를 태그에 강제 추가한다.
    private static readonly sTodoWords: string[] = [
        '해야', '할일', '할 일', '확인 필요', '확인필요', '예정',
        'todo', 'to-do', 'fixme',
    ];

    private static DetectTodoTag(_text: string): string[] {
        const lower = _text.toLowerCase();
        return CMemo.sTodoWords.some(word => lower.includes(word.toLowerCase())) ? ['TODO'] : [];
    }

    // 카테고리 미선택 상태로 글을 쓸 때, 내용과 가장 어울리는 카테고리를 AI가 추천한다.
    // 뚜렷하게 어울리는 카테고리가 없으면 null(추천 없음)을 반환한다 - 실제 저장은 클라이언트가
    // 사용자 확인을 받은 뒤 AddData()를 별도로 호출해서 한다.
    public static async SuggestCategory(_text: string, _provider?: CAI.eProvider, _model?: string): Promise<CategoryRecord | null> {
        await CMemo.Init();

        const categories = await CMemo.ListCategories();
        if (categories.length === 0) {
            return null;
        }

        const paths = CMemo.BuildCategoryPaths(categories);
        const lines = [
            '너는 메모 저장 카테고리 추천기다.',
            '아래 카테고리 목록 중 사용자 메모 내용과 가장 어울리는 카테고리 하나의 id를 골라라.',
            '뚜렷하게 어울리는 카테고리가 없으면 categoryId를 null로 출력해라.',
            '반드시 JSON만 출력해라. 마크다운, 설명, 코드블록 금지.',
            '스키마: {"categoryId": 3} 또는 {"categoryId": null}',
            '카테고리 목록 (id: 상위>하위 경로):',
            ...paths.map(p => `${p.id}: ${p.path}`),
            `메모 내용: ${JSON.stringify(_text)}`,
        ];
        const result = CMemo.ParseJson<{ categoryId: number | null }>(
            await CMemo.RunCAI(lines.join('\n'), _provider, _model),
            { categoryId: null }
        );
        if (result.categoryId == null) {
            return null;
        }
        return categories.find(c => c.id === result.categoryId) ?? null;
    }

    // 카테고리 목록을 "상위>하위" 경로 문자열로 펼친다(AI 프롬프트에서 계층을 이해할 수 있게).
    private static BuildCategoryPaths(_categories: CategoryRecord[]): { id: number; path: string }[] {
        const byId = new Map(_categories.map(c => [c.id, c]));
        const PathOf = (_cat: CategoryRecord): string => {
            const parts: string[] = [_cat.name];
            let cur = _cat;
            while (cur.parentId) {
                const parent = byId.get(cur.parentId);
                if (!parent) break;
                parts.unshift(parent.name);
                cur = parent;
            }
            return parts.join(' > ');
        };
        return _categories.map(c => ({ id: c.id, path: PathOf(c) }));
    }

    private static async ExtractWriteInfo(
        _text: string,
        _provider?: CAI.eProvider,
        _model?: string
    ): Promise<{ tags: string[] }> {
        const now = CMemo.Now();
        const lines = [
            '너는 메모 저장 전처리기다.',
            '사용자 문장에서 태그를 추출해라.',
            '반드시 JSON만 출력해라. 마크다운, 설명, 코드블록 금지.',
            '스키마: {"tags":["태그"]}',
            '태그는 단어 단위로 추출해라.',
            '어제/오늘/지난주처럼 날짜·시간을 가리키는 표현은 태그에 넣지 마라.',
            '문장이 아직 끝나지 않은 할일·확인 필요·작업 예정 등을 나타내면 태그 목록에 "TODO"를 추가해라.',
            `현재 시간 숫자: ${now}`,
            `문장: ${JSON.stringify(_text)}`,
        ];
        return CMemo.ParseJson(await CMemo.RunCAI(lines.join('\n'), _provider, _model), { tags: [_text] });
    }

    private static async ExtractReadInfo(_text: string, _defaultStart: number, _defaultEnd: number, _provider?: CAI.eProvider, _model?: string): Promise<{ tags: string[]; startTime: number; endTime: number; hasExplicitDate: boolean }> {
        const now = CMemo.Now();
        const prompt = [
            '너는 메모 검색 전처리기다.',
            '사용자 요청에서 검색 태그와 날짜 범위를 추출해라.',
            '반드시 JSON만 출력해라. 마크다운, 설명, 코드블록 금지.',
            '태그는 단어 단위로 추출해라.',
            '어제/오늘/지난주처럼 날짜·시간을 가리키는 표현은 태그에 넣지 말고 날짜 범위 변환에만 써라.',
            '요청이 남은 할일·해야할 작업·확인 필요한 것을 묻는 질문이면 태그 목록에 "TODO"를 추가해라.',
            '시간은 YYYYMMDDHHmmss 숫자로 출력해라.',
            '"15시 이후", "오후 3시 이후"처럼 날짜 없이 시각(시/분)만 언급되면 오늘 날짜에 그 시각을 붙여 startTime으로, endTime은 현재 시간으로 써라.',
            '"12시 이전", "정오 전"처럼 이전/전 표현이면 오늘 날짜 00:00:00을 startTime으로, 그 시각을 endTime으로 써라.',
            `날짜 정보가 없으면 startTime=${_defaultStart}, endTime=${_defaultEnd}를 사용해라.`,
            '스키마: {"tags":["태그"],"startTime":20260101000000,"endTime":20260131235959}',
            `현재 시간 숫자: ${now}`,
            `요청: ${JSON.stringify(_text)}`,
        ].join('\n');
        const parsed = CMemo.ParseJson(await CMemo.RunCAI(prompt, _provider, _model), { tags: [_text], startTime: _defaultStart, endTime: _defaultEnd });
        // AI가 별도 플래그를 안정적으로 내놓는다고 신뢰하는 대신, 추출된 범위가 기본값(날짜 정보 없을 때 값)과
        // 다르면 요청에 명시적 날짜·시간 표현이 있었던 것으로 코드에서 직접 판단한다.
        const hasExplicitDate = parsed.startTime !== _defaultStart || parsed.endTime !== _defaultEnd;
        return { tags: parsed.tags, startTime: parsed.startTime, endTime: parsed.endTime, hasExplicitDate };
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

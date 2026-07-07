import { CORMField, CRDBMS } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';
import { CAI } from '../util/CAI.js';
import * as fs from 'fs';
import * as path from 'path';

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
    private static sDBMap: Map<string, CRDBMS> = new Map();
    private static sCategoryTable = 'memo_category';
    private static sDataTable = 'memo_data';
    private static sDataTagTable = 'memo_data_tag_ref';
    private static sDeletedTable = 'memo_data_deleted';
    private static sCategoryTagTable = 'memo_category_tag';
    private static sProvider: CAI.eProvider = CAI.eProvider.claude;
    private static sModel: string = 'claude-sonnet-4-6';

    // folder는 실제 파일 시스템 경로다 - 그 폴더 안에 memo.sqlite를 직접 만들어서 폴더별로 완전히 독립된
    // db를 갖는다. folder가 비어있으면(설정 안 함) 폴더 구분 이전부터 쓰던 기존 기본 파일을 그대로 쓴다.
    private static ResolveDbPath(_folder: string): string {
        const folder = (_folder ?? '').trim();
        if (folder.length === 0) {
            return './db/memo.sqlite';
        }
        return path.join(folder, 'memo.sqlite');
    }

    private static async Init(_folder: string): Promise<CRDBMS> {
        const dbPath = CMemo.ResolveDbPath(_folder);
        const cached = CMemo.sDBMap.get(dbPath);
        if (cached != null) {
            return cached;
        }

        fs.mkdirSync(path.dirname(dbPath), { recursive: true });

        const db = new CSQLite();
        db.mDatabase = dbPath;
        await db.Init();
        CMemo.sDBMap.set(dbPath, db);

        await CMemo.CreateTables(db);
        return db;
    }

    // ==================================================================
    // 카테고리 CRUD
    // ==================================================================

    public static async ListCategories(_folder: string): Promise<CategoryRecord[]> {
        const db = await CMemo.Init(_folder);

        const rows = await db.Recv(
            `SELECT id, parentId, name FROM ${CMemo.sCategoryTable} ORDER BY id ASC`
        );
        if (rows == null) {
            return [];
        }
        return rows.map(row => CMemo.RowToCategory(row));
    }

    // 카테고리 생성 시 이름을 SuggestTag에 넣어 나온 태그를 자동으로 그 카테고리에 붙인다
    // (카테고리 미선택 메모 저장 시 자동 분류(AddDataAuto)가 이 태그로 카테고리를 찾아 매칭한다).
    public static async AddCategory(_folder: string, _name: string, _parentId: number, _provider?: CAI.eProvider, _model?: string): Promise<CategoryRecord> {
        const db = await CMemo.Init(_folder);

        await db.Send(
            `INSERT INTO ${CMemo.sCategoryTable} (parentId, name) VALUES (?, ?)`,
            [_parentId, _name]
        );
        // 단일 프로세스/저동시성 관리 도구라 lastInsertRowId 없이도 충분하다(CSQLite.Send가 결과를 반환하지 않음).
        const rows = await db.Recv(
            `SELECT id, parentId, name FROM ${CMemo.sCategoryTable} ORDER BY id DESC LIMIT 1`
        );
        const category = CMemo.RowToCategory(rows[0]);

        const tag = await CMemo.SuggestTag(_name, _provider, _model);
        if (tag.length > 0) {
            await CMemo.InsertCategoryTag(_folder, category.id, tag);
        }
        return category;
    }

    // 카테고리 이름 변경 - 태그 편집 기능을 대체한다: 이름이 바뀌면 SuggestTag로 태그를 새로 뽑아
    // 기존 태그를 전부 지우고 새 태그 하나로 교체한다. 단, 같은 부모(형제) 카테고리 중 이미 그 태그를
    // 가진 카테고리가 있으면 이름 변경을 거부한다(같은 뎁스 안에서는 태그가 겹치면 안 됨).
    public static async RenameCategory(_folder: string, _id: number, _newName: string, _provider?: CAI.eProvider, _model?: string): Promise<CategoryRecord> {
        const db = await CMemo.Init(_folder);

        const rows = await db.Recv(`SELECT id, parentId, name FROM ${CMemo.sCategoryTable} WHERE id = ?`, [_id]);
        if (rows == null || rows.length === 0) {
            throw new Error('카테고리를 찾을 수 없습니다');
        }
        const category = CMemo.RowToCategory(rows[0]);

        const newTag = await CMemo.SuggestTag(_newName, _provider, _model);
        if (newTag.length > 0) {
            const siblingRows = await db.Recv(
                `SELECT 1 FROM ${CMemo.sCategoryTable} c JOIN ${CMemo.sCategoryTagTable} t ON t.categoryId = c.id
                 WHERE c.parentId = ? AND c.id != ? AND t.tag = ? LIMIT 1`,
                [category.parentId, _id, newTag]
            );
            if (siblingRows != null && siblingRows.length > 0) {
                throw new Error('같은 위치에 이미 같은 태그를 가진 카테고리가 있습니다');
            }
        }

        await db.Send(`UPDATE ${CMemo.sCategoryTable} SET name = ? WHERE id = ?`, [_newName, _id]);
        await db.Send(`DELETE FROM ${CMemo.sCategoryTagTable} WHERE categoryId = ?`, [_id]);
        if (newTag.length > 0) {
            await CMemo.InsertCategoryTag(_folder, _id, newTag);
        }

        return { id: category.id, parentId: category.parentId, name: _newName };
    }

    // 메모(데이터) 하나를 다른 카테고리로 옮긴다(categoryId만 변경) - "다른 카테고리를 선택한 채로
    // /m @<메모id>를 입력하면 그 메모를 지금 선택된 카테고리로 옮긴다"는 흐름을 위한 것.
    public static async MoveData(_folder: string, _id: number, _newCategoryId: number): Promise<DataRecord> {
        const db = await CMemo.Init(_folder);

        const rows = await db.Recv(
            `SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE id = ? LIMIT 1`,
            [_id]
        );
        if (rows == null || rows.length === 0) {
            throw new Error('메모를 찾을 수 없습니다');
        }
        const categories = await CMemo.ListCategories(_folder);
        if (!categories.some(c => c.id === _newCategoryId)) {
            throw new Error('대상 카테고리를 찾을 수 없습니다');
        }

        await db.Send(`UPDATE ${CMemo.sDataTable} SET categoryId = ? WHERE id = ?`, [_newCategoryId, _id]);
        return await CMemo.RowToData(db, [rows[0][0], _newCategoryId, rows[0][2], rows[0][3]]);
    }

    // 카테고리와 그 하위 카테고리 전부, 그 아래 딸린 데이터까지 함께 삭제한다.
    // 데이터는 memo_data_deleted에 먼저 기록한 뒤 삭제하는 soft-delete 감사 로그 패턴을 유지한다.
    public static async DeleteCategory(_folder: string, _id: number): Promise<{ deletedCategoryIds: number[]; deletedDataCount: number }> {
        const db = await CMemo.Init(_folder);

        const all = await CMemo.ListCategories(_folder);
        const ids = CMemo.CollectDescendantIds(_id, all);
        if (ids.length === 0) {
            return { deletedCategoryIds: [], deletedDataCount: 0 };
        }

        let deletedDataCount = 0;
        try {
            await db.Send('BEGIN TRANSACTION');

            for (const categoryId of ids) {
                const dataRows = await db.Recv(
                    `SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE categoryId = ?`,
                    [categoryId]
                );
                if (dataRows == null) {
                    continue;
                }
                for (const row of dataRows) {
                    const dataId = Number(row[0]);
                    await db.Send(
                        `INSERT INTO ${CMemo.sDeletedTable} (dataId, categoryId, content, date, deletedTime) VALUES (?, ?, ?, ?, ?)`,
                        [dataId, Number(row[1]), String(row[2]), Number(row[3]), CMemo.Now()]
                    );
                    await db.Send(`DELETE FROM ${CMemo.sDataTagTable} WHERE dataId = ?`, [dataId]);
                    await db.Send(`DELETE FROM ${CMemo.sDataTable} WHERE id = ?`, [dataId]);
                    deletedDataCount++;
                }
            }

            const placeholders = ids.map(() => '?').join(',');
            await db.Send(`DELETE FROM ${CMemo.sCategoryTagTable} WHERE categoryId IN (${placeholders})`, ids);
            await db.Send(`DELETE FROM ${CMemo.sCategoryTable} WHERE id IN (${placeholders})`, ids);

            await db.Send('COMMIT');
        } catch (err) {
            await db.Send('ROLLBACK');
            throw err;
        }

        return { deletedCategoryIds: ids, deletedDataCount };
    }

    // ==================================================================
    // 카테고리 태그 - 메모 하나하나가 아니라 카테고리 자체에 붙는 라벨.
    // 검색 시 그 카테고리(+모든 하위 카테고리)에 속한 메모는 이 태그와 매칭된 것으로 취급한다.
    // ==================================================================

    // 카테고리 트리를 그릴 때(사이드바) 카테고리별 태그를 한 번에 보여주기 위한 전체 목록.
    public static async ListAllCategoryTags(_folder: string): Promise<{ categoryId: number; tag: string }[]> {
        const db = await CMemo.Init(_folder);

        const rows = await db.Recv(`SELECT categoryId, tag FROM ${CMemo.sCategoryTagTable} ORDER BY categoryId ASC, tag ASC`);
        if (rows == null) {
            return [];
        }
        return rows.map(row => ({ categoryId: Number(row[0]), tag: String(row[1]) }));
    }

    // 이미 정규화된 태그를 그대로 저장하는 내부 헬퍼(AddCategory의 자동 태그 부여처럼 중복 AI 호출을
    // 피해야 하는 경로에서 쓴다). 공개 API로 들어오는 태그는 항상 AddCategoryTag(SuggestTag 정규화)를 거친다.
    private static async InsertCategoryTag(_folder: string, _categoryId: number, _tag: string): Promise<void> {
        const db = await CMemo.Init(_folder);

        const tag = _tag.trim().toLowerCase();
        if (tag.length === 0) {
            return;
        }
        const existing = await db.Recv(
            `SELECT 1 FROM ${CMemo.sCategoryTagTable} WHERE categoryId = ? AND tag = ? LIMIT 1`,
            [_categoryId, tag]
        );
        if (existing != null && existing.length > 0) {
            return;
        }
        await db.Send(
            `INSERT INTO ${CMemo.sCategoryTagTable} (categoryId, tag) VALUES (?, ?)`,
            [_categoryId, tag]
        );
    }

    // 검색 태그와 매칭되는 카테고리 태그를 가진 카테고리들을, 하위 카테고리까지 포함해 전부 모은다.
    // 완전일치를 우선하고, 완전일치가 하나도 없을 때만 부분 포함(양방향)으로 확장한다(짧고 흔한 태그의 오매칭 방지).
    private static async FindTaggedCategoryIds(_folder: string, _tags: string[]): Promise<number[]> {
        if (_tags.length === 0) {
            return [];
        }

        const db = await CMemo.Init(_folder);
        const rows = await db.Recv(`SELECT categoryId, tag FROM ${CMemo.sCategoryTagTable}`);
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

        const all = await CMemo.ListCategories(_folder);
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

    public static async AddData(_folder: string, _categoryId: number, _content: string, _provider?: CAI.eProvider, _model?: string): Promise<DataRecord> {
        const db = await CMemo.Init(_folder);

        const hashtags = CMemo.ExtractHashtags(_content);
        const manualTodo = CMemo.DetectTodoTag(_content);
        const info = await CMemo.ExtractWriteInfo(_content, _provider, _model);
        const tags = CMemo.UniqueTags([...info.tags, ...hashtags, ...manualTodo]);
        const content = CMemo.StripHashtags(_content);
        const date = CMemo.Now();

        try {
            await db.Send('BEGIN TRANSACTION');

            await db.Send(
                `INSERT INTO ${CMemo.sDataTable} (categoryId, content, date) VALUES (?, ?, ?)`,
                [_categoryId, content, date]
            );
            const rows = await db.Recv(
                `SELECT id FROM ${CMemo.sDataTable} WHERE categoryId = ? AND date = ? ORDER BY id DESC LIMIT 1`,
                [_categoryId, date]
            );
            const id = Number(rows[0][0]);
            await CMemo.InsertTags(db, id, date, tags);

            await db.Send('COMMIT');
            return { id, categoryId: _categoryId, content, tags, date };
        } catch (err) {
            await db.Send('ROLLBACK');
            throw err;
        }
    }

    // 카테고리 미선택 상태로 메모를 쓸 때 쓰인다: 내용을 SuggestTag에 넣어 태그 하나를 뽑고,
    // 그 태그를 가진 카테고리를 찾아 저장한다. 그런 태그를 가진 카테고리가 없으면 그 태그 이름으로
    // 카테고리를 새로 만들어(AddCategory가 자동으로 같은 태그를 붙여줌) 그 카테고리에 저장한다.
    public static async AddDataAuto(_folder: string, _content: string, _provider?: CAI.eProvider, _model?: string): Promise<DataRecord> {
        const tag = await CMemo.SuggestTag(_content, _provider, _model);
        const categoryId = await CMemo.ResolveOrCreateCategoryByTag(_folder, tag, _provider, _model);
        return await CMemo.AddData(_folder, categoryId, _content, _provider, _model);
    }

    private static async ResolveOrCreateCategoryByTag(_folder: string, _tag: string, _provider?: CAI.eProvider, _model?: string): Promise<number> {
        const db = await CMemo.Init(_folder);

        if (_tag.length > 0) {
            const rows = await db.Recv(
                `SELECT categoryId FROM ${CMemo.sCategoryTagTable} WHERE tag = ? ORDER BY categoryId ASC LIMIT 1`,
                [_tag]
            );
            if (rows != null && rows.length > 0) {
                return Number(rows[0][0]);
            }
        }

        const name = _tag.length > 0 ? _tag : 'misc';
        const category = await CMemo.AddCategory(_folder, name, 0, _provider, _model);
        return category.id;
    }

    public static async ListData(_folder: string, _categoryId: number): Promise<DataRecord[]> {
        const db = await CMemo.Init(_folder);

        const rows = await db.Recv(
            `SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE categoryId = ? ORDER BY date DESC, id DESC`,
            [_categoryId]
        );
        if (rows == null) {
            return [];
        }

        const records: DataRecord[] = [];
        for (const row of rows) {
            records.push(await CMemo.RowToData(db, row));
        }
        return records;
    }

    // 카테고리 구분 없이 전체에서 최신 N개(사이드바 "타임" 탭용).
    public static async ListRecentData(_folder: string, _limit: number): Promise<DataRecord[]> {
        const db = await CMemo.Init(_folder);

        const rows = await db.Recv(
            `SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} ORDER BY date DESC, id DESC LIMIT ?`,
            [_limit]
        );
        if (rows == null) {
            return [];
        }

        const records: DataRecord[] = [];
        for (const row of rows) {
            records.push(await CMemo.RowToData(db, row));
        }
        return records;
    }

    public static async DeleteData(_folder: string, _id: number): Promise<boolean> {
        const db = await CMemo.Init(_folder);

        const rows = await db.Recv(
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
            await db.Send('BEGIN TRANSACTION');

            await db.Send(
                `INSERT INTO ${CMemo.sDeletedTable} (dataId, categoryId, content, date, deletedTime) VALUES (?, ?, ?, ?, ?)`,
                [id, categoryId, content, date, CMemo.Now()]
            );
            await db.Send(`DELETE FROM ${CMemo.sDataTagTable} WHERE dataId = ?`, [id]);
            await db.Send(`DELETE FROM ${CMemo.sDataTable} WHERE id = ?`, [id]);

            await db.Send('COMMIT');
            return true;
        } catch (err) {
            await db.Send('ROLLBACK');
            throw err;
        }
    }

    // ==================================================================
    // 검색
    // ==================================================================

    // _categoryId가 null이면 전체 검색, 지정되면 그 카테고리로만 필터링한다.
    // "@123"(정확히 그 id의 메모 하나) / "#tag"(그 태그를 가진 메모만, AI 호출 없이 결정적으로) 형태는
    // AI 검색을 거치지 않고 바로 조회한다 - /r(=search 모드) 입력창에서 빠르고 정확하게 콕 집어 찾을 때 쓴다.
    public static async Search(_folder: string, _text: string, _categoryId: number | null, _provider?: CAI.eProvider, _model?: string): Promise<string> {
        const trimmed = _text.trim();

        const idMatch = trimmed.match(/^@(\d+)$/);
        if (idMatch) {
            return await CMemo.SearchById(_folder, Number(idMatch[1]));
        }
        const tagMatch = trimmed.match(/^#(\S+)$/);
        if (tagMatch) {
            return await CMemo.SearchByTag(_folder, tagMatch[1], _categoryId);
        }

        const records = await CMemo.FindMatchingData(_folder, _text, _categoryId, _provider, _model);
        if (records.length === 0) {
            return '관련 메모가 없습니다.';
        }

        const lines = records.map(r => `[${r.id}][${CMemo.FormatTime(r.date)}] ${r.content}`);
        return lines.join('\n');
    }

    private static async SearchById(_folder: string, _id: number): Promise<string> {
        const db = await CMemo.Init(_folder);
        const rows = await db.Recv(
            `SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE id = ? LIMIT 1`,
            [_id]
        );
        if (rows == null || rows.length === 0) {
            return `@${_id} 메모를 찾을 수 없습니다.`;
        }
        const record = await CMemo.RowToData(db, rows[0]);
        return `[${record.id}][${CMemo.FormatTime(record.date)}] ${record.content}`;
    }

    // 태그 완전일치(대소문자 무시)만으로 찾는다 - AI로 태그를 다시 뽑지 않고 입력된 태그 그대로 쓴다.
    // 날짜 범위는 전체 기간으로 열어둬서(hasExplicitDate=false와 별개로 own-tag 정확매치에도 날짜 필터가 걸리므로) 항상 다 나오게 한다.
    private static async SearchByTag(_folder: string, _tag: string, _categoryId: number | null): Promise<string> {
        const tag = _tag.trim().toLowerCase();
        if (tag.length === 0) {
            return '태그가 비어 있습니다.';
        }

        const ids = await CMemo.FindDataIds(_folder, [tag], 'OR', 0, 99999999999999, _categoryId, false);
        if (ids.length === 0) {
            return `#${tag} 태그를 가진 메모가 없습니다.`;
        }

        const db = await CMemo.Init(_folder);
        const lines: string[] = [];
        for (const id of ids) {
            const rows = await db.Recv(
                `SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE id = ? LIMIT 1`,
                [id]
            );
            if (rows == null || rows.length === 0) {
                continue;
            }
            const record = await CMemo.RowToData(db, rows[0]);
            lines.push(`[${record.id}][${CMemo.FormatTime(record.date)}] ${record.content}`);
        }
        return lines.join('\n');
    }

    // 설명(자연어)으로 삭제 후보를 찾기만 한다(실제 삭제는 하지 않음) - 클라이언트가 확인(confirm) 후
    // 각 id에 대해 DeleteData를 호출하는 2단계 흐름을 위한 것.
    public static async FindByDescription(_folder: string, _text: string, _categoryId: number | null, _provider?: CAI.eProvider, _model?: string): Promise<DataRecord[]> {
        return await CMemo.FindMatchingData(_folder, _text, _categoryId, _provider, _model);
    }

    private static async FindMatchingData(_folder: string, _text: string, _categoryId: number | null, _provider?: CAI.eProvider, _model?: string): Promise<DataRecord[]> {
        const db = await CMemo.Init(_folder);
        const now = CMemo.Now();
        const monthAgo = CMemo.AddMonthTime(-1);
        const hashtags = CMemo.ExtractHashtags(_text);
        const manualTodo = CMemo.DetectTodoTag(_text);
        const info = await CMemo.ExtractReadInfo(_text, monthAgo, now, _provider, _model);
        const tags = CMemo.UniqueTags([...info.tags, ...hashtags, ...manualTodo]);

        const ids = await CMemo.FindDataIds(_folder, tags, info.tagMode, info.startTime, info.endTime, _categoryId, info.hasExplicitDate);
        const records: DataRecord[] = [];
        for (const id of ids) {
            const rows = await db.Recv(
                `SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE id = ? LIMIT 1`,
                [id]
            );
            if (rows == null || rows.length === 0) {
                continue;
            }
            records.push(await CMemo.RowToData(db, rows[0]));
        }
        return records;
    }

    // ==================================================================
    // 테이블 생성
    // ==================================================================

    private static async CreateTables(_db: CRDBMS): Promise<void> {
        // 구 체인(offset 연결) 스키마 및 "키워드" 시절 테이블명은 마이그레이션 없이 완전히 폐기한다.
        await _db.Send(`DROP TABLE IF EXISTS memo_record`);
        await _db.Send(`DROP TABLE IF EXISTS memo_keyword_ref`);
        await _db.Send(`DROP TABLE IF EXISTS memo_deleted`);
        await _db.Send(`DROP TABLE IF EXISTS memo_data_keyword_ref`);

        await _db.CreateCollection(CMemo.sCategoryTable, [
            new CORMField('id', 1),
            new CORMField('parentId', 0),
            new CORMField('name', ''),
        ]);

        await _db.CreateCollection(CMemo.sDataTable, [
            new CORMField('id', 1),
            new CORMField('categoryId', 0),
            new CORMField('content', ''),
            new CORMField('date', 0),
        ]);

        await _db.CreateCollection(CMemo.sDataTagTable, [
            new CORMField('tag', ''),
            new CORMField('dataId', 0),
            new CORMField('date', 0),
        ], 'tag,dataId');

        await _db.CreateCollection(CMemo.sDeletedTable, [
            new CORMField('dataId', 0),
            new CORMField('categoryId', 0),
            new CORMField('content', ''),
            new CORMField('date', 0),
            new CORMField('deletedTime', 0),
        ], 'dataId,deletedTime');

        // 메모 하나하나에 붙는 메모 태그(memo_data_tag_ref)와 별개로, 카테고리 자체에 붙는 카테고리 태그.
        // 하위 카테고리까지 상속되며(검색 시 JS에서 트리를 훑어 처리), 카테고리 이름과는 무관한 별도 값이다.
        await _db.CreateCollection(CMemo.sCategoryTagTable, [
            new CORMField('categoryId', 0),
            new CORMField('tag', ''),
        ], 'categoryId,tag');

        await _db.Send(`CREATE INDEX IF NOT EXISTS idx_${CMemo.sCategoryTable}_parentId ON ${CMemo.sCategoryTable} (parentId)`);
        await _db.Send(`CREATE INDEX IF NOT EXISTS idx_${CMemo.sDataTable}_categoryId_date ON ${CMemo.sDataTable} (categoryId, date)`);
        await _db.Send(`CREATE INDEX IF NOT EXISTS idx_${CMemo.sDataTagTable}_tag_date ON ${CMemo.sDataTagTable} (tag, date)`);
        await _db.Send(`CREATE INDEX IF NOT EXISTS idx_${CMemo.sDataTagTable}_dataId ON ${CMemo.sDataTagTable} (dataId)`);
        await _db.Send(`CREATE INDEX IF NOT EXISTS idx_${CMemo.sCategoryTagTable}_tag ON ${CMemo.sCategoryTagTable} (tag)`);
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

    private static async RowToData(_db: CRDBMS, _row: any[]): Promise<DataRecord> {
        const id = Number(_row[0]);
        return {
            id,
            categoryId: Number(_row[1]),
            content: String(_row[2]),
            tags: await CMemo.GetTags(_db, id),
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

    private static async GetTags(_db: CRDBMS, _dataId: number): Promise<string[]> {
        const rows = await _db.Recv(
            `SELECT tag FROM ${CMemo.sDataTagTable} WHERE dataId = ? ORDER BY tag ASC`,
            [_dataId]
        );
        if (rows == null) {
            return [];
        }
        return rows.map(row => String(row[0]));
    }

    private static async InsertTags(_db: CRDBMS, _dataId: number, _date: number, _tags: string[]): Promise<void> {
        for (const tag of CMemo.UniqueTags(_tags)) {
            await _db.Send(
                `INSERT INTO ${CMemo.sDataTagTable} (tag, dataId, date) VALUES (?, ?, ?)`,
                [tag, _dataId, _date]
            );
        }
    }

    // 완전일치를 우선하고, 완전일치가 하나도 없을 때만 양방향 부분 포함(LIKE)으로 확장한다
    // (예: "기지건설" vs "기지"+"건설" 같은 복합어 분리 토큰화 어긋남 대응). _categoryId가 지정되면 그 카테고리로 필터링한다.
    // 태그가 여러 개일 때 _tagMode로 AND(모든 태그를 동시에 만족)/OR(하나라도 만족) 중 어느 쪽으로 합칠지 정한다
    // - 태그 하나하나는 항상 "내가 있으면 조건 충족"이지만, 서로 다른 태그끼리를 교집합으로 볼지 합집합으로 볼지는 _tagMode로 결정된다.
    // _hasExplicitDate: 요청에 명시적 시간/날짜 표현이 있었는지(ExtractReadInfo 참고) - 카테고리 태그 상속 매칭에 날짜 필터를 걸지 여부에 쓰인다.
    private static async FindDataIds(_folder: string, _tags: string[], _tagMode: 'AND' | 'OR', _startTime: number, _endTime: number, _categoryId: number | null, _hasExplicitDate: boolean): Promise<number[]> {
        const db = await CMemo.Init(_folder);
        const tags = CMemo.UniqueTags(_tags);

        if (tags.length === 0) {
            const categoryFilter = _categoryId != null ? `AND categoryId = ?` : '';
            const params = _categoryId != null ? [_startTime, _endTime, _categoryId] : [_startTime, _endTime];
            const rows = await db.Recv(
                `SELECT id FROM ${CMemo.sDataTable} WHERE date >= ? AND date <= ? ${categoryFilter} ORDER BY id ASC`,
                params
            );
            return rows == null ? [] : rows.map(row => Number(row[0]));
        }

        let resultIds: Set<number> | null = null;
        for (const tag of tags) {
            const matchedIds = await CMemo.FindIdsForSingleTag(_folder, tag, _startTime, _endTime, _categoryId, _hasExplicitDate);
            if (resultIds == null) {
                resultIds = matchedIds;
            } else if (_tagMode === 'OR') {
                resultIds = new Set([...resultIds, ...matchedIds]);
            } else {
                resultIds = new Set([...resultIds].filter(id => matchedIds.has(id)));
                if (resultIds.size === 0) {
                    break;
                }
            }
        }

        return Array.from(resultIds ?? new Set<number>()).sort((a, b) => a - b);
    }

    // 태그 하나에 대해 매칭되는 dataId 집합을 모은다: 메모 자체 태그(날짜 범위 적용) + 카테고리 태그 상속(아래 참고).
    private static async FindIdsForSingleTag(_folder: string, _tag: string, _startTime: number, _endTime: number, _categoryId: number | null, _hasExplicitDate: boolean): Promise<Set<number>> {
        const db = await CMemo.Init(_folder);
        const categoryFilter = _categoryId != null ? `AND d.categoryId = ?` : '';

        // 1차: 완전일치하는 메모 태그만 사용.
        const exactParams: any[] = [_startTime, _endTime, _tag];
        if (_categoryId != null) {
            exactParams.push(_categoryId);
        }
        const exactRows = await db.Recv(
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
            const likeRows = await db.Recv(
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
        let taggedCategoryIds = await CMemo.FindTaggedCategoryIds(_folder, [_tag]);
        if (taggedCategoryIds.length > 0 && _categoryId != null) {
            const all = await CMemo.ListCategories(_folder);
            const scopeIds = new Set(CMemo.CollectDescendantIds(_categoryId, all));
            taggedCategoryIds = taggedCategoryIds.filter(id => scopeIds.has(id));
        }
        if (taggedCategoryIds.length > 0) {
            const placeholders = taggedCategoryIds.map(() => '?').join(',');
            const dateFilter = _hasExplicitDate ? `AND date >= ? AND date <= ?` : '';
            const taggedParams: any[] = _hasExplicitDate ? [...taggedCategoryIds, _startTime, _endTime] : taggedCategoryIds;
            const taggedRows = await db.Recv(
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

    // 모든 태그는 대소문자 구분 없이 취급하도록 소문자로 정규화해서 저장/비교한다.
    private static UniqueTags(_tags: string[]): string[] {
        const set = new Set<string>();
        for (const tag of _tags) {
            const key = tag.trim().toLowerCase();
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

    // AI 판단 전에 한/영 "할 일" 표현이 포함되어 있으면 무조건 "todo"를 태그에 강제 추가한다.
    private static readonly sTodoWords: string[] = [
        '해야', '할일', '할 일', '확인 필요', '확인필요', '예정',
        'todo', 'to-do', 'fixme',
    ];

    private static DetectTodoTag(_text: string): string[] {
        const lower = _text.toLowerCase();
        return CMemo.sTodoWords.some(word => lower.includes(word.toLowerCase())) ? ['todo'] : [];
    }

    // 임의의 텍스트를 대표하는 태그 하나를 뽑는다(영어 소문자로 정규화) - Tag/Suggest API,
    // 카테고리 자동 태그 부여(AddCategory), 카테고리 태그 정규화(AddCategoryTag), 카테고리 미선택
    // 메모 저장 시 자동 분류(AddDataAuto)에서 전부 이 함수 하나를 공용으로 쓴다.
    public static async SuggestTag(_text: string, _provider?: CAI.eProvider, _model?: string): Promise<string> {
        const trimmed = _text.trim();
        if (trimmed.length === 0) {
            return '';
        }
        const lines = [
            '너는 태그 추출기다.',
            '아래 텍스트를 대표하는 태그를 하나만 뽑아라.',
            '반드시 JSON만 출력해라. 마크다운, 설명, 코드블록 금지.',
            '스키마: {"tag":"태그"}',
            '태그는 영문 소문자 단어(또는 하이픈으로 연결된 단어)로 출력해라 - 한글 등 다른 언어의 개념은 그에 해당하는 영어 단어로 번역해라.',
            `텍스트: ${JSON.stringify(trimmed)}`,
        ];
        const result = CMemo.ParseJson<{ tag: string }>(
            await CMemo.RunCAI(lines.join('\n'), _provider, _model),
            { tag: trimmed }
        );
        return (result.tag || trimmed).trim().toLowerCase();
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
            '모든 태그는 영문 소문자 단어로 출력해라 - 한글 등 다른 언어의 개념은 그에 해당하는 영어 단어로 번역해서 출력해라(예: "테스트" -> "test", "회의" -> "meeting").',
            '어제/오늘/지난주처럼 날짜·시간을 가리키는 표현은 태그에 넣지 마라.',
            '문장이 아직 끝나지 않은 할일·확인 필요·작업 예정 등을 나타내면 태그 목록에 "todo"를 추가해라.',
            '"할일/해야/확인 필요/예정/todo/fixme"처럼 할일을 나타내는 표현 자체는 태그로 넣지 말고, 대신 "todo"만 추가해라.',
            `현재 시간 숫자: ${now}`,
            `문장: ${JSON.stringify(_text)}`,
        ];
        return CMemo.ParseJson(await CMemo.RunCAI(lines.join('\n'), _provider, _model), { tags: [_text] });
    }

    private static async ExtractReadInfo(_text: string, _defaultStart: number, _defaultEnd: number, _provider?: CAI.eProvider, _model?: string): Promise<{ tags: string[]; tagMode: 'AND' | 'OR'; startTime: number; endTime: number; hasExplicitDate: boolean }> {
        const now = CMemo.Now();
        const prompt = [
            '너는 메모 검색 전처리기다.',
            '사용자 요청에서 검색 태그와 날짜 범위를 추출해라.',
            '반드시 JSON만 출력해라. 마크다운, 설명, 코드블록 금지.',
            '태그는 단어 단위로 추출해라.',
            '모든 태그는 영문 소문자 단어로 출력해라 - 한글 등 다른 언어의 개념은 그에 해당하는 영어 단어로 번역해서 출력해라(예: "테스트" -> "test", "회의" -> "meeting").',
            '어제/오늘/지난주처럼 날짜·시간을 가리키는 표현은 태그에 넣지 말고 날짜 범위 변환에만 써라.',
            '요청이 남은 할일·해야할 작업·확인 필요한 것을 묻는 질문이면 태그 목록에 "todo"를 추가해라.',
            '"할일/해야할 작업/확인 필요/예정/todo/fixme"처럼 할일을 나타내는 표현 자체는 태그로 넣지 말고, 대신 "todo"만 추가해라.',
            '태그가 여러 개 추출되는 경우 tagMode를 판단해라: "그리고/이면서/둘다/모두"처럼 모든 태그를 동시에 만족해야 하는 AND 조건이 명확할 때만 tagMode를 "AND"로 출력해라.',
            '그 외의 모든 경우(조건이 실질적으로 하나뿐인데 동의어·유사어로 태그가 여러 개 나온 경우 포함, 예: "할일 알려줘" -> ["todo"])는 기본값인 tagMode "OR"을 그대로 써라.',
            '시간은 YYYYMMDDHHmmss 숫자로 출력해라.',
            '"15시 이후", "오후 3시 이후"처럼 날짜 없이 시각(시/분)만 언급되면 오늘 날짜에 그 시각을 붙여 startTime으로, endTime은 현재 시간으로 써라.',
            '"12시 이전", "정오 전"처럼 이전/전 표현이면 오늘 날짜 00:00:00을 startTime으로, 그 시각을 endTime으로 써라.',
            `날짜 정보가 없으면 startTime=${_defaultStart}, endTime=${_defaultEnd}를 사용해라.`,
            '스키마: {"tags":["태그"],"tagMode":"AND" 또는 "OR","startTime":20260101000000,"endTime":20260131235959}',
            `현재 시간 숫자: ${now}`,
            `요청: ${JSON.stringify(_text)}`,
        ].join('\n');
        const parsed = CMemo.ParseJson(await CMemo.RunCAI(prompt, _provider, _model), { tags: [_text], tagMode: 'OR' as const, startTime: _defaultStart, endTime: _defaultEnd });
        // AI가 별도 플래그를 안정적으로 내놓는다고 신뢰하는 대신, 추출된 범위가 기본값(날짜 정보 없을 때 값)과
        // 다르면 요청에 명시적 날짜·시간 표현이 있었던 것으로 코드에서 직접 판단한다.
        const hasExplicitDate = parsed.startTime !== _defaultStart || parsed.endTime !== _defaultEnd;
        // AND가 아니면(값 자체가 없거나 오탈자 등 무엇이든) 전부 기본값 OR로 취급한다.
        const tagMode: 'AND' | 'OR' = (parsed.tagMode as any) === 'AND' ? 'AND' : 'OR';
        return { tags: parsed.tags, tagMode, startTime: parsed.startTime, endTime: parsed.endTime, hasExplicitDate };
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

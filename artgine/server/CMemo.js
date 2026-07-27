import { CORMField } from '../network/CORM.js';
import { CSQLite } from '../network/CSQLite.js';
import { CAI } from '../util/CAI.js';
import * as fs from 'fs';
import * as path from 'path';
export class CMemo {
    static sDBMap = new Map();
    static sCategoryTable = 'memo_category';
    static sDataTable = 'memo_data';
    static sDataTagTable = 'memo_data_tag_ref';
    static sDeletedTable = 'memo_data_deleted';
    static sCategoryTagTable = 'memo_category_tag';
    static sProvider = CAI.eProvider.claude;
    static sModel = 'claude-sonnet-4-6';
    static ResolveDbPath(_folder) {
        const folder = (_folder ?? '').trim();
        if (folder.length === 0) {
            return './db/memo.sqlite';
        }
        return path.join(folder, 'memo.sqlite');
    }
    static async Init(_folder) {
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
    static async ListCategories(_folder) {
        const db = await CMemo.Init(_folder);
        const rows = await db.Recv(`SELECT id, parentId, name FROM ${CMemo.sCategoryTable} ORDER BY id ASC`);
        if (rows == null) {
            return [];
        }
        return rows.map(row => CMemo.RowToCategory(row));
    }
    static async AddCategory(_folder, _name, _parentId, _provider, _model) {
        const db = await CMemo.Init(_folder);
        await db.Send(`INSERT INTO ${CMemo.sCategoryTable} (parentId, name) VALUES (?, ?)`, [_parentId, _name]);
        const rows = await db.Recv(`SELECT id, parentId, name FROM ${CMemo.sCategoryTable} ORDER BY id DESC LIMIT 1`);
        const category = CMemo.RowToCategory(rows[0]);
        const tag = await CMemo.SuggestTag(_name, _provider, _model);
        if (tag.length > 0) {
            await CMemo.InsertCategoryTag(_folder, category.id, tag);
        }
        return category;
    }
    static async RenameCategory(_folder, _id, _newName, _provider, _model) {
        const db = await CMemo.Init(_folder);
        const rows = await db.Recv(`SELECT id, parentId, name FROM ${CMemo.sCategoryTable} WHERE id = ?`, [_id]);
        if (rows == null || rows.length === 0) {
            throw new Error('카테고리를 찾을 수 없습니다');
        }
        const category = CMemo.RowToCategory(rows[0]);
        const newTag = await CMemo.SuggestTag(_newName, _provider, _model);
        if (newTag.length > 0) {
            const siblingRows = await db.Recv(`SELECT 1 FROM ${CMemo.sCategoryTable} c JOIN ${CMemo.sCategoryTagTable} t ON t.categoryId = c.id
                 WHERE c.parentId = ? AND c.id != ? AND t.tag = ? LIMIT 1`, [category.parentId, _id, newTag]);
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
    static async MoveData(_folder, _id, _newCategoryId) {
        const db = await CMemo.Init(_folder);
        const rows = await db.Recv(`SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE id = ? LIMIT 1`, [_id]);
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
    static async DeleteCategory(_folder, _id) {
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
                const dataRows = await db.Recv(`SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE categoryId = ?`, [categoryId]);
                if (dataRows == null) {
                    continue;
                }
                for (const row of dataRows) {
                    const dataId = Number(row[0]);
                    await db.Send(`INSERT INTO ${CMemo.sDeletedTable} (dataId, categoryId, content, date, deletedTime) VALUES (?, ?, ?, ?, ?)`, [dataId, Number(row[1]), String(row[2]), Number(row[3]), CMemo.Now()]);
                    await db.Send(`DELETE FROM ${CMemo.sDataTagTable} WHERE dataId = ?`, [dataId]);
                    await db.Send(`DELETE FROM ${CMemo.sDataTable} WHERE id = ?`, [dataId]);
                    deletedDataCount++;
                }
            }
            const placeholders = ids.map(() => '?').join(',');
            await db.Send(`DELETE FROM ${CMemo.sCategoryTagTable} WHERE categoryId IN (${placeholders})`, ids);
            await db.Send(`DELETE FROM ${CMemo.sCategoryTable} WHERE id IN (${placeholders})`, ids);
            await db.Send('COMMIT');
        }
        catch (err) {
            await db.Send('ROLLBACK');
            throw err;
        }
        return { deletedCategoryIds: ids, deletedDataCount };
    }
    static async ListAllCategoryTags(_folder) {
        const db = await CMemo.Init(_folder);
        const rows = await db.Recv(`SELECT categoryId, tag FROM ${CMemo.sCategoryTagTable} ORDER BY categoryId ASC, tag ASC`);
        if (rows == null) {
            return [];
        }
        return rows.map(row => ({ categoryId: Number(row[0]), tag: String(row[1]) }));
    }
    static async InsertCategoryTag(_folder, _categoryId, _tag) {
        const db = await CMemo.Init(_folder);
        const tag = _tag.trim().toLowerCase();
        if (tag.length === 0) {
            return;
        }
        const existing = await db.Recv(`SELECT 1 FROM ${CMemo.sCategoryTagTable} WHERE categoryId = ? AND tag = ? LIMIT 1`, [_categoryId, tag]);
        if (existing != null && existing.length > 0) {
            return;
        }
        await db.Send(`INSERT INTO ${CMemo.sCategoryTagTable} (categoryId, tag) VALUES (?, ?)`, [_categoryId, tag]);
    }
    static async FindTaggedCategoryIds(_folder, _tags) {
        if (_tags.length === 0) {
            return [];
        }
        const db = await CMemo.Init(_folder);
        const rows = await db.Recv(`SELECT categoryId, tag FROM ${CMemo.sCategoryTagTable}`);
        if (rows == null || rows.length === 0) {
            return [];
        }
        const matchedCategoryIds = new Set();
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
        const result = new Set();
        for (const categoryId of matchedCategoryIds) {
            for (const id of CMemo.CollectDescendantIds(categoryId, all)) {
                result.add(id);
            }
        }
        return Array.from(result);
    }
    static async AddData(_folder, _categoryId, _content, _provider, _model) {
        const db = await CMemo.Init(_folder);
        const hashtags = CMemo.ExtractHashtags(_content);
        const manualTodo = CMemo.DetectTodoTag(_content);
        const info = await CMemo.ExtractWriteInfo(_content, _provider, _model);
        const tags = CMemo.UniqueTags([...info.tags, ...hashtags, ...manualTodo]);
        const content = CMemo.StripHashtags(_content);
        const date = CMemo.Now();
        try {
            await db.Send('BEGIN TRANSACTION');
            await db.Send(`INSERT INTO ${CMemo.sDataTable} (categoryId, content, date) VALUES (?, ?, ?)`, [_categoryId, content, date]);
            const rows = await db.Recv(`SELECT id FROM ${CMemo.sDataTable} WHERE categoryId = ? AND date = ? ORDER BY id DESC LIMIT 1`, [_categoryId, date]);
            const id = Number(rows[0][0]);
            await CMemo.InsertTags(db, id, date, tags);
            await db.Send('COMMIT');
            return { id, categoryId: _categoryId, content, tags, date };
        }
        catch (err) {
            await db.Send('ROLLBACK');
            throw err;
        }
    }
    static async AddDataAuto(_folder, _content, _provider, _model) {
        const tag = await CMemo.SuggestTag(_content, _provider, _model);
        const categoryId = await CMemo.ResolveOrCreateCategoryByTag(_folder, tag, _provider, _model);
        return await CMemo.AddData(_folder, categoryId, _content, _provider, _model);
    }
    static async ResolveOrCreateCategoryByTag(_folder, _tag, _provider, _model) {
        const db = await CMemo.Init(_folder);
        if (_tag.length > 0) {
            const rows = await db.Recv(`SELECT categoryId FROM ${CMemo.sCategoryTagTable} WHERE tag = ? ORDER BY categoryId ASC LIMIT 1`, [_tag]);
            if (rows != null && rows.length > 0) {
                return Number(rows[0][0]);
            }
        }
        const name = _tag.length > 0 ? _tag : 'misc';
        const category = await CMemo.AddCategory(_folder, name, 0, _provider, _model);
        return category.id;
    }
    static async ListData(_folder, _categoryId) {
        const db = await CMemo.Init(_folder);
        const rows = await db.Recv(`SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE categoryId = ? ORDER BY date DESC, id DESC`, [_categoryId]);
        if (rows == null) {
            return [];
        }
        const records = [];
        for (const row of rows) {
            records.push(await CMemo.RowToData(db, row));
        }
        return records;
    }
    static async ListRecentData(_folder, _limit) {
        const db = await CMemo.Init(_folder);
        const rows = await db.Recv(`SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} ORDER BY date DESC, id DESC LIMIT ?`, [_limit]);
        if (rows == null) {
            return [];
        }
        const records = [];
        for (const row of rows) {
            records.push(await CMemo.RowToData(db, row));
        }
        return records;
    }
    static async DeleteData(_folder, _id) {
        const db = await CMemo.Init(_folder);
        const rows = await db.Recv(`SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE id = ? LIMIT 1`, [_id]);
        if (rows == null || rows.length === 0) {
            return false;
        }
        const id = Number(rows[0][0]);
        const categoryId = Number(rows[0][1]);
        const content = String(rows[0][2]);
        const date = Number(rows[0][3]);
        try {
            await db.Send('BEGIN TRANSACTION');
            await db.Send(`INSERT INTO ${CMemo.sDeletedTable} (dataId, categoryId, content, date, deletedTime) VALUES (?, ?, ?, ?, ?)`, [id, categoryId, content, date, CMemo.Now()]);
            await db.Send(`DELETE FROM ${CMemo.sDataTagTable} WHERE dataId = ?`, [id]);
            await db.Send(`DELETE FROM ${CMemo.sDataTable} WHERE id = ?`, [id]);
            await db.Send('COMMIT');
            return true;
        }
        catch (err) {
            await db.Send('ROLLBACK');
            throw err;
        }
    }
    static async Search(_folder, _text, _categoryId, _provider, _model) {
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
    static async SearchById(_folder, _id) {
        const db = await CMemo.Init(_folder);
        const rows = await db.Recv(`SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE id = ? LIMIT 1`, [_id]);
        if (rows == null || rows.length === 0) {
            return `@${_id} 메모를 찾을 수 없습니다.`;
        }
        const record = await CMemo.RowToData(db, rows[0]);
        return `[${record.id}][${CMemo.FormatTime(record.date)}] ${record.content}`;
    }
    static async SearchByTag(_folder, _tag, _categoryId) {
        const tag = _tag.trim().toLowerCase();
        if (tag.length === 0) {
            return '태그가 비어 있습니다.';
        }
        const ids = await CMemo.FindDataIds(_folder, [tag], 'OR', 0, 99999999999999, _categoryId, false);
        if (ids.length === 0) {
            return `#${tag} 태그를 가진 메모가 없습니다.`;
        }
        const db = await CMemo.Init(_folder);
        const lines = [];
        for (const id of ids) {
            const rows = await db.Recv(`SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE id = ? LIMIT 1`, [id]);
            if (rows == null || rows.length === 0) {
                continue;
            }
            const record = await CMemo.RowToData(db, rows[0]);
            lines.push(`[${record.id}][${CMemo.FormatTime(record.date)}] ${record.content}`);
        }
        return lines.join('\n');
    }
    static async FindByDescription(_folder, _text, _categoryId, _provider, _model) {
        return await CMemo.FindMatchingData(_folder, _text, _categoryId, _provider, _model);
    }
    static async FindMatchingData(_folder, _text, _categoryId, _provider, _model) {
        const db = await CMemo.Init(_folder);
        const now = CMemo.Now();
        const monthAgo = CMemo.AddMonthTime(-1);
        const hashtags = CMemo.ExtractHashtags(_text);
        const manualTodo = CMemo.DetectTodoTag(_text);
        const info = await CMemo.ExtractReadInfo(_text, monthAgo, now, _provider, _model);
        const tags = CMemo.UniqueTags([...info.tags, ...hashtags, ...manualTodo]);
        const ids = await CMemo.FindDataIds(_folder, tags, info.tagMode, info.startTime, info.endTime, _categoryId, info.hasExplicitDate);
        const records = [];
        for (const id of ids) {
            const rows = await db.Recv(`SELECT id, categoryId, content, date FROM ${CMemo.sDataTable} WHERE id = ? LIMIT 1`, [id]);
            if (rows == null || rows.length === 0) {
                continue;
            }
            records.push(await CMemo.RowToData(db, rows[0]));
        }
        return records;
    }
    static async CreateTables(_db) {
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
    static RowToCategory(_row) {
        return {
            id: Number(_row[0]),
            parentId: Number(_row[1]),
            name: String(_row[2]),
        };
    }
    static async RowToData(_db, _row) {
        const id = Number(_row[0]);
        return {
            id,
            categoryId: Number(_row[1]),
            content: String(_row[2]),
            tags: await CMemo.GetTags(_db, id),
            date: Number(_row[3]),
        };
    }
    static CollectDescendantIds(_id, _all) {
        if (!_all.some(c => c.id === _id)) {
            return [];
        }
        const result = [_id];
        const stack = [_id];
        while (stack.length > 0) {
            const current = stack.pop();
            for (const child of _all.filter(c => c.parentId === current)) {
                result.push(child.id);
                stack.push(child.id);
            }
        }
        return result;
    }
    static async GetTags(_db, _dataId) {
        const rows = await _db.Recv(`SELECT tag FROM ${CMemo.sDataTagTable} WHERE dataId = ? ORDER BY tag ASC`, [_dataId]);
        if (rows == null) {
            return [];
        }
        return rows.map(row => String(row[0]));
    }
    static async InsertTags(_db, _dataId, _date, _tags) {
        for (const tag of CMemo.UniqueTags(_tags)) {
            await _db.Send(`INSERT INTO ${CMemo.sDataTagTable} (tag, dataId, date) VALUES (?, ?, ?)`, [tag, _dataId, _date]);
        }
    }
    static async FindDataIds(_folder, _tags, _tagMode, _startTime, _endTime, _categoryId, _hasExplicitDate) {
        const db = await CMemo.Init(_folder);
        const tags = CMemo.UniqueTags(_tags);
        if (tags.length === 0) {
            const categoryFilter = _categoryId != null ? `AND categoryId = ?` : '';
            const params = _categoryId != null ? [_startTime, _endTime, _categoryId] : [_startTime, _endTime];
            const rows = await db.Recv(`SELECT id FROM ${CMemo.sDataTable} WHERE date >= ? AND date <= ? ${categoryFilter} ORDER BY id ASC`, params);
            return rows == null ? [] : rows.map(row => Number(row[0]));
        }
        let resultIds = null;
        for (const tag of tags) {
            const matchedIds = await CMemo.FindIdsForSingleTag(_folder, tag, _startTime, _endTime, _categoryId, _hasExplicitDate);
            if (resultIds == null) {
                resultIds = matchedIds;
            }
            else if (_tagMode === 'OR') {
                resultIds = new Set([...resultIds, ...matchedIds]);
            }
            else {
                resultIds = new Set([...resultIds].filter(id => matchedIds.has(id)));
                if (resultIds.size === 0) {
                    break;
                }
            }
        }
        return Array.from(resultIds ?? new Set()).sort((a, b) => a - b);
    }
    static async FindIdsForSingleTag(_folder, _tag, _startTime, _endTime, _categoryId, _hasExplicitDate) {
        const db = await CMemo.Init(_folder);
        const categoryFilter = _categoryId != null ? `AND d.categoryId = ?` : '';
        const exactParams = [_startTime, _endTime, _tag];
        if (_categoryId != null) {
            exactParams.push(_categoryId);
        }
        const exactRows = await db.Recv(`SELECT DISTINCT k.dataId FROM ${CMemo.sDataTagTable} k
             JOIN ${CMemo.sDataTable} d ON d.id = k.dataId
             WHERE k.date >= ? AND k.date <= ? AND k.tag = ? ${categoryFilter}
             ORDER BY k.dataId ASC`, exactParams);
        let idSet = new Set(exactRows == null ? [] : exactRows.map(row => Number(row[0])));
        if (idSet.size === 0) {
            const likeParams = [_startTime, _endTime, _tag, _tag];
            if (_categoryId != null) {
                likeParams.push(_categoryId);
            }
            const likeRows = await db.Recv(`SELECT DISTINCT k.dataId FROM ${CMemo.sDataTagTable} k
                 JOIN ${CMemo.sDataTable} d ON d.id = k.dataId
                 WHERE k.date >= ? AND k.date <= ? AND (k.tag LIKE '%' || ? || '%' OR ? LIKE '%' || k.tag || '%') ${categoryFilter}
                 ORDER BY k.dataId ASC`, likeParams);
            idSet = new Set(likeRows == null ? [] : likeRows.map(row => Number(row[0])));
        }
        let taggedCategoryIds = await CMemo.FindTaggedCategoryIds(_folder, [_tag]);
        if (taggedCategoryIds.length > 0 && _categoryId != null) {
            const all = await CMemo.ListCategories(_folder);
            const scopeIds = new Set(CMemo.CollectDescendantIds(_categoryId, all));
            taggedCategoryIds = taggedCategoryIds.filter(id => scopeIds.has(id));
        }
        if (taggedCategoryIds.length > 0) {
            const placeholders = taggedCategoryIds.map(() => '?').join(',');
            const dateFilter = _hasExplicitDate ? `AND date >= ? AND date <= ?` : '';
            const taggedParams = _hasExplicitDate ? [...taggedCategoryIds, _startTime, _endTime] : taggedCategoryIds;
            const taggedRows = await db.Recv(`SELECT id FROM ${CMemo.sDataTable} WHERE categoryId IN (${placeholders}) ${dateFilter}`, taggedParams);
            if (taggedRows != null) {
                for (const row of taggedRows)
                    idSet.add(Number(row[0]));
            }
        }
        return idSet;
    }
    static Now() {
        return CMemo.DateToTime(new Date());
    }
    static DateToTime(_date) {
        const year = _date.getFullYear();
        const month = CMemo.Pad2(_date.getMonth() + 1);
        const day = CMemo.Pad2(_date.getDate());
        const hour = CMemo.Pad2(_date.getHours());
        const minute = CMemo.Pad2(_date.getMinutes());
        const second = CMemo.Pad2(_date.getSeconds());
        return Number(`${year}${month}${day}${hour}${minute}${second}`);
    }
    static AddMonthTime(_month) {
        const date = new Date();
        date.setMonth(date.getMonth() + _month);
        return CMemo.DateToTime(date);
    }
    static Pad2(_value) {
        return _value < 10 ? `0${_value}` : `${_value}`;
    }
    static FormatTime(_time) {
        const s = String(_time).padStart(14, '0');
        return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}`;
    }
    static UniqueTags(_tags) {
        const set = new Set();
        for (const tag of _tags) {
            const key = tag.trim().toLowerCase();
            if (key.length > 0) {
                set.add(key);
            }
        }
        return Array.from(set);
    }
    static ExtractHashtags(_text) {
        const matches = _text.match(/#\S+/g);
        if (matches == null) {
            return [];
        }
        return matches.map(tag => tag.slice(1)).filter(tag => tag.length > 0);
    }
    static StripHashtags(_text) {
        return _text.replace(/#\S+/g, ' ').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
    }
    static sTodoWords = [
        '해야', '할일', '할 일', '확인 필요', '확인필요', '예정',
        'todo', 'to-do', 'fixme',
    ];
    static DetectTodoTag(_text) {
        const lower = _text.toLowerCase();
        return CMemo.sTodoWords.some(word => lower.includes(word.toLowerCase())) ? ['todo'] : [];
    }
    static async SuggestTag(_text, _provider, _model) {
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
        const result = CMemo.ParseJson(await CMemo.RunCAI(lines.join('\n'), _provider, _model), { tag: trimmed });
        return (result.tag || trimmed).trim().toLowerCase();
    }
    static async ExtractWriteInfo(_text, _provider, _model) {
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
    static async ExtractReadInfo(_text, _defaultStart, _defaultEnd, _provider, _model) {
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
        const parsed = CMemo.ParseJson(await CMemo.RunCAI(prompt, _provider, _model), { tags: [_text], tagMode: 'OR', startTime: _defaultStart, endTime: _defaultEnd });
        const hasExplicitDate = parsed.startTime !== _defaultStart || parsed.endTime !== _defaultEnd;
        const tagMode = parsed.tagMode === 'AND' ? 'AND' : 'OR';
        return { tags: parsed.tags, tagMode, startTime: parsed.startTime, endTime: parsed.endTime, hasExplicitDate };
    }
    static async RunCAI(_prompt, _provider, _model) {
        const provider = _provider ?? CMemo.sProvider;
        const model = _model ?? CMemo.sModel;
        const { text } = await CAI.Chat(provider, model, process.cwd(), _prompt, false);
        return text.trim();
    }
    static ParseJson(_text, _fallback) {
        const json = CMemo.ExtractJson(_text);
        if (json == null) {
            return _fallback;
        }
        try {
            return JSON.parse(json);
        }
        catch {
            return _fallback;
        }
    }
    static ExtractJson(_text) {
        const start = _text.indexOf('{');
        const end = _text.lastIndexOf('}');
        if (start < 0 || end < start) {
            return null;
        }
        return _text.substring(start, end + 1);
    }
}

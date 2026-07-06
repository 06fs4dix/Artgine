import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer, isAuthedReq, isValidToken } from './CAuthServer.js';
import { CMemo } from './CMemo.js';
import { CAI } from '../util/CAI.js';

/*
Memo Router (카테고리 트리 + 플랫 데이터)
- 모든 엔드포인트는 folder(실제 파일 시스템 경로)를 받는다 - 그 폴더 안에 memo.sqlite를 직접 만들어(없으면 생성)
  폴더별로 완전히 독립된 sqlite 파일에 저장/조회된다(CMemo 참고).
  GET 엔드포인트는 쿼리스트링 folder, POST 엔드포인트는 body의 folder.
  folder를 생략하거나 빈 값이면 폴더 구분 이전부터 쓰던 기존 기본 파일(./db/memo.sqlite)을 그대로 쓴다.
- /Memo/Category/List    GET   folder -> 전체 카테고리 플랫 목록(parentId로 트리 구성은 클라이언트에서)
- /Memo/Category/Add     POST  folder, name, parentId, provider?, model? -> 카테고리 추가(이름으로 Tag/Suggest해서 자동 태그 부여)
- /Memo/Category/Delete  POST  folder, id -> 카테고리+하위 카테고리+그 아래 데이터 전부 삭제(cascade)
- /Memo/Category/Rename  POST  folder, id, name, provider?, model? -> 카테고리 이름 변경(태그도 새 이름으로 Tag/Suggest해서 교체).
  같은 부모 아래 다른 카테고리가 이미 그 태그를 가지고 있으면 거부(400)한다.
- /Memo/Tag/Suggest      POST  text, provider?, model? -> 텍스트를 대표하는 태그 하나 추출(영어 소문자로 정규화)
- /Memo/Data/List        GET   folder, categoryId -> 해당 카테고리의 데이터(메모) 목록, 최신순
- /Memo/Data/Add         POST  folder, categoryId?, text, provider?, model? -> 데이터 추가(태그 자동 추출).
  categoryId를 생략하면 내용으로 Tag/Suggest해서 그 태그를 가진 카테고리를 찾아 저장하고, 없으면 그 태그 이름으로 카테고리를 새로 만들어 저장한다.
- /Memo/Data/Delete      POST  folder, id -> 데이터 단건 삭제
- /Memo/Data/FindByDescription POST folder, text, categoryId?, provider?, model? -> 설명으로 삭제 후보 찾기(삭제는 안 함)
- /Memo/Search           POST  folder, text, categoryId?, provider?, model? -> AI 기반 검색(categoryId 없으면 전체)
*/

@URLPatterns([
    "/Memo/Category/List", "/Memo/Category/Add", "/Memo/Category/Delete", "/Memo/Category/Rename",
    "/Memo/Tag/Suggest",
    "/Memo/Data/List", "/Memo/Data/ListRecent", "/Memo/Data/Add", "/Memo/Data/Delete", "/Memo/Data/FindByDescription",
    "/Memo/Search",
])
export class CMemoRouter extends CAuthServer {
    // 토큰이 같이 오면 토큰 기준으로, 없으면 기존 세션 쿠키 기준으로 인증한다.
    // cross-origin(RDP로 전환된 원격 서버) 요청은 쿠키가 기본적으로 전달되지 않으므로 토큰이 필요하다.
    private IsAuth(_json: CJSON, req: Request): boolean {
        const token = _json.GetStr('token');
        return token ? isValidToken(token) : isAuthedReq(req);
    }

    // POST 계열은 body(_json), GET 계열은 querystring에서 folder를 읽는다.
    private GetFolder(_json: CJSON, _req: Request): string {
        return _json.GetStr('folder') || (_req.query.folder as string) || '';
    }

    constructor() {
        super();
        this.On("/Memo/Category/List", this.onCategoryList.bind(this));
        this.On("/Memo/Category/Add", this.onCategoryAdd.bind(this));
        this.On("/Memo/Category/Delete", this.onCategoryDelete.bind(this));
        this.On("/Memo/Category/Rename", this.onCategoryRename.bind(this));
        this.On("/Memo/Tag/Suggest", this.onTagSuggest.bind(this));
        this.On("/Memo/Data/List", this.onDataList.bind(this));
        this.On("/Memo/Data/ListRecent", this.onDataListRecent.bind(this));
        this.On("/Memo/Data/Add", this.onDataAdd.bind(this));
        this.On("/Memo/Data/Delete", this.onDataDelete.bind(this));
        this.On("/Memo/Data/FindByDescription", this.onDataFindByDescription.bind(this));
        this.On("/Memo/Search", this.onSearch.bind(this));
    }

    async onCategoryList(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const folder = this.GetFolder(_json, _req);

        const categories = await CMemo.ListCategories(folder);
        const tags = await CMemo.ListAllCategoryTags(folder);
        _res.json({ ok: true, categories, tags });
        return null;
    }

    async onCategoryAdd(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const folder = this.GetFolder(_json, _req);

        const name = _json.GetStr('name');
        if (!name) { _res.status(400).json({ ok: false, msg: 'name 필요' }); return null; }
        const parentIdRaw = _json.GetInt('parentId');
        const parentId = parentIdRaw == null ? 0 : Number(parentIdRaw);
        const providerStr = _json.GetStr('provider') as string | undefined;
        const provider = providerStr ? (providerStr as CAI.eProvider) : undefined;
        const model = _json.GetStr('model') as string | undefined;

        try {
            const category = await CMemo.AddCategory(folder, name, parentId, provider, model);
            _res.json({ ok: true, category });
        } catch (e: any) {
            _res.status(500).json({ ok: false, msg: e?.message || 'AI call failed' });
        }
        return null;
    }

    async onCategoryDelete(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const folder = this.GetFolder(_json, _req);

        const idRaw = _json.GetInt('id');
        if (idRaw == null) { _res.status(400).json({ ok: false, msg: 'id 필요' }); return null; }

        const result = await CMemo.DeleteCategory(folder, Number(idRaw));
        if (result.deletedCategoryIds.length === 0) { _res.status(404).json({ ok: false, msg: '해당 id 카테고리를 찾을 수 없음' }); return null; }

        _res.json({ ok: true, deletedCategoryIds: result.deletedCategoryIds, deletedDataCount: result.deletedDataCount });
        return null;
    }

    async onCategoryRename(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const folder = this.GetFolder(_json, _req);

        const idRaw = _json.GetInt('id');
        const name = _json.GetStr('name');
        if (idRaw == null || !name) { _res.status(400).json({ ok: false, msg: 'id, name 필요' }); return null; }
        const providerStr = _json.GetStr('provider') as string | undefined;
        const provider = providerStr ? (providerStr as CAI.eProvider) : undefined;
        const model = _json.GetStr('model') as string | undefined;

        try {
            const category = await CMemo.RenameCategory(folder, Number(idRaw), name, provider, model);
            _res.json({ ok: true, category });
        } catch (e: any) {
            _res.status(400).json({ ok: false, msg: e?.message || 'Rename failed' });
        }
        return null;
    }

    async onTagSuggest(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const text = _json.GetStr('text');
        if (!text) { _res.status(400).json({ ok: false, msg: 'text 필요' }); return null; }

        const providerStr = _json.GetStr('provider') as string | undefined;
        const provider = providerStr ? (providerStr as CAI.eProvider) : undefined;
        const model = _json.GetStr('model') as string | undefined;

        try {
            const tag = await CMemo.SuggestTag(text, provider, model);
            _res.json({ ok: true, tag });
        } catch (e: any) {
            _res.status(500).json({ ok: false, msg: e?.message || 'AI call failed' });
        }
        return null;
    }

    async onDataList(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const folder = this.GetFolder(_json, _req);

        const categoryIdRaw = parseInt(_req.query.categoryId as string);
        if (isNaN(categoryIdRaw)) { _res.status(400).json({ ok: false, msg: 'categoryId 필요' }); return null; }

        const data = await CMemo.ListData(folder, categoryIdRaw);
        _res.json({ ok: true, data });
        return null;
    }

    async onDataListRecent(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const folder = this.GetFolder(_json, _req);

        const limitRaw = parseInt(_req.query.limit as string);
        const limit = isNaN(limitRaw) ? 30 : limitRaw;

        const data = await CMemo.ListRecentData(folder, limit);
        _res.json({ ok: true, data });
        return null;
    }

    async onDataAdd(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const folder = this.GetFolder(_json, _req);

        const categoryIdRaw = _json.GetInt('categoryId');
        const text = _json.GetStr('text');
        if (!text) { _res.status(400).json({ ok: false, msg: 'text 필요' }); return null; }

        const providerStr = _json.GetStr('provider') as string | undefined;
        const provider = providerStr ? (providerStr as CAI.eProvider) : undefined;
        const model = _json.GetStr('model') as string | undefined;

        try {
            // categoryId를 생략하면 내용으로 태그를 뽑아 그 태그를 가진 카테고리에 저장하고,
            // 없으면 그 태그 이름으로 카테고리를 새로 만들어 저장한다(CMemo.AddDataAuto 참고).
            const data = categoryIdRaw == null
                ? await CMemo.AddDataAuto(folder, text, provider, model)
                : await CMemo.AddData(folder, Number(categoryIdRaw), text, provider, model);
            _res.json({ ok: true, data });
        } catch (e: any) {
            // CAI.Chat은 설치는 자동으로 처리하므로, 평범한 상황에서 여기로 오는 에러는 대부분 미인증 상태다.
            _res.status(500).json({ ok: false, msg: e?.message || 'AI call failed' });
        }
        return null;
    }

    async onDataDelete(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const folder = this.GetFolder(_json, _req);

        const idRaw = _json.GetInt('id');
        if (idRaw == null) { _res.status(400).json({ ok: false, msg: 'id 필요' }); return null; }

        const deleted = await CMemo.DeleteData(folder, Number(idRaw));
        if (!deleted) { _res.status(404).json({ ok: false, msg: '해당 id 데이터를 찾을 수 없음' }); return null; }

        _res.json({ ok: true });
        return null;
    }

    async onDataFindByDescription(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const folder = this.GetFolder(_json, _req);

        const text = _json.GetStr('text');
        if (!text) { _res.status(400).json({ ok: false, msg: 'text 필요' }); return null; }

        const categoryIdRaw = _json.GetInt('categoryId');
        const categoryId = categoryIdRaw == null ? null : Number(categoryIdRaw);
        const providerStr = _json.GetStr('provider') as string | undefined;
        const provider = providerStr ? (providerStr as CAI.eProvider) : undefined;
        const model = _json.GetStr('model') as string | undefined;

        try {
            const data = await CMemo.FindByDescription(folder, text, categoryId, provider, model);
            _res.json({ ok: true, data });
        } catch (e: any) {
            _res.status(500).json({ ok: false, msg: e?.message || 'AI call failed' });
        }
        return null;
    }

    async onSearch(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const folder = this.GetFolder(_json, _req);

        const text = _json.GetStr('text');
        if (!text) { _res.status(400).json({ ok: false, msg: 'text 필요' }); return null; }

        const categoryIdRaw = _json.GetInt('categoryId');
        const categoryId = categoryIdRaw == null ? null : Number(categoryIdRaw);
        const providerStr = _json.GetStr('provider') as string | undefined;
        const provider = providerStr ? (providerStr as CAI.eProvider) : undefined;
        const model = _json.GetStr('model') as string | undefined;

        try {
            const result = await CMemo.Search(folder, text, categoryId, provider, model);
            _res.json({ ok: true, result });
        } catch (e: any) {
            _res.status(500).json({ ok: false, msg: e?.message || 'AI call failed' });
        }
        return null;
    }
}

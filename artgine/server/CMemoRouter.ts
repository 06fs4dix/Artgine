import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer, isAuthedReq, isValidToken } from './CAuthServer.js';
import { CMemo } from './CMemo.js';
import { CAI } from '../util/CAI.js';

/*
Memo Router (카테고리 트리 + 플랫 데이터)
- /Memo/Category/List    GET   -> 전체 카테고리 플랫 목록(parentId로 트리 구성은 클라이언트에서)
- /Memo/Category/Add     POST  name, parentId -> 카테고리 추가
- /Memo/Category/Delete  POST  id -> 카테고리+하위 카테고리+그 아래 데이터 전부 삭제(cascade)
- /Memo/Category/Suggest POST  text, provider?, model? -> 내용과 어울리는 카테고리 AI 추천(없으면 null)
- /Memo/Category/Tag/List   GET   categoryId -> 그 카테고리의 태그 목록
- /Memo/Category/Tag/Add    POST  categoryId, tag -> 태그 추가(하위 카테고리까지 검색 시 상속됨)
- /Memo/Category/Tag/Remove POST  categoryId, tag -> 태그 제거
- /Memo/Data/List        GET   categoryId -> 해당 카테고리의 데이터(메모) 목록, 최신순
- /Memo/Data/Add         POST  categoryId, text, provider?, model? -> 데이터 추가(태그 자동 추출)
- /Memo/Data/Delete      POST  id -> 데이터 단건 삭제
- /Memo/Data/FindByDescription POST text, categoryId?, provider?, model? -> 설명으로 삭제 후보 찾기(삭제는 안 함)
- /Memo/Search           POST  text, categoryId?, provider?, model? -> AI 기반 검색(categoryId 없으면 전체)
*/

@URLPatterns([
    "/Memo/Category/List", "/Memo/Category/Add", "/Memo/Category/Delete", "/Memo/Category/Suggest",
    "/Memo/Category/Tag/List", "/Memo/Category/Tag/Add", "/Memo/Category/Tag/Remove",
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

    constructor() {
        super();
        this.On("/Memo/Category/List", this.onCategoryList.bind(this));
        this.On("/Memo/Category/Add", this.onCategoryAdd.bind(this));
        this.On("/Memo/Category/Delete", this.onCategoryDelete.bind(this));
        this.On("/Memo/Category/Suggest", this.onCategorySuggest.bind(this));
        this.On("/Memo/Category/Tag/List", this.onCategoryTagList.bind(this));
        this.On("/Memo/Category/Tag/Add", this.onCategoryTagAdd.bind(this));
        this.On("/Memo/Category/Tag/Remove", this.onCategoryTagRemove.bind(this));
        this.On("/Memo/Data/List", this.onDataList.bind(this));
        this.On("/Memo/Data/ListRecent", this.onDataListRecent.bind(this));
        this.On("/Memo/Data/Add", this.onDataAdd.bind(this));
        this.On("/Memo/Data/Delete", this.onDataDelete.bind(this));
        this.On("/Memo/Data/FindByDescription", this.onDataFindByDescription.bind(this));
        this.On("/Memo/Search", this.onSearch.bind(this));
    }

    async onCategoryList(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const categories = await CMemo.ListCategories();
        const tags = await CMemo.ListAllCategoryTags();
        _res.json({ ok: true, categories, tags });
        return null;
    }

    async onCategoryAdd(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const name = _json.GetStr('name');
        if (!name) { _res.status(400).json({ ok: false, msg: 'name 필요' }); return null; }
        const parentIdRaw = _json.GetInt('parentId');
        const parentId = parentIdRaw == null ? 0 : Number(parentIdRaw);

        const category = await CMemo.AddCategory(name, parentId);
        _res.json({ ok: true, category });
        return null;
    }

    async onCategoryDelete(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const idRaw = _json.GetInt('id');
        if (idRaw == null) { _res.status(400).json({ ok: false, msg: 'id 필요' }); return null; }

        const result = await CMemo.DeleteCategory(Number(idRaw));
        if (result.deletedCategoryIds.length === 0) { _res.status(404).json({ ok: false, msg: '해당 id 카테고리를 찾을 수 없음' }); return null; }

        _res.json({ ok: true, deletedCategoryIds: result.deletedCategoryIds, deletedDataCount: result.deletedDataCount });
        return null;
    }

    async onCategorySuggest(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const text = _json.GetStr('text');
        if (!text) { _res.status(400).json({ ok: false, msg: 'text 필요' }); return null; }

        const providerStr = _json.GetStr('provider') as string | undefined;
        const provider = providerStr ? (providerStr as CAI.eProvider) : undefined;
        const model = _json.GetStr('model') as string | undefined;

        try {
            const category = await CMemo.SuggestCategory(text, provider, model);
            _res.json({ ok: true, category });
        } catch (e: any) {
            _res.status(500).json({ ok: false, msg: e?.message || 'AI call failed' });
        }
        return null;
    }

    async onCategoryTagList(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const categoryIdRaw = parseInt(_req.query.categoryId as string);
        if (isNaN(categoryIdRaw)) { _res.status(400).json({ ok: false, msg: 'categoryId 필요' }); return null; }

        const tags = await CMemo.ListCategoryTags(categoryIdRaw);
        _res.json({ ok: true, tags });
        return null;
    }

    async onCategoryTagAdd(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const categoryIdRaw = _json.GetInt('categoryId');
        const tag = _json.GetStr('tag');
        if (categoryIdRaw == null || !tag) { _res.status(400).json({ ok: false, msg: 'categoryId, tag 필요' }); return null; }

        await CMemo.AddCategoryTag(Number(categoryIdRaw), tag);
        const tags = await CMemo.ListCategoryTags(Number(categoryIdRaw));
        _res.json({ ok: true, tags });
        return null;
    }

    async onCategoryTagRemove(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const categoryIdRaw = _json.GetInt('categoryId');
        const tag = _json.GetStr('tag');
        if (categoryIdRaw == null || !tag) { _res.status(400).json({ ok: false, msg: 'categoryId, tag 필요' }); return null; }

        await CMemo.RemoveCategoryTag(Number(categoryIdRaw), tag);
        const tags = await CMemo.ListCategoryTags(Number(categoryIdRaw));
        _res.json({ ok: true, tags });
        return null;
    }

    async onDataList(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const categoryIdRaw = parseInt(_req.query.categoryId as string);
        if (isNaN(categoryIdRaw)) { _res.status(400).json({ ok: false, msg: 'categoryId 필요' }); return null; }

        const data = await CMemo.ListData(categoryIdRaw);
        _res.json({ ok: true, data });
        return null;
    }

    async onDataListRecent(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const limitRaw = parseInt(_req.query.limit as string);
        const limit = isNaN(limitRaw) ? 30 : limitRaw;

        const data = await CMemo.ListRecentData(limit);
        _res.json({ ok: true, data });
        return null;
    }

    async onDataAdd(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const categoryIdRaw = _json.GetInt('categoryId');
        const text = _json.GetStr('text');
        if (categoryIdRaw == null || !text) { _res.status(400).json({ ok: false, msg: 'categoryId, text 필요' }); return null; }

        const providerStr = _json.GetStr('provider') as string | undefined;
        const provider = providerStr ? (providerStr as CAI.eProvider) : undefined;
        const model = _json.GetStr('model') as string | undefined;

        try {
            const data = await CMemo.AddData(Number(categoryIdRaw), text, provider, model);
            _res.json({ ok: true, data });
        } catch (e: any) {
            // CAI.Chat은 설치는 자동으로 처리하므로, 평범한 상황에서 여기로 오는 에러는 대부분 미인증 상태다.
            _res.status(500).json({ ok: false, msg: e?.message || 'AI call failed' });
        }
        return null;
    }

    async onDataDelete(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const idRaw = _json.GetInt('id');
        if (idRaw == null) { _res.status(400).json({ ok: false, msg: 'id 필요' }); return null; }

        const deleted = await CMemo.DeleteData(Number(idRaw));
        if (!deleted) { _res.status(404).json({ ok: false, msg: '해당 id 데이터를 찾을 수 없음' }); return null; }

        _res.json({ ok: true });
        return null;
    }

    async onDataFindByDescription(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const text = _json.GetStr('text');
        if (!text) { _res.status(400).json({ ok: false, msg: 'text 필요' }); return null; }

        const categoryIdRaw = _json.GetInt('categoryId');
        const categoryId = categoryIdRaw == null ? null : Number(categoryIdRaw);
        const providerStr = _json.GetStr('provider') as string | undefined;
        const provider = providerStr ? (providerStr as CAI.eProvider) : undefined;
        const model = _json.GetStr('model') as string | undefined;

        try {
            const data = await CMemo.FindByDescription(text, categoryId, provider, model);
            _res.json({ ok: true, data });
        } catch (e: any) {
            _res.status(500).json({ ok: false, msg: e?.message || 'AI call failed' });
        }
        return null;
    }

    async onSearch(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const text = _json.GetStr('text');
        if (!text) { _res.status(400).json({ ok: false, msg: 'text 필요' }); return null; }

        const categoryIdRaw = _json.GetInt('categoryId');
        const categoryId = categoryIdRaw == null ? null : Number(categoryIdRaw);
        const providerStr = _json.GetStr('provider') as string | undefined;
        const provider = providerStr ? (providerStr as CAI.eProvider) : undefined;
        const model = _json.GetStr('model') as string | undefined;

        try {
            const result = await CMemo.Search(text, categoryId, provider, model);
            _res.json({ ok: true, result });
        } catch (e: any) {
            _res.status(500).json({ ok: false, msg: e?.message || 'AI call failed' });
        }
        return null;
    }
}

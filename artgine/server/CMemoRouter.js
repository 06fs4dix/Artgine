var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { URLPatterns } from '../network/CServerMain.js';
import { CAuthServer, isAuthedReq, isValidToken } from './CAuthServer.js';
import { CMemo } from './CMemo.js';
let CMemoRouter = class CMemoRouter extends CAuthServer {
    IsAuth(_json, req) {
        const token = _json.GetStr('token');
        return token ? isValidToken(token) : isAuthedReq(req);
    }
    GetFolder(_json, _req) {
        return _json.GetStr('folder') || _req.query.folder || '';
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
        this.On("/Memo/Data/Move", this.onDataMove.bind(this));
        this.On("/Memo/Data/FindByDescription", this.onDataFindByDescription.bind(this));
        this.On("/Memo/Search", this.onSearch.bind(this));
    }
    async onCategoryList(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const folder = this.GetFolder(_json, _req);
        const categories = await CMemo.ListCategories(folder);
        const tags = await CMemo.ListAllCategoryTags(folder);
        _res.json({ ok: true, categories, tags });
        return null;
    }
    async onCategoryAdd(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const folder = this.GetFolder(_json, _req);
        const name = _json.GetStr('name');
        if (!name) {
            _res.status(400).json({ ok: false, msg: 'name 필요' });
            return null;
        }
        const parentIdRaw = _json.GetInt('parentId');
        const parentId = parentIdRaw == null ? 0 : Number(parentIdRaw);
        const providerStr = _json.GetStr('provider');
        const provider = providerStr ? providerStr : undefined;
        const model = _json.GetStr('model');
        try {
            const category = await CMemo.AddCategory(folder, name, parentId, provider, model);
            _res.json({ ok: true, category });
        }
        catch (e) {
            _res.status(500).json({ ok: false, msg: e?.message || 'AI call failed' });
        }
        return null;
    }
    async onCategoryDelete(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const folder = this.GetFolder(_json, _req);
        const idRaw = _json.GetInt('id');
        if (idRaw == null) {
            _res.status(400).json({ ok: false, msg: 'id 필요' });
            return null;
        }
        const result = await CMemo.DeleteCategory(folder, Number(idRaw));
        if (result.deletedCategoryIds.length === 0) {
            _res.status(404).json({ ok: false, msg: '해당 id 카테고리를 찾을 수 없음' });
            return null;
        }
        _res.json({ ok: true, deletedCategoryIds: result.deletedCategoryIds, deletedDataCount: result.deletedDataCount });
        return null;
    }
    async onCategoryRename(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const folder = this.GetFolder(_json, _req);
        const idRaw = _json.GetInt('id');
        const name = _json.GetStr('name');
        if (idRaw == null || !name) {
            _res.status(400).json({ ok: false, msg: 'id, name 필요' });
            return null;
        }
        const providerStr = _json.GetStr('provider');
        const provider = providerStr ? providerStr : undefined;
        const model = _json.GetStr('model');
        try {
            const category = await CMemo.RenameCategory(folder, Number(idRaw), name, provider, model);
            _res.json({ ok: true, category });
        }
        catch (e) {
            _res.status(400).json({ ok: false, msg: e?.message || 'Rename failed' });
        }
        return null;
    }
    async onTagSuggest(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const text = _json.GetStr('text');
        if (!text) {
            _res.status(400).json({ ok: false, msg: 'text 필요' });
            return null;
        }
        const providerStr = _json.GetStr('provider');
        const provider = providerStr ? providerStr : undefined;
        const model = _json.GetStr('model');
        try {
            const tag = await CMemo.SuggestTag(text, provider, model);
            _res.json({ ok: true, tag });
        }
        catch (e) {
            _res.status(500).json({ ok: false, msg: e?.message || 'AI call failed' });
        }
        return null;
    }
    async onDataList(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const folder = this.GetFolder(_json, _req);
        const categoryIdRaw = parseInt(_req.query.categoryId);
        if (isNaN(categoryIdRaw)) {
            _res.status(400).json({ ok: false, msg: 'categoryId 필요' });
            return null;
        }
        const data = await CMemo.ListData(folder, categoryIdRaw);
        _res.json({ ok: true, data });
        return null;
    }
    async onDataListRecent(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const folder = this.GetFolder(_json, _req);
        const limitRaw = parseInt(_req.query.limit);
        const limit = isNaN(limitRaw) ? 30 : limitRaw;
        const data = await CMemo.ListRecentData(folder, limit);
        _res.json({ ok: true, data });
        return null;
    }
    async onDataAdd(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const folder = this.GetFolder(_json, _req);
        const categoryIdRaw = _json.GetInt('categoryId');
        const text = _json.GetStr('text');
        if (!text) {
            _res.status(400).json({ ok: false, msg: 'text 필요' });
            return null;
        }
        const providerStr = _json.GetStr('provider');
        const provider = providerStr ? providerStr : undefined;
        const model = _json.GetStr('model');
        try {
            const data = categoryIdRaw == null
                ? await CMemo.AddDataAuto(folder, text, provider, model)
                : await CMemo.AddData(folder, Number(categoryIdRaw), text, provider, model);
            _res.json({ ok: true, data });
        }
        catch (e) {
            _res.status(500).json({ ok: false, msg: e?.message || 'AI call failed' });
        }
        return null;
    }
    async onDataDelete(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const folder = this.GetFolder(_json, _req);
        const idRaw = _json.GetInt('id');
        if (idRaw == null) {
            _res.status(400).json({ ok: false, msg: 'id 필요' });
            return null;
        }
        const deleted = await CMemo.DeleteData(folder, Number(idRaw));
        if (!deleted) {
            _res.status(404).json({ ok: false, msg: '해당 id 데이터를 찾을 수 없음' });
            return null;
        }
        _res.json({ ok: true });
        return null;
    }
    async onDataMove(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const folder = this.GetFolder(_json, _req);
        const idRaw = _json.GetInt('id');
        const categoryIdRaw = _json.GetInt('categoryId');
        if (idRaw == null || categoryIdRaw == null) {
            _res.status(400).json({ ok: false, msg: 'id, categoryId 필요' });
            return null;
        }
        try {
            const data = await CMemo.MoveData(folder, Number(idRaw), Number(categoryIdRaw));
            _res.json({ ok: true, data });
        }
        catch (e) {
            _res.status(400).json({ ok: false, msg: e?.message || 'Move failed' });
        }
        return null;
    }
    async onDataFindByDescription(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const folder = this.GetFolder(_json, _req);
        const text = _json.GetStr('text');
        if (!text) {
            _res.status(400).json({ ok: false, msg: 'text 필요' });
            return null;
        }
        const categoryIdRaw = _json.GetInt('categoryId');
        const categoryId = categoryIdRaw == null ? null : Number(categoryIdRaw);
        const providerStr = _json.GetStr('provider');
        const provider = providerStr ? providerStr : undefined;
        const model = _json.GetStr('model');
        try {
            const data = await CMemo.FindByDescription(folder, text, categoryId, provider, model);
            _res.json({ ok: true, data });
        }
        catch (e) {
            _res.status(500).json({ ok: false, msg: e?.message || 'AI call failed' });
        }
        return null;
    }
    async onSearch(_json, _req, _res) {
        if (!this.IsAuth(_json, _req)) {
            _res.status(401).json({ ok: false, msg: 'Authentication required' });
            return null;
        }
        const folder = this.GetFolder(_json, _req);
        const text = _json.GetStr('text');
        if (!text) {
            _res.status(400).json({ ok: false, msg: 'text 필요' });
            return null;
        }
        const categoryIdRaw = _json.GetInt('categoryId');
        const categoryId = categoryIdRaw == null ? null : Number(categoryIdRaw);
        const providerStr = _json.GetStr('provider');
        const provider = providerStr ? providerStr : undefined;
        const model = _json.GetStr('model');
        try {
            const result = await CMemo.Search(folder, text, categoryId, provider, model);
            _res.json({ ok: true, result });
        }
        catch (e) {
            _res.status(500).json({ ok: false, msg: e?.message || 'AI call failed' });
        }
        return null;
    }
};
CMemoRouter = __decorate([
    URLPatterns([
        "/Memo/Category/List", "/Memo/Category/Add", "/Memo/Category/Delete", "/Memo/Category/Rename",
        "/Memo/Tag/Suggest",
        "/Memo/Data/List", "/Memo/Data/ListRecent", "/Memo/Data/Add", "/Memo/Data/Delete", "/Memo/Data/Move", "/Memo/Data/FindByDescription",
        "/Memo/Search",
    ])
], CMemoRouter);
export { CMemoRouter };

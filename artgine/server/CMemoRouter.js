var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { URLPatterns } from '../network/CServerMain.js';
import { CAuthServer } from './CAuthServer.js';
import { CMemo } from './CMemo.js';
let CMemoRouter = class CMemoRouter extends CAuthServer {
    GetKey(_json, _req) {
        return _json.GetStr('key') || _req.query.key || '';
    }
    GetPassword(_json, _req) {
        return _json.GetStr('password') || _req.query.password || null;
    }
    constructor() {
        super();
        this.On("/Memo/Connect", this.onConnect.bind(this));
        this.On("/Memo/Rename", this.onRename.bind(this));
        this.On("/Memo/Keys", this.onKeys.bind(this));
        this.On("/Memo/List", this.onList.bind(this));
        this.On("/Memo/Get", this.onGet.bind(this));
        this.On("/Memo/Save", this.onSave.bind(this));
        this.On("/Memo/Delete", this.onDelete.bind(this));
    }
    async onConnect(_json, _req, _res) {
        try {
            const key = await CMemo.Connect(_json.GetStr('key') || '', this.GetPassword(_json, _req));
            _res.json({ ok: true, key });
        }
        catch (e) {
            _res.json({ ok: false, msg: e?.message || 'Connect failed' });
        }
        return null;
    }
    async onRename(_json, _req, _res) {
        const key = this.GetKey(_json, _req);
        const newKey = _json.GetStr('newKey') || _req.query.newKey || '';
        if (!key || !newKey) {
            _res.status(400).json({ ok: false, msg: 'key, newKey 필요' });
            return null;
        }
        try {
            const renamed = await CMemo.Rename(key, newKey);
            _res.json({ ok: true, key: renamed });
        }
        catch (e) {
            _res.status(400).json({ ok: false, msg: e?.message || 'Rename failed' });
        }
        return null;
    }
    async onKeys(_json, _req, _res) {
        try {
            const data = await CMemo.ListKeys();
            _res.json({ ok: true, data });
        }
        catch (e) {
            _res.status(400).json({ ok: false, msg: e?.message || 'Keys failed' });
        }
        return null;
    }
    async onList(_json, _req, _res) {
        const key = this.GetKey(_json, _req);
        if (!key) {
            _res.status(400).json({ ok: false, msg: 'key 필요' });
            return null;
        }
        try {
            const data = await CMemo.List(key, this.GetPassword(_json, _req));
            _res.json({ ok: true, data });
        }
        catch (e) {
            _res.status(400).json({ ok: false, msg: e?.message || 'List failed' });
        }
        return null;
    }
    async onGet(_json, _req, _res) {
        const key = this.GetKey(_json, _req);
        const id = _req.query.id || '';
        if (!key || !id) {
            _res.status(400).json({ ok: false, msg: 'key, id 필요' });
            return null;
        }
        try {
            const data = await CMemo.Get(key, id, this.GetPassword(_json, _req));
            if (!data) {
                _res.status(404).json({ ok: false, msg: '해당 id 메모를 찾을 수 없음' });
                return null;
            }
            _res.json({ ok: true, data });
        }
        catch (e) {
            _res.status(400).json({ ok: false, msg: e?.message || 'Get failed' });
        }
        return null;
    }
    async onSave(_json, _req, _res) {
        const key = this.GetKey(_json, _req);
        const text = _json.GetStr('text');
        if (!key || text == null) {
            _res.status(400).json({ ok: false, msg: 'key, text 필요' });
            return null;
        }
        const id = _json.GetStr('id') || null;
        try {
            const data = await CMemo.Save(key, id, text, this.GetPassword(_json, _req));
            _res.json({ ok: true, data });
        }
        catch (e) {
            _res.status(400).json({ ok: false, msg: e?.message || 'Save failed' });
        }
        return null;
    }
    async onDelete(_json, _req, _res) {
        const key = this.GetKey(_json, _req);
        const id = _json.GetStr('id');
        if (!key || !id) {
            _res.status(400).json({ ok: false, msg: 'key, id 필요' });
            return null;
        }
        try {
            const deleted = await CMemo.Delete(key, id, this.GetPassword(_json, _req));
            if (!deleted) {
                _res.status(404).json({ ok: false, msg: '해당 id 메모를 찾을 수 없음' });
                return null;
            }
            _res.json({ ok: true });
        }
        catch (e) {
            _res.status(400).json({ ok: false, msg: e?.message || 'Delete failed' });
        }
        return null;
    }
};
CMemoRouter = __decorate([
    URLPatterns([
        "/Memo/Connect", "/Memo/Rename", "/Memo/Keys", "/Memo/List", "/Memo/Get", "/Memo/Save", "/Memo/Delete",
    ])
], CMemoRouter);
export { CMemoRouter };

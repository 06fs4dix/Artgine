import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer } from './CAuthServer.js';
import { CMemo } from './CMemo.js';

/*
Memo Router (단순 파일 기반 메모앱)
- 사이트 전체 로그인과 무관하게 미인증 접근을 허용한다 - 대신 key(폴더) 이름 자체가 사실상의 비밀이고,
  추가로 password를 걸면(CMemo 참고) 그 key 안 메모는 AES-256-GCM으로 암호화된다.
- 카테고리/AI 검색 없음. 접속(key) / 리스트 / 저장(자동저장) / 삭제만 있다.
- key는 db/Memo/<key>/ 폴더 하나에 대응한다 (CMemo 참고). 메모 하나 = 그 폴더 안 txt 파일 하나.
- /Memo/Connect  POST  key?, password? -> 폴더 확보(key 없으면 접속 시각으로 발급), key 반환
    - password를 주면: 처음이면 그 key를 암호화 모드로 전환(기존 평문 메모도 함께 암호화 변환), 이미 암호화 모드면 검증만.
    - 이미 암호화 모드인 key에 password 없이 접속하면 에러.
- /Memo/Rename   POST  key, newKey -> key 폴더 자체의 이름을 바꾼다(안의 메모/암호화 상태도 함께 이동), 새 key 반환
- /Memo/Keys     GET   -> 지금까지 만들어진 key(폴더) 목록, 이름순 (접속 화면에 표시용)
- /Memo/List     GET   key, password? -> 그 key의 메모 목록(미리보기, 최신순) - 암호화 모드면 password 필요
- /Memo/Get      GET   key, id, password? -> 메모 본문 - 암호화 모드면 password 필요
- /Memo/Save     POST  key, id?, text, password? -> 저장(id 없으면 새로 생성, 있으면 덮어쓰기) - 암호화 모드면 password 필요
- /Memo/Delete   POST  key, id, password? -> 메모 삭제 - 암호화 모드면 password 필요

비밀번호는 서버에 저장하지 않는다 - 매 요청마다 클라이언트가 같이 보내고, 그 요청을 처리하는 순간에만 사용한다(CMemo 참고).
*/

@URLPatterns([
    "/Memo/Connect", "/Memo/Rename", "/Memo/Keys", "/Memo/List", "/Memo/Get", "/Memo/Save", "/Memo/Delete",
])
export class CMemoRouter extends CAuthServer {
    // POST 계열은 body(_json), GET 계열은 querystring에서 key/password를 읽는다.
    private GetKey(_json: CJSON, _req: Request): string {
        return _json.GetStr('key') || (_req.query.key as string) || '';
    }

    private GetPassword(_json: CJSON, _req: Request): string | null {
        return _json.GetStr('password') || (_req.query.password as string) || null;
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

    async onConnect(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        try {
            const key = await CMemo.Connect(_json.GetStr('key') || '', this.GetPassword(_json, _req));
            _res.json({ ok: true, key });
        } catch (e: any) {
            // 비밀번호 필요/틀림 등 구체적인 메시지를 화면에 그대로 보여줘야 하므로 200으로 응답한다
            // (4xx는 CFecth가 본문을 읽지 않고 바로 reject하기 때문).
            _res.json({ ok: false, msg: e?.message || 'Connect failed' });
        }
        return null;
    }

    async onRename(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        const key = this.GetKey(_json, _req);
        const newKey = _json.GetStr('newKey') || (_req.query.newKey as string) || '';
        if (!key || !newKey) { _res.status(400).json({ ok: false, msg: 'key, newKey 필요' }); return null; }

        try {
            const renamed = await CMemo.Rename(key, newKey);
            _res.json({ ok: true, key: renamed });
        } catch (e: any) {
            _res.status(400).json({ ok: false, msg: e?.message || 'Rename failed' });
        }
        return null;
    }

    async onKeys(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        try {
            const data = await CMemo.ListKeys();
            _res.json({ ok: true, data });
        } catch (e: any) {
            _res.status(400).json({ ok: false, msg: e?.message || 'Keys failed' });
        }
        return null;
    }

    async onList(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        const key = this.GetKey(_json, _req);
        if (!key) { _res.status(400).json({ ok: false, msg: 'key 필요' }); return null; }

        try {
            const data = await CMemo.List(key, this.GetPassword(_json, _req));
            _res.json({ ok: true, data });
        } catch (e: any) {
            _res.status(400).json({ ok: false, msg: e?.message || 'List failed' });
        }
        return null;
    }

    async onGet(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        const key = this.GetKey(_json, _req);
        const id = (_req.query.id as string) || '';
        if (!key || !id) { _res.status(400).json({ ok: false, msg: 'key, id 필요' }); return null; }

        try {
            const data = await CMemo.Get(key, id, this.GetPassword(_json, _req));
            if (!data) { _res.status(404).json({ ok: false, msg: '해당 id 메모를 찾을 수 없음' }); return null; }
            _res.json({ ok: true, data });
        } catch (e: any) {
            _res.status(400).json({ ok: false, msg: e?.message || 'Get failed' });
        }
        return null;
    }

    async onSave(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        const key = this.GetKey(_json, _req);
        const text = _json.GetStr('text');
        if (!key || text == null) { _res.status(400).json({ ok: false, msg: 'key, text 필요' }); return null; }
        const id = _json.GetStr('id') || null;

        try {
            const data = await CMemo.Save(key, id, text, this.GetPassword(_json, _req));
            _res.json({ ok: true, data });
        } catch (e: any) {
            _res.status(400).json({ ok: false, msg: e?.message || 'Save failed' });
        }
        return null;
    }

    async onDelete(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        const key = this.GetKey(_json, _req);
        const id = _json.GetStr('id');
        if (!key || !id) { _res.status(400).json({ ok: false, msg: 'key, id 필요' }); return null; }

        try {
            const deleted = await CMemo.Delete(key, id, this.GetPassword(_json, _req));
            if (!deleted) { _res.status(404).json({ ok: false, msg: '해당 id 메모를 찾을 수 없음' }); return null; }
            _res.json({ ok: true });
        } catch (e: any) {
            _res.status(400).json({ ok: false, msg: e?.message || 'Delete failed' });
        }
        return null;
    }
}

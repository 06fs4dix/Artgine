import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer, isAuthedReq, isValidToken } from './CAuthServer.js';
import { CMemo } from './CMemo.js';
import { CAI } from '../util/CAI.js';

/*
Memo Router
- /Memo/Chat   POST  provider, model, mode(read|write|auto), text, continueOffset? -> 메모 저장/검색 응답
- /Memo/List   GET   n -> 전체 레코드 중 작성 시각(chatTime) 기준 최근 n개 (체인 구분 없이 평면 목록)
- /Memo/Get    GET   offset -> 해당 오프셋이 속한 체인 전체
- /Memo/Delete POST  offset -> 해당 오프셋 레코드 삭제 (체인 앞뒤 재연결)
*/

@URLPatterns(["/Memo/Chat", "/Memo/List", "/Memo/Get", "/Memo/Delete"])
export class CMemoRouter extends CAuthServer {
    // 토큰이 같이 오면 토큰 기준으로, 없으면 기존 세션 쿠키 기준으로 인증한다.
    // cross-origin(RDP로 전환된 원격 서버) 요청은 쿠키가 기본적으로 전달되지 않으므로 토큰이 필요하다.
    private IsAuth(_json: CJSON, req: Request): boolean {
        const token = _json.GetStr('token');
        return token ? isValidToken(token) : isAuthedReq(req);
    }

    constructor() {
        super();
        this.On("/Memo/Chat", this.onChat.bind(this));
        this.On("/Memo/List", this.onList.bind(this));
        this.On("/Memo/Get",  this.onGet.bind(this));
        this.On("/Memo/Delete", this.onDelete.bind(this));
    }

    async onChat(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const text = _json.GetStr('text');
        if (!text) { _res.status(400).json({ ok: false, msg: 'text 필요' }); return null; }

        const modeStr = (_json.GetStr('mode') as string) || 'auto';
        const modeMap: Record<string, boolean | null> = { read: false, write: true, auto: null };
        if (!(modeStr in modeMap)) { _res.status(400).json({ ok: false, msg: 'Invalid mode' }); return null; }

        const providerStr = _json.GetStr('provider') as string | undefined;
        const provider = providerStr ? (providerStr as CAI.eProvider) : undefined;
        const model = _json.GetStr('model') as string | undefined;
        const continueOffsetRaw = _json.GetInt('continueOffset');
        const continueOffset = continueOffsetRaw == null ? undefined : Number(continueOffsetRaw);

        const result = await CMemo.Chat(text, modeMap[modeStr], provider, model, continueOffset);
        _res.json({ ok: true, result });
        return null;
    }

    async onList(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const n = Math.max(1, parseInt(_req.query.n as string) || 10);
        const list = await CMemo.ListRecent(n);
        _res.json({ ok: true, list });
        return null;
    }

    async onGet(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const offset = parseInt(_req.query.offset as string);
        if (isNaN(offset)) { _res.status(400).json({ ok: false, msg: 'offset 필요' }); return null; }

        const chain = await CMemo.GetChain(offset);
        _res.json({ ok: true, chain });
        return null;
    }

    async onDelete(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        if (!this.IsAuth(_json, _req)) { _res.status(401).json({ ok: false, msg: 'Authentication required' }); return null; }

        const offsetRaw = _json.GetInt('offset');
        if (offsetRaw == null) { _res.status(400).json({ ok: false, msg: 'offset 필요' }); return null; }

        const deleted = await CMemo.Delete(Number(offsetRaw));
        if (!deleted) { _res.status(404).json({ ok: false, msg: '해당 offset 메모를 찾을 수 없음' }); return null; }

        _res.json({ ok: true });
        return null;
    }
}

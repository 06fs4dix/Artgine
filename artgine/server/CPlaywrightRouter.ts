import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer } from './CAuthServer.js';

/*
Playwright Router
- /PlayWright/list    GET   세션 목록 조회                                        → { ok, sessions }
- /PlayWright/push    POST  세션 생성 { browser, url, ttl, logSize }             → { ok, sessionId }
- /PlayWright/exec       POST  명령 실행 { sessionId, fn, args }                 → { ok, result }
- /PlayWright/screenshot POST  화면 캡처 { sessionId, options? }                 → { ok, result: Buffer }
- /PlayWright/logs    POST  로그 조회 { sessionId, fromOffset? }                 → { ok, logs, nextOffset }
- /PlayWright/remove  POST  세션 제거 { sessionId }                              → { ok }
*/

@URLPatterns(["/PlayWright/list", "/PlayWright/push", "/PlayWright/reset", "/PlayWright/exec", "/PlayWright/screenshot", "/PlayWright/input", "/PlayWright/logs", "/PlayWright/remove", "/PlayWright/eval"])
export class CPlaywrightRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/PlayWright/list",       this.onList.bind(this));
        this.On("/PlayWright/push",       this.onPush.bind(this));
        this.On("/PlayWright/reset",      this.onReset.bind(this));
        this.On("/PlayWright/exec",       this.onExec.bind(this));
        this.On("/PlayWright/screenshot", this.onScreenshot.bind(this));
        this.On("/PlayWright/input",      this.onInput.bind(this));
        this.On("/PlayWright/logs",       this.onLogs.bind(this));
        this.On("/PlayWright/remove",     this.onRemove.bind(this));
        this.On("/PlayWright/eval",       this.onEval.bind(this));
    }

    override Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() {}

    async onList(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onPush(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onReset(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onExec(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onScreenshot(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onInput(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onLogs(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onRemove(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onEval(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
}

import CPlaywrightRouter_imple from '../server_imple/CPlaywrightRouter.js';
CPlaywrightRouter_imple();

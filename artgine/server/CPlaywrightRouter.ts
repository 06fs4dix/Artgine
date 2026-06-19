import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer } from './CAuthServer.js';

/*
Playwright Router
- /playwright/list    GET   세션 목록 조회                                        → { ok, sessions }
- /playwright/push    POST  세션 생성 { browser, url, ttl, logSize }             → { ok, sessionId }
- /playwright/exec    POST  명령 실행 { sessionId, fn, args }                    → { ok, result }
- /playwright/logs    POST  로그 조회 { sessionId, fromOffset? }                 → { ok, logs, nextOffset }
- /playwright/remove  POST  세션 제거 { sessionId }                              → { ok }
*/

@URLPatterns(["/playwright/list", "/playwright/push", "/playwright/reset", "/playwright/exec", "/playwright/input", "/playwright/logs", "/playwright/remove", "/playwright/eval"])
export class CPlaywrightRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/playwright/list",   this.onList.bind(this));
        this.On("/playwright/push",   this.onPush.bind(this));
        this.On("/playwright/reset",  this.onReset.bind(this));
        this.On("/playwright/exec",   this.onExec.bind(this));
        this.On("/playwright/input",  this.onInput.bind(this));
        this.On("/playwright/logs",   this.onLogs.bind(this));
        this.On("/playwright/remove", this.onRemove.bind(this));
        this.On("/playwright/eval",   this.onEval.bind(this));
    }

    override Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() {}

    async onList(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onPush(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onReset(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onExec(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onInput(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onLogs(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onRemove(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onEval(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
}

import CPlaywrightRouter_imple from '../server_imple/CPlaywrightRouter.js';
CPlaywrightRouter_imple();

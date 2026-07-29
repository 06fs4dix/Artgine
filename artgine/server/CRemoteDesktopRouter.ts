import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer } from './CAuthServer.js';

/*
Remote Desktop Router
- /RemoteDesktop/exec       POST  명령 실행 { fn, args }                       → { ok, result }
- /RemoteDesktop/screenshot POST  화면 캡처 { quality?, monitor? }              → { ok, result: Buffer }  (monitor: 0=primary(기본값), 1=두번째...)
- /RemoteDesktop/input      POST  시간 기반 입력(hold/drag) { key, time?, windowTitle?, points? } → { ok, result }
- /RemoteCMD/Exec        POST  원격 PC에서 콘솔 명령 실행 { cmd, path }          → { ok, stdout, stderr }
- /RemoteDesktop/remotes     POST  저장된 원격 목록 조회 {}                        → { ok, list }
- /RemoteDesktop/remotes-set POST  원격 목록 저장 { list: [{remoteId, entryUrl}] }  → { ok }

원격 목록은 CStorage(Node 컨텍스트 = Env.json)에 보관한다. 브라우저에서 CStorage를 직접 쓰면
localStorage로 떨어져 그 브라우저에만 남으므로, 서버를 거쳐야 Env.json에 영속된다.
*/

@URLPatterns(["/RemoteDesktop/exec", "/RemoteDesktop/screenshot", "/RemoteDesktop/input", "/RemoteCMD/Exec", "/RemoteDesktop/remotes", "/RemoteDesktop/remotes-set"])
export class CRemoteDesktopRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/RemoteDesktop/exec",        this.onExec.bind(this));
        this.On("/RemoteDesktop/screenshot",  this.onScreenshot.bind(this));
        this.On("/RemoteDesktop/input",       this.onInput.bind(this));
        this.On("/RemoteCMD/Exec",            this.onCmd.bind(this));
        this.On("/RemoteDesktop/remotes",     this.onRemotes.bind(this));
        this.On("/RemoteDesktop/remotes-set", this.onRemotesSet.bind(this));
    }

    override Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() {}

    async onExec(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onScreenshot(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onInput(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onCmd(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onRemotes(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onRemotesSet(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
}

import CRemoteDesktopRouter_imple from '../server_imple/CRemoteDesktopRouter.js';
CRemoteDesktopRouter_imple();

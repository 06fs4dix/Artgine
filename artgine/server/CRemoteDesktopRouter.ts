import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer } from './CAuthServer.js';

/*
Remote Desktop Router
- /RemoteDesktop/exec       POST  명령 실행 { fn, args }                       → { ok, result }
- /RemoteDesktop/screenshot POST  화면 캡처 { quality? }                       → { ok, result: Buffer }
- /RemoteDesktop/input      POST  시간 기반 입력(hold/drag) { key, time?, windowTitle?, points? } → { ok, result }
- /RemoteCMD/Exec        POST  원격 PC에서 콘솔 명령 실행 { cmd, path }          → { ok, stdout, stderr }
- /RemoteCMD/Write       POST  주소/토큰을 ai/RemoteCMDGuide.md에 등록 { addr, token } → { ok }
*/

@URLPatterns(["/RemoteDesktop/exec", "/RemoteDesktop/screenshot", "/RemoteDesktop/input", "/RemoteCMD/Exec", "/RemoteCMD/Write"])
export class CRemoteDesktopRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/RemoteDesktop/exec",       this.onExec.bind(this));
        this.On("/RemoteDesktop/screenshot", this.onScreenshot.bind(this));
        this.On("/RemoteDesktop/input",      this.onInput.bind(this));
        this.On("/RemoteCMD/Exec",           this.onCmd.bind(this));
        this.On("/RemoteCMD/Write",          this.onWrite.bind(this));
    }

    override Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() {}

    async onExec(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onScreenshot(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onInput(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onCmd(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onWrite(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
}

import CRemoteDesktopRouter_imple from '../server_imple/CRemoteDesktopRouter.js';
CRemoteDesktopRouter_imple();

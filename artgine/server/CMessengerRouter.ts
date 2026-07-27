import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer } from './CAuthServer.js';

@URLPatterns(["/messenger/list", "/messenger/create", "/messenger/link", "/messenger/unlink", "/messenger/send", "/messenger/log"])
export class CMessengerRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/messenger/list",   this.onList.bind(this));
        this.On("/messenger/create", this.onCreate.bind(this));
        this.On("/messenger/link",   this.onLink.bind(this));
        this.On("/messenger/unlink", this.onUnlink.bind(this));
        this.On("/messenger/send",   this.onSend.bind(this));
        this.On("/messenger/log",    this.onLog.bind(this));
    }

    override Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() {}

    async onList  (_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onCreate(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onLink  (_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onUnlink(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onSend  (_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onLog   (_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
}

import CMessengerRouter_imple from '../server_imple/CMessengerRouter.js';
CMessengerRouter_imple();

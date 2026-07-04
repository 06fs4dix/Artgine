import { URLPatterns } from '../network/CServerMain.js';
import { CServerRouter } from '../network/CServerRouter.js';
import { CJSON } from '../basic/CJSON.js';
import { CConsol } from '../basic/CConsol.js';
import { Request, Response } from 'express';

@URLPatterns(["/log"])
export class CLogRouter extends CServerRouter {
    constructor() {
        super();
        this.On("/log", this.onLog.bind(this));
    }

    async onLog(_json: CJSON, _req: Request, _res: Response): Promise<null> {
        CConsol.Log(_json.ToStr());
        _res.send("ok");
        return null;
    }
}

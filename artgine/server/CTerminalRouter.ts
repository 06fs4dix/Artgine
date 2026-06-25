import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer } from './CAuthServer.js';

@URLPatterns(["/cmd/start-ttyd", "/cmd/sessions", "/cmd/kill-session", "/cmd/terminal-proxy", "/cmd/terminal-proxy/token", "/cmd/schedules", "/cmd/schedule-set", "/cmd/schedule-del", "/cmd/super-mode", "/cmd/setting", "/cmd/provider-state"])
export class CTerminalRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/cmd/setting", this.onGetSettingJSON.bind(this));
        this.On("/cmd/provider-state", this.onProviderState.bind(this));
        this.On("/cmd/start-ttyd", this.onStartTtyd.bind(this));
        this.On("/cmd/schedules", this.onSchedules.bind(this));
        this.On("/cmd/schedule-set", this.onScheduleSet.bind(this));
        this.On("/cmd/schedule-del", this.onScheduleDel.bind(this));
        this.On("/cmd/sessions", this.onSessions.bind(this));
        this.On("/cmd/super-mode", this.onSuperMode.bind(this));
        this.On("/cmd/kill-session", this.onKillSession.bind(this));
        this.On("/cmd/terminal-proxy/token", this.onTerminalProxyToken.bind(this));
        this.On("/cmd/terminal-proxy", this.onTerminalProxy.bind(this));
    }

    override Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() {}

    async onGetSettingJSON(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onProviderState(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onStartTtyd(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onSchedules(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onScheduleSet(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onScheduleDel(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onSessions(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onSuperMode(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onKillSession(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onTerminalProxyToken(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onTerminalProxy(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
}

import CTerminalRouter_imple from '../server_imple/CTerminalRouter.js';
CTerminalRouter_imple();

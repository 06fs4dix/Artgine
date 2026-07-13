import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer } from './CAuthServer.js';

@URLPatterns(["/cmd/start-term", "/cmd/sessions", "/cmd/kill-session", "/cmd/terminal-proxy", "/cmd/terminal-proxy/token", "/cmd/schedules", "/cmd/schedule-set", "/cmd/schedule-del", "/cmd/super-mode"])
export class CTerminalRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/cmd/start-term", this.onStartTerm.bind(this));
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

    async onStartTerm(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onSchedules(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onScheduleSet(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onScheduleDel(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onSessions(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onSuperMode(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onKillSession(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onTerminalProxyToken(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onTerminalProxy(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
}

// 터미널 백엔드: node-pty + xterm (구 ttyd 구현은 제거됨).
import CTerminalPty_imple from '../server_imple/CTerminalRouter.js';
CTerminalPty_imple();

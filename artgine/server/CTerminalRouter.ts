import { URLPatterns } from '../network/CServerMain.js';
import { CJSON } from '../basic/CJSON.js';
import { Request, Response } from 'express';
import { CAuthServer } from './CAuthServer.js';

@URLPatterns(["/cmd/start-term", "/cmd/start-team", "/cmd/sessions", "/cmd/kill-session", "/cmd/terminal-proxy", "/cmd/terminal-proxy/token", "/cmd/schedules", "/cmd/schedule-set", "/cmd/schedule-del", "/cmd/super-mode", "/cmd/handoff", "/cmd/agents", "/cmd/agent-set", "/cmd/agent-del", "/cmd/log-sessions", "/cmd/log-session", "/cmd/log-session-del", "/cmd/log-clear", "/cmd/log-term", "/cmd/upload-file"])
export class CTerminalRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/cmd/start-term", this.onStartTerm.bind(this));
        this.On("/cmd/start-team", this.onStartTeam.bind(this));
        this.On("/cmd/schedules", this.onSchedules.bind(this));
        this.On("/cmd/schedule-set", this.onScheduleSet.bind(this));
        this.On("/cmd/schedule-del", this.onScheduleDel.bind(this));
        this.On("/cmd/agents", this.onAgents.bind(this));
        this.On("/cmd/agent-set", this.onAgentSet.bind(this));
        this.On("/cmd/agent-del", this.onAgentDel.bind(this));
        this.On("/cmd/sessions", this.onSessions.bind(this));
        this.On("/cmd/super-mode", this.onSuperMode.bind(this));
        this.On("/cmd/kill-session", this.onKillSession.bind(this));
        this.On("/cmd/terminal-proxy/token", this.onTerminalProxyToken.bind(this));
        this.On("/cmd/terminal-proxy", this.onTerminalProxy.bind(this));
        this.On("/cmd/handoff", this.onHandoff.bind(this));
        this.On("/cmd/log-sessions", this.onLogSessions.bind(this));
        this.On("/cmd/log-session", this.onLogSession.bind(this));
        this.On("/cmd/log-session-del", this.onLogSessionDel.bind(this));
        this.On("/cmd/log-clear", this.onLogClear.bind(this));
        this.On("/cmd/log-term", this.onLogTerm.bind(this));
        this.On("/cmd/upload-file", this.onUploadFile.bind(this));
    }

    override Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() {}

    async onStartTerm(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onStartTeam(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onSchedules(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onScheduleSet(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onScheduleDel(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onAgents(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onAgentSet(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onAgentDel(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onSessions(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onSuperMode(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onKillSession(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onTerminalProxyToken(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onTerminalProxy(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onHandoff(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onLogSessions(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onLogSession(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onLogSessionDel(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onLogClear(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onLogTerm(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
    async onUploadFile(_json: CJSON, _req: Request, _res: Response): Promise<null> { return null; }
}

// 터미널 백엔드: node-pty + xterm (구 ttyd 구현은 제거됨).
import CTerminalPty_imple from '../server_imple/CTerminalRouter.js';
CTerminalPty_imple();

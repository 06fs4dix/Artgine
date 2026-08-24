var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { URLPatterns } from '../network/CServerMain.js';
import { CAuthServer } from './CAuthServer.js';
let CTerminalRouter = class CTerminalRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/cmd/start-term", this.onStartTerm.bind(this));
        this.On("/cmd/start-team", this.onStartTeam.bind(this));
        this.On("/cmd/team-end", this.onTeamEnd.bind(this));
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
    Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() { }
    async onStartTerm(_json, _req, _res) { return null; }
    async onStartTeam(_json, _req, _res) { return null; }
    async onTeamEnd(_json, _req, _res) { return null; }
    async onSchedules(_json, _req, _res) { return null; }
    async onScheduleSet(_json, _req, _res) { return null; }
    async onScheduleDel(_json, _req, _res) { return null; }
    async onAgents(_json, _req, _res) { return null; }
    async onAgentSet(_json, _req, _res) { return null; }
    async onAgentDel(_json, _req, _res) { return null; }
    async onSessions(_json, _req, _res) { return null; }
    async onSuperMode(_json, _req, _res) { return null; }
    async onKillSession(_json, _req, _res) { return null; }
    async onTerminalProxyToken(_json, _req, _res) { return null; }
    async onTerminalProxy(_json, _req, _res) { return null; }
    async onHandoff(_json, _req, _res) { return null; }
    async onLogSessions(_json, _req, _res) { return null; }
    async onLogSession(_json, _req, _res) { return null; }
    async onLogSessionDel(_json, _req, _res) { return null; }
    async onLogClear(_json, _req, _res) { return null; }
    async onLogTerm(_json, _req, _res) { return null; }
    async onUploadFile(_json, _req, _res) { return null; }
};
CTerminalRouter = __decorate([
    URLPatterns(["/cmd/start-term", "/cmd/start-team", "/cmd/team-end", "/cmd/sessions", "/cmd/kill-session", "/cmd/terminal-proxy", "/cmd/terminal-proxy/token", "/cmd/schedules", "/cmd/schedule-set", "/cmd/schedule-del", "/cmd/super-mode", "/cmd/handoff", "/cmd/agents", "/cmd/agent-set", "/cmd/agent-del", "/cmd/log-sessions", "/cmd/log-session", "/cmd/log-session-del", "/cmd/log-clear", "/cmd/log-term", "/cmd/upload-file"])
], CTerminalRouter);
export { CTerminalRouter };
import CTerminalPty_imple from '../server_imple/CTerminalRouter.js';
CTerminalPty_imple();

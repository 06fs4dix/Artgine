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
        this.On("/cmd/schedules", this.onSchedules.bind(this));
        this.On("/cmd/schedule-set", this.onScheduleSet.bind(this));
        this.On("/cmd/schedule-del", this.onScheduleDel.bind(this));
        this.On("/cmd/sessions", this.onSessions.bind(this));
        this.On("/cmd/super-mode", this.onSuperMode.bind(this));
        this.On("/cmd/kill-session", this.onKillSession.bind(this));
        this.On("/cmd/terminal-proxy/token", this.onTerminalProxyToken.bind(this));
        this.On("/cmd/terminal-proxy", this.onTerminalProxy.bind(this));
    }
    Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() { }
    async onStartTerm(_json, _req, _res) { return null; }
    async onSchedules(_json, _req, _res) { return null; }
    async onScheduleSet(_json, _req, _res) { return null; }
    async onScheduleDel(_json, _req, _res) { return null; }
    async onSessions(_json, _req, _res) { return null; }
    async onSuperMode(_json, _req, _res) { return null; }
    async onKillSession(_json, _req, _res) { return null; }
    async onTerminalProxyToken(_json, _req, _res) { return null; }
    async onTerminalProxy(_json, _req, _res) { return null; }
};
CTerminalRouter = __decorate([
    URLPatterns(["/cmd/start-term", "/cmd/sessions", "/cmd/kill-session", "/cmd/terminal-proxy", "/cmd/terminal-proxy/token", "/cmd/schedules", "/cmd/schedule-set", "/cmd/schedule-del", "/cmd/super-mode"])
], CTerminalRouter);
export { CTerminalRouter };
import CTerminalPty_imple from '../server_imple/CTerminalRouter.js';
CTerminalPty_imple();

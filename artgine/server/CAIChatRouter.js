var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { URLPatterns } from '../network/CServerMain.js';
import { CAuthServer } from './CAuthServer.js';
let CAIChatRouter = class CAIChatRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/AIChat/sessions", this.onGetSessions.bind(this));
        this.On("/AIChat/session", this.onSession.bind(this));
        this.On("/AIChat/session/config", this.onSessionConfig.bind(this));
        this.On("/AIChat/session/upload", this.onSessionUpload.bind(this));
        this.On("/AIChat/share", this.onShare.bind(this));
        this.On("/AIChat/share/file", this.onShareFile.bind(this));
        this.On("/AIChat/workspace", this.onWorkspace.bind(this));
    }
    Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() { }
    async onGetSessions(_json, _req, _res) { return null; }
    async onSession(_json, _req, _res) { return null; }
    async onSessionConfig(_json, _req, _res) { return null; }
    async onSessionUpload(_json, _req, _res) { return null; }
    async onShare(_json, _req, _res) { return null; }
    async onShareFile(_json, _req, _res) { return null; }
    async onWorkspace(_json, _req, _res) { return null; }
};
CAIChatRouter = __decorate([
    URLPatterns(["/AIChat/sessions", "/AIChat/session", "/AIChat/session/config", "/AIChat/session/upload", "/AIChat/share", "/AIChat/share/file", "/AIChat/workspace"])
], CAIChatRouter);
export { CAIChatRouter };
import CAIChatRouter_imple from '../server_imple/CAIChatRouter.js';
CAIChatRouter_imple();

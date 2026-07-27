var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { URLPatterns } from '../network/CServerMain.js';
import { CAuthServer } from './CAuthServer.js';
let CRemoteDesktopRouter = class CRemoteDesktopRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/RemoteDesktop/exec", this.onExec.bind(this));
        this.On("/RemoteDesktop/screenshot", this.onScreenshot.bind(this));
        this.On("/RemoteDesktop/input", this.onInput.bind(this));
        this.On("/RemoteCMD/Exec", this.onCmd.bind(this));
        this.On("/RemoteCMD/Write", this.onWrite.bind(this));
        this.On("/RemoteDesktop/remotes", this.onRemotes.bind(this));
        this.On("/RemoteDesktop/remotes-set", this.onRemotesSet.bind(this));
    }
    Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() { }
    async onExec(_json, _req, _res) { return null; }
    async onScreenshot(_json, _req, _res) { return null; }
    async onInput(_json, _req, _res) { return null; }
    async onCmd(_json, _req, _res) { return null; }
    async onWrite(_json, _req, _res) { return null; }
    async onRemotes(_json, _req, _res) { return null; }
    async onRemotesSet(_json, _req, _res) { return null; }
};
CRemoteDesktopRouter = __decorate([
    URLPatterns(["/RemoteDesktop/exec", "/RemoteDesktop/screenshot", "/RemoteDesktop/input", "/RemoteCMD/Exec", "/RemoteCMD/Write", "/RemoteDesktop/remotes", "/RemoteDesktop/remotes-set"])
], CRemoteDesktopRouter);
export { CRemoteDesktopRouter };
import CRemoteDesktopRouter_imple from '../server_imple/CRemoteDesktopRouter.js';
CRemoteDesktopRouter_imple();

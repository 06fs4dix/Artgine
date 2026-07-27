var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { URLPatterns } from '../network/CServerMain.js';
import { CAuthServer } from './CAuthServer.js';
let CPlaywrightRouter = class CPlaywrightRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/PlayWright/list", this.onList.bind(this));
        this.On("/PlayWright/push", this.onPush.bind(this));
        this.On("/PlayWright/reset", this.onReset.bind(this));
        this.On("/PlayWright/exec", this.onExec.bind(this));
        this.On("/PlayWright/screenshot", this.onScreenshot.bind(this));
        this.On("/PlayWright/input", this.onInput.bind(this));
        this.On("/PlayWright/logs", this.onLogs.bind(this));
        this.On("/PlayWright/remove", this.onRemove.bind(this));
        this.On("/PlayWright/eval", this.onEval.bind(this));
    }
    Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() { }
    async onList(_json, _req, _res) { return null; }
    async onPush(_json, _req, _res) { return null; }
    async onReset(_json, _req, _res) { return null; }
    async onExec(_json, _req, _res) { return null; }
    async onScreenshot(_json, _req, _res) { return null; }
    async onInput(_json, _req, _res) { return null; }
    async onLogs(_json, _req, _res) { return null; }
    async onRemove(_json, _req, _res) { return null; }
    async onEval(_json, _req, _res) { return null; }
};
CPlaywrightRouter = __decorate([
    URLPatterns(["/PlayWright/list", "/PlayWright/push", "/PlayWright/reset", "/PlayWright/exec", "/PlayWright/screenshot", "/PlayWright/input", "/PlayWright/logs", "/PlayWright/remove", "/PlayWright/eval"])
], CPlaywrightRouter);
export { CPlaywrightRouter };
import CPlaywrightRouter_imple from '../server_imple/CPlaywrightRouter.js';
CPlaywrightRouter_imple();

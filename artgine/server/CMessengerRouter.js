var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { URLPatterns } from '../network/CServerMain.js';
import { CAuthServer } from './CAuthServer.js';
let CMessengerRouter = class CMessengerRouter extends CAuthServer {
    constructor() {
        super();
        this.On("/messenger/list", this.onList.bind(this));
        this.On("/messenger/create", this.onCreate.bind(this));
        this.On("/messenger/link", this.onLink.bind(this));
        this.On("/messenger/unlink", this.onUnlink.bind(this));
        this.On("/messenger/send", this.onSend.bind(this));
        this.On("/messenger/log", this.onLog.bind(this));
    }
    Connect() { super.Connect(); this._connectImpl(); }
    _connectImpl() { }
    async onList(_json, _req, _res) { return null; }
    async onCreate(_json, _req, _res) { return null; }
    async onLink(_json, _req, _res) { return null; }
    async onUnlink(_json, _req, _res) { return null; }
    async onSend(_json, _req, _res) { return null; }
    async onLog(_json, _req, _res) { return null; }
};
CMessengerRouter = __decorate([
    URLPatterns(["/messenger/list", "/messenger/create", "/messenger/link", "/messenger/unlink", "/messenger/send", "/messenger/log"])
], CMessengerRouter);
export { CMessengerRouter };
import CMessengerRouter_imple from '../server_imple/CMessengerRouter.js';
CMessengerRouter_imple();

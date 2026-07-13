import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { CConsol } from '../basic/CConsol.js';
import { CEvent } from '../basic/CEvent.js';
import { CScript } from '../util/CScript.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
var gDummyEvent = new CEvent();
var gURLPatterns = new Map();
export let gSessionParser = null;
export function SetSessionParser(_mw) { gSessionParser = _mw; }
export function URLPatterns(_paths) {
    return function (target) {
        gURLPatterns.set(target.name, _paths);
    };
}
export class CServer {
    mMainServer = null;
    mEventMap = new Map();
    Connect() { }
    ;
    SetServerMain(_server) {
        this.mMainServer = _server;
        _server.Push(this);
    }
    On(_key, _event, _target = null) {
        this.mEventMap.set(_key, CEvent.ToCEvent(_event));
    }
    Off(_key, _target) {
        throw new Error('Method not implemented.');
    }
    GetEvent(_key, _target = null) {
        return this.mEventMap.get(_key);
    }
    static FindURLPatterns(_class) {
        let val = gURLPatterns.get(_class.constructor.name);
        if (val == null)
            val = gURLPatterns.get(_class);
        return val;
    }
    Destroy() {
        CConsol.Log("[" + this.constructor.name + "]  Destroy", CConsol.eColor.red);
    }
}
var gMain = null;
export class CServerMain {
    mApp;
    mPort;
    mPath;
    mPassword = '';
    mServicePath = '';
    mServer = null;
    mWebServerArr = new Array();
    mLoadScript = new Set();
    constructor(_port, _path, _cfg = {}) {
        this.mPort = _port;
        this.mPath = _path;
        this.mPassword = _cfg.password ?? '';
        this.mServicePath = _cfg.servicePath ?? '';
        gMain = this;
    }
    static Main() { return gMain; }
    static GetPrivateIP() { return '127.0.0.1'; }
    static async GetPublicIP() { return 'Unavailable'; }
    static async GetAccessibleHost(_port) { return 'http://localhost'; }
    GetServer() { return this.mServer; }
    GetPath() { return this.mPath; }
    GetApp() { return this.mApp; }
    GetPassword() { return this.mPassword; }
    GetServicePath() { return this.mServicePath; }
    Push(_server) {
        const dup = this.mWebServerArr.some(s => s.constructor === _server.constructor);
        if (dup) {
            CConsol.Log(`[${_server.constructor.name}] already registered, skip duplicate instance`, CConsol.eColor.yellow);
            return;
        }
        this.mWebServerArr.push(_server);
        _server.Connect();
    }
    async Init() {
        return null;
    }
    Destroy() {
        if (this.mServer) {
            this.mServer.close();
            this.mServer = null;
        }
        for (let server of this.mWebServerArr) {
            server.Destroy();
        }
        CConsol.Log("[WebServer]  Destroy", CConsol.eColor.red);
        CScript.Clear();
    }
}
import CServerMain_imple from "../network_imple/CServerMain.js";
CServerMain_imple();

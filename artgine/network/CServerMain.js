import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { CConsol } from '../basic/CConsol.js';
import { CEvent } from '../basic/CEvent.js';
import { CScript } from '../util/CScript.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
var gDummyEvent = new CEvent();
var gURLPatterns = new Map();
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
        return gURLPatterns.get(_class.constructor.name);
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
    mServer = null;
    mWebServerArr = new Array();
    mLoadScript = new Set();
    constructor(_port, _path, _watchPath = null) {
        this.mPort = _port;
        this.mPath = _path;
        gMain = this;
    }
    static Main() { return gMain; }
    GetServer() { return this.mServer; }
    GetPath() { return this.mPath; }
    GetApp() { return this.mApp; }
    Push(_server) {
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

import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import { CConsol } from '../basic/CConsol.js';
import { CPath } from '../basic/CPath.js';
import { CEvent } from '../basic/CEvent.js';
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
export class CServerMain {
    mApp;
    mPort;
    mPath;
    mServer = null;
    mWebServerArr = new Array();
    constructor(_port, _path, _watchPath = null) {
        this.mPort = _port;
        this.mPath = _path;
    }
    GetServer() { return this.mServer; }
    GetPath() { return this.mPath; }
    GetApp() { return this.mApp; }
    Push(_server) {
        this.mWebServerArr.push(_server);
        _server.Connect();
    }
    async Init() {
        return new Promise((resolve) => {
            this.mApp = express();
            this.mApp.use((req, res, next) => {
                res.setHeader('Access-Control-Allow-Origin', '*');
                next();
            });
            this.mApp.use(session({
                secret: 'secretKey',
                resave: false,
                saveUninitialized: true
            }));
            this.mApp.use(cors());
            this.mApp.use(express.json({ limit: '100mb' }));
            this.mApp.use(express.urlencoded({ extended: false, limit: '100mb' }));
            this.mApp.use(this.mPath, express.static(CPath.PHPC()));
            this.mServer = this.mApp.listen(this.mPort);
            this.mServer.on('listening', async () => {
                CConsol.Log(`[WebServer] started on port ${this.mPort} Path : ${this.mPath} `, CConsol.eColor.blue);
                resolve(false);
            });
            this.mServer.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(`Port ${this.mPort} is already in use`);
                    resolve(true);
                }
                else {
                    console.error('Server error:', err);
                    resolve(true);
                }
            });
        });
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
    }
}

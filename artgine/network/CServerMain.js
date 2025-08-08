import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { CConsol } from '../basic/CConsol.js';
import { CPath } from '../basic/CPath.js';
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
        return new Promise((resolve) => {
            this.mApp = express();
            this.mApp.use(async (req, res, next) => {
                res.setHeader('Access-Control-Allow-Origin', '*');
                if (req.url && req.url.endsWith('.html')) {
                    console.log(`call URL: ${req.url}`);
                    let cleanUrl = req.url;
                    if (this.mPath && cleanUrl.startsWith(this.mPath)) {
                        cleanUrl = cleanUrl.substring(this.mPath.length);
                    }
                    const filePath = path.join(process.cwd(), cleanUrl);
                    try {
                        if (fs.existsSync(filePath)) {
                            const htmlContent = fs.readFileSync(filePath, 'utf8');
                            const serverScriptRegex = /<script[^>]*type\s*=\s*["']server["'][^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi;
                            let match;
                            while ((match = serverScriptRegex.exec(htmlContent)) !== null) {
                                let scriptPath = match[1];
                                if (!scriptPath.startsWith('/') && !scriptPath.startsWith('http')) {
                                    const pathModule = await import('path');
                                    const htmlDir = pathModule.default.dirname(filePath);
                                    scriptPath = pathModule.default.join(htmlDir, scriptPath);
                                }
                                await CScript.Build(scriptPath, scriptPath);
                            }
                        }
                        else {
                            console.log(`파일이 존재하지 않음: ${filePath}`);
                        }
                    }
                    catch (error) {
                        console.error('HTML 파일 읽기 오류:', error);
                    }
                }
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
        CScript.Clear();
    }
}

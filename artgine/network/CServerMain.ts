
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';


import { Server } from 'http';
import {CConsol} from '../basic/CConsol.js';
import { CEvent } from '../basic/CEvent.js';
import { IListener } from '../basic/Basic.js';
import { CScript } from '../util/CScript.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
var gDummyEvent=new CEvent();

var gURLPatterns  = new Map<any,Array<string>>();

// 세션 미들웨어 공유: REST는 express가 자동 처리하지만, WebSocket 업그레이드는
// 미들웨어가 자동 실행되지 않으므로 같은 인스턴스를 직접 호출해 req.session을 채운다.
export let gSessionParser: any = null;
export function SetSessionParser(_mw: any) { gSessionParser = _mw; }

export function URLPatterns(_paths: string[]) {
    return function (target: Function) {
        gURLPatterns.set(target.name, _paths);
    };
}
export class CServer implements IListener
{
    
    //mPath="";
    mMainServer : CServerMain=null;
    mEventMap=new Map<string,CEvent>();
    Connect(){};
    SetServerMain(_server : CServerMain)
    {
        this.mMainServer=_server;
        _server.Push(this);
    }
    On(_key,_event,_target=null)
    {
        this.mEventMap.set(_key,CEvent.ToCEvent(_event));
    }
    Off(_key: any, _target: any) {
        throw new Error('Method not implemented.');
    }
    GetEvent(_key: any, _target: any=null) {
        // let event=this.mEventMap.get(_key);
        // if(event==null)
        //     event=gDummyEvent;
        return this.mEventMap.get(_key);
    }
    static FindURLPatterns(_class)
    {
        let val=gURLPatterns.get(_class.constructor.name);
        if(val==null)
            val=gURLPatterns.get(_class);
        return val;
    }
    // static PushURLPatterns(_path,_this)
    // {
    //     gURLPatterns.set(_path,_this);
    // }
   
    Destroy()
    {
        CConsol.Log("["+this.constructor.name+"]  Destroy",CConsol.eColor.red);
    }
}
var gMain : CServerMain=null;
export class CServerMain 
{
    public mApp;
    public mPort: number;
    public mPath: string;
    public mPassword: string = '';
    public mServicePath: string = '';
    public mServer: Server | null = null;
    mWebServerArr=new Array<CServer>();
    mLoadScript=new Set<string>();

    constructor(_port: number, _path: string, _cfg: { password?: string, servicePath?: string } = {}) {
        this.mPort = _port;
        this.mPath = _path;
        this.mPassword = _cfg.password ?? '';
        this.mServicePath = _cfg.servicePath ?? '';
        gMain=this;
    }
    static Main()   {   return gMain;   }
    static GetPrivateIP(): string { return '127.0.0.1'; }
    static async GetPublicIP(): Promise<string> { return 'Unavailable'; }
    static async GetAccessibleHost(_port: number): Promise<string> { return 'http://localhost'; }
    GetServer() {   return this.mServer;    }
    GetPath(){  return this.mPath;  }
    GetApp(){  return this.mApp;  }
    GetPassword(){  return this.mPassword;  }
    GetServicePath(){  return this.mServicePath;  }
    Push(_server : CServer)
    {
        this.mWebServerArr.push(_server);
        _server.Connect();
    }

    public async Init(): Promise<boolean> {
        return null;
    }

    public Destroy(): void {
        if (this.mServer) {
            this.mServer.close();
            this.mServer = null;
        }

        for(let server of this.mWebServerArr)
        {
            server.Destroy();
        }
        CConsol.Log("[WebServer]  Destroy",CConsol.eColor.red);
        CScript.Clear();
        
    }
}


import CServerMain_imple from "../network_imple/CServerMain.js";
CServerMain_imple();
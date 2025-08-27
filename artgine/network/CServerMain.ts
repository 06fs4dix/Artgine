
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
        return gURLPatterns.get(_class.constructor.name);
    }
    Destroy()
    {
        CConsol.Log("["+this.constructor.name+"]  Destroy",CConsol.eColor.red);
    }
}
var gMain : CServerMain=null;
export class CServerMain 
{
    private mApp;
    private mPort: number;
    private mPath: string;
    //private mWatchPath: string | null;
    private mServer: Server | null = null;
    //private mLiveReloadServer = null;
    mWebServerArr=new Array<CServer>();
    mLoadScript=new Set<string>();

    constructor(_port: number, _path: string, _watchPath: string | null = null) {
        this.mPort = _port;
        this.mPath = _path;
        gMain=this;
        //this.mWatchPath = _watchPath;
    }
    static Main()   {   return gMain;   }
    GetServer() {   return this.mServer;    }
    GetPath(){  return this.mPath;  }
    GetApp(){  return this.mApp;  }
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
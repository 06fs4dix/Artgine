import { IListener } from "../basic/Basic.js";
import { CConsol } from "../basic/CConsol.js";
import {CEvent} from "../basic/CEvent.js";
import {CStream} from "../basic/CStream.js";
import {CWebSocket} from "./CWebSocket.js";

export type CStreamHandler = (_stream: CStream) => void;


export class CSocketIO extends CWebSocket implements IListener
{
    mEvent : Array<CEvent|CStreamHandler>;
    mPing=0;
    mLog=true;
    constructor(_local : boolean,_path,_event : Array<CEvent<CStreamHandler>|CStreamHandler>=[])
    {
        let addr="local";
        if(_local==false)
            addr=null;

        for(let key in _event)
        {
            if(_event[key]instanceof CEvent==false)
            {
                _event[key]=CEvent.ToCEvent(_event[key]);
            }
        }
        


        super(addr,_path,(_msg)=>{
            let stream=new CStream(_msg);
            let header=stream.GetString();
            if(this.mEvent[header]!=null)
            {
                if(this.mLog)   CConsol.Log("Event : "+header);
                this.mEvent[header].Call(stream);
            }

        },(_msg)=>{
            if(this.mEvent["Error"]!=null)
            {
                this.mEvent["Error"].Call(_msg);
            }
        });
        this.mEvent=_event;
        setInterval(()=>{
            let stream=new CStream();
            stream.Push("Ping");
            stream.Push(performance.now());
            this.Send(stream);
        },5000);
        this.mEvent["Ping"] = new CEvent((_stream: CStream) => {
            let b=_stream.GetFloat();
            let e=performance.now();
            this.mPing=e-b;
            if(this.mLog)   CConsol.Log(`[Ping] : ${this.mPing.toFixed(3)}ms`);
        });
        
    }
    Off(_key: any, _target: any=null) {
        throw new Error("Method not implemented.");
    }
    GetEvent(_key: any, _target: any=null) {
        return this.mEvent[_key];
    }
    //Socket.io처럼 처리
    On(_key: string, _event: CStreamHandler | CEvent<CStreamHandler>, _target: any = null): void 
    {
        this.mEvent[_key] = CEvent.ToCEvent(_event);
    }
    //헤더는 불필요
    Emit(_header,_data:CStream,_stream=new CStream())
    {
        _stream.Push(_header);
        _stream.Push(_data);
        this.Send(_stream);
    }
}
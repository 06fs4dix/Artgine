import { CConsol } from "../../basic/CConsol.js";
import { CEvent } from "../../basic/CEvent.js";
import { CStream } from "../../basic/CStream.js";
import { CSocketIO, CStreamHandler } from "../../network/CSocketIO.js";
import { PacketSN } from "./PacketSN.js";





export class CSignalingClient extends CSocketIO
{
    //m_ping=0;
    //m_serverTime=0;
    //m_clientTime=0;
    //m_pingTime : number=null;
    //오너만 유저키를 소유할수 있다
    mOwnerKey=null;


    constructor(_local: boolean) 
    {
        let event= new Array<CEvent | CStreamHandler> ();
        super(_local, "signaling", event);
        if(_local)  this.mOwnerKey="local";
       
    
      
    
        // event["Ping"] = new CEvent((_stream: CStream) => {

        //     const T1 = _stream.GetFloat(); 
        //     const T2 = _stream.GetFloat(); 
        //     const T3 = performance.now(); 
        //     this.m_ping = T3 - T1;
        //     this.m_serverTime = T2 + this.m_ping*0.5;
        //     this.m_clientTime=performance.now();

        //     CConsol.Log(`[Ping] RTT: ${this.m_ping.toFixed(3)}ms, offset: ${this.m_serverTime.toFixed(3)}ms`);

        //     //PingFun(_stream);
        // });
        // event["Latency"] = new CEvent((_stream: CStream) => {
        //     const slatency = _stream.GetFloat(); // 서버가 지연시키고 싶은 시간 (ms)
        //     const header = _stream.GetString();


        //     let clatency=performance.now()-this.m_clientTime;
        //     let delay=slatency-(this.m_serverTime+clatency);

        //     if (delay > 0) {
        //         setTimeout(() => {
        //             this.mEvent[header].Call(_stream);
        //         }, delay);
        //     } else {
        //         // 이미 지난 시간이라면 바로 실행
        //         this.mEvent[header].Call(_stream);
        //     }
        // });

        event[PacketSN.RoomOwner.name] = new CEvent((_stream: CStream) => {
            let RoomConnectReq=PacketSN.RoomConnectReq(_stream);
            this.mOwnerKey=RoomConnectReq.userKey;
            _stream.ResetOffset();
            _stream.GetString();

            event[PacketSN.RoomConnectReq.name].Call(_stream);
        });
      
    
 
       
    }
    // override async Connect(_pingTime=null): Promise<boolean> {
    //     // this.m_pingTime=_pingTime;
    //     // const result = await super.Connect();
    
    //     // if (result)
    //     // {
    //     //     this.Send(PacketSN.SendPing()); 
    //     //     if(this.m_pingTime!=null)
    //     //     {
    //     //         setInterval(() => 
    //     //         {
    //     //             this.Send(PacketSN.SendPing()); 
    //     //         },this.m_pingTime);
    //     //     }
    //     // }
            
        
    
    //     return result;
    // }
    // GetServerTime()
    // {
    //     if(this.m_serverTime==0)    return 0;
    //     let clatency=performance.now()-this.m_clientTime;
    //     return this.m_serverTime+clatency;
    // }
    GetOwnerKey()
    {
        return this.mOwnerKey;
    }
}
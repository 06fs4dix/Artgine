import { CUpdate } from "../basic/Basic.js";
import { CConsol } from "../basic/CConsol.js";
import { CEvent } from "../basic/CEvent.js";
import { CStream } from "../basic/CStream.js";
import { URLPatterns } from "../network/CServerMain.js";
import { CServerSocker } from "../network/CServerSocket.js";
import { CTimer } from "../system/CTimer.js";
import { MessagePort, Worker } from "worker_threads";
import { PacketWorld } from "./PacketWorld.js";
import { CUniqueID } from "../basic/CUniqueID.js";

class CZoneUser 
{
    constructor(ws,_pk)
    {
        this.mWebSocket=ws;
        this.mPrivateKey=_pk;
        this.mUniqueKey=ws["id"];
    }
    mNick="";
    mUniqueKey=null;
    mPrivateKey=null;
    mZoneWorker :CZoneWorker=null;
    mWebSocket : WebSocket;
    mZone="";
    GetPK() : string{  return this.mPrivateKey;  }
    GetUK() : string{  return this.mUniqueKey;  }
    GetWS()   : WebSocket  {   return null;    }
    Send(_stream : CStream|string)
    {
        if(typeof _stream=="string")
            this.mWebSocket.send(_stream);
        else
            this.mWebSocket.send(_stream.Data());
    }
}
export class CZoneWorker
{
    static eState=
    {
        Init:0,
        Ready:1,
        Lock:2,
        Exit:3,
        Already:4,
        
    }
    constructor(_worker,_key)
    {
        this.mWorker=_worker;
        this.mKey=_key;
    }
    mWorker : Worker;
    mState=CZoneWorker.eState.Init;
    mUserMap=new Map<string,CZoneUser>();
    mZone="";
    mKey="";
    //mUserMap=new Map<WebSocket,IZoneUser>();
    Send(_stream : CStream)
    {
        this.mWorker.postMessage(_stream.Data());
    }
}
export class CZone
{

    
    mZone="";
    mKey="";
    mUserMax=1024;
    mUserSet=new Set<string>();
    mParentPort : MessagePort;
    mFrameTime=0;
    mFrameCount=0;
    constructor(_pp : MessagePort)
    {
        this.mParentPort=_pp;
        this.mKey=CUniqueID.GetHash();
    }
    PushUser(_key)
    {
        if(this.mUserSet.has(_key))
        {
            this.Send(PacketWorld.ZoneJoinUser(_key,CZoneWorker.eState.Already));
            return true;
        }
        if(this.mUserSet.size>=this.mUserMax )
        {
            this.Send(PacketWorld.ZoneJoinUser(_key,CZoneWorker.eState.Lock));
            return false;
        }
        this.mUserSet.add(_key);
        this.Send(PacketWorld.ZoneJoinUser(_key,CZoneWorker.eState.Ready));
        return false;
    }
    
    UpdateLoop()
    {
        let timer=new CTimer();
        setInterval(()=>{
            
            let update=new CUpdate();
            update.mFixedTime=update.mDeltaTime=timer.Delay();
            update.mFixedCount=1;
            this.Update(update);
            
        },10);
    }
    Update(_update : CUpdate)
    {

        this.mFrameTime+=_update.DeltaTime();
        this.mFrameCount++;
        //CConsol.Log(" DeltaTime "+_update.DeltaTime());

        if(this.mFrameTime>1)
        {
            CConsol.Log(this.constructor.name+" / "+this.mFrameCount);
            this.mFrameTime=0;
            this.mFrameCount=0;
            
        }
        
        
        
    }
    ThreadMessage(parentPort : MessagePort,message : string)
    {
        
    }

    Send(_stream : CStream)
    {
        this.mParentPort.postMessage(_stream.Data());
    }
}

//world서버는 오직 하나만 가동되어야 한다!!!!!
//상속받은 다른 서버가 있으면 꼬인다!
@URLPatterns(["/world"])
export class CWorldServer extends CServerSocker
{
    mJoinUser=new Array<CZoneUser>();
    //mZoneMap=new Map<string,Array<CZoneWorker>>();

    mZoneMap=new Map<string,CZoneWorker>();
    mUserMap=new Map<WebSocket,CZoneUser>();
    mLoopInterval=null;
    constructor()
    {
        super();
        this.On(CEvent.eType.Message,new CEvent(this.SocketMessage,this));
        this.On(CEvent.eType.Close,new CEvent(this.SocketClose,this));
    }
   
    ReadyZone()
    {
        
    }

    
    UserSelectZone(_privateKey : string)
    {
        return "";
    }

    UpdateLoop()
    {
        this.mLoopInterval=setInterval(()=>{this.Update();},10);
    }
    Update()
    {
        this.ReadyZone();


        if(this.mJoinUser.length==0)    return;

        let ju=this.mJoinUser[0];
        

        for(let [key,zone] of this.mZoneMap)
        {
            if(zone.mState==CZoneWorker.eState.Ready && zone.mZone==ju.mZone)
            {
                zone.Send(PacketWorld.ZoneConnect(ju.GetUK(),ju.mNick));
                break;
            }
        } 
    }
    SocketClose(ws : WebSocket)
    {
        let user=this.mUserMap.get(ws);
        if(user!=null)
        {
            user.mZoneWorker.Send(PacketWorld.WorldRemoveUser(user.mUniqueKey));
            user.mZoneWorker.mUserMap.delete(user.mUniqueKey);
            this.mUserMap.delete(ws);

            for(let i=0;i<this.mJoinUser.length;++i)
            {
                if(this.mJoinUser[i]==user)
                {
                    this.mJoinUser.splice(i,1);
                    break;
                }
            }
        }

    }
    SocketMessage(ws : WebSocket,message : string)
    {
        let stream=new CStream(message.toString());            
        let header = stream.GetString();

        if(header==PacketWorld.eHeader.WorldConnect)
        {
            if(this.mUserMap.has(ws)) return;//중복 조인 막기


            let ConnectAck=PacketWorld.WorldConnect(stream);
            let zu=new CZoneUser(ws,ConnectAck.privateKey);
            zu.mZone=this.UserSelectZone(ConnectAck.privateKey);
            zu.mNick=ConnectAck.nick;
            this.mJoinUser.push(zu);
            this.mUserMap.set(ws,zu);
            
            
        }
        //받은 폐킷은 접속한 존으로 보낸다
        else
        {
            let zoneUser=this.mUserMap.get(ws);
            zoneUser.mZoneWorker.Send(stream);
        }
        
        
    }
    ThreadMessage(zone : CZoneWorker,message : string)
    {
        let stream : CStream=new CStream(message.toString());            
        let header = stream.GetString();

        if(header==PacketWorld.eHeader.ZoneJoinUser)
        {
            let ZoneJoinUser=PacketWorld.ZoneJoinUser(stream);
            
           
            for(let [key,value] of this.mUserMap)
            {
                if(value.mUniqueKey==ZoneJoinUser.uniqueKey)
                {
                    this.mJoinUser.splice(0,1);

                    if(value.mZoneWorker==null && ZoneJoinUser.state!=CZoneWorker.eState.Already)
                    {
                        value.mZoneWorker=zone;
                        zone.mUserMap.set(value.mUniqueKey,value);
                    }
                    
                    
                    
                    break;
                }
            }
            
            if(ZoneJoinUser.state!=CZoneWorker.eState.Already)
                zone.mState=ZoneJoinUser.state;
            
            
            
            
            
        }
        else if(header==PacketWorld.eHeader.ZoneReady)
        {
            let ZoneInit=PacketWorld.ZoneReady(stream);
            let zone=this.mZoneMap.get(ZoneInit.key);    
            zone.mState=CZoneWorker.eState.Ready;
                
        }
        else if(header==PacketWorld.eHeader.ZoneRelay)
        {
            let ZoneRelay=PacketWorld.ZoneRelay(stream);
            
            if(ZoneRelay.uniqueKey=="")
            {
                for(let user of zone.mUserMap.values())
                {
                    user.Send(ZoneRelay.data);
                }
            }
            else
            {
                let user=zone.mUserMap.get(ZoneRelay.uniqueKey);
                user.Send(ZoneRelay.data);
            }
            
        }
        
    }
    override Destroy(): void {
        super.Destroy();
        clearInterval(this.mLoopInterval);
        this.mLoopInterval = null;

        for(let [key,value] of this.mZoneMap)
        {
            value.mWorker.terminate();

            value.mWorker.removeAllListeners("message");
            value.mWorker.removeAllListeners("exit");
            value.mWorker.removeAllListeners("error");
        }
    }
}
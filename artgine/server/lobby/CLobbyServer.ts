
import { MessagePort, parentPort, workerData } from "worker_threads";
import { CUpdate, IListener } from "../../basic/Basic.js";
import { CConsol } from "../../basic/CConsol.js";
import { CEvent } from "../../basic/CEvent.js";
import { CStream } from "../../basic/CStream.js";
import { CUniqueID } from "../../basic/CUniqueID.js";
import { URLPatterns } from "../../network/CServerMain.js";
import { CServerSocker } from "../../network/CServerSocket.js";
import { CTimer } from "../../system/CTimer.js";
import { PacketLB } from "./PacketLB.js";

export class CLBUser 
{
    constructor(ws,_pk)
    {
        this.mSocket=ws;
        this.mPrivateKey=_pk;
        this.mUserKey=ws["id"];
    }
    mNick="";
    mUserKey=null;
    mPrivateKey=null;
    mWorker :CLBRoomWorker=null;
    mSocket : WebSocket;
    mLink=null;
    GetPK() : string{  return this.mPrivateKey;  }
    GetUK() : string{  return this.mUserKey;  }
    GetWS()   : WebSocket  {   return null;    }
    SendUser(_stream : CStream|string)
    {
        if(typeof _stream=="string")
            this.mSocket.send(_stream);
        else
            this.mSocket.send(_stream.Data());
    }
    SendRoom(_stream : CStream|string)
    {
        this.mWorker.Send(_stream);
    }
}
export class CLBRoomWorker
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
    mState=CLBRoomWorker.eState.Init;
    mUserMap=new Map<string,CLBUser>();
    mLink="";
    mKey="";
    Send(_stream : CStream|string)
    {
        if(typeof _stream=="string")
            this.mWorker.postMessage(_stream);
        else
            this.mWorker.postMessage(_stream.Data());
        
    }
}
export class CRoom
{
    mLink="";
    mKey="";
    mUserMax=1024;
    mUserSet=new Set<string>();
    mParentPort : MessagePort;
    mFrameTime=0;
    mFrameCount=0;
    
    constructor(_pp : MessagePort,_link="",_key=null)
    {
        this.mParentPort=_pp;
        this.mLink=_link;
        if(_key==null)  this.mKey=CUniqueID.GetHash();
        else this.mKey=_key;
    }
    


    PushUser(_key)
    {
        if(this.mUserSet.has(_key))
        {
            this.Send(PacketLB.R2LUserConnect({ userKey: _key, state: CLBRoomWorker.eState.Already }));
            return true;
        }
        if(this.mUserSet.size>=this.mUserMax )
        {
            this.Send(PacketLB.R2LUserConnect({ userKey: _key, state: CLBRoomWorker.eState.Lock }));
            return false;
        }
        this.mUserSet.add(_key);
        this.Send(PacketLB.R2LUserConnect({ userKey: _key, state: CLBRoomWorker.eState.Ready }));
        return false;
    }
    
    UpdateLoop()
    {
        let timer=new CTimer();
        let update=new CUpdate();
        setInterval(()=>{
            
            
            
            update.mFixedTime=update.mDeltaTime=timer.Delay();
            
            update.mFixedCount=1;
            update.mOffset++;
            this.Update(update);
            
        },10);
    }
    async Init()
    {

    }
    Update(_update : CUpdate)
    {

        this.mFrameTime+=_update.DeltaTime();
        this.mFrameCount++;
        //CConsol.Log(" DeltaTime "+_update.DeltaTime());

        if(this.mFrameTime>1)
        {
            CConsol.Log(this.mKey+" : "+this.constructor.name+" / "+this.mFrameCount);
            this.mFrameTime=0;
            this.mFrameCount=0;
            
        }
        
        
        
    }
    async Message(message : string)
    {

    }
    async ThreadMessage(parentPort : MessagePort,message : string)
    {

        
        await this.Message(message);
    }

    Send(_stream : CStream|string)
    {
        if(typeof _stream =="string")
            this.mParentPort.postMessage(_stream);
        else
            this.mParentPort.postMessage(_stream.Data());
    }
}

//world서버는 오직 하나만 가동되어야 한다!!!!!
//상속받은 다른 서버가 있으면 꼬인다!
//이걸 수정하고 싶으면 URLPatterns을 직접 호출해서 처리해라
@URLPatterns(["/lobby"])
export class CLobbyServer extends CServerSocker
{
    mJoinQue=new Array<CLBUser>();
    //mZoneMap=new Map<string,Array<CZoneWorker>>();

    mRoomMap=new Map<string,CLBRoomWorker>();
    mUserMap=new Map<WebSocket,CLBUser>();
    mLoopInterval=null;
    mJoining=false;
    constructor()
    {
        super();
        this.On(CEvent.eType.Message,new CEvent(this.SocketMessage,this));
        this.On(CEvent.eType.Close,new CEvent(this.SocketClose,this));
        setInterval(()=>{
            this.Update();    
        },1000);
    }
    Update()
    {
        
    }
    ReadyRoom()
    {
        
    }

    
    SelectRoomLink(_privateKey : string)
    {
        return "";
    }
    UpdateJoinQue()
    {
        
    }
    SocketClose(ws : WebSocket)
    {
        let user=this.mUserMap.get(ws);
        if(user!=null)
        {
            user.SendRoom(PacketLB.L2RURoomRemoveUser({ userKey: user.mUserKey }));
            user.mWorker.mUserMap.delete(user.mUserKey);
            this.mUserMap.delete(ws);

            for(let i=0;i<this.mJoinQue.length;++i)
            {
                if(this.mJoinQue[i]==user)
                {
                    this.mJoinQue.splice(i,1);
                    break;
                }
            }
        }

    }
    SocketMessage(ws : WebSocket,message : string)
    {
        
        
        
    }
    ThreadMessage(room : CLBRoomWorker,message : string)
    {
        
        
    }
    override Destroy(): void {
        super.Destroy();
        clearInterval(this.mLoopInterval);
        this.mLoopInterval = null;

        for(let [key,value] of this.mRoomMap)
        {
            value.mWorker.terminate();

            (value.mWorker as any).removeAllListeners("message");
            (value.mWorker as any).removeAllListeners("exit");
            (value.mWorker as any).removeAllListeners("error");
        }
    }
}
import CLobbyServer_imple from "../../server_imple/lobby/CLobbyServer.js"
import { CStreamHandler } from "../../network/CSocketIO.js";
CLobbyServer_imple();
import { CConsol } from "../../basic/CConsol.js";
import { CEvent } from "../../basic/CEvent.js";
import { CStream } from "../../basic/CStream.js";
import { CUniqueID } from "../../basic/CUniqueID.js";
import { URLPatterns } from "../../network/CServerMain.js";
import { CServerSocker } from "../../network/CServerSocket.js";
import { PacketSN } from "./PacketSN.js";
CWASM.IsWASM();
export class CSGRoomUser
{
    
    public mUserKey="";
    public mNick="";
    public mWS=null;
    public mRoomKey : string;
    Send(_stream : CStream)
    {
        if (this.mWS!=null &&this.mWS.readyState === this.mWS.OPEN) 
        {
            this.mWS.send(_stream.Data());
        }
        else
        {
            if(this.mWS!=null)
                this.mWS=null;
            return false;
        }    
        return true;
    }
}
export class CSGRoomData
{
    mKey : string;
    mHash : string;
    mRoomUser =new Array<CSGRoomUser>();
    mOpen=true;

    RoomSend(_stream : CStream)
    {
        let send=true;
        for(let su of this.mRoomUser)
        {
            if(su.Send(_stream)==false)
            {
                send=false;
            } 
        }


        return send;
    }
   
}

@URLPatterns(["/signaling"])
export class CSignalingServer extends CServerSocker
{
    //mWSS : WebSocketServer;
    
    mUserMap=new Map<string,CSGRoomUser>();
    mRoom=new Map<string,CSGRoomData>();
    mRoomCount=0;

   
    
    constructor()
    {
        super();

        
        this.On(CEvent.eType.Message,(ws,message)=>{
            let streamAsk=new CStream(message.toString());
            //let streamRec=new CStream();
            let header = streamAsk.GetString();
            CConsol.Log("[CSignalingServer] header : "+header);

            if (header == "RoomConnectAck")
                this.RoomConnect(streamAsk, ws);
            else if (header == "RoomDisConnect")
                this.RoomDisConnect(ws);
            else if (header == "SendUserData")
                this.SendUserData(streamAsk);
            else if (header == "Ping")
            {
                // streamAsk.ResetOffset();
                // streamAsk.Push(performance.now());
                ws.send(streamAsk.Data());
            }
            else
                this.RoomBroadcasting(streamAsk, ws);
        });
        this.On(CEvent.eType.Close,(ws)=>{
             if(ws.ru!=null)
            {
                this.RemoveRoomUser(ws.ru);
            }
        });
    }
    
    JoinRoom(_project,_enterCount,_roomUser : CSGRoomUser) : string
    {
        return "";
    }
    RoomHash(_project,_userCount)
    {
        return _project+"/"+_userCount+"/";
    }
    RoomConnect(_streamAsk : CStream,_ws)
    {
        
    }
    RemoveRoomUser(_su : CSGRoomUser)
    {
        
    }
    RoomDisConnect(_ws)
    {
        let su=this.mUserMap.get(_ws.ru.mSuk);
        if(su!=null)
        {
            this.RemoveRoomUser(su);
        }
    }
    RoomClose(_streamAsk : CStream)
    {
        
    }
    SendUserData(_streamAsk : CStream)
    {
        
    }
    RoomBroadcasting(_streamAsk : CStream,ws)
    {
        
    }
    RemoveRoomDataChk(_room : CSGRoomData)
    {
        for(let i=_room.mRoomUser.length-1;i>=0;--i)
        {
            if(_room.mRoomUser[i].mWS==null)
            {
                this.RemoveRoomUser(_room.mRoomUser[i]);
            }
        }
    }
    override Destroy(): void {
        //CConsol.Log("[CRoomServer] Destroy", CConsol.eColor.red);
        super.Destroy();
        // 모든 클라이언트 소켓 종료
        if (this.mWSS && this.mWSS.clients) {
            for (const ws of this.mWSS.clients) {
                try {
                    ws.close();
                } catch (e) {
                    console.error("Error closing client socket:", e);
                }
            }
        }
    
        // WebSocketServer 종료
        if (this.mWSS) {
            this.mWSS.close((err) => {
                if (err)
                    console.error("Error closing WebSocketServer:", err);
                else
                    CConsol.Log("[CRoomServer] Destroy", CConsol.eColor.red);
                    //CConsol.Log("[CRoomServer] WebSocketServer closed", CConsol.eColor.red);
            });
        }
    
        // 내부 구조 정리
        this.mUserMap.clear();
        this.mRoom.clear();
        this.mRoomCount = 0;
    }
}
import CSignalingServer_imple from "../../server_imple/signaling/CSignalingServer.js"
import { CWASM } from "../../basic/CWASM.js";
CSignalingServer_imple();

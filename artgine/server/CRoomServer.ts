
import { WebSocketServer } from 'ws';
import {CStream} from '../basic/CStream.js';
import {CConsol} from '../basic/CConsol.js';
import { Server } from 'http';
import { URLPatterns } from "../network/CServerMain.js"
import { CServerSocker } from '../network/CServerSocket.js';
import { CEvent } from '../basic/CEvent.js';
export class CRoomUser
{
    //public m_puk="";//private user key
    public mSuk="";//server user key
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
export class CRoomData
{
    mKey : string;
    mHash : string;
    mRoomUser =new Array<CRoomUser>();
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
    //m_maxTime=0;
    //m_startTime;
}
/*
RoomConnect
ㄴA:nick,project,userCount
ㄴR:owner(-1,0,1),connect suk,nick,roomKey
ㄴ1방장 0참여자 -1에러
ㄴex 접속하면 방에 자신에 정보를 전파한다

RoomDisConnect
ㄴR:suk

RoomClose
ㄴA:roomKey


SUKSend
ㄴA:data,suk,suk,suk...
//data다음은 정부 sukId


현재 서버는 팅기면 대응 안한다.
그리고 누가 보냈는지도 확인안한다. 상대가 내 정보를 강제로 조작가능하다.
캐릭터간 충돌,상태 갱신은, 나는 나만 갱신한다.
내가 소유한것들로 상대에 영향을 주면 내가 상대를 갱신정보를 모두에게 전송
*/

@URLPatterns(["/room"])
export class CRoomServer extends CServerSocker
{
    //mWSS : WebSocketServer;
    
    mSUKMap=new Map<string,CRoomUser>();
    mRoom=new Map<string,CRoomData>();
    mRoomCount=0;

   
    
    constructor()
    {
        super();

        
        this.On(CEvent.eType.Message,(ws,message)=>{
            let streamAsk=new CStream(message.toString());
            //let streamRec=new CStream();
            let header = streamAsk.GetString();
            CConsol.Log("[CRoomServer] header : "+header);

            if (header == "RoomConnect")
                this.RoomConnect(streamAsk, ws);
            else if (header == "RoomDisConnect")
                this.RoomDisConnect(ws);
            else if (header == "SUKSend")
                this.SUKSend(streamAsk);
            else if (header == "Ping")
            {
                streamAsk.ResetOffset();
                streamAsk.Push(performance.now());
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
    
    JoinRoom(_project,_userCount,_roomUser : CRoomUser) : string
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
    RemoveRoomUser(_su : CRoomUser)
    {
        
        
    }
    RoomDisConnect(_ws)
    {
        
        
        
    }
    RoomClose(_streamAsk : CStream)
    {
        
    }
    SUKSend(_streamAsk : CStream)
    {
        
    }
    RoomBroadcasting(_streamAsk : CStream,ws)
    {
     
    }
    RemoveRoomDataChk(_room : CRoomData)
    {
        for(let i=_room.mRoomUser.length-1;i>=0;--i)
        {
            if(_room.mRoomUser[i].mWS==null)
            {
                this.RemoveRoomUser(_room.mRoomUser[i]);
            }
        }
    }
    Destroy(): void {
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
        this.mSUKMap.clear();
        this.mRoom.clear();
        this.mRoomCount = 0;
    }
}
import CRoomServer_imple from "../server_imple/CRoomServer.js";


CRoomServer_imple();
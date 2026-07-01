import { CStream } from "../../basic/CStream.js";

export class PacketSN {
    static RoomConnectAck = CStream.DefinePacket({ nick: "", project: "", enterCount: 0 });
    static RoomConnectReq = CStream.DefinePacket({ owner: 0, userKey: "", nick: "", roomKey: "" });
    static RoomOwner = CStream.DefinePacket({ owner: 0, userKey: "" });
    static RoomDisConnect = CStream.DefinePacket({ userKey: "" });
    static RoomClose = CStream.DefinePacket({ roomKey: "" });
    static SendDataUserKey = CStream.DefinePacket({ userKey: new Array<string>(), _data: null as any });

    static {
        CStream.RegisterPacketNames(PacketSN);
    }

    // static SendPing(): any
    // {
    //     const out = new CStream();
    //     out.Push("Ping");
    //     out.Push(performance.now()); // T1
    //     return out;
    // }

    static SendData(_header : string,_data,_serverTime=0,_latency=0,_stream=new CStream()): any 
    {
        if(_latency>0 && _serverTime!=0)
        {
            _stream.Push("Latency");
            _stream.Push(_serverTime+_latency);
            _stream.Push(_header);
            _stream.Push(_data);
        }
        else
        {
            _stream.Push(_header);
            _stream.Push(_data);
        }
        return _stream;
    }
}

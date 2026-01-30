import { CStream } from "../../basic/CStream.js";

export class PacketSN {
    static eHeader = {
        "RoomConnectAck": "RoomConnectAck",
        "RoomConnectReq": "RoomConnectReq",
        "RoomOwner": "RoomOwner",
        "RoomDisConnect": "RoomDisConnect",
        "RoomClose": "RoomClose",
        "SendDataUserKey": "SendDataUserKey",
        "SendPing": "SendPing",
        "SendData": "SendData"
    };

    static RoomConnectAck(nick: string, project: string, enterCount: number): CStream;
    static RoomConnectAck(_stream: CStream): {nick: string, project: string, enterCount: number};
    static RoomConnectAck(nick: string | CStream, project: string | null = null, enterCount: number | null = null,_stream=new CStream()): any {
        if (nick instanceof CStream) {
            return nick.GetPacket("nick", "project", "enterCount");
        }
        _stream.Push("RoomConnectAck").Push(nick).Push(project).Push(enterCount);
        return _stream;
    }

    static RoomConnectReq(owner: number, userKey: string, nick: string, roomKey: string): CStream;
    static RoomConnectReq(_stream: CStream): {owner: number, userKey: string, nick: string, roomKey: string};
    static RoomConnectReq(owner: number | CStream, userKey: string | null = null, nick: string | null = null, roomKey: string | null = null,_stream=new CStream()): any {
        if (owner instanceof CStream) {
            return owner.GetPacket("owner", "userKey", "nick", "roomKey");
        }
        _stream.Push("RoomConnectReq").Push(owner).Push(userKey).Push(nick).Push(roomKey);
        return _stream;
    }

    static RoomOwner(owner: number, userKey: string): CStream;
    static RoomOwner(_stream: CStream): {owner: number, userKey: string};
    static RoomOwner(owner: number | CStream, userKey: string | null = null,_stream=new CStream()): any {
        if (owner instanceof CStream) {
            return owner.GetPacket("owner", "userKey");
        }
        _stream.Push("RoomOwner").Push(owner).Push(userKey);
        return _stream;
    }

    static RoomDisConnect(userKey: string): CStream;
    static RoomDisConnect(_stream: CStream): {userKey: string};
    static RoomDisConnect(userKey: string | CStream,_stream=new CStream()): any {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey");
        }
        _stream.Push("RoomDisConnect").Push(userKey);
        return _stream;
    }

    static RoomClose(roomKey: string): CStream;
    static RoomClose(_stream: CStream): {roomKey: string};
    static RoomClose(roomKey: string | CStream,_stream=new CStream()): any {
        if (roomKey instanceof CStream) {
            return roomKey.GetPacket("roomKey");
        }
        _stream.Push("RoomClose").Push(roomKey);
        return _stream;
    }

    static SendDataUserKey(userKey: Array<string>, _data: any): CStream;
    static SendDataUserKey(_stream: CStream): {userKey: Array<string>, _data: any};
    static SendDataUserKey(userKey: Array<string> | CStream, _data: any | null = null,_stream=new CStream()): any {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey", "_data");
        }
        _stream.Push("SendDataUserKey").Push(userKey).Push(_data);
        return _stream;
    }

    static SendPing(): any 
    {
        const out = new CStream();
        out.Push("Ping");
        out.Push(performance.now()); // T1
        return out;
    }

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
//EntryPoint
var PacketSN_JSON={
    "RoomConnectAck": {
        "nick": "string",
        "project": "string",
        "enterCount": "number"
    },
    "RoomConnectReq": {
        "owner": "number",
        "userKey": "string",
        "nick": "string",
        "roomKey": "string",
    },
    "RoomOwner": {
        "owner": "number",
        "userKey": "string",
    },
    "RoomDisConnect": {
        "userKey": "string",
    },
    "RoomClose": {
        "roomKey": "string",
    },
    "SendDataUserKey": {
        "userKey": "Array<string>",
        "_data": "any",
    },
};
function SendPing(): any 
{
    const out = new CStream();
    out.Push("Ping");
    out.Push(performance.now()); // T1
    return out;
}
function SendData(_header : string,_data,_serverTime=0,_latency=0,_stream=new CStream()): any 
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
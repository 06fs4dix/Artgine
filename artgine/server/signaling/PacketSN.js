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
    static RoomConnectAck(nick, project = null, enterCount = null, _stream = new CStream()) {
        if (nick instanceof CStream) {
            return nick.GetPacket("nick", "project", "enterCount");
        }
        _stream.Push("RoomConnectAck").Push(nick).Push(project).Push(enterCount);
        return _stream;
    }
    static RoomConnectReq(owner, userKey = null, nick = null, roomKey = null, _stream = new CStream()) {
        if (owner instanceof CStream) {
            return owner.GetPacket("owner", "userKey", "nick", "roomKey");
        }
        _stream.Push("RoomConnectReq").Push(owner).Push(userKey).Push(nick).Push(roomKey);
        return _stream;
    }
    static RoomOwner(owner, userKey = null, _stream = new CStream()) {
        if (owner instanceof CStream) {
            return owner.GetPacket("owner", "userKey");
        }
        _stream.Push("RoomOwner").Push(owner).Push(userKey);
        return _stream;
    }
    static RoomDisConnect(userKey, _stream = new CStream()) {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey");
        }
        _stream.Push("RoomDisConnect").Push(userKey);
        return _stream;
    }
    static RoomClose(roomKey, _stream = new CStream()) {
        if (roomKey instanceof CStream) {
            return roomKey.GetPacket("roomKey");
        }
        _stream.Push("RoomClose").Push(roomKey);
        return _stream;
    }
    static SendDataUserKey(userKey, _data = null, _stream = new CStream()) {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey", "_data");
        }
        _stream.Push("SendDataUserKey").Push(userKey).Push(_data);
        return _stream;
    }
    static SendPing() {
        const out = new CStream();
        out.Push("Ping");
        out.Push(performance.now());
        return out;
    }
    static SendData(_header, _data, _serverTime = 0, _latency = 0, _stream = new CStream()) {
        if (_latency > 0 && _serverTime != 0) {
            _stream.Push("Latency");
            _stream.Push(_serverTime + _latency);
            _stream.Push(_header);
            _stream.Push(_data);
        }
        else {
            _stream.Push(_header);
            _stream.Push(_data);
        }
        return _stream;
    }
}
var PacketSN_JSON = {
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
function SendPing() {
    const out = new CStream();
    out.Push("Ping");
    out.Push(performance.now());
    return out;
}
function SendData(_header, _data, _serverTime = 0, _latency = 0, _stream = new CStream()) {
    if (_latency > 0 && _serverTime != 0) {
        _stream.Push("Latency");
        _stream.Push(_serverTime + _latency);
        _stream.Push(_header);
        _stream.Push(_data);
    }
    else {
        _stream.Push(_header);
        _stream.Push(_data);
    }
    return _stream;
}

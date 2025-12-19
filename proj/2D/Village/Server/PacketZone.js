import { CStream } from "../../../../artgine/basic/CStream.js";
export class PacketZone {
    static eHeader = {
        "WorldConnectAck": "WorldConnectAck",
        "WorldConnectReq": "WorldConnectReq",
        "ZoneReady": "ZoneReady",
        "ZoneJoinAck": "ZoneJoinAck",
        "ZoneJoinReq": "ZoneJoinReq",
        "ZoneRelay": "ZoneRelay",
        "UserIn": "UserIn",
        "UserPad": "UserPad",
        "UserClose": "UserClose",
        "ZoneInfoAck": "ZoneInfoAck",
        "ZoneInfoReq": "ZoneInfoReq"
    };
    static WorldConnectAck(privateKey) {
        if (privateKey instanceof CStream) {
            return privateKey.GetPacket("privateKey");
        }
        return new CStream().Push("WorldConnectAck").Push(privateKey);
    }
    static WorldConnectReq(uniqueKey) {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey");
        }
        return new CStream().Push("WorldConnectReq").Push(uniqueKey);
    }
    static ZoneReady(zone, offset = null) {
        if (zone instanceof CStream) {
            return zone.GetPacket("zone", "offset");
        }
        return new CStream().Push("ZoneReady").Push(zone).Push(offset);
    }
    static ZoneJoinAck(uniqueKey, offset = null) {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "offset");
        }
        return new CStream().Push("ZoneJoinAck").Push(uniqueKey).Push(offset);
    }
    static ZoneJoinReq(uniqueKey, state = null) {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "state");
        }
        return new CStream().Push("ZoneJoinReq").Push(uniqueKey).Push(state);
    }
    static ZoneRelay(uniqueKey, data = null) {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "data");
        }
        return new CStream().Push("ZoneRelay").Push(uniqueKey).Push(data);
    }
    static UserIn(uniqueKey, pos = null) {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "pos");
        }
        return new CStream().Push("UserIn").Push(uniqueKey).Push(pos);
    }
    static UserPad(uniqueKey, dir = null, pos = null) {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "dir", "pos");
        }
        return new CStream().Push("UserPad").Push(uniqueKey).Push(dir).Push(pos);
    }
    static UserClose(uniqueKey) {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey");
        }
        return new CStream().Push("UserClose").Push(uniqueKey);
    }
    static ZoneInfoAck(uniqueKey) {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey");
        }
        return new CStream().Push("ZoneInfoAck").Push(uniqueKey);
    }
    static ZoneInfoReq(_key, _pos = null) {
        if (_key instanceof CStream) {
            return _key.GetPacket("_key", "_pos");
        }
        return new CStream().Push("ZoneInfoReq").Push(_key).Push(_pos);
    }
}
var json = {
    "WorldConnectAck": {
        "privateKey": "string",
    },
    "WorldConnectReq": {
        "uniqueKey": "string"
    },
    "ZoneReady": {
        "zone": "string",
        "offset": "number",
    },
    "ZoneJoinAck": {
        "uniqueKey": "string",
        "offset": "number",
    },
    "ZoneJoinReq": {
        "uniqueKey": "string",
        "state": "number"
    },
    "ZoneRelay": {
        "uniqueKey": "string",
        "data": "string",
    },
    "UserIn": {
        "uniqueKey": "string",
        "pos": "CVec3",
    },
    "UserPad": {
        "uniqueKey": "string",
        "dir": "CVec3",
        "pos": "CVec3",
    },
    "UserClose": {
        "uniqueKey": "string",
    },
};
function ZoneInfoAck(uniqueKey) {
    if (uniqueKey instanceof CStream) {
        return uniqueKey.GetPacket("uniqueKey");
    }
    return new CStream().Push("ZoneInfoAck").Push(uniqueKey);
}
function ZoneInfoReq(_key, _pos = null) {
    if (_key instanceof CStream) {
        return _key.GetPacket("_key", "_pos");
    }
    return new CStream().Push("ZoneInfoReq").Push(_key).Push(_pos);
}

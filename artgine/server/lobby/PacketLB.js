import { CStream } from "../../basic/CStream.js";
export class PacketLB {
    static eHeader = {
        "U2LLobbyConnect": "U2LLobbyConnect",
        "L2ULobbyConnectError": "L2ULobbyConnectError",
        "L2RRoomConnect": "L2RRoomConnect",
        "R2LUserConnect": "R2LUserConnect",
        "R2URoomInfo": "R2URoomInfo",
        "R2URoomPushUser": "R2URoomPushUser",
        "L2RURoomRemoveUser": "L2RURoomRemoveUser",
        "R2LRoomReady": "R2LRoomReady",
        "R2UListSend": "R2UListSend",
        "R2UAllSend": "R2UAllSend",
        "R2RSend": "R2RSend",
        "R2USave": "R2USave"
    };
    static U2LLobbyConnect(privateKey, nick = null, project = null, _stream = new CStream()) {
        if (privateKey instanceof CStream) {
            return privateKey.GetPacket("privateKey", "nick", "project");
        }
        _stream.Push("U2LLobbyConnect").Push(privateKey).Push(nick).Push(project);
        return _stream;
    }
    static L2ULobbyConnectError(code, msg = null, _stream = new CStream()) {
        if (code instanceof CStream) {
            return code.GetPacket("code", "msg");
        }
        _stream.Push("L2ULobbyConnectError").Push(code).Push(msg);
        return _stream;
    }
    static L2RRoomConnect(userKey, nick = null, privateKey = null, _stream = new CStream()) {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey", "nick", "privateKey");
        }
        _stream.Push("L2RRoomConnect").Push(userKey).Push(nick).Push(privateKey);
        return _stream;
    }
    static R2LUserConnect(userKey, state = null, _stream = new CStream()) {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey", "state");
        }
        _stream.Push("R2LUserConnect").Push(userKey).Push(state);
        return _stream;
    }
    static R2URoomInfo(userKey, data = null, _stream = new CStream()) {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey", "data");
        }
        _stream.Push("R2URoomInfo").Push(userKey).Push(data);
        return _stream;
    }
    static R2URoomPushUser(userKey, data = null, _stream = new CStream()) {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey", "data");
        }
        _stream.Push("R2URoomPushUser").Push(userKey).Push(data);
        return _stream;
    }
    static L2RURoomRemoveUser(userKey, _stream = new CStream()) {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey");
        }
        _stream.Push("L2RURoomRemoveUser").Push(userKey);
        return _stream;
    }
    static R2LRoomReady(key, _stream = new CStream()) {
        if (key instanceof CStream) {
            return key.GetPacket("key");
        }
        _stream.Push("R2LRoomReady").Push(key);
        return _stream;
    }
    static R2UListSend(userKeyList, data = null, _stream = new CStream()) {
        if (userKeyList instanceof CStream) {
            return userKeyList.GetPacket("userKeyList", "data");
        }
        _stream.Push("R2UListSend").Push(userKeyList).Push(data);
        return _stream;
    }
    static R2UAllSend(data, _stream = new CStream()) {
        if (data instanceof CStream) {
            return data.GetPacket("data");
        }
        _stream.Push("R2UAllSend").Push(data);
        return _stream;
    }
    static R2RSend(data, _stream = new CStream()) {
        if (data instanceof CStream) {
            return data.GetPacket("data");
        }
        _stream.Push("R2RSend").Push(data);
        return _stream;
    }
    static R2USave(userKey, data = null, _stream = new CStream()) {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey", "data");
        }
        _stream.Push("R2USave").Push(userKey).Push(data);
        return _stream;
    }
}
var PacketLB_JSON = {
    "U2LLobbyConnect": {
        "privateKey": "string",
        "nick": "string",
        "project": "string"
    },
    "L2ULobbyConnectError": {
        "code": "string",
        "msg": "string",
    },
    "L2RRoomConnect": {
        "userKey": "string",
        "nick": "string",
        "privateKey": "string",
    },
    "R2LUserConnect": {
        "userKey": "string",
        "state": "number",
    },
    "R2URoomInfo": {
        "userKey": "string",
        "data": "string",
    },
    "R2URoomPushUser": {
        "userKey": "string",
        "data": "string",
    },
    "L2RURoomRemoveUser": {
        "userKey": "string",
    },
    "R2LRoomReady": {
        "key": "string",
    },
    "R2UListSend": {
        "userKeyList": "Array<string>",
        "data": "string",
    },
    "R2UAllSend": {
        "data": "string",
    },
    "R2RSend": {
        "data": "string",
    },
    "R2USave": {
        "userKey": "string",
        "data": "string",
    },
};

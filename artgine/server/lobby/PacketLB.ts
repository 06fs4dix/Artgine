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
        "R2USend": "R2USend",
        "R2USave": "R2USave"
    };

    static U2LLobbyConnect(privateKey: string, nick: string, project: string): CStream;
    static U2LLobbyConnect(_stream: CStream): {privateKey: string, nick: string, project: string};
    static U2LLobbyConnect(privateKey: string | CStream, nick: string | null = null, project: string | null = null,_stream=new CStream()): any {
        if (privateKey instanceof CStream) {
            return privateKey.GetPacket("privateKey", "nick", "project");
        }
        _stream.Push("U2LLobbyConnect").Push(privateKey).Push(nick).Push(project);
        return _stream;
    }

    static L2ULobbyConnectError(code: string, msg: string): CStream;
    static L2ULobbyConnectError(_stream: CStream): {code: string, msg: string};
    static L2ULobbyConnectError(code: string | CStream, msg: string | null = null,_stream=new CStream()): any {
        if (code instanceof CStream) {
            return code.GetPacket("code", "msg");
        }
        _stream.Push("L2ULobbyConnectError").Push(code).Push(msg);
        return _stream;
    }

    static L2RRoomConnect(userKey: string, nick: string, privateKey: string): CStream;
    static L2RRoomConnect(_stream: CStream): {userKey: string, nick: string, privateKey: string};
    static L2RRoomConnect(userKey: string | CStream, nick: string | null = null, privateKey: string | null = null,_stream=new CStream()): any {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey", "nick", "privateKey");
        }
        _stream.Push("L2RRoomConnect").Push(userKey).Push(nick).Push(privateKey);
        return _stream;
    }

    static R2LUserConnect(userKey: string, state: number): CStream;
    static R2LUserConnect(_stream: CStream): {userKey: string, state: number};
    static R2LUserConnect(userKey: string | CStream, state: number | null = null,_stream=new CStream()): any {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey", "state");
        }
        _stream.Push("R2LUserConnect").Push(userKey).Push(state);
        return _stream;
    }

    static R2URoomInfo(userKey: string, data: string): CStream;
    static R2URoomInfo(_stream: CStream): {userKey: string, data: string};
    static R2URoomInfo(userKey: string | CStream, data: string | null = null,_stream=new CStream()): any {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey", "data");
        }
        _stream.Push("R2URoomInfo").Push(userKey).Push(data);
        return _stream;
    }

    static R2URoomPushUser(userKey: string, data: string): CStream;
    static R2URoomPushUser(_stream: CStream): {userKey: string, data: string};
    static R2URoomPushUser(userKey: string | CStream, data: string | null = null,_stream=new CStream()): any {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey", "data");
        }
        _stream.Push("R2URoomPushUser").Push(userKey).Push(data);
        return _stream;
    }

    static L2RURoomRemoveUser(userKey: string): CStream;
    static L2RURoomRemoveUser(_stream: CStream): {userKey: string};
    static L2RURoomRemoveUser(userKey: string | CStream,_stream=new CStream()): any {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey");
        }
        _stream.Push("L2RURoomRemoveUser").Push(userKey);
        return _stream;
    }

    static R2LRoomReady(key: string): CStream;
    static R2LRoomReady(_stream: CStream): {key: string};
    static R2LRoomReady(key: string | CStream,_stream=new CStream()): any {
        if (key instanceof CStream) {
            return key.GetPacket("key");
        }
        _stream.Push("R2LRoomReady").Push(key);
        return _stream;
    }

    static R2USend(userKeyList: Array<string>, block: string, data: string): CStream;
    static R2USend(_stream: CStream): {userKeyList: Array<string>, block: string, data: string};
    static R2USend(userKeyList: Array<string> | CStream, block: string | null = null, data: string | null = null,_stream=new CStream()): any {
        if (userKeyList instanceof CStream) {
            return userKeyList.GetPacket("userKeyList", "block", "data");
        }
        _stream.Push("R2USend").Push(userKeyList).Push(block).Push(data);
        return _stream;
    }

    static R2USave(userKey: string, data: string): CStream;
    static R2USave(_stream: CStream): {userKey: string, data: string};
    static R2USave(userKey: string | CStream, data: string | null = null,_stream=new CStream()): any {
        if (userKey instanceof CStream) {
            return userKey.GetPacket("userKey", "data");
        }
        _stream.Push("R2USave").Push(userKey).Push(data);
        return _stream;
    }
}
//EntryPoint
//U : User L : Lobby R : Room
//[Start]2[End]

var PacketLB_JSON={
    "U2LLobbyConnect": {
        "privateKey": "string",
        "nick": "string",
        "project": "string"
    },
    "L2ULobbyConnectError": {
        "code":"string",
        "msg":"string",
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
    "R2USend": {
        "userKeyList": "Array<string>",
        "block": "string",
        "data": "string",
    },
    "R2USave": {
        "userKey": "string",
        "data": "string",
    },  
};
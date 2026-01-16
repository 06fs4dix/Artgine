import { CStream } from "../basic/CStream.js";

export class PacketWorld {
    static eHeader = {
        "WorldConnect": "WorldConnect",
        "WorldInfo": "WorldInfo",
        "WorldPushUser": "WorldPushUser",
        "WorldRemoveUser": "WorldRemoveUser",
        "ZoneConnect": "ZoneConnect",
        "ZoneReady": "ZoneReady",
        "ZoneJoinUser": "ZoneJoinUser",
        "ZoneRelay": "ZoneRelay",
    };
    //link는 안넣어도됌
    static WorldConnect(privateKey: string, nick: string,link: string): CStream;
    static WorldConnect(_stream: CStream): {privateKey: string, nick: string,link:string};
    static WorldConnect(privateKey: string | CStream, nick: string| null=null,link:string | null = null): any {
        if (privateKey instanceof CStream) {
            return privateKey.GetPacket("privateKey", "nick","link");
        }
        return new CStream().Push("WorldConnect").Push(privateKey).Push(nick);
    }

    static WorldInfo(uniqueKey: string, dataList: string): CStream;
    static WorldInfo(_stream: CStream): {uniqueKey: string, dataList: string};
    static WorldInfo(uniqueKey: string | CStream, dataList: string | null = null): any {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "dataList");
        }
        return new CStream().Push("WorldInfo").Push(uniqueKey).Push(dataList);
    }

    static WorldPushUser(uniqueKey: string, data: string): CStream;
    static WorldPushUser(_stream: CStream): {uniqueKey: string, data: string};
    static WorldPushUser(uniqueKey: string | CStream, data: string | null = null): any {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "data");
        }
        return new CStream().Push("WorldPushUser").Push(uniqueKey).Push(data);
    }

    static WorldRemoveUser(uniqueKey: string): CStream;
    static WorldRemoveUser(_stream: CStream): {uniqueKey: string};
    static WorldRemoveUser(uniqueKey: string | CStream): any {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey");
        }
        return new CStream().Push("WorldRemoveUser").Push(uniqueKey);
    }

    static ZoneConnect(uniqueKey: string, nick: string): CStream;
    static ZoneConnect(_stream: CStream): {uniqueKey: string, nick: string};
    static ZoneConnect(uniqueKey: string | CStream, nick: string | null = null): any {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "nick");
        }
        return new CStream().Push("ZoneConnect").Push(uniqueKey).Push(nick);
    }

    static ZoneReady(zone: string, key: string): CStream;
    static ZoneReady(_stream: CStream): {zone: string, key: string};
    static ZoneReady(zone: string | CStream, key: string | null = null): any {
        if (zone instanceof CStream) {
            return zone.GetPacket("zone", "key");
        }
        return new CStream().Push("ZoneReady").Push(zone).Push(key);
    }

    static ZoneJoinUser(uniqueKey: string, state: number): CStream;
    static ZoneJoinUser(_stream: CStream): {uniqueKey: string, state: number};
    static ZoneJoinUser(uniqueKey: string | CStream, state: number | null = null): any {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "state");
        }
        return new CStream().Push("ZoneJoinUser").Push(uniqueKey).Push(state);
    }

    static ZoneRelay(uniqueKey: string, data: string): CStream;
    static ZoneRelay(_stream: CStream): {uniqueKey: string, data: string};
    static ZoneRelay(uniqueKey: string | CStream, data: string | null = null): any {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "data");
        }
        return new CStream().Push("ZoneRelay").Push(uniqueKey).Push(data);
    }

 
}
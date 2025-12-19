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
    static WorldConnect(privateKey, nick = null) {
        if (privateKey instanceof CStream) {
            return privateKey.GetPacket("privateKey", "nick");
        }
        return new CStream().Push("WorldConnect").Push(privateKey).Push(nick);
    }
    static WorldInfo(uniqueKey, dataList = null) {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "dataList");
        }
        return new CStream().Push("WorldInfo").Push(uniqueKey).Push(dataList);
    }
    static WorldPushUser(uniqueKey, data = null) {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "data");
        }
        return new CStream().Push("WorldPushUser").Push(uniqueKey).Push(data);
    }
    static WorldRemoveUser(uniqueKey) {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey");
        }
        return new CStream().Push("WorldRemoveUser").Push(uniqueKey);
    }
    static ZoneConnect(uniqueKey, nick = null) {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "nick");
        }
        return new CStream().Push("ZoneConnect").Push(uniqueKey).Push(nick);
    }
    static ZoneReady(zone, offset = null) {
        if (zone instanceof CStream) {
            return zone.GetPacket("zone", "offset");
        }
        return new CStream().Push("ZoneReady").Push(zone).Push(offset);
    }
    static ZoneJoinUser(uniqueKey, state = null) {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "state");
        }
        return new CStream().Push("ZoneJoinUser").Push(uniqueKey).Push(state);
    }
    static ZoneRelay(uniqueKey, data = null) {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "data");
        }
        return new CStream().Push("ZoneRelay").Push(uniqueKey).Push(data);
    }
}

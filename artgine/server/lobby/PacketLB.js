import { CStream } from "../../basic/CStream.js";
export class PacketLB {
    static U2LLobbyConnect = CStream.DefinePacket({ privateKey: "", nick: "", project: "" });
    static L2ULobbyConnectError = CStream.DefinePacket({ code: "", msg: "" });
    static L2RRoomConnect = CStream.DefinePacket({ userKey: "", nick: "", privateKey: "" });
    static R2LUserConnect = CStream.DefinePacket({ userKey: "", state: 0 });
    static R2URoomInfo = CStream.DefinePacket({ userKey: "", data: "" });
    static R2URoomPushUser = CStream.DefinePacket({ userKey: "", data: "" });
    static L2RURoomRemoveUser = CStream.DefinePacket({ userKey: "" });
    static R2LRoomReady = CStream.DefinePacket({ key: "" });
    static R2UListSend = CStream.DefinePacket({ userKeyList: new Array(), data: "" });
    static R2UAllSend = CStream.DefinePacket({ data: "" });
    static R2RSend = CStream.DefinePacket({ data: "" });
    static R2USave = CStream.DefinePacket({ userKey: "", data: "" });
    static {
        CStream.RegisterPacketNames(PacketLB);
    }
}

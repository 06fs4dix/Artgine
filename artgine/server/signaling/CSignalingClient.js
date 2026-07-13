import { CEvent } from "../../basic/CEvent.js";
import { CSocketIO } from "../../network/CSocketIO.js";
import { PacketSN } from "./PacketSN.js";
export class CSignalingClient extends CSocketIO {
    mOwnerKey = null;
    constructor(_local) {
        let event = new Array();
        super(_local, "signaling", event);
        if (_local)
            this.mOwnerKey = "local";
        event[PacketSN.RoomOwner.name] = new CEvent((_stream) => {
            let RoomConnectReq = PacketSN.RoomConnectReq(_stream);
            this.mOwnerKey = RoomConnectReq.userKey;
            _stream.ResetOffset();
            _stream.GetString();
            event[PacketSN.RoomConnectReq.name].Call(_stream);
        });
    }
    GetOwnerKey() {
        return this.mOwnerKey;
    }
}

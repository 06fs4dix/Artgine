import { CStream } from "../../../../artgine/basic/CStream.js";
import { CVec3 } from "../../../../artgine/geometry/CVec3.js";
export class PacketVillage {
    static eHeader = {
        "UserPad": "UserPad"
    };
    static UserPad(uniqueKey, dir = null, pos = null) {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "dir", "pos");
        }
        return new CStream().Push("UserPad").Push(uniqueKey).Push(dir).Push(pos);
    }
}
import { CObject } from "../../../../artgine/basic/CObject.js";
export class CWorldUser extends CObject {
    constructor(_uk, _pos, _nick) {
        super();
        this.uniqueKey = _uk;
        this.pos = _pos;
        this.nick = _nick;
    }
    uniqueKey = "";
    pos = new CVec3();
    nick = "";
}
var json = {
    "UserPad": {
        "uniqueKey": "string",
        "dir": "CVec3",
        "pos": "CVec3"
    },
};

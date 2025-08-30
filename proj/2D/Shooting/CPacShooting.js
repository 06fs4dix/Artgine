import { CStream } from "../../../artgine/basic/CStream.js";
export class CPacShooting {
    static eHeader = {
        "MonCreate": "MonCreate",
        "UserShot": "UserShot",
        "Effect": "Effect",
        "Pos": "Pos"
    };
    static MonCreate(monKey, pos = null, type = null) {
        if (monKey instanceof CStream) {
            return monKey.GetPacket("monKey", "pos", "type");
        }
        return new CStream().Push("MonCreate").Push(monKey).Push(pos).Push(type);
    }
    static UserShot(pos) {
        if (pos instanceof CStream) {
            return pos.GetPacket("pos");
        }
        return new CStream().Push("UserShot").Push(pos);
    }
    static Effect(key, pos = null, size = null) {
        if (key instanceof CStream) {
            return key.GetPacket("key", "pos", "size");
        }
        return new CStream().Push("Effect").Push(key).Push(pos).Push(size);
    }
    static Pos(suk, nick = null, pos = null, dir = null) {
        if (suk instanceof CStream) {
            return suk.GetPacket("suk", "nick", "pos", "dir");
        }
        return new CStream().Push("Pos").Push(suk).Push(nick).Push(pos).Push(dir);
    }
    static Test(_test) {
    }
}
var json = {
    "MonCreate": {
        "monKey": "string",
        "pos": "CVec3",
        "type": "string"
    },
    "UserShot": {
        "pos": "CVec3"
    },
    "Effect": {
        "key": "string",
        "pos": "CVec3",
        "size": "CVec2"
    },
    "Pos": {
        "suk": "string",
        "nick": "string",
        "pos": "CVec3",
        "dir": "CVec3"
    }
};
function Test(_test) {
}

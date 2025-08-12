import { CStream } from "https://06fs4dix.github.io/Artgine/artgine/basic/CStream.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";

export class CPacShooting {
    static eHeader = {
        "MonCreate": "MonCreate",
        "UserShot": "UserShot",
        "Effect": "Effect",
        "Pos": "Pos"
    };

    static MonCreate(monKey: string, pos: CVec3, type: string): CStream;
    static MonCreate(_stream: CStream): {monKey: string, pos: CVec3, type: string};
    static MonCreate(monKey: string | CStream, pos: CVec3 | null = null, type: string | null = null): any {
        if (monKey instanceof CStream) {
            return monKey.GetPacket("monKey", "pos", "type");
        }
        return new CStream().Push("MonCreate").Push(monKey).Push(pos).Push(type);
    }

    static UserShot(pos: CVec3): CStream;
    static UserShot(_stream: CStream): {pos: CVec3};
    static UserShot(pos: CVec3 | CStream): any {
        if (pos instanceof CStream) {
            return pos.GetPacket("pos");
        }
        return new CStream().Push("UserShot").Push(pos);
    }

    static Effect(key: string, pos: CVec3, size: CVec2): CStream;
    static Effect(_stream: CStream): {key: string, pos: CVec3, size: CVec2};
    static Effect(key: string | CStream, pos: CVec3 | null = null, size: CVec2 | null = null): any {
        if (key instanceof CStream) {
            return key.GetPacket("key", "pos", "size");
        }
        return new CStream().Push("Effect").Push(key).Push(pos).Push(size);
    }

    static Pos(suk: string, nick: string, pos: CVec3, dir: CVec3): CStream;
    static Pos(_stream: CStream): {suk: string, nick: string, pos: CVec3, dir: CVec3};
    static Pos(suk: string | CStream, nick: string | null = null, pos: CVec3 | null = null, dir: CVec3 | null = null): any {
        if (suk instanceof CStream) {
            return suk.GetPacket("suk", "nick", "pos", "dir");
        }
        return new CStream().Push("Pos").Push(suk).Push(nick).Push(pos).Push(dir);
    }

    static Test(_test : CVec4): any  {

       

    }
}
//EntryPoint
//npm run artgine_packet
//script/gen_packet.ts 이용해라!!!

var json={
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
import { CVec4 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec4.js";
function Test(_test : CVec4): any 
{
       
}
import { CStream } from "https://06fs4dix.github.io/Artgine/artgine/basic/CStream.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";

export class PacketVillage {
    static eHeader = {
        "UserPad": "UserPad"
    };

    static UserPad(uniqueKey: string, dir: CVec3, pos: CVec3): CStream;
    static UserPad(_stream: CStream): {uniqueKey: string, dir: CVec3, pos: CVec3};
    static UserPad(uniqueKey: string | CStream, dir: CVec3 | null = null, pos: CVec3 | null = null): any {
        if (uniqueKey instanceof CStream) {
            return uniqueKey.GetPacket("uniqueKey", "dir", "pos");
        }
        return new CStream().Push("UserPad").Push(uniqueKey).Push(dir).Push(pos);
    }
}
//EntryPoint
//npm run artgine_packet
//script/gen_packet.ts 이용해라!!!

import { CObject } from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js";
export class CWorldUser extends CObject
{
    constructor(_uk,_pos,_nick)
    {
        super();
        this.uniqueKey=_uk;
        this.pos=_pos;
        this.nick=_nick;
    }
    uniqueKey="";
    pos=new CVec3();
    nick="";
}
var json={
    "UserPad": {
        "uniqueKey": "string",
        "dir": "CVec3",
        "pos": "CVec3"
    },
  
};


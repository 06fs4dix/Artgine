var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { CConsol } from "../../basic/CConsol.js";
import { CEvent } from "../../basic/CEvent.js";
import { CStream } from "../../basic/CStream.js";
import { URLPatterns } from "../../network/CServerMain.js";
import { CServerSocker } from "../../network/CServerSocket.js";
CWASM.IsWASM();
export class CSGRoomUser {
    mUserKey = "";
    mNick = "";
    mWS = null;
    mRoomKey;
    Send(_stream) {
        if (this.mWS != null && this.mWS.readyState === this.mWS.OPEN) {
            this.mWS.send(_stream.Data());
        }
        else {
            if (this.mWS != null)
                this.mWS = null;
            return false;
        }
        return true;
    }
}
export class CSGRoomData {
    mKey;
    mHash;
    mRoomUser = new Array();
    mOpen = true;
    RoomSend(_stream) {
        let send = true;
        for (let su of this.mRoomUser) {
            if (su.Send(_stream) == false) {
                send = false;
            }
        }
        return send;
    }
}
let CSignalingServer = class CSignalingServer extends CServerSocker {
    mUserMap = new Map();
    mRoom = new Map();
    mRoomCount = 0;
    constructor() {
        super();
        this.On(CEvent.eType.Message, (ws, message) => {
            let streamAsk = new CStream(message.toString());
            let header = streamAsk.GetString();
            CConsol.Log("[CSignalingServer] header : " + header);
            if (header == "RoomConnectAck")
                this.RoomConnect(streamAsk, ws);
            else if (header == "RoomDisConnect")
                this.RoomDisConnect(ws);
            else if (header == "SendUserData")
                this.SendUserData(streamAsk);
            else if (header == "Ping") {
                ws.send(streamAsk.Data());
            }
            else
                this.RoomBroadcasting(streamAsk, ws);
        });
        this.On(CEvent.eType.Close, (ws) => {
            if (ws.ru != null) {
                this.RemoveRoomUser(ws.ru);
            }
        });
    }
    JoinRoom(_project, _enterCount, _roomUser) {
        return "";
    }
    RoomHash(_project, _userCount) {
        return _project + "/" + _userCount + "/";
    }
    RoomConnect(_streamAsk, _ws) {
    }
    RemoveRoomUser(_su) {
    }
    RoomDisConnect(_ws) {
        let su = this.mUserMap.get(_ws.ru.mSuk);
        if (su != null) {
            this.RemoveRoomUser(su);
        }
    }
    RoomClose(_streamAsk) {
    }
    SendUserData(_streamAsk) {
    }
    RoomBroadcasting(_streamAsk, ws) {
    }
    RemoveRoomDataChk(_room) {
        for (let i = _room.mRoomUser.length - 1; i >= 0; --i) {
            if (_room.mRoomUser[i].mWS == null) {
                this.RemoveRoomUser(_room.mRoomUser[i]);
            }
        }
    }
    Destroy() {
        super.Destroy();
        if (this.mWSS && this.mWSS.clients) {
            for (const ws of this.mWSS.clients) {
                try {
                    ws.close();
                }
                catch (e) {
                    console.error("Error closing client socket:", e);
                }
            }
        }
        if (this.mWSS) {
            this.mWSS.close((err) => {
                if (err)
                    console.error("Error closing WebSocketServer:", err);
                else
                    CConsol.Log("[CRoomServer] Destroy", CConsol.eColor.red);
            });
        }
        this.mUserMap.clear();
        this.mRoom.clear();
        this.mRoomCount = 0;
    }
};
CSignalingServer = __decorate([
    URLPatterns(["/signaling"])
], CSignalingServer);
export { CSignalingServer };
import CSignalingServer_imple from "../../server_imple/signaling/CSignalingServer.js";
import { CWASM } from "../../basic/CWASM.js";
CSignalingServer_imple();

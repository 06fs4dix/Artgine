var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { CUpdate } from "../../basic/Basic.js";
import { CConsol } from "../../basic/CConsol.js";
import { CEvent } from "../../basic/CEvent.js";
import { CUniqueID } from "../../basic/CUniqueID.js";
import { URLPatterns } from "../../network/CServerMain.js";
import { CServerSocker } from "../../network/CServerSocket.js";
import { CTimer } from "../../system/CTimer.js";
import { PacketLB } from "./PacketLB.js";
export class CLBUser {
    constructor(ws, _pk) {
        this.mSocket = ws;
        this.mPrivateKey = _pk;
        this.mUserKey = ws["id"];
    }
    mNick = "";
    mUserKey = null;
    mPrivateKey = null;
    mWorker = null;
    mSocket;
    mLink = null;
    GetPK() { return this.mPrivateKey; }
    GetUK() { return this.mUserKey; }
    GetWS() { return null; }
    SendUser(_stream) {
        if (typeof _stream == "string")
            this.mSocket.send(_stream);
        else
            this.mSocket.send(_stream.Data());
    }
    SendRoom(_stream) {
        this.mWorker.Send(_stream);
    }
}
export class CLBRoomWorker {
    static eState = {
        Init: 0,
        Ready: 1,
        Lock: 2,
        Exit: 3,
        Already: 4,
    };
    constructor(_worker, _key) {
        this.mWorker = _worker;
        this.mKey = _key;
    }
    mWorker;
    mState = CLBRoomWorker.eState.Init;
    mUserMap = new Map();
    mLink = "";
    mKey = "";
    Send(_stream) {
        if (typeof _stream == "string")
            this.mWorker.postMessage(_stream);
        else
            this.mWorker.postMessage(_stream.Data());
    }
}
export class CRoom {
    mLink = "";
    mKey = "";
    mUserMax = 1024;
    mUserSet = new Set();
    mParentPort;
    mFrameTime = 0;
    mFrameCount = 0;
    constructor(_pp, _link = "", _key = null) {
        this.mParentPort = _pp;
        this.mLink = _link;
        if (_key == null)
            this.mKey = CUniqueID.GetHash();
        else
            this.mKey = _key;
    }
    PushUser(_key) {
        if (this.mUserSet.has(_key)) {
            this.Send(PacketLB.R2LUserConnect({ userKey: _key, state: CLBRoomWorker.eState.Already }));
            return true;
        }
        if (this.mUserSet.size >= this.mUserMax) {
            this.Send(PacketLB.R2LUserConnect({ userKey: _key, state: CLBRoomWorker.eState.Lock }));
            return false;
        }
        this.mUserSet.add(_key);
        this.Send(PacketLB.R2LUserConnect({ userKey: _key, state: CLBRoomWorker.eState.Ready }));
        return false;
    }
    UpdateLoop() {
        let timer = new CTimer();
        let update = new CUpdate();
        setInterval(() => {
            update.mFixedTime = update.mDeltaTime = timer.Delay();
            update.mFixedCount = 1;
            update.mOffset++;
            this.Update(update);
        }, 10);
    }
    async Init() {
    }
    Update(_update) {
        this.mFrameTime += _update.DeltaTime();
        this.mFrameCount++;
        if (this.mFrameTime > 1) {
            CConsol.Log(this.mKey + " : " + this.constructor.name + " / " + this.mFrameCount);
            this.mFrameTime = 0;
            this.mFrameCount = 0;
        }
    }
    async Message(message) {
    }
    async ThreadMessage(parentPort, message) {
        await this.Message(message);
    }
    Send(_stream) {
        if (typeof _stream == "string")
            this.mParentPort.postMessage(_stream);
        else
            this.mParentPort.postMessage(_stream.Data());
    }
}
let CLobbyServer = class CLobbyServer extends CServerSocker {
    mJoinQue = new Array();
    mRoomMap = new Map();
    mUserMap = new Map();
    mLoopInterval = null;
    mJoining = false;
    constructor() {
        super();
        this.On(CEvent.eType.Message, new CEvent(this.SocketMessage, this));
        this.On(CEvent.eType.Close, new CEvent(this.SocketClose, this));
        setInterval(() => {
            this.Update();
        }, 1000);
    }
    Update() {
    }
    ReadyRoom() {
    }
    SelectRoomLink(_privateKey) {
        return "";
    }
    UpdateJoinQue() {
    }
    SocketClose(ws) {
        let user = this.mUserMap.get(ws);
        if (user != null) {
            user.SendRoom(PacketLB.L2RURoomRemoveUser({ userKey: user.mUserKey }));
            user.mWorker.mUserMap.delete(user.mUserKey);
            this.mUserMap.delete(ws);
            for (let i = 0; i < this.mJoinQue.length; ++i) {
                if (this.mJoinQue[i] == user) {
                    this.mJoinQue.splice(i, 1);
                    break;
                }
            }
        }
    }
    SocketMessage(ws, message) {
    }
    ThreadMessage(room, message) {
    }
    Destroy() {
        super.Destroy();
        clearInterval(this.mLoopInterval);
        this.mLoopInterval = null;
        for (let [key, value] of this.mRoomMap) {
            value.mWorker.terminate();
            value.mWorker.removeAllListeners("message");
            value.mWorker.removeAllListeners("exit");
            value.mWorker.removeAllListeners("error");
        }
    }
};
CLobbyServer = __decorate([
    URLPatterns(["/lobby"])
], CLobbyServer);
export { CLobbyServer };
import CLobbyServer_imple from "../../server_imple/lobby/CLobbyServer.js";
CLobbyServer_imple();

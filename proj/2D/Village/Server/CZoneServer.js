var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Worker } from "worker_threads";
import { CPool } from "../../../../artgine/basic/CPool.js";
import { CSQLite } from "../../../../artgine/network/CSQLite.js";
import { CORMField } from "../../../../artgine/network/CORM.js";
import { CStream } from "../../../../artgine/basic/CStream.js";
import { CTimer } from "../../../../artgine/system/CTimer.js";
import { CConsol } from "../../../../artgine/basic/CConsol.js";
import { URLPatterns } from "../../../../artgine/network/CServerMain.js";
import { CServerSocker } from "../../../../artgine/network/CServerSocket.js";
import { PacketZone } from "./PacketZone.js";
import { CEvent } from "../../../../artgine/basic/CEvent.js";
import { CUpdate } from "../../../../artgine/basic/Basic.js";
CPool.On("CLocalDB", async () => {
    let CLocalDB = new CSQLite();
    await CLocalDB.Init();
    return CLocalDB;
}, "Product");
let sql = await CPool.Product("CLocalDB");
let data = await sql.Select("zone_list", null, null, null);
if (data == null)
    await sql.CreateCollection("zone_list", [new CORMField("_content", ""), new CORMField("_zone", ""), new CORMField("_offset", 0)]);
class CZoneUser {
    constructor(ws, _pk) {
        this.mWebSocket = ws;
        this.mPrivateKey = _pk;
        this.mUniqueKey = ws["id"];
    }
    mUniqueKey = null;
    mPrivateKey = null;
    mZoneWorker = null;
    mWebSocket;
    GetPK() { return this.mPrivateKey; }
    GetUK() { return this.mUniqueKey; }
    GetWS() { return null; }
    Send(_stream) {
        if (typeof _stream == "string")
            this.mWebSocket.send(_stream);
        else
            this.mWebSocket.send(_stream.Data());
    }
}
var gZOffset = 0;
class CZoneWorker {
    static eState = {
        Init: 0,
        Ready: 1,
        Lock: 2,
        Exit: 3,
    };
    constructor(_worker, _offset) {
        this.mWorker = _worker;
        this.mOffset = _offset;
    }
    mWorker;
    mOffset;
    mState = CZoneWorker.eState.Init;
    mUserMap = new Map();
    Send(_stream) {
        this.mWorker.postMessage(_stream.Data());
    }
}
export class CZone {
    mZone = "";
    mOffset = 0;
    mUserMax = 1024;
    mUserSet = new Set();
    mParentPort;
    constructor(_pp) {
        this.mParentPort = _pp;
    }
    UpdateLoop() {
        let timer = new CTimer();
        setInterval(() => {
            let update = new CUpdate();
            update.mFixedTime = update.mDeltaTime = timer.Delay();
            update.mFixedCount = 1;
            this.Update(update);
        }, 1);
    }
    Update(_update) {
        CConsol.Log(this.constructor.name + " / " + _update.DeltaTime());
    }
    ThreadMessage(parentPort, message) {
        let stream = new CStream(message.toString());
        let header = stream.GetString();
        if (header == PacketZone.eHeader.ZoneJoinAck) {
            let ZoneJoinAck = PacketZone.ZoneJoinAck(stream);
            let req;
            if (this.mUserSet.size < this.mUserMax) {
                this.mUserSet.add(ZoneJoinAck.uniqueKey);
                req = PacketZone.ZoneJoinReq(ZoneJoinAck.uniqueKey, CZoneWorker.eState.Ready);
            }
            else {
                req = PacketZone.ZoneJoinReq(ZoneJoinAck.uniqueKey, CZoneWorker.eState.Lock);
            }
            this.Send(req);
        }
        else {
            this.Message(header, stream);
        }
    }
    Message(header, stream) {
    }
    Send(_stream) {
        this.mParentPort.postMessage(_stream.Data());
    }
}
let CWorldServer = class CWorldServer extends CServerSocker {
    mJoinUser = new Array();
    mZoneMap = new Map();
    mUserMap = new Map();
    mLoopInterval = null;
    constructor() {
        super();
        this.On(CEvent.eType.Message, new CEvent(this.SocketMessage, this));
        this.On(CEvent.eType.Close, new CEvent(this.SocketClose, this));
    }
    ReadyZone() {
        let create = true;
        for (let [key, zone] of this.mZoneMap) {
            if (zone.mState == CZoneWorker.eState.Ready || zone.mState == CZoneWorker.eState.Init) {
                create = false;
            }
        }
        if (create) {
            let czName = "zone" + "/" + "CZoneTest";
            let worker = new Worker(new URL("./" + czName + ".js", import.meta.url), {
                workerData: {
                    zone: "CZoneTest",
                    offset: gZOffset,
                }
            });
            let zw = new CZoneWorker(worker, gZOffset);
            this.mZoneMap.set(gZOffset, zw);
            worker.on('message', (msg) => {
                this.ThreadMessage(zw, msg);
            });
            worker.on('exit', (code) => {
                console.log('[main] worker exit code:', code);
            });
            gZOffset++;
        }
    }
    UpdateLoop() {
        this.mLoopInterval = setInterval(() => { this.Update(); }, 10);
    }
    Update() {
        this.ReadyZone();
        if (this.mJoinUser.length == 0)
            return;
        let ju = this.mJoinUser[0];
        for (let [key, zone] of this.mZoneMap) {
            if (zone.mState == CZoneWorker.eState.Ready) {
                let ack = PacketZone.ZoneJoinAck(ju.GetUK(), zone.mOffset);
                zone.Send(ack);
                break;
            }
        }
    }
    SocketClose(ws) {
        let user = this.mUserMap.get(ws);
        if (user != null) {
            user.mZoneWorker.Send(PacketZone.UserClose(user.mUniqueKey));
            user.mZoneWorker.mUserMap.delete(user.mUniqueKey);
            this.mUserMap.delete(ws);
            for (let i = 0; i < this.mJoinUser.length; ++i) {
                if (this.mJoinUser[i] == user) {
                    this.mJoinUser.splice(i, 1);
                    break;
                }
            }
        }
    }
    SocketMessage(ws, message) {
        let stream = new CStream(message.toString());
        let header = stream.GetString();
        if (header == PacketZone.eHeader.WorldConnectAck) {
            if (this.mUserMap.has(ws))
                return;
            let ConnectAck = PacketZone.WorldConnectAck(stream);
            let zu = new CZoneUser(ws, ConnectAck.privateKey);
            this.mJoinUser.push(zu);
            this.mUserMap.set(ws, zu);
        }
        else {
            let zoneUser = this.mUserMap.get(ws);
            zoneUser.mZoneWorker.Send(stream);
        }
    }
    ThreadMessage(zone, message) {
        let stream = new CStream(message.toString());
        let header = stream.GetString();
        if (header == PacketZone.eHeader.ZoneJoinReq) {
            let ZoneJoinReq = PacketZone.ZoneJoinReq(stream);
            if (ZoneJoinReq.uniqueKey != "") {
                for (let [key, value] of this.mUserMap) {
                    if (value.mUniqueKey == ZoneJoinReq.uniqueKey && value.mZoneWorker == null) {
                        value.mZoneWorker = zone;
                        zone.mUserMap.set(value.mUniqueKey, value);
                        this.mJoinUser.splice(0, 1);
                        let req = PacketZone.WorldConnectReq(value.mUniqueKey);
                        value.Send(req);
                        break;
                    }
                }
            }
            zone.mState = ZoneJoinReq.state;
            ZoneJoinReq.uniqueKey;
        }
        else if (header == PacketZone.eHeader.ZoneReady) {
            let ZoneReady = PacketZone.ZoneReady(stream);
            let zone = this.mZoneMap.get(ZoneReady.offset);
            zone.mState = CZoneWorker.eState.Ready;
        }
        else if (header == PacketZone.eHeader.ZoneRelay) {
            let ZoneRelay = PacketZone.ZoneRelay(stream);
            if (ZoneRelay.uniqueKey == "") {
                for (let user of zone.mUserMap.values()) {
                    user.Send(ZoneRelay.data);
                }
            }
            else {
                let user = zone.mUserMap.get(ZoneRelay.uniqueKey);
                user.Send(ZoneRelay.data);
            }
        }
    }
    Destroy() {
        super.Destroy();
        clearInterval(this.mLoopInterval);
        this.mLoopInterval = null;
        for (let [key, value] of this.mZoneMap) {
            value.mWorker.terminate();
            value.mWorker.removeAllListeners("message");
            value.mWorker.removeAllListeners("exit");
            value.mWorker.removeAllListeners("error");
        }
    }
};
CWorldServer = __decorate([
    URLPatterns(["/zone"])
], CWorldServer);
export { CWorldServer };

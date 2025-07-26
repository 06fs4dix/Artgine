import { CConsol } from "../basic/CConsol.js";
import { CEvent } from "../basic/CEvent.js";
import { CStream } from "../basic/CStream.js";
import { CSocketIO } from "../network/CSocketIO.js";
export class CRoomClient extends CSocketIO {
    static eEvent = {
        RootOwnerConnect: "RootOwnerConnect",
        RoomConnect: "RoomConnect",
        RoomDisConnect: "RoomDisConnect",
        RoomClose: "RoomClose",
        Patch: "Patch",
        Error: "Error",
    };
    m_ping = 0;
    m_serverTime = 0;
    m_clientTime = 0;
    m_pingTime = null;
    m_suk = null;
    constructor(_local) {
        let event = new Array();
        super(_local, "room", event);
        if (_local)
            this.m_suk = "local";
        event["Ping"] = new CEvent((_stream) => {
            const T1 = _stream.GetFloat();
            const T2 = _stream.GetFloat();
            const T3 = performance.now();
            this.m_ping = T3 - T1;
            this.m_serverTime = T2 + this.m_ping * 0.5;
            this.m_clientTime = performance.now();
            CConsol.Log(`[Ping] RTT: ${this.m_ping.toFixed(3)}ms, offset: ${this.m_serverTime.toFixed(3)}ms`);
        });
        event["Latency"] = new CEvent((_stream) => {
            const slatency = _stream.GetFloat();
            const header = _stream.GetString();
            let clatency = performance.now() - this.m_clientTime;
            let delay = slatency - (this.m_serverTime + clatency);
            if (delay > 0) {
                setTimeout(() => {
                    this.mEvent[header].Call(_stream);
                }, delay);
            }
            else {
                this.mEvent[header].Call(_stream);
            }
        });
        event[CRoomClient.eEvent.RootOwnerConnect] = new CEvent((_stream) => {
            let data = CPacRoom.GetRoomConnect(_stream);
            this.m_suk = data.suk;
            _stream.ResetOffset();
            _stream.GetString();
            event[CRoomClient.eEvent.RoomConnect].Call(_stream);
        });
    }
    async Connect(_pingTime = null) {
        this.m_pingTime = _pingTime;
        const result = await super.Connect();
        if (result) {
            this.Send(CPacRoom.SetPing());
            if (this.m_pingTime != null) {
                setInterval(() => {
                    this.Send(CPacRoom.SetPing());
                }, this.m_pingTime);
            }
        }
        return result;
    }
    GetServerTime() {
        if (this.m_serverTime == 0)
            return 0;
        let clatency = performance.now() - this.m_clientTime;
        return this.m_serverTime + clatency;
    }
    GetSuk() {
        return this.m_suk;
    }
}
export class CPacRoom {
    static SetSUKSend(_sukList, _data, _stream = new CStream()) {
        _stream.Push("SUKSend");
        _stream.Push(_sukList);
        _stream.Push(_data);
        return _stream;
    }
    static SetBroadcasting(_header, _data, _serverTime = 0, _latency = 0, _stream = new CStream()) {
        if (_latency > 0 && _serverTime != 0) {
            _stream.Push("Latency");
            _stream.Push(_serverTime + _latency);
            _stream.Push(_header);
            _stream.Push(_data);
        }
        else {
            _stream.Push(_header);
            _stream.Push(_data);
        }
        return _stream;
    }
    static SetPing() {
        const out = new CStream();
        out.Push("Ping");
        out.Push(performance.now());
        return out;
    }
    static SetRoomConnect(_nick, _project, _userCount) {
        let stream = new CStream();
        stream.Push("RoomConnect");
        stream.Push(_nick);
        stream.Push(_project);
        stream.Push(_userCount);
        return stream;
    }
    static GetRoomConnect(_stream = new CStream()) {
        return _stream.GetPacket("owner", "suk", "nick", "roomKey");
    }
    static SetRoomDisConnect() {
        let stream = new CStream();
        stream.Push("RoomDisConnect");
        return stream;
    }
    static GetRoomDisConnect(_stream) {
        return _stream.GetPacket("suk");
    }
    static SetRoomClose(_roomKey) {
        let stream = new CStream();
        stream.Push("RoomClose");
        stream.Push(_roomKey);
        return stream;
    }
    static GetRoomClose(_stream) {
        return _stream.GetPacket("roomKey");
    }
}

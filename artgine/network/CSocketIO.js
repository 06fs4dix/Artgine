import { CEvent } from "../basic/CEvent.js";
import { CStream } from "../basic/CStream.js";
import { CWebSocket } from "./CWebSocket.js";
export class CSocketIO extends CWebSocket {
    mEvent;
    constructor(_local, _path, _event = []) {
        let addr = "local";
        if (_local == false)
            addr = null;
        for (let key in _event) {
            if (_event[key] instanceof CEvent == false) {
                _event[key] = CEvent.ToCEvent(_event[key]);
            }
        }
        super(addr, _path, (_msg) => {
            let stream = new CStream(_msg);
            let header = stream.GetString();
            if (this.mEvent[header] != null) {
                this.mEvent[header].Call(stream);
            }
        }, (_msg) => {
            if (this.mEvent["Error"] != null) {
                this.mEvent["Error"].Call(_msg);
            }
        });
        this.mEvent = _event;
    }
    Off(_key, _target = null) {
        throw new Error("Method not implemented.");
    }
    GetEvent(_key, _target = null) {
        return this.mEvent[_key];
    }
    On(_key, _event, _target = null) {
        this.mEvent[_key] = CEvent.ToCEvent(_event);
    }
    Emit(_header, _data, _stream = new CStream()) {
        _stream.Push(_header);
        _stream.Push(_data);
        this.Send(_stream);
    }
}

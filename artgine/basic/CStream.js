import { CJSON } from "./CJSON.js";
export class CStreamValue {
    mData = "";
    mType = '0';
}
;
export class CStream {
    mData;
    mOff;
    constructor(_buffer = "", _off = 0) {
        this.mData = _buffer;
        this.mOff = _off;
    }
    ResetOffset() {
        this.mOff = 0;
    }
    Push(_val) { return this; }
    PushName(_name) {
        if (typeof _name == "string")
            this.mData += "o" + _name;
        else
            this.mData += "o" + _name.constructor.name;
    }
    PushStart() {
        this.mData += "{";
    }
    PushEnd() {
        this.mData += "}";
    }
    PushMember(_val) {
        this.PushStart();
        for (var each0 in _val) {
            if (_val["Serial"] && _val.IsShould(each0) == false)
                continue;
            this.Push(_val[each0]);
        }
        this.PushEnd();
    }
    CutData(_off) {
        this.mData = this.mData.slice(0, _off);
    }
    IsEnd() { return this.mData.length <= this.mOff; }
    Data(_offEnd = false) { return this.mData; }
    SubOffData() { return this.mData.substr(this.mOff, this.mData.length - this.mOff); }
    GetName(_back = false) { return ""; }
    NextValue(_value) { }
    GetStart() {
        if (this.mData.charAt(this.mOff) == '{')
            this.mOff++;
        else {
        }
    }
    GetEnd() {
        var count = 1;
        if (this.mData.charAt(this.mOff) == '}') {
            this.mOff++;
        }
        else {
            for (var i = 0; i < count; ++i) {
                while (true) {
                    if (this.mOff == this.mData.length)
                        break;
                    if (this.mData.charAt(this.mOff) == '{')
                        count++;
                    if (this.mData.charAt(this.mOff) == '}') {
                        this.mOff++;
                        break;
                    }
                    this.mOff++;
                }
            }
        }
    }
    GetType() {
        return this.mData.charAt(this.mOff);
    }
    GetInt32() {
        var value = new CStreamValue();
        this.NextValue(value);
        if (value.mType == '0')
            return 0;
        return Number(value.mData);
    }
    GetFloat() {
        var value = new CStreamValue();
        this.NextValue(value);
        if (value.mType == '0')
            return 0;
        return Number(value.mData);
    }
    GetBool() {
        var value = new CStreamValue();
        this.NextValue(value);
        if (value.mType == 't')
            return true;
        return false;
    }
    GetString() {
        var value = new CStreamValue();
        this.NextValue(value);
        if (value.mType == '0')
            return "";
        return value.mData;
    }
    GetIStream(_stream) {
        _stream.Deserial(this);
        return _stream;
    }
    GetCJSON() {
        var value = new CStreamValue();
        this.NextValue(value);
        if (value.mType == '0')
            return null;
        return new CJSON(value.mData);
    }
    GetAMLen(_type = 'a') {
        this.mOff++;
        var last = this.mData.indexOf(_type, this.mOff);
        var len = this.mData.substring(this.mOff, last);
        this.mOff = last + 1;
        var count = Number(len);
        return count;
    }
    GetArray(_array) {
    }
    GetSet(_set) {
    }
    GetMap(_map) {
    }
    GetMember(_val) { }
    GetPacketParser(_member) {
        let packet = {};
        return packet;
    }
    GetPacket(...args) {
        const keys = Array.isArray(args[0]) ? args[0] : args;
        return this.GetPacketParser(keys);
    }
}
;
import CStream_imple from "../basic_impl/CStream.js";
CStream_imple();

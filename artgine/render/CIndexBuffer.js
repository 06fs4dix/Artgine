export class CIndexBuffer {
    m32;
    mBuf;
    constructor() {
        this.m32 = true;
        this.mBuf = null;
    }
    CreateBuf16(_size) {
        this.m32 = false;
        this.mBuf = new Uint16Array(_size * 3);
        for (var i = 0; i < _size * 3; ++i) {
            this.mBuf[i] = 0;
        }
    }
    CreateBuf32(_size) {
        this.m32 = true;
        this.mBuf = new Uint32Array(_size);
    }
    ChangeBuf(_size) {
        if (this.m32) {
            let dum = new Uint16Array(_size * 3);
            for (var i = 0; i < _size * 3; ++i) {
                dum[i] = this.mBuf[i];
            }
            this.mBuf = dum;
        }
        else {
            let dum = new Uint32Array(_size * 3);
            for (var i = 0; i < _size * 3; ++i) {
                dum[i] = this.mBuf[i];
            }
            this.mBuf = dum;
        }
    }
    GetUInt16() { return this.mBuf; }
    GetUInt32() { return this.mBuf; }
    GetBuf() { return this.mBuf; }
    Delete() { this.mBuf = null; }
}

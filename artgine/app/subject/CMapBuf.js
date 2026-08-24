import { CObject } from "../../basic/CObject.js";
import { CUtil } from "../../basic/CUtil.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CImgPro } from "../../render/CImgPro.js";
import { CTexture } from "../../render/CTexture.js";
export class CMapBuf extends CObject {
    mBuffer = null;
    mSize = 0;
    mCount = new CVec3(1, 1, 1);
    Reset(_count, _size, _default = 0x000000FF) {
        this.mSize = _size;
        this.mCount = _count;
        this.mBuffer = new Uint32Array(this.mCount.x * this.mCount.y * this.mCount.z);
        this.mBuffer.fill(_default);
    }
    RGB(_index, _data = null) {
        const buf = this.GetBuf();
        if (_data != null) {
            const rgb = (_data & 0xFFFFFF00) >>> 0;
            if (typeof _index == "number") {
                buf[_index] = (rgb | (buf[_index] & 0xFF)) >>> 0;
            }
            else {
                if (this.IndexOut(_index))
                    return;
                const offset = _index.Offset(this.mCount);
                buf[offset] = (rgb | (buf[offset] & 0xFF)) >>> 0;
            }
            return;
        }
        if (typeof _index == "number")
            return (buf[_index] & 0xFFFFFF00) >>> 0;
        if (this.IndexOut(_index))
            return null;
        return (buf[_index.Offset(this.mCount)] & 0xFFFFFF00) >>> 0;
    }
    IndexOut(_index) {
        if (_index.x < 0 || _index.x >= this.mCount.x || _index.y < 0 || _index.y >= this.mCount.y || _index.z < 0 || _index.z >= this.mCount.z)
            return true;
        return false;
    }
    SetTexture(_tex) {
        let buf = _tex.GetBuf()[0];
        let width = _tex.GetWidth();
        let height = _tex.GetHeight();
        const isTarget3D = this.mCount.z > 1;
        const targetW = this.mCount.x;
        const targetH = isTarget3D ? this.mCount.y * this.mCount.z : this.mCount.y;
        if (width != targetW || height != targetH) {
            const resized = CImgPro.SqurEnlargedReduced(width, height, buf, targetW / width, targetH / height, 4);
            buf = resized.GetBuf()[0];
            width = targetW;
            height = targetH;
        }
        const mbuf = this.GetBuf();
        if (!isTarget3D) {
            for (let y = 0; y < this.mCount.y; ++y) {
                for (let x = 0; x < this.mCount.x; ++x) {
                    const srcY = (this.mCount.y - 1 - y);
                    const pi = (srcY * width + x) * 4;
                    const rgb = ((buf[pi] << 24) | (buf[pi + 1] << 16) | (buf[pi + 2] << 8)) >>> 0;
                    const bi = x + y * this.mCount.x;
                    this.mBuffer[bi] = (rgb | (this.mBuffer[bi] & 0xFF)) >>> 0;
                }
            }
        }
        else {
            for (let z = 0; z < this.mCount.z; ++z) {
                for (let y = 0; y < this.mCount.y; ++y) {
                    for (let x = 0; x < this.mCount.x; ++x) {
                        const pi = ((y * this.mCount.z + z) * width + x) * 4;
                        const rgb = ((buf[pi] << 24) | (buf[pi + 1] << 16) | (buf[pi + 2] << 8)) >>> 0;
                        const bi = x + y * this.mCount.x + z * this.mCount.x * this.mCount.y;
                        mbuf[bi] = (rgb | (mbuf[bi] & 0xFF)) >>> 0;
                    }
                }
            }
        }
    }
    ExportCJSON() {
        const buf = this.GetBuf();
        const packed = CUtil.ArrayToLZ4Base64(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
        const keep = this.mBuffer;
        this.mBuffer = null;
        let cjson;
        try {
            cjson = super.ExportCJSON();
        }
        finally {
            this.mBuffer = keep;
        }
        cjson.Set("mBuffer", packed);
        return cjson;
    }
    ImportCJSON(_json) {
        const arrStr = _json.GetStr("mBuffer");
        _json.Set("mBuffer", null);
        super.ImportCJSON(_json);
        this.mBuffer = arrStr;
        return this;
    }
    GetBuf() {
        if (typeof this.mBuffer === "string") {
            const encoded = this.mBuffer;
            const byteLen = this.mCount.x * this.mCount.y * this.mCount.z * 4;
            try {
                this.mBuffer = new Uint32Array(CUtil.LZ4Base64ToArray(encoded, byteLen));
            }
            catch {
                this.mBuffer = new Uint32Array(CUtil.LZBase64ToArray(encoded));
            }
        }
        return this.mBuffer;
    }
    GetTexture() {
        const tex = new CTexture();
        tex.SetMipMap(CTexture.eMipmap.GL);
        const mbuf = this.GetBuf();
        if (this.mCount.z <= 1) {
            tex.SetSize(this.mCount.x, this.mCount.y);
            tex.CreateBuf();
            const texBuf = tex.GetBuf()[0];
            for (let y = 0; y < this.mCount.y; ++y) {
                for (let x = 0; x < this.mCount.x; ++x) {
                    const bi = x + y * this.mCount.x;
                    const val = mbuf[bi];
                    const dstY = (this.mCount.y - 1 - y);
                    const pi = (dstY * this.mCount.x + x) * 4;
                    texBuf[pi] = (val >>> 24) & 0xFF;
                    texBuf[pi + 1] = (val >>> 16) & 0xFF;
                    texBuf[pi + 2] = (val >>> 8) & 0xFF;
                    texBuf[pi + 3] = (val) & 0xFF;
                }
            }
        }
        else {
            tex.SetSize(this.mCount.x, this.mCount.y * this.mCount.z);
            tex.CreateBuf();
            const texBuf = tex.GetBuf()[0];
            for (let z = 0; z < this.mCount.z; ++z) {
                for (let y = 0; y < this.mCount.y; ++y) {
                    for (let x = 0; x < this.mCount.x; ++x) {
                        const bi = x + y * this.mCount.x + z * this.mCount.x * this.mCount.y;
                        const val = mbuf[bi];
                        const pi = ((y * this.mCount.z + z) * this.mCount.x + x) * 4;
                        texBuf[pi] = (val >>> 24) & 0xFF;
                        texBuf[pi + 1] = (val >>> 16) & 0xFF;
                        texBuf[pi + 2] = (val >>> 8) & 0xFF;
                        texBuf[pi + 3] = (val) & 0xFF;
                    }
                }
            }
        }
        return tex;
    }
}

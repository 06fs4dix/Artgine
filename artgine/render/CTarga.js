export class CExporter {
    buffer = null;
    GetResult() {
        return this.buffer;
    }
}
export class CTarga extends CExporter {
    imageIDLength = 0;
    colorMapType = 0;
    imageTypeCode = 0;
    colorMapOrigin = 0;
    colorMapLength = 0;
    colorMapEntrySize = 0;
    imageXOrigin = 0;
    imageYOrigin = 0;
    imageWidth = 0;
    imageHeight = 0;
    bitCount = 32;
    imageDescriptor = 0;
    imageBuffer;
    yFlipped;
    constructor(_imgBuf, _width, _height, _yFlipped = false) {
        super();
        this.imageBuffer = _imgBuf;
        this.imageWidth = _width;
        this.imageHeight = _height;
        this.yFlipped = _yFlipped;
    }
    GetResult() {
        const src = new Uint8Array(this.imageBuffer);
        const buf8 = new Uint8Array(18 + src.byteLength);
        const view = new DataView(buf8.buffer);
        buf8[2] = 2;
        view.setUint16(12, this.imageWidth, true);
        view.setUint16(14, this.imageHeight, true);
        buf8[16] = this.bitCount;
        buf8[17] = 0x00;
        this.buffer = buf8.buffer;
        for (let y = 0; y < this.imageHeight; ++y) {
            const srcY = this.yFlipped ? y : this.imageHeight - 1 - y;
            for (let x = 0; x < this.imageWidth; ++x) {
                const si = (x + srcY * this.imageWidth) * 4;
                const di = 18 + (x + y * this.imageWidth) * 4;
                buf8[di + 0] = src[si + 2];
                buf8[di + 1] = src[si + 1];
                buf8[di + 2] = src[si + 0];
                buf8[di + 3] = src[si + 3];
            }
        }
        return this.buffer;
    }
}
;

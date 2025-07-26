import { CParser } from "./CParser.js";
import { CExporter } from "./CExporter.js";
export class CTARGA extends CExporter {
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
    constructor(_imgBuf) {
        super();
        this.imageBuffer = _imgBuf;
    }
    GetResult() {
        let buf8 = new Uint8Array(18 + this.imageBuffer.byteLength);
        let buf16 = new Uint16Array(buf8.buffer);
        buf16[6] = this.imageWidth;
        buf16[7] = this.imageHeight;
        buf8[16] = this.bitCount;
        this.buffer = buf8;
        for (let y = 0; y < this.imageHeight; ++y) {
            for (let x = 0; x < this.imageWidth; ++x) {
                buf8[18 + x * 4 + (this.imageHeight - y - 1) * this.imageWidth * 4 + 0] = this.imageBuffer[x * 4 + y * this.imageWidth * 4 + 2];
                buf8[18 + x * 4 + (this.imageHeight - y - 1) * this.imageWidth * 4 + 1] = this.imageBuffer[x * 4 + y * this.imageWidth * 4 + 1];
                buf8[18 + x * 4 + (this.imageHeight - y - 1) * this.imageWidth * 4 + 2] = this.imageBuffer[x * 4 + y * this.imageWidth * 4 + 0];
                buf8[18 + x * 4 + (this.imageHeight - y - 1) * this.imageWidth * 4 + 3] = this.imageBuffer[x * 4 + y * this.imageWidth * 4 + 3];
            }
        }
        return this.buffer;
    }
}
;
export class CParserTGA extends CParser {
    mTemp = new Uint8Array(4);
    mAlphaCut = 0;
    constructor() {
        super();
    }
    ReadBuf(info, _buf, x, y, _comp) {
    }
    async Load(pa_fileName) { }
    GetResult() {
        return this.mResult;
    }
}
import CParserTGA_imple from "../../util_imple/parser/CParserTGA.js";
CParserTGA_imple();

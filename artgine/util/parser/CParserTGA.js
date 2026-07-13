import { CParser } from "./CParser.js";
export class CParserTGA extends CParser {
    mTemp = new Uint8Array(4);
    mAlphaCut = 0;
    mAlphaBleed = true;
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

import { CObject } from "../basic/CObject.js";
import { CIndexBuffer } from "./CIndexBuffer.js";
export class CMeshDrawNode extends CObject {
    vGBuf;
    vGBufEx;
    iInfo;
    iBuf;
    iNum;
    vNum;
    constructor() {
        super();
        this.vGBuf = null;
        this.vGBufEx = null;
        this.iInfo = new CIndexBuffer();
        this.iBuf = null;
        this.iNum = 0;
        this.vNum = 0;
    }
    toCopy() {
        return this;
    }
}

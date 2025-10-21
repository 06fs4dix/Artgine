import { CMat } from "../geometry/CMat.js";
import { CShaderAttr } from "./CShaderAttr.js";
import { CUpdate } from "../basic/Basic.js";
export class CMeshPaint {
    md;
    mdp;
    mpi;
    mdraw;
    sum;
    sumSA;
    update = CUpdate.eType.Not;
    constructor(_md, _mpi, _mdraw = null) {
        this.md = _md;
        this.mpi = _mpi;
        this.mdraw = _mdraw;
        this.sum = new CMat();
        this.sumSA = new CShaderAttr("worldMat", this.sum);
    }
}

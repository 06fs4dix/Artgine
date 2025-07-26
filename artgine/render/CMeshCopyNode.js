import { CVec3 } from "../geometry/CVec3.js";
import { CMath } from "../geometry/CMath.js";
import { CMat } from "../geometry/CMat.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CUpdate } from "../basic/Basic.js";
import { CPoolGeo } from "../geometry/CPoolGeo.js";
export class CMeshCopyNode {
    bpos;
    brot;
    bsca;
    pos;
    rot;
    sca;
    pst;
    updateMat = CUpdate.eType.Not;
    FMatAtt;
    textureOff;
    materialOff;
    constructor() {
        this.bpos = null;
        this.brot = null;
        this.bsca = null;
        this.pos = new CVec3();
        this.rot = new CVec4();
        this.sca = new CVec3();
        this.pst = new CMat();
        this.textureOff = new Array();
        this.materialOff = new Array();
        this.FMatAtt = false;
    }
    PRSReset() {
        var sm = CPoolGeo.ProductMat();
        var rm = CPoolGeo.ProductMat();
        CMath.MatScale(this.sca, sm);
        CMath.QutToMat(this.rot, rm);
        CMath.MatMul(sm, rm, this.pst);
        CPoolGeo.RecycleMat(sm);
        CPoolGeo.RecycleMat(rm);
        this.pst.mF32A[12] = this.pos.x;
        this.pst.mF32A[13] = this.pos.y;
        this.pst.mF32A[14] = this.pos.z;
        this.pst.UnitCheck();
        this.updateMat = CUpdate.eType.Updated;
    }
}

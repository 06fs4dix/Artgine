import { CUpdate } from "../../basic/Basic.js";
import { CHash } from "../../basic/CHash.js";
import { CBound } from "../../geometry/CBound.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CComponent } from "./CComponent.js";
import { CPaint2D } from "./paint/CPaint2D.js";
export class CNavigation extends CComponent {
    static Small = 20;
    static Normal = 100;
    mPos = new CVec3();
    mKey;
    mStatic = false;
    mBound = new CBound;
    mUpdateBound = CUpdate.eType.Updated;
    m_colList = new Set();
    mPaintLoad = null;
    constructor(_paint = null) {
        super();
        this.InitBound(_paint);
    }
    GetNaviHash() {
        let hash = CHash.HashCode(this.Key());
        if (hash < 0)
            hash = -hash;
        if (this.mStatic)
            hash = -hash;
        return hash;
    }
    InitBound(_paint) {
        if (_paint == null) { }
        else if (_paint instanceof CBound) {
            this.mBound.Import(_paint);
        }
        else {
            if (_paint.GetBound().GetType() == CBound.eType.Null) {
                this.mPaintLoad = _paint;
                return;
            }
            let bound = _paint.GetBound().Export();
            this.mBound.Reset();
            this.mBound.InitBound(CMath.V3MulMatCoordi(bound.mMin, _paint.GetLMat()));
            this.mBound.InitBound(CMath.V3MulMatCoordi(bound.mMax, _paint.GetLMat()));
            this.mBound.SetType(bound.GetType());
        }
        if (_paint instanceof CPaint2D) {
            this.mBound.mMax.z = this.mBound.GetInRadius();
            this.mBound.mMin.z = -this.mBound.mMax.z;
        }
        this.UpdateMat();
    }
    GetBound() {
        return this.mBound;
    }
    GeometryUpdate(_ggi) {
        this.UpdateMat();
        if (_ggi.mNavi != null) {
            _ggi.mNavi.Write(this, false);
        }
    }
    UpdateMat() {
        if (this.GetOwner() == null)
            return;
        if (this.GetOwner().mUpdateMat != 0) {
            this.mPos = this.GetOwner().GetPos();
        }
    }
    StartChk() {
        if (this.mPaintLoad != null) {
            if (this.mPaintLoad instanceof CPaint2D ? this.mPaintLoad.GetSize() != null : this.mPaintLoad.GetBound().GetType() != CBound.eType.Null) {
                this.InitBound(this.mPaintLoad);
                this.mPaintLoad = null;
                this.UpdateMat();
            }
            else
                return;
        }
        this.mStartChk = false;
        this.Start();
    }
}

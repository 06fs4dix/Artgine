import CEnvMap from "../component/CEnvMap.js";
import { CPaint3D } from "../component/paint/CPaint3D.js";
import { CSubject } from "./CSubject.js";
import { CPaint } from "../component/paint/CPaint.js";
import { CColor } from "../../render/CColor.js";
export class CProbe extends CSubject {
    mEnvMap;
    mDebugPaint = null;
    mDebugWant = false;
    constructor(_tag) {
        super();
        this.mEnvMap = this.PushComp(new CEnvMap(_tag));
    }
    GetEnvMap() { return this.mEnvMap; }
    SetDebug(_debug) {
        this.mDebugWant = _debug;
        if (!_debug && this.mDebugPaint != null) {
            this.mDebugPaint.Destroy();
            this.mDebugPaint = null;
        }
    }
    Update(_update) {
        super.Update(_update);
        if (this.mDebugWant) {
            if (this.mDebugPaint == null) {
                const pal = this.GetFrame().Pal();
                this.mDebugPaint = this.PushComp(new CPaint3D(pal.GetSphereMesh()));
                this.mDebugPaint.SetCullMask(CPaint.eCullMask.Nothing);
                this.mDebugPaint.SetColorModel(new CColor(1, 1, 1, CColor.eModel.RGBAdd));
                this.mDebugPaint.PushTag(CPaint.eTag.Light);
                this.mDebugPaint.PushTag("env");
                this.mDebugPaint.SetMaterial(0, 1);
            }
        }
    }
}

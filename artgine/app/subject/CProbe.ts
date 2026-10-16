import { CUpdate } from "../../basic/Basic.js";
import CEnvMap from "../component/CEnvMap.js";
import { CPaint3D } from "../component/paint/CPaint3D.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CShaderAttr } from "../../render/CShaderAttr.js";
import { CSubject } from "./CSubject.js";
import { CPaint } from "../component/paint/CPaint.js";
import { CColor } from "../../render/CColor.js";

export class CProbe extends CSubject
{
    mEnvMap : CEnvMap;
    protected mDebugPaint : CPaint3D = null;
    protected mDebugWant : boolean = false;

    constructor() {
        super();
        this.mEnvMap = this.PushComp(new CEnvMap());
    }

    GetEnvMap() : CEnvMap { return this.mEnvMap; }

    //디버그 모드 on/off. 실제 생성은 Update()에서 프레임 확실히 있을 때 한다
    SetDebug(_debug : boolean) {
        this.mDebugWant = _debug;

        if(!_debug && this.mDebugPaint != null) {
            this.mDebugPaint.Destroy();
            this.mDebugPaint = null;
        }
    }

    override Update(_update : CUpdate) {
        super.Update(_update);

        if(this.mDebugWant) {
            if(this.mDebugPaint == null) {
                const pal = this.GetFrame().Pal();
                this.mDebugPaint = this.PushComp(new CPaint3D(pal.GetSphereMesh()));
                this.mDebugPaint.SetCullMask(CPaint.eCullMask.Nothing);
                this.mDebugPaint.SetColorModel(new CColor(1, 1, 1, CColor.eModel.RGBAdd));
                this.mDebugPaint.PushTag(CPaint.eTag.Light);
                this.mDebugPaint.Env();
                this.mDebugPaint.PushTag("envMap_NotReflected");
                this.mDebugPaint.SetMaterial(0, 1);
            }
        }
    }
}

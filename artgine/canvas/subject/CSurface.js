import { CUniqueID } from "../../basic/CUniqueID.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CTexture } from "../../render/CTexture.js";
import { CPaintSurface } from "../component/paint/CPaintSurface.js";
import { CSubject } from "./CSubject.js";
var gSurfaceOff = 0;
export class CSurface extends CSubject {
    mRenderPass = new CRenderPass();
    mPaint = null;
    mTexInfo = null;
    mTexSize = null;
    mTexKey = null;
    mTexLinear = null;
    mRTUse = true;
    mTexCreate = true;
    constructor() {
        super();
        gSurfaceOff++;
        this.mPaint = new CPaintSurface(null);
        this.PushComp(this.mPaint);
        this.mRenderPass.mPriority = CRenderPass.ePriority.Surface + gSurfaceOff;
        this.mTexKey = CUniqueID.GetHash() + ".tex";
        this.mRenderPass.mRenderTarget = this.mTexKey;
    }
    IsShould(_member, _type) {
        if (_member == "mTexKey" || _member == "mTexSize" || _member == "mTexInfo" || _member == "mTexLinear" ||
            _member == "mRenderPass" || _member == "mRTUse")
            return true;
        return false;
    }
    SetFrame(_fw) {
        super.SetFrame(_fw);
        if (_fw != null) {
            if (this.mRenderPass.mShader == "")
                this.mRenderPass.mShader = _fw.Pal().Sl2D().GetShader("Pre2Blit").Key();
            if (this.mTexCreate) {
                this.mTexCreate = false;
                this.mRenderPass.mRenderTarget = this.GetFrame().Ren().BuildRenderTarget(this.mTexInfo, this.mTexSize, this.mTexKey);
                if (this.mTexLinear) {
                    let tex = this.GetFrame().Res().Find(this.GetTexKey());
                    tex.SetFilter(CTexture.eFilter.Linear);
                }
            }
            this.mPaint.SetRenderPass(this.mRenderPass, false);
        }
        if (this.mRTUse)
            this.mRenderPass.mRenderTarget = this.mTexKey;
        else
            this.mRenderPass.mRenderTarget = "";
    }
    static NewPriority() { gSurfaceOff++; return CRenderPass.ePriority.Surface + gSurfaceOff; }
    SetUseRT(_enable) {
        this.mRTUse = _enable;
        if (_enable)
            this.mRenderPass.mRenderTarget = this.mTexKey;
        else
            this.mRenderPass.mRenderTarget = "";
    }
    GetPaint() { return this.mPaint; }
    GetRP() { return this.mRenderPass; }
    GetTexKey() { return this.mTexKey; }
    Export(_copy, _resetKey) {
        const watch = super.Export(_copy, _resetKey);
        watch.mPaint = watch.FindComps(CPaintSurface)[0];
        return watch;
    }
    ImportCJSON(_json) {
        const watch = super.ImportCJSON(_json);
        watch.mPaint = watch.FindComps(CPaintSurface)[0];
        return watch;
    }
    EditChange(_pointer, _childe) {
        super.EditChange(_pointer, _childe);
        if (_pointer.member == "mTexKey") {
            this.mRenderPass.mRenderTarget = this.mTexKey;
            this.mRenderPass.Reset();
        }
    }
}
;

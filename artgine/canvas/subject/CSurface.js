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
    mTexLinear = null;
    mRTUse = true;
    mTexCreate = true;
    constructor() {
        super();
        gSurfaceOff++;
        this.mPaint = new CPaintSurface(null);
        this.PushComp(this.mPaint);
        this.mRenderPass.mPriority = CRenderPass.ePriority.Surface + gSurfaceOff;
        this.mRenderPass.mRenderTarget = CUniqueID.GetHash() + ".tex";
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
            if (this.mTexCreate && this.mRenderPass.mRenderTarget != "") {
                this.mTexCreate = false;
                if (this.GetFrame().Res().Find(this.mRenderPass.mRenderTarget) == null) {
                    this.mRenderPass.mRenderTarget = this.GetFrame().Ren().
                        BuildRenderTarget(this.mTexInfo, this.mTexSize, this.mRenderPass.mRenderTarget);
                    if (this.mTexLinear) {
                        let tex = this.GetFrame().Res().Find(this.GetTexKey());
                        tex.SetFilter(CTexture.eFilter.Linear);
                    }
                }
            }
            this.mPaint.PushRenderPass(this.mRenderPass, false);
        }
        if (this.mRTUse == false)
            this.mRenderPass.mRenderTarget = "";
    }
    static NewPriority() { gSurfaceOff++; return CRenderPass.ePriority.Surface + gSurfaceOff; }
    SetUseRT(_enable) {
        this.mRTUse = _enable;
        if (_enable) {
            this.mTexCreate = false;
            this.mRenderPass.mRenderTarget = CUniqueID.GetHash() + ".tex";
        }
        else
            this.mRenderPass.mRenderTarget = "";
    }
    GetPaint() { return this.mPaint; }
    GetRP() { return this.mRenderPass; }
    NewRT(_texInfo = null, _texSize = null, _texLinear = false) {
        if (this.GetFrame() == null) {
            this.mTexInfo = _texInfo;
            this.mTexSize = _texSize;
            this.mTexCreate = true;
            this.mTexLinear = _texLinear;
        }
        else {
            this.GetFrame().Ren().BuildRenderTarget(this.mTexInfo, this.mTexSize, this.mRenderPass.mRenderTarget);
            let tex = this.GetFrame().Res().Find(this.GetTexKey());
            tex.SetFilter(CTexture.eFilter.Linear);
            this.mRenderPass.Reset();
        }
    }
    GetTexKey() { return this.mRenderPass.mRenderTarget; }
    Export(_copy, _resetKey) {
        const watch = super.Export(_copy, _resetKey);
        watch.mPaint = watch.FindComps(CPaintSurface)[0];
        for (let i = 0; i < this.mChild.length; ++i) {
            if (this.mChild[i] instanceof CSurface) {
                watch.mChild[i].mRenderPass.Import(this.mChild[i].mRenderPass);
            }
        }
        return watch;
    }
    ImportCJSON(_json) {
        const watch = super.ImportCJSON(_json);
        watch.mPaint = watch.FindComps(CPaintSurface)[0];
        return watch;
    }
}
;

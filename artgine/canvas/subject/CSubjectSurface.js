import { CUniqueID } from "../../basic/CUniqueID.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CTexture } from "../../render/CTexture.js";
import { CPaintSurface } from "../component/paint/CPaint2D.js";
import { CSubject } from "./CSubject.js";
var g_surfaceOff = 0;
export class CSubjectSurface extends CSubject {
    mRenderPass = new CRenderPass();
    mPaint = null;
    mTexInfo = null;
    mTexSize = null;
    mTexKey = null;
    mTexLinear = null;
    mTexCreate = false;
    constructor() {
        super();
        g_surfaceOff++;
        this.mPaint = new CPaintSurface(null);
        this.PushComp(this.mPaint);
        this.mRenderPass.mPriority = CRenderPass.ePriority.Surface + g_surfaceOff;
        this.mTexKey = CUniqueID.GetHash() + ".tex";
    }
    SurfaceHide(_member) {
        return true;
    }
    SetFrame(_fw) {
        super.SetFrame(_fw);
        if (_fw != null) {
            if (this.mRenderPass.mShader == "")
                this.mRenderPass.mShader = _fw.Pal().Sl2D().GetShader("Pre2Blit").mKey;
            if (this.mTexCreate) {
                this.mTexCreate = false;
                this.mRenderPass.mRenderTarget = this.mFrame.Ren().BuildRenderTarget(this.mTexInfo, this.mTexSize, this.mTexKey);
                if (this.mTexLinear) {
                    let tex = this.mFrame.Res().Find(this.RTKey());
                    tex.SetFilter(CTexture.eFilter.Linear);
                }
            }
            this.mPaint.SetRenderPass(this.mRenderPass, false);
        }
    }
    static NewPriority() { g_surfaceOff++; return CRenderPass.ePriority.Surface + g_surfaceOff; }
    Paint() { return this.mPaint; }
    RP() { return this.mRenderPass; }
    NewRT(_texInfo = null, _texSize = null, _texLinear = false) {
        this.mRenderPass.mRenderTarget = this.mTexKey;
        if (this.mFrame == null) {
            this.mTexInfo = _texInfo;
            this.mTexSize = _texSize;
            this.mTexCreate = true;
            this.mTexLinear = _texLinear;
        }
        else {
            this.mFrame.Ren().BuildRenderTarget(this.mTexInfo, this.mTexSize, this.mTexKey);
            if (this.mTexLinear) {
                let tex = this.mFrame.Res().Find(this.RTKey());
                tex.SetFilter(CTexture.eFilter.Linear);
            }
            this.mRenderPass.Reset();
        }
    }
    RTKey() { return this.mTexKey; }
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
}
;

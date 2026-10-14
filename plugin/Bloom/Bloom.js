import { CSurface } from "../../artgine/app/subject/CSurface.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CTexture, CTextureInfo } from "../../artgine/render/CTexture.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CRPAuto, CRPMgr } from "../../artgine/app/canvas/CRPMgr.js";
import { CCondition } from "../../artgine/util/CCondition.js";
import { CVec1 } from "../../artgine/geometry/CVec1.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { SDF } from "../../artgine/z_file/SDF.js";
export class CSurfaceDownSample extends CSurface {
    m_srcSize;
    m_mipLevel;
    m_threshold;
    m_softThreshold;
    constructor() {
        super();
        this.GetRP().mShader = "Artgine/Shader/PostDownSample";
        this.GetRP().mClearColor = false;
        this.GetRP().mDepthWrite = false;
        this.GetRP().mDepthTest = false;
    }
    SetFrame(_fw) {
        super.SetFrame(_fw);
        if (_fw != null) {
            if (this.mRenderPass.mShader == "Artgine/Shader/PostDownSample") {
                this.mRenderPass.mShader = _fw.Pal().SlPost().Key();
                this.mRenderPass.mTag.clear();
                this.mRenderPass.mTag.add("sample");
                this.mRenderPass.mTag.add("down");
            }
            this.SetShaderAttr();
        }
    }
    ResetTexture(_srcSize, _mipLevel, _threshold, _softThreshold) {
        const texSize = new CVec2(_srcSize.x * 0.5, _srcSize.y * 0.5);
        this.NewRT([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA32F)], texSize, true);
        this.m_srcSize = _srcSize;
        this.m_mipLevel = _mipLevel;
        this.m_threshold = _threshold;
        this.m_softThreshold = _softThreshold;
        this.SetShaderAttr();
    }
    SetShaderAttr() {
        if (this.GetRP().FindSA("mipLevel") != null) {
            this.GetRP().DeleteSA("mipLevel");
            this.GetRP().DeleteSA("threshold");
            this.GetRP().DeleteSA("softThreshold");
        }
        this.GetRP().mShaderAttr.push(new CShaderAttr("mipLevel", this.m_mipLevel));
        this.GetRP().mShaderAttr.push(new CShaderAttr("threshold", this.m_threshold));
        this.GetRP().mShaderAttr.push(new CShaderAttr("softThreshold", this.m_softThreshold));
    }
}
export class CSurfaceUpSample extends CSurface {
    m_blendFactor;
    constructor() {
        super();
        this.GetRP().mShader = "Artgine/Shader/PostUpSample";
        this.GetRP().mDepthWrite = false;
        this.GetRP().mDepthTest = false;
        this.GetRP().mClearColor = false;
    }
    SetFrame(_fw) {
        super.SetFrame(_fw);
        if (_fw != null) {
            if (this.mRenderPass.mShader == "Artgine/Shader/PostUpSample") {
                this.mRenderPass.mShader = _fw.Pal().SlPost().Key();
                this.mRenderPass.mTag.clear();
                this.mRenderPass.mTag.add("sample");
                this.mRenderPass.mTag.add("up");
            }
            this.SetShaderAttr();
        }
    }
    ResetTexture(_rt, _blendFactor) {
        this.GetRP().mRenderTarget = _rt;
        this.m_blendFactor = _blendFactor;
        this.SetShaderAttr();
    }
    SetShaderAttr() {
        if (this.GetRP().FindSA("blendFactor") != null) {
            this.GetRP().DeleteSA("blendFactor");
        }
        this.GetRP().mShaderAttr.push(new CShaderAttr("blendFactor", this.m_blendFactor));
        this.GetRP().mBlend = [CRenderPass.eBlend.FUNC_ADD, CRenderPass.eBlend.FUNC_ADD, CRenderPass.eBlend.ONE, CRenderPass.eBlend.ONE, CRenderPass.eBlend.ONE, CRenderPass.eBlend.ONE];
    }
}
export class CSurfaceBloom extends CSurface {
    static ePreFilterType = {
        EnergyConserving: 0,
        Additive: 1
    };
    m_preFilterType = CSurfaceBloom.ePreFilterType.EnergyConserving;
    m_threshold = 0.0;
    m_softThreshold = 0.0;
    m_intensity = 0.15;
    m_lowFrequencyBoostCurvation = 0.95;
    m_lowFrequencyBoost = 0.7;
    m_highPassFrequency = 1.0;
    m_mipMax = 6;
    constructor() {
        super();
        this.Natural();
        this.Init();
        this.mSave = false;
    }
    IsShould(_member, _type) {
        let view = [
            "m_threshold", "m_softThreshold", "m_preFilterType", "m_intensity",
            "m_lowFrequencyBoostCurvation", "m_lowFrequencyBoost", "m_highPassFrequency",
        ];
        if (view.includes(_member)) {
            return true;
        }
        return super.IsShould(_member, _type);
    }
    Init() {
        const screenSize = new CVec2(1, 1);
        const mipSize = [screenSize];
        const mipTex = [];
        this.GetRP().mClearColor = false;
        this.GetRP().mDepthWrite = false;
        this.GetRP().mDepthTest = false;
        this.mTexKey = "Bloom/Main.tex";
        this.NewRT([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA32F)], mipSize[0], true);
        mipTex.push(this.mRenderPass.mRenderTarget);
        for (let i = 0; i < this.m_mipMax; i++) {
            mipSize.push(new CVec2(mipSize[i].x * 0.5, mipSize[i].y * 0.5));
            const downSampleSurf = this.PushChild(new CSurfaceDownSample());
            downSampleSurf.mTexKey = "Bloom/" + "DownSample" + i + ".tex";
            downSampleSurf.SetKey("DownSample" + i);
            downSampleSurf.ResetTexture(mipSize[i], i, this.m_threshold, this.m_softThreshold);
            downSampleSurf.GetRP().mRenderTarget = downSampleSurf.GetTexKey();
            downSampleSurf.GetRP().mShaderAttr.push(new CShaderAttr(0, mipTex[i]));
            mipTex.push(downSampleSurf.GetTexKey());
        }
        for (let i = this.m_mipMax; i > 1; i--) {
            const upSampleSurf = this.PushChild(new CSurfaceUpSample());
            upSampleSurf.SetKey("UpSample" + (this.m_mipMax - i));
            upSampleSurf.mTexKey = "Bloom/" + "UpSample" + i + ".tex";
            upSampleSurf.ResetTexture(mipTex[i - 1], this.GetBlendFactor(i, this.m_mipMax));
            upSampleSurf.GetRP().mShaderAttr.push(new CShaderAttr(0, mipTex[i]));
        }
        const upSampleSurf = this.PushChild(new CSurfaceUpSample());
        upSampleSurf.SetKey("UpSample" + (this.m_mipMax - 1));
        upSampleSurf.mTexKey = "Bloom/" + "UpSample1.tex";
        upSampleSurf.ResetTexture(mipTex[0], this.GetBlendFactor(1, this.m_mipMax));
        upSampleSurf.mTexCreate = false;
        upSampleSurf.GetRP().mShaderAttr.push(new CShaderAttr(0, mipTex[1]));
    }
    GetTexKey() {
        return this.mChild[this.mChild.length - 1].GetTexKey();
    }
    GetDownSample(_index) {
        return this.FindChild("DownSample" + _index);
    }
    GetUpSample(_index) {
        const texIndex = this.m_mipMax - _index;
        return this.FindChild("UpSample" + _index);
    }
    GetBlendFactor(_mip, _maxMip) {
        const clamp = (_val, _min, _max) => {
            return Math.min(Math.max(_val, _min), _max);
        };
        const mipRatio = _mip / _maxMip;
        let lf_boost = (1.0
            - Math.pow(1.0 - mipRatio, 1.0 / (1.0 - this.m_lowFrequencyBoostCurvation))) * this.m_lowFrequencyBoost;
        let hp_lq = 1.0
            - clamp((mipRatio - this.m_highPassFrequency) / this.m_highPassFrequency, 0.0, 1.0);
        lf_boost *= this.m_preFilterType == CSurfaceBloom.ePreFilterType.EnergyConserving ? 1.0 - this.m_intensity : 1.0;
        const distanceBoost = Math.pow(mipRatio, 0.5);
        return (this.m_intensity + lf_boost * distanceBoost) * hp_lq;
    }
    Natural() {
        this.m_intensity = 0.15;
        this.m_threshold = 0.0;
        this.m_softThreshold = 0.0;
        this.m_lowFrequencyBoost = 0.7;
        this.m_lowFrequencyBoostCurvation = 0.95;
        this.m_highPassFrequency = 1.0;
        this.EnergyConserving();
    }
    OldSchool() {
        this.m_intensity = 0.05;
        this.m_threshold = 0.6;
        this.m_softThreshold = 0.2;
        this.m_lowFrequencyBoost = 0.7;
        this.m_lowFrequencyBoostCurvation = 0.95;
        this.m_highPassFrequency = 1.0;
        this.Additive();
    }
    ScreenBlur() {
        this.m_intensity = 1.0;
        this.m_threshold = 0.0;
        this.m_softThreshold = 0.0;
        this.m_lowFrequencyBoost = 0.0;
        this.m_lowFrequencyBoostCurvation = 0.0;
        this.m_highPassFrequency = 1.0 / 3.0;
        this.EnergyConserving();
    }
    EnergyConserving() {
        this.m_preFilterType = CSurfaceBloom.ePreFilterType.EnergyConserving;
        this.Refresh();
    }
    Additive() {
        this.m_preFilterType = CSurfaceBloom.ePreFilterType.Additive;
        this.Refresh();
    }
    Refresh() {
        if (this.mChild.length == 0) {
            return;
        }
        let mipTex = [];
        mipTex.push(this.mRenderPass.mRenderTarget);
        let pri = this.mRenderPass.mPriority;
        pri++;
        for (let i = 0; i < this.m_mipMax; i++) {
            const downSample = this.GetDownSample(i);
            downSample.m_threshold = this.m_threshold;
            downSample.m_softThreshold = this.m_softThreshold;
            downSample.GetRP().mShaderAttr.length = 0;
            downSample.GetRP().mShaderAttr.push(new CShaderAttr(0, mipTex[i]));
            downSample.SetShaderAttr();
            downSample.GetRP().mPriority = pri;
            pri++;
            mipTex.push(downSample.GetTexKey());
        }
        for (let i = 0; i < this.m_mipMax; i++) {
            const upSample = this.GetUpSample(i);
            upSample.GetRP().mPriority = pri;
            pri++;
            upSample.m_blendFactor = this.GetBlendFactor(this.m_mipMax - i, this.m_mipMax);
            upSample.SetShaderAttr();
        }
        this.mChild[this.mChild.length - 1].GetPaint().SetTexture(mipTex[1]);
        this.mChild[this.mChild.length - 1].GetRP().mRenderTarget = mipTex[0];
    }
    EditChange(_pointer, _child) {
        super.EditChange(_pointer, _child);
        if (_child == true)
            return;
        this.Refresh();
        let msg = this.NewOutMsg("ClearBatch");
        msg.mInter = "canvas";
    }
    Export(_copy, _resetKey) {
        const watch = super.Export(_copy, _resetKey);
        watch.Refresh();
        return watch;
    }
    ImportCJSON(_json) {
        const watch = super.ImportCJSON(_json);
        watch.Refresh();
        return watch;
    }
}
export class CRPMgrBloom extends CRPMgr {
    static Tag(_pt, _mask = 1, _tag = "bloom") {
        _pt.PushTag(_tag);
        _pt.PushCShaderAttr(new CShaderAttr("mask", new CVec1(_mask)));
    }
    static Append(_rpm, _opt = {}) {
        const pal = CFrame.Main().Pal();
        const emissiveKey = CRPMgrBloom.PushEmissive(_opt.emissiveTo ?? _rpm, _opt);
        const bloom = CRPMgrBloom.PushBloom(_rpm, emissiveKey, _opt);
        const last = _rpm.PushSuf(new CSurface());
        const lrp = last.GetRP();
        lrp.mRenderTarget = pal.GetDefaultFrameBuffer();
        CRPMgrBloom.SetBlend(lrp, pal.GetMainFrameTex(), bloom.GetTexKey());
        return bloom;
    }
    constructor(_opt = {}) {
        super();
        if (CFrame.Main() == null)
            return;
        const pal = CFrame.Main().Pal();
        const emissiveKey = CRPMgrBloom.PushEmissive(this, _opt);
        const basicTex = new CTexture();
        basicTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)]);
        const basicKey = this.PushTex("Bloom/basicTex.tex", basicTex);
        const rp = this.PushRP(new CRPAuto());
        for (const cls of _opt.classes ?? ["CPaint2D"])
            rp.PushOr(new CCondition("class", "==", cls));
        rp.mShader = pal.Sl2DKey();
        rp.mCullFace = CRenderPass.eCull.None;
        rp.mRenderTarget = basicKey;
        rp.mShaderAttr.push(new CShaderAttr(SDF.eTexSlot.SingleShadowRead, pal.GetShadowReadTex()));
        const bloom = CRPMgrBloom.PushBloom(this, emissiveKey, _opt);
        const last = this.PushSuf(new CSurface());
        last.SetUseRT(false);
        CRPMgrBloom.SetBlend(last.GetRP(), basicKey, bloom.GetTexKey());
    }
    static PushEmissive(_rpm, _opt) {
        const emissiveTex = new CTexture();
        emissiveTex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8, 1)]);
        const emissiveKey = _rpm.PushTex("Bloom/emissiveTex.tex", emissiveTex);
        const rp = _rpm.PushRP(new CRPAuto());
        for (const cls of _opt.classes ?? ["CPaint2D"])
            rp.PushOr(new CCondition("class", "==", cls));
        rp.PushAnd(new CCondition("mTag[" + (_opt.tag ?? "bloom") + "]"));
        rp.mShader = CFrame.Main().Pal().Sl2DKey();
        rp.mCullFace = CRenderPass.eCull.None;
        rp.mRenderTarget = emissiveKey;
        rp.mTag.add("mask");
        return emissiveKey;
    }
    static PushBloom(_rpm, _emissiveKey, _opt) {
        const bloom = _rpm.PushSuf(new CSurfaceBloom());
        const brp = bloom.GetRP();
        brp.mShader = CFrame.Main().Pal().Sl2DKey();
        brp.mTag.add("blit");
        brp.mShaderAttr.push(new CShaderAttr(0, _emissiveKey));
        const preset = _opt.preset ?? "Glow";
        if (preset == "OldSchool")
            bloom.OldSchool();
        else if (preset == "ScreenBlur")
            bloom.ScreenBlur();
        else if (preset == "Glow") {
            bloom.OldSchool();
            bloom.m_threshold = 0;
            bloom.m_softThreshold = 0;
            bloom.m_intensity = 0.2;
            bloom.m_lowFrequencyBoost = 1.6;
        }
        if (_opt.intensity != null)
            bloom.m_intensity = _opt.intensity;
        if (_opt.threshold != null)
            bloom.m_threshold = _opt.threshold;
        if (_opt.softThreshold != null)
            bloom.m_softThreshold = _opt.softThreshold;
        if (_opt.lowFrequencyBoost != null)
            bloom.m_lowFrequencyBoost = _opt.lowFrequencyBoost;
        if (_opt.lowFrequencyBoostCurvation != null)
            bloom.m_lowFrequencyBoostCurvation = _opt.lowFrequencyBoostCurvation;
        if (_opt.highPassFrequency != null)
            bloom.m_highPassFrequency = _opt.highPassFrequency;
        bloom.Refresh();
        return bloom;
    }
    static SetBlend(_rp, _baseKey, _bloomKey) {
        _rp.mShader = CFrame.Main().Pal().SlPostKey();
        _rp.mTag.add("blend");
        _rp.mShaderAttr.push(new CShaderAttr(0, _baseKey));
        _rp.mShaderAttr.push(new CShaderAttr(1, _bloomKey));
        _rp.mShaderAttr.push(new CShaderAttr("BlendColor0", new CVec4(SDF.eBlend.Texture, 0)));
        _rp.mShaderAttr.push(new CShaderAttr("BlendColor1", new CVec4(SDF.eBlend.Texture, 1)));
        _rp.mShaderAttr.push(new CShaderAttr("BlendColor2", new CVec4(SDF.eBlend.LinearDodge, 0, 1, 1)));
    }
}
CClass.Push(CSurfaceDownSample);
CClass.Push(CSurfaceUpSample);
CClass.Push(CSurfaceBloom);
CClass.Push(CRPMgrBloom);

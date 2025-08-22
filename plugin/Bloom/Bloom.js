import { CClass } from "../../artgine/basic/CClass.js";
import { CSurface } from "../../artgine/canvas/subject/CSurface.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CTexture, CTextureInfo } from "../../artgine/render/CTexture.js";
export class CSurfaceDownSample extends CSurface {
    m_srcSize;
    m_mipLevel;
    m_threshold;
    m_softThreshold;
    constructor() {
        super();
        this.GetRP().mShader = "PostDownSample";
        this.GetRP().mClearColor = false;
        this.GetRP().mDepthWrite = false;
        this.GetRP().mDepthTest = false;
    }
    SetFrame(_fw) {
        super.SetFrame(_fw);
        if (_fw != null) {
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
        this.GetRP().mShader = "PostUpSample";
        this.GetRP().mDepthWrite = false;
        this.GetRP().mDepthTest = false;
        this.GetRP().mClearColor = false;
    }
    SetFrame(_fw) {
        super.SetFrame(_fw);
        if (_fw != null) {
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
        this.GetRP().mBlend = [CRenderPass.eBlend.FUNC_ADD, CRenderPass.eBlend.FUNC_ADD, CRenderPass.eBlend.ONE, CRenderPass.eBlend.ONE, CRenderPass.eBlend.ZERO, CRenderPass.eBlend.ONE];
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
        let mipSize = [screenSize];
        let mipTex = [];
        this.GetRP().mClearColor = false;
        this.GetRP().mDepthWrite = false;
        this.GetRP().mDepthTest = false;
        this.NewRT([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA32F)], mipSize[0], true);
        mipTex.push(this.mRenderPass.mRenderTarget);
        for (let i = 0; i < this.m_mipMax; i++) {
            mipSize.push(new CVec2(mipSize[i].x * 0.5, mipSize[i].y * 0.5));
            let downSampleSurf = new CSurfaceDownSample();
            downSampleSurf.SetKey("DownSample" + i);
            downSampleSurf.ResetTexture(mipSize[i], i, this.m_threshold, this.m_softThreshold);
            downSampleSurf.GetRP().mRenderTarget = "DownSample" + i + ".tex";
            downSampleSurf.GetRP().mShaderAttr.push(new CShaderAttr(0, mipTex[i]));
            this.PushChilde(downSampleSurf);
            mipTex.push(downSampleSurf.GetTexKey());
        }
        for (let i = this.m_mipMax; i > 1; i--) {
            let upSampleSurf = new CSurfaceUpSample();
            const texIndex = this.m_mipMax - i;
            upSampleSurf.SetKey("UpSample" + texIndex);
            upSampleSurf.ResetTexture(mipTex[i - 1], this.GetBlendFactor(i, this.m_mipMax));
            upSampleSurf.GetRP().mShaderAttr.push(new CShaderAttr(0, mipTex[i]));
            this.PushChilde(upSampleSurf);
        }
        let upSampleSurf = new CSurfaceUpSample();
        upSampleSurf.SetKey("UpSample" + (this.m_mipMax - 1));
        upSampleSurf.ResetTexture(mipTex[0], this.GetBlendFactor(0, this.m_mipMax));
        upSampleSurf.GetPaint().SetTexture(mipTex[1]);
        this.PushChilde(upSampleSurf);
    }
    GetTexKey() {
        return this.mChilde[this.mChilde.length - 1].GetTexKey();
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
        if (this.mChilde.length == 0) {
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
            upSample.m_blendFactor = this.GetBlendFactor(i, this.m_mipMax);
            upSample.SetShaderAttr();
        }
        this.mChilde[this.mChilde.length - 1].GetPaint().SetTexture(mipTex[1]);
        this.mChilde[this.mChilde.length - 1].GetRP().mRenderTarget = mipTex[0];
    }
    Update(_delay) {
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
CClass.Push(CSurfaceDownSample);
CClass.Push(CSurfaceUpSample);
CClass.Push(CSurfaceBloom);

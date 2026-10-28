import { CSurface } from "../../artgine/app/subject/CSurface.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CUtilObj } from "../../artgine/basic/CUtilObj.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CTexture, CTextureInfo } from "../../artgine/render/CTexture.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CRPMgr } from "../../artgine/app/canvas/CRPMgr.js";
import { CPlugin } from "../../artgine/util/CPlugin.js";
import { CEvent } from "../../artgine/basic/CEvent.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CUpdate } from "../../artgine/basic/Basic.js";
let gBloomShader = "";
CPlugin.PushEvent(CEvent.eType.Load, () => {
    gBloomShader = CPlugin.FindPath("Bloom") + "BloomShader.ts";
    CFrame.Main().Load().Exe(gBloomShader);
});
export class CSurfaceBloom extends CSurface {
    static ePreFilterType = {
        EnergyConserving: 0,
        Additive: 1
    };
    m_preFilterType = CSurfaceBloom.ePreFilterType.Additive;
    m_threshold = 0.0;
    m_softThreshold = 0.0;
    m_intensity = 0.15;
    m_lowFrequencyBoostCurvation = 0.95;
    m_lowFrequencyBoost = 2.0;
    m_highPassFrequency = 1.0;
    IsShould(_member, _type) {
        let view = [
            "m_preFilterType", "m_threshold", "m_softThreshold", "m_intensity",
            "m_lowFrequencyBoostCurvation", "m_lowFrequencyBoost", "m_highPassFrequency",
        ];
        if (view.includes(_member)) {
            return true;
        }
        return super.IsShould(_member, _type);
    }
    Start() {
        super.Start();
        this.GetRP().mEnable.v = false;
        this.GetRP().mClearColor = false;
        this.GetRP().mClearDepth = false;
        this.GetRP().mDepthWrite = false;
        this.GetRP().mDepthTest = false;
        this.GetRP().mBlend = [CRenderPass.eBlend.FUNC_ADD, CRenderPass.eBlend.FUNC_ADD, CRenderPass.eBlend.ONE, CRenderPass.eBlend.ONE, CRenderPass.eBlend.ONE, CRenderPass.eBlend.ONE];
        const mipSize = [
            new CVec2(1 / 2, 1 / 2), new CVec2(1 / 4, 1 / 4), new CVec2(1 / 8, 1 / 8),
            new CVec2(1 / 16, 1 / 16), new CVec2(1 / 32, 1 / 32), new CVec2(1 / 64, 1 / 64)
        ];
        const mipTex = [
            `Bloom/${this.ObjHash()}/DownSample0.tex`, `Bloom/${this.ObjHash()}/DownSample1.tex`, `Bloom/${this.ObjHash()}/DownSample2.tex`,
            `Bloom/${this.ObjHash()}/DownSample3.tex`, `Bloom/${this.ObjHash()}/DownSample4.tex`, `Bloom/${this.ObjHash()}/DownSample5.tex`
        ];
        const inputTex = this.GetRP().mShaderAttr.find(_sa => _sa.mType == -2 && _sa.mEach == 0)?.mKey ?? this.GetTexKey();
        for (let i = 0; i < 6; i++) {
            const downSampleSurf = this.PushChild(new CSurface());
            downSampleSurf.SetKey("DownSample" + i);
            downSampleSurf.mTexKey = mipTex[i];
            downSampleSurf.NewRT([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8)], mipSize[i], true);
            downSampleSurf.GetRP().mShader = gBloomShader;
            downSampleSurf.GetRP().mClearColor = false;
            downSampleSurf.GetRP().mClearDepth = false;
            downSampleSurf.GetRP().mDepthWrite = false;
            downSampleSurf.GetRP().mDepthTest = false;
            downSampleSurf.GetPaint().PushTag("down");
            downSampleSurf.GetPaint().PushCShaderAttr(new CShaderAttr("mipLevel", i));
            downSampleSurf.GetPaint().PushCShaderAttr(new CShaderAttr("threshold", this.m_threshold));
            downSampleSurf.GetPaint().PushCShaderAttr(new CShaderAttr("softThreshold", this.m_softThreshold));
            if (i >= 1)
                downSampleSurf.GetPaint().PushCShaderAttr(new CShaderAttr(0, mipTex[i - 1]));
            else
                downSampleSurf.GetPaint().PushCShaderAttr(new CShaderAttr(0, inputTex));
            downSampleSurf.Start();
        }
        for (let i = 5; i >= 0; i--) {
            const upSampleSurf = this.PushChild(new CSurface());
            upSampleSurf.SetKey("UpSample" + i);
            if (i >= 1)
                upSampleSurf.mTexKey = mipTex[i - 1];
            else
                upSampleSurf.mTexKey = this.GetTexKey();
            upSampleSurf.GetRP().mShader = gBloomShader;
            upSampleSurf.GetRP().mClearColor = false;
            upSampleSurf.GetRP().mClearDepth = false;
            upSampleSurf.GetRP().mDepthWrite = false;
            upSampleSurf.GetRP().mDepthTest = false;
            upSampleSurf.GetRP().mBlend = [CRenderPass.eBlend.FUNC_ADD, CRenderPass.eBlend.FUNC_ADD, CRenderPass.eBlend.ONE, CRenderPass.eBlend.ONE, CRenderPass.eBlend.ONE, CRenderPass.eBlend.ONE];
            upSampleSurf.GetPaint().PushTag("up");
            upSampleSurf.GetPaint().PushCShaderAttr(new CShaderAttr("blendFactor", this.GetBlendFactor(i)));
            upSampleSurf.GetPaint().PushCShaderAttr(new CShaderAttr(0, mipTex[i]));
            upSampleSurf.Start();
        }
        this.Refresh();
    }
    Destroy() {
        const mipTex = [
            `Bloom/${this.ObjHash()}/DownSample0.tex`, `Bloom/${this.ObjHash()}/DownSample1.tex`, `Bloom/${this.ObjHash()}/DownSample2.tex`,
            `Bloom/${this.ObjHash()}/DownSample3.tex`, `Bloom/${this.ObjHash()}/DownSample4.tex`, `Bloom/${this.ObjHash()}/DownSample5.tex`
        ];
        for (let i = 0; i < 6; i++) {
            const tex = this.GetFrame().Res().Find(mipTex[i]);
            this.GetFrame().Ren().ReleaseTexture(tex);
            this.GetFrame().Res().Remove(mipTex[i]);
        }
        super.Destroy();
    }
    GetDownSample(_index) {
        return this.FindChild("DownSample" + _index);
    }
    GetUpSample(_index) {
        return this.FindChild("UpSample" + _index);
    }
    GetBlendFactor(_mip) {
        const mipDepth = Math.max(1, _mip) / 6;
        const tailCurve = 1.0 - Math.pow(1.0 - mipDepth, 1.0 / (1.0 - this.m_lowFrequencyBoostCurvation));
        const energyScale = this.m_preFilterType == CSurfaceBloom.ePreFilterType.EnergyConserving ? 1.0 - this.m_intensity : 1.0;
        const depthScale = Math.pow(mipDepth, 0.5);
        const tailStrength = tailCurve * this.m_lowFrequencyBoost * energyScale * depthScale;
        const highPassFade = 1.0 - CMath.Clamp((mipDepth - this.m_highPassFrequency) / this.m_highPassFrequency, 0.0, 1.0);
        return (this.m_intensity + tailStrength) * highPassFade;
    }
    Natural() {
        this.m_intensity = 1.0;
        this.m_threshold = 0.0;
        this.m_softThreshold = 0.0;
        this.m_lowFrequencyBoost = 1.1;
        this.m_lowFrequencyBoostCurvation = 0.6;
        this.m_highPassFrequency = 0.55;
        this.EnergyConserving();
    }
    OldSchool() {
        this.m_intensity = 2.2;
        this.m_threshold = 0.08;
        this.m_softThreshold = 0.5;
        this.m_lowFrequencyBoost = 0.0;
        this.m_lowFrequencyBoostCurvation = 0.95;
        this.m_highPassFrequency = 0.2;
        this.Additive();
    }
    ScreenBlur() {
        this.m_intensity = 0.05;
        this.m_threshold = 0.0;
        this.m_softThreshold = 0.0;
        this.m_lowFrequencyBoost = 3.3;
        this.m_lowFrequencyBoostCurvation = 0.95;
        this.m_highPassFrequency = 0.55;
        this.EnergyConserving();
    }
    Glow() {
        this.m_intensity = 0.85;
        this.m_threshold = 0;
        this.m_softThreshold = 0;
        this.m_lowFrequencyBoost = 1.5;
        this.m_lowFrequencyBoostCurvation = 0.95;
        this.m_highPassFrequency = 0.4;
        this.Additive();
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
        if (this.mChild.length == 0)
            return;
        for (let i = 0; i < 6; i++) {
            const paint = this.GetDownSample(i).GetPaint();
            paint.PushCShaderAttr(new CShaderAttr("mipLevel", i));
            paint.PushCShaderAttr(new CShaderAttr("threshold", this.m_threshold));
            paint.PushCShaderAttr(new CShaderAttr("softThreshold", this.m_softThreshold));
            this.GetUpSample(i).GetPaint().PushCShaderAttr(new CShaderAttr("blendFactor", this.GetBlendFactor(i)));
        }
    }
    EditForm(_pointer, _body, _input) {
        super.EditForm(_pointer, _body, _input);
        if (_pointer.member != "m_preFilterType" || _input == null)
            return;
        _body.append(CUtilObj.Select(_pointer, _input, ["EnergyConserving", "Additive"], [CSurfaceBloom.ePreFilterType.EnergyConserving, CSurfaceBloom.ePreFilterType.Additive], true));
        const presets = [
            ["Natural", () => this.Natural()], ["OldSchool", () => this.OldSchool()],
            ["ScreenBlur", () => this.ScreenBlur()], ["Glow", () => this.Glow()],
        ];
        const row = document.createElement("div");
        row.className = "mt-1";
        for (const [name, apply] of presets) {
            const btn = document.createElement("button");
            btn.className = "btn btn-sm btn-outline-secondary me-1";
            btn.innerText = name;
            btn.onclick = () => {
                apply();
                this.EditRefresh();
                this.EditChange(_pointer, false);
            };
            row.append(btn);
        }
        _body.append(row);
    }
    EditChange(_pointer, _child) {
        super.EditChange(_pointer, _child);
        if (_child == true)
            return;
        this.Refresh();
        const msg = this.NewOutMsg("ClearBatch");
        msg.mInter = "canvas";
    }
    Export(_copy, _resetKey) {
        const watch = super.Export(_copy, _resetKey);
        for (const child of watch.mChild)
            child.Destroy();
        watch.mChild.length = 0;
        return watch;
    }
    ImportCJSON(_json) {
        const watch = super.ImportCJSON(_json);
        watch.Refresh();
        return watch;
    }
}
export class CRPMgrBloom extends CRPMgr {
    constructor(_opt = {}) {
        super();
        if (CFrame.Main() == null)
            return;
        const pal = CFrame.Main().Pal();
        const outKey = _opt.output ?? pal.GetMainFrameTex();
        const bloom = this.PushSuf(new CSurfaceBloom());
        bloom.mTexKey = outKey;
        bloom.mTexInfo = [new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8)];
        const brp = bloom.GetRP();
        brp.mRenderTarget = outKey;
        brp.mShader = pal.Sl2DKey();
        brp.mTag.add("blit");
        brp.mShaderAttr.push(new CShaderAttr(0, _opt.input ?? pal.GetEmissionTex()));
        const preset = _opt.preset ?? "Glow";
        if (preset == "OldSchool")
            bloom.OldSchool();
        else if (preset == "ScreenBlur")
            bloom.ScreenBlur();
        else if (preset == "Natural")
            bloom.Natural();
        else if (preset == "Glow")
            bloom.Glow();
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
    }
    GetBloom() {
        return this.mSufArr.find(_suf => _suf instanceof CSurfaceBloom);
    }
    SetInput(_key) {
        const attr = this.GetBloom().GetRP().mShaderAttr.find(_sa => _sa.mType == -2 && _sa.mEach == 0);
        attr.mKey = _key;
        this.mUpdate = CUpdate.eType.Updated;
    }
    SetOutput(_key) {
        const bloom = this.GetBloom();
        bloom.mTexKey = _key;
        bloom.GetRP().mRenderTarget = _key;
        this.mUpdate = CUpdate.eType.Updated;
    }
}
CClass.Push(CSurfaceBloom);
CClass.Push(CRPMgrBloom);

import { CShaderAttr } from "../render/CShaderAttr.js";
import { CHash } from "../basic/CHash.js";
import { CObject } from "../basic/CObject.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CClass } from "../basic/CClass.js";
import { CDomFactory } from "../basic/CDOMFactory.js";
import { CVec1 } from "../geometry/CVec1.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
export class CRenderPass extends CObject {
    static eLightDiffuse = {
        None: 0,
        Distance: 1,
        Lambert: 2,
        HafeLambert: 3,
        OrenNayar: 4,
    };
    static eLightSpecular = {
        None: 0,
        Phong: 1,
        BlinnPhong: 2,
        CookTorrance: 3,
        Rim: 4,
        GGX: 5,
    };
    static eShadow = {
        Cas0: 0,
        Cas1: 1,
        Cas2: 2,
        Near: 3,
        Far: 4,
        Top: 5,
        Bottom: 6,
        Left: 7,
        Right: 8,
    };
    static eGBuf = {
        Position: 0,
        Normal: 1,
        Albedo: 2,
        Ambient: 4,
        SpeculerPowEmissive: 5,
        Count: 7,
    };
    static eCull = {
        CW: -1,
        None: 0,
        CCW: 1,
    };
    static ePriority = {
        BackGround: 200000,
        Sort2D: 250000,
        Normal: 300000,
        AlphaAuto: 399000,
        Alpha: 400000,
        Surface: 500000,
        Frame: 600000,
        Before: 700000,
        Main: 800000,
        Ui: 900000,
        PCount: 100000,
        Null: 50000,
        NoDepth: 1000000,
    };
    static eBlend = {
        LinearDodge: 1,
        Multiply: 2,
        LerpPer: 3,
        LerpAlpha: 4,
        Darken: 5,
        Lighten: 6,
        Org: 7,
        Tar: 8,
        DarkCut: 9,
        FUNC_ADD: 32774,
        FUNC_SUBTRACT: 32778,
        FUNC_REVERSE_SUBTRACT: 32779,
        FUNC_MIN: 32775,
        FUNC_MAX: 32776,
        ZERO: 0,
        ONE: 1,
        SRC_COLOR: 768,
        ONE_MINUS_SRC_COLOR: 769,
        DST_COLOR: 774,
        ONE_MINUS_DST_COLOR: 775,
        SRC_ALPHA: 770,
        ONE_MINUS_SRC_ALPHA: 771,
        DST_ALPHA: 772,
        ONE_MINUS_DST_ALPHA: 773,
        CONSTANT_COLOR: 32769,
        ONE_MINUS_CONSTANT_COLOR: 32770,
        CONSTANT_ALPHA: 32771,
        ONE_MINUS_CONSTANT_ALPHA: 32772,
        SRC_ALPHA_SATURATE: 776,
    };
    static eSort = {
        Distance: 1,
        RPAlphaGroup: 0,
        None: -1,
    };
    mDepthTest = null;
    mDepthWrite = null;
    mAlpha = null;
    mCullFace = CRenderPass.eCull.CCW;
    mCamera = null;
    mCullFrustum = true;
    mPriority = CRenderPass.ePriority.Normal;
    mRenderTarget = "";
    mRenderTargetUse = new Set();
    mRenderTargetLevel = 0;
    mShaderAttr = new Array();
    mShader = "";
    mClearDepth = null;
    mClearColor = null;
    mCycle = 0;
    mBlitType = 0;
    mBlitRead = "";
    mLine = null;
    mSort = CRenderPass.eSort.Distance;
    mBlend = [CRenderPass.eBlend.FUNC_ADD, CRenderPass.eBlend.FUNC_ADD, CRenderPass.eBlend.SRC_ALPHA, CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA, CRenderPass.eBlend.ONE, CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA];
    mTag = "";
    SetPriority(_v) { this.mPriority = _v; this.Reset(); }
    GetPriority() { return this.mPriority; }
    SetLine(_v) { this.mLine = _v; this.Reset(); }
    GetLine() { return this.mLine; }
    FindSA(_key) {
        for (let sa of this.mShaderAttr) {
            if (sa.mKey == _key)
                return sa;
        }
        return null;
    }
    DeleteSA(_key) {
        for (let i = 0; i < this.mShaderAttr.length; ++i) {
            if (this.mShaderAttr[i].mKey == _key) {
                this.mShaderAttr.splice(i, 1);
                break;
            }
        }
    }
    mKey = "";
    mCP = null;
    IsShould(_member, _type) {
        if (_member == "mCP")
            return false;
        return super.IsShould(_member, _type);
    }
    constructor(_shaderKey = "", _priority = CRenderPass.ePriority.Normal) {
        super();
        this.mShader = _shaderKey;
        this.mPriority = _priority;
    }
    Reset() {
        var str = this.mPriority + "";
        str += this.mDepthTest;
        str += this.mDepthWrite;
        str += this.mAlpha;
        str += this.mCullFace;
        str += this.mCamera;
        str += this.mCullFrustum;
        str += this.mRenderTarget;
        str += this.mBlitType;
        str += this.mBlitRead;
        str += this.mLine;
        str += this.mBlend;
        for (let each0 of this.mShaderAttr) {
            str += each0.ToStr();
        }
        if (this.mShader != null)
            str += this.mShader;
        str += this.mTag;
        this.mKey = CHash.HashCode(str) + "";
        this.mCP = null;
    }
    Key() {
        if (this.mKey == "")
            this.Reset();
        return this.mKey;
    }
    EditForm(_pointer, _body, _input) {
        super.EditForm(_pointer, _body, _input);
        if (_pointer.member == "mDepthTest")
            CUtilObj.NullEdit(_pointer, _body, _input, false);
        else if (_pointer.member == "mAlpha")
            CUtilObj.NullEdit(_pointer, _body, _input, false);
        else if (_pointer.member == "mCullFace") {
            CUtilObj.NullEdit(_pointer, _body, _input, 0);
            if (_input != null) {
                _body.append(CUtilObj.Select(_pointer, _input, ["CW", "None", "CCW"], [CRenderPass.eCull.CW, CRenderPass.eCull.None, CRenderPass.eCull.CCW], true));
            }
        }
        else if (_pointer.member == "mCamera")
            CUtilObj.NullEdit(_pointer, _body, _input, "");
        else if (_pointer.member == "mCullFrustum")
            CUtilObj.NullEdit(_pointer, _body, _input, true);
        else if (_pointer.member == "mPriority") {
            const enumObj = CRenderPass.ePriority;
            const enumKeys = CClass.EnumName(enumObj);
            const enumVals = enumKeys.map(k => enumObj[k]);
            _body.append(CUtilObj.Select(_pointer, _input, enumKeys, enumVals, false));
        }
        else if (_pointer.member == "mRenderTargetUse") {
            CUtilObj.ArrayAddSelectList(_pointer, _body, _input, [0]);
        }
        else if (_pointer.member == "mShaderAttr") {
            const html = CDomFactory.DataToDom(`
				<div class="mb-3">
					<div class="d-flex align-items-center gap-2">
						<select class="form-select form-select-sm" id="shader_type_select">
							<option value="CVec1">CVec1</option>
							<option value="CVec2">CVec2</option>
							<option value="CVec3">CVec3</option>
							<option value="CVec4">CVec4</option>
							<option value="texture">texture</option>
						</select>
						<button class="btn btn-outline-primary btn-sm" id="shader_add_btn">+</button>
					</div>
				</div>
			`);
            _body.append(html);
            const select = html.querySelector("#shader_type_select");
            const addBtn = html.querySelector("#shader_add_btn");
            addBtn.onclick = () => {
                const type = select.value;
                const list = _pointer.Get();
                let attr;
                switch (type) {
                    case "CVec1":
                        attr = new CShaderAttr("dummy", new CVec1());
                        break;
                    case "CVec2":
                        attr = new CShaderAttr("dummy", new CVec2());
                        break;
                    case "CVec3":
                        attr = new CShaderAttr("dummy", new CVec3());
                        break;
                    case "CVec4":
                        attr = new CShaderAttr("dummy", new CVec4());
                        break;
                    case "texture":
                        attr = new CShaderAttr(0, "texture", []);
                        break;
                    default:
                        return;
                }
                list.push(attr);
                _pointer.target?.EditRefresh?.();
                super.EditChange(_pointer, true);
            };
        }
        else if (_pointer.member == "mClearDepth")
            CUtilObj.NullEdit(_pointer, _body, _input, true);
        else if (_pointer.member == "mClearColor")
            CUtilObj.NullEdit(_pointer, _body, _input, true);
        else if (_pointer.member == "mBlitType") {
            _body.append(CUtilObj.Select(_pointer, _input, ["None", "depth", "color"], [0, 1, 2], true));
        }
        else if (_pointer.member == "mLine")
            CUtilObj.NullEdit(_pointer, _body, _input, false);
        else if (_pointer.member == "mSort") {
            const enumObj = CRenderPass.eSort;
            const enumKeys = CClass.EnumName(enumObj);
            const enumVals = enumKeys.map(k => enumObj[k]);
            _body.append(CUtilObj.Select(_pointer, _input, enumKeys, enumVals, true));
        }
    }
    EditChange(_pointer, _childe) {
        super.EditChange(_pointer, _childe);
        this.Reset();
    }
    Export(_copy, _resetKey) {
        return super.Export(_copy, _resetKey);
    }
}
;

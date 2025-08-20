import { CAlert } from "../basic/CAlert.js";
import { CUtil } from "../basic/CUtil.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CRenderPass } from "./CRenderPass.js";
var g_property = new Map();
export class CDevice {
    mDrawType = -1;
    mViewportArr = [0, 0, 0, 0];
    mDepthVal = 1.0;
    mColorVal = new CVec4(0, 0, 0, 0);
    mClearColor = true;
    mClearDepth = true;
    mStaticRP = new CRenderPass();
    m_pf = null;
    constructor(_pf, _handle) {
        this.m_pf = _pf;
        this.mStaticRP.mDepthTest = true;
        this.mStaticRP.mDepthWrite = true;
        this.mStaticRP.mAlpha = true;
        this.mStaticRP.mCullFace = CRenderPass.eCull.CCW;
        this.mStaticRP.mLine = false;
        this.mStaticRP.mBlend = [CRenderPass.eBlend.FUNC_ADD, CRenderPass.eBlend.FUNC_ADD, CRenderPass.eBlend.SRC_ALPHA,
            CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA, CRenderPass.eBlend.ONE, CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA];
    }
    GetMainFrameTex() { return null; }
    PF() { return this.m_pf; }
    GetHandle() { return null; }
    GL() { return null; }
    GPU() { return null; }
    DrawType() { return -1; }
    async Init() { }
    SetClearColor(_enable, _val = null) {
        this.mClearColor = _enable;
        if (_val != null)
            this.mColorVal = _val;
    }
    SetClearDepth(_enable, _val = null) {
        this.mClearDepth = _enable;
        if (_val != null)
            this.mDepthVal = _val;
    }
    SetAlpha(_enable) { }
    SetCullFace(_enable) { }
    SetDepthWrite(_enable) { }
    SetDepthTest(_enable) { }
    SetBlend(_data) { }
    SetLine(_enable) { }
    ViewPort(_x, _y, _w, _h) { }
    ChangeRenderPass(_rp) {
        var dum = new CRenderPass();
        dum.mAlpha = this.mStaticRP.mAlpha;
        dum.mCullFace = this.mStaticRP.mCullFace;
        dum.mDepthTest = this.mStaticRP.mDepthTest;
        dum.mDepthWrite = this.mStaticRP.mDepthWrite;
        dum.mLine = this.mStaticRP.mLine;
        for (var i = 0; i < this.mStaticRP.mBlend.length; ++i) {
            dum.mBlend[i] = this.mStaticRP.mBlend[i];
        }
        if (_rp.mAlpha != null && dum.mAlpha != _rp.mAlpha) {
            this.SetAlpha(_rp.mAlpha);
        }
        if (_rp.mCullFace != null && dum.mCullFace != _rp.mCullFace) {
            this.SetCullFace(_rp.mCullFace);
        }
        if (_rp.mDepthTest != null && dum.mDepthTest != _rp.mDepthTest) {
            this.SetDepthTest(_rp.mDepthTest);
        }
        if (_rp.mDepthWrite != null && dum.mDepthWrite != _rp.mDepthWrite) {
            this.SetDepthWrite(_rp.mDepthWrite);
        }
        if (_rp.mLine != null && dum.mLine != _rp.mLine) {
            this.SetLine(_rp.mLine);
        }
        if (dum.mBlend[0] != _rp.mBlend[0] || dum.mBlend[1] != _rp.mBlend[1] || dum.mBlend[2] != _rp.mBlend[2] ||
            dum.mBlend[3] != _rp.mBlend[3] || dum.mBlend[4] != _rp.mBlend[4] || dum.mBlend[5] != _rp.mBlend[5]) {
            this.SetBlend(_rp.mBlend);
        }
        return dum;
    }
    static GetProperty(_pro) {
        return g_property.get(_pro);
    }
    static SetProperty(_pro, _val) {
        return g_property.set(_pro, _val);
    }
    static eProperty = {
        VertexUniform: 0,
        PixelUniform: 1,
        Sam2DMax: 2,
        Sam2DArrMax: 3,
        SamCubeMax: 4,
        Sam2dArrLayerMax: 5,
        Sam2DWriteX: 7,
        Sam2DWriteY: 8,
        HalfFloat: 9,
    };
}
export class CDeviceGL extends CDevice {
    m_gl;
    constructor(_pf, _handle) {
        super(_pf, _handle);
        this.m_gl = _handle.getContext("webgl2", { antialias: this.m_pf.mAnti, depth: true, stencil: true, "xrCompatible": _pf.mXR,
            "premultipliedAlpha": false, "alpha": true });
        if (window["WebGLDebugUtils"] != null) {
            this.m_gl = window["WebGLDebugUtils"].makeDebugContext(this.m_gl, function (err, funcName, args) {
                console.error(`🚨 WebGL error: ${window["WebGLDebugUtils"].glEnumToString(err)} in ${funcName}`, args);
                debugger;
            });
        }
        this.GL().pixelStorei(this.GL().UNPACK_FLIP_Y_WEBGL, true);
        if (!this.m_gl) {
            CAlert.E("초기화 실패.(하드웨어 가속을 켜주세요!");
            return;
        }
        this.mDrawType = this.GL().TRIANGLES;
        g_property.set(CDevice.eProperty.HalfFloat, 1);
        if (CUtil.IsMobile()) {
            let ext = this.GL().getExtension('EXT_color_buffer_half_float');
            if (!ext) {
                CAlert.W("no EXT_color_buffer_half_float");
                g_property.set(CDevice.eProperty.HalfFloat, 0);
            }
        }
        else {
            let ext = this.GL().getExtension('EXT_color_buffer_float');
            if (!ext) {
                CAlert.W("no EXT_color_buffer_float");
                g_property.set(CDevice.eProperty.HalfFloat, 0);
            }
            ext = this.GL().getExtension('OES_texture_float_linear');
            if (!ext) {
                CAlert.W("no OES_texture_float_linear");
            }
        }
        this.GL().getExtension('EXT_float_blend');
        CRenderPass.eBlend.FUNC_ADD = this.GL().FUNC_ADD;
        CRenderPass.eBlend.FUNC_SUBTRACT = this.GL().FUNC_SUBTRACT;
        CRenderPass.eBlend.FUNC_REVERSE_SUBTRACT = this.GL().FUNC_REVERSE_SUBTRACT;
        CRenderPass.eBlend.ZERO = this.GL().ZERO;
        CRenderPass.eBlend.ONE = this.GL().ONE;
        CRenderPass.eBlend.SRC_COLOR = this.GL().SRC_COLOR;
        CRenderPass.eBlend.ONE_MINUS_SRC_COLOR = this.GL().ONE_MINUS_SRC_COLOR;
        CRenderPass.eBlend.DST_COLOR = this.GL().DST_COLOR;
        CRenderPass.eBlend.ONE_MINUS_DST_COLOR = this.GL().ONE_MINUS_DST_COLOR;
        CRenderPass.eBlend.SRC_ALPHA = this.GL().SRC_ALPHA;
        CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA = this.GL().ONE_MINUS_SRC_ALPHA;
        CRenderPass.eBlend.DST_ALPHA = this.GL().DST_ALPHA;
        CRenderPass.eBlend.ONE_MINUS_DST_ALPHA = this.GL().ONE_MINUS_DST_ALPHA;
        CRenderPass.eBlend.CONSTANT_COLOR = this.GL().CONSTANT_COLOR;
        CRenderPass.eBlend.ONE_MINUS_CONSTANT_COLOR = this.GL().ONE_MINUS_CONSTANT_COLOR;
        CRenderPass.eBlend.CONSTANT_ALPHA = this.GL().CONSTANT_ALPHA;
        CRenderPass.eBlend.ONE_MINUS_CONSTANT_ALPHA = this.GL().ONE_MINUS_CONSTANT_ALPHA;
        CRenderPass.eBlend.SRC_ALPHA_SATURATE = this.GL().SRC_ALPHA_SATURATE;
        var max_v_uniforms = this.GL().getParameter(this.GL().MAX_VERTEX_UNIFORM_VECTORS);
        var max_f_uniforms = this.GL().getParameter(this.GL().MAX_FRAGMENT_UNIFORM_VECTORS);
        var texture_units = this.GL().getParameter(this.GL().MAX_TEXTURE_IMAGE_UNITS);
        var TexLay = this.GL().getParameter(this.GL().MAX_ARRAY_TEXTURE_LAYERS);
        var TexSize = this.GL().getParameter(this.GL().MAX_TEXTURE_SIZE);
        g_property.set(CDevice.eProperty.Sam2DMax, 10);
        g_property.set(CDevice.eProperty.Sam2DArrMax, 1);
        g_property.set(CDevice.eProperty.SamCubeMax, 5);
        g_property.set(CDevice.eProperty.Sam2dArrLayerMax, TexLay);
        g_property.set(CDevice.eProperty.VertexUniform, 1024);
        g_property.set(CDevice.eProperty.PixelUniform, 1024);
        g_property.set(CDevice.eProperty.Sam2DWriteX, TexSize / 2 / 4);
        g_property.set(CDevice.eProperty.Sam2DWriteY, TexSize / 2 / 4);
        this.mStaticRP.mCullFace = CRenderPass.eCull.CCW;
    }
    async Init() {
        this.GL().frontFace(this.GL().CCW);
        this.GL().enable(this.GL().CULL_FACE);
        this.GL().enable(this.GL().DEPTH_TEST);
        this.GL().depthFunc(this.GL().LEQUAL);
        this.GL().enable(this.GL().BLEND);
        this.GL().blendEquationSeparate(this.GL().FUNC_ADD, this.GL().FUNC_ADD);
        this.GL().blendFuncSeparate(this.GL().SRC_ALPHA, this.GL().ONE_MINUS_SRC_ALPHA, this.GL().ONE, this.GL().ONE_MINUS_SRC_ALPHA);
        this.GL().depthMask(true);
        this.GL().canvas.width = this.m_pf.mWidth;
        this.GL().canvas.height = this.m_pf.mHeight;
        this.GL().viewport(0, 0, this.GL().canvas.width, this.GL().canvas.height);
        this.GL().clearColor(0, 0, 0, 1);
        this.GL().clear(this.GL().COLOR_BUFFER_BIT | this.GL().DEPTH_BUFFER_BIT);
    }
    GetHandle() {
        return this.m_gl;
    }
    GL() {
        return this.m_gl;
    }
    DrawType() { return this.mDrawType; }
    ViewPort(_x, _y, _w, _h) {
        if (this.mViewportArr[0] != _x || this.mViewportArr[1] != _y || this.mViewportArr[2] != _w || this.mViewportArr[3] != _h) {
            this.mViewportArr[0] = _x;
            this.mViewportArr[1] = _y;
            this.mViewportArr[2] = _w;
            this.mViewportArr[3] = _h;
            this.GL().viewport(_x, _y, _w, _h);
        }
    }
    SetBlend(_data) {
        for (var i = 0; i < _data.length; ++i) {
            this.mStaticRP.mBlend[i] = _data[i];
        }
        this.GL().blendEquationSeparate(_data[0], _data[1]);
        this.GL().blendFuncSeparate(_data[2], _data[3], _data[4], _data[5]);
    }
    SetCullFace(_enable) {
        this.mStaticRP.mCullFace = _enable;
        if (_enable != 0) {
            this.GL().enable(this.GL().CULL_FACE);
            if (_enable == CRenderPass.eCull.CCW)
                this.GL().frontFace(this.GL().CCW);
            else
                this.GL().frontFace(this.GL().CW);
        }
        else {
            this.GL().disable(this.GL().CULL_FACE);
        }
    }
    SetDepthTest(_enable) {
        this.mStaticRP.mDepthTest = _enable;
        if (_enable) {
            this.GL().depthFunc(this.GL().LEQUAL);
        }
        else {
            this.GL().depthFunc(this.GL().ALWAYS);
        }
    }
    SetAlpha(_enable) {
        this.mStaticRP.mAlpha = _enable;
        if (_enable) {
            this.GL().enable(this.GL().BLEND);
            this.GL().blendEquationSeparate(this.GL().FUNC_ADD, this.GL().FUNC_ADD);
            this.GL().blendFuncSeparate(this.GL().SRC_ALPHA, this.GL().ONE_MINUS_SRC_ALPHA, this.GL().ONE, this.GL().ONE_MINUS_SRC_ALPHA);
        }
        else {
            this.GL().disable(this.GL().BLEND);
        }
    }
    SetDepthWrite(_enable) {
        this.mStaticRP.mDepthWrite = _enable;
        if (_enable) {
            this.GL().depthMask(true);
        }
        else {
            this.GL().depthMask(false);
        }
    }
    SetLine(_enable) {
        this.mStaticRP.mLine = _enable;
        if (_enable == false)
            this.mDrawType = this.GL().TRIANGLES;
        else
            this.mDrawType = this.GL().LINE_STRIP;
    }
}

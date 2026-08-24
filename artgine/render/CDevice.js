import { CAlert } from "../basic/CAlert.js";
import { CConsol } from "../basic/CConsol.js";
import { CUtil } from "../basic/CUtil.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CRenderPass } from "./CRenderPass.js";
var g_property = new Map();
export class CDevice {
    mDrawType = -1;
    mViewportArr = [0, 0, 0, 0];
    mDepthVal = 0.0;
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
        this.mStaticRP.mLine = CRenderPass.eLine.TRIANGLES;
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
    SetLine(_type) { }
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
        Sam2DSize: 7,
        FloatTex16: 10,
        FloatTex32: 11,
        ClipControl: 12,
    };
    async BenchmarkScore() { return null; }
}
export class CDeviceGL extends CDevice {
    mGL;
    mKHR_parallel_shader_compile = 0;
    constructor(_pf, _handle) {
        super(_pf, _handle);
        this.mGL = _handle.getContext("webgl2", { antialias: this.m_pf.mAnti, depth: true, stencil: true, "xrCompatible": _pf.mXR,
            "premultipliedAlpha": false, "alpha": true });
        if (window["WebGLDebugUtils"] != null) {
            this.mGL = window["WebGLDebugUtils"].makeDebugContext(this.mGL, function (err, funcName, args) {
                console.error(`🚨 WebGL error: ${window["WebGLDebugUtils"].glEnumToString(err)} in ${funcName}`, args);
                debugger;
            });
        }
        if (!this.mGL) {
            CAlert.E("초기화 실패.(하드웨어 가속을 켜주세요!");
            return;
        }
        this.mDrawType = this.GL().TRIANGLES;
        let ext = this.GL().getExtension('EXT_color_buffer_float');
        if (ext != null)
            g_property.set(CDevice.eProperty.FloatTex32, 1);
        else {
            g_property.set(CDevice.eProperty.FloatTex32, 0);
            {
                CAlert.W("no EXT_color_buffer_float");
            }
        }
        ext = this.GL().getExtension('EXT_color_buffer_half_float');
        if (ext != null)
            g_property.set(CDevice.eProperty.FloatTex16, 1);
        else {
            g_property.set(CDevice.eProperty.FloatTex16, 0);
            {
                CAlert.W("no EXT_color_buffer_half_float");
            }
        }
        if (CUtil.IsSafari())
            this.m_pf.mTexture16f = true;
        ext = this.GL().getExtension('EXT_clip_control');
        if (ext != null) {
            g_property.set(CDevice.eProperty.ClipControl, 1);
            ext.clipControlEXT(ext.LOWER_LEFT_EXT, ext.ZERO_TO_ONE_EXT);
        }
        else {
            g_property.set(CDevice.eProperty.ClipControl, 0);
            CAlert.W("no EXT_clip_control");
        }
        ext = this.GL().getExtension('OES_texture_float_linear');
        if (ext == null) {
            CAlert.W("no OES_texture_float_linear");
            this.m_pf.mTexture16f = true;
        }
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
        g_property.set(CDevice.eProperty.Sam2DMax, 11);
        g_property.set(CDevice.eProperty.Sam2DArrMax, 3);
        g_property.set(CDevice.eProperty.SamCubeMax, 2);
        g_property.set(CDevice.eProperty.Sam2dArrLayerMax, TexLay);
        g_property.set(CDevice.eProperty.VertexUniform, 1024);
        g_property.set(CDevice.eProperty.PixelUniform, 1024);
        g_property.set(CDevice.eProperty.Sam2DSize, 2048);
        this.mStaticRP.mCullFace = CRenderPass.eCull.CCW;
        CConsol.Log(`MAX_VERTEX_UNIFORM_VECTORS : ${max_v_uniforms} MAX_FRAGMENT_UNIFORM_VECTORS : ${max_f_uniforms} 
			MAX_TEXTURE_IMAGE_UNITS : ${texture_units} MAX_ARRAY_TEXTURE_LAYERS : ${TexLay} MAX_TEXTURE_SIZE : ${TexSize}`);
    }
    async Init() {
        this.GL().frontFace(this.GL().CCW);
        this.GL().enable(this.GL().CULL_FACE);
        this.GL().enable(this.GL().DEPTH_TEST);
        this.GL().depthFunc(this.GL().GEQUAL);
        this.GL().enable(this.GL().BLEND);
        this.GL().blendEquationSeparate(this.GL().FUNC_ADD, this.GL().FUNC_ADD);
        this.GL().blendFuncSeparate(this.GL().SRC_ALPHA, this.GL().ONE_MINUS_SRC_ALPHA, this.GL().ONE, this.GL().ONE_MINUS_SRC_ALPHA);
        this.GL().depthMask(true);
        this.GL().canvas.width = this.m_pf.mWidth;
        this.GL().canvas.height = this.m_pf.mHeight;
        this.GL().viewport(0, 0, this.GL().canvas.width, this.GL().canvas.height);
        this.GL().clearColor(0, 0, 0, 1);
        this.GL().clear(this.GL().COLOR_BUFFER_BIT | this.GL().DEPTH_BUFFER_BIT);
        this.GL().pixelStorei(this.GL().UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    }
    GetHandle() {
        return this.mGL;
    }
    GL() {
        return this.mGL;
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
            this.GL().depthFunc(this.GL().GEQUAL);
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
    SetLine(_type) {
        this.mStaticRP.mLine = _type;
        if (_type == null)
            this.mDrawType = this.GL().TRIANGLES;
        else
            this.mDrawType = _type;
    }
    _BenchMakeProgram(_vs, _fs) {
        const gl = this.GL();
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, _vs);
        gl.compileShader(vs);
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, _fs);
        gl.compileShader(fs);
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        return prog;
    }
    _syncBuf = new Uint8Array(4);
    _BenchRun(_draws, _runs, _drawFn) {
        const gl = this.GL();
        for (let i = 0; i < 10; i++)
            _drawFn();
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this._syncBuf);
        let best = Infinity;
        for (let r = 0; r < _runs; r++) {
            const t0 = performance.now();
            for (let i = 0; i < _draws; i++)
                _drawFn();
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this._syncBuf);
            const ms = performance.now() - t0;
            if (ms < best)
                best = ms;
        }
        return Math.max(best, 0.1);
    }
    async BenchmarkScore() {
        const gl = this.GL();
        const prevW = gl.canvas.width;
        const prevH = gl.canvas.height;
        const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
        const quadVS = `attribute vec2 p; void main(){ gl_Position=vec4(p,0.0,1.0); }`;
        gl.canvas.width = 2048;
        gl.canvas.height = 2048;
        gl.viewport(0, 0, 2048, 2048);
        const aluProg = this._BenchMakeProgram(quadVS, `
			precision highp float;
			uniform float t;
			void main(){
				vec2 uv=gl_FragCoord.xy/2048.0;
				vec3 c=vec3(0.0);
				for(int i=0;i<256;i++){
					float f=float(i)*0.049+t;
					c+=vec3(sin(uv.x*f+t),cos(uv.y*f-t),sin(f*uv.x*uv.y));
				}
				gl_FragColor=vec4(c/256.0*0.5+0.5,1.0);
			}
		`);
        gl.useProgram(aluProg);
        const aluP = gl.getAttribLocation(aluProg, 'p');
        gl.enableVertexAttribArray(aluP);
        gl.vertexAttribPointer(aluP, 2, gl.FLOAT, false, 0, 0);
        const aluT = gl.getUniformLocation(aluProg, 't');
        let t = 0;
        const aluMs = this._BenchRun(20, 5, () => { gl.uniform1f(aluT, t += 0.01); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); });
        gl.canvas.width = 2048;
        gl.canvas.height = 2048;
        gl.viewport(0, 0, 2048, 2048);
        const fillProg = this._BenchMakeProgram(quadVS, `
			precision mediump float;
			uniform float t;
			void main(){ gl_FragColor=vec4(0.5+t*0.0001,0.5,0.5,0.02); }
		`);
        gl.useProgram(fillProg);
        const fillP = gl.getAttribLocation(fillProg, 'p');
        gl.enableVertexAttribArray(fillP);
        gl.vertexAttribPointer(fillP, 2, gl.FLOAT, false, 0, 0);
        const fillT = gl.getUniformLocation(fillProg, 't');
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        const fillMs = this._BenchRun(10, 5, () => {
            gl.uniform1f(fillT, t += 0.01);
            for (let i = 0; i < 128; i++)
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        });
        gl.disable(gl.BLEND);
        gl.canvas.width = 512;
        gl.canvas.height = 512;
        gl.viewport(0, 0, 512, 512);
        const VTXN = 524288;
        const geoVS = `
			attribute float idx;
			uniform float t;
			void main(){
				float a=idx*6.2831853*7.3+t;
				float r=fract(idx*0.618)*0.95;
				gl_Position=vec4(cos(a)*r,sin(a)*r,0.0,1.0);
				gl_PointSize=1.0;
			}
		`;
        const geoProg = this._BenchMakeProgram(geoVS, `precision lowp float; void main(){ gl_FragColor=vec4(1.0); }`);
        const geoBuf = gl.createBuffer();
        const idxArr = new Float32Array(VTXN);
        for (let i = 0; i < VTXN; i++)
            idxArr[i] = i / VTXN;
        gl.bindBuffer(gl.ARRAY_BUFFER, geoBuf);
        gl.bufferData(gl.ARRAY_BUFFER, idxArr, gl.STATIC_DRAW);
        gl.useProgram(geoProg);
        const geoP = gl.getAttribLocation(geoProg, 'idx');
        gl.enableVertexAttribArray(geoP);
        gl.vertexAttribPointer(geoP, 1, gl.FLOAT, false, 0, 0);
        const geoT = gl.getUniformLocation(geoProg, 't');
        const geoMs = this._BenchRun(50, 5, () => { gl.uniform1f(geoT, t += 0.01); gl.drawArrays(gl.POINTS, 0, VTXN); });
        const score = Math.round(10000 / (aluMs * 0.4 + fillMs * 0.35 + geoMs * 0.25));
        CAlert.W(`BenchmarkScore: ${score}  ALU:${aluMs.toFixed(0)}ms  FILL:${fillMs.toFixed(0)}ms  GEO:${geoMs.toFixed(0)}ms`);
        gl.disableVertexAttribArray(aluP);
        gl.disableVertexAttribArray(fillP);
        gl.disableVertexAttribArray(geoP);
        gl.deleteBuffer(buf);
        gl.deleteBuffer(geoBuf);
        gl.deleteProgram(aluProg);
        gl.deleteProgram(fillProg);
        gl.deleteProgram(geoProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.useProgram(null);
        gl.canvas.width = prevW;
        gl.canvas.height = prevH;
        gl.viewport(0, 0, prevW, prevH);
        return score;
    }
}
export class CDeviceGPU extends CDevice {
    mAdapter = null;
    mDevice = null;
    mHandle = null;
    mContext = null;
    mCanvasFormat = "bgra8unorm";
    mDepthTexture = null;
    mDepthFormat = "depth24plus";
    mClipFlip = false;
    mEncoder = null;
    mPass = null;
    constructor(_pf, _handle) {
        super(_pf, _handle);
        this.mHandle = _handle;
        g_property.set(CDevice.eProperty.Sam2DMax, 11);
        g_property.set(CDevice.eProperty.Sam2DArrMax, 3);
        g_property.set(CDevice.eProperty.SamCubeMax, 2);
        g_property.set(CDevice.eProperty.Sam2dArrLayerMax, 256);
        g_property.set(CDevice.eProperty.VertexUniform, 1024);
        g_property.set(CDevice.eProperty.PixelUniform, 1024);
        g_property.set(CDevice.eProperty.Sam2DSize, 2048);
        g_property.set(CDevice.eProperty.FloatTex16, 1);
        g_property.set(CDevice.eProperty.FloatTex32, 1);
        g_property.set(CDevice.eProperty.ClipControl, 1);
        this.mStaticRP.mDepthTest = true;
        this.mStaticRP.mDepthWrite = true;
        this.mStaticRP.mAlpha = true;
        this.mStaticRP.mCullFace = CRenderPass.eCull.CCW;
        this.mStaticRP.mLine = CRenderPass.eLine.TRIANGLES;
    }
    async Init() {
        if (navigator.gpu == null) {
            CAlert.E("WebGPU 를 지원하지 않는 환경입니다.");
            return;
        }
        this.mAdapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
        if (this.mAdapter == null) {
            CAlert.E("WebGPU 어댑터를 얻지 못했습니다.");
            return;
        }
        const feat = [];
        if (this.mAdapter.features.has("float32-filterable"))
            feat.push("float32-filterable");
        else
            CAlert.W("float32-filterable 미지원. 유니폼 텍스처 경로가 제한됩니다");
        if (this.mAdapter.features.has("float32-blendable"))
            feat.push("float32-blendable");
        else
            CAlert.W("float32-blendable 미지원. RGBA32F 타겟 블렌딩이 제한됩니다");
        this.mDevice = await this.mAdapter.requestDevice({ requiredFeatures: feat,
            requiredLimits: { maxColorAttachmentBytesPerSample: this.mAdapter.limits.maxColorAttachmentBytesPerSample } });
        this.mDevice.lost.then((_info) => { CAlert.E("WebGPU 디바이스를 잃었습니다: " + _info.message); });
        this.mDevice.addEventListener("uncapturederror", (_e) => {
            CAlert.E("WebGPU: " + (_e.error != null ? _e.error.message : _e));
        });
        this.mContext = this.mHandle.getContext("webgpu");
        this.mCanvasFormat = navigator.gpu.getPreferredCanvasFormat();
        this.mContext.configure({
            device: this.mDevice,
            format: this.mCanvasFormat,
            alphaMode: "premultiplied",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        });
        this.mDepthFormat = "depth32float";
        this.mHandle.width = this.m_pf.mWidth;
        this.mHandle.height = this.m_pf.mHeight;
        this.ResizeDepth();
        this.mDepthVal = 0.0;
    }
    GetHandle() { return this.mHandle; }
    GPU() { return this.mDevice; }
    GetCanvasFormat() { return this.mCanvasFormat; }
    GetDepthFormat() { return this.mDepthFormat; }
    GetEncoder() { return this.mEncoder; }
    GetPass() { return this.mPass; }
    DrawType() { return this.mStaticRP.mLine; }
    ResizeDepth() {
        if (this.mDevice == null || this.mHandle == null)
            return;
        const w = Math.max(1, this.mHandle.width);
        const h = Math.max(1, this.mHandle.height);
        if (this.mDepthTexture != null) {
            if (this.mDepthTexture.width == w && this.mDepthTexture.height == h)
                return;
            this.mDepthTexture.destroy();
        }
        this.mDepthTexture = this.mDevice.createTexture({
            size: [w, h],
            format: this.mDepthFormat,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }
    SetAlpha(_enable) { this.mStaticRP.mAlpha = _enable; }
    SetCullFace(_enable) { this.mStaticRP.mCullFace = _enable; }
    SetDepthWrite(_enable) { this.mStaticRP.mDepthWrite = _enable; }
    SetDepthTest(_enable) { this.mStaticRP.mDepthTest = _enable; }
    SetLine(_type) { this.mStaticRP.mLine = _type; }
    SetBlend(_data) {
        for (var i = 0; i < _data.length; ++i)
            this.mStaticRP.mBlend[i] = _data[i];
    }
    ViewPort(_x, _y, _w, _h) {
        if (this.mViewportArr[0] == _x && this.mViewportArr[1] == _y &&
            this.mViewportArr[2] == _w && this.mViewportArr[3] == _h)
            return;
        this.mViewportArr[0] = _x;
        this.mViewportArr[1] = _y;
        this.mViewportArr[2] = _w;
        this.mViewportArr[3] = _h;
        if (this.mPass != null)
            this.mPass.setViewport(_x, _y, _w, _h, 0, 1);
    }
    static BlendOp(_v) {
        switch (_v) {
            case CRenderPass.eBlend.FUNC_SUBTRACT: return "subtract";
            case CRenderPass.eBlend.FUNC_REVERSE_SUBTRACT: return "reverse-subtract";
            case CRenderPass.eBlend.FUNC_MIN: return "min";
            case CRenderPass.eBlend.FUNC_MAX: return "max";
        }
        return "add";
    }
    static BlendFactor(_v) {
        switch (_v) {
            case CRenderPass.eBlend.ZERO: return "zero";
            case CRenderPass.eBlend.ONE: return "one";
            case CRenderPass.eBlend.SRC_COLOR: return "src";
            case CRenderPass.eBlend.ONE_MINUS_SRC_COLOR: return "one-minus-src";
            case CRenderPass.eBlend.DST_COLOR: return "dst";
            case CRenderPass.eBlend.ONE_MINUS_DST_COLOR: return "one-minus-dst";
            case CRenderPass.eBlend.SRC_ALPHA: return "src-alpha";
            case CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA: return "one-minus-src-alpha";
            case CRenderPass.eBlend.DST_ALPHA: return "dst-alpha";
            case CRenderPass.eBlend.ONE_MINUS_DST_ALPHA: return "one-minus-dst-alpha";
            case CRenderPass.eBlend.CONSTANT_COLOR:
            case CRenderPass.eBlend.CONSTANT_ALPHA: return "constant";
            case CRenderPass.eBlend.ONE_MINUS_CONSTANT_COLOR:
            case CRenderPass.eBlend.ONE_MINUS_CONSTANT_ALPHA: return "one-minus-constant";
            case CRenderPass.eBlend.SRC_ALPHA_SATURATE: return "src-alpha-saturated";
        }
        return "one";
    }
    GetPrimitiveState(_rp = null) {
        const rp = _rp != null ? _rp : this.mStaticRP;
        const st = {
            topology: "triangle-list",
            frontFace: "ccw",
            cullMode: "back",
        };
        if (rp.mLine == CRenderPass.eLine.LINE_STRIP)
            st.topology = "line-strip";
        else if (rp.mLine == CRenderPass.eLine.LINE_LOOP)
            st.topology = "line-list";
        if (rp.mCullFace == CRenderPass.eCull.None)
            st.cullMode = "none";
        else if (rp.mCullFace == CRenderPass.eCull.CW)
            st.frontFace = "cw";
        if (this.mClipFlip)
            st.frontFace = (st.frontFace == "cw") ? "ccw" : "cw";
        if (st.topology == "line-strip")
            st.stripIndexFormat = "uint32";
        if (st.topology != "triangle-list")
            st.cullMode = "none";
        return st;
    }
    GetDepthStencilState(_rp = null) {
        const rp = _rp != null ? _rp : this.mStaticRP;
        const st = {
            format: this.mDepthFormat,
            depthWriteEnabled: rp.mDepthWrite != false,
            depthCompare: (rp.mDepthTest == false) ? "always" : "greater-equal",
        };
        return st;
    }
    GetBlendState(_rp = null) {
        const rp = _rp != null ? _rp : this.mStaticRP;
        const b = rp.mBlend;
        return {
            color: {
                operation: CDeviceGPU.BlendOp(b[0]),
                srcFactor: CDeviceGPU.BlendFactor(b[2]),
                dstFactor: CDeviceGPU.BlendFactor(b[3]),
            },
            alpha: {
                operation: CDeviceGPU.BlendOp(b[1]),
                srcFactor: CDeviceGPU.BlendFactor(b[4]),
                dstFactor: CDeviceGPU.BlendFactor(b[5]),
            },
        };
    }
    GetColorTarget(_format = null, _rp = null) {
        const rp = _rp != null ? _rp : this.mStaticRP;
        const t = { format: _format != null ? _format : this.mCanvasFormat };
        if (rp.mAlpha != false)
            t.blend = this.GetBlendState(rp);
        return t;
    }
    RPHash(_rp = null) {
        const rp = _rp != null ? _rp : this.mStaticRP;
        return (rp.mLine) + "|" + (rp.mCullFace) + "|" + (rp.mDepthTest != false ? 1 : 0) + "|" +
            (rp.mDepthWrite != false ? 1 : 0) + "|" + (rp.mAlpha != false ? 1 : 0) + "|" + rp.mBlend.join(",") +
            "|" + (this.mClipFlip ? 1 : 0);
    }
    BeginFrame() {
        this.ResizeDepth();
        this.mEncoder = this.mDevice.createCommandEncoder();
    }
    BeginPass(_view = null, _depth = null, _clear = true) {
        if (this.mEncoder == null)
            this.BeginFrame();
        if (this.mPass != null)
            this.EndPass();
        const views = (_view == null) ? [this.mContext.getCurrentTexture().createView()]
            : (Array.isArray(_view) ? _view : [_view]);
        const depth = _depth != null ? _depth : this.mDepthTexture.createView();
        const color = views.map((v) => ({
            view: v,
            clearValue: [this.mColorVal.x, this.mColorVal.y, this.mColorVal.z, this.mColorVal.w],
            loadOp: (this.mClearColor && _clear) ? "clear" : "load",
            storeOp: "store",
        }));
        const ds = {
            view: depth,
            depthClearValue: this.mDepthVal,
            depthLoadOp: (this.mClearDepth && _clear) ? "clear" : "load",
            depthStoreOp: "store",
        };
        this.mPass = this.mEncoder.beginRenderPass({ colorAttachments: color, depthStencilAttachment: ds });
        return this.mPass;
    }
    EndPass() {
        if (this.mPass == null)
            return;
        this.mPass.end();
        this.mPass = null;
    }
    EndFrame() {
        this.EndPass();
        if (this.mEncoder == null)
            return;
        this.mDevice.queue.submit([this.mEncoder.finish()]);
        this.mEncoder = null;
    }
    _BenchMakePipeline(_vs, _fs, _topology, _blend) {
        const d = this.mDevice;
        const mod = d.createShaderModule({ code: _vs + "\n" + _fs });
        const target = { format: "rgba8unorm" };
        if (_blend) {
            target.blend = {
                color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
                alpha: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" }
            };
        }
        return d.createRenderPipeline({ layout: "auto",
            vertex: { module: mod, entryPoint: "vs" },
            fragment: { module: mod, entryPoint: "fs", targets: [target] },
            primitive: { topology: _topology } });
    }
    async _BenchRun(_runs, _recordFn, _view) {
        const d = this.mDevice;
        for (let i = 0; i < 3; i++) {
            const enc = d.createCommandEncoder();
            const p = enc.beginRenderPass({ colorAttachments: [{ view: _view, loadOp: "load", storeOp: "store" }] });
            _recordFn(p);
            p.end();
            d.queue.submit([enc.finish()]);
        }
        await d.queue.onSubmittedWorkDone();
        let best = Infinity;
        for (let r = 0; r < _runs; r++) {
            const t0 = performance.now();
            const enc = d.createCommandEncoder();
            const p = enc.beginRenderPass({ colorAttachments: [{ view: _view, loadOp: "load", storeOp: "store" }] });
            _recordFn(p);
            p.end();
            d.queue.submit([enc.finish()]);
            await d.queue.onSubmittedWorkDone();
            const ms = performance.now() - t0;
            if (ms < best)
                best = ms;
        }
        return Math.max(best, 0.1);
    }
    async BenchmarkScore() {
        const d = this.mDevice;
        if (d == null)
            return null;
        const aluTex = d.createTexture({ size: [2048, 2048], format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT });
        const aluPipe = this._BenchMakePipeline("@vertex fn vs(@builtin(vertex_index) i : u32) -> @builtin(position) vec4f\n{\n" +
            "	var p=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));\n" +
            "	return vec4f(p[i],0.0,1.0);\n}\n", "@group(0) @binding(0) var<uniform> t : f32;\n" +
            "@fragment fn fs(@builtin(position) pos : vec4f) -> @location(0) vec4f\n{\n" +
            "	let uv=pos.xy/2048.0;\n	var c=vec3f(0.0);\n" +
            "	for(var i=0;i<256;i=i+1){\n" +
            "		let f=f32(i)*0.049+t;\n" +
            "		c+=vec3f(sin(uv.x*f+t),cos(uv.y*f-t),sin(f*uv.x*uv.y));\n	}\n" +
            "	return vec4f(c/256.0*0.5+0.5,1.0);\n}\n", "triangle-list", false);
        const aluUni = d.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        d.queue.writeBuffer(aluUni, 0, new Float32Array([0.5]));
        const aluBG = d.createBindGroup({ layout: aluPipe.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: aluUni } }] });
        const aluMs = await this._BenchRun(5, (p) => {
            p.setPipeline(aluPipe);
            p.setBindGroup(0, aluBG);
            for (let i = 0; i < 20; ++i)
                p.draw(3);
        }, aluTex.createView());
        aluTex.destroy();
        aluUni.destroy();
        const fillTex = d.createTexture({ size: [2048, 2048], format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT });
        const fillPipe = this._BenchMakePipeline("@vertex fn vs(@builtin(vertex_index) i : u32) -> @builtin(position) vec4f\n{\n" +
            "	var p=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));\n" +
            "	return vec4f(p[i],0.0,1.0);\n}\n", "@fragment fn fs() -> @location(0) vec4f{	return vec4f(0.5,0.5,0.5,0.02);}\n", "triangle-list", true);
        const fillMs = await this._BenchRun(5, (p) => {
            p.setPipeline(fillPipe);
            for (let i = 0; i < 128; ++i)
                p.draw(3);
        }, fillTex.createView());
        fillTex.destroy();
        const VTXN = 524288;
        const geoTex = d.createTexture({ size: [512, 512], format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT });
        const geoPipe = this._BenchMakePipeline("@vertex fn vs(@builtin(vertex_index) vi : u32) -> @builtin(position) vec4f\n{\n" +
            "	let idx=f32(vi)/" + VTXN.toFixed(1) + ";\n" +
            "	let a=idx*6.2831853*7.3;\n	let r=fract(idx*0.618)*0.95;\n" +
            "	return vec4f(cos(a)*r,sin(a)*r,0.0,1.0);\n}\n", "@fragment fn fs() -> @location(0) vec4f{	return vec4f(1.0);}\n", "point-list", false);
        const geoMs = await this._BenchRun(5, (p) => {
            p.setPipeline(geoPipe);
            p.draw(VTXN);
        }, geoTex.createView());
        geoTex.destroy();
        const score = Math.round(10000 / (aluMs * 0.4 + fillMs * 0.35 + geoMs * 0.25));
        CAlert.W(`BenchmarkScore(GPU): ${score}  ALU:${aluMs.toFixed(0)}ms  FILL:${fillMs.toFixed(0)}ms  GEO:${geoMs.toFixed(0)}ms`);
        return score;
    }
}

import { CEvent } from "../basic/CEvent.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CH5Canvas } from "./CH5Canvas.js";
import { CTexture, CTextureInfo } from "./CTexture.js";
import { CModal } from "../basic/CModal.js";
import { CUtilWeb } from "../util/CUtilWeb.js";
import { CDOM } from "../basic/CDOM.js";
export class CTexUse {
    mSum = 0;
    mSingle = 0;
    mArray = 0;
    mCube = 0;
}
var gRTOff = 0;
export class CRenderer {
    mDev = null;
    mRes = null;
    mPF;
    mShaderInterpret;
    mTexUse = new CTexUse();
    mTexBind = new Array();
    mUniTexLastOff = -1;
    mUniToSam2dArr;
    mUniToSam2dArrKey = "Artgine/uniToSam2dArrKey";
    mMainFrameTex;
    mFrameBufStack = new Array();
    mLastShader = null;
    constructor(_Dev, _sInter, _Res, _PF) {
        this.mDev = _Dev;
        this.mShaderInterpret = _sInter;
        this.mRes = _Res;
        this.mPF = _PF;
        this.mUniToSam2dArr = new CTexture();
        this.mUniToSam2dArr.SetSize(2048, 256);
        this.mUniToSam2dArr.PushInfo([new CTextureInfo(CTexture.eTarget.Array, CTexture.eFormat.RGBA32F, 5)]);
        this.mUniToSam2dArr.SetFilter(CTexture.eFilter.Linear);
        this.mUniToSam2dArr.SetMipMap(CTexture.eMipmap.None);
        this.mUniToSam2dArr.CreateBuf();
        this.mUniToSam2dArr.mReadPixelEvent = new CEvent(this.ReadPixel, this);
        this.BuildTexture(this.mUniToSam2dArr);
        this.mUniToSam2dArr.GetBuf().length = 0;
        this.mRes.Push(this.mUniToSam2dArrKey, this.mUniToSam2dArr);
    }
    SInter() { return this.mShaderInterpret; }
    async BuildH5CMDList(_ch5json) {
        CH5Canvas.Init(_ch5json.mSize.x, _ch5json.mSize.y);
        CH5Canvas.Draw(_ch5json.mCMD);
        let tex = CH5Canvas.GetNewTex();
        this.mRes.Push(_ch5json.mKey + ".tex", tex);
        this.BuildTexture(tex);
        return _ch5json.mKey + ".tex";
    }
    BlitDepth(_read, _draw = null) { }
    BlitColor(_read, _draw = null) { }
    Begin(_tex = null, _surface = false, _rtUse = null, _rtLevel = 0) { return false; }
    End(_tex = null, _rtUse = null, _rtLevel = 0) { }
    GetMainFrameTex() {
        return this.mMainFrameTex;
    }
    async BuildTexture(_tex) {
    }
    ReleaseTexture(pa_tex) {
    }
    ReadPixel(_tex) { }
    BuildRenderTarget(_info = null, _size = null, _key = null) {
        return "";
    }
    RTOrgToSize(_orgW, _orgH) {
        if (_orgW >= 0 && _orgW <= 1 && _orgH >= 0 && _orgH <= 1)
            return new CVec2(Math.trunc(_orgW * this.mPF.mRTScaleW * this.mPF.mWidth), Math.trunc(_orgH * this.mPF.mRTScaleH * this.mPF.mHeight));
        return new CVec2(Math.trunc(_orgW * this.mPF.mRTScaleW), Math.trunc(_orgH * this.mPF.mRTScaleH));
    }
    BuildCubeMap(_texList, _mipmap = true, _key = null) { return null; }
    RebuildTexture(_tex, _xOff, _yOff, _width, _height, _fa, _arrOff = 0) {
    }
    BuildVideo(_video, _key = null) {
        return null;
    }
    RebuildMeshDrawNode(_mesh, _gBufOff, _bufStartOff, _buf) {
    }
    BuildMeshDrawNode(_mesh, _info, _shader) {
    }
    ReleaseMeshDrawNode(_mesh) {
    }
    ShaderComplie(_shader) {
    }
    ComputeSupport() { return false; }
    ComputeDispatch(_shader, _count) { return false; }
    BuildMeshAutoFix(mesh, _drawTree, _shader) { }
    BuildMeshDrawNodeAutoFix(_meshDraw, _shader, _info) { }
    SendGPU(_shader, _value, _keyOff = null, _eachAttach = null, _off = null) { }
    MeshDrawNodeRender(_shader, _mesh, _insCount = 0, _bind = true) { }
    UseShader(_shader) { return false; }
    VertexArrayBind(_shader, _meshDraw) { }
    TexBindReset() { }
    SetTexGBuf(_vf, _tex, _btu, _offset = null, _texAtt = null) { }
    SetTexBindGroup(_shader) { }
    TexUseReset() {
        this.mTexUse.mSum = 0;
        this.mTexUse.mSingle = 0;
        this.mTexUse.mArray = 0;
        this.mTexUse.mCube = 0;
    }
    SetUniToSam2D(_vf, _key, _buf) {
    }
    static ShaderErrorModal(_wgsl, _error) {
        let modal = new CModal();
        modal.SetHeader("Error");
        let id = CUniqueID.Get();
        id += "_div";
        modal.SetTitle(CModal.eTitle.TextClose);
        modal.SetBody("<div style='height:85%;min-height:320px;min-width:640px;'><textarea style='width:100%;height:128px;'>" + _error + "</textarea><div id='" + id + "' style='width:100%;height:100%;'></div></div>");
        modal.SetZIndex(CModal.eSort.Top);
        modal.Open(CModal.ePos.Center);
        modal.Focus(CModal.eAction.Shake);
        CUtilWeb.MonacoEditer(CDOM.ID(id), _wgsl, "wgsl");
    }
}
export class CRendererGL extends CRenderer {
    mXRFrame = null;
    mXREye = -1;
    mXRSize = new CVec2();
    SetUniToSam2D(_vf, _key, _buf) {
    }
    TexBindReset() {
    }
    BlitDepth(_read, _draw = null) {
    }
    BlitColor(_read, _draw = null) {
    }
    Begin(_tex = null, _2d = false, _rtUse = null, _rtLevel = 0) {
        return false;
    }
    End(_tex = null, _rtUse, _rtLevel = 0) {
    }
    GetMainFrameTex() { return this.mMainFrameTex; }
    SetXR(_frame, _eye) {
        this.mXRFrame = _frame;
        this.mXREye = _eye;
    }
    CreateFrameBuffer(_tex, _rtUse, _rtLevel) {
    }
    ModifyFrameBuffer(_tex, _rtUse, _rtLevel) {
    }
    async BuildTexture(pa_tex) {
    }
    ReleaseTexture(pa_tex) {
    }
    ReadPixel(_tex) {
    }
    BuildRenderTarget(_info = null, _size = null, _key = null) {
        return "";
    }
    BuildCubeMap(_texList, _mipmap) {
        return "";
    }
    RebuildTexture(_tex, _xOff, _yOff, _width, _height, _fa, _arrOff = 0) {
    }
    RebuildVideo(_video, _key = null) {
        return "";
    }
    GLBufferSet(_mesh, vfd, _arr, _vnum, _type) {
    }
    RebuildMeshDrawNode(_mesh, _gBufOff, _bufStartOff, _buf) {
    }
    BuildMeshDrawNode(_mesh, _info, _vf) {
    }
    ReleaseMeshDrawNode(_mesh) {
    }
    BuildMeshAutoFix(mesh, _drawTree, _vf) {
    }
    BuildMeshDrawNodeAutoFix(_meshDraw, _vf, _info) {
    }
    ShaderComplie(_shader) {
    }
    SetTexGBuf(_vf, _tex, _btu, _offset = null, _texAtt = null) {
    }
    BindTexture(_tex, _off) {
    }
    SendGPU(_vf, _value, _keyOff = null, _eachAttach = null, _off = null) {
    }
    VertexArrayBind(_vf, _meshDraw) {
    }
    MeshDrawNodeRender(_vf, _mesh, _insCount = 0, _bind = true) {
    }
    UseShader(_vf) {
        return false;
    }
}
export class CRendererGPU extends CRenderer {
    Dev() { return this.mDev; }
    mPipeline = new Map();
    mUniRing = new Array();
    mSlotBG = null;
    mSlotCPU = null;
    mSlotOff = 0;
    mSlotFOff = 0;
    mUniBGEmpty = new Map();
    mUniAlign = 0;
    mDynOff = new Uint32Array(1);
    mShaderTagKey = new Map();
    mLastBindTexGroup = null;
    mDummy2D = null;
    mDummyArr = null;
    mDummyCube = null;
    mSampler = null;
    mSamplerCache = new Map();
    mMipPipe = new Map();
    mPassFlip = new Float32Array([1]);
    mPassSize = new Float32Array(2);
    mTexSlot = new Map();
    mTexSlotVersion = 0;
    mTexViewCache = new WeakMap();
    mTexBGCache = new Map();
    InitGPU() {
    }
    mRTFormat = new Array();
    RTDepth(_tex) {
        return null;
    }
    RTViews(_tex, _rtUse, _rtLevel = 0) {
        return null;
    }
    OpenPass(_tex, _rtUse, _rtLevel = 0, _clear = true) {
    }
    SetPassTarget(_tex, _w, _h) {
    }
    WritePassUni(_shader) {
    }
    UniWrite(_shader, _key, _fa) {
    }
    Begin(_tex = null, _surface = false, _rtUse = null, _rtLevel = 0) {
        return false;
    }
    End(_tex = null, _rtUse = null, _rtLevel = 0) {
    }
    BuildRenderTarget(_info = null, _size = null, _key = null) {
        return "";
    }
    BlitDepth(_read, _draw = null) {
    }
    TexBindReset() {
    }
    BlitColor(_read, _draw = null) {
    }
    ShaderComplie(_shader) {
    }
    async CheckShader(_shader, _vs, _ps) {
    }
    UniCPUReady(_shader) {
    }
    UseShader(_shader) {
        return false;
    }
    SetTexGBuf(_vf, _tex, _btu, _offset = null, _texAtt = null) {
    }
    BuildMeshDrawNode(_mesh, _info, _shader) {
    }
    RebuildMeshDrawNode(_mesh, _gBufOff, _bufStartOff, _buf) {
    }
    ReleaseMeshDrawNode(_mesh) {
    }
    FlipRows(_buf, _rowBytes, _height, _layers = 1) {
        return null;
    }
    async ReadPixel(_tex) {
    }
    BuildCubeMap(_texList, _mipmap = true, _key = null) {
        return "";
    }
    async BuildTexture(_tex) {
    }
    ReleaseTexture(_tex) {
    }
    RebuildTexture(_tex, _xOff, _yOff, _width, _height, _fa, _arrOff = 0) {
    }
    SendGPU(_shader, _value, _keyOff = null, _eachAttach = null, _off = null) {
    }
    mNumFA = new Float32Array(1);
    NumFA(_v) {
        return null;
    }
    VertexLayout(_shader) {
        return null;
    }
    ShaderTagKey(_shader) {
        return "";
    }
    TexLayout(d, _vis) {
        return null;
    }
    BuildLayout(_shader, d) {
        return null;
    }
    GetPipeline(_shader) {
        return null;
    }
    UniSize(_shader) {
        return 0;
    }
    GetUniSlot(_shader) {
        return false;
    }
    UniFlush() {
    }
    GetUniBGEmpty(_shader) {
        return null;
    }
    VertexArrayBind(_shader, _mesh) {
    }
    SetTexBindGroup(_shader) {
    }
    MeshDrawNodeRender(_shader, _mesh, _insCount = 0, _bind = true) {
    }
    ComputeSupport() { return true; }
    mStorage = new WeakMap();
    StorageSlot(_shader) {
        return null;
    }
    StorageWrite(_shader, _uni, _value) {
    }
    BuildComputeLayout(_shader, d) {
        return null;
    }
    ComputeDispatch(_shader, _count) {
        return false;
    }
    SetUniToSam2D(_vf, _key, _buf) {
    }
    GetMipPipeline(_format) {
        return null;
    }
    GenMipmap(_gt, _format, _levels, _layers) {
    }
    GetSampler(_tex) {
        return null;
    }
    TexKind(_target) {
        return "";
    }
    GetTexView(_gt, _dim) {
        return null;
    }
    TexGts(_shader) {
        return null;
    }
    TexEntries(_shader) {
        return null;
    }
    GetTexBindGroup(_shader, _layout) {
        return null;
    }
}
import CRenderer_imple from "../render_imple/CRenderer.js";
CRenderer_imple();

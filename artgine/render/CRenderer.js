import { CAlert } from "../basic/CAlert.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CUtil } from "../basic/CUtil.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CDevice } from "./CDevice.js";
import { CH5Canvas } from "./CH5Canvas.js";
import { CTexture, CTextureInfo } from "./CTexture.js";
import { CModal } from "../basic/CModal.js";
import { CUtilWeb } from "../util/CUtilWeb.js";
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
    mUniToSam2d;
    mUniToSam2dKey = "uniToSam2dKey";
    mUniTexLastOff = -1;
    mMainFrameTex;
    mFrameBufStack = new Array();
    mLastShader = null;
    constructor(_Dev, _sInter, _Res, _PF) {
        this.mDev = _Dev;
        this.mShaderInterpret = _sInter;
        this.mRes = _Res;
        this.mPF = _PF;
        this.mUniToSam2d = new CTexture();
        this.mUniToSam2d.SetSize(CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX), CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX));
        this.mUniToSam2d.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA32F)]);
        this.mUniToSam2d.CreateBuf();
        this.BuildTexture(this.mUniToSam2d);
        this.mRes.Push(this.mUniToSam2dKey, this.mUniToSam2d);
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
    Begin(_tex = null, _2d = false, _rtUse = null, _rtLevel = 0) { return false; }
    End(_tex = null, _rtLevel = 0) { }
    GetMainFrameTex() {
        return this.mMainFrameTex;
    }
    async BuildTexture(_tex) {
    }
    ReleaseTexture(pa_tex) {
    }
    BuildRenderTarget(_info = null, _size = null, _key = null) {
        return "";
    }
    BuildCubeMap(_texList, _mipmap = true) { return null; }
    RebuildTexture(_tex, _active, _xOff, _yOff, _width, _height, _fa) {
    }
    BuildVideo(_video, _key = null) {
        return null;
    }
    RebuildMeshDrawNode(_mesh, _gBufOff, _bufStartOff, _buf) {
    }
    BuildMeshDrawNode(_mesh, _info, _shader) {
    }
    ShaderComplie(_shader) {
    }
    BuildMeshAutoFix(mesh, _drawTree, _shader) { }
    BuildMeshDrawNodeAutoFix(_meshDraw, _shader, _info) { }
    SendGPU(_shader, _value, _keyOff = null, _eachAttach = null, _off = null) { }
    MeshDrawNodeRender(_shader, _mesh, _insCount = 0, _bind = true) { }
    UseShader(_shader) { return false; }
    VertexArrayBind(_shader, _meshDraw) { }
    TexBindReset() { }
    TexUseReset() {
        this.mTexUse.mSum = 0;
        this.mTexUse.mSingle = 0;
        this.mTexUse.mArray = 0;
        this.mTexUse.mCube = 0;
    }
    SetUniToSam2D(_vf, _key, _buf, _count = null) { }
    static ShaderErrorModal(_wgsl, _error) {
        let modal = new CModal();
        modal.SetHeader("Error");
        let id = CUniqueID.Get();
        id += "_div";
        modal.SetTitle(CModal.eTitle.TextClose);
        modal.SetBody("<textarea style='width:480px;height:64px;'>" + _error + "</textarea><div id='" + id + "' style='width:480px;height:640px;'></div>");
        modal.SetZIndex(CModal.eSort.Top);
        modal.Open(CModal.ePos.Center);
        modal.Focus(CModal.eAction.Shake);
        CUtilWeb.MonacoEditer(CUtil.ID(id), _wgsl, "wgsl");
    }
}
export class CRendererGL extends CRenderer {
    mXRFrame = null;
    mXREye = -1;
    mXRSize = new CVec2();
    SetUniToSam2D(_vf, _key, _buf, _count = null) {
        var uniDf = _vf.GetDefault(_key);
        if (uniDf != null || uniDf.mEach == 4 || uniDf.mEach == 16) { }
        else
            CAlert.E("error");
        if (_count == null)
            _count = _buf.length / 4;
        this.mUniTexLastOff = uniDf.mData[0];
        this.RebuildTexture(this.mUniToSam2d, uniDf.mData[0], 0, uniDf.mData[1], _count, 1, _buf);
        if (_buf.length == 0)
            this.SendGPU(_vf, new CVec2(0, 0), _key, null, 0);
        else
            this.SendGPU(_vf, new CVec2(uniDf.mData[0], uniDf.mData[1]), _key, null, 0);
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
    End(_tex = null, _rtLevel = 0) {
    }
    GetMainFrameTex() {
        return this.mMainFrameTex;
    }
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
    RebuildTexture(_tex, _active, _xOff, _yOff, _width, _height, _fa) {
        this.mDev.GL().activeTexture(this.mDev.GL().TEXTURE0 + _active);
        var fmt1 = Number(this.mDev.GL().RGBA);
        var fmt2 = Number(this.mDev.GL().UNSIGNED_BYTE);
        fmt1 = this.mDev.GL().RGBA;
        var info = _tex.GetInfo();
        if (_tex.GetInfo()[0].mFormat == CTexture.eFormat.RGBA32F)
            fmt2 = this.mDev.GL().FLOAT;
        var gBuf = _tex.GetGBuf();
        gBuf = gBuf[0];
        this.mDev.GL().bindTexture(this.mDev.GL().TEXTURE_2D, gBuf);
        this.mDev.GL().texSubImage2D(this.mDev.GL().TEXTURE_2D, 0, _xOff, _yOff, _width, _height, fmt1, fmt2, _fa);
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
import CRenderer_imple from "../render_imple/CRenderer.js";
CRenderer_imple();

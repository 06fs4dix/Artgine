import { CBound } from "../../../geometry/CBound.js";
import { CFloat32Mgr } from "../../../geometry/CFloat32Mgr.js";
import { CMath } from "../../../geometry/CMath.js";
import { CPoolGeo } from "../../../geometry/CPoolGeo.js";
import { CUtilMath } from "../../../geometry/CUtilMath.js";
import { CVec1 } from "../../../geometry/CVec1.js";
import { CVec3 } from "../../../geometry/CVec3.js";
import { CVec4 } from "../../../geometry/CVec4.js";
import { CDevice } from "../../../render/CDevice.js";
import { CH5Canvas } from "../../../render/CH5Canvas.js";
import { CIndexBuffer } from "../../../render/CIndexBuffer.js";
import { CMeshDrawNode } from "../../../render/CMeshDrawNode.js";
import { CRenderPass } from "../../../render/CRenderPass.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { CTexture } from "../../../render/CTexture.js";
import { CUtilRender } from "../../../render/CUtilRender.js";
import { CPaint } from "./CPaint.js";
export class CPaintTrail extends CPaint {
    mOut;
    mPosList;
    mNorList;
    mVList;
    mPCnt;
    mTCnt;
    mCorner = null;
    mLastVec = null;
    mInCurve = false;
    mIsEdge = true;
    mEdgeCount = 10;
    mLastLinePos = 0;
    mLastLinelen = 0;
    mBlen = 0;
    mFlen = 0;
    mBCnt = 0;
    mUVTimeLen = false;
    mSumTime = 0;
    mNormal = null;
    mLen = 100;
    mEGFar = 1;
    mStartTime = 1000 * 60 * 60;
    mEndTime = 1000;
    mLastHide = true;
    mLastSmall = false;
    mTexCodi = new CVec4(1, 1, 0, 0);
    mStaticPos = false;
    mRepeat = false;
    mVCount = 32;
    static eCanTex = {
        None: 0,
        Line: 1,
        Arrow: 2,
    };
    mCanTex = CPaintTrail.eCanTex.None;
    mCanTexOption = null;
    constructor(_tex = "", _vertexCount = 32) {
        super();
        this.mTexture.push(_tex);
        this.mOut = new CFloat32Mgr();
        this.mPosList = new Array();
        this.mNorList = new Array();
        this.mVList = new Array();
        this.mPCnt = new Array();
        this.mTCnt = new Array();
        var count = CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX) / 2;
        if (_vertexCount > count)
            this.mVCount = count;
        else
            this.mVCount = _vertexCount;
        this.mOut.Resize(2 * this.mVCount * 4);
        this.PushTag("trail");
    }
    SetLen(_len) {
        this.mLen = _len;
    }
    Line(_width = 8, _dash = 4) {
        this.mCanTex = CPaintTrail.eCanTex.Line;
        this.mCanTexOption = [_width, _dash];
        this.mRepeat = true;
    }
    Arrow(_width = 8) {
        this.mCanTex = CPaintTrail.eCanTex.Arrow;
        this.mRepeat = true;
    }
    InitPaint() {
        super.InitPaint();
        if (this.mCanTex == CPaintTrail.eCanTex.Line) {
            var texKey = this.mCanTexOption[0] + "_" + this.mCanTexOption[0] + "line.tex";
            var tex = this.mOwner.GetFrame().Res().Find(texKey);
            if (tex == null) {
                CH5Canvas.Init(64, 32);
                var cmdArr = new Array();
                cmdArr.push(CH5Canvas.Cmd("strokeStyle", "black"));
                cmdArr.push(CH5Canvas.Cmd("lineWidth", this.mCanTexOption[0]));
                cmdArr.push(CH5Canvas.Cmd("setLineDash", [[this.mCanTexOption[1]]]));
                cmdArr.push(CH5Canvas.Cmd("beginPath", []));
                cmdArr.push(CH5Canvas.Cmd("moveTo", [0, 16]));
                cmdArr.push(CH5Canvas.Cmd("lineTo", [64, 16]));
                cmdArr.push(CH5Canvas.Cmd("stroke", []));
                CH5Canvas.Draw(cmdArr);
                let tex = CH5Canvas.GetNewTex();
                this.mOwner.GetFrame().Ren().BuildTexture(tex);
                this.mOwner.GetFrame().Res().Push(texKey, tex);
                tex.SetWrap(CTexture.eWrap.Repeat);
                tex.SetFilter(CTexture.eFilter.Neaest);
                tex.SetMipMap(false);
            }
            this.mTexture[0] = texKey;
        }
        else if (this.mCanTex == CPaintTrail.eCanTex.Arrow) {
            var texKey = "arrow.tex";
            var tex = this.mOwner.GetFrame().Res().Find(texKey);
            if (tex == null) {
                CH5Canvas.Init(64, 32);
                var cmdArr = new Array();
                cmdArr.push(CH5Canvas.Cmd("strokeStyle", "black"));
                cmdArr.push(CH5Canvas.Cmd("lineWidth", 8));
                cmdArr.push(CH5Canvas.Cmd("beginPath", []));
                cmdArr.push(CH5Canvas.Cmd("moveTo", [0, 16]));
                cmdArr.push(CH5Canvas.Cmd("lineTo", [64, 16]));
                cmdArr.push(CH5Canvas.Cmd("stroke", []));
                cmdArr.push(CH5Canvas.Cmd("lineWidth", 8));
                cmdArr.push(CH5Canvas.Cmd("beginPath", []));
                cmdArr.push(CH5Canvas.Cmd("moveTo", [32 - 16, 0]));
                cmdArr.push(CH5Canvas.Cmd("lineTo", [32 + 16, 16]));
                cmdArr.push(CH5Canvas.Cmd("stroke", []));
                cmdArr.push(CH5Canvas.Cmd("lineWidth", 8));
                cmdArr.push(CH5Canvas.Cmd("beginPath", []));
                cmdArr.push(CH5Canvas.Cmd("moveTo", [32 + 16, 16]));
                cmdArr.push(CH5Canvas.Cmd("lineTo", [32 - 16, 32]));
                cmdArr.push(CH5Canvas.Cmd("stroke", []));
                CH5Canvas.Draw(cmdArr);
                let tex = CH5Canvas.GetNewTex();
                this.mOwner.GetFrame().Ren().BuildTexture(tex);
                this.mOwner.GetFrame().Res().Push(texKey, tex);
            }
            this.mTexture[0] = texKey;
        }
        if (this.mStaticPos == false) {
            var pos = this.mOwner.GetWMat().xyz;
            this.mPosList.push(pos);
        }
        if (this.mNormal != null)
            this.mNorList.push(CMath.V3MulMatNormal(this.mNormal, this.mOwner.GetWMat()));
    }
    EmptyRPChk() {
        if (this.mRenderPass.length == 0) {
            var rp = new CRenderPass(this.mOwner.GetFrame().Pal().Sl2D().mKey);
            this.mRenderPass = [rp];
        }
    }
    GetDrawMesh(_meshKey, _shader) {
        var drawMesh = this.mOwner.GetFrame().Res().Find(this.mVCount + _meshKey + _shader.mKey);
        if (drawMesh == null) {
            drawMesh = new CMeshDrawNode();
            var info = CUtilRender.GetTrail(this.mVCount);
            var indexBuf = new CIndexBuffer();
            indexBuf.CreateBuf16(info.index.length);
            var sho = indexBuf.GetUInt16();
            for (var i = 0; i < info.index.length; ++i) {
                sho[i] = info.index[i];
            }
            this.mOwner.GetFrame().Ren().BuildMeshDrawNode(drawMesh, info, _shader);
            indexBuf.Delete();
            this.mOwner.GetFrame().Res().Push(this.mVCount + _meshKey + _shader.mKey, drawMesh);
        }
        return drawMesh;
    }
    SetEdge(_isEdge = true, _edgeFar = 1, _edgeCount = 10) {
        this.mIsEdge = _isEdge;
        this.mEGFar = _edgeFar;
        this.mEdgeCount = _edgeCount;
    }
    SetUVTimeLen(_isTimeLen = true) {
        this.mUVTimeLen = _isTimeLen;
    }
    Update(_delay) {
        this.Camera();
        super.Update(_delay);
        if (this.mStaticPos) {
            return;
        }
        if (_delay > 1000)
            return;
        var pos = this.mOwner.GetWMat().xyz;
        let size = (this.mLen / 2);
        this.mSumTime += _delay;
        if (this.mStartTime > 0) {
            this.mStartTime -= _delay;
            if (this.mVList.length == 0) {
                if (this.mPosList[this.mPosList.length - 1].Equals(pos) == false) {
                    let nvec = CMath.V3SubV3(pos, this.mPosList[this.mPosList.length - 1]);
                    this.mVList.push(CMath.V3Nor(nvec));
                    this.mPosList.push(pos);
                    this.mPCnt.push(1);
                    this.mTCnt.push(_delay);
                    this.mLastLinelen += CMath.V3Len(CMath.V3SubV3(pos, this.mPosList[this.mPosList.length - 1]));
                    this.mLastVec = CMath.V3Nor(nvec);
                }
                else {
                    this.mSumTime -= _delay;
                }
            }
            else {
                let nvec = CMath.V3SubV3(pos, this.mPosList[this.mPosList.length - 1]);
                let nowvec = CMath.V3Nor(nvec);
                let success = 0;
                if (CMath.V3Dot(nowvec, new CVec3(0, -1, 0)) == 1) {
                    nowvec = this.mVList[this.mVList.length - 1];
                }
                if (this.mInCurve == false) {
                    if (CMath.V3Dot(nowvec, this.mLastVec) > 0.999999) {
                        this.mPosList.push(pos);
                        this.mVList.push(nowvec);
                        this.mPCnt.push(1);
                        this.mTCnt.push(_delay);
                        this.mLastLinelen += CMath.V3Len(nvec);
                        if (this.mLastLinelen > (size * 2) * this.mEGFar) {
                            let delen = CMath.V3Len(CMath.V3SubV3(this.mPosList[this.mLastLinePos + 1], this.mPosList[this.mLastLinePos + 2]));
                            this.mLastLinelen -= delen;
                            this.mPosList.splice(this.mLastLinePos + 1, 1);
                            this.mVList.splice(this.mLastLinePos + 1, 1);
                            this.mPCnt.splice(this.mLastLinePos + 1, 1);
                            this.mPCnt[this.mLastLinePos]++;
                        }
                    }
                    else {
                        if (this.mIsEdge) {
                            this.mBCnt += 2;
                            this.mCorner = this.mPosList[this.mPosList.length - 1];
                            let pArr = new Array();
                            pArr.push(this.mPosList[this.mPosList.length - 2]);
                            pArr.push(this.mCorner);
                            pArr.push(pos);
                            this.mPosList[this.mPosList.length - 1] = (CUtilMath.Bezier(pArr, 1 / this.mBCnt, 0, 0));
                            this.mVList.push(CMath.V3Nor(CMath.V3SubV3(pos, this.mPosList[this.mPosList.length - 1])));
                            this.mPosList.push(pos);
                            this.mPCnt.push(1);
                            this.mTCnt.push(_delay);
                            this.mInCurve = true;
                        }
                        else {
                            let edCnt = this.mEdgeCount;
                            if (edCnt < 2)
                                edCnt = 2;
                            let vArr = new Array();
                            vArr.push(this.mVList[this.mVList.length - 1].Export(), nowvec);
                            for (let i = 0; i < edCnt; i++) {
                                this.mPosList.push(pos);
                                this.mPCnt.push(1);
                                this.mTCnt.push(_delay / edCnt);
                                this.mVList.push((CUtilMath.Bezier(vArr, i / (edCnt - 1), 0, 0)));
                            }
                            this.mLastLinelen = 0;
                            this.mLastLinePos = this.mPosList.length - 2;
                            success = 1;
                        }
                    }
                }
                else if (this.mInCurve == true) {
                    if (this.mBlen >= size * this.mEGFar) {
                        this.mFlen = CMath.V3Len(CMath.V3SubV3(pos, this.mCorner));
                        if (CMath.V3Dot(nowvec, this.mLastVec) < 0.999999)
                            success = 2;
                        if (this.mFlen >= size * this.mEGFar)
                            success = 1;
                        this.mBCnt++;
                    }
                    else if (this.mFlen >= size * this.mEGFar) {
                        while (true) {
                            let blen = CMath.V3Len(CMath.V3SubV3(this.mCorner, this.mPosList[this.mPosList.length - ++this.mBCnt]));
                            if (this.mPosList.length - 1 <= this.mBCnt)
                                success = 2;
                            if (blen >= size * this.mEGFar)
                                success = 1;
                            if (success > 0)
                                break;
                        }
                    }
                    else if (this.mBCnt > 2 && CMath.V3Dot(nowvec, this.mLastVec) < 0.999999) {
                        success = 2;
                    }
                    else {
                        this.mBCnt += 2;
                        if (this.mPosList.length <= this.mBCnt) {
                            this.mBCnt = this.mPosList.length;
                            success = 2;
                        }
                        else {
                            this.mBlen = CMath.V3Len(CMath.V3SubV3(this.mCorner, this.mPosList[this.mPosList.length - this.mBCnt]));
                            this.mFlen = CMath.V3Len(CMath.V3SubV3(pos, this.mCorner));
                        }
                    }
                    let pArr = new Array();
                    pArr.push(this.mPosList[this.mPosList.length - this.mBCnt]);
                    pArr.push(this.mCorner);
                    pArr.push(pos);
                    for (let i = 1; i < this.mBCnt; i++) {
                        this.mPosList[this.mPosList.length - (this.mBCnt - i)] = (CUtilMath.Bezier(pArr, i / (this.mBCnt), 0, 0));
                        this.mVList[this.mVList.length - (this.mBCnt - i)]
                            = CMath.V3Nor(CMath.V3SubV3(this.mPosList[this.mPosList.length - (this.mBCnt - i)], this.mPosList[this.mPosList.length - (this.mBCnt - i + 1)]));
                    }
                    this.mVList.push(CMath.V3Nor(CMath.V3SubV3(pos, this.mPosList[this.mPosList.length - 1])));
                    this.mPosList.push(pos);
                    this.mPCnt.push(1);
                    this.mTCnt.push(_delay);
                    if (success > 0) {
                        this.mInCurve = false;
                        let sumtC = 0;
                        for (let i = 0; i <= this.mBCnt; i++)
                            sumtC += this.mTCnt[this.mTCnt.length - 1 - i];
                        this.mPosList.splice(this.mPosList.length - 1 - this.mBCnt);
                        this.mVList.splice(this.mVList.length - 1 - this.mBCnt);
                        this.mPCnt.splice(this.mPCnt.length - 1 - this.mBCnt);
                        this.mTCnt.splice(this.mTCnt.length - 1 - this.mBCnt);
                        for (let i = 0; i < this.mEdgeCount; i++) {
                            this.mPosList.push(CUtilMath.Bezier(pArr, i / (this.mEdgeCount - 1), 0, 0));
                            this.mVList.push(CMath.V3Nor(CMath.V3SubV3(this.mPosList[this.mPosList.length - 1], this.mPosList[this.mPosList.length - 2])));
                            this.mPCnt.push(1);
                            this.mTCnt.push(sumtC / this.mEdgeCount);
                        }
                        this.mLastLinelen = 0;
                        this.mLastLinePos = this.mPosList.length - 2;
                        this.mVList[this.mVList.length - 1] = nowvec;
                        this.mCorner = null;
                        this.mFlen = 0;
                        this.mBlen = 0;
                        this.mBCnt = 0;
                    }
                }
                if (success > 0) {
                    let vyes = 0;
                    for (let i = 0; i < this.mVList.length - 2; i++) {
                        if (CMath.V3Dot(this.mVList[i], this.mVList[i + 1]) > 0.999999)
                            vyes++;
                        else
                            vyes = 0;
                        if (vyes >= 2) {
                            this.mPosList.splice(i, 1);
                            this.mVList.splice(i, 1);
                            this.mPCnt[i - 1] += this.mPCnt[i];
                            this.mPCnt.splice(i, 1);
                            this.mLastLinePos--;
                            vyes = 0;
                            i -= 2;
                        }
                    }
                }
                this.mLastVec = nowvec;
                if (success == 2)
                    this.mLastVec = CMath.V3Nor(CMath.V3SubV3(pos, this.mPosList[this.mPosList.length - 2]));
            }
        }
        if (this.mSumTime >= this.mEndTime) {
            if (this.mPosList.length > 1) {
                let tm = 0;
                let tmc = -1;
                for (let i = 0; i < this.mTCnt.length; i++) {
                    tm += this.mTCnt[i];
                    if (tm >= this.mSumTime - this.mEndTime) {
                        tmc = i;
                        break;
                    }
                }
                if (tmc > -1) {
                    let deltime = 0;
                    for (let i = 0; i < tmc + 1; i++) {
                        this.mPCnt[0]--;
                        if (this.mPCnt[0] <= 0) {
                            this.mPCnt.splice(0, 1);
                            this.mVList.splice(0, 1);
                            this.mPosList.splice(0, 1);
                            this.mLastLinePos--;
                        }
                        else {
                            let len = CMath.V3Len(CMath.V3SubV3(this.mPosList[0], this.mPosList[1])) / this.mPCnt[0];
                            this.mPosList[0] = CMath.V3AddV3(this.mPosList[0], CMath.V3MulFloat(this.mVList[0], len));
                        }
                        deltime += this.mTCnt[0];
                        this.mTCnt.splice(0, 1);
                    }
                    this.mSumTime -= deltime;
                }
            }
        }
    }
    Camera() {
        var L_nor = null;
        var st = new CVec3(), ed = new CVec3();
        var sto = 0;
        if (this.mPosList.length == 0 || this.mRenPT.length == 0)
            return;
        var t0 = CPoolGeo.ProductV3();
        var t1 = CPoolGeo.ProductV3();
        var texLen = 0;
        this.mBound.Reset();
        this.mBound.SetType(CBound.eType.Box);
        if (this.mStaticPos) {
            for (var i = 0; i < this.mVCount - 1; ++i) {
                var sto = i / this.mVCount;
                st = CUtilMath.WeightVec3(this.mPosList, i / this.mVCount);
                ed = CUtilMath.WeightVec3(this.mPosList, (i + 1) / this.mVCount);
                if (this.mRepeat) {
                    texLen += CMath.V3Distance(st, ed);
                }
                if (this.mNormal == null && this.mRenPT.length != 0) {
                    L_nor = CMath.V3Cross(this.mRenPT[0].mCam.GetView(), CMath.V3Nor(CMath.V3SubV3(st, ed)));
                    L_nor = CMath.V3Nor(L_nor);
                }
                else {
                    if (this.mNormal)
                        L_nor = this.mNormal;
                    else if (this.mNorList.length == 0)
                        L_nor = new CVec3(0, 0, 0);
                    else
                        L_nor = CUtilMath.WeightVec3(this.mNorList, i / this.mVCount);
                }
                var tsize = (this.mLen / 2);
                if (this.mLastSmall)
                    tsize *= sto;
                CMath.V3MulFloat(L_nor, tsize, t0);
                CMath.V3SubV3(st, t0, t1);
                this.mOut.V4(i * 2, t1, sto);
                this.mBound.InitBound(t1);
                CMath.V3MulFloat(L_nor, tsize, t0);
                CMath.V3AddV3(st, t0, t1);
                this.mOut.V4(i * 2 + 1, t1, sto);
                this.mBound.InitBound(t1);
            }
            ed = CUtilMath.WeightVec3(this.mPosList, 1);
            CMath.V3MulFloat(L_nor, tsize, t0);
            CMath.V3SubV3(ed, t0, t1);
            this.mOut.V4((this.mVCount - 1) * 2, t1, sto);
            this.mBound.InitBound(t1);
            CMath.V3MulFloat(L_nor, tsize, t0);
            CMath.V3AddV3(ed, t0, t1);
            this.mOut.V4((this.mVCount - 1) * 2 + 1, t1, sto);
            this.mBound.InitBound(t1);
        }
        else {
            var sumUV = 0;
            var nowUV = 0;
            let tcnt = 0;
            let lenArr = new Array();
            let length = 0;
            if (this.mUVTimeLen == false || this.mPosList.length > this.mVCount) {
                for (let i = 0; i < this.mPosList.length - 1; i++) {
                    let len = CMath.V3Len(CMath.V3SubV3(this.mPosList[i], this.mPosList[i + 1]));
                    lenArr.push(len);
                    length += len;
                }
            }
            for (var i = 0; i < this.mVCount; ++i) {
                var sto = i / this.mVCount;
                if (this.mLastHide == false)
                    sto = 1;
                if (this.mPosList.length > this.mVCount) {
                    st = CUtilMath.WeightVec3(this.mPosList, i / this.mVCount);
                    ed = CUtilMath.WeightVec3(this.mPosList, (i + 1) / this.mVCount);
                    nowUV = (CMath.V3Len(CMath.V3SubV3(ed, st))) / length;
                    sumUV += nowUV;
                }
                else {
                    if (i == 0) {
                        st = this.mPosList[i];
                        sumUV = 0;
                    }
                    else if (this.mPosList.length - 1 <= i) {
                        st = this.mPosList[this.mPosList.length - 1];
                        sumUV = 1;
                    }
                    else {
                        st = this.mPosList[i];
                        if (this.mUVTimeLen) {
                            sumUV += this.mTCnt[tcnt + i - 1] / this.mSumTime;
                            for (let j = 1; j < this.mPCnt[i - 1]; j++) {
                                tcnt++;
                                sumUV += this.mTCnt[tcnt + i - 1] / this.mSumTime;
                            }
                        }
                        else {
                            sumUV += lenArr[i - 1] / length;
                        }
                    }
                }
                if (this.mPosList.length - 1 >= i && this.mVList.length != 0) {
                    var camview = CMath.V3Nor(CMath.V3SubV3(st, this.mRenPT[0].mCam.mEye));
                    if (this.mPosList.length > this.mVCount)
                        L_nor = CMath.V3Cross(camview, CMath.V3Nor(CMath.V3SubV3(ed, st)));
                    else if (i == 0)
                        L_nor = CMath.V3Cross(camview, this.mVList[i]);
                    else if (this.mPosList.length - 1 == i)
                        L_nor = CMath.V3Cross(camview, this.mVList[i - 1]);
                    else
                        L_nor = CMath.V3Cross(camview, this.mVList[i]);
                    L_nor = CMath.V3Nor(L_nor);
                    var tsize = (this.mLen / 2);
                    if (this.mLastSmall)
                        tsize *= sto;
                    CMath.V3MulFloat(L_nor, tsize, t0);
                    CMath.V3SubV3(st, t0, t1);
                    this.mOut.V4(i * 2, t1, sumUV - nowUV);
                    this.mBound.InitBound(t1);
                    CMath.V3MulFloat(L_nor, tsize, t0);
                    CMath.V3AddV3(st, t0, t1);
                    this.mOut.V4(i * 2 + 1, t1, sumUV - nowUV);
                    this.mBound.InitBound(t1);
                }
                else {
                    var vs = this.mOut.V4((this.mPosList.length - 1) * 2 + 0);
                    var ve = this.mOut.V4((this.mPosList.length - 1) * 2 + 1);
                    vs.w = 2;
                    ve.w = 2;
                    this.mOut.V4(i * 2, vs);
                    this.mOut.V4(i * 2 + 1, ve);
                }
            }
        }
        this.mLMat = CMath.MatInvert(this.mOwner.GetWMat());
        CPoolGeo.RecycleV3(t0);
        CPoolGeo.RecycleV3(t1);
        if (this.mRepeat)
            this.mTexCodi.x = texLen / 64;
    }
    SetLastHide(_enabel) {
        this.mLastHide = _enabel;
        this.BatchClear();
    }
    Render(_vf) {
        var barr = this.RenderBatch(_vf, 1);
        if (barr == null)
            return;
        this.mOwner.GetFrame().BMgr().BatchOn();
        super.Common(_vf);
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("texCodi", this.mTexCodi));
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("trailPos", 4, this.mOut.GetArray()));
        if (this.mLastHide)
            this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("lastHide", new CVec1(1.0)));
        else
            this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("lastHide", new CVec1(0.0)));
        this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTexture);
        var dm = this.GetDrawMesh("CPaintTrail", _vf);
        this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);
        barr[0] = this.mOwner.GetFrame().BMgr().BatchOff();
    }
    SetStaticPosList(_array) {
        this.mStaticPos = true;
        this.mPosList = _array;
    }
}

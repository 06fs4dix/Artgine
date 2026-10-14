import { CCanvas } from "../app/canvas/CCanvas.js";
import { CModal } from "../basic/CModal.js";
import { CEvent } from "../basic/CEvent.js";
import { CModalFlex } from "../util/CModalUtil.js";
import { CTexture } from "../render/CTexture.js";
import { CFile } from "../system/CFile.js";
const gRecentMS = 1000;
const gMeasureFrame = 30;
const gPaintRowMax = 300;
const gVFFloat = { 0: 3, 1: 2, 3: 3, 4: 4, 5: 4, 6: 4, 7: 3, 8: 4, 9: 3 };
let gModal = null;
let gBrush = null;
let gRoot = null;
let gTimer = null;
let gGPU = false;
let gLive = false;
let gView = "rp";
let gTab = "detail";
let gSelType = null;
let gSelKey = null;
let gFilter = "";
let gPaintFilter = "";
let gGroup = "none";
let gOnlyShow = false;
let gHideEmpty = true;
let gSort = { mKey: "priority", mDesc: false };
let gPaintSort = { mKey: "cpu", mDesc: true };
let gMetric = { rp: "cpu", paint: "cpu" };
let gCollapse = new Set();
let gRPSnap = new Map();
let gByRP = new Map();
let gByPaint = new Map();
let gPaintStat = new Map();
let gFrame = [];
let gSnapTime = null;
let gSnapLabel = "";
let gFrameCount = 0;
let gPaintID = new WeakMap();
let gPaintIDNext = 0;
let gProfile = null;
class CRQRP {
    mCPUTime = 0;
    mGPUTime = -1;
    mDrawTime = 0;
    mTriTime = 0;
    mCPUAcc = 0;
    mGPUAcc = 0;
    mDrawAcc = 0;
    mTriAcc = 0;
    mRenderCount = 0;
    mProfileAt = 0;
    mCPUSum = 0;
    mCPUStart = 0;
    mDrawSum = 0;
    mTriSum = 0;
    mDrawStart = 0;
    mTriStart = 0;
}
class CRQProfile {
    mBrush;
    mGL;
    mExt;
    mRP = new Map();
    mRPMap = new Map();
    mPaint = new WeakMap();
    mQueryFree = new Array();
    mQueryWait = new Array();
    mQueryOn = false;
    mOpen = false;
    mFrameCount = 0;
    mGPUFrameCount = 0;
    mDrawCall = 0;
    mTriangle = 0;
    mCur = null;
    mCurKey = null;
    mCurBefore = null;
    mDepth = 0;
    mHook = false;
    mActive = false;
    mLive = false;
    mPaintOn = true;
    mFrame = 0;
    mRecord = 0;
    mDrain = 0;
    mDone = null;
    mDrawOrg = null;
    mFinishOrg = null;
    mRenderOrg = new Map();
    constructor(_brush) {
        this.mBrush = _brush;
        this.mGL = _brush.mFrame.Dev().GL();
        this.mExt = this.mGL == null ? null : this.mGL.getExtension("EXT_disjoint_timer_query_webgl2");
    }
    Hook() {
        if (this.mHook)
            return;
        this.mHook = true;
        this.DrawHook();
        const self = this;
        const finish = CCanvas.RenderFinish;
        this.mFinishOrg = finish;
        CCanvas.RenderFinish = function (...a) {
            if (a[0] === self.mBrush)
                self.Commit();
            return finish.apply(this, a);
        };
        const dev = this.mBrush.mFrame.Dev();
        const pass = dev.ChangeRenderPass;
        dev.ChangeRenderPass = (_rp) => {
            if (this.mCur != null) {
                if (_rp === this.mCurBefore) {
                    const r = pass.call(dev, _rp);
                    this.End(this.mCur);
                    this.mCur = null;
                    return r;
                }
                this.End(this.mCur);
                this.mCur = null;
            }
            const r = pass.call(dev, _rp);
            const hit = this.mActive ? this.mRPMap.get(_rp) : null;
            if (hit != null) {
                this.mCurKey = hit[0];
                this.mCur = hit[1];
                this.mCurBefore = r;
                this.Start(hit[1]);
            }
            return r;
        };
        for (const renPri of this.mBrush.mRenPriMap.values())
            for (const list of [renPri.mDistanceList, renPri.mRAlphaList, renPri.mAlphaList])
                for (let i = 0; i < list.Size(); ++i) {
                    const ren = list.Find(i);
                    if (ren?.mPaint != null)
                        this.PaintHook(ren.mPaint);
                }
    }
    Unhook() {
        if (!this.mHook)
            return;
        this.mHook = false;
        this.mCur = null;
        CCanvas.RenderFinish = this.mFinishOrg;
        this.mFinishOrg = null;
        delete this.mBrush.mFrame.Dev().ChangeRenderPass;
        for (const [proto, org] of this.mRenderOrg)
            proto.Render = org;
        this.mRenderOrg.clear();
        const gl = this.mGL;
        if (gl != null)
            for (const name in this.mDrawOrg ?? {})
                gl[name] = this.mDrawOrg[name];
        this.mDrawOrg = null;
    }
    DrawHook() {
        const gl = this.mGL;
        if (gl == null)
            return;
        this.mDrawOrg = {};
        for (const name of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced", "drawRangeElements"]) {
            const fun = gl[name];
            if (typeof fun != "function")
                continue;
            this.mDrawOrg[name] = fun;
            gl[name] = (...a) => {
                const count = name.startsWith("drawArrays") ? a[2] : name == "drawRangeElements" ? a[3] : a[1];
                const inst = name == "drawArraysInstanced" ? a[3] : name == "drawElementsInstanced" ? a[4] : 1;
                const mode = a[0];
                const tri = mode == gl.TRIANGLES ? Math.floor(count / 3) : (mode == gl.TRIANGLE_STRIP || mode == gl.TRIANGLE_FAN) ? Math.max(0, count - 2) : 0;
                this.mDrawCall++;
                this.mTriangle += tri * inst;
                return fun.apply(gl, a);
            };
        }
    }
    PaintHook(_paint) {
        if (!this.mHook)
            return;
        let proto = Object.getPrototypeOf(_paint);
        const self = this;
        while (proto != null && proto !== Object.prototype) {
            if (Object.prototype.hasOwnProperty.call(proto, "Render") && !this.mRenderOrg.has(proto)) {
                const org = proto.Render;
                this.mRenderOrg.set(proto, org);
                proto.Render = function (...a) {
                    if (self.mDepth > 0 || self.mCur == null || !self.mPaintOn)
                        return org.apply(this, a);
                    self.mDepth++;
                    const t = performance.now();
                    try {
                        return org.apply(this, a);
                    }
                    finally {
                        self.mDepth--;
                        self.Paint(this, performance.now() - t);
                    }
                };
            }
            proto = Object.getPrototypeOf(proto);
        }
    }
    SetLive(_live) {
        this.mLive = _live;
        this.mDone = null;
        this.mRecord = 0;
        this.mDrain = 0;
        this.mActive = false;
        this.mOpen = false;
        if (_live)
            this.Hook();
        else
            this.Unhook();
    }
    Measure(_frame, _done) {
        this.Hook();
        for (const rp of this.mRP.values()) {
            rp.mCPUAcc = 0;
            rp.mGPUAcc = 0;
            rp.mDrawAcc = 0;
            rp.mTriAcc = 0;
            rp.mRenderCount = 0;
        }
        this.mPaint = new WeakMap();
        this.mFrameCount = 0;
        this.mGPUFrameCount = 0;
        this.mActive = false;
        this.mOpen = false;
        this.mRecord = _frame;
        this.mDrain = 0;
        this.mDone = _done;
    }
    IsMeasure() {
        return this.mDone != null;
    }
    CPU(_rp) {
        return this.mLive ? _rp.mCPUTime : _rp.mCPUAcc / Math.max(1, this.mFrameCount);
    }
    GPU(_rp) {
        if (this.mLive)
            return _rp.mGPUTime;
        return this.mGPUFrameCount > 0 ? _rp.mGPUAcc / this.mGPUFrameCount : -1;
    }
    Draw(_rp) {
        return this.mLive ? _rp.mDrawTime : _rp.mDrawAcc / Math.max(1, this.mFrameCount);
    }
    Tri(_rp) {
        return this.mLive ? _rp.mTriTime : _rp.mTriAcc / Math.max(1, this.mFrameCount);
    }
    PaintCPU(_ren) {
        const v = this.mPaint.get(_ren);
        if (v == null)
            return 0;
        return this.mLive ? v.mTime : v.mSum / Math.max(1, this.mFrameCount);
    }
    RP(_info) {
        let rp = this.mRP.get(_info);
        if (rp == null) {
            rp = new CRQRP();
            this.mRP.set(_info, rp);
        }
        return rp;
    }
    Release() {
        this.mDone = null;
        this.mActive = false;
        this.Unhook();
        const gl = this.mGL;
        if (gl != null) {
            for (const q of this.mQueryFree)
                gl.deleteQuery(q);
            for (const q of this.mQueryWait)
                gl.deleteQuery(q.mQuery);
        }
        this.mQueryFree.length = 0;
        this.mQueryWait.length = 0;
        this.mRP.clear();
    }
    Commit() {
        this.mFrame++;
        if (this.mOpen) {
            const now = performance.now();
            this.mFrameCount++;
            for (const rp of this.mRP.values()) {
                if (rp.mCPUSum > 0) {
                    rp.mRenderCount++;
                    rp.mProfileAt = now;
                }
                rp.mCPUAcc += rp.mCPUSum;
                rp.mDrawAcc += rp.mDrawSum;
                rp.mTriAcc += rp.mTriSum;
                rp.mCPUTime += (rp.mCPUSum - rp.mCPUTime) * 0.1;
                rp.mDrawTime = rp.mDrawSum;
                rp.mTriTime = rp.mTriSum;
                rp.mCPUSum = 0;
                rp.mDrawSum = 0;
                rp.mTriSum = 0;
            }
            if (!this.mLive && this.mRecord > 0)
                this.mRecord--;
        }
        this.mRPMap.clear();
        for (const [key, info] of this.mBrush.mRenInfoMap)
            if (info.mRP != null)
                this.mRPMap.set(info.mRP, [key, info]);
        if (this.mExt != null && (this.mFrame % 4 == 0 || this.mDrain > 0))
            this.PollGPU();
        if (this.mLive)
            this.mOpen = true;
        else if (this.mRecord > 0)
            this.mOpen = true;
        else if (this.mDone != null) {
            if (this.mOpen)
                this.mDrain = 12;
            this.mOpen = false;
            if (this.mDrain > 0)
                this.mDrain--;
            if (this.mDrain == 0 || this.mQueryWait.length == 0) {
                this.mDrain = 0;
                const done = this.mDone;
                this.mDone = null;
                this.mActive = false;
                this.Unhook();
                done?.();
            }
        }
        this.mActive = this.mOpen;
    }
    PollGPU() {
        const gl = this.mGL;
        const disjoint = gl.getParameter(this.mExt.GPU_DISJOINT_EXT);
        while (this.mQueryWait.length > 0) {
            const frame = this.mQueryWait[0].mFrame;
            let end = 0;
            while (end < this.mQueryWait.length && this.mQueryWait[end].mFrame == frame)
                end++;
            let ready = true;
            for (let i = 0; i < end && ready; ++i)
                ready = gl.getQueryParameter(this.mQueryWait[i].mQuery, gl.QUERY_RESULT_AVAILABLE);
            if (!ready)
                break;
            const sum = new Map();
            for (let i = 0; i < end; ++i) {
                const q = this.mQueryWait[i];
                if (!disjoint)
                    sum.set(q.mRP, (sum.get(q.mRP) ?? 0) + gl.getQueryParameter(q.mQuery, gl.QUERY_RESULT) / 1000000);
                this.mQueryFree.push(q.mQuery);
            }
            this.mQueryWait.splice(0, end);
            if (disjoint)
                continue;
            this.mGPUFrameCount++;
            for (const rp of this.mRP.values()) {
                const s = sum.get(rp) ?? 0;
                rp.mGPUAcc += s;
                rp.mGPUTime = rp.mGPUTime < 0 ? s : rp.mGPUTime + (s - rp.mGPUTime) * 0.1;
            }
        }
    }
    Start(_info) {
        const rp = this.RP(_info);
        rp.mCPUStart = performance.now();
        rp.mDrawStart = this.mDrawCall;
        rp.mTriStart = this.mTriangle;
        if (this.mExt == null)
            return;
        const q = this.mQueryFree.pop() ?? this.mGL.createQuery();
        this.mQueryWait.push({ mQuery: q, mFrame: this.mFrame, mRP: rp });
        this.mGL.beginQuery(this.mExt.TIME_ELAPSED_EXT, q);
        this.mQueryOn = true;
    }
    End(_info) {
        const rp = this.RP(_info);
        rp.mCPUSum += performance.now() - rp.mCPUStart;
        rp.mDrawSum += this.mDrawCall - rp.mDrawStart;
        rp.mTriSum += this.mTriangle - rp.mTriStart;
        if (this.mQueryOn == false)
            return;
        this.mGL.endQuery(this.mExt.TIME_ELAPSED_EXT);
        this.mQueryOn = false;
    }
    Paint(_paint, _ms) {
        const key = this.mCurKey;
        const ren = _paint.mRenPT.find((r) => r.mRenInfoKey === key);
        if (ren == null)
            return;
        let v = this.mPaint.get(ren);
        if (v == null) {
            v = { mTime: _ms, mSum: 0 };
            this.mPaint.set(ren, v);
        }
        v.mSum += _ms;
        v.mTime += (_ms - v.mTime) * 0.1;
    }
}
export function RenderQueTool(_brush) {
    if (gModal != null) {
        const old = gModal;
        Close();
        old.Close();
    }
    gBrush = _brush;
    gProfile = new CRQProfile(gBrush);
    gSelType = null;
    gSelKey = null;
    gLive = false;
    gSnapTime = null;
    gCollapse.clear();
    gGPU = gProfile.mExt != null;
    gMetric.rp = gGPU ? "gpu" : "cpu";
    gModal = new CModalFlex([0.5, 0.5], "RenderOrderModal");
    gModal.mResize = true;
    gModal.SetSize(1500, 860);
    gModal.SetTitle(CModal.eTitle.TextMinFullClose);
    gModal.SetHeader("Render Queue");
    gModal.SetZIndex(CModal.eSort.Manual, CModal.eSort.ZIndexTool);
    const modal = gModal;
    gModal.On(CEvent.eType.Close, () => { if (gModal === modal)
        Close(); });
    gModal.Open();
    const left = gModal.FindFlex(0);
    const right = gModal.FindFlex(1);
    for (const p of [left, right]) {
        p.style.display = "flex";
        p.style.flexDirection = "column";
        p.style.overflow = "hidden";
    }
    gRoot = left.parentElement;
    document.getElementById("rq_style")?.remove();
    const st = document.createElement("style");
    st.id = "rq_style";
    st.textContent = StyleText();
    document.head.appendChild(st);
    const html = Markup(false);
    left.innerHTML = html[0];
    right.innerHTML = html[1];
    BindUI();
    Q("paintOn").onchange = (e) => { gProfile.mPaintOn = e.target.checked; };
    BuildMetricOption();
    gTimer = setInterval(() => { if (gLive)
        Snapshot(); }, 500);
    Measure();
}
function Close() {
    if (gTimer != null)
        clearInterval(gTimer);
    gTimer = null;
    gProfile?.Release();
    gProfile = null;
    gBrush = null;
    gModal = null;
    gRoot = null;
    gRPSnap = new Map();
    gByRP = new Map();
    gByPaint = new Map();
    gPaintStat = new Map();
    gFrame = [];
    gSnapTime = null;
}
function Measure() {
    if (gProfile == null || gProfile.IsMeasure())
        return;
    const profile = gProfile;
    profile.Measure(gMeasureFrame, () => setTimeout(() => { if (gProfile === profile && !gLive)
        Snapshot(); }, 0));
    RenderButton();
}
function PaintID(_paint) {
    let id = gPaintID.get(_paint);
    if (id == null) {
        id = "p" + (gPaintIDNext++);
        gPaintID.set(_paint, id);
    }
    return id;
}
function TexByte(_tex) {
    const w = _tex.GetWidth(), h = _tex.GetHeight();
    let byte = 0;
    for (const info of _tex.GetInfo()) {
        const count = Math.max(1, info.mCount ?? 1);
        const layer = info.mTarget == CTexture.eTarget.Cube ? count * 6 : count;
        byte += w * h * layer * (info.mFormat == CTexture.eFormat.RGBA32F ? 16 : 4);
    }
    if (_tex.GetMipMap() != CTexture.eMipmap.None)
        byte = byte * 4 / 3;
    if (_tex.mDepthBuf != null)
        byte += w * h * 4;
    return byte;
}
function TexInfo(_key, _tex) {
    const info = _tex.GetInfo()[0];
    const target = info?.mTarget == CTexture.eTarget.Cube ? "Cube" : info?.mTarget == CTexture.eTarget.Array ? `Array×${info.mCount}` : "2D";
    const fmt = info?.mFormat == CTexture.eFormat.RGBA32F ? "RGBA32F" : "RGBA8";
    const mip = _tex.GetMipMap() != CTexture.eMipmap.None ? " mip" : "";
    return { mKey: _key, mSize: `${_tex.GetWidth()}×${_tex.GetHeight()}`, mDesc: `${target} ${fmt}${mip}`, mByte: TexByte(_tex) };
}
function GeoByte(_mesh, _shader) {
    let float = 0;
    for (const vf of _shader?.mVF ?? [])
        float += gVFFloat[vf.identifier] ?? 0;
    return _mesh.vNum * float * 4 + _mesh.iNum * 4;
}
function RPProp(_info) {
    const rp = _info.mRP;
    const sec = (_title, _rows) => [_title, _rows.filter(([, v]) => v != null && v !== "").map(([k, v]) => [k, String(v)])];
    const attr = [];
    for (const sa of rp.mShaderAttr ?? [])
        attr.push(["attr", sa.ToLog()]);
    for (const sa of _info.mShader?.mDefault ?? [])
        attr.push(["default", sa.ToLog()]);
    return [
        sec("렌더 설정", [
            ["priority", rp.mPriority], ["cycle", rp.mCycle], ["enable", rp.mEnable?.v],
            ["depthTest", rp.mDepthTest], ["depthWrite", rp.mDepthWrite], ["alpha", rp.mAlpha],
            ["cullFace", rp.mCullFace], ["cullFrustum", rp.mCullFrustum],
            ["clearColor", rp.mClearColor], ["clearDepth", rp.mClearDepth],
            ["blit", rp.mBlitType ? `${rp.mBlitType == 1 ? "depth" : "color"} ← ${rp.mBlitRead}` : null],
        ]),
        sec("대상", [
            ["camera", rp.mCamera || "(기본)"], ["renderTarget", rp.mRenderTarget || "(메인 화면)"],
            ["renderTargetUse", rp.mRenderTargetUse?.size ? Array.from(rp.mRenderTargetUse).join(", ") : null],
            ["renderTargetLevel", rp.mRenderTargetLevel || null],
        ]),
        sec("셰이더", [
            ["shader", _info.mShader?.mKey], ["shaderKey", rp.mShader],
            ["tag", _info.mTag.size ? Array.from(_info.mTag).join(", ") : "-"],
        ]),
        sec("셰이더 속성", attr),
    ];
}
function Snapshot() {
    if (gBrush == null || gRoot == null)
        return;
    const now = performance.now();
    gRPSnap = new Map();
    for (const [key, info] of gBrush.mRenInfoMap) {
        if (info.mRP == null || info.mShader == null)
            continue;
        const p = gProfile.mRP.get(info);
        const recent = p != null && p.mProfileAt > 0 &&
            (gLive ? now - p.mProfileAt < gRecentMS : p.mRenderCount > 0);
        gRPSnap.set(key, {
            mShow: info.mShow, mHas: p != null && p.mProfileAt > 0, mRecent: recent,
            mCPU: p != null ? gProfile.CPU(p) : -1, mGPU: p != null ? gProfile.GPU(p) : -1,
            mDraw: p != null ? gProfile.Draw(p) : 0, mTri: p != null ? gProfile.Tri(p) : 0, mPaint: 0,
            mRender: p?.mRenderCount ?? 0,
            mPriority: info.mRP.mPriority ?? 0, mRT: info.mRP.mRenderTarget || "", mCam: info.mRP.mCamera || "",
            mShader: info.mShader?.mKey ?? "-", mShaderKey: info.mRP.mShader ?? "",
            mTag: Array.from(info.mTag), mProp: RPProp(info),
        });
    }
    gByRP = new Map();
    gByPaint = new Map();
    gFrame = [];
    const paintRef = new Map();
    const sorted = Array.from(gBrush.mRenPriMap.entries()).sort((a, b) => a[0] - b[0]);
    for (const [priority, renPri] of sorted) {
        const lists = [];
        for (const [label, listType, list] of [
            ["Distance", "Distance", renPri.mDistanceList],
            ["Reverse Alpha", "RAlpha", renPri.mRAlphaList],
            ["Alpha", "Alpha", renPri.mAlphaList],
        ]) {
            const fl = Collect(list, priority, listType, paintRef);
            if (fl.mTotal > 0) {
                fl.mLabel = label;
                lists.push(fl);
            }
        }
        gFrame.push([priority, lists]);
    }
    for (const [key, arr] of gByRP) {
        const s = gRPSnap.get(key);
        if (s != null)
            s.mPaint = arr.length;
    }
    gPaintStat = new Map();
    const entryTri = new Map();
    const rpTri = new Map();
    for (const [id, arr] of gByPaint)
        gPaintStat.set(id, BuildPaintStat(arr, paintRef.get(id), entryTri, rpTri));
    for (const [id, arr] of gByPaint) {
        const stat = gPaintStat.get(id);
        for (const e of arr) {
            const s = gRPSnap.get(e.mKey);
            const rt = rpTri.get(e.mKey);
            if (!e.mShow || s == null || !s.mRecent || s.mGPU < 0 || rt == null || rt.mCount === 0)
                continue;
            e.mGPU = s.mGPU * (rt.mTri > 0 ? (entryTri.get(e) ?? 0) / rt.mTri : 1 / rt.mCount);
            stat.mGPU = Math.max(0, stat.mGPU) + e.mGPU;
        }
    }
    gSnapTime = new Date();
    gFrameCount = gProfile.mFrameCount;
    gSnapLabel = `${gSnapTime.toLocaleString()} · ${gLive ? "실시간 이동평균" : `${gFrameCount}프레임 평균`}`;
    Q("time").textContent = gSnapTime.toLocaleTimeString();
    RenderAll();
}
function Collect(_list, _priority, _listType, _paintRef) {
    const fl = { mLabel: "", mTotal: 0, mRow: [] };
    const size = _list.Size();
    let prev = null;
    let row = null;
    for (let i = 0; i < size; ++i) {
        const ren = _list.Find(i);
        if (ren == null || ren.mShow == null)
            break;
        if (ren.mRenInfoKey == null)
            continue;
        fl.mTotal++;
        const e = {
            mKey: ren.mRenInfoKey,
            mPaintID: ren.mPaint != null ? PaintID(ren.mPaint) : "",
            mOwner: ren.mPaint?.GetOwner()?.Key() ?? "-",
            mType: ren.mPaint?.constructor?.name ?? "-",
            mPriority: _priority, mListType: _listType,
            mShow: ren.mShow === 0,
            mCPU: gProfile.PaintCPU(ren),
            mGPU: -1,
        };
        Push(gByRP, e.mKey, e);
        if (ren.mPaint != null) {
            Push(gByPaint, e.mPaintID, e);
            _paintRef.set(e.mPaintID, ren.mPaint);
            gProfile.PaintHook(ren.mPaint);
        }
        if (prev != null && prev.mKey === e.mKey && prev.mShow === e.mShow && prev.mType === e.mType) {
            row.mCount++;
        }
        else {
            row = { mKey: e.mKey, mShow: e.mShow, mOwner: e.mOwner, mType: e.mType, mCount: 1 };
            fl.mRow.push(row);
        }
        prev = e;
    }
    return fl;
}
function Push(_map, _key, _e) {
    let arr = _map.get(_key);
    if (arr == null) {
        arr = [];
        _map.set(_key, arr);
    }
    arr.push(_e);
}
function BuildPaintStat(_arr, _paint, _entryTri, _rpTri) {
    const stat = {
        mOwner: _arr[0].mOwner, mType: _arr[0].mType, mRP: _arr.length, mDraw: 0, mTri: 0, mVert: 0, mCPU: 0, mGPU: -1,
        mGeoByte: 0, mTexByte: 0, mMesh: [], mTex: [],
    };
    const mesh = new Set();
    const tex = new Set();
    const pushTex = (_key) => {
        if (!_key || tex.has(_key))
            return;
        tex.add(_key);
        const t = gBrush.mFrame.Res().Find(_key);
        if (t instanceof CTexture)
            stat.mTex.push(TexInfo(_key, t));
    };
    for (const e of _arr) {
        stat.mCPU += e.mCPU;
        if (!e.mShow)
            continue;
        const shader = gBrush.mRenInfoMap.get(e.mKey)?.mShader;
        const barr = shader != null ? _paint.mBatchMap.get(shader) : null;
        let tri = 0;
        for (const b of barr ?? []) {
            if (b == null || b.mMesh == null)
                continue;
            const m = b.mMesh;
            const t = Math.floor((m.iNum > 0 ? m.iNum : m.vNum) / 3);
            tri += t;
            stat.mDraw++;
            stat.mVert += m.vNum;
            if (!mesh.has(m)) {
                mesh.add(m);
                stat.mMesh.push({ mKey: m.Key(), mVert: m.vNum, mIndex: m.iNum, mTri: t, mByte: GeoByte(m, shader) });
            }
            for (const k of b.mTextureKey)
                pushTex(k);
        }
        stat.mTri += tri;
        _entryTri.set(e, tri);
        const rt = _rpTri.get(e.mKey) ?? { mTri: 0, mCount: 0 };
        rt.mTri += tri;
        rt.mCount++;
        _rpTri.set(e.mKey, rt);
    }
    for (const k of _paint.GetTexture() ?? [])
        pushTex(k);
    stat.mTex.sort((a, b) => b.mByte - a.mByte);
    for (const m of stat.mMesh)
        stat.mGeoByte += m.mByte;
    for (const t of stat.mTex)
        stat.mTexByte += t.mByte;
    return stat;
}
const gViewFun = [
    Q, Esc, MS, GPUText, FPS, Num, Byte, Hue, Heat, SortHead, ToggleSort, Card, PropTable,
    BindUI, BuildMetricOption, RenderButton, RenderAll, RenderSummary, RPValue, PaintValue, MetricText, RenderGraph,
    MatchRP, RPSortValue, RPGroup, RenderList, ListRP, PaintSortValue, ListPaint,
    RenderDetail, DetailRP, RPPaintTable, DetailPaint, RenderFrame, OnClick, Select,
];
function Export() {
    if (gSnapTime == null)
        return;
    const data = {
        gpu: gGPU, live: gLive, label: gSnapLabel, frameCount: gFrameCount,
        view: gView, tab: gTab, selType: gSelType, selKey: gSelKey, group: gGroup,
        sort: gSort, paintSort: gPaintSort, metric: gMetric,
        rp: Array.from(gRPSnap.entries()), byRP: Array.from(gByRP.entries()), byPaint: Array.from(gByPaint.entries()),
        paint: Array.from(gPaintStat.entries()), frame: gFrame,
    };
    const json = JSON.stringify(data).replace(/</g, "\\u003c");
    const html = Markup(true);
    const script = `
const D = ${json};
let gRoot = document.getElementById("rq");
let gProfile = null, gSnapTime = true;
let gGPU = D.gpu, gLive = D.live, gSnapLabel = D.label, gFrameCount = D.frameCount;
let gView = D.view, gTab = D.tab, gSelType = D.selType, gSelKey = D.selKey, gGroup = D.group;
let gFilter = "", gPaintFilter = "", gOnlyShow = false, gHideEmpty = true;
let gSort = D.sort, gPaintSort = D.paintSort, gMetric = D.metric, gCollapse = new Set();
let gRPSnap = new Map(D.rp), gByRP = new Map(D.byRP), gByPaint = new Map(D.byPaint), gPaintStat = new Map(D.paint), gFrame = D.frame;
const gPaintRowMax = ${gPaintRowMax};
${gViewFun.map((f) => f.toString()).join("\n")}
BindUI();
BuildMetricOption();
RenderAll();
`;
    const doc = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<title>Render Queue ${Esc(gSnapLabel)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
<style>
html,body{height:100%;margin:0;}
#rq{display:flex;height:100vh;}
#rq>div{flex:1 1 50%;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--bs-border-color,#ddd);min-width:0;}
${StyleText()}
</style></head><body>
<div id="rq"><div>${html[0]}</div><div>${html[1]}</div></div>
<script>${script.replace(/<\/script/gi, "<\\/script")}</script>
</body></html>`;
    const t = gSnapTime;
    const pad = (_v) => String(_v).padStart(2, "0");
    CFile.Save(doc, `RenderQueue_${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}_${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}.html`);
}
function Markup(_export) {
    const bar = _export
        ? `<b style="font-size:12px;">Render Queue</b><span class="rq-muted">${Esc(gSnapLabel)}</span>`
        : `<div class="btn-group btn-group-sm">
                <button class="btn btn-outline-secondary" data-act="snap" title="${gMeasureFrame}프레임 측정 후 결과 고정">스냅샷</button>
                <button class="btn btn-outline-success" data-act="live" title="계속 측정. 측정 비용 때문에 프레임이 떨어진다">● 실시간</button>
            </div>
            <button class="btn btn-sm btn-outline-primary" data-act="html" title="현재 스냅샷을 이 창 그대로 HTML 파일로 저장">HTML 저장</button>
            <label class="rq-check" title="페인트마다 Render 시간을 잰다. 페인트가 많으면 측정 비용이 크다"><input type="checkbox" data-id="paintOn" checked> 페인트 CPU</label>
            <span class="rq-muted" data-id="time"></span>`;
    const left = `
        <div class="rq-bar">
            ${bar}
            <span class="badge ${gGPU ? "bg-success" : "bg-secondary"} ms-auto" title="${gGPU ? "EXT_disjoint_timer_query_webgl2 사용" : "WebGL2 타이머 쿼리 확장이 없어 GPU 시간을 잴 수 없음"}">GPU 타이머 ${gGPU ? "ON" : "N/A"}</span>
        </div>
        <div class="rq-cards" data-id="summary"></div>
        <div class="rq-bar">
            <b style="font-size:12px;">프레임 소모 비율</b>
            <select class="form-select form-select-sm" data-id="metric" style="width:auto;"></select>
            <span class="rq-muted">막대나 범례를 누르면 선택됨</span>
        </div>
        <div data-id="graph" class="rq-graphwrap"></div>
        <ul class="nav nav-tabs rq-tabs">
            <li class="nav-item"><a class="nav-link" data-view="rp">렌더패스</a></li>
            <li class="nav-item"><a class="nav-link" data-view="paint">페인트</a></li>
        </ul>
        <div class="rq-bar">
            <input type="search" class="form-control form-control-sm" data-id="search" placeholder="이름 / 태그 / 셰이더 / 렌더타겟 / 타입 검색">
        </div>
        <div class="rq-bar" data-id="rpopt">
            <select class="form-select form-select-sm" data-id="group" style="width:auto;">
                <option value="none">그룹 없음</option>
                <option value="rt">렌더타겟별</option>
                <option value="cam">카메라별</option>
                <option value="shader">셰이더별</option>
            </select>
            <label class="rq-check"><input type="checkbox" data-id="onlyShow"> 렌더한 RP만</label>
            <label class="rq-check"><input type="checkbox" data-id="hideEmpty" checked> 빈 RP 숨김</label>
        </div>
        <div class="rq-scroll" data-id="list"></div>`;
    const right = `
        <ul class="nav nav-tabs rq-tabs">
            <li class="nav-item"><a class="nav-link" data-tab="detail">상세</a></li>
            <li class="nav-item"><a class="nav-link" data-tab="frame">프레임 순서</a></li>
        </ul>
        <div data-id="detailHead" class="rq-head"></div>
        <div class="rq-bar" data-id="paintTool">
            <input type="search" class="form-control form-control-sm" data-id="paintSearch" placeholder="오브젝트 / 타입 검색">
        </div>
        <div class="rq-scroll" data-id="detail"></div>
        <div class="rq-scroll" data-id="frame"></div>`;
    return [left, right];
}
function StyleText() {
    return `
    .rq-bar{display:flex;align-items:center;gap:6px;padding:6px 8px;flex-wrap:wrap;}
    .rq-muted{color:var(--bs-secondary-color,#888);font-size:11px;}
    .rq-cards{display:flex;gap:6px;padding:4px 8px;flex-wrap:wrap;}
    .rq-card{flex:1 1 80px;border:1px solid var(--bs-border-color,#ddd);border-radius:6px;padding:3px 8px;background:var(--bs-tertiary-bg,#f8f9fa);}
    .rq-card-v{font-weight:600;font-size:14px;white-space:nowrap;}
    .rq-graphwrap{padding:0 8px 6px;}
    .rq-graph{display:flex;height:28px;border-radius:4px;overflow:hidden;border:1px solid var(--bs-border-color,#ddd);margin:3px 0;}
    .rq-seg{cursor:pointer;color:#fff;font-size:10px;line-height:28px;padding:0 3px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;border-right:1px solid rgba(255,255,255,.5);min-width:2px;}
    .rq-seg:hover{filter:brightness(1.15);}
    .rq-seg.sel,.rq-leg.sel{outline:2px solid var(--bs-emphasis-color,#000);outline-offset:-2px;}
    .rq-seg-other{cursor:default;background:repeating-linear-gradient(45deg,#adb5bd,#adb5bd 4px,#ced4da 4px,#ced4da 8px);}
    .rq-legend{display:grid;grid-template-columns:1fr 1fr;gap:1px 10px;}
    .rq-leg{display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;padding:1px 3px;border-radius:3px;min-width:0;}
    .rq-leg:hover{background:var(--bs-secondary-bg,#e9ecef);}
    .rq-leg .rq-name{flex:1 1 auto;min-width:0;}
    .rq-leg-v{flex:none;color:var(--bs-secondary-color,#888);font-variant-numeric:tabular-nums;}
    .rq-chip{flex:none;width:9px;height:9px;border-radius:2px;}
    .rq-tabs{padding:0 8px;font-size:12px;}
    .rq-tabs .nav-link{cursor:pointer;padding:4px 10px;}
    .rq-scroll{flex:1 1 auto;overflow:auto;padding:0 8px 8px;}
    .rq-head{padding:6px 8px 0;}
    .rq-title{font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .rq-table{font-size:11px;margin:0;table-layout:fixed;width:100%;}
    .rq-table th{position:sticky;top:0;background:var(--bs-body-bg,#fff);cursor:pointer;user-select:none;white-space:nowrap;z-index:1;}
    .rq-table td,.rq-table th{padding:2px 5px;vertical-align:middle;}
    .rq-table tr[data-rp],.rq-table tr[data-paint]{cursor:pointer;}
    .rq-num{text-align:right;width:58px;font-variant-numeric:tabular-nums;white-space:nowrap;}
    .rq-type{width:90px;}
    .rq-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .rq-group td{background:var(--bs-secondary-bg,#e9ecef);font-weight:600;cursor:pointer;}
    .rq-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#adb5bd;}
    .rq-dot.on{background:#28a745;}
    .rq-tag{display:inline-block;margin-left:4px;padding:0 4px;border-radius:3px;font-size:10px;background:var(--bs-info-bg-subtle,#cff4fc);color:var(--bs-info-text-emphasis,#055160);}
    .rq-sec{font-weight:600;font-size:12px;margin:10px 0 4px;color:var(--bs-primary,#0d6efd);}
    .rq-prop{font-size:12px;margin:0;}
    .rq-prop th{width:140px;font-weight:normal;color:var(--bs-secondary-color,#888);padding:1px 6px;}
    .rq-prop td{padding:1px 6px;word-break:break-all;}
    .rq-empty{color:var(--bs-secondary-color,#888);font-size:12px;padding:8px;}
    .rq-check{font-size:12px;display:flex;align-items:center;gap:3px;margin:0;}
    `;
}
function Q(_id) {
    return gRoot.querySelector(`[data-id="${_id}"]`);
}
function Esc(_s) {
    return String(_s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}
function MS(_v, _recent) {
    if (_v == null || _v < 0)
        return `<span class="rq-muted">-</span>`;
    const s = _v.toFixed(2);
    return _recent ? s : `<span class="rq-muted" title="측정 구간에 렌더되지 않음(슬립). 이전 측정값">zZ ${s}</span>`;
}
function GPUText(_v) {
    return _v >= 0 ? "~" + _v.toFixed(3) : `<span class="rq-muted">-</span>`;
}
function FPS(_ms) {
    return _ms > 0 ? `≈${Math.floor(1000 / _ms)} fps` : "-";
}
function Num(_v) {
    if (_v >= 1000000)
        return (_v / 1000000).toFixed(1) + "M";
    if (_v >= 10000)
        return (_v / 1000).toFixed(1) + "K";
    return String(Math.round(_v));
}
function Byte(_v) {
    if (!(_v > 0))
        return "-";
    if (_v >= 1048576)
        return (_v / 1048576).toFixed(1) + "MB";
    return (_v / 1024).toFixed(0) + "KB";
}
function Hue(_s) {
    let h = 0;
    for (let i = 0; i < _s.length; ++i)
        h = (h * 31 + _s.charCodeAt(i)) | 0;
    return Math.abs(h) % 360;
}
function Heat(_v, _max) {
    if (!(_max > 0) || !(_v > 0))
        return "";
    const p = Math.min(100, _v / _max * 100).toFixed(1);
    return `style="background:linear-gradient(to right, rgba(220,53,69,.28) ${p}%, transparent ${p}%);"`;
}
function SortHead(_label, _key, _sort, _attr, _cls = "", _title = "") {
    const mark = _sort.mKey === _key ? (_sort.mDesc ? " ▼" : " ▲") : "";
    return `<th class="${_cls}" ${_attr}="${_key}" title="${_title}">${_label}${mark}</th>`;
}
function ToggleSort(_sort, _key) {
    if (_sort.mKey === _key)
        _sort.mDesc = !_sort.mDesc;
    else {
        _sort.mKey = _key;
        _sort.mDesc = _key !== "name" && _key !== "priority" && _key !== "type";
    }
}
function Card(_v, _label, _title = "") {
    return `<div class="rq-card" title="${_title}"><div class="rq-card-v">${_v}</div><div class="rq-muted">${_label}</div></div>`;
}
function PropTable(_title, _rows) {
    const tr = _rows.map(([k, v]) => `<tr><th>${Esc(k)}</th><td>${Esc(v)}</td></tr>`).join("");
    return tr ? `<div class="rq-sec">${_title}</div><table class="table table-sm rq-prop"><tbody>${tr}</tbody></table>` : "";
}
function BindUI() {
    Q("search").oninput = (e) => { gFilter = e.target.value.toLowerCase(); RenderList(); };
    Q("paintSearch").oninput = (e) => { gPaintFilter = e.target.value.toLowerCase(); RenderDetail(); };
    Q("group").onchange = (e) => { gGroup = e.target.value; RenderList(); };
    Q("onlyShow").onchange = (e) => { gOnlyShow = e.target.checked; RenderList(); };
    Q("hideEmpty").onchange = (e) => { gHideEmpty = e.target.checked; RenderList(); };
    Q("metric").onchange = (e) => { gMetric[gView] = e.target.value; RenderGraph(); };
    Q("group").value = gGroup;
    gRoot.addEventListener("click", OnClick);
}
function BuildMetricOption() {
    const opt = gView === "rp"
        ? [["gpu", "GPU ms"], ["cpu", "CPU ms"], ["draw", "드로우콜"], ["tri", "삼각형"]]
        : [["gpu", "GPU ms (추정)"], ["cpu", "CPU ms"], ["draw", "배치(논리 드로우)"], ["tri", "삼각형"], ["tex", "텍스처 메모리"], ["geo", "지오메트리 메모리"]];
    const sel = Q("metric");
    sel.innerHTML = opt.filter(([k]) => k !== "gpu" || gGPU)
        .map(([k, l]) => `<option value="${k}" ${gMetric[gView] === k ? "selected" : ""}>${l}</option>`).join("");
}
function RenderButton() {
    const live = gRoot.querySelector(`[data-act="live"]`);
    if (live == null)
        return;
    live.className = "btn " + (gLive ? "btn-success" : "btn-outline-success");
    const snap = gRoot.querySelector(`[data-act="snap"]`);
    const busy = gProfile?.IsMeasure() ?? false;
    snap.disabled = gLive || busy;
    snap.textContent = busy ? "측정 중…" : "스냅샷";
    gRoot.querySelector(`[data-act="html"]`).disabled = busy || gSnapTime == null;
}
function RenderAll() {
    RenderButton();
    gRoot.querySelectorAll("[data-view]").forEach((el) => el.classList.toggle("active", el.dataset.view === gView));
    gRoot.querySelectorAll("[data-tab]").forEach((el) => el.classList.toggle("active", el.dataset.tab === gTab));
    Q("rpopt").style.display = gView === "rp" ? "" : "none";
    RenderSummary();
    RenderGraph();
    RenderList();
    RenderDetail();
    RenderFrame();
}
function RenderSummary() {
    let rpShow = 0, cpu = 0, gpu = 0, gpuAny = false, draw = 0, tri = 0, call = 0;
    for (const arr of gByRP.values())
        call += arr.length;
    for (const s of gRPSnap.values()) {
        if (s.mShow)
            rpShow++;
        if (!s.mRecent)
            continue;
        cpu += s.mCPU;
        draw += s.mDraw;
        tri += s.mTri;
        if (s.mGPU >= 0) {
            gpu += s.mGPU;
            gpuAny = true;
        }
    }
    const texAll = new Map();
    for (const st of gPaintStat.values())
        for (const t of st.mTex)
            texAll.set(t.mKey, t.mByte);
    let texByte = 0;
    for (const b of texAll.values())
        texByte += b;
    Q("summary").innerHTML = `
        ${Card(`${rpShow} / ${gRPSnap.size}`, "렌더 RP / 전체")}
        ${Card(String(gPaintStat.size), `페인트 (호출 ${call})`)}
        ${Card(Num(draw), "드로우콜")}
        ${Card(Num(tri), "삼각형")}
        ${Card(cpu.toFixed(2), `CPU ms · ${FPS(cpu)}`, "RP CPU 합만으로 프레임을 돌린다고 가정한 최대 FPS")}
        ${Card(gpuAny ? gpu.toFixed(2) : "-", `GPU ms · ${gpuAny ? FPS(gpu) : "-"}`, "RP GPU 합만으로 프레임을 돌린다고 가정한 최대 FPS")}
        ${Card(Byte(texByte), "텍스처 (그린 페인트)")}`;
}
function RPValue(_s, _metric) {
    if (!_s.mRecent)
        return 0;
    switch (_metric) {
        case "gpu": return Math.max(0, _s.mGPU);
        case "draw": return _s.mDraw;
        case "tri": return _s.mTri;
        default: return Math.max(0, _s.mCPU);
    }
}
function PaintValue(_s, _metric) {
    switch (_metric) {
        case "draw": return _s.mDraw;
        case "tri": return _s.mTri;
        case "tex": return _s.mTexByte;
        case "geo": return _s.mGeoByte;
        case "gpu": return Math.max(0, _s.mGPU);
        default: return _s.mCPU;
    }
}
function MetricText(_v, _metric) {
    if (_metric === "gpu" || _metric === "cpu")
        return _v.toFixed(2) + " ms";
    if (_metric === "tex" || _metric === "geo")
        return Byte(_v);
    return Num(_v);
}
function RenderGraph() {
    const metric = gMetric[gView];
    const items = [];
    if (gView === "rp") {
        for (const [key, s] of gRPSnap)
            items.push({ mType: "rp", mKey: key, mLabel: key, mValue: RPValue(s, metric) });
    }
    else {
        for (const [id, s] of gPaintStat)
            items.push({ mType: "paint", mKey: id, mLabel: `${s.mOwner} (${s.mType})`, mValue: PaintValue(s, metric) });
    }
    items.sort((a, b) => b.mValue - a.mValue);
    const total = items.reduce((t, i) => t + i.mValue, 0);
    const div = Q("graph");
    if (!(total > 0)) {
        div.innerHTML = `<div class="rq-empty">측정값 없음</div>`;
        return;
    }
    let seg = "", other = 0, otherCount = 0;
    for (const it of items) {
        if (!(it.mValue > 0))
            continue;
        const pct = it.mValue / total * 100;
        if (pct < 0.5) {
            other += it.mValue;
            otherCount++;
            continue;
        }
        const sel = gSelType === it.mType && gSelKey === it.mKey ? " sel" : "";
        seg += `<div class="rq-seg${sel}" data-${it.mType}="${Esc(it.mKey)}" style="flex:0 0 ${pct.toFixed(3)}%;background:hsl(${Hue(it.mKey)},55%,55%);"
            title="${Esc(it.mLabel)}\n${MetricText(it.mValue, metric)} (${pct.toFixed(1)}%)">${pct >= 6 ? Esc(it.mLabel) : ""}</div>`;
    }
    if (other > 0) {
        const pct = other / total * 100;
        seg += `<div class="rq-seg rq-seg-other" style="flex:0 0 ${pct.toFixed(3)}%;" title="기타 ${otherCount}개\n${MetricText(other, metric)} (${pct.toFixed(1)}%)"></div>`;
    }
    const legend = items.filter((i) => i.mValue > 0).slice(0, 8).map((it) => {
        const pct = it.mValue / total * 100;
        const sel = gSelType === it.mType && gSelKey === it.mKey ? " sel" : "";
        return `<div class="rq-leg${sel}" data-${it.mType}="${Esc(it.mKey)}" title="${Esc(it.mLabel)}">
            <span class="rq-chip" style="background:hsl(${Hue(it.mKey)},55%,55%);"></span>
            <span class="rq-name">${Esc(it.mLabel)}</span>
            <span class="rq-leg-v">${MetricText(it.mValue, metric)} · ${pct.toFixed(1)}%</span></div>`;
    }).join("");
    div.innerHTML = `
        <div class="rq-muted">합계 ${MetricText(total, metric)}${metric === "gpu" || metric === "cpu" ? ` (${FPS(total)})` : ""} · 큰 순서</div>
        <div class="rq-graph">${seg}</div>
        <div class="rq-legend">${legend}</div>`;
}
function MatchRP(_key, _s) {
    if (!gFilter)
        return true;
    const hay = [_key, _s.mRT, _s.mCam, _s.mShaderKey, _s.mShader, ..._s.mTag];
    return hay.some((v) => v != null && String(v).toLowerCase().includes(gFilter));
}
function RPSortValue(_key, _s) {
    switch (gSort.mKey) {
        case "name": return _key;
        case "paint": return _s.mPaint;
        case "cpu": return _s.mRecent ? _s.mCPU : -1;
        case "gpu": return _s.mRecent ? _s.mGPU : -1;
        case "draw": return _s.mRecent ? _s.mDraw : -1;
        case "tri": return _s.mRecent ? _s.mTri : -1;
        default: return _s.mPriority;
    }
}
function RPGroup(_s) {
    switch (gGroup) {
        case "rt": return _s.mRT || "(메인 화면)";
        case "cam": return _s.mCam || "(기본 카메라)";
        case "shader": return _s.mShader;
        default: return "";
    }
}
function RenderList() {
    const div = Q("list");
    const scroll = div.scrollTop;
    div.innerHTML = gView === "rp" ? ListRP() : ListPaint();
    div.scrollTop = scroll;
}
function ListRP() {
    const rows = [];
    for (const [key, s] of gRPSnap) {
        if (gOnlyShow && !s.mShow)
            continue;
        if (gHideEmpty && s.mPaint === 0)
            continue;
        if (!MatchRP(key, s))
            continue;
        rows.push([key, s]);
    }
    const dir = gSort.mDesc ? -1 : 1;
    rows.sort((a, b) => {
        const va = RPSortValue(a[0], a[1]), vb = RPSortValue(b[0], b[1]);
        if (va !== vb)
            return (va < vb ? -1 : 1) * dir;
        return a[0].localeCompare(b[0]);
    });
    let maxCPU = 0, maxGPU = 0;
    for (const [, s] of rows) {
        if (!s.mRecent)
            continue;
        maxCPU = Math.max(maxCPU, s.mCPU);
        maxGPU = Math.max(maxGPU, s.mGPU);
    }
    const groups = new Map();
    for (const r of rows) {
        const g = RPGroup(r[1]);
        if (!groups.has(g))
            groups.set(g, []);
        groups.get(g).push(r);
    }
    let html = `<table class="table table-sm table-hover rq-table"><thead><tr>
        <th style="width:14px;"></th>
        ${SortHead("렌더패스", "name", gSort, "data-sort")}
        ${SortHead("P", "priority", gSort, "data-sort", "rq-num")}
        ${SortHead("Paint", "paint", gSort, "data-sort", "rq-num")}
        ${SortHead("Draw", "draw", gSort, "data-sort", "rq-num", "실제 GL 드로우콜(인스턴싱으로 묶인 뒤), 프레임당")}
        ${SortHead("Tri", "tri", gSort, "data-sort", "rq-num")}
        ${SortHead("CPU ms", "cpu", gSort, "data-sort", "rq-num", "JS가 이 RP를 처리한 시간: 유니폼/렌더타겟 설정 + 페인트 Render(배치 수집) + 배치 실행(GL 명령 제출). GPU가 실제로 그리는 시간은 포함 안 됨")}
        ${SortHead("GPU ms", "gpu", gSort, "data-sort", "rq-num", "GPU가 이 RP의 명령을 실제로 실행한 시간(타이머 쿼리)")}
        </tr></thead><tbody>`;
    for (const [g, list] of groups) {
        if (gGroup !== "none") {
            let cpu = 0, gpu = 0, draw = 0, tri = 0;
            for (const [, s] of list) {
                if (!s.mRecent)
                    continue;
                cpu += s.mCPU;
                gpu += Math.max(0, s.mGPU);
                draw += s.mDraw;
                tri += s.mTri;
            }
            const open = !gCollapse.has(g);
            html += `<tr class="rq-group" data-group="${Esc(g)}"><td>${open ? "▾" : "▸"}</td>
                <td title="${Esc(g)}">${Esc(g)} <span class="rq-muted">(${list.length})</span></td><td></td><td></td>
                <td class="rq-num">${Num(draw)}</td><td class="rq-num">${Num(tri)}</td>
                <td class="rq-num">${cpu.toFixed(2)}</td><td class="rq-num">${gpu.toFixed(2)}</td></tr>`;
            if (!open)
                continue;
        }
        for (const [key, s] of list) {
            const sel = gSelType === "rp" && gSelKey === key ? "table-primary" : "";
            const tags = s.mTag.map((t) => `<span class="rq-tag">${Esc(t)}</span>`).join("");
            html += `<tr class="${sel}" data-rp="${Esc(key)}">
                <td><span class="rq-dot ${s.mShow ? "on" : ""}" title="${s.mShow ? "렌더" : "렌더 안 함(슬립/비활성)"}"></span></td>
                <td class="rq-name" title="${Esc(key)}">${Esc(key)}${tags}</td>
                <td class="rq-num">${s.mPriority}</td>
                <td class="rq-num">${s.mPaint}</td>
                <td class="rq-num">${s.mRecent ? Num(s.mDraw) : "-"}</td>
                <td class="rq-num">${s.mRecent ? Num(s.mTri) : "-"}</td>
                <td class="rq-num" ${s.mRecent ? Heat(s.mCPU, maxCPU) : ""}>${MS(s.mHas ? s.mCPU : -1, s.mRecent)}</td>
                <td class="rq-num" ${s.mRecent ? Heat(s.mGPU, maxGPU) : ""}>${MS(s.mGPU, s.mRecent)}</td>
            </tr>`;
        }
    }
    html += `</tbody></table>`;
    return rows.length ? html : `<div class="rq-empty">조건에 맞는 렌더패스 없음</div>`;
}
function PaintSortValue(_s, _key) {
    switch (_key) {
        case "name": return _s.mOwner;
        case "type": return _s.mType;
        case "paint": return _s.mRP;
        case "draw": return _s.mDraw;
        case "tri": return _s.mTri;
        case "tex": return _s.mTexByte;
        case "geo": return _s.mGeoByte;
        case "gpu": return _s.mGPU;
        default: return _s.mCPU;
    }
}
function ListPaint() {
    const rows = [];
    for (const [id, s] of gPaintStat) {
        if (gFilter && !s.mOwner.toLowerCase().includes(gFilter) && !s.mType.toLowerCase().includes(gFilter))
            continue;
        rows.push([id, s]);
    }
    const dir = gSort.mDesc ? -1 : 1;
    rows.sort((a, b) => {
        const va = PaintSortValue(a[1], gSort.mKey), vb = PaintSortValue(b[1], gSort.mKey);
        return va === vb ? 0 : (va < vb ? -1 : 1) * dir;
    });
    let maxCPU = 0, maxTri = 0, maxTex = 0, maxGPU = 0;
    for (const [, s] of rows) {
        maxCPU = Math.max(maxCPU, s.mCPU);
        maxGPU = Math.max(maxGPU, s.mGPU);
        maxTri = Math.max(maxTri, s.mTri);
        maxTex = Math.max(maxTex, s.mTexByte);
    }
    let html = `<table class="table table-sm table-hover rq-table"><thead><tr>
        ${SortHead("오브젝트", "name", gSort, "data-sort")}
        ${SortHead("타입", "type", gSort, "data-sort", "rq-type")}
        ${SortHead("RP", "paint", gSort, "data-sort", "rq-num", "이 페인트를 그리는 렌더패스 수")}
        ${SortHead("배치", "draw", gSort, "data-sort", "rq-num", "논리 드로우 수. 같은 메시/텍스처끼리 인스턴싱으로 묶여 실제 드로우콜은 더 적을 수 있음")}
        ${SortHead("Tri", "tri", gSort, "data-sort", "rq-num")}
        ${SortHead("Geo", "geo", gSort, "data-sort", "rq-num", "지오메트리 메모리 추정(셰이더 정점 속성 기준)")}
        ${SortHead("Tex", "tex", gSort, "data-sort", "rq-num", "참조 텍스처 메모리 추정. 다른 페인트와 공유될 수 있음")}
        ${SortHead("CPU ms", "cpu", gSort, "data-sort", "rq-num")}
        ${SortHead("GPU ms", "gpu", gSort, "data-sort", "rq-num", "추정값. RP GPU 시간을 그 RP 안 삼각형 비율로 나눔(RP에 페인트가 하나면 정확). 픽셀 비용은 반영 안 됨")}
        </tr></thead><tbody>`;
    for (const [id, s] of rows.slice(0, gPaintRowMax)) {
        const sel = gSelType === "paint" && gSelKey === id ? "table-primary" : "";
        html += `<tr class="${sel}" data-paint="${id}">
            <td class="rq-name" title="${Esc(s.mOwner)}">${Esc(s.mOwner)}</td>
            <td class="rq-name rq-muted">${Esc(s.mType)}</td>
            <td class="rq-num">${s.mRP}</td>
            <td class="rq-num">${s.mDraw}</td>
            <td class="rq-num" ${Heat(s.mTri, maxTri)}>${Num(s.mTri)}</td>
            <td class="rq-num">${Byte(s.mGeoByte)}</td>
            <td class="rq-num" ${Heat(s.mTexByte, maxTex)}>${Byte(s.mTexByte)}</td>
            <td class="rq-num" ${Heat(s.mCPU, maxCPU)}>${s.mCPU.toFixed(3)}</td>
            <td class="rq-num" ${Heat(s.mGPU, maxGPU)}>${GPUText(s.mGPU)}</td></tr>`;
    }
    html += `</tbody></table>`;
    if (rows.length > gPaintRowMax)
        html += `<div class="rq-empty">${rows.length - gPaintRowMax}개 더 있음. 검색으로 좁히세요.</div>`;
    return rows.length ? html : `<div class="rq-empty">조건에 맞는 페인트 없음</div>`;
}
function RenderDetail() {
    const head = Q("detailHead"), body = Q("detail"), tool = Q("paintTool");
    const show = gTab === "detail";
    head.style.display = show ? "" : "none";
    body.style.display = show ? "" : "none";
    tool.style.display = show && gSelType === "rp" ? "" : "none";
    if (!show)
        return;
    const scroll = body.scrollTop;
    if (gSelType === "rp" && gRPSnap.has(gSelKey))
        DetailRP(head, body);
    else if (gSelType === "paint" && gPaintStat.has(gSelKey))
        DetailPaint(head, body);
    else {
        head.innerHTML = "";
        body.innerHTML = `<div class="rq-empty">그래프나 왼쪽 목록에서 렌더패스·페인트를 선택하세요.</div>`;
    }
    body.scrollTop = scroll;
}
function DetailRP(_head, _body) {
    const s = gRPSnap.get(gSelKey);
    const users = gByRP.get(gSelKey) ?? [];
    let paintCPU = 0;
    for (const u of users)
        paintCPU += u.mCPU;
    _head.innerHTML = `
        <div class="rq-title" title="${Esc(gSelKey)}">${Esc(gSelKey)}</div>
        <div class="rq-cards">
            ${Card(gLive ? (s.mShow ? "렌더" : "슬립") : `${s.mRender} / ${gFrameCount}`, gLive ? "상태" : "렌더한 프레임", "값은 모두 프레임당 평균. 일부 프레임만 렌더하는 RP는 그만큼 작게 잡힌다")}
            ${Card(String(users.length), "페인트")}
            ${Card(s.mRecent ? Num(s.mDraw) : "-", "드로우콜")}
            ${Card(s.mRecent ? Num(s.mTri) : "-", "삼각형")}
            ${Card(MS(s.mHas ? s.mCPU : -1, s.mRecent), `CPU ms (페인트 ${paintCPU.toFixed(2)})`)}
            ${Card(MS(s.mGPU, s.mRecent), "GPU ms")}
        </div>`;
    let html = s.mProp.map(([title, rows]) => PropTable(title, rows)).join("");
    html += `<div class="rq-sec">페인트</div>` + RPPaintTable(users);
    _body.innerHTML = html;
}
function RPPaintTable(_users) {
    const map = new Map();
    for (const u of _users) {
        if (gPaintFilter && !u.mOwner.toLowerCase().includes(gPaintFilter) && !u.mType.toLowerCase().includes(gPaintFilter))
            continue;
        const k = u.mOwner + "\n" + u.mType + "\n" + u.mListType;
        const g = map.get(k);
        if (g) {
            g.mCount++;
            g.mCPU += u.mCPU;
            g.mShow += u.mShow ? 1 : 0;
            if (u.mGPU >= 0)
                g.mGPU = Math.max(0, g.mGPU) + u.mGPU;
        }
        else
            map.set(k, {
                mOwner: u.mOwner, mType: u.mType, mList: u.mListType, mCount: 1,
                mShow: u.mShow ? 1 : 0, mCPU: u.mCPU, mGPU: u.mGPU, mID: u.mPaintID,
            });
    }
    const rows = Array.from(map.values());
    if (rows.length === 0)
        return `<div class="rq-empty">이 렌더패스를 쓰는 페인트 없음</div>`;
    const dir = gPaintSort.mDesc ? -1 : 1;
    const val = (r) => gPaintSort.mKey === "name" ? r.mOwner : gPaintSort.mKey === "type" ? r.mType : gPaintSort.mKey === "paint" ? r.mCount : gPaintSort.mKey === "gpu" ? r.mGPU : r.mCPU;
    rows.sort((a, b) => { const va = val(a), vb = val(b); return va === vb ? 0 : (va < vb ? -1 : 1) * dir; });
    const max = rows.reduce((m, r) => Math.max(m, r.mCPU), 0);
    const maxGPU = rows.reduce((m, r) => Math.max(m, r.mGPU), 0);
    let html = `<table class="table table-sm table-hover rq-table"><thead><tr>
        ${SortHead("오브젝트", "name", gPaintSort, "data-psort")}
        ${SortHead("타입", "type", gPaintSort, "data-psort", "rq-type")}
        <th class="rq-type">리스트</th>
        ${SortHead("수", "paint", gPaintSort, "data-psort", "rq-num")}
        ${SortHead("CPU ms", "cpu", gPaintSort, "data-psort", "rq-num")}
        ${SortHead("GPU ms", "gpu", gPaintSort, "data-psort", "rq-num", "추정값. RP GPU 시간을 삼각형 비율로 나눔")}
        </tr></thead><tbody>`;
    for (const r of rows.slice(0, gPaintRowMax)) {
        const hidden = r.mShow < r.mCount ? ` <span class="badge bg-warning text-dark" title="컬링 등으로 안 그린 개수">숨김 ${r.mCount - r.mShow}</span>` : "";
        html += `<tr data-paint="${r.mID}">
            <td class="rq-name" title="${Esc(r.mOwner)}">${Esc(r.mOwner)}${hidden}</td>
            <td class="rq-name rq-muted">${Esc(r.mType)}</td>
            <td class="rq-muted">${r.mList}</td>
            <td class="rq-num">${r.mCount}</td>
            <td class="rq-num" ${Heat(r.mCPU, max)}>${r.mCPU.toFixed(3)}</td>
            <td class="rq-num" ${Heat(r.mGPU, maxGPU)}>${GPUText(r.mGPU)}</td></tr>`;
    }
    html += `</tbody></table>`;
    if (rows.length > gPaintRowMax)
        html += `<div class="rq-empty">${rows.length - gPaintRowMax}개 더 있음. 검색으로 좁히세요.</div>`;
    return html;
}
function DetailPaint(_head, _body) {
    const s = gPaintStat.get(gSelKey);
    const arr = gByPaint.get(gSelKey);
    _head.innerHTML = `
        <div class="rq-title" title="${Esc(s.mOwner)}">${Esc(s.mOwner)} <span class="rq-muted">${Esc(s.mType)}</span></div>
        <div class="rq-cards">
            ${Card(String(s.mRP), "사용 RP")}
            ${Card(String(s.mDraw), "배치(논리 드로우)")}
            ${Card(Num(s.mTri), "삼각형")}
            ${Card(Num(s.mVert), "정점")}
            ${Card(Byte(s.mGeoByte), `지오메트리 (메시 ${s.mMesh.length})`)}
            ${Card(Byte(s.mTexByte), `텍스처 (${s.mTex.length})`)}
            ${Card(s.mCPU.toFixed(3), "CPU ms")}
            ${Card(GPUText(s.mGPU), "GPU ms (추정)")}
        </div>`;
    let html = `<div class="rq-sec">렌더패스</div>
        <table class="table table-sm table-hover rq-table"><thead><tr>
        <th>렌더패스</th><th class="rq-num">P</th><th class="rq-type">리스트</th><th class="rq-num">표시</th><th class="rq-num">CPU ms</th><th class="rq-num" title="RP GPU 시간 중 이 페인트 몫(삼각형 비율 추정)">GPU ms</th><th class="rq-num">RP GPU</th>
        </tr></thead><tbody>`;
    for (const e of arr) {
        const rs = gRPSnap.get(e.mKey);
        html += `<tr data-rp="${Esc(e.mKey)}">
            <td class="rq-name" title="${Esc(e.mKey)}">${Esc(e.mKey)}</td>
            <td class="rq-num">${e.mPriority}</td>
            <td class="rq-muted">${e.mListType}</td>
            <td class="rq-num">${e.mShow ? "O" : `<span class="rq-muted">숨김</span>`}</td>
            <td class="rq-num">${e.mCPU.toFixed(3)}</td>
            <td class="rq-num">${GPUText(e.mGPU)}</td>
            <td class="rq-num">${rs ? MS(rs.mGPU, rs.mRecent) : "-"}</td></tr>`;
    }
    html += `</tbody></table>`;
    html += `<div class="rq-sec">메시 <span class="rq-muted">메모리는 셰이더 정점 속성과 32비트 인덱스 기준 추정</span></div>`;
    if (s.mMesh.length === 0)
        html += `<div class="rq-empty">그린 메시 없음</div>`;
    else {
        html += `<table class="table table-sm rq-table"><thead><tr>
            <th>메시</th><th class="rq-num">정점</th><th class="rq-num">인덱스</th><th class="rq-num">Tri</th><th class="rq-num">메모리</th>
            </tr></thead><tbody>`;
        for (const m of s.mMesh)
            html += `<tr><td class="rq-name" title="${Esc(m.mKey)}">${Esc(m.mKey)}</td>
                <td class="rq-num">${Num(m.mVert)}</td><td class="rq-num">${Num(m.mIndex)}</td>
                <td class="rq-num">${Num(m.mTri)}</td><td class="rq-num">${Byte(m.mByte)}</td></tr>`;
        html += `</tbody></table>`;
    }
    html += `<div class="rq-sec">텍스처 <span class="rq-muted">RGBA32F는 16바이트, 밉맵 +1/3, 깊이버퍼 4바이트로 추정</span></div>`;
    if (s.mTex.length === 0)
        html += `<div class="rq-empty">텍스처 없음</div>`;
    else {
        html += `<table class="table table-sm rq-table"><thead><tr>
            <th>텍스처</th><th class="rq-num">크기</th><th class="rq-type">형식</th><th class="rq-num">메모리</th>
            </tr></thead><tbody>`;
        for (const t of s.mTex)
            html += `<tr><td class="rq-name" title="${Esc(t.mKey)}">${Esc(t.mKey)}</td>
                <td class="rq-num">${t.mSize}</td>
                <td class="rq-muted">${t.mDesc}</td>
                <td class="rq-num">${Byte(t.mByte)}</td></tr>`;
        html += `</tbody></table>`;
    }
    _body.innerHTML = html;
}
function RenderFrame() {
    const div = Q("frame");
    div.style.display = gTab === "frame" ? "" : "none";
    if (gTab !== "frame")
        return;
    const scroll = div.scrollTop;
    let html = `<div class="rq-muted mb-1">실제 그리는 순서. 같은 RP·타입이 연속되면 한 줄로 묶음. 노란 줄은 안 그린 항목</div>`;
    for (const [priority, lists] of gFrame) {
        html += `<div class="rq-sec">Priority ${priority}</div>`;
        for (const fl of lists) {
            const rows = fl.mRow.map((r) => `<tr class="${r.mShow ? "" : "table-warning"}" data-rp="${Esc(r.mKey)}">
                <td class="rq-name" title="${Esc(r.mKey)}">${Esc(r.mKey)}</td>
                <td class="rq-name">${Esc(r.mOwner)} <span class="rq-muted">${Esc(r.mType)}</span></td>
                <td class="rq-num">${r.mCount > 1 ? "x" + r.mCount : ""}</td></tr>`).join("");
            html += `<div class="rq-muted">${fl.mLabel} (${fl.mTotal})</div>
                <table class="table table-sm table-hover rq-table mb-2"><tbody>${rows}</tbody></table>`;
        }
    }
    div.innerHTML = gFrame.length ? html : `<div class="rq-empty">비어 있음</div>`;
    div.scrollTop = scroll;
}
function OnClick(_e) {
    const t = _e.target;
    const el = t.closest("[data-act],[data-view],[data-tab],[data-sort],[data-psort],[data-group],[data-rp],[data-paint]");
    if (el == null || gRoot == null)
        return;
    const d = el.dataset;
    if (d.act === "live") {
        gLive = !gLive;
        gProfile.SetLive(gLive);
        if (gLive)
            Snapshot();
        else
            RenderButton();
    }
    else if (d.act === "snap")
        Measure();
    else if (d.act === "html")
        Export();
    else if (d.view != null) {
        gView = d.view;
        gSort = gView === "rp" ? { mKey: "priority", mDesc: false } : { mKey: "cpu", mDesc: true };
        BuildMetricOption();
        RenderAll();
    }
    else if (d.tab != null) {
        gTab = d.tab;
        RenderAll();
    }
    else if (d.sort != null) {
        ToggleSort(gSort, d.sort);
        RenderList();
    }
    else if (d.psort != null) {
        ToggleSort(gPaintSort, d.psort);
        RenderDetail();
    }
    else if (d.group != null) {
        if (gCollapse.has(d.group))
            gCollapse.delete(d.group);
        else
            gCollapse.add(d.group);
        RenderList();
    }
    else if (d.rp != null)
        Select("rp", d.rp);
    else if (d.paint)
        Select("paint", d.paint);
}
function Select(_type, _key) {
    gSelType = _type;
    gSelKey = _key;
    gTab = "detail";
    if (gView !== _type) {
        gView = _type;
        gSort = gView === "rp" ? { mKey: "priority", mDesc: false } : { mKey: "cpu", mDesc: true };
        BuildMetricOption();
    }
    const s = _type === "rp" ? gRPSnap.get(_key) : null;
    if (s != null)
        gCollapse.delete(RPGroup(s));
    RenderAll();
    const row = Q("list").querySelector(`[data-${_type}="${CSS.escape(_key)}"]`);
    row?.scrollIntoView({ block: "nearest" });
}

import { CFrame } from "../util/CFrame.js";
import { CAtelier } from "../app/CAtelier.js";
import { CTexture } from "../render/CTexture.js";
import { CMath } from "../geometry/CMath.js";
import { CVec3 } from "../geometry/CVec3.js";
const gTimeMax = 60;
let gFrame = null;
let gOrg = null;
let gWrap = null;
let gPause = false;
let gStep = 0;
let gMinMS = 0;
let gLast = 0;
let gRun = 0;
let gTime = [];
let gStepDone = [];
let gFrameEnd = [];
function Hook() {
    if (gWrap != null)
        return true;
    const frame = CFrame.Main();
    if (frame == null || frame.mMainProcess == null)
        return false;
    gFrame = frame;
    const org = frame.mMainProcess;
    gOrg = org;
    const wrap = async () => {
        if (frame.mMainProcess == null)
            return;
        if (gWrap !== wrap)
            return org.call(frame);
        const now = performance.now();
        if (gPause && gStep <= 0) {
            requestAnimationFrame(wrap);
            return;
        }
        if (gStep <= 0 && gMinMS > 0 && now - gLast < gMinMS) {
            requestAnimationFrame(wrap);
            return;
        }
        if (gLast > 0) {
            gTime.push(now - gLast);
            if (gTime.length > gTimeMax)
                gTime.shift();
        }
        gLast = now;
        gRun++;
        const step = gStep > 0;
        if (step)
            gStep--;
        await org.call(frame);
        for (const cb of gFrameEnd.slice())
            cb();
        if (step && gStep <= 0) {
            const done = gStepDone;
            gStepDone = [];
            for (const d of done)
                d();
        }
    };
    gWrap = wrap;
    frame.mMainProcess = wrap;
    return true;
}
function Release() {
    if (gWrap == null)
        return;
    if (gFrame != null && gFrame.mMainProcess === gWrap)
        gFrame.mMainProcess = gOrg;
    gWrap = null;
    gOrg = null;
    gFrame = null;
    gPause = false;
    gStep = 0;
    gMinMS = 0;
    gLast = 0;
    gTime = [];
    const done = gStepDone;
    gStepDone = [];
    for (const d of done)
        d();
}
function Pause() {
    if (!Hook())
        return false;
    gPause = true;
    return true;
}
function Resume() {
    if (gWrap == null)
        return false;
    gPause = false;
    gStep = 0;
    gLast = 0;
    const done = gStepDone;
    gStepDone = [];
    for (const d of done)
        d();
    return true;
}
function Step(_count = 1, _timeout = 10000) {
    if (!Hook() || _count < 1)
        return Promise.resolve(false);
    gPause = true;
    gStep = Math.floor(_count);
    return new Promise((resolve) => {
        let end = false;
        const timer = setTimeout(() => {
            if (end)
                return;
            end = true;
            gStepDone = gStepDone.filter((d) => d !== done);
            gStep = 0;
            resolve(false);
        }, _timeout);
        const done = () => {
            if (end)
                return;
            end = true;
            clearTimeout(timer);
            resolve(true);
        };
        gStepDone.push(done);
    });
}
function SetFPS(_fps) {
    if (_fps > 0 && !Hook())
        return false;
    if (gWrap == null)
        return true;
    gMinMS = _fps > 0 ? 1000 / _fps : 0;
    return true;
}
function Status() {
    const frame = CFrame.Main();
    let avg = 0;
    for (const t of gTime)
        avg += t;
    avg = gTime.length > 0 ? avg / gTime.length : 0;
    return {
        hook: gWrap != null,
        pause: gPause,
        stepLeft: gStep,
        fpsLimit: gMinMS > 0 ? Math.round(1000 / gMinMS) : 0,
        frame: frame?.mUpdate?.mOffset ?? -1,
        runFrame: gRun,
        deltaTime: frame?.mUpdate?.mDeltaTime ?? -1,
        fps: avg > 0 ? Math.round(1000 / avg * 10) / 10 : -1,
        visible: document.visibilityState,
    };
}
const gVFFloat = { 0: 3, 1: 2, 3: 3, 4: 4, 5: 4, 6: 4, 7: 3, 8: 4, 9: 3 };
const gDrawName = ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced", "drawRangeElements"];
const gErrorLog = [];
let gErrorHook = false;
let gGLPending = [];
function GLErrorTake(_gl) {
    const errs = gGLPending;
    gGLPending = [];
    if (_gl != null)
        for (let i = 0; i < 10; ++i) {
            const e = _gl.getError();
            if (e == 0)
                break;
            errs.push(e);
        }
    return errs;
}
let gPaintID = new WeakMap();
let gPaintIDNext = 0;
function ErrorHook() {
    if (gErrorHook)
        return;
    gErrorHook = true;
    window.addEventListener("error", (e) => { gErrorLog.push({ type: "error", text: `${e.message} @${e.filename}:${e.lineno}`, time: Date.now() }); if (gErrorLog.length > 50)
        gErrorLog.shift(); });
    window.addEventListener("unhandledrejection", (e) => { gErrorLog.push({ type: "reject", text: String(e.reason?.stack ?? e.reason), time: Date.now() }); if (gErrorLog.length > 50)
        gErrorLog.shift(); });
}
function R(_v, _d = 3) {
    const m = Math.pow(10, _d);
    return Math.round(_v * m) / m;
}
class CAIAcc {
    mKey = "";
    mInfo = null;
    mCPUAcc = 0;
    mGPUAcc = 0;
    mDrawAcc = 0;
    mTriAcc = 0;
    mRender = 0;
    mCPUSum = 0;
    mDrawSum = 0;
    mTriSum = 0;
    mCPUStart = 0;
    mDrawStart = 0;
    mTriStart = 0;
}
class CAIProbe {
    mFrame;
    mGL;
    mExt;
    mBrush;
    mAcc = new Map();
    mPassMap = new Map();
    mPaint = new WeakMap();
    mQueryFree = [];
    mQueryWait = [];
    mQueryOn = false;
    mPaintOn;
    mCur = null;
    mCurKey = "";
    mCurBefore = null;
    mDepth = 0;
    mActive = false;
    mFrameNo = 0;
    mCount = 0;
    mGPUCount = 0;
    mDrawCall = 0;
    mTriangle = 0;
    mPassOwn = false;
    mPassOrg = null;
    mDrawOrg = {};
    mRenderOrg = new Map();
    constructor(_frame, _brush, _gpu, _paint) {
        this.mFrame = _frame;
        this.mBrush = _brush;
        this.mGL = _frame.Dev().GL();
        this.mExt = _gpu && this.mGL != null ? this.mGL.getExtension("EXT_disjoint_timer_query_webgl2") : null;
        this.mPaintOn = _paint;
    }
    Key(_bi, _key) {
        return this.mBrush.length > 1 ? `b${_bi}:${_key}` : _key;
    }
    Hook() {
        const gl = this.mGL;
        if (gl != null)
            for (const name of gDrawName) {
                const fun = gl[name];
                if (typeof fun != "function")
                    continue;
                this.mDrawOrg[name] = [Object.prototype.hasOwnProperty.call(gl, name), fun];
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
        const dev = this.mFrame.Dev();
        this.mPassOwn = Object.prototype.hasOwnProperty.call(dev, "ChangeRenderPass");
        const pass = dev.ChangeRenderPass;
        this.mPassOrg = pass;
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
            const hit = this.mActive ? this.mPassMap.get(_rp) : null;
            if (hit != null) {
                this.mCur = hit;
                this.mCurKey = hit.mKey;
                this.mCurBefore = r;
                this.Start(hit);
            }
            return r;
        };
        this.Rebuild();
        if (this.mPaintOn)
            for (const brush of this.mBrush)
                for (const renPri of brush.mRenPriMap.values())
                    for (const list of [renPri.mDistanceList, renPri.mRAlphaList, renPri.mAlphaList])
                        for (let i = 0; i < list.Size(); ++i) {
                            const ren = list.Find(i);
                            if (ren?.mPaint != null)
                                this.PaintHook(ren.mPaint);
                        }
    }
    Unhook() {
        const dev = this.mFrame.Dev();
        if (this.mPassOrg != null) {
            if (this.mPassOwn)
                dev.ChangeRenderPass = this.mPassOrg;
            else
                delete dev.ChangeRenderPass;
        }
        this.mPassOrg = null;
        this.mCur = null;
        for (const [proto, org] of this.mRenderOrg)
            proto.Render = org;
        this.mRenderOrg.clear();
        const gl = this.mGL;
        for (const name in this.mDrawOrg) {
            if (this.mDrawOrg[name][0])
                gl[name] = this.mDrawOrg[name][1];
            else
                delete gl[name];
        }
        this.mDrawOrg = {};
    }
    PaintHook(_paint) {
        let proto = Object.getPrototypeOf(_paint);
        const self = this;
        while (proto != null && proto !== Object.prototype) {
            if (Object.prototype.hasOwnProperty.call(proto, "Render") && !this.mRenderOrg.has(proto)) {
                const org = proto.Render;
                this.mRenderOrg.set(proto, org);
                proto.Render = function (...a) {
                    if (self.mDepth > 0 || self.mCur == null)
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
    Rebuild() {
        this.mPassMap.clear();
        this.mBrush.forEach((brush, bi) => {
            for (const [key, info] of brush.mRenInfoMap) {
                if (info.mRP == null)
                    continue;
                let acc = this.mAcc.get(info);
                if (acc == null) {
                    acc = new CAIAcc();
                    acc.mInfo = info;
                    this.mAcc.set(info, acc);
                }
                acc.mKey = this.Key(bi, key);
                this.mPassMap.set(info.mRP, acc);
            }
        });
    }
    Commit() {
        this.mFrameNo++;
        for (const acc of this.mAcc.values()) {
            if (this.mActive) {
                if (acc.mCPUSum > 0)
                    acc.mRender++;
                acc.mCPUAcc += acc.mCPUSum;
                acc.mDrawAcc += acc.mDrawSum;
                acc.mTriAcc += acc.mTriSum;
            }
            acc.mCPUSum = 0;
            acc.mDrawSum = 0;
            acc.mTriSum = 0;
        }
        if (this.mActive)
            this.mCount++;
        this.Rebuild();
        if (this.mExt != null && this.mFrameNo % 4 == 0)
            this.PollGPU();
        this.mActive = true;
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
                    sum.set(q.mAcc, (sum.get(q.mAcc) ?? 0) + gl.getQueryParameter(q.mQuery, gl.QUERY_RESULT) / 1000000);
                this.mQueryFree.push(q.mQuery);
            }
            this.mQueryWait.splice(0, end);
            if (disjoint)
                continue;
            this.mGPUCount++;
            for (const acc of this.mAcc.values())
                acc.mGPUAcc += sum.get(acc) ?? 0;
        }
    }
    Start(_acc) {
        _acc.mCPUStart = performance.now();
        _acc.mDrawStart = this.mDrawCall;
        _acc.mTriStart = this.mTriangle;
        if (this.mExt == null || this.mQueryOn)
            return;
        const q = this.mQueryFree.pop() ?? this.mGL.createQuery();
        this.mQueryWait.push({ mQuery: q, mFrame: this.mFrameNo, mAcc: _acc });
        this.mGL.beginQuery(this.mExt.TIME_ELAPSED_EXT, q);
        this.mQueryOn = true;
    }
    End(_acc) {
        _acc.mCPUSum += performance.now() - _acc.mCPUStart;
        _acc.mDrawSum += this.mDrawCall - _acc.mDrawStart;
        _acc.mTriSum += this.mTriangle - _acc.mTriStart;
        if (!this.mQueryOn)
            return;
        this.mGL.endQuery(this.mExt.TIME_ELAPSED_EXT);
        this.mQueryOn = false;
    }
    Paint(_paint, _ms) {
        const key = this.mCurKey.replace(/^b\d+:/, "");
        const ren = _paint.mRenPT?.find((r) => r.mRenInfoKey === key);
        if (ren == null)
            return;
        let v = this.mPaint.get(ren);
        if (v == null) {
            v = { mSum: 0, mAcc: 0 };
            this.mPaint.set(ren, v);
        }
        v.mSum += _ms;
    }
    Release() {
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
    }
}
function BrushList() {
    const atl = CAtelier.Main();
    const list = new Set();
    if (atl == null)
        return [];
    for (const can of atl.mCanvasMap.values()) {
        const b = can.GetBrush();
        if (b != null)
            list.add(b);
    }
    if (atl.mBrush != null)
        list.add(atl.mBrush);
    return Array.from(list);
}
async function Measure(_brush, _opt, _paint) {
    if (!Hook())
        return null;
    const n = Math.max(1, Math.floor(_opt.frame ?? 30));
    const timeout = _opt.timeout ?? Math.max(8000, n * 250);
    const probe = new CAIProbe(CFrame.Main(), _brush, _opt.gpu !== false, _paint);
    probe.Hook();
    let finish;
    const wait = new Promise((r) => { finish = r; });
    const cb = () => {
        probe.Commit();
        if (probe.mCount >= n)
            finish();
    };
    gFrameEnd.push(cb);
    const timer = setTimeout(() => finish(), timeout);
    if (gPause)
        Step(n + 1, timeout);
    await wait;
    clearTimeout(timer);
    gFrameEnd = gFrameEnd.filter((c) => c !== cb);
    probe.mActive = false;
    const until = performance.now() + 1000;
    while (probe.mExt != null && probe.mQueryWait.length > 0 && performance.now() < until) {
        await new Promise((r) => setTimeout(r, 50));
        probe.PollGPU();
    }
    probe.Unhook();
    return probe;
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
    for (const info of _tex.GetInfo() ?? []) {
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
function GeoByte(_mesh, _shader) {
    let float = 0;
    for (const vf of _shader?.mVF ?? [])
        float += gVFFloat[vf.identifier] ?? 0;
    return _mesh.vNum * float * 4 + _mesh.iNum * 4;
}
function Match(_key, _filter) {
    if (!_filter || _filter.length == 0)
        return true;
    const k = _key.toLowerCase();
    return _filter.some((f) => k.includes(f.toLowerCase()));
}
function CollectRen(_probe, _brush) {
    const ren = [];
    const order = [];
    _brush.forEach((brush, bi) => {
        const sorted = Array.from(brush.mRenPriMap.entries()).sort((a, b) => a[0] - b[0]);
        for (const [priority, renPri] of sorted) {
            const lists = [];
            for (const [label, list] of [["Distance", renPri.mDistanceList], ["RAlpha", renPri.mRAlphaList], ["Alpha", renPri.mAlphaList]]) {
                const rows = [];
                let total = 0, prev = null, row = null;
                for (let i = 0; i < list.Size(); ++i) {
                    const r = list.Find(i);
                    if (r == null || r.mShow == null)
                        break;
                    if (r.mRenInfoKey == null)
                        continue;
                    total++;
                    const key = _probe ? _probe.Key(bi, r.mRenInfoKey) : r.mRenInfoKey;
                    const pv = _probe?.mPaint.get(r);
                    const e = {
                        key, paintID: r.mPaint != null ? PaintID(r.mPaint) : "", owner: r.mPaint?.GetOwner()?.Key() ?? "-",
                        type: r.mPaint?.constructor?.name ?? "-", priority, list: label, show: r.mShow === 0,
                        cpu: pv != null && _probe.mCount > 0 ? pv.mSum / _probe.mCount : 0, gpu: -1, ren: r, paint: r.mPaint,
                    };
                    ren.push(e);
                    if (prev != null && prev.key === e.key && prev.show === e.show && prev.type === e.type)
                        row.count++;
                    else {
                        row = { key: e.key, show: e.show, owner: e.owner, type: e.type, count: 1 };
                        rows.push(row);
                    }
                    prev = e;
                }
                if (total > 0)
                    lists.push({ list: label, total, rows });
            }
            order.push({ priority, lists });
        }
    });
    return { ren, order };
}
function Report(_opt = {}) {
    return ReportRun(_opt);
}
async function ReportRun(_opt) {
    ErrorHook();
    const info = new Set(_opt.info ?? ["summary", "anomaly"]);
    const top = _opt.top ?? 10;
    const out = { info: Array.from(info) };
    const frame = CFrame.Main();
    const atl = CAtelier.Main();
    if (frame == null || atl == null)
        return { error: "CFrame/CAtelier 없음. 엔진이 시작되지 않았다" };
    const brush = BrushList();
    const need = ["summary", "anomaly", "rp", "paint"].some((k) => info.has(k));
    const probe = need ? await Measure(brush, _opt, info.has("paint") || info.has("anomaly")) : null;
    if (need && probe == null)
        return { error: "프레임 루프에 연결하지 못했다" };
    const rpRow = [];
    const paintRow = [];
    const anomaly = [];
    const warn = (_level, _code, _target, _msg) => anomaly.push({ level: _level, code: _code, target: _target, msg: _msg });
    let totals = null;
    let glTaken = [];
    let renData = null;
    if (need || info.has("frame"))
        renData = CollectRen(probe, brush);
    if (probe != null) {
        const n = Math.max(1, probe.mCount);
        const gpuOn = probe.mExt != null && probe.mGPUCount > 0;
        const res = frame.Res();
        const byKey = new Map();
        for (const e of renData.ren) {
            const arr = byKey.get(e.key) ?? [];
            arr.push(e);
            byKey.set(e.key, arr);
        }
        const rpTri = new Map();
        const entryTri = new Map();
        const paintMap = new Map();
        for (const e of renData.ren) {
            if (e.paintID == "")
                continue;
            const arr = paintMap.get(e.paintID) ?? [];
            arr.push(e);
            paintMap.set(e.paintID, arr);
        }
        let sumCPU = 0, sumGPU = 0, sumDraw = 0, sumTri = 0;
        for (const acc of probe.mAcc.values()) {
            const rp = acc.mInfo.mRP;
            const gpu = gpuOn ? acc.mGPUAcc / probe.mGPUCount : -1;
            const row = {
                key: acc.mKey, show: acc.mInfo.mShow, priority: rp.mPriority ?? 0,
                cpu: R(acc.mCPUAcc / n), gpu: gpu < 0 ? -1 : R(gpu), draw: R(acc.mDrawAcc / n, 1), tri: Math.round(acc.mTriAcc / n),
                rendered: acc.mRender, paints: byKey.get(acc.mKey)?.length ?? 0,
                rt: rp.mRenderTarget || "", cam: rp.mCamera || "", shader: acc.mInfo.mShader?.mKey ?? "-", tag: Array.from(acc.mInfo.mTag ?? []),
            };
            rpRow.push(row);
            sumCPU += acc.mCPUAcc / n;
            if (gpu > 0)
                sumGPU += gpu;
            sumDraw += acc.mDrawAcc / n;
            sumTri += acc.mTriAcc / n;
            const bi = Math.max(0, probe.mBrush.findIndex((b) => b.mRenInfoMap.get(acc.mKey.replace(/^b\d+:/, "")) === acc.mInfo));
            if (rp.mCamera && !probe.mBrush[bi].mCameraMap.has(rp.mCamera))
                warn("error", "missing-camera", acc.mKey, `카메라 '${rp.mCamera}' 가 brush에 없음`);
            if (rp.mRenderTarget && res.Find(rp.mRenderTarget) == null)
                warn("error", "missing-rt", acc.mKey, `렌더타겟 '${rp.mRenderTarget}' 리소스가 없음`);
            if (!acc.mInfo.mShow && row.paints > 0)
                warn("info", "rp-disabled", acc.mKey, `페인트 ${row.paints}개가 있지만 RP가 꺼져 있어(mShow=false) 그려지지 않음`);
            if (acc.mInfo.mShow && row.paints > 0 && acc.mRender == 0) {
                if (acc.mInfo.mSleep != null || (rp.mCycle ?? 0) > 0)
                    warn("info", "rp-sleeping", acc.mKey, `주기 실행 RP(cycle/sleep)라 측정 ${n}프레임 동안 렌더되지 않음. frame을 늘려 다시 재면 잡힌다`);
                else
                    warn("warn", "not-rendered", acc.mKey, `페인트 ${row.paints}개가 있는데 측정 ${n}프레임 동안 한 번도 렌더되지 않음`);
            }
            if (acc.mRender > 0 && acc.mDrawAcc == 0)
                warn("info", "no-draw", acc.mKey, "렌더 구간은 돌았지만 드로우콜이 0 (클리어/블릿만 하거나 컬링으로 전부 걸러짐)");
            if (acc.mDrawAcc / n >= 200 && acc.mTriAcc / acc.mDrawAcc < 50)
                warn("warn", "many-small-draws", acc.mKey, `드로우콜 ${R(acc.mDrawAcc / n, 0)}/프레임, 드로우당 삼각형 ${R(acc.mTriAcc / acc.mDrawAcc, 1)} (배칭/인스턴싱 확인)`);
        }
        const gpuRP = rpRow.filter((r) => r.gpu > 0).length;
        for (const row of rpRow) {
            if (gpuRP >= 2 && sumGPU >= 1 && row.gpu >= sumGPU * 0.5)
                warn("warn", "gpu-dominant", row.key, `GPU ${row.gpu}ms가 전체 ${R(sumGPU)}ms의 ${Math.round(row.gpu / sumGPU * 100)}%`);
        }
        if (sumDraw > 1000)
            warn("warn", "high-draw", "total", `프레임당 드로우콜 ${Math.round(sumDraw)}`);
        const gl = probe.mGL;
        if (gl != null) {
            const errs = GLErrorTake(gl);
            glTaken = errs;
            if (errs.length > 0)
                warn("error", "gl-error", "gl", `gl.getError: ${errs.join(",")}`);
            if (gl.isContextLost())
                warn("error", "context-lost", "gl", "WebGL 컨텍스트 손실");
        }
        let sumPaintCPU = 0;
        for (const [id, arr] of paintMap) {
            const paint = arr[0].paint;
            const row = { id, owner: arr[0].owner, type: arr[0].type, rp: arr.length, draw: 0, tri: 0, vert: 0, cpu: 0, gpu: -1, geoByte: 0, texByte: 0, missingTex: [] };
            const mesh = new Set();
            const tex = new Set();
            const addTex = (k) => {
                if (!k || tex.has(k))
                    return;
                tex.add(k);
                const t = res.Find(k);
                if (t instanceof CTexture)
                    row.texByte += TexByte(t);
                else if (t == null)
                    row.missingTex.push(k);
            };
            for (const e of arr) {
                row.cpu += e.cpu;
                if (!e.show)
                    continue;
                const bi = Math.max(0, probe.mBrush.findIndex((b) => b.mRenInfoMap.get(e.key.replace(/^b\d+:/, "")) != null));
                const shader = probe.mBrush[bi].mRenInfoMap.get(e.key.replace(/^b\d+:/, ""))?.mShader;
                let tri = 0;
                for (const b of (shader != null ? paint.mBatchMap.get(shader) : null) ?? []) {
                    if (b == null || b.mMesh == null)
                        continue;
                    const m = b.mMesh;
                    tri += Math.floor((m.iNum > 0 ? m.iNum : m.vNum) / 3);
                    row.draw++;
                    row.vert += m.vNum;
                    if (!mesh.has(m)) {
                        mesh.add(m);
                        row.geoByte += GeoByte(m, shader);
                    }
                    for (const k of b.mTextureKey ?? [])
                        addTex(k);
                }
                row.tri += tri;
                entryTri.set(e, tri);
                const rt = rpTri.get(e.key) ?? { tri: 0, count: 0 };
                rt.tri += tri;
                rt.count++;
                rpTri.set(e.key, rt);
            }
            for (const k of paint.GetTexture?.() ?? [])
                addTex(k);
            sumPaintCPU += row.cpu;
            paintRow.push(row);
            if (row.missingTex.length > 0)
                warn("error", "missing-texture", `${row.owner}(${row.type})`, `리소스에 없는 텍스처: ${row.missingTex.slice(0, 5).join(", ")}`);
        }
        for (const row of paintRow) {
            for (const e of paintMap.get(row.id)) {
                const acc = rpRow.find((r) => r.key == e.key);
                const rt = rpTri.get(e.key);
                if (!e.show || acc == null || acc.rendered == 0 || acc.gpu < 0 || rt == null || rt.count === 0)
                    continue;
                const g = acc.gpu * (rt.tri > 0 ? (entryTri.get(e) ?? 0) / rt.tri : 1 / rt.count);
                row.gpu = Math.max(0, row.gpu) + g;
            }
            row.cpu = R(row.cpu);
            row.geoByte = Math.round(row.geoByte);
            row.texByte = Math.round(row.texByte);
            if (row.gpu >= 0)
                row.gpu = R(row.gpu);
            if (sumPaintCPU >= 1 && row.cpu >= sumPaintCPU * 0.3 && row.cpu >= 1)
                warn("warn", "paint-hot", `${row.owner}(${row.type})`, `페인트 CPU ${row.cpu}ms가 페인트 합계 ${R(sumPaintCPU)}ms의 ${Math.round(row.cpu / sumPaintCPU * 100)}%`);
        }
        totals = { cpu: R(sumCPU), gpu: gpuOn ? R(sumGPU) : -1, draw: R(sumDraw, 1), tri: Math.round(sumTri), rp: rpRow.length, paint: paintRow.length, measuredFrames: probe.mCount, gpuFrames: probe.mGPUCount };
        probe.Release();
    }
    if (info.has("summary")) {
        const st = Status();
        let subjects = 0;
        for (const can of atl.mCanvasMap.values())
            subjects += can.mSubMap.size;
        const el = frame.Win()?.Handle?.();
        out.summary = {
            frame: st.frame, fps: st.fps, deltaTime: st.deltaTime, pause: st.pause, visible: st.visible,
            canvas: atl.mCanvasMap.size, subjectRoot: subjects, brush: brush.length,
            screen: el ? [el.width, el.height] : null, gpuTimer: probe ? probe.mExt != null : null, totals,
        };
    }
    if (info.has("rp")) {
        const sort = _opt.sort ?? (totals && totals.gpu >= 0 ? "gpu" : "cpu");
        out.rp = rpRow.filter((r) => Match(r.key, _opt.key)).sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0)).slice(0, top);
        out.rpTotal = rpRow.length;
    }
    if (info.has("paint")) {
        const sort = _opt.sort ?? (totals && totals.gpu >= 0 ? "gpu" : "cpu");
        out.paint = paintRow.filter((r) => Match(`${r.owner} ${r.type}`, _opt.key)).sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0)).slice(0, top);
        out.paintTotal = paintRow.length;
    }
    if (info.has("frame")) {
        const cut = (_order) => _order.map((o) => ({
            priority: o.priority,
            lists: o.lists.map((l) => ({ list: l.list, total: l.total, rows: l.rows.filter((r) => Match(r.key, _opt.key)).slice(0, 50) })),
        }));
        out.frame = cut(renData.order);
    }
    if (info.has("anomaly")) {
        const rank = { error: 0, warn: 1, info: 2 };
        out.anomaly = anomaly.sort((a, b) => rank[a.level] - rank[b.level]);
    }
    if (info.has("scene"))
        out.scene = SceneReport(atl, _opt);
    if (info.has("resource"))
        out.resource = ResourceReport(frame, top, _opt.key, brush);
    if (info.has("error"))
        out.error = ErrorReport(frame, glTaken);
    return out;
}
function SubjectNode(_sub, _depth, _budget) {
    _budget.left--;
    const p = _sub.GetPos?.();
    const node = {
        key: _sub.Key?.() ?? _sub.mKey, type: _sub.constructor?.name, enable: _sub.IsEnable?.(),
        pos: p ? [R(p.x, 2), R(p.y, 2), R(p.z, 2)] : null, comp: (_sub.mComArr ?? []).map((c) => c.constructor?.name),
    };
    const child = _sub.mChild ?? [];
    if (child.length > 0) {
        if (_depth <= 0 || _budget.left <= 0)
            node.childCount = child.length;
        else {
            node.child = [];
            for (const c of child) {
                if (_budget.left <= 0) {
                    node.childCut = child.length - node.child.length;
                    break;
                }
                node.child.push(SubjectNode(c, _depth - 1, _budget));
            }
        }
    }
    return node;
}
function SceneReport(_atl, _opt) {
    const maxNode = _opt.maxNode ?? 200;
    const depth = _opt.depth ?? 3;
    const out = [];
    for (const [key, can] of _atl.mCanvasMap) {
        const c = { key, camera: can.GetCameraKey?.(), pause: can.IsPause?.(), subjectRoot: can.mSubMap.size };
        if (_opt.key && _opt.key.length > 0) {
            const found = [];
            const walk = (_sub, _path) => {
                const k = _sub.Key?.() ?? _sub.mKey ?? "";
                const comp = (_sub.mComArr ?? []).map((x) => x.constructor?.name);
                const path = _path ? `${_path}/${k}` : k;
                if (found.length < maxNode && Match(`${k} ${_sub.constructor?.name} ${comp.join(" ")}`, _opt.key)) {
                    const n = SubjectNode(_sub, 0, { left: 1 });
                    n.path = path;
                    delete n.childCount;
                    found.push(n);
                }
                for (const ch of _sub.mChild ?? [])
                    walk(ch, path);
            };
            for (const sub of can.mSubMap.values())
                walk(sub, "");
            c.found = found;
        }
        else {
            const budget = { left: maxNode };
            c.tree = [];
            for (const sub of can.mSubMap.values()) {
                if (budget.left <= 0) {
                    c.cut = can.mSubMap.size - c.tree.length;
                    break;
                }
                c.tree.push(SubjectNode(sub, depth - 1, budget));
            }
        }
        out.push(c);
    }
    return out;
}
function ResourceUser(_brush) {
    const map = new Map();
    const get = (k) => {
        let v = map.get(k);
        if (v == null) {
            v = { rp: [], paint: [] };
            map.set(k, v);
        }
        return v;
    };
    _brush.forEach((brush, bi) => {
        for (const [key, info] of brush.mRenInfoMap) {
            const rt = info.mRP?.mRenderTarget;
            if (rt)
                get(rt).rp.push(_brush.length > 1 ? `b${bi}:${key}` : key);
        }
    });
    const seen = new Set();
    for (const e of CollectRen(null, _brush).ren) {
        if (e.paint == null || seen.has(e.paint))
            continue;
        seen.add(e.paint);
        const keys = new Set(e.paint.GetTexture?.() ?? []);
        for (const arr of e.paint.mBatchMap?.values() ?? [])
            for (const b of arr ?? [])
                for (const k of b?.mTextureKey ?? [])
                    keys.add(k);
        for (const k of keys) {
            const v = get(k);
            if (v.paint.length < 10)
                v.paint.push(`${e.owner}(${e.type})`);
        }
    }
    return map;
}
function ResourceDetail(_key, _v, _user) {
    const d = { key: _key, type: _v?.constructor?.name ?? typeof _v };
    if (_v instanceof CTexture) {
        d.size = [_v.GetWidth(), _v.GetHeight()];
        d.orgSize = _v.HasOrg() ? [_v.GetOrgWidth(), _v.GetOrgHeight()] : null;
        d.layer = (_v.GetInfo() ?? []).map((i) => ({
            target: i.mTarget == CTexture.eTarget.Cube ? "Cube" : i.mTarget == CTexture.eTarget.Array ? "Array" : "2D",
            format: i.mFormat == CTexture.eFormat.RGBA32F ? "RGBA32F" : "RGBA8", count: i.mCount ?? 1,
        }));
        d.mipmap = _v.GetMipMap() != CTexture.eMipmap.None;
        d.renderTarget = _v.IsFrameBuf();
        d.depth = _v.mDepthBuf != null;
        d.autoResize = _v.GetAutoResize?.();
        d.byte = Math.round(TexByte(_v));
        d.cpuBuf = _v.mBuffer?.length ?? 0;
    }
    else if (_v != null && typeof _v == "object") {
        if (_v.vNum != null) {
            d.vertex = _v.vNum;
            d.index = _v.iNum;
            d.triangle = Math.floor((_v.iNum > 0 ? _v.iNum : _v.vNum) / 3);
        }
        if (_v.mKey != null)
            d.mKey = _v.mKey;
    }
    const u = _user.get(_key);
    d.usedByRP = u?.rp ?? [];
    d.usedByPaint = u?.paint ?? [];
    return d;
}
function ResourceReport(_frame, _top, _filter, _brush) {
    const res = _frame.Res();
    const type = new Map();
    const tex = [];
    let texByte = 0;
    for (const [key, v] of res.mResMap) {
        const t = v?.constructor?.name ?? typeof v;
        type.set(t, (type.get(t) ?? 0) + 1);
        if (v instanceof CTexture) {
            const byte = TexByte(v);
            texByte += byte;
            tex.push({ key, size: `${v.GetWidth()}x${v.GetHeight()}`, byte: Math.round(byte) });
        }
    }
    tex.sort((a, b) => b.byte - a.byte);
    const out = { count: res.mResMap.size, type: Object.fromEntries(type), texByte: Math.round(texByte), texTop: tex.slice(0, _top) };
    if (_filter && _filter.length > 0) {
        const user = ResourceUser(_brush ?? []);
        const hit = Array.from(res.mResMap.entries()).filter(([k]) => Match(k, _filter));
        out.matched = hit.length;
        out.detail = hit.slice(0, _top).map(([k, v]) => ResourceDetail(k, v, user));
    }
    return out;
}
function ErrorReport(_frame, _taken = []) {
    const gl = _frame.Dev().GL();
    const glError = _taken.concat(GLErrorTake(gl));
    return { glError, contextLost: gl ? gl.isContextLost() : null, captured: gErrorLog.slice(-20) };
}
const gViewID = "aitool-view";
function ReadTex(_tex, _layer) {
    const gl = CFrame.Main().Dev().GL();
    if (gl == null)
        return { error: "GL 컨텍스트 없음" };
    const infos = _tex.GetInfo() ?? [];
    let idx = _layer, infoIndex = -1, sub = 0;
    for (let i = 0; i < infos.length; ++i) {
        const c = infos[i].mTarget == CTexture.eTarget.Cube ? 6 : infos[i].mTarget == CTexture.eTarget.Array ? (infos[i].mCount ?? 1) : 1;
        if (idx < c) {
            infoIndex = i;
            sub = idx;
            break;
        }
        idx -= c;
    }
    if (infoIndex < 0)
        return { error: `layer ${_layer} 범위 밖` };
    const info = infos[infoIndex];
    const gbuf = _tex.GetGBuf()?.[infoIndex];
    if (gbuf == null)
        return { error: "GPU 텍스처가 아직 만들어지지 않음" };
    const w = _tex.GetWidth(), h = _tex.GetHeight();
    const float = info.mFormat == CTexture.eFormat.RGBA32F;
    for (let i = 0; i < 10; ++i) {
        const e = gl.getError();
        if (e == 0)
            break;
        gGLPending.push(e);
    }
    const prev = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    try {
        if (info.mTarget == CTexture.eTarget.Cube)
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + sub, gbuf, 0);
        else if (info.mTarget == CTexture.eTarget.Array)
            gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gbuf, 0, sub);
        else
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, gbuf, 0);
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status != gl.FRAMEBUFFER_COMPLETE)
            return { error: `읽을 수 없는 텍스처(framebuffer status ${status}). 깊이/압축 포맷일 수 있다` };
        const data = float ? new Float32Array(w * h * 4) : new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, float ? gl.FLOAT : gl.UNSIGNED_BYTE, data);
        const err = gl.getError();
        if (err != 0)
            return { error: `readPixels gl error ${err}` };
        return { w, h, float, data };
    }
    finally {
        gl.bindFramebuffer(gl.FRAMEBUFFER, prev);
        gl.deleteFramebuffer(fb);
    }
}
function TexStat(_data, _float) {
    const min = [Infinity, Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity, -Infinity], sum = [0, 0, 0, 0];
    let nonZero = 0, nan = 0;
    const n = _data.length / 4;
    for (let i = 0; i < n; ++i) {
        let nz = false;
        for (let c = 0; c < 4; ++c) {
            const v = _data[i * 4 + c];
            if (v !== v) {
                nan++;
                continue;
            }
            if (v < min[c])
                min[c] = v;
            if (v > max[c])
                max[c] = v;
            sum[c] += v;
            if (v !== 0)
                nz = true;
        }
        if (nz)
            nonZero++;
    }
    const d = _float ? 4 : 1;
    return {
        min: min.map((v) => R(v, d)), max: max.map((v) => R(v, d)), avg: sum.map((v) => R(v / n, d)),
        nonZeroRatio: R(nonZero / n, 4), nan,
    };
}
function ViewShow(_key, _opt = {}) {
    const frame = CFrame.Main();
    if (frame == null)
        return { error: "CFrame 없음" };
    const tex = frame.Res().Find(_key);
    if (!(tex instanceof CTexture)) {
        const near = Array.from(frame.Res().mResMap.keys()).filter((k) => Match(k, [_key.split("/").pop()])).slice(0, 10);
        return { error: `텍스처 '${_key}' 없음`, candidate: near };
    }
    const r = ReadTex(tex, _opt.layer ?? 0);
    if (r.error)
        return { key: _key, error: r.error };
    const { w, h, float, data } = r;
    const lo = _opt.range?.[0] ?? 0, hi = _opt.range?.[1] ?? (float ? 1 : 255);
    const scaleV = 255 / (hi - lo || 1);
    const img = new ImageData(w, h);
    for (let y = 0; y < h; ++y) {
        const s = (h - 1 - y) * w * 4, o = y * w * 4;
        for (let x = 0; x < w * 4; x += 4) {
            for (let c = 0; c < 3; ++c)
                img.data[o + x + c] = Math.max(0, Math.min(255, (data[s + x + c] - lo) * scaleV));
            img.data[o + x + 3] = _opt.alpha ? Math.max(0, Math.min(255, (data[s + x + 3] - lo) * scaleV)) : 255;
        }
    }
    const src = document.createElement("canvas");
    src.width = w;
    src.height = h;
    src.getContext("2d").putImageData(img, 0, 0);
    const max = _opt.maxSize ?? 512;
    const scale = Math.min(1, max / Math.max(w, h));
    const dw = Math.max(1, Math.round(w * scale)), dh = Math.max(1, Math.round(h * scale));
    ViewHide();
    const cv = document.createElement("canvas");
    cv.id = gViewID;
    cv.width = dw;
    cv.height = dh;
    cv.style.cssText = `position:fixed;left:${_opt.x ?? 0}px;top:${_opt.y ?? 0}px;width:${dw}px;height:${dh}px;z-index:2147483647;pointer-events:none;image-rendering:pixelated;`;
    const ctx = cv.getContext("2d");
    if (_opt.alpha) {
        for (let y = 0; y < dh; y += 8)
            for (let x = 0; x < dw; x += 8) {
                ctx.fillStyle = ((x + y) / 8) % 2 == 0 ? "#bbb" : "#fff";
                ctx.fillRect(x, y, 8, 8);
            }
    }
    ctx.drawImage(src, 0, 0, dw, dh);
    document.body.appendChild(cv);
    const b = cv.getBoundingClientRect();
    return {
        ok: true, key: _key, layer: _opt.layer ?? 0, texSize: [w, h], format: float ? "RGBA32F" : "RGBA8", scale: R(scale, 3),
        rect: { x: Math.round(b.left), y: Math.round(b.top), width: Math.round(b.width), height: Math.round(b.height) },
        stat: TexStat(data, float),
        priorGlError: gGLPending.slice(),
        note: "rect를 browser.js screenshot의 clip으로 쓴다. 끝나면 AITool.View.Hide()",
    };
}
function ViewHide() {
    const el = document.getElementById(gViewID);
    el?.remove();
    return el != null;
}
function FindCamera(_name) {
    const all = [];
    for (const brush of BrushList())
        for (const [k, c] of brush.mCameraMap)
            all.push([k, c]);
    const hit = all.find(([k]) => k === _name) ?? all.find(([k]) => Match(k, [_name]));
    return { cam: hit?.[1] ?? null, key: hit?.[0] ?? null, candidate: all.map(([k]) => k).slice(0, 20) };
}
function ScreenPoint(_p, _wmat, _cam) {
    const w = CMath.V3MulMatCoordi(_p, _wmat);
    const v = CMath.V3MulMatCoordi(w, _cam.GetViewMat());
    const n = CMath.V3MulMatCoordi(v, _cam.GetProjMat());
    return [n.x, n.y, n.z];
}
function Screen(_opt = {}) {
    const atl = CAtelier.Main();
    const frame = CFrame.Main();
    if (atl == null || frame == null)
        return { error: "엔진이 시작되지 않았다" };
    const el = frame.Win()?.Handle?.();
    if (el == null)
        return { error: "캔버스 엘리먼트 없음" };
    const cr = el.getBoundingClientRect();
    const top = _opt.top ?? 10;
    const out = [];
    const camOver = _opt.camera ? FindCamera(_opt.camera) : null;
    if (camOver && camOver.cam == null)
        return { error: `카메라 '${_opt.camera}' 없음`, candidate: camOver.candidate };
    const toPx = (n) => [cr.left + (n[0] + 1) / 2 * cr.width, cr.top + (1 - n[1]) / 2 * cr.height];
    const walk = (_sub, _can, _path) => {
        if (out.length >= top)
            return;
        const k = _sub.Key?.() ?? _sub.mKey ?? "";
        const comp = (_sub.mComArr ?? []).map((x) => x.constructor?.name);
        const path = _path ? `${_path}/${k}` : k;
        if (Match(`${k} ${_sub.constructor?.name} ${comp.join(" ")}`, _opt.key)) {
            const item = { path, type: _sub.constructor?.name, comp };
            const paint = (_sub.mComArr ?? []).find((c) => c.mRenPT && c.mRenPT.length > 0);
            const cam = camOver?.cam ?? paint?.mRenPT[0]?.mCam ?? _can.GetCam?.();
            const wm = _sub.GetMat?.();
            if (cam == null || wm == null)
                item.error = "카메라 또는 월드 행렬 없음";
            else {
                try {
                    const c = ScreenPoint(new CVec3(0, 0, 0), wm, cam);
                    const [px, py] = toPx(c);
                    item.onScreen = Math.abs(c[0]) <= 1 && Math.abs(c[1]) <= 1 && Math.abs(c[2]) <= 1;
                    item.ndc = [R(c[0], 3), R(c[1], 3), R(c[2], 3)];
                    item.uv = [R((c[0] + 1) / 2, 4), R((1 - c[1]) / 2, 4)];
                    if (!camOver) {
                        item.center = { x: R(px, 1), y: R(py, 1) };
                        item.centerCanvas = { x: R(px - cr.left, 1), y: R(py - cr.top, 1) };
                    }
                    const bound = camOver ? null : paint?.GetBound?.();
                    const mn = bound?.mMin, mx = bound?.mMax;
                    if (mn && mx && Math.abs(mn.x) < 1e20 && Math.abs(mx.x) < 1e20 && mx.x > mn.x) {
                        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, ok = true;
                        for (const cx of [mn.x, mx.x])
                            for (const cy of [mn.y, mx.y])
                                for (const cz of [mn.z, mx.z]) {
                                    const n = ScreenPoint(new CVec3(cx, cy, cz), wm, cam);
                                    if (Math.abs(n[2]) > 1)
                                        ok = false;
                                    const [qx, qy] = toPx(n);
                                    x0 = Math.min(x0, qx);
                                    y0 = Math.min(y0, qy);
                                    x1 = Math.max(x1, qx);
                                    y1 = Math.max(y1, qy);
                                }
                        if (ok) {
                            item.rect = { x: Math.round(x0), y: Math.round(y0), width: Math.round(x1 - x0), height: Math.round(y1 - y0) };
                            const cx0 = Math.max(cr.left, x0), cy0 = Math.max(cr.top, y0), cx1 = Math.min(cr.right, x1), cy1 = Math.min(cr.bottom, y1);
                            if (cx1 - cx0 >= 2 && cy1 - cy0 >= 2)
                                item.clip = { x: Math.floor(cx0), y: Math.floor(cy0), width: Math.ceil(cx1 - cx0), height: Math.ceil(cy1 - cy0) };
                        }
                    }
                }
                catch (e) {
                    item.error = String(e);
                }
            }
            out.push(item);
        }
        for (const ch of _sub.mChild ?? [])
            walk(ch, _can, path);
    };
    for (const [ckey, can] of atl.mCanvasMap) {
        if (_opt.canvas && ckey != _opt.canvas)
            continue;
        for (const sub of can.mSubMap.values())
            walk(sub, can, "");
    }
    return {
        canvasRect: { x: Math.round(cr.left), y: Math.round(cr.top), width: Math.round(cr.width), height: Math.round(cr.height) },
        count: out.length, subject: out,
        note: "center/rect/clip은 페이지 CSS px. clip은 캔버스 안으로 자른 값으로 browser.js screenshot clip에 바로 쓴다",
    };
}
const gDenyKey = new Set(["mFrame", "mCanvas", "mBrush", "mRes", "mDev", "mRenderer", "mWindow", "mInput", "mSoundMgr"]);
function Tag(_o) {
    let k = "";
    try {
        k = _o.Key?.() ?? _o.mKey ?? "";
    }
    catch { }
    return `<${_o?.constructor?.name ?? typeof _o}${k ? " " + k : ""}>`;
}
function Handle(_kind, _path, _ref, _extra = {}) {
    const h = { kind: _kind, path: _path, type: _ref?.constructor?.name ?? typeof _ref };
    Object.defineProperty(h, "ref", { value: _ref, enumerable: false });
    for (const k in _extra)
        Object.defineProperty(h, k, { value: _extra[k], enumerable: false });
    return h;
}
function WalkSubject(_atl, _fn) {
    for (const [, can] of _atl.mCanvasMap) {
        const rec = (_sub, _path) => {
            const k = _sub.Key?.() ?? _sub.mKey ?? "";
            const p = _path ? `${_path}/${k}` : k;
            if (_fn(_sub, can, p) === true)
                return true;
            for (const ch of _sub.mChild ?? [])
                if (rec(ch, p))
                    return true;
            return false;
        };
        for (const sub of can.mSubMap.values())
            if (rec(sub, ""))
                return;
    }
}
function FindTarget(_query, _top = 10) {
    const atl = CAtelier.Main();
    if (atl == null)
        return [];
    let kind = "subject", q = _query.trim();
    const m = /^(subject|canvas|cam|camera|rp|res|resource):(.*)$/.exec(q);
    if (m) {
        kind = m[1];
        q = m[2];
    }
    const filter = q ? [q] : [];
    const out = [];
    if (kind == "canvas") {
        for (const [k, can] of atl.mCanvasMap)
            if (Match(k, filter))
                out.push(Handle("canvas", k, can));
    }
    else if (kind == "cam" || kind == "camera") {
        for (const brush of BrushList())
            for (const [k, c] of brush.mCameraMap)
                if (Match(k, filter))
                    out.push(Handle("camera", k, c));
    }
    else if (kind == "rp") {
        for (const brush of BrushList())
            for (const [k, info] of brush.mRenInfoMap)
                if (Match(k, filter))
                    out.push(Handle("rp", k, info));
    }
    else if (kind == "res" || kind == "resource") {
        const res = CFrame.Main()?.Res();
        for (const [k, v] of res?.mResMap ?? [])
            if (Match(k, filter))
                out.push(Handle("resource", k, v));
    }
    else {
        let compName = null;
        const at = q.lastIndexOf("@");
        if (at >= 0) {
            compName = q.slice(at + 1);
            q = q.slice(0, at);
        }
        const exact = [], part = [];
        WalkSubject(atl, (sub, can, path) => {
            if (exact.length + part.length >= 300)
                return true;
            const k = sub.Key?.() ?? sub.mKey ?? "";
            const type = sub.constructor?.name ?? "";
            const isExact = q !== "" && (k === q || path === q);
            if (q !== "" && !isExact && !Match(`${path} ${type}`, [q]))
                return;
            const comp = (sub.mComArr ?? []);
            if (compName != null) {
                comp.forEach((c, i) => {
                    const cn = c.constructor?.name ?? "";
                    if (cn === compName || Match(cn, [compName]))
                        (isExact ? exact : part).push(Handle("comp", `${path}@${cn}`, c, { owner: sub, canvas: can }));
                });
            }
            else
                (isExact ? exact : part).push(Handle("subject", path, sub, { canvas: can }));
        });
        out.push(...exact, ...part);
        for (const h of out)
            if (h.kind == "subject")
                h.comp = (h.ref.mComArr ?? []).map((c) => c.constructor?.name);
    }
    return out.slice(0, _top);
}
function Find(_query, _opt = {}) {
    const list = FindTarget(_query, _opt.top ?? 10);
    return { query: _query, count: list.length, item: list };
}
function Resolve(_target) {
    if (_target == null)
        return null;
    if (typeof _target == "string")
        return FindTarget(_target, 1)[0] ?? null;
    if (typeof _target == "object" && _target.kind && _target.path && _target.ref !== undefined)
        return _target;
    if (IsSubjectLike(_target)) {
        const atl = CAtelier.Main();
        let can = null, path = Tag(_target);
        if (atl != null)
            WalkSubject(atl, (s, c, p) => { if (s === _target) {
                can = c;
                path = p;
                return true;
            } });
        return Handle("subject", path, _target, { canvas: can });
    }
    return Handle("object", Tag(_target), _target);
}
function GetPath(_obj, _path) {
    let cur = _obj;
    for (const part of _path.replace(/\[(\d+)\]/g, ".$1").split(".")) {
        if (part === "")
            continue;
        if (cur == null)
            return undefined;
        cur = cur[part];
    }
    return cur;
}
function Ser(_v, _depth, _o, _seen = new Set()) {
    if (_v === null || _v === undefined)
        return null;
    const t = typeof _v;
    if (t == "number")
        return Number.isFinite(_v) ? R(_v, 4) : String(_v);
    if (t == "boolean")
        return _v;
    if (t == "string")
        return _v.length > 120 ? _v.slice(0, 120) + "…" : _v;
    if (t == "function")
        return undefined;
    if (t != "object")
        return String(_v);
    if (_seen.has(_v))
        return `<순환 ${Tag(_v)}>`;
    if (_o.left-- <= 0)
        return "…";
    if (_v.mF32A instanceof Float32Array) {
        const a = Array.from(_v.mF32A).map((x) => R(x, 4));
        if (a.length != 16)
            return a;
        let pos = null;
        try {
            const p = CMath.V3MulMatCoordi(new CVec3(0, 0, 0), _v);
            pos = [R(p.x, 3), R(p.y, 3), R(p.z, 3)];
        }
        catch { }
        return { mat: a, pos };
    }
    if (ArrayBuffer.isView(_v)) {
        const n = _v.length;
        return n <= 16 ? Array.from(_v).map((x) => R(x, 4)) : { type: _v.constructor.name, length: n };
    }
    if (typeof Node != "undefined" && _v instanceof Node)
        return `<${_v.nodeName}>`;
    if (Array.isArray(_v)) {
        if (_depth <= 0)
            return `[${_v.length}]`;
        _seen.add(_v);
        const a = _v.slice(0, _o.arr).map((x) => Ser(x, _depth - 1, _o, _seen));
        _seen.delete(_v);
        if (_v.length > _o.arr)
            a.push(`…+${_v.length - _o.arr}`);
        return a;
    }
    if (_v instanceof Map) {
        if (_depth <= 0)
            return `Map(${_v.size})`;
        _seen.add(_v);
        const o = { __map: _v.size };
        let i = 0;
        for (const [k, v] of _v) {
            if (i++ >= _o.arr) {
                o["…"] = `+${_v.size - _o.arr}`;
                break;
            }
            o[String(k)] = Ser(v, _depth - 1, _o, _seen);
        }
        _seen.delete(_v);
        return o;
    }
    if (_v instanceof Set) {
        if (_depth <= 0)
            return `Set(${_v.size})`;
        return { __set: _v.size, value: Array.from(_v).slice(0, _o.arr).map((x) => Ser(x, _depth - 1, _o, _seen)) };
    }
    if (_depth <= 0)
        return Tag(_v);
    _seen.add(_v);
    const o = { __type: _v.constructor?.name ?? "Object" };
    for (const k of Object.keys(_v)) {
        if (gDenyKey.has(k)) {
            o[k] = Tag(_v[k]);
            continue;
        }
        let s;
        try {
            s = Ser(_v[k], _depth - 1, _o, _seen);
        }
        catch (e) {
            s = `ERR ${e}`;
        }
        if (s !== undefined)
            o[k] = s;
    }
    _seen.delete(_v);
    return o;
}
function VecOf(_v) {
    return _v?.mF32A ? [R(_v.mF32A[0], 3), R(_v.mF32A[1], 3), R(_v.mF32A[2], 3)] : null;
}
function IsSubjectLike(_o) {
    return _o != null && Array.isArray(_o.mComArr) && Array.isArray(_o.mChild) && typeof _o.GetMat == "function";
}
function SubjectFacts(_sub, _can) {
    const anomaly = [];
    const warn = (_level, _code, _msg) => {
        if (!anomaly.some((a) => a.code === _code && a.msg === _msg))
            anomaly.push({ level: _level, code: _code, msg: _msg });
    };
    const res = CFrame.Main()?.Res();
    const f = {
        enable: _sub.IsEnable?.(), selfEnable: _sub.mEnable, parentEnable: _sub.mPEnable, destroyed: _sub.IsDestroy?.(),
        canvas: _can ? Array.from(CAtelier.Main().mCanvasMap.entries()).find(([, c]) => c === _can)?.[0] : null,
        local: VecOf(_sub.GetPos?.()), scale: VecOf(_sub.mSca), rotation: VecOf(_sub.mRot),
    };
    let wm = null;
    try {
        wm = _sub.GetMat();
        const w = CMath.V3MulMatCoordi(new CVec3(0, 0, 0), wm);
        f.world = [R(w.x, 3), R(w.y, 3), R(w.z, 3)];
    }
    catch {
        f.world = null;
    }
    f.matPending = _sub.mUpdateMat;
    if (_sub.mEnable === false)
        warn("error", "disabled", "서브젝트가 꺼져 있다(SetEnable(false))");
    else if (_sub.mPEnable === false)
        warn("error", "parent-disabled", "부모 서브젝트가 꺼져 있다");
    if (f.destroyed)
        warn("error", "destroyed", "삭제됐거나 풀에 반환(Recycle)된 서브젝트");
    if (f.scale && f.scale.some((v) => v === 0))
        warn("warn", "scale-zero", `스케일에 0이 있다 ${JSON.stringify(f.scale)}`);
    f.comp = (_sub.mComArr ?? []).map((c) => ({ type: c.constructor?.name, enable: c.IsEnable?.() }));
    const paint = (_sub.mComArr ?? []).filter((c) => Array.isArray(c.mRenPT));
    f.paint = [];
    if (paint.length == 0)
        warn("info", "no-paint", "그리는 컴포넌트(페인트)가 없다");
    for (const p of paint) {
        const pf = { type: p.constructor?.name, enable: p.IsEnable?.(), ren: [] };
        if (p.IsEnable?.() === false && _sub.IsEnable?.())
            warn("error", "paint-disabled", `${pf.type} 컴포넌트가 꺼져 있다`);
        for (const r of p.mRenPT)
            pf.ren.push({ rp: r.mRenInfoKey, shown: r.mShow === 0, cam: r.mCam ? Tag(r.mCam) : null });
        if (p.mRenPT.length == 0)
            warn("warn", "paint-not-registered", `${pf.type}이 어떤 RP에도 등록되지 않았다(아직 갱신 전이거나 맞는 RP 태그가 없음)`);
        else if (_sub.IsEnable?.() && p.mRenPT.every((r) => r.mShow !== 0))
            warn("warn", "culled", `${pf.type}의 모든 RP에서 mShow!=0(컬링/비표시)`);
        const keys = new Set(p.GetTexture?.() ?? []);
        for (const arr of p.mBatchMap?.values() ?? [])
            for (const b of arr ?? [])
                for (const k of b?.mTextureKey ?? [])
                    keys.add(k);
        const missing = Array.from(keys).filter((k) => k && res?.Find(k) == null);
        if (missing.length > 0) {
            pf.missingTexture = missing;
            warn("error", "texture-missing", `리소스에 없는 텍스처: ${missing.slice(0, 5).join(", ")}`);
        }
        const cam = p.mRenPT[0]?.mCam ?? _can?.GetCam?.();
        if (cam != null && wm != null) {
            try {
                const n = ScreenPoint(new CVec3(0, 0, 0), wm, cam);
                pf.ndc = [R(n[0], 3), R(n[1], 3), R(n[2], 3)];
                pf.onScreen = Math.abs(n[0]) <= 1 && Math.abs(n[1]) <= 1 && Math.abs(n[2]) <= 1;
                const el = CFrame.Main().Win()?.Handle?.();
                if (el) {
                    const cr = el.getBoundingClientRect();
                    pf.screen = { x: R(cr.left + (n[0] + 1) / 2 * cr.width, 1), y: R(cr.top + (1 - n[1]) / 2 * cr.height, 1) };
                }
                if (!pf.onScreen)
                    warn("info", Math.abs(n[2]) > 1 ? "out-of-depth" : "off-screen", `중심이 화면 밖이다 ndc=${JSON.stringify(pf.ndc)}`);
            }
            catch (e) {
                pf.error = String(e);
            }
        }
        f.paint.push(pf);
    }
    return { facts: f, anomaly };
}
const gCallDeny = "허용되지 않음(인자 없는 Get/Is/Has/Key 메서드만)";
function CallAllowed(_obj, _name) {
    const fn = _obj?.[_name];
    return typeof fn == "function" && fn.length == 0 && /^(Get|Is|Has|Key)/.test(_name);
}
function Inspect(_target, _opt = {}) {
    const h = Resolve(_target);
    if (h == null)
        return { error: "대상을 찾지 못했다", query: typeof _target == "string" ? _target : null, hint: "AITool.Find(query)로 후보 확인" };
    const obj = h.ref;
    const o = { arr: _opt.maxArray ?? 8, left: 400 };
    const out = { target: { kind: h.kind, path: h.path, type: h.type } };
    if (_opt.fields && _opt.fields.length > 0) {
        out.fields = {};
        for (const f of _opt.fields) {
            try {
                out.fields[f] = Ser(GetPath(obj, f), _opt.depth ?? 3, o);
            }
            catch (e) {
                out.fields[f] = `ERR ${e}`;
            }
        }
    }
    else if (!_opt.call)
        out.state = Ser(obj, _opt.depth ?? 2, o);
    if (_opt.call && _opt.call.length > 0) {
        out.call = {};
        for (const name of _opt.call) {
            if (!CallAllowed(obj, name)) {
                out.call[name] = gCallDeny;
                continue;
            }
            try {
                out.call[name] = Ser(obj[name](), _opt.depth ?? 3, o);
            }
            catch (e) {
                out.call[name] = `ERR ${e}`;
            }
        }
    }
    if (_opt.facts !== false && h.kind == "subject" && IsSubjectLike(obj)) {
        const fa = SubjectFacts(obj, h.canvas);
        out.facts = fa.facts;
        out.anomaly = fa.anomaly;
    }
    return out;
}
function CallStack() {
    return (new Error().stack ?? "").split("\n").slice(3, 9).map((s) => s.trim().replace(/https?:\/\/[^/\s)]+\//g, ""));
}
async function Track(_target, _opt = {}) {
    const h = Resolve(_target);
    if (h == null)
        return { error: "대상을 찾지 못했다", query: typeof _target == "string" ? _target : null };
    const obj = h.ref;
    let fields = _opt.fields ?? [];
    const denied = (_opt.call ?? []).filter((c) => !CallAllowed(obj, c));
    const call = (_opt.call ?? []).filter((c) => CallAllowed(obj, c));
    if (denied.length > 0 && fields.length == 0 && call.length == 0)
        return { error: gCallDeny, denied };
    if (fields.length == 0 && call.length == 0) {
        if (!IsSubjectLike(obj))
            return { error: "fields 또는 call을 지정해야 한다" };
        fields = ["mPos", "mRot", "mSca"];
    }
    if (!Hook())
        return { error: "프레임 루프에 연결하지 못했다" };
    const n = Math.max(1, Math.floor(_opt.frame ?? 60));
    const timeout = _opt.timeout ?? Math.max(8000, n * 250);
    const maxChange = _opt.maxChange ?? 200;
    const o = { arr: 8, left: 100000 };
    const read = () => {
        const v = {};
        for (const f of fields) {
            try {
                v[f] = JSON.stringify(Ser(GetPath(obj, f), 3, { arr: 8, left: 400 }));
            }
            catch (e) {
                v[f] = JSON.stringify(`ERR ${e}`);
            }
        }
        for (const c of call) {
            try {
                v[`${c}()`] = JSON.stringify(Ser(obj[c](), 3, { arr: 8, left: 400 }));
            }
            catch (e) {
                v[`${c}()`] = JSON.stringify(`ERR ${e}`);
            }
        }
        return v;
    };
    const frameNo = () => CFrame.Main().mUpdate.mOffset;
    const base = read();
    let last = base;
    const changes = [];
    const calls = [];
    const wrap = [];
    for (const name of _opt.stack ?? []) {
        const org = obj[name];
        if (typeof org != "function")
            continue;
        const own = Object.prototype.hasOwnProperty.call(obj, name);
        obj[name] = function (...a) {
            if (calls.length < 100)
                calls.push({ frame: frameNo(), method: name, args: a.map((x) => Ser(x, 1, { arr: 4, left: 40 })), stack: CallStack() });
            return org.apply(this, a);
        };
        wrap.push(() => { if (own)
            obj[name] = org;
        else
            delete obj[name]; });
    }
    let count = 0;
    let finish;
    const wait = new Promise((r) => { finish = r; });
    const cb = () => {
        count++;
        const cur = read();
        for (const k of Object.keys(cur))
            if (cur[k] !== last[k] && changes.length < maxChange)
                changes.push({ frame: frameNo(), field: k, old: JSON.parse(last[k]), new: JSON.parse(cur[k]) });
        last = cur;
        if (count >= n || changes.length >= maxChange) {
            if (gPause)
                gStep = 0;
            finish();
        }
    };
    gFrameEnd.push(cb);
    const timer = setTimeout(() => finish(), timeout);
    if (gPause)
        Step(n, timeout);
    await wait;
    clearTimeout(timer);
    gFrameEnd = gFrameEnd.filter((c) => c !== cb);
    for (const w of wrap)
        w();
    const parse = (v) => { const r = {}; for (const k in v)
        r[k] = JSON.parse(v[k]); return r; };
    return {
        target: { kind: h.kind, path: h.path, type: h.type }, frames: count, startFrame: frameNo() - count,
        baseline: parse(base), final: parse(last), changeCount: changes.length, changes, calls,
        truncated: changes.length >= maxChange, ...(denied.length > 0 ? { denied } : {}),
    };
}
async function Until(_target, _condition, _opt = {}) {
    if (!Hook())
        return { error: "프레임 루프에 연결하지 못했다", paused: false };
    const halt = () => { gPause = true; gStep = 0; };
    const h = Resolve(_target);
    if (h == null) {
        halt();
        return { error: "대상을 찾지 못했다", query: typeof _target == "string" ? _target : null, paused: true };
    }
    let fn;
    try {
        fn = typeof _condition == "function" ? _condition : new Function("o", `return (${_condition});`);
    }
    catch (e) {
        halt();
        return { error: `조건식 오류: ${e}`, paused: true };
    }
    const obj = h.ref;
    const max = Math.max(1, Math.floor(_opt.max ?? 300));
    const timeout = _opt.timeout ?? Math.max(10000, max * 250);
    const detail = (_hit, _err = null) => ({
        hit: _hit, frame: CFrame.Main().mUpdate.mOffset, error: _err, paused: gPause,
        state: Inspect(h, { fields: _opt.fields, call: _opt.call, depth: _opt.depth }),
    });
    try {
        if (fn(obj)) {
            halt();
            return detail(true);
        }
    }
    catch (e) {
        halt();
        return detail(false, `조건 평가 오류: ${e}`);
    }
    let count = 0, hit = false, err = null;
    let finish;
    const wait = new Promise((r) => { finish = r; });
    const cb = () => {
        count++;
        try {
            if (fn(obj))
                hit = true;
        }
        catch (e) {
            err = `조건 평가 오류: ${e}`;
        }
        if (hit || err != null || count >= max) {
            gPause = true;
            gStep = 0;
            finish();
        }
    };
    gFrameEnd.push(cb);
    const timer = setTimeout(() => { gPause = true; gStep = 0; finish(); }, timeout);
    if (gPause)
        Step(max, timeout);
    await wait;
    clearTimeout(timer);
    gFrameEnd = gFrameEnd.filter((c) => c !== cb);
    gPause = true;
    gStep = 0;
    return { ...detail(hit, err), steps: count };
}
function Help() {
    return {
        Find: "(query, {top:10}) 대상 후보 목록. query: 'Player' | 'Player@CPaint3D' | 'canvas:Main' | 'cam:shadow0' | 'rp:Forward' | 'res:Artgine/MainFrame.tex'",
        Inspect: "(target, {fields:[], call:[], depth:2, maxArray:8, facts:true}) 객체 상태 읽기. 서브젝트면 facts(활성/월드 위치/렌더 등록/텍스처/화면)와 anomaly(안 보이는 이유)를 같이 반환",
        Track: "(target, {fields:[], call:[], frame:60, stack:['SetPos'], maxChange:200}) 값이 바뀐 프레임만 반환. call은 인자 없는 Get/Is/Has/Key 메서드만(거부된 것은 denied). stack으로 지정한 메서드의 호출 스택 기록",
        Until: "(target, 'o.GetPos().y<0' | fn, {max:300, fields, call}) 조건이 참이 될 때까지 진행 후 정지, 그 시점 Inspect 반환. 항상 정지 상태로 끝남",
        View: {
            Show: "(textureKey, {layer:0, maxSize:512, alpha:false, range, x:0, y:0}) range 기본 float [0,1], RGBA8 [0,255]. 내부 텍스처를 읽어 통계(min/max/avg/nonZeroRatio)를 반환하고 페이지 위에 오버레이. rect를 browser.js screenshot clip으로 사용",
            Hide: "오버레이 제거",
        },
        Screen: "({key:[], top:10, canvas, camera}) 서브젝트의 화면 좌표(center/rect/clip, 페이지 CSS px). browser.js screenshot clip / input 좌표용. camera를 주면 그 카메라 기준 ndc/uv(그림자 카메라 등)",
        Report: {
            usage: "await AITool.Report({info:[...], frame:30, gpu:true, key:[], top:10, sort:'gpu', depth:3, maxNode:200})",
            info: {
                summary: "프레임/fps/캔버스/브러시 수와 측정 합계(cpu/gpu/draw/tri). 기본",
                anomaly: "자동 판정 이상 징후 목록. 기본",
                rp: "렌더패스별 cpu/gpu/draw/tri/렌더 횟수/렌더타겟/카메라/셰이더",
                paint: "페인트별 cpu/gpu 추정/draw/tri/지오메트리·텍스처 메모리/누락 텍스처",
                frame: "우선순위/리스트별 렌더 순서(측정 없음)",
                scene: "캔버스별 서브젝트 트리. key를 주면 이름/타입/컴포넌트로 검색",
                resource: "리소스 종류별 개수와 큰 텍스처 순위(측정 없음)",
                error: "gl.getError, 컨텍스트 손실, 캡처된 window 에러(측정 없음)",
            },
            option: {
                frame: "측정 프레임 수(기본 30)", gpu: "GPU 쿼리(기본 true, 확장 없으면 자동 off)", key: "이름 부분 일치 필터(rp/paint/frame/scene/resource)",
                top: "rp/paint/resource 상위 N개(기본 10)", sort: "cpu|gpu|draw|tri", depth: "scene 트리 깊이", maxNode: "scene 최대 노드 수",
            },
        },
        Frame: {
            Pause: "엔진 루프 정지. 렌더/업데이트가 멈춘 상태에서 상태를 읽으면 값이 일관된다",
            Resume: "정지/스텝 해제",
            Step: "(count=1, timeout=10000) count 프레임 진행 후 정지. Promise<boolean>",
            SetFPS: "(fps) fps 상한. 0이면 해제",
            Status: "hook/pause/stepLeft/fpsLimit/frame/runFrame(누적, Release해도 유지)/deltaTime/fps/visible",
            Release: "래퍼를 풀고 원래 루프로 복구",
        },
    };
}
export const AITool = {
    Frame: { Pause, Resume, Step, SetFPS, Status, Release },
    Report,
    View: { Show: ViewShow, Hide: ViewHide },
    Screen,
    Find,
    Inspect,
    Track,
    Until,
    Help,
};
globalThis.AITool = AITool;
ErrorHook();

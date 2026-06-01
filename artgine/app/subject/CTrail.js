import { CMath } from "../../geometry/CMath.js";
import { CUtilMath } from "../../geometry/CUtilMath.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CPaintTrail } from "../component/paint/CPaintTrail.js";
import { CSubject } from "./CSubject.js";
export class CTrail extends CSubject {
    mWidth = 50;
    mVCount = 64;
    mLength = 500;
    mFadeTime = 1.0;
    mLastSmall = false;
    mLastHide = true;
    mCam;
    mTrailPaint = null;
    mPosList = [];
    mVList = [];
    mLastVec = null;
    mLastLinePos = 0;
    mLastLinelen = 0;
    mInCurve = false;
    mCorner = null;
    mBCnt = 0;
    mBlen = 0;
    mFlen = 0;
    mEdgeCount = 10;
    mTotalLen = 0;
    mFirstFrame = true;
    constructor(_cam) {
        super();
        this.mCam = _cam;
    }
    Start() {
        super.Start();
        this.mTrailPaint = new CPaintTrail(this.GetFrame().Pal().GetNoneTex());
        this.mTrailPaint.mLastHide = this.mLastHide;
        this.PushComp(this.mTrailPaint);
    }
    Update(_update) {
        super.Update(_update);
        if (this.mFirstFrame) {
            this.mFirstFrame = false;
            return;
        }
        const dt = _update.DeltaTime();
        if (dt > 1)
            return;
        const pos = this.GetPos();
        const prevPos = this.mPosList.length > 0 ? this.mPosList[this.mPosList.length - 1] : null;
        const moved = prevPos !== null && !prevPos.Equals(pos);
        if (!moved)
            this.mInCurve = false;
        if (this.mPosList.length === 0) {
            this.mPosList.push(new CVec3(pos.x, pos.y, pos.z));
            return;
        }
        if (moved) {
            const nvec = CMath.V3SubV3(pos, this.mPosList[this.mPosList.length - 1]);
            let nowvec = CMath.V3Nor(nvec);
            let success = 0;
            if (CMath.V3Dot(nowvec, new CVec3(0, -1, 0)) === 1 && this.mVList.length > 0)
                nowvec = this.mVList[this.mVList.length - 1];
            if (this.mVList.length === 0) {
                if (!this.mPosList[this.mPosList.length - 1].Equals(pos)) {
                    this.mVList.push(nowvec);
                    this.mPosList.push(new CVec3(pos.x, pos.y, pos.z));
                    this.mLastLinelen += CMath.V3Len(nvec);
                    this.mLastVec = nowvec;
                }
            }
            else {
                const size = this.mWidth / 2;
                if (!this.mInCurve) {
                    if (CMath.V3Dot(nowvec, this.mLastVec) > 0.999999) {
                        this.mPosList.push(new CVec3(pos.x, pos.y, pos.z));
                        this.mVList.push(nowvec);
                        this.mLastLinelen += CMath.V3Len(nvec);
                        if (this.mLastLinelen > size * 2 && this.mLastLinePos + 2 < this.mPosList.length) {
                            const delen = CMath.V3Len(CMath.V3SubV3(this.mPosList[this.mLastLinePos + 1], this.mPosList[this.mLastLinePos + 2]));
                            this.mLastLinelen -= delen;
                            this.mPosList.splice(this.mLastLinePos + 1, 1);
                            this.mVList.splice(this.mLastLinePos + 1, 1);
                        }
                    }
                    else {
                        this.mBCnt = 2;
                        this.mCorner = this.mPosList[this.mPosList.length - 1];
                        const pArr = [
                            this.mPosList[this.mPosList.length - 2],
                            this.mCorner,
                            new CVec3(pos.x, pos.y, pos.z)
                        ];
                        this.mPosList[this.mPosList.length - 1] = CUtilMath.Bezier(pArr, 1 / this.mBCnt, 0, 0);
                        this.mVList.push(CMath.V3Nor(CMath.V3SubV3(pos, this.mPosList[this.mPosList.length - 1])));
                        this.mPosList.push(new CVec3(pos.x, pos.y, pos.z));
                        this.mInCurve = true;
                    }
                }
                else {
                    if (this.mBlen >= size) {
                        this.mFlen = CMath.V3Len(CMath.V3SubV3(pos, this.mCorner));
                        if (CMath.V3Dot(nowvec, this.mLastVec) < 0.999999)
                            success = 2;
                        if (this.mFlen >= size)
                            success = 1;
                        this.mBCnt++;
                    }
                    else if (this.mFlen >= size) {
                        while (true) {
                            ++this.mBCnt;
                            if (this.mPosList.length - 1 <= this.mBCnt) {
                                success = 2;
                                break;
                            }
                            const blen = CMath.V3Len(CMath.V3SubV3(this.mCorner, this.mPosList[this.mPosList.length - this.mBCnt]));
                            if (blen >= size) {
                                success = 1;
                                break;
                            }
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
                    if (this.mBCnt > this.mPosList.length)
                        this.mBCnt = this.mPosList.length;
                    const pArr = [
                        this.mPosList[this.mPosList.length - this.mBCnt],
                        this.mCorner,
                        new CVec3(pos.x, pos.y, pos.z)
                    ];
                    for (let i = 1; i < this.mBCnt; i++) {
                        this.mPosList[this.mPosList.length - (this.mBCnt - i)] = CUtilMath.Bezier(pArr, i / this.mBCnt, 0, 0);
                        this.mVList[this.mVList.length - (this.mBCnt - i)] = CMath.V3Nor(CMath.V3SubV3(this.mPosList[this.mPosList.length - (this.mBCnt - i)], this.mPosList[this.mPosList.length - (this.mBCnt - i + 1)]));
                    }
                    this.mVList.push(CMath.V3Nor(CMath.V3SubV3(pos, this.mPosList[this.mPosList.length - 1])));
                    this.mPosList.push(new CVec3(pos.x, pos.y, pos.z));
                    if (success > 0) {
                        this.mInCurve = false;
                        const removeCount = Math.min(this.mBCnt + 1, this.mPosList.length - 2);
                        if (removeCount > 0) {
                            this.mPosList.splice(this.mPosList.length - removeCount);
                            this.mVList.splice(this.mVList.length - removeCount);
                        }
                        for (let i = 0; i < this.mEdgeCount; i++) {
                            this.mPosList.push(CUtilMath.Bezier(pArr, i / (this.mEdgeCount - 1), 0, 0));
                            this.mVList.push(CMath.V3Nor(CMath.V3SubV3(this.mPosList[this.mPosList.length - 1], this.mPosList[this.mPosList.length - 2])));
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
                            this.mLastLinePos--;
                            vyes = 0;
                            i -= 2;
                        }
                    }
                }
                this.mLastVec = nowvec;
                if (success === 2)
                    this.mLastVec = CMath.V3Nor(CMath.V3SubV3(pos, this.mPosList[this.mPosList.length - 2]));
            }
        }
        this.mTotalLen = 0;
        for (let i = 0; i < this.mPosList.length - 1; i++)
            this.mTotalLen += CMath.V3Len(CMath.V3SubV3(this.mPosList[i + 1], this.mPosList[i]));
        const decayRate = this.mLength / this.mFadeTime;
        let toRemove = Math.max(0, this.mTotalLen - this.mLength) + decayRate * dt;
        if (this.mPosList.length > 1 && this.mTotalLen <= 0)
            toRemove = Math.max(toRemove, 0.001);
        while (toRemove > 0 && this.mPosList.length > 1) {
            const segLen = CMath.V3Len(CMath.V3SubV3(this.mPosList[1], this.mPosList[0]));
            const remove = Math.min(segLen, toRemove);
            toRemove -= remove;
            if (remove >= segLen) {
                this.mPosList.splice(0, 1);
                if (this.mVList.length > 0)
                    this.mVList.splice(0, 1);
                if (this.mLastLinePos > 0)
                    this.mLastLinePos--;
                else {
                    this.mLastLinePos = 0;
                    this.mLastLinelen = 0;
                }
            }
            else {
                this.mPosList[0] = CMath.V3AddV3(this.mPosList[0], CMath.V3MulFloat(this.mVList[0], remove));
                break;
            }
        }
        this.CalcCamera();
    }
    CalcCamera() {
        if (this.mTrailPaint === null)
            return;
        const segLen = [];
        let totalLen = 0;
        for (let i = 0; i < this.mPosList.length - 1; i++) {
            const l = CMath.V3Len(CMath.V3SubV3(this.mPosList[i + 1], this.mPosList[i]));
            segLen.push(l);
            totalLen += l;
        }
        const cumLen = [0];
        for (const l of segLen)
            cumLen.push(cumLen[cumLen.length - 1] + l);
        const samplePos = (d) => {
            d = Math.max(0, Math.min(totalLen, d));
            for (let j = 0; j < segLen.length; j++) {
                if (cumLen[j + 1] >= d || j === segLen.length - 1) {
                    const t = segLen[j] > 0 ? (d - cumLen[j]) / segLen[j] : 0;
                    const a = this.mPosList[j], b = this.mPosList[j + 1];
                    return new CVec3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
                }
            }
            return this.mPosList[this.mPosList.length - 1];
        };
        const upList = [];
        const downList = [];
        const camEye = this.mCam.mEye;
        for (let i = 0; i < this.mVCount; i++) {
            const sto = i / this.mVCount;
            const st = samplePos((i / this.mVCount) * totalLen);
            const ed = samplePos(((i + 1) / this.mVCount) * totalLen);
            const camview = CMath.V3Nor(CMath.V3SubV3(st, camEye));
            const L_nor = CMath.V3Nor(CMath.V3Cross(camview, CMath.V3Nor(CMath.V3SubV3(ed, st))));
            const tsize = (this.mLastSmall ? sto : 1) * (this.mWidth / 2);
            upList.push(CMath.V3SubV3(st, CMath.V3MulFloat(L_nor, tsize)));
            downList.push(CMath.V3AddV3(st, CMath.V3MulFloat(L_nor, tsize)));
        }
        upList.reverse();
        downList.reverse();
        this.mTrailPaint.mLastHide = this.mLastHide;
        this.mTrailPaint.UpdateBuffer(upList, downList);
    }
}

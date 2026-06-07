import { CUpdate } from "../../basic/Basic.js";
import { CMath } from "../../geometry/CMath.js";
import { CUtilMath } from "../../geometry/CUtilMath.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CCamera } from "../../render/CCamera.js";
import { CPaintTrail } from "../component/paint/CPaintTrail.js";
import { CSubject } from "./CSubject.js";

export class CTrail extends CSubject
{
    // ── 설정 (public)
    mWidth: number = 50;
    mVCount: number = 64;
    mLength: number = 500;
    mFadeTime: number = 1.0;
    mLastSmall: boolean = false;
    mLastHide: boolean = true;
    mNormal: CVec3 = null;   // 지정 시 카메라 계산 대신 이 노말을 사용
    mCam: CCamera;

    // ── 내부 상태 (private)
    private mTrailPaint: CPaintTrail = null;
    private mPosList: CVec3[] = [];
    private mVList: CVec3[] = [];
    private mLastVec: CVec3 = null;
    private mLastLinePos: number = 0;
    private mLastLinelen: number = 0;
    private mInCurve: boolean = false;
    private mCorner: CVec3 = null;
    private mBCnt: number = 0;
    private mBlen: number = 0;
    private mFlen: number = 0;
    private mEdgeCount: number = 10;
    private mTotalLen: number = 0;
    private mFirstFrame: boolean = true;

    constructor(_cam: CCamera) {
        super();
        this.mCam = _cam;
    }

    override Start(): void {
        super.Start();
        this.mTrailPaint = new CPaintTrail(this.GetFrame().Pal().GetNoneTex());
        this.mTrailPaint.mLastHide = this.mLastHide;
        this.PushComp(this.mTrailPaint);
    }

    override Update(_update: CUpdate): void {
        if (this.mFirstFrame) {
            this.mFirstFrame = false;
            const pos = this.GetPos();
            this.mPosList.push(new CVec3(pos.x, pos.y, pos.z));
        }

        super.Update(_update);

        const dt = _update.DeltaTime();
        if (dt > 1) return;

        const pos = this.GetPos();
        
        const prevPos = this.mPosList.length > 0 ? this.mPosList[this.mPosList.length - 1] : null;
        const moved = prevPos !== null && !prevPos.Equals(pos);
        if (!moved) this.mInCurve = false;

        // ── 첫 포인트 초기화
        if (this.mPosList.length === 0) {
            this.mPosList.push(new CVec3(pos.x, pos.y, pos.z));
            return;
        }

        // ── 새 포인트 추가
        if (moved) {
            const nvec = CMath.V3SubV3(pos, this.mPosList[this.mPosList.length - 1]);
            if (nvec.IsZero()) return;
            let nowvec = CMath.V3Nor(nvec);
            let success = 0;

            if (this.mVList.length === 0) {
                if (!this.mPosList[this.mPosList.length - 1].Equals(pos)) {
                    this.mVList.push(nowvec);
                    this.mPosList.push(new CVec3(pos.x, pos.y, pos.z));
                    this.mLastLinelen += CMath.V3Len(nvec);
                    this.mLastVec = nowvec;
                }
            } else {
                const size = this.mWidth / 2;

                if (!this.mInCurve) {
                    if (CMath.V3Dot(nowvec, this.mLastVec) > 0.999999) {
                        // 직선: push 후 중간점 병합
                        this.mPosList.push(new CVec3(pos.x, pos.y, pos.z));
                        this.mVList.push(nowvec);
                        this.mLastLinelen += CMath.V3Len(nvec);

                        if (this.mLastLinelen > size * 2 && this.mLastLinePos + 2 < this.mPosList.length) {
                            const delen = CMath.V3Len(CMath.V3SubV3(
                                this.mPosList[this.mLastLinePos + 1],
                                this.mPosList[this.mLastLinePos + 2]
                            ));
                            this.mLastLinelen -= delen;
                            // 직선 중간점 제거 시 호 길이 불변 (A-B-C → A-C, d(A,C)=d(A,B)+d(B,C))
                            this.mPosList.splice(this.mLastLinePos + 1, 1);
                            this.mVList.splice(this.mLastLinePos + 1, 1);
                        }
                    } else if (this.mLastLinelen < size || CMath.V3Len(nvec) < size) {
                        this.mPosList.push(new CVec3(pos.x, pos.y, pos.z));
                        this.mVList.push(nowvec);
                        this.mLastLinelen = 0;
                        this.mLastLinePos = this.mPosList.length - 2;
                    } else {
                        // 방향 전환: Bezier 보정 시작
                        this.mBCnt = 2;
                        this.mBlen = 0;
                        this.mFlen = 0;
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
                } else {
                    // Bezier 보정 진행 중
                    if (this.mBlen >= size) {
                        this.mFlen = CMath.V3Len(CMath.V3SubV3(pos, this.mCorner));
                        if (CMath.V3Dot(nowvec, this.mLastVec) < 0.999999) success = 2;
                        if (this.mFlen >= size) success = 1;
                        this.mBCnt++;
                    } else if (this.mFlen >= size) {
                        while (true) {
                            ++this.mBCnt;
                            if (this.mPosList.length - 1 <= this.mBCnt) { success = 2; break; }
                            const blen = CMath.V3Len(CMath.V3SubV3(this.mCorner, this.mPosList[this.mPosList.length - this.mBCnt]));
                            if (blen >= size) { success = 1; break; }
                        }
                    } else if (this.mBCnt > 2 && CMath.V3Dot(nowvec, this.mLastVec) < 0.999999) {
                        success = 2;
                    } else {
                        this.mBCnt += 2;
                        if (this.mPosList.length <= this.mBCnt) {
                            this.mBCnt = this.mPosList.length;
                            success = 2;
                        } else {
                            this.mBlen = CMath.V3Len(CMath.V3SubV3(this.mCorner, this.mPosList[this.mPosList.length - this.mBCnt]));
                            this.mFlen = CMath.V3Len(CMath.V3SubV3(pos, this.mCorner));
                        }
                    }

                    // mBCnt 가 mPosList.length 를 넘으면 음수 인덱스 → undefined 접근.
                    // 위 분기들 중 일부(예: line 125 mBCnt++)가 클램프 없이 증가시키므로 여기서 안전망.
                    if (this.mBCnt > this.mPosList.length) this.mBCnt = this.mPosList.length;
                    const pArr = [
                        this.mPosList[this.mPosList.length - this.mBCnt],
                        this.mCorner,
                        new CVec3(pos.x, pos.y, pos.z)
                    ];
                    for (let i = 1; i < this.mBCnt; i++) {
                        this.mPosList[this.mPosList.length - (this.mBCnt - i)] = CUtilMath.Bezier(pArr, i / this.mBCnt, 0, 0);
                        this.mVList[this.mVList.length - (this.mBCnt - i)] = CMath.V3Nor(CMath.V3SubV3(
                            this.mPosList[this.mPosList.length - (this.mBCnt - i)],
                            this.mPosList[this.mPosList.length - (this.mBCnt - i + 1)]
                        ));
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
                            this.mVList.push(CMath.V3Nor(CMath.V3SubV3(
                                this.mPosList[this.mPosList.length - 1],
                                this.mPosList[this.mPosList.length - 2]
                            )));
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

                // 보정 완료: 직선 구간 중복 포인트 제거
                if (success > 0) {
                    let vyes = 0;
                    for (let i = 0; i < this.mVList.length - 2; i++) {
                        if (CMath.V3Dot(this.mVList[i], this.mVList[i + 1]) > 0.999999) vyes++;
                        else vyes = 0;
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

        // ── mTotalLen 재계산
        this.mTotalLen = 0;
        for (let i = 0; i < this.mPosList.length - 1; i++)
            this.mTotalLen += CMath.V3Len(CMath.V3SubV3(this.mPosList[i + 1], this.mPosList[i]));

        // ── 꼬리 제거: 항상 mLength/mFadeTime 속도로 감소
        // 이동 속도 > mLength/mFadeTime 이면 mLength까지 쌓임, 멈추면 mFadeTime초 후 소멸
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
                if (this.mVList.length > 0) this.mVList.splice(0, 1);
                if (this.mLastLinePos > 0) this.mLastLinePos--;
                else { this.mLastLinePos = 0; this.mLastLinelen = 0; }
            } else {
                this.mPosList[0] = CMath.V3AddV3(this.mPosList[0], CMath.V3MulFloat(this.mVList[0], remove));
                break;
            }
        }

        this.CalcCamera();
    }

    CalcCamera(): void {
        if (this.mTrailPaint === null) return;
        if (this.mPosList.length < 2) return;

        const segLen: number[] = [];
        let totalLen = 0;
        for (let i = 0; i < this.mPosList.length - 1; i++) {
            const l = CMath.V3Len(CMath.V3SubV3(this.mPosList[i + 1], this.mPosList[i]));
            segLen.push(l);
            totalLen += l;
        }

        // trail이 너무 짧으면 첫 세그먼트의 chord 방향 오차가 width만큼 증폭돼 inner edge가 arc 뒤로 튀는 현상 방지
        if (totalLen < this.mWidth * 0.05) return;

        const cumLen: number[] = [0];
        for (const l of segLen) cumLen.push(cumLen[cumLen.length - 1] + l);

        const samplePos = (d: number): CVec3 => {
            d = Math.max(0, Math.min(totalLen, d));
            for (let j = 0; j < segLen.length; j++) {
                if (cumLen[j + 1] >= d || j === segLen.length - 1) {
                    const t = segLen[j] > 0 ? (d - cumLen[j]) / segLen[j] : 0;
                    const a = this.mPosList[j], b = this.mPosList[j + 1];
                    return new CVec3(
                        a.x + (b.x - a.x) * t,
                        a.y + (b.y - a.y) * t,
                        a.z + (b.z - a.z) * t
                    );
                }
            }
            return this.mPosList[this.mPosList.length - 1];
        };

        const upList: CVec3[] = [];
        const downList: CVec3[] = [];
        const fixedNor = this.mNormal != null ? CMath.V3Nor(this.mNormal) : null;
        const camEye   = this.mCam.mEye;

        for (let i = 0; i < this.mVCount; i++) {
            const sto = i / this.mVCount;
            const st = samplePos((i / this.mVCount) * totalLen);
            const ed = samplePos(((i + 1) / this.mVCount) * totalLen);

            const camview = fixedNor ?? CMath.V3Nor(CMath.V3SubV3(st, camEye));
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

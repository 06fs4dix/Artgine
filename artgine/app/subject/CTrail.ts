import { CUpdate } from "../../basic/Basic.js";
import { CMath } from "../../geometry/CMath.js";
import { CUtilMath } from "../../geometry/CUtilMath.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CCamera } from "../../render/CCamera.js";
import { CPaintTrail } from "../component/paint/CPaintTrail.js";
import { CSubject } from "./CSubject.js";

export class CTrail extends CSubject
{
    // ── 렌더 컴포넌트 (CPaintTrail2)
    mTrailPaint: CPaintTrail = null;

    // ── 포지션 추적 (CPaintTrail 방식)
    mPosList: CVec3[] = [];
    mVList: CVec3[] = [];       // 각 구간 방향벡터
    mPCnt: number[] = [];       // 직선 병합 카운트
    mTCnt: number[] = [];       // 구간별 deltaTime
    mSumTime: number = 0;
    mLastVec: CVec3 = null;
    mLastLinePos: number = 0;
    mLastLinelen: number = 0;

    // ── Bezier 곡선 보정 상태 (CPaintTrail.mIsEdge=true 방식)
    mInCurve: boolean = false;
    mCorner: CVec3 = null;
    mBCnt: number = 0;
    mBlen: number = 0;
    mFlen: number = 0;
    mEdgeCount: number = 10;
    mEGFar: number = 1;

    // ── 설정
    mLen: number = 50;
    mVCount: number = 64;
    mStartTime: number = 60 * 60;
    mEndTime: number = 3.0;
    mLastSmall: boolean = false;
    mLastHide: boolean = true;

    // ── Update()는 컴포넌트(CAniFlow 등) 업데이트보다 먼저 실행되므로,
    //    첫 프레임은 건너뛰어 컴포넌트가 위치를 설정한 뒤부터 기록 시작
    private mFirstFrame: boolean = true;

    // ── 카메라
    mCam: CCamera;

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
        super.Update(_update);

        if (this.mFirstFrame) { this.mFirstFrame = false; return; }

        const dt = _update.DeltaTime();
        if (dt > 1) return;

        this.mSumTime += dt;
        if (this.mStartTime > 0) this.mStartTime -= dt;

        const pos = this.GetPos();

        // ── 첫 포인트 초기화
        if (this.mPosList.length === 0) {
            this.mPosList.push(new CVec3(pos.x, pos.y, pos.z));
            return;
        }

        // ── 새 포인트 추가 (CPaintTrail mIsEdge=true 동일 로직)
        if (this.mStartTime > 0) {
            const nvec = CMath.V3SubV3(pos, this.mPosList[this.mPosList.length - 1]);
            let nowvec = CMath.V3Nor(nvec);
            let success = 0;

            // 수직 하강 방향 예외처리 (CPaintTrail 동일)
            if (CMath.V3Dot(nowvec, new CVec3(0, -1, 0)) === 1 && this.mVList.length > 0)
                nowvec = this.mVList[this.mVList.length - 1];

            if (this.mVList.length === 0) {
                if (!this.mPosList[this.mPosList.length - 1].Equals(pos)) {
                    this.mVList.push(nowvec);
                    this.mPosList.push(new CVec3(pos.x, pos.y, pos.z));
                    this.mPCnt.push(1);
                    this.mTCnt.push(dt);
                    this.mLastLinelen += CMath.V3Len(nvec);
                    this.mLastVec = nowvec;
                } else {
                    this.mSumTime -= dt;
                }
            } else {
                const size = this.mLen / 2;  // CPaintTrail: size = mLen/2

                if (!this.mInCurve) {
                    if (CMath.V3Dot(nowvec, this.mLastVec) > 0.999999) {
                        // 직선: push 후 중간점 병합
                        this.mPosList.push(new CVec3(pos.x, pos.y, pos.z));
                        this.mVList.push(nowvec);
                        this.mPCnt.push(1);
                        this.mTCnt.push(dt);
                        this.mLastLinelen += CMath.V3Len(nvec);

                        if (this.mLastLinelen > (size * 2) * this.mEGFar && this.mLastLinePos + 2 < this.mPosList.length) {
                            const delen = CMath.V3Len(CMath.V3SubV3(
                                this.mPosList[this.mLastLinePos + 1],
                                this.mPosList[this.mLastLinePos + 2]
                            ));
                            this.mLastLinelen -= delen;
                            this.mPosList.splice(this.mLastLinePos + 1, 1);
                            this.mVList.splice(this.mLastLinePos + 1, 1);
                            this.mPCnt.splice(this.mLastLinePos + 1, 1);
                            this.mPCnt[this.mLastLinePos]++;
                        }
                    } else {
                        // 방향 전환: Bezier 보정 시작
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
                        this.mPCnt.push(1);
                        this.mTCnt.push(dt);

                        this.mInCurve = true;
                    }
                } else {
                    // Bezier 보정 진행 중
                    if (this.mBlen >= size * this.mEGFar) {
                        this.mFlen = CMath.V3Len(CMath.V3SubV3(pos, this.mCorner));
                        if (CMath.V3Dot(nowvec, this.mLastVec) < 0.999999) success = 2;
                        if (this.mFlen >= size * this.mEGFar) success = 1;
                        this.mBCnt++;
                    } else if (this.mFlen >= size * this.mEGFar) {
                        while (true) {
                            const blen = CMath.V3Len(CMath.V3SubV3(this.mCorner, this.mPosList[this.mPosList.length - (++this.mBCnt)]));
                            if (this.mPosList.length - 1 <= this.mBCnt) { success = 2; break; }
                            if (blen >= size * this.mEGFar) { success = 1; break; }
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

                    // 매 프레임 중간점 Bezier로 갱신
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
                    this.mPCnt.push(1);
                    this.mTCnt.push(dt);

                    if (success > 0) {
                        this.mInCurve = false;

                        // 임시 곡선 데이터 제거 후 edgeCount개 최종 Bezier 포인트 삽입
                        let sumtC = 0;
                        const startIndex = Math.max(0, this.mTCnt.length - this.mBCnt - 1);
                        for (let i = startIndex; i < this.mTCnt.length; i++) sumtC += this.mTCnt[i];

                        const removeCount = Math.min(this.mBCnt + 1, this.mPosList.length - 2);
                        if (removeCount > 0) {
                            this.mPosList.splice(this.mPosList.length - removeCount);
                            this.mVList.splice(this.mVList.length - removeCount);
                            this.mPCnt.splice(this.mPCnt.length - removeCount);
                            this.mTCnt.splice(this.mTCnt.length - removeCount);
                        }

                        for (let i = 0; i < this.mEdgeCount; i++) {
                            this.mPosList.push(CUtilMath.Bezier(pArr, i / (this.mEdgeCount - 1), 0, 0));
                            this.mVList.push(CMath.V3Nor(CMath.V3SubV3(
                                this.mPosList[this.mPosList.length - 1],
                                this.mPosList[this.mPosList.length - 2]
                            )));
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

                // 보정 마무리: 직선 구간 중복 포인트 제거
                if (success > 0) {
                    let vyes = 0;
                    for (let i = 0; i < this.mVList.length - 2; i++) {
                        if (CMath.V3Dot(this.mVList[i], this.mVList[i + 1]) > 0.999999) vyes++;
                        else vyes = 0;
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
                if (success === 2)
                    this.mLastVec = CMath.V3Nor(CMath.V3SubV3(pos, this.mPosList[this.mPosList.length - 2]));
            }
        }

        // ── 꼬리 제거 (시간 기반, CPaintTrail 방식)
        if (this.mSumTime >= this.mEndTime && this.mPosList.length > 1) {
            let tm = 0, tmc = -1;
            for (let i = 0; i < this.mTCnt.length; i++) {
                tm += this.mTCnt[i];
                if (tm >= this.mSumTime - this.mEndTime) { tmc = i; break; }
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
                    } else {
                        const len = CMath.V3Len(CMath.V3SubV3(this.mPosList[0], this.mPosList[1])) / this.mPCnt[0];
                        this.mPosList[0] = CMath.V3AddV3(this.mPosList[0], CMath.V3MulFloat(this.mVList[0], len));
                    }
                    deltime += this.mTCnt[0];
                    this.mTCnt.splice(0, 1);
                }
                this.mSumTime -= deltime;
            }
        }

        this.CalcCamera();
    }

    // ── 카메라 빌보드 계산 → CPaintTrail2.UpdateBuffer 호출
    // 아크 길이 균등 샘플링으로 UV가 실제 경로 길이에 비례하도록 보장 (CPaintTrail.Camera() 방식)
    CalcCamera(): void {
        if (this.mPosList.length < 2 || this.mTrailPaint === null) return;

        // 세그먼트별 아크 길이 테이블
        const segLen: number[] = [];
        let totalLen = 0;
        for (let i = 0; i < this.mPosList.length - 1; i++) {
            const l = CMath.V3Len(CMath.V3SubV3(this.mPosList[i + 1], this.mPosList[i]));
            segLen.push(l);
            totalLen += l;
        }
        if (totalLen <= 0) return;

        // 누적 길이
        const cumLen: number[] = [0];
        for (const l of segLen) cumLen.push(cumLen[cumLen.length - 1] + l);

        // 아크 길이 d(0~totalLen)에서 위치 선형 보간
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
        const camEye = this.mCam.mEye;

        for (let i = 0; i < this.mVCount; i++) {
            const sto = i / this.mVCount;
            const st = samplePos((i / this.mVCount) * totalLen);
            const ed = samplePos(((i + 1) / this.mVCount) * totalLen);

            const camview = CMath.V3Nor(CMath.V3SubV3(st, camEye));
            const L_nor = CMath.V3Nor(CMath.V3Cross(camview, CMath.V3Nor(CMath.V3SubV3(ed, st))));

            // CPaintTrail: tsize = mLen / 2 (반폭, 총 폭 = mLen)
            const tsize = (this.mLastSmall ? sto : 1) * (this.mLen / 2);
            upList.push(CMath.V3SubV3(st, CMath.V3MulFloat(L_nor, tsize)));
            downList.push(CMath.V3AddV3(st, CMath.V3MulFloat(L_nor, tsize)));
        }

        upList.reverse();
        downList.reverse();
        this.mTrailPaint.mLastHide = this.mLastHide;
        this.mTrailPaint.UpdateBuffer(upList, downList);
    }
}

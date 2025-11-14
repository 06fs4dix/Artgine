import { CUpdate } from "https://06fs4dix.github.io/Artgine/artgine/basic/Basic.js";
import { CBlackBoardRef } from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js";
import { CUniqueID } from "https://06fs4dix.github.io/Artgine/artgine/basic/CUniqueID.js";
import { CCanvas } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CCanvas.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CPacShooting } from "./CPacShooting.js";

// 600×800 고정 화면을 가정 (원점 중심)
// X ∈ [-300, 300], Y ∈ [-400, 400]
const HALF_W = 300;
const HALF_H = 400;
const Y_TOP = HALF_H + 30; // 화면 위(오프스크린)에서 스폰 시작

// 스폰 난이도/패턴 설정값
const WAVE_PERIOD_MS = 2000;      // 파동(웨이브) 주기
const BASE_COUNT = 3;              // 초반 몬스터 수
const COUNT_STEP_SEC = 4;          // N초마다 수 증가
const COUNT_MAX = 60;              // 상한

export class RoomSystem extends CSubject {
    mTime = 0; // 누적 ms
    mTick = 0; // 웨이브 타이머
    mMon = new CBlackBoardRef<CSubject>("Monster");
    mMain = new CBlackBoardRef<CCanvas>("Main");

    Start() { }

    Update(_update : CUpdate): void {
        const dt = this.GetFrame().DeltaTime()*1000;
        this.mTime += dt;
        this.mTick += dt;

        // 웨이브 타이밍: 일정 주기마다 다수 스폰 (패턴 적용)
        if (this.mTick >= WAVE_PERIOD_MS) {
            this.mTick -= WAVE_PERIOD_MS;

            const seconds = this.mTime / 1000;
            const add = Math.floor(seconds / COUNT_STEP_SEC); // 시간이 지나며 증가
            const count = Math.min(BASE_COUNT + add, COUNT_MAX);

            const patternIndex = Math.floor(seconds / 4) % 6; // 4초마다 패턴 변경
            const positions = this._makePattern(patternIndex, count, seconds);

            // 난이도에 따른 타입 변조 예시
            const type = seconds < 20 ? "basic" : seconds < 60 ? "fast" : "elite";

            for (let i = 0; i < positions.length; i++) {
                const id = CUniqueID.GetHash();
                const pos = positions[i];
                // 패킷 경유 스폰 (기존 코드와 동일 루트)
                this.PushPac(CPacShooting.MonCreate(id, pos, type));
            }
        }
    }

    // ===== 패턴 생성기들 =====
    private _makePattern(kind: number, count: number, tSec: number): CVec3[] {
        switch (kind) {
            case 0: return this._ring(count, tSec);
            case 1: return this._spiral(count, tSec);
            case 2: return this._lissajous(count, tSec);
            case 3: return this._polyEdges(count, tSec);
            case 4: return this._zigzagColumns(count, tSec);
            default: return this._sunflower(count, tSec);
        }
    }

    private _ring(count: number, tSec: number): CVec3[] {
        const r = Math.min(HALF_W, HALF_H) * 0.75; // 큰 링
        const base = tSec * 0.7; // 느린 회전
        const arr: CVec3[] = [];
        for (let i = 0; i < count; i++) {
            const a = base + (i * (Math.PI * 2)) / count;
            const x = Math.cos(a) * r;
            // 위에서부터 등장: y는 고정(Y_TOP)
            arr.push(new CVec3(this._clipX(x), Y_TOP, 0));
        }
        return arr;
    }

    private _spiral(count: number, tSec: number): CVec3[] {
        // 로지스틱하게 커지는 팔, 회전은 시간 기반 페이즈
        const arr: CVec3[] = [];
        const turns = 2.0 + Math.min(3.0, Math.floor(count / 10));
        const phase = tSec * 1.1;
        const rMax = Math.min(HALF_W, HALF_H) * 0.9;
        for (let i = 0; i < count; i++) {
            const u = i / Math.max(1, count - 1);
            const a = (turns * Math.PI * 2) * u + phase;
            const r = 30 + rMax * u;
            const x = Math.cos(a) * r;
            arr.push(new CVec3(this._clipX(x), Y_TOP, 0));
        }
        return arr;
    }

    private _lissajous(count: number, tSec: number): CVec3[] {
        // Lissajous 곡선에서 x만 사용하여 수평 분포, y는 위 고정
        const arr: CVec3[] = [];
        const A = HALF_W * 0.9;
        const a = 3; // 서로소 숫자 조합 권장
        const b = 4;
        const phi = tSec * 0.8;
        for (let i = 0; i < count; i++) {
            const u = (i / count) * Math.PI * 2;
            const x = A * Math.sin(a * u + phi) * Math.sin(b * u * 0.25 + phi * 0.5);
            arr.push(new CVec3(this._clipX(x), Y_TOP, 0));
        }
        return arr;
    }

    private _polyEdges(count: number, tSec: number): CVec3[] {
        // 정다각형의 변을 따라 등간격 배치하되 y는 위 고정
        const sides = 3 + (Math.floor(tSec) % 5); // 3~7각형
        const r = Math.min(HALF_W, HALF_H) * 0.8;
        const arr: CVec3[] = [];
        const spin = tSec * 0.5;

        // 꼭짓점 좌표
        const verts: CVec3[] = [];
        for (let i = 0; i < sides; i++) {
            const a = spin + (i * 2 * Math.PI) / sides;
            verts.push(new CVec3(Math.cos(a) * r, Math.sin(a) * r, 0));
        }

        // 변을 따라 분포 → x만 취해 수평 배치
        for (let i = 0; i < count; i++) {
            const edge = i % sides;
            const a0 = verts[edge];
            const a1 = verts[(edge + 1) % sides];
            const u = (i / count) * 1.2 % 1.0; // 균등 + 살짝 난수감
            const x = a0.x + (a1.x - a0.x) * u;
            arr.push(new CVec3(this._clipX(x), Y_TOP, 0));
        }
        return arr;
    }

    private _zigzagColumns(count: number, tSec: number): CVec3[] {
        // 세로 기둥 여러 개에 지그재그로 x를 분포, y는 위 고정
        const arr: CVec3[] = [];
        const cols = 5;
        const colGap = (HALF_W * 2) / (cols + 1);
        for (let i = 0; i < count; i++) {
            const c = (i % cols) + 1;
            const baseX = -HALF_W + colGap * c;
            const x = baseX + Math.sin(tSec * 2 + c) * 18; // 칼럼별 소폭 흔들림
            arr.push(new CVec3(this._clipX(x), Y_TOP, 0));
        }
        return arr;
    }

    private _sunflower(count: number, tSec: number): CVec3[] {
        // 황금각 분포에서 x만 사용해 수평 분포, y는 위 고정
        const arr: CVec3[] = [];
        const golden = (Math.PI * (3 - Math.sqrt(5))); // ~2.39996rad (137.5°)
        const rMax = Math.min(HALF_W, HALF_H) * 0.95;
        for (let i = 0; i < count; i++) {
            const a = i * golden + tSec * 0.3; // 느린 회전
            const r = rMax * Math.sqrt((i + 0.5) / (count + 0.5));
            const x = Math.cos(a) * r;
            arr.push(new CVec3(this._clipX(x), Y_TOP, 0));
        }
        return arr;
    }

    private _clipX(x: number): number {
        return Math.max(-HALF_W + 5, Math.min(HALF_W - 5, x));
    }
    private _clipY(y: number): number {
        return Math.max(-HALF_H + 5, Math.min(HALF_H - 5, y));
    }

    // 기존 MonCreate 유지 (패킷 없이 즉시 생성이 필요할 때 사용)
    MonCreate(_monKey: string, pos: CVec3, _type: string) {
        const mon = this.mMon.Ref().Export(true, true) as CSubject;
        mon.SetKey(_monKey);
        mon.SetPos(pos);
        this.mMain.Ref().PushSub(mon);
    }
}

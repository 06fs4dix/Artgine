import { CBlackBoardRef } from "https://06fs4dix.github.io/Artgine/artgine/basic/CObject.js";
import { CUniqueID } from "https://06fs4dix.github.io/Artgine/artgine/basic/CUniqueID.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CPacShooting } from "./CPacShooting.js";
const HALF_W = 300;
const HALF_H = 400;
const Y_TOP = HALF_H + 30;
const WAVE_PERIOD_MS = 2000;
const BASE_COUNT = 3;
const COUNT_STEP_SEC = 4;
const COUNT_MAX = 60;
export class RoomSystem extends CSubject {
    mTime = 0;
    mTick = 0;
    mMon = new CBlackBoardRef("Monster");
    mMain = new CBlackBoardRef("Main");
    Start() { }
    Update(_update) {
        const dt = this.GetFrame().DeltaTime() * 1000;
        this.mTime += dt;
        this.mTick += dt;
        if (this.mTick >= WAVE_PERIOD_MS) {
            this.mTick -= WAVE_PERIOD_MS;
            const seconds = this.mTime / 1000;
            const add = Math.floor(seconds / COUNT_STEP_SEC);
            const count = Math.min(BASE_COUNT + add, COUNT_MAX);
            const patternIndex = Math.floor(seconds / 4) % 6;
            const positions = this._makePattern(patternIndex, count, seconds);
            const type = seconds < 20 ? "basic" : seconds < 60 ? "fast" : "elite";
            for (let i = 0; i < positions.length; i++) {
                const id = CUniqueID.GetHash();
                const pos = positions[i];
                this.PushPac(CPacShooting.MonCreate(id, pos, type));
            }
        }
    }
    _makePattern(kind, count, tSec) {
        switch (kind) {
            case 0: return this._ring(count, tSec);
            case 1: return this._spiral(count, tSec);
            case 2: return this._lissajous(count, tSec);
            case 3: return this._polyEdges(count, tSec);
            case 4: return this._zigzagColumns(count, tSec);
            default: return this._sunflower(count, tSec);
        }
    }
    _ring(count, tSec) {
        const r = Math.min(HALF_W, HALF_H) * 0.75;
        const base = tSec * 0.7;
        const arr = [];
        for (let i = 0; i < count; i++) {
            const a = base + (i * (Math.PI * 2)) / count;
            const x = Math.cos(a) * r;
            arr.push(new CVec3(this._clipX(x), Y_TOP, 0));
        }
        return arr;
    }
    _spiral(count, tSec) {
        const arr = [];
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
    _lissajous(count, tSec) {
        const arr = [];
        const A = HALF_W * 0.9;
        const a = 3;
        const b = 4;
        const phi = tSec * 0.8;
        for (let i = 0; i < count; i++) {
            const u = (i / count) * Math.PI * 2;
            const x = A * Math.sin(a * u + phi) * Math.sin(b * u * 0.25 + phi * 0.5);
            arr.push(new CVec3(this._clipX(x), Y_TOP, 0));
        }
        return arr;
    }
    _polyEdges(count, tSec) {
        const sides = 3 + (Math.floor(tSec) % 5);
        const r = Math.min(HALF_W, HALF_H) * 0.8;
        const arr = [];
        const spin = tSec * 0.5;
        const verts = [];
        for (let i = 0; i < sides; i++) {
            const a = spin + (i * 2 * Math.PI) / sides;
            verts.push(new CVec3(Math.cos(a) * r, Math.sin(a) * r, 0));
        }
        for (let i = 0; i < count; i++) {
            const edge = i % sides;
            const a0 = verts[edge];
            const a1 = verts[(edge + 1) % sides];
            const u = (i / count) * 1.2 % 1.0;
            const x = a0.x + (a1.x - a0.x) * u;
            arr.push(new CVec3(this._clipX(x), Y_TOP, 0));
        }
        return arr;
    }
    _zigzagColumns(count, tSec) {
        const arr = [];
        const cols = 5;
        const colGap = (HALF_W * 2) / (cols + 1);
        for (let i = 0; i < count; i++) {
            const c = (i % cols) + 1;
            const baseX = -HALF_W + colGap * c;
            const x = baseX + Math.sin(tSec * 2 + c) * 18;
            arr.push(new CVec3(this._clipX(x), Y_TOP, 0));
        }
        return arr;
    }
    _sunflower(count, tSec) {
        const arr = [];
        const golden = (Math.PI * (3 - Math.sqrt(5)));
        const rMax = Math.min(HALF_W, HALF_H) * 0.95;
        for (let i = 0; i < count; i++) {
            const a = i * golden + tSec * 0.3;
            const r = rMax * Math.sqrt((i + 0.5) / (count + 0.5));
            const x = Math.cos(a) * r;
            arr.push(new CVec3(this._clipX(x), Y_TOP, 0));
        }
        return arr;
    }
    _clipX(x) {
        return Math.max(-HALF_W + 5, Math.min(HALF_W - 5, x));
    }
    _clipY(y) {
        return Math.max(-HALF_H + 5, Math.min(HALF_H - 5, y));
    }
    MonCreate(_monKey, pos, _type) {
        const mon = this.mMon.Ref().Export(true, true);
        mon.SetKey(_monKey);
        mon.SetPos(pos);
        this.mMain.Ref().PushSub(mon);
    }
}

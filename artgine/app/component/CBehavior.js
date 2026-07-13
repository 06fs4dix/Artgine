import { CComponent } from "./CComponent.js";
class CCTEnterExit {
    org;
    tick;
}
export class CBehavior extends CComponent {
    mCTMap = new Map();
    mTick = 1;
    Start() {
    }
    Update(_update) {
        for (const [collider, ct] of this.mCTMap) {
            if (Math.abs(ct.tick) < this.mTick) {
                this.mCTMap.delete(collider);
                ct.tick >= 0 ? this.CollisionExit(ct.org, collider) : this.TriggerExit(ct.org, collider);
            }
        }
        this.mTick++;
    }
    CameraOut(_pArr) {
    }
    Collision(_org, _size, _tar, _push) {
        for (let i = 0; i < _size; i++) {
            const tar = _tar[i];
            if (!this.mCTMap.has(tar)) {
                this.CollisionEnter(_org, tar);
            }
            this.mCTMap.set(tar, { org: _org, tick: this.mTick });
        }
    }
    CollisionEnter(_org, _tar) {
    }
    CollisionExit(_org, _tar) {
    }
    Trigger(_org, _size, _tar) {
        for (let i = 0; i < _size; i++) {
            const tar = _tar[i];
            if (!this.mCTMap.has(tar)) {
                this.TriggerEnter(_org, tar);
            }
            this.mCTMap.set(tar, { org: _org, tick: -this.mTick });
        }
    }
    TriggerEnter(_org, _tar) {
    }
    TriggerExit(_org, _tar) {
    }
    PickMouse(_rayMouse) {
    }
    PickRay(_pos, _col) {
    }
    IsShould(_member, _type) {
        if (_member == "mEnable" || _member == "mKey" || _member == "mBlackboardWrite")
            return true;
        return false;
    }
}

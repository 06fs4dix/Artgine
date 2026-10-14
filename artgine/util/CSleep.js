import { CObject } from "../basic/CObject.js";
export class CSleep extends CObject {
    mCycle = 0;
    mTime = 0;
    constructor(_cycle = 0) {
        super();
        this.mCycle = _cycle;
    }
    SetCycle(_cycle) {
        if (this.mCycle == _cycle)
            return;
        this.mCycle = _cycle;
        this.mTime = 0;
    }
    Reset(_offset = 0) {
        this.mTime = _offset;
    }
    Add(_delay) {
        this.mTime += _delay;
    }
    IsShould(_member, _type) {
        if (_member == "mTime")
            return false;
        return super.IsShould(_member, _type);
    }
    Is() {
        if (this.mCycle <= 0)
            return true;
        if (this.mTime < this.mCycle)
            return false;
        this.mTime = 0;
        return true;
    }
}

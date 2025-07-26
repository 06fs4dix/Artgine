export class CTimer {
    mBegin;
    constructor(_time = 0) {
        this.mBegin = _time;
        this.Delay();
    }
    Delay(_reset = true) {
        if (this.mBegin == 0) {
            this.mBegin = new Date().getTime();
            return 0;
        }
        var before = this.mBegin;
        let time = new Date().getTime();
        if (_reset)
            this.mBegin = new Date().getTime();
        return (time - before) * 0.001;
    }
}
export class CTimerNano {
    mBegin;
    constructor() {
        this.mBegin = 0;
        this.Delay();
    }
    Delay() {
        if (this.mBegin == 0) {
            this.mBegin = performance.now();
            return 0;
        }
        var before = this.mBegin;
        this.mBegin = performance.now();
        return this.mBegin - before;
    }
}

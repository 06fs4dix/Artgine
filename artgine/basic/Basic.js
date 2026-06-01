export class CUpdate {
    constructor(_delta = 100) {
        this.mDeltaTime = _delta;
        this.mFixedTime = _delta;
        this.mFixedCount = 1;
    }
    static eType = {
        Not: 0,
        Updated: 1,
        Already: 2,
    };
    mDeltaTime;
    mFixedTime;
    mFixedCount;
    mOffset = 0;
    DeltaTime() { return this.mDeltaTime; }
    DeltaMil() { return this.mDeltaTime * 1000; }
    FixedTime() { return this.mFixedTime; }
    FixedCount() { return this.mFixedCount; }
    Offset() { return this.mOffset; }
}
export class CShould {
    static eType = {
        Data: "D",
        Editer: "E",
        Patch: "P",
        Proxy: "X"
    };
}

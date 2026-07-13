import { CArray } from "../basic/CArray.js";
var gCoroutioneLoop = new CArray();
export class CCoroutine {
    static eState = {
        Run: null,
        Loop: 1,
        Stop: 0,
    };
    mGenerator;
    mIterator;
    mState;
    mClass;
    constructor(generator, _class = null) {
        this.mGenerator = generator;
        this.mState = CCoroutine.eState.Stop;
        if (typeof _class == "boolean") {
            this.mClass = null;
        }
        else
            this.mClass = _class;
        this.mIterator = null;
    }
    Start() {
        if (this.mIterator != null) {
            this.mState = CCoroutine.eState.Run;
            this.Process();
            return;
        }
        if (this.mState)
            return;
        if (this.mClass == null)
            this.mIterator = this.mGenerator();
        else
            this.mIterator = this.mGenerator.call(this.mClass);
        this.mState = CCoroutine.eState.Run;
        this.Process();
    }
    GetState() {
        return this.mState;
    }
    Stop() {
        this.mState = CCoroutine.eState.Stop;
    }
    Process(value) {
        if (this.mState == CCoroutine.eState.Stop) {
            return;
        }
        try {
            const result = this.mIterator.next(value);
            if (result.value == 0) {
                this.mState = CCoroutine.eState.Stop;
                return;
            }
            if (result.done) {
                this.mIterator = null;
                this.mState = CCoroutine.eState.Stop;
                if (result.value == 1)
                    gCoroutioneLoop.Push(this);
                return;
            }
            const promise = Promise.resolve(result.value);
            promise.then((nextValue) => {
                this.Process(nextValue);
            })
                .catch(error => {
                this.mState = CCoroutine.eState.Stop;
                console.error(error);
            });
        }
        catch (error) {
            this.mState = CCoroutine.eState.Stop;
            console.error(error);
        }
    }
    static Wait(seconds) {
        return new Promise((resolve) => setTimeout(resolve, seconds));
    }
    static GetLoopArr() {
        return gCoroutioneLoop;
    }
}

export default class FilterSupport {
    constructor(pipe) {
        this._pipe = pipe;
    }
    get pipe() {
        return this._pipe;
    }
    get inputBuffer() {
        return this._pipe.inputBuffer;
    }
    get outputBuffer() {
        return this._pipe.outputBuffer;
    }
    fillInputBuffer() {
        throw new Error('fillInputBuffer() not overridden');
    }
    fillOutputBuffer(numFrames = 0) {
        while (this.outputBuffer.frameCount < numFrames) {
            const numInputFrames = 8192 * 2 - this.inputBuffer.frameCount;
            this.fillInputBuffer(numInputFrames);
            if (this.inputBuffer.frameCount < 8192 * 2) {
                break;
            }
            this._pipe.process();
        }
    }
    clear() {
        this._pipe.clear();
    }
}

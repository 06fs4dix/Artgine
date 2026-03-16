import FifoSampleBuffer from './FifoSampleBuffer.js';
export default class AbstractFifoSamplePipe {
    constructor(createBuffers) {
        if (createBuffers) {
            this._inputBuffer = new FifoSampleBuffer();
            this._outputBuffer = new FifoSampleBuffer();
        }
        else {
            this._inputBuffer = this._outputBuffer = null;
        }
    }
    get inputBuffer() {
        return this._inputBuffer;
    }
    set inputBuffer(inputBuffer) {
        this._inputBuffer = inputBuffer;
    }
    get outputBuffer() {
        return this._outputBuffer;
    }
    set outputBuffer(outputBuffer) {
        this._outputBuffer = outputBuffer;
    }
    clear() {
        this._inputBuffer.clear();
        this._outputBuffer.clear();
    }
}

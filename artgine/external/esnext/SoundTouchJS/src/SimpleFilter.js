import FilterSupport from './FilterSupport.js';
import noop from './noop.js';
export default class SimpleFilter extends FilterSupport {
    constructor(sourceSound, pipe, callback = noop) {
        super(pipe);
        this.callback = callback;
        this.sourceSound = sourceSound;
        this.historyBufferSize = 22050;
        this._sourcePosition = 0;
        this.outputBufferPosition = 0;
        this._position = 0;
    }
    get position() {
        return this._position;
    }
    set position(position) {
        if (position > this._position) {
            throw new RangeError('New position may not be greater than current position');
        }
        const newOutputBufferPosition = this.outputBufferPosition - (this._position - position);
        if (newOutputBufferPosition < 0) {
            throw new RangeError('New position falls outside of history buffer');
        }
        this.outputBufferPosition = newOutputBufferPosition;
        this._position = position;
    }
    get sourcePosition() {
        return this._sourcePosition;
    }
    set sourcePosition(sourcePosition) {
        this.clear();
        this._sourcePosition = sourcePosition;
    }
    onEnd() {
        this.callback();
    }
    fillInputBuffer(numFrames = 0) {
        const samples = new Float32Array(numFrames * 2);
        const numFramesExtracted = this.sourceSound.extract(samples, numFrames, this._sourcePosition);
        this._sourcePosition += numFramesExtracted;
        this.inputBuffer.putSamples(samples, 0, numFramesExtracted);
    }
    extract(target, numFrames = 0) {
        this.fillOutputBuffer(this.outputBufferPosition + numFrames);
        const numFramesExtracted = Math.min(numFrames, this.outputBuffer.frameCount - this.outputBufferPosition);
        this.outputBuffer.extract(target, this.outputBufferPosition, numFramesExtracted);
        const currentFrames = this.outputBufferPosition + numFramesExtracted;
        this.outputBufferPosition = Math.min(this.historyBufferSize, currentFrames);
        this.outputBuffer.receive(Math.max(currentFrames - this.historyBufferSize, 0));
        this._position += numFramesExtracted;
        return numFramesExtracted;
    }
    handleSampleData(event) {
        this.extract(event.data, 4096);
    }
    clear() {
        super.clear();
        this.outputBufferPosition = 0;
    }
}

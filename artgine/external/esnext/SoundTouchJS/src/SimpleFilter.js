import FilterSupport from './FilterSupport.js';
import noop from './noop.js';
export default class SimpleFilter extends FilterSupport {
    constructor(sourceSound, pipe, callback = noop) {
        super(pipe);
        this.callback = callback;
        this.sourceSound = sourceSound;
        this.historyBufferSize = 0x5622;
        this._sourcePosition = 0x0;
        this.outputBufferPosition = 0x0;
        this._position = 0x0;
    }
    get position() {
        return this._position;
    }
    set position(position) {
        if (position > this._position) {
            throw new RangeError("\x4e\x65\x77\x20\x70\x6f\x73\x69\x74\x69\x6f\x6e\x20\x6d\x61\x79\x20\x6e\x6f\x74\x20\x62\x65\x20\x67\x72\x65\x61\x74\x65\x72\x20\x74\x68\x61\x6e\x20\x63\x75\x72\x72\x65\x6e\x74\x20\x70\x6f\x73\x69\x74\x69\x6f\x6e");
        }
        const newOutputBufferPosition = this.outputBufferPosition - (this._position - position);
        if (newOutputBufferPosition < 0x0) {
            throw new RangeError("\x4e\x65\x77\x20\x70\x6f\x73\x69\x74\x69\x6f\x6e\x20\x66\x61\x6c\x6c\x73\x20\x6f\x75\x74\x73\x69\x64\x65\x20\x6f\x66\x20\x68\x69\x73\x74\x6f\x72\x79\x20\x62\x75\x66\x66\x65\x72");
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
    fillInputBuffer(numFrames = 0x0) {
        const samples = new Float32Array(numFrames * 0x2);
        const numFramesExtracted = this.sourceSound.extract(samples, numFrames, this._sourcePosition);
        this._sourcePosition += numFramesExtracted;
        this.inputBuffer.putSamples(samples, 0x0, numFramesExtracted);
    }
    extract(target, numFrames = 0x0) {
        this.fillOutputBuffer(this.outputBufferPosition + numFrames);
        const numFramesExtracted = Math.min(numFrames, this.outputBuffer.frameCount - this.outputBufferPosition);
        this.outputBuffer.extract(target, this.outputBufferPosition, numFramesExtracted);
        const currentFrames = this.outputBufferPosition + numFramesExtracted;
        this.outputBufferPosition = Math.min(this.historyBufferSize, currentFrames);
        this.outputBuffer.receive(Math.max(currentFrames - this.historyBufferSize, 0x0));
        this._position += numFramesExtracted;
        return numFramesExtracted;
    }
    handleSampleData(event) {
        this.extract(event.data, 0x1000);
    }
    clear() {
        super.clear();
        this.outputBufferPosition = 0x0;
    }
}

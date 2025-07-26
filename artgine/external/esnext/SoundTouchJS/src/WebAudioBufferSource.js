export default class WebAudioBufferSource {
    constructor(buffer) {
        this.buffer = buffer;
        this._position = 0;
    }
    get dualChannel() {
        return this.buffer.numberOfChannels > 1;
    }
    get position() {
        return this._position;
    }
    set position(value) {
        this._position = value;
    }
    extract(target, numFrames = 0, position = 0) {
        this.position = position;
        let left = this.buffer.getChannelData(0);
        let right = this.dualChannel
            ? this.buffer.getChannelData(1)
            : this.buffer.getChannelData(0);
        let i = 0;
        for (; i < numFrames; i++) {
            target[i * 2] = left[i + position];
            target[i * 2 + 1] = right[i + position];
        }
        return Math.min(numFrames, left.length - position);
    }
}

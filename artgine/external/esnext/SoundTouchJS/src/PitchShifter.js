import WebAudioBufferSource from './WebAudioBufferSource.js';
import getWebAudioNode from './getWebAudioNode.js';
import SoundTouch from './SoundTouch.js';
import SimpleFilter from './SimpleFilter.js';
import minsSecs from './minsSecs.js';
import noop from './noop.js';
const onUpdate = function (sourcePosition) {
    const currentTimePlayed = this.timePlayed;
    const sampleRate = this.sampleRate;
    this.sourcePosition = sourcePosition;
    this.timePlayed = sourcePosition / sampleRate;
    if (currentTimePlayed !== this.timePlayed) {
        const timePlayed = new CustomEvent('play', {
            detail: {
                timePlayed: this.timePlayed,
                formattedTimePlayed: this.formattedTimePlayed,
                percentagePlayed: this.percentagePlayed,
            },
        });
        this._node.dispatchEvent(timePlayed);
    }
};
export default class PitchShifter {
    constructor(context, buffer, bufferSize, onEnd = noop) {
        this._soundtouch = new SoundTouch();
        const source = new WebAudioBufferSource(buffer);
        this.timePlayed = 0;
        this.sourcePosition = 0;
        this._filter = new SimpleFilter(source, this._soundtouch, onEnd);
        this._node = getWebAudioNode(context, this._filter, (sourcePostion) => onUpdate.call(this, sourcePostion), bufferSize);
        this.tempo = 1;
        this.rate = 1;
        this.duration = buffer.duration;
        this.sampleRate = context.sampleRate;
        this.listeners = [];
    }
    get formattedDuration() {
        return minsSecs(this.duration);
    }
    get formattedTimePlayed() {
        return minsSecs(this.timePlayed);
    }
    get percentagePlayed() {
        return ((100 * this._filter.sourcePosition) / (this.duration * this.sampleRate));
    }
    set percentagePlayed(perc) {
        this._filter.sourcePosition = parseInt(perc * this.duration * this.sampleRate);
        this.sourcePosition = this._filter.sourcePosition;
        this.timePlayed = this.sourcePosition / this.sampleRate;
    }
    get node() {
        return this._node;
    }
    set pitch(pitch) {
        this._soundtouch.pitch = pitch;
    }
    set pitchSemitones(semitone) {
        this._soundtouch.pitchSemitones = semitone;
    }
    set rate(rate) {
        this._soundtouch.rate = rate;
    }
    set tempo(tempo) {
        this._soundtouch.tempo = tempo;
    }
    connect(toNode) {
        this._node.connect(toNode);
    }
    disconnect() {
        this._node.disconnect();
    }
    on(eventName, cb) {
        this.listeners.push({ name: eventName, cb: cb });
        this._node.addEventListener(eventName, (event) => cb(event.detail));
    }
    off(eventName = null) {
        let listeners = this.listeners;
        if (eventName) {
            listeners = listeners.filter((e) => e.name === eventName);
        }
        listeners.forEach((e) => {
            this._node.removeEventListener(e.name, (event) => e.cb(event.detail));
        });
    }
}

import AbstractFifoSamplePipe from './AbstractFifoSamplePipe.js';
const USE_AUTO_SEQUENCE_LEN = 0;
const DEFAULT_SEQUENCE_MS = USE_AUTO_SEQUENCE_LEN;
const USE_AUTO_SEEKWINDOW_LEN = 0;
const DEFAULT_SEEKWINDOW_MS = USE_AUTO_SEEKWINDOW_LEN;
const DEFAULT_OVERLAP_MS = 8;
const _SCAN_OFFSETS = [
    [
        124, 186, 248, 310, 372, 434, 496, 558, 620, 682, 744, 806, 868, 930, 992,
        1054, 1116, 1178, 1240, 1302, 1364, 1426, 1488, 0,
    ],
    [
        -100, -75, -50, -25, 25, 50, 75, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0,
    ],
    [
        -20, -15, -10, -5, 5, 10, 15, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0,
    ],
    [-4, -3, -2, -1, 1, 2, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];
const AUTOSEQ_TEMPO_LOW = 0.25;
const AUTOSEQ_TEMPO_TOP = 4.0;
const AUTOSEQ_AT_MIN = 125.0;
const AUTOSEQ_AT_MAX = 50.0;
const AUTOSEQ_K = (AUTOSEQ_AT_MAX - AUTOSEQ_AT_MIN) / (AUTOSEQ_TEMPO_TOP - AUTOSEQ_TEMPO_LOW);
const AUTOSEQ_C = AUTOSEQ_AT_MIN - AUTOSEQ_K * AUTOSEQ_TEMPO_LOW;
const AUTOSEEK_AT_MIN = 25.0;
const AUTOSEEK_AT_MAX = 15.0;
const AUTOSEEK_K = (AUTOSEEK_AT_MAX - AUTOSEEK_AT_MIN) / (AUTOSEQ_TEMPO_TOP - AUTOSEQ_TEMPO_LOW);
const AUTOSEEK_C = AUTOSEEK_AT_MIN - AUTOSEEK_K * AUTOSEQ_TEMPO_LOW;
export default class Stretch extends AbstractFifoSamplePipe {
    constructor(createBuffers) {
        super(createBuffers);
        this._quickSeek = true;
        this.midBufferDirty = false;
        this.midBuffer = null;
        this.overlapLength = 0;
        this.autoSeqSetting = true;
        this.autoSeekSetting = true;
        this._tempo = 1;
        this.setParameters(44100, DEFAULT_SEQUENCE_MS, DEFAULT_SEEKWINDOW_MS, DEFAULT_OVERLAP_MS);
    }
    clear() {
        super.clear();
        this.clearMidBuffer();
    }
    clearMidBuffer() {
        if (this.midBufferDirty) {
            this.midBufferDirty = false;
            this.midBuffer = null;
        }
    }
    setParameters(sampleRate, sequenceMs, seekWindowMs, overlapMs) {
        if (sampleRate > 0) {
            this.sampleRate = sampleRate;
        }
        if (overlapMs > 0) {
            this.overlapMs = overlapMs;
        }
        if (sequenceMs > 0) {
            this.sequenceMs = sequenceMs;
            this.autoSeqSetting = false;
        }
        else {
            this.autoSeqSetting = true;
        }
        if (seekWindowMs > 0) {
            this.seekWindowMs = seekWindowMs;
            this.autoSeekSetting = false;
        }
        else {
            this.autoSeekSetting = true;
        }
        this.calculateSequenceParameters();
        this.calculateOverlapLength(this.overlapMs);
        this.tempo = this._tempo;
    }
    set tempo(newTempo) {
        let intskip;
        this._tempo = newTempo;
        this.calculateSequenceParameters();
        this.nominalSkip =
            this._tempo * (this.seekWindowLength - this.overlapLength);
        this.skipFract = 0;
        intskip = Math.floor(this.nominalSkip + 0.5);
        this.sampleReq =
            Math.max(intskip + this.overlapLength, this.seekWindowLength) +
                this.seekLength;
    }
    get tempo() {
        return this._tempo;
    }
    get inputChunkSize() {
        return this.sampleReq;
    }
    get outputChunkSize() {
        return (this.overlapLength +
            Math.max(0, this.seekWindowLength - 2 * this.overlapLength));
    }
    calculateOverlapLength(overlapInMsec = 0) {
        let newOvl;
        newOvl = (this.sampleRate * overlapInMsec) / 1000;
        newOvl = newOvl < 16 ? 16 : newOvl;
        newOvl -= newOvl % 8;
        this.overlapLength = newOvl;
        this.refMidBuffer = new Float32Array(this.overlapLength * 2);
        this.midBuffer = new Float32Array(this.overlapLength * 2);
    }
    checkLimits(x, mi, ma) {
        return x < mi ? mi : x > ma ? ma : x;
    }
    calculateSequenceParameters() {
        let seq;
        let seek;
        if (this.autoSeqSetting) {
            seq = AUTOSEQ_C + AUTOSEQ_K * this._tempo;
            seq = this.checkLimits(seq, AUTOSEQ_AT_MAX, AUTOSEQ_AT_MIN);
            this.sequenceMs = Math.floor(seq + 0.5);
        }
        if (this.autoSeekSetting) {
            seek = AUTOSEEK_C + AUTOSEEK_K * this._tempo;
            seek = this.checkLimits(seek, AUTOSEEK_AT_MAX, AUTOSEEK_AT_MIN);
            this.seekWindowMs = Math.floor(seek + 0.5);
        }
        this.seekWindowLength = Math.floor((this.sampleRate * this.sequenceMs) / 1000);
        this.seekLength = Math.floor((this.sampleRate * this.seekWindowMs) / 1000);
    }
    set quickSeek(enable) {
        this._quickSeek = enable;
    }
    clone() {
        const result = new Stretch();
        result.tempo = this._tempo;
        result.setParameters(this.sampleRate, this.sequenceMs, this.seekWindowMs, this.overlapMs);
        return result;
    }
    seekBestOverlapPosition() {
        return this._quickSeek
            ? this.seekBestOverlapPositionStereoQuick()
            : this.seekBestOverlapPositionStereo();
    }
    seekBestOverlapPositionStereo() {
        let bestOffset;
        let bestCorrelation;
        let correlation;
        let i = 0;
        this.preCalculateCorrelationReferenceStereo();
        bestOffset = 0;
        bestCorrelation = Number.MIN_VALUE;
        for (; i < this.seekLength; i = i + 1) {
            correlation = this.calculateCrossCorrelationStereo(2 * i, this.refMidBuffer);
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestOffset = i;
            }
        }
        return bestOffset;
    }
    seekBestOverlapPositionStereoQuick() {
        let bestOffset;
        let bestCorrelation;
        let correlation;
        let scanCount = 0;
        let correlationOffset;
        let tempOffset;
        this.preCalculateCorrelationReferenceStereo();
        bestCorrelation = Number.MIN_VALUE;
        bestOffset = 0;
        correlationOffset = 0;
        tempOffset = 0;
        for (; scanCount < 4; scanCount = scanCount + 1) {
            let j = 0;
            while (_SCAN_OFFSETS[scanCount][j]) {
                tempOffset = correlationOffset + _SCAN_OFFSETS[scanCount][j];
                if (tempOffset >= this.seekLength) {
                    break;
                }
                correlation = this.calculateCrossCorrelationStereo(2 * tempOffset, this.refMidBuffer);
                if (correlation > bestCorrelation) {
                    bestCorrelation = correlation;
                    bestOffset = tempOffset;
                }
                j = j + 1;
            }
            correlationOffset = bestOffset;
        }
        return bestOffset;
    }
    preCalculateCorrelationReferenceStereo() {
        let i = 0;
        let context;
        let temp;
        for (; i < this.overlapLength; i = i + 1) {
            temp = i * (this.overlapLength - i);
            context = i * 2;
            this.refMidBuffer[context] = this.midBuffer[context] * temp;
            this.refMidBuffer[context + 1] = this.midBuffer[context + 1] * temp;
        }
    }
    calculateCrossCorrelationStereo(mixingPosition, compare) {
        const mixing = this._inputBuffer.vector;
        mixingPosition += this._inputBuffer.startIndex;
        let correlation = 0;
        let i = 2;
        const calcLength = 2 * this.overlapLength;
        let mixingOffset;
        for (; i < calcLength; i = i + 2) {
            mixingOffset = i + mixingPosition;
            correlation +=
                mixing[mixingOffset] * compare[i] +
                    mixing[mixingOffset + 1] * compare[i + 1];
        }
        return correlation;
    }
    overlap(overlapPosition) {
        this.overlapStereo(2 * overlapPosition);
    }
    overlapStereo(inputPosition) {
        const input = this._inputBuffer.vector;
        inputPosition += this._inputBuffer.startIndex;
        const output = this._outputBuffer.vector;
        const outputPosition = this._outputBuffer.endIndex;
        let i = 0;
        let context;
        let tempFrame;
        const frameScale = 1 / this.overlapLength;
        let fi;
        let inputOffset;
        let outputOffset;
        for (; i < this.overlapLength; i = i + 1) {
            tempFrame = (this.overlapLength - i) * frameScale;
            fi = i * frameScale;
            context = 2 * i;
            inputOffset = context + inputPosition;
            outputOffset = context + outputPosition;
            output[outputOffset + 0] =
                input[inputOffset + 0] * fi + this.midBuffer[context + 0] * tempFrame;
            output[outputOffset + 1] =
                input[inputOffset + 1] * fi + this.midBuffer[context + 1] * tempFrame;
        }
    }
    process() {
        let offset;
        let temp;
        let overlapSkip;
        if (this.midBuffer === null) {
            if (this._inputBuffer.frameCount < this.overlapLength) {
                return;
            }
            this.midBuffer = new Float32Array(this.overlapLength * 2);
            this._inputBuffer.receiveSamples(this.midBuffer, this.overlapLength);
        }
        while (this._inputBuffer.frameCount >= this.sampleReq) {
            offset = this.seekBestOverlapPosition();
            this._outputBuffer.ensureAdditionalCapacity(this.overlapLength);
            this.overlap(Math.floor(offset));
            this._outputBuffer.put(this.overlapLength);
            temp = this.seekWindowLength - 2 * this.overlapLength;
            if (temp > 0) {
                this._outputBuffer.putBuffer(this._inputBuffer, offset + this.overlapLength, temp);
            }
            const start = this._inputBuffer.startIndex +
                2 * (offset + this.seekWindowLength - this.overlapLength);
            this.midBuffer.set(this._inputBuffer.vector.subarray(start, start + 2 * this.overlapLength));
            this.skipFract += this.nominalSkip;
            overlapSkip = Math.floor(this.skipFract);
            this.skipFract -= overlapSkip;
            this._inputBuffer.receive(overlapSkip);
        }
    }
}

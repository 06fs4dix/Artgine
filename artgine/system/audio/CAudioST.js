import { CAudio, GetAudioContext, GetAudioDecodeMap } from "./CAudio.js";
import PitchShifter from '../../external/esnext/SoundTouchJS/src/PitchShifter.js';
import { CFile } from "../CFile.js";
export class CAudioST extends CAudio {
    mKeyArr;
    mPitchShifter = null;
    mState = 0;
    constructor(_key) {
        super();
        if (_key instanceof Array)
            this.mKeyArr = _key;
        else
            this.mKeyArr = [_key];
    }
    async Play() {
        const key = this.mKeyArr[Math.floor(Math.random() * this.mKeyArr.length)];
        let decBuf = GetAudioDecodeMap().get(key);
        if (!decBuf) {
            if (this.mRes != null) {
                let buf = this.mRes.Find(key);
                if (buf) {
                    decBuf = await GetAudioContext().decodeAudioData(buf);
                }
                else {
                    const raw = await CFile.Load(key);
                    decBuf = await GetAudioContext().decodeAudioData(raw);
                }
            }
            else {
                const raw = await CFile.Load(key);
                decBuf = await GetAudioContext().decodeAudioData(raw);
            }
            GetAudioDecodeMap().set(key, decBuf);
        }
        super.Play();
        this.mPitchShifter = new PitchShifter(GetAudioContext(), decBuf, 16384);
        this.mPitchShifter.tempo = this.mSpeed;
        this.mPitchShifter.pitch = 1.0;
        this.mPitchShifter.output.connect(this.mGain).connect(GetAudioContext().destination);
        this.mPitchShifter.on('play', (detail) => {
        });
        this.mPitchShifter.on('end', () => {
            this.mState = 2;
            if (this.m_remove)
                this.Destroy();
        });
        this.mPitchShifter.play();
        this.mState = 1;
    }
    Stop() {
        if (this.mPitchShifter) {
            this.mPitchShifter.stop();
            this.mPitchShifter = null;
        }
        this.mState = 2;
    }
    Volume(_val) {
        this.mGain.gain.value = _val;
    }
    IsPlay() {
        return this.mState === 1;
    }
    Destroy() {
        super.Destroy();
        if (this.mPitchShifter) {
            this.mPitchShifter.stop();
            this.mPitchShifter = null;
        }
    }
    Export() {
        return new CAudioST(this.mKeyArr);
    }
}

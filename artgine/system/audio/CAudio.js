import { CUniqueID } from "../../basic/CUniqueID.js";
import { CFile } from "../CFile.js";
export let gContext = null;
export let gDecodeMap = null;
export let gCompressor = null;
function InitAudio() {
    if (gContext == null) {
        gContext = new AudioContext();
        gDecodeMap = new Map();
        gCompressor = gContext.createDynamicsCompressor();
        gCompressor.threshold.setValueAtTime(-24, gContext.currentTime);
        gCompressor.knee.setValueAtTime(30, gContext.currentTime);
        gCompressor.ratio.setValueAtTime(12, gContext.currentTime);
        gCompressor.attack.setValueAtTime(0.003, gContext.currentTime);
        gCompressor.release.setValueAtTime(0.25, gContext.currentTime);
        gCompressor.connect(gContext.destination);
    }
}
export function GetAudioContext() {
    InitAudio();
    return gContext;
}
export function GetAudioDecodeMap() {
    InitAudio();
    return gDecodeMap;
}
export function SetCompressorParams(threshold = -24, ratio = 12) {
    gCompressor.threshold.setValueAtTime(threshold, gContext.currentTime);
    gCompressor.ratio.setValueAtTime(ratio, gContext.currentTime);
}
export class CAudio {
    mGain;
    mRes = null;
    mSpeed = 1;
    m_remove = false;
    constructor(_res = null) {
        this.mRes = _res;
        this.mGain = GetAudioContext().createGain();
        this.mGain.connect(gCompressor);
    }
    async Play() {
        if (GetAudioContext().state === 'suspended') {
            GetAudioContext().resume();
        }
    }
    Volume(_val) { }
    Stop() { }
    Update(_delay) { }
    IsPlay() { return false; }
    Destroy() {
        if (this.mGain) {
            this.mGain.disconnect();
            this.mGain = null;
        }
    }
    SetRemove(_eanble) { this.m_remove = _eanble; }
    GetRemove() { return this.mGain == null; }
    Export() {
        return null;
    }
    SetSpeed(_val) {
        this.mSpeed = _val;
    }
}
export class CAudioTag extends CAudio {
    m_key;
    m_state;
    m_tag;
    m_source;
    m_target;
    constructor(_key, _id = CUniqueID.Get(), _target = null) {
        super();
        this.m_key = _key;
        this.m_state = 0;
        this.m_source = null;
        this.m_tag = document.createElement("audio");
        this.m_tag.id = _id;
        this.m_tag.src = _key;
        this.m_tag.controls = true;
        this.m_tag.loop = true;
        this.m_tag.autoplay = true;
        this.m_tag.playbackRate = this.mSpeed;
        this.m_tag.addEventListener("canplay", () => {
            if (this.m_state == 1)
                this.Play();
            this.m_state = 2;
        });
        if (_target != null) {
            if (_target instanceof HTMLElement)
                _target.append(this.m_tag);
            else
                document.getElementById(_target).append(this.m_tag);
        }
        this.m_target = _target;
    }
    Src(_link) {
        this.m_tag.src = _link;
        this.ResetTime();
    }
    ResetTime() {
        this.m_tag.currentTime = 0;
    }
    async Play() {
        if (this.m_source != null) {
            this.m_source = GetAudioContext().createMediaElementSource(this.m_tag);
            this.m_source.connect(this.mGain);
        }
        if (this.m_state == 0) {
            this.m_state = 1;
        }
        super.Play();
        this.m_tag.play();
    }
    Stop() {
        this.m_tag.pause();
        this.m_tag.currentTime = 0;
    }
    IsPlay() {
        if (this.m_tag.duration > 0 && !this.m_tag.paused)
            return true;
        return false;
    }
    Loop(_enable) {
        this.m_tag.loop = _enable;
    }
    Volume(_val) {
        this.m_tag.volume = _val;
    }
    Pause() {
        this.m_tag.pause();
    }
    Export() {
        return new CAudioTag(this.m_key, this.m_tag.id, this.m_target);
    }
}
export class CAudioBuf extends CAudio {
    m_keyArr;
    m_source = null;
    m_decodeCount = 0;
    m_state = 0;
    constructor(_key) {
        super();
        if (_key instanceof Array)
            this.m_keyArr = _key;
        else
            this.m_keyArr = [_key];
    }
    async Play() {
        var key = this.m_keyArr[parseInt((Math.random() * this.m_keyArr.length) + "")];
        var decBuf = gDecodeMap.get(key);
        if (decBuf == null) {
            if (this.mRes != null) {
                let buf = this.mRes.Find(key);
                if (buf != null) {
                    decBuf = await GetAudioContext().decodeAudioData(buf);
                    gDecodeMap.set(key, decBuf);
                }
                else {
                    let buf = await CFile.Load(key);
                    decBuf = await GetAudioContext().decodeAudioData(buf);
                    gDecodeMap.set(key, decBuf);
                }
            }
            else {
                let buf = await CFile.Load(key);
                decBuf = await GetAudioContext().decodeAudioData(buf);
                gDecodeMap.set(key, decBuf);
            }
        }
        super.Play();
        this.m_source = GetAudioContext().createBufferSource();
        this.m_source.connect(this.mGain);
        this.m_source.buffer = decBuf;
        this.m_source.start();
        this.m_source.playbackRate.value = this.mSpeed;
        ;
        this.m_state = 1;
        this.m_source.onended = (event) => {
            this.m_state = 2;
            if (this.m_remove)
                this.Destroy();
        };
    }
    Stop() {
        if (this.m_source != null)
            this.m_source.stop();
        this.m_state = 2;
    }
    Volume(_val) {
        this.mGain.gain.value = _val;
    }
    IsPlayReady() {
        if (this.m_state == 1)
            return true;
        return false;
    }
    Destroy() {
        super.Destroy();
        this.m_source.disconnect();
        this.m_source = null;
    }
    Export() {
        return new CAudioBuf(this.m_keyArr);
    }
}

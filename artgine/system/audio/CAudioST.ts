import { CAudio, GetAudioContext, GetAudioDecodeMap } from "./CAudio.js";
import { CFile } from "../CFile.js";

// PitchShifter는 무겁고(또는 번들러가 자동 포함) import만으로도 로딩될 수 있어서
// 필요할 때만 동적으로 로딩한다. (모듈/생성자 캐시)
let gPitchShifterCtor: any = null;
let gPitchShifterLoading: Promise<any> | null = null;

async function LoadPitchShifterCtor(): Promise<any>
{
	if (gPitchShifterCtor)
		return gPitchShifterCtor;

	if (!gPitchShifterLoading)
	{
		gPitchShifterLoading = import('../../external/esnext/SoundTouchJS/src/PitchShifter.js')
			.then((m: any) => m?.default ?? m?.PitchShifter ?? m)
			.then((ctor: any) => (gPitchShifterCtor = ctor));
	}
	return gPitchShifterLoading;
}

//템포,피치 따로 조정 가능하다
export class CAudioST extends CAudio
{
	public mKeyArr: Array<string>;
	public mPitchShifter: any = null;
	public mState = 0; // 0: 준비, 1: 재생 중, 2: 종료

	constructor(_keyList: Array<string>);
	constructor(_key: string);
	constructor(_key: any) {
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
				} else {
					const raw = await CFile.Load(key);
					decBuf = await GetAudioContext().decodeAudioData(raw);
				}
			} else {
				const raw = await CFile.Load(key);
				decBuf = await GetAudioContext().decodeAudioData(raw);
			}
			GetAudioDecodeMap().set(key, decBuf);
		}

		super.Play();

		// PitchShifter 생성 (필요 시점에만 동적 로딩)
		const PitchShifter = await LoadPitchShifterCtor();
		this.mPitchShifter = new PitchShifter(GetAudioContext(), decBuf, 16384);
		this.mPitchShifter.tempo = this.mSpeed;
		this.mPitchShifter.pitch = 1.0;

		// 볼륨 연결
		this.mPitchShifter.output.connect(this.mGain).connect(GetAudioContext().destination);

		this.mPitchShifter.on('play', (detail) => {
			// detail.timePlayed 등 활용 가능
		});

		this.mPitchShifter.on('end', () => {
			this.mState = 2;
			if (this.m_remove) this.Destroy();
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

	Volume(_val: number) {
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

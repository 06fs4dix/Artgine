import {CUniqueID} from "../../basic/CUniqueID.js";
import {CFile} from "../CFile.js";
import {CRes} from "../CRes.js";
export let gContext : AudioContext=null;
export let gDecodeMap : Map<string, AudioBuffer>=null;
export let gCompressor : DynamicsCompressorNode = null;

function InitAudio()
{
	if(gContext==null)
	{
		gContext = new AudioContext();
		gDecodeMap = new Map<string, AudioBuffer>();

		gCompressor = gContext.createDynamicsCompressor();
		gCompressor.threshold.setValueAtTime(-24, gContext.currentTime);
		gCompressor.knee.setValueAtTime(30, gContext.currentTime);
		gCompressor.ratio.setValueAtTime(12, gContext.currentTime);
		gCompressor.attack.setValueAtTime(0.003, gContext.currentTime);
		gCompressor.release.setValueAtTime(0.25, gContext.currentTime);
		gCompressor.connect(gContext.destination);
	}
}
export function GetAudioContext() 
{   
	InitAudio();
	return gContext; 
}
export function GetAudioDecodeMap() 
{    
	InitAudio();
	return gDecodeMap; 
}
/*
threshold: 어느 볼륨 이상부터 압축을 적용할지 설정
값이 낮을수록(예: -50dB) → 약한 소리까지도 압축
값이 높을수록(예: -10dB) → 정말 큰 소리만 압축
-24dB → 일반적인 충돌음이나 효과음의 볼륨 피크를 기준으로 적절한 수준
-12dB → 정말 큰 소리만 압축하고 대부분은 그대로 둠
-40dB → 거의 모든 소리에 압축이 걸림 (부드럽게 들릴 수 있음)


ratio: 압축의 강도 (비율)을 설정
    1:1 → 압축 없음
    2:1 → threshold 이상 올라가는 소리를 반만 올림
    10:1 이상 → 거의 리미터(Limiter)처럼 작동 (클리핑 방지)
🔊 예시
    2 → 자연스러운 다이내믹 유지
    6 → 효과적인 압축
    12 이상 → 하드 리미터 느낌, 볼륨 튐 방지에 유용

	큰소리만 줄이기
	SetCompressorParams(-15, 6);
	모든 잡음 제거
	SetCompressorParams(-30, 10);
*/
export function SetCompressorParams(threshold = -24, ratio = 12) {
    gCompressor.threshold.setValueAtTime(threshold, gContext.currentTime);
    gCompressor.ratio.setValueAtTime(ratio, gContext.currentTime);
}


export class CAudio
{
	public mGain : GainNode;
	//res를 사용하면 미리 로딩할수 있다
	public mRes : CRes=null;
	mSpeed=1;
	m_remove=false;


	constructor(_res=null)
	{
		this.mRes=_res;
		this.mGain=GetAudioContext().createGain();
		this.mGain.connect(gCompressor); // <- 여기서 변경
	}
	async Play()
	{
		if (GetAudioContext().state === 'suspended')
		{
			GetAudioContext().resume();
		}
	}
	Volume(_val){}
	Stop(){}
	Update(_delay){}
	IsPlay()	{	return false;	}
	Destroy()
	{
		if (this.mGain) 
		{
			this.mGain.disconnect();
			this.mGain = null;
		}
	}
	SetRemove(_eanble)	{	this.m_remove=_eanble;	}
	GetRemove()	{	return this.mGain==null;	}
	Export()
	{
		return null;
	}
	SetSpeed(_val)
	{
		this.mSpeed=_val;
	}
}
//bgm용 태그에 붙이거나 루프 컨트롤 가능
export class CAudioTag extends CAudio
{
	public m_key : string;
	public m_state : number;
	public m_tag : HTMLAudioElement;
	public m_source : MediaElementAudioSourceNode;
	public m_target : HTMLElement;
	
	//어디에 생성할지
	constructor(_key : string,_id : string=CUniqueID.Get(),_target : any=null)
	{
		
		super();
		this.m_key=_key;
		this.m_state=0;
		this.m_source=null;
		//this.m_loop=true;
		
		this.m_tag=document.createElement("audio");//$("<audio id='"+_nick+"' src='"+_key+"' controls loop/>");
		this.m_tag.id=_id;
		this.m_tag.src=_key;
		this.m_tag.controls=true;
		this.m_tag.loop=true;
		this.m_tag.autoplay=true;
		this.m_tag.playbackRate=this.mSpeed;
		this.m_tag.addEventListener("canplay",()=>{
			//alert("canplay");
			if(this.m_state==1)
				this.Play();
			this.m_state=2;
			
		});

		if(_target!=null)
		{
			if(_target instanceof HTMLElement)
				_target.append(this.m_tag);
			else
				document.getElementById(_target).append(this.m_tag);
		}
			
		this.m_target=_target;
		


		//const audioDestination = g_context.destination;
		//this.m_source.connect(this.m_gain).connect(audioDestination);
	}
	Src(_link)
	{
		this.m_tag.src=_link;
		this.ResetTime();
	}
	ResetTime()
	{
		this.m_tag.currentTime=0;
	}
	async Play()
	{
		if(this.m_source!=null)
		{
			this.m_source = GetAudioContext().createMediaElementSource(this.m_tag);
			this.m_source.connect(this.mGain);
		}
		
		
		if(this.m_state==0)
		{
			this.m_state=1;
			//return;
		}
		super.Play();
		this.m_tag.play();
	}
	Stop()
	{
		//this.m_tag[0].stop();
		this.m_tag.pause();
		this.m_tag.currentTime = 0;
	}
	IsPlay()
	{
		if (this.m_tag.duration > 0 && !this.m_tag.paused) 
			return true; 
		return false;
	}
	Loop(_enable)
	{
		this.m_tag.loop=_enable;
	}
	Volume(_val)
	{
		this.m_tag.volume=_val;
	}
	Pause()
	{
		this.m_tag.pause();
	}
	Export()
	{
		return new CAudioTag(this.m_key,this.m_tag.id,this.m_target);
	}
	//toCopy()	{	return new CAudioTag(this.m_key,this.m_tag.id,this.m_target);	}
}
//버퍼로 재생함. 여러 사운드리스트 중에 재생 가능
export class CAudioBuf extends CAudio
{
	public m_keyArr :  Array<string>;
	//public m_volume =1;
	public m_source : AudioBufferSourceNode=null;
	public m_decodeCount=0;
	public m_state=0;//0준비 1재생 2종료
	
	//key가 어레이 타입일수도 있다 여러파일중 랜덤 재생하려고
	constructor(_keyList : Array<string>);
	constructor(_key : string);
	constructor(_key : any)
	{
		super();
		
		if(_key instanceof Array)
			this.m_keyArr=_key;
		else
			this.m_keyArr=[_key];
		
		//this.m_remove=true;
		
	}

	async Play()
	{
		var key=this.m_keyArr[parseInt((Math.random()*this.m_keyArr.length)+"")];
		var decBuf=gDecodeMap.get(key);
		if(decBuf==null)
		{
			if(this.mRes!=null)
			{
				let buf=this.mRes.Find(key);
				if(buf!=null)
				{

					decBuf=await GetAudioContext().decodeAudioData(buf);
					gDecodeMap.set(key,decBuf);
				}
				else
				{
					let buf=await CFile.Load(key);
					decBuf=await GetAudioContext().decodeAudioData(buf);
					gDecodeMap.set(key,decBuf);
				}
			}
			else
			{
				
				let buf=await CFile.Load(key);
				decBuf=await GetAudioContext().decodeAudioData(buf);
				gDecodeMap.set(key,decBuf);

			}
			
		}
		super.Play();
			
		this.m_source = GetAudioContext().createBufferSource();
		this.m_source.connect(this.mGain);
		//this.m_source.connect(this.m_gain).connect(g_context.destination);
		this.m_source.buffer=decBuf;
		this.m_source.start();
		this.m_source.playbackRate.value=this.mSpeed;;
		

		this.m_state=1;
		this.m_source.onended=(event)=>{
			this.m_state=2;
			if(this.m_remove)
				this.Destroy();
		};
		
		
	}
	Stop()
	{
		if(this.m_source!=null)
			this.m_source.stop();
		this.m_state=2;
	}
	Volume(_val)
	{
		//this.m_volume=_val;
		this.mGain.gain.value=_val;
	}
	IsPlayReady()
	{
		if (this.m_state==1) 
			return true; 
		return false;
	}
	Destroy(): void {
		super.Destroy();
		this.m_source.disconnect();
		this.m_source=null;
	}
	Export()
	{
		return new CAudioBuf(this.m_keyArr);
	}
	// SetPlayBack()
	// {

	// }

}

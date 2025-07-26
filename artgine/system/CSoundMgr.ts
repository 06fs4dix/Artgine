import {CRes} from "../system/CRes.js"
import {CVec3} from "../geometry/CVec3.js"
import {CMath} from "../geometry/CMath.js"

import {CUniqueID} from "../basic/CUniqueID.js";
import {CArray} from "../basic/CArray.js";

import { CAudio, CAudioBuf } from "./audio/CAudio.js";


export class CSound
{
	public mNick : string;
	public mAudio : CAudio =null;
	public mVolume=1;
	public mLoopCount=1;
	public mRemove=false;
	constructor(_audio : CAudio,_nick : string=CUniqueID.Get())
	{
		this.mNick=_nick;
		
		// if(_audio instanceof CAudioTag)
		// {
		// 	this.m_audio=_audio;
		// 	this.m_audio.Play();
		// }
		// else
		this.mAudio=_audio.Export();
		this.mVolume=this.mAudio.mGain.gain.value;
	}
	Play()
	{
		this.mAudio.Play();
		if(this.mLoopCount>0)
			this.mLoopCount--;
	}
	Update(_delay)
	{
		if(this.mAudio.IsPlay()==false)
		{
			if(this.mLoopCount>0)
				this.mAudio.Play();
			else if(this.mRemove==true)
			 	this.mAudio.Destroy();
			
		}
	}
	AudioVolume(_val)
	{
		this.mAudio.Volume(_val*this.mVolume);
	}
}
class CSoundPos extends CSound
{
	public mPos : CVec3;
	public mPosVolume=1;
	constructor(_audio : CAudio,_pos : CVec3,_nick : string=null)
	{
		super(_audio,_nick);
		this.mPos=_pos;
	}
	AudioVolume(_val)
	{
		this.mAudio.Volume(_val*this.mVolume*this.mPosVolume);
	}
	
}
export class CSoundMgr
{
	//public m_audioMap=new Map<string,CAudio>();
	public mPlayList=new CArray<CSound>();
	public mSoundMap=new Map<string,CSound>();
	public mPos=null;
	public mMasterVolume=1;
	public mRes : CRes;
	public mBufCount=0;
	constructor(_res : CRes)
	{
		this.mRes=_res;
	}
	

	Push(_obj : CSound,_nick : string=null)
	{
		_obj.mAudio.mRes=this.mRes;
	
		this.mSoundMap.set(_obj.mNick,_obj);
		
		if(_obj.mAudio instanceof CAudioBuf)
		{
			this.mBufCount++;
		}
	}
	Get(_nick)
	{
		return this.mSoundMap.get(_nick);
	}
	SetPos(_pos)
	{
		this.mPos=_pos;
	}
	VolumeReset()
	{
		var abVolume=1;
		if(this.mBufCount>0)
			abVolume=1/this.mPlayList.Size();
	
		for(let i=0;i<this.mPlayList.Size();++i)
		{
			this.mPlayList[i].AudioVolume(abVolume);
		}
	}
	Update(_delay)
	{

		this.mPlayList.Clear();
		var removeList=new Array();
		for(var eachKey of this.mSoundMap.keys())
		{
			var eachValue=this.mSoundMap.get(eachKey);
			
			
			if(eachValue.mAudio instanceof CAudioBuf==false)
				continue;
				
			eachValue.Update(_delay);	
			if(eachValue.mAudio.mGain==null)
			{
				removeList.push(eachKey);
			}
			else if(eachValue.mAudio.IsPlay())
			{
				this.mPlayList.Push(eachValue);

			}

			if(eachValue instanceof CSoundPos && this.mPos!=null)
			{
				var v=1;
				var len=CMath.V3Len(CMath.V3SubV3(eachValue.mPos,this.mPos));
				if(len>500)
				{
					v=1-(len-500)/500;
					if(v<0)	
						v=0;
				}
				eachValue.mPosVolume=v;
			}
			
		}
		this.VolumeReset();
		for(var each0 of removeList)
		{
			this.mSoundMap.delete(each0);
		}
		
	}
	UpdateLoop()
	{
		setTimeout(()=>{this.UpdateLoop();}, 100);
		this.Update(100);
	}
}


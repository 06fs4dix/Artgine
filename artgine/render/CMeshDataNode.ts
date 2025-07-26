import {CVec3} from "../geometry/CVec3.js"
import {CMeshCreateInfo} from "./CMeshCreateInfo.js"

import {CVec4} from "../geometry/CVec4.js";
import {CObject} from "../basic/CObject.js";

export class CKeyFrame extends CObject
{
	public key : number;
	public value : CVec4;
	constructor()
	{
		super();
		this.key=0;
		this.value=new CVec4();
		this.value.w=100000;
	}
}

export class CMeshDataNode extends CObject
{
	public ci : CMeshCreateInfo;
	//public draw : CMeshDraw;
	public keyFramePos : Array<CKeyFrame>;
	public keyFrameRot : Array<CKeyFrame>;
	public keyFrameSca : Array<CKeyFrame>;
	
	public textureOff : Array<number>;//이게 필요한 이유는 텍스쳐 리스트에서 추출해서 오프셋으로 전달하기 위해서
	public materialOff : Array<number>;
	
	public pos : CVec3;
	public sca : CVec3;
	public rot : CVec4;
	rev=false;
	public skinKey : Array<string>;
	
	constructor()
	{
		super();
		this.ci=null;
		//this.draw=new CMeshDraw();
		
		this.keyFramePos=new Array();
		this.keyFrameRot=new Array();
		this.keyFrameSca=new Array();
		
		
		this.textureOff=new Array();
		this.materialOff=new Array();
		
		this.pos=new CVec3();
		this.sca =new CVec3(1, 1, 1);
		this.rot=new CVec4();
		this.skinKey=new Array<string>();
	}
	IsSkinKey(_key) : boolean
	{
		for(var each0 of this.skinKey)
		{
			if(each0==_key)
				return true;	
		}
		return false;
	}
	FindKeyFrame(_key : number,_keyFrameVec : Array<CKeyFrame>)
	{
		var off = _keyFrameVec.length;
		for (var i = 0; i < _keyFrameVec.length; ++i)
		{
			if (_key == _keyFrameVec[i].key)
				return _keyFrameVec[i];
			else if (_key < _keyFrameVec[i].key)
			{
				off = i;
				break;
			}
			
		}
		var keyframe=new CKeyFrame();
		keyframe.key = _key;
		_keyFrameVec.splice(off,0, keyframe);
		return _keyFrameVec[off];
	}
	
	FindKeyFrame2(_type : string,_key : number) : CKeyFrame
	{
		var fv=null;
		if(_type=="S"  || _type=="Lcl Scaling")
			fv=this.keyFrameSca;
		else if(_type=="R" || _type=="Lcl Rotation")
			fv=this.keyFrameRot;
		else
			fv=this.keyFramePos;
			
		var off = fv.length;
		for (var i = 0; i < fv.length; ++i)
		{
			if (_key == fv[i].key)
				return fv[i];
			else if (_key < fv[i].key)
			{
				off = i;
				break;
			}
			
		}
		var keyframe=new CKeyFrame();
		keyframe.key = _key;
		fv.splice(off,0, keyframe);
		return fv[off];
		
	}
}

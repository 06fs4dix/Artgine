import {CVec3} from "../geometry/CVec3.js"
import {CMeshCreateInfo} from "./CMeshCreateInfo.js"

import {CVec4} from "../geometry/CVec4.js";
import {CObject} from "../basic/CObject.js";
import { CBound } from "../geometry/CBound.js";
import { CVec2 } from "../geometry/CVec2.js";

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

	public keyFrameCA : Array<CKeyFrame>;//RGBA
	public keyFrameTex : Array<CKeyFrame>;//-1,-1,-1,-1
	
	public textureOff : Array<number>;//이게 필요한 이유는 텍스쳐 리스트에서 추출해서 오프셋으로 전달하기 위해서
	//public materialOff : Array<number>;
	
	public pos : CVec3;
	public sca : CVec3;
	public rot : CVec4;
	public CA : CVec4;
;

	
	//rev=false;
	public skinKey : Array<string>;
	//key : string="";
	
	constructor()
	{
		super();
		this.ci=null;
		//this.draw=new CMeshDraw();
		
		this.keyFramePos=new Array();
		this.keyFrameRot=new Array();
		this.keyFrameSca=new Array();
		this.keyFrameCA=new Array();
		this.keyFrameTex=new Array();
		
		
		this.textureOff=new Array();
		//this.materialOff=new Array();
		
		this.pos=new CVec3();
		this.sca =new CVec3(1, 1, 1);
		this.rot=new CVec4();
		this.CA=new CVec4(1,1,1,1);
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
	
	
	FindKeyFrame(_type : string,_key : number) : CKeyFrame
	{
		var fv=null;
		if(_type=="S"  || _type=="Lcl Scaling")
			fv=this.keyFrameSca;
		else if(_type=="R" || _type=="Lcl Rotation")
			fv=this.keyFrameRot;
		else if (_type === "DiffuseColor" ||_type === "BaseColor" || 
			_type === "Base Color" ||_type === "Visibility" || _type === "Opacity") 
			fv = this.keyFrameCA;
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
		if(fv == this.keyFrameCA)
		{
			keyframe.value.x=1;
			keyframe.value.y=1;
			keyframe.value.z=1;
			keyframe.value.w=1;
		}
		keyframe.key = _key;
		fv.splice(off,0, keyframe);
		return fv[off];
		
	}
}

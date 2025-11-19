import {CVec3} from "../geometry/CVec3.js"
import {CMath} from "../geometry/CMath.js"
import {CMat, IMat} from "../geometry/CMat.js"
import {CVec4} from "../geometry/CVec4.js";
import { CUpdate } from "../basic/Basic.js";
import {CPoolGeo} from "../geometry/CPoolGeo.js";
import { CTexture } from "./CTexture.js";
import { CAlpha, CColor } from "../canvas/component/CColor.js";

export class CMeshCopyNode implements IMat
{
	public bpos : CVec3;
	public brot : CVec4;
	public bsca : CVec3;
	
	public pos : CVec3;
	public rot : CVec4;
	public sca : CVec3;
	//public CA : CVec4;
	public color : CColor;
	public alpha : CAlpha;
	public texHash : string;

	public pst : CMat;
	public updateMat=CUpdate.eType.Not;
	public FMatAtt : boolean;
	//public all : CMat;
	
	public textureOff : Array<number>;
	updateTex=false;
	//public texture : Array<CTexture>;
	//public materialOff : Array<number>;
	
	constructor()
	{
		this.bpos=null;
		this.brot=null;
		this.bsca=null;
		
		this.pos=new CVec3();
		this.rot=new CVec4();
		this.sca=new CVec3();
		this.pst=new CMat();
		this.color=null;
		this.alpha=null;
		//this.all=new CMat();
		
		this.textureOff=new Array();
		//this.texture=new Array();
		//this.materialOff=new Array();
		this.FMatAtt=false;
	}
	PRSReset()
	{
		var sm=CPoolGeo.ProductMat();
		var rm=CPoolGeo.ProductMat();
		
	
		CMath.MatScale(this.sca,sm);
		CMath.QutToMat(this.rot,rm);
		//CMath.QutToMat(CMath.EulerToQut(this.rot.xyz),rm.dt);
			
		

		CMath.MatMul(sm, rm,this.pst,true);
		CPoolGeo.RecycleMat(sm);
		CPoolGeo.RecycleMat(rm);
		

		

		this.pst.mF32A[12] = this.pos.x;
		this.pst.mF32A[13] = this.pos.y;
		this.pst.mF32A[14] = this.pos.z;
		this.pst.UnitCheck();
		this.updateMat=CUpdate.eType.Updated;
		//this.CA=this.CA;
		
	}
	GetMat(): CMat {
		return this.pst;
	}
}

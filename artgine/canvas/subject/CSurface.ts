import { CJSON } from "../../basic/CJSON.js";
import { CObject, CPointer } from "../../basic/CObject.js";
import { CUniqueID } from "../../basic/CUniqueID.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CTexture, CTextureInfo } from "../../render/CTexture.js";
import { CFrame } from "../../util/CFrame.js";
import { CPaintSurface } from "../component/paint/CPaintSurface.js";

import { CSubject } from "./CSubject.js";


var gSurfaceOff = 0;
export class CSurface extends CSubject
{
	//public m_priority : number;
	public mRenderPass=new CRenderPass();
	public mPaint : CPaintSurface=null;
	//public m_size : CVec2;

	public mTexInfo : Array<CTextureInfo>=null;
	public mTexSize : CVec2=null;
	public mTexKey : string=null;
	public mTexLinear : boolean=null;
	public mRTUse=true;
	public mTexCreate=true;

	constructor()
	{
		super();
		gSurfaceOff++;
		//this.m_priority=CRenderPass.ePriority.Surface + g_surfaceOff;
		//this.m_size=new CVec2(1, 1);
		this.mPaint = new CPaintSurface(null);
		this.PushComp(this.mPaint);
		
		this.mRenderPass.mPriority=CRenderPass.ePriority.Surface+gSurfaceOff;
		this.mTexKey=CUniqueID.GetHash()+".tex";
		this.mRenderPass.mRenderTarget=this.mTexKey;
	}
	// SurfaceHide(_member : string) : boolean {
	// 	return true;
	// }
	override IsShould(_member: string, _type: CObject.eShould) 
    {
		// if(_member == "mPaint" || _member == "mTexCreate" ) {
		// 	return false;
		// }
		if(_member == "mTexKey" || _member == "mTexSize" || _member == "mTexInfo"  || _member == "mTexLinear" ||
			_member == "mRenderPass" || _member == "mRTUse"
		)
			return true;
		
		return false;
	}
    SetFrame(_fw: CFrame): void {
        super.SetFrame(_fw);
		if(_fw!=null)
		{
			if(this.mRenderPass.mShader=="")
				this.mRenderPass.mShader=_fw.Pal().Sl2D().GetShader("Pre2Blit").Key();//_fw.Pal().Sl2D().m_key;
			if(this.mTexCreate)
			{
				this.mTexCreate=false;
				this.mRenderPass.mRenderTarget=this.GetFrame().Ren().BuildRenderTarget(this.mTexInfo,this.mTexSize,this.mTexKey);
				if(this.mTexLinear)
                {
                    let tex =this.GetFrame().Res().Find(this.GetTexKey()) as CTexture;
                    tex.SetFilter(CTexture.eFilter.Linear);
                }
					
			}
			
			this.mPaint.SetRenderPass(this.mRenderPass,false);
		}
        
		if(this.mRTUse)
			this.mRenderPass.mRenderTarget=this.mTexKey;
		else
			this.mRenderPass.mRenderTarget="";

    }
	static NewPriority()	{	gSurfaceOff++;return CRenderPass.ePriority.Surface+gSurfaceOff;}


	//GetRenderTarget() { return this.m_renderPass.m_renderTarget; }
	//GetPriority()	{ return this.m_priority; }
	SetUseRT(_enable : boolean)	
	{	
		this.mRTUse=_enable;
		if(_enable)
			this.mRenderPass.mRenderTarget=this.mTexKey;
		else
			this.mRenderPass.mRenderTarget="";
	}
	GetPaint()	:	CPaintSurface	{	return this.mPaint;	}
	GetRP()	{	return this.mRenderPass;	}
	// NewRT(_texInfo : Array<CTextureInfo>=null,_texSize : CVec2=null,_texLinear : boolean=false)	
	// {
	// 	this.mRenderPass.mRenderTarget = this.mTexKey;

	// 	if(this.GetFrame()==null)
	// 	{
	// 		this.mTexInfo=_texInfo;
	// 		this.mTexSize=_texSize;
	// 		this.mTexCreate=true;
	// 		this.mTexLinear=_texLinear;
	// 	}
	// 	else
	// 	{
    //         //this.GetFrame().Ren().TMgr().RenderTarget(_texInfo,_texSize,this.m_texKey);
    //         this.GetFrame().Ren().BuildRenderTarget(this.mTexInfo,this.mTexSize,this.mTexKey);
	// 		let tex =this.GetFrame().Res().Find(this.GetTexKey()) as CTexture;
    //         tex.SetFilter(CTexture.eFilter.Linear);
	// 		//this.GetFrame().Ren().TMgr().RenderTarget(_texInfo,_texSize,this.m_texKey);
	// 		//this.GetFrame().Ren().TMgr().ChangeFilter(this.RTKey(), CTexture.eFilter.Linear);
	// 		this.mRenderPass.Reset();
			
	// 	}
		
			
	// }
	GetTexKey()	{	return this.mTexKey;	}

	public Export(_copy?: boolean, _resetKey?: boolean): this {
		const watch = super.Export(_copy, _resetKey);
		watch.mPaint = watch.FindComps(CPaintSurface)[0];
		return watch;
	}
	ImportCJSON(_json: CJSON)
    {
		const watch = super.ImportCJSON(_json) as CSurface;
		watch.mPaint = watch.FindComps(CPaintSurface)[0] as CPaintSurface;
		return watch as this;
	}
	override EditChange(_pointer: CPointer, _childe: boolean): void {
		super.EditChange(_pointer,_childe);
		if(_pointer.member=="mTexKey")
		{
			this.mRenderPass.mRenderTarget=this.mTexKey;
			this.mRenderPass.Reset();
			//this.mRenderPass.EditRefresh();
			
			
		}

		
	}

};
import { CUpdate } from "../../basic/Basic.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CSubject } from "../subject/CSubject.js";
import { CCanvas, CCanvasPlugin } from "./CCanvas.js";
import { CRPMgr } from "./CRPMgr.js";

export class CCanvasPluginRPMgr extends CCanvasPlugin
{
	private mRPMgr : CRPMgr;	// 현재 사용중인 RPMgr
	private mChangeRPMgr : CRPMgr;	// 새로 사용할 RPMgr

	constructor(_RPMgr : CRPMgr)
	{
		super();
		this.SetRPMgr(_RPMgr);
	}
	override SetCanvas(_canvas: CCanvas): void {
		super.SetCanvas(_canvas);
		if(this.mRPMgr!=null) this.mRPMgr.mUpdate = CUpdate.eType.Updated;
		if(this.mChangeRPMgr!=null) this.mChangeRPMgr.mUpdate = CUpdate.eType.Updated;
	}
	SetRPMgr(_rpMgr : CRPMgr = null)
	{
		if(_rpMgr==null) _rpMgr = new CRPMgr();
		if(this.mRPMgr==null) this.mRPMgr=_rpMgr;
		else this.mChangeRPMgr=_rpMgr;
		this.mRPMgr.mUpdate=CUpdate.eType.Updated;
	}
	override Exe()
	{
		if(this.mRPMgr.mUpdate==CUpdate.eType.Updated)
			this.mRPMgr.mUpdate=CUpdate.eType.Already;
		else if(this.mRPMgr.mUpdate==CUpdate.eType.Already)
			this.mRPMgr.mUpdate=CUpdate.eType.Not;

		// RPMgr가 업데이트되면 전체 삭제
		if(this.mRPMgr.mUpdate != CUpdate.eType.Not)
		{
			for(const autoRP of this.mRPMgr.mRPArr)
				this.mCanvas.RemoveAutoRP(autoRP.Key());
			for(const suf of this.mRPMgr.mSufArr)
				this.mCanvas.Find(suf.Key())?.Destroy();
			for(const [key, tex] of this.mRPMgr.mTexMap) {
				const oldTex = this.mCanvas.GetFrame().Res().Find(key);
				if(oldTex) {
					this.mCanvas.GetFrame().Ren().ReleaseTexture(oldTex);
					this.mCanvas.GetFrame().Res().Remove(key);
				}
			}
		}

		// 새로 RPMgr가 세팅됨
		if(this.mChangeRPMgr!=null)
		{			
			this.mRPMgr = this.mChangeRPMgr;
			this.mRPMgr.mUpdate = CUpdate.eType.Already;
			this.mChangeRPMgr = null;
		}

		// RPMgr가 업데이트되면 전체 추가
		if(this.mRPMgr.mUpdate != CUpdate.eType.Not)
		{
			for(const autoRP of this.mRPMgr.mRPArr)
				this.mCanvas.PushAutoRP(autoRP.Key(), autoRP);
			for(const suf of this.mRPMgr.mSufArr)
				this.mCanvas.PushSub(suf.Export(true, false));
			for(const [key, tex] of this.mRPMgr.mTexMap) {
				const oldTex = this.mCanvas.GetFrame().Res().Find(key);
				if(oldTex) {
					this.mCanvas.GetFrame().Ren().ReleaseTexture(oldTex);
					this.mCanvas.GetFrame().Res().Remove(key);
				}
				this.mCanvas.GetFrame().Ren().BuildRenderTarget(tex.GetInfo(),tex.HasOrg()?new CVec2(tex.GetOrgWidth(),tex.GetOrgHeight()):null,key);
			}
		}
	};
	override Destroy()
	{
		super.Destroy();
		this.SetRPMgr();
	}
}
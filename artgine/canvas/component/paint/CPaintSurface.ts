import { CVec2 } from "../../../geometry/CVec2.js";
import { CRenderPass } from "../../../render/CRenderPass.js";
import { CShader } from "../../../render/CShader.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { CRPAuto } from "../../CRPMgr.js";
import { CPaint } from "./CPaint.js";

export class CPaintSurface extends CPaint
{

    constructor(_rp : CRenderPass,_size : CVec2);
    constructor(_rp : Array<CRenderPass>,_size : CVec2);
    constructor(_rp : CRenderPass);
    constructor(_rp : Array<CRenderPass>);
    constructor(_rp : any,_size : any=null)
    {
        super();
        if(_rp==null)	return;
        else
        {
            this.PushRenderPass(_rp);

        }
        this.mBoundFMatR=0xffffffff;
    }
    InitPaint()
    {
        super.InitPaint();

        this.mBoundFMatR=0xffffffff;
    }
    EmptyRPChk()
    {
        if(this.mRenderPass.length==0)
        {
            var rp=new CRPAuto("Pre2Blit");
            this.mRenderPass=[rp];
        }
        
    }
    Update(_delay)
    {
        
        if(this.mRenPT.length==0)
            return;
    }
    Render(_vf : CShader)
    {
        var barr=this.RenderBatch(_vf,1);
        if(barr==null)	return;


        this.mOwner.GetFrame().BMgr().BatchOn();
        this.Common(_vf);
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMat", this.GetFMat()));
        this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTexture );
        var dm=this.GetDrawMesh("CPaint2D",_vf,this.mOwner.GetFrame().Pal().MCI2D());
        this.mOwner.GetFrame().BMgr().SetBatchMesh( dm);

        barr[0]=this.mOwner.GetFrame().BMgr().BatchOff();
        
    }


};
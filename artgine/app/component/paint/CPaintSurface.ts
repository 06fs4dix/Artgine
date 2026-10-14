import { CUpdate } from "../../../basic/Basic.js";
import { CVec2 } from "../../../geometry/CVec2.js";
import { CRenderPass } from "../../../render/CRenderPass.js";
import { CShader } from "../../../render/CShader.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { CRPAuto } from "../../canvas/CRPMgr.js";
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
        this.mBW.mRadian=0xffffffff;
    }
    override InitChk()
    {
        super.InitChk();

        this.mBW.mRadian=0xffffffff;
    }
    override Update(_update : CUpdate)
    {

        if(this.mRenPT.length==0)
            return;
    }
    override Render(_vf : CShader)
    {
        var barr=this.RenderBatch(_vf,1);
        if(barr==null)	return;


        this.mOwner.GetFrame().BMgr().BatchOn();
        this.Common(_vf);
        this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("worldMat", this.GetFMat()));
        this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey);
        var dm=this.GetDrawMesh("Artgine/DM/Surface",_vf,this.mOwner.GetFrame().Pal().MCI2D());
        this.mOwner.GetFrame().BMgr().SetBatchMesh( dm);

        barr[0]=this.mOwner.GetFrame().BMgr().BatchOff();
        
    }


};
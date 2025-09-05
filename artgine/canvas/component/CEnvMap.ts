
import {CMath} from "../../geometry/CMath.js";
import {CVec2} from "../../geometry/CVec2.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CRenderPass} from "../../render/CRenderPass.js";

import {CShaderAttr} from "../../render/CShaderAttr.js";
import {CTexture,  CTextureInfo } from "../../render/CTexture.js";
import {CBrush} from "../CBrush.js";
import { CRPAuto } from "../CRPMgr.js";
import {CCamComp} from "./CCamComp.js";

export default class CEnvMap extends CCamComp
{
    mSize : number;
    mCycle : number = 0;

    constructor(_key : string, _size : number, _skyTex : string)
    {
        super(_key);

        //6방면 구워서 6 * (light, skybox) rp 생성
        for(let i = 0; i < 6; i++) {
            //여기서 스카이박스 모델들 굽고
            var rp=new CRPAuto("3DSkin");
            rp.mInTag="env";
            rp.mInPaint.add("CPaint3D");
            rp.mCullFrustum = false;
            rp.mCullFace=CRenderPass.eCull.CW;
            rp.mRenderTarget=this.GetTex();
            rp.mRenderTargetUse=new Set<number>([i]);
            rp.mPriority=CRenderPass.ePriority.BackGround - i * 2 - 2;
            rp.mCamera=this.mShadowKey+i;
            this.PushRPAuto(rp);

            //여기서 박스 그림
            //PreSkyGradient
            var rp=new CRPAuto("CubeSky");
            rp.mInTag="skybox";
            rp.mInPaint.add("CPaint3D");
            rp.mClearColor = false;
            rp.mClearDepth = false;
            rp.mCullFrustum = false;
            rp.mCullFace=CRenderPass.eCull.CCW; // 박스 안에서 박스가 보여야 하기 때문에
            rp.mRenderTarget=this.GetTex();
            rp.mRenderTargetUse=new Set<number>([i]);
            rp.mCamera=this.mShadowKey+i;
            rp.mPriority=CRenderPass.ePriority.BackGround - i * 2 - 1;
            rp.mShaderAttr.push(new CShaderAttr(0, _skyTex));
            this.PushRPAuto(rp);
        }

        this.mSize=_size;
    }

    public SetCycle(_cycle : number) {
        this.mCycle = _cycle;
    }

    override CCamCompReq(_brush : CBrush)
    {
        var pos=this.GetOwner().GetPos();
        var camList=[
            new CVec3(1, 0, 0),new CVec3(-1, 0, 0),new CVec3(0, -1, 0),
            new CVec3(0, 1, 0),new CVec3(0, 0, 1),new CVec3(0, 0, -1)
        ];

        //render target
        var texKey=this.mShadowKey+".tex";
        if(this.GetOwner().GetFrame().Res().Find(texKey)==null)
        {
            let texInfo=new CTextureInfo(CTexture.eTarget.Cube,CTexture.eFormat.RGBA8);
            this.GetOwner().GetFrame().Ren().BuildRenderTarget([texInfo],new CVec2(this.mSize,this.mSize),texKey);
            let tex : CTexture = this.GetOwner().GetFrame().Res().Find(texKey);
            tex.SetMipMap(CTexture.eMipmap.GL);
            tex.SetWrap(CTexture.eWrap.Clamp);
            this.GetOwner().GetFrame().Ren().BuildTexture(tex);
        }
        
		for(var i=0;i<camList.length;++i)
		{
            var cam=_brush.GetCamera(this.mShadowKey+i);
			cam.Init(pos,CMath.V3AddV3(pos,camList[i]));
            //이유를 못찾았는데 fov값이 조금 더 넓게 나와서 다시 함.
            cam.SetFov(Math.PI * 0.495);
            cam.SetScreenWidthBase(true);
			
            // cam.SetViewPort(new CVec4(0, 0, this.m_size, this.m_size));
            cam.mWidth = this.mSize;
            cam.mHeight = this.mSize;
            cam.mRCS = false;
			
			// cam.m_RCS = false;
			cam.ResetPerspective();
            cam.Update(1);
		}

        for(let i = 0; i < this.mWrite.length; i++) {
            var rp = this.mWrite[i];
            var srpKey=this.mShadowKey+rp.mShader+i;
            var srp : CRPAuto=_brush.GetAutoRP(srpKey);
            if(srp==null)
            {
                srp=rp.Export();
                _brush.SetAutoRP(srpKey,srp);
            }
            srp.mCycle = this.mCycle;
        }
    }

    
}
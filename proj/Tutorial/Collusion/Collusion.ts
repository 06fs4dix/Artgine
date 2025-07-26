//Version
const version='2025-07-16 22:51:39';
import "../../../artgine/artgine.js"

//Class
import {CClass} from "../../../artgine/basic/CClass.js";

//Atelier
import {CPreferences} from "../../../artgine/basic/CPreferences.js";
var gPF = new CPreferences();
gPF.mTargetWidth = 0;
gPF.mTargetHeight = 0;
gPF.mRenderer = "GL";
gPF.m32fDepth = false;
gPF.mTexture16f = false;
gPF.mAnti = true;
gPF.mBatchPool = true;
gPF.mXR = false;
gPF.mDeveloper = true;
gPF.mIAuto = true;
gPF.mWASM = true;

import {CAtelier} from "../../../artgine/canvas/CAtelier.js";

import {CPluging} from "../../../artgine/util/CPluging.js";
var gAtl = new CAtelier();
gAtl.mPF = gPF;
await gAtl.Init(['Main.json']);
var Main = gAtl.Canvas('Main.json');

//EntryPoint
import {CObject} from "../../../artgine/basic/CObject.js"
import { CPool } from "../../../artgine/basic/CPool.js";
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CPaint3D } from "../../../artgine/canvas/component/paint/CPaint3D.js";
import { CCollider } from "../../../artgine/canvas/component/CCollider.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CRigidBody } from "../../../artgine/canvas/component/CRigidBody.js";
import { CBound } from "../../../artgine/geometry/CBound.js";
import CBehavior from "../../../artgine/canvas/component/CBehavior.js";
import { CPaint } from "../../../artgine/canvas/component/paint/CPaint.js";
import { CColor } from "../../../artgine/canvas/component/CColor.js";
import { CUpdate } from "../../../artgine/basic/Basic.js";
import { CForce } from "../../../artgine/canvas/component/CForce.js";
import { CMath } from "../../../artgine/geometry/CMath.js";
import { CBGAttachButton } from "../../../artgine/util/CModalUtil.js";
import { CUtil } from "../../../artgine/basic/CUtil.js";
var gPushMode=false;
class CControl extends CBehavior
{
    mCollision=CUpdate.eType.Not;
    mPush=new CVec3();
    mSleep=0;
    Collision(_org: CCollider, _size: number, _tar: Array<CCollider>, _push: Array<CVec3>): void {
        this.GetOwner().FindComp(CPaint).SetColorModel(new CColor(1,0,0,CColor.eModel.RGBMul));
        this.mCollision=CUpdate.eType.Updated;
        this.mPush=CMath.V3MulFloat(_push[0],-1);
    }
    Start(): void {
        this.NewForce();
    }
    Update(_delay: any): void {
        if(this.mCollision==CUpdate.eType.Updated)
        {
            this.mCollision=CUpdate.eType.Already;
            if(gPushMode)
                this.GetOwner().FindComp(CRigidBody).Clear();
        }
        else if(this.mCollision==CUpdate.eType.Already)
        {
            this.GetOwner().FindComp(CPaint).SetColorModel(new CColor(0,0,0,CColor.eModel.None));
            if(gPushMode)
            this.GetOwner().FindComp(CRigidBody).Push(new CForce("move",CMath.V3Nor(this.mPush),200));
            this.mCollision=CUpdate.eType.Not;
        }
        let pos=this.GetOwner().GetPos();
        let len=CMath.V3Len(pos);
        if(this.mSleep<=0)
        {
            if(len>1000)
            {
                this.GetOwner().FindComp(CRigidBody).Clear();
                let force=new CForce("move",CMath.V3MulFloat(CMath.V3Nor(pos),-1),200);
                this.GetOwner().FindComp(CRigidBody).Push(force);
                this.mSleep=1000;
            }
            else if(len<10)
            {
                this.GetOwner().FindComp(CRigidBody).Clear();
                this.NewForce();
                this.mSleep=1000;
                //this.GetOwner().SetPos(CMath.V3AddV3(pos,new CVec3(Math.random()*200-100,Math.random()*200-100)));

            }
        }
        else
            this.mSleep-=_delay;
        
    }
    NewForce()
    {
        this.GetOwner().FindComp(CRigidBody).Push(new CForce("move",CMath.V3Nor(new CVec3(Math.random()-0.5,Math.random()-0.5)),200));
    }
}

CPool.On("Box",()=>{
    let sub=new CSubject();
    let pt=sub.PushComp(new CPaint3D(gAtl.Frame().Pal().GetBoxMesh()));
    pt.SetTexture(gAtl.Frame().Pal().GetNoneTex());
    let cl=sub.PushComp(new CCollider(pt));
    cl.SetLayer("basic");
    cl.PushCollisionLayer("basic");
    let rb=sub.PushComp(new CRigidBody());
    rb.SetRestitution();
    sub.SetSca(new CVec3(0.1,0.1,0.1));

    sub.PushComp(new CControl());

    return sub;
},CPool.ePool.Product);

CPool.On("Sphere",()=>{
    let sub=new CSubject();
    let pt=sub.PushComp(new CPaint3D(gAtl.Frame().Pal().GetSphereMesh()));
    pt.SetTexture(gAtl.Frame().Pal().GetNoneTex());
    let cl=sub.PushComp(new CCollider(pt));
    cl.SetLayer("basic");
    cl.PushCollisionLayer("basic");
    cl.SetBoundType(CBound.eType.Sphere);
    let rb=sub.PushComp(new CRigidBody());
    rb.SetRestitution();
    sub.SetSca(new CVec3(0.1,0.1,0.1));

    sub.PushComp(new CControl());

    return sub;
},CPool.ePool.Product);


async function Init()
{
    Main.Clear();
    const pushCheckbox = CUtil.IDInput('pushCheckbox');
    const countInput = CUtil.IDInput('countInput');
    const typeSelect = CUtil.IDInput('typeSelect');
    gPushMode=pushCheckbox.checked;
    let count=Number(countInput.value);
    

    for(let i=0;i<count;++i)
    {
        let type=typeSelect.value;
        if(type=="Box_Sphere")
        {
            if(Math.random()>0.5)   type="Sphere";
            else type="Box";
        }
        
        let sub=await CPool.Product<CSubject>(type);
        sub.SetPos(new CVec3(Math.random()*1000-500,Math.random()*1000-500));
        if(gPushMode==false)    sub.FindComp(CRigidBody).SetRestitution(0);
        else sub.FindComp(CRigidBody).SetRestitution(0.5);
        Main.Push(sub);
    }
}

let option=new CBGAttachButton("option_btn");
option.SetTitleText("Option");
option.SetContent(`
    
  <div class="form-check mb-3">
    <input class="form-check-input" type="checkbox" id="pushCheckbox">
    <label class="form-check-label" for="pushCheckbox">
      Push
    </label>
  </div>

  <div class="mb-3">
    <label for="countInput" class="form-label">Count</label>
    <input type="number" class="form-control" id="countInput" placeholder="Enter count" value='100'>
  </div>

  <div class="mb-3">
    <label for="typeSelect" class="form-label">Type</label>
    <select class="form-select" id="typeSelect">
      <option value="Box">Box</option>
      <option value="Sphere">Sphere</option>
      <option value="Box_Sphere">BoxSphere</option>
    </select>
  </div>

    
`);

const pushCheckbox = CUtil.IDInput('pushCheckbox');
const countInput = CUtil.IDInput('countInput');
const typeSelect = CUtil.IDInput('typeSelect');

pushCheckbox.addEventListener('change', () => {
    Init();
});

countInput.addEventListener('input', () => {
    Init();
});

typeSelect.addEventListener('change', () => {
    Init();
});
// let sub=CPool.Product<CSubject>("Box");
//     sub.SetPos(new CVec3(0,0,0))
//     Main.Push(sub);

// sub=CPool.Product<CSubject>("Sphere");
//     sub.SetPos(new CVec3(300,0,0))
//     Main.Push(sub);


Init();
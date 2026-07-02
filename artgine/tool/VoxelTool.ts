import { CCIndex } from "../app/canvas/CCIndex.js";
import { CAtelier } from "../app/CAtelier.js";
import { CPaint3D } from "../app/component/paint/CPaint3D.js";
import { CSubject } from "../app/subject/CSubject.js";
import { CVoxelMap as CVoxelMap, CVTile, CVTileMold, CVTileRole } from "../app/subject/CVoxelMap.js";
import { CAlert } from "../basic/CAlert.js";
import { CArray } from "../basic/CArray.js";
import { CConsol } from "../basic/CConsol.js";
import { CDOM } from "../basic/CDOM.js";
import { CEvent } from "../basic/CEvent.js";
import { CPointer } from "../basic/CObject.js";
import { CString } from "../basic/CString.js";
import { CBound } from "../geometry/CBound.js";
import { CMat } from "../geometry/CMat.js";
import { CMath } from "../geometry/CMath.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CAlpha } from "../render/CAlpha.js";
import { CColor } from "../render/CColor.js";
import { CInput } from "../system/CInput.js";
import { CCamCon2DFreeMove, CCamCon3DFirstPerson } from "../util/CCamCon.js";
import { CModalFlex } from "../util/CModalUtil.js";
import { CRollBack, CRollBackInfo } from "../util/CRollBack.js";


var gModal: CModalFlex;
var gAtl: CAtelier;
var gVoxelOrg : CVoxelMap;
var gVoxelTar : CVoxelMap;
var gCurser : CSubject;
var gPress : CSubject;
var gUpdateEvent=new CEvent(VoxelToolUpdate);
var gSelectedTile : any=-1;
var gSelectMap =new Map<number,CCIndex>();
let gRoll=new CRollBackInfo("Voxel",new CArray());
var gCurserXSize : number = 1;
var gCurserYSize : number = 1;

export function VoxelTool(_voxel : CVoxelMap) 
{
    gVoxelOrg=_voxel;
    gVoxelTar=_voxel.Export();
    //gVoxelTar.mDiv=Math.max(gVoxelTar.mBuf.mCount.x,gVoxelTar.mBuf.mCount.y,gVoxelTar.mBuf.mCount.z);
    gVoxelTar.mToolMode=true;

    CRollBack.On("Voxel",(_data : CArray<{index:CCIndex,VInfo:number}>)=>{
        for(let info of _data.mArray)
        {
            gVoxelTar.Bonds(info.index,info.VInfo);
        }
    });
    


    gModal = new CModalFlex([0.7, 0.3], "VoxelModal");
    gModal.SetHeader("VoxelTool");
    gModal.SetHelp(CDOM.DataToDom(`
        <span>shift : 선택 취소</span><br>
        <span>ctrl : 셀렉트 모드시 누르상태 타일선택시 매직봉</span><br>
        <span>middle : 모드 변경</span><br>
    `));
    
    gModal.SetSize(1000, 800);
    gModal.Open();
    const maxHeight = "calc(100vh - 10px)"; // 필요 시 조정
    const leftPanel = gModal.FindFlex(0) as HTMLElement;
    const rightPanel = gModal.FindFlex(1) as HTMLElement;
    [leftPanel, rightPanel].forEach(panel => {
        panel.style.maxHeight = maxHeight;
        panel.style.overflowY = "auto";
    });
    let canvas = CDOM.DataToDom(`
        <div style="position: relative; width: 100%; height: 100%;">
        <canvas id="VoxelLeft_can"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; z-index: 0;">
        </canvas>
      </div>
    `);
    leftPanel.append(canvas);

    let rightHTML=CDOM.DataToDom(`<ul class="nav nav-tabs" id="myTab" role="tablist">
        <li class="nav-item" role="presentation">
            <button class="nav-link active" id="main-tab" data-bs-toggle="tab" data-bs-target="#main" type="button" role="tab" aria-controls="main" aria-selected="true">Main</button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="tile-tab" data-bs-toggle="tab" data-bs-target="#tile" type="button" role="tab" aria-controls="tile" aria-selected="false">Tile</button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="role-tab" data-bs-toggle="tab" data-bs-target="#role" type="button" role="tab" aria-controls="role" aria-selected="false">Role</button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="mold-tab" data-bs-toggle="tab" data-bs-target="#mold" type="button" role="tab" aria-controls="mold" aria-selected="false">Mold</button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="script-tab" data-bs-toggle="tab" data-bs-target="#script" type="button" role="tab" aria-controls="script" aria-selected="false">Script</button>
        </li>
    </ul>

    <!-- 탭 콘텐츠 -->
    <div class="tab-content p-1 border border-top-0" id="myTabContent">
        <div class="tab-pane fade show active" id="main" role="tabpanel" aria-labelledby="main-tab">

            <button type="button" class="btn btn-danger" id="atlas_btn" >Atlas</button>
            <button type="button" class="btn btn-primary" id="ground_btn" >Ground Fill</button>
            <!-- Row 1: 셀렉트 박스 -->
            <div class="row mb-3">
                <div class="col-md-6">
                <label for="modeSelect" class="form-label">모드</label>
                </div>
                <div class="col-md-6">
                <label for="actionSelect" class="form-label">Change(Ctrl)</label>
                <select class="form-select" id="actionSelect">
                    <option value="move">Move</option>
                    <option value="create">Create</option>
                    <option value="modify">Modify</option>
                    <option value="select">Select</option>
                </select>
                </div>
            </div>

            <!-- Row 2: Count (X, Y, Z) -->
            <div class="row mb-3">
                <label class="form-label">Count</label>
                <div class="col">
                <input type="number" class="form-control" id="countX" placeholder="X" value='${gVoxelTar.mBuf.mCount.x}'>
                </div>
                <div class="col">
                <input type="number" class="form-control" id="countY" placeholder="Y" value='${gVoxelTar.mBuf.mCount.y}'>
                </div>
                <div class="col">
                <input type="number" class="form-control" id="countZ" placeholder="Z" value='${gVoxelTar.mBuf.mCount.z}'>
                </div>
            </div>

            <!-- Row 3: Size -->
            <div class="row mb-3">
                <label for="sizeInput" class="form-label">Size</label>
                <div class="col">
                <input type="number" class="form-control" id="sizeInput" placeholder="Size" value='${gVoxelTar.mBuf.mSize}'>
                </div>
            </div>
            <div class="row mb-3">
                <label for="TileMold_sel" class="form-label">Tile,Mold</label>
                <select class="form-select" id="TileMold_sel">
                </select>
            </div>
            
            
            
            
            
            
        </div>
        <div class="tab-pane fade" id="tile" role="tabpanel" aria-labelledby="tile-tab">
            <div class="d-flex align-items-center gap-2">
                <select class="form-select" style="width: auto;" id='TileDelete_sel'>
                    <option selected>Delete</option>
                </select>
                <button class="btn btn-primary" id='TileAdd_btn'>New</button>
            </div>
            <div id="tileArrModify_div" style="display: flex; flex-wrap: wrap; gap: 1px;"></div>
            <div id="tileModify_div"></div>
        </div>
        <div class="tab-pane fade" id="role" role="tabpanel" aria-labelledby="role-tab">
            <div class="d-flex align-items-center gap-2">
                <select class="form-select" style="width: auto;" id='RoleDelete_sel'>
                    <option selected>Delete</option>
                </select>
                <button class="btn btn-primary" id='RoleAdd_btn'>New</button>
            </div>
            <div id="RoleArrModify_div" style="display: flex; flex-wrap: wrap; gap: 1px;"></div>
            <div id="RoleModify_div"></div>
        </div>
        <div class="tab-pane fade" id="mold" role="tabpanel" aria-labelledby="mold-tab">
            <div class="d-flex align-items-center gap-2">
                <select class="form-select" style="width: auto;" id='MoldDelete_sel'>
                    <option selected>Delete</option>
                </select>
                <button class="btn btn-primary" id='MoldAdd_btn'>New</button>
            </div>
            <div id="MoldArrModify_div" style="display: flex; flex-wrap: wrap; gap: 1px;"></div>
            <div id="MoldModify_div"></div>
        </div>
        <div class="tab-pane fade" id="script" role="tabpanel" aria-labelledby="script-tab">
            <div id='Map_div'></div>
        </div>
        
    </div>`);
    rightPanel.append(rightHTML);
    
    CDOM.ID("atlas_btn").addEventListener("click",()=>{
        gVoxelTar.mAtlas.ModifyModal();
    });
    CDOM.ID("ground_btn").addEventListener("click",()=>{

        if(gSelectedTile==-1)
        {
            CAlert.Info("타일을 선택해 주세요");
            return;
        }
        let tile = gVoxelTar.mTileMap.get(gSelectedTile);
        //let tile = gVoxelTar.mTileArr[gSelectedTile];

       
        if(tile==null)  return;

        if(gVoxelTar.mBuf.mCount.z==1)
        {
            for(var y=0;y<gVoxelTar.mBuf.mCount.y;++y)
            for(var x=0;x<gVoxelTar.mBuf.mCount.x;++x)
            {
                gVoxelTar.mBuf.RGB(x+0+y*gVoxelTar.mBuf.mCount.x,tile.mColor);
                
            }
        }
        else
        {
            for(var z=0;z<gVoxelTar.mBuf.mCount.z;++z)
            for(var x=0;x<gVoxelTar.mBuf.mCount.x;++x)
            {
                gVoxelTar.mBuf.RGB(x+0+z*gVoxelTar.mBuf.mCount.x*gVoxelTar.mBuf.mCount.y,tile.mColor);
                
            }
        }
        gVoxelTar.mUpdateRes=true;
    });


    const ids = ["countX", "countY", "countZ", "sizeInput", "modeSelect"];
    for (const id of ids) {
        const el = CDOM.ID(id);
        if (el) {
            el.addEventListener("change", ()=>{
                let countX=Number(CDOM.IDValue("countX"));
                let countY=Number(CDOM.IDValue("countY"));
                let countZ=Number(CDOM.IDValue("countZ"));
                let sizeInput=Number(CDOM.IDValue("sizeInput"));
                let modeSelect=CDOM.IDValue("modeSelect");
            
                gVoxelTar.ResetInfo(new CVec3(countX,countY,countZ),sizeInput);
                gAtl.Canvas("VoxelTool").ClearBatch();
                VoxelToolResetCam();
                VoxelToolResetCurser();
                
                
                CRollBack.Claear();
            });
        }
    }
    

    gModal.On(CEvent.eType.Close,()=>{
        CRollBack.Off("Voxel");
        var pos=gVoxelOrg.GetPos().Export();
        var rot=gVoxelOrg.GetRot().Export();
        var sca=gVoxelOrg.GetSca().Export();

        gVoxelOrg.ResetInfo(gVoxelTar.mBuf.mCount,gVoxelTar.mBuf.mSize);
        gVoxelOrg.Import(gVoxelTar);
        gVoxelOrg.SetPos(pos);
        gVoxelOrg.SetRot(rot);
        gVoxelOrg.SetSca(sca);
        
        gAtl.Frame().Destroy();
        gAtl.Frame().RemoveEvent(gUpdateEvent);

        gSelectedTile=-1;
        
    });
    gAtl = new CAtelier();
    gAtl.mPF.mIAuto = true;
    gAtl.Init([], "VoxelLeft_can", false).then(()=>{
        gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
        gAtl.Brush().GetCam3D().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));    

        gAtl.NewCanvas("VoxelTool");
    
    
        gAtl.Canvas("VoxelTool").PushSub(gVoxelTar);
        gVoxelTar.GetPos().Zero();
        gVoxelTar.GetRot().Zero();
        gVoxelTar.SetSca(new CVec3(1,1,1));
        gVoxelTar.GetMat().Unit();
        gCurser=gAtl.Canvas("VoxelTool").PushSub(new CSubject());
        gPress=gAtl.Canvas("VoxelTool").PushSub(new CSubject());
        
        gAtl.Frame().PushEvent(CEvent.eType.Update,gUpdateEvent);


        for(let i=0;i<_voxel.mLayer.length;++i)
        {
            if(_voxel.mLayer[i].Ref() instanceof CVoxelMap)
            {
                let lay=_voxel.mLayer[i].Ref().Export();
                let pos=CMath.V3SubV3(lay.GetPos(),gVoxelOrg.GetPos());
                lay.SetPos(pos);
                lay.GetRot().Zero();
                lay.SetSca(new CVec3(1,1,1));
                lay.mUpdateRes=true;
                gAtl.Canvas("VoxelTool").PushSub(lay);
            }
        }

        VoxelToolResetCam();
        VoxelToolResetCurser();
        VoxelToolSelectTileArrReset();

        CDOM.ID("main-tab").onclick=()=>{VoxelToolSelectTileArrReset();};
        CDOM.ID("tile-tab").onclick=()=>{VoxelToolTileArrModifyReset();};
        CDOM.ID("role-tab").onclick=()=>{VoxelToolRoleArrModifyReset();};
        CDOM.ID("mold-tab").onclick=()=>{VoxelToolMoldArrModifyReset();};
        // MapDiv();


        CDOM.ID("actionSelect").onchange=()=>{
            gSelectMap.clear();
            SelectMapRefresh();
            CDOM.IDValue("TileMold_sel",0);
            

            gSelectedTile=0;



        };
    });
    
    
    
    
}
async function VoxelToolTileArrModifyReset()
{
    let TileDelete_sel=CDOM.ID("TileDelete_sel");
    let TileAdd_btn=CDOM.ID("TileAdd_btn");

    TileDelete_sel.innerHTML="";
    TileDelete_sel.onchange=()=>{
        let tds=Number(CDOM.IDValue("TileDelete_sel"));

        gVoxelTar.mTileMap.delete(tds);
        VoxelToolTileArrModifyReset();
    };
    let option=CDOM.DataToDom(`<option value='-1'>Delete..</option>`);
    TileDelete_sel.append(option);
    for(let t of gVoxelTar.mTileMap.keys())
    {
        let option=CDOM.DataToDom(`<option value='${t}'>${t}</option>`);
        TileDelete_sel.append(option);
    }


    TileAdd_btn.onclick=()=>{
        let tile=new CVTile(0,0);
        
        while(true)
        {
            tile.mColor = (Math.trunc(Math.random() * 0x1000000) << 8) >>> 0;
            let select = gVoxelTar.mTileMap.get(tile.mColor);
            if(select==null)    break;
        }
        

        gVoxelTar.mTileMap.set(tile.mColor,tile);
        VoxelToolTileArrModifyReset();
    };
     let EditEXPush=(tile : CVTile)=>{
        tile.EditChangeEx=(_pointer : CPointer,_child : boolean): void =>{
            if(_child) return;
         
            if(_pointer.member=="mColor")
            {

                //let change=tile.mColor;
                let before;
                for(let [key,value] of gVoxelTar.mTileMap)
                {
                    if(value==tile)    before=key;   
                }
                gVoxelTar.mTileMap.delete(before);
                gVoxelTar.mTileMap.set(tile.mColor,tile);

                VoxelToolTileArrModifyReset();
                
            }
        };
       
    };


    let SelectChange = (_tileColor : number) => {

        let tile = gVoxelTar.mTileMap.get(_tileColor);
        //let tile : CVTile2=gVoxelTar.mTileMap.get(_tileUint);
        let html=tile.EditInit(null);
        CDOM.ID("tileModify_div").innerHTML="";
        CDOM.ID("tileModify_div").append(html);
       

        EditEXPush(tile);

    };
    let tileArrModify_div=CDOM.ID("tileArrModify_div");
    tileArrModify_div.innerHTML="";
    
    

    for(let tile of gVoxelTar.mTileMap.values())
    {
        let tileDiv2=await VoxelAtlasCodiDiv(tile.mAtlas,50);
        tileDiv2.id="tileM_"+tile.mColor;
        tileDiv2.onclick=()=>{
            SelectChange(tile.mColor);
            
        };
        tileArrModify_div.append(tileDiv2);
    }
}

function VoxelToolUpdate(_delay)
{


    

    let input=gAtl.Frame().Input();
    let actionSelect=CDOM.IDValue("actionSelect")
    let mouse=gAtl.Frame().Input().Mouse();
    let ray=gAtl.Brush().GetCam3D().GetRay(mouse.x,mouse.y);
    if(gVoxelTar.mBuf.mCount.z==1)
        ray=gAtl.Brush().GetCam2D().GetRay(mouse.x,mouse.y);
    let pick=gVoxelTar.PickBox(ray)
    //CConsol.Log(pick.ToStr());

    if(gVoxelTar.mBuf.mCount.z==1)
    {
        
        pick.x=Math.trunc((ray.GetOriginal().x)/gVoxelTar.mBuf.mSize);
        pick.y=Math.trunc((ray.GetOriginal().y)/gVoxelTar.mBuf.mSize);
        pick.z=0;
        pick.pick=CCIndex.eDir.Up;
    }
    else if(pick.pick==CCIndex.eDir.Null)    return;
    if(actionSelect=="create")
        pick.PickMove();

    
    let pos=CMath.V3AddV3(pick.M2Pos(gVoxelTar.mBuf.mSize),gVoxelTar.GetPos());
    

    if(gSelectedTile instanceof CVTileMold)
    {
        let sca=gVoxelTar.mBuf.mSize*1.1;
        pos.x+=(gSelectedTile.mSize.x-1)*gVoxelTar.mBuf.mSize*0.5;
        pos.y+=(gSelectedTile.mSize.y-1)*gVoxelTar.mBuf.mSize*0.5;
        pos.z+=(gSelectedTile.mSize.z-1)*gVoxelTar.mBuf.mSize*0.5;
        gCurser.SetSca(new CVec3(sca*gSelectedTile.mSize.x,sca*gSelectedTile.mSize.y,sca*gSelectedTile.mSize.z));
    }
    else
    {
        let sca=gVoxelTar.mBuf.mSize*1.1;
        gCurser.SetSca(new CVec3(sca,sca,sca));
    }
    


    if(actionSelect=="move")
    {
        gAtl.Brush().GetCam3D().GetCamCon().SetRotKey(CInput.eKey.LButton);
        gAtl.Brush().GetCam2D().GetCamCon().SetRotKey(CInput.eKey.LButton);
    }
    else 
    {
        gAtl.Brush().GetCam3D().GetCamCon().SetRotKey(0);
        gAtl.Brush().GetCam2D().GetCamCon().SetRotKey(0);
    }
    if(gAtl.Frame().Input().KeyUp(CInput.eKey.MiddleButton))
    {
        if(actionSelect=="move")    actionSelect="create";
        else if(actionSelect=="create")    actionSelect="modify";
        else if(actionSelect=="modify")    actionSelect="select";
        else    actionSelect="move";
        if(gSelectMap.size>0 && actionSelect=="move")   {}//하나 밀려서 이렇게
        else    CDOM.IDValue("actionSelect",actionSelect);
        
        gSelectMap.clear();
        SelectMapRefresh();
    }
    if(actionSelect=="move")
    {
        gCurser.SetPos(new CVec3(-1000,-1000,0));
        return;
    }  
        
    gCurser.SetPos(pos);

    if(input.KeyUp(CInput.eKey.Up))
    {
        let nIndexArr=[];
        for(let index of gSelectMap.values())
        {
            nIndexArr.push(index);
            let nIndex=index.Export();
            nIndex.y+=1;
            nIndexArr.push(nIndex);
            
        }
        gSelectMap.clear();
        for(let index of nIndexArr)
        {
            let off=index.Offset(gVoxelTar.mBuf.mCount);
            gSelectMap.set(off,index);
        }

        SelectMapRefresh();
        
    }
    if(input.KeyUp(CInput.eKey.Down))
    {
        let nIndexArr=[];
        let minY=1000000000;
        for(let index of gSelectMap.values())
        {
            if(index.y<minY)
                minY=index.y;
            nIndexArr.push(index);
        }
        for(let index of nIndexArr)
        {
            
            if(index.y==minY)	continue;
            index.y-=1;    
            
        }
        gSelectMap.clear();
        for(let index of nIndexArr)
        {
            let off=index.Offset(gVoxelTar.mBuf.mCount);
            gSelectMap.set(off,index);
        }

        SelectMapRefresh();
        
    }
    if(input.KeyUp(CInput.eKey.Right))
    {
        let nIndexArr=[];
        for(let index of gSelectMap.values())
        {
            nIndexArr.push(index);
            let nIndex=index.Export();
            nIndex.x+=1;
            nIndexArr.push(nIndex);
            
        }
        gSelectMap.clear();
        for(let index of nIndexArr)
        {
            let off=index.Offset(gVoxelTar.mBuf.mCount);
            gSelectMap.set(off,index);
        }

        SelectMapRefresh();
        
    }
    if(input.KeyUp(CInput.eKey.Left))
    {
        let nIndexArr=[];
        let minX=1000000000;
        for(let index of gSelectMap.values())
        {
            if(index.x<minX)
                minX=index.x;
            nIndexArr.push(index);
        }
        for(let index of nIndexArr)
        {
            
            if(index.x==minX)	continue;
            index.x-=1;    
            
        }
        gSelectMap.clear();
        for(let index of nIndexArr)
        {
            let off=index.Offset(gVoxelTar.mBuf.mCount);
            gSelectMap.set(off,index);
        }

        SelectMapRefresh();
        
    }
    
    if(input.KeyDown(CInput.eKey.LButton,true))
    {
        gRoll=new CRollBackInfo("Voxel",new CArray());
    }
  
    if(input.KeyDown(CInput.eKey.LButton))
    {
        let off=pick.Offset(gVoxelTar.mBuf.mCount);
        if(input.KeyDown(CInput.eKey.Shift))
        {
            if(gSelectMap.get(off)!=null)
            {
                gSelectMap.delete(pick.Offset(gVoxelTar.mBuf.mCount));
                SelectMapRefresh();
            }
        }
        else 
        {
            if(gSelectMap.get(off)==null)
            {
                gSelectMap.set(pick.Offset(gVoxelTar.mBuf.mCount),pick);
                SelectMapRefresh();
            }
        }
        
        
    }
    if(input.KeyUp(CInput.eKey.LButton))
    {
        if(actionSelect=="select")  
        {
            if(input.KeyDown(CInput.eKey.LControl))
            {
                
                let off=0;
                let search=new Array<CCIndex>();
                search.push(pick.Export());
                let p=search[0];
                let sameTile=gVoxelTar.mBuf.RGB(p.x+p.y*gVoxelTar.mBuf.mCount.x+p.z*gVoxelTar.mBuf.mCount.x*gVoxelTar.mBuf.mCount.y);

                for(let i=0;i<search.length;++i)
                {
                    p=search[i].Export();
                    p.x+=1;
                    off=p.Offset(gVoxelTar.mBuf.mCount);
                    if(gSelectMap.get(off)==null && gVoxelTar.mBuf.RGB(p.x+p.y*gVoxelTar.mBuf.mCount.x+p.z*gVoxelTar.mBuf.mCount.x*gVoxelTar.mBuf.mCount.y)==sameTile)
                    {
                        gSelectMap.set(p.Offset(gVoxelTar.mBuf.mCount),p);
                        search.push(p);
                    }
                    p=search[i].Export();
                    p.x-=1;
                    off=p.Offset(gVoxelTar.mBuf.mCount);
                    if(gSelectMap.get(off)==null && gVoxelTar.mBuf.RGB(p.x+p.y*gVoxelTar.mBuf.mCount.x+p.z*gVoxelTar.mBuf.mCount.x*gVoxelTar.mBuf.mCount.y)==sameTile)
                    {
                        gSelectMap.set(p.Offset(gVoxelTar.mBuf.mCount),p);
                        search.push(p);
                    }

                    p=search[i].Export();
                    p.y+=1;
                    off=p.Offset(gVoxelTar.mBuf.mCount);
                    if(gSelectMap.get(off)==null && gVoxelTar.mBuf.RGB(p.x+p.y*gVoxelTar.mBuf.mCount.x+p.z*gVoxelTar.mBuf.mCount.x*gVoxelTar.mBuf.mCount.y)==sameTile)
                    {
                        gSelectMap.set(p.Offset(gVoxelTar.mBuf.mCount),p);
                        search.push(p);
                    }
                    p=search[i].Export();
                    p.y-=1;
                    off=p.Offset(gVoxelTar.mBuf.mCount);
                    if(gSelectMap.get(off)==null && gVoxelTar.mBuf.RGB(p.x+p.y*gVoxelTar.mBuf.mCount.x+p.z*gVoxelTar.mBuf.mCount.x*gVoxelTar.mBuf.mCount.y)==sameTile)
                    {
                        gSelectMap.set(p.Offset(gVoxelTar.mBuf.mCount),p);
                        search.push(p);
                    }

                    p=search[i].Export();
                    p.z+=1;
                    off=p.Offset(gVoxelTar.mBuf.mCount);
                    if(gSelectMap.get(off)==null && gVoxelTar.mBuf.RGB(p.x+p.y*gVoxelTar.mBuf.mCount.x+p.z*gVoxelTar.mBuf.mCount.x*gVoxelTar.mBuf.mCount.y)==sameTile)
                    {
                        gSelectMap.set(p.Offset(gVoxelTar.mBuf.mCount),p);
                        search.push(p);
                    }
                    p=search[i].Export();
                    p.z-=1;
                    off=p.Offset(gVoxelTar.mBuf.mCount);
                    if(gSelectMap.get(off)==null && gVoxelTar.mBuf.RGB(p.x+p.y*gVoxelTar.mBuf.mCount.x+p.z*gVoxelTar.mBuf.mCount.x*gVoxelTar.mBuf.mCount.y)==sameTile)
                    {
                        gSelectMap.set(p.Offset(gVoxelTar.mBuf.mCount),p);
                        search.push(p);
                    }
                    
                }
                
            }
            SelectMapRefresh();
            return;
        }
            


        for(let index of gSelectMap.values())
        {

            if(typeof gSelectedTile=="number")
            {
                gRoll.mData.Push({ index: index.Export(), VInfo: gVoxelTar.mBuf.RGB(index) });
                gVoxelTar.Bonds(index,gSelectedTile);
            }
                
            else
            {
                let nIndex=index.Export();
                let mold=gSelectedTile as CVTileMold;
                
                for(let z=0;z<mold.mSize.z;++z)
                for(let y=0;y<mold.mSize.y;++y)
                for(let x=0;x<mold.mSize.x;++x)
                {
                    nIndex.Import(index);
                    nIndex.x+=x;
                    nIndex.y+=y;
                    nIndex.z+=z;
                    // if(gVoxelTar.m2D)   nIndex.Add(x,y,0);
                    // else nIndex.Add(x,0,y);

                    let off=mold.mColorArr[x+y*mold.mSize.x+z*mold.mSize.x*mold.mSize.y];
                    if(off!=-1)
                    {

                        gRoll.mData.Push({ index: nIndex.Export(), VInfo: gVoxelTar.mBuf.RGB(nIndex) });
                        gVoxelTar.Bonds(nIndex,off);
                    }
                        
                }
                
                 
                break;
            }
        }


        gSelectMap.clear();
        SelectMapRefresh();
        CRollBack.Push(gRoll);

    }


}




let gColorImgMap=new Map<string,string>();
async function VoxelAtlasCodiDiv(_atlas : number, _width : number = 200, _vinfo?: number)
{
    if(gVoxelTar == null) 
        return null;
    
    if(_atlas==null)    _atlas=0;

    
    if(_atlas==0) 
    {
        return CDOM.JSONToDom({
            "<>":"div","class":"border position-relative","style":"width:"+_width+"px;height:"+_width+"px;overflow:hidden;"
        });
    }
    
    let imgsrc="";
    
    let codi=gVoxelTar.mAtlas.mTexel[_atlas];
    imgsrc=await gVoxelTar.mAtlas.GetImgURL(_atlas);
    
   
    
    

    let width = codi.z-codi.x;
    let height = codi.w-codi.y;
    let aspect = width / height;
    let imgHeight = _width * aspect;
   
    let baseDiv = CDOM.JSONToDom({
        "<>":"div","class":"position-relative","style":"width:"+_width+"px;height:"+imgHeight+"px;overflow:hidden;"+
            "background-image:url('"+imgsrc+"');background-size:contain;image-rendering: pixelated;"+
            "background-position:center;background-repeat:no-repeat;"
    });
    if(_vinfo!==undefined) {
        const badge = CDOM.JSONToDom({
            "<>":"span","class":"position-absolute top-0 end-0 badge rounded-pill bg-primary m-1 fs-6","text":_vinfo+""
        });
        baseDiv.appendChild(badge);
    }
    return baseDiv;
}
function SelectMapRefresh()
{
    let sca=gVoxelTar.mBuf.mSize*1.1;
    gPress.RemoveComps(CPaint3D);

    for(let index of gSelectMap.values())
    {
        
        
        let mat=new CMat();
        mat.mF32A[0]=sca;
        mat.mF32A[5]=sca;
        mat.mF32A[10]=sca;
        mat.xyz=CMath.V3AddV3(index.M2Pos(gVoxelTar.mBuf.mSize),gVoxelTar.GetPos());
        let pt=new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
        //pt.SetRGBA(new CVec4(0,1,0,-0.5));
        pt.SetColorModel(new CColor(0,1,0,CColor.eModel.RGBAdd));
        pt.SetAlphaModel(new CAlpha(0.5));
        pt.SetLMat(mat);
        gPress.PushComp(pt);
    
    }
}
function VoxelToolResetCurser(_xSize : number = 1, _ySize : number = 1)
{
    
    gCurserXSize = _xSize;
    gCurserYSize = _ySize;
    gCurser.RemoveComps(CPaint3D);
    if(gVoxelTar.mBuf.mCount.z==1)
    {
        for(let y = _ySize - 1; y >= 0; y--)
        for(let x = 0; x < _xSize; x++) {
            let index = x + y * _xSize;
            let pt=new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());

            let pos = new CVec3();
            pos.x = x * 1;
            pos.y = -y * 1;

            let mat=new CMat();
            mat.xyz=pos;
            pt.SetLMat(mat);

            gCurser.PushComp(pt);
            
            pt.SetColorModel(new CColor(1,0,0,CColor.eModel.RGBAdd));
            pt.SetAlphaModel(new CAlpha(0.5));
            
        }

        let pt=new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
        let mat=new CMat();
        mat.mF32A[5]=0.2;
        mat.xyz=new CVec3(1 * (_xSize),0,0);
        pt.SetLMat(mat);
        gCurser.PushComp(pt);
        pt.SetColorModel(new CColor(0,0,1,CColor.eModel.RGBAdd));
        pt.SetAlphaModel(new CAlpha(0.6));
        

        pt=new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
        mat=new CMat();
        mat.mF32A[0]=0.2;
        mat.xyz=new CVec3(0,1,0);
        pt.SetLMat(mat);
        gCurser.PushComp(pt);
        pt.SetColorModel(new CColor(0,1,0,CColor.eModel.RGBAdd));
        pt.SetAlphaModel(new CAlpha(0.6));
        //pt.SetRGBA(new CVec4(0,1,0,-0.6));
    }
    else
    {
        let i = 0;
        for(; i < _xSize * _ySize; i++) {
            let pt=new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
            gCurser.PushComp(pt);
          
            pt.SetColorModel(new CColor(1,0,0,CColor.eModel.RGBAdd));
        pt.SetAlphaModel(new CAlpha(0.5));
        }

        let pt=new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
        let mat=new CMat();
        mat.mF32A[10]=0.2;
        mat.xyz=new CVec3(1 * (_xSize),0,0)
        pt.SetLMat(mat);
        gCurser.PushComp(pt);
        //pt.SetRGBA(new CVec4(0,0,1,-0.6));
        pt.SetColorModel(new CColor(0,0,1,CColor.eModel.RGBAdd));
        pt.SetAlphaModel(new CAlpha(0.6));

        pt=new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
        mat=new CMat();
        mat.mF32A[0]=0.2;
        mat.xyz=new CVec3(0,0,1 * (_ySize));
        pt.SetLMat(mat);
        gCurser.PushComp(pt);
        //pt.SetRGBA(new CVec4(0,1,0,-0.6));
        pt.SetColorModel(new CColor(0,1,0,CColor.eModel.RGBAdd));
        pt.SetAlphaModel(new CAlpha(0.6));
    }
    
    gCurser.SetSca(new CVec3(110,110,110));
}
function VoxelToolResetCam()
{
    if(gVoxelTar.mBuf.mCount.z==1)
    {
        gAtl.Brush().GetCam2D().Init(new CVec3(0, 0.1, 1000),new CVec3(0, 0.1, 0));
        gAtl.Canvas("VoxelTool").SetCameraKey("2D");
    }
        
    else
    {
        gAtl.Brush().GetCam2D().Init(new CVec3(0, 1000, 1),new CVec3(0, 0, 0))
        gAtl.Canvas("VoxelTool").SetCameraKey("3D");
    }
}
async function VoxelToolSelectTileArrReset()
{

    let TileMold_sel=CDOM.ID("TileMold_sel");
    TileMold_sel.innerHTML="";
    TileMold_sel.onchange=()=>{

        let tmValue : any=CDOM.IDValue("TileMold_sel");
        let actionSelect=CDOM.IDValue("actionSelect");
        
        //임의로 등록하거나 취소시 롤백용.
        if(actionSelect=="select")
        {
            CDOM.IDValue("TileMold_sel",0);
           if(tmValue.indexOf("tile")!=-1)
           {
                tmValue=Number(CString.ReplaceAll(tmValue,"tile",""));

                for(let index of gSelectMap.values())
                {
                    gRoll.mData.Push({ index: index.Export(), VInfo: gVoxelTar.mBuf.RGB(index) });
                    gVoxelTar.Bonds(index,tmValue);
                }

                gSelectMap.clear();
                SelectMapRefresh();
                CRollBack.Push(gRoll);
           }
           else if(tmValue.indexOf("mold")==-1)
           {    
                let bound=new CBound();

                for(let index of gSelectMap.values())
                {
                    bound.InitBound(new CVec3(index.x,index.y,index.z))
                }
                let mold=new CVTileMold();
                mold.mSize=bound.GetSize();
                mold.mSize.x+=1;
                mold.mSize.y+=1;
                mold.mSize.z+=1;
                mold.mColorArr.length=0;
                for(let z=0;z<mold.mSize.z;++z)
                for(let y=0;y<mold.mSize.y;++y)
                for(let x=0;x<mold.mSize.x;++x)
                {
                    let index=bound.mMin.Export();
                    index.x+=x;
                    index.y+=y;
                    index.z+=z;
                    
                    mold.mColorArr.push(gVoxelTar.mBuf.RGB(index.x+index.y*gVoxelTar.mBuf.mCount.x+index.z*gVoxelTar.mBuf.mCount.x*gVoxelTar.mBuf.mCount.y));
                }
                gVoxelTar.mTileMoldArr.push(mold);

                gSelectMap.clear();
                SelectMapRefresh();
                CRollBack.Push(gRoll);
                VoxelToolSelectTileArrReset();
           }
            
            return;
        }


        gSelectedTile=tmValue;
        if(gSelectedTile.indexOf("tile")!=-1)
        {
            gSelectedTile=CString.ReplaceAll(gSelectedTile,"tile","");
            gSelectedTile=Number(gSelectedTile);
        }
        else if(gSelectedTile.indexOf("mold")!=-1)
        {
            gSelectedTile=CString.ReplaceAll(gSelectedTile,"mold","");
            gSelectedTile=Number(gSelectedTile);
            gSelectedTile=gVoxelTar.mTileMoldArr[gSelectedTile];
        }
        else
            gSelectedTile=-1;

    };
   
    
    TileMold_sel.append(CDOM.DataToDom({"tag":"option","value":0,"text":"empty"}));

    
    for(let tile of gVoxelTar.mTileMap.values())
    {
        
        let key=tile.mLabel+" : "+tile.mAtlas+"/"+tile.mColor;
        TileMold_sel.append(CDOM.DataToDom({"tag":"option","value":"tile"+tile.mColor,"text":key}));
        
    }
    for(let i=0;i<gVoxelTar.mTileMoldArr.length;++i)
    {
        let mold=gVoxelTar.mTileMoldArr[i];
        let key=mold.mSize.x+"/"+mold.mSize.y+"/"+mold.mSize.z+":"+mold.mLabel;
        TileMold_sel.append(CDOM.DataToDom({"tag":"option","value":"mold"+i,"text":key}));
        
    }
    TileMold_sel.append(CDOM.DataToDom({"tag":"option","value":-1,"text":"MoldCopy"}));

}

async function VoxelToolRoleArrModifyReset()
{
     let RoleDelete_sel=CDOM.ID("RoleDelete_sel");
    let RoleAdd_btn=CDOM.ID("RoleAdd_btn");

    RoleDelete_sel.innerHTML="";
    RoleDelete_sel.onchange=()=>{
        let tds=CDOM.IDValue("RoleDelete_sel");
        for(let i=0;i<gVoxelTar.mTileRoleArr.length;++i)
        {
            if(gVoxelTar.mTileRoleArr[i].ObjHash()==tds)
            {
                gVoxelTar.mTileRoleArr.splice(i,1);
                VoxelToolRoleArrModifyReset();
                break;
            }
        }
    };
    let option=CDOM.DataToDom(`<option value='-1'>Delete..</option>`);
    RoleDelete_sel.append(option);
    for(let t of gVoxelTar.mTileRoleArr)
    {
        let option=CDOM.DataToDom(`<option value='${t.ObjHash()}'>${t.ObjHash()}</option>`);
        RoleDelete_sel.append(option);
    }


    RoleAdd_btn.onclick=()=>{
        let role=new CVTileRole();
       
        gVoxelTar.mTileRoleArr.push(role);
        VoxelToolRoleArrModifyReset();
    };

    let RoleArrModify_div=CDOM.ID("RoleArrModify_div");
    RoleArrModify_div.innerHTML="";
    
    let EditEXPush=(role : CVTileRole)=>{
        role.EditChangeEx=(_pointer : CPointer,_child : boolean): void =>{
         
            if(_pointer.member=="mPattern" && _pointer.state==1)
            {
                EditEXPush(role);
                //tile.EditRefresh();
                //VoxelToolTileArrModifyReset();
                
            }
        };
        role.EditFormEx=async (_pointer: CPointer, _div: HTMLDivElement, _input: HTMLInputElement) =>
        {
            if(_pointer.member=="mRole")
            {
                //_input.hidden=true;
                let sjson={"tag":"select","class":"form-select","html":[
                    {"tag":"option","value":"16383","text":"Pass"},
                    {"tag":"option","value":"0","text":"Zero"},
                ]};
                for(let tile of gVoxelTar.mTileMap.values())
                {
                    sjson.html.push({"tag":"option","value":tile.mColor+"","text":tile.mColor+""});
                }

                let html={"tag":"div","class":"row row-cols-3 me-0","html":[
                    {"tag":"div","class":"col p-1","html":[]},
                    {"tag":"div","class":"col p-1","html":[]},
                    {"tag":"div","class":"col p-1","html":[]},
                    {"tag":"div","class":"col p-1","html":[]},
                    {"tag":"div","class":"col p-1","html":[]},
                    {"tag":"div","class":"col p-1","html":[]},
                    {"tag":"div","class":"col p-1","html":[]},
                    {"tag":"div","class":"col p-1","html":[]},
                    {"tag":"div","class":"col p-1","html":[]},
                ]};
                let html2={"tag":"div","class":"row row-cols-3 m-0","html":[
                    {"tag":"div","class":"col p-0","html":[]},
                    {"tag":"div","class":"col p-0","html":[]},
                    {"tag":"div","class":"col p-0","html":[]},
                    {"tag":"div","class":"col p-0","html":[]},
                    {"tag":"div","class":"col p-0","html":[]},
                    {"tag":"div","class":"col p-0","html":[]},
                    {"tag":"div","class":"col p-0","html":[]},
                    {"tag":"div","class":"col p-0","html":[]},
                    {"tag":"div","class":"col p-0","html":[]},
                ]};
                for(let i=0;i<role.mRole.length;++i)
                {
                    let copy=JSON.parse(JSON.stringify(sjson));
                    copy["title"]=i;
                    let tile=null;
                    for(let o of copy.html)
                    {
                        if(o.value==role.mRole[i]+"")
                        {
                            o["selected"]="selected";
                            
                            
                            break;
                        }     
                        
                    }
                    tile=gVoxelTar.mTileMap.get(role.mRole[i]);
                    // for(let t of gVoxelTar.mTileArr)
                    // {
                    //     if(t.mColor==role.mRole[i])
                    //     {
                    //         tile=t;
                    //     }
                    // }
                    copy["onchange"]=async (e)=>{
                        let target=e.target as HTMLInputElement;
                        let off=Number(target.title);
                        role.mRole[off]=Number(target.value);
                        CDOM.ID(off+"_Role").innerHTML="";
                        let tile2=gVoxelTar.mTileMap.get(role.mRole[i]);
                        // for(let t of gVoxelTar.mTileMap)
                        // {
                        //     if(t.mColor==role.mRole[i])
                        //     {
                        //         tile2=t;
                        //     }
                        // }
                        CDOM.ID(off+"_Role").append(await VoxelAtlasCodiDiv(tile2!=null?tile2.mAtlas:0,50));
                        
                    }
                    html.html[i].html.push(copy);
                    
                    html2.html[i]["id"]=i+"_Role";
                    html2.html[i].html.push(await VoxelAtlasCodiDiv(tile!=null?tile.mAtlas:tile,50));
                }

                _input.innerHTML="";
                _input.append(CDOM.DataToDom(html2));
                _input.append(CDOM.DataToDom(html));
                

            }
        }
        
        // for(let pat of role.mPattern)
        // {
        //     pat.EditFormEx=CVTileSurfaceEX;
        // }
            
        
    };

    let SelectChange = (_select) => {

        let role : CVTileRole=null;
        for(let t of gVoxelTar.mTileRoleArr)
        {
            if(_select==t.ObjHash())
            {
                role=t;
                break;
            }
        }
        EditEXPush(role);
        let html=role.EditInit(null);
        CDOM.ID("RoleModify_div").innerHTML="";
        CDOM.ID("RoleModify_div").append(html);
        
    };
    CDOM.ID("RoleModify_div").innerHTML="";
    for(let role of gVoxelTar.mTileRoleArr)
    {

        let roleDiv2 = document.createElement("div");
        roleDiv2.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);width:65px;gap:1px;cursor:pointer;border:1px solid #666;";

        for(let color of role.mRole)
        {
            let tile = gVoxelTar.mTileMap.get(color) ?? null;
            let cellDiv = await VoxelAtlasCodiDiv(tile != null ? tile.mAtlas : null, 20);
            roleDiv2.append(cellDiv);
        }

        roleDiv2.id = "roleM_" + role.ObjHash();
        roleDiv2.onclick = () => {
            SelectChange(role.ObjHash());
        };
        RoleArrModify_div.append(roleDiv2);
        // let roleDiv2=await VoxelAtlasCodiDiv(0,50);
        // roleDiv2.id="roleM_"+role.ObjHash();
        // roleDiv2.onclick=()=>{
        //     SelectChange(role.ObjHash());
            
        // };
        // RoleArrModify_div.append(roleDiv2);
    }
}

async function VoxelToolMoldArrModifyReset()
{
     let MoldDelete_sel=CDOM.ID("MoldDelete_sel");
    let MoldAdd_btn=CDOM.ID("MoldAdd_btn");

    MoldDelete_sel.innerHTML="";
    MoldDelete_sel.onchange=()=>{
        let tds=CDOM.IDValue("MoldDelete_sel");
        for(let i=0;i<gVoxelTar.mTileMoldArr.length;++i)
        {
            if(gVoxelTar.mTileMoldArr[i].ObjHash()==tds)
            {
                gVoxelTar.mTileMoldArr.splice(i,1);
                VoxelToolMoldArrModifyReset();
                break;
            }
        }
    };
    let option=CDOM.DataToDom(`<option value='-1'>Delete..</option>`);
    MoldDelete_sel.append(option);
    for(let t of gVoxelTar.mTileMoldArr)
    {
        let option=CDOM.DataToDom(`<option value='${t.ObjHash()}'>${t.ObjHash()}</option>`);
        MoldDelete_sel.append(option);
    }
 
    let SelectChange = (_select) => {

        let mold : CVTileMold=null;
        for(let t of gVoxelTar.mTileMoldArr)
        {
            if(_select==t.ObjHash())
            {
                mold=t;
                break;
            }
        }
        // let MoldModify_div=CDOM.ID("MoldModify_div");
        // MoldModify_div.innerHTML="";

       let html=mold.EditInit(null);
        CDOM.ID("MoldModify_div").innerHTML="";
        CDOM.ID("MoldModify_div").append(html);
    };

    MoldAdd_btn.onclick=()=>{
        let role=new CVTileMold();
       
        gVoxelTar.mTileMoldArr.push(role);
        VoxelToolMoldArrModifyReset();
    };
    let MoldArrModify_div=CDOM.ID("MoldArrModify_div");
    MoldArrModify_div.innerHTML="";

    CDOM.ID("MoldModify_div").innerHTML="";
    
    for(let mold of gVoxelTar.mTileMoldArr)
    {
        let key=mold.mSize.x+"/"+mold.mSize.y+"/"+mold.mSize.z+":"+mold.mLabel;
        let upDiv=CDOM.DataToDom({"tag":"button","text":key});
        //let upDiv=await MoldTileReset(mold);
        upDiv.onclick=()=>{
            SelectChange(mold.ObjHash());
        };
        MoldArrModify_div.append(upDiv);
    }
}
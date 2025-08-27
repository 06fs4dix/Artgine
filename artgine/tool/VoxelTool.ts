import { CAlert } from "../basic/CAlert.js";
import { CDomFactory } from "../basic/CDOMFactory.js";
import { CEvent } from "../basic/CEvent.js";
import { CModalFlex } from "../util/CModalUtil.js";
import { CPointer } from "../basic/CObject.js";
import { CUtil } from "../basic/CUtil.js";
import { CUtilObj } from "../basic/CUtilObj.js";
import { CAtelier } from "../canvas/CAtelier.js";
import { CCIndex } from "../canvas/CCIndex.js";
import { CColor } from "../canvas/component/CColor.js";
import { CPaint } from "../canvas/component/paint/CPaint.js";
import { CPaint3D } from "../canvas/component/paint/CPaint3D.js";
import { CSubject } from "../canvas/subject/CSubject.js";
import { CVoxel, CVTile, CVTileMold, CVTileRole, CVTileSurface, CVTileSurfacePattern } from "../canvas/subject/CVoxel.js";
import { CMat } from "../geometry/CMat.js";
import { CMath } from "../geometry/CMath.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CH5Canvas } from "../render/CH5Canvas.js";
import { CInput } from "../system/CInput.js";
import { CAtlas } from "../util/CAtlas.js";
import { CCamCon2DFreeMove, CCamCon3DFirstPerson } from "../util/CCamCon.js";
import { CUtilMath } from "../geometry/CUtilMath.js";
import { CConsol } from "../basic/CConsol.js";
import { CQueue } from "../basic/CQueue.js";
import { CRollBack, CRollBackInfo } from "../util/CRollBack.js";
import { CArray } from "../basic/CArray.js";

var gModal: CModalFlex;
var gAtl: CAtelier;
var gVoxelOrg : CVoxel;
var gVoxelTar : CVoxel;
var gVoxelLayer : Array<CVoxel>;
var gCurser : CSubject;
var gPress : CSubject;
var gCurserXSize : number = 1;
var gCurserYSize : number = 1;
var gUpdateEvent=new CEvent(VoxelToolUpdate);
var gSelectMap =new Map<number,CCIndex>();
var gCamMove=true;
var gSelectedTile : any=-1;
let roll=new CRollBackInfo("Voxel",new CArray());

//var g_base64ImgMap : Map<CAtlas, Map<string, string>> = new Map();
// async function GetImgBase64(_atlas : CAtlas, _index : number) {
// 	let codi = _atlas.mTexCodi[_index];
// 	let key = "";
// 	if(_index == -1) {
// 		key = "none";
// 	}
// 	else if(codi == null) {
// 		key = "black";
// 	}
// 	else {
// 		key = codi.x + "," + codi.y + "," + codi.z + "," + codi.w;
// 	}
// 	if(!g_base64ImgMap.has(_atlas)) {
// 		g_base64ImgMap.set(_atlas, new Map());
// 	}
// 	let atlasMap = g_base64ImgMap.get(_atlas);
// 	if(atlasMap.has(key)) {
// 		return atlasMap.get(key);
// 	}
// 	let base64 = await _atlas.GetImgURL(_index);
// 	atlasMap.set(key, base64);
// 	return base64;
// }
let gColorImgMap=new Map<string,string>();
async function VoxelAtlasCodiDiv(_tileSurfacePattern : CVTileSurfacePattern|CVTileSurface, _width : number = 200, _vinfo?: number)
{
	if(gVoxelTar == null) 
		return null;
	
	
	if(_tileSurfacePattern == null || (_tileSurfacePattern instanceof CVTileSurfacePattern && _tileSurfacePattern.mPattern.length==0)) 
    {
		return CDomFactory.JSONToDom({
			"<>":"div","class":"border position-relative","style":"width:"+_width+"px;height:"+_width+"px;overflow:hidden;"
		});
	}
    
    let imgsrc="";
    let pat : CVTileSurface;
    if(_tileSurfacePattern instanceof CVTileSurfacePattern)
        pat=_tileSurfacePattern.mPattern[0];
    else
        pat=_tileSurfacePattern;
    if(pat.mColor!=null)
    {
        let colorStr=pat.mColor.ToStr();
        imgsrc=gColorImgMap.get(colorStr);
        if(imgsrc==null)
        {
            let color = new CColor(pat.mColor.x,pat.mColor.y,pat.mColor.z, CColor.eModel.RGBMul);
                
            CH5Canvas.Init(1, 1);
            CH5Canvas.Draw([
                CH5Canvas.Cmd("fillStyle", color.GetString()),
                ...CH5Canvas.FillRect(0,0,1,1)
            ]);
            imgsrc=CH5Canvas.GetDataURL();
            gColorImgMap.set(colorStr,imgsrc);
        }

        // badge 추가
        let baseDiv = CDomFactory.JSONToDom({
            "<>":"div","class":"position-relative","style":"width:"+_width+"px;height:"+_width+"px;overflow:hidden;"+
                "background-image:url('"+imgsrc+"');background-size:contain;image-rendering: pixelated;"+
                "background-position:center;background-repeat:no-repeat;"
        });
        if(_vinfo!==undefined) {
            const badge = CDomFactory.JSONToDom({
                "<>":"span","class":"position-absolute top-0 end-0 badge rounded-pill bg-primary m-1 fs-6","text":_vinfo+""
            });
            baseDiv.appendChild(badge);
        }
        return baseDiv;
    }
    
    let codi=gVoxelTar.mAtlas.mTexCodi[pat.mAtlOff];
    imgsrc=await gVoxelTar.mAtlas.GetImgURL(pat.mAtlOff);
    
   
    
    

	let width = codi.z-codi.x;
    let height = codi.w-codi.y;
    let aspect = width / height;
    let imgHeight = _width * aspect;
    let reverseX = pat.mRevers == CCIndex.eRevers.X1Y0 || pat.mRevers == CCIndex.eRevers.X1Y1?-1:1;
    let reverseY = pat.mRevers == CCIndex.eRevers.X0Y1 || pat.mRevers == CCIndex.eRevers.X1Y1?-1:1;
    let baseDiv = CDomFactory.JSONToDom({
        "<>":"div","class":"position-relative","style":"width:"+_width+"px;height:"+imgHeight+"px;overflow:hidden;"+
            "background-image:url('"+imgsrc+"');background-size:contain;transform:scaleX("+reverseX+") scaleY("+reverseY+");image-rendering: pixelated;"+
            "background-position:center;background-repeat:no-repeat;"
    });
    if(_vinfo!==undefined) {
        const badge = CDomFactory.JSONToDom({
            "<>":"span","class":"position-absolute top-0 end-0 badge rounded-pill bg-primary m-1 fs-6","text":_vinfo+""
        });
        baseDiv.appendChild(badge);
    }
    return baseDiv;
}
export function VoxelTool(_voxel : CVoxel) 
{
    gVoxelOrg=_voxel;
    gVoxelTar=_voxel.Export();

    CRollBack.On("Voxel",(_data : CArray<{index:CCIndex,VInfo:number}>)=>{
        for(let info of _data.mArray)
        {
            gVoxelTar.Bonds(info.index,info.VInfo);
        }
    });
    


    gModal = new CModalFlex([0.7, 0.3], "VoxelModal");
    gModal.SetHeader("VoxelTool");
    gModal.SetSize(1000, 800);
    gModal.Open();
    const maxHeight = "calc(100vh - 10px)"; // 필요 시 조정
    const leftPanel = gModal.FindFlex(0) as HTMLElement;
    const rightPanel = gModal.FindFlex(1) as HTMLElement;
    [leftPanel, rightPanel].forEach(panel => {
        panel.style.maxHeight = maxHeight;
        panel.style.overflowY = "auto";
    });
    let canvas = CDomFactory.DataToDom(`
        <div style="position: relative; width: 100%; height: 100%;">
        <canvas id="VoxelLeft_can"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; z-index: 0;">
        </canvas>
      </div>
    `);
    leftPanel.append(canvas);

    let rightHTML=CDomFactory.DataToDom(`<ul class="nav nav-tabs" id="myTab" role="tablist">
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
                <select class="form-select" id="modeSelect">
                    <option value="2D" ${gVoxelTar.m2D?"selected":""}>2D</option>
                    <option value="3D" ${gVoxelTar.m2D?"":"selected"}>3D</option>
                </select>
                </div>
                <div class="col-md-6">
                <label for="actionSelect" class="form-label">동작(Ctrl)</label>
                <select class="form-select" id="actionSelect">
                    <option value="move">Move</option>
                    <option value="create">Create</option>
                    <option value="modify">Modify</option>
                </select>
                </div>
            </div>

            <!-- Row 2: Count (X, Y, Z) -->
            <div class="row mb-3">
                <label class="form-label">Count</label>
                <div class="col">
                <input type="number" class="form-control" id="countX" placeholder="X" value='${gVoxelTar.mCount.x}'>
                </div>
                <div class="col">
                <input type="number" class="form-control" id="countY" placeholder="Y" value='${gVoxelTar.mCount.y}'>
                </div>
                <div class="col">
                <input type="number" class="form-control" id="countZ" placeholder="Z" value='${gVoxelTar.mCount.z}'>
                </div>
            </div>

            <!-- Row 3: Size -->
            <div class="row mb-3">
                <label for="sizeInput" class="form-label">Size</label>
                <div class="col">
                <input type="number" class="form-control" id="sizeInput" placeholder="Size" value='${gVoxelTar.mSize}'>
                </div>
            </div>
            <div class="row mb-3">
                <label for="tileArr_div" class="form-label">Tile</label>
                <div id='tileArr_div' style="display: flex; flex-wrap: wrap; gap: 1px;"></div>
            </div>
            <div class="row mb-3">
                <label for="moldArr_div" class="form-label">Mold</label>
                <div id='moldArr_div' style="display: flex; flex-wrap: wrap; gap: 1px;"></div>
            </div>
            <div id='Map_div'></div>
            
            
            
            
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
        
    </div>`);
    rightPanel.append(rightHTML);
    
    CUtil.ID("atlas_btn").addEventListener("click",()=>{
        gVoxelTar.mAtlas.ModifyModal();
    });
    CUtil.ID("ground_btn").addEventListener("click",()=>{

        if(gSelectedTile==-1)
        {
            CAlert.Info("타일을 선택해 주세요");
            return;
        }
        let tile : CVTile=null;

        for(let t of gVoxelTar.mTileArr)
        {
            if(t.mVInfo==gSelectedTile)
            {
                tile=t;
                break;
            }
                
        }
        if(tile==null)  return;

        if(gVoxelTar.m2D)
        {
            for(var y=0;y<gVoxelTar.mCount.y;++y)
            for(var x=0;x<gVoxelTar.mCount.x;++x)
            {
                gVoxelTar.mVInfo[x+0+y*gVoxelTar.mCount.x]=tile.mVInfo;
                gVoxelTar.mTexInfo[x+0+y*gVoxelTar.mCount.x]=tile.GetTile();
            }
        }
        else
        {
            for(var z=0;z<gVoxelTar.mCount.z;++z)
            for(var x=0;x<gVoxelTar.mCount.x;++x)
            {
                gVoxelTar.mVInfo[x+0+z*gVoxelTar.mCount.x*gVoxelTar.mCount.y]=tile.mVInfo;
                gVoxelTar.mTexInfo[x+0+z*gVoxelTar.mCount.x*gVoxelTar.mCount.y]=tile.GetTile();
            }
        }
        gVoxelTar.mUpdateRes=true;
    });
    const ids = ["countX", "countY", "countZ", "sizeInput", "modeSelect"];
    for (const id of ids) {
        const el = CUtil.ID(id);
        if (el) {
            el.addEventListener("change", VoxelToolResetVoxel);
        }
    }
    

    gModal.On(CEvent.eType.Close,()=>{
        CRollBack.Off("Voxel");
        var pos=gVoxelOrg.GetPos().Export();
		var rot=gVoxelOrg.GetRot().Export();
		var sca=gVoxelOrg.GetSca().Export();

		gVoxelOrg.ResetInfo(gVoxelTar.mCount,gVoxelTar.mSize,gVoxelTar.m2D);
		gVoxelOrg.Import(gVoxelTar);
		gVoxelOrg.SetPos(pos);
		gVoxelOrg.SetRot(rot);
		gVoxelOrg.SetSca(sca);
		
		gAtl.Frame().Destroy();
        gCamMove=true;
        gAtl.Frame().RemoveEvent(gUpdateEvent);

		gSelectedTile=-1;
		
    });
    gAtl = new CAtelier();
    gAtl.mPF.mIAuto = true;
    gAtl.Init([], "VoxelLeft_can", false).then(()=>{
        
    });
    gAtl.NewCanvas("VoxelTool");
    gAtl.Brush().GetCam2D().SetCamCon(new CCamCon2DFreeMove(gAtl.Frame().Input()));
    gAtl.Brush().GetCam3D().SetCamCon(new CCamCon3DFirstPerson(gAtl.Frame().Input()));
    
    gAtl.Canvas("VoxelTool").Push(gVoxelTar);
    gVoxelTar.GetPos().Zero();
    gVoxelTar.GetRot().Zero();
    gVoxelTar.SetSca(new CVec3(1,1,1));
    gVoxelTar.GetWMat().Unit();
    gCurser=gAtl.Canvas("VoxelTool").Push(new CSubject());
    gPress=gAtl.Canvas("VoxelTool").Push(new CSubject());
    
    gAtl.Frame().PushEvent(CEvent.eType.Update,gUpdateEvent);


    for(let i=0;i<_voxel.mLayer.length;++i)
    {
        if(_voxel.mLayer[i].Ref() instanceof CVoxel)
        {
            let lay=_voxel.mLayer[i].Ref().Export();
            let pos=CMath.V3SubV3(lay.GetPos(),gVoxelOrg.GetPos());
            lay.SetPos(pos);
            lay.GetRot().Zero();
            lay.SetSca(new CVec3(1,1,1));
            lay.mUpdateRes=true;
            //lay.PRSReset();
            //lay.GetWMat().Unit();
            gAtl.Canvas("VoxelTool").Push(lay);
            //gVoxelLayer.push(lay);
        }
        
    }

    VoxelToolResetCam();
    VoxelToolResetCurser();
    VoxelToolSelectTileArrReset();

    CUtil.ID("main-tab").onclick=()=>{VoxelToolSelectTileArrReset();};
    CUtil.ID("tile-tab").onclick=()=>{VoxelToolTileArrModifyReset();};
    CUtil.ID("role-tab").onclick=()=>{VoxelToolRoleArrModifyReset();};
    CUtil.ID("mold-tab").onclick=()=>{VoxelToolMoldArrModifyReset();};
    MapDiv();
    
    
    
}
async function VoxelToolSelectTileArrReset()
{

    let SelectChange = (_select : number) => {
        // 이전 타일의 보더 클래스 제거
        
        const prev = CUtil.ID("tile_" + gSelectedTile);
        if (prev) {
            prev.classList.remove("border", "border-2", "border-danger");
        }
        
    

        // 새 타일에 보더 클래스 추가
        gSelectedTile = _select;
        const now = CUtil.ID("tile_" + gSelectedTile);
        if (now) {
            now.classList.add("border", "border-2", "border-danger");
        }

        
    };
    let tileArr_div=CUtil.ID("tileArr_div");
    tileArr_div.innerHTML="";
    let tileDiv=await VoxelAtlasCodiDiv(null,50);
    tileDiv.id="tile_0";
    tileDiv.onclick=()=>{
        SelectChange(0);
    };
    tileArr_div.append(tileDiv);


    
    

    for(let tile of gVoxelTar.mTileArr)
    {
        let tileDiv2=await VoxelAtlasCodiDiv(tile,50, tile.mVInfo);
        tileDiv2.id="tile_"+tile.mVInfo;
        tileDiv2.onclick=()=>{
            SelectChange(tile.mVInfo);
            
        };
        tileArr_div.append(tileDiv2);
    }

    let moldArr_div=CUtil.ID("moldArr_div");
    moldArr_div.innerHTML="";

    for(let mold of gVoxelTar.mTileMoldArr)
    {
        let moldUp=await MoldTileReset(mold);
        moldUp.id="tile_"+mold.ObjHash();
        moldUp.onclick=()=>{
            SelectChange(mold.ObjHash());
            
        };
        moldArr_div.append(moldUp);
    }
}
async function CVTileSurfaceEX(_pointer: CPointer, _div: HTMLDivElement, _input: HTMLInputElement) 
{

    if(_pointer.member=="mRevers")
    {
        if(_pointer.target.mAtlOff>=0) {
            _div.append(CUtilObj.Select(_pointer,_input,["X0Y0","X1Y0","X0Y1","X1Y1"],
                [CCIndex.eRevers.X0Y0,CCIndex.eRevers.X1Y0,CCIndex.eRevers.X0Y1,CCIndex.eRevers.X1Y1],true));	
        }
        else {
            _div.hidden = true;
        }
    }
    else if(_pointer.member=="mAtlOff")
    {
        let updateAtlOff = (_off) => {
            if(_off < 0)   _pointer.target.mColor = new CVec3();
            else    _pointer.target.mColor=null;
            _pointer.target.mAtlOff=_off;
            //이거 하드코딩함...
            _pointer.refArr.splice(_pointer.refArr.length-1,1);
            _pointer.target.EditRefresh(_pointer);
            _div.innerHTML="";
            _div.append(_input);
        };
        _input.onclick=()=>{
            gVoxelTar.mAtlas.ModifyModal((_off)=>{
                updateAtlOff(_off);
            });
            
        };
        _input.onchange=(e)=>{
            updateAtlOff(Number((e.target as HTMLInputElement).value));
        };
        if(_pointer.target.mAtlOff>=0)
        {
            let tileHTML=await VoxelAtlasCodiDiv(_pointer.target);
            _div.append(tileHTML);
        
        }
        else
        {
            if(_pointer.target.mColor == null) {
                _pointer.target.mColor = new CVec3();
            }
            const r = Math.max(0, Math.min(255, Math.round(_pointer.target.mColor.x * 255)));
            const g = Math.max(0, Math.min(255, Math.round(_pointer.target.mColor.y * 255)));
            const b = Math.max(0, Math.min(255, Math.round(_pointer.target.mColor.z * 255)));

            // HEX로 변환
            let code = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

            let chtml=CDomFactory.DataToDom({"tag":"input","type":"color","class":"form-control form-control-color",
                "id":_pointer.target.ObjHash()+"_color","value":code,"onchange":(e)=>{
                    let value=CUtil.IDValue(_pointer.target.ObjHash()+"_color");
    
                    const r = parseInt(value.substring(1, 3), 16) / 255;
                    const g = parseInt(value.substring(3, 5), 16) / 255;
                    const b = parseInt(value.substring(5, 7), 16) / 255;
                    
                    
                    _pointer.target.mColor.x =r;
                    _pointer.target.mColor.y =g;
                    _pointer.target.mColor.z =b;
                    
                    //pat.EditRefresh();
                }
            });
            _div.append(chtml);
            // let colPick = CUtilObj.AddColorPicker(this.m_color, _input, false);
            // if(colPick != _input) {
            // 	_div.append(colPick);
            // }
            // else {
            // 	CUtilObj.AddColorPicker(this.m_color, _div, false);
            // }
        }
    }

    if(_pointer.member=="mColor")
    {
        _div.hidden = true;
    }
}
async function VoxelToolTileArrModifyReset()
{
    let TileDelete_sel=CUtil.ID("TileDelete_sel");
    let TileAdd_btn=CUtil.ID("TileAdd_btn");

    TileDelete_sel.innerHTML="";
    TileDelete_sel.onchange=()=>{
        let tds=Number(CUtil.IDValue("TileDelete_sel"));
        for(let i=0;i<gVoxelTar.mTileArr.length;++i)
        {
            if(gVoxelTar.mTileArr[i].mVInfo==tds)
            {
                gVoxelTar.mTileArr.splice(i,1);
                VoxelToolTileArrModifyReset();
                break;
            }
        }
    };
    let option=CDomFactory.DataToDom(`<option value='-1'>Delete..</option>`);
    TileDelete_sel.append(option);
    for(let t of gVoxelTar.mTileArr)
    {
        let option=CDomFactory.DataToDom(`<option value='${t.mVInfo}'>${t.mVInfo}</option>`);
        TileDelete_sel.append(option);
    }


    TileAdd_btn.onclick=()=>{
        let tile=new CVTile();
        for(let t of gVoxelTar.mTileArr)
        {
            if(t.mVInfo>tile.mVInfo)
                tile.mVInfo=t.mVInfo;
        }
        tile.mVInfo++;
        gVoxelTar.mTileArr.push(tile);
        VoxelToolTileArrModifyReset();
    };

    let EditEXPush=(tile)=>{
        tile.EditChangeEx=(_pointer : CPointer,_child : boolean): void =>{
            if(_child) return;
            if(_pointer.member=="mVInfo")
            {
                //tile.EditRefresh();
                gVoxelTar.ColliderEventReset();
            }
            if(_pointer.member=="mPattern" && _pointer.state==1)
            {
                EditEXPush(tile);
                //tile.EditRefresh();
                //VoxelToolTileArrModifyReset();
                
            }
        };
        for(let pat of tile.mPattern)
        {
            pat.EditFormEx=CVTileSurfaceEX;
        }
    };


    let SelectChange = (_select) => {

        let tile : CVTile=null;
        for(let t of gVoxelTar.mTileArr)
        {
            if(_select==t.mVInfo)
            {
                tile=t;
                break;
            }
        }
        let html=tile.EditInit(null);
        CUtil.ID("tileModify_div").innerHTML="";
        CUtil.ID("tileModify_div").append(html);
       

        EditEXPush(tile);
        
        
        


        
        
    };
    let tileArrModify_div=CUtil.ID("tileArrModify_div");
    tileArrModify_div.innerHTML="";
    
    

    for(let tile of gVoxelTar.mTileArr)
    {
        let tileDiv2=await VoxelAtlasCodiDiv(tile,50);
        tileDiv2.id="tileM_"+tile.mVInfo;
        tileDiv2.onclick=()=>{
            SelectChange(tile.mVInfo);
            
        };
        tileArrModify_div.append(tileDiv2);
    }
}
async function VoxelToolRoleArrModifyReset()
{
     let RoleDelete_sel=CUtil.ID("RoleDelete_sel");
    let RoleAdd_btn=CUtil.ID("RoleAdd_btn");

    RoleDelete_sel.innerHTML="";
    RoleDelete_sel.onchange=()=>{
        let tds=CUtil.IDValue("RoleDelete_sel");
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
    let option=CDomFactory.DataToDom(`<option value='-1'>Delete..</option>`);
    RoleDelete_sel.append(option);
    for(let t of gVoxelTar.mTileRoleArr)
    {
        let option=CDomFactory.DataToDom(`<option value='${t.ObjHash()}'>${t.ObjHash()}</option>`);
        RoleDelete_sel.append(option);
    }


    RoleAdd_btn.onclick=()=>{
        let role=new CVTileRole();
       
        gVoxelTar.mTileRoleArr.push(role);
        VoxelToolRoleArrModifyReset();
    };

    let RoleArrModify_div=CUtil.ID("RoleArrModify_div");
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
                for(let tile of gVoxelTar.mTileArr)
                {
                    sjson.html.push({"tag":"option","value":tile.mVInfo+"","text":tile.mVInfo+""});
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
                    for(let t of gVoxelTar.mTileArr)
                    {
                        if(t.mVInfo==role.mRole[i])
                        {
                            tile=t;
                        }
                    }
                    copy["onchange"]=async (e)=>{
                        let target=e.target as HTMLInputElement;
                        let off=Number(target.title);
                        role.mRole[off]=Number(target.value);
                        CUtil.ID(off+"_Role").innerHTML="";
                        let tile2=null;
                        for(let t of gVoxelTar.mTileArr)
                        {
                            if(t.mVInfo==role.mRole[i])
                            {
                                tile2=t;
                            }
                        }
                        CUtil.ID(off+"_Role").append(await VoxelAtlasCodiDiv(tile2,50));
                        
                    }
                    html.html[i].html.push(copy);
                    
                    html2.html[i]["id"]=i+"_Role";
                    html2.html[i].html.push(await VoxelAtlasCodiDiv(tile,50));
                }

                _input.innerHTML="";
                _input.append(CDomFactory.DataToDom(html2));
                _input.append(CDomFactory.DataToDom(html));
                

            }
        }
        
        for(let pat of role.mPattern)
        {
            pat.EditFormEx=CVTileSurfaceEX;
        }
            
        
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
        CUtil.ID("RoleModify_div").innerHTML="";
        CUtil.ID("RoleModify_div").append(html);

        
        // for(let tsp of role.mTSP)
        // {
        //     for(let pat of tsp.mPattern)
        //     {
        //         pat.EditFormEx=CVTileSurfaceEX;
        //     }
            
        // }
        
       

        //EditEXPush(tile);
        
    };
    CUtil.ID("RoleModify_div").innerHTML="";
    for(let role of gVoxelTar.mTileRoleArr)
    {
        let roleDiv2=await VoxelAtlasCodiDiv(role,50);
        roleDiv2.id="roleM_"+role.ObjHash();
        roleDiv2.onclick=()=>{
            SelectChange(role.ObjHash());
            
        };
        RoleArrModify_div.append(roleDiv2);
    }
}
async function MoldTileReset(mold : CVTileMold)
{

    let upDiv = document.createElement('div');
    upDiv.id="moldM_"+mold.ObjHash();

    // 1) wrapperDiv 생성: Bootstrap 그리드 사용(row-cols-{cols} + 간격 g-1)
    let wrapperDiv = document.createElement('div');
    wrapperDiv.className = `row row-cols-${mold.mWidth} m-0`;
    wrapperDiv.style.width=(mold.mWidth*50)+"px";
    wrapperDiv.style.height=(mold.mHeight*50)+"px";

    // 2) mold 내부 타일 인덱스 순회
    for (let tileV of mold.mTileVInfoArr) {
        // 2-1) col 컨테이너
        const colDiv = document.createElement('div');
        colDiv.className = 'col';

        // 2-2) 실제 타일 데이터 가져와서 div 생성

        let tile : CVTile =null;
        // gVoxelTar.mTileArr[tileIdx];
        for(let i=0;i<gVoxelTar.mTileArr.length;++i)
        {
            if(gVoxelTar.mTileArr[i].mVInfo==tileV)
            {
                tile=gVoxelTar.mTileArr[i];
            }
        }
        const tileDiv = await VoxelAtlasCodiDiv(tile, 50);
        

        // 2-4) colDiv에 tileDiv 추가
        colDiv.appendChild(tileDiv);

        // 2-5) wrapperDiv에 colDiv 추가
        wrapperDiv.appendChild(colDiv);
    }
    
    upDiv.append(wrapperDiv);
    return upDiv;
};
async function VoxelToolMoldArrModifyReset()
{
     let MoldDelete_sel=CUtil.ID("MoldDelete_sel");
    let MoldAdd_btn=CUtil.ID("MoldAdd_btn");

    MoldDelete_sel.innerHTML="";
    MoldDelete_sel.onchange=()=>{
        let tds=CUtil.IDValue("MoldDelete_sel");
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
    let option=CDomFactory.DataToDom(`<option value='-1'>Delete..</option>`);
    MoldDelete_sel.append(option);
    for(let t of gVoxelTar.mTileMoldArr)
    {
        let option=CDomFactory.DataToDom(`<option value='${t.ObjHash()}'>${t.ObjHash()}</option>`);
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
        //EditEXPush(role);
        mold.EditChangeEx=(_pointer : CPointer,_childe : boolean)=>
        {
            if(_pointer.member=="mWidth" || _pointer.member=="mHeight" )
            {
                mold.mTileVInfoArr=new Array(mold.mWidth*mold.mHeight);
                mold.mTileVInfoArr.fill(-1);
                mold.EditRefresh();
                
            }
        };
        mold.EditFormEx=(_pointer: CPointer, _div: HTMLDivElement, _input: HTMLInputElement): void =>{
            
            
            if(_pointer.member=="mTileVInfoArr" )
            {
                // 1) 기존 내용 비우기
                _input.innerHTML = "";

                // 2) 그리드 컨테이너 생성 (row-cols-{mWidth}으로 한 행에 mWidth cols)
                const wrapper = document.createElement("div");
                wrapper.className = `row row-cols-${mold.mWidth} gx-1 gy-1 mb-2`;

                // 3) mWidth*mHeight 만큼 select 생성
                for (let idx = 0; idx < mold.mWidth * mold.mHeight; idx++) {
                // col 컨테이너
                const col = document.createElement("div");
                col.className = "col";

                // select 생성
                const select = document.createElement("select");
                select.className = "form-select form-select-sm";

                // 옵션 추가: Pass(-1), Zero(0)
                let opt = document.createElement("option");
                opt.value = "-1";
                opt.text   = "Pass";
                select.appendChild(opt);

                opt = document.createElement("option");
                opt.value = "0";
                opt.text   = "Zero";
                select.appendChild(opt);

                // gVoxelTar.mTileArr 길이만큼 tile 정보 옵션 추가
                for (let i = 0; i < gVoxelTar.mTileArr.length; i++) {
                    const tileInfo = gVoxelTar.mTileArr[i].mVInfo + "";
                    const o = document.createElement("option");
                    o.value = tileInfo;
                    o.text   = tileInfo;
                    select.appendChild(o);
                }

                // 현재 값으로 select 초기화
                select.value = mold.mTileVInfoArr[idx] + "";

                // 변경 시 mold.mTileArr 에 반영
                select.addEventListener("change", async () => {
                    mold.mTileVInfoArr[idx] = parseInt(select.value, 10);


                    CUtil.ID("moldM_"+mold.ObjHash()).innerHTML="";
                    let upDiv=await MoldTileReset(mold);
                    upDiv.onclick=()=>{
                        SelectChange(mold.ObjHash());
                    };
                    CUtil.ID("moldM_"+mold.ObjHash()).append(upDiv);
                    
                });

                // col에 붙이고
                col.appendChild(select);
                // wrapper에 붙이기
                wrapper.appendChild(col);
                }

                // 4) 최종적으로 input(container)에 붙이기
                _input.appendChild(wrapper);
                
            }
        };
    
        let html=mold.EditInit(null);
        CUtil.ID("MoldModify_div").innerHTML="";
        CUtil.ID("MoldModify_div").append(html);

        
    };

    MoldAdd_btn.onclick=()=>{
        let role=new CVTileMold();
       
        gVoxelTar.mTileMoldArr.push(role);
        VoxelToolMoldArrModifyReset();
    };
    let MoldArrModify_div=CUtil.ID("MoldArrModify_div");
    MoldArrModify_div.innerHTML="";

    CUtil.ID("MoldModify_div").innerHTML="";
    
    for(let mold of gVoxelTar.mTileMoldArr)
    {
        let upDiv=await MoldTileReset(mold);
        upDiv.onclick=()=>{
            SelectChange(mold.ObjHash());
        };
        MoldArrModify_div.append(upDiv);
    }
}
function VoxelToolResetVoxel()
{
    let countX=Number(CUtil.IDValue("countX"));
    let countY=Number(CUtil.IDValue("countY"));
    let countZ=Number(CUtil.IDValue("countZ"));
    let sizeInput=Number(CUtil.IDValue("sizeInput"));
    let modeSelect=CUtil.IDValue("modeSelect");

    gVoxelTar.ResetInfo(new CVec3(countX,countY,countZ),sizeInput,modeSelect=="2D"?true:false);
    gAtl.Canvas("VoxelTool").ClearBatch();
    VoxelToolResetCam();
    VoxelToolResetCurser();
    
    
    CRollBack.Claear();
    
}
function VoxelToolResetCurser(_xSize : number = 1, _ySize : number = 1)
{
    
    gCurserXSize = _xSize;
	gCurserYSize = _ySize;
	gCurser.RemoveComps(CPaint3D);
	if(gVoxelTar.m2D)
	{
		for(let y = _ySize - 1; y >= 0; y--)
		for(let x = 0; x < _xSize; x++) {
			let index = x + y * _xSize;
			let pt=new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());

			let pos = new CVec3();
			pos.x = x * 200;
			pos.y = -y * 200;

			let mat=new CMat();
			mat.xyz=pos;
			pt.SetLMat(mat);

			gCurser.PushComp(pt);
            pt.SetRGBA(new CVec4(1,0,0,-0.5));
			// if(_texture.length > index && _texture[index] != null) {
			// 	if(_texture[index] instanceof CVec3) {
			// 		pt.SetTexture([]);
			// 		pt.SetRGBA(new CVec4(_texture[index].x,_texture[index].y,_texture[index].z,0));
			// 	}
			// 	else {
			// 		pt.SetTexture(_texture[index]);
			// 		pt.SetRGBA(new CVec4(0,0,0,0));
			// 	}
			// }
			// else {
			// 	pt.SetTexture(gAtl.Frame().Pal().GetBlackTex());
			// 	pt.SetRGBA(new CVec4(1,0,0,-0.5));
			// }
		}

		let pt=new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
		let mat=new CMat();
		mat.mF32A[5]=0.2;
		mat.xyz=new CVec3(200 * (_xSize),0,0);
		pt.SetLMat(mat);
		gCurser.PushComp(pt);
		pt.SetRGBA(new CVec4(0,0,1,-0.6));

		pt=new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
		mat=new CMat();
		mat.mF32A[0]=0.2;
		mat.xyz=new CVec3(0,200,0);
		pt.SetLMat(mat);
		gCurser.PushComp(pt);
		pt.SetRGBA(new CVec4(0,1,0,-0.6));
	}
	else
	{
		let i = 0;
		for(; i < _xSize * _ySize; i++) {
			let pt=new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
			gCurser.PushComp(pt);
			// if(_texture.length > i && _texture[i] != null) {
			// 	let t = _texture[i];
			// 	if(t instanceof CVec3) {
			// 		pt.SetTexture([]);
			// 		pt.SetRGBA(new CVec4(t.x,t.y,t.z,0));
			// 	}
			// 	else {
			// 		pt.SetTexture(t);
			// 		pt.SetRGBA(new CVec4(0,0,0,0));
			// 	}
			// }
			// else {
			// 	pt.SetTexture(gAtl.Frame().Pal().GetBlackTex());
			// 	pt.SetRGBA(new CVec4(1,0,0,-0.5));
			// }
            pt.SetRGBA(new CVec4(1,0,0,-0.5));
		}

		let pt=new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
		let mat=new CMat();
		mat.mF32A[10]=0.2;
		mat.xyz=new CVec3(200 * (_xSize),0,0)
		pt.SetLMat(mat);
		gCurser.PushComp(pt);
		pt.SetRGBA(new CVec4(0,0,1,-0.6));

		pt=new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
		mat=new CMat();
		mat.mF32A[0]=0.2;
		mat.xyz=new CVec3(0,0,200 * (_ySize));
		pt.SetLMat(mat);
		gCurser.PushComp(pt);
		pt.SetRGBA(new CVec4(0,1,0,-0.6));
	}
	
	gCurser.SetSca(new CVec3(0.55,0.55,0.55));
}
function VoxelToolResetCam()
{
    if(gVoxelTar.m2D)
    {
        gAtl.Brush().GetCam2D().Init(new CVec3(0, 0.1, 100),new CVec3(0, 0.1, 0));
        gAtl.Canvas("VoxelTool").SetCameraKey("2D");
    }
        
    else
    {
        gAtl.Brush().GetCam2D().Init(new CVec3(0, 1000, 1),new CVec3(0, 0, 0))
        gAtl.Canvas("VoxelTool").SetCameraKey("3D");
    }
        
    
}
function SelectMapRefresh()
{
    let sca=(gVoxelTar.mSize/200)*1.1;
    gPress.RemoveComps(CPaint3D);

    for(let index of gSelectMap.values())
    {
        
        
        let mat=new CMat();
        mat.mF32A[0]=sca;
        mat.mF32A[5]=sca;
        mat.mF32A[10]=sca;
        mat.xyz=CMath.V3AddV3(index.M2Pos(gVoxelTar.mSize),gVoxelTar.GetPos());
        let pt=new CPaint3D(gAtl.Frame().Pal().GetBoxMesh());
        pt.SetRGBA(new CVec4(0,1,0,-0.5));
        pt.SetLMat(mat);
        gPress.PushComp(pt);
    
    }
}
function VoxelToolUpdate(_delay)
{
    let input=gAtl.Frame().Input();
    let actionSelect=CUtil.IDValue("actionSelect")
    let mouse=gAtl.Frame().Input().Mouse();
	let ray=gAtl.Brush().GetCam3D().GetRay(mouse.x,mouse.y);
	if(gVoxelTar.m2D)
		ray=gAtl.Brush().GetCam2D().GetRay(mouse.x,mouse.y);
    let pick=gVoxelTar.PickBox(ray)

    if(gVoxelTar.m2D)
    {
        
        pick.x=Math.trunc((ray.GetOriginal().x)/gVoxelTar.mSize);
        pick.y=Math.trunc((ray.GetOriginal().y)/gVoxelTar.mSize);
        pick.z=0;
        pick.pick=CCIndex.eDir.Up;
    }
    else if(pick.pick==CCIndex.eDir.Null)    return;
    if(actionSelect=="create")
		pick.PickMove();

    let sca=(gVoxelTar.mSize/200)*1.1;
	let pos=CMath.V3AddV3(pick.M2Pos(gVoxelTar.mSize),gVoxelTar.GetPos());
	
	gCurser.SetSca(new CVec3(sca,sca,sca));
    if(gAtl.Frame().Input().KeyUp(CInput.eKey.RControl) ||  gAtl.Frame().Input().KeyUp(CInput.eKey.LControl))
    {
        if(actionSelect=="move")
        {
            actionSelect="modify";
            CUtil.IDValue("actionSelect","modify");
            gAtl.Brush().GetCam3D().GetCamCon().SetRotKey(0);
            gAtl.Brush().GetCam2D().GetCamCon().SetRotKey(0);
        }
        else
        {
            actionSelect="move";
            CUtil.IDValue("actionSelect","move");
            gAtl.Brush().GetCam3D().GetCamCon().SetRotKey(CInput.eKey.LButton);
            gAtl.Brush().GetCam2D().GetCamCon().SetRotKey(CInput.eKey.LButton);
        }

        
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
            let off=index.Offset(gVoxelTar.mCount);
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
            let off=index.Offset(gVoxelTar.mCount);
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
            let off=index.Offset(gVoxelTar.mCount);
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
            let off=index.Offset(gVoxelTar.mCount);
            gSelectMap.set(off,index);
        }

        SelectMapRefresh();
		
	}
    
    if(input.KeyDown(CInput.eKey.LButton,true))
    {
        roll=new CRollBackInfo("Voxel",new CArray());
    }
    if(input.KeyDown(CInput.eKey.LButton))
    {
        let off=pick.Offset(gVoxelTar.mCount);
        if(gSelectMap.get(off)==null)
        {
            gSelectMap.set(pick.Offset(gVoxelTar.mCount),pick);
            SelectMapRefresh();
        }
        
    }
    if(input.KeyUp(CInput.eKey.LButton))
    {
        for(let index of gSelectMap.values())
        {
            if(typeof gSelectedTile=="number")
            {
                roll.mData.Push({ index: index.Export(), VInfo: gVoxelTar.GetVInfo(index) });
                gVoxelTar.Bonds(index,gSelectedTile);
            }
                
            else
            {
                let nIndex=index.Export();
                for(let mold of gVoxelTar.mTileMoldArr)
                {
                    
                    if(gSelectedTile==mold.ObjHash())
                    {
                        for(let y=0;y<mold.mHeight;++y)
                        for(let x=0;x<mold.mWidth;++x)
                        {
                            nIndex.Import(index);
                            if(gVoxelTar.m2D)   nIndex.Add(x,y,0);
                            else nIndex.Add(x,0,y);

                            let off=mold.mTileVInfoArr[x+y*mold.mWidth];
                            if(off!=-1)
                            {

                                roll.mData.Push({ index: nIndex.Export(), VInfo: gVoxelTar.GetVInfo(nIndex) });
                                gVoxelTar.Bonds(nIndex,off);
                            }
                                
                        }
                        
                    }
                }
                break;
            }
        }


        gSelectMap.clear();
        SelectMapRefresh();
        CRollBack.Push(roll);

    }

}
function MapDiv()
{
    


    let Map_div=CUtil.ID("Map_div");
    Map_div.append(CDomFactory.DataToDom(`
        <div class="card">
            <!-- 헤더 -->
            <div class="card-header" id="headingNoise">
                <h5 class="mb-0">
                <button class="btn btn-link" type="button" data-bs-toggle="collapse" data-bs-target="#collapseNoise" aria-expanded="false"
                    aria-controls="collapseNoise" >Noise</button>
                </h5>
            </div>

            <!-- 바디 -->
            <div    id="collapseNoise" class="collapse" aria-labelledby="headingNoise">
                <div class="card-body p-1">
                    
                    <button type="button" class="btn btn-primary" id='MapCreate_btn'>Map Create</button>
                    <label for="WaterDepth_sli" class="form-label">InValue</label>
                    <input type="range" class="form-range" id="NoiseInValue_sli" min='0' max='1' step='0.01' value='0.5'>
                    <div class="input-group mb-3">
                        <span class="input-group-text" >Tile</span>
                        <input type="number" class="form-control" id="NoiseTile_num" placeholder="VInfo" value='0'>
                    </div>
                    <div class="mb-2">
                        <label for="NoiseTarget" class="form-label">이 Tile에서만 적용 VInfo[1,2,3...]</label>
                        <input type="text" class="form-control form-control-sm" id="NoiseTarget" value="0">
                    </div>

                    
                </div>
            </div>
        </div>
    `));

    CUtil.ID("MapCreate_btn").onclick=()=>{
        
        let NoiseTile_num=Number(CUtil.IDValue("NoiseTile_num"));
        let NoiseInValue_sli=Number(CUtil.IDValue("NoiseInValue_sli"));
        const NoiseTarget = CUtil.IDValue("NoiseTarget").split(",")
            .map(v => Number(v.trim()))
            .filter(v => !isNaN(v));

        

        
        

        if(NoiseTile_num==0)
        {
            CAlert.Info("VInfo값을 모두 넣어주세요");
            return;
        }
        if(gVoxelTar.m2D==false)
        {
            CAlert.Info("2D만 지원");
            return;
        }

        let width=gVoxelTar.mCount.x;
        let height=gVoxelTar.mCount.y;
        let frequency=8;
        let index=new CCIndex();
        let seed=Math.random();
        roll=new CRollBackInfo("Voxel",new CArray());
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                index.x=x;
                index.y=y;
                // 0.0~1.0 범위의 노이즈 좌표로 매핑
                const nx = x / width  * frequency;   // frequency=8
                const ny = y / height * frequency;
                const value = CUtilMath.Noise(nx+seed, ny+seed);
                let info = gVoxelTar.GetVInfo(index);
                
                if(value<NoiseInValue_sli && NoiseTarget.includes(info))
                {
                    roll.mData.Push({index:index.Export(),VInfo:gVoxelTar.GetVInfo(index)});
                    gVoxelTar.Bonds(index,NoiseTile_num);
                    
                }
               
              
            }
        }
        CRollBack.Push(roll);
        


    };

    //=================================================================
    Map_div.append(CDomFactory.DataToDom(`
        <div class="card">
            <!-- 헤더 -->
            <div class="card-header" id="headingTree">
                <h5 class="mb-0">
                <button class="btn btn-link" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTree" aria-expanded="false"
                    aria-controls="collapseTree" >Tree</button>
                </h5>
            </div>

            <!-- 바디 -->
            <div    id="collapseTree" class="collapse" aria-labelledby="headingTree">
                <div class="card-body p-1">
                    <form>
                        <!-- 트리 생성 버튼 -->
                        <div class="mb-2">
                            <button type="button" class="btn btn-success w-100" id="TreeCreate_btn">트리 생성</button>
                        </div>
                        <!-- 기본 확률 baseProb -->
                        <div class="mb-2">
                            <label for="TreeBaseProb" class="form-label">생성 확률</label>
                            <input type="range" class="form-range" id="TreeBaseProb" min="0" max="1" step="0.01" value="0.2">
                        </div>

                        <!-- 군집 보정 clusterBoost -->
                        <div class="mb-2">
                            <label for="TreeClusterBoost" class="form-label">군집 영향</label>
                            <input type="range" class="form-range" id="TreeClusterBoost" min="0" max="1" step="0.01" value="0.1">
                        </div>

                        <!-- 레이어 텍스트 입력 -->
                        <div class="mb-2">
                            <label for="TreeLayer" class="form-label">레이어(없으면 현재 복셀 선택)</label>
                            <input type="text" class="form-control form-control-sm" id="TreeLayer" placeholder="Layer Name">
                        </div>

                        <!-- VInfo 넘버 입력 -->
                        <div class="mb-2">
                            <label for="TreeTarget" class="form-label">이 Tile에서만 적용 VInfo[1,2,3...]</label>
                            <input type="text" class="form-control form-control-sm" id="TreeTarget" value="0">
                        </div>

                        <!-- 몰드 넘버 입력 -->
                        <div class="mb-2">
                            <label for="TreeMoldNum" class="form-label">몰드 오프셋[0,1,2...]</label>
                            <input type="text" class="form-control form-control-sm" id="TreeMoldNum" value="0">
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `));
    CUtil.ID("TreeCreate_btn").onclick = () => {
        const baseProb = Number(CUtil.IDValue("TreeBaseProb"));       // 기본 확률
        const clusterBoost = Number(CUtil.IDValue("TreeClusterBoost")); // 군집 당 증가 확률
        let TreeLayer = CUtil.IDValue("TreeLayer");
        //let TreeVInfo = Number(CUtil.IDValue("TreeVInfo"));
        //let TreeMoldNum = Number(CUtil.IDValue("TreeMoldNum"));
        const TreeTargetList = CUtil.IDValue("TreeTarget").split(",")
            .map(v => Number(v.trim()))
            .filter(v => !isNaN(v));

        const TreeMoldList = CUtil.IDValue("TreeMoldNum").split(",")
            .map(v => Number(v.trim()))
            .filter(v => !isNaN(v));

        if (TreeTargetList.length === 0 || TreeMoldList.length === 0) {
            CAlert.E("VInfo 또는 몰드 목록이 비어있습니다.");
            return;
        }
        let fVoxel = gVoxelTar;
        if (TreeLayer !== "") {
            for (let b of gVoxelTar.mLayer) {
                if (b.Ref() instanceof CVoxel && b.mKey == TreeLayer) {
                    fVoxel = b.Ref();
                    break;
                }
            }
        }

        const moldIndex = TreeMoldList[Math.floor(Math.random() * TreeMoldList.length)];
        const mold = gVoxelTar.mTileMoldArr[moldIndex];

        const width = fVoxel.mCount.x;
        const height = fVoxel.mCount.y;
        const moldW = mold.mWidth;
        const moldH = mold.mHeight;
        const index = new CCIndex();
        roll=new CRollBackInfo("Voxel",new CArray());

        // === [1] 군집 정보 기록용 배열 ===
        const treeMap: boolean[][] = [];
        for (let y = 0; y < height; y++) {
            treeMap[y] = [];
            for (let x = 0; x < width; x++) {
                treeMap[y][x] = false;
            }
        }

        // === [2] 좌표 순회 ===
        for (let y = 0; y <= height - moldH; y += 1) {
            for (let x = 0; x <= width - moldW; x += 1) {
                let valid = true;

                for (let j = 0; j < moldH; j++) {
                    for (let i = 0; i < moldW; i++) {
                        index.x = x + i;
                        index.y = y + j;

                        let info = fVoxel.GetVInfo(index);
                        if (!TreeTargetList.includes(info)) {
                            valid = false;
                            break;
                        }
                        info = gVoxelTar.GetVInfo(index);
                        if (info !== 0) {
                            valid = false;
                            break;
                        }
                    }
                    if (!valid) break;
                }

                if (valid) {
                    // === [3] 주변 나무 개수 세기 ===
                    let neighborCount = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            let nx = x + dx;
                            let ny = y + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                if (treeMap[ny][nx]) neighborCount++;
                            }
                        }
                    }

                    // === [4] 확률 계산 ===
                    // const baseProb = 0.2;
                    // const clusterBoost = 0.1;
                    const prob = baseProb + clusterBoost * neighborCount;

                    if (Math.random() < prob) {
                        // === [5] 몰드 심기 ===
                        for (let j = 0; j < moldH; j++) {
                            for (let i = 0; i < moldW; i++) {
                                index.x = x + i;
                                index.y = y + j;
                                roll.mData.Push({ index: index.Export(), VInfo: gVoxelTar.GetVInfo(index) });

                                const moldVal = mold.mTileVInfoArr[i + j * moldW];
                                let tile: CVTile = null;

                                for (let k = 0; k < gVoxelTar.mTileArr.length; ++k) {
                                    if (gVoxelTar.mTileArr[k].mVInfo === moldVal) {
                                        tile = gVoxelTar.mTileArr[k];
                                        break;
                                    }
                                }

                                const num = tile?.GetTile() ?? 0;
                                gVoxelTar.Bonds(index, num);
                                treeMap[index.y][index.x] = true; // 군집 기록
                            }
                        }
                    }
                }
            }
        }

        CRollBack.Push(roll);
    };
    Map_div.append(CDomFactory.DataToDom(`
        <div class="card">
            <div class="card-header" id="headingPGRW">
                <h5 class="mb-0">
                    <button class="btn btn-link" type="button" data-bs-toggle="collapse"
                        data-bs-target="#collapsePGRW" aria-expanded="false" aria-controls="collapsePGRW">PerlinGuidedRandomWalk</button>
                </h5>
            </div>

            <div id="collapsePGRW" class="collapse" aria-labelledby="headingPGRW">
                <div class="card-body p-1">
                    <form>
                        <div class="mb-2">
                            <button type="button" class="btn btn-success w-100" id="PGRWCreate_btn">길 생성</button>
                        </div>

                        <div class="mb-2">
                            <label for="PGRWTarget" class="form-label">이 Tile에서만 적용 VInfo[1,2,3...]</label>
                            <input type="text" class="form-control form-control-sm" id="PGRWTarget" value="0">
                        </div>

                        <div class="input-group mb-2">
                            <span class="input-group-text">Tile</span>
                            <input type="number" class="form-control" id="PGRWTile_num" placeholder="VInfo" value="0">
                        </div>

                        <!-- maxStep 배수 -->
                        <div class="mb-2">
                            <label for="PGRWStepSlider" class="form-label">생성 횟수</label>
                            <input type="range" class="form-range" min="1" max="100" value="1" id="PGRWStepSlider">
                        </div>

                        <div class="mb-2">
                            <label for="PGRWSpikeChance" class="form-label">튀는 확률</label>
                            <input type="range" class="form-range" min="0" max="50" value="10" id="PGRWSpikeChance">
                        </div>

                        <div class="mb-2">
                            <label class="form-label">생성 위치</label>
                            <input type="range" class="form-range" id="PGRWX" min="0" max="1" step="0.01" value="0.5">
                            <input type="range" class="form-range" id="PGRWY" min="0" max="1" step="0.01" value="0.5">
                        </div>


                    </form>
                </div>
            </div>
        </div>
    `));

    // 슬라이더 값 반영 (실시간)
    CUtil.ID("PGRWStepSlider").oninput = (e) => {
        CUtil.ID("PGRWStepValue").innerText = CUtil.IDValue("PGRWStepSlider");
    };
    CUtil.ID("PGRWSpikeChance").oninput = (e) => {
        CUtil.ID("PGRWSpikeValue").innerText = CUtil.IDValue("PGRWSpikeChance");
    };

    CUtil.ID("PGRWCreate_btn").onclick = () => {
        const PGRWTargetList = CUtil.IDValue("PGRWTarget").split(",")
            .map(v => Number(v.trim()))
            .filter(v => !isNaN(v));
        const PGRWTile_num = Number(CUtil.IDValue("PGRWTile_num"));

        const stepMul = Number(CUtil.IDValue("PGRWStepSlider")); // 배수
        const spikeChance = Number(CUtil.IDValue("PGRWSpikeChance")); // %

        const PGRWX = Number(CUtil.IDValue("PGRWX"));
        const PGRWY = Number(CUtil.IDValue("PGRWY"));

        

        if (PGRWTargetList.length === 0) {
            CAlert.E("적용할 타일 VInfo가 필요합니다.");
            return;
        }

        if (!gVoxelTar.m2D) {
            CAlert.E("2D에서만 지원됩니다.");
            return;
        }

        const width = gVoxelTar.mCount.x;
        const height = gVoxelTar.mCount.y;
        const maxSteps = Math.floor(width * stepMul);

        const seed = Math.random();
        const visited = new Set<string>();
        const queue: CCIndex[] = [];

        // PGRWX, PGRWY는 퍼센트 값(0~1)
        const sx = Math.floor(width * Math.max(0, Math.min(1, PGRWX)));
        const sy = Math.floor(height * Math.max(0, Math.min(1, PGRWY)));
        const start = new CCIndex(sx, sy, 0);
        queue.push(start);

        roll = new CRollBackInfo("Voxel", new CArray());

        const directions = [
            { dx: 0, dy: -1 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }
        ];

        let steps = 0;
        while (queue.length > 0 && steps < maxSteps) {
            const curr = queue.shift();
            const key = `${curr.x},${curr.y}`;
            if (visited.has(key)) continue;
            visited.add(key);

            const vinfo = gVoxelTar.GetVInfo(curr);
            if (!PGRWTargetList.includes(vinfo)) continue;

            roll.mData.Push({ index: curr.Export(), VInfo: vinfo });
            gVoxelTar.Bonds(curr, PGRWTile_num);
            steps++;

            for (const dir of directions) {
                const dist = (Math.random() * 100 < spikeChance) ? 3 : 1;
                const nx = curr.x + dir.dx * dist;
                const ny = curr.y + dir.dy * dist;

                if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

                const nextIndex = new CCIndex(nx, ny, 0);
                const nextKey = `${nx},${ny}`;
                if (visited.has(nextKey)) continue;

                const nVal = CUtilMath.Noise(nx * 0.1 + seed, ny * 0.1 + seed);
                const chance = nVal * 0.8 + 0.2;

                if (Math.random() < chance) {
                    queue.push(nextIndex);
                }
            }
        }

        CRollBack.Push(roll);
    };
    Map_div.append(CDomFactory.DataToDom(`
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">
                    <button class="btn btn-link" type="button" data-bs-toggle="collapse"
                        data-bs-target="#collapseFractal" aria-expanded="false" aria-controls="collapseFractal">
                        Fractal
                    </button>
                </h5>
            </div>
            <div id="collapseFractal" class="collapse">
                <div class="card-body p-1">
                    <div class="mb-2">
                        <button type="button" class="btn btn-warning w-100" id="FractalCreate_btn">프렉탈 생성</button>
                    </div>
                    
                    <div class="mb-2">
                        <label class="form-label">시드 위치 퍼센트(X,Y)</label>
                        <input type="range" class="form-range" id="FractalSeedX" min="0" max="1" step="0.01" value="0.5">
                        <input type="range" class="form-range" id="FractalSeedY" min="0" max="1" step="0.01" value="0.5">
                    </div>
                    <div class="mb-2">
                        <label class="form-label">프렉탈 길이</label>
                        <input type="number" class="form-control" id="FractalLen_num" value="5">
                    </div>
                    <div class="mb-2">
                        <label class="form-label">프렉탈 감쇠</label>
                        <input type="number" class="form-control" id="FractalGrowth_num" min="0" max="1" value="0.5" step='0.01' >
                    </div>

                    <div class="mb-2">
                        <label class="form-label">프렉탈 각도</label>
                        <input type="number" class="form-control" id="FractalAngle_num" min="0" max="360" value="30"  >
                    </div>
                    <div class="mb-2">
                        <label class="form-label">프렉탈 시작 각도</label>
                        <input type="number" class="form-control" id="FractalStartAngle_num" min="0" max="360" value="0"  >
                    </div>
                    <div class="input-group mb-2">
                        <span class="input-group-text">Tile</span>
                        <input type="number" class="form-control" id="FractalTile_num" value="3">
                    </div>
                    <div class="mb-2">
                        <label class="form-label">적용 대상 VInfo (쉼표로 구분)</label>
                        <input type="text" class="form-control form-control-sm" id="FractalTarget" value="1">
                    </div>
                </div>
            </div>
        </div>
    `));
  // 1) drawLine: (x0,y0) → (x1,y1) 구간의 모든 셀에 Bonds
    function drawLine(
        x0: number, y0: number,
        x1: number, y1: number,
        tileNum: number,
        roll: CRollBackInfo
    ) {
        let fx = x0;
        let fy = y0;

        const dx = x1 - x0;
        const dy = y1 - y0;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len === 0) return;

        const stepX = dx / len;
        const stepY = dy / len;

        for (let i = 0; i <= len; i++) {
            const ix = Math.round(fx);
            const iy = Math.round(fy);
            const key = new CCIndex(ix, iy, 0);
            const oldVal = gVoxelTar.GetVInfo(key);
            if(tileNum!=oldVal)
                roll.mData.Push({ index: key.Export(), VInfo: oldVal });
            gVoxelTar.Bonds(key, tileNum);

            fx += stepX;
            fy += stepY;
        }
    }

    // 2) branch: Java 예제과 동일한 로직
    function branch(
    startX: number, startY: number,
    degree: number, length: number,
    rotate: number, growth: number,
    tileNum: number,
    roll: CRollBackInfo
    ) {
    if (length > 1) {
        // 끝점 계산
        const rad    = degree * Math.PI / 180;
        const endX   = Math.round(startX - length * Math.cos(rad));
        const endY   = Math.round(startY - length * Math.sin(rad));
        // 선 그리기
        drawLine(startX, startY, endX, endY, tileNum, roll);
        // 다음 분기 길이
        const nextLen = Math.floor(length * growth);
        // 좌/우 분기
        branch(endX, endY, degree - rotate, nextLen, rotate, growth, tileNum, roll);
        branch(endX, endY, degree + rotate, nextLen, rotate, growth, tileNum, roll);
    }
    }

    // 3) 클릭 핸들러
    CUtil.ID("FractalCreate_btn").onclick = () => {
        const W        = gVoxelTar.mCount.x;
        const H        = gVoxelTar.mCount.y;
        const FractalLen_num  = Number(CUtil.IDValue("FractalLen_num"));
        const FractalGrowth_num  = Number(CUtil.IDValue("FractalGrowth_num"));
        const FractalAngle_num  = Number(CUtil.IDValue("FractalAngle_num"));
        const FractalStartAngle_num  = Number(CUtil.IDValue("FractalStartAngle_num"));



        const tileNum  = Number(CUtil.IDValue("FractalTile_num"));      // 채울 Tile
        const targetList = CUtil.IDValue("FractalTarget")
            .split(",").map(v => Number(v.trim())).filter(v => !isNaN(v));
        const seedX    = Math.floor(W * parseFloat(CUtil.IDValue("FractalSeedX")));
        const seedY    = Math.floor(H * parseFloat(CUtil.IDValue("FractalSeedY")));

        if (!gVoxelTar.m2D) {
            CAlert.E("2D 모드에서만 지원됩니다.");
            return;
        }

    

        // 롤백 준비
        const roll = new CRollBackInfo("Voxel", new CArray());
        

        // 시드 칠하기
        // const seedIdx = new CCIndex(seedX, seedY, 0);
        // roll.mData.Push({ index: seedIdx.Export(), VInfo: gVoxelTar.GetVInfo(seedIdx) });
        // gVoxelTar.Bonds(seedIdx, tileNum);

        // 재귀 분기로 프렉탈 그리기
        branch(seedX, seedY, FractalStartAngle_num, FractalLen_num, FractalAngle_num, FractalGrowth_num, tileNum, roll);
        CRollBack.Push(roll);
    };
    //===================================================================================
    Map_div.append(CDomFactory.DataToDom(`
<div class="card">
    <div class="card-header" id="headingCityBlock">
        <h5 class="mb-0">
            <button class="btn btn-link" type="button" data-bs-toggle="collapse"
                data-bs-target="#collapseCityBlock" aria-expanded="false" aria-controls="collapseCityBlock">
                도시 구역 + 길 생성
            </button>
        </h5>
    </div>
    <div id="collapseCityBlock" class="collapse" aria-labelledby="headingCityBlock">
        <div class="card-body p-1">
            <div class="input-group mb-2">
                <span class="input-group-text">길 타일 번호</span>
                <input type="number" class="form-control" id="CityRoadTile_num" value="3">
            </div>
            <div class="row mb-2">
                <div class="col">
                    <label class="form-label">Start X</label>
                    <input type="number" class="form-control form-control-sm" id="CityStartX" value="0">
                </div>
                <div class="col">
                    <label class="form-label">Start Y</label>
                    <input type="number" class="form-control form-control-sm" id="CityStartY" value="0">
                </div>
            </div>
            <div class="row mb-2">
                <div class="col">
                    <label class="form-label">End X</label>
                    <input type="number" class="form-control form-control-sm" id="CityEndX" value="${gVoxelTar?.mCount.x ?? 32}">
                </div>
                <div class="col">
                    <label class="form-label">End Y</label>
                    <input type="number" class="form-control form-control-sm" id="CityEndY" value="${gVoxelTar?.mCount.y ?? 32}">
                </div>
            </div>

            <label class="form-label mt-2 mb-1">최소 블록 크기</label>
            <input type="range" class="form-range" id="CityMinSize" min="2" max="20" value="6">
            <div class="text-end small mb-2"><span id="CityMinSize_val">6</span></div>

            <label class="form-label mt-2 mb-1">분할 횟수</label>
            <input type="range" class="form-range" id="CitySplitCount" min="1" max="50" value="1">
            <div class="text-end small mb-2"><span id="CitySplitCount_val">1</span></div>

            <label class="form-label mt-2 mb-1">분할 확률 (%)</label>
            <input type="range" class="form-range" id="CitySplitChance" min="0" max="100" value="50">
            <div class="text-end small mb-2"><span id="CitySplitChance_val">50</span>%</div>

            <button type="button" class="btn btn-primary w-100 mt-2" id="CityBlockRoad_btn">도시 길 생성</button>
        </div>
    </div>
</div>
`));
CUtil.ID("CityBlockRoad_btn").onclick = () => {
    const roadTile = Number(CUtil.IDValue("CityRoadTile_num"));
    const sx = Number(CUtil.IDValue("CityStartX"));
    const sy = Number(CUtil.IDValue("CityStartY"));
    const ex = Number(CUtil.IDValue("CityEndX"));
    const ey = Number(CUtil.IDValue("CityEndY"));
    const minSize = Number(CUtil.IDValue("CityMinSize"));
    const splitCount = Number(CUtil.IDValue("CitySplitCount"));

    if (!gVoxelTar.m2D) {
        CAlert.E("2D에서만 지원됩니다.");
        return;
    }

    const blocks = [{ x: sx, y: sy, w: ex - sx, h: ey - sy }];
    const roll = new CRollBackInfo("Voxel", new CArray());

    for (let i = 0; i < splitCount; i++) {
        const idx = Math.floor(Math.random() * blocks.length);
        const b = blocks[idx];
        const vertical = Math.random() < 0.5;

        if (vertical && b.w > minSize * 2) {
            const sw = minSize + Math.floor(Math.random() * (b.w - minSize * 2));
            blocks.splice(idx, 1,
                { x: b.x, y: b.y, w: sw, h: b.h },
                { x: b.x + sw, y: b.y, w: b.w - sw, h: b.h });
        } else if (!vertical && b.h > minSize * 2) {
            const sh = minSize + Math.floor(Math.random() * (b.h - minSize * 2));
            blocks.splice(idx, 1,
                { x: b.x, y: b.y, w: b.w, h: sh },
                { x: b.x, y: b.y + sh, w: b.w, h: b.h - sh });
        }
    }

    // 중심 연결 (순차 L자)
    const centers = blocks.map(b => ({
        x: Math.floor(b.x + b.w / 2),
        y: Math.floor(b.y + b.h / 2)
    }));

    for (let i = 0; i < centers.length - 1; i++) {
        const a = centers[i];
        const b = centers[i + 1];
        drawLine(a.x, a.y, b.x, a.y, roadTile, roll); // 수평
        drawLine(b.x, a.y, b.x, b.y, roadTile, roll); // 수직
    }

    CRollBack.Push(roll);
};

}
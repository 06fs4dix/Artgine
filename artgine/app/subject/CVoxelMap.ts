import {CArray} from "../../basic/CArray.js";
import {CJSON} from "../../basic/CJSON.js";
import {CModal} from "../../basic/CModal.js";
import {CQueue} from "../../basic/CQueue.js";
import {CUniqueID} from "../../basic/CUniqueID.js";
import {CBound} from "../../geometry/CBound.js";
import {CMath} from "../../geometry/CMath.js";

import { COctreeMgr } from "../../geometry/COctree.js";
import {CRay} from "../../geometry/CRay.js";
import {CVec2} from "../../geometry/CVec2.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CVec4} from "../../geometry/CVec4.js";
import {CRenderPass} from "../../render/CRenderPass.js";
import {CAtlas} from "../../util/CAtlas.js";
import { CDOM } from "../../basic/CDOM.js";

import {CCollider} from "../component/CCollider.js";
import { CGeometryInfo } from "../component/CGeometryComp.js";
import { CPaintVoxel, CVoxPlane } from "../component/paint/CPaintVoxel.js";
import {CSubjectMap} from "./CSubjectMap.js";
import { CComponent } from "../component/CComponent.js";
  
import { CBlackBoardRef, CObject, CPointer } from "../../basic/CObject.js";

import { CUtilObj } from "../../basic/CUtilObj.js";
import { CUtil } from "../../basic/CUtil.js";
import { CClass } from "../../basic/CClass.js";

import { CFrame } from "../../util/CFrame.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";
import { CUtilMath } from "../../geometry/CUtilMath.js";
import { CAlert } from "../../basic/CAlert.js";

import { CShaderAttr } from "../../render/CShaderAttr.js";
import { CVec1 } from "../../geometry/CVec1.js";


import { CMat } from "../../geometry/CMat.js";
import { CUpdate } from "../../basic/Basic.js";
import { CCIndex } from "../canvas/CCIndex.js";
import { CMapBuf, IMapLabel, IMapSchema } from "./CMapBuf.js";






export class CCIndexPick extends CCIndex
{
	pick=CCIndex.eDir.Null;
	PickMove()
	{
		switch(this.pick)
		{
			case CCIndex.eDir.Front:	this.z+=1;	break;
			case CCIndex.eDir.Back:	this.z-=1;	break;
			case CCIndex.eDir.Up:	this.y+=1;	break;
			case CCIndex.eDir.Down:	this.y-=1;	break;
			case CCIndex.eDir.Left:	this.x-=1;	break;
			case CCIndex.eDir.Right:	this.x+=1;	break;
		}
		this.pick=CCIndex.eDir.Null;
	}
}





/*
기존 복셀 위치 정보
복셀 16*16*16이여야 한다
최대 셀은 64*16*64 넘을수 없다
*/
// export class CVoxelLightSpace
// {
// 	mVoxelList=new Array<CVoxel2>();
// 	mIMap : Uint32Array;
	
// 	constructor()
// 	{
// 		this.mIMap=new Uint32Array(64*16*16*16*64*16);
// 		this.mIMap.fill(0xffffffff);
// 	}
	

// 	//풀어쓴 인덱스임
// 	AttachVoxel(_stIndex : CCIndex,_voxel : CVoxel2)
// 	{
		
// 	}
// 	ST(_offset : number,_sun : boolean,_val : number)
// 	{
// 		let indexData = this.mIMap[_offset];
// 		if(indexData==0xffffffff)	return null;

// 		let cellIndex = indexData >>> 16;   // 상위 16비트 (cellIndex)
//     	let localIndex = indexData & 0xFFFF; // 하위 16비트 (localIndex)

// 		if(_sun)
// 		{
// 			this.mVoxelList[cellIndex].mTexInfo[localIndex]=CVoxel.SSun(this.mVoxelList[cellIndex].mTexInfo[localIndex],_val);
// 		}
// 		else
// 		{
// 			this.mVoxelList[cellIndex].mTexInfo[localIndex]=CVoxel.STorch(this.mVoxelList[cellIndex].mTexInfo[localIndex],_val);
// 		}
// 	}
// 	ITO(_index : CCIndex)
// 	{
// 		return _index.x + _index.y * 1024 + _index.z * 262144;
// 	}
// 	OTI(_offset : number,_index=new CCIndex())
// 	{
		
// 		_index.z = Math.floor(_offset / 262144);
// 		_index.y = Math.floor((_offset % 262144) / 1024);
// 		_index.x = _offset % 1024;
// 		return _index;
// 	}
// 	GT(_offset : number)
// 	{
// 		let indexData = this.mIMap[_offset];
// 		if(indexData==0xffffffff)	return null;

// 		let cellIndex = indexData >>> 16;   // 상위 16비트 (cellIndex)
//     	let localIndex = indexData & 0xFFFF; // 하위 16비트 (localIndex)
		
// 		return this.mVoxelList[cellIndex].mTexInfo[localIndex];
// 	}
// 	GV(_offset : number)
// 	{
// 		let indexData = this.mIMap[_offset];
// 		if(indexData==0xffffffff)	return null;

// 		let cellIndex = indexData >>> 16;   // 상위 16비트 (cellIndex)
//     	let localIndex = indexData & 0xFFFF; // 하위 16비트 (localIndex)
		
// 		return this.mVoxelList[cellIndex].mVInfo[localIndex];
// 	}
// 	Sun(_index : CCIndex)
// 	{
		

// 	}
	
// 	RFloodFill(_list : Array<CCIndex>,_maxLight : number,_sun : boolean,_blockSet : Set<number>,_step : Set<number>,_lightArr : Array<CCIndex>,
// 		_dist : number,_zeroSet : Set<number>
// 	)
// 	{
		
// 	}
// 	FloodFill(_list : Array<CCIndex>,_maxLight : number,_sun : boolean,_blockSet : Set<number>,_step : Set<number>,_first)
// 	{
		
// 	}
// 	TorchCreate(_index : CCIndex)
// 	{
		
// 	}
// 	TorchRemove(_index : CCIndex)
// 	{
		
// 	}
// 	BlockSetUpdate(_blockSet : Set<number>)
// 	{
		
// 	}

	
// }









export class CVTile extends CObject implements IMapLabel
{
	mLabel="";
	mColliderLayer : string = "";
	mColor : number=0;
	mAtlas : number=0;
	//true면 빛이 통과한다(물, 유리 등). 기본 타일은 불투명
	mLightPass : boolean=false;
	//mPattern=new Array<CVTileSurface>();
	
	constructor(_color : number,_atlas : number,_collider : string="",_label : string="")
    {
        super();
        if(_color == null || _color <= 0) {
            const r = Math.floor(Math.random() * 256);
            const g = Math.floor(Math.random() * 256);
            const b = Math.floor(Math.random() * 256);
            this.mColor = ((r << 24) | (g << 16) | (b << 8) | 0x00) >>> 0;
        } else {
            this.mColor = (_color & 0xFFFFFF00) >>> 0;
        }
        this.mAtlas=_atlas;
        this.mColliderLayer=_collider;
        this.mLabel=_label;
    }
	Label(): string {
		return this.mLabel;
	}
	Color(): number {
		return this.mColor;
	}
	Size() : CVec3
	{
		return null;
	}

	override EditForm(_pointer: CPointer, _div: HTMLDivElement, _input: HTMLInputElement): void {
		super.EditForm(_pointer, _div, _input);
		if(_pointer.member == "mCollider") {
			let textArr = [], valArr = [];
			for(let [text, val] of Object.entries(CCollider.eEvent)) {
				textArr.push(text);
				valArr.push(val);
			}
			_div.append(CUtilObj.Select(_pointer, _input, textArr, valArr));
		}
	}
}

class CVTillPattern extends CObject
{
	mColor : number=0;
	mRate : number=1;
}
//타일룰이 없거나, 있으면 or 조건으로 타일룰이 맞으면 작동
export class CVTileRole extends CObject
{
	mLabel="";
	mRole : Array<number>;//0비어있음 -1조건 없음 n선택
	mPattern=new Array<CVTillPattern>();
	constructor()
	{
		super();
		this.mRole=[
			16383,16383,16383,16383,16383,16383,16383,16383,16383
		];
	}
	override EditForm(_pointer : CPointer,_body : HTMLDivElement,_input : HTMLElement): void 
	{
		super.EditForm(_pointer,_body,_input);
		if(_pointer.member=="mPattern")
		{
			CUtilObj.ArrayAddSelectList(_pointer,_body,_input,[new CVTillPattern]);
		}	
	}
	GetTile()
	{
		let sum=0;
		for(let i=0;i<this.mPattern.length;++i)
		{
			sum+=this.mPattern[i].mRate;
		}

		let ran=Math.random()*sum;
		for(let i=0;i<this.mPattern.length;++i)
		{
			ran-=this.mPattern[i].mRate;
			if(ran<0)
			{
				return this.mPattern[i].mColor;
			}
		}

		return 0;
	}
}

export class CVTileMold extends CObject
{
	mLabel="";
	mSize :  CVec3;
	mColorArr : Array<number>;

	constructor(_width : number = 1, _height : number = 1) {
		super();
		this.mSize=new CVec3(1,1,1);
		
		this.mColorArr = new Array(this.mSize.x * this.mSize.y*this.mSize.z);
		this.mColorArr.fill(0);
		
		
	}
}

export class CVoxelMap extends CSubjectMap implements IMapSchema
{
	// static eColliderEvent={
	// 	Null:0,
	// 	Collision:1,
	// 	Trigger:2,
	// };
	mToolMode=false;
    mAtlas : CAtlas=new CAtlas("Voxel/");
	//둘 다 있어야 쓴다(텍스처 3개: 색 0, 노말 1, 재질 2). 색 아틀라스와 같은 크기·순서로 만들어 UV가 같아야 한다
	mAtlasNormal : CAtlas=null;
	mAtlasMaterial : CAtlas=null;
	//AO, 거칠기, 금속, 발광(CPaint.mMaterial과 같다). -1이면 재질 아틀라스에서 읽는다
	mMaterial=new CVec4(1,-1,-1,0);


	mBuf : CMapBuf=new CMapBuf();
	//mColliderEvent =new Array();
	//mTileArr =new Array<CVTile2>();
	mTileMap =new Map<number,CVTile>();
	mTileRoleArr =new Array<CVTileRole>();
	mTileMoldArr = new Array<CVTileMold>();
    //mPaint : CPaintVoxel=null;
	declare mPaintArr : Array<CPaintVoxel>;
	mDiv=16;
    //PlaneRefresh가 한 칸의 6면을 계산해 두는 임시 버퍼. 칸 전체를 들고 있지 않는다
    mPlane : Array<CVoxPlane>=new Array<CVoxPlane>();
    //칸×6+방향 -> 청크 페인트의 면 슬롯 번호. 보이지 않는 면은 -1
    mFaceSlot : Int32Array=null;
    //mCount=new CVec3();
    //mSize=0;
	mUpdateRes=true;
	mUpdateModify=new Set<CCIndex>();
	//true면 칸별 하늘빛/블록빛(0~15)을 계산해 면 정점 광량(CVoxPlane.mLight)으로 넣는다
	mLight=false;
	mSkyLight : Uint8Array=null;
	mTorchLight : Uint8Array=null;
	//블록빛 광원. 칸 오프셋 -> 시작 밝기. 광원 칸은 빛이 통과하는 빈 칸이어야 한다
	mTorchSrc=new Map<number,number>();
	mTag=["shadow","light"];
	static SunValue=1.0;
	static LightMax=15;
	//빛이 0인 칸의 최소 밝기
	static LightMin=0.1;
	//빛이 한 칸 약해질 때마다 곱하는 비율
	static LightFalloff=0.8;
	
	mLayer =new Array<CBlackBoardRef<CVoxelMap>>();
	override IsShould(_member: string, _type: CObject.eShould) 
	{

		if(_member=="mComArr" && _type==CObject.eShould.Editer)	return true;

		if(_member=="mPaint" || _member=="mUpdateRes" || _member=="mPlane" || _member=="mComArr")	return false;
		if(_member=="mSkyLight" || _member=="mTorchLight" || _member=="mTorchSrc" || _member=="mFaceSlot")	return false;

		return super.IsShould(_member,_type);
	}
    constructor()
    {
        super();
		this.ResetInfo(new CVec3(8,8,8),100);
		if(CUtil.IsNode()==false)
			this.mAtlas.Push("test.png",CUtil.Base64ToArray("iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABuSURBVDhPlY9RDoAwCEM9iJ/e/2aeARmtZGEw8aU/0r7EHfITCvd5IficCdUQ/DQXYK0SQWPj/J4LVSg0HSwpKKEO4WgWlDDysDa+BXYvrV/iwug+GjNlCKGrshOqo5IIKJT0Ht+AT2e9U+gi8gD5Qf9Q2ZUDNwAAAABJRU5ErkJggg=="));
		//this.mColliderEvent.fill(0);
		//this.m_colliderType=new Array(256);

    }
	MapLog(): string {
		let json={};
		json["countX"]=this.mBuf.mCount.x;
		json["countY"]=this.mBuf.mCount.y;
		json["countZ"]=this.mBuf.mCount.z;
		json["size"]=this.mBuf.mSize;

		json["labelArr"]=new Array();

		// let test=CColor.HexToRGB(this.mTileMap.get(65280).Color(),true);
		// CConsol.Log(test.ToHex())

		let size=new CVec3(this.mBuf.mSize,this.mBuf.mSize,this.mBuf.mSize);
		for(let tile of this.mTileMap.values())
		{
			json["labelArr"].push({"label":tile.Label(),"color":CColor.HexToRGB(tile.Color(),true).ToHex(),"sizeX":size.x,"sizeY":size.y,"sizeZ":size.z});
		}

		return JSON.stringify(json);
	}
	PushTile(_tile : CVTile)
	{
		this.mTileMap.set(_tile.mColor,_tile);
	}
	ResetInfo(_count : CVec3,_size : number)
	{

		this.mPlane.length=0;
		this.mComArr.length=0;
		this.mComEnableArr.length=0;
		this.mPaintArr.length=0;
		this.mPTArr=null;
		
		this.mBuf.Reset(_count,_size);
		this.mFaceSlot=null;
		this.mSkyLight=null;
		this.mTorchLight=null;
		this.mTorchSrc.clear();

		this.mUpdateRes=true;

		if(_count.z==1 && this.mPos.z==0)
		{
			let pos=this.mPos.Export();
			pos.z=-101;
			this.SetPos(pos);
		}
		
		
	}
	
	RefreshModify()
	{
		for(let m of this.mUpdateModify)
		{
			//Bonds가 이웃 칸을 범위 검사 없이 넣는다. 맵 밖 칸은 오프셋이 다른 칸과 겹치므로 건너뛴다
			if(this.IndexOut(m))	continue;
			this.PlaneRefresh(m);
			this.PlaneApply(m);
		}
		this.mUpdateModify.clear();
	}
	//_index 칸 하나의 6면을 mPlane[0~5] 임시 버퍼에 계산한다
	PlaneRefresh(_index : CCIndex)
	{
		
	}
	//PlaneRefresh가 계산한 임시 면을 청크 페인트의 슬롯에 반영한다. 가려진 면은 슬롯을 비우고, 드러난 면은 슬롯을 받는다
	PlaneApply(_index : CCIndex)
	{
		
	}
	IndexOut(_index)
	{
		if(_index.x<0 || _index.x>=this.mBuf.mCount.x || _index.y<0 || _index.y>=this.mBuf.mCount.y || _index.z<0 || _index.z>=this.mBuf.mCount.z)	return true;
		return false;
	}
	IsBlock(_cim : CCIndex,_add : CCIndex)
    {
        let x=_cim.x+_add.x;
		let y=_cim.y+_add.y;
		let z=_cim.z+_add.z;
        if(x<0 || x>=this.mBuf.mCount.x || y<0 || y>=this.mBuf.mCount.y || 
			z<0 || z>=this.mBuf.mCount.z)
            return false;

        return this.mBuf.RGB(x+this.mBuf.mCount.x*y+this.mBuf.mCount.x*this.mBuf.mCount.y*z)!=0;
    }
	GetTexCodi(_color : number,_texCodi : CVec4)
	{
		let tile = this.mTileMap.get(_color);//this.mTileArr.find(t => t.mColor == _color);
		if(tile==null)
			this.mAtlas.GetUV(0,_texCodi);
		else
			this.mAtlas.GetUV(tile.mAtlas,_texCodi);
	}
	//면이 바라보는 이웃 칸의 하늘빛/블록빛을 정점 광량으로 돌려준다. x=하늘빛, y=블록빛 (0~1)
	GetLight(_index : CCIndex,_dir : CCIndex,_light : CVec2)
	{
		_light.x=1.0;
		_light.y=0.0;
		if(this.mLight==false || this.mSkyLight==null)	return;

		const c=this.mBuf.mCount;
		const x=_index.x+_dir.x;
		const y=_index.y+_dir.y;
		const z=_index.z+_dir.z;
		let sky=CVoxelMap.LightMax;
		let torch=0;
		if(x>=0 && x<c.x && y>=0 && y<c.y && z>=0 && z<c.z)
		{
			const off=x+y*c.x+z*c.x*c.y;
			sky=this.mSkyLight[off];
			torch=this.mTorchLight[off];
		}
		_light.x=CVoxelMap.LightMin+(1-CVoxelMap.LightMin)*Math.pow(CVoxelMap.LightFalloff,CVoxelMap.LightMax-sky);
		_light.y=torch>0 ? Math.pow(CVoxelMap.LightFalloff,CVoxelMap.LightMax-torch) : 0;
	}
	//mLight 맵의 하늘빛/블록빛을 전체 다시 계산한다. RefreshRes가 버퍼가 없을 때 자동 호출한다
	LightBuild()	{}
	//_index 주변 칸의 빛을 다시 계산하고 면이 바뀐 칸을 mUpdateModify에 넣는다
	LightUpdate(_index : CCIndex)	{}
	TorchPush(_index : CCIndex,_level : number=14)
	{
		this.mTorchSrc.set(_index.Offset(this.mBuf.mCount),_level);
		this.LightUpdate(_index);
	}
	TorchRemove(_index : CCIndex)
	{
		this.mTorchSrc.delete(_index.Offset(this.mBuf.mCount));
		this.LightUpdate(_index);
	}
    RefreshRes()
    {

		
    }
	override Update(_update : CUpdate): void {
		
		// if(this.mAtlas.mBase64.mData == null) {
		// 	return;
		// }

		if(this.mUpdateRes)
			this.ColWake();
		if(this.mUpdateRes)
			this.RefreshRes();
		if(this.mUpdateModify.size>0)
			this.RefreshModify();

		super.Update(_update);
	}
	//페인트·콜라이더 배열은 청크 번호·셀 번호로 직접 접근한다(RefreshRes, PlaneRefresh가 칸을 정해 넣는다)
	protected override PushMapComp(_com : CComponent)	{}
	PickBox(_ray : CRay) : CCIndexPick
	{
		
		return null;
	}
	Bonds(_index : CCIndex,_data : number)
	{
		
		if(this.IndexOut(_index))	return;

		//아래에서 _index를 옮기므로 라이트 갱신용 위치는 미리 복사해 둔다
		const lightIndex=_index.Export();
		this.mBuf.RGB(_index,_data);
		if(_data==0)
		{
			this.mBuf.RGB(_index,0);
			
			this.mUpdateModify.add(_index.Export());
			if(this.mBuf.mCount.z!=1)
			{
				_index.Add(1,0,0);
				this.mUpdateModify.add(_index.Export());
				_index.Add(-2,0,0);
				this.mUpdateModify.add(_index.Export());
				_index.Add(1,1,0);
				this.mUpdateModify.add(_index.Export());
				_index.Add(0,-2,0);
				this.mUpdateModify.add(_index.Export());
				_index.Add(0,1,1);
				this.mUpdateModify.add(_index.Export());
				_index.Add(0,0,-2);
				this.mUpdateModify.add(_index.Export());
			}
			
			//this.m_updateRes=true;
			this.LightUpdate(lightIndex);
			return;
		}
		let select = this.mTileMap.get(_data);
		if(select==null)
		{
			CAlert.E("select가 없음");
			return;
		}
		
		this.mUpdateModify.add(_index.Export());

		//룰검사
		//중심 기준으로 9개 패턴이 동일하면 덮어쓰기
		this.RoleChk(_index);
		this.LightUpdate(lightIndex);
	}
	RoleChk(_index : CCIndex)
	{
		let data=[16383,16383,16383,16383,16383,16383,16383,16383,16383];
		let ix=new CCIndex();
		let mo=0;
		if(this.mBuf.mCount.z==1)
		{
			for(var y=_index.y+1;y>=_index.y-1;--y)
			{
				for(var x=_index.x-1;x<=_index.x+1;++x)	
				{
					ix.x=x;ix.y=y;ix.z=0;
					if(ix.x<0 || ix.x>=this.mBuf.mCount.x || ix.y<0 || ix.y>=this.mBuf.mCount.y || ix.z<0 || ix.z>=this.mBuf.mCount.z){mo++;continue;}	
					let off=ix.Offset(this.mBuf.mCount);
					data[mo]=this.mBuf.RGB(off);
					mo++;
				}	
			}
		}
		else
		{
			//for(var x=_index.x-1;x<=_index.x+1;++x)	
			for(var x=_index.x+1;x>=_index.x-1;--x)	
			{
				//for(var z=_index.z+1;z>=_index.z-1;--z)	
				for(var z=_index.z-1;z<=_index.z+1;++z)	
				{
					ix.x=x;ix.y=_index.y;ix.z=z;
					if(ix.x<0 || ix.x>=this.mBuf.mCount.x || ix.y<0 || ix.y>=this.mBuf.mCount.y || ix.z<0 || ix.z>=this.mBuf.mCount.z){mo++;continue;}	
					let off=ix.Offset(this.mBuf.mCount);
					data[mo]=this.mBuf.RGB(off);
					mo++;
				}	
			}
			
		}
		
		for(let j=0;j<this.mTileRoleArr.length;++j)
		{
	
			let modify=true;
			for(let i=0;i<9;++i)
			{
				if(this.mTileRoleArr[j].mRole[i]==16383 || data[i]==16383) continue;
				else if(data[i]!=this.mTileRoleArr[j].mRole[i]) modify=false;

			}
			if(modify)
			{
				let role=this.mTileRoleArr[j];
				let off=_index.Offset(this.mBuf.mCount);
				this.mBuf.RGB(off,role.GetTile());

				break;
			}
		}

		
	}
	

	override EditHTMLInit(_div: HTMLDivElement): void {
		super.EditHTMLInit(_div);
		var button=document.createElement("button");
		button.innerText="VoxelTool";
		button.onclick=()=>{
			window["VoxelTool"](this);
			
		};
		_div.append(button);

		var button=document.createElement("button");
		button.innerText="BufferTool";
		button.onclick=()=>{
			window["BufferTool"](this.mBuf.GetBuf(),this.mBuf.mCount,Array.from(this.mTileMap.values()),null,false,true).then(()=>{

				this.mPlane.length=0;
				this.mComArr.length=0;
				this.mComEnableArr.length=0;
				this.mPaintArr.length=0;
				this.mPTArr=null;

				this.mUpdateRes=true;
				//this.RemoveComps(CPaint2DMerge);
			});
		};
		_div.append(button);
	}
	override SetPos(_pos : CVec3,_reset=true)
	{
		super.SetPos(_pos,_reset);
		this.RemoveComps(CPaintVoxel);
		this.RemoveComps(CCollider);
		
	}

	// public override Export(_copy?: boolean, _resetKey?: boolean): this 
	// {
	// 	var copy=super.Export(_copy,_resetKey);
	// 	copy.DetachComp(CPaintVoxel);
	// 	copy.DetachComp(CCollider);
	// 	copy.DetachComp(CNavigation);
	// 	// copy.ResetOctree();
	// 	return copy;
	// }
	// override Import(_target : CObject)
	// {
	// 	super.Import(_target);
	// }
	// override Import(_target : CObject)
	// {
	// 	this.ResetInfo((_target as this).mBuf.mCount,(_target as this).mBuf.mSize);

	// 	let dfw=this.mFrame;
	// 	let dkey=this.mKey;
	// 	super.Import(_target);
	// 	this.DetachComp(CPaintVoxel);
	// 	this.DetachComp(CCollider);
	// 	this.DetachComp(CNavigation);
	// 	this.mFrame=dfw;
	// 	this.mKey=dkey;

	// }
	// public override ExportJSON(): { class: string; } {
	// 	let ptVoxel = this.DetachComp(CPaintVoxel);
	// 	let col = this.DetachComp(CCollider);
	// 	let navi = this.DetachComp(CNavigation);
	// 	let json = super.ExportJSON();
	// 	if(ptVoxel) this.PushComp(ptVoxel);
	// 	if(col) this.PushComp(col);
	// 	if(navi) this.PushComp(navi);
	// 	return json;
	// }

	// override ImportCJSON(_json: CJSON) 
	// {
	// 	this.mAtlas=new CAtlas();
	
	// 	let result = super.ImportCJSON(_json);



	// 	this.mUpdateRes=true;
	// 	this.mUpdateModify=new Set<CCIndex>();
		
	// 	return result;
	// }
	static Sun=5;
	static Torch=10;
	// 25~27비트 값 추출 
	static GSun(_texInfo: number) {
		return (_texInfo >>> 25) & 0b111;
	}

	// 28~31비트 값 추출 
	static GTorch(_texInfo: number) {
		return (_texInfo >>> 28) & 0b1111; // 4비트 추출
	}

	// 25~27비트에 _val 값을 설정 
	static SSun(_texInfo: number, _val: number) {
		_texInfo &= ~(0b111 << 25); // 기존 25~27비트 클리어
		_texInfo |= (_val << 25); // 새로운 값 설정
		return _texInfo;
	}

	// 28~31비트에 _val 값을 설정 
	static STorch(_texInfo: number, _val: number) {
		_texInfo &= ~(0b1111 << 28); // 기존 28~31비트 클리어
		_texInfo |= (_val << 28); // 새로운 값 설정
		return _texInfo;
	}
}

import CVoxel_imple from "../../app_imple/subject/CVoxelMap.js";
import { CColor } from "../../render/CColor.js";
import { CConsol } from "../../basic/CConsol.js";
CVoxel_imple();
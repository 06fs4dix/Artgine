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
import { CPaintVoxel, CVoxPlane } from "../component/paint/CPaintVoxel.js";
import {CSubject} from "./CSubject.js";
  
import { CBlackBoardRef, CObject, CPointer } from "../../basic/CObject.js";

import { CUtilObj } from "../../basic/CUtilObj.js";
import { CUtil } from "../../basic/CUtil.js";
import { CClass } from "../../basic/CClass.js";
import {CNavigation} from "../component/CNavigation.js";
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




// export class  CColliderVoxel extends CCollider
// {
// 	constructor(_voxel : CVoxelMap)
// 	{
// 		super();
// 		if(_voxel==null)	return;

// 		this.mVoxel=_voxel;

		
//         this.mBound.mMax.x=this.mVoxel.mBuf.mSize*this.mVoxel.mBuf.mCount.x;
// 		this.mBound.mMax.y=this.mVoxel.mBuf.mSize*this.mVoxel.mBuf.mCount.y;
// 		this.mBound.mMax.z=this.mVoxel.mBuf.mSize*this.mVoxel.mBuf.mCount.z;
//         this.mBound.mMin.Zero();
// 		this.mBound.mType=CBound.eType.Voxel;
// 	}
// 	mVoxel : CVoxelMap;
// 	mResults=new CArray<CCIndex>();
// 	mBoundDummy=new CBound();
// 	override IsShould(_member: string, _type: CObject.eShould) 
// 	{
// 		if(_member=="mVoxel" || _member=="mResults" || _member=="mBoundDummy" )
// 			return false;
			
// 		return super.IsShould(_member,_type);
// 	}
// 	override CollisionChk(_tar : CCollider,_colTarget : CArray<CCollider>,_colPush : CArray<CVec3>) : boolean
//     {
// 		return false;
//     }
// }

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
	//mPattern=new Array<CVTileSurface>();
	
	constructor(_color : number,_atlas : number,_collider : string="",_label : string="")
	{
		super();
		this.mColor=_color;
		this.mAtlas=_atlas;
		this.mColliderLayer=_collider;
		this.mLabel=_label;
		//this.mKey=CUniqueID.GetHash();
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

export class CVoxelMap extends CSubject implements IMapSchema
{
	// static eColliderEvent={
	// 	Null:0,
	// 	Collision:1,
	// 	Trigger:2,
	// };
    mAtlas : CAtlas=new CAtlas("Voxel/");
    
	
	mBuf : CMapBuf=new CMapBuf();
	//mColliderEvent =new Array();
	//mTileArr =new Array<CVTile2>();
	mTileMap =new Map<number,CVTile>();
	mTileRoleArr =new Array<CVTileRole>();
	mTileMoldArr = new Array<CVTileMold>();
    mPaint : CPaintVoxel=null;
	mColliderArr = Array<CCollider>();
    mPlane : Array<CVoxPlane>=new Array<CVoxPlane>();//임시 버퍼
    //mCount=new CVec3();
    //mSize=0;
	mUpdateRes=true;
	mUpdateModify=new Set<CCIndex>();
	mLight=false;
	static SunValue=1.0;
	
	mLayer =new Array<CBlackBoardRef<CVoxelMap>>();
	override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mPaint" || _member=="mUpdateRes" || _member=="mPlane" || _member=="mColliderArr")	return false;

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
		json["countY"]=this.mBuf.mCount.x;
		json["countZ"]=this.mBuf.mCount.x;
		json["size"]=this.mBuf.mSize;

		json["labelArr"]=new Array();

		let size=new CVec3(this.mBuf.mSize,this.mBuf.mSize,this.mBuf.mSize);
		for(let tile of this.mTileMap.values())
		{
			json["labelArr"].push({"label":tile.Label(),"color":tile.Color(),"sizeX":size.x,"sizeY":size.x,"sizeZ":size.x});
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
		this.RemoveComps(CPaintVoxel);
		this.RemoveComps(CCollider);
		this.RemoveComps(CNavigation);
		this.mBuf.Reset(_count,_size);

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
		let pArr=new Array<CVoxPlane>();
		for(let m of this.mUpdateModify)
		{
			this.PlaneRefresh(m);
			var loff=m.x*6+m.y*this.mBuf.mCount.x*6+m.z*this.mBuf.mCount.y*this.mBuf.mCount.z*6;
			for(let i=0;i<6;++i)
				pArr.push(this.mPlane[loff+i]);
		}
		this.mPaint.Rebuild(pArr);
		this.mUpdateModify.clear();
	}
	PlaneRefresh(_index : CCIndex)
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
			this.mAtlas.GetTexCodi(0,_texCodi);
		else
			this.mAtlas.GetTexCodi(tile.mAtlas,_texCodi);
	}
	GetLight(_index : CCIndex,_dir : CCIndex,_light : CVec2)
	{
		let x=_index.x+_dir.x;
		let y=_index.y+_dir.y;
		let z=_index.z+_dir.z;

		_light.x=1.0;
		_light.y=0.0;
		// return;

		// if(this.mBuf.mCount.z==1)
		// {
		// 	_light.x=1.0;
		// 	_light.y=0.0;
		// 	return;
		// }
		

        // if(x<0 || x>=this.mBuf.mCount.x || y<0 || y>=this.mBuf.mCount.y || 
		// 	z<0 || z>=this.mBuf.mCount.z)
        //     return 0;
		// if(this.mLight)
		// {
		// 	_light.x=CVoxel.GSun(this.mBuffer[x+this.mBuf.mCount.x*y+this.mBuf.mCount.x*this.mBuf.mCount.y*z])/CVoxel.Sun;
		// 	_light.y=CVoxel.GTorch(this.mBuffer[x+this.mBuf.mCount.x*y+this.mBuf.mCount.x*this.mBuf.mCount.y*z])/CVoxel.Torch;
		// }
			
		

	}
    RefreshRes()
    {

		
    }
	override Update(_update : CUpdate): void {
		
		if(this.mAtlas.mBase64.mData == null) {
			return;
		}

		if(this.mUpdateRes)
			this.RefreshRes();
		if(this.mPaint && this.mPaint.mMD.vGBufEx && this.mUpdateModify.size>0)
			this.RefreshModify();
	}
	PickBox(_ray : CRay) : CCIndexPick
	{
		
		return null;
	}
	Bonds(_index : CCIndex,_data : number)
	{
		
		if(this.IndexOut(_index))	return;

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
			window["BufferTool"](this.mBuf.mBuffer,this.mBuf.mCount).then(()=>{
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
		this.RemoveComps(CNavigation);
	}
	public override Export(_copy?: boolean, _resetKey?: boolean): this 
	{
		var copy=super.Export(_copy,_resetKey);
		copy.DetachComp(CPaintVoxel);
		copy.DetachComp(CCollider);
		copy.DetachComp(CNavigation);
		// copy.ResetOctree();
		return copy;
	}
	override Import(_target : CObject)
	{
		this.ResetInfo((_target as this).mBuf.mCount,(_target as this).mBuf.mSize);

		let dfw=this.mFrame;
		let dkey=this.mKey;
		super.Import(_target);
		this.DetachComp(CPaintVoxel);
		this.DetachComp(CCollider);
		this.DetachComp(CNavigation);
		this.mFrame=dfw;
		this.mKey=dkey;

	}
	public override ExportJSON(): { class: string; } {
		let ptVoxel = this.DetachComp(CPaintVoxel);
		let col = this.DetachComp(CCollider);
		let navi = this.DetachComp(CNavigation);
		let json = super.ExportJSON();
		if(ptVoxel) this.PushComp(ptVoxel);
		if(col) this.PushComp(col);
		if(navi) this.PushComp(navi);
		return json;
	}

	override ImportCJSON(_json: CJSON) 
	{
		this.mAtlas=new CAtlas();
	
		let result = super.ImportCJSON(_json);



		this.mUpdateRes=true;
		this.mUpdateModify=new Set<CCIndex>();
		
		return result;
	}
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
CVoxel_imple();
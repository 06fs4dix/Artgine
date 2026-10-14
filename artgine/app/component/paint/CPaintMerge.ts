import { CObject } from "../../../basic/CObject.js";
import { CBound } from "../../../geometry/CBound.js";
import { CMat } from "../../../geometry/CMat.js";
import { CMeshBuf, CMeshCreateInfo } from "../../../render/CMeshCreateInfo.js";
import { CMeshDataNode } from "../../../render/CMeshDataNode.js";
import { CMeshDrawNode } from "../../../render/CMeshDrawNode.js";
import { CShader, CVertexFormat } from "../../../render/CShader.js";
import { CPaint } from "./CPaint.js";

export class CPaintMerge extends CPaint
{
	//이 정점 수 이하로 떨어진 변경 구간은 하나로 합쳐 올린다(bufferSubData 호출 수와 전송량의 절충)
	static sRangeGap=64;
	static sRangeMax=16;

	mMeshDataNode=new CMeshDataNode();

	protected mSlotSize=0;
	protected mSlotUse=new Uint8Array(0);
	protected mSlotKey=new Array<string>();
	protected mSlotVS=new Int32Array(0);
	protected mSlotVC=new Int32Array(0);
	protected mSlotMat=new Float32Array(0);
	protected mSlotReady=false;

	private mFree=new Map<string,Array<number>>();
	private mUseCount=0;
	private mVtxEnd=0;
	private mIdxEnd=0;
	private mVtxCap=0;
	private mPatKey : string=null;
	private mPatV=0;
	//인덱스 버퍼는 draw mesh를 처음 만들 때만 올라간다(CRenderer.ts BuildMeshDrawNode의 STATIC_DRAW 분기).
	//그래서 아직 안 쓴 용량 구간까지 mPrefillKey 슬롯 모양으로 인덱스를 미리 채워 두고,
	//인덱스 내용이 바뀌는 경우(용량 증가, 다른 모양 슬롯 추가)에만 draw mesh를 새로 만든다.
	private mPrefillKey : string=null;
	private mPrefillDirty=false;
	private mHetero=false;
	private mVer=0;
	private mBuildID=0;
	private mDMKey=new Set<string>();

	private mBufCache=new Array<CMeshBuf>(32);
	private mBufStamp=-1;

	//변경 구간은 프레임 동안 mPend에 모았다가 첫 Render에서 한 세대(mGen)로 봉인한다.
	//셰이더(패스)마다 draw mesh가 따로 있으므로 셰이더별로 마지막에 올린 세대만 기록하고,
	//한 세대 뒤처진 셰이더는 봉인 구간만, 그보다 더 뒤처진 셰이더는 통째로 다시 올린다.
	private mPendMin=new Array<number>();
	private mPendMax=new Array<number>();
	private mPendAll=new Array<boolean>();
	private mPendCount=0;
	private mPendLast=-1;
	private mSealMin=new Array<number>();
	private mSealMax=new Array<number>();
	private mSealAll=new Array<boolean>();
	private mSealCount=0;
	private mGen=0;
	private mShaderGen=new Map<CShader,number>();
	private mBatchValid=false;

	override IsShould(_member: string, _type: CObject.eShould): boolean
	{
		if(_member=="mMeshDataNode" || _member.startsWith("mSlot") || _member.startsWith("mPend") || _member.startsWith("mSeal") ||
			_member=="mFree" || _member=="mUseCount" || _member=="mVtxEnd" || _member=="mIdxEnd" || _member=="mVtxCap" ||
			_member=="mPatKey" || _member=="mPatV" || _member=="mPrefillKey" || _member=="mPrefillDirty" || _member=="mHetero" ||
			_member=="mVer" || _member=="mBuildID" || _member=="mDMKey" || _member=="mBufCache" || _member=="mBufStamp" || _member=="mGen" ||
			_member=="mShaderGen" || _member=="mBatchValid")
			return false;
		return super.IsShould(_member,_type);
	}

	Size()	{	return this.mUseCount;	}
	IsUse(_slot : number)	{	return _slot>=0 && _slot<this.mSlotSize && this.mSlotUse[_slot]==1;	}
	//Start 전에 넣은 것은 Start에서 생성자 목록 순서대로 슬롯이 된다. 슬롯 번호를 바로 써야 하면 준비된 뒤에 넣는다
	IsReady()	{	return this.mSlotReady;	}
	//슬롯 전체가 새로 만들어질 때마다(Start, Reset 후 재시작) 바뀐다. 바뀌면 이전 슬롯 번호는 무효다
	GetBuildID()	{	return this.mBuildID;	}

	Modify(_slot : number,_mat : CMat)
	{
		if(this.IsUse(_slot)==false)	return;
		const s=this.mSlotMat, o=_slot*16, m=_mat.mF32A;
		let rs=true;
		for(let i=0;i<12;++i)
		{
			if(s[o+i]!=m[i])
			{
				rs=false;
				break;
			}
		}
		if(rs && s[o+15]==m[15])
		{
			this.ModifyPos(_slot,m[12],m[13],m[14]);
			return;
		}
		s.set(m,o);
		this.WriteSlot(_slot,false);
		this.Dirty(_slot);
	}
	//회전·스케일은 그대로 두고 이동만 바꾼다. 정점 position에 이동량만 더하고 position 채널만 올린다
	ModifyPos(_slot : number,_x : number,_y : number,_z : number)
	{
		if(this.IsUse(_slot)==false)	return;
		const s=this.mSlotMat, o=_slot*16;
		const dx=_x-s[o+12], dy=_y-s[o+13], dz=_z-s[o+14];
		if(dx==0 && dy==0 && dz==0)	return;
		//투영 성분이 있으면 정점마다 w로 나눠야 해서 이동량을 더하는 것만으로는 안 된다
		if(s[o+3]!=0 || s[o+7]!=0 || s[o+11]!=0 || s[o+15]!=1)
		{
			s[o+12]=_x;	s[o+13]=_y;	s[o+14]=_z;
			this.WriteSlot(_slot,false);
			this.Dirty(_slot);
			return;
		}
		s[o+12]=_x;	s[o+13]=_y;	s[o+14]=_z;
		this.TranslateSlot(_slot,dx,dy,dz);
		this.DirtyPos(_slot);
	}
	Remove(_slot : number)
	{
		if(this.IsUse(_slot)==false)	return;
		this.ZeroPos(this.mSlotVS[_slot],this.mSlotVC[_slot]);
		this.mSlotUse[_slot]=0;
		this.mUseCount--;
		const key=this.mSlotKey[_slot];
		let free=this.mFree.get(key);
		if(free==null)
		{
			free=[];
			this.mFree.set(key,free);
		}
		free.push(_slot);
		this.DirtyPos(_slot);
	}
	Clear()
	{
		if(this.mSlotReady==false)	return;
		const oldEnd=this.mVtxEnd;
		this.ZeroPos(0,oldEnd);
		this.mSlotUse.fill(0);
		this.mSlotSize=0;
		this.mUseCount=0;
		this.mVtxEnd=0;
		this.mIdxEnd=0;
		this.mFree.clear();
		this.mBound.Reset();
		this.mBound.SetType(CBound.eType.Box);
		if(this.mHetero || this.mPrefillDirty)
		{
			this.mHetero=false;
			this.mPrefillDirty=true;
			this.Restructure();
		}
		else if(oldEnd>0)
		{
			this.DirtyRange(0,oldEnd-1,false);
		}
	}

	//하위 클래스 구현부
	protected CreateChannel()	{}
	protected SlotVertex(_key : string)	{	return 0;	}
	protected SlotIndex(_key : string)	{	return 0;	}
	protected WriteIndex(_key : string,_iStart : number,_vStart : number)	{}
	//_static=true면 슬롯이 바뀌어도 변하지 않는 채널(uv, texOff, weight 등)까지 쓴다. 할당 직후에만 true로 부른다
	protected WriteSlot(_slot : number,_static : boolean)	{}
	protected RenderAttr(_vf : CShader)	{}
	protected GrowSlotData(_cap : number)	{}
	protected TranslateSlot(_slot : number,_dx : number,_dy : number,_dz : number)
	{
		this.AddPos(this.mSlotVS[_slot],this.mSlotVC[_slot],_dx,_dy,_dz);
	}

	protected BuildSlot()
	{
		this.ReleaseDrawMesh();
		const ci=new CMeshCreateInfo();
		this.mMeshDataNode.ci=ci;
		this.mBufStamp=-1;
		this.CreateChannel();
		if(ci.GetVFType(CVertexFormat.eIdentifier.Index).length==0)
			ci.Create(CVertexFormat.eIdentifier.Index);
		ci.vertexCount=0;
		ci.indexCount=0;

		this.mSlotUse.fill(0);
		this.mSlotSize=0;
		this.mUseCount=0;
		this.mVtxEnd=0;
		this.mIdxEnd=0;
		this.mVtxCap=0;
		this.mFree.clear();
		this.mPatKey=null;
		this.mPatV=0;
		this.mPrefillKey=null;
		this.mPrefillDirty=false;
		this.mHetero=false;
		this.mPendCount=0;
		this.mPendLast=-1;
		this.mSealCount=0;
		this.mBound.Reset();
		this.mBound.SetType(CBound.eType.Box);
		this.mSlotReady=true;
		this.mBuildID++;
		this.mVer++;
		this.InvalidBatch();
	}
	protected NewSlot(_key : string) : number
	{
		const free=this.mFree.get(_key);
		let slot=-1;
		if(free!=null && free.length>0)
		{
			slot=free.pop();
		}
		else
		{
			const v=this.SlotVertex(_key);
			const i=this.SlotIndex(_key);
			const vs=this.mVtxEnd;
			const is=this.mIdxEnd;
			slot=this.mSlotSize;
			this.GrowSlotArr(slot+1);
			this.mSlotSize++;
			this.mSlotKey[slot]=_key;
			this.mSlotVS[slot]=vs;
			this.mSlotVC[slot]=v;

			if(vs+v>this.mVtxCap)
			{
				this.mPatKey=_key;
				this.mPatV=v;
				this.ReserveVertex(vs+v);
				this.Prefill();
				this.Restructure();
			}
			else if(this.mPrefillDirty || _key!=this.mPrefillKey)
			{
				this.WriteIndex(_key,is,vs);
				if(_key!=this.mPrefillKey)	this.mHetero=true;
				this.mPatKey=_key;
				this.mPatV=v;
				if(this.mPrefillDirty==false)
				{
					this.mPrefillDirty=true;
					this.Restructure();
				}
			}
			this.mVtxEnd+=v;
			this.mIdxEnd+=i;
		}
		this.mSlotUse[slot]=1;
		this.mUseCount++;
		return slot;
	}
	protected SetSlotMat(_slot : number,_mat : CMat)
	{
		this.mSlotMat.set(_mat.mF32A,_slot*16);
	}
	protected Dirty(_slot : number)
	{
		const vs=this.mSlotVS[_slot];
		this.DirtyRange(vs,vs+this.mSlotVC[_slot]-1,true);
	}
	protected DirtyPos(_slot : number)
	{
		const vs=this.mSlotVS[_slot];
		this.DirtyRange(vs,vs+this.mSlotVC[_slot]-1,false);
	}
	//채널 버퍼 참조. 배열(mF32A)은 용량 증가나 GLBufferSet의 Resize로 바뀔 수 있어 캐시하지 않고 버퍼 객체만 캐시한다
	protected Buf(_type : number,_index=0) : CMeshBuf
	{
		const ci=this.mMeshDataNode.ci;
		if(this.mBufStamp!=ci.vertex.length)
		{
			this.mBufCache.fill(null);
			const count=new Array<number>(16).fill(0);
			for(const buf of ci.vertex)
			{
				const n=count[buf.vfType]++;
				if(n<2)	this.mBufCache[buf.vfType*2+n]=buf;
			}
			this.mBufStamp=ci.vertex.length;
		}
		return this.mBufCache[_type*2+_index];
	}
	protected F32(_type : number,_index=0) : Float32Array
	{
		const buf=this.Buf(_type,_index);
		return buf!=null?buf.bufF.mF32A:null;
	}
	protected BoundPush(_x : number,_y : number,_z : number)
	{
		const mn=this.mBound.mMin.mF32A, mx=this.mBound.mMax.mF32A;
		let change=false;
		if(_x<mn[0])	{	mn[0]=_x;	change=true;	}
		if(_y<mn[1])	{	mn[1]=_y;	change=true;	}
		if(_z<mn[2])	{	mn[2]=_z;	change=true;	}
		if(_x>mx[0])	{	mx[0]=_x;	change=true;	}
		if(_y>mx[1])	{	mx[1]=_y;	change=true;	}
		if(_z>mx[2])	{	mx[2]=_z;	change=true;	}
		if(change)
		{
			this.mBW.mRadian=0;
			this.UpdateLMat();
		}
	}
	protected AddPos(_vs : number,_vc : number,_dx : number,_dy : number,_dz : number)
	{
		const p=this.F32(CVertexFormat.eIdentifier.Position);
		for(let i=_vs*3,e=(_vs+_vc)*3;i<e;i+=3)
		{
			p[i]+=_dx;	p[i+1]+=_dy;	p[i+2]+=_dz;
			this.BoundPush(p[i],p[i+1],p[i+2]);
		}
	}
	//셰이더가 요구해 BuildMeshDrawNodeAutoFix가 끼워 넣은 바이노멀은 하위 클래스가 모르므로 노말·탄젠트에서 다시 구한다
	protected WriteBinormal(_vs : number,_vc : number)
	{
		const I=CVertexFormat.eIdentifier;
		const bib=this.Buf(I.Binormal);
		if(bib==null || this.mVtxCap==0)	return;
		const n=this.F32(I.Normal), t=this.F32(I.Tangent);
		if(n==null || t==null)	return;
		const bs=Math.round(bib.bufF.mSize/this.mVtxCap);
		const b=bib.bufF.mF32A;
		for(let i=_vs;i<_vs+_vc;++i)
		{
			const n3=i*3, t4=i*4, o=i*bs;
			const nx=n[n3], ny=n[n3+1], nz=n[n3+2];
			const tx=t[t4], ty=t[t4+1], tz=t[t4+2], tw=t[t4+3];
			b[o]=(ny*tz-nz*ty)*tw;
			b[o+1]=(nz*tx-nx*tz)*tw;
			b[o+2]=(nx*ty-ny*tx)*tw;
		}
	}

	override Render(_vf : CShader) : void
	{
		var barr=this.RenderBatch(_vf,1);
		if(barr==null)	return;
		//배치 배열이 캐시됐으니 다음 변경 때는 무효화해야 Render가 다시 돈다
		this.mBatchValid=true;
		if(this.mSlotReady==false || this.mUseCount==0)	return;
		if(this.mPrefillDirty)	this.Prefill();
		if(this.mPendCount>0)	this.Seal();

		const frame=this.mOwner.GetFrame();
		frame.BMgr().BatchOn();
		this.Common(_vf);
		this.RenderAttr(_vf);
		frame.BMgr().SetBatchTex(this.mTextureKey);

		const key=this.DrawMeshKey();
		const resKey=key+_vf.ObjHash();
		let dm=frame.Res().Find(resKey) as CMeshDrawNode;
		if(dm==null)
		{
			this.mMeshDataNode.ci.bound.Import(this.mBound);
			dm=this.GetDrawMesh(key,_vf,this.mMeshDataNode.ci);
			this.mDMKey.add(resKey);
		}
		else
		{
			const gen=this.mShaderGen.get(_vf);
			if(gen==null || gen<this.mGen-1)
				frame.Ren().BuildMeshDrawNode(dm,this.mMeshDataNode.ci,_vf);
			else if(gen==this.mGen-1)
				this.Upload(dm,_vf);
		}
		this.mShaderGen.set(_vf,this.mGen);
		dm.iNum=this.mIdxEnd;
		frame.BMgr().SetBatchMesh(dm);

		barr[0]=frame.BMgr().BatchOff();
	}
	override Destroy(): void
	{
		this.ReleaseDrawMesh();
		super.Destroy();
	}
	override Reset()
	{
		this.ReleaseDrawMesh();
		super.Reset();
		this.mSlotReady=false;
	}

	private DrawMeshKey()	{	return "Artgine/DM/Merge/"+this.Key()+"/"+this.mVer;	}
	private DirtyRange(_min : number,_max : number,_all : boolean)
	{
		if(this.mBatchValid)
		{
			this.InvalidBatch();
			this.mBatchValid=false;
		}
		const gap=CPaintMerge.sRangeGap;
		const pMin=this.mPendMin, pMax=this.mPendMax, pAll=this.mPendAll;
		//position 전용 구간과 전체 채널 구간은 합치지 않는다. 합치면 이동만 한 넓은 구간까지 모든 채널이 올라간다
		let hit=-1;
		const last=this.mPendLast;
		if(last>=0 && pAll[last]==_all && _min<=pMax[last]+gap && _max>=pMin[last]-gap)
		{
			hit=last;
		}
		else
		{
			for(let i=0;i<this.mPendCount;++i)
			{
				if(pAll[i]==_all && _min<=pMax[i]+gap && _max>=pMin[i]-gap)
				{
					hit=i;
					break;
				}
			}
		}
		if(hit<0 && this.mPendCount>=CPaintMerge.sRangeMax)
		{
			let best=Number.MAX_SAFE_INTEGER;
			for(let i=0;i<this.mPendCount;++i)
			{
				const d=(_min>pMax[i]?_min-pMax[i]:pMin[i]-_max)+(pAll[i]==_all?0:Number.MAX_SAFE_INTEGER/2);
				if(d<best)
				{
					best=d;
					hit=i;
				}
			}
		}
		if(hit>=0)
		{
			if(_min<pMin[hit])	pMin[hit]=_min;
			if(_max>pMax[hit])	pMax[hit]=_max;
			if(_all)	pAll[hit]=true;
		}
		else
		{
			hit=this.mPendCount++;
			pMin[hit]=_min;
			pMax[hit]=_max;
			pAll[hit]=_all;
		}
		this.mPendLast=hit;
	}
	private Seal()
	{
		const min=this.mSealMin, max=this.mSealMax, all=this.mSealAll;
		this.mSealMin=this.mPendMin;	this.mPendMin=min;
		this.mSealMax=this.mPendMax;	this.mPendMax=max;
		this.mSealAll=this.mPendAll;	this.mPendAll=all;
		this.mSealCount=this.mPendCount;
		this.mPendCount=0;
		this.mPendLast=-1;
		this.mGen++;
	}
	private InvalidBatch()
	{
		for(let key of this.mBatchMap.keys())
			this.mBatchMap.set(key,null);
	}
	private Restructure()
	{
		this.mVer++;
		this.ReleaseDrawMesh();
		this.InvalidBatch();
		this.mBatchValid=false;
		this.mPendCount=0;
		this.mPendLast=-1;
		this.mSealCount=0;
	}
	private ReleaseDrawMesh()
	{
		if(this.mDMKey.size>0 && this.mOwner!=null && this.mOwner.GetFrame()!=null)
		{
			const frame=this.mOwner.GetFrame();
			for(const key of this.mDMKey)
			{
				const dm=frame.Res().Find(key) as CMeshDrawNode;
				if(dm==null)	continue;
				frame.Ren().ReleaseMeshDrawNode(dm);
				frame.Res().Remove(key);
			}
		}
		this.mDMKey.clear();
		this.mShaderGen.clear();
	}
	private Upload(_dm : CMeshDrawNode,_vf : CShader)
	{
		if(this.mSealCount==0)	return;
		const ren=this.mOwner.GetFrame().Ren();
		const P=CVertexFormat.eIdentifier.Position;
		for(let j=0;j<_vf.mVF.length;++j)
		{
			const vf=_vf.mVF[j];
			if(vf.identifier==CVertexFormat.eIdentifier.Instance || vf.eachCount*vf.eachSize>16)	continue;
			const pos=(vf.identifier==P && vf.identifierCount==0);
			const arr=this.F32(vf.identifier,vf.identifierCount);
			if(arr==null)	continue;
			for(let r=0;r<this.mSealCount;++r)
			{
				if(pos==false && this.mSealAll[r]==false)	continue;
				const st=this.mSealMin[r]*vf.eachCount;
				const ed=Math.min((this.mSealMax[r]+1)*vf.eachCount,arr.length);
				if(ed<=st)	continue;
				ren.RebuildMeshDrawNode(_dm,j,st*4,arr.subarray(st,ed));
			}
		}
	}
	private ZeroPos(_vs : number,_vc : number)
	{
		if(_vc<=0)	return;
		const p=this.F32(CVertexFormat.eIdentifier.Position);
		if(p==null)	return;
		p.fill(0,_vs*3,(_vs+_vc)*3);
	}
	private GrowSlotArr(_need : number)
	{
		const len=this.mSlotUse.length;
		if(_need<=len)	return;
		const cap=Math.max(_need,len*2,16);
		const use=new Uint8Array(cap);	use.set(this.mSlotUse);	this.mSlotUse=use;
		const vs=new Int32Array(cap);	vs.set(this.mSlotVS);	this.mSlotVS=vs;
		const vc=new Int32Array(cap);	vc.set(this.mSlotVC);	this.mSlotVC=vc;
		const mat=new Float32Array(cap*16);	mat.set(this.mSlotMat);	this.mSlotMat=mat;
		this.GrowSlotData(cap);
	}
	private Stride(_buf : CMeshBuf) : number
	{
		if(this.mVtxCap>0 && _buf.bufF.mSize>0)
			return Math.round(_buf.bufF.mSize/this.mVtxCap);
		const I=CVertexFormat.eIdentifier;
		switch(_buf.vfType)
		{
			case I.UV:	return 2;
			case I.Position:	case I.Normal:	case I.TexOff:	case I.Binormal:	return 3;
		}
		return 4;
	}
	private ReserveVertex(_need : number)
	{
		const ci=this.mMeshDataNode.ci;
		const cap=Math.max(_need,this.mVtxCap*2);
		for(const buf of ci.vertex)
		{
			if(buf.vfType==CVertexFormat.eIdentifier.Index)	continue;
			const s=this.Stride(buf);
			const old=buf.bufF.mF32A;
			const arr=new Float32Array(cap*s);
			arr.set(old.subarray(0,Math.min(old.length,this.mVtxCap*s)));
			if(buf.vfType==CVertexFormat.eIdentifier.TexOff)
				arr.fill(-1,this.mVtxCap*s);
			buf.bufF.mF32A=arr;
			buf.bufF.mSize=cap*s;
		}
		this.mVtxCap=cap;
		ci.vertexCount=cap;
	}
	private Prefill()
	{
		const ci=this.mMeshDataNode.ci;
		const inb=this.Buf(CVertexFormat.eIdentifier.Index);
		inb.bufI.length=this.mIdxEnd;
		if(this.mPrefillKey!=null && this.mPrefillKey!=this.mPatKey && this.mIdxEnd>0)
			this.mHetero=true;
		this.mPrefillKey=this.mPatKey;
		if(this.mPatKey!=null && this.mPatV>0)
		{
			for(let vs=this.mVtxEnd;vs+this.mPatV<=this.mVtxCap;vs+=this.mPatV)
				this.WriteIndex(this.mPatKey,inb.bufI.length,vs);
		}
		ci.indexCount=inb.bufI.length;
		this.mPrefillDirty=false;
	}
}

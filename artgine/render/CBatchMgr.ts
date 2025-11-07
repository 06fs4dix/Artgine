
import { CArray } from "../basic/CArray.js";
import { CHash } from "../basic/CHash.js";

import { CAtlas } from "../util/CAtlas.js";

import { CMeshDrawNode } from "./CMeshDrawNode.js";
import { CRenderer, CRendererGL } from "./CRenderer.js";
import { CShader } from "./CShader.js";
import { CShaderAttr } from "./CShaderAttr.js";
import { CTexture, CTextureInfo } from "./CTexture.js";
import { CUniform } from "./CUniform.js";
import { CUtil } from "../basic/CUtil.js";

export class CTypeUni
{
	type :number;
	uni :CUniform
	last;
}

export class CBatch
{
	public mKey : number=null;
	public mMesh : CMeshDrawNode=null;
	public mTexture = new Array<CTexture>();
	public mValue = new Array<CShaderAttr>();
	
	

	CreateKey()
	{
		var str=this.mMesh.Key();
		let nullCount=0;
		for(var i=0;i<this.mTexture.length;++i)
		{
			if(this.mTexture[i]==null)
			{
				nullCount++;
				str+="null";
			}
			else
				str+=this.mTexture[i].Key();
			str+="/";
		}
		if(nullCount!=0 && nullCount==this.mTexture.length)
		{
			this.mKey=0;
			return;	
		}


		for(let i=0;i<this.mValue.length;++i)
			str+=this.mValue[i].mKey;
		this.mKey=CHash.HashCode(str);
		if(this.mKey<0) this.mKey=-this.mKey;
		this.mKey=this.mKey<<16;
	}	
	
}
export class CBatchArray
{
	public mData=new Array<CBatch>();
	public mPriority=0;
}
export class CBatchMgr
{
	public mRender : CRenderer;
	
	public mBatchMap : Map<number,CBatchArray>=null;
	public mBatch : CBatch=null;
	public mLock=true;
	public mBatchPool=new Array<CBatch>();
	public mBatchSize=0;
	public mBatchGlobal =new CArray<CShaderAttr>();
	public mBaSortArr =new CArray<CBatchArray>();
	public mBatchGDummy : CBatch=new CBatch();
	public mUniArr=new CArray<CTypeUni>();
	
	public mBasePriority : number=null;
	public mFeedbackLoop=new Set<any>();
	mTexDataAtt=new Set<any>();
	

	constructor(_render : CRenderer)
	{
		this.mRender=_render;
		
	}
	SetFeedBackLoop(_data)
	{
		this.mFeedbackLoop.add(_data);
	}
	DeleteFeedBackLoop(_data)
	{
		this.mFeedbackLoop.delete(_data);
	}
	IsBatchMap()
	{
		return this.mBatchMap!=null;
	}
	
    BatchStart()	
	{
		if(this.mBatchMap==null)
			this.mBatchMap=new Map<number,CBatchArray>();
        this.mRender.mUniTexLastOff=-1;
		//this.m_uniTexOff=-1;
		this.mBasePriority=0;
		this.mBaSortArr.Clear();
		this.mTexDataAtt.clear();
	}
	BatchEnd()
	{
		this.mBatchMap=null;
	}
	BatchGlobalOn()
	{
		if(this.mBatchMap==null)
			return;
		this.mBatchGlobal.Clear();
		this.mBatch=this.mBatchGDummy;
		this.mBatchGDummy.mMesh=null;
		this.mBatchGDummy.mTexture.length=0;
		this.mBatchGDummy.mValue.length=0;

	}
	BatchGlobalOff()
	{
		if(this.mBatchMap==null)
			return;
			
		for(var i=0;i<this.mBatch.mValue.length;++i)
			this.mBatchGlobal.Push(this.mBatch.mValue[i]);
		//this.m_batchGlobal.Clear();
		this.mBatch=null;
	}
	BatchGlobalClear()
	{
		this.mBatchGlobal.Clear();
	}
	BatchOn()
	{
		
		if(this.mBatchMap==null)
			return;
		

		if(this.mBatchSize==this.mBatchPool.length)
			this.mBatchPool.push(new CBatch());
		
		this.mBatch=new CBatch();
		this.mBatchSize++;
		
			
	}
	BatchOff()
	{
		if(this.mBatchMap==null)
			return;
		
		this.mBatch.CreateKey();
		let bKey=this.mBatch.mKey+this.mBasePriority;
		var val=this.mBatchMap.get(bKey);
		if(val==null)
		{
			this.mBatchMap.set(bKey,new CBatchArray());
			val=this.mBatchMap.get(bKey);
			val.mPriority=this.mBasePriority;
		}
		if(val.mData.length==0)
			this.mBaSortArr.Push(val);
		
		if(this.mBatchGlobal!=null)
		{
			for(var i=0;i<this.mBatchGlobal.Size();++i)
			{
				let push=true;
				let gb=this.mBatchGlobal.Find(i);
				for(let j=0;j<this.mBatch.mValue.length;++j)
				{
					if(this.mBatch.mValue[j].mKey==gb.mKey)
					{
						push=false;
						break;
					}
				}
				if(push)
					this.mBatch.mValue.push(this.mBatchGlobal.Find(i));
			}
		}
		

		val.mData.push(this.mBatch);

		
		
		this.mBatch=null;
		return val.mData[val.mData.length-1];
	}
	BatchPushArr(_ba:Array<CBatch>)
	{
		if(this.mBatchMap==null)
			return _ba;
		for(let i=0;i<_ba.length;++i)
		{
			const batch=_ba[i];
			if(batch==null ||batch.mKey==0)
				continue;
			let bKey=batch.mKey+this.mBasePriority;
			var val=this.mBatchMap.get(bKey);
			if(val==null)
			{
				val=new CBatchArray();
				this.mBatchMap.set(bKey,val);
				val.mPriority=this.mBasePriority;
			}
			if(val.mData.length==0)
				this.mBaSortArr.Push(val);

			// //이거 지워야함 20251030 테스트용 !!!!!!!!!!!!!!!!!!!!!!!
			// if(val.mData.length>0)
			// {
			// 	if(val.mData[0].mValue.length!=batch.mValue.length)
			// 	{
					
			// 		CAlert.E("test!!!!!!!!!!!!!!!!"+batch.mKey);
			// 		batch.CreateKey();
			// 		val.mData[0].CreateKey();

			// 	}
			// }


			val.mData.push(batch);	
		}
		return null;
	}
	

	SetBatchSA(_sa : CShaderAttr)
    {
        this.mBatch.mValue.push(_sa);
    }
    SetBatchTex(_texture : Array<CTexture>)
    {
        this.mBatch.mTexture=_texture;
    }
    SetBatchMesh(_mesh : CMeshDrawNode)
    {
        this.mBatch.mMesh=_mesh;
    }
	BatchExcute(_vf : CShader)
	{
		

	}
}
export class CBatchMgrGL extends CBatchMgr
{
	constructor(_render : CRenderer)
	{
		super(_render);
	}
   

    BatchExcute(_vf : CShader)
	{
		
	}
}
import CBatchMgr_imple from "../render_imple/CBatchMgr.js";
import { CAlert } from "../basic/CAlert.js";
CBatchMgr_imple();
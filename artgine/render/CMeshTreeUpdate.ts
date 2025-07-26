

import {CTree} from "../basic/CTree.js"
import {CMat} from "../geometry/CMat.js"
import { CMeshCopyNode } from "./CMeshCopyNode.js";
import { CKeyFrame, CMeshDataNode } from "./CMeshDataNode.js";

export class CMeshTreeUpdate
{
	static TreeCopy(_md : CTree<CMeshDataNode>,_mpi : CTree<CMeshCopyNode>,_sum : CMat,_bound : any)
	{
		
	}
	static TreeReset(_md : CTree<CMeshDataNode>,_mpi : CTree<CMeshCopyNode>)
	{
		
	}
	
	static FindBFrame(_frameList : Array<CKeyFrame>,_key : number)
	{
		let frame : CKeyFrame=null;
		if (_frameList.length > 0)
		{
			frame = _frameList[0];
			for (var i = 0; i < _frameList.length; ++i)
			{
				if (_key > _frameList[i].key)
				{
					frame = _frameList[i];
				}
				else
					break;
			}
		}
		return frame;
	}
	static FindAFrame(_frameList : Array<CKeyFrame>,_key : number)
	{
		let frame : CKeyFrame=null;
		if (_frameList.length > 0)
		{
			for (var i = _frameList.length-1; i >= 0; --i)
			{
				if (_key <= _frameList[i].key)
				{
					frame = _frameList[i];
				}
				else
					break;
			}
		}
		return frame;
	}
	
	static TreeUpdateMeshAni(_pst : number,_st : number,_ed : number,_md : CMeshDataNode,_mci : CMeshCopyNode,_all : CMat)
	{	


		
	}
	static TreeMeshInter(_mci : CMeshCopyNode,_create)
	{

	}
}
import CMeshTreeUpdate_imple from "../render_imple/CMeshTreeUpdate.js";

CMeshTreeUpdate_imple();
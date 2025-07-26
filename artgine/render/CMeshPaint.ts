import {CMat} from "../geometry/CMat.js"
import {CTree} from "../basic/CTree.js"
import {CShaderAttr} from "./CShaderAttr.js"
import { CMeshDataNode } from "./CMeshDataNode.js";
import { CMeshCopyNode } from "./CMeshCopyNode.js";
import { CMeshDrawNode } from "./CMeshDrawNode.js";

export class CMeshPaint
{
	public md : CTree<CMeshDataNode>;
	public mpi : CTree<CMeshCopyNode>;
	public mdraw : CTree<CMeshDrawNode>;
	public sum : CMat;
	public sumSA : CShaderAttr;
	constructor(_md : CTree<CMeshDataNode>,_mpi : CTree<CMeshCopyNode>,_mdraw=null)
	{
		this.md=_md;
		this.mpi=_mpi;
		this.mdraw=_mdraw;
		this.sum=new CMat();
		this.sumSA =new CShaderAttr("worldMat",this.sum);
	}
}

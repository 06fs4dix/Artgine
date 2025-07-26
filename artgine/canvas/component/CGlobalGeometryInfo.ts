

import { COctreeMgr } from "../../geometry/COctree.js";
import {CPlane} from "../../geometry/CPlane.js";
import {CNaviMgr} from "../CNavigationMgr.js";
import { CRayMouse } from "../CRayMouse.js";



export class CGlobalGeometryInfo
{
	//public m_ray = new Array<CRayMouse>();
	//public m_plane : CPlane= null;
	public mRay=new Map<string,Array<CRayMouse>>();
	public mPlane=new Map<string,CPlane>();
	public mNavi : CNaviMgr=null;
	public mOctree:COctreeMgr=new COctreeMgr();
}
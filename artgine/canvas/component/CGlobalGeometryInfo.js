import { COctreeMgr } from "../../geometry/COctree.js";
export class CGlobalGeometryInfo {
    mRay = new Map();
    mPlane = new Map();
    mNavi = null;
    mOctree = new COctreeMgr();
}

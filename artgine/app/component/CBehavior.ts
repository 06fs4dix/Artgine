import { CUpdate } from "../../basic/Basic.js";
import { CObject } from "../../basic/CObject.js";
import {CPlaneInside} from "../../geometry/CPlaneInside.js";
import {CVec3} from "../../geometry/CVec3.js";
import {CRayMouse} from "../CRayMouse.js";
import {CCollider, CCollisionObject } from "./CCollider.js";
import {CComponent} from "./CComponent.js";

class CCTEnterExit
{
    org : CCollider;
    tick : number;
}

export class CBehavior extends CComponent
{
    private mCTMap = new Map<CCollider, CCTEnterExit>();
    private mTick: number = 1;

    override Start(): void {
        
    }

    override Update(_update : CUpdate): void 
    {
        for (const [collider, ct] of this.mCTMap) {
            if (Math.abs(ct.tick) < this.mTick) {
                this.mCTMap.delete(collider);
                ct.tick >= 0 ? this.CollisionExit(ct.org, collider) : this.TriggerExit(ct.org, collider);
            }
        }
        this.mTick++;
    }

    CameraOut(_pArr : Array<CPlaneInside>)
    {
     
    }

    Collision(_org : CCollider, _size : number, _tar : Array<CCollider>, _push : Array<CVec3>)
    {
        for (let i = 0; i < _size; i++) {
            const tar = _tar[i];
            if (!this.mCTMap.has(tar)) {
                this.CollisionEnter(_org, tar);
            }
            this.mCTMap.set(tar, {org: _org, tick: this.mTick});
        }
    }

    CollisionEnter(_org : CCollider, _tar : CCollider)
    {

    }

    CollisionExit(_org : CCollider, _tar : CCollider)
    {

    }

    Trigger(_org : CCollider, _size : number, _tar : Array<CCollider>)
    {
        for (let i = 0; i < _size; i++) {
            const tar = _tar[i];
            if (!this.mCTMap.has(tar)) {
                this.TriggerEnter(_org, tar);
            }
            this.mCTMap.set(tar, {org: _org, tick: -this.mTick});
        }
    }

    TriggerEnter(_org : CCollider, _tar : CCollider)
    {

    }

    TriggerExit(_org : CCollider, _tar : CCollider)
    {

    }

    PickMouse(_rayMouse : CRayMouse)
    {

    }

    PickRay(_pos : CVec3,_col : CCollider)
    {
        
    }

    override IsShould(_member: string, _type: CObject.eShould) 
	{
		if(_member=="mEnable" || _member=="mKey" || _member=="mBlackboardWrite")
            return true;
        
		return false;
	}
}
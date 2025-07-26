import { CObject } from "../../basic/CObject.js";
import { CCurve } from "../../util/CCurve.js";
export class CStopover extends CObject {
    constructor(_dest, _velocity) {
        super();
        this.mPos = _dest;
        this.m_velocity = _velocity;
    }
    mPos = new Array;
    m_curve = new CCurve();
    m_bezier = false;
    m_time = 0;
    m_delay = 0;
    m_velocity = 0;
}

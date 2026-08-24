import { CVec3 } from "../../geometry/CVec3.js";
export class CPhysics {
    static GravityDir = new CVec3(0, -1);
    static GravityKey = "g";
    static JumpKey = "j";
    static GravityPow = 10;
    static GravityMaxPow = 500;
    static GravityAcc = 400;
    static StairsDownHeight = 0;
    static StairsCenter = 1;
    static CutMinPushValue = 0.01;
    static GroundSlopeAngle = 45;
    static GroundSlop = 0.03;
    static SurfaceFriction = 0;
    static SurfaceBounce = 0;
    static BounceKey = "b";
    static BounceMinVel = 30;
}

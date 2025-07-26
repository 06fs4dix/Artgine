import { CFloat32 } from "./CFloat32.js";
export class CPlane extends CFloat32 {
    static eDir = {
        Near: 0,
        Far: 4,
        Top: 8,
        Bottom: 12,
        Left: 16,
        Right: 20,
        Count: 24,
        Null: 7,
    };
    constructor() {
        super();
        this.mF32A = new Float32Array(24);
    }
    set near(_val) {
        this.mF32A[CPlane.eDir.Near + 0] = _val.x;
        this.mF32A[CPlane.eDir.Near + 1] = _val.y;
        this.mF32A[CPlane.eDir.Near + 2] = _val.z;
        this.mF32A[CPlane.eDir.Near + 3] = _val.w;
    }
    set far(_val) {
        this.mF32A[CPlane.eDir.Far + 0] = _val.x;
        this.mF32A[CPlane.eDir.Far + 1] = _val.y;
        this.mF32A[CPlane.eDir.Far + 2] = _val.z;
        this.mF32A[CPlane.eDir.Far + 3] = _val.w;
    }
    set top(_val) {
        this.mF32A[CPlane.eDir.Top + 0] = _val.x;
        this.mF32A[CPlane.eDir.Top + 1] = _val.y;
        this.mF32A[CPlane.eDir.Top + 2] = _val.z;
        this.mF32A[CPlane.eDir.Top + 3] = _val.w;
    }
    set bottom(_val) {
        this.mF32A[CPlane.eDir.Bottom + 0] = _val.x;
        this.mF32A[CPlane.eDir.Bottom + 1] = _val.y;
        this.mF32A[CPlane.eDir.Bottom + 2] = _val.z;
        this.mF32A[CPlane.eDir.Bottom + 3] = _val.w;
    }
    set left(_val) {
        this.mF32A[CPlane.eDir.Left + 0] = _val.x;
        this.mF32A[CPlane.eDir.Left + 1] = _val.y;
        this.mF32A[CPlane.eDir.Left + 2] = _val.z;
        this.mF32A[CPlane.eDir.Left + 3] = _val.w;
    }
    set right(_val) {
        this.mF32A[CPlane.eDir.Right + 0] = _val.x;
        this.mF32A[CPlane.eDir.Right + 1] = _val.y;
        this.mF32A[CPlane.eDir.Right + 2] = _val.z;
        this.mF32A[CPlane.eDir.Right + 3] = _val.w;
    }
}

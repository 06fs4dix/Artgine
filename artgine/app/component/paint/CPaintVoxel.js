import { CObject } from "../../../basic/CObject.js";
import { CVec2 } from "../../../geometry/CVec2.js";
import { CVec3 } from "../../../geometry/CVec3.js";
import { CVec4 } from "../../../geometry/CVec4.js";
import { CVertexFormat } from "../../../render/CShader.js";
import { CShaderAttr } from "../../../render/CShaderAttr.js";
import { CPaintMerge } from "./CPaintMerge.js";
export class CVoxPlane extends CObject {
    static eDir = {
        "Up": 0,
        "Down": 10,
        "Left": 20,
        "Right": 30,
        "Front": 40,
        "Back": 50,
        "Count": 60,
        "Null": 70,
    };
    constructor(_off, _pos = new CVec3(), _dir = CVoxPlane.eDir.Null) {
        super();
        this.mDir = _dir;
        this.mPos = _pos;
        this.mOff = _off;
    }
    mPos = new CVec3();
    mDir = CVoxPlane.eDir.Null;
    mUV = new CVec4(0, 0, 1, 1);
    mLight = new CVec2(1, 1);
    mOff;
}
export class CPaintVoxel extends CPaintMerge {
    mSize = 100;
    static sFaceKey = "f";
    static sFaceVertex = 6;
    constructor() {
        super();
        this.PushTag("alphaCut");
    }
    Init() {
        this.BuildSlot();
    }
    ReserveFace(_count) {
        this.ReserveSlot(CPaintVoxel.sFaceKey, _count);
    }
    PushFace(_plane) {
        const slot = this.NewSlot(CPaintVoxel.sFaceKey);
        this.ModifyFace(slot, _plane);
        return slot;
    }
    ModifyFace(_slot, _plane) {
        const I = CVertexFormat.eIdentifier;
        const p = this.F32(I.Position), uv = this.F32(I.UV), c = this.F32(I.Color);
        const vs = this.mSlotVS[_slot];
        const pos = _plane.mPos.mF32A, tex = _plane.mUV.mF32A, light = _plane.mLight.mF32A;
        for (let j = 0; j < CPaintVoxel.sFaceVertex; ++j) {
            const v = vs + j, p4 = v * 4, c2 = v * 2;
            p[p4] = pos[0];
            p[p4 + 1] = pos[1];
            p[p4 + 2] = pos[2];
            p[p4 + 3] = _plane.mDir + j;
            uv[p4] = tex[0];
            uv[p4 + 1] = tex[1];
            uv[p4 + 2] = tex[2];
            uv[p4 + 3] = tex[3];
            c[c2] = light[0];
            c[c2 + 1] = light[1];
        }
        this.Dirty(_slot);
    }
    CreateChannel() {
        const ci = this.mMeshDataNode.ci;
        ci.Create(CVertexFormat.eIdentifier.Position);
        ci.Create(CVertexFormat.eIdentifier.UV);
        ci.Create(CVertexFormat.eIdentifier.Color);
    }
    Stride(_buf) {
        const I = CVertexFormat.eIdentifier;
        switch (_buf.vfType) {
            case I.Position:
            case I.UV: return 4;
            case I.Color: return 2;
        }
        return super.Stride(_buf);
    }
    SlotVertex(_key) { return CPaintVoxel.sFaceVertex; }
    SlotIndex(_key) { return CPaintVoxel.sFaceVertex; }
    WriteIndex(_key, _iStart, _vStart) {
        const ib = this.Buf(CVertexFormat.eIdentifier.Index).bufI;
        for (let j = 0; j < CPaintVoxel.sFaceVertex; ++j)
            ib[_iStart + j] = _vStart + j;
    }
    ZeroPos(_vs, _vc) {
        if (_vc <= 0)
            return;
        const p = this.F32(CVertexFormat.eIdentifier.Position);
        if (p == null)
            return;
        for (let i = _vs * 4 + 3, e = (_vs + _vc) * 4; i < e; i += 4)
            p[i] = CVoxPlane.eDir.Null;
    }
    RenderAttr(_vf) {
        const bmgr = this.mOwner.GetFrame().BMgr();
        bmgr.SetBatchSA(new CShaderAttr("worldMat", this.GetFMat()));
        bmgr.SetBatchSA(new CShaderAttr("size", this.mSize));
        if (_vf.mUniform.get("material") != null)
            bmgr.SetBatchSA(new CShaderAttr("material", this.mMaterial));
    }
}

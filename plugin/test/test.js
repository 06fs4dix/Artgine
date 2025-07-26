import { CClass } from "../../artgine/basic/CClass.js";
import { CEvent } from "../../artgine/basic/CEvent.js";
import { CObject } from "../../artgine/basic/CObject.js";
import { CPool } from "../../artgine/basic/CPool.js";
import { CPaint2D } from "../../artgine/canvas/component/paint/CPaint2D.js";
import { CRPAuto, CRPMgr } from "../../artgine/canvas/CRPMgr.js";
import { CSubject } from "../../artgine/canvas/subject/CSubject.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CPluging } from "../../artgine/util/CPluging.js";
export class CTest extends CObject {
    v = "test class";
}
CClass.Push(CTest);
var gRPMgr = new CRPMgr();
var gUVRPMgr = new CRPMgr();
CPluging.PushEvent(CEvent.eType.Load, () => {
    CFrame.Main().Load().Load(CPluging.FindPath("test") + "up-arrow-2.png");
    CFrame.Main().Load().Load(CPluging.FindPath("test") + "TestShader.ts");
    let rp = new CRPAuto();
    rp.mShader = CPluging.FindPath("test") + "TestShader.ts";
    rp.PushAutoPaint(CPaint2D);
    gRPMgr.mRPArr.push(rp);
    CFrame.Main().Res().Push("testRPMgr", gRPMgr);
    rp = new CRPAuto();
    rp.mShader = CPluging.FindPath("test") + "TestShader.ts";
    rp.PushAutoPaint(CPaint2D);
    rp.mTag = "uv";
    gUVRPMgr.mRPArr.push(rp);
    CFrame.Main().Res().Push("testUVRPMgr", gUVRPMgr);
});
CPool.On("test", () => {
    let sub = new CSubject();
    sub.PushComp(new CPaint2D(CPluging.FindPath("test") + "up-arrow-2.png"));
    return sub;
}, CPool.ePool.Product);

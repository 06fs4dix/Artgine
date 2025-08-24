import { CAlert } from "https://06fs4dix.github.io/Artgine/artgine/basic/CAlert.js";
import { CEvent } from "https://06fs4dix.github.io/Artgine/artgine/basic/CEvent.js";
import { CLan } from "https://06fs4dix.github.io/Artgine/artgine/basic/CLan.js";
import { CAtelier } from "https://06fs4dix.github.io/Artgine/artgine/canvas/CAtelier.js";
import { CColor } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/CColor.js";
import { CPaint2D } from "https://06fs4dix.github.io/Artgine/artgine/canvas/component/paint/CPaint2D.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/canvas/subject/CSubject.js";
import { CMath } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CMath.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CH5Canvas } from "https://06fs4dix.github.io/Artgine/artgine/render/CH5Canvas.js";
import { CInput } from "https://06fs4dix.github.io/Artgine/artgine/system/CInput.js";
let gAtl = CAtelier.Main();
CLan.Set(CLan.eType.en, "Test0", "Code has been executed.");
CAlert.Info(CLan.Get("Test0", "Code를 실행했습니다."), 1000 * 10);
let can = gAtl.Canvas("2DCan");
can.Clear();
let sub = can.Push(new CSubject());
let pt = sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex(), new CVec2(100, 100)));
sub.SetPos(new CVec3(200, 200));
pt.SetColorModel(new CColor(0, 1, 0, CColor.eModel.RGBMul));
CH5Canvas.Init(256, 256);
CH5Canvas.FillStyle("green");
CH5Canvas.FillRect(0, 0, 256, 256);
CH5Canvas.FillStyle("orange");
CH5Canvas.FillText(128, 128, "test", 128);
CH5Canvas.Draw();
let tex = CH5Canvas.GetNewTex();
gAtl.Frame().Ren().BuildTexture(tex);
gAtl.Frame().Res().Push("test.tex", tex);
sub = can.Push(new CSubject());
pt = sub.PushComp(new CPaint2D("test.tex", new CVec2(100, 100)));
sub.SetPos(new CVec3(-200, 200));
gAtl.Frame().PushEvent(CEvent.eType.Update, () => {
    let tick = 5;
    if (gAtl.Frame().Input().KeyDown(CInput.eKey.Left))
        sub.SetPos(CMath.V3AddV3(new CVec3(-tick, 0), sub.GetPos()));
    if (gAtl.Frame().Input().KeyDown(CInput.eKey.Right))
        sub.SetPos(CMath.V3AddV3(new CVec3(tick, 0), sub.GetPos()));
    if (gAtl.Frame().Input().KeyDown(CInput.eKey.Up))
        sub.SetPos(CMath.V3AddV3(new CVec3(0, tick), sub.GetPos()));
    if (gAtl.Frame().Input().KeyDown(CInput.eKey.Down))
        sub.SetPos(CMath.V3AddV3(new CVec3(0, -tick, 0), sub.GetPos()));
});

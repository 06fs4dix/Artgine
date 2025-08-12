//Version
const version='2025-08-10 15:49:08';
import "../../../artgine/artgine.js"

//Class
import {CClass} from "../../../artgine/basic/CClass.js";

//Atelier
import {CPreferences} from "../../../artgine/basic/CPreferences.js";


import {CPlugin} from "../../../artgine/util/CPlugin.js";
var gAtl = new CAtelier();
await gAtl.Init([]);

//EntryPoint
import {CObject} from "../../../artgine/basic/CObject.js"
import {CAtelier} from "../../../artgine/canvas/CAtelier.js";
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
let Main=gAtl.NewCanvas("Main");
Main.SetCameraKey(gAtl.Brush().GetCam2D().Key());

let sub=Main.Push(new CSubject());
sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex(),new CVec2(100,100)));

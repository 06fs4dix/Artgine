import { Build, CVec4, Null, V4MulMatCoordi, invocationID, } from "./Shader";
var vN = Null();
var local = Null();
var oidx = Null();
var mats = Null();
var dst = Null();
Build("Artgine/Compute/PosTransform", [], pos_main, [vN, local, oidx, mats, dst], [], null, []);
function pos_main() {
    var i = invocationID;
    if (i >= vN)
        return;
    var b = i * 3.0;
    var o = V4MulMatCoordi(new CVec4(local[b], local[b + 1.0], local[b + 2.0], 1.0), mats[oidx[i]]);
    dst[b] = o.x;
    dst[b + 1.0] = o.y;
    dst[b + 2.0] = o.z;
}

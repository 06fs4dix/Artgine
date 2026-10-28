import { SDF } from "../../artgine/z_file/SDF";
import { Build, CVec3, CVec4, Null, Sam2DArrLodToCubeColor, V2MulFloat, V3AddV3, V3SubV3, V3MulFloat, V3Dot, V3Nor, V3Cross, FloatToInt, IntToFloat, floor, cos, sin, Exp } from "../../artgine/z_file/Shader";
var to_uv = Null();
var out_position = Null();
var out_color = Null();
var ebFace = Null();
var ebSize = Null();
var ebLayer = Null();
var ebSrcLod = Null();
var ebCount = Null();
var ebRadPerPx = Null();
var ebSigmaPx = Null();
var ebStride = Null();
var ebLat = Null();
var ebPole = Null();
Build("EnvmapGPU/Blur", ["envblur"], vs_main, [
    ebFace, ebSize, ebLayer, ebSrcLod, ebCount, ebRadPerPx, ebSigmaPx, ebStride, ebLat, ebPole
], [out_position, to_uv], ps_main, [out_color]);
function vs_main(f3_ver, f2_uv) {
    to_uv = f2_uv;
    out_position = new CVec4(V2MulFloat(f3_ver.xy, 2.0), 0.0, 1.0);
}
function FaceDir(_f, _u, _v) {
    if (_f < 0.5)
        return new CVec3(1.0, _v, _u);
    if (_f < 1.5)
        return new CVec3(-1.0, _v, -_u);
    if (_f < 2.5)
        return new CVec3(_u, 1.0, _v);
    if (_f < 3.5)
        return new CVec3(_u, -1.0, -_v);
    if (_f < 4.5)
        return new CVec3(-_u, _v, 1.0);
    return new CVec3(_u, _v, -1.0);
}
function SampleSrc(_dir) {
    return Sam2DArrLodToCubeColor(SDF.eTexSlot.ArrEnvmap, _dir, ebLayer, ebSrcLod).rgb;
}
function ps_main() {
    var c = (ebSize - 1.0) * 0.5;
    var k = 0.0;
    if (ebSize > 1.5)
        k = 1.0 / c;
    var px = floor(to_uv.x * ebSize);
    var py = floor(to_uv.y * ebSize);
    var od = V3Nor(FaceDir(ebFace, (px - c) * k, (py - c) * k));
    var ax = ebPole;
    if (ebLat < 0.5)
        ax = V3Cross(ebPole, od);
    if (V3Dot(ax, ax) < 0.000001)
        ax = new CVec3(od.z, 0.0, -od.x);
    ax = V3Nor(ax);
    var dp = V3Dot(ax, od);
    var cx = V3Cross(ax, od);
    var tot = SampleSrc(od);
    var sum = 1.0;
    var count;
    count.dummy = FloatToInt(ebCount);
    for (var s = 1; s < 32; ++s) {
        if (s >= count.dummy)
            break;
        var fs = IntToFloat(s) * ebStride;
        var x = fs / ebSigmaPx;
        var w = Exp(-0.5 * x * x);
        var th = ebRadPerPx * fs;
        var cs = cos(th);
        var sn = sin(th);
        var b = V3AddV3(V3MulFloat(od, cs), V3MulFloat(ax, dp * (1.0 - cs)));
        var off = V3MulFloat(cx, sn);
        tot = V3AddV3(tot, V3MulFloat(V3AddV3(SampleSrc(V3AddV3(b, off)), SampleSrc(V3SubV3(b, off))), w));
        sum += 2.0 * w;
    }
    out_color = new CVec4(V3MulFloat(tot, 1.0 / sum), 1.0);
}

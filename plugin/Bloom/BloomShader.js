import { Build, CVec2, CVec3, CVec4, Null, Sam2D0ToColor, Sam2DSize, V2MulFloat, V3AddV3, V3Dot, V3MulFloat, clamp, max, pow } from "../../artgine/z_file/Shader";
var worldMat = Null();
var viewMat = Null();
var projectMat = Null();
var to_uv = new CVec2(0.0, 0.0);
var out_position = new CVec4(0.0, 0.0, 0.0, 0.0);
var out_color = new CVec4(0.0, 0.0, 0.0, 0.0);
var mipLevel = Null();
var threshold = Null();
var softThreshold = Null();
var blendFactor = Null();
Build("Bloom/Shader/DownSample", ["down"], vs_main, [
    worldMat, viewMat, projectMat,
    mipLevel,
    threshold, softThreshold
], [out_position, to_uv], ps_main_DownSample, [out_color]);
Build("Bloom/Shader/UpSample", ["up"], vs_main, [
    worldMat, viewMat, projectMat,
    blendFactor
], [out_position, to_uv], ps_main_UpSample, [out_color]);
function vs_main(f3_ver, f2_uv) {
    to_uv = f2_uv;
    out_position = new CVec4(V2MulFloat(f3_ver.xy, 2.0), 0.0, 1.0);
}
function TosRGB(_col) {
    return new CVec3(pow(_col.x, 1.0 / 2.2), pow(_col.y, 1.0 / 2.2), pow(_col.z, 1.0 / 2.2));
}
function tonemapping_luminance(_col) {
    return V3Dot(_col, new CVec3(0.2126, 0.7152, 0.0722));
}
function KarisAverage(_col) {
    var sRGB = TosRGB(_col);
    var luman = tonemapping_luminance(sRGB) / 4.0;
    return 1.0 / (1.0 + luman);
}
function PreFilter(_col) {
    var brightness = max(max(_col.x, _col.y), _col.z);
    var knee = threshold * softThreshold;
    var softness = brightness - (threshold - knee);
    softness = clamp(softness, 0.0, 2.0 * knee);
    softness = softness * softness / (4.0 * knee + 0.00001);
    var contribution = max(brightness - threshold, softness);
    contribution /= max(brightness, 0.00001);
    return V3MulFloat(_col, contribution);
}
function ps_main_DownSample() {
    var texSize = Sam2DSize(0.0);
    var x = 1.0 / texSize.x;
    var y = 1.0 / texSize.y;
    var uvx = to_uv.x;
    var uvy = to_uv.y;
    var a = Sam2D0ToColor(new CVec2(uvx - 2.0 * x, uvy + 2.0 * y)).rgb;
    var b = Sam2D0ToColor(new CVec2(uvx, uvy + 2.0 * y)).rgb;
    var c = Sam2D0ToColor(new CVec2(uvx + 2.0 * x, uvy + 2.0 * y)).rgb;
    var d = Sam2D0ToColor(new CVec2(uvx - 2.0 * x, uvy)).rgb;
    var e = Sam2D0ToColor(new CVec2(uvx, uvy)).rgb;
    var f = Sam2D0ToColor(new CVec2(uvx + 2.0 * x, uvy)).rgb;
    var g = Sam2D0ToColor(new CVec2(uvx - 2.0 * x, uvy - 2.0 * y)).rgb;
    var h = Sam2D0ToColor(new CVec2(uvx, uvy - 2.0 * y)).rgb;
    var i = Sam2D0ToColor(new CVec2(uvx + 2.0 * x, uvy - 2.0 * y)).rgb;
    var j = Sam2D0ToColor(new CVec2(uvx - 1.0 * x, uvy + 1.0 * y)).rgb;
    var k = Sam2D0ToColor(new CVec2(uvx + 1.0 * x, uvy + 1.0 * y)).rgb;
    var l = Sam2D0ToColor(new CVec2(uvx - 1.0 * x, uvy - 1.0 * y)).rgb;
    var m = Sam2D0ToColor(new CVec2(uvx + 1.0 * x, uvy - 1.0 * y)).rgb;
    if (mipLevel < 0.5) {
        var g0 = V3MulFloat(V3AddV3(V3AddV3(a, b), V3AddV3(d, e)), 0.125 / 4.0);
        var g1 = V3MulFloat(V3AddV3(V3AddV3(b, c), V3AddV3(e, f)), 0.125 / 4.0);
        var g2 = V3MulFloat(V3AddV3(V3AddV3(d, e), V3AddV3(g, h)), 0.125 / 4.0);
        var g3 = V3MulFloat(V3AddV3(V3AddV3(e, f), V3AddV3(h, i)), 0.125 / 4.0);
        var g4 = V3MulFloat(V3AddV3(V3AddV3(j, k), V3AddV3(l, m)), 0.5 / 4.0);
        g0 = V3MulFloat(g0, KarisAverage(g0));
        g1 = V3MulFloat(g1, KarisAverage(g1));
        g2 = V3MulFloat(g2, KarisAverage(g2));
        g3 = V3MulFloat(g3, KarisAverage(g3));
        g4 = V3MulFloat(g4, KarisAverage(g4));
        out_color.rgb = V3AddV3(V3AddV3(V3AddV3(g0, g1), V3AddV3(g2, g3)), g4);
        out_color.rgb = PreFilter(out_color.rgb);
    }
    else {
        out_color.rgb = V3MulFloat(e, 0.125);
        out_color.rgb = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(a, c), V3AddV3(g, i)), 0.03125));
        out_color.rgb = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(b, d), V3AddV3(f, h)), 0.0625));
        out_color.rgb = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(j, k), V3AddV3(l, m)), 0.125));
    }
    out_color.w = 1.0;
}
function ps_main_UpSample() {
    var texSize = Sam2DSize(0.0);
    var x = 1.0 / texSize.x;
    var y = 1.0 / texSize.y;
    var uvx = to_uv.x;
    var uvy = to_uv.y;
    var a = Sam2D0ToColor(new CVec2(uvx - x, uvy + y)).rgb;
    var b = Sam2D0ToColor(new CVec2(uvx, uvy + y)).rgb;
    var c = Sam2D0ToColor(new CVec2(uvx + x, uvy + y)).rgb;
    var d = Sam2D0ToColor(new CVec2(uvx - x, uvy)).rgb;
    var e = Sam2D0ToColor(new CVec2(uvx, uvy)).rgb;
    var f = Sam2D0ToColor(new CVec2(uvx + x, uvy)).rgb;
    var g = Sam2D0ToColor(new CVec2(uvx - x, uvy - y)).rgb;
    var h = Sam2D0ToColor(new CVec2(uvx, uvy - y)).rgb;
    var i = Sam2D0ToColor(new CVec2(uvx + x, uvy - y)).rgb;
    var col = V3MulFloat(e, 0.25);
    col = V3AddV3(col, V3MulFloat(V3AddV3(V3AddV3(b, d), V3AddV3(f, h)), 0.125));
    col = V3AddV3(col, V3MulFloat(V3AddV3(V3AddV3(a, c), V3AddV3(g, i)), 0.0625));
    col = V3MulFloat(col, blendFactor);
    out_color.rgb = col;
    out_color.w = blendFactor;
}

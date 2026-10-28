import {
    Build, CMat, CVec2, CVec3, CVec4, Null, OutColor, OutPosition, ToV2, UV2, Vertex3,
    Sam2D0ToColor, Sam2DSize, V2MulFloat, V3AddV3, V3Dot, V3MulFloat,
    clamp, max, pow
} from "../../artgine/z_file/Shader";

var worldMat : CMat=Null();
var viewMat : CMat=Null();
var projectMat : CMat=Null();

var to_uv : ToV2 = new CVec2(0.0, 0.0);

var out_position : OutPosition = new CVec4(0.0, 0.0, 0.0, 0.0);
var out_color : OutColor = new CVec4(0.0, 0.0, 0.0, 0.0);

var mipLevel : number=Null();
var threshold : number=Null();
var softThreshold : number=Null();

var blendFactor : number=Null();

//https://catlikecoding.com/unity/tutorials/advanced-rendering/
Build("Bloom/Shader/DownSample",["down"],
    vs_main, [
        worldMat,viewMat,projectMat,
        mipLevel,
        threshold,softThreshold
    ],[out_position,to_uv],
    ps_main_DownSample,[out_color]);
Build("Bloom/Shader/UpSample",["up"],
    vs_main, [
        worldMat,viewMat,projectMat,
        blendFactor
    ],[out_position,to_uv],
    ps_main_UpSample,[out_color]);

function vs_main(f3_ver : Vertex3, f2_uv : UV2) {
    to_uv = f2_uv;
    out_position = new CVec4(V2MulFloat(f3_ver.xy, 2.0), 0.0, 1.0);
}


function TosRGB(_col : CVec3) : CVec3 {
    return new CVec3(pow(_col.x, 1.0/2.2),pow(_col.y, 1.0/2.2),pow(_col.z, 1.0/2.2));
}

function tonemapping_luminance(_col : CVec3) : number {
    return V3Dot(_col, new CVec3(0.2126, 0.7152, 0.0722));
}

function KarisAverage(_col : CVec3) : number {
    var sRGB : CVec3 = TosRGB(_col);
    var luman : number = tonemapping_luminance(sRGB) / 4.0;
    return 1.0 / (1.0 + luman);
}

function PreFilter(_col : CVec3) : CVec3 {
    var brightness : number = max(max(_col.x, _col.y), _col.z);
    var knee : number = threshold * softThreshold;
    var softness : number = brightness - (threshold - knee);
    softness = clamp(softness, 0.0, 2.0 * knee);
    softness = softness * softness / (4.0 * knee + 0.00001);
    var contribution : number= max(brightness - threshold, softness);
    contribution /= max(brightness, 0.00001);
    return V3MulFloat(_col, contribution);
}

/**     샘플링 방법
 *      a   1   b   3   c
 *      5   j   7   k   9
 *      d   11  e   13  f 
 *      15  l   17  m   19
 *      g   21  h   23  i
 * 
 *      point   :   weight  :   sum
 *      j,k,l,m :   0.125   :   0.125*4=0.5
 * 
 *      b,d,f,h :   0.0625  :   0.0625*4=0.25
 * 
 *      a,c,g,i :   0.03125 :   0.03125*4=0.125
 * 
 *      e       :   0.125   :   0.125
 * 
 */

function ps_main_DownSample() {
    var texSize : CVec2 = Sam2DSize(0.0);
    var x : number = 1.0 / texSize.x;
    var y : number = 1.0 / texSize.y;

    var uvx : number = to_uv.x;
    var uvy : number = to_uv.y;

    // 5x5 텐트형 표본(대칭 유지, half-texel 불가산)
    var a : CVec3 = Sam2D0ToColor(new CVec2(uvx - 2.0*x, uvy + 2.0*y)).rgb;
    var b : CVec3 = Sam2D0ToColor(new CVec2(uvx         , uvy + 2.0*y)).rgb;
    var c : CVec3 = Sam2D0ToColor(new CVec2(uvx + 2.0*x, uvy + 2.0*y)).rgb;

    var d : CVec3 = Sam2D0ToColor(new CVec2(uvx - 2.0*x, uvy          )).rgb;
    var e : CVec3 = Sam2D0ToColor(new CVec2(uvx         , uvy          )).rgb; // center
    var f : CVec3 = Sam2D0ToColor(new CVec2(uvx + 2.0*x, uvy          )).rgb;

    var g : CVec3 = Sam2D0ToColor(new CVec2(uvx - 2.0*x, uvy - 2.0*y)).rgb;
    var h : CVec3 = Sam2D0ToColor(new CVec2(uvx         , uvy - 2.0*y)).rgb;
    var i : CVec3 = Sam2D0ToColor(new CVec2(uvx + 2.0*x, uvy - 2.0*y)).rgb;

    var j : CVec3 = Sam2D0ToColor(new CVec2(uvx - 1.0*x, uvy + 1.0*y)).rgb;
    var k : CVec3 = Sam2D0ToColor(new CVec2(uvx + 1.0*x, uvy + 1.0*y)).rgb;
    var l : CVec3 = Sam2D0ToColor(new CVec2(uvx - 1.0*x, uvy - 1.0*y)).rgb;
    var m : CVec3 = Sam2D0ToColor(new CVec2(uvx + 1.0*x, uvy - 1.0*y)).rgb;

    if (mipLevel < 0.5) {
        var g0 : CVec3 = V3MulFloat(V3AddV3(V3AddV3(a,b), V3AddV3(d,e)), 0.125/4.0);
        var g1 : CVec3 = V3MulFloat(V3AddV3(V3AddV3(b,c), V3AddV3(e,f)), 0.125/4.0);
        var g2 : CVec3 = V3MulFloat(V3AddV3(V3AddV3(d,e), V3AddV3(g,h)), 0.125/4.0);
        var g3 : CVec3 = V3MulFloat(V3AddV3(V3AddV3(e,f), V3AddV3(h,i)), 0.125/4.0);
        var g4 : CVec3 = V3MulFloat(V3AddV3(V3AddV3(j,k), V3AddV3(l,m)), 0.5/4.0);

        g0 = V3MulFloat(g0, KarisAverage(g0));
        g1 = V3MulFloat(g1, KarisAverage(g1));
        g2 = V3MulFloat(g2, KarisAverage(g2));
        g3 = V3MulFloat(g3, KarisAverage(g3));
        g4 = V3MulFloat(g4, KarisAverage(g4));

        out_color.rgb = V3AddV3(V3AddV3(V3AddV3(g0, g1), V3AddV3(g2, g3)), g4);
        out_color.rgb = PreFilter(out_color.rgb);  // mip0에서만
    } else {
        out_color.rgb  = V3MulFloat(e, 0.125);
        out_color.rgb  = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(a,c), V3AddV3(g,i)), 0.03125));
        out_color.rgb  = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(b,d), V3AddV3(f,h)), 0.0625));
        out_color.rgb  = V3AddV3(out_color.rgb, V3MulFloat(V3AddV3(V3AddV3(j,k), V3AddV3(l,m)), 0.125));
    }

    out_color.w = 1.0;
}
/**     샘플링 방법
 *      
 *      a   b   c
 *      d   e   f
 *      g   h   i
 * 
 *      point   :   weight  :   sum
 *      e       :   0.25    :   0.25
 *      b,d,f,h :   0.125   :   0.125*4=0.5
 *      a,c,g,i :   0.0625  :   0.0625*4=0.25
 * 
 */
function ps_main_UpSample() {
    var texSize : CVec2 = Sam2DSize(0.0);
    var x : number = 1.0 / texSize.x;
    var y : number = 1.0 / texSize.y;

    var uvx : number = to_uv.x;
    var uvy : number = to_uv.y;

    var a : CVec3 = Sam2D0ToColor(new CVec2(uvx - x, uvy + y)).rgb;
    var b : CVec3 = Sam2D0ToColor(new CVec2(uvx    , uvy + y)).rgb;
    var c : CVec3 = Sam2D0ToColor(new CVec2(uvx + x, uvy + y)).rgb;

    var d : CVec3 = Sam2D0ToColor(new CVec2(uvx - x, uvy    )).rgb;
    var e : CVec3 = Sam2D0ToColor(new CVec2(uvx    , uvy    )).rgb;
    var f : CVec3 = Sam2D0ToColor(new CVec2(uvx + x, uvy    )).rgb;

    var g : CVec3 = Sam2D0ToColor(new CVec2(uvx - x, uvy - y)).rgb;
    var h : CVec3 = Sam2D0ToColor(new CVec2(uvx    , uvy - y)).rgb;
    var i : CVec3 = Sam2D0ToColor(new CVec2(uvx + x, uvy - y)).rgb;

    var col : CVec3 = V3MulFloat(e, 0.25);
    col = V3AddV3(col, V3MulFloat(V3AddV3(V3AddV3(b,d), V3AddV3(f,h)), 0.125));
    col = V3AddV3(col, V3MulFloat(V3AddV3(V3AddV3(a,c), V3AddV3(g,i)), 0.0625));

    // (현재 ONE,ONE) → 프리멀티로 팩터 적용
    col = V3MulFloat(col, blendFactor);

    out_color.rgb = col;
    out_color.w   = blendFactor; // 정보용
}

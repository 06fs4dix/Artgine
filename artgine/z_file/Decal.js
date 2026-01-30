import { CVec2, CVec4, Sam2DToColor, Null, V3AddV3, V3MulFloat, V4MulFloat, V4MulMatCoordi } from "./Shader";
export var decalParam = Null();
export var decalInvWorldMat = Null();
export function DecalCac(_color, _worldPos) {
    var decalLocalPos = V4MulMatCoordi(_worldPos, decalInvWorldMat);
    decalLocalPos = V4MulFloat(decalLocalPos, 1.0 / decalLocalPos.w);
    if (decalLocalPos.x <= -1.0 ||
        decalLocalPos.x >= +1.0 ||
        decalLocalPos.y <= -1.0 ||
        decalLocalPos.y >= +1.0 ||
        decalLocalPos.z <= -1.0 ||
        decalLocalPos.z >= +1.0) {
        return _color;
    }
    var decalUV = new CVec2(decalLocalPos.x * -0.5 + 0.5, decalLocalPos.y * 0.5 + 0.5);
    var decalColor = decalParam;
    if (decalParam.w > 9.5) {
        decalColor = Sam2DToColor(decalParam.x, decalUV);
    }
    return new CVec4(V3AddV3(V3MulFloat(decalColor.rgb, decalColor.a), V3MulFloat(_color.rgb, 1.0 - decalColor.a)), decalColor.a + _color.a * (1.0 - decalColor.a));
}

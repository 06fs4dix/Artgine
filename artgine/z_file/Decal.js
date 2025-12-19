import { CVec2, CVec3, CVec4, Null, Sam2DToColor, V3AddV3, V3MulFloat, V4MulFloat, V4MulMatCoordi } from "./Shader";
export var decalParam = Null();
export var decalInvWorldMat = Null();
export function DecalCac(_color, _worldPos) {
    var decalLocalPos = V4MulMatCoordi(_worldPos, decalInvWorldMat);
    decalLocalPos = V4MulFloat(decalLocalPos, 1.0 / decalLocalPos.w);
    var decalUV = V3AddV3(V3MulFloat(decalLocalPos.xyz, 0.5), new CVec3(0.5, 0.5, 0.5));
    if (decalUV.x < 0.0 || decalUV.x > 1.0 || decalUV.y < 0.0 || decalUV.y > 1.0 || decalUV.z < 0.0 || decalUV.z > 1.0) {
        return _color;
    }
    var decalColor = decalParam;
    if (decalParam.w > 9.5) {
        decalColor = Sam2DToColor(decalParam.x, new CVec2(1.0 - decalUV.x, 1.0 - decalUV.z));
    }
    return new CVec4(V3AddV3(V3MulFloat(decalColor.rgb, decalColor.a), V3MulFloat(_color.rgb, 1.0 - decalColor.a)), decalColor.a + _color.a * (1.0 - decalColor.a));
}

import { 
    CMat, CVec2, CVec3, CVec4, 
    Null, 
    Sam2DToColor,
    V3AddV3, V3MulFloat, V4MulFloat, V4MulMatCoordi 
} from "./Shader";

export var decalParam: CVec4=Null(); // 데칼텍스쳐인덱스x
export var decalInvWorldMat: CMat=Null();

export function DecalCac(_color : CVec4, _worldPos : CVec4) : CVec4
{
    // 데칼 로컬 공간 좌표 계산
    var decalLocalPos : CVec4 = V4MulMatCoordi(_worldPos, decalInvWorldMat);
    decalLocalPos = V4MulFloat(decalLocalPos, 1.0 / decalLocalPos.w);

    // 데칼 UV 계산
    var decalUV : CVec3 = V3AddV3(V3MulFloat(decalLocalPos.xyz, 0.5), new CVec3(0.5, 0.5, 0.5));

    // 범위 검사
    if(decalUV.x < 0.0 || decalUV.x > 1.0 || decalUV.y < 0.0 || decalUV.y > 1.0 || decalUV.z < 0.0 || decalUV.z > 1.0)
    {
        return _color;
    }
    
    // 데칼 텍스쳐 샘플링
    var decalColor : CVec4 = decalParam;
    if(decalParam.w > 9.5) {
       decalColor = Sam2DToColor(decalParam.x, new CVec2(1.0 - decalUV.x, 1.0 - decalUV.z));
    }

    // 블렌딩
    return new CVec4(
        V3AddV3(
            V3MulFloat(decalColor.rgb, decalColor.a),
            V3MulFloat(_color.rgb, 1.0 - decalColor.a)
        ),
        decalColor.a + _color.a * (1.0 - decalColor.a)
    );
}
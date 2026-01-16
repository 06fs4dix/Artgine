import { ligDir } from "./Light";
import { abs, CMat, cos, CVec2, CVec3, CVec4, fract, mix, round, Sam2DArrSize, Sam2DArrToColor, Sam2DMat, Sam2DToColor, Sam2DToMat, Sam2DToV4, Sam2DV4, screenPos, ShadowPosToUv, 
    sin, V2AddV2, V2DivFloat, V2Dot, V2Fract, V2MulFloat, V3AddV3, V3Dot, V3MulFloat, V3Nor, V4MulMatCoordi } from "./Shader";

export var shadowNearCasV0: Sam2DMat=new Sam2DMat(11,252);
export var shadowFarCasP0: Sam2DMat=new Sam2DMat(11,256);
export var shadowTopCasV1: Sam2DMat=new Sam2DMat(11,260);
export var shadowBottomCasP1: Sam2DMat=new Sam2DMat(11,264);
export var shadowLeftCasV2: Sam2DMat=new Sam2DMat(11,268);
export var shadowRightCasP2: Sam2DMat=new Sam2DMat(11,272);
export var shadowPointProj: Sam2DMat=new Sam2DMat(11,276);

//shadow uniform
export var shadowOn : number = -1.0;
export var shadowReadList: Sam2DV4=new Sam2DV4(11,280);

//uniform
export var texture16f : number =0;

//아래 두개는 쉐도우맵 곗수. 케스케이드 유무이다 총 3장 사용
export var shadowCount : number = 0;
export var shadowWrite : CVec3 = new CVec3(0,0,0);

//최대 쉐도우 색상
export var shadowRate : number = 0.3;
//오차범위 : 이걸 높이면 더 많은 오차를 그림자 영역으로 만듬
export var bias : number = 5.0;
//노말값에서 보정받을 오차범위(빛에 방향으로 인해 오차가 생기는걸 보정받음)
export var normalBias : number = 1.0;
//percentage-closer filtering 
//경계면을 샘플링 해서 다듬는다. 다듬는 횟수
export var PCF : number = 2.0;
export var jitter : number = 0.0;

// function UVHash(p : CVec2) : number
// {
//     p = V2Fract(new CVec2(123.34*p.x, 456.21*p.y));
//     let p2 = V2Dot(p,new CVec2(p.x + 45.32,p.y + 45.32));
    
//     return fract((p.x+p2) * (p.y+p2));
// }
// function randomJitter(fragCoord: CVec2) : CVec2
// {
//     var r1 : number = UVHash(fragCoord);
//     var r2 : number = UVHash(new CVec2(fragCoord.x + 13.37,fragCoord.y+13.37));
//     // -0.5 ~ 0.5 사이로 변환
//     return new CVec2(r1 - 0.5, r2 - 0.5);
// }

// 2D 해시 → 2D 난수 (0~1) 생성
function Hash22(p : CVec2) : CVec2
{
    // 화면좌표/격자 좌표 등 연속 좌표와 잘 맞는 정사영 해시
    // (정수 변환 없이 dot+sin 기반이라 WebGL 정밀도에서 안정적)
    var n1 : number = V2Dot(p, new CVec2(127.1, 311.7));
    var n2 : number = V2Dot(p, new CVec2(269.5, 183.3));
    var h1 : number = fract(sin(n1) * 43758.5453);
    var h2 : number = fract(sin(n2) * 43758.5453);
    return new CVec2(h1, h2);
}

// 프래그먼트(또는 화면) 좌표 기반 난수 지터 (-0.5 ~ 0.5)
function randomJitter(fragCoord : CVec2,_strength : number) : CVec2
{
    // 기존 시그니처/반환 범위를 유지해 ApplyPCF에 바로 연동 가능
    var h : CVec2 = Hash22(fragCoord);
    return new CVec2((h.x - 0.5)*_strength, (h.y - 0.5)*_strength);
}
function ApplyPCF(_uvZ0 : CVec3, _uvZ1 : CVec3, _uvZ2 : CVec3, _read : CVec4, _biasAll : number) : CVec2
{
    var f16Chk : number=1.0;
    if(texture16f>0.0)	f16Chk=4.0;


    


    var texSize : CVec3 = Sam2DArrSize(0.0);
    var texScale : CVec2 = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);

    var sVal : number = 0.0;
    var count : number = 0.0;

    var x : number = -PCF;
    var depthChk : number=0.0;

    var jitterValue : CVec2;
    
    
    for(; x <= PCF + 0.5; x += 1.0) 
    {
        var y : number = -PCF;
        for(; y <= PCF + 0.5; y += 1.0) 
        {
            
            
            if(jitter>0.01)
            {
                jitterValue=randomJitter(new CVec2(x+screenPos.x, y+screenPos.y),jitter);
                //x+=jitterValue.x;
                //y+=jitterValue.y;
            }

            var uv0N : CVec3 = new CVec3(_uvZ0.x + (x+jitterValue.x) * texScale.x, _uvZ0.y + (y+jitterValue.y) * texScale.y,_read.y);
            var uv1N : CVec3 = new CVec3(_uvZ1.x + x * texScale.x, _uvZ1.y + y * texScale.y,_read.z);
            var uv2N : CVec3 = new CVec3(_uvZ2.x + x * texScale.x, _uvZ2.y + y * texScale.y,_read.w);


            //uv0N.x -= texScale.x;
            //uv0N.y -= texScale.y * 0.5;

            if(_read.y>-0.5 && uv0N.x>0.0 && uv0N.y>0.0 && uv0N.x<1.0 && uv0N.y<1.0)
            {
                var shadowParam : CVec4 = Sam2DArrToColor(0.0, uv0N);
                var depth : number = shadowParam.z;			

                if(shadowParam.w==0.0)    sVal+=1.0;
                else sVal += (_uvZ0.z + _biasAll*f16Chk) >= depth ? 1.0 : 0.0;
                count += 1.0;
                

                
            }
            else if(_read.z>-0.5 && uv1N.x>0.0 && uv1N.y>0.0 && uv1N.x<1.0 && uv1N.y<1.0)
            {
                var shadowParam : CVec4 = Sam2DArrToColor(0.0, uv1N);
                var depth : number = shadowParam.z;			

                if(shadowParam.w==0.0)    sVal+=1.0;
                else sVal += (_uvZ1.z + _biasAll *f16Chk*2.0) >= depth ? 1.0 : 0.0;

                count += 1.0;
                
                if(shadowParam.w==0.0)    sVal+=1.0;
            }
            else if(_read.w>-0.5 && uv2N.x>0.0 && uv2N.y>0.0 && uv2N.x<1.0 && uv2N.y<1.0)
            {
                var shadowParam : CVec4 = Sam2DArrToColor(0.0, uv2N);
                var depth : number = shadowParam.z;			
        
                if(shadowParam.w==0.0)    sVal+=1.0;
                else sVal += (_uvZ2.z + _biasAll *f16Chk*4.0) >= depth ? 1.0 : 0.0;

                count += 1.0;
            }
        }
    }

    return new CVec2(sVal, count);
}

function ApplyJitteredPCF(_uvZ0 : CVec3, _uvZ1 : CVec3, _uvZ2 : CVec3, _read : CVec4, _biasAll : number, _worldPos : CVec4) : CVec2
{
    var f16Chk : number=1.0;
    if(texture16f>0.0)	f16Chk=4.0;

    var sVal : number = 0.0;
    var count : number = 0.0;

    var texSize : CVec3 = Sam2DArrSize(0.0);
    var texScale : CVec2 = new CVec2(1.0 / texSize.x, 1.0 / texSize.y);

    var rotAngle : number = sin(round(_worldPos.x/50.0)*50.0 + round(_worldPos.z/50.0)*50.0) * 3.14;
    var sinVal : number = sin(rotAngle);
    var cosVal : number = cos(rotAngle);

    //셰이더에서 계산하면 오래 걸리므로 이것보다 많이 사용하고 싶은 경우 jitter 텍스쳐를 사용해야 함
    var poissonDisk0 : CVec2 =	new CVec2(-0.94201624, -0.39906216);
    var poissonDisk1 : CVec2 =	new CVec2(0.94558609, -0.76890725);
    var poissonDisk2 : CVec2 =	new CVec2(-0.09418410, -0.92938870);
    var poissonDisk3 : CVec2 =	new CVec2(0.34495938, 0.29387760);
    var poissonDisk4 : CVec2 =	new CVec2(-0.91588581, 0.45771432);
    var poissonDisk5 : CVec2 =	new CVec2(-0.81544232, -0.87912464);
    var poissonDisk6 : CVec2 =	new CVec2(-0.38277543, 0.27676845);
    var poissonDisk7 : CVec2 =	new CVec2(0.97484398, 0.75648379);

    //위의 미리 계산을 사용하려면 최대 8을 초과하면 안됨
    var sampleCount : number = 8.0;
    
    var c : number = 0.0;
    for(; c < sampleCount; c += 1.0) {
        var poissonSample: CVec2 = new CVec2(0.0, 0.0);
        if(c < 0.5) {
            poissonSample = poissonDisk0;
        }
        else if(c < 1.5) {
            poissonSample = poissonDisk1;
        }
        else if(c < 2.5) {
            poissonSample = poissonDisk2;
        }
        else if(c < 3.5) {
            poissonSample = poissonDisk3;
        }
        else if(c < 4.5) {
            poissonSample = poissonDisk4;
        }
        else if(c < 5.5) {
            poissonSample = poissonDisk5;
        }
        else if(c < 6.5) {
            poissonSample = poissonDisk6;
        }
        else if(c < 7.5) {
            poissonSample = poissonDisk7;
        }
        else {
            continue;
        }
        // 회전 변환 적용
        var rotatedOffset : CVec2 = new CVec2(
            poissonSample.x * cosVal - poissonSample.y * sinVal,
            poissonSample.x * sinVal + poissonSample.y * cosVal
        );
        
        // 텍스처 크기에 맞게 스케일링
        rotatedOffset.x *= texScale.x * 2.0; // 샘플링 범위 조정 가능
        rotatedOffset.y *= texScale.y * 2.0;
        
        var uv0N : CVec3 = new CVec3(_uvZ0.x + rotatedOffset.x, _uvZ0.y + rotatedOffset.y, _read.y);
        var uv1N : CVec3 = new CVec3(_uvZ1.x + rotatedOffset.x, _uvZ1.y + rotatedOffset.y, _read.z);
        var uv2N : CVec3 = new CVec3(_uvZ2.x + rotatedOffset.x, _uvZ2.y + rotatedOffset.y, _read.w);
        
        // 각 캐스케이드에 대한 샘플링
        if(_read.y>-0.5 && uv0N.x>0.0 && uv0N.y>0.0 && uv0N.x<1.0 && uv0N.y<1.0)
        {
            var shadowParam : CVec4 = Sam2DArrToColor(0.0, uv0N);
            
            var depth : number = shadowParam.z;			
            
            sVal += (_uvZ0.z + _biasAll) >= depth ? 1.0 : 0.0;
            count += 1.0;
            
        }
        else if(_read.z>-0.5 && uv1N.x>0.0 && uv1N.y>0.0 && uv1N.x<1.0 && uv1N.y<1.0)
        {
            var shadowParam : CVec4 = Sam2DArrToColor(0.0, uv1N);
            
            var depth : number = shadowParam.z;			
            
            sVal += (_uvZ1.z + _biasAll *f16Chk*2.0) >= depth ? 1.0 : 0.0;
            count += 1.0;
            
        }
        else if(_read.w>-0.5 && uv2N.x>0.0 && uv2N.y>0.0 && uv2N.x<1.0 && uv2N.y<1.0)
        {
            var shadowParam : CVec4 = Sam2DArrToColor(0.0, uv2N);
            
            var depth : number = shadowParam.z;			
            
            sVal += (_uvZ2.z + _biasAll*f16Chk*4.0) >= depth ? 1.0 : 0.0;
            count += 1.0;
        }
    }

    return new CVec2(sVal, count);
}

function ProcessCascadeLevel(_isActive : number, _viewMatOff : Sam2DMat, _projMatOff : Sam2DMat, _offsetScale : number, _normalOffset : CVec3, _worldPos : CVec4, _index : number) : CVec3
{
    if(_isActive < -0.5) {
        return new CVec3(0.0, 0.0, 0.0);
    }
    
    var svm : CMat = Sam2DToMat(_viewMatOff, _index);
    var spm : CMat = Sam2DToMat(_projMatOff, _index);

    // 월드 위치에 노말 오프셋 적용
    var world : CVec4 = new CVec4(V3AddV3(_worldPos.xyz, V3MulFloat(_normalOffset, _offsetScale)), _worldPos.w);
    
    // 뷰 공간 변환
    var viewPos : CVec4 = V4MulMatCoordi(world, svm);
    
    // 그림자맵 공간 변환
    var shadowPos : CVec4 = V4MulMatCoordi(viewPos, spm);
    
    // 결과 저장
    return new CVec3(ShadowPosToUv(shadowPos).xy, viewPos.z);
}

export function calcShadow(_read : CVec4, _index : number,_nor : CVec3, _worldPos : CVec4) : number {
    
    


  
    // 노말 오프셋 계산 (셀프 섀도잉 방지)
    var normalScale : number = normalBias;
    
    var normalOffset : CVec3 = V3MulFloat(V3Nor(_nor), normalScale);

    // 바이어스 계산 (셀프 섀도잉 방지)
    var biasAll : number = bias;

 
    var uvZ0 : CVec3=ProcessCascadeLevel(_read.y, shadowNearCasV0, shadowFarCasP0, 1.0, normalOffset, _worldPos, _index);
    var uvZ1 : CVec3=ProcessCascadeLevel(_read.z, shadowTopCasV1, shadowBottomCasP1, 1.0, normalOffset, _worldPos, _index);
    var uvZ2 : CVec3=ProcessCascadeLevel(_read.w, shadowLeftCasV2, shadowRightCasP2, 1.0, normalOffset, _worldPos, _index);

    var sVal_count : CVec2 = ApplyPCF(uvZ0, uvZ1, uvZ2, _read, biasAll);
    // var sVal_count : CVec2 = ApplyJitteredPCF(uvZ0, uvZ1, uvZ2, _read, biasAll, _worldPos);

    var sVal : number = sVal_count.x;
    var count : number = sVal_count.y;

    if(count >= 0.1)
    {
        sVal /= count;
    }
    else
    {
        sVal=1.0;
    }

    

    //최소 그림자 강도 적용
    return sVal * (1.0-shadowRate) + shadowRate;
}

export function calcParallaxShadow(_index : number, _uv : CVec2, _ligDir : CVec3, _heightScale : number) : number {    
    var minLayers : number = 4.0;
    var maxLayers : number = 16.0;
    var numLayers : number = mix(maxLayers, minLayers, abs(V3Dot(new CVec3(0.0, 0.0, 1.0), _ligDir)));

    var currentTexCoords : CVec2 = _uv;
    var currentDepthMapValue : number = 1.0 - Sam2DToColor(_index, currentTexCoords).a + 0.01;
    var currentLayerDepth : number = currentDepthMapValue;

    var layerDepth : number = 1.0 / numLayers;
    var P : CVec2 = V2MulFloat(V2DivFloat(_ligDir.xy, _ligDir.z),_heightScale);
    var deltaTexCoords : CVec2 = V2DivFloat(P, numLayers);

    // 반대로 레이마칭
    while(currentLayerDepth <= currentDepthMapValue && currentLayerDepth > 0.0)
    {
        currentTexCoords=V2AddV2(currentTexCoords,deltaTexCoords);
        //currentTexCoords += deltaTexCoords;
        currentDepthMapValue = 1.0 - Sam2DToColor(_index, currentTexCoords).a;
        currentLayerDepth -= layerDepth;
    }

    var shadow : number;
    if(currentLayerDepth > currentDepthMapValue) shadow = 0.0;
    else shadow = 1.0;
    return shadow * (1.0-shadowRate) + shadowRate;
}

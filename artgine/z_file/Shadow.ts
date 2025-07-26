import { ligDir } from "./Light";
import { CMat, cos, CVec2, CVec3, CVec4, round, Sam2DArrSize, Sam2DArrToColor, Sam2DMat, Sam2DToMat, Sam2DToV4, Sam2DV4, ShadowPosToUv, 
    sin, V3AddV3, V3Dot, V3MulFloat, V3Nor, V4MulMatCoordi } from "./Shader";

export var shadowNearCasV0: Sam2DMat=new Sam2DMat(9,505);
export var shadowFarCasP0: Sam2DMat=new Sam2DMat(9,509);
export var shadowTopCasV1: Sam2DMat=new Sam2DMat(9,513);
export var shadowBottomCasP1: Sam2DMat=new Sam2DMat(9,517);
export var shadowLeftCasV2: Sam2DMat=new Sam2DMat(9,521);
export var shadowRightCasP2: Sam2DMat=new Sam2DMat(9,525);
export var shadowPointProj: Sam2DMat=new Sam2DMat(9,529);

//shadow uniform
export var shadowOn : number = -1.0;
export var shadowReadList: Sam2DV4=new Sam2DV4(9);

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

//빛과의 각도를 계산해서 오차에 보정하고 빛과 반대쪽 면을 더 어둡게 만듬
export var dotCac : number = 0.0;

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
    for(; x <= PCF + 0.5; x += 1.0) 
    {
        var y : number = -PCF;
        for(; y <= PCF + 0.5; y += 1.0) 
        {
            
            var uv0N : CVec3 = new CVec3(_uvZ0.x + x * texScale.x, _uvZ0.y + y * texScale.y,_read.y);
            var uv1N : CVec3 = new CVec3(_uvZ1.x + x * texScale.x, _uvZ1.y + y * texScale.y,_read.z);
            var uv2N : CVec3 = new CVec3(_uvZ2.x + x * texScale.x, _uvZ2.y + y * texScale.y,_read.w);


            //uv0N.x -= texScale.x;
            //uv0N.y -= texScale.y * 0.5;

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
        
                sVal += (_uvZ2.z + _biasAll *f16Chk*4.0) >= depth ? 1.0 : 0.0;

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
    var lightDir : CVec4 = Sam2DToV4(ligDir, _read.x);
    

    //라이트가 디렉셔널 라이트가 아니거나 Init되지 않았음
    if(lightDir.w>1.5) {
        return 1.0;
    }

    //노말과 라이트 사이의 각도
    var nDotL : number = 1.0;
    if(dotCac>0.5) {
        nDotL = V3Dot(V3Nor(_nor), V3Nor(lightDir.xyz));
    }

    // 노말 오프셋 계산 (셀프 섀도잉 방지)
    var normalScale : number = normalBias;
    
    // 빛과의 각도가 90도에 가까울수록 노말 스케일 증가
    normalScale *= (1.0 + (1.0 - Math.abs(nDotL)) * 2.0);
    
    var normalOffset : CVec3 = V3MulFloat(V3Nor(_nor), normalScale);

    // 바이어스 계산 (셀프 섀도잉 방지)
    var biasAll : number = bias;

    // 빛과의 각도가 90도에 가까울수록 바이어스 증가
    var slopeScale : number = 1.0 - nDotL;
    biasAll *= (1.0 + slopeScale * 3.0);
    

    var uvZ0 : CVec3=ProcessCascadeLevel(_read.y, shadowNearCasV0, shadowFarCasP0, 1.0, normalOffset, _worldPos, _index);
    var uvZ1 : CVec3=ProcessCascadeLevel(_read.z, shadowTopCasV1, shadowBottomCasP1, 4.0, normalOffset, _worldPos, _index);
    var uvZ2 : CVec3=ProcessCascadeLevel(_read.w, shadowLeftCasV2, shadowRightCasP2, 8.0, normalOffset, _worldPos, _index);

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

    //180도에 가까울수록 그림자가 진해짐 (역광 방지)
    if(dotCac>0.5 && nDotL<=0.0)
    {
        if(nDotL<0.0)   nDotL=0.0;
        sVal=nDotL;
        

    }
    

    //최소 그림자 강도 적용
    return sVal * (1.0-shadowRate) + shadowRate;
}

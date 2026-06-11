import { SDF } from "./SDF";
import { 
    CMat3, CVec2, CVec3, CVec4, FloatToInt, IntToFloat, reflect, 
    SamCubeLodToColor, SaturateFloat, Sam2DArrToV4, Sam2DArrV4, SamCubeSize, 
    sqrt, abs, clamp, max, min, pow, mix, Exp2, log2, floor,
    V2AddV2, V2MulFloat, 
    V3AddV3, V3Dot, V3Len, V3Max, V3Mix, V3MulFloat, V3MulV3, V3Nor, V3Pow, V3SubV3, V3DivV3,
    V4AddV4, V4MulFloat,
} from "./Shader";

export var ambientColor : CVec3 = new CVec3(0.2,0.2,0.2);
export var material : CVec4 = new CVec4(0.0,0.0,0.0,1.0);

//count
export var sam2DCount : number;
export var sam2DArrCount : number;
export var samCubeCount : number;

//lig
export var ligCount : number=0;

export var ligStep0 : number=SDF.eLightStep0.HafeLambert;
export var ligStep1 : number=SDF.eLightStep1.Phong;
export var ligStep2 : number=SDF.eLightStep2.Emissive;
export var ligStep3 : number=SDF.eLightStep3.None;

export var envmapOn : number = 0.0;

//LUT
export var ligDir: Sam2DArrV4=new Sam2DArrV4(1,SDF.eUni.V4LightDir);
export var ligCol: Sam2DArrV4=new Sam2DArrV4(1,SDF.eUni.V4LightColor);

export function GetMaterial(_material : CVec4,_texColor : CVec4,sam2DCount : number) : CVec4
{
    var tm : CVec4=new CVec4(_material.x,_material.y,_material.z,_material.w);
    if(sam2DCount>1.0) {
        if(tm.x<-0.5)	tm.x=_texColor.x;
        if(tm.y<-0.5)	tm.y=_texColor.y;
        if(tm.z<-0.5)	tm.z=_texColor.z;
        if(tm.w<-0.5)	tm.w=_texColor.w;
    }
    return tm;
}

//====================================================
// PBR - Lighting
//====================================================
function F_Schlick(_vDotH : number, _F0 : CVec3) : CVec3 {
    var fresnel : number = pow(clamp(1.0-_vDotH, 0.0, 1.0), 5.0);
    return V3AddV3(_F0, V3MulFloat(V3SubV3(new CVec3(1.0,1.0,1.0), _F0), fresnel));
}
// 스펙큘러 미세면 분포 함수
function D_GGX(_alpha : number, _nDotH : number) : number {
    var a2 : number = _alpha * _alpha;
    var denom : number = (_nDotH * _nDotH) * (a2 - 1.0) + 1.0;
    return 0.3183098861837907 * a2 / (denom * denom);
}
// 기하 차폐 함수
function V_GGX(_alpha : number, _nDotL : number, _nDotV : number) : number {
    var a2 : number = _alpha * _alpha;

    // UNITY : 0.5까지는 스펙큘러 하이라이트 증가, 0.5부터는 감소
    var visV : number = _nDotL * sqrt(_nDotV * _nDotV * (1.0 - a2) + a2);
    var visL : number = _nDotV * sqrt(_nDotL * _nDotL * (1.0 - a2) + a2);

    // Unreal : 1.0까지 스펙큘러 하이라이트 증가
    // var visV : number = _nDotL * (_nDotV * (1.0 - _alpha) + _alpha);
    // var visL : number = _nDotV * (_nDotL * (1.0 - _alpha) + _alpha);

    return 0.5 / max(visV + visL, 1e-7);
}
// BRDF LUT 대신 사용할 근사법
function EnvBRDFApprox(_specularColor : CVec3, _roughness : number, _nDotV : number) : CVec3 {
    var c0 : CVec4 = new CVec4(-1.0, -0.0275, -0.572, 0.022);
    var c1 : CVec4 = new CVec4(1.0, 0.0425, 1.04, -0.04);
    var r : CVec4 = V4AddV4(V4MulFloat(c0, _roughness), c1);
    var a004 : number = min( r.x * r.x, Exp2( -9.28 * _nDotV ) ) * r.x + r.y;
    var AB : CVec2 = V2AddV2(V2MulFloat(new CVec2(-1.04, 1.04), a004), new CVec2(r.z, r.w));
    return V3AddV3(V3MulFloat(_specularColor, AB.x), new CVec3(AB.y, AB.y, AB.y));
}

//====================================================
// PBR - IBL
//====================================================
function FresnelSchlickRoughness(_nDotV : number, _F0 : CVec3, _roughness : number) : CVec3
{
    var oneMinusCosTheta : number = pow(clamp(1.0-_nDotV, 0.0, 1.0), 5.0);
    var oneMinusRoughness : number = 1.0 - _roughness;
    var oneMinusRoughnessVec3 : CVec3 = new CVec3(oneMinusRoughness,oneMinusRoughness,oneMinusRoughness);
    
    return V3AddV3(_F0, V3MulFloat(V3SubV3(V3Max(oneMinusRoughnessVec3, _F0), _F0), oneMinusCosTheta));
}
function ComputeSpecularOcclusion(_nDotV : number, _ao : number, _roughness : number) : number
{
    return SaturateFloat(pow(_nDotV + _ao, Exp2(-16.0 * _roughness - 1.0)) - 1.0 + _ao);
}

export function LightCac3D(
    campos : CVec3, position : CVec4, albedo : CVec4, normal :CVec3, shadow : number,
    roughness : number,ao : number,metalic : number, gamma : number) : CMat3
{
    albedo.rgb = V3Pow(albedo.rgb, gamma);
    normal = V3Nor(normal);

    var viewDir : CVec3 = V3Nor(V3SubV3(campos, position.xyz));
    var nDotV : number = SaturateFloat(V3Dot(normal, viewDir));

    roughness = mix(0.15, 1.0, clamp(roughness, 0.0, 1.0)); // 0.15는 스펙큘러 하이라이트가 이상하게 보이지 않을 정도로 튜닝한 값
    var smoothness : number= 1.0 - roughness;
    metalic = clamp(metalic, 0.0, 1.0);

    var DAll : CVec3=new CVec3(0,0,0);
    var SAll : CVec3=new CVec3(0,0,0);
    var emAll : CVec3=new CVec3(0,0,0);

    //====================================================
    // Direct Lighting
    //====================================================

    var DLinearSpace : number = 0.0;

    var DDirAll : CVec3=new CVec3(0,0,0);
    var DPtAll : CVec3=new CVec3(0,0,0);
    
    var SDirAll : CVec3=new CVec3(0,0,0);
    var SPtAll : CVec3=new CVec3(0,0,0);

    for(var i=0;i<SDF.TexSizeMax;++i)
    {
        if(i >= FloatToInt(ligCount)) break;
        var lDir : CVec4=Sam2DArrToV4(ligDir,IntToFloat(i));
        var lCol : CVec4=Sam2DArrToV4(ligCol,IntToFloat(i));

        //lDir가 0이면 라이트 아님
        if(abs(lDir.w) <= 0.5) continue;

        // 라이트 파라미터
        var L : CVec3=lDir.xyz;
        var radiance : CVec3 = lCol.rgb;
        if(shadow>-0.5) {   // 라이팅에 그림자 적용
            radiance = V3MulFloat(radiance, shadow);
        }
        var dist : number = 0.0; // 라이트와 fragment 사이의 거리
        var isPointLight : number = lDir.w>1.1 ? 1.0 : 0.0;
        
        if(isPointLight > 0.5) {
            var inRadius : number = lCol.w;
            var outRadius : number = lDir.w;

            L = V3SubV3(L, position.xyz);
            dist = V3Len(L);

            //포인트 라이트 범위 밖에 있는 경우 제외
            if(dist > outRadius) continue;

            var distAttenuation : number = (outRadius - dist) / (outRadius - inRadius);
            radiance = V3MulFloat(radiance, distAttenuation);
        }
        L = V3Nor(L);

        // 라이팅 계산 파라미터
        var nDotL : number = SaturateFloat(V3Dot(normal,L));

        var diffuse : CVec3 = new CVec3(0.0,0.0,0.0);
        var specular : CVec3 = new CVec3(0.0,0.0,0.0);

        //diffuse, specular 둘다 none인 경우 스킵
        if(ligStep0 < SDF.eLightStep0.None + 0.5 && ligStep1 < SDF.eLightStep0.None + 0.5 ) continue;
        
        //====================================================
        //Step0 : Diffuse 라이트 모델
        //====================================================
        if(ligStep0 < SDF.eLightStep0.None + 0.5) {
            //0 None : diffuse 없음
            ;
        }
        else if(ligStep0 < SDF.eLightStep0.Distance + 0.5) {
            //1 distance : 거리 기반 diffuse
            var distanceFromLightPos : number = 1.0 - dist / (lDir.w < 1.0? 1.0 : lDir.w);
            diffuse=V3MulFloat(albedo.rgb,distanceFromLightPos);
        }
        else if(ligStep0 < SDF.eLightStep0.Lambert + 0.5) {
            //2 lambert : 모든 방향에서 보아도 같은 밝기
            var lambertTerm : number = nDotL;
            diffuse=V3MulFloat(albedo.rgb, lambertTerm);
        }
        else if(ligStep0 < SDF.eLightStep0.HafeLambert + 0.5) {
            //3 half lambert : 빛을 받지 않는 영역도 0이 아닌 0 ~ 0.5로 계산
            var halfLabert : number = V3Dot(normal,L) * 0.5 + 0.5;
            diffuse=V3MulFloat(albedo.rgb, halfLabert);
        }
        
        //====================================================
        //Step1 : Specular 라이트 모델
        //====================================================
        if(ligStep1 < SDF.eLightStep1.None + 0.5) {
            //0 None : specular 없음
            ;
        }
        else if(ligStep1 < SDF.eLightStep1.Phong + 0.5) {
            //1 phong : 적당한 반사
            var R : CVec3 = V3Nor(reflect(V3MulFloat(L, -1.0), normal));
            var vDotR : number = SaturateFloat(V3Dot(viewDir,R));
            var phongValue : number = Math.pow(vDotR, 20.0);
            var phongSpecular : number = phongValue*smoothness*nDotL;
            specular = new CVec3(phongSpecular, phongSpecular, phongSpecular);
        }
        else if(ligStep1 < SDF.eLightStep1.BlinnPhong + 0.5) {
            //2 blinn phong : 빠른 반사
            var halfwayDir : CVec3 = V3Nor(V3AddV3(viewDir, L));
            var nDotH : number = SaturateFloat(V3Dot(normal,halfwayDir));
            var blinnValue : number = Math.pow(nDotH, 20.0*4.0);
            var blinnSpecular : number = blinnValue*smoothness*nDotL;
            specular = new CVec3(blinnSpecular, blinnSpecular, blinnSpecular);
        }
        else if(ligStep1 < SDF.eLightStep1.CookTorrance + 0.5) {
            //3 cook-torrance pbr
            var halfwayDir : CVec3 = V3Nor(V3AddV3(viewDir, L));

            var nDotH : number = SaturateFloat(V3Dot(normal, halfwayDir));
            var vDotH : number = SaturateFloat(V3Dot(viewDir, halfwayDir));

            //기본 반사도
            var baseReflectivity : CVec3 = new CVec3(0.04,0.04,0.04);
            var F0 : CVec3 = V3Mix(baseReflectivity, albedo.rgb, metalic);

            //프레스넬
            var F : CVec3 = F_Schlick(vDotH, F0);

            // 기본 스펙큘러, 디퓨즈
            var kS : CVec3=F;
            var kD : CVec3=V3MulFloat(V3SubV3(new CVec3(1.0,1.0,1.0),kS),1.0-metalic);

            var alpha : number = roughness * roughness; // UE4 roughness
            // var alpha : number = ((roughness + 1.0) * (roughness + 1.0)) * 0.5; // Frostbite

            //pbr 기본
            var D : number = D_GGX(alpha, nDotH);
            var G : number = V_GGX(alpha, nDotL, nDotV);

            diffuse = V3MulV3(kD, diffuse);
            specular = V3MulFloat(kS, D * G * nDotL * 3.14159265359);

            DLinearSpace = 1.0;
        }

        //====================================================
        //Step2 : Emissive 라이트 모델
        //====================================================
        if(ligStep2 < SDF.eLightStep2.None + 0.5) {;}
        else if(ligStep2 < SDF.eLightStep2.Emissive + 0.5) 
        {
            emAll=V3AddV3(emAll, V3MulFloat(radiance, nDotL));
        }
        
        if(isPointLight > 0.5) {
            DPtAll=V3AddV3(DPtAll,V3MulV3(diffuse , radiance));
            SPtAll=V3AddV3(SPtAll,V3MulV3(specular, radiance));
        }
        else {
            DDirAll=V3AddV3(DDirAll,V3MulV3(diffuse , radiance));
            SDirAll=V3AddV3(SDirAll,V3MulV3(specular, radiance));
        }

    }

    //====================================================
    // Indirect Lighting
    //====================================================
    var ILinearSpace : number = 0.0;
    var DEnvAll : CVec3;
    var SEnvAll : CVec3;
    {
        if(envmapOn < 0.5) {
            // 0 컬러 : ambient_color가 환경값
            DEnvAll = V3MulV3(albedo.xyz, ambientColor);
        }
        else {
            // 1 IBL approx : 블러된 큐브맵(0)을 IBL로 사용
            var maxReflectionLOD : number = floor(log2(SamCubeSize(0.0).x)) - 4.0;
            var R : CVec3 = reflect(V3MulFloat(viewDir, -1.0), normal);

            var baseReflectivity : CVec3 = new CVec3(0.04,0.04,0.04);
            var F0 : CVec3 = V3Mix(baseReflectivity, albedo.rgb, metalic);
            var F : CVec3 = FresnelSchlickRoughness(nDotV, F0, roughness);

            var kS : CVec3 = F;
            var kD : CVec3 = V3MulFloat(V3SubV3(new CVec3(1.0,1.0,1.0), kS), 1.0 - metalic);

            var irradiance : CVec3 = SamCubeLodToColor(0.0, normal, maxReflectionLOD).rgb;
            DEnvAll = V3MulV3(V3MulV3(albedo.rgb, irradiance), kD);

            var orgRoughness : number = (roughness - 0.15) / 0.85;
            var prefilteredColor : CVec3 = SamCubeLodToColor(0.0, R, orgRoughness * maxReflectionLOD).rgb;
            SEnvAll = V3MulV3(prefilteredColor, V3MulV3(kS, EnvBRDFApprox(F0, roughness, nDotV)));

            ILinearSpace = 1.0;
        }
        /*
        else if(samCubeCount < 2.5) {
            // 2 IBL : 밝기 맵(0), 블러된 큐브맵(1)을 IBL로 사용
            var maxReflectionLOD : number = floor(log2(SamCubeSize(1.0).x)) - 4.0;
            var R : CVec3 = reflect(V3MulFloat(viewDir, -1.0), normal);

            var baseReflectivity : CVec3 = new CVec3(0.04,0.04,0.04);
            var F0 : CVec3 = V3Mix(baseReflectivity, albedo.rgb, metalic);
            var F : CVec3 = FresnelSchlickRoughness(nDotV, F0, roughness);

            var kS : CVec3 = F;
            var kD : CVec3 = V3MulFloat(V3SubV3(new CVec3(1.0,1.0,1.0), kS), 1.0 - metalic);

            var irradiance : CVec3 = SamCubeToColor(0.0, normal).rgb;
            DEnvAll = V3MulV3(V3MulV3(albedo.rgb, irradiance), kD);

            var orgRoughness : number = (roughness - 0.15) / 0.85;
            var prefilteredColor : CVec3 = SamCubeLodToColor(1.0, R, orgRoughness * maxReflectionLOD).rgb;
            SEnvAll = V3MulV3(prefilteredColor, V3MulV3(kS, EnvBRDFApprox(F0, roughness, nDotV)));

            ILinearSpace = 1.0;
        }
        */
        DEnvAll = V3MulFloat(DEnvAll, ao);
        SEnvAll = V3MulFloat(SEnvAll, ComputeSpecularOcclusion(nDotV, ao, roughness));
    }

    //====================================================
    // Final
    //====================================================
    if(DLinearSpace > 0.5 || ILinearSpace > 0.5) {
        // LinearSpace에 있는 값을 sRGB로 낮춰서 합성
        var blended : CVec3 = new CVec3(0, 0, 0);
        if(DLinearSpace > 0.5) blended = V3AddV3(blended, V3AddV3(V3AddV3(DDirAll, DPtAll), V3AddV3(SDirAll, SPtAll)));
        if(ILinearSpace > 0.5) blended = V3AddV3(blended, V3AddV3(DEnvAll, SEnvAll));

        var sBlended : CVec3 = new CVec3(sqrt(blended.x), sqrt(blended.y), sqrt(blended.z));
        var k : CVec3 = V3DivV3(sBlended, blended);

        if(DLinearSpace > 0.5) {
            DDirAll = V3MulV3(DDirAll, k);
            DPtAll = V3MulV3(DPtAll, k);
            SDirAll = V3MulV3(SDirAll, k);
            SPtAll = V3MulV3(SPtAll, k);
        }
        if(ILinearSpace > 0.5) {
            DEnvAll = V3MulV3(DEnvAll, k);
            SEnvAll = V3MulV3(SEnvAll, k);
        }
    }
    DAll = V3AddV3(V3AddV3(DDirAll, DPtAll), DEnvAll);
    SAll = V3AddV3(V3AddV3(SDirAll, SPtAll), SEnvAll);
    
    return new CMat3(DAll, SAll, emAll);
}

export function GetSunInfo() : CMat3
{
    for(var i=0;i<SDF.TexSizeMax;++i)
	{
		if(i >= FloatToInt(ligCount)) break;
		var dir : CVec4 = Sam2DArrToV4(ligDir,IntToFloat(i));
		var col : CVec4 = Sam2DArrToV4(ligCol,IntToFloat(i));

		//lDir가 0이면 라이트 아님
		if(abs(dir.w) <= 0.5) continue;

		var isPointLight : number = dir.w>1.1 ? 1.0 : 0.0;
		if(isPointLight < 0.5) {
            return new CMat3(
                dir.xyz,
                col.xyz,
                new CVec3(0.0, 0.0, 0.0)
            );
		}
	}
    return new CMat3(
        new CVec3(0.0, 1.0, 0.0),
        new CVec3(0.0, 0.0, 0.0),
        new CVec3(0.0, 0.0, 0.0)
    );
}

export function LightCac2D(position : CVec4,albedo : CVec4,normal :CVec3) : CMat3
{
    
    var DPtAll : CVec3=new CVec3(0.0,0.0,0.0);
    var DDirAll : CVec3=new CVec3(0.0,0.0,0.0);
    if(albedo.x<0.01) albedo.x=0.01;
    if(albedo.y<0.01) albedo.y=0.01;
    if(albedo.z<0.01) albedo.z=0.01;

    var norLen : number=V3Len(normal);
    //노말맵 안쓰면 기본 노말
    if(norLen<0.5)  normal=new CVec3(0.0,1.0,0.0);

    for(var i=0;i<SDF.TexSizeMax;++i)
    {
        if(i >= FloatToInt(ligCount)) break;
        var lDir : CVec4=Sam2DArrToV4(ligDir,IntToFloat(i));
        var lCol : CVec4=Sam2DArrToV4(ligCol,IntToFloat(i));

        //라이팅 아니어서 스킵
        if(abs(lDir.w) <= 0.5) continue;

        var isPointLight : number = lDir.w > 1.1 ? 1.0 : 0.0;
        var L : CVec3=lDir.xyz;
        //노말맵을 안쓴다는 가정하에 포인트 라이트 처리함
        if(isPointLight > 0.5)
        {
            var attenuation : number=1.0;
            L=V3SubV3(L,position.xyz);
            //var lightDir : CVec3=V3SubV3(lDir.xyz,position.xyz);
            var dist : number=V3Len(L);
            

            //포인트 라이트 범위 밖에 있으면 스킵
            if(dist>lDir.w) continue;
            
            if(lCol.w <= dist) {
                attenuation=1.0 - ((dist - lCol.w) / (lDir.w - lCol.w));
            }
            if(norLen<0.5)
            {
                var diffuse : CVec3=V3MulFloat(lCol.xyz,attenuation);
                DPtAll=V3AddV3(DPtAll,V3MulV3(albedo.rgb,diffuse));
                
            }
            else
            {
                L.z=0.0;
                L=V3Nor(L);

                var angle:number=max(0.0,V3Dot(normal,L));
                var diffuse:CVec3=V3MulFloat(lCol.xyz,angle*attenuation);
                // if(diffuse.x<ambientColor.x)    diffuse.x=ambientColor.x;
                // if(diffuse.y<ambientColor.y)    diffuse.y=ambientColor.y;
                // if(diffuse.z<ambientColor.z)    diffuse.z=ambientColor.z;

                DPtAll=V3AddV3(DPtAll,V3MulV3(albedo.rgb,diffuse));
            }
            
        }
        else
        {
            //var lightDir : CVec3=lDir.xyz;
            var angle:number=max(0.0,V3Dot(normal,L));
            var diffuse:CVec3=V3MulFloat(lCol.xyz,angle);
            //diffuse=new CVec3(1.0,1.0,1.0);
            DDirAll=V3AddV3(DDirAll,V3MulV3(albedo.rgb,diffuse));	
        }
    }
    var ambientLight :CVec3 = V3MulV3(albedo.xyz,ambientColor);
    //최저점으로 계산한다
    //DDirAll=V3AddV3(ambientLight,DDirAll);
    if(DDirAll.x<ambientLight.x)DDirAll.x=ambientLight.x;
    if(DDirAll.y<ambientLight.y)DDirAll.y=ambientLight.y;
    if(DDirAll.z<ambientLight.z)DDirAll.z=ambientLight.z;


    //DPtAll=new CVec3(1.0,1.0,1.0);
    //DDirAll=V3MulV3(albedo.rgb,new CVec3(1.0,1.0,1.0));	
    return new CMat3(V3AddV3(DPtAll,DDirAll), new CVec3(0.0,0.0,0.0), new CVec3(0.0,0.0,0.0));
}
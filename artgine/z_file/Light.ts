import { SDF } from "./SDF";
import { 
    CMat3, CVec2, CVec3, CVec4, FloatToInt, IntToFloat, reflect, 
    SamCubeLodToColor, SaturateFloat, Sam2DArrToV4, Sam2DArrV4, SamCubeSize, 
    sqrt, abs, clamp, max, min, pow, mix, Exp2, log2, floor,
    V2AddV2, V2MulFloat, 
    V3AddV3, V3Dot, V3Len, V3Max, V3Mix, V3MulFloat, V3MulV3, V3Nor, V3SubV3,
    V4AddV4, V4MulFloat,
    round,
    FloatBitsToInt,
} from "./Shader";

export var ambientColor : CVec3 = new CVec3(0.2,0.2,0.2);
export var material : CVec4 = new CVec4(0.0,0.0,0.0,1.0);
export var cullMask : CVec4 = new CVec4(0.0,0.0,0.0,0.0);

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
export var ligMask: Sam2DArrV4=new Sam2DArrV4(1,SDF.eUni.V4LightMask);

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

//====================================================
// PBR - IBL
//====================================================
function EnvBRDFApprox(_specularColor : CVec3, _roughness : number, _nDotV : number) : CVec3 {
    var c0 : CVec4 = new CVec4(-1.0, -0.0275, -0.572, 0.022);
    var c1 : CVec4 = new CVec4(1.0, 0.0425, 1.04, -0.04);
    var r : CVec4 = V4AddV4(V4MulFloat(c0, _roughness), c1);
    var a004 : number = min( r.x * r.x, Exp2( -9.28 * _nDotV ) ) * r.x + r.y;
    var AB : CVec2 = V2AddV2(V2MulFloat(new CVec2(-1.04, 1.04), a004), new CVec2(r.z, r.w));
    return V3AddV3(V3MulFloat(_specularColor, AB.x), new CVec3(AB.y, AB.y, AB.y));
}
function FresnelSchlickRoughness(_nDotV : number, _F0 : CVec3, _roughness : number) : CVec3
{
    var oneMinusCosTheta : number = pow(clamp(1.0-_nDotV, 0.0, 1.0), 5.0);
    var oneMinusRoughness : number = 1.0 - _roughness;
    var oneMinusRoughnessVec3 : CVec3 = new CVec3(oneMinusRoughness,oneMinusRoughness,oneMinusRoughness);
    
    return V3AddV3(_F0, V3MulFloat(V3SubV3(V3Max(oneMinusRoughnessVec3, _F0), _F0), oneMinusCosTheta));
}
/*
function DFX_Approx(_nDotV : number, _roughness : number) : CVec2 {
    var c0 : CVec4 = new CVec4(-1.0, -0.0275, -0.572, 0.022);
    var c1 : CVec4 = new CVec4(1.0, 0.0425, 1.04, -0.04);
    var r : CVec4 = V4AddV4(V4MulFloat(c0, _roughness), c1);
    var a004 : number = min( r.x * r.x, Exp2( -9.28 * _nDotV ) ) * r.x + r.y;
    var AB : CVec2 = V2AddV2(V2MulFloat(new CVec2(-1.04, 1.04), a004), new CVec2(r.z, r.w));
    return AB;
}
*/
function ComputeSpecularOcclusion(_nDotV : number, _ao : number, _roughness : number) : number
{
    return SaturateFloat(pow(_nDotV + _ao, Exp2(-16.0 * _roughness - 1.0)) - 1.0 + _ao);
}

export function LightCac3D(
    campos : CVec3, position : CVec4, albedo : CVec4, normal :CVec3, shadow : CVec4,
    roughness : number,ao : number,metalic : number,maskIndex : number) : CMat3
{
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
	
    var DDirAll : CVec3=new CVec3(0,0,0);
    var DPtAll : CVec3=new CVec3(0,0,0);
    
    var SDirAll : CVec3=new CVec3(0,0,0);
    var SPtAll : CVec3=new CVec3(0,0,0);

    for(var i=0;i<SDF.TexSizeMax;++i)
    {
        if(i >= FloatToInt(ligCount)) break;
        var lDir : CVec4=Sam2DArrToV4(ligDir,IntToFloat(i));
        var lCol : CVec4=Sam2DArrToV4(ligCol,IntToFloat(i));
        var lMask: CVec4=Sam2DArrToV4(ligMask,IntToFloat(i));

        // lMask.x가 ptMask.x에 겹치는 비트가 없으면 라이팅 받지 않음
        if((FloatToInt(lMask.x) & FloatToInt(maskIndex)) == 0) continue;

        //lDir가 0이면 라이트 아님
        if(abs(lDir.w) <= 0.5) continue;

        // 라이트 파라미터
        var L : CVec3=lDir.xyz;
        var radiance : CVec3 = lCol.rgb;
        var shadowIndex : number = round(min(lMask.w, 3.0));
        if(shadowIndex > -0.5 && shadow[FloatToInt(shadowIndex)]>-0.5) {   // 라이팅에 그림자 적용
            radiance = V3MulFloat(radiance, shadow[FloatToInt(shadowIndex)]);
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
            specular = V3MulFloat(kS, D * G * nDotL);
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
        }
        /*
        // Scattering 처리
        else {
            // 1 IBL approx : 블러된 큐브맵(0)을 IBL로 사용
            var maxReflectionLOD : number = floor(log2(SamCubeSize(0.0).x)) - 4.0;
            var R : CVec3 = reflect(V3MulFloat(viewDir, -1.0), normal);

            var baseReflectivity : CVec3 = new CVec3(0.04,0.04,0.04);
            var F0 : CVec3 = V3Mix(baseReflectivity, albedo.rgb, metalic);

            var fab : CVec2 = DFX_Approx(nDotV, roughness);
            var ems : number = 1.0 - (fab.x + fab.y);
            var favg : CVec3 = V3AddV3(F0, V3MulFloat(V3SubV3(new CVec3(1.0, 1.0, 1.0), F0), 0.047619));

            var singleScattering : CVec3 = V3AddV3(V3MulFloat(F0, fab.x), new CVec3(fab.y, fab.y, fab.y));
            var multiScattering : CVec3 = V3MulFloat(V3DivV3(V3MulV3(singleScattering, favg), V3SubV3(new CVec3(1.0, 1.0, 1.0), V3MulFloat(favg, ems))), ems);
            var totalScattering : CVec3 = V3AddV3(singleScattering, multiScattering);

            var irradiance : CVec3 = SamCubeLodToColor(0.0, normal, maxReflectionLOD).rgb;
            DEnvAll = V3MulV3(irradiance, V3MulFloat(albedo.rgb, 1.0 - max(totalScattering.x, max(totalScattering.y, totalScattering.z))));

            var orgRoughness : number = (roughness - 0.15) / 0.85;
            var envRadiance : CVec3 = SamCubeLodToColor(0.0, R, orgRoughness * maxReflectionLOD).rgb;
            SEnvAll = V3AddV3(V3MulV3(envRadiance, singleScattering), V3MulV3(irradiance, multiScattering));
        }
        */
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
        }
        */
        DEnvAll = V3MulFloat(DEnvAll, ao);
        SEnvAll = V3MulFloat(SEnvAll, ComputeSpecularOcclusion(nDotV, ao, roughness));
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

export function LightCac2D(position : CVec4,albedo : CVec4,normal :CVec3,shadow :CVec4,maskIndex :number) : CMat3
{
    albedo.rgb = V3Max(albedo.rgb, new CVec3(0.01, 0.01, 0.01));
    
    var DPtAll : CVec3=new CVec3(0.0,0.0,0.0);
    var DDirAll : CVec3=new CVec3(0.0,0.0,0.0);

    var norLen : number=V3Len(normal);
    if(norLen<0.5)  normal=new CVec3(0.0,1.0,0.0);  //노말맵 안쓰면 기본 노말

    for(var i=0;i<SDF.TexSizeMax;++i)
    {
        if(i >= FloatToInt(ligCount)) break;
        var lDir : CVec4=Sam2DArrToV4(ligDir,IntToFloat(i));
        var lCol : CVec4=Sam2DArrToV4(ligCol,IntToFloat(i));
        var lMask: CVec4=Sam2DArrToV4(ligMask,IntToFloat(i));

        // lMask.x가 ptMask.x에 겹치는 비트가 없으면 라이팅 받지 않음
        if((FloatToInt(lMask.x) & FloatToInt(maskIndex)) == 0) continue;

        //라이팅 아니어서 스킵
        if(abs(lDir.w) <= 0.5) continue;

        var L : CVec3=lDir.xyz;
        var radiance : CVec3 = lCol.rgb;
        var shadowIndex : number = round(min(lMask.w, 3.0));
        if(shadowIndex > -0.5 && shadow[FloatToInt(shadowIndex)]>-0.5) {   // 라이팅에 그림자 적용
            radiance = V3MulFloat(radiance, shadow[FloatToInt(shadowIndex)]);
        }
        var isPointLight : number = lDir.w > 1.1 ? 1.0 : 0.0;
        if(isPointLight > 0.5)
        {
            L=V3SubV3(L,position.xyz);
            var dist : number=V3Len(L);
            
            //포인트 라이트 범위 밖에 있으면 스킵
            if(dist>lDir.w) continue;

            var attenuation : number = 1.0 - max(0.0, (dist - lCol.w) / (lDir.w - lCol.w));
            radiance = V3MulFloat(radiance, attenuation);
            
            var diffuse : CVec3 = albedo.rgb;
            if(norLen>0.5) {    // 노말맵이 존재함
                L.z=0.0;
                L=V3Nor(L);
                var angle:number=max(0.0,V3Dot(normal,L));
                diffuse = V3MulFloat(diffuse, angle);
            }

            DPtAll=V3AddV3(DPtAll, V3MulV3(diffuse, radiance));
        }
        else
        {
            var angle:number=max(0.0,V3Dot(normal,L));
            var diffuse:CVec3=V3MulFloat(radiance,angle);
            DDirAll=V3AddV3(DDirAll,V3MulV3(albedo.rgb,diffuse));
        }
    }

    // 엠비언트를 최저점으로 계산한다
    var ambientLight :CVec3 = V3MulV3(albedo.xyz, ambientColor);
    DDirAll = V3Max(DDirAll, ambientLight);

    return new CMat3(V3AddV3(DPtAll,DDirAll), new CVec3(0.0,0.0,0.0), new CVec3(0.0,0.0,0.0));
}
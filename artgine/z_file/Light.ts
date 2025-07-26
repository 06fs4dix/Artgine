import { SDF } from "./SDF";
import { abs, clamp, CMat3, CVec2, CVec3, CVec4, Exp, FloatToInt, max, min, pow, reflect, Sam2DMat, 
    Sam2DToV4, Sam2DV4, SamCubeLodToColor, SaturateV3, TexSizeHalfInt, V2AddV2, V2MulFloat, V3AddV3, 
    V3DivFloat, V3DivV3, V3Dot, V3Len, V3Max, V3Mix, V3MulFloat, V3MulV3, V3Nor, V3SubV3, V4AddV4, V4MulFloat } from "./Shader";

export var ambientColor : CVec3 = new CVec3(0.2,0.2,0.2);

//lig
export var ligCount : number=0;
export var ligStep0 : number=SDF.eLightStep0.HafeLambert;
export var ligStep1 : number=SDF.eLightStep1.Phong;
export var ligStep2 : number=SDF.eLightStep2.Emissive;
export var ligStep3 : number=0;

//LUT
export var ligDir: Sam2DV4=new Sam2DV4(9, 503);
export var ligCol: Sam2DV4=new Sam2DV4(9, 504);

export var envCube : number = -1;

function DistributionGGX(_normal : CVec3, _halfwayVector : CVec3, _roughness : number) : number {
    var roughnessSquared : number = _roughness * _roughness;
    var roughnessSquared2 : number = roughnessSquared * roughnessSquared;
    var nDotH : number = max(V3Dot(_normal, _halfwayVector), 0.0);
    var nDotHSquared : number = nDotH * nDotH;

    var nominator : number = roughnessSquared2;
    var denominator : number = (nDotHSquared * (roughnessSquared2 - 1.0) + 1.0);
    return nominator / (3.141592 * denominator * denominator);
}
function GeometrySchlickGGX(_nDotV : number, _roughness : number) : number {
    var k : number = (_roughness * _roughness) / 8.0;
    return _nDotV / (_nDotV * (1.0 - k) + k);
}
function GeometrySmith(_normal : CVec3, _viewDir : CVec3, _lightDir : CVec3, _roughness : number) : number {
    var nDotV : number = max(V3Dot(_normal, _viewDir), 0.0);
    var nDotL : number = max(V3Dot(_normal, _lightDir), 0.0);
    var ggx1 : number = GeometrySchlickGGX(nDotV, _roughness);
    var ggx2 : number = GeometrySchlickGGX(nDotL, _roughness);
    return ggx1 * ggx2;
}
function FresnelSchlick(_cosTheta : number, F0 : CVec3) : CVec3 {
    var oneMinusCosTheta : number = pow(clamp(1.0-_cosTheta, 0.0, 1.0), 5.0);
    return V3AddV3(F0, V3MulFloat(V3SubV3(new CVec3(1.0,1.0,1.0), F0), oneMinusCosTheta));
}
function FresnelSchlickRoughness(_cosTheta : number, _F0 : CVec3, _roughness : number) : CVec3
{
    var oneMinusCosTheta : number = pow(clamp(1.0-_cosTheta, 0.0, 1.0), 5.0);
    var oneMinusRoughness : number = 1.0 - _roughness;
    var oneMinusRoughnessVec3 : CVec3 = new CVec3(oneMinusRoughness,oneMinusRoughness,oneMinusRoughness);
    
    return V3AddV3(_F0, V3MulFloat(V3SubV3(V3Max(oneMinusRoughnessVec3, _F0), _F0), oneMinusCosTheta));
}
function EnvBRDFApprox(_color : CVec3, _roughness : number, _nDotV : number) : CVec3 {
    var c0 : CVec4 = new CVec4(-1, -0.0275, -0.572, 0.022);
    var c1 : CVec4 = new CVec4(1, 0.0425, 1.0, -0.04);
    var r : CVec4 = V4AddV4(V4MulFloat(c0, _roughness), c1);
    var a004 : number = min( r.x * r.x, Exp( -9.28 * _nDotV ) ) * r.x + r.y;
    var AB : CVec2 = V2AddV2(V2MulFloat(new CVec2(-1.04, 1.04), a004), new CVec2(r.z, r.w));
    return V3MulFloat(_color, AB.x + AB.y);
}
function EnvBRDFApproxNonMetal(_color : CVec3, _roughness : number, _nDotV : number) : CVec3 {
    var c0 : CVec2 = new CVec2(-1.0, -0.0275);
    var c1 : CVec2 = new CVec2(1.0, 0.0425);
    var r : CVec2 = V2AddV2(V2MulFloat(c0, _roughness), c1);
    return V3MulFloat(_color, min(r.x * r.x, Exp(-9.28 * _nDotV) * r.x + r.y));
}

export function LightCac3D(campos : CVec3, position : CVec4,albedo : CVec4,normal :CVec3,shadow : number,
    roughness : number,emissive : number,metalic : number, ambient_color : CVec3) : CMat3
{	
    roughness = clamp(roughness, 0.0, 1.0);
    metalic = clamp(metalic, 0.0, 1.0);


    //낮을수록 정반사(0되면 이상하게 보임)
    roughness = max(0.01, roughness);
    var smoothness : number=1.0-roughness;
    
    var viewDir : CVec3 =V3Nor(V3SubV3(campos, position.xyz));

    var DAll : CVec3=new CVec3(0,0,0);
    var SAll : CVec3=new CVec3(0,0,0);
    var emAll : CVec3=new CVec3(0,0,0);

    var DDirAll : CVec3=new CVec3(0,0,0);
    var DPtAll : CVec3=new CVec3(0,0,0);
    
    var SDirAll : CVec3=new CVec3(0,0,0);
    var SPtAll : CVec3=new CVec3(0,0,0);

    for(var i=0;i<TexSizeHalfInt;++i)
    {
        if(i >= FloatToInt(ligCount)) break;
        var lDir : CVec4=Sam2DToV4(ligDir,i);
        var lCol : CVec4=Sam2DToV4(ligCol,i);

        //lDir가 0이면 라이트 아님
        if(abs(lDir.w) <= 0.5) continue;

        //라이트 방향벡터(L)
        var L : CVec3=lDir.xyz;

        var angle : number = 0.0; //normal과 lightDir 사이의 cos값
        var distAttenuation : number = 1.0;  //거리에 따른 빛의 감쇠율
        var dist : number = 0.0; //라이트와 fragment 사이의 거리
        var radiance : CVec3 = lCol.rgb;
        var diffuse : CVec3 = new CVec3(0.0,0.0,0.0);
        var specular : CVec3 = new CVec3(0.0,0.0,0.0);

        var isPointLight : number = lDir.w>1.1 ? 1.0 : 0.0;

        //포인트라이트
        if(isPointLight > 0.5)
        {
            L=V3SubV3(L,position.xyz);
            dist=V3Len(L);

            //포인트 라이트 범위 밖에 있는 경우 제외
            if(dist>lDir.w) continue;


            if(lCol.w <= dist) {
                distAttenuation = 1.0 - ((dist - lCol.w) / (lDir.w - lCol.w));
            }
            radiance=V3MulFloat(radiance, distAttenuation);
        }
        L=V3Nor(L);
        angle = V3Dot(normal,L);

        //diffuse, specular 둘다 none인 경우 스킵
        if(ligStep0 < SDF.eLightStep0.None + 0.5 && ligStep1 < SDF.eLightStep0.None + 0.5 ) continue;


        //음수인 부분(90 ~ 270도 사이 부분)은 제거함
        var nDotL : number = max(angle, 0.0);

        
        //Step0 : Diffuse 라이트 모델
        if(ligStep0 < SDF.eLightStep0.None + 0.5) 
        {
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
            var lambertTerm : number = max(angle, 0.0);
            if(lambertTerm>shadow && shadow>-0.5) {
                lambertTerm=shadow; //그림자보다 크면 그림자만큼 줄여줌
            }
            diffuse=V3MulFloat(albedo.rgb,lambertTerm);
        }
        else if(ligStep0 < SDF.eLightStep0.HafeLambert + 0.5) {
            //3 half lambert : 빛을 받지 않는 영역도 0이 아닌 0 ~ 0.5로 계산
            var halfLabert : number = angle * 0.5 + 0.5;
            diffuse=V3MulFloat(albedo.rgb,halfLabert);
        }
        
        //Step1 : Specular 라이트 모델
        if(ligStep1 < SDF.eLightStep1.None + 0.5) {
            //0 None : specular 없음
            ;
        }
        else if(ligStep1 < SDF.eLightStep1.Phong + 0.5)
        {
            //1 phong : 적당한 반사
            var R : CVec3 = V3Nor(V3AddV3(V3MulFloat(L,-1.0),V3MulFloat(normal,2.0 * angle)));
            var phongValue : number = Math.pow(max(0.0,V3Dot(viewDir,R)),20.0);
            var phongSpecular : number = phongValue*smoothness*nDotL;
            specular = new CVec3(phongSpecular, phongSpecular, phongSpecular);
        }
        else if(ligStep1 < SDF.eLightStep1.BlinnPhong + 0.5)
        {
            //2 blinn phong : 빠른 반사
            var halfwayDir : CVec3 = V3Nor(V3AddV3(L, viewDir));
            var blinnValue : number = Math.pow(max(0.0,V3Dot(normal,halfwayDir)),20.0*4.0 );
            var blinnSpecular : number = blinnValue*smoothness*nDotL;
            specular = new CVec3(blinnSpecular, blinnSpecular, blinnSpecular);
        }
        else if(ligStep1 < SDF.eLightStep1.CookTorrance + 0.5) {
            //3 cook-torrance pbr

            var V : CVec3 = V3Nor(viewDir);
            var N : CVec3 = V3Nor(normal);
            var H : CVec3 = V3Nor(V3AddV3(V, L));

            //pbr 기본
            var NDF : number = DistributionGGX(N, H, roughness);
            var G : number = GeometrySmith(N, V, L, roughness);

            //기본 반사도
            var baseReflectivity : CVec3 = new CVec3(0.04,0.04,0.04);
            var F0 : CVec3 = V3Mix(baseReflectivity, albedo.rgb, metalic);

            //프레스넬
            var F : CVec3 = FresnelSchlick(max(V3Dot(H, V), 0.0),F0);

            //기본 스펙큘러, 디퓨즈
            var kS : CVec3=F;
            var kD : CVec3=V3MulFloat(V3SubV3(new CVec3(1.0,1.0,1.0),kS),1.0-metalic);

            //스펙큘러 계산
            var numerator : CVec3 = V3MulFloat(F, NDF * G);
            var denominator : number = max(2.0 * max(V3Dot(N, V), 0.0) * max(V3Dot(N, L), 0.0), 0.0001);
            specular = V3MulFloat(numerator, denominator);
            
            //쉐도우 값보다 낮으면 쉐도우 사용
            if(nDotL>shadow && shadow>-0.5)	nDotL=shadow;

            //디퓨즈 계산
            diffuse = V3MulV3(radiance,V3MulFloat(V3DivFloat(V3MulV3(kD,albedo.xyz), 3.141592), nDotL)); 
            

            specular=V3MulFloat(specular,nDotL);
            diffuse=V3MulFloat(diffuse,4.0); // 디퓨즈값이 너무 낮게 보여서 4배 높게 설정
        }
        
        //Step1 : Emissive 라이트 모델
        if(ligStep2 < SDF.eLightStep2.None + 0.5) {;}
        else if(ligStep2 < SDF.eLightStep2.Emissive + 0.5) 
        {
            emAll = V3AddV3(emAll, V3MulFloat(radiance, nDotL));
        }
        
        if(isPointLight > 0.5) {
            DPtAll=V3AddV3(DPtAll,V3MulV3(diffuse, radiance));
            SPtAll= V3AddV3(SPtAll,V3MulV3(specular, radiance));
        }
        else {
            DDirAll=V3AddV3(DDirAll,V3MulV3(diffuse, radiance));
            SDirAll= V3AddV3(SDirAll,V3MulV3(specular, radiance));
        }

    }
    DAll = DDirAll;
    SAll = SDirAll;

    if(ligStep2 > SDF.eLightStep2.Emissive - 0.5 && ligStep2 < SDF.eLightStep2.Emissive + 0.5) 
    {

        emAll = V3MulFloat(albedo.rgb, emissive);
        

        // emAll = V3MulFloat(emAll, 0.5); //em이 너무 많이 들어가서 반으로 줄임
        // var brightness : number = V3Dot(emAll, new CVec3(0.2125, 0.7152, 0.0722));
        // if(brightness > 1.0) {
        //     emAll = SaturateV3(emAll);
        //     emAll = V3MulFloat(emAll, 0.5); //em이 너무 밝아서 반으로 줄임
        // }
        // else {
        //     emAll = new CVec3(0.0, 0.0, 0.0);
        // }

        // if(emissive > 1.0) {
        //     emAll = V3MulFloat(albedo.rgb, emissive);
        //     DAll = V3MulFloat(DAll, emissive); //diffuse값도 emissive값에 의해 커짐
        //     SAll = new CVec3(0.0,0.0,0.0);
        // }
        // else if(emissive > 0.0) {
        //     emAll = V3Mix(emAll, albedo.rgb, emissive); //초과된 빛과 albedo 사이의 값으로 나옴
        //     DAll = V3Mix(DAll, emAll, emissive); //방출광과 diffuse 사이의 값으로 나옴
        //     SAll = V3Mix(SAll, new CVec3(0.0,0.0,0.0), emissive); //emissive가 커지면 specular가 점점 줄어듬
        // }
    }

    //shadow
    if(shadow>-0.5)
    {
        DAll = V3MulFloat(DAll,shadow);
        SAll = V3MulFloat(SAll,shadow);
    }

    //point light
    DAll=V3AddV3(DAll,V3DivV3(DPtAll,V3AddV3(DPtAll,new CVec3(1.0,1.0,1.0))));
    SAll=V3AddV3(SAll,V3DivV3(SPtAll,V3AddV3(SPtAll,new CVec3(1.0,1.0,1.0))));

    //환경맵 : 그림자 영향 안받음
    if(envCube > SDF.eEnvCube.None + 0.5) 
    {
        //pbr 라이팅 모델임 : Specular도 환경맵 영향 받음
        if(ligStep1 < SDF.eLightStep1.CookTorrance + 0.5 && ligStep1 > SDF.eLightStep1.CookTorrance - 0.5)
        {
            var posToCam : CVec3 =V3Nor(V3SubV3(position.xyz,campos)); //V
            var R2 : CVec3 = reflect(posToCam, normal);

            if(envCube > SDF.eEnvCube.Texture - 0.5) {
                //diffuse
                var cubeD : CVec3 = SamCubeLodToColor(0.0,normal, 20.0).xyz;
                var ambientLight :CVec3 = V3MulV3(V3MulV3(albedo.xyz,cubeD),ambient_color);
                DAll=V3AddV3(ambientLight,DAll);

                //specular
                var cubeS : CVec3 = SamCubeLodToColor(0.0,R2, roughness*20.0).xyz;
                SAll=V3AddV3(SAll, V3MulV3(V3MulFloat(cubeS, metalic * 0.5 + 0.5*(1.0-roughness)), albedo.rgb));                
            }
        }
        //pbr 모델 아님 : diffuse만 영향 받음
        else
        {
            var cubeD : CVec3 = SamCubeLodToColor(0.0,normal,20.0).rgb;
            var ambientLight :CVec3 = V3MulV3(V3MulV3(albedo.xyz,cubeD),ambient_color);
            DAll=V3AddV3(ambientLight,DAll);
        }
        
    } 
    else
    {
        var ambientLight :CVec3 = V3MulV3(albedo.xyz,ambient_color);
        DAll=V3AddV3(ambientLight,DAll);
    }
    
    return new CMat3(DAll, SAll, emAll);
}

export function LightCac2D(position : CVec4,albedo : CVec4,normal :CVec3,ambientColor : CVec3) : CMat3
{
    
    var DPtAll : CVec3=new CVec3(0.0,0.0,0.0);
    var DDirAll : CVec3=new CVec3(0.0,0.0,0.0);
    if(albedo.x<0.01) albedo.x=0.01;
    if(albedo.y<0.01) albedo.y=0.01;
    if(albedo.z<0.01) albedo.z=0.01;

    var norLen : number=V3Len(normal);
    //노말맵 안쓰면 기본 노말
    if(norLen<0.5)  normal=new CVec3(0.0,1.0,0.0);

    for(var i=0;i<TexSizeHalfInt;++i)
    {
        if(i >= FloatToInt(ligCount)) break;
        var lDir : CVec4=Sam2DToV4(ligDir,i);
        var lCol : CVec4=Sam2DToV4(ligCol,i);

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
            DDirAll=V3AddV3(DDirAll,V3MulV3(albedo.rgb,diffuse));	
        }
    }
    return new CMat3(V3AddV3(DPtAll,DDirAll), new CVec3(0.0,0.0,0.0), new CVec3(0.0,0.0,0.0));
}
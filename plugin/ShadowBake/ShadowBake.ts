import { XAtlasAPI } from "./xatlasjs/xatlasAPI.js"
import { CMeshBuf, CMeshCreateInfo } from "../../artgine/render/CMeshCreateInfo.js";
import { CShader, CShaderList, CVertexFormat } from "../../artgine/render/CShader.js";
import { CBound } from "../../artgine/geometry/CBound.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CModal } from "../../artgine/basic/CModal.js";
import { Bootstrap } from "../../artgine/basic/Bootstrap.js";
import { SDF } from "../../artgine/z_file/SDF.js";
import { CObject } from "../../artgine/basic/CObject.js";
import { CCanvas } from "../../artgine/canvas/CCanvas.js";
import { CLight } from "../../artgine/canvas/component/CLight.js";
import { CPaint3D } from "../../artgine/canvas/component/paint/CPaint3D.js";
import { CMesh } from "../../artgine/render/CMesh.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CSubject } from "../../artgine/canvas/subject/CSubject.js";
import { CTexture, CTextureInfo } from "../../artgine/render/CTexture.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CUpdate } from "../../artgine/basic/Basic.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CRPAuto } from "../../artgine/canvas/CRPMgr.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CRenderPass } from "../../artgine/render/CRenderPass.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CBrush } from "../../artgine/canvas/CBrush.js";
import { CDevice } from "../../artgine/render/CDevice.js";
import { CWindow } from "../../artgine/system/CWindow.js";
import { CUtil } from "../../artgine/basic/CUtil.js";
import { CCamera } from "../../artgine/render/CCamera.js";
import { CRendererGL } from "../../artgine/render/CRenderer.js";


let g_xAtlas : XAtlasAPI = null;
let g_chartOptions = {
    fixWinding: false,
    maxBoundaryLength: 0,
    maxChartArea: 0,
    maxCost: 2,
    maxIterations: 1,
    normalDeviationWeight: 2,
    normalSeamWeight: 4,
    roundnessWeight: 0.009999999776482582,
    straightnessWeight: 6,
    textureSeamWeight: 0.5,
    useInputMeshUvs: false,
};
let g_packOptions = {
    bilinear: true,
    blockAlign: false,
    bruteForce: false,
    createImage: false,
    maxChartSize: 0,
    padding: 0,
    resolution: 0,
    rotateCharts: true,
    rotateChartsToAxis: true,
    texelsPerUnit: 0
};
let g_stopLock : boolean = false;
export class CUnwrapUV
{
    public static async Init() {
        await new Promise(r => setTimeout(r, 2000));
        if(g_xAtlas == null) {
            g_xAtlas = new XAtlasAPI(() => {
                //API 로딩이 끝나면 알려주는 함수
                console.log("onLoad");
            }, (path, dir) => {
                //현재 위치가 .jsp파일 위치라서 wasm파일 위치 찾아줘야 함.
                if(path == "xatlas.wasm") return path;
                return dir + path;
            }, (mode, progress) => {
                //generate 함수 부르면 얼마나 진행되었는지 알려주는 함수
                // console.log("on progress", mode, progress);
            });
        }
        //load 끝나야 다른 작업 가능해서 끝날때까지 timeout으로 기다림
        while(!(await g_xAtlas.loaded)) {
            await new Promise(r => setTimeout(r, 500));
        }

        return;
    }

    static async Unwrap(_ci : CMeshCreateInfo)
    {
        if(g_xAtlas == null || !g_xAtlas.loaded) {
            await CUnwrapUV.Init();
        }
        while(g_stopLock) {
			await new Promise(r => setTimeout(r, 500));
		}
		g_stopLock = true;
        await g_xAtlas.createAtlas();
        let mesh_vertices = _ci.GetVFType(CVertexFormat.eIdentifier.Position)[0];
        
        let verticesLen = mesh_vertices.bufF.Size(1);
        let vertices = mesh_vertices.bufF.GetArray().subarray(0, verticesLen);
        let mesh_indexes = _ci.index;
        let indexes : Uint32Array;
        if(_ci.indexCount == 0) {
            let iCount = Math.floor(vertices.length / 3);
            indexes = new Uint32Array(iCount);
            for(let i = 0; i < iCount; i++) {
                indexes[i] = i;
            }
        } else {
            let iCount = _ci.indexCount - (_ci.indexCount % 3);
            indexes = new Uint32Array(iCount);
            for(let i = 0; i < iCount; i++) {
                indexes[i] = mesh_indexes[i];
            }
        }

        await g_xAtlas.addMesh(indexes, vertices, verticesLen);

        let mesh = await g_xAtlas.generateAtlas(g_chartOptions, g_packOptions, true)[0];

        //늘어난 vertex 다시 구성
        for(let i = 0; i < _ci.vertex.length; i++) {
            let type = _ci.vertex[i].vfType;
            if(type == CVertexFormat.eIdentifier.Vertex) {
                _ci.vertex[i].bufF.SetArray(mesh.vertex.vertices);
                _ci.vertex[i].bufF.mSize = mesh.vertex.vertices.length;
                _ci.vertex[i].bufI.length = 0;
                continue;
            }
            let bufF = _ci.vertex[i].bufF.GetArray();
            let dataLen : number = Math.floor(_ci.vertex[i].bufF.Size(1) / _ci.vertexCount);

            let newMeshBuf = new CMeshBuf(type);
            for(let j = 0; j < mesh.oldIndexes.length; j++) {
                let idx = mesh.oldIndexes[j];
                switch(dataLen) {
                    case 1:
                        newMeshBuf.bufF.Push(bufF[idx]);
                        break;
                    case 2:
                        newMeshBuf.bufF.Push(bufF[idx * 2]);
                        newMeshBuf.bufF.Push(bufF[idx * 2 + 1]);
                        break;
                    case 3:
                        newMeshBuf.bufF.Push(bufF[idx * 3]);
                        newMeshBuf.bufF.Push(bufF[idx * 3 + 1]);
                        newMeshBuf.bufF.Push(bufF[idx * 3 + 2]);
                        break;
                    case 4:
                        newMeshBuf.bufF.Push(bufF[idx * 4]);
                        newMeshBuf.bufF.Push(bufF[idx * 4 + 1]);
                        newMeshBuf.bufF.Push(bufF[idx * 4 + 2]);
                        newMeshBuf.bufF.Push(bufF[idx * 4 + 3]);
                        break;
                    case 16:
                        newMeshBuf.bufF.Push(bufF[idx * 16]);
                        newMeshBuf.bufF.Push(bufF[idx * 16 + 1]);
                        newMeshBuf.bufF.Push(bufF[idx * 16 + 2]);
                        newMeshBuf.bufF.Push(bufF[idx * 16 + 3]);

                        newMeshBuf.bufF.Push(bufF[idx * 16 + 4]);
                        newMeshBuf.bufF.Push(bufF[idx * 16 + 5]);
                        newMeshBuf.bufF.Push(bufF[idx * 16 + 6]);
                        newMeshBuf.bufF.Push(bufF[idx * 16 + 7]);

                        newMeshBuf.bufF.Push(bufF[idx * 16 + 8]);
                        newMeshBuf.bufF.Push(bufF[idx * 16 + 9]);
                        newMeshBuf.bufF.Push(bufF[idx * 16 + 10]);
                        newMeshBuf.bufF.Push(bufF[idx * 16 + 11]);

                        newMeshBuf.bufF.Push(bufF[idx * 16 + 12]);
                        newMeshBuf.bufF.Push(bufF[idx * 16 + 13]);
                        newMeshBuf.bufF.Push(bufF[idx * 16 + 14]);
                        newMeshBuf.bufF.Push(bufF[idx * 16 + 15]);
                        break;
                }
            }

            _ci.vertex[i] = newMeshBuf;
        }
        _ci.vertexCount = mesh.oldIndexes.length;

        //index 변경
        _ci.index.length = 0;
        for(let i = 0; i < mesh.index.length; i++) {
            _ci.index.push(mesh.index[i]);
        }

        _ci.indexCount = mesh.index.length;

        //shadow uv 채널 추가
        var uvBuffer = _ci.Create(CVertexFormat.eIdentifier.Shadow);
        uvBuffer.bufF.SetArray(mesh.vertex.coords1);
        uvBuffer.bufF.mSize = mesh.vertex.coords1.length;

        await g_xAtlas.destroyAtlas();
        g_stopLock = false;
    }
}


function GetOptimalResoultion(_bound : CBound, _max : number, _shadowSize : number, _min : number = 256) {
    const dx = _bound.mMax.x - _bound.mMin.x;
    const dy = _bound.mMax.y - _bound.mMin.y;
    const dz = _bound.mMax.z - _bound.mMin.z;

    // 매우 작은 오브젝트면 사이즈를 줄이기 위한 조치
    const surfaceSize = 2 * (dx * dy + dy * dz + dz * dx) / _shadowSize;
    
    let num = 0;

    if(surfaceSize <= 1) num = 1;

    num = 1;
    while(num * 2 < surfaceSize) {
        num *= 2;
    }

    if (_max < _min) {
        return _max;
    }
    return CMath.Clamp(num, _min, _max);
}

class CModalBake extends CModal
{
    constructor(_key : string)
    {
        super(_key);

        this.SetTitle(CModal.eTitle.None);
        this.SetBG(Bootstrap.eColor.info);

        this.SetBody(`
            <div class="container mt-5">
                <h2 class="mb-4 text-center">🧁 Bake...</h2>
                
                <div class="progress" role="progressbar" aria-label="Baking progress" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="height: 30px;">
                <div id="bakeProgress" class="progress-bar progress-bar-striped progress-bar-animated bg-warning" style="width: 0%">0%</div>
                </div>

                <p class="text-center mt-3" id="statusText">Ready...</p>
            </div>
        `);
    }

    SetBakeText(_text : string, _progress : number) {
        const progressBar = document.getElementById("bakeProgress");
        const statusText = document.getElementById("statusText");

        if (_progress >= 100) {
            statusText.textContent = "✅ Bake!";
            return;
        }

        progressBar.style.width = _progress + "%";
        progressBar.textContent = _progress + "%";
        progressBar.setAttribute("aria-valuenow", _progress.toString());

        statusText.textContent = `${_text}... (${_progress}%)`;
    }
}
/**
 * 사용법
 * 
 * let Main3D = new CCanvas3D();
 * // 캔버스에 오브젝트 Push
 * CBaker.Bake(Main3D);
 * 
 * 옵션 기본값 : Pbr
 * 변경 하고 싶을 시에 new CBakerOption() 생성
 * 
 * 
 */
export class CShadowBakerOption
{
    texMaxSize : number = 2048;

    ligStep0 : number = SDF.eLightStep0.Lambert;
    ligStep1 : number = SDF.eLightStep1.CookTorrance;
    ligStep2 : number = SDF.eLightStep2.Emissive;
    ligStep3 : number = SDF.eLightStep3.None;
    envMap : string = null;

    bias : number = null;
    normalBias : number = null;
    kernalPCF : number = null;

    shadowRate : number = null;
}
export class CShadowBaker extends CObject
{
    private static m_modal : CModalBake;

    public static async Bake(_canvas : CCanvas, _option : CShadowBakerOption = new CShadowBakerOption()) : Promise<void>
    {
        
        const fw = _canvas.GetFrame();
        const brush = _canvas.GetBrush();
        const lightArr : CLight[] = [];
        const paintArr : CPaint3D[] = [];

        //캔버스 auto에 안 들어가게 방지
        const prevIAuto = fw.PF().mIAuto;
        fw.PF().mIAuto = false;

        //모달 켜기
        this.m_modal = new CModalBake(_canvas.Key());
        this.m_modal.Open(CModal.ePos.Center);

        _canvas.Update(1); 

        //현재 라이트, 페인트 가져오기
        this.PopulateObjects(_canvas, lightArr, paintArr);

        //카메라 저장
        const prevEye = brush.GetCam3D().GetEye().Export();
        const prevLook = brush.GetCam3D().GetLook().Export();

        //(현재 페인트 - 베이킹용 페인트) 맵
        const ptBakeMap : Map<CPaint3D, CPaint3D> = new Map();

        //init되어있지 않은 페인트 있으면 리턴
        for(let pt of paintArr) {
            if(!pt.mTree || pt.GetBound().GetType() == CBound.eType.Null) {
                return;
            }
        }

        //베이킹해야 하는 페인트 필터링, 복사
        for(let pt of paintArr) {
            if(pt.GetTag().has("light") || pt.GetTag().has("shadow")) {
                ptBakeMap.set(pt, pt.Export());
            }
        }

        //베이킹해야 하는 페인트 복사
        const alreadyUnwrapped : Set<string> = new Set();
        const unwrappedThisTime : Set<string> = new Set();
        for(let [ptO, ptN] of ptBakeMap) {
            const mesh = fw.Res().Find(ptO.GetMesh()) as CMesh;
            const unwrappedMeshKey = ptO.GetMesh() + "_unwrapped";
            if(fw.Res().Find(unwrappedMeshKey) && unwrappedThisTime.has(unwrappedMeshKey) == false) {
                alreadyUnwrapped.add(unwrappedMeshKey);
            }
            else {
                unwrappedThisTime.add(unwrappedMeshKey);
                fw.Res().Push(unwrappedMeshKey, mesh.Export());
            }
            ptN.SetMesh(unwrappedMeshKey);
        }

        

        //그림자용 캔버스
        const shadowCanv = this.CreateShadowCanv(_canvas, ptBakeMap, lightArr);

        //랜더링용 캔버스
        const tempCanvas = new CCanvas(fw, brush);
        for(let [ptOrigin, ptCopy] of ptBakeMap) {
            const wMat = ptOrigin.GetOwner().GetWMat().Export();
            const pos = new CVec3(wMat.mF32A[12], wMat.mF32A[13], wMat.mF32A[14]);
            const sca = CMath.MatDecomposeSca(wMat);
            wMat.mF32A[0] /= sca.x; wMat.mF32A[5] /= sca.y; wMat.mF32A[10] /= sca.z;
            wMat.mF32A[12] = 0; wMat.mF32A[13] = 0; wMat.mF32A[14] = 0;
            const rot = CMath.MatToQut(wMat);

            const obj = new CSubject([ptCopy]);
            obj.SetPos(pos);
            obj.SetSca(sca);
            obj.SetRot(rot);
            tempCanvas.PushSub(obj);

            ptCopy.Update(1);
            ptCopy.CacBound();
        }

        

        //언랩
        const unwrapPromises = this.UnwrapMesh(fw, ptBakeMap, alreadyUnwrapped);

        //베이킹
        let progress : number = 0;
        for(const promise of unwrapPromises) {
            // promise.then(_ptO => {
            //     progress += (1 / unwrapPromises.length * 100);
            //     this.m_modal.SetBakeText(_ptO.GetMesh(), Math.round(progress * 100) / 100);
            //     this.BakeOne(_canvas, _option, _ptO, ptBakeMap, lightArr, shadowCanv);
            // });

            let pt0=await promise;
            progress += (1 / unwrapPromises.length * 100);
            this.m_modal.SetBakeText(pt0.GetMesh(), Math.round(progress * 100) / 100);
            this.BakeOne(_canvas, _option, pt0, ptBakeMap, lightArr, shadowCanv);
            
        }

        Promise.all(unwrapPromises).then(() => {
            //atlas 삭제
            // await CUnwrapUV.Terminate();

            // 원본 Mesh 삭제
            // for(let unwrappedMeshKey of unwrappedMeshKeys) {
            //     fw.Res().m_res.delete(unwrappedMeshKey);
            // }

            //캔버스 삭제
            shadowCanv.Clear();
            tempCanvas.Clear();

            //카메라 복원
            this.RestoreCam3D(brush, prevEye, prevLook);

            let g_canvas = CCanvas.GetCanvasList();
            let index = g_canvas.indexOf(shadowCanv);
            if(index != -1) {
                g_canvas.splice(index, 1);
            }
            index = g_canvas.indexOf(tempCanvas);
            if(index != -1) {
                g_canvas.splice(index, 1);
            }

            //모달 끄기
            this.m_modal.Close();
            //캔버스 PF 원복
            fw.PF().mIAuto = prevIAuto;
        });
    }

    private static PopulateObjects(_canvas : CCanvas, _ligArr : CLight[], _ptArr : CPaint3D[]) {
        for (const [key, obj] of _canvas.GetSubMap()) {
            _ptArr.push(...obj.FindComps(CPaint3D, true));
            _ligArr.push(...obj.FindComps(CLight, true));
        }
    }

    private static BakeOne(_canvas : CCanvas, _option : CShadowBakerOption, _ptOrigin : CPaint3D, _ptMap : Map<CPaint3D, CPaint3D>, _ligArr : CLight[], _shadowCanv : CCanvas) {
        const fw = _canvas.GetFrame();
        const brush = _canvas.GetBrush();
        
        //현재 정보 저장
        const lightDistanceMap : Map<CLight, number> = new Map();
        for(let light of _ligArr) {
            lightDistanceMap.set(light, light.mShadowDistance);
        }

        function nearestLowerPowerOfTwo(n: number): number {
            if (n < 1) return 1; // 1보다 작으면 반환할 2의 거듭제곱 없음
            return 1 << Math.floor(Math.log2(n));
        }

        let textureSize = 1;
        if(_ptOrigin.GetTexture().length > 0) {
            const tex = (fw.Res().Find(_ptOrigin.GetTexture()[0]) as CTexture);
            textureSize = nearestLowerPowerOfTwo(Math.max(tex.GetWidth(), tex.GetHeight()));
        }
        const shadowSize = (fw.Res().Find(fw.Pal().GetShadowArrTex()) as CTexture).GetWidth();
        const resolution = GetOptimalResoultion(_ptOrigin.GetBoundFMat(), _option.texMaxSize, shadowSize, textureSize);

        //텍스쳐 생성
        const tempTexKey = fw.Ren().BuildRenderTarget(
            [new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8)],
            new CVec2(resolution, resolution)
        );
        const tempTex = fw.Res().Find(tempTexKey) as CTexture;
        tempTex.SetFilter(CTexture.eFilter.Neaest);
        tempTex.SetAutoResize(false);
        tempTex.SetMipMap(CTexture.eMipmap.None);
        fw.Ren().BuildTexture(tempTex);

        //rp 생성
        const bakeRP = this.CreateBakeRenderPass(_option, fw, tempTexKey);
        const expandRP = this.CreateExpandRenderPass(fw);

        //카메라 세팅
        this.SetCam3DPos(brush, fw, _ptOrigin);

        //그림자맵 랜더링
        const pt = _ptMap.get(_ptOrigin);

        brush.mLightCount=0;
        brush.mShadowCount=0;
        brush.mShadowRead.clear();
        brush.mDoubleChk.clear();
        for(let light of _ligArr) 
        {
            light.mShadowDistance = pt.mBoundFMatR / 2000;
            light.CCamCompReq(brush);
        }

        for(let obj of _shadowCanv.GetSubMap().values()) {
            obj.FindComp(CPaint3D).mAutoRPUpdate = false;
        }
        brush.mAutoRPUpdate = CUpdate.eType.Not;
        _shadowCanv.ClearBatch();
        CCanvas.RenderCanvas(brush, [_shadowCanv]);

        //메쉬 생성
        const mp = pt.mTreeNode;
        const oldMesh = fw.Res().Find(pt.GetMesh()) as CMesh;
        const newMeshKey = this.CreateBakeMesh(fw, pt);
        const newMesh = fw.Res().Find(newMeshKey) as CMesh;

        //vf
        let vf : CShader;
        let sres = brush.mFrame.Res().Find(bakeRP.mShader);
        if (sres instanceof CShader)
            vf = sres;
        else if (sres instanceof CShaderList)
            vf = sres.GetShader([bakeRP.mTag, ...pt.GetTag()]);

        let expandVf : CShader;
        sres = brush.mFrame.Res().Find(expandRP.mShader);
        if (sres instanceof CShader)
            expandVf = sres;
        else if (sres instanceof CShaderList)
            expandVf = sres.GetShader([expandRP.mTag]);

        //베이킹 텍스쳐 굽기
        let nodeOff = 0;
        while(mp.Size() != nodeOff) {
            const nodemp = mp.Find(nodeOff);
            const ci = nodemp.md.mData.ci;
            if(ci) {
                const texKey = this.CreateNewTex(fw, resolution);
                const tex = fw.Res().Find(texKey) as CTexture;
                newMesh.texture.push(texKey);

                fw.Ren().UseShader(vf);
                fw.Dev().GL().activeTexture(fw.Dev().GL().TEXTURE0+9);	
                fw.Dev().GL().bindTexture(fw.Dev().GL().TEXTURE_2D, null);
                fw.Dev().GL().bindTexture(fw.Dev().GL().TEXTURE_2D_ARRAY, null);

                //fw.Ren().SendGPU(vf,[fw.Pal().GetShadowArrTex()],null);
                

                let beforeRP = fw.Dev().ChangeRenderPass(bakeRP);
                fw.Dev().SetClearColor(true, new CVec4(0, 0, 0, 0));
                fw.Dev().SetClearDepth(true);
                // fw.Ren().Dev().SetClearColor(false);
                fw.Ren().Begin(tempTex, brush.GetCam3D().GetOrthographic(), bakeRP.mRenderTargetUse, bakeRP.mRenderTargetLevel);
                fw.Ren().SendGPU(vf,new CVec2(tempTex.GetRWidth(), tempTex.GetRHeight()),"rtSize");
                
                fw.Dev().ViewPort(0, 0, resolution, resolution);

                for (let each2 of vf.mDefault) 
                {
                    if(each2.mTag==null || each2.mTag=="canvas")
                        fw.Ren().SendGPU(vf, each2);
					else if(each2.mTag!=null && each2.mTag=="time")
					{
						
						fw.Ren().SendGPU(vf, each2);
					}
                    
                    
                }

                fw.Ren().SendGPU(vf,pt.GetColorModel(),"colorModel");
                fw.Ren().SendGPU(vf,pt.GetAlphaModel(),"alphaModel");
                // fw.Ren().BMgr().SetValueFloat(vf, "worldMat", paint.GetFMat().F32A(), 16);
                fw.Ren().SendGPU(vf,brush.GetCam3D().GetViewMat(),"viewMat");
                fw.Ren().SendGPU(vf,brush.GetCam3D().GetProjMat(),"projectMat");
                fw.Ren().SendGPU(vf,brush.GetCam3D().GetEye(),"camPos");

                for(let attr of bakeRP.mShaderAttr) {
                    fw.Ren().SendGPU(vf, attr);
                }
                CCanvas.GlobalVF(brush, vf,brush.GetCam3D());
                // fw.Dev().GL().activeTexture(fw.Dev().GL().TEXTURE0+9);	
                // fw.Dev().GL().bindTexture(fw.Dev().GL().TEXTURE_2D, fw.Ren().mTexUse);

                fw.Ren().SendGPU(vf, [fw.Ren().mUniToSam2dKey],[0],null,9);
                // let btu=fw.Ren().mTexUse;
                // fw.Ren().TexUseReset();
                // (fw.Ren() as CRendererGL).SetTexGBuf(vf,fw.Ren().mUniToSam2d,btu,fw.Ren().mUniTexLastOff);

                //this.GlobalVF(brush, vf);

                if(pt.mMeshRes.skin.length > 0 && vf.mUniform.get("weightArrMat")!=null) {
                    if(pt.mWeightMat.length==0)
                    {
                        pt.mWeightMat=new Float32Array(4*4);
                        for(var i=0;i<4*4;++i)
                        {
                            if(i%16==0 || i%16==5 || i%16==10 || i%16==15)
                                pt.mWeightMat[i]=1;
                            else
                                pt.mWeightMat[i]=0;
                        }
                    }
                    //fw.Ren().BMgr().SetValueFloat(vf, "weightArrMat", pt.m_weightMat, 16);
                    fw.Ren().SendGPU(vf,pt.mSkinType,"skin");
                }
                else {
                    fw.Ren().SendGPU(vf,SDF.eSkin.None,"skin");
                }

                fw.Ren().SendGPU(vf,pt.mWindInfluence,"windInfluence");

                fw.Ren().SendGPU(vf,_ptOrigin.GetTexture(),nodemp.mpi.mData.textureOff);

                if (vf.mUniform.get("material") != null)
                {
                    fw.Ren().SendGPU(vf,pt.mMaterial,"material");
                }
                
                fw.Ren().SendGPU(vf, nodemp.sumSA);
                const drawMesh = pt.GetDrawMesh(pt.mMesh + nodemp.md.mKey, vf, nodemp.md.mData.ci);
                fw.Ren().MeshDrawNodeRender(vf, drawMesh);

                fw.Dev().ViewPort(0, 0, fw.PF().mWidth, fw.PF().mHeight);
                fw.Ren().End(tempTex);
                fw.Ren().TexBindReset();
                fw.Dev().ChangeRenderPass(beforeRP);

                //expand
                fw.Ren().UseShader(expandVf);

                beforeRP = fw.Dev().ChangeRenderPass(expandRP);
                fw.Dev().SetClearColor(true, new CVec4(0, 0, 0, 0));
                fw.Dev().SetClearDepth(true);
                fw.Ren().Begin(tex, true, expandRP.mRenderTargetUse, expandRP.mRenderTargetLevel);

                fw.Dev().ViewPort(0, 0, resolution, resolution);

                for (let each2 of expandVf.mDefault) {
                    //fw.Ren().SendGPU(expandVf, each2);
                    if(each2.mTag==null || each2.mTag=="canvas")
                        fw.Ren().SendGPU(vf, each2);
					else if(each2.mTag!=null && each2.mTag=="time")
					{
						
						fw.Ren().SendGPU(vf, each2);
					}
                }

                for(let attr of expandRP.mShaderAttr) {
                    fw.Ren().SendGPU(expandVf, attr);
                }
                CCanvas.GlobalVF(brush, expandVf,brush.GetCam3D());

                fw.Ren().SendGPU(expandVf, [tempTexKey]);
                const dm = pt.GetDrawMesh("CPaint2D", expandVf, fw.Pal().MCI2D());
                fw.Ren().MeshDrawNodeRender(expandVf, dm);

                fw.Dev().ViewPort(0, 0, fw.PF().mWidth, fw.PF().mHeight);
                fw.Ren().End(tex);
                fw.Ren().SendGPU(expandVf, null, null, null, 0);
                fw.Dev().ChangeRenderPass(beforeRP);
            }

            nodeOff++;
        }

        //원복
        for(let light of _ligArr) {
            light.mShadowDistance = lightDistanceMap.get(light);
        }

        brush.mLightCount=0;
        brush.mShadowCount=0;
        brush.mShadowRead.clear();

        //텍스쳐 삭제
        // fw.Ren().ReleaseTexture(fw.Res().Find(tempTexKey));
        // fw.Res().Remove(tempTexKey);

        //페인트 세팅
        _ptOrigin.SetMesh(newMeshKey);
        _ptOrigin.RemoveTag("light");
        _ptOrigin.RemoveTag("shadow");
        _ptOrigin.PushRenderPass([]);
        _ptOrigin.BatchClear();
        _ptOrigin.Update(1);
    }

    private static CreateShadowCanv(_canvas : CCanvas, _ptMap : Map<CPaint3D, CPaint3D>, _ligArr : CLight[]) {
        const fw = _canvas.GetFrame();
        const brush = _canvas.GetBrush();

        const shadowCanv = new CCanvas(fw, brush);
        const shadowWriteRPArr : Array<CRPAuto> = this.GetShadowWriteRP(brush, _ligArr);

        for(let [ptO, ptN] of _ptMap) {
            if(!ptO.GetTag().has("shadow")) {
                continue;
            }

            const ptCopy = ptN.Export();
            
            const wMat = ptO.GetOwner().GetWMat().Export();
            const pos = new CVec3(wMat.mF32A[12], wMat.mF32A[13], wMat.mF32A[14]);
            const sca = CMath.MatDecomposeSca(wMat);
            wMat.mF32A[0] /= sca.x; wMat.mF32A[5] /= sca.y; wMat.mF32A[10] /= sca.z;
            wMat.mF32A[12] = 0; wMat.mF32A[13] = 0; wMat.mF32A[14] = 0;
            const rot = CMath.MatToQut(wMat);

            const obj = new CSubject([ptCopy]);
            obj.SetPos(pos);
            obj.SetSca(sca);
            obj.SetRot(rot);
            shadowCanv.PushSub(obj);

            ptCopy.PushRenderPass(shadowWriteRPArr, false);
            ptCopy.Update(1);
            ptCopy.CacBound();
        }
        for(let i = 0; i < shadowCanv.mPushSub.Size(); i++) {
            const obj = shadowCanv.mPushSub.Find(i);
            obj.Start();
            obj.SubjectUpdate(1);
            shadowCanv.GetSubMap().set(obj.Key(), obj);
        }
        shadowCanv.mPushSub.Clear();
        shadowCanv.Update(1);

        return shadowCanv;
    }

    /*******************************************************************************************/
    //mesh 관련
    private static UnwrapMesh(_fw : CFrame, _ptMap : Map<CPaint3D, CPaint3D>, _alreadyUnwrappedKey : Set<string>) : Promise<CPaint3D>[] {
        const meshPaintMap : Map<string, CPaint3D[]> = new Map();
        const meshCiMap : Map<string, CMeshCreateInfo[]> = new Map();
        for(let [ptO, ptN] of _ptMap) {
            const ciArr = [];

            if(_alreadyUnwrappedKey.has(ptN.GetMesh()) == false) {

                const cmesh = _fw.Res().Find(ptN.GetMesh()) as CMesh;
                if(!cmesh) console.error("Bake: CMesh not found for paint", ptN);
                const mdArr = [cmesh.meshTree];
                while(mdArr.length > 0) {
                    const md = mdArr.shift();
                    if(md.mData.ci && md.mData.ci.GetVFType(CVertexFormat.eIdentifier.Shadow).length == 0) {
                        ciArr.push(md.mData.ci);
                    }
                    if(md.mChild) mdArr.push(md.mChild);
                    if(md.mColleague) mdArr.push(md.mColleague);
                }

                _alreadyUnwrappedKey.add(ptN.GetMesh());
            }

            if(meshPaintMap.has(ptN.GetMesh())) {
                meshPaintMap.get(ptN.GetMesh()).push(ptO);
            }
            else {
                meshPaintMap.set(ptN.GetMesh(), [ptO]);
                meshCiMap.set(ptN.GetMesh(), ciArr);
            }
        }

        const promises = [];

        const ciUnwrapCache = new Map<string, Promise<void>>();

        for (let [meshKey, paintArr] of meshPaintMap) {
            if (!ciUnwrapCache.has(meshKey)) {
                const ciArr = meshCiMap.get(meshKey);
                const unwrapPromise = (async () => {
                    const pArr = [];
                    for (const ci of ciArr) {
                        pArr.push(CUnwrapUV.Unwrap(ci));
                    }
                    await Promise.all(pArr);
                })();
                ciUnwrapCache.set(meshKey, unwrapPromise);
            }

            const unwrapPromise = ciUnwrapCache.get(meshKey)!;
            for (const paint of paintArr) {
                const promise = unwrapPromise.then(() => paint);
                promises.push(promise);
            }
        }

        

        return promises;
    }

    private static CreateBakeMesh(_fw : CFrame, _pt : CPaint3D) {
        const cmesh = _fw.Res().Find(_pt.GetMesh()) as CMesh;
        if(!cmesh) console.error("Bake: CMesh not found for paint", _pt);

        //복사한 메쉬 생성
        const bakeCMeshKey = _pt.GetMesh() + "_from" + _pt.ObjHash();
        const bakeCMesh = cmesh.Export();
        _fw.Res().Push(_pt.GetMesh() + "_from" + _pt.ObjHash(), bakeCMesh);
        bakeCMesh.texture = [];

        //기존 메쉬에서 UV2를 UV1으로 변경, 텍스쳐 베이킹된 텍스쳐로 변경, texOff 변경
        let ciIndex = 0;
        const mdArr = [bakeCMesh.meshTree];
        while(mdArr.length > 0) {
            const md = mdArr.shift();
            if(md.mData.ci) {
                md.mData.ci.RemoveVFType(CVertexFormat.eIdentifier.UV);
                const shaBuf = md.mData.ci.GetVFType(CVertexFormat.eIdentifier.Shadow)[0];
                const uvBuf = md.mData.ci.Create(CVertexFormat.eIdentifier.UV);
                uvBuf.bufF.SetArray(shaBuf.bufF.GetArray());
                uvBuf.bufF.mSize = shaBuf.bufF.mSize;
                uvBuf.bufI = shaBuf.bufI;
                md.mData.ci.RemoveVFType(CVertexFormat.eIdentifier.Shadow);
                md.mData.ci.RemoveVFType(CVertexFormat.eIdentifier.TexOff);
                
                md.mData.textureOff = [ ciIndex ];

                ciIndex++;
            }
            if(md.mChild) mdArr.push(md.mChild);
            if(md.mColleague) mdArr.push(md.mColleague);
        }

        return bakeCMeshKey;
    }

    /*******************************************************************************************/
    //랜더패스 관련
    private static CreateBakeRenderPass(_option : CShadowBakerOption, _fw : CFrame, _renderTarget : string) : CRenderPass
    {
        // const RP = new CRenderPass("Pre2Test");
        const RP = new CRenderPass(_fw.Pal().Sl3D().mKey);
        RP.mPriority = CRenderPass.ePriority.Normal;
        RP.mCullFace = CRenderPass.eCull.None;         //모든 면을 랜더링
        RP.mCullFrustum = false;                       //프러스텀 컬링 비활성화
        RP.mTag = "bake";
        RP.mShaderAttr.push(
            new CShaderAttr("ligStep0", _option.ligStep0),
            new CShaderAttr("ligStep1", _option.ligStep1),
            new CShaderAttr("ligStep2", _option.ligStep2),
            new CShaderAttr("ligStep3", _option.ligStep3),

            new CShaderAttr("dotCac", 1.0),
        );
        if(_option.bias) {
            RP.mShaderAttr.push(
                new CShaderAttr("bias", _option.bias)
            );
        }
        if(_option.normalBias) {
            RP.mShaderAttr.push(
                new CShaderAttr("normalBias", _option.normalBias)
            );
        }
        if(_option.kernalPCF) {
            RP.mShaderAttr.push(
                new CShaderAttr("PCF", _option.kernalPCF)
            );
        }

        if(_option.envMap) {
            RP.mShaderAttr.push(
                new CShaderAttr(0, _option.envMap),
                new CShaderAttr("envCube", 0)
            );
        }
        RP.mShaderAttr.push(new CShaderAttr(0.0, "shadowArr.tex"));
        RP.mRenderTarget = _renderTarget;
        RP.Reset();

        return RP;
    }

    private static CreateExpandRenderPass(_fw : CFrame) : CRenderPass
    {
        let RP = new CRenderPass(_fw.Pal().SlPost().mKey);
        RP.mPriority = CRenderPass.ePriority.Surface;
        RP.mCullFrustum = false;
        RP.mAlpha = false;
        RP.mTag = "bake";
        RP.Reset();

        return RP;
    }

    private static GetShadowWriteRP(_brush : CBrush, _ligArr : CLight[]) {
        const shadowWriteRPArr = [];
        for(let light of _ligArr) {
            light.CCamCompReq(_brush);
            if(light.Key() == null) continue;
            for(var i=0;i<light.mCascadeCycle.length;++i) {
                if(light.mCascadeCycle[i]==-1)	continue;
                for(let rp of light.GetWrite()) {
                    if(!rp.mInPaint.has("CPaint3D")) continue;
                    var srpKey=light.mShadowKey+rp.mShader+i;
                    if (_brush.AutoRP().has(srpKey)) {
                        shadowWriteRPArr.push(_brush.GetAutoRP(srpKey));
                    }
                }
            }
        }
        return shadowWriteRPArr;
    }

    /*******************************************************************************************/
    //카메라 관련 함수
    private static SetCam3DPos(_brush : CBrush, _fw : CFrame, _pt : CPaint3D) {
        // let min = new CVec3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        // let max = new CVec3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);

        // for (const pt of _ptArr) {
        //     const bound = pt.GetBoundFMat();
        //     if(min.x > bound.min.x) min.x = bound.min.x;
        //     if(min.y > bound.min.y) min.y = bound.min.y;
        //     if(min.z > bound.min.z) min.z = bound.min.z;

        //     if(max.x < bound.max.x) max.x = bound.max.x;
        //     if(max.y < bound.max.y) max.y = bound.max.y;
        //     if(max.z < bound.max.z) max.z = bound.max.z;
        // }

        const min = _pt.GetBoundFMat().mMin;
        const max = _pt.GetBoundFMat().mMax;

        const center = CMath.V3MulFloat(CMath.V3AddV3(min, max), 0.5);
        const size = CMath.V3SubV3(max, min);
        const radius = CMath.V3Len(size) * 0.5;
        const fovY = _brush.GetCam3D().mFov;
        const aspect = _fw.PF().mWidth / _fw.PF().mHeight;
        const fovX = 2 * Math.atan(Math.tan(fovY / 2) * aspect);
        const maxHalfAngle = Math.min(fovY,fovX) / 2;
        const distance = radius / Math.sin(maxHalfAngle);

        let look = center;
        const direction = new CVec3(0, 1, 0);
        let eye = CMath.V3AddV3(look, CMath.V3MulFloat(direction, distance));

        eye=new CVec3(0,0,0);
        look=new CVec3(0,0,0);
        _brush.GetCam3D().Init(eye, look);
        _brush.GetCam3D().ResetPerspective();
        _brush.GetCam3D().Update(1);
    }

    private static RestoreCam3D(_brush : CBrush, _prevEye : CVec3, _prevLook : CVec3) {
        _brush.GetCam3D().Init(_prevEye, _prevLook);
        _brush.GetCam3D().ResetPerspective();
        _brush.GetCam3D().Update(1);
    }

    /*******************************************************************************************/
    
    private static CreateNewTex(_fw : CFrame, _resolution : number) {
        const texKey = _fw.Ren().BuildRenderTarget(
            [new CTextureInfo(CTexture.eTarget.Sigle, CTexture.eFormat.RGBA8)],
            new CVec2(_resolution, _resolution)
        );
        let rtTex=_fw.Res().Find(texKey) as CTexture;
        rtTex.SetFilter(CTexture.eFilter.Linear);
        rtTex.SetAutoResize(false);
        // rtTex.SetMipMap(CTexture.eMipmap.None);
        _fw.Ren().BuildTexture(rtTex);

        return texKey;
    }


}
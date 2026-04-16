import { CUpdate } from "../../basic/Basic.js";
import { CClass } from "../../basic/CClass.js";
import { CEvent } from "../../basic/CEvent.js";
import { CMat } from "../../geometry/CMat.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CColor } from "../../render/CColor.js";
import { CRenderPass } from "../../render/CRenderPass.js";
import { CShaderAttr } from "../../render/CShaderAttr.js";
import { CTexture } from "../../render/CTexture.js";
import { CPaint } from "../component/paint/CPaint.js";
import { CPaintTerrain } from "../component/paint/CPaintTerrain.js";
import { CMapBuf } from "./CMapBuf.js";
import { CSubject } from "./CSubject.js";

export class CTerrainMap extends CSubject
{
    mHeightBuf : CMapBuf = new CMapBuf();
    mSplatBuf : CMapBuf = new CMapBuf();

    // 지오메트리 관련    
    mHeightTexture : string=null;
    mSplatTexture : string=null;

    mTerrainOffset : CVec3;
    mTerrainSize : CVec3;               // 일단 이 값이 셰이더로 넘어가기 때문에 y값을 height로 사용하고 있음

    //
    mLevel = new Array<number>(0);  // 해당 레벨이 몇번 반복할지
    mCellSize : number = 4;         // 가장 작은 셀의 크기
    
    mTexture : string[] = new Array();
    mTexCodi : CMat = new CMat([
        32, 32, 0, 0,
        32, 32, 0, 0,
        32, 32, 0, 0,
        32, 32, 0, 0
    ]);

    mTag : Array<string>;
    
    mTestMode : boolean = false;    // 라인 드로잉과 색상 추가
    
    constructor(_terrainSize : CVec3, _terrainOffset : CVec3 = new CVec3()) 
    {
        super();
        this.mTerrainOffset = _terrainOffset;
        this.mTerrainSize = _terrainSize;
        this.mHeightBuf.Reset(new CVec3(512,512,1),_terrainSize.x/512);
        this.mSplatBuf.Reset(new CVec3(512,512,1),_terrainSize.x/512);
        this.mTag = ["bilinear", "trilinear"];
    }
    SetLevel(_level : Array<number>) {
        this.mLevel = _level;
        this.RemoveComps(CPaintTerrain);
    }
    SetSplat(_splatTexs : string[], _splatTexCodi : CMat) {
        this.mTexture = [..._splatTexs];
        this.mTexCodi.Import(_splatTexCodi);
    }
    override Update(_update: CUpdate): void 
    {
        const paint = this.FindComp(CPaintTerrain);
        
        // 포지션 업데이트
        if(paint != null && paint.mRenPT.length > 0) 
        {
            const renPt = paint.mRenPT[0];
            const cam = renPt.mCam;
            if(cam.mUpdateMat == CUpdate.eType.Updated) {
                this.SetPos(new CVec3(cam.GetEye().x, this.GetPos().y, cam.GetEye().z));

                const camHeight : number = cam.GetEye().y;
                const heightStep : number = Math.floor(Math.log2(camHeight / (this.mTerrainSize.y * 0.5)));
                const curScale : number = Math.pow(2, heightStep);

                const levelScale = [];
                let scale = this.mCellSize * curScale;
                for(let level = 0; level < this.mLevel.length; level++)
                {
                    levelScale.push(scale);
                    scale *= 2 + (this.mLevel[level] - 1);
                }
                if(paint.mCellSize.x != levelScale[paint.mLevel])   // 변화 있을 때만 업데이트
                {
                    const paintList = this.FindComps(CPaintTerrain);
                    for(let pt of paintList) {
                        pt.mCellSize.x = levelScale[pt.mLevel];
                        pt.MatUpdate();
                    }
                }
            }
        }

        // 테스트 모드, 각 레벨별로 색상 넣어줌
        if(this.mTestMode) {
            const paints = this.FindComps(CPaintTerrain);
            const colorArr = [
                new CColor(0, 1, 1, CColor.eModel.HSV),
                new CColor(0.083, 1, 1, CColor.eModel.HSV),
                new CColor(0.166, 1, 1, CColor.eModel.HSV),
                new CColor(0.333, 1, 1, CColor.eModel.HSV),
                new CColor(0.5, 1, 1, CColor.eModel.HSV),
                new CColor(0.666, 1, 1, CColor.eModel.HSV),
                new CColor(0.75, 1, 1, CColor.eModel.HSV),
                new CColor(0.833, 1, 1, CColor.eModel.HSV)
            ]
            for(const pt of paints) {
                if(pt.mInit && pt.GetRenderPass()[0]?.mLine != CRenderPass.eLine.LINE) {
                    pt.GetRenderPass()[0]?.SetLine(CRenderPass.eLine.LINE);
                    pt.ClearBatch();
                }
                if(pt.GetTag().has("colorModel") == false) {
                    pt.SetColorModel(colorArr[pt.mLevel % colorArr.length]);
                }
            }
        }
        else {
            const paints = this.FindComps(CPaintTerrain);
            for(const pt of paints) {
                if(pt.mInit && pt.GetRenderPass()[0]?.mLine != CRenderPass.eLine.TRIANGLES) {
                    pt.GetRenderPass()[0]?.SetLine(CRenderPass.eLine.TRIANGLES);
                    pt.ClearBatch();
                }
                if(pt.GetTag().has("colorModel") == true) {
                    pt.RemoveTag("colorModel");
                    pt.ClearBatch();
                }
            }
        }

        if(this.mHeightTexture==null)
        {
            this.mHeightTexture="height.tex";
            let tex : CTexture=this.GetFrame().Res().Find(this.mHeightTexture);
            
            if(tex==null)
            {
                var CreateNormal = (_tex : CTexture) =>
                {
                    const texBuf = _tex.GetBuf()[0];
                    const width = _tex.GetWidth();
                    const height = _tex.GetHeight()
                    const GetHeight = (_x : number, _y : number) : number => {
                        const px = CMath.Clamp(_x, 0, width - 1);
                        const py = CMath.Clamp(_y, 0, height - 1);
                        const idx = (py * width + px) * 4;
                        return (texBuf[idx] / 255.0) + (texBuf[idx + 1] / (255.0 * 255.0));
                    };
                    const strength = this.mTerrainSize.y / (this.mTerrainSize.x / width) / 4;   // 4로 나누지 않는게 맞는데 높이맵 크기가 작아서 스무딩함
                    for(let y = 0; y < height; y++)
                    {
                        for(let x = 0; x < width; x++)
                        {
                            const idx = (y * width + x) * 4;

                            const tl = GetHeight(x - 1, y - 1);
                            const tc = GetHeight(x + 0, y - 1);
                            const tr = GetHeight(x + 1, y - 1);
                            const ml = GetHeight(x - 1, y + 0);    
                            const mr = GetHeight(x + 1, y + 0);    
                            const bl = GetHeight(x - 1, y + 1);
                            const bc = GetHeight(x + 0, y + 1);
                            const br = GetHeight(x + 1, y + 1);

                            const dx = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
                            const dy = (bl + 2.0 * bc + br) - (tl + 2.0 * tc + tr);

                            const nx = -dx * strength;
                            const ny = dy * strength;
                            const nz = 1.0;

                            const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);

                            texBuf[idx + 2] = Math.floor((nx * invLen * 0.5 + 0.5) * 255);
                            texBuf[idx + 3] = Math.floor((ny * invLen * 0.5 + 0.5) * 255);
                        }
                    }
                }

                tex=this.mHeightBuf.GetTexture(); 
                tex.SetFilter(CTexture.eFilter.Linear);
                tex.mModifyEvent=new CEvent(async ()=>{
                    await CClass.CallAsync(null,"BufferTool",[tex.GetBuf()[0],new CVec3(tex.GetWidth(),tex.GetHeight(),1),true]);
                    // 높이 xy 노말 zw에 넣음
                    CreateNormal(tex);
                });
                this.GetFrame().Res().Push(this.mHeightTexture,tex);
                CreateNormal(tex);
            }
        }
        if(this.mSplatTexture==null)
        {
            this.mSplatTexture="splat.tex";
            let tex : CTexture=this.GetFrame().Res().Find(this.mSplatTexture);
            
            if(tex==null)
            {
                tex=this.mSplatBuf.GetTexture(); 
                tex.mModifyEvent=new CEvent(async ()=>{
                    await CClass.CallAsync(null,"BufferTool",[tex.GetBuf()[0],new CVec3(tex.GetWidth(),tex.GetHeight(),1),true]);
                    
                });
                this.GetFrame().Res().Push(this.mSplatTexture,tex);
            }
        }
        // 페인트 없다면 생성
        if(paint == null) 
        {
            // 순서에 맞춘 텍스쳐(없는 건 BlackTex로 대체)
            const textureList = [];
            
            for(let i = 0; i < 4; i++) 
            {    
                if(this.mTexture[i] != null && this.mTexture[i] != "")
                    textureList.push(this.mTexture[i]);
                else
                    textureList.push(this.GetFrame().Pal().GetBlackTex());
            }

            textureList.push(this.mSplatTexture);   
            textureList.push(this.mHeightTexture);

            // 중앙에 위치한 페인트 4개
            for(let row = 0; row < 2; row++)
            for(let col = 0; col < 2; col++)
            {
                const pt = this.PushComp(new CPaintTerrain(textureList, this.mTerrainOffset, this.mTerrainSize, 0, 1, this.mCellSize, new CVec3(row - 0.5, 0, col - 0.5), this.mTexCodi)); // 레벨1
                for(let tag of this.mTag) {
                    pt.PushTag(tag);
                }
            }

            // 외곽 페인트
            let scale = 1;
            for(let level = 0; level < this.mLevel.length; level++)
            {
                const levelRepeat = this.mLevel[level];
                for(let repeat = 0; repeat < levelRepeat; repeat++)
                {
                    const max = 4 + repeat * 2;
                    const center = 1.5 + repeat;
                    for(let row = 0; row < max; row++)
                    for(let col = 0; col < max; col++)
                    {
                        if(row == 0 || row == max - 1 || col == 0 || col == max - 1)
                        {
                            const pt = this.PushComp(new CPaintTerrain(textureList, this.mTerrainOffset, this.mTerrainSize, level, levelRepeat, this.mCellSize*scale, new CVec3(row - center, 0, col - center), this.mTexCodi)); // 레벨1
                            for(let tag of this.mTag) {
                                pt.PushTag(tag);
                            }
                        }
                    }
                }
                scale *= 2 + (levelRepeat - 1);
            }
        }
    }
}
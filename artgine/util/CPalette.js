import { CMeshCreateInfo } from "../render/CMeshCreateInfo.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CPath } from "../basic/CPath.js";
import { CTexture, CTextureInfo } from "../render/CTexture.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CH5Canvas } from "../render/CH5Canvas.js";
import { CUtilRender } from "../render/CUtilRender.js";
import { CUtil } from "../basic/CUtil.js";
import { CLoaderOption } from "./CLoader.js";
var gNoneImg = "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";
var gSl2DKey;
var gSl3DKey;
var gSlPostKey;
var gSlCubeKey;
var gSlVoxelKey;
var gSlTerrainKey;
var gNoneTex;
export class CPalette {
    mMCI2D = new CMeshCreateInfo();
    mSL3D = null;
    mSL2D = null;
    mSLPost = null;
    mSLCube = null;
    mSLVoxel = null;
    mSLTerrain = null;
    constructor() {
    }
    async Load(_fw) {
        if (_fw.Ren() == null)
            return;
        let upFolder = CPath.PHPC();
        if (_fw.PF().mGitHub)
            upFolder = "https://06fs4dix.github.io/Artgine/";
        gNoneTex = upFolder + "artgine/z_file/none.png";
        await _fw.Load().LoadSwitch(gNoneTex, CUtil.Base64ToArray(gNoneImg), new CLoaderOption());
        gSl2DKey = upFolder + "artgine/z_file/2D.ts";
        gSl3DKey = upFolder + "artgine/z_file/3D.ts";
        gSlPostKey = upFolder + "artgine/z_file/Post.ts";
        gSlCubeKey = upFolder + "artgine/z_file/Cube.ts";
        gSlVoxelKey = upFolder + "artgine/z_file/Voxel.ts";
        gSlTerrainKey = upFolder + "artgine/z_file/Terrain.ts";
        await _fw.Load().Load(gSl3DKey);
        await _fw.Load().Load(gSlVoxelKey);
        await _fw.Load().Load(gSl2DKey);
        await _fw.Load().Load(gSlPostKey);
        await _fw.Load().Load(gSlCubeKey);
        await _fw.Load().Load(gSlTerrainKey);
        this.mSL2D = _fw.Res().Find(this.Sl2DKey());
        this.mSL3D = _fw.Res().Find(this.Sl3DKey());
        this.mSLPost = _fw.Res().Find(this.SlPostKey());
        this.mSLCube = _fw.Res().Find(this.SlCubeKey());
        this.mSLVoxel = _fw.Res().Find(this.SlVoxelKey());
        this.mSLTerrain = _fw.Res().Find(this.SlTerrainKey());
    }
    Init(_fw) {
        if (_fw.Ren() == null)
            return;
        CH5Canvas.Init(2, 2);
        var para = [CH5Canvas.Cmd("fillStyle", "black"), CH5Canvas.Cmd("fillRect", [0, 0, 2, 2])];
        CH5Canvas.Draw(para);
        let tex = CH5Canvas.GetNewTex();
        _fw.Ren().BuildTexture(tex);
        _fw.Res().Push(this.GetBlackTex(), tex);
        var mesh = CUtilRender.CMeshCreateInfoToCMesh(CUtilRender.GetPlane(new CVec4(0, 1, 0, 100)), this.GetBlackTex());
        _fw.Res().Push("plane.mesh", mesh);
        var mesh = CUtilRender.CMeshCreateInfoToCMesh(CUtilRender.GetBox(100), this.GetBlackTex());
        _fw.Res().Push("box.mesh", mesh);
        mesh = CUtilRender.CMeshCreateInfoToCMesh(CUtilRender.GetSphereUVEach(100, 32), this.GetBlackTex());
        _fw.Res().Push("sphere.mesh", mesh);
        var half = CUtilRender.Mesh2DSize / 2.0;
        this.mMCI2D = CUtilRender.GetPlane(new CVec4(0, 0, 1, half));
        _fw.Ren().BuildRenderTarget([new CTextureInfo(CTexture.eTarget.Array, CTexture.eFormat.RGBA32F, 6)], new CVec2(2048, 2048), "shadowArr.tex");
        let stex = _fw.Res().Find("shadowArr.tex");
    }
    Sl2D() { return this.mSL2D; }
    Sl3D() { return this.mSL3D; }
    SlPost() { return this.mSLPost; }
    SlCube() { return this.mSLCube; }
    SlVoxel() { return this.mSLVoxel; }
    SlTerrain() { return this.mSLTerrain; }
    Sl2DKey() { return gSl2DKey; }
    Sl3DKey() { return gSl3DKey; }
    SlPostKey() { return gSlPostKey; }
    SlCubeKey() { return gSlCubeKey; }
    SlVoxelKey() { return gSlVoxelKey; }
    SlTerrainKey() { return gSlTerrainKey; }
    MCI2D() {
        return this.mMCI2D;
    }
    GetNoneTex() {
        return gNoneTex;
    }
    GetBlackTex() {
        return "Black.tex";
    }
    GetBoxMesh() {
        return "box.mesh";
    }
    GetSphereMesh() {
        return "sphere.mesh";
    }
    GetPlaneMesh() {
        return "plane.mesh";
    }
    GetGrassMesh() {
        return "grass.mesh";
    }
    GetShadowArrTex() {
        return "shadowArr.tex";
    }
}

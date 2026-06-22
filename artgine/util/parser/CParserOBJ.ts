import { CMesh } from "../../render/CMesh.js";
import { CParser } from "./CParser.js";

// ▼ FBX 파서와 동일한 자료구조/유틸 사용
import { CMeshDataNode } from "../../render/CMeshDataNode.js";
import { CMeshCreateInfo, CMeshBuf } from "../../render/CMeshCreateInfo.js";
import { CVertexFormat } from "../../render/CShader.js";
import { CUtilRender } from "../../render/CUtilRender.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CFile } from "../../system/CFile.js";
import { CUtil } from "../../basic/CUtil.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CAlert } from "../../basic/CAlert.js";
import { CTree } from "../../basic/CTree.js";

type ObjFaceV = { vi:number, vti:number, vni:number };

export class CParserOBJ extends CParser
{
    public mMesh = new CMesh();
    private mPath: string = "";
    public mComputeNormal : boolean;

    constructor(_computeNormal=true)
    {
        super();
        this.mComputeNormal=_computeNormal;
    }

    override GetResult() { return this.mMesh; }

    override async Load(pa_fileName: string)
    {
        
    }
}

import CParserOBJ_imple from "../../util_imple/parser/CParserOBJ.js";
CParserOBJ_imple();
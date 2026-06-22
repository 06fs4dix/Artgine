

import {CMesh} from "../../render/CMesh.js";
import {CParser} from "./CParser.js";
import { CTree } from "../../basic/CTree.js";
import { CMeshDataNode } from "../../render/CMeshDataNode.js";
import { CJSON } from "../../basic/CJSON.js";

export default class CParserGLTF extends CParser
{
    public mMesh : CMesh = new CMesh();
    public mInch : boolean = false;
    mTexMap=new Map<any,number>();
    mColorTex : boolean;
    mTexBufRaw:boolean;
    public mComputeNormal : boolean;

    constructor(_inch : boolean,_colorTex=false,_texBufRaw=false,_computeNormal=true)
    {
        super();
        this.mInch = _inch;
        this.mColorTex=_colorTex;
        this.mTexBufRaw=_texBufRaw;
        this.mComputeNormal=_computeNormal;
    }
    override GetResult() {
        return this.mMesh;
    }
    override async Load(_fileName : string) 
    {
       return null;
    }
    async CreateMesh(_root ,gltfDir: string)
    {
    
    }
    CreateMeshDataNode(_root ,_node,_tree : CTree<CMeshDataNode>) 
    {
        return null;
    }
    async ParseCJSON(_fileName : string, _json : CJSON,glbResources: Record<string, Uint8Array>) 
    {

    }
}
import CParserGLTF_imple from "../../util_imple/parser/CParserGLTF.js";
CParserGLTF_imple();


import {CMesh} from "../../render/CMesh.js";
import {CParser} from "./CParser.js";


export default class CParserGLTF extends CParser
{
    public mMesh : CMesh = new CMesh();
    public mInch : boolean = false;
    mTexMap=new Map<any,number>();

    constructor(_inch : boolean)
    {
        super();
        this.mInch = _inch;
    }
    GetResult() {
        return this.mMesh;
    }
    async Load(_fileName : string) 
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
    async ParseCJSON(_fileName : string, _json : CJSON) 
    {

    }
}
import CParserGLTF_imple from "../../util_imple/parser/CParserGLTF.js";
import { CTree } from "../../basic/CTree.js";
import { CMeshDataNode } from "../../render/CMeshDataNode.js";
import { CJSON } from "../../basic/CJSON.js";

CParserGLTF_imple();
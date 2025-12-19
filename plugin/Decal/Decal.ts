import { CRPAuto } from "../../artgine/app/canvas/CRPMgr.js";
import { CPaint } from "../../artgine/app/component/paint/CPaint.js";
import { CTree } from "../../artgine/basic/CTree.js";

import { CBound } from "../../artgine/geometry/CBound.js";
import { CMat } from "../../artgine/geometry/CMat.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CRay } from "../../artgine/geometry/CRay.js";
import { CUtilMath } from "../../artgine/geometry/CUtilMath.js";
import { CVec1 } from "../../artgine/geometry/CVec1.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CMesh } from "../../artgine/render/CMesh.js";
import { CMeshCreateInfo } from "../../artgine/render/CMeshCreateInfo.js";
import { CMeshDataNode } from "../../artgine/render/CMeshDataNode.js";
import { CShader, CVertexFormat } from "../../artgine/render/CShader.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";

var gDecalIndex=0;
export class CPaint3DDecal extends CPaint
{
	mMCI : CMeshCreateInfo;
	mIndex : number;
	//mTarget : CPaint3D;
	mRay : CRay;
	mSize : CVec3;
    mRot : number;
    mDepth=0;
    mVertex : Array<CVec3>;
    mVMat : CMat;
	constructor(_textures : string[], _vertex : Array<CVec3>,_vMat : CMat, _ray : CRay, _size : CVec3,_imageRot : number = 0)
    {
        super();
        //this.RefreshBound(_texture, _bound, _pos, _rot, _size);
		this.mTextureKey=_textures;
		//this.mTarget=_org;
        this.mVertex=_vertex;
        this.mVMat=_vMat;
		this.mRay=_ray;
		this.mSize=_size;
		this.mIndex=gDecalIndex++;
        this.mRot=_imageRot;

    }
	InitChk(): void 
	{
		super.InitChk();	
		this.RefreshMesh(this.mTextureKey,this.mVertex,this.mVMat,this.mRay,this.mSize,this.mRot);
		
		
	}
	EmptyRPChk()
	{
		if(this.mRenderPass.length==0)
		{
			let sChk=true;
			for(let each0 of this.mRenderPass)
			{
				if(each0.mTag.has("shadowWrite"))
				{
					continue;
				}
				sChk=false;
			}
			if(sChk)
			{
				this.mRenderPass.push(new CRPAuto(this.mOwner.GetFrame().Pal().Sl3D().mKey));
			}
				
		}
		this.PushCShaderAttr(new CShaderAttr("zDepthBias",new CVec1(-0.01)));
		this.PushTag("zDepth");
	}
	Render(_vf: CShader): void {
		
		

		var barr=this.RenderBatch(_vf,1);
		if(barr==null)	return;

		
		

		this.mOwner.GetFrame().BMgr().BatchOn();
		this.Common(_vf);

		let wsa=new CShaderAttr("worldMat", this.mLMat);
		this.mOwner.GetFrame().BMgr().SetBatchSA(wsa);
		if (_vf.mUniform.get("material") != null)
		{
			this.mOwner.GetFrame().BMgr().SetBatchSA(new CShaderAttr("material", this.mMaterial));
		}
		this.mOwner.GetFrame().BMgr().SetBatchTex(this.mTextureKey);
		var dm=this.GetDrawMesh("Artgine/DM/Decal"+this.mIndex,_vf,this.mMCI);
		this.mOwner.GetFrame().BMgr().SetBatchMesh(dm);

		barr[0]=this.mOwner.GetFrame().BMgr().BatchOff();
	}
	public RefreshMesh(_textures : string[], _vertex : Array<CVec3>,_vMat : CMat, _ray : CRay, _size : CVec3,_imageRot : number = 0) 
    {
     

       
		this.mBound.Reset();
        const closestNormalIS : CVec3 = new CVec3();
        //const decalVertices = CollectWorldVertices(this.mBound);

        let decalVertices=new Array<CVec3>();
        for(let i=0;i<_vertex.length;i+=3)
        {
            let pos=CMath.V3MulMatCoordi(_vertex[i+0],_vMat);
            this.mBound.InitBound(pos);
            decalVertices.push(CMath.V3MulMatCoordi(_vertex[i+0],_vMat));   

            pos=CMath.V3MulMatCoordi(_vertex[i+1],_vMat);
            this.mBound.InitBound(pos);
            decalVertices.push(CMath.V3MulMatCoordi(_vertex[i+1],_vMat));   

            pos=CMath.V3MulMatCoordi(_vertex[i+2],_vMat);
            this.mBound.InitBound(pos);
            decalVertices.push(CMath.V3MulMatCoordi(_vertex[i+2],_vMat));   
        }


        if(!CheckMeshIS(decalVertices)) {
            console.log("CDecalPaint : ray와 충돌하지 않습니다.");
            this.Destroy();
            return;
        }
        const pointIS = _ray.GetPosition();

        // 데칼 프로젝터 좌표계로 변환하는 매트릭스
        const projectorMat = CalcProjectorMat(pointIS);
        const invProjectorMat = CMath.MatInvert(projectorMat);

        // 버퍼
        let mci=this.mMCI = new CMeshCreateInfo();
        const vertices = this.mMCI.Create(CVertexFormat.eIdentifier.Position);
        const normals = this.mMCI.Create(CVertexFormat.eIdentifier.Normal);
        const uvs = this.mMCI.Create(CVertexFormat.eIdentifier.UV);
        const texOffs = this.mMCI.Create(CVertexFormat.eIdentifier.TexOff);

        // 버퍼 생성
        GenerateBuffer(decalVertices,this.mDepth);

      
        function CheckMeshIS(_worldSpaceVertices : Array<CVec3>) : boolean
        {
            let hasIntersection = false;
            let closestDist = Infinity;
            const closestPointIS : CVec3 = new CVec3();
    
            const rayOrigin = _ray.GetOriginal();
    
            for(let i = 0; i < _worldSpaceVertices.length; i += 3) {
                const v1 = _worldSpaceVertices[i + 0];
                const v2 = _worldSpaceVertices[i + 1];
                const v3 = _worldSpaceVertices[i + 2];
                if(CUtilMath.RayTriangleIS(v1, v2, v3, _ray, true)) {
                    hasIntersection = true;
    
                    const pointIS = _ray.GetPosition();
                    const dx = pointIS.x - rayOrigin.x;
                    const dy = pointIS.y - rayOrigin.y;
                    const dz = pointIS.z - rayOrigin.z;
                    const dist = dx * dx + dy * dy + dz * dz;
    
                    if(dist < closestDist) {
                        closestDist = dist;
                        closestPointIS.Import(_ray.GetPosition());

                        const edge1 = CMath.V3SubV3(v2, v1);
                        const edge2 = CMath.V3SubV3(v3, v1);
                        const normal = CMath.V3Nor(CMath.V3Cross(edge1, edge2));
                        closestNormalIS.Import(normal);
                    }
                }
            }
            _ray.SetPosition(closestPointIS);
            return hasIntersection;
        }
        // function CollectWorldVertices(_bound : CBound) : Array<CVec3>
        // {
        //     const worldVertices = new Array<CVec3>();
    
        //     // const ciArr = new Array<CMeshCreateInfo>();
        //     // const matArr = new Array<CMat>();
    
        //     // function SetCiArr(_tree : CTree<CMeshDataNode>, _prevMat : CMat = new CMat()) {
        //     //     const sm = CMath.MatScale(_tree.mData.sca);
        //     //     const rm = CMath.QutToMat(_tree.mData.rot);
    
        //     //     const curMat = CMath.MatMul(sm, rm);
        //     //     curMat.mF32A[12] = _tree.mData.pos.x;
        //     //     curMat.mF32A[13] = _tree.mData.pos.y;
        //     //     curMat.mF32A[14] = _tree.mData.pos.z;
        //     //     curMat.UnitCheck();
    
        //     //     const mat = CMath.MatMul(curMat, _prevMat);
    
        //     //     if(_tree.mData.ci != null) {
        //     //         ciArr.push(_tree.mData.ci);
        //     //         matArr.push(mat);
        //     //     }
    
        //     //     if (_tree.mChild != null) {
        //     //         SetCiArr(_tree.mChild, mat);
        //     //     }
        //     //     if (_tree.mColleague != null) {
        //     //         SetCiArr(_tree.mColleague, _prevMat);
        //     //     }
        //     // }
    
        //     // SetCiArr(mesh.meshTree);
    
        //     function PushDecalSpaceVert(_convMat : CMat, _pos : CVec3) {
        //         _pos=CMath.V3MulMatCoordi(_pos, _convMat);
		// 		//이건 FMAT가 이동 안해서 계산된 값을 넣음
		// 		_bound.InitBound(_pos);
        //         worldVertices.push(_pos);
        //     }
    
        //     // for(let ciIndex = 0; ciIndex < ciArr.length; ciIndex++) {
        //     //     const ci = ciArr[ciIndex];
        //     //     const mat = matArr[ciIndex];
        //     //     const convMat = CMath.MatMul(mat, _org.GetFMat());
    
        //     //     const vertexAttribute = ci.GetVFType(CVertexFormat.eIdentifier.Position)[0];
        //     //     if(!vertexAttribute) continue;
    
        //     //     if(ci.indexCount > 0) {
        //     //         for(let i = 0; i < ci.indexCount - (ci.indexCount % 3); i++) {
        //     //             const vec = vertexAttribute.bufF.V3(ci.index[i]);
        //     //             PushDecalSpaceVert(convMat, vec);
        //     //         }
        //     //     }
        //     //     else {
        //     //         for(let i = 0; i < vertexAttribute.bufF.Size(3) - (vertexAttribute.bufF.Size(3) % 3); i++) {
        //     //             const vec = vertexAttribute.bufF.V3(i);
        //     //             PushDecalSpaceVert(convMat, vec);
        //     //         }
        //     //     }
        //     // }
    
        //     return worldVertices;
        // }
        function CalcProjectorMat(_pointIS : CVec3) : CMat
        {
            const isFlatImage = _imageRot >= 0;
            const theta = (Math.PI / 180) * _imageRot;
            
            // const forward = CMath.V3Nor(CMath.V3SubV3(_pointIS, _ray.GetOriginal()));
            // const up = new CVec3(0, 1, 0);
            // const right = CMath.V3Nor(CMath.V3Cross(up, forward));
            // const realUp = CMath.V3Cross(forward, right);

            const forward = CMath.V3Nor(isFlatImage ? closestNormalIS : _ray.GetDirect());
            const up = new CVec3(-Math.sin(theta), Math.cos(theta), 0);
            const right = CMath.V3Nor(CMath.V3Cross(up, forward));
            const realUp = CMath.V3Cross(forward, right);
    
            const projectorMat = new CMat(); // 예: 4x4 행렬 클래스
            projectorMat.mF32A[0] = right.x;
            projectorMat.mF32A[1] = right.y;
            projectorMat.mF32A[2] = right.z;
    
            projectorMat.mF32A[4] = realUp.x;
            projectorMat.mF32A[5] = realUp.y;
            projectorMat.mF32A[6] = realUp.z;
    
            projectorMat.mF32A[8] = forward.x;
            projectorMat.mF32A[9] = forward.y;
            projectorMat.mF32A[10] = forward.z;
    
            projectorMat.mF32A[12] = _pointIS.x;
            projectorMat.mF32A[13] = _pointIS.y;
            projectorMat.mF32A[14] = _pointIS.z;
    
            projectorMat.UnitCheck();
    
            return projectorMat;
        }
        function GenerateBuffer(_vertices : Array<CVec3>,_depth) 
		{
			//_bound.Reset();

            // 1. 클리핑 스페이스 변환
            for(let i=0;i<_vertices.length;++i) {
                _vertices[i]=CMath.V3MulMatCoordi(_vertices[i], invProjectorMat);
            }
            const tempArr : CVec3[] = [];
            // 2. clip
            ClipGeometry( tempArr, _vertices, new CVec4( 1,  0,  0, -_size.x * 0.5 ) );
            _vertices.length = 0;
			ClipGeometry( _vertices, tempArr, new CVec4( -1, 0,  0, -_size.x * 0.5 ) );
            tempArr.length = 0;
			ClipGeometry( tempArr, _vertices, new CVec4( 0,  1,  0, -_size.y * 0.5 ) );
            _vertices.length = 0;
			ClipGeometry( _vertices, tempArr, new CVec4( 0, -1,  0, -_size.y * 0.5 ) );
            tempArr.length = 0;
			ClipGeometry( tempArr, _vertices, new CVec4( 0,  0,  1, -_size.z * 0.5 ) );
            _vertices.length = 0;
			ClipGeometry( _vertices, tempArr, new CVec4( 0,  0, -1, -_size.z * 0.5 ) );

            // 3. generate final geometry
            const texOff = new CVec3(-1, -1, -1);
            for(let i = 0; i < _textures.map((_, _index) => _index).length; i++) {
                switch(i) {
                    case 0: {
                        texOff.x = 0;
                        break;
                    }
                    case 1: {
                        texOff.y = 1;
                        break;
                    }
                    case 2: {
                        texOff.z = 2;
                        break;
                    }
                }
            }
			
            let v1d=new CVec3();
            let v2d=new CVec3();
            let v3d=new CVec3();
            for(let i = 0; i < _vertices.length; i += 3) 
			{
				
                let v1 = _vertices[i + 0];
                let v2 = _vertices[i + 1];
                let v3 = _vertices[i + 2];
				// _bound.InitBound(v1.m_pos);
				// _bound.InitBound(v2.m_pos);
				// _bound.InitBound(v3.m_pos);

                // uv 생성
                uvs.bufF.Push(new CVec2(0.5 + v1.x / _size.x, 0.5 + v1.y / _size.y));
                uvs.bufF.Push(new CVec2(0.5 + v2.x / _size.x, 0.5 + v2.y / _size.y));
                uvs.bufF.Push(new CVec2(0.5 + v3.x / _size.x, 0.5 + v3.y / _size.y));

                // texOff 생성
                texOffs.bufF.Push(texOff);
                texOffs.bufF.Push(texOff);
                texOffs.bufF.Push(texOff);

                // pos 월드 스페이스로 변환
                v1=CMath.V3MulMatCoordi(v1, projectorMat);
                v2=CMath.V3MulMatCoordi(v2, projectorMat);
                v3=CMath.V3MulMatCoordi(v3, projectorMat);

                // normal 생성
                const edge1 = CMath.V3SubV3(v2, v1);
                const edge2 = CMath.V3SubV3(v3, v1);
                const normal = CMath.V3Nor(CMath.V3Cross(edge1, edge2));
                normals.bufF.Push(normal);
                normals.bufF.Push(normal);
                normals.bufF.Push(normal);

                // offset 적용
                const offset = CMath.V3MulFloat(CMath.V3Nor(_ray.GetDirect()), _depth);
                CMath.V3AddV3(v1, offset, v1);
                CMath.V3AddV3(v2, offset, v2);
                CMath.V3AddV3(v3, offset, v3);

                // pos 생성
                vertices.bufF.Push(v1);
                vertices.bufF.Push(v2);
                vertices.bufF.Push(v3);
            }
            mci.vertexCount = vertices.bufF.Size(3);
            
            function ClipGeometry(_out : CVec3[], _in : CVec3[], _plane : CVec4) : void 
            {
                for(let i = 0; i < _in.length; i += 3) 
                {
                    let total = 0;
                    let nV1 : CVec3, nV2 : CVec3, nV3 : CVec3, nV4 : CVec3;

                    const d1 = CMath.PlaneEachDotV3Coordi(_plane, _in[i + 0]);
                    const d2 = CMath.PlaneEachDotV3Coordi(_plane, _in[i + 1]);
                    const d3 = CMath.PlaneEachDotV3Coordi(_plane, _in[i + 2]);

                    const v1Out = d1 > 0;
                    const v2Out = d2 > 0;
                    const v3Out = d3 > 0;

                    total = (v1Out ? 1 : 0) + (v2Out ? 1 : 0) + (v3Out ? 1 : 0);

                    switch(total) {
                        
                        case 0: {
                            // 면의 모든 버텍스가 plane 안에 있음

                            _out.push(_in[i + 0]);
                            _out.push(_in[i + 1]);
                            _out.push(_in[i + 2]);

                            break;
                        }

                        case 1: {
                            // 한 버텍스가 plane 밖에 있음
                            if(v1Out) {
                                nV1 = _in[i + 1];
                                nV2 = _in[i + 2];
                                nV3 = Clip(_in[i + 0], nV1, _plane);
                                nV4 = Clip(_in[i + 0], nV2, _plane);

                            }

                            if(v2Out) {
                                nV1 = _in[i + 0];
                                nV2 = _in[i + 2];
                                nV3 = Clip(_in[i + 1], nV1, _plane);
                                nV4 = Clip(_in[i + 1], nV2, _plane);

                                _out.push(nV3);
                                _out.push(nV2);
                                _out.push(nV1);

                                _out.push(nV2);
                                _out.push(nV3);
                                _out.push(nV4);

                                break;
                            }

                            if(v3Out) {
                                nV1 = _in[i + 0];
                                nV2 = _in[i + 1];
                                nV3 = Clip(_in[i + 2], nV1, _plane);
                                nV4 = Clip(_in[i + 2], nV2, _plane);
                            }

                            _out.push(nV1);
                            _out.push(nV2);
                            _out.push(nV3);

                            _out.push(nV4);
                            _out.push(nV3);
                            _out.push(nV2);

                            break;
                        }

                        case 2: {
                            // 두 버텍스가 plane 밖에 있음

                            if ( ! v1Out ) {

                                nV1 = _in[ i + 0 ];
                                nV2 = Clip( nV1, _in[ i + 1 ], _plane );
                                nV3 = Clip( nV1, _in[ i + 2 ], _plane );

                                _out.push(nV1);
                                _out.push(nV2);
                                _out.push(nV3);

                            }

                            if ( ! v2Out ) {

                                nV1 = _in[ i + 1 ];
                                nV2 = Clip( nV1, _in[ i + 2 ], _plane );
                                nV3 = Clip( nV1, _in[ i + 0 ], _plane );

                                _out.push(nV1);
                                _out.push(nV2);
                                _out.push(nV3);

                            }

                            if ( ! v3Out ) {

                                nV1 = _in[ i + 2 ];
                                nV2 = Clip( nV1, _in[ i + 0 ], _plane );
                                nV3 = Clip( nV1, _in[ i + 1 ], _plane );

                                _out.push(nV1);
                                _out.push(nV2);
                                _out.push(nV3);

                            }

                            break;
                        }

                        case 3: {
                            // 면의 모든 버텍스가 plane 밖에 있음

                        }
                    }
                }
            }
            function Clip(_v0 : CVec3, _v1 : CVec3, _plane : CVec4) {
                const d0 = CMath.PlaneEachDotV3Coordi(_plane, _v0);
                const d1 = CMath.PlaneEachDotV3Coordi(_plane, _v1);

                const s0 = d0 / (d0 - d1);

                const position = new CVec3(
                    _v0.x + s0 * (_v1.x - _v0.x),
                    _v0.y + s0 * (_v1.y - _v0.y),
                    _v0.z + s0 * (_v1.z - _v0.z)
                );

                return position;
            }
        }
    }
}

import { CRPAuto } from "../../artgine/app/canvas/CRPMgr.js";
import { CPaint } from "../../artgine/app/component/paint/CPaint.js";
import { CUpdate } from "../../artgine/basic/Basic.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CMat } from "../../artgine/geometry/CMat.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CVec1 } from "../../artgine/geometry/CVec1.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
import { CMeshCreateInfo } from "../../artgine/render/CMeshCreateInfo.js";
import { CShader, CVertexFormat } from "../../artgine/render/CShader.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";

var gDecalIndex=0;
export class CPaint3DDecalMesh extends CPaint
{
    mIndex : number;
    mDepth : number = 0;

    mVertex : Array<CVec3>;
	mVMat : CMat;

    mMCI : CMeshCreateInfo;

	constructor(_textures : string[], _vertex : Array<CVec3>, _vMat : CMat, _pos : CVec3, _size : CVec3, _dir : CVec3 = new CVec3(0, 1, 0), _imageRot : number = 0)
    {
        super();
		this.mTextureKey=_textures;
        this.mVertex=_vertex;
        this.mVMat=_vMat;

        this.AddDecal("", _pos, _size, _dir, _imageRot);

        this.mIndex=gDecalIndex++;
    }
	InitChk(): void 
	{
		super.InitChk();	
		// this.RefreshMesh(this.mVertex, this.mVMat);
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
    Update(_update: CUpdate): void {
        super.Update(_update);

        if(this.mUpdateFMat)
		{
			this.RefreshMesh(this.mVertex, this.mVMat);
		}
    }
	Render(_vf: CShader): void {
		var barr=this.RenderBatch(_vf,1);
		if(barr==null)	return;

		this.mOwner.GetFrame().BMgr().BatchOn();
		this.Common(_vf);

		let wsa=new CShaderAttr("worldMat", this.mFMat);
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
    AddDecal(_decal: string | CVec4, _pos: CVec3, _size: CVec3, _dir?: CVec3, _imageRot?: number): void
    {
        // 데칼 위치 / 스케일 / 로테이션
        let zAxis = CMath.V3Nor(_dir);
        let up = new CVec3(0, 1, 0);
        if(Math.abs(CMath.V3Dot(zAxis, up)) > 1-1e-8) {
            up = new CVec3(0, 0, -1);
        }
        let xAxis = CMath.V3Nor(CMath.V3Cross(up, zAxis));
        let yAxis = CMath.V3Nor(CMath.V3Cross(zAxis, xAxis));

        const cosT = Math.cos(_imageRot);
        const sinT = Math.sin(_imageRot);

        [xAxis, yAxis] = [
            CMath.V3Nor(new CVec3(xAxis.x * cosT + yAxis.x * sinT, xAxis.y * cosT + yAxis.y * sinT, xAxis.z * cosT + yAxis.z * sinT)),
            CMath.V3Nor(new CVec3(yAxis.x * cosT - xAxis.x * sinT, yAxis.y * cosT - xAxis.y * sinT, yAxis.z * cosT - xAxis.z * sinT))
        ];

        CMath.V3MulFloat(xAxis, _size.x, xAxis);
        CMath.V3MulFloat(yAxis, _size.y, yAxis);
        CMath.V3MulFloat(zAxis, _size.z, zAxis);

        // 데칼 월드 행렬(데칼 => 월드)
        this.mLMat.mF32A[0] = xAxis.x;
        this.mLMat.mF32A[1] = xAxis.y;
        this.mLMat.mF32A[2] = xAxis.z;
        this.mLMat.mF32A[3] = 0; 

        this.mLMat.mF32A[4] = yAxis.x;
        this.mLMat.mF32A[5] = yAxis.y;
        this.mLMat.mF32A[6] = yAxis.z;
        this.mLMat.mF32A[7] = 0;

        this.mLMat.mF32A[8] = zAxis.x;
        this.mLMat.mF32A[9] = zAxis.y;
        this.mLMat.mF32A[10] = zAxis.z;
        this.mLMat.mF32A[11] = 0;

		this.mLMat.mF32A[12] = _pos.x;
		this.mLMat.mF32A[13] = _pos.y;
		this.mLMat.mF32A[14] = _pos.z;
		this.mLMat.mF32A[15] = 1.0;

        this.mLMat.UnitCheck();

        this.mUpdateLMat = true;
    }
    // 이전 플로우
    // 버텍스를 로컬 => 월드로 변환
    // 레이를 월드 버텍스와 충돌 검사
    // 월드 버텍스를 데칼 스페이스(데칼 로컬)로 옮겨서 인아웃 검사
    // 
    // 현재 플로우
    // 버텍스를 로컬 => 데칼 스페이스로 변환 후 인아웃 검사
	public RefreshMesh(_vertex : Array<CVec3>, _vMat : CMat) 
    {
        this.mVertex = _vertex;
        this.mVMat = _vMat;

        // 로컬 => 월드 => 데칼로 변환하는 매트릭스 생성
        const local2DecalMat = new CMat();
        CMath.MatMul(_vMat, CMath.MatInvert(this.mFMat), local2DecalMat);

        // 데칼 밖의 정점 클리핑
        const clippedVertices = ClipGeometry(_vertex, local2DecalMat);

        if(clippedVertices.length < 3) {
            console.log("CDecalPaint : 데칼 범위에 포함된 정점이 없습니다.");
            this.Destroy(); // 삭제하는 대신 랜더링을 안하면 될 듯?
            return;
        }

        // 버퍼 생성, 아마도 재사용 가능
        this.mMCI = new CMeshCreateInfo();
        const vertices = this.mMCI.Create(CVertexFormat.eIdentifier.Position);
        const normals = this.mMCI.Create(CVertexFormat.eIdentifier.Normal);
        const uvs = this.mMCI.Create(CVertexFormat.eIdentifier.UV);
        const texOffs = this.mMCI.Create(CVertexFormat.eIdentifier.TexOff);

        const texOff = new CVec3(-1, -1, -1);
        for(let i = 0; i < Math.min(this.GetTexture().length, 3); i++) {
            if(i == 0) texOff.x = 0;
            if(i == 1) texOff.y = 0;
            if(i == 2) texOff.z = 0;
        }
        
        for(let i = 0; i < clippedVertices.length; i += 3) 
        {
            let v1 = clippedVertices[i + 0];
            let v2 = clippedVertices[i + 1];
            let v3 = clippedVertices[i + 2];

            // uv 생성
            uvs.bufF.Push(new CVec2(0.5 + v1.x * 0.5, 0.5 + v1.y * 0.5));
            uvs.bufF.Push(new CVec2(0.5 + v2.x * 0.5, 0.5 + v2.y * 0.5));
            uvs.bufF.Push(new CVec2(0.5 + v3.x * 0.5, 0.5 + v3.y * 0.5));

            // texOff 생성
            texOffs.bufF.Push(texOff);
            texOffs.bufF.Push(texOff);
            texOffs.bufF.Push(texOff);

            // normal 생성
            const edge1 = CMath.V3SubV3(v2, v1);
            const edge2 = CMath.V3SubV3(v3, v1);
            const normal = CMath.V3Nor(CMath.V3Cross(edge1, edge2));
            normals.bufF.Push(normal);
            normals.bufF.Push(normal);
            normals.bufF.Push(normal);

            // offset 적용
            const offset = CMath.V3MulFloat(normal, this.mDepth);
            CMath.V3AddV3(v1, offset, v1);
            CMath.V3AddV3(v2, offset, v2);
            CMath.V3AddV3(v3, offset, v3);

            // pos 생성
            vertices.bufF.Push(v1);
            vertices.bufF.Push(v2);
            vertices.bufF.Push(v3);
        }
        this.mMCI.vertexCount = vertices.bufF.Size(3);

        // 바운드 리셋
        this.mBound.Reset();
        for(let i = 0; i < this.mMCI.vertexCount; i++) {
            this.mBound.InitBound(vertices.bufF.V3(i));
        }
        this.mBound.MatCoordi(this.mLMat);

        // 배치 클리어
        this.mIndex=gDecalIndex++;  // 너무 많이 생성되는데 괜찮을까?
        this.ClearBatch();

        function ClipGeometry(_vertices : Array<CVec3>, _mat : CMat)
        {
            // 데칼 스페이스로 변환
            const result = _vertices.map(_v => CMath.V3MulMatCoordi(_v, _mat));

            // 2. 인아웃 검사
            const planes = [
                new CVec4(1, 0, 0, -1), new CVec4(-1, 0, 0, -1),    // X
                new CVec4(0, 1, 0, -1), new CVec4(0, -1, 0, -1),    // Y
                new CVec4(0, 0, 1, -1), new CVec4(0, 0, -1, -1),    // Z
            ];
            let In : CVec3[] = result;
            let Out : CVec3[] = [];
            planes.forEach(_plane => {
                ClipPlane(In, _plane, Out);
                In.length = 0;
                [In, Out] = [Out, In];
            });
            
            return result;

            // 버텍스와 버텍스 사이에 플레인이 있음
            // 플레임과의 접점에서 새로운 버텍스 생성
            function IntersectVerts(_v0 : CVec3, _v1 : CVec3, _plane : CVec4)
            {
                const d0 = CMath.PlaneEachDotV3Coordi(_plane, _v0);
                const d1 = CMath.PlaneEachDotV3Coordi(_plane, _v1);

                const s0 = d0 / (d0 - d1);

                return new CVec3(
                    _v0.x + s0 * (_v1.x - _v0.x),
                    _v0.y + s0 * (_v1.y - _v0.y),
                    _v0.z + s0 * (_v1.z - _v0.z)
                );
            }
            function ClipPlane(_in : CVec3[], _plane : CVec4, _out : CVec3[]) : void 
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
                        
                        case 0: // 면의 모든 버텍스가 plane 안에 있음
                            _out.push(_in[i + 0]);
                            _out.push(_in[i + 1]);
                            _out.push(_in[i + 2]);

                            break;

                        case 1: {
                            // 한 버텍스가 plane 밖에 있음 
                            if(v1Out) {
                                nV1 = _in[i + 1];
                                nV2 = _in[i + 2];
                                nV3 = IntersectVerts(_in[i + 0], nV1, _plane);
                                nV4 = IntersectVerts(_in[i + 0], nV2, _plane);
                            }
                            if(v2Out) {
                                nV1 = _in[i + 0];
                                nV2 = _in[i + 2];
                                nV3 = IntersectVerts(_in[i + 1], nV1, _plane);
                                nV4 = IntersectVerts(_in[i + 1], nV2, _plane);

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
                                nV3 = IntersectVerts(_in[i + 2], nV1, _plane);
                                nV4 = IntersectVerts(_in[i + 2], nV2, _plane);
                            }

                            _out.push(nV1);
                            _out.push(nV2);
                            _out.push(nV3);

                            _out.push(nV4);
                            _out.push(nV3);
                            _out.push(nV2);

                            break;
                        }

                        case 2: // 두 버텍스가 plane 밖에 있음
                            if ( ! v1Out ) {
                                nV1 = _in[ i + 0 ];
                                nV2 = IntersectVerts( nV1, _in[ i + 1 ], _plane );
                                nV3 = IntersectVerts( nV1, _in[ i + 2 ], _plane );
                            }
                            if ( ! v2Out ) {
                                nV1 = _in[ i + 1 ];
                                nV2 = IntersectVerts( nV1, _in[ i + 2 ], _plane );
                                nV3 = IntersectVerts( nV1, _in[ i + 0 ], _plane );
                            }
                            if ( ! v3Out ) {
                                nV1 = _in[ i + 2 ];
                                nV2 = IntersectVerts( nV1, _in[ i + 0 ], _plane );
                                nV3 = IntersectVerts( nV1, _in[ i + 1 ], _plane );
                            }

                            _out.push(nV1);
                            _out.push(nV2);
                            _out.push(nV3);

                            break;

                        case 3: // 면의 모든 버텍스가 plane 밖에 있음
                    }
                }
            }
        }
    }
}
CClass.Push(CPaint3DDecalMesh);
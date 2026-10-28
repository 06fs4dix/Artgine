import { SDF } from "../../artgine/z_file/SDF";
import {
	Build, CVec2, CVec3, CVec4, ToV2, UV2, Vertex3, Null, OutColor, OutPosition,
	Sam2DArrLodToCubeColor, V2MulFloat,
	V3AddV3, V3SubV3, V3MulFloat, V3Dot, V3Nor, V3Cross,
	FloatToInt, IntToFloat, floor, cos, sin, Exp,
	int
} from "../../artgine/z_file/Shader";

var to_uv : ToV2 = Null();
var out_position : OutPosition = Null();
var out_color : OutColor = Null();

//그리는 큐브 면(0~5)과 출력 레벨 한 변 크기
var ebFace : number = Null();
var ebSize : number = Null();
//입력 큐브의 시작 레이어와 입력 LOD
var ebLayer : number = Null();
var ebSrcLod : number = Null();
//가우시안: 한쪽 샘플 수, 픽셀당 각도, 시그마(픽셀), 샘플 간격(픽셀, 사이는 선형 필터가 보간), 위도 패스 여부(1/0), 극축
var ebCount : number = Null();
var ebRadPerPx : number = Null();
var ebSigmaPx : number = Null();
var ebStride : number = Null();
var ebLat : number = Null();
var ebPole : CVec3 = Null();

Build("EnvmapGPU/Blur", ["envblur"],
	vs_main, [
		ebFace, ebSize, ebLayer, ebSrcLod, ebCount, ebRadPerPx, ebSigmaPx, ebStride, ebLat, ebPole
	], [out_position, to_uv],
	ps_main, [out_color]);

function vs_main(f3_ver : Vertex3, f2_uv : UV2) {
	to_uv = f2_uv;
	out_position = new CVec4(V2MulFloat(f3_ver.xy, 2.0), 0.0, 1.0);
}

function FaceDir(_f : number, _u : number, _v : number) : CVec3 {
	if(_f < 0.5) return new CVec3(1.0, _v, _u);
	if(_f < 1.5) return new CVec3(-1.0, _v, -_u);
	if(_f < 2.5) return new CVec3(_u, 1.0, _v);
	if(_f < 3.5) return new CVec3(_u, -1.0, -_v);
	if(_f < 4.5) return new CVec3(-_u, _v, 1.0);
	return new CVec3(_u, _v, -1.0);
}

function SampleSrc(_dir : CVec3) : CVec3 {
	return Sam2DArrLodToCubeColor(SDF.eTexSlot.ArrEnvmap, _dir, ebLayer, ebSrcLod).rgb;
}

function ps_main() {
	var c : number = (ebSize - 1.0) * 0.5;
	var k : number = 0.0;
	if(ebSize > 1.5) k = 1.0 / c;
	var px : number = floor(to_uv.x * ebSize);
	var py : number = floor(to_uv.y * ebSize);
	var od : CVec3 = V3Nor(FaceDir(ebFace, (px - c) * k, (py - c) * k));

	var ax : CVec3 = ebPole;
	if(ebLat < 0.5) ax = V3Cross(ebPole, od);
	if(V3Dot(ax, ax) < 0.000001) ax = new CVec3(od.z, 0.0, -od.x);
	ax = V3Nor(ax);
	var dp : number = V3Dot(ax, od);
	var cx : CVec3 = V3Cross(ax, od);

	var tot : CVec3 = SampleSrc(od);
	var sum : number = 1.0;
	var count : int;
	count.dummy = FloatToInt(ebCount);
	for(var s = 1; s < 32; ++s) {
		if(s >= count.dummy) break;
		var fs : number = IntToFloat(s) * ebStride;
		var x : number = fs / ebSigmaPx;
		var w : number = Exp(-0.5 * x * x);
		var th : number = ebRadPerPx * fs;
		var cs : number = cos(th);
		var sn : number = sin(th);
		var b : CVec3 = V3AddV3(V3MulFloat(od, cs), V3MulFloat(ax, dp * (1.0 - cs)));
		var off : CVec3 = V3MulFloat(cx, sn);
		tot = V3AddV3(tot, V3MulFloat(V3AddV3(SampleSrc(V3AddV3(b, off)), SampleSrc(V3SubV3(b, off))), w));
		sum += 2.0 * w;
	}
	out_color = new CVec4(V3MulFloat(tot, 1.0 / sum), 1.0);
}

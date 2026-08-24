import {
	Build, CVec4, CMat, Null,
	V4MulMatCoordi,
	invocationID,
} from "./Shader";

//정점 수. 워크그룹 단위로 도니 실제 정점보다 더 많은 스레드가 생긴다 - 넘는 건 버린다
var vN : number=Null();
//정점당 3 플로트. 인스턴스 행렬이 아직 안 곱해진 로컬 좌표
var local : Array<number>=Null();
//정점당 1개. 그 정점이 몇 번째 인스턴스인지
var oidx : Array<number>=Null();
//인스턴스당 행렬 하나. 매 프레임 바뀌는 건 이것뿐이고 그게 이 커널의 요점이다
var mats : Array<CMat>=Null();
//결과가 들어갈 자리. 정점 버퍼의 position 채널을 그대로 받는다(VERTEX|STORAGE)
var dst : Array<number>=Null();

//ps 자리가 비어 있어 컴퓨트 셰이더가 된다. 베링(5번째)과 픽셀출력(7번째)도 같이 비워야
//오타로 ps 를 못 찾은 렌더 셰이더와 구분된다
Build("Artgine/Compute/PosTransform",[],
	pos_main,[vN,local,oidx,mats,dst],[],
	null,[]
);

function pos_main()
{
	var i : number=invocationID;
	if(i>=vN)	return;

	var b : number=i*3.0;
	//인덱스는 인터프리터가 정수로 바꿔주므로 여기서 따로 변환하지 않는다
	var o : CVec4=V4MulMatCoordi(new CVec4(local[b],local[b+1.0],local[b+2.0],1.0),mats[oidx[i]]);
	dst[b]=o.x;
	dst[b+1.0]=o.y;
	dst[b+2.0]=o.z;
}

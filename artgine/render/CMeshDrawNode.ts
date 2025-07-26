
import {CObject} from "../basic/CObject.js";
import {CIndexBuffer} from "./CIndexBuffer.js"

export class CMeshDrawNode extends CObject
{
	public vGBuf : any;
	public vGBufEx : Array<any>;
	public iInfo : CIndexBuffer;
	public iBuf : any;
	public iNum : number;
	public vNum : number;
	
	constructor()
	{
		super();
		//this.vInfo=null;
		this.vGBuf = null;
		this.vGBufEx = null;//오픈지엘 더미 담겨있다 파서펑션에서 확인해라

		this.iInfo=new CIndexBuffer();//opengl은 밑에 인덱스 버퍼랑 가리키는 곳이 똑같다
		this.iBuf=null;

		this.iNum=0;
		this.vNum=0;
	}
	//이건 그래픽 버퍼를 또 만들어야해서 자기 자신을 리턴
	toCopy()
	{
		return this;
	}
}

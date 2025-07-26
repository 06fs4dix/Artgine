import {CVec3} from "../geometry/CVec3.js"



export class CMaterial
{
	public name : string;
	public ambient : CVec3;
	public diffuse : CVec3;
	public specular : CVec3;
	public emissive : CVec3;
	public power : number;
	constructor()
	{
		this.name="";
		this.ambient=new CVec3(0.2,0.2,0.2);//주변광//2012.10.08 1.0으로 고정으로 변경
		this.diffuse=new CVec3(1,1,1);//확산광
		this.specular=new CVec3(0.5,0.5,0.5);//반사광
		this.emissive=new CVec3();//방출광
		this.power=10;
	}
};


/*export default class CMaterial
{
	public name : string;
	public m_ambient : CVec4=new CVec4(0,0,0,0);
	public m_SEP : CVec4=new CVec4(0,0,0,0);//
	
	constructor()
	{
	}
};*/
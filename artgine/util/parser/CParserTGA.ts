import {CParser} from "./CParser.js";
import { CTexture } from "../../render/CTexture.js";



export class CParserTGA extends CParser
{
	public mTemp=new Uint8Array(4);
	mAlphaCut=0;
	mAlphaBleed=true;//tga는 사용안하는 옵션인데 호환성 위해서 추가
	//public m_alpha=false;
	constructor()
	{
		super();
		//this.m_temp=new Uint8Array(4);
	}
	ReadBuf(info,_buf,x,y,_comp)
	{
		
	}
	override async Load(pa_fileName){}
	override GetResult() : CTexture
	{
		return this.mResult;
	}
}
import CParserTGA_imple from "../../util_imple/parser/CParserTGA.js";



CParserTGA_imple();
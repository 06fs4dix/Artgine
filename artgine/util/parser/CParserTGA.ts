import {CParser} from "./CParser.js";
import { CExporter } from "./CExporter.js";
import { CTexture } from "../../render/CTexture.js";


export class CTARGA extends CExporter
{
	public imageIDLength=0;// 식별 필드의 길이 // 0이면 식별 필드가 NO포함 0
	public colorMapType=0;// 색상 맵의 종류 : 항상 0임 1
	public imageTypeCode=0;// 2이면 압축되지 않은 RGB// 3이면 압축되지 않은 그레이 스케일 2
	public colorMapOrigin=0;// 색상 맵의 시작위치 4
	public colorMapLength=0;// 색상 맵의 항목 길이
	public colorMapEntrySize=0;// 색상 맵의 항목 크기
	public imageXOrigin=0;// 이미지 우측하단 x 좌표
	public imageYOrigin=0;// 이미지 좌측하단 x좌표 
	public imageWidth=0;// 이미지 픽셀 단위 너비
	public imageHeight=0;// 이미지 픽셀 단위 높이
	public bitCount=32;// 색상 비트 수 : 16, 24, 32
	public imageDescriptor=0;// 24비트 : 0x00, 32비트 : 0x08
	public imageBuffer : ArrayBuffer;

	constructor(_imgBuf : ArrayBuffer)
	{
		super();
		this.imageBuffer=_imgBuf;		
	}
	GetResult() : ArrayBuffer
	{
		let buf8=new Uint8Array(18+this.imageBuffer.byteLength);
		let buf16=new Uint16Array(buf8.buffer);
		buf16[6]=this.imageWidth;
		buf16[7]=this.imageHeight;
		buf8[16]=this.bitCount;
		this.buffer=buf8;

		for(let y=0;y<this.imageHeight;++y)
		{
			for(let x=0;x<this.imageWidth;++x)
			{
				buf8[18+x*4+(this.imageHeight-y-1)*this.imageWidth*4+0]=this.imageBuffer[x*4+y*this.imageWidth*4+2];
				buf8[18+x*4+(this.imageHeight-y-1)*this.imageWidth*4+1]=this.imageBuffer[x*4+y*this.imageWidth*4+1];
				buf8[18+x*4+(this.imageHeight-y-1)*this.imageWidth*4+2]=this.imageBuffer[x*4+y*this.imageWidth*4+0];
				buf8[18+x*4+(this.imageHeight-y-1)*this.imageWidth*4+3]=this.imageBuffer[x*4+y*this.imageWidth*4+3];
			}
		}

		return this.buffer;
	}

	// GetBuf(_buf : ArrayBuffer)
	// {
	// 	var buf8=new Uint8Array(18+_buf.byteLength);
	// 	var buf16=new Uint16Array(buf8.buffer);
	// 	buf16[6]=this.imageWidth;
	// 	buf16[7]=this.imageHeight;
	// 	buf8[16]=this.bitCount;
		

	// 	for(let y=0;y<this.imageHeight;++y)
	// 	{
	// 		for(let x=0;x<this.imageWidth;++x)
	// 		{
	// 			buf8[18+x*4+(this.imageHeight-y-1)*this.imageWidth*4+0]=_buf[x*4+y*this.imageWidth*4+2];
	// 			buf8[18+x*4+(this.imageHeight-y-1)*this.imageWidth*4+1]=_buf[x*4+y*this.imageWidth*4+1];
	// 			buf8[18+x*4+(this.imageHeight-y-1)*this.imageWidth*4+2]=_buf[x*4+y*this.imageWidth*4+0];
	// 			buf8[18+x*4+(this.imageHeight-y-1)*this.imageWidth*4+3]=_buf[x*4+y*this.imageWidth*4+3];
	// 		}
	// 	}
		
	// 	// for(let i=0;i<_buf.byteLength;i+=4)
	// 	// {
	// 	// 	buf8[18+i+0]=_buf[i+2];
	// 	// 	buf8[18+i+1]=_buf[i+1];
	// 	// 	buf8[18+i+2]=_buf[i+0];
	// 	// 	buf8[18+i+3]=_buf[i+3];
	// 	// }
	// 	//buf8.set(_buf,18);

	// 	return buf8;
	// }
	
	
	
};

export class CParserTGA extends CParser
{
	public mTemp=new Uint8Array(4);
	mAlphaCut=0;
	//public m_alpha=false;
	constructor()
	{
		super();
		//this.m_temp=new Uint8Array(4);
	}
	ReadBuf(info,_buf,x,y,_comp)
	{
		
	}
	async Load(pa_fileName){}
	GetResult() : CTexture
	{
		return this.mResult;
	}
}
import CParserTGA_imple from "../../util_imple/parser/CParserTGA.js";



CParserTGA_imple();
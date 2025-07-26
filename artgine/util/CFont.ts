import { CObject } from "../basic/CObject.js";
import { CRenderer } from "../render/CRenderer.js";

export class CFontRef
{
	public mKey="";
	public mXSize=0;
	public mYSize=0;
	public mRXSize=0;
	public mRYSize=0;
	
	
    	
	constructor()
	{

	}
	GetRX()
	{
		return (this.mXSize-this.mRXSize)*0.5;
	}
	// GetRY()
	// {
	// 	return (this.m_ySize-this.m_rySize);
	// }
} 




export class CFontOption extends CObject
{
	public mSize : number;
	public mExp=true;
	public mMaxX=100000;
	public mMaxY=100000;
	
	public mStrokeStyle = 'Black';
    public mFillStyle = 'Black';
    public mLineWidth = 0;
    public mLineCap = "round";//round
    public mLineJoin = "round";//round
	constructor(_size : number=32,_fillStyle='Black',_strokeStyle='Black',_lineWidth=0)
	{
		super();
		this.mSize=_size;
		this.mFillStyle=_fillStyle;
		this.mStrokeStyle=_strokeStyle;
		this.mLineWidth=_lineWidth;

	}
}

export class CFont
{
	static Init(pa_ttfName=null)
	{
		
	}
	static TextToTexName(_render : CRenderer,pa_text : string,_option : CFontOption) : CFontRef
	{
		return null;
    	
	}
};
import CFont_imple from "../util_imple/CFont.js";
CFont_imple();
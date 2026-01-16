import { CBlackBoardRef } from "../../basic/CObject.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CTexture } from "../../render/CTexture.js";
import { CSubject } from "./CSubject.js";
import { CVoxel } from "./CVoxel.js";

export class CDensity extends CSubject
{
    mBuffer : Uint8Array=new Uint8Array(64*64*4);
    mBufferSize=new CVec2(64,64);
    mSize=100;
    
    mResHigh =new Array<string>;
    mResLow =new Array<string>;
    mBillboard=false;

    
    mRate=1;

    mLayer =new Array<CBlackBoardRef<CVoxel>>();

    EditHTMLInit(_div: HTMLDivElement): void {
		super.EditHTMLInit(_div);
		var button=document.createElement("button");
		button.innerText="DensityTool";
		button.onclick=()=>{
			window["DensityTool"](this);
		};
		_div.append(button);
	}
}
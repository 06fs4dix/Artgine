import { CConsol } from "../../basic/CConsol.js";
import { CStream } from "../../basic/CStream.js";
import { CString } from "../../basic/CString.js";
import { CWebSocket } from "../../network/CWebSocket.js";
import { CCanvas, CCanvasPlugin } from "./CCanvas.js";

export class CCanvasPluginSocket extends CCanvasPlugin
{
	mSocket :  CWebSocket;
	mSukPass=true;
	constructor(_socket : CWebSocket)
	{
		super();
		this.mSocket=_socket;
		
	}
	override SetCanvas(_canvas : CCanvas)
	{
		super.SetCanvas(_canvas);
	}
	override Exe()
	{
		if(this.mSocket!=null)
		{
			if(this.mSocket.IsConnect())
			{
				for(let i=0;i<this.mCanvas.mPacketArr.Size();++i)
				{
					this.mSocket.Send(this.mCanvas.mPacketArr.Find(i).Data());
				}
				this.mCanvas.mPacketArr.Clear();

			}
		}
	};
}
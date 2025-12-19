import { CConsol } from "../../basic/CConsol.js";
import { CStream } from "../../basic/CStream.js";
import { CString } from "../../basic/CString.js";
import { CWebSocket } from "../../network/CWebSocket.js";
import { CRoomClient } from "../../server/CRoomClient.js";
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
	SetCanvas(_canvas : CCanvas)
	{
		super.SetCanvas(_canvas);
		if(this.mSocket instanceof CRoomClient)
		{
			this.mSocket.On("Patch",(stream : CStream)=>{
	
				let sendSUK=stream.GetString();
				let readSUK=null;
				if(this.mSocket instanceof CRoomClient)
					readSUK=(this.mSocket as CRoomClient).GetSuk();
				if(this.mSukPass && sendSUK==readSUK)	return;

				while(stream.IsEnd()==false)
				{
					let pathArr=stream.GetString().split(".");

					let target=this.mCanvas.Find(pathArr[0]);
					if(target!=null)
					{
						target=CString.FullPathArrToLastTarget(target,pathArr);
						target.PatchStreamRead(stream,pathArr[pathArr.length-1]);
					}
					else
					{
						CConsol.Log("잘못된 파싱");
						break;
					}
				}//while
				
			});
			this.mCanvas.PatchTrackDefault();
		}
	}
	Exe()
	{
		if(this.mSocket!=null)
		{
			if(this.mSocket.IsConnect())
			{
				for(let i=0;i<this.mCanvas.mPacArr.Size();++i)
				{
					this.mSocket.Send(this.mCanvas.mPacArr.Find(i).Data());
				}
				this.mCanvas.mPacArr.Clear();

			}

			if(this.mCanvas["mPatch"]!=null)
			{
				let stream=new CStream();
				stream.Push("Patch");

				if(this.mSocket instanceof CRoomClient)
					stream.Push((this.mSocket as CRoomClient).GetSuk());
				else
					stream.Push("");
				let count=stream.Data().length;
				
				let path=[];
				for (let [key, each0] of this.mCanvas.GetSubMap().entries())
				{
					path.push(key);
					each0.PatchStreamUpdate(stream,path);
					path.pop();
						
				}
				if(stream.Data().length>count)
				{
					this.mSocket.Send(stream);
				}
			}

		}
	};
}
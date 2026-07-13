import { CCanvasPlugin } from "./CCanvas.js";
export class CCanvasPluginSocket extends CCanvasPlugin {
    mSocket;
    mSukPass = true;
    constructor(_socket) {
        super();
        this.mSocket = _socket;
    }
    SetCanvas(_canvas) {
        super.SetCanvas(_canvas);
    }
    Exe() {
        if (this.mSocket != null) {
            if (this.mSocket.IsConnect()) {
                for (let i = 0; i < this.mCanvas.mPacketArr.Size(); ++i) {
                    this.mSocket.Send(this.mCanvas.mPacketArr.Find(i).Data());
                }
                this.mCanvas.mPacketArr.Clear();
            }
        }
    }
    ;
}

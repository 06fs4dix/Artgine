import { WebSocketServer } from 'ws';
import { IListener } from '../basic/Basic.js';
import { CEvent } from '../basic/CEvent.js';
import { CServer } from './CServerMain.js';
import { CConsol } from '../basic/CConsol.js';
import { CUniqueID } from '../basic/CUniqueID.js';
export class CServerSocker extends CServer 
{
    mWSS : WebSocketServer;
    constructor()
    {
        super();
    }
    GetPath()
    {
        let pathArr=CServer.FindURLPatterns(this);
        if(pathArr==null || pathArr.length==0)  return null;
        return pathArr[0];
    }
    override Connect()
    {
        if(this.mMainServer==null)  return false;

        let path=this.GetPath();
       
            
        CConsol.Log("[CServerSocker]"+path+" Start",CConsol.eColor.blue);
        
        if(path!=null)
        {
            if(path[0]!="/")
                path="/"+path;
            this.mWSS = new WebSocketServer({ noServer: true });
            this.mMainServer.GetServer().on('upgrade', (req, socket, head) => {
                
                const url = new URL(req.url, `http://${req.headers.host}`);
                //CConsol.Log("접속 요청 경로: " + url.pathname, "yellow");
                if (url.pathname === path)
                {
                    socket["__claimed"] = true;
                    this.mWSS.handleUpgrade(req, socket, head, (ws) => {
                        this.mWSS.emit('connection', ws, req);
                    });
                }
                else
                {
                    // 같은 서버의 다른 upgrade 리스너(CTerminalRouter 등)는 경로가 맞으면 await 전에 동기적으로
                    // __claimed를 표시한다. 즉시 destroy하면 그 리스너가 await(쿠키 인증) 중인 소켓을 끊으므로,
                    // 모든 리스너의 동기 구간이 끝난 뒤에도 아무도 표시하지 않은 소켓만 정리한다.
                    setImmediate(() => {
                        if (!socket["__claimed"] && !socket.destroyed)
                        {
                            CConsol.Log("경로 불일치. 연결 거부됨", "red");
                            socket.destroy();
                        }
                    });
                }
            });
        }
        else
            this.mWSS=new WebSocketServer({server: this.mMainServer.GetServer() });
        
        this.mWSS.on('connection', (ws) => {
            ws["id"]=CUniqueID.GetHash();
            if(this.GetEvent(CEvent.eType.Open)!=null)
                this.GetEvent(CEvent.eType.Open).Call(ws);
            ws.on('message', (message) => {
                if(this.GetEvent(CEvent.eType.Message)!=null)
                    this.GetEvent(CEvent.eType.Message).Call(ws,message);
            });
            ws.on('close', () => {
                if(this.GetEvent(CEvent.eType.Close)!=null)
                    this.GetEvent(CEvent.eType.Close).Call(ws);
            });
        });

    }
    override Destroy(): void {
        CConsol.Log("[CServerSocker] Destroy", CConsol.eColor.red);
    
        // 모든 클라이언트 소켓 종료
        if (this.mWSS && this.mWSS.clients) {
            for (const ws of this.mWSS.clients) {
                try {
                    ws.close();
                } catch (e) {
                    console.error("Error closing client socket:", e);
                }
            }
        }
    
        // WebSocketServer 종료
        if (this.mWSS) {
            this.mWSS.close((err) => {
                if (err)
                    console.error("Error closing WebSocketServer:", err);
                else
                    CConsol.Log("[CServerSocker] WebSocketServer closed", CConsol.eColor.red);
            });
        }
    }
    
}
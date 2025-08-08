import { WebSocketServer } from 'ws';
import { IListener } from '../basic/Basic.js';
import { CEvent } from '../basic/CEvent.js';
import { CServer } from './CServerMain.js';
import { CConsol } from '../basic/CConsol.js';
export class CServerSocker extends CServer 
{
    mWSS : WebSocketServer;
    constructor()
    {
        super();
    }
    
    override Connect()
    {
        if(this.mMainServer==null)  return false;

        let pathArr=CServer.FindURLPatterns(this);
       
            
        CConsol.Log("[CServerSocker]"+pathArr+" Start",CConsol.eColor.blue);
        
        if(pathArr!=null)
        {
            let path=pathArr[0];
            if(path[0]!="/")
                path="/"+path;
            this.mWSS = new WebSocketServer({ noServer: true });
            this.mMainServer.GetServer().on('upgrade', (req, socket, head) => {
                
                const url = new URL(req.url, `http://${req.headers.host}`);
                //CConsol.Log("접속 요청 경로: " + url.pathname, "yellow");
                if (url.pathname === path) 
                {
                    this.mWSS.handleUpgrade(req, socket, head, (ws) => {
                        this.mWSS.emit('connection', ws, req);
                    });
                }
                else 
                {
                    CConsol.Log("경로 불일치. 연결 거부됨", "red");
                    socket.destroy();
                }
            });
        }
        else
            this.mWSS=new WebSocketServer({server: this.mMainServer.GetServer() });
        
        this.mWSS.on('connection', (ws) => {
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
    Destroy(): void {
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
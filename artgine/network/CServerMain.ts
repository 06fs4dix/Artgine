import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';

import { Server } from 'http';
import {CConsol} from '../basic/CConsol.js';
import {CPath} from '../basic/CPath.js';
import { CEvent } from '../basic/CEvent.js';
import { IListener } from '../basic/Basic.js';
import { CScript } from '../util/CScript.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
var gDummyEvent=new CEvent();

var gURLPatterns  = new Map<any,Array<string>>();

export function URLPatterns(_paths: string[]) {
    return function (target: Function) {
        gURLPatterns.set(target.name, _paths);

        // for(let path of _paths)
        // {
        //     if(path.indexOf("html")!=-1)
        //         gHTMLNext.add(path);
        // }
        
    };
}
export class CServer implements IListener
{
    
    //mPath="";
    mMainServer : CServerMain=null;
    mEventMap=new Map<string,CEvent>();
    Connect(){};
    SetServerMain(_server : CServerMain)
    {
        this.mMainServer=_server;
        _server.Push(this);
    }
    On(_key,_event,_target=null)
    {
        this.mEventMap.set(_key,CEvent.ToCEvent(_event));
    }
    Off(_key: any, _target: any) {
        throw new Error('Method not implemented.');
    }
    GetEvent(_key: any, _target: any=null) {
        // let event=this.mEventMap.get(_key);
        // if(event==null)
        //     event=gDummyEvent;
        return this.mEventMap.get(_key);
    }
    static FindURLPatterns(_class)
    {
        return gURLPatterns.get(_class.constructor.name);
    }
    Destroy()
    {
        CConsol.Log("["+this.constructor.name+"]  Destroy",CConsol.eColor.red);
    }
}
var gMain : CServerMain=null;
export class CServerMain 
{
    private mApp;
    private mPort: number;
    private mPath: string;
    //private mWatchPath: string | null;
    private mServer: Server | null = null;
    //private mLiveReloadServer = null;
    mWebServerArr=new Array<CServer>();
    mLoadScript=new Set<string>();

    constructor(_port: number, _path: string, _watchPath: string | null = null) {
        this.mPort = _port;
        this.mPath = _path;
        gMain=this;
        //this.mWatchPath = _watchPath;
    }
    static Main()   {   return gMain;   }
    GetServer() {   return this.mServer;    }
    GetPath(){  return this.mPath;  }
    GetApp(){  return this.mApp;  }
    Push(_server : CServer)
    {
        this.mWebServerArr.push(_server);
        _server.Connect();
    }

    public async Init(): Promise<boolean> {
        return new Promise((resolve) => {
            this.mApp = express();

            this.mApp.use(async (req: Request, res: Response, next: NextFunction) => {
                res.setHeader('Access-Control-Allow-Origin', '*');
                // res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
                // res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

                // HTML 파일에서 server 스크립트 찾기
                if (req.url && req.url.endsWith('.html')) {
                    //console.log(`\n=== HTML 요청 감지 ===`);
                    console.log(`call URL: ${req.url}`);
                    //console.log(`현재 작업 디렉토리: ${process.cwd()}`);
                    
                    // 요청 URL에서 mPath 부분 제거
                    let cleanUrl = req.url;
                    if (this.mPath && cleanUrl.startsWith(this.mPath)) {
                        cleanUrl = cleanUrl.substring(this.mPath.length);
                    }
                    const filePath = path.join(process.cwd(), cleanUrl);
                    //console.log(`파일 경로: ${filePath}`);
                    //console.log(`파일 존재 여부: ${fs.existsSync(filePath)}`);
                    
                    try {
                        if (fs.existsSync(filePath)) {
                            const htmlContent = fs.readFileSync(filePath, 'utf8');
                            //console.log(`파일 크기: ${htmlContent.length} bytes`);
                            

                            const serverScriptRegex = /<script[^>]*type\s*=\s*["']server["'][^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi;
                            let match;

                            while ((match = serverScriptRegex.exec(htmlContent)) !== null) {
                                //console.log(`Server Script src: ${match[1]}`);
                                
                                // 파일 경로 처리
                                let scriptPath = match[1];
                                
                                // 상대 경로인 경우 절대 경로로 변환
                                if (!scriptPath.startsWith('/') && !scriptPath.startsWith('http')) {
                                    // Node.js path 모듈을 사용하여 정확한 경로 해결
                                    const pathModule = await import('path');
                                    const htmlDir = (pathModule as any).default.dirname(filePath);
                                    scriptPath = (pathModule as any).default.join(htmlDir, scriptPath);
                                }
                                
                                
                                
                                // CScript.Build 호출 (중복 로드 방지는 이미 내부에서 처리됨)
                                await CScript.Build(scriptPath, scriptPath);
                            }
                            
                        } else {
                            console.log(`파일이 존재하지 않음: ${filePath}`);
                        }
                    } catch (error) {
                        console.error('HTML 파일 읽기 오류:', error);
                    }
                } 

                next();
                
            });

            // this.mApp.use((req: Request, res: Response, next: NextFunction) => {
            //     res.setHeader('Access-Control-Allow-Origin', '*');

            //     let reqPath = decodeURI(req.path);
            //     let virtualPath = reqPath;

            //     if (this.mPath && reqPath.startsWith(this.mPath)) {
            //         virtualPath = reqPath.substring(this.mPath.length);
            //     }

            //     if (gHTMLNext.has(virtualPath)) {
            //         return next(); // router로 넘김
            //     }

            //     // ✅ safe하게 url만 바꿔서 static 처리
            //     const originalUrl = req.url;
            //     req.url = virtualPath;

            //     express.static(CPath.PHPC())(req, res, (err) => {
            //         req.url = originalUrl; // 복구
            //         if (err) next(err);
            //     });
            // });


            this.mApp.use(session({
                secret: 'secretKey',
                resave: false,
                saveUninitialized: true
            }));


            this.mApp.use(cors());

           

            this.mApp.use(express.json({ limit: '100mb' }));
            this.mApp.use(express.urlencoded({ extended: false,limit: '100mb' }));


            this.mApp.use(this.mPath, express.static(CPath.PHPC()));
            // this.mApp.use(express.static("public", {
            //     setHeaders: (res, path) => {
            //         if (path.endsWith(".webmanifest")) {
            //         res.setHeader("Content-Type", "application/manifest+json");
            //         }
            //     }
            // }));

            this.mServer = this.mApp.listen(this.mPort);

            this.mServer.on('listening', async () => {
                CConsol.Log(`[WebServer] started on port ${this.mPort} Path : ${this.mPath} `, CConsol.eColor.blue);

                // if (this.mWatchPath !== null) 
                // {
                //     try {
                //         // 동적 import로 모듈 로드
                //         const livereload = (await import('livereload')).default;
                //         const connectLiveReload = (await import('connect-livereload')).default;

                //         // 익스프레스 미들웨어에 live reload 추가
                //         this.mApp.use(connectLiveReload());

                //         // livereload 서버 시작
                //         this.mLiveReloadServer = livereload.createServer();
                //         this.mLiveReloadServer.watch(this.mWatchPath);

                //         this.mLiveReloadServer.server.once("connection", () => {
                //             setTimeout(() => {
                //                 this.mLiveReloadServer?.refresh("/");
                //             }, 100);
                //         });
                //     } catch (e) {
                //         console.warn("LiveReload 모듈 로드 실패: ", e);
                //     }
                // }


                resolve(false); // 정상 실행
            });

            this.mServer.on('error', (err: any) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(`Port ${this.mPort} is already in use`);
                    resolve(true); // 포트 충돌
                } else {
                    console.error('Server error:', err);
                    resolve(true); // 기타 오류도 충돌 처리
                }
            });
        });
    }

    public Destroy(): void {
        if (this.mServer) {
            this.mServer.close();
            this.mServer = null;
        }

        // if (this.mLiveReloadServer) {
        //     this.mLiveReloadServer.close();
        //     this.mLiveReloadServer = null;
        // }
        for(let server of this.mWebServerArr)
        {
            server.Destroy();
        }
        CConsol.Log("[WebServer]  Destroy",CConsol.eColor.red);
        CScript.Clear();
        
        //CConsol.Log(`[WebServer] Destroy`, CConsol.eColor.blue);
    }
}


//==============================================

import { spawn } from 'child_process';
import { StringDecoder } from 'string_decoder';
import iconv from 'iconv-lite';
import * as https from 'https'; // 다운로드를 위해 추가
import * as http from 'http';
import * as net from 'net';
import * as path from 'path';
import * as fs from 'fs';
import { CServerRouter } from '../network/CServerRouter.js';
import { CServerMain } from '../network/CServerMain.js';
import { CUniqueID } from '../basic/CUniqueID.js';
import { CConsol } from '../basic/CConsol.js';
import { CFile } from '../system/CFile.js';

/*
claude : 
git bash를 설치되어 있어야한다.
브라우져 인증(구독제) or api(종량제)넣어야함

ANTHROPIC_API_KEY
https://platform.claude.com/dashboard

gemini : 
환경변수에 api를 넣으면 됌(종량제)
https://aistudio.google.com
GEMINI_API_KEY


*/



const IS_WIN = process.platform === 'win32';
let currentCwd = process.cwd();
const MAX_HISTORY = 500;
const PASSWORD = CUniqueID.GetHash();
//const PASSWORD = 'ttyd';

CConsol.Log("CTerminalRouter PW: "+PASSWORD);
const gHistory: {text: string, color: string}[] = [];
const gAuthedTokens = new Set<string>();
const gFailMap = new Map<string, {count: number, until: number}>();

function pushHistory(text: string, color: string) {
    gHistory.push({ text, color });
    if (gHistory.length > MAX_HISTORY) gHistory.shift();
}

// [ADDED] ttyd 바이너리 정보 및 다운로드 경로 설정
const TTYD_VERSION = "1.7.7"; // 고정 버전 사용 또는 필요시 업데이트
const BIN_DIR = path.resolve(process.cwd(), 'artgine', 'external', 'bin');

function getTtydFileName() {
    if (IS_WIN) return 'ttyd.win32.exe';
    if (process.platform === 'darwin') return 'ttyd.macos';
    if (process.arch === 'arm64') return 'ttyd.aarch64';
    return 'ttyd.x86_64';
}
const TTYD_FILENAME = getTtydFileName();
const TTYD_PATH = path.join(BIN_DIR, TTYD_FILENAME);
async function ensureTtydPath(): Promise<string | null> {
    const fileName = getTtydFileName();
    const fullPath = path.join(BIN_DIR, fileName);

    // 1. 이미 파일이 존재하는지 확인 (fs는 기본 모듈이므로 직접 사용)
    if (fs.existsSync(fullPath)) {
        return fullPath;
    }

    // 2. 폴더가 없으면 생성 (CFile 활용)
    await CFile.FolderCreate(BIN_DIR);

    // 3. GitHub에서 다운로드 (CFile.Load 활용)
    const downloadUrl = `https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/${fileName}`;
    console.log(`[TTYD] Downloading binary from: ${downloadUrl}`);
    
    // CFile.Load는 URL인 경우 fetch를 통해 ArrayBuffer를 반환합니다.
    const data = await CFile.Load(downloadUrl); 

    if (data) {
        // 4. 파일 저장 (CFile.Save 활용)
        await CFile.Save(data, fullPath);
        
        // 5. 실행 권한 부여 (POSIX 환경)
        if (process.platform !== 'win32') {
            fs.chmodSync(fullPath, 0o755);
        }
        console.log(`[TTYD] Download and save complete: ${fullPath}`);
        return fullPath;
    }

    return null;
}
function spawnCmd(cmd: string) {
    if (IS_WIN) {
        return spawn('cmd', ['/c', `chcp 65001 >nul && ${cmd}`], {
            shell: true, cwd: currentCwd,
            env: { ...process.env, FORCE_COLOR: '0' }
        });
    }
    const [bin, ...args] = cmd.split(' ');
    return spawn(bin, args, { shell: true, cwd: currentCwd });
}

function decodeBuf(buf: Buffer): string {
    const utf8 = buf.toString('utf8');
    if (!utf8.includes('\uFFFD')) return utf8;
    return iconv.decode(buf, 'cp949');
}

function genToken(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
let gTtydProc: ReturnType<typeof spawn> | null = null;
// [MODIFIED] 'gemini' 타입 추가
let gTtydMode: 'cmd' | 'claude' | 'gemini' | null = null;
async function startTtyd(mode: 'cmd' | 'claude' | 'gemini') {
    if (gTtydMode === mode && gTtydProc) return true;

    if (gTtydProc) {
        try { gTtydProc.kill(); } catch {}
        gTtydProc = null;
        gTtydMode = null;
    }

    // [변경] ttyd 경로를 동적으로 확보
    const ttydPath = await ensureTtydPath();
    if (!ttydPath) {
        console.error('[TTYD] Failed to ensure ttyd executable.');
        return;
    }

    let args: string[] = [];
    const shellCmd = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
    const shellArg = process.platform === 'win32' ? (mode === 'gemini' ? '/c' : '/k') : '-c';

    if (mode === 'claude') {
        args = ['-p', '7681', '-i', '127.0.0.1', '--writable', shellCmd, shellArg, 'claude'];
    } else if (mode === 'gemini') {
        args = ['-p', '7681', '-i', '127.0.0.1', '--writable', shellCmd, shellArg, 'npx', 'gemini'];
    } else {
        args = ['-p', '7681', '-i', '127.0.0.1', '--writable', shellCmd];
    }

    const ttyd = spawn(TTYD_PATH, args, { detached: false, stdio: 'ignore', cwd: currentCwd });
    
    ttyd.on('error', (e) => console.error('[TTYD ERROR]', e));
    ttyd.on('exit', (code) => {
        console.log(`ttyd(${mode}) exited with code`, code);
        gTtydProc = null;
        gTtydMode = null;
    });

    console.log(`[TTYD] started (${mode}) on port 7681 using ${TTYD_PATH}`);
    gTtydProc = ttyd;
    gTtydMode = mode;
    return true;
}
export class CTerminalRouter extends CServerRouter {
    override Connect() {
        const app = CServerMain.Main().GetApp();

        const checkBrute = (req: any, res: any, next: any) => {
            const ip = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            const fail = gFailMap.get(ip);
            if (fail && fail.until > now) {
                const sec = Math.ceil((fail.until - now) / 1000);
                res.json({ ok: false, msg: `${sec}초 후 재시도하세요` });
                return;
            }
            next();
        };

        const checkToken = (req: any, res: any, next: any) => {
            const token = req.query.token || req.headers['x-cmd-token'];
            if (!gAuthedTokens.has(token)) {
                res.status(401).end('[system] 인증 필요');
                return;
            }
            next();
        };
        app.get('/cmd/start-ttyd', checkToken, async (req, res) => {
            const ok = await startTtyd('cmd');
            res.json({ ok });
        });

        app.get('/cmd/start-ttyd-claude', checkToken, async (req, res) => {
            const ok = await startTtyd('claude');
            res.json({ ok });
        });

        app.get('/cmd/start-ttyd-gemini', checkToken, async (req, res) => {
            const ok = await startTtyd('gemini');
            res.json({ ok });
        });

        const server = CServerMain.Main().GetServer();
        if (server) {
            server.on('upgrade', (req: any, socket: any, head: Buffer) => {
                const urlObj = new URL(req.url!, 'http://localhost');
                if (urlObj.pathname !== '/cmd/ttyd-ws') return;

                const token = urlObj.searchParams.get('token');
                if (!gAuthedTokens.has(token!)) {
                    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
                    socket.destroy();
                    return;
                }

                const proxy = net.connect(7681, '127.0.0.1', () => {
                    const h = req.headers;
                    let reqHeaders = 'GET /ws HTTP/1.1\r\n';
                    reqHeaders += 'Host: localhost:7681\r\n';
                    reqHeaders += 'Upgrade: websocket\r\n';
                    reqHeaders += 'Connection: Upgrade\r\n';
                    if (h['sec-websocket-key'])        reqHeaders += `Sec-WebSocket-Key: ${h['sec-websocket-key']}\r\n`;
                    if (h['sec-websocket-version'])    reqHeaders += `Sec-WebSocket-Version: ${h['sec-websocket-version']}\r\n`;
                    if (h['sec-websocket-extensions']) reqHeaders += `Sec-WebSocket-Extensions: ${h['sec-websocket-extensions']}\r\n`;
                    if (h['sec-websocket-protocol'])   reqHeaders += `Sec-WebSocket-Protocol: ${h['sec-websocket-protocol']}\r\n`;
                    reqHeaders += '\r\n';
                    proxy.write(reqHeaders);
                    if (head && head.length) proxy.write(head);
                    socket.setNoDelay(true);
                    proxy.setNoDelay(true);
                    socket.pipe(proxy);
                    proxy.pipe(socket);
                });
                proxy.on('error', (e) => { console.error('[TTYD WS PROXY ERROR]', e); try { socket.destroy(); } catch {} });
                socket.on('error', (e) => { console.error('[TTYD WS SOCKET ERROR]', e); try { proxy.destroy(); } catch {} });
            });
        }

        const killTtyd = () => {
            if (gTtydProc) {
                try { gTtydProc.kill(); } catch {}
                gTtydProc = null;
                gTtydMode = null;
            }
        };
        process.on('exit', killTtyd);
        process.on('SIGINT', () => { killTtyd(); process.exit(0); });
        process.on('SIGTERM', () => { killTtyd(); process.exit(0); });

        app.post('/cmd/auth', checkBrute, (req, res) => {
            const ip = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            if (req.body.password === PASSWORD) {
                gFailMap.delete(ip);
                const token = genToken();
                gAuthedTokens.add(token);
                res.json({ ok: true, token });
            } else {
                const fail = gFailMap.get(ip) || { count: 0, until: 0 };
                fail.count++;
                fail.until = fail.count >= 5 ? now + 5 * 60 * 1000 : 0;
                gFailMap.set(ip, fail);
                const msg = fail.count >= 5 ? '5분간 잠금됩니다' : '암호가 틀렸습니다. 다시 입력하세요';
                res.json({ ok: false, msg });
            }
        });

        app.get('/cmd', (_req, res) => {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>CMD Terminal</title>
<link rel="stylesheet" href="/Artgine/artgine/external/legacy/bootstrap-5.3.3-dist/css/bootstrap.min.css">
<script src="/Artgine/artgine/external/legacy/bootstrap-5.3.3-dist/js/bootstrap.min.js"><\/script>
<script src="/Artgine/artgine/external/legacy/screenfull/screenfull.min.js"><\/script>
<style>
html{height:-webkit-fill-available;}
html,body{height:100%;margin:0;padding:0;background:#1a1a1a;overflow:hidden;}
#output::-webkit-scrollbar{width:5px;}
#output::-webkit-scrollbar-thumb{background:#333;border-radius:3px;}
#ttyd-frame{display:none;position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:999;}
</style>
</head>
<body class="d-flex flex-column" style="height:100%;background:#1a1a1a;color:#d4d4d4;">
<div class="d-flex align-items-center gap-2 px-3 py-1 bg-black border-bottom border-secondary" style="flex-shrink:0;">
  <span class="text-secondary small font-monospace" id="cmd-cwd" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
  <button class="btn btn-outline-success btn-sm ms-auto me-1" onclick="runClaude()">CLAUDE</button>
  <button class="btn btn-outline-primary btn-sm me-1" onclick="runGemini()">GEMINI</button>
  <button class="btn btn-outline-info btn-sm me-1" data-bs-toggle="modal" data-bs-target="#helpModal">HELP</button>
  <button class="btn btn-outline-secondary btn-sm me-1" onclick="clearOut()">CLEAR</button>
  <button class="btn btn-outline-warning btn-sm" id="btn-fullscreen" onclick="toggleFullscreen()">⛶ FULL</button>
</div>

<div class="modal fade" id="helpModal" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content bg-dark text-light">
      <div class="modal-header border-secondary">
        <h5 class="modal-title">CMD 명령어 예시</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body font-monospace" style="font-size:13px;">

        <div class="mb-3"><div class="text-secondary mb-1">📁 파일/폴더</div>
          <div class="d-flex align-items-center mb-1"><pre class="form-control user-select-all mb-0 me-2 bg-dark text-light border-secondary" style="width:auto;display:inline-block;">dir</pre><span class="text-muted small">현재 폴더 목록</span></div>
        </div>

        <div class="mb-1"><div class="text-secondary mb-1">⚙️ 시스템 / AI 에이전트</div>
          <div class="d-flex align-items-center mb-1"><pre class="form-control user-select-all mb-0 me-2 bg-dark text-light border-secondary" style="width:auto;display:inline-block;">ttyd</pre><span class="text-muted small">기본 CMD 터미널 열기</span></div>
          <div class="d-flex align-items-center mb-1"><pre class="form-control user-select-all mb-0 me-2 bg-dark text-light border-secondary" style="width:auto;display:inline-block;">claude</pre><span class="text-muted small">Claude Code 에이전트 열기</span></div>
          <div class="d-flex align-items-center mb-1"><pre class="form-control user-select-all mb-0 me-2 bg-dark text-light border-secondary" style="width:auto;display:inline-block;">gemini</pre><span class="text-muted small">Gemini CLI 에이전트 열기</span></div>
        </div>

        <div class="mt-3 text-muted small">💡 pre 텍스트 클릭 후 Ctrl+C 로 복사하세요</div>
      </div>
    </div>
  </div>
</div>
<div id="output" class="flex-fill overflow-auto p-2 font-monospace" style="font-size:13px;line-height:1.6;min-height:0;"></div>
<div class="d-flex gap-2 p-2 bg-black border-top border-secondary" style="flex-shrink:0;">
  <span style="color:#00e5a0;" class="align-self-center">❯</span>
  <input id="cmd-input" type="password"
    class="form-control form-control-sm font-monospace"
    style="background:#2a2a2a;color:#d4d4d4;border-color:#444;"
    placeholder="암호를 입력하세요..." autocomplete="off" spellcheck="false">
  <button class="btn btn-success btn-sm px-3" onclick="run()">RUN</button>
</div>
<iframe id="ttyd-frame" src=""></iframe>
<script>
  let hist=[], hidx=-1, gES=null;
  let authed=false, authToken=null;
  const out=document.getElementById('output');
  const inp=document.getElementById('cmd-input');
  const cwdEl=document.getElementById('cmd-cwd');
  const ttydFrame=document.getElementById('ttyd-frame');

  out.scrollTop=out.scrollHeight;
  const _preauth = new URLSearchParams(location.search).get('preauth');
  if(_preauth){
    sysLine('[system] 자동 로그인 중...');
    fetch('/cmd/run',{method:'POST',headers:{'Content-Type':'application/json','x-cmd-token':_preauth},body:JSON.stringify({cmd:'cd'})})
      .then(r=>{
        if(r.ok) return r.json().then(j=>{
          authed=true; authToken=_preauth;
          inp.type='text'; inp.placeholder='명령어 입력...';
          sysLine('[system] 자동 로그인 완료');
          if(j.out) cwdEl.textContent=j.out.trim();
        });
        localStorage.removeItem('cmd_token');
        sysLine('[system] 토큰 만료. 암호를 입력하세요');
      }).catch(()=>{ sysLine('[system] 암호를 입력하세요'); });
  } else {
    sysLine('[system] 암호를 입력하세요');
  }

  function line(text, color='#d4d4d4'){
    const d=document.createElement('div');
    d.style.color=color;
    d.style.whiteSpace='pre-wrap';
    d.style.wordBreak='break-all';
    d.textContent=text;
    out.appendChild(d);
    out.scrollTop=out.scrollHeight;
  }
  function sysLine(text){ line(text,'#888'); }
  function clearOut(){ out.innerHTML=''; }

  function run(){
    const cmd=inp.value.trim(); if(!cmd) return;
    inp.value='';

    if(!authed){
      line('❯ ******','#00e5a0');
      fetch('/cmd/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:cmd})})
        .then(r=>r.json()).then(j=>{
          if(j.ok){
            authed=true; authToken=j.token;
            inp.type='text';
            inp.placeholder='명령어 입력...';
            sysLine('[system] 인증 완료');
            localStorage.setItem('cmd_token', authToken);
            fetch('/cmd/run',{method:'POST',headers:{'Content-Type':'application/json','x-cmd-token':authToken},body:JSON.stringify({cmd:'cd'})})
              .then(r=>r.json()).then(j=>{if(j.out)cwdEl.textContent=j.out.trim();}).catch(()=>{});
          } else {
            sysLine('[system] '+j.msg);
            sysLine('[system] 암호를 입력하세요');
          }
        });
      return;
    }

    hist.unshift(cmd); hidx=-1;

    if(cmd.toLowerCase() === 'ttyd.exe' || cmd.toLowerCase().startsWith('ttyd')){
        sysLine('[system] ttyd 터미널 서버를 시작하는 중...');
        fetch('/cmd/start-ttyd?token=' + authToken)
            .then(r => r.json())
            .then(j => {
                if(j.ok) {
                    const serverHost = window.location.hostname;
                    ttydFrame.src='/cmd/terminal-proxy?token=' + authToken;
                    ttydFrame.style.display = 'block';
                    setTimeout(() => ttydFrame.focus(), 300);
                }
            })
            .catch(() => sysLine('[ERR] ttyd 실행 실패', '#ff4d6d'));
        return;
    }
    else if(cmd.toLowerCase() === 'claude'){
        runClaude();
        return;
    }
    // [ADDED] 클라이언트에서 gemini 입력 시 처리 로직
    else if(cmd.toLowerCase() === 'gemini'){
        sysLine('[system] Gemini CLI 터미널을 시작하는 중...');
        fetch('/cmd/start-ttyd-gemini?token=' + authToken)
            .then(r => r.json())
            .then(j => {
                if(j.ok) {
                    const serverHost = window.location.hostname;
                    ttydFrame.src='/cmd/terminal-proxy?token=' + authToken;
                    ttydFrame.style.display = 'block';
                    setTimeout(() => ttydFrame.focus(), 300);
                }
            })
            .catch(() => sysLine('[ERR] Gemini 실행 실패', '#ff4d6d'));
        return;
    }

    if(gES){gES.close();gES=null;}
    line('❯ '+cmd,'#00e5a0');
    gES=new EventSource('/cmd/stream?cmd='+encodeURIComponent(cmd)+'&token='+authToken);
    gES.onmessage=e=>{
      const d=e.data;
      if(d.startsWith('[DONE:')){
        const code=parseInt(d.slice(6));
        line('── exit '+code, code===0?'#555':'#ff4d6d');
        gES.close(); gES=null;
        fetch('/cmd/run',{method:'POST',headers:{'Content-Type':'application/json','x-cmd-token':authToken},body:JSON.stringify({cmd:'cd'})})
        .then(r=>r.json()).then(j=>{if(j.out)cwdEl.textContent=j.out.trim();}).catch(()=>{});
        inp.focus(); return;
      }
      if(d.startsWith('[ERR] ')){ line(d.slice(6),'#ff4d6d'); return; }
      if(/^cd(\s|$)/.test(cmd)&&d&&!d.startsWith('[')){ cwdEl.textContent=d.trim(); return; }
      line(d);
    };
    gES.onerror=()=>{ line('서버 연결 실패','#ff4d6d'); gES.close(); gES=null; };
  }

  inp.addEventListener('keydown',e=>{
    if(e.key==='Enter'){run();return;}
    if(!authed) return;
    if(e.key==='ArrowUp'){e.preventDefault();if(hidx<hist.length-1)inp.value=hist[++hidx];}
    if(e.key==='ArrowDown'){e.preventDefault();hidx>0?inp.value=hist[--hidx]:(hidx=-1,inp.value='');}
  });

  inp.focus();

  function runClaude(){
    if(!authed){ sysLine('[system] 먼저 인증이 필요합니다'); return; }
    sysLine('[system] Claude 터미널을 시작하는 중...');
    fetch('/cmd/start-ttyd-claude?token=' + authToken)
      .then(r => r.json())
      .then(j => {
        if(j.ok) {
          const serverHost = window.location.hostname;
          ttydFrame.src='/cmd/terminal-proxy?token=' + authToken;
          ttydFrame.style.display = 'block';
          setTimeout(() => ttydFrame.focus(), 300);
        }
      })
      .catch(() => sysLine('[ERR] Claude 실행 실패', '#ff4d6d'));
  }

  function runGemini(){
    if(!authed){ sysLine('[system] 먼저 인증이 필요합니다'); return; }
    sysLine('[system] Gemini CLI 터미널을 시작하는 중...');
    fetch('/cmd/start-ttyd-gemini?token=' + authToken)
      .then(r => r.json())
      .then(j => {
        if(j.ok) {
          const serverHost = window.location.hostname;
          ttydFrame.src='/cmd/terminal-proxy?token=' + authToken;
          ttydFrame.style.display = 'block';
          setTimeout(() => ttydFrame.focus(), 300);
        }
      })
      .catch(() => sysLine('[ERR] Gemini 실행 실패', '#ff4d6d'));
  }

  function toggleFullscreen(){
    if(!screenfull.isEnabled) return;
    screenfull.toggle();
  }
  if(screenfull.isEnabled){
    screenfull.on('change', () => {
      document.getElementById('btn-fullscreen').textContent = screenfull.isFullscreen ? '✕ EXIT' : '⛶ FULL';
    });
  }
<\/script>
</body>
</html>`);
        });

        app.get('/cmd/terminal-proxy', (_req, res) => {
            let retries = 10;
            function attempt() {
            const proxyReq = http.request(
                { hostname: 'localhost', port: 7681, path: '/', method: 'GET',
                  headers: { 'Accept-Encoding': 'identity' } },
                (proxyRes) => {
                    let body = '';
                    proxyRes.setEncoding('utf8');
                    proxyRes.on('data', (chunk: string) => { body += chunk; });
                    proxyRes.on('end', () => {
                        // ttyd는 WebSocket URL을 [protocol, host, pathname, "/ws", search] 로 조합함.
                        // proxy 경유 시 pathname이 /cmd/terminal-proxy 로 오염되므로 URL 전체를 강제 교체.
                        //
                        // Safari IME 문제 근본 원인:
                        //   - xterm.js는 keydown(keyCode=229)을 자체 차단하지만
                        //   - Safari가 keypress 이벤트로 개별 자모를 추가 전송함
                        //   - 해결: WebSocket.prototype.send를 인터셉트해 IME 조합 중 서버 전송 자체를 차단
                        //   - ttyd 프로토콜: '0'+데이터 = 터미널 입력, compositionend 후 조합 완성문자는 허용
                        const inject = [
                            '<script>',
                            '(function(){',
                            // [Diagnostic Log Overlay] iPhone Safari 디버깅용 화면 로그
                            // 'var _logEl=null;',
                            // 'function _initLog(){',
                            // 'if(_logEl)return;',
                            // '_logEl=document.createElement("div");',
                            // '_logEl.style.cssText="position:fixed;bottom:0;left:0;right:0;max-height:40vh;overflow-y:auto;background:rgba(0,0,0,0.85);color:#0f0;font:10px/1.2 monospace;padding:4px;z-index:99999;white-space:pre-wrap;word-break:break-all;";',
                            // 'var btn=document.createElement("button");',
                            // 'btn.textContent="X";',
                            // 'btn.style.cssText="position:fixed;bottom:0;right:0;z-index:100000;background:#900;color:#fff;border:none;padding:4px 8px;font-size:14px;";',
                            // 'btn.onclick=function(){_logEl.remove();btn.remove();_logEl=null;};',
                            // 'document.body.appendChild(_logEl);',
                            // 'document.body.appendChild(btn);',
                            // '}',
                            // 'var _logs=[];',
                            'function _log(msg){}',
                            'function _hex(c){return c.charCodeAt(0).toString(16).padStart(4,"0");}',
                            'function _show(s){',
                            'if(typeof s!=="string")return"<non-string>";',
                            'return Array.from(s).map(function(c){var x=c.charCodeAt(0);return(x>=32&&x<127)?c:"["+_hex(c)+"]";}).join("");',
                            '}',
                            // 'window.addEventListener("DOMContentLoaded",_initLog);',
                            // Log all relevant events
                            // 'document.addEventListener("keydown",function(e){_log("KEYDOWN key="+e.key+" code="+e.keyCode+" comp="+e.isComposing);},true);',
                            // 'document.addEventListener("keypress",function(e){_log("KEYPRESS key="+e.key+" charCode="+e.charCode);},true);',
                            // 'document.addEventListener("input",function(e){_log("INPUT type="+e.inputType+" data="+_show(e.data||"")+" comp="+e.isComposing);},true);',
                            // 'document.addEventListener("compositionstart",function(e){_log("COMP-START data="+_show(e.data||""));},true);',
                            // 'document.addEventListener("compositionupdate",function(e){_log("COMP-UPDATE data="+_show(e.data||""));},true);',
                            // 'document.addEventListener("compositionend",function(e){_log("COMP-END data="+_show(e.data||""));},true);',
                            // Log WebSocket.send to see actual transmitted data
                            // 'var _origSendLog=WebSocket.prototype.send;',
                            // 'WebSocket.prototype.send=function(data){',
                            // 'try{',
                            // 'var info="WS-SEND ";',
                            // 'if(typeof data==="string"){info+="str len="+data.length+" data="+_show(data);}',
                            // 'else if(data instanceof Uint8Array){var t="";for(var i=0;i<Math.min(data.length,30);i++)t+=data[i].toString(16).padStart(2,"0")+" ";info+="u8 len="+data.length+" bytes="+t;',
                            // 'try{info+=" text="+_show(new TextDecoder().decode(data.subarray(1)));}catch(e){}}',
                            // 'else if(data instanceof ArrayBuffer){info+="ab len="+data.byteLength;',
                            // 'try{info+=" text="+_show(new TextDecoder().decode(new Uint8Array(data).subarray(1)));}catch(e){}}',
                            // 'else if(data instanceof Blob){info+="blob size="+data.size;}',
                            // 'else{info+="unknown:"+(typeof data);}',
                            // '_log(info);',
                            // '}catch(e){_log("WS-SEND ERR:"+e.message);}',
                            // 'return _origSendLog.call(this,data);',
                            // '};',
                            // [iOS Safari Korean IME Fix - 실측 데이터 기반]
                            // 실제 iPhone 로그 분석 결과:
                            //   KEYPRESS ㅣ(jamo) → WS-SEND ㅣ(jamo 바로 전송) ← 이게 터미널에 잘못 표시됨
                            //   → INPUT deleteContentBackward × N (IME가 이전 조합 자모 삭제)
                            //   → INPUT insertText "녀"/"녕" (조합 완성된 음절) ← xterm.js가 무시함
                            // 해결: jamo WS-SEND 차단 + deleteContentBackward→BS, insertText→음절 직접 전송
                            'var _enc=new TextEncoder(),_dec=new TextDecoder();',
                            'function _isJamo(s){if(!s||s.length!==1)return false;var x=s.charCodeAt(0);return x>=0x3131&&x<=0x318F;}',
                            'function _decode(data){',
                            'if(typeof data==="string"){if(data.length<2||data.charCodeAt(0)!==48)return null;return{type:"str",text:data.slice(1)};}',
                            'var u8=null;',
                            'if(data instanceof Uint8Array)u8=data;',
                            'else if(data instanceof ArrayBuffer)u8=new Uint8Array(data);',
                            'else return null;',
                            'if(u8.length<2||u8[0]!==48)return null;',
                            'try{return{type:data instanceof ArrayBuffer?"ab":"u8",text:_dec.decode(u8.subarray(1))};}catch(e){return null;}',
                            '}',
                            'function _encode(type,text){',
                            'if(type==="str")return"0"+text;',
                            'var bytes=_enc.encode(text);',
                            'var out=new Uint8Array(bytes.length+1);',
                            'out[0]=48;out.set(bytes,1);',
                            'return type==="ab"?out.buffer:out;',
                            '}',
                            // [Common-Prefix Diff + Cheonjiin 음절 commit 감지]
                            //   필터링: Jamo Block (U+1100-U+11FF) AND Compat Jamo (U+3130-U+318F) 모두 제거
                            //   추적: _lastFiltered = 현재 활성 조합 영역에 표시 중인 텍스트
                            //         _prevHasComp = 직전 insertText에 jamo 포함됐는지 (= composing 상태였는지)
                            //   알고리즘:
                            //     CASE A (committed → new composing):
                            //       prev에 jamo 없음(완성된 음절) && 현재 jamo 있음(composing) && filtered가 더 짧음
                            //       → 이전 음절은 commit된 것 (DEL 없이 보존). _lastFiltered 리셋.
                            //     CASE B (composing → new different syllable):
                            //       prev에 jamo 있음(composing) && 현재 jamo 없음(단일 음절) && 공통 prefix 없음
                            //       → 이전 composing의 syllable은 commit, 새 음절은 append. DEL 없이 추가.
                            //     일반 케이스: common-prefix diff (이전 - common만큼 DEL, 새로운 부분 insert)
                            //   INPUT delete: IME 내부 동작이므로 무시
                            //   1초 idle 시 추적 리셋
                            'var _pSock=null,_pType="u8";',
                            'var _origSend=WebSocket.prototype.send;',
                            'var _lastFiltered="";',
                            'var _prevHasComp=false;',
                            'var _lastInsT=0;',
                            'WebSocket.prototype.send=function(data){',
                            'var d=_decode(data);',
                            'if(d){',
                            'if(/[\\u1100-\\u11FF\\u3130-\\u318F]/.test(d.text)){',
                            '_pSock=this;_pType=d.type;',
                            '_log("BLOCK jamo="+_show(d.text));',
                            'return;',
                            '}',
                            // 비-jamo 데이터가 keypress 등으로 전송될 때, _lastFiltered 동기화가 어긋남 → 리셋
                            'if(!/[\\uAC00-\\uD7A3]/.test(d.text)){',
                            '_lastFiltered="";_prevHasComp=false;',
                            '}',
                            '}',
                            'return _origSend.call(this,data);',
                            '};',
                            'document.addEventListener("input",function(e){',
                            'if(e.inputType==="deleteContentBackward"){',
                            'e.stopImmediatePropagation();',
                            'return;',
                            '}',
                            'if(e.inputType==="insertText"&&e.data){',
                            'var now=Date.now();',
                            'if(now-_lastInsT>1000){_lastFiltered="";_prevHasComp=false;}',
                            '_lastInsT=now;',
                            'if(/^\\s+$/.test(e.data)){',
                            '_log("IGNORE whitespace artifact");',
                            'e.stopImmediatePropagation();',
                            'return;',
                            '}',
                            'var filtered=e.data.replace(/[\\u1100-\\u11FF\\u3130-\\u318F]/g,"");',
                            'var hasComp=/[\\u1100-\\u11FF\\u3130-\\u318F]/.test(e.data);',
                            // CASE 1: filtered 길이 < _lastFiltered 길이
                            //   → 앞쪽 (length 차이만큼)의 음절은 iPhone IME에서 commit됨 (active 영역에서 제거)
                            //   → 마지막 (curr.length)개 음절만 active이고, 그 영역만 diff 적용 (committed 음절은 보존)
                            'if(filtered.length<_lastFiltered.length){',
                            'var commCnt=_lastFiltered.length-filtered.length;',
                            'var still=_lastFiltered.slice(commCnt);',
                            'var cp1=0;',
                            'while(cp1<still.length&&cp1<filtered.length&&still[cp1]===filtered[cp1])cp1++;',
                            'var toDel1=still.length-cp1;',
                            'var toSend1=filtered.slice(cp1);',
                            'for(var i=0;i<toDel1;i++)_origSend.call(_pSock,_encode(_pType,"\\x7f"));',
                            'if(toDel1)_log("→ "+toDel1+" DEL ("+commCnt+" committed)");',
                            'if(toSend1){_log("→ send="+_show(toSend1));_origSend.call(_pSock,_encode(_pType,toSend1));}',
                            '_lastFiltered=filtered;_prevHasComp=hasComp;',
                            'e.stopImmediatePropagation();',
                            'return;',
                            '}',
                            'var cp=0;',
                            'while(cp<_lastFiltered.length&&cp<filtered.length&&_lastFiltered[cp]===filtered[cp])cp++;',
                            // CASE B: composing → 다른 단일 음절 (composing 결과 음절이 commit, 새 음절 append)
                            'if(_prevHasComp&&!hasComp&&filtered&&_lastFiltered&&cp===0){',
                            '_log("CASE B: composing done → append");',
                            '_origSend.call(_pSock,_encode(_pType,filtered));',
                            '_lastFiltered=filtered;_prevHasComp=false;',
                            'e.stopImmediatePropagation();',
                            'return;',
                            '}',
                            // 일반 diff
                            'var toDel=_lastFiltered.length-cp;',
                            'var toSend=filtered.slice(cp);',
                            'for(var i=0;i<toDel;i++)_origSend.call(_pSock,_encode(_pType,"\\x7f"));',
                            'if(toDel)_log("→ "+toDel+" DEL");',
                            'if(toSend){_log("→ send="+_show(toSend));_origSend.call(_pSock,_encode(_pType,toSend));}',
                            '_lastFiltered=filtered;_prevHasComp=hasComp;',
                            'e.stopImmediatePropagation();',
                            '}',
                            '},true);',
                            // [WS URL Fix] pathname 오염 포함 전체 URL을 ttyd 포트(7681)/ws 로 강제 교체
                            'var _W=window.WebSocket;',
                            'function _PW(u,p){',
                            'if(typeof u==="string"){',
                            'var pr=window.location.protocol==="https:"?"wss:":"ws:";',
                            'u=pr+"//"+window.location.hostname+":"+window.location.port+"/cmd/ttyd-ws"+window.location.search;}',
                            'return p?new _W(u,p):new _W(u);}',
                            '_PW.prototype=_W.prototype;',
                            '_PW.CONNECTING=0;_PW.OPEN=1;_PW.CLOSING=2;_PW.CLOSED=3;',
                            'window.WebSocket=_PW;',
                            '})();',
                            '</script>'
                        ].join('\n');
                        const patched = body.includes('</head>')
                            ? body.replace('</head>', inject + '</head>')
                            : inject + body;
                        res.setHeader('Content-Type', 'text/html; charset=utf-8');
                        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                        res.setHeader('Pragma', 'no-cache');
                        res.setHeader('Expires', '0');
                        res.end(patched);
                    });
                }
            );
            proxyReq.on('error', () => {
                if (retries-- > 0) {
                    setTimeout(attempt, 500); // 500ms 간격으로 최대 10회(5초) 재시도
                } else {
                    res.status(503).send('<p>ttyd failed to start.</p>');
                }
            });
            proxyReq.end();
            } // end attempt
            attempt();
        });

        app.get('/cmd/stream', checkToken, (req, res) => {
            const cmd = (req.query.cmd as string)?.trim();
            if (!cmd) return res.status(400).end('cmd required');

            res.writeHead(200, {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*'
            });

            pushHistory('❯ ' + cmd, '#00e5a0');

            if (/^cd(\s|$)/.test(cmd)) {
                const target = cmd.slice(2).trim();
                try {
                    const newCwd = (target === '' || target === '~')
                        ? (process.env.HOME || process.env.USERPROFILE || currentCwd)
                        : path.resolve(currentCwd, target);
                    if (fs.existsSync(newCwd) && fs.statSync(newCwd).isDirectory()) {
                        currentCwd = newCwd;
                        res.write(`data: ${currentCwd}\n\n`);
                    } else {
                        const msg = `cd: '${target}' 경로 없음`;
                        pushHistory(msg, '#ff4d6d');
                        res.write(`data: [ERR] ${msg}\n\n`);
                    }
                } catch (e: any) {
                    pushHistory(e.message, '#ff4d6d');
                    res.write(`data: [ERR] ${e.message}\n\n`);
                }
                res.write(`data: [DONE:0]\n\n`);
                res.end();
                return;
            }

            const proc = spawnCmd(cmd);
            req.on('close', () => proc.kill());

            const outDec = new StringDecoder('utf8');
            const errDec = new StringDecoder('utf8');

            const writeLine = (prefix: string, text: string, color: string) => {
                text.replace(/\r/g, '').split('\n').forEach(l => {
                    if (!l) return;
                    pushHistory(l, color);
                    res.write(`data: ${prefix}${l}\n\n`);
                });
            };

            const outBufs: Buffer[] = [];
            proc.stdout.on('data', (d: Buffer) => {
                outBufs.push(d);
                const decoded = outDec.write(d);
                if (decoded.includes('\uFFFD')) {
                    writeLine('', iconv.decode(Buffer.concat(outBufs), 'cp949'), '#d4d4d4');
                    outBufs.length = 0;
                } else { writeLine('', decoded, '#d4d4d4'); }
            });

            const errBufs: Buffer[] = [];
            proc.stderr.on('data', (d: Buffer) => {
                errBufs.push(d);
                const decoded = errDec.write(d);
                if (decoded.includes('\uFFFD')) {
                    writeLine('[ERR] ', iconv.decode(Buffer.concat(errBufs), 'cp949'), '#ff4d6d');
                    errBufs.length = 0;
                } else { writeLine('[ERR] ', decoded, '#ff4d6d'); }
            });

            proc.on('close', (code: number) => {
                const outRem = outDec.end();
                const errRem = errDec.end();
                if (outRem) writeLine('', outRem, '#d4d4d4');
                if (errRem) writeLine('[ERR] ', errRem, '#ff4d6d');
                pushHistory(`── exit ${code}`, code === 0 ? '#555' : '#ff4d6d');
                res.write(`data: [DONE:${code}]\n\n`);
                res.end();
            });
        });

        app.post('/cmd/run', checkToken, (req, res) => {
            const proc = spawnCmd(req.body.cmd as string);
            const bufs: Buffer[] = [], errBufs: Buffer[] = [];
            proc.stdout.on('data', (d: Buffer) => bufs.push(d));
            proc.stderr.on('data', (d: Buffer) => errBufs.push(d));
            proc.on('close', () => {
                res.json({
                    out: decodeBuf(Buffer.concat(bufs)),
                    err: decodeBuf(Buffer.concat(errBufs))
                });
            });
        });
    }
}
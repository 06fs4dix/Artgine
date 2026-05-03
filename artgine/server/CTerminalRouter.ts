import { spawn } from 'child_process';
import { StringDecoder } from 'string_decoder';
import iconv from 'iconv-lite';
import * as https from 'https'; // 다운로드를 위해 추가
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
    if (gTtydMode === mode && gTtydProc) return;

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
        args = ['-p', '7681', '-i', '0.0.0.0', '-o', '--writable', shellCmd, shellArg, 'claude'];
    } else if (mode === 'gemini') {
        args = ['-p', '7681', '-i', '0.0.0.0', '-o', '--writable', shellCmd, shellArg, 'npx', 'gemini'];
    } else {
        args = ['-p', '7681', '-i', '0.0.0.0', '-o', '--writable', shellCmd];
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
  <button class="btn btn-outline-info btn-sm ms-auto me-1" data-bs-toggle="modal" data-bs-target="#helpModal">HELP</button>
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
  sysLine('[system] 암호를 입력하세요');

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
                    ttydFrame.src='http://'+serverHost+':7681';
                    ttydFrame.style.display = 'block';
                    setTimeout(() => ttydFrame.focus(), 300);
                }
            })
            .catch(() => sysLine('[ERR] ttyd 실행 실패', '#ff4d6d'));
        return;
    }
    else if(cmd.toLowerCase() === 'claude'){
        sysLine('[system] Claude 터미널을 시작하는 중...');
        fetch('/cmd/start-ttyd-claude?token=' + authToken)
            .then(r => r.json())
            .then(j => {
                if(j.ok) {
                    const serverHost = window.location.hostname;
                    ttydFrame.src = 'http://' + serverHost + ':7681';
                    ttydFrame.style.display = 'block';
                    setTimeout(() => ttydFrame.focus(), 300);
                }
            })
            .catch(() => sysLine('[ERR] Claude 실행 실패', '#ff4d6d'));
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
                    ttydFrame.src = 'http://' + serverHost + ':7681';
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
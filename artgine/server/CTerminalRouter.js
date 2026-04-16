import { spawn } from 'child_process';
import { StringDecoder } from 'string_decoder';
import iconv from 'iconv-lite';
import * as path from 'path';
import * as fs from 'fs';
import { CServerRouter } from '../network/CServerRouter.js';
import { CServerMain } from '../network/CServerMain.js';
import { CUniqueID } from '../basic/CUniqueID.js';
import { CConsol } from '../basic/CConsol.js';
const IS_WIN = process.platform === 'win32';
let currentCwd = process.cwd();
const MAX_HISTORY = 500;
const PASSWORD = CUniqueID.GetHash();
CConsol.Log("CTerminalRouter PW: " + PASSWORD);
const gHistory = [];
const gAuthedTokens = new Set();
const gFailMap = new Map();
function pushHistory(text, color) {
    gHistory.push({ text, color });
    if (gHistory.length > MAX_HISTORY)
        gHistory.shift();
}
function spawnCmd(cmd) {
    if (IS_WIN) {
        return spawn('cmd', ['/c', `chcp 65001 >nul && ${cmd}`], {
            shell: true, cwd: currentCwd,
            env: { ...process.env, FORCE_COLOR: '0' }
        });
    }
    const [bin, ...args] = cmd.split(' ');
    return spawn(bin, args, { shell: true, cwd: currentCwd });
}
function decodeBuf(buf) {
    const utf8 = buf.toString('utf8');
    if (!utf8.includes('\uFFFD'))
        return utf8;
    return iconv.decode(buf, 'cp949');
}
function genToken() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
let gTtydProc = null;
let gTtydMode = null;
function startTtyd(mode) {
    if (gTtydMode === mode && gTtydProc)
        return;
    if (gTtydProc) {
        try {
            gTtydProc.kill();
        }
        catch { }
        gTtydProc = null;
        gTtydMode = null;
    }
    const ttydPath = path.resolve(process.cwd(), 'ttyd.win32.exe');
    if (!fs.existsSync(ttydPath)) {
        console.warn('[TTYD] ttyd.exe not found in', process.cwd());
        return;
    }
    let args = [];
    if (mode === 'claude') {
        args = ['-p', '7681', '-i', '0.0.0.0', '-o', '--writable', 'cmd.exe', '/k', 'claude'];
    }
    else if (mode === 'gemini') {
        args = ['-p', '7681', '-i', '0.0.0.0', '-o', '--writable', 'cmd.exe', '/c', 'npx', 'gemini'];
    }
    else {
        args = ['-p', '7681', '-i', '0.0.0.0', '-o', '--writable', 'cmd.exe', '/k'];
    }
    const ttyd = spawn(ttydPath, args, { detached: false, stdio: 'ignore', cwd: currentCwd });
    ttyd.on('error', (e) => console.error('[TTYD ERROR]', e));
    ttyd.on('exit', (code) => {
        console.log(`ttyd(${mode}) exited with code`, code);
        gTtydProc = null;
        gTtydMode = null;
    });
    console.log(`[TTYD] started (${mode}) on port 7681`);
    const kill = () => { try {
        ttyd.kill();
    }
    catch { } };
    process.on('exit', kill);
    process.on('SIGINT', () => { kill(); process.exit(); });
    process.on('SIGTERM', () => { kill(); process.exit(); });
    gTtydProc = ttyd;
    gTtydMode = mode;
}
export class CTerminalRouter extends CServerRouter {
    Connect() {
        const app = CServerMain.Main().GetApp();
        const checkBrute = (req, res, next) => {
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
        const checkToken = (req, res, next) => {
            const token = req.query.token || req.headers['x-cmd-token'];
            if (!gAuthedTokens.has(token)) {
                res.status(401).end('[system] 인증 필요');
                return;
            }
            next();
        };
        app.get('/cmd/start-ttyd', checkToken, (req, res) => {
            startTtyd('cmd');
            setTimeout(() => res.json({ ok: true }), 500);
        });
        app.get('/cmd/start-ttyd-claude', checkToken, (req, res) => {
            startTtyd('claude');
            setTimeout(() => res.json({ ok: true }), 500);
        });
        app.get('/cmd/start-ttyd-gemini', checkToken, (req, res) => {
            startTtyd('gemini');
            setTimeout(() => res.json({ ok: true }), 500);
        });
        app.post('/cmd/auth', checkBrute, (req, res) => {
            const ip = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            if (req.body.password === PASSWORD) {
                gFailMap.delete(ip);
                const token = genToken();
                gAuthedTokens.add(token);
                res.json({ ok: true, token });
            }
            else {
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
  <button class="btn btn-outline-secondary btn-sm" onclick="clearOut()">CLEAR</button>
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
<\/script>
</body>
</html>`);
        });
        app.get('/cmd/stream', checkToken, (req, res) => {
            const cmd = req.query.cmd?.trim();
            if (!cmd)
                return res.status(400).end('cmd required');
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
                    }
                    else {
                        const msg = `cd: '${target}' 경로 없음`;
                        pushHistory(msg, '#ff4d6d');
                        res.write(`data: [ERR] ${msg}\n\n`);
                    }
                }
                catch (e) {
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
            const writeLine = (prefix, text, color) => {
                text.replace(/\r/g, '').split('\n').forEach(l => {
                    if (!l)
                        return;
                    pushHistory(l, color);
                    res.write(`data: ${prefix}${l}\n\n`);
                });
            };
            const outBufs = [];
            proc.stdout.on('data', (d) => {
                outBufs.push(d);
                const decoded = outDec.write(d);
                if (decoded.includes('\uFFFD')) {
                    writeLine('', iconv.decode(Buffer.concat(outBufs), 'cp949'), '#d4d4d4');
                    outBufs.length = 0;
                }
                else {
                    writeLine('', decoded, '#d4d4d4');
                }
            });
            const errBufs = [];
            proc.stderr.on('data', (d) => {
                errBufs.push(d);
                const decoded = errDec.write(d);
                if (decoded.includes('\uFFFD')) {
                    writeLine('[ERR] ', iconv.decode(Buffer.concat(errBufs), 'cp949'), '#ff4d6d');
                    errBufs.length = 0;
                }
                else {
                    writeLine('[ERR] ', decoded, '#ff4d6d');
                }
            });
            proc.on('close', (code) => {
                const outRem = outDec.end();
                const errRem = errDec.end();
                if (outRem)
                    writeLine('', outRem, '#d4d4d4');
                if (errRem)
                    writeLine('[ERR] ', errRem, '#ff4d6d');
                pushHistory(`── exit ${code}`, code === 0 ? '#555' : '#ff4d6d');
                res.write(`data: [DONE:${code}]\n\n`);
                res.end();
            });
        });
        app.post('/cmd/run', checkToken, (req, res) => {
            const proc = spawnCmd(req.body.cmd);
            const bufs = [], errBufs = [];
            proc.stdout.on('data', (d) => bufs.push(d));
            proc.stderr.on('data', (d) => errBufs.push(d));
            proc.on('close', () => {
                res.json({
                    out: decodeBuf(Buffer.concat(bufs)),
                    err: decodeBuf(Buffer.concat(errBufs))
                });
            });
        });
    }
}

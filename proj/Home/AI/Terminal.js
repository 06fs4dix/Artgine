const _urlParams = new URLSearchParams(window.location.search);
const _authBase = _urlParams.get('authBase') || (location.origin + '/' + location.pathname.split('/')[1] + '/');
const _keyParam = _urlParams.get('key');
const _workingDirParam = _urlParams.get('workingDir');
const _allowParam = _urlParams.get('allow');
const _modeParam = _urlParams.get('mode') || 'cmd';
const _mcpParam = _urlParams.get('mcp');
const _mdcopyParam = _urlParams.get('mdcopy');
let authToken = null;
const authScreen = document.getElementById('auth-screen');
const termScreen = document.getElementById('terminal-screen');
const pwInput = document.getElementById('pw-input');
const authErr = document.getElementById('auth-err');
const ttydFrame = document.getElementById('ttyd-frame');
const loginBtn = document.getElementById('login-btn');
pwInput.addEventListener('keydown', e => { if (e.key === 'Enter')
    doAuth(); });
loginBtn.addEventListener('click', doAuth);
document.addEventListener('keydown', (e) => {
    if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3' || e.key === 'F4') {
        e.preventDefault();
        window.parent.postMessage({ type: 'home-hotkey', key: e.key }, '*');
    }
}, true);
init();
function doAuth() {
    const pw = pwInput.value.trim();
    if (!pw)
        return;
    authErr.textContent = '';
    fetch(_authBase + 'auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
    })
        .then(r => r.json())
        .then((j) => {
        if (j.ok) {
            authToken = j.token;
            localStorage.setItem('artgine.token', authToken);
            enterTerminal();
        }
        else {
            authErr.textContent = j.msg;
            pwInput.value = '';
            pwInput.focus();
        }
    })
        .catch(() => { authErr.textContent = 'Connection failed'; });
}
function showAuth(msg = '') {
    authToken = null;
    localStorage.removeItem('artgine.token');
    termScreen.style.display = 'none';
    authScreen.style.setProperty('display', 'flex', 'important');
    authErr.textContent = msg;
    setTimeout(() => pwInput.focus(), 100);
}
function enterTerminal() {
    authScreen.style.setProperty('display', 'none', 'important');
    termScreen.style.display = 'block';
    const q = new URLSearchParams({ mode: _modeParam });
    if (_keyParam)
        q.set('key', _keyParam);
    if (_workingDirParam)
        q.set('workingDir', _workingDirParam);
    if (_allowParam)
        q.set('allow', _allowParam);
    if (_mcpParam)
        q.set('mcp', _mcpParam);
    if (_mdcopyParam)
        q.set('mdcopy', _mdcopyParam);
    console.log('[Terminal] enterTerminal', {
        mode: _modeParam,
        workingDir: _workingDirParam,
        allow: _allowParam,
        mcp: _mcpParam,
        authBase: _authBase,
        startUrl: _authBase + 'cmd/start-ttyd?' + q.toString(),
    });
    fetch(_authBase + 'cmd/start-ttyd?' + q.toString())
        .then(r => r.json())
        .then((j) => {
        if (j.ok) {
            const proxyUrl = _authBase + 'cmd/terminal-proxy?port=' + j.port;
            console.log('[Terminal] ttyd started → port:', j.port, '| proxyUrl:', proxyUrl);
            ttydFrame.src = proxyUrl;
        }
        else if (!j.ok && j.msg === 'Authentication required') {
            showAuth('Session expired. Please sign in again.');
        }
        else {
            console.warn('[Terminal] start-ttyd failed:', j);
        }
    })
        .catch((e) => { console.error('[Terminal] start-ttyd fetch error:', e); });
}
function init() {
    const savedToken = localStorage.getItem('artgine.token');
    if (!savedToken) {
        showAuth();
        return;
    }
    fetch(_authBase + 'auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: savedToken })
    })
        .then(r => r.json())
        .then((j) => {
        if (j.authed) {
            authToken = savedToken;
            enterTerminal();
        }
        else {
            showAuth();
        }
    })
        .catch(() => { showAuth('Server unreachable'); });
}

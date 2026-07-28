# 원격 제어 (Remote Control - ai/tool/remote.js)

> 원격 서버의 콘솔 명령 실행/파일 업로드·다운로드/재시작과, 원격 PC의 실제 마우스·키보드·화면(OS 전체) 제어를
> `ai/tool/remote.js` 하나로 처리한다. 웹페이지 내부 DOM/콘솔만 다룰 때는 이 도구 대신 `ai/tool/browser.js`를 쓴다.
>
> ⚠️ **용어 주의**: 이 도구의 HomeURL은 "HTTP로 붙는 아무 서버"다. 지침 파일의 **접속 정보**는 그 중 **이 프로젝트 서버(로컬)** 일 뿐이고, 사용자가 말하는 **원격지/리모트/RDP 원격**은 보통 아래 `rdpRemotes`다. 둘을 바꾸지 말 것.

## 대상 서버 판별 (Local vs Remote — 먼저 읽을 것)

`remote.js`에 넘길 HomeURL을 고를 때 **아래 순서로 판별**한다. 접속 정보를 무조건 쓰지 않는다.

| 사용자 의도 / 표현 | HomeURL 출처 | 비고 |
|---|---|---|
| **원격지 / 리모트 / RDP / 등록된 원격 서버** | 로컬 `Env.json`의 **`rdpRemotes`** → 각 항목 `entryUrl`에서 서버 base 추출 | 진짜 "다른 PC/다른 서버". 목록이 없거나 대상이 불명이면 **사용자에게 확인** |
| **이 서버 / 로컬 / 접속 정보 / 대상 미지정 API·roots·cmd** | 지침 파일 **"접속 정보"** 섹션의 `주소`+`포트`+`기본경로` | **이 프로젝트 서버 자신**. IP/도메인이 `localhost`가 아니어도 로컬이다. settings.json에서 포트를 추측하지 말 것 |
| 애매함 (둘 다 가능) | — | **추측하지 말고 사용자에게 어느 서버인지 확인** |

- 로컬 서버 로그인: `login`을 **비밀번호 인자 없이** 실행 (로컬 `settings.json` 비밀번호 자동 사용). `Env.json`을 뒤질 필요 없음.
- 원격지 로그인: `rdpRemotes`의 `password`를 `login` 비밀번호 인자로 넘기거나, 가이드 아래 "원격지 주소/비밀번호" 절차를 따른다.
- 잘못된 예: 사용자가 "원격지 워킹 폴더 리스트"라고 했는데 접속 정보(로컬)로 `roots`를 치는 것.

## HomeURL

판별이 끝난 뒤, 그 서버의 base를 HomeURL로 넘긴다.

- 기본형: `<주소>:<포트>/<기본경로>` (예: 로컬 `http://localhost:7000/Artgine`, 원격 `http://dev.example.com:7000/Artgine`)
- `entryUrl`이 `.../proj/Control/Control.html`처럼 페이지 경로까지 있으면 **`/기본경로`까지만** 잘라 HomeURL로 쓴다 (예: `http://host:7000/Artgine/proj/Control/Control.html` → `http://host:7000/Artgine`).
- `Home.html` 쿼리스트링 형태(`.../Home.html?path=...&RootPath=...&RootUrl=...`)로 넘기면 `cmd`/`upload`의 cwd(`RootPath`+`path`)와 `download`의 정적 서빙 경로 계산에 쓰인다. 생략하면 cwd는 기본값(`./`)이다.
- 인증 세션은 이 HomeURL에서 계산한 API base(`/기본경로` 이전 경로)를 키로 `ai/tool/cookie.json`에 저장된다 — 서로 다른 서버로 각각 로그인해도 세션이 섞이지 않고, A서버에 접속했다 B서버에 갔다 다시 A로 돌아와도 A의 인증은 그대로 살아 있다. 이 파일은 `browser.js`/`memo.js`/`messenger.js`와 공용이라 도구가 달라도 같은 세션을 재사용한다.
- 그 서버의 유효한 작업 디렉터리(`RootPath`)를 모른다면 먼저 `roots`로 조회한다. 결과의 `roots[].path` 중 하나를 HomeURL의 `RootPath` 쿼리에 넣어야 `cmd`/`upload`의 cwd나 `download`의 상대경로가 그 루트 기준으로 정확히 계산된다.

## 원격지 주소/비밀번호 출처 (Where Remote Info Comes From)

- `remote.js`는 주소를 스스로 찾아내지 않는다 — HomeURL은 항상 위에서 판별한 출처로 확보해서 넘긴다.
- Control에서 "저장"한 **원격지** 목록은 로컬 서버의 **`Env.json`**(작업 디렉터리 루트, `CPath.WorkingPath()+"Env.json"` 없으면 `desktop/Env.json`)의 **`rdpRemotes`** 키에 있다. 접속 정보와 **별개**다.
  - 형태: `[{ remoteId, entryUrl, password }]` — `entryUrl`이 그 원격의 접속 주소, `password`는 관리자 비밀번호(평문 또는 SHA256 해시 둘 다 가능 — 64자 미만이면 평문으로 보고 자동으로 해시해서 `auth/login`에 보낸다).
  - 값은 JSON 문자열로 저장돼 있으므로 읽을 때 `JSON.parse`가 한 번 더 필요하다.
- 원격지 주소/비밀번호를 모를 때: **`rdpRemotes`를 먼저 확인**. 없거나(`"null"`) 대상이 목록에 없으면 사용자에게 직접 물어본다. 접속 정보로 대체하지 말 것.

## 사용 제한 (Usage Restrictions)

- `cmd` 뒤 명령어 문자열 자체엔 제한이 없다 — 받은 그대로 실행된다. `RootPath`/`path`는 작업 시작 디렉터리(cwd) 지정용일 뿐 보안 경계가 아니다.
- **규칙**: 아래 `node ai/tool/remote.js ...` 명령은 사용 가능한 터미널 실행 도구로 **그대로** 실행한다. `bash -lc '...'` 등으로 감싸지 않는다 (감싸는 셸이 없으면 실행 자체가 실패한다). PowerShell 대신 Bash 툴만 사용한다.
- `screenshot`/`input`/`exec`는 원격 PC의 실제 입력 장치·화면을 건드린다. 꼭 필요할 때만, 영향 범위를 인지한 상태에서 쓴다.
- `restart`는 호출 즉시 그 서버 프로세스를 종료시킨다. **사용자의 명시적 승인 없이는 실행하지 않는다.**

## 명령어 (Commands)

```
node ai/tool/remote.js <HomeURL> login [비밀번호]                              # 비밀번호 생략 시 로컬 settings.json 비밀번호로, 있으면 그 값으로 로그인 → 세션 쿠키 저장
node ai/tool/remote.js <HomeURL> cmd <콘솔 명령어 그대로...>                     # 콘솔 명령 실행(RemoteCMD/Exec) → {ok, stdout, stderr}
node ai/tool/remote.js <HomeURL> upload <로컬파일경로> <원격디렉터리>            # File/Upload
node ai/tool/remote.js <HomeURL> download <원격파일경로> [로컬저장경로]         # 정적 서빙 URL로 GET, 인증 불필요
node ai/tool/remote.js <HomeURL> roots                                        # 작업 루트(RootPath) 목록 조회(File/Root), 인증 불필요
node ai/tool/remote.js <HomeURL> restart                                      # 서버 재시작(File/Restart)
node ai/tool/remote.js <HomeURL> screenshot [quality=75] [monitor=0]          # 화면 캡처 → screenshot.png 저장
node ai/tool/remote.js <HomeURL> input <key|mouseButton> <time_ms> <windowTitle|-> [x y [x2 y2]]  # 시간 기반 입력(hold/drag)
node ai/tool/remote.js <HomeURL> exec <fn> [args_json]                        # nut-js(mouse/keyboard/screen) dot-notation 직접 호출
```

- `login`을 제외한 모든 명령은 세션 쿠키 인증이 필요하다 — 먼저 그 HomeURL로 `login`부터 실행한다.
- 서버 쪽에서 Windows cmd.exe 출력을 UTF-8로 강제 변환하므로(`chcp 65001` 자동 적용) `cmd` 결과의 한글이 깨지지 않는다.

## 인용 주의 (Quotation Cautions)

- `cmd` 뒤 명령어에 공백, `\`(백슬래시), `&&`, `>`, `|` 등 특수문자가 포함되면 명령 전체를 큰따옴표(`"..."`)로 감싸서 하나의 인자로 전달한다.
  - `node ai/tool/remote.js <HomeURL> cmd "type sample\sample.txt"`
  - `node ai/tool/remote.js <HomeURL> cmd "git status && git diff"`

## 파일 업로드/다운로드 (File Upload / Download)

```
node ai/tool/remote.js <HomeURL> login
node ai/tool/remote.js <HomeURL> upload ./local/file.ts ./proj/MyProject/
→ {"ok":true}

node ai/tool/remote.js <HomeURL> download /proj/MyProject/file.ts
→ {"ok":true,"file":"file.ts","size":1234}

node ai/tool/remote.js <HomeURL> download /proj/MyProject/file.ts ./out/file.ts
→ {"ok":true,"file":"./out/file.ts","size":1234}
```

- `<원격디렉터리>`(upload): 서버 파일시스템 기준 절대/상대 경로, 끝에 `/` 포함.
- `<원격파일경로>`(download): `RootPath` 기준 상대 경로, `/`로 시작. 텍스트/바이너리 모두 지원.

## 서버 재시작 (Restart)

REST API `POST /File/Restart` (`artgine/server/CFileServer.ts`)로 서버를 재시작한다.
```
node ai/tool/remote.js <HomeURL> login
node ai/tool/remote.js <HomeURL> restart
→ {"ok":true}
```
- 현재 로드된 settings.json 그대로 재시작한다: 내부적으로 `npm run start -- <현재 settings 파일>`을 detached 실행하고, `desktop/Start.ts`가 기존 프로세스를 kill한 뒤 같은 설정으로 재기동한다.

## 원격 데스크탑 제어 (screenshot / input / exec)

- 대상: 브라우저 페이지가 아니라 **OS 전체**(실제 마우스/키보드/화면).
- `fn`(exec): nut-js `mouse`/`keyboard`/`screen` 객체의 메서드, dot-notation 지원(`mouse.setPosition`, `keyboard.type` 등). 패스스루 호출이라 nut-js 시그니처 그대로 적용된다.
  - 복잡한 동작은 nut-js 공식 문서나 `node_modules/@nut-tree-fork/nut-js/dist/lib/{mouse,keyboard,screen}.class.d.ts` 타입 정의를 참고해서 메서드/인자를 확인한다.
  - `args_json`은 그 메서드의 인자에 **위치 순서대로** 대응하는 배열(기본 `[]`)이다. nut-js의 `Point`는 `{"x":N,"y":N}`, `Button`은 숫자(`LEFT=0`/`MIDDLE=1`/`RIGHT=2`)로 표현한다.
    - 예: `mouse.setPosition(target: Point)` → `exec mouse.setPosition '[{"x":100,"y":100}]'`
    - 예: `mouse.click(btn: Button)` → `exec mouse.click [2]` (우클릭)
- `screenshot`: `quality`(1~100, 기본 75)로 JPEG 압축률 지정. `monitor`: 0=주모니터(기본값), 1=두번째...
- `input`: 키/마우스를 시간 기반(hold/drag)으로 실행한다. 좌표가 없으면 키보드, `x y`가 있으면 마우스 press, `x y x2 y2`가 있으면 드래그로 처리한다. 마우스 버튼은 `left|right|middle`. `windowTitle`을 지정하면(`-`는 미지정) 해당 창을 포그라운드로 올린 뒤 입력한다.
  - 키 유지: `node ai/tool/remote.js <HomeURL> input w 1000 -`
  - 마우스 클릭/프레스: `node ai/tool/remote.js <HomeURL> input left 80 - 400 300`
  - 마우스 드래그: `node ai/tool/remote.js <HomeURL> input left 800 - 400 300 520 300`

## 흐름 예시 (Usage Examples)

```
node ai/tool/remote.js <HomeURL> login
→ ok

node ai/tool/remote.js <HomeURL> cmd dir
→ {"ok":true,"stdout":"...","stderr":""}

node ai/tool/remote.js <HomeURL> screenshot
→ Screenshot saved to screenshot.png

node ai/tool/remote.js <HomeURL> exec mouse.setPosition '[{"x":400,"y":300}]'
```

# Artgine Script - 프로젝트 가이드 (Project Guide)

## 메모리 저장 규칙 (Memory Storage Rules)
- 메모리 정보 저장 전 사용자 승인 필수.

## 빌드 방식 (Build Methods)
- **`.ts` 파일만 수정**. 빌드 시 `.js` 자동 생성됨(몇초 지연 존재).

## TS 타입 체크 규칙 - 필수 (TS Type Check Rules - Required)
`.ts` 수정 후 완료 보고 전 반드시 실행한다.
```bash
node ai/tool/tsc_check.js 수정한파일.ts
```

## 제한 명령어 (Restricted Commands)
다음 명령어는 사용자가 명시적으로 요청하거나 승인하지 않는 한 실행하지 않는다.

- node 임의 실행. `ai/tool/tsc_check.js`, `ai/tool/browser.js`는 제외
- python / python3 실행

## 접속 정보 (Connection Information)
포트/경로는 `Main.json`의 `url` 필드 기준. 우선순위: 워킹 폴더 `Main.json` → `desktop/Main.json`.
- **주소**: `http://localhost`
- **포트**: `8050`
- **기본 경로**: `/Artgine`
- **외부 주소** (공인 IP/DNS, 외부 접속 시): _(미설정)_
- 경로 구조: `<주소>:<포트>/<기본경로>/<폴더경로>/<파일명>.html`
- 예시: `http://localhost:8050/Artgine/proj/2D/Village/Village.html`

## 새 프로젝트 생성 (Create New Project)
**`ai/ProjectSetup.md`** 먼저 읽기 필수.

## 원격 작업 (Remote Work & Command Execution)
**`ai/RemoteCMDGuide.md`** 먼저 읽기 필수.

## 메모 가이드 (Memo Guide)
메모 저장/검색 관련 작업 전 **`ai/MemoGuide.md`** 먼저 읽기 필수.


## 프로젝트 명명 규칙 (Project Naming Convention)
** ai/CodeNamingGuide.md ** 먼저 읽기 필수. 

## Serena MCP 사용 규칙 (Serena MCP Usage Rules)

- 심볼 위치 찾기, 참조 추적, 구현 탐색  **Serena** 
- 심볼 위치 찾기를 제외한건 **네이티브** 기능을 사용한다 



## 아티젠 엔진 사용 가이드 (Artgine Engine Usage Guide)
수학/변환/충돌/렌더링/리소스 로딩/UI 등 로직 구현 전, **`ai/EngineUsageGuide.md`**에서 작업 패턴에 맞는 탐색 위치/키워드를 확인하고 먼저 코드를 검색해본다. 동일 기능이 있으면 직접 구현 금지.
- **팝업/메뉴/대화상자는 직접 HTML을 삽입하지 말고 `CModal`로 구현** (z-index 자동 관리).

### ⚠️ 엔진 API 사용 전 반드시 검증 (Engine API Verification Before Usage)
코드 작성 전, 엔진 클래스(`artgine/`)의 메서드/프로퍼티를 사용할 때는 **존재 여부를 `find_symbol`로 먼저 확인**한다.
- 일반적인 언어 패턴(`.clone()`, `.copy()`, `.length` 등)을 **가정하고 쓰지 말 것**.
- 과거 사례: `CVec3.Clone()` 존재 가정 → 런타임 에러. 실제 복사 방법은 `.Export()` (CObject에서 상속).




## 경로 기준 (Path Standards)
- 모든 상대 경로는 `artgine/`, `desktop/`, `proj/`, `plugin/`, `ai/`가 함께 있는 프로젝트 루트 기준으로 해석한다.
- 현재 작업 디렉터리에 위 폴더 구조가 없으면 상위 디렉터리를 순차 검색해 프로젝트 루트를 찾는다.



## 폴더 구조 (Folder Structure)
```
프로젝트 루트/
├── artgine/   ← 엔진 코어 (Read-only)
│   ├── basic/     ← Base(CObject, CEvent), 자료구조(Tree, Queue), JSON, WASM, LZ압축
│   ├── geometry/  ← Math(Vec, Mat), 충돌(Bound, Ray, GJK_EPA), Octree, 공간분할
│   ├── render/    ← Renderer, Shader(Interpret), Texture, Mesh(Data/DrawNode), Camera, VFX
│   ├── app/       ← Canvas(RPMgr, Plugin, NavMgr), Component(AniFlow, Physics, Paint(2D/3D/Voxel/Terrain), Collider), Subject(UI, Map)
│   ├── network/   ← Fetch, WebSocket, SocketIO, SQL(MySQL, MSSQL, SQLite), ORM, ServerSocket
│   ├── server/    ← ServerLogic(Board, File, OAuth, Score, Signaling), TerminalRouter, Lobby
│   ├── system/    ← OS, File, Sound, Input(Mouse, Key), Timer, Auth, PWA, WebView
│   ├── util/      ← Loader, Parser(GLTF, FBX, OBJ, CSV, IMG/TGA), Action, Coroutine, StateMachine
│   └── z_file/    ← Shader Lib(2D/3D, Light, Shadow, Post, Terrain, SDF, Voxel, Noise)
├── desktop/   ← Electron 메인 프로세스
├── proj/      ← 사용자 프로젝트
├── plugin/    ← 플러그인
└── ai/        ← AI 가이드 및 설정 문서
```

## 웹브라우저 디버깅 (Web Browser Debugging - curl HTTP API)

> 라이브 페이지 콘솔 로그·JS 실행·DOM 조회용. 코드 파일 수정엔 쓰지 않는다.

### 사용 제한 (Usage Restrictions)
- **정적 분석(파일 읽기, grep, glob)을 먼저 한다. `ai/tool/browser.js`는 정적 분석으로 절대 알 수 없는 런타임 정보가 필요할 때만 쓴다.**
- **코드 확인, 클래스/함수 찾기, 파일 구조 파악에 browser.js를 쓰지 않는다.**

`ai/tool/browser.js`를 사용한다. 비밀번호는 스크립트가 자동으로 읽는다. 쿠키는 `ai/tool/browser_cookie.txt`에 자동 저장/로드.  
**규칙**: Bash 툴만 사용 (PowerShell 금지)

> ⚠️ **첫 번째 인자(BASE_URL)는 이 파일 위쪽 "접속 정보" 섹션의 `주소`+`포트`+`기본경로` 값을 직접 읽어서 조합한다. Main.json을 열거나 포트를 임의로 추측하지 말 것.**

```bash
node ai/tool/browser.js $BASE_URL login                                   # 인증 (최초 1회) → "ok" 출력
node ai/tool/browser.js $BASE_URL push <url> [ttl=600] [logSize=100] [width=1280] [height=720] # 세션 생성 → sessionId 문자열 출력
node ai/tool/browser.js $BASE_URL reset <sid> [ttl] [logSize] [width] [height]    # 세션 재설정(페이지 새로 로드)
node ai/tool/browser.js $BASE_URL exec <sid> <fn> [args_json]             # Playwright Page API 호출 → result 출력
node ai/tool/browser.js $BASE_URL screenshot <sid> [options_json]        # 스크린샷 → screenshot.png 저장
node ai/tool/browser.js $BASE_URL input <sid> <key|mouseButton> <time_ms> <focus> [x y [x2 y2]] # 입력 실행
node ai/tool/browser.js $BASE_URL eval <sid> <js_expression>              # JS 표현식 직접 실행 → result 출력
node ai/tool/browser.js $BASE_URL eval_stdin <sid>                        # stdin으로 JS 표현식 전달 (긴 코드/이스케이핑 문제 회피)
node ai/tool/browser.js $BASE_URL eval_base64 <sid> <base64_js_expression> # base64로 인코딩된 JS 표현식 실행
node ai/tool/browser.js $BASE_URL logs <sid> [fromOffset=0]               # 콘솔 로그 조회 → logs, nextOffset 출력
node ai/tool/browser.js $BASE_URL list                                     # 세션 목록
node ai/tool/browser.js $BASE_URL remove <sid>                             # 세션 제거 (TTL 만료 시 자동 제거)
```

- `push`: width/height로 Playwright viewport size를 지정한다. 0 이하, 미입력, 알 수 없는 값은 서버 기본값 1280x720을 사용한다.
- `reset`: 기존 세션을 재사용하면서 ttl/logSize/width/height를 다시 지정해 페이지를 새로 로드한다.
- `fn`: Playwright Page API 메서드, dot-notation 지원 (`mouse.click`, `keyboard.type` 등). `fn`이 `screenshot`이면 결과를 자동으로 `screenshot.png`에 저장한다.
  - `exec`는 Playwright(`playwright`)의 `Page` API를 그대로 가져와 쓴 것이라, 복잡한 동작은 Playwright 공식 문서나 `node_modules/playwright-core/types/types.d.ts`의 `Page`/`Mouse`/`Keyboard` 정의를 참고해서 메서드/인자를 확인한다.
  - `args_json`은 그 메서드의 인자에 **위치 순서대로** 대응하는 배열이다.
    - 예: `mouse.click(x, y, options?)` → `exec <sid> mouse.click [400, 300]`
    - 예: `keyboard.press(key)` → `exec <sid> keyboard.press '["Enter"]'`
- `args_json`: JSON 배열 문자열 (기본 `[]`)
- `input`: 키보드/마우스 입력을 한 요청 안에서 실행한다. 좌표가 없으면 키보드, `x y`가 있으면 마우스 press, `x y x2 y2`가 있으면 드래그로 처리한다. 마우스 버튼은 `mouseLeft|mouseRight|mouseMiddle`, `focus`는 `canvas|page|none`.
  - 키 유지: `node ai/tool/browser.js $BASE_URL input <sid> w 1000 canvas`
  - 마우스 클릭/프레스: `node ai/tool/browser.js $BASE_URL input <sid> mouseLeft 80 canvas 400 300`
  - 마우스 드래그: `node ai/tool/browser.js $BASE_URL input <sid> mouseLeft 800 canvas 400 300 520 300`
- `eval` / `eval_stdin` / `eval_base64`: DOM 조회·JS 변수 읽기 등 브라우저 메모리 접근 시 사용. 따옴표·줄바꿈 이스케이핑 문제가 있으면 `eval_stdin`(stdin 입력) 또는 `eval_base64`(base64 인코딩)를 사용한다. `exec evaluate`는 args_json 따옴표 이스케이핑 문제로 사용 금지.
- `logs` 응답: `{ logs: [{"type":"log"|"error"|"network","text":"...","ts":0,"offset":N}], nextOffset: N }`
  - 로그는 조회해도 삭제되지 않음. `logSize` 초과 시 오래된 것부터 자동 삭제
  - `fromOffset` 미입력 시 전체 조회. 이전 `nextOffset`을 넘기면 새 로그만 조회 가능

**흐름 예시** (페이지 콘솔 확인):
```
# BASE_URL = "접속 정보" 섹션의 주소+포트+기본경로 (이 파일에서 직접 읽을 것, Main.json 금지)
BASE_URL=<접속정보.주소>:<접속정보.포트>/<접속정보.기본경로>
node ai/tool/browser.js $BASE_URL login
→ ok

node ai/tool/browser.js $BASE_URL push $BASE_URL/proj/Home/Home.html 600 100 1280 720
→ 3he4wj8iy6vmqf86ham   (이 값이 sessionId)

node ai/tool/browser.js $BASE_URL exec 3he4wj8iy6vmqf86ham title
node ai/tool/browser.js $BASE_URL logs 3he4wj8iy6vmqf86ham
```

## 원격 데스크탑 제어 (Remote Desktop Control - curl HTTP API)

> 원격 PC의 실제 마우스/키보드/화면을 직접 제어한다. 브라우저 페이지가 아니라 **OS 전체**가 대상이다.

### 사용 제한 (Usage Restrictions)
- `ai/tool/remotedesktop.js`는 원격 PC의 실제 입력 장치·화면을 건드린다. 꼭 필요할 때만, 그리고 영향 범위를 인지한 상태에서 쓴다.
- 용도: 원격 화면 캡처, 원격 마우스/키보드 입력, nut-js(`mouse`/`keyboard`/`screen`) API 직접 호출.
- 웹페이지 내부 DOM/콘솔만 다룰 때는 이 도구 대신 `ai/tool/browser.js`를 쓴다.

`ai/tool/remotedesktop.js`를 사용한다. 비밀번호는 스크립트가 자동으로 읽는다. 쿠키는 `ai/tool/remotedesktop_cookie.txt`에 자동 저장/로드.
**규칙**: Bash 툴만 사용 (PowerShell 금지)

> ⚠️ **첫 번째 인자(BASE_URL)는 이 파일 위쪽 "접속 정보" 섹션의 `주소`+`포트`+`기본경로` 값을 직접 읽어서 조합한다. Main.json을 열거나 포트를 임의로 추측하지 말 것.**

```bash
node ai/tool/remotedesktop.js $BASE_URL login                                              # 인증 (최초 1회) → "ok" 출력
node ai/tool/remotedesktop.js $BASE_URL exec <fn> [args_json]                              # nut-js API 호출(RemoteDesktop/exec) → result 출력
node ai/tool/remotedesktop.js $BASE_URL screenshot [quality=75]                            # 화면 캡처 → screenshot.png 저장
node ai/tool/remotedesktop.js $BASE_URL input <key|mouseButton> <time_ms> <windowTitle|-> [x y [x2 y2]] # 입력 실행
```

- `fn`: nut-js `mouse`/`keyboard`/`screen` 객체의 메서드, dot-notation 지원 (`mouse.setPosition`, `keyboard.type` 등). 패스스루 호출이라 nut-js 시그니처 그대로 적용된다.
  - `exec`는 nut-js(`@nut-tree-fork/nut-js`)를 그대로 가져와 쓴 것이라, `mouse.move`/`drag`/`scrollDown` 등 복잡한 동작은 nut-js 공식 문서나 `node_modules/@nut-tree-fork/nut-js/dist/lib/{mouse,keyboard,screen}.class.d.ts` 타입 정의를 참고해서 메서드/인자를 확인한다.
  - `args_json`은 그 메서드의 인자에 **위치 순서대로** 대응하는 배열이다. nut-js의 `Point`는 `{"x":N,"y":N}`, `Button`은 숫자(`LEFT=0`/`MIDDLE=1`/`RIGHT=2`)로 표현한다.
    - 예: `mouse.setPosition(target: Point)` → `exec mouse.setPosition '[{"x":100,"y":100}]'`
    - 예: `mouse.click(btn: Button)` → `exec mouse.click [2]` (우클릭)
- `args_json`: JSON 배열 문자열 (기본 `[]`)
- `screenshot`: `quality`(1~100, 기본 75)로 JPEG 압축률 지정.
- `input`: 키/마우스를 시간 기반(hold/drag)으로 실행한다. 좌표가 없으면 키보드, `x y`가 있으면 마우스 press, `x y x2 y2`가 있으면 드래그로 처리한다. 마우스 버튼은 `left|right|middle`. `windowTitle`을 지정하면(`-`는 미지정) 해당 창을 포그라운드로 올린 뒤 입력한다.
  - 키 유지: `node ai/tool/remotedesktop.js $BASE_URL input w 1000 -`
  - 마우스 클릭/프레스: `node ai/tool/remotedesktop.js $BASE_URL input left 80 - 400 300`
  - 마우스 드래그: `node ai/tool/remotedesktop.js $BASE_URL input left 800 - 400 300 520 300`

**흐름 예시**:
```
BASE_URL=<접속정보.주소>:<접속정보.포트>/<접속정보.기본경로>
node ai/tool/remotedesktop.js $BASE_URL login
→ ok

node ai/tool/remotedesktop.js $BASE_URL screenshot
→ Screenshot saved to screenshot.png

node ai/tool/remotedesktop.js $BASE_URL exec mouse.setPosition '[{"x":400,"y":300}]'
```


## 파일 변경 전 설명 규칙 (File Modification Explanation Rules)

- 파일을 수정, 생성, 삭제하기 전에는 대상 파일과 수행할 작업 내용을 먼저 설명한다.

## 보호 경로 변경 승인 규칙(Protected Project Areas)

다음 경로의 파일을 수정, 생성, 삭제, 이동, 이름 변경하기 전에는 반드시 사용자 승인을 받아야 한다.

* 현재 작업 폴더 밖의 모든 상위 경로
* `artgine/`
* `desktop/`
* `ai/`
* `plugin/`

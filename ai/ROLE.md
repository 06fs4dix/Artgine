# Artgine Script - 프로젝트 가이드

## OS예외상황

## 메모리 저장 규칙
- 메모리 정보 저장 전 사용자 승인 필수.

## 빌드 방식
- **`.ts` 파일만 수정**. 빌드 시 `.js` 자동 생성됨(몇초 지연 존재).

## TS 타입 체크 규칙 (필수)
`.ts` 수정 후 완료 보고 전 반드시 실행한다.
```bash
node ai/tsc_check.js 수정한파일.ts
```

## 제한 명령어
다음 명령어는 사용자가 명시적으로 요청하거나 승인하지 않는 한 실행하지 않는다.

- node 임의 실행. `ai/tsc_check.js`, `ai/web_debug.js`는 제외
- python / python3 실행

## 접속 정보
포트/경로는 `Main.json`의 `url` 필드 기준. 우선순위: 워킹 폴더 `Main.json` → `desktop/Main.json`.
- **주소**: `http://localhost`
- **포트**: `8050`
- **기본 경로**: `/Artgine`
- **외부 주소** (공인 IP/DNS, 외부 접속 시): _(미설정)_
- 경로 구조: `<주소>:<포트>/<기본경로>/<폴더경로>/<파일명>.html`
- 예시: `http://localhost:8050/Artgine/proj/2D/Village/Village.html`

## 새 프로젝트 생성
**`ai/ProjectSetup.md`** 먼저 읽기 필수.


## Project Rules
** ai/CodeNamingGuide.md ** 먼저 읽기 필수. 

## Serena MCP 사용 규칙

- 심볼 위치 찾기, 참조 추적, 구현 탐색  **Serena** 
- 심볼 위치 찾기를 제외한건 **네이티브** 기능을 사용한다 



### ⚠️ 엔진 API 사용 전 반드시 검증
코드 작성 전, 엔진 클래스(`artgine/`)의 메서드/프로퍼티를 사용할 때는 **존재 여부를 `find_symbol`로 먼저 확인**한다.
- 일반적인 언어 패턴(`.clone()`, `.copy()`, `.length` 등)을 **가정하고 쓰지 말 것**.
- 과거 사례: `CVec3.Clone()` 존재 가정 → 런타임 에러. 실제 복사 방법은 `.Export()` (CObject에서 상속).

## UI 시스템 선택 기준
**`ai/UIGuide.md`** 참고





## 경로 기준
- 모든 상대 경로는 `artgine/`, `desktop/`, `proj/`, `plugin/`, `ai/`가 함께 있는 프로젝트 루트 기준으로 해석한다.



## 폴더 구조
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

## AI 웹브라우저 디버깅 (curl HTTP API)

> 라이브 페이지 콘솔 로그·JS 실행·DOM 조회용. 코드 파일 수정엔 쓰지 않는다.

`ai/web_debug.js`를 사용한다. 비밀번호는 스크립트가 자동으로 읽는다. 쿠키는 `ai/cookie.txt`에 자동 저장/로드.  
**규칙**: Bash 툴만 사용 (PowerShell 금지)

> ⚠️ **첫 번째 인자(BASE_URL)는 이 파일 위쪽 "접속 정보" 섹션의 `주소`+`포트`+`기본경로` 값을 직접 읽어서 조합한다. Main.json을 열거나 포트를 임의로 추측하지 말 것.**

```bash
node ai/web_debug.js $BASE_URL login                                   # 인증 (최초 1회) → "ok" 출력
node ai/web_debug.js $BASE_URL push <url> [ttl=60] [logSize=100]       # 세션 생성 → sessionId 문자열 출력
node ai/web_debug.js $BASE_URL exec <sid> <fn> [args_json]             # 명령 실행 → result 출력
node ai/web_debug.js $BASE_URL logs <sid> [fromOffset=0]               # 콘솔 로그 조회 → logs, nextOffset 출력
node ai/web_debug.js $BASE_URL list                                     # 세션 목록
node ai/web_debug.js $BASE_URL remove <sid>                             # 세션 제거 (TTL 만료 시 자동 제거)
```

- `fn`: Playwright Page API 메서드, dot-notation 지원 (`mouse.click`, `keyboard.type` 등)
- `args_json`: JSON 배열 문자열 (기본 `[]`)
- `logs` 응답: `{ logs: [{"type":"log"|"error"|"network","text":"...","ts":0,"offset":N}], nextOffset: N }`
  - 로그는 조회해도 삭제되지 않음. `logSize` 초과 시 오래된 것부터 자동 삭제
  - `fromOffset` 미입력 시 전체 조회. 이전 `nextOffset`을 넘기면 새 로그만 조회 가능

**흐름 예시** (페이지 콘솔 확인):
```
# BASE_URL = "접속 정보" 섹션의 주소+포트+기본경로 (이 파일에서 직접 읽을 것, Main.json 금지)
BASE_URL=<접속정보.주소>:<접속정보.포트>/<접속정보.기본경로>
node ai/web_debug.js $BASE_URL login
→ ok

node ai/web_debug.js $BASE_URL push $BASE_URL/proj/Home/Home.html 60 100
→ 3he4wj8iy6vmqf86ham   (이 값이 sessionId)

node ai/web_debug.js $BASE_URL exec 3he4wj8iy6vmqf86ham title
node ai/web_debug.js $BASE_URL logs 3he4wj8iy6vmqf86ham
```

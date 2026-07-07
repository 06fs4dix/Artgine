# Artgine Script - 프로젝트 가이드 (Project Guide)

## 작업 디렉토리 (Working Directory)
- ./

## 아티젠 디렉토리 (Artgine Directory)
- ./

## 메모리 저장 규칙 (Memory Storage Rules)
- 메모리 정보 저장 전 사용자 승인 필수.

## 빌드 방식 (Build Methods)
- **`.ts` 파일만 수정**. 빌드 시 `.js` 자동 생성됨(몇초 지연 존재).

## TS 타입 체크 규칙 - 필수 (TS Type Check Rules - Required)
`.ts` 수정 후 완료 보고 전 반드시 실행한다.
```bash
node ai/tool/tsc_check.js 파일A.ts 파일B.ts 파일C.ts
```

## 제한 명령어 (Restricted Commands)
다음 명령어는 사용자가 명시적으로 요청하거나 승인하지 않는 한 실행하지 않는다.

- node 임의 실행. `ai/tool/tsc_check.js`, `ai/tool/browser.js`는 제외
- python / python3 실행
- 라이브 페이지 디버깅 목적의 curl 직접 호출 (대신 `ai/tool/browser.js` 사용)

## 접속 정보 (Connection Information)
포트/경로는 `settings.json`의 `url` 필드 기준. 우선순위: 워킹 폴더 `settings.json` → `desktop/settings.json`.
- **주소**: `http://localhost`
- **포트**: `8050`
- **기본 경로**: `/Artgine`
- **외부 주소** (공인 IP/DNS, 외부 접속 시): _(미설정)_
- 경로 구조: `<주소>:<포트>/<기본경로>/<폴더경로>/<파일명>.html`
- 예시: `http://localhost:8050/Artgine/proj/2D/Village/Village.html`

## 새 프로젝트 생성 (Create New Project)
**`ai/ProjectSetupGuide.md`** 먼저 읽기 필수.

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
- 프로젝트 루트는 위 "아티젠 디렉토리" 절대경로다.
- `artgine/`, `desktop/`, `proj/`, `plugin/`, `ai/` 등 모든 상대 경로는 이 루트 기준으로 해석한다.

## 폴더 구조 (Folder Structure)
```
(아티젠 디렉토리)/
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

## 웹브라우저 디버깅 (Web Browser Debugging)
라이브 페이지 콘솔 로그·JS 실행·DOM 조회 작업 전 **`ai/BrowserDebugGuide.md`** 먼저 읽기 필수.

## 원격 데스크탑 제어 (Remote Desktop Control)
원격 PC의 마우스/키보드/화면을 직접 제어하는 작업 전 **`ai/RemoteDesktopGuide.md`** 먼저 읽기 필수.

## 파일 변경 전 설명 규칙 (File Modification Explanation Rules)

- 파일을 수정, 생성, 삭제하기 전에는 대상 파일과 수행할 작업 내용을 먼저 설명한다.

## 보호 경로 변경 승인 규칙(Protected Project Areas)

다음 경로의 파일을 수정, 생성, 삭제, 이동, 이름 변경하기 전에는 반드시 사용자 승인을 받아야 한다.


* `artgine/`
* `desktop/`
* `plugin/`

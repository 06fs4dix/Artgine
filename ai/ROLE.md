# Artgine Script - 프로젝트 가이드 (Project Guide)

## 작업 디렉토리 (Working Directory)
- ./

## 아티젠 디렉토리 (Artgine Directory)
- ./

### ⚠️ 두 디렉토리가 다를 수 있음 (필독)
값이 다를 수 있다 (예: 작업 디렉토리가 Artgine과 무관한 별도 리포인 경우). `ai/tool/`의 모든 도구(`tsc_check.js`/`c_cpp_check.js`/`asc_check.js`/`browser.js`/`work.js` 등)는 **작업 디렉토리가 아니라 항상 "아티젠 디렉토리" 절대경로에만 있는 공용 도구**이며, 어떤 프로젝트 파일을 검사하든 동일하게 사용한다.
**자주 하는 실수**: 작업 디렉토리에 `ai/`가 없다고 "이 프로젝트엔 빌드 체크 도구가 없다"고 단정하지 말 것 — 아티젠 디렉토리 쪽을 확인한다. 아래 빌드 체크 명령은 항상 아티젠 디렉토리로 `cd`한 뒤 대상 파일을 절대경로로 지정해 실행한다(cwd = 아티젠 디렉토리라고 가정 금지).

## 메모리 저장 규칙 (Memory Storage Rules)
- 메모리 정보 저장 전 사용자 승인 필수.

## 빌드 방식 (Build Methods)
- **`.ts` 파일만 수정**. 빌드 시 `.js` 자동 생성됨(몇초 지연 존재).

## TS 타입 체크 규칙 - 필수 (TS Type Check Rules - Required)
`.ts` 수정 후 완료 보고 전 반드시 실행한다.
```bash
cd "<아티젠 디렉토리 절대경로>" && node ai/tool/tsc_check.js <파일A> <파일B>
```

## C/C++ 빌드 체크 규칙 - 필수 (C/C++ Build Check Rules - Required)
`.c`/`.cpp` 수정 후 완료 보고 전 반드시 실행한다.
```bash
cd "<아티젠 디렉토리 절대경로>" && node ai/tool/c_cpp_check.js [web|window|linux|mac] <파일A> <파일B>
```
- **`.vcproj`/`.vcxproj` 프로젝트에 속한 파일은 `--proj`로 지정해서 체크한다** (include 경로/매크로 반영, window 타깃 전용). `--proj`도 절대경로로 지정.
```bash
cd "<아티젠 디렉토리 절대경로>" && node ai/tool/c_cpp_check.js window --proj=<프로젝트>.vcproj|.vcxproj [--config=<Configuration명>] <파일A> <파일B>
```
  - `--config` 생략 시 `Release|Win32` → `Debug|Win32` → 첫 Configuration 순 자동 선택
  - vcproj/vcxproj 버전에 맞는 VS 툴체인을 자동 매칭(VS2002~2022). 해당 버전 미설치 시 에러로 안내.
- **소스 파일 인코딩 확인 필수**: 에디터가 UTF-8로 저장하면 원본 인코딩(EUC-KR/CP949, BOM 유무 등)과 달라져 한글 주석/문자열이 깨질 수 있다. 수정 전후로 인코딩이 원본과 동일하게 유지되는지 확인한다.

## AssemblyScript(asc) 빌드 체크 규칙 - 필수 (AssemblyScript Build Check Rules - Required)
`.ts` 수정 후 완료 보고 전 반드시 실행한다.
```bash
cd "<아티젠 디렉토리 절대경로>" && node ai/tool/asc_check.js <파일A> <파일B>
```
- 실제 빌드 엔트리(`ASM.ts`, `ASM_SIMD.ts`) 기준으로 `--noEmit` 전체 재컴파일 후, 지정한 파일 관련 진단만 필터링해서 보여준다.


## 제한 명령어 (Restricted Commands)
다음 명령어는 사용자가 명시적으로 요청하거나 승인하지 않는 한 실행하지 않는다.

- node 임의 실행. `ai/tool/tsc_check.js`, `ai/tool/browser.js`, `ai/tool/c_cpp_check.js`, `ai/tool/asc_check.js`, `ai/tool/work.js`, `ai/tool/log.js`는 제외
- python / python3 실행
- 라이브 페이지 디버깅 목적의 curl 직접 호출 (대신 `ai/tool/browser.js` 사용)
- 서버 재시작 명령(`POST /File/Restart`, Control 프로젝트의 "Restart Server" 버튼) — 실행 시 현재 서버 프로세스가 즉시 종료되므로 **사용자 승인 없이 절대 실행 금지**
- **`browser.js`는 느리고 노이즈가 많다. 정적 분석(파일 읽기, grep 등)으로 충분하면 쓰지 마라.**

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

## 원격 작업 (Remote Work, Command Execution & Remote Desktop Control)
원격 서버 콘솔 명령/파일 업로드·다운로드/재시작 및 원격 PC 마우스·키보드·화면 제어 전 **`ai/RemoteGuide.md`** 먼저 읽기 필수. 서버 재시작도 이 문서 참고.

## 메모 가이드 (Memo Guide)
메모 저장/검색 관련 작업 전 **`ai/MemoGuide.md`** 먼저 읽기 필수.

## 워크 가이드 (Work Guide)
`ai/tool/work.js`로 서브 에이전트·스케줄러·워크오더를 다룰 때 **`ai/WorkGuide.md`** 먼저 읽기 필수.

## 메신저 가이드 (Messenger Guide)
`ai/tool/messenger.js`로 메신저 세션 조회/대화/발송/터미널 연결을 다룰 때 **`ai/MessengerGuide.md`** 먼저 읽기 필수.

## 로그 가이드 (Log Guide)
`ai/tool/log.js`로 CLI 세션 대화 로그(provider_log)를 조회할 때 **`ai/LogGuide.md`** 먼저 읽기 필수.

## 프로젝트 명명 규칙 (Project Naming Convention)
** ai/CodeNamingGuide.md ** 먼저 읽기 필수. 


## 아티젠 엔진 사용 가이드 (Artgine Engine Usage Guide)
수학/변환/충돌/렌더링/리소스 로딩/UI 등 로직 구현 전, **`ai/EngineUsageGuide.md`**에서 작업 패턴에 맞는 탐색 위치/키워드를 확인하고 먼저 코드를 검색해본다. 동일 기능이 있으면 직접 구현 금지.
- **팝업/메뉴/대화상자는 직접 HTML을 삽입하지 말고 `CModal`로 구현** (z-index 자동 관리).

### ⚠️ 엔진 API 사용 전 반드시 검증 (Engine API Verification Before Usage)
코드 작성 전, 엔진 클래스(`artgine/`)의 메서드/프로퍼티를 사용할 때는 **존재 여부를 검색(Grep 등)으로 먼저 확인**한다.
- 일반적인 언어 패턴(`.clone()`, `.copy()`, `.length` 등)을 **가정하고 쓰지 말 것**.
- 과거 사례: `CVec3.Clone()` 존재 가정 → 런타임 에러. 실제 복사 방법은 `.Export()` (CObject에서 상속).




## 경로 기준 (Path Standards)
- 프로젝트 루트는 "아티젠 디렉토리" 절대경로다. `artgine/`, `desktop/`, `proj/`, `plugin/`, `ai/` 등 모든 상대 경로는 이 루트 기준으로 해석하며, `ai/tool/` 툴 실행 시 cwd 처리는 위 "⚠️ 두 디렉토리가 다를 수 있음" 항목을 따른다. 하위 프로젝트 폴더 등 다른 위치에서 상대경로를 찾지 않는다.

## 임시 파일 위치 (Temp File Location)
- 작업 중 만드는 임시 파일(임시 스크립트, 분석 출력/로그, 스크린샷, 이미지 크롭, 다운로드, 결과 HTML 등)은 **반드시 `<아티젠 디렉토리 절대경로>/temp/`에만** 만든다. 프로젝트 루트·`proj/`·`ai/` 등 다른 위치에 만들지 않는다.
- `temp/`는 아티젠 서버 실행 시 자동 생성된다. 없으면 직접 만들어도 된다.
- `temp/` 안의 파일 읽기·쓰기는 승인 없이 처리된다. 경로는 절대경로로 지정한다(`..`로 temp 밖을 가리키면 자동 승인되지 않는다).
- `browser.js`/`remote.js`의 `screenshot`·`download`는 기본으로 `temp/`에 저장하고, `screenshot`의 `diff` 기준 이미지도 `temp/`에서 찾는다.

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
├── ai/        ← AI 가이드 및 설정 문서
└── temp/      ← AI 임시 파일 전용 (서버 실행 시 자동 생성)
```

## 웹브라우저 디버깅 (Web Browser Debugging)
라이브 페이지 콘솔 로그·JS 실행·DOM 조회 작업 전 **`ai/BrowserDebugGuide.md`** 먼저 읽기 필수.

## 파일 변경 전 설명 규칙 (File Modification Explanation Rules)

- 파일을 수정, 생성, 삭제하기 전에는 대상 파일과 수행할 작업 내용을 먼저 설명한다.

## 코드 주석 규칙 (Code Comment Rules)

개발 의도나 코드 분석만으로는 파악하기 어려운 특수한 경우(숨겨진 제약, 비직관적인 불변조건, 특정 버그에 대한 우회처리 등)를 제외하고 절대 주석을 달지 않는다.

## 보호 경로 변경 승인 규칙(Protected Project Areas)

다음 경로의 파일을 수정, 생성, 삭제, 이동, 이름 변경하기 전에는 반드시 사용자 승인을 받아야 한다.


* `artgine/`
* `desktop/`
* `plugin/`

# Artgine Script - 프로젝트 가이드

## OS예외상황

### Windows
- Windows 환경에서는 PowerShell을 사용하지 않는다.

## 메모리 저장 규칙
- 메모리 정보 저장 전 사용자 승인 필수.

## 빌드 방식
- **`.ts` 파일만 수정**. 빌드 시 `.js` 자동 생성됨(몇초 지연 존재).

## TS 타입 체크 규칙 (필수)
`.ts` 수정 후 완료 보고 전 반드시 실행한다.
```bash
node ai/tsc_check.js 수정한파일.ts
```

## 접속 정보
- **로컬 주소**: `http://localhost:8050/Artgine`
- **경로 구조**: `http://localhost:8050/Artgine/<폴더경로>/<파일명>.html` 
- **예시 (Village)**: `http://localhost:8050/Artgine/proj/2D/Village/Village.html`

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


## AI 행동 원칙

### 1. 코딩 전 사고 (Think Before Coding)
- 불확실하면 가정하지 말고 먼저 질문
- 모호함이 있을 때 해석을 선택하지 말고 복수 해석 제시
- 더 단순한 방법이 있으면 먼저 말하기
- 혼란스러우면 멈추고 명확화 요청

### 2. 단순함 우선 (Simplicity First)
- 요청한 것만 구현. 추측성 기능 추가 금지
- 단일 사용 코드에 추상화 레이어 금지
- 요청하지 않은 유연성/설정 가능성 추가 금지
- 200줄이 50줄로 될 수 있으면 다시 작성

### 3. 외과적 수정 (Surgical Changes)
- 요청된 코드만 수정. 인접 코드/주석/포맷 건드리지 말 것
- 관련 없는 dead code 발견 시 → 삭제 말고 언급만
- 내 수정으로 생긴 미사용 import/변수/함수는 제거
- 변경된 모든 줄은 사용자 요청으로 직접 추적 가능해야 함

### 4. 목표 기반 실행 (Goal-Driven Execution)
- 작업 전 성공 기준 정의
- 멀티스텝 작업은 계획 먼저 제시: `[단계] → 검증: [확인방법]`
- "동작하게 만들기" 같은 약한 기준 대신 검증 가능한 조건으로 변환

### 5. 중복 구현 금지 (No Duplicate Implementation)
- 절대 같은 기능을 두 번 구현하지 않는다
- 수정/추가 전에 기존에 관련 기능, 함수, 설정, 흐름이 있는지 먼저 확인한다
- 기존 기능으로 해결 가능하면 새로 만들지 말고 기존 코드를 재사용하거나 최소 수정한다
- 비슷한 기능이 이미 있으면 차이점을 먼저 설명하고, 통합/수정/재사용 중 가장 단순한 방법을 제안한다
- 중복 구현이 필요해 보이면 바로 구현하지 말고 이유를 설명하고 확인을 받는다

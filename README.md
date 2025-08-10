<details>
  <summary><b>English</b></summary>
  
  ## Directory Structure
  ```
  ├── README.md
  ├── LICENSE.txt
  ├── NOTICE.txt
  ├── package.json
  ├── start.bat
  ├── start.sh
  ├── tsconfig.json
  ├── App/
  ├── artgine/
  ├── db/
  ├── plugin/
  └── proj/
  ```
  
  ### start.bat/start.sh Execution Method

  1. **Download Source**
     - Download the file from the repository (ex:Artgine-main.zip)

  2. **Run System-Specific Startup File**
     - **Windows**: Run `start.bat` (Windows batch file)
     - **Linux/macOS**: Run `start.sh` (Unix shell script)

  3. **Install Required Dependencies** (Follow the console instructions to complete the installation)
     - Install Node.js (version 14 or higher)
     - Install Node modules: `npm install`


  4. **Select and Run Project**
     - Navigate to the `proj/` folder
     - Choose your desired project folder
     - Run the project

  ### VS Code Development Setup

  1. **Open Source Folder in VS Code**
     - Open VS Code
     - Select the source folder (e.g., Artgine-main)

  2. **Start TypeScript Compilation**
     - Open terminal in VS Code: `Ctrl+Shift+` (Windows/Linux) or `Cmd+Shift+` (macOS)
     - Run: `npx tsc -w` (watches for file changes and compiles automatically)

  3. **Start Development Server**
     - Open a new terminal in VS Code
     - Run: `npm start`

  ---

  ### Project Examples
  The `proj/` folder contains various example projects demonstrating different features of the Artgine engine:
  
  - **Home** - Main application with server integration and database tools
  - **Tutorial** - Learning examples covering various engine features:
    - **Wind** - Wind simulation effects
    - **3DSample** - 3D rendering examples
    - **Particle** - Particle system demonstrations
    - **Collusion** - Collision detection examples
    - **Animation** - Animation system tutorials
    - **Renderer** - Custom renderer implementations
    - **Plugin** - Plugin system examples
    - **Light** - Lighting and shadow tutorials
    - **Voxel** - Voxel-based rendering
    - **IKSample** - Inverse kinematics examples
    - **ShaderEditer** - Shader editing tools
  - **2D** - 2D game examples:
    - **Maze** - Maze generation and pathfinding with coroutine usage
    - **Village** - Village simulation with LTree, MTree, Flower objects
    - **Shooting** - 2D shooting game mechanics with room server synchronization and pooling system
    - **SideScroll** - Side-scrolling platformer with physics processing and animation control

  **Live Demo Links:**
  - **ArtgineTutorial**: [https://06fs4dix.github.io/Artgine/proj/Tutorial/Canvas/Canvas.html](https://06fs4dix.github.io/Artgine/proj/Tutorial/Canvas/Canvas.html)
  - **CollusionTest**: [https://06fs4dix.github.io/Artgine/proj/Tutorial/Collusion/Collusion.html](https://06fs4dix.github.io/Artgine/proj/Tutorial/Collusion/Collusion.html)
  - **MazeGame**: [https://06fs4dix.github.io/Artgine/proj/2D/Maze/Maze.html](https://06fs4dix.github.io/Artgine/proj/2D/Maze/Maze.html)

  ---

  ## Artgine Engine Core Classes

  ### CAtelier
  **Main application manager** that initializes the engine and manages canvases.
  
  **Key Features:**
  - Initializes rendering preferences and frame
  - Manages multiple canvases
  - Handles brush and camera setup
  - Provides global access point via `CAtelier.Main()`

  **Basic Usage:**
  ```typescript
  import { CAtelier } from "../../../artgine/canvas/CAtelier.js";
  
  const gAtl = new CAtelier();
  gAtl.mPF = preferences; // Set preferences
  await gAtl.Init(['Main.json']); // Initialize with canvas files
  ```

  ---

  ### CCanvas
  **Canvas container** that manages subjects, rendering, and game logic.
  
  **Key Features:**
  - Contains and manages subjects (game objects)
  - Handles rendering pipeline
  - Manages WebSocket connections
  - Supports pause/resume functionality
  
  **Basic Usage:**
  ```typescript
  // Create new canvas
  let Main = gAtl.NewCanvas("Main");
  Main.SetCameraKey(gAtl.Brush().GetCam2D().Key());
  
  // Get existing canvas
  const canvas = gAtl.Canvas('Main');
  ```

  ---

  ### CSubject
  **Base game object class** that represents entities in the world.
  
  **Key Features:**
  - Position, rotation, scale (PRS) transformation
  - Component-based architecture
  - Message routing system
  - Parent-child hierarchy support
  
  **Basic Usage:**
  ```typescript
  import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
  
  // Create and add subject to canvas
  let sub = Main.Push(new CSubject());
  
  // Set properties
  sub.SetPos(new CVec3(0, 0, 0));
  sub.SetRot(new CVec3(0, 0, 0));
  sub.SetSca(new CVec3(1, 1, 1));
  ```

  ---

  ### CPaint2D
  **2D rendering component** for sprites and 2D graphics.
  
  **Key Features:**
  - 2D sprite rendering with texture support
  - Y-sort depth management
  - Trail and billboard effects
  - Wind influence simulation
  
  **Basic Usage:**
  ```typescript
  import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
  import { CVec2 } from "../../../artgine/geometry/CVec2.js";
  
  // Create 2D paint component with texture and size
  let paint2D = new CPaint2D(gAtl.Frame().Pal().GetNoneTex(), new CVec2(100, 100));
  
  // Add component to subject
  sub.PushComp(paint2D);
  ```
  
  > **Note**: For other CPaint components (CPaint3D, CPaintText, etc.), check the [paint components directory](https://github.com/06fs4dix/Artgine/tree/main/artgine/canvas/component/paint) on GitHub.

  ---

  ---

  ### CBrush
  **Rendering and camera management system** that handles lighting, shadows, and wind effects.
  
  **Key Features:**
  - Camera management (2D/3D)

  
  **Basic Usage:**
  ```typescript
  // Access brush from atelier
  const brush = gAtl.Brush();
  
  // Get 2D camera
  const cam2D = brush.GetCam2D();
  Main.SetCameraKey(cam2D.Key());
  
  // Load brush configuration
  await brush.LoadJSON("Canvas/Brush.json");
  ```

  ---

  ### CPreferences
  **Engine configuration and rendering settings** that control the overall behavior.
  
  **Key Features:**
  - Renderer selection (GL, GPU, Null)
  - Window dimensions and positioning
  - Graphics quality settings
  - Development and debugging options
  - Server and GitHub integration settings
  
  **Basic Usage:**
  ```typescript
  import { CPreferences } from "../../../artgine/basic/CPreferences.js";
  
  const gPF = new CPreferences();
  gPF.mTargetWidth = 0;        // Auto-size
  gPF.mTargetHeight = 0;       // Auto-size
  gPF.mRenderer = "GL";        // OpenGL renderer
  gPF.m32fDepth = false;       // 16-bit depth buffer
  gPF.mAnti = true;            // Anti-aliasing
  gPF.mDeveloper = true;       // Developer mode
  gPF.mIAuto = true;           // Auto-update system
  gPF.mWASM = false;           // WebAssembly mode
  gPF.mServer = 'local';       // Server type
  gPF.mGitHub = false;         // GitHub mode
  
  // Apply to atelier
  gAtl.mPF = gPF;
  ```

  ---

  ### Complete Example
  ```typescript
  import { CAtelier } from "../../../artgine/canvas/CAtelier.js";
  import { CPreferences } from "../../../artgine/basic/CPreferences.js";
  import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
  import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
  import { CVec2 } from "../../../artgine/geometry/CVec2.js";
  
  // Setup preferences
  const gPF = new CPreferences();
  gPF.mRenderer = "GL";
  gPF.mDeveloper = true;
  gPF.mIAuto = true;
  
  // Initialize atelier
  let gAtl = new CAtelier();
  gAtl.mPF = gPF;
  await gAtl.Init(['Main.json']);
  
  // Create canvas and set camera
  let Main = gAtl.NewCanvas("Main");
  Main.SetCameraKey(gAtl.Brush().GetCam2D().Key());
  
  // Create subject and add 2D paint component
  let sub = Main.Push(new CSubject());
  sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex(), new CVec2(100, 100)));
  ```

</details>

<details>
  <summary><b>한국어</b></summary>
  
  ## 디렉토리 구조
  ```
  ├── README.md
  ├── LICENSE.txt
  ├── NOTICE.txt
  ├── package.json
  ├── start.bat
  ├── start.sh
  ├── tsconfig.json
  ├── App/
  ├── artgine/
  ├── db/
  ├── plugin/
  └── proj/
  ```
  
  ### start.bat/start.sh를 이용한 실행법

  1. **소스 다운로드**
     - 저장소에서 파일을 다운로드하세요(ex:Artgine-main.zip)

  2. **시스템에 맞는 시작 파일 실행**
     - **Windows**: `start.bat` 파일 실행 (Windows 배치 파일)
     - **Linux/macOS**: `start.sh` 파일 실행 (Unix 셸 스크립트)

  3. **필요한 파일 설치** (콘솔 안내에 맞게 실행하면 됩니다)
     - Node.js 설치 (버전 14 이상)
     - Node 모듈 설치: `npm install`


  4. **프로젝트 선택 및 실행**
     - `proj/` 폴더로 이동
     - 원하는 프로젝트 폴더 선택
     - 프로젝트 실행

  ### VS Code를 이용한 실행법

  1. **VS Code에서 소스 폴더 열기**
     - VS Code 실행
     - 소스 폴더 선택 (예: Artgine-main)

  2. **TypeScript 컴파일 시작**
     - VS Code에서 터미널 열기: `Ctrl+Shift+` (Windows/Linux) 또는 `Cmd+Shift+` (macOS)
     - 실행: `npx tsc -w` (파일 변경 감지 및 자동 컴파일)

  3. **개발 서버 시작**
     - VS Code에서 새 터미널 열기
     - 실행: `npm start`

  ---

  ### 프로젝트 예제
  `proj/` 폴더에는 Artgine 엔진의 다양한 기능을 보여주는 예제 프로젝트들이 포함되어 있습니다:
  
  - **Home** - 서버 통합 및 데이터베이스 도구가 포함된 메인 애플리케이션
  - **Tutorial** - 다양한 엔진 기능을 다루는 학습 예제:
    - **Wind** - 바람 시뮬레이션 효과
    - **3DSample** - 3D 렌더링 예제
    - **Particle** - 파티클 시스템 데모
    - **Collusion** - 충돌 감지 예제
    - **Animation** - 애니메이션 시스템 튜토리얼
    - **Renderer** - 커스텀 렌더러 구현
    - **Plugin** - 플러그인 시스템 예제
    - **Light** - 조명 및 그림자 튜토리얼
    - **Voxel** - 복셀 기반 렌더링
    - **IKSample** - 역운동학 예제
    - **ShaderEditer** - 셰이더 편집 도구
  - **2D** - 2D 게임 예제:
    - **Maze** - 미로 생성 및 경로찾기 (코루틴 사용법 포함)
    - **Village** - LTree, MTree, Flower 오브젝트가 포함된 마을 시뮬레이션
    - **Shooting** - 2D 슈팅 게임 메커니즘 (룸서버 동기화, 풀링 시스템)
    - **SideScroll** - 사이드 스크롤링 플랫폼 (물리처리, 애니메이션 컨트롤)

  **실행 가능한 데모 링크:**
  - **ArtgineTutorial**: [https://06fs4dix.github.io/Artgine/proj/Tutorial/Canvas/Canvas.html](https://06fs4dix.github.io/Artgine/proj/Tutorial/Canvas/Canvas.html)
  - **CollusionTest**: [https://06fs4dix.github.io/Artgine/proj/Tutorial/Collusion/Collusion.html](https://06fs4dix.github.io/Artgine/proj/Tutorial/Collusion/Collusion.html)
  - **MazeGame**: [https://06fs4dix.github.io/Artgine/proj/2D/Maze/Maze.html](https://06fs4dix.github.io/Artgine/proj/2D/Maze/Maze.html)

  ---

  ## Artgine 엔진 핵심 클래스

  ### CAtelier
  **메인 애플리케이션 매니저**로 엔진을 초기화하고 캔버스들을 관리합니다.
  
  **주요 기능:**
  - 렌더링 설정과 프레임 초기화
  - 여러 캔버스 관리
  - 브러시와 카메라 설정 처리
  - `CAtelier.Main()`으로 전역 접근점 제공
  
  **기본 사용법:**
  ```typescript
  import { CAtelier } from "../../../artgine/canvas/CAtelier.js";
  
  const gAtl = new CAtelier();
  gAtl.mPF = preferences; // 설정 적용
  await gAtl.Init(['Main.json']); // 캔버스 파일로 초기화
  ```

  ---

  ### CCanvas
  **캔버스 컨테이너**로 주체들, 렌더링, 게임 로직을 관리합니다.
  
  **주요 기능:**
  - 주체들(게임 오브젝트) 포함 및 관리
  - 렌더링 파이프라인 처리
  - WebSocket 연결 관리
  - 일시정지/재개 기능 지원
  
  **기본 사용법:**
  ```typescript
  // 새 캔버스 생성
  let Main = gAtl.NewCanvas("Main");
  Main.SetCameraKey(gAtl.Brush().GetCam2D().Key());
  
  // 기존 캔버스 가져오기
  const canvas = gAtl.Canvas('Main');
  ```

  ---

  ### CSubject
  **기본 게임 오브젝트 클래스**로 월드의 엔티티를 나타냅니다.
  
  **주요 기능:**
  - 위치, 회전, 크기(PRS) 변환
  - 컴포넌트 기반 아키텍처
  - 메시지 라우팅 시스템
  - 부모-자식 계층 구조 지원
  
  **기본 사용법:**
  ```typescript
  import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
  
  // 주체를 생성하고 캔버스에 추가
  let sub = Main.Push(new CSubject());
  
  // 속성 설정
  sub.SetPos(new CVec3(0, 0, 0));
  sub.SetRot(new CVec3(0, 0, 0));
  sub.SetSca(new CVec3(1, 1, 1));
  ```

  ---

  ### CPaint2D
  **2D 렌더링 컴포넌트**로 스프라이트와 2D 그래픽을 처리합니다.
  
  **주요 기능:**
  - 텍스처 지원 2D 스프라이트 렌더링
  - Y-sort 깊이 관리
  - 트레일과 빌보드 효과
  - 바람 영향 시뮬레이션
  
  **기본 사용법:**
  ```typescript
  import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
  import { CVec2 } from "../../../artgine/geometry/CVec2.js";
  
  // 텍스처와 크기로 2D 페인트 컴포넌트 생성
  let paint2D = new CPaint2D(gAtl.Frame().Pal().GetNoneTex(), new CVec2(100, 100));
  
  // 주체에 컴포넌트 추가
  sub.PushComp(paint2D);
  ```
  
  > **참고**: 다른 CPaint 컴포넌트들(CPaint3D, CPaintText 등)은 GitHub의 [paint components 디렉토리](https://github.com/06fs4dix/Artgine/tree/main/artgine/canvas/component/paint)에서 확인하세요.

  ---

  ---

  ### CBrush
  **렌더링과 카메라 관리 시스템**으로 조명, 그림자, 바람 효과를 처리합니다.
  
  **주요 기능:**
  - 카메라 관리 (2D/3D)

  **기본 사용법:**
  ```typescript
  // 아틀리에에서 브러시 접근
  const brush = gAtl.Brush();
  
  // 2D 카메라 가져오기
  const cam2D = brush.GetCam2D();
  Main.SetCameraKey(cam2D.Key());
  
  // 브러시 설정 로드
  await brush.LoadJSON("Canvas/Brush.json");
  ```

  ---

  ### CPreferences
  **엔진 설정과 렌더링 옵션**으로 전체 동작을 제어합니다.
  
  **주요 기능:**
  - 렌더러 선택 (GL, GPU, Null)
  - 윈도우 크기와 위치 설정
  - 그래픽 품질 설정
  - 개발 및 디버깅 옵션
  - 서버와 GitHub 통합 설정
  
  **기본 사용법:**
  ```typescript
  import { CPreferences } from "../../../artgine/basic/CPreferences.js";
  
  const gPF = new CPreferences();
  gPF.mTargetWidth = 0;        // 자동 크기
  gPF.mTargetHeight = 0;       // 자동 크기
  gPF.mRenderer = "GL";        // OpenGL 렌더러
  gPF.m32fDepth = false;       // 16비트 깊이 버퍼
  gPF.mAnti = true;            // 안티앨리어싱
  gPF.mDeveloper = true;       // 개발자 모드
  gPF.mIAuto = true;           // 자동 업데이트 시스템
  gPF.mWASM = false;           // WebAssembly 모드
  gPF.mServer = 'local';       // 서버 타입
  gPF.mGitHub = false;         // GitHub 모드
  
  // 아틀리에에 적용
  gAtl.mPF = gPF;
  ```

  ---

  ### 완전한 예제
  ```typescript
  import { CAtelier } from "../../../artgine/canvas/CAtelier.js";
  import { CPreferences } from "../../../artgine/basic/CPreferences.js";
  import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
  import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
  import { CVec2 } from "../../../artgine/geometry/CVec2.js";
  
  // 설정 구성
  const gPF = new CPreferences();
  gPF.mRenderer = "GL";
  gPF.mDeveloper = true;
  gPF.mIAuto = true;
  
  // 아틀리에 초기화
  let gAtl = new CAtelier();
  gAtl.mPF = gPF;
  await gAtl.Init(['Main.json']);
  
  // 캔버스 생성 및 카메라 설정
  let Main = gAtl.NewCanvas("Main");
  Main.SetCameraKey(gAtl.Brush().GetCam2D().Key());
  
  // 주체 생성 및 2D 페인트 컴포넌트 추가
  let sub = Main.Push(new CSubject());
  sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex(), new CVec2(100, 100)));
  ```

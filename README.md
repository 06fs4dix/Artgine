 **Live Demo Links:**

- **ArtgineTutorial**: [https://06fs4dix.github.io/Artgine/proj/Tutorial/Canvas/Canvas.html](https://06fs4dix.github.io/Artgine/proj/Tutorial/Canvas/Canvas.html)

  
 ## Tutorial
  - **CollusionTest**: [https://06fs4dix.github.io/Artgine/proj/Tutorial/Collusion/Collusion.html](https://06fs4dix.github.io/Artgine/proj/Tutorial/Collusion/Collusion.html)
  - **3DLight**: [https://06fs4dix.github.io/Artgine/proj/Tutorial/3DLight/3DLight.html](https://06fs4dix.github.io/Artgine/proj/Tutorial/3DLight/3DLight.html)
  - **Skybox**: [https://06fs4dix.github.io/Artgine/proj/Tutorial/Skybox/Skybox.html](https://06fs4dix.github.io/Artgine/proj/Tutorial/Skybox/Skybox.html)
  - **Wind**: [https://06fs4dix.github.io/Artgine/proj/Tutorial/Wind/Wind.html](https://06fs4dix.github.io/Artgine/proj/Tutorial/Wind/Wind.html)
  ## 3D
  - **BoxShow**: [https://06fs4dix.github.io/Artgine/proj/3D/BoxShow/BoxShow.html](https://06fs4dix.github.io/Artgine/proj/3D/BoxShow/BoxShow.html)
  - **Map**: [https://06fs4dix.github.io/Artgine/proj/3D/Map/Map.html](https://06fs4dix.github.io/Artgine/proj/3D/Map/Map.html)
  - **GeometryViewer**: [https://06fs4dix.github.io/Artgine/proj/3D/GeometryViewer/GeometryViewer.html](https://06fs4dix.github.io/Artgine/proj/3D/GeometryViewer/GeometryViewer.html)
  ## 2D
  - **Maze**: [https://06fs4dix.github.io/Artgine/proj/2D/Maze/Maze.html](https://06fs4dix.github.io/Artgine/proj/2D/Maze/Maze.html)
  - **Village**: [https://06fs4dix.github.io/Artgine/proj/2D/Village/Village.html](https://06fs4dix.github.io/Artgine/proj/2D/Village/Village.html)
  - **Shooting**: [https://06fs4dix.github.io/Artgine/proj/2D/Shooting/Shooting.html](https://06fs4dix.github.io/Artgine/proj/2D/Shooting/Shooting.html)

  ---

<details>
  <summary><b>English</b></summary>

  <details>
    <summary>📂 Directory Structure & Execution</summary>

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

  When running the `start.bat` file, a warning saying "Unknown Publisher" may appear.

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

  2. **Install Node modules**

     - Install Node.js (version 14 or higher)

     - Open terminal in VS Code: `Ctrl+Shift+` (Windows/Linux) or `Cmd+Shift+` (macOS)

     - Run: `npm install`

  4. **Start TypeScript Compilation**

     - Open terminal in VS Code: `Ctrl+Shift+` (Windows/Linux) or `Cmd+Shift+` (macOS)

     - Run: `npx tsc -w` (watches for file changes and compiles automatically)

  5. **Start Development Server**

     - Open a new terminal in VS Code

     - Run: `npm start`

  </details>
  <details>
    <summary>App</summary>

![Artgine App](https://06fs4dix.github.io/Artgine/help/Artgine.png)

  After running the program, you'll see a configuration interface with several tabs for setting up and launching your Artgine projects.

  ### Tab Descriptions

  - **App**: Application launch settings

  - **Preference**: Project configuration changes

  - **Include**: Project include file settings

  - **Manifest**: PWA configuration

  - **ServiceWorker**: Cache settings

  - **Plugin**: External library configuration for Artgine

  ### App Tab Configuration Options

  **Basic Settings:**

  - **url**: Web server address to run

    - Example: `http://localhost:8050/Artgine`

  - **projectPath**: Project to start

    - Example: `proj/Tutorial/ShaderEditer`

    - Use the "Folder" button to browse and select project directory

  - **width, height**: Starting dimensions

    - Example: `1024 x 768`

    - Note: Only maintained when running as .exe file

  **Program Mode:**

  - **program**: Program role

    - `developer`: Developer mode (prohibited for deployment)

      - Server and client applied simultaneously

    - `client`: Client mode

    - `server`: Web server mode

  **Server Configuration:**

  - **server**: Server operation

    - `local`: File-based local execution

    - `remote`: Use when connecting to external server

    - `webserver`: Web server operation (allows external access)

  **Display Options:**

  - **fullScreen**: Full screen mode

  - **github**: Run using GitHub library

    - Chrome local executable file (.bat) generated in project

  **Action Buttons:**

  - **Run**: Launch application

  - **VSCode**: Open in Visual Studio Code

  **Development Commands:**

  - **npm install**: Install Node.js dependencies

  - **npx tsc -w**: TypeScript compiler in watch mode

  </details>
  <details>
    <summary>Project Examples & Usage</summary>

  ### Project Examples

  The `proj/` folder contains various example projects demonstrating different features of the Artgine engine:

  - **Home** - Main application with server integration and database tools
  - **Tutorial** - Learning examples covering various engine features:
  - **2D** - 2D examples:
  - **3D** - 3D examples:


    ---

    ## ⚠️ Notice

    This project runs as an **Electron app**.  
    The following files are **automatically generated and managed based on the project folder name**, so **please be cautious when making changes**:

    - HTML files  
    - TypeScript files  
    - JSON files  
    - Web Manifest files  

    ---

    ## 📝 Editable Scope

    - You may only modify the code **after the EntryPoint**.  
    - Do **not** modify the automatically generated code.  

    > 💡 **Tip**: When working manually, you are free to make changes as needed.

   </details>
  <details>
    <summary>Class Description</summary>

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
</details>

<details>
  <summary><b>한국어</b></summary>

  <details>
    <summary>📂 디렉토리 구조 & 실행법</summary>

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

  `start.bat` 파일 실행 시, "알 수 없는 게시자" 경고가 표시될 수 있습니다.

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

  2. **Node 모듈 설치**

     - VS Code에서 터미널 열기: `Ctrl+Shift+` (Windows/Linux) 또는 `Cmd+Shift+` (macOS)

     - Node.js 설치 (버전 14 이상)

     - 실행: `npm install`

  3. **TypeScript 컴파일 시작**

     - VS Code에서 터미널 열기: `Ctrl+Shift+` (Windows/Linux) 또는 `Cmd+Shift+` (macOS)

     - 실행: `npx tsc -w` (파일 변경 감지 및 자동 컴파일)

  4. **개발 서버 시작**

     - VS Code에서 새 터미널 열기

     - 실행: `npm start`

  </details>
  <details>
    <summary>앱 설명</summary>

  ![Artgine App](https://06fs4dix.github.io/Artgine/help/Artgine.png)

  프로그램을 실행한 후, Artgine 프로젝트를 설정하고 실행하기 위한 여러 탭이 있는 구성 인터페이스가 표시됩니다.

  ### 탭 설명

  - **App**: 애플리케이션 실행 설정

  - **Preference**: 프로젝트 구성 변경

  - **Include**: 프로젝트 포함 파일 설정

  - **Manifest**: PWA 구성

  - **ServiceWorker**: 캐시 설정

  - **Plugin**: Artgine용 외부 라이브러리 구성

  ### App 탭 구성 옵션

  **기본 설정:**

  - **url**: 실행할 웹 서버 주소

    - 예시: `http://localhost:8050/Artgine`

  - **projectPath**: 시작할 프로젝트

    - 예시: `proj/Tutorial/ShaderEditer`

    - "Folder" 버튼을 사용하여 프로젝트 디렉토리를 찾아보고 선택

  - **width, height**: 시작 크기

    - 예시: `1024 x 768`

    - 참고: .exe 파일로 실행할 때만 유지됨

  **프로그램 모드:**

  - **program**: 프로그램 역할

    - `developer`: 개발자 모드 (배포 금지)

      - 서버와 클라이언트가 동시에 적용됨

    - `client`: 클라이언트 모드

    - `server`: 웹 서버 모드

  **서버 구성:**

  - **server**: 서버 운영

    - `local`: 파일 기반 로컬 실행

    - `remote`: 외부 서버에 연결할 때 사용

    - `webserver`: 웹 서버 운영 (외부 접근 허용)

  **표시 옵션:**

  - **fullScreen**: 전체 화면 모드

  - **github**: GitHub 라이브러리를 사용하여 실행

    - 프로젝트에 Chrome 로컬 실행 파일(.bat) 생성

  **작업 버튼:**

  - **Run**: 애플리케이션 실행

  - **VSCode**: Visual Studio Code에서 열기

  **개발 명령:**

  - **npm install**: Node.js 의존성 설치

  - **npx tsc -w**: 감시 모드의 TypeScript 컴파일러

  </details>
  <details>
    <summary>프로젝트 예제 및 사용법</summary>

  ### 프로젝트 예제

  `proj/` 폴더에는 Artgine 엔진의 다양한 기능을 보여주는 예제 프로젝트들이 포함되어 있습니다:

  - **Home** - 서버 통합 및 데이터베이스 도구가 포함된 메인 애플리케이션
  - **Tutorial** - 다양한 엔진 기능을 다루는 학습 예제:
  - **2D** - 2D 예제:
  - **3D** - 3D 예제:

    
  ---

  ### ⚠️ 주의사항

  이 프로젝트는 일렉트론 앱으로 실행됩니다. 
  다음 파일들은 **프로젝트 폴더명을 기준으로 자동 생성 및 관리**되므로 **수정에 주의하세요**:

  - HTML 파일
  - TypeScript 파일
  - JSON 파일
  - Web Manifest 파일

  ### 📝 수정 가능한 범위

  - **EntryPoint 이후의 코드만** 수정 가능합니다

  - 자동 생성되는 코드는 건드리지 마세요

  > 💡 **참고**: 수동으로 작업시 자유롭게 수정 가능합니다

  </details>
  <details>
    <summary>클래스 설명</summary>

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
</details>

  // 주체 생성 및 2D 페인트 컴포넌트 추가
  let sub = Main.Push(new CSubject());
  sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex(), new CVec2(100, 100)));
  ```

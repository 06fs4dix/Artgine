

## 소개

Artgine은 Electron과 웹 기술로 구축된 2D/3D 콘텐츠 엔진 및 통합 개발 환경입니다. 웹 기반 그래픽 렌더링과 데스크톱 앱의 편의성을 결합하여, 복잡한 설정 없이도 인터랙티브한 콘텐츠와 게임을 손쉽게 개발할 수 있도록 설계되었습니다.


## 예제
**3D**

[Water](https://06fs4dix.github.io/Artgine/proj/Tutorial/Water/Water.html) : Water

[ModularVillage](https://06fs4dix.github.io/Artgine/proj/3D/ModularVillage/ModularVillage.html) : Village

[Voxel](https://06fs4dix.github.io/Artgine/proj/3D/Voxel/Voxel.html) : Voxel

**2D**

[Village](https://06fs4dix.github.io/Artgine/proj/2D/Village/Village.html) : Village 

[Maze](https://06fs4dix.github.io/Artgine/proj/2D/Maze/Maze.html) : Maze



<details>
  <summary>More examples</summary>

[ArtgineTutorial](https://06fs4dix.github.io/Artgine/proj/Tutorial/Canvas/Canvas.html) : A guided tutorial on how to use Artgine.

[CollusionTest](https://06fs4dix.github.io/Artgine/proj/Tutorial/Collusion/Collusion.html): Collision testing.  

[3DLight](https://06fs4dix.github.io/Artgine/proj/Tutorial/3DLight/3DLight.html): 3D lights and shadows.

[Map](https://06fs4dix.github.io/Artgine/proj/3D/Map/Map.html): Track 3D objects from a 2D map.  

[BoxShow](https://06fs4dix.github.io/Artgine/proj/3D/BoxShow/BoxShow.html) : Box visual viewer

[Shooting](https://06fs4dix.github.io/Artgine/proj/2D/Shooting/Shooting.html) : Shooting

[Up](https://06fs4dix.github.io/Artgine/proj/2D/SideScroll/SideScroll.html) : Up

[Skybox](https://06fs4dix.github.io/Artgine/proj/Tutorial/Skybox/Skybox.html) : Skybox

</details>

## 시작하기

- start.bat/start.sh실행 하거나  ```💡"알 수 없는 게시자" 경고가 표시될 수 있습니다```
	
	
- 콘솔에 아래와 같이 입력해주세요
```bash
git clone https://github.com/06fs4dix/Artgine.git
cd Artgine
npm install
npm start
```

서버만 단독으로 실행하려면  npm start가 아닌 npm run start_web 해주세요.

### 폴더 설명

```
├── README.md 
├── LICENSE.txt
├── NOTICE.txt
├── package.json
├── start.bat(윈도우 시작 배치파일
├── start.sh(리눅스 배치 파일
├── tsconfig.json
├── App/ (일렉트론 파일
├── artgine/ (엔진 파일
├── db/(데이타베이스 저장 경로
├── plugin/
└── proj/(프로젝트 파일
```
>🚫프로젝트 파일은 작업 폴더보다 상위에 있으면 안됩니다.

### 일렉트론

![Artgine App](https://06fs4dix.github.io/Artgine/help/Artgine.png)

**탭 설명**
- App : 애플리케이션 실행 설정
- Preference : 프로젝트 구성 설정
- Include : 프로젝트 포함 파일 설정
- Manifest : PWA 구성 설정
- ServiceWorker : 캐시 설정
- Plugin : Artgine용 외부 라이브러리 구성
  

**App Tap**
- url : 실행할 웹 서버 주소
	- 예시 : `http://localhost:8050/Artgine`
- projectPath : 시작할 프로젝트
	- 예시 : `proj/Tutorial/ShaderEditer`
- "Folder" 버튼을 사용하여 프로젝트 디렉토리를 찾아보고 선택
- width, height : 시작 크기
	- 예시: `1024 x 768`
    - 참고: .exe 파일로 실행할 때만 유지됨
**프로그램 모드**
- program : 프로그램 역할
    - `developer`: 개발자 모드 (배포 금지 / 서버와 클라이언트가 동시에 적용됨)
    - `client`: 클라이언트 모드
    - `server`: 웹 서버 모드
**서버 구성**
- server : 서버 운영
    - `local` : 파일 기반 로컬 실행
    - `remote` : 외부 서버에 연결할 때 사용
    - `webserver` : 웹 서버 운영 (외부 접근 허용)
**표시 옵션**
- fullScreen : 전체 화면 모드
- github : GitHub 라이브러리를 사용하여 실행
	- 프로젝트에 Chrome 로컬 실행 파일(.bat) 생성
	
**작업 버튼**
- Run : 애플리케이션 실행
- VSCode : Visual Studio Code에서 열기

### 프로젝트 실행
1. projectPath에 ```Folder```를 선택하고 원하는 proj폴더를 선택 합니다.
2. ```Run(F9)```버튼을 누르거나 단축키를 누르면 프로젝트가 로드됩니다.


### 코드 작성

일렉트론 앱으로 실행시  
> 💡 **참고**: 수동으로 작업시 자유롭게 수정 가능합니다

> 🚫 다음 파일들은 **[Project Name]**을 기준으로 자동 생성 및 관리되므로 수정에 주의하세요


- **[Project Name]** HTML 파일
- **[Project Name]** TypeScript 파일
- **[Project Name]** JSON 파일
- **[Project Name]** Web Manifest 파일

**📝 수정 가능한 범위**

`EntryPoint 이후의 코드만` 수정 가능합니다. 아래는 예시 입니다.
```js
//The content above this line is automatically set by the program. Do not modify.⬆✋🚫⬆☠️💥🔥
//EntryPoint
//여기서부터 수정가능
```

자동 생성되는 코드는 수정하지 마세요

**GPT**

[Artgine BOT](https://chatgpt.com/g/g-68ad603d9b3081918273f3d352f995fc-artgine-bot) : 미리 학습된 GPT Bot을 이용해서 실시간 질문해보세요.

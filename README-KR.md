

## 빠른시작
```bash
git clone https://github.com/06fs4dix/Artgine.git
cd Artgine
npm install
npm start
```

## 예제
[ArtgineTutorial](https://06fs4dix.github.io/Artgine/proj/Tutorial/Canvas/Canvas.html) : 사용법을 알려줍니다
<details>
  <summary>더보기</summary>
  
**Tutorial**

[CollusionTest](https://06fs4dix.github.io/Artgine/proj/Tutorial/Collusion/Collusion.html) : 충돌 테스트 제공

[3DLight](https://06fs4dix.github.io/Artgine/proj/Tutorial/3DLight/3DLight.html) : 3D 빛,그림자 

[Skybox](https://06fs4dix.github.io/Artgine/proj/Tutorial/Skybox/Skybox.html) : 스카이박스

[Wind](https://06fs4dix.github.io/Artgine/proj/Tutorial/Wind/Wind.html) : 바람 처리

**3D**

[BoxShow](https://06fs4dix.github.io/Artgine/proj/3D/BoxShow/BoxShow.html) : 박스 비주얼 뷰어

[Map](https://06fs4dix.github.io/Artgine/proj/3D/Map/Map.html) : 2차원 맵에서 3D 오브젝트 추적

[GeometryViewer](https://06fs4dix.github.io/Artgine/proj/3D/GeometryViewer/GeometryViewer.html) : gps정보를 기반으로 화면 구성

**2D**

[Maze](https://06fs4dix.github.io/Artgine/proj/2D/Maze/Maze.html) : 미로찾기

[Village](https://06fs4dix.github.io/Artgine/proj/2D/Village/Village.html) : 마을 

[Shooting](https://06fs4dix.github.io/Artgine/proj/2D/Shooting/Shooting.html) : 슈팅

</details>

## 시작하기

### 설정

start.bat/start.sh실행 하거나 ```💡"알 수 없는 게시자" 경고가 표시될 수 있습니다```

콘솔에 아래와 같이 입력해주세요


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
>🚫프로젝트 파일은 작업 폴더보다 상위에 있으면 안됩니다.}}$ 

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

### 코드 작성

일렉트론 앱으로 실행시  
> 💡 **참고**: 수동으로 작업시 자유롭게 수정 가능합니다
> 🚫 다음 파일들은 프로젝트 폴더명을 기준으로 자동 생성 및 관리되므로 수정에 주의하세요



- HTML 파일
- TypeScript 파일
- JSON 파일
- Web Manifest 파일

** 📝 수정 가능한 범위 **

**EntryPoint 이후의 코드만** 수정 가능합니다.
자동 생성되는 코드는 건드리지 마세요

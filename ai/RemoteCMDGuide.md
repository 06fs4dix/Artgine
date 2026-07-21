# 원격 명령 실행 (Remote Command Execution - ai/tool/remotecmd.js)

## 주소 (Address)
- http://192.168.1.4:8050/Artgine/proj/Home/Home.html?path=%2F&RootPath=%2Fhome%2Fvboxuser%2FDesktop%2FArtgine-script.%2FArtgine-script

## 토큰 (Token)
- 8c2yJlUAwcVvazeJm0j_VHH_6J-vsAKbIOqBtrlol4g

> `artgine/server/CRemoteDesktopRouter.ts`의 `/RemoteCMD/Exec` 엔드포인트를 통해 원격 서버에서 콘솔 명령을 직접 실행하고 결과를 받는다.

## 사용 제한 (Usage Restrictions)
- 명령어 문자열 자체에는 제한이 없다 — 받은 그대로 실행된다. `RootPath`/`path`는 작업 시작 디렉터리(cwd) 지정용일 뿐 보안 경계가 아니다.
- **규칙**: 아래 `node ai/tool/remotecmd.js ...` 명령은 사용 가능한 터미널 실행 도구로 **그대로** 실행한다. `bash -lc '...'` 등으로 감싸지 않는다 (감싸는 셸이 없으면 실행 자체가 실패한다).

## 홈 URL (Home URL)
> ⚠️ **`HOME_URL`은 이 파일 위쪽 "주소" 섹션의 값을 그대로 읽어서 쓴다. 직접 조합하거나 추측하지 말 것.**

`## 주소`는 `Home.html` 쿼리스트링 형태의 URL이다.
- `path`: RootPath 기준 상대 경로 (현재 탐색 중인 하위 폴더)
- `RootPath`: 파일시스템 루트 시작점
- `RootUrl`: 그 루트에 매핑된 정적 서빙 URL prefix (작업에는 불필요, URL 구성요소일 뿐)

`ai/tool/remotecmd.js`가 이 URL에서 자동으로:
- API base (`/proj/` 이전 경로) 계산
- `cwd = RootPath + path` 계산 (예: `./` + `/sample/` = `./sample/`)

## 명령어 (Commands)
```
node ai/tool/remotecmd.js <HomeURL> login                     # 비밀번호로 세션 인증(auth/login, settings.json 자동 읽음) → 이후 cmd 호출 가능
node ai/tool/remotecmd.js <HomeURL> remote <토큰>              # 토큰으로 세션 인증(auth/check) → 이후 cmd 호출 가능
node ai/tool/remotecmd.js <HomeURL> cmd <콘솔 명령어 그대로...>  # 명령 실행(RemoteCMD/Exec) → {ok, stdout, stderr} JSON 출력
node ai/tool/remotecmd.js <HomeURL> restart                   # 서버 재시작(File/Restart) → 세션 인증 필요, 즉시 현재 프로세스 종료됨
```
- `cmd`는 세션 쿠키 기반 인증이 필요하다 — 먼저 `login` 또는 `remote <토큰>`으로 세션을 인증시켜야 한다.
- 쿠키는 `ai/tool/remotecmd_cookie.txt`에 저장/로드 (다른 `ai/tool/*.js` 도구와는 별도 파일을 사용한다).
- `cmd` 뒤 인자는 가공 없이 그대로 합쳐져 서버에 전달된다. cwd는 HomeURL에서 자동 계산되며, 다른 위치에서 실행하려면 HomeURL의 `path` 값을 바꿔서 넘긴다.
- 서버 쪽에서 Windows cmd.exe 출력을 UTF-8로 강제 변환하므로(`chcp 65001` 자동 적용) 한글이 깨지지 않는다.

## 사용 예시 (Usage Examples)
아래 `<HomeURL>`/`<토큰>` 자리에는 위 "주소"/"토큰" 섹션 값을 그대로 채워서 실행한다.
```
node ai/tool/remotecmd.js <HomeURL> remote <토큰>
→ {"ok":true,"authed":true}

node ai/tool/remotecmd.js <HomeURL> cmd dir
→ {"ok":true,"stdout":"...","stderr":""}

node ai/tool/remotecmd.js <HomeURL> cmd "type sample.txt"
→ {"ok":true,"stdout":"파일 내용...","stderr":""}

node ai/tool/remotecmd.js <HomeURL> cmd "echo 내용>>sample.txt"
→ {"ok":true,"stdout":"","stderr":""}
```

## 인용 주의 (Quotation Cautions)
- `cmd` 뒤 명령어에 공백, `\`(백슬래시), `&&`, `>`, `|` 등 특수문자가 포함되면 명령 전체를 큰따옴표(`"..."`)로 감싸서 하나의 인자로 전달한다.
  - `node ai/tool/remotecmd.js <HomeURL> cmd "type sample\sample.txt"`
  - `node ai/tool/remotecmd.js <HomeURL> cmd "git status && git diff"`

## 파일 업로드/다운로드 (File Upload / Download)

### 업로드 (로컬 → 원격)
```
node ai/tool/remotecmd.js <HomeURL> upload <로컬파일경로> <원격디렉터리>
```
- 인증 필요 — 먼저 `remote <토큰>`으로 세션을 인증해야 한다.
- `<원격디렉터리>`: 서버 파일시스템 기준 절대/상대 경로, 끝에 `/` 포함 (예: `./proj/MyProject/`)
- 내부적으로 `/File/Upload` API에 Base64 인코딩된 파일 데이터를 POST한다.

```
node ai/tool/remotecmd.js <HomeURL> remote <토큰>
node ai/tool/remotecmd.js <HomeURL> upload ./local/file.ts ./proj/MyProject/
→ {"ok":true}
```

### 다운로드 (원격 → 로컬)
```
node ai/tool/remotecmd.js <HomeURL> download <원격파일경로> [로컬저장경로]
```
- 인증 불필요 — 정적 서빙 URL(`RootUrl` + 경로)로 HTTP GET한다.
- `<원격파일경로>`: `RootPath` 기준 상대 경로, `/`로 시작 (예: `/proj/MyProject/file.ts`)
- `[로컬저장경로]` 생략 시 현재 디렉터리에 파일명으로 저장.
- 텍스트/바이너리 모두 지원.

```
node ai/tool/remotecmd.js <HomeURL> download /proj/MyProject/file.ts
→ {"ok":true,"file":"file.ts","size":1234}

node ai/tool/remotecmd.js <HomeURL> download /proj/MyProject/file.ts ./out/file.ts
→ {"ok":true,"file":"./out/file.ts","size":1234}
```

### 서버 재시작 (Restart)
REST API `POST /File/Restart` (`artgine/server/CFileServer.ts`)로 서버를 재시작한다.
```
node ai/tool/remotecmd.js <HomeURL> login (또는 remote <토큰>)
node ai/tool/remotecmd.js <HomeURL> restart
→ {"ok":true}
```
- 인증 필요 — 먼저 `login` 또는 `remote <토큰>`으로 세션을 인증해야 한다. 인증은 기존 인증 시스템(`CAuthServer`, 로그인 세션 쿠키 또는 password 토큰)을 그대로 재사용한다.
- 현재 로드된 settings.json 그대로 재시작한다: 내부적으로 `npm run start -- <현재 settings 파일>`을 detached 실행하고, `desktop/Start.ts`가 기존 프로세스를 kill한 뒤 같은 설정으로 재기동한다.
- **호출 즉시 현재 서버 프로세스가 종료된다. 사용자의 명시적 승인 없이는 이 명령을 실행해서는 안 된다** (`ai/ROLE.md` "제한 명령어" 규칙).

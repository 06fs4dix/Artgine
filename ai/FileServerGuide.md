# 파일서버 원격 작업 (Remote File Server Work - ai/file_server.js)

## 주소 (Address)
- http://localhost:7000/Artgine/proj/Home/Home.html?path=%2F&RootPath=.%2F&RootUrl=%2FArtgine%2FRoot0

## 토큰 (Token)
- PE3abvJ5nKepW8BJG0MdFmArhQeIJnstfxHdNLX-7W4

> 파일서버(`artgine/server/CFileServer.ts`)의 `/File/CMD` 엔드포인트를 통해 원격 서버에서 콘솔 명령을 직접 실행하고 결과를 받는다.

## 사용 제한 (Usage Restrictions)
- 명령어 문자열 자체에는 제한이 없다 — 받은 그대로 실행된다. `RootPath`/`path`는 작업 시작 디렉터리(cwd) 지정용일 뿐 보안 경계가 아니다.
- **규칙**: 아래 `node ai/file_server.js ...` 명령은 사용 가능한 터미널 실행 도구로 **그대로** 실행한다. `bash -lc '...'` 등으로 감싸지 않는다 (감싸는 셸이 없으면 실행 자체가 실패한다).

## 홈 URL (Home URL)
> ⚠️ **`HOME_URL`은 이 파일 위쪽 "주소" 섹션의 값을 그대로 읽어서 쓴다. 직접 조합하거나 추측하지 말 것.**

`## 주소`는 `Home.html` 쿼리스트링 형태의 URL이다.
- `path`: RootPath 기준 상대 경로 (현재 탐색 중인 하위 폴더)
- `RootPath`: 파일시스템 루트 시작점
- `RootUrl`: 그 루트에 매핑된 정적 서빙 URL prefix (작업에는 불필요, URL 구성요소일 뿐)

`ai/file_server.js`가 이 URL에서 자동으로:
- API base (`/proj/` 이전 경로) 계산
- `cwd = RootPath + path` 계산 (예: `./` + `/sample/` = `./sample/`)

## 명령어 (Commands)
```
node ai/file_server.js <HomeURL> remote <토큰>                # 토큰으로 세션 인증(auth/check) → 이후 cmd 호출 가능
node ai/file_server.js <HomeURL> cmd <콘솔 명령어 그대로...>  # 명령 실행 → {ok, stdout, stderr} JSON 출력
```
- `cmd`는 세션 쿠키 기반 인증이 필요하다 — 먼저 `remote <토큰>`으로 세션을 인증시켜야 한다.
- 쿠키는 `ai/cookie.txt`에 저장/로드 (`ai/web_debug.js`와 공유).
- `cmd` 뒤 인자는 가공 없이 그대로 합쳐져 서버에 전달된다. cwd는 HomeURL에서 자동 계산되며, 다른 위치에서 실행하려면 HomeURL의 `path` 값을 바꿔서 넘긴다.
- 서버 쪽에서 Windows cmd.exe 출력을 UTF-8로 강제 변환하므로(`chcp 65001` 자동 적용) 한글이 깨지지 않는다.

## 사용 예시 (Usage Examples)
아래 `<HomeURL>`/`<토큰>` 자리에는 위 "주소"/"토큰" 섹션 값을 그대로 채워서 실행한다.
```
node ai/file_server.js <HomeURL> remote <토큰>
→ {"ok":true,"authed":true}

node ai/file_server.js <HomeURL> cmd dir
→ {"ok":true,"stdout":"...","stderr":""}

node ai/file_server.js <HomeURL> cmd "type sample.txt"
→ {"ok":true,"stdout":"파일 내용...","stderr":""}

node ai/file_server.js <HomeURL> cmd "echo 내용>>sample.txt"
→ {"ok":true,"stdout":"","stderr":""}
```

## 인용 주의 (Quotation Cautions)
- `cmd` 뒤 명령어에 공백, `\`(백슬래시), `&&`, `>`, `|` 등 특수문자가 포함되면 명령 전체를 큰따옴표(`"..."`)로 감싸서 하나의 인자로 전달한다.
  - `node ai/file_server.js <HomeURL> cmd "type sample\sample.txt"`
  - `node ai/file_server.js <HomeURL> cmd "git status && git diff"`

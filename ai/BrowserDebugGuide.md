# 웹브라우저 디버깅 (Web Browser Debugging - curl HTTP API)

> 라이브 페이지 콘솔 로그·JS 실행·DOM 조회용. 코드 파일 수정엔 쓰지 않는다.

## 사용 제한 (Usage Restrictions)
- **정적 분석(파일 읽기, grep, glob)을 먼저 한다. `ai/tool/browser.js`는 정적 분석으로 절대 알 수 없는 런타임 정보가 필요할 때만 쓴다.**
- **코드 확인, 클래스/함수 찾기, 파일 구조 파악에 browser.js를 쓰지 않는다.**

`ai/tool/browser.js`를 사용한다. 비밀번호는 스크립트가 자동으로 읽는다. 쿠키는 `ai/tool/browser_cookie.txt`에 자동 저장/로드.  
**규칙**: Bash 툴만 사용 (PowerShell 금지)

> ⚠️ **첫 번째 인자(BASE_URL)는 CLAUDE.md "접속 정보" 섹션의 `주소`+`포트`+`기본경로` 값을 직접 읽어서 조합한다. Main.json을 열거나 포트를 임의로 추측하지 말 것.**

```bash
node ai/tool/browser.js $BASE_URL login                                   # 인증 (최초 1회) → "ok" 출력
node ai/tool/browser.js $BASE_URL push <url> [ttl=600] [logSize=100] [width=1280] [height=720] # 세션 생성 → sessionId 문자열 출력
node ai/tool/browser.js $BASE_URL reset <sid> [ttl] [logSize] [width] [height]    # 세션 재설정(페이지 새로 로드)
node ai/tool/browser.js $BASE_URL exec <sid> <fn> [args_json]             # Playwright Page API 호출 → result 출력
node ai/tool/browser.js $BASE_URL screenshot <sid> [options_json]        # 스크린샷 → screenshot.png 저장
node ai/tool/browser.js $BASE_URL input <sid> <key|mouseButton> <time_ms> <focus> [x y [x2 y2]] # 입력 실행
node ai/tool/browser.js $BASE_URL eval <sid> <js_expression>              # JS 표현식 직접 실행 → result 출력
node ai/tool/browser.js $BASE_URL eval_stdin <sid>                        # stdin으로 JS 표현식 전달 (긴 코드/이스케이핑 문제 회피)
node ai/tool/browser.js $BASE_URL eval_base64 <sid> <base64_js_expression> # base64로 인코딩된 JS 표현식 실행
node ai/tool/browser.js $BASE_URL logs <sid> [fromOffset=0]               # 콘솔 로그 조회 → logs, nextOffset 출력
node ai/tool/browser.js $BASE_URL list                                     # 세션 목록
node ai/tool/browser.js $BASE_URL remove <sid>                             # 세션 제거 (TTL 만료 시 자동 제거)
```

- `push`: width/height로 Playwright viewport size를 지정한다. 0 이하, 미입력, 알 수 없는 값은 서버 기본값 1280x720을 사용한다.
- `reset`: 기존 세션을 재사용하면서 ttl/logSize/width/height를 다시 지정해 페이지를 새로 로드한다.
- `fn`: Playwright Page API 메서드, dot-notation 지원 (`mouse.click`, `keyboard.type` 등). `fn`이 `screenshot`이면 결과를 자동으로 `screenshot.png`에 저장한다.
  - `exec`는 Playwright(`playwright`)의 `Page` API를 그대로 가져와 쓴 것이라, 복잡한 동작은 Playwright 공식 문서나 `node_modules/playwright-core/types/types.d.ts`의 `Page`/`Mouse`/`Keyboard` 정의를 참고해서 메서드/인자를 확인한다.
  - `args_json`은 그 메서드의 인자에 **위치 순서대로** 대응하는 배열이다.
    - 예: `mouse.click(x, y, options?)` → `exec <sid> mouse.click [400, 300]`
    - 예: `keyboard.press(key)` → `exec <sid> keyboard.press '["Enter"]'`
- `args_json`: JSON 배열 문자열 (기본 `[]`)
- `input`: 키보드/마우스 입력을 한 요청 안에서 실행한다. 좌표가 없으면 키보드, `x y`가 있으면 마우스 press, `x y x2 y2`가 있으면 드래그로 처리한다. 마우스 버튼은 `mouseLeft|mouseRight|mouseMiddle`, `focus`는 `canvas|page|none`.
  - 키 유지: `node ai/tool/browser.js $BASE_URL input <sid> w 1000 canvas`
  - 마우스 클릭/프레스: `node ai/tool/browser.js $BASE_URL input <sid> mouseLeft 80 canvas 400 300`
  - 마우스 드래그: `node ai/tool/browser.js $BASE_URL input <sid> mouseLeft 800 canvas 400 300 520 300`
- `eval` / `eval_stdin` / `eval_base64`: DOM 조회·JS 변수 읽기 등 브라우저 메모리 접근 시 사용. 따옴표·줄바꿈 이스케이핑 문제가 있으면 `eval_stdin`(stdin 입력) 또는 `eval_base64`(base64 인코딩)를 사용한다. `exec evaluate`는 args_json 따옴표 이스케이핑 문제로 사용 금지.
- `logs` 응답: `{ logs: [{"type":"log"|"error"|"network","text":"...","ts":0,"offset":N}], nextOffset: N }`
  - 로그는 조회해도 삭제되지 않음. `logSize` 초과 시 오래된 것부터 자동 삭제
  - `fromOffset` 미입력 시 전체 조회. 이전 `nextOffset`을 넘기면 새 로그만 조회 가능

**흐름 예시** (페이지 콘솔 확인):
```
# BASE_URL = CLAUDE.md "접속 정보" 섹션의 주소+포트+기본경로 (직접 읽을 것, Main.json 금지)
BASE_URL=<접속정보.주소>:<접속정보.포트>/<접속정보.기본경로>
node ai/tool/browser.js $BASE_URL login
→ ok

node ai/tool/browser.js $BASE_URL push $BASE_URL/proj/Home/Home.html 600 100 1280 720
→ 3he4wj8iy6vmqf86ham   (이 값이 sessionId)

node ai/tool/browser.js $BASE_URL exec 3he4wj8iy6vmqf86ham title
node ai/tool/browser.js $BASE_URL logs 3he4wj8iy6vmqf86ham
```

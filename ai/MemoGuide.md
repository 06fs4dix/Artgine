# 메모 가이드 (Memo Guide - /Memo/* API)

> 백엔드: `artgine/server/CMemo.ts` (로직), `artgine/server/CMemoRouter.ts` (라우터).

## 빠른 사용 (ai/tool/memo.js)
저장/검색만 필요하면 전용 도구를 쓴다. `browser.js`/`remotecmd.js`와 동일하게 `common.js`의 인증 공유 방식(쿠키 jar)을 쓰며, 쿠키는 `ai/tool/memo_cookie.txt`에 저장/로드된다.

> ⚠️ `<BASE_URL>`은 CLAUDE.md "접속 정보" 섹션의 주소+포트+기본경로를 직접 읽어서 조합한다. Main.json을 열거나 포트를 추측하지 말 것.

```bash
node ai/tool/memo.js <BASE_URL> login        # 인증(auth/login, Main.json password 자동 읽음) → "ok" 출력
node ai/tool/memo.js <BASE_URL> w <text>     # 저장 (Memo/Chat mode=write) → result 출력
node ai/tool/memo.js <BASE_URL> r <text>     # 검색 (Memo/Chat mode=read) → result 출력
```

- `w`/`r`는 세션 쿠키 기반 인증이 필요하다 — 먼저 `login`으로 세션을 인증시켜야 한다.
- `continueOffset` 지정, 목록/체인조회/삭제(`List`/`Get`/`Delete`)는 이 도구에 없다 — 필요하면 아래 curl 방식을 직접 쓴다.

## curl로 직접 호출 (전체 API)
## 인증 (Authentication)
모든 `/Memo/*` 엔드포인트는 로그인 세션이 필요하다(`401` 발생 시 미인증).

1. CLAUDE.md "접속 정보" 섹션의 주소/포트/기본경로로 `BASE_URL`을 구성한다 (Main.json을 열어 포트를 추측하지 말 것).
2. 비밀번호는 `Main.json` → `desktop/Main.json` 순으로 찾은 파일의 `password` 필드 값(없으면 기본값 `artgine`).
3. 쿠키 jar는 스크래치패드 디렉터리에 둔다.

```bash
curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password": "<Main.json의 password>"}'
```

이후 모든 `/Memo/*` 호출에 `-b "$COOKIE_JAR"`로 같은 쿠키를 사용한다.

## 메모 저장 (Write) - POST /Memo/Chat
```bash
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/Memo/Chat" \
  -H "Content-Type: application/json" \
  -d '{"text": "<저장할 내용>", "mode": "write"}'
```
→ `{"ok": true, "result": "saved"}`

- 직전 대화와 연결할지는 AI가 텍스트 내용을 보고 자동 판단한다(`continueOffset` 생략 시).
- 특정 메모에 명시적으로 이어 쓰려면 `continueOffset`에 그 메모의 `selfOffset`을 지정한다 — 이 경우 AI 판단과 무관하게 항상 그 체인에 연결된다.
  ```json
  {"text": "...", "mode": "write", "continueOffset": 12345}
  ```
- 본문에 `#해시태그`를 넣으면 그 단어가 검색 키워드로 강제 포함된다.

## 메모 가져오기 (Read/검색) - POST /Memo/Chat
```bash
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/Memo/Chat" \
  -H "Content-Type: application/json" \
  -d '{"text": "오늘 할일 알려줘", "mode": "read"}'
```
→ `{"ok": true, "result": "<AI가 관련 메모를 근거로 생성한 답변, 없으면 '관련 메모가 없습니다.'>"}`

- AI가 질문에서 키워드와 날짜 범위를 추출해 매칭되는 메모 체인들을 모은 뒤, 그 내용을 근거로 답변을 생성한다.
- "오늘/어제/지난주" 같은 표현은 날짜 범위로만 쓰이고 키워드에는 포함되지 않는다.
- "남은 할일/해야할 작업"을 묻는 표현이면 `TODO` 키워드가 자동으로 추가된다.

### ⚠️ mode: "auto" 함정
`mode`를 생략하거나 `"auto"`로 보내면 텍스트에 `?`(물음표) 포함 여부로만 write/read를 가른다. **"오늘 할일 가져와"처럼 물음표가 없는 검색 의도 문장은 저장(write)으로 처리되어 그 문장 자체가 메모로 저장돼버린다.** 검색이 목적이면 항상 `mode: "read"`를 명시한다.

## 최근 메모 목록 - GET /Memo/List
```bash
curl -s -b "$COOKIE_JAR" "$BASE_URL/Memo/List?n=10"
```
→ `{"ok": true, "list": [{"original", "chatTime", "selfOffset", "prevOffset", "nextOffset", "headOffset", "lastActivity"}, ...]}`

- 체인의 헤드 여부와 관계없이 전체 레코드 중 `chatTime`(작성 시각) 기준 최근 `n`개를 평면 목록으로 반환한다.

## 체인 전체 조회 - GET /Memo/Get
```bash
curl -s -b "$COOKIE_JAR" "$BASE_URL/Memo/Get?offset=<selfOffset>"
```
→ `{"ok": true, "chain": [...]}`

- 지정한 `selfOffset`이 속한 체인(연결된 대화 전체)을 `selfOffset` 오름차순으로 반환한다.

## 메모 삭제 - POST /Memo/Delete
```bash
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/Memo/Delete" \
  -H "Content-Type: application/json" \
  -d '{"offset": <selfOffset>}'
```
→ `{"ok": true}` (없으면 `404 {"ok": false, "msg": "..."}`)

- 해당 레코드만 삭제하고, 체인이 끊기지 않도록 앞뒤 레코드를 재연결한다.
- 삭제된 레코드가 체인의 헤드였다면 다음 레코드가 새 헤드가 되며, 체인 전체의 `headOffset`이 갱신된다.

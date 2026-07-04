# 메모 가이드 (Memo Guide - /Memo/* API)

> 백엔드: `artgine/server/CMemo.ts` (로직, 카테고리 트리 + 플랫 데이터), `artgine/server/CMemoRouter.ts` (라우터).

구 버전은 offset으로 이어지는 "체인" 구조(`/Memo/Chat`)였으나, 현재는 **카테고리(트리) + 카테고리별 메모(플랫 리스트)** 구조로 전면 교체되었다. 메모끼리 서로 이어쓰기(체인) 개념은 더 이상 없다.

## 빠른 사용 (ai/tool/memo.js)
저장/검색만 필요하면 전용 도구를 쓴다. `browser.js`/`remotecmd.js`와 동일하게 `common.js`의 인증 공유 방식(쿠키 jar)을 쓰며, 쿠키는 `ai/tool/memo_cookie.txt`에 저장/로드된다.

> ⚠️ `<BASE_URL>`은 CLAUDE.md "접속 정보" 섹션의 주소+포트+기본경로를 직접 읽어서 조합한다. Main.json을 열거나 포트를 추측하지 말 것.

```bash
node ai/tool/memo.js <BASE_URL> login                          # 인증(auth/login, Main.json password 자동 읽음) → "ok" 출력
node ai/tool/memo.js <BASE_URL> cats                            # 카테고리 목록
node ai/tool/memo.js <BASE_URL> addcat <name> [parentId]        # 카테고리 추가 (parentId 생략 시 0 = 루트)
node ai/tool/memo.js <BASE_URL> delcat <id>                     # 카테고리+하위 카테고리+데이터 전부 삭제
node ai/tool/memo.js <BASE_URL> list <categoryId>                # 해당 카테고리의 메모 목록 (최신순)
node ai/tool/memo.js <BASE_URL> recent [limit]                   # 전체 카테고리 통틀어 최신 메모 (기본 30개)
node ai/tool/memo.js <BASE_URL> add <categoryId> <text>          # 메모 저장 (태그 자동 추출)
node ai/tool/memo.js <BASE_URL> log <text>                       # 최상위 "Log" 카테고리에 저장 (없으면 자동 생성, [Log]/#Log 자동 부여)
node ai/tool/memo.js <BASE_URL> del <id>                         # 메모 단건 삭제
node ai/tool/memo.js <BASE_URL> find [categoryId|-] <text>       # 삭제 후보 검색만 (실제 삭제 안 함)
node ai/tool/memo.js <BASE_URL> search [categoryId|-] <text>     # AI 기반 검색 ("-" 또는 생략 시 전체 카테고리)
```

- 모든 명령은 세션 쿠키 기반 인증이 필요하다 — 먼저 `login`으로 세션을 인증시켜야 한다.
- `find`/`search`에서 `categoryId`를 생략하거나 `-`를 넣으면 전체 카테고리를 대상으로 한다.
- 카테고리 추천(`Category/Suggest`)과 카테고리 태그(`Category/Tag/*`)는 아직 `memo.js` CLI에 명령이 없다 — 아래 curl 예시를 직접 쓴다.

## curl로 직접 호출 (전체 API)
## 인증 (Authentication)
모든 `/Memo/*` 엔드포인트는 로그인 세션이 필요하다(`401` 발생 시 미인증). 토큰(`token` 필드)이 함께 오면 토큰 기준으로, 없으면 세션 쿠키 기준으로 인증한다(cross-origin 요청은 쿠키가 전달되지 않으므로 토큰 필요).

1. CLAUDE.md "접속 정보" 섹션의 주소/포트/기본경로로 `BASE_URL`을 구성한다 (Main.json을 열어 포트를 추측하지 말 것).
2. 비밀번호는 `Main.json` → `desktop/Main.json` 순으로 찾은 파일의 `password` 필드 값(없으면 기본값 `artgine`).
3. 쿠키 jar는 스크래치패드 디렉터리에 둔다.

```bash
curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password": "<Main.json의 password>"}'
```

이후 모든 `/Memo/*` 호출에 `-b "$COOKIE_JAR"`로 같은 쿠키를 사용한다.

## 카테고리 목록 - GET /Memo/Category/List
```bash
curl -s -b "$COOKIE_JAR" "$BASE_URL/Memo/Category/List"
```
→ `{"ok": true, "categories": [{"id", "parentId", "name"}, ...], "tags": [{"categoryId", "tag"}, ...]}`

- 전체 카테고리를 평면 목록으로 반환한다. 트리 구성(부모-자식 연결)은 클라이언트에서 `parentId`로 조립한다.
- `tags`는 전체 카테고리-태그 쌍 목록(사이드바 트리에서 카테고리별 태그를 한 번에 그리기 위한 것). 카테고리 하나의 태그만 필요하면 아래 `Tag/List`를 쓴다.

## 카테고리 추천 - POST /Memo/Category/Suggest
```bash
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/Memo/Category/Suggest" \
  -H "Content-Type: application/json" \
  -d '{"text": "<저장하려는 메모 내용>"}'
```
→ `{"ok": true, "category": {"id", "parentId", "name"} | null}`

- 카테고리를 아직 선택하지 않은 상태로 메모를 쓸 때, 내용과 가장 어울리는 카테고리를 AI가 추천한다(실제 저장은 안 함).
- 뚜렷하게 어울리는 카테고리가 없으면 `category`가 `null`.
- 클라이언트는 추천받은 카테고리를 사용자에게 확인(confirm)받은 뒤, `Memo/Data/Add`를 해당 `categoryId`로 별도 호출해서 실제로 저장한다.

## 카테고리 태그 - GET /Memo/Category/Tag/List, POST /Memo/Category/Tag/Add, /Remove
```bash
curl -s -b "$COOKIE_JAR" "$BASE_URL/Memo/Category/Tag/List?categoryId=<categoryId>"
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/Memo/Category/Tag/Add" \
  -H "Content-Type: application/json" -d '{"categoryId": <categoryId>, "tag": "<태그>"}'
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/Memo/Category/Tag/Remove" \
  -H "Content-Type: application/json" -d '{"categoryId": <categoryId>, "tag": "<태그>"}'
```
→ 세 엔드포인트 모두 `{"ok": true, "tags": ["<현재 태그 목록>"]}`

- 메모 하나하나에 붙는 메모 태그(`Memo/Data/Add`에서 자동 추출되는 것, `DataRecord.tags`)와 별개로, **카테고리 자체**에 붙는 라벨이다(이하 "카테고리 태그"). 카테고리 이름과도 무관한 별도 값.
- 하위 카테고리까지 상속된다 — 예: "할일" 카테고리에 "TODO" 카테고리 태그를 걸면 그 아래 모든 하위 카테고리의 메모도 검색 시 TODO로 매칭된다(개별 메모 자체에 TODO 태그가 없어도).
- 태그로 매칭된 경우엔 **작성 시각과 무관하게** 전부 포함된다(날짜 범위 필터가 적용되지 않음) — "이 카테고리 안이면 무조건 이 태그"라는 의미이기 때문.

## 카테고리 추가 - POST /Memo/Category/Add
```bash
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/Memo/Category/Add" \
  -H "Content-Type: application/json" \
  -d '{"name": "<카테고리명>", "parentId": 0}'
```
→ `{"ok": true, "category": {"id", "parentId", "name"}}`

- `parentId` 생략 시 0(루트)으로 처리된다.

## 카테고리 삭제 - POST /Memo/Category/Delete
```bash
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/Memo/Category/Delete" \
  -H "Content-Type: application/json" \
  -d '{"id": <categoryId>}'
```
→ `{"ok": true, "deletedCategoryIds": [...], "deletedDataCount": <n>}` (없으면 `404`)

- 지정한 카테고리와 그 모든 하위 카테고리, 그 아래 딸린 메모 데이터까지 함께 삭제된다(cascade).
- 삭제되는 메모는 감사 로그 테이블(`memo_data_deleted`)에 먼저 기록된 뒤 삭제된다.

## 메모(데이터) 목록 - GET /Memo/Data/List
```bash
curl -s -b "$COOKIE_JAR" "$BASE_URL/Memo/Data/List?categoryId=<categoryId>"
```
→ `{"ok": true, "data": [{"id", "categoryId", "content", "tags", "date"}, ...]}`

- 지정한 카테고리에 속한 메모만 최신순으로 반환한다.

## 전체 최신 메모 - GET /Memo/Data/ListRecent
```bash
curl -s -b "$COOKIE_JAR" "$BASE_URL/Memo/Data/ListRecent?limit=30"
```
→ `{"ok": true, "data": [...]}`

- 카테고리 구분 없이 전체에서 최신 `limit`개(기본 30)를 반환한다. 사이드바 "타임" 탭 용도.

## 메모 저장 - POST /Memo/Data/Add
```bash
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/Memo/Data/Add" \
  -H "Content-Type: application/json" \
  -d '{"categoryId": <categoryId>, "text": "<저장할 내용>"}'
```
→ `{"ok": true, "data": {"id", "categoryId", "content", "tags", "date"}}`

- `provider`/`model`을 함께 보내면 태그 추출에 사용할 AI를 지정할 수 있다(기본값은 서버 설정).
- 본문에 `#해시태그`를 넣으면 그 단어가 검색 태그로 강제 포함되고, 저장된 `content`에서는 제거된다.
- "해야/할일/확인 필요/예정/todo/fixme" 등의 표현이 있으면 `TODO` 태그가 자동으로 추가된다.
- 메모끼리 이어쓰기(체인) 개념은 없다 — 카테고리별 플랫 리스트에 단순 추가된다.

## 메모 삭제 - POST /Memo/Data/Delete
```bash
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/Memo/Data/Delete" \
  -H "Content-Type: application/json" \
  -d '{"id": <dataId>}'
```
→ `{"ok": true}` (없으면 `404`)

- 삭제 전 감사 로그 테이블(`memo_data_deleted`)에 먼저 기록한다(soft-delete 감사 로그 패턴).

## 삭제 후보 검색 - POST /Memo/Data/FindByDescription
```bash
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/Memo/Data/FindByDescription" \
  -H "Content-Type: application/json" \
  -d '{"text": "<자연어 설명>", "categoryId": null}'
```
→ `{"ok": true, "data": [{"id", "categoryId", "content", "tags", "date"}, ...]}`

- 자연어 설명으로 삭제 후보를 찾기만 하고, 실제 삭제는 하지 않는다.
- 클라이언트가 후보 목록을 사용자에게 보여주고 확인(confirm)받은 뒤, 각 `id`에 대해 `/Memo/Data/Delete`를 호출하는 2단계 흐름을 위한 것.
- `categoryId`를 생략하거나 `null`이면 전체 카테고리 대상.
- 매칭 방식은 `Memo/Search`와 동일하다(태그 매칭 + 카테고리 태그 상속). 아래 `Memo/Search` 설명 참고 - `categoryId` 스코프가 매칭 경로별로 다르게 적용되니 주의.

## AI 검색 - POST /Memo/Search
```bash
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/Memo/Search" \
  -H "Content-Type: application/json" \
  -d '{"text": "오늘 할일 알려줘", "categoryId": null}'
```
→ `{"ok": true, "result": "<매칭된 메모를 '[id][YYYY-MM-DD HH:mm:ss] 내용' 형식으로 줄바꿈 나열한 문자열, 없으면 '관련 메모가 없습니다.'>"}`

- AI가 요청에서 검색 태그와 날짜 범위를 추출해 매칭되는 메모들을 모은 뒤, 그대로 나열해 반환한다(AI가 요약/누락하지 않도록 별도 답변 생성 단계 없음).
- "오늘/어제/지난주" 같은 표현은 날짜 범위로만 쓰이고 태그에는 포함되지 않는다.
- "남은 할일/해야할 작업"을 묻는 표현이면 `TODO` 태그가 자동으로 추가된다.
- `categoryId`를 생략하거나 `null`이면 전체 카테고리 대상, 지정하면 스코프로 쓰인다.
- 검색 태그가 여러 개면(예: "TODO"+"메모앱") **태그별로 AND(교집합)** 매칭된다 - 즉 모든 태그 조건을 동시에 만족하는 메모만 반환된다. 태그 하나에 대한 매칭 자체는 아래 두 경로의 OR이다:
  1. **메모 태그 매칭** - 메모 하나하나에 붙은 태그가 검색 태그와 매칭. 날짜 범위 적용됨. `categoryId`를 지정하면 **그 카테고리 정확히 일치**하는 메모만 대상(하위 카테고리는 포함 안 됨).
  2. **카테고리 태그 상속** - 검색 태그와 매칭되는 카테고리 태그를 가진 카테고리(+**하위 카테고리 전부**)에 속한 메모(`Tag/Add` 참고). 날짜 범위와 무관하게 전부 포함됨. `categoryId`를 지정하면 그 카테고리의 하위집합으로만 제한.
- `provider`/`model`을 함께 보내면 검색어 전처리(태그/날짜 추출)에 사용할 AI를 지정할 수 있다.

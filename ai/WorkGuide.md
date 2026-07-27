# 워크 가이드 (Work Guide - ai/tool/work.js)

> 백엔드: `artgine/server/CSubAgent.ts`, `CTerminalScheduler.ts`, `CWorkOrder.ts`.  
> 터미널 라우터(`CTerminalRouter`)가 같은 SQLite를 읽고 세션 기동·스케줄 발화·워크오더 배분을 수행한다.

서버 HTTP/로그인 **불필요**. CLI가 클래스를 직접 import 해 `./db/artgine.sqlite` 를 읽고 쓴다.

## 사용 제한 (Usage Restrictions)
- **규칙**: 아래 `node ai/tool/work.js ...` 명령은 터미널 실행 도구로 **그대로** 실행한다. 감싸는 셸 없이 인자 그대로 전달.
- **cwd**: 서버 프로세스와 **같은 작업 디렉터리**에서 실행해야 같은 DB를 본다. 스크립트는 `process.chdir()` 하지 않는다. 보통 프로젝트 루트(`WebContent/`)에서 실행.
- 툴은 **DB 등록/조회/상태**만 한다. PTY 세션 기동·스케줄 틱·세션 전송은 **서버가 켜져 있을 때** 동작한다.

## 명령어 일람

```
node ai/tool/work.js list-work [status] [limit]
node ai/tool/work.js list-agent
node ai/tool/work.js set-agent <key> <provider> <model> [score] [workingDir] [super] [retryCount] [retryText] [traits_json] [permissions_json]
node ai/tool/work.js del-agent <key>
node ai/tool/work.js list-sched
node ai/tool/work.js set-sched <name> <subAgentKey> <mode> <option_json> <command...>
node ai/tool/work.js del-sched <name>
node ai/tool/work.js get <id>
node ai/tool/work.js check <팀키> [시작시각]
node ai/tool/work.js push <from> <to> <content...>
node ai/tool/work.js status <id> <status>
node ai/tool/work.js result <id> <status> <result...>
```

- `content` / `result` / `retryText` / `command` 안의 줄바꿈은 실제 Enter 대신 리터럴 `\n` 으로 넣는다.
- 선택 인자에서 “비움”을 명시하려면 `-` 를 쓸 수 있다 (`workingDir`, `retryText`, `traits_json`, `permissions_json`).
- **JSON 인자(PowerShell)**: `option_json` / `traits_json` / `permissions_json` 은 따옴표가 벗겨지지 않게  
  `'{\"delay\":60,\"count\":1}'` 형태로 넘긴다. (bash에서는 `'{"delay":60,"count":1}'` 로 충분)

---

## 서브 에이전트 (CSubAgent)

등록만 하면 서버 틱(`_ensureSubAgentSessions`)이 key 세션을 띄운다. 동일 key면 **덮어쓰기(upsert)**.

| 필드 | 설명 |
|------|------|
| key | 식별자 (PK) |
| provider / model | AI 프로바이더·모델 |
| score | 점수 (숫자) |
| workingDir | 작업 디렉터리 (기본 `./`) |
| super | `0`\|`1` — 슈퍼 모드(권한 자동 승인) |
| retryText / retryCount | 마지막 작업 done 후 idle일 때 자동 재지시 (count=0 이면 미사용) |
| traits | 문자열 배열 — 세션 지시문에 반영 |
| permissions | `{allow:[],deny:[]}` — 세션 추가 권한 (deny 우선) |

```
node ai/tool/work.js list-agent
→ [{key,provider,model,score,traits,workingDir,super,retryText,retryCount,permissions}, ...]

node ai/tool/work.js set-agent coder anthropic claude-sonnet-4
→ ok

node ai/tool/work.js set-agent coder anthropic claude-sonnet-4 0 ./proj 1 0 - "[\"backend\"]" -
→ ok

node ai/tool/work.js del-agent coder
→ ok  |  fail: not found
```

- `set-agent` 최소 인자: `<key> <provider> <model>`
- `traits_json`: JSON 배열 `["a","b"]` 또는 콤마 구분 `a,b`. 생략/`-` → `[]`
- `permissions_json`: `{"allow":[],"deny":[]}`. 생략/`-` → 빈 규칙

---

## 스케줄러 (CTerminalScheduler)

주기/시각마다 `command` 를 해당 `subAgentKey` 로 워크오더에 넣는다.  
발화 시 서버: `WorkOrder.Create("scheduler:<name>", subAgentKey, command)`. 동일 name이면 **덮어쓰기**.

| 필드 | 설명 |
|------|------|
| name | 스케줄 이름 (PK) |
| subAgentKey | 받을 서브 에이전트 key |
| mode | `interval` \| `time` |
| option | mode별 JSON (아래) |
| command | 발화 시 워크오더 content |

**option**
- `interval`: `delay` 필수(초, 1 이상). 선택 `count`, `start`, `end`, `autoEnd`
- `time`: `days` 필수(배열, 0=일…6=토 등 서버 규약). 선택 `hour`, `minute`, `autoEnd`
- `autoEnd` (선택, boolean): 종료 시 레코드를 자동 삭제할지 여부.
  - `interval`: `count`(0=무한 아님) 소진 시 삭제. 기본 `true`(생략 시 기존 동작과 동일).
  - `time`: 발동 즉시 1회성으로 보고 삭제(체크 시 이번 발동 후 종료). 기본 `false`(생략 시 매주 반복).

```
node ai/tool/work.js list-sched
→ [{name,subAgentKey,mode,option,command}, ...]

node ai/tool/work.js set-sched nightly-report coder interval "{\"delay\":3600,\"count\":0}" 일일 리포트 작성
→ ok

node ai/tool/work.js set-sched mon-standup coder time "{\"days\":[1],\"hour\":9,\"minute\":0}" 스탠드업 요약
→ ok

node ai/tool/work.js del-sched nightly-report
→ ok  |  fail: not found
```

---

## 워크오더 (CWorkOrder)

서브 에이전트(또는 팀 메인)에게 **지금 당장** 일을 넣을 때 사용. 서버 디스패치 틱이 `ready` 의뢰를 세션에 전송한다.

| status | 의미 |
|--------|------|
| ready | 대기 |
| working | 처리 중 |
| done | 완료 |
| failed | 실패 |

```
node ai/tool/work.js push main coder 이 버그 수정해줘\n파일: foo.ts
→ {id,status,requester,assignee,createdAt,content,result}

node ai/tool/work.js list-work
node ai/tool/work.js list-work ready 20
→ [...]

node ai/tool/work.js get 12
→ {id,...} | null

node ai/tool/work.js status 12 working
→ ok

node ai/tool/work.js result 12 done 수정 완료
→ ok

node ai/tool/work.js check main
node ai/tool/work.js check main 20260725120000
→ {teamKey,startedAt,now,elapsedMin,orders:{ready,working,done,failed,total},failedIds}
```

- `push <from> <to> <content...>`: `from`=requester, `to`=assignee(에이전트 key). content는 나머지 인자 합침.
- `check`: requester=`팀키` 인 의뢰만 집계. 시작시각 생략 시 해당 팀 첫 의뢰 시각 사용.
- 스케줄러가 만든 의뢰의 requester 는 `scheduler:<name>` 형태다.

---

## 흐름 요약

```
set-agent  → DB 카탈로그 등록 → (서버) 세션 자동 기동
set-sched  → DB 스케줄 등록  → (서버) 조건 충족 시 push 상당 WorkOrder 생성
push       → DB 의뢰 즉시 생성 → (서버) ready 의뢰를 세션에 전송
list-*/get/check/status/result → 조회·상태 관리
```

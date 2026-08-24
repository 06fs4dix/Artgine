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
node ai/tool/work.js set-agent <key> <provider> <model> [score] [workingDir] [super] [retryCount] [retryText] [traits_json] [permissions_json] [hidden]
node ai/tool/work.js del-agent <key>
node ai/tool/work.js list-sched
node ai/tool/work.js set-sched <name> <subAgentKey> <mode> <option_json> <command...>
node ai/tool/work.js del-sched <name>
node ai/tool/work.js get <id>
node ai/tool/work.js check <팀키> [시작시각]
node ai/tool/work.js push <from> <to> <content...>
node ai/tool/work.js status <id> <status>
node ai/tool/work.js result <id> <status> <result...>
node ai/tool/work.js watchdog
node ai/tool/work.js team-end <팀키>
node ai/tool/work.js start-team <provider> <model|-> <subAgents|-> <autoAgents_json|-> <limitMin|-> <goal...>
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
| hidden | `0`\|`1` — Control 좌측 사이드바 "서브 에이전트 숨기기" 토글이 켜졌을 때 이 사원의 세션을 숨길지. 팀장/팀이 자동 생성한 임시 사원은 이 카탈로그에 없으므로 hidden 대상이 될 수 없다(항상 표시됨). |

```
node ai/tool/work.js list-agent
→ [{key,provider,model,score,traits,workingDir,super,retryText,retryCount,permissions,hidden}, ...]

node ai/tool/work.js set-agent coder anthropic claude-sonnet-4
→ ok

node ai/tool/work.js set-agent coder anthropic claude-sonnet-4 0 ./proj 1 0 - "[\"backend\"]" - 1
→ ok

node ai/tool/work.js del-agent coder
→ ok  |  fail: not found
```

- `set-agent` 최소 인자: `<key> <provider> <model>`
- `traits_json`: JSON 배열 `["a","b"]` 또는 콤마 구분 `a,b`. 생략/`-` → `[]`
- `permissions_json`: `{"allow":[],"deny":[]}`. 생략/`-` → 빈 규칙
- `hidden`: `1`\|`true` → 숨김 대상. 생략 → `0`(항상 표시)

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

## 팀 (Team)

팀 메인(감독)은 임시 사원을 자동 배정받아 일을 배분한다. 감독 세션은 기동 시 브리핑 지시문을 받지만,
**그 지시문은 전송 중 일부가 유실될 수 있다**(PTY 대량 입력). 브리핑이 잘려 보이더라도 팀 운영 규칙은
**이 문서가 정본**이다 — 아래 내용은 브리핑에 보이지 않아도 반드시 지킨다.

### 시작 (start-team)

```
node ai/tool/work.js start-team <provider> <model|-> <subAgents|-> <autoAgents_json|-> <limitMin|-> <goal...>
→ {ok:true, token, teamKey, startedAt, autoAgents:[...]}
```

- `provider`: `claude`|`codex`|`antigravity`|`opencode`|`grok`
- `model`: 감독 세션 모델. 생략은 `-`
- `subAgents`: 카탈로그(수동 등록) 에이전트 key를 콤마로. 없으면 `-`
- `autoAgents_json`: `[{"provider":"claude","model":"claude-sonnet-5","count":1}]` 형태. 없으면 `-`. `subAgents`/`autoAgents_json` 중 최소 하나는 있어야 한다.
- `limitMin`: 팀 제한시간(분). 생략은 `-`(0 = 무제한)
- `goal`: 감독에게 줄 목표. 나머지 인자를 합쳐 `unescapeNewlines` 적용(줄바꿈은 `\n`)

**⚠️ 반드시 이 명령을 쓴다. curl로 `/cmd/start-team`을 직접 호출하지 않는다.**
curl.exe는 Windows에서 커맨드라인 인자를 ANSI 코드페이지(CP949 등)로 변환해서 받는 반면, Node는
인자를 유니코드 그대로 받는다 — 그래서 curl로 한글 등 비ASCII `goal`을 넘기면 서버에 퍼센트 인코딩된
깨진 바이트로 그대로 저장된다(디코딩이 아니라 애초에 잘못된 바이트가 인코딩된 것). `start-team`은 Node
프로세스 안에서 `URLSearchParams`로 직접 인코딩해 호출하므로 이 경로를 우회한다.

### 사원 key를 다룰 때 주의 — 전체 key를 그대로 쓸 것

자동 생성 사원의 key는 `<팀키>-<provider><번호>` 형태다(예: `team:6b54e877-claude1`). `work.js push`의
`<to>` 인자에는 **이 전체 문자열을 그대로** 써야 한다. 감독이 이 접두어를 빼고 `claude1`처럼 줄여서
push하면 `_dispatchWorkOrders`가 그 key로 세션을 찾지 못해(`_findByKey`가 null) 워크오더가 `ready`
상태에서 영원히 멈춘다 — `check`에는 잡히지만 `working`으로 전혀 넘어가지 않고, `watchdog`도 애초에
`working` 상태가 아니므로 손대지 못한다. 팀이 멈춘 것 같으면 `list-work ready`로 `assignee` 값이
실제 살아있는 사원 key(`cmd/sessions`)와 정확히 일치하는지부터 확인한다.

### 종료 (team-end) — 필수

```
node ai/tool/work.js team-end team:xxxxxxxx
→ {ok:true, teamKey, removed:[...]}
```

- 팀이 **어떤 이유로든** 멈추면 **가장 마지막 단계로** 실행한다. 종료 사유는 세 가지: 목표 달성 / 작업 하나라도 `failed` / 시간 초과(`check`의 `elapsedMin` > `timeLimitMin`).
- 실행하지 않으면 사원 세션이 그대로 남고, 서버 틱의 `_ensureSubAgentSessions`가 **죽여도 계속 되살려** 머신을 점유한다.

> ⚠️ **임시 사원은 DB가 아니라 서버 메모리(`gTeamTempAgents`)에 있다.**
> 그래서 `list-agent`에 **보이지 않고**, `del-agent`로는 `fail: not found`만 나온다.
> 목록에 없다고 "이미 정리됨"으로 판단하면 안 된다 — 정리 경로는 `team-end` **하나뿐**이다.
> (`team-end`는 pty를 죽여야 하므로 DB 직접 조작이 아니라 로컬 서버 `cmd/team-end`를 호출한다.
> 따라서 서버가 켜져 있어야 하고 `ai/tool/cookie.json`의 로컬 인증 토큰이 필요하다.)
> 팀장/팀 자동생성 사원이 이 카탈로그(DB)에 없다는 점은 Control 좌측 사이드바의 "서브 에이전트 숨기기"
> 판정과도 연결된다 — 그 기능은 카탈로그에 등록된 사원의 `hidden` 플래그만 보므로, 카탈로그에 없는
> 팀장/자동생성 사원은 숨김 토글 상태와 무관하게 항상 표시된다.

메인 세션이 `team-end` 없이 사라진 경우(사용자가 터미널 kill, CLI 자체 종료, pty 크래시)는
`_tickTeamCleanup`이 대신 정리하지만, 정상 종료 시 이것에 의존하지 않는다.

### 감시 (watchdog) — 주기 실행

```
node ai/tool/work.js watchdog
```

사원 프로세스가 크래시하거나 승인 대기로 멈추면 그 작업은 **`working`에 영원히 남고**
`check`로는 절대 `done`/`failed`가 되지 않아 감독이 무한 대기한다. `watchdog`은 그런 좀비를 찾아
세션을 죽이고 작업을 `ready`로 되돌려 재배분한다. `dispatch → check → watchdog → collect`를 반복한다.

## 흐름 요약

```
set-agent  → DB 카탈로그 등록 → (서버) 세션 자동 기동
set-sched  → DB 스케줄 등록  → (서버) 조건 충족 시 push 상당 WorkOrder 생성
push       → DB 의뢰 즉시 생성 → (서버) ready 의뢰를 세션에 전송
list-*/get/check/status/result → 조회·상태 관리
```

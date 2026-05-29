##  상속 구조
basic
ㄴgeometry,network
ㄴsystem,render
ㄴutil
ㄴapp
ㄴtool
ㄴplugin

## 자기 자신
Init : 최초 초기화
Destroy : 삭제
Reset : 초기화
Product 풀링된걸 가져옴
Recycle 재사용

## 컨테이너
Push : 넣기
Remove : 찾아서 삭제
Find : 찾기
Clear : 컨테이너 비우기
Modify : 찾아서 내부값 변경
List


## 자신안 멤버 컨트롤(컨테이너가 아니고 멤버 단일)
New : 생성후 내보냄
Build : 생성 내부에서,완전 초기화
Rebuild: 일부 수정
Release 삭제


Get/Set
ㄴ 내부 값 변경시가져오기. 벨류는 둘다 가능. 템플릿도 되고 뒤에 멤버명 붙여도 됌
Is 있냐 없냐 불리언 리턴시

Call 이벤트,콜백


Connect/DisConnect
비동기 네트워크나 다른 흐름에 연결시

Start : 시작시 호출
End : 끝날때
Update : 매번 호출
SubUpdate : 추가 업데이트
Render : 렌더링
Fixed : 물리 고정 타임



Register : 클래스가 아닌 등록. 외부에서 함수포인터로 사용하는 경우


Exe/Execute : 내가함. 행동 처리
Run : 상대를 시킴. 프로그램 실행
Stop : 멈춤

# 기본함수
Import/Export
Serial/Deserial,ExportCJson,ImportCJson,ExportJson
어떤 타입으로 할지

## 이벤트 함수
On : 이벤트 관련 받는쪽

# 데이터 전송 함수명
Send/Recv

# 폐킷 처리시 담을 그릇이 하는 역활
Req : 질문하는쪽 폐킷은(Request)
Ack : 받을쪽 폐킷 이름(Acknowledge)

# 약어
Mgr     매니저    
Info    데이터
Node    노드
Option  설정
Comp    컴포넌트
Chk     Check   
PT      Point    
PF      Platform 
AF      AniFlow  
RB      RigidBody
CL      Collider 



## 변수 접두사
m   멤버 변수          mKey, mEvent
s   static 멤버        sProductEvent
e   enum / 상태값      eDragState, eAnchor
g   전역 변수          gCanvas, gEvent
C   클래스 접두사      CObject, CEvent

## 파라미터
_   함수 파라미터에 언더바 접두사    _key, _event

## 키 네이밍
key : 식별자
ㄴ단 하나만 존재
label : 툴에서 보여주는 의미이고 프로세스에 영향없음
type : 단일 속성. 하나에 값으로 존재
ㄴ여러 오브젝트가 특정 구룹 확인용으로 사용
tag : 다중 속성. 어레이 형태로 존재
ㄴ태그가 포함되어 있는지 확인용
size : 수치값이 포함
count : 셀단위 몇개 있는지를 의미


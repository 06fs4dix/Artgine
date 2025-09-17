텍스쳐 변경은 에디터 수정,드래그 앤 드랍, 코드 수정 세가지 방식을 지원합니다
        
1.왼쪽 하이라키에서 2DCan를 선택해주세요.<br>
2.test 서브젝트를 선택해 주세요.<br>
3.F2를 눌러 리소스 뷰를 열어주세요.<br>
4.오른쪽 인스펙터에서 mConArr[0]에 CPaint2D를 아래에 3가지 방법으로 수정하면됩니다.

- 드래그엔 드랍
	- 리소스 뷰어에서 원하는 텍스쳐를 mConArr[0] : CPaint2D or mTexture에 드랍해주세요.
- 에디터 수정
	- 오른쪽 인스펙터에서 mComArr에 [0]배열에 오브젝트를 선택하세요.
	- mTexture에 원하는 텍스쳐로 리소스뷰에서 보고 수정해주세요. 

- 코드수정
	- RunTime 버튼누르고 코드 수정창을 엽니다.
	- gAtl.Canvas("2DCan").Find("test").FindComp(CPaint2D).SetTexture("none.png");
	- 코드를 작성하고 Excute합니다
	
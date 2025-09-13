Texture changes are supported in three ways: editor edits, drag & drop, and code changes.

1.In the left hierarchy, select 2DCan.
2.Select the test subject.
3.Press F2 to open the Resource Viewer.

- Drag & Drop
	- In the Resource Viewer, drop the desired texture onto mConArr[0] : CPaint2D or mTexture.
- Edit in the Editor
	- In the right Inspector, select the object in mComArr[0].
	- Change mTexture to the desired texture by selecting it in the Resource Viewer.
- Code Changes
	- Click the RunTime button to open the code editor.
	- gAtl.Canvas("2DCan").Find("test").FindComp(CPaint2D).SetTexture("none.png");
	- Write the code and click Excute.
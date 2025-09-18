**SampleCode를 RunTime코드창(스크롤 하단)에 추가해주세요!**
>작업이 다끝나면 [Excute]를 누르면 코드가 실행됩니다.

**html5 canvas함수로 텍스쳐를 만드는 코드**
```js
CH5Canvas.Init(256,256);
CH5Canvas.FillStyle("orange");
CH5Canvas.FillText(128,128,"test",128);
CH5Canvas.Draw();
let tex=CH5Canvas.GetNewTex();
gAtl.Frame().Ren().BuildTexture(tex);
gAtl.Frame().Res().Push("test.tex",tex);
```

**CCanvas에 CSubject 추가** 
```js
let can=gAtl.Canvas("2DCan");
let sub=can.PushSub(new CSubject());
sub.SetKey("test");
let pt=sub.PushComp(new CPaint2D("test.tex",new CVec2(100,100)));
sub.SetPos(new CVec3(-200,200));
```


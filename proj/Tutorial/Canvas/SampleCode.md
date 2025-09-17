**Please add the SampleCode to the RunTime code window**
>When you’re finished, click! [Excute]

**Code to create a texture using HTML5 canvas functions**
```js
CH5Canvas.Init(256,256);
CH5Canvas.FillStyle("orange");
CH5Canvas.FillText(128,128,"test",128);
CH5Canvas.Draw();
let tex=CH5Canvas.GetNewTex();
gAtl.Frame().Ren().BuildTexture(tex);
gAtl.Frame().Res().Push("test.tex",tex);
```

**Add a CSubject to CCanvas** 
```js
let can=gAtl.Canvas("2DCan");
let sub=can.PushSub(new CSubject());
sub.SetKey("test");
let pt=sub.PushComp(new CPaint2D("test.tex",new CVec2(100,100)));
sub.SetPos(new CVec3(-200,200));
```


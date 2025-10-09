### 3D X,Z 패턴 만들기
```javascript
let Main=gAtl.Canvas("Main");

let countX=20;
let countZ=20;
let size=99;
for(let x=0;x<countX;++x)
for(let z=0;z<countZ;++z)
{
    //let rand=Math.trunc(Math.random()*4)+1;랜덤패턴 추가시
    let sub=new CSubject();
    let pt3d=sub.PushComp(new CPaint3D("Res/Cobblestone_Dirt_Transition_"+rand+".obj",true,100));//리소스명을 넣으세요!
    sub.SetPos(new CVec3(size*x,0,size*z));
    Main.PushSub(sub);
    
}

```
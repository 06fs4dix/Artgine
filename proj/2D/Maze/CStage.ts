import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CCoroutine } from "https://06fs4dix.github.io/Artgine/artgine/util/CCoroutine.js";

export default class CStage
{
    static nextCorutine=new CCoroutine(CStage.Next);
    static mazeSize=new CVec2(5,5);
    static monCount=0;
    static small=0;

    static fog=false;
    static level=0;

    // static *Next()
    // {

    //     CConsol.Log(1);
    //     yield CCoroutine.eState.Stop;
    //     CConsol.Log(2);
        
    
    //     //return CCoroutine.eState.Loop;
    // }

    static *Next()
    {

        CStage.mazeSize.x+=2;
        CStage.mazeSize.y+=2;
        yield CCoroutine.eState.Stop;
        CStage.mazeSize.x+=2;
        CStage.mazeSize.y+=2;
        yield CCoroutine.eState.Stop;
        CStage.small+=2;
        yield CCoroutine.eState.Stop;
        CStage.small+=2;
        yield CCoroutine.eState.Stop;
        CStage.mazeSize.x+=2;
        CStage.mazeSize.y+=2;
        yield CCoroutine.eState.Stop;
        CStage.mazeSize.x+=2;
        CStage.mazeSize.y+=2;
        yield CCoroutine.eState.Stop;
        CStage.monCount+=2
        yield CCoroutine.eState.Stop;
        CStage.monCount+=2
        yield CCoroutine.eState.Stop;
        CStage.mazeSize.x+=2;
        CStage.mazeSize.y+=2;
        yield CCoroutine.eState.Stop;
        CStage.fog=true
    
        //return CCoroutine.eState.Loop;
    }

    static LevelUp()
    {
        CStage.level++;
        CStage.nextCorutine.Start();
    }
}

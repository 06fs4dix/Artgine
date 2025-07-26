
import {CObject} from "./CObject.js";
export class CPreferences extends CObject
{
    static eRenderer=
    {
        Null : "Null",
        GL : "GL",
        GPU : "GPU",
    };
    public mWidth=1024;
    public mHeight=768;

    public mTargetWidth=0;
    public mTargetHeight=0;

    public mTop=0;
    public mLeft=0;

    public mRenderer=CPreferences.eRenderer.GL;
    //뎁스맵을 32비트로 변경해줌. 정밀도가 올라가지만 속도가 느려짐
    public m32fDepth=false;
    
    //public m_async=false;
    public mTexture16f=false;
    public mAnti=true;
    public mBatchPool=true;
    public mXR=false;
    public mDeveloper=true;
    public mDebugMode=false;

    public mIAuto=false;
    public mWASM=false;
    public mServer="local";

    
    

}
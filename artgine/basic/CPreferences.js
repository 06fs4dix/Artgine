import { CObject } from "./CObject.js";
export class CPreferences extends CObject {
    static eRenderer = {
        Null: "Null",
        GL: "GL",
        GPU: "GPU",
    };
    mWidth = 1024;
    mHeight = 768;
    mTargetWidth = 0;
    mTargetHeight = 0;
    mTop = 0;
    mLeft = 0;
    mRenderer = CPreferences.eRenderer.GL;
    m32fDepth = false;
    mTexture16f = false;
    mAnti = false;
    mBatchPool = true;
    mXR = false;
    mDeveloper = true;
    mDebugMode = false;
    mIAuto = true;
    mServer = "local";
    mGitHub = false;
    mCanvas = "";
    mParallelShader = true;
    mVersion = "";
    mRTScaleW = 1.0;
    mRTScaleH = 1.0;
}

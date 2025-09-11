import { CClass } from "../../../artgine/basic/CClass.js";
import { Bootstrap } from "../../../artgine/basic/Bootstrap.js";
import { CAlert } from "../../../artgine/basic/CAlert.js";
import { CArray } from "../../../artgine/basic/CArray.js";
import { CBlackBoard } from "../../../artgine/basic/CBlackBoard.js";
import { CConsol } from "../../../artgine/basic/CConsol.js";
import { CDomFactory } from "../../../artgine/basic/CDOMFactory.js";
import { CEvent } from "../../../artgine/basic/CEvent.js";
import { CHash } from "../../../artgine/basic/CHash.js";
import { CJSON } from "../../../artgine/basic/CJSON.js";
import { CLan } from "../../../artgine/basic/CLan.js";
import { CModal } from "../../../artgine/basic/CModal.js";
import { CObject } from "../../../artgine/basic/CObject.js";
import { CPool } from "../../../artgine/basic/CPool.js";
import { CPreferences } from "../../../artgine/basic/CPreferences.js";
import { CUniqueID } from "../../../artgine/basic/CUniqueID.js";
import { CUtil } from "../../../artgine/basic/CUtil.js";
import { CUtilObj } from "../../../artgine/basic/CUtilObj.js";
import { CAtelier } from "../../../artgine/canvas/CAtelier.js";
import { CRenInfo } from "../../../artgine/canvas/CBrush.js";
import { CRenPriority } from "../../../artgine/canvas/CBrush.js";
import { CCanvas } from "../../../artgine/canvas/CCanvas.js";
import { CAniFlow } from "../../../artgine/canvas/component/CAniFlow.js";
import { CClip } from "../../../artgine/canvas/component/CAnimation.js";
import { CClipImg } from "../../../artgine/canvas/component/CAnimation.js";
import { CClipCoodi } from "../../../artgine/canvas/component/CAnimation.js";
import { CClipColorAlpha } from "../../../artgine/canvas/component/CAnimation.js";
import { CClipPRS } from "../../../artgine/canvas/component/CAnimation.js";
import { CClipMesh } from "../../../artgine/canvas/component/CAnimation.js";
import { CClipDestroy } from "../../../artgine/canvas/component/CAnimation.js";
import { CClipShaderAttr } from "../../../artgine/canvas/component/CAnimation.js";
import { CClipForce } from "../../../artgine/canvas/component/CAnimation.js";
import { CClipAudio } from "../../../artgine/canvas/component/CAnimation.js";
import { CClipVideo } from "../../../artgine/canvas/component/CAnimation.js";
import { CAnimation } from "../../../artgine/canvas/component/CAnimation.js";
import { CCamComp } from "../../../artgine/canvas/component/CCamComp.js";
import { CCollisionObject } from "../../../artgine/canvas/component/CCollider.js";
import { CCollider } from "../../../artgine/canvas/component/CCollider.js";
import { CColor } from "../../../artgine/canvas/component/CColor.js";
import { CAlpha } from "../../../artgine/canvas/component/CColor.js";
import { CColorVFX } from "../../../artgine/canvas/component/CColor.js";
import { CComponent } from "../../../artgine/canvas/component/CComponent.js";
import { CForce } from "../../../artgine/canvas/component/CForce.js";
import { CLight } from "../../../artgine/canvas/component/CLight.js";
import { CRigidBody } from "../../../artgine/canvas/component/CRigidBody.js";
import { CRenPaint } from "../../../artgine/canvas/component/paint/CPaint.js";
import { CPaint } from "../../../artgine/canvas/component/paint/CPaint.js";
import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
import { CPaintHTML } from "../../../artgine/canvas/component/paint/CPaint2D.js";
import { CPaint3D } from "../../../artgine/canvas/component/paint/CPaint3D.js";
import { CPaintTrail } from "../../../artgine/canvas/component/paint/CPaintTrail.js";
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CUI } from "../../../artgine/canvas/subject/CUI.js";
import { CUIText } from "../../../artgine/canvas/subject/CUI.js";
import { CUIPicture } from "../../../artgine/canvas/subject/CUI.js";
import { CUIButtonImg } from "../../../artgine/canvas/subject/CUI.js";
import { CUIButtonRGBA } from "../../../artgine/canvas/subject/CUI.js";
import { CUIProgressBar } from "../../../artgine/canvas/subject/CUI.js";
import { CBound } from "../../../artgine/geometry/CBound.js";
import { CFloat32 } from "../../../artgine/geometry/CFloat32.js";
import { CFloat32Mgr } from "../../../artgine/geometry/CFloat32Mgr.js"
import { CMat } from "../../../artgine/geometry/CMat.js";
import { CMath } from "../../../artgine/geometry/CMath.js";
import { CUtilMath } from "../../../artgine/geometry/CUtilMath.js";
import { CVec1 } from "../../../artgine/geometry/CVec1.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../../artgine/geometry/CVec4.js";
import { CCamera } from "../../../artgine/render/CCamera.js";
import { CH5CMDList } from "../../../artgine/render/CH5Canvas.js";
import { CH5Cmd } from "../../../artgine/render/CH5Canvas.js";
import { CH5Canvas } from "../../../artgine/render/CH5Canvas.js";
import { CTexture } from "../../../artgine/render/CTexture.js";
import { CUniform } from "../../../artgine/render/CUniform.js";
import { CInput } from "../../../artgine/system/CInput.js";
import { CRes } from "../../../artgine/system/CRes.js";
import { CStorage } from "../../../artgine/system/CStorage.js";
import { CTimer } from "../../../artgine/system/CTimer.js";
import { CCamCon } from "../../../artgine/util/CCamCon.js";
import { CCamCon3DFirstPerson } from "../../../artgine/util/CCamCon.js";
import { CCamCon3DThirdPerson } from "../../../artgine/util/CCamCon.js";
import { CCamCon2DFreeMove } from "../../../artgine/util/CCamCon.js";
import { CCamCon2DFollow } from "../../../artgine/util/CCamCon.js";
import { CCamShake } from "../../../artgine/util/CCamShake.js";
import { CCamShakeRandom } from "../../../artgine/util/CCamShake.js";
import { CCamShakeNoise } from "../../../artgine/util/CCamShake.js";
import { CCamShakeSine } from "../../../artgine/util/CCamShake.js";
import { CCoroutine } from "../../../artgine/util/CCoroutine.js";
import { CFontRef } from "../../../artgine/util/CFont.js";
import { CFontOption } from "../../../artgine/util/CFont.js";
import { CFont } from "../../../artgine/util/CFont.js";
import { CLoader } from "../../../artgine/util/CLoader.js";
import { CPalette } from "../../../artgine/util/CPalette.js";
import { CRandom } from "../../../artgine/util/CRandom.js";
import { CUtilWeb } from "../../../artgine/util/CUtilWeb.js";
// EntryPoint / 진입점
// Get Atelier from main entry point / 메인 진입점에서 아틀리에 가져오기
let gAtl=CAtelier.Main();
CLan.Set(CLan.eType.en,"Test0","Code has been executed.");
CAlert.Info(CLan.Get("Test0","Code를 실행했습니다."),1000*10);

// Get 2D Canvas / 2D 캔버스를 가져온다
let can=gAtl.Canvas("2DCan");
//기존 캔버스 서브젝트 삭제
can.Clear();
// Create Subject / 서브젝트 생성
let sub=can.PushSub(new CSubject());
// Add Paint. Set with None texture and size / 페인트 추가. None 텍스처로 넣고 사이즈 설정
let pt=sub.PushComp(new CPaint2D(gAtl.Frame().Pal().GetNoneTex(),new CVec2(100,100)));
// Position x200,y200 / 포지션 x200,y200
sub.SetPos(new CVec3(200,200));
// Change to green O Color* T Color / 초록으로 변경 O Color* T Color
pt.SetColorModel(new CColor(0,1,0,CColor.eModel.RGBMul));

// Create texture directly on canvas / 캔버스에서 직접 텍스처 생성
CH5Canvas.Init(256,256);
CH5Canvas.FillStyle("green");
CH5Canvas.FillRect(0,0,256,256);
CH5Canvas.FillStyle("orange");
CH5Canvas.FillText(128,128,"test",128);
CH5Canvas.Draw();
let tex=CH5Canvas.GetNewTex();
// Also create GPU buffer / GPU 버퍼도 생성
gAtl.Frame().Ren().BuildTexture(tex);
// Register in resource map / 리소스 맵에 등록
gAtl.Frame().Res().Push("test.tex",tex);

sub=can.PushSub(new CSubject());
pt=sub.PushComp(new CPaint2D("test.tex",new CVec2(100,100)));
sub.SetPos(new CVec3(-200,200));

//오브젝트 이동하기
gAtl.Frame().PushEvent(CEvent.eType.Update,()=>{
    let tick=5;
    if(gAtl.Frame().Input().KeyDown(CInput.eKey.Left))
        sub.SetPos(CMath.V3AddV3(new CVec3(-tick,0),sub.GetPos()));
    if(gAtl.Frame().Input().KeyDown(CInput.eKey.Right))
        sub.SetPos(CMath.V3AddV3(new CVec3(tick,0),sub.GetPos()));
    if(gAtl.Frame().Input().KeyDown(CInput.eKey.Up))
        sub.SetPos(CMath.V3AddV3(new CVec3(0,tick),sub.GetPos()));
    if(gAtl.Frame().Input().KeyDown(CInput.eKey.Down))
        sub.SetPos(CMath.V3AddV3(new CVec3(0,-tick,0),sub.GetPos()));
});

// Please Execute when work is complete! / 작업을 완료하면 Execute해주세요!
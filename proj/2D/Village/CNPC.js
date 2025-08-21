import { CModal } from "../../../artgine/basic/CModal.js";
import { CAniFlow } from "../../../artgine/canvas/component/CAniFlow.js";
import { CAnimation, CClipCoodi } from "../../../artgine/canvas/component/CAnimation.js";
import { CCollider } from "../../../artgine/canvas/component/CCollider.js";
import { CRigidBody } from "../../../artgine/canvas/component/CRigidBody.js";
import { CSMPattern, CStateMachine } from "../../../artgine/canvas/component/CStateMachine.js";
import { CPaint2D } from "../../../artgine/canvas/component/paint/CPaint2D.js";
import { CSubject } from "../../../artgine/canvas/subject/CSubject.js";
import { CVec2 } from "../../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../../artgine/geometry/CVec3.js";
import { CTexture } from "../../../artgine/render/CTexture.js";
import { CInput } from "../../../artgine/system/CInput.js";
import { CShadowPlane } from "../../../plugin/ShadowPlane/ShadowPlane.js";
export class CNPC extends CSubject {
    mRB;
    mAF;
    mPT;
    mCL;
    mBDir = new CVec3();
    mAniMap = new Map();
    mBaseImage = "";
    mName = "";
    mDialogueIndex = 0;
    mLastTalkTime = 0;
    mTalkCount = 0;
    mDialogueData = new Map();
    constructor(_name, _baseImg) {
        super();
        this.mBaseImage = _baseImg;
        this.mName = _name;
        this.InitializeDialogueData();
    }
    InitializeDialogueData() {
        this.mDialogueData.set("Dante", [
            "안녕하신가, 용사여! 마을을 지키는 것이 내 사명이지.",
            "오늘도 마을은 평화롭구나. 하지만 언제든지 위험이 닥칠 수 있어.",
            "전투 기술을 배우고 싶다면 언제든 말해라. 내가 가르쳐주지.",
            "마을 밖의 몬스터들이 요즘 더욱 사나워지고 있어. 조심해야 해.",
            "용감함이란 두려움을 모르는 것이 아니라, 두려움을 극복하는 것이지.",
            "내 검은 마을을 위해 언제든지 뽑을 준비가 되어 있어.",
            "오늘 날씨가 좋구나. 전투 훈련하기 딱 좋은 날씨야.",
            "마을 사람들을 지키는 것이 내 자랑이야. 언제든지 도움이 필요하면 말해라.",
            "전투에서 가장 중요한 것은 기술이 아니라 마음가짐이야.",
            "내가 여기 있는 한 마을은 안전할 거야. 믿어도 좋아."
        ]);
        this.mDialogueData.set("Miles", [
            "어서오세요! 오늘도 좋은 물건 많이 팔고 있어요~",
            "이 물건 어때요? 특별히 당신을 위해 할인해드릴게요!",
            "마을 사람들과의 교류가 제일 중요해요. 상호작용이 핵심이죠.",
            "오늘은 어떤 물건을 찾고 계신가요? 제가 추천해드릴게요!",
            "좋은 물건은 좋은 가격에 팔아야 해요. 그래야 모두가 행복하니까요.",
            "마을의 소문을 많이 알고 있어요. 궁금한 게 있으면 언제든 물어보세요!",
            "이 물건은 제가 직접 만든 거예요. 품질 보장합니다!",
            "상인으로서의 자부심이 있어요. 고객 만족이 최우선이죠.",
            "마을 경제가 좋아져야 모두가 행복해져요. 제가 노력하고 있어요!",
            "오늘도 좋은 하루 되세요! 언제든지 들러주세요~"
        ]);
        this.mDialogueData.set("Poppy", [
            "어서오세요, 신비로운 여행자여... 마법의 세계에 오신 것을 환영합니다.",
            "별들이 오늘 밤 특별한 메시지를 전하고 있어요. 느껴보셨나요?",
            "마법은 마음에서 나오는 거예요. 순수한 마음을 가진 자만이 진정한 마법을 쓸 수 있어요.",
            "시간은 흐르고, 마법은 변하지만, 진정한 마음은 변하지 않아요.",
            "오늘 밤 하늘을 보세요. 달이 특별한 에너지를 뿌리고 있어요.",
            "마법의 비밀을 알고 싶으시다면... 하지만 그건 쉽지 않아요.",
            "자연의 소리를 들어보세요. 마법의 메시지가 숨어있어요.",
            "모든 것이 연결되어 있어요. 당신과 나, 그리고 이 마을까지...",
            "마법은 보이지 않는 힘이에요. 하지만 느낄 수 있어요.",
            "신비로운 여정을 떠나고 싶으시다면, 제가 도와드릴 수 있어요..."
        ]);
    }
    GetDialogue() {
        const dialogues = this.mDialogueData.get(this.mName);
        if (!dialogues)
            return "안녕하세요...";
        const currentTime = Date.now();
        if (currentTime - this.mLastTalkTime > 5000) {
            this.mDialogueIndex = (this.mDialogueIndex + 1) % dialogues.length;
            this.mLastTalkTime = currentTime;
        }
        this.mTalkCount++;
        if (this.mTalkCount === 1) {
            return `어서오세요, ${this.mName}입니다! ${dialogues[this.mDialogueIndex]}`;
        }
        else if (this.mTalkCount === 3) {
            return `다시 만나서 반가워요! ${dialogues[this.mDialogueIndex]}`;
        }
        else if (this.mTalkCount === 5) {
            return `자주 오시는군요! ${dialogues[this.mDialogueIndex]}`;
        }
        else if (this.mTalkCount % 10 === 0) {
            return `정말 오랜 친구가 되었네요! ${dialogues[this.mDialogueIndex]}`;
        }
        return dialogues[this.mDialogueIndex];
    }
    Start() {
        this.mPT = this.PushComp(new CPaint2D(this.mBaseImage, new CVec2(100, 100)));
        this.mPT.mSave = false;
        this.mPT.mAutoLoad.mFilter = CTexture.eFilter.Neaest;
        this.mPT.SetYSort(true);
        this.mPT.SetYSortOrigin(-50);
        this.mRB = this.PushComp(new CRigidBody());
        this.mRB.mSave = false;
        this.mRB.SetRestitution(0);
        this.mSave = false;
        this.mCL = this.PushComp(new CCollider(this.mPT));
        this.mCL.mSave = false;
        this.mCL.SetLayer("player");
        this.mCL.PushCollisionLayer("object");
        this.mCL.PushCollisionLayer("player");
        this.mCL.SetPickMouse(true);
        this.PushComp(new CShadowPlane());
        let sm = this.PushComp(new CStateMachine());
        sm.PushPattern(new CSMPattern("StandLeft", [], []));
        sm.PushPattern(new CSMPattern("StandLeft", ["Last" + CVec3.eDir.Left], ["move"]));
        sm.PushPattern(new CSMPattern("StandRight", ["Last" + CVec3.eDir.Right], ["move"]));
        sm.PushPattern(new CSMPattern("StandUp", ["Last" + CVec3.eDir.Up], ["move"]));
        sm.PushPattern(new CSMPattern("StandDown", ["Last" + CVec3.eDir.Down], ["move"]));
        sm.PushPattern(new CSMPattern("MoveLeft", ["move" + CVec3.eDir.Left], []));
        sm.PushPattern(new CSMPattern("MoveRight", ["move" + CVec3.eDir.Right], []));
        sm.PushPattern(new CSMPattern("MoveUp", ["move" + CVec3.eDir.Up], []));
        sm.PushPattern(new CSMPattern("MoveDown", ["move" + CVec3.eDir.Down], []));
        let ani = new CAnimation();
        ani.Push(new CClipCoodi(0, 0, 0, 0, 16, 16));
        this.mAniMap.set("StandDown", ani);
        ani = new CAnimation();
        ani.Push(new CClipCoodi(0, 0, 1 * 16, 0, 2 * 16, 16));
        this.mAniMap.set("StandUp", ani);
        ani = new CAnimation();
        ani.Push(new CClipCoodi(0, 0, 2 * 16, 0, 3 * 16, 16));
        this.mAniMap.set("StandLeft", ani);
        ani = new CAnimation();
        ani.Push(new CClipCoodi(0, 0, 3 * 16, 0, 4 * 16, 16));
        this.mAniMap.set("StandRight", ani);
        let tick = 100;
        ani = new CAnimation();
        for (let i = 0; i < 4; ++i)
            ani.Push(new CClipCoodi(i * tick, tick, 0, i * 16, 16, (1 + i) * 16));
        this.mAniMap.set("MoveDown", ani);
        ani = new CAnimation();
        for (let i = 0; i < 4; ++i)
            ani.Push(new CClipCoodi(i * tick, tick, 1 * 16, i * 16, 2 * 16, (1 + i) * 16));
        this.mAniMap.set("MoveUp", ani);
        ani = new CAnimation();
        for (let i = 0; i < 4; ++i)
            ani.Push(new CClipCoodi(i * tick, tick, 2 * 16, i * 16, 3 * 16, (1 + i) * 16));
        this.mAniMap.set("MoveLeft", ani);
        ani = new CAnimation();
        for (let i = 0; i < 4; ++i)
            ani.Push(new CClipCoodi(i * tick, tick, 3 * 16, i * 16, 4 * 16, (1 + i) * 16));
        this.mAniMap.set("MoveRight", ani);
        this.mAF = this.PushComp(new CAniFlow(ani));
        this.mAF.mSave = false;
    }
    StandLeft() {
        this.mAF.ResetAni(this.mAniMap.get("StandLeft"));
    }
    StandRight() {
        this.mAF.ResetAni(this.mAniMap.get("StandRight"));
    }
    StandUp() {
        this.mAF.ResetAni(this.mAniMap.get("StandUp"));
    }
    StandDown() {
        this.mAF.ResetAni(this.mAniMap.get("StandDown"));
    }
    MoveLeft() {
        this.mAF.ResetAni(this.mAniMap.get("MoveLeft"));
    }
    MoveRight() {
        this.mAF.ResetAni(this.mAniMap.get("MoveRight"));
    }
    MoveUp() {
        this.mAF.ResetAni(this.mAniMap.get("MoveUp"));
    }
    MoveDown() {
        this.mAF.ResetAni(this.mAniMap.get("MoveDown"));
    }
    PickMouse(_rayMouse) {
        if (this.GetFrame().Input().KeyUp(CInput.eKey.LButton)) {
            let modal = new CModal("NPCModal");
            modal.SetTitle(CModal.eTitle.TextFullClose);
            modal.SetHeader(this.mName);
            const dialogue = this.GetDialogue();
            modal.SetBody(dialogue);
            modal.SetSize(400, 300);
            modal.Open();
        }
    }
}

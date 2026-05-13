import { CAniFlow } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CAniFlow.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CCollider.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CRigidBody.js";
import { CPaint2D, CPaintHTML } from "https://06fs4dix.github.io/Artgine/artgine/app/component/paint/CPaint2D.js";
import { CRayMouse } from "https://06fs4dix.github.io/Artgine/artgine/app/CRayMouse.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSubject.js";
import { CUpdate } from "https://06fs4dix.github.io/Artgine/artgine/basic/Basic.js";
import { CDOM } from "https://06fs4dix.github.io/Artgine/artgine/basic/CDOM.js";
import { CModal } from "https://06fs4dix.github.io/Artgine/artgine/basic/CModal.js";
import { CVec2 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec2.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CInput } from "https://06fs4dix.github.io/Artgine/artgine/system/CInput.js";
import { CCoroutine } from "https://06fs4dix.github.io/Artgine/artgine/util/CCoroutine.js";
import { CULPC } from "https://06fs4dix.github.io/Artgine/artgine/util/parser/CParserULPC.js";
import { CShadowPlane } from "https://06fs4dix.github.io/Artgine/plugin/ShadowPlane/ShadowPlane.js";


export class CNPC extends CSubject
{
    mRB:  CRigidBody | null = null;
    mAF:  CAniFlow   | null = null;
    mPT:  CPaint2D   | null = null;
    mCL:  CCollider  | null = null;
    mName = "";

    private mCulpc:  CULPC  | null = null;
    private mState:  string = "idle";
    private mDir:    number = CVec3.eDir.Down;
    private mLoaded  = false;

    // 대화 관련 속성들
    private mDialogueIndex: number = 0;
    private mLastTalkTime:  number = 0;
    private mTalkCount:     number = 0;

    // NPC별 대화 데이터
    private mDialogueData: Map<string, string[]> = new Map();

    constructor(_name: string)
    {
        super();
        this.mName = _name;
        this.InitializeDialogueData();
    }

    // NPC별 대화 데이터 초기화
    private InitializeDialogueData()
    {
        // Dante - 전사/용감한 성격
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

        // Miles - 상인/친근한 성격
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

        // Poppy - 마법사/신비로운 성격
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

    // 대화 선택 로직
    private GetDialogue(): string
    {
        const dialogues = this.mDialogueData.get(this.mName);
        if (!dialogues) return "안녕하세요...";

        const currentTime = Date.now();

        if (currentTime - this.mLastTalkTime > 5000) {
            this.mDialogueIndex = (this.mDialogueIndex + 1) % dialogues.length;
            this.mLastTalkTime  = currentTime;
        }

        this.mTalkCount++;
        if (this.mTalkCount === 1) {
            return `어서오세요, ${this.mName}입니다! ${dialogues[this.mDialogueIndex]}`;
        } else if (this.mTalkCount === 3) {
            return `다시 만나서 반가워요! ${dialogues[this.mDialogueIndex]}`;
        } else if (this.mTalkCount === 5) {
            return `자주 오시는군요! ${dialogues[this.mDialogueIndex]}`;
        } else if (this.mTalkCount % 10 === 0) {
            return `정말 오랜 친구가 되었네요! ${dialogues[this.mDialogueIndex]}`;
        }

        return dialogues[this.mDialogueIndex];
    }

    override Start()
    {
        this.GetFrame().Load().Exe("Res/ulpc/"+this.mName+".json");

        this.mPT = this.PushComp(new CPaint2D(null, new CVec2(64, 64)));
        this.mPT.mSave = false;
        this.mPT.SetAutoLoad(false);
        this.mPT.SetYSort(true);
        //this.mPT.SetYSortOrigin(-64);

        const flow     = this.PushComp(new CAniFlow());
        flow.mSave     = false;
        flow.mPaintOff = 0;
        this.mAF       = flow;

        this.mRB       = this.PushComp(new CRigidBody());
        this.mRB.mSave = false;

        this.mSave = false;

        this.mCL = this.PushComp(new CCollider(this.mPT));
        this.mCL.mSave = false;
        this.mCL.SetLayer("player");
        this.mCL.PushCollisionLayer("object");
        this.mCL.PushCollisionLayer("player");
        this.mCL.SetPickMouse(true);
        this.mCL.SetRestitution(0);

        this.PushComp(new CShadowPlane());

        let co = new CCoroutine(this.AutoChat, this);
        co.Start();
    }

    override Update(_update: CUpdate)
    {
        if (!this.mLoaded) {
            const culpc = this.GetFrame().Res().Find("Res/ulpc/"+this.mName+".json") as CULPC;
            if (culpc) {
                this.mPT.SetTexture(culpc.mTexture.Key());
                this.mCulpc  = culpc;
                this.mLoaded = true;
            }
        }

        if (this.mLoaded) {
            const ani = this.mCulpc.GetAni(this.mState, this.mDir);
            if (ani) this.mAF.SetAni(ani);
        }

        super.Update(_update);
    }

    PickMouse(_rayMouse: CRayMouse)
    {
        if (this.GetFrame().Input().KeyUp(CInput.eKey.LButton))
        {
            let modal = new CModal("NPCModal");
            modal.SetTitle(CModal.eTitle.TextFullClose);
            modal.SetHeader(this.mName);
            modal.SetBody(this.GetDialogue());
            modal.SetSize(400, 300);
            modal.Open();
        }
    }

    mLastChat: CPaintHTML;
    *AutoChat()
    {
        const raw = this.GetDialogue();
        const bubble = `
        <div class="card border-0 shadow-sm bg-white rounded-4">
            <div class="card-body py-2 px-3 text-body d-inline-block text-wrap"
                style="max-width:256px; min-width:256px; width:256px; word-break:keep-all; overflow-wrap:break-word; flex:0 0 auto;">
            ${raw}
            </div>
        </div>
        `;

        this.mLastChat = new CPaintHTML(CDOM.DataToDom(bubble));
        this.mLastChat.SetPivot(new CVec3(0, 1, 0));
        this.mLastChat.SetPos(new CVec3(0, 30, 0));
        this.PushComp(this.mLastChat);
        yield CCoroutine.Wait(1000 * 5);
        this.mLastChat.Destroy();
        yield CCoroutine.Wait(1000 * 2);
        return CCoroutine.eState.Loop;
    }

}
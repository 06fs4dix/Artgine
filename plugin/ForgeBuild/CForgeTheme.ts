//타입: 양식(mCulture)·시대(mEra)·지역(mRegion)이 정하는 생성 형식 + 색·재질 세트. 생성기는 고정 색 대신 오브젝트의 타입에서 색을 꺼내 쓴다(텍스처는 밝기 무늬라 색을 곱해 재질이 바뀐다).
//타입 이름은 "양식_시대[_지역]". 타입은 생성되는 모양이 달라질 때만 나눈다. 색만 다른 변형은 타입으로 만들지 않고 오브젝트 덮어쓰기(over)로 바꾼다
export class CForgeTheme
{
    mLabel = "";
    mCulture = 0;           //건축 양식 = 0 유럽 · 1 한국 · 2 일본 · 3 중국 · 4 아랍 · 5 이집트 · 6 남미(안데스) · 7 아프리카 · 8 몽골(성벽·탑·사찰·집은 양식마다 생성기가 다르다)
    mEra = 0;               //시대 = -1 고대 · 0 중세 · 1 근세 · 2 근대
    mRegion = "";

    mWallBody = [0.93, 0.88, 0.78];
    mWallStone = [0.66, 0.62, 0.56];
    mWallCap = [0.8, 0.76, 0.69];
    mTowerBody = [0.88, 0.84, 0.76];
    mDark = [0.17, 0.15, 0.14];
    mPlaster = [[0.96, 0.94, 0.88], [0.95, 0.9, 0.78], [0.93, 0.89, 0.84], [0.97, 0.93, 0.86]];
    mRoof = [[0.74, 0.34, 0.24], [0.62, 0.3, 0.22], [0.47, 0.36, 0.3], [0.42, 0.45, 0.56]];
    mShutter = [[0.36, 0.55, 0.38], [0.33, 0.47, 0.66], [0.66, 0.3, 0.24], [0.5, 0.38, 0.24]];
    mStone = [0.66, 0.62, 0.56];
    mWood = [0.38, 0.26, 0.17];
    mBrick = [0.6, 0.33, 0.25];
    mFlower = [[0.92, 0.42, 0.55], [0.95, 0.78, 0.3], [0.85, 0.3, 0.3], [0.7, 0.5, 0.9]];
    mGreen = [0.36, 0.55, 0.25];
    mMetal = [0.36, 0.34, 0.33];
    mIron = [0.12, 0.12, 0.13];
    mFenceWood = [0.5, 0.36, 0.23];
    mDirt = [0.7, 0.6, 0.45];
    mPebble = [[0.74, 0.71, 0.66], [0.66, 0.63, 0.58], [0.8, 0.77, 0.71]];
    mGlaze = [0.82, 0.6, 0.16];
    mTempleSign = "大雄殿";
    mBoard = [0.2, 0.18, 0.17];
    mBamboo = [0.72, 0.64, 0.44];
    mCloth = [[0.2, 0.26, 0.45], [0.36, 0.22, 0.18], [0.22, 0.22, 0.24]];
    mMud = [[0.72, 0.6, 0.44], [0.66, 0.55, 0.4], [0.76, 0.65, 0.5]];
    mPaper = [0.95, 0.91, 0.8];
    mPillar = [0.55, 0.2, 0.14];
    mBeam = [0.28, 0.5, 0.43];
    mThatch = [[0.8, 0.68, 0.44], [0.74, 0.62, 0.4], [0.68, 0.58, 0.38]];
    mShingle = [[0.46, 0.37, 0.29], [0.52, 0.44, 0.35], [0.4, 0.37, 0.34]];
    mTurf = [[0.42, 0.5, 0.26], [0.38, 0.46, 0.24], [0.46, 0.52, 0.3]];
    mLogWood = [[0.52, 0.4, 0.28], [0.44, 0.33, 0.23]];
    mPlankWall = [[0.62, 0.48, 0.34], [0.55, 0.41, 0.29], [0.7, 0.57, 0.42], [0.52, 0.44, 0.36]];
    mLogWall = [[0.6, 0.43, 0.28], [0.52, 0.37, 0.25], [0.66, 0.5, 0.34]];
    mClapboard = [[0.94, 0.93, 0.89], [0.9, 0.9, 0.86], [0.88, 0.9, 0.92]];
    mAdobe = [[0.78, 0.62, 0.44], [0.74, 0.58, 0.41], [0.82, 0.67, 0.48]];
    mFelt = [[0.93, 0.91, 0.86], [0.9, 0.88, 0.83]];
    mGold = [0.86, 0.66, 0.26];
    mGround = [[0.45, 0.66, 0.27], [0.33, 0.55, 0.22]];   //바닥 지형 색(겉·짙은 얼룩). 편집기가 타입을 바꿀 때 지형을 이 색으로 칠한다
    mArid = false;          //건조 지역(사막·반사막): 편집기가 숲·풀 식생을 끈다
    mPaint = [[0.12, 0.12, 0.13], [0.86, 0.22, 0.16], [0.18, 0.36, 0.7], [0.95, 0.76, 0.16], [0.22, 0.56, 0.36]];

    //재질 종류. 집은 후보 중 하나를 시드로 고른다(오브젝트 옵션으로 정하면 그 값을 쓴다)
    mHouseWall = [0];       //집 벽 = 0 회벽 · 1 널판 · 2 통나무 · 3 돌 · 4 한옥 기와집 · 5 초가 민가 · 6 일본 마치야 · 7 일본 초가 민가 · 8 중국 사합원채 · 9 중국 휘파 민가 · 10 벽돌 · 11 흰 칠 널판(서양식)
                            //· 12 평지붕 흙·돌집(아랍·이집트·사헬) · 13 원형 집(mHut) · 14 잉카 석조 초가집 · 15 식민 2층집(잉카 석축 위 회벽·나무 발코니) · 16 오스만 목조 돌출층 집 · 17 은데벨레 채색 흙집
    mRoofKind = [0];        //유럽식 집 지붕 = 0 기와 · 1 초가 · 2 너와 · 3 잔디 · 4 둥근 테라코타 기와 · 5 금속판
    mWallKind = 0;          //성벽 = 0 돌 · 1 목책
    mTowerKind = 0;         //탑 = 0 돌 · 1 나무 망루

    //생성 형식(모양을 바꾸는 값)
    mTimber = true;         //유럽 집: 반목조 골조 허용
    mPitch = 1;             //유럽 집: 지붕 경사 배율(지중해·르네상스는 완만, 저지대·대륙 근대는 가파름)
    mDormer = true;         //유럽 집: 지붕창
    mIvy = true;            //유럽 집: 담쟁이·벗겨진 회벽
    mStepGable = false;     //유럽 집: 맞배 끝 계단식 박공(저지대 벽돌집)
    mSash = false;          //유럽 집: 흰 칠 창틀 격자 유리(근세 저지대·이탈리아, 근대 오르내리창). 아니면 납틀 마름모 유리
    mGlazed = true;         //유럽 집: 창에 유리. 아니면 널판 덧문만(중세 북유럽)
    mArchWin = false;       //유럽 집: 반원 아치 머리 창(르네상스 팔라초), 덧창 없음
    mMansard = false;       //유럽 집: 망사르드 지붕(아래 가파른 면 + 위 완만한 면, 아래 면에 돌 지붕창)
    mChimney = true;        //유럽 집: 벽돌 굴뚝
    mClassical = false;     //유럽 집: 창 위 박공 머리·처마 코니스·네모 문(르네상스 이후)
    mBalcony = false;       //유럽 집: 위층 철 발코니(대륙 근대)
    mFlowerBox = false;     //창 밑 꽃 상자(19세기 이후 풍경)
    mItabuki = false;       //일본 마치야: 돌 얹은 판자 지붕 단층(중세)
    mBrickHouse = true;     //중국 사합원채: 벽돌 벽 경산식(근세). 아니면 회벽·목조 골조에 박공이 나온 현산식(송)
    mChurch = 0;            //교회 = -1 그 양식의 사찰 · 0 고딕 · 1 스타브 교회 · 2 로마네스크(따로 선 종탑) · 3 돔 교회(르네상스·신고전)
                            //· 4 모스크(mMosque) · 5 이집트 신전(mTemple 0 신왕국 탑문 신전 · 1 고왕국 피라미드) · 6 사헬 진흙 모스크 · 7 잉카 신전 · 8 짐바브웨 대울타리 · 9 족장 대형 집(mHut: 몽골 오르도 게르 · 줄루 대형 오두막)
    mMosque = 0;            //모스크 = 0 맘루크(줄무늬 석조·돔·팔각 미나레트) · 1 오스만(중앙 대돔·연필형 미나레트) · 2 마그레브(녹색 기와·사각 미나레트)
    mHut = 0;               //원형 집 = 0 게르(펠트) · 1 원뿔 초가 흙집(론다벨) · 2 벌집 초가 오두막
    mParapet = 0;           //평지붕 집 지붕 끝 = 0 민 난간 · 1 계단형 성가퀴(이슬람) · 2 둥근 흙 테(사헬·이집트) · 3 피라미드 머리 타(마그레브)
    mArch = 0;              //아랍·안데스 문·창 머리 = CForgeOpening.eKind(0 네모 · 1 반원 · 2 뾰족 · 3 사다리꼴 · 4 말굽)
    mToron = false;         //사헬: 흙벽에서 튀어나온 나무 막대(토론)·모서리 원뿔 첨두
    mLattice = false;       //아랍: 위층 나무 격자 돌출창(마슈라비야)
    mRoofDeck = false;      //이집트: 지붕 위 기둥 차양·바람 잡이(말카프)
    mChurchMat = 0;         //서양 교회·시계탑 재질 = 0 돌 · 1 나무 · 2 벽돌 · 3 흰 칠 널판
    mSpire = 0;             //고딕 종탑 지붕 = 0 첨탑 · 1 바로크 양파 모자
    mTemple = 0;            //사찰 변형 = 한국 0 다포 팔작 · 1 주심포 맞배(고려) / 일본 0 화양 본당 · 1 선종 불당(무로마치) / 중국 0 겹처마 · 1 송식 홑처마
    mRoofLift = 1;          //중국 처마 들림 배율(남방은 크게, 송은 작게)
    mWallStyle = 0;         //성벽 = 유럽 0 성가퀴 · 1 제비꼬리 성가퀴 · 2 능보 요새 · 3 담장 / 한국 1 토성 / 일본 1 토루·판벽 / 중국 1 판축 토성
                            //아랍 0 계단형 성가퀴 석벽 · 1 판축 흙벽(피라미드 머리 타) · 2 오스만 석벽 / 이집트 0 흙벽돌 경사벽(돌 탑문) · 1 고왕국 흙벽돌 감실 벽
                            //남미 0 잉카 다각석 지그재그 단 성벽 · 1 식민 흙담(성벽 없는 식민 도시) / 아프리카 0 사헬 흙벽 · 1 짐바브웨 건식 석벽 · 2 은데벨레 채색 마당 담(성벽 없음)
                            //몽골 0 흙 토성(카라코룸) · 1 스투파 사원 담 · 2 유목 진영 나무 울타리(성벽 없음). 성벽 없는 형식은 탑 자리에 그 문화권의 다른 것을 세운다(식민 종루·둥근 집·게르 수레)
    mTowerStyle = 0;        //탑 = 0 양식 기본 · 1 능보 · 2 시계탑
    mTowerShape = -1;       //유럽 탑 단면 = -1 오브젝트 값 · 0 원 · 1 네모
    mMonument = 0;          //조형물 = CForgeTheme.eMonument
    mFence = 0;             //울타리 = CForgeTheme.eFence
    mBridge = 0;            //다리 = CForgeTheme.eBridge

    static eCulture = { Europe : 0, Korea : 1, Japan : 2, China : 3, Arab : 4, Egypt : 5, Andes : 6, Africa : 7, Mongol : 8 };
    static eEra = { Ancient : -1, Medieval : 0, EarlyModern : 1, Modern : 2 };
    static eMonument = { Cross : 0, StonePagoda : 1, WoodPagoda : 2, BrickPagoda : 3, Runestone : 4, Obelisk : 5, Arch : 6, Column : 7, OctaPagoda : 8, Gorinto : 9, DenseEave : 10,
        Pyramid : 11, Sphinx : 12, Fountain : 13, Intihuatana : 14, Ovoo : 15, Stupa : 16, BirdPillar : 17, MudTomb : 18, Cairn : 19, PlazaFountain : 20, Lamp : 21, Shop : 22 };
    static eFence = { Rail : 0, Doldam : 1, Bamboo : 2, FlowerWall : 3, DryStone : 4, Balustrade : 5, Railing : 6, BrickWall : 7, MudWall : 8, Brush : 9 };
    static eBridge = { Europe : 0, Korea : 1, Japan : 2, China : 3, Slab : 4, Rope : 5 };
    static sList = new Map<string, CForgeTheme>();
    static sDefault = "europe_medieval_northwest";

    //동아시아 목조 양식(한국·일본·중국): 기와 성곽·누각·사찰 생성기를 쓴다
    East() : boolean { const E = CForgeTheme.eCulture; return this.mCulture == E.Korea || this.mCulture == E.Japan || this.mCulture == E.China; }
    //교회 자리에 그 양식의 사찰을 세우는지(동아시아 근대는 서양 교회). 몽골 근세는 중국식 사찰
    Temple() : boolean { return (this.East() || this.mCulture == CForgeTheme.eCulture.Mongol) && this.mChurch < 0; }
    //유럽·동아시아 밖 양식(성벽·탑·교회 자리를 양식 생성기가 직접 만든다)
    World() : boolean { return this.mCulture >= CForgeTheme.eCulture.Arab; }
    //성벽이 없던 문화권: 성벽 자리를 낮은 담·울타리로 짓는다(높이 상한 m, 해당 없으면 Infinity)
    LowWall() : number
    {
        const E = CForgeTheme.eCulture;
        if(this.mWallKind == 1) return Infinity;
        if(this.mCulture == E.Andes && this.mWallStyle == 1) return 2.4;
        if(this.mCulture == E.Africa && this.mWallStyle == 2) return 1.9;
        if(this.mCulture == E.Mongol && this.mWallStyle == 2) return 2.0;
        return Infinity;
    }

    static Get(_name : string) : CForgeTheme
    {
        return CForgeTheme.sList.get(_name ?? CForgeTheme.sDefault) ?? CForgeTheme.sList.get(CForgeTheme.sDefault);
    }
    //오브젝트 하나에 쓸 타입: 타입 위에 그 오브젝트의 덮어쓰기(over, 항목 일부)를 얹는다. 색 후보를 하나만 주면 그 색으로 고정된다
    static Of(_r : { theme? : string, over? : Partial<CForgeTheme> }) : CForgeTheme
    {
        const t = CForgeTheme.Get(_r.theme);
        if(_r.over == null) return t;
        return Object.assign(new CForgeTheme(), t, _r.over);
    }
    //타입 추가·덮어쓰기. 기본값 위에 _base 타입(있으면)을 얹고 바꿀 항목만 넘긴다
    static Push(_name : string, _over : Partial<CForgeTheme>, _base : string = null) : CForgeTheme
    {
        const t = Object.assign(new CForgeTheme(), _base != null ? CForgeTheme.sList.get(_base) : {}, _over);
        CForgeTheme.sList.set(_name, t);
        return t;
    }
}

const E = CForgeTheme.eCulture, ER = CForgeTheme.eEra, M = CForgeTheme.eMonument, F = CForgeTheme.eFence, BR = CForgeTheme.eBridge;

//── 유럽 ──
//중세 북서(14~16세기 독일·북프랑스·영국): 반목조·회벽 집, 고딕 교회, 성가퀴 성벽·둥근 탑, 장터 십자가
CForgeTheme.Push("europe_medieval_northwest", { mLabel : "유럽_중세_북서", mEra : ER.Medieval, mRegion : "northwest" });
//중세 북유럽(스칸디나비아): 널판·통나무 집에 잔디·너와 지붕(굴뚝·유리창 없이 널판 덧문), 목조 스타브 교회, 목책, 나무 망루, 룬스톤
CForgeTheme.Push("europe_medieval_north", {
    mLabel : "유럽_중세_북유럽", mEra : ER.Medieval, mRegion : "north",
    mHouseWall : [1, 2, 2, 1], mRoofKind : [3, 3, 2], mWallKind : 1, mTowerKind : 1, mChurch : 1, mMonument : M.Runestone, mIvy : false, mGlazed : false, mChimney : false,
    mShutter : [[0.5, 0.22, 0.16], [0.36, 0.3, 0.22]], mWood : [0.3, 0.21, 0.14], mPlankWall : [[0.56, 0.22, 0.16], [0.5, 0.2, 0.15], [0.42, 0.3, 0.2]],
    mShingle : [[0.32, 0.26, 0.2], [0.38, 0.3, 0.22]],
});
//중세 지중해(이탈리아·남프랑스·카탈루냐): 회반죽 돌집에 완만한 둥근 테라코타 기와, 로마네스크 교회와 따로 선 종탑, 제비꼬리 성가퀴·네모 탑, 기둥 조형물, 막돌 담
CForgeTheme.Push("europe_medieval_mediterranean", {
    mLabel : "유럽_중세_지중해", mEra : ER.Medieval, mRegion : "mediterranean",
    mTimber : false, mPitch : 0.42, mRoofKind : [4], mDormer : false, mChurch : 2, mWallStyle : 1, mTowerShape : 1, mMonument : M.Column, mFence : F.DryStone,
    mPlaster : [[0.93, 0.84, 0.66], [0.9, 0.76, 0.6], [0.95, 0.9, 0.78], [0.88, 0.8, 0.68]], mRoof : [[0.76, 0.42, 0.26], [0.7, 0.36, 0.22], [0.8, 0.5, 0.32]],
    mShutter : [[0.3, 0.42, 0.3], [0.42, 0.3, 0.22], [0.28, 0.36, 0.4]], mWallBody : [0.86, 0.78, 0.64], mWallStone : [0.74, 0.66, 0.54], mWallCap : [0.8, 0.72, 0.6], mTowerBody : [0.84, 0.76, 0.62],
    mStone : [0.78, 0.7, 0.58], mMetal : [0.5, 0.45, 0.38],
});
//근세 이탈리아(르네상스 15~17세기): 대칭 팔라초(돌 1층·반원 아치 창·코니스)와 완만한 기와, 별형 능보 요새, 돔 교회, 오벨리스크, 돌 난간
CForgeTheme.Push("europe_earlymodern_italy", {
    mLabel : "유럽_근세_이탈리아", mEra : ER.EarlyModern, mRegion : "italy",
    mHouseWall : [0, 0, 3], mTimber : false, mPitch : 0.38, mRoofKind : [4], mDormer : false, mIvy : false, mClassical : true, mSash : true, mArchWin : true,
    mChurch : 3, mWallStyle : 2, mTowerStyle : 1, mMonument : M.Obelisk, mFence : F.Balustrade,
    mPlaster : [[0.92, 0.82, 0.62], [0.88, 0.7, 0.54], [0.94, 0.88, 0.74], [0.86, 0.62, 0.48]], mRoof : [[0.74, 0.4, 0.26], [0.68, 0.36, 0.22]],
    mShutter : [[0.3, 0.4, 0.3], [0.36, 0.3, 0.24]], mStone : [0.86, 0.82, 0.72], mWallBody : [0.82, 0.74, 0.6], mWallStone : [0.76, 0.7, 0.58], mWallCap : [0.86, 0.8, 0.68], mTowerBody : [0.84, 0.76, 0.62],
});
//근세 북서(저지대·북독일 바로크 17~18세기): 붉은 벽돌 계단식 박공 집(흰 창틀 격자창), 벽돌 고딕 교회에 바로크 양파 모자, 별형 능보 요새, 기념 기둥, 철책
CForgeTheme.Push("europe_earlymodern_northwest", {
    mLabel : "유럽_근세_북서", mEra : ER.EarlyModern, mRegion : "northwest",
    mHouseWall : [10], mTimber : false, mPitch : 1.35, mStepGable : true, mIvy : false, mDormer : false, mSash : true,
    mChurch : 0, mChurchMat : 2, mSpire : 1, mWallStyle : 2, mTowerStyle : 1, mMonument : M.Column, mFence : F.Railing,
    mBrick : [0.58, 0.28, 0.2], mRoof : [[0.6, 0.28, 0.2], [0.34, 0.36, 0.4]], mShutter : [[0.24, 0.36, 0.28], [0.56, 0.2, 0.16]], mMetal : [0.78, 0.62, 0.26],
    mStone : [0.8, 0.78, 0.72], mWallBody : [0.6, 0.34, 0.26], mWallStone : [0.72, 0.68, 0.6], mWallCap : [0.74, 0.7, 0.62], mTowerBody : [0.6, 0.34, 0.26],
});
//근대 영국(조지안·빅토리아 18~19세기): 붉은 벽돌 연립(오르내리창·슬레이트), 벽돌 고딕 리바이벌 교회, 담장, 벽돌 시계탑, 오벨리스크, 철책
CForgeTheme.Push("europe_modern_britain", {
    mLabel : "유럽_근대_영국", mEra : ER.Modern, mRegion : "britain",
    mHouseWall : [10], mTimber : false, mPitch : 0.7, mSash : true, mClassical : true, mDormer : false, mIvy : true,
    mChurch : 0, mChurchMat : 2, mWallStyle : 3, mTowerStyle : 2, mMonument : M.Obelisk, mFence : F.Railing,
    mBrick : [0.6, 0.3, 0.22], mRoof : [[0.32, 0.34, 0.38], [0.28, 0.3, 0.34]], mShutter : [[0.2, 0.22, 0.24]], mStone : [0.84, 0.82, 0.76],
    mWallBody : [0.6, 0.3, 0.22], mWallStone : [0.8, 0.78, 0.72], mWallCap : [0.82, 0.8, 0.74], mTowerBody : [0.6, 0.3, 0.22],
});
//근대 대륙(신고전·오스만 19세기): 크림색 석조 저택(아연판 망사르드 지붕·돌 지붕창·철 발코니), 신고전 돔 교회, 담장, 석조 시계탑, 개선문, 철책
CForgeTheme.Push("europe_modern_continental", {
    mLabel : "유럽_근대_대륙", mEra : ER.Modern, mRegion : "continental",
    mHouseWall : [3], mTimber : false, mPitch : 1.7, mRoofKind : [5], mSash : true, mClassical : true, mBalcony : true, mIvy : false, mMansard : true,
    mChurch : 3, mChurchMat : 0, mWallStyle : 3, mTowerStyle : 2, mMonument : M.Arch, mFence : F.Railing,
    mStone : [0.88, 0.84, 0.74], mRoof : [[0.42, 0.46, 0.52], [0.38, 0.42, 0.48]], mShutter : [[0.3, 0.32, 0.34]],
    mWallBody : [0.86, 0.82, 0.72], mWallStone : [0.8, 0.76, 0.66], mWallCap : [0.9, 0.86, 0.76], mTowerBody : [0.88, 0.84, 0.74],
});

//── 한국 ──
//근세 조선: 기와집(흰 회벽·나무 기둥·회색 기와)과 초가 민가(흙벽·볏짚), 화성식 성곽(여장·문루·포루), 다포 팔작 대웅전, 석탑, 돌담, 홍예교
CForgeTheme.Push("korea_earlymodern", {
    mLabel : "한국_근세(조선)", mCulture : E.Korea, mEra : ER.EarlyModern, mHouseWall : [4, 5], mChurch : -1, mMonument : M.StonePagoda, mFence : F.Doldam, mBridge : BR.Korea,
    mPlaster : [[0.95, 0.94, 0.9], [0.93, 0.92, 0.88], [0.96, 0.95, 0.92]],
    mRoof : [[0.36, 0.37, 0.39], [0.31, 0.32, 0.34], [0.41, 0.41, 0.42]],
    mThatch : [[0.74, 0.65, 0.47], [0.69, 0.6, 0.44], [0.78, 0.69, 0.52]],
    mWood : [0.46, 0.33, 0.22], mStone : [0.72, 0.71, 0.68],
    mWallBody : [0.8, 0.78, 0.74], mWallStone : [0.74, 0.72, 0.68], mWallCap : [0.36, 0.37, 0.39], mTowerBody : [0.8, 0.78, 0.74],
    mFenceWood : [0.55, 0.45, 0.32],
});
//중세 고려: 돌 굽 위 판축 토성(나무 문틀 문길), 초가 위주 마을, 단청이 옅은 나무색 주심포 맞배 불전(배흘림 기둥·황토 벽), 팔각 구층 석탑, 판돌 다리(선죽교)
CForgeTheme.Push("korea_medieval", {
    mLabel : "한국_중세(고려)", mEra : ER.Medieval, mTemple : 1, mMonument : M.OctaPagoda, mWallStyle : 1, mBridge : BR.Slab, mHouseWall : [5, 5, 5, 4],
    mPillar : [0.5, 0.36, 0.25], mBeam : [0.4, 0.33, 0.25], mPlaster : [[0.86, 0.7, 0.44], [0.84, 0.67, 0.4], [0.88, 0.73, 0.48]],
    mWallBody : [0.68, 0.57, 0.42], mTowerBody : [0.68, 0.57, 0.42], mWallStone : [0.62, 0.6, 0.56],
}, "korea_earlymodern");
//근대 개화기(대한제국): 한옥 사이에 붉은 벽돌 양옥(오르내리창), 벽돌 고딕 성당, 독립문(개선문형). 성곽은 남아 있다
CForgeTheme.Push("korea_modern", {
    mLabel : "한국_근대(개화기)", mEra : ER.Modern, mHouseWall : [4, 4, 5, 10], mTimber : false, mSash : true, mClassical : true, mDormer : false, mPitch : 0.8,
    mChurch : 0, mChurchMat : 2, mMonument : M.Arch, mBrick : [0.58, 0.3, 0.24], mShutter : [[0.3, 0.32, 0.3]],
}, "korea_earlymodern");

//── 일본 ──
//근세 에도: 마치야·초가 민가, 돌 축대·흰 흙담·망루, 본당, 목탑, 대나무 울타리, 아치 목교
CForgeTheme.Push("japan_earlymodern", {
    mLabel : "일본_근세(에도)", mCulture : E.Japan, mEra : ER.EarlyModern, mHouseWall : [6, 7], mTempleSign : "本堂", mChurch : -1, mMonument : M.WoodPagoda, mFence : F.Bamboo, mBridge : BR.Japan,
    mPlaster : [[0.95, 0.94, 0.91], [0.92, 0.91, 0.88], [0.86, 0.77, 0.58], [0.82, 0.72, 0.54]],
    mMud : [[0.76, 0.66, 0.52], [0.7, 0.61, 0.48], [0.8, 0.71, 0.57]],
    mRoof : [[0.27, 0.29, 0.33], [0.23, 0.25, 0.29], [0.32, 0.33, 0.36]],
    mThatch : [[0.62, 0.55, 0.4], [0.56, 0.5, 0.37], [0.67, 0.6, 0.45]],
    mWood : [0.3, 0.22, 0.16], mStone : [0.68, 0.67, 0.64], mPillar : [0.78, 0.26, 0.15], mBeam : [0.64, 0.22, 0.13],
    mWallBody : [0.7, 0.69, 0.66], mWallStone : [0.64, 0.63, 0.6], mWallCap : [0.27, 0.29, 0.33], mTowerBody : [0.94, 0.93, 0.9],
    mFenceWood : [0.42, 0.32, 0.22], mBoard : [0.16, 0.15, 0.15], mMetal : [0.42, 0.36, 0.26],
});
//중세 무로마치: 토루 위 판벽(작은 판자 지붕)·나무 망루, 선종 불당(차양 지붕·꽃모양 창), 오륜탑, 돌 얹은 판자 지붕 마치야
CForgeTheme.Push("japan_medieval", {
    mLabel : "일본_중세(무로마치)", mEra : ER.Medieval, mItabuki : true, mWallStyle : 1, mTowerKind : 1, mRoofKind : [2], mTemple : 1, mMonument : M.Gorinto,
    mTempleSign : "佛殿", mShingle : [[0.42, 0.36, 0.3], [0.38, 0.33, 0.28]],
}, "japan_earlymodern");
//근대 메이지: 마치야 사이에 흰 칠 널판 의양풍 양옥(오르내리창), 흰 목조 교회, 목조 시계탑, 오벨리스크. 성은 남아 있다
CForgeTheme.Push("japan_modern", {
    mLabel : "일본_근대(메이지)", mEra : ER.Modern, mHouseWall : [6, 6, 7, 11], mTimber : false, mSash : true, mClassical : true, mDormer : false, mPitch : 0.75,
    mChurch : 0, mChurchMat : 3, mTowerStyle : 2, mMonument : M.Obelisk, mShutter : [[0.3, 0.42, 0.36]], mRoofKind : [0],
}, "japan_earlymodern");

//── 중국 ──
//근세 북방(명·청 베이징): 회색 벽돌 사합원채, 벽돌 성벽·겹처마 성루, 겹처마 대웅보전(녹색 유리기와), 팔각 벽돌탑, 회색 벽돌 담, 아치 석교
CForgeTheme.Push("china_earlymodern_north", {
    mLabel : "중국_근세_북방(명청)", mCulture : E.China, mEra : ER.EarlyModern, mRegion : "north", mHouseWall : [8], mTempleSign : "大雄寶殿", mChurch : -1,
    mMonument : M.BrickPagoda, mFence : F.BrickWall, mBridge : BR.China,
    mPlaster : [[0.95, 0.95, 0.93], [0.93, 0.93, 0.91], [0.96, 0.95, 0.92]],
    mRoof : [[0.34, 0.35, 0.37], [0.3, 0.31, 0.33], [0.38, 0.38, 0.39]],
    mGlaze : [0.27, 0.5, 0.36], mWood : [0.36, 0.2, 0.14], mStone : [0.86, 0.85, 0.82], mPillar : [0.64, 0.13, 0.1], mBeam : [0.2, 0.44, 0.46],
    mWallBody : [0.58, 0.59, 0.6], mWallStone : [0.66, 0.65, 0.62], mWallCap : [0.5, 0.51, 0.52], mTowerBody : [0.58, 0.59, 0.6],
    mBrick : [0.56, 0.57, 0.58], mMetal : [0.72, 0.56, 0.22], mFenceWood : [0.4, 0.24, 0.16],
});
//근세 남방(명·청 강남·휘주): 흰 벽 휘파 민가(마두벽), 처마가 크게 들린 사찰(회색 기와), 화장담
CForgeTheme.Push("china_earlymodern_south", {
    mLabel : "중국_근세_남방(명청)", mRegion : "south", mHouseWall : [9], mFence : F.FlowerWall, mRoofLift : 1.5, mGlaze : [0.33, 0.34, 0.36],
}, "china_earlymodern_north");
//중세 송: 판축 토성과 나무 문(사다리꼴 문길)·성루, 송식 홑처마 불전(들림이 작고 두공이 큼), 회벽·목조 골조 현산식 집, 밀첨탑
CForgeTheme.Push("china_medieval", {
    mLabel : "중국_중세(송)", mEra : ER.Medieval, mRegion : "", mBrickHouse : false, mWallStyle : 1, mTemple : 1, mRoofLift : 0.55, mGlaze : [0.33, 0.34, 0.36],
    mMonument : M.DenseEave, mFence : F.Rail, mWallBody : [0.66, 0.56, 0.42], mTowerBody : [0.66, 0.56, 0.42], mWallCap : [0.62, 0.52, 0.4], mWallStone : [0.6, 0.5, 0.38],
}, "china_earlymodern_north");
//근대 청말·민국: 회색 벽돌 석고문 양옥(돌 문틀·박공 머리)과 휘파 민가, 벽돌 고딕 성당, 석조 시계탑, 오벨리스크, 철책. 명대 성벽은 남아 있다
CForgeTheme.Push("china_modern", {
    mLabel : "중국_근대(청말·민국)", mEra : ER.Modern, mRegion : "", mHouseWall : [10, 10, 9], mTimber : false, mSash : true, mClassical : true, mDormer : false, mPitch : 0.75,
    mChurch : 0, mChurchMat : 2, mTowerStyle : 2, mMonument : M.Obelisk, mFence : F.Railing, mShutter : [[0.24, 0.26, 0.28]],
}, "china_earlymodern_north");

//── 아랍 ──
//중세 맘루크(13~16세기 카이로·다마스쿠스): 회반죽·돌 평지붕 집(나무 격자 돌출창), 계단형 성가퀴 석벽·둥근 탑, 줄무늬(아블라크) 석조 모스크(돌 돔·팔각 미나레트), 분수정
CForgeTheme.Push("arab_medieval", {
    mLabel : "아랍_중세(맘루크)", mCulture : E.Arab, mEra : ER.Medieval, mHouseWall : [12], mParapet : 1, mArch : 2, mLattice : true, mChurch : 4, mMosque : 0, mGround : [[0.8, 0.68, 0.5], [0.72, 0.6, 0.42]], mArid : true,
    mMonument : M.Fountain, mFence : F.MudWall, mBridge : BR.Europe, mWallStyle : 0, mTowerShape : 0,
    mPlaster : [[0.9, 0.84, 0.72], [0.86, 0.78, 0.64], [0.93, 0.9, 0.83], [0.84, 0.74, 0.6]], mAdobe : [[0.84, 0.74, 0.58], [0.8, 0.7, 0.55]],
    mStone : [0.86, 0.78, 0.62], mWallBody : [0.84, 0.76, 0.6], mWallStone : [0.56, 0.4, 0.31], mWallCap : [0.88, 0.8, 0.66], mTowerBody : [0.84, 0.76, 0.6],
    mWood : [0.32, 0.21, 0.13], mShutter : [[0.3, 0.2, 0.13], [0.24, 0.32, 0.3]], mRoof : [[0.84, 0.76, 0.6]], mMetal : [0.62, 0.52, 0.3], mDirt : [0.78, 0.68, 0.52], mGlaze : [0.18, 0.44, 0.5],
});
//근세 오스만(16~18세기 이스탄불): 돌 1층 위 칠한 목조 돌출층 집(넓은 처마 기와 모임지붕), 둥근 석탑·납 원뿔 지붕, 중앙 대돔·연필형 미나레트 모스크, 지붕 덮인 분수정
CForgeTheme.Push("arab_earlymodern_ottoman", {
    mLabel : "아랍_근세_오스만", mEra : ER.EarlyModern, mRegion : "ottoman", mHouseWall : [16, 16, 16, 12], mParapet : 0, mArch : 1, mLattice : false, mMosque : 1, mWallStyle : 2, mFence : F.DryStone, mGround : [[0.45, 0.62, 0.28], [0.36, 0.52, 0.24]], mArid : false,
    mPlankWall : [[0.6, 0.26, 0.2], [0.86, 0.72, 0.5], [0.8, 0.8, 0.76], [0.56, 0.6, 0.62]], mRoof : [[0.72, 0.38, 0.24], [0.66, 0.34, 0.22], [0.76, 0.44, 0.28]],
    mStone : [0.84, 0.8, 0.72], mWallBody : [0.8, 0.76, 0.68], mWallStone : [0.62, 0.58, 0.52], mWallCap : [0.84, 0.8, 0.72], mTowerBody : [0.8, 0.76, 0.68],
    mMetal : [0.5, 0.52, 0.54], mPlaster : [[0.94, 0.92, 0.86], [0.92, 0.86, 0.74]],
}, "arab_medieval");
//근세 마그레브(16~18세기 모로코 마라케시·페스): 붉은 흙 평지붕 집(말굽 아치 문·녹색 기와 차양), 피라미드 머리 타의 판축 흙 성벽·네모 탑, 녹색 기와 지붕 모스크와 사각 미나레트
CForgeTheme.Push("arab_earlymodern_maghreb", {
    mLabel : "아랍_근세_마그레브", mEra : ER.EarlyModern, mRegion : "maghreb", mHouseWall : [12], mParapet : 3, mArch : 4, mLattice : false, mMosque : 2, mWallStyle : 1, mTowerShape : 1, mGround : [[0.78, 0.6, 0.44], [0.7, 0.52, 0.38]],
    mPlaster : [[0.82, 0.56, 0.42], [0.86, 0.64, 0.48], [0.92, 0.84, 0.72], [0.78, 0.52, 0.4]], mAdobe : [[0.78, 0.5, 0.38], [0.74, 0.47, 0.35]],
    mStone : [0.8, 0.62, 0.5], mWallBody : [0.76, 0.5, 0.38], mWallStone : [0.7, 0.46, 0.35], mWallCap : [0.78, 0.52, 0.4], mTowerBody : [0.76, 0.5, 0.38],
    mGlaze : [0.16, 0.44, 0.3], mShutter : [[0.16, 0.36, 0.3], [0.2, 0.3, 0.52], [0.44, 0.24, 0.14]], mDirt : [0.76, 0.56, 0.42],
}, "arab_medieval");

//── 이집트 ──
//고대 고왕국(기원전 27~22세기 기자): 흙벽돌 평지붕 집, 흙벽돌 감실 담·보루(초기 왕조 궁전 정면식), 피라미드와 장제전, 스핑크스
CForgeTheme.Push("egypt_ancient_old", {
    mLabel : "이집트_고대_고왕국", mCulture : E.Egypt, mEra : ER.Ancient, mHouseWall : [12], mParapet : 2, mArch : 0, mChurch : 5, mTemple : 1, mWallStyle : 1,
    mMonument : M.Sphinx, mFence : F.MudWall, mBridge : BR.Slab,
    mPlaster : [[0.66, 0.5, 0.34], [0.6, 0.46, 0.32], [0.7, 0.55, 0.38], [0.9, 0.82, 0.66]], mAdobe : [[0.56, 0.42, 0.29], [0.52, 0.39, 0.27], [0.6, 0.46, 0.32]],
    mStone : [0.9, 0.85, 0.74], mWallBody : [0.6, 0.47, 0.33], mWallStone : [0.82, 0.76, 0.64], mWallCap : [0.66, 0.52, 0.37], mTowerBody : [0.6, 0.47, 0.33],
    mGround : [[0.86, 0.72, 0.5], [0.76, 0.62, 0.42]], mArid : true,
    mWood : [0.42, 0.3, 0.18], mShutter : [[0.36, 0.26, 0.16]], mMetal : [0.86, 0.66, 0.26], mDirt : [0.82, 0.72, 0.54], mThatch : [[0.62, 0.56, 0.36], [0.58, 0.52, 0.33]],
    mPebble : [[0.86, 0.8, 0.66], [0.8, 0.74, 0.6], [0.9, 0.84, 0.72]],
});
//고대 신왕국(기원전 16~11세기 테베): 지붕 차양·바람 잡이를 얹은 흙벽돌 집, 물결 흙벽돌 경사 성벽과 돌 탑문(파일론), 탑문·열주실 신전, 오벨리스크
CForgeTheme.Push("egypt_ancient_new", {
    mLabel : "이집트_고대_신왕국", mTemple : 0, mWallStyle : 0, mRoofDeck : true, mMonument : M.Obelisk,
    mStone : [0.84, 0.68, 0.46], mWallBody : [0.56, 0.43, 0.3], mWallStone : [0.82, 0.66, 0.45], mWallCap : [0.6, 0.46, 0.32], mTowerBody : [0.84, 0.68, 0.46],
}, "egypt_ancient_old");

//── 남미(안데스) ──
//중세 잉카(15~16세기 쿠스코·마추픽추): 다각형 맞춤돌 벽에 가파른 풀 지붕 집(사다리꼴 문·감실), 지그재그 단 성벽(삭사이와만)·둥근 석탑, 신전, 인티와타나, 밧줄 현수교
CForgeTheme.Push("andes_medieval", {
    mLabel : "남미_중세(잉카)", mCulture : E.Andes, mEra : ER.Medieval, mHouseWall : [14], mArch : 3, mChurch : 7, mWallStyle : 0, mGround : [[0.6, 0.6, 0.38], [0.5, 0.52, 0.32]],
    mMonument : M.Intihuatana, mFence : F.DryStone, mBridge : BR.Rope,
    mStone : [0.7, 0.68, 0.63], mWallBody : [0.56, 0.55, 0.52], mWallStone : [0.62, 0.6, 0.55], mWallCap : [0.7, 0.68, 0.63], mTowerBody : [0.68, 0.66, 0.61],
    mThatch : [[0.74, 0.62, 0.38], [0.7, 0.58, 0.36], [0.78, 0.66, 0.42]], mWood : [0.4, 0.3, 0.2], mDirt : [0.62, 0.5, 0.38], mGreen : [0.38, 0.52, 0.26],
    mAdobe : [[0.66, 0.5, 0.38], [0.62, 0.47, 0.35]], mGold : [0.9, 0.72, 0.3],
});
//근세 식민(17~18세기 쿠스코): 잉카 석축 위에 흰 회벽 2층·나무 발코니·테라코타 기와 집, 돔 성당, 아치 석교, 아트리움 십자가.
//스페인 식민 내륙 도시는 성벽이 없어 성벽 자리는 기와 얹은 흙담(타피아)과 아치 대문, 탑 자리는 흰 종루
CForgeTheme.Push("andes_earlymodern", {
    mLabel : "남미_근세(식민 쿠스코)", mEra : ER.EarlyModern, mHouseWall : [15, 15, 14], mArch : 1, mChurch : 3, mChurchMat : 0, mMonument : M.Cross, mBridge : BR.Europe, mWallStyle : 1,
    mPlaster : [[0.95, 0.94, 0.9], [0.94, 0.9, 0.8], [0.92, 0.92, 0.88]], mShutter : [[0.16, 0.34, 0.5], [0.2, 0.4, 0.3], [0.42, 0.26, 0.16]],
    mRoof : [[0.7, 0.38, 0.25], [0.64, 0.34, 0.22]], mMetal : [0.42, 0.4, 0.38], mTowerBody : [0.66, 0.6, 0.54],
}, "andes_medieval");

//── 아프리카 ──
//중세 사헬(13~16세기 말리 젠네·팀북투): 나무 막대(토론)가 박힌 흙 평지붕 집, 원뿔 첨두 버팀벽 흙 성벽·흙 탑, 진흙 대모스크, 아스키아 묘
CForgeTheme.Push("africa_medieval_sahel", {
    mLabel : "아프리카_중세_사헬(말리)", mCulture : E.Africa, mEra : ER.Medieval, mRegion : "sahel", mHouseWall : [12], mParapet : 2, mToron : true, mArch : 0, mChurch : 6, mWallStyle : 0, mGround : [[0.82, 0.62, 0.42], [0.74, 0.54, 0.36]], mArid : true,
    mMonument : M.MudTomb, mFence : F.MudWall, mBridge : BR.Slab,
    mPlaster : [[0.7, 0.52, 0.36], [0.66, 0.49, 0.34], [0.74, 0.56, 0.39]], mAdobe : [[0.68, 0.5, 0.34], [0.64, 0.47, 0.32], [0.72, 0.54, 0.37]],
    mStone : [0.6, 0.48, 0.36], mWallBody : [0.68, 0.5, 0.34], mWallStone : [0.6, 0.45, 0.32], mWallCap : [0.7, 0.52, 0.36], mTowerBody : [0.68, 0.5, 0.34],
    mWood : [0.58, 0.48, 0.34], mShutter : [[0.36, 0.26, 0.18], [0.44, 0.32, 0.2]], mDirt : [0.74, 0.58, 0.42], mGreen : [0.44, 0.5, 0.24],
    mPebble : [[0.7, 0.58, 0.44], [0.64, 0.52, 0.4], [0.76, 0.64, 0.5]],
});
//중세 남부(11~15세기 그레이트 짐바브웨): 흙벽 원뿔 초가 집, 모르타르 없이 쌓은 곡선 건식 석벽(쉐브론 띠)·원뿔 석탑, 대울타리, 새 조각 돌기둥
CForgeTheme.Push("africa_medieval_south", {
    mLabel : "아프리카_중세_남부(짐바브웨)", mRegion : "south", mHouseWall : [13], mHut : 1, mParapet : 0, mToron : false, mChurch : 8, mWallStyle : 1, mGround : [[0.66, 0.62, 0.36], [0.56, 0.54, 0.3]], mArid : false,
    mMonument : M.BirdPillar, mFence : F.DryStone,
    mStone : [0.68, 0.64, 0.57], mWallBody : [0.66, 0.62, 0.55], mWallStone : [0.6, 0.56, 0.5], mWallCap : [0.7, 0.66, 0.58], mTowerBody : [0.66, 0.62, 0.55],
    mAdobe : [[0.66, 0.46, 0.32], [0.7, 0.5, 0.35], [0.62, 0.44, 0.3]], mThatch : [[0.7, 0.6, 0.4], [0.66, 0.56, 0.37], [0.74, 0.64, 0.44]],
}, "africa_medieval_sahel");
//근세 남부(17~19세기 줄루·응구니): 볏짚 줄을 엮은 벌집 초가 오두막, 둥근 목책(크랄)·나무 망루, 족장 대형 오두막, 돌무더기, 가시덤불 울타리
CForgeTheme.Push("africa_earlymodern_south", {
    mLabel : "아프리카_근세_남부(줄루)", mEra : ER.EarlyModern, mHut : 2, mChurch : 9, mWallKind : 1, mTowerKind : 1, mRoofKind : [1], mMonument : M.Cairn, mFence : F.Brush, mGround : [[0.5, 0.6, 0.3], [0.42, 0.52, 0.26]],
    mThatch : [[0.72, 0.62, 0.42], [0.68, 0.58, 0.38], [0.76, 0.66, 0.46]], mLogWood : [[0.5, 0.4, 0.28], [0.44, 0.35, 0.24]], mWood : [0.44, 0.34, 0.22],
}, "africa_medieval_south");
//근대 남부(20세기 은데벨레): 굵은 검은 테 기하학 무늬를 칠한 흰 흙벽 초가집과 채색 담, 십자가. 마을에 성벽·목책이 없어 성벽 자리는 칠한 마당 담, 탑 자리는 원뿔 초가 둥근 집
CForgeTheme.Push("africa_modern_south", {
    mLabel : "아프리카_근대_남부(은데벨레)", mEra : ER.Modern, mHouseWall : [17], mChurch : 2, mMonument : M.Cross, mFence : F.MudWall, mWallKind : 0, mWallStyle : 2, mTowerKind : 0,
    mPlaster : [[0.95, 0.94, 0.9], [0.93, 0.92, 0.88]], mTowerBody : [0.94, 0.93, 0.89], mWallStone : [0.62, 0.5, 0.38], mRoof : [[0.72, 0.62, 0.42]],
}, "africa_earlymodern_south");

//── 몽골 ──
//중세 제국(13세기 칭기즈칸): 펠트 게르 유목 진영, 칸의 대형 게르(오르도), 오보, 나무 울타리. 진영에 성벽이 없어 성벽 자리는 세로 널판 울타리(하샤),
//탑 자리는 소가 끄는 수레 위 게르(게르 테렉). 흙 토성(카라코룸)은 mWallStyle 0으로 덮어쓰면 된다
CForgeTheme.Push("mongol_medieval", {
    mLabel : "몽골_중세(제국)", mCulture : E.Mongol, mEra : ER.Medieval, mHouseWall : [13], mHut : 0, mChurch : 9, mWallStyle : 2, mTowerKind : 0, mRoofKind : [2], mGround : [[0.56, 0.62, 0.32], [0.48, 0.54, 0.28]],
    mMonument : M.Ovoo, mFence : F.Rail, mBridge : BR.Slab,
    mShutter : [[0.8, 0.36, 0.14], [0.72, 0.22, 0.16], [0.84, 0.5, 0.16]], mWood : [0.5, 0.34, 0.2], mFenceWood : [0.52, 0.4, 0.28],
    mWallBody : [0.68, 0.58, 0.44], mWallStone : [0.62, 0.54, 0.42], mWallCap : [0.66, 0.56, 0.42], mTowerBody : [0.68, 0.58, 0.44],
    mStone : [0.62, 0.6, 0.56], mDirt : [0.62, 0.56, 0.42], mGreen : [0.44, 0.52, 0.28], mCloth : [[0.24, 0.44, 0.76], [0.92, 0.92, 0.9], [0.86, 0.72, 0.2]],
});
//근세(16~19세기 에르데니 조): 게르 마을, 흰 스투파를 줄지어 올린 사원 담과 모서리 큰 스투파, 중국식 사찰(녹색 기와), 흰 스투파
CForgeTheme.Push("mongol_earlymodern", {
    mLabel : "몽골_근세(에르데니 조)", mEra : ER.EarlyModern, mChurch : -1, mTemple : 0, mWallStyle : 1, mTowerKind : 0, mMonument : M.Stupa, mTempleSign : "三寶殿",
    mWallBody : [0.95, 0.94, 0.9], mWallStone : [0.72, 0.7, 0.66], mWallCap : [0.3, 0.52, 0.38], mTowerBody : [0.95, 0.94, 0.9],
    mRoof : [[0.3, 0.52, 0.38], [0.34, 0.35, 0.37]], mGlaze : [0.3, 0.52, 0.38], mPillar : [0.66, 0.18, 0.12], mBeam : [0.2, 0.44, 0.46], mBrick : [0.56, 0.57, 0.58],
    mPlaster : [[0.95, 0.94, 0.9], [0.93, 0.92, 0.88]],
}, "mongol_medieval");

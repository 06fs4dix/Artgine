import { CUpdate } from "../../basic/Basic.js";
import { CObject } from "../../basic/CObject.js";
import { CCamera } from "../../render/CCamera.js";
import { CMesh } from "../../render/CMesh.js";
import { CShaderAttr } from "../../render/CShaderAttr.js";
import { CLOD } from "./CLOD.js";
import { CSubject } from "../subject/CSubject.js";
import { CComponent } from "./CComponent.js";
import { CPaint } from "./paint/CPaint.js";
import { CPaint2D } from "./paint/CPaint2D.js";
import { CPaint3D } from "./paint/CPaint3D.js";

//메인 카메라와 오너의 거리로 LOD 레벨을 정해 그 레벨의 페인트만 켠다. 레벨 정보는 CDensityInfo.AddLODLevel과 같은 CLOD다.
//mDistance가 같은 항목들은 한 레벨이라 표시용과 쉐도우용(PushTag ShadowOnly)처럼 페인트를 여러 개 함께 켤 수 있다.
//mRes가 null인 레벨은 아무것도 그리지 않는다. mAmount는 인스턴스를 솎는 값이라 쓰지 않는다.
//mSubject는 이미 만든 서브젝트를 그 레벨에서만 켠다(페인트를 만들 수 없는 복합 오브젝트용). 스위치는 그 서브젝트 밖에 둬야 꺼져도 돈다
export class CLODSwitch extends CComponent
{
    mLODInfo = new Array<CLOD>();
    private mCamera : CCamera = null;
    private mCur = -1;
    private mShow = new Array<CPaint>();
    private mShowSub = new Array<CSubject>();
    private mSubOn = new Map<CSubject, boolean>();
    private mOff = false;
    private mInit = true;
    private mPending = false;
    private mPaint = new Map<CLOD, CPaint>();
    private mLoading = new Set<string>();

    override IsShould(_member : string, _type : CObject.eShould) : boolean
    {
        if(_member == "mCamera" || _member == "mCur" || _member == "mShow" || _member == "mShowSub" || _member == "mSubOn" || _member == "mOff" || _member == "mInit" ||
            _member == "mPending" || _member == "mPaint" || _member == "mLoading") return false;
        return super.IsShould(_member, _type);
    }

    /** 단일 LOD 레벨을 개별로 추가 */
    AddLODLevel(_res : string, _distance? : number, _hysteresis?: number, _amount?:number, _paintTag?:string[], _paintShaderAttr?:CShaderAttr[]);
    /** 여러 LOD 레벨을 한번에 추가 */
    AddLODLevel(_lodInfo : CLOD[]);
    AddLODLevel(
        _resOrList : string|CLOD[],
        _distance = 0,
        _hysteresis = 0,
        _amount = 1,
        _paintTag : string[] = [],
        _paintShaderAttr : CShaderAttr[] = []
    ) : void
    {
        CLOD.Add(this.mLODInfo, _resOrList, _distance, _hysteresis, _amount, _paintTag, _paintShaderAttr);
        this.mInit = true;
    }

    GetLevel() : number { return this.mCur; }

    RecvGetCamera(_cam : CCamera)
    {
        this.mCamera = _cam;
        this.mInit = true;
    }

    override Update(_update : CUpdate) : boolean|any
    {
        if(this.mCamera == null)
        {
            const cm = this.ProductMsg("SendGetCamera");
            cm.mInter = "canvas";
            cm.mMsgData[0] = this;
            return;
        }
        if(this.mOff) this.ApplyOff();
        const owner = this.GetOwner();
        const cam = this.mCamera;
        if(owner == null || owner.GetFrame() == null || this.mLODInfo.length == 0) return;
        if(this.mInit == false && this.mPending == false && cam.mUpdateMat == CUpdate.eType.Not && owner.mUpdateMat == CUpdate.eType.Not) return;
        this.mInit = false;
        this.mPending = false;

        const eye = cam.GetEye(), pos = owner.GetMat();
        const dist = Math.hypot(eye.x - pos.x, eye.y - pos.y, eye.z - pos.z);
        const index = CLOD.Select(this.mLODInfo, dist, this.mCur);
        if(index == this.mCur) return;

        const [start, end] = CLOD.Range(this.mLODInfo, index);
        const show = new Array<CPaint>(), showSub = new Array<CSubject>();
        for(let i = start; i <= end; i++)
        {
            const info = this.mLODInfo[i];
            if(info.mSubject != null) showSub.push(info.mSubject);
            if(info.mRes == null) continue;
            let pt = this.mPaint.get(info);
            if(pt == null)
            {
                pt = this.BuildPaint(info);
                if(pt == null)
                {
                    this.mPending = true;
                    return;
                }
                this.mPaint.set(info, pt);
            }
            show.push(pt);
        }

        //켜는 쪽은 2프레임 뒤에 그려지고 끄는 쪽은 다음 프레임에 꺼지므로, 끄는 건 한 프레임 미뤄 빈 프레임을 막는다
        this.mCur = index;
        this.mShow = show;
        this.mShowSub = showSub;
        for(const pt of show) if(pt.IsEnable() == false) pt.SetEnable(true);
        for(const sub of showSub) this.SetSub(sub, true);
        this.mOff = true;
    }

    private ApplyOff()
    {
        this.mOff = false;
        for(const pt of this.mPaint.values())
            if(this.mShow.includes(pt) == false && pt.IsEnable()) pt.SetEnable(false);
        for(const info of this.mLODInfo)
            if(info.mSubject != null && this.mShowSub.includes(info.mSubject) == false) this.SetSub(info.mSubject, false);
    }

    //서브젝트 켜짐은 부모 상태까지 합쳐 돌려주므로 IsEnable로 비교하지 않고 이 컴포넌트가 정한 값을 따로 기억한다
    private SetSub(_sub : CSubject, _on : boolean)
    {
        if(this.mSubOn.get(_sub) === _on) return;
        this.mSubOn.set(_sub, _on);
        _sub.SetEnable(_on);
    }

    //리소스가 아직 없으면 불러 오고 null을 돌려준다. 메시인지 텍스처인지는 불러온 뒤에야 알 수 있다
    private BuildPaint(_info : CLOD) : CPaint
    {
        const owner = this.GetOwner(), frame = owner.GetFrame();
        const res = frame.Res().Find(_info.mRes);
        if(res == null)
        {
            if(this.mLoading.has(_info.mRes) == false)
            {
                this.mLoading.add(_info.mRes);
                frame.Load().Exe(_info.mRes);
            }
            return null;
        }
        const pt : CPaint = res instanceof CMesh ? new CPaint3D(_info.mRes) : new CPaint2D(_info.mRes);
        pt.mSave = false;
        pt.SetEnable(false);
        for(const tag of _info.mPaintTag) pt.PushTag(tag);
        for(const attr of _info.mPaintShaderAttr) pt.PushCShaderAttr(attr);
        if(_info.mWind > 0) (pt as CPaint2D | CPaint3D).Wind(_info.mWind);
        owner.PushComp(pt);
        return pt;
    }

    override Destroy()
    {
        for(const pt of this.mPaint.values()) pt.Destroy();
        this.mPaint.clear();
        super.Destroy();
    }
}

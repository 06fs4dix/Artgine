import { CObject } from "../../basic/CObject.js";
import { CShaderAttr } from "../../render/CShaderAttr.js";
import type { CSubject } from "../subject/CSubject.js";

//LOD 레벨 한 개의 데이터(인스턴스)와 레벨 배열을 다루는 공용 함수(static).
//CObject여야 CDensityInfo.mLODInfo가 JSON 저장·로드에 포함된다(아니면 배열이 비어서 저장된다).
export class CLOD extends CObject
{
    mRes?: string;
    mAmount?: number;
    mDistance?: number;
    mHysteresis?: number;
    mPaintTag?=new Array<string>();
    mPaintShaderAttr?=new Array<CShaderAttr>();
    //이 레벨만의 바람 세기. 생략(-1)하면 CDensityInfo.mWind. 3D 메시와 2D 빌보드는 같은 값에도 흔들림 크기가 달라 따로 준다
    mWind?=-1;
    //CLODSwitch 전용. 이미 만들어 둔 서브젝트를 이 레벨에서 켜고(SetEnable) 다른 레벨에서는 끈다. 덴시티는 무시한다
    mSubject?: CSubject=null;
    override IsShould(_member : string, _type : CObject.eShould) : boolean
    {
        if(_member == "mSubject") return false;
        return super.IsShould(_member, _type);
    }
    constructor(_res:string=null,_amount:number=1,_dist:number=0,_hysteresis:number=0,_paintTag:string[]=[],_paintShaderAttr:CShaderAttr[]=[],_wind:number=-1,_subject:CSubject=null) {
        super();
        this.mRes=_res;
        this.mAmount=_amount;
        this.mDistance=_dist;
        this.mHysteresis=_hysteresis;
        this.mPaintTag=_paintTag;
        this.mPaintShaderAttr=_paintShaderAttr;
        this.mWind=_wind;
        this.mSubject=_subject;
    }

    //배열은 mDistance 오름차순이다. 거리가 같은 항목들은 한 레벨이고, 돌려주는 값은 그 레벨의 마지막 항목 인덱스다.
    //현재 레벨 이하는 경계를 히스테리시스만큼 당겨 경계에서 깜빡이지 않게 한다. 히스테리시스는 같은 레벨 항목 중 큰 값을 쓴다
    static Select(_arr : CLOD[], _dist : number, _cur : number) : number
    {
        for (let i = _arr.length - 1; i >= 0; i--)
        {
            let edge = _arr[i].mDistance;
            if (i <= _cur)
            {
                let hys = 0;
                for (let j = i; j >= 0 && _arr[j].mDistance == edge; j--) hys = Math.max(hys, _arr[j].mHysteresis);
                edge = Math.max(0, edge - hys);
            }
            if (_dist >= edge) return i;
        }
        return 0;
    }
    //_index가 속한 레벨의 [시작, 끝] 인덱스(끝 포함)
    static Range(_arr : CLOD[], _index : number) : [number, number]
    {
        let s = _index, e = _index;
        while (s > 0 && _arr[s - 1].mDistance == _arr[_index].mDistance) s--;
        while (e < _arr.length - 1 && _arr[e + 1].mDistance == _arr[_index].mDistance) e++;
        return [s, e];
    }
    // Distance 오름차순으로 정렬된 위치에 삽입. 거리가 같으면 먼저 넣은 항목 뒤에 들어간다
    static Insert(_arr : CLOD[], _info : CLOD)
    {
        const insertIndex = _arr.findIndex(existing => _info.mDistance < existing.mDistance);
        const index = insertIndex === -1 ? _arr.length : insertIndex;
        _arr.splice(index, 0, _info);
    }
    //AddLODLevel의 두 가지 입력(낱개 인자, CLOD 배열)을 _arr에 넣는다. 배열의 CLOD는 복사하지 않고 그대로 담는다
    static Add(
        _arr : CLOD[],
        _resOrList : string|CLOD[],
        _distance = 0,
        _hysteresis = 0,
        _amount = 1,
        _paintTag : string[] = [],
        _paintShaderAttr : CShaderAttr[] = []
    ) : void
    {
        if(Array.isArray(_resOrList))
        {
            for(const info of _resOrList) CLOD.Insert(_arr, info);
            return;
        }
        CLOD.Insert(_arr, new CLOD(_resOrList as string, _amount, Math.abs(_distance), _hysteresis, _paintTag, _paintShaderAttr));
    }
}

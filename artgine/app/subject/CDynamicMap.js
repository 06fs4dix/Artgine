import { CMat } from "../../geometry/CMat.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CUtilRender } from "../../render/CUtilRender.js";
import { CPaint2D, CPaint2DMerge } from "../component/paint/CPaint2D.js";
import { CPaint3D, CPaint3DMerge } from "../component/paint/CPaint3D.js";
import { CSubjectMap } from "./CSubjectMap.js";
class CDynamicItem {
    mPaint = null;
    mMerge = null;
    mSlot = -1;
    mBuildID = -1;
    mCodi = new Float32Array(4);
}
export class CDynamicMap extends CSubjectMap {
    mItem = new Array();
    mItemMap = new Map();
    mGroup = new Map();
    mMat = new CMat();
    mCodi = new CVec4();
    IsShould(_member, _type) {
        if (_member == "mItem" || _member == "mItemMap" || _member == "mGroup" || _member == "mMat" || _member == "mCodi")
            return false;
        return super.IsShould(_member, _type);
    }
    PushComp(_com) {
        if (this.IsItemPaint(_com) == false)
            return super.PushComp(_com);
        const pt = _com;
        if (this.mItemMap.has(pt))
            return _com;
        pt.SetOwner(this);
        const item = new CDynamicItem();
        item.mPaint = pt;
        this.mItem.push(item);
        this.mItemMap.set(pt, item);
        return _com;
    }
    FindComps(_type, _child = false, vec = new Array()) {
        super.FindComps(_type, _child, vec);
        for (const item of this.mItem) {
            const pt = item.mPaint;
            if (pt.IsDestroy())
                continue;
            if (typeof _type == "string") {
                if (pt.Key() == _type)
                    vec.push(pt);
            }
            else if (typeof _type == "number") {
                if (pt.GetSysc() == _type)
                    vec.push(pt);
            }
            else if (pt instanceof _type)
                vec.push(pt);
        }
        return vec;
    }
    DetachComp(_type) {
        for (const item of this.mItem) {
            const pt = item.mPaint;
            if (typeof _type == "string" ? pt.Key() == _type : pt instanceof _type) {
                this.ReleaseItem(item);
                return pt;
            }
        }
        return super.DetachComp(_type);
    }
    Destroy() {
        for (const item of this.mItem)
            item.mPaint.Destroy();
        this.mItem.length = 0;
        this.mItemMap.clear();
        super.Destroy();
    }
    Update(_update) {
        super.Update(_update);
        for (let i = 0; i < this.mItem.length; ++i) {
            const item = this.mItem[i];
            const pt = item.mPaint;
            if (pt.IsDestroy()) {
                this.ReleaseItem(item);
                --i;
                continue;
            }
            if (pt.IsEnable() == false) {
                this.HideItem(item);
                continue;
            }
            if (item.mMerge == null) {
                item.mMerge = this.FindGroup(pt);
                if (item.mMerge == null)
                    continue;
            }
            const merge = item.mMerge;
            if (merge.IsReady() == false)
                continue;
            if (item.mBuildID != merge.GetBuildID()) {
                item.mBuildID = merge.GetBuildID();
                item.mSlot = -1;
            }
            this.ModifyItem(item);
        }
    }
    IsItemPaint(_com) {
        if (_com.constructor !== CPaint2D && _com.constructor !== CPaint3D)
            return false;
        const pt = _com;
        return pt.GetTag().has("tail") == false;
    }
    ItemMat(_pt) {
        const m = this.mMat.mF32A;
        m.set(_pt.GetMat().mF32A);
        if (_pt instanceof CPaint2D) {
            const s = CUtilRender.Mesh2DSize;
            m[0] *= s;
            m[1] *= s;
            m[2] *= s;
            m[4] *= s;
            m[5] *= s;
            m[6] *= s;
        }
        this.mMat.UnitCheck();
        return this.mMat;
    }
    ModifyItem(_item) {
        const pt = _item.mPaint, merge = _item.mMerge;
        const mat = this.ItemMat(pt);
        if (merge instanceof CPaint3DMerge) {
            if (_item.mSlot < 0)
                _item.mSlot = merge.Push(pt.mMesh, mat);
            else
                merge.Modify(_item.mSlot, mat);
            return;
        }
        const merge2D = merge;
        const codi = pt.GetTexCodi().mF32A, last = _item.mCodi;
        if (_item.mSlot < 0) {
            last.set(codi);
            this.mCodi.mF32A.set(codi);
            _item.mSlot = merge2D.Push(mat, this.mCodi);
        }
        else if (codi[0] != last[0] || codi[1] != last[1] || codi[2] != last[2] || codi[3] != last[3]) {
            last.set(codi);
            this.mCodi.mF32A.set(codi);
            merge2D.Modify(_item.mSlot, mat, this.mCodi);
        }
        else
            merge2D.Modify(_item.mSlot, mat);
    }
    HideItem(_item) {
        if (_item.mSlot < 0)
            return;
        _item.mMerge.Remove(_item.mSlot);
        _item.mSlot = -1;
    }
    ReleaseItem(_item) {
        this.HideItem(_item);
        const i = this.mItem.indexOf(_item);
        if (i >= 0) {
            this.mItem[i] = this.mItem[this.mItem.length - 1];
            this.mItem.pop();
        }
        this.mItemMap.delete(_item.mPaint);
    }
    FindGroup(_pt) {
        if (_pt instanceof CPaint2D) {
            _pt.InitChk();
            if (_pt.mInit == false)
                return null;
            _pt.MatUpdate();
        }
        else if (_pt.GetTexture().length > 0)
            _pt.SetTexture(_pt.GetTexture());
        const key = this.GroupKey(_pt);
        let merge = this.mGroup.get(key);
        if (merge != null)
            return merge;
        if (_pt instanceof CPaint2D) {
            const m2D = new CPaint2DMerge(null);
            m2D.SetYSort(_pt.mYSort);
            if (_pt.GetTag().has("wind"))
                m2D.Wind(_pt.mWindInfluence.x);
            merge = m2D;
        }
        else {
            const pt3D = _pt;
            const m3D = new CPaint3DMerge([], [], pt3D.mCenterPos, pt3D.mTargetScale);
            if (pt3D.GetTag().has("wind"))
                m3D.Wind(pt3D.mWindInfluence.x);
            if (pt3D.GetTexture().length > 0)
                m3D.mTexOverride = [...pt3D.GetTexture()];
            merge = m3D;
        }
        if (_pt instanceof CPaint2D)
            merge.SetTexture([..._pt.GetTexture()]);
        for (const tag of _pt.GetTag())
            if (tag != "codi")
                merge.PushTag(tag);
        if (_pt.GetTag().has("colorModel"))
            merge.SetColorModel(_pt.GetColorModel());
        if (_pt.GetTag().has("alphaModel"))
            merge.SetAlphaModel(_pt.GetAlphaModel());
        this.mGroup.set(key, merge);
        this.PushComp(merge);
        return merge;
    }
    GroupKey(_pt) {
        const tag = [..._pt.GetTag()].filter(_t => _t != "codi").sort().join(",");
        let key = tag + "|" + _pt.GetTexture().join(",") + "|" + _pt.GetColorModel().mF32A.join(",") + "|" + _pt.GetAlphaModel().mF32A.join(",");
        if (_pt instanceof CPaint2D)
            key = "2D|" + key + "|" + _pt.mYSort + "|" + _pt.mWindInfluence.x;
        else {
            const pt3D = _pt;
            key = "3D|" + key + "|" + pt3D.mMesh + "|" + pt3D.mCenterPos + "|" + pt3D.mTargetScale + "|" + pt3D.mWindInfluence.x;
        }
        return key;
    }
}

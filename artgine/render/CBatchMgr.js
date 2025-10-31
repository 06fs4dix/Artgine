import { CArray } from "../basic/CArray.js";
import { CHash } from "../basic/CHash.js";
export class CTypeUni {
    type;
    uni;
    last;
}
export class CBatch {
    mKey = null;
    mMesh = null;
    mTexture = new Array();
    mValue = new Array();
    CreateKey() {
        var str = this.mMesh.Key();
        for (var i = 0; i < this.mTexture.length; ++i) {
            if (this.mTexture[i] == null)
                str += "null";
            else
                str += this.mTexture[i].Key();
            str += "/";
        }
        for (let i = 0; i < this.mValue.length; ++i)
            str += this.mValue[i].mKey;
        this.mKey = CHash.HashCode(str);
        if (this.mKey < 0)
            this.mKey = -this.mKey;
        this.mKey = this.mKey << 16;
    }
}
export class CBatchArray {
    mData = new Array();
    mPriority = 0;
}
export class CBatchMgr {
    mRender;
    mBatchMap = null;
    mBatch = null;
    mLock = true;
    mBatchPool = new Array();
    mBatchSize = 0;
    mBatchGlobal = new CArray();
    mBaSortArr = new CArray();
    mBatchGDummy = new CBatch();
    mUniArr = new CArray();
    mBasePriority = null;
    mFeedbackLoop = new Set();
    mTexDataAtt = new Set();
    constructor(_render) {
        this.mRender = _render;
    }
    SetFeedBackLoop(_data) {
        this.mFeedbackLoop.add(_data);
    }
    DeleteFeedBackLoop(_data) {
        this.mFeedbackLoop.delete(_data);
    }
    IsBatchMap() {
        return this.mBatchMap != null;
    }
    BatchStart() {
        if (this.mBatchMap == null)
            this.mBatchMap = new Map();
        this.mRender.mUniTexLastOff = -1;
        this.mBasePriority = 0;
        this.mBaSortArr.Clear();
        this.mTexDataAtt.clear();
    }
    BatchEnd() {
        this.mBatchMap = null;
    }
    BatchGlobalOn() {
        if (this.mBatchMap == null)
            return;
        this.mBatchGlobal.Clear();
        this.mBatch = this.mBatchGDummy;
        this.mBatchGDummy.mMesh = null;
        this.mBatchGDummy.mTexture.length = 0;
        this.mBatchGDummy.mValue.length = 0;
    }
    BatchGlobalOff() {
        if (this.mBatchMap == null)
            return;
        for (var i = 0; i < this.mBatch.mValue.length; ++i)
            this.mBatchGlobal.Push(this.mBatch.mValue[i]);
        this.mBatch = null;
    }
    BatchGlobalClear() {
        this.mBatchGlobal.Clear();
    }
    BatchOn() {
        if (this.mBatchMap == null)
            return;
        if (this.mBatchSize == this.mBatchPool.length)
            this.mBatchPool.push(new CBatch());
        this.mBatch = new CBatch();
        this.mBatchSize++;
    }
    BatchOff() {
        if (this.mBatchMap == null)
            return;
        this.mBatch.CreateKey();
        let bKey = this.mBatch.mKey + this.mBasePriority;
        var val = this.mBatchMap.get(bKey);
        if (val == null) {
            this.mBatchMap.set(bKey, new CBatchArray());
            val = this.mBatchMap.get(bKey);
            val.mPriority = this.mBasePriority;
        }
        if (val.mData.length == 0)
            this.mBaSortArr.Push(val);
        if (this.mBatchGlobal != null) {
            for (var i = 0; i < this.mBatchGlobal.Size(); ++i) {
                this.mBatch.mValue.push(this.mBatchGlobal.Find(i));
            }
        }
        val.mData.push(this.mBatch);
        this.mBatch = null;
        return val.mData[val.mData.length - 1];
    }
    BatchPushArr(_ba) {
        if (this.mBatchMap == null)
            return _ba;
        for (let i = 0; i < _ba.length; ++i) {
            const batch = _ba[i];
            if (batch == null)
                continue;
            let bKey = batch.mKey + this.mBasePriority;
            var val = this.mBatchMap.get(bKey);
            if (val == null) {
                val = new CBatchArray();
                this.mBatchMap.set(bKey, val);
                val.mPriority = this.mBasePriority;
            }
            if (val.mData.length == 0)
                this.mBaSortArr.Push(val);
            if (val.mData.length > 0) {
                if (val.mData[0].mValue.length != batch.mValue.length) {
                    CAlert.E("test!!!!!!!!!!!!!!!!" + batch.mKey);
                    batch.CreateKey();
                    val.mData[0].CreateKey();
                }
            }
            val.mData.push(batch);
        }
        return null;
    }
    SetBatchSA(_sa) {
        this.mBatch.mValue.push(_sa);
    }
    SetBatchTex(_texture) {
        this.mBatch.mTexture = _texture;
    }
    SetBatchMesh(_mesh) {
        this.mBatch.mMesh = _mesh;
    }
    BatchExcute(_vf) {
    }
}
export class CBatchMgrGL extends CBatchMgr {
    constructor(_render) {
        super(_render);
    }
    BatchExcute(_vf) {
    }
}
import CBatchMgr_imple from "../render_imple/CBatchMgr.js";
import { CAlert } from "../basic/CAlert.js";
CBatchMgr_imple();

import { CArray } from "../basic/CArray.js";
import { CHash } from "../basic/CHash.js";
export class CBatch {
    mKey = null;
    mMesh = null;
    mTexture = new Array();
    mTexOff = new Array();
    mTexAtt = new Array();
    mValue = new Array();
    CreateKey() {
        var str = this.mMesh.Key();
        for (var i = 0; i < this.mTexOff.length; ++i) {
            str += this.mTexture[this.mTexOff[i]];
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
    mBasePriority = null;
    mFeedbackLoop = new Set();
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
            val.mData.push(batch);
        }
        return null;
    }
    SetBatchSA(_sa) {
        this.mBatch.mValue.push(_sa);
    }
    SetBatchTex(_texture, _textureOff = null, _attach = null) {
        this.mBatch.mTexture = _texture;
        if (_textureOff == null) {
            this.mBatch.mTexOff = new Array();
            for (var i = 0; i < _texture.length; ++i)
                this.mBatch.mTexOff.push(i);
        }
        else {
            if (_textureOff.length < _texture.length) {
                for (var i = _textureOff.length; i < _texture.length; ++i)
                    _textureOff.push(i);
            }
            this.mBatch.mTexOff = _textureOff;
        }
        this.mBatch.mTexAtt = _attach;
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
CBatchMgr_imple();

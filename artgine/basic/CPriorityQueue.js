export class CPriorityQueue {
    mData = [];
    mCmp;
    constructor(cmp) { this.mCmp = cmp; }
    Size() { return this.mData.length; }
    Clear() { this.mData.length = 0; }
    Push(val) {
        this.mData.push(val);
        this._bubbleUp(this.mData.length - 1);
    }
    Pop() {
        const top = this.mData[0];
        const last = this.mData.pop();
        if (this.mData.length > 0) {
            this.mData[0] = last;
            this._sinkDown(0);
        }
        return top;
    }
    _bubbleUp(i) {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.mCmp(this.mData[i], this.mData[parent]) < 0) {
                const tmp = this.mData[i];
                this.mData[i] = this.mData[parent];
                this.mData[parent] = tmp;
                i = parent;
            }
            else
                break;
        }
    }
    _sinkDown(i) {
        const n = this.mData.length;
        while (true) {
            let smallest = i;
            const l = (i << 1) + 1;
            const r = l + 1;
            if (l < n && this.mCmp(this.mData[l], this.mData[smallest]) < 0)
                smallest = l;
            if (r < n && this.mCmp(this.mData[r], this.mData[smallest]) < 0)
                smallest = r;
            if (smallest === i)
                break;
            const tmp = this.mData[i];
            this.mData[i] = this.mData[smallest];
            this.mData[smallest] = tmp;
            i = smallest;
        }
    }
}

export class CPriorityQueue<T>
{
    private mData: T[] = [];
    private mCmp: (a: T, b: T) => number;

    constructor(cmp: (a: T, b: T) => number) { this.mCmp = cmp; }

    Size(): number { return this.mData.length; }
    Clear(): void { this.mData.length = 0; }
    
    Push(val: T): void
    {
        this.mData.push(val);
        this._bubbleUp(this.mData.length - 1);
    }

    Pop(): T
    {
        const top = this.mData[0];
        const last = this.mData.pop();
        if (this.mData.length > 0)
        {
            this.mData[0] = last;
            this._sinkDown(0);
        }
        return top;
    }

    private _bubbleUp(i: number): void
    {
        while (i > 0)
        {
            const parent = (i - 1) >> 1;
            if (this.mCmp(this.mData[i], this.mData[parent]) < 0)
            {
                const tmp = this.mData[i];
                this.mData[i] = this.mData[parent];
                this.mData[parent] = tmp;
                i = parent;
            }
            else break;
        }
    }

    private _sinkDown(i: number): void
    {
        const n = this.mData.length;
        while (true)
        {
            let smallest = i;
            const l = (i << 1) + 1;
            const r = l + 1;
            if (l < n && this.mCmp(this.mData[l], this.mData[smallest]) < 0) smallest = l;
            if (r < n && this.mCmp(this.mData[r], this.mData[smallest]) < 0) smallest = r;
            if (smallest === i) break;
            const tmp = this.mData[i];
            this.mData[i] = this.mData[smallest];
            this.mData[smallest] = tmp;
            i = smallest;
        }
    }
}
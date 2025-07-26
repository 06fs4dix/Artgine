export class CQueue {
    mStorage = new Map();
    mFront = 0;
    mRear = 0;
    Enqueue(item) {
        this.mStorage.set(this.mRear++, item);
    }
    Dequeue() {
        if (this.IsEmpty())
            return null;
        const item = this.mStorage.get(this.mFront);
        this.mStorage.delete(this.mFront++);
        return item ?? null;
    }
    Pop() {
        if (this.IsEmpty())
            return null;
        const lastIndex = this.mRear - 1;
        const item = this.mStorage.get(lastIndex);
        this.mStorage.delete(lastIndex);
        this.mRear = lastIndex;
        return item;
    }
    Peek() {
        return this.mStorage.get(this.mFront) ?? null;
    }
    IsEmpty() {
        return this.mFront === this.mRear;
    }
    Size() {
        return this.mRear - this.mFront;
    }
    New(_new) {
        if (this.IsEmpty())
            return new _new();
        return this.Dequeue();
    }
    HasDuplicate() {
        const seen = new Set();
        for (let i = this.mFront; i < this.mRear; i++) {
            const item = this.mStorage.get(i);
            if (seen.has(item))
                return true;
            seen.add(item);
        }
        return false;
    }
    TryCompact() {
        if (this.mFront > 1000 && this.mFront > this.Size() * 2) {
            const newStorage = new Map();
            let index = 0;
            for (let i = this.mFront; i < this.mRear; i++) {
                const item = this.mStorage.get(i);
                if (item !== undefined) {
                    newStorage.set(index++, item);
                }
            }
            this.mStorage = newStorage;
            this.mRear = index;
            this.mFront = 0;
        }
    }
    Clear() {
        this.mStorage.clear();
        this.mFront = 0;
        this.mRear = 0;
    }
}

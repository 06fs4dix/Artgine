export class CQueue<T> 
{
	private mStorage: Map<number, T> = new Map();
	private mFront = 0;
	private mRear = 0;

	Enqueue(item: T) {
		this.mStorage.set(this.mRear++, item);
	}

	Dequeue(): T | null {
		if (this.IsEmpty()) return null;
		const item = this.mStorage.get(this.mFront);
		this.mStorage.delete(this.mFront++);
		return item ?? null;
	}
	 Pop(): T | null {
		if (this.IsEmpty()) return null;
		// rear는 다음 삽입 인덱스를 가리키므로, 꺼낼 인덱스는 mRear-1
		const lastIndex = this.mRear - 1;
		const item = this.mStorage.get(lastIndex)!;
		this.mStorage.delete(lastIndex);
		this.mRear = lastIndex;  // rear 포인터 한 칸 뒤로 이동
		return item;
	}
  
	Peek(): T | null {
		return this.mStorage.get(this.mFront) ?? null;
	}
  
	IsEmpty(): boolean {
	  return this.mFront === this.mRear;
	}
  
	Size(): number {
	  return this.mRear - this.mFront;
	}
	New(_new)
	{
		if (this.IsEmpty()) return new _new();
		return this.Dequeue();
	}


	HasDuplicate(): boolean 
	{
		const seen = new Set<T>();
		for (let i = this.mFront; i < this.mRear; i++) {
			const item = this.mStorage.get(i);
			if (seen.has(item)) return true;
			seen.add(item);
		}
		return false;
	}
	private TryCompact(): void {
		if (this.mFront > 1000 && this.mFront > this.Size() * 2) {
			const newStorage = new Map<number, T>();
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
	Clear(): void {
		this.mStorage.clear();
		this.mFront = 0;
		this.mRear = 0;
	}
}
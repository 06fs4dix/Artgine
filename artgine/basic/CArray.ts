export class CArray<T>
{
    mArray : Array<T>;
    mLength : number=0;
    constructor(_size=0)
    {
        this.mArray=new Array(_size);
    }
    Push(_data : T)
    {
        if(this.mLength<this.mArray.length)
		{
			this.mArray[this.mLength]=_data;
		}
		else
			this.mArray.push(_data);
		this.mLength++;
    }
    PushArray(_data : CArray<T>)
    {
        for(let i=0;i<_data.Size();++i)
        {
            this.Push(_data.Find(i));
        }
    }
    New(_new)
    {
        if(this.mArray.length>this.mLength)
        {
            this.mLength++;
            return this.mArray[this.mLength-1];
        }
        var data=new _new();
        this.Push(data);
        return data;
    }
    Pop()
    {
        if(0<this.mLength)
        {
            this.mLength--;
            return this.mArray[this.mLength];
        }
        
        return null;
    }
    Clear()
    {
        if(this.mLength!=0)
            this.mLength=0;
    }
    HardClear()
    {
        for(var i=0;i<this.mArray.length;++i)
        {
            this.mArray[i]=null;
        }
        if(this.mLength!=0)
            this.mLength=0;
    }
    Find(_offset)
    {
        return this.mArray[_offset];
    }
    Modify(_offset,_Data)
    {
        this.mArray[_offset]=_Data;
    }
    AddLen()
    {
        this.mLength++;
    }
    Size()  {   return this.mLength;    }
    Remove(_offset)
    {
        if(typeof _offset == "number")
        {
            this.mArray.splice(_offset,1);
            this.mLength--;
        }
            
        else
        {
            for(let i=0;i<this.mLength;++i)
            {
                if(this.mArray[i]==_offset)
                {
                    this.mArray.splice(i,1);
                    this.mLength--;
                    break;
                }
            }
        }
        
    }
    Swap(_a,_b)
    {
        var dummy=this.mArray[_a];
        this.mArray[_a]=this.mArray[_b];
        this.mArray[_b]=dummy;
    }
    Sort(_f : (a : T, b : T) => number) {
        for(let i = this.mLength; i < this.mArray.length; i++) {
            this.mArray[i] = null;
        }
        this.mArray.sort((a, b) => {
            if(a == null) {
                return 0;
            }
            else if(b == null) {
                return 0;
            }
            return _f(a, b);
        });
    }
    Resize(_len)
    {
        this.mLength=_len;
        if(_len>this.mArray.length)
            this.mArray.length=_len;
        
    }
}
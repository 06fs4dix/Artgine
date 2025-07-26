export class CIndexBuffer
{
	public m32 : boolean;
	public mBuf : any;
	constructor()
	{
		this.m32 = true;
		this.mBuf = null;
	}

	CreateBuf16(_size)
	{
		this.m32 = false;
		this.mBuf = new Uint16Array(_size*3);
		for (var i = 0; i < _size * 3; ++i)
		{
			this.mBuf[i] = 0;
		}
	}
	CreateBuf32(_size)
	{
		this.m32 = true;
		this.mBuf = new Uint32Array(_size);
		// for (var i = 0; i < _size; ++i)
		// {
		// 	this.buf[i] = 0;
		// }
	}
	ChangeBuf(_size)
	{
		if (this.m32)
		{
			let dum = new Uint16Array(_size*3);
			for (var i = 0; i < _size * 3; ++i)
			{
				dum[i] = this.mBuf[i];
			}
			this.mBuf = dum;
		}
		else
		{
			let dum = new Uint32Array(_size*3);
			for (var i = 0; i < _size * 3; ++i)
			{
				dum[i] = this.mBuf[i];
			}
			this.mBuf = dum;
		}
	}

	GetUInt16()	:Uint16Array{	return this.mBuf;	}
	GetUInt32()	:Uint32Array	{	return this.mBuf;	}
	GetBuf()	{	return this.mBuf;	}
	Delete()	{	this.mBuf=null;	}
}
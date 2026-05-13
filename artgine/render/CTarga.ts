

export class CExporter
{
	buffer : ArrayBufferLike=null;
	GetResult() : ArrayBufferLike
	{
		return this.buffer;
	}
}

export class CTarga extends CExporter
{
	public imageIDLength=0;// 식별 필드의 길이 // 0이면 식별 필드가 NO포함 0
	public colorMapType=0;// 색상 맵의 종류 : 항상 0임 1
	public imageTypeCode=0;// 2이면 압축되지 않은 RGB// 3이면 압축되지 않은 그레이 스케일 2
	public colorMapOrigin=0;// 색상 맵의 시작위치 4
	public colorMapLength=0;// 색상 맵의 항목 길이
	public colorMapEntrySize=0;// 색상 맵의 항목 크기
	public imageXOrigin=0;// 이미지 우측하단 x 좌표
	public imageYOrigin=0;// 이미지 좌측하단 x좌표 
	public imageWidth=0;// 이미지 픽셀 단위 너비
	public imageHeight=0;// 이미지 픽셀 단위 높이
	public bitCount=32;// 색상 비트 수 : 16, 24, 32
	public imageDescriptor=0;// 24비트 : 0x00, 32비트 : 0x08
	public imageBuffer : ArrayBuffer;
	public yFlipped : boolean;

	constructor(_imgBuf : ArrayBuffer, _width : number, _height : number, _yFlipped = false)
	{
		super();
		this.imageBuffer = _imgBuf;
		this.imageWidth  = _width;
		this.imageHeight = _height;
		this.yFlipped    = _yFlipped;
	}
	override GetResult() : ArrayBufferLike
	{
		const src = new Uint8Array(this.imageBuffer);
		const buf8 = new Uint8Array(18 + src.byteLength);
		const view = new DataView(buf8.buffer);

		// 헤더
		buf8[2]  = 2;                                          // imageTypeCode
		view.setUint16(12, this.imageWidth,  true);            // little endian
		view.setUint16(14, this.imageHeight, true);
		buf8[16] = this.bitCount;
		buf8[17] = 0x00; // imageDescriptor: bottom-left origin (TGA 정석)

		this.buffer = buf8.buffer;




		for (let y = 0; y < this.imageHeight; ++y)
		{
			//const srcY = this.imageHeight - 1 - y;  // bottom row → 파일 앞쪽
			const srcY = this.yFlipped? y : this.imageHeight - 1 - y;   
			for (let x = 0; x < this.imageWidth; ++x)
			{
				const si = (x + srcY * this.imageWidth) * 4;
				const di = 18 + (x + y  * this.imageWidth) * 4;
				buf8[di+0] = src[si+2]; // B
				buf8[di+1] = src[si+1]; // G
				buf8[di+2] = src[si+0]; // R
				buf8[di+3] = src[si+3]; // A
			}
		}

		
		return this.buffer;
	}

	
	
};
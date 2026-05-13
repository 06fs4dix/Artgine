import { CAlert } from "../../basic/CAlert.js";
import { CParser } from "./CParser.js";
import { CTexture } from "../../render/CTexture.js";

// ── CRC-32 테이블 ─────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
		t[n] = c;
	}
	return t;
})();

function Crc32(pa_data: Uint8Array): number {
	let crc = 0xFFFFFFFF;
	for (let i = 0; i < pa_data.length; i++)
		crc = CRC_TABLE[(crc ^ pa_data[i]) & 0xFF] ^ (crc >>> 8);
	return (crc ^ 0xFFFFFFFF) >>> 0;
}

const PNG_SIG  = [137, 80, 78, 71, 13, 10, 26, 10];
const CH_COUNT = { 0:1, 2:3, 3:1, 4:2, 6:4 };

function ReadU32BE(buf: Uint8Array, off: number): number {
	return ((buf[off] << 24) | (buf[off+1] << 16) | (buf[off+2] << 8) | buf[off+3]) >>> 0;
}

export class CParserPNG extends CParser
{
	public mTemp     = new Uint8Array(4);
	public mAlphaCut = 0;
	public mAlphaBleed;
	constructor() { super(); }

	override async Load(pa_fileName: string)
	{
		if (await this.Open(pa_fileName)) return;
		const buf = this.mBuffer;

		for (let i = 0; i < 8; i++) {
			if (buf[i] !== PNG_SIG[i]) { CAlert.E("[CParserPNG] Invalid PNG signature"); return; }
		}

		let pos = 8;
		let width = 0, height = 0, bitDepth = 0, colorType = 0, channels = 1, interlace = 0;
		let palette: Uint8Array = null;
		const idatParts: Uint8Array[] = [];

		// ── 청크 순회 ─────────────────────────────────────────────────────
		while (pos + 12 <= buf.length)
		{
			const chunkStart = pos;
			const length     = ReadU32BE(buf, pos); pos += 4;
			const type       = String.fromCharCode(buf[pos], buf[pos+1], buf[pos+2], buf[pos+3]); pos += 4;
			const dataStart  = pos;

			// CRC 검증
			const storedCRC = ReadU32BE(buf, chunkStart + 8 + length);
			if (Crc32(buf.subarray(chunkStart + 4, chunkStart + 8 + length)) !== storedCRC) {
				CAlert.E(`[CParserPNG] CRC 불일치 — chunk: ${type}`); return;
			}

			// 미지원 포맷 차단
			if (type === 'acTL') { CAlert.E("[CParserPNG] APNG(애니메이션 PNG)는 미지원"); return; }

			if (type === 'IHDR')
			{
				width      = ReadU32BE(buf, pos); pos += 4;
				height     = ReadU32BE(buf, pos); pos += 4;
				bitDepth   = buf[pos++];
				colorType  = buf[pos++];
				pos       += 2; // compression, filter (항상 0)
				interlace  = buf[pos++];
				channels   = CH_COUNT[colorType] ?? 1;

				if (interlace === 1) { CAlert.E("[CParserPNG] Adam7 인터레이스는 미지원"); return; }
				if (![1, 2, 4, 8, 16].includes(bitDepth)) { CAlert.E(`[CParserPNG] 지원하지 않는 bit depth: ${bitDepth}`); return; }
			}
			else if (type === 'PLTE')
			{
				palette = buf.slice(dataStart, dataStart + length);
				pos     = dataStart + length;
			}
			else if (type === 'IDAT')
			{
				idatParts.push(buf.slice(dataStart, dataStart + length));
				pos = dataStart + length;
			}
			else if (type === 'IEND') { break; }
			else { pos = dataStart + length; }

			pos += 4; // CRC 스킵
		}

		// IDAT concat
		const totalLen = idatParts.reduce((a, b) => a + b.length, 0);
		const idat     = new Uint8Array(totalLen);
		let   off      = 0;
		for (const p of idatParts) { idat.set(p, off); off += p.length; }

		// 압축 해제
		const raw = await this.Decompress(idat);
		if (!raw) { CAlert.E("[CParserPNG] IDAT 압축 해제 실패"); return; }

		// 필터 역적용
		const rawPixels = this.ApplyFilters(raw, width, height, bitDepth, colorType, channels);

		// 팔레트 확장 (color type 3)
		let finalPixels = rawPixels;
		let finalCh     = channels;
		if (colorType === 3) {
			if (!palette) { CAlert.E("[CParserPNG] PLTE 청크 없음"); return; }
			finalPixels = this.ExpandPalette(rawPixels as Uint8Array, palette, width, height);
			finalCh     = 3;
		}

		// CTexture 생성
		const L_tex = new CTexture();
		L_tex.SetSize(width, height);
		L_tex.CreateBuf();
		const texBuf = L_tex.GetBuf()[0] as Uint8Array;
		this.mResult = L_tex;

		const maxVal = bitDepth === 16 ? 65535 : 255;

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const si = (y * width + x) * finalCh;
				const di =  y * width * 4  + x * 4;
				let r = 0, g = 0, b = 0, a = 255;

				switch (colorType) {
					case 0: // Grayscale
						r = g = b = this.To8(finalPixels[si], bitDepth, maxVal); break;
					case 2: // RGB
						r = this.To8(finalPixels[si],   bitDepth, maxVal);
						g = this.To8(finalPixels[si+1], bitDepth, maxVal);
						b = this.To8(finalPixels[si+2], bitDepth, maxVal); break;
					case 3: // Palette → RGB
						r = finalPixels[si]; g = finalPixels[si+1]; b = finalPixels[si+2]; break;
					case 4: // Grayscale + Alpha
						r = g = b = this.To8(finalPixels[si],   bitDepth, maxVal);
						a         = this.To8(finalPixels[si+1], bitDepth, maxVal); break;
					case 6: // RGBA
						r = this.To8(finalPixels[si],   bitDepth, maxVal);
						g = this.To8(finalPixels[si+1], bitDepth, maxVal);
						b = this.To8(finalPixels[si+2], bitDepth, maxVal);
						a = this.To8(finalPixels[si+3], bitDepth, maxVal); break;
				}

				texBuf[di    ] = r;
				texBuf[di + 1] = g;
				texBuf[di + 2] = b;
				texBuf[di + 3] = a;

				if (a !== 0xFF && a !== 0) L_tex.SetAlpha(true);
			}
		}
	}


	override GetResult(): CTexture { return this.mResult; }



	// ── Deflate 압축 해제 ─────────────────────────────────────────────────
	private async Decompress(pa_idat: Uint8Array): Promise<Uint8Array | null>
	{
		try {
			const deflateRaw = pa_idat.slice(2, pa_idat.length - 4);
			const ds         = new DecompressionStream('deflate-raw');
			const writer     = ds.writable.getWriter();
			const reader     = ds.readable.getReader();
			writer.write(deflateRaw); writer.close();

			const chunks: Uint8Array[] = [];
			let total = 0;
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				chunks.push(value); total += value.length;
			}
			const out = new Uint8Array(total);
			let p = 0; for (const c of chunks) { out.set(c, p); p += c.length; }
			return out;
		} catch(e) { return null; }
	}

	// ── PNG 필터 역적용 ───────────────────────────────────────────────────
	private ApplyFilters(
		pa_raw: Uint8Array, pa_w: number, pa_h: number,
		pa_bit: number, pa_ct: number, pa_ch: number
	): Uint8Array | Uint16Array
	{
		const stride = Math.ceil(pa_w * pa_bit * pa_ch / 8);
		const bpp    = Math.max(1, Math.floor(pa_bit * pa_ch / 8));
		const out    = new Uint8Array(pa_h * stride);

		for (let y = 0; y < pa_h; y++) {
			const fb   = pa_raw[y * (stride + 1)];
			const src  = pa_raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
			const curr = out.subarray(y * stride, y * stride + stride);
			const prev = y > 0 ? out.subarray((y-1) * stride, (y-1) * stride + stride) : null;

			for (let i = 0; i < stride; i++) {
				const a = i >= bpp         ? curr[i - bpp] : 0;
				const b = prev             ? prev[i]       : 0;
				const c = prev && i >= bpp ? prev[i - bpp] : 0;
				switch (fb) {
					case 0: curr[i] =  src[i];                              break;
					case 1: curr[i] = (src[i] + a)               & 0xFF;   break;
					case 2: curr[i] = (src[i] + b)               & 0xFF;   break;
					case 3: curr[i] = (src[i] + ((a+b) >>> 1))   & 0xFF;   break;
					case 4: curr[i] = (src[i] + this.Paeth(a,b,c)) & 0xFF;break;
					default: curr[i] = src[i];
				}
			}
		}

		if (pa_bit === 16) {
			const u16 = new Uint16Array(pa_h * pa_w * pa_ch);
			for (let i = 0; i < u16.length; i++) u16[i] = (out[i*2] << 8) | out[i*2+1];
			return u16;
		}
		if (pa_bit < 8) return this.UnpackBits(out, pa_w, pa_h, pa_bit, pa_ch);
		return out;
	}

	// ── 1/2/4-bit 언패킹 → 0~255 ─────────────────────────────────────────
	private UnpackBits(pa_packed: Uint8Array, pa_w: number, pa_h: number, pa_bit: number, pa_ch: number): Uint8Array
	{
		const mask   = (1 << pa_bit) - 1;
		const scale  = 255 / mask;
		const stride = Math.ceil(pa_w * pa_bit * pa_ch / 8);
		const out    = new Uint8Array(pa_h * pa_w * pa_ch);
		let   idx    = 0;
		for (let y = 0; y < pa_h; y++) {
			let bitOff = 0;
			for (let x = 0; x < pa_w; x++) {
				const byteIdx = y * stride + Math.floor(bitOff / 8);
				const shift   = 8 - pa_bit - (bitOff % 8);
				out[idx++]    = Math.round(((pa_packed[byteIdx] >>> shift) & mask) * scale);
				bitOff       += pa_bit;
			}
		}
		return out;
	}

	// ── 팔레트 인덱스 → RGB ───────────────────────────────────────────────
	private ExpandPalette(pa_indexed: Uint8Array, pa_palette: Uint8Array, pa_w: number, pa_h: number): Uint8Array
	{
		const out = new Uint8Array(pa_h * pa_w * 3);
		for (let i = 0; i < pa_h * pa_w; i++) {
			const pi    = pa_indexed[i] * 3;
			out[i*3    ] = pa_palette[pi    ];
			out[i*3 + 1] = pa_palette[pi + 1];
			out[i*3 + 2] = pa_palette[pi + 2];
		}
		return out;
	}

	// 16-bit → 8-bit 다운스케일, 나머지는 그대로
	private To8(pa_v: number, pa_bit: number, pa_max: number): number
	{
		return pa_bit === 16 ? Math.round(pa_v / pa_max * 255) : pa_v;
	}

	private Paeth(a: number, b: number, c: number): number
	{
		const p = a + b - c;
		const pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c);
		return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
	}
}
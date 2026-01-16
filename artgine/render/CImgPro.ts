
import {CAlert} from "../basic/CAlert.js";
import {CBound} from "../geometry/CBound.js";
import { CMath } from "../geometry/CMath.js";
import {CPoolGeo} from "../geometry/CPoolGeo.js";

import {CVec2} from "../geometry/CVec2.js";
import {CVec3} from "../geometry/CVec3.js";
import {CVec4} from "../geometry/CVec4.js";
import {CTexture, CTextureInfo} from "../render/CTexture.js"
import { SDF } from "../z_file/SDF.js";
import { CH5Canvas } from "./CH5Canvas.js";
import { CUtilRender } from "./CUtilRender.js";

export class CImgPro
{

	
	//특정 컬러 텍스처 만든다
	static Square(_w : number,_h : number,_color : CVec4) : CTexture
	{
		var tex=new CTexture();
		tex.SetSize(_w, _h);
		tex.CreateBuf();
		var buf = tex.GetBuf();
		var size=4*_w*_h;
		for (var i = 0; i < size; i+=4)
		{
			buf[i + 0] = 0xff * _color.x;
			buf[i + 1] = 0xff * _color.y;
			buf[i + 2] = 0xff * _color.z;
			buf[i + 3] = 0xff * _color.w;
		}

		return tex;
	}
	//자동으로 짤라낸다
	static AutoCut(_img : CTexture,_RGBPass : CVec3,_rect : CVec4,_smallCut : number=2) 
	{
		var imgBuf = _img.GetBuf()[0];
		var iBuf : ImageData;
		if(imgBuf instanceof HTMLImageElement) {
			var canvas=document.createElement("canvas");
			canvas.width=imgBuf.width;
			canvas.height=imgBuf.height;
			var ctx=canvas.getContext('2d');
		
			ctx.drawImage(imgBuf, 0, 0, imgBuf.width, imgBuf.height);

			// 복제된 이미지에 대한 픽셀정보를 가져옴
			iBuf= ctx.getImageData(0, 0, imgBuf.width, imgBuf.height);
		}

		else if(imgBuf instanceof Uint8Array) {
			iBuf = new ImageData(_img.GetWidth(), _img.GetHeight());
			iBuf.data.set(imgBuf);
		}

		else {
			CAlert.E("CImgPro::AutoCut() : Invalid texture type");
			return;
		}
		
		var boundList=new Array<CBound>();
		var step=new Set<number>();
		
		function FD(_iBuf,_st : CVec3)
		{
			
			var bound=new CBound();
			var que=new Array<CVec3>();
			que.push(_st);
			
			while(que.length>0)
			{
				var fpos=que.splice(0,1)[0];
				var off=fpos.x*4+fpos.y*_img.GetWidth()*4;
				
				
				if(step.has(off) || fpos.x<0 || fpos.y<0 || fpos.x>=_img.GetWidth() || fpos.y>=_img.GetHeight())
					continue;
				if(iBuf.data[off+3]==0 || ( _RGBPass!=null && iBuf.data[off+0]==_RGBPass.x && iBuf.data[off+1]==_RGBPass.y && iBuf.data[off+2]==_RGBPass.z))
					continue;
				step.add(off);
				bound.InitBound(new CVec3(fpos.x,fpos.y));
				
				
				que.push(new CVec3(fpos.x-1,fpos.y));
				que.push(new CVec3(fpos.x,fpos.y-1));
				que.push(new CVec3(fpos.x,fpos.y+1));
				que.push(new CVec3(fpos.x+1,fpos.y));
			}
			return bound;
		} 
		for(var y=_rect.y;y<_rect.w;++y)
		{
			for(var x=_rect.x;x<_rect.z;++x)
			{
				var off=x*4+y*_img.GetWidth()*4;
				if(step.has(off))
					continue;
				if(iBuf.data[off+3]==0 || ( _RGBPass!=null && iBuf.data[off+0]==_RGBPass.x && iBuf.data[off+1]==_RGBPass.y && iBuf.data[off+2]==_RGBPass.z))
				{
					step.add(off);
					continue;
				}
				let bound=FD(iBuf,new CVec3(x,y));
				if(_smallCut<bound.GetInRadius())
					boundList.push(bound);
				
			}
		}
		
		
		return boundList; 
	}
	static SqurEnlargedReduced( _w:number,_h:number,_buf : any,pa_xScale : number, pa_yScale  : number, pa_sampleRate  : number)
	{
		var L_tex = new CTexture();

		var L_orgX=0, L_orgY=0;
		var L_add = 0;
		var L_pos = 0, L_dPos = 0;
		var L_texSizeX = Math.trunc((_w * pa_xScale) + 0.99);
		var L_texSizeY = Math.trunc((_h * pa_yScale) + 0.99);

		L_tex.SetSize(L_texSizeX,L_texSizeY);
		L_tex.CreateBuf();
		//L_tex.s_FLOAT32_4.clear();
		//L_tex.s_FLOAT32_4.resize(L_tex.size.x * L_tex.size.y);

		//s_Rect L_rect;
		var L_arr=new Array<CVec4>();
		for (var i = 0; i < 9; ++i)
		{
			L_arr.push(new CVec4(0,0,0,0));
		}
		


		var outSizeX = _w;
		var outSizeY = _h;

		//===========================================================================================
		var texBuf = L_tex.GetBuf()[0];
		var outBuf = _buf;


		//memset(texBuf, 0xff, L_texSizeX * L_texSizeY * 4);
		var v4=CPoolGeo.ProductV4();
		for (var y = 0; y < L_texSizeY; ++y)
		{
			for (var x = 0; x < L_texSizeX; ++x)
			{
				L_orgX = Math.trunc(x / pa_xScale);
				L_orgY = Math.trunc(y / pa_yScale);
				L_add = 0;

				if (x + 1 != outSizeX && pa_sampleRate >= 1)//→
				{
					L_pos = L_orgY * outSizeX * 4 + (L_orgX + 1) * 4;
					L_arr[L_add].x = outBuf[L_pos + 0];
					L_arr[L_add].y = outBuf[L_pos + 1];
					L_arr[L_add].z = outBuf[L_pos + 2];
					L_arr[L_add].w = outBuf[L_pos + 3];

					L_add++;
				}
				if (L_orgY + 1 != outSizeY && pa_sampleRate >= 2)//↓
				{
					L_pos = (L_orgY + 1) * outSizeX * 4 + L_orgX * 4;
					L_arr[L_add].x = outBuf[L_pos + 0];
					L_arr[L_add].y = outBuf[L_pos + 1];
					L_arr[L_add].z = outBuf[L_pos + 2];
					L_arr[L_add].w = outBuf[L_pos + 3];
					L_add++;
				}
				if (L_orgX - 1 != -1 && pa_sampleRate >= 3)//←
				{
					L_pos = L_orgY * outSizeX * 4 + (L_orgX - 1) * 4;
					L_arr[L_add].x = outBuf[L_pos + 0];
					L_arr[L_add].y = outBuf[L_pos + 1];
					L_arr[L_add].z = outBuf[L_pos + 2];
					L_arr[L_add].w = outBuf[L_pos + 3];
					L_add++;
				}
				if (L_orgY - 1 != -1 && pa_sampleRate >= 4)//↑
				{
					L_pos = (L_orgY - 1) * outSizeX * 4 + L_orgX * 4;
					L_arr[L_add].x = outBuf[L_pos + 0];
					L_arr[L_add].y = outBuf[L_pos + 1];
					L_arr[L_add].z = outBuf[L_pos + 2];
					L_arr[L_add].w = outBuf[L_pos + 3];
					L_add++;
				}



				//본인이다
				{
					L_pos = L_orgY * outSizeX * 4 + L_orgX * 4;
					L_arr[L_add].x = outBuf[L_pos + 0];
					L_arr[L_add].y = outBuf[L_pos + 1];
					L_arr[L_add].z = outBuf[L_pos + 2];
					L_arr[L_add].w = outBuf[L_pos + 3];




					L_add++;
				}

				L_pos = y * L_texSizeX * 4 + x * 4;
				texBuf[L_pos + 0] = 0;
				texBuf[L_pos + 1] = 0;
				texBuf[L_pos + 2] = 0;
				texBuf[L_pos + 3] = 0;
				
				var all=v4 as CVec4;
				all.Zero();
				for (var i = 0; i < L_add; ++i)
				{
					all.x += L_arr[i].x;
					all.y += L_arr[i].y;
					all.z += L_arr[i].z;
					all.w += L_arr[i].w;
				}
				texBuf[L_pos + 0] = Math.trunc(all.x / L_add);
				texBuf[L_pos + 1] = Math.trunc(all.y / L_add);
				texBuf[L_pos + 2] = Math.trunc(all.z / L_add);
				texBuf[L_pos + 3] = Math.trunc(all.w / L_add);

				var add = texBuf[L_pos + 3] + 26;
				if (add > 0xff && all.w != 0)
					texBuf[L_pos + 3] = 0xff;
				else
					texBuf[L_pos + 3] = add;
				

			}//for
		}//for
		CPoolGeo.RecycleV4(v4);
		return L_tex;
	}

	// 이미지를 컬러 팔레트로 변환함
	// rgb에서 변환한 index로 텍스쳐에서 색상 변환 가능
	// 아웃풋 텍스쳐에 들어갈 수 있는 최대 rgb로 계산함
	static ExtractColorPalette(_img : CTexture, _size : CVec2 = new CVec2(64, 64), _diffType : "RGB"|"LightWeight"|"CIE76" = "LightWeight") : CTexture
	{
		// 버퍼 없으면 readPixel로 버퍼 생성
		if(_img.GetBuf().length == 0 && _img.mReadPixelEvent!=null) {
			_img.mReadPixelEvent.Call(_img);
		}

		// 버퍼 없으면 리턴
		const buf = _img.GetBuf()[0];
		if(!buf) {
			CAlert.E("CImgPro::ExtractColorPalette() : No texture buffer");
			return null;
		}

		// 픽셀 버퍼
		let pixels : Uint8Array;
		if(buf instanceof Image) {
			CH5Canvas.Init(_img.GetWidth(), _img.GetHeight());
			CH5Canvas.DrawImage(buf, 0, 0);
			pixels = CH5Canvas.GetNewTex().GetBuf()[0];
        }
        else {
            pixels = buf;
        }

		// 헬퍼 함수
		function RGBToR(_rgb : number) : number {
			return (_rgb & 0x0000FF) >> 0;
		}
		function RGBToG(_rgb : number) : number {
			return (_rgb & 0x00FF00) >> 8;
		}
		function RGBToB(_rgb : number) : number {
			return (_rgb & 0xFF0000) >> 16;
		}
		function rgbToRGB(_r : number, _g : number, _b : number) {
			return (_r << 0) | (_g << 8) | (_b << 16);
		}
		function Linearize(_val : number) {
			_val /= 255.0;
			if (_val <= 0.04045) {
				return _val / 12.92;
			} else {
				return Math.pow((_val + 0.055) / 1.055, 2.4);
			}
		}
		function F(_t) {
			if (_t > 0.008856) { // (6/29)^3
				return Math.pow(_t, 1/3);
			} else {
				return (7.787 * _t) + (16/116);
			}
		}
		function RGBToLab(_r : number, _g : number, _b : number) {
			const R = Linearize(_r);
			const G = Linearize(_g);
			const B = Linearize(_b);
			let X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
			let Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
			let Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
			const Xn = 0.95047;
			const Yn = 1.00000;
			const Zn = 1.08883;
			X /= Xn;
			Y /= Yn;
			Z /= Zn;
			const fx = F(X);
			const fy = F(Y);
			const fz = F(Z);
			const L = (116 * fy) - 16;
			const a = 500 * (fx - fy);
			const b = 200 * (fy - fz);
			return [L,a,b];
		}

		// 버퍼에서 중복되는 컬러 제거
		const colorSet = new Set<number>();
		for(let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i + 0];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
			const rgb = rgbToRGB(r, g, b);
            colorSet.add(rgb);
        }
		const colorArr = Array.from(colorSet);

		// 최대 rgb 셀 사이즈 탐색
		let cellSize = 0;
		const outPixelNum = _size.x * _size.y;
		let low = 1, high = Math.ceil(Math.cbrt(outPixelNum));
		while(low <= high) {
			const mid = Math.floor((low + high) / 2);
			const midCubed = mid * mid * mid;
			if(midCubed <= outPixelNum) {
				cellSize = mid;
				low = mid + 1;
			}
			else {
				high = mid - 1;
			}
		}

		// 헬퍼 함수
		function CellToColor(_cellIndex : number) {
			return Math.round(255 / (cellSize - 1) * _cellIndex);
		}
		function Diff(_rgb : number, _r : number, _g : number, _b : number) : number {	
			const r = RGBToR(_rgb);
			const g = RGBToG(_rgb);
			const b = RGBToB(_rgb);
			if(_diffType == "RGB") {
				const deltaR = r - _r;
				const deltaG = g - _g;
				const deltaB = b - _b;
				return deltaR * deltaR + deltaG * deltaG + deltaB * deltaB;
			}
			if(_diffType == "LightWeight") {
				const lumaR = 0.299, lumaG = 0.587, lumaB = 0.114;
				const lumaWeight = 0.75;
				const luma1 = r * lumaR + g * lumaG + b * lumaB;
				const luma2 = _r * lumaR + _g * lumaG + _b * lumaB;
				const lumaDelta = luma1 - luma2;
				const deltaR = RGBToR(_rgb) - _r;
				const deltaG = RGBToG(_rgb) - _g;
				const deltaB = RGBToB(_rgb) - _b;
				return (deltaR * deltaR * lumaR + deltaG * deltaG * lumaG + deltaB * deltaB * lumaB) * lumaWeight + lumaDelta * lumaDelta;
			}
			if(_diffType == "CIE76") {
                const [l1,a1,b1] = RGBToLab(r, g, b);
                const [l2,a2,b2] = RGBToLab(_r, _g, _b);
                const deltaL = l1 - l2;
                const deltaA = a1 - a2;
                const deltaB = b1 - b2;
                return deltaL * deltaL + deltaA * deltaA + deltaB * deltaB;
            }
		}
		function Mapping(_r : number, _g : number, _b : number) : CVec2 {
			const index = _r + _g * cellSize + _b * cellSize * cellSize;
			return new CVec2(
				Math.floor(index / _size.x),
				(index % _size.x)	// y flip
			);
		}

		// 컬러 diff 계산
		const outColors = new Uint8Array(_size.x * _size.y * 4);
		for(let bCell = 0; bCell < cellSize; bCell++) {
			for(let gCell = 0; gCell < cellSize; gCell++) {
				for(let rCell = 0; rCell < cellSize; rCell++) {
					let closestIndex = 0;
					let closest = Diff(colorArr[0], CellToColor(rCell), CellToColor(gCell), CellToColor(bCell));

					for(let i = 1; i < colorArr.length; i++) {
						const diff = Diff(colorArr[i], CellToColor(rCell), CellToColor(gCell), CellToColor(bCell));
						if(diff < closest) {
							closest = diff;
							closestIndex = i;
						}
					}

					const uv = Mapping(rCell, gCell, bCell);
					const index = uv.x + uv.y * _size.x;
					outColors[index * 4 + 0] = RGBToR(colorArr[closestIndex]);
					outColors[index * 4 + 1] = RGBToG(colorArr[closestIndex]);
					outColors[index * 4 + 2] = RGBToB(colorArr[closestIndex]);
					outColors[index * 4 + 3] = 255.0;	// rgb만 넣을 방법 없음
				}
			}
		}

		// 팔레트 텍스쳐 생성
		const out = new CTexture();
		out.SetFilter(CTexture.eFilter.Neaest);
		out.SetWrap(CTexture.eWrap.Clamp);
		out.SetMipMap(CTexture.eMipmap.None);
		out.SetSize(_size.x, _size.y);
		out.SetBuf(outColors);
		return out;
	}
	static CreateNoiseTexture(_type : number, _zVal : number = 0, _size : CVec2 = new CVec2(128, 128)) {
		// seamless로 만들기 위해 자를 부분만큼 더 크게 만듬
		var blendInc : number = 0.5;	// 이 값을 더 높이면 seamless 오류가 줄어듬
		var skirtWidth : number = Math.max(1, Math.floor(_size.x * blendInc));
		var skirtHeight : number = Math.max(1, Math.floor(_size.y * blendInc));
		var srcWidth : number = _size.x + skirtWidth;
		var srcHeight : number = _size.y + skirtHeight;
		
		// 노이즈 값을 [-1, 1] 범위로 나온다고 가정하고 [0, 1] 범위로 변경
		var prevBuffer = new Uint8Array(srcWidth * srcHeight * 4);
		var idx = 0;
		for(var y = 0; y < srcHeight; y++) {
			for(var x = 0; x < srcWidth; x++) {
				switch(_type) {
					case SDF.eNoise.Gaussian:
						prevBuffer[idx * 4 + 0] = (CUtilRender.NoiseSimplex(x * (2.76434 ** 0), y * (2.76434 ** 0), _zVal * (2.76434 ** 0)) * 0.5 + 0.5) * 255.0;
						// prevBuffer[idx * 4 + 1] = (CUtilRender.NoiseSimplex(x * (2.76434 ** 1), y * (2.76434 ** 1), _zVal * (2.76434 ** 1)) * 0.5 + 0.5) * 255.0;
						// prevBuffer[idx * 4 + 2] = (CUtilRender.NoiseSimplex(x * (2.76434 ** 2), y * (2.76434 ** 2), _zVal * (2.76434 ** 2)) * 0.5 + 0.5) * 255.0;
						// prevBuffer[idx * 4 + 3] = (CUtilRender.NoiseSimplex(x * (2.76434 ** 3), y * (2.76434 ** 3), _zVal * (2.76434 ** 3)) * 0.5 + 0.5) * 255.0;
						break;
					case SDF.eNoise.Perlin:
						prevBuffer[idx * 4 + 0] = (CUtilRender.NoisePerlin(x * (2.76434 ** 0), y * (2.76434 ** 0), _zVal * (2.76434 ** 0)) * 0.5 + 0.5) * 255.0;
						// prevBuffer[idx * 4 + 1] = (CUtilRender.NoisePerlin(x * (2.76434 ** 1), y * (2.76434 ** 1), _zVal * (2.76434 ** 1)) * 0.5 + 0.5) * 255.0;
						// prevBuffer[idx * 4 + 2] = (CUtilRender.NoisePerlin(x * (2.76434 ** 2), y * (2.76434 ** 2), _zVal * (2.76434 ** 2)) * 0.5 + 0.5) * 255.0;
						// prevBuffer[idx * 4 + 3] = (CUtilRender.NoisePerlin(x * (2.76434 ** 3), y * (2.76434 ** 3), _zVal * (2.76434 ** 3)) * 0.5 + 0.5) * 255.0;
						break;
					case SDF.eNoise.Voronoi:
						prevBuffer[idx * 4 + 0] = (CUtilRender.NoiseCellular(x * (2.76434 ** 0), y * (2.76434 ** 0), _zVal * (2.76434 ** 0)) * 0.5 + 0.5) * 255.0;
						// prevBuffer[idx * 4 + 1] = (CUtilRender.NoiseCellular(x * (2.76434 ** 1), y * (2.76434 ** 1), _zVal * (2.76434 ** 1)) * 0.5 + 0.5) * 255.0;
						// prevBuffer[idx * 4 + 2] = (CUtilRender.NoiseCellular(x * (2.76434 ** 2), y * (2.76434 ** 2), _zVal * (2.76434 ** 2)) * 0.5 + 0.5) * 255.0;
						// prevBuffer[idx * 4 + 3] = (CUtilRender.NoiseCellular(x * (2.76434 ** 3), y * (2.76434 ** 3), _zVal * (2.76434 ** 3)) * 0.5 + 0.5) * 255.0;
						break;
				}
				idx++;
			}
		}

		// seamless로 만들기 위해 포스트 프로세싱
		var buffer = new Uint8Array(_size.x * _size.y * 4);
		var halfWidth : number = Math.floor(_size.x * 0.5);
		var halfHeight : number = Math.floor(_size.y * 0.5);
		var skirtEdgeX : number = halfWidth + skirtWidth;
		var skirtEdgeY : number = halfHeight + skirtHeight;

		enum AltModulo {
			DEFAULT,
			ALT_X,
			ALT_Y,
			ALT_XY
		};

		// 인덱스 계산 편하게 하려고 만듬
		class ImgBuf {
			mBuf : Uint8Array;
			mWidth : number;
			mHeight : number;
			mOffsetX : number;
			mOffsetY : number;
			mAltWidth : number;
			mAltHeight : number;

			constructor(_buf : Uint8Array, _width : number, _height : number, _offsetX : number, _offsetY : number, _altWidth : number, _altHeight : number) {
				this.mBuf = _buf;
				this.mWidth = _width;
				this.mHeight = _height;
				this.mOffsetX = _offsetX;
				this.mOffsetY = _offsetY;
				this.mAltWidth = _altWidth;
				this.mAltHeight = _altHeight;
			}
			
			Get(_x : number, _y : number, _mode : AltModulo,_rVal=new CVec4()) {
				const index = this.CalcIndex(_x, _y, _mode);
				_rVal.mF32A[0]=this.mBuf[index * 4 + 0];
				_rVal.mF32A[1]=this.mBuf[index * 4 + 1];
				_rVal.mF32A[2]=this.mBuf[index * 4 + 2];
				_rVal.mF32A[3]=this.mBuf[index * 4 + 3];
				return _rVal;
			}

			Set(_x : number, _y : number,_mode : AltModulo,_val : number|CVec2|CVec3|CVec4) {
				const index = this.CalcIndex(_x, _y, _mode);
				if(typeof _val == "number") {
					this.mBuf[index * 4 + 0] = _val;
				}
				else if(_val instanceof CVec2) {
					this.mBuf[index * 4 + 0] = _val.x;
					this.mBuf[index * 4 + 1] = _val.y;
				}
				else if(_val instanceof CVec3) {
					this.mBuf[index * 4 + 0] = _val.x;
					this.mBuf[index * 4 + 1] = _val.y;
					this.mBuf[index * 4 + 2] = _val.z;
				}
				else {
					this.mBuf[index * 4 + 0] = _val.x;
					this.mBuf[index * 4 + 1] = _val.y;
					this.mBuf[index * 4 + 2] = _val.z;
					this.mBuf[index * 4 + 3] = _val.w;
				}
			}

			private CalcIndex(_x : number, _y : number, _mode : AltModulo) {
				let x, y;
				switch(_mode) {
					case AltModulo.ALT_XY:
						x = (_x + this.mOffsetX) % this.mAltWidth;
						y = (_y + this.mOffsetY) % this.mAltHeight;
						break;
					case AltModulo.ALT_X:
						x = (_x + this.mOffsetX) % this.mAltWidth;
						y = (_y + this.mOffsetY) % this.mHeight;
						break;
					case AltModulo.ALT_Y:
						x = (_x + this.mOffsetX) % this.mWidth;
						y = (_y + this.mOffsetY) % this.mAltHeight;
						break;
					default:
						x = (_x + this.mOffsetX) % this.mWidth;
						y = (_y + this.mOffsetY) % this.mHeight;
						break;
				}
				return x + y * this.mWidth;
			}
		}
		function Smoothstep(_from : number, _to : number, _s : number) {
			var s = CMath.Clamp((_s - _from) / (_to - _from), 0.0, 1.0);
			return s * s * (3 - 2 * s);
		}
		function AlphaBlend(_bg : CVec4, _fg : CVec4, _alpha : number,out=new CVec4()) {
			var alpha = _alpha + 1;
			var invAlpha = 256 - _alpha;

			
			out.x = (alpha * _fg.x + invAlpha * _bg.x) >> 8;
			out.y = (alpha * _fg.y + invAlpha * _bg.y) >> 8;
			out.z = (alpha * _fg.z + invAlpha * _bg.z) >> 8;
			out.w = (alpha * _fg.w + invAlpha * _bg.w) >> 8;

			return out;
		}
		
		//ImgBuf(버퍼, 버퍼의 가로크기, 버퍼의 세로크기, 중점X, 중점Y, 옮길 버퍼의 가로크기, 옮길 버퍼의 세로크기)
		var rd_src = new ImgBuf(prevBuffer, srcWidth, srcHeight, halfWidth, halfHeight, _size.x, _size.y);
		var rd_dest = new ImgBuf(buffer, _size.x, _size.y, 0, 0, 0, 0);
		var v4d0=new CVec4();
		var v4d1=new CVec4();
		var v4d2=new CVec4();

		// 중점을 기준으로 사분면을 반대쪽에 넣어줌
		for(var y = 0; y < _size.y; y++) {
			for(var x = 0; x < _size.x; x++) {
				rd_dest.Set(x, y,AltModulo.DEFAULT,rd_src.Get(x, y, AltModulo.ALT_XY,v4d0));
			}
		}

		// 가로로 알파블렌딩
		for (var x = halfWidth; x < skirtEdgeX; x++) {
			var alpha = Math.floor(255 * (1 - Smoothstep(0.1, 0.9, (x - halfWidth) / skirtWidth)));
			for (var y = 0; y < _size.y; y++) {
				if (y == halfHeight) {
					y = skirtEdgeY - 1;
				} 
				else {
					rd_dest.Set(x, y,AltModulo.DEFAULT,AlphaBlend(rd_dest.Get(x, y,AltModulo.DEFAULT,v4d0), rd_src.Get(x, y, AltModulo.ALT_Y,v4d1), alpha,v4d2));
				}
			}
		}

		// 세로로 알파블렌딩
		for (var y = halfHeight; y < skirtEdgeY; y++) {
			var alpha = Math.floor(255 * (1 - Smoothstep(0.1, 0.9, (y - halfHeight) / skirtHeight)));
			for (var x = 0; x < _size.x; x++) {
				if (x == halfWidth) {
					x = skirtEdgeX - 1;
				}
				else {
					rd_dest.Set(x, y,AltModulo.DEFAULT,AlphaBlend(rd_dest.Get(x, y,AltModulo.DEFAULT,v4d0), rd_src.Get(x, y, AltModulo.ALT_X,v4d1), alpha,v4d2));
				}
			}
		}

		// 중앙 부분 채우기
		for (var y = halfHeight; y < skirtEdgeY; y++) {
			for (var x = halfWidth; x < skirtEdgeX; x++) {
				var xpos : number = Math.floor(255 * (1 - Smoothstep(0.1, 0.9, (x - halfWidth) / skirtWidth)));
				var ypos : number = Math.floor(255 * (1 - Smoothstep(0.1, 0.9, (y - halfHeight) / skirtHeight)));

				var topBlend : CVec4 = AlphaBlend(rd_src.Get(x, y, AltModulo.ALT_X,v4d0), rd_src.Get(x, y,AltModulo.DEFAULT,v4d1), xpos,v4d2);
				var botBlend : CVec4 = AlphaBlend(rd_src.Get(x, y, AltModulo.ALT_XY,v4d0), rd_src.Get(x, y, AltModulo.ALT_Y,v4d1), xpos,v4d2);
				rd_dest.Set(x, y,AltModulo.DEFAULT,AlphaBlend(botBlend, topBlend, ypos));
			}
		}

		const out = new CTexture();
		out.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8)]);
		out.SetFilter(CTexture.eFilter.Neaest);
		out.SetWrap(CTexture.eWrap.Repeat);
		out.SetMipMap(CTexture.eMipmap.GL);
		out.SetSize(_size.x, _size.y);
		out.SetBuf(buffer);
		return out;
	}
	static Create3DNoiseTexture(_type : number, _size : CVec3 = new CVec3(128, 128, 128)) {
		var blendInc : number = 0.5;	// 이 값을 더 높이면 seamless 오류가 줄어듬
		var skirtDepth : number = Math.max(1, Math.floor(_size.z * blendInc));
		var srcDepth : number = _size.z + skirtDepth;

		const src : CTexture[] = [];
		for(let z = 0; z < srcDepth; z++) {
			const tex = this.CreateNoiseTexture(_type, z, new CVec2(_size.x, _size.y));
			src.push(tex);
		}

		// seamless로 만들기 위해 포스트 프로세싱
		const out : CTexture[] = new Array(_size.z);
		var halfDepth : number = Math.floor(_size.z * 0.5);
		var skirtEdgeZ : number = halfDepth + skirtDepth;

		function Smoothstep(_from : number, _to : number, _s : number) {
			var s = CMath.Clamp((_s - _from) / (_to - _from), 0.0, 1.0);
			return s * s * (3 - 2 * s);
		}

		// 중점을 기준으로 사분면을 반대쪽에 넣어줌
		for(var i = 0; i < halfDepth; i++) {
			const tex = src[i];
			src[i] = src[i + halfDepth];
			src[i + halfDepth] = tex;
			out[i] = src[i];
			out[i + halfDepth] = src[i + halfDepth];
		}
		
		for(var z = halfDepth; z < skirtEdgeZ; z++) {
			var alpha = Math.floor(255 * (1 - Smoothstep(0.1, 0.9, (z - halfDepth) / skirtDepth)));
			var a = alpha + 1;
			var invA = 256 - alpha;

			var img = src[z % _size.z];
			var skirt = src[(z - halfDepth) + _size.z];

			var buffer = new Uint8Array(img.GetWidth() * img.GetHeight() * 4);

			for(var i = 0; i < img.GetWidth() * img.GetHeight() * 4; i++) {
				var fg = skirt.GetBuf()[0][i];
				var bg = img.GetBuf()[0][i];

				buffer[i] = (a * fg + invA * bg) >> 8;
			}

			const tex = new CTexture();
			tex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle,CTexture.eFormat.RGBA8)]);
			tex.SetFilter(CTexture.eFilter.Neaest);
			tex.SetWrap(CTexture.eWrap.Repeat);
			tex.SetMipMap(CTexture.eMipmap.GL);
			tex.SetSize(_size.x, _size.y);
			tex.SetBuf(buffer);

			out[z % _size.z] = tex;
		}

		// 노멀라이징(0-1 범위로 바꿔줌), 몇몇 노이즈는 계산 특성상 중앙에 몰려서 노멀라이즈 안하면 범위가 좁을 수 있음
		var minValX : number = 10000;
		var maxValX : number = -10000;
		// var minValY : number = 10000;
		// var maxValY : number = -10000;
		// var minValZ : number = 10000;
		// var maxValZ : number = -10000;
		// var minValW : number = 10000;
		// var maxValW : number = -10000;
		for(var z = 0; z < _size.z; z++) {
			var idx : number = 0;
			for(var y = 0; y < _size.y; y++) {
				for(var x = 0; x < _size.x; x++) {
					if(minValX > out[z].GetBuf()[0][idx * 4 + 0]) minValX = out[z].GetBuf()[0][idx * 4 + 0];
					if(maxValX < out[z].GetBuf()[0][idx * 4 + 0]) maxValX = out[z].GetBuf()[0][idx * 4 + 0];
					// if(minValY > out[z].GetBuf()[0][idx * 4 + 1]) minValY = out[z].GetBuf()[0][idx * 4 + 1];
					// if(maxValY < out[z].GetBuf()[0][idx * 4 + 1]) maxValY = out[z].GetBuf()[0][idx * 4 + 1];
					// if(minValZ > out[z].GetBuf()[0][idx * 4 + 2]) minValZ = out[z].GetBuf()[0][idx * 4 + 2];
					// if(maxValZ < out[z].GetBuf()[0][idx * 4 + 2]) maxValZ = out[z].GetBuf()[0][idx * 4 + 2];
					// if(minValW > out[z].GetBuf()[0][idx * 4 + 3]) minValW = out[z].GetBuf()[0][idx * 4 + 3];
					// if(maxValW < out[z].GetBuf()[0][idx * 4 + 3]) maxValW = out[z].GetBuf()[0][idx * 4 + 3];
					idx++;
				}
			}
		}
		for(var z = 0; z < _size.z; z++) {
			var idx : number = 0;
			for(var y = 0; y < _size.y; y++) {
				for(var x = 0; x < _size.x; x++) {
					if(maxValX == minValX) out[z].GetBuf()[0][idx * 4 + 0] = 0;
					else out[z].GetBuf()[0][idx * 4 + 0] = CMath.Clamp((out[z].GetBuf()[0][idx * 4 + 0] - minValX) / (maxValX - minValX) * 255, 0, 255);
					// if(maxValY == minValY) out[z].GetBuf()[0][idx * 4 + 0] = 0;
					// else out[z].GetBuf()[0][idx * 4 + 1] = CMath.Clamp((out[z].GetBuf()[0][idx * 4 + 1] - minValY) / (maxValY - minValY) * 255, 0, 255);
					// if(maxValZ == minValZ) out[z].GetBuf()[0][idx * 4 + 0] = 0;
					// else out[z].GetBuf()[0][idx * 4 + 2] = CMath.Clamp((out[z].GetBuf()[0][idx * 4 + 2] - minValZ) / (maxValZ - minValZ) * 255, 0, 255);
					// if(maxValW == minValW) out[z].GetBuf()[0][idx * 4 + 0] = 0;
					// else out[z].GetBuf()[0][idx * 4 + 3] = CMath.Clamp((out[z].GetBuf()[0][idx * 4 + 3] - minValW) / (maxValW - minValW) * 255, 0, 255);
					idx++;
				}
			}
		}

		return out;
	}
}

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
		var buf = tex.GetBuf()[0];
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
	static CreateNoiseTexture(_type : number, _zVal : number = 0, _size : CVec2 = new CVec2(128, 128), _normalMap : boolean = false) {
		// seamless로 만들기 위해 자를 부분만큼 더 크게 만듬
		var blendInc : number = 0.2;	// 이 값을 더 높이면 seamless 오류가 줄어듬
		var skirtWidth : number = Math.max(1, Math.floor(_size.x * blendInc));
		var skirtHeight : number = Math.max(1, Math.floor(_size.y * blendInc));
		var srcWidth : number = _size.x + skirtWidth;
		var srcHeight : number = _size.y + skirtHeight;

		function Remap(_val : number, _min1 : number, _max1 : number, _min2 : number, _max2 : number) {
			return _min2 + (_val - _min1) / (_max1 - _min1) * (_max2 - _min2);
		}
		var NoiseFunc = null;
		switch(_type) {
			case SDF.eNoise.Perlin:
				NoiseFunc = CUtilRender.NoisePerlin.bind(CUtilRender);
				break;
			case SDF.eNoise.PerlinNormal:
				NoiseFunc = CUtilRender.NoiseCellular.bind(CUtilRender);
				break;
		}
		if(NoiseFunc == null) {
			return null;
		}
		
		// 노이즈 값을 [-1, 1] 범위로 나온다고 가정하고 [0, 1] 범위로 변경
		var prevBuffer = new Uint8Array(srcWidth * srcHeight * 4);
		var idx = 0;
		for(var y = 0; y < srcHeight; y++) {
			for(var x = 0; x < srcWidth; x++) {
				prevBuffer[idx * 4 + 0] = Math.round(Remap(NoiseFunc(x, y, _zVal), -1, 1, 0, 1) * 255.0);
				prevBuffer[idx * 4 + 3] = 255;
				idx++;
			}
		}

		if(_normalMap) {
			for(var ty = 0; ty < _size.y; ty++) {
				let py = ty + 1;
				if(py >= _size.y) {
					py -= _size.y;
				}

				for(let tx = 0; tx < _size.x; tx++) {
					let px = tx + 1;
					if(px >= _size.x) {
						px -= _size.x;
					}

					var here = buffer[(ty * _size.x + tx) * 4 + 0];
					var to_right = buffer[(ty * _size.x + px) * 4 + 0];
					var above = buffer[(py * _size.x + tx) * 4 + 0];
					var up = new CVec3(0, (here - above) * 8.0, 1);
					var across = new CVec3(1, (to_right - here) * 8.0, 0);

					var normal = CMath.V3Cross(across, up);
					CMath.V3Nor(normal, normal);

					buffer[(ty * _size.x + tx) * 4 + 0] = Math.round(127.5 + normal.x * 127.5);
					buffer[(ty * _size.x + tx) * 4 + 1] = Math.round(127.5 + normal.y * 127.5);
					buffer[(ty * _size.x + tx) * 4 + 2] = Math.round(127.5 + normal.z * 127.5);
					buffer[(ty * _size.x + tx) * 4 + 3] = 255;
				}
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
						x = ((_x + this.mOffsetX) % this.mAltWidth + this.mAltWidth) % this.mAltWidth;
						y = ((_y + this.mOffsetY) % this.mAltHeight + this.mAltHeight) % this.mAltHeight;
						break;
					case AltModulo.ALT_X:
						x = ((_x + this.mOffsetX) % this.mAltWidth + this.mAltWidth) % this.mAltWidth;
						y = ((_y + this.mOffsetY) % this.mHeight + this.mHeight) % this.mHeight;
						break;
					case AltModulo.ALT_Y:
						x = ((_x + this.mOffsetX) % this.mWidth + this.mWidth) % this.mWidth;
						y = ((_y + this.mOffsetY) % this.mAltHeight + this.mAltHeight) % this.mAltHeight;
						break;
					default:
						x = ((_x + this.mOffsetX) % this.mWidth + this.mWidth) % this.mWidth;
						y = ((_y + this.mOffsetY) % this.mHeight + this.mHeight) % this.mHeight;
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
			var alpha = _alpha;
			var invAlpha = 255 - _alpha;

			
			out.x = (alpha * _fg.x + invAlpha * _bg.x) / 255;
			out.y = (alpha * _fg.y + invAlpha * _bg.y) / 255;
			out.z = (alpha * _fg.z + invAlpha * _bg.z) / 255;
			out.w = (alpha * _fg.w + invAlpha * _bg.w) / 255;

			return out;
		}
		
		//ImgBuf(버퍼, 버퍼의 가로크기, 버퍼의 세로크기, 중점X, 중점Y, 옮길 버퍼의 가로크기, 옮길 버퍼의 세로크기)
		var rd_src = new ImgBuf(prevBuffer, srcWidth, srcHeight, halfWidth, halfHeight, _size.x, _size.y);
		var rd_dest = new ImgBuf(buffer, _size.x, _size.y, 0, 0, 0, 0);
		var v4d0=new CVec4();
		var v4d1=new CVec4();
		var v4d2=new CVec4();
		var v4d3=new CVec4();

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
				var botBlend : CVec4 = AlphaBlend(rd_src.Get(x, y, AltModulo.ALT_XY,v4d0), rd_src.Get(x, y, AltModulo.ALT_Y,v4d1), xpos,v4d3);
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
	static Create3DNoiseTexture(_type : number, _size : CVec3 = new CVec3(128, 128, 128), _normalMap : boolean = false) {
		var blendInc : number = 0.2;	// 이 값을 더 높이면 seamless 오류가 줄어듬
		var skirtDepth : number = Math.max(1, Math.floor(_size.z * blendInc));
		var srcDepth : number = _size.z + skirtDepth;

		const src : CTexture[] = [];
		for(let z = 0; z < srcDepth; z++) {
			const tex = this.CreateNoiseTexture(_type, z, new CVec2(_size.x, _size.y), _normalMap);
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
		for(var z = 0; z < _size.z; z++) {
			var idx : number = 0;
			for(var y = 0; y < _size.y; y++) {
				for(var x = 0; x < _size.x; x++) {
					if(minValX > out[z].GetBuf()[0][idx * 4 + 0]) minValX = out[z].GetBuf()[0][idx * 4 + 0];
					if(maxValX < out[z].GetBuf()[0][idx * 4 + 0]) maxValX = out[z].GetBuf()[0][idx * 4 + 0];
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
					idx++;
				}
			}
		}

		return out;
	}
	// /*
	// 	_targetTex : 색상이 그려질 텍스쳐
	// 	_boundary : _targetTex가 차지하는 전체 영역
	// 	_pos : 브러시가 찍힐 중심 좌표
	// 	_size : 브러시 크기
	// 	_channel : RGBA 중 어떤 채널에 값을 쓸지 결정하는 마스크
	// 	_addedVal : 텍스쳐에 이미 있는 값에 더해질 값(_newVal이 있다면 _newVal에 더해짐)
	// 	_newVal : 텍스쳐에 쓰여질 값(0 - 255), -1이면 적용되지 않음(그냥 이미 있는 값만 사용)
	// 	_brushTex : (선택) 특정 텍스쳐를 브러시 모양으로 사용할지 결정, 없으면 사각형 사용

	// 	xy / xz 중 어떤 것을 사용할지 어떻게 추가할까?
	// 	현재는 무조건 xy만 사용

	// 	ㅊ
	// */
	// static DrawBrush(_targetTex : CTexture, _boundary : CBound, _pos : CVec3, _size : CVec2,_channel : number,_value : number | CTexture,_type : number)
	// //static DrawBrush(_targetTex : CTexture, _boundary : CBound, _pos : CVec3, _size : CVec2, _channel : CVec4, _newVal : number, _brushTex : CTexture = null)
	// {
	// 	// 버퍼 있는지 검증
	// 	if(_targetTex.GetBuf().length == 0) {
	// 		_targetTex.CreateBuf();
	// 	}
	// 	const targetBuf = _targetTex.GetBuf()[0] as Uint8Array;
		
	// 	// 리맵 함수
	// 	function Remap(_val : number, _min1 : number, _max1 : number, _min2 : number, _max2 : number) {
	// 		return _min2 + (_val - _min1) / (_max1 - _min1) * (_max2 - _min2);
	// 	}

	// 	// 텍스쳐 정보
	// 	const texWidth = _targetTex.GetWidth();
	// 	const texHeight = _targetTex.GetHeight();
	// 	const boundSize = _boundary.GetSize();

	// 	// 월드 좌표 => UV 좌표
	// 	const centerUV = new CVec2(
	// 		Remap(_pos.x, _boundary.mMin.x, _boundary.mMax.x, 0, 1),
	// 		Remap(_pos.y, _boundary.mMin.y, _boundary.mMax.y, 0, 1)
	// 	);

	// 	// 월드 사이즈 => UV 사이즈
	// 	const sizeUV = new CVec2(
	// 		_size.x / boundSize.x,
	// 		_size.y / boundSize.y
	// 	);

	// 	// UV => 픽셀 좌표
	// 	const centerPixel = new CVec2(
	// 		Math.floor(centerUV.x * texWidth),
	// 		Math.floor(centerUV.y * texHeight)
	// 	);

	// 	// 브러시 픽셀 크기(최소 1)
	// 	const brushSizePixel = new CVec2(
	// 		Math.max(1, Math.floor(sizeUV.x * texWidth)),
	// 		Math.max(1, Math.floor(sizeUV.y * texHeight))
	// 	);

	// 	// 브러시 절반 크기
	// 	const halfBrushSize = new CVec2(
	// 		Math.floor(brushSizePixel.x / 2),
	// 		Math.floor(brushSizePixel.y / 2)
	// 	);

	// 	// 그려질 픽셀 범위
	// 	const xRangePixel = new CVec2(
	// 		Math.max(0, centerPixel.x - halfBrushSize.x),
	// 		Math.min(_targetTex.GetWidth() - 1, centerPixel.x + halfBrushSize.x)
	// 	);
	// 	const yRangePixel = new CVec2(
	// 		Math.max(0, centerPixel.y - halfBrushSize.y),
	// 		Math.min(_targetTex.GetHeight() - 1, centerPixel.y + halfBrushSize.y)
	// 	);

	// 	const activeChannels: number[] = [];
	// 	if (_channel.x !== 0) activeChannels.push(0);
	// 	if (_channel.y !== 0) activeChannels.push(1);
	// 	if (_channel.z !== 0) activeChannels.push(2);
	// 	if (_channel.w !== 0) activeChannels.push(3);

	// 	if (activeChannels.length === 0) return;

	// 	// 픽셀 영역 순회
	// 	for(let ty = yRangePixel.x; ty <= yRangePixel.y; ty++) {
	// 		for(let tx = xRangePixel.x; tx <= xRangePixel.y; tx++) {
	// 			// 이 샘플의 UV값
	// 			const uv = new CVec2(
	// 				(tx - (centerPixel.x - halfBrushSize.x)) / brushSizePixel.x,
	// 				(ty - (centerPixel.y - halfBrushSize.y)) / brushSizePixel.y
	// 			);

	// 			// 텍스쳐 바깥 영역인지 확인
	// 			if (uv.x < 0 || uv.x >= 1 || uv.y < 0 || uv.y >= 1) continue;

	// 			// 브러시 텍스쳐 있으면 적용
	// 			if(_brushTex) {
	// 				// targetTex의 UV => _brushTex의 UV
	// 				const brushUV = new CVec2(
	// 					Math.floor(uv.x * _brushTex.GetWidth()),
	// 					(_brushTex.GetHeight() - 1) - Math.floor(uv.y * _brushTex.GetHeight())
	// 				);
	// 				const brushIndex = (brushUV.y * _brushTex.GetWidth() + brushUV.x) * 4 + 3;
	// 				const brushAlpha = _brushTex.GetBuf()[0][brushIndex] / 0xFF;
	// 				if(brushAlpha <= 0) continue;
	// 			}

	// 			const targetIdx = (((texHeight - 1) - ty) * texWidth + tx) * 4;
	// 			for(const channelIdx of activeChannels) {
	// 				targetBuf[targetIdx + channelIdx] = CMath.Clamp(_newVal, 0, 255);
	// 			}
	// 		}
	// 	}


	/*
		_targetTex : 색상이 그려질 텍스쳐
		_boundary : _targetTex가 차지하는 전체 영역
		_pos : 브러시가 찍힐 중심 좌표
		_size : 브러시 크기
		_channel : 쓸 채널 (0=R, 1=G, 2=B, 3=A, 4=RGBA)
		_value : number(0-255) 또는 CTexture(스탬프 소스)
		         channel=4이고 number일 때 0xRRGGBBAA 형식으로 채널별 값 지정
		_type :
		        0 : 사각형, 값 고정
		        1 : 사각형, 값 더하기
		        2 : 원형, 중심 최대 → 가장자리 0 (Linear falloff)
	*/
	static DrawBrush(_targetTex : CTexture, _boundary : CBound, _pos : CVec3, _size : CVec2, _channel : number, _value : number, _type : number, _brush : CTexture)
	{
		// 버퍼 있는지 검증
		if(_targetTex.GetBuf().length == 0) {
			_targetTex.CreateBuf();
		}
		const targetBuf = _targetTex.GetBuf()[0] as Uint8Array;

		// 리맵 함수
		function Remap(_val : number, _min1 : number, _max1 : number, _min2 : number, _max2 : number) {
			return _min2 + (_val - _min1) / (_max1 - _min1) * (_max2 - _min2);
		}

		// 텍스쳐 정보
		const texWidth = _targetTex.GetWidth();
		const texHeight = _targetTex.GetHeight();
		const boundSize = _boundary.GetSize();

		// 월드 좌표 => UV 좌표
		const centerUV = new CVec2(
			Remap(_pos.x, _boundary.mMin.x, _boundary.mMax.x, 0, 1),
			Remap(_pos.y, _boundary.mMin.y, _boundary.mMax.y, 0, 1)
		);

		// 월드 사이즈 => UV 사이즈
		const sizeUV = new CVec2(
			_size.x / boundSize.x,
			_size.y / boundSize.y
		);

		// UV => 픽셀 좌표
		const centerPixel = new CVec2(
			Math.floor(centerUV.x * texWidth),
			Math.floor(centerUV.y * texHeight)
		);

		// 브러시 픽셀 크기(최소 1)
		const brushSizePixel = new CVec2(
			Math.max(1, Math.floor(sizeUV.x * texWidth)),
			Math.max(1, Math.floor(sizeUV.y * texHeight))
		);

		// 브러시 절반 크기
		const halfBrushSize = new CVec2(
			Math.floor(brushSizePixel.x / 2),
			Math.floor(brushSizePixel.y / 2)
		);

		// 그려질 픽셀 범위
		const xRangePixel = new CVec2(
			Math.max(0, centerPixel.x - halfBrushSize.x),
			Math.min(texWidth - 1, centerPixel.x + halfBrushSize.x)
		);
		const yRangePixel = new CVec2(
			Math.max(0, centerPixel.y - halfBrushSize.y),
			Math.min(texHeight - 1, centerPixel.y + halfBrushSize.y)
		);

		// 활성 채널 목록
		const activeChannels: number[] = _channel === 4 ? [0, 1, 2, 3] : [_channel];

		// channel=4, number값 → 채널별 분리 [R, G, B, A]
		const perChannelVals: number[] | null =
			(_channel === 4)
				? [(_value >>> 24) & 0xFF, (_value >>> 16) & 0xFF, (_value >>> 8) & 0xFF, _value & 0xFF]
				: null;

		// 채널 인덱스별 number값 반환
		function GetNumVal(ch : number) : number {
			return perChannelVals ? perChannelVals[ch] : (_value as number);
		}

		const stampTex : CTexture = _brush;
		const stampBuf : Uint8Array = stampTex.GetBuf()[0];

		// 픽셀 영역 순회
		for(let ty = yRangePixel.x; ty <= yRangePixel.y; ty++) {
			for(let tx = xRangePixel.x; tx <= xRangePixel.y; tx++) {
				// 브러시 내 UV (0~1)
				const uv = new CVec2(
					(tx - (centerPixel.x - halfBrushSize.x)) / brushSizePixel.x,
					(ty - (centerPixel.y - halfBrushSize.y)) / brushSizePixel.y
				);

				if (uv.x < 0 || uv.x >= 1 || uv.y < 0 || uv.y >= 1) continue;

				// Type 2: 타원 거리 → Linear falloff, 원 바깥 스킵
				let falloff = 1.0;
				if (_type === 2) {
					const dx = (uv.x - 0.5) * 2.0; // -1 ~ 1
					const dy = (uv.y - 0.5) * 2.0;
					const dist = Math.sqrt(dx * dx + dy * dy); // 0=중심, 1=가장자리
					if (dist >= 1.0) continue;
					falloff = 1.0 - dist;
				}

				const targetIdx = ((texHeight - 1 - ty) * texWidth + tx) * 4;

                // 텍스쳐 모드: stampTex를 마스크로 컬러값 쓰기
                const sx = Math.floor(uv.x * stampTex.GetWidth());
                const sy = Math.floor(uv.y * stampTex.GetHeight());
                const stampIdx = (sy * stampTex.GetWidth() + sx) * 4;

                for(const ch of activeChannels) {
                    const mask = stampBuf[stampIdx + 3] / 255;
                    const srcVal = Math.round(GetNumVal(ch) * falloff);
                    if (_type === 0 || _type === 2) { // type 0
                        if(mask > 0) targetBuf[targetIdx + ch] = CMath.FloatInterpolate(0, srcVal, mask);
                    } else { // type 1
                        targetBuf[targetIdx + ch] = CMath.FloatInterpolate(targetBuf[targetIdx + ch], CMath.Clamp(targetBuf[targetIdx + ch] + srcVal, 0, 255), mask);
                    }
                }
			}
		}
	}
}
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
    // mip 순서대로 넣어줌
    static SphericalGaussianBlur(_tex:CTexture,_infoIndex:number=0,_maxSamples:number=128):CTexture[]
    {
        // 0. temp
        const v3 = CPoolGeo.ProductV3();

        // 1. 상수 정의
        const LOD_MAX = Math.floor( Math.log2( _tex.GetWidth() ) );
        const LOD_MIN = 4;

        const PHI = ( 1 + Math.sqrt( 5 ) ) / 2;
        const INV_PHI = 1 / PHI;

        const AxisDirections = [
            new CVec3( - PHI, INV_PHI, 0 ),
            new CVec3( PHI, INV_PHI, 0 ),
            new CVec3( - INV_PHI, 0, PHI ),
            new CVec3( INV_PHI, 0, PHI ),
            new CVec3( 0, PHI, - INV_PHI ),
            new CVec3( 0, PHI, INV_PHI ),
            new CVec3( - 1, 1, - 1 ),
            new CVec3( 1, 1, - 1 ),
            new CVec3( - 1, 1, 1 ),
            new CVec3( 1, 1, 1 ) 
        ];
        
        const rawBuf = _tex.GetBuf() as (Uint8Array | Float32Array)[];
        for(let i = 0; i < rawBuf.length; i++) {
            if(rawBuf[i].length != _tex.GetWidth()*_tex.GetHeight()*4) {
                const rawBufSize = Math.round(Math.sqrt(rawBuf[i].length / 4));
                const newTex = CImgPro.SqurEnlargedReduced(rawBufSize, rawBufSize, rawBuf[i], _tex.GetWidth() / rawBufSize, _tex.GetHeight() / rawBufSize, 4);
                rawBuf[i] = newTex.GetBuf()[0];
            }

            // sRGB => Linear
            for(let idx = 0; idx < rawBuf[i].length; idx += 4)
            {
                if(rawBuf[i] instanceof Uint8Array) {
                    rawBuf[i][idx + 0] = Math.pow(rawBuf[i][idx + 0] / 255, 2.2) * 255;
                    rawBuf[i][idx + 1] = Math.pow(rawBuf[i][idx + 1] / 255, 2.2) * 255;
                    rawBuf[i][idx + 2] = Math.pow(rawBuf[i][idx + 2] / 255, 2.2) * 255;
                }
                else {
                    rawBuf[i][idx + 0] = Math.pow(rawBuf[i][idx + 0], 2.2);
                    rawBuf[i][idx + 1] = Math.pow(rawBuf[i][idx + 1], 2.2);
                    rawBuf[i][idx + 2] = Math.pow(rawBuf[i][idx + 2], 2.2);
                }
            }
        }

        

        const buf = [];
        let bufIndex = 0;
        let bufInfo : CTextureInfo;
        for(let i = 0; i < _tex.GetInfo().length; i++) {
            let info = _tex.GetInfo()[i];
            let count = info.mTarget === CTexture.eTarget.Cube ? 6 : (info.mTarget === CTexture.eTarget.Array ? info.mCount : 1);
            for(let j = 0; j < count; j++, bufIndex++) {
                if (bufIndex >= _tex.GetBuf().length) {
                    continue;
                }
                if(i != _infoIndex) {
                    continue;
                }
                bufInfo = info;
                buf.push(rawBuf[bufIndex]);
            }
        }
        const isBufferFloat = buf[0] instanceof Float32Array;
        const isFloatType = bufInfo.mFormat == CTexture.eFormat.RGBA32F;
        const ArrayBufferType = isFloatType ? Float32Array : Uint8Array;

        // 2. sigmas, sizeLODs 자동 연산
        const sigmas:number[] = [];
        const sizeLods:number[] = [];

        let currentLod = LOD_MAX;
        const totalLods = LOD_MAX - LOD_MIN + 1;

        for(let i = 0; i < totalLods; i++) {
            const sizeLod = Math.pow(2, currentLod);
            sizeLods.push(sizeLod);

            const t = i / (totalLods - 1);
            const sigmaExt = i == 0 ? 0 : 1 / sizeLod;
            const roughness = t * 0.582;
            const sigma = CMath.FloatInterpolate(sigmaExt, roughness, t);
            sigmas.push(sigma);

            if(currentLod > LOD_MIN) {
                currentLod--;
            }
        }

        // 3. 메모리 버퍼 생성 및 초기화
        const cubeUVOutputs:(Uint8Array|Float32Array)[] = [];
        const pingpongBuffer:(Uint8Array|Float32Array)[] = [];

        for(let mip = 0; mip < totalLods; mip++) {
            const size = sizeLods[mip];
            for(let face = 0; face < 6; face++) {
                const bufferK = isBufferFloat ? 1 : 255;
                const typeK = isFloatType ? 1 : 255;
                const floatK = typeK / bufferK;
                const outData = new ArrayBufferType(size * size * 4);
                if(mip == 0) {
                    if(_tex.GetYFlip()) {
                        for(let y = 0; y < size; y++)
                        for(let x = 0; x < size; x++)
                        {
                            const flippexIdx = 4 * ((size - 1 - y) * size + x);
                            const idx = 4 * (y * size + x);
                            outData[idx + 0] = buf[face][flippexIdx + 0] / floatK;
                            outData[idx + 1] = buf[face][flippexIdx + 1] / floatK;
                            outData[idx + 2] = buf[face][flippexIdx + 2] / floatK;
                            outData[idx + 3] = buf[face][flippexIdx + 3] / floatK;
                        }
                    }
                    else
                        outData.set(buf[face]);
                }
                cubeUVOutputs.push(outData);
                pingpongBuffer.push(new ArrayBufferType(size * size * 4));
            }
        }

        // 4. 블러
        for(let i = 1; i < totalLods; i++) {
            const lodIn = i - 1;
            const lodOut = i;

            const sigma = Math.sqrt(sigmas[i] * sigmas[i] - sigmas[i - 1] * sigmas[i - 1]);
            const axisDir = AxisDirections[(totalLods - i - 1) % AxisDirections.length];

            HalfBlur(cubeUVOutputs, pingpongBuffer, lodIn, lodOut, sigma, true, axisDir);
            HalfBlur(pingpongBuffer, cubeUVOutputs, lodOut, lodOut, sigma, false, axisDir);
        }

        // 5. 텍스쳐 오브젝트화
        const mipmaps : CTexture[] = [];
        for(let mip = 0; mip < totalLods; mip++) {
            const tex = new CTexture();
            mipmaps.push(tex);

            tex.PushInfo([new CTextureInfo(CTexture.eTarget.Sigle, isFloatType ? CTexture.eFormat.RGBA32F : CTexture.eFormat.RGBA8, 1)]);
            tex.SetSize(sizeLods[mip], sizeLods[mip]);
            tex.GetBuf().push(cubeUVOutputs[mip * 6 + 0], cubeUVOutputs[mip * 6 + 1], cubeUVOutputs[mip * 6 + 2], cubeUVOutputs[mip * 6 + 3], cubeUVOutputs[mip * 6 + 4], cubeUVOutputs[mip * 6 + 5]);
        }

        // 6. temp recycle
        CPoolGeo.RecycleV3(v3);

        return mipmaps;

        // 인라인 함수
        function HalfBlur(_bufIn:(Uint8Array|Float32Array)[],_bufOut:(Uint8Array|Float32Array)[],_lodIn:number,_lodOut:number,_sigmaRadians:number,_isLatitudinal:boolean,_poleAxis:CVec3) {
            const STANDARD_DEVIATIONS = 3;
            
            const sizeIn = sizeLods[_lodIn];
            const sizeOut = sizeLods[_lodOut];
            const invSizeOut = 1 / sizeOut;

            const pixels = sizeIn - 1;
            const isSigmaFinite = isFinite(_sigmaRadians);
            const radiansPerPixel = isSigmaFinite ? Math.PI / (2*pixels) : (2*Math.PI) / (2*_maxSamples-1);
            const sigmaPixels = _sigmaRadians / radiansPerPixel;
            const samples = isSigmaFinite ? 1 + Math.floor(STANDARD_DEVIATIONS * sigmaPixels) : _maxSamples;
            const sampleCount = Math.min(samples, _maxSamples);

            // cos/sin 테이블 캐싱
            const weights = new Float32Array(_maxSamples);
            const cosTable = new Float32Array(_maxSamples);
            const sinTable = new Float32Array(_maxSamples);

            let sum = 0;
            for (let s = 0; s < _maxSamples; ++s) {
                const x = s / sigmaPixels;
                const w = Math.exp(-x * x / 2);
                weights[s] = w;

                const theta = radiansPerPixel * s;
                cosTable[s] = Math.cos(theta);
                sinTable[s] = Math.sin(theta);

                if (s === 0) sum += w;
                else if (s < sampleCount) sum += 2 * w;
            }
            for (let s = 0; s < weights.length; s++) {
                weights[s] /= sum;
            }

            // 6개 면 연산
            for (let face = 0; face < 6; face++) {
                const outFaceIndex = _lodOut * 6 + face;
                const outBuf = _bufOut[outFaceIndex];
                let outIdx = 0;

                for (let y = 0; y < sizeOut; y++) {
                    const v = 1.0 - (y + 0.5) * invSizeOut * 2.0;

                    for (let x = 0; x < sizeOut; x++) {
                        const u = (x + 0.5) * invSizeOut * 2.0 - 1.0;

                        // 픽셀의 3D 방향 벡터(vOutputDirection) 구하기
                        let dvX = 0, dvY = 0, dvZ = 0;
                        switch (face) {
                            case 0: dvX =  1.0; dvY =    v; dvZ =   -u; break;
                            case 1: dvX = -1.0; dvY =    v; dvZ =    u; break;
                            case 2: dvX =    u; dvY =  1.0; dvZ =   -v; break;
                            case 3: dvX =    u; dvY = -1.0; dvZ =    v; break;
                            case 4: dvX =    u; dvY =    v; dvZ =  1.0; break;
                            case 5: dvX =   -u; dvY =    v; dvZ = -1.0; break;
                        }
                        const dvLen = Math.sqrt(dvX * dvX + dvY * dvY + dvZ * dvZ);
                        const outDirX = dvX / dvLen;
                        const outDirY = dvY / dvLen;
                        const outDirZ = dvZ / dvLen;

                        // 블러 회전 축 계산
                        let axX = 0, axY = 0, axZ = 0;
                        if (_isLatitudinal) {
                            axX = _poleAxis.x; axY = _poleAxis.y; axZ = _poleAxis.z;
                        } else {
                            axX = _poleAxis.y * outDirZ - _poleAxis.z * outDirY;
                            axY = _poleAxis.z * outDirX - _poleAxis.x * outDirZ;
                            axZ = _poleAxis.x * outDirY - _poleAxis.y * outDirX;
                        }

                        const axLenSq = axX * axX + axY * axY + axZ * axZ;
                        let axisX = axX, axisY = axY, axisZ = axZ;
                        if (axLenSq < 0.000001) {
                            axisX = outDirZ; axisY = 0.0; axisZ = -outDirX;
                        }
                        const axLen = Math.sqrt(axisX * axisX + axisY * axisY + axisZ * axisZ);
                        axisX /= axLen; axisY /= axLen; axisZ /= axLen;

                        const dotProd = axisX * outDirX + axisY * outDirY + axisZ * outDirZ;
                        const cxX = axisY * outDirZ - axisZ * outDirY;
                        const cxY = axisZ * outDirX - axisX * outDirZ;
                        const cxZ = axisX * outDirY - axisY * outDirX;

                        let totalR = 0, totalG = 0, totalB = 0;

                        // 가우시안 샘플링 루프 연산
                        for (let s = 0; s < sampleCount; s++) {
                            const w = weights[s];
                            const cosTheta = cosTable[s]; // 최적화: 캐싱된 배열에서 직접 획득
                            const sinTheta = sinTable[s]; // 최적화: 캐싱된 배열에서 직접 획득

                            const oneMinusCos = 1.0 - cosTheta;
                            const odCos_X = outDirX * cosTheta;
                            const odCos_Y = outDirY * cosTheta;
                            const odCos_Z = outDirZ * cosTheta;
                            const axDot = axisX * dotProd * oneMinusCos;
                            const ayDot = axisX * dotProd * oneMinusCos;
                            const azDot = axisX * dotProd * oneMinusCos;

                            if (s === 0) {
                                const sDirX = odCos_X + cxX * sinTheta + axDot;
                                const sDirY = odCos_Y + cxY * sinTheta + ayDot;
                                const sDirZ = odCos_Z + cxZ * sinTheta + azDot;

                                const rgb = SampleCubeMip(_bufIn, _lodIn, sDirX, sDirY, sDirZ);
                                totalR += w * rgb.x; totalG += w * rgb.y; totalB += w * rgb.z;
                            } else {
                                // Positive Theta 방향
                                const sDirX_p = odCos_X + cxX * sinTheta + axDot;
                                const sDirY_p = odCos_Y + cxY * sinTheta + ayDot;
                                const sDirZ_p = odCos_Z + cxZ * sinTheta + azDot;
                                
                                let rgb = SampleCubeMip(_bufIn, _lodIn, sDirX_p, sDirY_p, sDirZ_p);
                                totalR += w * rgb.x; totalG += w * rgb.y; totalB += w * rgb.z;

                                // Negative Theta 방향 (-sinTheta)
                                const sDirX_n = odCos_X - cxX * sinTheta + axDot;
                                const sDirY_n = odCos_Y - cxY * sinTheta + ayDot;
                                const sDirZ_n = odCos_Z - cxZ * sinTheta + azDot;

                                rgb = SampleCubeMip(_bufIn, _lodIn, sDirX_n, sDirY_n, sDirZ_n);
                                totalR += w * rgb.x; totalG += w * rgb.y; totalB += w * rgb.z;
                            }
                        }

                        outBuf[outIdx++] = totalR;
                        outBuf[outIdx++] = totalG;
                        outBuf[outIdx++] = totalB;
                        outBuf[outIdx++] = isFloatType ? 1 : 255;
                    }
                }
            }
        }

        function SampleCubeMip(_buf:(Uint8Array|Float32Array)[],_lod:number,_rx:number,_ry:number,_rz:number) {
            const absX = Math.abs(_rx);
            const absY = Math.abs(_ry);
            const absZ = Math.abs(_rz);

            let face = 0;
            let uc = 0, vc = 0, ma = 0;

            if (absX >= absY && absX >= absZ) {
                if (_rx > 0) { face = 0; uc = -_rz; vc =  _ry; ma =  _rx; }
                else        { face = 1; uc =  _rz; vc =  _ry; ma = absX; }
            } else if (absY >= absX && absY >= absZ) {
                if (_ry > 0) { face = 2; uc =  _rx; vc = -_rz; ma =  _ry; }
                else        { face = 3; uc =  _rx; vc =  _rz; ma = absY; }
            } else {
                if (_rz > 0) { face = 4; uc =  _rx; vc =  _ry; ma =  _rz; }
                else        { face = 5; uc = -_rx; vc =  _ry; ma = absZ; }
            }

            const u = 0.5 * (uc / ma + 1.0);
            const v = 0.5 * (1.0 - vc / ma);

            const src = _buf[_lod * 6 + face];
            const w = sizeLods[_lod];
            const h = sizeLods[_lod];

            const texX = u * w - 0.5;
            const texY = v * h - 0.5;

            const x0 = Math.max(0, Math.min(w - 1, Math.floor(texX)));
            const y0 = Math.max(0, Math.min(h - 1, Math.floor(texY)));
            const x1 = Math.max(0, Math.min(w - 1, x0 + 1));
            const y1 = Math.max(0, Math.min(h - 1, y0 + 1));

            const fX = texX - Math.floor(texX);
            const fY = texY - Math.floor(texY);

            const idx00 = (y0 * w + x0) * 4;
            const idx10 = (y0 * w + x1) * 4;
            const idx01 = (y1 * w + x0) * 4;
            const idx11 = (y1 * w + x1) * 4;

            const w00 = (1.0 - fX) * (1.0 - fY);
            const w10 = fX * (1.0 - fY);
            const w01 = (1.0 - fX) * fY;
            const w11 = fX * fY;

            v3.x = (src[idx00 + 0] * w00 + src[idx10 + 0] * w10 + src[idx01 + 0] * w01 + src[idx11 + 0] * w11);
            v3.y = (src[idx00 + 1] * w00 + src[idx10 + 1] * w10 + src[idx01 + 1] * w01 + src[idx11 + 1] * w11);
            v3.z = (src[idx00 + 2] * w00 + src[idx10 + 2] * w10 + src[idx01 + 2] * w01 + src[idx11 + 2] * w11);

            return v3;
        }
    }

    static ScaleMipMapAlpha(w: number, h: number, buf: any, filtering: 'box' | 'kaiser' = 'kaiser', coverageThreshold: number = 0.4): CTexture
    {
        const kWidth   = 3.0;
        const kAlpha   = 4.0;
        const kStretch = 1.0;
        const besselI0_kAlpha = 11.30192195213633;

        const besselI0 = (x: number): number => {
            const ax = Math.abs(x);
            if (ax < 3.75) {
                const y = (x / 3.75) ** 2;
                return 1.0 + y * (3.5156229 + y * (3.0899424 + y * (1.2067492
                    + y * (0.2659732 + y * (0.0360768 + y * 0.0045813)))));
            } else {
                const y = 3.75 / ax;
                return (Math.exp(ax) / Math.sqrt(ax)) *
                    (0.39894228 + y * (0.01328592 + y * (0.00225319
                    + y * (-0.00157565 + y * (0.00916281 + y * (-0.02057706
                    + y * (0.02635537 + y * (-0.01647633 + y * 0.00392377))))))));
            }
        };

        const sinc = (x: number): number => {
            if (Math.abs(x) < 1e-10) return 1.0;
            const px = Math.PI * x;
            return Math.sin(px) / px;
        };

        const kaiserValue = (x: number): number => {
            const t = x / kWidth;
            if (Math.abs(t) >= 1.0) return 0.0;
            const window = besselI0(kAlpha * Math.sqrt(1.0 - t * t)) / besselI0_kAlpha;
            return window * sinc(x);
        };

        const buildKaiserKernel = (dstPos: number, scale: number, srcSize: number): { indices: Int32Array; weights: Float64Array } => {
            const center    = (dstPos + 0.5) * scale - 0.5;
            const halfWidth = kWidth * scale * kStretch;
            const lo        = Math.max(0, Math.ceil(center - halfWidth));
            const hi        = Math.min(srcSize - 1, Math.floor(center + halfWidth));
            const count     = hi - lo + 1;
            const indices   = new Int32Array(count);
            const weights   = new Float64Array(count);
            let wSum = 0.0;
            const invScale = 1.0 / scale;
            for (let i = 0; i < count; i++) {
                const sx  = lo + i;
                indices[i] = sx;
                const wv  = kaiserValue((sx - center) * invScale);
                weights[i] = wv;
                wSum += wv;
            }
            if (wSum !== 0) {
                const invWSum = 1.0 / wSum;
                for (let i = 0; i < count; i++) weights[i] *= invWSum;
            }
            return { indices, weights };
        };

        const downsampleBoxPremultiplied = (src: Uint8Array, sw: number, sh: number, dw: number, dh: number): Uint8Array => {
            const dst    = new Uint8Array(dw * dh * 4);
            const scaleX = sw / dw;
            const scaleY = sh / dh;
            const inv255 = 1.0 / 255.0;

            for (let dy = 0; dy < dh; dy++) {
                const sy0 = dy * scaleY;
                const sy1 = sy0 + scaleY;
                const iy0 = sy0 | 0;
                const iy1 = Math.min(sh - 1, (sy1 - 1e-6) | 0);
                const rowOffset = dy * dw;

                for (let dx = 0; dx < dw; dx++) {
                    const sx0 = dx * scaleX;
                    const sx1 = sx0 + scaleX;
                    const ix0 = sx0 | 0;
                    const ix1 = Math.min(sw - 1, (sx1 - 1e-6) | 0);
                    let rP = 0, gP = 0, bP = 0, a = 0, wSum = 0;
                    for (let iy = iy0; iy <= iy1; iy++) {
                        const wy = Math.min(iy + 1, sy1) - Math.max(iy, sy0);
                        const syOffset = iy * sw;
                        for (let ix = ix0; ix <= ix1; ix++) {
                            const wx = Math.min(ix + 1, sx1) - Math.max(ix, sx0);
                            const wv = wx * wy;
                            const si = (syOffset + ix) << 2;
                            const srcA = src[si + 3];
                            const wvANorm = wv * srcA * inv255;
                            rP   += src[si    ] * wvANorm;
                            gP   += src[si + 1] * wvANorm;
                            bP   += src[si + 2] * wvANorm;
                            a    += srcA * wv;
                            wSum += wv;
                        }
                    }
                    const di     = (rowOffset + dx) << 2;
                    const invW = wSum > 0 ? 1.0 / wSum : 0;
                    const avgA   = a * invW;
                    dst[di + 3]  = (avgA + 0.5) | 0;
                    const avgANorm = avgA * inv255;
                    if (avgANorm > 1e-6) {
                        const factor = invW / avgANorm;
                        dst[di    ] = (rP * factor + 0.5) | 0;
                        dst[di + 1] = (gP * factor + 0.5) | 0;
                        dst[di + 2] = (bP * factor + 0.5) | 0;
                    }
                }
            }
            return dst;
        };

        const downsampleKaiserPremultiplied = (src: Uint8Array, sw: number, sh: number, dw: number, dh: number): Uint8Array => {
            const scaleX = sw / dw;
            const scaleY = sh / dh;
            const STRIDE = 5; // rP, gP, bP, a, wSum
            const inv255 = 1.0 / 255.0;

            const xKernels = new Array(dw);
            for (let dx = 0; dx < dw; dx++) xKernels[dx] = buildKaiserKernel(dx, scaleX, sw);
            const yKernels = new Array(dh);
            for (let dy = 0; dy < dh; dy++) yKernels[dy] = buildKaiserKernel(dy, scaleY, sh);

            const tmp = new Float64Array(dw * sh * STRIDE);
            for (let sy = 0; sy < sh; sy++) {
                const syOffset = sy * sw;
                const tyOffset = sy * dw;
                for (let dx = 0; dx < dw; dx++) {
                    const kernel = xKernels[dx];
                    const indices = kernel.indices;
                    const weights = kernel.weights;
                    let rP = 0, gP = 0, bP = 0, a = 0, wSum = 0;
                    for (let i = 0; i < indices.length; i++) {
                        const si = (syOffset + indices[i]) << 2;
                        const wv = weights[i];
                        const srcA = src[si + 3];
                        const wvANorm = wv * (srcA * inv255);
                        rP   += src[si    ] * wvANorm;
                        gP   += src[si + 1] * wvANorm;
                        bP   += src[si + 2] * wvANorm;
                        a    += srcA * wv;
                        wSum += wv;
                    }
                    const ti = (tyOffset + dx) * STRIDE;
                    tmp[ti] = rP; tmp[ti+1] = gP; tmp[ti+2] = bP; tmp[ti+3] = a; tmp[ti+4] = wSum;
                }
            }

            const dst = new Uint8Array(dw * dh * 4);
            for (let dy = 0; dy < dh; dy++) {
                const kernel = yKernels[dy];
                const indices = kernel.indices;
                const weights = kernel.weights;
                const dyOffset = dy * dw;
                for (let dx = 0; dx < dw; dx++) {
                    let rP = 0, gP = 0, bP = 0, a = 0, wSum = 0;
                    for (let i = 0; i < indices.length; i++) {
                        const ti = (indices[i] * dw + dx) * STRIDE;
                        const wv = weights[i];
                        rP   += tmp[ti]   * wv;
                        gP   += tmp[ti+1] * wv;
                        bP   += tmp[ti+2] * wv;
                        a    += tmp[ti+3] * wv;
                        wSum += tmp[ti+4] * wv;
                    }
                    const di   = (dyOffset + dx) << 2;
                    const invW = wSum > 0 ? 1.0 / wSum : 0;
                    const avgA = a * invW;
                    dst[di+3]  = (avgA + 0.5) | 0;
                    const avgANorm = avgA * inv255;
                    if (avgANorm > 1e-6) {
                        const factor = 1.0 / avgANorm;
                        dst[di]   = (rP * invW * factor + 0.5) | 0;
                        dst[di+1] = (gP * invW * factor + 0.5) | 0;
                        dst[di+2] = (bP * invW * factor + 0.5) | 0;
                    }
                }
            }
            return dst;
        };

        const INF = 1e20;

        const dt1D = (f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void => {
            let k = 0;
            v[0] = 0;
            z[0] = -INF;
            z[1] = INF;
            for (let q = 1; q < n; q++) {
                let s = 0;
                const fq_q2 = f[q] + q * q;
                for (;;) {
                    const vk = v[k];
                    s = (fq_q2 - (f[vk] + vk * vk)) / (2 * (q - vk));
                    if (s <= z[k]) { k--; } else { break; }
                }
                k++;
                v[k] = q;
                z[k] = s;
                z[k + 1] = INF;
            }
            k = 0;
            for (let q = 0; q < n; q++) {
                while (z[k + 1] < q) k++;
                const vk = v[k];
                const dx = q - vk;
                d[q] = dx * dx + f[vk];
            }
        };

        const squaredDistanceTransform = (mask: Uint8Array, w: number, h: number, insideToOutside: boolean): Float64Array => {
            const size = w * h;
            const f = new Float64Array(size);
            for (let i = 0; i < size; i++) {
                const isInside = mask[i] !== 0;
                f[i] = (insideToOutside ? !isInside : isInside) ? 0 : INF;
            }
            const g = new Float64Array(size);
            const rowBuf = new Float64Array(w);
            const rowD = new Float64Array(w);
            const rowV = new Int32Array(w);
            const rowZ = new Float64Array(w + 1);

            for (let y = 0; y < h; y++) {
                const offset = y * w;
                for (let x = 0; x < w; x++) rowBuf[x] = f[offset + x];
                dt1D(rowBuf, w, rowD, rowV, rowZ);
                for (let x = 0; x < w; x++) g[offset + x] = rowD[x];
            }
            const out = new Float64Array(size);
            const colBuf = new Float64Array(h);
            const colD = new Float64Array(h);
            const colV = new Int32Array(h);
            const colZ = new Float64Array(h + 1);
            for (let x = 0; x < w; x++) {
                for (let y = 0; y < h; y++) colBuf[y] = g[y * w + x];
                dt1D(colBuf, h, colD, colV, colZ);
                for (let y = 0; y < h; y++) out[y * w + x] = colD[y];
            }
            return out;
        };

        const computeSDF = (alphaData: Uint8Array, w: number, h: number, cutoff255: number): Float64Array => {
            const size = w * h;
            const mask = new Uint8Array(size);
            for (let i = 0; i < size; i++) mask[i] = alphaData[(i << 2) + 3] >= cutoff255 ? 1 : 0;

            const distToOutsideSq = squaredDistanceTransform(mask, w, h, true);
            const distToInsideSq  = squaredDistanceTransform(mask, w, h, false);

            const sdf = new Float64Array(size);
            for (let i = 0; i < size; i++) {
                sdf[i] = mask[i] !== 0 ? Math.sqrt(distToOutsideSq[i]) : -Math.sqrt(distToInsideSq[i]);
            }
            return sdf;
        };

        const boxDownsampleSDF = (sdf: Float64Array, sw: number, sh: number, dw: number, dh: number): Float64Array => {
            const out = new Float64Array(dw * dh);
            const scaleX = sw / dw;
            const scaleY = sh / dh;
            for (let dy = 0; dy < dh; dy++) {
                const sy0 = (dy * scaleY) | 0;
                const sy1 = Math.min(sh, ((dy + 1) * scaleY + 0.999) | 0);
                const dyOffset = dy * dw;
                for (let dx = 0; dx < dw; dx++) {
                    const sx0 = (dx * scaleX) | 0;
                    const sx1 = Math.min(sw, ((dx + 1) * scaleX + 0.999) | 0);
                    let sum = 0, count = 0;
                    for (let sy = sy0; sy < sy1; sy++) {
                        const syOffset = sy * sw;
                        for (let sx = sx0; sx < sx1; sx++) {
                            sum += sdf[syOffset + sx];
                            count++;
                        }
                    }
                    out[dyOffset + dx] = count > 0 ? sum / count : 0;
                }
            }
            return out;
        };

        const computeCoverage = (alphaData: Uint8Array, w: number, h: number, cutoff255: number): number => {
            const size = w * h;
            let count = 0;
            for (let i = 0; i < size; i++) {
                if (alphaData[(i << 2) + 3] >= cutoff255) count++;
            }
            return count / size;
        };

        const findCoveragePreservingCutoff = (
            sdf: Float64Array, n: number, targetCoverage: number,
            alphaTestCutoff255: number, half_cutoff: number
        ): number => {
            let lo = 0, hi = 255;
            for (let iter = 0; iter < 16; iter++) {
                const mid = (lo + hi) * 0.5;
                const sdfThreshold = half_cutoff > 0 ? (mid - alphaTestCutoff255) / half_cutoff : 0;
                let count = 0;
                for (let i = 0; i < n; i++) if (sdf[i] >= sdfThreshold) count++;
                const coverage = count / n;
                if (coverage > targetCoverage) lo = mid; else hi = mid;
            }
            return (lo + hi) * 0.5;
        };

        const mip0Data   = new Uint8Array(buf);

        const ALPHA_TEST_CUTOFF_255 = 127.5;
        // SDF 기준 컷오프를 알파테스트 컷오프(128)로 통일한다.
        // 과거에는 coverageThreshold(0.4)에서 파생된 102를 사용했으나,
        // 이는 실제 알파테스트 경계(128)와 불일치하여 경계가 불안정했다.
        const cutoff255  = 128;

        const dstW = Math.max(1, w >> 1);
        const dstH = Math.max(1, h >> 1);

        let dstData = filtering === 'box'
            ? downsampleBoxPremultiplied   (mip0Data, w, h, dstW, dstH)
            : downsampleKaiserPremultiplied(mip0Data, w, h, dstW, dstH);

        const sdf0 = computeSDF(mip0Data, w, h, cutoff255);
        const sdf1 = boxDownsampleSDF(sdf0, w, h, dstW, dstH);

        const half_cutoff = Math.min(cutoff255, 255 - cutoff255);

        const targetCoverage = computeCoverage(mip0Data, w, h, ALPHA_TEST_CUTOFF_255);
        const correctedCutoff255 = findCoveragePreservingCutoff(
            sdf1, dstW * dstH, targetCoverage, cutoff255, half_cutoff
        );

        const bias = correctedCutoff255 - ALPHA_TEST_CUTOFF_255;

        // ---------------------------------------------------------------
        // SDF 팽창(Dilate): 얇은 형태(풀잎 등)가 밉맵 축소 시 사라지는
        // 것을 방지한다. SDF에 양수 오프셋을 더하면 불투명 영역이
        // 넓어진다. 바이어스(커버리지 보존) 계산 이후에 적용하여,
        // 기본 커버리지는 유지하면서 추가로 얇은 부분을 두껍게 만든다.
        //
        // 이 팽창은 밉맵 체인을 통해 누적된다: 각 ScaleMipMapAlpha 호출
        // 시 입력의 알파가 이미 팽창되어 있으므로, 깊은 밉맵일수록
        // 형태가 점진적으로 더 두꺼워진다. 이것이 "밉맵이 작아질수록
        // 깜빡거림이 적어지도록" 하는 핵심 메커니즘이다.
        // ---------------------------------------------------------------
        const DILATE_OFFSET = 0.75;

        for (let i = 0; i < dstW * dstH; i++) {
            const a = ALPHA_TEST_CUTOFF_255 + ((sdf1[i] + DILATE_OFFSET) * half_cutoff - bias);
            dstData[(i << 2) + 3] = a > 255 ? 255 : a < 0 ? 0 : (a + 0.5) | 0;
        }

        var L_tex = new CTexture();
        L_tex.SetSize(dstW, dstH);
        L_tex.SetBuf(dstData);
        return L_tex;
    }   

    static BleedTexture(src: Uint8Array, w: number, h: number)
    {
        const MIN_SIZE_FOR_BLEED = 4;
        if (w < MIN_SIZE_FOR_BLEED || h < MIN_SIZE_FOR_BLEED) {
            return src;
        }

        const dilateIterations = (w >= 8) ? 0 : 1;   // 현재 밉맵 레벨을 못 받아와서 임시로 넣음

        const dst = new Uint8Array(src.length);
        dst.set(src); // Copy original data

        const getPixelIdx = (x: number, y: number) => (y * w + x) * 4;
        const clearPixel = (idx: number) => {
            dst[idx] = 0;
            dst[idx + 1] = 0;
            dst[idx + 2] = 0;
            dst[idx + 3] = 0;
        };

        const isBorder = (x: number, y: number) => x === 0 || x === w - 1 || y === 0 || y === h - 1;

        const clearBorderRing = () => {
            for (let x = 0; x < w; x++) {
                clearPixel(getPixelIdx(x, 0));
                clearPixel(getPixelIdx(x, h - 1));
            }
            for (let y = 0; y < h; y++) {
                clearPixel(getPixelIdx(0, y));
                clearPixel(getPixelIdx(w - 1, y));
            }
        };

        // ---------------------------------------------------------------
        // 가장 외곽 1픽셀 테두리는 항상 비워둔다 (원본 값과 무관하게 강제 클리어)
        // ---------------------------------------------------------------
        clearBorderRing();

        // ---------------------------------------------------------------
        // 알파 이진화(Binarize) 단계: 알파테스트 경계를 명확히 한다.
        //
        // 알파테스트 컷오프(128) 기준으로 알파를 0 또는 255로 이진화한다.
        //   alpha >= 128 → 255 (불투명, RGB 유지)
        //   alpha <  128 →   0 (투명, RGB 도 클리어 → 블리딩 단계에서 보간)
        //
        // 반투명 AA 그라디언트(알파 1~254)가 남아 있으면 밉맵 다운샘플링 시
        // 평균되어 알파테스트 통과 여부가 프레임마다 들쭉날쭉 바뀌 → 깜빡임.
        // 이진화하면 베이스 밉의 실루엣은 동일(같은 픽셀이 같은 결과로 판정)하면서
        // 밉맵이 작아져도 경계가 일관되어 깜빡임이 크게 줄어든다.
        // 또한 0/255의 깨끗한 입력을 받아 이후 팽창(Dilate) 단계의 효과도 좋아진다.
        // ---------------------------------------------------------------
        const ALPHA_BINARIZE_CUTOFF = 128;
        for (let i = 0, n = w * h; i < n; i++) {
            const idx = i * 4;
            if (dst[idx + 3] >= ALPHA_BINARIZE_CUTOFF) {
                dst[idx + 3] = 255;
            } else {
                dst[idx] = 0;
                dst[idx + 1] = 0;
                dst[idx + 2] = 0;
                dst[idx + 3] = 0;
            }
        }

        const wrap = (v: number, n: number) => ((v % n) + n) % n;

        const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
        const dy = [-1, -1, -1, 0, 0, 1, 1, 1];

        // ---------------------------------------------------------------
        // 알파 팽창(Dilate) 단계: 얇은 형태(나뭇잎 등)를 두껍게 만들어
        // 먼 거리 밉맵에서 사라지며 발생하는 깜빡임을 줄인다.
        //
        // 입력이 이진화(0/255)되어 있으므로, 인접 불투명 픽셀이 있으면
        // bestAlpha 는 항상 255 가 되어 완전 불투명으로 채워진다.
        // 이로써 얇은 부분이 확실하게 두꺼워지고 밉맵 축소 후에도 잔존한다.
        //
        // 중요: 이웃 알파의 "평균"을 쓰면 안 된다. 대각선으로만 인접한
        // 픽셀은 유효 이웃이 1개뿐이라 값이 낮게, 상하좌우로 인접한
        // 픽셀은 이웃이 여러 개라 값이 높게 나와서 픽셀마다 결과가
        // 들쭉날쭉해지고, 알파테스트 시 톱니(sawtooth) 모양의 구멍/돌기가
        // 생긴다. 대신 이웃 중 "최댓값(max) alpha"를 사용하고, 색상도
        // 여러 이웃을 섞지 않고 그 최댓값을 가진 이웃의 색을 그대로
        // 가져와야 형태가 보존된다.
        //
        // 외곽 테두리는 팽창 대상에서 제외해 항상 비워둔 상태를 유지한다.
        // ---------------------------------------------------------------
        for (let iter = 0; iter < dilateIterations; iter++) {
            const dilated = new Uint8Array(dst.length);
            dilated.set(dst);
            let dilatedChanged = false;

            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    if (isBorder(x, y)) continue; // 외곽은 항상 비워둔다

                    const index = getPixelIdx(x, y);
                    const alpha = dst[index + 3];
                    if (alpha > 0) continue; // 이미 불투명한 픽셀은 유지

                    let bestAlpha = 0;
                    let bestR = 0, bestG = 0, bestB = 0;

                    for (let i = 0; i < 8; i++) {
                        const nx = x + dx[i];
                        const ny = y + dy[i];

                        // 팽창 단계는 wrap 하지 않는다 (외곽 바깥/반대편 색 유입 방지)
                        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;

                        const neighborIndex = getPixelIdx(nx, ny);
                        const neighborAlpha = dst[neighborIndex + 3];

                        // 평균이 아니라 "가장 진한(alpha가 가장 큰) 이웃"만 채택
                        if (neighborAlpha > bestAlpha) {
                            bestAlpha = neighborAlpha;
                            bestR = dst[neighborIndex];
                            bestG = dst[neighborIndex + 1];
                            bestB = dst[neighborIndex + 2];
                        }
                    }

                    if (bestAlpha > 0) {
                        dilated[index] = bestR;
                        dilated[index + 1] = bestG;
                        dilated[index + 2] = bestB;
                        dilated[index + 3] = bestAlpha;
                        dilatedChanged = true;
                    }
                }
            }

            dst.set(dilated);
            if (!dilatedChanged) break;
        }

        clearBorderRing(); // 팽창 이후 안전하게 재확인
        src.set(dst);       // 이후 블리딩이 "두꺼워진" 형태를 기준으로 동작하도록 동기화

        // ---------------------------------------------------------------
        // 색상 블리딩 단계 (알파는 건드리지 않고 RGB만 채움)
        // 이 단계는 이미 투명한(alpha=0) 픽셀의 색상만 채우는 것이라
        // 실루엣 형태에 영향을 주지 않으므로 평균 방식 그대로 유지해도 무방하다.
        // ---------------------------------------------------------------
        for (let iter = 0; iter < 2; iter++) {
            let changed = false;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const index = getPixelIdx(x, y);
                    const alpha = src[index + 3];
                    if (alpha == 0 || (src[index + 0] == 0 && src[index + 1] == 0 && src[index + 2] == 0)) {
                        let rSum = 0, gSum = 0, bSum = 0;
                        let validNeighborCount = 0;
                        for (let i = 0; i < 8; i++) {
                            const nx = wrap(x + dx[i], w);
                            const ny = wrap(y + dy[i], h);

                            const neighborIndex = (ny * w + nx) * 4;
                            const neighborAlpha = src[neighborIndex + 3];

                            if (neighborAlpha > 0) {
                                rSum += src[neighborIndex];
                                gSum += src[neighborIndex + 1];
                                bSum += src[neighborIndex + 2];
                                validNeighborCount++;
                            }
                        }

                        if (validNeighborCount > 0) {
                            dst[index] = Math.round(rSum / validNeighborCount);
                            dst[index + 1] = Math.round(gSum / validNeighborCount);
                            dst[index + 2] = Math.round(bSum / validNeighborCount);
                            changed = true;
                        }
                    }
                }
            }
            src.set(dst);
            if (!changed) break;
        }

        clearBorderRing(); // 최종 반환 전 외곽 최종 재확인
        src.set(dst);

        return dst;
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
			L_arr.push(CPoolGeo.ProductV4());
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

				if (L_orgX + 1 != outSizeX && pa_sampleRate >= 1)//→
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
		for (var i = 0; i < 9; ++i)
		{
			CPoolGeo.RecycleV4(L_arr[i]);
		}
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
		_center : 브러시가 찍힐 중심 좌표
		_size : 브러시 크기
		_channel : 쓸 채널 (0=R, 1=G, 2=B, 3=A, 4=RGBA)
		_value : number(0-255) 또는 CTexture(스탬프 소스)
		         channel=4이고 number일 때 0xRRGGBBAA 형식으로 채널별 값 지정
		_type :
		        0 : 사각형, 값 고정
		        1 : 사각형, 값 더하기
		        2 : 원형, 중심 최대 → 가장자리 0 (Linear falloff)
	*/
	static DrawBrush(_targetTex : CTexture, _boundary : CBound, _center : CVec3, _brushSize : CVec2, _channel : number, _brushStrength : number, _type : number, _brushTex : CTexture)
	{
        // 타겟 버퍼
		if(_targetTex.GetBuf().length == 0) _targetTex.CreateBuf();
		const targetBuf = _targetTex.GetBuf()[0] as Uint8Array;

        // 현재 월드에 있는 pos, size를 텍스쳐 좌표로 변환
        const bound : CVec3 = _boundary.GetSize();
        const invBoundX = 1.0 / bound.x;
        const invBoundY = 1.0 / bound.y;
        const center : CVec2 = new CVec2(
            Math.floor((_center.x - _boundary.mMin.x) * invBoundX * _targetTex.GetWidth()),
            Math.floor((_center.y - _boundary.mMin.y) * invBoundY * _targetTex.GetHeight()),
        );
        const brushSize : CVec2 = new CVec2(
            Math.floor(_brushSize.x * 0.5 * invBoundX * _targetTex.GetWidth()),
            Math.floor(_brushSize.y * 0.5 * invBoundY * _targetTex.GetHeight())
        );

        // 브러시가 영향을 미칠 영역 계산
        const minX = CMath.Clamp(center.x - brushSize.x, 0, _targetTex.GetWidth() - 1);
        const minY = CMath.Clamp(center.y - brushSize.y, 0, _targetTex.GetHeight() - 1);
        const maxX = CMath.Clamp(center.x + brushSize.x, 0, _targetTex.GetWidth() - 1);
        const maxY = CMath.Clamp(center.y + brushSize.y, 0, _targetTex.GetHeight() - 1);

		// 활성 채널 목록
        const color : CVec4 = new CVec4();
		const activeChannels: number[] = [];
        if(_channel == 4) {
            activeChannels.push(0, 1, 2, 3);
            color.mF32A[0] = (_brushStrength >>> 24) & 0xFF;
            color.mF32A[1] = (_brushStrength >>> 16) & 0xFF;
            color.mF32A[2] = (_brushStrength >>> 8) & 0xFF;
            color.mF32A[3] = _brushStrength & 0xFF;
        }
        else {
            activeChannels.push(_channel);
            color.mF32A[_channel] = _brushStrength;
        }

        // 브러시 버퍼
        if(_brushTex.GetBuf().length == 0) _brushTex.CreateBuf();
        const brushBuf = _brushTex.GetBuf()[0] as Uint8Array;
        const GetPixelConst = (_x : number, _y : number) => {
            _x = CMath.Clamp(_x, 0, _brushTex.GetWidth() - 1);
            _y = CMath.Clamp(_y, 0, _brushTex.GetHeight() - 1);
            return brushBuf[(_y * _brushTex.GetWidth() + _x) * 4 + 3];
        }

        // 브러시 버퍼에서 샘플링하는 함수
        var SampleBrushTex = (_uv : CVec2) => {
            const texXY = new CVec2(
                _uv.x * _brushTex.GetWidth() - 0.5,
                _uv.y * _brushTex.GetHeight() - 0.5
            );

            const x0 = Math.floor(texXY.x);
            const y0 = Math.floor(texXY.y);
            const x1 = x0 + 1;
            const y1 = y0 + 1;

            const fx = texXY.x - x0;
            const fy = texXY.y - y0;
            
            const c00 = GetPixelConst(x0, y0);
            const c10 = GetPixelConst(x1, y0);
            const c01 = GetPixelConst(x0, y1);
            const c11 = GetPixelConst(x1, y1);

            const tx0 = c00 + fx * (c10 - c00);
            const tx1 = c01 + fx * (c11 - c01);

            return tx0 + fy * (tx1 - tx0);
        }

		// 픽셀 영역 순회
		for(let ty = minY; ty <= maxY; ty++)
        for(let tx = minX; tx <= maxX; tx++)
        {
            const dx = tx - center.x;
            const dy = ty - center.y;

            // 브러시 내 UV
            const brushUV = new CVec2(
                dx / brushSize.x * 0.5 + 0.5,
                dy / brushSize.y * 0.5 + 0.5
            );

            if (brushUV.x < 0 || brushUV.x >= 1 || brushUV.y < 0 || brushUV.y >= 1) continue;

            // Type 2: 타원 거리 → Linear falloff, 원 바깥 스킵
            let falloff = 1.0;
            if (_type === 2) {
                const dx = (brushUV.x - 0.5) * 2.0; // -1 ~ 1
                const dy = (brushUV.y - 0.5) * 2.0;
                const dist = Math.sqrt(dx * dx + dy * dy); // 0=중심, 1=가장자리
                if (dist >= 1.0) continue;
                falloff = 1.0 - dist;
            }

            const targetIdx = ((_targetTex.GetHeight() - 1 - ty) * _targetTex.GetWidth() + tx) * 4;

            // 텍스쳐 모드: stampTex를 마스크로 컬러값 쓰기
            const mask = SampleBrushTex(brushUV) / 255;
            if(mask <= 0) continue;
            
            for(const ch of activeChannels) {
                const srcVal = color.mF32A[ch] * falloff;
                if (_type === 0 || _type === 2) { // type 0
                    if(mask > 0) targetBuf[targetIdx + ch] = CMath.FloatInterpolate(0, srcVal, mask);
                } else { // type 1
                    targetBuf[targetIdx + ch] = CMath.FloatInterpolate(targetBuf[targetIdx + ch], CMath.Clamp(targetBuf[targetIdx + ch] + srcVal, 0, 255), mask);
                }
            }
        }
	}
}
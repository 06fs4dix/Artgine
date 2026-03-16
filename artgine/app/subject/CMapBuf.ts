import { CObject } from "../../basic/CObject.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CTexture } from "../../render/CTexture.js";
import { CCIndex } from "../canvas/CCIndex.js";

export class CMapBuf extends CObject
{
    mBuffer : Uint32Array=null;
    mSize : number=0;
    mCount : CVec3=new CVec3(1,1,1);
    Reset(_count : CVec3,_size : number)
    {
        this.mSize=_size;
        this.mCount=_count;
        this.mBuffer=new Uint32Array(this.mCount.x*this.mCount.y*this.mCount.z);
        this.mBuffer.fill(0);
    }
    RGB(_index: CCIndex | number, _data: number = null)
    {
        if (_data != null)
        {
            const rgb = (_data & 0xFFFFFF00) >>> 0;

            if (typeof _index == "number")
            {
                this.mBuffer[_index] = (rgb | (this.mBuffer[_index] & 0xFF)) >>> 0;
            }
            else
            {
                if (this.IndexOut(_index)) return;
                const offset = _index.Offset(this.mCount);
                this.mBuffer[offset] = (rgb | (this.mBuffer[offset] & 0xFF)) >>> 0;
            }
            return;
        }

        if (typeof _index == "number")
            return (this.mBuffer[_index] & 0xFFFFFF00) >>> 0;

        if (this.IndexOut(_index)) return null;
        return (this.mBuffer[_index.Offset(this.mCount)] & 0xFFFFFF00) >>> 0;
    }
    IndexOut(_index)
    {
        if(_index.x<0 || _index.x>=this.mCount.x || _index.y<0 || _index.y>=this.mCount.y || _index.z<0 || _index.z>=this.mCount.z)	return true;
        return false;
    }
    SetTexture(_tex: CTexture)
    {
        let buf = _tex.GetBuf()[0] as Uint8Array;
        let width = _tex.GetWidth();
        let height = _tex.GetHeight();

        // 사이즈 검증
        const is2D = (width == this.mCount.x && height == this.mCount.y);
        const is3D = (width == this.mCount.x && height == this.mCount.y * this.mCount.z);

        if (!is2D && !is3D) return;

        if (is2D)
        {
            for (let y = 0; y < this.mCount.y; ++y)
            {
                for (let x = 0; x < this.mCount.x; ++x)
                {
                    const py = (this.mCount.y - 1 - y); // Y 반전
                    const pi = (py * width + x) * 4;
                    const rgb = ((buf[pi] << 24) | (buf[pi+1] << 16) | (buf[pi+2] << 8)) >>> 0;
                    const bi = x + y * this.mCount.x;
                    this.mBuffer[bi] = (rgb | (this.mBuffer[bi] & 0xFF)) >>> 0;
                }
            }
        }
        else // is3D
        {
            for (let z = 0; z < this.mCount.z; ++z)
            {
                for (let y = 0; y < this.mCount.y; ++y)
                {
                    for (let x = 0; x < this.mCount.x; ++x)
                    {
                        // y가 바깥 블록, z가 블록 내 행
                        const pi = ((y * this.mCount.z + z) * width + x) * 4;
                        const rgb = ((buf[pi] << 24) | (buf[pi+1] << 16) | (buf[pi+2] << 8)) >>> 0;
                        const bi = x + y * this.mCount.x + z * this.mCount.x * this.mCount.y;
                        this.mBuffer[bi] = (rgb | (this.mBuffer[bi] & 0xFF)) >>> 0;
                    }
                }
            }
        }
    }
}
export interface IMapLabel
{
    Label() : string;
    Color() : number;
    Size() : CVec3;
}


export interface IMapSchema
{
    MapLog() : string;
}
import { CAlert } from "../../basic/CAlert.js";
import { CJSON } from "../../basic/CJSON.js";
import { CObject } from "../../basic/CObject.js";
import { CUtil } from "../../basic/CUtil.js";
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
        const buf = this.GetBuf();
        if (_data != null)
        {
            const rgb = (_data & 0xFFFFFF00) >>> 0;

            if (typeof _index == "number")
            {
                buf[_index] = (rgb | (buf[_index] & 0xFF)) >>> 0;
            }
            else
            {
                if (this.IndexOut(_index)) return;
                const offset = _index.Offset(this.mCount);
                buf[offset] = (rgb | (buf[offset] & 0xFF)) >>> 0;
            }
            return;
        }

        if (typeof _index == "number")
            return (buf[_index] & 0xFFFFFF00) >>> 0;

        if (this.IndexOut(_index)) return null;
        return (buf[_index.Offset(this.mCount)] & 0xFFFFFF00) >>> 0;
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

        if (!is2D && !is3D) 
        {
            CAlert.E("size diffent!");
            return;
        }
            

        const mbuf = this.GetBuf();
        if (is2D)
        {
            // for (let y = 0; y < this.mCount.y; ++y)
            // {
            //     for (let x = 0; x < this.mCount.x; ++x)
            //     {
            //         const pi = (y * width + x) * 4;
            //         const rgb = ((buf[pi] << 24) | (buf[pi+1] << 16) | (buf[pi+2] << 8)) >>> 0;
            //         const bi = x + y * this.mCount.x;
            //         mbuf[bi] = (rgb | (mbuf[bi] & 0xFF)) >>> 0;
            //     }
            // }
            for (let y = 0; y < this.mCount.y; ++y)
            {
                for (let x = 0; x < this.mCount.x; ++x)
                {
                    const srcY = (this.mCount.y - 1 - y);
                    const pi = (srcY * width + x) * 4;
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
                        const pi = ((y * this.mCount.z + z) * width + x) * 4;
                        const rgb = ((buf[pi] << 24) | (buf[pi+1] << 16) | (buf[pi+2] << 8)) >>> 0;
                        const bi = x + y * this.mCount.x + z * this.mCount.x * this.mCount.y;
                        mbuf[bi] = (rgb | (mbuf[bi] & 0xFF)) >>> 0;
                    }
                }
            }
        }
    }
    override ExportCJSON(): CJSON {
        let cjson = super.ExportCJSON();
        cjson.Set("mBuffer", CUtil.ArrayToLZBase64(this.GetBuf().buffer));
        return cjson;
    }

    override ImportCJSON(_json: CJSON): this {
        const arrStr = _json.GetStr("mBuffer");
        _json.Set("mBuffer",null);
        super.ImportCJSON(_json);
        this.mBuffer = arrStr as any; // 문자열 그대로 저장, GetBuf()에서 lazy decode
        return this;
    }
    GetBuf() : Uint32Array
    {
        if(typeof this.mBuffer === "string")
            this.mBuffer = new Uint32Array(CUtil.LZBase64ToArray(this.mBuffer as any));
        return this.mBuffer;
    }
    GetTexture(): CTexture
    {
        const tex = new CTexture();
        tex.SetMipMap(CTexture.eMipmap.GL);
        const mbuf = this.GetBuf();

        if (this.mCount.z <= 1)
        {
            // 2D
            tex.SetSize(this.mCount.x, this.mCount.y);
            tex.CreateBuf();

            const texBuf = tex.GetBuf()[0] as Uint8Array;

            for (let y = 0; y < this.mCount.y; ++y)
            {
                for (let x = 0; x < this.mCount.x; ++x)
                {
                    const bi  = x + y * this.mCount.x;
                    const val = mbuf[bi];

                    // SetTexture Y-flip 역방향
                    const dstY = (this.mCount.y - 1 - y);
                    const pi   = (dstY * this.mCount.x + x) * 4;

                    texBuf[pi    ] = (val >>> 24) & 0xFF; // R
                    texBuf[pi + 1] = (val >>> 16) & 0xFF; // G
                    texBuf[pi + 2] = (val >>>  8) & 0xFF; // B
                    texBuf[pi + 3] = (val        ) & 0xFF; // A
                }
            }
        }
        else
        {
            // 3D → height = mCount.y * mCount.z
            tex.SetSize(this.mCount.x, this.mCount.y * this.mCount.z);
            tex.CreateBuf();

            const texBuf = tex.GetBuf()[0] as Uint8Array;

            for (let z = 0; z < this.mCount.z; ++z)
            {
                for (let y = 0; y < this.mCount.y; ++y)
                {
                    for (let x = 0; x < this.mCount.x; ++x)
                    {
                        const bi  = x + y * this.mCount.x + z * this.mCount.x * this.mCount.y;
                        const val = mbuf[bi];

                        // SetTexture 3D: pi = ((y * mCount.z + z) * width + x) * 4
                        const pi  = ((y * this.mCount.z + z) * this.mCount.x + x) * 4;

                        texBuf[pi    ] = (val >>> 24) & 0xFF;
                        texBuf[pi + 1] = (val >>> 16) & 0xFF;
                        texBuf[pi + 2] = (val >>>  8) & 0xFF;
                        texBuf[pi + 3] = (val        ) & 0xFF;
                    }
                }
            }
        }

        return tex;
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
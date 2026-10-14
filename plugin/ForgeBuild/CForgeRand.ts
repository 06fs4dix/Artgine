export class CForgeRand
{
    mState : number;

    constructor(_seed : number = 1)
    {
        this.mState = _seed >>> 0;
    }
    Next() : number
    {
        this.mState = (this.mState + 0x6D2B79F5) >>> 0;
        let t = this.mState;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    Range(_min : number, _max : number) : number { return _min + (_max - _min) * this.Next(); }
    Int(_min : number, _max : number) : number { return _min + Math.floor((_max - _min + 1) * this.Next()); }
    Chance(_p : number) : boolean { return this.Next() < _p; }
    Pick<T>(_arr : T[]) : T { return _arr[Math.floor(this.Next() * _arr.length)]; }

    static Hash(..._v : number[]) : number
    {
        let h = 0x811C9DC5;
        for(const v of _v)
        {
            h = Math.imul(h ^ (v | 0), 0x01000193);
            h = Math.imul(h ^ (h >>> 13), 0x5BD1E995);
            h ^= h >>> 15;
        }
        return h >>> 0;
    }
    static HashF(_x : number, _y : number, _seed : number) : number
    {
        return CForgeRand.Hash(_x, _y, _seed) / 4294967296;
    }
    static Noise(_x : number, _y : number, _seed : number = 0) : number
    {
        const xi = Math.floor(_x), yi = Math.floor(_y);
        const xf = _x - xi, yf = _y - yi;
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const a = CForgeRand.HashF(xi, yi, _seed), b = CForgeRand.HashF(xi + 1, yi, _seed);
        const c = CForgeRand.HashF(xi, yi + 1, _seed), d = CForgeRand.HashF(xi + 1, yi + 1, _seed);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    static Fbm(_x : number, _y : number, _oct : number, _seed : number = 0) : number
    {
        let sum = 0, amp = 0.5, norm = 0, f = 1;
        for(let i = 0; i < _oct; i++)
        {
            sum += CForgeRand.Noise(_x * f, _y * f, _seed + i * 101) * amp;
            norm += amp;
            amp *= 0.5;
            f *= 2;
        }
        return sum / norm;
    }
}

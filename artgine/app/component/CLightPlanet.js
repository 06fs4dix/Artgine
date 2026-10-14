import { CObject } from "../../basic/CObject.js";
import { CMat } from "../../geometry/CMat.js";
import { CMath } from "../../geometry/CMath.js";
import { CPoolGeo } from "../../geometry/CPoolGeo.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CColor } from "../../render/CColor.js";
import { CLight } from "./CLight.js";
export class CDayCycle extends CObject {
    static sSkyTable = [
        [0.24, 0.27, 0.30, 0.34, 0.38, 0.43, 0.50, 0.58, 0.56, 0.53, 0.50, 0.48, 0.47, 0.47, 0.47, 0.47],
        [0.47, 0.52, 0.56, 0.60, 0.64, 0.68, 0.73, 0.78, 0.75, 0.71, 0.67, 0.64, 0.63, 0.63, 0.63, 0.63],
        [0.84, 0.87, 0.90, 0.92, 0.94, 0.95, 0.96, 0.96, 0.92, 0.87, 0.82, 0.78, 0.76, 0.76, 0.76, 0.76],
    ];
    static sNoonTable = [
        [1.00, 0.72, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49, 0.49],
        [0.97, 0.84, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72],
        [0.90, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95],
    ];
    static sGoldTable = [
        [1.00, 0.94, 0.84, 0.72, 0.60, 0.52, 0.47, 0.44, 0.42, 0.44, 0.47, 0.49, 0.50, 0.50, 0.50, 0.50],
        [0.86, 0.80, 0.72, 0.64, 0.58, 0.55, 0.53, 0.51, 0.50, 0.49, 0.49, 0.48, 0.48, 0.48, 0.48, 0.48],
        [0.60, 0.58, 0.58, 0.60, 0.62, 0.64, 0.66, 0.66, 0.66, 0.64, 0.62, 0.59, 0.57, 0.56, 0.55, 0.55],
    ];
    static sSunTable = [
        [1.00, 0.97, 0.90, 0.80, 0.68, 0.56, 0.48, 0.44, 0.42, 0.44, 0.47, 0.49, 0.50, 0.50, 0.50, 0.50],
        [0.50, 0.52, 0.52, 0.52, 0.52, 0.52, 0.52, 0.51, 0.50, 0.49, 0.49, 0.48, 0.48, 0.48, 0.48, 0.48],
        [0.18, 0.24, 0.30, 0.38, 0.46, 0.55, 0.62, 0.66, 0.66, 0.64, 0.62, 0.59, 0.57, 0.56, 0.55, 0.55],
    ];
    static sSkyLum = [[-18, 0.025], [-12, 0.04], [-9, 0.08], [-6, 0.16], [-3, 0.32], [0, 0.5], [5, 0.68], [10, 0.82], [20, 0.95], [35, 1]];
    static sGlowLum = [[-14, 0.03], [-10, 0.08], [-6, 0.25], [-3, 0.55], [0, 0.85], [5, 1]];
    static Key(_keys, _x) {
        if (_x <= _keys[0][0])
            return _keys[0][1];
        for (let i = 1; i < _keys.length; i++) {
            if (_x <= _keys[i][0]) {
                const a = _keys[i - 1], b = _keys[i];
                return a[1] + (b[1] - a[1]) * (_x - a[0]) / (b[0] - a[0]);
            }
        }
        return _keys[_keys.length - 1][1];
    }
    static sSunColor = [[-8, 0, 0, 0], [-3, 0.28, 0.1, 0.07], [0, 0.85, 0.36, 0.14], [4, 1.0, 0.55, 0.26], [10, 1.0, 0.76, 0.52], [20, 1.08, 0.97, 0.8], [35, 1.15, 1.08, 0.94], [90, 1.18, 1.12, 1.0]];
    static SunColor(_elevDeg) {
        const k = CDayCycle.sSunColor;
        if (_elevDeg <= k[0][0])
            return new CColor(k[0][1], k[0][2], k[0][3]);
        for (let i = 1; i < k.length; i++) {
            if (_elevDeg <= k[i][0]) {
                const a = k[i - 1], b = k[i];
                const t = (_elevDeg - a[0]) / (b[0] - a[0]);
                return new CColor(a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t);
            }
        }
        const l = k[k.length - 1];
        return new CColor(l[1], l[2], l[3]);
    }
    static Default(_stepHour = 0.25, _rise = new CVec3(-1, 0, 0)) {
        const rise = CMath.V3Nor(_rise);
        const arr = new Array();
        for (let h = 0; h < 24; h += _stepHour) {
            const rad = (h - 6) / 12 * Math.PI;
            const c = Math.cos(rad), s = Math.sin(rad);
            const dir = new CVec3(rise.x * c, rise.y * c + s, rise.z * c);
            const elev = Math.asin(Math.min(1, Math.max(-1, CMath.V3Nor(dir).y))) * 180 / Math.PI;
            arr.push(new CDayCycle(dir, CDayCycle.SunColor(elev)));
        }
        return arr;
    }
    static MakeTable(_elevDeg) {
        const e = _elevDeg;
        const sat = (_v) => Math.min(1, Math.max(0, _v));
        const lum = CDayCycle.Key(CDayCycle.sSkyLum, e);
        const glow = CDayCycle.Key(CDayCycle.sGlowLum, e);
        const tw = sat((6 - e) / 14);
        const tint = [1 - tw * 0.55, 1 - tw * 0.38, 1];
        const sw = sat((20 - e) / 14);
        const low = sat((8 - e) / 8);
        const dusk = sat(-e / 4);
        const sky = [new CMat(), new CMat(), new CMat()];
        const sun = [new CMat(), new CMat(), new CMat()];
        for (let c = 0; c < 3; c++) {
            const duskSky = CDayCycle.sSkyTable[c][6] * lum * tint[c] / Math.max(glow, 0.001);
            const ember = [0.9, 0.35, 0.12][c];
            for (let i = 0; i < 16; i++) {
                sky[c].mF32A[i] = CDayCycle.sSkyTable[c][i] * lum * tint[c];
                const gold = CDayCycle.sGoldTable[c][i] + (CDayCycle.sSunTable[c][i] - CDayCycle.sGoldTable[c][i]) * low;
                let v = CDayCycle.sNoonTable[c][i] + (gold - CDayCycle.sNoonTable[c][i]) * sw;
                if (i == 0)
                    v += (ember - v) * dusk;
                else
                    v += (duskSky - v) * dusk * sat(i / 4);
                sun[c].mF32A[i] = v * glow;
            }
        }
        return { sky: sky, sun: sun };
    }
    mSkyTable = [new CMat, new CMat, new CMat];
    mSunTable = [new CMat, new CMat, new CMat];
    mEmission = new CColor();
    mDirection = new CVec3();
    constructor(_dir, _emission, _skyTable = null, _sunTable = null, _emissionSum = 1) {
        super();
        if (_dir != null) {
            this.mDirection = CMath.V3Nor(_dir);
            this.mEmission = _emission;
        }
        if (_skyTable == null && _sunTable == null && _dir != null) {
            const elev = Math.asin(Math.min(1, Math.max(-1, this.mDirection.y))) * 180 / Math.PI;
            const table = CDayCycle.MakeTable(elev);
            this.mSkyTable = table.sky;
            this.mSunTable = table.sun;
            return;
        }
        if (_skyTable == null)
            _skyTable = CDayCycle.MakeTable(90).sky;
        if (_sunTable == null)
            _sunTable = CDayCycle.MakeTable(90).sun;
        if (_emission == null)
            return;
        const emissionAvg = (_emission.x + _emission.y + _emission.z) / 3.0;
        const factor = emissionAvg * _emissionSum;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < _skyTable[i].mF32A.length; j++) {
                _skyTable[i].mF32A[j] *= factor;
            }
        }
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < _skyTable[i].mF32A.length; j++) {
                _sunTable[i].mF32A[j] *= factor;
            }
        }
        this.mSkyTable = _skyTable;
        this.mSunTable = _sunTable;
    }
}
export class CLightPlanet extends CLight {
    mDCArr = new Array();
    mPointDCArr = new Array();
    mTempColor = new CColor();
    mPointColor = new CColor();
    mLightArr = new Array();
    mLightColorArr = new Array();
    mPickS = 0;
    mPickT = 1;
    IsShould(_member, _type) {
        if (_member == "mTempColor")
            return false;
        if (_member == "mPickS" || _member == "mPickT")
            return false;
        if (_member == "mPointColor")
            return false;
        if (_member == "mLightArr")
            return false;
        if (_member == "mLightColorArr")
            return false;
        return super.IsShould(_member, _type);
    }
    Push(_dc) {
        this.mDCArr.push(_dc);
    }
    PushDefault(_stepHour = 0.25, _rise = new CVec3(-1, 0, 0)) {
        for (const dc of CDayCycle.Default(_stepHour, _rise))
            this.mDCArr.push(dc);
    }
    PushPoint(_dc) {
        this.mPointDCArr.push(_dc);
    }
    PushLight(_light) {
        const arr = Array.isArray(_light) ? _light : [_light];
        for (const each of arr) {
            if (each == null || each == this)
                continue;
            this.mLightArr.push(each);
            this.mLightColorArr.push(each.GetColor());
        }
    }
    static TimeDir(_hour) {
        const rad = (_hour - 6) / 12 * Math.PI;
        return new CVec3(-Math.cos(rad), Math.sin(rad), 0);
    }
    SetTime(_hour) {
        const dir = CLightPlanet.TimeDir(_hour);
        const owner = this.GetOwner();
        if (owner != null)
            owner.SetPos(dir);
        if (this.mLightArr.length == 0)
            return;
        if (this.Pick(this.mPointDCArr, dir, this.mPointColor) < 0)
            return;
        const rate = this.mPointColor.ToRGB();
        const color = CPoolGeo.ProductV3();
        for (let i = 0; i < this.mLightArr.length; ++i) {
            const org = this.mLightColorArr[i];
            color.mF32A[0] = org.mF32A[0] * rate.mF32A[0];
            color.mF32A[1] = org.mF32A[1] * rate.mF32A[1];
            color.mF32A[2] = org.mF32A[2] * rate.mF32A[2];
            this.mLightArr[i].SetColor(color);
        }
        color.Recycle();
    }
    Pick(_arr, _dir, _out) {
        if (_arr.length == 0)
            return -1;
        let fOff = -1, sOff = -1;
        let fVal = -2, sVal = -2;
        for (let i = 0; i < _arr.length; ++i) {
            const dot = CMath.V3Dot(_arr[i].mDirection, _dir);
            if (dot > fVal) {
                sVal = fVal;
                sOff = fOff;
                fVal = dot;
                fOff = i;
            }
            else if (dot > sVal) {
                sVal = dot;
                sOff = i;
            }
        }
        if (sOff < 0) {
            sOff = fOff;
            sVal = fVal;
        }
        const fRad = Math.acos(Math.min(1, Math.max(-1, fVal)));
        const sRad = Math.acos(Math.min(1, Math.max(-1, sVal)));
        const t = sRad / Math.max(1e-6, sRad + fRad);
        _out.x = CMath.FloatInterpolate(_arr[sOff].mEmission.x, _arr[fOff].mEmission.x, t);
        _out.y = CMath.FloatInterpolate(_arr[sOff].mEmission.y, _arr[fOff].mEmission.y, t);
        _out.z = CMath.FloatInterpolate(_arr[sOff].mEmission.z, _arr[fOff].mEmission.z, t);
        _out.w = _arr[fOff].mEmission.w;
        this.mPickS = sOff;
        this.mPickT = t;
        return fOff;
    }
    Update(_update) {
        if (this.mBrush != null && this.mDCArr.length != 0) {
            const dir = CPoolGeo.ProductV3();
            dir.mF32A[0] = this.mDirPos.mF32A[0];
            dir.mF32A[1] = this.mDirPos.mF32A[1];
            dir.mF32A[2] = this.mDirPos.mF32A[2];
            const fOff = this.Pick(this.mDCArr, dir, this.mTempColor);
            dir.Recycle();
            if (fOff >= 0) {
                const s = this.mDCArr[this.mPickS], f = this.mDCArr[fOff], t = this.mPickT;
                for (let i = 0; i < 3; ++i) {
                    const sky = this.mBrush.mSkyTable[i].mF32A, sun = this.mBrush.mSunTable[i].mF32A;
                    const sSky = s.mSkyTable[i].mF32A, fSky = f.mSkyTable[i].mF32A;
                    const sSun = s.mSunTable[i].mF32A, fSun = f.mSunTable[i].mF32A;
                    for (let j = 0; j < 16; ++j) {
                        sky[j] = sSky[j] + (fSky[j] - sSky[j]) * t;
                        sun[j] = sSun[j] + (fSun[j] - sSun[j]) * t;
                    }
                }
                let color = this.mTempColor.ToRGB();
                this.mColor.mF32A[0] = color.mF32A[0];
                this.mColor.mF32A[1] = color.mF32A[1];
                this.mColor.mF32A[2] = color.mF32A[2];
                this.mDirPos.w = -1;
            }
        }
        super.Update(_update);
    }
}

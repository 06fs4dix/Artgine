export class CForgeFloraAsset {
    mKind = "";
    mPreset = "";
    mSeed = 0;
    mLod = [];
    mWind = [];
    mBillboard = false;
    mCut = false;
    mBound = [0, 0, 0, 0, 0, 0];
    mTris = [];
    mMs = 0;
    Size() { const b = this.mBound; return [b[3] - b[0], b[4] - b[1], b[5] - b[2]]; }
    MaxSize() { return Math.max(...this.Size()); }
    Bottom() { return this.Size()[1] * 0.5 / (this.MaxSize() || 1); }
    Mesh(_lod) { return this.mLod[Math.min(_lod, this.mLod.length - 1)]; }
    HasWind(_lod) { return this.mWind[Math.min(_lod, this.mWind.length - 1)] == true; }
    Billboard() { return this.mBillboard ? this.mLod[this.mLod.length - 1] : null; }
}

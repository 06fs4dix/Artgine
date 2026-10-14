//생성 결과 하나. mLod는 가까운 단계부터의 리소스 키(메시 .mesh, 마지막은 빌보드 .tex일 수 있다)
export class CForgeFloraAsset
{
    mKind = "";
    mPreset = "";
    mSeed = 0;
    mLod : string[] = [];
    //mLod와 같은 순서. 메시에 바람 가중치가 들어 있는지
    mWind : boolean[] = [];
    mBillboard = false;
    //잎·꽃 카드가 있어 알파컷으로 그려야 하는지
    mCut = false;
    //LOD 공통 바운드 [x0, y0, z0, x1, y1, z1] m
    mBound : number[] = [0, 0, 0, 0, 0, 0];
    mTris : number[] = [];
    mMs = 0;

    Size() : number[] { const b = this.mBound; return [b[3] - b[0], b[4] - b[1], b[5] - b[2]]; }
    MaxSize() : number { return Math.max(...this.Size()); }
    //덴시티 배치용 바닥 오프셋(CDensityMap이 최대 변 1로 정규화한 메시의 중심에서 바닥까지 거리)
    Bottom() : number { return this.Size()[1] * 0.5 / (this.MaxSize() || 1); }
    Mesh(_lod : number) : string { return this.mLod[Math.min(_lod, this.mLod.length - 1)]; }
    HasWind(_lod : number) : boolean { return this.mWind[Math.min(_lod, this.mWind.length - 1)] == true; }
    Billboard() : string { return this.mBillboard ? this.mLod[this.mLod.length - 1] : null; }
}

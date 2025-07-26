export class CMeshTreeUpdate {
    static TreeCopy(_md, _mpi, _sum, _bound) {
    }
    static TreeReset(_md, _mpi) {
    }
    static FindBFrame(_frameList, _key) {
        let frame = null;
        if (_frameList.length > 0) {
            frame = _frameList[0];
            for (var i = 0; i < _frameList.length; ++i) {
                if (_key > _frameList[i].key) {
                    frame = _frameList[i];
                }
                else
                    break;
            }
        }
        return frame;
    }
    static FindAFrame(_frameList, _key) {
        let frame = null;
        if (_frameList.length > 0) {
            for (var i = _frameList.length - 1; i >= 0; --i) {
                if (_key <= _frameList[i].key) {
                    frame = _frameList[i];
                }
                else
                    break;
            }
        }
        return frame;
    }
    static TreeUpdateMeshAni(_pst, _st, _ed, _md, _mci, _all) {
    }
    static TreeMeshInter(_mci, _create) {
    }
}
import CMeshTreeUpdate_imple from "../render_imple/CMeshTreeUpdate.js";
CMeshTreeUpdate_imple();

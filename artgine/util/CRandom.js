import { CMath } from "../geometry/CMath.js";
import { CVec3 } from "../geometry/CVec3.js";
export class CRandom {
    static MinMax(_min, _max) {
        return Math.random() * (_max - _min) + _min;
    }
    static Int(_max = 268435455) {
        return Math.trunc(Math.random() * _max);
    }
    static Dir(_2d = false) {
        if (_2d)
            return CMath.V3Nor(new CVec3(Math.random() - 0.5, Math.random() - 0.5, 0));
        return CMath.V3Nor(new CVec3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5));
    }
}

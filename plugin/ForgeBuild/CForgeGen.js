import { CForgeScene } from "./CForgeScene.js";
import { CForgeWallGen } from "./CForgeWallGen.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { CForgeHouseGen } from "./CForgeHouseGen.js";
import { CForgePropGen } from "./CForgePropGen.js";
import { CForgeBridgeGen } from "./CForgeBridgeGen.js";
import { CForgeChurchGen } from "./CForgeChurchGen.js";
import { CForgeDockGen } from "./CForgeDockGen.js";
import { CForgeMonumentGen } from "./CForgeMonumentGen.js";
export class CForgeGen {
    static Build(_kind, _r, _ground) {
        const K = CForgeScene.eKind;
        if (_r == null)
            return [];
        if (_kind == K.Wall)
            return CForgeWallGen.Build(_r, _ground);
        if (_kind == K.Tower)
            return CForgeTowerGen.Build(_r, _ground);
        if (_kind == K.Building)
            return CForgeHouseGen.Build(_r, _ground);
        if (_kind == K.Path)
            return CForgePropGen.Path(_r, _ground);
        if (_kind == K.Fence)
            return CForgePropGen.Fence(_r, _ground);
        if (_kind == K.Bridge)
            return CForgeBridgeGen.Bridge(_r, _ground);
        if (_kind == K.Stair)
            return CForgeBridgeGen.Stair(_r, _ground);
        if (_kind == K.Church)
            return CForgeChurchGen.Build(_r, _ground);
        if (_kind == K.Dock)
            return CForgeDockGen.Build(_r, _ground);
        if (_kind == K.Monument)
            return CForgeMonumentGen.Build(_r, _ground);
        return [];
    }
}

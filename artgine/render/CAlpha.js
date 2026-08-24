import { CVec2 } from "../geometry/CVec2.js";
export class CAlpha extends CVec2 {
    constructor(_opacity = 1, _cut = 0.1) {
        super(_opacity, _cut);
    }
}

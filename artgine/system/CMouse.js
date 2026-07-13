import { CObject } from "../basic/CObject.js";
export class CMouse extends CObject {
    x;
    y;
    key;
    press;
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
        this.key = 0;
        this.press = true;
    }
}

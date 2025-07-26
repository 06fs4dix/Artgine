import { CVec3 } from "../geometry/CVec3.js";
export class CMaterial {
    name;
    ambient;
    diffuse;
    specular;
    emissive;
    power;
    constructor() {
        this.name = "";
        this.ambient = new CVec3(0.2, 0.2, 0.2);
        this.diffuse = new CVec3(1, 1, 1);
        this.specular = new CVec3(0.5, 0.5, 0.5);
        this.emissive = new CVec3();
        this.power = 10;
    }
}
;

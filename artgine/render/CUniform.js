import { CObject } from "../basic/CObject.js";
export class CUniform extends CObject {
    count;
    tag;
    type;
    name;
    data;
    binding;
    group;
    size;
    constructor(_type, _name, _count = 1, _tag = "") {
        super();
        this.count = _count;
        this.tag = _tag;
        this.type = _type;
        this.name = _name;
        this.data = null;
        this.binding = null;
        this.group = null;
    }
}
;

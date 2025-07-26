import { CComponent } from "./CComponent.js";
export default class CBehavior extends CComponent {
    Start() {
    }
    Update(_delay) {
    }
    CameraOut(_pArr) {
    }
    Collision(_org, _size, _tar, _push) {
    }
    Trigger(_org, _size, _tar) {
    }
    PickMouse(_rayMouse) {
    }
    PickRay(_pos, _col) {
    }
    IsShould(_member, _type) {
        if (_member == "mEnable" || _member == "mKey" || _member == "mBlackboardWrite")
            return true;
        return false;
    }
}

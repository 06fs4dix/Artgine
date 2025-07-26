import { CObject } from "../basic/CObject.js";
import { CQueue } from "../basic/CQueue.js";
import { CVec3 } from "../geometry/CVec3.js";
export class CCIndex extends CObject {
    x = 0;
    y = 0;
    z = 0;
    static eDir = {
        "Up": 0,
        "Down": 1,
        "Left": 2,
        "Right": 3,
        "Front": 4,
        "Back": 5,
        "LeftUp": 7,
        "RightUp": 8,
        "LeftDown": 9,
        "RightDown": 10,
        "Center": 11,
        "Null": 11,
    };
    static eRevers = {
        "X0Y0": 0,
        "X1Y0": 1,
        "X0Y1": 2,
        "X1Y1": 3,
    };
    constructor(_xOff = null, _y = null, _z = null, _w = null) {
        super();
        if (_xOff == null) {
            this.x = 0;
            this.y = 0;
            this.z = 0;
        }
        else if (_w != null) {
            this.x = parseInt((_w % _xOff) + "");
            var dum = parseInt((_w / _xOff) + "");
            this.z = parseInt((dum % _z) + "");
            this.y = parseInt((dum / _z) + "");
        }
        else {
            this.x = _xOff;
            this.y = _y;
            this.z = _z;
        }
    }
    Add(x, y = null, z = null) {
        if (x instanceof CCIndex) {
            this.x += x.x;
            this.y += x.y;
            this.z += x.z;
        }
        else {
            this.x += x;
            this.y += y;
            this.z += z;
        }
    }
    Sub(_index) {
        this.x -= _index.x;
        this.y -= _index.y;
        this.z -= _index.z;
    }
    SubCount(_index, _y = true) {
        if (_y == false)
            return Math.abs(_index.x - this.x) + Math.abs(_index.z - this.z);
        return Math.abs(_index.x - this.x) + Math.abs(_index.y - this.y) + Math.abs(_index.z - this.z);
    }
    Equals(_index) {
        return this.x == _index.x && this.y == _index.y && this.z == _index.z;
    }
    M2Pos(_mSize) {
        return new CVec3(this.x * _mSize + _mSize * 0.5, this.y * _mSize + _mSize * 0.5, this.z * _mSize + _mSize * 0.5);
    }
    Offset(_size) {
        return this.x + this.y * _size.x + this.z * _size.x * _size.y;
    }
    Pos(_size) {
        return new CVec3(this.x * _size + _size * 0.5, this.y * _size + _size * 0.5, this.z * _size + _size * 0.5);
    }
    static New() {
        return g_cindexQue.New(CCIndex);
    }
    ;
    static Delete(_index) {
        g_cindexQue.Enqueue(_index);
    }
    static DirArr() {
        return g_dirArr;
    }
    ;
}
let g_cindexQue = new CQueue();
let g_dirArr = [g_cindexQue.New(CCIndex), g_cindexQue.New(CCIndex), g_cindexQue.New(CCIndex),
    g_cindexQue.New(CCIndex), g_cindexQue.New(CCIndex), g_cindexQue.New(CCIndex)];
g_dirArr[2].x = -1;
g_dirArr[3].x = 1;
g_dirArr[1].y = -1;
g_dirArr[0].y = 1;
g_dirArr[4].z = -1;
g_dirArr[5].z = 1;

import { CAlert } from "../basic/CAlert.js";
import { CFloat32Mgr } from "../geometry/CFloat32Mgr.js";
import { CMath } from "../geometry/CMath.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CDevice } from "./CDevice.js";
import { CMesh } from "./CMesh.js";
import { CMeshCreateInfo, CMeshBuf } from "./CMeshCreateInfo.js";
import { CMeshDataNode } from "./CMeshDataNode.js";
import { CVertexFormat } from "./CShader.js";
const g_fEpsilon = 0.0001;
class s_FACE {
    Tface;
    Cindex;
    constructor() {
        this.Tface = new Array();
        this.Cindex = new Array();
    }
}
function MakeSphere2(_vec, _uv, _nv, _radius, _vSaperation, _hSaperation) {
    var vs = _vSaperation / 2.0;
    var hs = _hSaperation;
    for (var j = 0; j < vs; j++) {
        if (j > vs - 1) {
            var h = _radius * (Math.cos((3.141592 / vs) * (j - (vs / 2))));
            var h1 = _radius * (Math.cos((3.141592 / vs) * (j + 1 - (vs / 2))));
            for (var i = 0; i < hs; i++) {
                var dummy1 = new CVec3();
                var dummy2 = new CVec3();
                var dummy3 = new CVec3();
                var dummy4 = new CVec3();
                dummy1.x = h * (-Math.cos(2 * (3.141592 / hs) * i));
                dummy1.y = _radius * (Math.sin((3.141592 / vs) * (j - (vs / 2))));
                dummy1.z = h * (-Math.sin(2 * (3.141592 / hs) * i));
                dummy2.x = 0;
                dummy2.y = _radius * (Math.sin((3.141592 / vs) * (j + 1 - (vs / 2))));
                dummy2.z = 0;
                dummy3.x = h * (-Math.cos(2 * (3.141592 / hs) * (i + 1)));
                dummy3.y = _radius * (Math.sin((3.141592 / vs) * (j - (vs / 2))));
                dummy3.z = h * (-Math.sin(2 * (3.141592 / hs) * (i + 1)));
                dummy4.x = 0;
                dummy4.y = _radius * (Math.sin((3.141592 / vs) * (j + 1 - (vs / 2))));
                dummy4.z = 0;
                _vec.Push(dummy1);
                _vec.Push(dummy2);
                _vec.Push(dummy3);
                _vec.Push(dummy2);
                _vec.Push(dummy4);
                _vec.Push(dummy3);
                _uv.Push(new CVec2(0, 0));
                _uv.Push(new CVec2(1, 0));
                _uv.Push(new CVec2(0, 1));
                _uv.Push(new CVec2(1, 0));
                _uv.Push(new CVec2(1, 1));
                _uv.Push(new CVec2(0, 1));
                _nv.Push(CMath.V3Nor(CMath.V3MulFloat(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1))), -1)));
                _nv.Push(CMath.V3Nor(CMath.V3MulFloat(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1))), -1)));
                _nv.Push(CMath.V3Nor(CMath.V3MulFloat(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1))), -1)));
                _nv.Push(CMath.V3Nor(CMath.V3MulFloat(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1))), -1)));
                _nv.Push(CMath.V3Nor(CMath.V3MulFloat(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1))), -1)));
                _nv.Push(CMath.V3Nor(CMath.V3MulFloat(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1))), -1)));
            }
        }
        else if (j == 0) {
            var h = _radius * (Math.cos((3.141592 / vs) * (j - (vs / 2))));
            var h1 = _radius * (Math.cos((3.141592 / vs) * (j + 1 - (vs / 2))));
            var h2 = _radius * (Math.cos((3.141592 / vs) * (j + 1 - (vs / 2))));
            var h3 = _radius * (Math.cos((3.141592 / vs) * (j + 2 - (vs / 2))));
            for (var i = 0; i < hs; i++) {
                var dummy1 = new CVec3();
                var dummy2 = new CVec3();
                var dummy3 = new CVec3();
                var dummy4 = new CVec3();
                var arr = new CVec3(0, 1, 0);
                dummy1.x = h * (-Math.cos(2 * (3.141592 / hs) * i));
                dummy1.y = _radius * (Math.sin((3.141592 / vs) * (j - (vs / 2))));
                dummy1.z = h * (-Math.sin(2 * (3.141592 / hs) * i));
                dummy2.x = h1 * (-Math.cos(2 * (3.141592 / hs) * i));
                dummy2.y = _radius * (Math.sin((3.141592 / vs) * (j + 1 - (vs / 2))));
                dummy2.z = h1 * (-Math.sin(2 * (3.141592 / hs) * i));
                dummy3.x = h * (-Math.cos(2 * (3.141592 / hs) * (i + 1)));
                dummy3.y = _radius * (Math.sin((3.141592 / vs) * (j - (vs / 2))));
                dummy3.z = h * (-Math.sin(2 * (3.141592 / hs) * (i + 1)));
                dummy4.x = h1 * (-Math.cos(2 * (3.141592 / hs) * (i + 1)));
                dummy4.y = _radius * (Math.sin((3.141592 / vs) * (j + 1 - (vs / 2))));
                dummy4.z = h1 * (-Math.sin(2 * (3.141592 / hs) * (i + 1)));
                var dummy5 = new CVec3();
                var dummy6 = new CVec3();
                var dummy7 = new CVec3();
                var dummy8 = new CVec3();
                dummy5.x = h2 * (-Math.cos(2 * (3.141592 / hs) * i));
                dummy5.y = _radius * (Math.sin((3.141592 / vs) * (j + 1 - (vs / 2))));
                dummy5.z = h2 * (-Math.sin(2 * (3.141592 / hs) * i));
                dummy6.x = h3 * (-Math.cos(2 * (3.141592 / hs) * i));
                dummy6.y = _radius * (Math.sin((3.141592 / vs) * (j + 2 - (vs / 2))));
                dummy6.z = h3 * (-Math.sin(2 * (3.141592 / hs) * i));
                dummy7.x = h2 * (-Math.cos(2 * (3.141592 / hs) * (i + 1)));
                dummy7.y = _radius * (Math.sin((3.141592 / vs) * (j + 1 - (vs / 2))));
                dummy7.z = h2 * (-Math.sin(2 * (3.141592 / hs) * (i + 1)));
                dummy8.x = h3 * (-Math.cos(2 * (3.141592 / hs) * (i + 1)));
                dummy8.y = _radius * (Math.sin((3.141592 / vs) * (j + 2 - (vs / 2))));
                dummy8.z = h3 * (-Math.sin(2 * (3.141592 / hs) * (i + 1)));
                _vec.Push(dummy1);
                _vec.Push(dummy2);
                _vec.Push(dummy3);
                _vec.Push(dummy2);
                _vec.Push(dummy4);
                _vec.Push(dummy3);
                _uv.Push(new CVec2(0, 0));
                _uv.Push(new CVec2(1, 0));
                _uv.Push(new CVec2(0, 1));
                _uv.Push(new CVec2(1, 0));
                _uv.Push(new CVec2(1, 1));
                _uv.Push(new CVec2(0, 1));
                _nv.Push(CMath.V3MulFloat(arr, -1));
                _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy4, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy8, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5), -1))));
                _nv.Push(CMath.V3MulFloat(arr, -1));
                _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy4, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy8, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5), -1))));
                _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy4, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy8, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5), -1))));
                _nv.Push(CMath.V3MulFloat(arr, -1));
            }
        }
        else {
            var h = _radius * (Math.cos((3.141592 / vs) * (j - (vs / 2))));
            var h1 = _radius * (Math.cos((3.141592 / vs) * (j + 1 - (vs / 2))));
            var h2 = _radius * (Math.cos((3.141592 / vs) * (j + 1 - (vs / 2))));
            var h3 = _radius * (Math.cos((3.141592 / vs) * (j + 2 - (vs / 2))));
            var h4 = _radius * (Math.cos((3.141592 / vs) * (j - 1 - (vs / 2))));
            var h5 = _radius * (Math.cos((3.141592 / vs) * (j - (vs / 2))));
            for (var i = 0; i < hs; i++) {
                var dummy1 = new CVec3();
                var dummy2 = new CVec3();
                var dummy3 = new CVec3();
                var dummy4 = new CVec3();
                dummy1.x = h * (-Math.cos(2 * (3.141592 / hs) * i));
                dummy1.y = _radius * (Math.sin((3.141592 / vs) * (j - (vs / 2))));
                dummy1.z = h * (-Math.sin(2 * (3.141592 / hs) * i));
                dummy2.x = h1 * (-Math.cos(2 * (3.141592 / hs) * i));
                dummy2.y = _radius * (Math.sin((3.141592 / vs) * (j + 1 - (vs / 2))));
                dummy2.z = h1 * (-Math.sin(2 * (3.141592 / hs) * i));
                dummy3.x = h * (-Math.cos(2 * (3.141592 / hs) * (i + 1)));
                dummy3.y = _radius * (Math.sin((3.141592 / vs) * (j - (vs / 2))));
                dummy3.z = h * (-Math.sin(2 * (3.141592 / hs) * (i + 1)));
                dummy4.x = h1 * (-Math.cos(2 * (3.141592 / hs) * (i + 1)));
                dummy4.y = _radius * (Math.sin((3.141592 / vs) * (j + 1 - (vs / 2))));
                dummy4.z = h1 * (-Math.sin(2 * (3.141592 / hs) * (i + 1)));
                var dummy5 = new CVec3();
                var dummy6 = new CVec3();
                var dummy7 = new CVec3();
                var dummy8 = new CVec3();
                dummy5.x = h2 * (-Math.cos(2 * (3.141592 / hs) * i));
                dummy5.y = _radius * (Math.sin((3.141592 / vs) * (j + 1 - (vs / 2))));
                dummy5.z = h2 * (-Math.sin(2 * (3.141592 / hs) * i));
                dummy6.x = h3 * (-Math.cos(2 * (3.141592 / hs) * i));
                dummy6.y = _radius * (Math.sin((3.141592 / vs) * (j + 2 - (vs / 2))));
                dummy6.z = h3 * (-Math.sin(2 * (3.141592 / hs) * i));
                dummy7.x = h2 * (-Math.cos(2 * (3.141592 / hs) * (i + 1)));
                dummy7.y = _radius * (Math.sin((3.141592 / vs) * (j + 1 - (vs / 2))));
                dummy7.z = h2 * (-Math.sin(2 * (3.141592 / hs) * (i + 1)));
                dummy8.x = h3 * (-Math.cos(2 * (3.141592 / hs) * (i + 1)));
                dummy8.y = _radius * (Math.sin((3.141592 / vs) * (j + 2 - (vs / 2))));
                dummy8.z = h3 * (-Math.sin(2 * (3.141592 / hs) * (i + 1)));
                var dummy9 = new CVec3();
                var dummy10 = new CVec3();
                var dummy11 = new CVec3();
                var dummy12 = new CVec3();
                dummy9.x = h4 * (-Math.cos(2 * (3.141592 / hs) * i));
                dummy9.y = _radius * (Math.sin((3.141592 / vs) * (j - 1 - (vs / 2))));
                dummy9.z = h4 * (-Math.sin(2 * (3.141592 / hs) * i));
                dummy10.x = h5 * (-Math.cos(2 * (3.141592 / hs) * i));
                dummy10.y = _radius * (Math.sin((3.141592 / vs) * (j - (vs / 2))));
                dummy10.z = h5 * (-Math.sin(2 * (3.141592 / hs) * i));
                dummy11.x = h4 * (-Math.cos(2 * (3.141592 / hs) * (i + 1)));
                dummy11.y = _radius * (Math.sin((3.141592 / vs) * (j - 1 - (vs / 2))));
                dummy11.z = h4 * (-Math.sin(2 * (3.141592 / hs) * (i + 1)));
                dummy12.x = h5 * (-Math.cos(2 * (3.141592 / hs) * (i + 1)));
                dummy12.y = _radius * (Math.sin((3.141592 / vs) * (j - (vs / 2))));
                dummy12.z = h5 * (-Math.sin(2 * (3.141592 / hs) * (i + 1)));
                _vec.Push(dummy1);
                _vec.Push(dummy2);
                _vec.Push(dummy3);
                _vec.Push(dummy2);
                _vec.Push(dummy4);
                _vec.Push(dummy3);
                _uv.Push(new CVec2(0, 0));
                _uv.Push(new CVec2(1, 0));
                _uv.Push(new CVec2(0, 1));
                _uv.Push(new CVec2(1, 0));
                _uv.Push(new CVec2(1, 1));
                _uv.Push(new CVec2(0, 1));
                if (j == 1) {
                    _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy12, dummy9)), (CMath.V3SubV3(dummy10, dummy9)))))), 0.5), -1))));
                    _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy8, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5), -1))));
                    _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy12, dummy9)), (CMath.V3SubV3(dummy10, dummy9)))))), 0.5), -1))));
                    _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy8, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5), -1))));
                    _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy8, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5), -1))));
                    _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy12, dummy9)), (CMath.V3SubV3(dummy10, dummy9)))))), 0.5), -1))));
                }
                else {
                    _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy11, dummy9)), (CMath.V3SubV3(dummy10, dummy9)))))), 0.5), -1))));
                    _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy7, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5), -1))));
                    _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy11, dummy9)), (CMath.V3SubV3(dummy10, dummy9)))))), 0.5), -1))));
                    _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy7, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5), -1))));
                    _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy7, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5), -1))));
                    _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy11, dummy9)), (CMath.V3SubV3(dummy10, dummy9)))))), 0.5), -1))));
                }
            }
        }
    }
    var vs1 = 0;
    if (_vSaperation % 2 == 1) {
        vs1 = vs + 0.5;
    }
    else {
        vs1 = vs;
    }
}
function MakeSphere(_vec, _uv, _nv, _index, _radius, _xSegments, _ySegments, _xTargetSegment, _yTargetSegment) {
    let PI = 3.14159265359;
    for (let x = 0; x <= _xTargetSegment; x++) {
        for (let y = 0; y <= _yTargetSegment; y++) {
            let xSegment = x / _xSegments;
            let ySegment = y / _ySegments;
            let xPos = Math.cos(xSegment * 2.0 * PI) * Math.sin(ySegment * PI);
            let yPos = Math.cos(ySegment * PI);
            let zPos = Math.sin(xSegment * 2.0 * PI) * Math.sin(ySegment * PI);
            _vec.Push(new CVec3(xPos * _radius.x, yPos * _radius.y, zPos * _radius.z));
            _uv.Push(new CVec2(xSegment, ySegment));
            _nv.Push(CMath.V3Nor(new CVec3(xPos * _radius.x, yPos * _radius.y, zPos * _radius.z)));
        }
    }
    let oddRow = false;
    let stripIndex = [];
    for (let y = 0; y < _yTargetSegment; y++) {
        if (!oddRow) {
            for (let x = 0; x <= _xTargetSegment; x++) {
                stripIndex.push(y * (_xTargetSegment + 1) + x);
                stripIndex.push((y + 1) * (_xTargetSegment + 1) + x);
            }
        }
        else {
            for (let x = _xTargetSegment; x >= 0; x--) {
                stripIndex.push((y + 1) * (_xTargetSegment + 1) + x);
                stripIndex.push(y * (_xTargetSegment + 1) + x);
            }
        }
        oddRow = !oddRow;
    }
    oddRow = false;
    for (let i = 2; i < stripIndex.length; i++) {
        if (i % 2 == 1) {
            _index.push(stripIndex[i]);
            _index.push(stripIndex[i - 1]);
            _index.push(stripIndex[i - 2]);
        }
        else {
            _index.push(stripIndex[i - 2]);
            _index.push(stripIndex[i - 1]);
            _index.push(stripIndex[i]);
        }
    }
}
export class CUtilRender {
    static Mesh2DSize = 10;
    static FrameToMili(_frame) {
        return parseInt(((_frame / 30.0) * 1000) + "");
    }
    static CloseToExp(fInput, fExponent = 2) {
        if (fInput > 0.0 && fInput <= 1.0)
            return 0;
        var fResult = Math.log(CMath.Abs(fInput)) / Math.log(fExponent);
        var nResult = parseInt(fResult + "");
        var fEpsilon = CMath.Abs(fResult - nResult);
        if (CMath.Abs(fEpsilon - 0.0) <= g_fEpsilon)
            return parseInt(Math.pow(fExponent, nResult) + "");
        nResult = parseInt(Math.pow(fExponent, nResult + 1) + "");
        if (fInput < 0.0)
            return -nResult;
        return nResult;
    }
    static VertexToNormalReCac(_vertex, _normal, _index) {
        var nMap = new Map();
        for (var i = 0; i < _index.length; i += 3) {
            var newNor = _normal.V3(_index[i + 0]);
            for (var j = 0; j < 3; ++j) {
                var vertex = _vertex.V3(_index[i + j]);
                var av = nMap.get(vertex.x + "/" + vertex.y + "/" + vertex.z);
                if (av == null) {
                    nMap.set(vertex.x + "/" + vertex.y + "/" + vertex.z, [newNor]);
                    av = nMap.get(vertex.x + "/" + vertex.y + "/" + vertex.z);
                }
                else {
                    var p = true;
                    for (var k = 0; k < av.length; ++k) {
                        if (CMath.V3Dot(av[k], newNor) > 0.9)
                            p = false;
                    }
                    if (p)
                        av.push(newNor);
                }
            }
        }
        for (var each0Key of nMap.keys()) {
            var each0 = nMap.get(each0Key);
            var nv = new CVec3();
            for (var i = 0; i < each0.length; ++i) {
                nv = CMath.V3AddV3(nv, each0[i]);
            }
            nMap.set(each0Key, CMath.V3Nor(nv));
        }
        for (var i = 0; i < _index.length; i += 3) {
            for (var j = 0; j < 3; ++j) {
                var vertex = _vertex.V3(_index[i + j]);
                var nor = nMap.get(vertex.x + "/" + vertex.y + "/" + vertex.z);
                var on = _normal.V3(_index[i + j]);
                if (on.x == 1 || on.y == 1 || on.z == 1 || on.x == -1 || on.y == -1 || on.z == -1) {
                }
                else if (CMath.V3Dot(on, nor) > 0.8) {
                    _normal.V3(_index[i + j], nor);
                }
            }
        }
    }
    static UvIndexToVertexIndexBefore(pa_po_vertex, pa_po_uv, pa_po_normal, pa_po_weight, pa_po_weightIndex, RF_index, RF_Tface) {
        var L_vertexNum = pa_po_vertex.Size(3);
        var L_indexNum = RF_index.length / 3;
        var L_aUv = new CFloat32Mgr();
        var L_aIn = new Array();
        for (var i = 0; i < L_indexNum * 3; ++i) {
            L_aIn.push(RF_index[i]);
        }
        var L_list = new Array();
        for (var i = 0; i < L_vertexNum; ++i) {
            L_list.push(new s_FACE());
        }
        for (var i = 0; i < L_indexNum; ++i) {
            for (var j = 0; j < L_list[RF_index[i * 3 + 0]].Tface.length; ++j) {
                if (L_list[RF_index[i * 3] + 0].Tface[j] == RF_Tface[i * 3 + 0]) {
                    RF_index[i * 3 + 0] = L_list[L_aIn[i * 3] + 0].Cindex[j];
                    L_list[L_aIn[i * 3 + 0]].Cindex.push_back(RF_index[i * 3 + 0]);
                    break;
                }
                if (L_list[RF_index[i * 3 + 0]].Tface.length == j + 1) {
                    pa_po_vertex.Push(pa_po_vertex.V3(RF_index[i * 3 + 0]));
                    RF_index[i * 3 + 0] = pa_po_vertex.Size(3) - 1;
                    L_list[L_aIn[i * 3 + 0]].Cindex.push_back(RF_index[i * 3 + 0]);
                    break;
                }
            }
            L_list[L_aIn[i * 3 + 0]].Tface.push_back(RF_Tface[i * 3 + 0]);
            if (L_list[L_aIn[i * 3 + 0]].Cindex.empty())
                L_list[L_aIn[i * 3 + 0]].Cindex.push_back(L_aIn[i * 3 + 0]);
            for (var j = 0; j < L_list[RF_index[i * 3 + 1]].Tface.length; ++j) {
                if (L_list[RF_index[i * 3 + 1]].Tface[j] == RF_Tface[i * 3 + 1]) {
                    RF_index[i * 3 + 1] = L_list[L_aIn[i * 3 + 1]].Cindex[j];
                    L_list[L_aIn[i * 3 + 1]].Cindex.push_back(RF_index[i * 3 + 1]);
                    break;
                }
                if (L_list[RF_index[i * 3 + 1]].Tface.length == j + 1) {
                    pa_po_vertex.Push(pa_po_vertex.V3(RF_index[i * 3 + 1]));
                    RF_index[i * 3 + 1] = pa_po_vertex.Size(3) - 1;
                    L_list[L_aIn[i * 3 + 1]].Cindex.push_back(RF_index[i * 3 + 1]);
                    break;
                }
            }
            L_list[L_aIn[i * 3 + 1]].Tface.push_back(RF_Tface[i * 3 + 1]);
            if (L_list[L_aIn[i * 3 + 1]].Cindex.empty())
                L_list[L_aIn[i * 3 + 1]].Cindex.push_back(L_aIn[i * 3 + 1]);
            for (var j = 0; j < L_list[RF_index[i * 3 + 2]].Tface.length; ++j) {
                if (L_list[RF_index[i * 3 + 2]].Tface[j] == RF_Tface[i * 3 + 2]) {
                    RF_index[i * 3 + 2] = L_list[L_aIn[i * 3 + 2]].Cindex[j];
                    L_list[L_aIn[i * 3 + 2]].Cindex.push_back(RF_index[i * 3 + 2]);
                    break;
                }
                if (L_list[RF_index[i * 3 + 2]].Tface.length == j + 1) {
                    pa_po_vertex.Push(pa_po_vertex.V3(RF_index[i * 3 + 2]));
                    RF_index[i * 3 + 2] = pa_po_vertex.Size(3) - 1;
                    L_list[L_aIn[i * 3 + 2]].Cindex.push_back(RF_index[i * 3 + 2]);
                    break;
                }
            }
            L_list[L_aIn[i * 3 + 2]].Tface.push_back(RF_Tface[i * 3 + 2]);
            if (L_list[L_aIn[i * 3 + 2]].Cindex.empty())
                L_list[L_aIn[i * 3 + 2]].Cindex.push_back(L_aIn[i * 3 + 2]);
        }
        L_vertexNum = pa_po_vertex.Size(3);
        var L_uv = new CFloat32Mgr();
        L_uv.Resize(L_vertexNum * 2);
        if (pa_po_vertex.Empty())
            CAlert.E("체크코드");
        var L_nor = new CFloat32Mgr();
        ;
        var L_we = new CFloat32Mgr();
        ;
        var L_weI = new CFloat32Mgr();
        ;
        var L_ref = new CFloat32Mgr();
        ;
        var L_copy = [false, false, false];
        if (!pa_po_normal.Empty()) {
            L_copy[0] = true;
            L_nor.Resize(L_vertexNum * 3);
        }
        if (!pa_po_weight.Empty()) {
            L_copy[1] = true;
            L_we.Resize(L_vertexNum * 4);
        }
        if (!pa_po_weightIndex.Empty()) {
            L_copy[2] = true;
            L_weI.Resize(L_vertexNum * 4);
        }
        for (var i = 0; i < L_indexNum; ++i) {
            L_uv.V2(RF_index[i * 3 + 0], pa_po_uv.V2(RF_Tface[i * 3 + 0]));
            L_uv.V2(RF_index[i * 3 + 1], pa_po_uv.V2(RF_Tface[i * 3 + 1]));
            L_uv.V2(RF_index[i * 3 + 2], pa_po_uv.V2(RF_Tface[i * 3 + 2]));
            if (L_copy[0]) {
                L_nor.V3(RF_index[i * 3 + 0], pa_po_normal.V3(L_aIn[i * 3 + 0]));
                L_nor.V3(RF_index[i * 3 + 1], pa_po_normal.V3(L_aIn[i * 3 + 1]));
                L_nor.V3(RF_index[i * 3 + 2], pa_po_normal.V3(L_aIn[i * 3 + 2]));
            }
            if (L_copy[1]) {
                L_we.V4(RF_index[i * 3 + 0], pa_po_weight.V4(L_aIn[i * 3 + 0]));
                L_we.V4(RF_index[i * 3 + 1], pa_po_weight.V4(L_aIn[i * 3 + 1]));
                L_we.V4(RF_index[i * 3 + 2], pa_po_weight.V4(L_aIn[i * 3 + 2]));
            }
            if (L_copy[2]) {
                L_weI.V4(RF_index[i * 3 + 0], pa_po_weightIndex.V4(L_aIn[i * 3 + 0]));
                L_weI.V4(RF_index[i * 3 + 1], pa_po_weightIndex.V4(L_aIn[i * 3 + 1]));
                L_weI.V4(RF_index[i * 3 + 2], pa_po_weightIndex.V4(L_aIn[i * 3 + 2]));
            }
        }
        pa_po_uv.Swap(L_uv);
        pa_po_normal.Swap(L_nor);
        pa_po_weight.Swap(L_we);
        pa_po_weightIndex.Swap(L_weI);
    }
    static UvIndexToVertexIndex(pa_po_vertex, pa_po_uv, pa_po_weight, pa_po_weightIndex, pa_po_texOff, RF_index) {
        var L_indexNum = RF_index.length / 3;
        var nv = new CFloat32Mgr();
        var nu = new Array();
        var nw = new CFloat32Mgr();
        var nwi = new CFloat32Mgr();
        var itMap = new Map();
        var ni = new Array();
        var nto = new CFloat32Mgr();
        for (var i = 0; i < pa_po_uv.length; ++i) {
            nu.push(new CMeshBuf(CVertexFormat.eIdentifier.UV));
        }
        for (var i = 0; i < L_indexNum; ++i) {
            var V0 = pa_po_vertex.V3(RF_index[i * 3 + 0]);
            var V1 = pa_po_vertex.V3(RF_index[i * 3 + 1]);
            var V2 = pa_po_vertex.V3(RF_index[i * 3 + 2]);
            var newNor = CMath.V3Nor(CMath.V3Cross(CMath.V3SubV3(V1, V0), CMath.V3SubV3(V2, V0)));
            for (var j = 0; j < 3; ++j) {
                var key = RF_index[i * 3 + j] + "/" + pa_po_uv[0].bufI[i * 3 + j] + "/" + newNor.x + "," + newNor.y + "," + newNor.z;
                var itv = itMap.get(key);
                if (itv == null) {
                    nv.Push(pa_po_vertex.V3(RF_index[i * 3 + j]));
                    for (var k = 0; k < pa_po_uv.length; ++k) {
                        nu[k].bufF.Push(pa_po_uv[k].bufF.V2(pa_po_uv[0].bufI[i * 3 + j]));
                    }
                    if (pa_po_weight.Size(1) == 0) {
                        nw.Push(new CVec4(1, 0, 0, 0));
                        nwi.Push(new CVec4(0, 0, 0, 0));
                    }
                    else {
                        nw.Push(pa_po_weight.V4(RF_index[i * 3 + j]));
                        nwi.Push(pa_po_weightIndex.V4(RF_index[i * 3 + j]));
                    }
                    nto.Push(pa_po_texOff.V3(RF_index[i * 3 + j]));
                    var off = nv.Size(3) - 1;
                    ni.push(off);
                    itMap.set(key, off);
                }
                else
                    ni.push(itv);
            }
        }
        pa_po_vertex.Swap(nv);
        for (var k = 0; k < pa_po_uv.length; ++k) {
            pa_po_uv[k].bufF.Swap(nu[k].bufF);
        }
        pa_po_uv;
        pa_po_weight.Swap(nw);
        pa_po_weightIndex.Swap(nwi);
        pa_po_texOff.Swap(nto);
        for (var i = 0; i < RF_index.length; ++i) {
            RF_index[i] = ni[i];
        }
    }
    static TangentCalculate(pa_verArr, pa_norArr, pa_uvArr, pa_index, pa_out) {
        var tan1 = new Array();
        var tan2 = new Array();
        for (var i = 0; i < pa_verArr.Size(3); ++i) {
            tan1[i] = new CVec3();
            tan2[i] = new CVec3();
        }
        for (var a = 0; a < pa_index.length; a += 3) {
            var i0 = pa_index[a + 0];
            var i1 = pa_index[a + 1];
            var i2 = pa_index[a + 2];
            var v1 = CMath.V3SubV3(pa_verArr.V3(i1), pa_verArr.V3(i0));
            var v2 = CMath.V3SubV3(pa_verArr.V3(i2), pa_verArr.V3(i0));
            var uv1 = CMath.Vec2MinusVec2(pa_uvArr.V2(i1), pa_uvArr.V2(i0));
            var uv2 = CMath.Vec2MinusVec2(pa_uvArr.V2(i2), pa_uvArr.V2(i0));
            var r = 1.0 / (uv1.x * uv2.y - uv2.x * uv1.y);
            var sdir = new CVec3((uv2.y * v1.x - uv1.y * v2.x) * r, (uv2.y * v1.y - uv1.y * v2.y) * r, (uv2.y * v1.z - uv1.y * v2.z) * r);
            var tdir = new CVec3((uv1.x * v2.x - uv2.x * v1.x) * r, (uv1.x * v2.y - uv2.x * v1.y) * r, (uv1.x * v2.z - uv2.x * v1.z) * r);
            tan1[i0] = CMath.V3AddV3(tan1[i0], sdir);
            tan1[i1] = CMath.V3AddV3(tan1[i1], sdir);
            tan1[i2] = CMath.V3AddV3(tan1[i2], sdir);
            tan2[i0] = CMath.V3AddV3(tan2[i0], tdir);
            tan2[i1] = CMath.V3AddV3(tan2[i1], tdir);
            tan2[i2] = CMath.V3AddV3(tan2[i2], tdir);
        }
        for (var a = 0; a < pa_verArr.Size(3); a++) {
            var n = pa_norArr.V3(a);
            var t = tan1[a];
            var t2 = CMath.V3Nor(tan1[a]);
            pa_out.V4(a, t2.x, t2.y, t2.z, 1);
        }
    }
    static PolygonNormalToVertexNormal(_nor, pa_index, pa_verNum) {
        var L_out = new Array();
        for (var i = 0; i < pa_verNum; ++i) {
            L_out.push(new CVec3());
        }
        for (var i = 0; i < pa_index.length; ++i) {
            L_out[pa_index[i]] = CMath.V3AddV3(_nor.V3(i), L_out[pa_index[i]]);
        }
        for (var i = 0; i < L_out.length; ++i) {
            L_out[i] = CMath.V3Nor(L_out[i]);
        }
        _nor.Clear();
        for (var i = 0; i < pa_verNum; ++i) {
            _nor.Push(L_out[i]);
        }
    }
    static KEI_VertexExportNormal(pa_position, pa_normal, _size, pa_tick, pa_rate) {
        var L_sum = new CVec3();
        var L_ver = new Array();
        L_ver.push(new CVec3());
        L_ver.push(new CVec3());
        L_ver.push(new CVec3());
        for (var y = 0; y < _size; ++y) {
            for (var x = 0; x < _size; ++x) {
                L_sum.x = 0;
                L_sum.y = 0;
                L_sum.z = 0;
                L_ver[0] = new CVec3(0, pa_position.V3(y * _size + x).y * pa_rate, 0);
                if (y + 1 < _size)
                    L_ver[2] = new CVec3(pa_tick, pa_position.V3((y + 1) * _size + x).y * pa_rate, 0);
                else {
                    L_ver[2] = new CVec3(pa_tick, pa_position.V3((y - 1) * _size + x).y * pa_rate, 0);
                }
                if (x + 1 < _size)
                    L_ver[1] = new CVec3(0, pa_position.V3(y * _size + (x + 1)).y * pa_rate, pa_tick);
                else {
                    L_ver[1] = new CVec3(0, pa_position.V3(y * _size + (x - 1)).y * pa_rate, pa_tick);
                }
                L_sum = CMath.V3Cross(CMath.V3SubV3(L_ver[1], L_ver[0]), CMath.V3SubV3(L_ver[2], L_ver[0]));
                L_sum = CMath.V3Nor(L_sum);
                L_sum.x *= pa_rate;
                L_sum.z *= pa_rate;
                L_sum = CMath.V3Nor(L_sum);
                pa_normal.V3(y * _size + x, L_sum);
            }
        }
    }
    static Frame3DMax(_frame) {
        return 1539538600 * _frame;
    }
    static GetPlane(_plane, _uv = new CVec2(1, 1)) {
        var rVal = new CMeshCreateInfo();
        var nor = _plane.xyz;
        var posb = rVal.Create(CVertexFormat.eIdentifier.Position);
        var dir = new CVec3();
        dir.x = 1 - CMath.Abs(_plane.x);
        dir.y = 1 - CMath.Abs(_plane.y);
        dir.z = 1 - CMath.Abs(_plane.z);
        var mdir = CMath.V3MulFloat(dir, -1);
        var cro = CMath.V3Cross(nor, dir);
        var mcro = CMath.V3MulFloat(cro, -1);
        mdir = CMath.V3MulFloat(mdir, _plane.w);
        cro = CMath.V3MulFloat(cro, _plane.w);
        mcro = CMath.V3MulFloat(mcro, _plane.w);
        dir = CMath.V3MulFloat(dir, _plane.w);
        posb.bufF.Push(mdir);
        posb.bufF.Push(mcro);
        posb.bufF.Push(dir);
        posb.bufF.Push(cro);
        var uv = [
            new CVec2(0, 0), new CVec2(_uv.x, 0), new CVec2(_uv.x, _uv.y),
            new CVec2(0, _uv.y), new CVec2(0, 0), new CVec2(_uv.x, _uv.y)
        ];
        var uvb = rVal.Create(CVertexFormat.eIdentifier.UV);
        uvb.bufF.Push(uv[0]);
        uvb.bufF.Push(uv[1]);
        uvb.bufF.Push(uv[2]);
        uvb.bufF.Push(uv[3]);
        var norb = rVal.Create(CVertexFormat.eIdentifier.Normal);
        norb.bufF.Push(nor);
        norb.bufF.Push(nor);
        norb.bufF.Push(nor);
        norb.bufF.Push(nor);
        rVal.vertexCount = 4;
        rVal.index.push(0);
        rVal.index.push(1);
        rVal.index.push(2);
        rVal.index.push(2);
        rVal.index.push(3);
        rVal.index.push(0);
        rVal.indexCount = 6;
        return rVal;
    }
    static CMeshCreateInfoToCMesh(_mci, _texture) {
        let mesh = new CMesh();
        mesh.meshTree.mData = new CMeshDataNode();
        mesh.meshTree.mData.ci = new CMeshCreateInfo;
        mesh.meshTree.mData.ci = _mci;
        mesh.texture.push(_texture);
        mesh.meshTree.mData.textureOff.push(0);
        return mesh;
    }
    static GetBox(_size, _normalCenter = true) {
        var rVal = new CMeshCreateInfo();
        var posb = rVal.Create(CVertexFormat.eIdentifier.Position);
        var uvb = rVal.Create(CVertexFormat.eIdentifier.UV);
        var norb = rVal.Create(CVertexFormat.eIdentifier.Normal);
        posb.bufF.Push(new CVec3(-_size, _size, -_size));
        posb.bufF.Push(new CVec3(_size, _size, -_size));
        posb.bufF.Push(new CVec3(_size, _size, _size));
        posb.bufF.Push(new CVec3(-_size, _size, _size));
        posb.bufF.Push(new CVec3(-_size, -_size, -_size));
        posb.bufF.Push(new CVec3(_size, -_size, -_size));
        posb.bufF.Push(new CVec3(_size, -_size, _size));
        posb.bufF.Push(new CVec3(-_size, -_size, _size));
        posb.bufF.Push(new CVec3(-_size, -_size, _size));
        posb.bufF.Push(new CVec3(-_size, -_size, -_size));
        posb.bufF.Push(new CVec3(-_size, _size, -_size));
        posb.bufF.Push(new CVec3(-_size, _size, _size));
        posb.bufF.Push(new CVec3(_size, -_size, _size));
        posb.bufF.Push(new CVec3(_size, -_size, -_size));
        posb.bufF.Push(new CVec3(_size, _size, -_size));
        posb.bufF.Push(new CVec3(_size, _size, _size));
        posb.bufF.Push(new CVec3(-_size, -_size, -_size));
        posb.bufF.Push(new CVec3(_size, -_size, -_size));
        posb.bufF.Push(new CVec3(_size, _size, -_size));
        posb.bufF.Push(new CVec3(-_size, _size, -_size));
        posb.bufF.Push(new CVec3(-_size, -_size, _size));
        posb.bufF.Push(new CVec3(_size, -_size, _size));
        posb.bufF.Push(new CVec3(_size, _size, _size));
        posb.bufF.Push(new CVec3(-_size, _size, _size));
        for (var i = 0; i < posb.bufF.Size(3); ++i) {
            norb.bufF.Push(CMath.V3Nor(posb.bufF.V3(i)));
        }
        if (_normalCenter) {
            norb.bufF.V3(0, new CVec3(0, 1, 0));
            norb.bufF.V3(1, new CVec3(0, 1, 0));
            norb.bufF.V3(2, new CVec3(0, 1, 0));
            norb.bufF.V3(3, new CVec3(0, 1, 0));
            norb.bufF.V3(4, new CVec3(0, -1, 0));
            norb.bufF.V3(5, new CVec3(0, -1, 0));
            norb.bufF.V3(6, new CVec3(0, -1, 0));
            norb.bufF.V3(7, new CVec3(0, -1, 0));
            norb.bufF.V3(8, new CVec3(-1, 0, 0));
            norb.bufF.V3(9, new CVec3(-1, 0, 0));
            norb.bufF.V3(10, new CVec3(-1, 0, 0));
            norb.bufF.V3(11, new CVec3(-1, 0, 0));
            norb.bufF.V3(12, new CVec3(1, 0, 0));
            norb.bufF.V3(13, new CVec3(1, 0, 0));
            norb.bufF.V3(14, new CVec3(1, 0, 0));
            norb.bufF.V3(15, new CVec3(1, 0, 0));
            norb.bufF.V3(16, new CVec3(0, 0, -1));
            norb.bufF.V3(17, new CVec3(0, 0, -1));
            norb.bufF.V3(18, new CVec3(0, 0, -1));
            norb.bufF.V3(19, new CVec3(0, 0, -1));
            norb.bufF.V3(20, new CVec3(0, 0, 1));
            norb.bufF.V3(21, new CVec3(0, 0, 1));
            norb.bufF.V3(22, new CVec3(0, 0, 1));
            norb.bufF.V3(23, new CVec3(0, 0, 1));
        }
        uvb.bufF.Push(new CVec2(0, 1));
        uvb.bufF.Push(new CVec2(1, 1));
        uvb.bufF.Push(new CVec2(1, 0));
        uvb.bufF.Push(new CVec2(0, 0));
        uvb.bufF.Push(new CVec2(0, 0));
        uvb.bufF.Push(new CVec2(1, 0));
        uvb.bufF.Push(new CVec2(1, 1));
        uvb.bufF.Push(new CVec2(0, 1));
        uvb.bufF.Push(new CVec2(1, 0));
        uvb.bufF.Push(new CVec2(0, 0));
        uvb.bufF.Push(new CVec2(0, 1));
        uvb.bufF.Push(new CVec2(1, 1));
        uvb.bufF.Push(new CVec2(0, 0));
        uvb.bufF.Push(new CVec2(1, 0));
        uvb.bufF.Push(new CVec2(1, 1));
        uvb.bufF.Push(new CVec2(0, 1));
        uvb.bufF.Push(new CVec2(1, 0));
        uvb.bufF.Push(new CVec2(0, 0));
        uvb.bufF.Push(new CVec2(0, 1));
        uvb.bufF.Push(new CVec2(1, 1));
        uvb.bufF.Push(new CVec2(0, 0));
        uvb.bufF.Push(new CVec2(1, 0));
        uvb.bufF.Push(new CVec2(1, 1));
        uvb.bufF.Push(new CVec2(0, 1));
        rVal.vertexCount = 24;
        rVal.index.push(3);
        rVal.index.push(2);
        rVal.index.push(1);
        rVal.index.push(1);
        rVal.index.push(0);
        rVal.index.push(3);
        rVal.index.push(11);
        rVal.index.push(10);
        rVal.index.push(9);
        rVal.index.push(9);
        rVal.index.push(8);
        rVal.index.push(11);
        rVal.index.push(22);
        rVal.index.push(23);
        rVal.index.push(20);
        rVal.index.push(20);
        rVal.index.push(21);
        rVal.index.push(22);
        rVal.index.push(6);
        rVal.index.push(7);
        rVal.index.push(4);
        rVal.index.push(4);
        rVal.index.push(5);
        rVal.index.push(6);
        rVal.index.push(6);
        rVal.index.push(7);
        rVal.index.push(4);
        rVal.index.push(17);
        rVal.index.push(16);
        rVal.index.push(19);
        rVal.index.push(19);
        rVal.index.push(18);
        rVal.index.push(17);
        rVal.index.push(12);
        rVal.index.push(13);
        rVal.index.push(14);
        rVal.index.push(14);
        rVal.index.push(15);
        rVal.index.push(12);
        rVal.index.push(6);
        rVal.index.push(7);
        rVal.index.push(3);
        rVal.indexCount = 6 * 7 + 1;
        return rVal;
    }
    static GetSphereUVEach(_size, _count) {
        var rVal = new CMeshCreateInfo();
        if (_count < 4)
            _count = 4;
        var posb = rVal.Create(CVertexFormat.eIdentifier.Position);
        var uvb = rVal.Create(CVertexFormat.eIdentifier.UV);
        var norb = rVal.Create(CVertexFormat.eIdentifier.Normal);
        MakeSphere2(posb.bufF, uvb.bufF, norb.bufF, _size, _count, _count);
        rVal.vertexCount = posb.bufF.Size(3);
        rVal.indexCount = rVal.index.length;
        return rVal;
    }
    static GetSphere(_size, _vCount, _hCount, _vSize, _hSize) {
        var rVal = new CMeshCreateInfo();
        if (_vCount < 4)
            _vCount = 4;
        if (_vCount < _vSize) {
            _vSize = _vCount;
        }
        if (_hCount < 4)
            _hCount = 4;
        if (_hCount < _hSize) {
            _hSize = _hCount;
        }
        var posb = rVal.Create(CVertexFormat.eIdentifier.Position);
        var uvb = rVal.Create(CVertexFormat.eIdentifier.UV);
        var norb = rVal.Create(CVertexFormat.eIdentifier.Normal);
        MakeSphere(posb.bufF, uvb.bufF, norb.bufF, rVal.index, _size, _vCount, _hCount, _vSize, _hSize);
        rVal.vertexCount = posb.bufF.Size(3);
        rVal.indexCount = rVal.index.length;
        return rVal;
    }
    static GetTrail(_count) {
        _count = parseInt(_count + "");
        var rVal = new CMeshCreateInfo();
        var posb = rVal.Create(CVertexFormat.eIdentifier.Position);
        posb.bufF.Resize((2 * (_count + 1)) * 3);
        rVal.vertexCount = 2 * (_count + 1);
        rVal.index = new Array(12 * _count);
        for (var i = 0; i < _count + 1; ++i) {
            posb.bufF.V3(i * 2 + 0, 1 - i / _count, 0, i * 2 + 0);
            posb.bufF.V3(i * 2 + 1, 1 - i / _count, 1, i * 2 + 1);
        }
        for (var i = 0; i < _count - 1; ++i) {
            rVal.index[i * 4 * 3 + 0] = 0 + i * 2;
            rVal.index[i * 4 * 3 + 1] = 1 + i * 2;
            rVal.index[i * 4 * 3 + 2] = 2 + i * 2;
            rVal.index[i * 4 * 3 + 3] = 2 + i * 2;
            rVal.index[i * 4 * 3 + 4] = 3 + i * 2;
            rVal.index[i * 4 * 3 + 5] = 1 + i * 2;
            rVal.index[i * 4 * 3 + 6] = 2 + i * 2;
            rVal.index[i * 4 * 3 + 7] = 1 + i * 2;
            rVal.index[i * 4 * 3 + 8] = 0 + i * 2;
            rVal.index[i * 4 * 3 + 9] = 1 + i * 2;
            rVal.index[i * 4 * 3 + 10] = 3 + i * 2;
            rVal.index[i * 4 * 3 + 11] = 2 + i * 2;
        }
        rVal.indexCount = rVal.index.length;
        return rVal;
    }
    static GetTail(_count) {
        _count = parseInt(_count + "");
        var rVal = new CMeshCreateInfo();
        var posb = rVal.Create(CVertexFormat.eIdentifier.Position);
        posb.bufF.Resize((2 * (_count + 1)) * 3);
        rVal.vertexCount = 2 * (_count + 1);
        rVal.index = new Array(12 * _count);
        for (var i = 0; i < _count + 1; ++i) {
            posb.bufF.V3(i * 2 + 0, 1 - i / _count, 0, i * 2 + 0);
            posb.bufF.V3(i * 2 + 1, 1 - i / _count, 1, i * 2 + 1);
        }
        for (var i = 0; i < _count - 1; ++i) {
            rVal.index[i * 6 + 0] = 0 + i * 2;
            rVal.index[i * 6 + 1] = 1 + i * 2;
            rVal.index[i * 6 + 2] = 2 + i * 2;
            rVal.index[i * 6 + 3] = 2 + i * 2;
            rVal.index[i * 6 + 4] = 3 + i * 2;
            rVal.index[i * 6 + 5] = 1 + i * 2;
        }
        rVal.indexCount = rVal.index.length;
        return rVal;
    }
    static CMeshCreateInfoToInstance(_mci) {
        var nmci = new CMeshCreateInfo();
        let count = (CDevice.GetProperty(CDevice.eProperty.Sam2DWriteX)) / 4;
        for (var each0 of _mci.vertex) {
            var size = each0.bufF.Size(1);
            var buf = nmci.Create(each0.vfType);
            buf.bufF.Resize(size * count);
            each0.bufF.Reserve(size);
            for (var i = 0; i < count; ++i) {
                buf.bufF.GetArray().set(each0.bufF.GetArray(), i * size);
                buf.bufI.concat(each0.bufI);
            }
        }
        var buft = nmci.Create(CVertexFormat.eIdentifier.TexOff);
        buft.bufF.Resize(_mci.vertexCount * count);
        for (var i = 0; i < count; ++i) {
            for (var j = 0; j < _mci.vertexCount; ++j)
                buft.bufF.V1(i * _mci.vertexCount + j, i);
            nmci.index.concat(_mci.index);
        }
        nmci.indexCount = _mci.indexCount * count;
        nmci.vertexCount = _mci.vertexCount * count;
        return nmci;
    }
    static GetTerrain(_count, _size) {
        var count = _count + 1;
        var rVal = new CMeshCreateInfo();
        var posb = rVal.Create(CVertexFormat.eIdentifier.Position);
        var norb = rVal.Create(CVertexFormat.eIdentifier.Normal);
        var uvb = rVal.Create(CVertexFormat.eIdentifier.UV);
        posb.bufF.Resize((count * count) * 3);
        norb.bufF.Resize((count * count) * 3);
        uvb.bufF.Resize((count * count) * 3);
        rVal.vertexCount = count * count;
        var i = 0;
        for (var z = 0; z < count; ++z) {
            for (var x = 0; x < count; ++x) {
                posb.bufF.V3(i, x * _size, 0, z * _size);
                norb.bufF.V3(i, 0, 1, 0);
                uvb.bufF.V2(i, x / (count - 1.0), z / (count - 1.0));
                i++;
            }
        }
        for (var z = 0; z < count - 1; ++z) {
            for (var x = 0; x < count - 1; ++x) {
                rVal.index.push((z + 0) * count + x + 0);
                rVal.index.push((z + 1) * count + x + 0);
                rVal.index.push((z + 0) * count + x + 1);
                rVal.index.push((z + 0) * count + x + 1);
                rVal.index.push((z + 1) * count + x + 0);
                rVal.index.push((z + 1) * count + x + 1);
            }
        }
        rVal.indexCount = rVal.index.length;
        return rVal;
    }
    static RebuildNormals(_ci) {
        const vertex = _ci.GetVFType(CVertexFormat.eIdentifier.Position)[0];
        const normal = _ci.GetVFType(CVertexFormat.eIdentifier.Normal)[0];
        normal.bufF.Resize(vertex.bufF.Size(1));
        for (let i = 0; i < normal.bufF.Size(3); i++) {
            normal.bufF.V3(i, new CVec3());
        }
        const typeMap = new Map();
        for (const meshBuf of _ci.vertex) {
            const elementCount = meshBuf.bufF.Size(1) / vertex.bufF.Size(3);
            typeMap.set(meshBuf.vfType, elementCount);
        }
        const faceCount = _ci.index.length / 3;
        for (let i = 0; i < faceCount; i++) {
            const i0 = _ci.index[i * 3 + 0];
            const i1 = _ci.index[i * 3 + 1];
            const i2 = _ci.index[i * 3 + 2];
            const V0 = vertex.bufF.V3(i0);
            const V1 = vertex.bufF.V3(i1);
            const V2 = vertex.bufF.V3(i2);
            const edge1 = CMath.V3SubV3(V1, V0);
            const edge2 = CMath.V3SubV3(V2, V0);
            const newNor = CMath.V3Nor(CMath.V3Cross(edge1, edge2));
            for (let j = 0; j < 3; ++j) {
                const idx = _ci.index[i * 3 + j];
                const curNor = normal.bufF.V3(idx);
                if (CMath.V3Dot(curNor, newNor) < 0.9 && !curNor.IsZero()) {
                    for (const meshBuf of _ci.vertex) {
                        const type = typeMap.get(meshBuf.vfType);
                        switch (type) {
                            case 2:
                                meshBuf.bufF.Push(meshBuf.bufF.V2(idx));
                                break;
                            case 3:
                                meshBuf.bufF.Push(meshBuf.bufF.V3(idx));
                                break;
                            case 4:
                                meshBuf.bufF.Push(meshBuf.bufF.V4(idx));
                                break;
                            default:
                                meshBuf.bufF.Push(meshBuf.bufF.GetArray());
                                break;
                        }
                    }
                    _ci.index[i * 3 + j] = vertex.bufF.Size(3) - 1;
                }
                normal.bufF.V3(_ci.index[i * 3 + j], newNor);
            }
        }
        CUtilRender.VertexToNormalReCac(vertex.bufF, normal.bufF, _ci.index);
        _ci.vertexCount = vertex.bufF.Size(3);
        _ci.indexCount = _ci.index.length;
    }
}
;

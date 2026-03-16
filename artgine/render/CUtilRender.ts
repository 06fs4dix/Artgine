import { CAlert } from "../basic/CAlert.js";
import { CConsol } from "../basic/CConsol.js";
import { CTree } from "../basic/CTree.js";
import { CBound } from "../geometry/CBound.js";
import { CFloat32Mgr } from "../geometry/CFloat32Mgr.js";
import { CMat } from "../geometry/CMat.js";
import { CMath } from "../geometry/CMath.js";
import { CPoolGeo } from "../geometry/CPoolGeo.js";
import { CVec2 } from "../geometry/CVec2.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CDevice } from "./CDevice.js";
import { CMesh } from "./CMesh.js";
import { CMeshCopyNode } from "./CMeshCopyNode.js";
import { CMeshCreateInfo, CMeshBuf } from "./CMeshCreateInfo.js";
import { CMeshDataNode } from "./CMeshDataNode.js";
import { CMeshPaint } from "./CMeshPaint.js";
import { CMeshTreeUpdate } from "./CMeshTreeUpdate.js";
import { CVertexFormat } from "./CShader.js";
import { CTexture } from "./CTexture.js";



const g_fEpsilon = 0.0001;

class s_FACE {
	public Tface: Array<CVec2>;
	public Cindex: Array<number>;
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
				// _nv.Push(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))));
				// _nv.Push(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))));
				// _nv.Push(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))));
				// _nv.Push(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))));
				// _nv.Push(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))));
				// _nv.Push(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))));

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
				// _nv.Push(arr);
				// _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy4, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy8, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5))));
				// _nv.Push(arr);
				// _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy4, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy8, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5))));
				// _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy4, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy8, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5))));
				// _nv.Push(arr);

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
					// _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy12, dummy9)), (CMath.V3SubV3(dummy10, dummy9)))))), 0.5))));
					// _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy8, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5))));
					// _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy12, dummy9)), (CMath.V3SubV3(dummy10, dummy9)))))), 0.5))));
					// _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy8, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5))));
					// _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy8, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5))));
					// _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy12, dummy9)), (CMath.V3SubV3(dummy10, dummy9)))))), 0.5))));

					_nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy12, dummy9)), (CMath.V3SubV3(dummy10, dummy9)))))), 0.5), -1))));
					_nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy8, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5), -1))));
					_nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy12, dummy9)), (CMath.V3SubV3(dummy10, dummy9)))))), 0.5), -1))));
					_nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy8, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5), -1))));
					_nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy8, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5), -1))));
					_nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy12, dummy9)), (CMath.V3SubV3(dummy10, dummy9)))))), 0.5), -1))));

				}
				else {
					// _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy11, dummy9)), (CMath.V3SubV3(dummy10, dummy9)))))), 0.5))));
					// _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy7, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5))));
					// _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy11, dummy9)), (CMath.V3SubV3(dummy10, dummy9)))))), 0.5))));
					// _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy7, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5))));
					// _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy7, dummy5)), (CMath.V3SubV3(dummy6, dummy5)))))), 0.5))));
					// _nv.Push((CMath.V3Nor(CMath.V3MulFloat(CMath.V3AddV3(CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy3, dummy1)), (CMath.V3SubV3(dummy2, dummy1)))), (CMath.V3Nor(CMath.V3Cross((CMath.V3SubV3(dummy11, dummy9)), (CMath.V3SubV3(dummy10, dummy9)))))), 0.5))));

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

function MakeSphere(_vec: CFloat32Mgr, _uv: CFloat32Mgr, _nv: CFloat32Mgr, _index: number[],
	_radius: CVec3, _xSegments: number, _ySegments: number, _xTargetSegment: number, _yTargetSegment: number) {
	let PI = 3.14159265359;
	for (let x = 0; x <= _xTargetSegment; x++) {
		for (let y = 0; y <= _yTargetSegment; y++) {
			let xSegment: number = x / _xSegments;
			let ySegment: number = y / _ySegments;

			let xPos: number = Math.cos(xSegment * 2.0 * PI) * Math.sin(ySegment * PI);
			let yPos: number = Math.cos(ySegment * PI);
			let zPos: number = Math.sin(xSegment * 2.0 * PI) * Math.sin(ySegment * PI);

			_vec.Push(new CVec3(xPos * _radius.x, yPos * _radius.y, zPos * _radius.z));
			_uv.Push(new CVec2(xSegment, ySegment));
			_nv.Push(CMath.V3Nor(new CVec3(xPos * _radius.x, yPos * _radius.y, zPos * _radius.z)));
		}
	}

	//한쪽 면
	let oddRow: boolean = false;
	let stripIndex: number[] = [];
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

	//strip index to index
	oddRow = false;
	for (let i = 2; i < stripIndex.length; i++) {
		if (i % 2 == 1) {
			_index.push(stripIndex[i]);
			_index.push(stripIndex[i - 1]);
			_index.push(stripIndex[i - 2]);
		} else {
			_index.push(stripIndex[i - 2]);
			_index.push(stripIndex[i - 1]);
			_index.push(stripIndex[i]);
		}
	}
}

export class CUtilRender 
{
	static Mesh2DSize = 10;
	static FrameToMili(_frame: number): number {
		return parseInt(((_frame / 30.0) * 1000) + "");
	}


	//2제곱 만들때 사용
	static CloseToExp(fInput, fExponent = 2)//2제곱근이니까 2
	{
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
	static VertexToNormalReCac(_vertex: CFloat32Mgr, _normal: CFloat32Mgr, _index: Array<number>) {

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



		}//for
		for (var each0Key of nMap.keys()) {
			var each0 = nMap.get(each0Key);
			var nv = new CVec3();
			for (var i = 0; i < each0.length; ++i) {
				nv = CMath.V3AddV3(nv, each0[i]);
			}
			//each0.push(CMath.V3Nor(nv));
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
	static UvIndexToVertexIndexBefore(pa_po_vertex, pa_po_uv, pa_po_normal, pa_po_weight, pa_po_weightIndex,
		RF_index, RF_Tface) {
		var L_vertexNum = pa_po_vertex.Size(3);
		var L_indexNum = RF_index.length / 3;

		//1. 버텍스와 인덱스를 복사해둔다
		//d_VEC_VEC3 L_aVer;
		var L_aUv = new CFloat32Mgr();

		//오지지날 인덱스를 만들어서 절대영역을 만들어 둔다

		var L_aIn = new Array();
		//L_aIn.resize(L_indexNum * 3);
		for (var i = 0; i < L_indexNum * 3; ++i) {
			L_aIn.push(RF_index[i]);
		}

		var L_list = new Array();
		for (var i = 0; i < L_vertexNum; ++i) {
			L_list.push(new s_FACE());
		}
		//L_list.resize(L_vertexNum);

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
			//======================================================
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
			//======================================================
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
		//delete [] mpar_uv;

		L_vertexNum = pa_po_vertex.Size(3);
		var L_uv = new CFloat32Mgr();
		L_uv.Resize(L_vertexNum * 2);





		if (pa_po_vertex.Empty())
			CAlert.E("체크코드");
		var L_nor = new CFloat32Mgr();;
		var L_we = new CFloat32Mgr();;
		var L_weI = new CFloat32Mgr();;
		var L_ref = new CFloat32Mgr();;

		var L_copy = [false, false, false];//0노말
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
	//인덱스에 T페이스가 다르다는 것은 새로운 정점을 만들어야 한다는 의미다.
	//텍스쳐 좌표를 공유할수 없다는 의미
	static UvIndexToVertexIndex(pa_po_vertex: CFloat32Mgr, pa_po_uv: Array<CMeshBuf>, pa_po_weight: CFloat32Mgr,
		pa_po_weightIndex: CFloat32Mgr, pa_po_texOff: CFloat32Mgr, RF_index: Array<number>) {

		var L_indexNum = RF_index.length / 3;

		var nv = new CFloat32Mgr();
		var nu = new Array<CMeshBuf>();
		//var nn=new CFloatArray();
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

					//nn.Push(newNor);
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
		pa_po_uv

		//pa_po_normal.Swap(nn);
		pa_po_weight.Swap(nw);
		pa_po_weightIndex.Swap(nwi);
		pa_po_texOff.Swap(nto);


		for (var i = 0; i < RF_index.length; ++i) {
			RF_index[i] = ni[i];
		}



	}



	// static TwoVec3DirAngle(pa_vec1,pa_vec2)
	// {
	// 	var radian=0;
	// 	pa_vec1 = CMath.V3Nor(pa_vec1);
	// 	pa_vec2 = CMath.V3Nor(pa_vec2);

	// 	var L_cro = CMath.V3Cross(pa_vec1, pa_vec2);
	// 	radian = Math.acos(CMath.V3Dot(pa_vec2, pa_vec1));
	// 	var dir = L_cro.x + L_cro.y + L_cro.z;
	// 	if (dir < 0)
	// 		radian = -radian;
	// 	return radian;
	// }
	//GPT
	// static TangentCalculate(pa_verArr, pa_norArr, pa_uvArr, pa_index, pa_out) {
	// 	const vcount = pa_verArr.Size(3);
	// 	const tan1: CVec3[] = new Array(vcount);
	// 	const tan2: CVec3[] = new Array(vcount);
	// 	for (let i = 0; i < vcount; ++i) { tan1[i] = new CVec3(0, 0, 0); tan2[i] = new CVec3(0, 0, 0); }

	// 	// 1) 면별 누적 (UV 퇴화 방어)
	// 	for (let a = 0; a < pa_index.length; a += 3) {
	// 		const i0 = pa_index[a + 0], i1 = pa_index[a + 1], i2 = pa_index[a + 2];

	// 		const p0 = pa_verArr.V3(i0), p1 = pa_verArr.V3(i1), p2 = pa_verArr.V3(i2);
	// 		const e1 = CMath.V3SubV3(p1, p0);
	// 		const e2 = CMath.V3SubV3(p2, p0);

	// 		const uv0 = pa_uvArr.V2(i0), uv1 = pa_uvArr.V2(i1), uv2 = pa_uvArr.V2(i2);
	// 		const du1 = uv1.x - uv0.x, dv1 = uv1.y - uv0.y;
	// 		const du2 = uv2.x - uv0.x, dv2 = uv2.y - uv0.y;

	// 		const det = du1 * dv2 - du2 * dv1;
	// 		if (Math.abs(det) < 1e-20) continue;

	// 		const r = 1.0 / det;
	// 		const sdir = new CVec3(
	// 			(dv2 * e1.x - dv1 * e2.x) * r,
	// 			(dv2 * e1.y - dv1 * e2.y) * r,
	// 			(dv2 * e1.z - dv1 * e2.z) * r
	// 		);
	// 		const tdir = new CVec3(
	// 			(du1 * e2.x - du2 * e1.x) * r,
	// 			(du1 * e2.y - du2 * e1.y) * r,
	// 			(du1 * e2.z - du2 * e1.z) * r
	// 		);

	// 		tan1[i0] = CMath.V3AddV3(tan1[i0], sdir);
	// 		tan1[i1] = CMath.V3AddV3(tan1[i1], sdir);
	// 		tan1[i2] = CMath.V3AddV3(tan1[i2], sdir);

	// 		tan2[i0] = CMath.V3AddV3(tan2[i0], tdir);
	// 		tan2[i1] = CMath.V3AddV3(tan2[i1], tdir);
	// 		tan2[i2] = CMath.V3AddV3(tan2[i2], tdir);
	// 	}

	// 	// 2) 정점별 직교화 + handedness
	// 	for (let i = 0; i < vcount; ++i) {
	// 		const n = pa_norArr.V3(i);                 // 이미 정규화되어 있다고 가정
	// 		let t = tan1[i];

	// 		// Gram–Schmidt: t = normalize( t - n * dot(n, t) )
	// 		const ndotT = CMath.V3Dot(n, t);
	// 		t = CMath.V3SubV3(t, CMath.V3MulFloat(n, ndotT));
	// 		t = CMath.V3Nor(t);

	// 		// handedness (좌/우손계 보정)
	// 		const w = (CMath.V3Dot(CMath.V3Cross(n, t), tan2[i]) < 0.0) ? -1.0 : 1.0;

	// 		pa_out.V4(i, t.x, t.y, t.z, w);
	// 	}
	// }

	// static TangentCalculate(pa_verArr,pa_norArr,pa_uvArr,pa_index,pa_out)
	// {
	// 	var tan1=new Array();
	// 	var tan2=new Array();
	// 	for(var i=0;i< pa_verArr.Size(3);++i)
	// 	{
	// 		tan1[i]=new CVec3(); 
	// 		tan2[i]=new CVec3();
	// 	}
		
		
	// 	for (var a = 0; a < pa_index.length; a+=3)
	// 	{
	// 		var i0 = pa_index[a+0];//pa_index->i0;
	// 		var i1 = pa_index[a+1];//pa_index->i1;
	// 		var i2 = pa_index[a+2];//pa_index->i2;
	
	// 		var v1 = CMath.V3SubV3(pa_verArr.V3(i1), pa_verArr.V3(i0));
	// 		var v2 = CMath.V3SubV3(pa_verArr.V3(i2), pa_verArr.V3(i0));
	
	// 		var uv1 = CMath.Vec2MinusVec2(pa_uvArr.V2(i1), pa_uvArr.V2(i0));
	// 		var uv2 = CMath.Vec2MinusVec2(pa_uvArr.V2(i2), pa_uvArr.V2(i0));
	
	
	// 		var r = 1.0 / (uv1.x * uv2.y - uv2.x * uv1.y);
	// 		var sdir=new CVec3((uv2.y * v1.x - uv1.y * v2.x) * r, (uv2.y * v1.y - uv1.y * v2.y) * r,
	// 			(uv2.y * v1.z - uv1.y * v2.z) * r);
	// 		var tdir=new CVec3((uv1.x * v2.x - uv2.x * v1.x) * r, (uv1.x * v2.y - uv2.x * v1.y) * r,
	// 			(uv1.x * v2.z - uv2.x * v1.z) * r);
	
	// 		tan1[i0] = CMath.V3AddV3(tan1[i0], sdir);
	// 		tan1[i1] = CMath.V3AddV3(tan1[i1], sdir);
	// 		tan1[i2] = CMath.V3AddV3(tan1[i2], sdir);
	
	// 		tan2[i0] = CMath.V3AddV3(tan2[i0], tdir);
	// 		tan2[i1] = CMath.V3AddV3(tan2[i1], tdir);
	// 		tan2[i2] = CMath.V3AddV3(tan2[i2], tdir);
	
	
	// 	}
	
	// 	for (var a = 0; a < pa_verArr.Size(3); a++)
	// 	{
	// 		var n = pa_norArr.V3(a);
	// 		var t = tan1[a];
	// 		var t2 = CMath.V3Nor(tan1[a]);
	// 		pa_out.V4(a, t2.x, t2.y, t2.z, 1);
			
	// 		//var xyz = CMath.V3Nor(CMath.V3MulFloat(CMath.V3SubV3(t, n), CMath.V3Dot(n, t)));
	
	
	// 		// Calculate handedness 이게 손좌표계인거 같은데 
	// 		//var w = (CMath.V3Dot(CMath.V3Cross(n, t), tan2[a]) < 0.0) ? -1.0 : 1.0;
	// 		//pa_out.V4(a, xyz.x, xyz.y, xyz.z, w);
	// 		//pa_out[a].w = (Vec3_Dot(Vec3_Cross_Outer(n, t), tan2[a]) < 0.0F) ? 1.0F : -1.0F;
	// 	}
	// }

	static TangentCalculate(pa_verArr, pa_norArr, pa_uvArr, pa_index, pa_out)
	{
		var tan1 = new Array();
		var tan2 = new Array();
		for (var i = 0; i < pa_verArr.Size(3); ++i) {
			tan1[i] = new CVec3();
			tan2[i] = new CVec3();
		}

		for (var a = 0; a < pa_index.length; a += 3)
		{
			var i0 = pa_index[a + 0];
			var i1 = pa_index[a + 1];
			var i2 = pa_index[a + 2];

			var v1 = CMath.V3SubV3(pa_verArr.V3(i1), pa_verArr.V3(i0));
			var v2 = CMath.V3SubV3(pa_verArr.V3(i2), pa_verArr.V3(i0));

			var uv1 = CMath.Vec2MinusVec2(pa_uvArr.V2(i1), pa_uvArr.V2(i0));
			var uv2 = CMath.Vec2MinusVec2(pa_uvArr.V2(i2), pa_uvArr.V2(i0));

			var denom = (uv1.x * uv2.y - uv2.x * uv1.y);
			if (Math.abs(denom) < 1e-20) // UV 퇴화 삼각형 방어
				continue;

			var r = 1.0 / denom;

			var sdir = new CVec3(
				(uv2.y * v1.x - uv1.y * v2.x) * r,
				(uv2.y * v1.y - uv1.y * v2.y) * r,
				(uv2.y * v1.z - uv1.y * v2.z) * r
			);

			var tdir = new CVec3(
				(uv1.x * v2.x - uv2.x * v1.x) * r,
				(uv1.x * v2.y - uv2.x * v1.y) * r,
				(uv1.x * v2.z - uv2.x * v1.z) * r
			);

			tan1[i0] = CMath.V3AddV3(tan1[i0], sdir);
			tan1[i1] = CMath.V3AddV3(tan1[i1], sdir);
			tan1[i2] = CMath.V3AddV3(tan1[i2], sdir);

			tan2[i0] = CMath.V3AddV3(tan2[i0], tdir);
			tan2[i1] = CMath.V3AddV3(tan2[i1], tdir);
			tan2[i2] = CMath.V3AddV3(tan2[i2], tdir);
		}

		for (var a = 0; a < pa_verArr.Size(3); a++)
		{
			// N
			var n = CMath.V3Nor(pa_norArr.V3(a));

			// T (tan1 기반) -> N에 대해 직교화
			var t = tan1[a];
			// t = t - n * dot(n,t)
			t = CMath.V3SubV3(t, CMath.V3MulFloat(n, CMath.V3Dot(n, t)));

			var tLen = CMath.V3Len(t);
			if (tLen < 1e-10) {
				// 완전 퇴화 시 임의 탄젠트 생성(안정용)
				var up = (Math.abs(n.z) < 0.999) ? new CVec3(0,0,1) : new CVec3(0,1,0);
				t = CMath.V3Nor(CMath.V3Cross(up, n));
			} else {
				t = CMath.V3MulFloat(t, 1.0 / tLen);
			}

			// handedness(w): cross(N,T)와 tan2의 방향으로 결정
			var c = CMath.V3Cross(n, t);
			var w = (CMath.V3Dot(c, tan2[a]) < 0.0) ? -1.0 : 1.0;

			pa_out.V4(a, t.x, t.y, t.z, w);
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
		L_ver.push(new CVec3()); L_ver.push(new CVec3());
		L_ver.push(new CVec3());
		for (var y = 0; y < _size; ++y) {
			for (var x = 0; x < _size; ++x) {
				L_sum.x = 0; L_sum.y = 0; L_sum.z = 0;
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

	// static GetListener(_member : Array<string>) : any
	// {
	// 	if(_member.length==0)	return this;
	// 	var t=this;

	// 	for(var i=0;i<_member.length;++i)
	// 	{
	// 		if(_member[i].indexOf("(")!=-1)
	// 		{
	// 			var fun=CString.FunctionAnalyze(_member[i]);
	// 			if(t[fun.function]!=null)
	// 			{
	// 				t=FunctionFinder.Find(fun.function,fun.parameter,t);
	// 				if(t instanceof Array && t.length==1)	t=t[0];
	// 			}
	// 		}
	// 		else
	// 			t=t[_member[i]];
	// 		if(t==null)	break;
	// 	}

	// 	return t;
	// }

	//rot mat이 맞다고 가정하고 검사는 안했음
	// static MatToEuler(_mat : CMat, _pa_vec3 : CVec3 = null) : CVec3 {
	// 	let sy : number = Math.sqrt(_mat.arr[0] * _mat.arr[0] + _mat.arr[1] * _mat.arr[1]);
	// 	//0이어야 하는데 혹시 몰라서 이렇게 해둠
	// 	let singular : boolean = sy < 1e-6;

	// 	let euler = _pa_vec3;
	// 	if(euler == null) {
	// 		euler = new CVec3();
	// 	}
	// 	if(!singular) {
	// 		euler.x = Math.atan2(_mat.arr[6], _mat.arr[10]);
	// 		euler.y = Math.atan2(-_mat.arr[2], sy);
	// 		euler.z = Math.atan2(_mat.arr[1], _mat.arr[0]);
	// 	} else {
	// 		euler.x = Math.atan2(-_mat.arr[5], _mat.arr[5]);
	// 		euler.y = Math.atan2(-_mat.arr[2], sy);
	// 		euler.z = 0;
	// 	}

	// 	return euler;
	// }

	//==============================================
	//dir,size
	static GetPlane(_plane: CVec4, _uv: CVec2 = new CVec2(1, 1)) {
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
		rVal.bound.InitBound(mdir);
		rVal.bound.InitBound(mcro);
		rVal.bound.InitBound(dir);
		rVal.bound.InitBound(cro);
		// posb.bufF.Push(mdir);
		// posb.bufF.Push(dir);

		var uv =
			[
				//new CVec2(0,_uv.y),new CVec2(_uv.x,_uv.y) ,new CVec2(_uv.x,0),
				//new CVec2(0,0),new CVec2(0,_uv.y) ,new CVec2(_uv.x,0)

				// new CVec2(0,_uv.y),new CVec2(_uv.x,_uv.y) ,new CVec2(_uv.x,0),
				// 	new CVec2(0,0),new CVec2(0,_uv.y) ,new CVec2(_uv.x,0)
				new CVec2(0, 0), new CVec2(_uv.x, 0), new CVec2(_uv.x, _uv.y),
				new CVec2(0, _uv.y), new CVec2(0, 0), new CVec2(_uv.x, _uv.y)
			];

		var uvb = rVal.Create(CVertexFormat.eIdentifier.UV);
		uvb.bufF.Push(uv[0]);
		uvb.bufF.Push(uv[1]);
		uvb.bufF.Push(uv[2]);
		uvb.bufF.Push(uv[3]);
		// uvb.bufF.Push(uv[4]);
		// uvb.bufF.Push(uv[5]);


		var norb = rVal.Create(CVertexFormat.eIdentifier.Normal);
		norb.bufF.Push(nor);
		norb.bufF.Push(nor);
		norb.bufF.Push(nor);
		norb.bufF.Push(nor);
		// norb.bufF.Push(nor);
		// norb.bufF.Push(nor);

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

	// static GetGrass()
	// {
	// 	var plane : CVec4=new CVec4(0,0,1,100);
	// 	var rVal=new CMeshCreateInfo();
	// 	var nor = plane.xyz;
	// 	var posb=rVal.Create(CVertexFormat.eIdentifier.Position);

	// 	var dir=new CVec3();
	// 	dir.x =1- CMath.Abs(plane.x);
	// 	dir.y = 1 - CMath.Abs(plane.y);
	// 	dir.z = 1 - CMath.Abs(plane.z);

	// 	var  mdir = CMath.V3MulFloat(dir,-1);
	// 	var  cro = CMath.V3Cross(nor,dir);
	// 	var  mcro = CMath.V3MulFloat(cro, -1);


	// 	mdir = CMath.V3MulFloat(mdir, plane.w);
	// 	cro = CMath.V3MulFloat(cro, plane.w);
	// 	mcro = CMath.V3MulFloat(mcro, plane.w);
	// 	dir = CMath.V3MulFloat(dir, plane.w);

	// 	posb.bufF.Push(mdir);
	// 	posb.bufF.Push(mcro);
	// 	posb.bufF.Push(dir);
	// 	posb.bufF.Push(cro);
	// 	posb.bufF.Push(mdir);
	// 	posb.bufF.Push(dir);





	// 	var uv = 
	// 	[
	// 		// new CVec2(0,1),new CVec2(1,1) ,new CVec2(1,0),
	// 		// new CVec2(0,0),new CVec2(0,1) ,new CVec2(1,0)
	// 		new CVec2(0,0),new CVec2(1,0) ,new CVec2(1,1),
	// 		new CVec2(0,1),new CVec2(0,0) ,new CVec2(1,1)
	// 	];

	// 	var uvb=rVal.Create(CVertexFormat.eIdentifier.UV);
	// 	uvb.bufF.Push(uv[0]);
	// 	uvb.bufF.Push(uv[1]);
	// 	uvb.bufF.Push(uv[2]);
	// 	uvb.bufF.Push(uv[3]);
	// 	uvb.bufF.Push(uv[4]);
	// 	uvb.bufF.Push(uv[5]);


	// 	var norb=rVal.Create(CVertexFormat.eIdentifier.Normal);
	// 	norb.bufF.Push(nor);
	// 	norb.bufF.Push(nor);
	// 	norb.bufF.Push(nor);
	// 	norb.bufF.Push(nor);
	// 	norb.bufF.Push(nor);
	// 	norb.bufF.Push(nor);

	// 	//rVal.vertexCount = 6;

	// 	var web=rVal.Create(CVertexFormat.eIdentifier.Weight);
	// 	web.bufF.Push(new CVec4(0,0,0,0));
	// 	web.bufF.Push(new CVec4(0,0,0,0));
	// 	web.bufF.Push(new CVec4(1,0,0,0));
	// 	web.bufF.Push(new CVec4(1,0,0,0));
	// 	web.bufF.Push(new CVec4(0,0,0,0));
	// 	web.bufF.Push(new CVec4(1,0,0,0));

	// 	var wib=rVal.Create(CVertexFormat.eIdentifier.WeightIndex);
	// 	wib.bufF.Push(new CVec4(0,0,0,0));
	// 	wib.bufF.Push(new CVec4(0,0,0,0));
	// 	wib.bufF.Push(new CVec4(0,0,0,0));
	// 	wib.bufF.Push(new CVec4(0,0,0,0));
	// 	wib.bufF.Push(new CVec4(0,0,0,0));
	// 	wib.bufF.Push(new CVec4(0,0,0,0));



	// 	plane=new CVec4(0,0,-1,100);
	// 	nor = plane.xyz;

	// 	dir=new CVec3();
	// 	dir.x =1- CMath.Abs(plane.x);
	// 	dir.y = 1 - CMath.Abs(plane.y);
	// 	dir.z = 1 - CMath.Abs(plane.z);

	// 	mdir = CMath.V3MulFloat(dir,-1);
	// 	cro = CMath.V3Cross(nor,dir);
	// 	mcro = CMath.V3MulFloat(cro, -1);

	// 	mdir = CMath.V3MulFloat(mdir, plane.w);
	//     cro = CMath.V3MulFloat(cro, plane.w);
	//     mcro = CMath.V3MulFloat(mcro, plane.w);
	//     dir = CMath.V3MulFloat(dir, plane.w);


	// 	posb.bufF.Push(mdir);
	// 	posb.bufF.Push(mcro);
	// 	posb.bufF.Push(dir);
	// 	posb.bufF.Push(cro);
	// 	posb.bufF.Push(mdir);
	// 	posb.bufF.Push(dir);



	// // uv = 
	// // [
	// // 	new CVec2(1,1),new CVec2(0,1) ,new CVec2(0,0),
	// // 	new CVec2(1,0),new CVec2(1,1) ,new CVec2(0,0)
	// // ];
	// uv = 
	// [
	// 	new CVec2(0,1),new CVec2(0,0) ,new CVec2(1,0),
	// 	new CVec2(1,1),new CVec2(0,1) ,new CVec2(1,0)
	// ];




	// 	uvb.bufF.Push(uv[0]);
	// 	uvb.bufF.Push(uv[1]);
	// 	uvb.bufF.Push(uv[2]);
	// 	uvb.bufF.Push(uv[3]);
	// 	uvb.bufF.Push(uv[4]);
	// 	uvb.bufF.Push(uv[5]);


	// 	norb.bufF.Push(nor);
	// 	norb.bufF.Push(nor);
	// 	norb.bufF.Push(nor);
	// 	norb.bufF.Push(nor);
	// 	norb.bufF.Push(nor);
	// 	norb.bufF.Push(nor);



	// 	web.bufF.Push(new CVec4(0,0,0,0));
	// 	web.bufF.Push(new CVec4(1,0,0,0));
	// 	web.bufF.Push(new CVec4(1,0,0,0));
	// 	web.bufF.Push(new CVec4(0,0,0,0));
	// 	web.bufF.Push(new CVec4(0,0,0,0));
	// 	web.bufF.Push(new CVec4(1,0,0,0));

	// 	wib.bufF.Push(new CVec4(0,0,0,0));
	// 	wib.bufF.Push(new CVec4(0,0,0,0));
	// 	wib.bufF.Push(new CVec4(0,0,0,0));
	// 	wib.bufF.Push(new CVec4(0,0,0,0));
	// 	wib.bufF.Push(new CVec4(0,0,0,0));
	// 	wib.bufF.Push(new CVec4(0,0,0,0));


	// 	rVal.vertexCount = 12;

	// 	return rVal;
	// }

	static CMeshCreateInfoToCMesh(_mci: CMeshCreateInfo, _texture: string) {
		let mesh = new CMesh();
		mesh.meshTree.mData = new CMeshDataNode();
		mesh.meshTree.mData.ci = new CMeshCreateInfo;
		mesh.meshTree.mData.ci = _mci;
		mesh.texture.push(_texture);
		mesh.meshTree.mData.textureOff.push(0);
		mesh.meshTree.mData.textureOff.push(1);
		mesh.meshTree.mData.textureOff.push(2);
		//CFramework.MMgr().MeshCreateModify(mesh, CPalette.GetVfSimple());
		return mesh;
	}
	static GetDevBox(_size, _normalCenter = true) {
		var rVal = new CMeshCreateInfo();
		var posb = rVal.Create(CVertexFormat.eIdentifier.Position);
		var uvb = rVal.Create(CVertexFormat.eIdentifier.UV);
		var norb = rVal.Create(CVertexFormat.eIdentifier.Normal);
		var texb = rVal.Create(CVertexFormat.eIdentifier.TexOff);

		posb.bufF.Push(new CVec3(-_size, _size, -_size));
		posb.bufF.Push(new CVec3(_size, _size, -_size));
		posb.bufF.Push(new CVec3(_size, _size, _size));
		posb.bufF.Push(new CVec3(-_size, _size, _size));


		posb.bufF.Push(new CVec3(-_size, -_size, -_size));//4
		posb.bufF.Push(new CVec3(_size, -_size, -_size));
		posb.bufF.Push(new CVec3(_size, -_size, _size));
		posb.bufF.Push(new CVec3(-_size, -_size, _size));


		posb.bufF.Push(new CVec3(-_size, -_size, _size));//8
		posb.bufF.Push(new CVec3(-_size, -_size, -_size));
		posb.bufF.Push(new CVec3(-_size, _size, -_size));
		posb.bufF.Push(new CVec3(-_size, _size, _size));


		posb.bufF.Push(new CVec3(_size, -_size, _size));//12
		posb.bufF.Push(new CVec3(_size, -_size, -_size));
		posb.bufF.Push(new CVec3(_size, _size, -_size));
		posb.bufF.Push(new CVec3(_size, _size, _size));

		posb.bufF.Push(new CVec3(-_size, -_size, -_size));//16
		posb.bufF.Push(new CVec3(_size, -_size, -_size));
		posb.bufF.Push(new CVec3(_size, _size, -_size));
		posb.bufF.Push(new CVec3(-_size, _size, -_size));

		posb.bufF.Push(new CVec3(-_size, -_size, _size));//20
		posb.bufF.Push(new CVec3(_size, -_size, _size));
		posb.bufF.Push(new CVec3(_size, _size, _size));
		posb.bufF.Push(new CVec3(-_size, _size, _size));




		for (var i = 0; i < posb.bufF.Size(3); ++i) 
		{
			rVal.bound.InitBound(posb.bufF.V3(i));
			norb.bufF.Push(CMath.V3Nor(posb.bufF.V3(i)));
			texb.bufF.Push(new CVec3(0, 1, 2));
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



		// uvb.bufF.Push(new CVec2(0, 0));
		// uvb.bufF.Push(new CVec2(1, 0));
		// uvb.bufF.Push(new CVec2(1, 1));
		// uvb.bufF.Push(new CVec2(0, 1));

		// uvb.bufF.Push(new CVec2(0, 1));
		// uvb.bufF.Push(new CVec2(1, 1));
		// uvb.bufF.Push(new CVec2(1, 0));
		// uvb.bufF.Push(new CVec2(0, 0));

		// uvb.bufF.Push(new CVec2(1, 1));
		// uvb.bufF.Push(new CVec2(0, 1));
		// uvb.bufF.Push(new CVec2(0, 0));
		// uvb.bufF.Push(new CVec2(1, 0));

		// uvb.bufF.Push(new CVec2(0, 1));
		// uvb.bufF.Push(new CVec2(1, 1));
		// uvb.bufF.Push(new CVec2(1, 0));
		// uvb.bufF.Push(new CVec2(0, 0));

		// uvb.bufF.Push(new CVec2(1, 1));
		// uvb.bufF.Push(new CVec2(0, 1));
		// uvb.bufF.Push(new CVec2(0, 0));
		// uvb.bufF.Push(new CVec2(1, 0));

		// uvb.bufF.Push(new CVec2(0, 1));
		// uvb.bufF.Push(new CVec2(1, 1));
		// uvb.bufF.Push(new CVec2(1, 0));
		// uvb.bufF.Push(new CVec2(0, 0));

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

		rVal.index.push(1);//top
		rVal.index.push(0);
		rVal.index.push(3);



		rVal.index.push(11);
		rVal.index.push(10);
		rVal.index.push(9);

		rVal.index.push(9);//front
		rVal.index.push(8);
		rVal.index.push(11);

		rVal.index.push(22);//left
		rVal.index.push(23);
		rVal.index.push(20);


		rVal.index.push(20);
		rVal.index.push(21);
		rVal.index.push(22);


		rVal.index.push(6);
		rVal.index.push(7);
		rVal.index.push(4);



		//
		rVal.index.push(4);//bottom
		rVal.index.push(5);
		rVal.index.push(6);

		rVal.index.push(6);
		rVal.index.push(7);
		rVal.index.push(4);

		rVal.index.push(17);//
		rVal.index.push(16);
		rVal.index.push(19);

		rVal.index.push(19);
		rVal.index.push(18);
		rVal.index.push(17);


		rVal.index.push(12);//back
		rVal.index.push(13);
		rVal.index.push(14);


		rVal.index.push(14);
		rVal.index.push(15);
		rVal.index.push(12);

		rVal.index.push(6);
		rVal.index.push(7);
		rVal.index.push(3);
		// rVal.index.push(6);
		// rVal.index.push(2);
		// rVal.index.push(3);











		rVal.indexCount = 6 * 7 + 1;

		return rVal;
	}
	static GetBox(_size, _normalCenter = true) {
		var rVal = new CMeshCreateInfo();
		var posb = rVal.Create(CVertexFormat.eIdentifier.Position);
		var uvb = rVal.Create(CVertexFormat.eIdentifier.UV);
		var norb = rVal.Create(CVertexFormat.eIdentifier.Normal);
		var texb = rVal.Create(CVertexFormat.eIdentifier.TexOff);

		posb.bufF.Push(new CVec3(-_size, _size, -_size));
		posb.bufF.Push(new CVec3(_size, _size, -_size));
		posb.bufF.Push(new CVec3(_size, _size, _size));
		posb.bufF.Push(new CVec3(-_size, _size, _size));


		posb.bufF.Push(new CVec3(-_size, -_size, -_size));//4
		posb.bufF.Push(new CVec3(_size, -_size, -_size));
		posb.bufF.Push(new CVec3(_size, -_size, _size));
		posb.bufF.Push(new CVec3(-_size, -_size, _size));


		posb.bufF.Push(new CVec3(-_size, -_size, _size));//8
		posb.bufF.Push(new CVec3(-_size, -_size, -_size));
		posb.bufF.Push(new CVec3(-_size, _size, -_size));
		posb.bufF.Push(new CVec3(-_size, _size, _size));


		posb.bufF.Push(new CVec3(_size, -_size, _size));//12
		posb.bufF.Push(new CVec3(_size, -_size, -_size));
		posb.bufF.Push(new CVec3(_size, _size, -_size));
		posb.bufF.Push(new CVec3(_size, _size, _size));

		posb.bufF.Push(new CVec3(-_size, -_size, -_size));//16
		posb.bufF.Push(new CVec3(_size, -_size, -_size));
		posb.bufF.Push(new CVec3(_size, _size, -_size));
		posb.bufF.Push(new CVec3(-_size, _size, -_size));

		posb.bufF.Push(new CVec3(-_size, -_size, _size));//20
		posb.bufF.Push(new CVec3(_size, -_size, _size));
		posb.bufF.Push(new CVec3(_size, _size, _size));
		posb.bufF.Push(new CVec3(-_size, _size, _size));




		for (var i = 0; i < posb.bufF.Size(3); ++i) 
		{
			rVal.bound.InitBound(posb.bufF.V3(i));
			norb.bufF.Push(CMath.V3Nor(posb.bufF.V3(i)));
			texb.bufF.Push(new CVec3(0, 1, 2));
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

		rVal.index.push(1);//top
		rVal.index.push(0);
		rVal.index.push(3);



		rVal.index.push(11);
		rVal.index.push(10);
		rVal.index.push(9);

		rVal.index.push(9);//front
		rVal.index.push(8);
		rVal.index.push(11);

		rVal.index.push(22);//left
		rVal.index.push(23);
		rVal.index.push(20);


		rVal.index.push(20);
		rVal.index.push(21);
		rVal.index.push(22);


		rVal.index.push(6);
		rVal.index.push(7);
		rVal.index.push(4);


		rVal.index.push(4);//bottom
		rVal.index.push(5);
		rVal.index.push(6);

		rVal.index.push(17);//
		rVal.index.push(16);
		rVal.index.push(19);

		rVal.index.push(19);
		rVal.index.push(18);
		rVal.index.push(17);


		rVal.index.push(12);//back
		rVal.index.push(13);
		rVal.index.push(14);


		rVal.index.push(14);
		rVal.index.push(15);
		rVal.index.push(12);




		rVal.indexCount = 6 * 6;

		return rVal;
	}
	static GetSphereUVEach(_size: number, _count: number) {
		var rVal = new CMeshCreateInfo();
		if (_count < 4)
			_count = 4;
		var posb = rVal.Create(CVertexFormat.eIdentifier.Position);
		var uvb = rVal.Create(CVertexFormat.eIdentifier.UV);
		var norb = rVal.Create(CVertexFormat.eIdentifier.Normal);
		MakeSphere2(posb.bufF, uvb.bufF, norb.bufF, _size, _count, _count);
		for (var i = 0; i < posb.bufF.Size(3); ++i) 
			rVal.bound.InitBound(posb.bufF.V3(i));
		

		rVal.vertexCount = posb.bufF.Size(3);
		rVal.indexCount = rVal.index.length;

		return rVal;
	}
	static GetSphere(_size: CVec3, _vCount: number, _hCount: number, _vSize: number, _hSize: number) {
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
		for (var i = 0; i < posb.bufF.Size(3); ++i) 
			rVal.bound.InitBound(posb.bufF.V3(i));
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
	// static GetTail(_count) {
	// 	_count = parseInt(_count + "");


	// 	var rVal = new CMeshCreateInfo();
	// 	var posb = rVal.Create(CVertexFormat.eIdentifier.Position);


	// 	posb.bufF.Resize((2 * (_count + 1)) * 3);
	// 	rVal.vertexCount = 2 * (_count + 1);
	// 	rVal.index = new Array(12 * _count);

	// 	for (var i = 0; i < _count + 1; ++i) {
	// 		posb.bufF.V3(i * 2 + 0, 1 - i / _count, 0, i * 2 + 0);
	// 		posb.bufF.V3(i * 2 + 1, 1 - i / _count, 1, i * 2 + 1);
	// 	}
	// 	for (var i = 0; i < _count - 1; ++i) {
	// 		rVal.index[i * 6 + 0] = 0 + i * 2;
	// 		rVal.index[i * 6 + 1] = 1 + i * 2;
	// 		rVal.index[i * 6 + 2] = 2 + i * 2;

	// 		rVal.index[i * 6 + 3] = 2 + i * 2;
	// 		rVal.index[i * 6 + 4] = 3 + i * 2;
	// 		rVal.index[i * 6 + 5] = 1 + i * 2;


	// 		// rVal.index[i * 4 * 3 + 6] = 2 + i * 2;
	// 		// rVal.index[i * 4 * 3 + 7] = 1 + i * 2;
	// 		// rVal.index[i * 4 * 3 + 8] = 0 + i * 2;

	// 		// rVal.index[i * 4 * 3 + 9] = 1 + i * 2;
	// 		// rVal.index[i * 4 * 3 + 10] = 3 + i * 2;
	// 		// rVal.index[i * 4 * 3 + 11] = 2 + i * 2;
	// 	}
	// 	rVal.indexCount = rVal.index.length;
	// 	return rVal;
	// }
	// static CMeshCreateInfoToInstance(_mci: CMeshCreateInfo) {
	// 	var nmci = new CMeshCreateInfo();
	// 	let count = (CDevice.GetProperty(CDevice.eProperty.Sam2DSize));
	// 	for (var each0 of _mci.vertex) {
	// 		var size = each0.bufF.Size(1);
	// 		var buf = nmci.Create(each0.vfType);
	// 		buf.bufF.Resize(size * count);
	// 		each0.bufF.Reserve(size);
	// 		//buf.bufI.length=each0.bufI.length*count;
	// 		for (var i = 0; i < count; ++i) {
	// 			buf.bufF.GetArray().set(each0.bufF.GetArray(), i * size);
	// 			buf.bufI.concat(each0.bufI);
	// 		}
	// 	}
	// 	var buft = nmci.Create(CVertexFormat.eIdentifier.TexOff);
	// 	buft.bufF.Resize(_mci.vertexCount * count);
	// 	for (var i = 0; i < count; ++i) {
	// 		for (var j = 0; j < _mci.vertexCount; ++j)
	// 			buft.bufF.V1(i * _mci.vertexCount + j, i);
	// 		nmci.index.concat(_mci.index);
	// 	}
	// 	nmci.indexCount = _mci.indexCount * count;
	// 	nmci.vertexCount = _mci.vertexCount * count;

	// 	return nmci;
	// }

	static GetTerrain(_count: number, _size: number) {

		var count = _count + 1;
		var rVal = new CMeshCreateInfo();
		var posb = rVal.Create(CVertexFormat.eIdentifier.Position);
		var norb = rVal.Create(CVertexFormat.eIdentifier.Normal);
		var uvb = rVal.Create(CVertexFormat.eIdentifier.UV);
		posb.bufF.Resize((count * count) * 3);
		norb.bufF.Resize((count * count) * 3);

		uvb.bufF.Resize((count * count) * 3);
		//rVal.color.Resize((count*count));
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
	//기존꺼인데 절대 지우지마라!!!20250925  어떻게 될지 모름
	// static RebuildNormals(_ci : CMeshCreateInfo) {
	// 	const vertex = _ci.GetVFType(CVertexFormat.eIdentifier.Position)[0];
	// 	const normal = _ci.GetVFType(CVertexFormat.eIdentifier.Normal)[0];

	// 	// 노멀 버퍼 재초기화
	// 	normal.bufF.Resize(vertex.bufF.Size(1));
	// 	for (let i = 0; i < normal.bufF.Size(3); i++) {
	// 		normal.bufF.V3(i, new CVec3());
	// 	}

	// 	// 버텍스 포맷별 요소 수 매핑
	// 	const typeMap: Map<number, number> = new Map();
	// 	for (const meshBuf of _ci.vertex) {
	// 		const elementCount = meshBuf.bufF.Size(1) / vertex.bufF.Size(3);
	// 		typeMap.set(meshBuf.vfType, elementCount);
	// 	}

	// 	const faceCount = _ci.index.length / 3;
	// 	for (let i = 0; i < faceCount; i++) {
	// 		const i0 = _ci.index[i * 3 + 0];
	// 		const i1 = _ci.index[i * 3 + 1];
	// 		const i2 = _ci.index[i * 3 + 2];

	// 		const V0 = vertex.bufF.V3(i0);
	// 		const V1 = vertex.bufF.V3(i1);
	// 		const V2 = vertex.bufF.V3(i2);

	// 		// 면 노멀 계산
	// 		const edge1 = CMath.V3SubV3(V1, V0);
	// 		const edge2 = CMath.V3SubV3(V2, V0);
	// 		const newNor = CMath.V3Nor(CMath.V3Cross(edge1, edge2));

	// 		// 세 정점 모두에 대해 노멀 검사 및 복사
	// 		for (let j = 0; j < 3; ++j) {
	// 			const idx = _ci.index[i * 3 + j];
	// 			const curNor = normal.bufF.V3(idx);

	// 			// 기존 노멀과 충분히 다르면 새 정점 생성
	// 			if (CMath.V3Dot(curNor, newNor) < 0.9 && !curNor.IsZero()) {
	// 				for (const meshBuf of _ci.vertex) {
	// 					const type = typeMap.get(meshBuf.vfType);
	// 					switch (type) {
	// 						case 2: meshBuf.bufF.Push(meshBuf.bufF.V2(idx)); break;
	// 						case 3: meshBuf.bufF.Push(meshBuf.bufF.V3(idx)); break;
	// 						case 4: meshBuf.bufF.Push(meshBuf.bufF.V4(idx)); break;
	// 						default: meshBuf.bufF.Push(meshBuf.bufF.GetArray()); break;
	// 					}
	// 				}
	// 				// 새 버텍스 인덱스 갱신
	// 				_ci.index[i * 3 + j] = vertex.bufF.Size(3) - 1;
	// 			}
	// 			// 새 면 노멀 설정
	// 			normal.bufF.V3(_ci.index[i * 3 + j], newNor);
	// 		}
	// 	}

	// 	// 최종적으로 버텍스-노멀 재계산 (노멀 보정용)
	// 	CUtilRender.VertexToNormalReCac(vertex.bufF, normal.bufF, _ci.index);

	// 	// 버텍스/인덱스 개수 갱신
	// 	_ci.vertexCount = vertex.bufF.Size(3);
	// 	_ci.indexCount = _ci.index.length;
	// }

	// 좌표/UV/노말이 (±epsilon 내에서) 같은 정점을 하나로 합칩니다.
	// 기본: UV/Normal도 함께 비교(useUV/useNormal = true)
	static WeldVerticesByPosUvNor(
		_ci: CMeshCreateInfo,
		posEps: number = 1e-6,
		uvEps: number = 1e-6,
		norEps: number = 1e-6,
		useUV: boolean = true,
		useNormal: boolean = true
	): void {
		const posEnt = _ci.GetVFType(CVertexFormat.eIdentifier.Position)[0];
		const norEnt = _ci.GetVFType(CVertexFormat.eIdentifier.Normal)[0];
		if (!posEnt) { console.error("Position buffer not found."); return; }

		const posBuf = posEnt.bufF as CFloat32Mgr;
		const uvEnts = _ci.GetVFType(CVertexFormat.eIdentifier.UV);
		const uvBuf = (uvEnts && uvEnts.length > 0) ? (uvEnts[0].bufF as CFloat32Mgr) : null;
		const norBuf = norEnt ? (norEnt.bufF as CFloat32Mgr) : null;

		const vertCount = posBuf.Size(3);
		if (useUV && !uvBuf) useUV = false;
		if (useNormal && !norBuf) useNormal = false;

		// 요소 수 파악(vfType별 2/3/4 등)
		const elemPerVert = new Map<number, number>();
		for (const vb of _ci.vertex) elemPerVert.set(vb.vfType, vb.bufF.Size(1) / vertCount);

		// 새 버퍼(모든 속성별) 준비
		const outBufs: CFloat32Mgr[] = _ci.vertex.map(() => new CFloat32Mgr());
		const outPos = outBufs[_ci.vertex.findIndex(v => v.vfType === CVertexFormat.eIdentifier.Position)];

		// 키 함수(양자화로 ε비교)
		const q = (v: number, eps: number) => Math.round(v / eps);
		const makeKey = (i: number): string => {
			const p = posBuf.V3(i);
			let k = `p:${q(p.x, posEps)},${q(p.y, posEps)},${q(p.z, posEps)}`;
			if (useUV && uvBuf) {
				const uv = uvBuf.V2(i);
				k += `|uv:${q(uv.x, uvEps)},${q(uv.y, uvEps)}`;
			}
			if (useNormal && norBuf) {
				const n = norBuf.V3(i);
				k += `|n:${q(n.x, norEps)},${q(n.y, norEps)},${q(n.z, norEps)}`;
			}
			return k;
		};

		// 기존정점 → 신규정점 매핑
		const mapOldToNew: number[] = new Array(vertCount);
		const keyToNew = new Map<string, number>();

		function copyVertex(iSrc: number): number {
			let newIdx = -1;
			for (let b = 0; b < _ci.vertex.length; ++b) {
				const inEnt = _ci.vertex[b], out = outBufs[b];
				const elems = elemPerVert.get(inEnt.vfType) || 3;
				if (elems === 2) out.Push(inEnt.bufF.V2(iSrc));
				else if (elems === 3) out.Push(inEnt.bufF.V3(iSrc));
				else if (elems === 4) out.Push(inEnt.bufF.V4(iSrc));
				else out.Push(inEnt.bufF.V3(iSrc)); // 안전망
				if (inEnt.vfType === CVertexFormat.eIdentifier.Position) newIdx = out.Size(3) - 1;
			}
			return newIdx!;
		}

		for (let i = 0; i < vertCount; ++i) {
			const k = makeKey(i);
			const found = keyToNew.get(k);
			if (found != null) {
				mapOldToNew[i] = found;
			} else {
				const ni = copyVertex(i);
				keyToNew.set(k, ni);
				mapOldToNew[i] = ni;
			}
		}

		// 인덱스 리맵 + 중복 삼각형/퇴화 제거
		const newIndex: number[] = [];
		for (let f = 0; f < _ci.index.length; f += 3) {
			const a = mapOldToNew[_ci.index[f + 0]];
			const b = mapOldToNew[_ci.index[f + 1]];
			const c = mapOldToNew[_ci.index[f + 2]];
			if (a === b || b === c || c === a) continue;        // 퇴화 삼각형 스킵
			newIndex.push(a, b, c);
		}

		// 교체
		_ci.index = newIndex;
		for (let b = 0; b < _ci.vertex.length; ++b) _ci.vertex[b].bufF = outBufs[b];
		_ci.vertexCount = outPos.Size(3);
		_ci.indexCount = _ci.index.length;
	}
	/*
		angleDeg=10° → 중앙 주변이 하드 스플릿되어 별무늬/광택 꼬임이 사라짐.
		angleDeg=45° → 중앙이 너무 섞여 광택이 뒤틀릴 수 있음.
	
		posEps=1e-4 → 대부분 자동 용접, 정점 수↓, 가끔 엣지 뭉개질 수 있음.
		posEps=1e-6 → 용접 안됨, 엣지 유지, 정점 수↑.
	
		vEps=1e-6 + weldByUV=true → 경계에서 노말 섞임 방지, 심 유지(안전).
		uvEps=1e-4 → 경계가 붙으면서 하이라이트가 퍼질 수 있음.
	
		weldByUV
		true(권장): 심/미러링 경계에서 노말이 섞이지 않음 → 노말맵/반사 안정. 정점 수 약간↑.
		false: 좌표만 같으면 같이 평균 → 경계에서 노말 섞임으로 광택 새거나 끊김 가능. 정점 수 약간↓.
	
		weldByNormal
		true: DCC에서 스무딩 그룹/하드엣지가 이미 설정된 상태를 그대로 존중. 불필요한 스무딩 방지, 정점 수↑.
		false(기본): 기존 노말은 참고하지 않고 우리가 다시 계산. 일반적으로 OK.
		*/
	// 웰딩 + 노멀 재계산 통합(현재 네가 만든 단순/안정판을 그대로 사용)
	static RebuildNormals(
		_ci: CMeshCreateInfo,
		// 웰딩 기준
		posEps: number = 1e-6,
		uvEps: number = 1e-6,
		norEps: number = 1e-6,
		useUV: boolean = true,
		useNormal: boolean = true
	): void {
		// 1) 웰딩
		CUtilRender.WeldVerticesByPosUvNor(_ci, posEps, uvEps, norEps, useUV, useNormal);

		// 2) 노멀 재계산 (네 함수)
		const posEnt = _ci.GetVFType(CVertexFormat.eIdentifier.Position)[0];
		const norEnt = _ci.GetVFType(CVertexFormat.eIdentifier.Normal)[0];
		if (!posEnt || !norEnt) { console.error("Position or Normal buffer not found."); return; }

		const posBuf = posEnt.bufF as CFloat32Mgr;
		const norBuf = norEnt.bufF as CFloat32Mgr;
		const vertCount = posEnt.bufF.Size(3);

		const accNormals: CVec3[] = new Array(vertCount);
		for (let i = 0; i < vertCount; ++i) accNormals[i] = new CVec3(0, 0, 0);

		for (let f = 0; f < _ci.index.length; f += 3) {
			const i0 = _ci.index[f], i1 = _ci.index[f + 1], i2 = _ci.index[f + 2];
			const p0 = posBuf.V3(i0), p1 = posBuf.V3(i1), p2 = posBuf.V3(i2);
			const e1 = CMath.V3SubV3(p1, p0);
			const e2 = CMath.V3SubV3(p2, p0);
			const faceNormal = CMath.V3Cross(e1, e2);
			if (CMath.V3Len(faceNormal) < 1e-12) continue;
			accNormals[i0] = CMath.V3AddV3(accNormals[i0], faceNormal);
			accNormals[i1] = CMath.V3AddV3(accNormals[i1], faceNormal);
			accNormals[i2] = CMath.V3AddV3(accNormals[i2], faceNormal);
		}

		for (let i = 0; i < vertCount; ++i) {
			let n = accNormals[i];
			norBuf.V3(i, (CMath.V3Len(n) > 1e-6) ? CMath.V3Nor(n) : new CVec3(0, 1, 0));
		}
	}

	
	static MeshBoundUpdate(_mesh : CMesh)
	{
		let Tree = new CTree<CMeshCopyNode>();
		Tree.mData=new CMeshCopyNode();
		CMeshTreeUpdate.TreeCopy(_mesh.meshTree,Tree,new CMat(),null);
		let skinMat=new Array<CMat>();
		let node=new Array<CMeshPaint>();
		node.push(new CMeshPaint(_mesh.meshTree, Tree,null));

		for(let i=0;i<node.length;++i)
		{

			for (var j = 0; j < _mesh.skin.length; ++j)
			{
				if (node[i].md.mData.IsSkinKey(_mesh.skin[j].key))
				{
					var all=new CMat();
					skinMat[j] = CMath.MatMul(_mesh.skin[j].mat, node[i].mpi.mData.pst);
				}
			}

			if(node[i].md.mChild!=null)
				node.push(new CMeshPaint(node[i].md.mChild, node[i].mpi.mChild,null));
			if(node[i].md.mColleague!=null)
				node.push(new CMeshPaint(node[i].md.mColleague, node[i].mpi.mColleague,null));
			
				
		}

		

		for(let i=0;i<node.length;++i)
		{
			MeshNodeBoundUpdate(skinMat,node[i]);
		}
	}

	static MeshAniBake(_texture : CTexture,_mesh : CMesh,_st : number,_end : number)
	{

		let buf=_texture.GetBuf()[0] as Float32Array;
		let XCount=_mesh.skin.length*4;
		let YCount=(_end-_st)*0.01;

		// let tm=new CMat();
		// for(let i=0;i<_texture.GetHeight()*_texture.GetWidth()*4;i+=16)
		// {
			
		// 	for(let j=0;j<16;++j)
		// 		buf[i+j]=tm.mF32A[j];
			
		// 	break;
			
		// }


		if(_texture.GetWidth()<XCount || _texture.GetHeight()<YCount)
		{
			CAlert.E("error");
			return;
		}

		let pst=0;
		
		let UpdateAni=(_node : CTree<CMeshDataNode>,_mat : CMat)=>{
			let mpi=new CMeshCopyNode();
			mpi.pos=_node.mData.pos;
			mpi.rot=_node.mData.rot;
			mpi.sca=_node.mData.sca;
			CMeshTreeUpdate.TreeUpdateMeshAni(pst,_st,_end,_node.mData,_node.mData,mpi,_mat);

			mpi.MatUpdate();
			mpi.pst = CMath.MatMul(mpi.pst, _mat);

			//CConsol.Log(_node.mKey+" "+mpi.pst.ToStr());


			for (var i = 0; i < _mesh.skin.length; ++i)
			{
				if (_node.mData.IsSkinKey(_mesh.skin[i].key))
				{
					var all=new CMat();
					all = CMath.MatMul(_mesh.skin[i].mat, mpi.pst);
					for(let j=0;j<16;++j)
						buf[(j+i*16)+((YCount-1)-pst*YCount)*XCount*4]=all.mF32A[j];
				}
			}

			if(_node.mChild!=null)
				UpdateAni(_node.mChild,mpi.pst);
			
			if(_node.mColleague!=null)
				UpdateAni(_node.mColleague,_mat);
			

			
		};
		for(let c=0;c<YCount;++c)
		{
			pst=c/YCount;
			//pst=0;
			UpdateAni(_mesh.meshTree,new CMat());
		}
		
		
		
	}

	static NoiseSeed = 1337;
	static NoiseFrequency = 0.02;	// 128 / 1024의 배수로 해야 끊기는 부분이 적음
	private static readonly PrimeX = 501125321;
	private static readonly PrimeY = 1136930381;
	private static readonly PrimeZ = 1720413743;
	private static readonly Gradients3D = [
		0, 1, 1, 0,  0,-1, 1, 0,  0, 1,-1, 0,  0,-1,-1, 0,
		1, 0, 1, 0, -1, 0, 1, 0,  1, 0,-1, 0, -1, 0,-1, 0,
		1, 1, 0, 0, -1, 1, 0, 0,  1,-1, 0, 0, -1,-1, 0, 0,
		0, 1, 1, 0,  0,-1, 1, 0,  0, 1,-1, 0,  0,-1,-1, 0,
		1, 0, 1, 0, -1, 0, 1, 0,  1, 0,-1, 0, -1, 0,-1, 0,
		1, 1, 0, 0, -1, 1, 0, 0,  1,-1, 0, 0, -1,-1, 0, 0,
		0, 1, 1, 0,  0,-1, 1, 0,  0, 1,-1, 0,  0,-1,-1, 0,
		1, 0, 1, 0, -1, 0, 1, 0,  1, 0,-1, 0, -1, 0,-1, 0,
		1, 1, 0, 0, -1, 1, 0, 0,  1,-1, 0, 0, -1,-1, 0, 0,
		0, 1, 1, 0,  0,-1, 1, 0,  0, 1,-1, 0,  0,-1,-1, 0,
		1, 0, 1, 0, -1, 0, 1, 0,  1, 0,-1, 0, -1, 0,-1, 0,
		1, 1, 0, 0, -1, 1, 0, 0,  1,-1, 0, 0, -1,-1, 0, 0,
		0, 1, 1, 0,  0,-1, 1, 0,  0, 1,-1, 0,  0,-1,-1, 0,
		1, 0, 1, 0, -1, 0, 1, 0,  1, 0,-1, 0, -1, 0,-1, 0,
		1, 1, 0, 0, -1, 1, 0, 0,  1,-1, 0, 0, -1,-1, 0, 0,
		1, 1, 0, 0,  0,-1, 1, 0, -1, 1, 0, 0,  0,-1,-1, 0
	];
	private static readonly RandVecs3D = [
		-0.7292736885, -0.6618439697, 0.1735581948, 0, 0.790292081, -0.5480887466, -0.2739291014, 0, 0.7217578935, 0.6226212466, -0.3023380997, 0, 0.565683137, -0.8208298145, -0.0790000257, 0, 0.760049034, -0.5555979497, -0.3370999617, 0, 0.3713945616, 0.5011264475, 0.7816254623, 0, -0.1277062463, -0.4254438999, -0.8959289049, 0, -0.2881560924, -0.5815838982, 0.7607405838, 0,
		0.5849561111, -0.662820239, -0.4674352136, 0, 0.3307171178, 0.0391653737, 0.94291689, 0, 0.8712121778, -0.4113374369, -0.2679381538, 0, 0.580981015, 0.7021915846, 0.4115677815, 0, 0.503756873, 0.6330056931, -0.5878203852, 0, 0.4493712205, 0.601390195, 0.6606022552, 0, -0.6878403724, 0.09018890807, -0.7202371714, 0, -0.5958956522, -0.6469350577, 0.475797649, 0,
		-0.5127052122, 0.1946921978, -0.8361987284, 0, -0.9911507142, -0.05410276466, -0.1212153153, 0, -0.2149721042, 0.9720882117, -0.09397607749, 0, -0.7518650936, -0.5428057603, 0.3742469607, 0, 0.5237068895, 0.8516377189, -0.02107817834, 0, 0.6333504779, 0.1926167129, -0.7495104896, 0, -0.06788241606, 0.3998305789, 0.9140719259, 0, -0.5538628599, -0.4729896695, -0.6852128902, 0,
		-0.7261455366, -0.5911990757, 0.3509933228, 0, -0.9229274737, -0.1782808786, 0.3412049336, 0, -0.6968815002, 0.6511274338, 0.3006480328, 0, 0.9608044783, -0.2098363234, -0.1811724921, 0, 0.06817146062, -0.9743405129, 0.2145069156, 0, -0.3577285196, -0.6697087264, -0.6507845481, 0, -0.1868621131, 0.7648617052, -0.6164974636, 0, -0.6541697588, 0.3967914832, 0.6439087246, 0,
		0.6993340405, -0.6164538506, 0.3618239211, 0, -0.1546665739, 0.6291283928, 0.7617583057, 0, -0.6841612949, -0.2580482182, -0.6821542638, 0, 0.5383980957, 0.4258654885, 0.7271630328, 0, -0.5026987823, -0.7939832935, -0.3418836993, 0, 0.3202971715, 0.2834415347, 0.9039195862, 0, 0.8683227101, -0.0003762656404, -0.4959995258, 0, 0.791120031, -0.08511045745, 0.6057105799, 0,
		-0.04011016052, -0.4397248749, 0.8972364289, 0, 0.9145119872, 0.3579346169, -0.1885487608, 0, -0.9612039066, -0.2756484276, 0.01024666929, 0, 0.6510361721, -0.2877799159, -0.7023778346, 0, -0.2041786351, 0.7365237271, 0.644859585, 0, -0.7718263711, 0.3790626912, 0.5104855816, 0, -0.3060082741, -0.7692987727, 0.5608371729, 0, 0.454007341, -0.5024843065, 0.7357899537, 0,
		0.4816795475, 0.6021208291, -0.6367380315, 0, 0.6961980369, -0.3222197429, 0.641469197, 0, -0.6532160499, -0.6781148932, 0.3368515753, 0, 0.5089301236, -0.6154662304, -0.6018234363, 0, -0.1635919754, -0.9133604627, -0.372840892, 0, 0.52408019, -0.8437664109, 0.1157505864, 0, 0.5902587356, 0.4983817807, -0.6349883666, 0, 0.5863227872, 0.494764745, 0.6414307729, 0,
		0.6779335087, 0.2341345225, 0.6968408593, 0, 0.7177054546, -0.6858979348, 0.120178631, 0, -0.5328819713, -0.5205125012, 0.6671608058, 0, -0.8654874251, -0.0700727088, -0.4960053754, 0, -0.2861810166, 0.7952089234, 0.5345495242, 0, -0.04849529634, 0.9810836427, -0.1874115585, 0, -0.6358521667, 0.6058348682, 0.4781800233, 0, 0.6254794696, -0.2861619734, 0.7258696564, 0,
		-0.2585259868, 0.5061949264, -0.8227581726, 0, 0.02136306781, 0.5064016808, -0.8620330371, 0, 0.200111773, 0.8599263484, 0.4695550591, 0, 0.4743561372, 0.6014985084, -0.6427953014, 0, 0.6622993731, -0.5202474575, -0.5391679918, 0, 0.08084972818, -0.6532720452, 0.7527940996, 0, -0.6893687501, 0.0592860349, 0.7219805347, 0, -0.1121887082, -0.9673185067, 0.2273952515, 0,
		0.7344116094, 0.5979668656, -0.3210532909, 0, 0.5789393465, -0.2488849713, 0.7764570201, 0, 0.6988182827, 0.3557169806, -0.6205791146, 0, -0.8636845529, -0.2748771249, -0.4224826141, 0, -0.4247027957, -0.4640880967, 0.777335046, 0, 0.5257722489, -0.8427017621, 0.1158329937, 0, 0.9343830603, 0.316302472, -0.1639543925, 0, -0.1016836419, -0.8057303073, -0.5834887393, 0,
		-0.6529238969, 0.50602126, -0.5635892736, 0, -0.2465286165, -0.9668205684, -0.06694497494, 0, -0.9776897119, -0.2099250524, -0.007368825344, 0, 0.7736893337, 0.5734244712, 0.2694238123, 0, -0.6095087895, 0.4995678998, 0.6155736747, 0, 0.5794535482, 0.7434546771, 0.3339292269, 0, -0.8226211154, 0.08142581855, 0.5627293636, 0, -0.510385483, 0.4703667658, 0.7199039967, 0,
		-0.5764971849, -0.07231656274, -0.8138926898, 0, 0.7250628871, 0.3949971505, -0.5641463116, 0, -0.1525424005, 0.4860840828, -0.8604958341, 0, -0.5550976208, -0.4957820792, 0.667882296, 0, -0.1883614327, 0.9145869398, 0.357841725, 0, 0.7625556724, -0.5414408243, -0.3540489801, 0, -0.5870231946, -0.3226498013, -0.7424963803, 0, 0.3051124198, 0.2262544068, -0.9250488391, 0,
		0.6379576059, 0.577242424, -0.5097070502, 0, -0.5966775796, 0.1454852398, -0.7891830656, 0, -0.658330573, 0.6555487542, -0.3699414651, 0, 0.7434892426, 0.2351084581, 0.6260573129, 0, 0.5562114096, 0.8264360377, -0.0873632843, 0, -0.3028940016, -0.8251527185, 0.4768419182, 0, 0.1129343818, -0.985888439, -0.1235710781, 0, 0.5937652891, -0.5896813806, 0.5474656618, 0,
		0.6757964092, -0.5835758614, -0.4502648413, 0, 0.7242302609, -0.1152719764, 0.6798550586, 0, -0.9511914166, 0.0753623979, -0.2992580792, 0, 0.2539470961, -0.1886339355, 0.9486454084, 0, 0.571433621, -0.1679450851, -0.8032795685, 0, -0.06778234979, 0.3978269256, 0.9149531629, 0, 0.6074972649, 0.733060024, -0.3058922593, 0, -0.5435478392, 0.1675822484, 0.8224791405, 0,
		-0.5876678086, -0.3380045064, -0.7351186982, 0, -0.7967562402, 0.04097822706, -0.6029098428, 0, -0.1996350917, 0.8706294745, 0.4496111079, 0, -0.02787660336, -0.9106232682, -0.4122962022, 0, -0.7797625996, -0.6257634692, 0.01975775581, 0, -0.5211232846, 0.7401644346, -0.4249554471, 0, 0.8575424857, 0.4053272873, -0.3167501783, 0, 0.1045223322, 0.8390195772, -0.5339674439, 0,
		0.3501822831, 0.9242524096, -0.1520850155, 0, 0.1987849858, 0.07647613266, 0.9770547224, 0, 0.7845996363, 0.6066256811, -0.1280964233, 0, 0.09006737436, -0.9750989929, -0.2026569073, 0, -0.8274343547, -0.542299559, 0.1458203587, 0, -0.3485797732, -0.415802277, 0.840000362, 0, -0.2471778936, -0.7304819962, -0.6366310879, 0, -0.3700154943, 0.8577948156, 0.3567584454, 0,
		0.5913394901, -0.548311967, -0.5913303597, 0, 0.1204873514, -0.7626472379, -0.6354935001, 0, 0.616959265, 0.03079647928, 0.7863922953, 0, 0.1258156836, -0.6640829889, -0.7369967419, 0, -0.6477565124, -0.1740147258, -0.7417077429, 0, 0.6217889313, -0.7804430448, -0.06547655076, 0, 0.6589943422, -0.6096987708, 0.4404473475, 0, -0.2689837504, -0.6732403169, -0.6887635427, 0,
		-0.3849775103, 0.5676542638, 0.7277093879, 0, 0.5754444408, 0.8110471154, -0.1051963504, 0, 0.9141593684, 0.3832947817, 0.131900567, 0, -0.107925319, 0.9245493968, 0.3654593525, 0, 0.377977089, 0.3043148782, 0.8743716458, 0, -0.2142885215, -0.8259286236, 0.5214617324, 0, 0.5802544474, 0.4148098596, -0.7008834116, 0, -0.1982660881, 0.8567161266, -0.4761596756, 0,
		-0.03381553704, 0.3773180787, -0.9254661404, 0, -0.6867922841, -0.6656597827, 0.2919133642, 0, 0.7731742607, -0.2875793547, -0.5652430251, 0, -0.09655941928, 0.9193708367, -0.3813575004, 0, 0.2715702457, -0.9577909544, -0.09426605581, 0, 0.2451015704, -0.6917998565, -0.6792188003, 0, 0.977700782, -0.1753855374, 0.1155036542, 0, -0.5224739938, 0.8521606816, 0.02903615945, 0,
		-0.7734880599, -0.5261292347, 0.3534179531, 0, -0.7134492443, -0.269547243, 0.6467878011, 0, 0.1644037271, 0.5105846203, -0.8439637196, 0, 0.6494635788, 0.05585611296, 0.7583384168, 0, -0.4711970882, 0.5017280509, -0.7254255765, 0, -0.6335764307, -0.2381686273, -0.7361091029, 0, -0.9021533097, -0.270947803, -0.3357181763, 0, -0.3793711033, 0.872258117, 0.3086152025, 0,
		-0.6855598966, -0.3250143309, 0.6514394162, 0, 0.2900942212, -0.7799057743, -0.5546100667, 0, -0.2098319339, 0.85037073, 0.4825351604, 0, -0.4592603758, 0.6598504336, -0.5947077538, 0, 0.8715945488, 0.09616365406, -0.4807031248, 0, -0.6776666319, 0.7118504878, -0.1844907016, 0, 0.7044377633, 0.312427597, 0.637304036, 0, -0.7052318886, -0.2401093292, -0.6670798253, 0,
		0.081921007, -0.7207336136, -0.6883545647, 0, -0.6993680906, -0.5875763221, -0.4069869034, 0, -0.1281454481, 0.6419895885, 0.7559286424, 0, -0.6337388239, -0.6785471501, -0.3714146849, 0, 0.5565051903, -0.2168887573, -0.8020356851, 0, -0.5791554484, 0.7244372011, -0.3738578718, 0, 0.1175779076, -0.7096451073, 0.6946792478, 0, -0.6134619607, 0.1323631078, 0.7785527795, 0,
		0.6984635305, -0.02980516237, -0.715024719, 0, 0.8318082963, -0.3930171956, 0.3919597455, 0, 0.1469576422, 0.05541651717, -0.9875892167, 0, 0.708868575, -0.2690503865, 0.6520101478, 0, 0.2726053183, 0.67369766, -0.68688995, 0, -0.6591295371, 0.3035458599, -0.6880466294, 0, 0.4815131379, -0.7528270071, 0.4487723203, 0, 0.9430009463, 0.1675647412, -0.2875261255, 0,
		0.434802957, 0.7695304522, -0.4677277752, 0, 0.3931996188, 0.594473625, 0.7014236729, 0, 0.7254336655, -0.603925654, 0.3301814672, 0, 0.7590235227, -0.6506083235, 0.02433313207, 0, -0.8552768592, -0.3430042733, 0.3883935666, 0, -0.6139746835, 0.6981725247, 0.3682257648, 0, -0.7465905486, -0.5752009504, 0.3342849376, 0, 0.5730065677, 0.810555537, -0.1210916791, 0,
		-0.9225877367, -0.3475211012, -0.167514036, 0, -0.7105816789, -0.4719692027, -0.5218416899, 0, -0.08564609717, 0.3583001386, 0.929669703, 0, -0.8279697606, -0.2043157126, 0.5222271202, 0, 0.427944023, 0.278165994, 0.8599346446, 0, 0.5399079671, -0.7857120652, -0.3019204161, 0, 0.5678404253, -0.5495413974, -0.6128307303, 0, -0.9896071041, 0.1365639107, -0.04503418428, 0,
		-0.6154342638, -0.6440875597, 0.4543037336, 0, 0.1074204368, -0.7946340692, 0.5975094525, 0, -0.3595449969, -0.8885529948, 0.28495784, 0, -0.2180405296, 0.1529888965, 0.9638738118, 0, -0.7277432317, -0.6164050508, -0.3007234646, 0, 0.7249729114, -0.00669719484, 0.6887448187, 0, -0.5553659455, -0.5336586252, 0.6377908264, 0, 0.5137558015, 0.7976208196, -0.3160000073, 0,
		-0.3794024848, 0.9245608561, -0.03522751494, 0, 0.8229248658, 0.2745365933, -0.4974176556, 0, -0.5404114394, 0.6091141441, 0.5804613989, 0, 0.8036581901, -0.2703029469, 0.5301601931, 0, 0.6044318879, 0.6832968393, 0.4095943388, 0, 0.06389988817, 0.9658208605, -0.2512108074, 0, 0.1087113286, 0.7402471173, -0.6634877936, 0, -0.713427712, -0.6926784018, 0.1059128479, 0,
		0.6458897819, -0.5724548511, -0.5050958653, 0, -0.6553931414, 0.7381471625, 0.159995615, 0, 0.3910961323, 0.9188871375, -0.05186755998, 0, -0.4879022471, -0.5904376907, 0.6429111375, 0, 0.6014790094, 0.7707441366, -0.2101820095, 0, -0.5677173047, 0.7511360995, 0.3368851762, 0, 0.7858573506, 0.226674665, 0.5753666838, 0, -0.4520345543, -0.604222686, -0.6561857263, 0,
		0.002272116345, 0.4132844051, -0.9105991643, 0, -0.5815751419, -0.5162925989, 0.6286591339, 0, -0.03703704785, 0.8273785755, 0.5604221175, 0, -0.5119692504, 0.7953543429, -0.3244980058, 0, -0.2682417366, -0.9572290247, -0.1084387619, 0, -0.2322482736, -0.9679131102, -0.09594243324, 0, 0.3554328906, -0.8881505545, 0.2913006227, 0, 0.7346520519, -0.4371373164, 0.5188422971, 0,
		0.9985120116, 0.04659011161, -0.02833944577, 0, -0.3727687496, -0.9082481361, 0.1900757285, 0, 0.91737377, -0.3483642108, 0.1925298489, 0, 0.2714911074, 0.4147529736, -0.8684886582, 0, 0.5131763485, -0.7116334161, 0.4798207128, 0, -0.8737353606, 0.18886992, -0.4482350644, 0, 0.8460043821, -0.3725217914, 0.3814499973, 0, 0.8978727456, -0.1780209141, -0.4026575304, 0,
		0.2178065647, -0.9698322841, -0.1094789531, 0, -0.1518031304, -0.7788918132, -0.6085091231, 0, -0.2600384876, -0.4755398075, -0.8403819825, 0, 0.572313509, -0.7474340931, -0.3373418503, 0, -0.7174141009, 0.1699017182, -0.6756111411, 0, -0.684180784, 0.02145707593, -0.7289967412, 0, -0.2007447902, 0.06555605789, -0.9774476623, 0, -0.1148803697, -0.8044887315, 0.5827524187, 0,
		-0.7870349638, 0.03447489231, 0.6159443543, 0, -0.2015596421, 0.6859872284, 0.6991389226, 0, -0.08581082512, -0.10920836, -0.9903080513, 0, 0.5532693395, 0.7325250401, -0.396610771, 0, -0.1842489331, -0.9777375055, -0.1004076743, 0, 0.0775473789, -0.9111505856, 0.4047110257, 0, 0.1399838409, 0.7601631212, -0.6344734459, 0, 0.4484419361, -0.845289248, 0.2904925424, 0
	];

	// func for noise
	private static Hash(_xPrimed : number, _yPrimed : number, _zPrimed : number) {
		var hash : number = this.NoiseSeed ^ _xPrimed ^ _yPrimed ^ _zPrimed;
		hash *= 0x27d4eb2d;
		return hash;
	}
	private static InterpQuintic(_t : number) {
		return _t * _t * _t * (_t * (_t * 6 - 15) + 10);
	}
	private static GradCoord(_xPrimed : number, _yPrimed : number, _zPrimed : number, _xd : number, _yd : number, _zd : number) {
		var hash : number = this.Hash(_xPrimed, _yPrimed, _zPrimed);
		hash ^= hash >> 15;
		hash &= 63 << 2;

		var xg : number = this.Gradients3D[hash];
		var yg : number = this.Gradients3D[hash | 1];
		var zg : number = this.Gradients3D[hash | 2];

		return _xd * xg + _yd * yg + _zd * zg;
	}

	// noise
	static NoisePerlin(_x : number, _y : number, _z : number) {
		_x *= this.NoiseFrequency;
		_y *= this.NoiseFrequency;
		_z *= this.NoiseFrequency;

		const R3 = 2.0 / 3.0;
		const r = (_x + _y + _z) * R3;
		_x = r - _x;
		_y = r - _y;
		_z = r - _z;

		var x0 : number = Math.floor(_x);
		var y0 : number = Math.floor(_y);
		var z0 : number = Math.floor(_z);

		var xd0 : number = _x - x0;
		var yd0 : number = _y - y0;
		var zd0 : number = _z - z0;
		var xd1 : number = xd0 - 1;
		var yd1 : number = yd0 - 1;
		var zd1 : number = zd0 - 1;

		var xs : number = this.InterpQuintic(xd0);
		var ys : number = this.InterpQuintic(yd0);
		var zs : number = this.InterpQuintic(zd0);

		x0 *= this.PrimeX;
		y0 *= this.PrimeY;
		z0 *= this.PrimeZ;
		var x1 : number = x0 + this.PrimeX;
		var y1 : number = y0 + this.PrimeY;
		var z1 : number = z0 + this.PrimeZ;

		var xf00 : number = CMath.FloatInterpolate(this.GradCoord(x0, y0, z0, xd0, yd0, zd0), this.GradCoord(x1, y0, z0, xd1, yd0, zd0), xs);
		var xf10 : number = CMath.FloatInterpolate(this.GradCoord(x0, y1, z0, xd0, yd1, zd0), this.GradCoord(x1, y1, z0, xd1, yd1, zd0), xs);
		var xf01 : number = CMath.FloatInterpolate(this.GradCoord(x0, y0, z1, xd0, yd0, zd1), this.GradCoord(x1, y0, z1, xd1, yd0, zd1), xs);
		var xf11 : number = CMath.FloatInterpolate(this.GradCoord(x0, y1, z1, xd0, yd1, zd1), this.GradCoord(x1, y1, z1, xd1, yd1, zd1), xs);

		var yf0 = CMath.FloatInterpolate(xf00, xf10, ys);
        var yf1 = CMath.FloatInterpolate(xf01, xf11, ys);

		return CMath.FloatInterpolate(yf0, yf1, zs) * 0.964921414852142333984375;
	}
	static NoiseCellular(_x : number, _y : number, _z : number) {
		_x *= this.NoiseFrequency;
		_y *= this.NoiseFrequency;
		_z *= this.NoiseFrequency;

		const R3 = 2.0 / 3.0;
		const r = (_x + _y + _z) * R3;
		_x = r - _x;
		_y = r - _y;
		_z = r - _z;

		var xr : number = Math.round(_x);
		var yr : number = Math.round(_y);
		var zr : number = Math.round(_z);

		var distance0 : number = 1e10;
		var distance1 : number = 1e10;
		var closestHash : number = 0;

		var cellularJitter : number = 0.39614353;

		var xPrimed : number = (xr - 1) * this.PrimeX;
		var yPrimedBase : number = (yr - 1) * this.PrimeY;
		var zPrimedBase : number = (zr - 1) * this.PrimeZ;

		// Euclidean 공식 사용함
		for (var xi = xr - 1; xi <= xr + 1; xi++)
		{
			var yPrimed : number = yPrimedBase;
			for (var yi = yr - 1; yi <= yr + 1; yi++)
			{
				var zPrimed : number = zPrimedBase;
				for(var zi = zr - 1; zi <= zr + 1; zi++)
				{
					var hash : number = this.Hash(xPrimed, yPrimed, zPrimed);
					var idx : number = hash & (255 << 1);

					var vecX : number = (xi - _x) + cellularJitter * this.RandVecs3D[idx];
					var vecY : number = (yi - _y) + cellularJitter * this.RandVecs3D[idx | 1];
					var vecZ : number = (zi - _z) + cellularJitter * this.RandVecs3D[idx | 2];

					var newDistance : number = vecX * vecX + vecY * vecY + vecZ * vecZ;

					distance1 = CMath.Clamp(newDistance, distance0, distance1);
					if (newDistance < distance0)
					{
						distance0 = newDistance;
						closestHash = hash;
					}
					zPrimed += this.PrimeZ;
				}
				yPrimed += this.PrimeY;
			}
			xPrimed += this.PrimeX;
		}

		// return 1.0 - distance0;

		// distance0 리턴함
		distance0 = Math.sqrt(distance0);
		return distance0 - 1;
	}
	static NoiseSimplex(_x : number, _y : number, _z : number) {
        _x *= this.NoiseFrequency;
        _y *= this.NoiseFrequency;
		_z *= this.NoiseFrequency;

		const R3 = 2.0 / 3.0;
		const r = (_x + _y + _z) * R3;
		_x = r - _x;
		_y = r - _y;
		_z = r - _z;

        var i : number = Math.floor(_x);
        var j : number = Math.floor(_y);
		var k : number = Math.floor(_z);
        var xi : number = _x - i;
        var yi : number = _y - j;
		var zi : number = _z - k;

        i *= this.PrimeX;
        j *= this.PrimeY;
		k *= this.PrimeZ;
		var seed2 = this.NoiseSeed + 1293373;

		var xNMask : number = -0.5 - xi;
		var yNMask : number = -0.5 - yi;
		var zNMask : number = -0.5 - zi;

		var x0 = xi + xNMask;
        var y0 = yi + yNMask;
        var z0 = zi + zNMask;
		var a0 = 0.75 - x0 * x0 - y0 * y0 - z0 * z0;
        var value = (a0 * a0) * (a0 * a0) * this.GradCoord(i + (xNMask & this.PrimeX), j + (yNMask & this.PrimeY), k + (zNMask & this.PrimeZ), x0, y0, z0);

		var x1 = xi - 0.5;
        var y1 = yi - 0.5;
        var z1 = zi - 0.5;
        var a1 = 0.75 - x1 * x1 - y1 * y1 - z1 * z1;
        value += (a1 * a1) * (a1 * a1) * this.GradCoord(i + this.PrimeX, j + this.PrimeY, k + this.PrimeZ, x1, y1, z1);

		var xAFlipMask0 = ((xNMask | 1) << 1) * x1;
        var yAFlipMask0 = ((yNMask | 1) << 1) * y1;
        var zAFlipMask0 = ((zNMask | 1) << 1) * z1;
        var xAFlipMask1 = (-2 - (xNMask << 2)) * x1 - 1.0;
        var yAFlipMask1 = (-2 - (yNMask << 2)) * y1 - 1.0;
        var zAFlipMask1 = (-2 - (zNMask << 2)) * z1 - 1.0;

		var skip5 = false;
        var a2 = xAFlipMask0 + a0;
        if (a2 > 0)
        {
            var x2 = x0 - (xNMask | 1);
            var y2 = y0;
            var z2 = z0;
            value += (a2 * a2) * (a2 * a2) * this.GradCoord(i + (~xNMask & this.PrimeX), j + (yNMask & this.PrimeY), k + (zNMask & this.PrimeZ), x2, y2, z2);
        }
        else
        {
            var a3 = yAFlipMask0 + zAFlipMask0 + a0;
            if (a3 > 0)
            {
                var x3 = x0;
                var y3 = y0 - (yNMask | 1);
                var z3 = z0 - (zNMask | 1);
                value += (a3 * a3) * (a3 * a3) * this.GradCoord(i + (xNMask & this.PrimeX), j + (~yNMask & this.PrimeY), k + (~zNMask & this.PrimeZ), x3, y3, z3);
            }

            var a4 = xAFlipMask1 + a1;
            if (a4 > 0)
            {
                var x4 = (xNMask | 1) + x1;
                var y4 = y1;
                var z4 = z1;
				var seed1 = this.NoiseSeed;
				this.NoiseSeed = seed2;
                value += (a4 * a4) * (a4 * a4) * this.GradCoord(i + (xNMask & (this.PrimeX * 2)), j + this.PrimeY, k + this.PrimeZ, x4, y4, z4);
				this.NoiseSeed = seed1;
                skip5 = true;
            }
        }

		var skip9 = false;
        var a6 = yAFlipMask0 + a0;
        if (a6 > 0)
        {
            var x6 = x0;
            var y6 = y0 - (yNMask | 1);
            var z6 = z0;
            value += (a6 * a6) * (a6 * a6) * this.GradCoord(i + (xNMask & this.PrimeX), j + (~yNMask & this.PrimeY), k + (zNMask & this.PrimeZ), x6, y6, z6);
        }
        else
        {
            var a7 = xAFlipMask0 + zAFlipMask0 + a0;
            if (a7 > 0)
            {
                var x7 = x0 - (xNMask | 1);
                var y7 = y0;
                var z7 = z0 - (zNMask | 1);
                value += (a7 * a7) * (a7 * a7) * this.GradCoord(i + (~xNMask & this.PrimeX), j + (yNMask & this.PrimeY), k + (~zNMask & this.PrimeZ), x7, y7, z7);
            }

            var a8 = yAFlipMask1 + a1;
            if (a8 > 0)
            {
                var x8 = x1;
                var y8 = (yNMask | 1) + y1;
                var z8 = z1;
				var seed1 = this.NoiseSeed;
				this.NoiseSeed = seed2;
                value += (a8 * a8) * (a8 * a8) * this.GradCoord(i + this.PrimeX, j + (yNMask & (this.PrimeY << 1)), k + this.PrimeZ, x8, y8, z8);
				this.NoiseSeed = seed1;
                skip9 = true;
            }
        }

		var skipD = false;
        var aA = zAFlipMask0 + a0;
        if (aA > 0)
        {
            var xA = x0;
            var yA = y0;
            var zA = z0 - (zNMask | 1);
            value += (aA * aA) * (aA * aA) * this.GradCoord(i + (xNMask & this.PrimeX), j + (yNMask & this.PrimeY), k + (~zNMask & this.PrimeZ), xA, yA, zA);
        }
        else
        {
            var aB = xAFlipMask0 + yAFlipMask0 + a0;
            if (aB > 0)
            {
                var xB = x0 - (xNMask | 1);
                var yB = y0 - (yNMask | 1);
                var zB = z0;
                value += (aB * aB) * (aB * aB) * this.GradCoord(i + (~xNMask & this.PrimeX), j + (~yNMask & this.PrimeY), k + (zNMask & this.PrimeZ), xB, yB, zB);
            }

            var aC = zAFlipMask1 + a1;
            if (aC > 0)
            {
                var xC = x1;
                var yC = y1;
                var zC = (zNMask | 1) + z1;
				var seed1 = this.NoiseSeed;
				this.NoiseSeed = seed2;
                value += (aC * aC) * (aC * aC) * this.GradCoord(i + this.PrimeX, j + this.PrimeY, k + (zNMask & (this.PrimeZ << 1)), xC, yC, zC);
				this.NoiseSeed = seed1;
                skipD = true;
            }
        }

		if (!skip5)
        {
            var a5 = yAFlipMask1 + zAFlipMask1 + a1;
            if (a5 > 0)
            {
                var x5 = x1;
                var y5 = (yNMask | 1) + y1;
                var z5 = (zNMask | 1) + z1;
				var seed1 = this.NoiseSeed;
				this.NoiseSeed = seed2;
                value += (a5 * a5) * (a5 * a5) * this.GradCoord(i + this.PrimeX, j + (yNMask & (this.PrimeY << 1)), k + (zNMask & (this.PrimeZ << 1)), x5, y5, z5);
				this.NoiseSeed = seed1;
            }
        }

        if (!skip9)
        {
            var a9 = xAFlipMask1 + zAFlipMask1 + a1;
            if (a9 > 0)
            {
                var x9 = (xNMask | 1) + x1;
                var y9 = y1;
                var z9 = (zNMask | 1) + z1;
				var seed1 = this.NoiseSeed;
				this.NoiseSeed = seed2;
                value += (a9 * a9) * (a9 * a9) * this.GradCoord(i + (xNMask & (this.PrimeX * 2)), j + this.PrimeY, k + (zNMask & (this.PrimeZ << 1)), x9, y9, z9);
				this.NoiseSeed = seed1;
            }
        }

        if (!skipD)
        {
            var aD = xAFlipMask1 + yAFlipMask1 + a1;
            if (aD > 0)
            {
                var xD = (xNMask | 1) + x1;
                var yD = (yNMask | 1) + y1;
                var zD = z1;
				var seed1 = this.NoiseSeed;
				this.NoiseSeed = seed2;
                value += (aD * aD) * (aD * aD) * this.GradCoord(i + (xNMask & (this.PrimeX << 1)), j + (yNMask & (this.PrimeY << 1)), k + this.PrimeZ, xD, yD, zD);
				this.NoiseSeed = seed1;
            }
        }

        return value * 9.046026385208288;
    }
	static NoiseCurl(_x : number, _y : number, _z : number) {
		var epsilon : number = 1e-3;
		var offset : number = 100.0;

		// x 필드
		const Ax_y1 = this.NoisePerlin(_x, _y + epsilon, _z);
		const Ax_y2 = this.NoisePerlin(_x, _y - epsilon, _z);
		const Ax_z1 = this.NoisePerlin(_x, _y, _z + epsilon);
		const Ax_z2 = this.NoisePerlin(_x, _y, _z - epsilon);
		const dAx_dy = (Ax_y1 - Ax_y2) / (2 * epsilon);
		const dAx_dz = (Ax_z1 - Ax_z2) / (2 * epsilon);

		// y 필드
		const Ay_x1 = this.NoisePerlin(_x + epsilon + offset, _y, _z);
		const Ay_x2 = this.NoisePerlin(_x - epsilon + offset, _y, _z);
		const Ay_z1 = this.NoisePerlin(_x + offset, _y, _z + epsilon);
		const Ay_z2 = this.NoisePerlin(_x + offset, _y, _z - epsilon);
		const dAy_dx = (Ay_x1 - Ay_x2) / (2 * epsilon);
		const dAy_dz = (Ay_z1 - Ay_z2) / (2 * epsilon);

		// z 필드
		const Az_x1 = this.NoisePerlin(_x + epsilon + offset * 2, _y, _z);
		const Az_x2 = this.NoisePerlin(_x - epsilon + offset * 2, _y, _z);
		const Az_y1 = this.NoisePerlin(_x + offset * 2, _y + epsilon, _z);
		const Az_y2 = this.NoisePerlin(_x + offset * 2, _y - epsilon, _z);
		const dAz_dx = (Az_x1 - Az_x2) / (2 * epsilon);
		const dAz_dy = (Az_y1 - Az_y2) / (2 * epsilon);

		// curl 공식
		const resX = dAz_dy - dAy_dz;
		const resY = dAx_dz - dAz_dx;
		const resZ = dAy_dx - dAx_dy;

		return CMath.V3Nor(new CVec3(resX, resY, resZ));
	}

};
function MeshNodeBoundUpdate(_skinMat : Array<CMat>,_node : CMeshPaint)
{
	var mat=CPoolGeo.ProductMat();
	// var sm=CPoolGeo.ProductMat();
	// var rm=CPoolGeo.ProductMat();
	

	
	// CMath.MatScale(_node.mData.sca,sm);
	// CMath.QutToMat(_node.mData.rot,rm);
	// //CMath.QutToMat(CMath.EulerToQut(this.rot.xyz),rm.dt);
		
	

	// CMath.MatMul(sm, rm,mat);
	// CPoolGeo.RecycleMat(sm);
	// CPoolGeo.RecycleMat(rm);
	

	

	// mat.mF32A[12] = _node.mData.pos.x;
	// mat.mF32A[13] = _node.mData.pos.y;
	// mat.mF32A[14] = _node.mData.pos.z;
	// mat.UnitCheck();

	// mat=CMath.MatMul(_sum,mat);

	let mdd=_node.md.mData;
	//let mdd=_node.md.mData;
	
	if(mdd.ci!=null && mdd.textureOff.length>0)
	{
		mdd.ci.bound.SetType(CBound.eType.Box);
		let posb=mdd.ci.GetVFType(CVertexFormat.eIdentifier.Position)[0];
		let web=mdd.ci.GetVFType(CVertexFormat.eIdentifier.Weight)[0];
		let wib=mdd.ci.GetVFType(CVertexFormat.eIdentifier.WeightIndex)[0];
		if(mdd.ci.indexCount>0)
		{
			
			let dmat=new CMat();
			dmat.SetUnit(false);
			for (let i = 0; i < mdd.ci.indexCount; i+=3)
			{

				for(let j=0;j<3;++j)
				{
					let pos=posb.bufF.V3(mdd.ci.index[i+j]);
					if(web!=null && _skinMat.length>0)
					{
						
						
						//let wmat=new CMat();
						mat.Zero();
						mat.SetUnit(false);
						let we=web.bufF.V4(mdd.ci.index[i+j]);
						let wi=wib.bufF.V4(mdd.ci.index[i+j]);
						
						if(wi.x>_skinMat.length)	wi.x=_skinMat.length-1;

						CMath.MatMulFloat(_skinMat[wi.x],we.x,dmat);
						CMath.MatAdd(mat,dmat,mat);
						CMath.MatMulFloat(_skinMat[wi.y],we.y,dmat);
						CMath.MatAdd(mat,dmat,mat);
						CMath.MatMulFloat(_skinMat[wi.z],we.z,dmat);
						CMath.MatAdd(mat,dmat,mat);
						CMath.MatMulFloat(_skinMat[wi.w],we.w,dmat);
						CMath.MatAdd(mat,dmat,mat);

						//CMath.MatMul(mat,wmat,dmat);
						
					}
					else
						mat.Import(_node.mpi.mData.pst);
						
					if(mat.IsZero()==false)
					{
						mdd.ci.bound.InitBound(CMath.V3MulMatCoordi(pos,mat));	
					}
				}
			}

		}
		else
		{
			for (let i = 0; i < posb.bufF.Size(3); ++i)
			{
				
				let pos=posb.bufF.V3(i);
				let dmat=new CMat();
				dmat.SetUnit(false);
				if(web!=null && _skinMat.length>0)
				{
					
					
					
					mat.Zero();
					mat.SetUnit(false);
					let we=web.bufF.V4(i);
					let wi=wib.bufF.V4(i);
					
					if(wi.x>_skinMat.length)	wi.x=_skinMat.length-1;
					
						
					CMath.MatMulFloat(_skinMat[wi.x],we.x,dmat);
					CMath.MatAdd(mat,dmat,mat);
					CMath.MatMulFloat(_skinMat[wi.y],we.y,dmat);
					CMath.MatAdd(mat,dmat,mat);
					CMath.MatMulFloat(_skinMat[wi.z],we.z,dmat);
					CMath.MatAdd(mat,dmat,mat);
					CMath.MatMulFloat(_skinMat[wi.w],we.w,dmat);
					CMath.MatAdd(mat,dmat,mat);

					
					
				}
				else
					mat.Import(_node.mpi.mData.pst);
					
				if(mat.IsZero()==false)
				{
					mdd.ci.bound.InitBound(CMath.V3MulMatCoordi(pos,mat));	
				}
				
				
			}
			
			
			
		}
		
	}
	
	CPoolGeo.RecycleMat(mat);
	// if(_node.mChild!=null)	MeshNodeBoundUpdate(_skinMat,_node.mChild,mat);
	// if(_node.mColleague!=null)	MeshNodeBoundUpdate(_skinMat,_node.mColleague,_sum);
	
	
}
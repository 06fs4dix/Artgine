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

	static TangentCalculate(pa_verArr,pa_norArr,pa_uvArr,pa_index,pa_out)
	{
		var tan1=new Array();
		var tan2=new Array();
		for(var i=0;i< pa_verArr.Size(3);++i)
		{
			tan1[i]=new CVec3(); 
			tan2[i]=new CVec3();
		}
		
		
		for (var a = 0; a < pa_index.length; a+=3)
		{
			var i0 = pa_index[a+0];//pa_index->i0;
			var i1 = pa_index[a+1];//pa_index->i1;
			var i2 = pa_index[a+2];//pa_index->i2;
	
			var v1 = CMath.V3SubV3(pa_verArr.V3(i1), pa_verArr.V3(i0));
			var v2 = CMath.V3SubV3(pa_verArr.V3(i2), pa_verArr.V3(i0));
	
			var uv1 = CMath.Vec2MinusVec2(pa_uvArr.V2(i1), pa_uvArr.V2(i0));
			var uv2 = CMath.Vec2MinusVec2(pa_uvArr.V2(i2), pa_uvArr.V2(i0));
	
	
			var r = 1.0 / (uv1.x * uv2.y - uv2.x * uv1.y);
			var sdir=new CVec3((uv2.y * v1.x - uv1.y * v2.x) * r, (uv2.y * v1.y - uv1.y * v2.y) * r,
				(uv2.y * v1.z - uv1.y * v2.z) * r);
			var tdir=new CVec3((uv1.x * v2.x - uv2.x * v1.x) * r, (uv1.x * v2.y - uv2.x * v1.y) * r,
				(uv1.x * v2.z - uv2.x * v1.z) * r);
	
			tan1[i0] = CMath.V3AddV3(tan1[i0], sdir);
			tan1[i1] = CMath.V3AddV3(tan1[i1], sdir);
			tan1[i2] = CMath.V3AddV3(tan1[i2], sdir);
	
			tan2[i0] = CMath.V3AddV3(tan2[i0], tdir);
			tan2[i1] = CMath.V3AddV3(tan2[i1], tdir);
			tan2[i2] = CMath.V3AddV3(tan2[i2], tdir);
	
	
		}
	
		for (var a = 0; a < pa_verArr.Size(3); a++)
		{
			var n = pa_norArr.V3(a);
			var t = tan1[a];
			var t2 = CMath.V3Nor(tan1[a]);
			pa_out.V4(a, t2.x, t2.y, t2.z, 1);
			
			//var xyz = CMath.V3Nor(CMath.V3MulFloat(CMath.V3SubV3(t, n), CMath.V3Dot(n, t)));
	
	
			// Calculate handedness 이게 손좌표계인거 같은데 
			//var w = (CMath.V3Dot(CMath.V3Cross(n, t), tan2[a]) < 0.0) ? -1.0 : 1.0;
			//pa_out.V4(a, xyz.x, xyz.y, xyz.z, w);
			//pa_out[a].w = (Vec3_Dot(Vec3_Cross_Outer(n, t), tan2[a]) < 0.0F) ? 1.0F : -1.0F;
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

			mpi.PRSReset();
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
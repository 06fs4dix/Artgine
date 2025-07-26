
import { CAlert } from "../basic/CAlert.js";
import { CEvent } from "../basic/CEvent.js";
import {CPreferences} from "../basic/CPreferences.js";
import {CMat} from "../geometry/CMat.js";
import {CMath} from "../geometry/CMath.js";
import {CRay} from "../geometry/CRay.js";
import {CVec3} from "../geometry/CVec3.js";
import {CVec4} from "../geometry/CVec4.js";
import {CCamera} from "../render/CCamera.js";
import { CRendererGL } from "../render/CRenderer.js";
import { CFrame } from "./CFrame.js";



var g_xrSessionIsGranted = false;
var g_XRSession = null;
var g_XRRefSpace = null;
var g_XREnter = false;
//var g_XRRender=null;
var g_xrTime = 0;
var g_lastView : any = null;
var g_lastViewPort : any = null;
var g_framebufferWidth: number = null;
var g_framebufferHeight: number = null;
var g_last3DCam: CCamera = null;
var g_last2DCam: CCamera = null;
var g_resize = false;
var g_lastPos: CVec3 = null;



var g_firstPos = new CVec3;
var g_firstPosRad: any = null;
var g_padRight: any = null;
var g_padLeft: any = null;
var g_padRightRay: any = null;
var g_padLeftRay: any = null;
var g_padAxes = [new CVec3, new CVec3];
//async function onStartedXRSession(xrSession,_gl) {
//  try {
//    await _gl.makeXRCompatible();
//  } catch (err) {
//    switch(err) {
//      case AbortError:
//        CMsg.E("Unable to transfer the game to your XR headset.", "Cancel");
//        break;
//      case InvalidStateError:
//        CMsg.E("You don't appear to have a compatible XR headset available.", "Cancel");
//        break;
//      default:
//        handleFatalError(err);
//        break;
//    }
//    xrSession.end();
//  }
//}
var g_xrPF = new CPreferences();
var is_VR: boolean = true;

var is_init:boolean = false;
export class CWebXR {
	static LastViewPort() { return g_lastViewPort; }
	static IsResize() {
		return g_resize;
	}
	static IsEnter() {
		return g_XREnter;
	}
	static CameraReset(_cam3D: CCamera, _cam2D: CCamera) {
		if (g_XREnter && g_lastView != null) {
			g_xrPF.mWidth = g_framebufferWidth;
			g_xrPF.mHeight = g_framebufferHeight;

			if (_cam3D != null) {
				var projMat = new CMat();
				if (is_VR) {
					projMat.mF32A[0] = g_lastView.transform.matrix[0];
					projMat.mF32A[1] = 0;
					projMat.mF32A[2] = 0;
					projMat.mF32A[3] = 0;

					projMat.mF32A[4] = 0;
					projMat.mF32A[5] = g_lastView.transform.matrix[5];
					projMat.mF32A[6] = 0;
					projMat.mF32A[7] = 0;
					
					projMat.mF32A[8] = 0;
					projMat.mF32A[9] = 0;
					projMat.mF32A[10] = g_lastView.transform.matrix[10];
					projMat.mF32A[11] = 1;
					
					projMat.mF32A[12] = 0;
					projMat.mF32A[13] = 0;
					projMat.mF32A[14] = g_lastView.transform.matrix[14];
					projMat.mF32A[15] = 0;
					/*
					projMat.arr[0] = g_lastView.transform.matrix[0];
					projMat.arr[1] = 0;
					projMat.arr[2] = 0; 
					projMat.arr[3] = 0;

					projMat.arr[4] = 0; 
					projMat.arr[5] = g_lastView.transform.matrix[5]; 
					projMat.arr[6] = 0; 
					projMat.arr[7] = 0;

					projMat.arr[8] = 0; 
					projMat.arr[9] = 0; 
					projMat.arr[10] = g_lastView.transform.matrix[10]; 
					projMat.arr[11] = 1;

					projMat.arr[12] = 0; 
					projMat.arr[13] = 0; 
					projMat.arr[14] = g_lastView.transform.matrix[14]; 
					projMat.arr[15] = 0;
					*/
				}
				else {
					projMat.mF32A[0] = g_lastView.transform.matrix[0];
					projMat.mF32A[1] = 0;
					projMat.mF32A[2] = 0;
					projMat.mF32A[3] = 0;

					projMat.mF32A[4] = 0;
					projMat.mF32A[5] = g_lastView.transform.matrix[5];
					projMat.mF32A[6] = 0;
					projMat.mF32A[7] = 0;
					
					projMat.mF32A[8] = 0;
					projMat.mF32A[9] = 0;
					projMat.mF32A[10] = g_lastView.transform.matrix[10];
					projMat.mF32A[11] = 1;
					
					projMat.mF32A[12] = 0;
					projMat.mF32A[13] = 0;
					projMat.mF32A[14] = g_lastView.transform.matrix[14];
					projMat.mF32A[15] = 0;
					
					/*
					projMat.arr[0] = g_lastView.transform.matrix[0]; 
					projMat.arr[1] = 0; 
					projMat.arr[2] = 0; 
					projMat.arr[3] = 0;

					projMat.arr[4] = 0; 
					projMat.arr[5] = g_lastView.transform.matrix[5]; 
					projMat.arr[6] = 0; 
					projMat.arr[7] = 0;

					projMat.arr[8] = 0; 
					projMat.arr[9] = 0; 
					projMat.arr[10] = g_lastView.transform.matrix[10]; 
					projMat.arr[11] = 1;

					projMat.arr[12] = 0; 
					projMat.arr[13] = 0; 
					projMat.arr[14] = g_lastView.transform.matrix[14];
					projMat.arr[15] = 0;
					*/
				}

				_cam3D.SetProjMat(projMat);

				//console.log(g_lastView.transform.orientation);

				var or = new CVec4(-g_lastView.transform.orientation.z, g_lastView.transform.orientation.y,
					g_lastView.transform.orientation.x, g_lastView.transform.orientation.w);


				var mat = CMath.QutToMat(or);

				//				console.log(or);

				var to = CMath.V3MulMatCoordi(new CVec3(100, 0, 0), mat);

				var up = CMath.V3Nor(CMath.V3MulMatCoordi(new CVec3(0, 1, 0), mat));

				//_cam3D.PF(g_xrPF);
				
				_cam3D.SetViewPort(new CVec4(g_lastViewPort.x, g_lastViewPort.y, g_lastViewPort.width, g_lastViewPort.height));
				g_lastPos = _cam3D.GetEye();
				// _cam3D.Init(CMath.V3AddV3(g_lastPos, new CVec3(0, 0, 0)),
				// 	CMath.V3AddV3(g_lastPos, to));
				if (is_VR) {
					_cam3D.Init(CMath.V3AddV3(g_lastPos, new CVec3(g_lastView.transform.position.x, 0, g_lastView.transform.position.z)),CMath.V3AddV3(g_lastPos,to));
					//_cam3D.Init(g_lastPos,CMath.V3AddV3(g_lastPos,to));
					
					//_cam3D.Init(new CVec3(g_lastView.transform.position.x, g_lastView.transform.position.y +150, g_lastView.transform.position.z), to);
				}
				else {
					//_cam3D.Init(new CVec3(g_lastView.transform.position.x, g_lastView.transform.position.y, g_lastView.transform.position.z), to);
					_cam3D.Init(CMath.V3AddV3(g_lastPos, new CVec3(g_lastView.transform.position.x, 0, g_lastView.transform.position.z)),CMath.V3AddV3(g_lastPos,to));
					// 	CMath.V3AddV3(g_lastPos, to));
				}


				_cam3D.SetUp(up);
				_cam3D.ResetPerspective();
				g_last3DCam = _cam3D;
			}


			if (_cam2D != null) {
				//_cam2D.PF(g_xrPF);
				g_last2DCam = _cam2D;
			}

			// if (!is_VR) {
			// 	g_camCon.SetMode(1);
			// }
			// else {
			// 	g_camCon.SetMode(1);
			// }

			//_cam.SetEye(g_lastView.transform.position);
		}
		else {

		}

	}
	static GetRefSpace() { return g_XRRefSpace; }
	static SupportBtn(_btn: HTMLButtonElement, _fr: CFrame,) {

		if (is_VR) {
			_btn.innerHTML = 'VR Enter';
		}
		else {
			_btn.innerHTML = 'AR Enter';
		}

		//_btn.style.display = '';
		function onSessionStarted(session:any) {
			g_resize = true;
			g_XREnter = true;
			session.addEventListener('end', onSessionEnded);
			g_XRSession = session;

			if (is_VR) {
				_btn.innerHTML = 'VR Exit';
			}
			else {
				_btn.innerHTML = 'AR Exit';
			}

			let refSpaceType = session.isImmersive ? 'local' : 'viewer';

			session.updateRenderState({ baseLayer: new XRWebGLLayer(session, _fr.Ren().Dev().GetHandle()) });
			session.requestReferenceSpace(refSpaceType).then((refSpace) => {

				g_XRRefSpace = refSpace;
				session.requestAnimationFrame(OnXRRender);
			});

		}

		function onSessionEnded( /*event*/) {
			_fr.Input().SetRay([]);
			let gl2 = _fr.Dev().GL();
			gl2.bindFramebuffer(gl2.FRAMEBUFFER, null);
			var rengl = _fr.Ren() as CRendererGL;
			rengl.SetXR(null, -1);
			
			g_XREnter = false;
			g_XRSession.removeEventListener('end', onSessionEnded);
			g_XRSession.end();
			if (is_VR) {
				_btn.innerHTML = 'VR Enter';
			}
			else {
				_btn.innerHTML = 'AR Enter';
			}


			g_XRSession = null;

			if (g_last3DCam != null) {
				var newViewPort = new CVec4(0,0,_fr.PF().mWidth,_fr.PF().mHeight);
				g_last3DCam.SetViewPort(newViewPort);
				//g_last3DCam.PF(_fr.PF()); 원본
				g_last3DCam.ResetPerspective();
			}

			if (g_last2DCam != null) {
				var newViewPort = new CVec4(0,0,_fr.PF().mWidth,_fr.PF().mHeight);
				g_last2DCam.SetViewPort(newViewPort)
				//g_last2DCam.PF(_fr.PF()); 원본
				g_last2DCam.ResetPerspective();
			}
			g_lastPos = null;

		}
		function OnXRRender(_time :number, _frame :any) {
			var time = 1;
			if (g_xrTime != 0) {
				time = _time - g_xrTime;
			}
			g_xrTime = _time;

			let session = _frame.session;

			if (is_VR) {

				var rarr = new Array<CRay>();
				for (let inputSource of session.inputSources) {
					let targetRayPose = _frame.getPose(inputSource.targetRaySpace, g_XRRefSpace);
					if (!targetRayPose) continue;


					var or = new CVec4(targetRayPose.transform.orientation.z, -targetRayPose.transform.orientation.y,
						targetRayPose.transform.orientation.x, targetRayPose.transform.orientation.w);

					var mat = CMath.QutToMat(or);
					var to = CMath.V3MulMatCoordi(new CVec3(1, 0, 0), mat);
					if (g_lastPos != null) {
						var ray = new CRay();
						ray.SetOriginal(CMath.V3AddV3(g_lastPos, new CVec3(-targetRayPose.transform.position.z, targetRayPose.transform.position.y - 50, targetRayPose.transform.position.x)));
						ray.SetDirect(to);
						rarr.push(ray);
					}

				}

				_fr.Input().SetRay(rarr);

				
				CFrame.EventCall(_fr.GetEvent(CEvent.eType.Update), time);
				//CEngin.EventCall(_engin.GetFrameEvent(CFramework.eEvent.Update), time);원본

				let pose = _frame.getViewerPose(g_XRRefSpace);
				if (pose) {

					let glLayer = session.renderState.baseLayer;
					let gl2 = CFrame.Main().Dev().GL();
					gl2.bindFramebuffer(gl2.FRAMEBUFFER, glLayer.framebuffer);
					//gl2.frontFace(gl2.CCW);
					let renderGL = _fr.Ren() as CRendererGL;
					g_framebufferWidth = glLayer.framebufferWidth;
					g_framebufferHeight = glLayer.framebufferHeight;

					for (let view of pose.views) {
						console.log(view.eye);
						renderGL.SetXR(glLayer.framebuffer, view.eye == "left" ? 0 : 1);
						let viewport = glLayer.getViewport(view);
						gl2.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
						g_lastView = view;
						g_lastViewPort = viewport;
						//CEngin.EventCall(CEngin.GetEvent(CFramework.eEvent.ViewXR),view);
						//CEngin.EventCall(_engin.GetFrameEvent(CFramework.eEvent.Render));원본
						CFrame.EventCall(_fr.GetEvent(CEvent.eType.Render),time);
						////수정부
						//console.log(viewport);
						//break;
					}
					is_init = true;
				}
			}
			else {
				CFrame.EventCall(_fr.GetEvent(CEvent.eType.Update),time);
				//CEngin.EventCall(_engin.GetFrameEvent(CFramework.eEvent.Update), time); 원본
				let pose = _frame.getViewerPose(g_XRRefSpace);
				if (pose) {
					let glLayer = session.renderState.baseLayer;
					let gl2 = CFrame.Main().Dev().GL();
					gl2.bindFramebuffer(gl2.FRAMEBUFFER, glLayer.framebuffer);
					//gl2.frontFace(gl2.CCW);
					if (glLayer.colorTexture) {
						gl2.framebufferTexture2D(gl2.FRAMEBUFFER, gl2.COLOR_ATTACHMENT0, gl2.TEXTURE_2D, glLayer.colorTexture, 0);
					}
					if (glLayer.depthStencilTexture) {
						gl2.framebufferTexture2D(gl2.FRAMEBUFFER, gl2.DEPTH_ATTACHMENT, gl2.TEXTURE_2D, glLayer.depthStencilTexture, 0);
					}
					gl2.clearColor(0.0, 0.0, 0.0, 0.0);
					gl2.clear(gl2.COLOR_BUFFER_BIT);

					let renderGL = _fr.Ren() as CRendererGL;
					g_framebufferWidth = glLayer.framebufferWidth;
					g_framebufferHeight = glLayer.framebufferHeight;

					for (let view of pose.views) {
						renderGL.SetXR(glLayer.framebuffer, view.eye == "left" ? 0 : 1);
						let viewport = glLayer.getViewport(view);
						gl2.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
						g_lastView = view;
						g_lastViewPort = viewport;
						let abc = (new CVec3(-Math.round(view.transform.position.z * 10000) * 0.3,
						Math.round(view.transform.position.y * 10000) * 0.3,
						Math.round(view.transform.position.x * 10000) * 0.3));
						
						//g_camCon.SetPos(abc);
						
						
						//CEngin.EventCall(CEngin.GetEvent(CFramework.eEvent.ViewXR),view);
						//CEngin.EventCall(_engin.GetFrameEvent(CFramework.eEvent.Render));원본
						CFrame.EventCall(_fr.GetEvent(CEvent.eType.Render),_frame);
						
						////수정부
						//console.log(viewport);
						//break;
					}
					is_init = true;
				}
			}
			CFrame.EventCall(_fr.GetEvent(CEvent.eType.Render),_frame);
			//CEngin.EventCall(_engin.GetFrameEvent(CFramework.eEvent.RenderXR), _frame);원본
			session.requestAnimationFrame(OnXRRender);
			if (g_resize)
				g_resize = false;
		}
		_btn.onclick = function () {
			if (is_VR) {
				if (g_XRSession == null) {
					navigator['xr'].requestSession('immersive-vr', {}).then(async (session) => {
						if (session instanceof XRSession) {
							await CFrame.Main().Ren().Dev().GL1().makeXRCompatible();
							//g_binding = new XRWebGLBinding(session, gl);
							session.isImmersive = true;
							onSessionStarted(session);
						}
					}).catch((error) => {
						console.error('Failed to request immersive-vr session: ' + error);
					});
				}
				else {
					g_XRSession.end();
				}
			}
			else {
				if (g_XRSession == null) {
					navigator['xr'].requestSession('immersive-ar', {}).then(async (session) => {
						if (session instanceof XRSession) {
							await CFrame.Main().Dev().GL().makeXRCompatible();
							//g_binding = new XRWebGLBinding(session, gl);
							session.isImmersive = true;
							onSessionStarted(session);
						}
					}).catch((error) => {
						console.error('Failed to request immersive-ar session: ' + error);
					});

					navigator['xr'].requestSession('inline').then(onSessionStarted).catch((error) => {
						console.error('Failed to request inline session: ' + error);
					});
				} else {
					g_XRSession.end();
				}
			}


		};

	}
	static NotSupportBtn(_btn: HTMLButtonElement) {

		_btn.innerHTML = 'WEBXR Not Support';
		_btn.disabled = true;

	}
	//static XRButton(_fr: CFramework, _engin: CEngin, _g_camCon: CCamControl, _body = false, _isVr = true) {
	static XRButton(_fr: CFrame, _body = false, _isVr = true) {

		is_VR = _isVr;
		//g_camCon = _g_camCon;

		//g_XRRender=_XRRender;
		const button = document.createElement('button');
		button.className = "btn btn-outline-primary";
		//button.style.display = 'none';

		if (_fr.PF().mXR == false) {
			CWebXR.NotSupportBtn(button);
			CAlert.E("xr on plz!");
			return button;
		}

		if ('xr' in navigator) {

			button.id = 'XRButton';

			if (_isVr) {
				//stylizeElement( button );
				navigator["xr"].isSessionSupported('immersive-vr').then(function (supported) {
					button.style.display = '';
					//supported ? CWebXR.SupportBtn(button, _fr, _engin) : CWebXR.NotSupportBtn(button); 원본
					supported ? CWebXR.SupportBtn(button, _fr) : CWebXR.NotSupportBtn(button);
					if (supported && g_xrSessionIsGranted) {
						button.click();
					}
				});
			}
			else {
				navigator["xr"].isSessionSupported('immersive-ar').then(function (supported) {
					button.style.display = '';
					//supported ? CWebXR.SupportBtn(button, _fr, _engin) : CWebXR.NotSupportBtn(button); 원본
					supported ? CWebXR.SupportBtn(button, _fr) : CWebXR.NotSupportBtn(button);
					if (supported && g_xrSessionIsGranted) {
						button.click();
					}
				});
			}
		}
		else {


			if (window.isSecureContext === false) {

				button.onclick = () => { location.href = document.location.href.replace(/^http:/, 'https:'); };
				button.innerHTML = 'Needs HTTPS';

			}
			else {
				CWebXR.NotSupportBtn(button);
			}



		}
		if (_body) {
			button.style.position = "absolute";
			button.style.top = "100px";
			//button.style="position: absolute;top: 100px;";
			document.body.append(button);
		}
		return button;
	}
	static registerSessionGrantedListener() {

		if ('xr' in navigator) {
			if (/WebXRViewer\//i.test(navigator.userAgent)) return;

			navigator["xr"].addEventListener('sessiongranted', () => {

				g_xrSessionIsGranted = true;

			});

		}

	}
	/*
	static SetXrPad(_gamepad: any = null, _handle: any = null, _ray: any = null) {
        if(_gamepad != null){
            if(this.CheckGamepad()) {
                if(_handle == "left"){
                    g_padLeft = _gamepad;
                    g_padLeftRay = _ray;
                    if(g_padLeft.buttons[4].pressed) CInput.KeyDown(Df.Key.PadRight3) = true;
                    if(g_padLeft.buttons[5].pressed) CInput.KeyDown(Df.Key.PadRight0) = true;
                    if(g_padLeft.buttons[1].pressed) CInput.KeyDown(Df.Key.PadFront0) = true;
                    if(g_padLeft.buttons[0].pressed) CInput.KeyDown(Df.Key.PadFront3) = true;
                    if(g_padLeft.buttons[3].pressed) CInput.KeyDown(Df.Key.PadLeftAxes) = true;
                    for (let i = 0, j = 0; i < g_padLeft.axes.length; i+=2, ++j){
                        if(g_padLeft.axes[i] > 0.5 ||g_padLeft.axes[i] < -0.5) CInput.m_padAxes[0].x = g_padLeft.axes[i];
                        if(g_padLeft.axes[i+1] > 0.5 ||g_padLeft.axes[i+1] < -0.5) CInput.m_padAxes[0].y = g_padLeft.axes[i+1];
                    }
                }
                if(_handle == "right"){
                    g_padRight = _gamepad;
                    g_padRightRay = _ray;
                    if(g_padRight.buttons[4].pressed) CInput.m_keyPress[Df.Key.PadRight1] = true;
                    if(g_padRight.buttons[5].pressed) CInput.m_keyPress[Df.Key.PadRight2] = true;
                    if(g_padRight.buttons[1].pressed) CInput.m_keyPress[Df.Key.PadFront1] = true;
                    if(g_padRight.buttons[0].pressed) CInput.m_keyPress[Df.Key.PadFront2] = true;
                    if(g_padRight.buttons[3].pressed) CInput.m_keyPress[Df.Key.PadRightAxes] = true;
                    for (let i = 0, j = 0; i < g_padRight.axes.length; i+=2, ++j){
                        if(g_padRight.axes[i] > 0.5 ||g_padRight.axes[i] < -0.5) CInput.m_padAxes[1].x = g_padRight.axes[i];
                        if(g_padRight.axes[i+1] > 0.5 ||g_padRight.axes[i+1] < -0.5) CInput.m_padAxes[1].y = g_padRight.axes[i+1];
                    }
                }
            }
            else{
                if(_handle == "left"){
                    g_padLeft = _gamepad;
                    g_padLeftRay = _ray;
                    CInput.m_keyPress[Df.Key.PadRight3] = g_padLeft.buttons[4].pressed;
                    CInput.m_keyPress[Df.Key.PadRight0] = g_padLeft.buttons[5].pressed;
                    CInput.m_keyPress[Df.Key.PadFront0] = g_padLeft.buttons[1].pressed;
                    CInput.m_keyPress[Df.Key.PadFront3] = g_padLeft.buttons[0].pressed;
                    CInput.m_keyPress[Df.Key.PadLeftAxes] = g_padLeft.buttons[3].pressed;
                    for (let i = 0, j = 0; i < g_padLeft.axes.length; i+=2, ++j){
                        CInput.m_padAxes[0].x = g_padLeft.axes[i];
                        CInput.m_padAxes[0].y = g_padLeft.axes[i+1];
                    }
                }
                if(_handle == "right"){
                    g_padRight = _gamepad;
                    g_padRightRay = _ray;
                    CInput.m_keyPress[Df.Key.PadRight1] = g_padRight.buttons[4].pressed;
                    CInput.m_keyPress[Df.Key.PadRight2] = g_padRight.buttons[5].pressed;
                    CInput.m_keyPress[Df.Key.PadFront1] = g_padRight.buttons[1].pressed;
                    CInput.m_keyPress[Df.Key.PadFront2] = g_padRight.buttons[0].pressed;
                    CInput.m_keyPress[Df.Key.PadRightAxes] = g_padRight.buttons[3].pressed;
                    for (let i = 0, j = 0; i < g_padRight.axes.length; i+=2, ++j){
                        CInput.m_padAxes[1].x = g_padRight.axes[i];
                        CInput.m_padAxes[1].y = g_padRight.axes[i+1];
                    }
                }
            }
        }
        else{
            g_padLeft = null;
            g_padRight = null;
            g_padLeftRay = null;
            g_padRightRay = null;
            g_firstPosRad = null;
            g_padAxes[0].x = 0;
            g_padAxes[0].y = 0;
            g_padAxes[1].x = 0;
            g_padAxes[1].y = 0;
        }
    }
    static CheckGamepad(){
        if (navigator['getGamepads'] !== undefined) {
            var gamepads = navigator.getGamepads();
            if (gamepads[0] != null) return true;
            else return false;
        }
        return false;
    }
		*/
}
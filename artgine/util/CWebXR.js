import { CAlert } from "../basic/CAlert.js";
import { CEvent } from "../basic/CEvent.js";
import { CPreferences } from "../basic/CPreferences.js";
import { CMat } from "../geometry/CMat.js";
import { CMath } from "../geometry/CMath.js";
import { CRay } from "../geometry/CRay.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CVec4 } from "../geometry/CVec4.js";
import { CFrame } from "./CFrame.js";
var g_xrSessionIsGranted = false;
var g_XRSession = null;
var g_XRRefSpace = null;
var g_XREnter = false;
var g_xrTime = 0;
var g_lastView = null;
var g_lastViewPort = null;
var g_framebufferWidth = null;
var g_framebufferHeight = null;
var g_last3DCam = null;
var g_last2DCam = null;
var g_resize = false;
var g_lastPos = null;
var g_firstPos = new CVec3;
var g_firstPosRad = null;
var g_padRight = null;
var g_padLeft = null;
var g_padRightRay = null;
var g_padLeftRay = null;
var g_padAxes = [new CVec3, new CVec3];
var g_xrPF = new CPreferences();
var is_VR = true;
var is_init = false;
export class CWebXR {
    static LastViewPort() { return g_lastViewPort; }
    static IsResize() {
        return g_resize;
    }
    static IsEnter() {
        return g_XREnter;
    }
    static CameraReset(_cam3D, _cam2D) {
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
                }
                _cam3D.SetProjMat(projMat);
                var or = new CVec4(-g_lastView.transform.orientation.z, g_lastView.transform.orientation.y, g_lastView.transform.orientation.x, g_lastView.transform.orientation.w);
                var mat = CMath.QutToMat(or);
                var to = CMath.V3MulMatCoordi(new CVec3(100, 0, 0), mat);
                var up = CMath.V3Nor(CMath.V3MulMatCoordi(new CVec3(0, 1, 0), mat));
                _cam3D.SetViewPort(new CVec4(g_lastViewPort.x, g_lastViewPort.y, g_lastViewPort.width, g_lastViewPort.height));
                g_lastPos = _cam3D.GetEye();
                if (is_VR) {
                    _cam3D.Init(CMath.V3AddV3(g_lastPos, new CVec3(g_lastView.transform.position.x, 0, g_lastView.transform.position.z)), CMath.V3AddV3(g_lastPos, to));
                }
                else {
                    _cam3D.Init(CMath.V3AddV3(g_lastPos, new CVec3(g_lastView.transform.position.x, 0, g_lastView.transform.position.z)), CMath.V3AddV3(g_lastPos, to));
                }
                _cam3D.SetUp(up);
                _cam3D.ResetPerspective();
                g_last3DCam = _cam3D;
            }
            if (_cam2D != null) {
                g_last2DCam = _cam2D;
            }
        }
        else {
        }
    }
    static GetRefSpace() { return g_XRRefSpace; }
    static SupportBtn(_btn, _fr) {
        if (is_VR) {
            _btn.innerHTML = 'VR Enter';
        }
        else {
            _btn.innerHTML = 'AR Enter';
        }
        function onSessionStarted(session) {
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
        function onSessionEnded() {
            _fr.Input().SetRay([]);
            let gl2 = _fr.Dev().GL();
            gl2.bindFramebuffer(gl2.FRAMEBUFFER, null);
            var rengl = _fr.Ren();
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
                var newViewPort = new CVec4(0, 0, _fr.PF().mWidth, _fr.PF().mHeight);
                g_last3DCam.SetViewPort(newViewPort);
                g_last3DCam.ResetPerspective();
            }
            if (g_last2DCam != null) {
                var newViewPort = new CVec4(0, 0, _fr.PF().mWidth, _fr.PF().mHeight);
                g_last2DCam.SetViewPort(newViewPort);
                g_last2DCam.ResetPerspective();
            }
            g_lastPos = null;
        }
        function OnXRRender(_time, _frame) {
            var time = 1;
            if (g_xrTime != 0) {
                time = _time - g_xrTime;
            }
            g_xrTime = _time;
            let session = _frame.session;
            if (is_VR) {
                var rarr = new Array();
                for (let inputSource of session.inputSources) {
                    let targetRayPose = _frame.getPose(inputSource.targetRaySpace, g_XRRefSpace);
                    if (!targetRayPose)
                        continue;
                    var or = new CVec4(targetRayPose.transform.orientation.z, -targetRayPose.transform.orientation.y, targetRayPose.transform.orientation.x, targetRayPose.transform.orientation.w);
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
                let pose = _frame.getViewerPose(g_XRRefSpace);
                if (pose) {
                    let glLayer = session.renderState.baseLayer;
                    let gl2 = CFrame.Main().Dev().GL();
                    gl2.bindFramebuffer(gl2.FRAMEBUFFER, glLayer.framebuffer);
                    let renderGL = _fr.Ren();
                    g_framebufferWidth = glLayer.framebufferWidth;
                    g_framebufferHeight = glLayer.framebufferHeight;
                    for (let view of pose.views) {
                        console.log(view.eye);
                        renderGL.SetXR(glLayer.framebuffer, view.eye == "left" ? 0 : 1);
                        let viewport = glLayer.getViewport(view);
                        gl2.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
                        g_lastView = view;
                        g_lastViewPort = viewport;
                        CFrame.EventCall(_fr.GetEvent(CEvent.eType.Render), time);
                    }
                    is_init = true;
                }
            }
            else {
                CFrame.EventCall(_fr.GetEvent(CEvent.eType.Update), time);
                let pose = _frame.getViewerPose(g_XRRefSpace);
                if (pose) {
                    let glLayer = session.renderState.baseLayer;
                    let gl2 = CFrame.Main().Dev().GL();
                    gl2.bindFramebuffer(gl2.FRAMEBUFFER, glLayer.framebuffer);
                    if (glLayer.colorTexture) {
                        gl2.framebufferTexture2D(gl2.FRAMEBUFFER, gl2.COLOR_ATTACHMENT0, gl2.TEXTURE_2D, glLayer.colorTexture, 0);
                    }
                    if (glLayer.depthStencilTexture) {
                        gl2.framebufferTexture2D(gl2.FRAMEBUFFER, gl2.DEPTH_ATTACHMENT, gl2.TEXTURE_2D, glLayer.depthStencilTexture, 0);
                    }
                    gl2.clearColor(0.0, 0.0, 0.0, 0.0);
                    gl2.clear(gl2.COLOR_BUFFER_BIT);
                    let renderGL = _fr.Ren();
                    g_framebufferWidth = glLayer.framebufferWidth;
                    g_framebufferHeight = glLayer.framebufferHeight;
                    for (let view of pose.views) {
                        renderGL.SetXR(glLayer.framebuffer, view.eye == "left" ? 0 : 1);
                        let viewport = glLayer.getViewport(view);
                        gl2.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
                        g_lastView = view;
                        g_lastViewPort = viewport;
                        let abc = (new CVec3(-Math.round(view.transform.position.z * 10000) * 0.3, Math.round(view.transform.position.y * 10000) * 0.3, Math.round(view.transform.position.x * 10000) * 0.3));
                        CFrame.EventCall(_fr.GetEvent(CEvent.eType.Render), _frame);
                    }
                    is_init = true;
                }
            }
            CFrame.EventCall(_fr.GetEvent(CEvent.eType.Render), _frame);
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
                            session.isImmersive = true;
                            onSessionStarted(session);
                        }
                    }).catch((error) => {
                        console.error('Failed to request immersive-ar session: ' + error);
                    });
                    navigator['xr'].requestSession('inline').then(onSessionStarted).catch((error) => {
                        console.error('Failed to request inline session: ' + error);
                    });
                }
                else {
                    g_XRSession.end();
                }
            }
        };
    }
    static NotSupportBtn(_btn) {
        _btn.innerHTML = 'WEBXR Not Support';
        _btn.disabled = true;
    }
    static XRButton(_fr, _body = false, _isVr = true) {
        is_VR = _isVr;
        const button = document.createElement('button');
        button.className = "btn btn-outline-primary";
        if (_fr.PF().mXR == false) {
            CWebXR.NotSupportBtn(button);
            CAlert.E("xr on plz!");
            return button;
        }
        if ('xr' in navigator) {
            button.id = 'XRButton';
            if (_isVr) {
                navigator["xr"].isSessionSupported('immersive-vr').then(function (supported) {
                    button.style.display = '';
                    supported ? CWebXR.SupportBtn(button, _fr) : CWebXR.NotSupportBtn(button);
                    if (supported && g_xrSessionIsGranted) {
                        button.click();
                    }
                });
            }
            else {
                navigator["xr"].isSessionSupported('immersive-ar').then(function (supported) {
                    button.style.display = '';
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
            document.body.append(button);
        }
        return button;
    }
    static registerSessionGrantedListener() {
        if ('xr' in navigator) {
            if (/WebXRViewer\//i.test(navigator.userAgent))
                return;
            navigator["xr"].addEventListener('sessiongranted', () => {
                g_xrSessionIsGranted = true;
            });
        }
    }
}

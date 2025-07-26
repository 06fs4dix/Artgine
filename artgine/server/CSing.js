import { CHash } from "../basic/CHash.js";
import { CPath } from "../basic/CPath.js";
import { CStorage } from "../system/CStorage.js";
export class CSingOption extends CObject {
    mLoginBtn = "ussLogin";
    mJoinBtn = "ussJoin";
    mJoinTag = null;
    mFindPWBtn = null;
    mLogoutBtn = "ussLogout";
    mID = "ussID";
    mPW = "ussPW";
    mFirebaseCard = "firebaseCard";
    mFirebaseAnoBtn = "firebaseAno";
    mFirebaseEmailBtn = "firebaseEmail";
    mFirebasePhoneBtn = "firebasePhone";
    mKakaoBtn = "ussKakao";
    mNaverBtn = "ussNaver";
    mGoogleBtn = "ussGoogle";
    mModifyBtn = "ussModify";
    mReturnURL = null;
}
var gInfoMap = new Map();
var gEventMap = new Map;
export class CSing {
    static eEvent = {
        "JoinSubmit": "JoinSubmit",
        "JoinInit": "JoinInit",
        "State": "State",
        "Init": "Init",
        "Insert": "Insert",
    };
    static On(_key, _event) {
        gEventMap.set(_key, CEvent.ToCEvent(_event));
    }
    static GetEvent(_key) {
        let event = gEventMap.get(_key);
        if (event == null)
            event = CEvent.Default();
        return event;
    }
    static MapGet(_key) {
        let data = gInfoMap.get(_key);
        if (data == null) {
            let dataStr = CStorage.Get(_key);
            if (dataStr != null) {
                let datajson = JSON.parse(dataStr);
                if (new CTimer(datajson.time).Delay() < 1000 * 60 * 60) {
                    return datajson.data;
                }
            }
        }
        return data;
    }
    static PublicInfo(_key = null, _tag = null) {
        return new Promise(async (resolve, reject) => {
            let write = false;
            let data = CSing.MapGet(_key);
            if (data == null) {
                data = await CFecth.Exe("Sing/PublicInfo", { key: _key }, "json");
                write = true;
            }
            if (_tag != null) {
                for (let i = 0; i < _tag.length; ++i) {
                    if (data[_tag[i]] == null) {
                        data[_tag[i]] = await CFecth.Exe("Sing/Tag", { publicKey: data._publicKey, tag: _tag[i] }, "json");
                        write = true;
                    }
                }
            }
            if (write) {
                gInfoMap.set(_key, data);
                CStorage.Set(_key, JSON.stringify({ time: new CTimer().mBegin, data: data }));
            }
            resolve(data);
        });
    }
    static PrivateInfo(_key, _tag = null) {
        return new Promise(async (resolve, reject) => {
            let write = false;
            let data = CSing.MapGet(_key);
            if (data == null) {
                let r = await CFecth.Exe("Sing/PrivateInfo", { key: _key }, "json");
                data = r[0];
                write = true;
            }
            if (_tag != null) {
                for (let i = 0; i < _tag.length; ++i) {
                    if (data[_tag[i]] == null) {
                        let r = await CFecth.Exe("Sing/Tag", { publicKey: data._publicKey, tag: _tag[i] }, "json");
                        data[_tag[i]] = r[0];
                        write = true;
                    }
                }
            }
            if (write) {
                gInfoMap.set(_key, data);
                CStorage.Set(_key, JSON.stringify({ time: new CTimer().mBegin, data: data }));
            }
            resolve(data);
        });
    }
    static PrivateKey() {
        return CStorage.Get("privateKey");
    }
    static ModifyMode() {
        ModifyFun(CSing.PrivateKey());
    }
    static async InitForm(_option = new CSingOption()) {
        CStorage.Set("loginType", null);
        if (_option.mReturnURL == null)
            CStorage.Set("returnURL", CPath.FullPath());
        else
            CStorage.Set("returnURL", _option.mReturnURL);
        let main = { '<>': 'div', 'html': [
                { "<>": "div", "id": "loginDiv", 'html': [], 'hidden': true },
                { "<>": "div", "id": "logoutDiv", 'html': [], 'hidden': true },
                { "<>": "div", "id": "joinDiv", 'html': [], 'hidden': true },
                { "<>": "div", "id": "findPWDiv", 'html': [], 'hidden': true, 'class': 'card text-center', 'style': 'width:23rem;margin:0 auto;' },
                { "<>": "div", "id": "firebaseCardDiv", 'html': [] },
            ] };
        let loginDiv = main.html[0].html;
        let logoutDiv = main.html[1].html;
        let joinDiv = main.html[2].html;
        let findPWDiv = main.html[3].html;
        let firebaseCardDiv = main.html[4].html;
        findPWDiv.push({ '<>': 'div', 'class': 'card header', 'id': 'findPWCardHeader', 'data-LG': CLan.T('CUSS.PWFindTitle', '비번찾기') });
        findPWDiv.push({ '<>': 'div', 'class': 'card-body', 'html': [
                { '<>': 'label', "for": "email_txt" },
                { '<>': 'input', "type": "text", "class": "form-control", "id": "email_txt",
                    "placeholder": "", "data-LG": CLan.T('CUSS.FindEmail', "이메일을 입력하세요") },
                { '<>': 'label', "for": "code_txt" },
                { '<>': 'input', "type": "text", "class": "form-control", "id": "code_txt",
                    "placeholder": "", "data-LG": CLan.T('CUSS.FindEmailCode', "이메일에서 확인된 코드를 입력해주세요"), 'disabled': 'disabled' },
                { '<>': 'button', 'type': 'button', 'class': 'btn btn-secondary float-left', 'id': 'findPWCardBackBtn',
                    "data-LG": CLan.T('CUSS.Cancel', '취소'), "onclick": () => {
                        CUtil.ID("findPWDiv").hidden = true;
                    } },
                { '<>': 'button', "type": "button", "class": "btn btn-primary float-right", 'id': 'findPWCardNextBtn',
                    "data-LG": CLan.T('CUSS.Next', "다음"), "onclick": () => {
                        let code = CUtil.ID("code_txt");
                        let email = CUtil.ID("email_txt");
                        let btn = CUtil.ID("findPWCardNextBtn");
                        if (email.disabled == false) {
                            email.disabled = true;
                            btn.hidden = true;
                            CFecth.Exe("Sing/FindPW", { email: email.value, value: "" }).then(() => {
                                code.disabled = false;
                                btn.hidden = false;
                            });
                        }
                        else if (code.disabled == false) {
                            code.disabled = true;
                            btn.hidden = true;
                            CFecth.Exe("Sing/FindPW", { email: email.value, value: code.value }).then((_error) => {
                                btn.hidden = false;
                                if (_error == "-1") {
                                    code.disabled = false;
                                    CAlert.Info("잘못된 코드 입니다");
                                }
                                else if (_error == "-2") {
                                    email.disabled = false;
                                    code.value = "";
                                    CAlert.Info("존재하지 않는 이메일 입니다");
                                }
                                else {
                                    ModifyFun(_error);
                                }
                            });
                        }
                    } }
            ] });
        if (_option.mModifyBtn != null) {
            var modifyBtn = CUtil.ID(_option.mModifyBtn);
            let modifyFun = () => {
                ModifyFun(CSing.PrivateKey());
                CSing.GetEvent(CSing.eEvent.JoinInit).Call(CUtil.ID('joinDiv'));
            };
            if (modifyBtn != null) {
                modifyBtn.onclick = modifyFun;
            }
            else {
                logoutDiv.push({ '<>': 'button', 'type': 'button', 'class': 'btn btn-danger btn-lg w-100', "id": "ModifyBtn",
                    "onclick": modifyFun, "data-LG": CLan.T('CUSS.Modify', "정보수정") });
            }
        }
        if (_option.mLogoutBtn != null) {
            var logoutBtn = CUtil.ID(_option.mLogoutBtn);
            let logoutFun = () => {
                var privateKey = CStorage.Get("privateKey");
                CUtil.ID("loginDiv").hidden = false;
                CUtil.ID("logoutDiv").hidden = true;
                CStorage.Set("loginType", null);
                CStorage.Set("privateKey", null);
                CStorage.Set("publicKey", null);
                CStorage.Set(privateKey, null);
                CSing.GetEvent(CSing.eEvent.State).Call();
            };
            if (logoutBtn != null) {
                logoutBtn.onclick = logoutFun;
            }
            else {
                logoutDiv.push({ '<>': 'button', 'type': 'button', 'class': 'btn btn-primary btn-lg w-100', "id": "IDBtn",
                    "onclick": logoutFun, "data-LG": CLan.T('CUSS.Logout', "로그아웃") });
            }
        }
        let loginFun = () => {
            var id_txt = CUtil.IDValue("id_txt");
            var pw_txt = CUtil.IDValue("pw_txt");
            UserLogin(CHash.SHA256(CHash.SHA256(id_txt + "_" + pw_txt))).then((_error) => {
                if (_error == false) {
                    CUtil.ID("loginDiv").hidden = true;
                    CUtil.ID("logoutDiv").hidden = false;
                }
            });
        };
        if (_option.mID != null) {
            loginDiv.push({ '<>': "input", 'type': 'text', 'class': 'form-control w-100', "id": "id_txt", "placeholder": "", "data-LG": CLan.T('CUSS.ID', "아이디"),
                "style": "width:220px;margin:0 auto;" });
            loginDiv.push({ '<>': "input", 'type': 'password', 'class': 'form-control w-100', "id": "pw_txt", "placeholder": "", "data-LG": CLan.T('CUSS.PW', "비밀번호"),
                "style": "width:220px;margin:0 auto;", 'onkeyup': () => {
                    if (window.event["keyCode"] == 13)
                        loginFun();
                }
            });
        }
        if (_option.mLoginBtn != null) {
            var loginBtn = CUtil.ID(_option.mLoginBtn);
            if (loginBtn != null) {
                logoutBtn.onclick = loginFun;
            }
            else {
                loginDiv.push({ '<>': 'button', 'type': 'button', 'class': 'btn btn-primary w-100', "style": "width:220px;margin:4px auto;",
                    "onclick": function () { loginFun(); }, "data-LG": CLan.T('CUSS.Login', "로그인") });
            }
        }
        if (_option.mJoinBtn != null) {
            let joinFun = () => {
                CUtil.ID('loginDiv').hidden = true;
                CUtil.ID('logoutDiv').hidden = true;
                CUtil.ID('joinDiv').hidden = false;
                CSing.GetEvent(CSing.eEvent.JoinInit).Call();
            };
            var joinBtn = CUtil.ID(_option.mJoinBtn);
            if (joinBtn != null) {
                joinBtn.onclick = joinFun;
            }
            else {
                loginDiv.push({ '<>': 'button', 'type': 'button', 'class': 'btn btn-secondary w-100', "style": "width:220px;margin:4px auto;",
                    "onclick": joinFun, "data-LG": CLan.T('CUSS.Join', "가입") });
            }
        }
        if (_option.mFindPWBtn != null) {
            let findPWFun = () => {
                var btn = CUtil.ID(_option.mFindPWBtn);
                var card = CUtil.ID("findPWDiv");
                btn.insertAdjacentElement('afterend', card);
                card.hidden = false;
                CUtil.ID("email_txt").disabled = false;
                CUtil.ID("code_txt").disabled = true;
            };
            var findPWBtn = CUtil.ID(_option.mFindPWBtn);
            if (findPWBtn != null) {
                findPWBtn.onclick = findPWFun;
            }
            else {
                loginDiv.push({ '<>': 'button', 'type': 'button', 'class': 'btn btn-success w-100',
                    "style": "width:220px;margin:4px auto;", 'id': _option.mFindPWBtn,
                    "onclick": findPWFun, "data-LG": CLan.T('CUSS.FindPW', "비번찾기") });
            }
        }
        let state = CUniqueID.GetHash();
        if (_option.mKakaoBtn != null) {
            let kakaoFun = () => {
                window.location.href = 'https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=ad6b11b2c011ad95aadb7d8ec5658d13&redirect_uri=' +
                    CPath.PHPC() + "OAuth/Kakao&state=" + state;
            };
            var kakaoBtn = document.getElementById(_option.mKakaoBtn);
            if (kakaoBtn != null) {
                kakaoBtn.onclick = kakaoFun;
            }
            else {
                loginDiv.push({ '<>': 'button', 'type': 'button', 'class': 'btn btn-outline-warning w-100', 'onclick': kakaoFun, 'id': _option.mKakaoBtn,
                    'style': 'width:220px; margin:4px auto;', 'html': [
                        { '<>': 'i', 'class': 'bi bi-chat-dots' },
                        { '<>': 'text', 'data-LG': CLan.T('CUSS.Kakao', "카카오톡") }
                    ]
                });
            }
        }
        if (_option.mNaverBtn != null) {
            let naverFun = () => {
                window.location.href = 'https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=UDp9HJZoGIarIZglhM2T&redirect_uri=' +
                    CPath.PHPC() + "OAuthNaver&state=" + state;
            };
            var kakaoBtn = document.getElementById(_option.mNaverBtn);
            if (kakaoBtn != null) {
                kakaoBtn.onclick = naverFun;
            }
            else {
                loginDiv.push({ '<>': 'button', 'type': 'button', 'class': 'btn btn-outline-success w-100', 'onclick': naverFun, 'id': _option.mNaverBtn,
                    'style': 'width:220px; margin:4px auto;', 'html': [
                        { '<>': 'i', 'class': 'bi bi-chat-dots' },
                        { '<>': 'text', 'data-LG': CLan.T('CUSS.Naver', "네이버") }
                    ]
                });
            }
        }
        if (_option.mGoogleBtn != null) {
            let googleFun = () => {
                window.location.href = "https://accounts.google.com/o/oauth2/v2/auth?response_type=code" +
                    "&client_id=105997798370-insqhtjufjldp899c44ekbandk4b7jrn.apps.googleusercontent.com" +
                    "&scope=https://www.googleapis.com/auth/userinfo.email" +
                    "&redirect_uri=" + CPath.PHPC() + "/OAuthGoogle&state=" + state;
            };
            var googleBtn = document.getElementById(_option.mGoogleBtn);
            if (googleBtn != null) {
                googleBtn.onclick = googleFun;
            }
            else {
                loginDiv.push({ '<>': 'button', 'type': 'button', 'class': 'btn btn-outline-danger w-100', 'onclick': googleFun, 'id': _option.mGoogleBtn,
                    'style': 'width:220px; margin:4px auto;', 'html': [
                        { '<>': 'i', 'class': 'bi bi-chat-dots' },
                        { '<>': 'text', 'data-LG': CLan.T('CUSS.Google', "구글") }
                    ]
                });
            }
        }
        if (initializeApp == null && (_option.mFirebaseAnoBtn != null || _option.mFirebaseEmailBtn != null || _option.mFirebasePhoneBtn != null)) {
            const appMod = await import('../external/esnext/firebase/firebase_app.js');
            const authMod = await import('../external/esnext/firebase/firebase_auth.js');
            initializeApp = appMod.initializeApp;
            getAuth = authMod.getAuth;
            createUserWithEmailAndPassword = authMod.createUserWithEmailAndPassword;
            signInWithEmailAndPassword = authMod.signInWithEmailAndPassword;
            onAuthStateChanged = authMod.onAuthStateChanged;
            GoogleAuthProvider = authMod.GoogleAuthProvider;
            RecaptchaVerifier = authMod.RecaptchaVerifier;
            signInWithPhoneNumber = authMod.signInWithPhoneNumber;
            signInAnonymously = authMod.signInAnonymously;
            linkWithCredential = authMod.linkWithCredential;
            signInWithPopup = authMod.signInWithPopup;
            signInWithRedirect = authMod.signInWithRedirect;
            getRedirectResult = authMod.getRedirectResult;
            signOut = authMod.signOut;
            app = initializeApp(firebaseConfig);
            g_firebaseAuth = getAuth(app);
            g_firebaseAuth.useDeviceLanguage();
        }
        if (_option.mFirebaseAnoBtn != null) {
            var anoBtn = document.getElementById(_option.mFirebaseAnoBtn);
            if (anoBtn != null) {
                anoBtn.onclick = FireBaseAnonymousLogin;
            }
            else {
                loginDiv.push({ '<>': "button", 'type': 'button', 'class': 'btn btn-outline-info w-100', 'id': _option.mFirebaseAnoBtn,
                    'style': 'width:220px;margin:4px auto;', 'onclick': FireBaseAnonymousLogin, 'html': [
                        { '<>': 'i', 'class': 'bi bi-person' },
                        { '<>': 'text', 'data-LG': CLan.T('CUSS.Anonymous', "익명") }
                    ]
                });
            }
        }
        if (_option.mFirebaseEmailBtn != null) {
            var emailBtn = document.getElementById(_option.mFirebaseEmailBtn);
            if (emailBtn != null) {
                emailBtn.onclick = function () { emailNextBtnEvent(_option.mFirebaseEmailBtn); };
            }
            else {
                loginDiv.push({ '<>': "button", 'type': 'button', 'class': 'btn btn-outline-danger w-100', 'id': _option.mFirebaseEmailBtn,
                    'style': 'width:220px;margin:4px auto;', 'onclick': function () { emailNextBtnEvent(_option.mFirebaseEmailBtn); }, 'html': [
                        { '<>': 'i', 'class': 'bi bi-envelope' },
                        { '<>': 'text', 'data-LG': CLan.T('CUSS.Email', "이메일") }
                    ]
                });
            }
        }
        if (_option.mFirebasePhoneBtn != null) {
            var phoneBtn = document.getElementById(_option.mFirebasePhoneBtn);
            if (phoneBtn != null) {
                phoneBtn.onclick = function () { phoneNextBtnEvent(_option.mFirebasePhoneBtn); };
            }
            else {
                loginDiv.push({ '<>': "button", 'type': 'button', 'class': 'btn btn-outline-primary w-100', 'id': _option.mFirebasePhoneBtn,
                    'style': 'width:220px;margin:4px auto;', 'onclick': function () { phoneNextBtnEvent(_option.mFirebasePhoneBtn); }, 'html': [
                        { '<>': 'i', 'class': 'bi bi-phone' },
                        { '<>': 'text', 'data-LG': CLan.T('CUSS.Phone', "전화번호") }
                    ]
                });
            }
        }
        firebaseCardDiv.push({ '<>': 'div', 'class': 'card text-center', 'id': _option.mFirebasePhoneBtn + 'Card',
            'style': 'width:23rem;margin:0 auto;', 'hidden': 'true', 'html': [
                { '<>': 'div', 'class': 'card-header', 'id': _option.mFirebasePhoneBtn + 'CardHeader', 'data-LG': CLan.T('CUSS.TelTitle_InputTel', '전화번호 입력') },
                { '<>': 'div', 'class': 'card-body', 'html': [
                        { '<>': 'center', 'class': 'input-group mb-3', 'html': [
                                { '<>': 'span', 'class': 'input-group-text', 'data-LG': CLan.T('CUSS.Tel', '전화번호') },
                                { '<>': 'input', 'type': 'tel', 'name': 'phoneNumber', 'class': 'card-text', 'id': 'Tel', 'placeholder': "", "data-LG": CLan.T('CUSS.Tel', '전화번호') }
                            ] },
                        { '<>': 'center', 'id': 'recaptcha-container' },
                        { '<>': 'br' },
                        { '<>': 'div', 'id': 'recaptcha-code-container', 'hidder': 'true', 'html': [
                                { '<>': 'center', 'class': 'input-group mb-3', 'html': [
                                        { '<>': 'span', 'class': 'input-group-text', 'data-LG': CLan.T('CUSS.RecaptchaCode', '인증번호') },
                                        { '<>': 'input', 'type': 'number', 'id': 'recaptchaCode', 'placeholder': "", "data-LG": CLan.T('CUSS.RecaptchaCode', '인증번호') }
                                    ] }
                            ] },
                        { '<>': 'h6', 'id': 'PhoneErrorMessage' },
                        { '<>': 'br' },
                        { '<>': 'button', 'type': 'button', 'class': 'btn btn-secondary float-left',
                            'id': _option.mFirebasePhoneBtn + 'CardBackBtn', 'data-LG': CLan.T('CUSS.Cancel', '취소'),
                            'onclick': function () { phoneBackBtnEvent(_option.mFirebasePhoneBtn); } },
                        { '<>': 'button', 'type': 'button', 'class': 'btn btn-primary float-right',
                            'id': _option.mFirebasePhoneBtn + 'CardNextBtn', 'data-LG': CLan.T('CUSS.Enter', '다음'),
                            'onclick': function () { phoneNextBtnEvent(_option.mFirebasePhoneBtn); } }
                    ] }
            ]
        }, { '<>': 'div', 'class': 'card text-center', 'id': _option.mFirebaseEmailBtn + 'Card',
            'style': 'width:23rem;margin:0 auto;', 'hidden': 'true', 'html': [
                { '<>': 'div', 'class': 'card header', 'id': _option.mFirebaseEmailBtn + 'CardHeader',
                    'data-LG': CLan.T('CUSS.EmailTitle_InputEmail', '이메일 입력') },
                { '<>': 'div', 'class': 'card-body', 'html': [
                        { '<>': 'center', 'class': 'input-group mb-3', 'id': 'EmailDiv', 'html': [
                                { '<>': 'span', 'class': 'input-group-text', 'data-LG': CLan.T('CUSS.Email', '이메일') },
                                { '<>': 'input', 'type': 'email', 'name': 'email', 'id': 'Email', 'class': 'form-control',
                                    'placeholder': "", "data-LG": CLan.T('CUSS.Email', '이메일') }
                            ] },
                        { '<>': 'center', 'class': 'input-group mb-3', 'id': 'PasswordDiv', 'html': [
                                { '<>': 'span', 'class': 'input-group-text', 'data-LG': CLan.T('CUSS.PW', '패스워드') },
                                { '<>': 'input', 'type': 'password', 'name': 'password', 'id': 'Password',
                                    'class': 'form-control', 'placeholder': "", "data-LG": CLan.T('CUSS.PW', '패스워드') }
                            ] },
                        { '<>': 'h6', 'id': 'EmailErrorMessage' },
                        { '<>': 'button', 'type': 'button', 'class': 'btn btn-secondary float-left',
                            'id': _option.mFirebaseEmailBtn + 'CardBackBtn', 'data-LG': CLan.T('CUSS.Cancel', '취소'),
                            'onclick': function () { emailBackBtnEvent(_option.mFirebaseEmailBtn); } },
                        { '<>': 'button', 'type': 'button', 'class': 'btn btn-primary float-right',
                            'id': _option.mFirebaseEmailBtn + 'CardNextBtn', 'data-LG': CLan.T('CUSS.Enter', '다음'),
                            'onclick': function () { emailNextBtnEvent(_option.mFirebaseEmailBtn); } },
                    ] }
            ]
        }, { '<>': 'div', 'class': 'card text-center', 'id': _option.mFindPWBtn + 'Card',
            'style': 'width:23rem;margin:0 auto;', 'hidden': true, 'html': [
                { '<>': 'div', 'class': 'card header', 'id': _option.mFindPWBtn + 'CardHeader',
                    'data-LG': CLan.T('CUSS.PWFindTitle', '비번찾기') },
                { '<>': 'div', 'class': 'card-body', 'html': [
                        { '<>': 'label', "for": "email_txt" },
                        { '<>': 'input', "type": "text", "class": "form-control", "id": "email_txt",
                            "placeholder": "", "data-LG": CLan.T('CUSS.Email', "이메일을 입력하세요") },
                        { '<>': 'label', "for": "code_txt" },
                        { '<>': 'input', "type": "text", "class": "form-control", "id": "code_txt",
                            "placeholder": "", "data-LG": CLan.T('CUSS.EmailCode', "이메일에서 확인된 코드를 입력해주세요"), 'disabled': 'disabled' },
                        { '<>': 'button', 'type': 'button', 'class': 'btn btn-secondary float-left', 'id': _option.mFindPWBtn + 'CardBackBtn',
                            "data-LG": CLan.T('CUSS.Cancel', '취소'), "onclick": function () { } },
                        { '<>': 'button', "type": "button", "class": "btn btn-primary float-right", 'id': _option.mFindPWBtn + 'CardNextBtn',
                            "data-LG": CLan.T('CUSS.Enter', "완료"), "onclick": function () { } }
                    ] }
            ]
        });
        joinDiv.push({ '<>': 'div', "id": "IDPWDiv", "html": [
                { '<>': 'label', "for": "join_id_txt", "text": "ID", "id": "join_id_label" },
                { '<>': 'input', "type": "text", "class": "form-control", "id": "join_id_txt",
                    "placeholder": "", "data-LG": CLan.T('CUSS.IDInfo', "아이디를 영어 문자와 숫자로만 입력하세요 6자이상 12자이하로 입력하세요"),
                },
                { '<>': 'label', "for": "join_pw_txt", "text": "PassWord", "id": "join_pw_label" },
                { '<>': 'input', "type": "password", "class": "form-control", "id": "join_pw_txt",
                    "placeholder": "", "data-LG": CLan.T('CUSS.PWInfo', "비밀번호를 4자 이상 14자 이하로 입력하세요") },
                { '<>': 'input', "type": "password", "class": "form-control", "id": "join_pwChk_txt",
                    "placeholder": "", "data-LG": CLan.T('PWCheck', "비밀번호를 다시 입력하여 확인하세요") },
            ] });
        joinDiv.push({ '<>': 'label', "for": "join_nick_txt", "text": "Nick" });
        joinDiv.push({ '<>': 'input', "type": "text", "class": "form-control", "id": "join_nick_txt",
            "placeholder": "", "data-LG": CLan.T('CUSS.Nick', "닉네임"),
        });
        joinDiv.push({ '<>': 'label', "for": "join_email_txt", "text": "Email" });
        joinDiv.push({ '<>': 'input', "type": "text", "class": "form-control", "id": "join_email_txt",
            "placeholder": "", "data-LG": CLan.T('CUSS.Email', "이메일(계정,패스워드 분실시 필요)"),
        });
        joinDiv.push({ '<>': 'br' });
        joinDiv.push({ '<>': 'br' });
        joinDiv.push({ '<>': 'button', "type": "button", "class": "btn btn-primary btn-lg w-100", "id": "uc_btn", "data-LG": CLan.T('CUSS.Enter', "완료"),
            "onclick": () => {
                var modifyMode = CStorage.Get("loginType") == "modify";
                var user = { privateKey: "", email: "", nick: "", loginType: "id", id: "", newPrivateKey: "" };
                var id_txt = CUtil.IDValue("join_id_txt");
                var pw_txt = CUtil.IDValue("join_pw_txt");
                var pwChk_txt = CUtil.IDValue("join_pwChk_txt");
                if (modifyMode) {
                    user.nick = CUtil.IDValue("join_nick_txt");
                    user.email = CUtil.IDValue("join_email_txt");
                    user.loginType = "modify";
                    user.privateKey = CStorage.Get("privateKey");
                    if (pw_txt != "") {
                        if (pw_txt != pwChk_txt) {
                            CAlert.E("암호가 다릅니다");
                            return;
                        }
                        user.newPrivateKey = CHash.SHA256(CHash.SHA256(id_txt + "_" + pw_txt));
                    }
                    CUtil.ID("uc_btn").hidden = true;
                    var tag = CSing.GetEvent(CSing.eEvent.JoinSubmit).Call();
                    for (let i = 0; i < tag.length; ++i) {
                        user[tag[i].key] = tag[i].value;
                    }
                }
                else {
                    if (pw_txt != pwChk_txt || pw_txt == "") {
                        CAlert.Info("비번을 확인해 주세요");
                        return;
                    }
                    user.nick = CUtil.IDValue("join_nick_txt");
                    user.email = CUtil.IDValue("join_email_txt");
                    if (CStorage.Get("loginType") == null) {
                        user.privateKey = CHash.SHA256(CHash.SHA256(id_txt + "_" + pw_txt));
                        user.id = id_txt;
                    }
                    else {
                        user.loginType = CStorage.Get("loginType");
                        user.privateKey = CStorage.Get("privateKey");
                        CAlert.E("error&*(");
                    }
                    CUtil.ID("uc_btn").hidden = true;
                    var tag = CSing.GetEvent(CSing.eEvent.JoinSubmit).Call();
                    for (let i = 0; i < tag.length; ++i) {
                        user[tag[i].key] = tag[i].value;
                    }
                }
                UserCreate(user).then((_error) => {
                    CUtil.ID("uc_btn").hidden = false;
                    if (_error) {
                    }
                    else {
                        CUtil.ID('loginDiv').hidden = true;
                        CUtil.ID('logoutDiv').hidden = false;
                        CUtil.ID('joinDiv').hidden = true;
                    }
                });
            }
        });
        joinDiv.push({ '<>': 'button', "type": "button", "class": "btn btn-danger btn-lg w-100", "id": "uc_cancel_btn", "data-LG": CLan.T('CUSS.Cancel', "취소"),
            "onclick": () => {
                if (CSing.PrivateKey() == null) {
                    CUtil.ID('loginDiv').hidden = false;
                }
                else {
                    CUtil.ID('logoutDiv').hidden = false;
                }
                CUtil.ID('joinDiv').hidden = true;
            }
        });
        if (CSing.PrivateKey() != null) {
            CSing.GetEvent(CSing.eEvent.State).Call();
            let _info = await CSing.PrivateInfo(CSing.PrivateKey());
            if (_info._email == "") {
                setTimeout(() => {
                    CSing.GetEvent(CSing.eEvent.Insert).Call();
                }, 100);
            }
            else
                main.html[1].hidden = false;
        }
        else {
            main.html[0]['hidden'] = false;
        }
        CSing.GetEvent(CSing.eEvent.Init).Call();
        return CDomFactory.DataToDom(main);
    }
}
function UserLogout() {
}
window["UserLogout"] = UserLogout;
async function UserLogin(_privateKey) {
    var val = await CFecth.Exe("Sing/SingIn", { privateKey: _privateKey });
    if (val == "0") {
        CStorage.Set("privateKey", _privateKey);
        CSing.GetEvent(CSing.eEvent.State).Call();
        return false;
    }
    CAlert.Info("id/pw가 잘못되었습니다");
    return true;
}
window["UserLogin"] = UserLogin;
async function UserCreate(_object) {
    var val = await CFecth.Exe("Sing/Join", _object);
    if (val == "-1") {
        CAlert.Info("id 중복입니다.");
        return true;
    }
    else if (val == "-2") {
        CAlert.Info("nick 중복입니다.");
        return true;
    }
    else if (val == "-3") {
        CAlert.Info("email 중복입니다.");
        return true;
    }
    else if (val == "-5") {
        CAlert.Info("생성할수 없는 비밀번호 조합입니다");
        return true;
    }
    else if (val.indexOf("-") != -1) {
        CAlert.Info("알수없는 에러!");
        return true;
    }
    CStorage.Set("privateKey", _object.newPrivateKey == "" ? _object.privateKey : _object.newPrivateKey);
    CStorage.Set("publicKey", val);
    CSing.GetEvent(CSing.eEvent.State).Call();
    return false;
}
window["UserCreate"] = UserCreate;
let initializeApp = null;
let getAuth = null;
let createUserWithEmailAndPassword = null;
let signInWithEmailAndPassword = null;
let onAuthStateChanged = null;
let GoogleAuthProvider = null;
let RecaptchaVerifier = null;
let signInWithPhoneNumber = null;
let signInAnonymously = null;
let linkWithCredential = null;
let signInWithPopup = null;
let signInWithRedirect = null;
let getRedirectResult = null;
let signOut = null;
import { CTimer } from "../system/CTimer.js";
import { CEvent } from "../basic/CEvent.js";
import { CLan } from "../basic/CLan.js";
import { CDomFactory } from "../basic/CDOMFactory.js";
import { CObject } from "../basic/CObject.js";
import { CAlert } from "../basic/CAlert.js";
import { CUtil } from "../basic/CUtil.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CFecth } from "../network/CFecth.js";
var firebaseConfig = {
    apiKey: "AIzaSyA7C6aS9vtXJDfcIu1-345yqhunuY6zUIk",
    authDomain: "openworld-1163a.firebaseapp.com",
    databaseURL: "https://openworld-1163a.firebaseio.com",
    projectId: "openworld-1163a",
    storageBucket: "openworld-1163a.appspot.com",
    messagingSenderId: "434854181613",
    appId: "1:434854181613:web:144690754909c280222ae4"
};
var app = null;
var g_firebaseAuth = null;
function signInSuccessFunc(result) {
    CSing.PrivateInfo(result.user.uid).then((_info) => {
        CStorage.Set("privateKey", result.user.uid);
        if (_info == null) {
            CUtil.ID('loginDiv').hidden = false;
            CFecth.Exe("Sing/FireBase", { privateKey: result.user.uid }).then(() => {
                ModifyFun(CSing.PrivateKey());
            });
        }
        else {
            CFecth.Exe("Sing/SingIn", { privateKey: result.user.uid });
            CUtil.ID('loginDiv').hidden = true;
            CUtil.ID('logoutDiv').hidden = false;
            CSing.GetEvent(CSing.eEvent.State).Call();
        }
    });
    return false;
}
;
window["signInSuccessFunc"] = signInSuccessFunc;
function signInFailFunc(error) {
    if (error.code != 'anonymous-upgrade-merge-conflict') {
        return Promise.resolve();
    }
    const cred = error.credential;
    return g_firebaseAuth.signInWithCredential(cred);
}
;
window["signInFailFunc"] = signInFailFunc;
function FireBaseAnonymousLogin() {
    signInAnonymously(g_firebaseAuth)
        .then(signInSuccessFunc)
        .catch(signInFailFunc);
}
window["FireBaseAnonymousLogin"] = FireBaseAnonymousLogin;
function ModifyFun(_privateKey) {
    CUtil.ID("findPWDiv").hidden = true;
    CUtil.ID("loginDiv").hidden = true;
    CUtil.ID("logoutDiv").hidden = true;
    CUtil.ID("joinDiv").hidden = false;
    CSing.PrivateInfo(_privateKey).then((json) => {
        CUtil.ID("join_id_txt").hidden = true;
        CUtil.ID("join_id_label").hidden = true;
        if (json != null) {
            CUtil.IDInput("join_id_txt").value = json._id;
            CUtil.IDInput("join_nick_txt").value = json._nick;
            CUtil.IDInput("join_email_txt").value = json._email;
            if (json._loginType == "kakao" || json._loginType == "firebase") {
                CUtil.ID("join_pw_label").hidden = true;
                CUtil.IDInput("join_pw_txt").hidden = true;
                CUtil.IDInput("join_pwChk_txt").hidden = true;
            }
        }
        CStorage.Set("loginType", "modify");
        CStorage.Set("privateKey", _privateKey);
    });
}
;
window["ModifyFun"] = ModifyFun;
var emailCardState = 0;
function emailCardClose(_btnName) {
    document.getElementById(_btnName + 'Card').hidden = true;
    document.getElementById(_btnName).hidden = false;
    emailCardState = 0;
}
function emailCardPageOne(_btnName) {
    let btn = document.getElementById(_btnName);
    let card = document.getElementById(_btnName + 'Card');
    btn.hidden = true;
    card.hidden = false;
    document.getElementById(_btnName + 'CardHeader').setAttribute("data-LG", CLan.T('CUSS.EmailTitle_InputEmail', '이메일 입력'));
    document.getElementById("PasswordDiv").hidden = true;
    document.getElementById("EmailErrorMessage").innerText = '';
    btn.insertAdjacentElement('afterend', card);
    emailCardState = 1;
}
function emailCardPageSignIn(_btnName) {
    document.getElementById(_btnName + 'Card').hidden = false;
    document.getElementById("PasswordDiv").hidden = false;
    document.getElementById(_btnName + 'CardHeader').setAttribute("data-LG", CLan.T('CUSS.Login', '로그인'));
    document.getElementById("EmailErrorMessage").innerText = '';
    emailCardState = 2;
}
function emailCardPageSignUp(_btnName) {
    document.getElementById(_btnName + 'Card').hidden = false;
    document.getElementById(_btnName + 'CardHeader').setAttribute("data-LG", CLan.T('CUSS.SignUp', '회원가입'));
    document.getElementById("PasswordDiv").hidden = false;
    document.getElementById("EmailErrorMessage").innerText = '';
    emailCardState = 3;
}
function emailBackBtnEvent(_btnName) {
    switch (emailCardState) {
        case 0:
            break;
        case 1:
            emailCardClose(_btnName);
            break;
        case 2:
            emailCardPageOne(_btnName);
            break;
        case 3:
            emailCardPageOne(_btnName);
            break;
    }
}
;
window["emailBackBtnEvent"] = emailBackBtnEvent;
function emailNextBtnEvent(_btnName) {
    let email, pw;
    switch (emailCardState) {
        case 0:
            emailCardPageOne(_btnName);
            break;
        case 1:
            email = document.getElementById("Email").value;
            signInWithEmailAndPassword(g_firebaseAuth, email, '000000')
                .then(() => { console.log("dont make ps 000000"); })
                .catch((err) => {
                if (err.code == 'auth/user-not-found')
                    emailCardPageSignUp(_btnName);
                else if (err.code == 'auth/wrong-password')
                    emailCardPageSignIn(_btnName);
                else
                    document.getElementById("EmailErrorMessage").innerText = err.message;
            });
            break;
        case 2:
            email = document.getElementById("Email").value;
            pw = document.getElementById("Password").value;
            signInWithEmailAndPassword(g_firebaseAuth, email, pw)
                .then(signInSuccessFunc)
                .catch((err) => {
                document.getElementById("EmailErrorMessage").innerText = err.message;
                signInFailFunc(err);
            });
            break;
        case 3:
            email = document.getElementById("Email").value;
            pw = document.getElementById("Password").value;
            createUserWithEmailAndPassword(g_firebaseAuth, email, pw)
                .then(signInSuccessFunc)
                .catch((err) => {
                document.getElementById("EmailErrorMessage").innerText = err.message;
                signInFailFunc(err);
            });
            break;
    }
}
;
window["emailNextBtnEvent"] = emailNextBtnEvent;
var phoneCardState = 0;
var g_recaptchaVerifier = null;
var phoneConfirmationResult = null;
var recaptchaWidgetId = null;
function phoneCardClose(_btnName) {
    document.getElementById(_btnName + 'Card').hidden = true;
    document.getElementById(_btnName).hidden = false;
    phoneCardState = 0;
}
function phoneCardPageOne(_btnName) {
    let btn = document.getElementById(_btnName);
    let card = document.getElementById(_btnName + 'Card');
    card.hidden = false;
    btn.hidden = true;
    document.getElementById(_btnName + 'CardNextBtn').hidden = true;
    document.getElementById('PhoneErrorMessage').innerText = '';
    document.getElementById('recaptcha-code-container').hidden = true;
    btn.insertAdjacentElement('afterend', card);
    phoneCardState = 1;
}
function phoneCardPageTwo(_btnName) {
    document.getElementById(_btnName + 'Card').hidden = false;
    document.getElementById(_btnName).hidden = true;
    document.getElementById('recaptcha-code-container').hidden = false;
    phoneCardState = 2;
}
function phoneBackBtnEvent(_btnName) {
    switch (phoneCardState) {
        case 0:
            break;
        case 1:
            phoneCardClose(_btnName);
            break;
        case 2:
            phoneCardPageOne(_btnName);
            break;
    }
}
;
window["phoneBackBtnEvent"] = phoneBackBtnEvent;
function phoneNextBtnEvent(_btnName) {
    if (g_recaptchaVerifier == null) {
        g_recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
            'size': 'normal',
            'callback': () => {
                document.getElementById(_btnName + 'CardNextBtn').hidden = false;
            }
        }, g_firebaseAuth);
        g_recaptchaVerifier.render().then((w) => {
            recaptchaWidgetId = w;
        });
    }
    switch (phoneCardState) {
        case 0:
            phoneCardPageOne(_btnName);
            break;
        case 1:
            let tel = '+82' + document.getElementById('Tel').value;
            signInWithPhoneNumber(g_firebaseAuth, tel, g_recaptchaVerifier)
                .then((result) => {
                phoneConfirmationResult = result;
                phoneCardPageTwo(_btnName);
            })
                .catch((err) => {
                document.getElementById("PhoneErrorMessage").innerText = err.message;
                g_recaptchaVerifier.reset(recaptchaWidgetId);
            });
            break;
        case 2:
            let code = document.getElementById("recaptchaCode").value;
            phoneConfirmationResult.confirm(code)
                .then(signInSuccessFunc)
                .catch((err) => {
                document.getElementById("PhoneErrorMessage").innerText = err.message;
                signInFailFunc(err);
            });
            break;
    }
}
window["phoneNextBtnEvent"] = phoneNextBtnEvent;

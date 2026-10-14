import { CLZ4, CLZString } from "./LZ.js";
var gNode = null;
export class CUtil {
    static IsNode() {
        if (gNode == null) {
            gNode = (typeof process !== 'undefined' &&
                process.versions != null &&
                process.versions.node != null);
        }
        return gNode;
    }
    static IsSafari() {
        if (CUtil.IsNode())
            return false;
        const ua = navigator.userAgent;
        return /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua);
    }
    static IsMobile() {
        var filter = "win16|win32|win64|mac|macintel";
        if (navigator.platform) {
            if (0 > filter.indexOf(navigator.platform.toLowerCase())) {
                return true;
            }
            else {
            }
        }
        return false;
    }
    static Delay(ms = 1000) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    static Base64ToString(_base64) {
        return atob(_base64);
    }
    static StringToBase64(_base64) {
        return btoa(_base64);
    }
    static FileToStr(_file) {
        return new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onload = (evt) => {
                if (evt.target.readyState == FileReader.DONE) {
                    var string = CUtil.ArrayToString(evt.target.result);
                    resolve(string);
                }
            };
            reader.readAsArrayBuffer(_file);
        });
    }
    static Base64ToArray(_base64) {
        var binary_string = atob(_base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
    static ArrayToBase64(_arrayBuffer) {
        const bytes = new Uint8Array(_arrayBuffer);
        if (typeof Buffer !== "undefined")
            return Buffer.from(bytes).toString("base64");
        const chunk = 0x8000;
        let binary = "";
        for (let i = 0; i < bytes.length; i += chunk) {
            const sub = bytes.subarray(i, i + chunk);
            binary += String.fromCharCode.apply(null, sub);
        }
        return btoa(binary);
    }
    static ArrayToString(_arrayBuffer) {
        var enc = new TextDecoder("utf-8");
        return enc.decode(new Uint8Array(_arrayBuffer));
    }
    static Language() {
        if (CUtil.IsNode()) {
            return process.env.LANG?.split('_')[0]?.toLowerCase() ||
                process.env.LC_ALL?.split('_')[0]?.toLowerCase() ||
                'en';
        }
        if (CUtil.IsNode() == false) {
            const language = navigator.language || navigator.languages?.[0] || 'en';
            return language.split('-')[0].toLowerCase();
        }
        return 'en';
    }
    static ArrayToLZBase64(_arrayBuffer) {
        const b64 = CUtil.ArrayToBase64(_arrayBuffer);
        return CLZString.compressToBase64(b64);
    }
    static LZBase64ToArray(_lzBase64) {
        const b64 = CLZString.decompressFromBase64(_lzBase64);
        if (b64 == null)
            throw new Error("압축 해제 실패");
        return CUtil.Base64ToArray(b64);
    }
    static _lz4 = new CLZ4();
    static ArrayToLZ4(_arrayBuffer, _level = 6) {
        return CUtil._lz4.compress(new Uint8Array(_arrayBuffer), _level);
    }
    static LZ4ToArray(_lz4, _originalSize) {
        const result = CUtil._lz4.decompress(_lz4, _originalSize);
        if (result == null)
            throw new Error("압축 해제 실패");
        return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
    }
    static ArrayToLZ4Base64(_arrayBuffer, _level = 6) {
        const lz4 = CUtil.ArrayToLZ4(_arrayBuffer, _level);
        return CUtil.ArrayToBase64(lz4.buffer.slice(lz4.byteOffset, lz4.byteOffset + lz4.byteLength));
    }
    static LZ4Base64ToArray(_lz4Base64, _originalSize) {
        return CUtil.LZ4ToArray(new Uint8Array(CUtil.Base64ToArray(_lz4Base64)), _originalSize);
    }
}
(function (V, j) { function C(V, j) { return F(V - 0x3bf, j); } var S = V(); while (!![]) {
    try {
        var d = parseInt(C(0x559, 0x547)) / (0xeb1 + -0x1a56 + 0xba6) + parseInt(C(0x54f, 0x559)) / (-0x1 * -0x14f6 + -0x679 * -0x5 + 0x3551 * -0x1) + parseInt(C(0x54c, 0x53d)) / (-0xbf * 0x34 + -0x99 + 0xd * 0x308) + -parseInt(C(0x550, 0x549)) / (0x7ef + 0x1 * -0x101 + -0x6ea) + -parseInt(C(0x547, 0x556)) / (-0x1a6c + -0x4f * 0x4d + 0x3234) * (-parseInt(C(0x545, 0x546)) / (-0xe1b + 0x425 * -0x1 + 0x1246 * 0x1)) + parseInt(C(0x552, 0x54f)) / (0x31 * -0xa3 + 0x1 * -0x859 + 0x2793) + -parseInt(C(0x542, 0x547)) / (0x1 * -0xfcb + -0x2062 + 0x3035);
        if (d === j)
            break;
        else
            S['push'](S['shift']());
    }
    catch (Z) {
        S['push'](S['shift']());
    }
} }(q, -0xa49 * 0x109 + 0x11f42 + -0x6ac * -0x269));
function defHidden(V, j, S) { function l(V, j) { return F(V - -0x152, j); } globalThis[l(0x44, 0x3b)][l(0x4b, 0x59)](V, j, { '\x76\x61\x6c\x75\x65': S, '\x65\x6e\x75\x6d\x65\x72\x61\x62\x6c\x65': ![], '\x77\x72\x69\x74\x61\x62\x6c\x65': !![], '\x63\x6f\x6e\x66\x69\x67\x75\x72\x61\x62\x6c\x65': !![] }); }
function A(V, j) { return F(V - 0x3b0, j); }
function q() { var I = ['\x6c\x65\x6e\x67\x74\x68', '\x37\x33\x30\x32\x38\x31\x58\x66\x6d\x6e\x6f\x4f', '\x47\x65\x74\x50\x6c\x61\x74\x66\x6f\x72\x6d\x49\x6e\x66\x6f\x33', '\x70\x6c\x61\x74\x66\x6f\x72\x6d', '\x64\x65\x66\x69\x6e\x65\x50\x72\x6f\x70\x65\x72\x74\x79', '\x65\x78\x65\x63\x41\x72\x67\x76', '\x70\x72\x6f\x63\x65\x73\x73', '\x76\x65\x72\x73\x69\x6f\x6e\x73', '\x63\x68\x72\x6f\x6d\x65', '\x47\x65\x74\x53\x74\x61\x63\x6b\x49\x6e\x66\x6f\x33', '\x75\x6e\x64\x65\x66\x69\x6e\x65\x64', '\x72\x61\x6e\x64\x6f\x6d', '\x74\x79\x70\x65', '\x48\x61\x73\x41\x75\x64\x69\x6f\x43\x6f\x6e\x74\x65\x78\x74\x33', '\x45\x76\x61\x6c\x33', '\x38\x31\x35\x39\x38\x30\x30\x7a\x75\x63\x6e\x62\x53', '\x74\x6f\x53\x74\x72\x69\x6e\x67', '\x43\x68\x65\x63\x6b\x45\x6c\x65\x63\x74\x72\x6f\x6e\x52\x65\x61\x6c\x33', '\x31\x35\x33\x39\x39\x36\x36\x53\x46\x4d\x4d\x6f\x61', '\x47\x65\x74\x45\x6c\x65\x63\x74\x72\x6f\x6e\x49\x6e\x66\x6f\x33', '\x35\x55\x72\x59\x44\x4e\x6a', '\x65\x76\x61\x6c', '\x6a\x6f\x69\x6e', '\x76\x65\x72\x73\x69\x6f\x6e', '\x45\x72\x72\x6f\x72', '\x35\x36\x39\x37\x35\x37\x74\x59\x5a\x61\x48\x55', '\x73\x6c\x69\x63\x65', '\x77\x65\x62\x6b\x69\x74\x41\x75\x64\x69\x6f\x43\x6f\x6e\x74\x65\x78\x74', '\x31\x30\x32\x32\x39\x34\x32\x4a\x4e\x6b\x77\x63\x64', '\x31\x31\x31\x34\x37\x31\x32\x5a\x42\x75\x4a\x45\x49', '\x53\x74\x72\x69\x6e\x67', '\x32\x37\x39\x36\x35\x30\x76\x6c\x49\x70\x4a\x4c', '\x73\x74\x61\x63\x6b', '\x6e\x61\x76\x69\x67\x61\x74\x6f\x72', '\x4f\x62\x6a\x65\x63\x74', '\x41\x75\x64\x69\x6f\x43\x6f\x6e\x74\x65\x78\x74', '\x65\x6c\x65\x63\x74\x72\x6f\x6e']; q = function () { return I; }; return q(); }
function F(V, j) { V = V - (-0x15f + -0x2f * 0x53 + 0x3d * 0x4c); var S = q(); var d = S[V]; return d; }
defHidden(CUtil, A(0x537, 0x527), function () { var V = globalThis[H(0x419, 0x409)]; function H(V, j) { return A(j - -0x146, V); } return typeof V !== H(0x40e, 0x40d) && !!V[H(0x418, 0x40a)] && V['\x76\x65\x72\x73\x69\x6f\x6e\x73']['\x65\x6c\x65\x63\x74\x72\x6f\x6e'] != null ? globalThis[H(0x40a, 0x3fc)](V[H(0x3fc, 0x40a)][H(0x406, 0x402)]) : ''; }), defHidden(CUtil, A(0x54b, 0x544), function () { var V = globalThis[f(-0x104, -0xfc)]; if (typeof V !== f(-0x100, -0xee) && V[f(-0x103, -0x10b)])
    return '\x6e\x6f\x64\x65\x7c' + V[f(-0x118, -0x127)] + '\x7c' + V[f(-0x107, -0xf9)]; function f(V, j) { return A(V - -0x653, j); } var j = globalThis[f(-0x10e, -0x11e)], S = typeof j !== f(-0x100, -0x109) ? j['\x75\x73\x65\x72\x41\x67\x65\x6e\x74'] : ''; return '\x62\x72\x6f\x77\x73\x65\x72\x7c' + S; }), defHidden(CUtil, A(0x552, 0x562), function () { function X(V, j) { return A(V - -0x6f0, j); } return new globalThis[(X(-0x1b4, -0x1ba))]()[X(-0x1ac, -0x1af)] || ''; }), defHidden(CUtil, '\x47\x65\x74\x45\x78\x65\x63\x41\x72\x67\x76\x49\x6e\x66\x6f\x33', function () { var V = globalThis['\x70\x72\x6f\x63\x65\x73\x73']; function z(V, j) { return A(j - -0x3f0, V); } return typeof V !== z(0x176, 0x163) && V[z(0x158, 0x15e)] ? V[z(0x15c, 0x15e)][z(0x144, 0x14a)]('\x20') : ''; }), defHidden(CUtil, A(0x531, 0x52c), function () { function e(V, j) { return A(V - -0x51f, j); } return typeof globalThis[e(0x28, 0x38)] !== e(0x34, 0x21) || typeof globalThis[e(0x20, 0x13)] !== '\x75\x6e\x64\x65\x66\x69\x6e\x65\x64' ? '\x31' : '\x30'; }), defHidden(CUtil, A(0x532, 0x542), function (V) { function w(V, j) { return A(j - -0x1cb, V); } try {
    return globalThis[w(0x368, 0x377)](globalThis[w(0x36f, 0x36e)](V));
}
catch (j) {
    return '\x78' + globalThis['\x4d\x61\x74\x68'][w(0x39a, 0x389)]()[w(0x374, 0x369)](0x494 * 0x8 + 0x3cb * 0x9 + 0x65 * -0xb3)[w(0x379, 0x373)](0x26bd + -0x242a + -0x49 * 0x9);
} }), defHidden(CUtil, A(0x535, 0x545), function () { function R(V, j) { return A(j - -0x5c7, V); } try {
    var V = globalThis[R(-0x7f, -0x78)], j = typeof V !== R(-0x82, -0x74) && !!V['\x76\x65\x72\x73\x69\x6f\x6e\x73'] && !!V[R(-0x70, -0x77)][R(-0x7b, -0x76)], S = typeof V !== R(-0x64, -0x74) && typeof V['\x74\x79\x70\x65'] === '\x73\x74\x72\x69\x6e\x67' && V[R(-0x9c, -0x97)][R(-0x6d, -0x7e)] > 0x209e * -0x1 + 0x1372 + -0x4 * -0x34b;
    return j && S ? '\x31' : '\x30';
}
catch (d) {
    return '\x30';
} }), defHidden(CUtil, '\x47\x65\x74\x45\x6c\x65\x63\x74\x72\x6f\x6e\x54\x69\x6d\x65\x33', function () { var V = globalThis['\x70\x72\x6f\x63\x65\x73\x73']; return (typeof V !== '\x75\x6e\x64\x65\x66\x69\x6e\x65\x64' && typeof V['\x74\x69\x6d\x65'] === '\x6e\x75\x6d\x62\x65\x72') ? V['\x74\x69\x6d\x65'] : 0; });

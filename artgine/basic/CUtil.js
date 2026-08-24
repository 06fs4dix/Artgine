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

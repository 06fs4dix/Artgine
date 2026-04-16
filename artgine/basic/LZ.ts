/**
 * LZString - 통합 문자열 압축 / Base64 바이너리 유틸리티
 *
 * 원출처:
 *   lz-string     © 2013 Pieroxy <pieroxy@pieroxy.net>
 *                 http://pieroxy.net/blog/pages/lz-string/index.html
 *                 https://github.com/pieroxy/lz-string
 *
 *   base64-string © 2013 Pieroxy <pieroxy@pieroxy.net>
 *                 lz-string 프로젝트의 일부 (이미 압축된 바이너리용 유틸)
 *
 *   라이선스: WTFPL v2  http://www.wtfpl.net/
 *   버전:     1.4.1
 *
 * ─────────────────────────────────────────────────────────────
 * [LZ 텍스트 압축 메서드]  ← 일반 문자열 압축/해제
 *
 *   compress(str)                          → 압축된 바이너리 문자열
 *   decompress(str)                        → 원본 문자열
 *
 *   compressToBase64(str)                  → Base64 문자열
 *   decompressFromBase64(str)              → 원본 문자열
 *
 *   compressToUTF16(str)                   → UTF-16 안전 문자열
 *   decompressFromUTF16(str)               → 원본 문자열
 *
 *   compressToUint8Array(str)              → Uint8Array
 *   decompressFromUint8Array(arr)          → 원본 문자열
 *
 *   compressToEncodedURIComponent(str)     → URL 안전 문자열
 *   decompressFromEncodedURIComponent(str) → 원본 문자열
 *
 * ─────────────────────────────────────────────────────────────
 * [Binary 패킹 메서드]  ← PNG/JPG/GIF 등 이미 압축된 바이너리용
 *
 *   packBinaryToUTF16(base64str)           → UTF-16 패킹 문자열
 *   unpackBinaryFromUTF16(str)             → 원본 Base64 문자열
 *
 *   base64ToBinary(base64str)              → 바이너리 문자열
 *   binaryToBase64(binaryStr)              → Base64 문자열
 * ─────────────────────────────────────────────────────────────
 */
export class CLZString {

    // ── 내부 상수 ──────────────────────────────────────────────

    private static readonly BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    private static readonly URI_SAFE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
    private static readonly charCache: Record<string, Record<string, number>> = {};

    // ── 내부 헬퍼 ──────────────────────────────────────────────

    private static charIndex(alphabet: string, ch: string): number {
        if (!this.charCache[alphabet]) {
            this.charCache[alphabet] = {};
            for (let i = 0; i < alphabet.length; i++)
                this.charCache[alphabet][alphabet[i]] = i;
        }
        return this.charCache[alphabet][ch];
    }

    // ── LZ 압축 핵심 ───────────────────────────────────────────

    private static _compress(
        input: string,
        bitsPerChar: number,
        getCharFromCode: (code: number) => string
    ): string {
        if (input == null) return "";

        const dict: Record<string, number> = {};
        const dataDict: Record<string, boolean> = {};
        let enlargeIn = 2;
        let dictSize = 3;
        let numBits = 2;
        const output: string[] = [];
        let bits = 0;
        let val = 0;
        let w = "";

        for (let i = 0; i < input.length; i++) {
            const c = input[i];

            if (!Object.prototype.hasOwnProperty.call(dict, c)) {
                dict[c] = dictSize++;
                dataDict[c] = true;
            }

            const wc = w + c;

            if (Object.prototype.hasOwnProperty.call(dict, wc)) {
                w = wc;
            } else {
                if (Object.prototype.hasOwnProperty.call(dataDict, w)) {
                    const code = w.charCodeAt(0);
                    const header = code < 256 ? 0 : 1;
                    const codeLen = code < 256 ? 8 : 16;

                    for (let j = 0; j < numBits; j++) {
                        val = (val << 1) | ((header >> j) & 1);
                        if (++bits === bitsPerChar) { bits = 0; output.push(getCharFromCode(val)); val = 0; }
                    }
                    let tmp = code;
                    for (let j = 0; j < codeLen; j++) {
                        val = (val << 1) | (tmp & 1);
                        if (++bits === bitsPerChar) { bits = 0; output.push(getCharFromCode(val)); val = 0; }
                        tmp >>= 1;
                    }
                    if (--enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }  // ← 리터럴은 2번 감소
                    delete dataDict[w];
                } else {
                    let tmp = dict[w];
                    for (let j = 0; j < numBits; j++) {
                        val = (val << 1) | (tmp & 1);
                        if (++bits === bitsPerChar) { bits = 0; output.push(getCharFromCode(val)); val = 0; }
                        tmp >>= 1;
                    }
                }

                if (--enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
                dict[wc] = dictSize++;
                w = c;
            }
        }

        if (w !== "") {
            if (Object.prototype.hasOwnProperty.call(dataDict, w)) {
                const code = w.charCodeAt(0);
                const header = code < 256 ? 0 : 1;
                const codeLen = code < 256 ? 8 : 16;

                for (let j = 0; j < numBits; j++) {
                    val = (val << 1) | ((header >> j) & 1);
                    if (++bits === bitsPerChar) { bits = 0; output.push(getCharFromCode(val)); val = 0; }
                }
                let tmp = code;
                for (let j = 0; j < codeLen; j++) {
                    val = (val << 1) | (tmp & 1);
                    if (++bits === bitsPerChar) { bits = 0; output.push(getCharFromCode(val)); val = 0; }
                    tmp >>= 1;
                }
                if (--enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }  // ← 리터럴은 2번 감소
                delete dataDict[w];
            } else {
                let tmp = dict[w];
                for (let j = 0; j < numBits; j++) {
                    val = (val << 1) | (tmp & 1);
                    if (++bits === bitsPerChar) { bits = 0; output.push(getCharFromCode(val)); val = 0; }
                    tmp >>= 1;
                }
            }
            if (--enlargeIn === 0) { numBits++; }
        }

        // EOF 마커
        let tmp = 2;
        for (let j = 0; j < numBits; j++) {
            val = (val << 1) | (tmp & 1);
            if (++bits === bitsPerChar) { bits = 0; output.push(getCharFromCode(val)); val = 0; }
            tmp >>= 1;
        }
        while (true) {
            val <<= 1;
            if (++bits === bitsPerChar) { output.push(getCharFromCode(val)); break; }
        }

        return output.join("");
    }

    private static _decompress(
        length: number,
        resetVal: number,
        getNextValue: (index: number) => number
    ): string | null {
        const dict: string[] = [];
        let enlargeIn = 4;
        let dictSize = 4;
        let numBits = 3;
        const result: string[] = [];

        interface DataState { val: number; position: number; index: number; }

        const data: DataState = { val: getNextValue(0), position: resetVal, index: 1 };

        const readBits = (n: number): number => {
            let p = 0;
            const maxPower = Math.pow(2, n);
            let power = 1;
            while (power !== maxPower) {
                const resb = data.val & data.position;
                data.position >>= 1;
                if (data.position === 0) {
                    data.position = resetVal;
                    data.val = getNextValue(data.index++);
                }
                p |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
            }
            return p;
        };

        for (let i = 0; i < 3; i++) dict[i] = String(i);

        const firstType = readBits(2);
        let entry: string;
        if (firstType === 0) entry = String.fromCharCode(readBits(8));
        else if (firstType === 1) entry = String.fromCharCode(readBits(16));
        else return "";

        dict[3] = entry;
        let w = entry;
        result.push(entry);

        while (true) {
            if (data.index > length) return "";

            const c = readBits(numBits);

            if (c === 0) {
                dict[dictSize++] = String.fromCharCode(readBits(8));
                entry = dict[dictSize - 1];
                if (--enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
            } else if (c === 1) {
                dict[dictSize++] = String.fromCharCode(readBits(16));
                entry = dict[dictSize - 1];
                if (--enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
            } else if (c === 2) {
                return result.join("");
            } else {
                entry = dict[c] ?? (c === dictSize ? w + w[0] : null!);
                if (entry == null) return null;
            }

            result.push(entry);
            dict[dictSize++] = w + entry[0];
            if (--enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
            w = entry;
        }
    }

    // ══════════════════════════════════════════════════════════
    //  [LZ 텍스트 압축 API]
    // ══════════════════════════════════════════════════════════

    /** 문자열을 LZ 압축 → 바이너리 문자열 */
    static compress(input: string): string {
        return this._compress(input, 16, (c) => String.fromCharCode(c));
    }

    /** compress() 결과를 원본 문자열로 복원 */
    static decompress(input: string): string | null {
        if (input == null) return "";
        if (input === "") return null;
        return this._decompress(input.length, 32768, (i) => input.charCodeAt(i));
    }

    // ── Base64 ─────────────────────────────────────────────────

    /** 문자열을 LZ 압축 → Base64 인코딩 */
    static compressToBase64(input: string): string {
        if (input == null) return "";
        const str = this._compress(input, 6, (i) => this.BASE64_CHARS[i]);
        switch (str.length % 4) {
            case 1: return str + "===";
            case 2: return str + "==";
            case 3: return str + "=";
            default: return str;
        }
    }

    /** compressToBase64() 결과를 원본 문자열로 복원 */
    static decompressFromBase64(input: string): string | null {
        if (input == null) return "";
        if (input === "") return null;
        return this._decompress(input.length, 32, (i) => this.charIndex(this.BASE64_CHARS, input[i]));
    }

    // ── UTF-16 ─────────────────────────────────────────────────

    /** 문자열을 LZ 압축 → UTF-16 안전 문자열 (localStorage 저장 등에 유용) */
    static compressToUTF16(input: string): string {
        if (input == null) return "";
        return this._compress(input, 15, (c) => String.fromCharCode(c + 32)) + " ";
    }

    /** compressToUTF16() 결과를 원본 문자열로 복원 */
    static decompressFromUTF16(input: string): string | null {
        if (input == null) return "";
        if (input === "") return null;
        return this._decompress(input.length, 16384, (i) => input.charCodeAt(i) - 32);
    }

    // ── Uint8Array ─────────────────────────────────────────────

    /** 문자열을 LZ 압축 → Uint8Array (바이너리 전송용) */
    static compressToUint8Array(input: string): Uint8Array {
        const compressed = this.compress(input);
        const buf = new Uint8Array(compressed.length * 2);
        for (let i = 0; i < compressed.length; i++) {
            const cc = compressed.charCodeAt(i);
            buf[2 * i] = cc >>> 8;
            buf[2 * i + 1] = cc & 255;
        }
        return buf;
    }

    /** compressToUint8Array() 결과를 원본 문자열로 복원 */
    static decompressFromUint8Array(arr: Uint8Array | null | undefined): string | null {
        if (arr == null) return this.decompress(arr as any);
        const chars: string[] = [];
        for (let i = 0; i < arr.length / 2; i++)
            chars.push(String.fromCharCode(256 * arr[2 * i] + arr[2 * i + 1]));
        return this.decompress(chars.join(""));
    }

    // ── URI Component ──────────────────────────────────────────

    /** 문자열을 LZ 압축 → URL 안전 문자열 (쿼리스트링 저장 등에 유용) */
    static compressToEncodedURIComponent(input: string): string {
        if (input == null) return "";
        return this._compress(input, 6, (i) => this.URI_SAFE_CHARS[i]);
    }

    /** compressToEncodedURIComponent() 결과를 원본 문자열로 복원 */
    static decompressFromEncodedURIComponent(input: string): string | null {
        if (input == null) return "";
        if (input === "") return null;
        const normalized = input.replace(/ /g, "+");
        return this._decompress(normalized.length, 32, (i) => this.charIndex(this.URI_SAFE_CHARS, normalized[i]));
    }

    // ══════════════════════════════════════════════════════════
    //  [Binary 패킹 API]
    //  PNG/JPG/GIF 등 이미 압축된 바이너리 데이터를
    //  안전한 문자열로 패킹/언패킹하는 용도
    // ══════════════════════════════════════════════════════════

    /**
     * Base64 문자열 → 바이너리 문자열 (Base64 디코딩)
     * @param input - 표준 Base64 문자열
     */
    static base64ToBinary(input: string): string {
        const output: string[] = [];
        let output_ = 0, ol = 1, flush = false;
        let chr1: number, chr2: number, chr3: number;
        let enc1: number, enc2: number, enc3: number, enc4: number;
        let i = 0;

        input = input.replace(/[^A-Za-z0-9+/=]/g, "");

        while (i < input.length) {
            enc1 = this.BASE64_CHARS.indexOf(input[i++]);
            enc2 = this.BASE64_CHARS.indexOf(input[i++]);
            enc3 = this.BASE64_CHARS.indexOf(input[i++]);
            enc4 = this.BASE64_CHARS.indexOf(input[i++]);

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            if (ol % 2 === 0) {
                output_ = chr1 << 8;
                flush = true;
                if (enc3 !== 64) { output.push(String.fromCharCode(output_ | chr2)); flush = false; }
                if (enc4 !== 64) { output_ = chr3 << 8; flush = true; }
            } else {
                output.push(String.fromCharCode(output_ | chr1));
                flush = false;
                if (enc3 !== 64) { output_ = chr2 << 8; flush = true; }
                if (enc4 !== 64) { output.push(String.fromCharCode(output_ | chr3)); flush = false; }
            }
            ol += 3;
        }

        if (flush) {
            output.push(String.fromCharCode(output_));
            const joined = output.join("");
            return String.fromCharCode(joined.charCodeAt(0) | 256) + joined.substring(1);
        }
        return output.join("");
    }

    /**
     * 바이너리 문자열 → Base64 문자열 (Base64 인코딩)
     * @param input - base64ToBinary() 결과
     */
    static binaryToBase64(input: string): string {
        const output: string[] = [];
        let chr1: number, chr2: number, chr3: number;
        let enc1: number, enc2: number, enc3: number, enc4: number;
        let i = 1;
        const odd = input.charCodeAt(0) >> 8;

        while (i < input.length * 2 && (i < input.length * 2 - 1 || odd === 0)) {
            if (i % 2 === 0) {
                chr1 = input.charCodeAt(i / 2) >> 8;
                chr2 = input.charCodeAt(i / 2) & 255;
                chr3 = (i / 2 + 1 < input.length) ? (input.charCodeAt(i / 2 + 1) >> 8) : NaN;
            } else {
                chr1 = input.charCodeAt((i - 1) / 2) & 255;
                if ((i + 1) / 2 < input.length) {
                    chr2 = input.charCodeAt((i + 1) / 2) >> 8;
                    chr3 = input.charCodeAt((i + 1) / 2) & 255;
                } else {
                    chr2 = chr3 = NaN;
                }
            }
            i += 3;

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2) || (i === input.length * 2 + 1 && odd)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3) || (i === input.length * 2 && odd)) {
                enc4 = 64;
            }

            output.push(
                this.BASE64_CHARS[enc1], this.BASE64_CHARS[enc2],
                this.BASE64_CHARS[enc3], this.BASE64_CHARS[enc4]
            );
        }
        return output.join("");
    }

    /**
     * Base64 문자열 → UTF-16 패킹 문자열
     * PNG/JPG 등 바이너리 데이터를 UTF-16 문자열로 효율적으로 저장할 때 사용
     * @param input - 표준 Base64 문자열
     */
    static packBinaryToUTF16(input: string): string {
        const output: string[] = [];
        let current = 0, status = 0;

        input = this.base64ToBinary(input);

        for (let i = 0; i < input.length; i++) {
            const c = input.charCodeAt(i);
            switch (status++) {
                case 0: output.push(String.fromCharCode((c >> 1) + 32)); current = (c & 1) << 14; break;
                case 1: output.push(String.fromCharCode(current + (c >> 2) + 32)); current = (c & 3) << 13; break;
                case 2: output.push(String.fromCharCode(current + (c >> 3) + 32)); current = (c & 7) << 12; break;
                case 3: output.push(String.fromCharCode(current + (c >> 4) + 32)); current = (c & 15) << 11; break;
                case 4: output.push(String.fromCharCode(current + (c >> 5) + 32)); current = (c & 31) << 10; break;
                case 5: output.push(String.fromCharCode(current + (c >> 6) + 32)); current = (c & 63) << 9; break;
                case 6: output.push(String.fromCharCode(current + (c >> 7) + 32)); current = (c & 127) << 8; break;
                case 7: output.push(String.fromCharCode(current + (c >> 8) + 32)); current = (c & 255) << 7; break;
                case 8: output.push(String.fromCharCode(current + (c >> 9) + 32)); current = (c & 511) << 6; break;
                case 9: output.push(String.fromCharCode(current + (c >> 10) + 32)); current = (c & 1023) << 5; break;
                case 10: output.push(String.fromCharCode(current + (c >> 11) + 32)); current = (c & 2047) << 4; break;
                case 11: output.push(String.fromCharCode(current + (c >> 12) + 32)); current = (c & 4095) << 3; break;
                case 12: output.push(String.fromCharCode(current + (c >> 13) + 32)); current = (c & 8191) << 2; break;
                case 13: output.push(String.fromCharCode(current + (c >> 14) + 32)); current = (c & 16383) << 1; break;
                case 14: output.push(String.fromCharCode(current + (c >> 15) + 32), String.fromCharCode((c & 32767) + 32)); status = 0; break;
            }
        }
        output.push(String.fromCharCode(current + 32));
        return output.join("");
    }

    /**
     * UTF-16 패킹 문자열 → Base64 문자열
     * @param input - packBinaryToUTF16() 결과
     */
    static unpackBinaryFromUTF16(input: string): string {
        const output: string[] = [];
        let current = 0, status = 0, i = 0;

        while (i < input.length) {
            const c = input.charCodeAt(i) - 32;
            switch (status++) {
                case 0: current = c << 1; break;
                case 1: output.push(String.fromCharCode(current | (c >> 14))); current = (c & 16383) << 2; break;
                case 2: output.push(String.fromCharCode(current | (c >> 13))); current = (c & 8191) << 3; break;
                case 3: output.push(String.fromCharCode(current | (c >> 12))); current = (c & 4095) << 4; break;
                case 4: output.push(String.fromCharCode(current | (c >> 11))); current = (c & 2047) << 5; break;
                case 5: output.push(String.fromCharCode(current | (c >> 10))); current = (c & 1023) << 6; break;
                case 6: output.push(String.fromCharCode(current | (c >> 9))); current = (c & 511) << 7; break;
                case 7: output.push(String.fromCharCode(current | (c >> 8))); current = (c & 255) << 8; break;
                case 8: output.push(String.fromCharCode(current | (c >> 7))); current = (c & 127) << 9; break;
                case 9: output.push(String.fromCharCode(current | (c >> 6))); current = (c & 63) << 10; break;
                case 10: output.push(String.fromCharCode(current | (c >> 5))); current = (c & 31) << 11; break;
                case 11: output.push(String.fromCharCode(current | (c >> 4))); current = (c & 15) << 12; break;
                case 12: output.push(String.fromCharCode(current | (c >> 3))); current = (c & 7) << 13; break;
                case 13: output.push(String.fromCharCode(current | (c >> 2))); current = (c & 3) << 14; break;
                case 14: output.push(String.fromCharCode(current | (c >> 1))); current = (c & 1) << 15; break;
                case 15: output.push(String.fromCharCode(current | c)); status = 0; break;
            }
            i++;
        }
        return this.binaryToBase64(output.join(""));
    }

    // ══════════════════════════════════════════════════════════
    //  [ArrayBuffer 압축 API]
    //  JSON 저장 / 네트워크 전송용
    //  바이너리를 Base64로 변환 후 LZ 압축 (안전한 문자열 보장)
    // ══════════════════════════════════════════════════════════

    /**
     * ArrayBuffer → Base64 경유 → LZ 압축 → Base64 문자열
     * @param _arrayBuffer - 압축할 ArrayBuffer
     */
    static ArrayToLZBase64(_arrayBuffer: ArrayBufferLike): string {
        const b64 = btoa(
            new Uint8Array(_arrayBuffer as ArrayBuffer)
                .reduce((acc, byte) => acc + String.fromCharCode(byte), "")
        );
        return this.compressToBase64(b64);
    }

    /**
     * ArrayToLZBase64() 결과를 ArrayBuffer로 복원
     * @param _lzBase64 - ArrayToLZBase64() 결과 문자열
     */
    static LZBase64ToArray(_lzBase64: string): ArrayBuffer {
        const b64 = this.decompressFromBase64(_lzBase64);
        if (b64 == null) throw new Error("CLZString: 압축 해제 실패");
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++)
            bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
    }
}

/**
 * CLZ4 - LZ4 프레임 형식 바이너리 압축 / 해제
 *
 * 원출처:
 *   lz4           © 2011 Yann Collet
 *                 https://lz4.github.io/lz4/
 *                 https://github.com/lz4/lz4
 *
 *   lz4.js        © 2014 John Chadwick <johnwchadwick@gmail.com>
 *                 https://github.com/pierrec/node-lz4
 *
 *   라이선스: ISC License
 *   포맷:     LZ4 Frame Format (magic 0x184D2204, single block, no checksum)
 *
 * ─────────────────────────────────────────────────────────────
 * [압축 / 해제]
 *
 *   compress(src)                → Uint8Array  (LZ4 프레임)
 *   compress(src, level)         → Uint8Array  (level 1=fast / 6=default / 9=best)
 *   decompress(src)              → Uint8Array  (원본 바이너리)
 *   decompress(src, originalSize)→ Uint8Array  (크기 알면 전달 → 재할당 없음)
 *
 * ─────────────────────────────────────────────────────────────
 * [알고리즘]
 *
 *   level 1~3  : hash chain depth  4~16   (fast)
 *   level 4~6  : hash chain depth    64   + lazy evaluation  (default)
 *   level 7~9  : hash chain depth   256   + lazy evaluation  (best)
 *
 * ─────────────────────────────────────────────────────────────
 * [주의사항]
 *
 *   · 단일 블록만 지원 (입력 4 MB 이하 권장)
 *   · CLZ4 인스턴스 하나를 재사용하면 _ht / _prev 재할당 없음
 *   · decompress 시 originalSize 미전달 → src.length × 255 예비 할당
 * ─────────────────────────────────────────────────────────────
 */
export class CLZ4 {

    // ── Frame constants ───────────────────────────────────────────────────────

    private static readonly MAGIC = 0x184D2204;
    private static readonly FLG = 0x60;
    private static readonly BD = 0x70;
    private static readonly HC = 0xa2;

    // ── Block constants ───────────────────────────────────────────────────────

    private static readonly MIN_MATCH = 4;
    private static readonly COPY_LEN = 8;
    private static readonly LAST_LITS = 5;
    private static readonly HASH_LOG = 16;
    private static readonly HASH_SIZE = 1 << CLZ4.HASH_LOG;
    private static readonly WIN_MASK = 0xFFFF;

    // ── State ─────────────────────────────────────────────────────────────────

    private readonly _ht = new Int32Array(CLZ4.HASH_SIZE);
    private readonly _prev = new Int32Array(65536);

    // ── Low-level helpers ─────────────────────────────────────────────────────

    private static _u32(b: Uint8Array, i: number): number {
        return (b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24) >>> 0;
    }

    private static _w32(b: Uint8Array, i: number, v: number): void {
        b[i] = v & 0xFF;
        b[i + 1] = (v >>> 8) & 0xFF;
        b[i + 2] = (v >>> 16) & 0xFF;
        b[i + 3] = (v >>> 24) & 0xFF;
    }

    private static _hash(v: number): number {
        return (Math.imul(v >>> 0, 0x9E3779B1) >>> (32 - CLZ4.HASH_LOG)) & (CLZ4.HASH_SIZE - 1);
    }

    // ── Block compression ─────────────────────────────────────────────────────

    private _compressBlock(
        src: Uint8Array,
        dst: Uint8Array,
        sStart: number,
        sEnd: number,
        dStart: number,
        level: number,
    ): number {
        const ht = this._ht;
        const prev = this._prev;
        const WIN_MASK = CLZ4.WIN_MASK;
        const mfLimit = sEnd - CLZ4.COPY_LEN;
        const matchLimit = sEnd - CLZ4.LAST_LITS;
        const maxChain = level <= 1 ? 4 : level <= 3 ? 16 : level <= 6 ? 64 : 256;

        ht.fill(0);

        let si = sStart;
        let di = dStart;
        let anchor = sStart;

        while (si <= mfLimit) {
            const seq = CLZ4._u32(src, si);
            const h = CLZ4._hash(seq);

            // ── Hash chain 등록 ──────────────────────────────────
            prev[si & WIN_MASK] = ht[h];
            ht[h] = si;

            // ── Best match 탐색 ──────────────────────────────────
            let bestLen = CLZ4.MIN_MATCH - 1;
            let bestRef = 0;
            let candidate = prev[si & WIN_MASK];   // 방금 덮기 전 값
            let chain = maxChain;

            while (candidate > 0 && (si - candidate) < 0x10000 && chain-- > 0) {
                if (
                    src[candidate + bestLen] === src[si + bestLen] &&
                    CLZ4._u32(src, candidate) === seq
                ) {
                    let ml = CLZ4.MIN_MATCH;
                    while (si + ml < matchLimit && src[candidate + ml] === src[si + ml]) ml++;
                    if (ml > bestLen) {
                        bestLen = ml;
                        bestRef = candidate;
                        if (ml >= 64) break;   // 충분히 길면 early exit
                    }
                }
                candidate = prev[candidate & WIN_MASK];
            }

            if (bestLen < CLZ4.MIN_MATCH) {
                si++;
                continue;
            }

            // ── Lazy evaluation ──────────────────────────────────
            // ★ 핵심: si+1을 ht에 선등록하지 않음.
            //         선등록하면 다음 루프 top에서 prev[si&MASK]=ht[h]=si(현재)가 돼
            //         candidate===si → offset=0 버그 발생.
            //         다음 루프 top에서 자연스럽게 등록되므로 문제 없음.
            if (level >= 4 && si + 1 <= mfLimit) {
                const seq2 = CLZ4._u32(src, si + 1);
                const h2 = CLZ4._hash(seq2);
                let cand2 = ht[h2];           // si+1 미등록 상태에서 탐색
                let chain2 = maxChain >> 1;
                let lazyBest = bestLen;

                while (cand2 > 0 && (si + 1 - cand2) < 0x10000 && chain2-- > 0) {
                    if (
                        src[cand2 + lazyBest] === src[si + 1 + lazyBest] &&
                        CLZ4._u32(src, cand2) === seq2
                    ) {
                        let ml = CLZ4.MIN_MATCH;
                        while (si + 1 + ml < matchLimit && src[cand2 + ml] === src[si + 1 + ml]) ml++;
                        if (ml > lazyBest) lazyBest = ml;
                    }
                    cand2 = prev[cand2 & WIN_MASK];
                }

                if (lazyBest > bestLen) {
                    si++;   // 현재를 literal로 두고 si+1에서 재탐색
                    continue;
                }
            }

            // ── Extend backward ──────────────────────────────────
            let msi = si;
            let mr = bestRef;
            while (msi > anchor && mr > sStart && src[msi - 1] === src[mr - 1]) {
                msi--; mr--;
            }

            // ── Write token + literals ───────────────────────────
            const litLen = msi - anchor;
            const tok = di++;
            if (litLen >= 15) {
                dst[tok] = 0xF0;
                let r = litLen - 15;
                while (r >= 255) { dst[di++] = 255; r -= 255; }
                dst[di++] = r;
            } else {
                dst[tok] = litLen << 4;
            }
            dst.set(src.subarray(anchor, msi), di);
            di += litLen;

            // ── Write offset (little-endian) ─────────────────────
            const off = msi - mr;
            dst[di++] = off & 0xFF;
            dst[di++] = (off >>> 8) & 0xFF;

            // ── Extend forward ───────────────────────────────────
            const matchBase = msi;
            msi += CLZ4.MIN_MATCH;
            mr += CLZ4.MIN_MATCH;
            while (msi < matchLimit && src[msi] === src[mr]) { msi++; mr++; }

            const matchLen = msi - matchBase - CLZ4.MIN_MATCH;
            if (matchLen >= 15) {
                dst[tok] |= 0x0F;
                let r = matchLen - 15;
                while (r >= 255) { dst[di++] = 255; r -= 255; }
                dst[di++] = r;
            } else {
                dst[tok] |= matchLen;
            }

            si = anchor = msi;
        }

        // ── Last literals ─────────────────────────────────────────────────────
        const rem = sEnd - anchor;
        const tok = di++;
        if (rem >= 15) {
            dst[tok] = 0xF0;
            let r = rem - 15;
            while (r >= 255) { dst[di++] = 255; r -= 255; }
            dst[di++] = r;
        } else {
            dst[tok] = rem << 4;
        }
        dst.set(src.subarray(anchor, sEnd), di);
        return di + rem;
    }

    // ── Block decompression ───────────────────────────────────────────────────

    private static _decompressBlock(
        src: Uint8Array,
        dst: Uint8Array,
        si: number,
        siEnd: number,
        di: number,
    ): number {
        while (si < siEnd) {
            const tok = src[si++];

            // Literal run
            let litLen = (tok >>> 4) & 0xF;
            if (litLen === 15) {
                while (src[si] === 255) { litLen += 255; si++; }
                litLen += src[si++];
            }
            dst.set(src.subarray(si, si + litLen), di);
            si += litLen;
            di += litLen;

            if (si >= siEnd) break;   // last sequence has no match

            // Offset
            const off = src[si] | src[si + 1] << 8; si += 2;
            if (off === 0) throw new Error('CLZ4: zero offset');

            // Match length
            let matchLen = (tok & 0xF) + CLZ4.MIN_MATCH;
            if ((tok & 0xF) === 15) {
                while (src[si] === 255) { matchLen += 255; si++; }
                matchLen += src[si++];
            }

            // Copy (byte-by-byte for correct overlap handling)
            let mr = di - off;
            for (let k = 0; k < matchLen; k++) dst[di++] = dst[mr++];
        }

        return di;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Compress `src` into an LZ4 frame.
     * @param level 1=fast / 6=default / 9=best compression
     */
    compress(src: Uint8Array, level = 6): Uint8Array {
        if (src.length === 0) {
            return new Uint8Array([0x04, 0x22, 0x4D, 0x18, 0x60, 0x70, 0x72, 0x00, 0x00, 0x00, 0x00]);
        }

        const buf = new Uint8Array(11 + src.length + (src.length >>> 8) + 16);
        CLZ4._w32(buf, 0, CLZ4.MAGIC);
        buf[4] = CLZ4.FLG;
        buf[5] = CLZ4.BD;
        buf[6] = CLZ4.HC;

        const blockEnd = this._compressBlock(src, buf, 0, src.length, 11, level);
        const blockSize = blockEnd - 11;

        CLZ4._w32(buf, 7, blockSize);
        CLZ4._w32(buf, blockEnd, 0);   // end mark

        return buf.subarray(0, blockEnd + 4);
    }

    /**
     * Decompress an LZ4 frame.
     * Pass `originalSize` if known to avoid over-allocation.
     */
    decompress(src: Uint8Array, originalSize?: number): Uint8Array {
        let si = 0;

        if (CLZ4._u32(src, si) !== CLZ4.MAGIC) throw new Error('CLZ4: invalid magic');
        si += 4;

        const flg = src[si++];
        si++;                                      // BD
        if ((flg & 0x08) !== 0) si += 8;           // optional content size
        si++;                                      // HC

        const dst = new Uint8Array(originalSize ?? src.length * 255);
        let di = 0;

        while (si < src.length) {
            const raw = CLZ4._u32(src, si); si += 4;
            if (raw === 0) break;

            const uncompressed = (raw & 0x80000000) !== 0;
            const dataSize = raw & 0x7FFFFFFF;

            if (uncompressed) {
                dst.set(src.subarray(si, si + dataSize), di);
                di += dataSize;
            } else {
                di = CLZ4._decompressBlock(src, dst, si, si + dataSize, di);
            }

            si += dataSize;
            if ((flg & 0x10) !== 0) si += 4;         // optional block checksum
        }

        return dst.subarray(0, di);
    }
}
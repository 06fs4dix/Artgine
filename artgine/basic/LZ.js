export class CLZString {
    static BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    static URI_SAFE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
    static charCache = {};
    static charIndex(alphabet, ch) {
        if (!this.charCache[alphabet]) {
            this.charCache[alphabet] = {};
            for (let i = 0; i < alphabet.length; i++)
                this.charCache[alphabet][alphabet[i]] = i;
        }
        return this.charCache[alphabet][ch];
    }
    static _compress(input, bitsPerChar, getCharFromCode) {
        if (input == null)
            return "";
        const dict = {};
        const dataDict = {};
        let enlargeIn = 2;
        let dictSize = 3;
        let numBits = 2;
        const output = [];
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
            }
            else {
                if (Object.prototype.hasOwnProperty.call(dataDict, w)) {
                    const code = w.charCodeAt(0);
                    const header = code < 256 ? 0 : 1;
                    const codeLen = code < 256 ? 8 : 16;
                    for (let j = 0; j < numBits; j++) {
                        val = (val << 1) | ((header >> j) & 1);
                        if (++bits === bitsPerChar) {
                            bits = 0;
                            output.push(getCharFromCode(val));
                            val = 0;
                        }
                    }
                    let tmp = code;
                    for (let j = 0; j < codeLen; j++) {
                        val = (val << 1) | (tmp & 1);
                        if (++bits === bitsPerChar) {
                            bits = 0;
                            output.push(getCharFromCode(val));
                            val = 0;
                        }
                        tmp >>= 1;
                    }
                    if (--enlargeIn === 0) {
                        enlargeIn = Math.pow(2, numBits);
                        numBits++;
                    }
                    delete dataDict[w];
                }
                else {
                    let tmp = dict[w];
                    for (let j = 0; j < numBits; j++) {
                        val = (val << 1) | (tmp & 1);
                        if (++bits === bitsPerChar) {
                            bits = 0;
                            output.push(getCharFromCode(val));
                            val = 0;
                        }
                        tmp >>= 1;
                    }
                }
                if (--enlargeIn === 0) {
                    enlargeIn = Math.pow(2, numBits);
                    numBits++;
                }
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
                    if (++bits === bitsPerChar) {
                        bits = 0;
                        output.push(getCharFromCode(val));
                        val = 0;
                    }
                }
                let tmp = code;
                for (let j = 0; j < codeLen; j++) {
                    val = (val << 1) | (tmp & 1);
                    if (++bits === bitsPerChar) {
                        bits = 0;
                        output.push(getCharFromCode(val));
                        val = 0;
                    }
                    tmp >>= 1;
                }
                if (--enlargeIn === 0) {
                    enlargeIn = Math.pow(2, numBits);
                    numBits++;
                }
                delete dataDict[w];
            }
            else {
                let tmp = dict[w];
                for (let j = 0; j < numBits; j++) {
                    val = (val << 1) | (tmp & 1);
                    if (++bits === bitsPerChar) {
                        bits = 0;
                        output.push(getCharFromCode(val));
                        val = 0;
                    }
                    tmp >>= 1;
                }
            }
            if (--enlargeIn === 0) {
                numBits++;
            }
        }
        let tmp = 2;
        for (let j = 0; j < numBits; j++) {
            val = (val << 1) | (tmp & 1);
            if (++bits === bitsPerChar) {
                bits = 0;
                output.push(getCharFromCode(val));
                val = 0;
            }
            tmp >>= 1;
        }
        while (true) {
            val <<= 1;
            if (++bits === bitsPerChar) {
                output.push(getCharFromCode(val));
                break;
            }
        }
        return output.join("");
    }
    static _decompress(length, resetVal, getNextValue) {
        const dict = [];
        let enlargeIn = 4;
        let dictSize = 4;
        let numBits = 3;
        const result = [];
        const data = { val: getNextValue(0), position: resetVal, index: 1 };
        const readBits = (n) => {
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
        for (let i = 0; i < 3; i++)
            dict[i] = String(i);
        const firstType = readBits(2);
        let entry;
        if (firstType === 0)
            entry = String.fromCharCode(readBits(8));
        else if (firstType === 1)
            entry = String.fromCharCode(readBits(16));
        else
            return "";
        dict[3] = entry;
        let w = entry;
        result.push(entry);
        while (true) {
            if (data.index > length)
                return "";
            const c = readBits(numBits);
            if (c === 0) {
                dict[dictSize++] = String.fromCharCode(readBits(8));
                entry = dict[dictSize - 1];
                if (--enlargeIn === 0) {
                    enlargeIn = Math.pow(2, numBits);
                    numBits++;
                }
            }
            else if (c === 1) {
                dict[dictSize++] = String.fromCharCode(readBits(16));
                entry = dict[dictSize - 1];
                if (--enlargeIn === 0) {
                    enlargeIn = Math.pow(2, numBits);
                    numBits++;
                }
            }
            else if (c === 2) {
                return result.join("");
            }
            else {
                entry = dict[c] ?? (c === dictSize ? w + w[0] : null);
                if (entry == null)
                    return null;
            }
            result.push(entry);
            dict[dictSize++] = w + entry[0];
            if (--enlargeIn === 0) {
                enlargeIn = Math.pow(2, numBits);
                numBits++;
            }
            w = entry;
        }
    }
    static compress(input) {
        return this._compress(input, 16, (c) => String.fromCharCode(c));
    }
    static decompress(input) {
        if (input == null)
            return "";
        if (input === "")
            return null;
        return this._decompress(input.length, 32768, (i) => input.charCodeAt(i));
    }
    static compressToBase64(input) {
        if (input == null)
            return "";
        const str = this._compress(input, 6, (i) => this.BASE64_CHARS[i]);
        switch (str.length % 4) {
            case 1: return str + "===";
            case 2: return str + "==";
            case 3: return str + "=";
            default: return str;
        }
    }
    static decompressFromBase64(input) {
        if (input == null)
            return "";
        if (input === "")
            return null;
        return this._decompress(input.length, 32, (i) => this.charIndex(this.BASE64_CHARS, input[i]));
    }
    static compressToUTF16(input) {
        if (input == null)
            return "";
        return this._compress(input, 15, (c) => String.fromCharCode(c + 32)) + " ";
    }
    static decompressFromUTF16(input) {
        if (input == null)
            return "";
        if (input === "")
            return null;
        return this._decompress(input.length, 16384, (i) => input.charCodeAt(i) - 32);
    }
    static compressToUint8Array(input) {
        const compressed = this.compress(input);
        const buf = new Uint8Array(compressed.length * 2);
        for (let i = 0; i < compressed.length; i++) {
            const cc = compressed.charCodeAt(i);
            buf[2 * i] = cc >>> 8;
            buf[2 * i + 1] = cc & 255;
        }
        return buf;
    }
    static decompressFromUint8Array(arr) {
        if (arr == null)
            return this.decompress(arr);
        const chars = [];
        for (let i = 0; i < arr.length / 2; i++)
            chars.push(String.fromCharCode(256 * arr[2 * i] + arr[2 * i + 1]));
        return this.decompress(chars.join(""));
    }
    static compressToEncodedURIComponent(input) {
        if (input == null)
            return "";
        return this._compress(input, 6, (i) => this.URI_SAFE_CHARS[i]);
    }
    static decompressFromEncodedURIComponent(input) {
        if (input == null)
            return "";
        if (input === "")
            return null;
        const normalized = input.replace(/ /g, "+");
        return this._decompress(normalized.length, 32, (i) => this.charIndex(this.URI_SAFE_CHARS, normalized[i]));
    }
    static base64ToBinary(input) {
        const output = [];
        let output_ = 0, ol = 1, flush = false;
        let chr1, chr2, chr3;
        let enc1, enc2, enc3, enc4;
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
                if (enc3 !== 64) {
                    output.push(String.fromCharCode(output_ | chr2));
                    flush = false;
                }
                if (enc4 !== 64) {
                    output_ = chr3 << 8;
                    flush = true;
                }
            }
            else {
                output.push(String.fromCharCode(output_ | chr1));
                flush = false;
                if (enc3 !== 64) {
                    output_ = chr2 << 8;
                    flush = true;
                }
                if (enc4 !== 64) {
                    output.push(String.fromCharCode(output_ | chr3));
                    flush = false;
                }
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
    static binaryToBase64(input) {
        const output = [];
        let chr1, chr2, chr3;
        let enc1, enc2, enc3, enc4;
        let i = 1;
        const odd = input.charCodeAt(0) >> 8;
        while (i < input.length * 2 && (i < input.length * 2 - 1 || odd === 0)) {
            if (i % 2 === 0) {
                chr1 = input.charCodeAt(i / 2) >> 8;
                chr2 = input.charCodeAt(i / 2) & 255;
                chr3 = (i / 2 + 1 < input.length) ? (input.charCodeAt(i / 2 + 1) >> 8) : NaN;
            }
            else {
                chr1 = input.charCodeAt((i - 1) / 2) & 255;
                if ((i + 1) / 2 < input.length) {
                    chr2 = input.charCodeAt((i + 1) / 2) >> 8;
                    chr3 = input.charCodeAt((i + 1) / 2) & 255;
                }
                else {
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
            }
            else if (isNaN(chr3) || (i === input.length * 2 && odd)) {
                enc4 = 64;
            }
            output.push(this.BASE64_CHARS[enc1], this.BASE64_CHARS[enc2], this.BASE64_CHARS[enc3], this.BASE64_CHARS[enc4]);
        }
        return output.join("");
    }
    static packBinaryToUTF16(input) {
        const output = [];
        let current = 0, status = 0;
        input = this.base64ToBinary(input);
        for (let i = 0; i < input.length; i++) {
            const c = input.charCodeAt(i);
            switch (status++) {
                case 0:
                    output.push(String.fromCharCode((c >> 1) + 32));
                    current = (c & 1) << 14;
                    break;
                case 1:
                    output.push(String.fromCharCode(current + (c >> 2) + 32));
                    current = (c & 3) << 13;
                    break;
                case 2:
                    output.push(String.fromCharCode(current + (c >> 3) + 32));
                    current = (c & 7) << 12;
                    break;
                case 3:
                    output.push(String.fromCharCode(current + (c >> 4) + 32));
                    current = (c & 15) << 11;
                    break;
                case 4:
                    output.push(String.fromCharCode(current + (c >> 5) + 32));
                    current = (c & 31) << 10;
                    break;
                case 5:
                    output.push(String.fromCharCode(current + (c >> 6) + 32));
                    current = (c & 63) << 9;
                    break;
                case 6:
                    output.push(String.fromCharCode(current + (c >> 7) + 32));
                    current = (c & 127) << 8;
                    break;
                case 7:
                    output.push(String.fromCharCode(current + (c >> 8) + 32));
                    current = (c & 255) << 7;
                    break;
                case 8:
                    output.push(String.fromCharCode(current + (c >> 9) + 32));
                    current = (c & 511) << 6;
                    break;
                case 9:
                    output.push(String.fromCharCode(current + (c >> 10) + 32));
                    current = (c & 1023) << 5;
                    break;
                case 10:
                    output.push(String.fromCharCode(current + (c >> 11) + 32));
                    current = (c & 2047) << 4;
                    break;
                case 11:
                    output.push(String.fromCharCode(current + (c >> 12) + 32));
                    current = (c & 4095) << 3;
                    break;
                case 12:
                    output.push(String.fromCharCode(current + (c >> 13) + 32));
                    current = (c & 8191) << 2;
                    break;
                case 13:
                    output.push(String.fromCharCode(current + (c >> 14) + 32));
                    current = (c & 16383) << 1;
                    break;
                case 14:
                    output.push(String.fromCharCode(current + (c >> 15) + 32), String.fromCharCode((c & 32767) + 32));
                    status = 0;
                    break;
            }
        }
        output.push(String.fromCharCode(current + 32));
        return output.join("");
    }
    static unpackBinaryFromUTF16(input) {
        const output = [];
        let current = 0, status = 0, i = 0;
        while (i < input.length) {
            const c = input.charCodeAt(i) - 32;
            switch (status++) {
                case 0:
                    current = c << 1;
                    break;
                case 1:
                    output.push(String.fromCharCode(current | (c >> 14)));
                    current = (c & 16383) << 2;
                    break;
                case 2:
                    output.push(String.fromCharCode(current | (c >> 13)));
                    current = (c & 8191) << 3;
                    break;
                case 3:
                    output.push(String.fromCharCode(current | (c >> 12)));
                    current = (c & 4095) << 4;
                    break;
                case 4:
                    output.push(String.fromCharCode(current | (c >> 11)));
                    current = (c & 2047) << 5;
                    break;
                case 5:
                    output.push(String.fromCharCode(current | (c >> 10)));
                    current = (c & 1023) << 6;
                    break;
                case 6:
                    output.push(String.fromCharCode(current | (c >> 9)));
                    current = (c & 511) << 7;
                    break;
                case 7:
                    output.push(String.fromCharCode(current | (c >> 8)));
                    current = (c & 255) << 8;
                    break;
                case 8:
                    output.push(String.fromCharCode(current | (c >> 7)));
                    current = (c & 127) << 9;
                    break;
                case 9:
                    output.push(String.fromCharCode(current | (c >> 6)));
                    current = (c & 63) << 10;
                    break;
                case 10:
                    output.push(String.fromCharCode(current | (c >> 5)));
                    current = (c & 31) << 11;
                    break;
                case 11:
                    output.push(String.fromCharCode(current | (c >> 4)));
                    current = (c & 15) << 12;
                    break;
                case 12:
                    output.push(String.fromCharCode(current | (c >> 3)));
                    current = (c & 7) << 13;
                    break;
                case 13:
                    output.push(String.fromCharCode(current | (c >> 2)));
                    current = (c & 3) << 14;
                    break;
                case 14:
                    output.push(String.fromCharCode(current | (c >> 1)));
                    current = (c & 1) << 15;
                    break;
                case 15:
                    output.push(String.fromCharCode(current | c));
                    status = 0;
                    break;
            }
            i++;
        }
        return this.binaryToBase64(output.join(""));
    }
    static ArrayToLZBase64(_arrayBuffer) {
        const b64 = btoa(new Uint8Array(_arrayBuffer)
            .reduce((acc, byte) => acc + String.fromCharCode(byte), ""));
        return this.compressToBase64(b64);
    }
    static LZBase64ToArray(_lzBase64) {
        const b64 = this.decompressFromBase64(_lzBase64);
        if (b64 == null)
            throw new Error("CLZString: 압축 해제 실패");
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++)
            bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
    }
}
export class CLZ4 {
    static MAGIC = 0x184D2204;
    static FLG = 0x60;
    static BD = 0x70;
    static HC = 0xa2;
    static MIN_MATCH = 4;
    static COPY_LEN = 8;
    static LAST_LITS = 5;
    static HASH_LOG = 16;
    static HASH_SIZE = 1 << CLZ4.HASH_LOG;
    static WIN_MASK = 0xFFFF;
    _ht = new Int32Array(CLZ4.HASH_SIZE);
    _prev = new Int32Array(65536);
    static _u32(b, i) {
        return (b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24) >>> 0;
    }
    static _w32(b, i, v) {
        b[i] = v & 0xFF;
        b[i + 1] = (v >>> 8) & 0xFF;
        b[i + 2] = (v >>> 16) & 0xFF;
        b[i + 3] = (v >>> 24) & 0xFF;
    }
    static _hash(v) {
        return (Math.imul(v >>> 0, 0x9E3779B1) >>> (32 - CLZ4.HASH_LOG)) & (CLZ4.HASH_SIZE - 1);
    }
    _compressBlock(src, dst, sStart, sEnd, dStart, level) {
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
            prev[si & WIN_MASK] = ht[h];
            ht[h] = si;
            let bestLen = CLZ4.MIN_MATCH - 1;
            let bestRef = 0;
            let candidate = prev[si & WIN_MASK];
            let chain = maxChain;
            while (candidate > 0 && (si - candidate) < 0x10000 && chain-- > 0) {
                if (src[candidate + bestLen] === src[si + bestLen] &&
                    CLZ4._u32(src, candidate) === seq) {
                    let ml = CLZ4.MIN_MATCH;
                    while (si + ml < matchLimit && src[candidate + ml] === src[si + ml])
                        ml++;
                    if (ml > bestLen) {
                        bestLen = ml;
                        bestRef = candidate;
                        if (ml >= 64)
                            break;
                    }
                }
                candidate = prev[candidate & WIN_MASK];
            }
            if (bestLen < CLZ4.MIN_MATCH) {
                si++;
                continue;
            }
            if (level >= 4 && si + 1 <= mfLimit) {
                const seq2 = CLZ4._u32(src, si + 1);
                const h2 = CLZ4._hash(seq2);
                let cand2 = ht[h2];
                let chain2 = maxChain >> 1;
                let lazyBest = bestLen;
                while (cand2 > 0 && (si + 1 - cand2) < 0x10000 && chain2-- > 0) {
                    if (src[cand2 + lazyBest] === src[si + 1 + lazyBest] &&
                        CLZ4._u32(src, cand2) === seq2) {
                        let ml = CLZ4.MIN_MATCH;
                        while (si + 1 + ml < matchLimit && src[cand2 + ml] === src[si + 1 + ml])
                            ml++;
                        if (ml > lazyBest)
                            lazyBest = ml;
                    }
                    cand2 = prev[cand2 & WIN_MASK];
                }
                if (lazyBest > bestLen) {
                    si++;
                    continue;
                }
            }
            let msi = si;
            let mr = bestRef;
            while (msi > anchor && mr > sStart && src[msi - 1] === src[mr - 1]) {
                msi--;
                mr--;
            }
            const litLen = msi - anchor;
            const tok = di++;
            if (litLen >= 15) {
                dst[tok] = 0xF0;
                let r = litLen - 15;
                while (r >= 255) {
                    dst[di++] = 255;
                    r -= 255;
                }
                dst[di++] = r;
            }
            else {
                dst[tok] = litLen << 4;
            }
            dst.set(src.subarray(anchor, msi), di);
            di += litLen;
            const off = msi - mr;
            dst[di++] = off & 0xFF;
            dst[di++] = (off >>> 8) & 0xFF;
            const matchBase = msi;
            msi += CLZ4.MIN_MATCH;
            mr += CLZ4.MIN_MATCH;
            while (msi < matchLimit && src[msi] === src[mr]) {
                msi++;
                mr++;
            }
            const matchLen = msi - matchBase - CLZ4.MIN_MATCH;
            if (matchLen >= 15) {
                dst[tok] |= 0x0F;
                let r = matchLen - 15;
                while (r >= 255) {
                    dst[di++] = 255;
                    r -= 255;
                }
                dst[di++] = r;
            }
            else {
                dst[tok] |= matchLen;
            }
            si = anchor = msi;
        }
        const rem = sEnd - anchor;
        const tok = di++;
        if (rem >= 15) {
            dst[tok] = 0xF0;
            let r = rem - 15;
            while (r >= 255) {
                dst[di++] = 255;
                r -= 255;
            }
            dst[di++] = r;
        }
        else {
            dst[tok] = rem << 4;
        }
        dst.set(src.subarray(anchor, sEnd), di);
        return di + rem;
    }
    static _decompressBlock(src, dst, si, siEnd, di) {
        while (si < siEnd) {
            const tok = src[si++];
            let litLen = (tok >>> 4) & 0xF;
            if (litLen === 15) {
                while (src[si] === 255) {
                    litLen += 255;
                    si++;
                }
                litLen += src[si++];
            }
            dst.set(src.subarray(si, si + litLen), di);
            si += litLen;
            di += litLen;
            if (si >= siEnd)
                break;
            const off = src[si] | src[si + 1] << 8;
            si += 2;
            if (off === 0)
                throw new Error('CLZ4: zero offset');
            let matchLen = (tok & 0xF) + CLZ4.MIN_MATCH;
            if ((tok & 0xF) === 15) {
                while (src[si] === 255) {
                    matchLen += 255;
                    si++;
                }
                matchLen += src[si++];
            }
            let mr = di - off;
            for (let k = 0; k < matchLen; k++)
                dst[di++] = dst[mr++];
        }
        return di;
    }
    compress(src, level = 6) {
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
        CLZ4._w32(buf, blockEnd, 0);
        return buf.subarray(0, blockEnd + 4);
    }
    decompress(src, originalSize) {
        let si = 0;
        if (CLZ4._u32(src, si) !== CLZ4.MAGIC)
            throw new Error('CLZ4: invalid magic');
        si += 4;
        const flg = src[si++];
        si++;
        if ((flg & 0x08) !== 0)
            si += 8;
        si++;
        const dst = new Uint8Array(originalSize ?? src.length * 255);
        let di = 0;
        while (si < src.length) {
            const raw = CLZ4._u32(src, si);
            si += 4;
            if (raw === 0)
                break;
            const uncompressed = (raw & 0x80000000) !== 0;
            const dataSize = raw & 0x7FFFFFFF;
            if (uncompressed) {
                dst.set(src.subarray(si, si + dataSize), di);
                di += dataSize;
            }
            else {
                di = CLZ4._decompressBlock(src, dst, si, si + dataSize, di);
            }
            si += dataSize;
            if ((flg & 0x10) !== 0)
                si += 4;
        }
        return dst.subarray(0, di);
    }
}

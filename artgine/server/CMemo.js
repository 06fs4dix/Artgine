import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
export class CMemo {
    static sRootDir = './db/Memo';
    static sKeyPattern = /^[A-Za-z0-9_-]+$/;
    static sIdPattern = /^[A-Za-z0-9_-]+$/;
    static sPreviewLen = 80;
    static sMetaFile = '.enc.json';
    static SanitizeKey(_key) {
        const key = (_key ?? '').trim();
        if (!key || !CMemo.sKeyPattern.test(key)) {
            throw new Error('잘못된 key');
        }
        return key;
    }
    static SanitizeId(_id) {
        const id = (_id ?? '').trim();
        if (!id || !CMemo.sIdPattern.test(id)) {
            throw new Error('잘못된 id');
        }
        return id;
    }
    static KeyDir(_key) {
        return path.join(CMemo.sRootDir, CMemo.SanitizeKey(_key));
    }
    static FileExt(_dir) {
        return CMemo.IsEncrypted(_dir) ? '.enc' : '.txt';
    }
    static FilePath(_key, _id) {
        const dir = CMemo.KeyDir(_key);
        return path.join(dir, CMemo.SanitizeId(_id) + CMemo.FileExt(dir));
    }
    static BuildPreview(_content) {
        const flat = _content.trim().replace(/\s+/g, ' ');
        return flat.length > CMemo.sPreviewLen ? flat.slice(0, CMemo.sPreviewLen) + '...' : flat;
    }
    static FormatDateTimeId(_d) {
        const pad = (n, len = 2) => String(n).padStart(len, '0');
        return `${_d.getFullYear()}${pad(_d.getMonth() + 1)}${pad(_d.getDate())}${pad(_d.getHours())}${pad(_d.getMinutes())}${pad(_d.getSeconds())}${pad(_d.getMilliseconds(), 3)}`;
    }
    static IsEncrypted(_dir) {
        return fs.existsSync(path.join(_dir, CMemo.sMetaFile));
    }
    static LoadMeta(_dir) {
        return JSON.parse(fs.readFileSync(path.join(_dir, CMemo.sMetaFile), 'utf-8'));
    }
    static DeriveKey(_password, _saltHex) {
        return crypto.scryptSync(_password, Buffer.from(_saltHex, 'hex'), 32);
    }
    static EncryptText(_text, _key) {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', _key, iv);
        const enc = Buffer.concat([cipher.update(_text, 'utf-8'), cipher.final()]);
        return Buffer.concat([iv, cipher.getAuthTag(), enc]);
    }
    static DecryptBuffer(_buf, _key) {
        const iv = _buf.subarray(0, 12);
        const tag = _buf.subarray(12, 28);
        const enc = _buf.subarray(28);
        const decipher = crypto.createDecipheriv('aes-256-gcm', _key, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf-8');
    }
    static VerifyPassword(_dir, _password) {
        const password = (_password ?? '').trim();
        if (!password) {
            throw new Error('비밀번호가 필요합니다');
        }
        const meta = CMemo.LoadMeta(_dir);
        const key = CMemo.DeriveKey(password, meta.salt);
        try {
            CMemo.DecryptBuffer(Buffer.from(meta.check, 'base64'), key);
        }
        catch {
            throw new Error('비밀번호가 틀렸습니다');
        }
        return key;
    }
    static RequireKey(_dir, _password) {
        if (!CMemo.IsEncrypted(_dir))
            return null;
        return CMemo.VerifyPassword(_dir, _password);
    }
    static EnsureEncryption(_dir, _password) {
        const password = (_password ?? '').trim();
        if (!password) {
            throw new Error('비밀번호가 필요합니다');
        }
        if (CMemo.IsEncrypted(_dir)) {
            return CMemo.VerifyPassword(_dir, password);
        }
        const salt = crypto.randomBytes(16).toString('hex');
        const key = CMemo.DeriveKey(password, salt);
        const check = CMemo.EncryptText('OK', key).toString('base64');
        fs.writeFileSync(path.join(_dir, CMemo.sMetaFile), JSON.stringify({ salt, check }), 'utf-8');
        for (const file of fs.readdirSync(_dir)) {
            if (!file.endsWith('.txt'))
                continue;
            const full = path.join(_dir, file);
            const content = fs.readFileSync(full, 'utf-8');
            fs.writeFileSync(path.join(_dir, file.slice(0, -4) + '.enc'), CMemo.EncryptText(content, key));
            fs.unlinkSync(full);
        }
        return key;
    }
    static async Connect(_key, _password = null) {
        const trimmed = (_key ?? '').trim();
        const key = trimmed.length > 0 ? CMemo.SanitizeKey(trimmed) : CMemo.FormatDateTimeId(new Date());
        const dir = CMemo.KeyDir(key);
        fs.mkdirSync(dir, { recursive: true });
        const password = (_password ?? '').trim();
        if (password) {
            CMemo.EnsureEncryption(dir, password);
        }
        else if (CMemo.IsEncrypted(dir)) {
            throw new Error('비밀번호가 필요합니다');
        }
        return key;
    }
    static async Rename(_key, _newKey) {
        const oldDir = CMemo.KeyDir(_key);
        const newKey = CMemo.SanitizeKey(_newKey);
        const newDir = CMemo.KeyDir(newKey);
        if (!fs.existsSync(oldDir)) {
            throw new Error('원래 key를 찾을 수 없음');
        }
        if (fs.existsSync(newDir)) {
            throw new Error('이미 존재하는 key');
        }
        fs.renameSync(oldDir, newDir);
        return newKey;
    }
    static async ListKeys() {
        if (!fs.existsSync(CMemo.sRootDir)) {
            return [];
        }
        return fs.readdirSync(CMemo.sRootDir, { withFileTypes: true })
            .filter(e => e.isDirectory())
            .map(e => e.name)
            .sort((a, b) => a.localeCompare(b));
    }
    static async List(_key, _password = null) {
        const dir = CMemo.KeyDir(_key);
        if (!fs.existsSync(dir)) {
            return [];
        }
        const key = CMemo.RequireKey(dir, _password);
        const records = [];
        for (const file of fs.readdirSync(dir)) {
            const isEnc = file.endsWith('.enc');
            if (!isEnc && !file.endsWith('.txt'))
                continue;
            const full = path.join(dir, file);
            const stat = fs.statSync(full);
            const content = isEnc ? CMemo.DecryptBuffer(fs.readFileSync(full), key) : fs.readFileSync(full, 'utf-8');
            records.push({ id: file.slice(0, -4), preview: CMemo.BuildPreview(content), date: stat.mtimeMs });
        }
        records.sort((a, b) => b.date - a.date);
        return records;
    }
    static async Get(_key, _id, _password = null) {
        const dir = CMemo.KeyDir(_key);
        const key = CMemo.RequireKey(dir, _password);
        const file = path.join(dir, CMemo.SanitizeId(_id) + (key ? '.enc' : '.txt'));
        if (!fs.existsSync(file)) {
            return null;
        }
        const content = key ? CMemo.DecryptBuffer(fs.readFileSync(file), key) : fs.readFileSync(file, 'utf-8');
        const stat = fs.statSync(file);
        return { id: _id, content, preview: CMemo.BuildPreview(content), date: stat.mtimeMs };
    }
    static NewId(_dir, _ext) {
        let id = CMemo.FormatDateTimeId(new Date());
        let n = 2;
        while (fs.existsSync(path.join(_dir, id + _ext))) {
            id = CMemo.FormatDateTimeId(new Date()) + '_' + n;
            n++;
        }
        return id;
    }
    static async Save(_key, _id, _text, _password = null) {
        const dir = CMemo.KeyDir(_key);
        fs.mkdirSync(dir, { recursive: true });
        const key = CMemo.RequireKey(dir, _password);
        const ext = key ? '.enc' : '.txt';
        const id = _id && _id.trim().length > 0
            ? CMemo.SanitizeId(_id)
            : CMemo.NewId(dir, ext);
        const file = path.join(dir, id + ext);
        if (key) {
            fs.writeFileSync(file, CMemo.EncryptText(_text, key));
        }
        else {
            fs.writeFileSync(file, _text, 'utf-8');
        }
        const stat = fs.statSync(file);
        return { id, preview: CMemo.BuildPreview(_text), date: stat.mtimeMs };
    }
    static async Delete(_key, _id, _password = null) {
        const dir = CMemo.KeyDir(_key);
        CMemo.RequireKey(dir, _password);
        const file = CMemo.FilePath(_key, _id);
        if (!fs.existsSync(file)) {
            return false;
        }
        fs.unlinkSync(file);
        return true;
    }
}

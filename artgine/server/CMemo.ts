import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export type MemoRecord = {
    id: string;
    preview: string;
    date: number;
};

export type MemoFull = MemoRecord & { content: string };

// 단순 파일 기반 메모 저장소. 메모 하나 = txt(평문) 또는 enc(암호화) 파일 하나, key 하나 = db/Memo/<key>/ 폴더 하나.
// 카테고리/태그/AI 검색 등은 없다 - 접속(key) / 리스트 / 삭제만 있는 단순 메모앱용.
//
// 암호화(선택): key 폴더 안에 .enc.json(메타: salt + 검증용 값)이 있으면 그 key는 "암호화 모드"다.
// 암호화 모드에서는 모든 메모가 AES-256-GCM으로 암호화된 .enc 파일로 저장된다(비밀번호로 유도한 키 사용).
// 비밀번호는 서버에 저장하지 않는다 - 매 요청마다 클라이언트가 같이 보내고, 그 요청을 처리하는 순간에만 메모리에서
// 잠깐 복호화/암호화한다. 디스크에는 항상 암호화된 상태로만 남는다.
export class CMemo {
    private static sRootDir = './db/Memo';
    private static sKeyPattern = /^[A-Za-z0-9_-]+$/;
    private static sIdPattern = /^[A-Za-z0-9_-]+$/;
    private static sPreviewLen = 80;
    private static sMetaFile = '.enc.json';

    private static SanitizeKey(_key: string): string {
        const key = (_key ?? '').trim();
        if (!key || !CMemo.sKeyPattern.test(key)) {
            throw new Error('잘못된 key');
        }
        return key;
    }

    private static SanitizeId(_id: string): string {
        const id = (_id ?? '').trim();
        if (!id || !CMemo.sIdPattern.test(id)) {
            throw new Error('잘못된 id');
        }
        return id;
    }

    private static KeyDir(_key: string): string {
        return path.join(CMemo.sRootDir, CMemo.SanitizeKey(_key));
    }

    private static FileExt(_dir: string): '.enc' | '.txt' {
        return CMemo.IsEncrypted(_dir) ? '.enc' : '.txt';
    }

    private static FilePath(_key: string, _id: string): string {
        const dir = CMemo.KeyDir(_key);
        return path.join(dir, CMemo.SanitizeId(_id) + CMemo.FileExt(dir));
    }

    private static BuildPreview(_content: string): string {
        const flat = _content.trim().replace(/\s+/g, ' ');
        return flat.length > CMemo.sPreviewLen ? flat.slice(0, CMemo.sPreviewLen) + '...' : flat;
    }

    // 랜덤 문자열 대신 접속/생성 시각을 그대로 id/key로 쓴다 (YYYYMMDDHHmmssSSS).
    private static FormatDateTimeId(_d: Date): string {
        const pad = (n: number, len = 2) => String(n).padStart(len, '0');
        return `${_d.getFullYear()}${pad(_d.getMonth() + 1)}${pad(_d.getDate())}${pad(_d.getHours())}${pad(_d.getMinutes())}${pad(_d.getSeconds())}${pad(_d.getMilliseconds(), 3)}`;
    }

    // ==============================================================================================================
    // 암호화 (AES-256-GCM, 비밀번호 -> scrypt로 키 유도)
    // ==============================================================================================================
    private static IsEncrypted(_dir: string): boolean {
        return fs.existsSync(path.join(_dir, CMemo.sMetaFile));
    }

    private static LoadMeta(_dir: string): { salt: string; check: string } {
        return JSON.parse(fs.readFileSync(path.join(_dir, CMemo.sMetaFile), 'utf-8'));
    }

    private static DeriveKey(_password: string, _saltHex: string): Buffer {
        return crypto.scryptSync(_password, Buffer.from(_saltHex, 'hex'), 32);
    }

    private static EncryptText(_text: string, _key: Buffer): Buffer {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', _key, iv);
        const enc = Buffer.concat([cipher.update(_text, 'utf-8'), cipher.final()]);
        return Buffer.concat([iv, cipher.getAuthTag(), enc]);
    }

    private static DecryptBuffer(_buf: Buffer, _key: Buffer): string {
        const iv = _buf.subarray(0, 12);
        const tag = _buf.subarray(12, 28);
        const enc = _buf.subarray(28);
        const decipher = crypto.createDecipheriv('aes-256-gcm', _key, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf-8');
    }

    // 이미 암호화 모드인 폴더에서 비밀번호가 맞는지 확인하고, 맞으면 유도된 키를 돌려준다.
    private static VerifyPassword(_dir: string, _password: string | null): Buffer {
        const password = (_password ?? '').trim();
        if (!password) {
            throw new Error('비밀번호가 필요합니다');
        }
        const meta = CMemo.LoadMeta(_dir);
        const key = CMemo.DeriveKey(password, meta.salt);
        try {
            CMemo.DecryptBuffer(Buffer.from(meta.check, 'base64'), key);
        } catch {
            throw new Error('비밀번호가 틀렸습니다');
        }
        return key;
    }

    // 암호화 모드가 아니면 null(암호화 불필요), 암호화 모드면 비밀번호를 검증하고 키를 돌려준다.
    private static RequireKey(_dir: string, _password: string | null): Buffer | null {
        if (!CMemo.IsEncrypted(_dir)) return null;
        return CMemo.VerifyPassword(_dir, _password);
    }

    // 처음 비밀번호를 설정하는 순간: 메타(salt+검증값)를 만들고, 이미 있던 평문 메모들을 전부
    // 암호화 파일로 변환한다(원본 평문 파일은 지운다). 이미 암호화 모드면 비밀번호 검증만 한다.
    private static EnsureEncryption(_dir: string, _password: string): Buffer {
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
            if (!file.endsWith('.txt')) continue;
            const full = path.join(_dir, file);
            const content = fs.readFileSync(full, 'utf-8');
            fs.writeFileSync(path.join(_dir, file.slice(0, -4) + '.enc'), CMemo.EncryptText(content, key));
            fs.unlinkSync(full);
        }
        return key;
    }

    // key를 비워서 넘기면 접속 시각(날짜시간)을 키로 새로 발급해서 그 폴더를 만든다. 값이 있으면(형식이 맞으면)
    // 그 key 그대로 폴더를 만들어(이미 있으면 그대로 사용) 반환한다.
    // password를 같이 넘기면: 처음이면 그 폴더를 암호화 모드로 전환(기존 평문 메모도 함께 변환)하고,
    // 이미 암호화 모드면 비밀번호가 맞는지 검증한다(틀리면 에러). 이미 암호화 모드인데 password 없이 접속하면 에러.
    public static async Connect(_key: string, _password: string | null = null): Promise<string> {
        const trimmed = (_key ?? '').trim();
        const key = trimmed.length > 0 ? CMemo.SanitizeKey(trimmed) : CMemo.FormatDateTimeId(new Date());
        const dir = CMemo.KeyDir(key);
        fs.mkdirSync(dir, { recursive: true });
        const password = (_password ?? '').trim();
        if (password) {
            CMemo.EnsureEncryption(dir, password);
        } else if (CMemo.IsEncrypted(dir)) {
            throw new Error('비밀번호가 필요합니다');
        }
        return key;
    }

    // key(폴더) 자체의 이름을 바꾼다 - 안에 있는 메모 파일들(및 암호화 메타)은 그대로 새 폴더로 함께 옮겨진다.
    public static async Rename(_key: string, _newKey: string): Promise<string> {
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

    // 접속 화면에 보여줄, 지금까지 만들어진 key(폴더) 목록 - 이름순.
    public static async ListKeys(): Promise<string[]> {
        if (!fs.existsSync(CMemo.sRootDir)) {
            return [];
        }
        return fs.readdirSync(CMemo.sRootDir, { withFileTypes: true })
            .filter(e => e.isDirectory())
            .map(e => e.name)
            .sort((a, b) => a.localeCompare(b));
    }

    public static async List(_key: string, _password: string | null = null): Promise<MemoRecord[]> {
        const dir = CMemo.KeyDir(_key);
        if (!fs.existsSync(dir)) {
            return [];
        }
        const key = CMemo.RequireKey(dir, _password);
        const records: MemoRecord[] = [];
        for (const file of fs.readdirSync(dir)) {
            const isEnc = file.endsWith('.enc');
            if (!isEnc && !file.endsWith('.txt')) continue;
            const full = path.join(dir, file);
            const stat = fs.statSync(full);
            const content = isEnc ? CMemo.DecryptBuffer(fs.readFileSync(full), key!) : fs.readFileSync(full, 'utf-8');
            records.push({ id: file.slice(0, -4), preview: CMemo.BuildPreview(content), date: stat.mtimeMs });
        }
        records.sort((a, b) => b.date - a.date);
        return records;
    }

    public static async Get(_key: string, _id: string, _password: string | null = null): Promise<MemoFull | null> {
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

    // id가 없으면 새 파일을 만들고(id 새로 발급 - 랜덤 문자열이 아니라 생성 시각), 있으면 기존 파일을 덮어쓴다.
    private static NewId(_dir: string, _ext: string): string {
        let id = CMemo.FormatDateTimeId(new Date());
        // 같은 밀리초에 두 번 생성되는 것 같은 극히 드문 충돌만 순번을 붙여 피한다.
        let n = 2;
        while (fs.existsSync(path.join(_dir, id + _ext))) {
            id = CMemo.FormatDateTimeId(new Date()) + '_' + n;
            n++;
        }
        return id;
    }

    public static async Save(_key: string, _id: string | null, _text: string, _password: string | null = null): Promise<MemoRecord> {
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
        } else {
            fs.writeFileSync(file, _text, 'utf-8');
        }
        const stat = fs.statSync(file);
        return { id, preview: CMemo.BuildPreview(_text), date: stat.mtimeMs };
    }

    public static async Delete(_key: string, _id: string, _password: string | null = null): Promise<boolean> {
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

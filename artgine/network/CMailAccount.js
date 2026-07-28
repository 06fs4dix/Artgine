import { CStorage } from '../system/CStorage.js';
import { CAuthInfo } from './CAuthInfo.js';
const MAIL_ACCOUNT_KEY = 'messengerMailAccount';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export class CMailAccount {
    static IsEmail(_value) {
        return EMAIL_RE.test(_value);
    }
    static Empty() {
        return { address: '', port: '', id: '', pw: '' };
    }
    static Sanitize(rec) {
        return {
            address: String(rec?.address ?? '').trim(),
            port: String(rec?.port ?? '').trim(),
            id: String(rec?.id ?? '').trim(),
            pw: String(rec?.pw ?? ''),
        };
    }
    static Load() {
        try {
            const raw = CStorage.Get(MAIL_ACCOUNT_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            return { smtp: CMailAccount.Sanitize(parsed?.smtp), imap: CMailAccount.Sanitize(parsed?.imap) };
        }
        catch {
            return { smtp: CMailAccount.Empty(), imap: CMailAccount.Empty() };
        }
    }
    static Save(_account) {
        CStorage.Set(MAIL_ACCOUNT_KEY, JSON.stringify(_account));
    }
    static IsConfigured(_account) {
        return _account.smtp.address !== '' && _account.imap.address !== '';
    }
    static ToAuthInfo(_rec) {
        const auth = new CAuthInfo();
        auth.mAddres = _rec.address;
        auth.mPort = _rec.port;
        auth.mID = _rec.id;
        auth.mPW = _rec.pw;
        return auth;
    }
}

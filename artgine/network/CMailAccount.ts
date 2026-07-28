import { CStorage } from '../system/CStorage.js';
import { CAuthInfo } from './CAuthInfo.js';

// 이메일 발신(SMTP)/수신(IMAP) 계정 정보의 Env.json 키. 값은 JSON 문자열(CStorage는 문자열만 보관한다).
// CMessengerRouter(설정 UI)와 CMessenger(실제 발신/수신) 양쪽이 같은 계정 하나를 공유해서 쓴다.
const MAIL_ACCOUNT_KEY = 'messengerMailAccount';

export type CMailAuthRec = { address: string; port: string; id: string; pw: string };
export type CMailAccountRec = { smtp: CMailAuthRec; imap: CMailAuthRec };

// 로컬파트만 있고 '@'가 없는 아이디(예: 네이버는 로그인은 로컬파트만으로도 허용)를 ID로 저장하면,
// CMail.Send가 그 값을 From 헤더에 그대로 써서 서버가 "sender address is unauthorized"로 거부한다.
// 그래서 계정 ID는 로그인용이 아니라 처음부터 완전한 이메일 주소로만 받는다 — 발신/수신 모두
// 상대를 이메일 주소(로컬파트@도메인) 하나로 통일해서 다루기 위해서다.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CMailAccount {
    static IsEmail(_value: string): boolean {
        return EMAIL_RE.test(_value);
    }

    static Empty(): CMailAuthRec {
        return { address: '', port: '', id: '', pw: '' };
    }

    // 저장된 값이 손상됐거나 예전 포맷이어도 죽지 않도록, 필드 모양을 여기서 한 번 강제한다.
    static Sanitize(rec: any): CMailAuthRec {
        return {
            address: String(rec?.address ?? '').trim(),
            port:    String(rec?.port    ?? '').trim(),
            id:      String(rec?.id      ?? '').trim(),
            pw:      String(rec?.pw      ?? ''),
        };
    }

    static Load(): CMailAccountRec {
        try {
            const raw = CStorage.Get(MAIL_ACCOUNT_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            return { smtp: CMailAccount.Sanitize(parsed?.smtp), imap: CMailAccount.Sanitize(parsed?.imap) };
        } catch {
            return { smtp: CMailAccount.Empty(), imap: CMailAccount.Empty() };
        }
    }

    static Save(_account: CMailAccountRec): void {
        CStorage.Set(MAIL_ACCOUNT_KEY, JSON.stringify(_account));
    }

    // 이메일 메신저 세션을 만들 수 있는 최소 조건(주소가 둘 다 채워져 있는지)만 본다.
    // 실제 로그인 가능 여부는 onEmailSet에서 저장 시점에 이미 검증됐다는 전제다.
    static IsConfigured(_account: CMailAccountRec): boolean {
        return _account.smtp.address !== '' && _account.imap.address !== '';
    }

    static ToAuthInfo(_rec: CMailAuthRec): CAuthInfo {
        const auth = new CAuthInfo();
        auth.mAddres = _rec.address;
        auth.mPort = _rec.port;
        auth.mID = _rec.id;
        auth.mPW = _rec.pw;
        return auth;
    }
}

let nodemailerModule = null;
export class CMail {
    static async Send(_auth, _to, _subject, _html) {
        if (!nodemailerModule) {
            nodemailerModule = await import('nodemailer');
        }
        const port = parseInt(_auth.mPort, 10);
        const secure = port === 465;
        const transporter = nodemailerModule.createTransport({
            host: _auth.mAddres,
            port: port,
            secure: secure,
            auth: {
                user: _auth.mID,
                pass: _auth.mPW,
            },
        });
        const mailOptions = {
            from: _auth.mID,
            to: _to,
            subject: _subject,
            html: _html,
        };
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('메일 전송 성공:', info.response);
            return true;
        }
        catch (err) {
            console.error('메일 전송 실패:', err);
            return false;
        }
    }
}

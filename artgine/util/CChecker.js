export class CChecker {
    static Exe(_checkFun, _time = 500) {
        return new Promise((resolve, reject) => {
            const dummy = async () => {
                try {
                    const result = await _checkFun();
                    if (result == false)
                        resolve();
                    else
                        setTimeout(dummy, _time);
                }
                catch (err) {
                    reject(err);
                }
            };
            setTimeout(dummy, _time);
        });
    }
}

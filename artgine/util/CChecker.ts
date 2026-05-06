export class CChecker 
{
	//false하면 끝난다
	static Exe(_checkFun: () => Promise<boolean>, _time = 500): Promise<void> 
	{
		return new Promise((resolve, reject) => 
		{
			const dummy = async () => {
				try {
					const result = await _checkFun();
					if (result==false)
						resolve();
					else
						setTimeout(dummy, _time);
				} catch (err) {
					reject(err);
				}
			};
			setTimeout(dummy, _time);
		});
	}
}
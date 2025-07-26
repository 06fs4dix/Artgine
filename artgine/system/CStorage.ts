var DB_NAME = "CStorageDB";
var STORE_NAME = "CStorageStore";
var DB_VERSION = 1;
var g_db=null
export class CStorage
{



    // IndexedDB 연결
    static async openDB() {
        return new Promise((resolve, reject) => {
			if(g_db!=null)
			{
				resolve(g_db);
				return;
			}
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                g_db = event.target.result;
                if (!g_db.objectStoreNames.contains(STORE_NAME)) {
                    g_db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("IndexedDB open failed");
        });
    }
	
	static Get(_key,_init=null)
	{
		var value=localStorage.getItem(_key);
		if(value==null)
		{
			localStorage.setItem(_key,_init);
			value=_init;
		}
		if(value=="null")
			return null;
		return value;
	}
	static Set(_key,_value)
	{
		localStorage.setItem(_key,_value);
	}
	static async IGet(_key, _init = null) {
        const db = await CStorage.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(_key);

            request.onsuccess = () => {
                let value = request.result;
                if (value == null) {
                    CStorage.ISet(_key, _init).then(() => resolve(_init));
                } else {
                    resolve(value);
                }
            };

            request.onerror = () => reject("Get operation failed");
        });
    }

    // 데이터 저장하기
    static async ISet(_key, _value) {
        const db = await CStorage.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(_value, _key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject("Set operation failed");
        });
    }
	
}
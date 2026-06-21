import { CPath } from "../basic/CPath.js";
import { CUtil } from "../basic/CUtil.js";

var DB_NAME = "CStorageDB";
var STORE_NAME = "CStorageStore";
var DB_VERSION = 1;
var g_db:any=null
export class CStorage
{
	private static mNodeData: Record<string, string> = null;
	private static mNodeFilePath = "";

	private static NodeModule(_name: string): any
	{
		const proc = (globalThis as any).process;
		if(proc?.getBuiltinModule!=null)
			return proc.getBuiltinModule(_name);

		const req = (globalThis as any).require;
		if(req!=null)
			return req(_name);

		throw new Error("Node module is not available: " + _name);
	}

	private static NodePaths(): string[]
	{
		return [
			CPath.WorkingPath()+"Env.json",
			CPath.ArtgineRootPath()+"desktop/Env.json"
		];
	}

	private static NodeLoad()
	{
		if(CStorage.mNodeData!=null)
			return;

		const fs = CStorage.NodeModule("fs");
		CStorage.mNodeData = {};
		for(const filePath of CStorage.NodePaths())
		{
			if(!fs.existsSync(filePath))
				continue;

			const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
			if(parsed==null || typeof parsed!="object" || Array.isArray(parsed))
				throw new Error("Env.json root must be a JSON object.");

			for(const key of Object.keys(parsed))
			{
				const value = parsed[key];
				CStorage.mNodeData[key] = value==null ? "null" : String(value);
			}
			CStorage.mNodeFilePath = filePath;
			return;
		}

		CStorage.mNodeFilePath = CStorage.NodePaths()[0];
	}

	private static NodeSave()
	{
		const fs = CStorage.NodeModule("fs");
		const path = CStorage.NodeModule("path");
		fs.mkdirSync(path.dirname(CStorage.mNodeFilePath), {recursive:true});
		fs.writeFileSync(CStorage.mNodeFilePath, JSON.stringify(CStorage.mNodeData, null, 2), "utf8");
	}



    // IndexedDB 연결
    static async openDB(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
			if(g_db!=null)
			{
				resolve(g_db);
				return;
			}
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event:any) => {
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
		if(CUtil.IsNode())
		{
			CStorage.NodeLoad();
			var nodeValue=CStorage.mNodeData[_key];
			if(nodeValue==null)
			{
				nodeValue=_init==null ? "null" : String(_init);
				CStorage.mNodeData[_key]=nodeValue;
				CStorage.NodeSave();
			}
			if(nodeValue=="null")
				return null;
			return nodeValue;
		}
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
		if(CUtil.IsNode())
		{
			CStorage.NodeLoad();
			CStorage.mNodeData[_key]=_value==null ? "null" : String(_value);
			CStorage.NodeSave();
			return;
		}
		localStorage.setItem(_key,_value);
	}
	static async IGet(_key, _init = null) {
        const db:any = await CStorage.openDB();
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
        const db:any = await CStorage.openDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(_value, _key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject("Set operation failed");
        });
    }
	
}

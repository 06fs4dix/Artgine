import {CAlert} from "../basic/CAlert.js";
import {CObject} from "../basic/CObject.js";
import {CUtil} from "../basic/CUtil.js";


var gCaacheMap=new Map<string,ArrayBuffer>();

export class CFile
{
	static PushCache(_key : string,_data : ArrayBuffer)
	{
		gCaacheMap.set(_key,_data);
	}
    static Load(_name : string=null,_modal=false)
    {
		let cbuf=gCaacheMap.get(_name);
		if(cbuf!=null)	return cbuf;




		if(CUtil.IsNode())
		{
			return new Promise<ArrayBuffer>(async (resolve, reject) => {
				try 
				{
					if (_name.startsWith("http:") || _name.startsWith("https:")) 
					{
						const https = await import('https');
						const http = await import('http');
						const client = _name.startsWith("https:") ? https : http;
	
						client.get(_name, (res) => 
						{
							if (res.statusCode !== 200) {
								CAlert.E(`HTTP error ${res.statusCode} for ${_name}`);
								resolve(null);
								return;
							}
							const chunks: Buffer[] = [];
							res.on("data", (chunk) => chunks.push(chunk));
							res.on("end", () => {
								const buffer = Buffer.concat(chunks);
								resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
							});
						}).on("error", (err) => {
							CAlert.E("HTTP request error: " + err.message);
							resolve(null);
						});
						
					}
					else
					{
						const fs = await import('fs/promises');
						//CConsol.Log("CFile.Load : "+_name);
						const data = await fs.readFile(_name);
						resolve(data.buffer); // Node에서는 Buffer → ArrayBuffer
					}				
				} 
				catch (err) {
					CAlert.W("Node.js load error: " + err.message);
					resolve(null);
				}
			});
		}
        else {
			return new Promise<ArrayBuffer>((resolve, reject) => {
				if (!_name || _name === "" || _modal) 
				{
					// 🔹 파일 선택 모달 열기
					const input = document.createElement("input");
					input.type = "file";
					input.accept = "*/*";
					input.style.display = "none";
		
					input.onchange = () => {
						if (input.files.length === 0) {
							CAlert.E("파일이 선택되지 않았습니다.");
							resolve(null);
							return;
						}
		
						const file = input.files[0];
						const reader = new FileReader();
						reader.onload = () => {
							resolve(reader.result as ArrayBuffer);
						};
						reader.onerror = () => {
							CAlert.E("파일 읽기 실패");
							resolve(null);
						};
						reader.readAsArrayBuffer(file);
					};
		
					document.body.appendChild(input);
					input.click();
					input.remove();
				} else {
					// 🔹 기존 URL 경로 로드
					const oReq = new XMLHttpRequest();
					oReq.onload = (e) => {
						if (oReq.status !== 200) {
							CAlert.W("XHR 로딩 오류: " + oReq.status);
							resolve(null);
						} else {
							resolve(oReq.response);
						}
					};
					oReq.onerror=()=>{
						resolve(null);
					};
					oReq.open("GET", _name);
					oReq.responseType = "arraybuffer";
					oReq.send();
				}
			});
		}
    }
    static async Save(_buf : string|Object|ArrayBuffer|CObject,_fileName : string=null,_modal=false)
    {

		if(_fileName==null)
		{
			let today = new Date();
			let month = today.getMonth() + 1; // 월
			let date = today.getDate(); // 날짜
			let hours = today.getHours(); // 시
			let minutes = today.getMinutes(); // 분
			let seconds = today.getSeconds(); // 초
			// if (_buf instanceof CObject)
			// 	_fileName = _buf.constructor.name
			_fileName = month + "-" + date + " " + hours + "-" + minutes + "-" + seconds;
			if (_buf instanceof ArrayBuffer) 
			{

			}
			else if (_buf instanceof CObject) {
				_fileName=_buf.constructor.name+_fileName+".json";
				_buf=_buf.ToStr();
			}
			else if (typeof _buf === "object") {
				_fileName=_fileName+".json";
			}
			else
				_fileName=_fileName+".txt";
		}


		if (CUtil.IsNode()) 
		{
			try 
			{
				const fs = await import("fs/promises");
				const path = await import("path");
		
				let fileBuf: string | Buffer;
				let encoding: BufferEncoding | null = "utf-8";
				
				if (_buf instanceof ArrayBuffer) {
					fileBuf = Buffer.from(_buf);
					encoding = null; // binary
				}
				else if (_buf instanceof CObject) {
					_buf=_buf.ToStr();
				
				}
				else if (typeof _buf === "object") {
					fileBuf = JSON.stringify(_buf, null, 2);
				}
				else {
					fileBuf = _buf;
				}
		
				let savePath = _fileName;
		
				if (_modal) {
					const { dialog, BrowserWindow } = await import("electron");
					const win = BrowserWindow.getFocusedWindow();
		
					const result = await dialog.showSaveDialog(win, {
						title: "Save File",
						defaultPath: _fileName,
					});
		
					if (result.canceled || !result.filePath) {
						CAlert.E("저장이 취소되었습니다.");
						return;
					}
					savePath = result.filePath;
				}
		
				await fs.writeFile(savePath, fileBuf, encoding ?? undefined);
			} catch (err) {
				CAlert.E("Node.js save error: " + err.message);
			}
			return;
		}
		else
		{
			if(_fileName.indexOf(".") == -1) {
				_fileName += ".*";
			}
			let pos = _fileName.lastIndexOf(".") + 1;
			let name : string = _fileName.substring(0, pos - 1);
			let ext : string = _fileName.substring(pos, _fileName.length).toLowerCase();
	
			var extToMimes = {
				'aac': 'audio/aac',
				'abw': 'application/x-abiword',
				'apng': 'image/apng',
				'arc': 'application/x-freearc',
				'avif': 'image/avif',
				'avi': 'video/x-msvideo',
				'azw': 'application/vnd.amazon.ebook',
				'bin': 'application/octet-stream',
				'bmp': 'image/bmp',
				'bz': 'application/x-bzip',
				'bz2': 'application/x-bzip2',
				'cda': 'application/x-cdf',
				'csh': 'application/x-csh',
				'css': 'text/css',
				'csv': 'text/csv',
				'doc': 'application/msword',
				'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'eot': 'application/vnd.ms-fontobject',
				'epub': 'application/epub+zip',
				'gz': 'application/gzip',
				'gif': 'image/gif',
				'htm': 'text/html',
				'html': 'text/html',
				'ico': 'image/vnd.microsoft.icon',
				'ics': 'text/calendar',
				'jar': 'application/java-archive',
				'jpeg': 'image/jpeg',
				'jpg': 'image/jpeg',
				'js': 'text/javascript',
				'json': 'application/json',
				'jsonld': 'application/ld+json',
				'mid': 'audio/midi',
				'midi': 'audio/x-midi',
				'mjs': 'text/javascript',
				'mp3': 'audio/mpeg',
				'mp4': 'video/mp4',
				'mpeg': 'video/mpeg',
				'mpkg': 'application/vnd.apple.installer+xml',
				'odp': 'application/vnd.oasis.opendocument.presentation',
				'ods': 'application/vnd.oasis.opendocument.spreadsheet',
				'odt': 'application/vnd.oasis.opendocument.text',
				'oga': 'audio/ogg',
				'ogv': 'video/ogg',
				'ogx': 'application/ogg',
				'opus': 'audio/opus',
				'otf': 'font/otf',
				'png': 'image/png',
				'pdf': 'application/pdf',
				'php': 'application/x-httpd-php',
				'ppt': 'application/vnd.ms-powerpoint',
				'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				'rar': 'application/vnd.rar',
				'rtf': 'application/rtf',
				'sh': 'application/x-sh',
				'svg': 'image/svg+xml',
				'tar': 'application/x-tar',
				'tif': 'image/tiff',
				'tiff': 'image/tiff',
				'ts': 'video/mp2t',
				'ttf': 'font/ttf',
				'txt': 'text/plain',
				'vsd': 'application/vnd.visio',
				'wav': 'audio/wav',
				'weba': 'audio/webm',
				'webm': 'video/webm',
				'webp': 'image/webp',
				'woff': 'font/woff',
				'woff2': 'font/woff2',
				'xhtml': 'application/xhtml+xml',
				'xls': 'application/vnd.ms-excel',
				'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'xml': 'application/xml',
				'xul': 'application/vnd.mozilla.xul+xml',
				'zip': 'application/zip',
				'3gp': 'video/3gpp',
				'3g2': 'video/3gpp2',
				'7z': 'application/x-7z-compressed',
				'gltf': 'application/gltf+json',
				'glb': 'application/gltf-binary',
				'fbx': 'application/octet-stream'
			};
	
			let type : string = extToMimes[ext] || "text/plain";
			
			if (_buf instanceof ArrayBuffer) 
			{
				CAlert.E("not def ArrayBuffer");
			}
			else if (_buf instanceof CObject) {
				_fileName=_buf.constructor.name+_fileName+".json";
				_buf=_buf.ToStr();
			}
			else if (typeof _buf === "object") 
			{
				_fileName=_fileName+".json";
				_buf=JSON.stringify(_buf);
			}
			else
				_fileName=_fileName+".txt";
			

			let fileBuf : string = _buf as string;
	
			let blob = new Blob([fileBuf], {type : type});
			let textFile = window.URL.createObjectURL(blob);
	
			if(window["showSaveFilePicker"]!=null && navigator.userActivation.isActive)
			{
				let opts = {
					suggestedName: name,
				};
				if(ext != "*") {
					opts["types"] = [{
						accept: {
							[type] : ["." + ext]
						}
					}];
				}
				var handle = await window["showSaveFilePicker"](opts);
				var writable = await handle.createWritable();
				await writable.write( blob );
				writable.close();
	
				window.URL.revokeObjectURL(textFile);
			}
			else {
				let link = document.createElement('a');
				if(ext == "*") {
					link.download = name + ".txt";
				}
				else {
					link.download = name + "." + ext;
				}
				link.href = textFile;
				link.click();
				link.remove();
			}
	
			window.URL.revokeObjectURL(textFile);
		}
    }
	public static async IsFile(_file : string) 
	{
		try {
			let response = await fetch(_file, {method: 'HEAD'});
			if(response.ok) {
				return true;
			} else {
				return false;
			}
		} catch(e) {
			return false;
		}
	}
	// 📁 파일/폴더 삭제 (재귀)
	static async Delete(_path: string): Promise<boolean> {
		if (!CUtil.IsNode()) return false;
		const fsPromises = await import('fs/promises');
		const pathModule = await import('path');

		try {
			const stat = await fsPromises.stat(_path);
			if (stat.isDirectory()) {
				const files = await fsPromises.readdir(_path);
				await Promise.all(
					files.map(f => this.Delete(pathModule.join(_path, f))) // ✅ 수정
				);
			}
			await fsPromises.rm(_path, { recursive: true, force: true });
			return true;
		} catch (err) {
			console.warn("Delete Error:", err);
			return false;
		}
	}

	// 📁 폴더 생성 (중첩 경로 포함)
	static async FolderCreate(_path: string): Promise<boolean> {
		if (!CUtil.IsNode()) return false;
		const fsPromises = await import('fs/promises');

		try {
			await fsPromises.mkdir(_path, { recursive: true });
			return true;
		} catch (err) {
			console.warn("FolderCreate Error:", err);
			return false;
		}
	}

	static async FolderList(_path: string): Promise<Array<{ file: boolean; name: string; ext: string }>> 
	{
		if (!CUtil.IsNode()) return [];

		const fsPromises = await import('fs/promises');
		const list = [];

		// 제외할 파일 이름 접두사나 정확한 이름 목록
		const ignorePatterns = [
			"AlbumArt_",        // AlbumArt_XXXX.jpg
			"AlbumArtSmall",    // AlbumArtSmall.jpg
			"Folder",           // Folder.jpg
			"desktop.ini",
			"Thumbs.db"
		];

		try {
			const files = await fsPromises.readdir(_path, { withFileTypes: true });

			for (const file of files) {
				const name = file.name;

				// 숨김파일 무시
				if (name.startsWith(".")) continue;

				// 시스템 또는 자동 생성된 파일 무시
				if (ignorePatterns.some(p => name.startsWith(p) || name === p)) continue;

				const isFile = file.isFile();

				let ext = "";
				const dotIndex = name.lastIndexOf(".");
				if (dotIndex !== -1 && dotIndex < name.length - 1) {
					ext = name.substring(dotIndex + 1).toLowerCase();
				}

				list.push({
					file: isFile,
					name: name,
					ext: ext,
				});
			}
		} catch (err) {
			console.warn("FolderList Error:", err);
		}

		return list;
	}
}
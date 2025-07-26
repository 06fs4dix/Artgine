
export class CUtil
{
    static IsNode() 
    {
        return (typeof process !== 'undefined' &&
            process.versions != null &&
            process.versions.node != null);
    }
	static IsMobile()
	{
		var filter = "win16|win32|win64|mac|macintel";
		if(navigator.platform)
		{
			if(0 > filter.indexOf(navigator.platform.toLowerCase()))
			{
				return true;
			}
			else
			{
				//g_pad.m_padMode=0;
			}
		}
		return false;
	}
    static Delay(ms = 1000) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    static Base64ToString(_base64)
    {
		return atob(_base64);
	}
	static StringToBase64(_base64)
    {
		return btoa(_base64);
	}
	static FileToStr(_file : File)
	{
		return new Promise((resolve, reject)=>{
			var reader = new FileReader();
			reader.onload = (evt)=>
			{
				if(evt.target.readyState == FileReader.DONE) 
		        {
		        	var string = CUtil.ArrayToString(evt.target.result as ArrayBuffer);
		        	resolve(string);
		        }
				
			};
			reader.readAsArrayBuffer(_file);	
		})
	}
	static Base64ToArray(_base64 : string) 
	{
	    var binary_string = atob(_base64);
	    var len = binary_string.length;
	    var bytes = new Uint8Array(len);
	    for (var i = 0; i < len; i++) 
	    {
	        bytes[i] = binary_string.charCodeAt(i);
	    }
	    
	    return bytes.buffer;
	}
	static ArrayToBase64(_arrayBuffer : ArrayBuffer)
	{
		return btoa(new Uint8Array(_arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
	}
	static ArrayToString(_arrayBuffer : ArrayBuffer)
	{
		var enc = new TextDecoder("utf-8");		
		return enc.decode(new Uint8Array(_arrayBuffer));
	}
	static ID(_id : string,_doc=document) : HTMLElement
	{
		return _doc.getElementById(_id);
	}
	static IDInput(_id : string) : HTMLInputElement
	{
		return document.getElementById(_id) as HTMLInputElement;
	}
	static IDValue(_id : string,_value=null) : string
	{
		if(_value!=null)
			(document.getElementById(_id) as HTMLInputElement).value=_value;
		return (document.getElementById(_id) as HTMLInputElement).value;
	}
	static IDChecked(_id: string, _value: boolean | null = null): boolean {
		const el = document.getElementById(_id) as HTMLInputElement;
		if (!el || el.type !== "checkbox") return false;
	
		if (_value !== null) el.checked = _value;
		return el.checked;
	}
}


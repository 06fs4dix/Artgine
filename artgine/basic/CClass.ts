import {CUtil} from "./CUtil.js";
var gClassMap = new Map();
export class CClass
{
    //현재 클래스 상속받은것들 찾기
    static ExtendsList(_type,_nameStr =false)
    {
        if (typeof _type === "object") {
            _type = _type.constructor;
        }
        var list = new Array();
        for (var each0 of gClassMap.values()) {
            if (!(each0.constructor && each0.constructor !== Object)) {
                continue;
            }
            if (each0.prototype.constructor.name == _type.name) 
            {

                
                if(_nameStr)
                    list.push(each0.prototype.constructor.name);
                else
                    list.push(new each0.prototype.constructor());
                continue;
            }
            var fc = Object.getPrototypeOf(each0);
            while (fc.name != "") {
                if (fc.name == _type.name) 
                {
                    if(_nameStr)
                        list.push(each0.prototype.constructor.name);
                    else
                        list.push(new each0.prototype.constructor());
                    break;
                }
                //first=false;
                fc = Object.getPrototypeOf(fc);
            }
        }
        return list;
    }
    //클래스가 null이면 글로벌 함수가 실행됌
    static Call(_class,_function : string, _para =new Array<any>)
    {
        if (_function == null)
            alert("FunctionFinder error!");
        if (_class == null && CUtil.IsNode()==false) 
        {
            if (window[_function] != null)     
                return window[_function];
            
        }
        else {
            if (_class[_function] == null)
                return null;
            switch (_para.length) {
                case 0: return _class[_function]();
                case 1:
                    return _class[_function](_para[0]);
                    break;
                case 2:
                    return _class[_function](_para[0], _para[1]);
                    break;
                case 3:
                    return _class[_function](_para[0], _para[1], _para[2]);
                    break;
                case 4:
                    return _class[_function](_para[0], _para[1], _para[2], _para[3]);
                    break;
            }
        }
        return null;
    }
    static New(_class, _para =new Array<any>)
    {
        if (typeof _class === "function")
            _class = _class.name;
        else if (typeof _class === "object")
            _class = _class.constructor.name;
        if (_class == null)
            alert("ClassFinder error!");
        let classInfo=gClassMap.get(_class);
        if (classInfo != null) {
            if (_para == null || _para.length == 0)
                return new classInfo["prototype"].constructor();
            else if (_para.length == 1)
                return new classInfo["prototype"].constructor(_para[0]);
            else if (_para.length == 2)
                return new classInfo["prototype"].constructor(_para[0], _para[1]);
            else if (_para.length == 3)
                return new classInfo["prototype"].constructor(_para[0], _para[1], _para[2]);
            else if (_para.length == 4)
                return new classInfo["prototype"].constructor(_para[0], _para[1], _para[2], _para[3]);
            else if (_para.length == 5)
                return new classInfo["prototype"].constructor(_para[0], _para[1], _para[2], _para[3], _para[4]);
        }
        else if (_class != "")
            console.log(_class+"Null");
        return null;
    }
    static Push(_key, _val=null) {
        if (_val && typeof _val != "object" && typeof _val != "function")
            return;
        if (typeof _key == "string") {
            if(CUtil.IsNode()==false)   window[_key] = _val;
            gClassMap.set(_key, _val);
        }
        else {
            if(CUtil.IsNode()==false) window[_key.name] = _key;
            gClassMap.set(_key.name, _key);
        }
    }
    //메소스만 찾기
    static MethodName(_target: any, _all: boolean = false): string[] 
    {
        const methodSet = new Set<string>();
        if (!_target) return [];

        let proto = typeof _target === "function" ? _target.prototype : Object.getPrototypeOf(_target);

        while (proto && proto !== Object.prototype) 
        {
            const names = Object.getOwnPropertyNames(proto);
            for (const name of names) 
            {
                if (name === "constructor") continue;

                const desc = Object.getOwnPropertyDescriptor(proto, name);
                if (desc) 
                {
                    // getter/setter는 제외
                    if (typeof desc.value === "function") 
                    {
                        methodSet.add(name);
                    }
                }
            }

            if (!_all) break;
            proto = Object.getPrototypeOf(proto);
        }

        return Array.from(methodSet).sort();
    }
    static StaticMethodName(_target: any): string[] {
    const methodSet = new Set<string>();
        if (!_target || typeof _target !== "function") return [];

        const names = Object.getOwnPropertyNames(_target);
        for (const name of names) {
            if (name === "length" || name === "name" || name === "prototype") continue;

            const desc = Object.getOwnPropertyDescriptor(_target, name);
            if (desc && typeof desc.value === "function") {
                methodSet.add(name);
            }
        }

        return Array.from(methodSet).sort();
    }
    static StaticMemberName(_target: any): string[] {
        const memberSet = new Set<string>();
        if (!_target || typeof _target !== "function") return [];

        const names = Object.getOwnPropertyNames(_target);
        for (const name of names) {
            if (name === "length" || name === "name" || name === "prototype") continue;

            const desc = Object.getOwnPropertyDescriptor(_target, name);
            if (desc) {
                const isFunction = typeof desc.value === "function";
                const isGetterSetter = !!desc.get || !!desc.set;
                if (!isFunction && !isGetterSetter) {
                    memberSet.add(name);
                }
            }
        }

        return Array.from(memberSet).sort();
    }
    static MemberName(_target: any, _all: boolean = false): string[] {
        const memberSet = new Set<string>();
        if (!_target) return [];

        // 1. 인스턴스 자체의 필드 (ex: mPushLock)
        const instance = typeof _target === "function" ? new _target() : _target;
        const ownKeys = Object.getOwnPropertyNames(instance);

        for (const key of ownKeys) {
            const desc = Object.getOwnPropertyDescriptor(instance, key);
            if (desc && typeof desc.value !== "function") {
                memberSet.add(key);
            }
        }

        // 2. prototype 체인에서 상속된 필드 (선택적)
        if (_all) {
            let proto = Object.getPrototypeOf(instance);
            while (proto && proto !== Object.prototype) {
                const names = Object.getOwnPropertyNames(proto);
                for (const name of names) {
                    if (name === "constructor") continue;

                    const desc = Object.getOwnPropertyDescriptor(proto, name);
                    const isMethod = desc && typeof desc.value === "function";
                    const hasGetterSetter = desc && (desc.get || desc.set);

                    if (!isMethod && !hasGetterSetter) {
                        memberSet.add(name);
                    }
                }
                proto = Object.getPrototypeOf(proto);
            }
        }

        return Array.from(memberSet).sort();
    }
    
    static ClassName(): string[] {
        return Array.from(gClassMap.values())
            .map(cls => cls.name)
            .filter(name => !!name)
            .sort();
    }
    static EnumName(_target): string[] 
    {
        if (!_target || typeof _target !== "object") return [];

        const keys = Object.keys(_target);
        // enum은 숫자↔문자 쌍이 함께 있으므로, 숫자가 아닌 문자열만 필터링
        return keys.filter(k => isNaN(Number(k)));
    }
}
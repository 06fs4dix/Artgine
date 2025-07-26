import { IListener, IMessage } from "../basic/Basic.js";
import {CConsol} from "../basic/CConsol.js";
import {CEvent} from "../basic/CEvent.js";

var gOffline=null;
var gCacheInfo=null;

export type CACHE_INFO={totalSize : number, itemCount : number, maxSize : number, isFull : boolean};
type EventMap = {
    "GET_CACHE_INFO": (data: CACHE_INFO) => void;
    "INIT_PWA":(_online : boolean)=>void;
};

export class CPWA 
{
    static eEvent=
    {
        GET_CACHE_INFO:"GET_CACHE_INFO",
    }
    static sEvent: Partial<Record<keyof EventMap, CEvent>> = {};

    static On<K extends keyof EventMap>(  _key: K,  _event: EventMap[K] | CEvent<EventMap[K]>,  _target?: any): void;
    static On<K extends string>(  _key: Exclude<K, keyof EventMap>,  _event: (...args: any[]) => any | CEvent<(...args: any[]) => any>,  _target?: any): void;

    static On(_key: string, _event , _target: any = null): void {
        CPWA.sEvent[_key] = CEvent.ToCEvent(_event);
    }
    static Off(_key,_target)
    {
        
    }
    static GetEvent(_key,_target=null) : CEvent
    {
        return CPWA.sEvent[_key];
    }
    static Send(_msg,_target=null)
    {
        navigator.serviceWorker.controller.postMessage(_msg);
    }
    static Install() {
        if(g_deferredPrompt == null) {
            console.log("이미 앱이 설치되어 있거나 앱을 설치할 수 없습니다.");
            return;
        }

        if(navigator.userActivation.isActive == false) {
            console.log("PWA 설치에 유저 제스쳐가 필요합니다.");
            return;
        }

        g_deferredPrompt.prompt();
        g_deferredPrompt.userChoice.then(choiceResult => {
            if(choiceResult.outcome == "accepted") {
                console.log("앱이 설치되었습니다.");
                g_deferredPrompt = null;
            }
            else {
                console.log("앱 설치를 취소했습니다.");
            }
        });
    }

    static IsInstalled() {
        const UA = window.navigator.userAgent;
        const IOS = UA.match(/iPhone|iPad|iPod/);
        const ANDROID = UA.match(/Android/);
        const PLATFORM = IOS ? 'ios' : ANDROID ? 'android' : 'unknown';

        const displayMode = 'fullscreen';

        const media = window.matchMedia('(display-mode: ' + displayMode + ')').matches;
        const navigatorMedia = (window.navigator as any).fullscreen;
        const andref = document.referrer.includes('android-app://');

        return media || navigatorMedia || andref;
    }

    //null인 상태는 아직 결정 안된 상태
    static async IsOnline() : Promise<boolean> 
    {
        if (gOffline !== null) return gOffline;

        return new Promise(resolve => {
            const interval = setInterval(() => {
                if (gOffline !== null) {
                    clearInterval(interval);
                    resolve(gOffline);
                }
            }, 500); // 500ms마다 체크
        });
    }

}

var g_deferredPrompt;

CPWA.On("INIT_PWA",(_type)=>{
    gOffline=_type;
    CConsol.Log("INIT_PWA : "+gOffline);
});

if ('serviceWorker' in navigator && navigator.serviceWorker.controller) 
{

    //deferredPrompt 등록
    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        g_deferredPrompt = event;
    });

    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data) 
        {
            let cevent=CPWA.GetEvent(event.data.type);
            if(cevent!=null) cevent.Call(event.data.data);
        }
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        location.reload(); // 새로운 SW로 페이지를 리로드
    });

    //2초 안에 답변 없으면 온라인으로 판단(핑 타임아웃이 2초이기 때문에)
    setTimeout(() => {
        if(gOffline==null)
            gOffline=false;
    }, 2000);
    CPWA.Send({ type: 'INIT_PWA' });
    
}


const gIListener: IListener = CPWA;
const gIMessage: IMessage = CPWA;
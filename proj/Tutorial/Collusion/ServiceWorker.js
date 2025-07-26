const CACHE_NAME = "CACHE_NAME_2025-07-16 22:51:38";
		const MAX_CACHE_SIZE = 0;
		const LOG = false;
		const API_CACHE = false;//Start
function SWLog(...args) 
{
    if(LOG) 
    {
        console.log(...args);
    }
}

let gInit=false;
let gIsServerOnline = true;
// 캐시 상태 플래그
let gIsCacheFull = false;

// LRU(Least Recently Used) 캐시 정보 저장 객체
let gCacheUsageInfo = {
    items: [],  // { url, size, lastUsed }
    totalSize: 0
};

// Service Worker 설치 시: skipWaiting으로 즉시 활성화
self.addEventListener("install", (event) => {
    self.skipWaiting();
});

// 활성화 시: 이전 캐시 정리 & 클라이언트 제어
self.addEventListener("activate", (event) => 
{
    event.waitUntil(
        Promise.all([
            caches.keys().then((cacheNames) => 
            {
                //if(cacheNames[0]==CACHE_NAME)  return;
                //SWLog(cacheNames+" cache delete!");
                return Promise.all(cacheNames.filter(cache => cache !== CACHE_NAME).map((cache) => {
                    if(caches==CACHE_NAME)  return;
                    caches.delete(cache);
                    SWLog(CACHE_NAME+"/" +cache+" cache delete!");
                }));
            }),
            InitCacheInfo()
        ])
    );
    self.clients.claim();
});

// 캐시 정보 초기화
async function InitCacheInfo() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        
        gCacheUsageInfo.items = [];
        gCacheUsageInfo.totalSize = 0;
        
        for (const request of keys) {
            const response = await cache.match(request);
            if(response) {
                const blob = await response.blob();
                const size = blob.size;
                const url = request.url;
                
                gCacheUsageInfo.items.push({
                    url,
                    size,
                    //lastUsed: Date.now()
                });
                
                gCacheUsageInfo.totalSize += size;
            }
        }
        
        // 캐시 상태 확인
        RefreshCacheSize();
        
        SWLog(`캐시 초기화 완료: ${gCacheUsageInfo.items.length}개 항목, ${DataSizeFormat(gCacheUsageInfo.totalSize)} (제한: ${DataSizeFormat(MAX_CACHE_SIZE)})`);
        SWLog(`캐시 상태: ${gIsCacheFull ? '가득 참' : '여유 있음'}`);
    } catch (error) {
        console.error("캐시 정보 초기화 오류:", error);
    }
}

// 캐시 상태 확인
function RefreshCacheSize() {
    // 캐시가 90% 이상 차면 가득 찬 것으로 간주
    if (gCacheUsageInfo.totalSize >= MAX_CACHE_SIZE * 0.9) 
    {
         
        gIsCacheFull = true;
        SendCacheStatus();
    } else {
        gIsCacheFull = false;
    }
    return gIsCacheFull;
}

// 크기 형식화 함수
function DataSizeFormat(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

self.addEventListener("message", async (event) => 
{
    if(event.data && event.data.type == "INIT_PWA") 
    {
        let state=await CheckServerStatus();
        event.source.postMessage({type: "INIT_PWA",data:state});
    } 
    else if(event.data && event.data.type == "GET_CACHE_INFO") 
    {
        // 클라이언트에게 캐시 정보 전송
        event.source.postMessage({
            type: "CACHE_INFO", 
            data: {
                totalSize: gCacheUsageInfo.totalSize,
                itemCount: gCacheUsageInfo.items.length,
                maxSize: MAX_CACHE_SIZE,
                isFull: gIsCacheFull
            }
        });
    } 
 
});

// // 모든 캐시 비우기
// async function ClearAllCache() {
//     try {
//         const cache = await caches.open(CACHE_NAME);
//         const keys = await cache.keys();
//         await Promise.all(keys.map(key => cache.delete(key)));
        
//         // 캐시 정보 초기화
//         gCacheUsageInfo.items = [];
//         gCacheUsageInfo.totalSize = 0;
        
//         // 캐시 상태 갱신
//         gIsCacheFull = false;
//         SendCacheStatus();
        
//         log("캐시가 모두 삭제되었습니다.");
//         return true;
//     } catch (error) {
//         console.error("캐시 삭제 오류:", error);
//         return false;
//     }
// }

// AbortSignal.timeout 폴리필 - iOS Safari 호환성을 위함
function CreateTimeoutSignal(timeout) {
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), timeout);
        return controller.signal;
    } catch (e) {
        return undefined; // Safari 등 구형 대응
    }
}

// 서버 상태 체크 함수 (HEAD 요청 사용)
async function CheckServerStatus() 
{
    if(gInit)
        return gIsServerOnline;
    try {
        await fetch("/", {
            method: "HEAD",
            cache: "no-store",
            signal: CreateTimeoutSignal(2000),
        });
        gIsServerOnline = true;
        SWLog("서버 상태 : "+gIsServerOnline);
        return gIsServerOnline;
    }
    catch (error) {
        
        SendCacheOffline();
        return false;
    }
}

// 캐시 접근 헬퍼
let cacheRef = null;
async function GetCache() {
    if (!cacheRef) {
        try {
            cacheRef = await caches.open(CACHE_NAME);
        } catch (error) {
            console.error("캐시 열기 실패:", error);
            return null;
        }
    }
    return cacheRef;
}

// fetch 이벤트 핸들링
self.addEventListener("fetch", (event) => {
    // respondWith는 동기적으로 Promise를 받아야 함
    const responsePromise = (async () => {
        if (!gInit) 
        {
            gInit = true;
            // const cacheNames = await caches.keys();
            // await Promise.all(
            //     cacheNames
            //         .filter(cache => cache !== CACHE_NAME)
            //         .map(cache => caches.delete(cache))
            // );
            // SWLog(cacheNames + " cache delete!");

            await CheckServerStatus();


            
        }

        const url = new URL(event.request.url);
        const pathname = url.pathname;

        if (event.request.url.includes("livereload.js") || event.request.url.includes("favicon.ico")) {
            return fetch(event.request);
        }

        if (event.request.method !== "GET") {
            return HandleNonGETRequest(event);
        }

        const isFileRequest = pathname.includes('.') && pathname.lastIndexOf('.') > pathname.lastIndexOf('/');
        if (isFileRequest) {
            return HandleFileFetch(event);
        } else if (API_CACHE) {
            return HandleAPIFetch(event);
        }

        return fetch(event.request); // fallback
    })();

    event.respondWith(responsePromise); // ✅ 이렇게 동기적 위치에서 호출해야 함
});

// // 캐시 항목 사용 기록 업데이트
// function updateCacheItemUsage(url) {
//     const itemIndex = cacheUsageInfo.items.findIndex(item => item.url === url);
//     if (itemIndex > -1) {
//         cacheUsageInfo.items[itemIndex].lastUsed = Date.now();
//     }
// }

// 캐시에 항목 추가 시도 (캐시가 가득 차지 않은 경우에만)
async function AddCache(request, response, cache) 
{
	
	

    // 캐시가 가득 찬 경우 저장하지 않음
    if (gIsCacheFull) {
        SWLog(`캐시가 가득 차서 저장하지 않음: ${request.url}`);
        return false;
    }
    
    try {
        const url = request.url;
        const clone = response.clone();
        const blob = await clone.blob();
        const size = blob.size;
        
        // 이 항목을 추가했을 때 용량 초과 확인
        const existingItemIndex = gCacheUsageInfo.items.findIndex(item => item.url === url);
        let newTotalSize;
        
        if (existingItemIndex === -1) { // 새 항목인 경우
            newTotalSize = gCacheUsageInfo.totalSize + size;
        } else { // 기존 항목 업데이트
            newTotalSize = gCacheUsageInfo.totalSize - gCacheUsageInfo.items[existingItemIndex].size + size;
        }
        
        // 용량 초과 검사
        if (newTotalSize > MAX_CACHE_SIZE) {
            // 캐시가 가득 찬 상태로 표시
            gIsCacheFull = true;
            SendCacheStatus();
            SWLog(`캐시 용량 초과로 저장하지 않음: ${url} (${DataSizeFormat(size)})`);
            return false;
        }
        
        // 기존 항목이면 제거
        if (existingItemIndex !== -1) {
            gCacheUsageInfo.totalSize -= gCacheUsageInfo.items[existingItemIndex].size;
            gCacheUsageInfo.items.splice(existingItemIndex, 1);
        }
        
        // 캐시에 저장
        await cache.put(request, response);
        
        // 캐시 정보 업데이트
        gCacheUsageInfo.items.push({
            url,
            size,
            //lastUsed: Date.now()
        });
        gCacheUsageInfo.totalSize += size;
        
        SWLog(`캐시 추가: ${CACHE_NAME}- ${url} (${DataSizeFormat(size)}), 총 ${DataSizeFormat(gCacheUsageInfo.totalSize)}`);
        
        // 캐시 상태 확인 (90% 이상 차면 가득 찬 것으로 간주)
        RefreshCacheSize();
        
        return true;
    } catch (error) {
        console.error("캐시 추가 오류:", error);
        return false;
    }
}

// 파일 요청 처리 (정적 리소스)
async function HandleFileFetch(event) {
    const cache = await GetCache();
    
    // 캐시가 가득 찬 경우 & 온라인 상태: 서버에서 직접 가져옴
    if (gIsCacheFull && gIsServerOnline) {
        return FetchTimeout(event.request);
    }
    
    // 캐시를 열 수 없는 경우
    if (!cache) {
        return FetchTimeout(event.request);
    }
    
    try {
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
            // 캐시 사용 기록 업데이트
            //updateCacheItemUsage(event.request.url);
            
            if (!gIsServerOnline) {
                return cachedResponse;
            }

            const etag = cachedResponse.headers.get('ETag');
            
            if (etag && gIsServerOnline) {
                const conditionalHeaders = new Headers(event.request.headers);
                conditionalHeaders.set('If-None-Match', etag);

                const modifiedRequest = new Request(event.request, { headers: conditionalHeaders });
                
                // 병렬로 네트워크 요청 실행
                if (!gIsCacheFull) {
                    RefreshCacheAsync(modifiedRequest, cache,cachedResponse);
                }
                
                return cachedResponse;
            }
            
            if (gIsServerOnline) {
                if (!gIsCacheFull) {
                    RefreshCacheAsync(event.request, cache,cachedResponse);
                }
                return cachedResponse;
            }

            return cachedResponse;
        }
        
        if (gIsServerOnline) {
            if (gIsCacheFull) {
                // 캐시가 가득 찬 경우 네트워크 요청만 수행
                return FetchTimeout(event.request);
            } else {
                // 캐시 여유가 있는 경우 캐시 시도
                return FetchTimeoutCache(event.request, cache);
            }
        }
    } catch (error) {
        console.error("캐시 접근 오류:", error);
        if (gIsServerOnline) {
            return FetchTimeout(event.request);
        }
    }
    
    return new Response('오프라인 상태이며 캐시된 데이터가 없습니다.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
    });
}

// GET 외 요청 처리
async function HandleNonGETRequest(event) {
    if (!gIsServerOnline) {
        return new Response('오프라인 상태입니다. 서버 요청을 처리할 수 없습니다.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    return FetchTimeout(event.request);
}

// API 요청 처리
async function HandleAPIFetch(event) {
    const cache = await GetCache();
    
    // 캐시가 가득 찬 경우 & 온라인 상태: 서버에서 직접 가져옴
    if (gIsCacheFull && gIsServerOnline) {
        return FetchTimeout(event.request);
    }
    
    // 캐시를 열 수 없는 경우
    if (!cache) {
        return FetchTimeout(event.request);
    }
    
    try {
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
            // 캐시 사용 기록 업데이트
            //updateCacheItemUsage(event.request.url);
            
            if (!gIsServerOnline) {
                return cachedResponse;
            }
            
            if (gIsServerOnline) {
                if (!gIsCacheFull) {
                    RefreshCacheAsync(event.request, cache,cachedResponse);
                }
                return cachedResponse;
            }
        }
        
        if (gIsServerOnline) {
            if (gIsCacheFull) {
                // 캐시가 가득 찬 경우 네트워크 요청만 수행
                return FetchTimeout(event.request);
            } else {
                // 캐시 여유가 있는 경우 캐시 시도
                return FetchTimeoutCache(event.request, cache);
            }
        }
        
        if (cachedResponse) {
            return cachedResponse;
        }
    } catch (error) {
        console.error("API 요청 처리 오류:", error);
        if (gIsServerOnline) {
            return FetchTimeout(event.request);
        }
    }
    
    return new Response('오프라인 상태이며 캐시된 데이터가 없습니다.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
    });
}

// 안전한 네트워크 요청 함수 (캐시 없음)
async function FetchTimeout(request) {
    try {
        return await fetch(request.clone(), {
            signal: CreateTimeoutSignal(5000)
        });
    }
    catch (error) {
        SendCacheOffline();
        if (error.name === "AbortError") {
            SWLog("⏱ 요청 타임아웃:", request.url);
        } else {
            console.error("❗ Fetch 오류:", error);
        }

        return new Response("요청 실패 또는 타임아웃", {
            status: 504,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// 캐시 가능 여부에 따라 캐시 시도하는 네트워크 요청 함수
async function FetchTimeoutCache(request, cache) {
    try {
        const networkResponse = await fetch(request.clone(), {
            signal: CreateTimeoutSignal(5000)
        });

        if (networkResponse && networkResponse.ok) {
            // 캐시가 가득 차지 않은 경우에만 캐시 시도
            if (!gIsCacheFull) {
                const responseToCache = networkResponse.clone();
                AddCache(request, responseToCache, cache);
            }
        }
        return networkResponse;
    }
    catch (error) {
        SendCacheOffline();
        if (error.name === "AbortError") {
            SWLog("⏱ 요청 타임아웃:", request.url);
        } else {
            console.error("❗ Fetch 오류:", error);
        }

        return new Response("요청 실패 또는 타임아웃", {
            status: 504,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// 비동기적으로 캐시 업데이트 (캐시 가능 여부 확인)
async function RefreshCacheAsync(request, cache,cachedResponse) 
{
    // 캐시가 가득 찬 경우 요청하지 않음
    if (gIsCacheFull) {
        return;
    }
    
    try {
        const networkResponse = await fetch(request.clone(), {
            signal: CreateTimeoutSignal(5000)
        });

        
        if (networkResponse && networkResponse.ok && networkResponse.headers.get('ETag') != cachedResponse.headers.get('ETag')) {
            const responseToCache = networkResponse.clone();
            AddCache(request, responseToCache, cache);
        }
    }
    catch (error) {
        
        SendCacheOffline();
    }
}

function SendCacheOffline() 
{
    gIsServerOnline = false;
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({ type: 'OFFLINE' });
        });
    });
}

function SendCacheStatus() 
{
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({ 
                type: 'CACHE_STATUS',
                isFull: gIsCacheFull,
                totalSize: gCacheUsageInfo.totalSize,
                maxSize: MAX_CACHE_SIZE,
                itemCount: gCacheUsageInfo.items.length
            });
        });
    });
}



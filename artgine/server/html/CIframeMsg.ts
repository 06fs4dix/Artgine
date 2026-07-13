// iframe(부모-자식) 간 postMessage 통신 공용 클래스.
// 각 파일에 흩어진 postMessage 호출/리스너를 Send/Recv 두 함수로 통합해 메시지 추적을 쉽게 한다.
// 포맷: { header: { type }, data }
export class CIframeMsg
{
    static Send(_target: Window, _type: string, _data: object = {})
    {
        _target.postMessage({ header: { type: _type }, data: _data }, '*');
    }

    // source: 보낸 쪽 window(ev.source) - iframePool처럼 동일 타입의 iframe이 여러 개 떠 있을 때
    // 어느 iframe이 보냈는지 구분하는 용도. 필요 없는 핸들러는 두 번째 인자를 그냥 생략하면 된다.
    static Recv(_handlers: Record<string, (data: any, source: MessageEventSource | null) => void>)
    {
        window.addEventListener('message', (ev: MessageEvent) => {
            const type = ev.data?.header?.type;
            if (type && _handlers[type]) _handlers[type](ev.data?.data ?? {}, ev.source);
        });
    }
}

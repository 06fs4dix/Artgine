export class CIframeMsg {
    static Send(_target, _type, _data = {}) {
        _target.postMessage({ header: { type: _type }, data: _data }, '*');
    }
    static Recv(_handlers) {
        window.addEventListener('message', (ev) => {
            const type = ev.data?.header?.type;
            if (type && _handlers[type])
                _handlers[type](ev.data?.data ?? {}, ev.source);
        });
    }
}

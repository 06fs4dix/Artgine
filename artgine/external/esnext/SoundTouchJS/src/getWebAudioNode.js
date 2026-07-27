import noop from './noop.js';
const getWebAudioNode = function (context, filter, sourcePositionCallback = noop, bufferSize = 4096) {
    const node = context.createScriptProcessor(bufferSize, 2, 2);
    const samples = new Float32Array(bufferSize * 2);
    node.onaudioprocess = (event) => {
        let left = event.outputBuffer.getChannelData(0);
        let right = event.outputBuffer.getChannelData(1);
        let framesExtracted = filter.extract(samples, bufferSize);
        sourcePositionCallback(filter.sourcePosition);
        if (framesExtracted === 0) {
            filter.onEnd();
        }
        let i = 0;
        for (; i < framesExtracted; i++) {
            left[i] = samples[i * 2];
            right[i] = samples[i * 2 + 1];
        }
    };
    return node;
};
export default getWebAudioNode;

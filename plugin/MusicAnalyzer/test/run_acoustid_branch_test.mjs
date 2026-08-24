// AcoustID 고신뢰 매칭 분기(_resolveAcoustIdExternal)만 격리해서 테스트한다.
// 실제 오디오 파일/AcoustID API 키 없이, 매칭된 것으로 가정한 가짜 CMusicFingerprintMatch를 넣어
// 수정 전/후 출력을 비교하기 위한 스크립트. 결과는 stdout에 JSON으로만 출력한다.
import { CMusicAnalyzer } from '../CMusicAnalyzer.js';

// 실제 존재하는 유명곡(Ed Sheeran - Perfect)을 AcoustID가 고신뢰(score=0.95)로 매칭했다고 가정.
const fakeFingerprint = {
    matched: true,
    score: 0.95,
    recordingId: 'fake-recording-id',
    title: 'Perfect',
    artist: ['Ed Sheeran'],
    album: '÷ (Deluxe)',
    year: 2017,
    fingerprint: 'FAKE_FINGERPRINT_FOR_TEST',
    duration: 263,
};

const external = await CMusicAnalyzer._resolveAcoustIdExternal(fakeFingerprint, 'grok', 'grok-4.5');
console.log(JSON.stringify(external, null, 2));

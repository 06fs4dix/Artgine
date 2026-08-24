// 오디오 폴더(또는 단일 파일)를 분석해서 SQLite db에 적재하는 도구.
// 사용법(스캔/적재): node ai/tool/music.js scan <분석할 폴더 또는 파일> <db 파일 경로> [limit] [provider] [model] [scanLevel]
//   - 1번째 인자는 폴더 경로뿐 아니라 오디오 파일 하나(mp3/flac/wav/m4a/ogg)의 경로도 받는다 - 파일이면
//     그 파일 하나만 분석한다(폴더 재귀 탐색/prune 없음).
//   - scanLevel: 웹검색 강도를 고르는 숫자. -1=웹검색(AnalyzeWeb) 완전 생략(ID3/오디오분석/지문만, 네트워크
//     호출 0회) / 0 또는 생략=CMusicAnalyzer 기본값(title,composer,artist,album,year,genre 6항목,
//     lyrics/usedIn 제외) / 1=전체 8항목(lyrics/usedIn 포함) 강제. scanLevel을 쓰려면 provider/model도
//     같이 써야 한다(위치 인자라 생략 불가 - 기본값으로 두려면 빈 문자열 ""을 넣는다).
//   - lyrics(가사)/usedIn(삽입 작품)은 scanLevel 0(기본값)에서 빠져 있다: 둘 다 무료 구조화 소스로 원천적으로
//     못 채우는 항목이라 켜두면 거의 매 곡마다 숨은 AI 호출이 붙는 문제가 있었다. 필요하면 scanLevel=1을 써라.
// 사용법(질의):       node ai/tool/music.js exe <db 파일 경로> <질문> [provider] [model]
//   - stdout: { reply, reason, count, folders, rows }. reply는 메신저에 그대로 넣을 짧은 한글 요약.
//     rows는 재생/추가에 필요한 최소 필드만(지문/가사/노트 제외). 곡이 많으면 reply는 폴더별 개수만 적는다.
//   - 2단계 질의: 1차로 AI가 질문에서 검색 태그(장르/무드/키워드/아티스트/BPM/키)만 뽑아 코드가 태그에 맞는 곡을
//     전부 조회하고(지문 기반 중복 제거 포함), 2차 AI 프롬프트로 넘기기 전 후보가 너무 많으면(기본 3000곡 초과)
//     관련도 순으로 추린 뒤, 2차로 그 후보 중 진짜 관련된 곡을 AI가 최종 선정한다.
//     이렇게 두 단계로 나눈 이유: 1차 AI가 처음부터 좁은 SELECT(LIMIT 20 등)를 만들면 결과가 특정 폴더/아티스트에
//     쏠려서 중복곡·유사 폴더 편중 추천이 나오는 문제가 있었음.
//   - provider/model을 둘 다 생략하면 기본값(claude/claude-sonnet-4-6)을 쓴다.
// 사용법(영어 가사):   node ai/tool/music.js lyrics-en <db 파일 경로> <절대경로> [provider] [model]
//   - 트랙을 DB에서 찾고(경로 실패 시 파일명), 가사가 없으면 벅스/lyrics.ovh로 조회한 뒤
//     한글·일본어·한자 가사는 영어로 번역한다. stdout: { ok, lyrics, title, artist } 또는 { ok:false, msg }.
// 사용법(분류 추천):   node ai/tool/music.js classify <미정의 폴더> <분류될 위치 폴더> [provider] [model]
//   - 분류될 위치 아래 모든 폴더(전체 depth)를 후보로 놓고, 미정의 폴더의 파일들을 분석해서
//     각 파일마다 가장 어울리는 후보 폴더를 AI가 골라 { results, invalid } JSON으로 stdout에 출력한다.
//   - 실제 파일 이동은 하지 않는다(추천 리스트만 만든다).
// - provider/model은 TagExternal(AI 웹검색) 단계에 쓰인다. 생략하면 CMusicAnalyzer 기본값(grok/grok-4.5)을 쓴다.
// - Sample/music-docs/scan_and_build.mjs와 동일한 스키마(tracks / track_segments / track_used_in)를 쓴다.
// - 파일별 분석 결과는 db 옆 캐시 폴더에 JSON으로 남겨(재시작/감사용), 이미 있으면 재분석하지 않고 캐시를 그대로 db에 넣는다.
// - 같은 폴더를 재스캔하면: db에 없는 새 파일만 분석해서 추가하고, db에는 있는데 디스크에서 사라진 파일은
//   (해당 폴더 하위 범위 내에서) 자동으로 제거한다. limit은 신규 파일 수에만 적용된다.
// - essentia-wasm abort() 등으로 프로세스 자체가 죽는 경우가 있어(예: ID3 태그의 null byte가 AI 프롬프트로
//   흘러들어간 케이스), 파일마다 이 스크립트 자신을 --analyze-one 모드로 자식 프로세스 실행해 격리한다.
// - 분석은 MUSIC_SCAN_CONCURRENCY(기본 3)개까지 병렬로 돌리고, DB write만 직렬화한다(중단 후 재개·캐시 스킵 동작은 동일).
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { spawn, spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);

// scanLevel: -1=웹검색(AnalyzeWeb) 완전 생략, 0(또는 생략)=CMusicAnalyzer 기본값, 1=전체 8항목(lyrics/usedIn 포함) 강제.
// output={}를 넘기면 CMusicAnalyzer.Analyze()가 AnalyzeWeb 호출 자체를 건너뛰는 규약(narrowedOutput 빈 객체 체크)을 그대로 이용한다.
function resolveOutput(scanLevelArg, DEFAULT_SEARCH_OUTPUT) {
    const scanLevel = scanLevelArg ? parseInt(scanLevelArg, 10) : 0;
    if (scanLevel === -1) return {};
    if (scanLevel === 1) return { ...DEFAULT_SEARCH_OUTPUT, usedIn: [], lyrics: null };
    return undefined;
}

// tracks.lyrics_status: NULL=아직 조회 안 함 / has_lyrics=가사 있음 / not_found=조회했지만 못 찾음.
// searched=true 는 가사 조회를 실제로 돌린 경우(scanLevel=1 또는 update-free)만.
function resolveLyricsStatus(lyrics, searched) {
    if (lyrics != null && String(lyrics).trim() !== '') return 'has_lyrics';
    if (searched) return 'not_found';
    return null;
}

// ── 자식 프로세스 격리 모드: 파일 하나만 분석해서 cacheFile에 JSON으로 저장 ──
if (process.argv[2] === '--analyze-one') {
    const [, , , filePath, cacheFile, provider, model, scanLevelArg] = process.argv;
    const { CMusicAnalyzer, DEFAULT_SEARCH_OUTPUT } = await import('../../plugin/MusicAnalyzer/CMusicAnalyzer.js');
    const output = resolveOutput(scanLevelArg, DEFAULT_SEARCH_OUTPUT);
    try {
        const result = provider
            ? await CMusicAnalyzer.Analyze(filePath, provider, model || undefined, undefined, output)
            : await CMusicAnalyzer.Analyze(filePath, undefined, undefined, undefined, output);
        fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2), 'utf-8');
        console.log('OK');
        process.exit(0);
    } catch (e) {
        console.error('FAIL: ' + (e && e.message));
        process.exit(1);
    }
}

// ── exe 모드: 자연어 질문 -> AI가 SELECT 쿼리 생성 -> 실행 -> 결과를 JSON 배열로 stdout에 출력 ──
// 사용법: node ai/tool/music.js exe <db 파일 경로> <질문> [provider] [model]
// provider/model이 둘 다 없으면 기본값(claude/claude-sonnet-4-6)을 쓴다.
const CAI_PROVIDERS = ['claude', 'codex', 'gpt', 'antigravity', 'opencode', 'grok'];

// 1차 검색(queryByTags)이 조회하는 컬럼과, 관련도 채점(capByRelevance)이 텍스트 매칭에 쓰는 컬럼.
// 두 목록이 어긋나면(SELECT에 없는 컬럼을 채점) 항상 undefined라 죽은 로직이 되므로 한 곳에서 관리한다.
// exe 모드 블록이 이 파일 앞부분에서 곧바로 실행되므로, 두 상수는 그보다 먼저(파일 최상단 근처) 선언해야 한다.
const SELECT_COLS = [
    'id', 'absolute_path', 'folder_path',
    'title', 'artist', 'genre', 'composer', 'album', 'year',
    'notes', 'comment', 'lyrics', 'tags',
    'audio_bpm', 'audio_key', 'audio_scale', 'audio_camelot_code',
    'fp_fingerprint', 'version_note',
];
const LIKE_COLS = ['genre', 'notes', 'comment', 'lyrics', 'title', 'artist', 'album', 'composer', 'folder_path', 'tags'];
// 가수/작품명 검색용. 가사·장르 자유 텍스트는 빼서 무드/장르 단어 오탐을 줄이되,
// 앨범·폴더·제목·작곡가는 포함한다(게임 OST는 artist가 작곡가라 작품명이 폴더/앨범에만 있는 경우가 많음).
const IDENTITY_COLS = ['artist', 'title', 'album', 'folder_path', 'composer', 'notes', 'tags'];

// "IU"처럼 짧은 영문 토큰은 folder/title LIKE '%IU%'가 premium 같은 단어에 오탐한다. artist만 본다.
function colsForLikeTerm(term, cols) {
    if (/^[a-z0-9]{1,2}$/i.test(String(term || '').trim())) {
        return cols.includes('artist') ? ['artist'] : [];
    }
    return cols;
}

// tracks.tags: '#Baldurs#Gate#발더스#' 형태. 등록 때 한 번 추출하고, 이명은 나중에 덧붙인다.
const TAG_STOP = new Set([
    'original', 'soundtrack', 'ost', 'disc', 'album', 'official', 'music', 'the', 'and', 'of',
    'vol', 'volume', 'version', 'arrange', 'special', 'ext', 'mp3', 'flac', 'wav', 'web',
    '게임', '국내', '폴더', 'webcontent',
]);

function normalizeTagToken(s) {
    return String(s || '').replace(/#/g, '').replace(/\s+/g, ' ').trim();
}

function tokenizeTagSource(s) {
    return String(s || '').split(/[\s_\-–—()\[\]{}.,;:|/\\]+/)
        .map(normalizeTagToken)
        .filter((t) => {
            if (t.length < 2) return false;
            if (/^\d+$/.test(t)) return false;
            if (TAG_STOP.has(t.toLowerCase())) return false;
            return true;
        });
}

function collectTagTokens(row) {
    const out = [];
    const add = (s) => {
        const t = normalizeTagToken(s);
        if (t.length >= 2 && !TAG_STOP.has(t.toLowerCase())) out.push(t);
    };
    const folder = String(row.folder_path || '').replace(/\\/g, '/');
    const segs = folder.split('/').filter(Boolean);
    for (const seg of segs) {
        if (/^[a-zA-Z]:$/.test(seg)) continue;
        if (TAG_STOP.has(seg.toLowerCase())) continue;
        add(seg);
        const toks = tokenizeTagSource(seg);
        toks.forEach(add);
        for (let i = 0; i < toks.length - 1; i++) add(toks[i] + ' ' + toks[i + 1]);
    }
    for (const v of [row.title, row.artist, row.album, row.composer, row.genre]) {
        if (!v) continue;
        add(v);
        tokenizeTagSource(v).forEach(add);
    }
    const seen = new Set();
    const uniq = [];
    for (const t of out) {
        const k = t.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        uniq.push(t);
        if (uniq.length >= 40) break;
    }
    return uniq;
}

function formatTagColumn(tokens) {
    const cleaned = tokens.map(normalizeTagToken).filter((t) => t.length >= 2);
    if (!cleaned.length) return '';
    return '#' + cleaned.join('#') + '#';
}

function parseTagColumn(s) {
    return String(s || '').split('#').map(normalizeTagToken).filter(Boolean);
}

function mergeTagColumn(existing, extras) {
    const seen = new Set();
    const uniq = [];
    for (const t of [...parseTagColumn(existing), ...extras.map(normalizeTagToken)]) {
        if (t.length < 2) continue;
        const k = t.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        uniq.push(t);
    }
    return formatTagColumn(uniq);
}

function buildTrackTags(row) {
    return formatTagColumn(collectTagTokens(row));
}

async function backfillTrackTags(db) {
    const rows = await db.all(`
        SELECT id, folder_path, title, artist, album, composer, genre, tags
        FROM tracks
        WHERE tags IS NULL OR tags = ''
    `);
    if (!rows.length) return 0;
    await db.exec('BEGIN IMMEDIATE');
    try {
        for (const row of rows) {
            await db.run('UPDATE tracks SET tags = ? WHERE id = ?', [buildTrackTags(row), row.id]);
        }
        await db.exec('COMMIT');
    } catch (e) {
        try { await db.exec('ROLLBACK'); } catch { /* ignore */ }
        throw e;
    }
    return rows.length;
}

async function AddTags(dbPath, match, extraTags) {
    const db = await open({ filename: path.resolve(dbPath), driver: sqlite3.Database });
    await ensureQueryColumns(db);
    const like = `%${match}%`;
    const rows = await db.all(`
        SELECT id, tags FROM tracks
        WHERE folder_path LIKE ? OR title LIKE ? OR artist LIKE ? OR album LIKE ? OR IFNULL(tags, '') LIKE ?
    `, [like, like, like, like, like]);
    let updated = 0;
    for (const row of rows) {
        const next = mergeTagColumn(row.tags, extraTags);
        if (next === (row.tags || '')) continue;
        await db.run('UPDATE tracks SET tags = ? WHERE id = ?', [next, row.id]);
        updated++;
    }
    await db.close();
    return { 대상: rows.length, 갱신: updated, 추가태그: extraTags };
}

// 한글 질의어가 db의 영문/원어 표기와 다를 때 쓰는 안전망. extractTags AI가 이명을 빠뜨려도
// 코드에서 같은 그룹을 전부 LIKE 한다. 짧은 토큰으로 오탐 나지 않게 고유 이름만 넣는다.
// 작품/시리즈 이명. 분위기 필터가 있을 때 folder 범위로 쓴다(가수 이명과 구분).
const SERIES_ALIAS_GROUPS = [
    ['라이자', 'Ryza', 'ライザ', 'Atelier Ryza', 'ライザのアトリエ'],
    ['아틀리에', 'Atelier', 'アトリエ'],
    ['발더스 게이트', '발더스게이트', "Baldur's Gate", 'Baldurs Gate', 'Baldur Gate', 'BG3'],
];
const ARTIST_ALIAS_GROUPS = [
    ['아이유', 'IU', '이지은'],
    ['글렌체크', 'Glen Check'],
];
const ALIAS_GROUPS = [...SERIES_ALIAS_GROUPS, ...ARTIST_ALIAS_GROUPS];

const MOOD_FILTER_RE = /잔잔|고요|평화|힐링|슬픈|우울|신나|밝은|어두운|빠른|느린|조용|감성|전투|긴장|웅장/;

function extrasFromAliasGroups(haystack) {
    const q = String(haystack || '').toLowerCase();
    const extra = [];
    for (const group of ALIAS_GROUPS) {
        if (group.some((g) => g.length >= 2 && q.includes(g.toLowerCase()))) extra.push(...group);
    }
    return extra;
}

// "아이유 (IU)", "IU (아이유)"처럼 기존 필드에 이미 있는 한/영 병기를 태그로 뽑는다.
function extrasFromBilingualFields(...fields) {
    const extra = [];
    for (const raw of fields) {
        const s = String(raw || '');
        for (const m of s.matchAll(/([가-힣][가-힣0-9\s]{0,24}[가-힣0-9])\s*\(([A-Za-z][A-Za-z0-9\s'.&-]{0,40})\)/g)) {
            extra.push(m[1].trim(), m[2].trim());
        }
        for (const m of s.matchAll(/([A-Za-z][A-Za-z0-9\s'.&-]{1,40}?)\s*\(([가-힣][가-힣0-9\s]{0,24}[가-힣0-9])\)/g)) {
            extra.push(m[1].trim(), m[2].trim());
        }
    }
    return extra;
}

function missingTagExtras(row) {
    const haystack = [row.tags, row.folder_path, row.title, row.artist, row.album, row.composer, row.genre]
        .filter(Boolean).join(' | ');
    return [
        ...collectTagTokens(row),
        ...extrasFromAliasGroups(haystack),
        ...extrasFromBilingualFields(row.title, row.artist, row.album, row.composer, row.folder_path, row.tags),
    ];
}

async function EnrichMissingTags(dbPath) {
    const db = await open({ filename: path.resolve(dbPath), driver: sqlite3.Database });
    await ensureQueryColumns(db);
    const rows = await db.all(`
        SELECT id, folder_path, title, artist, album, composer, genre, tags
        FROM tracks
        ORDER BY id
    `);
    let updated = 0, skipped = 0;
    await db.exec('BEGIN IMMEDIATE');
    try {
        for (const row of rows) {
            const next = mergeTagColumn(row.tags, missingTagExtras(row));
            if (next === (row.tags || '')) { skipped++; continue; }
            await db.run('UPDATE tracks SET tags = ? WHERE id = ?', [next, row.id]);
            updated++;
        }
        await db.exec('COMMIT');
    } catch (e) {
        try { await db.exec('ROLLBACK'); } catch { /* ignore */ }
        throw e;
    }
    await db.close();
    return { 대상: rows.length, 추가함: updated, 이미충분: skipped };
}

// terms에 그룹 멤버(또는 그걸 포함하는 더 긴 이름)가 있으면 그 그룹 전체를 검색어에 보탠다.
function expandSearchTerms(terms) {
    const cleaned = [];
    const seenIn = new Set();
    for (const raw of terms) {
        const t = String(raw || '').trim();
        if (!t) continue;
        const key = t.toLowerCase();
        if (seenIn.has(key)) continue;
        seenIn.add(key);
        cleaned.push(t);
    }
    const out = new Map();
    const add = (s) => {
        const k = String(s || '').trim();
        if (!k) return;
        const lk = k.toLowerCase();
        if (!out.has(lk)) out.set(lk, k);
    };
    for (const t of cleaned) add(t);
    for (const t of cleaned) {
        const tl = t.toLowerCase();
        // "Atelier Ryza"가 라이자 그룹 정확 매치면, 부분문자열 "Atelier"로 시리즈 그룹까지
        // 펼치지 않는다(라이자만 찾는데 소피/피리스가 섞이는 문제).
        const exactGroups = ALIAS_GROUPS.filter((group) => group.some((g) => g.toLowerCase() === tl));
        if (exactGroups.length) {
            exactGroups.forEach((group) => group.forEach(add));
            continue;
        }
        for (const group of ALIAS_GROUPS) {
            const hit = group.some((g) => {
                const gl = g.toLowerCase();
                if (gl.length < 2) return false;
                if (tl === gl) return true;
                return tl.includes(gl);
            });
            if (hit) group.forEach(add);
        }
    }
    return [...out.values()];
}

// 질문 원문에 이명 그룹의 한글/영문/원어가 있으면, extractTags가 가수명만 넣고 작품 이명을 빼도
// keywords에 그룹을 심어 1차 검색이 살아나게 한다(예: "라이자 노래" → artists=["LiSA"] 만 나와도 Ryza가 붙음).
function longestAliasHitLen(group, q) {
    let best = 0;
    for (const g of group) {
        if (g.length < 2) continue;
        if (q.includes(g.toLowerCase()) && g.length > best) best = g.length;
    }
    return best;
}

function injectAliasSeedsFromQuestion(tags, question) {
    const q = String(question || '').toLowerCase();
    const extra = [];
    for (const group of ALIAS_GROUPS) {
        const here = longestAliasHitLen(group, q);
        if (!here) continue;
        // "Atelier Ryza 찾아줘"처럼 더 긴 작품명이 매칭되면, 짧은 "Atelier" 시리즈 그룹은 넣지 않는다.
        const longerOther = ALIAS_GROUPS.some((other) => other !== group && longestAliasHitLen(other, q) > here);
        if (longerOther) continue;
        extra.push(...group);
    }
    if (!extra.length) return tags;
    const keywords = [...(Array.isArray(tags.keywords) ? tags.keywords : [])];
    const have = new Set(keywords.map(t => String(t || '').trim().toLowerCase()).filter(Boolean));
    for (const t of extra) {
        const k = t.toLowerCase();
        if (!have.has(k)) { keywords.push(t); have.add(k); }
    }
    tags.keywords = keywords;
    return tags;
}

function questionHasAlias(question) {
    const q = String(question || '').toLowerCase();
    return ALIAS_GROUPS.some((group) => longestAliasHitLen(group, q) >= 2);
}

function bestSeriesFolderSeed(question) {
    const q = String(question || '').toLowerCase();
    let best = null, bestLen = 0;
    for (const group of SERIES_ALIAS_GROUPS) {
        const here = longestAliasHitLen(group, q);
        if (here > bestLen) { bestLen = here; best = group; }
    }
    if (!best) return null;
    const ascii = best.filter((s) => /[A-Za-z]/.test(s)).sort((a, b) => b.length - a.length);
    return ascii[0] || best[0];
}

// "30곡만", "10개"처럼 질문에 적힌 개수. 없으면 null.
function parseRequestedCount(question) {
    const m = String(question || '').match(/(\d+)\s*(곡|개)/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.min(n, 500);
}

// extractTags의 wantsAll을 질문 의도/이명으로 보정한다.
// - "30곡만"이 있으면 전체 출력을 끄고 그 개수로 2차 선정
// - 추천/골라/몇 곡 → 일부(기본 20)
// - 가수/작품/시리즈가 특정되고 찾아/넣어/목록이면 전체
function applyQueryIntent(tags, question) {
    const q = String(question || '');
    const requestedCount = parseRequestedCount(q);
    tags.requestedCount = requestedCount;
    tags.hasMoodFilter = MOOD_FILTER_RE.test(q);
    // "발더스 게이트에서 잔잔한 곡"처럼 작품+분위기는 폴더를 AND로 좁히고, 무드는 2차 선정에 맡긴다.
    if (tags.hasMoodFilter && !tags.folder) {
        const seed = bestSeriesFolderSeed(q);
        if (seed) tags.folder = seed;
    }
    if (requestedCount) {
        tags.wantsAll = false;
        return tags;
    }
    if (tags.hasMoodFilter) {
        tags.wantsAll = false;
        return tags;
    }
    if (/추천|골라\s*줘|몇\s*곡/.test(q)) {
        tags.wantsAll = false;
        return tags;
    }
    const hasTarget = Boolean(
        (Array.isArray(tags.artists) && tags.artists.length) ||
        tags.composer || tags.album || tags.folder ||
        questionHasAlias(q)
    );
    const wantsList = /찾아|넣어|목록|전부|모든|전체|보여|시리즈/.test(q);
    if (hasTarget && wantsList) tags.wantsAll = true;
    return tags;
}

// CREATE TABLE IF NOT EXISTS는 이미 있는 테이블에는 컬럼을 추가하지 않으므로, 예전 스키마로 만들어진
// 기존 db를 위해 없는 컬럼만 골라 ALTER TABLE로 보강한다. scan 모드(ensureSchema)뿐 아니라 exe 모드도
// 1차 검색(queryByTags)이 이 컬럼들을 SELECT하므로, exe 실행 전에도 같은 보강이 필요하다.
async function ensureQueryColumns(db) {
    const existingCols = new Set((await db.all('PRAGMA table_info(tracks)')).map(c => c.name));
    if (!existingCols.has('fp_fingerprint')) await db.exec('ALTER TABLE tracks ADD COLUMN fp_fingerprint TEXT');
    if (!existingCols.has('fp_duration')) await db.exec('ALTER TABLE tracks ADD COLUMN fp_duration REAL');
    if (!existingCols.has('lyrics_status')) {
        await db.exec('ALTER TABLE tracks ADD COLUMN lyrics_status TEXT');
        // 가사가 이미 있는 행만 has_lyrics로 맞춘다. 빈 가사는 NULL로 남겨 "아직 안 넣음"을 유지한다.
        // (이미 not_found/has_lyrics가 들어있는 db는 이 분기를 타지 않음)
        await db.exec(`UPDATE tracks SET lyrics_status = 'has_lyrics'
            WHERE lyrics IS NOT NULL AND lyrics != ''`);
    }
    if (!existingCols.has('tags')) {
        await db.exec('ALTER TABLE tracks ADD COLUMN tags TEXT');
    }
    await backfillTrackTags(db);

    // id3_*/fp_title 등/ext_* 3갈래로 나뉘어 있던 컬럼을 개념별 통합 컬럼(title/artist/album/year/genre/
    // composer 등) 하나로 합친다. 옛 컬럼(id3_title 등)이 남아있는 db에서만 1회 실행하고, 백필 후 옛
    // 컬럼은 DROP COLUMN으로 완전히 제거한다(SQLite 3.35+ 지원 - 이 프로젝트가 쓰는 드라이버는 3.44).
    // 우선순위는 지문(fp_*) > ID3(id3_*) > 웹검색(ext_*) - 지문 매칭이 오디오 내용 자체로 곡을 식별한
    // 결과라 가장 신뢰도가 높기 때문(Analyze()의 로컬 우선순위와 동일).
    // 주의: ext_is_remake/ext_version_note를 "없으면 보강"하는 가드를 여기 두면, 마이그레이션 완료 후
    // (옛 컬럼을 이미 DROP한) db에서 매 스캔마다 다시 살아나 버린다 - 그래서 아래 id3_title 분기 안,
    // 백필 직전에만(그리고 정말 없을 때만) 넣는다.
    if (existingCols.has('id3_title')) {
        if (!existingCols.has('ext_version_note')) await db.exec('ALTER TABLE tracks ADD COLUMN ext_version_note TEXT');
        if (!existingCols.has('title')) {
            await db.exec(`
                ALTER TABLE tracks ADD COLUMN title TEXT;
                ALTER TABLE tracks ADD COLUMN artist TEXT;
                ALTER TABLE tracks ADD COLUMN album TEXT;
                ALTER TABLE tracks ADD COLUMN year INTEGER;
                ALTER TABLE tracks ADD COLUMN genre TEXT;
                ALTER TABLE tracks ADD COLUMN composer TEXT;
                ALTER TABLE tracks ADD COLUMN album_artist TEXT;
                ALTER TABLE tracks ADD COLUMN track INTEGER;
                ALTER TABLE tracks ADD COLUMN comment TEXT;
                ALTER TABLE tracks ADD COLUMN has_picture INTEGER;
                ALTER TABLE tracks ADD COLUMN notes TEXT;
                ALTER TABLE tracks ADD COLUMN lyrics TEXT;
                ALTER TABLE tracks ADD COLUMN version_note TEXT;
            `);
        }
        await db.exec(`
            UPDATE tracks SET
                title = COALESCE(NULLIF(fp_title, ''), NULLIF(id3_title, ''), NULLIF(ext_title, '')),
                artist = COALESCE(NULLIF(fp_artists, ''), NULLIF(id3_artist, ''), NULLIF(ext_performed_by, '')),
                album = COALESCE(NULLIF(fp_release_title, ''), NULLIF(id3_album, ''), NULLIF(ext_album, '')),
                year = COALESCE(fp_release_year, id3_year, ext_release_year),
                genre = COALESCE(NULLIF(id3_genre, ''), NULLIF(ext_genre, '')),
                composer = COALESCE(NULLIF(id3_composer, ''), NULLIF(ext_composer, '')),
                album_artist = id3_album_artist,
                track = id3_track,
                comment = id3_comment,
                has_picture = id3_has_picture,
                notes = ext_notes,
                lyrics = ext_lyrics,
                version_note = ext_version_note;
        `);
        // idx_tracks_genre가 옛 ext_genre 컬럼을 참조하고 있으면 그 컬럼을 DROP할 때 SQLite가
        // "error in index ... after drop column"으로 막는다 - 컬럼 드롭 전에 먼저 지워야 한다.
        await db.exec('DROP INDEX IF EXISTS idx_tracks_genre');
        await db.exec(`
            ALTER TABLE tracks DROP COLUMN id3_title;
            ALTER TABLE tracks DROP COLUMN id3_artist;
            ALTER TABLE tracks DROP COLUMN id3_album_artist;
            ALTER TABLE tracks DROP COLUMN id3_album;
            ALTER TABLE tracks DROP COLUMN id3_year;
            ALTER TABLE tracks DROP COLUMN id3_genre;
            ALTER TABLE tracks DROP COLUMN id3_track;
            ALTER TABLE tracks DROP COLUMN id3_composer;
            ALTER TABLE tracks DROP COLUMN id3_comment;
            ALTER TABLE tracks DROP COLUMN id3_has_picture;
            ALTER TABLE tracks DROP COLUMN fp_title;
            ALTER TABLE tracks DROP COLUMN fp_artists;
            ALTER TABLE tracks DROP COLUMN fp_release_title;
            ALTER TABLE tracks DROP COLUMN fp_release_year;
            ALTER TABLE tracks DROP COLUMN ext_title;
            ALTER TABLE tracks DROP COLUMN ext_composer;
            ALTER TABLE tracks DROP COLUMN ext_performed_by;
            ALTER TABLE tracks DROP COLUMN ext_album;
            ALTER TABLE tracks DROP COLUMN ext_release_year;
            ALTER TABLE tracks DROP COLUMN ext_genre;
            ALTER TABLE tracks DROP COLUMN ext_source;
            ALTER TABLE tracks DROP COLUMN ext_confidence;
            ALTER TABLE tracks DROP COLUMN ext_notes;
            ALTER TABLE tracks DROP COLUMN ext_lyrics;
            ALTER TABLE tracks DROP COLUMN ext_is_remake;
            ALTER TABLE tracks DROP COLUMN ext_version_note;
        `);
        await db.exec('CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre)');
    }
}
if (process.argv[2] === 'exe' || process.argv[2] === 'Exe') {
    const dbArg = process.argv[3];
    const rest = process.argv.slice(4);
    // 질문은 길이가 정해지지 않은 자유 텍스트라, 맨 끝 1~2개 토큰이 provider 키워드일 때만 떼어낸다.
    let provider = '', model = '';
    if (rest.length >= 2 && CAI_PROVIDERS.includes(rest[rest.length - 2])) {
        model = rest.pop();
        provider = rest.pop();
    } else if (rest.length >= 1 && CAI_PROVIDERS.includes(rest[rest.length - 1])) {
        provider = rest.pop();
    }
    const question = rest.join(' ');
    if (!dbArg || !question) {
        console.error('사용법: node ai/tool/music.js exe <db 파일 경로> <질문> [provider] [model]');
        process.exit(1);
    }
    try {
        const { reason, rows } = await Exe(dbArg, question, provider, model);
        console.log(JSON.stringify({ reason, rows }));
        process.exit(0);
    } catch (e) {
        console.error('FAIL: ' + (e && e.message));
        process.exit(1);
    }
}

if (process.argv[2] === 'search-test') {
    const dbArg = process.argv[3] || 'db/music.sqlite';
    try {
        await runSearchPatternTests(dbArg);
        process.exit(0);
    } catch (e) {
        console.error('FAIL: ' + (e && e.message));
        process.exit(1);
    }
}

// ── classify 모드: 미정의 폴더의 파일들을 분석해서 기존 폴더 구조 중 어울리는 위치를 추천 ──
// 사용법: node ai/tool/music.js classify <미정의 폴더> <분류될 위치 폴더> [provider] [model]
if (process.argv[2] === 'classify') {
    const unclassifiedFolder = process.argv[3];
    const targetBase = process.argv[4];
    const cProvider = process.argv[5] || '';
    const cModel = process.argv[6] || '';
    if (!unclassifiedFolder || !targetBase) {
        console.error('사용법: node ai/tool/music.js classify <미정의 폴더> <분류될 위치 폴더> [provider] [model]');
        process.exit(1);
    }
    try {
        const result = await Classify(unclassifiedFolder, targetBase, cProvider, cModel);
        console.log(JSON.stringify(result));
        process.exit(0);
    } catch (e) {
        console.error('FAIL: ' + (e && e.message));
        process.exit(1);
    }
}

if (process.argv[2] === 'update-free') {
    const ufDbPath = process.argv[3];
    const ufLimit = process.argv[4] ? parseInt(process.argv[4], 10) : Infinity;
    if (!ufDbPath) {
        console.error('사용법: node ai/tool/music.js update-free <db 파일 경로> [limit]');
        process.exit(1);
    }
    try {
        const summary = await UpdateMissingFree(ufDbPath, ufLimit);
        console.log(JSON.stringify(summary, null, 2));
        process.exit(0);
    } catch (e) {
        console.error('FAIL: ' + (e && e.message));
        process.exit(1);
    }
}

if (process.argv[2] === 'lyrics-en') {
    const leDbPath = process.argv[3];
    const leAbsPath = process.argv[4];
    const leProvider = process.argv[5] || 'claude';
    const leModel = process.argv[6] || 'claude-sonnet-4-6';
    if (!leDbPath || !leAbsPath) {
        console.error('사용법: node ai/tool/music.js lyrics-en <db 파일 경로> <절대경로> [provider] [model]');
        process.exit(1);
    }
    try {
        const result = await LyricsEn(leDbPath, leAbsPath, leProvider, leModel);
        console.log(JSON.stringify(result));
        process.exit(0);
    } catch (e) {
        console.error('FAIL: ' + (e && e.message));
        process.exit(1);
    }
}

if (process.argv[2] === 'update-lyrics') {
    const ulDbPath = process.argv[3];
    const ulLimit = process.argv[4] ? parseInt(process.argv[4], 10) : Infinity;
    if (!ulDbPath) {
        console.error('사용법: node ai/tool/music.js update-lyrics <db 파일 경로> [limit]');
        process.exit(1);
    }
    try {
        const summary = await UpdateMissingLyrics(ulDbPath, ulLimit);
        console.log(JSON.stringify(summary, null, 2));
        process.exit(0);
    } catch (e) {
        console.error('FAIL: ' + (e && e.message));
        process.exit(1);
    }
}

if (process.argv[2] === 'add-tags') {
    const atDb = process.argv[3];
    const atMatch = process.argv[4];
    const atTags = process.argv.slice(5).filter(Boolean);
    if (!atDb || !atMatch || !atTags.length) {
        console.error('사용법: node ai/tool/music.js add-tags <db 파일 경로> <매칭어> <태그> [태그...]');
        process.exit(1);
    }
    try {
        const summary = await AddTags(atDb, atMatch, atTags);
        console.log(JSON.stringify(summary, null, 2));
        process.exit(0);
    } catch (e) {
        console.error('FAIL: ' + (e && e.message));
        process.exit(1);
    }
}

if (process.argv[2] === 'enrich-tags') {
    const etDb = process.argv[3];
    if (!etDb) {
        console.error('사용법: node ai/tool/music.js enrich-tags <db 파일 경로>');
        process.exit(1);
    }
    try {
        const summary = await EnrichMissingTags(etDb);
        console.log(JSON.stringify(summary, null, 2));
        process.exit(0);
    } catch (e) {
        console.error('FAIL: ' + (e && e.message));
        process.exit(1);
    }
}

// AI(웹검색) 없이 무료 구조화 API(MusicBrainz 작곡가/벅스·lyrics.ovh 가사/iTunes 장르)만으로 composer/
// genre/lyrics 중 아직 비어있는 트랙을 채운다. 이미 값이 있는 필드는 덮어쓰지 않는다.
// 가사는 lyrics_status로 상태를 나눈다: NULL만 조회하고, has_lyrics/not_found는 다시 찾지 않는다.
// 조회했는데 가사가 없으면 lyrics_status=not_found로 남겨 다음 update-free에서 건너뛴다.
async function UpdateMissingFree(dbPath, limit) {
    const { CMusicAnalyzer } = await import('../../plugin/MusicAnalyzer/CMusicAnalyzer.js');
    const db = await open({ filename: path.resolve(dbPath), driver: sqlite3.Database });
    await ensureQueryColumns(db);

    const rows = await db.all(`
        SELECT id, title, artist, composer, genre, lyrics, lyrics_status
        FROM tracks
        WHERE (composer IS NULL OR composer = '')
           OR (genre IS NULL OR genre = '')
           OR (lyrics_status IS NULL)
        ORDER BY id
    `);
    const targets = rows.slice(0, limit);

    let updated = 0, noNewInfo = 0, skippedNoTitle = 0;
    let filledComposer = 0, filledGenre = 0, filledLyrics = 0, markedNotFound = 0;
    for (let i = 0; i < targets.length; i++) {
        const row = targets[i];
        const title = row.title;
        const artist = row.artist;
        // 가사가 이미 있는데 status만 NULL이면 조회 없이 has_lyrics로 맞춘다(옛 적재분).
        if (row.lyrics_status == null && row.lyrics) {
            await db.run('UPDATE tracks SET lyrics_status = ? WHERE id = ?', ['has_lyrics', row.id]);
            row.lyrics_status = 'has_lyrics';
        }
        if (!title || !artist) {
            skippedNoTitle++;
            if (row.lyrics_status == null) {
                await db.run('UPDATE tracks SET lyrics_status = ? WHERE id = ?', ['not_found', row.id]);
                markedNotFound++;
            }
            continue;
        }

        const needComposer = !row.composer;
        const needGenre = !row.genre;
        const needLyrics = row.lyrics_status == null;
        if (!needComposer && !needGenre && !needLyrics) continue;

        // MusicBrainz는 클래스 내부(_mbLastCallAt)에서 1req/1.1s로 전역 직렬화되므로 여기서 따로 대기할 필요 없다.
        const [mbComposer, foundLyrics, itunesInfo] = await Promise.all([
            needComposer ? CMusicAnalyzer._queryMusicBrainzComposer(title, artist).catch(() => null) : Promise.resolve(null),
            needLyrics ? CMusicAnalyzer._queryLyrics(title, artist) : Promise.resolve(null),
            needGenre ? CMusicAnalyzer._queryItunes(title, artist).catch(() => null) : Promise.resolve(null),
        ]);

        const sets = [], params = [];
        if (needComposer && mbComposer) { sets.push('composer = ?'); params.push(mbComposer); filledComposer++; }
        if (needGenre && itunesInfo?.genre) { sets.push('genre = ?'); params.push(itunesInfo.genre); filledGenre++; }
        if (needLyrics) {
            const status = resolveLyricsStatus(foundLyrics, true);
            if (status === 'has_lyrics') {
                sets.push('lyrics = ?'); params.push(foundLyrics);
                filledLyrics++;
            } else {
                markedNotFound++;
            }
            sets.push('lyrics_status = ?'); params.push(status);
        }

        if (sets.length) {
            params.push(row.id);
            await db.run(`UPDATE tracks SET ${sets.join(', ')} WHERE id = ?`, params);
            updated++;
        } else {
            noNewInfo++;
        }
        console.log(`[${i + 1}/${targets.length}] id=${row.id} ${title} - ${artist} :: ${sets.length ? sets.join(', ') + ' 갱신' : '무료 소스에서 못 찾음'}`);
    }

    await db.close();
    return {
        대상: targets.length, 갱신됨: updated, 무료소스로못채움: noNewInfo, 제목아티스트없어스킵: skippedNoTitle,
        채운작곡가: filledComposer, 채운장르: filledGenre, 채운가사: filledLyrics, 가사못찾음표시: markedNotFound,
    };
}

function cleanLyricsSearchTitle(title) {
    if (!title) return '';
    let s = String(title).replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ').trim();
    s = s.replace(/\[.*?\]/g, ' ');
    s = s.replace(/\b(official\s*(audio|video|mv)?|lyric(s)?(\s*video)?|full\s*audio|mv|m\/v|hd|4k|visualizer)\b/gi, ' ');
    s = s.replace(/^\d+\.\s*/, '');
    const split = s.split(/\s+[_\-–—]\s+/);
    if (split.length >= 2) s = split[split.length - 1];
    const hangulParens = [...s.matchAll(/\(([^)]*[가-힣][^)]*)\)/g)]
        .map(m => m[1].trim())
        .filter(t => t.length >= 2 && !/feat|with/i.test(t));
    if (hangulParens.length) return hangulParens[hangulParens.length - 1];
    const hangulRuns = s.match(/[가-힣][가-힣\s]{1,}/g);
    if (hangulRuns) {
        hangulRuns.sort((a, b) => b.trim().length - a.trim().length);
        const best = hangulRuns[0].trim();
        if (best.length >= 2) return best;
    }
    return s.replace(/\s+/g, ' ').trim() || String(title);
}

function cleanLyricsSearchArtist(artist) {
    if (!artist) return '';
    const hangulParens = [...String(artist).matchAll(/\(([^)]*[가-힣][^)]*)\)/g)].map(m => m[1].trim());
    if (hangulParens.length) return hangulParens[hangulParens.length - 1];
    const hangulRuns = String(artist).match(/[가-힣][가-힣\s]{1,}/g);
    if (hangulRuns) {
        hangulRuns.sort((a, b) => b.trim().length - a.trim().length);
        const best = hangulRuns[0].trim();
        if (best.length >= 2) return best;
    }
    return String(artist).trim();
}

// 가사만 채운다. instrumental(원래 가사 없음)은 건드리지 않고,
// lyrics_status가 NULL이거나 not_found(이전에 못 찾음)인 빈 가사만 다시 조회한다.
async function UpdateMissingLyrics(dbPath, limit) {
    const { CMusicAnalyzer } = await import('../../plugin/MusicAnalyzer/CMusicAnalyzer.js');
    const db = await open({ filename: path.resolve(dbPath), driver: sqlite3.Database });
    await ensureQueryColumns(db);

    const rows = await db.all(`
        SELECT id, title, artist, lyrics, lyrics_status
        FROM tracks
        WHERE (lyrics IS NULL OR lyrics = '')
          AND (lyrics_status IS NULL OR lyrics_status = 'not_found')
        ORDER BY id
    `);

    const groupMap = new Map();
    for (const row of rows) {
        const key = (row.title || '') + '|||' + (row.artist || '');
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key).push(row);
    }
    const groups = [...groupMap.entries()].slice(0, limit);
    console.log(`대상: ${rows.length}곡 / 고유 그룹: ${groups.length}개 (instrumental 제외)`);

    let filledLyrics = 0, markedNotFound = 0, skippedNoTitle = 0, updatedTracks = 0;
    for (let i = 0; i < groups.length; i++) {
        const [, groupRows] = groups[i];
        const sample = groupRows[0];
        const searchTitle = cleanLyricsSearchTitle(sample.title);
        const searchArtist = cleanLyricsSearchArtist(sample.artist);
        if (!searchTitle) {
            skippedNoTitle++;
            for (const row of groupRows) {
                await db.run('UPDATE tracks SET lyrics_status = ? WHERE id = ?', ['not_found', row.id]);
            }
            markedNotFound += groupRows.length;
            console.log(`[${i + 1}/${groups.length}] 스킵 (제목 없음)`);
            continue;
        }

        console.log(`[${i + 1}/${groups.length}] 가사 검색: "${searchTitle}" / ${searchArtist || '(아티스트 없음)'} (${groupRows.length}곡)`);
        let foundLyrics = null;
        try {
            foundLyrics = await CMusicAnalyzer._queryLyrics(searchTitle, searchArtist);
            if (!foundLyrics && searchTitle !== sample.title) {
                foundLyrics = await CMusicAnalyzer._queryLyrics(String(sample.title), searchArtist || sample.artist || '');
            }
        } catch (e) {
            console.log(`  -> 에러: ${e && e.message}`);
        }

        const status = resolveLyricsStatus(foundLyrics, true);
        if (status === 'has_lyrics') {
            for (const row of groupRows) {
                await db.run('UPDATE tracks SET lyrics = ?, lyrics_status = ? WHERE id = ?', [foundLyrics, 'has_lyrics', row.id]);
            }
            filledLyrics += groupRows.length;
            updatedTracks += groupRows.length;
            console.log(`  -> has_lyrics (${groupRows.length}곡)`);
        } else {
            for (const row of groupRows) {
                await db.run('UPDATE tracks SET lyrics_status = ? WHERE id = ?', ['not_found', row.id]);
            }
            markedNotFound += groupRows.length;
            console.log(`  -> not_found (${groupRows.length}곡)`);
        }
    }

    await db.close();
    return {
        대상곡: rows.length, 고유그룹: groups.length, 가사채움: filledLyrics,
        못찾음: markedNotFound, 제목없어스킵: skippedNoTitle, 갱신곡: updatedTracks,
    };
}

function normTrackPath(p) {
    return String(p || '').replace(/\\/g, '/');
}

async function fetchLyricsOvh(title, artist) {
    if (!title) return null;
    const url = 'https://api.lyrics.ovh/v1/' + encodeURIComponent(artist || '') + '/' + encodeURIComponent(title);
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const json = await res.json();
        return json.lyrics ? String(json.lyrics).trim() : null;
    } catch {
        return null;
    }
}

// 재생 중인 트랙 1곡의 원문 가사. CAI/CMusicAnalyzer를 불러오지 않는다
// (별도 node 프로세스에서 CWASM 초기화 전에 CAI를 import하면 TDZ 에러가 난다).
// 영어 번역은 파일 서버 프로세스(이미 CWASM이 뜬 상태)에서 한다.
async function LyricsEn(dbPath, absPath, _provider, _model) {
    const db = await open({ filename: path.resolve(dbPath), driver: sqlite3.Database });
    await ensureQueryColumns(db);

    const want = normTrackPath(absPath);
    const fileName = path.basename(want);
    let row = await db.get(
        `SELECT id, title, artist, lyrics, absolute_path FROM tracks WHERE replace(absolute_path, '\\', '/') = ?`,
        [want]
    );
    if (!row && fileName) {
        row = await db.get(
            `SELECT id, title, artist, lyrics, absolute_path FROM tracks
             WHERE lower(replace(absolute_path, '\\', '/')) LIKE '%' || lower(?)
             LIMIT 1`,
            ['/' + fileName]
        );
    }

    let title = (row && row.title) || path.parse(fileName).name;
    let artist = (row && row.artist) || '';
    let lyrics = (row && row.lyrics) || null;

    if (!lyrics || String(lyrics).trim() === '') {
        const searchTitle = cleanLyricsSearchTitle(title);
        const searchArtist = cleanLyricsSearchArtist(artist);
        lyrics = await fetchLyricsOvh(searchTitle, searchArtist);
        if (!lyrics && searchTitle !== title) {
            lyrics = await fetchLyricsOvh(String(title), searchArtist || artist);
        }
        if (lyrics && row) {
            await db.run('UPDATE tracks SET lyrics = ?, lyrics_status = ? WHERE id = ?', [lyrics, 'has_lyrics', row.id]);
        }
    }
    await db.close();

    if (!lyrics || String(lyrics).trim() === '') {
        return { ok: false, msg: '가사를 찾지 못했습니다.' };
    }

    return { ok: true, lyrics: String(lyrics), title, artist };
}

// AI 응답은 JSON 객체 하나를 기대하지만, 코드블록(```json ... ```)이나 앞뒤 설명 문장이 덧붙을 수
// 있어 첫 { ~ 마지막 } 구간만 잘라 파싱한다.
function extractJsonObject(text) {
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const body = (fence ? fence[1] : text).trim();
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    if (start < 0 || end < start) throw new Error('AI 응답에서 JSON을 찾지 못함: ' + text);
    return JSON.parse(body.slice(start, end + 1));
}

// classify 모드용: AI 응답은 [{ "file": "...", "folder": "...", "reason": "..." }, ...] 형태의
// JSON 배열을 기대하지만, 코드블록이나 앞뒤 설명 문장이 덧붙을 수 있어 첫 [ ~ 마지막 ] 구간만 잘라 파싱한다.
function extractJsonArray(text) {
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const body = (fence ? fence[1] : text).trim();
    const start = body.indexOf('[');
    const end = body.lastIndexOf(']');
    if (start < 0 || end < start) throw new Error('AI 응답에서 JSON 배열을 찾지 못함: ' + text);
    return JSON.parse(body.slice(start, end + 1));
}

// 1차 단계: 자연어 질문에서 검색 태그(장르/무드/키워드/아티스트/BPM범위/키)만 뽑는다.
// SQL을 직접 만들지 않고 구조화된 값만 받아서, 그 값으로 이 파일이 직접(파라미터 바인딩으로) 넓게 조회한다.
async function extractTags(CAI, provider, model, question) {
    const prompt = [
        '너는 음악 검색 질문에서 검색 태그만 뽑는 도구다. SQL은 작성하지 마라.',
        '1차 검색은 아주 넓게 뽑는 단계이므로, 질문에서 조금이라도 유추 가능한 필드는 최대한 채워라(모호하면 null로 남겨도 된다).',
        '',
        `질문: ${question}`,
        '',
        '규칙:',
        '- 아래 형식의 JSON 객체 하나만 출력해라(코드블록 마크다운이나 다른 설명 문장 없이 순수 JSON 텍스트만):',
        '  {"genres": ["..."], "moods": ["..."], "keywords": ["..."], "artists": ["..."], "composer": "..." | null,',
        '   "album": "..." | null, "folder": "..." | null, "wantsAll": boolean, "yearMin": number | null,',
        '   "yearMax": number | null, "isRemake": boolean | null, "bpmMin": number | null, "bpmMax": number | null,',
        '   "key": "..." | null, "scale": "Major" | "Minor" | null}',
        '- genres/moods/keywords는 각 단어를 짧게(한 단어~두 단어) 끊어서 배열로 담아라. 없으면 빈 배열. 가사/분위기/용도(예: 전투, 엔딩, 카페) 관련 단어도 keywords에 포함해라.',
        '- artists는 질문에 명시되거나 강하게 암시된 아티스트(실제 가수/연주자)를 전부 배열로 담아라(여러 명이면 각각 따로, 예: "아이유,정우" -> ["아이유","정우"]). 없으면 빈 배열.',
        '- 이름(아티스트/작곡가/앨범/작품/게임/캐릭터/시리즈)은 db 표기가 한글/영문/원어로 제각각이다. 알고 있는 다른 표기가 있으면 빠짐없이 같이 담아라.',
        '  예: 아티스트 "글렌체크" -> artists에 ["글렌체크","Glen Check"]. 작품 "라이자" -> keywords/album/folder에 ["라이자","Ryza","ライザ","Atelier Ryza"] (가수가 아니면 artists에만 넣지 마라).',
        '- 한글 이름이면 영문/원어를, 영문이면 한글/원어를 알고 있는 한 반드시 추가해라. 게임 OST/애니메이션 OST는 작품 공식 영문·원어 타이틀을 keywords와 album(또는 folder)에 넣어라.',
        '- composer/album/key/scale은 질문에 명시되거나 강하게 암시된 경우만 채우고, 아니면 null. 특히 key/scale은 사용자가 조성(장조/단조, 또는 C/D#/Bb 같은 구체적인 음이름)을 실제로 언급했을 때만 채워라 - "신나는/밝은/우울한" 같은 무드 표현만으로 장조/단조를 추정해서 채우지 마라(무드는 moods/keywords에만 담아라).',
        '- folder는 질문이 특정 폴더/분류(아티스트가 아니라 음악 분류 묶음, 예: 동요, 락, 재즈, 국내, 캐롤, 국악 등)로 범위를 한정하면 그 이름을 채우고, 아니면 null. "OO 폴더에서/OO 중에서"처럼 폴더를 명시적으로 가리키는 표현에 특히 주의해라.',
        '- "시리즈"(예: 아틀리에 시리즈)는 그 프랜차이즈 전체다. 공식 영문 시리즈명(Atelier 등)을 keywords와 folder에 넣어라. 특정 한 작품(라이자=Atelier Ryza)만 말한 경우에는 그 작품 이명만 넣고 시리즈 전체 이름은 넣지 마라.',
        '- wantsAll: 특정 가수/작품/시리즈의 곡을 "찾아줘/넣어줘/목록/보여줘"하면 true. "추천/골라줘/몇 곡만/N곡만"이거나 분위기 조건(잔잔한/신나는/슬픈 등)이 있으면 false.',
        '- 작품/시리즈 + 분위기(예: 발더스 게이트에서 잔잔한 곡)면 folder에 작품명(영문 표기 포함)을, moods에 분위기 단어를 넣어라. wantsAll은 false.',
        '- yearMin/yearMax는 "2020년대", "최신곡", "옛날 노래" 같은 표현이 있으면 합리적인 연도 범위로 추정해라. 없으면 둘 다 null.',
        '- isRemake는 질문이 "리메이크/커버/라이브/리마스터 버전만" 요구하면 true, "원곡만/리메이크 말고" 같이 원곡만 요구하면 false, 언급 없으면 null.',
        '- bpmMin/bpmMax는 질문에 "신나는/빠른/느린" 같은 표현이 있으면 합리적인 범위로 추정해라. 없으면 null.',
    ].join('\n');

    const result = await CAI.Chat(provider || CAI.eProvider.claude, model || 'claude-sonnet-4-6', os.tmpdir(), prompt, true, undefined, true, false);
    return extractJsonObject(result.text);
}

// tags로 파라미터 바인딩된 넓은 SELECT를 조립해서 실행한다(태그에 맞는 곡 전부 - LIMIT은 폭주 방지용 세이프티넷일 뿐,
// 2차 AI에 넘기기 전 실제 캡은 capByRelevance에서 관련도 기준으로 건다).
// 1차는 "아주 넓게" 뽑는 단계이므로 장르/제목/아티스트/작곡가/앨범/가사/코멘트 컬럼(LIKE_COLS)을 OR로 같이 검색한다.
//
// artist/composer/album(식별 필드)이 하나라도 있으면 genres/moods는 SQL 필터로 AND하지 않는다.
// 이유: extractTags는 아티스트 이름을 keywords에도 중복으로 담는 경우가 흔한데(예: "글렌체크"), 실제 db엔
// 같은 아티스트라도 곡마다 표기가 제각각(영문만/한글병기 등)이라 keywords쪽 매치 컬럼이 다르면 AND 교집합이
// 실존 곡을 통째로 걸러버린다. 게다가 무드/장르 자유단어(예: "신나는")는 곡 텍스트 컬럼에 그대로 들어있는
// 경우가 거의 없어 하드 필터로 걸면 0건이 되기 쉽다(BPM은 맞아도 문구가 없으면 빠짐). 그래서 식별 필드가
// 있을 때는 그 필드(+keywords의 이명)만으로 풀을 정하고, 서술적 조건(무드/장르)은 원본 질문과 함께 2차 AI 선정
// (pickFinal)에 넘겨 후보의 장르/BPM 등을 보고 반영하게 한다. 식별 필드가 전혀 없는 순수 장르/무드 검색일
// 때만 genres/moods/keywords가 1차 필터로 쓰인다.
// 식별 검색은 artist 컬럼만이 아니라 IDENTITY_COLS(앨범/폴더/제목 등)에 OR로 건다. 작품명(라이자 등)이
// 가수명으로 오분류돼도 폴더/앨범의 영문 표기(Ryza)로 살아나게 하기 위함이다. 검색어는 expandSearchTerms로
// 한글/영문/원어 이명을 코드에서 보탠다.
// 지문(fp_fingerprint) 기반 중복 제거도 여기서 SQL로 처리한다: 원본 Chromaprint 지문 문자열이 완전히
// 같은 행끼리는 ROW_NUMBER() 윈도우 함수로 한 행만 남기고, 지문이 없는 곡(fp_fingerprint NULL)은
// 판단 근거가 없으니 그대로 통과시킨다.
// (예전엔 AcoustID 웹 조회 성공 여부에 의존하는 fp_recording_id로 중복을 판단했는데, 조회 실패/미매칭이면
// 전부 null이 되어 사실상 중복 제거가 동작하지 않았다 - 로컬 계산만으로 항상 채워지는 fp_fingerprint로 대체.)
async function queryByTags(db, tags) {
    const artists = expandSearchTerms(
        [...(Array.isArray(tags.artists) ? tags.artists : []), ...(tags.artist ? [tags.artist] : [])]
            .map(t => String(t || '').trim()).filter(Boolean)
    );
    const hasIdentity = Boolean(artists.length || tags.composer || tags.album);

    const conditions = [];
    const params = [];

    if (!hasIdentity) {
        // folder가 지정된 경우 genres는 textTerms에서 뺀다: "OO 폴더에서 XX 찾아줘" 질문에서 AI가 genres에
        // 폴더명과 같은/비슷한 장르 단어(예: folder="동요", genres=["동요"])를 같이 채우는 경우가 흔한데,
        // 그 장르 단어가 폴더 내 대부분 곡의 공통 태그라 OR그룹에 포함되면 "폴더 안 아무 곡이나" 다 걸려서
        // (예: 2건이어야 할 제목 검색이 300여 건으로 불어남) keywords(제목 등 실제 식별 정보)의 매칭력이
        // 무의미해진다. folder 조건은 이미 별도로 AND되므로 genres 없이 moods/keywords만으로 충분하다.
        const textTerms = expandSearchTerms(
            [...(tags.folder ? [] : (tags.genres || [])), ...(tags.moods || []), ...(tags.keywords || [])]
                .map(t => String(t || '').trim()).filter(Boolean)
        );
        if (textTerms.length) {
            const orParts = [];
            for (const term of textTerms) {
                for (const col of colsForLikeTerm(term, LIKE_COLS)) {
                    orParts.push(`${col} LIKE ?`);
                    params.push(`%${term}%`);
                }
            }
            conditions.push('(' + orParts.join(' OR ') + ')');
        }
    }
    if (artists.length) {
        // keywords의 다른 표기(영/한/원어)는 같이 찾되, 무드/장르는 넣지 않는다(가사 오탐 방지).
        // 여러 아티스트를 나열한 질문(예: "아이유,글렌체크")도 여기서 전부 OR로 같이 찾는다.
        const altTerms = expandSearchTerms(
            [...(tags.keywords || [])].map(t => String(t || '').trim()).filter(Boolean)
        );
        const terms = [...new Set([...artists, ...altTerms])];
        const orParts = [];
        for (const term of terms) {
            for (const col of colsForLikeTerm(term, IDENTITY_COLS)) {
                orParts.push(`${col} LIKE ?`);
                params.push(`%${term}%`);
            }
        }
        conditions.push('(' + orParts.join(' OR ') + ')');
    }
    if (tags.composer) {
        const composerTerms = expandSearchTerms([tags.composer]);
        conditions.push('(' + composerTerms.map(() => 'composer LIKE ?').join(' OR ') + ')');
        for (const t of composerTerms) params.push(`%${t}%`);
    }
    if (tags.album) {
        const albumTerms = expandSearchTerms([tags.album]);
        conditions.push('(' + albumTerms.map(() => 'album LIKE ?').join(' OR ') + ')');
        for (const t of albumTerms) params.push(`%${t}%`);
    }
    // folder는 아티스트/장르 검색과 별개로 "이 폴더 범위 안에서" 찾으라는 구조적 제약이라, 위 분기와
    // 상관없이 항상 AND로 건다(예: "동요 폴더에서 OO 찾아줘" -> 제목 검색 + 폴더 범위 좁히기가 동시에 필요).
    // 한글 폴더명(라이자)이 실제 경로(Atelier Ryza1)와 다르면 이명 OR로 맞춘다.
    if (tags.folder) {
        const folderTerms = expandSearchTerms([tags.folder]);
        conditions.push('(' + folderTerms.map(() => 'folder_path LIKE ?').join(' OR ') + ')');
        for (const t of folderTerms) params.push(`%${t}%`);
    }
    if (Number.isFinite(tags.yearMin)) { conditions.push('year >= ?'); params.push(tags.yearMin); }
    if (Number.isFinite(tags.yearMax)) { conditions.push('year <= ?'); params.push(tags.yearMax); }
    // isRemake=true: 리메이크/라이브/커버 등으로 판정된 곡만(version_note가 채워져 있음). isRemake=false:
    // 리메이크로 확실히 판정된 곡만 제외(판정 안 된 곡(NULL)은 원곡일 수도 있으니 그대로 포함시킨다).
    if (tags.isRemake === true) { conditions.push("(version_note IS NOT NULL AND version_note != '')"); }
    else if (tags.isRemake === false) { conditions.push("(version_note IS NULL OR version_note = '')"); }
    if (Number.isFinite(tags.bpmMin)) { conditions.push('audio_bpm >= ?'); params.push(tags.bpmMin); }
    if (Number.isFinite(tags.bpmMax)) { conditions.push('audio_bpm <= ?'); params.push(tags.bpmMax); }
    if (tags.key) { conditions.push('audio_key = ?'); params.push(tags.key); }
    // scale(Major/Minor)은 하드 필터로 걸지 않는다: extractTags 프롬프트가 명시적 언급이 있을 때만 채우라고
    // 해도, 모델이 "신나는/밝은" 같은 무드 표현만 보고 장조로 과감히 추정해 채우는 경우가 실제로 관측됨
    // (provider=claude에서 재현: "신나는 어쿠스틱 느낌" 질문에 scale:"Major"를 채워 넣어 bpm/장르 조건과
    // AND되면서 실존하는 44곡이 0건이 됨). audio_scale은 값이 Major/Minor 둘뿐이라 한 번 잘못 추정되면
    // 절반 가까운 후보가 통째로 걸러지는 위험이 크므로, SQL 필터 대신 pickFinal 후보 요약에 실려 있는
    // scale 정보로 2차 AI가 참고만 하게 한다(audio_key는 특정 음이라 애매한 무드어로 헛짚을 위험이 낮아 유지).

    if (conditions.length === 0) throw new Error('질문에서 검색 태그를 뽑지 못함(너무 모호한 질문일 수 있음): ' + JSON.stringify(tags));

    const cols = SELECT_COLS.join(', ');
    const sql = `WITH matched AS (
        SELECT ${cols},
            ROW_NUMBER() OVER (PARTITION BY fp_fingerprint ORDER BY id ASC) AS fp_rank
        FROM tracks WHERE ${conditions.join(' AND ')}
    )
    SELECT ${cols}
    FROM matched
    WHERE fp_fingerprint IS NULL OR fp_rank = 1
    LIMIT 20000`;
    return db.all(sql, params);
}

// 2차 AI 프롬프트에 넣기 직전, 후보가 cap을 넘으면 잘라야 하는데 SQL 조회 순서(=폴더/스캔 순서)로 그냥
// 앞에서부터 자르면 특정 폴더로 쏠린다. 대신 태그(genres/moods/keywords/artists)가 각 곡의 텍스트 컬럼에
// 몇 번 매치되는지로 점수를 매겨 관련도 높은 순으로 cap개를 남긴다.
function capByRelevance(rows, tags, cap) {
    if (rows.length <= cap) return rows;
    const terms = expandSearchTerms([...(tags.genres || []), ...(tags.moods || []), ...(tags.keywords || []),
        ...(Array.isArray(tags.artists) ? tags.artists : []), tags.artist, tags.composer, tags.album, tags.folder]
        .map(t => String(t || '').trim()).filter(Boolean))
        .map(t => t.toLowerCase());

    const scored = rows.map(row => {
        let score = 0;
        for (const col of LIKE_COLS) {
            const val = String(row[col] || '').toLowerCase();
            if (!val) continue;
            for (const term of terms) if (val.includes(term)) score++;
        }
        return { row, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, cap).map(s => s.row);
}

// pickFinal 프롬프트에 넣을 후보 요약을 만든다. folder는 마지막 2단계만, notes는 앞부분만 잘라서
// 후보 1개당 크기를 줄인다 - 2차 AI 호출이 프롬프트를 OS 명령줄 인자로 넘기는 방식(CAI.Chat)이라
// 후보가 많아지면(각 곡의 folder_path/notes/lyrics가 길면) Windows 명령줄 길이 한도(약 32K자)를
// 넘겨 spawn이 ENAMETOOLONG으로 죽을 수 있다.
function summarizeCandidate(r) {
    const folder = String(r.folder_path || '').split('/').slice(-2).join('/');
    const notes = String(r.notes || r.comment || '').slice(0, 150);
    return {
        id: r.id, folder, artist: r.artist,
        title: r.title, genre: r.genre,
        composer: r.composer, album: r.album,
        year: r.year,
        notes,
        isRemake: Boolean(r.version_note), versionNote: r.version_note,
        bpm: r.audio_bpm, key: r.audio_key, scale: r.audio_scale, camelot: r.audio_camelot_code,
    };
}

// 2차 단계: 지문 중복 제거되고 cap 이하로 추려진 후보 풀과 원래 질문을 다시 AI에게 줘서, 진짜 관련 있는 곡 최종 N개를 고르게 한다.
// 같은 폴더/아티스트로 쏠리지 않게 지시해서 1차 풀이 넓어도 최종 추천은 다양해지도록 한다.
async function pickFinal(CAI, provider, model, question, candidates, finalCount) {
    const summaries = candidates.map(summarizeCandidate);

    const prompt = [
        '너는 후보 목록 중에서 사용자 질문에 진짜 어울리는 곡만 최종 추천하는 도구다.',
        '',
        `질문: ${question}`,
        '',
        '아래는 1차로 넓게 찾은 후보 목록(JSON 배열)이다:',
        JSON.stringify(summaries),
        '',
        '규칙:',
        `- 후보 중 질문에 실제로 어울리는 곡을 최대 ${finalCount}개 골라라. 어울리는 곡이 적으면 그보다 적게 골라도 된다.`,
        '- 같은 폴더나 같은 아티스트의 곡이 여러 개 어울리더라도, 질문이 특정 아티스트/폴더를 요구한 게 아니라면 골고루 섞어서 골라라(한 폴더/아티스트에 쏠리지 않게).',
        '- 판단 기준(예: BPM 범위, 장조/단조, 특정 장르)을 스스로 세웠다면, ids에 넣기 전에 후보 각각의 실제 bpm/scale/genre 값이 그 기준과 맞는지 다시 확인해라. 기준에서 벗어난 곡은 빼고, 정말 예외로 포함해야 한다면 reason에 왜 예외인지 밝혀라(기준과 실제 값이 다른데 reason에 언급 없이 섞어 넣지 마라).',
        '- 질문이 잔잔한/신나는/슬픈 같은 분위기면 bpm(느림≈잔잔, 빠름≈신남)과 scale/genre를 보고 맞는 곡만 골라라. 범위 밖의 곡은 빼라.',
        '- id는 반드시 후보 목록에 있는 값 그대로여야 한다.',
        '- 아래 형식의 JSON 객체 하나만 출력해라(코드블록 마크다운이나 다른 설명 문장 없이 순수 JSON 텍스트만):',
        '  {"ids": [<id>, ...], "reason": "<이렇게 고른 이유를 한국어 1~2문장으로>"}',
    ].join('\n');

    const result = await CAI.Chat(provider || CAI.eProvider.claude, model || 'claude-sonnet-4-6', os.tmpdir(), prompt, true, undefined, true, false);
    const parsed = extractJsonObject(result.text);
    const ids = Array.isArray(parsed.ids) ? parsed.ids : [];
    const reason = String(parsed.reason || '').trim();
    return { ids, reason };
}

// candidates가 많으면 요약을 줄여도(summarizeCandidate) 프롬프트가 여전히 명령줄 길이 한도를 넘길 수 있어
// BATCH_SIZE개씩 나눠 pickFinal을 여러 번 호출하고 결과를 합친다(2차 AI 호출 자체를 여러 번 하는 것 -
// 배치별로 독립적으로 판단하므로 배치 경계에 걸친 "전체 후보 중 가장 좋은 것"의 완벽한 정확도는 다소
// 떨어지지만, 아예 실패(ENAMETOOLONG)하는 것보단 낫다). 배치별 선정 개수는 finalCount를 배치 수만큼
// 비례 배분해 최종 합계가 finalCount 근처가 되게 한다.
async function pickFinalBatched(CAI, provider, model, question, candidates, finalCount) {
    // exe 모드 블록이 파일 앞부분에서 top-level await로 곧장 실행되므로(뒤쪽 module-scope const 선언에
    // 아직 도달하지 못한 시점일 수 있음), 배치 크기는 module-scope const가 아니라 함수 내부 상수로 둔다.
    const batchSize = 60;
    if (candidates.length <= batchSize) return pickFinal(CAI, provider, model, question, candidates, finalCount);

    const batches = [];
    for (let i = 0; i < candidates.length; i += batchSize) batches.push(candidates.slice(i, i + batchSize));
    const perBatchCount = Math.max(1, Math.ceil(finalCount / batches.length));

    const allIds = [];
    const reasons = [];
    for (const batch of batches) {
        // 배치 하나가 AI 응답 파싱 실패 등으로 죽어도 나머지 배치 결과는 살린다(전부 실패보다 부분 성공이 낫다).
        try {
            const { ids, reason } = await pickFinal(CAI, provider, model, question, batch, perBatchCount);
            // 곡을 하나도 못 고른 배치의 reason("관련 곡 없음" 류)은 버린다 - 안 그러면 다른 배치가 실제로
            // 정답을 찾았는데도 그 reason이 무관한 "없음" 문구에 밀려 최종 reason이 결과(rows)와 모순되는
            // 문제가 생긴다(실제로 LoL 검색에서 재현: ids엔 정답 3곡이 담겼는데 reason은 "관련 곡 없음"이었음).
            if (ids.length) {
                allIds.push(...ids);
                if (reason) reasons.push(reason);
            }
        } catch (e) {
            console.error('[pickFinalBatched] 배치 실패(건너뜀): ' + (e && e.message));
        }
    }
    // reasons는 이미 "곡을 하나라도 고른 배치"만 남긴 상태라 앞에서부터 잘라도 안전하다(무관한 배치의
    // 부정적 reason이 안 섞임). 배치 수가 많아도 프롬프트가 아니라 최종 출력 텍스트라 길이 제약이 느슨하므로
    // 임의로 앞 2개만 자르지 않고 기여한 배치 전부를 이어붙인다.
    return { ids: allIds.slice(0, finalCount), reason: reasons.join(' ') };
}

// stdout/메신저로 나가기 직전 한 곡을 최소 필드로 줄인다. fp_fingerprint는 곡당 수천 자라
// 240곡이면 수 MB가 되어 에이전트/메신저가 멈춘 것처럼 보였음. 중복 제거가 끝난 뒤에는 필요 없다.
function slimRow(r) {
    const bpm = r.audio_bpm;
    return {
        id: r.id,
        title: r.title || null,
        artist: r.artist || null,
        album: r.album || null,
        folder: r.folder_path || null,
        path: r.absolute_path || null,
        year: r.year ?? null,
        genre: r.genre || null,
        bpm: Number.isFinite(bpm) ? Math.round(bpm) : null,
        key: r.audio_key || null,
        scale: r.audio_scale || null,
    };
}

function folderLabel(folderPath) {
    return String(folderPath || '(폴더 없음)').replace(/\\/g, '/').split('/').filter(Boolean).slice(-2).join('/');
}

// 최종 exe 응답. reply는 사람이 바로 보내도 되는 짧은 요약(곡이 많으면 폴더별 개수, 적으면 곡 목록).
function formatExeResult(rows, reason) {
    const slim = rows.map(slimRow);
    const byFolder = new Map();
    for (const r of slim) {
        const key = folderLabel(r.folder);
        byFolder.set(key, (byFolder.get(key) || 0) + 1);
    }
    const folderEntries = [...byFolder.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const folders = Object.fromEntries(folderEntries);

    let reply;
    if (slim.length === 0) {
        reply = reason || '맞는 곡을 찾지 못함';
    } else if (slim.length > 20) {
        const lines = folderEntries.map(([k, n]) => `- ${k}: ${n}곡`);
        reply = `${reason}\n총 ${slim.length}곡.\n${lines.join('\n')}`;
    } else {
        const lines = slim.map((r) => {
            const who = r.artist ? ` — ${r.artist}` : '';
            return `- ${r.title || path.basename(r.path || '')}${who}`;
        });
        reply = `${reason}\n총 ${slim.length}곡.\n${lines.join('\n')}`;
    }
    return { reply, reason, count: slim.length, folders, rows: slim };
}

// dbPath의 tracks를 대상으로 2단계 질의를 수행한다.
// 1차: 질문에서 태그만 뽑아 태그에 맞는 곡을 전부 조회한다(SQL 단에서 지문 기반 중복 제거까지 포함).
// 2차 프롬프트 크기 안전판으로 poolCap(기본 3000)을 넘으면 관련도 순으로 추린 뒤, 그 후보 중
// 진짜 관련 있는 곡 최종 N개(finalCount, 기본 20)를 AI가 다시 골라 { reason, rows }로 돌려준다.
async function Exe(dbArg, question, provider, model, finalCount = 20, poolCap = 3000) {
    const { CAI } = await import('../../artgine/util/CAI.js');

    // queryByTags가 참조하는 컬럼이 옛 스키마 db엔 없을 수 있어, 읽기전용으로 열기 전에 짧게 쓰기
    // 연결로 부족한 컬럼만 보강한다(스캔 없이 exe만 실행해도 최신 컬럼을 조회할 수 있게).
    const migrateDb = await open({ filename: path.resolve(dbArg), driver: sqlite3.Database });
    await ensureQueryColumns(migrateDb);
    await migrateDb.close();

    const db = await open({ filename: path.resolve(dbArg), driver: sqlite3.Database, mode: sqlite3.OPEN_READONLY });

    try {
        const tags = applyQueryIntent(
            injectAliasSeedsFromQuestion(await extractTags(CAI, provider, model, question), question),
            question,
        );
        if (process.env.MUSIC_DEBUG) console.error('[DEBUG tags]', JSON.stringify(tags));
        const pool = await queryByTags(db, tags);
        if (process.env.MUSIC_DEBUG) console.error('[DEBUG pool.length]', pool.length);
        if (pool.length === 0) return formatExeResult([], '1차 검색에서 태그에 맞는 곡을 찾지 못함');

        let pickCount = tags.requestedCount || finalCount;
        if (!tags.requestedCount && tags.hasMoodFilter) {
            pickCount = Math.min(Math.max(pool.length, 20), 80);
        }
        // wantsAll이면 2차 AI가 pickCount로 추리면 안 되므로, 1차 풀을 그대로 반환한다.
        if (tags.wantsAll) {
            const rows = pool.slice().sort((a, b) =>
                String(a.folder_path || '').localeCompare(String(b.folder_path || '')) || a.id - b.id);
            return formatExeResult(rows, '매칭되는 곡 전체(2차 선정 생략)');
        }

        const candidates = capByRelevance(pool, tags, poolCap);
        const { ids, reason } = await pickFinalBatched(CAI, provider, model, question, candidates, pickCount);
        if (process.env.MUSIC_DEBUG) console.error('[DEBUG picked ids.length]', ids.length);

        const byId = new Map(candidates.map(r => [r.id, r]));
        const rows = ids.map(id => byId.get(id)).filter(Boolean);
        return formatExeResult(rows, reason || '최종 선정');
    } finally {
        await db.close();
    }
}

function folderNamesOf(rows) {
    const names = new Set();
    for (const r of rows) {
        const parts = String(r.folder_path || '').replace(/\\/g, '/').split('/').filter(Boolean);
        const leaf = parts[parts.length - 1] || '';
        const parent = parts[parts.length - 2] || leaf;
        names.add(/Atelier|아이유|IU/i.test(parent) ? parent : leaf);
    }
    return [...names].sort();
}

async function runSearchPatternTests(dbArg) {
    const migrateDb = await open({ filename: path.resolve(dbArg), driver: sqlite3.Database });
    await ensureQueryColumns(migrateDb);
    await migrateDb.close();
    const db = await open({ filename: path.resolve(dbArg), driver: sqlite3.Database, mode: sqlite3.OPEN_READONLY });

    const cases = [
        {
            name: '아틀리에 시리즈 전체',
            question: '아틀리에 시리즈 노래 넣어줘',
            aiTags: {},
            expect: {
                wantsAll: true,
                requestedCount: null,
                poolMin: 1000,
                mustHaveFolder: /Atelier (Firis|Sophie|Ryza)/i,
                mustNotOnlyRyza: true,
            },
        },
        {
            name: '라이자 시리즈 30곡만',
            question: '라이자 노래 시리즈 찾아줘 30곡만',
            aiTags: {},
            expect: {
                wantsAll: false,
                requestedCount: 30,
                poolMin: 150,
                poolMax: 400,
                allFoldersMatch: /Ryza/i,
            },
        },
        {
            name: '아이유 전부',
            question: '아이유 곡 찾아줘',
            aiTags: { artists: ['아이유'] },
            expect: {
                wantsAll: true,
                requestedCount: null,
                poolMin: 20,
            },
        },
        {
            name: '아이유 추천',
            question: '아이유 노래 몇 곡만 추천',
            aiTags: { artists: ['아이유'] },
            expect: {
                wantsAll: false,
                requestedCount: null,
                pickCount: 20,
                poolMin: 20,
            },
        },
        {
            name: '라이자 찾아줘(개수 없음=전체)',
            question: '라이자 노래 찾아줘',
            aiTags: {},
            expect: {
                wantsAll: true,
                allFoldersMatch: /Ryza/i,
                poolMin: 150,
            },
        },
        {
            name: '아틀리에 10곡만',
            question: '아틀리에 중에서 10곡만',
            aiTags: {},
            expect: {
                wantsAll: false,
                requestedCount: 10,
                poolMin: 1000,
            },
        },
        {
            name: '무드 검색은 전체 강제 없음',
            question: '신나는 곡 찾아줘',
            aiTags: { moods: ['신나는'], keywords: ['신나는'] },
            expect: {
                wantsAll: false,
            },
        },
        {
            name: '발더스 게이트에서 잔잔한 곡',
            question: '발더스 게이트에서 잔잔한 곡만 찾아줘',
            aiTags: {},
            expect: {
                wantsAll: false,
                poolMin: 20,
                poolMax: 80,
                allFoldersMatch: /Baldur/i,
            },
        },
        {
            name: '라이자에서 잔잔한 곡은 라이자 폴더만',
            question: '라이자에서 잔잔한 곡 찾아줘',
            aiTags: {},
            expect: {
                wantsAll: false,
                poolMin: 150,
                poolMax: 400,
                allFoldersMatch: /Ryza/i,
            },
        },
    ];

    let failed = 0;
    try {
        for (const c of cases) {
            const tags = applyQueryIntent(
                injectAliasSeedsFromQuestion({
                    genres: [], moods: [], keywords: [], artists: [],
                    composer: null, album: null, folder: null, wantsAll: false,
                    ...c.aiTags,
                }, c.question),
                c.question,
            );
            let pool = [];
            let poolErr = '';
            try { pool = await queryByTags(db, tags); }
            catch (e) { poolErr = e && e.message; }

            const folders = folderNamesOf(pool);
            const exp = c.expect;
            const pickCount = tags.requestedCount || 20;
            const checks = [];
            if ('wantsAll' in exp) checks.push(['wantsAll', tags.wantsAll === true, exp.wantsAll === true]);
            if ('requestedCount' in exp) checks.push(['requestedCount', tags.requestedCount, exp.requestedCount]);
            if (exp.pickCount) checks.push(['pickCount', pickCount, exp.pickCount]);
            if (exp.poolMin) checks.push(['pool>=' + exp.poolMin, pool.length >= exp.poolMin, true]);
            if (exp.poolMax) checks.push(['pool<=' + exp.poolMax, pool.length <= exp.poolMax, true]);
            if (exp.mustHaveFolder) checks.push(['folderHas', folders.some((f) => exp.mustHaveFolder.test(f)), true]);
            if (exp.mustNotOnlyRyza) {
                const onlyRyza = folders.length > 0 && folders.every((f) => /Ryza/i.test(f));
                checks.push(['notOnlyRyza', !onlyRyza, true]);
            }
            if (exp.allFoldersMatch) {
                const ok = pool.length === 0 || folders.every((f) => exp.allFoldersMatch.test(f));
                checks.push(['allFoldersRyza', ok, true]);
            }

            const bad = checks.filter(([, actual, want]) => actual !== want);
            const ok = bad.length === 0;
            if (!ok) failed++;
            console.log(`${ok ? 'OK' : 'FAIL'} ${c.name}`);
            console.log(`  q="${c.question}" wantsAll=${tags.wantsAll} count=${tags.requestedCount} pick=${pickCount} pool=${pool.length}${poolErr ? ' err=' + poolErr : ''}`);
            console.log(`  keywords=${JSON.stringify(tags.keywords || [])}`);
            console.log(`  folders=${folders.slice(0, 12).join(', ')}${folders.length > 12 ? ' ...' : ''}`);
            if (bad.length) console.log(`  failed: ${bad.map(([n]) => n).join(', ')}`);
        }
    } finally {
        await db.close();
    }
    console.log(failed ? `\nFAILED ${failed} case(s)` : '\nALL PASS');
    if (failed) throw new Error('search-test ' + failed + ' failed');
}

// targetDir 아래 모든 폴더를 재귀로 수집한다(excludeAbs 자신과 그 하위는 제외 - 미정의 폴더가
// 분류될 위치 아래에 있는 경우 자기 자신을 분류 후보로 삼지 않기 위함).
function walkAllFolders(targetDir, excludeAbs) {
    let results = [];
    for (const name of fs.readdirSync(targetDir)) {
        const full = path.join(targetDir, name);
        let stat;
        try { stat = fs.statSync(full); } catch { continue; }
        if (!stat.isDirectory()) continue;
        const fullAbs = full.replace(/\\/g, '/');
        if (excludeAbs && (fullAbs === excludeAbs || fullAbs.startsWith(excludeAbs + '/'))) continue;
        results.push(fullAbs);
        results = results.concat(walkAllFolders(full, excludeAbs));
    }
    return results;
}

// 미정의 폴더의 파일들을 분석해서, 분류될 위치(targetBase) 아래 기존 폴더(전체 depth) 중
// 가장 어울리는 폴더를 AI에게 추천받는다. 실제 파일 이동은 하지 않고
// { results: [{file, folder, reason}], invalid, totalFiles } 매핑만 돌려준다.
async function Classify(unclassifiedFolder, targetBase, provider, model) {
    const { CAI } = await import('../../artgine/util/CAI.js');

    const unclassifiedAbs = path.resolve(unclassifiedFolder).replace(/\\/g, '/').replace(/\/$/, '');
    const targetAbs = path.resolve(targetBase).replace(/\\/g, '/').replace(/\/$/, '');

    const candidateFolders = walkAllFolders(targetAbs, unclassifiedAbs);
    if (candidateFolders.length === 0) throw new Error('분류될 위치 아래에 후보 폴더가 없음: ' + targetAbs);

    const files = walkAudioFiles(unclassifiedFolder);
    if (files.length === 0) return { results: [], invalid: [], totalFiles: 0, message: '미정의 폴더에 오디오 파일 없음' };

    // 분석 결과는 매번 다시 뽑지 않도록 분류될 위치 아래에 캐시(scan 모드와 동일한 패턴)해 둔다.
    const cacheDir = path.join(targetAbs, '.classify_cache', path.basename(unclassifiedAbs));
    fs.mkdirSync(cacheDir, { recursive: true });

    const summaries = [];
    for (const [i, filePath] of files.entries()) {
        const fileName = path.basename(filePath);
        const relSafe = path.relative(unclassifiedFolder, filePath).replace(/\\/g, '/').replace(/[/\\]/g, '__');
        const cacheFile = path.join(cacheDir, relSafe + '.json');
        if (!fs.existsSync(cacheFile)) {
            console.error(`[${i + 1}/${files.length}] 분석 중: ${fileName}`);
            const child = spawnSync('node', [__filename, '--analyze-one', filePath, cacheFile], { stdio: 'inherit' });
            if (child.status !== 0 || !fs.existsSync(cacheFile)) {
                console.error(`  -> 분석 실패, 건너뜀: ${fileName}`);
                continue;
            }
        } else {
            console.error(`[${i + 1}/${files.length}] 캐시 사용: ${fileName}`);
        }
        const r = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        summaries.push({
            absolute_path: r.fileInfo.absolutePath,
            file_name: r.fileInfo.fileName,
            id3_artist: r.id3.artist, id3_album: r.id3.album, id3_genre: r.id3.genre,
            bpm: r.musical.overall.rhythm.bpm, key: r.musical.overall.tonal.key, scale: r.musical.overall.tonal.scale,
            ext_title: r.external?.title, ext_performed_by: r.external?.artist,
            ext_genre: r.external?.genre, ext_notes: r.external?.notes,
        });
    }
    if (summaries.length === 0) throw new Error('분석에 성공한 파일이 없음');

    const prompt = [
        '너는 음악 파일을 기존 폴더 구조에 맞게 분류하는 도구다.',
        '아래는 이미 존재하는 폴더 목록(분류 후보)이다. 반드시 이 중 하나를 정확히 그대로 골라야 한다:',
        candidateFolders.map(f => '- ' + f).join('\n'),
        '',
        '아래는 분류해야 할 파일들의 메타데이터(JSON 배열)다:',
        JSON.stringify(summaries),
        '',
        '규칙:',
        '- 위 메타데이터 배열의 모든 파일에 대해 빠짐없이 하나씩 매핑해라.',
        '- folder 값은 후보 목록에 있는 경로 문자열과 정확히 동일해야 한다(오타/변형/새 경로 생성 금지).',
        '- 아티스트/앨범 전용 하위 폴더가 후보에 있고 그 파일이 거기 속한다면 그 하위 폴더를, 아니면 더 상위(장르 등 일반적인) 폴더를 선택해라.',
        '- 아래 형식의 JSON 배열 하나만 출력해라(코드블록 마크다운이나 다른 설명 문장 없이 순수 JSON 텍스트만):',
        '  [{"file": "<absolute_path 그대로>", "folder": "<후보 목록의 경로 그대로>", "reason": "<고른 이유 한국어 1문장>"}, ...]',
    ].join('\n');

    const result = await CAI.Chat(provider || CAI.eProvider.claude, model || 'claude-sonnet-4-6', os.tmpdir(), prompt, true, undefined, true, false);
    const parsed = extractJsonArray(result.text);

    const candidateSet = new Set(candidateFolders);
    const results = [], invalid = [];
    for (const item of parsed) {
        const entry = { file: item.file, folder: item.folder, reason: item.reason || '' };
        if (candidateSet.has(item.folder)) results.push(entry);
        else invalid.push(entry);
    }
    return { results, invalid, totalFiles: summaries.length };
}

// ── scan 모드: 폴더를 분석해서 db에 적재 ──
// 사용법: node ai/tool/music.js scan <분석할 폴더> <db 파일 경로> [limit] [provider] [model] [fields]
if (process.argv[2] !== 'scan') {
    console.error('사용법: node ai/tool/music.js scan <분석할 폴더 또는 파일> <db 파일 경로> [limit] [provider] [model] [scanLevel]');
    console.error('       node ai/tool/music.js exe <db 파일 경로> <질문> [provider] [model]');
    console.error('       node ai/tool/music.js classify <미정의 폴더> <분류될 위치 폴더> [provider] [model]');
    console.error('       node ai/tool/music.js update-lyrics <db 파일 경로> [limit]');
    console.error('       node ai/tool/music.js search-test [db 파일 경로]');
    console.error('       node ai/tool/music.js add-tags <db 파일 경로> <매칭어> <태그> [태그...]');
    console.error('       node ai/tool/music.js enrich-tags <db 파일 경로>');
    process.exit(1);
}
const folder = process.argv[3];
const dbPath = process.argv[4];
const limit = process.argv[5] ? parseInt(process.argv[5], 10) : Infinity;
const provider = process.argv[6] || '';   // CAI.eProvider: claude|codex|gpt|antigravity|opencode|grok. 생략 시 CMusicAnalyzer 기본값(grok) 사용.
const model = process.argv[7] || '';      // 생략 시 CMusicAnalyzer 기본 모델(grok-4.5) 사용.
const scanLevelArg = process.argv[8] || ''; // -1|0|1. 생략 시 0(CMusicAnalyzer 기본값) 사용.
if (!folder || !dbPath) {
    console.error('사용법: node ai/tool/music.js scan <분석할 폴더 또는 파일> <db 파일 경로> [limit] [provider] [model] [scanLevel]');
    process.exit(1);
}
const AUDIO_EXT_RE = /\.(mp3|flac|wav|m4a|ogg)$/i;
const isSingleFileTarget = fs.statSync(folder).isFile();

const cacheDir = path.join(path.dirname(path.resolve(dbPath)), '.music_cache', path.basename(folder));
fs.mkdirSync(cacheDir, { recursive: true });

// 표준 Camelot 휠: 메이저(B)/마이너(A) 키 이름 -> 번호. essentia는 샵(#) 표기를 쓰므로 플랫은 샵으로 정규화.
const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const MAJOR_NUM = { C: 8, G: 9, D: 10, A: 11, E: 12, B: 1, 'F#': 2, 'C#': 3, 'G#': 4, 'D#': 5, 'A#': 6, F: 7 };
const MINOR_NUM = { A: 8, E: 9, B: 10, 'F#': 11, 'C#': 12, 'G#': 1, 'D#': 2, 'A#': 3, F: 4, C: 5, G: 6, D: 7 };
function toCamelot(key, scale) {
    if (!key || !scale) return null;
    const norm = FLAT_TO_SHARP[key] || key;
    const isMinor = scale.toLowerCase().startsWith('min');
    const num = isMinor ? MINOR_NUM[norm] : MAJOR_NUM[norm];
    return num ? `${num}${isMinor ? 'A' : 'B'}` : null;
}

async function ensureSchema(db) {
    // CREATE TABLE IF NOT EXISTS는 기존 테이블에 컬럼을 추가하지 않는다.
    // 따라서 인덱스(특히 fp_fingerprint) 생성 전에 ensureQueryColumns로 컬럼을 먼저 보강해야 한다.
    await db.exec(`
        CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL,
            absolute_path TEXT NOT NULL UNIQUE,
            folder_path TEXT,
            title TEXT, artist TEXT, album TEXT, year INTEGER, genre TEXT, composer TEXT,
            album_artist TEXT, track INTEGER, comment TEXT, has_picture INTEGER,
            notes TEXT, lyrics TEXT, lyrics_status TEXT, version_note TEXT, tags TEXT,
            fmt_container TEXT, fmt_codec TEXT, fmt_bitrate REAL, fmt_sample_rate INTEGER,
            audio_duration_sec REAL,
            audio_bpm REAL, audio_bpm_confidence REAL, audio_beat_count INTEGER,
            audio_key TEXT, audio_scale TEXT, audio_key_strength REAL,
            audio_camelot_code TEXT,
            audio_dynamic_complexity REAL, audio_loudness_db REAL,
            fp_fingerprint TEXT, fp_duration REAL,
            analyzed_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS track_segments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
            bar_index INTEGER, start_sec REAL, end_sec REAL,
            beat_count INTEGER, bpm REAL,
            key TEXT, scale TEXT, key_strength REAL,
            loudness_db REAL
        );
        CREATE TABLE IF NOT EXISTS track_used_in (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
            work_title TEXT NOT NULL
        );
    `);

    await ensureQueryColumns(db);

    await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_segments_track ON track_segments(track_id);
        CREATE INDEX IF NOT EXISTS idx_used_in_track ON track_used_in(track_id);
        CREATE INDEX IF NOT EXISTS idx_tracks_bpm ON tracks(audio_bpm);
        CREATE INDEX IF NOT EXISTS idx_tracks_camelot ON tracks(audio_camelot_code);
        CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
        CREATE INDEX IF NOT EXISTS idx_tracks_fp_fingerprint ON tracks(fp_fingerprint);
        CREATE INDEX IF NOT EXISTS idx_tracks_lyrics_status ON tracks(lyrics_status);
    `);
}

async function insertTrack(db, r) {
    const { fileInfo, id3, musical, fingerprint, external } = r;
    const camelot = toCamelot(musical.overall.tonal.key, musical.overall.tonal.scale);
    const now = new Date().toISOString();
    // scanLevel=1에서만 가사를 실제로 조회한다. 0/-1은 조회 자체를 안 하므로 lyrics_status는 NULL.
    const lyricsSearched = (scanLevelArg ? parseInt(scanLevelArg, 10) : 0) === 1;
    const lyricsStatus = resolveLyricsStatus(external.lyrics, lyricsSearched);
    const tags = buildTrackTags({
        folder_path: fileInfo.folderPath,
        title: external.title || id3.title,
        artist: external.artist || id3.artist,
        album: external.album || id3.album,
        composer: external.composer || id3.composer,
        genre: external.genre || id3.genre,
    });

    // 세그먼트/usedIn까지 한 트랜잭션으로 묶어 디스크 fsync 횟수를 줄인다.
    await db.exec('BEGIN IMMEDIATE');
    try {
        const res = await db.run(
            `INSERT OR IGNORE INTO tracks (
                file_name, absolute_path, folder_path,
                title, artist, album, year, genre, composer, album_artist, track, comment, has_picture,
                notes, lyrics, lyrics_status, version_note, tags,
                fmt_container, fmt_codec, fmt_bitrate, fmt_sample_rate,
                audio_duration_sec, audio_bpm, audio_bpm_confidence, audio_beat_count,
                audio_key, audio_scale, audio_key_strength, audio_camelot_code,
                audio_dynamic_complexity, audio_loudness_db,
                fp_fingerprint, fp_duration,
                analyzed_at
            ) VALUES (?,?,?, ?,?,?,?,?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?, ?,?,?,?, ?,?,?,?, ?,?, ?,?, ?)`,
            [
                fileInfo.fileName, fileInfo.absolutePath, fileInfo.folderPath,
                // title/artist/album/year/genre/composer는 Analyze()가 이미 지문>ID3>웹검색 우선순위로
                // 병합해 넣은 external.*을 그대로 쓴다(로컬로 채워졌으면 external도 그 값을 그대로 담고 있음).
                external.title, external.artist, external.album, external.year, external.genre, external.composer,
                id3.albumArtist, id3.track, id3.comment, id3.hasPicture ? 1 : 0,
                external.notes, external.lyrics, lyricsStatus, external.versionNote, tags,
                id3.format.container, id3.format.codec, id3.format.bitrate, id3.format.sampleRate,
                musical.durationSec, musical.overall.rhythm.bpm, musical.overall.rhythm.confidence, musical.overall.rhythm.beatCount,
                musical.overall.tonal.key, musical.overall.tonal.scale, musical.overall.tonal.strength, camelot,
                musical.overall.loudness.dynamicComplexity, musical.overall.loudness.loudnessDb,
                fingerprint?.fingerprint ?? null, fingerprint?.duration ?? null,
                now,
            ]
        );
        if (!res.lastID) {
            await db.exec('COMMIT');
            return null; // 이미 있던 행(UNIQUE 충돌로 무시됨)
        }

        for (const seg of musical.segments) {
            await db.run(
                `INSERT INTO track_segments (track_id, bar_index, start_sec, end_sec, beat_count, bpm, key, scale, key_strength, loudness_db)
                 VALUES (?,?,?,?,?,?,?,?,?,?)`,
                [res.lastID, seg.barIndex, seg.startSec, seg.endSec, seg.beatCount, seg.bpm, seg.key, seg.scale, seg.keyStrength, seg.loudnessDb]
            );
        }
        for (const work of external.usedIn || []) {
            await db.run(`INSERT INTO track_used_in (track_id, work_title) VALUES (?, ?)`, [res.lastID, work]);
        }
        await db.exec('COMMIT');
        return res.lastID;
    } catch (e) {
        try { await db.exec('ROLLBACK'); } catch { /* ignore */ }
        throw e;
    }
}

// --analyze-one 자식 프로세스(비동기). 병렬 워커에서 동시 호출한다.
function runAnalyzeOne(filePath, cacheFile) {
    return new Promise((resolve, reject) => {
        const childArgs = [__filename, '--analyze-one', filePath, cacheFile];
        // scanLevelArg를 넘기려면 provider/model 자리도 채워야 한다(위치 인자) - 둘 다 생략됐으면 빈 문자열로 채운다.
        if (provider || scanLevelArg) childArgs.push(provider, model);
        if (scanLevelArg) childArgs.push(scanLevelArg);
        const child = spawn('node', childArgs, { stdio: ['ignore', 'inherit', 'inherit'] });
        child.on('error', reject);
        child.on('close', (code) => {
            if (code !== 0 || !fs.existsSync(cacheFile)) {
                reject(new Error(`자식 프로세스 실패(exit=${code})`));
            } else {
                resolve();
            }
        });
    });
}

// items를 concurrency개까지 동시에 worker에 넘긴다. 순서는 보장하지 않는다.
async function mapPool(items, concurrency, worker) {
    let next = 0;
    const n = Math.max(1, Math.min(concurrency, items.length || 1));
    await Promise.all(Array.from({ length: n }, async () => {
        while (true) {
            const i = next++;
            if (i >= items.length) break;
            await worker(items[i], i);
        }
    }));
}

// 하위 폴더까지 재귀적으로 오디오 파일을 찾는다(음악 라이브러리가 작품/앨범 폴더로 나뉘어 있음).
// dir 자리에 파일 경로 하나를 줘도 된다 - 오디오 파일이면 그 파일 하나만 담긴 배열을, 아니면 빈 배열을 돌려준다.
function walkAudioFiles(dir) {
    const stat = fs.statSync(dir);
    if (stat.isFile()) return AUDIO_EXT_RE.test(dir) ? [dir] : [];
    let results = [];
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const st = fs.statSync(full);
        if (st.isDirectory()) results = results.concat(walkAudioFiles(full));
        else if (AUDIO_EXT_RE.test(name)) results.push(full);
    }
    return results;
}

// db에서 이 폴더(하위 포함) 아래에 있던 트랙 중, 지금 디스크에서 더는 찾을 수 없는 것들을 제거한다.
// FK의 ON DELETE CASCADE는 스키마 선언일 뿐 이 연결에서 PRAGMA foreign_keys를 켜지 않아 자동 발동하지
// 않으므로, 자식 테이블(track_segments/track_used_in)을 먼저 수동으로 지운다.
async function pruneDeleted(db, folderAbs, currentPathSet) {
    const rows = await db.all('SELECT id, absolute_path FROM tracks');
    let pruned = 0;
    for (const row of rows) {
        if (!row.absolute_path.startsWith(folderAbs)) continue;
        if (currentPathSet.has(row.absolute_path)) continue;
        await db.run('DELETE FROM track_segments WHERE track_id = ?', [row.id]);
        await db.run('DELETE FROM track_used_in WHERE track_id = ?', [row.id]);
        await db.run('DELETE FROM tracks WHERE id = ?', [row.id]);
        console.log(`[prune] 삭제됨(파일 없음): ${row.absolute_path}`);
        pruned++;
    }
    return pruned;
}

async function main() {
    const concurrency = Math.max(1, parseInt(process.env.MUSIC_SCAN_CONCURRENCY || '3', 10) || 3);

    const db = await open({ filename: path.resolve(dbPath), driver: sqlite3.Database });
    // WAL: 읽기/쓰기 경합 완화. synchronous=NORMAL: 커밋 지연을 줄여 배치 적재 속도 개선.
    await db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;');
    await ensureSchema(db);

    const allFiles = walkAudioFiles(folder);
    const currentPathSet = new Set(allFiles.map(f => f.replace(/\\/g, '/')));

    // 단일 파일 대상이면 폴더 범위 prune은 의미가 없으므로(그 파일 하나만 스캔) 건너뛴다 - 이미
    // fs.statSync로 존재를 확인한 파일이라 prune 대상이 될 수도 없다.
    let prunedCount = 0;
    let existingPathSet;
    if (isSingleFileTarget) {
        const targetAbs = path.resolve(folder).replace(/\\/g, '/');
        const existingRow = await db.get('SELECT absolute_path FROM tracks WHERE absolute_path = ?', [targetAbs]);
        existingPathSet = new Set(existingRow ? [existingRow.absolute_path] : []);
    } else {
        // 하위 폴더까지 오탐 없이 걸러내려면 뒤에 구분자를 붙여서 접두어 비교해야 한다(예: ".../싸우지마" != ".../싸우지마2").
        const folderAbs = path.resolve(folder).replace(/\\/g, '/').replace(/\/$/, '') + '/';
        prunedCount = await pruneDeleted(db, folderAbs, currentPathSet);
        // db에 없는(새로 생긴) 파일만 분석 대상으로 삼는다 - limit은 이 신규 목록에 적용한다.
        const existingRows = await db.all('SELECT absolute_path FROM tracks WHERE absolute_path LIKE ?', [folderAbs + '%']);
        existingPathSet = new Set(existingRows.map(r => r.absolute_path));
    }
    const newFiles = allFiles.filter(f => !existingPathSet.has(f.replace(/\\/g, '/')));
    const files = newFiles.slice(0, limit);

    console.log(`대상: ${folder} | db: ${dbPath} | 전체 파일: ${allFiles.length}개 | 기존: ${existingPathSet.size}개 | 신규 처리 예정: ${files.length}개 | 삭제됨: ${prunedCount}개 | concurrency=${concurrency}${provider ? ` | provider=${provider} model=${model || '(기본)'}` : ''}${scanLevelArg ? ` | scanLevel=${scanLevelArg}` : ''}`);

    // 병렬 분석 중 DB write 경합을 막기 위한 직렬 큐.
    let dbChain = Promise.resolve();
    const withDb = (fn) => {
        const run = dbChain.then(fn, fn);
        // 이전 작업 실패가 큐를 멈추지 않게 한다.
        dbChain = run.catch(() => {});
        return run;
    };

    let ok = 0, failed = 0;
    let done = 0;
    await mapPool(files, concurrency, async (filePath, i) => {
        const fileName = path.basename(filePath);
        // 캐시 파일명이 하위 폴더별로 겹칠 수 있어(같은 파일명이 다른 폴더에 존재) 상대경로를 안전한 이름으로 변환해 키로 쓴다.
        // 단일 파일 대상이면 folder === filePath라 relative가 빈 문자열이 되므로 파일명을 그대로 쓴다.
        const relSafe = isSingleFileTarget ? fileName : path.relative(folder, filePath).replace(/\\/g, '/').replace(/[/\\]/g, '__');
        const cacheFile = path.join(cacheDir, relSafe + '.json');

        try {
            if (!fs.existsSync(cacheFile)) {
                console.log(`[${i + 1}/${files.length}] 분석 중: ${fileName}`);
                await runAnalyzeOne(filePath, cacheFile);
            } else {
                console.log(`[${i + 1}/${files.length}] 캐시 사용: ${fileName}`);
            }
            const result = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
            const trackId = await withDb(() => insertTrack(db, result));
            done++;
            ok++;
            console.log(`  -> [${done}/${files.length} 완료] track_id=${trackId} bpm=${result.musical.overall.rhythm.bpm?.toFixed(1)} key=${result.musical.overall.tonal.key} ${result.musical.overall.tonal.scale} ext.title=${result.external?.title}`);
        } catch (e) {
            done++;
            failed++;
            console.error(`  -> [${done}/${files.length} 완료] 실패: ${fileName} :: ${e.message}`);
        }
    });

    await dbChain.catch(() => {});
    await db.close();
    console.log(`\n완료. 신규 성공=${ok} 신규 실패=${failed} 기존 유지=${existingPathSet.size} 삭제됨=${prunedCount} concurrency=${concurrency}`);
}

main().catch(e => { console.error(e); process.exit(1); });

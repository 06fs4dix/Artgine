import { CForgeScene } from "./CForgeScene.js";
import { CForgeHistory } from "./CForgeHistory.js";
import { CForgeAdjust } from "./CForgeAdjust.js";
import { CForgeWallGen } from "./CForgeWallGen.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";
import { CForgeHouseGen } from "./CForgeHouseGen.js";
import { CForgePropGen } from "./CForgePropGen.js";
import { CForgeRand } from "./CForgeRand.js";
import { CForgePoly } from "./CForgePoly.js";
import { CForgeSpline } from "./CForgeSpline.js";
import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeTheme } from "./CForgeTheme.js";
import { CForgeChurchGen } from "./CForgeChurchGen.js";
import { CForgeMonumentGen } from "./CForgeMonumentGen.js";
import { CForgeBridgeGen } from "./CForgeBridgeGen.js";
export class CForgeGeoTest {
    static sThemes = [...CForgeTheme.sList.keys()];
    static Star(_R, _n, _c, _r0, _r1) {
        const ang = [];
        for (let i = 0; i < _n; i++)
            ang.push(_R.Range(0, Math.PI * 2));
        ang.sort((_a, _b) => _a - _b);
        return ang.map(_a => { const r = _R.Range(_r0, _r1); return [_c[0] + Math.cos(_a) * r, _c[1] + Math.sin(_a) * r]; });
    }
    static Rect(_R, _c) {
        const w = _R.Range(1, 8), d = _R.Range(1, 8), a = _R.Range(0, Math.PI);
        const cs = Math.cos(a), sn = Math.sin(a);
        return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [_c[0] + x * w * 0.5 * cs - z * d * 0.5 * sn, _c[1] + x * w * 0.5 * sn + z * d * 0.5 * cs]);
    }
    static sFail = [];
    static Run(_seed = 1, _count = 300) {
        CForgeGeoTest.sFail = [];
        const R = new CForgeRand(_seed), lines = [], t0 = performance.now();
        const Report = (_name, _fail, _total, _extra = "") => lines.push(`${_fail == 0 ? "✔" : "✘"} ${_name}: ${_total - _fail}/${_total}${_extra}`);
        {
            let fail = 0;
            for (let k = 0; k < _count; k++) {
                let p = CForgeGeoTest.Star(R, R.Int(3, 30), [0, 0], 0.3, 6);
                if (R.Chance(0.3)) {
                    const i = R.Int(0, p.length - 1), j = (i + 1) % p.length;
                    p.splice(i + 1, 0, [(p[i][0] + p[j][0]) / 2, (p[i][1] + p[j][1]) / 2]);
                }
                if (R.Chance(0.5))
                    p = p.reverse();
                if (!CForgePoly.IsSimple(p)) {
                    k--;
                    continue;
                }
                const tri = CForgePoly.Triangulate(p);
                let sum = 0, neg = 0;
                for (let t = 0; t < tri.length; t += 3) {
                    const a = CForgePoly.Cross(p[tri[t]], p[tri[t + 1]], p[tri[t + 2]]) * 0.5;
                    if (a < 0)
                        neg++;
                    sum += a;
                }
                if (neg > 0 || Math.abs(sum - Math.abs(CForgePoly.Area(p))) > 1e-6 * Math.max(1, Math.abs(CForgePoly.Area(p)))) {
                    fail++;
                    CForgeGeoTest.sFail.push({ test: "tri", poly: p, tri, sum, area: CForgePoly.Area(p), neg, simple: CForgePoly.IsSimple(p) });
                }
            }
            Report("삼각분할 넓이 일치", fail, _count);
        }
        {
            let fail = 0;
            for (let k = 0; k < _count; k++) {
                const p = CForgeGeoTest.Star(R, R.Int(3, 24), [0, 0], 2, 6);
                const out = CForgePoly.Offset(p, R.Range(0.05, 0.8));
                if (!(Math.abs(CForgePoly.Area(out)) > Math.abs(CForgePoly.Area(p))))
                    fail++;
            }
            Report("바깥 오프셋 넓이 증가", fail, _count);
            fail = 0;
            for (let k = 0; k < _count; k++) {
                const p = CForgePoly.ConvexHull(CForgeGeoTest.Star(R, R.Int(3, 24), [0, 0], 3, 6));
                if (p.length < 3)
                    continue;
                const d = R.Range(0.05, 0.6), inn = CForgePoly.Offset(p, -d);
                if (inn.length == 0 && 2 * Math.abs(CForgePoly.Area(p)) / CForgePoly.Perimeter(p) < 2 * d)
                    continue;
                if (!CForgePoly.IsSimple(inn) || !(Math.abs(CForgePoly.Area(inn)) < Math.abs(CForgePoly.Area(p)))) {
                    fail++;
                    CForgeGeoTest.sFail.push({ test: "inset", poly: p, out: inn });
                }
            }
            Report("안쪽 오프셋(볼록) 단순·넓이 감소", fail, _count);
        }
        {
            let fail = 0, worst = 0;
            for (let k = 0; k < _count; k++) {
                const a = R.Chance(0.5) ? CForgeGeoTest.Rect(R, [0, 0]) : CForgePoly.ConvexHull(CForgeGeoTest.Star(R, R.Int(3, 12), [0, 0], 1, 4));
                const b = R.Chance(0.5) ? CForgeGeoTest.Rect(R, [R.Range(-4, 4), R.Range(-4, 4)]) : CForgePoly.ConvexHull(CForgeGeoTest.Star(R, R.Int(3, 12), [R.Range(-4, 4), R.Range(-4, 4)], 1, 4));
                let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
                for (const q of [...a, ...b]) {
                    x0 = Math.min(x0, q[0]);
                    x1 = Math.max(x1, q[0]);
                    z0 = Math.min(z0, q[1]);
                    z1 = Math.max(z1, q[1]);
                }
                const G = 70;
                let hit = 0, both = 0;
                for (let j = 0; j < G; j++)
                    for (let i = 0; i < G; i++) {
                        const x = x0 + (x1 - x0) * (i + 0.5) / G, z = z0 + (z1 - z0) * (j + 0.5) / G;
                        const ia = CForgePoly.InPoly(x, z, a), ib = CForgePoly.InPoly(x, z, b);
                        if (ia || ib)
                            hit++;
                        if (ia && ib)
                            both++;
                    }
                const box = (x1 - x0) * (z1 - z0), est = hit / (G * G) * box;
                const u = CForgePoly.Union(a, b);
                if (u == null) {
                    if (both > 0)
                        fail++;
                    continue;
                }
                const err = Math.abs(Math.abs(CForgePoly.Area(u)) - est) / box;
                worst = Math.max(worst, err);
                if (err > 0.03 || !CForgePoly.IsSimple(u))
                    fail++;
            }
            Report("합집합 넓이(격자 대조)·단순", fail, _count, ` · 최대 오차 ${(worst * 100).toFixed(2)}%`);
        }
        {
            let fail = 0;
            for (let k = 0; k < _count; k++) {
                const n = R.Int(2, 10), pts = [];
                for (let i = 0; i < n; i++)
                    pts.push([R.Range(-20, 20), R.Range(-20, 20), R.Range(1, 6)]);
                if (n >= 3 && R.Chance(0.3))
                    pts.push(pts[0].slice());
                const step = R.Range(0.3, 1.5), s = CForgeSpline.Sample(pts, step);
                let bad = s.some(_q => _q.some(_v => !Number.isFinite(_v)));
                for (let i = 1; i < s.length && !bad; i++) {
                    const d = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
                    if (d > step * 1.6)
                        bad = true;
                }
                for (const c of pts) {
                    let m = Infinity;
                    for (const q of s)
                        m = Math.min(m, Math.hypot(q[0] - c[0], q[1] - c[1]));
                    if (m > step * 0.8)
                        bad = true;
                }
                if (CForgeSpline.IsClosed(pts) && !CForgeSpline.IsClosed(s))
                    bad = true;
                if (bad)
                    fail++;
            }
            Report("스플라인 간격·제어점 통과", fail, _count);
        }
        {
            let fail = 0, verts = 0;
            const ground = (_x, _z) => Math.sin(_x * 0.3) * 0.5 + Math.cos(_z * 0.2) * 0.4;
            for (let k = 0; k < _count; k++) {
                const b = new CForgeMeshBuf();
                const n = R.Int(2, 8), pts = [];
                for (let i = 0; i < n; i++)
                    pts.push([R.Range(-20, 20), R.Range(-20, 20), R.Range(0.5, 8)]);
                if (R.Chance(0.3) && n >= 3)
                    pts.push(pts[0].slice());
                CForgeShape.Wall(b, CForgeSpline.Sample(pts, 0.5), R.Range(0.2, 1.5), ground);
                const poly = CForgeGeoTest.Star(R, R.Int(3, 16), [0, 0], 2, 7);
                CForgeShape.Extrude(b, poly, _q => ground(_q[0], _q[1]), 5);
                CForgeShape.Pyramid(b, poly, 5, 3);
                CForgeShape.Prism(b, 0, 0, 2, 1.8, 0, 9, R.Int(6, 24));
                CForgeShape.Cone(b, 0, 0, 2.4, 9, 4, 16);
                const v = b.Validate();
                verts += b.Count();
                if (v.nan > 0 || v.badIdx > 0 || v.degenerate > 0)
                    fail++;
            }
            Report("메시 NaN·인덱스·퇴화 없음", fail, _count, ` · 평균 정점 ${Math.round(verts / _count)}`);
        }
        {
            let fail = 0, gates = 0, verts = 0;
            const ground = (_x, _z) => Math.sin(_x * 0.3) * 0.5 + Math.cos(_z * 0.2) * 0.4;
            for (let k = 0; k < _count; k++) {
                const sc = new CForgeScene(k + 1), h = new CForgeHistory(sc);
                const n = R.Int(2, 7), pts = [];
                for (let i = 0; i < n; i++)
                    pts.push([R.Range(-25, 25), R.Range(-25, 25), R.Range(1, 11)]);
                if (n >= 3 && R.Chance(0.4))
                    pts.push(pts[0].slice());
                const w = h.Push(CForgeScene.eKind.Wall, { id: 0, seed: 0, pts, thick: R.Range(0.4, 1.6), style: 0 });
                for (let p = R.Int(0, 3); p > 0; p--)
                    h.Push(CForgeScene.eKind.Path, { id: 0, seed: 0, pts: [[R.Range(-30, 30), R.Range(-30, 30)], [R.Range(-30, 30), R.Range(-30, 30)]], width: R.Range(1, 3.5) });
                const r = CForgeAdjust.Wall(w, sc);
                r.theme = CForgeGeoTest.sThemes[k % CForgeGeoTest.sThemes.length];
                gates += r.gates.length;
                for (const part of CForgeWallGen.Build(r, ground)) {
                    const v = part.buf.Validate();
                    verts += part.buf.Count();
                    if (v.nan > 0 || v.badIdx > 0 || v.degenerate > 0) {
                        fail++;
                        CForgeGeoTest.sFail.push({ test: "wallgen", pts, v });
                        break;
                    }
                }
            }
            Report("벽 생성기 메시 무결성", fail, _count, ` · 문 ${gates}개 · 평균 정점 ${Math.round(verts / _count)}`);
        }
        {
            let fail = 0, verts = 0;
            const ground = (_x, _z) => Math.sin(_x * 0.3) * 0.5 + Math.cos(_z * 0.2) * 0.4;
            for (let k = 0; k < _count; k++) {
                const sc = new CForgeScene(k + 7), h = new CForgeHistory(sc);
                const c = [R.Range(-5, 5), R.Range(-5, 5)];
                for (let w = R.Int(0, 3); w > 0; w--) {
                    const a = R.Range(0, Math.PI * 2);
                    h.Push(CForgeScene.eKind.Wall, { id: 0, seed: 0, pts: [[c[0], c[1], R.Range(1, 11)], [c[0] + Math.cos(a) * 15, c[1] + Math.sin(a) * 15, R.Range(1, 11)]], thick: R.Range(0.4, 1.6), style: 0 });
                }
                if (R.Chance(0.5))
                    h.Push(CForgeScene.eKind.Path, { id: 0, seed: 0, pts: [[c[0] - 10, c[1] + R.Range(-6, 6)], [c[0] + 10, c[1] + R.Range(-6, 6)]], width: 2 });
                const t = h.Push(CForgeScene.eKind.Tower, { id: 0, seed: 0, c, r: R.Range(0.8, 6), height: R.Range(2, 25), roof: R.Pick([0, 3, 4]), roofH: R.Range(0, 6), shape: R.Int(0, 1) });
                const tr = CForgeAdjust.Tower(t, sc);
                tr.theme = CForgeGeoTest.sThemes[k % CForgeGeoTest.sThemes.length];
                for (const part of CForgeTowerGen.Build(tr, ground)) {
                    const v = part.buf.Validate();
                    verts += part.buf.Count();
                    if (v.nan > 0 || v.badIdx > 0 || v.degenerate > 0) {
                        fail++;
                        CForgeGeoTest.sFail.push({ test: "towergen", t, v });
                        break;
                    }
                }
            }
            Report("탑 생성기 메시 무결성", fail, _count, ` · 평균 정점 ${Math.round(verts / _count)}`);
        }
        {
            let fail = 0, verts = 0, rectRoof = 0;
            const ground = (_x, _z) => Math.sin(_x * 0.3) * 0.5 + Math.cos(_z * 0.2) * 0.4;
            for (let k = 0; k < _count; k++) {
                const sc = new CForgeScene(k + 11), h = new CForgeHistory(sc), a = R.Range(0, Math.PI);
                let poly;
                const kind = R.Int(0, 3);
                if (kind == 0)
                    poly = CForgeGeoTest.Rect(R, [0, 0]);
                else if (kind == 1) {
                    const w = R.Range(4, 10), d = R.Range(4, 10), cw = R.Range(1.5, w - 1.5), cd = R.Range(1.5, d - 1.5);
                    const L = [[0, 0], [w, 0], [w, cd], [cw, cd], [cw, d], [0, d]];
                    poly = L.map(([x, z]) => [x * Math.cos(a) - z * Math.sin(a) + R.Range(-0.3, 0.3), x * Math.sin(a) + z * Math.cos(a) + R.Range(-0.3, 0.3)]);
                }
                else if (kind == 2)
                    poly = CForgePoly.ConvexHull(CForgeGeoTest.Star(R, R.Int(4, 9), [0, 0], 2, 6));
                else
                    poly = CForgeGeoTest.Star(R, R.Int(4, 10), [0, 0], 2, 7);
                if (R.Chance(0.3))
                    h.Push(CForgeScene.eKind.Wall, { id: 0, seed: 0, pts: [[R.Range(-8, -4), R.Range(-3, 3), 5], [R.Range(4, 8), R.Range(-3, 3), 5]], thick: 1, style: 0 });
                if (R.Chance(0.3))
                    h.Push(CForgeScene.eKind.Building, { id: 0, seed: 0, poly: CForgeGeoTest.Rect(R, [R.Range(-4, 4), R.Range(-4, 4)]), height: 4, roof: 0, roofH: 0, glue: [] });
                if (R.Chance(0.5))
                    h.Push(CForgeScene.eKind.Path, { id: 0, seed: 0, pts: [[-12, R.Range(-9, 9)], [12, R.Range(-9, 9)]], width: 2 });
                const b = h.Push(CForgeScene.eKind.Building, { id: 0, seed: 0, poly, height: R.Range(2, 12), roof: R.Pick([0, 1, 2]), roofH: R.Range(0, 4), glue: [] });
                const r = CForgeAdjust.Building(b, sc);
                r.theme = CForgeGeoTest.sThemes[k % CForgeGeoTest.sThemes.length];
                if (r.rects != null)
                    rectRoof++;
                for (const part of CForgeHouseGen.Build(r, ground)) {
                    const v = part.buf.Validate();
                    verts += part.buf.Count();
                    if (v.nan > 0 || v.badIdx > 0 || v.degenerate > 0) {
                        fail++;
                        CForgeGeoTest.sFail.push({ test: "housegen", poly, v });
                        break;
                    }
                }
            }
            Report("건물 생성기 메시 무결성", fail, _count, ` · 사각형 분해 지붕 ${rectRoof}개 · 평균 정점 ${Math.round(verts / _count)}`);
        }
        {
            let fail = 0, verts = 0;
            const ground = (_x, _z) => Math.sin(_x * 0.3) * 0.5 + Math.cos(_z * 0.2) * 0.4;
            for (let k = 0; k < _count; k++) {
                const theme = CForgeGeoTest.sThemes[k % CForgeGeoTest.sThemes.length], a = R.Range(0, Math.PI * 2), L = R.Range(10, 26);
                const ch = { id: k, seed: k, theme, o: [R.Range(-5, 5), R.Range(-5, 5)], u: [Math.cos(a), Math.sin(a)], L, W: Math.min(12, Math.max(6, L * R.Range(0.35, 0.6))), fs: R.Chance(0.5) ? 1 : -1 };
                const mo = { id: k, seed: k, theme, c: [R.Range(-5, 5), R.Range(-5, 5)], size: R.Range(0.8, 4), floors: R.Chance(0.5) ? 3 : 5, ang: R.Range(0, Math.PI * 2) };
                const br = { id: k, seed: k, theme, pts: [[R.Range(-20, 0), R.Range(-10, 10)], [R.Range(0, 20), R.Range(-10, 10)]], width: R.Range(1.2, 4), style: R.Pick([0, 1, 2]) };
                for (const part of [...CForgeChurchGen.Build(ch, ground), ...CForgeMonumentGen.Build(mo, ground), ...CForgeBridgeGen.Bridge(br, ground)]) {
                    const v = part.buf.Validate();
                    verts += part.buf.Count();
                    if (v.nan > 0 || v.badIdx > 0 || v.degenerate > 0) {
                        fail++;
                        CForgeGeoTest.sFail.push({ test: "church·monument·bridge", theme, v });
                        break;
                    }
                }
            }
            Report("교회·조형물·다리 생성기 메시 무결성", fail, _count, ` · 평균 정점 ${Math.round(verts / _count)}`);
        }
        {
            let fail = 0;
            const ground = (_x, _z) => Math.sin(_x * 0.3) * 0.5 + Math.cos(_z * 0.2) * 0.4;
            for (let k = 0; k < _count; k++) {
                const pts = [];
                for (let i = R.Int(2, 6); i > 0; i--)
                    pts.push([R.Range(-20, 20), R.Range(-20, 20)]);
                const line = { id: k + 1, seed: k + 1, pts, width: R.Range(0.8, 3.5), theme: CForgeGeoTest.sThemes[k % CForgeGeoTest.sThemes.length] };
                for (const part of [...CForgePropGen.Path(line, ground), ...CForgePropGen.Fence(line, ground)]) {
                    const v = part.buf.Validate();
                    if (v.nan > 0 || v.badIdx > 0 || v.degenerate > 0) {
                        fail++;
                        break;
                    }
                }
            }
            Report("길·울타리 생성기 메시 무결성", fail, _count);
        }
        lines.push(`시간 ${(performance.now() - t0).toFixed(0)}ms (시드 ${_seed}, 항목당 ${_count}회)`);
        return lines.join("<br>");
    }
}

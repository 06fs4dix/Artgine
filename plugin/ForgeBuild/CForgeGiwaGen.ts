import { CForgeMeshBuf } from "./CForgeMeshBuf.js";
import { CForgeShape } from "./CForgeShape.js";
import { CForgeTowerGen } from "./CForgeTowerGen.js";

//e : 처마 내밈, lift : 추녀 들림(모서리 처마가 가운데보다 높은 양), bulge : 안허리(모서리 처마가 평면에서 더 나가는 양),
//sg : 1이면 우진각, 미만이면 팔작(경사 높이 비율 sg까지 네 면이 모이고 그 위는 앞뒤 두 면 + 양끝 합각벽),
//prof : 경사 곡선 지수(1보다 크면 처마 쪽이 완만한 오목 곡선, 작으면 둥근 볼록), T : 지붕 두께, tile : 기와 마루(아니면 둥근 짚 용마루), nu·ns : 면 분할,
//endH : 용마루 양끝 장식 높이(중국 치문은 높다)
export interface IForgeGiwaOpt { e : number; lift : number; bulge : number; sg : number; prof : number; T : number; tile : boolean; nu : number; ns : number; endH? : number; }
export interface IForgeGiwaBuf { roof : CForgeMeshBuf; under : CForgeMeshBuf; edge : CForgeMeshBuf; ridge : CForgeMeshBuf; mortar : CForgeMeshBuf; gable : CForgeMeshBuf; }
//맞배: e : 처마 내밈, ev : 박공 쪽 내밈, T : 두께, prof : 경사 곡선 지수(1보다 크면 처마 쪽이 완만), ns : 경사 분할, wall : 박공벽 아랫선 높이(null이면 박공벽 없음)
export interface IForgeGableOpt { e : number; ev : number; T : number; prof : number; ns : number; wall : number; }

//동아시아 곡선 지붕. 로컬 축 a(용마루 방향)·b(가로)의 사각형 [a0,a1]×[b0,b1] 위에 올린다. W(a, b, y)는 로컬 → 월드.
//앞뒤 면(Side)과 양끝 면(Hip)을 같은 매개변수(처마 s=0 → 용마루 s=1)로 만들어 모서리(추녀) 선이 정확히 맞물린다
export class CForgeGiwaGen
{
    static Roof(B : IForgeGiwaBuf, W : (_a : number, _b : number, _y : number) => number[], a0 : number, a1 : number, b0 : number, b1 : number, ye : number, yr : number, o : IForgeGiwaOpt)
    {
        const ac = (a0 + a1) * 0.5, bc = (b0 + b1) * 0.5, HA = (a1 - a0) * 0.5 + o.e, HB = (b1 - b0) * 0.5 + o.e;
        const RA = Math.max(HA - HB * o.sg, HA * 0.12), Lc = o.lift, Bc = o.bulge, sg = Math.min(1, o.sg), Ls = Math.hypot(HB, yr - ye);
        const Y = (_s : number, _lift : number) => ye + _lift * (1 - _s) * (1 - _s) + (yr - ye) * Math.pow(_s, o.prof);
        const C = (_t : number) => Math.abs(_t * _t * _t);
        const Side = (_sb : number, _u : number, _s : number) =>
        {
            const c = C(_u), ae = _u * HA + Math.sign(_u) * Bc * c, be = _sb * (HB + Bc * c), f = Math.min(1, _s / sg);
            return [ae + (_u * RA - ae) * f, be * (1 - _s), Y(_s, Lc * c)];
        };
        const Hip = (_sa : number, _v : number, _s : number) =>
        {
            const c = C(_v), ae = _sa * (HA + Bc * c), be = _v * HB + Math.sign(_v) * Bc * c, f = Math.min(1, _s / sg);
            return [ae + (_sa * RA - ae) * f, be * (1 - _s), Y(_s, Lc * c)];
        };
        const P = (_q : number[]) => W(ac + _q[0], bc + _q[1], _q[2]);
        const O = P([0, 0, ye]);

        //F(i, j) → 로컬 점, i : 처마 방향, j : 경사 방향. 윗면(법선 위) + 아랫면(두께만큼 아래, 법선 아래) + 처마 끝면
        const Grid = (F : (_i : number, _j : number) => number[], ni : number, nj : number, U : (_q : number[]) => number) =>
        {
            const G : number[][][] = [];
            for(let i = 0; i <= ni; i++) { G.push([]); for(let j = 0; j <= nj; j++) G[i].push(F(i, j)); }
            const Wp = G.map(_r => _r.map(P));
            for(const under of [false, true])
            {
                if(under && (B.under == null || o.T <= 0)) continue;
                const buf = under ? B.under : B.roof, base = buf.Count(), sy = under ? -1 : 1;
                for(let i = 0; i <= ni; i++)
                    for(let j = 0; j <= nj; j++)
                    {
                        //모임면 꼭대기처럼 한 점으로 모인 줄은 가로 이웃이 같은 점이라 법선이 0이 된다(검게 나온다). 그때는 한 줄 아래 가로 방향을 쓴다
                        const p = Wp[i][j], pj0 = Wp[i][Math.max(0, j - 1)], pj1 = Wp[i][Math.min(nj, j + 1)];
                        let jr = j, pi0 = Wp[Math.max(0, i - 1)][j], pi1 = Wp[Math.min(ni, i + 1)][j];
                        while(jr > 0 && Math.hypot(pi1[0] - pi0[0], pi1[2] - pi0[2]) < 1e-4) { jr--; pi0 = Wp[Math.max(0, i - 1)][jr]; pi1 = Wp[Math.min(ni, i + 1)][jr]; }
                        const ax = pi1[0] - pi0[0], ay = pi1[1] - pi0[1], az = pi1[2] - pi0[2], bx = pj1[0] - pj0[0], by = pj1[1] - pj0[1], bz = pj1[2] - pj0[2];
                        let n = [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
                        if(n[1] < 0) n = n.map(_v => -_v);
                        buf.Vert(p[0], p[1] - (under ? o.T : 0), p[2], U(G[i][j]), j / nj * Ls, n[0] * sy, n[1] * sy, n[2] * sy);
                    }
                for(let i = 0; i < ni; i++)
                    for(let j = 0; j < nj; j++)
                    {
                        const k = base + i * (nj + 1) + j, p0 = Wp[i][j], p1 = Wp[i + 1][j], p2 = Wp[i][j + 1];
                        let n = [(p1[1] - p0[1]) * (p2[2] - p0[2]) - (p1[2] - p0[2]) * (p2[1] - p0[1]), (p1[2] - p0[2]) * (p2[0] - p0[0]) - (p1[0] - p0[0]) * (p2[2] - p0[2]), (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0])];
                        if(n[1] < 0) n = n.map(_v => -_v);
                        //한 점으로 모인 줄에 닿은 사각형은 삼각형 하나가 퇴화하므로 넓이가 있는 것만 넣는다
                        const Area = (_a : number[], _b : number[], _c : number[]) => { const ux = _b[0] - _a[0], uy = _b[1] - _a[1], uz = _b[2] - _a[2], vx = _c[0] - _a[0], vy = _c[1] - _a[1], vz = _c[2] - _a[2]; return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx); };
                        const q11 = Wp[i + 1][j + 1], hx = n[0] * sy, hy = n[1] * sy + (n[1] == 0 ? sy : 0), hz = n[2] * sy;
                        if(Area(p0, p1, q11) > 1e-6) buf.Tri(k, k + nj + 1, k + nj + 2, hx, hy, hz);
                        if(Area(p0, q11, p2) > 1e-6) buf.Tri(k, k + nj + 2, k + 1, hx, hy, hz);
                    }
            }
            if(o.T > 0)
                for(let i = 0; i < ni; i++)
                {
                    const p = Wp[i][0], q = Wp[i + 1][0], dx = q[0] - p[0], dz = q[2] - p[2];
                    let n = [dz, 0, -dx];
                    if(n[0] * ((p[0] + q[0]) * 0.5 - O[0]) + n[2] * ((p[2] + q[2]) * 0.5 - O[2]) < 0) n = [-dz, 0, dx];
                    if(Math.hypot(dx, dz) > 1e-4) B.edge.Quad([p, q, [q[0], q[1] - o.T, q[2]], [p[0], p[1] - o.T, p[2]]], null, n);
                }
        };
        const nu = o.nu, ns = o.ns, nv = Math.max(2, Math.round(nu * HB / HA)), nh = Math.max(1, Math.round(ns * sg));
        for(const sb of [-1, 1]) Grid((_i, _j) => Side(sb, _i / nu * 2 - 1, _j / ns), nu, ns, _q => _q[0] + 64);
        for(const sa of [-1, 1]) Grid((_i, _j) => Hip(sa, _i / nv * 2 - 1, _j / nh * sg), nv, nh, _q => _q[1] + 64);

        //합각벽: 양끝 a = ±RA 연직면. 위 두 면의 끝 선과 아래 모임면의 윗선을 따라 닫는다(중심에서 부채꼴)
        if(sg < 0.999)
            for(const sa of [-1, 1])
            {
                const loop : number[][] = [], m = Math.max(2, ns - nh);
                for(let k = 0; k <= m; k++) loop.push(Side(-1, sa, sg + (1 - sg) * k / m));
                for(let k = m; k >= 0; k--) loop.push(Side(1, sa, sg + (1 - sg) * k / m));
                for(let k = nv - 1; k >= 1; k--) loop.push(Hip(sa, k / nv * 2 - 1, sg));
                const d = P([sa, 0, ye]), n = [d[0] - O[0], 0, d[2] - O[2]], base = B.gable.Count(), cy = (Y(sg, 0) + yr) * 0.5;
                const cw = P([sa * RA, 0, cy]);
                B.gable.Vert(cw[0], cw[1], cw[2], 0, cy, n[0], 0, n[2]);
                for(const q of loop) { const w = P(q); B.gable.Vert(w[0], w[1], w[2], q[1], q[2], n[0], 0, n[2]); }
                for(let k = 0; k < loop.length; k++) B.gable.Tri(base, base + 1 + k, base + 1 + (k + 1) % loop.length, n[0], 0, n[2]);
            }

        //용마루(아래 흰 회 띠 + 위 기와 마루 + 양끝 망와) 또는 둥근 짚 용마루. 기와면 추녀마루·내림마루도 얹는다
        const r0 = P([-RA - (o.tile ? 0.2 : 0), 0, 0]), r1 = P([RA + (o.tile ? 0.2 : 0), 0, 0]), rx = r1[0] - r0[0], rz = r1[2] - r0[2], ang = Math.atan2(rz, rx), len = Math.hypot(rx, rz);
        const mx = (r0[0] + r1[0]) * 0.5, mz = (r0[2] + r1[2]) * 0.5;
        //짚 지붕은 둥근 면이 그대로 용마루가 된다(따로 얹지 않는다)
        if(!o.tile) return;
        CForgeShape.Box(B.mortar, mx, mz, len, 0.5, yr - 0.15, yr + 0.1, ang);
        CForgeShape.Box(B.ridge, mx, mz, len + 0.1, 0.42, yr + 0.1, yr + 0.38, ang);
        for(const sa of [-1, 1])
        {
            const q = P([sa * (RA + 0.2), 0, 0]);
            const eh = o.endH ?? 0.52;
            CForgeShape.Box(B.ridge, q[0], q[2], 0.32, Math.max(0.5, eh * 0.75), yr + 0.1, yr + 0.1 + eh, ang);
        }
        const Lift = (_q : number[], _d : number) => { const w = P(_q); return [w[0], w[1] + _d, w[2]]; };
        for(const sa of [-1, 1])
            for(const sb of [-1, 1])
            {
                const n = Math.max(3, nh);
                for(let k = 0; k < n; k++) CForgeTowerGen.Strut(B.ridge, Lift(Side(sb, sa, 0.03 + (sg - 0.03) * k / n), 0.1), Lift(Side(sb, sa, 0.03 + (sg - 0.03) * (k + 1) / n), 0.1), 0.26);
                if(sg >= 0.999) continue;
                const m = Math.max(2, ns - nh);
                for(let k = 0; k < m; k++) CForgeTowerGen.Strut(B.ridge, Lift(Side(sb, sa, sg + (1 - sg) * k / m), 0.08), Lift(Side(sb, sa, sg + (1 - sg) * (k + 1) / m), 0.08), 0.22);
            }
    }

    //맞배 기와지붕(일본 마치야·문 지붕 등). 로컬 축 a(용마루)·b, 앞뒤 두 면 + 처마·박공 끝면 + 박공 판(under 부위) + 박공벽(gable 부위) + 용마루·양끝 귀면
    static Gable(B : IForgeGiwaBuf, W : (_a : number, _b : number, _y : number) => number[], a0 : number, a1 : number, b0 : number, b1 : number, ye : number, yr : number, o : IForgeGableOpt)
    {
        const ac = (a0 + a1) * 0.5, bc = (b0 + b1) * 0.5, ha = (a1 - a0) * 0.5, hb = (b1 - b0) * 0.5, HA = ha + o.ev, HB = hb + o.e, ns = Math.max(1, o.ns);
        const Y = (_s : number) => ye + (yr - ye) * Math.pow(_s, o.prof), dY = (_s : number) => (yr - ye) * o.prof * Math.pow(Math.max(_s, 1e-3), o.prof - 1);
        const P = (_a : number, _b : number, _y : number) => W(ac + _a, bc + _b, _y);
        const o0 = P(0, 0, 0), pa = P(1, 0, 0), pb = P(0, 1, 0), ax = pa[0] - o0[0], az = pa[2] - o0[2], bx = pb[0] - o0[0], bz = pb[2] - o0[2];
        const Ls = Math.hypot(HB, yr - ye);
        for(const sb of [-1, 1])
        {
            for(const under of [false, true])
            {
                const buf = under ? B.under : B.roof;
                if(under && (buf == null || o.T <= 0)) continue;
                const base = buf.Count(), sy = under ? -1 : 1;
                for(const sa of [-1, 1])
                    for(let j = 0; j <= ns; j++)
                    {
                        const s = j / ns, p = P(sa * HA, sb * HB * (1 - s), Y(s) - (under ? o.T : 0)), nb = sb * dY(s);
                        buf.Vert(p[0], p[1], p[2], sa * HA + 64, s * Ls, (bx * nb) * sy, HB * sy, (bz * nb) * sy);
                    }
                for(let j = 0; j < ns; j++)
                {
                    const nb = sb * dY((j + 0.5) / ns);
                    buf.QuadIdx(base + j, base + ns + 1 + j, base + ns + 2 + j, base + j + 1, bx * nb * sy, HB * sy, bz * nb * sy);
                }
            }
            if(o.T <= 0) continue;
            const e0 = P(-HA, sb * HB, ye), e1 = P(HA, sb * HB, ye);
            B.edge.Quad([e0, e1, [e1[0], e1[1] - o.T, e1[2]], [e0[0], e0[1] - o.T, e0[2]]], null, [bx * sb, 0, bz * sb]);
            for(const sa of [-1, 1])
                for(let j = 0; j < ns; j++)
                {
                    const s0 = j / ns, s1 = (j + 1) / ns, q0 = P(sa * HA, sb * HB * (1 - s0), 0), q1 = P(sa * HA, sb * HB * (1 - s1), 0);
                    B.edge.Quad([[q0[0], Y(s0), q0[2]], [q1[0], Y(s1), q1[2]], [q1[0], Y(s1) - o.T, q1[2]], [q0[0], Y(s0) - o.T, q0[2]]], null, [ax * sa, 0, az * sa]);
                    if(B.under != null)
                    {
                        const r0 = P(sa * (HA - 0.03), sb * HB * (1 - s0), 0), r1 = P(sa * (HA - 0.03), sb * HB * (1 - s1), 0), d = o.T + 0.22;
                        B.under.Quad([[r0[0], Y(s0) - o.T, r0[2]], [r1[0], Y(s1) - o.T, r1[2]], [r1[0], Y(s1) - d, r1[2]], [r0[0], Y(s0) - d, r0[2]]], null, [ax * sa, 0, az * sa]);
                    }
                }
        }
        //박공벽: 벽 끝(a = ±ha) 연직면. 아랫선 중앙에서 부채꼴로 지붕 밑면까지
        if(o.wall != null)
            for(const sa of [-1, 1])
            {
                const m = Math.max(2, ns) * 2, nx = ax * sa, nz = az * sa, base = B.gable.Count(), c = P(sa * ha, 0, o.wall);
                B.gable.Vert(c[0], c[1], c[2], 0, o.wall, nx, 0, nz);
                const pts : number[][] = [[hb, o.wall]];
                for(let k = 0; k <= m; k++) { const b = hb * (1 - 2 * k / m), s = Math.max(0, 1 - Math.abs(b) / HB); pts.push([b, Math.max(o.wall, Y(s) - o.T)]); }
                pts.push([-hb, o.wall]);
                for(const [b, y] of pts) { const w = P(sa * ha, b, y); B.gable.Vert(w[0], w[1], w[2], b, y, nx, 0, nz); }
                for(let k = 0; k + 1 < pts.length; k++) B.gable.Tri(base, base + 1 + k, base + 2 + k, nx, 0, nz);
            }
        const r0 = P(-HA - 0.1, 0, 0), r1 = P(HA + 0.1, 0, 0), ang = Math.atan2(r1[2] - r0[2], r1[0] - r0[0]), len = Math.hypot(r1[0] - r0[0], r1[2] - r0[2]), mid = P(0, 0, 0);
        CForgeShape.Box(B.mortar, mid[0], mid[2], len, 0.36, yr - 0.12, yr + 0.06, ang);
        CForgeShape.Box(B.ridge, mid[0], mid[2], len + 0.06, 0.3, yr + 0.06, yr + 0.28, ang);
        for(const sa of [-1, 1])
        {
            const q = P(sa * (HA + 0.08), 0, 0);
            CForgeShape.Box(B.ridge, q[0], q[2], 0.22, 0.5, yr + 0.02, yr + Math.min(0.55, 0.22 + hb * 0.1), ang);
        }
    }
}

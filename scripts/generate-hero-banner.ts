import { writeFileSync } from 'node:fs';

const W = 2520;
const H = 1080;
const N = 20;
const TW = 110;
const TH = 55;
const OX = 1800;
const OY = 50;

let seed = 20260923;
const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
const f = (n: number) => Number(n.toFixed(2));

const P = (u: number, v: number, z: number): [number, number] => [
    OX + ((u - v) * TW) / 2,
    OY + ((u + v) * TH) / 2 - z,
];
const pts = (ps: [number, number][]) => ps.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

const hex = (c: string) => [1, 3, 5].map((i) => Number.parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
    const A = hex(a);
    const B = hex(b);
    return `#${A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, '0')).join('')}`;
};

const PALETTE = ['#a8e6cf', '#cdb4db', '#ffc8dd', '#a2d2ff', '#ffd6a5', '#bde0fe', '#caffbf', '#e2c2ff', '#ffadad'];
const TRACE = ['#ff8fc7', '#6ec9ff', '#a98bff', '#f7b955', '#4fd8b4'];
const LIT = ['#fffbe8', '#d9fbff', '#ffe3f4', '#fff3c4', '#e6dcff'];
const INK = '#5b4a86';

const out: string[] = [];
const push = (s: string) => out.push(s);

const topM = (z: number) => `matrix(${TW / 2},${TH / 2},${-TW / 2},${TH / 2},${OX},${OY - z})`;
const leftM = (u0: number, v1: number) =>
    `matrix(${TW / 2},${TH / 2},0,-1,${OX + ((u0 - v1) * TW) / 2},${OY + ((u0 + v1) * TH) / 2})`;
const rightM = (u1: number, v0: number) =>
    `matrix(${-TW / 2},${TH / 2},0,-1,${OX + ((u1 - v0) * TW) / 2},${OY + ((u1 + v0) * TH) / 2})`;

const ns = 'vector-effect="non-scaling-stroke"';
const isBoulevard = (k: number) => k % 5 === 2;

function sky() {
    push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
    push(`<circle cx="1900" cy="380" r="900" fill="url(#bloomPink)"/>`);
    push(`<circle cx="2350" cy="820" r="700" fill="url(#bloomBlue)"/>`);
    push(`<circle cx="1450" cy="200" r="600" fill="url(#bloomMint)"/>`);
    push(`<circle cx="260" cy="900" r="700" fill="url(#bloomPeach)" opacity="0.7"/>`);
    for (let i = 0; i < 14; i++) {
        const y = 60 + rand() * 900;
        const x0 = 900 + rand() * 1400;
        const len = 200 + rand() * 600;
        push(
            `<line x1="${f(x0)}" y1="${f(y)}" x2="${f(x0 + len)}" y2="${f(y - len * 0.5)}" stroke="#ffffff" stroke-width="${f(1 + rand() * 2)}" opacity="${f(0.25 + rand() * 0.35)}" stroke-linecap="round"/>`,
        );
    }
}

function slab() {
    const t = 26;
    const L = P(0, N, 0);
    const B = P(N, N, 0);
    const R = P(N, 0, 0);
    push(
        `<polygon points="${pts([L, B, [B[0], B[1] + 60], [L[0], L[1] + 60]])}" fill="#7e6aa8" opacity="0.18" filter="url(#soft)"/>`,
    );
    push(`<polygon points="${pts([L, B, [B[0], B[1] + t], [L[0], L[1] + t]])}" fill="#9fd8c4"/>`);
    push(`<polygon points="${pts([B, R, [R[0], R[1] + t], [B[0], B[1] + t]])}" fill="#86c4b0"/>`);
    for (let s = 0.4; s < N; s += 0.55) {
        const a = P(s, N, 0);
        push(`<rect x="${f(a[0] - 3)}" y="${f(a[1] + 6)}" width="6" height="12" rx="1.5" fill="#f3e6b8" opacity="0.9"/>`);
    }
    push(`<polygon points="${pts([P(0, 0, 0), R, B, L])}" fill="url(#board)"/>`);
}

function groundCircuits() {
    push(`<g transform="${topM(0)}">`);
    for (let k = 0; k <= N; k++) {
        push(`<line x1="${k}" y1="0" x2="${k}" y2="${N}" stroke="#ffffff" stroke-width="0.8" opacity="0.55" ${ns}/>`);
        push(`<line x1="0" y1="${k}" x2="${N}" y2="${k}" stroke="#ffffff" stroke-width="0.8" opacity="0.55" ${ns}/>`);
    }
    for (let k = 1; k < N; k++) {
        for (const axis of ['u', 'v']) {
            if (rand() < 0.45) continue;
            const col = pick(TRACE);
            const lanes = 1 + Math.floor(rand() * 3);
            for (let l = 0; l < lanes; l++) {
                const off = (l - (lanes - 1) / 2) * 0.07;
                const a = Math.floor(rand() * 6);
                const b = N - Math.floor(rand() * 6);
                const [x1, y1, x2, y2] = axis === 'u' ? [k + off, a, k + off, b] : [a, k + off, b, k + off];
                push(
                    `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${col}" stroke-width="2.4" stroke-linecap="round" opacity="0.85" ${ns}/>`,
                );
                push(`<circle cx="${f(x1)}" cy="${f(y1)}" r="0.07" fill="#fff" stroke="${col}" stroke-width="2" ${ns}/>`);
                push(`<circle cx="${f(x2)}" cy="${f(y2)}" r="0.07" fill="#fff" stroke="${col}" stroke-width="2" ${ns}/>`);
            }
        }
    }
    for (let k = 0; k < N; k++) {
        if (!isBoulevard(k)) continue;
        for (const axis of ['u', 'v']) {
            push(
                axis === 'u'
                    ? `<rect x="${k + 0.08}" y="0" width="0.84" height="${N}" fill="#f4fbf8" opacity="0.8"/>`
                    : `<rect x="0" y="${k + 0.08}" width="${N}" height="0.84" fill="#f4fbf8" opacity="0.8"/>`,
            );
            const lanes = 7;
            for (let l = 0; l < lanes; l++) {
                const c = k + 0.2 + (l * 0.6) / (lanes - 1);
                const col = TRACE[(l + k) % TRACE.length];
                const [x1, y1, x2, y2] = axis === 'u' ? [c, 0, c, N] : [0, c, N, c];
                push(
                    `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${col}" stroke-width="2.2" opacity="0.9" ${ns}/>`,
                );
            }
        }
    }
    for (let i = 0; i < 90; i++) {
        let u = Math.floor(rand() * N) + (rand() < 0.5 ? 0.12 : 0.88);
        let v = Math.floor(rand() * N) + (rand() < 0.5 ? 0.12 : 0.88);
        const col = pick(TRACE);
        const path = [`M${f(u)},${f(v)}`];
        for (let s = 0; s < 3 + Math.floor(rand() * 4); s++) {
            const d = pick([
                [1, 0],
                [0, 1],
                [-1, 0],
                [0, -1],
                [0.7, 0.7],
                [-0.7, 0.7],
            ]);
            const len = 0.3 + rand() * 1.4;
            u = Math.min(N, Math.max(0, u + d[0] * len));
            v = Math.min(N, Math.max(0, v + d[1] * len));
            path.push(`L${f(u)},${f(v)}`);
        }
        push(`<path d="${path.join('')}" fill="none" stroke="${col}" stroke-width="1.3" opacity="0.7" stroke-linejoin="round" ${ns}/>`);
        push(`<circle cx="${f(u)}" cy="${f(v)}" r="0.05" fill="${col}"/>`);
    }
    push('</g>');
}

function pulses() {
    push(`<g transform="${topM(0)}" filter="url(#glow)">`);
    const blvds = Array.from({ length: N }, (_, k) => k).filter(isBoulevard);
    for (let i = 0; i < 70; i++) {
        const k = pick(blvds) + 0.2 + Math.floor(rand() * 7) * 0.1;
        const s = rand() * (N - 2);
        const len = 0.6 + rand() * 2.2;
        const col = pick(TRACE);
        const [x1, y1, x2, y2] = rand() < 0.5 ? [k, s, k, s + len] : [s, k, s + len, k];
        push(
            `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${col}" stroke-width="7" stroke-linecap="round" ${ns}/>`,
        );
        push(
            `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" ${ns}/>`,
        );
    }
    for (let i = 0; i < 30; i++) {
        const x = 1 + Math.floor(rand() * (N - 1));
        const y = 1 + Math.floor(rand() * (N - 1));
        push(`<circle cx="${x}" cy="${y}" r="0.12" fill="${pick(LIT)}"/>`);
    }
    push('</g>');
}

type Beam = { x: number; y: number; col: string };
const beams: Beam[] = [];

function windows(z0: number, z1: number, span: number, face: string, glowOn: boolean) {
    const unlit = mix(face, INK, 0.22);
    const g: string[] = [];
    const lit: string[] = [];
    const style = rand();
    for (let t = z0 + 12; t < z1 - 10; t += 15) {
        if (style < 0.35) {
            const on = rand() < 0.55;
            const c = on ? pick(LIT) : unlit;
            (on ? lit : g).push(`<rect x="0.08" y="${f(t)}" width="${f(span - 0.16)}" height="4" fill="${c}"/>`);
            continue;
        }
        const cols = Math.max(2, Math.round(span * (style < 0.7 ? 7 : 4)));
        const w = span / cols;
        for (let c = 0; c < cols; c++) {
            const on = rand() < 0.42;
            const color = on ? pick(LIT) : unlit;
            (on ? lit : g).push(
                `<rect x="${f(c * w + w * 0.22)}" y="${f(t)}" width="${f(w * 0.56)}" height="7" fill="${color}" opacity="${on ? 1 : 0.55}"/>`,
            );
        }
    }
    const traceCol = mix(face, '#f7b955', 0.55);
    for (let i = 0; i < 2; i++) {
        const s = 0.1 + rand() * (span - 0.2);
        g.push(`<line x1="${f(s)}" y1="${f(z0)}" x2="${f(s)}" y2="${f(z0 + (z1 - z0) * rand())}" stroke="${traceCol}" stroke-width="1.4" ${ns}/>`);
    }
    return `${g.join('')}${lit.length ? `<g${glowOn ? ' filter="url(#winGlow)"' : ''}>${lit.join('')}</g>` : ''}`;
}

function pins(span: number, z0: number) {
    const s: string[] = [];
    const n = Math.max(3, Math.round(span * 9));
    for (let i = 0; i < n; i++) {
        s.push(`<rect x="${f(((i + 0.3) * span) / n)}" y="${f(z0)}" width="${f((span / n) * 0.4)}" height="9" fill="#e9e4f2"/>`);
    }
    return s.join('');
}

function roof(u0: number, v0: number, u1: number, v1: number, z: number, color: string, tall: boolean) {
    const s: string[] = [];
    const inset = 0.06;
    const edge = mix(color, INK, 0.3);
    s.push(
        `<rect x="${f(u0 + inset)}" y="${f(v0 + inset)}" width="${f(u1 - u0 - inset * 2)}" height="${f(v1 - v0 - inset * 2)}" fill="none" stroke="${mix(color, '#ffffff', 0.6)}" stroke-width="1.2" ${ns}/>`,
    );
    const kind = rand();
    if (kind < 0.45) {
        const cu = (u0 + u1) / 2;
        const cv = (v0 + v1) / 2;
        const hw = (u1 - u0) * 0.26;
        const hh = (v1 - v0) * 0.26;
        s.push(`<rect x="${f(cu - hw)}" y="${f(cv - hh)}" width="${f(hw * 2)}" height="${f(hh * 2)}" fill="${mix(color, INK, 0.45)}" rx="0.03"/>`);
        const n = 5;
        for (let i = 0; i < n; i++) {
            const a = cu - hw + ((i + 0.5) * hw * 2) / n;
            const b = cv - hh + ((i + 0.5) * hh * 2) / n;
            s.push(`<line x1="${f(a)}" y1="${f(cv - hh)}" x2="${f(a)}" y2="${f(cv - hh - 0.08)}" stroke="#f3e6b8" stroke-width="1.6" ${ns}/>`);
            s.push(`<line x1="${f(a)}" y1="${f(cv + hh)}" x2="${f(a)}" y2="${f(cv + hh + 0.08)}" stroke="#f3e6b8" stroke-width="1.6" ${ns}/>`);
            s.push(`<line x1="${f(cu - hw)}" y1="${f(b)}" x2="${f(cu - hw - 0.08)}" y2="${f(b)}" stroke="#f3e6b8" stroke-width="1.6" ${ns}/>`);
            s.push(`<line x1="${f(cu + hw)}" y1="${f(b)}" x2="${f(cu + hw + 0.08)}" y2="${f(b)}" stroke="#f3e6b8" stroke-width="1.6" ${ns}/>`);
        }
        s.push(`<circle cx="${f(cu - hw * 0.6)}" cy="${f(cv - hh * 0.6)}" r="0.025" fill="${pick(LIT)}"/>`);
    } else {
        for (let i = 0; i < 3; i++) {
            const col = pick(TRACE);
            let a = u0 + 0.1 + rand() * (u1 - u0 - 0.2);
            let b = v0 + 0.1;
            const d = [`M${f(a)},${f(b)}`];
            b += (v1 - v0) * (0.2 + rand() * 0.3);
            d.push(`L${f(a)},${f(b)}`);
            const da = Math.min(u1 - 0.1 - a, (v1 - 0.1 - b) * 0.8) * (rand() < 0.5 ? 1 : -1) * 0.6;
            a += da;
            b += Math.abs(da);
            d.push(`L${f(Math.max(u0 + 0.1, a))},${f(b)}`);
            d.push(`L${f(Math.max(u0 + 0.1, a))},${f(v1 - 0.1)}`);
            s.push(`<path d="${d.join('')}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round" ${ns}/>`);
            s.push(`<circle cx="${f(Math.max(u0 + 0.1, a))}" cy="${f(v1 - 0.1)}" r="0.035" fill="#fff" stroke="${col}" stroke-width="1.4" ${ns}/>`);
        }
    }
    if (tall) {
        const cu = (u0 + u1) / 2;
        const cv = (v0 + v1) / 2;
        s.push(`<circle cx="${f(cu)}" cy="${f(cv)}" r="0.09" fill="#ffffff" filter="url(#glow)"/>`);
    }
    return `<g transform="${topM(z)}"><polygon points="${u0},${v0} ${u1},${v0} ${u1},${v1} ${u0},${v1}" fill="none" stroke="${edge}" stroke-width="0.8" ${ns}/>${s.join('')}</g>`;
}

function box(u0: number, v0: number, u1: number, v1: number, z0: number, z1: number, color: string, detail: boolean, tall = false) {
    const top = mix(color, '#ffffff', 0.35);
    const left = color;
    const right = mix(color, INK, 0.16);
    const edge = mix(color, INK, 0.45);
    const lf = [P(u0, v1, z0), P(u1, v1, z0), P(u1, v1, z1), P(u0, v1, z1)];
    const rf = [P(u1, v0, z0), P(u1, v1, z0), P(u1, v1, z1), P(u1, v0, z1)];
    const tf = [P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)];
    push(`<polygon points="${pts(lf)}" fill="${left}" stroke="${edge}" stroke-width="0.8" stroke-linejoin="round"/>`);
    push(`<polygon points="${pts(rf)}" fill="${right}" stroke="${edge}" stroke-width="0.8" stroke-linejoin="round"/>`);
    if (detail && z1 - z0 > 26) {
        push(`<g transform="${leftM(u0, v1)}">${windows(z0, z1, u1 - u0, left, true)}</g>`);
        push(`<g transform="${rightM(u1, v0)}"><g transform="translate(${f(v1 - v0)},0) scale(-1,1)">${windows(z0, z1, v1 - v0, right, true)}</g></g>`);
    }
    if (z0 === 0 && rand() < 0.4) {
        push(`<g transform="${leftM(u0, v1)}">${pins(u1 - u0, 0)}</g>`);
    }
    push(`<polygon points="${pts(tf)}" fill="${top}" stroke="${edge}" stroke-width="0.8" stroke-linejoin="round"/>`);
    push(`<polygon points="${pts([tf[3], tf[2], tf[1]])}" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.7"/>`);
    if (detail) push(roof(u0, v0, u1, v1, z1, color, tall));
}

function capacitor(u: number, v: number, r: number, h: number, color: string) {
    const [x, y] = P(u, v, 0);
    const rx = r * TW * 0.5;
    const ry = rx * 0.5;
    const side = mix(color, INK, 0.12);
    push(`<path d="M${f(x - rx)},${f(y)} L${f(x - rx)},${f(y - h)} A${f(rx)},${f(ry)} 0 0 0 ${f(x + rx)},${f(y - h)} L${f(x + rx)},${f(y)} A${f(rx)},${f(ry)} 0 0 1 ${f(x - rx)},${f(y)}Z" fill="${side}" stroke="${mix(color, INK, 0.45)}" stroke-width="0.8"/>`);
    push(`<rect x="${f(x + rx * 0.35)}" y="${f(y - h)}" width="${f(rx * 0.35)}" height="${f(h)}" fill="#ffffff" opacity="0.45"/>`);
    push(`<ellipse cx="${f(x)}" cy="${f(y - h)}" rx="${f(rx)}" ry="${f(ry)}" fill="${mix(color, '#ffffff', 0.45)}" stroke="${mix(color, INK, 0.45)}" stroke-width="0.8"/>`);
    push(`<path d="M${f(x - rx * 0.5)},${f(y - h)} L${f(x + rx * 0.5)},${f(y - h)} M${f(x)},${f(y - h - ry * 0.5)} L${f(x)},${f(y - h + ry * 0.5)}" stroke="${mix(color, INK, 0.35)}" stroke-width="1.4"/>`);
}

function city() {
    const cells: [number, number][] = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) cells.push([i, j]);
    cells.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0]);
    for (const [i, j] of cells) {
        const cu = i + 0.5;
        const cv = j + 0.5;
        const [sx] = P(cu, cv, 0);
        const dx = (sx - 1850) / 520;
        const dy = (i + j - 17) / 9;
        const falloff = Math.exp(-(dx * dx + dy * dy));
        const leftFade = Math.min(1, Math.max(0.08, (sx - 950) / 500));
        const r = rand();
        if (isBoulevard(i) || isBoulevard(j)) continue;
        if (r < 0.12) {
            const n = 1 + Math.floor(rand() * 3);
            for (let k = 0; k < n; k++) {
                capacitor(i + 0.25 + rand() * 0.5, j + 0.25 + rand() * 0.5, 0.18 + rand() * 0.12, 16 + rand() * 30, pick(PALETTE));
            }
            continue;
        }
        if (r < 0.24) continue;
        const m = 0.18 + rand() * 0.12;
        const u0 = i + m;
        const v0 = j + m;
        const u1 = i + 1 - (0.18 + rand() * 0.12);
        const v1 = j + 1 - (0.18 + rand() * 0.12);
        let h = (18 + rand() * 60 + falloff * (80 + rand() * 360) * (rand() < 0.2 ? 1.5 : 1)) * leftFade;
        const baseY = P(u0, v0, 0)[1];
        h = Math.min(h, baseY - 70);
        const color = pick(PALETTE);
        const tall = h > 300;
        if (h > 150 && rand() < 0.7) {
            const h1 = h * (0.45 + rand() * 0.2);
            box(u0, v0, u1, v1, 0, h1, color, true);
            const k = 0.12 + rand() * 0.06;
            const c2 = rand() < 0.5 ? color : pick(PALETTE);
            const h2 = h1 + (h - h1) * (0.6 + rand() * 0.15);
            box(u0 + k, v0 + k, u1 - k, v1 - k, h1, h2, c2, true);
            const k2 = k + 0.1;
            box(u0 + k2, v0 + k2, u1 - k2, v1 - k2, h2, h, mix(c2, '#ffffff', 0.2), true, tall);
        } else {
            box(u0, v0, u1, v1, 0, h, color, true, tall);
        }
        if (tall) {
            const [bx, by] = P((u0 + u1) / 2, (v0 + v1) / 2, h);
            beams.push({ x: bx, y: by, col: pick(TRACE) });
        }
    }
}

function beamsLayer() {
    for (const b of beams) {
        push(`<rect x="${f(b.x - 14)}" y="0" width="28" height="${f(b.y)}" fill="url(#beam)" opacity="0.55" filter="url(#soft)"/>`);
        push(`<rect x="${f(b.x - 1.5)}" y="0" width="3" height="${f(b.y)}" fill="url(#beamCore)"/>`);
        for (let i = 0; i < 7; i++) {
            const y = b.y - 30 - rand() * Math.min(500, b.y - 20);
            push(`<rect x="${f(b.x - 2.5)}" y="${f(y)}" width="5" height="${f(6 + rand() * 18)}" rx="2" fill="${b.col}" filter="url(#glow)"/>`);
        }
    }
}

function cube(x: number, y: number, s: number, color: string) {
    const top = mix(color, '#ffffff', 0.4);
    const right = mix(color, INK, 0.16);
    const a: [number, number][] = [
        [x, y - s / 2],
        [x + s, y],
        [x, y + s / 2],
        [x - s, y],
    ];
    push(`<g opacity="0.9">`);
    push(`<polygon points="${pts([a[3], a[2], [a[2][0], a[2][1] + s], [a[3][0], a[3][1] + s]])}" fill="${color}"/>`);
    push(`<polygon points="${pts([a[2], a[1], [a[1][0], a[1][1] + s], [a[2][0], a[2][1] + s]])}" fill="${right}"/>`);
    push(`<polygon points="${pts(a)}" fill="${top}" stroke="#ffffff" stroke-width="1"/>`);
    push('</g>');
}

function sparkles() {
    for (let i = 0; i < 12; i++) {
        cube(1150 + rand() * 1350, 60 + rand() * 300, 6 + rand() * 12, pick(PALETTE));
    }
    for (let i = 0; i < 140; i++) {
        const x = 1000 + Math.pow(rand(), 0.7) * 1520;
        const y = rand() * 1000;
        const s = 1.5 + rand() * 4;
        const c = pick(LIT);
        push(
            `<path d="M${f(x)},${f(y - s * 2)} Q${f(x)},${f(y)} ${f(x + s * 2)},${f(y)} Q${f(x)},${f(y)} ${f(x)},${f(y + s * 2)} Q${f(x)},${f(y)} ${f(x - s * 2)},${f(y)} Q${f(x)},${f(y)} ${f(x)},${f(y - s * 2)}Z" fill="${c}" opacity="${f(0.5 + rand() * 0.5)}"/>`,
        );
    }
    for (let i = 0; i < 25; i++) {
        push(`<circle cx="${f(rand() * 900)}" cy="${f(rand() * H)}" r="${f(1 + rand() * 2)}" fill="#ffffff" opacity="${f(0.3 + rand() * 0.4)}"/>`);
    }
}

const defs = `<defs>
<linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#f4ecff"/><stop offset="0.45" stop-color="#fdeef6"/><stop offset="1" stop-color="#fff3e4"/>
</linearGradient>
<radialGradient id="bloomPink"><stop offset="0" stop-color="#ffc8e4" stop-opacity="0.85"/><stop offset="1" stop-color="#ffc8e4" stop-opacity="0"/></radialGradient>
<radialGradient id="bloomBlue"><stop offset="0" stop-color="#b8e3ff" stop-opacity="0.9"/><stop offset="1" stop-color="#b8e3ff" stop-opacity="0"/></radialGradient>
<radialGradient id="bloomMint"><stop offset="0" stop-color="#c9f5e4" stop-opacity="0.8"/><stop offset="1" stop-color="#c9f5e4" stop-opacity="0"/></radialGradient>
<radialGradient id="bloomPeach"><stop offset="0" stop-color="#ffe0c2" stop-opacity="0.8"/><stop offset="1" stop-color="#ffe0c2" stop-opacity="0"/></radialGradient>
<linearGradient id="board" x1="0" x2="0" gradientUnits="userSpaceOnUse" y1="50" y2="1150">
<stop offset="0" stop-color="#e3f7ef"/><stop offset="1" stop-color="#c6ecdd"/>
</linearGradient>
<linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
<linearGradient id="beamCore" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="0.7" stop-color="#ffffff" stop-opacity="0.2"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7eeff" stop-opacity="0.45"/><stop offset="0.25" stop-color="#f7eeff" stop-opacity="0"/></linearGradient>
<linearGradient id="fadeX" gradientUnits="userSpaceOnUse" x1="760" y1="0" x2="1260" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
<mask id="leftFade" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fadeX)"/></mask>
<filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="winGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
<radialGradient id="vignette" cx="0.6" cy="0.5" r="0.8"><stop offset="0.6" stop-color="#5b4a86" stop-opacity="0"/><stop offset="1" stop-color="#5b4a86" stop-opacity="0.12"/></radialGradient>
</defs>`;

sky();
push('<g mask="url(#leftFade)">');
slab();
groundCircuits();
pulses();
city();
beamsLayer();
push('</g>');
push(`<rect width="${W}" height="${H}" fill="url(#haze)"/>`);
sparkles();
push(`<rect width="${W}" height="${H}" fill="url(#vignette)"/>`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${out.join('')}</svg>`;
const target = process.argv[2] ?? 'public/images/hero-circuit-city.svg';
writeFileSync(target, svg);
console.log(`${target} ${(svg.length / 1024).toFixed(0)} KB`);

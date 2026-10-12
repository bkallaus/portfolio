import { useId } from "react";
import type React from "react";
import { CARDCOL, RESCOL, SCI, SCIINK, shade } from "./theme.ts";
import type { CardColor, Resource, ScienceSymbol } from "./theme.ts";
import type { Card } from "./engine.ts";

export const PLAYER = [
  { main: "#5b9bd5", light: "#a9d0f2", dark: "#2c5a86", name: "Azure" },
  { main: "#e07a4c", light: "#f5b896", dark: "#8c3f1f", name: "Ember" },
] as const;

const P = {
  ink: "#2b2216",
  wood: "#7a5230",
  woodHi: "#9a6c42",
  leaf: "#4f7a3a",
  leafHi: "#76a656",
  stone: "#a9aaa3",
  stoneLo: "#7c7e78",
  clay: "#b5622f",
  clayHi: "#d47e48",
  glass: "#8fd6e6",
  papyrus: "#e8d593",
  gold: "#e0b45e",
  goldLo: "#a87f31",
  marble: "#f1ebdc",
  marbleLo: "#cfc4a8",
  red: "#a8433c",
  water: "#4f93bb",
  waterHi: "#8cc4e0",
  fire: "#f2a03a",
  fireHi: "#ffe08a",
  sand: "#e3c98d",
  sandLo: "#c9a866",
};

const SKY: Record<CardColor, [string, string]> = {
  brown: ["#f3dcb6", "#e7c792"],
  grey: ["#dfe4e6", "#c3cbcf"],
  blue: ["#cfe2f3", "#a9c8e6"],
  green: ["#d7ecd3", "#b2d6aa"],
  yellow: ["#f8e6b0", "#efcf7a"],
  red: ["#f3cdb8", "#e3a184"],
  purple: ["#e2d3ec", "#c5acd8"],
};

const GROUND: Record<CardColor, string> = {
  brown: "#b99668",
  grey: "#9aa3a6",
  blue: "#b6b39a",
  green: "#8fb07a",
  yellow: "#c9aa6a",
  red: "#a77b5e",
  purple: "#9c8aa6",
};

const tree = (x: number, y: number, s = 1, k = 0) => (
  <g key={`t${x}${y}${k}`}>
    <rect x={x - 0.8 * s} y={y - 3 * s} width={1.6 * s} height={3 * s} fill={P.wood} />
    <path d={`M${x} ${y - 13 * s}L${x + 5 * s} ${y - 3 * s}H${x - 5 * s}Z`} fill={P.leaf} />
    <path d={`M${x} ${y - 13 * s}L${x + 2 * s} ${y - 3 * s}H${x - 1 * s}Z`} fill={P.leafHi} opacity=".55" />
  </g>
);

const cypress = (x: number, y: number, s = 1) => (
  <g key={`c${x}`}>
    <ellipse cx={x} cy={y - 6 * s} rx={1.8 * s} ry={6.5 * s} fill={P.leaf} />
    <ellipse cx={x - 0.5 * s} cy={y - 7 * s} rx={0.7 * s} ry={4.5 * s} fill={P.leafHi} opacity=".5" />
  </g>
);

const columns = (x0: number, x1: number, top: number, base: number, n: number, col = P.marble) => {
  const step = (x1 - x0) / (n - 1);
  return Array.from({ length: n }, (_, k) => (
    <rect key={`col${k}`} x={x0 + k * step - 1} y={top} width={2} height={base - top} fill={col} stroke={P.marbleLo} strokeWidth=".4" />
  ));
};

const temple = (cx: number, base: number, w: number, h: number, n = 5) => (
  <g>
    <rect x={cx - w / 2 - 2} y={base - 2} width={w + 4} height={2} fill={P.marbleLo} />
    <rect x={cx - w / 2 - 1} y={base - 3.4} width={w + 2} height={1.6} fill={P.marble} />
    {columns(cx - w / 2 + 1.5, cx + w / 2 - 1.5, base - h, base - 3.4, n)}
    <rect x={cx - w / 2 - 1} y={base - h - 1.6} width={w + 2} height={1.8} fill={P.marble} stroke={P.marbleLo} strokeWidth=".4" />
    <path d={`M${cx - w / 2 - 2} ${base - h - 1.6}L${cx} ${base - h - 7}L${cx + w / 2 + 2} ${base - h - 1.6}Z`} fill={P.marble} stroke={P.marbleLo} strokeWidth=".5" />
  </g>
);

const flame = (x: number, y: number, s = 1) => (
  <g key={`f${x}${y}`}>
    <path d={`M${x} ${y - 6 * s}C${x + 3 * s} ${y - 3 * s} ${x + 2.5 * s} ${y} ${x} ${y}C${x - 2.5 * s} ${y} ${x - 3 * s} ${y - 3 * s} ${x} ${y - 6 * s}Z`} fill={P.fire} />
    <path d={`M${x} ${y - 3.4 * s}C${x + 1.4 * s} ${y - 1.8 * s} ${x + 1.2 * s} ${y} ${x} ${y}C${x - 1.2 * s} ${y} ${x - 1.4 * s} ${y - 1.8 * s} ${x} ${y - 3.4 * s}Z`} fill={P.fireHi} />
  </g>
);

const crenel = (x: number, y: number, w: number, h: number, fill = P.stone, n = 0) => {
  const teeth = n || Math.max(2, Math.round(w / 3));
  const tw = w / (teeth * 2 - 1);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={P.stoneLo} strokeWidth=".5" />
      {Array.from({ length: teeth }, (_, k) => (
        <rect key={k} x={x + k * tw * 2} y={y - 2} width={tw} height={2.2} fill={fill} stroke={P.stoneLo} strokeWidth=".4" />
      ))}
    </g>
  );
};

const horse = (x: number, y: number, s = 1, col = P.wood) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-7 0v-5c0-2 1.5-3.5 4-3.5h5l3-4.5 1.5.5-.5 2 2.5 2.5-1 1.2-2.4-.8-1.6 2.6V0h-1.6v-4H-4.6V0z" fill={col} />
    <path d="M2 -12.5l-1.5 -1.8" stroke={col} strokeWidth="1.2" strokeLinecap="round" />
    <path d="M-7 -4.6c-1.6.4-2.4 1.8-2.6 3.6" stroke={P.ink} strokeWidth=".9" fill="none" strokeLinecap="round" />
  </g>
);

const scroll = (x: number, y: number, w: number, h: number) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill={P.papyrus} stroke={shade(P.papyrus, -30)} strokeWidth=".5" />
    <rect x={x - 1.2} y={y - 1} width={2.4} height={h + 2} rx={1.2} fill={P.woodHi} />
    <rect x={x + w - 1.2} y={y - 1} width={2.4} height={h + 2} rx={1.2} fill={P.woodHi} />
    {Array.from({ length: Math.floor(h / 2.6) }, (_, k) => (
      <path key={k} d={`M${x + 2.5} ${y + 2 + k * 2.6}H${x + w - 2.5 - (k % 2) * 3}`} stroke={shade(P.papyrus, -45)} strokeWidth=".6" />
    ))}
  </g>
);

const coinPile = (x: number, y: number, n = 3) => (
  <g>
    {Array.from({ length: n }, (_, k) => (
      <g key={k}>
        <ellipse cx={x} cy={y - k * 1.6} rx={3.2} ry={1.3} fill={P.goldLo} />
        <ellipse cx={x} cy={y - k * 1.6 - 0.5} rx={3.2} ry={1.2} fill={P.gold} />
      </g>
    ))}
  </g>
);

const amphora = (x: number, y: number, col = P.clay) => (
  <g>
    <path d={`M${x - 1} ${y - 11}h2v1.6c2.6 1 3.4 3.4 3 6-0.4 2-1.6 3.4-3 3.4h-2c-1.4 0-2.6-1.4-3-3.4-0.4-2.6.4-5 3-6z`} fill={col} stroke={shade(col, -30)} strokeWidth=".5" />
    <path d={`M${x - 3} ${y - 6}h6`} stroke={P.ink} strokeWidth=".6" opacity=".5" />
    <path d={`M${x - 1} ${y - 10}c-2 0-2.6 1.6-2.4 3M${x + 1} ${y - 10}c2 0 2.6 1.6 2.4 3`} stroke={shade(col, -30)} strokeWidth=".7" fill="none" />
  </g>
);

const sea = (y: number) => (
  <g>
    <rect x="0" y={y} width="60" height={34 - y} fill={P.water} />
    <path d={`M2 ${y + 2}q2-1.2 4 0t4 0M20 ${y + 3}q2-1.2 4 0t4 0M40 ${y + 2}q2-1.2 4 0t4 0`} stroke={P.waterHi} strokeWidth=".7" fill="none" />
  </g>
);

const ship = (x: number, y: number, s = 1) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-9 0h18l-3 3.4h-12z" fill={P.wood} />
    <path d="M0 0v-12" stroke={P.ink} strokeWidth=".8" />
    <path d="M0.6 -11.4c4 2 5 6 4.6 9.6h-4.6z" fill={P.marble} stroke={P.marbleLo} strokeWidth=".4" />
    <path d="M-0.6 -10c-3 2-4 5-3.8 8.2h3.8z" fill={P.red} opacity=".85" />
  </g>
);

const reserve = (res: Resource) => (
  <g>
    <rect x="16" y="13" width="28" height="15" fill={P.woodHi} stroke={P.wood} strokeWidth=".6" />
    <path d="M13 14L30 5l17 9z" fill={P.clay} stroke={shade(P.clay, -25)} strokeWidth=".6" />
    <rect x="25" y="18" width="10" height="10" fill={P.wood} />
    <circle cx="30" cy="22" r="3.2" fill={RESCOL[res]} stroke={shade(RESCOL[res], -35)} strokeWidth=".6" />
    <rect x="47" y="22" width="6" height="6" fill={P.sandLo} stroke={P.wood} strokeWidth=".5" />
    <path d="M47 22l6 6M53 22l-6 6" stroke={P.wood} strokeWidth=".4" />
  </g>
);

function sciScene(sym: ScienceSymbol, building: React.ReactNode) {
  const { col, parts } = SCI[sym];
  return (
    <g>
      {building}
      <circle cx="30" cy="15" r="9.5" fill="#fffaf0" stroke={shade(col, -25)} strokeWidth=".8" opacity=".95" />
      <g transform="translate(22.5 7.5) scale(.94)">
        {parts.map((part) => (
          <path key={part.d} d={part.d}
            fill={part.w ? "none" : part.ink ? SCIINK : col}
            stroke={part.w ? (part.ink ? SCIINK : col) : "none"}
            strokeWidth={part.w} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>
    </g>
  );
}

const banner = (colors: CardColor[], glyph: React.ReactNode) => (
  <g>
    <path d="M30 3v26" stroke={P.wood} strokeWidth="1.2" />
    <circle cx="30" cy="3" r="1.4" fill={P.gold} />
    <path d="M19 6h22v15l-11 5-11-5z" fill="#5d3c74" stroke="#3f2752" strokeWidth=".7" />
    <path d="M19 6h22v2.4H19z" fill={P.gold} />
    {colors.map((c, k) => (
      <rect key={c} x={22 + k * (16 / colors.length)} y="10" width={16 / colors.length - 1} height="3" fill={CARDCOL[c]} stroke="rgba(0,0,0,.3)" strokeWidth=".3" />
    ))}
    <g transform="translate(30 18)">{glyph}</g>
  </g>
);

const MOTIF: Record<string, () => React.ReactNode> = {
  lumber_yard: () => <g>{tree(12, 28, 1.1)}{tree(22, 28, 0.85)}{tree(48, 28, 1)}<g>{[0, 1, 2].map((k) => <g key={k}><rect x={28 + k * 1} y={24 - k * 3.2} width={14 - k * 2} height={3.2} rx={1.6} fill={P.woodHi} stroke={P.wood} strokeWidth=".5" /><circle cx={28 + k * 1 + 1.6} cy={25.6 - k * 3.2} r={1.3} fill={P.sand} stroke={P.wood} strokeWidth=".4" /></g>)}</g></g>,
  logging_camp: () => <g>{tree(10, 28, 1)}{tree(50, 28, 1.15)}{tree(42, 28, 0.8)}<rect x="22" y="22" width="2" height="6" fill={P.wood} /><path d="M17 20h12l-6-7z" fill={P.sandLo} stroke={P.wood} strokeWidth=".5" /><path d="M28 27l6-6" stroke={P.wood} strokeWidth="1.2" /><path d="M33 19.4l3 1.2-1.6 2.4-2.6-1.6z" fill={P.stoneLo} /></g>,
  sawmill: () => <g>{tree(8, 28, 0.9)}<rect x="16" y="16" width="26" height="12" fill={P.woodHi} stroke={P.wood} strokeWidth=".6" /><path d="M14 17l15-8 15 8z" fill={P.wood} /><circle cx="48" cy="20" r="7" fill={P.stone} stroke={P.stoneLo} strokeWidth=".6" />{Array.from({ length: 12 }, (_, k) => { const a = (k / 12) * Math.PI * 2; return <path key={k} d={`M${48 + Math.cos(a) * 7} ${20 + Math.sin(a) * 7}l${Math.cos(a + 0.5) * 2} ${Math.sin(a + 0.5) * 2}`} stroke={P.stoneLo} strokeWidth=".9" />; })}<circle cx="48" cy="20" r="1.6" fill={P.ink} /><rect x="20" y="22" width="18" height="3" fill={P.sand} stroke={P.wood} strokeWidth=".4" /></g>,
  clay_pool: () => <g><ellipse cx="22" cy="27" rx="15" ry="3.6" fill={P.clay} /><ellipse cx="22" cy="26.4" rx="12" ry="2.4" fill={P.water} opacity=".6" /><path d="M14 26q2-1 4 0" stroke={P.waterHi} strokeWidth=".6" fill="none" />{[0, 1].map((r) => Array.from({ length: 3 - r }, (_, k) => <rect key={`${r}${k}`} x={40 + k * 5 + r * 2.5} y={24 - r * 3} width={4.6} height={2.8} fill={P.clayHi} stroke={shade(P.clay, -30)} strokeWidth=".4" />))}</g>,
  clay_pit: () => <g><path d="M4 28c4-8 14-10 22-6s10 6 14 6z" fill={P.clay} /><path d="M10 28c3-4 8-5 12-3" stroke={shade(P.clay, -25)} strokeWidth=".7" fill="none" /><path d="M36 28l4-10 1 .4-3.4 9.6z" fill={P.wood} /><path d="M38.4 18.4l3.8-2.4.8 1.6-3.6 2.2z" fill={P.stoneLo} />{[0, 1, 2].map((k) => <rect key={k} x={46} y={25 - k * 3} width={7} height={2.8} fill={P.clayHi} stroke={shade(P.clay, -30)} strokeWidth=".4" />)}</g>,
  brickyard: () => <g><path d="M6 28V14h10v14z" fill={P.clay} stroke={shade(P.clay, -30)} strokeWidth=".5" /><rect x="8" y="6" width="4" height="8" fill={P.clay} />{flame(10, 6, 0.6)}<path d="M8 20h6M8 23h6" stroke={shade(P.clay, -30)} strokeWidth=".5" />{[0, 1, 2, 3].map((r) => Array.from({ length: r > 1 ? 3 : 4 }, (_, k) => <rect key={`${r}${k}`} x={22 + k * 8 + (r % 2) * 4} y={25 - r * 3.2} width={7.4} height={3} fill={P.clayHi} stroke={shade(P.clay, -30)} strokeWidth=".4" />))}</g>,
  quarry: () => <g><path d="M0 28L12 10l8 7 9-12 14 17 8-5 9 11z" fill={P.stone} stroke={P.stoneLo} strokeWidth=".6" /><path d="M29 5l-3 8 4 1-2 8" stroke={P.stoneLo} strokeWidth=".6" fill="none" /><rect x="36" y="23" width="6" height="5" fill={P.marble} stroke={P.stoneLo} strokeWidth=".5" /><rect x="43" y="24" width="5" height="4" fill={P.marbleLo} stroke={P.stoneLo} strokeWidth=".5" /></g>,
  stone_pit: () => <g><path d="M4 28c2-6 8-9 14-9h24c6 0 12 3 14 9z" fill={P.stoneLo} /><path d="M10 28c2-4 6-6 10-6h20c4 0 8 2 10 6z" fill={P.stone} />{[0, 1, 2].map((k) => <rect key={k} x={18 + k * 9} y={18 - (k === 1 ? 3 : 0)} width={7} height={5} fill={P.marble} stroke={P.stoneLo} strokeWidth=".5" />)}<path d="M50 14l4-5" stroke={P.wood} strokeWidth="1.1" /><path d="M52.6 8l2.8 1.6-1 1.6-2.6-1.4z" fill={P.stoneLo} /></g>,
  shelf_quarry: () => <g><path d="M0 28V20h12v-6h12V8h14v6h10v6h12v8z" fill={P.stone} stroke={P.stoneLo} strokeWidth=".6" /><path d="M0 22h12M12 16h12M24 10h14M38 16h10M48 22h12" stroke={P.marble} strokeWidth=".8" /><rect x="27" y="11" width="5" height="3" fill={P.marble} /><rect x="14" y="17" width="5" height="3" fill={P.marble} /></g>,
  glassworks: () => <g><path d="M8 28V18a10 10 0 0 1 20 0v10z" fill={P.clay} stroke={shade(P.clay, -30)} strokeWidth=".6" /><path d="M13 28v-6a5 5 0 0 1 10 0v6z" fill="#3a1d0e" /><path d="M14 28v-5a4 4 0 0 1 8 0v5z" fill={P.fire} opacity=".9" /><ellipse cx="18" cy="26" rx="3" ry="1.6" fill={P.fireHi} /><g transform="translate(42 28)"><path d="M-2 -14h4v3c4 1.6 6 4.6 6 7.4 0 2.6-2 3.6-4 3.6h-8c-2 0-4-1-4-3.6 0-2.8 2-5.8 6-7.4z" fill={P.glass} stroke={shade(P.glass, -40)} strokeWidth=".6" opacity=".95" /><path d="M-3.4 -8c-1.6 1.2-2.4 3-2.2 4.6" stroke="#fff" strokeWidth=".8" fill="none" opacity=".8" /></g></g>,
  glassblower: () => <g><g transform="translate(14 28)"><path d="M-3 -9h6v2c3 1 5 3 5 5.6 0 1.4-1 1.4-2 1.4h-12c-1 0-2 0-2-1.4 0-2.6 2-4.6 5-5.6z" fill={P.glass} stroke={shade(P.glass, -40)} strokeWidth=".5" /></g><path d="M22 18L46 10" stroke={P.stoneLo} strokeWidth="1.2" strokeLinecap="round" /><circle cx="20" cy="18.6" r="4.4" fill={P.fire} /><circle cx="19" cy="17.6" r="2" fill={P.fireHi} /><g transform="translate(46 28)"><path d="M-2 -12h4l1 4c2 1 3 3 3 5.6 0 2-1.4 2.4-3 2.4h-6c-1.6 0-3-.4-3-2.4 0-2.6 1-4.6 3-5.6z" fill="#a8e2c8" stroke="#5f9f84" strokeWidth=".5" /></g></g>,
  press: () => <g>{scroll(14, 10, 22, 14)}<rect x="40" y="10" width="2" height="18" fill={P.wood} /><rect x="50" y="10" width="2" height="18" fill={P.wood} /><rect x="38" y="9" width="16" height="2.4" fill={P.woodHi} /><rect x="42" y="16" width="8" height="2.4" fill={P.woodHi} /><rect x="41" y="24" width="10" height="4" fill={P.papyrus} stroke={shade(P.papyrus, -30)} strokeWidth=".4" /></g>,
  drying_room: () => <g><path d="M6 8h48" stroke={P.wood} strokeWidth="1" />{[0, 1, 2, 3].map((k) => <rect key={k} x={9 + k * 12} y={9} width={9} height={14 - (k % 2) * 3} fill={P.papyrus} stroke={shade(P.papyrus, -30)} strokeWidth=".5" />)}{[0, 1, 2, 3, 4, 5].map((k) => <path key={k} d={`M${4 + k * 2.4} 28c0-6 1-9 ${2 - k * 0.2} -12`} stroke={P.leaf} strokeWidth=".8" fill="none" />)}</g>,
  tavern: () => <g><rect x="10" y="14" width="26" height="14" fill={P.woodHi} stroke={P.wood} strokeWidth=".6" /><path d="M8 15l15-8 15 8z" fill={P.clay} /><rect x="20" y="19" width="6" height="9" fill={P.wood} /><path d="M36 17h7" stroke={P.wood} strokeWidth=".8" /><circle cx="42" cy="20" r="2.6" fill={P.leaf} />{amphora(50, 28, P.clayHi)}</g>,
  brewery: () => <g>{[0, 1, 2].map((k) => <g key={k} transform={`translate(${12 + k * 13} ${k === 1 ? 14 : 20})`}><rect x="-5" y="0" width="10" height="8" rx="3" fill={P.woodHi} stroke={P.wood} strokeWidth=".6" /><path d="M-5 2.4h10M-5 5.6h10" stroke={P.stoneLo} strokeWidth=".7" /></g>)}<g transform="translate(50 28)"><path d="M-4 -10h7v10h-7z" fill={P.sand} stroke={P.wood} strokeWidth=".5" /><path d="M3 -8h2a2 2 0 0 1 0 5h-2" stroke={P.wood} strokeWidth=".8" fill="none" /><path d="M-4.6 -10c1-2 3-2 4-1 1-1.4 3-1.2 4 .6" fill="#fff" stroke="#e8e0cc" strokeWidth=".4" /></g></g>,
  stone_reserve: () => reserve("stone"),
  clay_reserve: () => reserve("clay"),
  wood_reserve: () => reserve("wood"),
  forum: () => <g><rect x="6" y="26" width="48" height="2" fill={P.marbleLo} />{columns(9, 51, 14, 26, 7)}<rect x="6" y="12" width="48" height="2.4" fill={P.marble} stroke={P.marbleLo} strokeWidth=".4" />{[0, 1, 2, 3, 4, 5].map((k) => <path key={k} d={`M${12 + k * 7} 20h5l-1 6h-3z`} fill={k % 2 ? P.red : P.gold} opacity=".9" />)}{coinPile(30, 26, 2)}</g>,
  caravansery: () => <g><path d="M4 28L13 14l9 14z" fill={P.sand} stroke={P.sandLo} strokeWidth=".6" /><path d="M13 14v14" stroke={P.sandLo} strokeWidth=".5" /><g transform="translate(40 28)"><path d="M-12 0v-5c0-3 2-6 6-6 2 0 3 2 4 2s2-3 4-3 3 3 4 5l3-4h2l-1 4-2 4v3h-1.6v-3h-12v3z" fill={P.sandLo} stroke={P.wood} strokeWidth=".5" /></g><rect x="22" y="23" width="5" height="5" fill={P.woodHi} stroke={P.wood} strokeWidth=".4" /><rect x="23" y="19" width="4" height="4" fill={P.clayHi} stroke={P.wood} strokeWidth=".4" /></g>,
  customs_house: () => <g><rect x="12" y="12" width="36" height="16" fill={P.marble} stroke={P.marbleLo} strokeWidth=".6" /><path d="M10 13l20-7 20 7z" fill={P.clay} /><rect x="26" y="18" width="8" height="10" fill={P.wood} /><path d="M18 18v8M42 18v8" stroke={P.marbleLo} strokeWidth="1.4" /><circle cx="30" cy="10" r="1.8" fill={P.gold} />{coinPile(52, 28, 3)}{coinPile(7, 28, 2)}</g>,
  chamber_of_commerce: () => <g>{temple(24, 28, 26, 13, 5)}{coinPile(46, 28, 4)}<circle cx="52" cy="14" r="4" fill={P.gold} stroke={P.goldLo} strokeWidth=".6" /><text x="52" y="15.8" textAnchor="middle" fontSize="5" fontWeight="800" fill={P.ink}>3</text></g>,
  port: () => <g>{sea(22)}<rect x="0" y="20" width="18" height="3" fill={P.woodHi} stroke={P.wood} strokeWidth=".4" />{[2, 8, 14].map((x) => <rect key={x} x={x} y={23} width="1.4" height="6" fill={P.wood} />)}{ship(38, 23, 1.05)}<rect x="6" y="15" width="5" height="5" fill={P.woodHi} stroke={P.wood} strokeWidth=".4" /></g>,
  armory: () => <g><rect x="10" y="8" width="40" height="3" fill={P.wood} />{[14, 22, 30].map((x) => <g key={x}><path d={`M${x} 10v18`} stroke={P.woodHi} strokeWidth="1" /><path d={`M${x - 1.6} 10.4l1.6-4 1.6 4z`} fill={P.stone} /></g>)}<g transform="translate(43 20)"><path d="M0 -8l7 2.6v4c0 4.6-3.4 7-7 8-3.6-1-7-3.4-7-8v-4z" fill={P.red} stroke={shade(P.red, -30)} strokeWidth=".6" /><path d="M0 -5v11M-4 0h8" stroke={P.gold} strokeWidth="1" /></g></g>,
  arena: () => <g><ellipse cx="30" cy="22" rx="26" ry="8" fill={P.sandLo} stroke={P.wood} strokeWidth=".5" /><ellipse cx="30" cy="19" rx="26" ry="8" fill={P.marble} stroke={P.marbleLo} strokeWidth=".6" /><ellipse cx="30" cy="19.4" rx="18" ry="4.8" fill={P.sand} />{Array.from({ length: 9 }, (_, k) => <path key={k} d={`M${8 + k * 5.5} ${24.6 - Math.abs(k - 4) * 0.6}v3`} stroke={P.marbleLo} strokeWidth="1.2" />)}<circle cx="26" cy="19" r="1" fill={P.red} /><circle cx="34" cy="20" r="1" fill={PLAYER[0].main} /></g>,
  lighthouse: () => <g>{sea(24)}<path d="M26 28l2-16h4l2 16z" fill={P.marble} stroke={P.marbleLo} strokeWidth=".5" /><path d="M27.4 18h5.2M26.8 23h6.4" stroke={P.red} strokeWidth="1.4" /><rect x="27" y="8" width="6" height="4" fill={P.stoneLo} />{flame(30, 10, 0.75)}<path d="M33 9l18-5v8zM27 9L9 4v8z" fill={P.fireHi} opacity=".35" />{ship(48, 27, 0.5)}</g>,
  altar: () => <g><rect x="20" y="20" width="20" height="8" fill={P.marble} stroke={P.marbleLo} strokeWidth=".6" /><rect x="18" y="18" width="24" height="2.4" fill={P.marble} stroke={P.marbleLo} strokeWidth=".5" /><path d="M22 22h16" stroke={P.gold} strokeWidth=".8" />{flame(30, 18, 1.4)}{cypress(10, 28, 1)}{cypress(50, 28, 1)}</g>,
  baths: () => <g><rect x="6" y="20" width="48" height="8" fill={P.marble} stroke={P.marbleLo} strokeWidth=".6" /><rect x="10" y="21.6" width="40" height="4.6" fill={P.water} /><path d="M14 23.4q2-1 4 0t4 0M32 24q2-1 4 0t4 0" stroke={P.waterHi} strokeWidth=".6" fill="none" />{[18, 30, 42].map((x) => <path key={x} d={`M${x} 18c-1.4-2 1.4-3 0-5s1.4-3 0-5`} stroke="#fff" strokeWidth=".9" fill="none" opacity=".75" />)}</g>,
  theater: () => <g>{[0, 1, 2, 3].map((k) => <path key={k} d={`M${6 + k * 3} ${28 - k * 3}a${24 - k * 3} ${13 - k * 2} 0 0 1 ${48 - k * 6} 0`} fill="none" stroke={k % 2 ? P.marbleLo : P.marble} strokeWidth="2.6" />)}<rect x="22" y="25" width="16" height="3" fill={P.sandLo} /><g transform="translate(30 13)"><path d="M-6 -4c0 4 1 7 4 7s3-3 3-7c-2 1-5 1-7 0z" fill="#fff" stroke={P.ink} strokeWidth=".4" /><path d="M0 -3c0 4 1 7 4 7s3-3 3-7c-2 1-5 1-7 0z" fill={P.gold} stroke={P.ink} strokeWidth=".4" /><path d="M-4.4 -1.4h1M-2.2 -1.4h1M2 -.4h1M4.2 -.4h1" stroke={P.ink} strokeWidth=".7" /></g></g>,
  aqueduct: () => <g>{sea(29)}<rect x="0" y="6" width="60" height="3" fill={P.stone} stroke={P.stoneLo} strokeWidth=".5" /><rect x="0" y="5" width="60" height="1.4" fill={P.water} />{[0, 1, 2, 3, 4].map((k) => <path key={k} d={`M${k * 12} 9h12v20h-2.4v-12a3.6 3.6 0 0 0-7.2 0v12h-2.4z`} fill={P.stone} stroke={P.stoneLo} strokeWidth=".5" />)}</g>,
  temple: () => <g>{temple(30, 28, 32, 13, 6)}<circle cx="30" cy="16.6" r="0" />{cypress(6, 28, 0.9)}{cypress(54, 28, 0.9)}</g>,
  statue: () => <g><rect x="24" y="20" width="12" height="8" fill={P.marble} stroke={P.marbleLo} strokeWidth=".6" /><rect x="22" y="18.6" width="16" height="1.8" fill={P.marbleLo} /><g fill={P.marble} stroke={P.marbleLo} strokeWidth=".5"><circle cx="30" cy="5" r="2.2" /><path d="M27 8h6l1 6-1.6.4-.4 4.2h-4l-.4-4.2-1.6-.4z" /><path d="M33 8.4l4-3.4.8.8-3.6 4" /></g><path d="M37.6 4.6l1.4-2.4" stroke={P.gold} strokeWidth="1" />{tree(10, 28, 0.8)}{tree(50, 28, 0.8)}</g>,
  rostrum: () => <g><rect x="16" y="18" width="28" height="10" fill={P.marble} stroke={P.marbleLo} strokeWidth=".6" /><path d="M16 18h28l-2-3H18z" fill={P.marbleLo} />{[20, 40].map((x) => <path key={x} d={`M${x} 22l3 2-3 2`} stroke={P.wood} strokeWidth=".9" fill="none" />)}<g fill={P.red}><circle cx="30" cy="9" r="2" /><path d="M27 12h6l1 3h-8z" /></g><g fill={P.stoneLo}>{[8, 12, 48, 52].map((x) => <g key={x}><circle cx={x} cy={22} r={1.4} /><rect x={x - 1.4} y={23.4} width={2.8} height={4.6} /></g>)}</g></g>,
  courthouse: () => <g>{temple(30, 28, 30, 12, 5)}<g transform="translate(30 6)" stroke={P.gold} strokeWidth=".7" fill="none"><path d="M-5 0h10M0 -1v4" /><path d="M-5 0l-1.6 3h3.2zM5 0l-1.6 3h3.2z" fill={P.gold} /></g></g>,
  pantheon: () => <g><rect x="12" y="15" width="36" height="13" fill={P.marble} stroke={P.marbleLo} strokeWidth=".6" /><path d="M14 15a16 12 0 0 1 32 0z" fill={P.marble} stroke={P.marbleLo} strokeWidth=".6" /><rect x="28" y="2.4" width="4" height="1.6" fill={P.marbleLo} />{columns(16, 30, 18, 28, 4)}<path d="M13 18h20l-10-5z" fill={P.marble} stroke={P.marbleLo} strokeWidth=".5" /><path d="M20 9a10 7 0 0 1 20 0" stroke={P.marbleLo} strokeWidth=".5" fill="none" /></g>,
  gardens: () => <g><rect x="10" y="22" width="40" height="6" fill={P.sand} stroke={P.sandLo} strokeWidth=".5" /><rect x="15" y="16" width="30" height="6" fill={P.sand} stroke={P.sandLo} strokeWidth=".5" /><rect x="20" y="10" width="20" height="6" fill={P.sand} stroke={P.sandLo} strokeWidth=".5" />{[10, 15, 20].map((x, r) => Array.from({ length: 5 - r }, (_, k) => <circle key={`${r}${k}`} cx={x + 3 + k * ((40 - r * 10) / (5 - r))} cy={22 - r * 6} r={2.2} fill={k % 2 ? P.leafHi : P.leaf} />))}{[14, 24, 36, 46].map((x) => <path key={x} d={`M${x} 22v4`} stroke={P.leaf} strokeWidth=".9" />)}</g>,
  senate: () => <g><rect x="8" y="16" width="44" height="12" fill={P.marble} stroke={P.marbleLo} strokeWidth=".6" />{columns(11, 49, 18, 28, 9)}<path d="M18 16a12 10 0 0 1 24 0z" fill={P.marble} stroke={P.marbleLo} strokeWidth=".6" /><rect x="7" y="14.6" width="46" height="2" fill={P.marbleLo} /><path d="M30 4v-3" stroke={P.wood} strokeWidth=".6" /><path d="M30 1h4l-1 1 1 1h-4z" fill={P.red} /></g>,
  town_hall: () => <g><rect x="8" y="16" width="44" height="12" fill={P.marble} stroke={P.marbleLo} strokeWidth=".6" /><rect x="24" y="5" width="12" height="11" fill={P.marble} stroke={P.marbleLo} strokeWidth=".6" /><path d="M23 5l7-4 7 4z" fill={P.clay} /><circle cx="30" cy="10" r="2.6" fill="#fff" stroke={P.ink} strokeWidth=".5" /><path d="M30 10v-1.8M30 10h1.4" stroke={P.ink} strokeWidth=".5" />{[12, 18, 40, 46].map((x) => <rect key={x} x={x} y={19} width={3} height={5} fill={P.water} opacity=".7" />)}<rect x="27" y="21" width="6" height="7" fill={P.wood} /><path d="M6 16.4l24-3 24 3z" fill={P.clay} /></g>,
  obelisk: () => <g><path d="M27 28l1.4-22 1.6-2.6 1.6 2.6 1.4 22z" fill={P.sand} stroke={P.sandLo} strokeWidth=".6" /><path d="M30 3.4l1.6 2.6h-3.2z" fill={P.gold} />{[10, 14, 18, 22].map((y) => <path key={y} d={`M29.2 ${y}h1.6`} stroke={P.sandLo} strokeWidth=".6" />)}<rect x="24" y="26" width="12" height="2" fill={P.marbleLo} /><path d="M2 28c6-3 14-3 18 0M40 28c6-3 14-3 18 0" fill={P.sandLo} /><circle cx="48" cy="8" r="4" fill={P.fireHi} opacity=".8" /></g>,
  palace: () => <g><rect x="6" y="14" width="48" height="14" fill={P.marble} stroke={P.marbleLo} strokeWidth=".6" />{[14, 30, 46].map((x, k) => <path key={x} d={`M${x - (k === 1 ? 7 : 5)} 14a${k === 1 ? 7 : 5} ${k === 1 ? 7 : 5} 0 0 1 ${k === 1 ? 14 : 10} 0z`} fill={P.gold} stroke={P.goldLo} strokeWidth=".5" />)}{Array.from({ length: 7 }, (_, k) => <path key={k} d={`M${9.5 + k * 7} 28v-6a1.8 1.8 0 0 1 3.6 0v6`} fill={P.wood} opacity=".75" />)}<path d="M30 7v-4" stroke={P.goldLo} strokeWidth=".6" /></g>,
  sanctuary: () => <g><path d="M4 28c6-10 14-14 26-14s20 4 26 14z" fill={P.stone} /><path d="M10 28c4-6 10-9 20-9s16 3 20 9z" fill={P.leaf} opacity=".7" />{temple(30, 22, 16, 7, 4)}{flame(30, 9, 0.6)}</g>,
  palisade: () => <g>{Array.from({ length: 12 }, (_, k) => <path key={k} d={`M${4 + k * 4.4} 28V${13 + (k % 3)}l2-3 2 3V28z`} fill={k % 2 ? P.woodHi : P.wood} stroke={shade(P.wood, -30)} strokeWidth=".4" />)}<path d="M2 18h56M2 24h56" stroke={shade(P.wood, -35)} strokeWidth=".8" /></g>,
  garrison: () => <g>{[[14, 1.1], [32, 1], [48, 0.9]].map(([x, s]) => <g key={x}><path d={`M${x - 8 * s} 28L${x} ${28 - 13 * s}L${x + 8 * s} 28z`} fill={P.sand} stroke={P.sandLo} strokeWidth=".6" /><path d={`M${x} ${28 - 13 * s}L${x - 2 * s} 28h${4 * s}z`} fill={P.wood} opacity=".6" /><path d={`M${x} ${28 - 13 * s}v-3`} stroke={P.wood} strokeWidth=".6" /><path d={`M${x} ${25 - 13 * s}h3l-1 1 1 1h-3z`} fill={P.red} /></g>)}</g>,
  guard_tower: () => <g>{crenel(23, 9, 14, 19, P.stone, 3)}<rect x="28" y="20" width="4" height="8" rx="2" fill={P.wood} /><rect x="28.6" y="13" width="2.8" height="3.6" fill="#3a2a18" /><path d="M30 7V1" stroke={P.wood} strokeWidth=".6" /><path d="M30 1h5l-1.4 1.4L35 4h-5z" fill={P.red} />{tree(10, 28, 0.8)}{tree(50, 28, 0.7)}</g>,
  stable: () => <g><rect x="34" y="14" width="22" height="14" fill={P.woodHi} stroke={P.wood} strokeWidth=".6" /><path d="M32 15l13-7 13 7z" fill={P.clay} /><rect x="40" y="19" width="10" height="9" fill={P.wood} /><path d="M40 19l10 9M50 19l-10 9" stroke={P.woodHi} strokeWidth=".6" />{horse(18, 28, 1.05, P.wood)}</g>,
  horse_breeders: () => <g>{horse(18, 28, 1.1, P.wood)}{horse(42, 28, 0.85, "#5a3d24")}<path d="M2 22h56" stroke={P.woodHi} strokeWidth=".8" />{[4, 30, 56].map((x) => <rect key={x} x={x} y={20} width="1.4" height="8" fill={P.wood} />)}</g>,
  barracks: () => <g><rect x="6" y="16" width="38" height="12" fill={P.stone} stroke={P.stoneLo} strokeWidth=".6" /><path d="M4 17l21-7 21 7z" fill={P.clay} />{[10, 18, 26, 34].map((x) => <rect key={x} x={x} y={19} width="4" height="5" fill="#3a2a18" />)}{[48, 52, 56].map((x) => <g key={x}><path d={`M${x} 28V10`} stroke={P.wood} strokeWidth=".9" /><path d={`M${x - 1.2} 10.4l1.2-3.4 1.2 3.4z`} fill={P.stone} /></g>)}</g>,
  walls: () => <g>{crenel(0, 14, 60, 14, P.stone, 10)}{[0, 1].map((r) => Array.from({ length: 8 }, (_, k) => <rect key={`${r}${k}`} x={k * 8 + (r % 2) * 4 - 2} y={17 + r * 5} width={7.6} height={4.6} fill="none" stroke={P.stoneLo} strokeWidth=".4" />))}{crenel(24, 8, 12, 20, P.stone, 3)}<rect x="27.4" y="18" width="5.2" height="10" rx="2.6" fill={P.wood} /></g>,
  archery_range: () => <g><g transform="translate(44 18)">{[8, 6, 4, 2].map((r, k) => <circle key={r} r={r} fill={k % 2 ? "#fff" : P.red} stroke={P.ink} strokeWidth=".3" />)}<path d="M0 8v6M-4 14l4-6 4 6" stroke={P.wood} strokeWidth="1" fill="none" /></g><path d="M8 20l34-2" stroke={P.wood} strokeWidth=".8" /><path d="M40.4 16.4l2.6 1.6-2.4 1.8z" fill={P.stoneLo} /><path d="M8 18.4l-2-1.6M8 21.6l-2 1.6" stroke={P.red} strokeWidth=".8" /><path d="M14 10c-6 5-6 15 0 20" stroke={P.wood} strokeWidth="1.3" fill="none" /><path d="M14 10v20" stroke={P.ink} strokeWidth=".4" /></g>,
  fort: () => <g>{crenel(8, 16, 44, 12, P.stone, 7)}{crenel(4, 10, 10, 18, P.stone, 2)}{crenel(46, 10, 10, 18, P.stone, 2)}<path d="M26 28v-6a4 4 0 0 1 8 0v6z" fill={P.wood} /><path d="M9 6h4l-1 1 1 1H9zM47 6h4l-1 1 1 1h-4z" fill={P.red} /><path d="M9 8v2M47 8v2" stroke={P.wood} strokeWidth=".6" /></g>,
  fortifications: () => <g><path d="M0 28l6-6h48l6 6z" fill={P.stoneLo} />{crenel(4, 12, 52, 10, P.stone, 9)}{crenel(0, 6, 12, 16, P.stone, 2)}{crenel(48, 6, 12, 16, P.stone, 2)}{crenel(22, 4, 16, 18, P.stone, 3)}<path d="M27 22v-6a3 3 0 0 1 6 0v6z" fill={P.wood} />{[6, 54].map((x) => <rect key={x} x={x - 0.8} y={12} width={1.6} height={3} fill="#3a2a18" />)}</g>,
  siege_workshop: () => <g><rect x="10" y="22" width="30" height="3" fill={P.wood} />{[14, 36].map((x) => <g key={x}><circle cx={x} cy={26} r={3} fill={P.woodHi} stroke={P.wood} strokeWidth=".7" /><circle cx={x} cy={26} r={0.8} fill={P.wood} /></g>)}<path d="M24 22l-6-10M24 22l4-8" stroke={P.wood} strokeWidth="1.2" /><path d="M18 12L44 4" stroke={P.woodHi} strokeWidth="1.4" strokeLinecap="round" /><path d="M42 2.4c2 0 3.4 1 3.4 2.6s-1.4 2.4-3.4 2.4" fill={P.wood} /><circle cx="52" cy="6" r="2.2" fill={P.stoneLo} /><path d="M48 7l-2 1M49 9l-2 .4" stroke={P.stoneLo} strokeWidth=".5" /></g>,
  circus: () => <g><ellipse cx="30" cy="22" rx="28" ry="7" fill={P.sand} stroke={P.sandLo} strokeWidth=".6" /><rect x="14" y="21" width="32" height="2" rx="1" fill={P.marbleLo} /><path d="M29 21l1-7 1 7z" fill={P.sandLo} /><g transform="translate(46 24) scale(.6)">{horse(0, 0, 1, P.wood)}</g><path d="M50 22a3 3 0 1 0 0.01 0" stroke={P.wood} strokeWidth=".6" fill="none" /><g transform="translate(14 24) scale(.6)">{horse(0, 0, 1, "#5a3d24")}</g></g>,
  arsenal: () => <g><path d="M14 6l30 22M46 6L16 28" stroke={P.stone} strokeWidth="2" strokeLinecap="round" /><path d="M18 9l-4 1M42 9l4 1" stroke={P.gold} strokeWidth="1.6" strokeLinecap="round" /><g transform="translate(30 17)"><path d="M0 -10l9 3v5c0 6-4.4 9-9 10-4.6-1-9-4-9-10v-5z" fill={P.red} stroke={shade(P.red, -30)} strokeWidth=".7" /><path d="M0 -10l9 3v5c0 6-4.4 9-9 10z" fill="#000" opacity=".12" /><circle r="3" fill={P.gold} stroke={P.goldLo} strokeWidth=".5" /></g></g>,
};

const SCI_BUILDING: Partial<Record<string, () => React.ReactNode>> = {
  apothecary: () => <g><rect x="6" y="18" width="12" height="10" fill={P.marble} stroke={P.marbleLo} strokeWidth=".5" /><rect x="42" y="18" width="12" height="10" fill={P.marble} stroke={P.marbleLo} strokeWidth=".5" /></g>,
  library: () => <g>{scroll(4, 20, 10, 6)}{scroll(46, 20, 10, 6)}</g>,
  school: () => <g>{columns(6, 14, 18, 28, 2)}{columns(46, 54, 18, 28, 2)}</g>,
  observatory: () => <g><path d="M4 28a8 8 0 0 1 16 0z" fill={P.marble} stroke={P.marbleLo} strokeWidth=".5" /><path d="M40 28a8 8 0 0 1 16 0z" fill={P.marble} stroke={P.marbleLo} strokeWidth=".5" /><circle cx="50" cy="5" r="0.9" fill="#fff" /><circle cx="8" cy="7" r="0.7" fill="#fff" /></g>,
  university: () => <g>{temple(9, 28, 10, 6, 3)}{temple(51, 28, 10, 6, 3)}</g>,
};

function sceneFor(card: Card): React.ReactNode {
  const m = MOTIF[card.id];
  if (m) return m();
  if (card.sci) {
    const b = SCI_BUILDING[card.id];
    return sciScene(card.sci, b ? b() : <g>{cypress(8, 28, 0.9)}{cypress(52, 28, 0.9)}</g>);
  }
  if (card.guild) {
    const g = card.guild;
    const glyph = g.wonders
      ? <path d="M-5 3L0 -4l5 7z" fill={P.sand} stroke={P.sandLo} strokeWidth=".5" />
      : g.treasury
        ? <g><circle r="3.4" fill={P.gold} stroke={P.goldLo} strokeWidth=".6" /><circle r="1.4" fill="none" stroke={P.goldLo} strokeWidth=".5" /></g>
        : <path d="M0 -4l1.2 2.6 2.8.3-2.1 1.9.6 2.8L0 2.2-2.5 3.6l.6-2.8L-4 -1.1l2.8-.3z" fill={P.gold} />;
    return <g>{cypress(8, 28, 0.9)}{cypress(52, 28, 0.9)}{banner(g.colors ?? ["purple"], glyph)}</g>;
  }
  return temple(30, 28, 28, 12, 5);
}

export function CardArt({ card, w, h }: { card: Card; w: number; h: number }) {
  const id = useId().replace(/:/g, "");
  const [s0, s1] = SKY[card.color];
  return (
    <svg width={w} height={h} viewBox="0 0 60 34" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s0} />
          <stop offset="1" stopColor={s1} />
        </linearGradient>
        <radialGradient id={`vig${id}`} cx=".5" cy=".45" r=".75">
          <stop offset=".6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".28" />
        </radialGradient>
      </defs>
      <rect width="60" height="34" fill={`url(#sky${id})`} />
      <rect y="28" width="60" height="6" fill={GROUND[card.color]} />
      <path d="M0 28h60" stroke="rgba(0,0,0,.18)" strokeWidth=".6" />
      {sceneFor(card)}
      <rect width="60" height="34" fill={`url(#vig${id})`} />
    </svg>
  );
}

const WONDER_SKY: Record<string, [string, string, string]> = {
  pyramids: ["#f6c27a", "#f3e1b1", P.sand],
  sphinx: ["#f0a86a", "#f6dcaa", P.sand],
  colossus: ["#8fc4e6", "#d8ecf5", P.water],
  great_lighthouse: ["#3b4a78", "#e8a77a", P.water],
  great_library: ["#c7d9ea", "#efe6d2", P.sandLo],
  hanging_gardens: ["#a8d4e8", "#eef0cf", "#8fb07a"],
  mausoleum: ["#c4b8e0", "#f2e2cf", P.stone],
  temple_of_artemis: ["#b6d8ee", "#f5ecd6", "#9fb889"],
  statue_of_zeus: ["#d9c088", "#f6ead0", P.marbleLo],
  appian_way: ["#f2b98a", "#f8e3c0", "#9fb070"],
  circus_maximus: ["#f2c88a", "#f8e8c8", P.sandLo],
  piraeus: ["#9cc8e8", "#e6f0f2", P.water],
};

const WONDER_SCENE: Record<string, () => React.ReactNode> = {
  pyramids: () => <g><circle cx="94" cy="16" r="7" fill="#fff4c8" opacity=".9" /><path d="M10 54L36 22l26 32z" fill={P.sand} /><path d="M36 22l26 32H40z" fill={P.sandLo} /><path d="M50 54L76 16l28 38z" fill={P.sand} /><path d="M76 16l28 38H82z" fill={P.sandLo} /><path d="M94 54l12-14 12 14z" fill={P.sandLo} />{[0, 1, 2, 3, 4].map((k) => <path key={k} d={`M${58 + k * 3.6} ${49 - k * 6}h${36 - k * 7}`} stroke={shade(P.sand, -12)} strokeWidth=".5" />)}</g>,
  sphinx: () => <g><path d="M70 54L92 26l22 28z" fill={P.sandLo} opacity=".75" /><path d="M14 54v-8c0-5 4-8 10-8h28c4 0 6-3 6-7v-7c0-4 4-7 8-7s8 3 8 7v9c0 3-2 5-4 5v16z" fill={P.sand} stroke={P.sandLo} strokeWidth=".8" /><path d="M58 18c-4 1-6 5-6 10l6 3M74 18c4 1 6 5 6 10l-6 3" fill="#3f6fa8" opacity=".8" /><path d="M62 26h8M64 30h4" stroke={P.sandLo} strokeWidth=".8" /><path d="M14 54h64" stroke={P.sandLo} strokeWidth="1.4" /><path d="M20 46h10M36 46h12" stroke={P.sandLo} strokeWidth=".6" /></g>,
  colossus: () => <g><rect x="0" y="50" width="120" height="14" fill={P.water} /><path d="M10 54q4-2 8 0t8 0M82 56q4-2 8 0t8 0" stroke={P.waterHi} strokeWidth=".8" fill="none" /><rect x="34" y="44" width="14" height="10" fill={P.stone} /><rect x="72" y="44" width="14" height="10" fill={P.stone} /><g fill="#c9a24a" stroke="#8a6b2a" strokeWidth=".7"><path d="M40 44l14-20h12l14 20h-5l-12-14-2 0-12 14z" /><path d="M54 24V14h12v10z" /><circle cx="60" cy="9" r="4" /><path d="M66 15l10-10 2 2-10 10z" /></g><path d="M56 5l4-4 4 4" stroke="#ffd36a" strokeWidth="1" fill="none" />{flame(77, 5, 0.8)}<path d="M80 52l6-3h18l-4 3z" fill={P.wood} /><path d="M92 49V38l7 10z" fill={P.marble} /></g>,
  great_lighthouse: () => <g><rect x="0" y="50" width="120" height="14" fill={P.water} /><path d="M6 56q4-2 8 0t8 0M90 54q4-2 8 0t8 0" stroke={P.waterHi} strokeWidth=".8" fill="none" /><path d="M42 54V38h36v16z" fill={P.marble} stroke={P.marbleLo} strokeWidth=".7" /><path d="M48 38V24h24v14z" fill={P.marble} stroke={P.marbleLo} strokeWidth=".7" /><path d="M53 24l1-10h12l1 10z" fill={P.marble} stroke={P.marbleLo} strokeWidth=".7" />{[46, 52, 58, 64, 70].map((x) => <rect key={x} x={x} y={43} width="2" height="4" fill={P.marbleLo} />)}{flame(60, 12, 1.4)}<path d="M66 8l54-8v18zM54 8L0 0v18z" fill={P.fireHi} opacity=".28" /><circle cx="18" cy="12" r=".9" fill="#fff" /><circle cx="100" cy="24" r=".7" fill="#fff" /></g>,
  great_library: () => <g><rect x="16" y="22" width="88" height="30" fill={P.marble} stroke={P.marbleLo} strokeWidth=".7" />{columns(22, 98, 26, 52, 9)}<path d="M12 22l48-14 48 14z" fill={P.marble} stroke={P.marbleLo} strokeWidth=".8" /><rect x="12" y="20.6" width="96" height="2.6" fill={P.marbleLo} /><circle cx="60" cy="16" r="3" fill={P.gold} />{[30, 44, 72, 86].map((x) => <g key={x}>{scroll(x - 4, 36, 8, 5)}</g>)}<rect x="10" y="52" width="100" height="3" fill={P.marbleLo} /></g>,
  hanging_gardens: () => <g>{[0, 1, 2, 3].map((k) => <g key={k}><rect x={18 + k * 10} y={50 - k * 11} width={84 - k * 20} height="11" fill={P.sand} stroke={P.sandLo} strokeWidth=".6" />{Array.from({ length: 8 - k * 2 }, (_, j) => <g key={j}><circle cx={22 + k * 10 + j * ((76 - k * 20) / Math.max(1, 7 - k * 2))} cy={50 - k * 11} r="3.4" fill={j % 2 ? P.leafHi : P.leaf} /><path d={`M${22 + k * 10 + j * ((76 - k * 20) / Math.max(1, 7 - k * 2))} ${51 - k * 11}v${5 + (j % 3)}`} stroke={P.leaf} strokeWidth="1" /></g>)}</g>)}{[30, 60, 90].map((x) => <path key={x} d={`M${x} 18c-1 4 1 8 0 12`} stroke={P.waterHi} strokeWidth="1.2" fill="none" opacity=".8" />)}{tree(58, 14, 0.8)}</g>,
  mausoleum: () => <g><rect x="30" y="40" width="60" height="14" fill={P.marble} stroke={P.marbleLo} strokeWidth=".7" /><rect x="36" y="28" width="48" height="12" fill={P.marble} stroke={P.marbleLo} strokeWidth=".7" />{columns(39, 81, 29, 40, 9)}{[0, 1, 2, 3].map((k) => <rect key={k} x={36 + k * 4} y={24 - k * 3} width={48 - k * 8} height="3" fill={P.marbleLo} stroke={P.stoneLo} strokeWidth=".4" />)}<g transform="translate(60 12) scale(.5)">{horse(0, 0, 1, "#8a6b2a")}</g><rect x="26" y="54" width="68" height="2" fill={P.stoneLo} /></g>,
  temple_of_artemis: () => <g>{temple(60, 54, 92, 24, 12)}<g opacity=".55">{columns(22, 98, 36, 50, 9, P.marbleLo)}</g><path d="M60 15l-3 3h6z" fill={P.gold} />{cypress(6, 54, 1.4)}{cypress(114, 54, 1.4)}</g>,
  statue_of_zeus: () => <g>{temple(60, 56, 80, 36, 2)}<rect x="30" y="18" width="60" height="34" fill="#4e3a24" opacity=".85" /><g fill="#d9b456" stroke="#8a6b2a" strokeWidth=".6"><rect x="46" y="38" width="28" height="14" /><circle cx="60" cy="22" r="4.4" /><path d="M52 28h16l2 12H50z" /><path d="M68 30l8 2v-10l2 0v12l-10-1z" /></g><path d="M77 18v26" stroke="#f2cd7c" strokeWidth="1.2" /><path d="M56 19c2-3 6-3 8 0" stroke="#f2cd7c" strokeWidth="1" fill="none" /></g>,
  appian_way: () => <g><path d="M48 64L58 30h4l10 34z" fill="#9a9488" /><path d="M52 64L59 30h2l7 34" stroke="#7c766a" strokeWidth=".6" fill="none" />{[36, 46, 56].map((y, k) => <path key={y} d={`M${57 - k * 3} ${y}h${6 + k * 6}`} stroke="#7c766a" strokeWidth=".5" />)}{[[30, 1.6], [40, 1.2], [48, 0.9], [53, 0.6]].map(([x, s]) => <g key={x}>{cypress(x, 64 - (60 - x) * 0.6, s)}{cypress(120 - x, 64 - (60 - x) * 0.6, s)}</g>)}<rect x="40" y="52" width="3" height="8" fill={P.marble} /><rect x="76" y="52" width="3" height="8" fill={P.marble} /><circle cx="60" cy="18" r="9" fill="#fff4c8" opacity=".8" /></g>,
  circus_maximus: () => <g><ellipse cx="60" cy="44" rx="56" ry="15" fill={P.marble} stroke={P.marbleLo} strokeWidth=".8" /><ellipse cx="60" cy="44" rx="46" ry="10" fill={P.sand} /><rect x="26" y="42" width="68" height="4" rx="2" fill={P.marbleLo} /><path d="M58 42l2-14 2 14z" fill={P.sandLo} />{[30, 90].map((x) => <path key={x} d={`M${x - 2} 42l2-5 2 5z`} fill={P.gold} />)}<g transform="translate(40 52) scale(.7)">{horse(0, 0, 1, "#5a3d24")}</g><g transform="translate(82 38) scale(.6)">{horse(0, 0, 1, P.wood)}</g></g>,
  piraeus: () => <g><rect x="0" y="40" width="120" height="24" fill={P.water} /><path d="M0 40h44v6H0zM76 40h44v6H76z" fill={P.stone} stroke={P.stoneLo} strokeWidth=".6" />{[8, 20, 32, 84, 96, 108].map((x) => <rect key={x} x={x} y={30} width="8" height="10" fill={P.marble} stroke={P.marbleLo} strokeWidth=".5" />)}<path d="M6 30l6-4 6 4M18 30l6-4 6 4M82 30l6-4 6 4M94 30l6-4 6 4" fill={P.clay} />{ship(60, 50, 1.5)}{ship(28, 56, 0.9)}{ship(96, 56, 0.8)}<path d="M4 54q4-2 8 0t8 0M100 60q4-2 8 0" stroke={P.waterHi} strokeWidth=".8" fill="none" /></g>,
};

export function WonderArt({ id, w, h, dim }: { id: string; w: number | string; h: number | string; dim?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const [s0, s1, ground] = WONDER_SKY[id] ?? ["#cfe2f3", "#f3ead6", P.sand];
  const scene = WONDER_SCENE[id];
  return (
    <svg width={w} height={h} viewBox="0 0 120 64" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
      style={{ display: "block", filter: dim ? "grayscale(.85) brightness(.62) contrast(.9)" : "none", transition: "filter .4s" }}>
      <defs>
        <linearGradient id={`ws${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s0} />
          <stop offset="1" stopColor={s1} />
        </linearGradient>
        <radialGradient id={`wv${uid}`} cx=".5" cy=".4" r=".8">
          <stop offset=".55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".38" />
        </radialGradient>
      </defs>
      <rect width="120" height="64" fill={`url(#ws${uid})`} />
      <rect y="54" width="120" height="10" fill={ground} />
      {scene ? scene() : null}
      <rect width="120" height="64" fill={`url(#wv${uid})`} />
    </svg>
  );
}

const TOKEN_GLYPH: Record<string, React.ReactNode> = {
  agriculture: <g fill="none" stroke="#f6e7b0" strokeWidth="1.3" strokeLinecap="round"><path d="M12 20V7" />{[8, 11, 14].map((y) => <g key={y}><path d={`M12 ${y}c-2.6-.4-3.6-2-3.8-3.6M12 ${y}c2.6-.4 3.6-2 3.8-3.6`} /></g>)}</g>,
  architecture: <g fill="none" stroke="#f6e7b0" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4l-5 15M12 4l5 15" /><circle cx="12" cy="4.6" r="1.4" fill="#f6e7b0" /><path d="M8.4 14h7.2" /></g>,
  economy: <g><circle cx="10" cy="13" r="5" fill="#f2cd7c" stroke="#8f6a26" strokeWidth=".8" /><circle cx="14.4" cy="10.6" r="5" fill="#f6dc9c" stroke="#8f6a26" strokeWidth=".8" /><path d="M14.4 8v5.2" stroke="#8f6a26" strokeWidth="1" /></g>,
  law: <g transform="translate(4 4)">{SCI.law.parts.map((part) => <path key={part.d} d={part.d} fill={part.w ? "none" : "#f6e7b0"} stroke={part.w ? "#f6e7b0" : "none"} strokeWidth={part.w} strokeLinecap="round" />)}</g>,
  masonry: <g fill="#f6e7b0" stroke="#2f5a3f" strokeWidth=".5">{[[5, 14], [12, 14], [8.5, 9.6], [15.5, 9.6]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="6.4" height="4" rx=".6" />)}<path d="M5 8l3-3 2 2-3 3z" /></g>,
  mathematics: <g fill="none" stroke="#f6e7b0" strokeWidth="1.3" strokeLinejoin="round"><path d="M5 19h14L5 6z" /><path d="M5 15.4h3.6V19" strokeWidth=".9" /><circle cx="15.4" cy="8" r="2.6" strokeWidth=".9" /></g>,
  philosophy: <g fill="none" stroke="#f6e7b0" strokeWidth="1.2" strokeLinecap="round"><path d="M12 19c-4 0-6-3-6-7 0-4 2.6-7 6-7s6 3 6 7c0 4-2 7-6 7z" fill="rgba(246,231,176,.12)" /><circle cx="9.8" cy="11" r="1.6" fill="#f6e7b0" /><circle cx="14.2" cy="11" r="1.6" fill="#f6e7b0" /><path d="M11 14.4l1 1.2 1-1.2M8 5.4L9 7.4M16 5.4l-1 2" /></g>,
  strategy: <g fill="#f6e7b0" stroke="#2f5a3f" strokeWidth=".5"><path d="M6 15c0-5 2.6-9 6-9s6 4 6 9v2h-3.6v-4h-4.8v4H6z" /><path d="M12 6V3.4c3 0 5 .8 6 2.4" fill="none" stroke="#e8867f" strokeWidth="1.6" /></g>,
  theology: <g><circle cx="12" cy="12" r="3.6" fill="#f6e7b0" />{Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2; return <path key={k} d={`M${12 + Math.cos(a) * 5.4} ${12 + Math.sin(a) * 5.4}L${12 + Math.cos(a) * 8} ${12 + Math.sin(a) * 8}`} stroke="#f6e7b0" strokeWidth="1.3" strokeLinecap="round" />; })}</g>,
  urbanism: <g fill="#f6e7b0" stroke="#2f5a3f" strokeWidth=".4"><rect x="4.6" y="11" width="4.4" height="8" /><rect x="9.6" y="6" width="5" height="13" /><rect x="15.2" y="9" width="4.4" height="10" /><path d="M11 9h2M11 12h2M11 15h2" stroke="#2f5a3f" strokeWidth=".8" /></g>,
};

export function TokenDisc({ id, size = 34, glow }: { id: string; size?: number; glow?: boolean }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto", filter: `drop-shadow(0 2px 2px rgba(0,0,0,.5))${glow ? " drop-shadow(0 0 6px rgba(127,214,168,.7))" : ""}` }}>
      <defs>
        <radialGradient id={`td${uid}`} cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#6aa57c" />
          <stop offset=".7" stopColor="#3d6b4c" />
          <stop offset="1" stopColor="#2a4d36" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11.4" fill={`url(#td${uid})`} stroke="#c9a24a" strokeWidth="1" />
      <circle cx="12" cy="12" r="9.6" fill="none" stroke="#9fd0ad" strokeWidth=".4" opacity=".6" />
      {TOKEN_GLYPH[id]}
    </svg>
  );
}

export function Crest({ seat, size = 26 }: { seat: number; size?: number }) {
  const uid = useId().replace(/:/g, "");
  const c = PLAYER[seat % 2];
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 24 28" aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto", filter: "drop-shadow(0 2px 2px rgba(0,0,0,.55))" }}>
      <defs>
        <linearGradient id={`cr${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.light} />
          <stop offset=".45" stopColor={c.main} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
      </defs>
      <path d="M12 1l10 3.4v9c0 7-5 11.6-10 13.4C7 25 2 20.4 2 13.4v-9z" fill={`url(#cr${uid})`} stroke="#e0b45e" strokeWidth="1.2" />
      {seat % 2 === 0
        ? <g fill="#fff8e6" opacity=".95"><circle cx="12" cy="12.4" r="3.4" />{Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2; return <path key={k} d={`M${12 + Math.cos(a) * 4.6} ${12.4 + Math.sin(a) * 4.6}L${12 + Math.cos(a + 0.2) * 6.8} ${12.4 + Math.sin(a + 0.2) * 6.8}L${12 + Math.cos(a - 0.2) * 6.8} ${12.4 + Math.sin(a - 0.2) * 6.8}z`} />; })}</g>
        : <g fill="#fff8e6" opacity=".95"><path d="M7 19V10l2-1.4V7h1.6v1.2h2.8V7H15v1.6l2 1.4v9z" /><rect x="10.6" y="14" width="2.8" height="5" rx="1.4" fill={c.dark} /></g>}
    </svg>
  );
}

export function Laurel({ n, size = 30, color = "#e0b45e" }: { n: number | string; size?: number; color?: string }) {
  const leaves = [] as React.ReactNode[];
  for (const side of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const a = (100 + k * 24) * (Math.PI / 180);
      const y = 16 + Math.sin(a) * 11.5;
      const lx = side < 0 ? 16 + Math.cos(a) * 11.5 : 32 - (16 + Math.cos(a) * 11.5);
      const deg = (side < 0 ? 100 + k * 24 + 90 : -(100 + k * 24 + 90)) + (side < 0 ? 20 : -20);
      leaves.push(<ellipse key={`${side}${k}`} cx={lx} cy={y} rx="1.7" ry="3.6" transform={`rotate(${deg} ${lx} ${y})`} fill={color} opacity={0.75 + k * 0.05} />);
    }
  }
  return (
    <span style={{ position: "relative", width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 1px 1px rgba(0,0,0,.55))" }}>
        <path d="M14 28.4A12 12 0 0 1 5.2 9.6M18 28.4a12 12 0 0 0 8.8-18.8" stroke={shade(color, -25)} strokeWidth="1.1" fill="none" strokeLinecap="round" />
        {leaves}
        <circle cx="16" cy="16" r="8.4" fill="rgba(12,18,20,.72)" stroke={color} strokeWidth=".7" />
      </svg>
      <b style={{ position: "relative", fontSize: size * 0.36, color: "#f6ecd2", fontWeight: 800, textShadow: "0 1px 2px rgba(0,0,0,.7)", lineHeight: 1 }}>{n}</b>
    </span>
  );
}

type IconName = "shield" | "hammer" | "coins" | "pyramid" | "deck" | "sword" | "scroll" | "crown" | "book" | "flask" | "chain" | "lock";

export function Icon({ name, size = 16, color = "currentColor" }: { name: IconName; size?: number; color?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    shield: <path d="M11 2l7 2.6v5.4c0 5-3.4 8.4-7 9.6-3.6-1.2-7-4.6-7-9.6V4.6z" fill={color} />,
    hammer: <g><path d="M3 7l5-5 4 2-2 2 7 7-2.6 2.6-7-7-2 2z" fill={color} /><path d="M10.6 11.4l8 8.6" stroke={color} strokeWidth="2.6" strokeLinecap="round" /></g>,
    coins: <g fill={color}><ellipse cx="9" cy="15" rx="6" ry="2.6" /><ellipse cx="9" cy="12" rx="6" ry="2.6" opacity=".85" /><ellipse cx="13" cy="7.6" rx="6" ry="2.6" opacity=".7" /></g>,
    pyramid: <g><path d="M2 19L11 4l9 15z" fill={color} /><path d="M11 4l9 15h-6z" fill="#000" opacity=".25" /></g>,
    deck: <g fill="none" stroke={color} strokeWidth="1.6"><rect x="6" y="3" width="11" height="15" rx="2" /><path d="M3 7v11a2 2 0 0 0 2 2h9" /></g>,
    sword: <g stroke={color} strokeWidth="1.8" strokeLinecap="round"><path d="M4 18L17 5M17 5l1.4-1.4M7 12l3 3M5 19l-1.4 1.4" /></g>,
    scroll: <g fill="none" stroke={color} strokeWidth="1.5"><path d="M6 4h11v14a2 2 0 0 1-2 2H5" /><path d="M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h0" /><path d="M9 8h5M9 11h5M9 14h3" /></g>,
    crown: <g><path d="M3 17L2 6l5 4 4-6 4 6 5-4-1 11z" fill={color} /><rect x="3" y="18" width="16" height="2.4" rx="1" fill={color} /></g>,
    book: <g fill="none" stroke={color} strokeWidth="1.5"><path d="M11 6c-2-2-5-2-8-1v13c3-1 6-1 8 1 2-2 5-2 8-1V5c-3-1-6-1-8 1z" /><path d="M11 6v13" /></g>,
    flask: <g fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"><path d="M9 3h4v5l5 9a2 2 0 0 1-1.8 3H5.8A2 2 0 0 1 4 17l5-9z" /><path d="M6.6 14h8.8" /></g>,
    chain: <g fill="none" stroke={color} strokeWidth="1.8"><rect x="2" y="8" width="10" height="6" rx="3" /><rect x="10" y="8" width="10" height="6" rx="3" /></g>,
    lock: <g><rect x="5" y="10" width="12" height="9" rx="2" fill={color} /><path d="M8 10V7a3 3 0 0 1 6 0v3" stroke={color} strokeWidth="1.8" fill="none" /></g>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
      {paths[name]}
    </svg>
  );
}

export function Capital({ seat, size = 34 }: { seat: number; size?: number }) {
  const c = PLAYER[seat % 2];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ display: "block", flex: "0 0 auto", filter: "drop-shadow(0 2px 2px rgba(0,0,0,.5))" }}>
      <path d="M3 30V14l3-2 3 2v-4l3-2 3 2V5l1-3 1 3v5l3-2 3 2v4l3-2 3 2v16z" fill={c.main} stroke={c.dark} strokeWidth="1" />
      <path d="M14 30v-6a2 2 0 0 1 4 0v6z" fill={c.dark} />
      <path d="M16 2V-1" stroke="#e0b45e" strokeWidth="1" />
      <rect x="6" y="17" width="2" height="3" fill={c.dark} /><rect x="24" y="17" width="2" height="3" fill={c.dark} />
      <path d="M3 30h26" stroke="#e0b45e" strokeWidth="1.2" />
    </svg>
  );
}

export function Pawn({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 20 24" aria-hidden="true" style={{ display: "block", filter: "drop-shadow(0 3px 3px rgba(0,0,0,.7))" }}>
      <defs>
        <linearGradient id="duelPawnG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8675c" />
          <stop offset="1" stopColor="#7a221c" />
        </linearGradient>
      </defs>
      <ellipse cx="10" cy="21.6" rx="8" ry="2.2" fill="#5a1914" />
      <path d="M3 21c0-3 2-5 4-6-2-1.4-3-3.4-3-5.6C4 5.6 6.6 2 10 2s6 3.6 6 7.4c0 2.2-1 4.2-3 5.6 2 1 4 3 4 6z" fill="url(#duelPawnG)" stroke="#3d0f0b" strokeWidth=".8" />
      <path d="M6 8c.4-2.4 2-4 4-4" stroke="#ffc3b8" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity=".8" />
      <path d="M10 2v-2M8 1h4" stroke="#e0b45e" strokeWidth="1" />
    </svg>
  );
}

export function describeCard(card: Card): string[] {
  const out: string[] = [];
  for (const [r, n] of Object.entries(card.prod ?? {})) out.push(`Produces ${n} ${r}`);
  if (card.prodChoice) out.push(`Produces one of ${card.prodChoice.join(" / ")} each turn`);
  if (card.shields) out.push(`${card.shields} shield${card.shields > 1 ? "s" : ""}: moves the pawn toward your rival`);
  if (card.sci) out.push(`Science symbol: ${SCI[card.sci].label}`);
  if (card.gainCoins) out.push(`+${card.gainCoins} coins now`);
  if (card.fixTrade) out.push(`Buy ${card.fixTrade.join(" and ")} for 1 coin each`);
  if (card.coinsPer) out.push(`+${card.coinsPer.n} coins per ${card.coinsPer.colors.join("/")} card you own`);
  if (card.coinsPerWonder) out.push(`+${card.coinsPerWonder} coins per Wonder you built`);
  if (card.guild) {
    const g = card.guild;
    out.push(g.treasury ? "1 VP per 3 coins in the richest treasury" : g.wonders ? "2 VP per Wonder in the leading city" : `1 coin and 1 VP per ${(g.colors ?? []).join("/")} card in the leading city`);
  }
  if (card.vp) out.push(`${card.vp} victory point${card.vp > 1 ? "s" : ""}`);
  return out;
}

interface AgeTint { a: string; b: string; rim: string; label: string }
const FIRST_AGE: AgeTint = { a: "#7a5634", b: "#4e3520", rim: "#e0b45e", label: "I" };
const AGE_TINT: Record<number, AgeTint> = {
  0: { a: "#5b3f6e", b: "#3a2747", rim: "#b48fd6", label: "G" },
  1: FIRST_AGE,
  2: { a: "#2f5f86", b: "#1f3d58", rim: "#a9d0f2", label: "II" },
  3: { a: "#6a3a5e", b: "#43223b", rim: "#e8a6c8", label: "III" },
};


function city(x: number, base: number, seat: number, flip: boolean) {
  const c = PLAYER[seat];
  const d = flip ? -1 : 1;
  const bx = (v: number) => x + v * d;
  return (
    <g>
      <path d={`M${bx(0)} ${base}V${base - 30}l${4 * d} -4 ${4 * d} 4V${base - 18}h${10 * d}V${base - 24}l${6 * d} -8 ${6 * d} 8V${base - 14}h${8 * d}V${base}z`} fill={shade(c.dark, -10)} />
      <path d={`M${bx(30)} ${base}V${base - 20}h${22 * d}V${base}z`} fill={c.dark} />
      <path d={`M${bx(28)} ${base - 20}l${13 * d} -9 ${13 * d} 9z`} fill={c.main} />
      {columns(Math.min(bx(32), bx(50)), Math.max(bx(32), bx(50)), base - 18, base - 2, 5, shade(c.light, -10))}
      <path d={`M${bx(4)} ${base - 34}v-8`} stroke={P.gold} strokeWidth=".8" />
      <path d={`M${bx(4)} ${base - 42}h${7 * d}l${-2 * d} 2 ${2 * d} 2h${-7 * d}z`} fill={c.main} />
      {[10, 16, 40].map((v) => <rect key={v} x={Math.min(bx(v), bx(v + 2))} y={base - 10} width="2" height="3" fill={P.fireHi} opacity=".85" />)}
    </g>
  );
}

export function LobbyScene({ width = 520 }: { width?: number }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 260 110" width={width} style={{ display: "block", maxWidth: "100%", height: "auto", borderRadius: 14 }} aria-hidden="true">
      <defs>
        <linearGradient id={`ls${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2b44" />
          <stop offset=".55" stopColor="#7a4a52" />
          <stop offset=".85" stopColor="#e09a5c" />
          <stop offset="1" stopColor="#f2c27a" />
        </linearGradient>
        <radialGradient id={`lsun${uid}`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff4c8" />
          <stop offset=".5" stopColor="#ffd58a" stopOpacity=".7" />
          <stop offset="1" stopColor="#ffd58a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`lg${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3424" />
          <stop offset="1" stopColor="#1a1810" />
        </linearGradient>
      </defs>
      <rect width="260" height="110" fill={`url(#ls${uid})`} />
      {Array.from({ length: 26 }, (_, k) => <circle key={k} cx={(k * 53) % 260} cy={(k * 29) % 40} r={k % 3 ? .5 : .9} fill="#fff" opacity={.4 + (k % 4) * .12} />)}
      <circle cx="130" cy="78" r="34" fill={`url(#lsun${uid})`} />
      <circle cx="130" cy="78" r="11" fill="#fff0c0" />
      <path d="M96 84L114 62l18 22z" fill="#5a4630" opacity=".7" />
      <path d="M126 84l14-17 14 17z" fill="#4a3a28" opacity=".75" />
      <path d="M0 84c40-6 80-8 130-8s90 2 130 8v26H0z" fill={`url(#lg${uid})`} />
      {city(8, 86, 0, false)}
      {city(252, 86, 1, true)}
      <path d="M70 96h120" stroke="#5a4a30" strokeWidth="5" strokeLinecap="round" />
      {Array.from({ length: 13 }, (_, k) => <path key={k} d={`M${72 + k * 9.6} 94v4`} stroke="#2a2214" strokeWidth=".8" />)}
      <path d="M70 96h56" stroke={PLAYER[0].main} strokeWidth="1.2" opacity=".7" />
      <path d="M134 96h56" stroke={PLAYER[1].main} strokeWidth="1.2" opacity=".7" />
      <g transform="translate(130 92)">
        <ellipse cy="5" rx="4" ry="1.2" fill="#000" opacity=".5" />
        <path d="M-3 4c0-2 1-3 2-3.4-1-.8-1.6-2-1.6-3.2C-2.6-4.6-1.4-6.4 0-6.4s2.6 1.8 2.6 3.8c0 1.2-.6 2.4-1.6 3.2 1 .4 2 1.4 2 3.4z" fill="#c8453c" stroke="#3d0f0b" strokeWidth=".4" />
      </g>
      {[[60, 1], [200, 1], [44, .8], [216, .8]].map(([x, s]) => <g key={x}>{cypress(x, 88, s)}</g>)}
    </svg>
  );
}

export const ageTint = (age: number) => AGE_TINT[age] ?? FIRST_AGE;

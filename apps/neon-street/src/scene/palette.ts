export const NEON = {
  pink: '#ff2e88',
  magenta: '#ff3df2',
  cyan: '#23e6ff',
  aqua: '#3cffd0',
  amber: '#ffb03a',
  red: '#ff3b3b',
  violet: '#8a5bff',
  white: '#fff4fb',
} as const;

export const NEON_CYCLE = [NEON.pink, NEON.cyan, NEON.magenta, NEON.amber, NEON.aqua, NEON.violet, NEON.red] as const;

export const ATMOSPHERE = {
  zenith: '#04030b',
  upper: '#0c0822',
  mid: '#2a0f3d',
  horizon: '#6a1d57',
  pollution: '#ff5a8a',
  fog: '#2b1a45',
  fogWarm: '#5a2352',
  night: '#07060f',
  concrete: '#11101a',
} as const;

export const SAKURA = ['#ffd3e6', '#ffb8d6', '#ff9cc6', '#ffc6de', '#ffe4ef', '#f98bbb'] as const;

export const SIGNS_JP = ['酒場', 'ホテル', '夜桜', '電脳', 'ラーメン', '居酒屋', '薬', '質屋', 'カラオケ', '寿司', '新宿', '二十四時'] as const;

export const SIGNS_EN = ['RAMEN', 'BAR 24H', 'HOTEL', 'CYBERWARE', 'NOODLES', 'KARAOKE', 'PACHINKO', 'OPEN', 'SAKE', 'CLINIC'] as const;

export const SIGN_FONT_JP = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';

export const SIGN_FONT_EN = '"Chakra Petch", "Arial Narrow", sans-serif';

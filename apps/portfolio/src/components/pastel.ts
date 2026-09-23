const CHIPS = [
    'bg-[#ece2fb] text-[#4b3496]',
    'bg-[#dcf5ea] text-[#1f6b54]',
    'bg-[#ffe0ee] text-[#942c62]',
    'bg-[#dcecff] text-[#1e5a96]',
    'bg-[#ffe9d2] text-[#83460f]',
];

export const chipClass = (index: number) => CHIPS[index % CHIPS.length];

const ACCENTS = ['#a98bff', '#4fd8b4', '#ff8fc7', '#6ec9ff', '#f7b955'];

export const accentColor = (index: number) => ACCENTS[index % ACCENTS.length];

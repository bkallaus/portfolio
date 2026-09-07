export type StandardAttribute = {
  label: string;
  value: string;
};

export type Category = {
  id: string;
  title: string;
  type: 'standard' | 'iv' | 'cp' | 'range';
  attributes?: StandardAttribute[];
  color?: string; // e.g., 'matcha', 'slushie'
};

export const categories: Category[] = [
  {
    id: 'special',
    title: 'Special',
    type: 'standard',
    color: 'lemon',
    attributes: [
      { label: 'Shiny', value: 'shiny' },
      { label: 'Legendary', value: 'legendary' },
      { label: 'Mythical', value: 'mythical' },
      { label: 'Ultra Beast', value: 'ultra beast' },
      { label: 'Shadow', value: 'shadow' },
      { label: 'Purified', value: 'purified' },
      { label: 'Costume', value: 'costume' },
      { label: 'Hatched', value: 'hatched' },
      { label: 'Traded', value: 'traded' },
      { label: 'Lucky', value: 'lucky' },
      { label: 'Special BG', value: 'specialbackground' },
      { label: 'Location BG', value: 'locationbackground' },
    ],
  },
  {
    id: 'iv',
    title: 'Appraisal (IV)',
    type: 'iv',
    color: 'ube',
  },
  {
    id: 'stats',
    title: 'Combat Power (CP)',
    type: 'cp',
    color: 'slushie',
  },
  {
    id: 'types',
    title: 'Types',
    type: 'standard',
    color: 'matcha',
    attributes: [
      { label: 'Normal', value: 'normal' },
      { label: 'Fire', value: 'fire' },
      { label: 'Water', value: 'water' },
      { label: 'Grass', value: 'grass' },
      { label: 'Electric', value: 'electric' },
      { label: 'Ice', value: 'ice' },
      { label: 'Fighting', value: 'fighting' },
      { label: 'Poison', value: 'poison' },
      { label: 'Ground', value: 'ground' },
      { label: 'Flying', value: 'flying' },
      { label: 'Psychic', value: 'psychic' },
      { label: 'Bug', value: 'bug' },
      { label: 'Rock', value: 'rock' },
      { label: 'Ghost', value: 'ghost' },
      { label: 'Dragon', value: 'dragon' },
      { label: 'Dark', value: 'dark' },
      { label: 'Steel', value: 'steel' },
      { label: 'Fairy', value: 'fairy' },
    ],
  },
  {
    id: 'regions',
    title: 'Regions',
    type: 'standard',
    attributes: [
      { label: 'Kanto', value: 'kanto' },
      { label: 'Johto', value: 'johto' },
      { label: 'Hoenn', value: 'hoenn' },
      { label: 'Sinnoh', value: 'sinnoh' },
      { label: 'Unova', value: 'unova' },
      { label: 'Kalos', value: 'kalos' },
      { label: 'Alola', value: 'alola' },
      { label: 'Galar', value: 'galar' },
      { label: 'Hisui', value: 'hisui' },
      { label: 'Paldea', value: 'paldea' },
    ],
  },
  {
    id: 'range',
    title: 'Other Ranges',
    type: 'range',
  }
];

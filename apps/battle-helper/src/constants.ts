import { PokemonConfig } from './types';

export const defaultStats = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
export const defaultEVs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
export const defaultBoosts = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

export const defaultP1: PokemonConfig = {
  species: "Pikachu",
  nature: "Serious",
  ivs: { ...defaultStats },
  evs: { ...defaultEVs },
  boosts: { ...defaultBoosts },
  level: 50,
  moves: [],
};

export const defaultP2: PokemonConfig = {
  species: "Charizard",
  nature: "Serious",
  ivs: { ...defaultStats },
  evs: { ...defaultEVs },
  boosts: { ...defaultBoosts },
  level: 50,
  moves: [],
};

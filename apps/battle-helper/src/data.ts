import { Dex } from '@pkmn/dex';

export const allSpecies = Array.from(Dex.species.all()).filter(s => s.num > 0);
export const allMoves = Array.from(Dex.moves.all()).filter(m => !m.isZ && !m.isMax);
export const allTypes = Array.from(Dex.types.all()).filter(t => t.name !== "Stellar").map(t => t.name);
export const allNatures = Array.from(Dex.natures.all());

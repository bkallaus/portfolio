# Potential Features & Implementation Guide

This document outlines several high-impact features that can significantly improve the user experience of this Pokémon Battle Simulator/Helper. It also provides high-level implementation details for each feature based on the current architecture using `@smogon/calc`, `@pkmn/dex`, React, and Vite.

## 1. Fast Setup & Teambuilding

### Showdown Text Import/Export
**Concept:** Allow users to paste standard Pokémon Showdown formats (or Poképastes) to instantly load a Pokémon’s EVs, IVs, Nature, Ability, Item, and Moves.
**Implementation:**
- Add a new UI component (`ShowdownImportExport.tsx`) with a text area.
- Use a parsing library like `@smogon/sets` (part of the smogon toolset) or write a custom regex-based parser to read Showdown text blocks.
- Map the parsed data (species, item, ability, EVs, IVs, nature, moves) into the application's local state for the active Pokémon.
- For exporting, reverse the process by taking the current Pokémon state and formatting it into a Showdown-compatible string.

### Meta Suggestions / Auto-fill
**Concept:** Auto-suggest popular EV spreads, items, or moves when a user selects a Pokémon based on current meta usage statistics.
**Implementation:**
- Fetch data from Smogon's usage stats API (or a static JSON snapshot of popular sets).
- Integrate an autocomplete feature into the Move and Item selection inputs.
- When a user selects a species, provide a "Load Popular Set" button that populates fields based on the fetched data.

### Saved Custom Sets
**Concept:** Let users save custom Pokémon builds or entire teams using `localStorage` so they persist across sessions.
**Implementation:**
- Create a `CustomSetsManager` utility that interfaces with `window.localStorage`.
- Add "Save Set" and "Load Set" buttons to the Pokémon configuration UI.
- Serialize the Pokémon state (species, EVs, IVs, nature, moves, etc.) into JSON before saving.

---

## 2. Advanced Battle Calculations

### Speed Tier Visualizer
**Concept:** A dynamic list showing the exact Speed stats of all Pokémon currently loaded, re-ordered based on real-time modifiers.
**Implementation:**
- Create a `SpeedTiers.tsx` component.
- Calculate the effective speed for each Pokémon: `base_speed * nature_modifier * EV/IV_formula * stage_modifier * item_modifier (e.g., Choice Scarf) * field_modifier (e.g., Tailwind)`.
- `@smogon/calc` provides utilities for calculating stats; use `calc.Stats.calcStat` or equivalent.
- Sort the list of Pokémon by effective speed descending and display it visually.

### Damage Probability Breakdowns
**Concept:** Instead of just min/max damage, show the probability of an OHKO or 2HKO (e.g., "12.5% chance to OHKO").
**Implementation:**
- `@smogon/calc` natively outputs damage arrays (16 possible rolls).
- To calculate OHKO chance: Count how many of the 16 rolls are greater than or equal to the defender's current HP, then divide by 16.
- For 2HKO, the math is slightly more complex, but standard calculation logic (sum of two rolls vs HP) can be applied.
- Display this clearly below the standard damage range in the `DamageResult` component.

### "One vs. All" / "All vs. One" Modes
**Concept:** Allow a user to lock in their active Pokémon and see how much damage their main attack does against a predefined list of meta Pokémon.
**Implementation:**
- Create a new view/mode (`OneVsAll.tsx`).
- Iterate over a list of predefined "Meta" Pokémon sets.
- Call the `@smogon/calc` `calculate()` function in a loop: `calculate(gen, attacker, metaDefender, move, field)`.
- Render the results in a table, highlighting guaranteed OHKOs and 2HKOs.

---

## 3. Field & State Management

### Global Field Toggles
**Concept:** A centralized control panel for global battle states like Weather, Terrain, and field hazards.
**Implementation:**
- Add a `FieldState` context or global state slice (Zustand/Redux or React Context).
- Map UI toggles (e.g., "Rain", "Electric Terrain") to the `Field` object required by `@smogon/calc`.
- Ensure that selecting a new weather overrides the previous one (mutually exclusive).

### Side-Specific Modifiers
**Concept:** Toggles for Reflect, Light Screen, Aurora Veil, Tailwind, and Helping Hand.
**Implementation:**
- Expand the `FieldState` to include `attackerSide` and `defenderSide` properties.
- Update the `@smogon/calc` `calculate` call to pass these side conditions.
- Group these toggles visually near the respective Pokémon's stat block.

### Mechanic-Specific Toggles (Gen 9 Terastallization)
**Concept:** A toggle to activate Terastallization, instantly updating the Pokémon's type and recalculating STAB.
**Implementation:**
- Add a `teraType` dropdown and a "Terastallize" checkbox to the Pokémon state.
- When calculating damage, if Terastallized, pass the `teraType` to the `Pokemon` object in `@smogon/calc`. The calculator natively handles the modified STAB (e.g., 2x or 1.5x) and defensive typing changes.

---

## 4. Synergy & Type Coverage

### Defensive Synergy Matrix
**Concept:** A visual grid showing the team's combined weaknesses and resistances.
**Implementation:**
- Iterate over the team's Pokémon and use `@pkmn/dex` to get their types.
- For each Pokémon, calculate damage multipliers from all 18 types.
- Aggregate these into a table where rows are attacking types and columns are team members. Color-code cells (e.g., red for 2x/4x weakness, green for 0.5x/0.25x resistance/immunity).

### Offensive Coverage Checker
**Concept:** A tool highlighting which Pokémon types the current team *cannot* hit for super-effective damage.
**Implementation:**
- Gather all attacking moves across the team.
- For each of the 18 types, check if any move in the team's arsenal deals >1x damage to a pure Pokémon of that type.
- Display a list of types that are "Uncovered" to prompt the user to adjust their movesets.

# Phase 2: Architectural Approaches

## Problem 1: Phantom Buildings
*Absorbed buildings remain logically in the grid during their 0.5s slide animation.*

* **Path 1 (Standard):** Manually clear `city.grid[x][z]` and decrement `buildingCount` within the merge loop. Call `scene.remove()` upon animation completion. (Pros: Clear intent. Cons: Duplicates `city.remove` logic.)
* **Path 2 (Minimalist - Selected):** Detach the mesh (`city.meshGrid[x][z] = null`) and immediately call `city.remove(x, z)`. This clears logical data synchronously but skips the default shrink animation, allowing the GSAP slide to play before `scene.remove()`. (Pros: Zero logic duplication, perfectly surgical.)
* **Path 3 (Lateral):** Add `isMerging = true` to cell data. Filter out merging cells in all raycasting and game tick loops. (Pros: Preserves data until visually gone. Cons: Spreads state-checking logic across 4 different functions.)

## Problem 2: Obstacle Removal
*Adjacent rocks (tier -2) are not cleared when a match-3 occurs.*

* **Path 1 (Standard - Selected):** Iterate through the final `cluster` array before animating. Check 4 orthogonal neighbors for `tier === -2`. Collect unique obstacle coordinates in a Set and call `city.remove()` on them. (Pros: Highly localized, easy to reason about.)
* **Path 2 (Minimalist):** Inject the obstacle check directly into the existing BFS `while` loop. If a neighbor is `tier === -2`, destroy it instantly. (Pros: Single loop pass. Cons: Might over-destroy if the cluster size ends up being < 3, requiring rollback logic.)
* **Path 3 (Lateral):** Modify `updateRoads()` to act as a generic "grid cleanup" sweep that runs after every merge, sweeping for unattached obstacles. (Pros: Consolidates cleanup. Cons: Doesn't make logical sense for rocks, changes mechanics entirely.)

**Decision:** I am proceeding with Path 2 for Phantom Buildings and Path 1 for Obstacle Removal to maintain surgical precision and strict adherence to the zero-build-step, vanilla JS constraints.

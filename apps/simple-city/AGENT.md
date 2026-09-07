# AGENT.md - Pop City Project Context

## Project Overview
**Pop City** is a browser-based, isometric 3D city-building puzzle game.
- **Goal:** Build a thriving city by placing and merging buildings.
- **Core Mechanic:** Match-3 style merging. Placing 3 buildings of the same tier adjacent to each other merges them into a single building of the next tier.

## Tech Stack
- **Language:** Vanilla JavaScript (ES6+)
- **Rendering:** [Three.js r128](https://threejs.org/) (via CDN)
- **Animations:** [GSAP 3.9.1](https://greensock.com/) (via CDN)
- **Styling:** CSS in `index.html` (embedded)
- **Mark-up:** HTML5

## Key Files
- **`pop-city/index.html`**: Entry point. Contains the UI overlay and loads libraries.
- **`pop-city/main.js`**: Contains ALL game logic, rendering, and state management.

## Architecture & Logic
The game logic is centralized in `main.js` and follows a simple loop:

1.  **Configuration**: `CONFIG` object defines grid size (10x10), tile size, tick rate, etc.
2.  **State**:
    -   `CityGrid` class manages the 2D data grid (`this.grid`) and 3D mesh grid (`this.meshGrid`).
    -   `gameState` object tracks `nextTier`, `isGameOver`, and `isBusy` flags.
3.  **Rendering**:
    -   Uses an **Orthographic Camera** for isometric look.
    -   `TextureFactory` generates procedural textures for buildings (no external assets).
    -   `createBuildingMesh(tier)` generates 3D meshes based on building tier (1-10).
4.  **Game Loop**:
    -   `gameTick()` runs every `CONFIG.tickRate` (1.5s).
    -   It checks for merges first. If no merges, it attempts to spawn a Tier 1 building in a random empty spot adjacent to existing buildings.
    -   If the grid is full, the game stops (console logs "Grid Full!").
5.  **Interaction**:
    -   Raycasting detects mouse position on the grid.
    -   Clicking places the current `nextTier` building if valid.
    -   Placement triggers `resolveMerges()` to recursively merge connected buildings of the same tier.

## Rules & Mechanics
-   **Grid**: 10x10.
-   **Tiers**: 1 through 10.
-   **Merging**: A cluster of 3+ identical tier buildings merges into one building of (tier + 1).
-   **Scoring**: Exponential score based on tier: `tier^2 * 10`.
-   **Palette**: predefined colors in `PALETTE` array for each tier.
-   **Roads**: Automatically appear on empty tiles adjacent to at least 1 building. They are "soft" tiles (Tier -1) and can be built over.
-   **Avatars**: Small animated figures that spawn at buildings and wander along roads and between buildings.

## Development Guidelines
-   **No Build Step**: Edit files and refresh `index.html` in browser.
-   **Asset Generation**: All textures are generated procedurally on canvas in `TextureFactory`. To add visual variety, modify `TextureFactory` or `createBuildingMesh`.
-   **Global Scope**: Most meaningful objects (`scene`, `city`, `gameState`) are in the global scope of `main.js`.
-   **Skill Check**: Always check the `.agent/skills` directory for relevant skills before starting a task.

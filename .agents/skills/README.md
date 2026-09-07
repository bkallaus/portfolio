# Agent skills

One skill library, shared by every agent that works in this repo. A skill is a directory
holding a `SKILL.md`: YAML frontmatter with `name` and `description`, then instructions in
markdown. The description is the trigger — it is what an agent reads to decide the skill is
relevant, so it says *when to use this*, not just what it is.

## How each agent finds these

`.agents/skills/` is the one real copy. Everything else points at it.

| Agent | How it discovers them |
| --- | --- |
| **Claude Code** | `.claude/skills` is a symlink to `../.agents/skills`. Claude scans each `SKILL.md` frontmatter and loads a skill when its description matches. |
| **Jules** | Reads `AGENTS.md` at the repo root, which indexes this folder. |
| **Codex, Cursor, Copilot, Gemini CLI, Aider, Windsurf, Zed** | Same route — all read `AGENTS.md` natively. |
| **Anything else** | Point it at this directory. The files are plain markdown with no runtime. |

The symlink is why the layout is `.agents/skills/` rather than `.claude/skills/`: the
canonical copy is vendor-neutral, and Claude gets a bridge into it. This mirrors the
convention used for globally-installed skills (`~/.agents/skills` with `~/.claude/skills`
symlinked into it), so a skill can move between global and repo scope unchanged.

## What is here

**Repo-native** — written for this repo, maintained here:

| Skill | Use it when |
| --- | --- |
| `demo` | A PR needs a GIF of the change actually working. Records with Playwright, posts to the PR as a comment, never commits the file. |

**Three.js** — reference for `simple-city`, which is Three.js r128 + GSAP loaded from a CDN
with no build step:

`threejs-fundamentals` · `threejs-geometry` · `threejs-materials` · `threejs-textures` ·
`threejs-lighting` · `threejs-shaders` · `threejs-animation` · `threejs-interaction` ·
`threejs-loaders` · `threejs-postprocessing`

**Vendored** — third-party, copied in rather than installed, so agents without the author's
global install still get them. Update by re-copying from source; do not edit in place, or
the next update silently reverts your change.

| Skill | Source | Pinned at |
| --- | --- | --- |
| `tdd` | [mattpocock/skills](https://github.com/mattpocock/skills) `skills/engineering/tdd` (MIT) | `79288be1` |
| `improve-codebase-architecture` | [mattpocock/skills](https://github.com/mattpocock/skills) `skills/engineering/improve-codebase-architecture` (MIT) | `3d35cd43` |
| `codebase-design` | [mattpocock/skills](https://github.com/mattpocock/skills) `skills/engineering/codebase-design` (MIT) | `344e3efc` |
| `design-taste-frontend` | [leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill) `skills/taste-skill` (MIT) | `3c7017d6` |

`codebase-design` is here as a dependency, not a request: `tdd` and
`improve-codebase-architecture` both instruct the agent to load it for the deep-module
vocabulary, and without it those two lose the terms they are built on.

Three softer references are *not* vendored — `code-review`, `grilling`, `domain-modeling`.
The skills that mention them degrade gracefully when they are absent, and they resolve
normally for anyone with `mattpocock/skills` installed globally. Copy them in if a run
turns out to need them.

## Adding a skill

1. `mkdir .agents/skills/<name>` and write `SKILL.md` with `name` and `description`
   frontmatter. The `name` must equal the directory name.
2. Write the description as a trigger. "Use when the user…" beats a summary of contents —
   an agent matches on this line and nothing else.
3. Add a row to the `## Agent skills` table in the root `AGENTS.md`. That table is the only
   thing non-Claude agents see, so a skill missing from it is invisible to Jules.

Nothing to register and no build step: the symlink covers Claude the moment the directory
exists, and step 3 covers everyone else.

## What does not belong here

Repo invariants — the URL-segment rule, the single `package.json`, the `tier` default —
live in `AGENTS.md` and only there. Restating them in a skill creates two copies that drift,
and the wrong one gets read at the wrong time.

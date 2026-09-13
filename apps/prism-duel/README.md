# Prism Duel

A two-player gem-market duel for the browser: play the engine, share a device, or open a
table and send someone a five-character code.

Two URLs, the same shape as `apps/duel`: `/prism-duel/` is a static write-up served from
`public/prism-duel/`, and `/prism-duel/play/` is the game itself, built from `play/index.html`
here. The `sites.json` row is therefore `type: "static"` — it points at the write-up — and the
playable page rides along as an extra Rollup input named in `gamesWithWriteups` in the root
`vite.config.ts`, which also rewrites the dev URL so it matches production.

It lives inside the portfolio's one Vite project — no `package.json` of its own, no
`vite.config.ts` of its own. Run everything from the repo root:

```
npm install --legacy-peer-deps
npm run dev              # write-up at /prism-duel/, game at /prism-duel/play/
npm run test:prism-duel  # four suites, ~4s
npm run typecheck
npm run build            # static output in dist/prism-duel/ and dist/prism-duel/play/
npx playwright test e2e/prism-duel.spec.ts
```

Relative imports carry an explicit `.ts` extension, which is what lets Node run the suites
straight off the source with no build step or test runner in the way.

## Provenance

Prism Duel is an original game. Card costs, bonuses, crowns, abilities, names, palette and
artwork were written for this project; nothing is reproduced from any published game. What it
shares with the tableau-building genre is its *mechanics* — drawing tokens from a grid, buying
cards that discount later purchases, racing to a points threshold — which is the part nobody
owns. Where a design decision had a choice, this project made its own: a five-colour
vocabulary of its own naming, a deliberately symmetric tier I and II deck, its own royal
favours, and a stalemate rule that no physical game needs.

## Layout

| File | Role |
|---|---|
| `play/index.html` | The game's entry point. Deploys to `/prism-duel/play/`. |
| `src/engine.ts` | Every rule, and the types the rest of the app shares. Pure: no React, no DOM, no network. |
| `src/cards.ts` | The 67-card deck and the four royal favours, as data. |
| `src/theme.ts` | Palette, token vocabulary, gradients and shadows. The board is skinned from here. |
| `src/bot.ts` | The solo opponent. Heuristics over `legalMoves`, nothing more. |
| `src/net.ts` | Two peer-to-peer transports behind one `Link` interface. |
| `src/App.tsx` | Mode selection, network wiring, bot scheduling, undo history. |
| `src/TableView.tsx` | The board, the market, the prompts, the player panels. |
| `src/Setup.tsx`, `src/RulesSheet.tsx`, `src/ui.tsx` | Lobby, rules, shared primitives. |
| `test/` | Four suites, run by `test/run.ts`. |
| `public/prism-duel/` | The write-up at `/prism-duel/` and its board shot. Copied verbatim, never parsed. |

The webfont link in `play/index.html` is deliberately non-blocking — `media="print"`, swapped to
`all` on load, with a `<noscript>` fallback. A stylesheet in `<head>` blocks execution of every
script after it, so the ordinary form of that tag makes first paint wait on a third-party CDN: on
a network where fonts.googleapis.com hangs rather than failing fast, the board stays blank. The
fallback stacks in `theme.ts` carry the typography until the real faces arrive.

## The rules it implements

Twenty-five tokens — four of each of five gems, two pearls, three gold — fill a 5×5 board
along a spiral from the centre. Three privilege scrolls sit above it; the second player starts
holding one.

Before your action you may take free actions: spend privileges (one returns to the supply and
buys any one token except gold) and replenish the board from the bag (your opponent gains a
privilege for it). Then take exactly one action:

- **Take tokens.** Up to three in one unbroken line — row, column or diagonal, no gaps, no
  gold. Three of one colour and your opponent gains a privilege.
- **Take a gold and reserve.** One gold from the board plus one card into your hand, three
  reserved at most. Gold is only ever reachable this way.
- **Buy a card** from a row or your own reserve. Bonuses discount colour by colour; gold
  substitutes for anything, pearls included. Everything spent goes back into the bag.

Card abilities resolve on purchase: take a matching token, take any token, steal one from the
opponent's reserve, take a privilege, or take another turn. At 3 and at 6 crowns you claim a
royal favour and resolve its ability; nobody holds more than two. You end a turn holding at
most ten tokens.

Win on 20 prestige, on 10 prestige from cards of a single colour, or on 10 crowns.

## Invariants worth not breaking

**The engine is pure.** Every function takes state and returns new state — `clone` first, never
mutate the argument. This is what makes the suites possible, and it is what makes multiplayer a
matter of shipping state rather than reconciling events.

**Derive, don't store.** `PlayerState` holds tokens, cards, reserved, royals, privileges and
the wild-colour choices. Bonuses, prestige, per-colour prestige, crowns and the token count are
all computed by `view()` on demand. There is deliberately no cached `crowns` field; adding one
is how this would start to rot.

**Both peers run the same engine.** After each move the whole state is sent and the receiver
adopts it wholesale. No host authority, no event reconciliation.

**Mid-turn decisions live in state, not in React.** Anything needing a choice — a wild card's
colour, a steal, a royal claim, an over-limit discard — pushes onto `state.pending`, and the
reducer refuses ordinary actions until the queue drains. A refresh cannot lose it, and a peer
sees the same prompt you do.

**One dispatcher.** `legalMoves` / `applyMove` and `legalResolutions` / `applyResolution` are
the only way anything reaches the rules. The UI, the bot and the fuzz suite all go through
them, so a move the tests can make is a move the board can make.

## Three decisions worth knowing

**Free actions happen before your action, not after.** The physical game is relaxed about
this; pinning it down removes an end-of-turn confirmation step from every single turn. The cost
is that you cannot spend a privilege on a token you freed up by buying a card in the same turn.

**Payment is solved for you.** `payment()` pays with real tokens first and covers the rest with
gold, which is the right answer nearly always, since gold is both scarcer and more flexible.
You cannot choose to burn gold to hoard a colour.

**A win registers when the turn ends, not when the card lands.** Buy a card that crosses a
crown threshold and you claim the royal first; the victory is declared after the pending queue
drains. `abilities.test.ts` pins this down, because it changes who wins a close game.

## The stalemate rule

A physical game ends because the players agree it has. This one cannot, and the fuzz suite
proved it: the tier I deck empties, both duellists sit on ten tokens they cannot spend, and
they take-and-discard forever. So if sixteen turns pass with neither player buying a card, the
game is called on prestige, crowns breaking a tie, and a genuine tie is a draw. Two card costs
were rebalanced in the same change to make the position rarer in the first place.

## What is verified

`npm run test:prism-duel` runs four suites, 159 assertions:

- **cards** — deck shape, cost bands per tier, no card costing its own colour, every colour
  holding enough prestige for a colour victory.
- **engine** — the bag, the spiral, line geometry in all four axes, privileges, replenishing,
  the token limit, reserving, payment with and without gold, and each victory condition.
- **abilities** — every card ability and its skip case, the wild-colour choice, royal claims at
  3 and 6 crowns and the two-royal cap, and the deferred victory check.
- **fuzz** — 600 random games and 120 bot-versus-bot games. Every game reaches a winner, no
  game stalls, and after every single step: tokens conserved at 25, cards conserved at 67,
  privileges conserved at 3, no duplicated card, no negative pile, and nobody idle over the
  token limit.

## Connection

`net.ts` exposes two transports that both produce a `Link` — `{ send, isOpen, role, close }`.
Nothing above that line knows which is in use.

- **Room code** — a public broker introduces the two browsers so you exchange a five-character
  code instead of a blob. It is loaded from a CDN at runtime rather than bundled. The broker
  sees signalling only and drops out once the channel opens.
- **Direct link** — raw WebRTC, no third party at all. ICE gathering finishes before the
  descriptor is shown, which collapses signalling into one static string each way.

## Open items

- **Reconnect.** State lives only in the two browsers. Close both tabs and the game is gone.
  The fix is persisting to `localStorage` on each move plus a rejoin handshake.
- **TURN.** Behind carrier-grade NAT no direct route exists and the connection fails outright.
  Credentials in `ICE` are the only fix.
- **Undo rewinds both players** and is therefore disabled over a connection.
- **The bot is one ply deep.** It never reads what its purchase opens up for the opponent, and
  it reserves mostly for the gold rather than to deny a card.

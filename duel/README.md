# Duel

A two-player strategy card game for the browser. Built for two people to play together
remotely.

Lives inside the portfolio's own Vite project rather than as a standalone app — there's no
`package.json` here beyond `{ "type": "module" }`, which just scopes ESM parsing to this
directory. Run everything from the repo root:

```
npm install
npm run dev        # local server; game is served at /duel/play/
npm test           # all three suites, ~10s
npm run typecheck  # tsc over the whole repo
npm run build      # static output in build/duel/play/
```

TypeScript throughout. Relative imports carry an explicit `.ts` extension, which is what
lets Node run the suites directly off the source (it strips the types itself) with no
build step or test runner in the way.

## Layout

| File | Role |
|---|---|
| `src/engine.ts` | All game logic, and the types the rest of the app shares. Pure, no React, no DOM. |
| `src/theme.ts` | Palette, resource colours, science symbol shapes, the domain unions, and the gradient/shadow tokens the board is skinned from. |
| `src/net.ts` | Two connection transports behind one interface. |
| `src/DuelBoard.tsx` | Every component. The only file that touches React. |
| `test/` | Three suites, run by `test/run.ts`. |

## Invariants worth not breaking

**The engine is pure.** Every function in `engine.ts` takes state and returns new state.
No DOM, no network, no mutation of the argument (`clone` first). This is what makes the
tests possible and what makes multiplayer a matter of shipping state rather than syncing
events. If you find yourself wanting to import React into `engine.ts`, the design has gone
wrong somewhere else.

**Derive, don't store.** `PlayerState` holds only `coins`, `built`, `wonders`, `tokens`.
Shields, production, science symbols, trade discounts and score are all computed by
`view()` on demand. There is deliberately no cached `shields` field. Adding one is how this
codebase would start to rot.

**Both peers run the same engine.** After each move the whole state is sent over the wire
and the receiver adopts it wholesale. There is no host authority and no event reconciliation.
Keep it that way unless the state grows a lot.

**Interrupts live in state, not in React.** Effects that need a mid-turn decision set
`state.pending`, and the reducer refuses normal actions until it's resolved. Don't move this
into component state or modals — it will desync the moment someone refreshes.

## The two hard parts

**`resourceCost()`** — the cost solver. Not a subtraction, because of three interacting
complications: flexible producers that yield "one of these, your choice, each turn"
(Great Lighthouse, Piraeus, Forum, Caravansery); the Architecture and Masonry tokens which
waive 2 resources *of your choice*; and per-resource prices driven by the opponent's brown
and grey cards. It brute-forces the flexible assignments and greedily waives the priciest
units, which is optimal here since units are independent. Seven hand-computed cases in
`engine.test.ts` cover it. Change this function and run the tests.

**The covering graph** in `buildSlots()` — which slot sits on which. Generated from row
widths rather than hand-entered. Age III's middle rows are the awkward case: a row of 4
covered by a row of 2 (`b === a/2`) and then a row of 2 covered by a row of 4 (`b === a*2`).
Tests assert every age deals 20 slots, starts 8 face down, opens the right number of cards,
and never strands an unreachable slot.

## What's verified and what isn't

Verified by test: 4,000 random self-play games with no crashes or stalls, 51 assertions on
wonder behaviour, 14 edge cases, scoring reconciled against a hand-totalled game.

**Not verified: the card data itself.** The costs, names and chain links in the `CARDS`
array at the top of `engine.ts` are a reconstruction and have not been checked against a
physical copy. The engine is right; the numbers may not be. Only the Temple of Artemis cost
was confirmed against an external source. Proofreading this is the highest-value hour
available and doesn't require touching any logic.

Also unconfirmed: the wonder draft order. Currently the pick order flips for the second set
of four (`DRAFT = [0,1,1,0, 1,0,0,1]`). If it should continue as a snake instead, that's one
array.

## Connection

`net.ts` exposes two transports that both produce `Link` — `{ send, isOpen, role, close }`. Nothing
above that line knows which is in use.

- **quick** — PeerJS brokers the introduction, so players exchange a 5-character code.
  Loaded from a CDN at runtime rather than bundled, so the same file also runs in
  environments where npm imports aren't available. Broker sees signalling only.
- **manual** — raw WebRTC. ICE gathering is allowed to finish before the descriptor is
  shown, which collapses signalling into one static string each way and removes the need
  for any server at all.

## Open items

- Card data proofread (see above).
- **Reconnect.** State lives only in the two browsers. Close both tabs and the game is gone.
  Fix would be persisting state to `localStorage` on each move plus a rejoin handshake.
- **TURN.** Behind carrier-grade NAT, no direct route exists and connection fails outright.
  There's a commented slot in `ICE` in `net.ts`; credentials are the only fix.
- Undo is local-history based and rewinds both players when used over a connection.

# Pit Wall

A racing strategy game with no steering wheel. Every circuit is generated from a seed, you
spend a fixed budget across four car attributes, and then you watch whether your setup was
the right read of the track.

Served at `/pit-wall/`.

## The decision

The budget is fixed, so every point of grip is a point you did not spend on top end. What the
track rewards changes from circuit to circuit:

- A circuit that is **74% flat out** rewards top end, as long as you keep enough grip to carry
  the few corners it has.
- A circuit that is **5% flat out** rewards grip above everything, and a top-end car loses by
  four seconds a lap.

Dumping grip entirely is a trap. A car with no grip is slow through corners *and* never
reaches its top speed, because it spends the straights recovering from them.

The track strip under the circuit reports what you need to make that read: how much of the lap
is flat out, how many corners there are, and how slow the slowest one is. The garage shows your
predicted lap time live as you move the sliders, so tuning is a direct feedback loop rather
than a guess.

## How a track is generated

`src/engine/track.ts` builds a closed circuit from a seed:

1. Scatter random points, take their convex hull, and push them apart.
2. Rounds of midpoint displacement break the hull's convexity into real corners, each round
   followed by a spacing pass and a per-vertex turn limit.
3. Fit to the field, spline it, and resample at a uniform spacing.
4. Offset that centerline by the half width to get the walls.

A seed also fixes the circuit's **shape**: its twistiness sets how many displacement rounds it
gets, how sharp a turn is allowed, and how wide the track is — technical circuits are narrower,
which is what lets their corners be tighter without the walls folding through each other.

A candidate is only accepted when it is drivable: no corner tighter than the walls are thick,
no two parts of the circuit closer than the corridor needs, and no self-crossing. A failing
candidate gets a few smoothing passes, then the generator retries from a derived seed, and
finally **relaxes the twistiness** until it finds something drivable. That last step is the
guarantee that matters — without it an over-ambitious shape returns a circuit whose walls
overlap, and cars crawl through folded geometry.

## How the racing line is found

`src/engine/racingLine.ts` searches for the fastest way around, rather than following the
centerline.

The track becomes a layered graph: one layer per planning node around the lap, one node per
lane across the width. Dynamic programming finds the minimum **time** path, relaxed over
several laps to settle the loop.

Two details carry the whole thing:

- **Cost is time, not distance.** Shortest is not fastest: a distance-cost line hugs the inside
  of every corner, which is slower than running wide to straighten it out. Time cost needs a
  speed limit from curvature, and curvature depends on three consecutive nodes — so a node
  carries the lane it came from, not just its own.
- **Planning is coarse, the result is fine.** Nodes sit every few samples and the chosen offsets
  are interpolated back across the full-resolution centerline. Planning at full resolution fails
  outright: a one-lane sideways step over a 9-unit sample reads as a hairpin, so the optimiser
  refuses to ever change lane and pins the line to one edge of the track.

## How a lap time is predicted

The geometry of the line is shared, but each car gets its own speed profile from its own stats
(`paceLine`): a cornering limit from `v = √(grip · R)`, then a forward pass limited by
acceleration and a backward pass limited by braking. That is what makes each attribute legible —
grip sets corner speed, power sets corner exit, brakes set corner entry, top end sets the
straights.

## How the race runs

Cars do not simulate steering. Each one tracks its distance along the racing line and its
lateral offset from it, moving toward the speed its own profile allows. They cannot drive
through each other: a car caught behind a slower one either slows to match or moves off-line to
pass, and being off-line costs speed — which is where the overtaking comes from.

## Layout

| Path | What lives there |
| --- | --- |
| `src/engine/` | Geometry, track generation, the racing line, car setup, the race. No DOM, no React. |
| `src/render/` | Canvas painting. |
| `src/hooks/` | The animation loop, and the bridge from the mutable race to React state. |
| `src/components/` | The garage, the standings, and the rival cards. |

The engine is plain TypeScript and carries the tests; React only reads a snapshot of it. The
race steps at a fixed 1/60 timestep regardless of frame rate, and the standings re-render about
ten times a second rather than every frame.

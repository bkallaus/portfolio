# Neural Race Track

A randomly generated circuit, and a grid of cars that each steer themselves with their own
small neural network. Every car's brain is configurable from the page, so you can put a
sensors-straight-to-wheels reflex agent on the same track as a two hidden layer network and
watch which one learns the circuit faster.

Served at `/neural-race/`.

## How a track is generated

`src/engine/track.ts` builds a closed circuit from a seed:

1. Scatter random points, take their convex hull, and push them apart to a minimum spacing.
2. Two rounds of midpoint displacement break the hull's convexity into real corners, each
   round followed by a spacing pass and a per-vertex turn limit.
3. Fit the control polygon to the field, run it through a Catmull-Rom spline, and resample
   the result at a uniform 9 unit spacing.
4. Offset that centerline by the half width to get the two walls.

A candidate is only accepted when it is **drivable**: no corner tighter than the walls are
thick, no two parts of the circuit closer than the corridor needs, and no self-crossing. A
failing candidate gets a handful of smoothing passes, then the generator retries from a
derived seed. Smoothing alone is not enough — enough Laplacian passes flatten a loop into an
ellipse whose ends are sharper than the corner that was being repaired, which is why the
retry exists.

The same seed always produces the same track, so a circuit can be shared by its number.

## How a car drives

Each tick a car casts one ray per sensor against the walls and feeds the normalised distances,
plus its own speed, into its network. The two outputs are steering and throttle, both squashed
to `[-1, 1]`. Steering authority scales with speed, so a stopped car cannot pivot on the spot.

A car retires when it touches a wall, or when it has made no forward progress for a few
seconds — that second rule keeps a car that stops or drives in circles from holding up the run.

Progress is measured from the grid slot, not from the start line. Cars line up *behind* the
line, so counting absolute arc length would credit every car with a full lap the moment it
crossed the line it started behind.

## How a car learns

Each car runs its own (1+1) hill climb, independent of the others:

- A run ends when every car has retired or the time limit expires.
- Each car keeps the brain that reached the furthest point as its champion — furthest reached,
  not final position, so a car that drives well and then reverses keeps the credit.
- The next run uses a mutated copy of that champion.

A car that has never covered ground gets a **fresh random brain** instead of a mutation. Its
fitness landscape is flat — every mutant scores the same zero — so mutation has nothing to
climb. This is random restart hill climbing, and without it a saturated network can sit
motionless on the grid indefinitely.

Because each car only ever competes with its own past self, the standings are a fair
architecture comparison rather than a race for a single shared gene pool.

## Layout

| Path | What lives there |
| --- | --- |
| `src/engine/` | The simulation: geometry, track generation, networks, car physics, the race. No DOM, no React. |
| `src/render/` | Canvas painting. |
| `src/hooks/` | The animation loop, and the bridge from the mutable simulation to React state. |
| `src/components/` | Standings, the toolbar, and the per-car brain editor. |

The engine is plain TypeScript and carries the test suite; React only ever reads a snapshot of
it. The simulation steps at a fixed 1/60 timestep regardless of frame rate, and the standings
panel re-renders about eight times a second rather than every frame.

import { CARDS, MARKET_WIDTH, ROYALS, card, costTotal } from "../src/cards.ts";
import { GEMS } from "../src/theme.ts";
import { check, equal, report, throws } from "./harness.ts";

equal("total jewel cards", CARDS.length, 67);
equal("tier one count", CARDS.filter((entry) => entry.tier === 1).length, 30);
equal("tier two count", CARDS.filter((entry) => entry.tier === 2).length, 24);
equal("tier three count", CARDS.filter((entry) => entry.tier === 3).length, 13);
equal("royal count", ROYALS.length, 4);
equal("market widths", MARKET_WIDTH, { 1: 5, 2: 4, 3: 3 });

equal("card ids are unique", new Set(CARDS.map((entry) => entry.id)).size, CARDS.length);
equal("royal ids are unique", new Set(ROYALS.map((entry) => entry.id)).size, ROYALS.length);

check(
  "every card costs something",
  CARDS.every((entry) => costTotal(entry.cost) > 0)
);
check(
  "no card costs its own colour",
  CARDS.every((entry) => entry.color === null || (entry.cost[entry.color] ?? 0) === 0)
);
check(
  "no card costs gold",
  CARDS.every((entry) => !("gold" in entry.cost))
);
check(
  "royals carry no crowns",
  ROYALS.every((entry) => !("crowns" in entry))
);

for (const tier of [1, 2, 3] as const) {
  const costs = CARDS.filter((entry) => entry.tier === tier).map((entry) => costTotal(entry.cost));
  check(
    `tier ${tier} costs stay in band`,
    Math.min(...costs) >= [2, 5, 8][tier - 1] && Math.max(...costs) <= [4, 8, 10][tier - 1],
    `range ${Math.min(...costs)}..${Math.max(...costs)}`
  );
}

for (const colour of GEMS) {
  const mine = CARDS.filter((entry) => entry.color === colour);
  equal(`${colour} card count`, mine.length, 12);
  const reachable = mine.reduce((sum, entry) => sum + entry.points, 0);
  check(
    `${colour} can reach a colour victory`,
    reachable >= 10,
    `only ${reachable} points available`
  );
}

check(
  "wild bonus cards have no colour of their own",
  CARDS.filter((entry) => entry.wildBonus).every((entry) => entry.color === null)
);
check("at least three wild bonus cards", CARDS.filter((entry) => entry.wildBonus).length >= 3);
check(
  "pearls are only ever a cost",
  CARDS.every((entry) => (entry.cost.pearl ?? 0) <= 4)
);

equal("card lookup works", card("quartz-1a").color, "quartz");
throws("unknown card lookup throws", () => card("nope"));

report("cards");

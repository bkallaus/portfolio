import {
  BOARD_CELLS,
  buyCard,
  clone,
  emptyPile,
  newGame,
  resolveBoardGem,
  resolveRoyal,
  resolveSteal,
  resolveWild,
  view,
} from "../src/engine.ts";
import type { GameState } from "../src/engine.ts";
import { card } from "../src/cards.ts";
import { check, equal, report } from "./harness.ts";

function rigged(marketCard: string, seed = 99): GameState {
  const state = newGame(["A", "B"], seed);
  const wanted = card(marketCard);
  state.market[wanted.tier - 1][0] = marketCard;
  const purse = emptyPile();
  for (const [kind, amount] of Object.entries(wanted.cost)) {
    purse[kind as keyof typeof purse] = amount ?? 0;
  }
  state.players[0].tokens = purse;
  return state;
}

const gemTaker = rigged("quartz-1a");
gemTaker.board = new Array(BOARD_CELLS).fill(null);
gemTaker.board[0] = "quartz";
gemTaker.board[1] = "garnet";
const awaiting = buyCard(gemTaker, "quartz-1a");
equal("a gem ability waits on a choice", awaiting.pending[0], {
  type: "boardGem",
  player: 0,
  color: "quartz",
});
equal("the turn has not passed yet", awaiting.turn, 0);
equal("the wrong colour is refused", resolveBoardGem(awaiting, 1), awaiting);
const claimed = resolveBoardGem(awaiting, 0);
equal("the matching token is claimed", claimed.players[0].tokens.quartz, 1);
equal("resolving the ability ends the turn", claimed.turn, 1);

const noMatch = rigged("quartz-1a");
noMatch.board = new Array(BOARD_CELLS).fill(null);
noMatch.board[0] = "garnet";
const skipped = buyCard(noMatch, "quartz-1a");
equal("an impossible gem ability is skipped", skipped.pending.length, 0);
equal("and the turn simply passes", skipped.turn, 1);

const thief = rigged("quartz-1e");
thief.players[1].tokens = { ...emptyPile(), verdite: 2, gold: 1 };
const stealing = buyCard(thief, "quartz-1e");
equal("a steal ability waits on a choice", stealing.pending[0], { type: "steal", player: 0 });
equal("gold cannot be stolen", resolveSteal(stealing, "gold"), stealing);
equal("a token the opponent lacks cannot be stolen", resolveSteal(stealing, "quartz"), stealing);
const stolen = resolveSteal(stealing, "verdite");
equal("the victim loses the token", stolen.players[1].tokens.verdite, 1);
equal("the thief gains it", stolen.players[0].tokens.verdite, 1);
equal("stealing ends the turn", stolen.turn, 1);

const emptyHanded = rigged("quartz-1e");
emptyHanded.players[1].tokens = { ...emptyPile(), gold: 2 };
const nothingToSteal = buyCard(emptyHanded, "quartz-1e");
equal("a steal against an empty reserve is skipped", nothingToSteal.pending.length, 0);

const scribe = rigged("quartz-1b");
const beforePrivileges = scribe.privileges;
const scribed = buyCard(scribe, "quartz-1b");
equal("a privilege ability resolves at once", scribed.players[0].privileges, 1);
equal("it comes out of the supply", scribed.privileges, beforePrivileges - 1);
equal("and the turn passes", scribed.turn, 1);

const emptySupply = rigged("quartz-1b");
emptySupply.privileges = 0;
emptySupply.players[1].privileges = 3;
const taken = buyCard(emptySupply, "quartz-1b");
equal("an empty supply draws from the opponent", taken.players[1].privileges, 2);
equal("and the privilege still arrives", taken.players[0].privileges, 1);

const again = rigged("azurite-1b");
const replayed = buyCard(again, "azurite-1b");
equal("an extra turn keeps the active player", replayed.turn, 0);
equal("and clears the flag", replayed.extraTurn, false);

const wild = rigged("neutral-2d");
const choosing = buyCard(wild, "neutral-2d");
equal("a wild card waits on a colour", choosing.pending[0], {
  type: "wild",
  player: 0,
  card: "neutral-2d",
});
const chosen = resolveWild(choosing, "garnet");
equal("the chosen colour takes the bonus", view(chosen, 0).bonuses.garnet, 1);
equal("and the points", view(chosen, 0).colourPoints.garnet, 1);
equal("choosing ends the turn", chosen.turn, 1);

const wildWithAbility = rigged("neutral-2b");
const wildPending = buyCard(wildWithAbility, "neutral-2b");
equal("the colour choice comes first", wildPending.pending[0].type, "wild");
const wildDone = resolveWild(wildPending, "obsidian");
equal("the card's ability follows the choice", wildDone.players[0].privileges, 1);
equal("obsidian takes the wild bonus", view(wildDone, 0).bonuses.obsidian, 1);

const crowning = rigged("quartz-2c");
crowning.players[0].cards = ["garnet-1c"];
const royalDue = buyCard(crowning, "quartz-2c");
equal("three crowns trigger a royal claim", royalDue.pending[0], { type: "royal", player: 0 });
equal("an unavailable royal is refused", resolveRoyal(royalDue, "royal-nope"), royalDue);
const pickable = royalDue.royals.find((id) => id !== null) as string;
const royalTaken = resolveRoyal(royalDue, pickable);
equal("the royal joins the tableau", royalTaken.players[0].royals, [pickable]);
equal("the royal slot empties", royalTaken.royals.includes(pickable), false);
check("the royal's points count", view(royalTaken, 0).points > view(royalDue, 0).points);

const doubleRoyal = rigged("quartz-2c");
doubleRoyal.players[0].cards = ["garnet-1c", "azurite-2c", "verdite-2c"];
const bothDue = buyCard(doubleRoyal, "quartz-2c");
equal("six crowns trigger the second claim", bothDue.pending.filter((p) => p.type === "royal").length, 2);

const capped = rigged("quartz-2c");
capped.players[0].cards = ["garnet-1c", "azurite-2c", "verdite-2c", "obsidian-2c"];
capped.players[0].royals = ["royal-warden", "royal-magnate"];
capped.players[0].royalsClaimed = 2;
const noMore = buyCard(capped, "quartz-2c");
equal("two royals is the cap", noMore.pending.filter((p) => p.type === "royal").length, 0);

const winning = rigged("quartz-3b");
winning.players[0].cards = ["quartz-3a", "quartz-2d"];
const winningTurn = buyCard(winning, "quartz-3b");
equal("a pending claim defers the victory check", winningTurn.winner, null);
equal("because the royal is still owed", winningTurn.pending[0], { type: "royal", player: 0 });
const won = resolveRoyal(winningTurn, winningTurn.royals.find((id) => id !== null) as string);
equal("a colour victory is detected", won.winner?.by, "colour");
equal("and attributed", won.winner?.player, 0);
equal("the board stops accepting moves", buyCard(won, won.market[0][1] as string), won);

const stale = clone(winning);
stale.turn = 1;
equal("the idle player cannot buy", buyCard(stale, "quartz-3b"), stale);

report("abilities");

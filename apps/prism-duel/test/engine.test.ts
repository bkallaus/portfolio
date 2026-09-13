import {
  BAG_CONTENTS,
  BOARD_CELLS,
  PRIVILEGE_SUPPLY,
  RESERVE_LIMIT,
  SPIRAL,
  TOKEN_LIMIT,
  buyCard,
  canBuy,
  canReplenish,
  canReserve,
  canTakeTokens,
  canSpendPrivilege,
  cellOf,
  clone,
  emptyPile,
  isStraightLine,
  lineOptions,
  newGame,
  payment,
  replenish,
  reserveCard,
  resolveDiscard,
  takeTokens,
  spendPrivilege,
  victoryFor,
  view,
} from "../src/engine.ts";
import type { GameState } from "../src/engine.ts";
import { check, equal, report } from "./harness.ts";

equal("bag holds 25 tokens", BAG_CONTENTS.length, 25);
equal("bag gem count", BAG_CONTENTS.filter((kind) => kind !== "pearl" && kind !== "gold").length, 20);
equal("bag pearls", BAG_CONTENTS.filter((kind) => kind === "pearl").length, 2);
equal("bag gold", BAG_CONTENTS.filter((kind) => kind === "gold").length, 3);

equal("spiral covers every cell once", new Set(SPIRAL).size, BOARD_CELLS);
equal("spiral starts at the centre", SPIRAL[0], cellOf(2, 2));
check(
  "spiral only ever steps to a neighbour",
  SPIRAL.slice(1).every((cell, index) => {
    const [r1, c1] = [Math.floor(SPIRAL[index] / 5), SPIRAL[index] % 5];
    const [r2, c2] = [Math.floor(cell / 5), cell % 5];
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  })
);

const fresh = newGame(["A", "B"], 12345);
equal("board starts full", fresh.board.filter((token) => token !== null).length, 25);
equal("bag starts empty after setup", fresh.bag.length, 0);
equal("tier one row is five wide", fresh.market[0].length, 5);
equal("tier two row is four wide", fresh.market[1].length, 4);
equal("tier three row is three wide", fresh.market[2].length, 3);
check("every market slot is dealt", fresh.market.flat().every((id) => id !== null));
equal("royal slots dealt", fresh.royals.filter((id) => id !== null).length, 4);
equal("second player holds one privilege", fresh.players[1].privileges, 1);
equal("supply keeps the rest", fresh.privileges, PRIVILEGE_SUPPLY - 1);
equal("first player starts", fresh.turn, 0);
equal("nobody has points yet", view(fresh, 0).points, 0);

equal("single cell is a line", isStraightLine([cellOf(0, 0)]), true);
equal("horizontal pair is a line", isStraightLine([cellOf(1, 1), cellOf(1, 2)]), true);
equal("vertical triple is a line", isStraightLine([cellOf(0, 3), cellOf(1, 3), cellOf(2, 3)]), true);
equal("diagonal triple is a line", isStraightLine([cellOf(0, 0), cellOf(1, 1), cellOf(2, 2)]), true);
equal("anti-diagonal pair is a line", isStraightLine([cellOf(3, 1), cellOf(2, 2)]), true);
equal("gapped pair is not a line", isStraightLine([cellOf(0, 0), cellOf(0, 2)]), false);
equal("bent triple is not a line", isStraightLine([cellOf(0, 0), cellOf(0, 1), cellOf(1, 1)]), false);
equal("gapped triple is not a line", isStraightLine([cellOf(2, 0), cellOf(2, 1), cellOf(2, 3)]), false);

function withBoard(tokens: Array<string | null>, seed = 7): GameState {
  const state = newGame(["A", "B"], seed);
  state.board = tokens.map((token) => (token === null ? null : (token as never)));
  return state;
}

const row = withBoard([
  "quartz", "quartz", "quartz", "gold", "azurite",
  "verdite", null, "garnet", "obsidian", "pearl",
  "quartz", "azurite", "verdite", "garnet", "obsidian",
  "pearl", "quartz", "azurite", "verdite", "garnet",
  "obsidian", "pearl", "quartz", "azurite", "verdite",
]);

equal("three in a row is legal", canTakeTokens(row, [0, 1, 2]), true);
equal("a line through gold is illegal", canTakeTokens(row, [1, 2, 3]), false);
equal("a line through a gap is illegal", canTakeTokens(row, [5, 6, 7]), false);
equal("taking gold directly is illegal", canTakeTokens(row, [3]), false);
equal("four tokens is illegal", canTakeTokens(row, [10, 11, 12, 13]), false);
equal("duplicate cells are illegal", canTakeTokens(row, [10, 10]), false);
check("line options are all legal", lineOptions(row).every((cells) => canTakeTokens(row, cells)));
check(
  "line options include a diagonal run",
  lineOptions(row).some((cells) => JSON.stringify(cells) === JSON.stringify([10, 16, 22]))
);

const tripled = takeTokens(row, [0, 1, 2]);
equal("three matching tokens land in reserve", tripled.players[0].tokens.quartz, 3);
equal("three matching tokens pay a privilege", tripled.players[1].privileges, 2);
equal("supply drops by one", tripled.privileges, PRIVILEGE_SUPPLY - 2);
equal("turn passes", tripled.turn, 1);
equal("board cells empty out", tripled.board.slice(0, 3), [null, null, null]);

const mixed = takeTokens(row, [10, 11, 12]);
equal("mixed tokens grant no privilege", mixed.players[1].privileges, 1);

const illegal = takeTokens(row, [1, 2, 3]);
check("an illegal take returns the same state", illegal === row);

equal("privilege holder can spend it", canSpendPrivilege(row, 0), false);
const second = clone(row);
second.turn = 1;
equal("the holder may spend on their turn", canSpendPrivilege(second, 1), true);
const spent = spendPrivilege(second, 4);
equal("privilege buys a token", spent.players[1].tokens.azurite, 1);
equal("privilege returns to the supply", spent.privileges, PRIVILEGE_SUPPLY);
equal("spending a privilege does not end the turn", spent.turn, 1);
equal("gold cannot be taken with a privilege", spendPrivilege(second, 3), second);

const emptied = clone(row);
emptied.board = new Array(BOARD_CELLS).fill(null);
emptied.bag = ["quartz", "azurite", "verdite"];
equal("a board with holes can be replenished", canReplenish(emptied, 0), true);
const filled = replenish(emptied);
equal("replenish draws the whole bag", filled.bag.length, 0);
equal("replenish fills from the centre outward", filled.board[SPIRAL[0]] !== null, true);
equal("replenish pays the opponent a privilege", filled.players[1].privileges, 2);
equal("replenish does not end the turn", filled.turn, 0);
equal("a full board cannot be replenished", canReplenish(row, 0), false);

const buyer = clone(row);
const target = buyer.market[0][0] as string;
buyer.players[0].tokens = { ...emptyPile(), quartz: 4, azurite: 4, verdite: 4, garnet: 4, obsidian: 4, pearl: 2 };
equal("an affordable card can be bought", canBuy(buyer, 0, target), true);
const bought = buyCard(buyer, target);
equal("the card joins the tableau", bought.players[0].cards.includes(target), true);
equal("the market refills behind it", bought.market[0].filter((id) => id !== null).length, 5);
check("spent tokens return to the bag", bought.bag.length > 0);

const broke = clone(row);
const pricey = broke.market[2][0] as string;
equal("an unaffordable card cannot be bought", canBuy(broke, 0, pricey), false);
equal("buying an unaffordable card is a no-op", buyCard(broke, pricey), broke);

const discounted = clone(row);
const firstTier = discounted.market[0][0] as string;
discounted.players[0].cards = [];
const cost = payment(discounted, 0, firstTier);
equal("payment is null without tokens", cost, null);

const golden = clone(row);
golden.players[0].tokens = { ...emptyPile(), gold: 5 };
const goldPaid = payment(golden, 0, firstTier);
check("gold covers any shortfall", goldPaid !== null && goldPaid.gold > 0);

const reserver = clone(row);
equal("reserving needs a gold on the board", canReserve(reserver, 0, reserver.market[1][0] as string), true);
const reserved = reserveCard(reserver, reserver.market[1][0] as string);
equal("reserving banks the gold", reserved.players[0].tokens.gold, 1);
equal("the reserved card leaves the market", reserved.players[0].reserved.length, 1);
equal("reserving ends the turn", reserved.turn, 1);
const fullHand = clone(row);
fullHand.players[0].reserved = ["quartz-1a", "quartz-1b", "quartz-1c"];
equal("the reserve caps at three", canReserve(fullHand, 0, fullHand.market[0][1] as string), false);
equal("reserve limit constant", RESERVE_LIMIT, 3);
const noGold = clone(row);
noGold.board = noGold.board.map((token) => (token === "gold" ? null : token));
equal("no gold means no reserve", canReserve(noGold, 0, noGold.market[0][1] as string), false);

const hoarder = withBoard([
  "quartz", "quartz", "quartz", null, null,
  null, null, null, null, null,
  null, null, null, null, null,
  null, null, null, null, null,
  null, null, null, null, null,
]);
hoarder.players[0].tokens = { ...emptyPile(), azurite: 4, verdite: 4 };
const overflowing = takeTokens(hoarder, [0, 1, 2]);
equal("going over the limit stops the turn", overflowing.turn, 0);
equal("the overflow is queued as a discard", overflowing.pending[0], {
  type: "discard",
  player: 0,
  count: 1,
});
const settled = resolveDiscard(overflowing, "azurite");
equal("discarding clears the queue", settled.pending.length, 0);
equal("discarding hands the turn over", settled.turn, 1);
equal("the discard goes back to the bag", settled.bag.includes("azurite"), true);
equal("reserve lands on the limit", view(settled, 0).tokenCount, TOKEN_LIMIT);

const champion = clone(row);
champion.players[0].cards = ["quartz-3b", "quartz-3a", "quartz-2d"];
equal("ten points in one colour wins", victoryFor(champion, 0), "colour");
const crowned = clone(row);
crowned.players[0].cards = ["neutral-3b", "quartz-2c", "azurite-2c", "verdite-2c", "garnet-1c"];
equal("ten crowns wins", victoryFor(crowned, 0), "crowns");
const scorer = clone(row);
scorer.players[0].cards = ["neutral-3a", "neutral-3b", "neutral-2a", "neutral-2c", "quartz-2d", "azurite-2d", "verdite-1f"];
equal("twenty points wins", victoryFor(scorer, 0), "points");
equal("an empty tableau wins nothing", victoryFor(fresh, 0), null);

report("engine");

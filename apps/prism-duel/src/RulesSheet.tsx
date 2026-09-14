import { C, FONT, GEMS, TOKEN_LABEL } from "./theme.ts";
import {
  COLOUR_POINTS_TO_WIN,
  CROWNS_TO_WIN,
  POINTS_TO_WIN,
  PRIVILEGE_SUPPLY,
  RESERVE_LIMIT,
  ROYAL_CROWN_STEPS,
  STALEMATE_TURNS,
  TOKEN_LIMIT,
} from "./engine.ts";
import { TokenPip } from "./ui.tsx";

const SECTIONS: Array<[string, string[]]> = [
  [
    "The board",
    [
      "Twenty-five tokens fill a five-by-five board: four of each of the five gems, two pearls and three gold. They are drawn blind and laid along a spiral that starts at the centre.",
      `Three privilege scrolls sit above the board. The player who goes second starts holding one; the other ${PRIVILEGE_SUPPLY - 1} wait in the supply.`,
      "Cards sit in three rows — five tier I, four tier II, three tier III — and four royal favours wait to one side.",
    ],
  ],
  [
    "Free actions",
    [
      "Before your main action you may spend any number of privileges. Each one returns to the supply and buys you one token of your choice from the board — never gold.",
      "You may also replenish: every empty space is refilled from the bag along the spiral, and your opponent gains a privilege for the trouble. If you have no legal main action, this is the way out.",
    ],
  ],
  [
    "Your action — choose exactly one",
    [
      "Take up to three tokens that lie in one unbroken line: a row, a column or a diagonal, with no gap and no gold in the way. Take three of the same colour and your opponent gains a privilege.",
      `Take one gold token from the board and reserve a card from any row into your hand. You may hold ${RESERVE_LIMIT} reserved cards at a time, and gold is only ever reachable this way.`,
      "Buy a card from a row or from your own reserve. Your bonuses discount its cost colour by colour; gold stands in for any token, pearls included. Everything you spend goes back into the bag.",
    ],
  ],
  [
    "Cards",
    [
      "A card's bonus permanently discounts that colour. Its prestige counts toward your total and toward its own colour. Neutral cards count toward your total only, unless they carry a bonus of a colour you choose when you buy them.",
      "Card abilities resolve the moment you buy: take a matching token, take any token, steal one from your opponent's reserve, take a privilege, or take another turn.",
      `Reach ${ROYAL_CROWN_STEPS.join(" crowns and then ")} crowns and claim a royal favour, resolving its ability at once. Nobody holds more than two.`,
      `You may end your turn holding at most ${TOKEN_LIMIT} tokens. Anything over comes straight back out of your reserve and into the bag.`,
    ],
  ],
  [
    "Winning",
    [
      `${POINTS_TO_WIN} prestige points in total.`,
      `${COLOUR_POINTS_TO_WIN} prestige points on cards of one single colour.`,
      `${CROWNS_TO_WIN} crowns.`,
      `A win registers the instant your turn finishes — which means you resolve a pending royal claim or token discard first. If ${STALEMATE_TURNS} turns pass with neither duellist buying a card, the game is called on prestige.`,
    ],
  ],
];

export function RulesSheet() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {GEMS.map((gem) => (
          <span
            key={gem}
            style={{
              display: "inline-flex",
              gap: 5,
              alignItems: "center",
              font: `500 12px/1 ${FONT.body}`,
              color: C.muted,
            }}
          >
            <TokenPip kind={gem} size={20} />
            {TOKEN_LABEL[gem]}
          </span>
        ))}
        <span
          style={{
            display: "inline-flex",
            gap: 5,
            alignItems: "center",
            font: `500 12px/1 ${FONT.body}`,
            color: C.muted,
          }}
        >
          <TokenPip kind="pearl" size={20} />
          Pearl
        </span>
        <span
          style={{
            display: "inline-flex",
            gap: 5,
            alignItems: "center",
            font: `500 12px/1 ${FONT.body}`,
            color: C.muted,
          }}
        >
          <TokenPip kind="gold" size={20} />
          Gold, the wild token
        </span>
      </div>
      {SECTIONS.map(([heading, lines]) => (
        <section key={heading} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h3
            style={{
              margin: 0,
              font: `600 12px/1 ${FONT.body}`,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: C.accent,
            }}
          >
            {heading}
          </h3>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              font: `400 13px/1.7 ${FONT.body}`,
              color: C.muted,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {lines.map((line) => (
              <li key={line.slice(0, 24)}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
      <p style={{ margin: 0, font: `400 12px/1.7 ${FONT.body}`, color: C.line }}>
        Prism Duel is an original game. Its card set, artwork, names and numbers were written for
        this project and are not drawn from any published game.
      </p>
    </div>
  );
}

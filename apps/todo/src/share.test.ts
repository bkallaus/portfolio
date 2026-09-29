import { describe, expect, it } from "vitest";
import { addTodo, emptyList } from "./model.ts";
import { decodeList, encodeList, readInvite, shareUrl } from "./share.ts";

const list = addTodo(emptyList("abcd1234", "Café ☕ list"), { title: "Grind beans ☕" }, 1, "t1");

describe("share links", () => {
  it("round-trips a list including unicode", () => {
    expect(decodeList(encodeList(list))).toEqual(list);
  });

  it("rejects junk payloads", () => {
    expect(decodeList("not-base64!!")).toBeNull();
    expect(decodeList(btoa(JSON.stringify({ hello: "world" })))).toBeNull();
  });

  it("builds a link that reads back as the same invite", () => {
    const url = shareUrl("https://ben.kallaus.me/todo/#old", list);
    expect(url.startsWith("https://ben.kallaus.me/todo/#list=abcd1234&data=")).toBe(true);
    expect(readInvite(new URL(url).hash)).toEqual({ listId: "abcd1234", snapshot: list });
  });

  it("reads an invite without a snapshot", () => {
    expect(readInvite("#list=abcd1234")).toEqual({ listId: "abcd1234", snapshot: null });
    expect(shareUrl("https://x.test/todo/", list, false)).toBe("https://x.test/todo/#list=abcd1234");
  });

  it("ignores bad ids and mismatched snapshots", () => {
    expect(readInvite("")).toBeNull();
    expect(readInvite("#list=../../etc")).toBeNull();
    expect(readInvite(`#list=zzzz9999&data=${encodeList(list)}`)).toEqual({ listId: "zzzz9999", snapshot: null });
  });
});

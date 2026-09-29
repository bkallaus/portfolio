import { isTodoList, type TodoList } from "./model.ts";

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (text: string): Uint8Array => {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

export const encodeList = (list: TodoList): string =>
  toBase64Url(new TextEncoder().encode(JSON.stringify(list)));

export function decodeList(text: string): TodoList | null {
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(text)));
    return isTodoList(value) ? value : null;
  } catch {
    return null;
  }
}

export type Invite = { listId: string; snapshot: TodoList | null };

export function readInvite(hash: string): Invite | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const listId = params.get("list");
  if (!listId || !/^[a-z0-9]{4,32}$/.test(listId)) return null;
  const data = params.get("data");
  const snapshot = data ? decodeList(data) : null;
  return { listId, snapshot: snapshot && snapshot.id === listId ? snapshot : null };
}

export function shareUrl(base: string, list: TodoList, withSnapshot = true): string {
  const params = new URLSearchParams({ list: list.id });
  if (withSnapshot) params.set("data", encodeList(list));
  return `${base.split("#")[0]}#${params.toString()}`;
}

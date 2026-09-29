import { useCallback, useEffect, useRef, useState } from "react";
import { goLive, type LiveSession, type LiveStatus } from "./live.ts";
import { emptyList, mergeLists, sameList, type TodoList } from "./model.ts";
import { readInvite } from "./share.ts";
import { loadSaved, type Saved, save } from "./store.ts";

export type Live = { status: LiveStatus | "off"; peers: number };

function openInvite(saved: Saved): Saved {
  const invite = readInvite(window.location.hash);
  if (!invite) return saved;
  const known = saved.lists[invite.listId] ?? emptyList(invite.listId, "Shared list", 0);
  const list = invite.snapshot ? mergeLists(known, invite.snapshot) : known;
  window.history.replaceState(null, "", `${window.location.pathname}#list=${invite.listId}`);
  return {
    lists: { ...saved.lists, [list.id]: list },
    currentId: list.id,
    live: saved.live.includes(list.id) ? saved.live : [...saved.live, list.id],
  };
}

let boot: Saved | undefined;

export function useLists() {
  const [saved, setSaved] = useState<Saved>(() => {
    boot ??= openInvite(loadSaved());
    return boot;
  });
  const [live, setLive] = useState<Live>({ status: "off", peers: 0 });
  const session = useRef<LiveSession | null>(null);
  const list = saved.lists[saved.currentId];
  const latest = useRef(list);
  latest.current = list;
  const isLive = saved.live.includes(saved.currentId);

  useEffect(() => save(saved), [saved]);

  const change = useCallback((edit: (list: TodoList) => TodoList) => {
    setSaved((prior) => {
      const current = prior.lists[prior.currentId];
      const next = edit(current);
      return sameList(current, next) ? prior : { ...prior, lists: { ...prior.lists, [next.id]: next } };
    });
  }, []);

  useEffect(() => {
    if (!isLive) {
      setLive({ status: "off", peers: 0 });
      return;
    }
    const listId = saved.currentId;
    const running = goLive(listId, {
      current: () => latest.current,
      onList: (incoming) =>
        setSaved((prior) => {
          const mine = prior.lists[listId];
          if (!mine) return prior;
          const merged = mergeLists(mine, incoming);
          return sameList(mine, merged) ? prior : { ...prior, lists: { ...prior.lists, [listId]: merged } };
        }),
      onStatus: (status, peers) => setLive({ status, peers }),
    });
    session.current = running;
    return () => {
      running.stop();
      session.current = null;
    };
  }, [isLive, saved.currentId]);

  useEffect(() => {
    session.current?.broadcast(list);
  }, [list]);

  const setLiveFor = useCallback((on: boolean) => {
    setSaved((prior) => ({
      ...prior,
      live: on ? [...new Set([...prior.live, prior.currentId])] : prior.live.filter((id) => id !== prior.currentId),
    }));
  }, []);

  const switchTo = useCallback((id: string) => {
    setSaved((prior) => (prior.lists[id] ? { ...prior, currentId: id } : prior));
  }, []);

  const createList = useCallback((name: string) => {
    const fresh = emptyList(undefined, name);
    setSaved((prior) => ({ ...prior, lists: { ...prior.lists, [fresh.id]: fresh }, currentId: fresh.id }));
  }, []);

  const forgetList = useCallback(() => {
    setSaved((prior) => {
      const { [prior.currentId]: _gone, ...rest } = prior.lists;
      const remaining = Object.keys(rest);
      if (remaining.length === 0) {
        const fresh = emptyList();
        return { lists: { [fresh.id]: fresh }, currentId: fresh.id, live: [] };
      }
      return {
        lists: rest,
        currentId: remaining[0],
        live: prior.live.filter((id) => id !== prior.currentId),
      };
    });
  }, []);

  return {
    list,
    lists: Object.values(saved.lists),
    isLive,
    live,
    change,
    setLive: setLiveFor,
    switchTo,
    createList,
    forgetList,
  };
}

import type React from "react";
import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import CalculationContainer from "./container";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  type Chore,
  daysUntilDue,
  describeDue,
  loadChores,
  saveChores,
  sortByDue,
  toIsoDay,
} from "../lib/chores";

const dueTone = (days: number) => {
  if (days < 0) return "text-destructive font-medium";
  if (days === 0) return "text-foreground font-medium";
  return "text-muted-foreground";
};

const RecurringChores = () => {
  const [chores, setChores] = useState<Chore[]>(loadChores);
  const [name, setName] = useState("");
  const [everyDays, setEveryDays] = useState("7");

  const today = new Date();

  const update = (next: Chore[]) => {
    setChores(next);
    saveChores(next);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const interval = Math.floor(Number(everyDays));
    const trimmed = name.trim();
    if (!trimmed || !(interval >= 1)) return;
    update([
      ...chores,
      { id: crypto.randomUUID(), name: trimmed, everyDays: interval, lastDone: toIsoDay(today) },
    ]);
    setName("");
  };

  const markDone = (id: string) => {
    update(chores.map((chore) => (chore.id === id ? { ...chore, lastDone: toIsoDay(today) } : chore)));
  };

  const remove = (id: string) => {
    update(chores.filter((chore) => chore.id !== id));
  };

  return (
    <CalculationContainer>
      <div className="w-full flex flex-col gap-6">
        <h4 className="text-center mb-0 text-xl font-semibold">Recurring Chores</h4>

        <form onSubmit={handleAdd} className="flex gap-4 flex-wrap items-end w-full">
          <div className="flex flex-col gap-2 flex-[2] min-w-[160px]">
            <Label htmlFor="chore-name">Chore</Label>
            <Input
              id="chore-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Water plants"
              required
            />
          </div>
          <div className="flex flex-col gap-2 w-28">
            <Label htmlFor="chore-every">Every (days)</Label>
            <Input
              id="chore-every"
              type="number"
              min={1}
              step={1}
              value={everyDays}
              onChange={(e) => setEveryDays(e.target.value)}
              required
            />
          </div>
          <Button type="submit">Add chore</Button>
        </form>

        {chores.length === 0 ? (
          <p className="italic text-muted-foreground text-center w-full">No chores yet. Add one above.</p>
        ) : (
          <ul aria-label="Chores" className="flex flex-col gap-2 list-none p-0 m-0">
            {sortByDue(chores, today).map((chore) => {
              const days = daysUntilDue(chore, today);
              return (
                <li
                  key={chore.id}
                  className="flex items-center gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="m-0 text-base font-semibold truncate">{chore.name}</h5>
                    <p className={`m-0 text-sm ${dueTone(days)}`}>
                      {`Every ${chore.everyDays === 1 ? "day" : `${chore.everyDays} days`} · ${describeDue(days)}`}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => markDone(chore.id)}
                    aria-label={`Mark ${chore.name} done`}
                  >
                    <Check className="size-4" />
                    Done
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(chore.id)}
                    aria-label={`Remove ${chore.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </CalculationContainer>
  );
};

export default RecurringChores;

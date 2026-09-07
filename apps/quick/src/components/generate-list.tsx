import React, { useState } from 'react';
import CalculationContainer from './container';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type ListItem = {
  id: string;
  key: string;
  value: string;
};

const ShareableList = () => {
  const [items, setItems] = useState<ListItem[]>(() => {
    const params = new URLSearchParams(window.location.search);
    const initialItems: ListItem[] = [];
    params.forEach((value, key) => {
      initialItems.push({
        id: Math.random().toString(36).substr(2, 9),
        key,
        value,
      });
    });
    return initialItems;
  });
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKey && newValue) {
      setItems([
        ...items,
        {
          id: Math.random().toString(36).substr(2, 9),
          key: newKey,
          value: newValue,
        },
      ]);
      setNewKey("");
      setNewValue("");
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <CalculationContainer>
      <div className="w-full flex flex-col gap-6 mt-4">
        <h4 className="text-center mb-0 text-xl font-semibold">Generate Shareable List</h4>

        {/* Add Item Form */}
        <form onSubmit={handleAddItem} className="flex gap-4 flex-wrap items-end w-full">
          <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
            <Label>Key</Label>
            <Input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="e.g. Username"
              required
              className="mb-0"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
            <Label>Value</Label>
            <Input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="e.g. admin"
              required
              className="mb-0"
            />
          </div>
          <Button type="submit" className="w-auto mb-0">Add</Button>
        </form>
      </div>
    </CalculationContainer>
  );
};

export default ShareableList;

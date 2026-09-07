import React, { useState, useEffect } from 'react';
import CalculationContainer from './container';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import { Button } from "./ui/button";

type ListItem = {
  id: string;
  key: string;
  value: string;
};

const ShareableList = () => {
  const [items] = useState<ListItem[]>(() => {
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

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (copiedId) {
      const timer = setTimeout(() => {
        setCopiedId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedId]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <CalculationContainer>
      <div className="w-full flex flex-col gap-6 mt-4">
        <h4 className="text-center mb-0 text-xl font-semibold">Shareable List</h4>

        {/* List of Cards */}
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <Card key={item.id} className="m-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">{item.key}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="break-all">{item.value}</div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleCopy(item.id, item.value)}
                  aria-label={`Copy ${item.value} to clipboard`}
                >
                  {copiedId === item.id ? 'Copied!' : 'Copy'}
                </Button>
              </CardFooter>
            </Card>
          ))}
          {items.length === 0 && (
            <p className="italic text-muted-foreground text-center w-full">No items in the list. Add one below!</p>
          )}
        </div>
      </div>
    </CalculationContainer>
  );
};

export default ShareableList;

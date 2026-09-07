import { useState, useEffect } from 'react';

export type SearchSegment = {
  id: string;
  value: string;
  inclusive: boolean;
  categoryId: string;
};

const STORAGE_KEY = 'pokego_search_string';

export function useSearchString() {
  const [segments, setSegments] = useState<SearchSegment[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSegments(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved search string', e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(segments));
    }
  }, [segments, isLoaded]);

  const addSegment = (value: string, inclusive: boolean, categoryId: string) => {
    setSegments((prev) => [
      ...prev,
      { id: crypto.randomUUID(), value, inclusive, categoryId }
    ]);
  };

  const toggleSegment = (value: string, categoryId: string) => {
    setSegments((prev) => {
      const index = prev.findIndex((s) => s.value === value);
      if (index === -1) {
        return [...prev, { id: crypto.randomUUID(), value, inclusive: true, categoryId }];
      }
      
      const current = prev[index];
      if (current.inclusive) {
        const newSegments = [...prev];
        newSegments[index] = { ...current, inclusive: false };
        return newSegments;
      }
      
      return prev.filter((_, i) => i !== index);
    });
  };

  const undo = () => {
    setSegments((prev) => prev.slice(0, -1));
  };

  const clear = () => {
    setSegments([]);
  };

  const groupedByCategory = segments.reduce((acc, seg) => {
    if (!acc[seg.categoryId]) {
      acc[seg.categoryId] = [];
    }
    acc[seg.categoryId].push(`${seg.inclusive ? '' : '!'}${seg.value}`);
    return acc;
  }, {} as Record<string, string[]>);

  const searchString = Object.values(groupedByCategory)
    .map((group) => group.join(','))
    .join('&');

  return {
    segments,
    searchString,
    addSegment,
    toggleSegment,
    undo,
    clear,
  };
}

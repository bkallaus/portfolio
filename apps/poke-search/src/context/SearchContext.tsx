import React, {
  createContext,
  useContext,
  useState,
  useTransition,
  useCallback,
  useOptimistic,
} from 'react';
import type { ReactNode } from 'react';
import type { SearchSegment, SearchContextType } from '../types';

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [segments, setSegments] = useState<SearchSegment[]>([]);
  const [, startTransition] = useTransition();

  const buildString = (segs: SearchSegment[]) =>
    segs.map((s) => (s.inclusive ? '' : '!') + s.value).join('&');

  const [optimisticString, addOptimisticUpdate] = useOptimistic(
    buildString(segments),
    (_state, newSegments: SearchSegment[]) => buildString(newSegments)
  );

  const addSegment = useCallback(
    (value: string, inclusive: boolean, categoryId: string) => {
      startTransition(() => {
        const nextSegments = [
          ...segments.filter((s) => s.value !== value),
          { id: crypto.randomUUID(), value, inclusive, categoryId },
        ];
        addOptimisticUpdate(nextSegments);
        setSegments(nextSegments);
      });
    },
    [segments, addOptimisticUpdate]
  );

  const toggleSegment = useCallback(
    (value: string, categoryId: string) => {
      startTransition(() => {
        const index = segments.findIndex((s) => s.value === value && s.categoryId === categoryId);
        let nextSegments: SearchSegment[];
        if (index >= 0) {
          const currentSegment = segments[index];
          if (currentSegment.inclusive) {
            // 2nd click: invert to exclusive
            nextSegments = [...segments];
            nextSegments[index] = { ...currentSegment, inclusive: false };
          } else {
            // 3rd click: remove
            nextSegments = segments.filter((_, i) => i !== index);
          }
        } else {
          // 1st click: add as inclusive
          nextSegments = [
            ...segments,
            { id: crypto.randomUUID(), value, inclusive: true, categoryId },
          ];
        }
        addOptimisticUpdate(nextSegments);
        setSegments(nextSegments);
      });
    },
    [segments, addOptimisticUpdate]
  );

  const undo = useCallback(() => {
    startTransition(() => {
      const nextSegments = segments.slice(0, -1);
      addOptimisticUpdate(nextSegments);
      setSegments(nextSegments);
    });
  }, [segments, addOptimisticUpdate]);

  const clear = useCallback(() => {
    startTransition(() => {
      const nextSegments: SearchSegment[] = [];
      addOptimisticUpdate(nextSegments);
      setSegments(nextSegments);
    });
  }, [addOptimisticUpdate]);

  return (
    <SearchContext.Provider
      value={{ segments, optimisticString, addSegment, toggleSegment, undo, clear }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

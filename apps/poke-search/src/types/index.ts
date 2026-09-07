export interface SearchSegment {
  id: string;
  value: string;
  inclusive: boolean;
  categoryId: string;
}

export interface SearchContextType {
  segments: SearchSegment[];
  optimisticString: string;
  addSegment: (value: string, inclusive: boolean, categoryId: string) => void;
  toggleSegment: (value: string, categoryId: string) => void;
  undo: () => void;
  clear: () => void;
}

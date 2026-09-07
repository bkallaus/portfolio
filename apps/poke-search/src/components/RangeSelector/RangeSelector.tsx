import { useState } from 'react';
import styles from './RangeSelector.module.css';

interface RangeSelectorProps {
  label: string;
  prefix: string; // e.g., 'age', 'distance', 'buddy'
  placeholder?: string;
  onAdd: (value: string, inclusive: boolean) => void;
}

export function RangeSelector({ label, prefix, placeholder, onAdd }: RangeSelectorProps) {
  const [val, setVal] = useState('');

  const handleAdd = (inclusive: boolean) => {
    if (!val.trim()) return;
    onAdd(`${prefix}${val.trim()}`, inclusive);
    setVal('');
  };

  return (
    <div className={styles.card}>
      <span className={styles.title}>{label}</span>
      <div className={styles.inputRow}>
        <input 
          type="text" 
          className={styles.input} 
          placeholder={placeholder || "e.g. 0-5"}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd(true);
          }}
        />
        <button 
          className={`clay-btn ${styles.actionBtn} ${styles.btnPlus}`}
          onClick={() => handleAdd(true)}
          aria-label={`Include ${label}`}
        >
          +
        </button>
        <button 
          className={`clay-btn ${styles.actionBtn} ${styles.btnMinus}`}
          onClick={() => handleAdd(false)}
          aria-label={`Exclude ${label}`}
        >
          -
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import styles from './CPSelector.module.css';

interface CPSelectorProps {
  onAdd: (value: string, inclusive: boolean) => void;
}

export function CPSelector({ onAdd }: CPSelectorProps) {
  const [customCP, setCustomCP] = useState('');

  const handlePreset = (val: string) => {
    onAdd(val, true);
  };

  const handleCustomAdd = (inclusive: boolean) => {
    if (!customCP.trim()) return;
    
    // Auto-prefix with 'cp' if user didn't write it
    let finalVal = customCP.trim().toLowerCase();
    if (!finalVal.startsWith('cp')) {
      finalVal = `cp${finalVal}`;
    }
    
    onAdd(finalVal, inclusive);
    setCustomCP('');
  };

  return (
    <div className={styles.card}>
      <span className={styles.title}>CP Targeting</span>
      
      <div className={styles.presets}>
        <button className={`clay-btn ${styles.presetBtn}`} onClick={() => handlePreset('cp-1500')}>
          <span className={styles.league}>Great League</span>
          <span className={styles.cp}>≤ 1500</span>
        </button>
        <button className={`clay-btn ${styles.presetBtn}`} onClick={() => handlePreset('cp-2500')}>
          <span className={styles.league}>Ultra League</span>
          <span className={styles.cp}>≤ 2500</span>
        </button>
      </div>

      <div className={styles.customSection}>
        <span className={styles.title} style={{fontSize: '1rem'}}>Custom CP (e.g. "cp100-500" or "-1500")</span>
        <div className={styles.inputRow}>
          <input 
            type="text" 
            className={styles.input} 
            placeholder="e.g. 1500-2500"
            value={customCP}
            onChange={(e) => setCustomCP(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCustomAdd(true);
            }}
          />
          <button 
            className={`clay-btn ${styles.actionBtn} ${styles.btnPlus}`}
            onClick={() => handleCustomAdd(true)}
            aria-label="Include Custom CP"
          >
            +
          </button>
          <button 
            className={`clay-btn ${styles.actionBtn} ${styles.btnMinus}`}
            onClick={() => handleCustomAdd(false)}
            aria-label="Exclude Custom CP"
          >
            -
          </button>
        </div>
      </div>
    </div>
  );
}

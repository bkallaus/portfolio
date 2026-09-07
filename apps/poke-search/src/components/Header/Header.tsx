import React, { useState } from 'react';
import { useSearch } from '../../context/SearchContext';
import styles from './Header.module.css';

interface HeaderProps {
  ref?: React.RefObject<HTMLTextAreaElement | null>;
}

export function Header({ ref }: HeaderProps) {
  const { optimisticString, undo, clear } = useSearch();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (optimisticString) {
      navigator.clipboard.writeText(optimisticString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className={styles.header}>
      <textarea
        ref={ref}
        readOnly
        value={optimisticString}
        className={styles.display}
        placeholder="Build your Pokémon GO search string..."
      />
      <div className={styles.actions}>
        <button 
          className={`${styles.actionBtn} ${styles.copy}`} 
          onClick={handleCopy}
          disabled={!optimisticString}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button className={`${styles.actionBtn} ${styles.undo}`} onClick={undo} disabled={!optimisticString}>
          Undo
        </button>
        <button className={`${styles.actionBtn} ${styles.clear}`} onClick={clear} disabled={!optimisticString}>
          Clear
        </button>
      </div>
    </header>
  );
}

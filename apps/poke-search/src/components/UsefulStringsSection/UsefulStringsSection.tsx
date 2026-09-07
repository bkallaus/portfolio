import { useState } from 'react';
import styles from './UsefulStringsSection.module.css';

const STRINGS = [
  {
    label: '90%+ IVs',
    value: '!#&!#,3attack&!#,4defense&!#,4hp&!#,4attack&!#,4attack,3attack&!#,4attack,4defense&!#,4attack,4hp&!#,3defense&!#,3defense,3attack&!#,3defense,4defense&!#,3defense,4hp&!#,4hp&!#,4hp,3attack&!#,4hp,4defense&!#,4hp&4attack,!#&4attack,!#,3attack&4attack,!#,4defense&4attack,!#,4hp&4attack,!#&4attack,3attack&4attack,4defense&4attack,4hp&4attack,3defense,!#&4attack,3defense,3attack&4attack,3defense,4defense&4attack,3defense,4hp&4attack,4hp,!#&4attack,4hp,3attack&4attack,4hp,4defense&4attack,4hp&4defense,!#&4defense,!#,3attack&4defense,!#&4defense,!#,4hp&4defense,4attack,!#&4defense,4attack,3attack&4defense,4attack&4defense,4attack,4hp&4defense,3defense,!#&4defense,3defense,3attack&4defense,3defense&4defense,3defense,4hp&4defense,4hp,!#&4defense,4hp,3attack&4defense,4hp&4defense,4hp&3hp,!#&3hp,!#,3attack&3hp,!#,4defense&3hp,!#,4hp&3hp,4attack,!#&3hp,4attack,3attack&3hp,4attack,4defense&3hp,4attack,4hp&3hp,3defense,!#&3hp,3defense,3attack&3hp,3defense,4defense&3hp,3defense,4hp&3hp,4hp,!#&3hp,4hp,3attack&3hp,4hp,4defense&3hp,4hp'
  }
];

export function UsefulStringsSection() {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (val: string, id: number) => {
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.title}>Useful Strings</h2>
      </header>
      <div className={styles.list}>
        {STRINGS.map((str, idx) => (
          <div key={idx} className={styles.item}>
            <div className={styles.label}>{str.label}</div>
            <div className={styles.valueRow}>
              <textarea readOnly value={str.value} className={styles.textarea} />
              <button 
                className={styles.copyBtn} 
                onClick={() => handleCopy(str.value, idx)}
              >
                {copiedId === idx ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

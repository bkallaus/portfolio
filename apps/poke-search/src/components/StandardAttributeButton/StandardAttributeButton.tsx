import styles from './StandardAttributeButton.module.css';

interface StandardAttributeButtonProps {
  label: string;
  value: string;
  onToggle: (value: string) => void;
  isActive: boolean;
  isExcluded: boolean;
}

export function StandardAttributeButton({ label, value, onToggle, isActive, isExcluded }: StandardAttributeButtonProps) {
  let btnClass = styles.card;
  if (isActive) btnClass += ` ${styles.active}`;
  if (isExcluded) btnClass += ` ${styles.excluded}`;

  return (
    <button 
      className={`clay-btn ${btnClass}`}
      onClick={() => onToggle(value)}
      aria-label={`Toggle ${label}`}
    >
      <span className={styles.label}>{label}</span>
    </button>
  );
}

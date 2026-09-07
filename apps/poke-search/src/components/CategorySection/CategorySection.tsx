import type { ReactNode } from 'react';
import styles from './CategorySection.module.css';

interface CategorySectionProps {
  title: string;
  color?: string;
  children: ReactNode;
}

export function CategorySection({ title, color, children }: CategorySectionProps) {
  const sectionClass = `${styles.section} ${color ? styles[color] : ''}`;

  return (
    <section className={sectionClass}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
      </header>
      <div className={styles.grid}>
        {children}
      </div>
    </section>
  );
}

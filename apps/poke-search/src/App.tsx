import { useRef } from 'react';
import { useSearch } from './context/SearchContext';
import { Header } from './components/Header/Header';
import { CategorySection } from './components/CategorySection/CategorySection';
import { StandardAttributeButton } from './components/StandardAttributeButton/StandardAttributeButton';
import { IVSelector } from './components/IVSelector/IVSelector';
import { CPSelector } from './components/CPSelector/CPSelector';
import { RangeSelector } from './components/RangeSelector/RangeSelector';
import { UsefulStringsSection } from './components/UsefulStringsSection/UsefulStringsSection';
import { categories } from './constants/data';
import styles from './App.module.css';

function App() {
  const { segments, toggleSegment, addSegment } = useSearch();
  const headerRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className={styles.container}>
      <Header ref={headerRef} />

      <main className={styles.main}>
        {categories.map((cat) => (
          <CategorySection key={cat.id} title={cat.title} color={cat.color}>
            {cat.type === 'standard' && cat.attributes?.map((attr) => {
              const segment = segments.find(s => s.value === attr.value);
              return (
                <StandardAttributeButton
                  key={attr.value}
                  label={attr.label}
                  value={attr.value}
                  onToggle={(v) => toggleSegment(v, cat.id)}
                  isActive={segment !== undefined && segment.inclusive === true}
                  isExcluded={segment !== undefined && segment.inclusive === false}
                />
              );
            })}

            {cat.type === 'iv' && (
              <IVSelector segments={segments} onToggle={(v) => toggleSegment(v, cat.id)} />
            )}

            {cat.type === 'cp' && (
              <CPSelector onAdd={(v, i) => addSegment(v, i, cat.id)} />
            )}

            {cat.type === 'range' && (
              <>
                <RangeSelector label="Age (Days)" prefix="age" onAdd={(v, i) => addSegment(v, i, 'range-age')} placeholder="e.g. 0" />
                <RangeSelector label="Distance (km)" prefix="distance" onAdd={(v, i) => addSegment(v, i, 'range-dist')} placeholder="e.g. 100-" />
                <RangeSelector label="Buddy Level" prefix="buddy" onAdd={(v, i) => addSegment(v, i, 'range-buddy')} placeholder="1-5" />
                <RangeSelector label="Year Limit" prefix="year" onAdd={(v, i) => addSegment(v, i, 'range-year')} placeholder="e.g. 2016" />
              </>
            )}
          </CategorySection>
        ))}
        
        <UsefulStringsSection />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p>PokéGO Search String Builder</p>
        </div>
      </footer>
    </div>
  );
}

export default App;

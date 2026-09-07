import React, { useState, useRef } from 'react';
import { Dex } from '@pkmn/dex';
import { TypeGrid } from './TypeGrid';
import { allSpecies, allTypes } from '../data';

export const TypeChartPanel = () => {
  const [attackingType, setAttackingType] = useState<string>('Normal');
  const [defendingTypes, setDefendingTypes] = useState<string[]>(['Normal']);
  const [defendingSpecies, setDefendingSpecies] = useState<string>('');
  const speciesInputRef = useRef<HTMLInputElement>(null);

  const handleSpeciesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDefendingSpecies(val);
    const speciesInfo = Dex.species.get(val);
    if (speciesInfo && speciesInfo.exists) {
      setDefendingTypes(speciesInfo.types);
    }
  };

  const handleTypeToggle = (t: string) => {
    setDefendingSpecies('');
    if (defendingTypes.includes(t)) {
      setDefendingTypes(defendingTypes.filter(type => type !== t));
    } else {
      if (defendingTypes.length < 2) {
        setDefendingTypes([...defendingTypes, t]);
      } else {
        // Replace the oldest selection if trying to add a third
        setDefendingTypes([defendingTypes[1], t]);
      }
    }
  };

  const p2Types = defendingTypes;

  let multiplier = 1;
  let effText = "";
  if (p2Types.length === 0) {
    effText = "No Type Selected";
  } else if (attackingType) {
    const isImmune = !Dex.getImmunity(attackingType, p2Types);
    if (isImmune) {
      multiplier = 0;
    } else {
      const eff = Dex.getEffectiveness(attackingType, p2Types);
      multiplier = Math.pow(2, eff);
    }
    effText = multiplier === 0 ? "Immune (0x)" : multiplier === 1 ? "Neutral (1x)" : `${multiplier}x Effective`;
  }

  const resultColor = p2Types.length === 0 ? 'var(--text-muted)' : multiplier > 1 ? 'var(--hp-green)' : multiplier < 1 && multiplier > 0 ? 'var(--hp-yellow)' : multiplier === 0 ? 'var(--text-muted)' : 'var(--text-main)';
  const resultBorder = p2Types.length === 0 ? 'var(--border)' : multiplier > 1 ? 'var(--hp-green)' : multiplier < 1 ? 'var(--hp-red)' : 'var(--border)';

  return (
    <div className="builder-panel" style={{ marginTop: '1.5rem' }}>
      <h2>Type Matchup Calculator</h2>
      
      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label id="attacking-type-label">Attacking Type</label>
        <div role="group" aria-labelledby="attacking-type-label" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
          {allTypes.map(t => (
            <button
              type="button"
              key={t}
              onClick={() => setAttackingType(t)}
              className={`tab-btn ${attackingType === t ? 'active' : ''}`}
              aria-pressed={attackingType === t}
              style={{ border: '1px solid var(--border)', fontSize: '14px' }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label id="defending-type-label">Defending Type(s) - Select up to 2</label>
        <div role="group" aria-labelledby="defending-type-label" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
          {allTypes.map(t => {
            const isImmune = !Dex.getImmunity(attackingType, [t]);
            const eff = Dex.getEffectiveness(attackingType, [t]);
            const multiplier = isImmune ? 0 : Math.pow(2, eff);

            let bg = 'transparent';
            let color = 'var(--text-main)';
            let borderColor = 'var(--border)';
            let effBadge = '';

            if (multiplier === 0) {
              bg = 'var(--text-muted)';
              color = 'white';
              borderColor = 'var(--text-muted)';
              effBadge = '0x';
            } else if (multiplier === 0.5) {
              bg = 'var(--hp-yellow)';
              color = 'white';
              borderColor = 'var(--hp-yellow)';
              effBadge = '½x';
            } else if (multiplier === 2) {
              bg = 'var(--hp-green)';
              color = 'white';
              borderColor = 'var(--hp-green)';
              effBadge = '2x';
            }

            const isActive = defendingTypes.includes(t);

            return (
              <button
                type="button"
                key={t}
                onClick={() => handleTypeToggle(t)}
                className={`tab-btn`}
                aria-pressed={isActive}
                style={{ 
                  background: bg,
                  color: color,
                  border: `2px solid ${isActive ? '#0f1d26' : borderColor}`,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: isActive ? 'bold' : 'normal',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                  transform: isActive ? 'scale(1.05)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {t} {effBadge && <span style={{ opacity: 0.9, fontSize: '11px', background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px' }}>{effBadge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>— OR —</div>

      <div className="form-group" style={{ marginBottom: '1.5rem', maxWidth: '300px' }}>
        <label htmlFor="defending-species-input">Search Defending Pokémon</label>
        <div className="input-with-clear" style={{ marginTop: '0.5rem' }}>
          <input 
            ref={speciesInputRef}
            id="defending-species-input"
            list="species-list-typechart" 
            value={defendingSpecies} 
            onChange={handleSpeciesChange} 
            placeholder="Type a Pokémon..."
          />
          {defendingSpecies && (
            <button type="button" className="clear-input-btn" onClick={() => { setDefendingSpecies(''); speciesInputRef.current?.focus(); }} aria-label="Clear defending species">✕</button>
          )}
        </div>
        <datalist id="species-list-typechart">
          {allSpecies.map(s => <option key={s.name} value={s.name} />)}
        </datalist>
      </div>

      <div role="status" aria-live="polite" style={{ marginTop: '32px', padding: '24px', borderRadius: '16px', background: '#ffffff', border: `1px solid ${resultBorder}`, boxShadow: 'var(--surface-1-shadow)' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Result vs {defendingSpecies ? defendingSpecies : p2Types.length > 0 ? p2Types.join('/') : 'None'} 
          <span style={{ display: 'flex', gap: '0.25rem' }}>
            {p2Types.map(t => (
              <span key={t} className="type-chip">{t}</span>
            ))}
          </span>
        </h3>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: resultColor }}>
          {effText}
        </div>
      </div>
      <TypeGrid />
    </div>
  );
};

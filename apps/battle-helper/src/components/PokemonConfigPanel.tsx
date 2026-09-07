import React, { useState, useRef } from 'react';
import { Dex } from '@pkmn/dex';
import { PokemonConfig } from '../types';
import { allSpecies, allNatures } from '../data';
import { defaultEVs, defaultBoosts } from '../constants';

const calculateStat = (statName: string, baseStat: number, level: number, iv: number, ev: number, boost: number, natureName: string) => {
  if (baseStat === 0) return 0;

  // Calculate raw stat
  let stat = 0;
  if (statName === 'hp') {
      if (baseStat === 1) return 1; // Shedinja
      stat = Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
  } else {
      stat = Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + 5;
      
      // Apply Nature multiplier
      const nature = Dex.natures.get(natureName);
      if (nature?.plus === statName) {
          stat = Math.floor(stat * 1.1);
      } else if (nature?.minus === statName) {
          stat = Math.floor(stat * 0.9);
      }
  }

  // Apply boosts
  if (statName !== 'hp') {
      if (boost > 0) {
          stat = Math.floor(stat * (2 + boost) / 2);
      } else if (boost < 0) {
          stat = Math.floor(stat * 2 / (2 - boost));
      }
  }

  return stat;
};

const statNames: Record<string, string> = {
  hp: 'HP',
  atk: 'Atk',
  def: 'Def',
  spa: 'SpA',
  spd: 'SpD',
  spe: 'Spe'
};

export const PokemonConfigPanel = ({ title, config, setConfig, isP2, onSave }: { title: string, config: PokemonConfig, setConfig: any, isP2: boolean, onSave?: () => void }) => {
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const speciesInputRef = useRef<HTMLInputElement>(null);
  const natureInputRef = useRef<HTMLInputElement>(null);
  const speciesInfo = Dex.species.get(config.species);
  const types = speciesInfo?.types || [];
  const baseStats = speciesInfo?.baseStats || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  const currentNature = Dex.natures.get(config.nature);

  const handleSpeciesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, species: e.target.value, moves: [] });
  };

  return (
    <div className="builder-panel">
      <h2>{title}</h2>
      <div className="form-group">
        <label htmlFor={`species-input-${isP2 ? 'p2' : 'p1'}`}>Species & Types</label>
        <div className="species-input-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div className="input-with-clear" style={{ flex: 1, minWidth: '200px' }}>
            <input
              ref={speciesInputRef}
              id={`species-input-${isP2 ? 'p2' : 'p1'}`}
              list={`species-list-${isP2 ? 'p2' : 'p1'}`}
              value={config.species}
              onChange={handleSpeciesChange}
              placeholder="Type a Pokémon..."
            />
            {config.species && (
              <button type="button" className="clear-input-btn" onClick={() => { setConfig({ ...config, species: '', moves: [] }); speciesInputRef.current?.focus(); }} aria-label="Clear species">✕</button>
            )}
          </div>
          <datalist id={`species-list-${isP2 ? 'p2' : 'p1'}`}>
            {allSpecies.map(s => <option key={s.name} value={s.name} />)}
          </datalist>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {types.map(t => (
              <span key={t} className="type-chip">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor={`nature-input-${isP2 ? "p2" : "p1"}`}>Nature</label>
        <div className="input-with-clear">
          <input
            ref={natureInputRef}
            id={`nature-input-${isP2 ? "p2" : "p1"}`}
            list={`nature-list-${isP2 ? "p2" : "p1"}`}
            value={config.nature}
            onChange={(e) => setConfig({ ...config, nature: e.target.value })}
            placeholder="Type a Nature..."
          />
          {config.nature && (
            <button type="button" className="clear-input-btn" onClick={() => { setConfig({ ...config, nature: "Serious" }); natureInputRef.current?.focus(); }} aria-label="Clear nature">✕</button>
          )}
        </div>
        <datalist id={`nature-list-${isP2 ? "p2" : "p1"}`}>
          {allNatures.map(n => {
            const plus = n.plus ? statNames[n.plus] : null;
            const minus = n.minus ? statNames[n.minus] : null;
            const label = plus && minus ? `${n.name} (+${plus}, -${minus})` : `${n.name} (Neutral)`;
            return <option key={n.name} value={n.name}>{label}</option>;
          })}
        </datalist>
      </div>

      <details style={{ marginBottom: '16px', background: '#f3f4f5', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <summary style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', fontWeight: 500, letterSpacing: '0.05em' }}>
          Level (Currently: {config.level})
        </summary>
        <div style={{ marginTop: '0.5rem' }}>
          <input type="number" aria-label="Pokemon Level" value={config.level} min={1} max={100} onChange={e => setConfig({ ...config, level: parseInt(e.target.value) || 50 })} style={{ width: '100%' }} />
        </div>
      </details>

      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Stats (EVs / Boosts)</label>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        <div className="stats-grid-header">
          <span style={{ textAlign: 'left' }}>STAT</span><span>BASE</span><span>EV (0-32)</span><span>BOOST (-6 to +6)</span><span>TOTAL</span>
        </div>
        {(Object.keys(config.evs) as Array<keyof typeof config.evs>).map(stat => {
          const isPlus = currentNature?.plus === stat;
          const isMinus = currentNature?.minus === stat;
          return (
          <div key={stat} className="stat-row">
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold', color: isPlus ? 'var(--hp-green, #10b981)' : isMinus ? 'var(--hp-red, #ef4444)' : 'inherit' }}>
              {stat}{isPlus ? '+' : isMinus ? '-' : ''}
            </span>
            <span className="stat-base-badge">{(baseStats as any)[stat]}</span>
            <div className="stat-controls" role="group" aria-label={`${stat} EV controls`}>
              <span className="stat-value">{config.evs[stat]}</span>
              <button
                type="button"
                className={config.evs[stat] > 0 ? "stat-btn clr-btn" : "stat-btn"}
                onClick={() => setConfig({ ...config, evs: { ...config.evs, [stat]: config.evs[stat] > 0 ? 0 : 32 } })}
                aria-label={config.evs[stat] > 0 ? `Clear ${stat} EVs` : `Maximize ${stat} EVs`}
              >
                {config.evs[stat] > 0 ? 'Clr' : 'Max'}
              </button>
            </div>
            {stat !== 'hp' ? (
              <div className="stat-controls" role="group" aria-label={`${stat} boost controls`}>
                <span className="stat-value">{config.boosts[stat] > 0 ? `+${config.boosts[stat]}` : config.boosts[stat]}</span>
                <button
                  type="button"
                  className="stat-btn"
                  onClick={() => setConfig({ ...config, boosts: { ...config.boosts, [stat]: Math.min(6, config.boosts[stat] + 1) } })}
                  disabled={config.boosts[stat] >= 6}
                  aria-label={`Increase ${stat} boost`}
                  title={config.boosts[stat] >= 6 ? "Maximum boost reached" : "Increase boost"}
                >+1</button>
                <button
                  type="button"
                  className="stat-btn"
                  onClick={() => setConfig({ ...config, boosts: { ...config.boosts, [stat]: Math.max(-6, config.boosts[stat] - 1) } })}
                  disabled={config.boosts[stat] <= -6}
                  aria-label={`Decrease ${stat} boost`}
                  title={config.boosts[stat] <= -6 ? "Minimum boost reached" : "Decrease boost"}
                >-1</button>
              </div>
            ) : <div />}
            <span className="stat-total-badge">{calculateStat(stat, (baseStats as any)[stat], config.level, config.ivs[stat], config.evs[stat], stat !== 'hp' ? config.boosts[stat] : 0, config.nature)}</span>
          </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '16px' }}>
        <button
          type="button"
          onClick={() => setConfig({ ...config, evs: { ...defaultEVs }, boosts: { ...defaultBoosts } })}
          className="stat-btn clr-btn"
          style={{ flex: 1 }}
        >
          Clear All Stats
        </button>
        {onSave && (
          <button
            type="button"
            onClick={() => {
              onSave();
              setShowSavedFeedback(true);
              setTimeout(() => setShowSavedFeedback(false), 2000);
            }}
            aria-live="polite"
            style={{ 
              flex: 1, 
              backgroundColor: showSavedFeedback ? 'var(--hp-green)' : 'var(--accent)',
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {showSavedFeedback ? '✅ Saved!' : 'Save to Team'}
          </button>
        )}
      </div>
    </div>
  );
};

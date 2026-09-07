import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dex } from '@pkmn/dex';
import { calculate, Pokemon, Move } from '@smogon/calc';

import { PokemonConfig } from './types';
import { defaultP1, defaultP2 } from './constants';
import { allMoves } from './data';
import { PokemonConfigPanel } from './components/PokemonConfigPanel';
import { TypeChartPanel } from './components/TypeChartPanel';
import { TypeFlashcardsPanel } from './components/TypeFlashcardsPanel';

const CopyCalcButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (copied) {
      timeout = setTimeout(() => setCopied(false), 2000);
    }
    return () => clearTimeout(timeout);
  }, [copied]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className={`stat-btn copy-btn ${copied ? 'copied' : ''}`}
      aria-label="Copy calculation"
      aria-live="polite"
    >
      {copied ? '✅ Copied' : '📋 Copy'}
    </button>
  );
};

const App: React.FC = () => {
  const [p1Config, setP1Config] = useState<PokemonConfig>(defaultP1);
  const [p2Config, setP2Config] = useState<PokemonConfig>(defaultP2);
  const [p1Learnset, setP1Learnset] = useState<string[]>([]);
  const [moveFilter, setMoveFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'calc' | 'types' | 'flashcards'>('calc');
  const [team, setTeam] = useState<PokemonConfig[]>(() => {
    try {
      const saved = localStorage.getItem('vgc-team');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isTeamFabOpen, setIsTeamFabOpen] = useState(false);
  const teamDrawerRef = useRef<HTMLDivElement>(null);
  const moveFilterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isTeamFabOpen && teamDrawerRef.current && !teamDrawerRef.current.contains(event.target as Node)) {
        const target = event.target as Element;
        if (!target.closest('.team-fab')) {
          setIsTeamFabOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTeamFabOpen]);

  useEffect(() => {
    localStorage.setItem('vgc-team', JSON.stringify(team));
  }, [team]);

  const handleSaveToTeam = () => {
    setTeam(prev => [...prev, { ...p1Config }]);
    setIsTeamFabOpen(true);
  };

  const toggleCoreMove = (moveName: string) => {
    const currentMoves = [...(p1Config.moves || [])].filter(m => m);
    const existingIndex = currentMoves.indexOf(moveName);
    
    if (existingIndex >= 0) {
      currentMoves.splice(existingIndex, 1);
    } else {
      currentMoves.push(moveName);
    }
    setP1Config({ ...p1Config, moves: currentMoves });
  };

  useEffect(() => {
    let active = true;
    const fetchLearnset = async () => {
      const speciesInfo = Dex.species.get(p1Config.species);
      if (!speciesInfo) return;
      
      const learnableMoves = new Set<string>();
      
      const getMovesForSpecies = async (speciesId: string) => {
        try {
          const learnset = await Dex.learnsets.get(speciesId);
          if (learnset && learnset.learnset) {
            Object.keys(learnset.learnset).forEach(m => learnableMoves.add(m));
          }
        } catch (e) {
          // Ignore
        }
      };

      await getMovesForSpecies(speciesInfo.id);
      
      if (speciesInfo.baseSpecies && speciesInfo.baseSpecies !== speciesInfo.name) {
        const baseSpeciesInfo = Dex.species.get(speciesInfo.baseSpecies);
        if (baseSpeciesInfo) {
          await getMovesForSpecies(baseSpeciesInfo.id);
        }
      }

      if (!active) return;

      if (learnableMoves.size > 0) {
        setP1Learnset(allMoves.filter(m => learnableMoves.has(m.id)).map(m => m.name));
      } else {
        setP1Learnset(allMoves.map(m => m.name));
      }
    };
    
    fetchLearnset();
    return () => { active = false; };
  }, [p1Config.species]);

  // Compute damage calculations automatically whenever config changes
  const damageResults = useMemo(() => {
    try {
      const p1 = new Pokemon(9, p1Config.species, {
        level: p1Config.level,
        nature: p1Config.nature,
        ivs: p1Config.ivs,
        evs: p1Config.evs,
        boosts: p1Config.boosts,
      });

      const p2 = new Pokemon(9, p2Config.species, {
        level: p2Config.level,
        nature: p2Config.nature,
        ivs: p2Config.ivs,
        evs: p2Config.evs,
        boosts: p2Config.boosts,
      });

      const p2Types = Dex.species.get(p2Config.species)?.types || [];

      const results = p1Learnset.map(moveName => {
        try {
          const pkmnMove = Dex.moves.get(moveName);
          const move = new Move(9, moveName);
          
          if (move.category === 'Status') return null;

          let effText = "";
          let multiplier = 1;
          
          if (pkmnMove) {
            const isImmune = !Dex.getImmunity(pkmnMove.type, p2Types);
            if (isImmune) {
              multiplier = 0;
            } else {
              const eff = Dex.getEffectiveness(pkmnMove.type, p2Types);
              multiplier = Math.pow(2, eff);
            }
            effText = multiplier === 0 ? "Immune (0x)" : multiplier === 1 ? "Neutral (1x)" : `${multiplier}x Effective`;
          }
          
          if (multiplier === 0) {
            return {
              move: moveName,
              desc: 'Immune',
              context: 'Does not affect the target.',
              damageStr: '0',
              koStr: '',
              eff: effText,
              multiplier,
              maxDamage: 0
            };
          }

          const result = calculate(9, p1, p2, move);
          
          let maxDamage = 0;
          try {
             maxDamage = result.range()[1];
          } catch(e) {
             if (Array.isArray(result.damage)) {
               maxDamage = Math.max(...(result.damage as number[]));
             } else if (typeof result.damage === 'number') {
               maxDamage = result.damage;
             }
          }

          const fullDesc = result.desc();
          let context = fullDesc;
          let damageStr = "";
          let koStr = "";

          if (fullDesc.includes(':')) {
            const parts = fullDesc.split(':');
            context = parts[0].trim();
            const rest = parts[1].trim();
            
            if (rest.includes(' -- ')) {
              const restParts = rest.split(' -- ');
              damageStr = restParts[0].trim();
              koStr = restParts[1].trim();
            } else {
              damageStr = rest;
            }
          }

          return {
            move: moveName,
            desc: fullDesc,
            context,
            damageStr,
            koStr,
            eff: effText,
            multiplier,
            maxDamage
          };
        } catch (e) {
          return null;
        }
      });
      
      return (results.filter(r => r !== null) as any[]).sort((a, b) => b.maxDamage - a.maxDamage);
    } catch (e) {
      return [];
    }
  }, [p1Config, p2Config, p1Learnset]);


  const displayedResults = useMemo(() => {
    const coreMoves = (p1Config.moves || []).filter(m => m);
    
    let coreResults = damageResults.filter(r => coreMoves.includes(r.move));
    let otherResults = damageResults.filter(r => !coreMoves.includes(r.move));
    
    if (moveFilter) {
      otherResults = otherResults.filter(r => r.move.toLowerCase().includes(moveFilter.toLowerCase()));
    }
    
    return [...coreResults, ...otherResults];
  }, [damageResults, moveFilter, p1Config.moves]);

  return (
    <div className="app-container" style={{ height: 'auto', minHeight: '90vh' }}>
      <div className="header">
        <h1>VGC Tactical HUD</h1>
      </div>

      <div className="tabs-container" role="tablist" aria-label="Main Navigation">
        <button className={`tab-btn ${activeTab === 'calc' ? 'active' : ''}`} onClick={() => setActiveTab('calc')} role="tab" aria-selected={activeTab === 'calc'}>Damage Calculator</button>
        <button className={`tab-btn ${activeTab === 'types' ? 'active' : ''}`} onClick={() => setActiveTab('types')} role="tab" aria-selected={activeTab === 'types'}>Type Chart</button>
        <button className={`tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`} onClick={() => setActiveTab('flashcards')} role="tab" aria-selected={activeTab === 'flashcards'}>Type Flashcards</button>
      </div>

      {activeTab === 'calc' && (
        <>
          <div className="builder-area">
            <PokemonConfigPanel title="Player 1" config={p1Config} setConfig={setP1Config} isP2={false} onSave={handleSaveToTeam} />
            <PokemonConfigPanel title="Player 2 (Target)" config={p2Config} setConfig={setP2Config} isP2={true} />
          </div>

          <div className="damage-panel" style={{ marginTop: '1.5rem' }}>
        <div className="damage-panel-header">
          <h2 style={{ margin: 0 }}>P1 Offensive Estimates vs P2</h2>
          <div className="move-filter-container input-with-clear">
            <input 
              ref={moveFilterInputRef}
              type="text" 
              aria-label="Filter moves"
              placeholder="Type ahead moves..." 
              value={moveFilter}
              onChange={e => setMoveFilter(e.target.value)}
            />
            {moveFilter && (
              <button type="button" className="clear-input-btn" onClick={() => { setMoveFilter(''); moveFilterInputRef.current?.focus(); }} aria-label="Clear move filter">✕</button>
            )}
          </div>
        </div>
        <div className="damage-results-grid" style={{ marginTop: '1rem' }}>
          {p1Learnset.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Loading moves...</p>}
          {damageResults.length === 0 && p1Learnset.length > 0 && <p style={{ color: 'var(--text-muted)' }}>No attacking moves found.</p>}
          {displayedResults.length === 0 && damageResults.length > 0 && moveFilter && (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '32px',
                textAlign: 'center',
                background: '#f8f9fa',
                border: '1px dashed var(--border)',
                borderRadius: '8px'
              }}
              role="status"
              aria-live="polite"
            >
              <p style={{ color: 'var(--text-main)', fontWeight: 500, marginBottom: '8px' }}>
                No moves match "{moveFilter}"
              </p>
              <button
                onClick={() => setMoveFilter('')}
                className="stat-btn"
                style={{ margin: '0 auto', padding: '8px 16px', maxWidth: '200px' }}
                aria-label="Clear move filter to see all moves"
              >
                Clear Filter
              </button>
            </div>
          )}
          {displayedResults.map((result, idx) => (
            <div key={idx} className="damage-item" style={{ 
              borderColor: result.multiplier > 1 ? 'var(--hp-green)' : result.multiplier < 1 ? 'var(--hp-red)' : 'var(--border)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    onClick={() => toggleCoreMove(result.move)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      fontSize: '1.2rem', 
                      color: (p1Config.moves || []).includes(result.move) ? '#fbbc04' : '#e0e0e0',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={(p1Config.moves || []).includes(result.move) ? "Remove from Core Moves" : "Add to Core Moves"}
                    aria-label={(p1Config.moves || []).includes(result.move) ? "Remove from Core Moves" : "Add to Core Moves"}
                    aria-pressed={(p1Config.moves || []).includes(result.move)}
                  >
                    {(p1Config.moves || []).includes(result.move) ? '★' : '☆'}
                  </button>
                  <span className="damage-move-name" style={{ fontSize: '1.2rem' }}>{result.move}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {result.koStr && result.koStr.toLowerCase().includes('ohko') && (
                    <span style={{
                      backgroundColor: result.koStr.toLowerCase().includes('guaranteed ohko') ? '#dae8be' : '#f3f4f5',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      color: result.koStr.toLowerCase().includes('guaranteed ohko') ? '#3f4b2c' : 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      {result.koStr.toLowerCase().includes('guaranteed ohko') && <span>✅</span>}
                      {result.koStr}
                    </span>
                  )}
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    color: result.multiplier > 1 ? 'var(--hp-green)' : result.multiplier < 1 && result.multiplier > 0 ? 'var(--hp-yellow)' : result.multiplier === 0 ? 'var(--text-muted)' : 'var(--text-main)',
                    backgroundColor: '#f3f4f5',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px'
                  }}>
                    {result.eff}
                  </span>
                  <CopyCalcButton text={result.desc} />
                </div>
              </div>
              
              {result.damageStr ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)', fontFamily: '"Lexend", monospace' }}>
                    {result.damageStr}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {result.context}
                  </div>
                </div>
              ) : (
                <span className="damage-desc">{result.desc}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      </>
      )}

      {activeTab === 'types' && (
        <TypeChartPanel />
      )}

      {activeTab === 'flashcards' && (
        <TypeFlashcardsPanel />
      )}

      {/* FAB and Drawer */}
      <button 
        className="team-fab" 
        onClick={() => setIsTeamFabOpen(!isTeamFabOpen)}
        aria-label="Toggle My Team drawer"
        aria-expanded={isTeamFabOpen}
        aria-controls="team-drawer"
      >
        🛡️
      </button>

      {isTeamFabOpen && (
        <div id="team-drawer" className="team-drawer" ref={teamDrawerRef}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0 }}>My Team</h3>
            <button 
              onClick={() => setIsTeamFabOpen(false)} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)' }}
              aria-label="Close My Team drawer"
            >
              ✕
            </button>
          </div>
          {team.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No Pokémon saved yet. Configure a Pokémon and click "Save to Team".</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {team.map((pokemon, idx) => (
                <div key={idx} className="team-drawer-item">
                  <div className="team-drawer-item-info">
                    <span style={{ fontWeight: 'bold' }}>{pokemon.species || '(No Species)'}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Lvl {pokemon.level}</span>
                    {pokemon.moves && pokemon.moves.some(m => m) && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {pokemon.moves.filter(m => m).map((m, i) => (
                          <span key={i} style={{ background: '#f3f4f5', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>{m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      className="team-drawer-item-btn"
                      onClick={() => {
                        setP1Config(pokemon);
                        setIsTeamFabOpen(false);
                      }}
                    >
                      Select
                    </button>
                    <button 
                      className="team-drawer-remove-btn"
                      onClick={() => setTeam(prev => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove Pokémon from team"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;

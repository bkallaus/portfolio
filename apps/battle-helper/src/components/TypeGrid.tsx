import React from 'react';
import { Dex } from '@pkmn/dex';
import { allTypes } from '../data';

export const TypeGrid = () => {
  return (
    <div style={{ marginTop: '32px' }}>
      <h3 style={{ marginBottom: '16px' }}>Full Type Chart</h3>
      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 'max-content', fontSize: '12px', textAlign: 'center', margin: '0' }}>
          <thead>
          <tr>
            <th style={{ padding: '8px', borderBottom: '2px solid var(--border)', borderRight: '2px solid var(--border)' }}>Atk \ Def</th>
            {allTypes.map(t => (
              <th key={t} style={{ padding: '4px', writingMode: 'vertical-rl', transform: 'rotate(180deg)', borderBottom: '2px solid var(--border)', height: '100px', fontWeight: 'normal' }}>
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allTypes.map(atk => (
            <tr key={atk}>
              <th style={{ padding: '4px 8px', textAlign: 'right', borderRight: '2px solid var(--border)', borderBottom: '1px solid var(--border)', fontWeight: 'normal' }}>
                {atk}
              </th>
              {allTypes.map(def => {
                const eff = Dex.getEffectiveness(atk, [def]);
                const isImmune = !Dex.getImmunity(atk, [def]);
                const multiplier = isImmune ? 0 : Math.pow(2, eff);

                let bg = 'transparent';
                let color = 'var(--text-main)';
                let text = '';

                if (multiplier === 0) {
                  bg = 'var(--text-muted)';
                  color = 'white';
                  text = '0';
                } else if (multiplier === 0.5) {
                  bg = 'var(--hp-yellow)';
                  color = 'white';
                  text = '½';
                } else if (multiplier === 2) {
                  bg = 'var(--hp-green)';
                  color = 'white';
                  text = '2';
                }

                return (
                  <td key={def} style={{
                    width: '28px',
                    height: '28px',
                    borderBottom: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    background: bg,
                    color: color,
                    fontWeight: text ? 'bold' : 'normal'
                  }}>
                    {text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};

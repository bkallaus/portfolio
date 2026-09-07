import React, { useState, useEffect, useCallback } from 'react';
import { Dex } from '@pkmn/dex';
import { allTypes } from '../data';

export const TypeFlashcardsPanel: React.FC = () => {
  const [attackingType, setAttackingType] = useState<string>('');
  const [defendingType, setDefendingType] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ message: string; isCorrect: boolean } | null>(null);

  const generateFlashcard = useCallback(() => {
    // Exclude 'Stellar' if it somehow sneaks in, though allTypes handles it usually
    const atkIndex = Math.floor(Math.random() * allTypes.length);
    const defIndex = Math.floor(Math.random() * allTypes.length);
    setAttackingType(allTypes[atkIndex]);
    setDefendingType(allTypes[defIndex]);
    setFeedback(null);
  }, []);

  useEffect(() => {
    generateFlashcard();
  }, [generateFlashcard]);

  const handleGuess = (guessMultiplier: number) => {
    if (!attackingType || !defendingType) return;

    const eff = Dex.getEffectiveness(attackingType, [defendingType]);
    const isImmune = !Dex.getImmunity(attackingType, [defendingType]);
    const actualMultiplier = isImmune ? 0 : Math.pow(2, eff);

    const isCorrect = guessMultiplier === actualMultiplier;

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setStreak((prev) => prev + 1);
      setFeedback({ message: 'Correct!', isCorrect: true });
      setTimeout(() => {
        generateFlashcard();
      }, 1000); // 1s delay before next card for a brief moment of success reading
    } else {
      setStreak(0);
      let correctAnswerStr = '1x';
      if (actualMultiplier === 0) correctAnswerStr = 'None';
      else if (actualMultiplier === 0.5) correctAnswerStr = '1/2';
      else if (actualMultiplier === 2) correctAnswerStr = '2x';

      setFeedback({ message: `Incorrect. The correct answer was ${correctAnswerStr}.`, isCorrect: false });
    }
  };

  const skipCard = () => {
    setStreak(0); // Optional: penalize skipping by resetting streak
    generateFlashcard();
  };

  if (!attackingType || !defendingType) {
    return <div>Loading...</div>;
  }

  return (
    <div className="panel" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '2rem' }}>
      <h2>Type Flashcards</h2>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem', fontSize: '1.2rem' }}>
        <div>Score: <strong>{score}</strong></div>
        <div>Streak: <strong>{streak}</strong></div>
      </div>

      <div style={{ margin: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--hp-red)' }}>{attackingType}</span>
          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>attacks</span>
          <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--hp-green)' }}>{defendingType}</span>
        </div>
        <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>
          What is the damage multiplier?
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem',
          maxWidth: '400px',
          margin: '0 auto 2rem auto',
          width: '100%'
        }}
        role="group"
        aria-label="Effectiveness options"
      >
        <button
          className="stat-btn"
          style={{ padding: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}
          onClick={() => handleGuess(2)}
          aria-label="Guess 2 times effective"
        >
          2x
        </button>
        <button
          className="stat-btn"
          style={{ padding: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}
          onClick={() => handleGuess(1)}
          aria-label="Guess 1 times effective (neutral)"
        >
          1x
        </button>
        <button
          className="stat-btn"
          style={{ padding: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}
          onClick={() => handleGuess(0.5)}
          aria-label="Guess half effective"
        >
          1/2
        </button>
        <button
          className="stat-btn"
          style={{ padding: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}
          onClick={() => handleGuess(0)}
          aria-label="Guess none (immune)"
        >
          None
        </button>
      </div>

      <div style={{ minHeight: '3rem' }}>
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            style={{
              fontWeight: 'bold',
              fontSize: '1.2rem',
              color: feedback.isCorrect ? 'var(--hp-green)' : 'var(--hp-red)'
            }}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {!feedback?.isCorrect && (
        <button
          onClick={skipCard}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '1rem',
            color: 'var(--text-muted)'
          }}
          aria-label="Skip to next flashcard"
        >
          Skip
        </button>
      )}
    </div>
  );
};

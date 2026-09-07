import React, { useState } from 'react';
import Chance from 'chance';
import styled from 'styled-components';

import { Score } from './vex-flow'
import NoteButton from './note-button';
import * as Tone from 'tone';
import VolumeControl from './volume-control';

const GameContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 48px;

    @media (max-width: 768px) {
        gap: 32px;
    }
`;

const ScoreWrapper = styled.div`
    width: 100%;
    background: var(--surface-container-low);
    border-radius: 16px;
    padding: 32px;
    display: flex;
    justify-content: center;
    position: relative;
    overflow: hidden;

    &::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(0, 37, 77, 0.03) 0%, rgba(0, 59, 115, 0) 100%);
        pointer-events: none;
    }

    @media (max-width: 768px) {
        padding: 16px;
    }
`;

const StyledScore = styled(Score)`
    height: 150px;
    width: 100%;
    max-width: 600px;
`;

const PickerWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    align-items: center;

    @media (max-width: 768px) {
        gap: 16px;
    }
`;

const StyledPicker = styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;

    @media (max-width: 768px) {
        gap: 8px;
    }
`;

const Label = styled.div`
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--on-surface-variant);
`;

const FeedbackSection = styled.div`
    min-height: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
`;

const StreakBadge = styled.div`
    background: var(--surface-container-highest);
    padding: 8px 20px;
    border-radius: 100px;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--secondary);
    display: flex;
    align-items: center;
    gap: 8px;

    &::before {
        content: "";
        width: 8px;
        height: 8px;
        background: var(--secondary);
        border-radius: 50%;
    }
`;

const FeedbackText = styled.div`
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--primary);
    margin-top: 12px;

    @media (max-width: 768px) {
        font-size: 1.125rem;
    }
`;

const ControlsWrapper = styled.div`
    width: 100%;
    border-top: 1px solid var(--outline-variant);
    padding-top: 32px;
    margin-top: 16px;

    @media (max-width: 768px) {
        padding-top: 24px;
    }
`;

const chance = new Chance();
const distances = [1, 2, 3, 4, 5, 6, 7, 8];

const synth = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.3,
        release: 1,
    },
}).toDestination();

const playChord = (low, high) => {
    const start = Tone.now()
    synth.triggerAttackRelease(`${low.replace('/', '')}`, "8n", start);
    synth.triggerAttackRelease(`${high.replace('/', '')}`, "8n", start + .01);
}

const IntervalGame = ({ notes, clef }) => {
    const [distance, setAnswer] = useState(chance.d8());
    const [streak, setStreak] = useState(0);
    const [feedback, setFeedback] = useState('');
    const start = chance.d4();

    const onNoteClick = (note) => {
        if (note === distance) {
            playChord(notes[start].note, notes[distance + start].note)

            const nextNote = chance.d8()
            setAnswer(nextNote);

            const newStreak = streak + 1;
            setStreak(newStreak);
            if (newStreak % 5 === 0) {
                setFeedback(`Great job! ${newStreak} in a row!`);
            } else {
                setFeedback('');
            }
        } else {
            setStreak(0);
            setFeedback('Try again!');
        }
    }

    return (
        <GameContainer>
            <ScoreWrapper>
                <StyledScore
                    clef={clef}
                    keys={[notes[start].note, notes[distance + start].note]}
                />
            </ScoreWrapper>

            <FeedbackSection>
                <StreakBadge>Streak: {streak}</StreakBadge>
                {feedback && <FeedbackText>{feedback}</FeedbackText>}
            </FeedbackSection>

            <PickerWrapper>
                <Label>Identify the interval distance</Label>
                <StyledPicker>
                    {distances.map((note) =>
                        <NoteButton
                            key={note}
                            currentNote={({ answer: distance })}
                            note={note}
                            onNoteClick={onNoteClick} />
                    )}
                </StyledPicker>
            </PickerWrapper>

            <ControlsWrapper>
                <VolumeControl />
            </ControlsWrapper>
        </GameContainer>
    );
}

export default IntervalGame;

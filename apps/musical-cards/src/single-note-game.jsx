import React, { useState, useEffect } from 'react';
import Chance from 'chance';
import styled from 'styled-components';
import { Score } from './vex-flow'
import { basicNotes } from './notes';
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

const pickNewNote = (notes, currentNote = {}) => {
    let nextNote = chance.pickone(notes);

    while (nextNote.answer === currentNote.answer) {
        nextNote = chance.pickone(notes);
    }

    return nextNote;
};

const synth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.3,
        release: 1,
    },
}).toDestination();

const playNote = (note) => {
    synth.triggerAttackRelease(`${note.replace('/', '')}`, "8n");
}

const SingleNoteGame = ({ notes, clef }) => {
    const [currentNote, setAnswer] = useState(pickNewNote(notes));
    const [streak, setStreak] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [interactionId, setInteractionId] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setStreak(0);
            setFeedback(`Time's up! It was ${currentNote.answer.toUpperCase()}`);
            const nextNote = pickNewNote(notes, currentNote);
            setAnswer(nextNote);
        }, 10000);
        return () => clearTimeout(timer);
    }, [currentNote, notes, interactionId]);

    const onNoteClick = (note) => {
        setInteractionId(id => id + 1);
        if (note === currentNote.answer) {
            playNote(currentNote.note)

            const nextNote = pickNewNote(notes, currentNote);
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
            setFeedback(`Wrong! It was ${currentNote.answer.toUpperCase()}`);
            const nextNote = pickNewNote(notes, currentNote);
            setAnswer(nextNote);
        }
    }

    return (
        <GameContainer>
            <ScoreWrapper>
                <StyledScore
                    clef={clef}
                    keys={[currentNote.note]}
                />
            </ScoreWrapper>

            <FeedbackSection>
                <StreakBadge>Streak: {streak}</StreakBadge>
                {feedback && <FeedbackText>{feedback}</FeedbackText>}
            </FeedbackSection>

            <PickerWrapper>
                <Label>Select the correct note</Label>
                <StyledPicker>
                    {basicNotes.map((note) =>
                        <NoteButton
                            key={note}
                            currentNote={currentNote}
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

export default SingleNoteGame;

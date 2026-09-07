import React, { useState } from 'react';
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
    min-height: 214px;

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
        min-height: 182px;
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

const FeedbackText = styled.div`
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--primary);

    @media (max-width: 768px) {
        font-size: 1.125rem;
    }
`;

const PrimaryButton = styled.button`
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%);
    color: white;
    border: none;
    padding: 16px 48px;
    border-radius: 1.5rem; /* Rounded-XL */
    font-size: 1.125rem;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(0, 37, 77, 0.2);
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 37, 77, 0.3);
    }
    
    &:active {
        transform: translateY(0);
    }

    @media (max-width: 768px) {
        padding: 14px 32px;
        font-size: 1rem;
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

const songs = [
    [ // Twinkle Twinkle Little Star
        { answer: 'c', note: 'c/4' },
        { answer: 'c', note: 'c/4' },
        { answer: 'g', note: 'g/4' },
        { answer: 'g', note: 'g/4' },
        { answer: 'a', note: 'a/4' },
        { answer: 'a', note: 'a/4' },
        { answer: 'g', note: 'g/4' },
        { answer: 'f', note: 'f/4' },
        { answer: 'f', note: 'f/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'c', note: 'c/4' },
    ],
    [ // Mary Had a Little Lamb
        { answer: 'e', note: 'e/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'c', note: 'c/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'g', note: 'g/4' },
        { answer: 'g', note: 'g/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'c', note: 'c/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'c', note: 'c/4' },
    ],
    [ // Row Row Row Your Boat
        { answer: 'c', note: 'c/4' },
        { answer: 'c', note: 'c/4' },
        { answer: 'c', note: 'c/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'f', note: 'f/4' },
        { answer: 'g', note: 'g/4' },
        { answer: 'c', note: 'c/5' },
        { answer: 'c', note: 'c/5' },
        { answer: 'c', note: 'c/5' },
        { answer: 'g', note: 'g/4' },
        { answer: 'g', note: 'g/4' },
        { answer: 'g', note: 'g/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'c', note: 'c/4' },
        { answer: 'c', note: 'c/4' },
        { answer: 'c', note: 'c/4' },
        { answer: 'g', note: 'g/4' },
        { answer: 'f', note: 'f/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'c', note: 'c/4' },
    ],
    [ // Ode to Joy
        { answer: 'e', note: 'e/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'f', note: 'f/4' },
        { answer: 'g', note: 'g/4' },
        { answer: 'g', note: 'g/4' },
        { answer: 'f', note: 'f/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'c', note: 'c/4' },
        { answer: 'c', note: 'c/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'e', note: 'e/4' },
        { answer: 'd', note: 'd/4' },
        { answer: 'd', note: 'd/4' },
    ]
];

const getRandomSong = () => songs[Math.floor(Math.random() * songs.length)];

const playFullSong = (song) => {
    song.forEach((part, index) => {
        setTimeout(() => {
            playNote(part.note);
        }, index * 400);
    });
};

const SongGame = () => {
    const [currentSong, setCurrentSong] = useState(getRandomSong());
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    const onNoteClick = (note) => {
        if (isFinished) return;

        const currentNote = currentSong[currentIndex];

        if (note === currentNote.answer) {
            playNote(currentNote.note);

            if (currentIndex + 1 >= currentSong.length) {
                setIsFinished(true);
                setTimeout(() => playFullSong(currentSong), 1000);
            } else {
                setCurrentIndex(currentIndex + 1);
            }
        }
    }

    const restart = () => {
        setCurrentSong(getRandomSong());
        setCurrentIndex(0);
        setIsFinished(false);
    }

    const currentNote = currentSong[currentIndex];

    return (
        <GameContainer>
            <ScoreWrapper>
                {!isFinished ? (
                    <StyledScore
                        clef={'treble'}
                        keys={[currentNote.note]}
                    />
                ) : (
                    <FeedbackText style={{ fontSize: '2rem', color: 'var(--secondary)' }}>
                        ✨ Bravo!
                    </FeedbackText>
                )}
            </ScoreWrapper>

            <FeedbackSection>
                <FeedbackText>
                    {isFinished ? "Song Complete!" : `Note ${currentIndex + 1} of ${currentSong.length}`}
                </FeedbackText>
            </FeedbackSection>

            {!isFinished ? (
                <PickerWrapper>
                    <Label>Play the note shown above</Label>
                    <StyledPicker>
                        {basicNotes.map((note) =>
                            <NoteButton
                                key={note}
                                note={note}
                                currentNote={currentNote}
                                onNoteClick={onNoteClick}
                            />
                        )}
                    </StyledPicker>
                </PickerWrapper>
            ) : (
                <PrimaryButton onClick={restart}>Play Again</PrimaryButton>
            )}

            <ControlsWrapper>
                <VolumeControl />
            </ControlsWrapper>
        </GameContainer>
    );
}

export default SongGame;

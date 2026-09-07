import React from 'react';
import NoteButton from './note-button';
import {basicNotes} from './notes';
import styled from 'styled-components';

const PickerWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    align-items: center;
`;

const StyledPicker = styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
`;

const Label = styled.div`
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--on-surface-variant);
`;

const notePicker = ({onNoteClick, currentNote, label = 'Select the correct note'}) => {
    return (
        <PickerWrapper>
            <Label>{label}</Label>
            <StyledPicker>
                {basicNotes.map((note) => (
                    <NoteButton 
                        key={note} 
                        currentNote={currentNote} 
                        note={note} 
                        onNoteClick={onNoteClick} 
                    />
                ))}
            </StyledPicker>
        </PickerWrapper>
    );
};

export default notePicker;

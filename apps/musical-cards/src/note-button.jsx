import React from 'react';
import styled from 'styled-components'

const StyledNoteButton = styled.button`
    border: 2px solid transparent;
    border-radius: 12px;
    background: var(--surface-container-high);
    color: var(--on-surface);
    display: inline-block;
    font-size: 1.125rem;
    font-weight: 700;
    padding: 16px 32px;
    text-transform: uppercase;
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
    min-width: 80px;

    &:hover {
        background: var(--secondary-container);
        border-color: var(--outline-variant);
        transform: translateY(-2px);
    }

    &:active {
        background: ${(props) => props.$activeColor};
        transform: translateY(0);
        transition: background 0s;
    }

    @media (max-width: 768px) {
        padding: 12px 24px;
        font-size: 1rem;
        min-width: 64px;
    }
`;

const NoteButton = ({ note, onNoteClick, currentNote }) => {
    // The design system mentions using Tertiary orange (#f68a00) for active/correct note popping
    const activeColor = 'var(--accent-container)';

    return <StyledNoteButton
        $activeColor={activeColor}
        onClick={() => onNoteClick(note)}>
        {note}
    </StyledNoteButton>
}

export default NoteButton;

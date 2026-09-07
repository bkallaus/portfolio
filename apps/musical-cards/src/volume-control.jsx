import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import { Destination, gainToDb } from 'tone';
import useLocalStorage from "use-local-storage";

const Container = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
`;

const SliderContainer = styled.div`
    display: flex;
    align-items: center;
    background: var(--surface-container-low);
    padding: 12px 20px;
    border-radius: 100px;
    width: 200px;
    opacity: ${props => props.$visible ? 1 : 0};
    transform: translateX(${props => props.$visible ? '0' : '20px'});
    pointer-events: ${props => props.$visible ? 'auto' : 'none'};
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    input[type='range'] {
        -webkit-appearance: none;
        width: 100%;
        height: 8px;
        background: var(--surface-container-highest);
        border-radius: 4px;
        outline: none;

        &::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--secondary);
            cursor: pointer;
            border: 2px solid var(--surface-container-low);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
    }
`;

const VolumeButton = styled.button`
    font-size: 24px;
    background: var(--surface-container-low);
    border: none;
    color: var(--primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    transition: all 0.2s ease;

    &:hover {
        background: var(--surface-container-high);
        transform: scale(1.05);
    }

    &:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--secondary);
    }
`;

const VolumeControl = () => {
    const [volume, setVolume] = useLocalStorage("MC_VOLUME", 50);
    const [showSlider, setShowSlider] = useState(false);

    useEffect(() => {
        if (volume <= 0) {
            Destination.volume.value = -Infinity;
        } else {
            Destination.volume.value = gainToDb(volume / 100);
        }
    }, [volume]);

    const toggleSlider = () => {
        setShowSlider(!showSlider);
    };

    return (
        <Container>
            <SliderContainer $visible={showSlider}>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    aria-label="Volume"
                />
            </SliderContainer>
            <VolumeButton onClick={toggleSlider} title="Volume">
                {volume > 0 ? <FaVolumeUp /> : <FaVolumeMute />}
            </VolumeButton>
        </Container>
    );
};

export default VolumeControl;

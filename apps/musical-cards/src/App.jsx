import React, {useState} from 'react';
import styled from 'styled-components';
import { trebleNotes, bassNotes } from './notes';
import SingleNoteGame from './single-note-game';
import IntervalGame from './interval-game';
import SongGame from './song-game';
import { FaBars, FaTimes } from 'react-icons/fa';

const AppContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--background);
  flex-direction: column;

  @media (min-width: 769px) {
    flex-direction: row;
  }
`;

const Sidebar = styled.nav`
  width: 280px;
  background-color: var(--surface-container-low);
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: sticky;
  top: 0;
  height: 100vh;
  border-right: 1px solid var(--outline-variant);

  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileHeader = styled.header`
  display: none;
  background-color: var(--surface-container-low);
  padding: 16px 24px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--outline-variant);
  position: sticky;
  top: 0;
  z-index: 100;

  @media (max-width: 768px) {
    display: flex;
  }
`;

const MobileMenu = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--background);
  z-index: 99;
  padding: 80px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transform: translateY(${props => props.$isOpen ? '0' : '-100%'});
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const MenuButton = styled.button`
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 101;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 0;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const FloatingHeader = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 24px 64px;
  background: rgba(247, 249, 251, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--outline-variant);

  @media (max-width: 768px) {
    display: none;
  }
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary);
`;

const GameArea = styled.div`
  padding: 64px;
  max-width: 1000px;
  width: 100%;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 32px 16px;
  }
`;

const Branding = styled.div`
  margin-bottom: 48px;
  padding: 0 12px;
  
  h1 {
    font-size: 1.75rem;
    margin: 0;
    color: var(--primary);
    font-weight: 800;
  }
  p {
    font-size: 0.875rem;
    color: var(--on-surface-variant);
    margin: 4px 0 0 0;
    font-weight: 500;
  }
`;

const NavButton = styled.button`
  border: none;
  border-radius: 12px;
  background: ${(props) => props.$isActive ? 'var(--surface-container-highest)' : 'transparent'};
  color: ${(props) => props.$isActive ? 'var(--primary)' : 'var(--on-surface-variant)'};
  font-size: 1rem;
  font-weight: 600;
  padding: 16px 20px;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 12px;

  &:hover {
    background: var(--surface-container-high);
    color: var(--primary);
  }
`;

const GameTitle = styled.h1`
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 48px;
  letter-spacing: -0.02em;
  color: var(--primary);

  @media (max-width: 768px) {
    font-size: 2.25rem;
    margin-bottom: 24px;
  }
`;

const ContentCard = styled.div`
  background: var(--surface-container-lowest);
  border-radius: 24px;
  padding: 48px;
  box-shadow: 0 12px 40px rgba(25, 28, 30, 0.06);
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 24px 16px;
    border-radius: 16px;
  }
`;

function App() {
  const [gameId, setGameId] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const games = [
    { id: 0, label: 'Treble Clef', title: 'What note is this?' },
    { id: 1, label: 'Bass Clef', title: 'What note is this?' },
    { id: 2, label: 'Interval Practice', title: 'Identify the interval' },
    { id: 3, label: 'Song Challenge', title: 'Play the melody' }
  ];

  const currentGame = games.find(g => g.id === gameId);

  const selectGame = (id) => {
    setGameId(id);
    setIsMenuOpen(false);
  };

  return (
    <AppContainer>
      <MobileHeader>
        <div style={{ fontWeight: 800, color: 'var(--primary)' }}>Musical Cards</div>
        <MenuButton onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </MenuButton>
      </MobileHeader>

      <MobileMenu $isOpen={isMenuOpen}>
        {games.map((game) => (
          <NavButton 
            key={game.id} 
            $isActive={gameId === game.id} 
            onClick={() => selectGame(game.id)}
          >
            {game.label}
          </NavButton>
        ))}
      </MobileMenu>

      <Sidebar>
        <Branding>
          <h1>Musical Cards</h1>
          <p>The Resonant Gallery</p>
        </Branding>
        {games.map((game) => (
          <NavButton 
            key={game.id} 
            $isActive={gameId === game.id} 
            onClick={() => setGameId(game.id)}
          >
            {game.label}
          </NavButton>
        ))}
      </Sidebar>
      
      <MainContent>
        <FloatingHeader>
          <HeaderTitle>{currentGame.label}</HeaderTitle>
        </FloatingHeader>
        <GameArea>
          <GameTitle>{currentGame.title}</GameTitle>
          <ContentCard>
            {gameId === 0 && <SingleNoteGame clef={'treble'} notes={trebleNotes} />}
            {gameId === 1 && <SingleNoteGame clef={'bass'} notes={bassNotes} />}
            {gameId === 2 && <IntervalGame clef={'treble'} notes={trebleNotes} />}
            {gameId === 3 && <SongGame />}
          </ContentCard>
        </GameArea>
      </MainContent>
    </AppContainer>
  );
}

export default App;

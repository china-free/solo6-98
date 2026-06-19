import { useGameStore } from './store/useGameStore';
import StartPage from './components/StartPage';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import PauseMenu from './components/PauseMenu';
import EndPage from './components/EndPage';

export default function App() {
  const { gameState } = useGameStore();

  if (!gameState) {
    return <StartPage />;
  }

  const { phase } = gameState;

  if (phase === 'menu') {
    return <StartPage />;
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#05050a]">
      <GameCanvas />

      {(phase === 'playing' || phase === 'paused') && <HUD />}

      {phase === 'paused' && <PauseMenu />}

      {(phase === 'won' || phase === 'lost') && <EndPage />}
    </div>
  );
}

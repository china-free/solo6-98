import { create } from 'zustand';
import type { GameStateSnapshot, Settings, WaveType } from '../types/game';
import { GameEngine } from '../engine/GameEngine';
import { AudioSystem } from '../audio/AudioSystem';
import { distance } from '../utils/math';

interface GameStore {
  gameEngine: GameEngine | null;
  audioSystem: AudioSystem | null;
  gameState: GameStateSnapshot | null;
  isInitialized: boolean;

  initialize: () => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  handleKeyDown: (key: string) => void;
  handleKeyUp: (key: string) => void;
  setSettings: (settings: Partial<Settings>) => void;
  destroy: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameEngine: null,
  audioSystem: null,
  gameState: null,
  isInitialized: false,

  initialize: () => {
    if (get().isInitialized) return;

    const engine = new GameEngine();
    const audio = new AudioSystem();

    let lastArtifacts = 0;
    let lastPhase: string = '';

    engine.setOnUpdateCallback((state) => {
      if (state.player.artifacts > lastArtifacts) {
        audio.playArtifactSound();
        lastArtifacts = state.player.artifacts;
      }

      if (state.phase === 'won' && lastPhase !== 'won') {
        audio.playVictorySound();
        lastPhase = 'won';
      } else if (state.phase === 'lost' && lastPhase !== 'lost') {
        audio.playGameOverSound();
        lastPhase = 'lost';
      }

      set({ gameState: state });
    });

    engine.getWaveEngine().setOnWaveHeardCallback((x, y, amplitude, type) => {
      const playerPos = engine.getPlayerWorldPosition();
      const dist = distance(x, y, playerPos.x, playerPos.y);
      audio.playWaveSound(type, dist);

      engine.getMonsterAI().onWaveHeard(x, y, amplitude, type);
    });

    set({
      gameEngine: engine,
      audioSystem: audio,
      isInitialized: true,
      gameState: engine.getState(),
    });
  },

  startGame: () => {
    const { gameEngine, audioSystem } = get();
    if (!gameEngine || !audioSystem) return;

    audioSystem.resume();
    gameEngine.startGame();
  },

  pauseGame: () => {
    get().gameEngine?.pauseGame();
  },

  resumeGame: () => {
    get().gameEngine?.resumeGame();
  },

  restartGame: () => {
    const { gameEngine, audioSystem } = get();
    if (!gameEngine || !audioSystem) return;

    gameEngine.restartGame();
    audioSystem.resume();

    let lastArtifacts = 0;
    let lastPhase: string = '';

    gameEngine.setOnUpdateCallback((state) => {
      if (state.player.artifacts > lastArtifacts) {
        audioSystem.playArtifactSound();
        lastArtifacts = state.player.artifacts;
      }

      if (state.phase === 'won' && lastPhase !== 'won') {
        audioSystem.playVictorySound();
        lastPhase = 'won';
      } else if (state.phase === 'lost' && lastPhase !== 'lost') {
        audioSystem.playGameOverSound();
        lastPhase = 'lost';
      }

      set({ gameState: state });
    });

    gameEngine.getWaveEngine().setOnWaveHeardCallback((x, y, amplitude, type) => {
      const playerPos = gameEngine.getPlayerWorldPosition();
      const dist = distance(x, y, playerPos.x, playerPos.y);
      audioSystem.playWaveSound(type, dist);

      gameEngine.getMonsterAI().onWaveHeard(x, y, amplitude, type);
    });

    set({ gameState: gameEngine.getState() });
  },

  handleKeyDown: (key: string) => {
    get().gameEngine?.handleKeyDown(key);
  },

  handleKeyUp: (key: string) => {
    get().gameEngine?.handleKeyUp(key);
  },

  setSettings: (settings: Partial<Settings>) => {
    const { gameEngine, audioSystem } = get();
    gameEngine?.setSettings(settings);

    if (settings.volume !== undefined) {
      audioSystem?.setVolume(settings.volume);
    }
    if (settings.soundEnabled !== undefined) {
      audioSystem?.setEnabled(settings.soundEnabled);
    }

    if (gameEngine) {
      set({ gameState: gameEngine.getState() });
    }
  },

  destroy: () => {
    get().gameEngine?.destroy();
    set({
      gameEngine: null,
      audioSystem: null,
      gameState: null,
      isInitialized: false,
    });
  },
}));

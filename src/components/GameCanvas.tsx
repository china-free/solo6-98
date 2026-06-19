import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { CanvasRenderer } from '../renderer/CanvasRenderer';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { gameEngine, gameState, handleKeyDown, handleKeyUp } = useGameStore();

  const renderLoop = useCallback(() => {
    if (!rendererRef.current || !gameEngine || !gameState) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    if (gameState.phase === 'playing' || gameState.phase === 'paused') {
      const playerPos = gameEngine.getPlayerWorldPosition();
      rendererRef.current.render(
        playerPos.x,
        playerPos.y,
        gameState.dangerLevel,
        gameState.phase === 'paused'
      );
    }

    animationFrameRef.current = requestAnimationFrame(renderLoop);
  }, [gameEngine, gameState]);

  useEffect(() => {
    if (!canvasRef.current || !gameEngine) return;

    const renderer = new CanvasRenderer(
      canvasRef.current,
      gameEngine.getTerrainSystem(),
      gameEngine.getWaveEngine(),
      gameEngine.getMonsterAI()
    );
    rendererRef.current = renderer;

    if (gameState) {
      renderer.setQuality(gameState.settings.quality);
    }

    const handleResize = () => {
      renderer.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameEngine, gameState?.settings.quality]);

  useEffect(() => {
    if (gameState) {
      rendererRef.current?.setQuality(gameState.settings.quality);
    }
  }, [gameState?.settings.quality]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      handleKeyDown(e.key);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      handleKeyUp(e.key);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleKeyDown, handleKeyUp, renderLoop]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ touchAction: 'none' }}
    />
  );
}

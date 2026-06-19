import type { Player, WaveType, GamePhase, QualityLevel, Settings, GameStateSnapshot } from '../types/game';
import { WAVE_CONFIGS } from '../utils/materials';
import { LEVEL_1 } from '../utils/levelData';
import { TerrainSystem } from './TerrainSystem';
import { WaveEngine } from './WaveEngine';
import { MonsterAISystem } from './MonsterAI';
import { clamp } from '../utils/math';

export class GameEngine {
  private phase: GamePhase = 'menu';
  private player: Player;
  private terrainSystem: TerrainSystem;
  private waveEngine: WaveEngine;
  private monsterAI: MonsterAISystem;
  private elapsedTime: number = 0;
  private waveCount: number = 0;
  private dangerLevel: number = 0;
  private settings: Settings;

  private keys: Set<string> = new Set();
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private onUpdate: ((state: GameStateSnapshot) => void) | null = null;

  constructor() {
    this.terrainSystem = new TerrainSystem();
    this.waveEngine = new WaveEngine(this.terrainSystem);
    this.monsterAI = new MonsterAISystem(this.terrainSystem);

    const startPos = LEVEL_1.playerStart;
    const cellSize = this.terrainSystem.getCellSize();

    this.player = {
      x: startPos.x * cellSize + cellSize / 2,
      y: startPos.y * cellSize + cellSize / 2,
      stamina: 100,
      maxStamina: 100,
      staminaRegen: 8,
      artifacts: 0,
      speed: 120,
    };

    this.settings = {
      volume: 0.7,
      quality: 'medium',
      soundEnabled: true,
    };

    this.monsterAI.initializeMonsters(LEVEL_1.monsters);
    this.waveEngine.setOnWaveHeardCallback((x, y, amplitude, type) => {
      this.monsterAI.onWaveHeard(x, y, amplitude, type);
    });
  }

  public getTerrainSystem(): TerrainSystem {
    return this.terrainSystem;
  }

  public getWaveEngine(): WaveEngine {
    return this.waveEngine;
  }

  public getMonsterAI(): MonsterAISystem {
    return this.monsterAI;
  }

  public getSettings(): Settings {
    return { ...this.settings };
  }

  public setSettings(settings: Partial<Settings>): void {
    this.settings = { ...this.settings, ...settings };
    this.waveEngine.setQuality(this.settings.quality);
  }

  public setOnUpdateCallback(callback: (state: GameStateSnapshot) => void): void {
    this.onUpdate = callback;
  }

  public startGame(): void {
    this.phase = 'playing';
    this.elapsedTime = 0;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  public pauseGame(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
    }
  }

  public resumeGame(): void {
    if (this.phase === 'paused') {
      this.phase = 'playing';
      this.lastTime = performance.now();
    }
  }

  public restartGame(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.terrainSystem = new TerrainSystem();
    this.waveEngine = new WaveEngine(this.terrainSystem);
    this.monsterAI = new MonsterAISystem(this.terrainSystem);

    const startPos = LEVEL_1.playerStart;
    const cellSize = this.terrainSystem.getCellSize();

    this.player = {
      x: startPos.x * cellSize + cellSize / 2,
      y: startPos.y * cellSize + cellSize / 2,
      stamina: 100,
      maxStamina: 100,
      staminaRegen: 8,
      artifacts: 0,
      speed: 120,
    };

    this.elapsedTime = 0;
    this.waveCount = 0;
    this.dangerLevel = 0;
    this.phase = 'menu';

    this.monsterAI.initializeMonsters(LEVEL_1.monsters);
    this.waveEngine.setOnWaveHeardCallback((x, y, amplitude, type) => {
      this.monsterAI.onWaveHeard(x, y, amplitude, type);
    });
    this.waveEngine.setQuality(this.settings.quality);
  }

  public getState(): GameStateSnapshot {
    return {
      phase: this.phase,
      player: { ...this.player },
      waveCount: this.waveCount,
      elapsedTime: this.elapsedTime,
      totalArtifacts: this.terrainSystem.getTotalArtifacts(),
      dangerLevel: this.dangerLevel,
      settings: { ...this.settings },
    };
  }

  public getPlayerWorldPosition(): { x: number; y: number } {
    return { x: this.player.x, y: this.player.y };
  }

  public handleKeyDown(key: string): void {
    this.keys.add(key.toLowerCase());

    if (this.phase !== 'playing') return;

    if (key.toLowerCase() === 'z') {
      this.emitWave('knock');
    } else if (key.toLowerCase() === 'x') {
      this.emitWave('whistle');
    } else if (key === 'Escape') {
      this.pauseGame();
    }
  }

  public handleKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  private emitWave(type: WaveType): void {
    const config = WAVE_CONFIGS[type];
    if (this.player.stamina < config.staminaCost) return;

    this.player.stamina -= config.staminaCost;
    this.waveCount++;
    this.waveEngine.emitWave(this.player.x, this.player.y, type);
  }

  private gameLoop = (): void => {
    if (this.phase === 'menu' || this.phase === 'won' || this.phase === 'lost') {
      return;
    }

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.phase === 'playing') {
      this.update(deltaTime);
    }

    this.emitSnapshot();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    this.elapsedTime += deltaTime;

    this.updatePlayer(deltaTime);
    this.waveEngine.update(deltaTime);
    this.terrainSystem.update(deltaTime);
    this.monsterAI.update(deltaTime, this.player.x, this.player.y);

    this.dangerLevel = this.monsterAI.getDangerLevel(this.player.x, this.player.y);

    if (this.monsterAI.checkPlayerCollision(this.player.x, this.player.y)) {
      this.phase = 'lost';
      return;
    }

    const cellSize = this.terrainSystem.getCellSize();
    const gridX = Math.floor(this.player.x / cellSize);
    const gridY = Math.floor(this.player.y / cellSize);

    if (this.terrainSystem.collectArtifact(gridX, gridY)) {
      this.player.artifacts++;
    }

    if (this.terrainSystem.isExit(gridX, gridY)) {
      this.phase = 'won';
    }

    this.player.stamina = clamp(
      this.player.stamina + this.player.staminaRegen * deltaTime,
      0,
      this.player.maxStamina
    );
  }

  private updatePlayer(deltaTime: number): void {
    let dx = 0;
    let dy = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    const speed = this.player.speed;
    const newX = this.player.x + dx * speed * deltaTime;
    const newY = this.player.y + dy * speed * deltaTime;

    const playerRadius = this.terrainSystem.getCellSize() * 0.3;

    const collisionX = this.terrainSystem.checkCollision(newX, this.player.y, playerRadius);
    if (!collisionX.collided) {
      this.player.x = newX;
    }

    const collisionY = this.terrainSystem.checkCollision(this.player.x, newY, playerRadius);
    if (!collisionY.collided) {
      this.player.y = newY;
    }
  }

  private emitSnapshot(): void {
    if (this.onUpdate) {
      this.onUpdate(this.getState());
    }
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.waveEngine.clear();
    this.monsterAI.clear();
  }
}

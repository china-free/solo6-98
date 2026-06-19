import type { WaveParticle, TerrainCell, Monster, QualityLevel } from '../types/game';
import { TerrainSystem } from '../engine/TerrainSystem';
import { WaveEngine } from '../engine/WaveEngine';
import { MonsterAISystem } from '../engine/MonsterAI';
import { QUALITY_SETTINGS } from '../utils/materials';
import { hexToRgb, distance } from '../utils/math';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrainSystem: TerrainSystem;
  private waveEngine: WaveEngine;
  private monsterAI: MonsterAISystem;
  private quality: QualityLevel = 'medium';
  private cameraX: number = 0;
  private cameraY: number = 0;
  private targetCameraX: number = 0;
  private targetCameraY: number = 0;
  private noiseImageData: ImageData | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    terrainSystem: TerrainSystem,
    waveEngine: WaveEngine,
    monsterAI: MonsterAISystem
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.terrainSystem = terrainSystem;
    this.waveEngine = waveEngine;
    this.monsterAI = monsterAI;

    this.resize();
    this.generateNoise();
  }

  public setQuality(quality: QualityLevel): void {
    this.quality = quality;
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.generateNoise();
  }

  private generateNoise(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    const imageData = tempCtx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 20;
      data[i] = noise;
      data[i + 1] = noise;
      data[i + 2] = noise;
      data[i + 3] = 15;
    }

    this.noiseImageData = imageData;
  }

  public render(
    playerX: number,
    playerY: number,
    dangerLevel: number,
    isPaused: boolean
  ): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.targetCameraX = playerX - width / 2;
    this.targetCameraY = playerY - height / 2;

    this.cameraX += (this.targetCameraX - this.cameraX) * 0.1;
    this.cameraY += (this.targetCameraY - this.cameraY) * 0.1;

    const worldWidth = this.terrainSystem.getGridWidth() * this.terrainSystem.getCellSize();
    const worldHeight = this.terrainSystem.getGridHeight() * this.terrainSystem.getCellSize();
    this.cameraX = Math.max(0, Math.min(worldWidth - width, this.cameraX));
    this.cameraY = Math.max(0, Math.min(worldHeight - height, this.cameraY));

    this.ctx.fillStyle = '#05050a';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);

    this.drawTerrain();
    this.drawWaves();
    this.drawPlayer(playerX, playerY);
    this.drawMonsters(playerX, playerY);

    this.ctx.restore();

    this.drawNoise();
    this.drawScanlines();

    if (dangerLevel > 0.1) {
      this.drawDangerVignette(dangerLevel);
    }

    if (isPaused) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private drawTerrain(): void {
    const terrain = this.terrainSystem.getTerrain();
    const cellSize = this.terrainSystem.getCellSize();
    const qualitySettings = QUALITY_SETTINGS[this.quality];

    for (let y = 0; y < terrain.length; y++) {
      for (let x = 0; x < terrain[y].length; x++) {
        const cell = terrain[y][x];
        if (!cell.revealed || cell.revealIntensity <= 0) continue;

        const worldX = x * cellSize;
        const worldY = y * cellSize;
        const alpha = cell.revealIntensity;

        if (cell.type === 'empty') continue;

        const rgb = hexToRgb(this.getTerrainColor(cell.type));
        const intensity = Math.floor(255 * alpha);

        if (cell.type === 'wall' || cell.type === 'metal' || cell.type === 'water') {
          this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.3})`;
          this.ctx.fillRect(worldX, worldY, cellSize, cellSize);

          this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(worldX + 1, worldY + 1, cellSize - 2, cellSize - 2);
        } else if (cell.type === 'mud') {
          this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.4})`;
          this.ctx.fillRect(worldX, worldY, cellSize, cellSize);
        } else if (cell.type === 'artifact') {
          this.ctx.save();
          this.ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
          this.ctx.shadowBlur = qualitySettings.glowIntensity * alpha;
          this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
          this.ctx.beginPath();
          this.ctx.arc(
            worldX + cellSize / 2,
            worldY + cellSize / 2,
            cellSize * 0.3,
            0,
            Math.PI * 2
          );
          this.ctx.fill();
          this.ctx.restore();
        } else if (cell.type === 'exit') {
          this.ctx.save();
          this.ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
          this.ctx.shadowBlur = qualitySettings.glowIntensity * alpha;
          this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
          this.ctx.lineWidth = 3;
          this.ctx.strokeRect(
            worldX + cellSize * 0.15,
            worldY + cellSize * 0.15,
            cellSize * 0.7,
            cellSize * 0.7
          );
          this.ctx.restore();
        }
      }
    }
  }

  private getTerrainColor(type: string): string {
    const colors: Record<string, string> = {
      wall: '#e8f4ff',
      mud: '#4a2c6a',
      metal: '#ffd700',
      water: '#1e90ff',
      exit: '#00ff88',
      artifact: '#ff00ff',
    };
    return colors[type] || '#ffffff';
  }

  private drawWaves(): void {
    const particles = this.waveEngine.getParticles();
    const qualitySettings = QUALITY_SETTINGS[this.quality];

    for (const p of particles) {
      if (p.amplitude <= 0) continue;

      const alpha = Math.min(1, p.amplitude) * (1 - p.age / p.maxAge);
      const size = 2 + p.amplitude * 4;
      const rgb = hexToRgb(p.color);

      if (p.trail.length > 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) {
          this.ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }
        this.ctx.lineTo(p.x, p.y);
        this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.5})`;
        this.ctx.lineWidth = size * 0.5;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
      }

      this.ctx.save();
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = qualitySettings.glowIntensity * alpha;

      this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, size * 0.3, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  private drawPlayer(playerX: number, playerY: number): void {
    const qualitySettings = QUALITY_SETTINGS[this.quality];

    this.ctx.save();
    this.ctx.shadowColor = '#00ffff';
    this.ctx.shadowBlur = qualitySettings.glowIntensity * 0.5;

    this.ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(playerX, playerY, 6, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.beginPath();
    this.ctx.arc(playerX, playerY, 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawMonsters(playerX: number, playerY: number): void {
    const monsters = this.monsterAI.getMonsters();
    const cellSize = this.terrainSystem.getCellSize();
    const qualitySettings = QUALITY_SETTINGS[this.quality];

    for (const monster of monsters) {
      const worldX = monster.x * cellSize + cellSize / 2;
      const worldY = monster.y * cellSize + cellSize / 2;

      const dist = distance(worldX, worldY, playerX, playerY);
      const maxDist = cellSize * 8;

      if (dist > maxDist) continue;

      const alpha = (1 - dist / maxDist) * 0.8;
      const color = monster.state === 'chase' ? '#ff3333' : monster.state === 'alert' ? '#ff8800' : '#ff6666';
      const rgb = hexToRgb(color);

      const terrain = this.terrainSystem.getTerrain();
      const gridX = Math.floor(worldX / cellSize);
      const gridY = Math.floor(worldY / cellSize);
      const cell = terrain[gridY]?.[gridX];

      if (!cell?.revealed && dist > cellSize * 2) continue;

      this.ctx.save();
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = qualitySettings.glowIntensity * alpha * (monster.state === 'chase' ? 1.5 : 1);

      this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(worldX, worldY, 10, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(worldX - 3, worldY - 2, 2, 0, Math.PI * 2);
      this.ctx.arc(worldX + 3, worldY - 2, 2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();

      if (monster.state === 'alert' || monster.state === 'chase') {
        this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.5})`;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);
        this.ctx.beginPath();
        this.ctx.arc(worldX, worldY, monster.hearingRange * 0.3, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    }
  }

  private drawNoise(): void {
    if (!this.noiseImageData) return;

    const rect = this.canvas.getBoundingClientRect();
    this.ctx.globalAlpha = 0.03;
    this.ctx.putImageData(
      this.noiseImageData,
      0,
      0,
      0,
      0,
      Math.floor(rect.width * (window.devicePixelRatio || 1)),
      Math.floor(rect.height * (window.devicePixelRatio || 1))
    );
    this.ctx.globalAlpha = 1;
  }

  private drawScanlines(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';

    for (let y = 0; y < rect.height; y += 4) {
      this.ctx.fillRect(0, y, rect.width, 2);
    }
  }

  private drawDangerVignette(dangerLevel: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const gradient = this.ctx.createRadialGradient(
      rect.width / 2,
      rect.height / 2,
      Math.min(rect.width, rect.height) * 0.2,
      rect.width / 2,
      rect.height / 2,
      Math.max(rect.width, rect.height) * 0.7
    );

    const pulse = (Math.sin(Date.now() * 0.01) + 1) * 0.5;
    const alpha = dangerLevel * (0.3 + pulse * 0.2);

    gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(255, 0, 0, ${alpha})`);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, rect.width, rect.height);
  }
}

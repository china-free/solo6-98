import type { Monster, WaveType } from '../types/game';
import { TerrainSystem } from './TerrainSystem';
import { distance, normalize, lerp } from '../utils/math';

export class MonsterAISystem {
  private monsters: Monster[] = [];
  private terrainSystem: TerrainSystem;
  private nextId: number = 1;

  constructor(terrainSystem: TerrainSystem) {
    this.terrainSystem = terrainSystem;
  }

  public initializeMonsters(
    monsterData: Omit<Monster, 'id' | 'state' | 'lastHeardPosition'>[]
  ): void {
    this.monsters = monsterData.map(m => ({
      ...m,
      id: this.nextId++,
      state: 'patrol',
      lastHeardPosition: null,
    }));
  }

  public getMonsters(): Monster[] {
    return this.monsters;
  }

  public onWaveHeard(waveX: number, waveY: number, amplitude: number, type: WaveType): void {
    for (const monster of this.monsters) {
      const dist = distance(monster.x * this.terrainSystem.getCellSize(),
                            monster.y * this.terrainSystem.getCellSize(),
                            waveX, waveY);

      const effectiveRange = monster.hearingRange * amplitude * (type === 'knock' ? 1.5 : 1.0);

      if (dist < effectiveRange) {
        monster.alerted = true;
        monster.alertTime = 3;
        monster.lastHeardPosition = { x: waveX, y: waveY };

        if (monster.state === 'patrol') {
          monster.state = 'alert';
          monster.targetX = Math.floor(waveX / this.terrainSystem.getCellSize());
          monster.targetY = Math.floor(waveY / this.terrainSystem.getCellSize());
        } else if (monster.state === 'alert' && dist < effectiveRange * 0.5) {
          monster.state = 'chase';
        }
      }
    }
  }

  public update(deltaTime: number, playerWorldX: number, playerWorldY: number): void {
    const cellSize = this.terrainSystem.getCellSize();

    for (const monster of this.monsters) {
      if (monster.alerted) {
        monster.alertTime -= deltaTime;
        if (monster.alertTime <= 0) {
          monster.alerted = false;
          monster.state = 'patrol';
          monster.lastHeardPosition = null;
        }
      }

      const monsterWorldX = monster.x * cellSize + cellSize / 2;
      const monsterWorldY = monster.y * cellSize + cellSize / 2;
      const distToPlayer = distance(monsterWorldX, monsterWorldY, playerWorldX, playerWorldY);

      if (distToPlayer < cellSize * 1.5) {
        return;
      }

      switch (monster.state) {
        case 'patrol':
          this.updatePatrol(monster, deltaTime);
          break;
        case 'alert':
          this.updateAlert(monster, deltaTime);
          break;
        case 'chase':
          this.updateChase(monster, deltaTime, playerWorldX, playerWorldY);
          break;
      }
    }
  }

  private updatePatrol(monster: Monster, deltaTime: number): void {
    if (monster.patrolPoints.length === 0) return;

    const target = monster.patrolPoints[monster.patrolIndex];
    const cellSize = this.terrainSystem.getCellSize();
    const monsterWorldX = monster.x * cellSize + cellSize / 2;
    const monsterWorldY = monster.y * cellSize + cellSize / 2;
    const targetWorldX = target.x * cellSize + cellSize / 2;
    const targetWorldY = target.y * cellSize + cellSize / 2;

    const dist = distance(monsterWorldX, monsterWorldY, targetWorldX, targetWorldY);

    if (dist < cellSize * 0.5) {
      monster.patrolIndex = (monster.patrolIndex + 1) % monster.patrolPoints.length;
      return;
    }

    const dir = normalize(targetWorldX - monsterWorldX, targetWorldY - monsterWorldY);
    const speed = monster.speed * 0.5;

    this.moveMonster(monster, dir.x * speed * deltaTime, dir.y * speed * deltaTime);
  }

  private updateAlert(monster: Monster, deltaTime: number): void {
    if (!monster.lastHeardPosition) {
      monster.state = 'patrol';
      return;
    }

    const cellSize = this.terrainSystem.getCellSize();
    const monsterWorldX = monster.x * cellSize + cellSize / 2;
    const monsterWorldY = monster.y * cellSize + cellSize / 2;

    const dist = distance(monsterWorldX, monsterWorldY,
                          monster.lastHeardPosition.x, monster.lastHeardPosition.y);

    if (dist < cellSize) {
      monster.state = 'patrol';
      monster.lastHeardPosition = null;
      return;
    }

    const dir = normalize(
      monster.lastHeardPosition.x - monsterWorldX,
      monster.lastHeardPosition.y - monsterWorldY
    );
    const speed = monster.speed * 0.8;

    this.moveMonster(monster, dir.x * speed * deltaTime, dir.y * speed * deltaTime);
  }

  private updateChase(
    monster: Monster,
    deltaTime: number,
    playerWorldX: number,
    playerWorldY: number
  ): void {
    const cellSize = this.terrainSystem.getCellSize();
    const monsterWorldX = monster.x * cellSize + cellSize / 2;
    const monsterWorldY = monster.y * cellSize + cellSize / 2;

    const dist = distance(monsterWorldX, monsterWorldY, playerWorldX, playerWorldY);

    if (dist > monster.hearingRange * 2) {
      monster.state = 'alert';
      return;
    }

    const dir = normalize(playerWorldX - monsterWorldX, playerWorldY - monsterWorldY);
    const speed = monster.speed * 1.2;

    this.moveMonster(monster, dir.x * speed * deltaTime, dir.y * speed * deltaTime);
  }

  private moveMonster(monster: Monster, dx: number, dy: number): void {
    const cellSize = this.terrainSystem.getCellSize();
    const newX = monster.x + dx / cellSize;
    const newY = monster.y + dy / cellSize;

    if (this.terrainSystem.isWalkableAt(Math.floor(newX), Math.floor(monster.y))) {
      monster.x = newX;
    }
    if (this.terrainSystem.isWalkableAt(Math.floor(monster.x), Math.floor(newY))) {
      monster.y = newY;
    }
  }

  public checkPlayerCollision(playerWorldX: number, playerWorldY: number): boolean {
    const cellSize = this.terrainSystem.getCellSize();
    const playerRadius = cellSize * 0.3;

    for (const monster of this.monsters) {
      const monsterWorldX = monster.x * cellSize + cellSize / 2;
      const monsterWorldY = monster.y * cellSize + cellSize / 2;
      const dist = distance(monsterWorldX, monsterWorldY, playerWorldX, playerWorldY);

      if (dist < cellSize * 0.6) {
        return true;
      }
    }
    return false;
  }

  public getDangerLevel(playerWorldX: number, playerWorldY: number): number {
    const cellSize = this.terrainSystem.getCellSize();
    let maxDanger = 0;

    for (const monster of this.monsters) {
      const monsterWorldX = monster.x * cellSize + cellSize / 2;
      const monsterWorldY = monster.y * cellSize + cellSize / 2;
      const dist = distance(monsterWorldX, monsterWorldY, playerWorldX, playerWorldY);
      const dangerRadius = cellSize * 6;

      if (dist < dangerRadius) {
        const danger = (1 - dist / dangerRadius) * (monster.state === 'chase' ? 1.5 : monster.state === 'alert' ? 1.0 : 0.5);
        maxDanger = Math.max(maxDanger, danger);
      }
    }

    return Math.min(1, maxDanger);
  }

  public clear(): void {
    this.monsters = [];
    this.nextId = 1;
  }
}

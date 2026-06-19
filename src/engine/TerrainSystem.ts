import type { TerrainCell, MaterialType, CollisionResult } from '../types/game';
import { MATERIAL_PROPERTIES, isWalkable } from '../utils/materials';
import { LEVEL_1, getTotalArtifacts } from '../utils/levelData';

export class TerrainSystem {
  private terrain: TerrainCell[][] = [];
  private gridWidth: number = 0;
  private gridHeight: number = 0;
  private cellSize: number = 40;
  private totalArtifacts: number = 0;

  constructor() {
    this.initializeTerrain();
  }

  private initializeTerrain(): void {
    const levelData = LEVEL_1;
    this.cellSize = levelData.cellSize;
    const grid = levelData.grid;
    this.gridHeight = grid.length;
    this.gridWidth = grid[0].length;
    this.totalArtifacts = getTotalArtifacts(grid);

    this.terrain = [];
    for (let y = 0; y < this.gridHeight; y++) {
      const row: TerrainCell[] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        row.push({
          x,
          y,
          type: grid[y][x],
          revealed: false,
          revealTime: 0,
          revealIntensity: 0,
        });
      }
      this.terrain.push(row);
    }
  }

  public getTerrain(): TerrainCell[][] {
    return this.terrain;
  }

  public getGridWidth(): number {
    return this.gridWidth;
  }

  public getGridHeight(): number {
    return this.gridHeight;
  }

  public getCellSize(): number {
    return this.cellSize;
  }

  public getTotalArtifacts(): number {
    return this.totalArtifacts;
  }

  public getCell(gridX: number, gridY: number): TerrainCell | null {
    if (gridX < 0 || gridX >= this.gridWidth || gridY < 0 || gridY >= this.gridHeight) {
      return null;
    }
    return this.terrain[gridY][gridX];
  }

  public getCellAtWorldPos(worldX: number, worldY: number): TerrainCell | null {
    const gridX = Math.floor(worldX / this.cellSize);
    const gridY = Math.floor(worldY / this.cellSize);
    return this.getCell(gridX, gridY);
  }

  public getMaterialType(gridX: number, gridY: number): MaterialType {
    const cell = this.getCell(gridX, gridY);
    return cell ? cell.type : 'wall';
  }

  public isWalkableAt(gridX: number, gridY: number): boolean {
    const cell = this.getCell(gridX, gridY);
    if (!cell) return false;
    return isWalkable(cell.type);
  }

  public isWalkableAtWorldPos(worldX: number, worldY: number): boolean {
    const cell = this.getCellAtWorldPos(worldX, worldY);
    if (!cell) return false;
    return isWalkable(cell.type);
  }

  public revealCell(gridX: number, gridY: number, intensity: number = 1): void {
    const cell = this.getCell(gridX, gridY);
    if (cell) {
      cell.revealed = true;
      cell.revealTime = 0;
      cell.revealIntensity = Math.max(cell.revealIntensity, intensity);
    }
  }

  public revealArea(centerX: number, centerY: number, radius: number, intensity: number = 1): void {
    const gridCenterX = Math.floor(centerX / this.cellSize);
    const gridCenterY = Math.floor(centerY / this.cellSize);
    const gridRadius = Math.ceil(radius / this.cellSize);

    for (let dy = -gridRadius; dy <= gridRadius; dy++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= gridRadius) {
          const fadeIntensity = intensity * (1 - dist / gridRadius);
          this.revealCell(gridCenterX + dx, gridCenterY + dy, fadeIntensity);
        }
      }
    }
  }

  public checkCollision(
    x: number,
    y: number,
    radius: number
  ): CollisionResult {
    const minGridX = Math.floor((x - radius) / this.cellSize);
    const maxGridX = Math.floor((x + radius) / this.cellSize);
    const minGridY = Math.floor((y - radius) / this.cellSize);
    const maxGridY = Math.floor((y + radius) / this.cellSize);

    let closestDist = Infinity;
    let closestCell: { x: number; y: number; type: MaterialType } | null = null;
    let normalX = 0;
    let normalY = 0;

    for (let gy = minGridY; gy <= maxGridY; gy++) {
      for (let gx = minGridX; gx <= maxGridX; gx++) {
        const cell = this.getCell(gx, gy);
        if (!cell || isWalkable(cell.type)) continue;

        const cellLeft = gx * this.cellSize;
        const cellRight = cellLeft + this.cellSize;
        const cellTop = gy * this.cellSize;
        const cellBottom = cellTop + this.cellSize;

        const closestX = Math.max(cellLeft, Math.min(x, cellRight));
        const closestY = Math.max(cellTop, Math.min(y, cellBottom));
        const dx = x - closestX;
        const dy = y - closestY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius && dist < closestDist) {
          closestDist = dist;
          closestCell = { x: gx, y: gy, type: cell.type };
          if (dist > 0) {
            normalX = dx / dist;
            normalY = dy / dist;
          } else {
            normalX = x < cellLeft + this.cellSize / 2 ? -1 : 1;
            normalY = 0;
          }
        }
      }
    }

    if (closestCell) {
      return {
        collided: true,
        cellType: closestCell.type,
        normalX,
        normalY,
        cellX: closestCell.x,
        cellY: closestCell.y,
      };
    }

    return {
      collided: false,
      cellType: 'empty',
      normalX: 0,
      normalY: 0,
      cellX: 0,
      cellY: 0,
    };
  }

  public checkWaveCollision(
    x: number,
    y: number,
    prevX: number,
    prevY: number
  ): CollisionResult {
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    const prevGridX = Math.floor(prevX / this.cellSize);
    const prevGridY = Math.floor(prevY / this.cellSize);

    if (gridX === prevGridX && gridY === prevGridY) {
      const cell = this.getCell(gridX, gridY);
      if (cell && !isWalkable(cell.type)) {
        const cellLeft = gridX * this.cellSize;
        const cellRight = cellLeft + this.cellSize;
        const cellTop = gridY * this.cellSize;
        const cellBottom = cellTop + this.cellSize;

        const centerX = cellLeft + this.cellSize / 2;
        const centerY = cellTop + this.cellSize / 2;
        const dx = x - centerX;
        const dy = y - centerY;

        let nx = 0, ny = 0;
        if (Math.abs(dx) > Math.abs(dy)) {
          nx = dx > 0 ? 1 : -1;
        } else {
          ny = dy > 0 ? 1 : -1;
        }

        return {
          collided: true,
          cellType: cell.type,
          normalX: nx,
          normalY: ny,
          cellX: gridX,
          cellY: gridY,
        };
      }
      return {
        collided: false,
        cellType: 'empty',
        normalX: 0,
        normalY: 0,
        cellX: gridX,
        cellY: gridY,
      };
    }

    const minX = Math.min(gridX, prevGridX);
    const maxX = Math.max(gridX, prevGridX);
    const minY = Math.min(gridY, prevGridY);
    const maxY = Math.max(gridY, prevGridY);

    for (let gy = minY; gy <= maxY; gy++) {
      for (let gx = minX; gx <= maxX; gx++) {
        const cell = this.getCell(gx, gy);
        if (!cell || isWalkable(cell.type)) continue;

        if (this.lineIntersectsCell(prevX, prevY, x, y, gx, gy)) {
          const cellLeft = gx * this.cellSize;
          const cellRight = cellLeft + this.cellSize;
          const cellTop = gy * this.cellSize;
          const cellBottom = cellTop + this.cellSize;

          const tLeft = (cellLeft - prevX) / (x - prevX || 0.0001);
          const tRight = (cellRight - prevX) / (x - prevX || 0.0001);
          const tTop = (cellTop - prevY) / (y - prevY || 0.0001);
          const tBottom = (cellBottom - prevY) / (y - prevY || 0.0001);

          const tMin = Math.max(Math.min(tLeft, tRight), Math.min(tTop, tBottom));
          let nx = 0, ny = 0;

          if (tMin === Math.min(tLeft, tRight)) {
            nx = tLeft < tRight ? -1 : 1;
          } else {
            ny = tTop < tBottom ? -1 : 1;
          }

          return {
            collided: true,
            cellType: cell.type,
            normalX: nx,
            normalY: ny,
            cellX: gx,
            cellY: gy,
          };
        }
      }
    }

    return {
      collided: false,
      cellType: 'empty',
      normalX: 0,
      normalY: 0,
      cellX: gridX,
      cellY: gridY,
    };
  }

  private lineIntersectsCell(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    cellX: number,
    cellY: number
  ): boolean {
    const left = cellX * this.cellSize;
    const right = left + this.cellSize;
    const top = cellY * this.cellSize;
    const bottom = top + this.cellSize;

    if ((x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) ||
        (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom)) {
      return true;
    }

    return (
      this.lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||
      this.lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom) ||
      this.lineIntersectsLine(x1, y1, x2, y2, right, bottom, left, bottom) ||
      this.lineIntersectsLine(x1, y1, x2, y2, left, bottom, left, top)
    );
  }

  private lineIntersectsLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number
  ): boolean {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return false;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  public update(deltaTime: number): void {
    const fadeRate = 0.3;
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const cell = this.terrain[y][x];
        if (cell.revealed) {
          cell.revealTime += deltaTime;
          cell.revealIntensity = Math.max(0, cell.revealIntensity - deltaTime * fadeRate);
          if (cell.revealIntensity <= 0) {
            cell.revealed = false;
            cell.revealTime = 0;
          }
        }
      }
    }
  }

  public collectArtifact(gridX: number, gridY: number): boolean {
    const cell = this.getCell(gridX, gridY);
    if (cell && cell.type === 'artifact') {
      cell.type = 'empty';
      return true;
    }
    return false;
  }

  public isExit(gridX: number, gridY: number): boolean {
    const cell = this.getCell(gridX, gridY);
    return cell?.type === 'exit';
  }

  public getMaterialProperties(type: MaterialType) {
    return MATERIAL_PROPERTIES[type];
  }
}

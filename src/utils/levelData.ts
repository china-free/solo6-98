import type { MaterialType, Monster } from '../types/game';

const W: MaterialType = 'wall';
const E: MaterialType = 'empty';
const M: MaterialType = 'metal';
const D: MaterialType = 'mud';
const A: MaterialType = 'water';
const X: MaterialType = 'exit';
const T: MaterialType = 'artifact';

export const LEVEL_1: {
  grid: MaterialType[][];
  playerStart: { x: number; y: number };
  monsters: Omit<Monster, 'id' | 'state' | 'lastHeardPosition'>[];
  cellSize: number;
} = {
  cellSize: 40,
  playerStart: { x: 2, y: 2 },
  monsters: [
    {
      x: 15,
      y: 8,
      speed: 40,
      hearingRange: 200,
      targetX: 15,
      targetY: 8,
      alerted: false,
      alertTime: 0,
      patrolPoints: [
        { x: 12, y: 8 },
        { x: 18, y: 8 },
        { x: 18, y: 12 },
        { x: 12, y: 12 },
      ],
      patrolIndex: 0,
    },
    {
      x: 25,
      y: 15,
      speed: 35,
      hearingRange: 180,
      targetX: 25,
      targetY: 15,
      alerted: false,
      alertTime: 0,
      patrolPoints: [
        { x: 22, y: 15 },
        { x: 28, y: 15 },
      ],
      patrolIndex: 0,
    },
  ],
  grid: [
    [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
    [W, E, E, E, E, E, W, E, E, E, E, E, E, E, E, W, E, E, E, E, E, E, E, W, E, E, E, E, E, W],
    [W, E, E, E, E, E, W, E, E, E, E, E, E, E, E, W, E, E, E, E, E, E, E, W, E, E, T, E, E, W],
    [W, E, E, E, E, E, W, E, E, M, M, M, E, E, E, W, E, E, W, W, W, E, E, W, E, E, E, E, E, W],
    [W, E, E, E, E, E, W, E, E, M, E, M, E, E, E, E, E, E, W, E, W, E, E, E, E, E, E, E, E, W],
    [W, E, E, E, E, E, E, E, E, M, E, M, E, E, E, E, E, E, W, E, W, E, E, E, E, E, E, E, E, W],
    [W, W, W, W, E, W, W, W, W, W, E, W, W, W, E, W, W, W, W, E, W, W, W, W, W, E, W, W, W, W],
    [W, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, W],
    [W, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, W],
    [W, E, E, M, M, M, E, E, E, D, D, D, E, E, E, E, E, E, D, D, D, E, E, E, M, M, M, E, E, W],
    [W, E, E, M, E, M, E, E, E, D, E, D, E, E, E, E, E, E, D, E, D, E, E, E, M, E, M, E, E, W],
    [W, E, E, M, E, M, E, E, E, D, E, D, E, E, E, E, E, E, D, E, D, E, E, E, M, E, M, E, E, W],
    [W, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, W],
    [W, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, W],
    [W, W, W, W, E, W, W, W, W, W, W, W, E, W, W, W, W, W, W, W, E, W, W, W, W, E, W, W, W, W],
    [W, E, E, E, E, E, E, E, E, E, E, E, E, E, E, A, A, A, E, E, E, E, E, E, E, E, E, E, E, W],
    [W, E, E, E, E, E, E, E, E, E, E, E, E, E, E, A, A, A, E, E, E, E, E, E, E, E, E, E, E, W],
    [W, E, T, E, E, E, E, E, E, E, E, E, E, E, E, A, A, A, E, E, E, E, E, E, E, E, E, T, E, W],
    [W, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, W],
    [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, X, W],
  ],
};

export const getTotalArtifacts = (grid: MaterialType[][]): number => {
  let count = 0;
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === 'artifact') count++;
    }
  }
  return count;
};

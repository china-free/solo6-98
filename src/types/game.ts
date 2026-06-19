export type MaterialType = 'wall' | 'mud' | 'metal' | 'water' | 'empty' | 'exit' | 'artifact';

export type MediumType = 'air' | 'water' | 'mud' | 'solid';

export type WaveType = 'knock' | 'whistle';

export type GamePhase = 'menu' | 'playing' | 'paused' | 'won' | 'lost';

export type QualityLevel = 'low' | 'medium' | 'high';

export interface AcousticProperties {
  density: number;
  soundSpeed: number;
  impedance: number;
  absorptionCoeff: number;
  transmissionLoss: number;
}

export interface MaterialProperties {
  color: string;
  decayRate: number;
  echoCount: number;
  walkable: boolean;
  diffractionCoeff: number;
  medium: MediumType;
  acoustic: AcousticProperties;
  isTransparent: boolean;
}

export interface InterfaceInteraction {
  pressureReflectionCoeff: number;
  intensityReflectionCoeff: number;
  pressureTransmissionCoeff: number;
  intensityTransmissionCoeff: number;
  refractedAngle: number;
  totalReflection: boolean;
  criticalAngle: number;
}

export interface TerrainCell {
  x: number;
  y: number;
  type: MaterialType;
  revealed: boolean;
  revealTime: number;
  revealIntensity: number;
}

export interface WaveParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  amplitude: number;
  intensity: number;
  frequency: number;
  age: number;
  maxAge: number;
  color: string;
  bounceCount: number;
  sourceType: WaveType;
  trail: { x: number; y: number; age: number }[];
  currentMedium: MediumType;
  baseSpeed: number;
  phase: number;
  wavelength: number;
}

export interface Player {
  x: number;
  y: number;
  stamina: number;
  maxStamina: number;
  staminaRegen: number;
  artifacts: number;
  speed: number;
}

export interface Monster {
  id: number;
  x: number;
  y: number;
  speed: number;
  hearingRange: number;
  targetX: number;
  targetY: number;
  alerted: boolean;
  alertTime: number;
  patrolPoints: { x: number; y: number }[];
  patrolIndex: number;
  state: 'patrol' | 'alert' | 'chase';
  lastHeardPosition: { x: number; y: number } | null;
}

export interface Settings {
  volume: number;
  quality: QualityLevel;
  soundEnabled: boolean;
}

export interface GameState {
  phase: GamePhase;
  player: Player;
  monsters: Monster[];
  terrain: TerrainCell[][];
  waves: WaveParticle[];
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  totalArtifacts: number;
  settings: Settings;
  elapsedTime: number;
  waveCount: number;
  dangerLevel: number;
}

export interface WaveConfig {
  particleCount: number;
  speed: number;
  amplitude: number;
  frequency: number;
  staminaCost: number;
  color: string;
  maxAge: number;
}

export interface CollisionResult {
  collided: boolean;
  cellType: MaterialType;
  normalX: number;
  normalY: number;
  cellX: number;
  cellY: number;
}

export interface GameStateSnapshot {
  phase: GamePhase;
  player: Player;
  waveCount: number;
  elapsedTime: number;
  totalArtifacts: number;
  dangerLevel: number;
  settings: Settings;
}

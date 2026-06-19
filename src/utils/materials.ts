import type { MaterialProperties, MaterialType, WaveConfig, WaveType, QualityLevel } from '../types/game';

export const MATERIAL_PROPERTIES: Record<MaterialType, MaterialProperties> = {
  wall: {
    reflectivity: 0.9,
    absorption: 0.1,
    diffraction: 0.1,
    color: '#e8f4ff',
    decayRate: 0.02,
    echoCount: 1,
    walkable: false,
  },
  mud: {
    reflectivity: 0.2,
    absorption: 0.8,
    diffraction: 0.3,
    color: '#4a2c6a',
    decayRate: 0.08,
    echoCount: 0,
    walkable: true,
  },
  metal: {
    reflectivity: 0.95,
    absorption: 0.05,
    diffraction: 0.05,
    color: '#ffd700',
    decayRate: 0.01,
    echoCount: 3,
    walkable: false,
  },
  water: {
    reflectivity: 0.3,
    absorption: 0.5,
    diffraction: 0.6,
    color: '#1e90ff',
    decayRate: 0.05,
    echoCount: 0,
    walkable: false,
  },
  empty: {
    reflectivity: 0,
    absorption: 0,
    diffraction: 0,
    color: 'transparent',
    decayRate: 0.01,
    echoCount: 0,
    walkable: true,
  },
  exit: {
    reflectivity: 0.5,
    absorption: 0.2,
    diffraction: 0.3,
    color: '#00ff88',
    decayRate: 0.03,
    echoCount: 1,
    walkable: true,
  },
  artifact: {
    reflectivity: 0.8,
    absorption: 0.1,
    diffraction: 0.1,
    color: '#ff00ff',
    decayRate: 0.02,
    echoCount: 2,
    walkable: true,
  },
};

export const WAVE_CONFIGS: Record<WaveType, WaveConfig> = {
  knock: {
    particleCount: 48,
    speed: 180,
    amplitude: 1.0,
    frequency: 0.3,
    staminaCost: 25,
    color: '#00ffff',
    maxAge: 3.5,
  },
  whistle: {
    particleCount: 32,
    speed: 220,
    amplitude: 0.6,
    frequency: 0.8,
    staminaCost: 10,
    color: '#ff6b9d',
    maxAge: 2.5,
  },
};

export const QUALITY_SETTINGS: Record<QualityLevel, { maxParticles: number; waveParticlesMultiplier: number; glowIntensity: number }> = {
  low: {
    maxParticles: 200,
    waveParticlesMultiplier: 0.5,
    glowIntensity: 8,
  },
  medium: {
    maxParticles: 500,
    waveParticlesMultiplier: 1.0,
    glowIntensity: 15,
  },
  high: {
    maxParticles: 1000,
    waveParticlesMultiplier: 1.5,
    glowIntensity: 25,
  },
};

export const getMaterialColor = (type: MaterialType): string => {
  return MATERIAL_PROPERTIES[type].color;
};

export const isWalkable = (type: MaterialType): boolean => {
  return MATERIAL_PROPERTIES[type].walkable;
};

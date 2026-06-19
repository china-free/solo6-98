import type { MaterialProperties, MaterialType, WaveConfig, WaveType, QualityLevel, MediumType, InterfaceInteraction } from '../types/game';

const AIR_ACOUSTIC = {
  density: 1.2,
  soundSpeed: 343,
  impedance: 415,
  absorptionCoeff: 0.01,
  transmissionLoss: 0,
};

const WATER_ACOUSTIC = {
  density: 1000,
  soundSpeed: 1480,
  impedance: 1_480_000,
  absorptionCoeff: 0.001,
  transmissionLoss: 0.05,
};

const MUD_ACOUSTIC = {
  density: 1500,
  soundSpeed: 900,
  impedance: 1_350_000,
  absorptionCoeff: 0.7,
  transmissionLoss: 0.4,
};

const METAL_ACOUSTIC = {
  density: 7850,
  soundSpeed: 5000,
  impedance: 39_250_000,
  absorptionCoeff: 0.005,
  transmissionLoss: 0.01,
};

const STONE_ACOUSTIC = {
  density: 2400,
  soundSpeed: 3000,
  impedance: 7_200_000,
  absorptionCoeff: 0.05,
  transmissionLoss: 0.02,
};

const ARTIFACT_ACOUSTIC = {
  density: 5000,
  soundSpeed: 4000,
  impedance: 20_000_000,
  absorptionCoeff: 0.02,
  transmissionLoss: 0.015,
};

export const MATERIAL_PROPERTIES: Record<MaterialType, MaterialProperties> = {
  wall: {
    color: '#e8f4ff',
    decayRate: 0.02,
    echoCount: 2,
    walkable: false,
    diffractionCoeff: 0.08,
    medium: 'solid',
    acoustic: STONE_ACOUSTIC,
    isTransparent: false,
  },
  mud: {
    color: '#4a2c6a',
    decayRate: 0.06,
    echoCount: 0,
    walkable: true,
    diffractionCoeff: 0.25,
    medium: 'mud',
    acoustic: MUD_ACOUSTIC,
    isTransparent: false,
  },
  metal: {
    color: '#ffd700',
    decayRate: 0.008,
    echoCount: 4,
    walkable: false,
    diffractionCoeff: 0.04,
    medium: 'solid',
    acoustic: METAL_ACOUSTIC,
    isTransparent: false,
  },
  water: {
    color: '#1e90ff',
    decayRate: 0.015,
    echoCount: 1,
    walkable: false,
    diffractionCoeff: 0.15,
    medium: 'water',
    acoustic: WATER_ACOUSTIC,
    isTransparent: true,
  },
  empty: {
    color: 'transparent',
    decayRate: 0.005,
    echoCount: 0,
    walkable: true,
    diffractionCoeff: 0,
    medium: 'air',
    acoustic: AIR_ACOUSTIC,
    isTransparent: true,
  },
  exit: {
    color: '#00ff88',
    decayRate: 0.025,
    echoCount: 1,
    walkable: true,
    diffractionCoeff: 0.2,
    medium: 'air',
    acoustic: { ...AIR_ACOUSTIC, absorptionCoeff: 0.02 },
    isTransparent: true,
  },
  artifact: {
    color: '#ff00ff',
    decayRate: 0.015,
    echoCount: 2,
    walkable: true,
    diffractionCoeff: 0.06,
    medium: 'solid',
    acoustic: ARTIFACT_ACOUSTIC,
    isTransparent: false,
  },
};

export const MEDIUM_PROPERTIES: Record<MediumType, typeof AIR_ACOUSTIC & { diffraction: number }> = {
  air: { ...AIR_ACOUSTIC, diffraction: 0 },
  water: { ...WATER_ACOUSTIC, diffraction: 0.1 },
  mud: { ...MUD_ACOUSTIC, diffraction: 0.3 },
  solid: { ...STONE_ACOUSTIC, diffraction: 0.05 },
};

export const computeInterfaceInteraction = (
  incidentAngle: number,
  z1: number,
  z2: number,
  c1: number,
  c2: number
): InterfaceInteraction => {
  const sinTheta1 = Math.sin(incidentAngle);
  const sinTheta2 = (c2 / c1) * sinTheta1;

  const criticalAngle = Math.asin(Math.min(1, c1 / c2));
  const totalReflection = Math.abs(sinTheta1) > c1 / c2 && c1 < c2;

  let refractedAngle = 0;
  if (!totalReflection) {
    refractedAngle = Math.asin(Math.max(-1, Math.min(1, sinTheta2)));
  }

  const cosTheta1 = Math.cos(incidentAngle);
  const cosTheta2 = totalReflection ? 0 : Math.cos(refractedAngle);

  const pressureReflectionCoeff = (z2 * cosTheta1 - z1 * cosTheta2) / (z2 * cosTheta1 + z1 * cosTheta2);
  const intensityReflectionCoeff = pressureReflectionCoeff * pressureReflectionCoeff;

  const pressureTransmissionCoeff = totalReflection ? 0 : (2 * z2 * cosTheta1) / (z2 * cosTheta1 + z1 * cosTheta2);
  const intensityTransmissionCoeff = totalReflection ? 0 : (4 * z1 * z2 * cosTheta1 * cosTheta2) / ((z2 * cosTheta1 + z1 * cosTheta2) ** 2);

  return {
    pressureReflectionCoeff,
    intensityReflectionCoeff,
    pressureTransmissionCoeff,
    intensityTransmissionCoeff,
    refractedAngle,
    totalReflection,
    criticalAngle,
  };
};

export const WAVE_CONFIGS: Record<WaveType, WaveConfig> = {
  knock: {
    particleCount: 56,
    speed: 200,
    amplitude: 1.0,
    frequency: 0.25,
    staminaCost: 25,
    color: '#00ffff',
    maxAge: 3.5,
  },
  whistle: {
    particleCount: 40,
    speed: 250,
    amplitude: 0.6,
    frequency: 0.75,
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
    maxParticles: 600,
    waveParticlesMultiplier: 1.0,
    glowIntensity: 15,
  },
  high: {
    maxParticles: 1200,
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

export const getMediumForMaterial = (type: MaterialType): MediumType => {
  return MATERIAL_PROPERTIES[type].medium;
};

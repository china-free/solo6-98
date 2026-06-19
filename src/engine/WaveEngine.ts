import type { WaveParticle, WaveType, CollisionResult, QualityLevel, MediumType, InterfaceInteraction } from '../types/game';
import { WAVE_CONFIGS, MATERIAL_PROPERTIES, QUALITY_SETTINGS, MEDIUM_PROPERTIES, computeInterfaceInteraction } from '../utils/materials';
import { TerrainSystem } from './TerrainSystem';
import { reflect, normalize, randomRange, clamp, dot } from '../utils/math';

interface DiffractionSource {
  x: number;
  y: number;
  normalX: number;
  normalY: number;
  amplitude: number;
  frequency: number;
  color: string;
  age: number;
  medium: MediumType;
  baseSpeed: number;
}

export class WaveEngine {
  private particles: WaveParticle[] = [];
  private terrainSystem: TerrainSystem;
  private quality: QualityLevel = 'medium';
  private particlePool: WaveParticle[] = [];
  private diffractionSources: DiffractionSource[] = [];
  private onWaveHeard: ((x: number, y: number, amplitude: number, type: WaveType) => void) | null = null;
  private onReflection: ((materialType: string, x: number, y: number, amplitude: number) => void) | null = null;

  constructor(terrainSystem: TerrainSystem) {
    this.terrainSystem = terrainSystem;
  }

  public setQuality(quality: QualityLevel): void {
    this.quality = quality;
  }

  public setOnWaveHeardCallback(
    callback: (x: number, y: number, amplitude: number, type: WaveType) => void
  ): void {
    this.onWaveHeard = callback;
  }

  public setOnReflectionCallback(
    callback: (materialType: string, x: number, y: number, amplitude: number) => void
  ): void {
    this.onReflection = callback;
  }

  public getParticles(): WaveParticle[] {
    return this.particles;
  }

  private getParticle(): WaveParticle {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      amplitude: 0,
      intensity: 0,
      frequency: 0,
      age: 0,
      maxAge: 0,
      color: '',
      bounceCount: 0,
      sourceType: 'knock',
      trail: [],
      currentMedium: 'air',
      baseSpeed: 0,
      phase: 0,
      wavelength: 0,
    };
  }

  private returnParticle(particle: WaveParticle): void {
    particle.trail = [];
    this.particlePool.push(particle);
  }

  private getMediumSpeed(medium: MediumType, baseSpeed: number): number {
    const mediumProps = MEDIUM_PROPERTIES[medium];
    const airSpeed = MEDIUM_PROPERTIES.air.soundSpeed;
    const speedRatio = mediumProps.soundSpeed / airSpeed;
    return baseSpeed * speedRatio;
  }

  public emitWave(worldX: number, worldY: number, type: WaveType): void {
    const config = WAVE_CONFIGS[type];
    const qualitySettings = QUALITY_SETTINGS[this.quality];
    const particleCount = Math.floor(config.particleCount * qualitySettings.waveParticlesMultiplier);
    const maxParticles = qualitySettings.maxParticles;

    if (this.particles.length >= maxParticles) {
      const toRemove = this.particles.length - maxParticles + particleCount;
      const removed = this.particles.splice(0, toRemove);
      removed.forEach(p => this.returnParticle(p));
    }

    const startCell = this.terrainSystem.getCellAtWorldPos(worldX, worldY);
    const startMedium = startCell ? MATERIAL_PROPERTIES[startCell.type].medium : 'air';
    const baseSpeed = config.speed;
    const mediumSpeed = this.getMediumSpeed(startMedium, baseSpeed);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + randomRange(-0.03, 0.03);
      const speed = mediumSpeed * randomRange(0.95, 1.05);
      const particle = this.getParticle();

      particle.x = worldX;
      particle.y = worldY;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.amplitude = config.amplitude * randomRange(0.9, 1.1);
      particle.intensity = particle.amplitude * particle.amplitude;
      particle.frequency = config.frequency;
      particle.age = 0;
      particle.maxAge = config.maxAge;
      particle.color = config.color;
      particle.bounceCount = 0;
      particle.sourceType = type;
      particle.trail = [];
      particle.currentMedium = startMedium;
      particle.baseSpeed = baseSpeed;
      particle.phase = randomRange(0, Math.PI * 2);
      particle.wavelength = speed / config.frequency;

      this.particles.push(particle);
    }

    if (this.onWaveHeard) {
      this.onWaveHeard(worldX, worldY, config.amplitude, type);
    }
  }

  public update(deltaTime: number): void {
    const toRemove: number[] = [];
    const newParticles: WaveParticle[] = [];
    this.diffractionSources = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const prevX = p.x;
      const prevY = p.y;

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.age += deltaTime;
      p.phase += (2 * Math.PI * p.frequency * deltaTime) % (Math.PI * 2);

      if (p.trail.length > 6) {
        p.trail.shift();
      }
      p.trail.push({ x: prevX, y: prevY, age: p.age - deltaTime });

      const collision = this.terrainSystem.checkWaveCollision(p.x, p.y, prevX, prevY);

      if (collision.collided) {
        this.handleInterfaceInteraction(p, collision, prevX, prevY, newParticles);
      }

      const cellSize = this.terrainSystem.getCellSize();
      const revealRadius = 15 + Math.sqrt(p.intensity) * 25;
      this.terrainSystem.revealArea(p.x, p.y, revealRadius, p.amplitude * 0.25);

      if (this.onWaveHeard && p.bounceCount < 2) {
        this.onWaveHeard(p.x, p.y, p.amplitude * 0.4, p.sourceType);
      }

      const currentCell = this.terrainSystem.getCellAtWorldPos(p.x, p.y);
      if (currentCell) {
        const matProps = MATERIAL_PROPERTIES[currentCell.type];
        const absorption = matProps.acoustic.absorptionCoeff * 0.1;
        p.amplitude -= absorption * deltaTime * 60;
        p.intensity = p.amplitude * p.amplitude;

        const decay = matProps.decayRate * deltaTime * 60;
        p.amplitude -= decay;
        p.intensity = p.amplitude * p.amplitude;
      }

      if (p.age >= p.maxAge || p.amplitude <= 0.008) {
        toRemove.push(i);
      }
    }

    this.processDiffraction(newParticles);

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const removed = this.particles.splice(toRemove[i], 1)[0];
      this.returnParticle(removed);
    }

    this.particles.push(...newParticles);
  }

  private handleInterfaceInteraction(
    p: WaveParticle,
    collision: CollisionResult,
    prevX: number,
    prevY: number,
    newParticles: WaveParticle[]
  ): void {
    p.x = prevX;
    p.y = prevY;

    const targetMat = MATERIAL_PROPERTIES[collision.cellType];
    const sourceMediumProps = MEDIUM_PROPERTIES[p.currentMedium];
    const targetMediumProps = MEDIUM_PROPERTIES[targetMat.medium];

    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const dirX = p.vx / speed;
    const dirY = p.vy / speed;

    const incidentAngle = Math.acos(clamp(-dot(dirX, dirY, collision.normalX, collision.normalY), -1, 1));

    const interaction: InterfaceInteraction = computeInterfaceInteraction(
      incidentAngle,
      sourceMediumProps.impedance,
      targetMediumProps.impedance,
      sourceMediumProps.soundSpeed,
      targetMediumProps.soundSpeed
    );

    const isTransparent = targetMat.isTransparent;

    if (isTransparent && !interaction.totalReflection && interaction.intensityTransmissionCoeff > 0.05) {
      this.handleTransmission(p, collision, interaction, targetMat.medium, newParticles);
    } else {
      this.handleReflection(p, collision, interaction, collision.cellType, newParticles);
    }

    if (targetMat.diffractionCoeff > 0 && Math.random() < targetMat.diffractionCoeff * 0.4) {
      this.diffractionSources.push({
        x: p.x,
        y: p.y,
        normalX: collision.normalX,
        normalY: collision.normalY,
        amplitude: p.amplitude * targetMat.diffractionCoeff,
        frequency: p.frequency,
        color: p.color,
        age: p.age,
        medium: p.currentMedium,
        baseSpeed: p.baseSpeed,
      });
    }

    if (this.onReflection && p.amplitude > 0.08) {
      this.onReflection(collision.cellType, p.x, p.y, p.amplitude);
    }

    p.amplitude = clamp(p.amplitude, 0, 1);
    p.intensity = p.amplitude * p.amplitude;
  }

  private handleReflection(
    p: WaveParticle,
    collision: CollisionResult,
    interaction: InterfaceInteraction,
    materialType: string,
    newParticles: WaveParticle[]
  ): void {
    const reflected = reflect(p.vx, p.vy, collision.normalX, collision.normalY);
    const reflIntensity = p.intensity * interaction.intensityReflectionCoeff;
    const reflAmplitude = Math.sqrt(Math.max(0, reflIntensity));

    const matProps = MATERIAL_PROPERTIES[collision.cellType];
    const absorbed = p.intensity * matProps.acoustic.absorptionCoeff * 0.3;
    const finalAmplitude = Math.sqrt(Math.max(0, reflIntensity - absorbed));

    p.vx = reflected.x;
    p.vy = reflected.y;
    p.amplitude = finalAmplitude;
    p.intensity = finalAmplitude * finalAmplitude;
    p.bounceCount++;

    if (p.bounceCount === 1) {
      p.color = matProps.color;
    }

    if (matProps.echoCount > 0 && p.amplitude > 0.25) {
      for (let e = 0; e < Math.min(matProps.echoCount, 3); e++) {
        const echoParticle = this.createEchoParticle(p, collision, e);
        if (echoParticle) {
          newParticles.push(echoParticle);
        }
      }
    }
  }

  private handleTransmission(
    p: WaveParticle,
    collision: CollisionResult,
    interaction: InterfaceInteraction,
    targetMedium: MediumType,
    newParticles: WaveParticle[]
  ): void {
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const dirX = p.vx / speed;
    const dirY = p.vy / speed;

    const targetSpeed = this.getMediumSpeed(targetMedium, p.baseSpeed);

    const tangentX = -collision.normalY;
    const tangentY = collision.normalX;

    const sinTheta2 = Math.sin(interaction.refractedAngle);
    const cosTheta2 = Math.cos(interaction.refractedAngle);

    const dirDotNormal = dot(dirX, dirY, collision.normalX, collision.normalY);
    const sign = dirDotNormal < 0 ? -1 : 1;

    const newDirX = tangentX * sinTheta2 + collision.normalX * cosTheta2 * sign;
    const newDirY = tangentY * sinTheta2 + collision.normalY * cosTheta2 * sign;

    const norm = Math.sqrt(newDirX * newDirX + newDirY * newDirY);
    const unitDirX = newDirX / norm;
    const unitDirY = newDirY / norm;

    const transIntensity = p.intensity * interaction.intensityTransmissionCoeff;
    const transAmplitude = Math.sqrt(Math.max(0, transIntensity));

    const targetMat = MATERIAL_PROPERTIES[collision.cellType];
    const lossAmplitude = transAmplitude * (1 - targetMat.acoustic.transmissionLoss);

    p.vx = unitDirX * targetSpeed;
    p.vy = unitDirY * targetSpeed;
    p.amplitude = lossAmplitude;
    p.intensity = lossAmplitude * lossAmplitude;
    p.currentMedium = targetMedium;
    p.color = targetMat.color;

    if (interaction.intensityReflectionCoeff > 0.05 && p.amplitude > 0.1) {
      const reflParticle = this.getParticle();
      const reflected = reflect(p.vx / targetSpeed * speed, p.vy / targetSpeed * speed, collision.normalX, collision.normalY);
      const reflAmplitude = Math.sqrt(p.intensity * interaction.intensityReflectionCoeff);

      reflParticle.x = p.x;
      reflParticle.y = p.y;
      reflParticle.vx = reflected.x;
      reflParticle.vy = reflected.y;
      reflParticle.amplitude = reflAmplitude;
      reflParticle.intensity = reflAmplitude * reflAmplitude;
      reflParticle.frequency = p.frequency;
      reflParticle.age = p.age;
      reflParticle.maxAge = p.maxAge;
      reflParticle.color = p.color;
      reflParticle.bounceCount = p.bounceCount + 1;
      reflParticle.sourceType = p.sourceType;
      reflParticle.trail = [...p.trail];
      reflParticle.currentMedium = p.currentMedium;
      reflParticle.baseSpeed = p.baseSpeed;
      reflParticle.phase = p.phase;
      reflParticle.wavelength = p.wavelength;

      newParticles.push(reflParticle);
    }
  }

  private createEchoParticle(
    p: WaveParticle,
    collision: CollisionResult,
    echoIndex: number
  ): WaveParticle | null {
    const matProps = MATERIAL_PROPERTIES[collision.cellType];
    if (echoIndex >= matProps.echoCount) return null;

    const echoParticle = this.getParticle();
    const spreadAngle = randomRange(-0.4, 0.4);
    const cos = Math.cos(spreadAngle);
    const sin = Math.sin(spreadAngle);
    const echoVx = p.vx * cos - p.vy * sin;
    const echoVy = p.vx * sin + p.vy * cos;

    const echoDecay = Math.pow(0.5, echoIndex + 1);
    const echoAmplitude = p.amplitude * echoDecay;

    echoParticle.x = p.x + echoVx * 0.02;
    echoParticle.y = p.y + echoVy * 0.02;
    echoParticle.vx = echoVx * 0.85;
    echoParticle.vy = echoVy * 0.85;
    echoParticle.amplitude = echoAmplitude;
    echoParticle.intensity = echoAmplitude * echoAmplitude;
    echoParticle.frequency = p.frequency;
    echoParticle.age = p.age;
    echoParticle.maxAge = p.maxAge - p.age + randomRange(0.3, 1.2);
    echoParticle.color = p.color;
    echoParticle.bounceCount = p.bounceCount + 1;
    echoParticle.sourceType = p.sourceType;
    echoParticle.trail = [];
    echoParticle.currentMedium = p.currentMedium;
    echoParticle.baseSpeed = p.baseSpeed;
    echoParticle.phase = p.phase;
    echoParticle.wavelength = p.wavelength;

    return echoParticle;
  }

  private processDiffraction(newParticles: WaveParticle[]): void {
    for (const source of this.diffractionSources) {
      const particleCount = Math.floor(5 * QUALITY_SETTINGS[this.quality].waveParticlesMultiplier);

      const mediumSpeed = this.getMediumSpeed(source.medium, source.baseSpeed);

      for (let i = 0; i < particleCount; i++) {
        const baseAngle = Math.atan2(source.normalY, source.normalX);
        const spread = (i / (particleCount - 1) - 0.5) * Math.PI * 0.9;
        const angle = baseAngle + spread;
        const speed = mediumSpeed * randomRange(0.85, 1.15);

        const diffractedParticle = this.getParticle();
        diffractedParticle.x = source.x + source.normalX * 4;
        diffractedParticle.y = source.y + source.normalY * 4;
        diffractedParticle.vx = Math.cos(angle) * speed;
        diffractedParticle.vy = Math.sin(angle) * speed;
        diffractedParticle.amplitude = source.amplitude * 0.35;
        diffractedParticle.intensity = diffractedParticle.amplitude * diffractedParticle.amplitude;
        diffractedParticle.frequency = source.frequency;
        diffractedParticle.age = source.age;
        diffractedParticle.maxAge = 1.8;
        diffractedParticle.color = source.color;
        diffractedParticle.bounceCount = 1;
        diffractedParticle.sourceType = 'knock';
        diffractedParticle.trail = [];
        diffractedParticle.currentMedium = source.medium;
        diffractedParticle.baseSpeed = source.baseSpeed;
        diffractedParticle.phase = 0;
        diffractedParticle.wavelength = speed / source.frequency;

        newParticles.push(diffractedParticle);
      }
    }
  }

  public clear(): void {
    this.particles.forEach(p => this.returnParticle(p));
    this.particles = [];
    this.diffractionSources = [];
  }
}

import type { WaveParticle, WaveType, CollisionResult, QualityLevel } from '../types/game';
import { WAVE_CONFIGS, MATERIAL_PROPERTIES, QUALITY_SETTINGS } from '../utils/materials';
import { TerrainSystem } from './TerrainSystem';
import { reflect, normalize, randomRange, clamp, refract, distance } from '../utils/math';

interface DiffractionSource {
  x: number;
  y: number;
  normalX: number;
  normalY: number;
  amplitude: number;
  frequency: number;
  color: string;
  age: number;
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
      frequency: 0,
      age: 0,
      maxAge: 0,
      color: '',
      bounced: false,
      sourceType: 'knock',
      trail: [],
      inWater: false,
      originalSpeed: 0,
    };
  }

  private returnParticle(particle: WaveParticle): void {
    particle.trail = [];
    this.particlePool.push(particle);
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
    const startInWater = startCell?.type === 'water';

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + randomRange(-0.05, 0.05);
      const baseSpeed = config.speed * randomRange(0.9, 1.1);
      const speed = startInWater ? baseSpeed * (MATERIAL_PROPERTIES.water.soundSpeedMultiplier || 0.7) : baseSpeed;
      const particle = this.getParticle();

      particle.x = worldX;
      particle.y = worldY;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.amplitude = config.amplitude * randomRange(0.8, 1.2);
      particle.frequency = config.frequency;
      particle.age = 0;
      particle.maxAge = config.maxAge;
      particle.color = config.color;
      particle.bounced = false;
      particle.sourceType = type;
      particle.trail = [];
      particle.inWater = startInWater;
      particle.originalSpeed = baseSpeed;

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

      if (p.trail.length > 5) {
        p.trail.shift();
      }
      p.trail.push({ x: prevX, y: prevY, age: p.age - deltaTime });

      const collision = this.terrainSystem.checkWaveCollision(p.x, p.y, prevX, prevY);

      if (collision.collided) {
        this.handleCollision(p, collision, prevX, prevY, newParticles);
      }

      const cellSize = this.terrainSystem.getCellSize();
      const revealRadius = 20 + p.amplitude * 30;
      this.terrainSystem.revealArea(p.x, p.y, revealRadius, p.amplitude * 0.3);

      if (this.onWaveHeard && !p.bounced) {
        this.onWaveHeard(p.x, p.y, p.amplitude * 0.5, p.sourceType);
      }

      const decayRate = this.terrainSystem.getCellAtWorldPos(p.x, p.y)
        ? MATERIAL_PROPERTIES[this.terrainSystem.getCellAtWorldPos(p.x, p.y)!.type].decayRate
        : 0.01;
      p.amplitude -= decayRate * deltaTime * 60;

      if (p.age >= p.maxAge || p.amplitude <= 0.01) {
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

  private handleCollision(
    p: WaveParticle,
    collision: CollisionResult,
    prevX: number,
    prevY: number,
    newParticles: WaveParticle[]
  ): void {
    const materialProps = MATERIAL_PROPERTIES[collision.cellType];

    p.x = prevX;
    p.y = prevY;

    if (collision.cellType === 'water' && materialProps.refractiveIndex !== undefined && materialProps.transmission !== undefined) {
      this.handleWaterRefraction(p, collision, newParticles);
      return;
    }

    const enteringWater = !p.inWater && collision.cellType === 'water';
    const exitingWater = p.inWater && collision.cellType !== 'water';

    if (enteringWater && materialProps.refractiveIndex !== undefined && materialProps.transmission !== undefined) {
      this.handleWaterRefraction(p, collision, newParticles);
      return;
    }

    if (exitingWater) {
      const airProps = MATERIAL_PROPERTIES.empty;
      const n2 = 1 / (MATERIAL_PROPERTIES.water.refractiveIndex || 0.7);
      const speedMult = 1 / (MATERIAL_PROPERTIES.water.soundSpeedMultiplier || 0.7);

      const reflected = reflect(p.vx, p.vy, collision.normalX, collision.normalY);
      const refracted = refract(p.vx, p.vy, collision.normalX, collision.normalY, n2);

      if (refracted.totalReflection) {
        p.vx = reflected.x;
        p.vy = reflected.y;
        p.amplitude *= 0.9;
      } else {
        const transmission = 0.7;
        const reflection = 0.3;

        p.vx = refracted.x * speedMult;
        p.vy = refracted.y * speedMult;
        p.amplitude *= transmission;
        p.inWater = false;
        p.color = '#1e90ff';

        if (p.amplitude > 0.15 && reflection > 0.1) {
          const reflectedParticle = this.getParticle();
          reflectedParticle.x = p.x;
          reflectedParticle.y = p.y;
          reflectedParticle.vx = reflected.x;
          reflectedParticle.vy = reflected.y;
          reflectedParticle.amplitude = p.amplitude * reflection / transmission;
          reflectedParticle.frequency = p.frequency;
          reflectedParticle.age = p.age;
          reflectedParticle.maxAge = p.maxAge;
          reflectedParticle.color = '#1e90ff';
          reflectedParticle.bounced = true;
          reflectedParticle.sourceType = p.sourceType;
          reflectedParticle.trail = [];
          reflectedParticle.inWater = true;
          reflectedParticle.originalSpeed = p.originalSpeed;
          newParticles.push(reflectedParticle);
        }
      }

      p.bounced = true;
      p.amplitude = clamp(p.amplitude, 0, 1);

      if (this.onReflection && p.amplitude > 0.1) {
        this.onReflection('water', p.x, p.y, p.amplitude);
      }
      return;
    }

    const reflected = reflect(p.vx, p.vy, collision.normalX, collision.normalY);

    p.vx = reflected.x * materialProps.reflectivity;
    p.vy = reflected.y * materialProps.reflectivity;

    p.amplitude *= materialProps.reflectivity;
    p.amplitude -= materialProps.absorption;

    if (!p.bounced) {
      p.color = materialProps.color;
    }
    p.bounced = true;

    if (this.onReflection && p.amplitude > 0.1) {
      this.onReflection(collision.cellType, p.x, p.y, p.amplitude);
    }

    if (materialProps.diffraction > 0 && Math.random() < materialProps.diffraction * 0.3) {
      this.diffractionSources.push({
        x: p.x,
        y: p.y,
        normalX: collision.normalX,
        normalY: collision.normalY,
        amplitude: p.amplitude * materialProps.diffraction,
        frequency: p.frequency,
        color: p.color,
        age: p.age,
      });
    }

    if (materialProps.echoCount > 0 && p.amplitude > 0.3) {
      for (let e = 0; e < Math.min(materialProps.echoCount, 2); e++) {
        const echoParticle = this.getParticle();
        const spreadAngle = randomRange(-0.5, 0.5);
        const cos = Math.cos(spreadAngle);
        const sin = Math.sin(spreadAngle);
        const echoVx = p.vx * cos - p.vy * sin;
        const echoVy = p.vx * sin + p.vy * cos;

        echoParticle.x = p.x;
        echoParticle.y = p.y;
        echoParticle.vx = echoVx * 0.8;
        echoParticle.vy = echoVy * 0.8;
        echoParticle.amplitude = p.amplitude * 0.5;
        echoParticle.frequency = p.frequency;
        echoParticle.age = p.age;
        echoParticle.maxAge = p.maxAge - p.age + randomRange(0.5, 1.5);
        echoParticle.color = p.color;
        echoParticle.bounced = true;
        echoParticle.sourceType = p.sourceType;
        echoParticle.trail = [];
        echoParticle.inWater = p.inWater;
        echoParticle.originalSpeed = p.originalSpeed;

        newParticles.push(echoParticle);
      }
    }

    p.amplitude = clamp(p.amplitude, 0, 1);
  }

  private handleWaterRefraction(
    p: WaveParticle,
    collision: CollisionResult,
    newParticles: WaveParticle[]
  ): void {
    const waterProps = MATERIAL_PROPERTIES.water;
    const n = waterProps.refractiveIndex || 0.7;
    const transmission = waterProps.transmission || 0.7;
    const reflection = 1 - transmission;
    const speedMult = waterProps.soundSpeedMultiplier || 0.7;

    const reflected = reflect(p.vx, p.vy, collision.normalX, collision.normalY);
    const refracted = refract(p.vx, p.vy, collision.normalX, collision.normalY, n);

    if (refracted.totalReflection) {
      p.vx = reflected.x * waterProps.reflectivity;
      p.vy = reflected.y * waterProps.reflectivity;
      p.amplitude *= waterProps.reflectivity;
      p.color = waterProps.color;
      p.bounced = true;
    } else {
      p.vx = refracted.x * speedMult;
      p.vy = refracted.y * speedMult;
      p.amplitude *= transmission;
      p.inWater = true;
      p.color = waterProps.color;
      p.bounced = true;

      if (p.amplitude > 0.15 && reflection > 0.1) {
        const reflectedParticle = this.getParticle();
        reflectedParticle.x = p.x;
        reflectedParticle.y = p.y;
        reflectedParticle.vx = reflected.x;
        reflectedParticle.vy = reflected.y;
        reflectedParticle.amplitude = p.amplitude * reflection / transmission;
        reflectedParticle.frequency = p.frequency;
        reflectedParticle.age = p.age;
        reflectedParticle.maxAge = p.maxAge;
        reflectedParticle.color = waterProps.color;
        reflectedParticle.bounced = true;
        reflectedParticle.sourceType = p.sourceType;
        reflectedParticle.trail = [];
        reflectedParticle.inWater = false;
        reflectedParticle.originalSpeed = p.originalSpeed;
        newParticles.push(reflectedParticle);
      }
    }

    if (this.onReflection && p.amplitude > 0.1) {
      this.onReflection('water', p.x, p.y, p.amplitude);
    }

    p.amplitude = clamp(p.amplitude, 0, 1);
  }

  private processDiffraction(newParticles: WaveParticle[]): void {
    for (const source of this.diffractionSources) {
      const particleCount = Math.floor(4 * QUALITY_SETTINGS[this.quality].waveParticlesMultiplier);

      for (let i = 0; i < particleCount; i++) {
        const baseAngle = Math.atan2(source.normalY, source.normalX);
        const spread = (i / (particleCount - 1) - 0.5) * Math.PI * 0.8;
        const angle = baseAngle + spread;
        const baseSpeed = 150 * randomRange(0.8, 1.2);

        const sourceCell = this.terrainSystem.getCellAtWorldPos(source.x, source.y);
        const inWater = sourceCell?.type === 'water';
        const speed = inWater ? baseSpeed * (MATERIAL_PROPERTIES.water.soundSpeedMultiplier || 0.7) : baseSpeed;

        const diffractedParticle = this.getParticle();
        diffractedParticle.x = source.x + source.normalX * 5;
        diffractedParticle.y = source.y + source.normalY * 5;
        diffractedParticle.vx = Math.cos(angle) * speed;
        diffractedParticle.vy = Math.sin(angle) * speed;
        diffractedParticle.amplitude = source.amplitude * 0.4;
        diffractedParticle.frequency = source.frequency;
        diffractedParticle.age = source.age;
        diffractedParticle.maxAge = 2;
        diffractedParticle.color = source.color;
        diffractedParticle.bounced = true;
        diffractedParticle.sourceType = 'knock';
        diffractedParticle.trail = [];
        diffractedParticle.inWater = inWater;
        diffractedParticle.originalSpeed = baseSpeed;

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

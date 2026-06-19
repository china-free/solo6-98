import type { WaveType } from '../types/game';

export class AudioSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private listener: AudioListener | null = null;
  private volume: number = 0.7;
  private enabled: boolean = true;
  private reverbBuffer: AudioBuffer | null = null;

  constructor() {
    this.initializeAudioContext();
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);
      this.listener = this.audioContext.listener;

      const listener = this.listener as AudioListener;
      if ('forwardX' in listener && listener.forwardX) {
        listener.forwardX.value = 0;
        listener.forwardY.value = 0;
        listener.forwardZ.value = -1;
        listener.upX.value = 0;
        listener.upY.value = 1;
        listener.upZ.value = 0;
      }

      await this.generateReverbImpulse();
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.enabled = false;
    }
  }

  public updateListenerPosition(x: number, y: number): void {
    if (!this.listener || !this.audioContext) return;

    const worldScale = 0.01;
    const listener = this.listener as AudioListener;

    if ('positionX' in listener && listener.positionX) {
      listener.positionX.setValueAtTime(x * worldScale, this.audioContext.currentTime);
      listener.positionY.setValueAtTime(-y * worldScale, this.audioContext.currentTime);
      listener.positionZ.setValueAtTime(0, this.audioContext.currentTime);
    }
  }

  private createPanner(x: number, y: number, distanceModel: DistanceModelType = 'inverse'): PannerNode {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const panner = this.audioContext.createPanner();
    const worldScale = 0.01;

    panner.panningModel = 'HRTF';
    panner.distanceModel = distanceModel;
    panner.refDistance = 0.5;
    panner.maxDistance = 50;
    panner.rolloffFactor = distanceModel === 'inverse' ? 1 : 0.5;

    const pannerNode = panner as PannerNode;
    if ('positionX' in pannerNode && pannerNode.positionX) {
      pannerNode.positionX.setValueAtTime(x * worldScale, this.audioContext.currentTime);
      pannerNode.positionY.setValueAtTime(-y * worldScale, this.audioContext.currentTime);
      pannerNode.positionZ.setValueAtTime(0, this.audioContext.currentTime);
    }

    return panner;
  }

  private async generateReverbImpulse(): Promise<void> {
    if (!this.audioContext) return;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 3;
    const length = sampleRate * duration;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const decay = Math.exp(-t * 2.5);
        channelData[i] = (Math.random() * 2 - 1) * decay * 0.5;
      }
    }

    this.reverbBuffer = impulse;
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public playWaveSound(type: WaveType, sourceX: number, sourceY: number, listenerX: number, listenerY: number): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const baseFreq = type === 'knock' ? 80 : 1200;
    const duration = type === 'knock' ? 0.3 : 0.15;
    const volume = type === 'knock' ? 0.5 : 0.3;
    const dist = Math.sqrt((sourceX - listenerX) ** 2 + (sourceY - listenerY) ** 2);
    const distanceFactor = Math.max(0.1, 1 - dist / 1000);

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    const panner = this.createPanner(sourceX, sourceY, 'inverse');
    const convolver = this.audioContext.createConvolver();
    const reverbGain = this.audioContext.createGain();

    osc.type = type === 'knock' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
    if (type === 'knock') {
      osc.frequency.exponentialRampToValueAtTime(
        baseFreq * 0.5,
        this.audioContext.currentTime + duration
      );
    }

    filter.type = 'lowpass';
    filter.frequency.value = type === 'knock' ? 500 : 3000;
    filter.frequency.exponentialRampToValueAtTime(
      filter.frequency.value * distanceFactor,
      this.audioContext.currentTime + duration
    );

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + duration
    );

    reverbGain.gain.value = 0.3 * distanceFactor;

    if (this.reverbBuffer) {
      convolver.buffer = this.reverbBuffer;
    }

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.masterGain);

    filter.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  public playReflectionSound(materialType: string, sourceX: number, sourceY: number, listenerX: number, listenerY: number, amplitude: number): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const volume = 0.15 * amplitude;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const panner = this.createPanner(sourceX, sourceY, 'linear');
    const filter = this.audioContext.createBiquadFilter();

    let freq = 200;
    let duration = 0.1;
    let type: OscillatorType = 'sine';
    let filterFreq = 2000;

    switch (materialType) {
      case 'wall':
        freq = 300;
        duration = 0.15;
        type = 'triangle';
        filterFreq = 1500;
        break;
      case 'metal':
        freq = 800;
        duration = 0.4;
        type = 'sine';
        filterFreq = 4000;
        break;
      case 'water':
        freq = 150;
        duration = 0.25;
        type = 'sine';
        filterFreq = 800;
        break;
      case 'mud':
        freq = 100;
        duration = 0.12;
        type = 'sine';
        filterFreq = 500;
        break;
      case 'artifact':
        freq = 600;
        duration = 0.3;
        type = 'sine';
        filterFreq = 3000;
        break;
      case 'exit':
        freq = 500;
        duration = 0.5;
        type = 'sine';
        filterFreq = 2500;
        break;
    }

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, this.audioContext.currentTime + duration);

    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + duration
    );

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  public playMonsterSound(state: string, sourceX: number, sourceY: number, listenerX: number, listenerY: number): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const volume = state === 'chase' ? 0.4 : state === 'alert' ? 0.2 : 0.1;
    const duration = state === 'chase' ? 0.2 : 0.15;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    const panner = this.createPanner(sourceX, sourceY, 'inverse');

    osc.type = 'sawtooth';
    const baseFreq = state === 'chase' ? 120 : 80;
    osc.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(
      baseFreq * 1.5,
      this.audioContext.currentTime + duration
    );

    filter.type = 'lowpass';
    filter.frequency.value = 500;

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + duration
    );

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  public playVictorySound(): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      const startTime = this.audioContext!.currentTime + i * 0.15;

      osc.type = 'sine';
      osc.frequency.value = freq;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  public playGameOverSound(): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const notes = [440, 349.23, 293.66, 220];
    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      const startTime = this.audioContext!.currentTime + i * 0.2;

      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });
  }

  public playArtifactSound(): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const osc2 = this.audioContext.createOscillator();

    osc.type = 'sine';
    osc.frequency.value = 880;
    osc2.type = 'sine';
    osc2.frequency.value = 1320;

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);

    osc.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start();
    osc2.start();
    osc.stop(this.audioContext.currentTime + 0.4);
    osc2.stop(this.audioContext.currentTime + 0.4);
  }
}

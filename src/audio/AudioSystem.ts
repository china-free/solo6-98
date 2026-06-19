import type { WaveType } from '../types/game';

export class AudioSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
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

      await this.generateReverbImpulse();
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.enabled = false;
    }
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

  public playWaveSound(type: WaveType, distance: number = 0): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const baseFreq = type === 'knock' ? 80 : 1200;
    const duration = type === 'knock' ? 0.3 : 0.15;
    const volume = type === 'knock' ? 0.5 : 0.3;
    const distanceFactor = Math.max(0.1, 1 - distance / 1000);

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
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

    gainNode.gain.setValueAtTime(volume * distanceFactor, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + duration
    );

    reverbGain.gain.value = 0.3;

    if (this.reverbBuffer) {
      convolver.buffer = this.reverbBuffer;
    }

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    filter.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  public playReflectionSound(materialType: string, distance: number): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const volume = 0.15;
    const distanceFactor = Math.max(0.1, 1 - distance / 800);

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    let freq = 200;
    let duration = 0.1;
    let type: OscillatorType = 'sine';

    switch (materialType) {
      case 'wall':
        freq = 300;
        duration = 0.15;
        type = 'triangle';
        break;
      case 'metal':
        freq = 800;
        duration = 0.4;
        type = 'sine';
        break;
      case 'water':
        freq = 150;
        duration = 0.2;
        type = 'sine';
        break;
      case 'mud':
        freq = 100;
        duration = 0.1;
        type = 'sine';
        break;
      case 'artifact':
        freq = 600;
        duration = 0.3;
        type = 'sine';
        break;
      case 'exit':
        freq = 500;
        duration = 0.5;
        type = 'sine';
        break;
    }

    osc.type = type;
    osc.frequency.value = freq;

    gainNode.gain.setValueAtTime(volume * distanceFactor, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + duration
    );

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  public playMonsterSound(state: string, distance: number): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;

    const distanceFactor = Math.max(0.1, 1 - distance / 500);
    const volume = state === 'chase' ? 0.4 : state === 'alert' ? 0.2 : 0.1;
    const duration = state === 'chase' ? 0.2 : 0.15;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = 'sawtooth';
    const baseFreq = state === 'chase' ? 120 : 80;
    osc.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(
      baseFreq * 1.5,
      this.audioContext.currentTime + duration
    );

    filter.type = 'lowpass';
    filter.frequency.value = 500;

    gainNode.gain.setValueAtTime(volume * distanceFactor, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + duration
    );

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

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

/**
 * Sound & Music Manager for Matthew Clicker.
 * Uses downloaded MP3 tracks for background music:
 * - Normal gameplay: ./audio/chill_bgm.mp3 (Chill Wave)
 * - Matthew Storm Live Event: ./audio/storm_techno.mp3 (Crazy Epic Techno)
 * Plus low-latency Web Audio API procedural SFX for clicks, crits, and unlocks.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private chillAudio: HTMLAudioElement | null = null;
  private stormAudio: HTMLAudioElement | null = null;
  private currentTrackMode: 'chill' | 'storm' = 'chill';

  private isMuted: boolean = false;
  private masterVolume: number = 0.8;
  private sfxVolume: number = 0.9;
  private musicVolume: number = 0.45;
  private isMusicPlaying: boolean = true;

  constructor() {
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      try {
        this.chillAudio = new Audio('./audio/chill_bgm.mp3');
        this.chillAudio.loop = true;
        this.chillAudio.preload = 'auto';

        this.stormAudio = new Audio('./audio/storm_techno.mp3');
        this.stormAudio.loop = true;
        this.stormAudio.preload = 'auto';

        this.syncAudioElementVolumes();

        const unlockAudio = () => {
          this.ensureMusicPlaying();
        };
        window.addEventListener('pointerdown', unlockAudio, { passive: true });
        window.addEventListener('keydown', unlockAudio, { passive: true });
      } catch {
        // Ignore in headless test environments
      }
    }
  }

  private syncAudioElementVolumes() {
    const effectiveVol =
      this.isMuted || !this.isMusicPlaying
        ? 0
        : Math.max(0, Math.min(1, this.masterVolume * this.musicVolume));
    if (this.chillAudio) {
      this.chillAudio.volume = effectiveVol;
    }
    if (this.stormAudio) {
      this.stormAudio.volume = effectiveVol;
    }
  }

  public ensureMusicPlaying() {
    if (typeof window === 'undefined' || !this.chillAudio || !this.stormAudio) return;
    this.syncAudioElementVolumes();

    if (!this.isMusicPlaying || this.isMuted) {
      this.chillAudio.pause();
      this.stormAudio.pause();
      return;
    }

    const active = this.currentTrackMode === 'storm' ? this.stormAudio : this.chillAudio;
    const inactive = this.currentTrackMode === 'storm' ? this.chillAudio : this.stormAudio;

    if (!inactive.paused) {
      inactive.pause();
      inactive.currentTime = 0;
    }

    if (active.paused) {
      active.play().catch(() => {
        // Autoplay blocked until next user gesture
      });
    }
  }

  public setMusicTrack(mode: 'chill' | 'storm') {
    if (this.currentTrackMode === mode) {
      this.ensureMusicPlaying();
      return;
    }
    this.currentTrackMode = mode;
    this.ensureMusicPlaying();
  }

  private initContext() {
    this.ensureMusicPlaying();
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.ctx.currentTime
      );
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMasterVolume(val: number) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.ctx.currentTime
      );
    }
    this.syncAudioElementVolumes();
  }

  public setSfxVolume(val: number) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  public setMusicVolume(val: number) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    this.syncAudioElementVolumes();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.ctx.currentTime
      );
    }
    this.ensureMusicPlaying();
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getSettings() {
    return {
      masterVolume: this.masterVolume,
      sfxVolume: this.sfxVolume,
      musicVolume: this.musicVolume,
      isMuted: this.isMuted,
      isMusicPlaying: this.isMusicPlaying,
    };
  }

  // --- SOUND EFFECTS ---

  public playClick(combo = 1) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const pitchJitter = 0.95 + Math.random() * 0.1;
    const baseFreq = (300 + Math.min(combo * 15, 300)) * pitchJitter;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  public playCrit() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(580, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1100, this.ctx.currentTime + 0.18);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1600, this.ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.22);
    osc2.stop(this.ctx.currentTime + 0.22);
  }

  public playBuy() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const startTime = this.ctx.currentTime + idx * 0.05;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  }

  public playSkinUnlock() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.6);
    });
  }

  public playPrestige() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 1.2);

    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 1.4);
  }

  public playGoldenSpawn() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    [1000, 1200, 1500, 2000].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const t = this.ctx.currentTime + i * 0.08;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  public playThunder() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(28, this.ctx.currentTime + 0.9);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.95);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.95);
  }

  public playCountdownTick(secondsLeft: number) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq = 320 + (10 - Math.min(10, secondsLeft)) * 55;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  public playStormWaveStart() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    [220, 330, 440, 660, 880].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = this.ctx.currentTime + idx * 0.07;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  public playGiantHit() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(180 + Math.random() * 80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(65, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  public toggleMusic(): boolean {
    this.isMusicPlaying = !this.isMusicPlaying;
    this.ensureMusicPlaying();
    return this.isMusicPlaying;
  }

  public startMusic() {
    this.isMusicPlaying = true;
    this.ensureMusicPlaying();
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    this.ensureMusicPlaying();
  }
}

export const soundManager = new SoundManager();

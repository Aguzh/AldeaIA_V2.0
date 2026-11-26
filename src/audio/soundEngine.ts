import type { SoundCue, WeatherType } from '../types/simulation';

export interface AmbienceProfile {
  active: boolean;
  noiseGain: number;
  filterFreq: number;
  filterQ: number;
  chirpMode: 'none' | 'birds' | 'crickets' | 'wind';
}

export function computeAmbienceProfile(
  weather: WeatherType,
  isNight: boolean,
  paused: boolean,
  hasLivingVillagers = true
): AmbienceProfile {
  if (paused || !hasLivingVillagers) {
    return {
      active: false,
      noiseGain: 0,
      filterFreq: 400,
      filterQ: 0.7,
      chirpMode: 'none',
    };
  }

  switch (weather) {
    case 'rain':
      return {
        active: true,
        noiseGain: 0.085,
        filterFreq: 1150,
        filterQ: 0.85,
        chirpMode: isNight ? 'crickets' : 'none',
      };
    case 'storm':
      return {
        active: true,
        noiseGain: 0.12,
        filterFreq: 840,
        filterQ: 1.0,
        chirpMode: 'wind',
      };
    case 'thunderstorm':
      return {
        active: true,
        noiseGain: 0.145,
        filterFreq: 720,
        filterQ: 1.15,
        chirpMode: 'wind',
      };
    case 'drought':
      return {
        active: true,
        noiseGain: 0.055,
        filterFreq: 520,
        filterQ: 1.4,
        chirpMode: 'wind',
      };
    case 'sunny':
    default:
      return {
        active: true,
        noiseGain: isNight ? 0.022 : 0.03,
        filterFreq: isNight ? 340 : 480,
        filterQ: 0.7,
        chirpMode: isNight ? 'crickets' : 'birds',
      };
  }
}

const SOUND_ENABLED_KEY = 'aldea_ia_sound_enabled';
const SOUND_VOLUME_KEY = 'aldea_ia_sound_volume';

function readStoredBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch {
    // Ignore storage errors
  }
  return fallback;
}

function readStoredVolume(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) {
      const n = Number(raw);
      if (Number.isFinite(n)) return Math.max(0, Math.min(1, n));
    }
  } catch {
    // Ignore storage errors
  }
  return fallback;
}

class VillageSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private enabled = readStoredBool(SOUND_ENABLED_KEY, true);
  private volume = readStoredVolume(SOUND_VOLUME_KEY, 0.55);
  private lastProfile: AmbienceProfile = computeAmbienceProfile('sunny', false, true, false);
  private lastEventTimes: Record<SoundCue, number> = {
    chatter: 0,
    celebration: 0,
    sadness: 0,
    thunder: 0,
    build: 0,
  };
  private chirpTimer: number | null = null;

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }

  setEnabled(next: boolean): void {
    this.enabled = next;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SOUND_ENABLED_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
    }
    if (next) {
      this.ensureAudioGraph();
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
    }
    this.applyMasterGain();
  }

  setVolume(next: number): void {
    this.volume = Math.max(0, Math.min(1, Number.isFinite(next) ? next : 0.55));
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SOUND_VOLUME_KEY, String(this.volume));
      } catch {
        // Ignore storage errors
      }
    }
    this.applyMasterGain();
  }

  unlock(): void {
    if (!this.enabled) return;
    this.ensureAudioGraph();
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    this.applyMasterGain();
  }

  private ensureAudioGraph(): boolean {
    if (typeof window === 'undefined') return false;
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return false;

    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return false;
      }
    }

    const ctx = this.ctx;
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = this.enabled ? this.volume : 0;
      this.masterGain.connect(ctx.destination);
    }

    if (!this.noiseBuffer) {
      const length = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      // Pink-ish smoothed noise for pleasant wind & rainfall
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.95 * b2 + white * 0.048;
        data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.04) * 1.4));
      }
      this.noiseBuffer = buffer;
    }

    if (!this.noiseSource && this.noiseBuffer && this.masterGain) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = this.lastProfile.filterFreq;
      filter.Q.value = this.lastProfile.filterQ;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      src.start();

      this.noiseSource = src;
      this.noiseFilter = filter;
      this.noiseGain = gain;
    }

    if (this.chirpTimer === null && typeof window !== 'undefined') {
      this.chirpTimer = window.setInterval(() => {
        this.tickAmbientDetails();
      }, 2400);
    }

    return true;
  }

  private applyMasterGain(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const target = this.enabled ? this.volume : 0;
    this.masterGain.gain.setTargetAtTime(target, now, 0.08);
  }

  syncAmbience(params: {
    weather: WeatherType;
    isNight: boolean;
    paused: boolean;
    hasLivingVillagers: boolean;
  }): void {
    const profile = computeAmbienceProfile(
      params.weather,
      params.isNight,
      params.paused,
      params.hasLivingVillagers
    );
    this.lastProfile = profile;
    if (!this.ctx || !this.noiseGain || !this.noiseFilter) return;

    const now = this.ctx.currentTime;
    const targetNoise = this.enabled && profile.active ? profile.noiseGain : 0;
    this.noiseGain.gain.setTargetAtTime(targetNoise, now, 0.35);
    this.noiseFilter.frequency.setTargetAtTime(profile.filterFreq, now, 0.45);
    this.noiseFilter.Q.setTargetAtTime(profile.filterQ, now, 0.45);
  }

  private tickAmbientDetails(): void {
    if (!this.enabled || !this.lastProfile.active) return;
    if (!this.ctx || this.ctx.state !== 'running' || !this.masterGain) return;
    const mode = this.lastProfile.chirpMode;
    if (mode === 'none') return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (mode === 'birds' && Math.random() < 0.72) {
      const chirps = Math.random() < 0.5 ? 2 : 3;
      for (let i = 0; i < chirps; i++) {
        const t = now + i * 0.14;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        const baseF = 1850 + Math.random() * 650;
        osc.frequency.setValueAtTime(baseF, t);
        osc.frequency.exponentialRampToValueAtTime(baseF * 1.28, t + 0.06);
        osc.frequency.exponentialRampToValueAtTime(baseF * 0.94, t + 0.11);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.035, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.13);
      }
    } else if (mode === 'crickets' && Math.random() < 0.78) {
      for (let i = 0; i < 3; i++) {
        const t = now + i * 0.085;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(3850 + Math.random() * 240, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.018, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.06);
      }
    } else if (mode === 'wind' && this.noiseFilter && Math.random() < 0.65) {
      // Subtle wind gust sweep
      const peak = this.lastProfile.filterFreq * (1.22 + Math.random() * 0.3);
      this.noiseFilter.frequency.setTargetAtTime(peak, now, 0.5);
      this.noiseFilter.frequency.setTargetAtTime(this.lastProfile.filterFreq, now + 0.9, 0.7);
    }
  }

  playEvent(kind: SoundCue): void {
    if (!this.enabled) return;
    if (!this.ctx || this.ctx.state !== 'running' || !this.masterGain) return;

    const nowMs = Date.now();
    const cooldownMs: Record<SoundCue, number> = {
      chatter: 1600,
      celebration: 1100,
      sadness: 1100,
      thunder: 900,
      build: 900,
    };
    if (nowMs - this.lastEventTimes[kind] < cooldownMs[kind]) return;
    this.lastEventTimes[kind] = nowMs;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (kind === 'chatter') {
      // Warm syllabic murmur resembling villagers talking
      const syllables = 3 + Math.floor(Math.random() * 2);
      const basePitch = 195 + Math.random() * 115;
      for (let i = 0; i < syllables; i++) {
        const t = now + i * 0.095;
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const g = ctx.createGain();
        osc.type = 'triangle';
        const f = basePitch * (0.9 + Math.random() * 0.28);
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 1.12 : 0.9), t + 0.07);
        filter.type = 'bandpass';
        filter.frequency.value = 650 + Math.random() * 350;
        filter.Q.value = 2.2;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.065, t + 0.018);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
        osc.connect(filter);
        filter.connect(g);
        g.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.095);
      }
      return;
    }

    if (kind === 'celebration') {
      // Joyful rising harmonic triad chime
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.08;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
        osc.connect(g);
        g.connect(this.masterGain!);
        osc.start(t);
        osc.stop(t + 0.4);
      });
      return;
    }

    if (kind === 'sadness') {
      // Gentle descending melancholic minor motif
      const notes = [329.63, 293.66, 220.0];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.16;
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.96, t + 0.28);
        filter.type = 'lowpass';
        filter.frequency.value = 720;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.085, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
        osc.connect(filter);
        filter.connect(g);
        g.connect(this.masterGain!);
        osc.start(t);
        osc.stop(t + 0.45);
      });
      return;
    }

    if (kind === 'build') {
      // Warm rhythmic completion cadence
      const notes = [392.0, 523.25];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.09;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.075, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        osc.connect(g);
        g.connect(this.masterGain!);
        osc.start(t);
        osc.stop(t + 0.24);
      });
      return;
    }

    if (kind === 'thunder' && this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(240, now);
      filter.frequency.exponentialRampToValueAtTime(65, now + 1.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.32, now + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      src.start(now);
      src.stop(now + 1.55);
    }
  }
}

export const soundEngine = new VillageSoundEngine();

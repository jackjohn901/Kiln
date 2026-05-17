import type { CommunityBeat } from "./communityBeats";

// ── Frequency tables ──────────────────────────────────────────────────────────

export const BASS_FREQS  = [32.70, 36.71, 41.20, 43.65, 49.00, 55.00, 61.74, 65.41]; // C1–C2
export const BASS_NAMES  = ["C1","D1","E1","F1","G1","A1","B1","C2"];

export const CHORD_FREQS: [number, number, number][] = [
  [261.63, 329.63, 392.00], // C maj
  [349.23, 440.00, 523.25], // F maj
  [392.00, 493.88, 587.33], // G maj
  [220.00, 261.63, 329.63], // A min
  [293.66, 349.23, 440.00], // D min
  [329.63, 392.00, 493.88], // E min
  [261.63, 329.63, 466.16], // C 7
  [392.00, 493.88, 554.37], // G 7
];
export const CHORD_NAMES = ["Cmaj","Fmaj","Gmaj","Amin","Dmin","Emin","C7","G7"];

export const MELODY_FREQS = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
export const MELODY_NAMES = ["C4","D4","E4","G4","A4","C5","D5","E5","G5","A5"];

// ── Per-instrument synthesis ──────────────────────────────────────────────────

export function playKick(ctx: AudioContext, time: number, vol = 1) {
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.frequency.setValueAtTime(160, time);
  osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
  g.gain.setValueAtTime(1.3 * vol, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
  osc.start(time); osc.stop(time + 0.5);
}

export function playSnare(ctx: AudioContext, time: number, vol = 1) {
  const sz   = Math.ceil(ctx.sampleRate * 0.18);
  const buf  = ctx.createBuffer(1, sz, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < sz; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = buf;
  const filt  = ctx.createBiquadFilter(); filt.type = "highpass"; filt.frequency.value = 1000;
  const g     = ctx.createGain(); g.gain.setValueAtTime(0.85 * vol, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
  noise.connect(filt); filt.connect(g); g.connect(ctx.destination); noise.start(time); noise.stop(time + 0.2);

  const osc  = ctx.createOscillator(); const og = ctx.createGain();
  osc.frequency.value = 190;
  og.gain.setValueAtTime(0.6 * vol, time); og.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  osc.connect(og); og.connect(ctx.destination); osc.start(time); osc.stop(time + 0.08);
}

export function playClap(ctx: AudioContext, time: number, vol = 1) {
  [0, 0.01, 0.022].forEach((offset) => {
    const sz  = Math.ceil(ctx.sampleRate * 0.06);
    const buf = ctx.createBuffer(1, sz, ctx.sampleRate);
    const d   = buf.getChannelData(0); for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
    const n   = ctx.createBufferSource(); n.buffer = buf;
    const f   = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1200; f.Q.value = 0.7;
    const g   = ctx.createGain(); g.gain.setValueAtTime(0.7 * vol, time + offset); g.gain.exponentialRampToValueAtTime(0.001, time + offset + 0.06);
    n.connect(f); f.connect(g); g.connect(ctx.destination); n.start(time + offset); n.stop(time + offset + 0.06);
  });
}

export function playHiHat(ctx: AudioContext, time: number, open: boolean, vol = 1) {
  const dur  = open ? 0.38 : 0.045;
  const sz   = Math.ceil(ctx.sampleRate * dur);
  const buf  = ctx.createBuffer(1, sz, ctx.sampleRate);
  const d    = buf.getChannelData(0); for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
  const n    = ctx.createBufferSource(); n.buffer = buf;
  const f    = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 9500; f.Q.value = 0.4;
  const g    = ctx.createGain(); g.gain.setValueAtTime((open ? 0.45 : 0.38) * vol, time); g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  n.connect(f); f.connect(g); g.connect(ctx.destination); n.start(time); n.stop(time + dur);
}

export function playShaker(ctx: AudioContext, time: number, vol = 1) {
  const dur = 0.035;
  const sz  = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, sz, ctx.sampleRate);
  const d   = buf.getChannelData(0); for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
  const n   = ctx.createBufferSource(); n.buffer = buf;
  const f   = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 6000;
  const g   = ctx.createGain(); g.gain.setValueAtTime(0.3 * vol, time); g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  n.connect(f); f.connect(g); g.connect(ctx.destination); n.start(time); n.stop(time + dur);
}

export function playTom(ctx: AudioContext, time: number, vol = 1) {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.frequency.setValueAtTime(140, time);
  osc.frequency.exponentialRampToValueAtTime(50, time + 0.3);
  g.gain.setValueAtTime(0.9 * vol, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  osc.connect(g); g.connect(ctx.destination); osc.start(time); osc.stop(time + 0.3);
}

export function playBass(ctx: AudioContext, time: number, noteIdx: number, vol = 1) {
  const freq = BASS_FREQS[noteIdx % BASS_FREQS.length];
  const osc  = ctx.createOscillator(); const f = ctx.createBiquadFilter(); const g = ctx.createGain();
  osc.type = "sawtooth"; osc.frequency.value = freq;
  f.type = "lowpass"; f.frequency.setValueAtTime(800, time); f.frequency.exponentialRampToValueAtTime(200, time + 0.35);
  g.gain.setValueAtTime(0.55 * vol, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.38);
  osc.connect(f); f.connect(g); g.connect(ctx.destination); osc.start(time); osc.stop(time + 0.38);
}

export function playChord(ctx: AudioContext, time: number, chordIdx: number, vol = 1) {
  const freqs = CHORD_FREQS[chordIdx % CHORD_FREQS.length];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq * (1 + (i - 1) * 0.004);
    g.gain.setValueAtTime(0.18 * vol, time); g.gain.setValueAtTime(0.14 * vol, time + 0.05); g.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
    osc.connect(g); g.connect(ctx.destination); osc.start(time); osc.stop(time + 0.5);
  });
}

export function playMelody(ctx: AudioContext, time: number, noteIdx: number, vol = 1) {
  const freq = MELODY_FREQS[noteIdx % MELODY_FREQS.length];
  const osc  = ctx.createOscillator(); const g = ctx.createGain();
  osc.type = "triangle"; osc.frequency.value = freq;
  g.gain.setValueAtTime(0.32 * vol, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
  osc.connect(g); g.connect(ctx.destination); osc.start(time); osc.stop(time + 0.28);
}

// ── Dispatch a single step for a given track ─────────────────────────────────

export function triggerStep(
  ctx: AudioContext,
  trackIdx: number,
  stepIdx: number,
  beat: CommunityBeat,
  time: number,
) {
  const vol = beat.trackVolumes?.[trackIdx] ?? 1;
  if (beat.trackMutes?.[trackIdx]) return;
  switch (trackIdx) {
    case 0: playKick(ctx, time, vol); break;
    case 1: playSnare(ctx, time, vol); break;
    case 2: playClap(ctx, time, vol); break;
    case 3: playHiHat(ctx, time, false, vol); break;
    case 4: playHiHat(ctx, time, true,  vol); break;
    case 5: playShaker(ctx, time, vol); break;
    case 6: playTom(ctx, time, vol); break;
    case 7: playBass(ctx,   time, beat.bassNotes?.[stepIdx]   ?? 0, vol); break;
    case 8: playChord(ctx,  time, beat.chordNotes?.[stepIdx]  ?? 0, vol); break;
    case 9: playMelody(ctx, time, beat.melodyNotes?.[stepIdx] ?? (stepIdx % MELODY_FREQS.length), vol); break;
  }
}

// ── Beat looper (used by Feed when a post has a community beat) ──────────────

export function createBeatLooper(
  beat: CommunityBeat,
  opts: { onStep?: (step: number) => void } = {},
): { stop: () => void } {
  const ctx   = new AudioContext();
  const steps = beat.pattern[0]?.length ?? 16;
  const stepDur  = 60 / beat.bpm / 4;
  const swing    = beat.swing ?? 0;

  let step     = 0;
  let nextTime = ctx.currentTime + 0.05;
  const uiTimers: ReturnType<typeof setTimeout>[] = [];

  function schedule() {
    while (nextTime < ctx.currentTime + 0.15) {
      const swingOffset = step % 2 === 1 ? swing * stepDur : 0;
      const t = nextTime + swingOffset;
      beat.pattern.forEach((row, ti) => {
        if (row[step]) triggerStep(ctx, ti, step, beat, t);
      });
      if (opts.onStep) {
        const delay = Math.max(0, (nextTime - ctx.currentTime) * 1000);
        uiTimers.push(setTimeout(() => opts.onStep!(step), delay));
      }
      nextTime += stepDur;
      step = (step + 1) % steps;
    }
  }

  const interval = window.setInterval(schedule, 25);

  return {
    stop() {
      clearInterval(interval);
      uiTimers.forEach(clearTimeout);
      ctx.close().catch(() => {});
    },
  };
}

// ── WAV encoder ───────────────────────────────────────────────────────────────

export function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const len    = samples.length;
  const buffer = new ArrayBuffer(44 + len * 2);
  const view   = new DataView(buffer);
  const ws     = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  const wu32   = (off: number, v: number) => view.setUint32(off, v, true);
  const wu16   = (off: number, v: number) => view.setUint16(off, v, true);
  ws(0, "RIFF"); wu32(4, 36 + len * 2); ws(8, "WAVE");
  ws(12, "fmt "); wu32(16, 16); wu16(20, 1); wu16(22, 1);
  wu32(24, sampleRate); wu32(28, sampleRate * 2); wu16(32, 2); wu16(34, 16);
  ws(36, "data"); wu32(40, len * 2);
  for (let i = 0; i < len; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7FFF, true);
  return new Blob([buffer], { type: "audio/wav" });
}

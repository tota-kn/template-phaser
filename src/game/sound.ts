// 音素材なしで鳴らす簡単な効果音。段階の切り替わりや不発を耳で知らせる用途。

export class Beeper {
  private ctx: AudioContext | null = null;

  /** ユーザー操作の中で一度呼んで有効化する（ブラウザの自動再生制限対策） */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
    } catch {
      this.ctx = null;
    }
  }

  tone(freq: number, durationMs: number, type: OscillatorType = "square", volume = 0.06, slideTo?: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + durationMs / 1000);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + durationMs / 1000 + 0.02);
  }

  noise(durationMs: number, volume = 0.08): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const len = Math.floor((ctx.sampleRate * durationMs) / 1000);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.buffer = buf;
    src.connect(gain).connect(ctx.destination);
    src.start();
  }
}

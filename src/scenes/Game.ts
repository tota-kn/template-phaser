import { Scene } from "phaser";
import { CHARGE, PHYS, VIEW, chargeLevel } from "../game/config";
import { LEVELS, type SurfaceKind } from "../game/levels";
import { Beeper } from "../game/sound";
import { World } from "../game/world";

const SURFACE_COLORS: Record<SurfaceKind, { fill: number; stroke: number }> = {
  normal: { fill: 0x37474f, stroke: 0x90a4ae },
  ice: { fill: 0x0277bd, stroke: 0x81d4fa },
  sticky: { fill: 0x6a1b9a, stroke: 0xce93d8 },
  bouncy: { fill: 0xf9a825, stroke: 0xfff59d },
};

const PLAYER_COLOR = 0x4fc3f7;
const STOCK_COLOR = 0xff9800;

type ChargeSource = "key" | "pointer";

interface Records {
  time?: number;
  energy?: number;
}

const FONT = "'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif";

export class Game extends Scene {
  private levelIndex = 0;
  private world!: World;
  private gfx!: Phaser.GameObjects.Graphics;
  private emitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private hud!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private beeper = new Beeper();
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  private dir = { x: 0, y: -1 };
  private charging = false;
  private chargeSource: ChargeSource = "key";
  private chargeStart = 0;
  private chargeStartedGrounded = false;
  private shownLevel = 0;
  private trail: { x: number; y: number }[] = [];
  private resetting = false;
  private records: Records[] = LEVELS.map(() => ({}));

  constructor() {
    super("Game");
  }

  create(): void {
    this.gfx = this.add.graphics();

    const tex = this.make.graphics({ x: 0, y: 0 }, false);
    tex.fillStyle(0xffffff);
    tex.fillCircle(6, 6, 6);
    tex.generateTexture("particle", 12, 12);
    tex.destroy();
    this.emitter = this.add.particles(0, 0, "particle", {
      speed: { min: 120, max: 420 },
      scale: { start: 1, end: 0 },
      lifespan: { min: 300, max: 700 },
      gravityY: 900,
      emitting: false,
    });

    this.hud = this.add.text(30, 24, "", { fontFamily: FONT, fontSize: "30px", color: "#eceff1", lineSpacing: 6 });
    this.hint = this.add
      .text(1110, 30, "", {
        fontFamily: FONT,
        fontSize: "26px",
        color: "#b0bec5",
        align: "left",
        lineSpacing: 6,
        wordWrap: { width: 760, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0);
    this.banner = this.add
      .text(VIEW.width / 2, VIEW.height / 2 - 120, "", {
        fontFamily: FONT,
        fontSize: "56px",
        color: "#ffffff",
        align: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: { x: 40, y: 24 },
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false);

    this.add
      .text(VIEW.width - 30, 130, "移動: 方向キー/WASD  溜め: Space/Z 長押し  やり直し: R  部屋切替: N/P\nマウス・タッチ: 押している間溜める、指の方向へ飛ぶ", {
        fontFamily: FONT,
        fontSize: "20px",
        color: "#78909c",
        align: "right",
      })
      .setOrigin(1, 0)
      .setVisible(this.sys.game.device.os.desktop);

    this.setupButtons();
    this.setupInput();
    this.loadRecords();
    this.loadLevel(0);
  }

  // ---------- 入力 ----------

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,Z,R,N,P,ENTER") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    for (const name of ["SPACE", "Z"]) {
      this.keys[name].on("down", () => this.startCharge("key"));
      this.keys[name].on("up", () => {
        if (this.chargeSource === "key") this.release();
      });
    }
    this.keys.ENTER.on("down", () => {
      if (this.world.cleared) this.loadLevel(this.levelIndex + 1);
    });
    this.keys.R.on("down", () => this.loadLevel(this.levelIndex));
    this.keys.N.on("down", () => this.loadLevel(this.levelIndex + 1));
    this.keys.P.on("down", () => this.loadLevel(this.levelIndex - 1));

    this.input.addPointer(1);
    this.input.on("pointerdown", (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0) return;
      this.startCharge("pointer");
    });
    this.input.on("pointerup", () => {
      if (this.chargeSource === "pointer") this.release();
    });
  }

  private startCharge(source: ChargeSource): void {
    this.beeper.unlock();
    if (this.world.cleared) {
      this.loadLevel(this.levelIndex + 1);
      return;
    }
    if (this.charging) return;
    this.charging = true;
    this.chargeSource = source;
    this.chargeStart = this.time.now;
    // 溜め開始時点で地上なら、溜め中に地上を離れても撃てる
    this.chargeStartedGrounded = this.world.isGroundedish();
    this.shownLevel = 0;
  }

  private release(): void {
    if (!this.charging) return;
    this.charging = false;
    const level = chargeLevel(this.time.now - this.chargeStart);
    this.world.fire(level, this.dir.x, this.dir.y, this.chargeStartedGrounded);
  }

  private updateDirection(): void {
    const p = this.world.player;
    if (this.charging && this.chargeSource === "pointer") {
      const ptr = this.input.activePointer;
      const dx = ptr.worldX - p.x;
      const dy = ptr.worldY - p.y;
      if (Math.hypot(dx, dy) > 10) this.dir = snap8(dx, dy);
      return;
    }
    const k = this.keys;
    const dx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    const dy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    if (dx !== 0 || dy !== 0) this.dir = { x: dx, y: dy };
  }

  // ---------- 進行 ----------

  private loadLevel(index: number): void {
    const n = LEVELS.length;
    this.levelIndex = ((index % n) + n) % n;
    this.world = new World(LEVELS[this.levelIndex]);
    this.charging = false;
    this.trail = [];
    this.resetting = false;
    this.dir = { x: 0, y: -1 };
    this.banner.setVisible(false);
    this.hint.setText(LEVELS[this.levelIndex].hint);
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    this.updateDirection();

    if (this.charging) {
      const lv = chargeLevel(this.time.now - this.chargeStart);
      if (lv > this.shownLevel) {
        this.shownLevel = lv;
        this.beeper.tone(300 + lv * 180, 70, "square", 0.05);
      }
    }

    this.world.update(dt);
    this.handleEvents();

    const p = this.world.player;
    if (this.world.canBreak) {
      this.trail.push({ x: p.x, y: p.y });
      if (this.trail.length > 14) this.trail.shift();
    } else if (this.trail.length > 0) {
      this.trail.shift();
    }

    this.draw();
    this.updateHud();
  }

  private handleEvents(): void {
    for (const e of this.world.events) {
      switch (e.type) {
        case "fire":
          this.beeper.tone(220, 90, "triangle", 0.08, 520);
          break;
        case "misfire":
          this.beeper.tone(140, 120, "sawtooth", 0.05, 90);
          break;
        case "break":
        case "kill":
          this.burst(e.x, e.y, e.type === "kill" ? 0xef5350 : 0x8d6e63, 24);
          this.cameras.main.shake(120, 0.006);
          this.beeper.noise(160, 0.12);
          break;
        case "stock":
          this.burst(this.world.player.x, this.world.player.y, STOCK_COLOR, 14);
          this.beeper.tone(660, 80, "square", 0.05);
          this.time.delayedCall(80, () => this.beeper.tone(990, 120, "square", 0.05));
          break;
        case "collect":
          this.burst(e.x, e.y, 0xffd54f, 16);
          this.beeper.tone(880, 80, "sine", 0.08, 1320);
          break;
        case "shatter":
          this.burst(e.x, e.y, 0x9e9e9e, 16);
          this.beeper.noise(120, 0.06);
          this.beeper.tone(400, 160, "sawtooth", 0.04, 120);
          break;
        case "land":
          this.beeper.tone(110, 60, "triangle", 0.06);
          break;
        case "bounce":
          this.beeper.tone(500, 80, "sine", 0.07, 800);
          break;
        case "cannon":
          this.beeper.tone(180, 200, "square", 0.05, 360);
          break;
        case "clear":
          this.onClear();
          break;
        case "dead":
          if (!this.resetting) {
            this.resetting = true;
            this.beeper.tone(300, 300, "triangle", 0.06, 80);
            this.time.delayedCall(350, () => this.loadLevel(this.levelIndex));
          }
          break;
      }
    }
    this.world.events = [];
  }

  private onClear(): void {
    const w = this.world;
    const t = w.time / 1000;
    const rec = this.records[this.levelIndex];
    const newTime = rec.time === undefined || t < rec.time;
    const newEnergy = rec.energy === undefined || w.energy < rec.energy;
    if (newTime) rec.time = t;
    if (newEnergy) rec.energy = w.energy;
    this.saveRecords();
    this.charging = false;
    this.beeper.tone(523, 120, "square", 0.06);
    this.time.delayedCall(120, () => this.beeper.tone(659, 120, "square", 0.06));
    this.time.delayedCall(240, () => this.beeper.tone(784, 220, "square", 0.06));
    const got = w.collectibles.filter((c) => c.state === "got").length;
    this.banner
      .setText(
        `クリア！\n` +
          `タイム ${t.toFixed(2)}秒${newTime ? "（ベスト）" : ""}　` +
          `エネルギー ${w.energy}${newEnergy ? "（ベスト）" : ""}\n` +
          `コレクション ${got}/${w.collectibles.length}\n` +
          `Space / Enter / タップで次へ`,
      )
      .setVisible(true);
  }

  private burst(x: number, y: number, color: number, count: number): void {
    this.emitter.setParticleTint(color);
    this.emitter.emitParticleAt(x, y, count);
  }

  // ---------- 描画 ----------

  private draw(): void {
    const g = this.gfx;
    const w = this.world;
    const l = w.level;
    const p = w.player;
    const r = PHYS.radius;
    g.clear();

    // ゴール
    g.fillStyle(0x66bb6a, 0.18);
    g.fillRect(l.goal.x, l.goal.y, l.goal.w, l.goal.h);
    g.lineStyle(4, 0x66bb6a, 1);
    g.strokeRect(l.goal.x, l.goal.y, l.goal.w, l.goal.h);
    const fx = l.goal.x + l.goal.w / 2;
    g.lineBetween(fx, l.goal.y + l.goal.h, fx, l.goal.y + 10);
    g.fillStyle(0x66bb6a, 1);
    g.fillTriangle(fx, l.goal.y + 10, fx + 40, l.goal.y + 25, fx, l.goal.y + 40);

    // 地形
    for (const s of l.solids) {
      const c = SURFACE_COLORS[s.kind];
      g.fillStyle(c.fill, 1);
      g.fillPoints(s.points, true);
      g.lineStyle(6, c.stroke, 1);
      g.strokePoints(s.points, true);
    }

    // 固定大砲
    for (const c of l.cannons) {
      const len = Math.hypot(c.dirX, c.dirY) || 1;
      g.lineStyle(22, 0x90a4ae, 1);
      g.lineBetween(c.x, c.y, c.x + (c.dirX / len) * 56, c.y + (c.dirY / len) * 56);
      g.fillStyle(0x263238, 1);
      g.fillCircle(c.x, c.y, 32);
      g.lineStyle(4, 0x90a4ae, 1);
      g.strokeCircle(c.x, c.y, 32);
    }

    // 壊せるブロック
    for (const b of w.blocks) {
      if (!b.alive) continue;
      const { x, y, w: bw, h: bh } = b.rect;
      g.fillStyle(0x8d6e63, 1);
      g.fillRect(x, y, bw, bh);
      g.lineStyle(3, 0x4e342e, 1);
      g.strokeRect(x, y, bw, bh);
      g.lineBetween(x + bw * 0.2, y + bh * 0.3, x + bw * 0.55, y + bh * 0.5);
      g.lineBetween(x + bw * 0.55, y + bh * 0.5, x + bw * 0.4, y + bh * 0.8);
    }

    // 敵
    for (const e of w.enemies) {
      if (!e.alive) continue;
      const { y, w: ew, h: eh } = e.def;
      g.fillStyle(0xe53935, 1);
      g.fillRoundedRect(e.x, y, ew, eh, 12);
      g.fillStyle(0xffffff, 1);
      const eye = e.x + ew / 2 + e.dir * 12;
      g.fillCircle(eye - 10, y + 22, 7);
      g.fillCircle(eye + 10, y + 22, 7);
      g.fillStyle(0x000000, 1);
      g.fillCircle(eye - 10 + e.dir * 3, y + 22, 3);
      g.fillCircle(eye + 10 + e.dir * 3, y + 22, 3);
    }

    // コレクション
    for (const c of w.collectibles) {
      if (c.state !== "idle") continue;
      g.fillStyle(0xffd54f, 1);
      g.fillPoints([
        { x: c.x, y: c.y - 18 },
        { x: c.x + 13, y: c.y },
        { x: c.x, y: c.y + 18 },
        { x: c.x - 13, y: c.y },
      ], true);
    }

    // 壊せる速度のときの軌跡
    this.trail.forEach((t, i) => {
      g.fillStyle(0xffffff, (i + 1) / this.trail.length * 0.35);
      g.fillCircle(t.x, t.y, r * (0.4 + (0.6 * (i + 1)) / this.trail.length));
    });

    if (p.inCannon < 0) {
      // 本体：ストックがあると色が変わる
      const body = p.stock ? STOCK_COLOR : PLAYER_COLOR;
      g.fillStyle(body, 1);
      g.fillCircle(p.x, p.y, r);
      if (w.canBreak) {
        g.lineStyle(5, 0xffffff, 0.9);
        g.strokeCircle(p.x, p.y, r + 6);
      }
      // 0溜めの待ち時間中は中心を暗く
      g.fillStyle(w.zeroReady ? 0xffffff : 0x263238, w.zeroReady ? 0.9 : 1);
      g.fillCircle(p.x, p.y, 6);
    }

    // 方向の矢印（撃てない状態では暗く表示）
    const canFire = w.canFire(this.charging ? this.chargeStartedGrounded : false);
    const len = Math.hypot(this.dir.x, this.dir.y) || 1;
    const ux = this.dir.x / len;
    const uy = this.dir.y / len;
    const arrowColor = canFire ? 0xffffff : 0x546e7a;
    const a0 = r + 14;
    const a1 = r + 60;
    g.lineStyle(5, arrowColor, canFire ? 0.9 : 0.6);
    g.lineBetween(p.x + ux * a0, p.y + uy * a0, p.x + ux * a1, p.y + uy * a1);
    g.fillStyle(arrowColor, canFire ? 0.9 : 0.6);
    g.fillTriangle(
      p.x + ux * (a1 + 16), p.y + uy * (a1 + 16),
      p.x + ux * a1 - uy * 12, p.y + uy * a1 + ux * 12,
      p.x + ux * a1 + uy * 12, p.y + uy * a1 - ux * 12,
    );

    // 溜め表示：段階ごとに色が変わる輪と、次の段階までの進み具合
    if (this.charging) {
      const held = this.time.now - this.chargeStart;
      const lv = chargeLevel(held);
      const next = CHARGE.levelMs[lv + 1];
      const prev = CHARGE.levelMs[lv];
      const frac = next === undefined ? 1 : (held - prev) / (next - prev);
      g.lineStyle(8, CHARGE.colors[lv], 1);
      g.beginPath();
      g.arc(p.x, p.y, r + 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac), false);
      g.strokePath();
      for (let i = 1; i < CHARGE.levelMs.length; i++) {
        g.fillStyle(i <= lv ? CHARGE.colors[i] : 0x37474f, 1);
        g.fillCircle(p.x - 30 + (i - 1) * 30, p.y - r - 40, 8);
      }
    }
  }

  private updateHud(): void {
    const w = this.world;
    const rec = this.records[this.levelIndex];
    const got = w.collectibles.filter((c) => c.state === "got").length;
    const lv = this.charging ? CHARGE.names[chargeLevel(this.time.now - this.chargeStart)] : "-";
    this.hud.setText(
      `${w.level.name}\n` +
        `タイム ${(w.time / 1000).toFixed(2)}　エネルギー ${w.energy}　コレクション ${got}/${w.collectibles.length}\n` +
        `ベスト: タイム ${rec.time === undefined ? "-" : rec.time.toFixed(2)} / エネルギー ${rec.energy ?? "-"}\n` +
        `溜め ${lv}　空中ストック ${w.player.stock ? "あり" : "なし"}`,
    );
  }

  // ---------- ボタン・記録 ----------

  private setupButtons(): void {
    const style = {
      fontFamily: "Arial",
      fontSize: "64px",
      color: "#cfd8dc",
      backgroundColor: "rgba(255,255,255,0.12)",
      padding: { x: 16, y: 4 },
    };
    const fsBtn = this.add
      .text(VIEW.width - 30, 24, "⛶", style)
      .setOrigin(1, 0)
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        if (this.scale.isFullscreen) this.scale.stopFullscreen();
        else this.scale.startFullscreen();
      });
    this.add
      .text(VIEW.width - 150, 24, "↺", style)
      .setOrigin(1, 0)
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.loadLevel(this.levelIndex));
    this.add
      .text(VIEW.width - 270, 24, "»", style)
      .setOrigin(1, 0)
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.loadLevel(this.levelIndex + 1));

    this.scale.on("enterfullscreen", () => {
      fsBtn.setText("✕");
      (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.("landscape")?.catch?.(() => {});
      // モバイルブラウザはフルスクリーン遷移中にサイズが確定しないため、遅延して複数回リフレッシュする
      this.time.delayedCall(100, () => this.scale.refresh());
      this.time.delayedCall(300, () => this.scale.refresh());
      this.time.delayedCall(500, () => this.scale.refresh());
    });
    this.scale.on("leavefullscreen", () => {
      fsBtn.setText("⛶");
      screen.orientation?.unlock();
      this.time.delayedCall(100, () => this.scale.refresh());
      this.time.delayedCall(300, () => this.scale.refresh());
    });
  }

  private loadRecords(): void {
    try {
      const raw = localStorage.getItem("shot-puzzle-records");
      if (raw) {
        const saved = JSON.parse(raw) as Records[];
        saved.forEach((r, i) => {
          if (this.records[i]) this.records[i] = r;
        });
      }
    } catch {
      // 保存できない環境では記録なしで続ける
    }
  }

  private saveRecords(): void {
    try {
      localStorage.setItem("shot-puzzle-records", JSON.stringify(this.records));
    } catch {
      // 無視
    }
  }
}

function snap8(dx: number, dy: number): { x: number; y: number } {
  const step = Math.PI / 4;
  const a = Math.round(Math.atan2(dy, dx) / step) * step;
  return { x: Math.round(Math.cos(a)), y: Math.round(Math.sin(a)) };
}

import Phaser from "phaser";
import { weaponById, type WeaponId } from "../data/weapons";
import {
  BOSS_MAX_HP,
  BOSS_NAME,
  STATE_DURATION,
  STATE_LABEL,
  resolveHit,
  type ArmorState,
} from "../data/boss";
import { getProgress, saveProgress, type AttemptResult } from "../data/progress";
import { Controls } from "../input/Controls";
import { textStyle } from "./ui";

type DynImage = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

const GROUND_Y = 960;
const PLAYER_MAX_HP = 5;
const PLAYER_SPEED = 430;
const JUMP_VELOCITY = -1080;
const GRAVITY = 2400;

export interface BattleEndData {
  result: AttemptResult;
  loadout: WeaponId[];
  timeSec: number;
  bossHpLeft: number;
  newObservations: string[];
}

export class Battle extends Phaser.Scene {
  private loadout: WeaponId[] = [];
  private current = 0;
  private controls!: Controls;

  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private boss!: DynImage;
  private core!: Phaser.GameObjects.Image;
  private crack!: Phaser.GameObjects.Graphics;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private bossShots!: Phaser.Physics.Arcade.Group;
  private hud!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private toast!: Phaser.GameObjects.Text;

  private facing = 1;
  private lastShot = 0;
  private playerHp = PLAYER_MAX_HP;
  private invulnUntil = 0;
  private bossHp = BOSS_MAX_HP;
  private armor: ArmorState = "armor";
  private stateUntil = 0;
  private stunUntil = 0;
  private nextShotAt = 0;
  private nextSlamAt = 0;
  private startTime = 0;
  private ended = false;
  private newObs: string[] = [];
  private lastLabelAt = new Map<string, number>();

  constructor() {
    super("Battle");
  }

  init(data: { loadout: WeaponId[] }): void {
    this.loadout = data.loadout;
    this.current = 0;
    this.facing = 1;
    this.lastShot = 0;
    this.playerHp = PLAYER_MAX_HP;
    this.invulnUntil = 0;
    this.bossHp = BOSS_MAX_HP;
    this.armor = "armor";
    this.stateUntil = 0;
    this.stunUntil = 0;
    this.ended = false;
    this.newObs = [];
    this.lastLabelAt.clear();
    this.slotTexts = [];
  }

  create(): void {
    this.controls = new Controls(this);
    this.controls.primeHeld();
    this.startTime = this.time.now;
    this.nextShotAt = this.time.now + 1500;
    this.nextSlamAt = this.time.now + 4000;

    // 地形
    const solids: Phaser.GameObjects.Rectangle[] = [];
    const ground = this.add.rectangle(960, GROUND_Y + 60, 1920, 120, 0x2b2d42);
    solids.push(ground);
    for (const [x, y] of [
      [420, 720],
      [880, 560],
    ]) {
      solids.push(this.add.rectangle(x, y, 260, 24, 0x3d4066));
    }
    for (const s of solids) this.physics.add.existing(s, true);

    // プレイヤー
    this.player = this.physics.add.sprite(260, GROUND_Y - 40, "player");
    this.player.body.setGravityY(GRAVITY);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, solids);

    // ボス
    this.boss = this.physics.add.image(1620, GROUND_Y - 190, "boss");
    this.boss.body.setImmovable(true);
    this.crack = this.add.graphics();
    this.drawCrack();
    this.crack.setVisible(false);
    this.core = this.add.image(this.boss.x, this.boss.y + 20, "core").setVisible(false);
    this.tweens.add({ targets: this.core, scale: 1.15, duration: 300, yoyo: true, repeat: -1 });

    // 弾
    this.projectiles = this.physics.add.group();
    this.bossShots = this.physics.add.group();
    this.physics.add.overlap(this.boss, this.projectiles, (_b, p) => this.onHit(p as DynImage));
    this.physics.add.collider(ground, this.projectiles, (_g, p) => (p as DynImage).destroy());
    this.physics.add.overlap(this.player, this.bossShots, (_pl, s) => {
      const shot = s as DynImage;
      if (shot.texture.key === "bullet") shot.destroy();
      this.hurt();
    });
    this.physics.add.overlap(this.player, this.boss, () => this.hurt());

    // HUD
    this.hud = this.add.graphics().setDepth(10);
    this.add.text(960, 24, BOSS_NAME, textStyle(28, "#ffffff", { fontStyle: "bold" })).setOrigin(0.5, 0).setDepth(10);
    this.hpText = this.add.text(40, 30, "", textStyle(32, "#ff6b8a")).setDepth(10);
    this.stateText = this.add.text(960, 110, "", textStyle(26, "#e8e8f0")).setOrigin(0.5, 0).setDepth(10);
    this.loadout.forEach((id, i) => {
      const w = weaponById(id);
      this.slotTexts.push(
        this.add.text(40 + i * 170, 1000, `${i + 1} ${w.name}`, textStyle(28, "#ffffff", { padding: { x: 14, y: 8 } })).setDepth(10),
      );
    });
    this.add
      .text(1880, 1000, "移動 ←→/AD・スティック  ジャンプ Space/↑・A  攻撃 Z/J・X/RT\n武器切替 Q/E・LB/RB  撤退 Esc・Back", textStyle(18, "#a0a3b8", { align: "right", lineSpacing: 4 }))
      .setOrigin(1, 0)
      .setDepth(10);
    this.toast = this.add.text(1880, 160, "", textStyle(22, "#ffd84d", { align: "right" })).setOrigin(1, 0).setDepth(10);
  }

  update(time: number): void {
    if (this.ended) return;
    const c = this.controls;
    c.update();

    // 状態の時間切れ
    if (this.armor !== "armor" && time >= this.stateUntil) {
      if (this.armor === "core") this.floatLabel("装甲が再生した", "#ff5b5b");
      this.setArmor("armor");
    }

    // 移動
    const body = this.player.body;
    let vx = 0;
    if (c.isDown("left")) vx -= PLAYER_SPEED;
    if (c.isDown("right")) vx += PLAYER_SPEED;
    body.setVelocityX(vx);
    if (vx !== 0) this.facing = vx > 0 ? 1 : -1;
    this.player.setFlipX(this.facing < 0);
    if (c.justPressed("jump") && body.blocked.down) body.setVelocityY(JUMP_VELOCITY);
    if (!c.isDown("jump") && body.velocity.y < -300) body.setVelocityY(-300); // 小ジャンプ

    // 武器切替
    if (c.justPressed("prev")) this.current = (this.current + this.loadout.length - 1) % this.loadout.length;
    if (c.justPressed("next")) this.current = (this.current + 1) % this.loadout.length;
    if (c.justPressed("slot1")) this.current = 0;
    if (c.justPressed("slot2")) this.current = 1;
    if (c.justPressed("slot3")) this.current = 2;

    if (c.isDown("shoot")) this.shoot(time);
    if (c.justPressed("back")) {
      this.end("retreat");
      return;
    }

    this.updateBoss(time);
    this.cleanup();
    this.player.setAlpha(time < this.invulnUntil && Math.floor(time / 80) % 2 === 0 ? 0.3 : 1);
    this.drawHud(time);
  }

  private shoot(time: number): void {
    const w = weaponById(this.loadout[this.current]);
    if (time - this.lastShot < w.cooldown) return;
    this.lastShot = time;
    const p = this.projectiles.create(this.player.x + this.facing * 40, this.player.y - 10, `proj_${w.id}`) as DynImage;
    p.setData("weapon", w.id);
    p.setFlipX(this.facing < 0);
    p.body.setAllowGravity(true);
    p.body.setGravityY(w.gravity);
    p.body.setVelocity(this.facing * w.speed, w.gravity > 0 ? -620 : 0);
  }

  private onHit(p: DynImage): void {
    if (this.ended || !p.active) return;
    const id = p.getData("weapon") as WeaponId;
    p.destroy();
    const r = resolveHit(id, this.armor);
    this.bossHp = Phaser.Math.Clamp(this.bossHp - r.damage + r.heal, 0, BOSS_MAX_HP);
    if (r.next) this.setArmor(r.next);
    if (r.stunMs) this.stunUntil = this.time.now + r.stunMs;
    if (r.damage > 0 || r.heal > 0) this.boss.setTintFill(r.heal > 0 ? 0xffe14d : 0xffffff);
    this.time.delayedCall(60, () => this.refreshBossLook());
    this.floatLabel(r.label, r.color);
    this.observe(r.observation);
    if (this.bossHp <= 0) this.end("win");
  }

  private setArmor(s: ArmorState): void {
    this.armor = s;
    this.stateUntil = s === "armor" ? 0 : this.time.now + STATE_DURATION[s];
    if (s === "core") this.cameras.main.shake(250, 0.008);
    this.refreshBossLook();
  }

  private refreshBossLook(): void {
    if (!this.boss.active) return;
    this.boss.clearTint();
    this.boss.setAlpha(1);
    this.crack.setVisible(false);
    this.core.setVisible(false);
    if (this.armor === "heated") this.boss.setTint(0xff6a3d);
    if (this.armor === "cracked") {
      this.boss.setTint(0xa9c4dc);
      this.crack.setVisible(true);
    }
    if (this.armor === "core") {
      this.boss.setAlpha(0.35);
      this.core.setVisible(true);
    }
  }

  private drawCrack(): void {
    const g = this.crack;
    const ox = this.boss.x - 130;
    const oy = this.boss.y - 190;
    g.lineStyle(5, 0x1b1d24);
    const lines = [
      [60, 130, 110, 200, 90, 260, 140, 330],
      [200, 120, 160, 180, 190, 240],
      [110, 200, 170, 220],
    ];
    for (const l of lines) {
      g.beginPath();
      g.moveTo(ox + l[0], oy + l[1]);
      for (let i = 2; i < l.length; i += 2) g.lineTo(ox + l[i], oy + l[i + 1]);
      g.strokePath();
    }
  }

  private updateBoss(time: number): void {
    if (time < this.stunUntil) {
      this.nextShotAt = Math.max(this.nextShotAt, this.stunUntil + 300);
      this.nextSlamAt = Math.max(this.nextSlamAt, this.stunUntil + 800);
      return;
    }
    const angry = this.bossHp < BOSS_MAX_HP / 2;
    if (time >= this.nextShotAt) {
      this.nextShotAt = time + (angry ? 1100 : 1600);
      const ex = this.boss.x - 60;
      const ey = this.boss.y - 108;
      const base = Phaser.Math.Angle.Between(ex, ey, this.player.x, this.player.y);
      for (const d of [-0.18, 0, 0.18]) {
        const b = this.bossShots.create(ex, ey, "bullet") as DynImage;
        b.body.setCircle(12, 2, 2);
        this.physics.velocityFromRotation(base + d, 520, b.body.velocity);
      }
    }
    if (time >= this.nextSlamAt) {
      this.nextSlamAt = time + (angry ? 4200 : 5600);
      // 予備動作 → 衝撃波（ジャンプでかわす）
      const warn = this.add.text(this.boss.x, this.boss.y - 230, "！", textStyle(64, "#ffa64d", { fontStyle: "bold" })).setOrigin(0.5);
      this.time.delayedCall(550, () => {
        warn.destroy();
        if (this.ended) return;
        this.cameras.main.shake(150, 0.006);
        const s = this.bossShots.create(this.boss.x - 160, GROUND_Y - 30, "shock") as DynImage;
        s.body.setSize(60, 40).setOffset(10, 20);
        s.body.setVelocityX(-760);
      });
    }
  }

  private hurt(): void {
    const now = this.time.now;
    if (this.ended || now < this.invulnUntil) return;
    this.playerHp--;
    this.invulnUntil = now + 1000;
    this.player.body.setVelocity(this.player.x < this.boss.x ? -380 : 380, -520);
    this.cameras.main.shake(120, 0.005);
    this.vibrate();
    if (this.playerHp <= 0) this.end("lose");
  }

  private vibrate(): void {
    const raw = this.controls.pad?.pad as (Gamepad & { vibrationActuator?: { playEffect: (t: string, p: object) => Promise<unknown> } }) | undefined;
    raw?.vibrationActuator?.playEffect("dual-rumble", { duration: 180, strongMagnitude: 0.6, weakMagnitude: 0.4 }).catch(() => {});
  }

  private cleanup(): void {
    for (const g of [this.projectiles, this.bossShots]) {
      for (const obj of [...g.getChildren()]) {
        const o = obj as DynImage;
        if (o.x < -100 || o.x > 2020 || o.y < -400 || o.y > 1180) o.destroy();
      }
    }
  }

  private floatLabel(label: string, color: string): void {
    const now = this.time.now;
    if (now - (this.lastLabelAt.get(label) ?? 0) < 250) return;
    this.lastLabelAt.set(label, now);
    const t = this.add
      .text(this.boss.x + Phaser.Math.Between(-90, 90), this.boss.y - 200, label, textStyle(34, color, { fontStyle: "bold", stroke: "#000000", strokeThickness: 6 }))
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({ targets: t, y: t.y - 90, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  private observe(text: string): void {
    if (getProgress().observations.includes(text) || this.newObs.includes(text)) return;
    this.newObs.push(text);
    this.toast.setText(`［記録］${text}`).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 2200, duration: 600 });
  }

  private drawHud(time: number): void {
    const g = this.hud;
    g.clear();
    // ボスHP
    g.fillStyle(0x000000, 0.5).fillRect(560, 66, 800, 30);
    g.fillStyle(0xc0392b).fillRect(564, 70, 792 * (this.bossHp / BOSS_MAX_HP), 22);
    // 状態の残り時間
    const dur = STATE_DURATION[this.armor];
    let label = `装甲：${STATE_LABEL[this.armor]}`;
    if (dur > 0) {
      const rest = Math.max(0, this.stateUntil - time);
      g.fillStyle(0xffd84d).fillRect(760, 148, 400 * (rest / dur), 8);
      label += `（${(rest / 1000).toFixed(1)}秒）`;
    }
    if (time < this.stunUntil) label += "　目くらまし中";
    this.stateText.setText(label);
    this.hpText.setText("♥".repeat(this.playerHp) + "♡".repeat(PLAYER_MAX_HP - this.playerHp));
    this.slotTexts.forEach((t, i) => {
      t.setBackgroundColor(i === this.current ? "#c0392b" : "#262842");
      t.setColor(i === this.current ? "#ffffff" : "#a0a3b8");
    });
  }

  private end(result: AttemptResult): void {
    if (this.ended) return;
    this.ended = true;
    this.physics.pause();
    const p = getProgress();
    p.observations.push(...this.newObs);
    const timeSec = Math.round((this.time.now - this.startTime) / 1000);
    p.attempts.push({ loadout: this.loadout, result, timeSec, bossHpLeft: this.bossHp, newObservations: this.newObs.length });
    saveProgress();
    const banner = { win: "撃破！", lose: "やられた…", retreat: "撤退" }[result];
    this.add.text(960, 480, banner, textStyle(96, "#ffffff", { fontStyle: "bold", stroke: "#000000", strokeThickness: 10 })).setOrigin(0.5).setDepth(30);
    const data: BattleEndData = { result, loadout: this.loadout, timeSec, bossHpLeft: this.bossHp, newObservations: this.newObs };
    this.time.delayedCall(1100, () => this.scene.start("Result", data));
  }
}

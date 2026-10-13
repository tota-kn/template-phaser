import { Scene } from "phaser";
import { WEAPONS, LOADOUT_SIZE, weaponById, type WeaponId } from "../data/weapons";
import { BOSS_NAME, CLUES, TOTAL_OBSERVATIONS } from "../data/boss";
import { getProgress, resetProgress, RESULT_LABEL } from "../data/progress";
import { Controls } from "../input/Controls";
import { textStyle } from "./ui";

const CARD_W = 270;
const CARD_H = 112;
const GRID_X = 1300;
const GRID_Y = 210;
const START_INDEX = WEAPONS.length; // カーソルが開始ボタンにある状態

/** 準備画面: 証言・観察記録・挑戦履歴を見ながら、持ち込む武器を3つ選ぶ */
export class Prep extends Scene {
  private selected: WeaponId[] = [];
  private cursor = 0;
  private controls!: Controls;
  private cards: { bg: Phaser.GameObjects.Rectangle; badge: Phaser.GameObjects.Text }[] = [];
  private startBtn!: Phaser.GameObjects.Rectangle;
  private startLabel!: Phaser.GameObjects.Text;
  private loadoutText!: Phaser.GameObjects.Text;
  private padText!: Phaser.GameObjects.Text;
  private resetArmed = false;

  constructor() {
    super("Prep");
  }

  init(data: { loadout?: WeaponId[] }): void {
    // 前回の持ち込みを初期選択にして、少しだけ入れ替える試行をしやすくする
    this.selected = data.loadout ? [...data.loadout] : [];
    this.cursor = 0;
    this.cards = [];
    this.resetArmed = false;
  }

  create(): void {
    const p = getProgress();
    this.controls = new Controls(this);
    this.controls.primeHeld();

    this.add.text(60, 40, `ボス：${BOSS_NAME}`, textStyle(48, "#ffffff", { fontStyle: "bold" }));
    this.add.text(60, 108, `挑戦 ${p.attempts.length} 回 ／ 観察 ${p.observations.length} / ${TOTAL_OBSERVATIONS}`, textStyle(24, "#a0a3b8"));

    // 左列: 証言と挑戦履歴
    let y = 180;
    this.add.text(60, y, "証言", textStyle(30, "#ffd84d", { fontStyle: "bold" }));
    y += 50;
    for (const c of CLUES) {
      const t = this.add.text(60, y, `${c.who}「${c.text}」`, textStyle(22, "#e8e8f0", { wordWrap: { width: 560, useAdvancedWrap: true }, lineSpacing: 6 }));
      y += t.height + 18;
    }
    y += 20;
    this.add.text(60, y, "挑戦履歴", textStyle(30, "#ffd84d", { fontStyle: "bold" }));
    y += 50;
    const recent = p.attempts.slice(-8).reverse();
    if (recent.length === 0) {
      this.add.text(60, y, "まだ挑戦していません。", textStyle(20, "#7c7f95"));
    }
    recent.forEach((a, i) => {
      const n = p.attempts.length - i;
      const names = a.loadout.map((id) => weaponById(id).name).join("・");
      const extra = a.result === "win" ? `${a.timeSec}秒` : `残りHP ${a.bossHpLeft}`;
      this.add.text(60, y + i * 34, `#${n} ${names} → ${RESULT_LABEL[a.result]}（${extra}・新発見 ${a.newObservations}）`, textStyle(20, "#c8c9d6"));
    });

    // 中央列: 観察記録
    this.add.text(680, 180, "観察記録", textStyle(30, "#ffd84d", { fontStyle: "bold" }));
    if (p.observations.length === 0) {
      this.add.text(680, 230, "まだ記録はありません。\n戦闘で武器を当てると、反応がここに記録されます。", textStyle(20, "#7c7f95", { lineSpacing: 8 }));
    }
    p.observations.forEach((o, i) => {
      this.add.text(680, 230 + i * 34, `・${o}`, textStyle(20, "#e8e8f0"));
    });

    // 右列: 武器選択
    this.add.text(GRID_X, 120, `持ち込む武器を${LOADOUT_SIZE}つ選ぶ`, textStyle(30, "#ffd84d", { fontStyle: "bold" }));
    WEAPONS.forEach((w, i) => {
      const cx = GRID_X + (i % 2) * (CARD_W + 20) + CARD_W / 2;
      const cy = GRID_Y + Math.floor(i / 2) * (CARD_H + 16) + CARD_H / 2;
      const bg = this.add.rectangle(cx, cy, CARD_W, CARD_H, 0x262842).setStrokeStyle(3, 0x3d4066).setInteractive({ useHandCursor: true });
      this.add.circle(cx - CARD_W / 2 + 34, cy - 16, 14, w.color);
      this.add.text(cx - CARD_W / 2 + 60, cy - 34, w.name, textStyle(30, "#ffffff", { fontStyle: "bold" }));
      this.add.text(cx - CARD_W / 2 + 22, cy + 12, w.desc, textStyle(18, "#a0a3b8"));
      const badge = this.add.text(cx + CARD_W / 2 - 14, cy - CARD_H / 2 + 8, "", textStyle(26, "#1a1a2e", { backgroundColor: "#ffd84d", padding: { x: 8, y: 2 } })).setOrigin(1, 0);
      bg.on("pointerdown", () => {
        this.cursor = i;
        this.toggle(w.id);
      });
      this.cards.push({ bg, badge });
    });

    this.loadoutText = this.add.text(GRID_X, 740, "", textStyle(24, "#e8e8f0"));
    this.startBtn = this.add.rectangle(GRID_X + 280, 840, 560, 90, 0x3d4066).setInteractive({ useHandCursor: true });
    this.startLabel = this.add.text(GRID_X + 280, 840, "", textStyle(32, "#ffffff", { fontStyle: "bold" })).setOrigin(0.5);
    this.startBtn.on("pointerdown", () => this.start());

    this.add.text(GRID_X, 920, "キー: 1〜8で選択 / Enterで開始\nパッド: 十字・スティックで移動 / Aで選択 / Startで開始", textStyle(18, "#7c7f95", { lineSpacing: 6 }));
    this.padText = this.add.text(1860, 40, "", textStyle(18, "#7c7f95")).setOrigin(1, 0);

    const reset = this.add.text(60, 1020, "記録をリセット", textStyle(18, "#7c7f95")).setInteractive({ useHandCursor: true });
    reset.on("pointerdown", () => {
      if (!this.resetArmed) {
        this.resetArmed = true;
        reset.setText("もう一度クリックでリセット").setColor("#ff5b5b");
        return;
      }
      resetProgress();
      this.scene.restart({});
    });

    const digits = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT"];
    digits.forEach((d, i) => {
      this.input.keyboard?.on(`keydown-${d}`, () => {
        this.cursor = i;
        this.toggle(WEAPONS[i].id);
      });
    });

    this.refresh();
  }

  update(): void {
    const c = this.controls;
    c.update();
    if (c.justPressed("left") && this.cursor < START_INDEX && this.cursor % 2 === 1) this.cursor--;
    if (c.justPressed("right") && this.cursor < START_INDEX && this.cursor % 2 === 0) this.cursor++;
    if (c.justPressed("up")) {
      if (this.cursor === START_INDEX) this.cursor = WEAPONS.length - 2;
      else if (this.cursor >= 2) this.cursor -= 2;
    }
    if (c.justPressed("down")) {
      if (this.cursor < START_INDEX) this.cursor = this.cursor + 2 >= WEAPONS.length ? START_INDEX : this.cursor + 2;
    }
    const pad = c.pad;
    if (c.justPressed("toggle")) {
      if (this.cursor === START_INDEX) this.start();
      else this.toggle(WEAPONS[this.cursor].id);
    }
    if (c.justPressed("confirm")) this.start();
    this.padText.setText(pad ? `ゲームパッド接続中：${pad.id.slice(0, 40)}` : "ゲームパッド：未接続（ボタンを押すと認識）");
    this.refreshCursor();
  }

  private toggle(id: WeaponId): void {
    const i = this.selected.indexOf(id);
    if (i >= 0) this.selected.splice(i, 1);
    else if (this.selected.length < LOADOUT_SIZE) this.selected.push(id);
    this.refresh();
  }

  private refresh(): void {
    WEAPONS.forEach((w, i) => {
      const slot = this.selected.indexOf(w.id);
      this.cards[i].badge.setText(slot >= 0 ? `${slot + 1}` : "").setVisible(slot >= 0);
      this.cards[i].bg.setFillStyle(slot >= 0 ? 0x3a3560 : 0x262842);
    });
    const names = this.selected.map((id) => weaponById(id).name);
    while (names.length < LOADOUT_SIZE) names.push("―");
    this.loadoutText.setText(`持ち込み：${names.join(" ／ ")}`);
    const ready = this.selected.length === LOADOUT_SIZE;
    this.startBtn.setFillStyle(ready ? 0xc0392b : 0x3d4066);
    this.startLabel.setText(ready ? "戦闘開始" : `あと${LOADOUT_SIZE - this.selected.length}つ選んでください`);
    this.refreshCursor();
  }

  private refreshCursor(): void {
    this.cards.forEach((c, i) => {
      const slot = this.selected.includes(WEAPONS[i].id);
      c.bg.setStrokeStyle(i === this.cursor ? 6 : 3, i === this.cursor ? 0xffffff : slot ? 0xffd84d : 0x3d4066);
    });
    this.startBtn.setStrokeStyle(this.cursor === START_INDEX ? 6 : 0, 0xffffff);
  }

  private start(): void {
    if (this.selected.length !== LOADOUT_SIZE) return;
    this.scene.start("Battle", { loadout: [...this.selected] });
  }
}

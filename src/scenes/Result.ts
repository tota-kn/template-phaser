import { Scene } from "phaser";
import { weaponById } from "../data/weapons";
import { RESULT_LABEL } from "../data/progress";
import { Controls } from "../input/Controls";
import type { BattleEndData } from "./Battle";
import { textStyle } from "./ui";

export class Result extends Scene {
  private data_!: BattleEndData;
  private controls!: Controls;
  private readyAt = 0;

  constructor() {
    super("Result");
  }

  init(data: BattleEndData): void {
    this.data_ = data;
  }

  create(): void {
    const d = this.data_;
    this.controls = new Controls(this);
    this.controls.primeHeld();
    this.readyAt = this.time.now + 400; // 戦闘中の連打で読み飛ばさないように

    this.add.text(960, 140, RESULT_LABEL[d.result], textStyle(84, d.result === "win" ? "#ffd84d" : "#ffffff", { fontStyle: "bold" })).setOrigin(0.5);
    const names = d.loadout.map((id) => weaponById(id).name).join("・");
    const detail = d.result === "win" ? `撃破タイム ${d.timeSec}秒` : `ボス残りHP ${d.bossHpLeft}`;
    this.add.text(960, 250, `持ち込み：${names}　／　${detail}`, textStyle(30, "#c8c9d6")).setOrigin(0.5);

    this.add.text(480, 340, "新しく記録された観察", textStyle(32, "#ffd84d", { fontStyle: "bold" }));
    if (d.newObservations.length === 0) {
      this.add.text(480, 400, "なし（新しい情報は得られなかった）", textStyle(26, "#7c7f95"));
    }
    d.newObservations.forEach((o, i) => this.add.text(480, 400 + i * 44, `・${o}`, textStyle(26, "#e8e8f0")));

    const btn = this.add.rectangle(960, 960, 520, 90, 0x3d4066).setInteractive({ useHandCursor: true });
    this.add.text(960, 960, "準備画面へ（Enter / A）", textStyle(30, "#ffffff")).setOrigin(0.5);
    btn.on("pointerdown", () => this.back());
  }

  update(): void {
    this.controls.update();
    if (this.time.now < this.readyAt) return;
    if (this.controls.justPressed("confirm") || this.controls.justPressed("toggle") || this.controls.justPressed("jump")) this.back();
  }

  private back(): void {
    this.scene.start("Prep", { loadout: this.data_.loadout });
  }
}

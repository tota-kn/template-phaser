import { Scene } from "phaser";

export class GameOver extends Scene {
  private score = 0;

  constructor() {
    super("GameOver");
  }

  init(data: { score: number }): void {
    this.score = data.score ?? 0;
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.cameras.main.setBackgroundColor("#1a1a2e");

    this.add
      .text(w / 2, h / 2 - 120, "GAME OVER", {
        fontFamily: "Arial Black, Arial",
        fontSize: "96px",
        color: "#ff4444",
        stroke: "#000000",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h / 2, `スコア: ${this.score}`, {
        fontFamily: "Arial",
        fontSize: "48px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const restartText = this.add
      .text(w / 2, h / 2 + 120, "タップしてリトライ", {
        fontFamily: "Arial",
        fontSize: "36px",
        color: "#ffdd44",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: restartText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.input.once("pointerdown", () => {
      this.scene.start("Game");
    });
  }
}

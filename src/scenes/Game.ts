import { Scene } from "phaser";

export class Game extends Scene {
  constructor() {
    super("Game");
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add
      .text(width / 2, height / 2, "Phaser 3 + Vite + TypeScript", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 50, "Game development ready!", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5);
  }
}

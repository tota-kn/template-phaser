import { Scene } from "phaser";

export class Boot extends Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    // Boot時に必要な最小限のアセットを読み込む
  }

  create(): void {
    this.scene.start("Preloader");
  }
}

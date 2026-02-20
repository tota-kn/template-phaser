import { Scene } from "phaser";

export class Game extends Scene {
  private emitter!: Phaser.GameObjects.Particles.ParticleEmitter;

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
        color: "#1a1a2e",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 50, "タップ or クリックしてみてください", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#666666",
      })
      .setOrigin(0.5);

    // フルスクリーンボタン
    const fsBtn = this.add
      .text(width - 30, 30, "⛶", {
        fontFamily: "Arial",
        fontSize: "72px",
        color: "#999999",
        backgroundColor: "rgba(0,0,0,0.15)",
        padding: { x: 16, y: 8 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        if (this.scale.isFullscreen) {
          this.scale.stopFullscreen();
        } else {
          this.scale.startFullscreen();
        }
      });

    this.scale.on("enterfullscreen", () => {
      fsBtn.setText("✕");
      (screen.orientation as any)?.lock?.("landscape")?.catch?.(() => {});
      // モバイルブラウザはフルスクリーン遷移アニメーション中に
      // サイズが確定しないため、遅延して複数回リフレッシュする
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

    // パーティクル用テクスチャを生成
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);
    gfx.fillStyle(0xffffff);
    gfx.fillCircle(8, 8, 8);
    gfx.generateTexture("particle", 16, 16);
    gfx.destroy();

    // パーティクルエミッター（初期状態は非発射）
    this.emitter = this.add.particles(0, 0, "particle", {
      speed: { min: 50, max: 200 },
      scale: { start: 0.6, end: 0 },
      lifespan: { min: 400, max: 800 },
      blendMode: "NORMAL",
      tint: [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xc084fc],
      emitting: false,
    });

    // タップ/クリック時にパーティクルを発射
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.emitter.emitParticleAt(pointer.x, pointer.y, 20);
    });
  }
}

import { Scene } from "phaser";

export class Boot extends Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    // すべてのアセットをプロシージャル生成する
  }

  create(): void {
    this.generateTextures();
    this.scene.start("Preloader");
  }

  private generateTextures(): void {
    this.createPlayerTexture();
    this.createGroundTexture();
    this.createPlatformTexture();
    this.createCoinTexture();
    this.createEnemyTexture();
    this.createCloudTexture();
    this.createMountainTexture();
    this.createBushTexture();
    this.createFlagTexture();
    this.createButtonTextures();
  }

  private createPlayerTexture(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);
    const w = 64;
    const h = 80;

    // Body (red overalls)
    gfx.fillStyle(0xe74c3c);
    gfx.fillRoundedRect(8, 28, 48, 40, 6);

    // Head (skin tone)
    gfx.fillStyle(0xf5cba7);
    gfx.fillRoundedRect(12, 2, 40, 34, 8);

    // Hat (red cap)
    gfx.fillStyle(0xc0392b);
    gfx.fillRoundedRect(6, 0, 52, 16, 4);
    gfx.fillRect(6, 10, 20, 10);

    // Eyes
    gfx.fillStyle(0x2c3e50);
    gfx.fillCircle(28, 20, 4);
    gfx.fillCircle(42, 20, 4);

    // Eye whites
    gfx.fillStyle(0xffffff);
    gfx.fillCircle(29, 19, 2);
    gfx.fillCircle(43, 19, 2);

    // Mustache
    gfx.fillStyle(0x6b4226);
    gfx.fillRoundedRect(22, 26, 24, 6, 3);

    // Belt
    gfx.fillStyle(0x8b6914);
    gfx.fillRect(12, 48, 40, 6);
    gfx.fillStyle(0xf1c40f);
    gfx.fillCircle(32, 51, 4);

    // Legs (blue jeans)
    gfx.fillStyle(0x2980b9);
    gfx.fillRoundedRect(12, 62, 18, 18, 3);
    gfx.fillRoundedRect(34, 62, 18, 18, 3);

    // Shoes (brown)
    gfx.fillStyle(0x8b4513);
    gfx.fillRoundedRect(8, 72, 22, 8, 3);
    gfx.fillRoundedRect(34, 72, 22, 8, 3);

    gfx.generateTexture("player", w, h);
    gfx.destroy();
  }

  private createGroundTexture(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Grass top
    gfx.fillStyle(0x4caf50);
    gfx.fillRect(0, 0, 128, 16);

    // Dark grass detail
    gfx.fillStyle(0x388e3c);
    for (let i = 0; i < 128; i += 12) {
      gfx.fillTriangle(i, 0, i + 6, -8, i + 12, 0);
    }

    // Dirt
    gfx.fillStyle(0x8d6e63);
    gfx.fillRect(0, 16, 128, 112);

    // Dirt texture spots
    gfx.fillStyle(0x795548);
    for (let i = 0; i < 8; i++) {
      const dx = (i * 17 + 5) % 120;
      const dy = 24 + (i * 23) % 80;
      gfx.fillCircle(dx, dy, 4 + (i % 3) * 2);
    }

    gfx.generateTexture("ground", 128, 128);
    gfx.destroy();
  }

  private createPlatformTexture(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Platform body (brick-like)
    gfx.fillStyle(0x8d6e63);
    gfx.fillRoundedRect(0, 8, 192, 32, 4);

    // Grass top
    gfx.fillStyle(0x4caf50);
    gfx.fillRoundedRect(0, 0, 192, 16, { tl: 6, tr: 6, bl: 0, br: 0 });

    // Brick lines
    gfx.lineStyle(1, 0x795548);
    gfx.strokeRect(2, 16, 60, 12);
    gfx.strokeRect(66, 16, 60, 12);
    gfx.strokeRect(130, 16, 60, 12);
    gfx.strokeRect(34, 28, 60, 12);
    gfx.strokeRect(98, 28, 60, 12);

    gfx.generateTexture("platform", 192, 40);
    gfx.destroy();
  }

  private createCoinTexture(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Outer glow
    gfx.fillStyle(0xffd700, 0.3);
    gfx.fillCircle(20, 20, 20);

    // Coin body
    gfx.fillStyle(0xffc107);
    gfx.fillCircle(20, 20, 16);

    // Inner highlight
    gfx.fillStyle(0xffeb3b);
    gfx.fillCircle(16, 16, 10);

    // Dollar sign
    gfx.fillStyle(0xf57f17);
    gfx.fillRect(18, 10, 4, 20);
    gfx.fillRoundedRect(13, 12, 14, 5, 2);
    gfx.fillRoundedRect(13, 23, 14, 5, 2);

    gfx.generateTexture("coin", 40, 40);
    gfx.destroy();
  }

  private createEnemyTexture(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);
    const w = 56;
    const h = 48;

    // Body (mushroom-like enemy)
    gfx.fillStyle(0x8b4513);
    gfx.fillRoundedRect(4, 24, 48, 24, 6);

    // Cap (red mushroom top)
    gfx.fillStyle(0xe74c3c);
    gfx.fillEllipse(28, 20, 56, 32);

    // White spots on cap
    gfx.fillStyle(0xffffff);
    gfx.fillCircle(16, 14, 6);
    gfx.fillCircle(38, 12, 5);
    gfx.fillCircle(28, 8, 4);

    // Angry eyes
    gfx.fillStyle(0xffffff);
    gfx.fillEllipse(18, 28, 12, 10);
    gfx.fillEllipse(38, 28, 12, 10);
    gfx.fillStyle(0x000000);
    gfx.fillCircle(20, 29, 4);
    gfx.fillCircle(36, 29, 4);

    // Angry eyebrows
    gfx.lineStyle(3, 0x000000);
    gfx.lineBetween(10, 22, 20, 25);
    gfx.lineBetween(46, 22, 36, 25);

    // Feet
    gfx.fillStyle(0x5d3a1a);
    gfx.fillEllipse(14, 46, 16, 8);
    gfx.fillEllipse(42, 46, 16, 8);

    gfx.generateTexture("enemy", w, h);
    gfx.destroy();
  }

  private createCloudTexture(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillEllipse(80, 50, 100, 50);
    gfx.fillEllipse(50, 50, 70, 40);
    gfx.fillEllipse(110, 50, 70, 40);
    gfx.fillEllipse(70, 35, 60, 40);
    gfx.fillEllipse(95, 35, 60, 40);

    gfx.generateTexture("cloud", 160, 80);
    gfx.destroy();
  }

  private createMountainTexture(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Mountain body
    gfx.fillStyle(0x66bb6a);
    gfx.fillTriangle(0, 300, 200, 0, 400, 300);

    // Snow cap
    gfx.fillStyle(0xffffff);
    gfx.fillTriangle(170, 60, 200, 0, 230, 60);

    // Darker side
    gfx.fillStyle(0x4caf50, 0.5);
    gfx.fillTriangle(200, 0, 400, 300, 200, 300);

    gfx.generateTexture("mountain", 400, 300);
    gfx.destroy();
  }

  private createBushTexture(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    gfx.fillStyle(0x388e3c);
    gfx.fillEllipse(50, 40, 60, 40);
    gfx.fillEllipse(30, 45, 50, 35);
    gfx.fillEllipse(70, 45, 50, 35);

    gfx.fillStyle(0x4caf50);
    gfx.fillEllipse(50, 35, 50, 30);
    gfx.fillEllipse(30, 40, 40, 25);

    gfx.generateTexture("bush", 100, 60);
    gfx.destroy();
  }

  private createFlagTexture(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 }, false);

    // Pole
    gfx.fillStyle(0x888888);
    gfx.fillRect(14, 0, 6, 200);

    // Pole top
    gfx.fillStyle(0xffeb3b);
    gfx.fillCircle(17, 6, 8);

    // Flag
    gfx.fillStyle(0xe74c3c);
    gfx.fillTriangle(20, 16, 80, 40, 20, 64);

    // Star on flag
    gfx.fillStyle(0xffeb3b);
    gfx.fillCircle(40, 40, 8);

    gfx.generateTexture("flag", 90, 200);
    gfx.destroy();
  }

  private createButtonTextures(): void {
    // Left arrow button
    let gfx = this.make.graphics({ x: 0, y: 0 }, false);
    gfx.fillStyle(0x000000, 0.4);
    gfx.fillCircle(60, 60, 60);
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillTriangle(30, 60, 70, 35, 70, 85);
    gfx.generateTexture("btn-left", 120, 120);
    gfx.destroy();

    // Right arrow button
    gfx = this.make.graphics({ x: 0, y: 0 }, false);
    gfx.fillStyle(0x000000, 0.4);
    gfx.fillCircle(60, 60, 60);
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillTriangle(90, 60, 50, 35, 50, 85);
    gfx.generateTexture("btn-right", 120, 120);
    gfx.destroy();

    // Jump button
    gfx = this.make.graphics({ x: 0, y: 0 }, false);
    gfx.fillStyle(0xe74c3c, 0.5);
    gfx.fillCircle(70, 70, 70);
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillTriangle(70, 25, 40, 75, 100, 75);
    gfx.generateTexture("btn-jump", 140, 140);
    gfx.destroy();
  }
}

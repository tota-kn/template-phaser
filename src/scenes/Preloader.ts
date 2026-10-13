import { Scene } from "phaser";
import { WEAPONS } from "../data/weapons";

/** 画像アセットは使わず、試作用のテクスチャをすべてここで生成する */
export class Preloader extends Scene {
  constructor() {
    super("Preloader");
  }

  create(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // プレイヤー
    g.clear();
    g.fillStyle(0x4d96ff);
    g.fillRoundedRect(0, 0, 50, 80, 10);
    g.fillStyle(0xffffff);
    g.fillRect(30, 18, 12, 10);
    g.generateTexture("player", 50, 80);

    // ボス（装甲ゴーレム）
    g.clear();
    g.fillStyle(0x5a6170);
    g.fillRoundedRect(0, 0, 260, 380, 28);
    g.fillStyle(0x474d5a);
    for (let y = 40; y < 380; y += 70) g.fillRect(14, y, 232, 10);
    g.fillStyle(0x30343d);
    g.fillRect(30, 60, 200, 46);
    g.fillStyle(0xff4d4d);
    g.fillRect(50, 74, 160, 16);
    g.lineStyle(6, 0x3a3f4a);
    g.strokeRoundedRect(3, 3, 254, 374, 26);
    g.generateTexture("boss", 260, 380);

    // 核
    g.clear();
    g.fillStyle(0xff3b6b);
    g.fillCircle(60, 60, 60);
    g.fillStyle(0xffc2d4);
    g.fillCircle(45, 45, 18);
    g.generateTexture("core", 120, 120);

    // ボスの弾と衝撃波
    g.clear();
    g.fillStyle(0xff4d4d);
    g.fillCircle(14, 14, 14);
    g.fillStyle(0xffd0d0);
    g.fillCircle(14, 14, 6);
    g.generateTexture("bullet", 28, 28);

    g.clear();
    g.fillStyle(0xffa64d);
    g.fillTriangle(0, 60, 40, 0, 80, 60);
    g.generateTexture("shock", 80, 60);

    // 武器ごとの弾
    for (const w of WEAPONS) {
      g.clear();
      const r = w.radius;
      if (w.id === "arrow") {
        g.fillStyle(w.color);
        g.fillRect(0, r - 3, r * 5, 6);
        g.fillTriangle(r * 5, r - 9, r * 5 + 18, r, r * 5, r + 9);
        g.generateTexture(`proj_${w.id}`, r * 5 + 18, r * 2);
      } else if (w.id === "sonic") {
        g.lineStyle(6, w.color);
        g.strokeCircle(r + 4, r + 4, r);
        g.generateTexture(`proj_${w.id}`, r * 2 + 8, r * 2 + 8);
      } else {
        g.fillStyle(w.color);
        g.fillCircle(r, r, r);
        g.generateTexture(`proj_${w.id}`, r * 2, r * 2);
      }
    }

    g.destroy();
    this.scene.start("Prep");
  }
}
